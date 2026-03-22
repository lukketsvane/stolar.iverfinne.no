#!/usr/bin/env npx tsx
/**
 * Generate thumbnails for all chairs in stolar-db.
 *
 * Downloads source images, resizes to 128px WebP thumbnails (~3-8 KB each),
 * and writes them to an output directory for uploading to the stolar-db repo.
 *
 * Usage:
 *   npx tsx scripts/generate-thumbnails.ts [--output ./thumbnails]
 *
 * The output directory will contain:
 *   - {chairId}.webp files (128px wide thumbnails)
 *   - manifest.json (tracks source URLs to skip unchanged images on re-runs)
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const API_URL =
  "https://raw.githubusercontent.com/lukketsvane/stolar-db/main/STOLAR/api.json";

const THUMB_WIDTH = 128;
const WEBP_QUALITY = 60;
const CONCURRENCY = 10;
const MAX_RETRIES = 3;

interface ManifestEntry {
  sourceUrl: string;
  ok: boolean;
}
type Manifest = Record<string, ManifestEntry>;

function getOutputDir(): string {
  const idx = process.argv.indexOf("--output");
  return idx !== -1 && process.argv[idx + 1]
    ? path.resolve(process.argv[idx + 1])
    : path.resolve(process.cwd(), "thumbnails-output");
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<Buffer> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "stolar-thumbnail-generator/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error("unreachable");
}

async function generateThumbnail(
  imageBuffer: Buffer
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** Simple concurrency limiter */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const outputDir = getOutputDir();
  fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, "manifest.json");
  let manifest: Manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  }

  console.log("Fetching api.json...");
  const res = await fetch(API_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to fetch api.json: ${res.status}`);
  const data = await res.json();
  const chairs: any[] = data.chairs || [];
  console.log(`Found ${chairs.length} chairs`);

  interface ChairWork {
    id: string;
    sourceUrl: string;
  }

  const work: ChairWork[] = [];
  let skipped = 0;

  for (const chair of chairs) {
    const id = chair.id;
    if (!id) continue;

    const sourceUrl = chair.bguw_url || chair.source_image_url;
    if (!sourceUrl) continue;

    // Skip if already generated with same source URL
    const existing = manifest[id];
    if (
      existing?.ok &&
      existing.sourceUrl === sourceUrl &&
      fs.existsSync(path.join(outputDir, `${id}.webp`))
    ) {
      skipped++;
      continue;
    }

    work.push({ id, sourceUrl });
  }

  console.log(
    `Processing ${work.length} thumbnails (${skipped} already up-to-date)`
  );

  let success = 0;
  let failed = 0;

  await mapWithLimit(work, CONCURRENCY, async (item, i) => {
    try {
      const imageData = await fetchWithRetry(item.sourceUrl);
      const thumb = await generateThumbnail(imageData);
      const outPath = path.join(outputDir, `${item.id}.webp`);
      fs.writeFileSync(outPath, thumb);

      manifest[item.id] = { sourceUrl: item.sourceUrl, ok: true };
      success++;

      if ((i + 1) % 50 === 0 || i === work.length - 1) {
        console.log(
          `  Progress: ${i + 1}/${work.length} (${success} ok, ${failed} failed)`
        );
        // Periodic manifest save
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
    } catch (err: any) {
      manifest[item.id] = { sourceUrl: item.sourceUrl, ok: false };
      failed++;
      console.error(`  Failed: ${item.id} - ${err.message}`);
    }
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\nDone!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped (unchanged): ${skipped}`);
  console.log(`  Output: ${outputDir}`);
  console.log(
    `\nNext step: copy contents of ${outputDir} to stolar-db repo at STOLAR/thumbnails/`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
