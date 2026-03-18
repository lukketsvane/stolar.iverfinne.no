import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// Dynamic — never prerender at build time, always fetch fresh from Notion at runtime.
// Cached for 60s via ISR so subsequent requests within that window are instant.
export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
