import { killPort } from '@nx/node/utils';
import { spawn } from 'child_process';
import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

loadEnv({ path: 'auth-api-e2e/.env' });

const E2E_RUNTIME_PATH = join('auth-api-e2e', '.tmp', 'runtime.json');

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

module.exports = async function () {
  const port = process.env.AUTH_API_PORT
    ? Number(process.env.AUTH_API_PORT)
    : 3001;
  let postgresContainerId: string | undefined;
  let redisContainerId: string | undefined;

  if (existsSync(E2E_RUNTIME_PATH)) {
    const runtime = JSON.parse(readFileSync(E2E_RUNTIME_PATH, 'utf8')) as {
      postgresContainerId?: string;
      redisContainerId?: string;
    };
    postgresContainerId = runtime.postgresContainerId;
    redisContainerId = runtime.redisContainerId;
  }

  await killPort(port);

  if (postgresContainerId) {
    await runCommand('docker', ['rm', '-f', postgresContainerId]);
  }

  if (redisContainerId) {
    await runCommand('docker', ['rm', '-f', redisContainerId]);
  }

  rmSync(E2E_RUNTIME_PATH, { force: true });
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
