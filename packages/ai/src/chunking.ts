export type TextChunk = {
  page: number;
  charStart: number;
  charEnd: number;
  section: string | null;
  content: string;
};

const SECTION_HEADER =
  /^(SUBJECTIVE|OBJECTIVE(?:\s*\/\s*VITAL SIGNS)?|ASSESSMENT(?:\s*&\s*PLAN)?|PLAN|LABORATORY RESULTS.*|CHIEF COMPLAINT.*|EXAMINATION|FINDINGS|IMPRESSION|DIAGNOSIS.*|OUTPATIENT PRESCRIPTIONS.*|ELECTRONIC PRESCRIPTIONS.*|CURRENT MEDICATIONS|NEPHROLOGY CONSULTATION NOTE|ULTRASOUND.*|CHEST RADIOGRAPH.*|PULMONOLOGY FOLLOW-UP|REPEAT CHEST RADIOGRAPH.*|COMPREHENSIVE EYE EXAMINATION|DILATED FUNDUS EXAMINATION|ALLERGY ALERT.*)$/im;

const MAX_CHUNK = 1200;

function normalizeSection(raw: string): string {
  const u = raw.toUpperCase().replace(/\s+/g, "_");
  if (u.includes("SUBJECTIVE")) return "SUBJECTIVE";
  if (u.includes("OBJECTIVE") || u.includes("VITAL")) return "OBJECTIVE";
  if (u.includes("ASSESSMENT") || u.includes("PLAN")) return "ASSESSMENT_AND_PLAN";
  if (u.includes("LABORATORY") || u.includes("LAB_RESULTS")) return "LAB_RESULTS";
  if (u.includes("ALLERGY")) return "ALLERGIES";
  if (u.includes("PRESCRIPTION") || u.includes("MEDICATION")) return "MEDICATIONS";
  if (u.includes("FINDING") || u.includes("IMPRESSION") || u.includes("RADIOGRAPH"))
    return "IMAGING";
  if (u.includes("EXAM")) return "EXAM";
  return u.slice(0, 64);
}

/** Split clinical text on known section headers, then size-limit long sections. */
export function chunkClinicalText(fullText: string, page = 1): TextChunk[] {
  const text = fullText.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const sections: { heading: string | null; body: string; start: number }[] = [];
  let currentHeading: string | null = "HEADER";
  let currentBody: string[] = [];
  let currentStart = 0;
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && SECTION_HEADER.test(trimmed)) {
      if (currentBody.length) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join("\n").trim(),
          start: currentStart,
        });
      }
      currentHeading = normalizeSection(trimmed);
      currentBody = [trimmed];
      currentStart = offset;
    } else {
      if (!currentBody.length) currentStart = offset;
      currentBody.push(line);
    }
    offset += line.length + 1;
  }

  if (currentBody.length) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join("\n").trim(),
      start: currentStart,
    });
  }

  const chunks: TextChunk[] = [];
  for (const section of sections) {
    if (!section.body) continue;
    if (section.body.length <= MAX_CHUNK) {
      const charStart = text.indexOf(section.body, section.start);
      const start = charStart >= 0 ? charStart : section.start;
      chunks.push({
        page,
        charStart: start,
        charEnd: start + section.body.length,
        section: section.heading,
        content: section.body,
      });
      continue;
    }

    let cursor = 0;
    while (cursor < section.body.length) {
      const slice = section.body.slice(cursor, cursor + MAX_CHUNK);
      const absStart = (text.indexOf(section.body, section.start) >= 0
        ? text.indexOf(section.body, section.start)
        : section.start) + cursor;
      chunks.push({
        page,
        charStart: absStart,
        charEnd: absStart + slice.length,
        section: section.heading,
        content: slice.trim(),
      });
      cursor += MAX_CHUNK;
    }
  }

  return chunks.filter((c) => c.content.length > 20);
}
