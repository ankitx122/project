"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Boxes, Download, Globe2, Hash, Info, Map as MapIcon, Network, Radar, Search } from "lucide-react";
import MiniMap from "@/components/geo/MiniMap";
import { buildMarkers } from "@/components/geo/markers";
import Badge from "@/components/ui/Badge";
import Bars from "@/components/ui/Bars";
import Flag from "@/components/ui/Flag";
import Notice from "@/components/ui/Notice";
import Section from "@/components/ui/Section";
import SaveToWatchlist from "@/components/watchlists/SaveToWatchlist";
import { download, fmt, place, summarize, toCsv } from "@/lib/format";
import ResultHeader, { ActionLink, Dot } from "./ResultHeader";
import WhoisSection from "./WhoisSection";

const blocksCsv = (blocks) =>
  toCsv(
    ["start", "end", "count", "cidrs", "country_code", "country", "region", "city", "latitude", "longitude", "asn", "as_org", "bgp_prefix"],
    blocks.map((s) => [
      s.start, s.end, s.count, s.cidrs.join(" "),
      s.details?.country?.code, s.details?.country?.name, s.details?.subdivisions?.[0]?.name, s.details?.city,
      s.details?.location?.latitude, s.details?.location?.longitude, s.details?.asn?.number, s.details?.asn?.org, s.prefix,
    ]),
  );

const NETWORK_COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6", "#fb923c"];
const OTHER_COLOR = "#52525b";
const NO_DATA_COLOR = "#27272a";

const blockLabel = (s) => (s.cidrs.length === 1 && s.cidrs[0] !== "…" ? s.cidrs[0] : `${s.start} – ${s.end}`);

const share = (part, total) => (Number(total) ? Number((BigInt(part) * 1_000_000n) / BigInt(total)) / 10_000 : 0);
const pct = (p) => (p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)) + "%";

function AddressSpace({ data, colorOf }) {
  const total = data.blocks.reduce((sum, s) => sum + BigInt(s.count), 0n);
  const legend = data.summary.asns.slice(0, NETWORK_COLORS.length);
  const otherIps = data.summary.asns.slice(NETWORK_COLORS.length).reduce((sum, a) => sum + BigInt(a.ips), 0n);
  const missing = BigInt(data.total) - BigInt(data.located);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3 text-[12px] text-zinc-500">
        <h3 className="text-[13px] font-medium text-zinc-200">Address space</h3>
        <span className="font-mono">{fmt(data.total)} addresses</span>
      </div>
      <div className="mt-3 flex h-8 w-full gap-px overflow-hidden rounded-md bg-zinc-950">
        {data.blocks.map((s) => (
          <div
            key={s.start}
            title={`${blockLabel(s)} · ${fmt(s.count)} addresses${s.details?.asn ? ` · AS${s.details.asn.number} ${s.details.asn.org}` : ""}`}
            className="h-full min-w-[2px] transition-opacity hover:opacity-70"
            style={{ flexGrow: share(s.count, total) || 0.0001, flexBasis: 0, background: colorOf(s) }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11.5px] text-zinc-500">
        <span>{data.start}</span>
        <span>{data.truncated ? data.scannedUntil : data.end}</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-zinc-400">
        {legend.map((a, i) => (
          <li key={a.number} className="inline-flex min-w-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: NETWORK_COLORS[i] }} />
            <span className="max-w-[16rem] truncate">{a.org}</span>
            <span className="font-mono text-zinc-600">{pct(share(a.ips, data.total))}</span>
          </li>
        ))}
        {otherIps > 0n && (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OTHER_COLOR }} />
            Other networks <span className="font-mono text-zinc-600">{pct(share(otherIps, data.total))}</span>
          </li>
        )}
        {missing > 0n && (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-zinc-700" style={{ background: NO_DATA_COLOR }} />
            No data <span className="font-mono text-zinc-600">{pct(share(missing, data.total))}</span>
          </li>
        )}
      </ul>
    </section>
  );
}

function Stat({ Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[12px] text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-emerald-400/80" />
        {label}
      </dt>
      <dd className="mt-1.5 flex items-baseline gap-2">
        <span className="truncate font-mono text-[18px] tabular-nums text-zinc-50" title={value}>{value}</span>
        {sub && <span className="text-[12px] text-zinc-500">{sub}</span>}
      </dd>
    </div>
  );
}

