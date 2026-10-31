/** Transport-only SSE parser for OpenAI Responses. Handles chunk and CRLF splits. */
export type ResponseEvent = { type?: string; delta?: string };
export class SseParser {
  private pending = "";
  push(chunk: string): ResponseEvent[] {
    this.pending += chunk;
    this.pending = this.pending.replace(/\r\n/g, "\n");
    if (this.pending.length > 262144) throw new Error("Provider stream frame too large.");
    const output: ResponseEvent[] = [];
    let end = -1;
    while ((end = this.pending.indexOf("\n\n")) !== -1) {
      const block = this.pending.slice(0, end);
      this.pending = this.pending.slice(end + 2);
      const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (!data || data === "[DONE]") continue;
      try {
        const event = JSON.parse(data) as unknown;
        if (event && typeof event === "object" && !Array.isArray(event)) output.push(event as ResponseEvent);
      } catch { /* incomplete or non-JSON event is not model output */ }
    }
    return output;
  }
}
