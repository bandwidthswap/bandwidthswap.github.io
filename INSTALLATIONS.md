# Example installations: the protocol at five scales

Status as of Oct 17, 2026, against whitepaper v0.3 and the findings in [PRESSURE-TESTS.md](PRESSURE-TESTS.md). The paper is now v0.5, which pays the fee to the Network Steward instead of burning it and makes the Steward a bounty rule with a map; where this file says "burn", read "the Steward's fee". The valley's bounty is now matched by the Steward, and the street's sole bridge draws a second-path bounty from its own fees. Every installation here now runs in the kit's simulator (`sim/scenarios/` in github.com/bandwidthswap/kit), and its tests assert the figures.

Five installations, from the bench that runs today to a link between stars. Each is written the same way: who the parties are and why one of them pays; the link's parameters in the terms of Appendix A.1; one window worked through with numbers and a timeline; then the seven findings from the essays, each marked **silent** (nothing to say here), **marginal** (present but the numbers make it harmless) or **bites** (the paper's silence has a cost here, and what the cost is); and the tests that would show it, in the style of the Phase 0 forced tests.

The installations are not a roadmap. The bench exists, the valley is Phase 2, and the other three are ways of asking the same question the essays asked: which parts of the paper are load-bearing. What makes them useful rather than speculative is that every one of them can be emulated on the three Pi boards that exist: a light delay is `tc qdisc add dev wg0 root netem delay <t>` on both ends of the tunnel, a contact plan is a schedule that brings `wg0` up and down, and a second settlement domain is a second Mint process. The receipts are a hundred bytes, so the delay emulation holds even where the data plane would not.

The matrix at the end says where each finding first bites, which is the order in which the paper should be edited.

---

## 1. The bench (Phase 0, running)

**Setting.** One operator. `bw-house` is the gateway and the payer, `bw-forest` the hop, `bw-mint` the Mint, three Raspberry Pi 3 boards on one home network. The payer pays itself: the point is to show that two machines not trusted to agree settle anyway.

**Link parameters (A.1).**

| Parameter | Value |
|---|---|
| One-way light time | microseconds |
| Contact plan | continuous |
| Window | one hour |
| Clock tolerance | 5 s |
| Posted price | $0.10 per GB |
| Unit | US dollars |
| Medium | WireGuard over Ethernet (a wire) |
| Settlement domain | one Mint |
| Settlement | monthly invoice, no payment rail |

**A window, worked.** The first forced test's agreeing window: 21,938,052 bytes signed by the payer, 21,939,460 by the hop, within one percent, settled at the smaller count. Value: 0.0219 GB at $0.10, about two tenths of a cent. Timeline: bytes cross during the hour; at the top of the next hour the payer signs; the hop countersigns within a second; both halves reach the Mint within seconds; the Mint settles; the invoice sums the month. Who lends: the hop fronts an hour of carriage, then waits for the invoice, so the hop is lending for up to a month and an hour. Exposure: cents.

**The findings here.**

1. *Loan.* **Marginal.** The hop lends for the invoice period. The paper calls the invoice "the settlement" and never calls the invoice period a credit term, but at cents a month nothing turns on it.
2. *Custody.* **Silent.** The contact is continuous; nothing is held between windows.
3. *Enforcement.* **Silent.** One operator, one domain. There is no one to exclude.
4. *Proof durability.* **Marginal, and already real.** The Mint's ledger is an append-only file on one SD card, and the status feed publishes counts, not a Merkle commitment. Section 4 says a Mint publishes a commitment; the kit does not. Each party keeps its signed copies, which is the Open-Transactions principle the paper rests on, but nothing has tested that the ledger can be rebuilt from them.
5. *Unit.* **Silent.** Dollars on both ends of a cable.
6. *Bridge.* **Silent.** One hop, priced by its own operator.
7. *Horizon.* **Silent.** The round trip is microseconds.

**Tests.** Three ran on Oct 16 (under-claim, over-claim, clock). Two more belong here, because they test what every later installation depends on:

