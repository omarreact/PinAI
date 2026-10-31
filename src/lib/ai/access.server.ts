export class AiAccessError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "AiAccessError"; }
}
const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "PINAI_GITHUB_CLIENT_ID", "PINAI_GITHUB_CLIENT_SECRET", "PINAI_ALLOWED_EMAILS"];
export function aiSetupStatus() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (!process.env.OPENAI_API_KEY?.trim()) missing.push("OPENAI_API_KEY");
  if (!process.env.OPENAI_MODEL?.trim()) missing.push("OPENAI_MODEL");
  return { ready: missing.length === 0, missing };
}
export function checkOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new AiAccessError(403, "Cross-origin requests are not permitted.");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AiAccessError(403, "Cross-site requests are not permitted.");
}
export async function requireAiUser(request: Request): Promise<string> {
  // Fail closed; never call requireUserId(), which permits a shared development identity.
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new AiAccessError(503, "AI chat requires secure authentication and a persistent database.");
  checkOrigin(request);
  const allowed = (process.env.PINAI_ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) throw new AiAccessError(503, "AI chat has no authorized accounts.");
  // Load the auth server only for configured, authorized session requests.
  const { auth } = await import("@/lib/auth/server");
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) throw new AiAccessError(401, "Sign in to use PinAI chat.");
  if (!user.email || !allowed.includes(user.email.toLowerCase())) throw new AiAccessError(403, "This account is not authorized for AI chat.");
  return user.id;
}
export function respondAiError(error: unknown): Response {
  const status = error instanceof AiAccessError ? error.status : 500;
  const message = error instanceof AiAccessError ? error.message : "The request could not be completed.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
