# RIG AI Engineering v10 — Status

## Complete
- [x] Context-aware prompt enhancement (git, sessions, project type)
- [x] 4-axis prompt scoring (Specificity, RIG Doctrine, Context, Actionability)
- [x] Lattice coordinate auto-suggestion
- [x] Banned word detection (RIG brand compliance)
- [x] Template engine with semantic search (built-in + 1000+ JSON)
- [x] Cross-harness session scanning (5 harnesses)
- [x] Learning engine (outcome tracking, success rates, personal stats)
- [x] **rig run** — enhance → execute → learn closed loop
- [x] **rig ab-test** — A/B test prompt variants
- [x] **rig learn** — post-response session analyzer
- [x] **rig coach** — personalized diagnostic + recommendations
- [x] **rig trends** — daily score averages, improvement tracking
- [x] **rig sessions** — list recent sessions per harness
- [x] **rig validate** — score clipboard prompt
- [x] **rig report** — summary report with trend + top prompts
- [x] **rig-hook.zsh** — pre-send zsh hook (hermes-smart wrapper)
- [x] Tool binary resolution for subprocess
- [x] Unified CLI (16 commands)
- [x] Installer (rig-install / --global / --hook)
- [x] Deployed to local + 48GB node

## Architecture
```
rig (bash CLI) → python/rig/prompt_engine.py (1700+ lines)
  ├── enhance     Score + auto-enhance with context
  ├── score       4-axis scoring (0-100)
  ├── run         Enhance → Execute → Learn
  ├── ab-test     Compare two variants
  ├── learn       Post-session analysis
  ├── coach       Personal diagnostic
  ├── trends      Score trends over time
  ├── sessions    List harness sessions
  ├── validate    Score clipboard
  ├── report      Summary report
  ├── suggest     Template search
  ├── history     Prompt history
  ├── stats       Personal dashboard
  ├── prompt      Quick score (pipe)
  ├── check       Harness audit
  ├── refresh     CLAUDE.md/AGENTS.md
  ├── doctor      System health
  ├── template    Built-in templates
  ├── install     Dependencies
  └── archon      Workflows

rig-hook.zsh → hermes-smart wrapper
  ├── Scores prompt before sending to hermes
  ├── Interactive: send anyway / enhanced / full score / abort
  ├── rig-hook-on / rig-hook-off / rig-hook-status
  └── Configurable threshold (RIG_HOOK_THRESHOLD)
```
