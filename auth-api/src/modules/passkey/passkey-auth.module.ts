import { Module } from '@nestjs/common';
import { EmailAuthModule } from '../email-auth/email-auth.module';
import { IdentityModule } from '../identity/identity.module';
import { TokenModule } from '../token/token.module';
import { PasskeyAuthController } from './passkey-auth.controller';
import { PasskeyAuthService } from './passkey-auth.service';
import { PasskeyChallengeStore } from './passkey-challenge.store';

@Module({
  imports: [EmailAuthModule, IdentityModule, TokenModule],
  controllers: [PasskeyAuthController],
  providers: [PasskeyAuthService, PasskeyChallengeStore],
})
export class PasskeyAuthModule {}
