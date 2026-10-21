import { Router } from "express";
import { requireUser } from "../auth/session.js";
import { pool } from "../db.js";
import { lookupBulk, lookupCIDR, lookupIP, rangeToCIDR, search } from "../lookup/geoip.js";
import { whois } from "../lookup/whois.js";

// Same contract as core-engine's GET /lookup (server/cidr_handler.go):
//   ?ip=8.8.8.8 | ?cidr=8.8.8.0/24 | ?range=8.8.8.0-8.8.8.255
//   -> { message: "success", data } or { message: "error", data: { error } }
// Plus ?q= for free-text search (also accepts hostnames).
export const lookupRouter = Router();

lookupRouter.get("/api/lookup", requireUser, async (req, res) => {
  const { ip, cidr, range, q } = req.query;
  let data;
  let query;
  try {
    if (ip) {
      query = String(ip);
      data = await lookupIP(query);
    } else if (cidr) {
      query = String(cidr);
      data = await lookupCIDR(query);
    } else if (range) {
      query = String(range);
      const parts = query.split("-");
      if (parts.length !== 2) return error(res, "invalid range format");
      data = await rangeToCIDR(parts[0], parts[1]);
    } else if (q) {
      query = String(q).trim();
      data = await search(query);
    } else {
      return error(res, "provide ip or cidr or range");
    }
  } catch (err) {
    return error(res, err.message, err.status ?? 400);
  }

  if (req.user) {
    // History is best-effort; a failed write shouldn't fail the lookup.
    pool
      .query("INSERT INTO search_history (user_id, query, kind, summary) VALUES ($1, $2, $3, $4)", [
        req.user.id,
        query,
        data.type,
        summarize(data),
      ])
      .catch((e) => console.error("search_history insert failed:", e.message));
  }
  res.json({ message: "success", data });
});

// WHOIS (RDAP) registration record for an IP, CIDR, range or AS number: ?q=8.8.8.8 | ?q=AS15169
lookupRouter.get("/api/whois", requireUser, async (req, res) => {
  if (!req.query.q) return error(res, "provide q");
  try {
    res.json({ message: "success", data: await whois(String(req.query.q)) });
  } catch (err) {
    error(res, err.message, err.status ?? 400);
  }
});

// Many IPs in one request: { items: ["8.8.8.8", "1.1.1.1", ...] }. Not saved to search history.
lookupRouter.post("/api/bulk", requireUser, async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) return error(res, "provide items: an array of IP addresses");
  try {
    res.json({ message: "success", data: await lookupBulk(items) });
  } catch (err) {
    error(res, err.message, err.status ?? 400);
  }
});

function error(res, message, status = 400) {
  return res.status(status).json({ message: "error", data: { error: message } });
}

// One-line description stored with each saved search, shown on the profile page.
function summarize(data) {
  const owner = (d) => [d.asn && `AS${d.asn}`, d.org].filter(Boolean).join(" ");
  if (data.type === "ip") return [[data.city, data.country].filter(Boolean).join(", "), owner(data)].filter(Boolean).join(" · ");
  if (data.type === "host") return `${data.results.length} address${data.results.length === 1 ? "" : "es"}`;
  const countries = data.summary.countries.length;
  return `${Number(data.total).toLocaleString("en-US")} addresses · ${countries} countr${countries === 1 ? "y" : "ies"}`;
}
