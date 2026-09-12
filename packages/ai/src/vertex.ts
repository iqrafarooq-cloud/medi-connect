import fs from "node:fs";
import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "@medi-connect/env/server";

function googleAuthOptions() {
  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return {
      credentials: {
        client_email: env.GOOGLE_CLIENT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    };
  }
  return undefined;
}

function assertProjectMatchesCredentials(project: string) {
  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(credPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
    };
    if (raw.project_id && raw.project_id !== project) {
      throw new Error(
        `GOOGLE_VERTEX_PROJECT is "${project}" but credentials file "${credPath}" is for "${raw.project_id}" ` +
          `(${raw.client_email ?? "unknown SA"}).\n` +
          `Fix: set GOOGLE_APPLICATION_CREDENTIALS in apps/web/.env to the medi-connect SA JSON, ` +
          `or unset a shell export (echo $GOOGLE_APPLICATION_CREDENTIALS).`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("GOOGLE_VERTEX_PROJECT")) {
      throw error;
    }
  }
}

export function getVertex() {
  if (!env.GOOGLE_VERTEX_PROJECT) {
    throw new Error(
      "GOOGLE_VERTEX_PROJECT is required. Set Vertex project and credentials in apps/web/.env",
    );
  }

  assertProjectMatchesCredentials(env.GOOGLE_VERTEX_PROJECT);

  return createVertex({
    project: env.GOOGLE_VERTEX_PROJECT,
    location: env.GOOGLE_VERTEX_LOCATION,
    googleAuthOptions: googleAuthOptions(),
  });
}

export function getChatModel() {
  return getVertex()(env.GOOGLE_VERTEX_CHAT_MODEL);
}

export function getEmbeddingModel() {
  return getVertex().embeddingModel(env.GOOGLE_VERTEX_EMBEDDING_MODEL);
}
