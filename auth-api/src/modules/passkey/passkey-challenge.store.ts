import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export enum PasskeyChallengeFlow {
  Login = 'login',
  Register = 'register',
}

export interface StoredPasskeyChallenge {
  flow: PasskeyChallengeFlow;
  challenge: string;
  userId?: string;
  email?: string;
}

interface IssuePasskeyChallengeInput extends StoredPasskeyChallenge {
  ttlSeconds: number;
}

const REQUEST_KEY_PREFIX = 'auth:passkey:request:';

@Injectable()
export class PasskeyChallengeStore {
  constructor(private readonly redisService: RedisService) {}

  async issue(input: IssuePasskeyChallengeInput): Promise<string> {
    const requestId = randomUUID();
    await this.redisService
      .getClient()
      .set(this.getRequestKey(requestId), JSON.stringify(input), {
        EX: input.ttlSeconds,
      });

    return requestId;
  }

  async consume(requestId: string): Promise<StoredPasskeyChallenge | null> {
    const payload = await this.redisService
      .getClient()
      .getDel(this.getRequestKey(requestId.trim()));

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as StoredPasskeyChallenge;
  }

  private getRequestKey(requestId: string): string {
    return `${REQUEST_KEY_PREFIX}${requestId}`;
  }
}
