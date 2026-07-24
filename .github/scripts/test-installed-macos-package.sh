#!/usr/bin/env bash
set -euo pipefail

: "${PACKAGE:?PACKAGE is required}"
: "${EXPECTED_ARCH:?EXPECTED_ARCH is required}"
: "${TEST_ROOT:?TEST_ROOT is required}"

printf '%s\n' "$USER" | sudo tee /var/tmp/figureloom-bio-target-user >/dev/null
sudo installer -verboseR -pkg "$PACKAGE" -target /

test -x /usr/local/bin/flbio
for app in \
  '/Applications/FigureLoom Bio IDE.app' \
  '/Applications/Test FigureLoom Bio.app' \
  '/Applications/Install or Update FigureLoom Bio.app'; do
  test -d "$app"
done

file '/Applications/FigureLoom Bio IDE.app/Contents/MacOS/FigureLoom Bio IDE' | grep -q "$EXPECTED_ARCH"
if find '/Applications/FigureLoom Bio IDE.app' -type f \( -iname '*.html' -o -iname '*.htm' -o -iname '*.js' -o -iname '*.mjs' \) -print -quit | grep -q .; then
  echo 'The installed native IDE contains forbidden web files.' >&2
  exit 1
fi

QT_QPA_PLATFORM=offscreen '/Applications/FigureLoom Bio IDE.app/Contents/MacOS/FigureLoom Bio IDE' --self-test
QT_QPA_PLATFORM=offscreen '/Applications/Test FigureLoom Bio.app/Contents/MacOS/Test FigureLoom Bio' --self-test
QT_QPA_PLATFORM=offscreen '/Applications/Install or Update FigureLoom Bio.app/Contents/MacOS/Install or Update FigureLoom Bio' --self-test
/usr/local/bin/flbio doctor
/usr/local/bin/flbio quick-test "$TEST_ROOT"
grep -q 'FIGURELOOM BIO QUICK TEST PASSED' "$TEST_ROOT/TEST-RESULT.txt"
test -s "$TEST_ROOT/quick-volcano.svg"
grep -q 'data-significance="higher"' "$TEST_ROOT/quick-volcano.svg"
grep -q 'data-significance="lower"' "$TEST_ROOT/quick-volcano.svg"

language_dir="${TEST_ROOT}-known-language"
mkdir -p "$language_dir"
cp "$HOME/Desktop/FigureLoom Bio Test Files/measurements.csv" "$language_dir/measurements.csv"
printf '%s\n' \
  'Open the file measurements.csv.' \
  'Draw a vulcano chart from effect and p_value.' \
  > "$language_dir/known-language.flbio"
(cd "$language_dir" && /usr/local/bin/flbio run known-language.flbio > known-language-result.txt)
test -s "$language_dir/volcano-plot.svg"
grep -q 'Volcano plot' "$language_dir/known-language-result.txt"

echo 'Installed macOS package passed every required native and language test.'
