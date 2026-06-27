import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

loadEnv({ path: 'auth-api-e2e/.env' });

module.exports = async function () {
  const runtimePath = join('auth-api-e2e', '.tmp', 'runtime.json');
  if (existsSync(runtimePath)) {
    const runtime = JSON.parse(readFileSync(runtimePath, 'utf8')) as {
      databaseUrl?: string;
      redisUrl?: string;
    };
    if (runtime.databaseUrl) {
      process.env.DATABASE_URL = runtime.databaseUrl;
    }
    if (runtime.redisUrl) {
      process.env.REDIS_URL = runtime.redisUrl;
    }
  }

  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.AUTH_API_PORT ?? '3001';
  axios.defaults.baseURL = `http://${host}:${port}`;
};
