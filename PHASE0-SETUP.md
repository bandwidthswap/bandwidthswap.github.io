# Phase 0 setup: from three bare Pi 3 B boards to three nodes on the LAN

This is the handoff for whoever flashes the cards and whichever agent session picks up after. Written Monday, October 12, 2026; checked again Friday, October 16, see the last bullet under "Where things stand". The cards are expected Thursday or Friday, October 15 or 16. Read `CLAUDE.md` first for what the project is; this file is only the "what do I do now" for Phase 0.

## Where things stand

- Three Raspberry Pi 3 Model B boards, bare, powered off, on the desk. They have been plugged into the home network and powered once; nothing booted because there were no SD cards.
- Three microSD cards are on order (32 GB, A1 or A2 rated, per `SHOPPING-LIST.md` Phase 0). Power supplies: use 2.5 A ones. A phone charger under 2 A makes a Pi 3 reboot at random and looks exactly like a software bug.
- No code exists yet for the receipt daemon or the Mint. That is the next session's job, after the Pis are reachable.
- The work machine is the author's Apple-silicon Mac (hostname-independent; the relevant state is listed under "What is already on the Mac"). It has several macOS accounts, and on October 16 none of that state was found in the `Grace` account; see "Check that the key exists" below.
- Checked October 16 from the `Grace` account: none of the three hostnames answered on the LAN (the Mac was on 192.168.0.x, as on October 12) and no Pi MAC was in the ARP table, so no card had been flashed and booted. Nothing under "What the next agent session does" has started. Whether the cards have arrived is not recorded here.

## What is already on the Mac

Set up on October 12 under some other account, and again on October 16 in the `Grace` account, which is where all of it is now.

| Thing | Where | Why |
|---|---|---|
| SSH key for the Pis | `~/.ssh/bandwidthswap_ed25519` (private) and `~/.ssh/bandwidthswap_ed25519.pub` (public), comment `bandwidthswap-pis-grace`, no passphrase, made October 16 in the `Grace` account | So an agent can SSH into the nodes non-interactively. The public line goes into every card at flash time. |
| SSH config block | `~/.ssh/config`, the block headed `# bandwidthswap pis (phase 0 lab)` | `ssh bw-house`, `ssh bw-forest`, `ssh bw-mint` resolve to `<name>.local`, user `bw`, that key. |
| Cloned repo | `~/Documents/GitHub/bandwidthswap.github.io` | This repo. `tools/build.sh` runs clean there (pandoc 3.6.4 and python3 are installed). |

**The key is the `Grace` account's, made October 16.** The October 12 session ran as some other account on this Mac (it has several; `robertdouglas` is one) or never made its key: on the morning of October 16 the `Grace` account had no `~/.ssh` at all. That afternoon a new key was made there (`ssh-keygen -t ed25519 -f ~/.ssh/bandwidthswap_ed25519 -N "" -C bandwidthswap-pis-grace`, fingerprint `SHA256:Hy16u0AB6IJXDqwqMRsQ8q0IjVWR5Hua8+RMq3HBQ64`) with the config block, and its public line is the one printed below. The October 12 line (comment `bandwidthswap-pis`) is retired: no private key for it was ever found, so a card flashed with it cannot be reached from here. `ls ~/.ssh/bandwidthswap_ed25519*` still tells you whether you are in the right account. `tools/build.sh` runs clean in Grace's clone (pandoc 3.6.4, Python 3.13).

The Raspberry Pi Imager v2.0.12 is in `~/Applications` of the `Grace` account since October 16, installed by download (Homebrew on this Mac is broken: an Intel-prefix install under `/usr/local`, owned by `robertdouglas`, running under Rosetta), and has the Lite 64-bit image cached. Writing a card needs an administrator's name and password in the Imager's prompt, and `Grace` is not an administrator: use the `robertdouglas` account's. The Imager's `--cli` mode is no shortcut, since it needs root and takes only cloud-init files for the settings.

