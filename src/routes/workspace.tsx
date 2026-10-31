import { createFileRoute } from "@tanstack/react-router";
import { AiWorkspace } from "@/components/workspace/ai-workspace";

export const Route = createFileRoute("/workspace")({ component: AiWorkspace });
