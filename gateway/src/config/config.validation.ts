import { z } from 'zod';

const envSchema = z.object({
  AUTH_API_URL: z.string().url(),
  SKILL_BOOK_API_URL: z.string().url(),
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
