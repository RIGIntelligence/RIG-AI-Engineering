# RIG AI Engineering v15

**Operator-grade AI engineering coach, prompt upload/fix workflow, prompt template library, open-source harness catalog, and deterministic v15 intake/proof system.**

Makes every coding-agent run more effective through context awareness, RIG doctrine enforcement, automatic enhancement, reviewed harness references, methodology-agent review, and ProofPacket discipline.

## What This Is

A comprehensive prompting and agent-engineering program with 20 CLI command groups, local RIG Prompt Master web app/API, MCP server, zsh hook, background daemon, HTTP proxy, reviewed open-source resource catalog, 10 methodology-agent lenses, and a 100-question intake system — all working together to improve AI-assisted coding across 5 harnesses (Claude Code, Codex, OpenCode, Hermes, GSD-Pi).

The daily front door is now `rig prompt-master`: upload or pipe any rough prompt, and RIG rewrites it with current work context from the local repo, QNAP policy, GitHub/Gitea remotes and APIs when configured, Recall API when configured, and the local RIG context pack. `rig fix-prompt` remains the compatible alias.

For the current future-back Git agent / CLI / MCP readiness plan and proof-first boundaries, see `docs/v10-git-agent-cli-mcp-readiness.md`.

### Key Features

- **Prompt Scoring** — 4-axis scoring (Specificity, RIG Doctrine, Context, Actionability) with 0-100 grades
- **RIG Prompt Master** — `rig prompt-master` accepts prompt files/stdin/arguments and returns a context-grounded prompt with a RigForge DoneContract
- **Claude Design Prompt Mode** — `rig design-prompt` turns rough Claude Design requests into page-by-page walkthrough prompts with screenshot QA and RIG branding
- **Local Prompt Master App** — `rig app --open` launches a browser app for prompt upload/fix, v15 gates, catalog search, browser envelopes, contracts, and ProofPackets
- **Auto-Enhancement** — Automatically rewrites weak prompts with context, acceptance criteria, and verification
- **Closed-Loop Learning** — Executes prompts via Hermes, analyzes outcomes, tracks success patterns
- **Proactive Coaching** — Background daemon watches your workspace and injects coaching into AGENTS.md
- **Pre-Send Hook** — Scores prompts before they reach Hermes, warns if below threshold
- **V15 Operator Layer** — Auditable catalog search, full/focused intake packets, 13 proof gates, and ProofPacket templates
- **MCP Server** — 17 tools exposed via MCP protocol for any AI assistant
- **HTTP Proxy** — Transparent prompt scoring/rewriting for any AI tool
- **1,000 Prompt Templates** — Searchable across 10 categories
- **Open-Source Harness Catalog** — 50 reviewed resources, license posture, first experiment, and load triggers
- **Methodology-Agent Panel** — 10 named public-method lenses with 100 required questions for agent, harness, and product-build review
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
rig v15 audit       # Validate the v15 catalogs
rig app --smoke     # Validate the local app/API/static wiring
```

## Quick Start

```bash
# Upload or pipe a rough prompt and get a fixed prompt back
rig app --open
rig fix-prompt --file prompt.md
rig prompt-master --mode claude-design --file prompt.md
rig design-prompt "fix this Claude Design walkthrough from entry point to contact page"
echo "build a browser-agent harness for RIG" | rig fix-prompt
rig fix "connect this prompt to QNAP GitHub Gitea and Recall"

# Check whether the context adapters are connected
rig context-status

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

# Generate a full v15 intake packet with all 100 questions
rig v15 intake "build a browser-agent harness for RIG"

# Generate a focused v15 packet for fast local planning
rig v15 intake "build a browser-agent harness for RIG" --fast

# Create a ProofPacket template
rig v15 proof "browser-agent harness"

# Search prompt templates
rig suggest "agent orchestration"

