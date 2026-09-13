import { resolveUploadMime } from "@medi-connect/api/lib/health-facts";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { nativeServerUrl } from "@/lib/api-url";
import { authClient } from "@/lib/auth-client";
import { parseUploadResponse } from "@/lib/health-upload";

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export function newIdempotencyKey() {
  return Crypto.randomUUID();
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function formatHealthDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const iso = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatHealthYear(value: string): string {
  return value.slice(0, 4);
}

export async function pickPdf(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || "record.pdf",
    mimeType: asset.mimeType || "application/pdf",
  };
}

export async function pickPhoto(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: asset.mimeType || "image/jpeg",
  };
}

export async function takePhoto(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType || "image/jpeg",
  };
}

export async function uploadHealthRecord(params: {
  file: PickedFile;
  category: string;
  encounterDate: string;
  notes?: string;
  idempotencyKey: string;
}): Promise<{ id: string; replayed: boolean }> {
  const mimeType = resolveUploadMime(params.file.name, params.file.mimeType);
  const fields: Record<string, string> = {
    category: params.category,
    encounterDate: params.encounterDate,
    idempotencyKey: params.idempotencyKey,
    fileName: params.file.name,
    mimeType,
  };
  if (params.notes) fields.notes = params.notes;

  const url = `${nativeServerUrl}/api/uploads/patient-self`;

  if (Platform.OS === "web") {
    const blobResponse = await fetch(params.file.uri);
    const blob = await blobResponse.blob();
    const form = new FormData();
    form.append("file", new globalThis.File([blob], params.file.name, { type: mimeType }));
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    const { fetch: expoFetch } = await import("expo/fetch");
    const response = await expoFetch(url, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    return parseUploadResponse(response.status, await response.text());
  }

  const headers: Record<string, string> = {};
  const cookies = await authClient.getCookie();
  if (cookies) headers.Cookie = cookies;

  const { File, UploadType } = await import("expo-file-system");
  const file = new File(params.file.uri);
  const result = await file.upload(url, {
    fieldName: "file",
    httpMethod: "POST",
    mimeType,
    uploadType: UploadType.MULTIPART,
    headers,
    parameters: fields,
  });
  return parseUploadResponse(result.status, result.body);
}
