"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Flag from "@/components/ui/Flag";
import { place } from "@/lib/format";

const FLAG_LABELS = { proxy: "Proxy", hosting: "Hosting", mobile: "Mobile" };

function ipKey(ip) {
  if (ip.includes(":")) return `6:${ip}`;
  return `4:${ip.split(".").map((p) => p.padStart(3, "0")).join(".")}`;
}

const COLUMNS = [
  { id: "ip", label: "IP address", value: (r) => ipKey(r.ip) },
  { id: "location", label: "Location", value: (r) => place(r.details) },
  { id: "network", label: "Network", value: (r) => r.details?.asn?.number ?? Infinity },
  { id: "prefix", label: "BGP prefix", value: (r) => r.cidr ?? "" },
];

export function filterRows(results, { text, country, flaggedOnly }) {
  const needle = text.trim().toLowerCase();
  return results.filter((r) => {
    const d = r.details;
    if (country && d?.country?.code !== country) return false;
    if (flaggedOnly && !d?.flags?.length) return false;
    if (!needle) return true;
    return [r.ip, r.cidr, r.reverse, place(d), d?.country?.code, d?.asn && `as${d.asn.number}`, d?.asn?.org, d?.isp]
      .some((v) => v && String(v).toLowerCase().includes(needle));
  });
}

export default function BulkTable({ rows, filters, setFilters, countries, focusId, onFocus }) {
  const [sort, setSort] = useState({ id: "ip", dir: 1 });

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sort.id);
    return [...rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort]);

  const toggleSort = (id) => setSort((s) => ({ id, dir: s.id === id ? -s.dir : 1 }));
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={filters.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Filter by IP, city, ASN, organisation…"
            className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 pl-8 pr-2.5 text-[12.5px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </div>
        <select
          value={filters.country}
          onChange={(e) => set({ country: e.target.value })}
          aria-label="Country"
          className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[12.5px] text-zinc-200 outline-none focus:border-emerald-500/50"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name} ({c.count})</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 px-1 text-[12px] text-zinc-400 hover:text-zinc-200">
          <input
            type="checkbox"
            checked={filters.flaggedOnly}
            onChange={(e) => set({ flaggedOnly: e.target.checked })}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
          Proxy / hosting / mobile only
        </label>
      </header>

      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-zinc-900 text-[12px] text-zinc-500">
            <tr className="border-b border-zinc-800">
              {COLUMNS.map((c) => (
                <th key={c.id} className="px-4 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort(c.id)} className="inline-flex items-center gap-1 hover:text-zinc-200">
                    {c.label}
                    {sort.id === c.id && (sort.dir > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((r) => {
              const d = r.details;
              const loc = d?.location;
              const markerId = loc ? `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}` : null;
              return (
                <tr
                  key={r.ip}
                  className={`align-top transition-colors hover:bg-zinc-900/60 ${markerId && markerId === focusId ? "bg-emerald-500/[0.04]" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px]">
                    <Link href={`/?q=${encodeURIComponent(r.ip)}`} className="text-zinc-100 hover:text-emerald-300">{r.ip}</Link>
                    {r.reverse && <div className="max-w-[16rem] truncate text-[11.5px] text-zinc-600">{r.reverse}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-200">
                    {d?.country ? (
                      <button
                        type="button"
                        onClick={() => markerId && onFocus(markerId)}
                        disabled={!markerId}
                        title={markerId ? "Show on map" : undefined}
                        className="inline-flex items-center gap-2 text-left enabled:hover:text-emerald-300"
                      >
                        <Flag code={d.country.code} />
                        {place(d)}
                      </button>
                    ) : (
                      <span className="text-zinc-600">{r.reserved ?? "No data"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-200">
                    {d?.asn && (
                      <>
                        <span className="font-mono text-zinc-400">AS{d.asn.number}</span> {d.asn.org}
                      </>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-zinc-500">{r.cidr}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {d?.flags?.map((f) => <Badge key={f} tone={f === "proxy" ? "danger" : "neutral"}>{FLAG_LABELS[f] ?? f}</Badge>)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-zinc-500">No rows match these filters.</p>}
      </div>
    </section>
  );
}
