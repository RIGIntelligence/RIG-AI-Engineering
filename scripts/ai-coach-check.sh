#!/usr/bin/env zsh
# ai-coach-check — Quick harness audit for AI Engineering Coach
# Usage: ai-coach-check [--days N] [--harness H] [--json] [--verbose]

DAYS=7
HARNESS="all"
JSON_OUTPUT=false
VERBOSE=false
HOME_DIR="${HOME:-$(eval echo ~$(whoami))}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)    DAYS="$2"; shift 2 ;;
    --harness) HARNESS="$2"; shift 2 ;;
    --json)    JSON_OUTPUT=true; shift ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --help|-h)
      echo "Usage: ai-coach-check [--days N] [--harness H] [--json] [--verbose]"
      exit 0 ;;
    *) shift ;;
  esac
done

# --- Collect harness data ---
claude_dir="$HOME_DIR/.claude/projects"
codex_dir="$HOME_DIR/.codex/sessions"
opencode_dir="$HOME_DIR/.local/share/opencode/storage/session"
hermes_dir="$HOME_DIR/.hermes/sessions"
gsd_dir="$HOME_DIR/.gsd/sessions"

claude_count=$(find "$claude_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ')
codex_count=$(find "$codex_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ')
opencode_count=$(find "$opencode_dir" -name "*.json" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ')
hermes_count=$(find "$hermes_dir" -name "session_*.json" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ')
if [[ -d "$gsd_dir" ]]; then
  gsd_count=$(find "$gsd_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
else
  gsd_count=0
fi

: ${claude_count:=0}
: ${codex_count:=0}
: ${opencode_count:=0}
: ${hermes_count:=0}
: ${gsd_count:=0}

total=$((claude_count + codex_count + opencode_count + hermes_count + gsd_count))

# --- Dominant harness ---
dominant=""
dominant_count=0
for name_count in "claude:${claude_count}" "codex:${codex_count}" "opencode:${opencode_count}" "hermes:${hermes_count}" "gsd:${gsd_count}"; do
  n="${name_count%%:*}"
  c="${name_count##*:}"
  if [[ "$c" -gt "$dominant_count" ]]; then
    dominant="$n"
    dominant_count="$c"
  fi
done

# --- Findings ---
findings=""

# Cross-harness silo
if [[ "$total" -gt 20 && "$dominant_count" -gt 0 ]]; then
  pct=$(( (dominant_count * 100) / total ))
  if [[ "$pct" -gt 80 ]]; then
    findings="${findings}CROSS-HARNESS SILO: ${pct}% of sessions are in ${dominant} (${dominant_count}/${total}). Context built in one harness is invisible to others. Use AGENTS.md and CLAUDE.md as bridges.\n\n"
  fi
fi

# Hermes skill usage spot check
if [[ -d "$hermes_dir" && "$hermes_count" -gt 0 ]]; then
  skill_sessions=0
  checked=0
  for f in $(find "$hermes_dir" -name "session_*.json" -type f -mtime "-${DAYS}" 2>/dev/null | head -20); do
    checked=$((checked + 1))
    if grep -q 'skill_view\|skills_list\|"memory"' "$f" 2>/dev/null; then
      skill_sessions=$((skill_sessions + 1))
    fi
  done
  if [[ "$checked" -gt 5 && "$skill_sessions" -eq 0 ]]; then
    findings="${findings}HERMES SKILL UNDERUSE: 0/${checked} sampled Hermes sessions invoke skills or memory. Load skills before work for dramatically better results.\n\n"
  fi
fi

# Mega sessions (Claude)
if [[ -d "$claude_dir" && "$claude_count" -gt 0 ]]; then
  mega=$(find "$claude_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" -size +500k 2>/dev/null | wc -l | tr -d ' ')
  : ${mega:=0}
  if [[ "$mega" -gt 2 ]]; then
    findings="${findings}MEGA SESSIONS: ${mega} Claude sessions exceed 500KB. Long sessions degrade context. Start new sessions every 15-25 messages.\n\n"
  fi
fi

# --- Output ---
if [[ "$JSON_OUTPUT" == "true" ]]; then
  printf '{"days":%d,"claude":%d,"codex":%d,"opencode":%d,"hermes":%d,"gsd":%d,"total":%d,"findings":"%s"}\n' \
    "$DAYS" "$claude_count" "$codex_count" "$opencode_count" "$hermes_count" "$gsd_count" "$total" "$findings"
else
  echo ""
  echo "============================================="
  echo "  AI ENGINEERING COACH — Quick Audit Report"
  echo "  Last ${DAYS} days"
  echo "============================================="
  echo ""
  printf "  %-12s  %5d sessions\n" "claude" "$claude_count"
  printf "  %-12s  %5d sessions\n" "codex" "$codex_count"
  printf "  %-12s  %5d sessions\n" "opencode" "$opencode_count"
  printf "  %-12s  %5d sessions\n" "hermes" "$hermes_count"
  printf "  %-12s  %5d sessions\n" "gsd" "$gsd_count"
  echo ""
  echo "  Total: $total sessions across 5 harnesses"
  echo ""

  if [[ -z "$findings" ]]; then
    echo "  No anti-patterns detected in the last ${DAYS} days."
  else
    echo "  ANTI-PATTERN FINDINGS:"
    echo "  ---------------------"
    printf "  %b\n" "$findings"
  fi

  echo "============================================="
  echo "  ai-coach-prompt <your prompt>  — coach a prompt"
  echo "  ai-coach-prompt --rules        — list custom rules"
  echo "============================================="
  echo ""
fi