import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// ISR: built at deploy time (no timeout limit), then revalidates in background every 60s.
// New Notion changes appear within 60 seconds without a redeploy.
export const revalidate = 60;
export const maxDuration = 60;

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
