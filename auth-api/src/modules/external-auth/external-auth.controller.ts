import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import type { IdentityUser } from '../identity/identity.types';
import { GoogleAuthCodeExchangeDto } from './dto/google-auth-code-exchange.dto';
import type { GoogleAuthStartDto } from './dto/google-auth-start.dto';
import { ExternalAuthRedirectService } from './external-auth-redirect.service';
import { ExternalAuthService } from './external-auth.service';
import { GoogleAuthGuard } from './google/google-auth.guard';
import { AuthSessionInterceptor } from '../session/interceptors/auth-session.interceptor';
import type { AuthenticatedSession } from '../session/session.types';

interface RedirectResponse {
  redirect(url: string): void;
}

interface GoogleCallbackRequest {
  user: IdentityUser | null;
  query: {
    state?: string;
    error?: string;
  };
  externalAuthError?: unknown;
}

@Controller('auth')
export class ExternalAuthController {
  constructor(
    private readonly externalAuthService: ExternalAuthService,
    private readonly externalAuthRedirectService: ExternalAuthRedirectService,
  ) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin(@Query() _query: GoogleAuthStartDto): void {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() request: GoogleCallbackRequest,
    @Res() response: RedirectResponse,
  ): Promise<void> {
    const redirectContext = this.externalAuthRedirectService.parseState(
      request.query.state,
    );

    if (request.user) {
      const code = await this.externalAuthService.createCompletionCode(
        request.user,
        redirectContext.redirectUri,
        redirectContext.platform,
      );

      response.redirect(
        this.externalAuthRedirectService.createSuccessRedirect(
          redirectContext,
          code,
        ),
      );
      return;
    }

    response.redirect(
      this.externalAuthRedirectService.createErrorRedirect(
        redirectContext,
        this.getCallbackErrorCode(request),
      ),
    );
  }

  @Post('google/exchange')
  @UseInterceptors(AuthSessionInterceptor)
  exchangeGoogleCode(
    @Body() payload: GoogleAuthCodeExchangeDto,
  ): Promise<AuthenticatedSession> {
    return this.externalAuthService.exchangeCompletionCode(payload.code);
  }

  private getCallbackErrorCode(request: GoogleCallbackRequest): string {
    if (request.query.error === 'access_denied') {
      return 'oauth_cancelled';
    }

    return 'oauth_failed';
  }
}
