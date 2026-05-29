# RIG Master Prompter Mac Hardening

## Goal

Turn RIG Master Prompter into the canonical MacBook Pro app for prompt repair, context grounding, approval-gated agent starts, and ProofPacket recall. The hardening target is local operational trust first: the app must open, run, verify, explain what is done, and truth-label what remains.

## Added Design Target

The May 29 Workbench design is part of done: dark RIG sidebar, Workbench topbar, prompt intake, target mode selector, context source cards, build-run lifecycle, right-side Audience Done Model, bottom ProofPacket/API Recall dock, and persistent system status bar.

## KPIs

The live KPI source is `GET /api/v1/hardening`.

- Mac app launch reliability: app opens and `/api/health` responds in under 20 seconds.
- Desktop identity: app bundle includes a stable name and non-empty icon, and installs to `/Applications` for Dock use.
- Prompt repair flow: paste prompt, choose context/audience, fix prompt, receive DoneContract.
- Context grounding: context chunks are redacted and cited.
- Unsafe action escape rate: zero write/send/export/destructive actions without approval.
- ProofPacket recall: every prompt or no-write agent run has a retrievable proof id.
- Release test gate: unit, typecheck, build, desktop build, API smoke, and UI smoke pass.
- First-run UX success: a new operator can fix a prompt in under five minutes without CLI help.
- Accessibility: keyboard flow and Lighthouse/axe report must be added before v10.
- Production auth: API-key/dev guard supports header and bearer keys; OIDC remains cloud work.
- Retrieval quality: pgvector schema and match function exist; live embeddings require cloud credentials.
- Agent worker boundary: local worker-job evidence exists; Docker long-running workers remain cloud work.

## Done Criteria

The live done source has 24 criteria. The minimum release bar is:

1. One Mac app named RIG Master Prompter exists in `/Applications` with a Desktop symlink.
2. The app opens the canonical full-stack product, not a separate product.
3. `/api/health` returns ok.
4. A rough prompt can be pasted and repaired from the UI.
5. Prompt output includes approval boundaries and proof requirements.
6. Claude Design mode is selectable.
7. Coding and browser modes are represented with approval gates.
8. Context source cards are selectable and syncable.
9. Uploaded text is redacted before storage.
10. Prompt runs can include citations.
11. Prompt runs include a structured DoneContract.
12. The selected audience changes the prompt contract.
13. ProofPacket ids are visible and recallable by API.
14. Risky agent starts wait for approval.
15. Approval decisions are recorded.
16. The app exposes v15 catalog, v10 readiness, v25 audit, audience, and hardening APIs.
17. The test suite passes.
18. TypeScript typecheck passes.
19. Next production build passes.
20. Desktop build passes.
21. Local verifier passes.
22. Desktop and mobile UI smoke screenshots are captured.
23. Known gaps are visible as watch or gap, not claimed as done.
24. Accessibility remains explicitly blocked until keyboard and Lighthouse/axe evidence exists.

## Persona User-Testing Bank

`GET /api/v1/hardening` returns 100 persona questions: ten questions for each of the ten product audiences. Each question includes:

- persona id and role
- question asked
- what works or does not work
- solution action
- pass/watch/gap status

This is persona-simulated product testing, not a claim that external users completed live sessions.

## What Works Now

- Local Mac app and WebView wrapper.
- Next.js frontend and API.
- v15 catalog, v10 readiness, v25 audit, audience model, and hardening model APIs.
- Prompt run creation with DoneContract, citations, selected questions, and ProofPacket id.
- Secret redaction in covered prompt/context paths.
- Approval-gated risky agent starts.
- Deterministic verifier script for the running app.

## What Is Left

- Gitea REST credentials, managed Postgres credentials, Vercel project link, and Apple notarization credentials.
- QNAP now supports local mount or read-only SSH alias; Recall.it now supports direct API or the local scraper bridge.
- Live pgvector embeddings and retrieval ranking against managed Postgres.
- OIDC/SSO workspace auth.
- Docker worker for real browser/repo agents.
- Independent verifier service.
- Signed/notarized app distribution and auto-update.
- Committed Playwright, Lighthouse, and axe reports.

## Verification

Run:

```bash
npm run test
npm run typecheck
npm run build
npm run desktop:build
npm run verify:local
```

Or from the repository root:

```bash
./script/build_and_run.sh --verify
```
