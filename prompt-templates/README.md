# RIG Prompt Template Library — 1,000 Templates

Version: 1.0 | Total: 1,000 | Categories: 10

## What This Is

A prompt engineering system for RIG — Rodgers Intelligence Group. Every template follows the AI Engineering Coach scoring criteria: specificity (4 markers), context injection (3 markers), spec-driven, verification. Templates enforce RIG doctrine: local-first, deterministic before agentic, A1 first, ProofPacket or it didn't happen.

## How to Use

1. **Diagnose first**: Run `ai-coach-prompt "your prompt"` to score your current prompt
2. **Find the template**: Match your task to one of the 10 categories below
3. **Fill the variables**: Replace [BRACKETS] with your specifics
4. **Verify**: Re-score the filled template — target score >= 90

## Categories (100 templates each)

### 01. RIG Doctrine & Execution
IQRSQPI steps, BMS modes (A1-A4), lattice coordinates (L1-L7 x D1-D3), Gates 00-12, ProofPackets, Repetition-to-Skill, doctrine compliance checks, handoff protocols, conflict resolution, fleet coordination orders.

**When to use**: Any task that involves RIG doctrine, structured execution, quality gates, or proof artifacts.

### 02. Fleet & Infrastructure
Node health (28gb/36gb/48gb/96gb/256gb/blackwell), model deployment, model routing, Tailscale mesh, LM Studio, backups, security, provisioning, Docker stacks, cron jobs, process monitoring.

**When to use**: Any task involving fleet nodes, model deployment, infrastructure, or operational systems.

### 03. Agent Team & Orchestration
Susan routing, Jake/Pi Coding, OpenClaw, delegation, ClawTeam swarms, Archon workflows, Ruflo bridges, CrewAI teams, multi-agent coordination, conflict resolution.

**When to use**: Any task involving multiple agents, orchestration, delegation, or swarm coordination.

### 04. Content Engineering (LinkedIn & Brand)
LinkedIn posts (5 pillars), golden post variants, external comments (HIGH_FIT/MEDIUM_FIT/DO_NOT_COMMENT), campaigns, engagement replies, brand voice checks, pillar balance, golden hour protocol, vertical intel, profile ProofPackets.

**When to use**: Any task involving LinkedIn content, brand positioning, or audience engagement.

### 05. Client Acquisition & GTM
Cold outreach, warm intros, recruiter scenarios, ROI calculators, proposals, pitch decks, competitor angles, demo scripts, vertical playbooks, lead qualification.

**When to use**: Any task involving selling RIG services, acquiring clients, or go-to-market execution.

### 06. Product & Code Building
Feature builds, API endpoints, dashboards, quality gate implementation, bug fixes, refactoring, integrations, releases, test suites, security scans.

**When to use**: Any task involving code, features, releases, or technical implementation.

### 07. Research & Intelligence
Company blueprints, competitor analysis, market signals, portfolio synergies, founder profiles, risk assessments, technology radar, weekly signal diffs, trend forecasts, intelligence briefs.

**When to use**: Any task involving research, analysis, intelligence gathering, or market assessment.

### 08. Healthcare & Vertical Operations
Hospital ops, MTTR reduction, compliance (HIPAA/SOC2/FDA), PE portfolio intelligence, medspa/dental/law firm/fintech/manufacturing/CFO services automation.

**When to use**: Any task targeting a specific industry vertical or healthcare operations.

### 09. Hiring, Speaking & Brand (Mike Rodgers)
Speaking pitches, CAIO role applications, advisory proposals, ProofPacket bios, LinkedIn profile audits, RIG-format resumes, interview prep, thought leadership, one-pagers, workshop outlines.

**When to use**: Any task involving Mike's personal positioning, hiring, speaking, or advisory work.

### 10. Diagnostic & Coaching
Prompt scoring, anti-pattern detection, session audits, skill gap analysis, cross-harness context checks, code review quality, workflow optimization, velocity diagnostics, context health scoring, RIG-format standups.

**When to use**: Any task involving self-assessment, coaching, quality improvement, or optimization.

## Template Format

Each template contains:
- `id`: RIG-0001 through RIG-1000
- `name`: Descriptive name
- `prompt_template`: The fill-in-the-blank prompt with [VARIABLE] placeholders
- `variables`: List of what needs to be filled in
- `use_case`: When to use this template
- `specificity_level`: 1-5 scale (5 = fully specified, 1 = generic)

## Scoring Criteria (from ai-coach-prompt)

| Dimension | Markers | What to check |
|-----------|---------|---------------|
| Specificity | 4 | Technical terms, constraints, steps, success criteria |
| Context Injection | 3 | File references, skill/memory calls, prior work references |
| Spec-Driven | 1 | Requirements, acceptance criteria, definitions of done |
| Verification | 1 | How to confirm the output is correct |

Target: Score >= 90/100 before sending any prompt.

## File Location

`/Users/mikerodgers/Startup-Intelligence-OS/prompt-templates/rig-prompt-templates.json`