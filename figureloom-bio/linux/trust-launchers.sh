#!/usr/bin/env bash
set -u

HOME_DIR="${HOME:-}"
if [[ -z "$HOME_DIR" || ! -d "$HOME_DIR" ]]; then
  exit 0
fi

DESKTOP_DIR="${XDG_DESKTOP_DIR:-}"
if [[ -z "$DESKTOP_DIR" ]] && command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
fi
if [[ -z "$DESKTOP_DIR" || "$DESKTOP_DIR" == "$HOME_DIR" ]]; then
  DESKTOP_DIR="$HOME_DIR/Desktop"
fi

launchers=(
  "$DESKTOP_DIR/FigureLoom Bio IDE.desktop"
  "$DESKTOP_DIR/Test FigureLoom Bio.desktop"
  "$DESKTOP_DIR/Install or Update FigureLoom Bio.desktop"
)

found=0
for launcher in "${launchers[@]}"; do
  [[ -f "$launcher" ]] || continue
  found=1
  chmod u+x "$launcher" 2>/dev/null || true
  if command -v gio >/dev/null 2>&1; then
    gio set "$launcher" metadata::trusted true >/dev/null 2>&1 || true
  fi
done

if [[ $found -eq 1 ]] && command -v xfdesktop >/dev/null 2>&1; then
  xfdesktop --reload >/dev/null 2>&1 || true
fi

exit 0
