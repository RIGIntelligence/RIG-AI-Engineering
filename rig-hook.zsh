#!/usr/bin/env zsh
# RIG AI Engineering v10 — Hermes Pre-Send Hook
# Source this file in ~/.zshrc:
#   source ~/RIG-AI-Engineering/rig-hook.zsh
#
# This provides:
#   hermes-smart <args>   — Intercepts hermes chat -q, scores prompt first
#   rig-hook-on           — Enable smart hermes (aliases hermes → hermes-smart)
#   rig-hook-off          — Disable (restore original hermes)
#   rig-hook-status       — Show hook status

# ─── Configuration ───────────────────────────────────────────────────
: ${RIG_HOOK_THRESHOLD:=50}     # Score below this triggers warning (0-100)
: ${RIG_HOOK_ENHANCE:=1}        # Show enhanced version when score low
: ${RIG_ENGINE:="$HOME/RIG-AI-Engineering/python/rig/prompt_engine.py"}

# ─── Smart Hermes Wrapper ────────────────────────────────────────────
# Usage: hermes-smart chat -q "your prompt"
# Scores the prompt before sending. If score < threshold, warns and offers
# to send the enhanced version instead.

hermes-smart() {
    local args=("$@")
    local prompt=""
    local quiet_idx=-1

    # Parse: find -q flag and the prompt after it
    local i=1
    while [[ $i -le ${#args} ]]; do
        if [[ "${args[$i]}" == "-q" || "${args[$i]}" == "--query" ]]; then
            quiet_idx=$((i+1))
        fi
        ((i++))
    done

    # Only intercept hermes chat -q "<prompt>"
    if [[ "$1" == "chat" && $quiet_idx -gt 0 && -n "${args[$quiet_idx]}" ]]; then
        prompt="${args[$quiet_idx]}"

        local score="?"
        local grade="?"

        # Score the prompt via rig engine
        if [[ -f "$RIG_ENGINE" ]]; then
            local score_out
            score_out=$(echo "$prompt" | python3 "$RIG_ENGINE" score 2>/dev/null)

            if [[ -n "$score_out" ]]; then
                score=$(echo "$score_out" | grep "TOTAL:" | grep -oP '\d+(?=/100)' | head -1)
                grade=$(echo "$score_out" | grep "^  GRADE:" | awk '{print $2}')
            fi
        fi

        # Warning if score is low
        if [[ "$score" != "?" ]] && [[ "$score" -lt "$RIG_HOOK_THRESHOLD" ]]; then
            echo ""
            echo "┌─ RIG PROMPT HOOK ─────────────────────────────────┐"
            printf "│  SCORE: %s/100 (%s)\n" "$score" "$grade"
            echo "│"

            # Show top 2 findings
            if [[ -n "$score_out" ]]; then
                local findings
                findings=$(echo "$score_out" | sed -n '/FINDINGS:/,/───/p' | grep "^\s*[0-9]" | head -2 | sed 's/^[[:space:]]*//' | cut -c1-48)
                while IFS= read -r line; do
                    [[ -n "$line" ]] && printf "│  ⚠  %s\n" "$line"
                done <<< "$findings"
            fi

            echo "│"
            echo "│  Commands:                                        │"
            echo "│    [Enter] Send anyway    [e] Send enhanced       │"
            echo "│    [s] Full score         [a] Abort              │"
            echo "└───────────────────────────────────────────────────┘"
            echo -n "  Choice [Enter/e/s/a]: "
            local choice
            read -r choice

            case "$choice" in
                e|E)
                    # Send enhanced version
                    if [[ -f "$RIG_ENGINE" && "$RIG_HOOK_ENHANCE" == "1" ]]; then
                        local enhanced
                        enhanced=$(python3 "$RIG_ENGINE" enhance "$prompt" 2>/dev/null | sed -n '/── ENHANCED PROMPT/,/── COMMANDS/p' | head -n -2 | tail -n +3)
                        if [[ -n "$enhanced" ]]; then
                            echo ""
                            echo "── ENHANCED ────────────────────────────────────────"
                            echo "$enhanced"
                            echo "────────────────────────────────────────────────────"
                            echo ""
                            args[$quiet_idx]="$enhanced"
                        fi
                    fi
                    ;;
                s|S)
                    # Show full score and re-prompt
                    if [[ -n "$score_out" ]]; then
                        echo "$score_out"
                    fi
                    echo -n "  Send now? [y/N]: "
                    local confirm
                    read -r confirm
                    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                        echo "  Aborted."
                        return 1
                    fi
                    ;;
                a|A)
                    echo "  Aborted."
                    return 1
                    ;;
                *)
                    # Enter or anything else: send as-is
                    ;;
            esac
        fi
    fi

    # Execute the real hermes
    local _hermes_bin="$HOME/.local/bin/hermes"
    [[ ! -x "$_hermes_bin" ]] && _hermes_bin="/usr/local/bin/hermes"
    [[ ! -x "$_hermes_bin" ]] && _hermes_bin="hermes"

    "$_hermes_bin" "$@"
}

# ─── Hook Control ────────────────────────────────────────────────────

rig-hook-on() {
    # Save current hermes alias/function if it exists
    if alias hermes &>/dev/null; then
        alias _hermes_original="$(alias hermes | sed "s/alias hermes='//;s/'$//")" 2>/dev/null
    fi
    alias hermes="hermes-smart"
    echo "RIG Hermes Hook ACTIVE (alias: hermes → hermes-smart)"
    echo "  Threshold: $RIG_HOOK_THRESHOLD | Enhance: $RIG_HOOK_ENHANCE"
}

rig-hook-off() {
    unalias hermes 2>/dev/null
    if alias _hermes_original &>/dev/null; then
        alias hermes="$(alias _hermes_original | sed "s/alias _hermes_original='//;s/'$//")" 2>/dev/null
        unalias _hermes_original 2>/dev/null
    fi
    echo "RIG Hermes Hook DEACTIVATED"
}

rig-hook-status() {
    if alias hermes 2>/dev/null | grep -q hermes-smart; then
        echo "RIG Hermes Hook: ACTIVE"
    else
        echo "RIG Hermes Hook: INACTIVE"
    fi
    echo "  Threshold: $RIG_HOOK_THRESHOLD"
    echo "  Engine:    $RIG_ENGINE"
}