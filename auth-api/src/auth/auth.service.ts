import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import {
  AuthErrorResponseDto,
  AuthErrorCode,
  AuthUserDto,
  AuthTokenPairDto,
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthJwtPayload, JwtTokenType } from '@focoris/auth-nest';
import type { AppEnv } from '../config/config.validation';

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  roles: AuthUserDto['roles'];
}

export type AuthenticatedUser = UserRecord;

interface RefreshSession {
  userId: string;
  tokenId: string;
  tokenHash: string;
  expiresAt: number;
  revokedAt?: number;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService<AppEnv, true>,
  ) {
    this.accessSecret = configService.getOrThrow('AUTH_ACCESS_TOKEN_SECRET');
    this.refreshSecret = configService.getOrThrow('AUTH_REFRESH_TOKEN_SECRET');
    this.accessTtlSeconds = configService.getOrThrow(
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
    );
    this.refreshTtlSeconds = configService.getOrThrow(
      'AUTH_REFRESH_TOKEN_TTL_SECONDS',
    );
  }

  async validateUserCredentials(
    email?: string,
    password?: string,
  ): Promise<AuthenticatedUser | null> {
    if (!email || !password) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'email and password are required',
      } satisfies AuthErrorResponseDto);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    const isPasswordValid =
      !!user && bcrypt.compareSync(password, user.passwordHash);

    if (!user || !isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: AuthenticatedUser): Promise<LoginResponseDto> {
    const tokens = await this.issueTokenPair(user);
    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async register(payload: RegisterRequestDto): Promise<RegisterResponseDto> {
    const email = payload?.email?.toLowerCase().trim();
    const password = payload?.password;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        code: AuthErrorCode.EmailAlreadyTaken,
        message: 'Email is already taken',
      } satisfies AuthErrorResponseDto);
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        roles: [UserRole.member],
      },
    });

    const tokens = await this.issueTokenPair(user);
    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async refresh(payload: RefreshRequestDto): Promise<RefreshResponseDto> {
    if (!payload?.refreshToken) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidRefreshToken,
        message: 'refreshToken is required',
      } satisfies AuthErrorResponseDto);
    }

    const parsedToken = this.verifyToken(
      payload.refreshToken,
      JwtTokenType.Refresh,
    );
    const user = await this.getUserById(parsedToken.sub);
    const incomingTokenHash = this.hashToken(payload.refreshToken);

    const rotatedTokens = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const revoked = await tx.refreshSession.updateMany({
          where: {
            tokenId: parsedToken.jti,
            userId: parsedToken.sub,
            tokenHash: incomingTokenHash,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { revokedAt: new Date() },
        });

        if (revoked.count !== 1) {
          throw new UnauthorizedException({
            statusCode: 401,
            code: AuthErrorCode.InvalidRefreshToken,
            message: 'Invalid refresh token',
          } satisfies AuthErrorResponseDto);
        }

        return this.issueTokenPair(user, tx);
      },
    );

    return {
      tokens: rotatedTokens,
    };
  }

  async logout(payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    if (payload?.refreshToken) {
      const parsedToken = this.verifyToken(
        payload.refreshToken,
        JwtTokenType.Refresh,
        false,
      );
      if (parsedToken) {
        const tokenHash = this.hashToken(payload.refreshToken);
        await this.prisma.refreshSession.updateMany({
          where: {
            tokenId: parsedToken.jti,
            tokenHash,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
    }

    return { success: true };
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.getUserById(userId);

    return {
      user: this.toAuthUser(user),
    };
  }

  private async issueTokenPair(
    user: UserRecord,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<AuthTokenPairDto> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessPayload: AuthJwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      type: JwtTokenType.Access,
      jti: accessTokenId,
    };

    const refreshPayload: AuthJwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      type: JwtTokenType.Refresh,
      jti: refreshTokenId,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtlSeconds,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtlSeconds,
    });

    const refreshSession: RefreshSession = {
      userId: user.id,
      tokenId: refreshTokenId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: Date.now() + this.refreshTtlSeconds * 1000,
    };
    await tx.refreshSession.create({
      data: {
        userId: refreshSession.userId,
        tokenId: refreshSession.tokenId,
        tokenHash: refreshSession.tokenHash,
        expiresAt: new Date(refreshSession.expiresAt),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresInSeconds: this.accessTtlSeconds,
    };
  }

  private verifyToken(
    token: string,
    expectedType: JwtTokenType,
  ): AuthJwtPayload;
  private verifyToken(
    token: string,
    expectedType: JwtTokenType,
    throwOnError: true,
  ): AuthJwtPayload;
  private verifyToken(
    token: string,
    expectedType: JwtTokenType,
    throwOnError: false,
  ): AuthJwtPayload | null;
  private verifyToken(
    token: string,
    expectedType: JwtTokenType,
    throwOnError = true,
  ): AuthJwtPayload | null {
    try {
      const payload = this.jwtService.verify<AuthJwtPayload>(token, {
        secret:
          expectedType === JwtTokenType.Access
            ? this.accessSecret
            : this.refreshSecret,
      });

      if (payload.type !== expectedType) {
        throw new UnauthorizedException();
      }

      return payload;
    } catch {
      if (!throwOnError) {
        return null;
      }

      throw new UnauthorizedException({
        statusCode: 401,
        code:
          expectedType === JwtTokenType.Access
            ? AuthErrorCode.InvalidAccessToken
            : AuthErrorCode.InvalidRefreshToken,
        message:
          expectedType === JwtTokenType.Access
            ? 'Invalid access token'
            : 'Invalid refresh token',
      } satisfies AuthErrorResponseDto);
    }
  }

  private async getUserById(userId: string): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidAccessToken,
        message: 'Invalid access token',
      } satisfies AuthErrorResponseDto);
    }
    return user;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthUser(user: UserRecord): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }
}
