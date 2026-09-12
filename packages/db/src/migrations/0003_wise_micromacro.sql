DROP INDEX IF EXISTS "document_chunk_embedding_idx";--> statement-breakpoint
ALTER TABLE "document_chunk" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
CREATE INDEX "document_chunk_embedding_idx" ON "document_chunk" USING hnsw ("embedding" vector_cosine_ops);
