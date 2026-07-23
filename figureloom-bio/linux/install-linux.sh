#!/usr/bin/env bash
set -euo pipefail

REF="${FIGURELOOM_REF:-main}"
REPOSITORY="${FIGURELOOM_REPOSITORY:-https://github.com/victork4314-sys/Figureloom.git}"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  echo "Example: curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash" >&2
  exit 1
fi

missing=()
command -v git >/dev/null 2>&1 || missing+=(git)
command -v tar >/dev/null 2>&1 || missing+=(tar)

if command -v python3 >/dev/null 2>&1; then
  VENV_PROBE="$TEMP_DIR/venv-probe"
  if ! python3 -m venv "$VENV_PROBE" >/dev/null 2>&1; then
    missing+=(python3-venv)
  fi
  rm -rf "$VENV_PROBE"
  python3 -c 'import tkinter' >/dev/null 2>&1 || missing+=(python3-tk)
else
  missing+=(python3 python3-venv python3-tk)
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  if ! command -v apt-get >/dev/null 2>&1; then
    printf 'These required Linux pieces are missing: %s\n' "${missing[*]}" >&2
    echo "This automatic installer currently supports Ubuntu and Debian systems with apt-get." >&2
    exit 1
  fi
  echo "Installing only the missing Linux pieces: ${missing[*]}"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${missing[@]}"
fi

VENV_PROBE="$TEMP_DIR/venv-final-check"
if ! python3 -m venv "$VENV_PROBE" >/dev/null 2>&1; then
  echo "Python still cannot create a virtual environment after installing the required pieces." >&2
  exit 1
fi
rm -rf "$VENV_PROBE"

echo "Downloading FigureLoom Bio..."
git clone --quiet --depth 1 --branch "$REF" "$REPOSITORY" "$TEMP_DIR/Figureloom"
FIGURELOOM_SOURCE_DIR="$TEMP_DIR/Figureloom" \
FIGURELOOM_TARGET_USER="${SUDO_USER:-}" \
  bash "$TEMP_DIR/Figureloom/figureloom-bio/linux/install-workspace.sh"

echo
echo "Done. Double-click 'Install or Update FigureLoom Bio' on the desktop for future updates or repairs."
