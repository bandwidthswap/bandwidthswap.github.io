# status.bandwidthswap.com

The status feed of the Bandwidth Swap pilot: a Cloudflare Worker with a D1 database. A Mint posts a summary of its ledger here, signed with its own key, and the page at https://bandwidthswap.com/#lab reads it back. The nodes accept nothing from the internet, so the page cannot ask them anything; the Mint pushes, and nothing reaches a LAN. The Worker keeps the bytes the Mint signed and serves them with the signature, so it can delay or drop a report and cannot make one up or alter one. A reader checks the signature with `docs/bsp.js`. The design is [PLAN.md](PLAN.md); phase 1 of it is built here, and [P1-PUNCHLIST.md](P1-PUNCHLIST.md) was its work list.

| Path | What it is |
|---|---|
| `src/index.js` | The Worker: the shape checks, the signature check, the routes. |
| `src/sql.js` | Every SQL statement, by name. The fake D1 of the tests implements each by name and refuses other text. |
| `src/selftest.js` | The kit's link vector, verified on every `GET /` to prove Ed25519 works where the Worker runs. |
| `migrations/0001.sql` | The six tables. |
| `wrangler.toml` | The custom domain, the D1 binding, `DEFAULT_MINT` and `ADMIN_MINTS`. |
| `test.mjs`, `fake-d1.mjs`, `sign.mjs` | 145 checks in Node against a D1 in memory: `node test.mjs`. `sign.mjs` signs records from the kit's test seeds. |
| `smoke.mjs` | The Worker in workerd with the real SQL against a local D1: a signed report posted and every GET read. |

## Routes

| Request | Answer |
|---|---|
| `POST /report`, a signed status record | `200 {"stored": true, "received_at": …, "rows_written": n}`. `413` over 64 KB. `400` for a body that is not JSON. `422` for a shape fault, or an IPv4 or MAC address anywhere in the text. `403` for one of the three test keys of the kit's `spec/vectors/keys.json` (unless `ALLOW_TEST_KEYS` is set, which `wrangler.toml` does not). `401` when the signature does not verify under `mint`. `409` when `generated_at` is more than 300 s from the Worker's clock, or not greater than the one stored for that Mint. `429` for a second accepted report from the same Mint within 60 s (with `Retry-After`), or when the day's meter has reached 80,000 rows; the body says which. |
| `GET /status` | The default Mint's latest report (`DEFAULT_MINT` in `wrangler.toml`), `Cache-Control: public, max-age=30`. The shape the page has always read, plus `sig` and `received_at`. `404` until the first post. |
| `GET /mints` | `{"mints": [{mint, name, domain, places, last_seen, windows_settled}], "unlisted": n}`: the Mints the map lists that have posted, and how many have posted unlisted. |
| `GET /mints/<nym>/status` | That Mint's latest report, listed or not. |
| `GET /mints/<nym>/history?hours=168` | `{mint, hours, since, windows, commitments}`: its nodes' windows (`node, role, t_first, t_last, bytes, settled_bytes, disputed`) and its hourly commitments whose hour began within the span. Default 168 hours, at most 744. `Cache-Control: public, max-age=60`. |
| `GET /map` | The map as last posted, a signed record. `404` until the first. |
| `POST /map`, a signed map record | `200 {"stored": true, "at": …, "listed": n}` from a Mint in `ADMIN_MINTS`; `403` from any other; `401` on a bad signature; `409` when `at` is not newer than the stored map's; `422` for a shape fault or an address. |
| `GET /` | What this is, the routes, the default Mint, and `"ed25519": "ok"` when the signature check works in this runtime. |
| `POST /status` | `410`: the Phase 0 lab's bearer-token path, Oct 16 to Oct 19, 2026, is gone; the body says to post a signed record to `/report`. |

Every response allows any origin (`Access-Control-Allow-Origin: *`): the feed is public and the reader checks the signature. The preflight allows `POST` with `Content-Type` on `/report` and `/map`.

## The signed record

A status record is the report as the kit's `bwkit report --print` prints it, with four members fixed:

