"use client";

import { type Stol } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface StolGridProps {
  stolar: Stol[];
  size: number;
  onSizeChange: (size: number) => void;
  onSelect: (stol: Stol) => void;
}

const SIZE_STEPS = [48, 64, 80, 96, 128, 160, 192, 256];

/** Extract prefix (NM / OK / O) and short ID from objektId */
function parseId(objektId: string): { prefix: string; shortId: string } {
  if (!objektId) return { prefix: "", shortId: "" };
  // NMK.2005.0638 → NM, 0638
  if (objektId.startsWith("NMK.")) {
    const parts = objektId.split(".");
    return { prefix: "NM", shortId: parts[parts.length - 1] };
  }
  // OK-02817 → OK, OK-02817
  if (objektId.startsWith("OK-")) {
    return { prefix: "OK", shortId: objektId };
  }
  // O372041 → O, O372041
  if (objektId.startsWith("O")) {
    return { prefix: "O", shortId: objektId };
  }
  return { prefix: "", shortId: objektId };
}

/** Uppercase short display name */
function displayName(namn: string): string {
  if (!namn) return "";
  // Strip parenthetical like "(OK-02817)" or "(Unknown)"
  const clean = namn.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return clean.toUpperCase();
}

export default function StolGrid({ stolar, size, onSizeChange, onSelect }: StolGridProps) {
  const [visibleCount, setVisibleCount] = useState(100);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Show labels when tiles are big enough
  const showLabels = size >= 80;
  const showId = size >= 64;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < stolar.length) {
          setVisibleCount((prev) => Math.min(prev + 100, stolar.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, stolar.length]);

  useEffect(() => {
    setVisibleCount(Math.min(100, stolar.length));
  }, [stolar]);

  // Pinch-to-resize
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let initialDistance = 0;
    let initialSize = size;
    let isPinching = false;

    function getDistance(t1: Touch, t2: Touch) {
      return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialSize = size;
        e.preventDefault();
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!isPinching || e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = getDistance(e.touches[0], e.touches[1]) / initialDistance;
      const rawSize = initialSize * ratio;
      let closest = SIZE_STEPS[0];
      let closestDist = Math.abs(rawSize - closest);
      for (const step of SIZE_STEPS) {
        const dist = Math.abs(rawSize - step);
        if (dist < closestDist) { closest = step; closestDist = dist; }
      }
      if (closest !== size) onSizeChange(closest);
    }
    function onTouchEnd() { isPinching = false; }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [size, onSizeChange]);

  const visibleStolar = stolar.slice(0, visibleCount);

  return (
    <div ref={gridRef} className="touch-none">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
          gap: showLabels ? "0px" : "3px",
        }}
      >
        {visibleStolar.map((stol) => {
          const { prefix, shortId } = parseId(stol.objektId);
          const name = displayName(stol.namn);
          const imgUrl = stol.bileteBguw;

          return (
            <button
              key={stol.id}
              onClick={() => onSelect(stol)}
              className="group cursor-pointer focus:outline-none touch-manipulation text-left"
              title={stol.namn}
            >
              {/* Card with border like turnable-db */}
              <div className={`relative bg-white overflow-hidden ${showLabels ? "border border-neutral-200" : ""}`}>
                {/* Header row: prefix + ID */}
                {showId && (
                  <div className="flex justify-between items-baseline px-1.5 pt-1 text-[9px] text-neutral-400 font-mono leading-none">
                    <span>{prefix}</span>
                    <span>{shortId.replace(/^(OK-|NMK\.|O)/, "").slice(-6)}</span>
                  </div>
                )}

                {/* Image */}
                <div className="aspect-square p-1">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={stol.namn}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-200 text-xs">
                      ?
                    </div>
                  )}
                </div>

                {/* Name label */}
                {showLabels && (
                  <div className="px-1.5 pb-1.5 pt-0">
                    <p className="text-[9px] font-medium text-neutral-700 leading-tight truncate tracking-wide">
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
        <div ref={sentinelRef} className="h-20 flex items-center justify-center touch-auto">
          <span className="text-neutral-400 text-xs">
            {visibleCount} av {stolar.length} …
          </span>
        </div>
      )}
    </div>
  );
}
