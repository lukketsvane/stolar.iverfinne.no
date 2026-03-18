"use client";

import { useState, useEffect, useCallback } from "react";
import { type Stol } from "@/lib/types";

interface DetailPanelProps {
  stol: Stol;
  stolar: Stol[];
  onNavigate: (stol: Stol) => void;
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

export default function DetailPanel({ stol, stolar, onNavigate, onClose }: DetailPanelProps) {
  const imageUrl = stol.bileteBguw;
  const modelUrl = glbUrl(stol);
  const [show3D, setShow3D] = useState(false);

  const currentIndex = stolar.findIndex((s) => s.id === stol.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < stolar.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setShow3D(false);
      onNavigate(stolar[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, stolar, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) {
      setShow3D(false);
      onNavigate(stolar[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, stolar, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  const dimensions = [
    stol.hoegde && `${stol.hoegde} H`,
    stol.breidde && `${stol.breidde} B`,
    stol.djupn && `${stol.djupn} D`,
    stol.setehoegde && `${stol.setehoegde} SH`,
  ]
    .filter(Boolean)
    .join(" × ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Prev / Next arrows on backdrop (desktop) */}
      {hasPrev && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors"
          aria-label="Førre stol"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="11,3 5,9 11,15" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          onClick={goNext}
          className="absolute right-[calc(32rem+1rem)] top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors"
          aria-label="Neste stol"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="7,3 13,9 7,15" />
          </svg>
        </button>
      )}

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
          aria-label="Lukk"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        {/* Position counter */}
        {currentIndex >= 0 && (
          <div className="absolute top-4 left-4 z-10 text-xs text-neutral-400 tabular-nums">
            {currentIndex + 1} / {stolar.length}
          </div>
        )}

        {/* Image / 3D toggle area */}
        <div className="relative aspect-square bg-neutral-50">
          {show3D && modelUrl ? (
            <model-viewer
              src={modelUrl}
              alt={stol.namn}
              auto-rotate
              camera-controls
              disable-zoom
              disable-pan
              touch-action="none"
              interaction-prompt="none"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            imageUrl && (
              <div className="w-full h-full p-8">
                <img
                  src={imageUrl}
                  alt={stol.namn}
                  className="w-full h-full object-contain"
                />
              </div>
            )
          )}

          {/* Mobile prev/next arrows inside image area */}
          <div className="md:hidden absolute inset-y-0 left-0 w-12 flex items-center">
            {hasPrev && (
              <button
                onClick={goPrev}
                className="w-8 h-8 ml-1 flex items-center justify-center rounded-full bg-white/70 text-neutral-500"
                aria-label="Førre"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="11,3 5,9 11,15" />
                </svg>
              </button>
            )}
          </div>
          <div className="md:hidden absolute inset-y-0 right-0 w-12 flex items-center justify-end">
            {hasNext && (
              <button
                onClick={goNext}
                className="w-8 h-8 mr-1 flex items-center justify-center rounded-full bg-white/70 text-neutral-500"
                aria-label="Neste"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="7,3 13,9 7,15" />
                </svg>
              </button>
            )}
          </div>

          {/* 3D toggle icon — bottom-right corner */}
          {modelUrl && (
            <button
              onClick={() => setShow3D(!show3D)}
              className={`absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                show3D
                  ? "bg-neutral-900 shadow-lg"
                  : "bg-white/80 backdrop-blur-sm shadow-md hover:bg-white"
              }`}
              aria-label={show3D ? "Vis bilete" : "Vis 3D-modell"}
              title={show3D ? "Vis bilete" : "Vis 3D-modell"}
            >
              <img
                src="/cube-web.png"
                alt=""
                width={22}
                height={22}
                className={show3D ? "invert" : "opacity-60"}
              />
            </button>
          )}
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="font-black text-2xl leading-tight text-neutral-900">
              {stol.namn}
            </h2>
            {stol.datering && (
              <p className="text-neutral-500 font-black text-lg mt-0.5">
                {stol.datering}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {stol.nemning && <MetaField label="Nemning" value={stol.nemning} />}
            {stol.nasjonalitet && <MetaField label="Nasjonalitet" value={stol.nasjonalitet} />}
            {stol.stilperiode && <MetaField label="Stilperiode" value={stol.stilperiode} />}
            {stol.produsent && <MetaField label="Produsent" value={stol.produsent} />}
            {stol.produksjonsstad && <MetaField label="Produksjonsstad" value={stol.produksjonsstad} />}
            {stol.hundreaar && <MetaField label="Hundreår" value={stol.hundreaar} />}
          </div>

          {stol.materialkommentar && (
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Materialar</p>
              <p className="text-sm text-neutral-700">{stol.materialkommentar}</p>
            </div>
          )}
          {stol.materialar.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stol.materialar.map((m) => (
                <span key={m} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">{m}</span>
              ))}
            </div>
          )}

          {dimensions && (
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Dimensjonar (cm)</p>
              <p className="text-sm text-neutral-700 font-mono">{dimensions}</p>
              {stol.estimertVekt && stol.estimertVekt > 0 && (
                <p className="text-sm text-neutral-500 mt-0.5">≈ {stol.estimertVekt} kg</p>
              )}
            </div>
          )}

          {stol.teknikk.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Teknikk</p>
              <div className="flex flex-wrap gap-1.5">
                {stol.teknikk.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-neutral-50 text-neutral-600 border border-neutral-200 rounded">{t}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-300 font-mono pt-2">{stol.objektId}</p>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-neutral-700">{value}</p>
    </div>
  );
}
