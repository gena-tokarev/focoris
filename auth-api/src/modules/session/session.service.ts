import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/config.validation';
import type {
  AuthSessionMode,
  AuthTokenPairDto,
  LoginResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from '../../core/dto/auth-response.dto';
import type {
  AuthenticatedSession,
  AuthRequestLike,
  AuthResponseLike,
  AuthCookieOptionsLike,
} from './session.types';

const SESSION_MODE_HEADER = 'x-auth-session-mode';

@Injectable()
export class AuthSessionService {
  private readonly defaultWebSessionMode: AuthSessionMode;
  private readonly accessTokenCookieName: string;
  private readonly refreshTokenCookieName: string;
  private readonly cookieDomain?: string;
  private readonly cookieSecure: boolean;
  private readonly cookieSameSite: 'lax' | 'strict' | 'none';
  private readonly refreshTokenTtlMilliseconds: number;

  constructor(configService: ConfigService<AppEnv, true>) {
    this.defaultWebSessionMode = configService.getOrThrow(
      'AUTH_WEB_SESSION_MODE',
    );
    this.accessTokenCookieName = configService.getOrThrow(
      'AUTH_COOKIE_ACCESS_TOKEN_NAME',
    );
    this.refreshTokenCookieName = configService.getOrThrow(
      'AUTH_COOKIE_REFRESH_TOKEN_NAME',
    );
    this.cookieDomain = configService.get('AUTH_COOKIE_DOMAIN');
    this.cookieSecure = configService.getOrThrow('AUTH_COOKIE_SECURE');
    this.cookieSameSite = configService.getOrThrow('AUTH_COOKIE_SAME_SITE');
    this.refreshTokenTtlMilliseconds =
      configService.getOrThrow('AUTH_REFRESH_TOKEN_TTL_SECONDS') * 1000;
  }

  resolveSessionMode(request: AuthRequestLike): AuthSessionMode {
    const headerValue = request.headers[SESSION_MODE_HEADER];
    const normalizedValue = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (normalizedValue === 'token' || normalizedValue === 'cookie') {
      return normalizedValue;
    }

    return this.defaultWebSessionMode;
  }

  createLoginResponse(
    sessionMode: AuthSessionMode,
    session: AuthenticatedSession,
  ): LoginResponseDto {
    if (sessionMode === 'cookie') {
      return {
        user: session.user,
        sessionMode,
      };
    }

    return {
      user: session.user,
      sessionMode,
      tokens: session.tokens,
    };
  }

  createRegisterResponse(
    sessionMode: AuthSessionMode,
    session: AuthenticatedSession,
  ): RegisterResponseDto {
    if (sessionMode === 'cookie') {
      return {
        user: session.user,
        sessionMode,
      };
    }

    return {
      user: session.user,
      sessionMode,
      tokens: session.tokens,
    };
  }

  createRefreshResponse(
    sessionMode: AuthSessionMode,
    tokens: AuthTokenPairDto,
  ): RefreshResponseDto {
    if (sessionMode === 'cookie') {
      return {
        sessionMode,
      };
    }

    return {
      sessionMode,
      tokens,
    };
  }

  setAuthCookies(response: AuthResponseLike, tokens: AuthTokenPairDto): void {
    response.cookie(
      this.accessTokenCookieName,
      tokens.accessToken,
      this.buildCookieOptions(tokens.expiresInSeconds * 1000),
    );
    response.cookie(
      this.refreshTokenCookieName,
      tokens.refreshToken,
      this.buildCookieOptions(this.refreshTokenTtlMilliseconds),
    );
  }

  clearAuthCookies(response: AuthResponseLike): void {
    response.clearCookie(this.accessTokenCookieName, this.buildCookieOptions());
    response.clearCookie(
      this.refreshTokenCookieName,
      this.buildCookieOptions(),
    );
  }

  getRefreshTokenFromRequest(
    request: AuthRequestLike,
    payloadRefreshToken?: string,
  ): string | undefined {
    return (
      payloadRefreshToken ??
      this.getCookieValue(request, this.refreshTokenCookieName)
    );
  }

  getAccessTokenFromRequest(request: AuthRequestLike): string | undefined {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    return this.getCookieValue(request, this.accessTokenCookieName);
  }

  private buildCookieOptions(maxAge?: number): AuthCookieOptionsLike {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: '/',
      domain: this.cookieDomain,
      maxAge,
    };
  }

  private getCookieValue(
    request: AuthRequestLike,
    cookieName: string,
  ): string | undefined {
    const rawCookieHeader = request.headers.cookie;

    if (!rawCookieHeader) {
      return undefined;
    }

    for (const cookie of rawCookieHeader.split(';')) {
      const [rawName, ...valueParts] = cookie.split('=');

      if (rawName?.trim() !== cookieName) {
        continue;
      }

      return decodeURIComponent(valueParts.join('=').trim());
    }

    return undefined;
  }
}
