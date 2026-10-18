# Pressure tests: the whitepaper against infinite time and distance

Status as of Oct 17, 2026, against whitepaper v0.3. The paper is now v0.6: v0.5 pays the fee to the Network Steward instead of burning it and makes the Steward a bounty rule with a map, and v0.6 makes the agreement margin between two honest counts a parameter of the link; where this file says "burn", read "the Steward's fee". The findings stand: the fee is still a ratio, and still the thing that crosses a border.

A series of essays on Captain's Notes (https://captainnotes.com/category/future) pushes commerce out to long delays and long distances and asks which parts of the paper bend. The first three essays set the frame: rule cannot be projected past a certain radius, so order at the edge comes from repeated exchange (Anarchy Across the Stars); what stays scarce when atoms are cheap is organized capacity (Energy, Matter, and the Limits of Rule); and what crosses a long distance is a record, not an order (Communication, Commerce, and the Coordination of Distant Systems). The seven that follow each test one part of the paper. This file is the ledger: what each essay found held, what strained, and what the paper should say. It is the input for the example installations in [INSTALLATIONS.md](INSTALLATIONS.md), which walk five scales of link through these findings, and for the alignment pass on the paper after that.

Each entry: **Holds** is what survived unchanged. **Strains** is what the essay found missing or wrong. **Paper should** is the change proposed, in one line each, to be confirmed or rejected by the installation tests before anything is edited.

---

## 1. Every Delayed Exchange Is a Loan

Tests: Appendix A.4 (prepaid windows versus locks), Section 3.6 (windows), Section 10 (what an unused reservation should pay).

**Holds.** The receipt. Which side lends on which kind of link (the relay under a lock, the payer under a prepaid window) is chosen correctly.

**Strains.** The paper says who lends and never what the loan costs. A posted price per byte is complete only on a link with no delay. "Prepaid windows do the same work as locks without a timer" is true for security and false for cost. A payment twenty years late is a smaller payment, and the paper does not discount it.

**Paper should.**
- Add a carry term to the link parameters (A.1): a price per unit of time a window stays open, beside the price per byte.
- Say that A.4's choice of lender moves the cost, not removes it.
- Fold "what an unused reservation should pay" (Section 10) into the carry term: it is the interest on the window.

## 2. Custody Across a Contact That May Never Come

Tests: Appendix A.2 (custody as a window on the next link), Section 3.3 (no payment for availability), Section 5.1 (refund on shortfall), Section 10 (the price of custody).

**Holds.** The reason to accept custody (the next window is prepaid) is a real answer to what DTN left out.

**Strains.** A prepaid window on a contact that never opens has no rule: if the relay keeps it, that is payment for availability; if it refunds, it held the bundle for nothing. The relay in custody has no stated holding term. Nothing is signed for between receipts, so a lost bundle is lost nothing on paper.

**Paper should.**
- State the rule for a prepaid window whose contact never comes, and price the risk the way bottomry did: a premium on the windows that settle, published as a link parameter, so the contacts that happen pay for the ones that don't.
- Put a holding term in the contact plan (A.1): how long a relay must keep a bundle before it may drop it.
- Add a custody receipt: the relay's countersignature on the bundle when it takes custody, so a loss is provable.

## 3. Enforcement at a Distance Is Exclusion

Tests: Section 4 (Mint bonds, commitments, fraud proofs), Appendix A.5 (settlement domains, two-sided bonds, "slashable from its own publications"), Section 10 (open relays).

**Holds.** The two-sided bond on bridge relays is a genuine improvement on the Hansa: the boycott costs the bridge at once, through collateral it already posted.

**Strains.** Across domains "slashable" means "excludable", and the two have different economics: a bond is taken once, an exclusion is worth the discounted value of future dealings, which is thin when reconciliation is measured in years. Publication of a fraud proof is treated as the step before a penalty; across domains it is the penalty. A network that polices by closing doors has no rule for reopening them.

**Paper should.**
- Say in A.5 that a Mint is excluded, not slashed, from another domain, and that the bridge relays' bonds are the enforcement; say how large they must be relative to what the bridge earns.
- Require fraud proofs to be published where any payer can find them before opening a window, not only where the slashing Mint acts.
- Add a readmission rule, or state that there is none and why; a coalition that cannot readmit is a cartel (Section 10, open relays).

## 4. Proof That Outlives Its Signer

Tests: Section 3.1 (the receipt), Section 3.5 (clocks), Section 4 (Mint commitments), Appendix A.5 (reconciliation).

**Holds.** A receipt inside a Mint commitment survives a later key compromise: the commitment is a timestamp.

