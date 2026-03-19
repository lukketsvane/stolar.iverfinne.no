"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { type Stol } from "@/lib/types";
import { buildIndex, search } from "@/lib/search";
import FilterBar from "./FilterBar";
import StolGrid from "./StolGrid";
import DetailPanel from "./DetailPanel";
import SizeToggle from "./SizeToggle";
import Sparkline from "./Sparkline";
import SearchBar from "./SearchBar";

const HUNDREAAR_ORDER = [
  "1200-talet", "1300-talet", "1400-talet", "1500-talet",
  "1600-talet", "1700-talet", "1800-talet", "1900-talet", "2000-talet",
];

interface KatalogProps {
  stolar: Stol[];
}

export interface ActiveFilter {
  category: string;
  value: string;
}

function filterLabel(f: ActiveFilter): string {
  const labels: Record<string, string> = {
    hundreaar: "Hundreår", nasjonalitet: "Land", materialar: "Material",
    stilperiode: "Stil", teknikk: "Teknikk", produsent: "Produsent",
    nemning: "Type", produksjonsstad: "Stad",
  };
  return labels[f.category] || f.category;
}

export default function Katalog({ stolar }: KatalogProps) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStol, setSelectedStol] = useState<Stol | null>(null);
  const [gridSize, setGridSize] = useState(120);

  const searchIndex = useMemo(() => buildIndex(stolar), [stolar]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedStol(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const categoryFiltered = useMemo(() => {
    if (!activeFilter) return stolar;
    const { category, value } = activeFilter;
    return stolar.filter((s) => {
      switch (category) {
        case "hundreaar": return s.hundreaar === value;
        case "nasjonalitet": return (s.nasjonalitet || s.nasjonalitetAvleidd) === value;
        case "materialar": return s.materialar.includes(value);
        case "stilperiode": return s.stilperiode === value;
        case "teknikk": return s.teknikk.includes(value);
        case "produsent": return (s.produsent || s.produsentNormalisert) === value;
        case "nemning": return (s.nemning1 || s.nemning) === value;
        case "produksjonsstad": return (s.produksjonsstad || s.produksjonsstadNormalisert) === value;
        default: return true;
      }
    });
  }, [stolar, activeFilter]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categoryFiltered;
    return search(searchQuery, categoryFiltered, searchIndex).map((r) => r.stol);
  }, [categoryFiltered, searchQuery, searchIndex]);

  const centuryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of HUNDREAAR_ORDER) counts[h] = 0;
    for (const s of stolar) {
      if (s.hundreaar && counts[s.hundreaar] !== undefined) counts[s.hundreaar]++;
    }
    return HUNDREAAR_ORDER.map((h) => ({ label: h, count: counts[h] })).filter((d) => d.count > 0);
  }, [stolar]);

  const handleFilter = useCallback((category: string, value: string) => {
    setActiveFilter({ category, value });
    setSelectedStol(null);
  }, []);

  const handleClear = useCallback(() => { setActiveFilter(null); }, []);
  const handleSearchClear = useCallback(() => { setSearchQuery(""); }, []);
  const handleClearAll = useCallback(() => { setActiveFilter(null); setSearchQuery(""); }, []);

  const hasAnyFilter = activeFilter !== null || searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-3 md:px-6 pt-4 pb-1">
        <div className="max-w-[1800px] mx-auto">
          <div className="mb-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-neutral-900 leading-[0.85] tracking-tighter">
              Norske<br />stolar.
            </h1>
            <div className="mt-2 flex items-end gap-4">
              <p className="text-base md:text-xl text-neutral-500">
                <span className="text-neutral-900 font-black tabular-nums text-xl md:text-2xl">{filtered.length}</span>{" "}
                {hasAnyFilter ? (<>stolar <span className="text-neutral-400">av {stolar.length}</span></>) : "stolar dokumentert"}
              </p>
              <div className="hidden md:block w-48">
                <Sparkline data={centuryData} activeValue={activeFilter?.category === "hundreaar" ? activeFilter.value : null} />
              </div>
            </div>
          </div>

          {/* Active filter chip */}
          {activeFilter && (
            <div className="mb-3">
              <button onClick={handleClear} className="inline-flex items-center gap-1.5 text-sm bg-neutral-900 text-white pl-3 pr-2 py-1 rounded-full">
                <span className="text-neutral-400 text-xs">{filterLabel(activeFilter)}</span>
                <span>{activeFilter.value}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="ml-0.5 opacity-50">
                  <line x1="4" y1="4" x2="10" y2="10" /><line x1="10" y1="4" x2="4" y2="10" />
                </svg>
              </button>
            </div>
          )}

          <div className="mb-4 max-w-xl">
            <SearchBar query={searchQuery} resultCount={searchQuery.trim() ? filtered.length : null} totalCount={categoryFiltered.length} onQueryChange={setSearchQuery} onClear={handleSearchClear} />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <FilterBar stolar={stolar} activeFilter={activeFilter} onFilter={handleFilter} onClear={handleClear} />
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <SizeToggle size={gridSize} onSizeChange={setGridSize} />
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 md:px-6 pb-12">
        <div className="max-w-[1800px] mx-auto">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <p className="text-lg">{searchQuery ? `Ingen treff for «${searchQuery}»` : "Ingen stolar funne."}</p>
              <button onClick={handleClearAll} className="mt-2 underline underline-offset-2 text-sm hover:text-neutral-900">Fjern alle filter</button>
            </div>
          ) : (
            <StolGrid stolar={filtered} size={gridSize} onSizeChange={setGridSize} onSelect={setSelectedStol} />
          )}
        </div>
      </main>

      {selectedStol && (
        <DetailPanel stol={selectedStol} stolar={filtered} onNavigate={setSelectedStol} onFilter={handleFilter} onClose={() => setSelectedStol(null)} />
      )}
    </div>
  );
}
