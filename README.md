# IP Intelligence

Look up any IP address, CIDR block, IP range or hostname and see where it is, who owns it and how
it's routed — on a map or a 3D globe — with WHOIS records, bulk lookups and saved watchlists.
Sign-in is with Google; every page requires an account.

```
project/
  frontend/   Next.js 16 app (the UI)                → http://localhost:3000
  backend/    Node.js + Express 5 API + PostgreSQL    → http://localhost:4000
```

The frontend only talks to the backend; the backend fetches live data from ip-api.com (location,
ASN), RIPEstat (BGP routing) and RDAP (WHOIS) and stores users, history and watchlists in PostgreSQL.

> **Sign-in is Google only.** The backend has no email + password accounts: there is no register,
> login or password-reset API, and no passwords are stored. The email and password form on the
> login page is UI only — it validates what you type, then shows a toast asking you to continue with
> Google. The same happens for "Forgot password?".

## Requirements

- **Node.js 22 or newer** (`node -v`) and npm
- **The Google client secret**, from the project owner (see step 1)
- Nothing else — the backend can run its own local PostgreSQL, no system install needed

## 1. Get the Google client secret

Sign-in uses the project's shared Google OAuth client. Its client ID is already in
`backend/.env.example`; the **client secret is not in git**. Ask the project owner for it and
for your Google account to be added as a test user (see [For the project owner](#for-the-project-owner)).
Never commit the secret or paste it into issues or chat.

## 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and paste the secret from step 1; everything else already works for local use:

```env
GOOGLE_CLIENT_SECRET=GOCSPX-...   # from the project owner
```

Then start the database and the API, each in its own terminal:

```bash
# terminal 1 — local PostgreSQL 17 on port 5433, data kept in backend/.pgdata
cd backend && npm run db

# terminal 2 — API on http://localhost:4000 (restarts when you edit files)
cd backend && npm run dev
```

Check it: <http://localhost:4000/health> should return `{"status":"ok","googleSignIn":true}`.
Database tables are created automatically when the API starts.

> Using your own PostgreSQL instead? Set `DATABASE_URL` in `backend/.env` and skip `npm run db`.

## 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # contains NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
# terminal 3 — app on http://localhost:3000
cd frontend && npm run dev
```

Open <http://localhost:3000>. You'll be sent to the sign-in page; choose **Sign in with Google**
with the Google account the owner added as a test user, and you're in.

## Running it again later

Three terminals, in this order:

```bash
cd backend  && npm run db     # 1. database
cd backend  && npm run dev    # 2. API
cd frontend && npm run dev    # 3. app
```

## Configuration

**`backend/.env`** (template with notes: `backend/.env.example`)

| Variable | What it's for | Local value |
| --- | --- | --- |
| `PORT` | API port | `4000` |
| `BACKEND_URL` | Public URL of the API; Google redirects to `${BACKEND_URL}/auth/google/callback` | `http://localhost:4000` |
| `FRONTEND_URL` | The app's URL: the only origin allowed to call the API, and where sign-in returns to | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string (`npm run db` creates a matching database) | `postgres://osint:osint@localhost:5433/osint` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in: the shared client ID (pre-filled) and its secret (from the owner) | ID pre-filled; secret from step 1 |
| `IP_API_URL`, `IP_API_KEY` | Geolocation / ASN source; the key is optional (paid Pro plan) | `http://ip-api.com`, empty |
| `RIPESTAT_URL`, `RIPESTAT_SOURCEAPP` | BGP routing source, and the app name sent to it | `https://stat.ripe.net/data`, `osint-lookup` |
| `RDAP_URL` | WHOIS source | `https://rdap.org` |
| `LOOKUP_TIMEOUT_MS`, `LOOKUP_CACHE_TTL_SECONDS` | Per-request timeout; how long results are cached in memory | `15000`, `3600` |
| `SESSION_DAYS`, `COOKIE_SAMESITE` | Sign-in length; cookie policy | `30`, `lax` |

**`frontend/.env.local`**

| Variable | What it's for | Local value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Where the backend runs (required) | `http://localhost:4000` |

Restart the matching server after changing either file. Neither file is committed to git.

## Scripts

| Folder | Command | Does |
| --- | --- | --- |
| `backend` | `npm run db` | Start the local PostgreSQL (Ctrl+C to stop) |
| `backend` | `npm run dev` | Start the API, restarting on file changes |
| `backend` | `npm start` | Start the API without file watching |
| `frontend` | `npm run dev` | Start the app in development mode |
| `frontend` | `npm run build` / `npm start` | Production build / serve it |
| `frontend` | `npm run lint` | Check the code with ESLint |

## What's in the app

| Page | |
| --- | --- |
| `/login` | Google sign-in. The email / password form is UI only and shows a "use Google" toast |
| `/` | Lookup an IP, CIDR, range or hostname: location, network, BGP prefix, WHOIS, map |
| `/bulk` | Paste up to 500 IPs, a CSV or log lines; table, map, CSV/JSON export |
| `/map` | Results on a flat map or a 3D globe |
| `/watchlists` | Named lists of saved IPs / networks / hosts, with notes |
| `/profile` | Your account and search history |

Any other address shows a 404 page. Signed-out visitors are sent to `/login` and returned to the
page they asked for after signing in. The full API reference is in [`backend/README.md`](backend/README.md).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Can't reach the API at http://localhost:4000" | The API isn't running: start terminals 1 and 2, then reload. |
| API exits with "Missing required environment variable …" | `backend/.env` is missing a value; compare it with `backend/.env.example`. |
| `/health` shows `"googleSignIn":false` | `GOOGLE_CLIENT_SECRET` is empty in `backend/.env`; paste the secret from the owner and restart the API. |
| Google says **invalid_client** | The secret in `backend/.env` is wrong or was rotated; ask the owner for the current one. |
| Google says **redirect_uri_mismatch** | The API must run on port 4000 (`http://localhost:4000/auth/google/callback` is what the shared client allows). |
| Google says **Access blocked** / app not verified | Your Google account isn't a test user yet; ask the owner to add it. |
| "Port 3000 / 4000 / 5433 is already in use" | Another copy is still running. Stop it, or find it with `lsof -i :4000`. |
| "Routing data unavailable" or "rate limit reached" on a lookup | RIPEStat / ip-api.com had a hiccup or the free ip-api limit (45 lookups a minute) was hit; wait a moment and search again. |
| Style changes in `frontend/app/globals.css` don't show up | Restart `npm run dev` in `frontend` — that file isn't hot-reloaded. |

