export type HomeHref = "/(app)/clinic" | "/(app)/health" | "/(app)/health/remedy" | "/(app)/profile";

export type HomeQueue = {
  clinicName: string;
  minutesLeft: number;
  complaint: string | null;
} | null;

export type HomeRemedy = {
  severity: "self_care" | "watch" | "severe";
  summary: string;
} | null;

export type HomeHero = {
  kind: "queue" | "severe" | "check";
  title: string;
  body: string;
  href: HomeHref;
  cta: string;
};

export type HomePageCard = {
  id: "health" | "clinic" | "profile";
  title: string;
  body: string;
  href: HomeHref;
};

type GlanceCount = { count: number };

export type HomeRecordSummary = {
  conditions?: GlanceCount;
  allergies?: GlanceCount;
  medications?: GlanceCount;
  surgeries?: GlanceCount;
  documents?: unknown[];
} | null | undefined;

export function firstNameFrom(fullName: string | null | undefined, fallback = "there"): string {
  const name = fullName?.trim();
  if (!name) return fallback;
  return name.split(/\s+/)[0] ?? fallback;
}

export function countHealthRecords(summary: HomeRecordSummary): number {
  if (!summary) return 0;
  return (
    (summary.conditions?.count ?? 0) +
    (summary.allergies?.count ?? 0) +
    (summary.medications?.count ?? 0) +
    (summary.surgeries?.count ?? 0) +
    (summary.documents?.length ?? 0)
  );
}

export function homeGreeting(input: {
  firstName: string;
  hasQueue: boolean;
  remedySeverity: "self_care" | "watch" | "severe" | null;
  recordCount: number;
}): { title: string; body: string } {
  const title = `Hello, ${input.firstName}`;
  if (input.hasQueue) {
    return { title, body: "The clinic can already see you inbound." };
  }
  if (input.remedySeverity === "severe") {
    return { title, body: "Your last check pointed to clinic care." };
  }
  return { title, body: "" };
}

function queueBody(minutesLeft: number): string {
  return minutesLeft > 0
    ? `The clinic can see you inbound · ${minutesLeft} min ETA`
    : "The clinic can see you inbound · arriving now";
}

export function homeHero(input: { queue: HomeQueue; remedy: HomeRemedy }): HomeHero {
  if (input.queue) {
    return {
      kind: "queue",
      title: `You're in the queue at ${input.queue.clinicName}`,
      body: queueBody(input.queue.minutesLeft),
      href: "/(app)/clinic",
      cta: "Open Clinic",
    };
  }
  if (input.remedy?.severity === "severe") {
    return {
      kind: "severe",
      title: "Last check needs clinic care",
      body: input.remedy.summary,
      href: "/(app)/clinic",
      cta: "Open Clinic",
    };
  }
  return {
    kind: "check",
    title: "Feeling unwell?",
    body: "A short symptom check for home self-care — not a diagnosis, and never medicine.",
    href: "/(app)/health/remedy",
    cta: "Start check",
  };
}

export function homePageCards(input: {
  recordCount: number;
  queue: HomeQueue;
  remedy: HomeRemedy;
}): HomePageCard[] {
  const healthBody =
    !input.queue && input.remedy && input.remedy.severity !== "severe"
      ? input.remedy.summary
      : input.recordCount > 0
        ? `${input.recordCount} on file`
        : "Conditions, meds, and files in one place.";

  const clinicBody = input.queue
    ? `You're in the queue at ${input.queue.clinicName}`
    : "Nearby clinics and the inbound queue.";

  return [
    {
      id: "health",
      title: "Health",
      body: healthBody,
      href: "/(app)/health",
    },
    {
      id: "clinic",
      title: "Clinic",
      body: clinicBody,
      href: "/(app)/clinic",
    },
    {
      id: "profile",
      title: "Profile",
      body: "Your details and visits.",
      href: "/(app)/profile",
    },
  ];
}
