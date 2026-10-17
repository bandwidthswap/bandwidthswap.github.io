# Bandwidth Swap: project context for any agent

Read this first. It is the handoff between machines and sessions. Everything an agent needs to continue is in this repo; nothing lives only in one person's memory or one machine's scratch folder.

## What this project is

A receipt-based bandwidth marketplace. The 2021 whitepaper ($BANDWIDTH, Robert Douglas and Chris Odom) proposed proof-of-bandwidth by self-report. In October 2026 it was revised to v0.2: the settled payment of a user who received the bytes is the proof, each hop is paid only when the next hop acknowledges, and no reward may exceed the fee that produced it. The treasury does not hand out bonuses; it buys bandwidth on links it wants to exist.

Site: https://bandwidthswap.com, served by GitHub Pages from `main` of this repo. Contact in the paper: bandwidthswap@pm.me.

## Repo layout

| Path | Role |
|---|---|
| `index.html` | The project page. Hand-written HTML, no build step. |
| `docs/` | Everything the site serves besides the page. **Generated**, except the 2021 PDF. Do not edit by hand. |
| `paper/BANDWIDTH-whitepaper-v0.3.md` | **The paper's source of truth.** Edit this. Oct 17, 2026: the open questions resolved by their defaults and the Phase 0 lab, Section 9 on the pilot, Section 10 on what stays open, Appendix A on links with delay (the protocol as link parameters). |
| `paper/BANDWIDTH-whitepaper-v0.2.md` | The Oct 8, 2026 revision as published; the baseline for the v0.3 diff. Never edit. |
| `paper/BANDWIDTH-whitepaper-v0.1.md` | Faithful Markdown clone of the 2021 PDF. Never edit; it is the diff baseline. |
| `paper/whitepaper-spelling-diff.html` | Record of the copyedit pass on v0.2. Historical. |
| `SHOPPING-LIST.md` | Parts to turn the three Pi 3 boards into nodes, by phase, with budget. |
| `PHASE0-SETUP.md` | **The hands-on handoff for Phase 0**: what is already set up on the Mac, how to flash the three cards, how to check the nodes, and the exact work the next session does over SSH. |
| `OPEN-QUESTIONS.md` | **The build backlog.** 20 numbered questions (A1 to A6, B1 to B10, C1 to C4), each with options, what a build reveals, and a default. Section D is what the copyedit left open; section E defines the pilot. |
| `tools/build.sh` | Regenerates `docs/` from `paper/` and `OPEN-QUESTIONS.md`. Needs pandoc and python3. |
| `tools/paper.tmpl` | Pandoc template for the LaTeX-style paper page (latex.css, Latin Modern). |
| `tools/mkdiff.py` | Side-by-side Markdown diff renderer. |
| `tools/card/` | `apply-card.sh`: customises a Pi OS card on the Mac (cloud-init files, the `ssh` switch, a one-shot `firstrun.sh`) when the Imager's settings do not apply, as happened on Oct 16. |
| `worker/` | The status feed at `status.bandwidthswap.com`: a Cloudflare Worker with one KV key, posted to by the Mint, read by the page's Lab status section. `node worker/test.mjs` tests it; its README has the deploy steps and the token handling. |
| `CNAME`, `.nojekyll` | Pages config. Leave alone. |

## Workflow

