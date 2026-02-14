import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import type {
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginRequestDto): LoginResponseDto {
    try {
      return this.authService.login(payload);
    } catch {
      throw new NotImplementedException('Auth login is not implemented yet');
    }
  }

  @Post('refresh')
  refresh(@Body() payload: RefreshRequestDto): RefreshResponseDto {
    try {
      return this.authService.refresh(payload);
    } catch {
      throw new NotImplementedException('Auth refresh is not implemented yet');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() payload: LogoutRequestDto): LogoutResponseDto {
    try {
      return this.authService.logout(payload);
    } catch {
      throw new NotImplementedException('Auth logout is not implemented yet');
    }
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string): MeResponseDto {
    const accessToken = this.extractBearerToken(authorization);
    try {
      return this.authService.me(accessToken);
    } catch {
      throw new NotImplementedException('Auth me is not implemented yet');
    }
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }
    return token;
  }
}
