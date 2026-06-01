# RIG_CAPABILITY — RIG-AI-Engineering

**does:** Scores a prompt 0-100 across 6 weighted dimensions (context 0.25, specificity 0.20, spec-driven 0.20, verification 0.15, length 0.10, RIG doctrine 0.10) with a silo penalty, then auto-rewrites prompts below a threshold, executes them via Hermes/Claude, and tracks outcomes. Forks Microsoft's AI-Engineering-Coach VS Code extension (read-only multi-harness session analyzer) and adds a Python/bash prompt-engineering layer.

**inputs:** A raw prompt string (CLI arg, clipboard, stdin, or intercepted HTTP `/v1/chat/completions` body); local harness session stores under `~/.claude`, `~/.codex`, `~/.local/share/opencode`, `~/.hermes`, `~/.gsd`; git working state; `prompt-templates/rig-prompt-templates.json` (1000 templates / 10 categories).

**outputs:** A score dict (`overall_score`, per-dimension scores, findings list, rewritten prompt); enhanced/rewritten prompts; execution outcomes logged for learning; coaching lines written to `~/AGENTS.md` by the daemon; 9 MCP JSON-RPC tools; VS Code dashboard webview (upstream).

**entrypoint:** `./rig` (bash CLI, 18 commands) → `python/rig/prompt_engine.py` (1785 lines). Secondary: `python/rig/rig-mcp-server.py` (stdio MCP), `python/rig/rig-proxy.py` (HTTP proxy, port 18787), `python/rig/rig-watch.py` (launchd daemon, 300 s interval). VS Code: `src/extension.ts`.

**rig_vertical:** infra (operator tooling / prompt-quality middleware for the RIG fleet)

**reuse_score:** 0.8

**consolidate_into:** standalone — this is the prompt-quality / coaching tile of the RIG operator stack. Its scorer and 1000-template corpus are reusable across the fleet, but it is a distinct middleware product (CLI + MCP + proxy + daemon), not a sub-feature of forge/design/gtm. Keep standalone; expose its scorer via the existing MCP server so other monorepo tiles can call `rig_score_prompt` without vendoring the engine.
