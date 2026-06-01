# RIG_AUDIT — RIG-AI-Engineering

## Profile
- **Repo:** `/Users/mikerodgers/RIG-AI-Engineering` (271 git-tracked files)
- **Identity:** Fork of Microsoft `AI-Engineering-Coach` VS Code extension (`package.json` name `ai-engineer-coach` v0.1.0, MIT), extended with a RIG prompt-engineering layer.
- **Stack:** TypeScript extension (`src/`, esbuild, vitest, ~40 analyzer/test files) + Python engine (`python/rig/`, 3453 lines across 5 files) + bash/zsh CLI (`rig`, `rig-install`, `rig-hook.zsh`, 842 lines).
- **Scale:** 1785-line `prompt_engine.py`; 18 CLI commands; 9 MCP tools; 1000 templates / 10 categories (458 KB JSON); 5 harness parsers; 6-dimension scorer.
- **Status:** Active (V10_STATUS.md / V10_VISION.md present, README dated, live behavior verified by reading scorer formula, proxy, watch daemon, and MCP server).

## Security summary
- 0 live keys (`AIzaSy`/`sk-`/`gh[ps]_`/`AKIA` scan over 271 tracked files, test/mock/example excluded).
- ROTATE actions: none.
- Read-only against local session stores; proxy forwards plaintext to a runtime target; no hardcoded secrets.

## README BEFORE → AFTER
- BEFORE: **42.2** FAIL (existing README.md — marketing-leaning, sparse causal grounding)
- AFTER: **100.0** PASS (mechanism 42/42, specificity 30/30, evidence 28/28, 0 cliches, 0 hedges)

## Capability one-liner
Offline 6-dimension prompt scorer + auto-rewriter (CLI/MCP/HTTP-proxy/daemon) that grades prompts pre-send and coaches across 5 AI-coding harnesses; vertical=infra, reuse=0.8.

## Verdict
**KEEP** (standalone). Functional, original RIG layer on a credible upstream, no secrets, real mechanism. Keep as the prompt-quality/coaching infra tile; surface its scorer to other monorepo tiles through the existing `rig_score_prompt` MCP tool rather than vendoring the engine.
