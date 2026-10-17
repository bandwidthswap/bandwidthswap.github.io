# Bandwidth Swap: A Peer-to-Peer Bandwidth Exchange

**Robert Douglas and Chris Odom**
bandwidthswap@pm.me

Oct 17th 2026
Version 0.4 (draft)
admin@bandwidthswap.com

*Version 0.4 aligns the paper with what seven essays on commerce across long delays and distances found when they pushed the protocol out to the Moon, Mars and the nearest star, and with five example installations walked through those findings. Nothing in the receipt changes. What changes is a set of sentences the paper had not said: that the invoice period is a credit term; that in the pilot a Mint's bond is its standing and the remedy is exit; that a Mint's published commitment is what a second party checks; that a window has a carry, a contact plan a holding term, and a relay in custody a receipt for what it holds; that a prepaid window whose contact never comes is refunded and the risk is priced into the windows that settle; that across domains a Mint is excluded, not slashed, and reconciliation is a deposit carried as paid traffic; that a settlement domain is a bookkeeper and a link has a unit, and the rules written as ratios are the ones that cross a border; that a sole bridge is a monopoly bounded by the next one and a commitment on a route is a bid against a toll; and that payment is the proof inside the payer's horizon, with the horizon named. Section 10 is rewritten for what that leaves open.*

---

**Abstract.** *A marketplace measured in available bandwidth has the possibility of identifying each pipe's market price. When pipe value can be accurately determined, and the marketplace is decentralized with a low barrier to entry, growth and development of infrastructure has the capability to be optimized by the "invisible hand," promoting robustness and consumer needs above all else. We propose improving the growth and development of communication infrastructure through a peer-to-peer network in which the settled payment for bytes is the only proof that they were delivered, directly associating incentives for hosts to build and maintain infrastructure with the speed, reliability, and uptime interests of the user.*

*Proof-of-bandwidth is not an attestation that a host makes about itself. It is the settled payment of a user who received the bytes. Every hop in a route is paid per unit of data through a conditional payment that unlocks only when the next hop acknowledges delivery, so the only party who can create a proof is the party who cannot be fooled about whether the data arrived.*

*Rewards flow only from fees, and a fixed fraction of every fee leaves the network for good. Generating traffic to oneself therefore costs more than it earns, and no subsidy may exceed what that fraction has collected. A treasury does not hand out bonuses for the appearance of a network; it buys bandwidth on the links it wants to exist, and only in proportion to bandwidth that paying users have already bought there.*

*A lab of three nodes has run the receipt mechanism since October 2026. It settles hourly windows at the smaller of two signed counts, resolves a forced disagreement from the receipt data alone, and declines a payer whose clock has drifted. What it has not yet shown is a second party, a subsidy that moves anyone, or a settlement layer other than an invoice. Those are stated as open.*

## 1. Introduction

Communications infrastructure growth has been historically slowed by monopolies and exclusion contracts designed to restrict users' optionality such that a user is more likely to be a long-term customer of an ISP service, since ISPs pay a high initial capital expenditure to install in each area. This model protects companies' cash flow, but allows conditions that impede competition and does not promote the lowest price for the user, nor encourage innovation. Existing lines can be used for further redistribution rather than as endpoints,[^i] and many jurisdictions have already provided the legal ease to encourage just this.[^ii]

We propose a fundamental improvement to this supplier-consumer relationship by offering a peer-to-peer network where bandwidth is the product. A settlement layer that makes it expensive for a bad actor to lie has the possibility to facilitate rewards and punish poor behavior. When rewards are issued only against what users have paid for, and there is a bonded barrier of entry to collect those rewards, only decentralized autonomous software is needed to govern the network.

A network whose proof of delivery is a signed receipt can keep moving bytes while its settlement layer is unreachable, and settle later. That is a narrower claim than surviving a continental outage, and it is a claim to be tested rather than assumed: Section 9 says how.

## 2. Settlement

The pilot settles in dollars. A payer and a relay agree a posted price per unit of data, the relay carries the data in hourly windows, each window closes with signed receipts, a Mint settles the window from those receipts, and the Mint issues a monthly invoice. The invoice period is a credit term: between a window's settlement and the invoice's payment the relay has lent the payer the window's value, so a relay in the pilot lends for up to a month and an hour. The term is bounded by membership, and a payer that does not pay an invoice is out (Section 4). There is no token and no chain in the pilot. The receipt mechanism is what is being proved, and it does not need either.

A token, if one is issued, is denominated and settled under the rules in force at the time, and only after there is paying traffic to denominate. Nothing in this paper depends on it. The question a token would answer, which unit two parties share, returns before that, at the first link between two settlement domains, and Appendix A.5 gives the three answers available there: a count both sides can make, a bookkeeper both sides believe, or a thing both sides can weigh, which is what a token would be. Where version 0.2 said that rewards were issued by the chain, they are not: nothing is minted for availability, uptime, or capacity, and there is no block reward. Mints are paid from a share of the settlement fee on the receipts they publish. The Network Steward is paid from the unrecoverable fee defined in Section 3.3.

When a second party that does not trust the first joins the network, a settlement layer is chosen. The candidates are a second-layer chain with native payment channels, a hub model in which each party holds one channel to a hub and the hub is a Mint, or a Lightning-like payment network with receipts kept separately from payments. The choice is made on cost per settlement, time to finality, and whether a Mint can act as a hub without becoming a custodian. Whichever is chosen, only three things touch it: the opening and closing of payment channels, the settlement summaries that Mints publish, and the slashing of bonds. Announcements never do. This keeps the settlement layer small enough that per-packet accounting never competes with it for space.

