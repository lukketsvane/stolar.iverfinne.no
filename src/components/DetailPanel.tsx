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

/** Dim model-viewer's default environment lights for a darker look */
function dimSceneLights(viewer: HTMLElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv = viewer as any;
  const sym = Object.getOwnPropertySymbols(mv).find((s) => s.description === "scene");
  if (!sym) return;
  const scene = mv[sym];
  if (!scene || scene.userData?.__dimmed) return;
  scene.userData.__dimmed = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene.traverse?.((child: any) => {
    if (child.isDirectionalLight) {
      child.intensity = (child.intensity ?? 1) * 0.4;
    }
    if (child.isSpotLight || child.isPointLight) {
      child.intensity = (child.intensity ?? 1) * 0.25;
    }
    if (child.isAmbientLight || child.isHemisphereLight) {
      child.intensity = (child.intensity ?? 1) * 0.08;
    }
  });
}

// ── Transition phases ──
// 1. "expand"  – thumbnail scales from grid position to full screen (pixelated)
// 2. "dither"  – pixelation dissolves, bg crossfades white→dark
// 3. "reveal"  – detail content fades in with stagger
// 4. "done"    – static
type Phase = "expand" | "dither" | "reveal" | "done";

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

  // Transition state
  const hasOrigin = !!transitionOrigin;
  const [phase, setPhase] = useState<Phase>(hasOrigin ? "expand" : "reveal");

  // Drive the transition timeline
  useEffect(() => {
    if (!hasOrigin) {
      setPhase("reveal");
      const t = setTimeout(() => setPhase("done"), 700);
      return () => clearTimeout(t);
    }
    // expand → dither → reveal → done
    setPhase("expand");
    const t1 = setTimeout(() => setPhase("dither"), 50); // start expand on next frame
    const t2 = setTimeout(() => setPhase("reveal"), 550); // after expand+dither
    const t3 = setTimeout(() => setPhase("done"), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [hasOrigin]);

  // Reset on navigation within detail view
  useEffect(() => {
    setImgFailed(false);
    setModelReady(false);
    setShow3D(!!glbUrl(stol));
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [stol.id]);

  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el) return;
    const onLoad = () => { setModelReady(true); dimSceneLights(el); };
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

  // ── Data ──
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

  // All info pairs – dense data
  const infoPairs: { label: string; value: string; category?: string }[] = [];
  if (stol.datering) infoPairs.push({ label: "Datering", value: stol.datering });
  if (stol.hundreaar) infoPairs.push({ label: "Hundreår", value: stol.hundreaar, category: "hundreaar" });
  if (dimStr) infoPairs.push({ label: "Mål", value: `${dimStr} cm` });
  if (stol.setehoegde) infoPairs.push({ label: "Setehøgde", value: `${stol.setehoegde} cm` });
  if (stol.estimertVekt != null && stol.estimertVekt > 0) infoPairs.push({ label: "Vekt", value: `${stol.estimertVekt} kg` });
  if (nemning) infoPairs.push({ label: "Betegnelse", value: nemning, category: "nemning" });
  if (materialTags.length > 0) infoPairs.push({ label: "Materiale", value: materialTags.join(", "), category: "materialar" });
  if (materialtekst) infoPairs.push({ label: "Materiale og teknikk", value: materialtekst });
  if (stol.teknikk.length > 0) infoPairs.push({ label: "Dekorteknikk", value: stol.teknikk.join(", ") });
  if (stol.stilperiode) infoPairs.push({ label: "Stilperiode", value: stol.stilperiode, category: "stilperiode" });
  if (produsent && produsent !== "Ikkje registrert") infoPairs.push({ label: "Produsent", value: produsent, category: "produsent" });
  if (stol.objektId) infoPairs.push({ label: "Inventarnr.", value: stol.objektId });
  if (produksjonsstad) infoPairs.push({ label: "Produksjonsstad", value: produksjonsstad, category: "produksjonsstad" });
  if (nasjonalitet) infoPairs.push({ label: "Land", value: nasjonalitet, category: "nasjonalitet" });
  if (stol.erverving) infoPairs.push({ label: "Ervervelse", value: stol.erverving });
  if (stol.emneord.length > 0) infoPairs.push({ label: "Emneord", value: stol.emneord.join(", ") });

  const seenLabels = new Set<string>();
  const uniqueInfoPairs = infoPairs.filter(p => {
    const key = `${p.label}:${p.value}`;
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  // Content visibility
  const contentReady = phase === "reveal" || phase === "done";

  // ── Transition overlay ──
  const transitionOverlay = hasOrigin && phase !== "done" && (
    <TransitionOverlay
      origin={transitionOrigin!}
      imageUrl={imageUrl}
      phase={phase}
    />
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Transition overlay (above everything during animation) */}
      {transitionOverlay}

      {/* Main detail view – fades in during "reveal" phase */}
      <div
        className="absolute inset-0 bg-neutral-950 transition-opacity duration-500 ease-out"
        style={{ opacity: contentReady ? 1 : 0 }}
      >
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>

          {/* Nav bar */}
          <nav className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800/40">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-11 sm:h-12">
              <button onClick={onClose} className="text-[15px] text-neutral-400 hover:text-white active:text-white transition-colors">
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

          {/* Content */}
          <div className="max-w-[1600px] mx-auto">
            <div className="detail-layout">
              {/* Left: image/3D */}
              <div className="detail-image-col">
                <div className={`relative w-full h-full transition-opacity duration-700 ease-out ${contentReady ? "opacity-100" : "opacity-0"}`}>
                  {show3D && modelUrl ? (
                    <>
                      {!modelReady && imageUrl && !imgFailed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 sm:p-12">
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
                        environment-image="legacy"
                        shadow-intensity="2"
                        shadow-softness="0.8"
                        exposure="0.25"
                        loading="eager"
                        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                      />
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
                  {modelUrl && !show3D && (
                    <button onClick={() => setShow3D(true)} className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded bg-neutral-800/60 hover:bg-neutral-700 transition-colors" aria-label="Vis 3D-modell">
                      <img src="/cube-web.png" alt="" width={18} height={18} className="invert opacity-50" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: metadata */}
              <div className="detail-meta-col">
                <div className="p-5 sm:p-6 lg:p-8 pb-12">
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
                    <div className={`mt-4 transition-all duration-500 delay-200 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                      <p className="text-[14px] text-neutral-400 leading-relaxed">{materialtekst}</p>
                    </div>
                  )}

                  {/* Verksinformasjon grid */}
                  <div className={`mt-6 transition-all duration-500 delay-300 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    <h3 className="text-[12px] uppercase tracking-wider text-neutral-500 font-semibold mb-3 pb-2 border-b border-neutral-800/60">Verksinformasjon</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
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

                  {/* Material tags */}
                  {materialTags.length > 0 && (
                    <div className={`mt-5 pt-4 border-t border-neutral-800/40 transition-all duration-500 delay-[400ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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
                    <div className={`mt-4 pt-4 border-t border-neutral-800/40 transition-all duration-500 delay-[450ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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

                  <div className={`mt-5 pt-4 border-t border-neutral-800/40 transition-all duration-500 delay-500 ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                    {stol.nasjonalmuseetUrl && (
                      <a href={stol.nasjonalmuseetUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-neutral-500 hover:text-white active:text-white transition-colors">
                        Sjå hos Nasjonalmuseet ↗
                      </a>
                    )}
                    <p className="mt-2 text-[11px] text-neutral-600 font-mono">{stol.objektId}</p>
                  </div>

                  {relatedItems.length > 0 && (
                    <div className={`mt-6 pt-5 border-t border-neutral-800/40 transition-all duration-500 delay-[600ms] ease-out ${contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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
    </div>
  );
}

// ── Transition overlay: expands thumbnail from grid → fullscreen with dither ──
function TransitionOverlay({
  origin,
  imageUrl,
  phase,
}: {
  origin: TransitionOrigin;
  imageUrl: string | null;
  phase: Phase;
}) {
  const { rect, thumbUrl } = origin;

  // Start position (grid thumbnail)
  const startStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 100,
  };

  // End position (fullscreen)
  const endStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 100,
  };

  const isExpanded = phase !== "expand";
  const isDithering = phase === "dither";
  const isRevealing = phase === "reveal" || phase === "done";

  return (
    <>
      {/* Background crossfade: white → transparent (reveals dark underneath) */}
      <div
        className="fixed inset-0 z-[99] transition-opacity ease-out pointer-events-none"
        style={{
          backgroundColor: "#0a0a0a",
          opacity: isRevealing ? 0 : 1,
          transitionDuration: isRevealing ? "600ms" : "400ms",
        }}
      />

      {/* Thumbnail image that expands */}
      <div
        style={{
          ...(isExpanded ? endStyle : startStyle),
          transition: "all 500ms cubic-bezier(0.32, 0.72, 0, 1)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          opacity: isRevealing ? 0 : 1,
          pointerEvents: "none",
        }}
        className={isRevealing ? "transition-opacity duration-500" : ""}
      >
        {/* Pixelated thumbnail (dithered look) */}
        <img
          src={thumbUrl}
          alt=""
          style={{
            maxWidth: isExpanded ? "50%" : "100%",
            maxHeight: isExpanded ? "70%" : "100%",
            objectFit: "contain",
            imageRendering: isDithering ? "auto" : "pixelated",
            transition: "all 500ms cubic-bezier(0.32, 0.72, 0, 1)",
            filter: isDithering
              ? "contrast(1.05)"
              : isExpanded
                ? "contrast(1)"
                : "none",
          }}
          onError={() => {}} // silent fail, detail view has its own image
        />

        {/* Full-res image fades in on top of pixelated version */}
        {imageUrl && isExpanded && (
          <img
            src={imageUrl}
            alt=""
            style={{
              position: "absolute",
              maxWidth: "50%",
              maxHeight: "70%",
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
            src={src}
            alt={stol.namn}
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
