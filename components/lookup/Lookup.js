"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { buildMarkers } from "@/components/geo/markers";
import ResultSkeleton from "@/components/ui/Skeleton";
import SaveToWatchlist from "@/components/watchlists/SaveToWatchlist";
import { summarize } from "@/lib/format";
import { Features, HeroSuggestions } from "./EmptyState";
import Notices from "./Notices";
import ResultHeader, { ActionLink } from "./ResultHeader";
import SearchBar from "./SearchBar";
import useLookup from "./useLookup";

// Result views are split out and only load once there is a result of that type.
const IpResult = dynamic(() => import("./IpResult"), { loading: ResultSkeleton });
const RangeResult = dynamic(() => import("./RangeResult"), { loading: ResultSkeleton });

export default function Lookup() {
  const lookup = useLookup();
  const { data, error, loading, history, run, searched } = lookup;

  // Before the first search the page is a hero; afterwards a compact results layout. The search
  // box stays at the same place in the tree in both, so it keeps focus and input across the switch.
  const idle = !data && !loading && !error;

  return (
    <div className="relative isolate">
      {idle && <div aria-hidden className="hero-backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]" />}

      <div className={`mx-auto w-full px-4 sm:px-6 ${idle ? "max-w-3xl pb-16 pt-16 sm:pt-24" : "max-w-6xl pb-16 pt-10"}`}>
        <div className={idle ? "text-center" : "mb-6"}>
          {idle ? (
            <>
              <h1 className="text-balance text-[34px] font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-[52px]">
                Trace any IP address.
                <span className="block text-zinc-500">Location, owner and routing.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-6 text-zinc-400">
                Look up an IP, CIDR block, range or hostname to see where it is, who runs it and how it&apos;s routed, from live public data.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50">Lookup</h1>
              <p className="mt-1 text-[13px] text-zinc-500">
                Geolocation, ownership and routing for any IP address, CIDR block, range or hostname.
              </p>
            </>
          )}
        </div>

        <div className={idle ? "mt-9" : ""}>
          <SearchBar {...lookup} size={idle ? "lg" : "md"} />
        </div>

        {idle ? (
          <HeroSuggestions run={run} history={history} />
        ) : (
          <div className="mt-8 space-y-8">
            <Notices error={error} data={data} />
            {data ? (
              // Keep the current result on screen (dimmed) while the next search loads, so nothing blinks.
              <div className={`transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
                <Result data={data} query={searched} />
              </div>
            ) : (
              loading && <ResultSkeleton />
            )}
          </div>
        )}
      </div>

      {idle && <Features />}
    </div>
  );
}

function Result({ data, query }) {
  if (data.type === "ip") return <IpResult result={data} />;
  if (data.type === "cidr" || data.type === "range") return <RangeResult data={data} query={query} />;

  const mapped = buildMarkers(data).length;
  return (
    <div className="space-y-8">
      <ResultHeader
        title={data.host}
        copy={data.host}
        meta={`Resolves to ${data.results.length} address${data.results.length === 1 ? "" : "es"}`}
        actions={
          <>
            <SaveToWatchlist key={query} items={[{ query, summary: summarize(data) }]} />
            {mapped > 0 && (
              <ActionLink as={Link} href={`/map?q=${encodeURIComponent(query)}`}>
                <MapIcon className="h-3.5 w-3.5" />
                Open in map
              </ActionLink>
            )}
          </>
        }
      />
      <div className="divide-y divide-zinc-800">
        {data.results.map((r) => (
          <div key={r.ip} className="py-8 first:pt-0 last:pb-0">
            <IpResult result={r} nested />
          </div>
        ))}
      </div>
    </div>
  );
}
