---
description: Full AI Engineering Coach harness audit across all 5 tools
argument-hint: "<optional: number of days to look back, default 7>"
---

# Coach Check

Run a complete harness audit across Claude Code, Codex, OpenCode, Hermes, and GSD-Pi.

Execute these steps in order:

1. Run: `zsh ~/bin/ai-coach-check --days 7` to get session counts and anti-pattern findings
2. Run: `zsh ~/bin/ai-coach-suggest.sh "productivity improvement"` to get relevant templates
3. Run: `zsh ~/bin/ai-coach-refresh --dry-run` to preview what would be injected into CLAUDE.md

Then synthesize:
- Top 3 findings from the audit
- Top 3 recommended templates from the search
- What the coaching context block would look like
- 3 specific actions Mike should take this week to improve his AI engineering productivity