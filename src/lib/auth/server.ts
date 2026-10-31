/** PinAI-owned GitHub login. No broker, shared preview tokens or development identities. */
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { getPglite } from "../db";
import { pgliteDialect } from "./pglite-dialect";

const read = (key: string): string | undefined => process.env[key]?.trim() || undefined;
const baseURL = read("BETTER_AUTH_URL") ?? "http://localhost:8080";
const clientId = read("PINAI_GITHUB_CLIENT_ID");
const clientSecret = read("PINAI_GITHUB_CLIENT_SECRET");
const databaseUrl = read("DATABASE_URL");
const production = process.env.NODE_ENV === "production";

/** Fail closed when the user's own authentication infrastructure is missing. */
export const authConfigured = Boolean(
  read("BETTER_AUTH_SECRET") && read("BETTER_AUTH_URL") &&
  clientId && clientSecret && databaseUrl && read("PINAI_ALLOWED_EMAILS"),
);

const devSecretRef = globalThis as typeof globalThis & { __pinaiDevSessionSecret__?: string };
devSecretRef.__pinaiDevSessionSecret__ ??= randomBytes(32).toString("hex");
const secret = read("BETTER_AUTH_SECRET") ?? devSecretRef.__pinaiDevSessionSecret__;

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const auth = betterAuth({
  baseURL,
  secret,
  database,
  trustedOrigins: [baseURL, "http://localhost:8080", "http://127.0.0.1:8080"],
  ...(clientId && clientSecret
    ? { socialProviders: { github: { clientId, clientSecret, scope: ["user:email"] } } }
    : {}),
  account: { encryptOAuthTokens: true },
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  advanced: { useSecureCookies: production },
  plugins: [tanstackStartCookies()],
});
