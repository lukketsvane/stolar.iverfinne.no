import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// ISR: revalidate every 5 min (GitHub data syncs every 6 h).
export const revalidate = 300;

// Force dynamic rendering — the data comes from an external API
// and can't be fetched at build time in all environments.
export const dynamic = "force-dynamic";

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
