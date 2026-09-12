import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/web/.env",
});

// Prefer DIRECT_URL for migrations/DDL (Supabase session mode).
// DATABASE_URL may be a transaction pooler (pgbouncer) which breaks DDL.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
