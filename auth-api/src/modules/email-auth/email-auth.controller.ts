import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequestEmailLoginDto } from '../../core/dto/request-email-login.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import type {
  LoginResponseDto,
  RequestEmailLoginResponseDto,
} from '../../core/dto/auth-response.dto';
import { EmailAuthService } from './email-auth.service';

@Controller('auth/email')
export class EmailAuthController {
  constructor(private readonly emailAuthService: EmailAuthService) {}

  @Post('request')
  requestEmailLogin(
    @Body() payload: RequestEmailLoginDto,
  ): Promise<RequestEmailLoginResponseDto> {
    return this.emailAuthService.requestEmailLogin(payload);
  }

  @Post('verify-code')
  verifyEmailCode(
    @Body() payload: VerifyEmailCodeDto,
  ): Promise<LoginResponseDto> {
    return this.emailAuthService.verifyEmailCode(payload);
  }

  @Get('verify-link')
  verifyMagicLink(
    @Query() payload: VerifyMagicLinkDto,
  ): Promise<LoginResponseDto> {
    return this.emailAuthService.verifyMagicLink(payload);
  }
}
