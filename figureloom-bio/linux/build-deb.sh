#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${FIGURELOOM_SOURCE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
OUTPUT_DIR="${1:-$ROOT_DIR/dist}"
PACKAGE_NAME="figureloom-bio-desktop"
FILE_NAME="FigureLoom-Bio-Installer.deb"
WORK_DIR="$(mktemp -d)"
PACKAGE_DIR="$WORK_DIR/package"
trap 'rm -rf "$WORK_DIR"' EXIT

if [[ ! -f "$ROOT_DIR/figureloom-bio/pyproject.toml" || ! -f "$ROOT_DIR/ide/index.html" ]]; then
  echo "The FigureLoom repository root was not found at: $ROOT_DIR" >&2
  exit 1
fi
if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb is required to build the Linux installer." >&2
  exit 1
fi

VERSION="${FIGURELOOM_DEB_VERSION:-$(python3 - "$ROOT_DIR/figureloom-bio/pyproject.toml" <<'PY'
from pathlib import Path
import sys
try:
    import tomllib
except ImportError:
    print("0.0.0")
    raise SystemExit
with Path(sys.argv[1]).open("rb") as handle:
    print(tomllib.load(handle)["project"]["version"])
PY
)}"

if [[ ! "$VERSION" =~ ^[0-9][0-9A-Za-z.+:~-]*$ ]]; then
  echo "Invalid Debian package version: $VERSION" >&2
  exit 1
fi

mkdir -p "$PACKAGE_DIR/DEBIAN" "$PACKAGE_DIR/usr/share/figureloom-bio/source" "$OUTPUT_DIR"
(
  cd "$ROOT_DIR"
  tar \
    --exclude=.git \
    --exclude=.github \
    --exclude=node_modules \
    --exclude=dist \
    --exclude='*.deb' \
    --exclude='*.pyc' \
    --exclude=__pycache__ \
    -cf - .
) | tar -C "$PACKAGE_DIR/usr/share/figureloom-bio/source" -xf -

cat > "$PACKAGE_DIR/DEBIAN/control" <<EOF_CONTROL
Package: $PACKAGE_NAME
Version: $VERSION
Section: science
Priority: optional
Architecture: all
Maintainer: FigureLoom
Depends: python3 (>= 3.10), python3-venv, python3-tk, git, tar, xdg-utils, libglib2.0-bin
Recommends: chromium | chromium-browser | firefox | firefox-esr
Homepage: https://figureloom.org/ide/
Description: FigureLoom Bio desktop installer
 Plain-English biological workflows, a local IDE, desktop launchers,
 unzipped test files, and a built-in installation test.
EOF_CONTROL

cat > "$PACKAGE_DIR/DEBIAN/postinst" <<'EOF_POSTINST'
#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="/usr/share/figureloom-bio/source"

valid_user() {
  local candidate="${1:-}"
  [[ -n "$candidate" ]] || return 1
  getent passwd "$candidate" | awk -F: '($3 == 0 || ($3 >= 1000 && $3 < 60000)) && $7 !~ /(nologin|false)$/ { found=1 } END { exit found ? 0 : 1 }'
}

user_from_uid() {
  local uid="${1:-}"
  [[ "$uid" =~ ^[0-9]+$ ]] || return 1
  getent passwd "$uid" | cut -d: -f1
}

detect_target_user() {
  local candidate=""
  for candidate in "${FIGURELOOM_TARGET_USER:-}" "${SUDO_USER:-}"; do
    if valid_user "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  candidate="$(user_from_uid "${PKEXEC_UID:-}" 2>/dev/null || true)"
  if valid_user "$candidate"; then
    printf '%s\n' "$candidate"
    return 0
  fi

  while read -r candidate _; do
    if valid_user "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(who 2>/dev/null || true)

  if command -v loginctl >/dev/null 2>&1; then
    while read -r session _; do
      [[ -n "$session" ]] || continue
      candidate="$(loginctl show-session "$session" -p Name --value 2>/dev/null || true)"
      if valid_user "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done < <(loginctl list-sessions --no-legend 2>/dev/null || true)
  fi

  if valid_user kasm-user; then
    printf '%s\n' kasm-user
    return 0
  fi

  mapfile -t regular_users < <(getent passwd | awk -F: '$3 >= 1000 && $3 < 60000 && $7 !~ /(nologin|false)$/ { print $1 }')
  if [[ ${#regular_users[@]} -eq 1 ]]; then
    printf '%s\n' "${regular_users[0]}"
    return 0
  fi

  if [[ "${HOME:-}" == /root || -d /root/Desktop ]] && valid_user root; then
    printf '%s\n' root
    return 0
  fi

  return 1
}

TARGET_USER="$(detect_target_user || true)"

env \
  FIGURELOOM_SOURCE_DIR="$SOURCE_ROOT" \
  FIGURELOOM_TARGET_USER="$TARGET_USER" \
  FIGURELOOM_PACKAGE_INSTALL=1 \
  FIGURELOOM_NO_APT=1 \
  bash "$SOURCE_ROOT/figureloom-bio/linux/install-workspace.sh"

exit 0
EOF_POSTINST
chmod 0755 "$PACKAGE_DIR/DEBIAN/postinst"

cat > "$PACKAGE_DIR/DEBIAN/postrm" <<'EOF_POSTRM'
#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  remove|purge)
    rm -rf /opt/figureloom-bio /opt/figureloom-desktop
    rm -f \
      /usr/local/bin/flbio \
      /usr/local/bin/figureloom-bio-ide \
      /usr/local/bin/figureloom-bio-test \
      /usr/local/bin/figureloom-bio-installer \
      /usr/local/libexec/figureloom-bio-update \
      /usr/share/icons/hicolor/256x256/apps/figureloom-bio.png \
      /usr/share/applications/figureloom-bio-ide.desktop \
      /usr/share/applications/figureloom-bio-test.desktop \
      /usr/share/applications/figureloom-bio-installer.desktop
    for home in /root /home/*; do
      [[ -d "$home/Desktop" ]] || continue
      rm -f \
        "$home/Desktop/FigureLoom Bio IDE.desktop" \
        "$home/Desktop/Test FigureLoom Bio.desktop" \
        "$home/Desktop/Install or Update FigureLoom Bio.desktop"
    done
    ;;
esac

exit 0
EOF_POSTRM
chmod 0755 "$PACKAGE_DIR/DEBIAN/postrm"

find "$PACKAGE_DIR/usr/share/figureloom-bio/source" -type d -exec chmod 0755 {} +
find "$PACKAGE_DIR/usr/share/figureloom-bio/source" -type f -exec chmod 0644 {} +
chmod 0755 \
  "$PACKAGE_DIR/usr/share/figureloom-bio/source/figureloom-bio/linux/build-deb.sh" \
  "$PACKAGE_DIR/usr/share/figureloom-bio/source/figureloom-bio/linux/install-workspace.sh" \
  "$PACKAGE_DIR/usr/share/figureloom-bio/source/figureloom-bio/linux/install-linux.sh" \
  "$PACKAGE_DIR/usr/share/figureloom-bio/source/figureloom-bio/linux/update-worker.sh" \
  "$PACKAGE_DIR/usr/share/figureloom-bio/source/figureloom-bio/linux/installer-window.py"

dpkg-deb --build --root-owner-group "$PACKAGE_DIR" "$OUTPUT_DIR/$FILE_NAME" >/dev/null
printf '%s\n' "$OUTPUT_DIR/$FILE_NAME"
