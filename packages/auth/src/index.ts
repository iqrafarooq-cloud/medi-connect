
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@medi-connect/env/server";
import { createDb } from "@medi-connect/db";
import * as schema from "@medi-connect/db/schema/auth";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
provider: "pg",


			schema: schema,
		}),
		trustedOrigins: [
			env.BETTER_AUTH_URL,
			"medi-connect://",
			"exp://",
			"http://localhost:8081",
		],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [
            nextCookies(),
            expo()
        ],
	});
}

export const auth = createAuth();



