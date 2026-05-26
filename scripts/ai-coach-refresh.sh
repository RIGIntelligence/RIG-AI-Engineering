#!/usr/bin/env zsh
# ai-coach-refresh — Refresh live coaching context into CLAUDE.md and AGENTS.md
# Usage: ai-coach-refresh [--dry-run] [--days N]

set -uo pipefail

DAYS=7
DRY_RUN=false
HOME_DIR="${HOME:-$(eval echo ~$(whoami))}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --days)    DAYS="$2"; shift 2 ;;
    --help|-h) echo "Usage: ai-coach-refresh [--dry-run] [--days N]"; exit 0 ;;
    *) shift ;;
  esac
done

# ---- Collect session metrics ----
claude_dir="$HOME_DIR/.claude/projects"
codex_dir="$HOME_DIR/.codex/sessions"
opencode_dir="$HOME_DIR/.local/share/opencode/storage/session"
hermes_dir="$HOME_DIR/.hermes/sessions"
gsd_dir="$HOME_DIR/.gsd/sessions"

claude_count=$(find "$claude_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ') || claude_count=0
codex_count=$(find "$codex_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ') || codex_count=0
opencode_count=$(find "$opencode_dir" -name "*.json" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ') || opencode_count=0
hermes_count=$(find "$hermes_dir" -name "session_*.json" -type f -mtime "-${DAYS}" 2>/dev/null | wc -l | tr -d ' ') || hermes_count=0

: ${claude_count:=0} ${codex_count:=0} ${opencode_count:=0} ${hermes_count:=0}

if [[ -d "$gsd_dir" ]]; then
  gsd_count=$(find "$gsd_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
else
  gsd_count=0
fi

total=$((claude_count + codex_count + opencode_count + hermes_count + gsd_count))

# ---- Detect findings ----
findings=""
severity="LOW"

# Dominant harness
dominant=""
dominant_count=0
for pair in "claude:$claude_count" "codex:$codex_count" "opencode:$opencode_count" "hermes:$hermes_count" "gsd:$gsd_count"; do
  n="${pair%%:*}"
  c="${pair##*:}"
  [[ "$c" -gt "$dominant_count" ]] && dominant="$n" && dominant_count="$c"
done

if [[ "$total" -gt 20 && "$dominant_count" -gt 0 ]]; then
  pct=$(( (dominant_count * 100) / total ))
  if [[ "$pct" -gt 80 ]]; then
    findings="${findings}- CROSS-HARNESS SILO: ${pct}% of work is in ${dominant} (${dominant_count}/${total}). Context is invisible across harnesses. Bridge with AGENTS.md and CLAUDE.md.
"
    severity="HIGH"
  elif [[ "$pct" -gt 60 ]]; then
    findings="${findings}- CROSS-HARNESS CONCENTRATION: ${pct}% in ${dominant}. Consider splitting work across harnesses.
"
    [[ "$severity" == "LOW" ]] && severity="MEDIUM"
  fi
fi

# Mega sessions (Claude)
if [[ -d "$claude_dir" && "$claude_count" -gt 0 ]]; then
  mega=$(find "$claude_dir" -name "*.jsonl" -type f -mtime "-${DAYS}" -size +500k 2>/dev/null | wc -l | tr -d ' ') || mega=0
  : ${mega:=0}
  [[ "$mega" -gt 2 ]] && findings="${findings}- MEGA SESSIONS: ${mega} Claude sessions exceed 500KB. Start new sessions every 15-25 messages.
" && [[ "$severity" != "HIGH" ]] && severity="MEDIUM"
fi

# Hermes skill underuse
if [[ -d "$hermes_dir" && "$hermes_count" -gt 0 ]]; then
  skill_count=0
  checked=0
  for f in $(find "$hermes_dir" -name "session_*.json" -type f -mtime "-${DAYS}" 2>/dev/null | head -20); do
    checked=$((checked + 1))
    grep -q 'skill_view\|skills_list\|"memory"' "$f" 2>/dev/null && skill_count=$((skill_count + 1))
  done
  [[ "$checked" -gt 5 && "$skill_count" -eq 0 ]] && findings="${findings}- HERMES SKILL UNDERUSE: 0/${checked} sessions invoke skills or memory. Load skills before substantial work.
" && [[ "$severity" != "HIGH" ]] && severity="MEDIUM"
fi

# ---- Build coaching block ----
timestamp=$(date -u +"%Y-%m-%d %H:%M UTC")

COACHING_BLOCK="## AI Coach Context (${timestamp})
Risk Level: **${severity}** | Sessions: ${total} (Claude:${claude_count} Codex:${codex_count} OpenCode:${opencode_count} Hermes:${hermes_count} GSD:${gsd_count})

Before your next prompt, consider:
1. **Provide context**: Describe intent, constraints, expected output format
2. **Reference files**: Use #file references or open relevant files
3. **Load skills**: Run skill_view before substantial work
4. **Break sessions**: Start new sessions every 15-25 messages
5. **Verify output**: Always request verification of changes"

[[ -n "$findings" ]] && COACHING_BLOCK="${COACHING_BLOCK}

Active findings:
${findings}"

COACHING_BLOCK="${COACHING_BLOCK}
---
*Refreshed by ai-coach-refresh. Run \`ai-coach-refresh\` to update.*"

# ---- Update CLAUDE.md and AGENTS.md ----
update_file() {
  local filepath="$1"
  local tmpfile="${filepath}.coach-tmp"

  if [[ ! -f "$filepath" ]]; then
    printf '%s\n' "$COACHING_BLOCK" > "$filepath"
    echo "Created $filepath with coaching block"
    return
  fi

  # Remove old coaching block
  awk '
    /^## AI Coach Context \(/ { in_block=1; next }
    in_block && /^\*Refreshed by ai-coach-refresh\./ { in_block=0; next }
    in_block && /^---$/ { next }
    in_block { next }
    { print }
  ' "$filepath" > "$tmpfile"

  # Append new block
  echo "" >> "$tmpfile"
  printf '%s\n' "$COACHING_BLOCK" >> "$tmpfile"
  mv "$tmpfile" "$filepath"
  echo "Updated $filepath (severity: ${severity})"
}

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN - Would write coaching block to:"
  echo "  $HOME_DIR/.claude/CLAUDE.md"
  echo "  $HOME_DIR/AGENTS.md"
  echo ""
  echo "--- Coaching Block ---"
  echo "$COACHING_BLOCK"
  echo "--- End Block ---"
else
  update_file "$HOME_DIR/.claude/CLAUDE.md"
  update_file "$HOME_DIR/AGENTS.md"
fi