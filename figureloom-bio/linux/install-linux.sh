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
  echo "Git is required but was not found." >&2
  exit 1
fi

echo "Downloading FigureLoom Bio..."
git clone --quiet --depth 1 --branch "$REF" "$REPOSITORY" "$TEMP_DIR/Figureloom"
FIGURELOOM_SOURCE_DIR="$TEMP_DIR/Figureloom" \
  bash "$TEMP_DIR/Figureloom/figureloom-bio/linux/install-workspace.sh"
