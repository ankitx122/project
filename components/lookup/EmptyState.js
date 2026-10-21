"use client";

import { ChevronRight, Globe2, MapPin, Network, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export const EXAMPLES = [
  { q: "8.8.8.8", label: "IPv4 address" },
  { q: "2001:4860:4860::8888", label: "IPv6 address" },
  { q: "1.1.1.0/24", label: "CIDR block" },
  { q: "8.8.8.0 - 8.8.8.20", label: "Address range" },
  { q: "example.com", label: "Hostname" },
];

const COVERAGE = [
  { Icon: MapPin, title: "Location", text: "Country, region, city, postal code, coordinates and time zone." },
  { Icon: Network, title: "Network", text: "ASN, owning organisation, ISP, reverse DNS and the announced BGP prefix." },
  { Icon: ShieldAlert, title: "Signals", text: "Proxy, hosting and mobile flags, plus private and reserved ranges." },
  { Icon: Globe2, title: "Ranges", text: "CIDRs and ranges are split into routed blocks with per-country and per-ASN totals." },
];

export function QueryList({ title, items, run }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <h2 className="border-b border-zinc-800 bg-zinc-900/40 px-4 py-2 text-[12px] font-medium text-zinc-400">{title}</h2>
      <ul className="divide-y divide-zinc-800/70">
        {items.map(({ q, label }) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => run(q)}
              className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-900/70"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-200">{q}</span>
              {label && <span className="shrink-0 text-[12px] text-zinc-500">{label}</span>}
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ children, onClick, title, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full border px-3 py-1 font-mono text-[12.5px] transition-colors ${
        muted
          ? "border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-200"
      }`}
    >
      {children}
    </button>
  );
}

export function HeroSuggestions({ run, history }) {
  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-[12px] text-zinc-500">Try</span>
        {EXAMPLES.map(({ q, label }) => (
          <Chip key={q} onClick={() => run(q)} title={label}>
            {q}
          </Chip>
        ))}
      </div>
      {history.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[12px] text-zinc-500">Recent</span>
          {history.slice(0, 3).map((q) => (
            <Chip key={q} onClick={() => run(q)} muted>
              {q}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

export function Features() {
  const { user } = useAuth();
  return (
    <section aria-label="What you get" className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
        {COVERAGE.map(({ Icon, title, text }) => (
          <div key={title} className="bg-zinc-950 p-5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
              <Icon className="h-4 w-4 text-emerald-400" />
            </span>
            <h2 className="mt-4 text-[14px] font-medium text-zinc-100">{title}</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-zinc-500">{text}</p>
          </div>
        ))}
      </div>
      {!user && (
        <p className="mt-6 text-center text-[12px] text-zinc-500">Sign in to keep a history of your lookups.</p>
      )}
    </section>
  );
}
