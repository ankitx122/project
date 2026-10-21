import { Router } from "express";
import { pool } from "../db.js";
import { publicUser, requireUser } from "../auth/session.js";

export const meRouter = Router();

// Signed-out visitors get { user: null } rather than a 401, so the frontend can check quietly.
meRouter.get("/api/me", async (req, res) => {
  if (!req.user) return res.json({ message: "success", data: { user: null } });
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM search_history WHERE user_id = $1", [req.user.id]);
  res.json({ message: "success", data: { user: { ...publicUser(req.user), searchCount: rows[0].n } } });
});

meRouter.get("/api/me/history", requireUser, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const { rows } = await pool.query(
    "SELECT id, query, kind, summary, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [req.user.id, limit],
  );
  res.json({
    message: "success",
    data: {
      items: rows.map((r) => ({ id: String(r.id), query: r.query, kind: r.kind, summary: r.summary, createdAt: r.created_at })),
    },
  });
});

meRouter.delete("/api/me/history", requireUser, async (req, res) => {
  await pool.query("DELETE FROM search_history WHERE user_id = $1", [req.user.id]);
  res.status(204).end();
});
