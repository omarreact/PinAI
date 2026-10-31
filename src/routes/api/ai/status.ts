import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/ai/status")({
  server: { handlers: { GET: async () => {
    const { aiSetupStatus } = await import("@/lib/ai/access.server");
    const status = aiSetupStatus();
    return Response.json({ ready: status.ready, setupRequired: !status.ready }, { headers: { "Cache-Control": "no-store" } });
  } } },
});