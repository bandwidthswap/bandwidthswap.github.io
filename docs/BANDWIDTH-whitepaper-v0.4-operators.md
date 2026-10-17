# Bandwidth Swap for operators

**Robert Douglas and Chris Odom**
bandwidthswap@pm.me

Oct 17th 2026
Version 0.4 (draft), for operators

---

*This is the whitepaper read from the side of someone who would run a node: what you run, what you announce, what you sign, how you are paid, and what you can lose. Every rule here is in the full paper at [paper.html](paper.html), with its reasons; the section numbers in parentheses point there. The plain version at [paper-plain.html](paper-plain.html) is the argument without the machinery.*

## Who this is for

Anyone who would carry someone else's bytes for payment: a neighbor with a radio on a ridge, a company with a relay in lunar orbit, or the person running the three boards on the bench today. The protocol has three roles, and you may run any of them.

- A **payer** opens payment windows and signs receipts for the bytes it paid for.
- A **relay**, called a hop in a receipt, carries bytes between members and countersigns the payer's receipts with its own count.
- A **Mint** keeps the books: holds bonds, settles windows from receipts, and publishes a summary of what it settled.

Relay service is between members: the recipient is a bonded party who acknowledges delivery. Delivery to anyone who is not a member, including the public internet, is endpoint service, where the payer and the recipient are the same party and the receipt closes with the payer's own signature (Section 5).

## What you run

