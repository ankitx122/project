"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Check, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActionLink } from "@/components/lookup/ResultHeader";
import usePopover from "@/components/ui/usePopover";
import { api, send } from "@/lib/api";

// "Save" button + popover that adds lookups to the user's watchlists.
// items: [{ query, summary? }]. With a single item the popover also shows which lists already
// hold it (click again to remove) and takes an optional note.
export default function SaveToWatchlist({ items, label = "Save", align = "right" }) {
  const { user } = useAuth();
  const { open, setOpen, ref } = usePopover();
  const single = items.length === 1 ? items[0] : null;
  const [lists, setLists] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // list id being changed, or "new"
  const [added, setAdded] = useState({}); // list id -> true, for multi-item saves
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState("");

  const saved = single && lists?.some((l) => l.itemId);

  const singleQuery = single?.query;
  const signedIn = !!user;

  function load() {
    return api(`/api/watchlists${singleQuery ? `?q=${encodeURIComponent(singleQuery)}` : ""}`).then(
      (data) => {
        setLists(data.lists);
        setError(null);
      },
      (e) => setError(e.message),
    );
  }

  // For a single lookup, check up front whether it's already saved so the button can say so.
  useEffect(() => {
    if (!signedIn || !singleQuery) return;
    let active = true;
    api(`/api/watchlists?q=${encodeURIComponent(singleQuery)}`).then(
      (data) => active && setLists(data.lists),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [signedIn, singleQuery]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && user) load();
  }

  async function addTo(list) {
    const res = await send(`/api/watchlists/${list.id}/items`, "POST", {
      items: items.map((i) => ({ query: i.query, summary: i.summary, ...(single && note.trim() && { note }) })),
    });
    const itemId = single ? res.items[0]?.id : null;
    setLists((ls) => ls.map((l) => (l.id === list.id ? { ...l, itemId, itemCount: l.itemCount + (single ? 1 : items.length) } : l)));
    if (!single) setAdded((a) => ({ ...a, [list.id]: true }));
  }

  async function toggle(list) {
    setBusy(list.id);
    setError(null);
    try {
      if (single && list.itemId) {
        await send(`/api/watchlists/${list.id}/items/${list.itemId}`, "DELETE");
        setLists((ls) => ls.map((l) => (l.id === list.id ? { ...l, itemId: null, itemCount: l.itemCount - 1 } : l)));
      } else {
        await addTo(list);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function createList(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy("new");
    setError(null);
    try {
      const { list } = await send("/api/watchlists", "POST", { name: newName });
      setLists((ls) => [{ ...list, itemId: null }, ...(ls ?? [])]);
      setNewName("");
      await addTo(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <ActionLink as="button" type="button" onClick={toggleOpen} aria-haspopup="dialog" aria-expanded={open}>
        {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5" />}
        {saved ? "Saved" : label}
      </ActionLink>

      {open && (
        <div
          role="dialog"
          aria-label="Save to watchlist"
          className={`absolute top-10 z-40 w-72 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-left shadow-2xl shadow-black/50 ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="border-b border-zinc-800 px-3.5 py-2.5">
            <div className="text-[13px] font-medium text-zinc-100">Save to watchlist</div>
            <div className="truncate text-[12px] text-zinc-500">
              {single ? <span className="font-mono">{single.query}</span> : `${items.length.toLocaleString()} items`}
            </div>
          </div>

          {!user ? (
            <div className="space-y-3 p-3.5 text-[13px] text-zinc-400">
              <p>Sign in to keep watchlists of IPs and networks, with notes.</p>
              <Link href="/login" className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 font-medium text-white hover:bg-emerald-500">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              {single && (
                <div className="border-b border-zinc-800 p-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Note (optional), e.g. why you're watching it"
                    className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[12.5px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto p-1">
                {lists === null && !error && <div className="m-2 h-8 animate-pulse rounded bg-zinc-800/60" />}
                {lists?.length === 0 && <p className="px-2.5 py-3 text-[12.5px] text-zinc-500">No lists yet. Create one below.</p>}
                {lists?.map((l) => {
                  const on = single ? !!l.itemId : added[l.id];
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggle(l)}
                      disabled={busy !== null || (!single && on)}
                      title={single && on ? "Remove from this list" : "Add to this list"}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                          on ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-600"
                        }`}
                      >
                        {busy === l.id ? <Loader2 className="h-3 w-3 animate-spin text-zinc-300" /> : on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="font-mono text-[11.5px] text-zinc-500">{l.itemCount}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={createList} className="flex gap-1.5 border-t border-zinc-800 p-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={80}
                  placeholder="New list name"
                  className="h-8 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-[12.5px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                />
                <button
                  disabled={!newName.trim() || busy !== null}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[12.5px] font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create
                </button>
              </form>

              {error && <p className="border-t border-zinc-800 px-3 py-2 text-[12px] text-red-300">{error}</p>}
              <Link href="/watchlists" className="block border-t border-zinc-800 px-3.5 py-2 text-[12px] text-zinc-400 hover:text-zinc-100">
                Manage watchlists →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
