import { createDb } from "@medi-connect/db";
import { account, user } from "@medi-connect/db/schema/auth";
import { env } from "@medi-connect/env/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@medi-connect/auth";
import { hashPassword, verifyPassword } from "@medi-connect/auth/password";

import { isAdminEmail } from "./clinic-verification";

let ensurePromise: Promise<void> | null = null;

export function getAdminEmail() {
  return env.ADMIN_EMAIL;
}

export function sessionIsAdmin(email: string | null | undefined) {
  if (!email) return false;
  return isAdminEmail(email, env.ADMIN_EMAIL);
}

async function syncAdminPassword(userId: string) {
  const db = createDb();
  const rows = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  const row = rows[0];
  if (!row?.password) {
    const hashed = await hashPassword(env.ADMIN_PASSWORD);
    if (row) {
      await db.update(account).set({ password: hashed }).where(eq(account.id, row.id));
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        issuer: "local:credential",
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return;
  }

  const matches = await verifyPassword({
    hash: row.password,
    password: env.ADMIN_PASSWORD,
  });
  if (matches) return;

  const hashed = await hashPassword(env.ADMIN_PASSWORD);
  await db.update(account).set({ password: hashed }).where(eq(account.id, row.id));
}

/** Idempotently create/sync the single system admin from env credentials. */
export async function ensureAdminUser() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const db = createDb();
      const existing = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, env.ADMIN_EMAIL))
        .limit(1);

      if (existing[0]) {
        await syncAdminPassword(existing[0].id);
        return;
      }

      try {
        await auth.api.signUpEmail({
          body: {
            email: env.ADMIN_EMAIL,
            password: env.ADMIN_PASSWORD,
            name: "MediConnect Admin",
          },
        });
      } catch (error) {
        const again = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, env.ADMIN_EMAIL))
          .limit(1);
        if (!again[0]) throw error;
        await syncAdminPassword(again[0].id);
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}
