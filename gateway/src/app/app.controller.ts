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
  ///1213
  health() {
    return { status: 'ok', service: 'gateway' };
  }

  @All('auth/*path')
  auth(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace(/^\/auth/, '');
    return this.proxyService.forwardRequest(this.authTarget, req, res);
  }

  @All('skill-book/*path')
  core(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace(/^\/skill-book/, '');
    return this.proxyService.forwardRequest(this.coreTarget, req, res);
  }
}