- *Rebuild the ledger.* Stop the Mint, delete `ledger.jsonl`, and reconstruct it from the payer's and the hop's signed copies. Expected: the same settlements, because the Mint's word was never the proof. This is finding 4's first test and it costs an afternoon.
- *Publish the commitment.* Add the Merkle root of each hour's settlements to the status report. Expected: a party holding a receipt can show it was included. Section 4 promises this; nothing has built it, and the valley needs it before a second party signs anything.

---

## 2. The neighbor across the valley (Phase 2)

**Setting.** Two operators. The author runs the house, which is the payer and the Mint. A neighbor runs the ridge relay, two kilometers off through trees, which is the hop; beyond it a hotspot in the forest serves whoever is there. The data plane is a Wi-Fi HaLow pair, a few megabits a second; receipts and liveness go over LoRa. The treasury, which in Phase 2 is the author, posts the first purchase commitment on the link: a minimum of 1 GB an hour (about 2.2 Mbps) at a premium of five cents a gigabyte over the posted price, for 720 windows, which is a month.

**Link parameters.**

| Parameter | Value |
|---|---|
| One-way light time | 7 µs |
| Contact plan | continuous, lossy (foliage, weather) |
| Window | one hour |
| Clock tolerance | 5 s (chrony over the radio; drift B9) |
| Posted price | $0.10 per GB, set by the neighbor |
| Commitment | min 1 GB/window, premium $0.05/GB, 720 windows, proving allowance 10 windows a week |
| Unit | US dollars |
| Medium | 900 MHz HaLow (point-to-point radio), LoRa control plane |
| Settlement domain | one Mint, run by the payer |
| Settlement | monthly invoice |

**A window, worked.** 1.2 GB crosses in the hour. The payer signs 1,200,000,000 bytes; the neighbor's hop countersigns 1,198,000,000; within one percent, settled at the smaller count. At the posted price that is $0.12; the rate, 1.2 GB over the payer's first-to-last timestamps, is above the minimum, so the full premium of $0.06 is paid. Total $0.18 for the window. A rainy hour moves 0.6 GB: $0.06 at the posted price, premium in proportion to 0.6 over 1.0, so $0.03, and the other two cents of that window's escrowed premium (one gigabyte at five cents) return to the poster. A month of full windows, 720 of them, is about $130 to the neighbor, which is the number the paper's Section 10 is worried about.

**The findings here.**

1. *Loan.* **Bites, in a small way.** The neighbor fronts an hour of carriage and waits a month for an invoice from the party who keeps the books. The invoice period is a credit term extended by the hop to the payer, and the paper should name it as one, with the pilot's answer: it is bounded by membership, and a payer who does not pay the invoice is out.
2. *Custody.* **Marginal.** A lossy radio drops bytes in flight, but nothing is stored between windows; a dropped packet is simply not counted by the hop, and the smaller-count rule pays for what both saw.
3. *Enforcement.* **Bites, for the first time.** The neighbor's bond is held by its counterparty, and the Mint's bond is held by nobody. A fraud proof against the Mint can be made from the neighbor's signed copies, but there is no second Mint and no settlement layer to present it to. The only penalty is the one the essay named: the neighbor walks, and takes the receipts and the story. The paper should say that in the pilot the Mint's bond is its standing with its members and the remedy is exit, and that this is the smallest case of exclusion, not an absence of enforcement.
4. *Proof durability.* **Bites.** The first thing a second party needs is a published commitment it can check its receipts against. Without it, the neighbor's signed copies prove the neighbor's claim to the neighbor. With it, they prove it to anyone. The bench test above is the prerequisite for the valley.
5. *Unit.* **Silent.** Dollars.
6. *Bridge.* **Bites, usefully.** The ridge is the only bridge to the forest, the neighbor sets the price, and the commitment is the paper's mechanism for keeping the link worth running. This is where the essay's claim, that a commitment on a route is a bid against a toll, can be watched: if the neighbor raises the posted price, the premium's worth falls and the poster's refund rises, and someone else can bid to string a second radio.
7. *Horizon.* **Silent.**

**Tests.**

