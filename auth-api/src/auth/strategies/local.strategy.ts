import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService, AuthenticatedUser } from '../auth.service';
import { AuthErrorCode, AuthErrorResponseDto } from '../dto/auth-response.dto';
import { LoginRequestDto } from '../dto/login-request.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const payload = plainToInstance(LoginRequestDto, { email, password });
    const errors = validateSync(payload);

    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: AuthErrorCode.InvalidCredentials,
        message: 'email and password are required',
      } satisfies AuthErrorResponseDto);
    }

    const user = await this.authService.validateUserCredentials(
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
