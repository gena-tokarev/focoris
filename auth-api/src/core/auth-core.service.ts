import { ConflictException, Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IdentityService } from '../modules/identity/identity.service';
import type { IdentityUser } from '../modules/identity/identity.types';
import { TokenService } from '../modules/token/token.service';
import {
  AuthErrorCode,
  AuthErrorResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';

export type AuthenticatedUser = IdentityUser;

@Injectable()
export class AuthCoreService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly tokenService: TokenService,
  ) {}

  async login(user: AuthenticatedUser): Promise<LoginResponseDto> {
    return this.tokenService.login(user);
  }

  async register(payload: RegisterRequestDto): Promise<RegisterResponseDto> {
    const email = this.identityService.normalizeEmail(payload.email);
    const existingLocalUser = await this.identityService.findUserByIdentity(
      AuthProvider.local,
      email,
    );

    if (existingLocalUser) {
      throw new ConflictException({
        statusCode: 409,
        code: AuthErrorCode.EmailAlreadyTaken,
        message: 'Email is already taken',
      } satisfies AuthErrorResponseDto);
    }

    const passwordHash = bcrypt.hashSync(payload.password, 10);
    const user = await this.identityService.createUserWithIdentity({
      email,
      identity: {
        provider: AuthProvider.local,
        providerUserId: email,
        email,
        emailVerified: false,
        passwordHash,
      },
    });

    return this.tokenService.login(user);
  }

  async refresh(payload: RefreshRequestDto): Promise<RefreshResponseDto> {
    return this.tokenService.refresh(payload);
  }

  async logout(payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.tokenService.logout(payload);
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.identityService.findUserById(userId);

    return {
      user: this.identityService.toAuthUser(user),
    };
  }
}
