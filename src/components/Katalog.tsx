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

export default function Katalog({ stolar }: KatalogProps) {
  const [activeFilter, setActiveFilter] = useState<{
    category: string;
    value: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStol, setSelectedStol] = useState<Stol | null>(null);
  const [gridSize, setGridSize] = useState(96);

  // Build search index once
  const searchIndex = useMemo(() => buildIndex(stolar), [stolar]);

  // Close detail panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedStol(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Apply category filter first
  const categoryFiltered = useMemo(() => {
    if (!activeFilter) return stolar;
    const { category, value } = activeFilter;
    return stolar.filter((s) => {
      switch (category) {
        case "hundreaar":
          return s.hundreaar === value;
        case "nasjonalitet":
          return s.nasjonalitet === value;
        case "materialar":
          return s.materialar.includes(value);
        case "stilperiode":
          return s.stilperiode === value;
        default:
          return true;
      }
    });
  }, [stolar, activeFilter]);

  // Then apply search on top of filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categoryFiltered;
    const results = search(searchQuery, categoryFiltered, searchIndex);
    return results.map((r) => r.stol);
  }, [categoryFiltered, searchQuery, searchIndex]);

  // Century distribution for sparkline (always from full set)
  const centuryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of HUNDREAAR_ORDER) counts[h] = 0;
    for (const s of stolar) {
      if (s.hundreaar && counts[s.hundreaar] !== undefined) {
        counts[s.hundreaar]++;
      }
    }
    return HUNDREAAR_ORDER.map((h) => ({ label: h, count: counts[h] })).filter(
      (d) => d.count > 0
    );
  }, [stolar]);

  const handleFilter = useCallback((category: string, value: string) => {
    setActiveFilter({ category, value });
  }, []);

  const handleClear = useCallback(() => {
    setActiveFilter(null);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleClearAll = useCallback(() => {
    setActiveFilter(null);
    setSearchQuery("");
  }, []);

  const hasAnyFilter = activeFilter !== null || searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 md:px-8 pt-8 pb-2">
        <div className="max-w-[1800px] mx-auto">
          {/* Counter - dramatic Iweins style */}
          <div className="mb-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-neutral-900 leading-[0.9] tracking-tighter">
              Stolar.
            </h1>
            <div className="mt-4 flex items-end gap-6">
              <p className="text-lg md:text-2xl text-neutral-500">
                <span className="text-neutral-900 font-black tabular-nums text-2xl md:text-3xl">
                  {filtered.length}
                </span>{" "}
                {hasAnyFilter ? (
                  <>
                    stolar{" "}
                    <span className="text-neutral-400">
                      av {stolar.length} dokumentert
                    </span>
                  </>
                ) : (
                  "stolar dokumentert"
                )}
              </p>
              <div className="hidden md:block w-48">
                <Sparkline
                  data={centuryData}
                  activeValue={
                    activeFilter?.category === "hundreaar"
                      ? activeFilter.value
                      : null
                  }
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 max-w-xl">
            <SearchBar
              query={searchQuery}
              resultCount={searchQuery.trim() ? filtered.length : null}
              totalCount={categoryFiltered.length}
              onQueryChange={setSearchQuery}
              onClear={handleSearchClear}
            />
          </div>

          {/* Filter bar + size toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <FilterBar
                stolar={stolar}
                activeFilter={activeFilter}
                onFilter={handleFilter}
                onClear={handleClear}
              />
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <SizeToggle size={gridSize} onSizeChange={setGridSize} />
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="px-4 md:px-8 pb-16">
        <div className="max-w-[1800px] mx-auto">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <p className="text-lg">
                {searchQuery
                  ? `Ingen treff for «${searchQuery}»`
                  : "Ingen stolar funne."}
              </p>
              <button
                onClick={handleClearAll}
                className="mt-2 underline underline-offset-2 text-sm hover:text-neutral-900"
              >
                Fjern alle filter
              </button>
            </div>
          ) : (
            <StolGrid
              stolar={filtered}
              size={gridSize}
              onSizeChange={setGridSize}
              onSelect={setSelectedStol}
            />
          )}
        </div>
      </main>

      {/* Detail panel */}
      {selectedStol && (
        <DetailPanel
              stol={selectedStol}
              stolar={filtered}
              onNavigate={setSelectedStol}
              onClose={() => setSelectedStol(null)}
            />
      )}
    </div>
  );
}
