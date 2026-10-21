import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./auth/google.js";
import { attachUser } from "./auth/session.js";
import { config, googleConfigured } from "./config.js";
import { migrate, pool } from "./db.js";
import { SOURCES } from "./lookup/geoip.js";
import { lookupRouter } from "./routes/lookup.js";
import { meRouter } from "./routes/me.js";
import { watchlistRouter } from "./routes/watchlists.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// The frontend calls the API from another origin with cookies, so CORS allows exactly that origin.
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Cookie-authenticated writes must come from the frontend (CSRF protection on top of SameSite).
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== config.frontendUrl) {
    return res.status(403).json({ message: "error", data: { error: "Cross-origin request blocked" } });
  }
  next();
});

app.get("/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", googleSignIn: googleConfigured });
});

// Names and links of the configured data sources, for the frontend's credits.
app.get("/api/sources", (req, res) => res.json({ message: "success", data: SOURCES }));

app.use(attachUser);
app.use(authRouter);
app.use(lookupRouter);
app.use(meRouter);
app.use(watchlistRouter);

app.use((req, res) => res.status(404).json({ message: "error", data: { error: "Not found" } }));
// Express 5 forwards rejected async handlers here.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "error", data: { error: "Internal server error" } });
});

await migrate();
app.listen(config.port, () => {
  console.log(`API listening on ${config.backendUrl} (frontend: ${config.frontendUrl})`);
  if (!googleConfigured) console.warn("Google sign-in is disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
});
