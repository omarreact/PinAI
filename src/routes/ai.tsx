import { createFileRoute } from "@tanstack/react-router";
import { PinAiChat } from "@/components/ai/pinai-chat";
export const Route = createFileRoute("/ai")({ component: PinAiChat });
