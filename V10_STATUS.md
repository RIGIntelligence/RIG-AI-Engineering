# RIG AI Engineering v10 — Status

## Complete
- [x] Context-aware prompt enhancement (git, sessions, project type, recent errors)
- [x] 4-axis prompt scoring (Specificity, RIG Doctrine, Context, Actionability)
- [x] Automatic context injection (branch, files, project type)
- [x] Lattice coordinate auto-suggestion (D1 for bugs, L5 for deploys, etc.)
- [x] Banned word detection (unlock, empower, synergy, leverage, disrupt, hustle)
- [x] Template engine with semantic search (built-in + 1000+ JSON templates)
- [x] Cross-harness session scanning (claude, codex, opencode, hermes, gsd)
- [x] Learning engine (outcome tracking, success rates, personal stats)
- [x] **rig run** — full closed loop: enhance → execute → learn
- [x] **rig ab-test** — A/B test two prompt variants
- [x] Tool binary resolution for subprocess (works without .zshrc)
- [x] Unified CLI with help, doctor, history, stats, template
- [x] Installer script (rig-install / rig-install --global)
- [x] Deployed to local + 48GB node

## Next: Close the Remaining Gaps

### 1. Tighter Hermes Integration
- [ ] `rig run` should work with Hermes resume/multi-turn, not just one-shot `-q`
- [ ] Parse Hermes session output to detect success/failure more intelligently (not just exit code)

### 2. Pre-send Hook (Zsh Integration)
- [ ] Optional: wrap `hermes` command so every prompt is auto-scored before sending
- [ ] Configurable threshold: score < N → warn, enhance, ask to proceed

### 3. Post-execution Analysis
- [ ] After `rig run`, parse the output for quality signals (code changes, file edits, errors)
- [ ] Track which prompt patterns lead to fewest iterations

### 4. Adaptive Templates (A/B Evolution)
- [ ] Track which templates get used most
- [ ] Suggest template improvements based on success data

### 5. Coaching Loop
- [ ] `rig coach` command: review your weakest prompt areas, suggest exercises
- [ ] `rig trends`: show prompting improvement over time

## Architecture
```
rig (bash CLI)
  ├── enhance     → python/rig/prompt_engine.py enhance
  ├── score       → python/rig/prompt_engine.py score
  ├── run         → python/rig/prompt_engine.py run
  ├── ab-test     → python/rig/prompt_engine.py ab-test
  ├── suggest     → python/rig/prompt_engine.py suggest
  ├── history     → python/rig/prompt_engine.py history
  ├── stats       → python/rig/prompt_engine.py stats
  ├── prompt      → python/rig/prompt_engine.py score (pipe mode)
  ├── check       → scripts/ai-coach-check.sh
  ├── refresh     → scripts/ai-coach-refresh.sh
  ├── doctor      → inline (health check)
  ├── template    → inline (built-in templates)
  └── archon     → ls archon/
```
