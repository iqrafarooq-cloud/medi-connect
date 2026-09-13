import { z } from "zod";

export const COMPLAINTS = [
  "headache",
  "fever",
  "cough",
  "stomach",
  "fatigue",
  "body_ache",
  "sleep",
  "stress",
  "other",
] as const;
export const DURATIONS = ["hours", "one_two_days", "three_seven_days", "over_a_week"] as const;
export const INTENSITIES = ["mild", "moderate", "severe"] as const;
export const FEVERS = ["none", "low", "high", "unknown"] as const;
export const BREATHING = ["ok", "mild", "hard"] as const;
export const YES_NO = ["no", "yes"] as const;
export const EAT_DRINK_SLEEP = ["yes", "some", "no"] as const;
export const ENERGY = ["rested", "normal", "exhausted"] as const;
export const TRIED = ["rest", "fluids", "sleep", "nothing"] as const;
export const SUGGESTION_KINDS = ["rest", "movement", "hydration", "nutrition", "sleep"] as const;
export const REMEDY_SEVERITIES = ["self_care", "watch", "severe"] as const;

export type Complaint = (typeof COMPLAINTS)[number];
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];
export type RemedySeverity = (typeof REMEDY_SEVERITIES)[number];

export type RemedyOption = { value: string; label: string };

export type RemedyQuestion = {
  id:
    | "complaint"
    | "duration"
    | "intensity"
    | "fever"
    | "breathing"
    | "chestPain"
    | "eatDrinkSleep"
    | "energy"
    | "alreadyTried"
    | "rapidlyWorse";
  prompt: string;
  options: RemedyOption[];
  multiple?: boolean;
};

export type RemedySuggestion = {
  kind: SuggestionKind;
  title: string;
  detail: string;
};

export type RemedyAnswers = z.infer<typeof remedyAnswersInput>;

export type NearbyClinic = {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  phone: string;
  distanceKm: number | null;
};

export type RemedyLastCheck = {
  id: string;
  severity: RemedySeverity;
  summary: string;
  suggestions: RemedySuggestion[];
  createdAt: string;
};

export const REMEDY_DISCLAIMER =
  "This is self-care support, not a diagnosis and not a prescription. It never recommends medicine.";

