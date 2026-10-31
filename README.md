# PinAI — OpenAI-powered developer workspace

PinAI is a TanStack Start / React application hosted on Vercel. The private OpenAI chat uses server-side Responses API streaming and Better Auth GitHub sign-in.

## Routes
- `/`, `/ai` — authenticated saved OpenAI chat
- `/terminal` — OpenAI text responses and explicit public-site diagnostics (`/scan`, `/headers`, `/tech`, `/apis`)
- `/workspace` — task/project workspace
- `/browser-studio/index.html` — standalone local browser Studio

## Setup
Copy required variables into Vercel **Sensitive** environment settings for the appropriate target; never commit actual secrets.

```dotenv
OPENAI_API_KEY=your_real_openai_platform_key
OPENAI_MODEL=your_supported_responses_model
DATABASE_URL=postgresql://...  # Isolated staging URL for preview/testing
BETTER_AUTH_URL=https://pin-ai-nine.vercel.app
BETTER_AUTH_SECRET=a_new_cryptographic_random_32_plus_byte_secret
PINAI_GITHUB_CLIENT_ID=github_oauth_app_client_id
PINAI_GITHUB_CLIENT_SECRET=github_oauth_app_client_secret
PINAI_ALLOWED_EMAILS=your_verified_email@example.com
PINAI_AI_RPM=6
```

GitHub OAuth callback: `https://pin-ai-nine.vercel.app/api/auth/callback/github`. Use a **separate** callback/client for staging. The role of the GitHub OAuth App is sign-in only, not automatic repository write access.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

A production build with `DATABASE_URL` will apply pending SQL migrations; do not run it against production for QA.

See [migration and validation](docs/PINAI-OPENAI-MIGRATION.md).
