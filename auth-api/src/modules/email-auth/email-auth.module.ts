import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TokenModule } from '../token/token.module';
import { EmailAuthController } from './email-auth.controller';
import { EmailAuthService } from './email-auth.service';
import { EmailAuthVerificationService } from './email-auth-verification.service';
import { EmailLoginChallengeStore } from './email-login-challenge.store';

@Module({
  imports: [IdentityModule, TokenModule],
  controllers: [EmailAuthController],
  providers: [
    EmailAuthService,
    EmailAuthVerificationService,
    EmailLoginChallengeStore,
  ],
  exports: [EmailAuthVerificationService],
})
export class EmailAuthModule {}
