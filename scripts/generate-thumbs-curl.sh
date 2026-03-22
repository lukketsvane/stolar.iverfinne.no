#!/bin/bash
# Generate thumbnails using curl (for environments where Node.js fetch doesn't work)
# Downloads images with curl, processes them with sharp via Node.js

set -euo pipefail

OUTPUT_DIR="${1:-public/thumbs}"
API_JSON="/tmp/stolar-api.json"
CONCURRENCY=20
THUMB_WIDTH=128
WEBP_QUALITY=60

mkdir -p "$OUTPUT_DIR"

# Download api.json if needed
if [ ! -f "$API_JSON" ]; then
  echo "Downloading api.json..."
  curl -s 'https://raw.githubusercontent.com/lukketsvane/stolar-db/main/STOLAR/api.json' -o "$API_JSON"
fi

# Extract chair IDs and bguw_urls
echo "Extracting chair data..."
python3 -c "
import json, sys
data = json.load(open('$API_JSON'))
chairs = data.get('chairs', [])
for c in chairs:
    cid = c.get('id','')
    url = c.get('bguw_url') or c.get('source_image_url') or ''
    if cid and url:
        print(f'{cid}\t{url}')
" > /tmp/stolar-urls.tsv

TOTAL=$(wc -l < /tmp/stolar-urls.tsv)
echo "Found $TOTAL chairs with images"

# Create temp dir for raw downloads
RAW_DIR="/tmp/stolar-raw"
mkdir -p "$RAW_DIR"

# Download and process function
process_chair() {
  local id="$1"
  local url="$2"
  local outfile="$OUTPUT_DIR/$id.webp"

  # Skip if already exists
  if [ -f "$outfile" ]; then
    return 0
  fi

  local rawfile="$RAW_DIR/$id.raw"

  # Download with curl
  if ! curl -s --max-time 15 -o "$rawfile" "$url" 2>/dev/null; then
    rm -f "$rawfile"
    return 1
  fi

  # Check file is valid (not empty, not HTML error page)
  local size=$(stat -c%s "$rawfile" 2>/dev/null || echo 0)
  if [ "$size" -lt 1000 ]; then
    rm -f "$rawfile"
    return 1
  fi

  # Convert with sharp via node
  if ! node -e "
    const sharp = require('sharp');
    const fs = require('fs');
    sharp('$rawfile')
      .resize({ width: $THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: $WEBP_QUALITY })
      .toFile('$outfile')
      .then(() => { fs.unlinkSync('$rawfile'); process.exit(0); })
      .catch(() => { try { fs.unlinkSync('$rawfile'); } catch(e) {} process.exit(1); });
  " 2>/dev/null; then
    rm -f "$rawfile" "$outfile"
    return 1
  fi

  return 0
}

export -f process_chair
export OUTPUT_DIR RAW_DIR THUMB_WIDTH WEBP_QUALITY

# Process in parallel using xargs
SUCCESS=0
FAILED=0
COUNT=0

while IFS=$'\t' read -r id url; do
  COUNT=$((COUNT + 1))
  outfile="$OUTPUT_DIR/$id.webp"

  if [ -f "$outfile" ]; then
    SUCCESS=$((SUCCESS + 1))
    if [ $((COUNT % 100)) -eq 0 ]; then
      echo "  Progress: $COUNT/$TOTAL ($SUCCESS ok, $FAILED failed, skipped existing)"
    fi
    continue
  fi

  rawfile="$RAW_DIR/$id.raw"

  # Download
  if curl -s --max-time 15 -o "$rawfile" "$url" 2>/dev/null; then
    size=$(stat -c%s "$rawfile" 2>/dev/null || echo 0)
    if [ "$size" -gt 1000 ]; then
      # Resize with sharp
      if node -e "
        const sharp = require('sharp');
        const fs = require('fs');
        sharp('$rawfile')
          .resize({ width: $THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: $WEBP_QUALITY })
          .toFile('$outfile')
          .then(() => { fs.unlinkSync('$rawfile'); })
          .catch((e) => { console.error(e.message); try { fs.unlinkSync('$rawfile'); } catch(x) {} process.exit(1); });
      " 2>/dev/null; then
        SUCCESS=$((SUCCESS + 1))
      else
        FAILED=$((FAILED + 1))
        rm -f "$rawfile" "$outfile"
      fi
    else
      FAILED=$((FAILED + 1))
      rm -f "$rawfile"
    fi
  else
    FAILED=$((FAILED + 1))
    rm -f "$rawfile"
  fi

  if [ $((COUNT % 50)) -eq 0 ]; then
    echo "  Progress: $COUNT/$TOTAL ($SUCCESS ok, $FAILED failed)"
  fi
done < /tmp/stolar-urls.tsv

echo ""
echo "Done!"
echo "  Success: $SUCCESS"
echo "  Failed: $FAILED"
echo "  Total processed: $COUNT"
echo "  Output: $OUTPUT_DIR"
