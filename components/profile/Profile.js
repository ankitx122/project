"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, Map as MapIcon, Search, Trash2 } from "lucide-react";
import Avatar from "@/components/auth/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import GoogleButton from "@/components/auth/GoogleButton";
import Badge from "@/components/ui/Badge";
import Notice from "@/components/ui/Notice";
import Section from "@/components/ui/Section";
import StatStrip from "@/components/ui/StatStrip";
import { api } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";

const KIND_LABELS = { ip: "IP", host: "Hostname", cidr: "CIDR", range: "Range" };

export default function Profile() {
  const { user, loading, refresh, signOut } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState({ items: null, error: null });

  const userId = user?.id;

  // Load history, and refresh the user so the search count includes lookups made since the app loaded.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    api("/api/me/history?limit=100").then(
      (data) => active && setHistory({ items: data.items, error: null }),
      (e) => active && setHistory({ items: [], error: e.message }),
    );
    refresh();
    return () => {
      active = false;
    };
  }, [userId, refresh]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-900/60" aria-busy="true" />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
        <h1 className="text-[18px] font-semibold text-zinc-50">Sign in to see your profile</h1>
        <p className="text-[13px] text-zinc-500">Your account details and search history live here.</p>
        <GoogleButton returnTo="/profile" />
      </div>
    );
  }

  async function clearHistory() {
    if (!window.confirm("Delete your entire search history? This can't be undone.")) return;
    await api("/api/me/history", { method: "DELETE" });
    setHistory({ items: [], error: null });
    refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-zinc-50">{user.name || user.email}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
              <span className="truncate">{user.email}</span>
              {user.emailVerified && (
                <span title="Verified by Google" className="inline-flex">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 text-[13px] text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </header>

      <StatStrip
        items={[
          { label: "Searches", value: (user.searchCount ?? 0).toLocaleString() },
          { label: "Member since", value: formatDate(user.createdAt) },
          { label: "Last sign-in", value: timeAgo(user.lastLoginAt) },
          { label: "Sign-in method", value: "Google" },
        ]}
      />

      <Section
        title="Search history"
        bodyClassName=""
        actions={
          history.items?.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400 transition-colors hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear history
            </button>
          )
        }
      >
        {history.error && (
          <div className="p-4">
            <Notice tone="error">{history.error}</Notice>
          </div>
        )}
        {history.items === null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded bg-zinc-800/60" />)}
          </div>
        ) : history.items.length === 0 ? (
          !history.error && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-[13px] text-zinc-500">No searches yet. Lookups you make while signed in appear here.</p>
              <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-emerald-400 hover:underline">
                <Search className="h-3.5 w-3.5" />
                Start a lookup
              </Link>
            </div>
          )
        ) : (
          <ul className="divide-y divide-zinc-800/70">
            {history.items.map((h) => (
              <li key={h.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-900/60">
                <Link href={`/?q=${encodeURIComponent(h.query)}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="truncate font-mono text-[13px] text-zinc-100">{h.query}</span>
                  <Badge>{KIND_LABELS[h.kind] ?? h.kind}</Badge>
                  <span className="hidden min-w-0 truncate text-[12.5px] text-zinc-500 sm:inline">{h.summary}</span>
                </Link>
                <time dateTime={h.createdAt} title={new Date(h.createdAt).toLocaleString()} className="shrink-0 text-[12px] text-zinc-500">
                  {timeAgo(h.createdAt)}
                </time>
                <Link
                  href={`/map?q=${encodeURIComponent(h.query)}`}
                  title="Open in map"
                  aria-label={`Open ${h.query} in map`}
                  className="rounded-md p-1 text-zinc-500 opacity-0 transition hover:bg-zinc-800 hover:text-zinc-200 focus:opacity-100 group-hover:opacity-100"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
