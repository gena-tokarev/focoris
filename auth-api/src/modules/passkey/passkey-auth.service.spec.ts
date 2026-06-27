import { UnauthorizedException } from '@nestjs/common';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { AuthProvider } from '@prisma/client';
import { PasskeyAuthService } from './passkey-auth.service';
import {
  PasskeyChallengeFlow,
  type StoredPasskeyChallenge,
} from './passkey-challenge.store';
import type { EmailAuthVerificationService } from '../email-auth/email-auth-verification.service';
import type { TokenService } from '../token/token.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/config.validation';
import type { IdentityUser } from '../identity/identity.types';

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('PasskeyAuthService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let emailAuthVerificationService: jest.Mocked<EmailAuthVerificationService>;
  let tokenService: jest.Mocked<TokenService>;
  let passkeyChallengeStore: {
    issue: jest.Mock<Promise<string>, [StoredPasskeyChallenge & { ttlSeconds: number }]>;
    consume: jest.Mock<Promise<StoredPasskeyChallenge | null>, [string]>;
  };
  let configService: ConfigService<AppEnv, true>;
  let service: PasskeyAuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      userIdentity: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      passkeyCredential: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    emailAuthVerificationService = {
      verifyEmailCode: jest.fn(),
      verifyMagicLink: jest.fn(),
    } as unknown as jest.Mocked<EmailAuthVerificationService>;

    tokenService = {
      getUserForAccessToken: jest.fn(),
      login: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    passkeyChallengeStore = {
      issue: jest.fn(),
      consume: jest.fn(),
    };

    configService = {
      getOrThrow: jest.fn((key: keyof AppEnv) => {
        switch (key) {
          case 'PASSKEY_RP_ID':
            return 'localhost';
          case 'PASSKEY_RP_NAME':
            return 'Focoris Auth';
          case 'PASSKEY_ALLOWED_ORIGINS':
            return 'http://localhost:3001';
          default:
            throw new Error(`Unexpected key ${String(key)}`);
        }
      }),
    } as unknown as ConfigService<AppEnv, true>;

    service = new PasskeyAuthService(
      prisma,
      emailAuthVerificationService,
      tokenService,
      passkeyChallengeStore as never,
      configService,
    );

    jest.clearAllMocks();
  });

  it('starts authenticated registration and excludes existing passkeys', async () => {
    const authUser: IdentityUser = {
      id: 'user-1',
      email: 'user@focoris.local',
      roles: [],
    };
    const existingPasskey = {
      id: 'pk-row-1',
      credentialId: 'credential-1',
      publicKey: Buffer.from('public-key'),
      counter: 3,
      transports: ['internal'],
      userIdentityId: 'identity-1',
      deviceType: null,
      backedUp: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tokenService.getUserForAccessToken.mockResolvedValue(authUser);
    prisma.user.findUnique.mockResolvedValue({
      id: authUser.id,
      email: authUser.email,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userIdentities: [
        {
          id: 'identity-1',
          provider: AuthProvider.passkey,
          providerUserId: authUser.id,
          email: authUser.email,
          emailVerified: true,
          displayName: null,
          passwordHash: null,
          userId: authUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          passkeyCredentials: [existingPasskey],
        },
      ],
    } as never);
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({
      challenge: 'register-challenge',
      user: { name: authUser.email },
      excludeCredentials: [
        {
          id: 'credential-1',
          type: 'public-key',
          transports: ['internal'],
        },
      ],
    });
    passkeyChallengeStore.issue.mockResolvedValue('request-1');

    const result = await service.startRegistration('access-token');

    expect(result).toEqual({
      requestId: 'request-1',
      options: expect.objectContaining({
        challenge: 'register-challenge',
      }),
    });
    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: 'localhost',
        userName: authUser.email,
        excludeCredentials: [
          {
            id: 'credential-1',
            type: 'public-key',
            transports: ['internal'],
          },
        ],
      }),
    );
    expect(passkeyChallengeStore.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: PasskeyChallengeFlow.Register,
        userId: authUser.id,
        email: authUser.email,
        challenge: 'register-challenge',
      }),
    );
  });

  it('verifies email code and returns a registration challenge', async () => {
    const user: IdentityUser = {
      id: 'user-2',
      email: 'verified@focoris.local',
      roles: [],
    };
    emailAuthVerificationService.verifyEmailCode.mockResolvedValue(user);
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userIdentities: [],
    } as never);
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({
      challenge: 'email-register-challenge',
      user: { name: user.email },
      excludeCredentials: [],
    });
    passkeyChallengeStore.issue.mockResolvedValue('request-2');

    const result = await service.verifyCodeForRegistration({
      email: user.email,
      code: '123456',
    });

    expect(emailAuthVerificationService.verifyEmailCode).toHaveBeenCalledWith({
      email: user.email,
      code: '123456',
    });
    expect(result.requestId).toBe('request-2');
    expect(result.options.challenge).toBe('email-register-challenge');
  });

  it('completes passkey registration and stores the credential', async () => {
    const user = {
      id: 'user-3',
      email: 'passkey@focoris.local',
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userIdentities: [],
    };
    const createdIdentity = {
      id: 'identity-3',
      provider: AuthProvider.passkey,
      providerUserId: user.id,
      email: user.email,
      emailVerified: true,
      displayName: null,
      passwordHash: null,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const challenge: StoredPasskeyChallenge = {
      flow: PasskeyChallengeFlow.Register,
      userId: user.id,
      email: user.email,
      challenge: 'register-challenge',
    };
    const credential = {
      id: 'credential-3',
      rawId: 'credential-3',
      response: {
        clientDataJSON: 'YQ',
        attestationObject: 'YQ',
      },
      clientExtensionResults: {},
      type: 'public-key',
    } as unknown as RegistrationResponseJSON;
    const loginResponse = {
      user: {
        id: user.id,
        email: user.email,
        roles: [],
      },
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer' as const,
        expiresInSeconds: 900,
      },
    };

    passkeyChallengeStore.consume.mockResolvedValue(challenge);
    prisma.user.findUnique.mockResolvedValue(user as never);
    prisma.userIdentity.findUnique.mockResolvedValue(null as never);
    prisma.userIdentity.create.mockResolvedValue(createdIdentity as never);
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'credential-3',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 1,
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    });
    tokenService.login.mockResolvedValue(loginResponse);

    const result = await service.finishRegistration({
      requestId: 'request-3',
      credential,
    });

    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: 'register-challenge',
        expectedOrigin: ['http://localhost:3001'],
        expectedRPID: 'localhost',
      }),
    );
    expect(prisma.userIdentity.create).toHaveBeenCalledWith({
      data: {
        provider: AuthProvider.passkey,
        providerUserId: user.id,
        email: user.email,
        emailVerified: true,
        userId: user.id,
      },
    });
    expect(prisma.passkeyCredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userIdentityId: 'identity-3',
        credentialId: 'credential-3',
        counter: 1,
        deviceType: 'singleDevice',
        backedUp: false,
      }),
    });
    expect(result).toBe(loginResponse);
  });

  it('completes passkey login and updates the credential counter', async () => {
    const challenge: StoredPasskeyChallenge = {
      flow: PasskeyChallengeFlow.Login,
      challenge: 'login-challenge',
    };
    const storedCredential = {
      id: 'pk-4',
      credentialId: 'credential-4',
      publicKey: Buffer.from([1, 2, 3]),
      counter: 5,
      transports: ['internal'],
      userIdentityId: 'identity-4',
      deviceType: null,
      backedUp: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userIdentity: {
        id: 'identity-4',
        provider: AuthProvider.passkey,
        providerUserId: 'user-4',
        email: 'user4@focoris.local',
        emailVerified: true,
        displayName: null,
        passwordHash: null,
        userId: 'user-4',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-4',
          email: 'user4@focoris.local',
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    };
    const loginResponse = {
      user: {
        id: 'user-4',
        email: 'user4@focoris.local',
        roles: [],
      },
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer' as const,
        expiresInSeconds: 900,
      },
    };
    passkeyChallengeStore.consume.mockResolvedValue(challenge);
    prisma.passkeyCredential.findUnique.mockResolvedValue(storedCredential as never);
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 6,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    });
    tokenService.login.mockResolvedValue(loginResponse);

    const result = await service.finishLogin({
      requestId: 'request-4',
      credential: {
        id: 'credential-4',
        rawId: 'credential-4',
        response: {
          clientDataJSON: 'YQ',
          authenticatorData: 'YQ',
          signature: 'YQ',
        },
        clientExtensionResults: {},
        type: 'public-key',
      } as unknown as AuthenticationResponseJSON,
    });

    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: 'login-challenge',
        expectedOrigin: ['http://localhost:3001'],
        expectedRPID: 'localhost',
      }),
    );
    expect(prisma.passkeyCredential.update).toHaveBeenCalledWith({
      where: { id: 'pk-4' },
      data: {
        counter: 6,
        deviceType: 'singleDevice',
        backedUp: false,
      },
    });
    expect(result).toBe(loginResponse);
  });

  it('rejects passkey login when the credential is unknown', async () => {
    passkeyChallengeStore.consume.mockResolvedValue({
      flow: PasskeyChallengeFlow.Login,
      challenge: 'login-challenge',
    });
    prisma.passkeyCredential.findUnique.mockResolvedValue(null as never);

    await expect(
      service.finishLogin({
        requestId: 'request-5',
        credential: {
          id: 'missing-credential',
          rawId: 'missing-credential',
          response: {
            clientDataJSON: 'YQ',
            authenticatorData: 'YQ',
            signature: 'YQ',
          },
          clientExtensionResults: {},
          type: 'public-key',
        } as unknown as AuthenticationResponseJSON,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
