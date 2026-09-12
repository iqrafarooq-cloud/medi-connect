/**
 * AI SDK ModelMessage tool-result values must be JSON-serializable.
 * Drizzle Date fields fail zod jsonValueSchema and surface as
 * AI_InvalidPromptError on the next multi-step turn.
 */
export function toToolJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
