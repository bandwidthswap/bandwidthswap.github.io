# Bandwidth Swap, in plain words

**Robert Douglas and Chris Odom**
bandwidthswap@pm.me

Oct 17th 2026
Version 0.6 (draft), plain reading

---

*This is the whitepaper's argument without its machinery, for anyone who wants to know what Bandwidth Swap is and why it is built the way it is. The full paper, with every rule and every number, is at [paper.html](paper.html). If you would run a node, the operators' version at [paper-operators.html](paper-operators.html) is written for you.*

## The problem

Most places have one way to get a connection and one company selling it. The company paid to run the line, so it is in no hurry to let anyone else use it. Prices stay high, and the places where nobody has run a line stay unconnected, because the first line into a valley costs a great deal and earns slowly.

Bandwidth Swap treats a connection as something anyone can resell, one hop at a time. If you have a line and your neighbor on the ridge does not, you can sell them a share of yours over a radio. If the forest beyond the ridge has no connection at all, the neighbor can sell on to it. Everyone who carries the traffic is paid for carrying it. The question is how to pay people for carrying bytes without being cheated, and that question has a history.

## The idea that did not work

The first version of this paper, in 2021, proposed that every node in the network announce how much of the time it was online and how fast its connection was, and be rewarded for it. That is how several networks of this kind have been built, and it has the same flaw in all of them. A node can say anything. A network that pays for reports gets a network of excellent reporters, with a radio in a closet behind each one.

## The idea that does

The 2026 version pays for exactly one thing: bytes that someone paid for and signed for. The person who paid is the only party who cannot be fooled about whether the bytes arrived, so their signature is the proof.

Here is how it works in the lab that runs today. Every hour, the computer that is paying reads how many bytes went through its connection and signs a short note saying so. The computer that carried the bytes checks the signature and signs the same note with its own count. Both notes go to a bookkeeper, which writes the hour down and, at the end of the month, adds up the bill. Nobody measures anything. Nobody has to trust anyone. The paper's phrase for this is that the payment is the proof.

A note like that is about a hundred bytes, which is small enough to send over a radio that reaches for miles at the speed of a dial-up modem. That matters, because it means the notes keep moving when the internet does not.

## Four rules

Everything else in the paper exists to make faking that one note cost more than it pays.

**Payment is the proof.** Only the party who paid can sign for delivery. A carrier cannot write itself a receipt.

**Nothing earns more than the fee that produced it.** Five percent of every fee goes to the Network Steward, which is not a committee but a rule, and the rule can hand a payer back at most half of what it took. If you run both ends of a connection and send traffic to yourself all day, you lose at least two and a half cents of every dollar you pay yourself, and no rule anywhere pays you more than a dollar back.

**The Steward can only post bounties.** Most networks like this hand out bonuses for building, and the bonuses are where the radio in the closet comes back. This one gives the five percent to a Steward that cannot decide anything. It can only post prepaid offers to buy bandwidth, and only in three ways. It adds to bounties that people have posted themselves. Wherever a link is the only way across a gap, it offers the fees that link collected to whoever builds a second path through a different place on the map. And it keeps a standing offer open for the first link to any mapped place that has none. It never pays for being online, and nobody can take its money except by delivering bandwidth where it wants some.

**Quality is priced, not proven.** A slow carrier settles fewer bytes an hour and earns less. Nobody has to measure its speed; the market does.

## When two counts disagree

Sometimes the payer's count and the carrier's count differ. The rule is to pay the smaller one. Each side can only lower the number the other side gets. The carrier gains nothing by it. The payer could shave a little off, and the carrier's answer is a shopkeeper's: price for it, and stop serving a customer who does it too often. What arrives is what is paid for. What the carrier sent and the road lost is the carrier's cost, like freight. There is no judge, no hearing, and no third party who has to be reachable. A disagreement between a computer on Earth and one on Mars was settled the moment both signatures existed.

## What a bookkeeper is

The paper calls it a Mint, and it is a bookkeeper, not a judge. It holds a deposit from each member, writes down what was settled, and publishes a summary that anyone holding a receipt can check their receipt against. If the summary leaves a receipt out or changes it, the receipt proves it, and the bookkeeper loses more of its deposit than it earned for the summary. Everyone keeps their own signed copies, so a bookkeeper's books can be rebuilt without the bookkeeper. In the lab there is one bookkeeper and its deposit is its reputation; a member who catches it out leaves with the proof.

## What the lab showed

Since October 16, 2026, three small computers on a bench have run this: one that pays, one that carries, one that keeps the books. Since October 18 a fourth sits at a neighbor's house on the neighbor's own internet, selling it to the house an hour at a time. On the first day three disagreements were forced on purpose. When the carrier's count was reset so it claimed almost nothing, the hour settled at almost nothing. When the payer's count was reset so the carrier claimed twenty-two megabytes against the payer's 272 bytes, the carrier was paid for 272 bytes. When the carrier's clock was pushed ten seconds out of step, it refused the payer's note and the hour went unpaid. In every case the books were settled from the two signatures alone.

That is not a network. It is one person running four machines, one of them in someone else's house, that are not trusted to agree, and showing that they settle anyway. The first hour across the neighbor's link settled with the two counts a tenth apart, which is what the road lost on the way, and the paper now lets each link say how far apart two honest counts may be. It is the part a paper cannot show on paper.

## Across a valley, across a planet, across the dark

The same note works on a cable, on a radio through trees, on a link to the Moon or to Mars. What changes is the numbers: how long an hour is, how far two clocks may drift, and how long someone waits to be paid.

Waiting has a price, and the paper now says so. Whoever moves first across a delay is lending for the length of it, and on a long link the carrier posts a price for the wait beside its price per byte. A carrier that holds your data between two passes of an orbiter signs for what it holds, so a lost bundle is a loss on paper. And if a pass never comes, you get your prepayment back; the carrier priced that risk into the passes that did come, the way sailors' lenders once priced the ships that never came home into the rate on the ones that did.

Between worlds, nobody can fine a bookkeeper that cheats, because nobody can reach its deposit. What the others can do is publish the proof, stop dealing with it, and penalize anyone on their side who keeps dealing with it. That is how trade between strangers was policed for centuries before there were courts, and the paper names it as the rule.

There is a limit, and the paper names that too. When no reply can come back while the payer is still there to receive it, the payment stops being proof and becomes a gift. The Moon, Mars and the nearest star are inside that limit for a person who can wait. Past it, the protocol still pays carriers honestly, link by link, but it is paying for carriage toward silence, and the paper says so rather than pretending otherwise.

## What nobody knows yet

The paper keeps its own list of what it cannot settle. The biggest item is the bounty. With the Steward's match capped below the five percent it takes, and its other offers sized by what a sole link already earns, nobody knows whether that moves anyone to string a radio across a valley. The second is the customer: the lab's use case is two sites that already overbuy capacity, and whether anyone picks this over a carrier contract or a satellite is a question only paying traffic answers. The rest, from how two bookkeepers on different worlds trade notes to how long a signature stays believable, are listed with the same honesty.

## Where to go next

The full paper is at [paper.html](paper.html); its Section 3 is the argument that a payment is a proof. The list of open questions is at [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). The lab's live state is on the [project page](../#lab), and the code that runs it is at [github.com/bandwidthswap/kit](https://github.com/bandwidthswap/kit). If you have a Raspberry Pi and a line of sight to somewhere that has no connection, the operators' version is next.
