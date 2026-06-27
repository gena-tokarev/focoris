import { UserRole } from '@prisma/client';
export { UserRole };

export interface AuthUserDto {
  id: string;
  email: string;
  roles: UserRole[];
}

export interface AuthTokenPairDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
}

export interface LoginResponseDto {
  user: AuthUserDto;
  tokens: AuthTokenPairDto;
}

export interface RegisterResponseDto {
  user: AuthUserDto;
  tokens: AuthTokenPairDto;
}

export interface RequestEmailLoginResponseDto {
  success: true;
  expiresInSeconds: number;
  dev?: {
    code: string;
    magicLinkToken: string;
    magicLinkUrl: string;
  };
}

export interface RefreshResponseDto {
  tokens: AuthTokenPairDto;
}

export interface LogoutResponseDto {
  success: true;
}

export interface MeResponseDto {
  user: AuthUserDto;
}

export enum AuthErrorCode {
  InvalidCredentials = 'AUTH_INVALID_CREDENTIALS',
  EmailAlreadyTaken = 'AUTH_EMAIL_ALREADY_TAKEN',
  InvalidEmailLoginChallenge = 'AUTH_INVALID_EMAIL_LOGIN_CHALLENGE',
  InvalidRefreshToken = 'AUTH_INVALID_REFRESH_TOKEN',
  InvalidAccessToken = 'AUTH_INVALID_ACCESS_TOKEN',
  InvalidExternalAuthRequest = 'AUTH_INVALID_EXTERNAL_AUTH_REQUEST',
  InvalidExternalAuthCode = 'AUTH_INVALID_EXTERNAL_AUTH_CODE',
  MissingBearerToken = 'AUTH_MISSING_BEARER_TOKEN',
  InvalidPasskeyRequest = 'AUTH_INVALID_PASSKEY_REQUEST',
  PasskeyRegistrationNotAllowed = 'AUTH_PASSKEY_REGISTRATION_NOT_ALLOWED',
  NotImplemented = 'AUTH_NOT_IMPLEMENTED',
}

export interface AuthErrorResponseDto {
  statusCode: number;
  code: AuthErrorCode;
  message: string;
}
