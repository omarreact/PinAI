export type AndroidInterface = {
  request(id: string, action: string, payload: string): void;
  configureKey(): void;
  exportFile(name: string, content: string, mime: string): void;
};

declare global {
  interface Window {
    PinAIAndroid?: AndroidInterface;
    __pinaiChunk?: (id: string, chunk: string, last: boolean) => void;
  }
}

const pending = new Map<
  string,
  {
    chunks: string[];
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
let nextId = 0;

window.__pinaiChunk = (id, chunk, last) => {
  const job = pending.get(id);
  if (!job) return;
  job.chunks.push(chunk);
  if (!last) return;
  pending.delete(id);
  clearTimeout(job.timer);
  try {
    const result = JSON.parse(job.chunks.join("")) as {
      ok: boolean;
      data?: unknown;
      error?: string;
    };
    if (!result.ok) job.reject(new Error(result.error ?? "The request failed."));
    else job.resolve(result.data);
  } catch {
    job.reject(new Error("Could not read the Android response."));
  }
};

export function nativeRequest<T>(action: "read" | "grok", payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const bridge = window.PinAIAndroid;
    if (!bridge) {
      reject(new Error("The Android bridge is unavailable. Restart PinAI."));
      return;
    }
    const id = String(++nextId);
    const timer = setTimeout(
      () => {
        pending.delete(id);
        reject(new Error("The request timed out. Try again."));
      },
      action === "grok" ? 25_000 : 18_000,
    );
    pending.set(id, { chunks: [], resolve: (value) => resolve(value as T), reject, timer });
    try {
      bridge.request(id, action, JSON.stringify(payload));
    } catch {
      clearTimeout(timer);
      pending.delete(id);
      reject(new Error("Could not start the Android request."));
    }
  });
}
