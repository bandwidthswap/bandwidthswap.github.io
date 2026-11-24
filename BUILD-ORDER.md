# Build order

What is left to build, in the order it is meant to be done, one item at a time. Started Nov 23, 2026, from the roadmap on the site, the kit's plans and spec, and the two punch lists, which keep the detail behind each line. The order is a judgment: first what the running lab depends on, then what finishes the phase it is in, then the later phases.

When an item is done, move it to "Done" with its date and the commit, and the next one is the one to start. An item that turns out to need something else first says so and waits; it is not skipped silently.

## In progress

More than one item can be in hand at once; the rules are in `CLAUDE.md`, "More than one session at a time". One line per item: the item, the session's name, the date it started, what it holds.

- **Item 1, the forfeiture test.** Session `lab` (the `stephen` account's session of Nov 23, 2026), since Nov 23, 22:54 CST. *Holds the nodes.*
- **Item 8, the *covered* mark.** Session `covered-mark`, since Nov 23, 2026. *Holds `bwkit.py`.* Builds and tests on the Mac; the rollout and the Worker's deploy are handed over.
- **Item 9, the plan for a second Mint and reconciliation.** Session `mint-plan`, since Nov 23, 2026. A document only: no code, no nodes.

## Next

1. **The forfeiture test.** The last step of the prepayment rollout: stop the payer's hourly job for two windows and watch the hop claim the window on its own count, up to the lock. *Who:* a session, on the owner's go-ahead; about three hours of watching. *Done when:* the Mint's ledger shows the window settled *claimed*, the hop's page shows it, and the payer's job is running again.
2. **The bytes that arrive wrong through `bw-house`.** About one file in ten fetched through that node's SSH tunnel arrived with bytes changed, while the same file fetched on the node itself or over the radio was right every time (the kit's `PUNCH-LIST.md`, Kit fixes). *Who:* a session to measure; the owner if it comes down to a power supply. *Done when:* the cause is named, and the count is clean or the path is one the data plane does not use.
3. **The HaLow data plane, finished on the bench.** A tunnel over the link's two fixed addresses, `bw-house` metering it, and `bw-cabin`'s first paid window. *Who:* a session. *Done when:* a window between the house and the cabin settles on the Mint with the bytes having crossed the radio.
4. **The full unplug test.** Pull the house's uplink at five to the hour and show the window still settles by radio. This is the test that defines Phase 1. *Who:* the owner's hands, a session watching. *Needs first:* the LoRa board back on `bw-house`'s USB, on a supply that carries it and the dongle. *Done when:* the hour is settled and committed on the Mint and, once the uplink is back, the public page verifies its proof.
5. **Range.** The HaLow link between two buildings, where it did not associate on Nov 2, and the LoRa range numbers. *Who:* the owner, for placement and antennas; a session to read the figures. *Done when:* the link holds between two buildings at a stated width, with the numbers written down.
6. **A real forest node.** `bw-cabin` on solar and a battery at the cabin spot. *Who:* the owner; hardware. *Done when:* the node runs a week on its own power and its windows settle.
7. **A second operator.** The neighbor's own key on a node, one change to the link's terms made by them, and a dispute nobody forced, resolved from the two signed copies. This is what Phase 2 and the pilot's success test wait on, and it is people, not code. *Who:* the owner and the neighbor. *Needs first:* the owner's word on what the neighbor link is now that the nodes are at the house. *Done when:* the pilot's sentence is true: two parties who are not the authors settle a month, dispute one receipt, and resolve it from the receipt data alone.
8. **The *covered* mark on the public Lab status.** Each settled window marked covered or on credit: `covered` on each history entry of the kit's report, the Worker's shape check and its database column, then the dot on the page. *Who:* a session; the Worker's deploy is the owner's. *Done when:* the page marks each window and its tests pass.
9. **A second Mint, and reconciliation between two Mints.** `bw-mint2` exists and is empty. *Needs first:* the plan, which has not been written. *Done when:* two Mints each settle their own windows and agree on what crossed between them.
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

- **Nov 23, 2026. A payer whose hop is silent still locks in time.** Kit 36918e2; on `bw-house` the same evening.
- **Nov 23, 2026. A lock is sized for at least 50 MB, and a window that draws more than the balance settles in full, the rest owed** (the owner's decision). Kit 5e5bfa1, site ddefea2; on the five tailnet nodes the same evening.
