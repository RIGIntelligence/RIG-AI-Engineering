---
id: hermes-terminal-overuse
name: Hermes Terminal Overuse
group: tool-mastery
severity: low
scope: requests
version: 1
tags: [hermes, terminal, tools, efficiency]
thresholds:
  maxTerminalRate: 0.7
  minReqs: 15
---

# Description
Detects when Hermes sessions over-rely on raw terminal commands instead of purpose-built tools (read_file, patch, search_files, write_file).

# When Triggered
{{extra.terminalPct}}% of Hermes tool calls use terminal() instead of purpose-built tools ({{extra.terminalCalls}}/{{extra.totalToolCalls}}). Terminal is slower and less precise than read_file, patch, search_files, and write_file for file operations.

# How to Improve
Use purpose-built tools for file operations: `read_file` instead of `cat`, `patch` instead of `sed`, `search_files` instead of `grep/rg`, `write_file` instead of `echo/cat heredoc`. Reserve `terminal` for builds, installs, git, and processes.

# Examples
{{extra.terminalCalls}} terminal calls vs {{extra.totalToolCalls - extra.terminalCalls}} purpose-built tool calls

# Detection Logic
```detect
scan: requests
match: harness == "Hermes" AND toolsUsed.length > 0
aggregate: count
totalToolCalls: flatCount(allReqs, "toolsUsed")
terminalCalls: flatCountWhere(allReqs, "toolsUsed", "terminal")
terminalRate: terminalCalls / totalToolCalls
terminalPct: round(terminalRate * 100)
check: terminalRate > thresholds.maxTerminalRate AND count > thresholds.minReqs
severity: terminalRate > 0.85
```