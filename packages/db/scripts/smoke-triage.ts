import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env"), override: true });

const { createDb } = await import("../src/index");
const { clinic } = await import("../src/schema/clinic");
const {
  clinicalLead,
  triageBay,
  triageCase,
  triagePrepItem,
} = await import("../src/schema/triage");

async function main() {
  const db = createDb();
  const clinics = await db.select().from(clinic).limit(1);
  if (!clinics[0]) {
    console.log("NO_CLINIC — register a clinic in the app first, then re-run");
    process.exit(0);
  }

  const facility = clinics[0];
  console.log("clinic", facility.name, facility.id);

  let bays = await db.select().from(triageBay).where(eq(triageBay.clinicId, facility.id));
  if (bays.length === 0) {
    await db.insert(triageBay).values(
      [1, 2, 3, 4, 5].map((n) => ({
        id: crypto.randomUUID(),
        clinicId: facility.id,
        label: `Bay ${n}`,
        sortOrder: n,
        status: "available",
        detail: "Ready",
      })),
    );
    bays = await db.select().from(triageBay).where(eq(triageBay.clinicId, facility.id));
  }
  console.log("bays", bays.length);

  const caseId = crypto.randomUUID();
  await db.insert(triageCase).values({
    id: caseId,
    clinicId: facility.id,
    fullName: "Smoke Test Patient",
    ageYears: 40,
    gender: "male",
    bloodType: "O+",
    complaint: "Chest pain smoke test",
    category: "Adult cardiac",
    transportUnit: "Walk-in",
    esi: 2,
    status: "inbound",
    etaAt: new Date(Date.now() + 10 * 60_000),
    bayId: bays[0]?.id ?? null,
    createdByUserId: facility.ownerUserId,
  });

  await db.insert(triagePrepItem).values([
    {
      id: crypto.randomUUID(),
      caseId,
      label: "Smoke prep A",
      done: false,
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      caseId,
      label: "Smoke prep B",
      done: true,
      sortOrder: 2,
    },
  ]);

  await db.insert(clinicalLead).values({
    id: crypto.randomUUID(),
    clinicId: facility.id,
    name: "Dr. Smoke Lead",
    role: "Attending",
    sortOrder: 1,
    active: true,
  });

  // acknowledge + reserve bay
  await db
    .update(triageCase)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(triageCase.id, caseId));
  if (bays[0]) {
    await db
      .update(triageBay)
      .set({ status: "reserved", detail: "Smoke Test Patient · Prep" })
      .where(eq(triageBay.id, bays[0].id));
  }

  const cases = await db.select().from(triageCase).where(eq(triageCase.clinicId, facility.id));
  const prep = await db.select().from(triagePrepItem).where(eq(triagePrepItem.caseId, caseId));
  const leads = await db.select().from(clinicalLead).where(eq(clinicalLead.clinicId, facility.id));

  console.log("cases", cases.length, "prep", prep.length, "leads", leads.length);
  console.log("SMOKE_OK", caseId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