The reference kit is one Python file, `bwkit.py`, for all three roles, at [github.com/bandwidthswap/kit](https://github.com/bandwidthswap/kit). The hardware baseline is a Raspberry Pi 3 Model B. Each node needs three things in this order: a clock that agrees with its peers (chrony), a data plane (WireGuard on the bench, a radio pair in the field), and logs in RAM so the SD card lives. Use a 2.5 A power supply; a Pi 3 on a phone charger reboots at random and you will blame the software.

In the field, two radios share the work. A LoRa board carries the control plane, which is receipts, liveness and announcements, for miles through trees at a few kilobits a second; a receipt is about a hundred bytes and fits in one packet. A second radio carries the data, and which one depends on your terrain: a 5 GHz pair if you can see the far end, Wi-Fi HaLow or 900 MHz if you cannot.

## What you announce

A relay announces, over a gossip layer that never touches settlement, its NYM, which is its key registered with a Mint against a bond, and the parameters of each link it offers (Section 6, Appendix A.1). Nothing in an announcement is trusted for payment. The parameters are the terms a payer accepts when it opens a window on your link:

- the one-way light time;
- the contact plan, if the link is not continuous: when it exists, for how long, how many bytes it carries per contact, and how long you hold a bundle between contacts;
- your posted price per byte, and the unit it is posted in;
- your carry, the price per unit of time that a window's value stays locked before it settles, which is zero on a wire and is the other half of your price on any link with a delay;
- your clock tolerance;
- the kind of window you accept: an hour, a contact, or a transmission;
- your medium and range class (a wire, a point-to-point radio, LoRa, a short-range hotspot), which you can be slashed for misstating;
- the signature scheme your receipts use and how long a receipt stays presentable to a Mint;
- the settlement domain you settle in, which is the Mint that holds your bond.

Your posted price governs every payment made to you. In the lab it is ten cents a gigabyte. The protocol does not cap it. If you are the only way across a gap you will earn the whole route, and you should know that this makes you a monopoly until someone funds the second link, which the protocol is designed to let them do (Section 5).

## What you sign

The receipt is one tuple: payer NYM, hop NYM, hop index, Merkle root, bytes, first and last timestamp, and the previous receipt's signature, signed by the payer (Figure 2). As a hop you countersign the same tuple with your own byte count and the payer's signature in the last field. On the bench this happens at the top of every hour; on a link with contacts it happens per contact.

Before you countersign, you check two things. The signature is the payer's. And the payer's clock is within your tolerance of yours; on the bench that is five seconds. If it is not, you decline, and you should know what declining costs: the window. Your next acknowledgement covers both windows and the payer's count governs, so a window you declined is a window you carried for nothing (Section 3.6).

Two more signatures arrive on links with a delay. When you take custody of a bundle to carry it to a later contact, you countersign it in the same format with your own count: a custody receipt. From then on a bundle you lose is a loss on paper and slashable (Appendix A.2). And as a recipient of relay service, you acknowledge what was delivered to you; a bonded recipient that fails to acknowledge delivered bytes is slashed (Section 3.7).

Keep every signed copy. Your proof of what you are owed is the receipt in your hand, not the Mint's word; the Mint is modeled on a notary whose own signature on what it processed is what convicts it (Section 4).

## How you are paid

A window settles at the smaller of the two signed counts, yours and the payer's, times your posted price. If the counts are within one percent the window is settled; if they differ by more it is recorded as disputed and settles by the same rule, at the smaller count. You cannot be paid for more than the payer signed for. In the lab, a hop that signed for twenty-two megabytes against a payer's 272 bytes was paid for 272 bytes (Section 9).

Five percent of every fee is burned before anyone is paid. That is not a Mint's cut; it leaves the network, and it is what makes carrying traffic to yourself a loss (Section 3.3). The Mint takes a share of the settlement fee on what it publishes.

In the pilot there is no payment rail. The invoice at the end of the month is the settlement, which means you have lent the payer every window's value from the hour it settled until the invoice is paid. The paper now calls that what it is, a credit term, bounded by membership: a payer that does not pay an invoice is out (Section 2). When you set your price, price the month.

On a link with a delay you are paid the carry on top of the posted price, per unit of time the window's value stayed locked. An unused reservation, a committed window the poster never used, pays you the carry and nothing else (Section 5.1). A prepaid window whose contact never opened pays you nothing at all; the payer is refunded in full, and the risk of contacts that never come is yours to price into the carry on the contacts that do (Section 3.6, Appendix A.2).

**Commitments.** A purchase commitment is a prepaid offer to buy bandwidth on a route, with a minimum rate in bytes per window, a premium per byte above your posted price, a number of windows, a deadline, and sometimes a proving allowance that reimburses other payers for trying the route (Section 5.1). If you serve the route you carry the poster's windows and collect. At or above the minimum rate you get the posted price and the full premium. Below it you get the posted price on what moved and the premium in proportion, and the rest of that window's premium goes back to the poster. The rate is computed from the receipt's byte count and the payer's two timestamps; nothing new is measured. A commitment with no end date is a pipe, and accepting one fixes your posted price on that route for as long as the pipe pays. A commitment whose route crosses into another settlement domain pays on the far side at the bridge relay's rate, which may be you.

## What you can lose

- **The window**, if you decline a receipt, go quiet for an hour, or your clock drifts out of tolerance. Nothing is paid for the hour you missed, and nothing else happens.
- **Your bond**, held by your Mint, if you misstate a link's medium or range class, lose a bundle you signed a custody receipt for, or as a recipient fail to acknowledge delivered bytes. A Mint loses more of its bond than it earned for a summary that omits or alters a receipt.
- **Your standing**, which across settlement domains is the only penalty there is. A Mint on another world cannot reach your bond; what it can do is publish the proof, stop reconciling, and slash any relay bonded on its side that keeps settling with you. If you are a bridge relay bonded with two Mints, you carry that penalty at once, and the membership sets your two bonds large enough that you would rather lose one Mint than both (Appendix A.5).

Nothing is paid for uptime, capacity or a big antenna. A relay that is offline earns nothing, which is not a punishment, only the absence of a customer. For the subsidy tier only, your neighbors' signed heartbeats gate your eligibility; the heartbeats earn nothing (Section 5).

## Disputes

You will have them, and they resolve without you. Both signed counts go to the Mint; the Mint pays the smaller and marks the window disputed if the gap was over one percent. Anyone can reproduce the settlement from the two receipts; on the bench, each of the three forced disputes was reproduced offline from the signed copies alone. If you believe a Mint settled a window wrongly, your signed copy and the Mint's published commitment are your case, and the Mint's own signature is what convicts it. In the pilot the Mint's bond is its standing with its members and your remedy is to leave with the proof; the paper says so (Section 4).

## Clocks

The payer's clock is authoritative, because the payer is the one paying. You decline a payer whose clock differs from yours by more than the tolerance. Five seconds is generous for a node that keeps a time source and fails safe for one that does not: on the bench, synchronized nodes agree within a millisecond, and a free-running Pi 3 gains 0.76 seconds a day and crosses five seconds in about a week (Section 3.5). On a link with a light time, your tolerance is the base tolerance plus the light time both ways plus the drift you expect since the last contact, and it is yours to publish (Appendix A.3).

## On a link with a delay

The window is the contact: it opens when the link does and closes when it does, and the receipt is per contact. Windows are prepaid and there is no lock. You hold bundles between contacts under a custody receipt and for the holding term you published. A contact that never opens pays you nothing and refunds the payer; your carry on the contacts that settle is where you price that. Receipts you cannot deliver wait in your outbox until the next contact; on the bench the outbox already does this when the Mint is unreachable (Appendix A).

## Across a settlement domain

If your link crosses from one Mint's domain to another's, you post a bond with each and either Mint can settle a dispute on the link from the two receipts. You now hold value in two units and earn in both; your two bonds are an exchange position, and the prices you post on each side embed the rate between the domains. The two Mints reconcile their commitments across your link, and that reconciliation is traffic you carry at your posted price like any other bytes. Withholding it is a declined window, on the record, governed by the sending Mint's count (Appendix A.5).

## What the paper does not promise you

That the treasury's bonus will be worth building for: it is capped at the burn, five cents on the dollar, and whether that moves anyone is the first thing the pilot's economics must answer. That your monopoly, if you have one, will last: the toll you charge is the bounty for the second bridge. That a window past a payer's horizon proves anything to the party that wanted the bytes: when no reply can return while the payer is there to receive it, you are still paid per link, honestly, for carriage toward silence (Appendix A.7). And that any of this has run beyond three boards on a bench.

## Before you sign anything with a second party

1. The Mint publishes a Merkle commitment of each settlement period that you can check your receipts against. If it does not yet, that comes first.
2. You keep every signed copy, and you have tried rebuilding the ledger from them.
3. You have read the link's parameters as announced, and your price includes the carry if there is a delay and the month if there is an invoice.
4. You know what declining costs, and your clock is kept.
5. You know that the only penalty across a domain is exclusion, and what your bonds are for.
