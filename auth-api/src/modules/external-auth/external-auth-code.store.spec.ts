import { ExternalAuthCodeStore } from './external-auth-code.store';
import type { RedisService } from '../../common/redis/redis.service';

describe('ExternalAuthCodeStore', () => {
  let payloadByKey: Map<string, string>;
  let store: ExternalAuthCodeStore;

  beforeEach(() => {
    payloadByKey = new Map<string, string>();

    store = new ExternalAuthCodeStore({
      getClient: jest.fn(() => ({
        set: jest.fn(async (key: string, value: string) => {
          payloadByKey.set(key, value);
        }),
        getDel: jest.fn(async (key: string) => {
          const value = payloadByKey.get(key) ?? null;
          payloadByKey.delete(key);
          return value;
        }),
      })),
    } as unknown as RedisService);
  });

  it('stores and consumes a one-time code exactly once', async () => {
    const code = await store.create(
      {
        userId: 'user-1',
        redirectUri: 'http://localhost:3000/auth/callback',
        platform: 'web',
      },
      300,
    );

    await expect(store.consume(code)).resolves.toEqual({
      userId: 'user-1',
      redirectUri: 'http://localhost:3000/auth/callback',
      platform: 'web',
    });
    await expect(store.consume(code)).resolves.toBeNull();
  });

  it('returns null for an unknown code', async () => {
    await expect(store.consume('missing-code')).resolves.toBeNull();
  });
});
