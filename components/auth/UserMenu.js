"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import Avatar from "./Avatar";
import { useAuth } from "./AuthProvider";

export default function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) return <span className="h-7 w-7 animate-pulse rounded-full bg-zinc-800" aria-hidden />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-900/60 px-3 text-[13px] text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full outline-none ring-emerald-500/40 transition focus-visible:ring-2"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-40 w-64 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50"
        >
          <div className="border-b border-zinc-800 px-3.5 py-3">
            <div className="truncate text-[13px] font-medium text-zinc-100">{user.name || "Signed in"}</div>
            <div className="truncate text-[12px] text-zinc-500">{user.email}</div>
          </div>
          <div className="p-1">
            <Link
              role="menuitem"
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
