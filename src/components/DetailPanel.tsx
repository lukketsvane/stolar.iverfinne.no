"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Stol } from "@/lib/types";

interface DetailPanelProps {
  stol: Stol;
  stolar: Stol[];
  onNavigate: (stol: Stol) => void;
  onFilter: (category: string, value: string) => void;
  onClose: () => void;
}

/** Resolve to actual GLB binary – Git LFS files need media.githubusercontent.com */
function glbUrl(stol: Stol): string | null {
  if (!stol.tredfil) return null;
  let url = stol.tredfil;
  if (!url.startsWith("http")) {
    const id = stol.objektId;
    if (id.startsWith("OK-") || id.startsWith("NMK")) {
      url = `https://raw.githubusercontent.com/lukketsvane/stolar-db/main/NM_stolar/${id}/${url}`;
    } else {
      url = `https://raw.githubusercontent.com/lukketsvane/stolar-db/main/VA_3d/${id}/${url}`;
    }
  }
  // raw.githubusercontent.com returns LFS pointer files, not actual binaries
  return url.replace(
    "https://raw.githubusercontent.com/",
    "https://media.githubusercontent.com/media/"
  );
}

function getImageUrl(stol: Stol): string | null {
  return stol.bileteBguw || stol.bileteUrl || null;
}

function Tag({ category, value, onFilter }: { category: string; value: string; onFilter: (c: string, v: string) => void }) {
  return (
    <button
      onClick={() => onFilter(category, value)}
      className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full active:bg-neutral-900 active:text-white transition-colors"
    >
      {value}
    </button>
  );
}

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

// Snap points as fractions of viewport height (from top)
const SNAP_HALF = 0.45;
const SNAP_FULL = 0;
const DISMISS_THRESHOLD = 0.7;

