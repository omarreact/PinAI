import type { Message, ReportFinding, WebReport } from "./types";

export type ReportChange = { label: string; before: string; after: string };
const COMPARED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cache-control",
];

function headersOf(report: WebReport) {
  return new Map(report.responseHeaders.map(({ name, value }) => [name.toLowerCase(), value]));
}

/** Observations from one response, not a vulnerability or compliance verdict. */
export function reportFindings(report: WebReport): ReportFinding[] {
  const headers = headersOf(report);
  const html = /html/i.test(report.contentType ?? "");
  const secure = report.finalUrl.startsWith("https:");
  const findings: ReportFinding[] = [
    {
      id: "status",
      level: report.status >= 200 && report.status < 400 ? "pass" : "warning",
      title: `HTTP ${report.status}`,
      detail:
        report.status >= 400
          ? "The server returned an error. Check the response before treating this as the intended page."
          : "The reader received a successful HTTP response. This does not verify interactive features.",
    },
    {
      id: "https",
      level: secure ? "pass" : "warning",
      title: secure ? "HTTPS response" : "Unencrypted HTTP response",
      detail: secure
        ? "The final request used HTTPS."
        : "Use HTTPS for this page and redirect HTTP visitors to it.",
    },
  ];
  if (html) {
    const csp = headers.get("content-security-policy") ?? "";
    findings.push({
      id: "csp",
      level: csp ? "pass" : "warning",
      title: csp ? "Content Security Policy header present" : "No Content Security Policy header",
      detail: csp
        ? "A header was supplied. Its directives and effectiveness need review; presence alone is not a security guarantee."
        : "Consider a Content-Security-Policy response header that matches the application's scripts, styles and connections. A policy supplied in HTML was not evaluated.",
    });
    const frame = headers.get("x-frame-options")?.trim().toLowerCase();
    const framed =
      /(?:^|;)\s*frame-ancestors\s+[^;]+/i.test(csp) || frame === "deny" || frame === "sameorigin";
    findings.push({
      id: "framing",
      level: framed ? "pass" : "warning",
      title: framed ? "Framing policy supplied" : "No framing restriction observed",
      detail: framed
        ? "The response supplies frame-ancestors or X-Frame-Options. Review the permitted origins for this application."
        : "Consider CSP frame-ancestors to define who may embed the page. Some applications intentionally allow embedding.",
    });
    findings.push({
      id: "title",
      level: report.title ? "pass" : "info",
      title: report.title ? "Page title found" : "No page title in this response",
      detail: report.title
        ? "A title was extracted from the HTML response."
        : "Add a descriptive title, or check whether this page requires JavaScript to render its content.",
    });
  }
  if (secure)
    findings.push({
      id: "hsts",
      level: headers.has("strict-transport-security") ? "pass" : "info",
      title: headers.has("strict-transport-security")
        ? "HSTS header present"
        : "No HSTS header observed",
      detail: headers.has("strict-transport-security")
        ? "Review max-age and domain coverage before relying on this policy."
        : "Consider Strict-Transport-Security after confirming HTTPS works for the intended host and subdomains.",
    });
  findings.push({
    id: "nosniff",
    level:
      headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff" ? "pass" : "info",
    title:
      headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff"
        ? "MIME sniffing disabled"
        : "No nosniff policy observed",
    detail:
      "X-Content-Type-Options: nosniff helps browsers enforce the supplied content type. The content type itself still needs to be correct.",
  });
  if (html)
    findings.push({
      id: "referrer",
      level: headers.has("referrer-policy") ? "pass" : "info",
      title: headers.has("referrer-policy")
        ? "Referrer policy supplied"
        : "No explicit referrer policy",
      detail: headers.has("referrer-policy")
        ? "Review the policy for the information this app puts in URLs."
        : "The browser's default applies. Consider an explicit policy when URL privacy matters.",
    });
  if (report.truncated)
    findings.push({
      id: "truncated",
      level: "warning",
      title: "Response reached the size limit",
      detail:
        "Only the bounded response prefix was inspected; technologies and endpoints beyond it may be missing.",
    });
  if (report.note && /challenge/i.test(report.note))
    findings.push({
      id: "challenge",
      level: "warning",
      title: "An edge challenge was returned",
      detail:
        "These results describe the challenge response rather than the application behind it.",
    });
  return findings;
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
}

export function sameReportTarget(a: WebReport, b: WebReport) {
  return (
    canonicalUrl(a.requestedUrl) === canonicalUrl(b.requestedUrl) ||
    canonicalUrl(a.finalUrl) === canonicalUrl(b.finalUrl)
  );
}

export function previousReport(
  messages: Message[],
  index: number,
  current: WebReport,
): WebReport | undefined {
  for (let i = index - 1; i >= 0; i -= 1) {
    const report = messages[i].report;
    if (report && sameReportTarget(report, current)) return report;
  }
}

