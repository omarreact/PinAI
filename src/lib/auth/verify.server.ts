import { getRequest } from "@tanstack/react-start/server";

/** No anonymous development user when connected to a persistent database. */
export const DEV_USER_ID = "disabled";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() { super("Unauthorized"); this.name = "UnauthorizedError"; }
}
export type VerifiedUser = { id: string; email: string | null };

export async function getSessionUser(): Promise<VerifiedUser | null> {
  const { authConfigured, auth } = await import("./server");
  if (!authConfigured) return null;
  const request = getRequest();
  if (!request) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return null;
  const allowed = (process.env.PINAI_ALLOWED_EMAILS ?? "")
    .split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(email)) return null;
  return { id: user.id, email };
}
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
