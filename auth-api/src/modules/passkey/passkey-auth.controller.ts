import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import type { PasskeyFinishRequestDto } from './dto/passkey-finish.dto';
import type { PasskeyLoginStartResponseDto } from './dto/passkey-login-start.dto';
import type { PasskeyRegisterStartResponseDto } from './dto/passkey-register-start.dto';
import { PasskeyAuthService } from './passkey-auth.service';
import { AuthSessionService } from '../session/session.service';
import { AuthSessionInterceptor } from '../session/interceptors/auth-session.interceptor';
import type {
  AuthenticatedSession,
  AuthRequestLike,
} from '../session/session.types';

@Controller('auth/passkey')
export class PasskeyAuthController {
  constructor(
    private readonly passkeyAuthService: PasskeyAuthService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Post('login/start')
  startLogin(): Promise<PasskeyLoginStartResponseDto> {
    return this.passkeyAuthService.startLogin();
  }

  @Post('login/finish')
  @UseInterceptors(AuthSessionInterceptor)
  finishLogin(
    @Body() payload: PasskeyFinishRequestDto,
  ): Promise<AuthenticatedSession> {
    return this.passkeyAuthService.finishLogin(payload);
  }

  @Post('register/verify-code')
  verifyCodeForRegistration(
    @Body() payload: VerifyEmailCodeDto,
  ): Promise<PasskeyRegisterStartResponseDto> {
    return this.passkeyAuthService.verifyCodeForRegistration(payload);
  }

  @Get('register/verify-link')
  verifyLinkForRegistration(
    @Query() payload: VerifyMagicLinkDto,
  ): Promise<PasskeyRegisterStartResponseDto> {
    return this.passkeyAuthService.verifyLinkForRegistration(payload);
  }

  @Post('register/start')
  startRegistration(
    @Req() request: AuthRequestLike,
  ): Promise<PasskeyRegisterStartResponseDto> {
    return this.passkeyAuthService.startRegistration(
      this.authSessionService.getAccessTokenFromRequest(request),
    );
  }

  @Post('register/finish')
  @UseInterceptors(AuthSessionInterceptor)
  finishRegistration(
    @Body() payload: PasskeyFinishRequestDto,
  ): Promise<AuthenticatedSession> {
    return this.passkeyAuthService.finishRegistration(payload);
  }
}
