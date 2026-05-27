# RIG AI Engineering v10

**Operator-grade AI engineering coach, prompt template library, and live feedback system.**

Makes every prompt 10x more effective through context awareness, RIG doctrine enforcement, automatic enhancement, and continuous learning.

## What This Is

A comprehensive prompting program with 18 CLI commands, MCP server, zsh hook, background daemon, and HTTP proxy — all working together to improve your AI-assisted coding across 5 harnesses (Claude Code, Codex, OpenCode, Hermes, GSD-Pi).

### Key Features

- **Prompt Scoring** — 4-axis scoring (Specificity, RIG Doctrine, Context, Actionability) with 0-100 grades
- **Auto-Enhancement** — Automatically rewrites weak prompts with context, acceptance criteria, and verification
- **Closed-Loop Learning** — Executes prompts via Hermes, analyzes outcomes, tracks success patterns
- **Proactive Coaching** — Background daemon watches your workspace and injects coaching into AGENTS.md
- **Pre-Send Hook** — Scores prompts before they reach Hermes, warns if below threshold
- **MCP Server** — 9 tools exposed via MCP protocol for any AI assistant
- **HTTP Proxy** — Transparent prompt scoring/rewriting for any AI tool
- **1,000 Prompt Templates** — Searchable across 10 categories
- **Cross-Harness Auditing** — Detects silos, mega-sessions, and doctrine gaps

## Installation

### Prerequisites

- macOS or Linux
- Python 3.10+
- Node.js 20+ (for the AI Engineering Coach VS Code extension)
- Hermes Agent (optional, for `rig run` execution)

### Quick Install

```bash
# Clone the repo
git clone https://github.com/rodgemd1-lgtm/RIG-AI-Engineering.git
cd RIG-AI-Engineering

# Install the CLI to ~/bin/rig
./rig-install

# Add to PATH if needed
export PATH="$HOME/bin:$PATH"
```

### Install Options

```bash
# User install (default) — installs to ~/bin/rig
./rig-install

# Global install — installs to /usr/local/bin/rig
./rig-install --global

# Force overwrite existing install
./rig-install --force

# Install Hermes pre-send hook
./rig-install --hook

# Register MCP server in Hermes config
./rig-install --mcp

# Install background watcher daemon (macOS launchd)
./rig-install --launchd
```

### Verify Installation

```bash
rig --help          # Show all commands
rig doctor          # System health check
rig watch scan      # Single workspace scan
```

## Quick Start

```bash
# Score a prompt
rig score "fix the auth bug"

# Enhance a prompt (auto-injects context, RIG doctrine, verification)
rig enhance "fix the auth bug"

# Full closed-loop: enhance → execute via Hermes → learn
rig run "deploy model to fleet"

# Personal coaching diagnostic
rig coach

# Weekly summary report
rig report 7

# Audit all 5 harness sessions
rig check --days 7

# Search prompt templates
rig suggest "agent orchestration"

# A/B test two prompt variants
rig ab-test "fix bug" "fix the authentication bug in src/auth/login.js with tests"
```

## All Commands

### Prompt Intelligence
| Command | Description |
|---------|-------------|
| `rig enhance <prompt>` | Score + auto-enhance with context injection |
| `rig score <prompt>` | 4-axis scoring (0-100) with detailed findings |
| `rig run <prompt>` | Enhance → Execute via Hermes → Learn outcome |
| `rig ab-test "A" "B"` | A/B test two prompt variants, declare winner |
| `rig validate` | Score the prompt in your clipboard |
| `rig suggest <query>` | Search 1000+ prompt templates |

### Learn & Improve
| Command | Description |
|---------|-------------|
| `rig learn` | Analyze latest Hermes session → extract signals |
| `rig coach` | Personal diagnostic: weaknesses + recommendations |
| `rig trends [days]` | Score trends over time (default 30 days) |
| `rig report [days]` | Summary report with trend + top prompts (default 7) |
| `rig history [n]` | Last n prompts with scores (default 10) |
| `rig stats` | Personal prompting dashboard |

### System
| Command | Description |
|---------|-------------|
| `rig check [--days n]` | Audit all 5 harness sessions |
| `rig prompt [prompt]` | Quick score (pipe or argument) |
| `rig refresh` | Refresh CLAUDE.md/AGENTS.md coaching context |
| `rig doctor` | Full system health check |
| `rig template <key>` | Fill built-in template (code-review, bug-fix, deploy, research) |
| `rig install [--hook\|--mcp\|--launchd]` | Install dependencies + integrations |
| `rig watch [scan\|daemon\|status\|stop]` | Workspace watcher daemon |
| `rig proxy` | HTTP prompt proxy for automatic scoring/rewriting |
| `rig archon` | List Archon workflows |

## Integration Layers

### 1. CLI (any terminal)
```bash
rig enhance "your prompt"
rig run "your prompt"
```

### 2. MCP Server (any AI assistant)
Registers 9 tools in Hermes config automatically via `rig-install --mcp`:
- `rig_score_prompt` — Score a prompt
- `rig_enhance_prompt` — Analyze and enhance
- `rig_run_prompt` — Execute and learn
- `rig_coach` — Personal diagnostic
- `rig_get_stats` — Personal stats
- `rig_get_trends` — Score trends
- `rig_suggest_template` — Search templates
- `rig_get_history` — Prompt history
- `rig_validate_clipboard` — Score clipboard

### 3. Zsh Pre-Send Hook
```bash
rig-install --hook    # Install
rig-hook-on           # Enable
# Now `hermes chat -q "prompt"` scores before sending
rig-hook-off          # Disable
```

### 4. Background Daemon (macOS)
```bash
rig-install --launchd  # Install launchd service
rig watch status       # Check daemon status
rig watch scan         # Run single scan
```
Watches workspace every 5 minutes, injects coaching into AGENTS.md.

### 5. HTTP Proxy
```bash
rig proxy --port 18787 --target http://127.0.0.1:4141
# Configure AI tools to use http://127.0.0.1:18787 as API base
# All prompts are scored and auto-rewritten if below threshold
```

## Harness Data Paths

| Harness | Data Path | Parser |
|---------|-----------|--------|
| Claude Code | `~/.claude/projects/<path>/<uuid>.jsonl` | `parser-claude.ts` |
| Codex CLI | `~/.codex/sessions/<y>/<m>/<d>/rollout-*.jsonl` | `parser-codex.ts` |
| OpenCode | `~/.local/share/opencode/storage/` | `parser-opencode.ts` |
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
| `cross-harness-context-loss` | Single-harness silos (>70% in one tool) |

## Prompt Templates

10 categories, 100+ templates each in `prompt-templates/rig-prompt-templates.json`:

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

## Architecture

```
rig (bash CLI)
  ├── 18 commands
  └── → python/rig/prompt_engine.py (1700+ lines)
        ├── ContextSynthesizer (git, sessions, project)
        ├── PromptOptimizer (scoring, enhancement, lattice)
        ├── LearningEngine (outcome tracking, success patterns)
        ├── SessionAnalyzer (Hermes session post-analysis)
        ├── CoachingEngine (diagnostic, trends, recommendations)
        └── TemplateEngine (semantic search, built-in templates)

rig-mcp-server.py — JSON-RPC stdio MCP server (9 tools)
rig-watch.py      — Background workspace daemon (launchd)
rig-proxy.py      — HTTP prompt proxy (auto-score + rewrite)
rig-hook.zsh      — Zsh pre-send hook (hermes-smart wrapper)
```

## License

MIT (upstream Microsoft AI Engineering Coach) + custom extensions MIT
