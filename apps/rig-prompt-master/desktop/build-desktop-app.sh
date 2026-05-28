#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="RIG Master Prompter"
BUNDLE="$APP_DIR/$APP_NAME.app"
CONTENTS="$BUNDLE/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

mkdir -p "$MACOS" "$RESOURCES"

"$SCRIPT_DIR/make_icon.py" "$RESOURCES/RIGMasterPrompter.icns"

swiftc \
  -framework Cocoa \
  -framework WebKit \
  "$SCRIPT_DIR/RIGMasterPrompter.swift" \
  -o "$MACOS/$APP_NAME"

chmod +x "$MACOS/$APP_NAME"

plutil -lint "$CONTENTS/Info.plist"
if command -v codesign >/dev/null 2>&1; then
  codesign --force --sign - "$BUNDLE" >/dev/null
fi
echo "$BUNDLE"
