import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAccessGuard } from '@focoris/auth-nest';
import { AuthErrorCode, AuthErrorResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class JwtAuthGuard extends JwtAccessGuard {
  constructor(jwtService: JwtService, configService: ConfigService) {
    super(jwtService, configService);
  }

  protected override onMissingBearerToken(): never {
    throw new UnauthorizedException({
      statusCode: 401,
      code: AuthErrorCode.MissingBearerToken,
      message: 'Missing or invalid bearer token',
    } satisfies AuthErrorResponseDto);
  }

  protected override onInvalidAccessToken(): never {
    throw new UnauthorizedException({
      statusCode: 401,
      code: AuthErrorCode.InvalidAccessToken,
      message: 'Invalid access token',
    } satisfies AuthErrorResponseDto);
  }
}
