import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { LoginResponseDto } from '../../core/dto/auth-response.dto';
import type { IdentityUser } from '../identity/identity.types';
import { ExternalAuthService } from './external-auth.service';
import { GoogleAuthGuard } from './google/google-auth.guard';

@Controller('auth')
export class ExternalAuthController {
  constructor(private readonly externalAuthService: ExternalAuthService) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin(): void {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(
    @Req() request: { user: IdentityUser },
  ): Promise<LoginResponseDto> {
    return this.externalAuthService.login(request.user);
  }
}
