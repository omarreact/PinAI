# PinAI

A terminal-style public web reader built with React, TanStack Start and TypeScript.

## Features

- Read a public page with `/scan https://example.com`.
- Inspect status, redirects, response headers and request timing with `/headers`.
- Detect platform and framework markers with `/tech`.
- List third-party hosts and paths named in a response with `/apis`.
- Review response observations for HTTPS, policy headers, page titles and partial responses. These are observations, not a security certification.
- Choose **Read again** to repeat a report and compare status, title, destination, technologies, endpoints and selected policy headers with the nearest earlier read of the same page. Volatile headers and timing changes are excluded.
- Search messages, page titles, addresses and detected technologies from the header. Press `/` outside a text field to focus the composer.
- Save individual reports or the latest 40 completed messages and notes as JSON or Markdown. Exports contain data from this device; there is no cloud sync or import feature.
- Keep up to 20 notes with `/note`, inspect `/session`, and clear local history from Session.
- Optionally use Grok to answer or choose a public-page tool from a natural-language request.

## Run locally

Use Node.js 22.18+ or 24 LTS and npm:

```sh
npm ci
npm run dev
```

Development listens on port 8080. The npm wrapper applies `.grok/app-env.json` consistently to development and builds. Authentication and the database are disabled in the current app configuration.

The public-page commands work without an AI key. Natural-language Grok requests require a server-side `XAI_API_KEY`. Supply it through the process environment or deployment secrets; never put it in client code or commit it. A missing key produces a helpful message and leaves the page tools available.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run check:auth
```

`check:auth` compares the running dev server's sign-in flag with the build configuration. Browser smoke checks cover desktop and mobile:

```sh
node scripts/browser-smoke.mjs http://127.0.0.1:8080/ /workspace/screenshots/pinai-dev.png
npm run preview:restart
node scripts/browser-smoke.mjs http://127.0.0.1:8081/ /workspace/screenshots/pinai-built.png --baseline /workspace/screenshots/pinai-dev.json
```

The built preview is QA-only and binds to loopback on port 8081. `startup.sh` starts the development server and can also run from a nested checkout.

## Reader boundaries

The reader makes a bounded HTTP GET; it does not execute page JavaScript, observe a visitor's browser traffic, log into the target, or verify every interactive feature. Scan and API mode can also request `robots.txt` and, when WordPress markers are present, `/wp-json/`. Other paths found in markup are listed without crawling them.

Each request has a 12-second deadline covering validation, redirects and the body. The main text response is limited to 1.2 MB. Private and local addresses, credentials in URLs, and ports other than 80/443 are rejected; redirects are revalidated. DNS is checked before requests, but addresses are not pinned to the connection, so this guard is not a substitute for network-level egress controls in an untrusted multi-user deployment.

Response cookie and sensitive header names are redacted. Excerpts, target addresses and personal notes may still contain information you should review before sharing exports.

## Dependency maintenance

Better Auth 1.7.7, Zod 4.6.6 and the Seroval 1.6.11 override patch known advisories in the previous lockfile. The lockfile also includes the missing packages needed for a reproducible `npm ci`.

Better Auth's inactive client and popup helpers use the 1.7 social sign-in API. Before enabling federated sign-in, register `/api/auth/callback/:providerId` callback URLs with the broker and verify the full login flow in the target environment. See the [official 1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide). This change does not enable sign-in or provision a database.
