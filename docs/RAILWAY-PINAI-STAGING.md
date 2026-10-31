# PinAI Railway Node staging

This branch adds a Railway Node deployment adapter without changing the application's Vercel deployment or GitHub main branch.

## Railway deployment

- Repository: `omarreact/PinAI` (private)
- Branch: `railway/pinai-node-stage-20261101`
- Railpack build: `npm run build:railway` (selects Nitro `node_server`).
- Start: `npm run start:railway` (`node .output/server/index.mjs`).
- HTTP listener: Nitro should read Railway's `PORT`; verify the service's runtime logs and domain route.
- **Important:** `build:railway` deliberately does NOT run `db:migrate`. Applying migrations against production Neon during a build would be unsafe.

## Needed environment variables

Set these as Railway secret variables in a dedicated environment. Never commit their values.

```
OPENAI_API_KEY
OPENAI_MODEL
DATABASE_URL
BETTER_AUTH_URL
BETTER_AUTH_SECRET
PINAI_GITHUB_CLIENT_ID
PINAI_GITHUB_CLIENT_SECRET
PINAI_ALLOWED_EMAILS
PINAI_AI_RPM
```

`DATABASE_URL` must use an isolated staging PostgreSQL database while validating. Prefer a new Neon development branch/database. A new GitHub OAuth App must have its Authorization callback set to `https://<confirmed-railway-domain>/api/auth/callback/github`; set `BETTER_AUTH_URL` to the same origin.

Do not copy Vercel's OIDC tokens, service-generated variables, or provider integration metadata to Railway. The Vercel environment-variable connector has not exposed actual secret values for PinAI. Re-enter the appropriate provider keys securely using the Railway dashboard.

## Release gates

1. Verify the Railway account connection is eligible and can see the private GitHub repo. The first connected Railway tool calls currently returned `link_id must identify an eligible linked account`, so a deployment has **not been created**.
2. Build with the branch's Railway adapter and inspect errors. Ensure the Nitro node preset produces `.output/server/index.mjs`.
3. Provision an isolated PostgreSQL staging database, review the SQL migrations, and apply them through a one-off manually approved migration process, never on every deploy.
4. Add separate Railway OAuth application settings and other server secrets.
5. Verify HTTP GET /, /ai, /terminal, /workspace, the Browser Studio path, GitHub OAuth allowlist, OpenAI streamed responses, conversation persistence, session security, and rate limiting.
6. Only after all tests pass consider a deliberate cutover. Keep Vercel domain and production database untouched in the meantime.