Identity on the network is a key pair registered with a Mint against a bond. We call it a NYM, after the term Open-Transactions uses, and Open-Transactions remains one candidate for the notary and claims layer.[^iii] It is a notary system, which is to say a trust system, and the paper no longer presents it as anything else; the pilot runs without it.

## 3. Proof of Bandwidth

"Proof" in a bandwidth network has to answer three separate questions, and a design that answers only one of them will be gamed on the other two.

1. **Delivery.** Did the bytes move?
2. **Demand.** Did someone real want them, or did the relay send them to itself?
3. **Quality.** Did they move at the speed and latency that was claimed?

Version 0.1 of this paper answered none of these. A node reported its own uptime and available bandwidth once a minute and a Mint recorded the report. Version 0.2 replaced that model with the one below; version 0.3 adds the two rules that make it hold, the unrecoverable fee and the payment window.

### 3.1 Receipts

The unit of proof is a receipt. There are two kinds.

The **end-to-end receipt** is signed by the payer. For each payment window it carries the payer's and the recipient's NYMs, the Merkle root of the chunks the payer sent, the byte count, and the payer's timestamps for the first and last chunk of the window. The recipient's signature closes it. The payer's timestamps are the only authoritative ones in the route, because the payer is the one paying.

A **forwarding receipt** is signed by each pair of adjacent hops. It carries the two hops' NYMs, the hop's index in the route, the Merkle root, the byte count the hop forwarded, and the signature of the previous forwarding receipt, forming a chain from the payer's edge to the recipient's. Hop timestamps are advisory. A payer who cannot see a hop cannot timestamp it, and does not need to: the chain is anchored at both ends by signatures the hops cannot produce.

A relay cannot forge a receipt because every end-to-end receipt requires the payer's key, and a relay cannot inflate a receipt because the byte count is bound to a Merkle root the payer committed to.

The pilot runs without route privacy. The payer sees every hop and signs every receipt, which collapses the two kinds into one: in the Phase 0 lab, with a single hop, the receipt is the tuple in Figure 2, signed by the payer and countersigned by the hop with the hop's own byte count. Whether a Mint can verify a chain of forwarding receipts without learning the route is an engineering question the pilot does not answer.

### 3.2 Payment is the proof

The only party who cannot be fooled about whether bytes arrived is the party who was waiting for them. We therefore make the user's payment the proof of delivery.

Every hop is paid per unit of data through a conditional payment. The payment to hop *n* unlocks only when hop *n+1* acknowledges receipt, in the manner of a hash-time-locked contract across the route. A relay that accepts a payload and does not forward it is never paid for it. A relay that forwards it is paid whether or not any validator ever looks at the transfer.

A settled payment is therefore a proof of delivery that required no probing, no attestation, and no trusted hardware. Delivery (question 1) collapses into demand (question 2).

In the pilot, acknowledgement is the hop's countersignature on the receipt and payment is the invoice. The conditional payment proper arrives with the settlement layer in Section 2. On a link whose light time exceeds a threshold the membership sets, windows are prepaid and no lock is used (Appendix A).

### 3.3 The Sybil condition

If the only way to earn is to collect fees from a payer, then sending traffic to yourself costs the protocol fee and earns nothing. Wash traffic is net negative. This is the entire defense against Sybil relays, and it is the same reason routing networks built on conditional payment do not need a separate proof of relay.

It is only true if part of every fee leaves the colluding set. Version 0.2 did not say what part, or where it went. Version 0.3 does: a fixed fraction *b* of every fee is burned, and *b* is 5% until a simulation says otherwise. An operator who runs payer, relay, and Mint in one hand still loses *b* of every fee it pays itself. Routing the fraction to the Steward or to the settling Mint was considered and rejected, because both can leak back to the attacker when the attacker is also the Steward's grantee or the Mint.

The defense then holds under one condition: **no reward may exceed the fee that produced it, and no subsidy may exceed the burn.** If the Steward matches settled fees at a multiple *m*, self-dealing is unprofitable only while *m* is at most *b*. The Steward can never subsidize more than users were taxed. This bounds the bridge-node bonus that Section 5 describes, and it bounds it hard: at *b* of 5%, the most the Steward can add to a link is five cents on every dollar paid across it. Whether a bonus that small still moves anyone to build a link is the first question the pilot's economics must answer (Section 10). The alternatives, paying bonuses out of a treasury that does not depend on traffic, or lifting the cap by charging for payer identity rather than counting fees, are recorded there and not adopted.

- Block rewards do not exist. Nothing is issued for availability, uptime, or capacity.
- The Network Steward's route purchases are issued only as a match against fees already settled, from payers whose identities are bonded and aged, and never above *m*.
- Route-map weight is denominated in fees paid, so inflating the map costs exactly what it would cost to buy the bandwidth.

### 3.4 Quality is priced, not proven

A relay that is slow produces fewer settled bytes per payment window than a relay that is fast, and earns less. The market prices speed without the protocol having to prove it. Users choose routes from the receipt graph using the throughput that previous payers actually settled, not the throughput a relay advertises.

A speed proof is required only where a subsidy is at stake, because a subsidy is the one place a relay could profit from a false claim. Version 0.2 required a client-side attestation for that tier, in the manner of TLS notarization. No protocol for it is named and its overhead is unknown, and nothing in the pilot claims a subsidy, so it is deferred: the likely replacement is to make eligibility for a subsidy depend on the age and diversity of the payers' bonds rather than on any measurement, and that is decided when there is a subsidy to protect.

### 3.5 Clocks

The payer's clock is authoritative, because the payer is the one paying. Timestamps in a receipt are the payer's. A relay declines to serve a payer whose clock differs from its own by more than five seconds, and a Mint discards receipts whose timestamps are inconsistent with the chain of hops.

