"use client";

import { useState, useEffect, useCallback } from "react";
import { type Stol } from "@/lib/types";

interface DetailPanelProps {
  stol: Stol;
  stolar: Stol[];
  onNavigate: (stol: Stol) => void;
  onFilter: (category: string, value: string) => void;
  onClose: () => void;
}

function glbUrl(stol: Stol): string | null {
  if (!stol.tredfil) return null;
  if (stol.tredfil.startsWith("http")) return stol.tredfil;
  const id = stol.objektId;
  if (id.startsWith("OK-") || id.startsWith("NMK")) {
    return `https://raw.githubusercontent.com/lukketsvane/stolar-db/main/NM_stolar/${id}/${stol.tredfil}`;
  }
  return `https://raw.githubusercontent.com/lukketsvane/stolar-db/main/VA_3d/${id}/${stol.tredfil}`;
}

/** Tappable tag that triggers a filter */
function Tag({ category, value, onFilter }: { category: string; value: string; onFilter: (c: string, v: string) => void }) {
  return (
    <button
      onClick={() => onFilter(category, value)}
      className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded active:bg-neutral-900 active:text-white transition-colors"
    >
      {value}
    </button>
  );
}

/** Tappable inline value that triggers a filter */
function TappableValue({ category, value, onFilter, className = "" }: { category: string; value: string; onFilter: (c: string, v: string) => void; className?: string }) {
  return (
    <button
      onClick={() => onFilter(category, value)}
      className={`underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-900 transition-colors text-left ${className}`}
    >
      {value}
    </button>
  );
}

