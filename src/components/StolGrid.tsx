"use client";

import { type Stol } from "@/lib/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface StolGridProps {
  stolar: Stol[];
  size: number;
  onSizeChange: (size: number) => void;
  onSelect: (stol: Stol) => void;
}

// Continuous range — no snapping, smooth feel
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

export default function StolGrid({ stolar, size, onSizeChange, onSelect }: StolGridProps) {
  const [visibleCount, setVisibleCount] = useState(120);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

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

  // ── Pinch-to-resize: works alongside single-finger scroll ──
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    let pinchStartDist = 0;
    let pinchStartSize = 0;
    let isPinching = false;
    let touchStartTime = 0;

    function dist(a: Touch, b: Touch) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        // Two fingers down → start pinch, prevent scroll
        isPinching = true;
        pinchStartDist = dist(e.touches[0], e.touches[1]);
        pinchStartSize = sizeRef.current;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        touchStartTime = Date.now();
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        if (!isPinching) {
          // Second finger added mid-gesture
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
      // Single finger: don't interfere, let the browser scroll naturally
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        isPinching = false;
      }
    }

    // Only intercept when 2+ fingers — passive: false needed for preventDefault
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

  const visibleStolar = stolar.slice(0, visibleCount);

  // Image size for next/image optimization — snap to nearest reasonable size
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
          const imgUrl = stol.bileteBguw;

          return (
            <button
              key={stol.id}
              onClick={() => onSelect(stol)}
              className="group cursor-pointer focus:outline-none text-left active:opacity-70 transition-opacity"
              title={stol.namn}
            >
              <div className={`relative bg-white overflow-hidden ${showLabels ? "border border-neutral-200" : ""}`}>
                {showId && (
                  <div className="flex justify-between items-baseline px-1 pt-0.5 text-[8px] text-neutral-400 font-mono leading-none select-none">
                    <span>{prefix}</span>
                    <span>{shortId.replace(/^(OK-|NMK\.|O)/, "").slice(-6)}</span>
                  </div>
                )}

                <div className="aspect-square p-0.5">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={stol.namn}
                      width={imgSize}
                      height={imgSize}
                      loading="lazy"
                      draggable={false}
                      quality={50}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-200 text-[8px]">?</div>
                  )}
                </div>

                {showLabels && (
                  <div className="px-1 pb-1 pt-0">
                    <p className="text-[8px] font-medium text-neutral-700 leading-tight truncate tracking-wide select-none">
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
    </div>
  );
}
