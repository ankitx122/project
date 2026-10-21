"use client";

import { useEffect, useState } from "react";
import { Bookmark, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import GoogleButton from "@/components/auth/GoogleButton";
import Notice from "@/components/ui/Notice";
import { api, send } from "@/lib/api";
import WatchlistDetail from "./WatchlistDetail";

// Watchlists page: the user's lists on the left, the selected list (kept in ?list=) on the right.
export default function Watchlists() {
  const { user, loading } = useAuth();
  const [lists, setLists] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    api("/api/watchlists").then(
      (data) => {
        if (!active) return;
        setLists(data.lists);
        const wanted = new URLSearchParams(window.location.search).get("list");
        setSelectedId(data.lists.some((l) => l.id === wanted) ? wanted : (data.lists[0]?.id ?? null));
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [userId]);

  function select(id) {
    setSelectedId(id);
    window.history.replaceState(null, "", id ? `?list=${id}` : window.location.pathname);
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { list } = await send("/api/watchlists", "POST", { name });
      setLists((ls) => [list, ...ls]);
      setName("");
      select(list.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Keeps the sidebar (name, count, order) in step with edits made in the detail view.
  function onListChange(id, patch) {
    setLists((ls) => {
      if (patch === null) return ls.filter((l) => l.id !== id);
      const updated = ls.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l));
      return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
    if (patch === null) select(lists.find((l) => l.id !== id)?.id ?? null);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-zinc-900/60" aria-busy="true" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Bookmark className="h-5 w-5 text-emerald-400" />
        </span>
        <h1 className="text-[18px] font-semibold text-zinc-50">Sign in to use watchlists</h1>
        <p className="text-[13px] text-zinc-500">Save IPs, networks and hosts into named lists, with notes on each.</p>
        <GoogleButton returnTo="/watchlists" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50">Watchlists</h1>
        <p className="mt-1 text-[13px] text-zinc-500">Saved IPs, networks and hosts, grouped into lists, with your notes.</p>
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <form onSubmit={create} className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="New list"
              aria-label="New list name"
              className="h-9 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
            <button
              disabled={!name.trim() || creating}
              aria-label="Create list"
              className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </form>

          <nav aria-label="Watchlists" className="space-y-0.5">
            {lists === null && [0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-zinc-900/60" />)}
            {lists?.length === 0 && (
              <p className="px-1 py-2 text-[12.5px] leading-5 text-zinc-500">
                No lists yet. Create one here, or use <span className="text-zinc-300">Save</span> on any lookup.
              </p>
            )}
            {lists?.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => select(l.id)}
                aria-current={l.id === selectedId ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                  l.id === selectedId ? "bg-zinc-800/80 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 shrink-0 ${l.id === selectedId ? "text-emerald-400" : ""}`} />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="font-mono text-[11.5px] text-zinc-500">{l.itemCount}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {selectedId ? (
            <WatchlistDetail key={selectedId} id={selectedId} onChange={(patch) => onListChange(selectedId, patch)} />
          ) : (
            lists && (
              <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-16 text-center text-[13px] text-zinc-500">
                Create a list to start saving lookups.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
