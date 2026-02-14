import { z } from 'zod';

const envSchema = z.object({
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(16),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(16),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
