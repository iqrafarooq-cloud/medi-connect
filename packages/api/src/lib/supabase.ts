import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@medi-connect/env/server";

let client: SupabaseClient | null = null;

/** Prefer new secret key; fall back to legacy service_role JWT. */
function supabaseSecretKey() {
  return env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createSupabaseAdmin(): SupabaseClient {
  const key = supabaseSecretKey();
  if (!env.SUPABASE_URL || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/web/.env " +
        "(Project Settings → API → secret key). Legacy SUPABASE_SERVICE_ROLE_KEY still works.",
    );
  }
  if (client) return client;
  client = createClient(env.SUPABASE_URL, key, {
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

export async function removeObjects(bucket: string, paths: string[]) {
  if (!paths.length) return;
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

export async function downloadObject(bucket: string, path: string): Promise<Buffer> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