export default function DetailPanel({ stol, stolar, onNavigate, onFilter, onClose }: DetailPanelProps) {
  const imageUrl = stol.bileteBguw;
  const modelUrl = glbUrl(stol);
  const [show3D, setShow3D] = useState(false);

  const currentIndex = stolar.findIndex((s) => s.id === stol.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < stolar.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) { setShow3D(false); onNavigate(stolar[currentIndex - 1]); }
  }, [hasPrev, currentIndex, stolar, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) { setShow3D(false); onNavigate(stolar[currentIndex + 1]); }
  }, [hasNext, currentIndex, stolar, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  const nasjonalitet = stol.nasjonalitet || stol.nasjonalitetAvleidd || null;
  const produsent = stol.produsent || stol.produsentNormalisert || "";
  const produksjonsstad = stol.produksjonsstad || stol.produksjonsstadNormalisert || "";
  const nemning = stol.nemning1 || stol.nemning || "";
  const materialtekst = stol.materialkommentar || stol.materialarForslag || "";
  const materialTags = stol.materialar.length > 0 ? stol.materialar : (stol.materialarForslag ? stol.materialarForslag.split(", ") : []);

  const dims: string[] = [];
  if (stol.hoegde) dims.push(`H ${stol.hoegde}`);
  if (stol.breidde) dims.push(`B ${stol.breidde}`);
  if (stol.djupn) dims.push(`D ${stol.djupn}`);
  const dimStr = dims.join(" × ");

  const dateRange = stol.fraaAar && stol.tilAar && stol.fraaAar !== stol.tilAar
    ? `${stol.fraaAar}–${stol.tilAar}`
    : stol.datering || (stol.fraaAar ? String(stol.fraaAar) : "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-enter" onClick={onClose} />

      {hasPrev && (
        <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors" aria-label="Førre">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg>
        </button>
      )}
      {hasNext && (
        <button onClick={goNext} className="absolute right-[calc(32rem+1rem)] top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors" aria-label="Neste">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg>
        </button>
      )}

      <div className="relative w-full max-w-lg bg-white overflow-y-auto panel-enter" style={{ WebkitOverflowScrolling: "touch" }}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors" aria-label="Lukk">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" /></svg>
        </button>

        {currentIndex >= 0 && (
          <div className="absolute top-4 left-4 z-10 text-xs text-neutral-400 tabular-nums">
            {currentIndex + 1} / {stolar.length}
          </div>
        )}

        {/* Image / 3D */}
        <div className="relative aspect-square bg-neutral-50">
          {show3D && modelUrl ? (
            <model-viewer src={modelUrl} alt={stol.namn} auto-rotate camera-controls disable-zoom disable-pan touch-action="none" interaction-prompt="none" style={{ width: "100%", height: "100%" }} />
          ) : imageUrl && (
            <div className="w-full h-full p-8">
              <img src={imageUrl} alt={stol.namn} className="w-full h-full object-contain" />
            </div>
          )}

          <div className="md:hidden absolute inset-y-0 left-0 w-12 flex items-center">
            {hasPrev && <button onClick={goPrev} className="w-8 h-8 ml-1 flex items-center justify-center rounded-full bg-white/70 text-neutral-500"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg></button>}
          </div>
          <div className="md:hidden absolute inset-y-0 right-0 w-12 flex items-center justify-end">
            {hasNext && <button onClick={goNext} className="w-8 h-8 mr-1 flex items-center justify-center rounded-full bg-white/70 text-neutral-500"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg></button>}
          </div>

          {modelUrl && (
            <button onClick={() => setShow3D(!show3D)} className={`absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${show3D ? "bg-neutral-900" : "bg-white/80 hover:bg-white"}`} aria-label={show3D ? "Vis bilete" : "Vis 3D-modell"}>
              <img src="/cube-web.png" alt="" width={22} height={22} className={show3D ? "invert" : "opacity-60"} />
            </button>
          )}
        </div>

        {/* ── Details ── */}
        <div className="p-6">
          <h2 className="font-black text-2xl leading-tight text-neutral-900 uppercase tracking-tight">
            {stol.namn}
          </h2>
          {dateRange && (
            <p className="text-neutral-500 text-base mt-0.5">
              {stol.hundreaar ? (
                <TappableValue category="hundreaar" value={stol.hundreaar} onFilter={onFilter} className="text-neutral-500" />
              ) : null}
              {stol.hundreaar && dateRange ? <span className="mx-1">·</span> : null}
              {dateRange}
            </p>
          )}

          {/* Skildring */}
          {materialtekst && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Skildring</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{materialtekst}</p>
            </div>
          )}

          {/* Core metadata — tappable values */}
          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {nemning && (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Type</p>
                <TappableValue category="nemning" value={nemning} onFilter={onFilter} className="text-neutral-700" />
              </div>
            )}
            {nasjonalitet && (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Land</p>
                <TappableValue category="nasjonalitet" value={nasjonalitet} onFilter={onFilter} className="text-neutral-700" />
              </div>
            )}
            {produsent && produsent !== "Ikkje registrert" && (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Produsent</p>
                <TappableValue category="produsent" value={produsent} onFilter={onFilter} className="text-neutral-700" />
              </div>
            )}
            {produksjonsstad && (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Produksjonsstad</p>
                <TappableValue category="produksjonsstad" value={produksjonsstad} onFilter={onFilter} className="text-neutral-700" />
              </div>
            )}
            {stol.stilperiode && (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Stilperiode</p>
                <TappableValue category="stilperiode" value={stol.stilperiode} onFilter={onFilter} className="text-neutral-700" />
              </div>
            )}
          </div>

          {/* Dimensions */}
          {dimStr && (
            <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400">Mål</p>
                <p className="text-neutral-700 font-mono text-sm">{dimStr} cm</p>
                {stol.setehoegde && <p className="text-neutral-500 font-mono text-xs mt-0.5">Setehøgde {stol.setehoegde} cm</p>}
              </div>
              {stol.estimertVekt != null && stol.estimertVekt > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-400">Vekt</p>
                  <p className="text-neutral-700">{stol.estimertVekt} kg</p>
                </div>
              )}
            </div>
          )}

          {/* Materials — tappable tags */}
          {materialTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Materialar</p>
              <div className="flex flex-wrap gap-1.5">
                {materialTags.map((m) => <Tag key={m} category="materialar" value={m} onFilter={onFilter} />)}
              </div>
            </div>
          )}

          {/* Technique — tappable tags */}
          {stol.teknikk.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Teknikk</p>
              <div className="flex flex-wrap gap-1.5">
                {stol.teknikk.map((t) => <Tag key={t} category="teknikk" value={t} onFilter={onFilter} />)}
              </div>
            </div>
          )}

          {/* Emneord — tappable */}
          {stol.emneord.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Emneord</p>
              <div className="flex flex-wrap gap-1.5">
                {stol.emneord.map((e) => (
                  <span key={e} className="text-xs px-2 py-0.5 text-neutral-500">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Erverving */}
          {stol.erverving && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Erverving</p>
              <p className="text-sm text-neutral-600">{stol.erverving}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-300 font-mono">
            {stol.objektId}
          </div>
        </div>
      </div>
    </div>
  );
}
