/**
 * Grounding eval set for Eleanor Vance fixtures (~15 questions).
 * Run after seed: pnpm --filter @medi-connect/ai eval:grounding
 */
export type EvalCase = {
  id: string;
  question: string;
  expect: "answer" | "no_data" | "no_conflict" | "conflict";
  /** Substrings that should appear in a grounded answer (case-insensitive). */
  mustInclude?: string[];
  /** For allergy tool cases */
  medication?: string;
};

export const ELEANOR_EVAL_CASES: EvalCase[] = [
  {
    id: "egfr-trend",
    question: "What is Eleanor's eGFR trend across documents?",
    expect: "answer",
    mustInclude: ["52", "54"],
  },
  {
    id: "hba1c",
    question: "What was her HbA1c at the October 2025 primary care visit?",
    expect: "answer",
    mustInclude: ["7.8"],
  },
  {
    id: "creatinine-oct",
    question: "What was serum creatinine on 2025-10-15?",
    expect: "answer",
    mustInclude: ["1.3"],
  },
  {
    id: "allergy",
    question: "What drug allergies are documented?",
    expect: "answer",
    mustInclude: ["penicillin"],
  },
  {
    id: "jardiance",
    question: "What dose of Jardiance was started?",
    expect: "answer",
    mustInclude: ["10"],
  },
  {
    id: "lisinopril-change",
    question: "Was Lisinopril dose changed, and to what?",
    expect: "answer",
    mustInclude: ["20"],
  },
  {
    id: "pneumonia",
    question: "What did the June 2026 chest radiograph show?",
    expect: "answer",
    mustInclude: ["right", "pneumonia"],
  },
  {
    id: "azithro-no-conflict",
    question: "Was azithromycin appropriate given her allergies?",
    expect: "no_conflict",
    medication: "Azithromycin",
  },
  {
    id: "amox-conflict",
    question: "Would amoxicillin conflict with her allergies?",
    expect: "conflict",
    medication: "Amoxicillin",
  },
  {
    id: "pulm-resolved",
    question: "Was pneumonia resolved at pulmonology follow-up?",
    expect: "answer",
    mustInclude: ["resol"],
  },
  {
    id: "npdr",
    question: "What was the ophthalmology retinopathy finding?",
    expect: "answer",
    mustInclude: ["npdr"],
  },
  {
    id: "no-troponin",
    question: "What is her latest troponin?",
    expect: "no_data",
  },
  {
    id: "no-echo",
    question: "Summarize her echocardiogram results.",
    expect: "no_data",
  },
  {
    id: "home-glucose",
    question: "What range did home fasting glucose readings cover in the log?",
    expect: "answer",
    mustInclude: ["mg"],
  },
  {
    id: "uacr",
    question: "What was the urine albumin-creatinine ratio?",
    expect: "answer",
    mustInclude: ["145"],
  },
];