- *The shortfall.* Throttle the data plane to 0.6 GB for one window. Expected: the posted price on 0.6 GB, the premium at 60%, the remaining 40% of the window's premium returned to the poster, all from the receipt's bytes and timestamps alone (Section 5.1).
- *The omitted receipt.* The Mint leaves one settled window out of its published commitment. Expected: the neighbor proves the omission from its signed copy and the commitment. This test cannot run until the bench's commitment test is built.
- *The unused reservation.* The poster sends nothing for a window. Expected, under the paper's default: the posted price is the poster's to lose, the premium is not paid, the relay gets nothing for the hour. Record what the neighbor thinks of that, because finding 1 says this is the interest on the window and the paper says it is zero.
- *The exit.* The neighbor stops serving mid-month. Expected: every settled window is on the invoice; nothing unsettled is owed; the neighbor holds signed copies of everything. What the neighbor cannot do is prove anything to a third party. That is the gap finding 3 names.

---

## 3. Earth to Moon

**Setting.** A relay on the lunar near side, run by an operator who is not the payer, carrying traffic for Earth-side payers: instruments on the surface sending data home, and an Earth institution paying for it. Two settlement domains, one Mint on each world, because Appendix A.5 says a domain is in practice a world, and because the lunar operator will not want its bond held only on Earth. The light time is 1.28 seconds. The near side sees Earth continuously, so the contact is continuous with ground-station handovers; a far-side station reaches Earth only through an orbiter, which is where custody enters.

**Link parameters.**

| Parameter | Value |
|---|---|
| One-way light time | 1.28 s |
| Contact plan | continuous (near side); orbiter passes of about an hour, several a day (far side) |
| Window | one hour (near side); one pass (far side) |
| Clock tolerance | 5 s + 2.6 s light time both ways + drift since last contact (near zero) |
| Posted price | $1 per GB, the operator's, in Earth dollars for now |
| Unit | US dollars on both sides, two bookkeepers |
| Medium | Ka-band point-to-point radio |
| Settlement domains | an Earth Mint and a Moon Mint, reconciled daily; the relay bonded with both |
| Settlement | prepaid windows (A.4), conditional payment possible since the round trip is seconds |

**A window, worked.** A surface instrument sends 50 GB in an hour (111 Mbps). The Earth payer signs at the top of the hour; the lunar hop countersigns 1.3 seconds later; the Moon Mint settles it from the hop's copy within seconds; the Earth Mint settles it from the payer's copy at the same time; the two commitments reconcile at the day's end. Value: $50. Who lends: the payer, for the hour, having prepaid; the relay waits 2.6 seconds plus a day for the reconciliation that confirms the Earth Mint agrees.

**The findings here.**

1. *Loan.* **Marginal.** The round trip is seconds and the reconciliation a day; the carry is a day's interest on a $50 window.
2. *Custody.* **Bites for the far side.** An orbiter that takes a far-side station's bundle holds it until the next Earth pass, a window of up to an hour. The orbiter's window is the pass, its payment comes from the next link's receipt (A.2), and a pass missed for pointing or safe mode is the contact that never came. The holding term and the custody receipt the essay asked for are needed here, at a scale where they are cheap to test.
3. *Enforcement.* **Bites, and works.** Two Mints, one bridge relay bonded with both, reconciliation daily. A Moon Mint that under-burns is excluded by the Earth Mint and the relay is slashed on Earth if it keeps settling with it. The shadow of the future is strong because reconciliation is daily. This is the installation where the essay's exclusion mechanism can be shown to do the work the paper calls slashing.
4. *Proof durability.* **Marginal.** Reconciliation daily means each Mint can deposit the other's commitment in its own every day, at no cost. The paper should say reconciliation is a deposit; here is where it costs nothing to make it one.
5. *Unit.* **Marginal, and instructive.** Both sides count dollars, and the installation still needs two Mints. That separates the two things Appendix A.5 runs together: a settlement domain is a bookkeeper, not a currency, and the paper should say which it means.
6. *Bridge.* **Bites.** One lunar operator is the only bridge, bounded by the cost of a second lander. Its posted price is a monopoly price for years. The treasury as first customer, buying a pipe (a commitment with no end date) on the link, is how the installation gets built at all, and the Sound Dues essay's question applies: what does the operator give up for the pipe. And the two Mints reconcile through the one relay. If it withholds reconciliation, neither Mint can audit the other. The paper's fix, reconciliation carried at a posted price so that refusal is a provable act, is testable here.
7. *Horizon.* **Silent.** 2.6 seconds.

