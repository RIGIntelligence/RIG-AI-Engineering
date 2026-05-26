---
id: hermes-context-injection
name: Hermes Context Injection Gaps
group: prompt-quality
severity: medium
scope: requests
version: 1
tags: [hermes, context, memory, prompt]
thresholds:
  minContextRate: 0.2
  minReqs: 10
---

# Description
Detects Hermes requests that lack context injection: no memory loads, no skill activations, no file references. Raw prompts without context produce worse results.

# When Triggered
{{extra.noContextPct}}% of Hermes requests have no context injection ({{extra.noContext}}/{{total}}). Every prompt sent without context is a gamble on output quality.

# How to Improve
Before asking Hermes to do work, load context: use `memory` for user facts, `skill_view` for procedures, `session_search` for past work, and `read_file`/`search_files` for code context. The richest prompts produce the best results.

# Examples
"{{messageText | clip:80}}" -- no memory, no skill, no file context

# Detection Logic
```detect
scan: requests
match: harness == "Hermes" AND referencedFiles.length == 0 AND skillsUsed.length == 0 AND customInstructions.length == 0
aggregate: count
noContext: count
noContextPct: round(noContextPct * 100)
check: noContextPct > (1 - thresholds.minContextRate) AND count > thresholds.minReqs
severity: noContextPct > 0.85
```