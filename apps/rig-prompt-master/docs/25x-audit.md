# RIG Master Prompter 25x Audit

Generated for the v10 push. This is the truth map for what exists now, what is partial, what is simulated, and what is missing.

## Current State

RIG Master Prompter is not v0.1. It is a v3 foundation with a working full-stack shell, desktop wrapper, v15 doctrine catalog, prompt intake, structured DoneContract, local context registry, approval-gated simulated agent runs, ProofPacket recall, and basic automated tests.

It is not v10 yet. The gap is not more screens. The gap is trustworthy production depth: real connectors, retrieval, SSO, scoped API keys, independent verifier, worker execution, and release-grade QA evidence.

## 25x Definition

25x better means:

- 25x more truthful about capability maturity.
- 25x more context-aware through authorized source retrieval.
- 25x safer through approval gates, redaction, and proof.
- 25x easier to use through a visible workbench and cockpit.
- 25x easier to verify through executable tests and ProofPackets.

## Implemented

- Canonical Next.js web workbench.
- Native macOS desktop launcher for the same system.
- v15 catalog API with resources, personas, questions, and gates.
- Prompt intake and fixed-prompt generation.
- Structured v10 DoneContract.
- v10 readiness API and cockpit.
- Basic RIG API auth guard with dev and API-key modes.
- ProofPacket creation and recall routes.
- Basic redaction tests.

## Partial

- Context-source registry for GitHub, Gitea, QNAP, Recall.it, uploads, URLs, and repo folders.
- Local JSON development store.
- Approval-gated agent state machine.
- Redaction before covered prompt/context storage paths.
- API-key auth without SSO, scopes, or workspace roles.
- ProofPackets without signing, hash chains, or external evidence manifests.
- UX cockpit without formal accessibility or usability evidence.

## Simulated

- Browser-agent execution.
- Repo-agent execution.
- Independent verifier role.

These are intentionally not labeled complete. The UI and API demonstrate the workflow, but they do not execute real external browser or repository actions.

## Missing

- Deep GitHub, Gitea, QNAP, Recall.it, web, and repo-folder sync.
- Embeddings and pgvector retrieval in runtime code.
- SSO/OIDC and workspace role model.
- Scoped API keys.
- Docker worker for long-running browser/repo agents.
- Independent verifier service.
- ProofPacket signing or integrity ledger.
- Committed Playwright E2E suite.
- Accessibility and visual regression reports.
- Production deployment smoke and rollback evidence.

## KPI Targets

Testing:

- Unit tests: at least 85% statements and 80% branches on deterministic `lib/**` logic.
- API routes: 100% `/api/v1/*` route coverage for success, auth failure, and validation failure.
- E2E: paste prompt -> sync context -> fix prompt -> approve agent -> recall proof on desktop and mobile.
- Safety: 0 write/send/export/destructive actions execute without explicit approval.
- Accessibility: Lighthouse accessibility >=95 and no serious/critical axe violations.
- Visual: baseline screenshots for landing, synced context, prompt run, pending approval, proof-ready, and error states.

RIG impact:

- 80% of real RIG work starts with a DoneContract and ends with a ProofPacket.
- >=90% cited chunks are useful in a 30-run context evaluation after real retrieval lands.
- >=25% median prompt-quality lift over raw prompt on a golden prompt set.
- 100% high-risk actions have approval and audit evidence.

UX/UI:

- New user fixes a prompt with cited context in under 5 minutes without CLI help.
- 100% of users can identify implemented vs partial vs simulated vs missing capabilities.
- Keyboard-only user can complete prompt intake, context selection, run creation, approval decision, and proof recall.
- No text overlap or unreadable controls at desktop and mobile widths.
- Empty, loading, error, success, and pending-approval states are visible and actionable.

## Done Looks Like

User acceptance tester:

- Can paste or upload a prompt.
- Can select target surface and enhancements.
- Can attach context.
- Can see fixed prompt, contract, citations, gates, and ProofPacket id.
- Can understand what is real vs simulated before trusting the output.

QA engineer:

- Runs unit, API, E2E, accessibility, visual, and desktop smoke suites.
- Verifies redaction, auth failure, validation failure, approval rejection, duplicate approval, and proof recall.
- Records reproducible defects with proof paths.

Senior full-stack engineer:

- Reviews API contracts, migrations, state transitions, data ownership, worker boundaries, auth scopes, and rollback.
- Confirms no product claim outruns implementation evidence.
- Confirms the local bridge cannot leak private QNAP, Recall.it, repo, or credential data into cloud logs without policy.

Frontend engineer:

- Verifies responsive layout, keyboard path, contrast, focus states, state feedback, and screenshot evidence.
- Confirms the workbench is not a marketing page and the primary action is immediate.

Backend engineer:

- Verifies route auth, canonical errors, redaction order, connector permissions, audit events, approval gates, and ProofPacket creation.
- Confirms Postgres/pgvector becomes production authority and local cache remains local bridge state.

## Required Smoke Commands

```bash
cd apps/rig-prompt-master
npm run test
npm run typecheck
npm run build
npm run desktop:build
```

```bash
cd apps/rig-prompt-master
RIG_DEV_ALLOW_ANON=1 RIG_PROMPT_MASTER_STORE="$(mktemp -t rig-prompt-master-store).json" npm run dev -- -H 127.0.0.1 -p 8767
```

```bash
BASE=http://127.0.0.1:8767
curl -fsS "$BASE/api/health"
curl -fsS "$BASE/api/v1/catalog/v15"
curl -fsS "$BASE/api/v1/v10/readiness"
curl -fsS "$BASE/api/v1/v25/audit"
```

## Claim Language Rules

- Implemented means code exists, route or UI is wired, and at least one automated or smoke test can prove it.
- Partial means the product path exists but lacks production-grade depth, coverage, or data authority.
- Simulated means the UX/API demonstrates the workflow without executing the real external action.
- Missing means planned capability with no production implementation yet.
- PASS claims require commands, changed files, source links or citations, verifier result, and rollback path.
