# PinAI — Remove Grok, use OpenAI + GitHub OAuth

## Implementation
- Removed Grok/xAI planner, shared Grok OAuth broker, gate authentication, connector proxy, old Vite PWA injection, `.grok` scaffolding and checked-in Vercel build output.
- The original terminal is retained at `/terminal` with **OpenAI text generation** and the four explicit public web-inspection commands.
- `/` and `/ai` now display the account-scoped chat from PR #4 with streamed Responses API text and PostgreSQL history.
- GitHub OAuth uses the PinAI-owned OAuth App, and email allowlisting controls paid access. No anonymous shared dev account on persistent Postgres.
- Responses API provider remains isolated under `src/lib/ai/openai.server.ts`. This is not a Codex-hosted agent or the ChatGPT subscription.

## Environment
Required in production: `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `PINAI_GITHUB_CLIENT_ID`, `PINAI_GITHUB_CLIENT_SECRET`, `PINAI_ALLOWED_EMAILS`. Optional: `PINAI_AI_RPM`.
**Never put the values in GitHub.**

Required GitHub OAuth callback for production:
`https://pin-ai-nine.vercel.app/api/auth/callback/github`

For preview deploys, use an isolated database, distinct `BETTER_AUTH_URL` and OAuth callback/client. Existing Vercel variables were production-only; a preview may correctly report “setup required” until isolated preview values are configured.

## Release safety / blockers
1. The current production endpoint returned `{"error":true,"status":500,"unhandled":true}` while Vercel reported deployment READY. This is an incident until runtime GET / passes. Do not assume this migration fixes that issue without an actual smoke test.
2. Connected Vercel runtime log queries returned 403, so the exact failure stack is unknown.
3. CI hosted job failed before useful steps in prior attempts. Fix the CI runner/settings or run equivalent validated checks separately.
4. Confirm the actual `DATABASE_URL` **value** securely; the Neon integration currently also exposes `PINAI_DATABASE_URL` (a prefixed variable, not used by the app).
5. Never build with a production database before reviewing and backing up pending schema migrations.
6. Test /, /terminal, /workspace, /browser-studio, /api/ai/status, GitHub OAuth session, allowlist rejection, chat stream, persisted history, cross-account isolation, token quota and malformed requests.
7. Keep PR draft until full checks pass. Require explicit approval before merging to production. Do not change custom domains or provider billing.

Docs: https://developers.openai.com/api/docs/guides/streaming-responses
GitHub OAuth: https://better-auth.com/docs/authentication/github
