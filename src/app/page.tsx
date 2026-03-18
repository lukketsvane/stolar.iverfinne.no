import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// ISR: serve cached page, revalidate in the background every 60 s.
// Data stays fresh without redeploying.
export const revalidate = 60;

// Notion pagination fetches ~2 300 items (≈20 s). Allow up to 60 s.
export const maxDuration = 60;

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
