# RIG AI Engineering v10 — COMPLETE

> Superseded operationally by RIG AI Engineering v15. See `V15_STATUS.md` for the catalog, intake, MCP, and ProofPacket operator layer. The v10 prompt engine remains intact for prompt intelligence.

## All Features Built and Deployed

### Prompt Intelligence
- [x] `rig enhance` — Context-aware prompt enhancement (git, sessions, project type)
- [x] `rig score` — 4-axis scoring (Specificity, RIG Doctrine, Context, Actionability, 0-100)
- [x] `rig run` — Closed loop: enhance → execute via Hermes → learn outcome
- [x] `rig ab-test` — A/B test two prompt variants, declare winner
- [x] `rig validate` — Score clipboard prompt
- [x] `rig suggest` — Semantic template search (1000+ templates)

### Learning & Coaching
- [x] `rig learn` — Post-response session analyzer (reads Hermes sessions)
- [x] `rig coach` — Personal diagnostic: weaknesses + recommendations
- [x] `rig trends` — Daily score averages, improvement/decline tracking
- [x] `rig report` — Summary report with trend + top prompts
- [x] `rig history` — Prompt history with scores
- [x] `rig stats` — Personal dashboard

### System
- [x] `rig check` — Audit all 5 harness sessions
- [x] `rig prompt` — Quick score (pipe mode)
- [x] `rig refresh` — CLAUDE.md/AGENTS.md coaching context
- [x] `rig doctor` — System health check
- [x] `rig template` — Built-in templates (code-review, bug-fix, deploy, research)
- [x] `rig install` — Dependencies installer
- [x] `rig archon` — List Archon workflows

### Integration
- [x] `rig-hook.zsh` — Pre-send zsh hook (hermes-smart wrapper)
  - Scores prompts before sending to Hermes
  - Interactive: send anyway / enhanced / full score / abort
  - `rig-hook-on` / `rig-hook-off` / `rig-hook-status`
- [x] `rig-mcp-server.py` — MCP server (16 tools via JSON-RPC stdio in v15.1)
  - Exposes all rig intelligence to any AI assistant via MCP
  - Registered in hermes config automatically via `rig-install --mcp`
- [x] Cross-harness session scanning (claude, codex, opencode, hermes, gsd)
- [x] Tool binary resolution for subprocess (works without .zshrc)

### Deployment
- [x] Local machine (macOS)
- [x] 48GB node (100.76.209.22)
- [x] GitHub: https://github.com/rodgemd1-lgtm/RIG-AI-Engineering

## Architecture
```
rig (bash CLI) → python/rig/prompt_engine.py (1700+ lines)
  ├── 16 commands (enhance, score, run, ab-test, learn, coach, etc.)
  └── All scoring/learning/optimization logic

rig-mcp-server.py → JSON-RPC stdio MCP server
  ├── 16 MCP tools (rig_score_prompt, rig_enhance_prompt, rig_fix_prompt, etc.)
  └── Auto-registered in hermes config

rig-hook.zsh → zsh pre-send hook
  ├── hermes-smart wrapper function
  └── Interactive prompt scoring before send
```
