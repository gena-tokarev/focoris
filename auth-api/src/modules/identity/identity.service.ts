import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, UserRole, type ExternalIdentity } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
  AuthUserDto,
} from '../../core/dto/auth-response.dto';
import type {
  CreateUserWithIdentityInput,
  IdentityUser,
} from './identity.types';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUserCredentials(
    email?: string,
    password?: string,
  ): Promise<IdentityUser | null> {
    if (!email || !password) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'email and password are required',
      } satisfies AuthErrorResponseDto);
    }

    const normalizedEmail = this.normalizeEmail(email);
    const identity = await this.findIdentityWithUser(
      AuthProvider.local,
      normalizedEmail,
    );
    const isPasswordValid =
      !!identity?.passwordHash &&
      bcrypt.compareSync(password, identity.passwordHash);

    if (!identity?.user || !isPasswordValid) {
      return null;
    }

    return identity.user;
  }

  async findUserByIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<IdentityUser | null> {
    const identity = await this.findIdentityWithUser(provider, providerUserId);

    return identity?.user ?? null;
  }

  async findUserById(userId: string): Promise<IdentityUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidAccessToken,
        message: 'Invalid access token',
      } satisfies AuthErrorResponseDto);
    }

    return user;
  }

  async createUserWithIdentity(
    input: CreateUserWithIdentityInput,
  ): Promise<IdentityUser> {
    const email = this.normalizeEmail(input.email);
    const providerUserId = input.identity.providerUserId.trim();

    return this.prisma.user.create({
      data: {
        email,
        roles: input.roles ?? [UserRole.member],
        externalIdentities: {
          create: {
            provider: input.identity.provider,
            providerUserId,
            email: this.normalizeEmail(input.identity.email),
            emailVerified: input.identity.emailVerified ?? false,
            displayName: input.identity.displayName ?? undefined,
            passwordHash: input.identity.passwordHash ?? undefined,
          },
        },
      },
    });
  }

  toAuthUser(user: IdentityUser): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }

  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private findIdentityWithUser(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<(ExternalIdentity & { user: IdentityUser | null }) | null> {
    return this.prisma.externalIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: providerUserId.trim(),
        },
      },
      include: { user: true },
    });
  }
}
