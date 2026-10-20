import Flag from "@/components/ui/Flag";

// Plotted locations; selecting one focuses it on the map / globe.
export default function LocationList({ markers, focusId, onFocus }) {
  return (
    <ul className="space-y-0.5">
      {markers.map((m) => {
        const active = m?.id === focusId;
        return (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onFocus(active ? null : m.id)}
              className={`relative flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                active ? "bg-zinc-800/80" : "hover:bg-zinc-900"
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" />}
              <Flag code={m.code} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-zinc-100">{m.name || m.code || "Unknown location"}</span>
                <span className="mt-0.5 block truncate font-mono text-[12px] text-zinc-500">
                  {m.items.length === 1 ? m.items[0].label : `${m.items.length} ${m.items[0].kind === "ip" ? "addresses" : "blocks"}`}
                </span>
              </span>
              {m?.count > 1 && (
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-zinc-500">{m.count.toLocaleString()}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
