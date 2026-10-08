# Bandwidth Swap: A Peer-to-Peer Bandwidth Exchange

**Robert Douglas and Chris Odom**
bandwidthswap@pm.me

Oct 8th 2026
Version 0.2 (draft)
admin@bandwidthswap.com

*Version 0.2 replaces the self-reported announcement model of version 0.1 with a receipt-based proof of bandwidth in which a settled payment is the proof of delivery. Sections 2 through 6 are revised accordingly; Section 3 is new.*

---

**Abstract.** *A marketplace measured in available bandwidth has the possibility of identifying each pipe's market price. When pipe value can be accurately determined, and the marketplace is decentralized with a low barrier to entry, growth and development of infrastructure has the capability to be optimized by the "invisible hand," promoting robustness and consumer needs above all else. We propose improving the growth and development of communication infrastructure through peer-to-peer networks enforced by blockchain technology, directly associating incentives for hosts to build and maintain infrastructure, with the speed, reliability, and uptime interests of the user.*

*Proof-of-bandwidth is not an attestation that a host makes about itself. It is the settled payment of a user who received the bytes. Every hop in a route is paid per unit of data through a conditional payment that unlocks only when the next hop acknowledges delivery, so the only party who can create a proof is the party who cannot be fooled about whether the data arrived.*

*The network distributes rewards to relays in the network in proportion to the receipts they have settled, weighted by hop difficulty. Each relay's difficulty, determining their transfer fee reward, is calculated by the opportunity cost of an alternative route around that relay, and that opportunity cost is computed from the graph of paid routes rather than from any claim a relay makes.*

*Because rewards flow only from fees, generating traffic to oneself costs more than it earns. These human operator incentives encourage the construction of redundant and robust networks without rewarding the appearance of a network.*

## 1. Introduction

Communications infrastructure growth has been historically retarded by monopolies and exclusion contracts designed to restrict users' optionality such that a user is more likely to be a long-term customer of an ISP service, since ISPs pay a high initial capital expenditure to install in each area. This model protects companies' cash flow, but allows conditions that impede competition and does not promote the lowest price for the user, nor encourage innovation. Existing lines can be used for further redistribution rather than as endpoints,[^i] and many jurisdictions have already provided the legal ease to encourage just this.[^ii]

We propose a fundamental improvement to this supplier-consumer relationship by offering a peer-to-peer network where bandwidth is the product. A blockchain intermediary has the possibility to facilitate rewards and punish poor behavior by making it expensive for a bad actor to lie. When rewards are issued by enabling a customer relay and endpoint service, and there is a bonded barrier of entry to collect those rewards, only decentralized autonomous software is needed to govern the network.

A network capable of rapid growth--one that incentivizes communication innovation--may be the best network for surviving a Carrington event, and offers improved support to industrial, scientific, and medical communications.

## 2. Blockchain

The $BANDWIDTH blockchain is designed to offer users autonomy while incentivizing operators at any scale. Built around Ethereum's blockchain and through its ERC-20 token protocol; with Open-Transactions it is designed to offer off-chain settlement for little or no fees, and complex financial instruments[^iii] so a first of its kind derivative marketplace may be available on launch to promote community scaling.

The $BANDWIDTH token is the unit in which receipts are denominated and settled. It is fungible across multiple market makers with different price settlement techniques such as Curve, Balancer, or Uniswap.

Receipts and per-hop payments are off-chain. Only three things touch the chain: the opening and closing of payment channels, the settlement summaries that Mints aggregate, and the slashing of bonds. This keeps the chain small enough that per-packet accounting never competes for block space.

Proof-of-bandwidth is defined in Section 3. In short: a relay is paid for the bytes a user signed for, and a relay is rewarded in proportion to what it was paid.

## 3. Proof of Bandwidth

"Proof" in a bandwidth network has to answer three separate questions, and a design that answers only one of them will be gamed on the other two.

1. **Delivery.** Did the bytes move?
2. **Demand.** Did someone real want them, or did the relay send them to itself?
3. **Quality.** Did they move at the speed and latency that was claimed?

