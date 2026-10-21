import Link from "next/link";
import { Map as MapIcon, MapPin } from "lucide-react";
import MiniMap from "@/components/geo/MiniMap";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Field, { FieldList } from "@/components/ui/Field";
import Flag from "@/components/ui/Flag";
import Section from "@/components/ui/Section";
import SaveToWatchlist from "@/components/watchlists/SaveToWatchlist";
import { isEmpty, place, summarize } from "@/lib/format";
import ResultHeader, { ActionLink, Dot } from "./ResultHeader";
import WhoisSection from "./WhoisSection";

const FLAG_LABELS = { proxy: "Proxy", hosting: "Hosting", mobile: "Mobile" };

export default function IpResult({ result, nested = false }) {
  const info = result.details;
  const loc = info?.location;
  const hasCoords = loc?.latitude != null && loc?.longitude != null;
  const mapHref = `/map?q=${encodeURIComponent(result.ip)}`;
  const hasLocation =
    info && [info.country, info.subdivisions, info.city, info.district, info.postal, info.continent, loc].some((v) => !isEmpty(v));
  const badges = [
    result.reserved && <Badge key="reserved" tone="warn">{result.reserved}</Badge>,
    ...(info?.flags ?? []).map((f) => <Badge key={f} tone={f === "proxy" ? "danger" : "neutral"}>{FLAG_LABELS[f] ?? f}</Badge>),
  ].filter(Boolean);

  return (
    <article className="space-y-5">
      <ResultHeader
        as={nested ? "h3" : "h2"}
        title={result.ip}
        copy={result.ip}
        meta={info && (
          <>
            {(info.city || info.country) && (
              <span className="inline-flex items-center gap-2">
                <Flag code={info.country?.code} />
                {place(info)}
              </span>
            )}
            {info.asn && (
              <>
                <Dot />
                <span>
                  <span className="font-mono text-zinc-300">AS{info.asn.number}</span> {info.asn.org}
                </span>
              </>
            )}
          </>
        )}
        badges={badges.length > 0 && badges}
        actions={
          <>
            <SaveToWatchlist key={result.ip} items={[{ query: result.ip, summary: summarize(result) }]} />
            {hasCoords && (
              <ActionLink as={Link} href={mapHref}>
                <MapIcon className="h-3.5 w-3.5" />
                Open in map
              </ActionLink>
            )}
          </>
        }
      />

      {!info ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-[13px] text-zinc-500">
          No data for this address{(result.reserved ?? result.notFoundReason) && <> — {result.reserved ?? result.notFoundReason}</>}.
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hasLocation && (
              <Section title="Location">
                <FieldList>
                  <Field label="Country" value={info.country && `${info.country.name} (${info.country.code})`} />
                  <Field label="Region" value={info.subdivisions.map((s) => s.name).join(" › ")} />
                  <Field label="City" value={info.city} />
                  <Field label="District" value={info.district} />
                  <Field label="Postal code" value={info.postal} mono />
                  <Field label="Continent" value={info.continent?.name} />
                  <Field label="Time zone" value={loc?.timeZone} mono />
                  <Field
                    label="Coordinates"
                    mono
                    value={hasCoords && (
                      <Link href={mapHref} title="Show on map" className="inline-flex items-center gap-1 text-emerald-400 hover:underline">
                        <MapPin className="h-3.5 w-3.5" />
                        {loc.latitude}, {loc.longitude}
                      </Link>
                    )}
                  />
                </FieldList>
              </Section>
            )}

            <Section title="Network">
              <FieldList>
                <Field label="ASN" value={info.asn && `AS${info.asn.number}`} mono />
                <Field label="AS organisation" value={info.asn?.org} />
                <Field label="AS name" value={info.asName} mono />
                <Field label="ISP" value={info.isp} />
                <Field label="Organisation" value={info.organization} />
                <Field label="BGP prefix" value={result.cidr} mono />
                <Field label="Prefix range" value={result.start && `${result.start} – ${result.end}`} mono />
                <Field label="Reverse DNS" value={result.reverse} mono />
              </FieldList>
            </Section>

            {hasCoords && (
              <Section
                title="Map"
                className="flex flex-col md:col-span-2 lg:col-span-1"
                bodyClassName="relative min-h-[260px] flex-1"
                actions={
                  <Link href={mapHref} className="text-[12px] text-zinc-400 hover:text-zinc-100">
                    Expand
                  </Link>
                }
              >
                <div className="absolute inset-0">
                  <MiniMap data={result} />
                </div>
              </Section>
            )}
          </div>

          {!result.reserved && <WhoisSection key={result.ip} query={result.ip} />}

          <details className="group rounded-lg border border-zinc-800">
            <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between px-4 py-2.5 text-[13px] text-zinc-400 hover:text-zinc-200">
              <span>
                Raw response <span className="text-zinc-600">· {result.sources.join(", ")}</span>
              </span>
              <span className="text-[12px] text-zinc-600 group-open:hidden">Show</span>
              <span className="hidden text-[12px] text-zinc-600 group-open:inline">Hide</span>
            </summary>
            <div className="relative border-t border-zinc-800">
              <div className="absolute right-2 top-2">
                <CopyButton value={JSON.stringify(result.raw, null, 2)} label="Copy JSON" />
              </div>
              <pre className="max-h-96 overflow-auto bg-zinc-950 p-4 font-mono text-[12px] leading-5 text-zinc-300">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </div>
          </details>
        </>
      )}
    </article>
  );
}
