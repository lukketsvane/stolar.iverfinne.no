"use client";

import { type Stol } from "@/lib/types";
import { useEffect, useRef, useState, useCallback } from "react";

interface StolGridProps {
  stolar: Stol[];
  size: number;
  onSizeChange: (size: number) => void;
  onSelect: (stol: Stol) => void;
}

const MIN_SIZE = 40;
const MAX_SIZE = 280;

function parseId(objektId: string): { prefix: string; shortId: string } {
  if (!objektId) return { prefix: "", shortId: "" };
  if (objektId.startsWith("NMK.")) {
    const parts = objektId.split(".");
    return { prefix: "NM", shortId: parts[parts.length - 1] };
  }
  if (objektId.startsWith("OK-")) return { prefix: "OK", shortId: objektId };
  if (objektId.startsWith("O")) return { prefix: "O", shortId: objektId };
  return { prefix: "", shortId: objektId };
}

function displayName(namn: string): string {
  if (!namn) return "";
  return namn.replace(/\s*\([^)]*\)\s*$/, "").trim().toUpperCase();
}

/** Get thumbnail URL for grid view (pre-generated small WebP) */
function getThumbnailUrl(stol: Stol): string | null {
  return stol.thumbnailUrl || stol.bileteBguw || stol.bileteUrl || null;
}

/** Get full-res image URL for detail/preview */
function getImageUrl(stol: Stol): string | null {
  return stol.bileteBguw || stol.bileteUrl || null;
}

/** Initials placeholder for chairs without images */
function Initials({ namn }: { namn: string }) {
  const letter = (namn || "?")[0].toUpperCase();
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300 text-lg font-bold select-none">
      {letter}
    </div>
  );
}

