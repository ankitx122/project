import Flag from "@/components/ui/Flag";
import { isEmpty } from "@/lib/format";

const MAX_ITEMS = 4;

function Row({ label, value, mono }) {
  if (isEmpty(value)) return null;
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`min-w-0 truncate text-zinc-200 ${mono ? "font-mono text-[11.5px]" : ""}`}>{value}</dd>
    </>
  );
}

export default function MarkerTooltip({ marker, style }) {
  const [first] = marker.items;
  const single = marker.items.length === 1;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-[280px] rounded-lg border border-zinc-700/70 bg-zinc-900/95 p-3 text-[12px] shadow-2xl shadow-black/60 backdrop-blur"
      style={style}
    >
      <div className="mb-2.5 flex items-center gap-2 border-b border-zinc-800 pb-2.5">
        <Flag code={marker.code} />
        <span className="min-w-0 truncate font-medium text-zinc-100">{marker.name || marker.code}</span>
      </div>

      <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-1.5">
        {single ? (
          <>
            <Row label={first.kind === "ip" ? "Address" : "Block"} value={first.label} mono />
            {first.kind === "block" && <Row label="Addresses" value={first.count.toLocaleString()} mono />}
            <Row label="ASN" value={first.asn && `AS${first.asn}`} mono />
            <Row label="Organisation" value={first.org} />
            <Row label="ISP" value={first.isp !== first.org ? first.isp : null} />
            <Row label="BGP prefix" value={first.prefix} mono />
            <Row label="Reverse DNS" value={first.reverse} mono />
            <Row label="Flags" value={first.flags.join(", ")} />
          </>
        ) : (
          <Row label="Addresses" value={marker.count.toLocaleString()} mono />
        )}
        <Row label="Coordinates" value={`${marker.location[0]}, ${marker.location[1]}`} mono />
        <Row label="Time zone" value={marker.timeZone} mono />
      </dl>

      {!single && (
        <ul className="mt-2.5 space-y-1 border-t border-zinc-800 pt-2.5">
          {marker.items.slice(0, MAX_ITEMS).map((it) => (
            <li key={it.label} className="flex min-w-0 gap-2">
              <span className="shrink-0 font-mono text-[11.5px] text-zinc-200">{it.label}</span>
              {it.asn && <span className="truncate text-zinc-500">AS{it.asn} {it.org}</span>}
            </li>
          ))}
          {marker.items.length > MAX_ITEMS && (
            <li className="text-zinc-500">+{marker.items.length - MAX_ITEMS} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
