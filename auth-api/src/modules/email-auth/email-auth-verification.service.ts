import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { createHash } from 'crypto';
import { IdentityService } from '../identity/identity.service';
import type { IdentityUser } from '../identity/identity.types';
import {
  AuthErrorCode,
  type AuthErrorResponseDto,
} from '../../core/dto/auth-response.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import { EmailLoginChallengeStore } from './email-login-challenge.store';

@Injectable()
export class EmailAuthVerificationService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly emailLoginChallengeStore: EmailLoginChallengeStore,
  ) {}

  async verifyEmailCode(payload: VerifyEmailCodeDto): Promise<IdentityUser> {
    const email = await this.emailLoginChallengeStore.consumeByCode(
      this.identityService.normalizeEmail(payload.email),
      this.hashValue(payload.code.trim()),
    );

    if (!email) {
      throw this.createInvalidChallengeError();
    }

    return this.findOrCreateLocalEmailUser(email);
  }

  async verifyMagicLink(payload: VerifyMagicLinkDto): Promise<IdentityUser> {
    const email = await this.emailLoginChallengeStore.consumeByLinkToken(
      this.hashValue(payload.token.trim()),
    );

    if (!email) {
      throw this.createInvalidChallengeError();
    }

    return this.findOrCreateLocalEmailUser(email);
  }

  private async findOrCreateLocalEmailUser(email: string): Promise<IdentityUser> {
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
