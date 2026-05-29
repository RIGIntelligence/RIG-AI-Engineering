#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="RIG Master Prompter"
HOST="${RIG_MASTER_PROMPTER_HOST:-127.0.0.1}"
PORT="${RIG_MASTER_PROMPTER_PORT:-8767}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/rig-prompt-master"
APP_BUNDLE="$APP_DIR/$APP_NAME.app"
DESKTOP_BUNDLE="$HOME/Desktop/$APP_NAME.app"
DESKTOP_COMMAND="$HOME/Desktop/$APP_NAME.command"
URL="http://$HOST:$PORT"

stop_app() {
  osascript -e "quit app \"$APP_NAME\"" >/dev/null 2>&1 || true
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids >/dev/null 2>&1 || true
  fi
}

build_app() {
  npm --prefix "$APP_DIR" run test
  npm --prefix "$APP_DIR" run typecheck
  npm --prefix "$APP_DIR" run build
  npm --prefix "$APP_DIR" run desktop:build
  ln -sfn "$APP_BUNDLE" "$DESKTOP_BUNDLE"
  ln -sfn "$APP_DIR/$APP_NAME.command" "$DESKTOP_COMMAND"
}

wait_for_health() {
  for _ in {1..80}; do
    if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  echo "Timed out waiting for $URL/api/health" >&2
  return 1
}

open_app() {
  /usr/bin/open -n "$DESKTOP_BUNDLE"
  wait_for_health
}

verify_app() {
  test -d "$DESKTOP_BUNDLE"
  test -s "$APP_BUNDLE/Contents/Resources/RIGMasterPrompter.icns"
  wait_for_health
  npm --prefix "$APP_DIR" run verify:local
}

case "$MODE" in
  run)
    stop_app
    build_app
    open_app
    ;;
  --verify|verify)
    stop_app
    build_app
    open_app
    verify_app
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\" OR eventMessage CONTAINS \"RIG Master Prompter\""
    ;;
  --debug|debug)
    open_app
    echo "App launched at $URL. Attach Safari/WebKit or Chrome devtools to inspect the web surface."
    ;;
  *)
    echo "usage: $0 [run|--verify|--logs|--telemetry|--debug]" >&2
    exit 2
    ;;
esac
