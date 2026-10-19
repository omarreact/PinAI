export type EngineId = "grok" | "scan" | "network" | "stack" | "shell";

export type ToolName = "scan" | "headers" | "tech" | "apis";

export type HeaderPair = { name: string; value: string };

export type StackHit = { name: string; group: string };

export type HostHit = { host: string; role: string };

export type ProbeHit = { url: string; status: number; note: string };

export type Hop = { url: string; status: number; ms: number };

export type WebReport = {
  mode: ToolName;
  requestedUrl: string;
  finalUrl: string;
  status: number;
  ms: number;
  contentType: string | null;
  redirects: Hop[];
  title: string | null;
  description: string | null;
  note: string | null;
  request: { method: string; url: string; headers: HeaderPair[] };
  responseHeaders: HeaderPair[];
  stack: StackHit[];
  hosts: HostHit[];
  endpoints: string[];
  probes: ProbeHit[];
  excerpt: string | null;
  truncated: boolean;
  bytes: number;
};

export type HistoryItem = { role: "user" | "assistant"; text: string };

export type TurnInput = {
  text: string;
  engine: EngineId;
  lastUrl: string | null;
  tool: ToolName | null;
  url: string | null;
  history: HistoryItem[];
};

export type TurnResult =
  | {
      ok: true;
      reply: string;
      tool: ToolName | null;
      report: WebReport | null;
      usedModel: boolean;
    }
  | { ok: false; error: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tool?: ToolName | null;
  report?: WebReport | null;
  pending?: boolean;
  failed?: boolean;
};
