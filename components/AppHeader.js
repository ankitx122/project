"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map as MapIcon, Radar, Search } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";

const LINKS = [
  { href: "/", label: "Lookup", Icon: Search },
  { href: "/map", label: "Map", Icon: MapIcon },
];

export default function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
      <div className="flex h-14 items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="IP Intelligence home"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[14px] font-semibold tracking-tight text-zinc-100">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
            <Radar className="h-4 w-4 text-emerald-400" />
          </span>
          <span className="hidden sm:inline">IP Intelligence</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors ${
                  active ? "bg-zinc-800/80 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
