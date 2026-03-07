import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { AuthErrorCode } from './dto/auth-response.dto';
import type {
  AuthErrorResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(payload);
  }

  @Post('refresh')
  refresh(@Body() payload: RefreshRequestDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(payload);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.authService.logout(payload);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string): Promise<MeResponseDto> {
    const accessToken = this.extractBearerToken(authorization);
    return this.authService.me(accessToken);
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: AuthErrorCode.MissingBearerToken,
        message: 'Missing or invalid bearer token',
      } satisfies AuthErrorResponseDto);
    }
    return token;
  }
}
