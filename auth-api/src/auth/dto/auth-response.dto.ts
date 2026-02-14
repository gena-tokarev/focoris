export type UserRole = 'admin' | 'member';

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

export type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_REFRESH_TOKEN'
  | 'AUTH_INVALID_ACCESS_TOKEN'
  | 'AUTH_MISSING_BEARER_TOKEN'
  | 'AUTH_NOT_IMPLEMENTED';

export interface AuthErrorResponseDto {
  statusCode: number;
  code: AuthErrorCode;
  message: string;
}