Five seconds is generous for a node that keeps a time source and fails safe for one that does not. In the Phase 0 lab, three nodes synchronized on one network agree within a millisecond. Left free-running, the fastest of their oscillators gains 0.76 seconds a day and crosses the tolerance in about a week; the slowest takes three weeks. A node that has been alone that long is declined, its window is lost, and nothing is paid. Drift between sites has not been measured. On a link with a light time, the tolerance widens by the light time both ways and the drift expected since the last contact; it is a parameter of the link (Appendix A). The payer's timestamp is a claim, checked by the hop against that tolerance. The time a Mint's commitment gives a receipt is a record. A receipt's acceptance rests on the claim; its durability rests on the record (Appendix A.5).

### 3.6 Payment windows

A payment window is one hour on the pilot's links; on a link that exists only during contacts, it is the contact (Appendix A). Before the window's bytes move, the payer locks the window's value; in the pilot, where there is no payment rail, the lock is the invoice and the exposure is bounded by membership. A relay therefore never fronts more than one window of bandwidth on credit, and a payer who consumes a window and leaves forfeits what was locked.

A window has two prices, and on the pilot's links the second is zero. The first is the posted price per byte. The second is the carry: a price per unit of time that the window's value stays locked before it settles, published by the relay as a parameter of the link (Appendix A.1). On a wire the wait is an hour and the posted price absorbs it; on a link whose window closes a day or a year after it opens, a price per byte is half a price, and the carry is the other half. The carry is also what an unused reservation pays (Section 5.1). A prepaid window whose contact never opens is refunded in full: the relay carried nothing and is paid nothing, as Section 3.3 requires, and the relay prices the risk of a contact that never comes into the carry on the windows that do settle, as maritime lenders priced the ship that did not come home into the rate on the ones that did (Appendix A.2).

A window settles at the smaller of the two signed byte counts, the payer's and the hop's. When the two counts are within one percent of each other the window is recorded as settled; when they differ by more it is recorded as disputed and settles by the same rule. Nothing else is needed to resolve a dispute: no probe, no testimony, no judgement. The rule was chosen because each party can only lower the number the other party is paid or paid for, and neither gains by doing so. A hop that declines a receipt loses the window: its next acknowledgement covers both windows, and the payer's count governs. A hop also declines a receipt whose timestamps disagree with what it observed by more than the tolerance of Section 3.5, since a payer that shortened its own window could otherwise claim a rate it did not get.

Streaming payments per chunk, which interactive traffic would need, are not in the pilot, which carries bulk traffic settled by the hour.

### 3.7 Residual attacks

- **Refusal to forward after accepting.** Handled by conditional payment: the hop is never paid for what it did not forward.
- **A last hop that will not acknowledge.** Only possible when payer and recipient are different parties. Endpoint services, where the payer is also the recipient, do not have this problem. Relay services are between members: the recipient is a bonded NYM, and a recipient that fails to acknowledge delivered chunks is slashed. Delivery to an unbonded party on the public internet is endpoint service by definition (Section 5), and the last hop is the payer's own.
- **Route inflation.** A relay that wants to appear in more paths must pay for the traffic that puts it there. Because map weight is denominated in fees, this is not an attack; it is a purchase, and *b* of the purchase is gone.
- **Collusion between a payer and a relay to claim a route bonus.** Bounded by *m* at most *b*, and by the payer bond age in Section 5.
- **A hop that over-claims.** The window settles at the payer's count. Measured in the lab: a hop that signed for twenty-two megabytes against a payer who signed for 272 bytes was paid for 272 bytes.

### 3.8 Alternatives considered

- **Validator probing.** Mints push random payloads through relays and time them. Relays learn to recognize probe traffic and prioritize it, one pipe can masquerade as many nodes, and probes measure a relay's behavior toward validators rather than toward users. Rejected, and version 0.2's liveness check, which was the same thing by another name, is removed with the uptime penalty it served.
- **Hardware attestation.** A trusted execution environment on the router counts bytes and signs. Sound, but it moves trust to a chip vendor and prices out small operators. Acceptable for a permissioned pilot, not for the open network. The pilot has not needed it.
- **Signature-chain receipts alone.** Prove delivery but not demand, since every signer may be the same operator. Retained as the receipt format in Section 3.1, but only because payment, and the fraction of it that is burned, makes the chain costly to fake.

## 4. Mints

A Mint does not decide whether bandwidth was delivered. That question is settled by payment before a Mint ever sees the receipt. A Mint's work is bookkeeping and enforcement: it holds the bonds of relays and payers, aggregates settled receipts, applies the dispute rule of Section 3.6, publishes settlement summaries, and publishes the receipt graph from which users choose routes. This is why it can be done for little computational energy, and why a Mint needs no particular bandwidth of its own.

The Mint is modeled on the notary of Open-Transactions. There, a transaction server signs every receipt it processes and the client keeps the signed copy, so that the client's proof of its own balance is a receipt in its hand and not the server's word; a server that signed something it later denies has signed its own conviction. A Mint is that notary applied to a batch: it signs what it settles, every party keeps the signed receipts, and the summary it publishes commits it to them.

A settlement summary is a Merkle commitment over the receipts it settles. Anyone holding a receipt can prove that it was included, or that it was not, and a Mint whose summary is shown to omit or alter a receipt forfeits a greater share of its bond than the fee it collected for that summary. This is the only penalty a Mint faces, and it works with a single Mint, which is what the pilot has. The commitment is also the only thing a second party can check its receipts against, so a Mint publishes one for every settlement period, in the pilot the Merkle root of each hour's settlements in the status it already posts, and it does so before a second operator signs a receipt. The ledger is reconstructible from the parties' signed copies alone: a Mint whose ledger is lost rebuilds it from them, and a Mint whose rebuilt ledger differs from its published commitment has signed its own conviction. In the pilot the Mint's bond is held by nobody. It is the Mint's standing with its members, and a member who can show an omission has one remedy, which is to leave with the signed copies and the proof. That is the smallest case of the enforcement in Appendix A.5, not an absence of it.

