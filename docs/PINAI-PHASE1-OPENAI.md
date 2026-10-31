# PinAI Phase 1 — Secure OpenAI chat (feature branch)

## Shipped in the branch
- New responsive **/ai** chat UI with streaming text, history, conversation deletion and error states.
- Server-side **/api/ai/status**, **/api/ai/conversations**, **/api/ai/conversations/$id**, and **/api/ai/stream**.
- New **/api/auth/$** Better Auth handler with optional PinAI-owned GitHub OAuth alongside the unchanged legacy broker.
- Separate native Responses API adapter; no OpenAI key is sent to the browser.
- Scoped conversation SQL tables, server-verified user ID, per-user request quota in SQL, no default shared dev user.
- Existing /workspace and /browser-studio remain unchanged; the original terminal moves to /terminal and uses OpenAI.

## Provisioning required before the chat can run

Set these **server-side** Vercel environment variables (production or isolated staging):
- `DATABASE_URL`: persistent managed Postgres database with SSL.
- `BETTER_AUTH_URL`: the exact canonical origin, e.g. `https://pin-ai-nine.vercel.app`.
- `BETTER_AUTH_SECRET`: random strong secret (32+ bytes), keep private.
- `PINAI_GITHUB_CLIENT_ID`, `PINAI_GITHUB_CLIENT_SECRET`: credentials from an OAuth App owned by you at https://github.com/settings/developers (not a personal access token). Set the GitHub Authorization callback URL to `https://pin-ai-nine.vercel.app/api/auth/callback/github`. GitHub email scope is required.
- Authentication no longer uses `VITE_AUTH_ENABLED` or the shared development fallback. The terminal and chat both require a verified GitHub session.
- `PINAI_ALLOWED_EMAILS`: comma-separated exact email accounts allowed to spend model credits (no wildcard).
- `OPENAI_API_KEY`: private paid Platform API key, server-only.
- `OPENAI_MODEL`: a model available in your Platform project, explicitly selected.
- Optional `PINAI_AI_RPM` (default 6, max 20 requests/minute per account).

**Do not** turn on paid model access without verified auth and the database. All missing prerequisites cause fail-closed 503, not an anonymous shared identity. Use preview and test accounts first.

### Database migrations

The existing `npm run build` runs `npm run db:migrate`. If `DATABASE_URL` points to a production database, even a build could apply the new migrations to that database. **Do not run a preview build against production DB**; use isolated staging Postgres or postpone merging until the schema is reviewed and database backup made. The `0000_auth.sql` is a copy of the project's existing Better Auth schema under `migrations/auth/`. `0001_ai_chat.sql` contains the private chat tables and quota table.

### Smoke tests
1. With no prerequisites: `/ai` renders an informative locked state and `GET /api/ai/status` returns `{ready:false}` without exposing secrets.
2. Signed-out `GET /api/ai/conversations` and POST stream must reject without contacting OpenAI. Missing allowlist or database also fail closed.
3. With a test account and staging DB: sign in via PinAI-owned GitHub OAuth; confirm identity and exact allowlist.
4. Send a turn and confirm incremental NDJSON `start`, `delta`, `done` and reloadable assistant response.
5. Conversation A cannot be read or deleted by account B; direct unauthenticated and cross-origin requests are denied.
6. Quota limit rejects with HTTP 429 across independent serverless instances.
7. Revoke key, disconnect stream, inject invalid JSON, and test failed upstream requests without leaking sensitive responses.
8. Check mobile layout, keyboard and navigation links. No provider call is made from client JavaScript.

**Known limitations:** OpenAI streaming and OAuth login cannot be tested without user-provided keys/issuer and a persistent DB. Phase 1 is a read/write chat app only; it cannot access GitHub, execute code or deploy. The provider module uses official Responses SSE with `store:false`; introduce Agents SDK in Phase 2 for tools and handoffs after test gates pass.

Documentation: https://developers.openai.com/api/docs/guides/streaming-responses
Authentication: https://better-auth.com/docs/integrations/tanstack

### Authentication caveats
The GitHub OAuth app is **not** a GitHub App for repository automation; it is sign-in only. GitHub repository tool permissions will be added in Phase 2 via a separately scoped GitHub App. Set the callback URL exactly. No preview URL will work for the same OAuth client unless a separate callback is registered/configured.
