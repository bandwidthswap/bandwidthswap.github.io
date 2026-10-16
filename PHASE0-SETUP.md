# Phase 0 setup: from three bare Pi 3 B boards to three nodes on the LAN

This is the handoff for the Phase 0 lab: how the three cards were made, how the nodes are set up, how to check them, and what comes next. Written Monday, October 12, 2026; rewritten the evening of Friday, October 16, when the three nodes came up and the first dispute test passed. Read `CLAUDE.md` first for what the project is; this file is only the "what do I do now" for Phase 0.

## Where things stand

As of the evening of October 16, 2026:

- Three Raspberry Pi 3 Model B nodes are up on the home LAN, wired, on 2.5 A supplies: `bw-house` at 192.168.0.74 (`b8:27:eb:9b:c7:6e`), `bw-forest` at 192.168.0.226 (`b8:27:eb:83:7c:6b`), `bw-mint` at 192.168.0.61 (`b8:27:eb:6b:1b:09`), DHCP from the UniFi gateway at 192.168.0.1, no reservations yet. The nodes find each other by `.local` name (avahi and nss-mdns are on the image), so a lease change only affects notes like this one.
- Raspberry Pi OS Lite, Debian 13 (trixie), image 2026-10-06, fully upgraded on October 16 (kernel 6.18.50+rpt-rpi-v8). User `bw` (uid 1001, locked password, passwordless sudo), key-only SSH with two keys authorized: the `Grace` account's and the October 12 line. Timezone America/Chicago.
- Time: chrony on all three. `bw-house` syncs to the Debian pool (stratum 4) and serves 192.168.0.0/24, with `local stratum 10` so it keeps serving if the internet is away; `bw-forest` and `bw-mint` use `bw-house.local` as their only source. The three agree within milliseconds.
- Tunnel: WireGuard `wg0`, `bw-house` 10.77.0.1/30 to `bw-forest` 10.77.0.2/30, UDP 51820, persistent keepalive 25 s, about 1 ms across. Each node's private key is in its `/etc/wireguard/wg0.key` and has never left it.
- Logs: journald in RAM on all three (`Storage=volatile`, 32 MB).
- The kit: `bwkit` from `bandwidthswap/kit` is installed on all three (`/usr/local/bin/bwkit`, system user `bwkit`, state in `/var/lib/bwkit`, config in `/etc/bwkit/config.json`). `bw-house` is the payer with the hourly `bwkit-receipt.timer` (first scheduled receipt 17:00 CDT on October 16), `bw-forest` the hop and `bw-mint` the Mint, both serving on port 8710. The Mint's ledger is `/var/lib/bwkit/ledger.jsonl`.
- The first dispute test passed at 16:14 CDT on October 16; see "What was done on October 16".
- The Mac side is the `Grace` account: the key, the SSH config block, the Imager, this clone and the kit's clone at `~/Documents/GitHub/kit`.

## What is already on the Mac

Set up on October 12 under some other account, and again on October 16 in the `Grace` account, which is where all of it is now.

| Thing | Where | Why |
|---|---|---|
| SSH key for the Pis | `~/.ssh/bandwidthswap_ed25519` (private) and `~/.ssh/bandwidthswap_ed25519.pub` (public), comment `bandwidthswap-pis-grace`, no passphrase, made October 16 in the `Grace` account | So an agent can SSH into the nodes non-interactively. The public line goes into every card at flash time. |
| SSH config block | `~/.ssh/config`, the block headed `# bandwidthswap pis (phase 0 lab)` | `ssh bw-house`, `ssh bw-forest`, `ssh bw-mint` resolve to `<name>.local`, user `bw`, that key. |
| Cloned repo | `~/Documents/GitHub/bandwidthswap.github.io` | This repo. `tools/build.sh` runs clean there (pandoc 3.6.4 and python3 are installed). |
| Cloned kit | `~/Documents/GitHub/kit` | The `bandwidthswap/kit` repo: the daemon, the Mint and `phase0/provision.sh`, which does every node step from the Mac over SSH. |

