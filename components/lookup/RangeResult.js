"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Info, Map as MapIcon } from "lucide-react";
import { buildMarkers } from "@/components/geo/markers";
import Badge from "@/components/ui/Badge";
import Bars from "@/components/ui/Bars";
import Flag from "@/components/ui/Flag";
import Notice from "@/components/ui/Notice";
import Section from "@/components/ui/Section";
import StatStrip from "@/components/ui/StatStrip";
import { fmt, place } from "@/lib/format";
import ResultHeader, { ActionLink, Dot } from "./ResultHeader";

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(blocks) {
  const cols = ["start", "end", "count", "cidrs", "country_code", "country", "region", "city", "latitude", "longitude", "asn", "as_org", "bgp_prefix"];
  const esc = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = blocks.map((s) => [
    s.start, s.end, s.count, s.cidrs.join(" "),
    s.details?.country?.code, s.details?.country?.name, s.details?.subdivisions?.[0]?.name, s.details?.city,
    s.details?.location?.latitude, s.details?.location?.longitude, s.details?.asn?.number, s.details?.asn?.org, s.prefix,
  ].map(esc).join(","));
  return [cols.join(","), ...rows].join("\n");
}

export default function RangeResult({ data, query }) {
  const [onlyLocated, setOnlyLocated] = useState(false);
  const blocks = onlyLocated ? data.blocks.filter((s) => s.details) : data.blocks;
  const slug = (data.cidr ?? `${data.start}-${data.end}`).replace(/[^\w.:-]+/g, "_");
  const mapped = buildMarkers(data).length;
  const title = data.type === "cidr" ? data.cidr : `${data.start} – ${data.end}`;

  return (
    <article className="space-y-5">
      <ResultHeader
        title={title}
        copy={data.type === "cidr" ? data.cidr : `${data.start}-${data.end}`}
        meta={
          <>
            <Badge>{data.type === "cidr" ? "CIDR" : "Range"}</Badge>
            <span>IPv{data.version}</span>
            <Dot />
            <span className="font-mono text-[12.5px]">
              {data.type === "cidr" ? `${data.start} – ${data.end}` : data.cidr}
            </span>
          </>
        }
        badges={data.reserved && <Badge tone="warn">{data.reserved}</Badge>}
        actions={
          <>
            {mapped > 0 && (
              <ActionLink as={Link} href={`/map?q=${encodeURIComponent(query)}`}>
                <MapIcon className="h-3.5 w-3.5" />
                Open in map
              </ActionLink>
            )}
            <ActionLink as="button" type="button" onClick={() => download(`${slug}.csv`, toCsv(data.blocks), "text/csv")}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </ActionLink>
            <ActionLink as="button" type="button" onClick={() => download(`${slug}.json`, JSON.stringify(data, null, 2), "application/json")}>
              <Download className="h-3.5 w-3.5" />
              JSON
            </ActionLink>
          </>
        }
      />

      {data.truncated && (
        <Notice>
          This range is large, so results stop at <span className="font-mono">{data.scannedUntil}</span>. Narrow the range to see the rest.
        </Notice>
      )}

      <StatStrip
        items={[
          { label: "Addresses", value: fmt(data.total) },
          { label: "With data", value: fmt(data.located) },
          { label: "Blocks", value: data.blocks.length.toLocaleString() },
          { label: "Countries", value: data.summary.countries.length.toLocaleString() },
          { label: "Networks", value: data.summary.asns.length.toLocaleString() },
        ]}
      />

      {data.sampled && (
        <p className="flex items-start gap-2 text-[12.5px] leading-5 text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Blocks follow announced BGP prefixes. Each block&apos;s location is taken from its first address.
        </p>
      )}

      {(data.summary.countries.length > 0 || data.summary.asns.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.summary.countries.length > 0 && (
            <Section title="Countries">
              <Bars
                items={data.summary.countries}
                total={data.located}
                label={(c) => (
                  <>
                    <Flag code={c.code} />
                    <span className="truncate">{c.name ?? c.code}</span>
                  </>
                )}
              />
            </Section>
          )}
          {data.summary.asns.length > 0 && (
            <Section title="Networks">
              <Bars
                items={data.summary.asns}
                total={data.located}
                label={(a) => (
                  <>
                    <span className="font-mono text-zinc-400">AS{a.number}</span>
                    <span className="truncate">{a.org}</span>
                  </>
                )}
              />
            </Section>
          )}
        </div>
      )}

      <Section
        title={`Blocks · ${data.blocks.length.toLocaleString()}`}
        bodyClassName=""
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={onlyLocated}
              onChange={(e) => setOnlyLocated(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-500"
            />
            Hide blocks without data
          </label>
        }
      >
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-zinc-900 text-[12px] text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-2 font-medium">Block</th>
                <th className="px-4 py-2 text-right font-medium">Addresses</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {blocks.map((s) => (
                <tr key={s.start} className="align-top transition-colors hover:bg-zinc-900/60">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-zinc-200">
                    {s.cidrs.length === 1 && s.cidrs[0] !== "…" ? s.cidrs[0] : <>{s.start}<br />{s.end}</>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-zinc-400">{fmt(s.count)}</td>
                  <td className="px-4 py-2.5 text-zinc-200">
                    {s.details?.country && (
                      <span className="inline-flex items-center gap-2">
                        <Flag code={s.details.country.code} />
                        {place(s.details)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.details?.asn && (
                      <div className="text-zinc-200">
                        <span className="font-mono text-zinc-400">AS{s.details.asn.number}</span> {s.details.asn.org}
                      </div>
                    )}
                    {s.prefix && <div className="mt-0.5 font-mono text-[12px] text-zinc-600">{s.prefix}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </article>
  );
}
