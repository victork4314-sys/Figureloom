#!/usr/bin/env bash
set -euo pipefail

BASE_IMAGE="${1:-${FIGURELOOM_BASE_IMAGE:-kasmweb/ubuntu-noble-desktop:figureloom-linux-public-boot-fixed}}"
OUTPUT_IMAGE="${2:-${FIGURELOOM_OUTPUT_IMAGE:-kasmweb/ubuntu-noble-desktop:figureloom-linux-public-flbio}}"
REF="${FIGURELOOM_REF:-main}"
REPOSITORY="${FIGURELOOM_REPOSITORY:-https://github.com/victork4314-sys/Figureloom.git}"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker was not found on this server." >&2
  exit 1
fi

if ! docker image inspect "$BASE_IMAGE" >/dev/null 2>&1; then
  echo "The existing Kasm image was not found:" >&2
  echo "  $BASE_IMAGE" >&2
  exit 1
fi

cat > "$BUILD_DIR/Dockerfile" <<'EOF'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
ARG FIGURELOOM_REF
ARG FIGURELOOM_REPOSITORY
RUN set -eux; \
    work="$(mktemp -d)"; \
    git clone --depth 1 --branch "$FIGURELOOM_REF" "$FIGURELOOM_REPOSITORY" "$work/Figureloom"; \
    FIGURELOOM_SOURCE_DIR="$work/Figureloom" bash "$work/Figureloom/figureloom-bio/linux/install-workspace.sh"; \
    rm -rf "$work"
USER root
EOF

echo "[1/3] Building the new FigureLoom Linux image..."
docker build \
  --build-arg "BASE_IMAGE=$BASE_IMAGE" \
  --build-arg "FIGURELOOM_REF=$REF" \
  --build-arg "FIGURELOOM_REPOSITORY=$REPOSITORY" \
  --tag "$OUTPUT_IMAGE" \
  "$BUILD_DIR"

echo "[2/3] Testing the finished image..."
docker run --rm \
  --entrypoint /bin/bash \
  "$OUTPUT_IMAGE" \
  -lc 'flbio doctor && test -x /usr/local/bin/figureloom-bio-ide && test -f "/home/kasm-default-profile/Desktop/FigureLoom Bio IDE.desktop" && test -f "/home/kasm-default-profile/Desktop/Test FigureLoom Bio.desktop" && test -f "/home/kasm-default-profile/Desktop/FigureLoom Bio Test Files/quick-test.flbio" && flbio quick-test /tmp/figureloom-image-test'

echo "[3/3] The Kasm image is ready."
echo
printf 'Use this Docker Image in the FigureLoom Linux workspace:\n\n  %s\n\n' "$OUTPUT_IMAGE"
echo "No running Kasm session was needed."
