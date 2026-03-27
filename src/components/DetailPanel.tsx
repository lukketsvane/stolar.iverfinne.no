"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { type Stol } from "@/lib/types";
import { type TransitionOrigin } from "./StolGrid";

interface DetailPanelProps {
  stol: Stol;
  stolar: Stol[];
  onNavigate: (stol: Stol) => void;
  onFilter: (category: string, value: string) => void;
  onClose: () => void;
  transitionOrigin?: TransitionOrigin | null;
}

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

/**
 * Set up two physical directional lights at odd angles with hard shadows.
 * Clones existing DirectionalLight from model-viewer's scene (avoids
 * needing to import Three.js separately) and repositions them.
 */
function setupPhysicalLights(viewer: HTMLElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv = viewer as any;
  const sym = Object.getOwnPropertySymbols(mv).find((s) => s.description === "scene");
  if (!sym) return;
  const scene = mv[sym];
  if (!scene || scene.userData?.__customLit) return;
  scene.userData.__customLit = true;

  // Collect all existing lights
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingLights: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene.traverse?.((child: any) => {
    if (child.isLight) existingLights.push(child);
  });

  // Find a directional light to clone (model-viewer always creates one for shadows)
  const templateLight = existingLights.find((l) => l.isDirectionalLight);

  // Kill ambient/hemisphere lights — we want physical lights only
  existingLights.forEach((l) => {
    if (l.isAmbientLight || l.isHemisphereLight) {
      l.intensity = 0;
    }
  });

  if (templateLight) {
    // Repurpose the existing directional light as our key light
    // Position: high front-right, slightly warm
    templateLight.intensity = 2.5;
    templateLight.position.set(5, 8, 4);
    if (templateLight.color?.setHex) templateLight.color.setHex(0xfff0e0);
    // Hard shadow
    if (templateLight.shadow) {
      templateLight.castShadow = true;
      templateLight.shadow.bias = -0.001;
      if (templateLight.shadow.mapSize) {
        templateLight.shadow.mapSize.width = 1024;
        templateLight.shadow.mapSize.height = 1024;
      }
      templateLight.shadow.radius = 1;
    }

    // Clone for fill/rim light — back-left, cooler, less intense
    try {
      const fillLight = templateLight.clone();
      fillLight.intensity = 1.2;
      fillLight.position.set(-6, 5, -3);
      if (fillLight.color?.setHex) fillLight.color.setHex(0xd8e8ff);
      if (fillLight.shadow) {
        fillLight.castShadow = true;
        fillLight.shadow.radius = 1;
      }
      scene.add(fillLight);
    } catch {
      // Clone not available — single light is fine
    }
  }
}

type Phase = "hidden" | "expand" | "dither" | "reveal" | "done";

/** Hook for horizontal swipe gesture detection */
function useSwipeNav(
  goPrev: () => void,
  goNext: () => void,
  hasPrev: boolean,
  hasNext: boolean,
) {
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, startTime: Date.now() };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    const dt = Date.now() - touchRef.current.startTime;

    // Must be horizontal, fast, and at least 50px
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 400) {
      if (dx < 0 && hasNext) goNext();
      else if (dx > 0 && hasPrev) goPrev();
    }
  }, [goPrev, goNext, hasPrev, hasNext]);

  return { onTouchStart, onTouchEnd };
}