**The key is the `Grace` account's, made October 16.** The October 12 session ran as some other account on this Mac (it has several; `robertdouglas` is one) or never made its key: on the morning of October 16 the `Grace` account had no `~/.ssh` at all. That afternoon a new key was made there (`ssh-keygen -t ed25519 -f ~/.ssh/bandwidthswap_ed25519 -N "" -C bandwidthswap-pis-grace`, fingerprint `SHA256:Hy16u0AB6IJXDqwqMRsQ8q0IjVWR5Hua8+RMq3HBQ64`) with the config block, and its public line is the one printed below. The October 12 line (comment `bandwidthswap-pis`) is retired: no private key for it was ever found, so a card flashed with it cannot be reached from here. `ls ~/.ssh/bandwidthswap_ed25519*` still tells you whether you are in the right account. `tools/build.sh` runs clean in Grace's clone (pandoc 3.6.4, Python 3.13).

The Raspberry Pi Imager v2.0.12 is in `~/Applications` of the `Grace` account since October 16, installed by download (Homebrew on this Mac is broken: an Intel-prefix install under `/usr/local`, owned by `robertdouglas`, running under Rosetta), and has the Lite 64-bit image cached. Writing a card needs an administrator's name and password in the Imager's prompt, and `Grace` is not an administrator: use the `robertdouglas` account's. The Imager's `--cli` mode is no shortcut, since it needs root and takes only cloud-init files for the settings.