A Mint is compensated by a share of the settlement fee on the receipts it publishes. There is no block reward and no election. Version 0.2 carried both from version 0.1, together with a committee of five validators reaching a three-of-five consensus every minute and a minimum stake of one ten-thousandth of all assets in circulation; the committee and the election contradicted each other, and the minimums referred to assets that do not exist. The pilot runs one Mint. The target, when more than one party operates a Mint, is one proposer and four attesters per summary, with three of five required to finalize, and a proposer that is offline or inconsistent collecting nothing for that summary. Until then, a Mint's bond is set by the membership. A Mint settles the links of one settlement domain; where a link crosses domains, the Mints on each side reconcile their published commitments whenever a link between them allows (Appendix A). A settlement domain is a bookkeeper, not a currency: two Mints that keep their books in the same unit are two domains, and one Mint that settles links in two units is one.

User software queries the receipt graph that Mints aggregate for available routes, which reduces the cost of route calculation for users and removes from Mints the ability to discriminate among them.

## 5. Operators: Relays and Endpoints

Operators fulfill the needs of users in the form of Relay or Endpoint services, spending computational energy and bandwidth to carry the data users pay for and collecting receipts from those users for payment.

> **Endpoint services** allow a user to query a known location and extract information, whether identifiable files by hash or a Web 2.0 data stream. This interaction is similar to a user's relationship with VPNs or Usenet. The payer and the recipient are the same party, so the receipt chain closes with the payer's own signature. Delivery to any party that is not a bonded member, including the public internet, is endpoint service.
>
> **Relay services** carry a payer's data to another member. The recipient is a bonded NYM that acknowledges delivery (Section 3.7), and only the edge devices need be known to the payer once route privacy exists. Relay service is between members only.

**Price.** A relay posts a price per unit of data, and that price governs every payment made to it. The opportunity-cost figure of the next paragraph is not a price; it is used only to divide a Steward purchase among the relays on a path. In the pilot the posted price is ten cents a gigabyte. The posted price is in the link's unit (Appendix A.1), and on a link with a delay it is accompanied by the carry (Section 3.6).

A relay that is the only way across a gap earns the whole route. That is the incentive to build where nothing exists, and for as long as it is the only way it is also a monopoly: nothing in the protocol bounds its price but the cost of the next bridge. The protocol does not prevent that, and nothing could. What it does is keep the second bridge always fundable: anyone may build one, and a purchase commitment on a route (Section 5.1) is a bid against the first bridge's toll.

**Route purchases.** The Network Steward buys bandwidth on links it wants to exist, by defining a clear start point and endpoint and matching the receipts that bonded payers have already settled on that path, at a multiple *m* that is never above the burn *b* (Section 3.3). Payers whose bonds are younger than the program do not count. Relays on the path divide the purchase by opportunity cost, computed from the receipt graph: the fewer paid, disjoint paths that reach the endpoint without a relay, the greater that relay's share. A relay with five acceptable alternatives in a possible chain receives one fifth of that location's purchase, while a single relay connecting a bridge receives all of it. The attestation that version 0.2 required of traffic claiming a purchase is deferred (Section 3.4); eligibility is by bond age and diversity.

**Bonds.** An operator stakes a small bond with a Mint to be provisioned a NYM, which it broadcasts in its header so that other devices can connect to it securely. The bond's size is set by the membership in the pilot. The reference to a fictional exchange that version 0.2 used to size it is removed.

**Availability.** Version 0.2 kept an uptime penalty from version 0.1, which deferred part of a relay's earnings to the Steward in proportion to the seconds of a week it was not seen in a receipt or by a Mint's liveness check. It measured demand, not uptime, since a healthy relay with no customers at night was penalized, and the liveness check was the validator probing that Section 3.8 rejects. It is removed. A relay that is offline earns nothing, and quality is priced (Section 3.4). For the subsidy tier only, a relay must be seen by its peers to be eligible: availability is a gate on Steward purchases, measured by signed heartbeats between neighboring relays, with no reward attached to the heartbeat and no Mint involved.

### 5.1 Purchase commitments

A purchase commitment, a bounty in the roadmap's word, is a payer's prepaid offer to buy bandwidth that does not exist yet, or that exists and must be kept in use. It is the protocol's only instrument for causing a link to be built, and it is a purchase: every unit it pays out traces to a settled receipt, and the burn of Section 3.3 is taken from every fee paid out of it.

A commitment names a route, from a node to a node or to a place; a minimum rate, stated as bytes per window (forty megabits a second is eighteen gigabytes an hour); a premium per byte above the relay's posted price; a number of windows; a deadline; and, optionally, a proving allowance. Its value is escrowed with the poster's Mint, which is the prepayment of Section 3.6 made in bulk, and it is announced on the gossip layer like any announcement (Section 6). Any relay, or chain of relays, that serves the route carries the poster's windows and collects. A commitment whose route crosses into another settlement domain is paid on the far side at the bridge relay's rate (Appendix A.5), so its premium buys what the bridge's price says it buys and not what the poster's unit says.

A committed window settles as every window does, at the smaller of the two signed counts, and then the Mint applies one more rule. At or above the minimum, the relay is paid the posted price and the full premium. Below it, the relay is paid the posted price on what moved and the premium in proportion to what moved over the minimum, and the rest of that window's premium returns to the poster. The rate is the receipt's byte count over the payer's first and last timestamps; nothing new is measured, and a shortfall is resolved from the receipts alone. The posted price on committed windows is the poster's to lose whether or not the poster sends, as a reservation is. An unused reservation pays the relay the link's carry for the window (Section 3.6) and nothing else: the carry is the price of holding the window's value, and on the pilot's links it is zero, so the pilot's default stands.

