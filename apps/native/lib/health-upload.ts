export function parseUploadResponse(
  status: number,
  bodyText: string,
): { id: string; replayed: boolean } {
  let json: { error?: string; document?: { id?: string }; replayed?: boolean };
  try {
    json = JSON.parse(bodyText) as typeof json;
  } catch {
    throw new Error("Upload failed");
  }
  if (status < 200 || status >= 300) {
    throw new Error(json.error || "Upload failed");
  }
  const id = json.document?.id;
  if (!id) throw new Error("Upload failed");
  return { id, replayed: Boolean(json.replayed) };
}