**Strains.** No lifetime for a receipt and no way to change the signature scheme. A receipt that never reached a Mint (the "safe failure") has only its signatures, which age with the keys. Commitments live in the Mint's database, and nothing outlives the Mint. The paper does not distinguish the payer's timestamp (a claim) from the Mint's (a record).

**Paper should.**
- Add to the link parameters (A.1) the signature scheme the link's receipts use and how long a receipt stays presentable.
- Make reconciliation (A.5) a deposit, not only a check: each Mint includes the others' commitments in its own, so a Mint that disappears leaves its register with the rest.
- Say that proof of time rests on the Mint's commitment, and that the clock rule of 3.5 governs acceptance, not durability.

## 5. Money When No One Shares a Dollar

Tests: Section 3.3 (the burn), Section 5 (posted prices), Section 5.1 (escrow), Appendix A.5 (two-sided bonds), Section 10 (the token).

**Holds.** Every rule written as a ratio crosses a border untouched: the burn, the subsidy bound, the smaller-count rule (in bytes). The Sybil argument needs no conversion.

**Strains.** Every amount is in a unit the far side cannot read or weigh: posted prices, bonds, escrows. A bridge relay bonded on both sides is a money-changer with an exchange position, and the paper does not say so. A commitment across a bridge pays its premium to the exchange. The token deferral stands only until the first bridge.

**Paper should.**
- Mark which rules are ratios (the protocol) and which are amounts (the pilot's choices).
- Name the unit of each link in the link parameters (A.1).
- Say that a bridge relay's two bonds are its exchange position and that its posted prices embed the rate.
- Say that the common-unit question returns at the first bridge, with three known answers (bytes on the bridge, a Mint's money of account, a token), rather than deferring it to "traffic to denominate".

## 6. The Only Bridge

Tests: Section 5 (opportunity-cost share, posted price), Section 5.1 (commitments, pipes), Appendix A.5 (reconciliation through a bridge), Section 7 (the Steward as first customer).

**Holds.** The pricing rule is the incentive to build. Open entry plus purchase commitments is a real mechanism for the second bridge. The settlement rule has a historical cousin in the Sound Dues' right to buy at the declared value.

**Strains.** The paper never names the pricing rule's other face: the sole bridge is a monopoly by design, bounded only by the cost of the next bridge, and at light-year scale that bound is far away for a long time. When the only link is one relay, Mint reconciliation runs through a monopolist that can hold both audits hostage. A perpetual commitment (a pipe) is a toll buy-out, and the relay gives nothing up in return.

**Paper should.**
- Say that a sole bridge is a monopoly bounded by the cost of the second, and that a commitment on a route is a bid against a toll.
- Require reconciliation traffic to be carried at a posted price like any other, so refusing it is a provable, slashable act (A.5).
- Say what a relay that accepts a pipe gives up, since the Sound buy-out ended the right to charge.

## 7. The Horizon of the Receipt

Tests: Appendix A.7 ("distance changes how long it takes to make a proof, not what it is"), Section 3.2 (payment is the proof), Section 3.3 (the Sybil condition), the field note's table of scales.

**Holds.** Per-link receipts are honest at any distance. The Sybil argument survives the horizon because the burn is a ratio and the payer's loss is certain.

**Strains.** Past the distance at which no reply returns within the payer's horizon, the recipient cannot be the payer, so the party that cannot be fooled is nobody and the party that can be is paying. "Payment is the proof" then no longer describes the design; the protocol is a way to pay relays per link toward silence. The paper does not say which party opens a window on such a link, and every rule about bonds, custody and clocks follows from that.

**Paper should.**
- Bound A.7: it holds while the route's round trip is inside the payer's horizon; say what the protocol is past it.
- Say who opens a window on a link beyond the horizon (the sender), and that two-way traffic becomes two one-way ledgers netted at reconciliation.
- Say which rows of the field note's table are commerce: the bench, the Moon and Mars for anyone; the nearest star for a person; farther only for an institution that outlives the round trip.

---

## What recurs

Across the seven, three things come up more than once and should be treated as one change each when the paper is edited:

1. **Link parameters (A.1) are the right place for almost everything.** Carry, custody premium, holding term, signature scheme, receipt lifetime, unit. The appendix's own idea, that the protocol has no constants, is the fix for most of what strains.
2. **Reconciliation (A.5) is doing more than the paper admits.** It is the register that outlives a Mint, the channel for exclusion, and a service a bridge can withhold. It needs to be named as all three.
3. **The paper's central phrase has a boundary.** "Payment is the proof" is exact inside the payer's horizon and needs a stated edge.
