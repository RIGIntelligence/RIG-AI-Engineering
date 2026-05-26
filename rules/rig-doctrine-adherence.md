---
id: rig-doctrine-adherence
name: RIG Doctrine Adherence
group: prompt-quality
severity: medium
scope: requests
version: 1
tags: [rig, doctrine, context, agent-workflow]
thresholds:
  minReqs: 10
  maxSkipRate: 0.5
---

# Description
Detects sessions that bypass RIG doctrine patterns: no skill loading before substantial work, no session search for prior context, no delegation for parallel tasks.

# When Triggered
{{extra.skipPct}}% of substantial requests skip RIG doctrine patterns ({{extra.skips}}/{{total}}). The RIG doctrine mandates: skills before action, research before synthesis, escalate instead of failing.

# How to Improve
Before substantial RIG work: (1) load the rig-operator-doctrine skill, (2) check session_search for prior related work, (3) use delegate_task for parallel workstreams, (4) always produce ProofPacket or equivalent evidence.

# Examples
{{extra.skips}} of {{total}} requests lacked doctrine adherence markers

# Detection Logic
```detect
scan: requests
match: messageLength > 50
aggregate: count
hasSkill: countWhere(allReqs, "skillsUsed.length", ">", 0)
hasSearch: flatSomeWhere(allReqs, "toolsUsed", ".", "session_search", "includes")
hasDelegate: flatSomeWhere(allReqs, "toolsUsed", ".", "delegate_task", "includes")
skips: count - hasSkill - hasSearch - hasDelegate
skipPct: round(skips / count * 100)
check: skipPct > thresholds.maxSkipRate * 100 AND count > thresholds.minReqs
severity: skipPct > 80
```