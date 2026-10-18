# The status Worker, multi-tenant: a plan

Written Oct 18, 2026. The Worker at `status.bandwidthswap.com` is the one piece of the system that stands between a Mint and the public. Today it serves one Mint, the lab's. This plan makes it serve any Mint, and makes it something no reader has to trust. Section 6 asks whether it is the best we can do, and the answers were folded back into the sections above it.

## 0. What the Worker is today

- One tenant: the lab's Mint posts a report every two minutes with a bearer token (`STATUS_TOKEN`), the Worker checks the token and the report's shape, refuses any body carrying an IPv4 or MAC address, and stores it under one KV key. `GET /status` returns it with `received_at`.
- The report carries names, roles, times and byte counts; since bwkit 0.3.0 also the Mint's NYM, the committed hour's proof and the Steward's book. The page's verifier checks the proof against the Mint's key in the browser.
- The budget is the shape of the problem: KV on the free plan allows 1,000 writes a day, and one Mint at two minutes uses 720 of them. A second Mint at that cadence does not fit.

## 1. What multi-tenant has to mean

1. **A tenant is a Mint**, and its identity is its key. Mints already have an ed25519 NYM the whole protocol turns on; the relay must not invent a second identity, a token or an account beside it.
2. **The relay cannot forge.** Every report is signed by the Mint that made it, the signature is stored and served with it, and the reader checks it. The Worker can delay or drop a report; it cannot make one up or alter one. That is the only honest claim a hosted feed can make, and it is the property the whole paper rests on, applied to the feed.
3. **Anyone with a Mint may publish; the membership decides who is listed.** Posting needs no registration. Appearing on the network page needs the map (whitepaper A.5), which in the pilot is a file the membership keeps and later is what Mints reconcile.
4. **The public feed stays what it is**: names, roles, times and byte counts. Nothing finer than an hour, never an address, and a node a Mint marks private appears only in the Mint's aggregates.
5. **The site reads any Mint**, and the lab's by default, so every page that reads the feed today keeps working unchanged through the transition.
6. **The code is open and the relay is replaceable.** Any operator can deploy the same Worker to their own account and point their Mint at it; nothing in the kit assumes ours.

## 2. The design

### 2.1 Signed reports replace the token

A report becomes a signed record, in the spec's own idiom (the link announcement of `spec/PROTOCOL.md` Section 7 is the model):

```
{kind: "status", proto: 1, mint: <NYM>, generated_at: <unix>, ...the report as today..., sig: <base64url>}
```

The signed bytes are the domain string `bandwidthswap/status/v1`, a newline, and the canonical JSON of the record without `sig`. The Worker verifies the signature with WebCrypto's Ed25519 (Cloudflare Workers support it) against the `mint` NYM inside the record, so the key is the identity and the body is the credential. No secret is distributed, nothing is configured per Mint, and a Mint that loses its key loses its feed, exactly as it loses its NYM.

Freshness and replay: `generated_at` must be within five minutes of the Worker's clock and greater than the last `generated_at` stored for that Mint. The Worker stamps `received_at`.

### 2.2 D1 replaces KV

KV was the right store for one key and the wrong one for many writers. Cloudflare D1 (SQLite) on the free plan allows 100,000 writes and five million reads a day and five gigabytes, which is a hundred times the writes for the same price. The schema, in `worker/migrations/0001.sql`:

- `reports(mint PRIMARY KEY, name, domain, generated_at, received_at, body, sig)`: the latest report per Mint, as the bytes the Mint signed.
- `windows(mint, node, role, t_first, t_last, bytes, settled_bytes, disputed, PRIMARY KEY(mint, node, t_first))`: every node's hourly windows, extracted from each report's `history` on arrival. This is what the single-tenant Worker could never have: a public history longer than twelve hours, at no extra writes beyond the report itself. Pruned to 30 days.
- `commitments(mint, window, root, count, signature, t, PRIMARY KEY(mint, window))`: each Mint's hourly roots as they arrive, so a reader can check any hour of the last month.
- `mints(mint PRIMARY KEY, name, domain, first_seen, last_seen, listed)`: who has posted, and whether the map lists them.
- `map(id PRIMARY KEY, body, by, at)`: the membership's map as a signed record.
- `meter(day PRIMARY KEY, writes)`: the day's accepted writes, so the Worker refuses with 429 before D1 would with an error.

