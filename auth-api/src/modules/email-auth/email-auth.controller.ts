import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { RegisterRequestDto } from '../../core/dto/register-request.dto';
import { RequestEmailLoginDto } from '../../core/dto/request-email-login.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import type { RequestEmailLoginResponseDto } from '../../core/dto/auth-response.dto';
import { LocalAuthGuard } from '../../core/guards/local-auth.guard';
import type { IdentityUser } from '../identity/identity.types';
import { EmailAuthService } from './email-auth.service';
import { AuthSessionInterceptor } from '../session/interceptors/auth-session.interceptor';
import type { AuthenticatedSession } from '../session/session.types';

@Controller('auth/email')
export class EmailAuthController {
  constructor(private readonly emailAuthService: EmailAuthService) {}

  @Post('request')
  requestEmailLogin(
    @Body() payload: RequestEmailLoginDto,
  ): Promise<RequestEmailLoginResponseDto> {
    return this.emailAuthService.requestEmailLogin(payload);
  }

  @Post('register')
  @UseInterceptors(AuthSessionInterceptor)
  register(@Body() payload: RegisterRequestDto): Promise<AuthenticatedSession> {
    return this.emailAuthService.register(payload);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @UseInterceptors(AuthSessionInterceptor)
  login(
    @Req() request: { user: IdentityUser },
  ): Promise<AuthenticatedSession> {
    return this.emailAuthService.login(request.user);
  }

  @Post('verify-code')
  @UseInterceptors(AuthSessionInterceptor)
  verifyEmailCode(
    @Body() payload: VerifyEmailCodeDto,
  ): Promise<AuthenticatedSession> {
    return this.emailAuthService.verifyEmailCode(payload);
  }

  @Get('verify-link')
  @UseInterceptors(AuthSessionInterceptor)
  verifyMagicLink(
    @Query() payload: VerifyMagicLinkDto,
  ): Promise<AuthenticatedSession> {
    return this.emailAuthService.verifyMagicLink(payload);
  }
}