**Tests, on the bench with `netem delay 1280ms` on both ends.**

- *The widened tolerance.* Step the hop's clock by 6 seconds. Expected: accepted, since the tolerance is 5 + 2.6 seconds. Step it by 9. Expected: declined, window lost. The receipt format needs no change; only the hop's check reads the link's tolerance instead of a constant.
- *Two Mints.* Run a second Mint process as the Moon domain, the hop sending its copy there and the payer sending its copy to the Earth Mint. Expected: each settles the window from its half plus the other half when it arrives; the two commitments match at reconciliation; a deliberately altered settlement on one side is shown by the other from the commitment.
- *Withheld reconciliation.* The hop (the only bridge) drops reconciliation traffic for a day. Expected under the paper as written: nothing, since nothing says reconciliation is traffic. Expected under the fix: a reconciliation window the hop declined, its count governed by the Mint that sent it, and a refusal on the record.
- *The far-side pass.* Schedule `wg0` down for fifty minutes of every hour. Expected: the window is the ten-minute pass, receipts are per pass, the outbox holds between passes, and a pass that never opens leaves a prepaid window with no rule. Write down what the Mint does with it, because the paper does not say.

---

## 4. Earth to Mars

**Setting.** A surface station on Mars, an orbiter relay, and a ground station on Earth, three operators, with an Earth institution paying for data home and a Mars settlement that pays for data out. Two settlement domains with their own units, because the Mars side will not keep its books in a currency it cannot earn. The light time is 3 to 22 minutes; the round trip up to 44. A surface station reaches the orbiter in passes of about ten minutes a few times a day, and the orbiter reaches Earth in contacts of hours. Every 26 months the Sun is in the way for about two weeks.

