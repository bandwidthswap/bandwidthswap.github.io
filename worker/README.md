# status.bandwidthswap.com

The Phase 0 lab's status feed: a Cloudflare Worker with one key in KV. The three Pis on the bench accept nothing from the internet, so the page cannot ask them anything. Instead the Mint (`bw-mint`) posts a summary of its ledger here every two minutes, and the page reads it back. Nothing reaches the LAN.

| Path | What it is |
|---|---|
| `src/index.js` | The Worker. |
| `wrangler.toml` | Its config: the custom domain, the KV binding. |
| `test.mjs` | Runs the Worker in Node against a KV in memory: `node test.mjs` |

## What it does

| Request | Answer |
|---|---|
| `POST /status` with `Authorization: Bearer <STATUS_TOKEN>` and the report as JSON | Stores it under one key with `received_at` (Unix seconds) added. `200 {"stored": true, "received_at": …}`. |
| `GET /status` | The latest report, `Cache-Control: public, max-age=30`, CORS for `https://bandwidthswap.com` (and `www`, and `http://localhost` for a local copy of the page). `404` until the first post. |
| `GET /` | One line of text saying what this is. |

The report is what the kit's `bwkit report --print` prints on `bw-mint`: `generated_at`, `since` (when the first entry reached the ledger), a `ledger` summary and a `nodes` list, each node with `name`, `role` (`payer`, `hop`, `mint` or `peer`), `last_receipt`, `window_bytes`, `window_t_first`, `window_t_last`, `receipts`, `windows`, `disputed`, `total_bytes` (signed, counted or settled since the bench came up) and `history`: the node's windows of the last twelve hours, each `{t_first, t_last, bytes, settled_bytes, disputed}` with the last two `null` while the window is unsettled. The Worker checks that shape (at most 64 KB, 1 to 16 nodes, names of `a-z`, `0-9` and `-`, at most 48 windows per node, counts and times as non-negative integers) and **refuses a body carrying an IPv4 or a MAC address**: the feed is names, roles, times and byte counts, and a careless reporter cannot leak a LAN detail through it. A report without `history` and `total_bytes` (an older reporter) is accepted; the page then draws the map and an empty ledger. The token is compared by hashing both sides, so the comparison does not leak where they differ.

## Deploying

Needs the wrangler login on this Mac (the same account that holds the `bandwidthswap.com` zone and the Todo Tooling MCP Worker). Local Node is v20, so wrangler 3:

```sh
cd worker
npx -y wrangler@3 kv namespace create STATUS        # once; put the id in wrangler.toml
tok="$(openssl rand -hex 32)"
printf '%s' "$tok" | npx -y wrangler@3 secret put STATUS_TOKEN
npx -y wrangler@3 deploy                             # makes the DNS record for status.bandwidthswap.com in the zone
BWKIT_STATUS_TOKEN="$tok" ~/Documents/GitHub/kit/phase0/provision.sh status   # the reporter on bw-mint
unset tok
curl -s https://status.bandwidthswap.com/status
```

The token exists in two places and no repo: the Worker's secret and `/etc/bwkit/status.env` on `bw-mint` (root only, read by systemd for the `bwkit-status` oneshot). To rotate it, run the `secret put` and the `provision.sh status` lines again with a new value.

## Limits

Cloudflare's free plan allows 1,000 KV writes a day for the whole account. The reporter posts every two minutes, 720 writes a day, and this Worker is the account's only KV writer; a one-minute timer would not fit. Reads are 100,000 a day; a page view is one.
