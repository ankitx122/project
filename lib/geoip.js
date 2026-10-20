import { lookup as dnsLookup } from "node:dns/promises";
import { bigIntToIp, ipToBigInt, parseQuery, rangeToCidrs } from "./ip.js";

// Live data sources (no local database):
//  - ip-api.com: geolocation, ASN, ISP and proxy/hosting flags per IP. The free endpoint is
//    HTTP-only, non-commercial and rate limited (45 single / 15 batch requests per minute);
//    set IP_API_KEY to use the commercial HTTPS endpoint instead.
//  - RIPEstat: BGP routing data (announced prefixes and their origin ASNs), free, no key.
const IP_API_KEY = process.env.IP_API_KEY;
const IP_API_BASE = IP_API_KEY ? "https://pro.ip-api.com" : "http://ip-api.com";
const IP_API_FIELDS =
  "status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
const RIPESTAT = "https://stat.ripe.net/data";
const TIMEOUT_MS = 15000;

const PER_IP_LIMIT = 256; // ranges up to this size get every address geolocated
const MAX_BLOCKS = 300; // larger ranges get one geolocation sample per routed block
const MAX_RANGE_CIDRS = 16;

export const SOURCES = [
  { name: "ip-api.com", url: "https://ip-api.com", provides: "geolocation, ASN, ISP, proxy/hosting flags" },
  { name: "RIPEstat", url: "https://stat.ripe.net", provides: "BGP prefixes and origin ASNs" },
];

class LookupError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// --- Small TTL cache so repeat searches don't burn rate limit ---------------------------------

const cache = (globalThis.__osintCache ??= new Map());
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 20000;

function cacheGet(key) {
  const hit = cache.get(key);
  return hit && hit.expires > Date.now() ? hit : null;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchJson(url, init, label, retries = 1) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    if (retries > 0) return fetchJson(url, init, label, retries - 1);
    throw new LookupError(`${label} request failed: ${e.name === "TimeoutError" ? "timed out" : e.message}`, 502);
  }
  if (res.status >= 500 && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetchJson(url, init, label, retries - 1);
  }
  if (res.status === 429) {
    const wait = res.headers.get("x-ttl");
    throw new LookupError(`${label} rate limit reached${wait ? `, retry in ${wait}s` : ""}`, 429);
  }
  if (!res.ok) throw new LookupError(`${label} returned HTTP ${res.status}`, 502);
  return res.json();
}

// --- ip-api.com -------------------------------------------------------------------------------

