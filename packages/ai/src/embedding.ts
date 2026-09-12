import { embed, embedMany } from "ai";

import { EMBEDDING_DIMENSIONS } from "@medi-connect/db/schema/clinical";
import { getEmbeddingModel } from "./vertex";

/**
 * gemini-embedding-2 does NOT support the Vertex `taskType` field.
 * Task intent must be encoded in the text prefix (Google docs).
 *
 * Clinical History Assistant is asymmetric Q&A RAG (clinician question → chart
 * passages), so we use "question answering" rather than generic search.
 *
 * Dimensions: 1536 is the quality sweet spot of Google's recommended MRL sizes
 * (768 / 1536 / 3072). gemini-embedding-2 auto-normalizes truncated vectors.
 */
const BATCH = 100;

export { EMBEDDING_DIMENSIONS };

export function formatEmbeddingDocument(content: string, title?: string | null) {
  const t = title?.trim() || "none";
  return `title: ${t} | text: ${content}`;
}

export function formatEmbeddingQuery(query: string) {
  return `task: question answering | query: ${query}`;
}

export async function embedChunks(
  chunks: Array<string | { content: string; title?: string | null }>,
): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const model = getEmbeddingModel();
  const values = chunks.map((c) =>
    typeof c === "string"
      ? formatEmbeddingDocument(c)
      : formatEmbeddingDocument(c.content, c.title),
  );
  const out: number[][] = [];

  for (let i = 0; i < values.length; i += BATCH) {
    const slice = values.slice(i, i + BATCH);
    const { embeddings } = await embedMany({
      model,
      values: slice,
      providerOptions: {
        vertex: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      },
    });
    out.push(...embeddings);
  }

  return out;
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: formatEmbeddingQuery(query),
    providerOptions: {
      vertex: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    },
  });
  return embedding;
}
