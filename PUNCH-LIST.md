# Punch list

Work set aside to finish later, newest first. Each item says what it is, where it stopped, what blocks it, and how to pick it back up.

The kit and the lab keep their own list, in the kit's `PUNCH-LIST.md`.

## The status Worker, made multi-tenant

*Set aside Oct 18, 2026.*

**What.** Phase 1 of [worker/PLAN.md](worker/PLAN.md): a D1 database in place of the one KV key, status reports signed by the Mint's own key and verified with `docs/bsp.js`, the new routes (`POST /report`, `/mints`, `/mints/<nym>/status`, `/mints/<nym>/history`, `/map`), the map deciding who is listed, and the token path kept so the lab's Mint keeps posting through the change. Phases 2 to 4 follow it: the kit signs its reports and drops the token, the site checks the signature in the browser and gains a Mint picker and a network page, and the words in the READMEs, CLAUDE.md and the spec.

**Where it stopped.** Nothing is built. The plan is written and committed (`49bb7ff`), with its critique in Section 6. A build session started and hit its usage limit before it wrote a file; the tree was left clean and there is no branch.

**Blocked on a Cloudflare login on this Mac.** `wrangler login` was run on Oct 18 but saved no token: `npx -y wrangler@3 whoami` still says not authenticated, and `~/Library/Preferences/.wrangler` holds logs but no `config/`. Run the login again from `worker/` and confirm with `whoami` before starting.

**The same login also unblocks a deploy that is already built.** The Worker's stricter shape check, which admits the `mint`, `proof` and `steward` fields the Mint now posts, is tested (60 tests) but not deployed. The live Worker passes those fields through unchecked in the meantime.

**To pick it up.**
1. Log in and confirm `whoami`.
2. Deploy the pending shape check: `npx -y wrangler@3 deploy` from `worker/`, then check that https://status.bandwidthswap.com/status still answers and the Lab status still draws.
3. Work through [worker/P1-PUNCHLIST.md](worker/P1-PUNCHLIST.md), the step-by-step list for phase 1. Read its "Found while reading" section before writing any code: it records the traps, such as `JSON.parse` breaking the signature on whole-valued floats, and D1 counting rows rather than requests. Its last section is the database and the deploy.
