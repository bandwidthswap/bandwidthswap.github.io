-- 0001: the multi-tenant status feed, the six tables of worker/PLAN.md 2.2.
--
-- Locally:   npx -y wrangler@3 d1 execute bandwidthswap-status --local  --file=migrations/0001.sql
-- Live:      npx -y wrangler@3 d1 execute bandwidthswap-status --remote --file=migrations/0001.sql
--
-- D1's free plan meters rows written, not requests, and an index entry is a row. So the small tables are
-- WITHOUT ROWID (the primary key is the table; one write is one row) and nothing has a second index.
-- `reports` keeps its rowid: a WITHOUT ROWID table is the wrong shape for a 64 KB body.

-- The latest report per Mint, as the bytes the Mint signed. `sig` is NULL for a report that came through the
-- bearer-token path, which P2 removes. `name`, `domain` and the places are read out of the report on arrival.
CREATE TABLE IF NOT EXISTS reports (
  mint         TEXT PRIMARY KEY,
  name         TEXT,
  domain       TEXT,
  generated_at INTEGER NOT NULL,
  received_at  INTEGER NOT NULL,
  body         TEXT NOT NULL,
  sig          TEXT
);

-- Every node's hourly windows, extracted from each report's `history`. Pruned to 30 days, at most once an hour per Mint.
CREATE TABLE IF NOT EXISTS windows (
  mint          TEXT    NOT NULL,
  node          TEXT    NOT NULL,
  role          TEXT    NOT NULL,
  t_first       INTEGER NOT NULL,
  t_last        INTEGER NOT NULL,
  bytes         INTEGER NOT NULL,
  settled_bytes INTEGER,
  disputed      INTEGER,
  PRIMARY KEY (mint, node, t_first)
) WITHOUT ROWID;

-- Each Mint's hourly roots as they arrive, so a reader can check any hour of the last month.
CREATE TABLE IF NOT EXISTS commitments (
  mint      TEXT    NOT NULL,
  window    INTEGER NOT NULL,
  root      TEXT    NOT NULL,
  count     INTEGER NOT NULL,
  signature TEXT    NOT NULL,
  t         INTEGER NOT NULL,
  PRIMARY KEY (mint, window)
) WITHOUT ROWID;

-- Who has posted, and whether the map lists them. A Mint the map names has a row before it posts (first_seen NULL).
-- `places` is a JSON list of the place ids in the Mint's last report; `pruned_at` is when its windows were last pruned.
CREATE TABLE IF NOT EXISTS mints (
  mint       TEXT PRIMARY KEY,
  name       TEXT,
  domain     TEXT,
  places     TEXT    NOT NULL DEFAULT '[]',
  first_seen INTEGER,
  last_seen  INTEGER,
  listed     INTEGER NOT NULL DEFAULT 0,
  pruned_at  INTEGER
) WITHOUT ROWID;

-- The membership's map, one signed record (PLAN.md calls the signer column `by`; BY is an SQL keyword, so `signer`).
CREATE TABLE IF NOT EXISTS map (
  id     INTEGER PRIMARY KEY CHECK (id = 1),
  body   TEXT    NOT NULL,
  signer TEXT    NOT NULL,
  at     INTEGER NOT NULL
);

-- The day's rows written (UTC date), so the Worker answers 429 long before D1 refuses.
CREATE TABLE IF NOT EXISTS meter (
  day    TEXT PRIMARY KEY,
  writes INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