**If a different person on a different machine does the flashing**, they need their own key. Make one with `ssh-keygen -t ed25519 -f ~/.ssh/bandwidthswap_ed25519 -N ""` and paste BOTH public keys into the Imager's authorized-keys box, one per line, so both machines can reach the nodes. The Mac's public key (the `Grace` account's) is:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINDFPITNoFgV/4TU9lDvdyRmeO9eOuuDfx3B07LuTyLB bandwidthswap-pis-grace
```

## Flashing the three cards (about 5 minutes per card)

**What happened on October 16.** The Imager (2.0.12, with the 2026-10-06 trixie image) wrote the OS but none of the settings: all three cards booted as `raspberrypi` with SSH off and no user, and the Imager's saved hostname read `1`. The fix was done from the Mac with `tools/card/apply-card.sh <hostname>` on each card's boot partition (cloud-init `user-data` and `meta-data`, the `ssh` switch file, and a one-shot `firstrun.sh` hooked from `cmdline.txt`; `tools/card/README.md` explains each), then one more boot. If a card is ever rewritten, flash it with the Imager as below and run `apply-card.sh` on it before its first boot, and in any case check the router's device list after the first boot: a Pi called `raspberrypi` means the settings did not take.

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

Each should land on a shell with no password prompt. If a `.local` name does not resolve: the router's device list shows the addresses (192.168.0.74, .226 and .61 on October 16), and a Pi 3 B's MAC address starts with `b8:27:eb`. `ssh bw@<address>` works meanwhile.

Everything else is one command in the kit's clone: `phase0/provision.sh check` prints `chronyc tracking` for the three, `wg show` and a ping across the tunnel, and the three nodes' `bwkit` status.

The site's "Boot and find them" section shows `ssh pi@bw-house.local` as a generic example. The lab's username is `bw`.

## What was done on October 16 (and how it was checked)

All of it from the Mac over SSH with `phase0/provision.sh` in the kit, one step per command, each idempotent and ending with its own check: `upgrade` (apt full-upgrade and reboot, the three in parallel), `time`, `tunnel`, `logs`, `kit`. `update` copies a newer `bwkit.py` to the nodes and restarts the services; `check` only verifies.

The receipt daemon is `bwkit.py` in the kit, one file for the three roles; its README has the format and the rules. In short: every hour `bw-house` reads the `wg0` byte counters, builds the Figure 2 receipt (the Phase 0 `merkle_root` is the payer's SHA-256 commitment to its own meter readings, since nothing is chunked yet), signs it with its ed25519 key and asks `bw-forest` to acknowledge it. The hop checks the signature and the clock rule (5 seconds, decline), signs the same tuple with its own count and `prev_sig` set to the payer's signature, and both go to `bw-mint`, which verifies the signatures, refuses NYMs it was not told about, appends everything to its ledger and settles the window at the smaller of the two signed counts: `settled` when the counts are within 1% of each other, `disputed` otherwise, same rule either way.

**The first dispute test**, `phase0/dispute-test.sh`, ran at 16:14 CDT:

1. 20 MB through the tunnel, then a receipt: the payer signed 21,938,052 bytes, the hop 21,939,460 (keepalives and in-flight packets), the Mint wrote `SETTLED` for 21.94 MB ($0.0022 at the lab's 10 cents a gigabyte).
2. 20 MB more, then `wg0` restarted on `bw-forest` so its counters started over, then a receipt: the payer signed 21,945,428 bytes, the hop 1,712, the Mint wrote `DISPUTED` and settled at 1,712, the hop's count.
3. The two signed files were pulled out of the ledger and `bwkit verify` and `bwkit settle` on `bw-mint` reproduced the settlement from them alone, with nothing else to consult. That is the pilot's definition of success for this phase.

Nothing in the daemon was faked for the test: the hop's meter really did see fewer bytes.

## What the next session does

1. **Let it run.** The timer makes a receipt at the top of every hour. After a day, `sudo -u bwkit bwkit ledger` and `bwkit invoice 2026-10` on `bw-mint` should show about 24 settled windows of keepalive-sized traffic and no disputes. `journalctl -u bwkit-receipt` on `bw-house` and `journalctl -u bwkit` on the other two show each hour's exchange. A node that could not reach the Mint keeps its receipts in `/var/lib/bwkit/outbox` and sends them later.
2. **DHCP reservations** for the three MAC addresses on the UniFi gateway, so the addresses in this file stay true.
3. **The second dispute**, the hop over-claiming. The daemon settles it at the payer's count (the unit test covers it); it has not been run on the nodes. Setting the hop's count by hand means a test hook the daemon does not have, deliberately.
4. **The clock rule on real hardware.** Stop chrony on `bw-forest`, step its clock 10 seconds, run `sudo -u bwkit bwkit receipt` on `bw-house` and watch the hop decline; restore chrony. Backlog B9 asks for measured drift across sites, which starts here.
5. **Prepayment of a window** (backlog B2 option b): the payer locks a window's value before bytes move. Not built; the receipt and the invoice are the settlement for now (B8 option d).
6. Then Phase 1: the radios, per `SHOPPING-LIST.md`. The tunnel configuration carries over unchanged.

## Pitfalls, collected

- Under-2 A power supply: random reboots that look like software bugs.
- 64-bit Lite, not Desktop, not 32-bit.
- Three trips through the Imager settings dialog; only the hostname changes.
- `.local` needs mDNS; the Mac has it. Linux clients may need `avahi-daemon`.
- A Pi 3 B has 100 Mbps Ethernet over USB and 2.4 GHz-only Wi-Fi. Fine for Phase 0; it is how it will talk to the data radio later.
- The Imager's settings may silently not apply (October 16, Imager 2.0.12, trixie image): check the first boot's hostname on the router before anything else. The image's stock cloud-init `meta-data` spells the key `instance_id`, which cloud-init ignores (it reads `instance-id`), so editing `user-data` after a first boot changes nothing until `meta-data` gets a real `instance-id`; `tools/card/apply-card.sh` writes one.
- Scripts for the nodes go to `sudo sh -s` on stdin, never as an argument to `ssh`: the remote shell drops the quotes, `sudo` runs only the first word and the rest runs as `bw`. The first chrony run failed that way.
- `chronyc tracking` on `bw-house` shows the local clock (`7F7F0101`, stratum 10) for about a minute after chrony starts, until the first pool update; the clients show stratum 11 until their next poll. Not a fault.
- `bw` has no password. `sudo passwd bw` on the console if one is ever needed.
- Never commit a private key, a password, or a node's WireGuard private key to either repo. Keys stay on the nodes and on the Mac.
