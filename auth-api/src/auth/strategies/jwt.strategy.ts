import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthJwtPayload, JwtTokenType } from '@focoris/auth-nest';
import type { AppEnv } from '../../config/config.validation';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
} from '../dto/auth-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService<AppEnv, true>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('AUTH_ACCESS_TOKEN_SECRET'),
    });
  }

  validate(payload: AuthJwtPayload): AuthJwtPayload {
    if (payload.type !== JwtTokenType.Access) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidAccessToken,
        message: 'Invalid access token',
      } satisfies AuthErrorResponseDto);
    }

    return payload;
  }
}
