import { generateObject } from "ai";
import { z } from "zod";

import { getChatModel } from "./vertex";

const remedyAiSchema = z.object({
  severity: z.enum(["self_care", "watch", "severe"]),
  summary: z.string().max(240),
  suggestions: z
    .array(
      z.object({
        kind: z.enum(["rest", "movement", "hydration", "nutrition", "sleep"]),
        title: z.string().max(80),
        detail: z.string().max(220),
      }),
    )
    .max(4),
});

export type RemedyAiResult = z.infer<typeof remedyAiSchema>;

export async function generateRemedySuggestions(answers: Record<string, unknown>): Promise<RemedyAiResult> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: remedyAiSchema,
    prompt: `You support a patient in Pakistan with home self-care only.

Hard rules:
- Never recommend medicine, supplements, doses, pharmacies, herbs as treatment, or "take X".
- Only rest, gentle movement, hydration, light food, and sleep.
- If chest pain, hard breathing, or rapidly worsening severe symptoms appear, set severity to severe and return an empty suggestions array.
- This is not a diagnosis. Keep the summary short and calm.

Answers JSON:
${JSON.stringify(answers)}`,
  });
  return object;
}
