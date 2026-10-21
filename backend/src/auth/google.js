import crypto from "node:crypto";
import { Router } from "express";
import { config, googleConfigured } from "../config.js";
import { pool } from "../db.js";
import { createSession, destroySession } from "./session.js";

// Google sign-in with the OAuth 2.0 authorization-code flow (+ PKCE and a state check).
// The browser is sent to Google, Google redirects back here with a code, and the code is
// exchanged server-to-server for tokens, so client secrets and tokens never reach the frontend.
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const FLOW_COOKIE = "oauth_flow";
const FLOW_PATH = "/auth/google";

const redirectUri = () => `${config.backendUrl}/auth/google/callback`;
const b64url = (buf) => buf.toString("base64url");

// Only same-app paths, so the post-login redirect can't be pointed at another site.
function safeReturnTo(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/profile";
}

export const authRouter = Router();

authRouter.get("/auth/google", (req, res) => {
  if (!googleConfigured) {
    return res
      .status(503)
      .type("text")
      .send("Google sign-in is not configured on the API. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see .env.example).");
  }
  const state = b64url(crypto.randomBytes(16));
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  res.cookie(FLOW_COOKIE, JSON.stringify({ state, verifier, returnTo: safeReturnTo(req.query.returnTo) }), {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax",
    path: FLOW_PATH,
    maxAge: 10 * 60 * 1000,
  });

  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  res.redirect(url.toString());
});

authRouter.get("/auth/google/callback", async (req, res) => {
  let flow = null;
  try {
    flow = JSON.parse(req.cookies?.[FLOW_COOKIE] ?? "null");
  } catch {}
  res.clearCookie(FLOW_COOKIE, { path: FLOW_PATH });
  const fail = (reason) => res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(reason)}`);

  if (req.query.error) return fail(String(req.query.error)); // e.g. access_denied when the user cancels
  if (!flow || !req.query.code || req.query.state !== flow.state) return fail("state_mismatch");

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(req.query.code),
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!tokenRes.ok) return fail("token_exchange_failed");
  const { access_token: accessToken } = await tokenRes.json();

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!infoRes.ok) return fail("profile_fetch_failed");
  const profile = await infoRes.json();
  if (!profile.sub || !profile.email) return fail("profile_incomplete");

  const { rows } = await pool.query(
    `INSERT INTO users (google_sub, email, email_verified, name, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (google_sub) DO UPDATE
       SET email = EXCLUDED.email, email_verified = EXCLUDED.email_verified, name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url, last_login_at = now()
     RETURNING id`,
    [profile.sub, profile.email, Boolean(profile.email_verified), profile.name ?? null, profile.picture ?? null],
  );
  await createSession(req, res, rows[0].id);
  res.redirect(`${config.frontendUrl}${flow.returnTo}`);
});

authRouter.post("/auth/logout", async (req, res) => {
  await destroySession(req, res);
  res.status(204).end();
});
