# RIG AI Engineering v15 Status

Date: 2026-05-28
Status: local deterministic operator layer installed; RIG Prompt Master prompt upload/fix workflow added

## What v15 Adds

- `rig v15 audit` validates the open-source resource catalog, methodology-agent catalog, question bank, mappings, and SHA-256 hashes.
- `rig app [--port 8765]` starts the local RIG Prompt Master browser app and JSON API for prompt upload/fix, RigForge contracts, context status, catalog search, v15 gates, question-bank review, browser-task envelopes, and ProofPacket creation.
- `rig app --smoke` validates the Prompt Master API/static/catalog wiring.
- `rig v15 resources [query]` searches 50 reviewed open-source GitHub resources for agent, harness, browser, sandbox, RAG, eval, observability, and model-runtime work.
- `rig v15 personas [query]` searches 10 public-methodology review lenses.
- `rig v15 questions [query]` returns the 100-question bank or a filtered subset.
- `rig v15 intake <task>` generates a full 100-question intake packet with RIG coordinate, selected resources, methodology panel, 13 gates, and proof requirements.
- `rig v15 intake <task> --fast` generates a focused subset for early planning.
- `rig v15 proof <title>` creates a local ProofPacket template.
- `rig prompt-master [prompt]`, `rig fix-prompt [prompt]`, `rig fix [prompt]`, and `rig prompt-master --file prompt.md` fix rough prompts with work/QNAP/GitHub/Gitea/Recall context, Prompt Master modes, enhancement packs, and a RigForge DoneContract.
- `rig design-prompt [prompt]` fixes Claude Design prompts with page-by-page walkthrough, screenshot QA, design polish, and RIG branding defaults.
- `rig context-status` checks whether local work, QNAP, GitHub, Gitea, Recall API, and the RIG context pack are available.
- The MCP server now exposes prompt-fix and context-status tools in addition to the v15 catalog/intake tools and original prompt intelligence tools.

## Safety Contract

v15 is cataloging, routing, prompt mastering, context status, intake, browser-envelope planning, API serving, and proof generation. It does not clone third-party repositories, execute third-party code, call models, send data externally, or change accounts. `rig prompt-master`, `rig design-prompt`, `rig fix-prompt`, and `rig app` may perform read-only local checks and read-only API lookups when GitHub/Gitea/Recall are configured; they must not print secrets or perform external writes.

Before using a third-party harness, pin the commit, review the license, sandbox the experiment, define rollback, and record the result in a ProofPacket.

## Compatibility

The v10 prompt engine remains intact for prompt scoring, enhancement, templates, learning, watcher, hook, and proxy behavior. v15 is an operator layer on top of that system.

Use `rig app --open` as the daily browser surface, `rig prompt-master ...` as the terminal prompt upload/fix workflow, and `rig design-prompt ...` for Claude Design work. Use `rig catalog ...` for raw catalog inspection and `rig v15 ...` for auditable operator workflows.
