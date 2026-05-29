# RIG V10 Git Agent, CLI, and MCP Readiness Design

> Status: planning and proof only as of 2026-05-29. This document defines the target operating shape and local proof paths. It does **not** claim final PASS or product completion.

## V10 Product Promise

RIG AI Engineering should become a product-grade local-first repo that can be used in four safe ways from the same core logic:

1. as a **Git-aware planning and proof agent** for repo work,
2. as a **deterministic CLI** for local and CI execution,
3. as an **MCP server/client surface** for agent tools,
4. as a **weekly self-improvement loop** that proposes changes with proof, never self-approves, and never requires secrets to produce local value.

## Future-Back Animation Summary

| Lens | V10 design target |
| --- | --- |
| Future-back product | One repo, one doctrine, one proof model across CLI, app, MCP, and agent workflows. |
| User workflow | Issue -> intake -> local smoke -> focused implementation -> proof packet -> human review. |
| Agent workflow | Planner defines contract, reviewer checks risk, fixer makes bounded changes, QA verifies commands and proof. |
| CLI | `rig` remains the front door, with deterministic local-first commands before any connected or agentic mode. |
| MCP | Keep tool support first; add resource and prompt contracts only where clients can consume them deterministically. |
| Data | Local repo, local catalogs, local proof, optional read-only QNAP/GitHub/Gitea/Recall adapters, no secret printing. |
| Deterministic layer | Catalog audit, intake generation, proof template generation, build/test/smoke, and static config checks must run locally. |
| Design system | Reuse Rig Prompt Master and existing RIG terminology so browser and terminal paths describe the same workflow. |
| Quality | Human review plus deterministic gates before agentic execution or weekly carry-forward. |
| Weekly improvement | Produce reviewed backlog/proof updates only; never deploy, publish, schedule, message, or approve itself. |

## CLI Surface

### Required surfaces

- **Deterministic local**
  - `./rig v15 audit`
  - `./rig v15 questions --all`
  - `./rig v15 intake "<task>" --fast`
  - `./rig v15 proof "<title>"`
  - `npm run build`
- **Local smoke / browser**
  - `./rig app --smoke`
- **Prompt repair / operator workflow**
  - `./rig prompt-master ...`
  - `./rig design-prompt ...`
  - `./rig context-status`
- **Connected but read-only**
  - GitHub/Gitea/Recall/QNAP enrichment only when configured
- **Agentic**
  - `rig run`, weekly review/fix loops, and any future Git agent mode must stay approval-gated

### First deterministic local smoke command

Use `./rig v15 audit` as the first local smoke command because it is repo-local, deterministic, read-only, and validates the operator catalogs/hashes without requiring remote APIs or secrets.

## MCP Surface

### Keep now

The existing server in `python/rig/rig-mcp-server.py` already supports a tool-first MCP shape. The v10 contract should keep these categories:

- prompt tools: score, enhance, fix, catalog, context status
- operator tools: v15 audit, intake, question/resource/persona retrieval
- coaching tools: stats, trends, history

### Add next

- **Resources**: expose the reviewed catalogs and proof templates as read-only MCP resources so clients can inspect the same deterministic source files without re-encoding them.
- **Prompts**: expose a small prompt catalog for `planning`, `review`, `fix`, and `qa` role handoffs, backed by the same intake/proof language used by the CLI.

### Intentionally deferred

Stateful MCP actions that write to remotes, mutate git state, or trigger deployments should remain deferred until there is a human-approved contract, stable auth story, and replayable proof path.

## Agent Roles, Routing, and Quality Gates

| Role | Primary job | Preferred mode | Gate to exit |
| --- | --- | --- | --- |
| Planner | turn an issue into scope, blockers, proof commands, and approval boundaries | cheapest reliable planning model | written contract with proof paths |
| Reviewer | find logic, security, and scope risk | strong review model | review notes resolved or accepted |
| Fixer | make bounded repo changes | code-capable implementation model | targeted commands pass or failures are documented |
| QA | run deterministic checks and compare evidence to contract | deterministic scripts first, evaluator model second | proof packet updated, no silent failures |

### Routing expectations

- Default to deterministic scripts before model calls.
- Use fast/cheap models for intake, summarization, and classification.
- Use stronger models only for cross-file reasoning, review, or repair proposals.
- Keep generator and evaluator roles separate for any future automated weekly loop.

### Minimum quality gates

1. scope and safety contract,
2. deterministic local smoke,
3. targeted build/test evidence,
4. review of security/privacy boundaries,
5. explicit human approval before any external side effect.

## Weekly Improvement Loop

### Allowed without extra approval

- run local audits,
- refresh backlog/design docs,
- generate focused intake packets,
- generate proof templates,
- propose safe follow-up issues and tests.

### Must never run without human approval

- deploy or publish,
- create or activate schedules,
- send messages or notifications,
- modify external services,
- write to remote systems with secrets,
- auto-merge, self-approve, or rewrite history.

## Current Blockers and Gaps

### Blockers observed locally

- `npm run lint` fails because ESLint 10 cannot find an `eslint.config.*` file.
- `npm run test` has pre-existing `apps/rig-prompt-master` failures:
  - missing `next/server` dependency for `apps/rig-prompt-master/lib/http.ts`,
  - catalog tests resolve `catalogs` from the wrong base path and fail to open `/tmp/workspace/catalogs/open-source-agent-harnesses.yaml`.

### Missing APIs / secrets / docs / tests

- Optional read-only API adapters need documented setup expectations but must stay optional for local value.
- No dedicated root agent contract files were found for planner/reviewer/fixer/QA handoffs.
- No single repo doc previously captured the Git agent + CLI + MCP + weekly-improvement readiness target in one place.
- The browser/operator app paths have tests, but the failing `apps/rig-prompt-master` suite shows the local contract is not yet fully wired from the repo root.

## Proof Paths and Commands

### Durable proof files

- `docs/v10-git-agent-cli-mcp-readiness.md`
- `README.md`
- `V10_STATUS.md`

### Commands run for this planning pass

```bash
npm install
npm run build
npm run test
npm run lint
./rig v15 audit
```

### Current proof status

- `npm run build` - passes after installing dependencies.
- `npm run test` - runs but has pre-existing failures in `apps/rig-prompt-master`.
- `npm run lint` - fails due to missing flat ESLint config.
- `./rig v15 audit` - should remain the first deterministic local smoke command for this repo.

## Definition of Done for this planning artifact

- V10 product promise is explicit.
- CLI and MCP surfaces are defined without overclaiming implementation.
- Agent roles, routing, and gates are documented.
- Weekly improvement boundaries are explicit.
- Current blockers and proof commands are captured.