1. Edit `paper/BANDWIDTH-whitepaper-v0.3.md`, `OPEN-QUESTIONS.md`, or `index.html`.
2. Run `tools/build.sh` if you touched the paper or the backlog. The paper page's title block (authors, email, date, version) and the diff page's "Before" and "After" labels are arguments inside the script, not read from the Markdown header, which the build drops; a new paper date or version is set there too.
3. Commit and push to `main`. Pages deploys in about 30 seconds. Verify with `curl -sI https://bandwidthswap.com/docs/paper.html`.
4. If you touched `worker/`, run `node worker/test.mjs`, then deploy from that directory with `npx -y wrangler@3 deploy` (a public action: Grace's call). The Worker is not part of Pages; a push does not deploy it.

The build is deterministic: running it on an unchanged source produces no git diff. If it does, something changed in the tools, not the content.

## Conventions and decisions already made

- **v0.1 text stays as published**, spelling included. v0.2 was copyedited on Oct 8, 2026 (44 fixes); new text is written clean.
- **Three edits in v0.2 went beyond spelling** and were flagged to the author: "forfeit" inserted in Section 4's slashing sentence, "with against" became "for or against" in Section 6, and "Governer Mark Godin" became "Governor Mark Gordon". Left deliberately: "Stasoshi Dex" (declared fictional), "securities and exchange act of 1933" (1933 is the Securities Act, 1934 the Exchange Act; author's call), "Kathrine Long" and "BI laws" (unverified), "retarded" in the Introduction (word choice, not an error).
- **The pilot has no token and no chain.** Dollars, one Mint, signed receipts, hourly prepaid windows, monthly invoice. See OPEN-QUESTIONS.md section E. Token and DAO questions are deferred until there is paying traffic.
- **The decisive open questions are A1, A2, A3** (unrecoverable fee, subsidy bound m < b, emissions). Do not design around them; the pilot is scoped so they can be simulated alongside.
- **Hostile-jurisdiction deployment is a north star, not a roadmap item.** Receipts prove delivery, not location. No bounty is posted for it without a location proof, legal review, and an incentive design that never pays for a border crossing. The site says this in Phase 4 without naming a country. Keep it that way.
- **Hardware baseline is the Raspberry Pi 3 Model B**, because the author has several. LoRa is the control plane (receipts, liveness, announcements), a second radio is the data plane. The site's kit table is written around this. The shopping list picks USB LoRa boards (Heltec WiFi LoRa 32 V3 or LILYGO T-Beam, 915 MHz, Meshtastic firmware) over a HAT so the GPIO header stays free for a HaLow HAT if the forest link has to go through trees; the site's table still offers both.
- **Page design:** IBM Plex Serif body, Plex Sans Condensed headings, Plex Mono for data. Light and dark themes via tokens on `:root`. Plain tone, says what is unproven. Don't add hype.
- **Phase 0 lab decisions (Oct 16, 2026):** the code is `bandwidthswap/kit` (clone at `~/Documents/GitHub/kit`), MIT, one Python file `bwkit.py` for the three roles plus `phase0/provision.sh`, which does every node step from the Mac over SSH. WireGuard `wg0` is 10.77.0.1 (`bw-house`) and 10.77.0.2 (`bw-forest`), UDP 51820; `bwkit` serves on port 8710; the Mint settles a window at the smaller of the two signed counts and calls it `disputed` when they differ by more than 1%; in Phase 0 the receipt's `merkle_root` is the payer's commitment to its own meter readings. Dollars at a posted 10 cents a gigabyte, invoice by month, no payment rail. Details in the kit's README.
- **Attribution on commits:** end commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` when an agent wrote them.
- **Docs passes:** when the docs are brought back in line with the code, the tools and the state of the lab, the commit is titled `docs: the docs caught up with the code (<first commit> to <last commit>)`, so `git log --grep='caught up with the code'` finds the last pass. The first was on Oct 16, 2026 and covered a4b90b6 to 856c25e.
- **Lab status (Oct 16, 2026):** the page's `#lab` section shows which Phase 0 nodes are up, from receipts, not pings. The nodes push and nothing reaches the LAN: `bwkit report` on `bw-mint` (the `bwkit-status.timer`, every two minutes; two because the free plan allows 1,000 KV writes a day) posts a summary of the ledger to the Worker in `worker/`, and the page fetches `https://status.bandwidthswap.com/status`. The feed is names, roles, times and byte counts only, plus each node's windows of the last twelve hours; the kit refuses to send, and the Worker refuses to store, a body carrying an IPv4 or MAC address. "Up" is a receipt within 90 minutes (receipts are hourly); the Mint is up when its report is under five minutes old. When the feed is down the page says so and shows the last good report it fetched, kept in the browser. The token is a Worker secret and `/etc/bwkit/status.env` on `bw-mint`, root only, and in no repo.
- **The Lab status drawing** (artboard E of the Oct 16 canvas): a map over a ledger. The map is three cards (`bw-house` left, `bw-forest` right, `bw-mint` centred below), the thick accent line between the first two labelled with the tunnel's bytes this window and the total since the bench came up, and a thin arrow from each node down into the Mint's sides. Cards, lines and bars are plain positioned elements and the arrowheads tiny inline SVGs, so the theme tokens apply; one dot slides down the receipt arrow when a newer receipt arrives while the page is open, and nothing moves otherwise (reduced motion off entirely). Below 1000px the cards stack and the arrows go. The ledger is a grid, one row per node and one column per hour of the last twelve in the visitor's time (several windows in one hour add up): bars for bytes signed and counted on a log scale, dots on the Mint's row for settled windows, hatched or hollow in the signal colour when disputed, empty for no receipt; on a phone it scrolls in its box. A feed without `history` (an older reporter) still draws the map, over an empty ledger.

