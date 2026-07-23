#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${FIGURELOOM_SOURCE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
OUTPUT_DIR="${1:-$ROOT_DIR/dist}"
ARCH_LABEL="${FIGURELOOM_MAC_ARCH_LABEL:-$(uname -m)}"
BUILD_ROOT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/figureloom-bio-macos-${ARCH_LABEL}"
APP_BUILD="$BUILD_ROOT/apps"
WORK_ROOT="$BUILD_ROOT/work"
SPEC_ROOT="$BUILD_ROOT/spec"
PKG_ROOT="$BUILD_ROOT/package-root"
SCRIPTS_ROOT="$BUILD_ROOT/package-scripts"
ICON_PNG="$ROOT_DIR/figureloom-bio/linux/assets/figureloom-bio.png"
ICONSET="$BUILD_ROOT/figureloom-bio.iconset"
ICON_ICNS="$BUILD_ROOT/figureloom-bio.icns"
VERSION="${FIGURELOOM_VERSION:-$(python3 - "$ROOT_DIR/figureloom-bio/pyproject.toml" <<'PY'
from pathlib import Path
import sys
import tomllib
with Path(sys.argv[1]).open('rb') as handle:
    print(tomllib.load(handle)['project']['version'])
PY
)}"

case "$ARCH_LABEL" in
  arm64|apple-silicon) FILE_ARCH="Apple-Silicon" ;;
  x86_64|intel) FILE_ARCH="Intel" ;;
  *) echo "Unsupported macOS architecture label: $ARCH_LABEL" >&2; exit 1 ;;
esac

rm -rf "$BUILD_ROOT"
mkdir -p "$APP_BUILD" "$WORK_ROOT" "$SPEC_ROOT" "$PKG_ROOT" "$SCRIPTS_ROOT" "$OUTPUT_DIR" "$ICONSET"

python3 -m pip install --disable-pip-version-check --upgrade pip
python3 -m pip install --disable-pip-version-check pyinstaller "$ROOT_DIR/figureloom-bio"

make_icon() {
  local size="$1"
  local scale="$2"
  local pixels=$((size * scale))
  local suffix=""
  if [[ "$scale" == 2 ]]; then
    suffix="@2x"
  fi
  sips -z "$pixels" "$pixels" "$ICON_PNG" --out "$ICONSET/icon_${size}x${size}${suffix}.png" >/dev/null
}
for size in 16 32 128 256 512; do
  make_icon "$size" 1
  make_icon "$size" 2
done
iconutil -c icns "$ICONSET" -o "$ICON_ICNS"

build_app() {
  local name="$1"
  local entry="$2"
  local include_ide="${3:-0}"
  local safe_name
  safe_name="$(printf '%s' "$name" | tr -cs 'A-Za-z0-9' '-')"
  local args=(
    --noconfirm
    --clean
    --onefile
    --windowed
    --name "$name"
    --icon "$ICON_ICNS"
    --paths "$ROOT_DIR/figureloom-bio"
    --collect-data figureloom_bio
    --add-data "$ICON_PNG:assets"
    --distpath "$APP_BUILD"
    --workpath "$WORK_ROOT/$safe_name"
    --specpath "$SPEC_ROOT"
  )
  if [[ "$include_ide" == 1 ]]; then
    args+=(--add-data "$ROOT_DIR/ide:ide")
  fi
  python3 -m PyInstaller "${args[@]}" "$ROOT_DIR/$entry"
  codesign --force --deep --sign - "$APP_BUILD/$name.app"
}

python3 -m PyInstaller \
  --noconfirm \
  --clean \
  --onefile \
  --console \
  --name flbio \
  --icon "$ICON_ICNS" \
  --paths "$ROOT_DIR/figureloom-bio" \
  --collect-data figureloom_bio \
  --distpath "$APP_BUILD" \
  --workpath "$WORK_ROOT/flbio" \
  --specpath "$SPEC_ROOT" \
  "$ROOT_DIR/figureloom-bio/platform/flbio_entry.py"
codesign --force --sign - "$APP_BUILD/flbio"

build_app "FigureLoom Bio IDE" "figureloom-bio/platform/ide_entry.py" 1
build_app "Test FigureLoom Bio" "figureloom-bio/platform/test_entry.py"
build_app "Install or Update FigureLoom Bio" "figureloom-bio/platform/manager_entry.py"

mkdir -p \
  "$PKG_ROOT/Applications" \
  "$PKG_ROOT/usr/local/libexec/figureloom-bio" \
  "$PKG_ROOT/usr/local/bin"
cp -R "$APP_BUILD/FigureLoom Bio IDE.app" "$PKG_ROOT/Applications/"
cp -R "$APP_BUILD/Test FigureLoom Bio.app" "$PKG_ROOT/Applications/"
cp -R "$APP_BUILD/Install or Update FigureLoom Bio.app" "$PKG_ROOT/Applications/"
install -m 0755 "$APP_BUILD/flbio" "$PKG_ROOT/usr/local/libexec/figureloom-bio/flbio"
ln -s ../libexec/figureloom-bio/flbio "$PKG_ROOT/usr/local/bin/flbio"

cp "$ROOT_DIR/figureloom-bio/macos/scripts/postinstall" "$SCRIPTS_ROOT/postinstall"
chmod 0755 "$SCRIPTS_ROOT/postinstall"

INSTALLER="$OUTPUT_DIR/FigureLoom-Bio-Installer-macOS-${FILE_ARCH}.pkg"
pkgbuild \
  --root "$PKG_ROOT" \
  --scripts "$SCRIPTS_ROOT" \
  --identifier "org.figureloom.bio" \
  --version "$VERSION" \
  --install-location / \
  "$INSTALLER"

pkgutil --check-signature "$INSTALLER" || true
pkgutil --payload-files "$INSTALLER" | grep 'Applications/FigureLoom Bio IDE.app' >/dev/null
printf '%s\n' "$INSTALLER"
