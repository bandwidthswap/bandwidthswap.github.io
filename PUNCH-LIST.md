# Punch list

Work set aside to finish later, newest first. Each item says what it is, where it stopped, what blocks it, and how to pick it back up.

The kit and the lab keep their own list, in the kit's `PUNCH-LIST.md`.

## The Lab status draws the prepayment book and marks each window covered or on credit; the Worker's deploy and the kit's rollout are left

*Set aside Nov 3, 2026. The book built Nov 18, 2026; the mark per window built Nov 23 and 24, 2026 (session `covered-mark`), on `main` in both repos, not yet deployed or rolled.*

**What.** Since Nov 2, 2026 the feed's report carries `prepaid` (the kit's `status_report`, spec Section 16): per payer by name, deposits, what open locks hold, what covered windows drew, what released, the balance, every amount an integer in micro-units, and how many windows were covered; `{}` until a deposit or a lock exists. Until Nov 18 the page's `#lab` section drew none of it, and the first dollar ran out on Nov 5 with nothing on the site to say so (the kit's `PUNCH-LIST.md`, Protocol, has that fortnight).

**Built.** Under the payer's card, left of the receipt arrow, in the kit dashboard's words: the balance at the Mint, what is *locked ahead* (or *no lock open: on credit*, in the signal colour, when nothing is), how many windows were *covered*, and *about N windows left*, the balance and the open lock over what a covered window has drawn on average, in the signal colour under a day; each line's title carries the exact figures and they add up. `prepaidOf` and `prepaidLines` in `index.html`'s lab script; a book that is empty, absent (an older reporter), another payer's, or not whole non-negative numbers draws nothing and the map is as before. The map's label for a screen reader says it; below 1000px the lines stack under the payer's card. The legend and the paragraph under it say what *covered* and *on credit* mean, and the section's opening paragraph no longer says every window since Nov 2 settled against its lock. Checked headless under jsdom on the live report and nine other books (21 checks, a throwaway script, not in the repo: the site has no dependencies), and in a browser, light and dark, wide and at phone width, from `tools/fixtures/report-with-prepaid.json`, the live report of Nov 19, 2026, 03:15 UTC, signed, which `?feed=tools/fixtures/report-with-prepaid.json#lab` draws.

**Since Nov 23, 2026** a balance below zero draws too: *owed to the Mint* in the signal colour in place of the balance, with the arithmetic in its title and no *windows left* line. The kit's spec, Section 16, now says a covered window settles in full and what it drew past the balance is owed; before that day `prepaidOf` took any negative figure for a malformed book and drew nothing, at the one moment the line mattered most. Checked on five books with the page's own functions under a stub document (a throwaway script).

**The covered mark, built Nov 23 and 24, 2026** (build order, item 8; session `covered-mark`, on the Mac only). Three parts, each on `main`:

