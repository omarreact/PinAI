import assert from "node:assert/strict";
import test from "node:test";
import { requestPublic } from "../src/lib/terminal/request.server.ts";
import { normalizeHttpUrl } from "../src/lib/terminal/guard.server.ts";

const validateUrl = async (value) => normalizeHttpUrl(value);
const options = (fetchImpl) => ({ validateUrl, fetchImpl, timeoutMs: 500 });
const encoder = new TextEncoder();

test("one deadline bounds stalled DNS validation, headers and body", async (t) => {
  for (const stage of ["validation", "headers", "body"]) {
    await t.test(stage, async () => {
      let cancelled = false;
      const pending = () => new Promise(() => {});
      const config = {
        validateUrl: stage === "validation" ? pending : validateUrl,
        fetchImpl:
          stage === "headers"
            ? pending
            : async () =>
                new Response(
                  new ReadableStream({
                    cancel() {
                      cancelled = true;
                    },
                  }),
                  { headers: { "content-type": "text/html" } },
                ),
        timeoutMs: 25,
      };
      const start = performance.now();
      await assert.rejects(requestPublic("https://example.com", 100, config), /took too long/);
      assert.ok(performance.now() - start < 1000, "the request must settle within a bounded time");
      if (stage === "body") assert.equal(cancelled, true);
    });
  }
});

test("text download stops at a byte limit and cancels the remaining stream", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("abc"));
      controller.enqueue(encoder.encode("defgh"));
    },
    cancel() {
      cancelled = true;
    },
  });
  const report = await requestPublic(
    "https://example.com",
    5,
    options(async () => new Response(body)),
  );
  assert.equal(report.text, "abcde");
  assert.equal(report.bytes, 5);
  assert.equal(report.truncated, true);
  assert.equal(cancelled, true);
});

test("an exactly sized response is complete; case-insensitive JSON is textual", async () => {
  const report = await requestPublic(
    "https://example.com",
    2,
    options(
      async () =>
        new Response("{}", {
          headers: { "content-type": "Application/JSON" },
        }),
    ),
  );
  assert.equal(report.text, "{}");
  assert.equal(report.truncated, false);
  assert.equal(report.textual, true);
});

test("redirects are resolved relative to the current page and checked before each fetch", async () => {
  const calls = [];
  const checked = [];
  const report = await requestPublic("https://example.com/start", 100, {
    ...options(async (url, init) => {
      calls.push(url);
      assert.equal(init.redirect, "manual");
      assert.equal(init.cache, "no-store");
      return calls.length === 1
        ? new Response(null, { status: 302, headers: { location: "/done" } })
        : new Response("ok");
    }),
    validateUrl: async (url) => {
      checked.push(url);
      return normalizeHttpUrl(url);
    },
  });
  assert.deepEqual(calls, ["https://example.com/start", "https://example.com/done"]);
  assert.deepEqual(checked, calls);
  assert.equal(report.redirects.length, 2);
  assert.equal(report.finalUrl, calls[1]);
});

test("private initial addresses and private redirect destinations never get fetched", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } });
  };
  await assert.rejects(requestPublic("http://127.0.0.1", 100, { fetchImpl }), /blocked/);
  assert.equal(calls, 0);
  await assert.rejects(requestPublic("https://example.com", 100, options(fetchImpl)), /blocked/);
  assert.equal(calls, 1);
});

test("looping, destination-less and excessive redirects fail clearly", async () => {
  await assert.rejects(
    requestPublic(
      "https://example.com",
      100,
      options(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: "/" },
          }),
      ),
    ),
    /looped/,
  );
  await assert.rejects(
    requestPublic(
      "https://example.com",
      100,
      options(async () => new Response(null, { status: 302 })),
    ),
    /without a destination/,
  );
  let count = 0;
  await assert.rejects(
    requestPublic(
      "https://example.com",
      100,
      options(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: `/${++count}` },
          }),
      ),
    ),
    /Too many redirects/,
  );
  assert.equal(count, 5);
});

test("binary bodies are cancelled without downloading; invalid lengths are ignored", async () => {
  let cancelled = false;
  const report = await requestPublic(
    "https://example.com",
    100,
    options(
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "content-type": "image/png", "content-length": "-5" } },
        ),
    ),
  );
  assert.equal(report.textual, false);
  assert.equal(report.bytes, 0);
  assert.equal(report.text, "");
  assert.equal(cancelled, true);
});

test("total timing includes streamed body time, not just response headers", async () => {
  const report = await requestPublic(
    "https://example.com",
    100,
    options(
      async () =>
        new Response(
          new ReadableStream({
            async start(controller) {
              await new Promise((resolve) => setTimeout(resolve, 30));
              controller.enqueue(encoder.encode("ok"));
              controller.close();
            },
          }),
        ),
    ),
  );
  assert.ok(report.timings.bodyMs >= 20);
  assert.ok(report.timings.totalMs >= report.timings.bodyMs);
  assert.equal(report.ms, report.timings.totalMs);
});

test("network errors do not expose upstream error details", async () => {
  await assert.rejects(
    requestPublic(
      "https://example.com",
      100,
      options(async () => {
        throw new Error("sensitive upstream failure");
      }),
    ),
    { message: "Could not reach that host." },
  );
});
