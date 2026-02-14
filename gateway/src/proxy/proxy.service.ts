import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { createProxyServer } from 'http-proxy';

@Injectable()
export class ProxyService {
  private proxy = createProxyServer({});

  constructor() {
    this.proxy.on('proxyReq', (proxyReq, req) => {
      const contentType = req.headers['content-type'] ?? '';
      const body = (req as any).body;

      if (!body) return;

      if (contentType.includes('application/json')) {
        const bodyData = JSON.stringify(body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    });

    this.proxy.on('error', (_err, _req, res: any) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Bad gateway' }));
    });
  }

  async forwardRequest(targetUrl: string, req: Request, res: Response) {
    const options = {
      target: targetUrl,
      changeOrigin: true,
      ignorePath: false,
    };

    this.proxy.web(req, res, options);
  }
}
