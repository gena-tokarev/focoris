import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { LocalAuthGuard } from '../../core/guards/local-auth.guard';
import { LocalStrategy } from '../../core/strategies/local.strategy';
import { IdentityModule } from '../identity/identity.module';
import { SessionModule } from '../session/session.module';
import { TokenModule } from '../token/token.module';
import { EmailAuthController } from './email-auth.controller';
import { EmailAuthService } from './email-auth.service';
import { EmailAuthVerificationService } from './email-auth-verification.service';
import { EmailLoginChallengeStore } from './email-login-challenge.store';

@Module({
  imports: [PassportModule, IdentityModule, SessionModule, TokenModule],
  controllers: [EmailAuthController],
  providers: [
    EmailAuthService,
    EmailAuthVerificationService,
    EmailLoginChallengeStore,
    LocalAuthGuard,
    LocalStrategy,
  ],
  exports: [EmailAuthVerificationService],
})
export class EmailAuthModule {}
