import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata = {
  title: "Page not found · IP Intelligence",
};

export default function NotFound() {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
      <div aria-hidden className="hero-backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" />
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Compass className="h-6 w-6 text-emerald-400" />
        </span>
        <p className="mt-6 font-mono text-[13px] text-emerald-400">404</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-50">Page not found</h1>
        <p className="mt-3 text-[14px] leading-6 text-zinc-400">
          This address doesn&apos;t match any page. Check the URL, or head back to the lookup.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[14px] font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lookup
        </Link>
      </div>
    </main>
  );
}
