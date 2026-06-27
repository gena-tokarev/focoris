import { ExternalAuthController } from './external-auth.controller';
import type { ExternalAuthRedirectService } from './external-auth-redirect.service';
import type { ExternalAuthService } from './external-auth.service';

describe('ExternalAuthController', () => {
  let externalAuthService: jest.Mocked<ExternalAuthService>;
  let externalAuthRedirectService: jest.Mocked<ExternalAuthRedirectService>;
  let controller: ExternalAuthController;

  beforeEach(() => {
    externalAuthService = {
      createCompletionCode: jest.fn(),
      exchangeCompletionCode: jest.fn(),
    } as unknown as jest.Mocked<ExternalAuthService>;

    externalAuthRedirectService = {
      parseState: jest.fn(),
      createSuccessRedirect: jest.fn(),
      createErrorRedirect: jest.fn(),
    } as unknown as jest.Mocked<ExternalAuthRedirectService>;

    controller = new ExternalAuthController(
      externalAuthService,
      externalAuthRedirectService,
    );
  });

  it('redirects successful callbacks to the client with a one-time code', async () => {
    externalAuthRedirectService.parseState.mockReturnValue({
      redirectUri: 'focoris://auth/callback',
      platform: 'native',
    });
    externalAuthService.createCompletionCode.mockResolvedValue('code-1');
    externalAuthRedirectService.createSuccessRedirect.mockReturnValue(
      'focoris://auth/callback?code=code-1&status=success',
    );

    const response = {
      redirect: jest.fn(),
    };

    await controller.googleCallback(
      {
        user: { id: 'user-1', email: 'user@focoris.local', roles: [] },
        query: { state: 'state-1' },
      },
      response as never,
    );

    expect(externalAuthService.createCompletionCode).toHaveBeenCalledWith(
      { id: 'user-1', email: 'user@focoris.local', roles: [] },
      'focoris://auth/callback',
      'native',
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'focoris://auth/callback?code=code-1&status=success',
    );
  });

  it('redirects failed callbacks with an error code', async () => {
    externalAuthRedirectService.parseState.mockReturnValue({
      redirectUri: 'http://localhost:3000/auth/callback',
      platform: 'web',
    });
    externalAuthRedirectService.createErrorRedirect.mockReturnValue(
      'http://localhost:3000/auth/callback?error=oauth_cancelled&status=error',
    );

    const response = {
      redirect: jest.fn(),
    };

    await controller.googleCallback(
      {
        user: null,
        query: {
          state: 'state-1',
          error: 'access_denied',
        },
      },
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/auth/callback?error=oauth_cancelled&status=error',
    );
  });
});
