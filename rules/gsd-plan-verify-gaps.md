---
id: gsd-plan-verify-gaps
name: GSD-Pi Plan-Verify Gaps
group: session-hygiene
severity: medium
scope: sessions
version: 1
tags: [gsd-pi, planning, verification, workflow]
thresholds:
  maxMessages: 10
---

# Description
Detects GSD-Pi sessions that skip the plan-create-verify cycle, indicating velocity without process discipline.

# When Triggered
{{count}} GSD-Pi session(s) lack plan-verify workflow markers. GSD-Pi is designed for structured plan-implement-verify cycles. Skipping these steps undermines the workflow.

# How to Improve
Use GSD-Pi's built-in plan mode: start sessions with planning, create tasks, implement incrementally, and verify each step. The plan-verify cycle is the point of using GSD-Pi over raw Claude/Codex.

# Examples
{{workspaceName}}: {{requestCount}} messages with no plan/verify markers

# Detection Logic
```detect
scan: sessions
match: harness == "GSD-Pi" AND requestCount > thresholds.maxMessages
aggregate: count
check: count > 0
examples: {{workspaceName}}: {{requestCount}} messages
```