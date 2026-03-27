"use client";

interface SizeToggleProps {
  size: number;
  onSizeChange: (size: number) => void;
}

const SIZES = [64, 120, 192];

export default function SizeToggle({ size, onSizeChange }: SizeToggleProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-400">
      <span className="mr-1">Storleik</span>
      {SIZES.map((s) => (
        <button
          key={s}
          onClick={() => onSizeChange(s)}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            size === s
              ? "bg-neutral-900 text-white"
              : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
          }`}
          aria-label={`${s}px`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="currentColor"
          >
            {s === 64 && (
              <>
                <rect x="1" y="1" width="3" height="3" rx="0.5" />
                <rect x="5.5" y="1" width="3" height="3" rx="0.5" />
                <rect x="10" y="1" width="3" height="3" rx="0.5" />
                <rect x="1" y="5.5" width="3" height="3" rx="0.5" />
                <rect x="5.5" y="5.5" width="3" height="3" rx="0.5" />
                <rect x="10" y="5.5" width="3" height="3" rx="0.5" />
                <rect x="1" y="10" width="3" height="3" rx="0.5" />
                <rect x="5.5" y="10" width="3" height="3" rx="0.5" />
                <rect x="10" y="10" width="3" height="3" rx="0.5" />
              </>
            )}
            {s === 120 && (
              <>
                <rect x="1" y="1" width="5.5" height="5.5" rx="0.5" />
                <rect x="7.5" y="1" width="5.5" height="5.5" rx="0.5" />
                <rect x="1" y="7.5" width="5.5" height="5.5" rx="0.5" />
                <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.5" />
              </>
            )}
            {s === 192 && (
              <rect x="1" y="1" width="12" height="12" rx="0.5" />
            )}
          </svg>
        </button>
      ))}
    </div>
  );
}
