import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { Profile } from 'passport-google-oauth20';
import type { LoginResponseDto } from '../../core/dto/auth-response.dto';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
} from '../../core/dto/auth-response.dto';
import { IdentityService } from '../identity/identity.service';
import type { IdentityUser } from '../identity/identity.types';
import { TokenService } from '../token/token.service';
import { ExternalAuthCodeStore } from './external-auth-code.store';
import type { ExternalAuthPlatform } from './external-auth.types';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/config.validation';

@Injectable()
export class ExternalAuthService {
  private readonly externalAuthCodeTtlSeconds: number;

  constructor(
    private readonly identityService: IdentityService,
    private readonly tokenService: TokenService,
    private readonly externalAuthCodeStore: ExternalAuthCodeStore,
    configService: ConfigService<AppEnv, true>,
  ) {
    this.externalAuthCodeTtlSeconds = configService.getOrThrow(
      'AUTH_EXTERNAL_AUTH_CODE_TTL_SECONDS',
    );
  }

  login(user: IdentityUser): Promise<LoginResponseDto> {
    return this.tokenService.login(user);
  }

  async createCompletionCode(
    user: IdentityUser,
    redirectUri: string,
    platform: ExternalAuthPlatform,
  ): Promise<string> {
    return this.externalAuthCodeStore.create(
      {
        userId: user.id,
        redirectUri,
        platform,
      },
      this.externalAuthCodeTtlSeconds,
    );
  }

  async exchangeCompletionCode(code: string): Promise<LoginResponseDto> {
    const storedCode = await this.externalAuthCodeStore.consume(code);

    if (!storedCode) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidExternalAuthCode,
        message: 'Invalid external auth code',
      } satisfies AuthErrorResponseDto);
    }

    const user = await this.identityService.findUserById(storedCode.userId);

    if (!user) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidExternalAuthCode,
        message: 'Invalid external auth code',
      } satisfies AuthErrorResponseDto);
    }

    return this.login(user);
  }

  async resolveGoogleUser(profile: Profile): Promise<IdentityUser> {
    const providerUserId = profile.id.trim();
    const existingUser = await this.identityService.findUserByIdentity(
      AuthProvider.google,
      providerUserId,
    );

    if (existingUser) {
      return existingUser;
    }

    const email = this.getGoogleEmail(profile);

    return this.identityService.createUserWithIdentity({
      email,
      identity: {
        provider: AuthProvider.google,
        providerUserId,
        email,
        emailVerified: profile.emails?.some((entry) => entry.verified) ?? false,
        displayName: profile.displayName,
      },
    });
  }

  private getGoogleEmail(profile: Profile): string {
    const email =
      profile.emails?.find((entry) => entry.verified)?.value ??
      profile.emails?.[0]?.value;

    if (!email) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'External identity did not provide an email address',
      } satisfies AuthErrorResponseDto);
    }

    return this.identityService.normalizeEmail(email);
  }
}
