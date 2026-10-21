"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Layers, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ActionLink } from "@/components/lookup/ResultHeader";
import Notice from "@/components/ui/Notice";
import {
  addWatchlistItems,
  deleteWatchlist,
  getWatchlist,
  removeWatchlistItem,
  updateWatchlist,
  updateWatchlistItem,
} from "@/services/api";
import { download, formatDate, toCsv } from "@/lib/format";
import WatchlistItem from "./WatchlistItem";

const INPUT =
  "h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";

export default function WatchlistDetail({ id, onChange }) {
  const [list, setList] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [adding, setAdding] = useState({ query: "", note: "", busy: false });
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let active = true;
    getWatchlist(id).then(
      (data) => {
        if (!active) return;
        setList(data.list);
        setItems(data.items);
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [id]);

  async function attempt(fn) {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    await attempt(async () => {
      const { list: updated } = await updateWatchlist(id, draft);
      setList((l) => ({ ...l, ...updated }));
      onChange({ name: updated.name, description: updated.description });
      setEditing(false);
    });
  }

  async function removeList() {
    if (!window.confirm(`Delete “${list.name}” and its ${items.length} saved item${items.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    await attempt(async () => {
      await deleteWatchlist(id);
      onChange(null);
    });
  }

  async function addItem(e) {
    e.preventDefault();
    if (!adding.query.trim()) return;
    setAdding((a) => ({ ...a, busy: true }));
    await attempt(async () => {
      const { items: added } = await addWatchlistItems(id, [{ query: adding.query, note: adding.note }]);
      const next = [...added, ...items.filter((i) => !added.some((a) => a.id === i.id))];
      setItems(next);
      onChange({ itemCount: next.length });
      setAdding({ query: "", note: "", busy: false });
    });
    setAdding((a) => ({ ...a, busy: false }));
  }

  const saveNote = (item, note) =>
    attempt(async () => {
      const { item: updated } = await updateWatchlistItem(id, item.id, { note });
      setItems((is) => is.map((i) => (i.id === item.id ? updated : i)));
      return true;
    });

  const removeItem = (item) =>
    attempt(async () => {
      await removeWatchlistItem(id, item.id);
      const next = items.filter((i) => i.id !== item.id);
      setItems(next);
      onChange({ itemCount: next.length });
    });

  if (!list) {
    return error ? <Notice tone="error">{error}</Notice> : <div className="h-64 animate-pulse rounded-lg bg-zinc-900/60" aria-busy="true" />;
  }

  const needle = filter.trim().toLowerCase();
  const shown = needle ? items.filter((i) => [i.query, i.summary, i.note].some((v) => v?.toLowerCase().includes(needle))) : items;
  const ipCount = items.filter((i) => i.kind === "ip").length;
  const slug = list.name.replace(/[^\w.-]+/g, "_").toLowerCase();

  return (
    <div className="space-y-5">
      {editing ? (
        <form onSubmit={saveDetails} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            maxLength={80}
            autoFocus
            aria-label="List name"
            className={`${INPUT} w-full text-[15px] font-medium`}
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            maxLength={500}
            rows={2}
            placeholder="Description (optional)"
            aria-label="Description"
            className={`${INPUT} h-auto w-full resize-y py-2`}
          />
          <div className="flex gap-2">
            <button disabled={!draft.name.trim()} className="h-8 rounded-md bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-8 px-2 text-[13px] text-zinc-400 hover:text-zinc-100">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[20px] font-semibold tracking-tight text-zinc-50">{list.name}</h2>
              <button
                type="button"
                onClick={() => {
                  setDraft({ name: list.name, description: list.description ?? "" });
                  setEditing(true);
                }}
                title="Rename or describe"
                aria-label="Edit list details"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            {list.description && <p className="mt-1 whitespace-pre-line text-[13px] text-zinc-400">{list.description}</p>}
            <p className="mt-1 text-[12px] text-zinc-600">
              {items.length.toLocaleString()} item{items.length === 1 ? "" : "s"} · created {formatDate(list.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {ipCount > 0 && (
              <ActionLink as={Link} href={`/bulk?list=${id}`} title="Look up every IP in this list at once">
                <Layers className="h-3.5 w-3.5" />
                Bulk lookup
              </ActionLink>
            )}
            {items.length > 0 && (
              <ActionLink
                as="button"
                type="button"
                onClick={() =>
                  download(
                    `${slug}.csv`,
                    toCsv(["query", "type", "summary", "note", "added"], items.map((i) => [i.query, i.kind, i.summary, i.note, i.createdAt])),
                    "text/csv",
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </ActionLink>
            )}
            <button
              type="button"
              onClick={removeList}
              title="Delete list"
              aria-label="Delete list"
              className="grid h-8 w-8 place-items-center rounded-md border border-zinc-800 text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <form onSubmit={addItem} className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
        <input
          value={adding.query}
          onChange={(e) => setAdding((a) => ({ ...a, query: e.target.value }))}
          placeholder="IP, CIDR, range or hostname"
          aria-label="Add to list"
          spellCheck={false}
          autoCapitalize="off"
          className={`${INPUT} min-w-[12rem] flex-1 font-mono placeholder:font-sans`}
        />
        <input
          value={adding.note}
          onChange={(e) => setAdding((a) => ({ ...a, note: e.target.value }))}
          placeholder="Note (optional)"
          aria-label="Note"
          maxLength={2000}
          className={`${INPUT} min-w-[10rem] flex-1`}
        />
        <button
          disabled={!adding.query.trim() || adding.busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {adding.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </form>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
        {items.length > 5 && (
          <div className="relative border-b border-zinc-800">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter this list"
              aria-label="Filter this list"
              className="h-10 w-full bg-transparent pl-10 pr-4 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
        )}
        {items.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] leading-6 text-zinc-500">
            This list is empty. Add an IP above, or use <span className="text-zinc-300">Save</span> on any lookup or bulk result.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-zinc-500">Nothing in this list matches “{filter}”.</p>
        ) : (
          <ul className="max-h-[36rem] divide-y divide-zinc-800/70 overflow-y-auto overscroll-contain">
            {shown.map((item) => (
              <WatchlistItem key={item.id} item={item} onSaveNote={saveNote} onRemove={removeItem} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