export default function RangeResult({ data, query }) {
  const [onlyLocated, setOnlyLocated] = useState(false);
  const [filter, setFilter] = useState("");
  const slug = (data.cidr ?? `${data.start}-${data.end}`).replace(/[^\w.:-]+/g, "_");
  const mapped = buildMarkers(data).length;
  const title = data.type === "cidr" ? data.cidr : `${data.start} – ${data.end}`;
  const { countries, asns } = data.summary;
  const coverage = share(data.located, data.total);

  const colorOf = useMemo(() => {
    const index = new Map(asns.slice(0, NETWORK_COLORS.length).map((a, i) => [a.number, NETWORK_COLORS[i]]));
    return (s) => (!s.details ? NO_DATA_COLOR : index.get(s.details.asn?.number) ?? OTHER_COLOR);
  }, [asns]);

  const largest = data.blocks.reduce((max, s) => (BigInt(s.count) > max ? BigInt(s.count) : max), 1n);
  const needle = filter.trim().toLowerCase();
  const blocks = data.blocks.filter((s) => {
    if (onlyLocated && !s.details) return false;
    if (!needle) return true;
    const d = s.details;
    return [blockLabel(s), s.prefix, place(d), d?.country?.code, d?.asn && `as${d.asn.number}`, d?.asn?.org, d?.isp]
      .some((v) => v && String(v).toLowerCase().includes(needle));
  });

  return (
    <article className="space-y-5">
      <ResultHeader
        title={title}
        copy={data.type === "cidr" ? data.cidr : `${data.start}-${data.end}`}
        meta={
          <>
            <Badge tone="accent">{data.type === "cidr" ? "CIDR" : "Range"}</Badge>
            <span>IPv{data.version}</span>
            <Dot />
            <span className="font-mono text-[12.5px]">
              {data.type === "cidr" ? `${data.start} – ${data.end}` : data.cidr}
            </span>
            {asns.length === 1 && (
              <>
                <Dot />
                <span>
                  <span className="font-mono text-zinc-300">AS{asns[0].number}</span> {asns[0].org}
                </span>
              </>
            )}
          </>
        }
        badges={data.reserved && <Badge tone="warn">{data.reserved}</Badge>}
        actions={
          <>
            <SaveToWatchlist key={query} items={[{ query, summary: summarize(data) }]} />
            {mapped > 0 && (
              <ActionLink as={Link} href={`/map?q=${encodeURIComponent(query)}`}>
                <MapIcon className="h-3.5 w-3.5" />
                Open in map
              </ActionLink>
            )}
            <ActionLink as="button" type="button" onClick={() => download(`${slug}.csv`, blocksCsv(data.blocks), "text/csv")}>
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

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat Icon={Hash} label="Addresses" value={fmt(data.total)} />
        <Stat Icon={Radar} label="With data" value={fmt(data.located)} sub={pct(coverage)} />
        <Stat Icon={Boxes} label="Blocks" value={data.blocks.length.toLocaleString()} />
        <Stat Icon={Globe2} label="Countries" value={countries.length.toLocaleString()} />
        <Stat Icon={Network} label="Networks" value={asns.length.toLocaleString()} />
      </dl>

      {data.blocks.length > 0 && <AddressSpace data={data} colorOf={colorOf} />}

      {!data.reserved && <WhoisSection key={query} query={data.type === "cidr" ? data.cidr : data.start} />}

      {data.sampled && (
        <p className="flex items-start gap-2 text-[12.5px] leading-5 text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Blocks follow announced BGP prefixes. Each block&apos;s location is taken from its first address.
        </p>
      )}

      {(countries.length > 0 || asns.length > 0) && (
        <div className={`grid gap-4 ${mapped > 0 ? "lg:grid-cols-2" : "md:grid-cols-2"}`}>
          <div className={mapped > 0 ? "space-y-4" : "contents"}>
          {countries.length > 0 && (
            <Section title={`Countries · ${countries.length}`}>
              <Bars
                items={countries}
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
          {asns.length > 0 && (
            <Section title={`Networks · ${asns.length}`}>
              <Bars
                items={asns}
                total={data.located}
                label={(a, i) => (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: NETWORK_COLORS[i] ?? OTHER_COLOR }} />
                    <span className="font-mono text-zinc-400">AS{a.number}</span>
                    <span className="truncate">{a.org}</span>
                  </>
                )}
              />
            </Section>
          )}
          </div>
          {mapped > 0 && (
            <Section
              title={`Locations · ${mapped}`}
              className="flex flex-col"
              bodyClassName="relative min-h-[280px] flex-1"
              actions={
                <Link href={`/map?q=${encodeURIComponent(query)}`} className="text-[12px] text-zinc-400 hover:text-zinc-100">
                  Expand
                </Link>
              }
            >
              <div className="absolute inset-0">
                <MiniMap data={data} />
              </div>
            </Section>
          )}
        </div>
      )}

      <Section
        title={`Blocks · ${data.blocks.length.toLocaleString()}`}
        bodyClassName=""
        actions={
          <div className="flex items-center gap-4">
            <label className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter blocks"
                aria-label="Filter blocks"
                className="h-7 w-48 rounded-md border border-zinc-800 bg-zinc-950 pl-7 pr-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-400 hover:text-zinc-200">
              <input
                type="checkbox"
                checked={onlyLocated}
                onChange={(e) => setOnlyLocated(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-500"
              />
              Hide blocks without data
            </label>
          </div>
        }
      >
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-zinc-900 text-[11.5px] uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-2 font-medium">Block</th>
                <th className="px-4 py-2 font-medium">Addresses</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {blocks.map((s) => (
                <tr key={s.start} className="align-top transition-colors hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(s) }} />
                      <div className="font-mono text-[12.5px] text-zinc-100">
                        {s.cidrs.length === 1 && s.cidrs[0] !== "…" ? s.cidrs[0] : <>{s.start}<br />{s.end}</>}
                      </div>
                    </div>
                  </td>
                  <td className="w-40 px-4 py-3">
                    <div className="font-mono text-[12.5px] tabular-nums text-zinc-300">{fmt(s.count)}</div>
                    <div className="mt-1.5 h-1 w-24 rounded-full bg-zinc-800">
                      <div
                        className="h-1 rounded-full bg-emerald-500/70"
                        style={{ width: `${Math.max(share(s.count, largest), 3)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    {s.details?.country ? (
                      <span className="inline-flex items-center gap-2">
                        <Flag code={s.details.country.code} />
                        {place(s.details)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">No data</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.details?.asn && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-200">
                        <span className="rounded border border-zinc-700/80 px-1.5 py-px font-mono text-[11.5px] text-zinc-400">
                          AS{s.details.asn.number}
                        </span>
                        {s.details.asn.org}
                      </div>
                    )}
                    {s.prefix && s.prefix !== blockLabel(s) && (
                      <div className="mt-1 font-mono text-[11.5px] text-zinc-600">via {s.prefix}</div>
                    )}
                  </td>
                </tr>
              ))}
              {blocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-zinc-500">
                    No blocks match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </article>
  );
}
