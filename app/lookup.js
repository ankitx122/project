"use client";

import { useEffect, useState } from "react";

const EXAMPLES = ["8.8.8.8", "1.1.1.0/24", "8.8.8.0 - 8.8.8.20", "2001:4860:4860::8888", "example.com"];
const HISTORY_KEY = "geoip-history";

function flag(code) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const fmt = (n) => BigInt(n).toLocaleString("en-US");

function place(info) {
  if (!info) return "";
  return [info.city, info.subdivisions?.[0]?.name, info.country?.name].filter(Boolean).join(", ");
}

export default function Lookup({ sources }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  function loadHistory() {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []); } catch {}
  }

  async function run(q) {
    q = q.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || json.message !== "success") throw new Error(json.data?.error ?? "Lookup failed");
      setData(json.data);
      const next = [q, ...history.filter((h) => h !== q)].slice(0, 8);
      setHistory(next);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      window.history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
    } catch (e) {
      setData(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // localStorage only exists on the client, so it has to be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => { e.preventDefault(); run(query); }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="IP, CIDR, range (a.b.c.d - e.f.g.h) or hostname"
          spellCheck={false}
          autoFocus
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
        />
        <button
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Lookup"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Try:</span>
        {EXAMPLES.map((ex) => (
          <Chip key={ex} onClick={() => run(ex)}>{ex}</Chip>
        ))}
        {history.length > 0 && <span className="ml-2 text-zinc-500">Recent:</span>}
        {history.map((h) => (
          <Chip key={h} onClick={() => run(h)} muted>{h}</Chip>
        ))}
      </div>

      <SourceStatus sources={sources} />

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {(data?.warnings ?? data?.results?.[0]?.warnings)?.map((w) => (
        <div key={w} className="rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">{w}</div>
      ))}

      {data?.type === "ip" && <IpResult result={data} />}
      {data?.type === "host" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            <span className="font-mono text-zinc-200">{data.host}</span> resolved to {data.results.length} address
            {data.results.length === 1 ? "" : "es"}
          </p>
          {data.results.map((r) => <IpResult key={r.ip} result={r} />)}
        </div>
      )}
      {(data?.type === "cidr" || data?.type === "range") && <RangeResult data={data} />}
    </div>
  );
}

