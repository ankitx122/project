import { config } from "../config.js";
import { cacheGet, cacheSet, LookupError } from "./geoip.js";
import { parseQuery } from "./ip.js";

// WHOIS registration data over RDAP: who an IP block or AS number is registered to, its abuse
// contact and allocation dates. RDAP_URL (rdap.org by default) redirects to the registry that holds it.
const { rdap, timeoutMs: TIMEOUT_MS } = config.sources;
// rdap.org refuses requests without a User-Agent; identify as this app (same name RIPEstat gets).
const USER_AGENT = `${config.sources.ripestat.sourceApp} (+${config.backendUrl})`;

const REGISTRIES = {
  "rdap.arin.net": "ARIN",
  "rdap.db.ripe.net": "RIPE NCC",
  "rdap.apnic.net": "APNIC",
  "rdap.lacnic.net": "LACNIC",
  "rdap.afrinic.net": "AFRINIC",
};

// "AS15169" / "as15169" → 15169
const asNumber = (q) => q.match(/^as(\d{1,10})$/i)?.[1];

// RDAP path for a search: an IP or CIDR as-is, a range by its first address, an AS number by number.
function rdapPath(raw) {
  const value = String(raw ?? "").trim();
  const asn = asNumber(value);
  if (asn) return { kind: "asn", path: `autnum/${asn}`, query: `AS${asn}` };
  let q;
  try {
    q = parseQuery(value);
  } catch (e) {
    throw new LookupError(e.message);
  }
  if (q.kind === "host") throw new LookupError("WHOIS works on IP addresses, networks and AS numbers; look up the hostname first");
  const target = q.kind === "range" ? q.input.split("-")[0].trim() : q.input;
  return { kind: "network", path: `ip/${target}`, query: q.input };
}

async function fetchRdap(path) {
  let res;
  try {
    res = await fetch(`${rdap.url}/${path}`, {
      headers: { Accept: "application/rdap+json, application/json", "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new LookupError(`RDAP request failed: ${e.name === "TimeoutError" ? "timed out" : e.message}`, 502);
  }
  if (res.status === 404) throw new LookupError("No registration record found", 404);
  if (res.status === 429) throw new LookupError("RDAP rate limit reached, try again shortly", 429);
  if (!res.ok) throw new LookupError(`RDAP returned HTTP ${res.status}`, 502);
  return { json: await res.json(), url: res.url };
}

// jCard ["vcard", [[name, params, type, value], ...]] → the fields we show.
function readVcard(vcardArray) {
  const props = vcardArray?.[1] ?? [];
  const get = (name) => props.find((p) => p[0] === name);
  const adr = get("adr");
  const address =
    adr?.[1]?.label ??
    (Array.isArray(adr?.[3]) ? adr[3].flat().filter(Boolean).join("\n") : null);
  return {
    name: get("fn")?.[3] || null,
    kind: get("kind")?.[3] || null,
    email: get("email")?.[3] || null,
    phone: String(get("tel")?.[3] ?? "").replace(/^tel:/, "") || null,
    address: address || null,
  };
}

// Entities nest (ARIN puts the abuse contact inside the organisation), so flatten them, merging
// the roles of a handle that appears more than once.
function flattenEntities(entities, out = new Map()) {
  for (const e of entities ?? []) {
    const key = e.handle ?? JSON.stringify(e.vcardArray);
    const existing = out.get(key);
    if (existing) existing.roles = [...new Set([...existing.roles, ...(e.roles ?? [])])];
    else out.set(key, { handle: e.handle ?? null, roles: e.roles ?? [], ...readVcard(e.vcardArray) });
    flattenEntities(e.entities, out);
  }
  return out;
}

const ROLE_ORDER = ["registrant", "abuse", "administrative", "technical", "noc"];
const roleRank = (c) => Math.min(...c.roles.map((r) => (ROLE_ORDER.includes(r) ? ROLE_ORDER.indexOf(r) : 99)), 99);

function eventDate(events, action) {
  return events?.find((e) => e.eventAction === action)?.eventDate ?? null;
}

function normalize(json, url, { kind, query }) {
  const contacts = [...flattenEntities(json.entities).values()].sort((a, b) => roleRank(a) - roleRank(b));
  // RIPE also lists maintainer objects (MNT-…) as registrants; they're accounts, not owners.
  const owners = contacts.filter((c) => c.roles.includes("registrant") && !/^MNT-|-MNT$/i.test(c.handle ?? ""));
  const registrant = owners.find((c) => c.kind === "org") ?? owners[0];
  const abuse = contacts.find((c) => c.roles.includes("abuse") && c.email) ?? contacts.find((c) => c.roles.includes("abuse"));
  const self = json.links?.find((l) => l.rel === "self")?.href ?? url;
  const host = new URL(self).hostname;

  return {
    query,
    kind,
    handle: json.handle ?? null,
    name: json.name ?? null,
    type: json.type ?? null,
    country: json.country?.toUpperCase() ?? null,
    status: json.status ?? [],
    organization: registrant?.name ?? null,
    range: json.startAddress ? { start: json.startAddress, end: json.endAddress } : null,
    cidrs: (json.cidr0_cidrs ?? []).map((c) => `${c.v4prefix ?? c.v6prefix}/${c.length}`),
    asnRange: json.startAutnum != null ? { start: json.startAutnum, end: json.endAutnum ?? json.startAutnum } : null,
    parent: json.parentHandle ?? null,
    registered: eventDate(json.events, "registration"),
    updated: eventDate(json.events, "last changed"),
    abuse: abuse ? { name: abuse.name, email: abuse.email, phone: abuse.phone } : null,
    contacts: contacts.slice(0, 12),
    remarks: (json.remarks ?? [])
      .map((r) => ({ title: r.title ?? null, text: (r.description ?? []).join("\n").trim() }))
      .filter((r) => r.text)
      .slice(0, 8),
    registry: { name: REGISTRIES[host] ?? host, url: self, whoisServer: json.port43 ?? null },
  };
}

export async function whois(raw) {
  const target = rdapPath(raw);
  const key = `rdap:${target.path}`;
  const hit = cacheGet(key);
  if (hit) return hit.value;
  const { json, url } = await fetchRdap(target.path);
  const result = normalize(json, url, target);
  cacheSet(key, result);
  return result;
}
