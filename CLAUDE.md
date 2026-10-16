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
| `paper/BANDWIDTH-whitepaper-v0.2.md` | **The paper's source of truth.** Edit this. |
| `paper/BANDWIDTH-whitepaper-v0.1.md` | Faithful Markdown clone of the 2021 PDF. Never edit; it is the diff baseline. |
| `paper/whitepaper-spelling-diff.html` | Record of the copyedit pass on v0.2. Historical. |
| `SHOPPING-LIST.md` | Parts to turn the three Pi 3 boards into nodes, by phase, with budget. |
| `PHASE0-SETUP.md` | **The hands-on handoff for Phase 0**: what is already set up on the Mac, how to flash the three cards, how to check the nodes, and the exact work the next session does over SSH. |
| `OPEN-QUESTIONS.md` | **The build backlog.** 20 numbered questions (A1 to A6, B1 to B10, C1 to C4), each with options, what a build reveals, and a default. Section D is what the copyedit left open; section E defines the pilot. |
| `tools/build.sh` | Regenerates `docs/` from `paper/` and `OPEN-QUESTIONS.md`. Needs pandoc and python3. |
| `tools/paper.tmpl` | Pandoc template for the LaTeX-style paper page (latex.css, Latin Modern). |
| `tools/mkdiff.py` | Side-by-side Markdown diff renderer. |
| `CNAME`, `.nojekyll` | Pages config. Leave alone. |

## Workflow

1. Edit `paper/BANDWIDTH-whitepaper-v0.2.md`, `OPEN-QUESTIONS.md`, or `index.html`.
2. Run `tools/build.sh` if you touched the paper or the backlog. The paper page's title block (authors, email, date, version) and the diff page's "Before" and "After" labels are arguments inside the script, not read from the Markdown header, which the build drops; a new paper date or version is set there too.
3. Commit and push to `main`. Pages deploys in about 30 seconds. Verify with `curl -sI https://bandwidthswap.com/docs/paper.html`.

The build is deterministic: running it on an unchanged source produces no git diff. If it does, something changed in the tools, not the content.

## Conventions and decisions already made

- **v0.1 text stays as published**, spelling included. v0.2 was copyedited on Oct 8, 2026 (44 fixes); new text is written clean.
- **Three edits in v0.2 went beyond spelling** and were flagged to the author: "forfeit" inserted in Section 4's slashing sentence, "with against" became "for or against" in Section 6, and "Governer Mark Godin" became "Governor Mark Gordon". Left deliberately: "Stasoshi Dex" (declared fictional), "securities and exchange act of 1933" (1933 is the Securities Act, 1934 the Exchange Act; author's call), "Kathrine Long" and "BI laws" (unverified), "retarded" in the Introduction (word choice, not an error).
- **The pilot has no token and no chain.** Dollars, one Mint, signed receipts, hourly prepaid windows, monthly invoice. See OPEN-QUESTIONS.md section E. Token and DAO questions are deferred until there is paying traffic.
- **The decisive open questions are A1, A2, A3** (unrecoverable fee, subsidy bound m < b, emissions). Do not design around them; the pilot is scoped so they can be simulated alongside.
- **Hostile-jurisdiction deployment is a north star, not a roadmap item.** Receipts prove delivery, not location. No bounty is posted for it without a location proof, legal review, and an incentive design that never pays for a border crossing. The site says this in Phase 4 without naming a country. Keep it that way.
- **Hardware baseline is the Raspberry Pi 3 Model B**, because the author has several. LoRa is the control plane (receipts, liveness, announcements), a second radio is the data plane. The site's kit table is written around this. The shopping list picks USB LoRa boards (Heltec WiFi LoRa 32 V3 or LILYGO T-Beam, 915 MHz, Meshtastic firmware) over a HAT so the GPIO header stays free for a HaLow HAT if the forest link has to go through trees; the site's table still offers both.
- **Page design:** IBM Plex Serif body, Plex Sans Condensed headings, Plex Mono for data. Light and dark themes via tokens on `:root`. Plain tone, says what is unproven. Don't add hype.
- **Attribution on commits:** end commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` when an agent wrote them.
- **Docs passes:** when the docs are brought back in line with the code, the tools and the state of the lab, the commit is titled `docs: the docs caught up with the code (<first commit> to <last commit>)`, so `git log --grep='caught up with the code'` finds the last pass. The first was on Oct 16, 2026 and covered a4b90b6 to 856c25e.

## State as of Oct 16, 2026

- Site live with the project page, the LaTeX-style paper, the diff, and the backlog. Pages last built from 856c25e (Oct 12); the live page matches the checkout and `tools/build.sh` produces no diff.
- The author has three Pi 3 Model B boards on the desk, no radios yet. SD cards were ordered on Oct 12, expected Thursday or Friday, Oct 15 or 16. The boards were powered and wired to the LAN once on Oct 12 and nothing booted, as expected without cards. On Oct 16 none of `bw-house`, `bw-forest`, `bw-mint` answered on the LAN and no Pi MAC (`b8:27:eb`) was in the ARP table, so no card had been flashed and booted yet.
- The Mac side is ready since the afternoon of Oct 16, in the `Grace` account: the SSH key (`~/.ssh/bandwidthswap_ed25519`, comment `bandwidthswap-pis-grace`, made that day; the Oct 12 key was never found in this account and its printed public line is retired), the SSH config block, the Raspberry Pi Imager v2.0.12 in `~/Applications` with the Lite 64-bit image cached, and a clean build. `Grace` is not an administrator on this Mac; the Imager asks for the `robertdouglas` credentials to write a card. The public line to paste is in `PHASE0-SETUP.md`.
- No code exists for the receipt daemon or the Mint. The phase 0 steps on the site describe what to build. The `bandwidthswap/kit` repo does not exist yet; the org still has only this repo.

## Next step

**Flash the three cards when they arrive, then start a session and say the Pis are up.** The recipe, the hostnames (`bw-house`, `bw-forest`, `bw-mint`), the username (`bw`) and the key are all in `PHASE0-SETUP.md`; do not improvise them. Paste the `Grace` account's public line (printed in `PHASE0-SETUP.md`) into the Imager, not the retired Oct 12 line.

Phase 0 (OPEN-QUESTIONS.md section E, the "Build phase 0" section of the site, and step by step in `PHASE0-SETUP.md`):

1. Three Pis on the home LAN, hostnames `bw-house`, `bw-forest`, `bw-mint`, Raspberry Pi OS Lite 64-bit.
2. chrony with `bw-house` as the local time source; WireGuard `bw-house` to `bw-forest`; logs to RAM.
3. A receipt daemon: hourly, read WireGuard interface byte counts, build the receipt from Figure 2 of the paper, sign with ed25519, send to `bw-mint`. The Mint verifies both signatures and appends to a ledger.
4. First dispute test: make the two byte counts disagree and resolve it from receipt data alone.

Suggested home for the code: a new repo `bandwidthswap/kit` (this repo is the site). When it exists, link it from the "Get involved" section of `index.html`.

## Accounts and access

- GitHub org `bandwidthswap`; the author's personal account is `realrobertdouglas` with admin on the org.
- DNS for bandwidthswap.com is on Cloudflare (DNS only, not proxied) pointing at GitHub Pages. HTTPS is enforced on the Pages side. bandwidthswap.lol still has DNS at Namecheap and returns 404; a redirect to .com is pending.
- No secrets are in this repo and none should be added.
