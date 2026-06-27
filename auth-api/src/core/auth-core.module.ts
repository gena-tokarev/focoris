import { Module } from '@nestjs/common';
import { RolesGuard } from '@focoris/auth-nest';
import { EmailAuthModule } from '../modules/email-auth/email-auth.module';
import { ExternalAuthModule } from '../modules/external-auth/external-auth.module';
import { IdentityModule } from '../modules/identity/identity.module';
import { PasskeyAuthModule } from '../modules/passkey/passkey-auth.module';
import { SessionModule } from '../modules/session/session.module';
import { TokenModule } from '../modules/token/token.module';
import { AuthCoreController } from './auth-core.controller';
import { AuthCoreService } from './auth-core.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    EmailAuthModule,
    ExternalAuthModule,
    IdentityModule,
    PasskeyAuthModule,
    SessionModule,
    TokenModule,
  ],
  controllers: [AuthCoreController],
  providers: [
    AuthCoreService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthCoreModule {}
