# RIG Open Source Expansion

This layer adds a reviewed open-source resource catalog and a methodology-derived persona question bank to RIG AI Engineering. In v15, it is callable as a deterministic operator workflow through `rig v15`, as a local production app/API through `rig app`, and as a daily terminal prompt upload/fix workflow through `rig prompt-master`.

## What To Load

- `catalogs/open-source-agent-harnesses.yaml`: 50 reviewed GitHub resources for coding agents, browser harnesses, sandboxes, model routing, RAG, memory, evaluations, observability, and skills.
- `catalogs/rig-methodology-persona-agents.yaml`: 10 named methodology lenses. These are not impersonation agents; they use public methods associated with the named people.
- `catalogs/rig-methodology-question-bank.yaml`: 100 intake and review questions, 10 per methodology lens.

## Operating Rule

For day-to-day use, start with:

```bash
rig prompt-master --file prompt.md
rig design-prompt --file claude-design-prompt.md
echo "rough prompt" | rig prompt-master
rig context-status
rig app --open
```

`rig app` gives you the browser workflow for prompt upload/fix, RigForge contracts, v15 gate tracking, resource search, question-bank review, browser-harness dry-run envelopes, and local ProofPacket creation. `rig prompt-master` provides the same core prompt repair path in the terminal, and `rig design-prompt` applies Claude Design walkthrough, screenshot QA, and design-polish defaults. These commands pull read-only context from the current worktree, QNAP policy, GitHub/Gitea remotes and APIs when configured, Recall API when configured, and the local RIG context pack. They return a fixed prompt with approval boundaries, acceptance criteria, RigForge DoneContract summary, and proof requirements.

Before substantial agent, harness, app-builder, model-routing, MCP, evaluation, or product-build work:

1. Load the open-source catalog and choose any relevant resource patterns.
2. Load the methodology persona file and select the relevant lenses.
3. Ask the matching question subset, or for full RIG build work ask all 100 questions.
4. Mark skipped questions as `N/A` with a reason.
5. Produce inspectable proof: source links, files changed, commands run, tests, screenshots, traces, or ProofPackets.

## CLI

```bash
rig prompt-master --file prompt.md
rig prompt-master --mode claude-design --file prompt.md
rig design-prompt "walk the Claude Design website from entry point to contact page"
rig fix "build a browser-agent harness for RIG"
rig context-status
rig app --open
rig app --smoke

rig v15 audit
rig v15 resources "mcp harness"
rig v15 personas "observability"
rig v15 questions --all
rig v15 intake "build a browser-agent harness for RIG"
rig v15 proof "browser-agent harness"

rig catalog
rig catalog resources
rig catalog personas
rig catalog questions
```

If another workspace has its own `rig` command on `PATH`, use the installed launcher explicitly:

```bash
~/bin/rig prompt-master --file prompt.md
~/bin/rig design-prompt --file prompt.md
~/bin/rig context-status
~/bin/rig app --open
~/bin/rig v15 audit
~/bin/rig v15 intake "build a browser-agent harness for RIG"
```

## Safety

- Cataloging is not permission to run arbitrary code.
- Clone or execute only after review, commit pinning, sandboxing, and proof capture.
- Repos without a clear root license stay reference-only until license status is resolved.
- External sends, account changes, public exposure, destructive actions, private data export, browser session use, payments, and credential work still require Mike approval unless an approved runbook explicitly covers the action.
