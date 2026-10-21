"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Loader2, Play, X } from "lucide-react";
import GeoView from "@/components/geo/GeoView";
import { buildMarkers } from "@/components/geo/markers";
import Notice from "@/components/ui/Notice";
import StatStrip from "@/components/ui/StatStrip";
import SaveToWatchlist from "@/components/watchlists/SaveToWatchlist";
import { api, send } from "@/lib/api";
import { download, toCsv } from "@/lib/format";
import BulkTable, { filterRows } from "./BulkTable";
import extractIps from "./extractIps";

const MAX_IPS = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SAMPLE = `# Paste IPs, a CSV or log lines; addresses are picked out automatically.
8.8.8.8
1.1.1.1
9.9.9.9
208.67.222.222
2606:4700:4700::1111
Oct 21 12:30:45 sshd[812]: Failed password for root from 80.139.12.4 port 52144
GET /login 200 - 151.101.1.140:443`;

const NO_FILTERS = { text: "", country: "", flaggedOnly: false };

const rowsCsv = (rows) =>
  toCsv(
    ["ip", "country_code", "country", "region", "city", "latitude", "longitude", "asn", "as_org", "isp", "bgp_prefix", "reverse_dns", "flags"],
    rows.map((r) => {
      const d = r.details;
      return [
        r.ip, d?.country?.code, d?.country?.name, d?.subdivisions?.[0]?.name, d?.city, d?.location?.latitude, d?.location?.longitude,
        d?.asn?.number, d?.asn?.org, d?.isp, r.cidr, r.reverse, d?.flags?.join(" "),
      ];
    }),
  );

const summaryOf = (r) =>
  [[r.city, r.country].filter(Boolean).join(", "), [r.asn && `AS${r.asn}`, r.org].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

export default function BulkLookup() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [focusId, setFocusId] = useState(null);
  const [source, setSource] = useState(null); // name of the file or watchlist the text came from
  const fileRef = useRef(null);

  const ips = useMemo(() => extractIps(text), [text]);
  const tooMany = ips.length > MAX_IPS;

  // /bulk?list=<id> opens with the IPs saved in that watchlist.
  useEffect(() => {
    const listId = new URLSearchParams(window.location.search).get("list");
    if (!listId) return;
    api(`/api/watchlists/${encodeURIComponent(listId)}`).then(
      ({ list, items }) => {
        setText(items.filter((i) => i.kind === "ip").map((i) => i.query).join("\n"));
        setSource(`watchlist “${list.name}”`);
      },
      (e) => setError(e.message),
    );
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await send("/api/bulk", "POST", { items: ips }));
      setFilters(NO_FILTERS);
      setFocusId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("That file is larger than 5 MB.");
    setText(await file.text());
    setSource(`file ${file.name}`);
    setError(null);
  }

  const rows = useMemo(() => (result ? filterRows(result.results, filters) : []), [result, filters]);
  const markers = useMemo(() => buildMarkers({ type: "host", results: rows }), [rows]);
  const countries = useMemo(() => {
    const byCode = new Map();
    for (const r of result?.results ?? []) {
      const c = r.details?.country;
      if (c) byCode.set(c.code, { ...c, count: (byCode.get(c.code)?.count ?? 0) + 1 });
    }
    return [...byCode.values()].sort((a, b) => b.count - a.count);
  }, [result]);
  const stats = useMemo(() => {
    const list = result?.results ?? [];
    return {
      networks: new Set(list.map((r) => r.details?.asn?.number).filter(Boolean)).size,
      flagged: list.filter((r) => r.details?.flags?.length).length,
    };
  }, [result]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50">Bulk lookup</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Paste a list of IPs, a CSV or log lines, or upload a file. Up to {MAX_IPS} addresses at a time.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 focus-within:border-zinc-700">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSource(null);
          }}
          rows={9}
          spellCheck={false}
          aria-label="IP addresses"
          placeholder={"8.8.8.8\n1.1.1.1\n2606:4700:4700::1111\n…or paste log lines; IPs are picked out automatically."}
          className="block w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <footer className="flex flex-wrap items-center gap-2 border-t border-zinc-800 px-3 py-2">
          <span className={`text-[12.5px] ${tooMany ? "text-red-300" : "text-zinc-400"}`}>
            <span className="font-mono tabular-nums">{ips.length.toLocaleString()}</span> unique IP{ips.length === 1 ? "" : "s"} found
            {tooMany && ` (limit ${MAX_IPS})`}
            {source && <span className="text-zinc-600"> · from {source}</span>}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!text && (
              <button type="button" onClick={() => setText(SAMPLE)} className="h-8 px-2 text-[12.5px] text-zinc-400 hover:text-zinc-100">
                Try a sample
              </button>
            )}
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setSource(null);
                }}
                className="inline-flex h-8 items-center gap-1 px-2 text-[12.5px] text-zinc-400 hover:text-zinc-100"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <input ref={fileRef} type="file" accept=".txt,.csv,.log,.tsv,text/*" onChange={onFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 text-[13px] text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/70"
            >
              <FileUp className="h-3.5 w-3.5" />
              Upload file
            </button>
            <button
              type="button"
              onClick={run}
              disabled={loading || !ips.length || tooMany}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {loading ? "Looking up…" : `Look up ${ips.length ? ips.length.toLocaleString() : ""}`}
            </button>
          </div>
        </footer>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {result && (
        <div className={`space-y-5 transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium text-zinc-100">
              Results
              {rows.length !== result.results.length && (
                <span className="ml-2 text-[13px] font-normal text-zinc-500">
                  {rows.length.toLocaleString()} of {result.results.length.toLocaleString()} shown
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <SaveToWatchlist
                key={rows.length}
                label={rows.length === result.results.length ? "Save all" : `Save ${rows.length}`}
                items={rows.map((r) => ({ query: r.ip, summary: summaryOf(r) }))}
              />
              <button
                type="button"
                onClick={() => download("bulk-lookup.csv", rowsCsv(rows), "text/csv")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 text-[13px] text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/70"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => download("bulk-lookup.json", JSON.stringify(rows, null, 2), "application/json")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 text-[13px] text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/70"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </button>
            </div>
          </div>

          <StatStrip
            items={[
              { label: "IP addresses", value: result.total.toLocaleString() },
              { label: "With data", value: result.located.toLocaleString() },
              { label: "Countries", value: countries.length.toLocaleString() },
              { label: "Networks", value: stats.networks.toLocaleString() },
              { label: "Proxy / hosting", value: stats.flagged.toLocaleString() },
            ]}
          />

          {result.invalidCount > 0 && (
            <Notice>
              Skipped {result.invalidCount} entr{result.invalidCount === 1 ? "y" : "ies"} that aren&apos;t IP addresses
              {result.invalid.length > 0 && <>: <span className="font-mono">{result.invalid.slice(0, 5).join(", ")}</span></>}
              {result.invalidCount > 5 && "…"}
            </Notice>
          )}

          {markers.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <GeoView markers={markers} focusId={focusId} className="h-[380px]" />
            </div>
          )}

          <BulkTable
            rows={rows}
            filters={filters}
            setFilters={setFilters}
            countries={countries}
            focusId={focusId}
            onFocus={setFocusId}
          />
          <p className="text-[12px] text-zinc-600">
            Click a location to find it on the map. Data from {result.sources.join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}
