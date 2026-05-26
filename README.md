# RIG AI Engineering

**Operator-grade AI engineering coach, prompt template library, and live feedback system for the Rodgers Intelligence Group fleet.**

## What This Is

A complete system for improving AI-assisted coding across 5 harnesses (Claude Code, Codex, OpenCode, Hermes, GSD-Pi) with:

1. **Harness Parsers** — TypeScript parsers that read session data from all 5 AI coding tools (including Hermes and GSD-Pi, which are not supported by the upstream Microsoft project)
2. **Custom Anti-Pattern Rules** — 6 RIG-specific rules for detecting cross-harness silos, Hermes skill underuse, terminal overuse, and doctrine adherence
3. **Live Feedback System** — CLI tools that audit sessions, score prompts, and inject coaching context into CLAUDE.md and AGENTS.md automatically
4. **1,000 Prompt Templates** — Structured templates organized across 10 categories covering RIG doctrine, fleet infrastructure, agent orchestration, content engineering, client acquisition, product code, research, healthcare, personal brand, and diagnostic coaching
5. **Archon Workflows** — Automated harness processes for running AI Coach checks, prompt scoring, and template suggestions

## Quick Start

```bash
# Audit all harness sessions
zsh scripts/ai-coach-check.sh --days 7

# Score a prompt
echo "your prompt" | zsh scripts/ai-coach-prompt.sh

# Refresh coaching context in CLAUDE.md and AGENTS.md
zsh scripts/ai-coach-refresh.sh

# Find prompt templates for a task
zsh scripts/ai-coach-suggest.sh "deploy model to fleet"
zsh scripts/ai-coach-suggest.sh --category fleet-infrastructure
zsh scripts/ai-coach-suggest.sh --list
```

## Live Feedback System

Every 6 hours, `ai-coach-refresh` runs via cron and writes a `## AI Coach Context` block into:
- `~/.claude/CLAUDE.md` — read by Claude Code at session start
- `~/AGENTS.md` — read by Codex, OpenCode, and other agents

All agents automatically read these files, so coaching context flows into every prompt without manual intervention.

## Harness Data Paths

| Harness | Data Path | Parser |
|---------|-----------|--------|
| Claude Code | `~/.claude/projects/<path>/<uuid>.jsonl` | `parser-claude.ts` (native) |
| Codex CLI | `~/.codex/sessions/<y>/<m>/<d>/rollout-*.jsonl` | `parser-codex.ts` (native) |
| OpenCode | `~/.local/share/opencode/storage/` | `parser-opencode.ts` (native) |
| VS Code Copilot | `~/Library/.../workspaceStorage/` | `parser-vscode.ts` (native) |
| **Hermes** | `~/.hermes/sessions/session_*.json` | `parser-hermes.ts` (custom) |
| **GSD-Pi** | `~/.gsd/sessions/<project>/` | `parser-gsd.ts` (custom) |

## Custom Rules

| Rule | What it detects |
|------|---------------|
| `hermes-skill-usage` | Low skill invocation in Hermes sessions |
| `hermes-context-injection` | Prompts missing context injection |
| `hermes-terminal-overuse` | Raw terminal over purpose-built tools |
| `gsd-plan-verify-gaps` | Missing plan/verify cycle in GSD-Pi |
| `rig-doctrine-adherence` | RIG doctrine pattern gaps |
| `cross-harness-context-loss` | Single-harness silos (>80% in one tool) |

Rules live in `~/.ai-engineer-coach/rules/` and are picked up automatically by the AI Engineering Coach VS Code extension.

## 1,000 Prompt Templates

Located in `prompt-templates/rig-prompt-templates.json`. 10 categories, 100 templates each:

1. **rig-doctrine-execution** — IQRSQPI, BMS modes, gates, ProofPackets
2. **fleet-infrastructure** — Nodes, models, mesh, security
3. **agent-orchestration** — Susan, Jake, fleets, swarms
4. **content-engineering** — LinkedIn, brand, engagement
5. **client-acquisition** — Outreach, proposals, ROI
6. **product-code** — Features, APIs, releases
7. **research-intelligence** — Blueprints, signals, forecasts
8. **healthcare-verticals** — Hospital, PE, law, fintech
9. **personal-brand** — Speaking, hiring, advisory
10. **diagnostic-coaching** — Scoring, audits, optimization

Search templates: `zsh scripts/ai-coach-suggest.sh "your task"`

## Archon Workflows

See `archon/` directory for automated harness processes:
- `coach-check-workflow.yaml` — Run ai-coach-check on schedule
- `coach-refresh-workflow.yaml` — Refresh CLAUDE.md/AGENTS.md coaching context
- `coach-score-workflow.yaml` — Score prompts before sending
- `coach-template-workflow.yaml` — Find and fill prompt templates

## License

MIT (upstream Microsoft AI Engineering Coach) + custom extensions MIT