export function compareReports(current: WebReport, previous: WebReport): ReportChange[] {
  if (!sameReportTarget(current, previous)) return [];
  const changes: ReportChange[] = [];
  const compare = (label: string, before: string, after: string) => {
    if (before !== after)
      changes.push({ label, before: before || "Not observed", after: after || "Not observed" });
  };
  compare("HTTP status", String(previous.status), String(current.status));
  compare("Final address", previous.finalUrl, current.finalUrl);
  compare("Page title", previous.title ?? "", current.title ?? "");
  compare("Content type", previous.contentType ?? "", current.contentType ?? "");
  const set = (items: string[]) => [...new Set(items)].sort().join(", ");
  compare(
    "Technology stack",
    set(previous.stack.map((hit) => `${hit.group}: ${hit.name}`)),
    set(current.stack.map((hit) => `${hit.group}: ${hit.name}`)),
  );
  compare("Endpoints", set(previous.endpoints), set(current.endpoints));
  const before = headersOf(previous),
    after = headersOf(current);
  for (const header of COMPARED_HEADERS)
    compare(header, before.get(header) ?? "", after.get(header) ?? "");
  return changes;
}

function md(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_[\]|]/g, "\\$&")
    .replace(/\r?\n/g, " ");
}

function block(value: string) {
  const runs = value.match(/~+/g) ?? [];
  const fence = "~".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  return `${fence}\n${value}\n${fence}`;
}

export function reportMarkdown(report: WebReport, previous?: WebReport): string {
  const findings = report.findings ?? reportFindings(report);
  const lines = [
    "# PinAI page report",
    "",
    `Address: ${md(report.finalUrl)}`,
    `Title: ${md(report.title ?? "Not observed")}`,
    `Content type: ${md(report.contentType ?? "Not supplied")}`,
    `Captured: ${report.retrievedAt ? md(report.retrievedAt) : "Not recorded in this older report"}`,
    `HTTP: ${report.status} · ${report.ms} ms · ${report.bytes} bytes`,
    "",
    "## Observations",
    "",
    "These are observations from one HTTP response, not a security audit or a test of all app functionality.",
    "",
    ...findings.map(
      (finding) =>
        `- **${finding.level.toUpperCase()}: ${md(finding.title)}** — ${md(finding.detail)}`,
    ),
  ];
  if (report.timings)
    lines.push(
      "",
      `Timing: headers ${report.timings.headersMs} ms; body ${report.timings.bodyMs} ms; total ${report.timings.totalMs} ms. Total also includes URL validation and redirects.`,
    );
  if (previous && sameReportTarget(report, previous)) {
    const changes = compareReports(report, previous);
    lines.push(
      "",
      "## Changes since previous read",
      "",
      ...(changes.length
        ? changes.map(
            (change) => `- **${md(change.label)}**: ${md(change.before)} → ${md(change.after)}`,
          )
        : ["No changes in the compared status, title, technologies, endpoints or policy headers."]),
    );
  }
  lines.push(
    "",
    "## Reader request",
    "",
    block(
      `${report.request.method} ${report.request.url}\n${report.request.headers.map((h) => `${h.name}: ${h.value}`).join("\n")}`,
    ),
  );
  lines.push(
    "",
    "## Response headers",
    "",
    block(report.responseHeaders.map((h) => `${h.name}: ${h.value}`).join("\n")),
  );
  lines.push(
    "",
    "## Technologies",
    "",
    ...report.stack.map((hit) => `- ${md(hit.group)}: ${md(hit.name)}`),
  );
  lines.push(
    "",
    "## Third-party hosts",
    "",
    ...report.hosts.map((host) => `- ${md(host.host)} (${md(host.role)})`),
  );
  lines.push(
    "",
    "## Paths named in the response",
    "",
    block(report.endpoints.join("\n") || "None observed"),
  );
  if (report.probes.length)
    lines.push(
      "",
      "## Checked paths",
      "",
      ...report.probes.map((probe) => `- ${probe.status}: ${md(probe.url)} — ${md(probe.note)}`),
    );
  if (report.excerpt) lines.push("", "## Response excerpt", "", block(report.excerpt));
  if (report.note) lines.push("", `Reader note: ${md(report.note)}`);
  return lines.join("\n") + "\n";
}

export function sessionMarkdown(messages: Message[], notes: string[]): string {
  const lines = [
    "# PinAI session",
    "",
    "History and notes exported from this device.",
    "",
    "## Notes",
    "",
    ...notes.map((note) => `- ${md(note)}`),
  ];
  messages.forEach((message, index) => {
    if (message.pending) return;
    lines.push("", `## ${message.role === "user" ? "You" : "PinAI"}`, "", block(message.text));
    if (message.report)
      lines.push(
        "",
        reportMarkdown(message.report, previousReport(messages, index, message.report)),
      );
  });
  return lines.join("\n") + "\n";
}

export function messageMatches(message: Message, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle || message.pending) return true;
  return [
    message.text,
    message.report?.title,
    message.report?.finalUrl,
    ...(message.report?.stack.map((hit) => hit.name) ?? []),
  ].some((text) => text?.toLocaleLowerCase().includes(needle));
}
