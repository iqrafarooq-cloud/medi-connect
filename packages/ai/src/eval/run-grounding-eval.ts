import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { generateText, stepCountIs } from "ai";

import { createDb } from "@medi-connect/db";
import { patient } from "@medi-connect/db/schema/patient";
import {
  checkAllergyConflict,
  getActiveMedications,
  getAllergies,
  getChatModel,
  getHomeGlucoseReadings,
  getLabTrend,
  searchPatientRecords,
} from "../index";
import { runAllergyConflictCheck } from "../retrieval";
import { ELEANOR_EVAL_CASES } from "./cases";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../apps/web/.env") });

const ELEANOR_CNIC = "4210188392015";

async function main() {
  const db = createDb();
  const rows = await db.select().from(patient).where(eq(patient.cnic, ELEANOR_CNIC)).limit(1);
  const p = rows[0];
  if (!p) {
    console.error("Eleanor not found — run pnpm seed:eleanor first");
    process.exit(1);
  }

  let passed = 0;
  const failures: string[] = [];

  for (const c of ELEANOR_EVAL_CASES) {
    process.stdout.write(`• ${c.id} ... `);

    if (c.expect === "no_conflict" || c.expect === "conflict") {
      const result = await runAllergyConflictCheck(p.id, c.medication!);
      const ok =
        c.expect === "conflict" ? result.conflict === true : result.conflict === false;
      if (ok) {
        passed += 1;
        console.log("PASS");
      } else {
        failures.push(`${c.id}: expected ${c.expect}, got conflict=${result.conflict}`);
        console.log("FAIL");
      }
      continue;
    }

    const { text } = await generateText({
      model: getChatModel(),
      instructions: `You are a clinical assistant for patient ${p.id}. Every claim must come from tools. If unsupported, say exactly: I don't have documentation of that in this patient's record.`,
      prompt: c.question,
      stopWhen: stepCountIs(6),
      tools: {
        searchPatientRecords: searchPatientRecords(p.id),
        getLabTrend: getLabTrend(p.id),
        getActiveMedications: getActiveMedications(p.id),
        getAllergies: getAllergies(p.id),
        getHomeGlucoseReadings: getHomeGlucoseReadings(p.id),
        checkAllergyConflict: checkAllergyConflict(p.id),
      },
    });

    const lower = text.toLowerCase();
    if (c.expect === "no_data") {
      const ok = lower.includes("don't have documentation") || lower.includes("do not have documentation");
      if (ok) {
        passed += 1;
        console.log("PASS");
      } else {
        failures.push(`${c.id}: expected refusal, got: ${text.slice(0, 200)}`);
        console.log("FAIL");
      }
      continue;
    }

    const missing = (c.mustInclude ?? []).filter((s) => !lower.includes(s.toLowerCase()));
    if (missing.length) {
      failures.push(`${c.id}: missing ${missing.join(", ")} in: ${text.slice(0, 200)}`);
      console.log("FAIL");
    } else {
      passed += 1;
      console.log("PASS");
    }
  }

  console.log(`\n${passed}/${ELEANOR_EVAL_CASES.length} passed`);
  if (failures.length) {
    console.log("Failures:");
    for (const f of failures) console.log(" -", f);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
