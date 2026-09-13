import { auth } from "@medi-connect/auth";
import { ensureAdminUser, sessionIsAdmin } from "@medi-connect/api/lib/admin";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAdminUser();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/admin/login" as Route);
  }

  if (!sessionIsAdmin(session.user.email)) {
    redirect("/login");
  }

  return children;
}
