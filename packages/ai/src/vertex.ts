import fs from "node:fs";
import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "@medi-connect/env/server";

type ServiceAccountCredentials = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
};

function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  try {
    const parsed = JSON.parse(raw) as ServiceAccountCredentials;
    if (parsed.private_key) {
      // Env UIs sometimes double-escape newlines in the PEM block.
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. " +
        "Paste the service-account key as a single-line minified JSON string.",
    );
  }
}

function loadServiceAccountCredentials(): ServiceAccountCredentials | undefined {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountJson(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: env.GOOGLE_CLIENT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, "utf8")) as ServiceAccountCredentials;
  }

  return undefined;
}

function googleAuthOptions() {
  const credentials = loadServiceAccountCredentials();
  if (!credentials?.client_email || !credentials.private_key) {
    // Fall through to Application Default Credentials if a path is set in the process env.
    return undefined;
  }
  return { credentials };
}

function assertProjectMatchesCredentials(project: string) {
  const credentials = loadServiceAccountCredentials();
  if (!credentials?.project_id) return;
  if (credentials.project_id !== project) {
    throw new Error(
      `GOOGLE_VERTEX_PROJECT is "${project}" but credentials are for "${credentials.project_id}" ` +
        `(${credentials.client_email ?? "unknown SA"}).\n` +
        `Fix: set GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) to the medi-connect SA, ` +
        `or unset a conflicting shell export.`,
    );
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
