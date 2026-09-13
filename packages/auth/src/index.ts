
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
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: false,
					defaultValue: "clinic_owner",
					input: false,
				},
			},
		},
		trustedOrigins: [
			env.BETTER_AUTH_URL,
			"medi-connect://",
			"exp://",
			"exp://**",
			"http://localhost:8081",
			"http://127.0.0.1:8081",
			"http://localhost:3001",
			"http://127.0.0.1:3001",
			"http://192.168.*.*:3001",
			"http://192.168.*.*:8081",
			"http://10.0.*.*:3001",
			"http://10.0.*.*:8081",
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



