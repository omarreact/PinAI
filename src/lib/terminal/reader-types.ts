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
