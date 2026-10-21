import { isIP } from "node:net";

// IP addresses are handled as BigInt so IPv4 and IPv6 share the same math.

export function bitsFor(version) {
  return version === 4 ? 32 : 128;
}

export function ipToBigInt(ip) {
  const version = isIP(ip);
  if (version === 4) {
    return ip.split(".").reduce((acc, octet) => (acc << 8n) + BigInt(octet), 0n);
  }
  if (version === 6) {
    let addr = ip.split("%")[0];
    // Expand an embedded IPv4 tail (e.g. ::ffff:1.2.3.4) into two hextets.
    const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) {
      const n = ipToBigInt(v4[1]);
      addr = addr.slice(0, -v4[1].length) + `${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
    }
    const [head, tail] = addr.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail !== undefined && tail ? tail.split(":") : [];
    const fill = tail !== undefined ? 8 - headParts.length - tailParts.length : 0;
    const parts = [...headParts, ...Array(fill).fill("0"), ...tailParts];
    return parts.reduce((acc, h) => (acc << 16n) + BigInt(parseInt(h, 16)), 0n);
  }
  throw new Error(`Invalid IP address: ${ip}`);
}

export function bigIntToIp(n, version) {
  if (version === 4) {
    return [24n, 16n, 8n, 0n].map((s) => ((n >> s) & 0xffn).toString()).join(".");
  }
  const parts = [];
  for (let s = 112n; s >= 0n; s -= 16n) parts.push(((n >> s) & 0xffffn).toString(16));
  // Compress the longest run of zero hextets (RFC 5952).
  let best = { start: -1, len: 0 };
  for (let i = 0; i < 8; ) {
    if (parts[i] !== "0") { i++; continue; }
    let j = i;
    while (j < 8 && parts[j] === "0") j++;
    if (j - i > best.len && j - i > 1) best = { start: i, len: j - i };
    i = j;
  }
  if (best.start === -1) return parts.join(":");
  const left = parts.slice(0, best.start).join(":");
  const right = parts.slice(best.start + best.len).join(":");
  return `${left}::${right}`;
}

export function networkBounds(n, prefix, version) {
  const hostBits = BigInt(bitsFor(version) - prefix);
  const size = 1n << hostBits;
  const start = (n >> hostBits) << hostBits;
  return { start, end: start + size - 1n };
}

// Split an arbitrary start..end range into the minimal list of CIDR blocks.
export function rangeToCidrs(start, end, version, max = 8) {
  const bits = bitsFor(version);
  const out = [];
  let cur = start;
  while (cur <= end && out.length < max) {
    let prefix = bits;
    while (prefix > 0) {
      const { start: s, end: e } = networkBounds(cur, prefix - 1, version);
      if (s !== cur || e > end) break;
      prefix--;
    }
    out.push(`${bigIntToIp(cur, version)}/${prefix}`);
    cur = networkBounds(cur, prefix, version).end + 1n;
  }
  if (cur <= end) out.push("…");
  return out;
}

/**
 * Parse a search string into a normalized query.
 * Supports: single IP, CIDR (1.2.3.0/24), range (1.2.3.4-1.2.3.99 or 1.2.3.4 - 1.2.3.99),
 * and hostnames (resolved later).
 */
export function parseQuery(raw) {
  const q = raw.trim();
  if (!q) throw new Error("Empty query");

  if (q.includes("/")) {
    const [ip, p] = q.split("/");
    const version = isIP(ip);
    const prefix = Number(p);
    if (!version) throw new Error(`Invalid network address in CIDR: ${ip}`);
    if (!/^\d+$/.test(p) || prefix > bitsFor(version)) {
      throw new Error(`Invalid prefix length /${p} for IPv${version}`);
    }
    const { start, end } = networkBounds(ipToBigInt(ip), prefix, version);
    return { kind: "cidr", input: q, version, start, end };
  }

  const rangeMatch = q.match(/^(\S+)\s*-\s*(\S+)$/);
  if (rangeMatch && isIP(rangeMatch[1]) && isIP(rangeMatch[2])) {
    const [, a, b] = rangeMatch;
    const version = isIP(a);
    if (isIP(b) !== version) throw new Error("Range endpoints must be the same IP version");
    let start = ipToBigInt(a);
    let end = ipToBigInt(b);
    if (start > end) [start, end] = [end, start];
    return { kind: "range", input: q, version, start, end };
  }

  const version = isIP(q);
  if (version) {
    const n = ipToBigInt(q);
    return { kind: "ip", input: q, version, start: n, end: n };
  }

  if (/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\.?$/i.test(q)) {
    return { kind: "host", input: q.replace(/\.$/, "").toLowerCase() };
  }

  throw new Error("Enter an IP, CIDR (e.g. 8.8.8.0/24), range (e.g. 1.1.1.1-1.1.1.50) or hostname");
}
