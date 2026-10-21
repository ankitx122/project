import { fmt } from "@/lib/format";

// Distribution list: label + count with a thin proportional bar underneath.
export default function Bars({ items, total, label }) {
  const t = Number(total) || 1;
  return (
    <ul className="max-h-72 space-y-3 overflow-auto py-2">
      {items.slice(0, 25).map((it, i) => {
        const pct = (Number(it.ips) / t) * 100;
        return (
          <li key={i} className="text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 truncate text-zinc-200">{label(it, i)}</span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-zinc-500">
                {fmt(it.ips)} <span className="text-zinc-600">·</span> {pct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-zinc-800">
              <div className="h-1 rounded-full bg-emerald-500/80" style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
