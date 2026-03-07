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
  InvalidRefreshToken = 'AUTH_INVALID_REFRESH_TOKEN',
  InvalidAccessToken = 'AUTH_INVALID_ACCESS_TOKEN',
  MissingBearerToken = 'AUTH_MISSING_BEARER_TOKEN',
  NotImplemented = 'AUTH_NOT_IMPLEMENTED',
}

export interface AuthErrorResponseDto {
  statusCode: number;
  code: AuthErrorCode;
  message: string;
}
