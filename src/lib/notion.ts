import type { Stol } from "./types";

const DATABASE_ID = "405e0f646b774aab88b873281e58c4f0";

function getToken(): string {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error("NOTION_API_KEY env var is required");
  return token;
}

function computeCentury(year: number | null): string | null {
  if (!year) return null;
  const century = Math.floor(year / 100) * 100;
  return `${century}-talet`;
}

function extractFiles(files: any[]): string | null {
  if (!files || files.length === 0) return null;
  const f = files[0];
  if (f?.type === "external") return f.external?.url || null;
  if (f?.type === "file") return f.file?.url || null;
  return null;
}

/** Fix bguw URL: NMK/OK items stored under VA_3d/ should be NM_stolar/ */
function fixBguwUrl(url: string | null, objektId: string): string | null {
  if (!url) return null;
  if ((objektId.startsWith("OK-") || objektId.startsWith("NMK")) && url.includes("/VA_3d/")) {
    return url.replace("/VA_3d/", "/NM_stolar/");
  }
  return url;
}

function prop(page: any, key: string): any {
  const p = page?.properties?.[key];
  if (!p) return null;
  const t = p.type;
  if (t === "title") return p.title?.map((x: any) => x.plain_text).join("") || "";
  if (t === "rich_text") return p.rich_text?.map((x: any) => x.plain_text).join("") || "";
  if (t === "number") return p.number ?? null;
  if (t === "select") return p.select?.name || null;
  if (t === "multi_select") return p.multi_select?.map((s: any) => s.name) || [];
  if (t === "url") return p.url || null;
  if (t === "files") return extractFiles(p.files);
  if (t === "formula") {
    if (p.formula?.type === "string") return p.formula.string || "";
    if (p.formula?.type === "number") return p.formula.number;
    return null;
  }
  return null;
}

function pageToStol(page: any): Stol {
  const fraaAar = prop(page, "Frå år");
  const objektId = prop(page, "Objekt-ID") || "";
  return {
    id: page.id,
    namn: prop(page, "Namn") || "",
    objektId,
    bileteUrl: prop(page, "Bilete-URL"),
    bileteBguw: fixBguwUrl(prop(page, "Bilete-bguw"), objektId),
    datering: prop(page, "Datering") || "",
    fraaAar,
    tilAar: prop(page, "Til år"),
    hundreaar: computeCentury(fraaAar),
    nasjonalitet: prop(page, "Nasjonalitet"),
    nasjonalitetAvleidd: prop(page, "Nasjonalitet avleidd") || "",
    materialar: prop(page, "Materialar") || [],
    materialarForslag: prop(page, "Materialar forslag") || "",
    stilperiode: prop(page, "Stilperiode"),
    teknikk: prop(page, "Teknikk") || [],
    hoegde: prop(page, "Høgde (cm)"),
    breidde: prop(page, "Breidde (cm)"),
    djupn: prop(page, "Djupn (cm)"),
    setehoegde: prop(page, "Setehøgde (cm)"),
    estimertVekt: prop(page, "Estimert vekt (kg)"),
    materialkommentar: prop(page, "Materialkommentar") || "",
    produsent: prop(page, "Produsent") || "",
    produsentNormalisert: prop(page, "Produsent normalisert") || "",
    produksjonsstad: prop(page, "Produksjonsstad") || "",
    produksjonsstadNormalisert: prop(page, "Produksjonsstad normalisert") || "",
    nasjonalmuseetUrl: prop(page, "Nasjonalmuseet"),
    tredfil: prop(page, "3D-fil") || "",
    nemning: prop(page, "Nemning rå") || "",
    nemning1: prop(page, "Nemning 1") || "",
    erverving: prop(page, "Erverving") || "",
    emneord: prop(page, "Emneord") || [],
  };
}

/**
 * Fetch ALL chairs from Notion, paginating through the full database.
 * Returns newest-first, filtered to bguw-only.
 */
export async function fetchAllStolar(): Promise<Stol[]> {
  const token = getToken();
  const allPages: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion API error ${res.status}: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    allPages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  // Convert, filter to bguw-only, sort newest first
  const stolar = allPages
    .map(pageToStol)
    .filter((s) => s.bileteBguw)
    .sort((a, b) => (b.fraaAar ?? 0) - (a.fraaAar ?? 0));

  return stolar;
}
