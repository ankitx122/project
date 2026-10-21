// All configuration comes from the environment (see .env.example).
const port = Number(process.env.PORT ?? 4000);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return value;
}

export const config = {
  port,
  production: process.env.NODE_ENV === "production",
  // Where the Next.js frontend runs; used for CORS and for redirects after sign-in.
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  // Public URL of this API; Google redirects back to `${backendUrl}/auth/google/callback`.
  backendUrl: (process.env.BACKEND_URL ?? `http://localhost:${port}`).replace(/\/$/, ""),
  databaseUrl: required("DATABASE_URL"),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  session: {
    days: Number(process.env.SESSION_DAYS ?? 30),
    // "lax" works when the frontend and API share a site (localhost ports, app./api. subdomains).
    // Use "none" (requires HTTPS) if they're on different sites.
    sameSite: process.env.COOKIE_SAMESITE ?? "lax",
  },
};

// Data sources for lookups. All come from .env; nothing is hard-coded.
const requiredUrl = (name) => {
  const value = required(name).replace(/\/$/, "");
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a full URL, e.g. https://example.com (got "${value}")`);
  }
  return value;
};
const requiredNumber = (name) => {
  const value = Number(required(name));
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
};

config.sources = {
  ipApi: { url: requiredUrl("IP_API_URL"), key: process.env.IP_API_KEY ?? "" },
  // RIPEstat asks clients to identify themselves with a sourceapp name.
  ripestat: { url: requiredUrl("RIPESTAT_URL"), sourceApp: required("RIPESTAT_SOURCEAPP") },
  // RDAP (the JSON successor to WHOIS). rdap.org redirects each query to the right registry.
  rdap: { url: requiredUrl("RDAP_URL") },
  timeoutMs: requiredNumber("LOOKUP_TIMEOUT_MS"),
  cacheTtlMs: requiredNumber("LOOKUP_CACHE_TTL_SECONDS") * 1000,
};

export const googleConfigured = Boolean(config.google.clientId && config.google.clientSecret);
