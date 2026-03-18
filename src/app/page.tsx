import Katalog from "@/components/Katalog";
import { fetchAllStolar } from "@/lib/notion";

// ISR: revalidate every 60 seconds — picks up Notion changes automatically
export const revalidate = 60;

export default async function Home() {
  const stolar = await fetchAllStolar();
  return <Katalog stolar={stolar} />;
}