Version 0.1 of this paper answered none of these. A node reported its own uptime and available bandwidth once a minute and a Mint recorded the report. This section replaces that model.

### 3.1 Receipts

The unit of proof is a receipt. For each payment window, the sender commits to a Merkle root over the chunks of the payload. Each hop that carries the payload signs a receipt containing:

- the sender's and the hop's Bandwidth-IDs (Open-Transactions NYMs),
- the Merkle root of the chunks carried,
- the byte count,
- the hop's index in the route,
- the sender's timestamps for the first and last chunk of the window, and
- the signature of the previous hop's receipt, forming a chain.

The recipient's signature closes the chain. A relay cannot forge a receipt because every receipt requires the payer's key, and a relay cannot inflate a receipt because the byte count is bound to a Merkle root the payer committed to.

### 3.2 Payment is the proof

The only party who cannot be fooled about whether bytes arrived is the party who was waiting for them. We therefore make the user's payment the proof of delivery.

Every hop is paid per unit of data through a conditional payment. The payment to hop *n* unlocks only when hop *n+1* acknowledges receipt, in the manner of a hash-time-locked contract across an onion route. A relay that accepts a payload and does not forward it is never paid for it. A relay that forwards it is paid whether or not any validator ever looks at the transfer.

A settled payment is therefore a proof of delivery that required no probing, no attestation, and no trusted hardware. Delivery (question 1) collapses into demand (question 2).

### 3.3 The Sybil condition

If the only way to earn is to collect fees from a payer, then sending traffic to yourself costs the protocol fee and earns nothing. Wash traffic is net negative. This is the entire defense against Sybil relays, and it is the same reason routing networks built on conditional payment do not need a separate proof of relay.

The defense holds under one condition: **no reward may exceed the fee that produced it.** The moment the network pays a relay more for carrying a byte than the byte cost to generate, self-dealing becomes profitable and the network fills with relays carrying traffic to themselves. This condition governs every subsidy in Sections 5 and 7.

- Block rewards are never issued for availability, uptime, or capacity alone.
- The Network Steward's route bonuses are issued only as a match against fees already settled, from payers whose identities are bonded and aged, and never above a published multiple of those fees.
- Route-map weight is denominated in fees paid, so inflating the map costs exactly what it would cost to buy the bandwidth.

### 3.4 Quality is priced, not proven

A relay that is slow produces fewer settled bytes per payment window than a relay that is fast, and earns less. The market prices speed without the protocol having to prove it. Users choose routes from the receipt graph using the throughput that previous payers actually settled, not the throughput a relay advertises.

A cryptographic speed proof is required only where a subsidy is at stake, because a subsidy is the one place a relay could profit from a false claim. For that tier, a payer may produce a client-side attestation of what it received and when, in the manner of TLS notarization, so that the measuring party is the one who was waiting for the bytes. This attestation is optional for ordinary traffic and mandatory for traffic that claims a route bonus.

### 3.5 Clocks

The payer's clock is authoritative, because the payer is the one paying. Timestamps in a receipt are the payer's. A relay may decline to serve a payer whose clock drifts beyond a published tolerance, and a Mint may discard receipts whose timestamps are inconsistent with the chain of hops.

### 3.6 Residual attacks

- **Refusal to forward after accepting.** Handled by conditional payment: the hop is never paid for what it did not forward.
- **A last hop that will not acknowledge.** Only possible when payer and recipient are different parties with no relationship. Endpoint services, where the payer is also the recipient, do not have this problem. Relay services to a third party require the recipient to be a registered NYM with its own bond, and a recipient that fails to acknowledge delivered chunks is slashed.
- **Route inflation.** A relay that wants to appear in more paths must pay for the traffic that puts it there. Because map weight is denominated in fees, this is not an attack; it is a purchase.
- **Collusion between a payer and a relay to claim a route bonus.** Bounded by the subsidy multiple, the payer bond age, and the attestation requirement in Section 3.4.

### 3.7 Alternatives considered

