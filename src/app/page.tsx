import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// Force static generation at build time. No serverless function at runtime.
// To refresh data: push to GitHub (triggers redeploy) or use Vercel Deploy Hook.
export const dynamic = "force-static";

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
