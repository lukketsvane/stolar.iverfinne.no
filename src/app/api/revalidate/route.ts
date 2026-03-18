import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// POST /api/revalidate?secret=YOUR_SECRET
// Triggers a rebuild of the home page with fresh Notion data.
// Call this from a Notion webhook, cron job, or manually.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
