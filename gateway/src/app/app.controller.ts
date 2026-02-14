import { All, Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ProxyService } from '../proxy/proxy.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private proxyService: ProxyService,
    private configService: ConfigService,
  ) {}

  private authTarget = this.configService.getOrThrow<string>('AUTH_API_URL');
  private coreTarget =
    this.configService.getOrThrow<string>('SKILL_BOOK_API_URL');

  @Get('health')
  health() {
    return { status: 'ok', service: 'gateway' };
  }

  @All(['auth', 'auth/*path'])
  auth(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace(/^\/api\/auth/, '/api');
    return this.proxyService.forwardRequest(this.authTarget, req, res);
  }

  @All(['skill-book', 'skill-book/*path'])
  core(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace(/^\/api\/skill-book/, '/api');
    return this.proxyService.forwardRequest(this.coreTarget, req, res);
  }
}
