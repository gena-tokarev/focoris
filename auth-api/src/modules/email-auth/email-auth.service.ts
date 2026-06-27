import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'crypto';
import { IdentityService } from '../identity/identity.service';
import { TokenService } from '../token/token.service';
import { RequestEmailLoginDto } from '../../core/dto/request-email-login.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import {
  LoginResponseDto,
  RequestEmailLoginResponseDto,
} from '../../core/dto/auth-response.dto';
import { EmailLoginChallengeStore } from './email-login-challenge.store';
import { EmailAuthVerificationService } from './email-auth-verification.service';

@Injectable()
export class EmailAuthService {
  private static readonly EMAIL_LOGIN_TTL_SECONDS = 10 * 60;

  constructor(
    private readonly identityService: IdentityService,
    private readonly tokenService: TokenService,
    private readonly emailLoginChallengeStore: EmailLoginChallengeStore,
    private readonly emailAuthVerificationService: EmailAuthVerificationService,
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
    const user = await this.emailAuthVerificationService.verifyEmailCode(payload);
    return this.tokenService.login(user);
  }

  async verifyMagicLink(
    payload: VerifyMagicLinkDto,
  ): Promise<LoginResponseDto> {
    const user = await this.emailAuthVerificationService.verifyMagicLink(payload);
    return this.tokenService.login(user);
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
