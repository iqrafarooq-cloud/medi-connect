import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DIRECT_URL or DATABASE_URL is missing in apps/web/.env");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  console.log("pgvector extension enabled");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
