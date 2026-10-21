"use client";

import { useEffect, useRef } from "react";
import { CornerDownLeft, Loader2, Search, X } from "lucide-react";

const SIZES = {
  md: {
    input: "h-11 rounded-lg pl-10 pr-36 text-[14px]",
    icon: "left-3.5 h-4 w-4",
    clear: "right-[6.75rem]",
    submit: "right-1.5 h-8 px-3",
  },
  lg: {
    input: "h-14 rounded-xl pl-12 pr-40 text-[15px] shadow-2xl shadow-black/40",
    icon: "left-4 h-5 w-5",
    clear: "right-[7.5rem]",
    submit: "right-2 h-10 px-4",
  },
};

const isTyping = (el) => el?.closest?.("input, textarea, select, [contenteditable='true']");

export default function SearchBar({ query, setQuery, run, loading, autoFocus = true, size = "md" }) {
  const inputRef = useRef(null);
  const hasQuery = query.length > 0;
  const s = SIZES[size];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); run(query); }} className="relative">
      <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-500 ${s.icon}`} />
      <input
        ref={inputRef}
        aria-label="IP, CIDR, range or hostname"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && hasQuery && setQuery("")}
        placeholder="Search an IP, CIDR, range or hostname"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoFocus={autoFocus}
        className={`w-full border border-zinc-800 bg-zinc-900/60 font-mono text-zinc-100 outline-none transition placeholder:font-sans placeholder:text-zinc-500 hover:border-zinc-700 focus:border-emerald-500/60 focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 ${s.input}`}
      />
      {hasQuery ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          title="Clear (Esc)"
          className={`absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 ${s.clear}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd
          title="Press / to search"
          className={`pointer-events-none absolute top-1/2 hidden h-6 -translate-y-1/2 place-items-center rounded border border-zinc-700/80 px-1.5 font-mono text-[11px] text-zinc-500 sm:grid ${s.clear}`}
        >
          /
        </kbd>
      )}
      <button
        disabled={loading || !query.trim()}
        className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-md bg-emerald-600 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 ${s.submit}`}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CornerDownLeft className="h-3.5 w-3.5" />}
        {loading ? "Searching" : "Search"}
      </button>
    </form>
  );
}
