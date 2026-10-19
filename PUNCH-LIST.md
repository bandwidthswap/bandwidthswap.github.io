# Punch list

Work set aside to finish later, newest first. Each item says what it is, where it stopped, what blocks it, and how to pick it back up.

The kit and the lab keep their own list, in the kit's `PUNCH-LIST.md`.

## The status Worker, made multi-tenant

*Set aside Oct 18, 2026.*

**What.** Phase 1 of [worker/PLAN.md](worker/PLAN.md): a D1 database in place of the one KV key, status reports signed by the Mint's own key and verified with `docs/bsp.js`, the new routes (`POST /report`, `/mints`, `/mints/<nym>/status`, `/mints/<nym>/history`, `/map`), the map deciding who is listed, and the token path kept so the lab's Mint keeps posting through the change. Phases 2 to 4 follow it: the kit signs its reports and drops the token, the site checks the signature in the browser and gains a Mint picker and a network page, and the words in the READMEs, CLAUDE.md and the spec.

**Where it stands.** Phase 1 is built, later on Oct 18, on the branch `worker/p1-multi-tenant`: seven commits, one per item of [worker/P1-PUNCHLIST.md](worker/P1-PUNCHLIST.md) with its tests (160 checks in `worker/test.mjs` against a fake D1; `worker/smoke.mjs` against the real SQL in workerd). Nothing is deployed and nothing is merged; the live Worker is still the Oct 16 build. [worker/README.md](worker/README.md) is rewritten for it, and the P1 list's "Found while building" says what the build found.

**One thing the build found changes the old step 2.** The stricter shape check that main carried, which the earlier note called ready to deploy, refuses what bwkit 0.4.0 posts today (a payout's `window` is an object, and more); deploying it would have frozen the Lab status. The branch admits the live shape and pins it with `tools/fixtures/report-bwkit-0.4.0.json`. Do not deploy main's `worker/` as it is.

**The login exists on this Mac.** The handoff was written on the `wendi` account of another Mac; on the `isiah` account of Roberts-MacBook-Pro-3, `npx -y wrangler@3 whoami` names the Cloudflare account. The kit is cloned beside this repo there; the lab's `-ts` Tailscale aliases and `~/.config/bwkit` are not.

**To pick it up.**
1. Review and merge `worker/p1-multi-tenant` into `main` (`npm test` at the root: 160 checks and the vector check).
2. Run the owner's section at the end of [worker/P1-PUNCHLIST.md](worker/P1-PUNCHLIST.md): `d1 create`, the `database_id` into `wrangler.toml` (commit it), the migration with `--remote`, `deploy`, and the two `curl`s. The deploy is a public action. P1 is done when `GET /` says `"ed25519": "ok"`, `/status` carries `"sig":null`, and https://bandwidthswap.com/#lab still draws.
3. Then P2 in the kit (the Mint signs its reports and drops the token; the kit's own `PUNCH-LIST.md` has the item), P3 on the site (the signature checked in the browser, the Mint picker, the seven-day strip, the network page; `docs/steward.html` also still reads the Oct 17 Steward shape, not what 0.4.0 posts) and P4, the words.
