# RIG AI Engineering v10 — Status

## Complete
- [x] Context-aware prompt enhancement (git, sessions, project type, recent errors)
- [x] 4-axis prompt scoring (Specificity, RIG Doctrine, Context, Actionability) — 0-100 scale
- [x] Automatic context injection (branch, files, project type)
- [x] Lattice coordinate auto-suggestion (D1 for bugs, L5 for deploys, etc.)
- [x] Banned word detection (unlock, empower, synergy, leverage, disrupt, hustle)
- [x] Template engine with semantic search (built-in + 1000+ JSON templates)
- [x] Cross-harness session scanning (claude, codex, opencode, hermes, gsd)
- [x] Learning engine (outcome tracking, success rates, personal stats)
- [x] **rig run** — full closed loop: enhance → execute → learn
- [x] **rig ab-test** — A/B test two prompt variants
- [x] **rig learn** — post-response session analyzer (reads Hermes sessions, extracts signals)
- [x] **rig coach** — personalized diagnostic with weakness analysis + recommendations
- [x] **rig trends** — daily score averages, improvement/decline detection
- [x] **rig sessions** — list recent sessions per harness
- [x] Tool binary resolution for subprocess (works without .zshrc)
- [x] Unified CLI with help, doctor, history, stats, template
- [x] Installer script (rig-install / rig-install --global)
- [x] Deployed to local + 48GB node

## Remaining (Polish / Nice-to-Have)
- [ ] Pre-send zsh wrapper hook (auto-score before `hermes chat -q`)
- [ ] Post-execution quality analyzer (parse tool output depth, file edits, test runs)
- [ ] Adaptive template A/B evolution (auto-improve templates from success data)
- [ ] Cron integration for automated `rig learn` + `rig coach` reports
- [ ] Clipboard integration (rig validate checks clipboard prompt)
- [ ] Multi-harness `rig learn` (scan codex, opencode, gsd sessions too)

## Architecture
```
rig (bash CLI)
  ├── enhance     → python/rig/prompt_engine.py enhance
  ├── score       → python/rig/prompt_engine.py score
  ├── run         → python/rig/prompt_engine.py run       [EXECUTE]
  ├── ab-test     → python/rig/prompt_engine.py ab-test
  ├── learn       → python/rig/prompt_engine.py learn     [POST-ANALYSIS]
  ├── coach       → python/rig/prompt_engine.py coach     [DIAGNOSTIC]
  ├── trends      → python/rig/prompt_engine.py trends    [ANALYTICS]
  ├── sessions    → python/rig/prompt_engine.py sessions  [LISTER]
  ├── suggest     → python/rig/prompt_engine.py suggest
  ├── history     → python/rig/prompt_engine.py history
  ├── stats       → python/rig/prompt_engine.py stats
  ├── prompt      → python/rig/prompt_engine.py score (pipe mode)
  ├── check       → scripts/ai-coach-check.sh
  ├── refresh     → scripts/ai-coach-refresh.sh
  ├── doctor      → inline bash (health check)
  ├── template    → inline bash (built-in templates)
  └── archon     → ls archon/
```
