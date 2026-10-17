# Shopping list: three Raspberry Pi 3 Model B boards to the first three nodes

Starting point: three bare Pi 3 Model B boards. Nothing else. Prices are approximate US retail as of October 2026 and will drift; treat them as a budget, not a quote. Everything here is license-free in the US (FCC Part 15) at 915 MHz for LoRa and 5 GHz for the point-to-point link.

Buy in phases. Phase 0 is enough to start tonight. Phase 1 needs one answer first: can you see the forest spot from the house?

## Phase 0: the lab on your home network (about $75)

| Qty | Item | Why | Approx. |
|---|---|---|---|
| 3 | microSD card, 32 GB, A1 or A2 rated (SanDisk High Endurance or Samsung Evo Select) | OS and ledger. High-endurance cards survive a year of logging; cheap cards don't. | $8 each |
| 3 | 5.1 V 2.5 A micro-USB power supply (official Raspberry Pi 12.5 W, or CanaKit) | A Pi 3 under 2 A reboots at random. This is the most common "software bug" in Pi projects. | $9 each |
| 1 | 5-port gigabit switch | Gives bw-house a second wired port for the radio later, and puts all three Pis on one wire now. Cheaper and simpler than a USB Ethernet adapter. | $15 |
| 4 | Ethernet patch cables, 3 ft | Three Pis plus the uplink to your router. | $3 each |
| 3 | Pi 3 case with heatsinks (optional indoors) | The Pi 3 throttles at 80 °C in a closed box without a heatsink. Skip for the bench, buy before the forest. | $7 each |

**Already have:** a computer with an SD card reader. If not, add a USB-C or USB-A microSD reader, about $8.

## Phase 1: radios (about $250 line of sight, about $300 through trees)

### Control plane, both options

| Qty | Item | Why | Approx. |
|---|---|---|---|
| 3 | Heltec WiFi LoRa 32 V3 **915 MHz** (or LILYGO T-Beam 915 MHz) | LoRa board that plugs into the Pi over USB and runs Meshtastic firmware out of the box. Carries receipts, liveness, and announcements. Buy the 915 MHz variant; 868 and 433 are not legal in the US at useful power. | $25 each |
| 3 | 915 MHz antenna, 3 dBi, SMA, with a short pigtail if the board uses u.FL | The stub antenna in the box is for the desk. Three dBi roughly doubles usable range in trees. | $10 each |
| 3 | USB-A to micro-USB or USB-C data cable, 1 ft (match the board) | Power and serial for the LoRa board. Must be a data cable, not charge-only. | $4 each |

Why USB boards instead of a LoRa HAT: a HAT takes the Pi's GPIO header, which a HaLow HAT also needs. USB boards leave the header free and run proven firmware, so the receipt daemon just talks to a serial port.

### Data plane, option A: line of sight (house can see the forest spot)

| Qty | Item | Why | Approx. |
|---|---|---|---|
| 2 | Ubiquiti LiteBeam 5AC Gen 2 (LBE-5AC-Gen2) | 5 GHz point-to-point pair, tens of Mbps over several km with clear line of sight. Each box includes a PoE injector; the Pi talks to it over Ethernet. | $65 each |
| 1 | Outdoor-rated shielded Ethernet cable, 100 ft, with ends (or a crimp kit) | Pole to Pi. Indoor cable dies outdoors in a season. | $30 |
| 2 | Pole mount or J-mount | One per end. A fence post or eave works if it's solid. | $15 each |

### Data plane, option B: through trees (no line of sight)

| Qty | Item | Why | Approx. |
|---|---|---|---|
| 2 | Wi-Fi HaLow (802.11ah) adapter for Raspberry Pi, e.g. ALFA AHPI7292S HAT, or a HaLow USB adapter if one is in stock | 900 MHz, a few Mbps, and foliage doesn't stop it. The HAT uses the GPIO header, which is why the LoRa board is USB. | $50 each |
| 2 | 900 MHz 5 dBi omni antenna with cable to the HaLow adapter's connector | The HaLow HAT ships with a small antenna meant for a desk. | $20 each |

Option B is less bandwidth and more fiddly. If there is any chance of line of sight, including from a pole or roof, take option A.

## Phase 2: the forest node lives outside (about $230)

| Qty | Item | Why | Approx. |
|---|---|---|---|
| 1 | 30 W 12 V solar panel | A Pi 3 plus LoRa plus radio draws 4 to 6 W around the clock. In Texas sun a 30 W panel covers that with margin for cloudy days. | $45 |
| 1 | 12.8 V LiFePO4 battery, 12 Ah | About 150 Wh, so two to three days of no sun. LiFePO4 over lead-acid: it tolerates heat and partial charge, both of which a forest box gets. | $80 |
| 1 | 10 A PWM solar charge controller with load output | Charges the battery, cuts the load before the battery is damaged. | $15 |
| 1 | 12 V to 5 V 3 A buck converter with micro-USB plug | Powers the Pi from the 12 V bus. Get one rated 3 A; 2 A ones sag under load. | $9 |
| 1 | IP65 or IP67 ABS enclosure, about 11 × 8 × 5 in, hinged with a clear or solid lid | Holds the Pi, LoRa board, buck, and charge controller. The battery can share it or sit in its own box. | $25 |
| 1 | Cable gland assortment, PG7 to PG13 | Every wire through the box wall gets a gland or the box fills with water. | $10 |
| 1 | Outdoor Ethernet cable, 50 ft (if the radio is on a pole away from the box) | Only for option A. | $20 |
| 1 | Silica gel packs, dielectric grease, UV-rated zip ties, outdoor-rated double-sided tape | The boring stuff that decides whether the node is alive in March. | $15 |