**Proving.** Validators do not probe (Section 3.8), so a route is shown to be open by being used. A commitment may carry a proving allowance: the escrow reimburses the posted price of up to a stated number of windows per period bought on the route by payers other than the poster, provided the payer's bond is older than the commitment and not owned by the relay. The testers keep the bandwidth; the receipt graph keeps the record, and the poster can see the route settling at the rate before relying on it. The allowance is bounded, so a relay that proves its own route through a second identity gains at most the allowance less the burn, out of the poster's escrow and nothing else.

**Pipes.** A commitment with no end date keeps a pipe open the only way the protocol can: it guarantees that carrying traffic across it is paid at the premium, and its proving allowance guarantees a minimum of traffic. A pipe nobody uses earns nothing, and a relay that lets it go dark stops earning when the receipts stop. A pipe is also how a community retires a toll: it is the users of a sole bridge paying its owner in advance and for good instead of paying the toll forever, and in return the relay that accepts a pipe fixes its posted price on that route for as long as the pipe pays. That is what it gives up, and it is the only thing a pipe can ask of a monopoly.

**Places.** A commitment may name a place instead of a far node, to pay for people being served there. It cannot buy presence. Nothing in Section 3 can tell a hotspot in the square from the same box in a closet, and a premium for being available is the reward Section 3.3 forbids. It can buy service: the commitment reimburses part of every fee that independent payers settle with an access point over a short-range radio, up to a cap per payer and per period, and the access point earns only by serving them. The place is the poster's anchor, a node the poster operates there. The access point must hold control-plane exchanges with the anchor over radio during each period it claims (Section 6); a radio exchange is a physical fact, so the access point is within the anchor's radio range, and its customers within its own. The medium and range class of each link are parameters the relay publishes and can be slashed for misstating (Appendix A). That is a location with the resolution of a radio, not a coordinate, and the paper claims no more: a high-gain antenna widens it, a short-range anchor narrows it.

**The Steward.** The Network Steward's route purchases, above and in Section 7, are purchase commitments funded from the burn, with the premium capped at the burn. There is no second mechanism.

## 6. Announcements

Announcements exist for route discovery. They carry no reward weight. Nothing in an announcement is trusted for payment, subsidy, or availability; those are determined by receipts.

A relay announces to its peers, over a gossip layer or distributed hash table that never touches the settlement layer, its NYM, its posted price, the routes it will accept, and the parameters of each link it offers (Appendix A). On a link that exists only during contacts, the announcement is a contact plan: when the link will exist, for how long, and at what price. A purchase commitment (Section 5.1) is announced the same way. An anchor's control-plane exchanges with an access point are announcements signed on both sides; they earn nothing and gate a purchase. Version 0.2's announcement also carried the relay's own report of its uptime and its maximum available bandwidth, and a sync test by which a relay measured and reported its own throughput. All three were self-reports of the kind Section 3 exists to replace, and they are removed. A user's software ranks relays by the throughput previous payers actually settled, which the receipt graph records and an announcement cannot inflate.

**[Figure 2] Receipt**

```
(payer NYM, hop NYM, hop index, merkle root, bytes, t_first, t_last, prev receipt sig) signed by payer
```

In the pilot the hop countersigns the same tuple with its own byte count and with *prev receipt sig* set to the payer's signature, and both signed copies go to the Mint. The Merkle root in the lab is the payer's commitment to its own meter readings, since nothing is chunked yet; the field is kept so that the chunked form of Section 3.1 is a change of content, not of format.

Open-Transactions' claims and notaries would allow a second-layer label and verification of a particular node's location or trustee, should a person or group want to announce such a claim. Nothing in the protocol depends on it, and nothing is paid for it.

## 7. Network Steward

The Network Steward, a DAO,[^RD6] is purposed to seed links without bias and in such a way that it promotes healthy competition to grow the network. Its goal is to promote competition to keep prices the most competitive for users, and to encourage a high rate of innovation[^RD8] across all market segments that use the protocol.

The Steward is funded by the burn: it receives, as its income, an amount equal to the fraction *b* of every fee that the network destroys, so that its income scales with the traffic the network carries and with nothing else. Version 0.2's funding, ten percent of each block reward declining by a point a year, is deleted with the block reward; under those numbers the Steward's income would have been under a third of its launch level by the third year and near zero by the ninth, for no stated purpose.

The Steward never issues a reward for availability, uptime, or capacity alone. Every Steward disbursement to an operator is a purchase of bandwidth on a named link, matched against fees that a bonded payer has already settled there, at a multiple no greater than *b*.

All proceeds received and spent by the DAO are reported in annual statements, to the standard set by Wyoming's Decentralized Autonomous Organizations Supplement. Funds unspent after 90 calendar days are returned to the burn and reported to the network. Each operator votes through a Mint by marking an output with its vote; proposals may be made by anyone and address the membership, leadership, goals, and spends of the registered Wyoming DAO.

## 8. Governance

As this system's deployment takes up physical space, unlike software whose space is undefined, it is important that one individual's preferences do not risk injuring or inappropriately changing others' ability to act in areas they do not affect. Tests conducted in 2018 by the then developer of Open-Transactions, of location-based notary services that interfaced trustlessly via the BIP-47 payment privacy protocol, confirm the ability to associate a vote with a physical location without double voting. That combination of notary services, BIP-47, and an alternative use of Chaumian cash can guarantee that a ballot is all its holder receives, is blind, and can be cast only once.

