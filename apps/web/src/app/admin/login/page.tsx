import { ensureAdminUser } from "@medi-connect/api/lib/admin";

import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage() {
  await ensureAdminUser();
  return <AdminLoginForm />;
}