- *The kit* (kit e7fac95). Each entry of a node's `history` in `status_report` carries `covered`: `true` for a window settled against a lock, a claimed one included, `false` for one settled on credit, `null` while no settlement is held. It is the settlement's own field read back, inside the signed bytes. One test of its own and three that say it too (94 tests); the spec's Section 9 note and the README say the field.
- *The Worker* (site 80eca26). The shape check admits `covered` on a window as true, false or null and still takes a window without it. `migrations/0002.sql` adds `windows.covered`; `/history` serves it as a flag or null, and `/status` serves it as it serves everything, in the bytes the Mint signed. A report that does not say leaves a stored mark alone. `worker/test.mjs` is 159 checks (145 before); `worker/smoke.mjs` passes in workerd against the real SQL, and now moves its fixture's windows to the hour before it runs (they had passed the 30 days the Worker keeps, so its `/history` check had begun to fail on its own).
- *The page* (site 0317f11). On the Mint's row, under each settled dot, a short bar: solid in the accent colour for a covered window, hollow in the signal colour for one on credit, the two in proportion where a cell holds several windows, as each day of the seven-day view does; the cell's title says it in words. The dot does not move, and a window with no mark draws exactly as before. The legend and the paragraph under it say what the bars mean. Checked with the page's own script under a stub document, this page against `main`'s, on `tools/fixtures/report-with-prepaid.json` and on the live report (23 checks: without the field the ledger and the map are the same element for element, twelve hours and seven days, from the Worker as deployed and from the new one; `null` and a value that is not a flag draw nothing; with the field each dot has its bar and the day's counts add up), and looked at in headless Chrome from a local copy of the feed carrying the marks, light and dark, both spans, and in a frame 390, 375 and 320 px wide, where the legend wraps and nothing overflows. A throwaway script and a throwaway server, not in the repo.

**Left, in this order.**

1. *The Worker's deploy, the owner's.* From `worker/` in a checkout at `main`: `npx -y wrangler@3 whoami`, then `npx -y wrangler@3 d1 execute bandwidthswap-status --remote --file=migrations/0002.sql`, then `npx -y wrangler@3 deploy`. The migration first: the Worker of before it runs unchanged with the column there, and the Worker of after it fails every report on a database without it (`worker/README.md`, Deploying, has both runs). After it `/history` shows `"covered":null` on every window, and the page draws as before.
2. *The kit's rollout onto `bw-mint`, the `lab` session's* (only the Mint reports). From the next report the twelve-hour strip is marked, and the seven-day view fills in a day at a time.

Neither order takes the feed down: the Worker deployed today already admits a window with a field it does not know (checked on Nov 23 with a record under a vector key: refused for the key, `403`, after the shape had passed, where a malformed window is `422`), and the new Worker takes a report without the field. The order above is for the history: a mark reaches the Worker's table only while its window is in the report's twelve hours, so with the Worker first no mark is lost, and with the Mint first every window that leaves the report before the deploy stays unmarked in the seven-day view. When both are done: look at https://bandwidthswap.com/#lab once, move item 8 to Done in `BUILD-ORDER.md`, and save a live report as a fixture beside `report-with-prepaid.json` if one with marks is wanted (`?feed=` draws it).

**Still not in the report.** The lock's window is not named (the report carries what open locks hold, not which windows), so the line under the payer says *locked ahead* and its title says when the window open now began. `docs/steward.html` and `docs/network.html` need nothing.

## A sentence for the paper's Section 9: the margin followed the download path

*Drafted Oct 30, 2026, for the proof sheet.*

**What.** On Oct 30 bw-neighbor re-announced its link with a 3% agreement margin, set from the Mint's ledger: the week of Oct 18 to 23 had the hop's count over the payer's by a median 7.4% (p95 10.1%, max 10.95%, climbing daily), and since the house changed its download sources on Oct 24 the same link's two meters have agreed to within about 1% (141 full windows, median 0.9%, p99 1.5%). Section 9 records the first night's tenth and says that is why 3.6 makes the margin a link parameter; it does not yet say what the week showed, which is that the loss belonged to the download path through the relay, not to the link, and moved when that path did. `OPEN-QUESTIONS.md` B11 and the kit's `PUNCH-LIST.md` hold the numbers.

**The card.** Paper edits are never applied on a chat go-ahead; this is an exact before/after pair for the proof sheet. It edits the "Phase 0, continued (October 17 and 18)" paragraph of Section 9. The before text matches `paper/BANDWIDTH-whitepaper-v0.6.md` exactly once; the readings do not repeat the passage, so no card for them.

*Before:*

> which is why Section 3.6 now makes the margin a parameter of the link. The first full purchase moved 104,857,600 bytes in 230 seconds, about 3.6 megabits a second, through a 2.4 GHz Wi-Fi, a satellite uplink and the relay.

*After:*

> which is why Section 3.6 now makes the margin a parameter of the link. The week that followed put the gap between four and eleven percent and climbing; when the house changed where it downloaded from, on October 24, the same link's two meters came within about one percent of each other, and on October 30 the relay announced a three percent margin. The loss was the download path's through the relay, not the link's, and the margin followed it. The first full purchase moved 104,857,600 bytes in 230 seconds, about 3.6 megabits a second, through a 2.4 GHz Wi-Fi, a satellite uplink and the relay.

When it is approved, apply it to `paper/BANDWIDTH-whitepaper-v0.6.md` and run `tools/build.sh`.

## The status Worker, made multi-tenant

*Set aside Oct 18, 2026.*

**What.** Phase 1 of [worker/PLAN.md](worker/PLAN.md): a D1 database in place of the one KV key, status reports signed by the Mint's own key and verified with `docs/bsp.js`, the new routes (`POST /report`, `/mints`, `/mints/<nym>/status`, `/mints/<nym>/history`, `/map`), the map deciding who is listed, and the token path kept so the lab's Mint keeps posting through the change. Phases 2 to 4 follow it: the kit signs its reports and drops the token, the site checks the signature in the browser and gains a Mint picker and a network page, and the words in the READMEs, CLAUDE.md and the spec.

**Where it stands.** Phase 1 is built (Oct 18, seven commits, one per item of [worker/P1-PUNCHLIST.md](worker/P1-PUNCHLIST.md) with its tests: 160 checks in `worker/test.mjs` (145 once P2 took the token path out), `worker/smoke.mjs` against the real SQL in workerd), merged to `main`, and **live since Oct 19, 2026, 04:15 UTC**: D1 `bandwidthswap-status`, `GET /` says `"ed25519": "ok"`, `/status` is served from D1 with `"sig":null` from the lab Mint's first post after the deploy, and the Lab status draws. The deploy also fixed the page's proof check, which the KV path had been breaking on whole-valued floats; the P1 list's "Done" section has the details. [worker/README.md](worker/README.md) describes the Worker as it runs.

**What was found on the way, for the phases after this one.** The stricter shape check `main` carried before Oct 18 refused what bwkit 0.4.0 posts (a payout's `window` is an object, and more); the Worker now admits the live shape and `tools/fixtures/report-bwkit-0.4.0.json` pins it. `bsp.js`'s `FLOAT_FIELDS` lacks four of the settlement doubles the spec names. `docs/steward.html` reads the Oct 17 Steward shape, not what 0.4.0 posts.

**The login exists on the `isiah` Mac.** The handoff was written on the `wendi` account of another Mac; on the `isiah` account of Roberts-MacBook-Pro-3, `npx -y wrangler@3 whoami` names the Cloudflare account, and the deploy was run from there. The kit is cloned beside this repo there; the lab's `-ts` Tailscale aliases and `~/.config/bwkit` are not.

**P2 is done too** (Oct 19, 2026, 05:05 to 05:11 UTC): bw-mint runs bwkit 0.5.0 and posts its report signed, every ten minutes and after each commitment; the map is posted and `/mints` lists bw-mint; the Worker's token path, its secret and its KV namespace are gone (`POST /status` is 410). The P1 list's "Done" section has the minutes. The four missing `FLOAT_FIELDS` are in the kit's `bsp.js` and vendored here.

**P3 is done** (Oct 19, 2026, later the same night): the Lab status checks the report's signature in the browser beside the proof and says so; the Mint is stale after fifteen minutes, not five; the ledger strip toggles between the last twelve hours and the last seven days (one column per local day, from `/history`); a Mint picker appears when `/mints` lists more than one, and `?mint=<NYM>` draws that Mint on the Lab status and the Steward's book; `docs/steward.html` reads the kit's 0.4.0 book beside the Oct 17 shape; `docs/network.html` lists the Mints the map names and the map itself, its signature checked. The pages were run headless under jsdom against the live feed before the push (32 checks); nothing in the kit changed.

**P4, the words, is done** (Oct 19, 2026) except the paper: this repo's CLAUDE.md reads current throughout (the kit has no CLAUDE.md; its README and the spec's Section 9 note were brought current with 0.5.0), `docs/verify.html` says how the Mint posts, and the Steward's book no longer shows closed offers, counting them instead.

**Left: one sentence for the paper's Section 9, for the proof sheet.** Paper edits are never applied on a chat go-ahead; each is a card on the proof sheet, an exact before/after pair, approved there. This card edits the second sentence of "Phase 0, continued (October 17 and 18)". The before text matches `paper/BANDWIDTH-whitepaper-v0.6.md` exactly once.

*Before:*

> The two tests that Section 4 depends on, and that Phase 2 needs before a second operator signs anything, ran on the bench and passed: the Mint publishes a signed Merkle commitment for each hour in the status it already posts and answers with a proof for any receipt in it, and its ledger was rebuilt from the payer's and the hop's signed copies alone, 37 settlements including the two forced disputes, and matched the Mint's own ledger and commitment.

*After:*

> The two tests that Section 4 depends on, and that Phase 2 needs before a second operator signs anything, ran on the bench and passed: the Mint publishes a signed Merkle commitment for each hour in the status it already posts and answers with a proof for any receipt in it, and its ledger was rebuilt from the payer's and the hop's signed copies alone, 37 settlements including the two forced disputes, and matched the Mint's own ledger and commitment. Since October 19 that status is itself a record the Mint signs, and the public page that shows it verifies the signature under the Mint's key, so the relay that carries it between them holds the Mint's bytes and can alter none of them.

When it is approved, apply it to `paper/BANDWIDTH-whitepaper-v0.6.md`, run `tools/build.sh`, and add the same sentence to the operators' reading if its Section 9 paragraph repeats the tests.

**The other three nodes still run 0.4.0.** The protocol is unchanged and only the Mint reports, so nothing is wrong; `SSH_SUFFIX=-ts phase0/provision.sh update` brings them to 0.5.0 when wanted (bw-forest through `FOREST_JUMP=bw-house-ts`). *Nov 2, 2026: every tailnet node has run bwkit 0.5.1 since Oct 31; `bw-forest` stays at 0.4.0, idle on the bench.*
