#!/usr/bin/env bash
set -euo pipefail

# build/icon.png (1024x1024) → build/icon.icns (macOS multi-res).
# macOS 내장 sips + iconutil 사용.

SRC="build/icon.png"
OUT="build/icon.icns"
SET_DIR="build/icon.iconset"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: $SRC not found. Place a 1024x1024 PNG at that path first." >&2
  exit 1
fi

rm -rf "$SET_DIR"
mkdir -p "$SET_DIR"

sips -z 16 16     "$SRC" --out "$SET_DIR/icon_16x16.png" > /dev/null
sips -z 32 32     "$SRC" --out "$SET_DIR/icon_16x16@2x.png" > /dev/null
sips -z 32 32     "$SRC" --out "$SET_DIR/icon_32x32.png" > /dev/null
sips -z 64 64     "$SRC" --out "$SET_DIR/icon_32x32@2x.png" > /dev/null
sips -z 128 128   "$SRC" --out "$SET_DIR/icon_128x128.png" > /dev/null
sips -z 256 256   "$SRC" --out "$SET_DIR/icon_128x128@2x.png" > /dev/null
sips -z 256 256   "$SRC" --out "$SET_DIR/icon_256x256.png" > /dev/null
sips -z 512 512   "$SRC" --out "$SET_DIR/icon_256x256@2x.png" > /dev/null
sips -z 512 512   "$SRC" --out "$SET_DIR/icon_512x512.png" > /dev/null
cp "$SRC"                "$SET_DIR/icon_512x512@2x.png"

iconutil -c icns "$SET_DIR" -o "$OUT"
rm -rf "$SET_DIR"

echo "Generated: $OUT"
