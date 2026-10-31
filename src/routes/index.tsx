import { createFileRoute } from "@tanstack/react-router";
import { PinAiChat } from "@/components/ai/pinai-chat";

/** The primary PinAI experience; /ai remains a backward-compatible alias. */
export const Route = createFileRoute("/")({ component: PinAiChat });
