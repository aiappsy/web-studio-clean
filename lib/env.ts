// lib/env.ts

import { z } from "zod";

/**
 * Runtime environment schema.
 */
export const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1).describe("OpenRouter API key"),
  DEFAULT_MODEL: z.string().default("gpt-4o-mini"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  JWT_SECRET: z.string().min(8),
  ENCRYPTION_KEY: z.string().min(32),

  DATABASE_URL: z.string().url(),
});

/**
 * Validated, runtime-safe environment object.
 */
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