Governance is for bonded, identified members. Relays and payers may remain pseudonymous NYMs and use the network without it; a member who wishes to vote identifies itself to the DAO. Version 0.2 relied on that identification to restrict whales while describing the network as semi-anonymous; the two are reconciled by making identification a condition of governance membership and of nothing else.

We propose protecting the ideas of the community by setting strong limits on the right to vote, such as:

1. Minimum use restrictions since the last polling period;[^1] such that one must have spent a minimum amount in the ecosystem or operate a minimum number of producing nodes.

2. Minimum time restrictions since account creation; such that rash, emotional, or undeveloped requests are encouraged to be rejected.

3. Anti-private-interest restrictions, by weighting votes as the logarithm of stake: one unit staked is one vote, ten units are two, a hundred are three, a thousand are four, and so on. Version 0.2's scale of one, two, four, and five was not logarithmic.

These restrictions have the capacity to protect the ideas of the community while awarding those with more significant capital interest tools for communication and identification without dictatorial control of any particular vote. The voting capabilities described have been developed by Voting Matters, a subsidiary of MatterFi, the current developers of Open-Transactions.

## 9. The pilot

The pilot is permissioned: two or three sites with real spare backhaul, dollars not tokens, one Mint, no onion routing, hourly prepaid windows, signed receipts, a monthly invoice. It answers directly which price governs, who pays and for what, the receipt structure without route privacy, the payment window, the last-hop rule, the place of announcements, settlement by invoice, the clock tolerance, and the narrow resilience claim of Section 1. It answers by simulation alongside the unrecoverable fee, the subsidy bound, emissions, the Steward's funding, availability, and Mint fraud proofs. It defers, honestly, the lifting of the subsidy cap, the Mint committee, attestation, open relays, the token, and governance.

Success looks like: two parties who are not the authors settle a month of real traffic on receipts, dispute at least one receipt, and the dispute resolves from the receipt data alone.

**Phase 0, October 2026.** Three single-board computers on one home network: a gateway that is the payer, a relay that is the hop, and a Mint. The payer and the hop share a tunnel; at the top of every hour the payer reads the tunnel's byte counters, builds the Figure 2 receipt, signs it, and asks the hop to acknowledge. The hop checks the signature and the clock rule, countersigns with its own count, and both copies go to the Mint, which verifies the signatures, refuses NYMs it was not told about, appends everything to its ledger, and settles the window by the rule in Section 3.6. The posted price is ten cents a gigabyte and the invoice is by month. The code is published.

Three forced tests were run on the first day, each by resetting a counter on one side so that the two signed counts would disagree.

- *The hop under-claims.* Twenty megabytes crossed the tunnel; the payer signed 21,938,052 bytes and the hop 21,939,460, within one percent, and the Mint settled the window at the smaller count. Twenty more megabytes crossed; the hop's counter was reset; the payer signed 21,945,428 bytes and the hop 1,712; the Mint recorded a dispute and settled at 1,712.
- *The hop over-claims.* The same two windows with the counter reset on the payer's side instead: the payer signed 272 bytes against the hop's 21,947,428, and the window settled at 272 bytes. A hop cannot be paid for more than the payer signed for.
- *The clock rule.* The hop's clock was stepped ten seconds; it declined the payer's receipt, and the window was lost, not paid. The declined receipt stays on the Mint without an acknowledgement. The hop's next acknowledgement covered both windows and settled at the payer's count.

In every case the Mint resolved the window from the two signed receipts alone, with no measurement of its own. In sync, the three clocks agree within a millisecond (Section 3.5).

**What Phase 0 did not show.** A second party. A payment rail, since the invoice is the settlement. Route privacy, since there is one hop. Any subsidy, since there is no Steward. Any adversary, since one person operates all three nodes. It showed that the receipt mechanism works between machines that are not trusted to agree, which is the part a whitepaper cannot show on paper.

**What Phase 0 does next.** Two tests that Section 4 depends on, and that Phase 2 needs before a second operator signs anything, have not run: rebuild the Mint's ledger from the payer's and the hop's signed copies alone, and publish each hour's Merkle commitment in the status the Mint already posts. The installations beyond the bench, from a neighbor across a valley to a link between stars, can be emulated on the same three boards with a delay on the tunnel and a schedule for the link; what each would show is set down in the project's notes on example installations, and none of it has run.

**Phase 1** replaces the bench cable between the gateway and the relay with a radio link and moves receipts and liveness onto a low-rate control channel. Its test is to cut the gateway's connection to the internet mid-window and show that the window still settles when the connection returns, which is the claim in Section 1. **Phase 2** puts the relay outdoors on its own power and, with it, a second operator who is not the authors, which is the success criterion above.

## 10. What version 0.4 leaves open

