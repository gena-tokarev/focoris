import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Roles, RolesGuard } from '@focoris/auth-nest';
import type { AuthJwtPayload } from '@focoris/auth-nest';
import { AuthCoreService, type AuthenticatedUser } from './auth-core.service';
import {
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
  UserRole,
} from './dto/auth-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthCoreController {
  constructor(private readonly authCoreService: AuthCoreService) {}

  @Post('register')
  register(@Body() payload: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.authCoreService.register(payload);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Req() request: { user: AuthenticatedUser },
  ): Promise<LoginResponseDto> {
    return this.authCoreService.login(request.user);
  }

  @Post('refresh')
  refresh(@Body() payload: RefreshRequestDto): Promise<RefreshResponseDto> {
    return this.authCoreService.refresh(payload);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.authCoreService.logout(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthJwtPayload): Promise<MeResponseDto> {
    return this.authCoreService.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('test')
  test() {
    return { status: 'ok', message: 'This is a test endpoint' };
  }

  @Get('test2')
  test2() {
    return { status: 'ok', message: 'This is a test endpoint 3' };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Get('test3')
  test3(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Get('admin/health')
  adminHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
