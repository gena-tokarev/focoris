import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(16),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(16),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
