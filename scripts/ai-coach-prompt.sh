#!/usr/bin/env bash
# ai-coach-prompt — Prompt coach that checks a prompt against best practice rules
# Usage: echo "fix the bug" | ai-coach-prompt
#        ai-coach-prompt "Write a function that processes data"
#        ai-coach-prompt --rules
set -euo pipefail

RULES_DIR="${HOME}/.ai-engineer-coach/rules"
HOME_DIR="${HOME:-$(eval echo ~$(whoami))}"

# Load prompt from arg or stdin
PROMPT=""
SHOW_RULES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rules) SHOW_RULES=true; shift ;;
    --help|-h)
      echo "Usage: ai-coach-prompt [PROMPT]"
      echo "       echo PROMPT | ai-coach-prompt"
      echo "  --rules  Show active custom rules"
      exit 0 ;;
    *) PROMPT="$1"; shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  if [[ -t 0 ]]; then
    echo "Enter your prompt (Ctrl+D to finish):"
  fi
  PROMPT=$(cat)
fi

if [[ "$SHOW_RULES" == "true" ]]; then
  echo "Active custom rules in $RULES_DIR:"
  echo "========================================="
  if [[ -d "$RULES_DIR" ]]; then
    for f in "$RULES_DIR"/*.md; do
      [[ -f "$f" ]] || continue
      name=$(grep '^id:' "$f" 2>/dev/null | head -1 | sed 's/id: *//')
      desc=$(grep '^# Description' -A1 "$f" 2>/dev/null | tail -1 | sed 's/^ *//')
      severity=$(grep '^severity:' "$f" 2>/dev/null | head -1 | sed 's/severity: *//')
      printf "  %-30s [%s] %s\n" "$name" "$severity" "$desc"
    done
  else
    echo "  No custom rules directory found."
  fi
  exit 0
fi

# --- Prompt Analysis ---
SCORE=100
FINDINGS=()

