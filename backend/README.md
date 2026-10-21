# osint-backend

API for the IP Intelligence frontend (`../frontend`): IP / CIDR / range / hostname lookups,
Google sign-in, user profiles and search history. Node.js + Express 5 + PostgreSQL.

## Run it

```bash
npm install
cp .env.example .env      # then fill in GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
npm run db                # terminal 1: local PostgreSQL 17 in ./.pgdata (skip if you have your own)
npm run dev               # terminal 2: API on http://localhost:4000 (restarts on file changes)
```

Tables are created automatically on start (`src/schema.sql`). To use your own PostgreSQL, point
`DATABASE_URL` at it and skip `npm run db`.

## Google sign-in setup

Google is the only way to sign in. There are no email + password accounts in this API: no
register, login or password-reset endpoints, and no password column in the database.

1. Google Cloud Console → **APIs & Services → OAuth consent screen**: configure it (External, add yourself as a test user while in testing).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorized redirect URI: `http://localhost:4000/auth/google/callback` (in production, `${BACKEND_URL}/auth/google/callback`).
4. Put the client ID and secret in `.env`, then restart the API.

The project uses one shared client: its ID is pre-filled in `.env.example`, and the secret is shared privately by the owner (never committed). See the root README.

Flow: the frontend links to `/auth/google` → Google consent → `/auth/google/callback` exchanges the
code server-side (PKCE + state check), upserts the user, sets an httpOnly `sid` session cookie and
redirects to the frontend. Only a SHA-256 hash of the session token is stored.

## Lookup data sources

All source settings live in `.env` (required, no defaults in code): `RDAP_URL`, `IP_API_URL`, `IP_API_KEY`
(optional), `RIPESTAT_URL`, `RIPESTAT_SOURCEAPP`, `LOOKUP_TIMEOUT_MS`, `LOOKUP_CACHE_TTL_SECONDS`.
The credit names/links shown in the frontend come from these URLs via `GET /api/sources`.
Restart the API after changing them.

## API

| Method | Path | |
| --- | --- | --- |
| GET | `/api/lookup?q=` · `?ip=` · `?cidr=` · `?range=a-b` | Lookup (core-engine `/lookup` contract: `{ message, data }`). Saved to the user's history. |
| GET | `/api/whois?q=` | WHOIS / RDAP registration record for an IP, CIDR, range or AS number (`AS15169`) |
| POST | `/api/bulk` | Look up many IPs at once: `{ items: ["8.8.8.8", …] }` (up to 500; not saved to history) |
| GET | `/api/watchlists?q=` | Your watchlists with item counts; with `q`, which lists already hold it (`itemId`) |
| POST | `/api/watchlists` | Create a list `{ name, description? }` |
| GET · PATCH · DELETE | `/api/watchlists/:id` | A list with its items · rename / describe · delete |
| POST | `/api/watchlists/:id/items` | Add `{ query, note?, summary? }` or `{ items: [...] }` (existing queries are updated) |
| PATCH · DELETE | `/api/watchlists/:id/items/:itemId` | Edit an item's `note` · remove it |
| GET | `/api/me` | `{ user }`, or `{ user: null }` when signed out |
| GET | `/api/me/history?limit=` | Signed-in user's searches, newest first |
| DELETE | `/api/me/history` | Clear search history |
| GET | `/auth/google?returnTo=/path` | Start Google sign-in |
| GET | `/auth/google/callback` | Google redirect target |
| POST | `/auth/logout` | End the session |
| GET | `/api/sources` | Names and links of the configured data sources |
| GET | `/health` | DB check + whether Google sign-in is configured |

Everything except `/auth/*`, `/api/me`, `/api/sources` and `/health` requires a signed-in session (401 otherwise).

The frontend calls the API cross-origin with cookies, so CORS allows exactly `FRONTEND_URL`, and
state-changing requests from any other `Origin` are rejected.

## Production notes

- Serve both over HTTPS. Keep the frontend and API on the same site (e.g. `app.example.com` and
  `api.example.com`) so the `SameSite=Lax` cookie works; otherwise set `COOKIE_SAMESITE=none`.
- ip-api.com's free endpoint is non-commercial and HTTP-only; set `IP_API_KEY` for the Pro endpoint.
