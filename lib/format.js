// Client-safe formatting helpers shared by the lookup and map components.

export const fmt = (n) => BigInt(n).toLocaleString("en-US");

export function place(info) {
  if (!info) return "";
  return [info.city, info.subdivisions?.[0]?.name, info.country?.name].filter(Boolean).join(", ");
}

export const isEmpty = (v) => v == null || v === false || v === "" || (Array.isArray(v) && !v.length);

const RELATIVE = [
  [60, "second", 1],
  [3600, "minute", 60],
  [86400, "hour", 3600],
  [604800, "day", 86400],
  [2629800, "week", 604800],
  [31557600, "month", 2629800],
  [Infinity, "year", 31557600],
];

// "3 minutes ago", "yesterday", ...
export function timeAgo(date) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const [, unit, size] = RELATIVE.find(([limit]) => Math.abs(seconds) < limit);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
