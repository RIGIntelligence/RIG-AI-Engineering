#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PY="${PYTHON:-python3}"
HOST="${RIG_MASTER_PROMPTER_HOST:-${RIG_PROMPT_MASTER_HOST:-127.0.0.1}}"
PORT="${RIG_MASTER_PROMPTER_PORT:-${RIG_PROMPT_MASTER_PORT:-8767}}"
URL="http://$HOST:$PORT"
APP_DIR="$REPO_ROOT/apps/rig-prompt-master"

if [[ -n "${RIG_MASTER_PROMPTER_URL:-${RIG_PROMPT_MASTER_URL:-}}" ]]; then
  open "${RIG_MASTER_PROMPTER_URL:-${RIG_PROMPT_MASTER_URL:-}}"
  exit 0
fi

if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

cd "$REPO_ROOT"
(
  for _ in {1..40}; do
    if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
      open "$URL"
      exit 0
    fi
    sleep 0.25
  done
  open "$URL"
) &

if [[ -d "$APP_DIR/node_modules" ]]; then
  cd "$APP_DIR"
  export RIG_DEV_ALLOW_ANON="${RIG_DEV_ALLOW_ANON:-1}"
  export RIG_MASTER_PROMPTER_DESKTOP=1
  if [[ -f "$APP_DIR/.next/BUILD_ID" ]]; then
    exec npm run start -- -H "$HOST" -p "$PORT"
  fi
  exec npm run dev -- -H "$HOST" -p "$PORT"
fi

exec "$PY" "$REPO_ROOT/python/rig/rig_app_server.py" --host "$HOST" --port "$PORT"
