import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile,
  Strategy,
  VerifyCallback,
} from 'passport-google-oauth20';
import type { AppEnv } from '../../../config/config.validation';
import { ExternalAuthService } from '../external-auth.service';
import type { IdentityUser } from '../../identity/identity.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly externalAuthService: ExternalAuthService,
    configService: ConfigService<AppEnv, true>,
  ) {
    super({
      clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.externalAuthService.resolveGoogleUser(profile);
      done(null, user satisfies IdentityUser);
    } catch (error) {
      done(error as Error, false);
    }
  }
}
