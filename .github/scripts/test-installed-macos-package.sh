#!/usr/bin/env bash
set -euo pipefail

: "${PACKAGE:?PACKAGE is required}"
: "${EXPECTED_ARCH:?EXPECTED_ARCH is required}"
: "${TEST_ROOT:?TEST_ROOT is required}"

run_checked() {
  local label="$1"
  local seconds="$2"
  shift 2
  /usr/bin/python3 - "$label" "$seconds" "$@" <<'PY'
import subprocess
import sys

label = sys.argv[1]
timeout = int(sys.argv[2])
command = sys.argv[3:]
print(f"START: {label}", flush=True)
print("COMMAND: " + " ".join(command), flush=True)
try:
    completed = subprocess.run(command, timeout=timeout, check=False)
except subprocess.TimeoutExpired:
    print(f"FAIL: {label} exceeded {timeout} seconds.", file=sys.stderr, flush=True)
    raise SystemExit(124)
if completed.returncode != 0:
    print(f"FAIL: {label} exited with {completed.returncode}.", file=sys.stderr, flush=True)
    raise SystemExit(completed.returncode)
print(f"PASS: {label}", flush=True)
PY
}

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

run_checked 'Native IDE self-test' 120 \
  env QT_QPA_PLATFORM=offscreen \
  '/Applications/FigureLoom Bio IDE.app/Contents/MacOS/FigureLoom Bio IDE' --self-test

# The installer intentionally creates the first Desktop test bundle as root so
# it can place it for the target user. Remove that old bundle with sudo first.
# The dedicated --self-test then opens the real native Test window, runs the
# real quick test without the crashing offscreen worker path, checks its files,
# and exits deterministically.
app_test_root="$HOME/Desktop/FigureLoom Bio Test Files"
sudo rm -rf "$app_test_root"
run_checked 'Native Test app deterministic automatic test' 180 \
  env QT_QPA_PLATFORM=offscreen MPLBACKEND=Agg \
  '/Applications/Test FigureLoom Bio.app/Contents/MacOS/Test FigureLoom Bio' --self-test

run_checked 'Native Updater self-test' 120 \
  env QT_QPA_PLATFORM=offscreen \
  '/Applications/Install or Update FigureLoom Bio.app/Contents/MacOS/Install or Update FigureLoom Bio' --self-test
run_checked 'Installed CLI doctor' 60 /usr/local/bin/flbio doctor

grep -q 'FIGURELOOM BIO QUICK TEST PASSED' "$app_test_root/TEST-RESULT.txt"
test -s "$app_test_root/quick-volcano.svg"
grep -q 'data-significance="higher"' "$app_test_root/quick-volcano.svg"
grep -q 'data-significance="lower"' "$app_test_root/quick-volcano.svg"

language_dir="${TEST_ROOT}-known-language"
mkdir -p "$language_dir"
cp "$app_test_root/measurements.csv" "$language_dir/measurements.csv"
printf '%s\n' \
  'Open the file measurements.csv.' \
  'Draw a vulcano chart from effect and p_value.' \
  > "$language_dir/known-language.flbio"
(
  cd "$language_dir"
  run_checked 'Known valid vulcano wording' 60 \
    /usr/local/bin/flbio run known-language.flbio
) > "$language_dir/known-language-result.txt"
test -s "$language_dir/volcano-plot.svg"
grep -q 'Volcano plot' "$language_dir/known-language-result.txt"

echo 'Installed macOS package passed every required native and language test.'