function Chip({ children, onClick, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono ${muted ? "border-zinc-800 text-zinc-500 hover:text-zinc-300" : "border-zinc-700 text-zinc-300 hover:border-emerald-600 hover:text-emerald-300"}`}
    >
      {children}
    </button>
  );
}

function SourceStatus({ sources }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {sources.map((src) => (
        <a
          key={src.name}
          href={src.url}
          target="_blank"
          rel="noreferrer"
          title={src.provides}
          className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-zinc-400 hover:text-zinc-200"
        >
          <span className="text-emerald-400">●</span> {src.name} · {src.provides}
        </a>
      ))}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 ${className}`}>
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

const isEmpty = (v) => v == null || v === false || v === "" || (Array.isArray(v) && !v.length);

// Fields without data are left out entirely rather than shown as placeholders.
function Field({ label, value, mono }) {
  if (isEmpty(value)) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/60 py-2 text-sm last:border-0">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className={`text-right text-zinc-100 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function IpResult({ result }) {
  const info = result.details;
  const loc = info?.location;
  const hasCoords = loc?.latitude != null && loc?.longitude != null;
  const country = info?.country;
  const hasLocation =
    info && [info.country, info.subdivisions, info.city, info.district, info.postal, info.continent, loc].some((v) => !isEmpty(v));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-2xl text-zinc-50">{result.ip}</h2>
        {country && <span className="text-lg text-zinc-300">{flag(country.code)} {place(info)}</span>}
        {result.reserved && (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">{result.reserved}</span>
        )}
      </div>

      {!info ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
          No data for this address{(result.reserved ?? result.notFoundReason) && <> ({result.reserved ?? result.notFoundReason})</>}.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {hasLocation && <Card title="Location">
            <dl>
              <Field label="Country" value={info.country && `${flag(info.country.code)} ${info.country.name} (${info.country.code})`} />
              <Field label="Region" value={info.subdivisions.map((s) => s.name).join(" › ")} />
              <Field label="City" value={info.city} />
              <Field label="District" value={info.district} />
              <Field label="Postal code" value={info.postal} mono />
              <Field label="Continent" value={info.continent && `${info.continent.name} (${info.continent.code})`} />
              <Field label="Time zone" value={loc?.timeZone} mono />
              <Field
                label="Coordinates"
                mono
                value={hasCoords && (
                  <a
                    className="text-emerald-400 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=10/${loc.latitude}/${loc.longitude}`}
                  >
                    {loc.latitude}, {loc.longitude} ↗
                  </a>
                )}
              />
            </dl>
          </Card>}

          <Card title="Network">
            <dl>
              <Field label="BGP prefix" value={result.cidr} mono />
              <Field label="Range" value={result.start && `${result.start} – ${result.end}`} mono />
              <Field label="ASN" value={info.asn && `AS${info.asn.number}`} mono />
              <Field label="AS organization" value={info.asn?.org} />
              <Field label="AS name" value={info.asName} mono />
              <Field label="ISP" value={info.isp} />
              <Field label="Organization" value={info.organization} />
              <Field label="Reverse DNS" value={result.reverse} mono />
              <Field
                label="Flags"
                value={info.flags.map((f) => (
                  <span key={f} className="ml-1 rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">{f}</span>
                ))}
              />
            </dl>
          </Card>

          <details className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:col-span-2">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-zinc-500">
              Raw record · {result.sources.join(", ")}
            </summary>
            <pre className="mt-4 max-h-96 overflow-auto font-mono text-xs text-zinc-300">{JSON.stringify(result.raw, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

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

function RangeResult({ data }) {
  const [onlyLocated, setOnlyLocated] = useState(false);
  const segments = onlyLocated ? data.blocks.filter((s) => s.details) : data.blocks;
  const slug = (data.cidr ?? `${data.start}-${data.end}`).replace(/[^\w.:-]+/g, "_");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-xl text-zinc-50">{data.start} – {data.end}</h2>
        <span className="text-sm uppercase text-zinc-500">{data.type} · IPv{data.version}</span>
        {data.reserved && <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">{data.reserved}</span>}
      </div>

      {data.type === "range" && (
        <p className="font-mono text-xs text-zinc-400">
          <span className="text-zinc-500">CIDR:</span> {data.cidr}
        </p>
      )}

      {data.sampled && (
        <p className="text-xs text-zinc-500">
          Large range: blocks follow announced BGP prefixes (RIPEstat) and each block&apos;s location comes from its first
          address (ip-api.com).
        </p>
      )}

      {data.truncated && (
        <div className="rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Range is large — results stop at <span className="font-mono">{data.scannedUntil}</span>. Narrow the range to see the rest.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Addresses" value={fmt(data.total)} />
        <Stat label="With data" value={fmt(data.located)} />
        <Stat label="Blocks" value={data.blocks.length.toLocaleString()} />
        <Stat label="Countries / ASNs" value={`${data.summary.countries.length} / ${data.summary.asns.length}`} />
      </div>

      {(data.summary.countries.length > 0 || data.summary.asns.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.summary.countries.length > 0 && (
            <Card title="Countries by address count">
              <Bars items={data.summary.countries} total={data.located} label={(c) => `${flag(c.code)} ${c.name ?? c.code}`} />
            </Card>
          )}
          {data.summary.asns.length > 0 && (
            <Card title="Autonomous systems by address count">
              <Bars items={data.summary.asns} total={data.located} label={(a) => `AS${a.number} ${a.org ?? ""}`} />
            </Card>
          )}
        </div>
      )}

      <Card title="Blocks">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-zinc-400">
            <input type="checkbox" checked={onlyLocated} onChange={(e) => setOnlyLocated(e.target.checked)} />
            Hide blocks without data
          </label>
          <span className="flex-1" />
          <button type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-emerald-600"
            onClick={() => download(`${slug}.csv`, toCsv(data.blocks), "text/csv")}>Export CSV</button>
          <button type="button" className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-emerald-600"
            onClick={() => download(`${slug}.json`, JSON.stringify(data, null, 2), "application/json")}>Export JSON</button>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Block</th>
                <th className="py-2 pr-4 text-right font-medium">IPs</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 font-medium">ASN</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.start} className="border-t border-zinc-800/60 align-top">
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-200">
                    {s.cidrs.length === 1 && s.cidrs[0] !== "…" ? s.cidrs[0] : <>{s.start}<br />{s.end}</>}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs text-zinc-400">{fmt(s.count)}</td>
                  <td className={`py-2 pr-4 ${s.details ? "text-zinc-200" : "text-zinc-600"}`}>
                    {s.details?.country && <>{flag(s.details.country.code)} {place(s.details)}</>}
                  </td>
                  <td className="py-2 text-zinc-300">
                    {s.details?.asn ? <><span className="font-mono">AS{s.details.asn.number}</span> <span className="text-zinc-500">{s.details.asn.org}</span></> : ""}
                    {s.prefix && <div className="font-mono text-xs text-zinc-600">via {s.prefix}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 truncate font-mono text-lg text-zinc-50" title={value}>{value}</div>
    </div>
  );
}

function Bars({ items, total, label }) {
  const t = Number(total) || 1;
  return (
    <ul className="max-h-72 space-y-2 overflow-auto">
      {items.slice(0, 25).map((it, i) => {
        const pct = (Number(it.ips) / t) * 100;
        return (
          <li key={i} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate text-zinc-200">{label(it)}</span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">{fmt(it.ips)} · {pct.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
