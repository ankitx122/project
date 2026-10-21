import crypto from "node:crypto";
import { config } from "../config.js";
import { pool } from "../db.js";

const COOKIE = "sid";
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

function cookieOptions(expires) {
  return {
    httpOnly: true,
    secure: config.production || config.session.sameSite === "none",
    sameSite: config.session.sameSite,
    path: "/",
    expires,
  };
}

export async function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.session.days * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, user_agent, expires_at) VALUES ($1, $2, $3, $4)",
    [hash(token), userId, req.get("user-agent")?.slice(0, 300) ?? null, expires],
  );
  res.cookie(COOKIE, token, cookieOptions(expires));
}

export async function destroySession(req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hash(token)]);
  res.clearCookie(COOKIE, { ...cookieOptions(), expires: undefined });
}

// Sets req.user from the session cookie (or null). Never rejects the request on its own.
export async function attachUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE];
  if (token) {
    const { rows } = await pool.query(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hash(token)],
    );
    req.user = rows[0] ?? null;
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "error", data: { error: "Not signed in" } });
  next();
}

// Profile fields safe to send to the browser.
export function publicUser(u) {
  return {
    id: String(u.id),
    email: u.email,
    emailVerified: u.email_verified,
    name: u.name,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
  };
}
