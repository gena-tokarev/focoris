import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { UserRole } from './dto/auth-response.dto';
import type {
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { CurrentUser, Roles, RolesGuard } from '@focoris/auth-nest';
import type { AuthJwtPayload } from '@focoris/auth-nest';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthJwtPayload): Promise<MeResponseDto> {
    return this.authService.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('test')
  test() {
    return { status: 'ok', message: 'This is a test endpoint 3' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Get('admin/health')
  adminHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
