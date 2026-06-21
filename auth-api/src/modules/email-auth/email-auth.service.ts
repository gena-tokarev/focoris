import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';
import { IdentityService } from '../identity/identity.service';
import { TokenService } from '../token/token.service';
import { RequestEmailLoginDto } from '../../core/dto/request-email-login.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
  LoginResponseDto,
  RequestEmailLoginResponseDto,
} from '../../core/dto/auth-response.dto';
import { EmailLoginChallengeStore } from './email-login-challenge.store';

@Injectable()
export class EmailAuthService {
  private static readonly EMAIL_LOGIN_TTL_SECONDS = 10 * 60;

  constructor(
    private readonly identityService: IdentityService,
    private readonly tokenService: TokenService,
    private readonly emailLoginChallengeStore: EmailLoginChallengeStore,
  ) {}

  async requestEmailLogin(
    payload: RequestEmailLoginDto,
  ): Promise<RequestEmailLoginResponseDto> {
    const email = this.identityService.normalizeEmail(payload.email);
    const code = `${randomInt(0, 1_000_000)}`.padStart(6, '0');
    const linkToken = randomBytes(32).toString('hex');
    const codeHash = this.hashValue(code);
    const linkTokenHash = this.hashValue(linkToken);

    await this.emailLoginChallengeStore.replace({
      email,
      codeHash,
      linkTokenHash,
      ttlSeconds: EmailAuthService.EMAIL_LOGIN_TTL_SECONDS,
    });

    return {
      success: true,
      expiresInSeconds: EmailAuthService.EMAIL_LOGIN_TTL_SECONDS,
      dev:
        process.env.NODE_ENV !== 'production'
          ? {
              code,
              magicLinkToken: linkToken,
              magicLinkUrl: `http://localhost:${
                process.env.PORT || 3001
              }/api/auth/email/verify-link?token=${linkToken}`,
            }
          : undefined,
    };
  }

  async verifyEmailCode(
    payload: VerifyEmailCodeDto,
  ): Promise<LoginResponseDto> {
    const email = await this.emailLoginChallengeStore.consumeByCode(
      this.identityService.normalizeEmail(payload.email),
      this.hashValue(payload.code.trim()),
    );

    if (!email) {
      throw this.createInvalidChallengeError();
    }

    const user = await this.findOrCreateLocalEmailUser(email);

    return this.tokenService.login(user);
  }

  async verifyMagicLink(
    payload: VerifyMagicLinkDto,
  ): Promise<LoginResponseDto> {
    const email = await this.emailLoginChallengeStore.consumeByLinkToken(
      this.hashValue(payload.token.trim()),
    );

    if (!email) {
      throw this.createInvalidChallengeError();
    }

    const user = await this.findOrCreateLocalEmailUser(email);

    return this.tokenService.login(user);
  }

  private async findOrCreateLocalEmailUser(email: string) {
    const existingUser = await this.identityService.findUserByIdentity(
      AuthProvider.local,
      email,
    );

    if (existingUser) {
      return existingUser;
    }

    return this.identityService.createUserWithIdentity({
      email,
      identity: {
        provider: AuthProvider.local,
        providerUserId: email,
        email,
        emailVerified: true,
      },
    });
  }

  private createInvalidChallengeError(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: AuthErrorCode.InvalidEmailLoginChallenge,
      message: 'Invalid or expired email login challenge',
    } satisfies AuthErrorResponseDto);
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
