import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const ALLOWED_HOSTS = new Set([
  "raw.githubusercontent.com",
  "dms01.dimu.org",
  "ms01.nasjonalmuseet.no",
  "framemark.vam.ac.uk",
  "images.metmuseum.org",
  "images.collection.cooperhewitt.org",
]);

const THUMB_WIDTH = 128;
const WEBP_QUALITY = 60;
const FETCH_TIMEOUT = 10_000;

// 1x1 transparent WebP fallback
const EMPTY_WEBP = new Uint8Array(
  Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64")
);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse(EMPTY_WEBP, {
      status: 400,
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=60" },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse(EMPTY_WEBP, {
      status: 400,
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=60" },
    });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new NextResponse(EMPTY_WEBP, {
      status: 403,
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=60" },
    });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "stolar-thumb/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(buffer)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    return new NextResponse(new Uint8Array(webp), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(EMPTY_WEBP, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  }
}
