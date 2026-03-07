import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import {
  AuthErrorResponseDto,
  AuthErrorCode,
  AuthUserDto,
  AuthTokenPairDto,
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  UserRole,
} from './dto/auth-response.dto';
import { PrismaService } from '../prisma/prisma.service';

enum JwtTokenType {
  Access = 'access',
  Refresh = 'refresh',
}

interface AuthJwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  type: JwtTokenType;
  jti: string;
  iat?: number;
  exp?: number;
}

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  roles: AuthUserDto['roles'];
}

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
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>(
      'AUTH_ACCESS_TOKEN_SECRET',
    );
    this.refreshSecret = configService.getOrThrow<string>(
      'AUTH_REFRESH_TOKEN_SECRET',
    );
    this.accessTtlSeconds = configService.getOrThrow<number>(
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
    );
    this.refreshTtlSeconds = configService.getOrThrow<number>(
      'AUTH_REFRESH_TOKEN_TTL_SECONDS',
    );
  }

  async login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    if (!payload?.email || !payload?.password) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'email and password are required',
      } satisfies AuthErrorResponseDto);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase().trim() },
    });
    const isPasswordValid =
      !!user && bcrypt.compareSync(payload.password, user.passwordHash);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidCredentials,
        message: 'Invalid credentials',
      } satisfies AuthErrorResponseDto);
    }

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

  async me(accessToken: string): Promise<MeResponseDto> {
    const parsedToken = this.verifyToken(accessToken, JwtTokenType.Access);
    const user = await this.getUserById(parsedToken.sub);

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
