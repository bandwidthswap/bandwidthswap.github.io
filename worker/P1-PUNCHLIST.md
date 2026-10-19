# Phase 1 of the multi-tenant Worker: the punch list

Written Oct 18, 2026, and paused by the owner before any code was written. **Built later the same day**, on the branch `worker/p1-multi-tenant`, one commit per item with its tests (160 checks in `test.mjs`, and `smoke.mjs` against workerd); the live Worker is still the Oct 16 build until the owner's section at the end is run. `PLAN.md` is the design; this is the work of its phase P1 (Section 3) in order, with what each item is done when, what was found while reading, and what was found while building.

## Before you start

- Read all of `PLAN.md`: Section 2 is the design, Section 3 the phases, Section 6 the reasons.
- Clone `bandwidthswap/kit` beside this repo (`../kit`). Read `spec/PROTOCOL.md` Section 2 (identities), Section 3 (canonical JSON and the number rule) and Section 7 (the link announcement, the model for the signed status record). `spec/vectors/keys.json` holds three test-only keys with their seeds.
- Node 20 or newer; wrangler 3 through `npx -y wrangler@3` (wrangler 4 wants a newer Node than the Mac's 20.0).
- Do not edit the kit. Do not change `docs/bsp.js`: it is the kit's `dashboard/bsp.js` vendored, and `tools/check-vectors.mjs` fails when the two differ. Import it; wrangler bundles it.
- Baseline: `node worker/test.mjs` passes 60 checks; `npm test` at the root runs it and the vector check.
- Every item but the last section builds and tests without a Cloudflare login. The login is the owner's (an OAuth grant), and a deploy is a public action.
- What the lab's Mint posts today (bwkit 0.4.0, every two minutes, bearer token): the report with `mint` at the top level, `proto: 1`, `commitment`, `proof` and `steward`; no `kind`, no `sig`. The token path must keep taking exactly that.

## The work

- [x] **1. The schema.** `worker/migrations/0001.sql` with the six tables of PLAN.md 2.2: `reports`, `windows`, `commitments`, `mints`, `map`, `meter`. In `wrangler.toml`, a `[[d1_databases]]` binding `DB` with `database_name = "bandwidthswap-status"`, a placeholder `database_id`, and a comment saying to fill it from `npx -y wrangler@3 d1 create bandwidthswap-status`. Keep the KV binding `STATUS`: the token path and the fallback use it until P2. Put `DEFAULT_MINT` and `ADMIN_MINTS` (comma-separated) in `[vars]` with the lab Mint's NYM, `ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM`; NYMs are public keys. Consider `WITHOUT ROWID` for `windows` and `commitments` (see the note on rows written). Done when `npx -y wrangler@3 d1 execute bandwidthswap-status --local --file=migrations/0001.sql` runs clean.

- [x] **2. `POST /report`.** The signed record of PLAN.md 2.1: `kind: "status"`, `proto: 1`, `mint`, `generated_at`, the report's fields, `sig`. The signed bytes are `bandwidthswap/status/v1`, a newline, and the canonical JSON of the record without `sig`, verified with `pubOfNym` and `verifySignature` from `docs/bsp.js` against the `mint` inside the record. Answers:
  - 413 over 64 KB, measured in bytes before parsing.
  - 400 for text that is not JSON.
  - 422 for a shape fault (the existing `checkReport`, plus `kind`, `proto`, `mint` as a NYM and `sig` as 86 base64url characters) or an IPv4 or MAC address anywhere in the text.
  - 403 for one of the three test NYMs, unless `ALLOW_TEST_KEYS` is set (see below).
  - 401 when the signature does not verify.
  - 409 when `generated_at` is more than 300 s from the Worker's clock, or not greater than the one stored for that Mint.
  - 429 for a second accepted write from the same Mint within 60 s, or when the day's meter has reached 80,000; the body says which.
  - 200 `{stored: true, received_at}` after one `DB.batch`: upsert `reports`, upsert `mints` (`listed` when the map names it), write the report's `history` windows into `windows` and its `commitment` into `commitments`, bump `meter`.

- [x] **3. The GETs of PLAN.md 2.3.**
  - `/status`: the `DEFAULT_MINT`'s latest report from D1, falling back to the KV key while D1 has none; the shape unchanged plus `sig` and `received_at`.
  - `/mints`: the listed Mints with name, domain, places, last seen and windows settled, and `unlisted: n`.
  - `/mints/<nym>/status`: that Mint's latest report, listed or not.
  - `/mints/<nym>/history?hours=`: windows and commitments over the span, default 168, at most 744, `Cache-Control: max-age=60`.
  - `/map`: the map as last posted.
  - `/`: what this is, the routes, and the Ed25519 self-test below.
  - CORS: `Access-Control-Allow-Origin: *` on every GET, and the preflight allows `POST` with `Content-Type` for `/report` and `/map`.

- [x] **4. The map.** `POST /map` with a signed record `{kind: "map", proto: 1, by: <NYM>, at, map: {...}, sig}`, accepted only when `by` is in `ADMIN_MINTS` (403 otherwise, 401 on a bad signature, 409 when `at` is not newer than the stored map's). It replaces the one stored map and sets `listed` on the Mints it names, clearing it on those it no longer names.

- [x] **5. The token path.** `POST /status` with the bearer token keeps working exactly as today (its shape faults stay 400, which the 60 existing checks assert) and now also stores into D1: an unsigned report with `sig: null`, the Mint taken from the body's `mint`, or `DEFAULT_MINT` when absent. Keep writing the KV key too, so a rollback to the Oct 16 build loses nothing. Mark the whole path in the code as what P2 removes.

- [x] **6. Tests and the local smoke.** Extend `test.mjs` with a fake D1 binding (`prepare`, `bind`, `first`, `all`, `run`, `batch` over in-memory tables, enough for the statements the Worker uses) and cover:
  - a good signed report stored and served;
  - a bad signature, 401;
  - a stale `generated_at`, 409;
  - the rate limit, 429;
  - an address in the signed body, 422;
  - the token path still storing, into D1 and KV;
  - `/mints` listing only mapped Mints;
  - `/history` returning the windows of a posted report;
  - the map accepted from an admin NYM and refused from another;
  - the CORS check that flips: another origin now gets `*`.

  Then the smoke, recorded in the README as how to run the Worker locally: the migration with `d1 execute --local`, `wrangler dev --local` with `--var ALLOW_TEST_KEYS:1`, and a script (`smoke.mjs`, sharing the signing helper with `test.mjs`) that posts a signed record and reads every GET. Note the rows written per report it measures.

- [x] **7. The README.** Rewrite `worker/README.md` for the multi-tenant Worker: the routes, the signed record and its bytes, the local run, the deploy (the login steps, exactly), and how another operator self-hosts it (PLAN.md 2.7).

## Found while reading: read before writing code

- **Parse with `bsp.parse`, not `JSON.parse`.** The report carries numbers the Mint wrote as floats with a whole value, such as a keepalive settlement's `amount_usd: 0.0` inside `proof`. `JSON.parse` makes them integers, and then the canonical bytes, and the signature, no longer match. `bsp.parse` remembers which numbers were floats and `canon` writes them back. Remove `sig` with `delete` on the parsed object: a spread copy loses the float marks of the top-level members. `bsp.parse` returns a BigInt for an integer above 2^53, and `checkReport` then refuses it, which is the spec's rule.
- **Store the text, serve the text.** Keep the body exactly as received in `reports.body` and serve it by splicing `received_at` (and `"sig":null` for a token report) in before its last `}`. Re-serialising it would drop the floats, and a browser could no longer check the signature in P3. A reader removes `sig` and `received_at` before verifying; say so in the README.
- **Pin Ed25519 to WebCrypto.** `bsp.js` decides its backend by importing an all-zero key, and if that throws it imports noble-ed25519 from jsDelivr. A URL import fails on Workers, and `verifySignature` returns false instead of throwing, so a failed probe would answer 401 to every good report. Call `useEd25519('webcrypto')` once at module start. Wrangler 3.114 bundles a Worker that imports `../docs/bsp.js` without complaint (a dry run on Oct 18 made 9 KiB); the noble import stays in the bundle, unused.
- **Prove Ed25519 on `GET /`.** PLAN.md Section 4 asks P1 to prove Ed25519 on a deploy before anything is built on it. The cheapest proof posts nothing: embed the kit's `spec/vectors/link.json` as text, verify its signature under its `relay` with the domain `bandwidthswap/link/v1` on each `GET /`, and report `ed25519: "ok"` or `"failed"`.
- **Refuse the test keys in production.** The kit's `spec/vectors/README.md` says a Mint should refuse the three vector NYMs. The Worker should answer 403 to them unless the var `ALLOW_TEST_KEYS` is set; `test.mjs` and the local smoke set it, `wrangler.toml` does not.
- **D1 counts rows written, not requests.** The free plan's 100,000 a day is rows, and an index update counts as another row. Rewriting every window of every report would be about 50 rows a report, over 36,000 a day for the lab's Mint alone at two minutes. Write only what changed: `INSERT … ON CONFLICT(mint, node, t_first) DO UPDATE SET … WHERE` the stored values differ, so an unchanged window is not written, and the same for `commitments`. Count the meter in rows, the sum of each statement's `meta.rows_written`, not in reports. Prune windows older than 30 days at most once an hour per Mint, since deletes are writes too. PLAN.md 2.2's "no extra writes beyond the report itself" holds only this way.
- **The fake D1 is hand-written.** Node 20 has no `node:sqlite` and the repo takes no dependencies. Keep the Worker's SQL in one exported object of named statements, so the fake implements each by name and cannot drift from the real SQL; the local smoke runs the real SQL in workerd.
- **Signing in Node from a seed.** WebCrypto takes an Ed25519 private key as PKCS#8, which is a fixed 16-byte prefix and the 32-byte seed:

  ```js
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(seed, 'hex')]);
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, true, ['sign']);
  const nym = 'ed25519:' + (await crypto.subtle.exportKey('jwk', key)).x;   // must equal keys.json's nym
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', key, bytes)).toString('base64url');
  ```

- **Decisions still open.** Take them and write them in the README:
  - The map's domain string. Suggested: `bandwidthswap/map/v1`, built like the status record's.
  - How the map names Mints. The Steward's map in the feed names places and one Mint by name; listing needs NYMs. Suggested: `map.mints: [{nym, name, domain}]`, with `/mints` showing those that have posted.
  - Whether the token path should also obey the 60-second rate. It posts every 120 s, so either way is safe.

## Found while building: Oct 18, 2026

- **The stricter shape check that main carried would have refused the live feed.** It was written against the Oct 17 fixture, and bwkit 0.4.0 posts a different Steward's book: a payout's `window` is `{t_first, t_last}`, links carry `payer`, `hop`, `fees_usd` and `take_usd`, the map has `domains` keyed by name and places with an `id` and a free-text `name`. Deploying main's `worker/` as it was would have turned the lab's two-minute post into a 400 and frozen the Lab status. `checkSteward` now admits both shapes, and `tools/fixtures/report-bwkit-0.4.0.json` (the live report of Oct 18, 21:00 UTC) is posted on both paths by `test.mjs` so it cannot happen again. (The site's `docs/steward.html` still reads the Oct 17 shape; that is P3's.)
- **What D1 counts, measured in workerd:** a first report with 36 windows and a commitment writes 42 rows (the windows, the commitment, the report and its primary-key index, the Mint's row, the prune stamp, the meter); the same report with nothing changed writes 3. `reports` keeps its rowid, so its first insert costs two rows and an update one. The `meter` row is written after the batch with the sum of the batch's `rows_written`, plus one for itself: it cannot be in the same batch, since the count is only known afterwards.
- **Two orderings that bit the tests.** A second record in the same second is "not newer" (409) before it is "too soon" (429), so a rate test needs `generated_at` one second ahead. And the last character of an 86-character base64url signature carries four padding bits: changing it changes nothing, so a tamper test must change another character.
- **Wrangler 3.114 runs the local Worker on a runtime whose latest compatibility date is 2025-07-18** and falls back to it from the 2025-09-01 in `wrangler.toml`; Ed25519 verifies there all the same (`GET /` says `ok`). `d1 execute --local` and `dev --local` take the placeholder `database_id`; the local database lives under `worker/.wrangler/` (ignored).
- **The vendored `bsp.js` bundles clean.** Its import of noble from jsDelivr stays in the bundle unused; `useEd25519('webcrypto')` at module start keeps the probe from ever running.
- **`mints` gained two columns** beyond PLAN.md 2.2, `places` (a JSON list of place ids from the Mint's last report) and `pruned_at`; the map table's signer column is `signer`, since `BY` is a keyword.

## Left for the owner: needs the Cloudflare login

From `worker/`, once the branch is merged to main and `node test.mjs` passes (on Oct 18 the Mac in use, the `isiah` account on Roberts-MacBook-Pro-3, already has the login: `whoami` names the account):

```sh
npx -y wrangler@3 login
npx -y wrangler@3 d1 create bandwidthswap-status
# put the printed database_id into wrangler.toml, commit it
npx -y wrangler@3 d1 execute bandwidthswap-status --remote --file=migrations/0001.sql
npx -y wrangler@3 deploy
curl -s https://status.bandwidthswap.com/
curl -s https://status.bandwidthswap.com/status | grep -o '"sig":null'
```

The first GET shows the Ed25519 self-test. The second proves `/status` is served from D1, because a report from KV has no `sig`; it holds once bw-mint's next two-minute post has gone through the token path. P1 is done when that holds and https://bandwidthswap.com/#lab still draws. P2 (the kit signs its reports) and P3 (the site verifies them) follow, as `PLAN.md` Section 3 says.