Not on the list yet: a second forest box if you want the neighbor's ridge node (Phase 2 of the roadmap) on the same bill. That is one more Pi, one more Phase 2 kit, one more radio pair.

## Totals

| Phase | Approx. |
|---|---|
| 0: lab | $75 |
| 1A: radios, line of sight | $250 |
| 1B: radios, through trees | $300 |
| 2: forest power and weatherproofing | $230 |
| **All three, line of sight** | **about $555** |

## Where to buy

Adafruit, PiShop.us, and CanaKit for Pi accessories; Amazon or Mouser for Heltec and LILYGO; Ubiquiti's own store or B&H for the LiteBeams; ALFA's store for HaLow; any solar or RV supplier for the Phase 2 power parts. Buy the LoRa boards and radios from a seller that lists the frequency variant explicitly.

## What to buy first

Phase 0 only. It's $75, it ships fast, and nothing in Phases 1 or 2 is useful until three Pis are on the network signing receipts. Order Phase 1 once you've decided line of sight versus trees.

## Bought, October 2026

The decision came out as **through trees** (no line of sight from the house to the forest spot), so option B. Two orders, and where they depart from the list above:

| Item | What was bought | Note |
|---|---|---|
| LoRa boards ×3 | LILYGO T-Beam Supreme, 915 MHz, L76K GPS, Meshtastic preloaded, about $55 each | Chosen over the Heltec V3 the list names. Same SX1262 radio and Meshtastic support; the GPS and the 18650 holder are extras the nodes do not use. USB-C. |
| LoRa antennas ×3 | 915 MHz 3 dBi SMA with u.FL pigtails, a 4-pack (one spare) | Matches the T-Beam's u.FL socket. |
| USB cables ×3 | 1 ft USB-A to USB-C data cables, a 5-pack | Must be data cables, not charge-only. |
| Cases ×3 | MakerNova T-Beam Supreme cases, one per node | Arriving Oct 23 to 29. |
| Phase 2 wiring | A 12 V 250 A bus bar and a pair of ground bus bars | For the forest box: panel in, battery, load out, the two 5 V converters. |
| Data plane | Heltec Wi-Fi HaLow dongle pair, AP+STA, 902 to 928 MHz, 27 dBm (V2), $143 the pair | Chosen over the ALFA AHPI7292S HAT, which is not sold on Amazon (Rokland and SparkFun carry it at $70 to $83). An Ethernet bridge pair keeps the Pi's header free and matches the line-of-sight design: the Pi talks to the radio over Ethernet. |
| Outdoor antennas ×2 | Slinkdsco omni 915 MHz LoRa/HaLow antenna, N male, with an IPEX (u.FL) to N-female pigtail, $16.95 each | For the outdoor ends if the dongles' stock whips are not enough; try those first. The pigtail fits a board's u.FL socket. The HaLow dongle's external connector needs an N-female to SMA (or RP-SMA) adapter instead: check which the dongle has before mounting. |
| PoE splitters ×2 | ANVISION gigabit PoE to USB-C, 5 V 2.4 A, 802.3af, a 2-pack, $19.98 | Powers the house-side dongle from a PoE port on the UniFi Switch Ultra 60W (802.3af/at on seven ports); the second is a spare. Never on a passive 24 V injector. |
| Surge protection | CERRXIAN RJ45 surge protector couplers, a 2-pack, $9.99 | At the point the outdoor cable enters the house. It only protects with a path to earth: connect its ground lead, if it has one, to a real ground. |
| Enclosure | LeMotech IP65 ABS junction box, 5.9 × 5.9 × 3.9 in, $16.99 | For the house-side dongle and splitter. ABS barely attenuates 900 MHz, so the stock whip can stand inside it. |
| Bulkhead jacks | LOCHSOEL IP65 right-angle RJ45 panel connectors, two packs of 2 sets, $16.99 each | Ethernet through the box wall instead of a cable gland. |
| Patch cords | Cable Matters shielded Cat 6A patch cords, $9.99 | Short runs at the switch and inside the box. |

Still to buy for the house-side dongle: the outdoor-rated shielded Ethernet run from the switch to where the dongle is mounted (Phase 1A lists 100 ft, about $30), a J-mount or pole mount (high matters more than anything else through trees), UV-rated zip ties and sealing tape. The forest-side dongle takes its 5 V from the Phase 2 battery box's buck converter, so it needs none of the PoE parts.

Not bought and not needed yet: Phase 2 power and enclosure, 18650 cells for the T-Beams.
