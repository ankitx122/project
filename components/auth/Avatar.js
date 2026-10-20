"use client";

import { useState } from "react";

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-[13px]", lg: "h-16 w-16 text-[20px]" };

function initials(user) {
  const source = user?.name || user?.email || "?";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function Avatar({ user, size = "sm" }) {
  const [failed, setFailed] = useState(false);
  const cls = `${SIZES[size]} shrink-0 rounded-full ring-1 ring-white/10`;
  if (user?.avatarUrl && !failed) {
    return (
      // Google profile photos can refuse requests that carry a referrer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${cls} object-cover`} />
    );
  }
  return (
    <span className={`${cls} grid place-items-center bg-emerald-500/15 font-medium text-emerald-300`} aria-hidden>
      {initials(user)}
    </span>
  );
}