```
{"kind": "status", "proto": 1, "mint": "<NYM>", "generated_at": <unix>, …the report…, "sig": "<base64url>"}
```

The signed bytes are the domain string `bandwidthswap/status/v1`, a newline, and the canonical JSON of the record without `sig` (the kit's `spec/PROTOCOL.md`, Section 3: keys sorted, no whitespace, non-ASCII escaped, floats as Python writes them). The signature is Ed25519 by the key whose NYM is in `mint`, base64url without padding, 86 characters. The key is the identity: nothing is registered and no token is issued. A Mint that loses its key loses its feed, as it loses its NYM.

The report is names, roles, times and byte counts: `generated_at`, `since`, a `ledger` summary and a `nodes` list (1 to 16), each node with `name` (`a-z`, `0-9`, `-`), `role` (`payer`, `hop`, `mint`, `peer`), `last_receipt`, `window_bytes`, `total_bytes` and `history`, its windows of the last twelve hours (at most 48), each `{t_first, t_last, bytes, settled_bytes, disputed}` with the last two null while unsettled. It may carry `commitment` (the Mint's latest hour: `window`, `root`, `count`, `signature`, `t`, `mint`; null before the first), `proof` (that hour's proof document as `bwkit prove` prints it), `steward` (the Steward's book as bwkit 0.4.0 posts it: balances, purchases with routes in place names, payouts, links, the map of domains and places; the Oct 17 fixture shape is admitted too) and `name` and `domain` (names) for the Mint itself. A `commitment` or `proof` carrying another Mint's NYM is refused. The Worker checks shape and bounds; the page checks the proof. Nothing in a report may be an IPv4 or a MAC address; NYMs are public keys and may appear.

**Floats.** Python writes a whole-valued float as `0.0` and `JSON.parse` reads it as `0`, which changes the canonical bytes and breaks the signature. The Worker parses with `bsp.parse`, which remembers which numbers were floats, removes `sig` with `delete` (a spread copy would lose the marks) and canonicalises with `bsp.canon`. A Mint in Python has nothing to do; a signer in JavaScript signs the text it wrote (`sign.mjs` shows both ways).

**What is served is what was signed.** A stored report is kept as the text received and served with `,"received_at":<unix>` spliced in before its last brace (a row the token path stored before Oct 19, 2026 would get `,"sig":null` as well). Re-serialising would drop the floats. To verify a served report: `bsp.parse` the text, note `sig` and `received_at`, `delete` both, and check `sig` under `mint` over `bandwidthswap/status/v1`, a newline and `bsp.canon` of what is left. `smoke.mjs` does exactly that against a local Worker.

**The map** is `{"kind": "map", "proto": 1, "by": "<NYM>", "at": <unix>, "map": {"mints": [{"nym", "name", "domain"}], …}, "sig"}`, signed by `by` over `bandwidthswap/map/v1`, a newline and the canonical JSON without `sig`. `map.mints` names the listed Mints by NYM (at most 64, each once), with a name and a domain that fill in what the Mint's own report does not say; anything else in `map` is kept and served as posted. The membership keeps this file for the pilot; when Mints reconcile the map among themselves (whitepaper A.5), `ADMIN_MINTS` goes away. Two decisions the plan left open were taken here: the domain string is `bandwidthswap/map/v1`; the map names Mints as `map.mints: [{nym, name, domain}]` and `/mints` shows those that have posted. The kit posts it with `bwkit map post`.

## What is stored, and the budget

`migrations/0001.sql`, the six tables of PLAN.md 2.2: `reports` (the latest report per Mint, as the bytes it signed), `windows` (every node's hourly windows, extracted from each report's `history` on arrival, so the public has a month of history per link where the report has twelve hours), `commitments` (each Mint's hourly roots), `mints` (who has posted, whether the map lists them, their places, when they were last pruned), `map` (the one signed record) and `meter` (the day's rows written). Windows and commitments older than 30 days are pruned, at most once an hour per Mint.

D1's free plan allows 100,000 rows written a day, and an index entry is a row. So the small tables are `WITHOUT ROWID` (the key is the table; a write is one row), nothing has a second index, and every upsert says in its `WHERE` when nothing changed, so an unchanged window is not written. Measured in workerd on Oct 18, 2026: a first report from a Mint with 36 windows and a commitment wrote 42 rows (the windows, the commitment, the report and its key, the Mint's row, the prune stamp, the meter); the same report again, with nothing changed, wrote 3 (the report, the Mint's row, the meter). The lab's Mint at two minutes, with a window or two changing an hour, is under 4,000 rows a day; the meter stops accepting at 80,000. The `meter` row is written after the batch, with the sum of each statement's `rows_written`, so it counts what D1 counts.

The KV namespace of the token path (1,000 writes a day, the whole reason KV could not serve more than one Mint) was deleted with the path.

## Running it locally

Node 20 or newer; wrangler 3 through `npx -y wrangler@3` (wrangler 4 wants a newer Node). The kit cloned beside this repo (`../kit`) lets `tools/check-vectors.mjs` confirm `docs/bsp.js` is the kit's copy.

```sh
cd worker
node test.mjs                                                                      # 145 checks, no network, no login
npx -y wrangler@3 d1 execute bandwidthswap-status --local --file=migrations/0001.sql   # once: a local D1 under .wrangler/
npx -y wrangler@3 dev --local --var ALLOW_TEST_KEYS:1 --var ADMIN_MINTS:ed25519:ZSkFPo6PQCl9IKHZpRXT7zp_1vBFqEcpwW0Zucj1Wsg
node smoke.mjs                      # in another terminal: posts as the kit's vector Mint, reads every GET, verifies what is served
node smoke.mjs --wait               # the same, then the same report 61 s later, to show the rows an unchanged report writes
```

`ALLOW_TEST_KEYS` lets the vector Mint post; `ADMIN_MINTS` set to its NYM lets it post the map too. Neither is in `wrangler.toml`. `npm test` at the repo root runs `test.mjs` and the vector check.

## Deploying

Needs the wrangler login on the Mac that deploys (the Cloudflare account that holds the `bandwidthswap.com` zone). A deploy is a public action. From `worker/`:

```sh
npx -y wrangler@3 login                                          # a browser opens; then:
npx -y wrangler@3 whoami                                         # must name the account
npx -y wrangler@3 d1 create bandwidthswap-status                 # once; prints a database_id
#   put the database_id into wrangler.toml in place of the zeros, and commit it
npx -y wrangler@3 d1 execute bandwidthswap-status --remote --file=migrations/0001.sql
npx -y wrangler@3 deploy
curl -s https://status.bandwidthswap.com/                        # "ed25519": "ok"
curl -s https://status.bandwidthswap.com/status | grep -o '"sig":null'
```

The first `curl` is the Ed25519 self-test on the deploy. The second shows `/status` served from D1 with the Mint's signature; it holds once the Mint has posted (`phase0/provision.sh status` in the kit sends a report at once, and the timer every ten minutes). Then check that https://bandwidthswap.com/#lab still draws.

There is no secret and no KV namespace: the Mint's key is the credential, and a Mint that loses its key loses its feed, as it loses its NYM. The Phase 0 lab posted with a bearer token to `POST /status` from Oct 16 to Oct 19, 2026; that path, its secret `STATUS_TOKEN` and its KV namespace left with bwkit 0.5.0, whose `bwkit report` signs.

## Running your own

Another operator deploys the same Worker to their own Cloudflare account and points their Mint at it; nothing in the kit assumes ours (PLAN.md 2.7). Clone this repo, and in `worker/wrangler.toml` set `name` and `routes` to your own, `DEFAULT_MINT` to your Mint's NYM and `ADMIN_MINTS` to the NYMs that may post your map. Then the deploy steps above. Your Mint's `status_url` is `https://<your host>/report` (`phase0/provision.sh status` in the kit sets it with `BWKIT_STATUS_URL`), and `bwkit map post` lists it; the site reads our relay, and reading several is a later plan.