async function ipApiBatch(ips) {
  const out = new Map();
  const missing = [];
  for (const ip of ips) {
    const hit = cacheGet(`ipapi:${ip}`);
    if (hit) out.set(ip, hit.value);
    else missing.push(ip);
  }
  const keyParam = IP_API_KEY ? `&key=${encodeURIComponent(IP_API_KEY)}` : "";
  // A single IP goes to the per-IP endpoint, which has a 3x higher free rate limit than batch.
  if (missing.length === 1) {
    const [ip] = missing;
    const row = await fetchJson(`${IP_API_BASE}/json/${encodeURIComponent(ip)}?fields=${IP_API_FIELDS}${keyParam}`, {}, "ip-api.com");
    out.set(ip, row);
    cacheSet(`ipapi:${ip}`, row);
    return out;
  }
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const rows = await fetchJson(
      `${IP_API_BASE}/batch?fields=${IP_API_FIELDS}${keyParam}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chunk) },
      "ip-api.com",
    );
    rows.forEach((row, j) => {
      out.set(chunk[j], row);
      cacheSet(`ipapi:${chunk[j]}`, row);
    });
  }
  return out;
}

// --- RIPEstat ---------------------------------------------------------------------------------

async function ripe(call, resource) {
  const key = `ripe:${call}:${resource}`;
  const hit = cacheGet(key);
  if (hit) return hit.value;
  const json = await fetchJson(
    `${RIPESTAT}/${call}/data.json?resource=${encodeURIComponent(resource)}&sourceapp=osint-lookup`,
    {},
    "RIPEstat",
  );
  cacheSet(key, json.data);
  return json.data;
}

function toPrefix(cidr, extra) {
  const q = parseQuery(cidr);
  return { prefix: cidr, start: q.start, end: q.end, len: Number(cidr.split("/")[1]), ...extra };
}

function decodeEntities(s) {
  return s?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") ?? null;
}

// All announced prefixes that cover or sit inside `cidr`, each with its origin ASN.
async function announcedPrefixes(cidr) {
  const [overview, related] = await Promise.all([ripe("prefix-overview", cidr), ripe("related-prefixes", cidr)]);
  const prefixes = [];
  if (overview?.announced && overview.resource) {
    const first = overview.asns?.[0];
    prefixes.push(toPrefix(overview.resource, { asn: first?.asn ?? null, holder: first?.holder ?? null }));
  }
  for (const p of related?.prefixes ?? []) {
    if (!/^Overlap/.test(p.relationship)) continue;
    prefixes.push(toPrefix(p.prefix, { asn: Number(p.origin_asn) || null, holder: decodeEntities(p.asn_name) }));
  }
  return prefixes;
}

// --- Normalisation ----------------------------------------------------------------------------

function parseAs(as, fallbackName) {
  const m = as?.match(/^AS(\d+)\s*(.*)$/);
  return m ? { number: Number(m[1]), org: m[2] || fallbackName || null } : null;
}

function normalize(r, route) {
  const ok = r?.status === "success";
  const asn = (ok && parseAs(r.as, r.asname)) || (route?.asn ? { number: route.asn, org: route.holder ?? null } : null);
  if (!ok && !asn) return null;
  return {
    continent: ok && r.continentCode ? { code: r.continentCode, name: r.continent } : null,
    country: ok && r.countryCode ? { code: r.countryCode, name: r.country } : null,
    subdivisions: ok && r.regionName ? [{ code: r.region, name: r.regionName }] : [],
    city: (ok && r.city) || null,
    district: (ok && r.district) || null,
    postal: (ok && r.zip) || null,
    location: ok && r.lat != null ? { latitude: r.lat, longitude: r.lon, timeZone: r.timezone || null } : null,
    asn,
    asName: (ok && r.asname) || null,
    isp: (ok && r.isp) || null,
    organization: (ok && r.org) || null,
    prefix: (!route?.unrouted && route?.prefix) || null,
    flags: ok ? ["proxy", "hosting", "mobile"].filter((f) => r[f]) : [],
  };
}

const RESERVED = [
  ["0.0.0.0/8", "\"This\" network"],
  ["10.0.0.0/8", "Private (RFC 1918)"],
  ["100.64.0.0/10", "Carrier-grade NAT (RFC 6598)"],
  ["127.0.0.0/8", "Loopback"],
  ["169.254.0.0/16", "Link-local"],
  ["172.16.0.0/12", "Private (RFC 1918)"],
  ["192.0.2.0/24", "Documentation (TEST-NET-1)"],
  ["192.168.0.0/16", "Private (RFC 1918)"],
  ["198.18.0.0/15", "Benchmarking"],
  ["198.51.100.0/24", "Documentation (TEST-NET-2)"],
  ["203.0.113.0/24", "Documentation (TEST-NET-3)"],
  ["224.0.0.0/4", "Multicast"],
  ["240.0.0.0/4", "Reserved"],
  ["::1/128", "Loopback"],
  ["fc00::/7", "Unique local address"],
  ["fe80::/10", "Link-local"],
  ["ff00::/8", "Multicast"],
  ["2001:db8::/32", "Documentation"],
].map(([cidr, label]) => ({ label, ...parseQuery(cidr) }));

function reservedNote(n, version) {
  return RESERVED.find((r) => r.version === version && n >= r.start && n <= r.end)?.label ?? null;
}

// --- Single IP --------------------------------------------------------------------------------

function parseIp(ipStr) {
  let q;
  try {
    q = parseQuery(ipStr);
  } catch {}
  if (q?.kind !== "ip") throw new LookupError("invalid IP address");
  return q;
}

// Routing data is supplementary: if RIPEstat is down, still answer from ip-api.com.
function tolerate(promise, warnings) {
  return promise.catch((e) => {
    warnings.add(`Routing data unavailable: ${e.message}`);
    return null;
  });
}

async function ipResults(ips) {
  const warnings = new Set();
  const [geo, routes] = await Promise.all([
    ipApiBatch(ips.map((i) => i.ip)),
    Promise.all(
      ips.map(({ ip, n, version }) => (reservedNote(n, version) ? null : tolerate(ripe("network-info", ip), warnings))),
    ),
  ]);
  return ips.map(({ ip, n, version }, i) => {
    const r = geo.get(ip);
    const route = routes[i]?.prefix ? toPrefix(routes[i].prefix, { asn: Number(routes[i].asns?.[0]) || null }) : null;
    const details = normalize(r, route);
    return {
      type: "ip",
      ip,
      cidr: route?.prefix,
      start: route ? bigIntToIp(route.start, version) : undefined,
      end: route ? bigIntToIp(route.end, version) : undefined,
      asn: details?.asn?.number,
      org: details?.asn?.org ?? undefined,
      city: details?.city ?? undefined,
      country: details?.country?.name ?? undefined,
      reverse: (r?.status === "success" && r.reverse) || null,
      details,
      reserved: reservedNote(n, version),
      notFoundReason: details ? null : (r?.message ?? "no data"),
      sources: SOURCES.map((s) => s.name),
      warnings: [...warnings],
      raw: { ipApi: r ?? null, ripestat: routes[i] ?? null },
    };
  });
}

export async function lookupIP(ipStr) {
  const { input, start, version } = parseIp(ipStr.trim());
  const [result] = await ipResults([{ ip: input, n: start, version }]);
  if (!result.details) {
    const why = result.reserved ?? result.notFoundReason;
    throw new LookupError(`IP not found in any database${why ? ` (${why})` : ""}`, 404);
  }
  return result;
}

// --- Ranges -----------------------------------------------------------------------------------

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Split start..end into intervals owned by the most specific announced prefix (or none).
function partition(start, end, prefixes) {
  const cuts = new Set([start]);
  for (const p of prefixes) {
    if (p.start > start && p.start <= end) cuts.add(p.start);
    if (p.end + 1n > start && p.end + 1n <= end) cuts.add(p.end + 1n);
  }
  const points = [...cuts].sort(cmp);
  const blocks = [];
  points.forEach((a, i) => {
    const b = i + 1 < points.length ? points[i + 1] - 1n : end;
    let owner = null;
    for (const p of prefixes) {
      if (p.start <= a && p.end >= a && (!owner || p.len > owner.len)) owner = p;
    }
    const prev = blocks.at(-1);
    if (prev && prev.route === owner) prev.end = b;
    else blocks.push({ start: a, end: b, route: owner });
  });
  return blocks;
}

async function scanRange(start, end, version) {
  const total = end - start + 1n;
  const cidrs = rangeToCidrs(start, end, version, MAX_RANGE_CIDRS);
  const scanCidrs = cidrs.filter((c) => c !== "…");
  let scanEnd = scanCidrs.length < cidrs.length ? parseQuery(scanCidrs.at(-1)).end : end;

  const warnings = new Set();
  const prefixLists = await Promise.all(
    scanCidrs.map(async (c) => {
      if (reservedNote(parseQuery(c).start, version)) return [];
      const found = await tolerate(announcedPrefixes(c), warnings);
      // Without routing data, treat the CIDR itself as one block so it still gets geolocated.
      return found ?? [toPrefix(c, { asn: null, holder: null, unrouted: true })];
    }),
  );
  const prefixes = [...new Map(prefixLists.flat().map((p) => [p.prefix, p])).values()];
  let routed = partition(start, scanEnd, prefixes);

  let blocks;
  let sampled = false;
  if (total <= BigInt(PER_IP_LIMIT)) {
    // Geolocate every address, then merge neighbours with identical results.
    const ips = [];
    for (let n = start; n <= end; n++) ips.push(bigIntToIp(n, version));
    const geo = reservedNote(start, version) ? new Map() : await ipApiBatch(ips);
    blocks = [];
    for (const r of routed) {
      for (let n = r.start; n <= r.end; n++) {
        const details = normalize(geo.get(bigIntToIp(n, version)), r.route);
        const key = JSON.stringify(details);
        const prev = blocks.at(-1);
        if (prev && prev.key === key && prev.end + 1n === n) prev.end = n;
        else blocks.push({ key, start: n, end: n, details, route: r.route });
      }
    }
  } else {
    // Too many addresses to query one by one: sample the first address of each routed block.
    sampled = true;
    if (routed.length > MAX_BLOCKS) {
      routed = routed.slice(0, MAX_BLOCKS);
      scanEnd = routed.at(-1).end;
    }
    const samples = routed.filter((r) => r.route).map((r) => bigIntToIp(r.start, version));
    const geo = await ipApiBatch(samples);
    blocks = routed.map((r) => ({
      ...r,
      details: r.route ? normalize(geo.get(bigIntToIp(r.start, version)), r.route) : null,
    }));
  }

  const countries = new Map();
  const asns = new Map();
  let located = 0n;
  for (const b of blocks) {
    const count = b.end - b.start + 1n;
    if (!b.details) continue;
    located += count;
    const c = b.details.country;
    if (c) {
      const e = countries.get(c.code) ?? { code: c.code, name: c.name, ips: 0n, blocks: 0 };
      e.ips += count;
      e.blocks++;
      countries.set(c.code, e);
    }
    if (b.details.asn) {
      const k = b.details.asn.number;
      const e = asns.get(k) ?? { number: k, org: b.details.asn.org, ips: 0n, blocks: 0 };
      e.ips += count;
      e.blocks++;
      asns.set(k, e);
    }
  }
  const top = (m) => [...m.values()].sort((a, b) => cmp(b.ips, a.ips)).map((e) => ({ ...e, ips: e.ips.toString() }));

  const truncated = scanEnd < end;
  // Only report top-level owner/location when the whole range shares one record.
  const uniform = !truncated && blocks.length === 1 ? blocks[0].details : null;

  return {
    version,
    start: bigIntToIp(start, version),
    end: bigIntToIp(end, version),
    asn: uniform?.asn?.number,
    org: uniform?.asn?.org ?? undefined,
    city: uniform?.city ?? undefined,
    country: uniform?.country?.name ?? undefined,
    total: total.toString(),
    located: located.toString(),
    scannedUntil: bigIntToIp(scanEnd, version),
    truncated,
    sampled,
    reserved: reservedNote(start, version),
    summary: { countries: top(countries), asns: top(asns) },
    sources: SOURCES.map((s) => s.name),
    warnings: [...warnings],
    blocks: blocks.map((b) => ({
      start: bigIntToIp(b.start, version),
      end: bigIntToIp(b.end, version),
      count: (b.end - b.start + 1n).toString(),
      cidrs: rangeToCidrs(b.start, b.end, version, 4),
      prefix: (!b.route?.unrouted && b.route?.prefix) || null,
      details: b.details,
    })),
  };
}

export async function lookupCIDR(cidrStr) {
  let q;
  try {
    q = parseQuery(cidrStr);
  } catch (e) {
    throw new LookupError(`invalid CIDR: ${e.message}`);
  }
  if (q.kind !== "cidr") throw new LookupError("invalid CIDR");
  return { type: "cidr", cidr: q.input, ...(await scanRange(q.start, q.end, q.version)) };
}

export async function rangeToCIDR(startStr, endStr) {
  let a, b;
  try {
    a = parseIp(startStr.trim());
    b = parseIp(endStr.trim());
  } catch {
    throw new LookupError("invalid range");
  }
  if (a.version !== b.version) throw new LookupError("invalid range: mixed IPv4 and IPv6");
  const [start, end] = a.start <= b.start ? [a.start, b.start] : [b.start, a.start];
  const cidrs = rangeToCidrs(start, end, a.version, 64);
  return { type: "range", cidr: cidrs.join(", "), cidrs, ...(await scanRange(start, end, a.version)) };
}

export async function lookupHost(host) {
  let addresses;
  try {
    addresses = await dnsLookup(host, { all: true, verbatim: true });
  } catch (e) {
    throw new LookupError(`could not resolve ${host} (${e.code ?? e.message})`, 404);
  }
  const unique = [...new Map(addresses.map((a) => [a.address, a])).values()];
  const results = await ipResults(unique.map((a) => ({ ip: a.address, n: ipToBigInt(a.address), version: a.family })));
  return { type: "host", host, results };
}

// Free-text search used by the UI: detects the input type and dispatches.
export async function search(raw) {
  const q = parseQuery(raw);
  if (q.kind === "ip") return lookupIP(q.input);
  if (q.kind === "cidr") return lookupCIDR(q.input);
  if (q.kind === "host") return lookupHost(q.input);
  const [a, b] = q.input.split("-");
  return rangeToCIDR(a, b);
}
