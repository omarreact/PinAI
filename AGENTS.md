# PinAI — OpenAI developer workspace

- Project: `omarreact/PinAI`, TanStack Start + Vite + React + TypeScript.
- Production: https://pin-ai-nine.vercel.app (Vercel).
- This repository is **independent of Grok/xAI**. Do not reintroduce any broker, gate, PWA injector or xAI model dependency.
- Auth: local Better Auth with PinAI-owned GitHub OAuth, backed by PostgreSQL.
- OpenAI: server-side Responses API. Never expose `OPENAI_API_KEY` in the browser, source control or logs.
- Use exact approved email allowlist for access to paid AI and web tools.
- Existing `/ai` and `/` are saved OpenAI chat. `/terminal` is the safe diagnostics terminal. `/workspace` and `/browser-studio/index.html` remain intact.
- No shell execution, private-network probing, autonomous GitHub mutations or Vercel writes.
- Changes must use feature branches + reviewable pull requests. Production has recently served HTTP 500; don't merge before a tested staging deployment and real OAuth/Neon smoke checks.
- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- `npm run build` applies Postgres migrations if `DATABASE_URL` is set. NEVER use production DB for test builds; use a staging database and back up production before release.
- See `docs/PINAI-OPENAI-MIGRATION.md` for configuration and release gates.
