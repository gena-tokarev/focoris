import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthJwtPayload, JwtTokenType } from '@focoris/auth-nest';
import type { AppEnv } from '../../../config/config.validation';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
} from '../../../core/dto/auth-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<AppEnv, true>) {
    const accessTokenCookieName = configService.getOrThrow(
      'AUTH_COOKIE_ACCESS_TOKEN_NAME',
    );

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (
          request?: {
            headers?: {
              cookie?: string;
            };
          },
        ) => {
          const rawCookieHeader = request?.headers?.cookie;

          if (!rawCookieHeader) {
            return null;
          }

          for (const cookie of rawCookieHeader.split(';')) {
            const [rawName, ...valueParts] = cookie.split('=');

            if (rawName?.trim() !== accessTokenCookieName) {
              continue;
            }

            return decodeURIComponent(valueParts.join('=').trim());
          }

          return null;
        },
      ]),
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
