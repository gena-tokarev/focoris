import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorCode, AuthErrorResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.MissingBearerToken,
        message: 'Missing or invalid bearer token',
      } satisfies AuthErrorResponseDto);
    }

    return user;
  }
}
