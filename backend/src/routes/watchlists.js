import { Router } from "express";
import { requireUser } from "../auth/session.js";
import { pool } from "../db.js";
import { parseQuery } from "../lookup/ip.js";

// Saved watchlists: named lists of IPs / networks / hosts, each item with an optional note.
// Every query is scoped to the signed-in user, so one user's ids can't reach another's lists.
export const watchlistRouter = Router();
watchlistRouter.use("/api/watchlists", requireUser);

const MAX_LISTS = 100;
const MAX_ITEMS_PER_LIST = 2000;
const MAX_ITEMS_PER_REQUEST = 500;

const ok = (res, data, status = 200) => res.status(status).json({ message: "success", data });
const fail = (res, error, status = 400) => res.status(status).json({ message: "error", data: { error } });

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) || null : null);
const isId = (value) => /^\d{1,18}$/.test(value);

const listOut = (r) => ({
  id: String(r.id),
  name: r.name,
  description: r.description,
  itemCount: r.item_count ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(r.item_id !== undefined && { itemId: r.item_id == null ? null : String(r.item_id) }),
});

const itemOut = (r) => ({
  id: String(r.id),
  query: r.query,
  kind: r.kind,
  summary: r.summary,
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// The user's list, or null.
async function ownList(req) {
  if (!isId(req.params.id)) return null;
  const { rows } = await pool.query("SELECT * FROM watchlists WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  return rows[0] ?? null;
}

const touch = (id) => pool.query("UPDATE watchlists SET updated_at = now() WHERE id = $1", [id]);

// All lists with item counts. With ?q=, each list also says whether it holds that query (itemId).
watchlistRouter.get("/api/watchlists", async (req, res) => {
  const q = text(req.query.q, 200);
  const { rows } = await pool.query(
    `SELECT w.*, (SELECT count(*)::int FROM watchlist_items i WHERE i.watchlist_id = w.id) AS item_count
            ${q ? ", (SELECT i.id FROM watchlist_items i WHERE i.watchlist_id = w.id AND i.query = $2) AS item_id" : ""}
       FROM watchlists w WHERE w.user_id = $1 ORDER BY w.updated_at DESC`,
    q ? [req.user.id, q] : [req.user.id],
  );
  ok(res, { lists: rows.map(listOut) });
});

watchlistRouter.post("/api/watchlists", async (req, res) => {
  const name = text(req.body?.name, 80);
  if (!name) return fail(res, "Give the list a name.");
  const { rows: count } = await pool.query("SELECT count(*)::int AS n FROM watchlists WHERE user_id = $1", [req.user.id]);
  if (count[0].n >= MAX_LISTS) return fail(res, `You can have up to ${MAX_LISTS} lists.`);
  const { rows } = await pool.query(
    "INSERT INTO watchlists (user_id, name, description) VALUES ($1, $2, $3) RETURNING *",
    [req.user.id, name, text(req.body?.description, 500)],
  );
  ok(res, { list: listOut(rows[0]) }, 201);
});

watchlistRouter.get("/api/watchlists/:id", async (req, res) => {
  const list = await ownList(req);
  if (!list) return fail(res, "List not found", 404);
  const { rows } = await pool.query("SELECT * FROM watchlist_items WHERE watchlist_id = $1 ORDER BY created_at DESC", [list.id]);
  ok(res, { list: listOut({ ...list, item_count: rows.length }), items: rows.map(itemOut) });
});

watchlistRouter.patch("/api/watchlists/:id", async (req, res) => {
  const list = await ownList(req);
  if (!list) return fail(res, "List not found", 404);
  const name = req.body?.name === undefined ? list.name : text(req.body.name, 80);
  if (!name) return fail(res, "Give the list a name.");
  const description = req.body?.description === undefined ? list.description : text(req.body.description, 500);
  const { rows } = await pool.query(
    "UPDATE watchlists SET name = $2, description = $3, updated_at = now() WHERE id = $1 RETURNING *",
    [list.id, name, description],
  );
  ok(res, { list: listOut(rows[0]) });
});

watchlistRouter.delete("/api/watchlists/:id", async (req, res) => {
  const list = await ownList(req);
  if (!list) return fail(res, "List not found", 404);
  await pool.query("DELETE FROM watchlists WHERE id = $1", [list.id]);
  res.status(204).end();
});

// Add one or many items: { query, note?, summary? } or { items: [{ query, note?, summary? }, ...] }.
// Adding a query that's already on the list keeps it and updates its note / summary when given.
watchlistRouter.post("/api/watchlists/:id/items", async (req, res) => {
  const list = await ownList(req);
  if (!list) return fail(res, "List not found", 404);
  const input = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  if (!input.length) return fail(res, "Nothing to add.");
  if (input.length > MAX_ITEMS_PER_REQUEST) return fail(res, `Add up to ${MAX_ITEMS_PER_REQUEST} items at a time.`);

  const byQuery = new Map(); // one row per query, or the upsert would touch a row twice
  for (const entry of input) {
    let q;
    try {
      q = parseQuery(String(entry?.query ?? ""));
    } catch (e) {
      return fail(res, `${entry?.query || "Empty entry"}: ${e.message}`);
    }
    const prev = byQuery.get(q.input);
    byQuery.set(q.input, {
      query: q.input,
      kind: q.kind,
      summary: text(entry.summary, 300) ?? prev?.summary ?? null,
      note: text(entry.note, 2000) ?? prev?.note ?? null,
    });
  }
  const items = [...byQuery.values()];

  const { rows: count } = await pool.query("SELECT count(*)::int AS n FROM watchlist_items WHERE watchlist_id = $1", [list.id]);
  if (count[0].n + items.length > MAX_ITEMS_PER_LIST) return fail(res, `A list can hold up to ${MAX_ITEMS_PER_LIST} items.`);

  const { rows } = await pool.query(
    `INSERT INTO watchlist_items (watchlist_id, query, kind, summary, note)
     SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[])
     ON CONFLICT (watchlist_id, query) DO UPDATE
       SET summary = COALESCE(EXCLUDED.summary, watchlist_items.summary),
           note = COALESCE(EXCLUDED.note, watchlist_items.note),
           updated_at = now()
     RETURNING *`,
    [list.id, items.map((i) => i.query), items.map((i) => i.kind), items.map((i) => i.summary), items.map((i) => i.note)],
  );
  await touch(list.id);
  ok(res, { items: rows.map(itemOut) }, 201);
});

// Edit an item's note ({ note: "" } clears it).
watchlistRouter.patch("/api/watchlists/:id/items/:itemId", async (req, res) => {
  const list = await ownList(req);
  if (!list || !isId(req.params.itemId)) return fail(res, "Item not found", 404);
  const { rows } = await pool.query(
    "UPDATE watchlist_items SET note = $3, updated_at = now() WHERE id = $2 AND watchlist_id = $1 RETURNING *",
    [list.id, req.params.itemId, text(req.body?.note, 2000)],
  );
  if (!rows[0]) return fail(res, "Item not found", 404);
  await touch(list.id);
  ok(res, { item: itemOut(rows[0]) });
});

watchlistRouter.delete("/api/watchlists/:id/items/:itemId", async (req, res) => {
  const list = await ownList(req);
  if (!list || !isId(req.params.itemId)) return fail(res, "Item not found", 404);
  await pool.query("DELETE FROM watchlist_items WHERE id = $2 AND watchlist_id = $1", [list.id, req.params.itemId]);
  await touch(list.id);
  res.status(204).end();
});
