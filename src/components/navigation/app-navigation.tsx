import { Link, useLocation } from "@tanstack/react-router";
import { FolderKanban, MessageCircle, PanelsTopLeft, SquareTerminal } from "lucide-react";

/** One predictable mobile navigation across all PinAI application routes. */
export function AppNavigation() {
  const pathname = useLocation().pathname;
  const active = pathname === "/ai" || pathname === "/" ? "chat"
    : pathname.startsWith("/terminal") ? "terminal"
    : pathname.startsWith("/workspace") ? "projects" : "";
  return (
    <nav className="pinai-mobile-nav" aria-label="PinAI main navigation">
      <Link to="/" className="pinai-nav-link" aria-current={active === "chat" ? "page" : undefined}>
        <MessageCircle aria-hidden="true" /><span>Chat</span>
      </Link>
      <Link to="/terminal" className="pinai-nav-link" aria-current={active === "terminal" ? "page" : undefined}>
        <SquareTerminal aria-hidden="true" /><span>Terminal</span>
      </Link>
      <Link to="/workspace" className="pinai-nav-link" aria-current={active === "projects" ? "page" : undefined}>
        <FolderKanban aria-hidden="true" /><span>Projects</span>
      </Link>
      <a href="/browser-studio/index.html" className="pinai-nav-link">
        <PanelsTopLeft aria-hidden="true" /><span>Studio</span>
      </a>
    </nav>
  );
}
