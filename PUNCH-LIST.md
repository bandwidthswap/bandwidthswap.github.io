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
3. Build phase 1 from worker/PLAN.md Section 3, all of it tested locally first (`wrangler dev --local`, `wrangler d1 execute --local`).
4. Create the database: `npx -y wrangler@3 d1 create bandwidthswap-status`. Put its id in `wrangler.toml`. Set `DEFAULT_MINT` to the lab Mint's NYM (`ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM`) and `ADMIN_MINTS`. Apply `migrations/0001.sql` remotely, then deploy.
5. Done when `GET /status` is served from D1 with its shape unchanged and the Lab status draws as before.
