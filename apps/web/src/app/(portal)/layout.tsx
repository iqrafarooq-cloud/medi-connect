import { auth } from "@medi-connect/auth";
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import { sessionIsAdmin } from "@medi-connect/api/lib/admin";
import type { Route } from "next";
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

  if (session.user.role === "patient") {
    redirect("/login");
  }

  if (sessionIsAdmin(session.user.email)) {
    redirect("/admin" as Route);
  }

  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    redirect("/login");
  }

  return <PortalShell clinicName={facility.name}>{children}</PortalShell>;
}
