import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExternalAuthRedirectService } from '../external-auth-redirect.service';
import type { IdentityUser } from '../../identity/identity.types';

interface GoogleAuthRequest {
  route?: { path?: string };
  query: {
    redirectUri?: string | string[];
    platform?: string | string[];
  };
  externalAuthError?: unknown;
  user?: IdentityUser | null;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly externalAuthRedirectService: ExternalAuthRedirectService,
  ) {
    super();
  }

  override getAuthenticateOptions(
    context: ExecutionContext,
  ): Record<string, unknown> {
    const request = context.switchToHttp().getRequest<GoogleAuthRequest>();

    if (request.route?.path === 'google') {
      const redirectContext = this.externalAuthRedirectService.parseStartRequest(
        request.query,
      );

      return {
        session: false,
        state: this.externalAuthRedirectService.createState(redirectContext),
      };
    }

    return {
      session: false,
    };
  }

  override handleRequest<TUser = IdentityUser | null>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<GoogleAuthRequest>();
    request.externalAuthError = err;
    request.user = (user ?? null) as IdentityUser | null;

    return user;
  }
}