- **Whether a bounded subsidy moves anyone.** With *m* at most *b*, the most the Steward can add to a link is *b* of what users pay across it. If that does not move an operator to build a link, the alternatives are to fund links from a treasury that does not depend on traffic, which is grant-making, or to lift the cap by charging for payer identity rather than counting fees, which requires knowing what a Sybil payer costs to manufacture. A simulation of one operator running payer, relays, and Mint, sweeping *b*, decides between them.
- **The customer.** Site-to-site backhaul between locations that already overbuy capacity is the pilot's use case because the authors can supply both sides of it. Whether anyone chooses this over a carrier contract, a satellite, or a VPN is a market question that only paying traffic answers.
- **Forwarding receipts under route privacy.** Whether a Mint can verify the chain of Section 3.1 without learning the route.
- **The settlement layer.** Chosen among the three candidates in Section 2 when an untrusted party joins; the cost of each has not been measured.
- **The Mint committee.** One proposer and four attesters is the target; the pilot has one Mint and fraud proofs.
- **Attestation for the subsidy tier**, or its replacement by bond age and diversity.
- **Open relays.** Relay service is between members. Carrying third-party traffic for the public internet raises liability the paper does not address, and is not in the pilot.
- **The token**, its status, and the Steward's legal form, deferred until there is traffic to denominate, and all to be reviewed with counsel against the rules in force then. The unit question itself returns earlier, at the first bridge between domains, and Appendix A.5 names the three answers; which one a given bridge uses is the bridge's to announce.
- **Clock drift between sites**, measured once the relay leaves the bench.
- **The levels.** Version 0.4 says what the carry is for, what custody costs and what a bridge relay's two bonds do; it does not know the numbers. How large the bonds must be relative to what a bridge earns, and the carry at which a prepaid window on a contact that may never come is worth opening, are set by the membership until a link with a real delay has settled enough windows to say.
- **The reconciliation wire format** between Mints (Appendix A.5): what it carries and what it is for are stated, how it is encoded is not.
- **Whether proving allowances attract real testers** (Section 5.1), or only a relay's second identities.
- **Payers at a place.** Whoever connects at an access point has to be a payer with a NYM, or the poster pays on their behalf through the commitment. That is an application as much as a rule, and it is the Phase 2 work.
- **Readmission.** Appendix A.5 says an excluded domain may return once it reconciles and burns what it owed. Who decides that it has, when there is no committee, is governance (Section 8), and the pilot has none.
- **The lifetime of a receipt.** A link names its signature scheme and how long a receipt stays presentable (A.1), and reconciliation deposits each Mint's commitments with the others (A.5). What a Mint does with a receipt presented after its lifetime, and how a network moves every link to a stronger scheme before the old one breaks, are not written.
- **The horizon for institutions.** Appendix A.7 puts a payer's horizon at the payer's life. What the protocol does with a window whose payer's Mint outlives the payer is the question every estate has had to answer, and the paper has not.

## Appendix A. Links with delay

The protocol has no constants. The hour, the five seconds, the one Mint, and the monthly invoice are the pilot's choices for a link whose light time is nothing and whose contact is continuous. Each of them is a parameter of a link, published by the relay in its announcement and accepted by the payer when it opens a window. Written that way, the same receipt serves a bench, a relay in lunar orbit, and a link whose other end is years away; the differences are numbers, and the thing that proves delivery is the same two signatures on every link.

**A.1 Link parameters.** For each link it offers, a relay publishes: the one-way light time of the link; its contact plan, which is when the link exists, for how long, the bytes it expects to carry in each contact, and how long it holds a bundle between contacts; its posted price per byte and the unit it is posted in; its carry, the price per unit of time that a window's value stays locked (Section 3.6); its clock tolerance; the kind of window it accepts, an hour, a contact, or a transmission; its medium and range class, a wire, a point-to-point radio, LoRa, or a short-range hotspot; the signature scheme its receipts use and how long a receipt stays presentable to a Mint; and the settlement domain it settles in, which is the Mint that holds its bond. A payer that opens a window accepts those parameters for that window. Nothing in them is trusted for payment. The receipt graph records what each announced contact actually settled, and a relay whose contacts persistently settle less than it announced ranks below one whose contacts match, exactly as Section 6 ranks announcements on a continuous link.

**A.2 Windows and custody.** On a link with a contact plan the window is the contact: it opens when the link does, closes when it does, and the receipt is per contact. The window is prepaid (Section 3.6). A relay that stores bytes during one contact in order to carry them to the next is in custody of them, and custody is nothing more than a window on the next link: the relay is paid for it by the next link's receipt, not by this one. Delay-tolerant networking removed custody transfer from the core of its bundle protocol for want of a way to make it reliable; this is that mechanism with the reason to accept custody attached. A relay accepts the bundle because the next contact's window is already paid for.

Three things make custody a term rather than a hope. The relay countersigns the bundle when it takes custody, a custody receipt in the format of Figure 2 with its own count, so that a bundle lost between contacts is a loss on paper and slashable. The contact plan says how long the relay holds a bundle before it may drop it, and that term is part of the price. And a prepaid window whose contact never opens is refunded in full, with the risk priced into the carry on the windows that settle (Section 3.6): the relay that held a bundle for a contact that never came has earned nothing on it, as Section 3.3 requires, and has earned the carry on every window that did.

**A.3 Clocks.** The tolerance of Section 3.5 is a link parameter: the base tolerance, plus the link's light time both ways, plus the drift expected since the last contact. The relay's check becomes whether the payer's timestamp is plausible for a signal that left when the payer says it did. It is still the payer's clock, and a receipt outside the tolerance is still declined and its window lost.

**A.4 Payment.** Below a light time the membership sets, the conditional payment of Section 3.2 applies, with lock timeouts no shorter than the route's round trip. Above it, windows are prepaid and no lock is used: a lock that must run for days ties a relay's capital to a timer, and a prepaid window bounded by the payer's bond does the same work without one, for security. For cost it moves the lender from the relay to the payer: under a lock the relay lends for the round trip, under a prepaid window the payer lends for the contact, and the carry (Section 3.6) is where that cost is written on either kind of link. The pilot is already on the prepaid side of that line.

**A.5 Settlement domains.** A Mint settles the links of its domain. A domain is a bookkeeper, not a currency, and in practice a world. A relay on a link between two domains posts a bond with the Mint on each side, and a dispute on that link is resolved by either Mint from the two receipts, since the rule of Section 3.6 needs no other input.

