---
id: cross-harness-context-loss
name: Cross-Harness Context Loss
group: context-management
severity: high
scope: requests
version: 1
tags: [context, harness, hermes, claude, codex, gsd-pi]
thresholds:
  minReqs: 20
  maxSingleHarnessRate: 0.8
---

# Description
Detects when nearly all work happens in a single harness despite multiple being available. Context built in Claude/Codex is invisible to Hermes and vice versa. Each harness is a context silo.

# When Triggered
{{extra.dominantPct}}% of requests are in {{extra.dominantHarness}} ({{extra.dominantCount}}/{{total}}). When you switch harnesses, you lose all accumulated context. This causes re-work, duplicated effort, and inconsistent results.

# How to Improve
(1) Use AGENTS.md and CLAUDE.md as cross-harness context bridges -- they're read by all agents. (2) Before switching harnesses, write a handoff note. (3) Use Hermes memory for facts that should persist across all sessions. (4) Configure AI Engineering Coach to read all harness data so it can surface cross-harness patterns.

# Examples
{{extra.dominantHarness}}: {{extra.dominantPct}}% of {{total}} requests

# Detection Logic
```detect
scan: requests
aggregate: count
check: count > thresholds.minReqs
severity: true
```