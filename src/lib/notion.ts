import type { Stol } from "./types";

const GITHUB_API_URL =
  "https://raw.githubusercontent.com/lukketsvane/stolar-db/main/STOLAR/api.json";

function computeCentury(year: number | null): string | null {
  if (!year) return null;
  const century = Math.floor(year / 100) * 100;
  return `${century}-talet`;
}

function splitCsv(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

/** Map a chair object from the GitHub api.json to our Stol interface */
function githubChairToStol(chair: any): Stol {
  const fraaAar = chair.year_from ?? null;
  const objektId = chair.id || "";
  return {
    id: objektId,
    namn: chair.name || objektId,
    objektId,
    bileteUrl: chair.source_image_url || null,
    bileteBguw: chair.bguw_url || null,
    datering: chair.dating || "",
    fraaAar,
    tilAar: chair.year_to ?? null,
    hundreaar: chair.century || computeCentury(fraaAar),
    nasjonalitet: chair.nationality || null,
    nasjonalitetAvleidd: chair.origin || "",
    materialar: splitCsv(chair.materials),
    materialarForslag: "",
    stilperiode: chair.style || null,
    teknikk: splitCsv(chair.technique),
    hoegde: chair.height_cm ?? null,
    breidde: chair.width_cm ?? null,
    djupn: chair.depth_cm ?? null,
    setehoegde: chair.seat_height_cm ?? null,
    estimertVekt: chair.weight_kg ?? null,
    materialkommentar: chair.materials_desc || "",
    produsent: chair.designer || "",
    produsentNormalisert: "",
    produksjonsstad: chair.origin || "",
    produksjonsstadNormalisert: "",
    nasjonalmuseetUrl: chair.museum_url || null,
    tredfil: chair.glb_url || "",
    nemning: "",
    nemning1: chair.type || "",
    erverving: chair.acquisition || "",
    emneord: splitCsv(chair.keywords),
  };
}

/**
 * Fetch ALL chairs from the GitHub-mirrored api.json.
 * This is faster than Notion pagination (~1 request vs ~20+).
 * The GitHub data syncs from Notion every 6 hours.
 */
export async function fetchAllStolar(): Promise<Stol[]> {
  const res = await fetch(GITHUB_API_URL, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`GitHub API fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const chairs: any[] = data.chairs || [];

  const stolar = chairs
    .map(githubChairToStol)
    .filter((s) => s.objektId)
    .sort((a, b) => (b.fraaAar ?? 0) - (a.fraaAar ?? 0));

  return stolar;
}
