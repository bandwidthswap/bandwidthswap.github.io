# Punch list

Work set aside to finish later, newest first. Each item says what it is, where it stopped, what blocks it, and how to pick it back up.

The kit and the lab keep their own list, in the kit's `PUNCH-LIST.md`.

## The status Worker, made multi-tenant

*Set aside Oct 18, 2026.*

**What.** Phase 1 of [worker/PLAN.md](worker/PLAN.md): a D1 database in place of the one KV key, status reports signed by the Mint's own key and verified with `docs/bsp.js`, the new routes (`POST /report`, `/mints`, `/mints/<nym>/status`, `/mints/<nym>/history`, `/map`), the map deciding who is listed, and the token path kept so the lab's Mint keeps posting through the change. Phases 2 to 4 follow it: the kit signs its reports and drops the token, the site checks the signature in the browser and gains a Mint picker and a network page, and the words in the READMEs, CLAUDE.md and the spec.

**Where it stands.** Phase 1 is built (Oct 18, seven commits, one per item of [worker/P1-PUNCHLIST.md](worker/P1-PUNCHLIST.md) with its tests: 160 checks in `worker/test.mjs`, `worker/smoke.mjs` against the real SQL in workerd), merged to `main`, and **live since Oct 19, 2026, 04:15 UTC**: D1 `bandwidthswap-status`, `GET /` says `"ed25519": "ok"`, `/status` is served from D1 with `"sig":null` from the lab Mint's first post after the deploy, and the Lab status draws. The deploy also fixed the page's proof check, which the KV path had been breaking on whole-valued floats; the P1 list's "Done" section has the details. [worker/README.md](worker/README.md) describes the Worker as it runs.

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

**The other three nodes still run 0.4.0.** The protocol is unchanged and only the Mint reports, so nothing is wrong; `SSH_SUFFIX=-ts phase0/provision.sh update` brings them to 0.5.0 when wanted (bw-forest through `FOREST_JUMP=bw-house-ts`).