*Units.* Each link's prices, bonds and escrows are amounts in the unit its announcement names (A.1). The burn, the subsidy bound and the smaller-count rule are two ratios and a count, and cross a domain unchanged: the Sybil condition of Section 3.3 holds on a link between worlds without anyone converting anything. A relay bonded on both sides of a bridge holds value in two units and earns in both. Its two bonds are an exchange position, and the prices it posts on each side embed the rate between the domains, so a payer reading a bridge price is reading an exchange rate, and a commitment that crosses a bridge is priced by it (Section 5.1). Where two domains share no unit, the bridge counts bytes each way and the two Mints net the counts at reconciliation.

*Reconciliation.* Mints reconcile their published commitments (Section 4) whenever a link between them exists, and reconciliation does three things. It is a check: a Mint whose commitments do not reconcile, or that has burned less than Section 3.3 requires, is shown to have done so from its own publications. It is a deposit: each Mint includes the other's latest commitment in its own, so that a receipt settled on one side is timestamped on the other, and a Mint that disappears leaves its register with the rest. And it is traffic: commitments cross a bridge in windows at the bridge's posted price like any other bytes, so a bridge that withholds reconciliation has declined a window, which is on the record and governed by the sending Mint's count, and a bridge that is the only path between two domains cannot hold their audits hostage without being seen to.

*Exclusion.* Across domains a Mint shown to have cheated is not slashed, because no other Mint can reach its bond. It is excluded: the honest Mint publishes the proof where any payer can find it before opening a window, stops reconciling, and slashes any relay bonded on its side that keeps settling with the condemned Mint. The bridge relays, bonded on both sides, carry the penalty at once. That is what their two bonds are for, and the membership sets them large enough that a bridge would rather lose one Mint than both. The penalty is worth the discounted value of every future reconciliation, which is much where reconciliation is daily and little where it is years, and on the longest links the two-sided bond carries the whole weight. A domain excluded for a proven fault may be readmitted when it has published a commitment that reconciles with the rest and burned what it owed; a network that polices by closing doors has to be able to open them, or it is a cartel. The reconciliation protocol's wire format is open (Section 10). What it carries and what it is for are not.

**A.6 Route discovery.** A route between domains is not discovered; it is computed from the contact plans, as delay-tolerant networks compute routes from a contact graph, and ranked by what each relay settled in past contacts. A relay's announcement therefore says when it will be reachable, not whether it is. Liveness has no meaning on such a link, and earns nothing on any link.

**A.7 What this does not change, and where it stops.** What the protocol rewards: bytes a payer signed for and a relay carried. What it refuses to pay for: everything else. What proves delivery: two signatures on one receipt. Distance changes how long it takes to make one, not what it is, for as long as the route's round trip is inside the payer's horizon, the time the payer will still be there to receive the closed receipt. Inside the horizon the payer is the party that wanted the bytes, and the receipt tells it they came, which is the whole of Section 3.2. Past it the party that wanted the bytes cannot have paid, since the payment would have to precede the delivery by more than a lifetime. The sender pays, the recipient receives a gift, and the protocol is a sound way for an institution to pay relays per link toward silence, which is honest and is not a proof of anything to the party that wanted the bytes. The horizon is a property of the payer, not of the link. For a person it is a few decades of round trip, which puts the Moon, Mars and the nearest star inside it; for an institution it is the institution's life. On a link past a payer's horizon the window is opened by the sender, two-way traffic is two one-way ledgers, and the Mints net them at reconciliation (A.5). The Sybil condition of Section 3.3 holds on both sides of the horizon, because the burn is a ratio and the payer's loss is certain whoever the payer is.

---

## Footnotes

[^1]: Possible with Pseudonyms through Open Transactions and OBPP-05 (https://github.com/OpenBitcoinPrivacyProject/rfc/blob/master/obpp-05.mediawiki)

[^i]: https://en.wikipedia.org/wiki/Local-loop_unbundling#United_States

[^ii]: https://web.archive.org/web/20081202153609/http://www.ictregulationtoolkit.org//en/Document.2904.pdf

[^iii]: http://opentransactions.org/wiki/index.php?title=About

## Author's draft comments

*The original document carried eight inline reviewer comments (RD1 through RD8). Two are kept here as footnotes. The others referred to the mining-pool analogy, the fictional exchange, sync tests, and the emission schedule, all of which version 0.3 removes.*

[^RD6]: Wyoming was the first state in America to recognize a DAO LLC, under the Decentralized Autonomous Organizations Supplement passed by its legislature in March 2021. The registered name includes "DAO," "LAO," or "DAO LLC," and the Articles of Organization include a Notice of Restrictions on Duties and Transfers stating that the Supplement, the underlying smart contracts, the articles, and the operating agreement may define, reduce, or eliminate fiduciary duties and may restrict the transfer of ownership interests, withdrawal from the DAO, return of capital contributions, and dissolution. A DAO may be member-managed or algorithmically managed, the latter only where the underlying smart contracts can be updated, and the Articles must be amended when those contracts change. A withdrawn member forfeits all membership interests unless the articles provide otherwise. Case law has yet to color how a court treats a DAO's liability to creditors. Acceptance of the Network Steward as a Wyoming DAO would let it use ordinary banking to purchase bandwidth and ordinary tax reporting for what it pays operators, which is one reason the pilot settles in dollars.

[^RD8]: The Steward's model for each product it seeds: 1) Prove prototype and customer acceptance. 2) Grow to the critical mass at which the customer lifecycle can be defined. 3) Open source all materials and tools that will allow other companies to compete. 4) Transfer assets to a special-purpose vehicle, Company One, and offer incentives for liabilities and talent to join it. 5) Offer seed funding for two other companies to be started to fulfill the product need. This model was executed in the creation of three state-owned, yet competing, Chinese airlines, whose case studies can be confirmed.
