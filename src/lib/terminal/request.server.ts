import { assertPublicUrl, PublicUrlError, SafeError } from "./guard.server.ts";
import type { HeaderPair, Hop } from "./types";

export const REQUEST_HEADERS: HeaderPair[] = [
  { name: "user-agent", value: "PinAI/1.1 (public page reader)" },
  { name: "accept", value: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
  { name: "accept-language", value: "en" },
];

export type FetchHit = {
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
  timings: { headersMs: number; bodyMs: number; totalMs: number };
};

type ReaderOptions = {
  timeoutMs?: number;
  /** Test dependencies; never accepted from a client request. */
  validateUrl?: typeof assertPublicUrl;
  fetchImpl?: typeof fetch;
};

const timeoutError = () =>
  new SafeError("The page took too long to finish. Try again in a moment.");

/** Covers DNS validation, all redirect hops, and the response body with one budget. */
export async function requestPublic(
  rawUrl: string,
  maxBytes: number,
  options: ReaderOptions = {},
): Promise<FetchHit> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_200_000)
    throw new SafeError("Invalid page size limit.");
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  const validate = options.validateUrl ?? assertPublicUrl;
  const read = options.fetchImpl ?? fetch;
  const started = performance.now();
  let response: Response | undefined;
  try {
    let current = await abortable(validate(rawUrl), signal);
    const requestedUrl = current.href;
    const redirects: Hop[] = [];
    const seen = new Set<string>();
    let headersMs = 0;
    for (let hop = 0; hop < 5; hop += 1) {
      if (seen.has(current.href)) throw new SafeError("The redirects looped.");
      seen.add(current.href);
      const headerStart = performance.now();
      response = await abortable(
        read(current.href, {
          method: "GET",
          redirect: "manual",
          signal,
          cache: "no-store",
          headers: Object.fromEntries(REQUEST_HEADERS.map(({ name, value }) => [name, value])),
        }),
        signal,
      );
      const hopMs = Math.round(performance.now() - headerStart);
      headersMs += hopMs;
      redirects.push({ url: current.href, status: response.status, ms: hopMs });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        cancelBody(response);
        response = undefined;
        if (!location) throw new SafeError("The host returned a redirect without a destination.");
        current = await abortable(validate(new URL(location, current).href), signal);
        continue;
      }
      const contentType = response.headers.get("content-type");
      const textual =
        !contentType || /text\/|json|xml|javascript|svg|urlencoded/i.test(contentType);
      const bodyStart = performance.now();
      let body = { text: "", bytes: 0, truncated: false };
      if (textual) body = await readLimited(response, maxBytes, signal);
      else {
        const length = Number(response.headers.get("content-length"));
        body.bytes = Number.isFinite(length) && length > 0 ? length : 0;
        cancelBody(response);
      }
      const bodyMs = Math.round(performance.now() - bodyStart);
      const totalMs = Math.round(performance.now() - started);
      return {
        requestedUrl,
        finalUrl: current.href,
        status: response.status,
        ms: totalMs,
        contentType,
        redirects,
        headers: Array.from(response.headers, ([name, value]) => ({
          name: name.toLowerCase(),
          value,
        })),
        ...body,
        textual,
        timings: { headersMs, bodyMs, totalMs },
      };
    }
    throw new SafeError("Too many redirects.");
  } catch (err) {
    controller.abort();
    if (err instanceof PublicUrlError || err instanceof SafeError) throw err;
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"))
      throw timeoutError();
    throw new SafeError("Could not reach that host.");
  } finally {
    clearTimeout(timer);
    if (response && !response.bodyUsed) cancelBody(response);
  }
}

function cancelBody(response: Response) {
  void response.body?.cancel().catch(() => {});
}

function abortable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(timeoutError());
  return new Promise((resolve, reject) => {
    const abort = () => reject(timeoutError());
    signal.addEventListener("abort", abort, { once: true });
    task.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

async function readLimited(res: Response, maxBytes: number, signal: AbortSignal) {
  const reader = res.body?.getReader();
  if (!reader) return { text: "", bytes: 0, truncated: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await abortable(reader.read(), signal);
      if (done) break;
      if (!value) continue;
      const room = maxBytes - bytes;
      if (value.byteLength > room) {
        if (room > 0) chunks.push(value.slice(0, room));
        bytes = maxBytes;
        truncated = true;
        break;
      }
      chunks.push(value);
      bytes += value.byteLength;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(buffer), bytes, truncated };
}
