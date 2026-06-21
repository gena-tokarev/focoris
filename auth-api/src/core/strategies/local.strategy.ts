import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Strategy } from 'passport-local';
import { IdentityService } from '../../modules/identity/identity.service';
import type { IdentityUser } from '../../modules/identity/identity.types';
import { AuthErrorCode, AuthErrorResponseDto } from '../dto/auth-response.dto';
import { LoginRequestDto } from '../dto/login-request.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly identityService: IdentityService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<IdentityUser> {
    const payload = plainToInstance(LoginRequestDto, { email, password });
    const errors = validateSync(payload);

    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'email and password are required',
      } satisfies AuthErrorResponseDto);
    }

    const user = await this.identityService.validateUserCredentials(
      email,
      password,
    );

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.InvalidCredentials,
        message: 'Invalid credentials',
      } satisfies AuthErrorResponseDto);
    }

    return user;
  }
}
