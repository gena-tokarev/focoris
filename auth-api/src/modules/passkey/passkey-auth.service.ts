import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthProvider,
  type PasskeyCredential,
  type Prisma,
  type UserIdentity,
} from '@prisma/client';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import type { AppEnv } from '../../config/config.validation';
import {
  AuthErrorCode,
  type AuthErrorResponseDto,
} from '../../core/dto/auth-response.dto';
import { VerifyEmailCodeDto } from '../../core/dto/verify-email-code.dto';
import { VerifyMagicLinkDto } from '../../core/dto/verify-magic-link.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailAuthVerificationService } from '../email-auth/email-auth-verification.service';
import { TokenService } from '../token/token.service';
import type { IdentityUser } from '../identity/identity.types';
import type { PasskeyFinishRequestDto } from './dto/passkey-finish.dto';
import type { PasskeyLoginStartResponseDto } from './dto/passkey-login-start.dto';
import type { PasskeyRegisterStartResponseDto } from './dto/passkey-register-start.dto';
import {
  PasskeyChallengeFlow,
  PasskeyChallengeStore,
  type StoredPasskeyChallenge,
} from './passkey-challenge.store';
import type { AuthenticatedSession } from '../session/session.types';

type UserWithPasskeys = Prisma.UserGetPayload<{
  include: {
    userIdentities: {
      include: {
        passkeyCredentials: true;
      };
    };
  };
}>;

@Injectable()
export class PasskeyAuthService {
  private static readonly PASSKEY_REQUEST_TTL_SECONDS = 5 * 60;

