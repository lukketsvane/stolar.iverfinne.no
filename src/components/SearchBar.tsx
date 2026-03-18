"use client";

import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  query: string;
  resultCount: number | null;
  totalCount: number;
  onQueryChange: (q: string) => void;
  onClear: () => void;
}

export default function SearchBar({
  query,
  resultCount,
  totalCount,
  onQueryChange,
  onClear,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync from parent
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounced search
  const handleChange = (value: string) => {
    setLocalQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value);
    }, 150);
  };

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (localQuery) {
          onClear();
        } else {
          inputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [localQuery, onClear]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 group focus-within:border-neutral-400 transition-colors">
        {/* Search icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-neutral-300 group-focus-within:text-neutral-500 transition-colors flex-shrink-0"
        >
          <circle cx="6.5" cy="6.5" r="5" />
          <line x1="10" y1="10" x2="14.5" y2="14.5" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Søk etter namn, designar, material, teknikk, stad …"
          className="flex-1 text-sm bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Result count + shortcut hint */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {resultCount !== null && localQuery.length > 0 && (
            <span className="text-xs text-neutral-400 tabular-nums">
              {resultCount}
              <span className="text-neutral-300">/{totalCount}</span>
            </span>
          )}
          {localQuery ? (
            <button
              onClick={onClear}
              className="text-neutral-300 hover:text-neutral-600 transition-colors"
              aria-label="Tøm søk"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex text-[10px] text-neutral-300 border border-neutral-200 rounded px-1 py-0.5 font-mono">
              ⌘K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
