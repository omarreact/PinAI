# PinAI AI Development Workspace — isolated preview

This feature adds the browser-accessible `/workspace` UI while preserving the existing `/` terminal. It is deliberately **local-first and read/write limited to the current browser**. It does not require or store GitHub tokens, AI-provider credentials, a database, cloud storage, or secrets.

## Workflows implemented

1. **Project profiles:** Seven editable starter profiles, with objective, repository, production environment, and hard guardrails. Profiles are examples based on existing PINCODE IT projects; edit or remove them on your device.
2. **Task queue:** Record priority, context, status, blockers, acceptance criteria and user-supplied test evidence. Selecting `verified` requires nonempty acceptance criteria and evidence; this is *manual* attestation, not an automatic CI check.
3. **Coding-agent handoff:** Generates a copyable, task-specific brief for Copilot, Codex or a general coding agent. It specifies isolated branching, preserved functionality, safety boundaries, expected tests and traceable artifacts.
4. **Error triage:** Deterministic patterns for runner/account issues, module resolution, emulator, network and auth. Rule matches are diagnostic hints, not a claim to have read restricted GitHub annotations.
5. **Backup/restore:** Versioned JSON export and validated local import, with an explicit overwrite confirmation. Maximum import size is 1 MB; schema validation limits collections and text fields.

## Security and privacy

- Project data persists only in `localStorage` in the browser/device. It is not synced to GitHub or Vercel, and other devices will not see it without importing a backup.
- Never paste or import authentication tokens, cookies, API keys, billing information or raw logs containing secrets.
- Imported data is copied field-by-field and never evaluated as code.
- Repository links accept only a simple `owner/name` slug and open `https://github.com/`.
- These are *manual* work records, not live build/PR status or an autonomous AI agent. No automatic destructive action is possible.

## Android PR #2: release block persists

PR: https://github.com/omarreact/PinAI/pull/2

As inspected on 2026-10-31:
- Workflow run https://github.com/omarreact/PinAI/actions/runs/41076761441 failed after about three seconds.
- Job `apk` reports `runner_id=0`, `runner_name=""`, `steps=[]` and two check-run annotations. Exact annotation text was **not accessible via the available connector**.
- Do **not** claim a specific billing/minutes/root-cause until those annotations or account settings are inspected.
- PR #2 is stacked on `codex/pinai-inspection-improvements`, not `main`, and reports 286 changed files / 74,571 deleted lines. The Android branch is missing original web routes and application build inputs. Restore unintentionally removed files against base `75b8768910c4d16e3b64efcd3544431a3583f52b` before contemplating a merge.
- Local unit/static/APK results quoted in PR #2 are not a substitute for a clean checkout, green hosted run and physical-device instrumentation.

## Validation / review

Run in a repository checkout with dependencies installed:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --experimental-strip-types --test src/lib/workspace/model.test.ts
npm run typecheck
npm run lint
npm run build
```

Review `/workspace` at phone and desktop sizes. Check keyboard/screen reader labels, project switching, task create/edit, evidence gating, agent prompt copy, log diagnosis, JSON export/import and rejected malformed input. The latest Vercel build environment must be tested separately; do not promote this preview automatically.

## Next safe integrations

Once deployment/build is stable, integrate **authenticated server-side** read-only GitHub status retrieval, with least-privilege installation permissions and explicit user approval for writes. Never send private source or tokens to an unapproved provider. Keep the manual workflow usable without GitHub access.
