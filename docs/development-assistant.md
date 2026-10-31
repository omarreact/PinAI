# PinAI development workspace

## Product direction

The owner uses AI to build and maintain several projects, often through short follow-up requests: inspect a problem, implement a fix, preserve an existing design, validate an artifact, then ship it. The recurring failure modes are lost project context, scope drift, inconsistent hosting decisions, and treating implementation or an HTTP response as proof of working behavior.

PinAI now keeps editable project context beside a task queue. Each task records an outcome, acceptance checks, stage, and evidence. Validation and blocked states require an evidence note. These are explicitly user-recorded assessments, not automated CI results. No progress percentages or invented live status are displayed.

Starter profiles cover PinAI, PINCODE IT, LandBD, PinFlix, PinCMS, and Forex Trade Technology. They are starting context from the owner's instructions, not a current infrastructure inventory. Edit them before sending a brief if requirements change.

## Implemented

- Create projects and edit repository, context, and constraints.
- Create tasks, track implementation separately from validation, and record blockers.
- Generate editable, evidence-aware coding-agent briefs; copy them or review them in the existing assistant before sending.
- `/plan` routes development briefs to advice even when they contain GitHub links. It does not silently treat a PR URL as a public-page scan.
- Local failure-pattern triage distinguishes missing source, dependency setup, runner non-execution and emulator boot symptoms. It does not claim an exact cause from an ambiguous symptom.
- Versioned device storage, bounded/validated JSON backup import, explicit replacement review, and exports using the existing web/native save adapter.
- Shared web and Android workspace. The existing page reader and optional Grok integration remain available.
- Development-oriented model instructions preserve tool boundaries and distinguish evidence from claims. User messages are capped at 6,000 characters, model output at 900 tokens, and parsed replies at 4,000 characters. No paid inference was made for validation.

## Capability boundary

Project/task features and log pattern matching work locally without a model. Grok advice requires the existing server-side XAI configuration on web or a user-configured encrypted key on Android. Only explicitly sent chat content goes to that model. The workspace does not create GitHub credentials, connect private repositories, execute commands, retrieve CI results, merge, or deploy. Never display those operations as completed based on an AI reply.

Backups contain project context, task descriptions and evidence. Do not store credentials or paste secrets into logs. Export before changing devices; there is no cloud synchronization. Browser imports support files or pasted JSON. Android supports pasted JSON; native file-input selection is not implemented. Export uses Android's existing document picker.

## Source repair

PR #2 head `82faba0f` omitted required source and configuration that were present in base `75b8768`. Restore the base's missing source, configuration, lockfile, assets and repository instructions while preserving the Android additions. Do not restore generated `.vercel/output` or old screenshots as build inputs.

Required restored inputs include package-lock.json, root tsconfig/Vite configuration, build wrappers, migration code, shared terminal UI and libraries, routes, styles and test fixtures. Removing those files prevented a clean build independently of the hosted-runner issue.

## Validation and remaining gates

Local validation uses Node 24, locked dependencies, both TypeScript checks, ESLint, the complete shared test suite, the existing production web build, and Android web bundling. The new tests cover evidence gates, malformed/oversized imports, cross-project task references, briefing boundaries, routing of development requests and conservative failure classification.

The GitHub workflow now also runs for pull requests, builds the existing web application, and verifies APK alignment in addition to its existing native build, lint, JVM tests, signature and artifacts. It compiles instrumentation but does not execute it.

Do not release a replacement APK or merge into production until:

1. The hosted runner's job annotations identify its actual pre-execution failure. Empty steps and runner_id=0 alone do not identify billing or policy as the cause.
2. CI runs against the new exact commit and saves native build/lint/unit-test artifacts.
3. Desktop and mobile rendering and interactions pass, including project edits, task creation, validation gating, storage reload, backup replacement, brief handoff and no horizontal overflow.
4. An API 35 emulator or physical device boots and executes RuntimeChecks. The harness opens the new workspace and switches into the assistant before its existing bridge/session checks.
5. Physical-device QA covers the keyboard, Back navigation, offline workspace persistence, export picker, public HTTPS reads and optional user-initiated Grok advice.

The next substantial capability is authenticated, read-only repository/CI inspection through a backend with scoped GitHub App authorization. Actual coding execution needs an isolated job runner, immutable commit evidence and explicit production boundaries; it should not be simulated in a WebView.
