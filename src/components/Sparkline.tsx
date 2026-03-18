"use client";

interface SparklineProps {
  data: { label: string; count: number }[];
  activeValue?: string | null;
}

export default function Sparkline({ data, activeValue }: SparklineProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((d) => {
        const height = Math.max(2, (d.count / maxCount) * 100);
        const isActive = activeValue === d.label;
        return (
          <div
            key={d.label}
            className="flex flex-col items-center group relative"
            style={{ width: `${100 / data.length}%`, maxWidth: 48 }}
          >
            <div
              className={`w-full rounded-[1px] transition-colors ${
                isActive ? "bg-neutral-900" : "bg-neutral-200 group-hover:bg-neutral-400"
              }`}
              style={{ height: `${height}%` }}
            />
            {/* Tooltip */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[9px] text-neutral-500 whitespace-nowrap bg-white px-1 rounded shadow-sm">
                {d.label}: {d.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
