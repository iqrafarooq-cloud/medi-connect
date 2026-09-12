/**
 * MVP drug/allergy class matcher — NOT a substitute for a licensed
 * drug-allergy/interaction database (First Databank, Medi-Span, RxNorm, etc.).
 */

const BETA_LACTAM_MARKERS = [
  "penicillin",
  "amoxicillin",
  "ampicillin",
  "augmentin",
  "piperacillin",
  "nafcillin",
  "oxacillin",
  "dicloxacillin",
  "cephalexin",
  "ceftriaxone",
  "cefazolin",
  "cefuroxime",
  "cefdinir",
  "cefepime",
  "imipenem",
  "meropenem",
  "ertapenem",
  "aztreonam",
];

export type AllergyRecord = {
  substance: string;
  reaction?: string | null;
  severity?: string | null;
};

export type AllergyConflictResult = {
  conflict: boolean;
  matchedAllergy: AllergyRecord | null;
  reason: string;
  disclaimer: string;
};

const DISCLAIMER =
  "Decision-support only. This is a simple class/substring check and does not replace a licensed drug-allergy database or pharmacist review.";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").replace(/\s+/g, " ").trim();
}

function isBetaLactam(medicationName: string) {
  const n = normalize(medicationName);
  return BETA_LACTAM_MARKERS.some((m) => n.includes(m));
}

function allergyImpliesPenicillinClass(allergy: AllergyRecord) {
  const n = normalize(allergy.substance);
  return (
    n.includes("penicillin") ||
    n.includes("beta lactam") ||
    n.includes("betalactam") ||
    n.includes("pcn")
  );
}

export function checkAgainstAllergyList(
  medicationName: string,
  allergies: AllergyRecord[],
): AllergyConflictResult {
  const med = normalize(medicationName);

  for (const allergy of allergies) {
    const substance = normalize(allergy.substance);
    if (!substance) continue;

    if (med.includes(substance) || substance.includes(med)) {
      return {
        conflict: true,
        matchedAllergy: allergy,
        reason: `Medication name overlaps documented allergy "${allergy.substance}".`,
        disclaimer: DISCLAIMER,
      };
    }

    if (allergyImpliesPenicillinClass(allergy) && isBetaLactam(medicationName)) {
      return {
        conflict: true,
        matchedAllergy: allergy,
        reason: `"${medicationName}" is in the beta-lactam class; patient has documented ${allergy.substance} allergy${allergy.reaction ? ` (${allergy.reaction})` : ""}.`,
        disclaimer: DISCLAIMER,
      };
    }
  }

  return {
    conflict: false,
    matchedAllergy: null,
    reason: `No substring/class conflict found for "${medicationName}" against documented allergies.`,
    disclaimer: DISCLAIMER,
  };
}
