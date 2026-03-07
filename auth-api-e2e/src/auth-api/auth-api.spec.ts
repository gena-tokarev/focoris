import axios from 'axios';
import {
  cleanupAuthFixtureUsers,
  createAuthFixtureUser,
  disconnectFixtures,
} from '../support/fixtures';

describe('Auth API flow', () => {
  beforeEach(async () => {
    await cleanupAuthFixtureUsers();
  });

  afterAll(async () => {
    await cleanupAuthFixtureUsers();
    await disconnectFixtures();
  });

  it('should login, return profile, rotate refresh token, and reject revoked refresh token', async () => {
    const fixtureUser = await createAuthFixtureUser();

    const login = await axios.post('/api/auth/login', {
      email: fixtureUser.email,
      password: fixtureUser.password,
    });

    expect(login.status).toBe(201);
    expect(login.data.user.email).toBe(fixtureUser.email);
    expect(login.data.tokens.accessToken).toEqual(expect.any(String));
    expect(login.data.tokens.refreshToken).toEqual(expect.any(String));

    const accessToken = login.data.tokens.accessToken as string;
    const initialRefreshToken = login.data.tokens.refreshToken as string;

    const me = await axios.get('/api/auth/me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(me.status).toBe(200);
    expect(me.data.user.email).toBe(fixtureUser.email);

    const refreshed = await axios.post('/api/auth/refresh', {
      refreshToken: initialRefreshToken,
    });

    expect(refreshed.status).toBe(201);
    expect(refreshed.data.tokens.accessToken).toEqual(expect.any(String));
    expect(refreshed.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(refreshed.data.tokens.refreshToken).not.toBe(initialRefreshToken);

    const rotatedRefreshToken = refreshed.data.tokens.refreshToken as string;

    const logout = await axios.post('/api/auth/logout', {
      refreshToken: rotatedRefreshToken,
    });
    expect(logout.status).toBe(200);
    expect(logout.data).toEqual({ success: true });

    const refreshAfterLogout = await axios.post(
      '/api/auth/refresh',
      {
        refreshToken: rotatedRefreshToken,
      },
      {
        validateStatus: () => true,
      },
    );

    expect(refreshAfterLogout.status).toBe(401);
    expect(refreshAfterLogout.data.code).toBe('AUTH_INVALID_REFRESH_TOKEN');
  });
});
