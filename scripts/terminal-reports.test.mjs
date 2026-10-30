import assert from "node:assert/strict";
import test from "node:test";
import {
  compareReports,
  messageMatches,
  previousReport,
  reportFindings,
  reportMarkdown,
  sessionMarkdown,
} from "../src/lib/terminal/report-utils.ts";

const page = (overrides = {}) => ({
  mode: "scan",
  requestedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  status: 200,
  ms: 20,
  contentType: "text/html",
  redirects: [],
  title: "Example",
  description: null,
  note: null,
  request: { method: "GET", url: "https://example.com/", headers: [] },
  responseHeaders: [],
  stack: [],
  hosts: [],
  endpoints: [],
  probes: [],
  excerpt: "Example",
  truncated: false,
  bytes: 7,
  ...overrides,
});
const observation = (report, id) => reportFindings(report).find((finding) => finding.id === id);

test("HTML observations explain missing policies without claiming a vulnerability verdict", () => {
  assert.equal(observation(page(), "csp").level, "warning");
  const report = page({
    responseHeaders: [{ name: "Content-Security-Policy", value: "default-src *" }],
  });
  assert.equal(observation(report, "csp").level, "pass");
  assert.match(observation(report, "csp").detail, /presence alone is not a security guarantee/);
  assert.equal(observation(report, "framing").level, "warning");
});

test("only frame-ancestors or valid X-Frame-Options count as framing policies", () => {
  for (const [name, value, expected] of [
    ["content-security-policy", "frame-src 'none'", "warning"],
    ["content-security-policy", "default-src 'self'; frame-ancestors 'none'", "pass"],
    ["x-frame-options", " SAMEORIGIN ", "pass"],
    ["x-frame-options", "invalid", "warning"],
  ])
    assert.equal(
      observation(page({ responseHeaders: [{ name, value }] }), "framing").level,
      expected,
    );
});

test("HTML policies are not recommended for JSON and HSTS is only checked on HTTPS", () => {
  const report = page({
    contentType: "application/json",
    finalUrl: "http://example.com/",
    status: 503,
  });
  assert.equal(observation(report, "csp"), undefined);
  assert.equal(observation(report, "title"), undefined);
  assert.equal(observation(report, "hsts"), undefined);
  assert.equal(observation(report, "https").level, "warning");
  assert.equal(observation(report, "status").level, "warning");
});

test("partial responses and edge challenges are visible as limitations", () => {
  const report = page({ truncated: true, note: "The host returned an edge challenge." });
  assert.equal(observation(report, "truncated").level, "warning");
  assert.equal(observation(report, "challenge").level, "warning");
});

test("comparisons ignore volatile headers and set ordering, but show meaningful changes", () => {
  const before = page({
    responseHeaders: [
      { name: "date", value: "yesterday" },
      { name: "content-security-policy", value: "default-src 'self'" },
    ],
    endpoints: ["/b", "/a"],
    stack: [
      { name: "React", group: "UI" },
      { name: "Vite", group: "Build" },
    ],
  });
  const after = page({
    ...before,
    ms: 60,
    retrievedAt: new Date().toISOString(),
    endpoints: ["/a", "/b", "/a"],
    stack: [...before.stack].reverse(),
    responseHeaders: [
      { name: "date", value: "today" },
      { name: "content-security-policy", value: "default-src 'self'" },
    ],
  });
  assert.deepEqual(compareReports(after, before), []);
  const changes = compareReports(
    { ...after, status: 404, title: "Missing", responseHeaders: [] },
    before,
  );
  assert.deepEqual(
    changes.map((change) => change.label),
    ["HTTP status", "Page title", "content-security-policy"],
  );
  assert.equal(changes[2].after, "Not observed");
});

test("comparisons select the nearest earlier matching page, including redirects and URL fragments", () => {
  const first = page();
  const unrelated = page({
    requestedUrl: "https://other.example/",
    finalUrl: "https://other.example/",
  });
  const second = page({ title: "Updated", requestedUrl: "https://example.com/#section" });
  const messages = [
    { report: first },
    { report: unrelated },
    { report: second },
    { text: "hello" },
  ];
  assert.equal(previousReport(messages, 4, page()), second);
  assert.equal(previousReport(messages, 1, unrelated), undefined);
  assert.deepEqual(compareReports(unrelated, first), []);
  assert.equal(
    previousReport([{ report: first }], 1, page({ requestedUrl: "http://example.com/" })),
    first,
  );
});

test("older saved reports export without optional fields and keep untrusted HTML inside text", () => {
  const markdown = reportMarkdown(
    page({
      title: "<script>alert(1)</script>",
      responseHeaders: [{ name: "x-test", value: "~~~\n<script>danger()</script>" }],
      excerpt: "~~~\n# attacker heading\n~~~~~\n<script>not executable</script>",
    }),
  );
  assert.match(markdown, /Not recorded in this older report/);
  assert.ok(markdown.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(
    markdown.includes(
      "~~~~~~\n~~~\n# attacker heading\n~~~~~\n<script>not executable</script>\n~~~~~~",
    ),
  );
});

test("session exports include notes, failures and report comparisons, excluding pending work", () => {
  const markdown = sessionMarkdown(
    [
      { role: "assistant", text: "First read", report: page() },
      { role: "assistant", text: "Second read", report: page({ status: 404 }) },
      { role: "assistant", text: "Failed safely", failed: true },
      { role: "assistant", text: "PENDING MUST NOT EXPORT", pending: true },
    ],
    ["A <private> note"],
  );
  assert.match(markdown, /A &lt;private&gt; note/);
  assert.match(markdown, /HTTP status\*\*: 200 → 404/);
  assert.match(markdown, /Failed safely/);
  assert.ok(!markdown.includes("PENDING MUST NOT EXPORT"));
});

test("session search finds message text, page titles, URLs and detected technologies", () => {
  const message = {
    text: "Read complete",
    report: page({ title: "Example Blog", stack: [{ name: "WordPress", group: "CMS" }] }),
  };
  for (const query of ["complete", " BLOG ", "example.com", "WORDPRESS", ""])
    assert.equal(messageMatches(message, query), true);
  assert.equal(messageMatches(message, "missing"), false);
  assert.equal(messageMatches({ text: "Reading", pending: true }, "missing"), true);
});
