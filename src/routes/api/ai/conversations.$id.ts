import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/ai/conversations/$id")({
  server: { handlers: {
    GET: async ({ request, params }) => {
      const { requireAiUser, respondAiError } = await import("@/lib/ai/access.server");
      try {
        const userId = await requireAiUser(request);
        const { getMessages } = await import("@/lib/ai/store.server");
        const messages = await getMessages(userId, params.id);
        if (!messages) return Response.json({ error: "Conversation not found." }, { status: 404 });
        return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) { return respondAiError(error); }
    },
    DELETE: async ({ request, params }) => {
      const { requireAiUser, respondAiError } = await import("@/lib/ai/access.server");
      try {
        const userId = await requireAiUser(request);
        const { deleteConversation } = await import("@/lib/ai/store.server");
        const deleted = await deleteConversation(userId, params.id);
        return Response.json({ deleted }, { status: deleted ? 200 : 404, headers: { "Cache-Control": "no-store" } });
      } catch (error) { return respondAiError(error); }
    },
  } },
});