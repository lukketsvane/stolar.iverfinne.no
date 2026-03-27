"use client";

import { type Stol, MATERIAL_GROUPS } from "@/lib/types";
import { useMemo, useState } from "react";

interface FilterBarProps {
  stolar: Stol[];
  activeFilter: { category: string; value: string } | null;
  onFilter: (category: string, value: string) => void;
  onClear: () => void;
}

type FilterCategory = "hundreaar" | "nasjonalitet" | "materialar" | "stilperiode" | "teknikk" | "produsent";

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  hundreaar: "Hundreår",
  nasjonalitet: "Land",
  materialar: "Materialar",
  stilperiode: "Stilperiode",
  teknikk: "Teknikk",
  produsent: "Produsent",
};

const HUNDREAAR_ORDER = [
  "1200-talet", "1300-talet", "1400-talet", "1500-talet",
  "1600-talet", "1700-talet", "1800-talet", "1900-talet", "2000-talet",
];

export default function FilterBar({ stolar, activeFilter, onFilter, onClear }: FilterBarProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory | null>(null);
  const [showAll, setShowAll] = useState(false);

  const counts = useMemo(() => {
    const h: Record<string, number> = {};
    const n: Record<string, number> = {};
    const m: Record<string, number> = {};
    const s: Record<string, number> = {};
    const t: Record<string, number> = {};
    const p: Record<string, number> = {};

    for (const stol of stolar) {
      if (stol.hundreaar) h[stol.hundreaar] = (h[stol.hundreaar] || 0) + 1;
      const nat = stol.nasjonalitet || stol.nasjonalitetAvleidd;
      if (nat) n[nat] = (n[nat] || 0) + 1;
      for (const mat of stol.materialar) m[mat] = (m[mat] || 0) + 1;
      if (stol.stilperiode) s[stol.stilperiode] = (s[stol.stilperiode] || 0) + 1;
      for (const tek of stol.teknikk) t[tek] = (t[tek] || 0) + 1;
      const prod = stol.produsent || stol.produsentNormalisert;
      if (prod && prod !== "Ikkje registrert") p[prod] = (p[prod] || 0) + 1;
    }

    return { hundreaar: h, nasjonalitet: n, materialar: m, stilperiode: s, teknikk: t, produsent: p };
  }, [stolar]);

  const sortedValues = useMemo(() => ({
    hundreaar: HUNDREAAR_ORDER.filter((k) => counts.hundreaar[k]),
    nasjonalitet: Object.keys(counts.nasjonalitet).sort((a, b) => counts.nasjonalitet[b] - counts.nasjonalitet[a]),
    materialar: Object.keys(counts.materialar).sort((a, b) => counts.materialar[b] - counts.materialar[a]),
    stilperiode: Object.keys(counts.stilperiode).sort((a, b) => counts.stilperiode[b] - counts.stilperiode[a]),
    teknikk: Object.keys(counts.teknikk).sort((a, b) => counts.teknikk[b] - counts.teknikk[a]),
    produsent: Object.keys(counts.produsent).sort((a, b) => counts.produsent[b] - counts.produsent[a]),
  }), [counts]);

  const materialGroups = useMemo(() => {
    const grouped: Record<string, { name: string; count: number }[]> = {};
    const allFlat = Object.values(MATERIAL_GROUPS).flat();
    for (const [group, materials] of Object.entries(MATERIAL_GROUPS)) {
      const items = materials.filter((m) => counts.materialar[m]).map((m) => ({ name: m, count: counts.materialar[m] })).sort((a, b) => b.count - a.count);
      if (items.length > 0) grouped[group] = items;
    }
    const ungrouped = Object.keys(counts.materialar).filter((m) => !allFlat.includes(m)).map((m) => ({ name: m, count: counts.materialar[m] })).sort((a, b) => b.count - a.count);
    if (ungrouped.length > 0) grouped["Anna"] = ungrouped;
    return grouped;
  }, [counts]);

  const toggleCategory = (cat: FilterCategory) => {
    setActiveCategory(activeCategory === cat ? null : cat);
    setShowAll(false);
  };

  const handleSelect = (category: string, value: string) => {
    if (activeFilter?.category === category && activeFilter?.value === value) {
      onClear();
    } else {
      onFilter(category, value);
    }
  };

  const renderValueList = (cat: FilterCategory) => {
    const values = sortedValues[cat];
    const visible = showAll ? values : values.slice(0, 20);
    return (
      <>
        {visible.map((value, i) => (
          <span key={value}>
            {i > 0 && <span className="text-neutral-300 mx-1">·</span>}
            <button
              onClick={() => handleSelect(cat, value)}
              className={`underline underline-offset-2 transition-colors ${
                activeFilter?.category === cat && activeFilter?.value === value
                  ? "text-white decoration-white font-medium"
                  : "text-neutral-500 decoration-neutral-600 hover:text-white hover:decoration-white"
              }`}
            >
              {value} <span className="text-neutral-400 no-underline">({counts[cat][value]})</span>
            </button>
          </span>
        ))}
        {!showAll && values.length > 20 && (
          <button onClick={() => setShowAll(true)} className="ml-2 text-neutral-400 underline underline-offset-2 decoration-neutral-600 hover:text-neutral-900 text-xs">
            +{values.length - 20} meir
          </button>
        )}
      </>
    );
  };

  return (
    <nav className="border-b border-neutral-800 pb-4 mb-6">
      <div className="flex flex-wrap items-center gap-x-1 text-sm font-normal">
        {activeFilter && (
          <button onClick={onClear} className="mr-2 text-neutral-400 hover:text-neutral-900 underline underline-offset-2 decoration-neutral-600 hover:decoration-neutral-900 transition-colors">
            Vis alle
          </button>
        )}
        {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat, i) => (
          <span key={cat} className="flex items-center">
            {(i > 0 || activeFilter) && <span className="text-neutral-300 mx-1.5">·</span>}
            <button
              onClick={() => toggleCategory(cat)}
              className={`underline underline-offset-2 transition-colors ${
                activeCategory === cat || activeFilter?.category === cat
                  ? "text-white decoration-white"
                  : "text-neutral-500 decoration-neutral-600 hover:text-white hover:decoration-white"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          </span>
        ))}
      </div>

      {activeCategory && (
        <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1 text-sm">
          {activeCategory === "materialar" ? (
            <div className="w-full">
              {Object.entries(materialGroups).map(([group, items]) => {
                const visible = showAll ? items : items.slice(0, 6);
                return (
                  <div key={group} className="mb-2">
                    <span className="text-neutral-400 text-xs uppercase tracking-wider mr-2">{group}</span>
                    {visible.map((item, i) => (
                      <span key={item.name}>
                        {i > 0 && <span className="text-neutral-300 mx-1">·</span>}
                        <button
                          onClick={() => handleSelect("materialar", item.name)}
                          className={`underline underline-offset-2 transition-colors ${
                            activeFilter?.category === "materialar" && activeFilter?.value === item.name
                              ? "text-white decoration-white font-medium"
                              : "text-neutral-500 decoration-neutral-600 hover:text-white hover:decoration-white"
                          }`}
                        >
                          {item.name} <span className="text-neutral-400 no-underline">({item.count})</span>
                        </button>
                      </span>
                    ))}
                    {!showAll && items.length > 6 && <span className="text-neutral-300 mx-1">…</span>}
                  </div>
                );
              })}
              {!showAll && (
                <button onClick={() => setShowAll(true)} className="text-neutral-400 underline underline-offset-2 decoration-neutral-600 hover:text-neutral-900 transition-colors text-xs">
                  Vis alle materialar
                </button>
              )}
            </div>
          ) : (
            renderValueList(activeCategory)
          )}
        </div>
      )}
    </nav>
  );
}
