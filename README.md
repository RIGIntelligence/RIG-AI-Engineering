# RIG AI Engineering

A prompt-scoring engine and CLI that grades a prompt 0-100 before it reaches a model, then rewrites it when the score falls below a threshold — because a weak prompt produces a weak completion, therefore catching it pre-send forces a stronger one.

The repository forks Microsoft's AI-Engineering-Coach VS Code extension (a read-only usage analyzer for Copilot/Claude/Codex/OpenCode sessions) and adds a Python prompt-engineering layer (`rig` CLI, MCP server, HTTP proxy, zsh hook, launchd daemon) on top of the TypeScript analyzer.

## What it does

It scores any prompt string across 6 weighted dimensions and returns an `overall_score` of 0-100 plus a structured findings list and a rewritten prompt. The score is computed in `python/rig/rig_prompt_scorer.py` by this exact formula:

| Dimension | Weight | How the sub-score is set |
|-----------|--------|--------------------------|
| Context | 0.25 | `(ctx_count / 3.0) * 100` — counts file/path/repo references |
| Specificity | 0.20 | `(spec_count / 4.0) * 100` — counts technical terms from a 130-term frozenset |
| Spec-driven | 0.20 | 100 if acceptance criteria present, else 50 if success criteria, else 0 |
| Verification | 0.15 | 100 if the prompt asks for tests/verification, else 0 |
| Length | 0.10 | 10 if too short, 30/60 mid-band, scaled by word count |
| RIG doctrine | 0.10 | 100 if doctrine markers present, 50 if ≥1 RIG term, else 0 |

A second method `score_with_rig` subtracts a silo penalty: when one harness holds more than 80% of recent sessions, it deducts `(silo_ratio - 0.8) * 50` points, so a 0.95-ratio silo loses 7.5 points. This penalizes single-tool tunnel vision because context written in one harness is invisible to the other four, therefore the silo ratio acts as a falsifiable threshold — the penalty is 0 if the ratio drops below 0.8 and grows linearly above it.

## How it works (the causal chain)

1. `rig score "<prompt>"` calls `python/rig/prompt_engine.py`, which loads `PromptScorer` and returns the 6-dimension breakdown. The output depends on token counting because the scorer triggers on matched markers, therefore a prompt with no markers leads to a near-zero result.
2. `rig enhance "<prompt>"` runs the same scorer, then injects git state, recent-session context, and acceptance criteria into a rewritten prompt. The rewrite raises Context and Spec sub-scores because it adds the exact references the scorer counts, so the enhanced prompt measures higher on the same engine that graded the original — the loop is conditioned on the scorer being deterministic.
3. `rig run "<prompt>"` enhances first, then shells out to a `hermes` (or `claude`) binary with a 300-second timeout. When the subprocess returns, it captures the outcome and records it so that the LearningEngine can correlate prompt score with success; if the binary is missing then the call fails and nothing is recorded.
4. The HTTP proxy (`rig-proxy.py`, default port 18787, default threshold 60) intercepts `/v1/chat/completions` and `/v1/completions`. If a scored prompt drops below 60, then it rewrites the body before forwarding, which produces a coached request; because the rewrite happens in-flight, any tool pointed at `127.0.0.1:18787` gets coached without changing its own code.
5. The daemon (`rig-watch.py`, `check_interval_sec = 300`) scans 5 harness session stores every 5 minutes. When it observes a silo above 85% of sessions, it writes coaching lines into `~/AGENTS.md`, which is the mechanism that surfaces the cross-harness warnings. The warning is gated on the measured ratio because a balanced spread triggers nothing.

The CLI exposes 18 commands. The MCP server (`rig-mcp-server.py`) re-exports 9 of them as JSON-RPC stdio tools so a model client can call `rig_score_prompt`, `rig_enhance_prompt`, `rig_run_prompt`, and 6 others directly.

## Numbers from the code

- 1000 prompt templates across 10 categories in `prompt-templates/rig-prompt-templates.json` (458 KB), searched by `rig suggest`.
- 6 scoring dimensions; weights sum to 1.00 (0.25 + 0.20 + 0.20 + 0.15 + 0.10 + 0.10).
- 5 harness parsers: Claude Code, Codex, OpenCode, Hermes, GSD-Pi.
- 130 technical terms in the specificity frozenset; 8 RIG doctrine terms in the doctrine set.
- `prompt_engine.py` is 1785 lines; the Python layer totals 3453 lines across 5 files; the bash + zsh layer adds 842 lines.
- Proxy default threshold 60, default port 18787; `run` subprocess timeout 300 s; daemon scan interval 300 s.

## Harness data paths

| Harness | Path scanned | Parser |
|---------|--------------|--------|
| Claude Code | `~/.claude/projects/` | `parser-claude.ts` |
| Codex CLI | `~/.codex/sessions/` | `parser-codex.ts` |
| OpenCode | `~/.local/share/opencode/storage/` | `parser-opencode.ts` |
| Hermes | `~/.hermes/sessions/` | `parser-hermes.ts` |
| GSD-Pi | `~/.gsd/sessions/` | `parser-gsd.ts` |

## Install

```bash
./rig-install            # copies rig to ~/bin/rig
./rig-install --global   # installs to /usr/local/bin/rig
./rig-install --hook     # zsh pre-send hook for hermes chat
./rig-install --mcp      # registers 9 MCP tools in Hermes config
./rig-install --launchd  # installs the 5-minute scan daemon
rig doctor               # health check
```

## What it does NOT do

- It does not call any model API to grade a prompt. The scorer is pure regex and set-membership counting, so it never sends a prompt anywhere, which is why scoring works offline.
- It does not execute prompts unless you run `rig run`, which depends on a `hermes` or `claude` binary on PATH; without one the call fails and only `score`/`enhance` work, because execution is gated on that binary.
- It does not learn semantics. `rig suggest` ranks templates by keyword overlap, not by embeddings, therefore a query with no shared tokens leads to weak matches and the relevance breaks if the user's vocabulary diverges from the template corpus.
- It does not ship telemetry. The upstream extension is read-only and emits no network traffic, so no usage data leaves the machine.
- The proxy does not decrypt TLS. It forwards to a plaintext target URL, therefore it only coaches tools you can repoint at a local HTTP base; if a tool pins HTTPS then the proxy cannot intercept it.

## Limitation and threshold

The scorer rewards prompts that name files, technical terms, and acceptance criteria, because those are the tokens it counts. A prompt that is genuinely specific in prose but uses none of the 130 tracked technical terms scores low even when a human would rate it high. If fewer than 1 of the 4 specificity markers and 0 of the 3 context markers are present, the combined Context+Specificity contribution caps at 0 of the available 45 points, so the ceiling for such a prompt is 55. Treat the score as a checklist-completeness signal, not a quality verdict.

## License

MIT. Upstream Microsoft AI-Engineering-Coach is MIT; the RIG Python and shell layer is MIT.
