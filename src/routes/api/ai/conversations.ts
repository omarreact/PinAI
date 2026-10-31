import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/ai/conversations")({
  server: { handlers: { GET: async ({ request }) => {
    const { requireAiUser, respondAiError } = await import("@/lib/ai/access.server");
    try {
      const userId = await requireAiUser(request);
      const { listConversations } = await import("@/lib/ai/store.server");
      return Response.json({ conversations: await listConversations(userId) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return respondAiError(error); }
  } } },
});