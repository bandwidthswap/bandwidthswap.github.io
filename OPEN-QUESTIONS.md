# $BANDWIDTH: Open Questions

Status as of Oct 8, 2026, against whitepaper v0.2 (copyedited).
Each item records what is unresolved, the candidate answers, what a build would reveal, and a default to start from so the build is not blocked. Items are ordered by how much they decide. The first three determine whether the mechanism works at all.

Legend for "Build reveals": **sim** = answerable with a simulation or spreadsheet, **proto** = needs the protocol running between real nodes, **market** = needs paying users, **decide** = a policy choice, no build will answer it.

---

## A. Economics

### A1. The unrecoverable fee
**Unresolved.** Section 3.3 says wash traffic "costs the protocol fee." That is only true if part of every fee leaves the colluding set. The paper does not say what fraction, or where it goes.
**Options.** (a) Burn a fixed fraction *b* of every fee. (b) Route *b* to the Steward. (c) Route *b* to the Mint that settles the receipt, which only works if Mints are not the same operator as the relay.
**Build reveals.** *sim.* A self-dealing simulation with one operator running payer, relays, and Mint, sweeping *b* from 0 to 30%, shows the break-even and whether (b) and (c) leak back to the attacker.
**Default to start.** Burn. *b* = 5%. Revisit after A2.

### A2. The subsidy bound
**Unresolved.** If a fraction *b* of each fee is unrecoverable and the Steward matches settled fees at multiple *m*, self-dealing is unprofitable only when *m* < *b*. The Steward can never subsidize more than users were taxed. That caps the bridge-node bonus, which is the paper's central promise.
**Options.** (a) Accept the cap: the Steward recycles burned value and nothing more. (b) Lift the cap by making subsidy eligibility depend on payer identity cost (bond size, bond age, distinct ownership) rather than on fee volume. (c) Fund gap-closing outside the protocol entirely, with grants from a treasury that does not depend on traffic.
**Build reveals.** *sim* for (a) and (b): what does a Sybil payer cost to manufacture under each bond rule, and how much subsidy can be paid before manufacturing one pays off. *decide* for (c).
**Default to start.** (a), *m* = *b*. Measure how small the bridge bonus becomes and whether it still moves anyone to build a link.

### A3. Emissions
**Unresolved.** Mints still receive a block reward for being elected and the Steward takes 10% of it. That is a reward for availability, which 3.3 forbids. The 10%-per-100-days decay and the 1%-per-year Steward step-down are inherited from v0.1 with no stated purpose.
**Options.** (a) No emissions. Mints live on a share of settlement fees; the Steward lives on the burn or on grants. (b) Keep a small emission with a stated purpose, such as bootstrapping Mint participation before fee volume exists, with a hard end date.
**Build reveals.** *sim.* Model Mint revenue at launch volumes. If settlement fees cannot cover a Mint's cost at the volume the pilot will have, (b) is needed for a bounded period.
**Default to start.** (a). The pilot has no token, so this cannot bite until there is one.

### A4. Steward funding curve
**Unresolved.** Under v0.2's numbers the Steward's income is under a third of launch level by year three and near zero by year nine.
**Options.** Depends entirely on A1 through A3. If the Steward lives on the burn, its income scales with traffic and the decay schedule is deleted.
**Build reveals.** *sim*, after A1 to A3 are set.
**Default to start.** Delete the decay schedule. Steward income = the burn.

### A5. Which price governs
**Unresolved.** Relays post an asking price in their announcement (Section 6, field 2). Section 5 computes an opportunity-cost share from the receipt graph. The paper never says which one a payment uses.
**Options.** (a) Market price governs every payment; the opportunity-cost figure is used only to split Steward subsidies. (b) The computed figure sets a floor or ceiling on the asking price. (c) Drop the asking price and let the protocol compute all prices.
**Build reveals.** *proto* then *market.* Route selection in the client has to pick one. Whether users accept protocol-computed prices is a market question.
**Default to start.** (a). Simplest, and it keeps "difficulty" as a subsidy concept rather than a pricing one.

### A6. Who pays, and for what
**Unresolved.** The paper has no customer. No use case, no price point, no reason to choose this over a VPN, Starlink, or a carrier contract.
**Options.** (a) Site-to-site backhaul between industrial locations (mining, oilfield, rural data centers) that already overbuy capacity. Bulk, hourly settlement, no micropayments. (b) Interactive VPN-style traffic. Needs sub-cent channels. (c) Edge capacity for AI agents and scrapers. Easiest demand, worst abuse profile.
**Build reveals.** *market.* Only paying traffic answers this.
**Default to start.** (a). It is the use case the authors can supply both sides of, and it lets the first build skip per-packet payment entirely (see B2).

