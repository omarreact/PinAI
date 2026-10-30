import { fingerprint, meta, pageExcerpt, pageTitle } from "./fingerprint.ts";
import { toSafeMessage } from "./guard.server.ts";
import { requestPublic, REQUEST_HEADERS, type FetchHit } from "./request.server.ts";
import { reportFindings, COMPARED_HEADERS } from "./report-utils.ts";
import type { HeaderPair, ToolName, WebReport } from "./types";

/**
 * One public GET, plus at most two polite extras (robots.txt, and
 * /wp-json/ when the page already looks like WordPress).
 * Paths found in the markup are listed. They are not crawled.
 */

const PREFERRED_HEADERS = [
  "server",
  "content-type",
  "content-length",
  "cache-control",
  "x-powered-by",
  "cf-ray",
  "via",
  "location",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export async function analyzePublicPage(rawUrl: string, mode: ToolName): Promise<WebReport> {
  const main = await requestPublic(rawUrl, 1_200_000);
  const pageHost = new URL(main.finalUrl).host;
  const html = main.textual && isMarkup(main) ? main.text : "";
  const found = fingerprint({
    html,
    headers: main.headers,
    pageHost,
  });

  const report: WebReport = {
    mode,
    requestedUrl: main.requestedUrl,
    finalUrl: main.finalUrl,
    status: main.status,
    ms: main.ms,
    timings: main.timings,
    retrievedAt: new Date().toISOString(),
    contentType: main.contentType,
    redirects: main.redirects,
    title: html ? pageTitle(html) : null,
    description: html ? clip(meta(html, "description"), 240) || null : null,
    note: found.stack.some((hit) => hit.name === "Edge challenge page")
      ? "The host returned a challenge page, so this fingerprint is the edge, not the app behind it."
      : main.truncated
        ? "The page was cut off at the size limit."
        : null,
    request: { method: "GET", url: main.finalUrl, headers: REQUEST_HEADERS },
    responseHeaders: redactHeaders(main.headers),
    stack: found.stack,
    hosts: found.hosts,
    endpoints: found.endpoints,
    probes: [],
    excerpt: excerptFor(main),
    truncated: main.truncated,
    bytes: main.bytes,
  };

  if (mode === "scan" || mode === "apis") {
    report.probes = await extraProbes(main.finalUrl, html);
  }
  report.findings = reportFindings(report);
  return report;
}

async function extraProbes(finalUrl: string, html: string): Promise<WebReport["probes"]> {
  const origin = new URL(finalUrl);
  const jobs: string[] = [new URL("/robots.txt", origin).href];
  if (/\/wp-content\/|\/wp-includes\/|\/wp-json\//i.test(html)) {
    jobs.push(new URL("/wp-json/", origin).href);
  }

  const probes: WebReport["probes"] = [];
  for (const job of jobs.slice(0, 2)) {
    probes.push(await probe(job));
  }
  return probes;
}

async function probe(rawUrl: string): Promise<WebReport["probes"][number]> {
  try {
    const hit = await requestPublic(rawUrl, 80_000);
    let note = hit.contentType ?? "no content type";
    if (hit.textual && hit.contentType?.includes("json")) {
      const keys = jsonKeys(hit.text);
      note = keys ?? hit.contentType ?? note;
    } else if (hit.textual && /robots\.txt/i.test(rawUrl)) {
      const lines = hit.text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .slice(0, 4);
      if (lines.length) note = lines.join(" | ").slice(0, 180);
    }
    return { url: hit.finalUrl, status: hit.status, note: note.slice(0, 200) };
  } catch (err) {
    return { url: rawUrl, status: 0, note: toSafeMessage(err) };
  }
}

function redactHeaders(headers: HeaderPair[]): HeaderPair[] {
  const hidden = new Set(["set-cookie", "cookie", "authorization", "proxy-authorization"]);
  const cookieCount = headers.filter((header) => header.name === "set-cookie").length;
  const visible = headers.filter(
    (header) => !hidden.has(header.name) && !/token|api-key|secret/i.test(header.name),
  );
  visible.sort((a, b) => {
    const ai = PREFERRED_HEADERS.indexOf(a.name);
    const bi = PREFERRED_HEADERS.indexOf(b.name);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });
  const clipped = visible.slice(0, 36).map((header) => ({
    name: header.name,
    // Policy tails can contain frame-ancestors and other meaningful changes.
    // Preserve the complete values used for findings and comparisons.
    value:
      !COMPARED_HEADERS.includes(header.name) && header.value.length > 300
        ? header.value.slice(0, 300) + "…"
        : header.value,
  }));
  if (cookieCount > 0) {
    clipped.push({
      name: "set-cookie",
      value: cookieCount === 1 ? "(hidden)" : `(hidden, ${cookieCount})`,
    });
  }
  return clipped;
}

function excerptFor(hit: FetchHit): string | null {
  if (!hit.textual || !hit.text) return null;
  if (hit.contentType?.includes("json") || looksLikeJson(hit.text)) {
    const pretty = prettyJson(hit.text);
    return pretty.slice(0, 700);
  }
  if (isMarkup(hit)) return pageExcerpt(hit.text);
  return hit.text.replace(/\s+/g, " ").trim().slice(0, 700) || null;
}

function isMarkup(hit: FetchHit): boolean {
  const type = hit.contentType ?? "";
  return /html|xml|svg/.test(type) || /^\s*</.test(hit.text);
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function jsonKeys(text: string): string | null {
  try {
    const json = JSON.parse(text) as unknown;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const keys = Object.keys(json).slice(0, 12);
      if (keys.length) return "keys: " + keys.join(", ");
    }
  } catch {
    // A cut-off index can still expose the first keys.
  }
  const keys: string[] = [];
  const re = /"([^"\\]{1,40})"\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) && keys.length < 12) {
    if (!keys.includes(match[1])) keys.push(match[1]);
  }
  return keys.length ? "keys: " + keys.join(", ") : null;
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}
