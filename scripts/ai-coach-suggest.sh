#!/usr/bin/env zsh
# ai-coach-suggest — Suggest RIG prompt templates based on a task description
# Usage: ai-coach-suggest "I want to build a fleet for healthcare"
#        ai-coach-suggest --category fleet-infrastructure
#        ai-coach-suggest --list

set -uo pipefail

TEMPLATE_DIR="${HOME}/Startup-Intelligence-OS/prompt-templates"
TEMPLATE_FILE="${TEMPLATE_DIR}/rig-prompt-templates.json"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  # Fallback search
  TEMPLATE_FILE=$(find ~ -name "rig-prompt-templates.json" -maxdepth 5 2>/dev/null | head -1)
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) 
      echo "RIG Prompt Template Categories (1,000 total):"
      echo "  01. rig-doctrine-execution    — IQRSQPI, BMS modes, gates, ProofPackets"
      echo "  02. fleet-infrastructure      — Nodes, models, mesh, security"
      echo "  03. agent-orchestration        — Susan, Jake, fleets, swarms"
      echo "  04. content-engineering       — LinkedIn, brand, engagement"
      echo "  05. client-acquisition        — Outreach, proposals, ROI"
      echo "  06. product-code              — Features, APIs, releases"
      echo "  07. research-intelligence     — Blueprints, signals, forecasts"
      echo "  08. healthcare-verticals      — Hospital, PE, law, fintech"
      echo "  09. personal-brand            — Speaking, hiring, advisory"
      echo "  10. diagnostic-coaching       — Scoring, audits, optimization"
      exit 0 ;;
    --category) 
      CATEGORY="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: ai-coach-suggest [TASK_DESCRIPTION]"
      echo "       ai-coach-suggest --category [CAT]"
      echo "       ai-coach-suggest --list"
      exit 0 ;;
    *) QUERY="$*"; break ;;
  esac
done

: ${CATEGORY:=}
: ${QUERY:=}

if [[ -z "$QUERY" && -z "$CATEGORY" ]]; then
  echo "Usage: ai-coach-suggest \"your task description\""
  echo "       ai-coach-suggest --category fleet-infrastructure"
  echo "       ai-coach-suggest --list"
  exit 1
fi

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "ERROR: Template file not found. Run: ls ~/Startup-Intelligence-OS/prompt-templates/"
  exit 1
fi

# Search templates
if [[ -n "$CATEGORY" ]]; then
  python3 -c "
import json, sys
d = json.load(open('$TEMPLATE_FILE'))
cat = '$CATEGORY'
matches = [t for t in d['templates'] if t['category'] == cat]
print(f'Category: {cat} ({len(matches)} templates)')
print()
for t in matches[:20]:
    print(f\"  {t['id']}: {t['name']}\")
    print(f\"    {t['prompt_template'][:120]}...\")
    print()
if len(matches) > 20:
    print(f'  ... and {len(matches)-20} more. Filter with a task description.')
" 2>/dev/null
else
  python3 -c "
import json, sys, re
d = json.load(open('$TEMPLATE_FILE'))
query = '$QUERY'.lower()
words = set(re.findall(r'\w+', query))
scored = []
for t in d['templates']:
    name_words = set(re.findall(r'\w+', t['name'].lower()))
    use_words = set(re.findall(r'\w+', t['use_case'].lower()))
    prompt_words = set(re.findall(r'\w+', t['prompt_template'].lower()))
    cat_words = set(re.findall(r'\w+', t['category'].lower()))
    score = len(words & name_words)*3 + len(words & cat_words)*2 + len(words & use_words)*2 + len(words & prompt_words)*1
    if score > 0:
        scored.append((score, t))
scored.sort(key=lambda x: -x[0])
print(f'Query: \"$QUERY\"')
print(f'Top {min(len(scored),15)} matching templates:')
print()
for score, t in scored[:15]:
    print(f\"  {t['id']} [{t['category']}] {t['name']} (score: {score})\")
    vars_list = ', '.join(t['variables'][:5])
    print(f\"    Variables: {vars_list}\")
    print(f\"    Specificity: {t['specificity_level']}/5\")
    print()
if not scored:
    print('No matches. Try broader terms or --list to see categories.')
" 2>/dev/null
fi