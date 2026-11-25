# Build order

What is left to build, in the order it is meant to be done, one item at a time. Started Nov 23, 2026, from the roadmap on the site, the kit's plans and spec, and the two punch lists, which keep the detail behind each line. The order is a judgment: first what the running lab depends on, then what finishes the phase it is in, then the later phases.

When an item is done, move it to "Done" with its date and the commit, and the next one is the one to start. An item that turns out to need something else first says so and waits; it is not skipped silently.

## In progress

More than one item can be in hand at once; the rules are in `CLAUDE.md`, "More than one session at a time". One line per item: the item, the session's name, the date it started, what it holds.

- **The nodes.** Session `lab` (the `stephen` account's session of Nov 23, 2026) *holds the nodes*; it has no item in hand since item 13 was rolled out on Nov 24, 22:02 CST.

## Next

An item keeps its number when the ones before it are done; a new item takes the next number and is placed where its priority puts it.

2. **The bytes that arrive wrong through `bw-house`.** About one file in ten fetched through that node's SSH tunnel arrived with bytes changed, while the same file fetched on the node itself or over the radio was right every time (the kit's `PUNCH-LIST.md`, Kit fixes). *Who:* a session to measure; the owner if it comes down to a power supply. *Done when:* the cause is named, and the count is clean or the path is one the data plane does not use.
3. **The HaLow data plane, finished on the bench.** A tunnel over the link's two fixed addresses, `bw-house` metering it, and `bw-cabin`'s first paid window. *Who:* a session. *Done when:* a window between the house and the cabin settles on the Mint with the bytes having crossed the radio.
4. **The full unplug test.** Pull the house's uplink at five to the hour and show the window still settles by radio. This is the test that defines Phase 1. *Who:* the owner's hands, a session watching. *Needs first:* the LoRa board back on `bw-house`'s USB, on a supply that carries it and the dongle. *Done when:* the hour is settled and committed on the Mint and, once the uplink is back, the public page verifies its proof.
5. **Range.** The HaLow link between two buildings, where it did not associate on Nov 2, and the LoRa range numbers. *Who:* the owner, for placement and antennas; a session to read the figures. *Done when:* the link holds between two buildings at a stated width, with the numbers written down.
6. **A real forest node.** `bw-cabin` on solar and a battery at the cabin spot. *Who:* the owner; hardware. *Done when:* the node runs a week on its own power and its windows settle.
7. **A second operator.** The neighbor's own key on a node, one change to the link's terms made by them, and a dispute nobody forced, resolved from the two signed copies. This is what Phase 2 and the pilot's success test wait on, and it is people, not code. *Who:* the owner and the neighbor. *Needs first:* the owner's word on what the neighbor link is now that the nodes are at the house. *Done when:* the pilot's sentence is true: two parties who are not the authors settle a month, dispute one receipt, and resolve it from the receipt data alone.
9. **A second Mint, and reconciliation between two Mints.** `bw-mint2` exists and is empty. *The plan is written* (Nov 24, 2026): the kit's `mints/PLAN.md`, with fourteen steps in order, each with its check. *Needs first:* the owner's seven decisions at the end of that plan. Its steps 1 to 3 need no new protocol code and give a second bench on `bw-mint2`, `bw-forest` and a second payer, so forced tests can leave the live link; its steps 2 and 3 change nodes and belong to the session that holds them. *Done when:* two Mints each settle their own windows and agree on what crossed between them.
10. **A public bounty board and a payment rail.** Today posting needs a key the Mint already knows and money moves by hand. This is what makes Phase 3 real. *Done when:* someone the Mint has never met posts a purchase, funds it, and a relay is paid from it.
11. **What profile 1 left out.** Announcements over a gossip layer, places that buy service through an anchor, and proving allowances that pay. Each is marked in the kit's spec as not in the first profile.
12. **The light-delay features.** Carry, contact plans and receipt lifetimes: in the paper and the simulator only.

## Parked on purpose

- **The token and governance.** Deferred until there is paying traffic.
- **A location proof**, which Phase 4 cannot start without, with the legal review and the incentive design the site names.

## Not build items, and they block

- **The prepaid balance.** The hop requires a lock, so the hourly purchase stops when the balance cannot cover one. A deposit on the Mint, on the owner's word. *A third dollar went in on Nov 23, 2026, 23:45 CST: about a hundred windows, into Nov 28.*
- **What the neighbor link is now.** The map, the neighbor's guide and the page's *at two houses* wait on it, and so does item 7.
- **October's $3.65 to the neighbor**, if it is still owed, and its paid mark on the Mint.
- **Power.** A supply or powered hub for `bw-house` that carries the board and the dongle; stronger supplies for `bw-cabin` and `bw-mint2`.
- **The dongles' own 2.4 GHz networks.** A passphrase of their own, or off. It needs a sign-in to each dongle.
- **Two sentences for the paper**, waiting for approval on a proof sheet.
- **A reboot of `bw-house` and `bw-cabin`**, to see the HaLow addresses come back by themselves.

## Done

- **Nov 24, 2026. Item 13, the rebuild and a claimed window.** The rebuild reads which came first, a hop's claim or the payer's late receipt for the same window, from the two signed times under the link's clock tolerance, and keeps the claim that came first; the spec's Section 16 says the rule and the vectors hold both cases. Kit e948443; on `bw-house` and `bw-neighbor` since 22:02 CST, where `bwkit owed 2026-11` reads *matches* on both. The record is in the kit's `PUNCH-LIST.md`, Kit fixes.
- **Nov 24, 2026. Item 8, the *covered* mark on the public Lab status.** Each settled window on the Mint's row carries a bar, solid for covered and hollow for on credit. Kit e7fac95 (the report says `covered`), site 80eca26 (the Worker keeps and serves it; deployed by the owner at 01:03 CST) and site 0317f11 (the page); on `bw-mint` since 03:06 CST, and the page marked its windows from the next report. Session `covered-mark` built it; the record is in `PUNCH-LIST.md`.
- **Nov 24, 2026. Item 1, the forfeiture test.** The payer's hourly job stopped for two windows; the hop claimed the locked window on its own count and was paid to the lock, $0.021868 for 218.68 MB of the 222.61 MB it counted; the payer's first receipt back settled at the hop's count on credit, nothing paid twice. The record is in the kit's `PUNCH-LIST.md`, Protocol. It closes the prepayment rollout's six steps, and it found item 13.
- **Nov 23, 2026. A payer whose hop is silent still locks in time.** Kit 36918e2; on `bw-house` the same evening.
- **Nov 23, 2026. A lock is sized for at least 50 MB, and a window that draws more than the balance settles in full, the rest owed** (the owner's decision). Kit 5e5bfa1, site ddefea2; on the five tailnet nodes the same evening.
