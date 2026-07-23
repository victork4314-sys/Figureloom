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

if ! command -v git >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    echo "Installing the missing Git package..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git
  else
    echo "Git is required but was not found." >&2
    exit 1
  fi
fi

echo "Downloading FigureLoom Bio..."
git clone --quiet --depth 1 --branch "$REF" "$REPOSITORY" "$TEMP_DIR/Figureloom"
FIGURELOOM_SOURCE_DIR="$TEMP_DIR/Figureloom" \
FIGURELOOM_TARGET_USER="${SUDO_USER:-}" \
  bash "$TEMP_DIR/Figureloom/figureloom-bio/linux/install-workspace.sh"

echo
echo "Done. Double-click 'Install or Update FigureLoom Bio' on the desktop for future updates or repairs."