export const REMEDY_QUESTIONS: RemedyQuestion[] = [
  {
    id: "complaint",
    prompt: "What is bothering you most today?",
    options: [
      { value: "headache", label: "Headache" },
      { value: "fever", label: "Fever" },
      { value: "cough", label: "Cough" },
      { value: "stomach", label: "Stomach" },
      { value: "fatigue", label: "Fatigue" },
      { value: "body_ache", label: "Body ache" },
      { value: "sleep", label: "Sleep" },
      { value: "stress", label: "Stress" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "duration",
    prompt: "How long has this been going on?",
    options: [
      { value: "hours", label: "Hours" },
      { value: "one_two_days", label: "1–2 days" },
      { value: "three_seven_days", label: "3–7 days" },
      { value: "over_a_week", label: "More than a week" },
    ],
  },
  {
    id: "intensity",
    prompt: "How bad does it feel right now?",
    options: [
      { value: "mild", label: "Mild" },
      { value: "moderate", label: "Moderate" },
      { value: "severe", label: "Severe" },
    ],
  },
  {
    id: "fever",
    prompt: "Do you have a fever?",
    options: [
      { value: "none", label: "No" },
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
      { value: "unknown", label: "Not sure" },
    ],
  },
  {
    id: "breathing",
    prompt: "How is your breathing?",
    options: [
      { value: "ok", label: "Fine" },
      { value: "mild", label: "A bit short" },
      { value: "hard", label: "Hard to breathe" },
    ],
  },
  {
    id: "chestPain",
    prompt: "Any chest pain?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  {
    id: "eatDrinkSleep",
    prompt: "Can you eat, drink, and sleep?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "some", label: "Somewhat" },
      { value: "no", label: "Barely" },
    ],
  },
  {
    id: "energy",
    prompt: "How is your energy?",
    options: [
      { value: "rested", label: "Rested" },
      { value: "normal", label: "Normal" },
      { value: "exhausted", label: "Exhausted" },
    ],
  },
  {
    id: "alreadyTried",
    prompt: "What have you already tried?",
    multiple: true,
    options: [
      { value: "rest", label: "Rest" },
      { value: "fluids", label: "Fluids" },
      { value: "sleep", label: "Sleep" },
      { value: "nothing", label: "Nothing yet" },
    ],
  },
  {
    id: "rapidlyWorse",
    prompt: "Is this getting rapidly worse?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
];

export const remedyAnswersInput = z.object({
  complaint: z.enum(COMPLAINTS),
  duration: z.enum(DURATIONS),
  intensity: z.enum(INTENSITIES),
  fever: z.enum(FEVERS),
  breathing: z.enum(BREATHING),
  chestPain: z.enum(YES_NO),
  eatDrinkSleep: z.enum(EAT_DRINK_SLEEP),
  energy: z.enum(ENERGY),
  alreadyTried: z.array(z.enum(TRIED)).min(1).max(4),
  rapidlyWorse: z.enum(YES_NO),
});

export const remedyCheckInput = remedyAnswersInput.extend({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const MEDICINE_PATTERN =
  /\b(paracetamol|panadol|acetaminophen|ibuprofen|aspirin|antibiotic|antibiotics|tablet|tablets|capsule|syrup|dose|dosage|\d+\s*mg|prescription|medicine|medication|painkiller|nsaid)\b/i;

export function suggestionLooksLikeMedicine(text: string): boolean {
  return MEDICINE_PATTERN.test(text);
}

export function classifyRemedySeverity(answers: RemedyAnswers): RemedySeverity {
  if (answers.chestPain === "yes") return "severe";
  if (answers.breathing === "hard") return "severe";
  if (answers.rapidlyWorse === "yes" && (answers.intensity === "severe" || answers.fever === "high")) {
    return "severe";
  }
  if (answers.intensity === "severe" && answers.eatDrinkSleep === "no") return "severe";
  if (
    answers.intensity === "moderate" ||
    answers.intensity === "severe" ||
    answers.fever === "high" ||
    answers.breathing === "mild" ||
    answers.rapidlyWorse === "yes" ||
    answers.eatDrinkSleep === "no"
  ) {
    return "watch";
  }
  return "self_care";
}

export function resolveRemedySeverity(local: RemedySeverity, ai?: RemedySeverity): RemedySeverity {
  if (local === "severe" || ai === "severe") return "severe";
  if (local === "watch" || ai === "watch") return "watch";
  return "self_care";
}

export function defaultRemedySuggestions(
  severity: RemedySeverity,
  answers: RemedyAnswers,
): RemedySuggestion[] {
  if (severity === "severe") return [];

  const items: RemedySuggestion[] = [
    {
      kind: "rest",
      title: "Pause and rest",
      detail: "Sit or lie somewhere quiet. Give your body a few hours without extra demand.",
    },
  ];

  if (answers.fever !== "none" || answers.complaint === "cough" || answers.complaint === "fever") {
    items.push({
      kind: "hydration",
      title: "Sip fluids",
      detail: "Keep water, oral rehydration, or clear soup nearby and drink steadily.",
    });
  } else {
    items.push({
      kind: "hydration",
      title: "Drink water",
      detail: "A glass of water now, then keep sipping through the next few hours.",
    });
  }

  if (answers.complaint === "sleep" || answers.energy === "exhausted" || answers.complaint === "fatigue") {
    items.push({
      kind: "sleep",
      title: "Protect sleep",
      detail: "Dim the room, put the phone aside, and aim for an earlier night.",
    });
  } else if (answers.complaint === "stress" || answers.complaint === "body_ache") {
    items.push({
      kind: "movement",
      title: "Gentle movement",
      detail: "A slow indoor walk or easy stretching — stop if anything sharpens.",
    });
  } else if (answers.complaint === "stomach" || answers.eatDrinkSleep === "some") {
    items.push({
      kind: "nutrition",
      title: "Eat light",
      detail: "Small, plain food if you can. Skip heavy or spicy meals until you settle.",
    });
  } else {
    items.push({
      kind: "sleep",
      title: "Ease the load",
      detail: "Keep the rest of today light. Avoid hard exercise until you feel steadier.",
    });
  }

  return items.slice(0, 4);
}

export function sanitizeRemedySuggestions(
  suggestions: RemedySuggestion[],
  answers?: RemedyAnswers,
  severity: RemedySeverity = "self_care",
): RemedySuggestion[] {
  if (severity === "severe") return [];
  const allowed = new Set<string>(SUGGESTION_KINDS);
  const kept = suggestions.filter((item) => {
    if (!allowed.has(item.kind)) return false;
    const blob = `${item.title} ${item.detail}`;
    return !suggestionLooksLikeMedicine(blob);
  });
  if (kept.length > 0) return kept.slice(0, 4);
  return defaultRemedySuggestions("self_care", answers ?? fallbackAnswers());
}

function fallbackAnswers(): RemedyAnswers {
  return {
    complaint: "other",
    duration: "hours",
    intensity: "mild",
    fever: "none",
    breathing: "ok",
    chestPain: "no",
    eatDrinkSleep: "yes",
    energy: "normal",
    alreadyTried: ["nothing"],
    rapidlyWorse: "no",
  };
}

export function summaryForSeverity(severity: RemedySeverity, answers: RemedyAnswers): string {
  if (severity === "severe") {
    return "These answers look too serious for home care. Contact a nearby clinic now.";
  }
  const label =
    REMEDY_QUESTIONS[0]?.options.find((option) => option.value === answers.complaint)?.label ?? "this";
  if (severity === "watch") {
    return `Support for ${label.toLowerCase()} — rest and watch closely. Seek clinic care if it worsens.`;
  }
  return `Simple measures for ${label.toLowerCase()} — rest, fluids, and a lighter day.`;
}

type ClinicCandidate = {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  phone: string;
  status: string;
  latitude: number;
  longitude: number;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earth = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function rankNearbyClinics(
  clinics: ClinicCandidate[],
  origin?: { latitude: number; longitude: number },
  limit = 3,
): NearbyClinic[] {
  const active = clinics.filter((clinic) => clinic.status === "active");
  const mapped: NearbyClinic[] = active.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    type: clinic.type,
    address: clinic.address,
    city: clinic.city,
    phone: clinic.phone,
    distanceKm: origin
      ? Math.round(haversineKm(origin, clinic) * 10) / 10
      : null,
  }));
  mapped.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return a.name.localeCompare(b.name);
  });
  return mapped.slice(0, limit);
}

export function assembleRemedyHub(input: {
  last: RemedyLastCheck | null;
  clinics: NearbyClinic[];
}): {
  last: RemedyLastCheck | null;
  clinics: NearbyClinic[];
  disclaimer: string;
} {
  return {
    last: input.last,
    clinics: input.last?.severity === "severe" ? input.clinics : [],
    disclaimer: REMEDY_DISCLAIMER,
  };
}
