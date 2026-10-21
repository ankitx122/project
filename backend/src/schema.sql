-- Applied on every start; each statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  google_sub     TEXT        NOT NULL UNIQUE,
  email          TEXT        NOT NULL,
  email_verified BOOLEAN     NOT NULL DEFAULT false,
  name           TEXT,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only a SHA-256 hash of each session token is stored; the token itself lives in the cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT        PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS search_history (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  query      TEXT        NOT NULL,
  kind       TEXT        NOT NULL,
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history (user_id, created_at DESC);


-- Named lists of saved IPs / networks / hosts, each item with an optional note.
CREATE TABLE IF NOT EXISTS watchlists (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watchlists_user_idx ON watchlists (user_id, created_at);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id           BIGSERIAL PRIMARY KEY,
  watchlist_id BIGINT      NOT NULL REFERENCES watchlists (id) ON DELETE CASCADE,
  query        TEXT        NOT NULL,
  kind         TEXT        NOT NULL,
  summary      TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, query)
);
