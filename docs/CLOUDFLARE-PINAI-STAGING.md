# PinAI Cloudflare Pages staging (isolated from Vercel)
 
## Purpose
This branch tests a GitHub-connected Cloudflare Pages **staging** deployment without altering Vercel production. Do not change DNS or production branches.
 
## Current status (2026-11-01)
- Vercel production is not migrated; GitHub main stays intact.
- GitHub branch: `cloudflare/pinai-stage-20261101`; conditional Nitro preset is enabled only when `PINAI_CF_PAGES_BUILD=1`.
- Attempted Cloudflare Pages project `pinai-cf-stage-20261101` (build command `PINAI_CF_PAGES_BUILD=1 npm run build`, output `dist`).
- Cloudflare declined the GitHub repository linkage with 401 / code 8000012 ("project is linked to a repository that no longer exists"). The GitHub repository is private and confirmed to exist; verify that Cloudflare Pages GitHub App has repository access.
- Cloudflare Workers Builds repository endpoints returned 404 on this account; do not claim a Workers Git deployment succeeded.
- Vercel PinAI project environment-variable listing returned zero accessible variables; no keys have been copied.
 
## Setup after Cloudflare GitHub App access is granted
1. Give Cloudflare's GitHub application access to private `omarreact/PinAI`.
2. Create an isolated Pages project on the Cloudflare account using GitHub source `omarreact/PinAI` and production branch `cloudflare/pinai-stage-20261101`.
3. Configure build command `PINAI_CF_PAGES_BUILD=1 npm run build`, output directory `dist`, compatibility date `2026-10-31`, and compatibility flag `nodejs_compat`.
4. Confirm server-side routing and static assets. This tests Nitro's `cloudflare_pages` preset, **not** the recommended Cloudflare Vite plugin/Workers route; confirm any runtime compatibility issues before considering further migration.
5. Configure Cloudflare-specific **secrets** through the Cloudflare dashboard, not GitHub. Required application names: `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PINAI_GITHUB_CLIENT_ID`, `PINAI_GITHUB_CLIENT_SECRET`, `PINAI_ALLOWED_EMAILS`, and `BETTER_AUTH_URL`.
6. Set `BETTER_AUTH_URL` to the *verified Cloudflare staging HTTPS origin* (not the Vercel URL), and register its matching GitHub OAuth callback in an isolated OAuth application. Separate staging DB and secrets are strongly preferred.
7. Validate GET /, /api/auth/* (fail closed until configured), GitHub sign-in, DB schema with **reviewed** migrations, streamed OpenAI chat, /terminal, /workspace and Browser Studio.
 
## Safety
Do not reuse the production DATABASE_URL for staging builds: `npm run build` currently runs `npm run db:migrate` and could modify the database. Do not copy Vercel-generated/OIDC credentials, and never put secret values in git. The PGlite local fallback, Node `pg` compatibility and imports must be tested for Cloudflare runtime compatibility. Vercel remains production until full smoke checks and a separate explicit cutover approval.
 
Official resources: https://nitro.build/deploy/providers/cloudflare and https://developers.cloudflare.com/pages/platform/git-integration/
