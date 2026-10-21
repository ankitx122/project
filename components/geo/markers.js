import { place } from "@/lib/format";

export function buildMarkers(data) {
  if (!data) return [];
  const entries = [];

  if (data.type === "ip") entries.push(ipEntry(data));
  if (data.type === "host") data.results.forEach((r) => entries.push(ipEntry(r)));
  if (data.type === "cidr" || data.type === "range") {
    for (const b of data.blocks) {
      entries.push({
        details: b.details,
        item: {
          label: b.cidrs.length === 1 && b.cidrs[0] !== "…" ? b.cidrs[0] : `${b.start} – ${b.end}`,
          kind: "block",
          count: Number(b.count),
          prefix: b.prefix,
        },
      });
    }
  }

  const groups = new Map();
  for (const { details, item } of entries) {
    const loc = details?.location;
    if (loc?.latitude == null || loc?.longitude == null) continue;
    const id = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
    let m = groups.get(id);
    if (!m) {
      m = {
        id,
        location: [loc.latitude, loc.longitude],
        name: place(details),
        code: details.country?.code ?? null,
        timeZone: loc.timeZone ?? null,
        count: 0,
        items: [],
      };
      groups.set(id, m);
    }
    m.count += item.count;
    m.items.push({
      ...item,
      asn: details.asn?.number ?? null,
      org: details.asn?.org ?? null,
      isp: details.isp ?? null,
      organization: details.organization ?? null,
      flags: details.flags ?? [],
    });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function ipEntry(r) {
  return {
    details: r.details,
    item: { label: r.ip, kind: "ip", count: 1, prefix: r.cidr ?? null, reverse: r.reverse ?? null },
  };
}

export function tooltipStyle(x, y, width, height) {
  const flip = x > width * 0.65;
  return {
    left: x + (flip ? -12 : 12),
    top: Math.min(Math.max(y, 24), Math.max(height - 24, 24)),
    transform: flip ? "translate(-100%, -50%)" : "translate(0, -50%)",
  };
}
