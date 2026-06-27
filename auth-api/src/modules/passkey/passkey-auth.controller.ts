import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import type { LoginResponseDto } from '../../core/dto/auth-response.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import type { PasskeyFinishRequestDto } from './dto/passkey-finish.dto';
import type { PasskeyLoginStartResponseDto } from './dto/passkey-login-start.dto';
import type { PasskeyRegisterStartResponseDto } from './dto/passkey-register-start.dto';
import { PasskeyAuthService } from './passkey-auth.service';

@Controller('auth/passkey')
export class PasskeyAuthController {
  constructor(private readonly passkeyAuthService: PasskeyAuthService) {}

  @Post('login/start')
  startLogin(): Promise<PasskeyLoginStartResponseDto> {
    return this.passkeyAuthService.startLogin();
  }

  @Post('login/finish')
  finishLogin(
    @Body() payload: PasskeyFinishRequestDto,
  ): Promise<LoginResponseDto> {
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
    @Headers('authorization') authorization?: string,
  ): Promise<PasskeyRegisterStartResponseDto> {
    return this.passkeyAuthService.startRegistration(
      this.extractBearerToken(authorization),
    );
  }

  @Post('register/finish')
  finishRegistration(
    @Body() payload: PasskeyFinishRequestDto,
  ): Promise<LoginResponseDto> {
    return this.passkeyAuthService.finishRegistration(payload);
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }
}
