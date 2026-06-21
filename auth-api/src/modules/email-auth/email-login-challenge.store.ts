import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

interface ReplaceEmailLoginChallengeInput {
  email: string;
  codeHash: string;
  linkTokenHash: string;
  ttlSeconds: number;
}

interface StoredEmailLoginChallenge {
  email: string;
  codeHash: string;
  linkTokenHash: string;
}

const CHALLENGE_KEY_PREFIX = 'auth:email-login:challenge:';
const EMAIL_CODE_KEY_PREFIX = 'auth:email-login:email-code:';
const TOKEN_KEY_PREFIX = 'auth:email-login:token:';

@Injectable()
export class EmailLoginChallengeStore {
  constructor(private readonly redisService: RedisService) {}

  async replace(input: ReplaceEmailLoginChallengeInput): Promise<void> {
    const client = this.redisService.getClient();
    const emailCodeKey = this.getEmailCodeKey(input.email, input.codeHash);
    const existingChallengeId = await client.get(emailCodeKey);

    if (existingChallengeId) {
      await this.deleteChallengeById(existingChallengeId);
    }

    const challengeId = randomUUID();
    const challenge: StoredEmailLoginChallenge = {
      email: input.email,
      codeHash: input.codeHash,
      linkTokenHash: input.linkTokenHash,
    };

    const multi = client.multi();
    multi.set(this.getChallengeKey(challengeId), JSON.stringify(challenge), {
      EX: input.ttlSeconds,
    });
    multi.set(emailCodeKey, challengeId, {EX: input.ttlSeconds});
    multi.set(this.getTokenKey(input.linkTokenHash), challengeId, {
      EX: input.ttlSeconds,
    });
    await multi.exec();
  }

  async consumeByCode(email: string, codeHash: string): Promise<string | null> {
    const client = this.redisService.getClient();
    const challengeId = await client.get(this.getEmailCodeKey(email, codeHash));

    if (!challengeId) {
      return null;
    }

    const challenge = await this.consumeChallengeById(challengeId);

    if (!challenge || challenge.email !== email || challenge.codeHash !== codeHash) {
      return null;
    }

    await this.deleteLookupKeys(challenge);

    return challenge.email;
  }

  async consumeByLinkToken(linkTokenHash: string): Promise<string | null> {
    const client = this.redisService.getClient();
    const challengeId = await client.get(this.getTokenKey(linkTokenHash));

    if (!challengeId) {
      return null;
    }

    const challenge = await this.consumeChallengeById(challengeId);

    if (!challenge || challenge.linkTokenHash !== linkTokenHash) {
      return null;
    }

    await this.deleteLookupKeys(challenge);

    return challenge.email;
  }

  private async consumeChallengeById(
    challengeId: string,
  ): Promise<StoredEmailLoginChallenge | null> {
    const client = this.redisService.getClient();
    const payload = await client.getDel(this.getChallengeKey(challengeId));

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as StoredEmailLoginChallenge;
  }

  private async deleteChallengeById(challengeId: string): Promise<void> {
    const client = this.redisService.getClient();
    const payload = await client.getDel(this.getChallengeKey(challengeId));

    if (!payload) {
      return;
    }

    const challenge = JSON.parse(payload) as StoredEmailLoginChallenge;
    await this.deleteLookupKeys(challenge);
  }

  private async deleteLookupKeys(
    challenge: StoredEmailLoginChallenge,
  ): Promise<void> {
    const client = this.redisService.getClient();
    await client.del([
      this.getEmailCodeKey(challenge.email, challenge.codeHash),
      this.getTokenKey(challenge.linkTokenHash),
    ]);
  }

  private getChallengeKey(challengeId: string): string {
    return `${CHALLENGE_KEY_PREFIX}${challengeId}`;
  }

  private getEmailCodeKey(email: string, codeHash: string): string {
    return `${EMAIL_CODE_KEY_PREFIX}${email}:${codeHash}`;
  }

  private getTokenKey(linkTokenHash: string): string {
    return `${TOKEN_KEY_PREFIX}${linkTokenHash}`;
  }
}
