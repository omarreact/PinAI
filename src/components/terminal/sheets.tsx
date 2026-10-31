import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  ARCHITECTURE,
  LIVE_ENGINES,
  UNAVAILABLE_ENGINES,
  engineById,
} from "@/lib/terminal/engines";
import { hostLabel } from "@/lib/terminal/route";
import { useTerminal } from "@/lib/terminal/store";
import { cn } from "@/lib/cn";
import { downloadText } from "@/lib/terminal/download";
import { sessionMarkdown } from "@/lib/terminal/report-utils";

export function EngineSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const engineId = useTerminal((state) => state.engineId);
  const setEngine = useTerminal((state) => state.setEngine);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Engine"
      description="Choose what a message does."
    >
      <ul className="flex flex-col gap-2">
        {LIVE_ENGINES.map((engine) => {
          const selected = engine.id === engineId;
          return (
            <li key={engine.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  setEngine(engine.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "press flex min-h-11 w-full flex-col items-start rounded-md border px-3 py-3 text-left",
                  selected ? "border-foreground bg-subtle" : "border-border bg-background",
                )}
              >
                <span className="text-sm font-medium">{engine.name}</span>
                <span className="mt-1 text-sm text-muted">{engine.detail}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="mb-2 mt-6 text-sm font-medium text-muted">Not connected</h3>
      <ul className="flex flex-col gap-2">
        {UNAVAILABLE_ENGINES.map((engine) => (
          <li key={engine.name} className="rounded-md border border-border px-3 py-3 opacity-70">
            <div className="text-sm font-medium">{engine.name}</div>
            <p className="mt-1 text-sm text-muted">{engine.detail}</p>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function SessionSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const engineId = useTerminal((state) => state.engineId);
  const lastUrl = useTerminal((state) => state.lastUrl);
  const notes = useTerminal((state) => state.notes);
  const turns = useTerminal((state) => state.turns);
  const clear = useTerminal((state) => state.clear);
  const messages = useTerminal((state) => state.messages);
  const exportedMessages = messages.filter((message) => !message.pending).slice(-40);
  const [confirm, setConfirm] = useState(false);
  const engine = engineById(engineId);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Session"
      description="What this chat keeps, and what it refuses."
    >
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Engine" value={engine.name} />
        <Stat label="Turns" value={String(turns)} />
        <div className="col-span-2">
          <dt className="text-xs text-muted">Last site</dt>
          <dd className="mt-1 break-all font-mono text-sm">
            {lastUrl ? hostLabel(lastUrl) : "None yet"}
          </dd>
        </div>
      </dl>

      <h3 className="mb-2 mt-6 text-sm font-medium">Notes</h3>
      {notes.length === 0 ? (
        <p className="text-sm text-muted">
          No notes yet. Send /note and a line to keep it on this device.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note, index) => (
            <li
              key={`${note}-${index}`}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 mt-6 text-sm font-medium">How a turn runs</h3>
      <ol className="flex flex-col gap-3">
        {ARCHITECTURE.map((step) => (
          <li key={step.k} className="flex gap-3">
            <span className="font-mono text-xs text-faint">{step.k}</span>
            <p className="text-sm text-muted">{step.t}</p>
          </li>
        ))}
      </ol>

      <h3 className="mb-2 mt-6 text-sm font-medium">Export this session</h3>
      <p className="mb-3 text-sm text-muted">
        Save completed messages, reports and notes from this device.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="press h-11 rounded-md border border-border text-sm"
          onClick={() => {
            const data = {
              version: 1,
              exportedAt: new Date().toISOString(),
              engine: engineId,
              turns,
              lastUrl,
              notes,
              messages: exportedMessages,
            };
            downloadText("pinai-session.json", JSON.stringify(data, null, 2), "application/json");
          }}
        >
          Save JSON
        </button>
        <button
          type="button"
          className="press h-11 rounded-md border border-border text-sm"
          onClick={() => {
            downloadText(
              "pinai-session.md",
              sessionMarkdown(exportedMessages, notes),
              "text/markdown;charset=utf-8",
            );
          }}
        >
          Save Markdown
        </button>
      </div>

      <button
        type="button"
        className="press mt-6 h-11 w-full rounded-md border border-border text-sm font-medium text-danger"
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          clear();
          setConfirm(false);
          onOpenChange(false);
        }}
      >
        {confirm ? "Confirm clear" : "Clear history"}
      </button>
    </Sheet>
  );
}

export function ArchitectureList() {
  return (
    <ol className="flex flex-col gap-4">
      {ARCHITECTURE.map((step) => (
        <li key={step.k}>
          <div className="font-mono text-xs text-faint">{step.k}</div>
          <p className="mt-1 text-sm text-muted">{step.t}</p>
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex justify-center outline-none">
          <div className="sheet-panel safe-bottom max-h-dvh w-full overflow-y-auto rounded-t-xl border border-border bg-card p-4 md:mb-8 md:max-w-md md:rounded-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close"
                className="press inline-flex size-11 items-center justify-center rounded-md border border-border"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
