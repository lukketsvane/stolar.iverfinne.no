import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Allow enough time for Notion re-fetch during revalidation
export const maxDuration = 60;

/**
 * POST /api/revalidate?secret=YOUR_SECRET
 * Manual / webhook trigger – call from Notion automation, Zapier, etc.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}

/**
 * GET /api/revalidate
 * Called by Vercel Cron. Secured via CRON_SECRET header (set automatically
 * by Vercel when the cron job is configured in vercel.json).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Accept either the Vercel-injected CRON_SECRET or the manual REVALIDATE_SECRET
  const secretParam = request.nextUrl.searchParams.get("secret");
  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (secretParam && secretParam === process.env.REVALIDATE_SECRET);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