  private readonly rpId: string;
  private readonly rpName: string;
  private readonly allowedOrigins: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailAuthVerificationService: EmailAuthVerificationService,
    private readonly tokenService: TokenService,
    private readonly passkeyChallengeStore: PasskeyChallengeStore,
    configService: ConfigService<AppEnv, true>,
  ) {
    this.rpId = configService.getOrThrow('PASSKEY_RP_ID');
    this.rpName = configService.getOrThrow('PASSKEY_RP_NAME');
    this.allowedOrigins = configService
      .getOrThrow('PASSKEY_ALLOWED_ORIGINS')
      .split(',')
      .map((origin: string) => origin.trim())
      .filter(Boolean);
  }

  async startLogin(): Promise<PasskeyLoginStartResponseDto> {
    const options = await this.createAuthenticationOptions();
    const requestId = await this.passkeyChallengeStore.issue({
      flow: PasskeyChallengeFlow.Login,
      challenge: options.challenge,
      ttlSeconds: PasskeyAuthService.PASSKEY_REQUEST_TTL_SECONDS,
    });

    return { requestId, options };
  }

  async finishLogin(
    payload: PasskeyFinishRequestDto,
  ): Promise<AuthenticatedSession> {
    const challenge = await this.passkeyChallengeStore.consume(
      payload.requestId,
    );

    if (!challenge || challenge.flow !== PasskeyChallengeFlow.Login) {
      throw this.createInvalidPasskeyRequestError();
    }

    return this.completeLogin(
      payload.credential as unknown as AuthenticationResponseJSON,
      challenge,
    );
  }

  async verifyCodeForRegistration(
    payload: VerifyEmailCodeDto,
  ): Promise<PasskeyRegisterStartResponseDto> {
    const user = await this.emailAuthVerificationService.verifyEmailCode(
      payload,
    );
    return this.createRegistrationChallenge(user);
  }

  async verifyLinkForRegistration(
    payload: VerifyMagicLinkDto,
  ): Promise<PasskeyRegisterStartResponseDto> {
    const user = await this.emailAuthVerificationService.verifyMagicLink(
      payload,
    );
    return this.createRegistrationChallenge(user);
  }

  async startRegistration(
    accessToken?: string,
  ): Promise<PasskeyRegisterStartResponseDto> {
    const user = await this.requireAuthenticatedUser(accessToken);
    return this.createRegistrationChallenge(user);
  }

  async finishRegistration(
    payload: PasskeyFinishRequestDto,
  ): Promise<AuthenticatedSession> {
    const challenge = await this.passkeyChallengeStore.consume(
      payload.requestId,
    );

    if (
      !challenge ||
      challenge.flow !== PasskeyChallengeFlow.Register ||
      !challenge.userId
    ) {
      throw this.createInvalidPasskeyRequestError();
    }

    return this.completeRegistration(
      payload.credential as unknown as RegistrationResponseJSON,
      challenge,
    );
  }

  private async completeLogin(
    credential: AuthenticationResponseJSON,
    challenge: StoredPasskeyChallenge,
  ): Promise<AuthenticatedSession> {
    const storedCredential = await this.prisma.passkeyCredential.findUnique({
      where: { credentialId: credential.id },
      include: {
        userIdentity: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!storedCredential) {
      throw this.createInvalidPasskeyRequestError();
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.allowedOrigins,
      expectedRPID: this.rpId,
      credential: this.toWebAuthnCredential(storedCredential),
    });

    if (!verification.verified) {
      throw this.createInvalidPasskeyRequestError();
    }

    await this.prisma.passkeyCredential.update({
      where: { id: storedCredential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        deviceType: verification.authenticationInfo.credentialDeviceType,
        backedUp: verification.authenticationInfo.credentialBackedUp,
      },
    });

    return this.tokenService.login(storedCredential.userIdentity.user);
  }

  private async completeRegistration(
    credential: RegistrationResponseJSON,
    challenge: StoredPasskeyChallenge,
  ): Promise<AuthenticatedSession> {
    const user = await this.findUserById(challenge.userId!);

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: this.allowedOrigins,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw this.createInvalidPasskeyRequestError();
    }

    const passkeyIdentity = await this.ensurePasskeyIdentity(user);
    const transports = this.getRegistrationTransports(credential);

    await this.prisma.passkeyCredential.create({
      data: {
        userIdentityId: passkeyIdentity.id,
        credentialId: verification.registrationInfo.credential.id,
        publicKey: Buffer.from(
          verification.registrationInfo.credential.publicKey,
        ),
        counter: verification.registrationInfo.credential.counter,
        transports,
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
      },
    });

    return this.tokenService.login(user);
  }

  private async createRegistrationChallenge(
    user: IdentityUser,
  ): Promise<PasskeyRegisterStartResponseDto> {
    const userWithPasskeys = await this.findUserById(user.id);
    const options = await this.createRegistrationOptions(userWithPasskeys);
    const requestId = await this.passkeyChallengeStore.issue({
      flow: PasskeyChallengeFlow.Register,
      userId: user.id,
      email: user.email,
      challenge: options.challenge,
      ttlSeconds: PasskeyAuthService.PASSKEY_REQUEST_TTL_SECONDS,
    });

    return { requestId, options };
  }

  private async requireAuthenticatedUser(
    accessToken?: string,
  ): Promise<IdentityUser> {
    if (!accessToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.MissingBearerToken,
        message: 'Missing bearer token',
      } satisfies AuthErrorResponseDto);
    }

    const authUser = await this.tokenService.getUserForAccessToken(accessToken);

    if (!authUser) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidAccessToken,
        message: 'Invalid access token',
      } satisfies AuthErrorResponseDto);
    }

    return authUser;
  }

  private async ensurePasskeyIdentity(
    user: IdentityUser,
  ): Promise<UserIdentity> {
    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.passkey,
          providerUserId: user.id,
        },
      },
    });

    if (existingIdentity) {
      return existingIdentity;
    }

    return this.prisma.userIdentity.create({
      data: {
        provider: AuthProvider.passkey,
        providerUserId: user.id,
        email: user.email,
        emailVerified: true,
        userId: user.id,
      },
    });
  }

  private async createRegistrationOptions(
    user: UserWithPasskeys,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return generateRegistrationOptions({
      rpID: this.rpId,
      rpName: this.rpName,
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials: this.getPasskeyCredentials(user).map(
        (credential) => ({
          id: credential.credentialId,
          type: 'public-key',
          transports: this.toAuthenticatorTransports(credential.transports),
        }),
      ),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  private async createAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
    });
  }

  private async findUserById(userId: string): Promise<UserWithPasskeys> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userIdentities: {
          include: {
            passkeyCredentials: true,
          },
        },
      },
    });

    if (!user) {
      throw this.createInvalidPasskeyRequestError();
    }

    return user;
  }

  private getPasskeyCredentials(user: UserWithPasskeys): PasskeyCredential[] {
    return user.userIdentities.flatMap((identity) =>
      identity.provider === AuthProvider.passkey
        ? identity.passkeyCredentials
        : [],
    );
  }

  private toWebAuthnCredential(
    credential: PasskeyCredential,
  ): WebAuthnCredential {
    return {
      id: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: credential.counter,
      transports: this.toAuthenticatorTransports(credential.transports),
    };
  }

  private toAuthenticatorTransports(
    transports: string[],
  ): AuthenticatorTransportFuture[] | undefined {
    return transports.length > 0
      ? (transports as AuthenticatorTransportFuture[])
      : undefined;
  }

  private getRegistrationTransports(
    credential: RegistrationResponseJSON,
  ): string[] {
    return credential.response.transports?.map((transport) => transport) ?? [];
  }

  private createInvalidPasskeyRequestError(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: AuthErrorCode.InvalidPasskeyRequest,
      message: 'Invalid or expired passkey request',
    } satisfies AuthErrorResponseDto);
  }
}
