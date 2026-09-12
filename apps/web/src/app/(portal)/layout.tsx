import { auth } from"@medi-connect/auth";
import { createDb } from"@medi-connect/db";
import { clinic } from"@medi-connect/db/schema/clinic";
import { eq } from"drizzle-orm";
import { headers } from"next/headers";
import { redirect } from"next/navigation";

import { PortalShell } from"@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const db = createDb();
  const rows = await db
    .select()
    .from(clinic)
    .where(eq(clinic.ownerUserId, session.user.id))
    .limit(1);

  return <PortalShell clinicName={rows[0]?.name}>{children}</PortalShell>;
}
