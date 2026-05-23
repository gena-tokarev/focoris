import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAccessGuard } from '@focoris/auth-nest';
import type { AuthJwtPayload } from '@focoris/auth-nest';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'skillbook-api' };
  }

  @UseGuards(JwtAccessGuard)
  @Get('secure')
  secure(@CurrentUser() user: AuthJwtPayload) {
    return {
      status: 'ok',
      service: 'skillbook-api',
      user: {
        id: user.sub,
        email: user.email,
        roles: user.roles,
      },
    };
  }
}
