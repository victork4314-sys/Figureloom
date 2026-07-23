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
IDE_LAUNCHER="/usr/local/bin/figureloom-bio-ide"
TEST_LAUNCHER="/usr/local/bin/figureloom-bio-test"

if [[ ! -f "$SOURCE_DIR/figureloom-bio/pyproject.toml" || ! -f "$SOURCE_DIR/ide/index.html" ]]; then
  echo "I could not find the FigureLoom source at: $SOURCE_DIR" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required but was not found." >&2
  exit 1
fi

BROWSER=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$(command -v "$candidate")"
    break
  fi
done
if [[ -z "$BROWSER" ]]; then
  echo "Chromium or Google Chrome is required for the desktop IDE window." >&2
  exit 1
fi

echo "[1/5] Installing FigureLoom Bio..."
rm -rf "$VENV_DIR"
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --quiet --upgrade pip
"$VENV_DIR/bin/python" -m pip install --quiet "$SOURCE_DIR/figureloom-bio"
ln -sfn "$VENV_DIR/bin/flbio" /usr/local/bin/flbio

echo "[2/5] Installing the local IDE..."
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
(
  cd "$SOURCE_DIR"
  tar --exclude=.git --exclude=node_modules --exclude='*.pyc' --exclude=__pycache__ -cf - .
) | tar -C "$SITE_DIR" -xf -
chmod -R a+rX "$APP_DIR"

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

echo "[3/5] Adding desktop and application-menu icons..."
mkdir -p /usr/share/applications
cat > /usr/share/applications/figureloom-bio-ide.desktop <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=FigureLoom Bio IDE
Comment=Write and run plain-English biology programs
Exec=$IDE_LAUNCHER
Icon=$SITE_DIR/favicon.ico
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
Icon=$SITE_DIR/favicon.ico
Terminal=true
Categories=Development;Science;Education;
StartupNotify=true
EOF
chmod 0755 /usr/share/applications/figureloom-bio-ide.desktop /usr/share/applications/figureloom-bio-test.desktop

install_desktop() {
  local home="$1"
  local owner="${2:-}"
  local desktop="$home/Desktop"
  mkdir -p "$desktop"
  cp /usr/share/applications/figureloom-bio-ide.desktop "$desktop/FigureLoom Bio IDE.desktop"
  cp /usr/share/applications/figureloom-bio-test.desktop "$desktop/Test FigureLoom Bio.desktop"
  chmod 0755 "$desktop/FigureLoom Bio IDE.desktop" "$desktop/Test FigureLoom Bio.desktop"
  "$VENV_DIR/bin/flbio" test-files "$desktop/FigureLoom Bio Test Files" >/dev/null
  chmod -R a+rX "$desktop/FigureLoom Bio Test Files"
  if [[ -n "$owner" ]]; then
    chown -R "$owner":"$owner" "$desktop" 2>/dev/null || true
  fi
}

if [[ -d /home/kasm-default-profile ]]; then
  install_desktop /home/kasm-default-profile
fi
if [[ -d /home/kasm-user ]]; then
  install_desktop /home/kasm-user kasm-user
fi
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != root ]]; then
  USER_HOME="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
  if [[ -n "$USER_HOME" ]]; then
    install_desktop "$USER_HOME" "$SUDO_USER"
  fi
fi

echo "[4/5] Running a real language test..."
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
"$VENV_DIR/bin/flbio" doctor
"$VENV_DIR/bin/flbio" quick-test "$TEST_DIR"

echo "[5/5] FigureLoom Bio desktop installation is ready."
echo "Desktop icon: FigureLoom Bio IDE"
echo "Desktop icon: Test FigureLoom Bio"
echo "Desktop folder: FigureLoom Bio Test Files"
