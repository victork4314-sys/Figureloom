#!/usr/bin/env bash
set -euo pipefail

REF="${FIGURELOOM_REF:-main}"
REPOSITORY="${FIGURELOOM_REPOSITORY:-https://github.com/victork4314-sys/Figureloom.git}"
TARGET_USER="${FIGURELOOM_TARGET_USER:-}"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-user)
      TARGET_USER="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown installer option: $1" >&2
      exit 2
      ;;
  esac
done

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "The installer needs administrator permission." >&2
  exit 1
fi

if [[ -z "$TARGET_USER" || "$TARGET_USER" == root ]]; then
  TARGET_USER="${SUDO_USER:-root}"
fi

ensure_bootstrap_piece() {
  local command="$1"
  local package="$2"
  if command -v "$command" >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "$command is missing and this system does not provide apt-get." >&2
    exit 1
  fi
  echo "PROGRESS 8 Installing missing Linux piece: $package"
  if [[ "${APT_UPDATED:-0}" != 1 ]]; then
    apt-get update -qq
    APT_UPDATED=1
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$package"
}

APT_UPDATED=0
ensure_bootstrap_piece git git
ensure_bootstrap_piece python3 python3
ensure_bootstrap_piece tar tar

if ! python3 -c 'import venv' >/dev/null 2>&1; then
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Python venv support is missing and apt-get is unavailable." >&2
    exit 1
  fi
  echo "PROGRESS 12 Installing missing Linux piece: python3-venv"
  if [[ "$APT_UPDATED" != 1 ]]; then
    apt-get update -qq
    APT_UPDATED=1
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-venv
fi

if ! python3 -c 'import tkinter' >/dev/null 2>&1; then
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "The installer window needs Python Tk and apt-get is unavailable." >&2
    exit 1
  fi
  echo "PROGRESS 16 Installing the installer window support"
  if [[ "$APT_UPDATED" != 1 ]]; then
    apt-get update -qq
    APT_UPDATED=1
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-tk
fi

echo "PROGRESS 22 Downloading the current FigureLoom Bio files"
git clone --quiet --depth 1 --branch "$REF" "$REPOSITORY" "$TEMP_DIR/Figureloom"

echo "PROGRESS 35 Checking and installing the workspace"
FIGURELOOM_SOURCE_DIR="$TEMP_DIR/Figureloom" \
FIGURELOOM_TARGET_USER="$TARGET_USER" \
bash "$TEMP_DIR/Figureloom/figureloom-bio/linux/install-workspace.sh"

echo "PROGRESS 100 FigureLoom Bio is ready"
