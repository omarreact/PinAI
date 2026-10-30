import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Info,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { hostLabel } from "@/lib/terminal/route";
import type { ToolName, WebReport } from "@/lib/terminal/types";
import { compareReports, reportFindings, reportMarkdown } from "@/lib/terminal/report-utils";
import { downloadText } from "@/lib/terminal/download";

const OPEN: Record<ToolName, Record<string, boolean>> = {
  scan: { network: false, stack: true, hosts: true, endpoints: true, probes: true, excerpt: true },
  headers: {
    network: true,
    stack: false,
    hosts: false,
    endpoints: false,
    probes: false,
    excerpt: false,
  },
  tech: {
    network: false,
    stack: true,
    hosts: true,
    endpoints: false,
    probes: false,
    excerpt: false,
  },
  apis: {
    network: false,
    stack: false,
    hosts: true,
    endpoints: true,
    probes: true,
    excerpt: false,
  },
};

export function ReportCard({
  report,
  previous,
  onRerun,
  busy = false,
}: {
  report: WebReport;
  previous?: WebReport;
  onRerun?: () => void;
  busy?: boolean;
}) {
  const open = OPEN[report.mode];
  const host = hostLabel(report.finalUrl || report.requestedUrl);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const findings = report.findings ?? reportFindings(report);
  const changes = previous ? compareReports(report, previous) : [];

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

  function save(format: "json" | "markdown") {
    const name = `pinai-${host.replace(/[^\w.-]+/g, "_")}`;
    downloadText(
      name + (format === "json" ? ".json" : ".md"),
      format === "json" ? JSON.stringify(report, null, 2) : reportMarkdown(report, previous),
      format === "json" ? "application/json" : "text/markdown;charset=utf-8",
    );
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
          {report.contentType ? (
            <span className="text-faint">{report.contentType.split(";")[0]}</span>
          ) : null}
          <span className="text-faint">{formatBytes(report.bytes)}</span>
        </p>
        <p className="mt-2 break-all font-mono text-xs text-faint">{report.finalUrl}</p>
        {report.note ? <p className="mt-3 text-sm text-muted">{report.note}</p> : null}
        {report.description ? (
          <p className="mt-2 text-sm text-muted">{report.description}</p>
        ) : null}
        {report.retrievedAt ? (
          <p className="mt-2 text-xs text-faint">
            Captured {new Date(report.retrievedAt).toLocaleString()}
          </p>
        ) : null}
        {report.timings ? (
          <dl className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-border bg-subtle p-3">
            {(
              [
                ["Headers", report.timings.headersMs],
                ["Body", report.timings.bodyMs],
                ["Total", report.timings.totalMs],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 font-mono text-xs tabular-nums">{value} ms</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <Section title="Observations" count={findings.length} defaultOpen>
        <p className="mb-3 text-xs text-muted">
          One HTTP response, not a security audit or a test of every feature. Total timing includes
          URL validation and redirects.
        </p>
        <ul className="flex flex-col gap-3">
          {findings.map((finding) => {
            const Icon =
              finding.level === "pass"
                ? CheckCircle2
                : finding.level === "warning"
                  ? AlertTriangle
                  : Info;
            return (
              <li key={finding.id} className="flex gap-2">
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-4 shrink-0",
                    finding.level === "pass"
                      ? "text-signal"
                      : finding.level === "warning"
                        ? "text-warn"
                        : "text-muted",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="sr-only">{finding.level}: </span>
                    {finding.title}
                  </p>
                  <p className="mt-1 text-xs leading-normal text-muted">{finding.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {previous ? (
        <Section title="Changes since previous read" count={changes.length} defaultOpen>
          {changes.length ? (
            <dl className="flex flex-col gap-3">
              {changes.map((change) => (
                <div key={change.label} className="min-w-0">
                  <dt className="text-sm font-medium">{change.label}</dt>
                  <dd className="mt-1 break-words text-xs text-muted">
                    <span className="font-medium">Before: </span>
                    {change.before}
                  </dd>
                  <dd className="mt-1 break-words text-xs">
                    <span className="font-medium">Now: </span>
                    {change.after}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">
              No changes in the compared status, title, technologies, endpoints or policy headers.
              Volatile request IDs and dates are excluded.
            </p>
          )}
        </Section>
      ) : null}

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
          <div className="font-mono text-xs text-muted">reader request</div>
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
          <p className="text-sm text-muted">
            No familiar platform showed up in the HTML or headers.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {report.stack.map((hit) => (
              <li
                key={`${hit.group}-${hit.name}`}
                className="rounded-md border border-border bg-subtle px-2 py-1 text-xs"
              >
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
                <div className="font-mono text-xs tabular-nums text-muted">
                  {probe.status || "—"}
                </div>
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
        <button type="button" className={cn(actionClass, "press")} onClick={() => save("json")}>
          <Download className="size-4" aria-hidden="true" />
          Save JSON
        </button>
        <button type="button" className={cn(actionClass, "press")} onClick={() => save("markdown")}>
          <FileText className="size-4" aria-hidden="true" /> Save Markdown
        </button>
        {onRerun ? (
          <button
            type="button"
            className={cn(actionClass, "press disabled:opacity-40")}
            disabled={busy}
            onClick={onRerun}
          >
            <RotateCw className="size-4" aria-hidden="true" /> Read again
          </button>
        ) : null}
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
        {copied === "failed" ? (
          <p className="col-span-2 text-sm text-warn" role="status">
            Clipboard access was blocked. Use a save button to export the report.
          </p>
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
    <details
      className="group border-t border-border"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
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