### 2.3 Routes

| Route | What |
|---|---|
| `POST /report` | a signed report; 200 with `received_at`, 401 on a bad signature, 409 on a stale `generated_at`, 413 over 64 KB, 422 on a shape or address fault, 429 over the rate |
| `GET /status` | the default Mint's latest report (`DEFAULT_MINT` in `wrangler.toml`), unchanged in shape plus `sig` and `received_at`: every page that reads the feed today keeps working |
| `GET /mints` | the listed Mints: name, domain, places, last seen, windows settled, with `unlisted: n` for the rest |
| `GET /mints/<nym>/status` | that Mint's latest report, listed or not |
| `GET /mints/<nym>/history?hours=168` | its windows and commitments over the span, from the tables, `Cache-Control: max-age=60` |
| `GET /map` | the map as last posted |
| `GET /` | what this is, in a sentence, with the routes |

CORS allows any origin to read; the JSON is public. `POST /report` takes any origin, since the body is its own credential.

### 2.4 Admission, listing and abuse

- Anyone may post. A Mint's report is accepted once per 60 seconds per NYM; the body is at most 64 KB; the address refusal stands and now also runs over the signed body.
- The map lists. The map record is posted signed by a Mint whose NYM is in `ADMIN_MINTS` (the lab's, for the pilot); a Mint on the map is `listed` and appears in `/mints` and on the network page; any other Mint is reachable by its NYM and nowhere else. When Mints reconcile the map among themselves (A.5), the admin list goes away and the reconciled map takes its place.
- A global guard: the `meter` row stops accepting writes at 80,000 a day, with a 429 whose body says so, long before D1 refuses.

### 2.5 The kit

- `bwkit report` signs the report with the Mint's own key and posts it to `status_url` from the config; `BWKIT_STATUS_TOKEN` and `/etc/bwkit/status.env` go away; `last_report_at` stays.
- Cadence: a heartbeat every ten minutes, and a post right after each hour's commitment so the hour appears within seconds. About 170 writes a day per Mint: three hundred Mints fit the free plan's guard.
- The `status` record is added to the spec's interface section as informative, so a second implementation posts the same thing.
- A node may be marked `private` in the Mint's peer list; the report then carries it only inside the Mint's totals.

### 2.6 The site

- The Lab status verifies the report's signature in the browser with `bsp.js` and says "signed by the Mint" beside the commitment check, or says it could not, so the relay is a pipe the reader does not trust.
- A Mint picker appears on the Lab status and the Steward's book when `/mints` lists more than one; `docs/steward.html?mint=<nym>`.
- The ledger strip draws seven days from `/history` instead of twelve hours from the report.
- `docs/network.html`: every listed Mint with its domain, places, last hour and size, the map of the network as the public may see it, and the sentence that listing is the pilot membership's until Mints reconcile the map.

### 2.7 Self-hosting

The Worker, its migrations and its tests are in this repo under `worker/`; `README.md` gets the one-page deploy for another operator: create the D1 database, set `DEFAULT_MINT` and `ADMIN_MINTS`, deploy, point the Mint's `status_url` at it. The site reads our relay; reading several relays is a later plan.

## 3. Build order

Each phase has tests, its own commits, and a done line.

- **P1, the Worker.** The D1 schema and migration; `POST /report` with signature verification; the new GETs; the token `POST /status` kept and now stored into D1 as well, so the lab's Mint keeps posting while the kit changes; `test.mjs` extended with a fake D1 binding and real test vectors from the kit's `spec/vectors/keys.json` for the signature; a `wrangler d1 execute --local` smoke; deploy. Done when the live `/status` is served from D1 with the shape unchanged and the lab's page draws.
- **P2, the kit.** The signed report, `status_url`, the ten-minute timer and the after-commit post, the `status` record in the spec, rollout to bw-mint. Then the token path and `STATUS_TOKEN` are removed from the Worker and the KV namespace is deleted. Done when the live report carries `sig` and the Worker's token code is gone.
- **P3, the site.** The signature check in the browser, the Mint picker, the seven-day strip, the Steward's book per Mint, the network page. Done when the Lab status says "signed by the Mint" against the live feed.
- **P4, the words.** `worker/README.md`, both repos' CLAUDE.md, the spec's note; and one sentence for the paper's Section 9, that the public feed is signed by the Mint and verified by the reader, which goes on the proof sheet.

## 4. Risks

- Ed25519 in Workers: supported by WebCrypto on current compatibility dates; P1 proves it on a deploy before anything else is built on it.
- D1 is a single-region database; the feed tolerates seconds of latency and a minute of outage, so that is fine.
- The map's admission is one operator's file until reconciliation exists; the network page says so.
- A Mint's key is its identity: no recovery. That is the protocol's own rule.
- Reads at scale: the site polls every minute per visitor; `/history` is cached for a minute at the edge; five million reads a day is many thousands of visitors.

## 5. What was rejected

- Durable Objects and a VPS: both solve a problem we do not have and cost money or operations we do not want.
- Tokens per Mint: a registration step and a secret to distribute, replaced by the key the Mint already has.
- A static site only, with no live feed: the live feed is the evidence that the network runs, and the one thing the site has that a paper cannot.
- Reading each Mint's `/status` directly from the browser: nodes sit behind CGNAT and serve HTTP, which an HTTPS page cannot read; the relay exists because of that and for nothing else.

## 6. Is this the best we can do?

Asked of the plan before any of it is built. What the answer changed:

1. **A signature nobody checks is a courtesy.** The first draft signed reports and stored the signature. The relay is only untrusted if the reader verifies, so the site's pages check the signature in the browser and say so; the Lab status already verifies the proof, and this is the same code on the report. Section 2.6 now leads with it.
2. **Open posting and a 1,000-write budget cannot coexist.** The first draft kept KV and admitted only mapped Mints. That turns the relay into a registry with a gatekeeper. D1 lifts the budget a hundredfold, so anyone may post and the map only decides who is listed; the per-key rate and the global guard do the rest. Section 2.2 and 2.4 were rewritten for it.
3. **The table of windows is the feature.** Extracting each report's hourly windows into a table costs nothing extra and gives the public a month of history per link, which the single-tenant design could not afford. The site's twelve-hour strip becomes a week, and the paper's Section 10 drift and gap questions get a public record.
4. **The token's removal is the largest simplification**, not a detail: no secret to make, send or rotate for a new Mint, no `status.env` on the Mint, and the relay can be redeployed by anyone without re-issuing anything. It stays for one transition only.
5. **Cadence by event, not by clock.** A heartbeat every ten minutes plus a post when the hour commits beats a two-minute clock: the hour shows up faster and the writes fall by three quarters.
6. **Privacy got a per-node switch.** A month of hourly bytes per named node is traffic metadata; the names are nodes, not people, but a Mint must be able to keep a node out of the public history, and the `private` mark does that at the source.
7. **What is still not the best**: listing is one operator's file; the plan says so on the network page and names the reconciliation that replaces it. And the relay is still a single operator's Worker; the honest answer to that is Section 2.7, the one-page deploy for anyone else, and a later plan for the site to read more than one relay.
8. **Does this touch the protocol?** No; the status feed was always outside it. But the signed `status` record belongs in the spec's interface section as informative, so the next Mint posts the same thing without reading our Worker's source. Section 2.5 added it.