**If a different person on a different machine does the flashing**, they need their own key. Make one with `ssh-keygen -t ed25519 -f ~/.ssh/bandwidthswap_ed25519 -N ""` and paste BOTH public keys into the Imager's authorized-keys box, one per line, so both machines can reach the nodes. The Mac's public key (the `Grace` account's) is:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINDFPITNoFgV/4TU9lDvdyRmeO9eOuuDfx3B07LuTyLB bandwidthswap-pis-grace
```

## Flashing the three cards (about 5 minutes per card)

The decisions are already made. Do not improvise hostnames or usernames; the SSH config, this file and the next session's scripts all assume these.

| Card | Hostname | Role | Where it plugs in |
|---|---|---|---|
| 1 | `bw-house` | gateway and payer, the time source for the other two | wired to the router or switch |
| 2 | `bw-forest` | relay, future hotspot, far end of the WireGuard tunnel | wired, same switch for now |
| 3 | `bw-mint` | receipt aggregator and ledger | wired, same switch |

Username on all three: `bw`. Password: whoever flashes picks one and keeps it; nothing in the project needs it, SSH is by key.

Per card:

1. microSD into its full-size adapter, into the Mac's built-in SD slot (or any reader).
2. Open Raspberry Pi Imager. **Choose Device**: Raspberry Pi 3. **Choose OS**: Raspberry Pi OS (other), then **Raspberry Pi OS Lite (64-bit)**. Not Desktop. **Choose Storage**: the card; check the size is the card's so an external drive is never picked.
3. **Next**, then **Edit Settings**:
   - **General**: hostname from the table above. Username `bw`, the chosen password. Wi-Fi: leave off, the nodes are wired. Locale: timezone `America/Chicago`, keyboard `us`.
   - **Services**: Enable SSH. Choose **Allow public-key authentication only**. Paste the public key(s) above into the authorized keys box.
   - **Options**: leave as is.
4. **Save**, **Yes** to apply the settings, **Yes** to erase the card. Write and verify take 3 to 5 minutes. Eject when told.
5. Card into a Pi, Ethernet into the switch, power with a 2.5 A supply. First boot expands the card and reboots once; wait about 90 seconds.

The Imager remembers the last settings, so cards 2 and 3 only need the hostname changed.

## Checking they are up

From the Mac:

```
ssh bw-house
ssh bw-forest
ssh bw-mint
```

Each should land on a shell with no password prompt. If a `.local` name does not resolve: the router's device list shows the new addresses, and a Pi 3 B's MAC address starts with `b8:27:eb`. `ssh bw@<address>` works meanwhile.

The site's "Boot and find them" section shows `ssh pi@bw-house.local` as a generic example. The lab's username is `bw`.

## What the next agent session does (Phase 0 proper)

Start a session in `~/Documents/GitHub/bandwidthswap.github.io` and say the Pis are up. The session has `CLAUDE.md` and this file. Its work, in order, all over SSH:

1. **Update and reboot** each node: `sudo apt update && sudo apt full-upgrade -y && sudo reboot`.
2. **Time.** `chrony` on all three. `bw-house` syncs to the internet pool; `bw-forest` and `bw-mint` use `bw-house` as their only source (`server bw-house.local iburst`), and `bw-house` serves the LAN (`allow 192.168.0.0/24`, or whatever the home subnet is; the Mac was on 192.168.0.x on October 12). The protocol's clock tolerance is 5 seconds; a relay declines payers outside it. Verify with `chronyc tracking` on each.
3. **WireGuard.** One tunnel, `bw-house` to `bw-forest`, `wg0`, a /30 or /24 of private addresses, keys generated on each node with `wg genkey`. On the home LAN it adds nothing, but it is the exact configuration the radio link will use in Phase 1. Verify with `wg show` and a ping across the tunnel. The receipt daemon reads this interface's byte counters.
4. **Logs to RAM.** `log2ram`, or `Storage=volatile` in `/etc/systemd/journald.conf`, on all three, so the SD cards survive a year of hourly logging.
5. **The receipt daemon and the Mint.** The first real code. Per `CLAUDE.md`, it lives in a NEW repo, `bandwidthswap/kit` (create it under the `bandwidthswap` org; the author's account `realrobertdouglas` is org admin). When it exists, link it from the "Get involved" section of `index.html` here. Spec from the paper and the site:
   - A service on `bw-house` and `bw-forest`. Every hour it reads the `wg0` byte counters, builds the receipt from Figure 2 of `paper/BANDWIDTH-whitepaper-v0.2.md` (`payer NYM, hop NYM, hop index, merkle root, bytes, t_first, t_last, prev receipt sig`, signed by the payer), signs with an ed25519 key generated on first run, and sends it to `bw-mint`.
   - The Mint verifies both signatures and appends the receipt to a ledger.
   - Hourly prepaid windows, dollars not tokens, one Mint, no onion routing, no chain. See `OPEN-QUESTIONS.md` section E; do not design around A1, A2, A3.
6. **The first dispute test.** Make the two nodes' byte counts disagree and resolve it from the receipt data alone. That is the pilot's definition of success for this phase.

Then update the "State as of" and "Next step" sections of `CLAUDE.md`, and this file, so the next handoff is as clean as this one.

## Pitfalls, collected

- Under-2 A power supply: random reboots that look like software bugs.
- 64-bit Lite, not Desktop, not 32-bit.
- Three trips through the Imager settings dialog; only the hostname changes.
- `.local` needs mDNS; the Mac has it. Linux clients may need `avahi-daemon`.
- A Pi 3 B has 100 Mbps Ethernet over USB and 2.4 GHz-only Wi-Fi. Fine for Phase 0; it is how it will talk to the data radio later.
- Never commit a private key, a password, or a node's WireGuard private key to either repo. Keys stay on the nodes and on the Mac.