# A/B test two prompt variants
rig ab-test "fix bug" "fix the authentication bug in src/auth/login.js with tests"
```

## All Commands

### Prompt Intelligence
| Command | Description |
|---------|-------------|
| `rig fix-prompt [prompt]` | Fix rough prompt with current work/QNAP/GitHub/Gitea/Recall context |
| `rig fix [prompt]` | Alias for `rig fix-prompt` |
| `rig prompt-master [prompt]` | Alias for RIG Prompt Master prompt repair |
| `rig design-prompt [prompt]` | Fix Claude Design prompts with walkthrough, screenshot QA, and design polish defaults |
| `rig context-status` | Check context adapter status without fixing a prompt |
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
| `rig app [--open\|--smoke]` | Start or validate the local RIG Prompt Master browser app and JSON API |
| `rig watch [scan\|daemon\|status\|stop]` | Workspace watcher daemon |
| `rig proxy` | HTTP prompt proxy for automatic scoring/rewriting |
| `rig archon` | List Archon workflows |
| `rig catalog [resources\|personas\|questions]` | Show reviewed OSS resources, methodology agents, or the 100-question intake |
| `rig v15 [audit\|resources\|personas\|questions\|intake\|proof]` | Run the v15 deterministic operator layer |

## V15 Operator Layer

RIG v15 turns the open-source expansion into a deterministic operator layer for agent and harness work:

- `catalogs/open-source-agent-harnesses.yaml` — 50 GitHub resources with license posture, RIG role, first experiment, and load trigger.
- `catalogs/rig-methodology-persona-agents.yaml` — 10 methodology-inspired multi-role agents based on public engineering/product leadership methods. They are review lenses, not endorsements or impersonation.
- `catalogs/rig-methodology-question-bank.yaml` — 100 required intake/review questions, mapped 10 per methodology agent.
- `docs/rig-open-source-expansion.md` — operating guide and safety contract.
- `python/rig/rig_v15.py` — deterministic catalog, intake, audit, and ProofPacket CLI/MCP implementation.
- `python/rig/rig_prompt_fixer.py` — RIG Prompt Master prompt upload/fix workflow with read-only context adapters, Prompt Master modes, enhancement packs, and RigForge DoneContracts.
- `python/rig/rig_app_server.py` and `python/rig/app_static/` — local browser app and JSON API for the daily RIG Prompt Master workflow.

Use `rig app --open` when you want the daily browser workflow. Use `rig prompt-master` when you want RIG to repair any rough prompt and inject current context from the terminal. Use `rig design-prompt` for Claude Design prompts like page walkthroughs, website polish, screenshot repair, and RIG branding passes. Use `rig v15 audit`, `rig v15 resources`, `rig v15 personas`, `rig v15 questions`, `rig v15 intake`, and `rig v15 proof` when the work needs the full operator checklist. `rig catalog resources`, `rig catalog personas`, and `rig catalog questions` remain as raw catalog inspectors. The catalog is reference-first: do not clone or execute a third-party harness until the repo is pinned, license-reviewed, sandboxed, and captured in a ProofPacket.

### Prompt Master API

`rig app` binds to localhost and serves these read-first endpoints:

```bash
rig app --open
curl http://127.0.0.1:8765/api/health
curl http://127.0.0.1:8765/api/prompt-master/enhancements
curl http://127.0.0.1:8765/api/v15/resources
curl -X POST http://127.0.0.1:8765/api/prompt-master/fix \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"walk through the website pages in Claude Design and polish them one at a time","mode":"claude-design","enhancements":["rigforge-contract","claude-design-walkthrough","screenshot-qa","proofpacket"],"screenshot_note":"attached screenshot shows walkthrough.html active in Claude Design","include_context_pack":false,"include_apis":false}'
```

### Context Adapter Setup

`rig fix-prompt` works without API keys, but these optional environment variables connect more sources:

```bash
export RIG_QNAP_MOUNT="/Volumes/RIG"          # Optional mounted QNAP path
export RIG_QNAP_IP="192.168.68.88"           # Optional QNAP reference IP
export RIG_RECALL_API_URL="https://..."      # Recall/recall.it API base URL
export RIG_RECALL_API_PATH="/search"         # Default: /search
export RIG_RECALL_API_KEY="..."              # Optional Recall API token
export RIG_GITEA_BASE_URL="https://..."      # Gitea base URL
export RIG_GITEA_REPO="owner/repo"           # Optional when no local Gitea remote exists
export RIG_GITEA_TOKEN="..."                 # Optional Gitea API token
```

GitHub context uses local git remotes by default and enriches with `gh repo view` when the GitHub CLI is installed and authenticated. Gitea and Recall use read-only API calls when configured. Secrets are never printed into prompt output.

## Integration Layers

### 1. CLI (any terminal)
```bash
rig fix-prompt --file prompt.md
rig prompt-master --mode claude-design --file prompt.md
rig design-prompt "polish this Claude Design file page by page"
echo "your prompt" | rig fix-prompt
rig enhance "your prompt"
rig run "your prompt"
```

### 2. MCP Server (any AI assistant)
Registers 17 tools in Hermes config automatically via `rig-install --mcp`:
- `rig_score_prompt` — Score a prompt
- `rig_enhance_prompt` — Analyze and enhance
- `rig_fix_prompt` — Fix any prompt with work/QNAP/GitHub/Gitea/Recall context and a RigForge DoneContract
- `rig_prompt_master_catalog` — List Prompt Master modes and enhancement packs
- `rig_context_status` — Check context adapter status
- `rig_run_prompt` — Execute and learn
- `rig_coach` — Personal diagnostic
- `rig_get_stats` — Personal stats
- `rig_get_trends` — Score trends
- `rig_suggest_template` — Search templates
- `rig_get_history` — Prompt history
- `rig_validate_clipboard` — Score clipboard
- `rig_v15_audit` — Validate v15 catalogs and hashes
- `rig_v15_resources` — Search reviewed OSS resources
- `rig_v15_personas` — Search methodology-agent lenses
- `rig_v15_questions` — Return all or filtered v15 questions
- `rig_v15_intake` — Generate a v15 intake packet

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
  ├── 20 command groups
  └── → python/rig/prompt_engine.py (1700+ lines)
        ├── ContextSynthesizer (git, sessions, project)
        ├── PromptOptimizer (scoring, enhancement, lattice)
        ├── LearningEngine (outcome tracking, success patterns)
        ├── SessionAnalyzer (Hermes session post-analysis)
        ├── CoachingEngine (diagnostic, trends, recommendations)
        └── TemplateEngine (semantic search, built-in templates)
  └── → python/rig/rig_v15.py
        ├── Catalog audit (50 resources, 10 personas, 100 questions)
        ├── Deterministic ranking/search
        ├── Full/focused intake packet generation
        ├── 13 v15 gate checklist
        └── ProofPacket template generation
  └── → python/rig/rig_prompt_fixer.py
        ├── Prompt file/stdin/argument intake
        ├── Work surface, QNAP, GitHub, Gitea, Recall, and context-pack adapters
        ├── Secret redaction and approval boundaries
        └── Markdown/JSON fixed prompt output

rig-mcp-server.py — JSON-RPC stdio MCP server (17 tools)
rig-watch.py      — Background workspace daemon (launchd)
rig-proxy.py      — HTTP prompt proxy (auto-score + rewrite)
rig-hook.zsh      — Zsh pre-send hook (hermes-smart wrapper)
```

## License

MIT (upstream Microsoft AI Engineering Coach) + custom extensions MIT
