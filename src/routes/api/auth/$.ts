import { createFileRoute } from "@tanstack/react-router";

/** Refuse to expose even the OAuth handler when deployment secrets are incomplete. */
async function handle(request: Request): Promise<Response> {
  const { auth, authConfigured } = await import("@/lib/auth/server");
  if (!authConfigured) {
    return Response.json({ error: "PinAI authentication is not configured." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  return auth.handler(request);
}
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
