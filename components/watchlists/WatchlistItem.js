"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Map as MapIcon, Pencil, StickyNote, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { KIND_LABELS, timeAgo } from "@/lib/format";

const iconButton = "rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200";

export default function WatchlistItem({ item, onSaveNote, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      if (await onSaveNote(item, draft)) setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="group px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/?q=${encodeURIComponent(item.query)}`} className="truncate font-mono text-[13.5px] text-zinc-100 hover:text-emerald-300">
              {item.query}
            </Link>
            <Badge>{KIND_LABELS[item.kind] ?? item.kind}</Badge>
          </div>
          {item.summary && <div className="mt-0.5 truncate text-[12.5px] text-zinc-500">{item.summary}</div>}
        </div>
        <time dateTime={item.createdAt} title={`Added ${new Date(item.createdAt).toLocaleString()}`} className="shrink-0 pt-0.5 text-[12px] text-zinc-600">
          {timeAgo(item.createdAt)}
        </time>
        <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} title={item.note ? "Edit note" : "Add note"} aria-label="Edit note" className={iconButton}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {item.kind !== "host" && (
            <Link href={`/map?q=${encodeURIComponent(item.query)}`} title="Open in map" aria-label={`Open ${item.query} in map`} className={iconButton}>
              <MapIcon className="h-3.5 w-3.5" />
            </Link>
          )}
          <button type="button" onClick={() => onRemove(item)} title="Remove from list" aria-label={`Remove ${item.query}`} className={`${iconButton} hover:text-red-300`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            rows={3}
            maxLength={2000}
            placeholder="Why you're watching it, who reported it, ticket numbers…"
            className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] leading-5 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[12.5px] font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.note ?? "");
                setEditing(false);
              }}
              className="h-7 px-2 text-[12.5px] text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </button>
            <span className="ml-auto text-[11.5px] text-zinc-600">⌘ Enter to save</span>
          </div>
        </div>
      ) : (
        item.note && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 flex w-full items-start gap-2 rounded-md border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-left text-[13px] leading-5 text-zinc-300 hover:border-zinc-700"
          >
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" />
            <span className="whitespace-pre-wrap break-words">{item.note}</span>
          </button>
        )
      )}
    </li>
  );
}
