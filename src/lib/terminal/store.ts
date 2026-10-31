import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { WELCOME } from "./engines";
import type { EngineId, Message, WebReport } from "./types";

type TerminalState = {
  engineId: EngineId;
  messages: Message[];
  lastUrl: string | null;
  notes: string[];
  turns: number;
  setEngine: (engineId: EngineId) => void;
  append: (message: Message) => void;
  patch: (id: string, partial: Partial<Message>) => void;
  setLastUrl: (lastUrl: string | null) => void;
  bump: () => void;
  addNote: (text: string) => void;
  clear: () => void;
};

function welcome(): Message {
  return { id: "welcome", role: "assistant", text: WELCOME };
}

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      engineId: "openai",
      messages: [welcome()],
      lastUrl: null,
      notes: [],
      turns: 0,
      setEngine: (engineId) => set({ engineId }),
      append: (message) => set({ messages: [...get().messages, message].slice(-60) }),
      patch: (id, partial) =>
        set({
          messages: get().messages.map((message) => (message.id === id ? { ...message, ...partial } : message)),
        }),
      setLastUrl: (lastUrl) => set({ lastUrl }),
      bump: () => set({ turns: get().turns + 1 }),
      addNote: (text) => set({ notes: [...get().notes, text].slice(-20) }),
      clear: () =>
        set({
          messages: [{ ...welcome(), id: `welcome-${Date.now()}` }],
          lastUrl: null,
          notes: [],
          turns: 0,
        }),
    }),
    {
      name: "ai-terminal-mobile",
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        engineId: state.engineId,
        messages: state.messages
          .filter((message) => !message.pending)
          .slice(-40)
          .map(slim),
        lastUrl: state.lastUrl,
        notes: state.notes,
        turns: state.turns,
      }),
    },
  ),
);

function slim(message: Message): Message {
  if (!message.report) return message;
  const report: WebReport = {
    ...message.report,
    excerpt: message.report.excerpt?.slice(0, 700) ?? null,
  };
  return { ...message, report };
}