**Link parameters (the orbiter's two links).**

| Parameter | Surface to orbiter | Orbiter to Earth |
|---|---|---|
| One-way light time | milliseconds | 3 to 22 min |
| Contact plan | passes of ~10 min, several a day | contacts of hours, daily; none for ~14 days at conjunction |
| Window | one pass | one contact |
| Clock tolerance | 5 s + drift since last pass | 5 s + up to 44 min + drift since last contact (0.76 s a day at the bench's worst oscillator) |
| Posted price | in the Mars unit | in Earth dollars, with the bridge rate embedded |
| Unit | Mars Mint's unit of account | US dollars |
| Medium | UHF proximity radio | X-band point-to-point |
| Settlement domains | Mars Mint | Earth Mint; the orbiter bonded with both |
| Settlement | prepaid windows, no lock (above the threshold) | prepaid windows, no lock |

**A window, worked.** The Earth payer wants 150 MB from the surface. It prepays two windows hours before the pass: the surface-to-orbiter pass and the orbiter-to-Earth contact. The surface station sends 150 MB to the orbiter in a ten-minute pass; the forwarding receipt for that hop is signed by the two of them and carried by the orbiter. The orbiter holds the bundle for up to several hours until its Earth contact, sends it, and the Earth ground station countersigns the second forwarding receipt. The payer's end-to-end receipt closes when the bytes arrive on Earth, 3 to 22 minutes after the orbiter sent them. The Mars-side hops learn the chain closed 6 to 44 minutes after that, when the closed receipt's acknowledgement comes back. The Mars Mint settles the surface hop's window at the next reconciliation with Earth, which is the next contact, hours later. Value at the posted prices: whatever the orbiter's rate makes it; the bridge has priced the Mars unit in dollars.

**The findings here.** Every one bites.

1. *Loan.* **Bites.** The payer prepays hours ahead; the orbiter lends custody for hours; the surface station waits a contact to be paid. The carry per hour belongs in each link's parameters, and the paper's "unused reservation pays nothing" default is tested every time a pass is missed for weather.
2. *Custody.* **Bites fully.** The orbiter is in custody of the bundle between its two links. A missed Earth contact leaves it holding for a day; conjunction leaves it holding for two weeks. The paper has no holding term, no custody receipt, and no rule for the prepaid Earth contact that never opened. The essay's three fixes are all needed here, and the bench can show each.
3. *Enforcement.* **Bites.** Reconciliation per contact, which is daily, is a strong enough shadow for exclusion to work, and conjunction is the test: two weeks with no reconciliation, after which both Mints' commitments must still match. A Mint that cheats during conjunction is found at the first contact after.
4. *Proof durability.* **Bites.** Receipts wait up to two weeks in outboxes. A relay key compromised during conjunction makes every receipt in the outbox doubtful unless its commitment was already deposited with the other Mint before the silence began. The deposit at every reconciliation is what makes the outbox safe.
5. *Unit.* **Bites.** Two units, one bridge. The orbiter's two bonds are its exchange position, and its posted prices on each side set the rate. A commitment posted on Earth to buy surface-to-Earth bandwidth pays its premium through the orbiter's rate, which is the essay's warning made concrete.
6. *Bridge.* **Bites hardest.** One orbiter is the only bridge for years, and both Mints reconcile through it. The second orbiter is the second bridge, and the treasury's pipe commitment is how the first was ever paid for. This is the Sound.
7. *Horizon.* **Silent for a person, worth stating.** 44 minutes.

**Tests, on the bench with `netem delay` of 3 to 22 minutes on the Earth link and a pass schedule on the surface link.**

- *The pass as window.* Expected: one receipt per pass, the outbox holding between passes, settlement at the next contact, nothing paid for the hours in between.
- *Conjunction.* Bring the Earth link down for 14 days (or 14 hours with the clocks scaled). Expected: outboxes hold; the first contact after carries everything; both Mints' commitments reconcile; the clock tolerance has widened by 14 days of drift and the receipts are still accepted. Record the longest a receipt waited.
- *The missed contact.* Prepay an Earth contact and bring the link down for it. Expected: a prepaid window with no settlement. Then write the rule, since the paper has none, and run it: a premium on the contacts that settle, or a refund, or the relay keeps it. The essay argues for the first.
- *The custody receipt.* Have the orbiter countersign the bundle on take-up, then drop the bundle. Expected: the loss is provable from the custody receipt and the absence of the next hop's receipt. Without the custody receipt, expected: nothing on paper.
- *The rate.* Post the orbiter's price in two units. Expected: a payer on Earth reading the price is reading an exchange rate, and a commitment's premium crosses the bridge at that rate and not at par.

---

## 5. Interstellar (Proxima Centauri)

**Setting.** A transmitter at Earth and a receiver at Proxima, 4.24 light-years apart, each run by an institution; nothing in between. The round trip is eight and a half years. The "link" is the pair of stations; the contact is a transmission, scheduled from an ephemeris; the window is the transmission. There is a Mint in each system, reconciled when a transmission carries the commitments, which is years. The payer is whichever side sends, because no recipient can prepay a window eight and a half years ahead and expect to be the party that cannot be fooled.

**Link parameters.**

| Parameter | Value |
|---|---|
| One-way light time | 4.24 years |
| Contact plan | transmissions, scheduled years ahead |
| Window | one transmission |
| Clock tolerance | the light time itself, from an ephemeris, plus years of drift (the receiver's check is whether the timestamp is plausible for a signal that left when the sender says it did) |
| Posted price | per byte, in the sender's unit, with carry per year |
| Unit | none shared; bytes on the bridge, netted at reconciliation |
| Medium | optical, point-to-point |
| Settlement domains | one per system; reconciliation measured in years |
| Settlement | prepaid, settled 8.5 years after sending |

**A transmission, worked.** Earth sends one terabyte. The Earth institution prepays the window with the Earth Mint and signs the end-to-end receipt for the bytes as sent. The bytes arrive at Proxima 4.24 years later; the receiver countersigns with its count and transmits the countersigned receipt back with its next scheduled transmission; the closed receipt reaches Earth 8.5 years after the bytes left, give or take the schedule. The Earth Mint settles then, and the transmitter is paid then, for bytes it sent 8.5 years before. The receiver was paid nothing by Earth: it received a gift, and its own Mint owes it for a window the Proxima side opened in the other direction, if any. Two one-way ledgers, netted when a transmission carries both commitments.

**The findings here.** Every one bites, and the seventh decides whether this is commerce.

1. *Loan.* **Bites absolutely.** The transmitter lends 8.5 years of carriage. The carry is the price; the byte rate is a footnote.
2. *Custody.* **Bites.** There is no relay in custody, but the transmitter's prepaid window on a transmission that fails (a pointing error, a dead receiver) is the contact that never came, and nobody learns for 8.5 years.
3. *Enforcement.* **Bites.** Exclusion with a reconciliation measured in years is the weakest case the essay named. The only bonds are each station's with its own Mint, and the thin shadow of the future leaves the bond to carry everything.
4. *Proof durability.* **Bites.** A receipt that waits 8.5 years to settle must outlive the key that signed it and probably the algorithm. The signature scheme and the receipt lifetime are link parameters here, not options.
5. *Unit.* **Bites.** No shared unit, so the bridge counts bytes each way and nets. Nothing else is available.
6. *Bridge.* **Bites.** The pair of stations is the only bridge, and the second costs a second star program.
7. *Horizon.* **Bites, and this is the point.** For a person who can wait 8.5 years, Proxima is inside the horizon: the receipt still proves delivery to the payer. For a person at twice the distance it is not. For an institution, the horizon is the institution's life. The paper should say which it means by a payer, and that past the horizon the sender is the payer, the recipient is a recipient of a gift, and the protocol is a sound way to pay stations per transmission and not a proof of anything to the party that wanted the bytes.

**Tests.** None can run as written. All of them can run scaled: the bench with `netem delay` of hours standing in for years, a window of one transmission, and a Mint on each side that reconciles only when a transmission carries the commitments. Expected: the same three results the bench already gave (smaller count, over-claim paid at the payer's count, clock rule declines) with every number replaced by the link's parameters and nothing else changed. That is the test of Appendix A's claim, and its edge: the receipt is unchanged, and whether the payment is a proof depends on who opened the window.

---

## The matrix

Where each finding first bites, reading left to right.

| Finding | Bench | Valley | Moon | Mars | Proxima |
|---|---|---|---|---|---|
| 1. Loan: the carry has no price | marginal | bites (invoice term) | marginal | bites | bites |
| 2. Custody between contacts | silent | marginal | bites (far side) | bites | bites |
| 3. Enforcement is exclusion | silent | bites (exit is the only remedy) | bites, works | bites | bites, weakest |
| 4. Proof outlives its signer | marginal (no commitment published) | bites (second party needs one) | marginal | bites | bites |
| 5. No shared unit | silent | silent | marginal (two bookkeepers, one unit) | bites | bites |
| 6. The only bridge | silent | bites, usefully | bites | bites hardest | bites |
| 7. The horizon | silent | silent | silent | silent | bites |

## What this orders

The alignment pass on the paper should go in the order the findings first bite, because the valley is next and the bench is now.

1. **Now, on the bench:** publish the Mint's commitment and show the ledger rebuilds from the parties' copies (finding 4). Both are things Section 4 already claims.
2. **Before the valley:** name the invoice period as a credit term (1); say that in the pilot the Mint's bond is its standing and the remedy is exit (3); make the commitment the thing a second party checks (4); state what the unused reservation pays and why (1, 5.1).
3. **For any link with a contact plan, which the Moon's far side already is:** a holding term, a custody receipt, and the rule for a prepaid window whose contact never comes (2); reconciliation as a deposit and as priced traffic (3, 4, 6).
4. **For any second domain:** say whether a domain is a bookkeeper or a currency (5); name each link's unit; say the bridge relay's two bonds are its exchange position (5); say the sole bridge is a monopoly bounded by the next one and that a commitment is a bid against a toll (6).
5. **For Appendix A.7:** bound it. Payment is the proof inside the payer's horizon; name the horizon by who the payer is; say what the protocol is past it (7).

Nothing here changes the receipt. Everything here is a parameter of a link or a sentence the paper has not yet said.
