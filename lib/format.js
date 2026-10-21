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

export function timeAgo(date) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const [, unit, size] = RELATIVE.find(([limit]) => Math.abs(seconds) < limit);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });

export const KIND_LABELS = { ip: "IP", host: "Hostname", cidr: "CIDR", range: "Range" };

export function summarize(data) {
  const owner = (d) => [d.asn && `AS${d.asn}`, d.org].filter(Boolean).join(" ");
  if (data.type === "ip") return [[data.city, data.country].filter(Boolean).join(", "), owner(data)].filter(Boolean).join(" · ");
  if (data.type === "host") return `${data.results.length} address${data.results.length === 1 ? "" : "es"}`;
  const countries = data.summary.countries.length;
  return `${fmt(data.total)} addresses · ${countries} countr${countries === 1 ? "y" : "ies"}`;
}

export function toCsv(cols, rows) {
  const esc = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
