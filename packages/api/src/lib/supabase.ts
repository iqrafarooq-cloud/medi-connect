import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@medi-connect/env/server";

let client: SupabaseClient | null = null;

export function createSupabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env",
    );
  }
  if (client) return client;
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function clinicBucket() {
  return env.SUPABASE_CLINIC_BUCKET;
}

export function patientBucket() {
  return env.SUPABASE_PATIENT_BUCKET;
}

export async function uploadObject(params: {
  bucket: string;
  path: string;
  body: Buffer;
  contentType: string;
}) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.body, {
      contentType: params.contentType,
      upsert: false,
    });
  if (error) throw error;
  return params.path;
}

export async function createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