# Check 1: Length (lazy prompting)
PROMPT_LEN=${#PROMPT}
if [[ "$PROMPT_LEN" -lt 30 ]]; then
  SCORE=$((SCORE - 25))
  FINDINGS+=("LAZY PROMPT (${PROMPT_LEN} chars): Prompts under 30 chars often produce generic or wrong results. Describe your intent, constraints, and expected output format.")
elif [[ "$PROMPT_LEN" -lt 100 ]]; then
  SCORE=$((SCORE - 10))
  FINDINGS+=("SHORT PROMPT (${PROMPT_LEN} chars): Consider adding more context. What should the output look like? What constraints matter?")
fi

# Check 2: Specificity markers
SPECIFICITY=0
echo "$PROMPT" | grep -qiE "(should|must|need|require|ensure|verify|check|after|before|when|only|except|unless|if|then|because|so that)" && SPECIFICITY=$((SPECIFICITY + 1))
echo "$PROMPT" | grep -qiE "(file|path|function|class|method|variable|module|package|import|export|API|endpoint|parameter|return|type|interface)" && SPECIFICITY=$((SPECIFICITY + 1))
echo "$PROMPT" | grep -qiE "(test|spec|unit|integration|error|fail|bug|issue|fix|broken|regression)" && SPECIFICITY=$((SPECIFICITY + 1))
echo "$PROMPT" | grep -qiE "(step|first|second|then|finally|next|after|lastly)" && SPECIFICITY=$((SPECIFICITY + 1))

if [[ "$SPECIFICITY" -eq 0 ]]; then
  SCORE=$((SCORE - 15))
  FINDINGS+=("NO SPECIFICITY MARKERS: Your prompt lacks specific technical terms, constraints, or step-by-step instructions. Add: what to build, what constraints apply, what the output should look like.")
elif [[ "$SPECIFICITY" -eq 1 ]]; then
  SCORE=$((SCORE - 5))
  FINDINGS+=("LOW SPECIFICITY: Only 1/4 specificity markers detected. Add constraints, expected output format, and success criteria.")
fi

# Check 3: Context injection (file references, skill mentions, etc.)
CONTEXT=0
echo "$PROMPT" | grep -qiE "(#\w|@import|CLAUDE\.md|AGENTS\.md|read_file|skill_view|memory|session_search)" && CONTEXT=$((CONTEXT + 1))
echo "$PROMPT" | grep -qiE "(using|based on|from the|in the file|in the project|in the repo|in our codebase)" && CONTEXT=$((CONTEXT + 1))
echo "$PROMPT" | grep -qiE "(\.ts|\.js|\.py|\.rs|\.go|\.java|\.yaml|\.json|\.md|\.toml)" && CONTEXT=$((CONTEXT + 1))

if [[ "$CONTEXT" -eq 0 ]]; then
  SCORE=$((SCORE - 10))
  FINDINGS+=("NO CONTEXT INJECTION: This prompt doesn't reference files, skills, memory, or prior work. The agent will work blind. Add: file paths, skill references, relevant context from prior sessions.")
fi

# Check 4: Spec-driven (has requirements)
HAS_SPEC=false
echo "$PROMPT" | grep -qiE "(requirement|acceptance|criteria|should|must|expected|given|when|then|spec|definition|constraint)" && HAS_SPEC=true
if [[ "$HAS_SPEC" == "false" ]]; then
  SCORE=$((SCORE - 5))
  FINDINGS+=("NO SPEC: Prompt lacks requirements or acceptance criteria. Consider adding: 'The function should...' or 'Requirements: ...'")
fi

# Check 5: RIG Doctrine (for Hermes/GSD users)
RIG_MARKERS=0
echo "$PROMPT" | grep -qiE "(rig|doctrine|operator|fleet|escalate|delegate|proof|evidence|ProofPacket)" && RIG_MARKERS=$((RIG_MARKERS + 1))
echo "$PROMPT" | grep -qiE "(skill_view|memory|session_search|delegate_task)" && RIG_MARKERS=$((RIG_MARKERS + 1))

# Check 6: Verify/quality markers
VERIFY=false
echo "$PROMPT" | grep -qiE "(verify|test|check|validate|confirm|ensure|audit|proof)" && VERIFY=true
if [[ "$VERIFY" == "false" && "$PROMPT_LEN" -gt 50 ]]; then
  SCORE=$((SCORE - 5))
  FINDINGS+=("NO VERIFICATION: Prompt asks for work but doesn't mention verification or testing. Add: 'verify the output by...' or 'test that...'")
fi

# Cap score
[[ "$SCORE" -lt 0 ]] && SCORE=0
[[ "$SCORE" -gt 100 ]] && SCORE=100

# Rating
if [[ "$SCORE" -ge 90 ]]; then
  RATING="EXCELLENT"
  COLOR="\033[32m"  # green
elif [[ "$SCORE" -ge 70 ]]; then
  RATING="GOOD"
  COLOR="\033[33m"  # yellow
elif [[ "$SCORE" -ge 50 ]]; then
  RATING="FAIR"
  COLOR="\033[33m"  # yellow
else
  RATING="POOR"
  COLOR="\033[31m"  # red
fi
RESET="\033[0m"

# --- Output ---
echo ""
echo "============================================="
echo "  AI COACH — Prompt Quality Score"
echo "============================================="
echo ""
printf "  Score: ${COLOR}%d/100${RESET}  (%s)\n" "$SCORE" "$RATING"
echo "  Length: ${PROMPT_LEN} chars"
echo "  Specificity: ${SPECIFICITY}/4 markers"
echo "  Context: ${CONTEXT}/3 markers"
echo "  Spec-driven: ${HAS_SPEC}"
echo "  Verification: ${VERIFY}"
echo ""

if [[ ${#FINDINGS[@]} -gt 0 ]]; then
  echo "  FINDINGS:"
  echo "  ---------"
  i=1
  for f in "${FINDINGS[@]}"; do
    printf "  %d. %s\n\n" "$i" "$f"
    i=$((i + 1))
  done
else
  echo "  No issues detected. This prompt looks solid."
fi

echo "============================================="
echo ""

# Improvement suggestion
echo "  IMPROVED PROMPT SUGGESTION:"
echo "  ---------------------------"
IMP=""

# Build improvement based on findings
[[ "$PROMPT_LEN" -lt 30 ]] && IMP="${IMP}Context: [describe project/goal]. "

if [[ "$SPECIFICITY" -lt 2 ]]; then
  IMP="${IMP}Requirements: [list what must be true]. "
  IMP="${IMP}Constraints: [list limits]. "
fi

[[ "$CONTEXT" -eq 0 ]] && IMP="${IMP}Relevant files: [list paths]. "

[[ "$VERIFY" == "false" ]] && IMP="${IMP}Verify by: [describe how to confirm]. "

if [[ -n "$IMP" ]]; then
  echo "  ${PROMPT}"
  echo ""
  echo "  + ${IMP}"
else
  echo "  (No improvements suggested — prompt is well-structured)"
fi

echo ""
echo "  Run 'ai-coach-prompt --rules' to see active custom rules"
echo "============================================="