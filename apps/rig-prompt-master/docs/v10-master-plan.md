# RIG Master Prompter v10 Master Plan

Generated: 2026-05-29
Goal: reach a v10 candidate by 4:00 PM MDT with inspectable proof, not a claim-only upgrade.

## Current Maturity

RIG Master Prompter is not v0.1 anymore. It is a v3 foundation relative to the v10 enterprise target:

- Present: Next.js control plane, local JSON store, v15 catalog, prompt-run API, context-source API, approval-gated agent-run API, ProofPacket API, macOS WebView wrapper, and focused tests.
- Missing for v10: real connector depth, cloud memory, scoped SSO, long-running worker service, signed/hashed ProofPackets, route-level API tests, Playwright E2E, production observability, and a stronger user-facing cockpit.

## v10 Product Thesis

RIG Master Prompter v10 is the canonical prompt operating system. A user can paste or upload any prompt, attach authorized GitHub/Gitea/QNAP/Recall/upload/web context, choose the target surface, receive a fixed prompt plus DoneContract, run bounded agents only after approval, and recall every proof by API.

## Doctrine Mapping

- Coordinate: `L6-D3-A3-S`
- Lattice: `L0 signal -> L1 context -> L2 contract -> L3 design -> L4 agent -> L5 verify -> L6 operate -> L7 recall`
- Archetypes: `A1 deterministic first`, `A2 assisted synthesis`, `A3 bounded agents`, `A4 approved autonomy only`
- Double Double Diamond: discover/define product problem, then design/deliver engineering proof
- IQRSQPI: intent, questions, research, synthesis, qualification, proof, iteration
- BMS/BMX confidence: confidence rises only with source, test, proof, and operator evidence

## KPIs

| KPI | v10 Target | Release Gate |
| --- | --- | --- |
| Context retrieval precision | 90% of cited chunks are useful | Block below 80% |
| Secret leakage | 0 raw credential leaks | Hard block |
| Approval gate escape rate | 0 unsafe actions without approval | Hard block |
| Prompt readiness | Median repaired score >= 85 | Block below 75 |
| Time to fixed prompt | <30 seconds for normal intake | Warn above 60 seconds |
| ProofPacket completeness | 100% runs have hash, gates, citations, verifier evidence | Hard block |
| API contract coverage | 100% `/api/v1/*` route coverage | Block missing auth/gate tests |
| Desktop launch reliability | 99% cold launch success | Block broken launch |
| Auth enforcement | Prod rejects unauthenticated protected routes | Hard block |
| Observability | Every run has trace/debug fields | Block missing audit for agent work |
| Design usability | First-run user completes core workflow unaided | Block if approvals/proof unclear |
| Proof recall | 100% generated proofs retrievable by API | Hard block |

## Definition of Done

Done means the app is useful, safe, and inspectable:

1. The canonical product name is RIG Master Prompter across web, API, docs, and desktop.
2. Prompt intake returns fixed prompt, DoneContract, citations, selected v15 questions, gates, score, and ProofPacket id.
3. GitHub, Gitea, QNAP, Recall.it, uploads, local repo, and web sources sync through redacted, permission-aware adapters.
4. Writes, browser submits, account changes, external sends, private exports, and destructive actions cannot run without approval.
5. Long-running browser/repo/research work runs in a worker service, not inside Vercel functions.
6. SSO/API-key scopes protect every `/api/v1/*` route in production mode.
7. QA covers unit, integration, E2E, security, API, desktop, and release smoke tests.
8. ProofPackets are complete, recallable, and integrity-checked.
9. The workbench is responsive, accessible, and clear about state, gates, and next action.
10. Deployment, rollback, operation, and local bridge setup are documented and tested.

## QA And Senior Engineering Review

User testing:

- Paste a rough prompt, select a target, fix it, and verify fixed prompt, contract, score, citations, gates, and ProofPacket.
- Sync upload/GitHub/QNAP/Recall context and verify citations appear without raw secrets.
- Start browser or repo agent work and confirm approval is required.
- Approve and reject separate requests and confirm correct state transitions.
- Refresh, quit, and relaunch desktop app, then verify state is still visible.

QA engineer testing:

- Empty states, invalid inputs, malformed JSON, oversized prompt, bad source id, bad approval id.
- Concurrent double-clicks for prompt creation, context sync, agent start, and approval decision.
- Store persistence, malformed store recovery, non-writable store behavior.
- Dev auth versus prod-like auth.
- Accessibility smoke for keyboard focus, labels, landmarks, and readable state.

