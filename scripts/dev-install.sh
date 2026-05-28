#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"
VSIX="${PKG_NAME}-${PKG_VERSION}.vsix"

echo "==> Building extension..."
npx vsce package --no-dependencies

echo "==> Installing $VSIX into VS Code Insiders..."
code-insiders --install-extension "$VSIX" --force

echo "==> Reloading VS Code Insiders..."
osascript -e '
tell application "Visual Studio Code - Insiders"
  activate
end tell
delay 0.3
tell application "System Events"
  keystroke "p" using {command down, shift down}
  delay 0.3
  keystroke "Developer: Reload Window"
  delay 0.3
  key code 36
end tell
'

echo "==> Done."
