#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run this installer as root, for example: sudo bash install-workspace.sh" >&2
  exit 1
fi

SOURCE_DIR="${FIGURELOOM_SOURCE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
VENV_DIR="${FIGURELOOM_VENV_DIR:-/opt/figureloom-bio}"
APP_DIR="${FIGURELOOM_APP_DIR:-/opt/figureloom-desktop}"
SITE_DIR="$APP_DIR/site"
INSTALLER_DIR="$APP_DIR/installer"
IDE_LAUNCHER="/usr/local/bin/figureloom-bio-ide"
TEST_LAUNCHER="/usr/local/bin/figureloom-bio-test"
INSTALLER_LAUNCHER="/usr/local/bin/figureloom-bio-installer"
UPDATE_WORKER="/usr/local/libexec/figureloom-bio-update"
ICON_SOURCE="$SOURCE_DIR/figureloom-bio/linux/assets/figureloom-bio.png"
ICON_DIR="/usr/share/icons/hicolor/256x256/apps"
ICON_PATH="$ICON_DIR/figureloom-bio.png"
TARGET_USER="${FIGURELOOM_TARGET_USER:-${SUDO_USER:-}}"
PACKAGE_INSTALL="${FIGURELOOM_PACKAGE_INSTALL:-0}"
NO_APT="${FIGURELOOM_NO_APT:-0}"

if [[ ! -f "$SOURCE_DIR/figureloom-bio/pyproject.toml" || ! -f "$SOURCE_DIR/ide/index.html" ]]; then
  echo "I could not find the FigureLoom source at: $SOURCE_DIR" >&2
  exit 1
fi
if [[ ! -f "$SOURCE_DIR/figureloom-bio/linux/installer-window.py" || ! -f "$SOURCE_DIR/figureloom-bio/linux/update-worker.sh" ]]; then
  echo "The FigureLoom Bio installer-window files are missing from: $SOURCE_DIR" >&2
  exit 1
fi
if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "The FigureLoom Bio icon is missing from: $ICON_SOURCE" >&2
  exit 1
fi

