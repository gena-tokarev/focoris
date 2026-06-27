import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuthJwtPayload, JwtTokenType } from '@focoris/auth-nest';
import type { AppEnv } from '../../config/config.validation';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
  AuthTokenPairDto,
  LogoutResponseDto,
} from '../../core/dto/auth-response.dto';
import { LogoutRequestDto } from '../../core/dto/logout-request.dto';
import { RefreshRequestDto } from '../../core/dto/refresh-request.dto';
import { IdentityService } from '../identity/identity.service';
import type { IdentityUser } from '../identity/identity.types';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedSession } from '../session/session.types';

interface RefreshSession {
  userId: string;
  tokenId: string;
  tokenHash: string;
  expiresAt: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly identityService: IdentityService,
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

  async login(user: IdentityUser): Promise<AuthenticatedSession> {
    return this.createSession(user);
  }

  async createSession(user: IdentityUser): Promise<AuthenticatedSession> {
    return {
      user: this.identityService.toAuthUser(user),
      tokens: await this.issueTokenPair(user),
    };
  }

  async getUserForAccessToken(token?: string): Promise<IdentityUser | null> {
    if (!token) {
      return null;
    }

    const parsedToken = this.verifyToken(token, JwtTokenType.Access, false);

    if (!parsedToken) {
      return null;
    }

    return this.identityService.findUserById(parsedToken.sub);
  }

  async issueTokenPair(
    user: IdentityUser,
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

  async refresh(payload: RefreshRequestDto): Promise<AuthTokenPairDto> {
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
    const user = await this.identityService.findUserById(parsedToken.sub);
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

    return rotatedTokens;
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

  verifyToken(token: string, expectedType: JwtTokenType): AuthJwtPayload;
  verifyToken(
    token: string,
    expectedType: JwtTokenType,
    throwOnError: true,
  ): AuthJwtPayload;
  verifyToken(
    token: string,
    expectedType: JwtTokenType,
    throwOnError: false,
  ): AuthJwtPayload | null;
  verifyToken(
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