- **Validator probing.** Mints push random payloads through relays and time them. Relays learn to recognize probe traffic and prioritize it, one pipe can masquerade as many nodes, and probes measure a relay's behavior toward validators rather than toward users. Rejected.
- **Hardware attestation.** A trusted execution environment on the router counts bytes and signs. Sound, but it moves trust to a chip vendor and prices out small operators. Acceptable for a permissioned pilot, not for the open network.
- **Signature-chain receipts alone.** Prove delivery but not demand, since every signer may be the same operator. Retained as the receipt format in Section 3.1, but only because payment makes the chain costly to fake.

## 4. Minting (Validator)

In Bitcoin, miners solve a cryptographic puzzle, with the first one to do so receiving that block's reward, encouraging people to pool their computing resources, spreading the reward across those who contributed. This promotes a form of centralization[^RD1] in mining pools.

To discourage burdening service operators as well as to encourage integrity and distribution of the data load, we propose two layers of operator infrastructure to support the user-operator-blockchain incentivization cycle. Bandwidth Miners, who facilitate user interactions measured in the $BANDWIDTH token, are paid by users through receipts (Section 3). $BANDWIDTH Mints, who stake a large number of their own assets, aggregate those settled receipts, adjudicate disputes over them, hold the bonds of Miners and payers, and publish settlement summaries and the receipt graph to the $BANDWIDTH blockchain, receiving a reward for the act.

Mints do not decide whether bandwidth was delivered. That question is settled by payment before a Mint ever sees the receipt. A Mint's work is bookkeeping and enforcement, which is why it can be done for little computational energy.

User software queries for available routes, seeking the receipt graph that's aggregated by Mints, significantly reducing the cost of route calculation for users. ...and unburdening them from the ability to discriminate.

- How Miners are compensated for provided transport: by the payer, per hop, per unit, at settlement.
- How Mints are compensated for aggregating receipt data: by a share of the settlement fee on the receipts they publish.

Mints who have staked a large number of assets are compensated by the blockchain through an election process promoting those who have staked more. Every minute, for every block, one Mint is randomly chosen, based on the likelihood of how much they have staked, to validate the next block. This replaces the concept of traditional miners, with validators who, instead of mining a new block, mint new blocks for little computational energy. Should a validator mint a fraudulent block, they will forfeit a greater number of assets staked by them than the validation fee they received. Should a validator want their staked assets back, they can after a time greater than is needed to verify they have not previously minted a fraudulent block. The current minimum criteria for being chosen is 1/10,000 of all assets in circulation being staked, and a minimum of 10 Mb/s of bandwidth.

If the three largest Bitcoin mining pools were to come together they would control more than 51% of the computational power, allowing them certain attacks on future transactions. In comparison, the proof-of-bandwidth protocol promotes a low hardware barrier to entry, encouraging more independent validators, making the network more decentralized and more secure.

To discourage monetary centralization, the age of staked assets is a factor in the selection of validators.

To further reduce the risk of a validator not doing their job, the proof-of-bandwidth algorithm takes five stakers on every block and seeks a minimum of three-out-of-five consensus, reducing the damage caused by a validator not doing their job, and punishing that validator by announcing their address to the blockchain. If their consensus is incomplete, including if the validator is offline, the inconsistent validator gets none of the mined block rewards.

These validators we intend to call Mints, who stake a large number of assets, enabling them to mint new blocks for rewards. Because rewards to Miners flow from receipts and not from block issuance, a Mint's block reward is its own; it is not a pool of new money to be distributed to Miners.

## 5. Mining (Hosts)[^RD2]

Miners fulfill the needs of users in the form of Relay or Endpoint services, spending computational energy and bandwidth to facilitate the data requested by users and collecting receipts from those users for payment.