---

## B. Protocol

### B1. Receipt structure under onion routing
**Unresolved.** Section 3.1 has the payer sign every hop's receipt with the payer's timestamps. Section 5 says the payer knows only the edge devices. A payer cannot timestamp a hop it cannot see. Figure 2 says the receipt is signed by the payer; 3.1 says each hop signs.
**Options.** (a) Two receipt types: a payer-signed end-to-end receipt (bytes, Merkle root, first and last timestamp at the payer's edge) and hop-to-hop forwarding receipts signed by adjacent hops, with hop timestamps non-authoritative. The chain is anchored by the payer and recipient signatures. (b) Drop onion privacy for the pilot; the payer sees every hop and signs every receipt.
**Build reveals.** *proto.* Whether (a) can be verified by a Mint without the Mint learning the route is a real engineering question.
**Default to start.** (b) for the pilot, (a) as the target. Site-to-site backhaul does not need route privacy.

### B2. Payment windows and credit risk
**Unresolved.** "Payment window" is undefined. Inside a window the relay fronts bandwidth on credit. A payer can consume a window and leave.
**Options.** (a) Window sized so the exposure is below the payer's bond, and the bond is slashed on non-payment. (b) Prepaid windows: the payer locks the window's value before bytes move. (c) Streaming micropayments per chunk, Orchid-style probabilistic nanopayments.
**Build reveals.** *proto.* The throughput cost of (b) and (c) can only be measured by running them.
**Default to start.** (b), with hourly windows, for backhaul. Decide between (a) and (c) only if interactive traffic is added.

### B3. Last hop acknowledgment
**Unresolved.** v0.2 requires a bonded recipient for third-party delivery. That makes relay service work only between network members. The paper's definition of relay service ("query an unknown location") is ambiguous about whether the recipient is a member or the public internet.
**Options.** (a) Relay service is member-to-member only; exits to the public internet are endpoint service, where the payer is also the recipient. (b) Allow unbonded recipients and accept that the last hop is unprovable.
**Build reveals.** *decide*, then *proto* for the exit case.
**Default to start.** (a). Rewrite the Section 5 definitions to say so.

### B4. Announcements and the chain
**Unresolved.** Section 6 says announcements are written "to the blockchain immutably." Section 2 says only channels, settlement summaries, and slashings touch the chain.
**Options.** (a) Announcements go to a gossip layer or DHT and never touch the chain. (b) Mints include a hash of the announcement set in each settlement summary.
**Build reveals.** *proto.* Route discovery latency with (a) versus (b).
**Default to start.** (a). Delete the sentence in Section 6.

### B5. Uptime penalty measures demand, not uptime
**Unresolved.** "Active" now means appearing in a settled receipt or answering a Mint liveness check. A healthy relay with no customers at night is penalized, and the liveness check is the validator probing Section 3.7 rejects.
**Options.** (a) Drop the uptime penalty. Quality is already priced (3.4), and a relay that is offline earns nothing. (b) Keep it, but measure availability by signed heartbeats to peers rather than to Mints, with no reward attached. (c) Keep it only as an eligibility gate for subsidies.
**Build reveals.** *sim.* Does removing the penalty let flash-on relays capture subsidy spikes? Only matters if A2 leaves a subsidy worth capturing.
**Default to start.** (a) for ordinary traffic, (c) for the subsidy tier.

### B6. Fraud proofs for Mints
**Unresolved.** A Mint can publish a false settlement summary to tilt the route graph. The only stated penalty is announcing its address.
**Options.** (a) Settlement summaries are Merkle commitments over receipts; anyone holding a receipt can prove inclusion or exclusion and trigger a slash. (b) Summaries are re-checked by the other four Mints in the 3-of-5 committee before publication.
**Build reveals.** *proto.* (a) needs a challenge window and a bond; (b) needs the committee to actually exist (see B7).
**Default to start.** (a). It works with a single Mint, which is what the pilot will have.

### B7. Validator selection contradiction
**Unresolved.** "One Mint is randomly chosen every minute" and "five stakers reach 3-of-5 consensus per block" both survive from v0.1. The 10 Mb/s validator bandwidth minimum is meaningless now that Mints carry no traffic.
**Options.** (a) One proposer, four attesters, 3-of-5 to finalize. (b) Single Mint per block, no committee, rely on B6 fraud proofs.
**Build reveals.** *decide* now, *proto* later. The pilot runs one Mint either way.
**Default to start.** (b) for the pilot, (a) as the target. Delete the bandwidth minimum.

### B8. Settlement layer
**Unresolved.** Ethereum L1 channels per payer-relay pair are too expensive. Open-Transactions is a notary-trust system the paper never admits is one, and it has been dormant for years.
**Options.** (a) An Ethereum L2 with native payment channels. (b) A hub model: one channel per party to a settlement hub, hub is a Mint. (c) Lightning or a Lightning-like network for payment, with receipts kept separately. (d) For the pilot, no chain at all: signed receipts settled in dollars by invoice.
**Build reveals.** *proto.* Cost per settlement and latency to finality under each.
**Default to start.** (d). The pilot is permissioned; signed receipts plus a monthly invoice proves the receipt mechanism without a chain. Choose among (a) to (c) only when a second, untrusted party joins.

### B9. Clock tolerance
**Unresolved.** The payer's clock is authoritative, with a "published tolerance" that is not published.
**Options.** Tolerance in seconds, and what a relay does on violation (decline, or serve and flag).
**Build reveals.** *proto.* Measure real clock drift across pilot sites.
**Default to start.** 5 seconds, decline.

### B10. Attestation for the subsidy tier
**Unresolved.** 3.4 requires a client-side attestation (TLSNotary-style) for traffic claiming a bonus. No protocol is named and the overhead is unknown.
**Options.** (a) Name a protocol and measure it. (b) Replace with payer bond age and diversity (from A2) and drop attestation. (c) Defer until a subsidy exists.
**Build reveals.** *proto* for (a). *sim* for (b).
**Default to start.** (c). Nothing in the pilot claims a bonus.

---

## C. Legal and market

### C1. Operator liability for third-party payloads
**Unresolved.** Relay operators carry content they cannot inspect. Sanctions, CSAM, and intermediary-liability exposure are never mentioned.
**Options.** (a) Member-to-member only (B3a) with KYC'd members, which bounds the exposure. (b) Open relays with legal analysis of common-carrier and Section 230 posture in the pilot jurisdiction.
**Build reveals.** *decide*, with counsel.
**Default to start.** (a). The pilot is between known parties.

### C2. Token status
**Unresolved.** The paper's claim that the 1933 Act has not been applied to crypto was arguable in 2021 and is false in 2026. The "non-token rewards through a Wyoming DAO and 1099s" path is still sound but needs current review.
**Options.** (a) No token in the pilot; dollars or a stablecoin. (b) Token later, structured under whatever the 2025 to 2026 market-structure rules allow.
**Build reveals.** *decide*, with counsel.
**Default to start.** (a).

### C3. Governance assumes KYC on a pseudonymous network
**Unresolved.** Section 8 relies on KYC to restrict whales while the network runs on semi-anonymous NYMs. The vote scale 1, 2, 4, 5 is not logarithmic.
**Options.** (a) Governance is for bonded, identified members only; relays and payers can be pseudonymous. (b) Rewrite the scale as true log2 or log10 of stake.
**Build reveals.** *decide.*
**Default to start.** (a) and log10. Not needed for the pilot.

### C4. Resilience claim
**Unresolved.** A network that settles on Ethereum cannot be the one that survives a Carrington event.
**Options.** (a) Delete the claim. (b) Restate it narrowly: the receipt mechanism works offline and settles later, so the data network can keep running on local trust while the settlement layer is down.
**Build reveals.** *proto.* (b) is true only if receipts and B2 prepaid windows survive a settlement outage. Test by cutting the Mint off mid-pilot.
**Default to start.** (b), and test it.

---

## D. Editorial, still open after the copyedit

- "securities and exchange act of 1933": the Securities Act is 1933, the Securities Exchange Act is 1934. Needs the authors to say which was meant.
- "Kathrine Long" and "BI laws" could not be verified.
- "retarded" in the Introduction is accurate in the technical sense but will be read otherwise. "Slowed" is the obvious substitute.
- "Stasoshi Dex" is declared fictional in a footnote. Decide whether v0.3 names a real venue or removes the reference.
- Section 5 still says the uptime shortfall is "sent to the Network Steward" while payment is now direct from payer to relay. The mechanism for diverting a share depends on B5 and B8.

---

## E. The pilot that answers the most questions

Permissioned, two or three sites with real spare backhaul, dollars not tokens, one Mint, no onion routing, hourly prepaid windows, signed receipts, monthly invoice.

What it answers directly: A5, A6, B1 (pilot form), B2, B3, B4, B8 (pilot form), B9, C4.
What it answers by simulation alongside: A1, A2, A3, A4, B5, B6.
What it defers honestly: A2 (b), B7, B10, C1 (b), C2 (b), C3.

Success looks like: two parties who are not the authors settle a month of real traffic on receipts, dispute at least one receipt, and the dispute resolves from the receipt data alone.
