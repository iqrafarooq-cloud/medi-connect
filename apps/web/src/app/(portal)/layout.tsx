import { auth } from "@medi-connect/auth";
<<<<<<< Updated upstream
import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { eq } from "drizzle-orm";
=======
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import { sessionIsAdmin } from "@medi-connect/api/lib/admin";
import type { Route } from "next";
>>>>>>> Stashed changes
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

<<<<<<< Updated upstream
  if (session.user.role === "patient") {
    redirect("/login");
  }

  const db = createDb();
  const rows = await db
    .select()
    .from(clinic)
    .where(eq(clinic.ownerUserId, session.user.id))
    .limit(1);
=======
  if (sessionIsAdmin(session.user.email)) {
    redirect("/admin" as Route);
  }
>>>>>>> Stashed changes

  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    redirect("/login");
  }

  return <PortalShell clinicName={facility.name}>{children}</PortalShell>;
}