> **Endpoint services** allow a user to query a known location, and extract information regardless if it is identifiable files by hash or a Web2.0 DataStream. This interaction is similar to a user's relationship with VPNs or Usenet. The payer and the recipient are the same party, so the receipt chain closes with the payer's own signature.
>
> **Relay services** allow users to query an unknown location and have their information securely passed to another relay or endpoint where only the edge devices are known by the user. A relay's minimum price and its minimum transaction fee are determined by the total cost of an approved transaction's routing difficulty, a variable that can be set by a user. The recipient must be a bonded NYM that acknowledges delivery (Section 3.6).

Route subsidy bonuses will be decided by the Network Steward, a DAO designed to receive 10% of every new block reward, decreasing every year by 1% until this project is 9 years old where it'll maintain to help provide the infrastructure for all to become connected. These subsidy bonuses will be offered by the Network Steward defining a clear start point and endpoint. A bonus is paid only as a match against receipts already settled on that path, from payers whose bonds are older than the bonus program, and never above the published multiple (Section 3.3). Nodes on the path are compensated by measuring their opportunity cost against the total path, where opportunity cost is computed from the receipt graph: the fewer paid, disjoint paths that reach the endpoint without a node, the greater that node's share.

A node that has five other acceptable intermediaries in a possible chain will receive 1/5th of that location's reward (example step 1), while a single node connecting a bridge will receive the full reward (example step 4) in maintaining a chain. Route subsidy rewards will be defined by the DAO. Traffic that claims a bonus must carry the client-side attestation described in Section 3.4.

Miners, like Mints, must stake a small portion of assets on the Bandwidth blockchain for a Mint to provision it an Open Transactions NYM (similar to a registration number, but semi-anonymous) that it may broadcast in its header so other devices can know to securely connect to it.[^RD3] Currently, the minimum is computed by taking $10 USD and measuring against the price of bandwidth on the Stasoshi Dex.[^RD4]

An uptime penalty will tarnish a node's ability to earn by deferring that amount to the Network Steward who is responsible for encouraging growth and development of the network. The uptime penalty is measured in seconds of a week with (number of seconds active) / 604,800 (the total number of seconds in a week) defining the reward that an operator may receive from a user while the difference is sent to the Network Steward. "Active" means the node appears in at least one settled receipt or answers a Mint's liveness check during that second; it is not self-reported. This allows the system to operate normally once a node is turned on, while punishing nodes that turn on just for bonuses and during rate spikes, encouraging a long-life and stable network.

## 6. Announcements[^RD5]

Announcements exist for route discovery. They carry no reward weight. Nothing in an announcement is trusted for payment, subsidy, or uptime; those are determined by receipts.

Miners such as relays and endpoints in a pool of other connected devices announce to a Mint once per minute a 62 byte message containing a string of: (1) their Bandwidth-ID, set by the Open-Transactions NYM (2) their offered difficulty, or the minimum transaction amount they're willing to pass on a message for; (3) their uninterrupted uptime, or how many seconds of all the seconds the device has been active has it been able to talk to a Mint; (4) the node's maximum available bandwidth pressure whenever its operator allows a sync-test to run; and (5) the active votes cast by the miner for or against the publicly available Network Steward.

**[Figure 1]**

```
(00040,000000,1630261675,1630264675,0000000034,0000000037,0000)
  1      2        3          3           4          4       5
```

**[Figure 2] Receipt**

```
(payer NYM, hop NYM, hop index, merkle root, bytes, t_first, t_last, prev receipt sig) signed by payer
```

Fields (3) and (4) of the announcement are advisory. A user's software compares them against the settled throughput in the receipt graph, and a node whose announcements persistently exceed its receipts is ranked below nodes whose announcements match.

This allows the minimum necessary information to be written to the blockchain immutably, while allowing auxiliary services to find and predict the best routes given a user's search criteria, such as uptime or speed, independently reporting the location of the previously registered nodes.

Interestingly, Open-Transactions' features of claims and notaries allow a layer two label and verification of a particular node's specific location or trustee should a specific person or group want to announce a claim.

Should an operator see a direct connection to another node greater than can be reached by direct relay, or not currently accepting lookup, its Open-Transactions NYM lookup code could be offered by the owner over a third-party service such that two connections can be specifically linked on this protocol without outside interference.

