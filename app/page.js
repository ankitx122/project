import { SOURCES } from "@/lib/geoip";
import Lookup from "./lookup";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">osint / geoip</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">IP Intelligence Lookup</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Look up an IP address, CIDR block, IP range or hostname to get country, city, coordinates, ASN,
          ISP and BGP routing data from live public sources.
        </p>
      </header>
      <Lookup sources={SOURCES} />
    </main>
  );
}