## State as of Oct 16, 2026

- Site live with the project page (now linking the kit repo), the LaTeX-style paper, the diff and the backlog. `tools/build.sh` produces no diff.
- **Phase 0 is up.** Three Pi 3 B nodes on the home LAN (`bw-house` 192.168.0.74, `bw-forest` .226, `bw-mint` .61), Pi OS Lite trixie fully upgraded, key-only SSH as `bw`, chrony (`bw-house` from the pool, the other two from it), WireGuard `wg0` between house and forest, journald in RAM, and `bwkit` on all three with the hourly receipt timer on `bw-house`. The first dispute test passed at 16:14 CDT: an agreeing window settled, a window where the hop's counters restarted was marked disputed and settled at the hop's smaller count, and the same settlement was reproduced offline from the two signed receipts alone. `PHASE0-SETUP.md` has the addresses, the checks and the numbers.
- The cards: the Imager's customisation did not apply to any of the three; they were fixed from the Mac with `tools/card/apply-card.sh` (see `PHASE0-SETUP.md`, "Flashing the three cards").
- The Mac side is the `Grace` account: SSH key `~/.ssh/bandwidthswap_ed25519` (comment `bandwidthswap-pis-grace`; the Oct 12 key was never found here, its public line is still authorized on the nodes), the SSH config block, the Imager 2.0.12 in `~/Applications`, this clone and the kit's. `Grace` is not an administrator on this Mac, and the session's permission classifier refuses to create public repos or push the site: those are Grace's own commands.
- `bandwidthswap/kit` exists (public, MIT). The kit's `main` and this repo's `main` may be ahead of GitHub; `git status -sb` says.
- **Lab status is live** since 17:08 CDT on Oct 16, redrawn as the map over the ledger at 18:24: the Worker `bandwidthswap-status` answers at `https://status.bandwidthswap.com/status`, `bw-mint` runs bwkit 0.1.3 with the `bwkit-status.timer` (every two minutes, `/etc/bwkit/status.env` root-only; the feed carries each node's last twelve hours of windows) and the page's `#lab` section shows the three nodes up over the ledger strip. One thing bit on the way: Cloudflare's Browser Integrity Check in front of the Worker refuses Python's default `User-Agent` (error 1010, a plain-text 403 before the Worker sees the request), so since kit `dfce49d` every request bwkit makes says `User-Agent: bwkit/<version>`. `bw-house` and `bw-forest` still run 0.1.0 (the protocol is unchanged); `phase0/provision.sh update` brings them up when wanted.

## Next step

**Let the lab run and read the ledger.** The receipt timer on `bw-house` fires at the top of every hour; after a day `sudo -u bwkit bwkit ledger` on `bw-mint` should show about 24 settled windows and no disputes. The ordered list for the next session (reservations, the over-claim dispute, the clock rule on real hardware, prepayment, then the radios) is in `PHASE0-SETUP.md` under "What the next session does". Every node step is a command in the kit's `phase0/provision.sh`; `check` verifies without changing anything.

## Accounts and access

- GitHub org `bandwidthswap`; the author's personal account is `realrobertdouglas` with admin on the org.
- DNS for bandwidthswap.com is on Cloudflare (DNS only, not proxied) pointing at GitHub Pages. HTTPS is enforced on the Pages side. bandwidthswap.lol still has DNS at Namecheap and returns 404; a redirect to .com is pending.
- The Cloudflare account is the one the Mac's wrangler login is in (also home to the Todo Tooling MCP Worker). The status Worker `bandwidthswap-status` runs at `status.bandwidthswap.com` (a custom domain; wrangler makes the DNS record) with the KV namespace `bandwidthswap-status-STATUS` and the secret `STATUS_TOKEN`. This Worker is the account's only KV writer; see `worker/README.md` for the write budget.
- No secrets are in this repo and none should be added.