Senior frontend testing:

- Loading, success, and error states for every API action.
- Responsive layout at mobile, laptop, and desktop sizes.
- No stale selected run, stale proof tab, duplicated run, text overflow, or hidden approval state.
- Visual hierarchy makes the next action obvious.

Senior backend testing:

- Zod validation and stable error envelopes on every route.
- Auth and API-key enforcement on every protected route.
- Idempotent approval decisions and blocked repeated decisions.
- Store mutation through one abstraction, with race risk documented until database migration.
- Redaction before persistence for prompt text, context chunks, audit events, and ProofPackets.

Release smoke:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `/api/health`
- `/api/v1/catalog/v15`
- `/api/v1/v10/readiness`
- Prompt run -> agent run -> approval -> ProofPacket retrieval
- Desktop cold launch

## 100 Future-Back Questions, Answers, And Solutions

| # | Future-back question | Answer | Solution |
| --- | --- | --- | --- |
| 001 | What must v10 feel like on first launch? | A cockpit, not a prototype. | Keep prompt intake, context, readiness, gates, and proof visible on one screen. |
| 002 | What is the primary first action? | Paste or upload a rough prompt. | Make prompt intake the left-side anchor with one primary action. |
| 003 | What output proves immediate value? | Fixed prompt plus contract. | Always render fixed prompt first, then contract and proof. |
| 004 | What does the user trust? | Sources, approvals, tests, and proof. | Show citations, gates, proof id, and approval state near output. |
| 005 | What should disappear? | Raw doctrine walls during normal use. | Use focused review by default and expose full 100 on demand. |
| 006 | How should Claude Design prompts improve? | They should include workflow, visual standards, and screenshot QA. | Add Claude Design enhancement pack and design-specific acceptance checks. |
| 007 | How should coding-agent prompts improve? | They should include files, tests, constraints, and rollback. | Add coding contract output with verifiable commands. |
| 008 | How should browser-agent prompts improve? | They should name unsafe actions before browsing. | Add browser safety pack and approval gate mapping. |
| 009 | How should research prompts improve? | They should require citations and freshness. | Add research/API mode with source-per-claim rule. |
| 010 | What is the v10 north-star workflow? | Intake -> context -> contract -> agent -> verify -> recall. | Implement L0-L7 as visible product stages. |
| 011 | Is current state v0.1? | No, it is a v3 foundation. | Label maturity honestly and show readiness gaps. |
| 012 | What makes it not v10 yet? | Simulated connectors and shallow QA. | Build connector tests, worker service, and route coverage. |
| 013 | What is the biggest backend risk? | File-store race and incomplete auth coverage. | Move to Postgres and add prod-like auth tests. |
| 014 | What is the biggest frontend risk? | Dense UI hides state meaning. | Add KPI, done, and lattice panels with clear status language. |
| 015 | What is the biggest safety risk? | A future adapter bypasses approval rules. | Centralize gated action policy and test every adapter. |
| 016 | What is the biggest context risk? | Indexing private data. | Redact before storage and log only safe summaries. |
| 017 | What is the biggest proof risk? | ProofPackets become decorative. | Require hashes, citations, commands, gates, and verifier results. |
| 018 | What is the biggest desktop risk? | Wrapper diverges from web app. | Keep desktop as launcher for same canonical app. |
| 019 | What should be configurable? | Sources, auth, worker, budgets, signing. | Add typed config and health checks. |
| 020 | What should not be configurable? | Safety gates and secret redaction. | Treat them as hard product invariants. |
| 021 | What does L0 own? | Prompt signal and intent. | Store prompt hash, source, and target surface. |
| 022 | What does L1 own? | Context attachment. | Normalize chunks with source id, hash, permission, freshness. |
| 023 | What does L2 own? | DoneContract. | Emit objective, constraints, acceptance checks, and forbidden actions. |
| 024 | What does L3 own? | Design of output and workflow. | Use target-surface enhancement packs. |
| 025 | What does L4 own? | Agent execution. | Use adapter state machine and approvals. |
| 026 | What does L5 own? | Verification. | Separate generator, evaluator, and verifier evidence. |
| 027 | What does L6 own? | Operations. | Add health, readiness, audit, runbook, rollback. |
| 028 | What does L7 own? | Recall. | Retrieval API for prompts, proofs, decisions, and patterns. |
| 029 | Where is A1 required? | Prompt repair, catalog selection, redaction, scoring. | Prefer deterministic code before model calls. |
| 030 | Where is A2 useful? | Synthesis, design prompts, summaries. | Use assisted generation with citations. |
| 031 | Where is A3 allowed? | Browser/repo/research agents with approval. | Keep bounded state machine and proof. |
| 032 | Where is A4 forbidden today? | Autonomous writes or sends. | Reserve for explicit future approval and scopes. |
| 033 | What should IQRSQPI start with? | Intent. | Ask what outcome and target surface the prompt needs. |
| 034 | What questions matter most? | Missing context, risk, proof, acceptance. | Select focused v15 questions by surface. |
| 035 | What research is needed? | Repo, source, docs, and live web when unstable. | Attach context sources with citations. |
| 036 | What synthesis is needed? | A useful prompt, not a lecture. | Output concise fixed prompt first. |
| 037 | What qualification is needed? | Score and gaps. | Show readiness score and missing evidence. |
| 038 | What proof is needed? | Hashes, commands, citations, approvals. | Persist ProofPacket records. |
| 039 | What iteration is needed? | Versions and diffs. | Add prompt version history and diff view. |
| 040 | How should confidence be shown? | As evidence-backed status, not vibe. | Tie score to context, tests, gates, and proof. |
| 041 | What should GitHub connector do first? | Read repo metadata and relevant files. | Use read-only default with approval for writes. |
| 042 | What should Gitea connector do first? | Mirror GitHub behavior for private repos. | Add URL/token config and scoped read endpoints. |
| 043 | What should QNAP connector do first? | LAN-first file summaries. | Index allowed folders through local bridge. |
| 044 | What should Recall.it connector do first? | Retrieve memory summaries. | Store citations and safe snippets only. |
| 045 | What should upload connector do first? | Parse user-provided files. | Redact and chunk before storage. |
| 046 | What should web connector do first? | Scrape approved public URLs. | Require URL input and cite exact source. |
| 047 | What should local repo connector do first? | Capture branch, remote, and selected files. | Use bridge to prevent broad uncontrolled reads. |
| 048 | What connector action requires approval? | Writes, submits, exports, account changes, destructive actions. | Enforce in server policy. |
| 049 | What context metadata matters? | Source, permission, hash, freshness, owner. | Persist fields for every chunk. |
| 050 | What context should never persist? | Raw secrets, cookies, tokens, private credentials. | Redact before persistence. |
| 051 | What agent adapters are needed? | Prompt repair, design prompt, browser, repo, research. | Keep adapters behind one runner contract. |
| 052 | What state machine is required? | Draft, approval, running, verifying, proof-ready, complete, failed. | Persist transitions and audit events. |
| 053 | What should approval request show? | Reason and exact gated actions. | Render approval rail with approve/reject. |
| 054 | What should rejection do? | Fail safely with reason. | Never create success proof after rejection. |
| 055 | What should approval do? | Allow bounded next step only. | Record approval note and run transition. |
| 056 | What should verifier see? | Final artifacts, not the generator's hidden chain. | Store verifier input package. |
| 057 | What should evaluator challenge? | Claims, safety, completeness, and tests. | Add evaluator checklist per run. |
| 058 | What should worker service run? | Long browser, repo, and research tasks. | Keep Vercel as control plane. |
| 059 | What should queue track? | Run id, adapter, approval, budget, status. | Add worker database table. |
| 060 | What should be simulated today? | Unsafe external effects. | Proof should say no external side effects executed. |
| 061 | What does SSO need? | OIDC issuer, client, workspace, role. | Add workspace/user tables and auth middleware. |
| 062 | What do API keys need? | Scope, owner, expiration, audit. | Store hashed keys with route scopes. |
| 063 | What does audit need? | Actor, action, target, metadata, timestamp. | Continue append-only audit events. |
| 064 | What does logging avoid? | Prompt secrets and private chunks. | Log ids and hashes, not raw content. |
| 065 | What does observability need? | Trace id, run id, source id, adapter, version. | Add high-cardinality safe fields. |
| 066 | What does rollback need? | Versioned prompt and connector state. | Add versions and undo metadata. |
| 067 | What does deployment need? | Vercel app, Postgres, worker, bridge. | Document and smoke each component. |
| 068 | What does bridge registration need? | Local identity and allowed roots. | Use local config and cloud registration token. |
| 069 | What does QNAP deployment need? | LAN mount and permissions. | Prefer LAN path, Tailscale backup only. |
| 070 | What does production disable? | Anonymous dev auth. | Test prod-like unauthorized failures. |
| 071 | What should visual design borrow? | Light studio, left nav, central workbench, right gates rail. | Use RIG App Studio layout and status cards. |
| 072 | What should the app avoid? | Marketing hero and decorative noise. | Keep task-first workbench. |
| 073 | What should typography do? | Make output readable. | Use restrained UI type and document card output. |
| 074 | What should colors do? | Signal state. | Use green, gold, red, blue, violet sparingly. |
| 075 | What should mobile do? | Stack without hiding core actions. | Collapse rails and preserve prompt/output order. |
| 076 | What should accessibility prove? | Keyboard and labels work. | Add E2E a11y smoke. |
| 077 | What should empty state say? | What to do next. | Show workbench armed and next action. |
| 078 | What should error state say? | Specific recovery. | Surface API error message and request id. |
| 079 | What should loading state say? | Which operation is busy. | Use per-button busy state. |
| 080 | What should success state say? | Proof is ready. | Show score, citations, questions, proof id. |
| 081 | What unit tests are must-have? | Redaction, catalog, questions, readiness, approvals. | Add coverage before release. |
| 082 | What route tests are must-have? | Every `/api/v1/*` path. | Test status codes, schemas, auth. |
| 083 | What integration tests are must-have? | Context -> prompt -> agent -> approval -> proof. | Run with temp store. |
| 084 | What E2E tests are must-have? | Core workflow and refresh persistence. | Use Playwright against local app. |
| 085 | What desktop tests are must-have? | Cold launch and server reuse. | Script app launch and health check. |
| 086 | What security tests are must-have? | Auth, redaction, approval bypass. | Make failures hard blocks. |
| 087 | What performance tests matter? | Prompt repair latency and large input. | Add max-size and timing smoke. |
| 088 | What data tests matter? | Store restart and duplicate prevention. | Move to database for v10. |
| 089 | What design tests matter? | Screenshots at desktop/mobile. | Compare core layout and state visibility. |
| 090 | What release test matters most? | No hidden external side effects. | Keep proof and approval audit mandatory. |
| 091 | What should docs teach first? | How to use the app. | Add quickstart and API examples. |
| 092 | What should docs teach second? | How to connect context. | Add GitHub/Gitea/QNAP/Recall setup. |
| 093 | What should docs teach third? | How to verify a run. | Add ProofPacket recall examples. |
| 094 | What should docs teach operators? | Deploy, rollback, auth, worker, bridge. | Add production runbook. |
| 095 | What should docs teach developers? | Route contracts and test commands. | Add API contract section. |
| 096 | What should the app expose by API? | Readiness, catalog, runs, approvals, proofs. | Add `/api/v1/v10/readiness`. |
| 097 | What should the app expose by CLI? | Fix, status, proof recall, readiness. | Preserve `rig prompt-master` compatibility. |
| 098 | What should the app expose to agents? | MCP/HTTP with scoped tools. | Use RigForge-like MCP/contract patterns. |
| 099 | What is the next best slice? | API coverage and connector depth. | Implement route tests and real adapter contracts. |
| 100 | What makes v10 credible by 4 PM? | Honest gaps plus visible upgrade and verified proof. | Ship readiness cockpit, master plan, tests, and commit. |

## Immediate Build Slices

1. Add v10 readiness model and API.
2. Add readiness/KPI/DoneContract/lattice panels to the workbench.
3. Add this v10 master plan with the 100 answered future-back questions.
4. Add unit coverage for readiness data and keep existing prompt/approval tests green.
5. Run typecheck, tests, build, API smoke, and desktop build.

## External Inputs Used

- `rodgemd1-lgtm/rigforge-deterministic-platform`: public repository. Borrow deterministic phases, GEV, ProofPackets, ledgers, MCP, cockpit, and contract-based done.
- `rodgemd1-lgtm/rig-design-studio`: private via authenticated metadata; use as design-studio direction when full file access or upload is available.
- `rodgersintelligence/rig-systems-engineering-private`: private via authenticated metadata; use as doctrine source when full file access is available.
- `rodgemd1-lgtm/rig-design-intelligence-cli`: private via authenticated metadata; use as future CLI design-intelligence input when full file access is available.
