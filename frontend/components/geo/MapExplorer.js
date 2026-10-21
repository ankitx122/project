"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MapPinOff } from "lucide-react";
import { buildMarkers } from "./markers";
import GeoView from "./GeoView";
import LocationList from "./LocationList";
import { EXAMPLES, QueryList } from "@/components/lookup/EmptyState";
import Notices from "@/components/lookup/Notices";
import SearchBar from "@/components/lookup/SearchBar";
import useLookup from "@/components/lookup/useLookup";

function subject(data) {
  if (data.type === "ip") return data.ip;
  if (data.type === "host") return data.host;
  return data.type === "cidr" ? data.cidr : `${data.start} – ${data.end}`;
}

export default function MapExplorer() {
  const lookup = useLookup();
  const { data, error, loading, searched, run } = lookup;
  const markers = useMemo(() => buildMarkers(data), [data]);
  const [focus, setFocus] = useState({ id: null, for: null });
  const focusId = focus.for === data ? focus.id : null;
  const totalIps = markers.reduce((n, m) => n + m.count, 0);

  return (
    <div className="grid lg:h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-[360px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-zinc-800 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-zinc-800 p-4">
          <SearchBar {...lookup} />
          <Notices error={error} data={data} />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {loading && !data ? (
            <div className="space-y-2 p-2" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-md bg-zinc-900" />)}
            </div>
          ) : data ? (
            <div className={`transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
              <div className="px-3 pb-3 pt-2">
                <div className="truncate font-mono text-[15px] text-zinc-100">{subject(data)}</div>
                <div className="mt-0.5 text-[12px] text-zinc-500">
                  {markers.length
                    ? `${markers.length} location${markers.length === 1 ? "" : "s"}${totalIps > 1 ? ` · ${totalIps.toLocaleString()} addresses` : ""}`
                    : "No coordinates to plot"}
                </div>
              </div>
              {markers.length > 0 ? (
                <LocationList markers={markers} focusId={focusId} onFocus={(id) => setFocus({ id, for: data })} />
              ) : (
                <div className="mx-3 flex items-center gap-2 rounded-md border border-dashed border-zinc-800 px-3 py-4 text-[13px] text-zinc-500">
                  <MapPinOff className="h-4 w-4" />
                  This result has no location data.
                </div>
              )}
            </div>
          ) : (
            !error && (
              <div className="p-2">
                <p className="px-1 pb-3 text-[13px] text-zinc-500">Search to plot results, or start from an example.</p>
                <QueryList title="Examples" items={EXAMPLES} run={run} />
              </div>
            )
          )}
        </div>

        {data && (
          <div className="border-t border-zinc-800 p-3">
            <Link
              href={`/?q=${encodeURIComponent(searched)}`}
              className="flex items-center justify-between rounded-md px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
            >
              Open full details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </aside>

      <GeoView markers={markers} focusId={focusId} className="h-[60vh] lg:h-full" />
    </div>
  );
}
