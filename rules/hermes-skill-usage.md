---
id: hermes-skill-usage
name: Hermes Skill Underuse
group: tool-mastery
severity: medium
scope: requests
version: 1
tags: [hermes, skills, context, tools]
thresholds:
  minSkillRate: 0.1
  minReqs: 10
---

# Description
Detects Hermes sessions that rarely invoke skills, missing a core context-engineering advantage.

# When Triggered
Only {{extra.skillPct}}% of Hermes requests use skills ({{extra.withSkills}}/{{total}}). Skills inject domain knowledge, doctrine, and workflow patterns that dramatically improve output quality.

# How to Improve
Load relevant skills before starting work: `skill_view(name='skill-name')`. Check available skills with `skills_list()`. Skills prevent you from re-explaining conventions the agent already knows.

# Examples
{{extra.withSkills}} of {{total}} Hermes requests invoked a skill

# Detection Logic
```detect
scan: requests
match: harness == "Hermes"
aggregate: count
withSkills: countWhere(allReqs, "skillsUsed.length", ">", 0)
skillRate: withSkills / count
skillPct: round(skillRate * 100)
check: skillRate < thresholds.minSkillRate AND count > thresholds.minReqs
severity: skillRate < 0.05
```