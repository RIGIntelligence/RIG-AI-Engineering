# RIG Master Prompter Product Done Model

This is the operational definition of done for the product build. It is encoded in `lib/audience-done-model.ts` and exposed through `GET /api/v1/audience-done-model`.

## Product Goal

RIG Master Prompter is one canonical full-stack app and Mac launcher for turning rough prompts into context-grounded, audience-aware, approval-gated, ProofPacket-ready prompts.

## Ten Audiences

- Founder / CEO: one canonical app, fast context recall, clear proof, no duplicate tools.
- Prompt Operator: paste or upload messy prompts and receive target-specific fixed prompts.
- Claude Design Designer: generate app-design prompts with RIG branding, screen anatomy, and states.
- Senior Full-Stack Engineer: receive implementation-ready DoneContracts, APIs, gates, and rollback notes.
- QA Engineer: verify visible states, safety paths, desktop launch, and user workflow.
- Security / Privacy Reviewer: confirm redaction, approvals, no unsafe sends, and audit evidence.
- Research Analyst: ground prompts in cited sources and freshness-aware context.
- Platform Admin: connect GitHub, Gitea, QNAP, Recall.it, uploads, local repos, and approved web sources.
- Growth / Marketing Lead: create brand-consistent prompts for campaigns and client assets.
- Client / External Stakeholder: understand what changed, why it is trusted, and what decision is needed.

## Done Means

- The Mac app opens the same full-stack control plane as the browser app.
- The first screen supports prompt intake, target mode, context sources, audience selection, and proof recall.
- The selected audience changes the prompt run output and DoneContract.
- Context source cards are operational and sync selected source chunks into prompt runs.
- Agent runs are bounded by approval gates for repo writes, browser submits, external sends, private exports, account changes, and destructive actions.
- ProofPackets are generated and retrievable by API.
- Tests, typecheck, production build, API smoke, UI smoke, and desktop build pass.

## Good Means

- A new user can paste a rough ask and produce a usable fixed prompt in under five minutes.
- Users can see whether work is implemented, partial, simulated, or missing without reading source code.
- Designers, engineers, QA, security, research, platform, growth, executive, and client users each see their definition of done in the app.
- The app never claims operational capability that is not backed by executable proof.
