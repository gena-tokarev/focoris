import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RolesGuard } from '@focoris/auth-nest';
import { EmailAuthModule } from '../modules/email-auth/email-auth.module';
import { ExternalAuthModule } from '../modules/external-auth/external-auth.module';
import { IdentityModule } from '../modules/identity/identity.module';
import { TokenModule } from '../modules/token/token.module';
import { AuthCoreController } from './auth-core.controller';
import { AuthCoreService } from './auth-core.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule,
    EmailAuthModule,
    ExternalAuthModule,
    IdentityModule,
    TokenModule,
  ],
  controllers: [AuthCoreController],
  providers: [
    AuthCoreService,
    JwtAuthGuard,
    LocalAuthGuard,
    LocalStrategy,
    RolesGuard,
  ],
})
export class AuthCoreModule {}
