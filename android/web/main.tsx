import { createRoot } from "react-dom/client";
import { DevelopmentWorkspace } from "@/components/development-workspace";
import "./mobile.css";
import "./native-bridge";

export function AndroidApp() {
  return (
    <div className="android-app">
      <div className="android-toolbar">
        <span className="font-medium">
          PinAI <span className="text-faint">/ Android</span>
        </span>
        <button
          type="button"
          onClick={() => window.PinAIAndroid?.configureKey()}
          className="press min-h-11 rounded-md border border-border px-3"
        >
          Grok key
        </button>
      </div>
      <div className="android-terminal">
        <DevelopmentWorkspace />
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<AndroidApp />);
