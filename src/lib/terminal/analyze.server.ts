import { fingerprint, meta, pageExcerpt, pageTitle } from "./fingerprint";
import { PublicUrlError, SafeError, assertPublicUrl, toSafeMessage } from "./guard.server";
import type { HeaderPair, Hop, ToolName, WebReport } from "./types";

/**
 * One public GET, plus at most two polite extras (robots.txt, and
 * /wp-json/ when the page already looks like WordPress).
 * Paths found in the markup are listed. They are not crawled.
 */

const UA = "AITerminalMobile/1.0 (public page reader)";
const REQUEST_HEADERS: HeaderPair[] = [
  { name: "user-agent", value: UA },
  { name: "accept", value: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
  { name: "accept-language", value: "en" },
];

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
];

type FetchHit = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  ms: number;
  contentType: string | null;
  redirects: Hop[];
  headers: HeaderPair[];
  text: string;
  bytes: number;
  truncated: boolean;
  textual: boolean;
};

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

async function requestPublic(rawUrl: string, maxBytes: number): Promise<FetchHit> {
  let current = await assertPublicUrl(rawUrl);
  const requestedUrl = current.href;
  const redirects: Hop[] = [];
  const seen = new Set<string>();

  for (let hop = 0; hop < 5; hop += 1) {
    if (seen.has(current.href)) throw new SafeError("The redirects looped.");
    seen.add(current.href);

    const started = Date.now();
    const response = await fetchOnce(current);
    const ms = Date.now() - started;
    redirects.push({ url: current.href, status: response.status, ms });

    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) break;
      let next: URL;
      try {
        next = await assertPublicUrl(new URL(location, current).href);
      } catch (err) {
        if (err instanceof PublicUrlError || err instanceof SafeError) throw err;
        throw new PublicUrlError("A redirect left the public web and was blocked.");
      }
      current = next;
      continue;
    }

    const contentType = response.headers.get("content-type");
    const headers = collectHeaders(response.headers);
    const textual = isTextual(contentType);
    let text = "";
    let bytes = 0;
    let truncated = false;
    if (textual) {
      const body = await readLimited(response, maxBytes);
      text = body.text;
      bytes = body.bytes;
      truncated = body.truncated;
    } else {
      const length = Number(response.headers.get("content-length"));
      bytes = Number.isFinite(length) ? length : 0;
      await response.body?.cancel();
    }

    return {
      requestedUrl,
      finalUrl: current.href,
      status: response.status,
      ms: redirects.reduce((sum, item) => sum + item.ms, 0),
      contentType,
      redirects,
      headers,
      text,
      bytes,
      truncated,
      textual,
    };
  }

  throw new SafeError("Too many redirects.");
}

async function fetchOnce(url: URL): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "user-agent": UA,
        accept: REQUEST_HEADERS[1].value,
        "accept-language": "en",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SafeError("The host took too long to answer.");
    }
    throw new SafeError("Could not reach that host.");
  } finally {
    clearTimeout(timer);
  }
}

async function readLimited(res: Response, maxBytes: number): Promise<{ text: string; bytes: number; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: "", bytes: 0, truncated: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (bytes + value.byteLength > maxBytes) {
      const room = maxBytes - bytes;
      if (room > 0) chunks.push(value.slice(0, room));
      bytes = maxBytes;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    bytes += value.byteLength;
  }
  const buf = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(buf), bytes, truncated };
}

function collectHeaders(headers: Headers): HeaderPair[] {
  const pairs: HeaderPair[] = [];
  headers.forEach((value, name) => {
    pairs.push({ name: name.toLowerCase(), value });
  });
  return pairs;
}

function redactHeaders(headers: HeaderPair[]): HeaderPair[] {
  const hidden = new Set(["set-cookie", "cookie", "authorization", "proxy-authorization"]);
  const cookieCount = headers.filter((header) => header.name === "set-cookie").length;
  const visible = headers.filter((header) => !hidden.has(header.name) && !/token|api-key|secret/i.test(header.name));
  visible.sort((a, b) => {
    const ai = PREFERRED_HEADERS.indexOf(a.name);
    const bi = PREFERRED_HEADERS.indexOf(b.name);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });
  const clipped = visible.slice(0, 36).map((header) => ({
    name: header.name,
    value: header.value.length > 300 ? header.value.slice(0, 300) + "…" : header.value,
  }));
  if (cookieCount > 0) {
    clipped.push({ name: "set-cookie", value: cookieCount === 1 ? "(hidden)" : `(hidden, ${cookieCount})` });
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

function isTextual(contentType: string | null): boolean {
  if (!contentType) return true;
  return /text\/|json|xml|javascript|svg|urlencoded/.test(contentType);
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

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}
