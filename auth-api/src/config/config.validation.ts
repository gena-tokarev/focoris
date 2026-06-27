import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(16),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(16),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  AUTH_EXTERNAL_AUTH_CODE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300),
  AUTH_EXTERNAL_AUTH_STATE_SECRET: z.string().min(16).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  GOOGLE_ALLOWED_WEB_REDIRECT_URIS: z
    .string()
    .min(1)
    .default('http://localhost:3000'),
  GOOGLE_ALLOWED_NATIVE_REDIRECT_URIS: z
    .string()
    .min(1)
    .default('focoris://auth/callback'),
  PASSKEY_RP_ID: z.string().min(1),
  PASSKEY_RP_NAME: z.string().min(1),
  PASSKEY_ALLOWED_ORIGINS: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
