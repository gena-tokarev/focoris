export type UserRole = 'admin' | 'member';

export enum JwtTokenType {
  Access = 'access',
  Refresh = 'refresh',
}

export interface AuthJwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  type: JwtTokenType;
  jti: string;
  iat?: number;
  exp?: number;
}
