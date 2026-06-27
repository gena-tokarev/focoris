import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import type { StoredExternalAuthCode } from './external-auth.types';

const CODE_KEY_PREFIX = 'auth:external-auth:code:';

@Injectable()
export class ExternalAuthCodeStore {
  constructor(private readonly redisService: RedisService) {}

  async create(
    input: StoredExternalAuthCode,
    ttlSeconds: number,
  ): Promise<string> {
    const code = randomUUID();
    await this.redisService
      .getClient()
      .set(this.getCodeKey(code), JSON.stringify(input), { EX: ttlSeconds });

    return code;
  }

  async consume(code: string): Promise<StoredExternalAuthCode | null> {
    const payload = await this.redisService.getClient().getDel(this.getCodeKey(code));

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as StoredExternalAuthCode;
  }

  private getCodeKey(code: string): string {
    return `${CODE_KEY_PREFIX}${code}`;
  }
}