export default function DetailPanel({
  stol, stolar, onNavigate, onFilter, onClose, transitionOrigin,
}: DetailPanelProps) {
  const imageUrl = getImageUrl(stol);
  const modelUrl = glbUrl(stol);
  const [show3D, setShow3D] = useState(!!modelUrl);
  const [modelReady, setModelReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const modelViewerRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    // Simple gradual fade-in
    const t1 = requestAnimationFrame(() => setPhase("reveal"));
    const t2 = setTimeout(() => setPhase("done"), 600);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); };
  }, []);

  // Smooth crossfade when navigating between items
  // Don't reset show3D if next item also has a model — avoids image flash
  const [navFade, setNavFade] = useState(false);
  const prevIdRef = useRef(stol.id);
  useEffect(() => {
    if (prevIdRef.current !== stol.id) {
      prevIdRef.current = stol.id;
      setNavFade(true);
      requestAnimationFrame(() => {
        setImgFailed(false);
        const newModelUrl = glbUrl(stol);
        // Only flip to image if new item has no 3D model
        if (!newModelUrl) setShow3D(false);
        else if (!show3D) setShow3D(true);
        // Don't reset modelReady — model-viewer handles src change internally
        scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
        setTimeout(() => setNavFade(false), 60);
      });
    }
  }, [stol.id, show3D]);

  // Update URL hash for shareable links
  useEffect(() => {
    const hash = `#${encodeURIComponent(stol.objektId)}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [stol.objektId]);

  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el) return;
    const onLoad = () => { setModelReady(true); setupPhysicalLights(el); };
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

  // Swipe gesture for mobile nav
  const swipe = useSwipeNav(goPrev, goNext, hasPrev, hasNext);

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

  // Toggle 3D/image by tapping the image area
  const handleImageTap = useCallback(() => {
    if (modelUrl) setShow3D((v) => !v);
  }, [modelUrl]);

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

  const relatedItems = useMemo(() => {
    const related: Stol[] = [];
    const seen = new Set<string>([stol.id]);
    if (produsent && produsent !== "Ikkje registrert") {
      for (const s of stolar) {
        if (!seen.has(s.id) && (s.produsent === produsent || s.produsentNormalisert === produsent)) {
          related.push(s); seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    if (related.length < 12 && stol.stilperiode) {
      for (const s of stolar) {
        if (!seen.has(s.id) && s.stilperiode === stol.stilperiode) {
          related.push(s); seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    if (related.length < 12 && stol.hundreaar) {
      for (const s of stolar) {
        if (!seen.has(s.id) && s.hundreaar === stol.hundreaar) {
          related.push(s); seen.add(s.id);
        }
        if (related.length >= 12) break;
      }
    }
    return related;
  }, [stol, stolar, produsent]);

  // Show ALL available data — no hiding
  const dash = "–";
  const infoPairs: { label: string; value: string; category?: string }[] = [
    { label: "Inventarnr.", value: stol.objektId || dash },
    { label: "Datering", value: stol.datering || dash },
    { label: "Hundreår", value: stol.hundreaar || dash, category: stol.hundreaar ? "hundreaar" : undefined },
    { label: "Betegnelse", value: nemning || dash, category: nemning ? "nemning" : undefined },
    { label: "Stilperiode", value: stol.stilperiode || dash, category: stol.stilperiode ? "stilperiode" : undefined },
    { label: "Produsent", value: produsent || dash, category: produsent && produsent !== "Ikkje registrert" ? "produsent" : undefined },
    { label: "Produksjonsstad", value: produksjonsstad || dash, category: produksjonsstad ? "produksjonsstad" : undefined },
    { label: "Land", value: nasjonalitet || dash, category: nasjonalitet ? "nasjonalitet" : undefined },
    { label: "Materiale", value: materialTags.length > 0 ? materialTags.join(", ") : dash, category: materialTags.length > 0 ? "materialar" : undefined },
    { label: "Materiale og teknikk", value: materialtekst || dash },
    { label: "Dekorteknikk", value: stol.teknikk.length > 0 ? stol.teknikk.join(", ") : dash },
    { label: "Mål", value: dimStr ? `${dimStr} cm` : dash },
    { label: "Setehøgde", value: stol.setehoegde ? `${stol.setehoegde} cm` : dash },
    { label: "Vekt", value: stol.estimertVekt != null && stol.estimertVekt > 0 ? `${stol.estimertVekt} kg` : dash },
    { label: "Ervervelse", value: stol.erverving || dash },
    { label: "Emneord", value: stol.emneord.length > 0 ? stol.emneord.join(", ") : dash },
  ];

  // Dedupe exact duplicates
  const seenLabels = new Set<string>();
  const uniqueInfoPairs = infoPairs.filter(p => {
    const key = `${p.label}:${p.value}`;
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  const contentReady = phase === "reveal" || phase === "done";

  const fadeIn = phase === "reveal" || phase === "done";

  // model-viewer element (shared between desktop/mobile via image col)
  const modelViewerEl = modelUrl && show3D ? (
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
      environment-image="legacy"
      shadow-intensity="2"
      shadow-softness="0"
      exposure="0.7"
      loading="eager"
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
    />
  ) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950 transition-opacity duration-500 ease-out"
      style={{ opacity: fadeIn ? 1 : 0 }}
    >
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>

          {/* Nav bar — swipeable on mobile for prev/next */}
          <nav
            className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800/40"
            onTouchStart={swipe.onTouchStart}
            onTouchEnd={swipe.onTouchEnd}
          >
            <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-11 sm:h-12">
              <button onClick={onClose} className="text-[15px] text-neutral-300 hover:text-white active:text-white transition-colors font-sans tracking-wide">
                <span className="hidden sm:inline">← </span>tilbake
              </button>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-[12px] text-neutral-500 tabular-nums mr-2">{currentIndex + 1} / {stolar.length}</span>
                <button onClick={goPrev} disabled={!hasPrev} className="detail-nav-btn" aria-label="Førre">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="11,3 5,9 11,15" /></svg>
                </button>
                <button onClick={goNext} disabled={!hasNext} className="detail-nav-btn" aria-label="Neste">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="7,3 13,9 7,15" /></svg>
                </button>
              </div>
            </div>
          </nav>

          <div className="max-w-[1600px] mx-auto">
            <div className="detail-layout">
              {/* Image/3D — tap to toggle between image and 3D model */}
              <div className="detail-image-col" onClick={handleImageTap} style={{ cursor: modelUrl ? "pointer" : "default" }}>
                <div className={`relative w-full h-full transition-opacity ease-out ${navFade ? "opacity-0 duration-150" : "opacity-100 duration-500"} ${contentReady ? "" : "opacity-0"}`}>
                  {show3D && modelViewerEl ? (
                    <>
                      {!modelReady && imageUrl && !imgFailed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 sm:p-12">
                          <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain" onError={() => setImgFailed(true)} />
                        </div>
                      )}
                      {modelViewerEl}
                    </>
                  ) : imageUrl && !imgFailed ? (
                    <div className="w-full h-full flex items-center justify-center p-6 sm:p-12">
                      <img src={imageUrl} alt={stol.namn} className="max-w-full max-h-full object-contain transition-opacity duration-500" onError={() => setImgFailed(true)} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-800 text-6xl font-bold">
                      {(stol.namn || "?")[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata — also swipeable on mobile for prev/next */}
              <div className={`detail-meta-col transition-opacity ease-out ${navFade ? "opacity-0 duration-100" : "opacity-100 duration-400"}`}>
                <div
                  className="p-4 sm:p-5 lg:p-6 pb-10"
                  onTouchStart={swipe.onTouchStart}
                  onTouchEnd={swipe.onTouchEnd}
                >
                  <div className={`transition-all duration-500 delay-100 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    <h2 className="text-[1.5rem] sm:text-[1.75rem] lg:text-[2rem] font-black leading-[1.05] text-white tracking-tight uppercase">
                      {stol.namn}
                    </h2>
                    <p className="mt-1.5 text-[15px] sm:text-[16px] text-neutral-400">
                      {stol.hundreaar && <TappableValue category="hundreaar" value={stol.hundreaar} onFilter={onFilter} className="text-neutral-400" />}
                      {stol.hundreaar && dateRange && <span className="mx-1.5 text-neutral-600">·</span>}
                      {dateRange && <span>{dateRange}</span>}
                    </p>
                  </div>

                  {materialtekst && (
                    <div className={`mt-2.5 transition-all duration-500 delay-200 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                      <p className="text-[13px] text-neutral-400 leading-relaxed">{materialtekst}</p>
                    </div>
                  )}

                  <div className={`mt-4 transition-all duration-500 delay-300 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-2 pb-1.5 border-b border-neutral-800/60">Verksinformasjon</h3>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                      {uniqueInfoPairs.map((pair, i) => (
                        <div key={`${pair.label}-${i}`} className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium leading-tight">{pair.label}</dt>
                          <dd className="text-[13px] sm:text-[14px] text-neutral-200 leading-snug mt-0.5 break-words">
                            {pair.category ? (
                              <TappableValue category={pair.category} value={pair.value} onFilter={onFilter} className="text-neutral-200" />
                            ) : pair.value}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {materialTags.length > 0 && (
                    <div className={`mt-3 pt-3 border-t border-neutral-800/40 transition-all duration-500 delay-[400ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Materialar</p>
                      <div className="flex flex-wrap gap-1.5">
                        {materialTags.map((m) => (
                          <button key={m} onClick={() => onFilter("materialar", m)} className="text-[11px] px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full active:bg-white active:text-black transition-colors">
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {stol.teknikk.length > 0 && (
                    <div className={`mt-3 pt-3 border-t border-neutral-800/40 transition-all duration-500 delay-[450ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Teknikk</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stol.teknikk.map((t) => (
                          <button key={t} onClick={() => onFilter("teknikk", t)} className="text-[11px] px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full active:bg-white active:text-black transition-colors">
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`mt-3 pt-3 border-t border-neutral-800/40 transition-all duration-500 delay-500 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    {stol.nasjonalmuseetUrl && (
                      <a href={stol.nasjonalmuseetUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-neutral-500 hover:text-white active:text-white transition-colors">
                        Sjå hos Nasjonalmuseet ↗
                      </a>
                    )}
                    <p className="mt-2 text-[11px] text-neutral-600 font-mono">{stol.objektId}</p>
                  </div>

                  {relatedItems.length > 0 && (
                    <div className={`mt-4 pt-3 border-t border-neutral-800/40 transition-all duration-500 delay-[600ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                      <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 mb-3">Utforsk andre verk</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {relatedItems.slice(0, 12).map((r) => (
                          <RelatedThumb key={r.id} stol={r} onClick={() => onNavigate(r)} />
                        ))}
                      </div>
                      {produsent && produsent !== "Ikkje registrert" && (
                        <button onClick={() => onFilter("produsent", produsent)} className="mt-4 text-[12px] text-neutral-500 hover:text-white transition-colors">
                          Sjå alle verk av {produsent} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

// TransitionOverlay removed — using simple fade instead

function TransitionOverlay({
  origin, imageUrl, phase,
}: {
  origin: TransitionOrigin; imageUrl: string | null; phase: Phase;
}) {
  const { rect, thumbUrl } = origin;
  const startStyle: React.CSSProperties = {
    position: "fixed", top: rect.top, left: rect.left,
    width: rect.width, height: rect.height, zIndex: 100,
  };
  const endStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0,
    width: "100vw", height: "100vh", zIndex: 100,
  };
  const isExpanded = phase !== "expand";
  const isDithering = phase === "dither";
  const isRevealing = phase === "reveal" || phase === "done";

  return (
    <>
      <div
        className="fixed inset-0 z-[99] transition-opacity ease-out pointer-events-none"
        style={{
          backgroundColor: "#0a0a0a",
          opacity: isRevealing ? 0 : 1,
          transitionDuration: isRevealing ? "600ms" : "400ms",
        }}
      />
      <div
        style={{
          ...(isExpanded ? endStyle : startStyle),
          transition: "all 500ms cubic-bezier(0.32, 0.72, 0, 1)",
          overflow: "hidden", display: "flex",
          alignItems: "center", justifyContent: "center",
          backgroundColor: "#0a0a0a",
          opacity: isRevealing ? 0 : 1,
          pointerEvents: "none",
        }}
        className={isRevealing ? "transition-opacity duration-500" : ""}
      >
        <img
          src={thumbUrl} alt=""
          style={{
            maxWidth: isExpanded ? "50%" : "100%",
            maxHeight: isExpanded ? "70%" : "100%",
            objectFit: "contain",
            imageRendering: isDithering ? "auto" : "pixelated",
            transition: "all 500ms cubic-bezier(0.32, 0.72, 0, 1)",
            filter: isDithering ? "contrast(1.05)" : "none",
          }}
          onError={() => {}}
        />
        {imageUrl && isExpanded && (
          <img
            src={imageUrl} alt=""
            style={{
              position: "absolute", maxWidth: "50%", maxHeight: "70%",
              objectFit: "contain",
              opacity: isDithering ? 0 : isRevealing ? 0 : 0.8,
              transition: "opacity 400ms ease-out",
            }}
          />
        )}
      </div>
    </>
  );
}

function RelatedThumb({ stol, onClick }: { stol: Stol; onClick: () => void }) {
  const [src, setSrc] = useState(`/thumbs/${encodeURIComponent(stol.id)}.webp`);
  const [failed, setFailed] = useState(false);
  const fallback = stol.bileteBguw || stol.bileteUrl;

  return (
    <button onClick={onClick} className="group text-left">
      <div className="aspect-square bg-neutral-900 rounded overflow-hidden mb-1">
        {!failed ? (
          <img
            src={src} alt={stol.namn}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => {
              if (fallback && src !== fallback) setSrc(fallback);
              else setFailed(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700 text-lg font-bold">
            {(stol.namn || "?")[0]}
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-neutral-300 leading-tight truncate">{stol.namn}</p>
      <p className="text-[10px] text-neutral-500 truncate">{stol.datering || stol.hundreaar || ""}</p>
    </button>
  );
}
