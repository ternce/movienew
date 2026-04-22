#!/bin/bash
# Download free stock video/image files for E2E testing.
# These are royalty-free assets used only for automated testing.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Downloading E2E test assets ==="

# Sample 720p MP4 video (~1.5MB) from sample-videos.com
if [ ! -f "sample-720p.mp4" ]; then
  echo "Downloading sample-720p.mp4..."
  curl -L -o sample-720p.mp4 \
    "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4" \
    --max-time 60 --retry 3 2>/dev/null

  if [ ! -s "sample-720p.mp4" ]; then
    echo "Primary source failed, trying fallback..."
    curl -L -o sample-720p.mp4 \
      "https://www.w3schools.com/html/mov_bbb.mp4" \
      --max-time 60 --retry 3 2>/dev/null
  fi

  if [ -s "sample-720p.mp4" ]; then
    echo "  OK: sample-720p.mp4 ($(du -h sample-720p.mp4 | cut -f1))"
  else
    echo "  WARN: Failed to download sample-720p.mp4"
    rm -f sample-720p.mp4
  fi
else
  echo "  SKIP: sample-720p.mp4 already exists"
fi

# Sample thumbnail image (400x225)
if [ ! -f "sample-thumbnail.jpg" ]; then
  echo "Downloading sample-thumbnail.jpg..."
  curl -L -o sample-thumbnail.jpg \
    "https://placehold.co/400x225/1a1a2e/c94bff.jpg?text=E2E+Test" \
    --max-time 30 --retry 3 2>/dev/null

  if [ -s "sample-thumbnail.jpg" ]; then
    echo "  OK: sample-thumbnail.jpg ($(du -h sample-thumbnail.jpg | cut -f1))"
  else
    echo "  WARN: Failed to download sample-thumbnail.jpg"
    rm -f sample-thumbnail.jpg
  fi
else
  echo "  SKIP: sample-thumbnail.jpg already exists"
fi

echo ""
echo "=== Asset download complete ==="
ls -la *.mp4 *.jpg 2>/dev/null || echo "No assets found."