Sync-tests are a protocol enforced measurement that is run whenever a Miner establishes, or re-establishes, a connection to a Mint reporting other connected devices broadcasting the $BANDWIDTH header, and maximum throughput that node is able to offer to the network. A sync-test informs route discovery only; it never produces a receipt and never earns a reward.

## 7. Network Steward[^RD6]

The Network Steward, a DAO,[^RD7] is purposed to seed projects without bias and in such a way it promotes healthy competition to grow the $BANDWIDTH ecosystem. Its goal is to promote competition to keep prices the most competitive for users. The DAO will attempt to encourage a high rate of innovation[^RD8] across all market segments that use the $BANDWIDTH protocol.

The Steward never issues a reward for availability, uptime, or capacity alone. Every Steward disbursement to an operator is a match against fees that a bonded payer has already settled, subject to the multiple in Section 3.3.

All proceeds received and spent by the DAO will be reported in the form of annual statements as it will be held to the standard set by Wyoming in the Decentralized Autonomous Organizations Supplement. Tokens unspent after 90 calendar days will be burned and reported to the network. Voting is performed by "marking" a Miner output with specific vote data. Each Miner votes through a Mint. These votes may be proposed by anyone and specifically address the membership, leadership, goals, and spends of the registered Wyoming DAO representing $BANDWIDTH.

## 8. Governance

As this system's deployment takes up physical space unlike software where the space is undefined, it is important that one individual's preferences do not risk injuring or inappropriately change others ability to act in areas they do not affect. Thanks to special tests conducted by RUNE, PBC in 2018, at the time the active developer of Open-Transactions, initial prototypes of location-based notary services that interfaced trustlessly via the BIP-47 payment privacy protocol, confirm the ability to associate one's vote with a physical location, without double voting. This combination of notary services, BIP47, and an alternative use of Chaumian Cash, can guarantee that in governance voting one's ballot is both all they receive, blind, and can only be cast once.

This proposed notarizing of ballots available, and specifying of location cast, becomes much more valuable when combined with proof of stake behaviors, that limit whale overruling. We propose protecting the ideas of the community by setting strong limits on the right to vote, such as:

1. Minimum use restrictions since the last polling period;[^1] such that one must have spent a minimum amount of $BANDWIDTH in the ecosystem or operate a minimum number of $BANDWIDTH producing Nodes.

2. Minimum time restrictions since account creation; such that rash, emotional, or undeveloped requests are encouraged to be rejected.

3. Anti-private interest restrictions; deployed by logarithmically associating the staking of 1 $BANDWIDTH as one vote, 10 $BANDWIDTH as 2 votes, 100 $BANDWIDTH as 4 votes and 1000 $BANDWIDTH as 5 votes into continuum.

These restrictions have the capacity to protect the ideas of the community while awarding those with more significant capital interest tools for communication and identification without having dictatorial control of any particular vote.

These voting capabilities have been previously developed by Voting Matters, a wholly owned subsidiary of MatterFi, the current developers of Open-Transactions. When KYC is capable of restricting whales, consolidated private interests are less likely to win.

---

## Footnotes

