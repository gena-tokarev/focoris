import { ConflictException, Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { IdentityService } from '../identity/identity.service';
import type { IdentityUser } from '../identity/identity.types';
import { TokenService } from '../token/token.service';
import { RegisterRequestDto } from '../../core/dto/register-request.dto';
import { RequestEmailLoginDto } from '../../core/dto/request-email-login.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
  RequestEmailLoginResponseDto,
} from '../../core/dto/auth-response.dto';
import { EmailLoginChallengeStore } from './email-login-challenge.store';
import { EmailAuthVerificationService } from './email-auth-verification.service';
import type { AuthenticatedSession } from '../session/session.types';

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

  async register(payload: RegisterRequestDto): Promise<AuthenticatedSession> {
    const email = this.identityService.normalizeEmail(payload.email);
    const existingLocalUser = await this.identityService.findUserByIdentity(
      AuthProvider.local,
      email,
    );

    if (existingLocalUser) {
      throw new ConflictException({
        statusCode: 409,
        code: AuthErrorCode.EmailAlreadyTaken,
        message: 'Email is already taken',
      } satisfies AuthErrorResponseDto);
    }

    const passwordHash = bcrypt.hashSync(payload.password, 10);
    const user = await this.identityService.createUserWithIdentity({
      email,
      identity: {
        provider: AuthProvider.local,
        providerUserId: email,
        email,
        emailVerified: false,
        passwordHash,
      },
    });

    return this.tokenService.login(user);
  }

  login(user: IdentityUser): Promise<AuthenticatedSession> {
    return this.tokenService.login(user);
  }

  async verifyEmailCode(
    payload: VerifyEmailCodeDto,
  ): Promise<AuthenticatedSession> {
    const user = await this.emailAuthVerificationService.verifyEmailCode(
      payload,
    );
    return this.tokenService.login(user);
  }

  async verifyMagicLink(
    payload: VerifyMagicLinkDto,
  ): Promise<AuthenticatedSession> {
    const user = await this.emailAuthVerificationService.verifyMagicLink(
      payload,
    );
    return this.tokenService.login(user);
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
