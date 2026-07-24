#!/usr/bin/env bash
set -euo pipefail

: "${FIGURELOOM_MAC_ARCH_LABEL:?FIGURELOOM_MAC_ARCH_LABEL is required}"
: "${FIGURELOOM_MAC_PACKAGE_NAME:?FIGURELOOM_MAC_PACKAGE_NAME is required}"
: "${FIGURELOOM_MAC_TEST_FOLDER:?FIGURELOOM_MAC_TEST_FOLDER is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

trace="$RUNNER_TEMP/${FIGURELOOM_MAC_ARCH_LABEL}-install-test.log"
system_trace="$RUNNER_TEMP/${FIGURELOOM_MAC_ARCH_LABEL}-system-installer.log"
exec > >(tee "$trace") 2>&1
set -x

bash figureloom-bio/macos/build-installer.sh dist
pkg="dist/$FIGURELOOM_MAC_PACKAGE_NAME"
test -f "$pkg"
test "$(head -c 4 "$pkg")" = 'xar!'

printf '%s\n' "$USER" | sudo tee /var/tmp/figureloom-bio-target-user >/dev/null
set +e
sudo installer -verboseR -pkg "$pkg" -target /
install_status=$?
set -e
sudo tail -n 400 /var/log/install.log > "$system_trace" 2>&1 || true
test "$install_status" -eq 0

test -x /usr/local/bin/flbio
test -d '/Applications/FigureLoom Bio IDE.app'
test -d '/Applications/Test FigureLoom Bio.app'
test -d '/Applications/Install or Update FigureLoom Bio.app'
if find '/Applications/FigureLoom Bio IDE.app' -type f \( -iname '*.html' -o -iname '*.htm' -o -iname '*.js' -o -iname '*.mjs' \) -print -quit | grep -q .; then
  echo 'Installed macOS IDE contains forbidden web files.' >&2
  exit 1
fi

QT_QPA_PLATFORM=offscreen '/Applications/FigureLoom Bio IDE.app/Contents/MacOS/FigureLoom Bio IDE' --self-test
QT_QPA_PLATFORM=offscreen '/Applications/Test FigureLoom Bio.app/Contents/MacOS/Test FigureLoom Bio' --self-test
QT_QPA_PLATFORM=offscreen '/Applications/Install or Update FigureLoom Bio.app/Contents/MacOS/Install or Update FigureLoom Bio' --self-test
/usr/local/bin/flbio doctor
/usr/local/bin/flbio quick-test "$RUNNER_TEMP/$FIGURELOOM_MAC_TEST_FOLDER"
test -f "$HOME/Desktop/FigureLoom Bio Test Files/quick-test.flbio"
shasum -a 256 "$pkg"

tag='figureloom-bio-macos-installer'
target='e23b6c162ca6b09fb2a3fbedc1b0f4d95635bd05'
title='FigureLoom Bio macOS Installers'
notes='Choose Apple Silicon for M-series Macs or Intel for Intel Macs. These native desktop packages passed installation, IDE startup and paint, syntax coloring, Test, Updater, CLI doctor, Desktop test files, language quick tests, and the real volcano-plot test. They contain no bundled HTML or browser interface.'

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git tag --force "$tag" "$target"
git push origin "refs/tags/$tag" --force

if gh release view "$tag" >/dev/null 2>&1; then
  gh release upload "$tag" "$pkg" --clobber
  gh release edit "$tag" --latest --title "$title" --notes "$notes"
else
  gh release create "$tag" "$pkg" --target "$target" --latest --title "$title" --notes "$notes"
fi

remote_sha="$(git ls-remote --tags origin "refs/tags/$tag" | awk '{print $1}')"
test "$remote_sha" = "$target"
assets="$(gh release view "$tag" --json assets --jq '.assets[].name')"
grep -Fx "$FIGURELOOM_MAC_PACKAGE_NAME" <<<"$assets"
echo "Published and verified $FIGURELOOM_MAC_PACKAGE_NAME from $RUNNER_NAME."
