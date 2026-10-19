import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Copy, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { hostLabel } from "@/lib/terminal/route";
import type { ToolName, WebReport } from "@/lib/terminal/types";

const OPEN: Record<ToolName, Record<string, boolean>> = {
  scan: { network: false, stack: true, hosts: true, endpoints: true, probes: true, excerpt: true },
  headers: { network: true, stack: false, hosts: false, endpoints: false, probes: false, excerpt: false },
  tech: { network: false, stack: true, hosts: true, endpoints: false, probes: false, excerpt: false },
  apis: { network: false, stack: false, hosts: true, endpoints: true, probes: true, excerpt: false },
};

export function ReportCard({ report }: { report: WebReport }) {
  const open = OPEN[report.mode];
  const host = hostLabel(report.finalUrl || report.requestedUrl);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flash(key: string) {
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1400);
  }

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      flash(key);
    } catch {
      flash("failed");
    }
  }

  function save() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `terminal-${host.replace(/[^\w.-]+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  const statusClass =
    report.status >= 400 ? "text-danger" : report.status >= 300 ? "text-warn" : "text-foreground";

  return (
    <article className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-4">
        <h2 className="break-all text-base font-medium">{host}</h2>
        {report.title ? <p className="mt-1 text-sm text-muted">{report.title}</p> : null}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
          <span className={statusClass}>{report.status || "—"}</span>
          <span className="text-muted">{report.ms} ms</span>
          {report.contentType ? <span className="text-faint">{report.contentType.split(";")[0]}</span> : null}
          <span className="text-faint">{formatBytes(report.bytes)}</span>
        </p>
        <p className="mt-2 break-all font-mono text-xs text-faint">{report.finalUrl}</p>
        {report.note ? <p className="mt-3 text-sm text-muted">{report.note}</p> : null}
        {report.description ? <p className="mt-2 text-sm text-muted">{report.description}</p> : null}
      </div>

      {report.redirects.length > 1 ? (
        <Section title="Redirects" count={report.redirects.length} defaultOpen>
          <ol className="flex flex-col gap-2">
            {report.redirects.map((hop, index) => (
              <li key={`${hop.url}-${index}`} className="min-w-0">
                <div className="font-mono text-xs tabular-nums text-muted">
                  {hop.status} · {hop.ms} ms
                </div>
                <div className="break-all font-mono text-xs">{hop.url}</div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section title="Network" count={report.responseHeaders.length} defaultOpen={open.network}>
        <div className="mb-3">
          <div className="font-mono text-xs text-muted">request</div>
          <div className="mt-1 break-all font-mono text-xs">
            {report.request.method} {report.request.url}
          </div>
          {report.request.headers.map((header) => (
            <div key={header.name} className="mt-2 min-w-0">
              <div className="font-mono text-xs text-faint">{header.name}</div>
              <div className="break-all font-mono text-xs">{header.value}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <div className="font-mono text-xs text-muted">response</div>
          <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-auto">
            {report.responseHeaders.map((header, index) => (
              <div key={`${header.name}-${index}`} className="min-w-0">
                <div className="font-mono text-xs text-faint">{header.name}</div>
                <div className="break-all font-mono text-xs">{header.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Stack" count={report.stack.length} defaultOpen={open.stack}>
        {report.stack.length === 0 ? (
          <p className="text-sm text-muted">No familiar platform showed up in the HTML or headers.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {report.stack.map((hit) => (
              <li key={`${hit.group}-${hit.name}`} className="rounded-md border border-border bg-subtle px-2 py-1 text-xs">
                <span className="text-muted">{hit.group}</span>
                <span className="text-faint"> / </span>
                <span>{hit.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Hosts" count={report.hosts.length} defaultOpen={open.hosts}>
        {report.hosts.length === 0 ? (
          <p className="text-sm text-muted">No third-party hosts on this page.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
            {report.hosts.map((hostHit) => (
              <li key={hostHit.host} className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="break-all font-mono text-xs">{hostHit.host}</span>
                <span className="shrink-0 font-mono text-xs text-faint">{hostHit.role}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Endpoints" count={report.endpoints.length} defaultOpen={open.endpoints}>
        {report.endpoints.length === 0 ? (
          <p className="text-sm text-muted">No API-style paths were named in the markup.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
            {report.endpoints.map((endpoint) => (
              <li key={endpoint} className="break-all font-mono text-xs">
                {endpoint}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {report.probes.length > 0 ? (
        <Section title="Checked paths" count={report.probes.length} defaultOpen={open.probes}>
          <ul className="flex flex-col gap-3">
            {report.probes.map((probe) => (
              <li key={probe.url} className="min-w-0">
                <div className="font-mono text-xs tabular-nums text-muted">{probe.status || "—"}</div>
                <div className="break-all font-mono text-xs">{probe.url}</div>
                <p className="mt-1 text-sm text-muted">{probe.note}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Excerpt" defaultOpen={open.excerpt}>
        {report.excerpt ? (
          <p className="text-sm leading-normal text-foreground">{report.excerpt}</p>
        ) : (
          <p className="text-sm text-muted">No text body on this response.</p>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
        <button
          type="button"
          className={cn(actionClass, "press")}
          onClick={() => copy("json", JSON.stringify(report, null, 2))}
        >
          <Copy className="size-4" aria-hidden="true" />
          {copied === "json" ? "Copied" : "Copy JSON"}
        </button>
        <button type="button" className={cn(actionClass, "press")} onClick={save}>
          <Download className="size-4" aria-hidden="true" />
          Save report
        </button>
        {report.excerpt ? (
          <button
            type="button"
            className={cn(actionClass, "press col-span-2")}
            onClick={() => copy("text", report.excerpt ?? "")}
          >
            <Copy className="size-4" aria-hidden="true" />
            {copied === "text" ? "Copied" : copied === "failed" ? "Copy blocked" : "Copy text"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Section({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <details className="group border-t border-border" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {typeof count === "number" ? (
            <span className="font-mono text-xs text-muted tabular-nums">{count}</span>
          ) : null}
          <ChevronDown className="size-4 text-faint motion-safe:transition-transform motion-safe:duration-150 group-open:rotate-180" />
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

const actionClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-subtle px-3 text-sm font-medium text-foreground";
