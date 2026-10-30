import { analyzePage } from "./analyze.ts";
import { requestPublic } from "./request.server.ts";
import type { ToolName } from "./types";

export function analyzePublicPage(rawUrl: string, mode: ToolName) {
  return analyzePage(rawUrl, mode, requestPublic);
}
