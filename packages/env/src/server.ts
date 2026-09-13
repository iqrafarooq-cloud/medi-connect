import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Load apps/web/.env regardless of process.cwd().
 * Project .env must override ambient shell exports (e.g. a global
 * GOOGLE_APPLICATION_CREDENTIALS from another GCP project).
 */
function loadEnvFiles() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Lowest priority first; later files override.
  const layered = [
    { path: path.resolve(process.cwd(), ".env"), override: false },
    { path: path.resolve(process.cwd(), "apps/web/.env"), override: true },
    { path: path.resolve(here, "../../../apps/web/.env"), override: true },
    { path: path.resolve(process.cwd(), ".env.local"), override: true },
    { path: path.resolve(process.cwd(), "apps/web/.env.local"), override: true },
    { path: path.resolve(here, "../../../apps/web/.env.local"), override: true },
  ];

  const seen = new Set<string>();
  for (const entry of layered) {
    if (seen.has(entry.path) || !fs.existsSync(entry.path)) continue;
    seen.add(entry.path);
    dotenv.config({ path: entry.path, override: entry.override });
  }
}

loadEnvFiles();

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    // Session-mode URL for DDL/migrations (Supabase direct). Falls back to DATABASE_URL in drizzle.config.
    DIRECT_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string().min(8),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SUPABASE_URL: z.string().url().optional(),
    // New Supabase keys (preferred)
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    // Legacy JWT keys (optional fallback)
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_CLINIC_BUCKET: z.string().default("clinic-documents"),
    SUPABASE_PATIENT_BUCKET: z.string().default("patients"),
    // Google Vertex AI (chat + embeddings)
    GOOGLE_VERTEX_PROJECT: z.string().min(1).optional(),
    GOOGLE_VERTEX_LOCATION: z.string().default("us-central1"),
    // Prefer full SA JSON string on Vercel (no filesystem path).
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    GOOGLE_CLIENT_EMAIL: z.string().email().optional(),
    GOOGLE_PRIVATE_KEY: z.string().optional(),
    GOOGLE_VERTEX_CHAT_MODEL: z.string().default("gemini-2.5-flash"),
    GOOGLE_VERTEX_EMBEDDING_MODEL: z.string().default("gemini-embedding-2"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
