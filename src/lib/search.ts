import type { Stol } from "./types";

// Pre-built search index: one combined searchable string per chair,
// plus individual field tokens for ranking.
export interface SearchIndex {
  /** Flat lowercase text for fast .includes() pre-filter */
  flat: string;
  /** Tokenised fields with weights for ranking */
  fields: { text: string; weight: number }[];
}

const FIELD_WEIGHTS: { key: keyof Stol | "all_materials" | "all_teknikk" | "all_emneord"; weight: number }[] = [
  { key: "namn", weight: 10 },
  { key: "produsent", weight: 8 },
  { key: "objektId", weight: 7 },
  { key: "stilperiode", weight: 6 },
  { key: "nasjonalitet", weight: 5 },
  { key: "all_materials", weight: 5 },
  { key: "all_teknikk", weight: 4 },
  { key: "materialkommentar", weight: 3 },
  { key: "datering", weight: 3 },
  { key: "produksjonsstad", weight: 3 },
  { key: "nemning", weight: 2 },
  { key: "hundreaar", weight: 2 },
  { key: "all_emneord", weight: 1 },
];

function fieldValue(stol: Stol, key: string): string {
  if (key === "all_materials") return stol.materialar.join(" ");
  if (key === "all_teknikk") return stol.teknikk.join(" ");
  if (key === "all_emneord") return stol.emneord.join(" ");
  const v = (stol as any)[key];
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return String(v);
}

/** Build search index for a list of chairs (call once) */
export function buildIndex(stolar: Stol[]): Map<string, SearchIndex> {
  const map = new Map<string, SearchIndex>();
  for (const s of stolar) {
    const fields = FIELD_WEIGHTS.map(({ key, weight }) => ({
      text: fieldValue(s, key).toLowerCase(),
      weight,
    }));
    const flat = fields.map((f) => f.text).join(" ");
    map.set(s.id, { flat, fields });
  }
  return map;
}

/** Normalise query: lowercase, collapse whitespace, strip accents */
function normalise(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Tokenise query into individual terms */
function tokenise(q: string): string[] {
  return normalise(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export interface SearchResult {
  stol: Stol;
  score: number;
  /** Which fields matched, for highlighting */
  matchedFields: string[];
}

/**
 * Search chairs. Returns results sorted by relevance score.
 * All query tokens must match (AND logic) for a chair to appear.
 * Score = sum of (field weight × match quality) across all matching fields.
 */
export function search(
  query: string,
  stolar: Stol[],
  index: Map<string, SearchIndex>,
): SearchResult[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  // Also normalise individual tokens without accents for fuzzy matching
  const tokensNorm = tokens.map((t) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  const results: SearchResult[] = [];

  for (const stol of stolar) {
    const idx = index.get(stol.id);
    if (!idx) continue;

    // Quick pre-filter: every token must appear somewhere in the flat string
    const flatNorm = idx.flat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const allMatch = tokensNorm.every((t) => flatNorm.includes(t));
    if (!allMatch) continue;

    // Score: for each token, find best-matching fields
    let totalScore = 0;
    const matchedFields = new Set<string>();

    for (let ti = 0; ti < tokens.length; ti++) {
      const token = tokensNorm[ti];
      let bestFieldScore = 0;

      for (let fi = 0; fi < idx.fields.length; fi++) {
        const field = idx.fields[fi];
        const fieldNorm = field.text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (!fieldNorm.includes(token)) continue;

        let matchQuality: number;
        if (fieldNorm === token) {
          // Exact full-field match
          matchQuality = 3;
        } else if (fieldNorm.startsWith(token) || fieldNorm.includes(" " + token)) {
          // Starts with or word-boundary match
          matchQuality = 2;
        } else {
          // Substring match
          matchQuality = 1;
        }

        const fieldScore = field.weight * matchQuality;
        if (fieldScore > bestFieldScore) {
          bestFieldScore = fieldScore;
          matchedFields.add(FIELD_WEIGHTS[fi].key);
        }
      }

      totalScore += bestFieldScore;
    }

    if (totalScore > 0) {
      results.push({ stol, score: totalScore, matchedFields: [...matchedFields] });
    }
  }

  // Sort by score descending, then by name
  results.sort((a, b) => b.score - a.score || a.stol.namn.localeCompare(b.stol.namn));

  return results;
}