export default function DetailPanel({ stol, stolar, onNavigate, onFilter, onClose }: DetailPanelProps) {
  const imageUrl = getImageUrl(stol);
  const modelUrl = glbUrl(stol);
  const [show3D, setShow3D] = useState(!!modelUrl);
  const [modelReady, setModelReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const modelViewerRef = useRef<HTMLElement>(null);

  // Reset state when navigating to a different chair
  useEffect(() => {
    setImgFailed(false);
    setModelReady(false);
    const newModelUrl = glbUrl(stol);
    setShow3D(!!newModelUrl);
  }, [stol.id]);

  // Listen for model-viewer "load" event to know when the mesh is ready
  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el) return;
    const onLoad = () => setModelReady(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [show3D, modelUrl]);

  // Bottom sheet state
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetY, setSheetY] = useState(SNAP_FULL); // open full-screen
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startY: 0,
    startSheetY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    isVertical: null as boolean | null,
  });


  const currentIndex = stolar.findIndex((s) => s.id === stol.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < stolar.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) { onNavigate(stolar[currentIndex - 1]); }
  }, [hasPrev, currentIndex, stolar, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) { onNavigate(stolar[currentIndex + 1]); }
  }, [hasNext, currentIndex, stolar, onNavigate]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "Escape") { handleClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, handleClose]);

  // ── Bottom sheet drag (mobile) ──
  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current.startY = touch.clientY;
    dragRef.current.startSheetY = sheetY;
    dragRef.current.lastY = touch.clientY;
    dragRef.current.lastTime = Date.now();
    dragRef.current.velocity = 0;
    dragRef.current.isVertical = null;
  }, [sheetY]);

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragRef.current.startY;
    const vh = window.innerHeight;
    const deltaFraction = deltaY / vh;

    // Determine direction on first significant move
    if (dragRef.current.isVertical === null) {
      const absDY = Math.abs(deltaY);
      if (absDY > 8) {
        dragRef.current.isVertical = true;
      } else {
        return;
      }
    }

    if (!dragRef.current.isVertical) return;

    setIsDragging(true);

    // Track velocity
    const now = Date.now();
    const dt = now - dragRef.current.lastTime;
    if (dt > 0) {
      dragRef.current.velocity = (touch.clientY - dragRef.current.lastY) / dt;
    }
    dragRef.current.lastY = touch.clientY;
    dragRef.current.lastTime = now;

    let newY = dragRef.current.startSheetY + deltaFraction;
    // Rubber-band at top
    if (newY < SNAP_FULL) {
      newY = SNAP_FULL + (newY - SNAP_FULL) * 0.3;
    }
    // Allow dragging down past dismiss point
    newY = Math.min(newY, 1.1);
    setSheetY(newY);
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current.isVertical = null;
    const v = dragRef.current.velocity;
    const y = sheetY;

    // Fast downward flick or dragged past threshold → dismiss
    if (v > 0.5 || y > DISMISS_THRESHOLD) {
      handleClose();
      return;
    }
    // Otherwise snap back to full
    setSheetY(SNAP_FULL);
  }, [sheetY, handleClose]);


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

  // Sheet position as CSS
  const sheetTranslateY = isDragging
    ? `${sheetY * 100}vh`
    : undefined;


  const metadataContent = (
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

      {materialtekst && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Skildring</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{materialtekst}</p>
        </div>
      )}

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

      {materialTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Materialar</p>
          <div className="flex flex-wrap gap-1.5">
            {materialTags.map((m) => <Tag key={m} category="materialar" value={m} onFilter={onFilter} />)}
          </div>
        </div>
      )}

      {stol.teknikk.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Teknikk</p>
          <div className="flex flex-wrap gap-1.5">
            {stol.teknikk.map((t) => <Tag key={t} category="teknikk" value={t} onFilter={onFilter} />)}
          </div>
        </div>
      )}

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

      {stol.erverving && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Erverving</p>
          <p className="text-sm text-neutral-600">{stol.erverving}</p>
        </div>
      )}

      {stol.nasjonalmuseetUrl && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <a href={stol.nasjonalmuseetUrl} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-wider text-neutral-400 hover:text-neutral-900 transition-colors">
            Sjå hos Nasjonalmuseet ↗
          </a>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-300 font-mono">
        {stol.objektId}
      </div>

      {/* Extra bottom padding for safe area */}
      <div className="h-8 md:h-0" />
    </div>
  );

  const imageSection = (
    <div className="relative aspect-square bg-neutral-50">
      <div className="relative w-full h-full">
        {show3D && modelUrl ? (
          <>
            {/* Image poster shown until the 3D model is fully loaded */}
            {!modelReady && imageUrl && !imgFailed && (
              <div className="absolute inset-0 z-10 p-8">
                <img src={imageUrl} alt={stol.namn} className="w-full h-full object-contain" onError={() => setImgFailed(true)} />
              </div>
            )}
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt={stol.namn}
              auto-rotate
              camera-controls
              disable-zoom
              disable-pan
              touch-action="none"
              interaction-prompt="none"
              shadow-intensity="1"
              shadow-softness="0"
              environment-image="neutral"
              exposure="1.2"
              loading="eager"
              style={{ width: "100%", height: "100%", backgroundColor: "#ffffff" }}
            />
          </>
        ) : imageUrl && !imgFailed ? (
          <div className="w-full h-full p-8">
            <img src={imageUrl} alt={stol.namn} className="w-full h-full object-contain" onError={() => setImgFailed(true)} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-200 text-4xl font-bold">
            {(stol.namn || "?")[0]}
          </div>
        )}
      </div>

      {modelUrl && (
        <button onClick={() => setShow3D(!show3D)} className={`absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${show3D ? "bg-neutral-900" : "bg-white/80 hover:bg-white"}`} aria-label={show3D ? "Vis bilete" : "Vis 3D-modell"}>
          <img src="/cube-web.png" alt="" width={22} height={22} className={show3D ? "invert" : "opacity-60"} />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${isClosing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={handleClose}
      />

      {/* ── Desktop: right-side panel ── */}
      <div className={`hidden md:flex justify-end h-full`}>
        {hasPrev && (
          <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors" aria-label="Førre">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg>
          </button>
        )}
        {hasNext && (
          <button onClick={goNext} className="absolute right-[calc(32rem+1rem)] top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-neutral-900 hover:bg-white transition-colors" aria-label="Neste">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg>
          </button>
        )}

        <div className={`relative w-full max-w-lg bg-white overflow-y-auto ${isClosing ? "panel-exit-right" : "panel-enter"}`} style={{ WebkitOverflowScrolling: "touch" }}>
          <button onClick={handleClose} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors" aria-label="Lukk">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" /></svg>
          </button>

          {currentIndex >= 0 && (
            <div className="absolute top-4 left-4 z-10 text-xs text-neutral-400 tabular-nums">
              {currentIndex + 1} / {stolar.length}
            </div>
          )}

          {imageSection}
          {metadataContent}
        </div>
      </div>

      {/* ── Mobile: bottom sheet ── */}
      <div
        ref={sheetRef}
        className={`md:hidden absolute inset-x-0 bottom-0 bg-white overflow-hidden sheet-container ${isClosing ? "sheet-exit" : !isDragging ? "sheet-enter" : ""}`}
        style={{
          top: isDragging ? sheetTranslateY : undefined,
          willChange: isDragging ? "transform" : "auto",
          ...(isDragging ? {} : {
            top: `${sheetY * 100}vh`,
            transition: "top 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
          }),
        }}
      >
        {/* Drag handle + close button */}
        <div
          className="relative cursor-grab active:cursor-grabbing"
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={handleSheetTouchEnd}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-9 h-1 rounded-full bg-neutral-300" />
          </div>
          <button
            onClick={handleClose}
            className="absolute top-2 right-3 w-8 h-8 flex items-center justify-center text-neutral-400 active:text-neutral-900"
            aria-label="Lukk"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 pb-2">
          <button onClick={goPrev} disabled={!hasPrev} className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 disabled:opacity-20 active:bg-neutral-100">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg>
          </button>
          <span className="text-xs text-neutral-400 tabular-nums">{currentIndex + 1} / {stolar.length}</span>
          <button onClick={goNext} disabled={!hasNext} className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 disabled:opacity-20 active:bg-neutral-100">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: `calc(${(1 - sheetY) * 100}vh - 3rem)`, WebkitOverflowScrolling: "touch" }}
        >
          {imageSection}
          {metadataContent}
        </div>
      </div>
    </div>
  );
}
