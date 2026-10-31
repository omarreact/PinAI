import { createFileRoute } from "@tanstack/react-router";
import { DevelopmentWorkspace } from "@/components/development-workspace";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DevelopmentWorkspace />;
}
