import axios from 'axios';
import { cleanupAuthFixtureUsers } from '../support/fixtures';

const PASSKEY_FIXTURE_PREFIX = 'e2e-passkey';

describe('Passkey Auth API flow', () => {
  beforeEach(async () => {
    await cleanupAuthFixtureUsers(PASSKEY_FIXTURE_PREFIX);
  });

  afterAll(async () => {
    await cleanupAuthFixtureUsers(PASSKEY_FIXTURE_PREFIX);
  });

  it('should start passkey login without requiring an email', async () => {
    const response = await axios.post('/api/auth/passkey/login/start', {});

    expect(response.status).toBe(201);
    expect(response.data.requestId).toEqual(expect.any(String));
    expect(response.data.options.challenge).toEqual(expect.any(String));
    expect(response.data.options.rpId).toBe('localhost');
    expect(response.data.options.allowCredentials).toBeUndefined();
  });

  it('should bootstrap passkey registration from email code', async () => {
    const email = `${PASSKEY_FIXTURE_PREFIX}+${Date.now()}+code@focoris.local`;

    const request = await axios.post('/api/auth/email/request', { email });

    expect(request.status).toBe(201);
    expect(request.data.dev.code).toMatch(/^\d{6}$/);

    const verify = await axios.post('/api/auth/passkey/register/verify-code', {
      email,
      code: request.data.dev.code,
    });

    expect(verify.status).toBe(201);
    expect(verify.data.requestId).toEqual(expect.any(String));
    expect(verify.data.options.challenge).toEqual(expect.any(String));
    expect(verify.data.options.user.name).toBe(email);
    expect(verify.data.options.excludeCredentials).toEqual([]);
  });

  it('should bootstrap passkey registration from magic link token', async () => {
    const email = `${PASSKEY_FIXTURE_PREFIX}+${Date.now()}+link@focoris.local`;

    const request = await axios.post('/api/auth/email/request', { email });

    expect(request.status).toBe(201);
    expect(request.data.dev.magicLinkToken).toEqual(expect.any(String));

    const verify = await axios.get('/api/auth/passkey/register/verify-link', {
      params: {
        token: request.data.dev.magicLinkToken,
      },
    });

    expect(verify.status).toBe(200);
    expect(verify.data.requestId).toEqual(expect.any(String));
    expect(verify.data.options.challenge).toEqual(expect.any(String));
    expect(verify.data.options.user.name).toBe(email);
    expect(verify.data.options.excludeCredentials).toEqual([]);
  });

  it('should require auth for authenticated passkey register start', async () => {
    const withoutToken = await axios.post(
      '/api/auth/passkey/register/start',
      {},
      { validateStatus: () => true },
    );

    expect(withoutToken.status).toBe(401);
    expect(withoutToken.data.code).toBe('AUTH_MISSING_BEARER_TOKEN');

    const email = `${PASSKEY_FIXTURE_PREFIX}+${Date.now()}+auth@focoris.local`;
    const request = await axios.post('/api/auth/email/request', { email });
    const login = await axios.post('/api/auth/email/verify-code', {
      email,
      code: request.data.dev.code,
    });

    const withToken = await axios.post(
      '/api/auth/passkey/register/start',
      {},
      {
        headers: {
          authorization: `Bearer ${login.data.tokens.accessToken as string}`,
        },
      },
    );

    expect(withToken.status).toBe(201);
    expect(withToken.data.requestId).toEqual(expect.any(String));
    expect(withToken.data.options.challenge).toEqual(expect.any(String));
    expect(withToken.data.options.user.name).toBe(email);
  });

  it('should reject invalid passkey request ids on finish endpoints', async () => {
    const invalidAuthenticationCredential = {
      id: 'invalid-credential-id',
      rawId: 'invalid-credential-id',
      response: {
        clientDataJSON: 'YQ',
        authenticatorData: 'YQ',
        signature: 'YQ',
      },
      clientExtensionResults: {},
      type: 'public-key',
    };
    const invalidRegistrationCredential = {
      id: 'invalid-credential-id',
      rawId: 'invalid-credential-id',
      response: {
        clientDataJSON: 'YQ',
        attestationObject: 'YQ',
      },
      clientExtensionResults: {},
      type: 'public-key',
    };

    const loginFinish = await axios.post(
      '/api/auth/passkey/login/finish',
      {
        requestId: 'missing-request-id',
        credential: invalidAuthenticationCredential,
      },
      { validateStatus: () => true },
    );

    expect([400, 401]).toContain(loginFinish.status);
    if (loginFinish.status === 401) {
      expect(loginFinish.data.code).toBe('AUTH_INVALID_PASSKEY_REQUEST');
    }

    const registerFinish = await axios.post(
      '/api/auth/passkey/register/finish',
      {
        requestId: 'missing-request-id',
        credential: invalidRegistrationCredential,
      },
      { validateStatus: () => true },
    );

    expect([400, 401]).toContain(registerFinish.status);
    if (registerFinish.status === 401) {
      expect(registerFinish.data.code).toBe('AUTH_INVALID_PASSKEY_REQUEST');
    }
  });
});