install_missing_packages() {
  local packages=("$@")
  if [[ ${#packages[@]} -eq 0 ]]; then
    return 0
  fi
  if [[ "$NO_APT" == 1 ]]; then
    printf 'These required Linux pieces are missing: %s\n' "${packages[*]}" >&2
    echo "Install them with the normal system package installer, then open the FigureLoom Bio package again." >&2
    exit 1
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    printf 'These required Linux pieces are missing: %s\n' "${packages[*]}" >&2
    echo "This installer can add them automatically on Ubuntu or Debian systems with apt-get." >&2
    exit 1
  fi
  echo "Installing only the missing Linux pieces: ${packages[*]}"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${packages[@]}"
}

echo "PROGRESS 5 Checking required Linux pieces"
missing=()
command -v python3 >/dev/null 2>&1 || missing+=(python3)
command -v git >/dev/null 2>&1 || missing+=(git)
command -v tar >/dev/null 2>&1 || missing+=(tar)
command -v gio >/dev/null 2>&1 || missing+=(libglib2.0-bin)
install_missing_packages "${missing[@]}"

missing=()
VENV_PROBE="$(mktemp -d)"
if ! python3 -m venv "$VENV_PROBE" >/dev/null 2>&1; then
  missing+=(python3-venv)
fi
rm -rf "$VENV_PROBE"
python3 -c 'import tkinter' >/dev/null 2>&1 || missing+=(python3-tk)
install_missing_packages "${missing[@]}"

BROWSER=""
BROWSER_KIND="chromium"
for candidate in chromium chromium-browser google-chrome google-chrome-stable firefox firefox-esr; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$(command -v "$candidate")"
    case "$candidate" in
      firefox|firefox-esr) BROWSER_KIND="firefox" ;;
    esac
    break
  fi
done
if [[ -z "$BROWSER" ]] && command -v xdg-open >/dev/null 2>&1; then
  BROWSER="$(command -v xdg-open)"
  BROWSER_KIND="xdg-open"
fi
if [[ -z "$BROWSER" ]]; then
  echo "A desktop browser or xdg-open is required for the local IDE window." >&2
  exit 1
fi

echo "PROGRESS 18 Installing or updating FigureLoom Bio"
if [[ "$PACKAGE_INSTALL" == 1 ]]; then
  rm -rf "$VENV_DIR"
  mkdir -p "$VENV_DIR/bin" "$VENV_DIR/lib"
  cp -a "$SOURCE_DIR/figureloom-bio/figureloom_bio" "$VENV_DIR/lib/"
  cat > "$VENV_DIR/bin/flbio" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$VENV_DIR/lib\${PYTHONPATH:+:\$PYTHONPATH}"
exec python3 -m figureloom_bio.cli "\$@"
EOF
  chmod 0755 "$VENV_DIR/bin/flbio"
else
  if [[ ! -x "$VENV_DIR/bin/python" ]]; then
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
  fi
  "$VENV_DIR/bin/python" -m pip install --quiet --upgrade pip
  "$VENV_DIR/bin/python" -m pip install --quiet --upgrade "$SOURCE_DIR/figureloom-bio"
fi
ln -sfn "$VENV_DIR/bin/flbio" /usr/local/bin/flbio

echo "PROGRESS 38 Installing the local IDE"
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
(
  cd "$SOURCE_DIR"
  tar --exclude=.git --exclude=node_modules --exclude='*.pyc' --exclude=__pycache__ -cf - .
) | tar -C "$SITE_DIR" -xf -
chmod -R a+rX "$APP_DIR"

mkdir -p "$INSTALLER_DIR" /usr/local/libexec
install -m 0755 "$SOURCE_DIR/figureloom-bio/linux/installer-window.py" "$INSTALLER_DIR/installer-window.py"
install -m 0755 "$SOURCE_DIR/figureloom-bio/linux/update-worker.sh" "$UPDATE_WORKER"

cat > "$INSTALLER_LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec python3 "$INSTALLER_DIR/installer-window.py"
EOF
chmod 0755 "$INSTALLER_LAUNCHER"

cat > "$IDE_LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PORT="\${FIGURELOOM_IDE_PORT:-8877}"
URL="http://127.0.0.1:\${PORT}/ide/"
LOG="\${TMPDIR:-/tmp}/figureloom-bio-ide-server.log"

server_ready() {
  python3 - "\$PORT" <<'PY'
import socket
import sys
port = int(sys.argv[1])
with socket.socket() as sock:
    sock.settimeout(0.2)
    raise SystemExit(0 if sock.connect_ex(("127.0.0.1", port)) == 0 else 1)
PY
}

if ! server_ready; then
  nohup python3 -m http.server "\$PORT" --bind 127.0.0.1 --directory "$SITE_DIR" >"\$LOG" 2>&1 &
  for _ in {1..50}; do
    server_ready && break
    sleep 0.1
  done
fi

if ! server_ready; then
  echo "The local FigureLoom Bio IDE server could not start." >&2
  echo "Log: \$LOG" >&2
  exit 1
fi

BROWSER="$BROWSER"
BROWSER_KIND="$BROWSER_KIND"
if [[ "\$BROWSER_KIND" == firefox ]]; then
  exec "\$BROWSER" --new-window "\$URL"
fi
if [[ "\$BROWSER_KIND" == xdg-open ]]; then
  exec "\$BROWSER" "\$URL"
fi
FLAGS=(--no-first-run --disable-session-crashed-bubble --disable-features=Translate --app="\$URL")
if [[ \${EUID:-\$(id -u)} -eq 0 ]]; then
  FLAGS+=(--no-sandbox)
fi
exec "\$BROWSER" "\${FLAGS[@]}"
EOF
chmod 0755 "$IDE_LAUNCHER"

cat > "$TEST_LAUNCHER" <<'EOF'
#!/usr/bin/env bash
set -u
TEST_DIR="${HOME}/Desktop/FigureLoom Bio Test Files"
printf '\nFigureLoom Bio automatic test\n=============================\n\n'
flbio quick-test "$TEST_DIR"
status=$?
printf '\n'
if [[ $status -eq 0 ]]; then
  echo "Everything passed. The result report is on your desktop."
else
  echo "The test failed. Open TEST-RESULT.txt in the desktop test folder."
fi
printf '\nPress Enter to close this window.\n'
read -r _
exit "$status"
EOF
chmod 0755 "$TEST_LAUNCHER"

echo "PROGRESS 54 Installing the FigureLoom Bio application icon"
mkdir -p "$ICON_DIR"
install -m 0644 "$ICON_SOURCE" "$ICON_PATH"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi

echo "PROGRESS 58 Adding desktop and application-menu icons"
mkdir -p /usr/share/applications
cat > /usr/share/applications/figureloom-bio-ide.desktop <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=FigureLoom Bio IDE
Comment=Write and run plain-English biology programs
Exec=$IDE_LAUNCHER
Icon=figureloom-bio
Terminal=false
Categories=Development;Science;Education;
StartupNotify=true
EOF

cat > /usr/share/applications/figureloom-bio-test.desktop <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Test FigureLoom Bio
Comment=Run the automatic FigureLoom Bio installation test
Exec=$TEST_LAUNCHER
Icon=figureloom-bio
Terminal=true
Categories=Development;Science;Education;
StartupNotify=true
EOF

cat > /usr/share/applications/figureloom-bio-installer.desktop <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Install or Update FigureLoom Bio
Comment=Install, update, repair, and test FigureLoom Bio
Exec=$INSTALLER_LAUNCHER
Icon=figureloom-bio
Terminal=false
Categories=Development;Science;Education;
StartupNotify=true
EOF
chmod 0755 \
  /usr/share/applications/figureloom-bio-ide.desktop \
  /usr/share/applications/figureloom-bio-test.desktop \
  /usr/share/applications/figureloom-bio-installer.desktop

run_for_desktop_user() {
  local owner="$1"
  shift
  if [[ -z "$owner" || "$owner" == root ]]; then
    "$@"
    return
  fi
  runuser -u "$owner" -- "$@"
}

mark_launcher_trusted() {
  local home="$1"
  local owner="$2"
  local launcher="$3"
  local uid=""
  local runtime=""

  chmod 0755 "$launcher"
  command -v gio >/dev/null 2>&1 || return 0

  uid="$(id -u "${owner:-root}" 2>/dev/null || printf '0')"
  runtime="/run/user/$uid"

  if [[ -S "$runtime/bus" ]]; then
    if run_for_desktop_user "$owner" env \
      HOME="$home" \
      XDG_RUNTIME_DIR="$runtime" \
      DBUS_SESSION_BUS_ADDRESS="unix:path=$runtime/bus" \
      gio set "$launcher" metadata::trusted true >/dev/null 2>&1; then
      return 0
    fi
  fi

  run_for_desktop_user "$owner" env HOME="$home" \
    gio set "$launcher" metadata::trusted true >/dev/null 2>&1 || true
}

install_desktop() {
  local home="$1"
  local owner="${2:-root}"
  local desktop="$home/Desktop"
  local ide_icon="$desktop/FigureLoom Bio IDE.desktop"
  local test_icon="$desktop/Test FigureLoom Bio.desktop"
  local installer_icon="$desktop/Install or Update FigureLoom Bio.desktop"
  local test_folder="$desktop/FigureLoom Bio Test Files"
  mkdir -p "$desktop"
  cp /usr/share/applications/figureloom-bio-ide.desktop "$ide_icon"
  cp /usr/share/applications/figureloom-bio-test.desktop "$test_icon"
  cp /usr/share/applications/figureloom-bio-installer.desktop "$installer_icon"
  chmod 0755 "$ide_icon" "$test_icon" "$installer_icon"
  "$VENV_DIR/bin/flbio" test-files "$test_folder" >/dev/null
  chmod -R a+rX "$test_folder"
  if [[ -n "$owner" ]]; then
    chown "$owner":"$owner" "$desktop" 2>/dev/null || true
    chown "$owner":"$owner" "$ide_icon" "$test_icon" "$installer_icon" 2>/dev/null || true
    chown -R "$owner":"$owner" "$test_folder" 2>/dev/null || true
  fi
  mark_launcher_trusted "$home" "$owner" "$ide_icon"
  mark_launcher_trusted "$home" "$owner" "$test_icon"
  mark_launcher_trusted "$home" "$owner" "$installer_icon"
}

if [[ -n "$TARGET_USER" ]] && id "$TARGET_USER" >/dev/null 2>&1; then
  USER_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
  if [[ -n "$USER_HOME" ]]; then
    install_desktop "$USER_HOME" "$TARGET_USER"
  fi
else
  echo "No desktop user was detected. The application-menu launchers were installed system-wide."
fi

echo "PROGRESS 78 Running a real language test"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
"$VENV_DIR/bin/flbio" doctor
"$VENV_DIR/bin/flbio" quick-test "$TEST_DIR"

echo "PROGRESS 100 FigureLoom Bio desktop installation is ready"
echo "Desktop icon: Install or Update FigureLoom Bio"
echo "Desktop icon: FigureLoom Bio IDE"
echo "Desktop icon: Test FigureLoom Bio"
echo "Desktop folder: FigureLoom Bio Test Files"
