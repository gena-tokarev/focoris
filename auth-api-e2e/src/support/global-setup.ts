import { waitForPortOpen } from '@nx/node/utils';
import { spawn } from 'child_process';
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { GenericContainer } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

loadEnv({ path: 'auth-api-e2e/.env' });

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;
const E2E_RUNTIME_PATH = join('auth-api-e2e', '.tmp', 'runtime.json');
const WORKSPACE_ROOT = join(__dirname, '..', '..', '..');

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`${command} ${args.join(' ')} exited with code ${code}`),
      );
    });
  });
}

module.exports = async function () {
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const authApiPort = process.env.AUTH_API_PORT
    ? Number(process.env.AUTH_API_PORT)
    : 3001;
  const pgUser = process.env.TEST_DB_USER ?? 'focoris';
  const pgPassword = process.env.TEST_DB_PASSWORD ?? 'focoris';
  const pgDb = process.env.TEST_DB_NAME ?? 'focoris_auth_test';
  const pgImage = process.env.TEST_DB_IMAGE ?? 'postgres:16-alpine';
  const redisImage = process.env.TEST_REDIS_IMAGE ?? 'redis:7-alpine';

  const postgres = await new PostgreSqlContainer(pgImage)
    .withUsername(pgUser)
    .withPassword(pgPassword)
    .withDatabase(pgDb)
    .start();
  const redis = await new GenericContainer(redisImage)
    .withExposedPorts(6379)
    .start();

  const dbUrl = `${postgres.getConnectionUri()}?schema=public`;
  const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
  const { NODE_OPTIONS, VSCODE_INSPECTOR_OPTIONS, ...baseEnv } = process.env;
  const commandEnv = {
    ...baseEnv,
    DATABASE_URL: dbUrl,
    PORT: String(authApiPort),
    REDIS_URL: redisUrl,
  };

  await runCommand(
    'pnpm',
    [
      '-C',
      'auth-api',
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    commandEnv,
  );

  spawn('pnpm', ['exec', 'nx', 'serve', '@focoris/auth-api'], {
    env: commandEnv,
    cwd: WORKSPACE_ROOT,
    stdio: 'inherit',
  });

  await waitForPortOpen(authApiPort, { host });

  mkdirSync(join('auth-api-e2e', '.tmp'), { recursive: true });
  writeFileSync(
    E2E_RUNTIME_PATH,
    JSON.stringify(
      {
        databaseUrl: dbUrl,
        postgresContainerId: postgres.getId(),
        redisContainerId: redis.getId(),
        redisUrl,
      },
      null,
      2,
    ),
  );

  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = redisUrl;

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
