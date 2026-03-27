"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  return url.replace(
    "https://raw.githubusercontent.com/",
    "https://media.githubusercontent.com/media/"
  );
}

function getImageUrl(stol: Stol): string | null {
  return stol.bileteBguw || stol.bileteUrl || null;
}

function thumbUrl(stol: Stol): string {
  return `/thumbs/${encodeURIComponent(stol.id)}.webp`;
}

function TappableValue({ category, value, onFilter, className = "" }: { category: string; value: string; onFilter: (c: string, v: string) => void; className?: string }) {
  return (
    <button
      onClick={() => onFilter(category, value)}
      className={`underline underline-offset-2 decoration-neutral-600 hover:decoration-white transition-colors text-left ${className}`}
    >
      {value}
    </button>
  );
}

export default function DetailPanel({ stol, stolar, onNavigate, onFilter, onClose }: DetailPanelProps) {
  const imageUrl = getImageUrl(stol);
  const modelUrl = glbUrl(stol);
  const [show3D, setShow3D] = useState(!!modelUrl);
  const [modelReady, setModelReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const modelViewerRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgFailed(false);
    setModelReady(false);
    setShow3D(!!glbUrl(stol));
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [stol.id]);

  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el) return;
    const onLoad = () => setModelReady(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [show3D, modelUrl]);

  const currentIndex = stolar.findIndex((s) => s.id === stol.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < stolar.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(stolar[currentIndex - 1]);
  }, [hasPrev, currentIndex, stolar, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(stolar[currentIndex + 1]);
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const nasjonalitet = stol.nasjonalitet || stol.nasjonalitetAvleidd || null;
  const produsent = stol.produsent || stol.produsentNormalisert || "";
  const produksjonsstad = stol.produksjonsstad || stol.produksjonsstadNormalisert || "";
  const nemning = stol.nemning1 || stol.nemning || "";
  const materialtekst = stol.materialkommentar || stol.materialarForslag || "";
  const materialTags = stol.materialar.length > 0 ? stol.materialar : (stol.materialarForslag ? stol.materialarForslag.split(", ") : []);

  const dimStr = [
    stol.hoegde && `H ${stol.hoegde}`,
    stol.breidde && `B ${stol.breidde}`,
    stol.djupn && `D ${stol.djupn}`,
  ].filter(Boolean).join(" x ");

  const dateRange = stol.fraaAar && stol.tilAar && stol.fraaAar !== stol.tilAar
    ? `${stol.fraaAar}–${stol.tilAar}`
    : stol.datering || (stol.fraaAar ? String(stol.fraaAar) : "");

  // Related items: same producer or same style period
  const relatedItems = useMemo(() => {
    const related: Stol[] = [];
    const seen = new Set<string>([stol.id]);
    // Same producer
    if (produsent && produsent !== "Ikkje registrert") {
      for (const s of stolar) {
        if (!seen.has(s.id) && (s.produsent === produsent || s.produsentNormalisert === produsent)) {
          related.push(s);
          seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    // Same style period
    if (related.length < 12 && stol.stilperiode) {
      for (const s of stolar) {
        if (!seen.has(s.id) && s.stilperiode === stol.stilperiode) {
          related.push(s);
          seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    // Same century
    if (related.length < 12 && stol.hundreaar) {
      for (const s of stolar) {
        if (!seen.has(s.id) && s.hundreaar === stol.hundreaar) {
          related.push(s);
          seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    return related;
  }, [stol, stolar, produsent]);

  // Build info pairs for the two-column Nasjonalmuseet-style grid
  const infoPairs: { label: string; value: string; category?: string }[] = [];
  if (stol.datering) infoPairs.push({ label: "Datering", value: stol.datering });
  if (dimStr) infoPairs.push({ label: "Mål", value: `${dimStr} cm` });
  if (nemning) infoPairs.push({ label: "Betegnelse", value: nemning, category: "nemning" });
  if (materialTags.length > 0) infoPairs.push({ label: "Materiale", value: materialTags.join(", "), category: "materialar" });
  if (materialtekst) infoPairs.push({ label: "Skildring", value: materialtekst });
  if (stol.teknikk.length > 0) infoPairs.push({ label: "Teknikk", value: stol.teknikk.join(", ") });
  if (nemning) infoPairs.push({ label: "Type", value: nemning, category: "nemning" });
  if (stol.stilperiode) infoPairs.push({ label: "Stilperiode", value: stol.stilperiode, category: "stilperiode" });
  if (produsent && produsent !== "Ikkje registrert") infoPairs.push({ label: "Produsent", value: produsent, category: "produsent" });
  if (stol.objektId) infoPairs.push({ label: "Inventarnr.", value: stol.objektId });
  if (produksjonsstad) infoPairs.push({ label: "Produksjonsstad", value: produksjonsstad, category: "produksjonsstad" });
  if (nasjonalitet) infoPairs.push({ label: "Land", value: nasjonalitet, category: "nasjonalitet" });
  if (stol.setehoegde) infoPairs.push({ label: "Setehøgde", value: `${stol.setehoegde} cm` });
  if (stol.erverving) infoPairs.push({ label: "Ervervelse", value: stol.erverving });
  if (stol.emneord.length > 0) infoPairs.push({ label: "Emneord", value: stol.emneord.join(", ") });

  // Remove duplicate "Type" if nemning === betegnelse
  const seenLabels = new Set<string>();
  const uniqueInfoPairs = infoPairs.filter(p => {
    const key = `${p.label}:${p.value}`;
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 detail-page-enter">
      <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>

        {/* ── Mobile: "tilbake" nav ── */}
        <nav className="md:hidden sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-sm">
          <div className="flex items-center px-4 h-11">
            <button onClick={onClose} className="text-[15px] text-neutral-400 active:text-white transition-colors">
              tilbake
            </button>
          </div>
        </nav>

        {/* ── Desktop layout ── */}
        <div className="hidden md:block">
          {/* Top bar */}
          <nav className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800/50">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between px-8 h-14">
              <button onClick={onClose} className="text-[15px] text-neutral-400 hover:text-white transition-colors">
                ← tilbake
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-neutral-500 tabular-nums mr-3">{currentIndex + 1} / {stolar.length}</span>
                <button onClick={goPrev} disabled={!hasPrev} className="detail-nav-btn" aria-label="Førre">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg>
                </button>
                <button onClick={goNext} disabled={!hasNext} className="detail-nav-btn" aria-label="Neste">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg>
                </button>
              </div>
            </div>
          </nav>

          {/* Two-column: image left, metadata right */}
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-[1fr,minmax(400px,520px)] min-h-[calc(100vh-3.5rem)]">
              {/* Left: image */}
              <div className="sticky top-14 h-[calc(100vh-3.5rem)] flex items-center justify-center p-12 bg-neutral-950">
                <div className="relative w-full h-full max-w-2xl">
                  {show3D && modelUrl ? (
                    <>
                      {!modelReady && imageUrl && !imgFailed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-12">
                          <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain" onError={() => setImgFailed(true)} />
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
                        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                      />
                    </>
                  ) : imageUrl && !imgFailed ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain" onError={() => setImgFailed(true)} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700 text-7xl font-bold">
                      {(stol.namn || "?")[0]}
                    </div>
                  )}

                  {modelUrl && (
                    <button onClick={() => setShow3D(!show3D)} className={`absolute bottom-0 right-0 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${show3D ? "bg-white" : "bg-neutral-800 hover:bg-neutral-700"}`} aria-label={show3D ? "Vis bilete" : "Vis 3D-modell"}>
                      <img src="/cube-web.png" alt="" width={22} height={22} className={show3D ? "opacity-80" : "invert opacity-60"} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: metadata */}
              <div className="border-l border-neutral-800/50 overflow-y-auto bg-neutral-950">
                <div className="p-8 pb-12">
                  {/* Title block */}
                  <h2 className="text-[2rem] font-black leading-[1.05] text-white tracking-tight uppercase">
                    {stol.namn}
                  </h2>
                  <p className="mt-2 text-[17px] text-neutral-400">
                    {stol.hundreaar && (
                      <TappableValue category="hundreaar" value={stol.hundreaar} onFilter={onFilter} className="text-neutral-400" />
                    )}
                    {stol.hundreaar && dateRange && <span className="mx-1.5 text-neutral-600">·</span>}
                    {dateRange && <span>{dateRange}</span>}
                  </p>

                  {/* Description */}
                  {materialtekst && (
                    <p className="mt-5 text-[15px] text-neutral-400 leading-relaxed">
                      {materialtekst}
                    </p>
                  )}

                  {/* Verksinformasjon: two-column grid like Nasjonalmuseet */}
                  <div className="mt-8">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {uniqueInfoPairs.map((pair, i) => (
                        <div key={`${pair.label}-${i}`}>
                          <dt className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium mb-0.5">{pair.label}</dt>
                          <dd className="text-[15px] text-neutral-200 leading-snug">
                            {pair.category ? (
                              <TappableValue category={pair.category} value={pair.value} onFilter={onFilter} className="text-neutral-200" />
                            ) : pair.value}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* External link */}
                  {stol.nasjonalmuseetUrl && (
                    <div className="mt-8 pt-6 border-t border-neutral-800/50">
                      <a href={stol.nasjonalmuseetUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-500 hover:text-white transition-colors">
                        Sjå hos Nasjonalmuseet ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related items section */}
          {relatedItems.length > 0 && (
            <div className="max-w-[1600px] mx-auto px-8 py-12 border-t border-neutral-800/50">
              <h3 className="text-[13px] uppercase tracking-wider text-neutral-500 mb-6">Utforsk andre verk</h3>
              <div className="grid grid-cols-6 gap-4">
                {relatedItems.slice(0, 12).map((r) => (
                  <RelatedThumb key={r.id} stol={r} onClick={() => onNavigate(r)} />
                ))}
              </div>
              {produsent && produsent !== "Ikkje registrert" && (
                <button
                  onClick={() => onFilter("produsent", produsent)}
                  className="mt-6 text-[13px] text-neutral-500 hover:text-white transition-colors"
                >
                  Sjå alle verk av {produsent} →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile layout ── */}
        <div className="md:hidden">
          {/* Image */}
          <div className="relative w-full aspect-square bg-neutral-950">
            {show3D && modelUrl ? (
              <>
                {!modelReady && imageUrl && !imgFailed && (
                  <div className="absolute inset-0 z-10 p-6 flex items-center justify-center">
                    <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain" onError={() => setImgFailed(true)} />
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
                  style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                />
              </>
            ) : imageUrl && !imgFailed ? (
              <div className="w-full h-full p-6 flex items-center justify-center">
                <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain" onError={() => setImgFailed(true)} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-700 text-5xl font-bold">
                {(stol.namn || "?")[0]}
              </div>
            )}
            {modelUrl && (
              <button onClick={() => setShow3D(!show3D)} className={`absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${show3D ? "bg-white" : "bg-neutral-800"}`} aria-label={show3D ? "Vis bilete" : "Vis 3D-modell"}>
                <img src="/cube-web.png" alt="" width={22} height={22} className={show3D ? "opacity-80" : "invert opacity-60"} />
              </button>
            )}
          </div>

          {/* Metadata */}
          <div className="px-5 pt-6 pb-16">
            <h2 className="text-[1.625rem] font-black leading-[1.08] text-white tracking-tight uppercase">
              {stol.namn}
            </h2>
            <p className="mt-1.5 text-[15px] text-neutral-400">
              {stol.hundreaar && (
                <TappableValue category="hundreaar" value={stol.hundreaar} onFilter={onFilter} className="text-neutral-400" />
              )}
              {stol.hundreaar && dateRange && <span className="mx-1.5 text-neutral-600">·</span>}
              {dateRange && <span>{dateRange}</span>}
            </p>

            {materialtekst && (
              <p className="mt-4 text-[14px] text-neutral-400 leading-relaxed">
                {materialtekst}
              </p>
            )}

            {/* Compact info grid */}
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
              {nemning && (
                <MobileInfoRow label="Type">
                  <TappableValue category="nemning" value={nemning} onFilter={onFilter} className="text-neutral-200" />
                </MobileInfoRow>
              )}
              {nasjonalitet && (
                <MobileInfoRow label="Land">
                  <TappableValue category="nasjonalitet" value={nasjonalitet} onFilter={onFilter} className="text-neutral-200" />
                </MobileInfoRow>
              )}
              {produsent && produsent !== "Ikkje registrert" && (
                <MobileInfoRow label="Produsent">
                  <TappableValue category="produsent" value={produsent} onFilter={onFilter} className="text-neutral-200" />
                </MobileInfoRow>
              )}
              {produksjonsstad && (
                <MobileInfoRow label="Produksjonsstad">
                  <TappableValue category="produksjonsstad" value={produksjonsstad} onFilter={onFilter} className="text-neutral-200" />
                </MobileInfoRow>
              )}
              {stol.stilperiode && (
                <MobileInfoRow label="Stilperiode">
                  <TappableValue category="stilperiode" value={stol.stilperiode} onFilter={onFilter} className="text-neutral-200" />
                </MobileInfoRow>
              )}
              {dimStr && (
                <MobileInfoRow label="Mål">
                  <span className="text-neutral-200 font-mono text-[13px]">{dimStr} cm</span>
                </MobileInfoRow>
              )}
            </div>

            {/* Materials as tags */}
            {materialTags.length > 0 && (
              <div className="mt-5 pt-5 border-t border-neutral-800/50">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Materialar</p>
                <div className="flex flex-wrap gap-1.5">
                  {materialTags.map((m) => (
                    <button key={m} onClick={() => onFilter("materialar", m)} className="text-[12px] px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full active:bg-white active:text-black transition-colors">
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stol.nasjonalmuseetUrl && (
              <div className="mt-5 pt-5 border-t border-neutral-800/50">
                <a href={stol.nasjonalmuseetUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-neutral-500 active:text-white transition-colors">
                  Sjå hos Nasjonalmuseet ↗
                </a>
              </div>
            )}

            <div className="mt-6 text-[11px] text-neutral-600 font-mono">
              {stol.objektId}
            </div>

            {/* Related items */}
            {relatedItems.length > 0 && (
              <div className="mt-8 pt-6 border-t border-neutral-800/50">
                <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 mb-4">Utforsk andre verk</h3>
                <div className="grid grid-cols-3 gap-2">
                  {relatedItems.slice(0, 6).map((r) => (
                    <RelatedThumb key={r.id} stol={r} onClick={() => onNavigate(r)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileInfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">{label}</dt>
      <dd className="text-[14px] text-neutral-200 leading-snug mt-0.5">{children}</dd>
    </div>
  );
}

function RelatedThumb({ stol, onClick }: { stol: Stol; onClick: () => void }) {
  const [src, setSrc] = useState(`/thumbs/${encodeURIComponent(stol.id)}.webp`);
  const [failed, setFailed] = useState(false);
  const fallback = stol.bileteBguw || stol.bileteUrl;

  return (
    <button onClick={onClick} className="group text-left">
      <div className="aspect-square bg-neutral-900 rounded overflow-hidden mb-1.5">
        {!failed ? (
          <img
            src={src}
            alt={stol.namn}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => {
              if (fallback && src !== fallback) {
                setSrc(fallback);
              } else {
                setFailed(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700 text-lg font-bold">
            {(stol.namn || "?")[0]}
          </div>
        )}
      </div>
      <p className="text-[12px] font-semibold text-neutral-300 leading-tight truncate">{stol.namn}</p>
      <p className="text-[11px] text-neutral-500 truncate">{stol.datering || stol.hundreaar || ""}</p>
    </button>
  );
}
