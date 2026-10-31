import assert from "node:assert/strict";
import test from "node:test";
import { analyzePublicPage } from "../src/lib/terminal/analyze.server.ts";
import { compareReports } from "../src/lib/terminal/report-utils.ts";

test("policy tails survive report generation and comparisons while sensitive headers are redacted", async () => {
  const originalFetch = globalThis.fetch;
  const prefix = "script-src " + "https://assets.example.com ".repeat(20);
  let policy = prefix + "; frame-ancestors 'none'";
  globalThis.fetch = async () =>
    new Response("<html><title>Example</title></html>", {
      headers: {
        "content-type": "text/html",
        "content-security-policy": policy,
        "set-cookie": "session=private-cookie",
        "x-api-key": "private-key",
      },
    });
  try {
    const first = await analyzePublicPage("https://93.184.216.34/", "headers");
    assert.equal(first.findings.find((finding) => finding.id === "framing").level, "pass");
    assert.equal(
      first.responseHeaders.find((header) => header.name === "content-security-policy").value,
      policy,
    );
    assert.ok(!JSON.stringify(first).includes("private-cookie"));
    assert.ok(!JSON.stringify(first).includes("private-key"));
    policy = prefix + "; frame-ancestors 'self'";
    const second = await analyzePublicPage("https://93.184.216.34/", "headers");
    assert.ok(
      compareReports(second, first).some((change) => change.label === "content-security-policy"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