[^1]: Possible with Pseudonyms through Open Transactions and OBPP-05 (https://github.com/OpenBitcoinPrivacyProject/rfc/blob/master/obpp-05.mediawiki)

[^i]: https://en.wikipedia.org/wiki/Local-loop_unbundling#United_States

[^ii]: https://web.archive.org/web/20081202153609/http://www.ictregulationtoolkit.org//en/Document.2904.pdf

[^iii]: http://opentransactions.org/wiki/index.php?title=About

## Author's draft comments

*The original document carried eight inline reviewer comments (RD1 through RD8). They are preserved here as footnotes.*

[^RD1]: those with more powerful equipment, the higher your hash rate, the greater the chance you'll have to mine the next block and receive the block reward. To increase these chances further miners can come together in pools to combine their computing power and distribute their rewards evenly

[^RD2]: Unlike the Mints of $BANDWIDTH, risking their assets in exchange to help be the Oracle of consensus that rewards operators fulfilling the needs of users, Miners.

[^RD3]: Perhaps this should be offered by Notary services instead…

[^RD4]: This is a fictional DEX that will be the first to maintain the exchange of $BANDWIDTH (to determine a spot price)

[^RD5]: Should an outside party querying the node choose to request **complete status**, the node would report back, the names of other connected nodes, the route bonus currently being collected if a route bonus is available to them.

    Should an operator allow others, or choose themselves to run a **sync test** (which can be programmatically set at a fixed price for a user to run only if other users are able to see the last time the test was initiated when they query a node) the Relay or Endpoint will scan its network hardpoints for all other devices that are broadcasting the $BANDWIDTH prefix and offer to share their distributed hash table of connected devices with the $BANDWIDTH prefix allowing a device to query up the number of layers to other devices it sees fit, currently this variable is three. The most likely use case is when a user establishes a connection it takes a known route, and asks all nodes in the route to perform a sync such that if a less expensive route is available, with a higher or lower millisecond delay.

[^RD6]: Thanks to Advocate Kathrine Long and Wyoming Governor Mark Gordon, Wyoming is the first state in America to recognize a DAO LLC and based on the Decentralized Autonomous Organizations Supplement (DAO Supplement), a bill passed by Wyoming's state senate on March 17th of 2021, there is enough clarity of the legal status of the decentralized autonomous organization (DAO) for operators to construct and rely on them even though the entity has not yet been contemplated by federal or state legislatures.

    Historically one would construct a semi-autonomous entity by initiating a PBC (Public Benefit Company) that would allow the entity to specify a public benefit above the fiduciary requirements of a director to its shareholders, followed by BI laws that force human turn over greater than the risk rate of collusion.

    Wyoming's new acceptance and guidance protects DAOs from being sued as general partnerships but also solidifies the rights of DAOs as legal persons. The registered name will include "DAO," "LAO," or "DAO LLC.", and within the Articles of Organization include a "Notice of Restrictions on Duties and Transfers," stating that the DAO Supplement, underlying smart contracts, articles, and operating agreement, if applicable, of a DAO may define, reduce, or eliminate fiduciary duties and may restrict the transfer of ownership interests, withdrawal or resignation from the DAO, return of capital contributions, and dissolution of the DAO. The Articles may define the DAO as either member-managed or algorithmically managed (only legally formable if the underlying smart contracts can be updated, modified, or otherwise upgraded). These Articles must be amended when the DAO's smart contracts have been updated or changed. In Wyoming a DAO LLC does not allow a member to have the organization dissolved for failure to return the member's contribution of capital, and unless otherwise provided for in the articles, smart contracts, or operating agreement, a withdrawn member forfeits all membership interests in the DAO, including any governance or economic rights.

    This new doctrine is likely to yield rulings in the case of contested liability from creditors, challenged through the court system, although case law has yet to color in what favor a Judge may lean. Acceptance of the Network Steward as a DAO by the Wyoming courts enables the DAO to use fiat banking for the distribution of rewards and traditional Internal Revenue Service structured 1099 relationships for the distribution of non-token rewards. Given the governance characteristics of this token, as it relates to pool operators and supply held, non token distributions will allow many freedoms normally prohibited in undefined prosecution of token-reward marketplace as the securities and exchange act of 1933 has not yet been adopted to the cryptocurrency space.

[^RD7]: Block rewards undergo a recurring decimation, whereby distributions reduce by 10% every 100 days. Each decimation ensures a smooth issuance decay.

[^RD8]: of each finger of its determined products by following the same model. 1) Prove prototype and customer acceptance. 2) Grow to critical mass that the customer lifecycle can be defined. 3) Open source all materials and tools that will allow other companies to compete. 4) Transfer assets to an SPV known as Company one and offer incentives for liabilities and talent to join company one. 5) Offer seed funding for two other companies to be started to fulfill the product need. This model was well executed prior in the creation of three state-owned, yet competing, Chinese airlines whose case studies can be confirmed.
