import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Roles, RolesGuard } from '@focoris/auth-nest';
import type { AuthJwtPayload } from '@focoris/auth-nest';
import { AuthCoreService } from './auth-core.service';
import {
  AuthTokenPairDto,
  LogoutResponseDto,
  MeResponseDto,
  UserRole,
} from './dto/auth-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthSessionService } from '../modules/session/session.service';
import { AuthLogoutInterceptor } from '../modules/session/interceptors/auth-logout.interceptor';
import { AuthRefreshInterceptor } from '../modules/session/interceptors/auth-refresh.interceptor';
import type { AuthRequestLike } from '../modules/session/session.types';

@Controller('auth')
export class AuthCoreController {
  constructor(
    private readonly authCoreService: AuthCoreService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Post('refresh')
  @UseInterceptors(AuthRefreshInterceptor)
  refresh(
    @Body() payload: RefreshRequestDto,
    @Req() request: AuthRequestLike,
  ): Promise<AuthTokenPairDto> {
    return this.authCoreService.refresh({
      refreshToken: this.authSessionService.getRefreshTokenFromRequest(
        request,
        payload?.refreshToken,
      ),
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthLogoutInterceptor)
  logout(
    @Body() payload: LogoutRequestDto,
    @Req() request: AuthRequestLike,
  ): Promise<LogoutResponseDto> {
    return this.authCoreService.logout({
      refreshToken: this.authSessionService.getRefreshTokenFromRequest(
        request,
        payload?.refreshToken,
      ),
    });
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
