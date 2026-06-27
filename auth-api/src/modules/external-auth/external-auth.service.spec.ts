import { BadRequestException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';
import { ExternalAuthService } from './external-auth.service';
import type { IdentityService } from '../identity/identity.service';
import type { TokenService } from '../token/token.service';
import type { IdentityUser } from '../identity/identity.types';
import type { ExternalAuthCodeStore } from './external-auth-code.store';

describe('ExternalAuthService', () => {
  let identityService: jest.Mocked<IdentityService>;
  let tokenService: jest.Mocked<TokenService>;
  let externalAuthCodeStore: jest.Mocked<ExternalAuthCodeStore>;
  let service: ExternalAuthService;

  beforeEach(() => {
    identityService = {
      findUserByIdentity: jest.fn(),
      findUserById: jest.fn(),
      createUserWithIdentity: jest.fn(),
      normalizeEmail: jest.fn((email: string) => email.toLowerCase().trim()),
    } as unknown as jest.Mocked<IdentityService>;

    tokenService = {
      login: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    externalAuthCodeStore = {
      create: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<ExternalAuthCodeStore>;

    service = new ExternalAuthService(
      identityService,
      tokenService,
      externalAuthCodeStore,
      {
        getOrThrow: jest.fn().mockImplementation((key: string) => {
          if (key === 'AUTH_EXTERNAL_AUTH_CODE_TTL_SECONDS') {
            return 300;
          }

          throw new Error(`Unexpected config lookup: ${key}`);
        }),
      } as never,
    );
  });

  it('reuses an existing Google-linked user', async () => {
    const existingUser: IdentityUser = {
      id: 'user-1',
      email: 'existing@focoris.local',
      roles: [],
    };
    const profile = createGoogleProfile({
      id: 'google-user-1',
      emails: [{ value: 'existing@focoris.local', verified: true }],
    });

    identityService.findUserByIdentity.mockResolvedValue(existingUser);

    await expect(service.resolveGoogleUser(profile)).resolves.toBe(existingUser);

    expect(identityService.findUserByIdentity).toHaveBeenCalledWith(
      AuthProvider.google,
      'google-user-1',
    );
    expect(identityService.createUserWithIdentity).not.toHaveBeenCalled();
  });

  it('creates a new user from the verified Google email', async () => {
    const createdUser: IdentityUser = {
      id: 'user-2',
      email: 'verified@focoris.local',
      roles: [],
    };
    const profile = createGoogleProfile({
      id: 'google-user-2',
      displayName: 'Verified User',
      emails: [
        { value: 'first@focoris.local', verified: false },
        { value: 'verified@focoris.local', verified: true },
      ],
    });

    identityService.findUserByIdentity.mockResolvedValue(null);
    identityService.createUserWithIdentity.mockResolvedValue(createdUser);

    await expect(service.resolveGoogleUser(profile)).resolves.toBe(createdUser);

    expect(identityService.createUserWithIdentity).toHaveBeenCalledWith({
      email: 'verified@focoris.local',
      identity: {
        provider: AuthProvider.google,
        providerUserId: 'google-user-2',
        email: 'verified@focoris.local',
        emailVerified: true,
        displayName: 'Verified User',
      },
    });
  });

  it('rejects a Google profile without any email', async () => {
    const profile = createGoogleProfile({
      id: 'google-user-3',
      emails: [],
    });

    identityService.findUserByIdentity.mockResolvedValue(null);

    await expect(service.resolveGoogleUser(profile)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.resolveGoogleUser(profile)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_INVALID_CREDENTIALS',
      }),
    });
  });

  it('creates a one-time completion code', async () => {
    const user: IdentityUser = {
      id: 'user-3',
      email: 'code@focoris.local',
      roles: [],
    };

    externalAuthCodeStore.create.mockResolvedValue('external-code');

    await expect(
      service.createCompletionCode(
        user,
        'focoris://auth/callback',
        'native',
      ),
    ).resolves.toBe('external-code');

    expect(externalAuthCodeStore.create).toHaveBeenCalledWith(
      {
        userId: 'user-3',
        redirectUri: 'focoris://auth/callback',
        platform: 'native',
      },
      300,
    );
  });

  it('exchanges a valid one-time code for tokens', async () => {
    const user: IdentityUser = {
      id: 'user-4',
      email: 'exchange@focoris.local',
      roles: [],
    };
    const loginResponse = {
      user: { id: user.id, email: user.email, roles: [] },
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer' as const,
        expiresInSeconds: 300,
      },
    };

    externalAuthCodeStore.consume.mockResolvedValue({
      userId: 'user-4',
      redirectUri: 'http://localhost:3000/auth/callback',
      platform: 'web',
    });
    identityService.findUserById.mockResolvedValue(user);
    tokenService.login.mockResolvedValue(loginResponse);

    await expect(service.exchangeCompletionCode('external-code')).resolves.toBe(
      loginResponse,
    );

    expect(externalAuthCodeStore.consume).toHaveBeenCalledWith('external-code');
    expect(identityService.findUserById).toHaveBeenCalledWith('user-4');
    expect(tokenService.login).toHaveBeenCalledWith(user);
  });

  it('rejects an unknown one-time code', async () => {
    externalAuthCodeStore.consume.mockResolvedValue(null);

    await expect(service.exchangeCompletionCode('missing-code')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_INVALID_EXTERNAL_AUTH_CODE',
      }),
    });
  });
});

function createGoogleProfile(input: {
  id: string;
  displayName?: string;
  emails: Array<{ value: string; verified?: boolean }>;
}): Profile {
  return {
    provider: 'google',
    id: input.id,
    displayName: input.displayName ?? 'Google User',
    username: undefined,
    name: undefined,
    emails: input.emails,
    photos: [],
    profileUrl: undefined,
    _raw: '',
    _json: {},
  } as Profile;
}
