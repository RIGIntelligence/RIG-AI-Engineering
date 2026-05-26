---
description: Score a prompt and suggest improvements using AI Engineering Coach criteria
argument-hint: "<prompt text>"
---

# Coach Score

You are scoring a prompt using the AI Engineering Coach criteria. Evaluate the prompt on 5 dimensions:

1. **Length**: Prompts under 30 chars = lazy. 30-100 = short. 100+ = good.
2. **Specificity** (4 markers): Technical terms, constraints, steps, success criteria
3. **Context Injection** (3 markers): File references, skill/memory calls, prior work
4. **Spec-Driven**: Requirements, acceptance criteria, definitions of done
5. **Verification**: How output correctness is confirmed

Target score: >= 90/100

For any dimension that scores low, provide a specific, actionable improvement with a rewritten version.

Also consider these RIG-specific rules:
- Cross-harness context loss: Are you referencing AGENTS.md or CLAUDE.md?
- Hermes skill underuse: Are you loading skills before work?
- Terminal overuse: Are you using purpose-built tools instead of raw terminal?
- Doctrine adherence: Are you following local-first, deterministic before agentic, ProofPacket?

Output format:
- Score: X/100
- Each dimension score
- Top 3 findings with specific fixes
- Rewritten prompt