export default function StolGrid({ stolar, size, onSizeChange, onSelect }: StolGridProps) {
  const [visibleCount, setVisibleCount] = useState(120);
  const [preview, setPreview] = useState<Stol | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((url: string) => {
    setFailedImages(prev => new Set(prev).add(url));
  }, []);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    startX: number;
    startY: number;
    triggered: boolean;
  }>({ timer: null, startX: 0, startY: 0, triggered: false });

  const showLabels = size >= 72;
  const showId = size >= 56;

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < stolar.length) {
          setVisibleCount((prev) => Math.min(prev + 120, stolar.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, stolar.length]);

  useEffect(() => {
    setVisibleCount(Math.min(120, stolar.length));
  }, [stolar]);

  // Pinch-to-resize
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    let pinchStartDist = 0;
    let pinchStartSize = 0;
    let isPinching = false;

    function dist(a: Touch, b: Touch) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isPinching = true;
        pinchStartDist = dist(e.touches[0], e.touches[1]);
        pinchStartSize = sizeRef.current;
        e.preventDefault();
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        if (!isPinching) {
          isPinching = true;
          pinchStartDist = dist(e.touches[0], e.touches[1]);
          pinchStartSize = sizeRef.current;
        }
        e.preventDefault();
        const currentDist = dist(e.touches[0], e.touches[1]);
        const ratio = currentDist / pinchStartDist;
        const newSize = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, pinchStartSize * ratio)));
        if (newSize !== sizeRef.current) {
          onSizeChange(newSize);
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        isPinching = false;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onSizeChange]);

  // Long-press handlers
  const handleItemTouchStart = useCallback((e: React.TouchEvent, stol: Stol) => {
    const touch = e.touches[0];
    longPressRef.current.startX = touch.clientX;
    longPressRef.current.startY = touch.clientY;
    longPressRef.current.triggered = false;
    longPressRef.current.timer = setTimeout(() => {
      longPressRef.current.triggered = true;
      setPreview(stol);
    }, 400);
  }, []);

  const handleItemTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - longPressRef.current.startX);
    const dy = Math.abs(touch.clientY - longPressRef.current.startY);
    if (dx > 10 || dy > 10) {
      if (longPressRef.current.timer) {
        clearTimeout(longPressRef.current.timer);
        longPressRef.current.timer = null;
      }
    }
  }, []);

  const handleItemTouchEnd = useCallback(() => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  }, []);

  const handleItemClick = useCallback((stol: Stol) => {
    if (longPressRef.current.triggered) {
      longPressRef.current.triggered = false;
      return;
    }
    onSelect(stol);
  }, [onSelect]);

  const dismissPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const openFromPreview = useCallback(() => {
    if (preview) {
      onSelect(preview);
      setPreview(null);
    }
  }, [preview, onSelect]);

  const visibleStolar = stolar.slice(0, visibleCount);
  const imgSize = size <= 64 ? 96 : size <= 128 ? 192 : 384;

  return (
    <div ref={gridRef}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
          gap: showLabels ? 0 : 2,
        }}
      >
        {visibleStolar.map((stol) => {
          const { prefix, shortId } = parseId(stol.objektId);
          const name = displayName(stol.namn);
          const thumbUrl = getThumbnailUrl(stol);

          return (
            <button
              key={stol.id}
              onClick={() => handleItemClick(stol)}
              onTouchStart={(e) => handleItemTouchStart(e, stol)}
              onTouchMove={handleItemTouchMove}
              onTouchEnd={handleItemTouchEnd}
              onTouchCancel={handleItemTouchEnd}
              className="group cursor-pointer focus:outline-none text-left grid-item-press"
              title={stol.namn}
            >
              <div className={`relative bg-white overflow-hidden ${size >= 56 ? "border border-neutral-200" : ""}`}>
                {showId && (
                  <div className="flex justify-between items-baseline px-1 pt-0.5 text-[8px] text-neutral-400 font-mono leading-none select-none">
                    <span>{prefix}</span>
                    <span>{shortId.replace(/^(OK-|NMK\.|O)/, "").slice(-6)}</span>
                  </div>
                )}

                <div className={`aspect-square ${size >= 96 ? 'p-1.5' : 'p-0.5'}`}>
                  {thumbUrl && !failedImages.has(thumbUrl) ? (
                    <img
                      src={thumbUrl}
                      alt={stol.namn}
                      width={imgSize}
                      height={imgSize}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none select-none"
                      onError={() => handleImageError(thumbUrl)}
                    />
                  ) : (
                    <Initials namn={stol.namn} />
                  )}
                </div>

                {showLabels && (
                  <div className="px-1 pb-1 pt-0">
                    <p className={`${size >= 120 ? 'text-[9px]' : 'text-[8px]'} font-medium text-neutral-700 leading-tight truncate tracking-wide select-none`}>
                      {name || "STOL"}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {visibleCount < stolar.length && (
        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          <span className="text-neutral-400 text-xs">
            {visibleCount} av {stolar.length} …
          </span>
        </div>
      )}

      {/* Long-press preview overlay */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center preview-backdrop"
          onClick={dismissPreview}
          onTouchEnd={dismissPreview}
        >
          <div className="preview-card bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[280px] w-[70vw]" onClick={(e) => { e.stopPropagation(); openFromPreview(); }}>
            <div className="aspect-square bg-neutral-50 p-4">
              {(() => { const url = getImageUrl(preview); return url && !failedImages.has(url); })() ? (
                <img
                  src={getImageUrl(preview)!}
                  alt={preview.namn}
                  className="w-full h-full object-contain"
                  onError={() => { const url = getImageUrl(preview); if (url) handleImageError(url); }}
                />
              ) : (
                <Initials namn={preview.namn} />
              )}
            </div>
            <div className="p-3 border-t border-neutral-100">
              <p className="font-bold text-sm text-neutral-900 uppercase tracking-tight truncate">{displayName(preview.namn)}</p>
              {preview.datering && <p className="text-xs text-neutral-400 mt-0.5">{preview.datering}</p>}
              {preview.stilperiode && <p className="text-xs text-neutral-500">{preview.stilperiode}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
