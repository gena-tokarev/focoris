import type { AuthTokenPairDto, AuthUserDto } from '../../core/dto/auth-response.dto';

export interface AuthenticatedSession {
  user: AuthUserDto;
  tokens: AuthTokenPairDto;
}

export interface AuthRequestLike {
  headers: {
    authorization?: string;
    cookie?: string;
    'x-auth-session-mode'?: string | string[];
  };
}

export interface AuthCookieOptionsLike {
  domain?: string;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export interface AuthResponseLike {
  clearCookie(name: string, options?: AuthCookieOptionsLike): void;
  cookie(name: string, value: string, options?: AuthCookieOptionsLike): void;
}
