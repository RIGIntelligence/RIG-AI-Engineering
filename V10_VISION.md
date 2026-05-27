# RIG AI Engineering v10: Comprehensive Prompting Program
# A fully integrated prompting system that makes every AI interaction 10x more effective

## Vision
Instead of just providing templates and scoring, v10 will be an active prompting coach that:
1. Analyzes your current context (open files, recent sessions, goals)
2. Suggests optimal prompt structures before you type
3. Auto-enhances prompts with RIG doctrine, specificity, and verification
4. Validates prompts against success criteria before sending
5. Learns from your most effective prompts
6. Integrates seamlessly with all AI coding assistants

## Core Components

### 1. Prompt Intelligence Engine
- Context-aware prompt enhancement
- Real-time RIG doctrine adherence checking
- Automatic specificity and verification injection
- Success pattern recognition from history

### 2. Adaptive Template System
- Dynamic template selection based on:
  - Current project/task
  - Time of day/energy levels
  - Recent success patterns
  - Team/organizational context
- Template evolution via A/B testing
- Community-sourced best practices

### 3. Prompt Validation & Scoring
- Pre-flight checklist before sending:
  - Context completeness
  - Specificity score
  - Verification requirements
  - RIG doctrine alignment
  - Token efficiency
- Post-execution analysis:
  - Outcome vs expectation
  - Tool usage effectiveness
  - Context utilization
  - Iteration reduction

### 4. Learning & Optimization
- Tracks which prompt patterns yield best results
- Identifies your personal prompting strengths/weaknesses
- Suggests prompt exercises for improvement
- Optimizes for your specific AI coding assistant preferences

### 5. Integration Hub
- Unified interface to all AI assistants:
  - Claude Code (via MCP/context injection)
  - Codex CLI (via session analysis)
  - OpenCode (via storage monitoring)
  - Hermes (direct integration)
  - GSD-Pi (via session parsing)
- Cross-harness context sharing
- Unified session management

## CLI Interface (v10)

```bash
# Enhanced rig command with intelligence layer
rig prompt enhance "your rough idea here"    # → Returns optimized prompt
rig prompt score "your prompt"               # → Detailed analysis + suggestions
rig prompt run "your prompt"                 # → Enhance → Validate → Execute → Analyze
rig prompt learn                             # → Review your prompting patterns
rig prompt template suggest <task>           # → Context-aware template selection
rig prompt validate                          # → Check clipboard/last prompt
rig prompt doctor                            # → Diagnose prompting health
```

## Example Workflow

**Before v10:**
```
User thinks: "I need to fix the auth bug"
Types: "fix the auth bug in login.js"
Gets: Generic solution that misses edge cases
Iterates 3-5 times
```

**After v10:**
```
User thinks: "I need to fix the auth bug"
Types: rig prompt enhance "fix the auth bug in login.js"
System responds: 
  [ENHANCED] Fix the auth bug in login.js
  Context: 
    - File: src/auth/login.js (lines 45-67)
    - Recent error: "Invalid JWT signature" from sessions
    - Related: password reset flow uses same validation
    - Team convention: use bcrypt for password hashing
  Enhancements:
    - Added specificity: Handle JWT expiration, malformed tokens, user not found
    - Added verification: Write test cases for all edge cases
    - Added RIG: Include ProofPacket requirements
    - Added constraints: <100 lines, maintain backward compatibility
  Suggested command:
    hermes chat -q "Fix the auth bug in src/auth/login.js lines 45-67. Handle JWT expiration, malformed tokens, user not found. Write test cases for edge cases. Follow team bcrypt convention. <100 lines. Include verification steps."
User runs: hermes chat -q "[enhanced prompt above]"
Result: Solution works first time, includes tests, follows conventions
```

## Technical Implementation

### Phase 1: Foundation (v1-v3)
- Enhanced CLI with subcommands
- Context collector (session data, open files, git status)
- Basic enhancement rules engine
- Template metadata tagging

### Phase 2: Intelligence (v4-v6)
- Machine learning for pattern recognition
- Success outcome tracking
- Adaptive template weighting
- Cross-harness context synthesis

### Phase 3: Integration (v7-v9)
- Deep Hermes/MCP integration
- Real-time suggestion engine
- Automated validation pipeline
- Personalized coaching

### Phase 4: Optimization (v10)
- Predictive prompting
- Automated A/B test framework
- Knowledge distillation from expert patterns
- Continuous self-improvement loop

## Success Metrics for v10
- 80%+ first-attempt success rate (vs ~30% now)
- 50% reduction in prompt iteration cycles
- 90%+ RIG doctrine adherence without manual effort
- Personalized prompting coaching that improves over time
- Seamless feel - the system anticipates needs before you articulate them

## Installation Path Forward
v0 → v1: Add context awareness and basic enhancement
v2 → v3: Add learning and template adaptation
v4 → v5: Add validation pipeline and scoring
v6 → v7: Add deep integrations and real-time suggestions
v8 → v9: Add predictive capabilities and A/B testing
v10: Fully comprehensive prompting program that feels like having a expert prompting coach paired with you at all times.

This isn't just a better CLI - it's a prompting operating system that upgrades your cognitive interface with AI.