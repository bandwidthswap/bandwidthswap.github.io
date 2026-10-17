# Phase 0 setup: from three bare Pi 3 B boards to three nodes on the LAN

This is the handoff for the Phase 0 lab: how the three cards were made, how the nodes are set up, how to check them, and what comes next. Written Monday, October 12, 2026; rewritten the evening of Friday, October 16, when the three nodes came up and the first dispute test passed, and brought up to date later that evening after the over-claim dispute and the clock rule were run on the nodes. Read `CLAUDE.md` first for what the project is; this file is only the "what do I do now" for Phase 0.

## Where things stand

As of the evening of October 16, 2026:

- Three Raspberry Pi 3 Model B nodes are up on the home LAN, wired, on 2.5 A supplies: `bw-house` at 192.168.0.74 (`b8:27:eb:9b:c7:6e`), `bw-forest` at 192.168.0.226 (`b8:27:eb:83:7c:6b`), `bw-mint` at 192.168.0.61 (`b8:27:eb:6b:1b:09`), DHCP from the UniFi gateway (a Cloud Gateway Ultra) at 192.168.0.1, no reservations yet: that is Grace's step, under "DHCP reservations on the gateway" below. The nodes find each other by `.local` name (avahi and nss-mdns are on the image), so a lease change only affects notes like this one.
- Raspberry Pi OS Lite, Debian 13 (trixie), image 2026-10-06, fully upgraded on October 16 (kernel 6.18.50+rpt-rpi-v8). User `bw` (uid 1001, locked password, passwordless sudo), key-only SSH with two keys authorized: the `Grace` account's and the October 12 line. Timezone America/Chicago.
- Time: chrony on all three. `bw-house` syncs to the Debian pool (stratum 4) and serves 192.168.0.0/24, with `local stratum 10` so it keeps serving if the internet is away; `bw-forest` and `bw-mint` use `bw-house.local` as their only source. The three agree within milliseconds.
- Tunnel: WireGuard `wg0`, `bw-house` 10.77.0.1/30 to `bw-forest` 10.77.0.2/30, UDP 51820, persistent keepalive 25 s, about 1 ms across. Each node's private key is in its `/etc/wireguard/wg0.key` and has never left it.
- Logs: journald in RAM on all three (`Storage=volatile`, 32 MB).
- The kit: `bwkit` from `bandwidthswap/kit` is installed on all three (`/usr/local/bin/bwkit`, system user `bwkit`, state in `/var/lib/bwkit`, config in `/etc/bwkit/config.json`). `bw-house` is the payer with the hourly `bwkit-receipt.timer` (first scheduled receipt 17:00 CDT on October 16), `bw-forest` the hop and `bw-mint` the Mint, both serving on port 8710. The Mint's ledger is `/var/lib/bwkit/ledger.jsonl`. The nodes run bwkit 0.1.0; the kit's `main` (a26c418) is 0.1.1, which only adds a journal line when the hop or the Mint declines or refuses a request. `phase0/provision.sh update` puts it on the nodes; see step 3 of "What the next session does" for why that is still to do.
- Three forced tests passed on October 16: the first dispute at 16:14 CDT (the hop under-claims), the over-claim dispute at 16:28 and the clock rule at 16:29; see "What was done on October 16". The ledger holds their six windows (four settled, two disputed) and one receipt the hop declined, which the Mint keeps without an ack: `bwkit status` on `bw-mint` says `1 receipts without ack` from now on, and that is the clock test, not a fault.
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

**The second dispute test, the hop over-claiming**, `phase0/dispute-test.sh payer`, ran at 16:28 CDT. The daemon has no hook for signing a count of its own choosing, deliberately, so the hop's count was made the larger one honestly: the same two windows as the first test, with the counter reset on the payer's side instead of the hop's.

1. 20 MB through the tunnel, then a receipt: both signed 21,950,868 bytes (the same number this time), the Mint wrote `SETTLED` for 21.95 MB ($0.002195).
2. 20 MB more, then `wg0` restarted on `bw-house` so the payer's counters started over, then a receipt: the payer signed 272 bytes (the handshake since the restart), the hop 21,947,428, the Mint wrote `DISPUTED` and settled at 272 bytes, the payer's count ($0.000000).
3. `bwkit verify` and `bwkit settle` on the two signed files reproduced it offline.

The same rule as the first test, min(payer, hop), seen from the other side: the hop is never paid for more than the payer committed to.

**The clock rule**, `phase0/clock-test.sh`, ran at 16:29 CDT (backlog B9's default: 5 seconds, decline).

1. On `bw-forest`, chrony stopped and the clock stepped 10 s ahead with `date -s`.
2. A receipt from `bw-house` (2,880 bytes of keepalives): the hop answered 409, `clock: payer's t_last is 10 s from ours (tolerance 5 s)`. The payer's log says `hop declined`; the hop's journal, on bwkit 0.1.0, said nothing (0.1.1 logs it). The receipt went to the Mint anyway and sits there as `1 receipts without ack`; it will never settle.
3. chrony started again on `bw-forest`: its `makestep 1 3` stepped the clock back by 9.88 s about 5 s later (`System clock was stepped by -9.880549 seconds`; the missing 0.12 s is the fraction of a second `date -s @N` dropped on the way up).
4. One more receipt: the payer signed 2,160 bytes, the hop 5,040 (its sample had not moved when it declined, so its window covered both: 2,880 + 2,160), inside the 64 KiB agreement margin, so `SETTLED` at 2,160, the payer's count. With real traffic in a declined window the hop would lose it to a dispute settled at the payer's count.

The numbers for B9, from `chronyc tracking` with everything in sync:

| Node | Source | Frequency | Skew | RMS offset |
|---|---|---|---|---|
| `bw-house` | the pool, stratum 3, root delay 46 ms | 8.8 ppm fast | 3.6 ppm | 0.9 ms |
| `bw-forest` | `bw-house`, stratum 4 | 2.4 to 3.0 ppm fast | 3.0 to 4.6 ppm | 1.3 ms |
| `bw-mint` | `bw-house`, stratum 4 | 0.5 ppm slow | 2.6 ppm | 0.6 ms |

In sync, the three agree within a millisecond, four orders of magnitude inside the 5 s tolerance. Free-running (chrony stopped and no source), a Pi 3 B clock at 8.8 ppm gains 0.76 s a day and crosses 5 s in about six and a half days; at 3 ppm, 0.26 s a day and about three weeks. So the tolerance is generous for a node that keeps a time source, and fails safe for one that has been alone for a week: the receipt is declined, the window is lost, nothing is paid. Across sites, not measured yet: the forest node is on the same switch.

## What the next session does

1. **Read the ledger.** The timer makes a receipt at the top of every hour. After a day, `sudo -u bwkit bwkit ledger` and `sudo -u bwkit bwkit invoice 2026-10` on `bw-mint` should show the six test windows of the afternoon of October 16 (four settled, two disputed) and then one settled window an hour of keepalive-sized traffic (about 3 KB) and no disputes; `sudo -u bwkit bwkit status` there says `1 receipts without ack` (the clock test's) and nothing else pending. `journalctl -u bwkit-receipt` on `bw-house` and `journalctl -u bwkit` on the other two show each hour's exchange: the payer's `receipt for`, `ack from` and `sent 2 to the Mint`, the hop's `ack for` and, five seconds later, `outbox: sent 1, 0 left` (its own copy of the ack, which the Mint answers as a duplicate), the Mint's `settled`. A node that could not reach the Mint keeps its receipts in `/var/lib/bwkit/outbox` and sends them later; `bwkit status` on each node should say `outbox: 0 waiting`. `phase0/provision.sh check` in the kit verifies time, tunnel and bwkit without changing anything.
2. **DHCP reservations** for the three MAC addresses on the gateway, so the addresses in this file stay true. Grace's step; the clicks are under "DHCP reservations on the gateway" below.
3. **Level the kit on the nodes:** `bw-mint` runs bwkit 0.1.3 (with the status reporter, installed by `phase0/provision.sh status` on Oct 16); `bw-house` and `bw-forest` still run 0.1.0. `phase0/provision.sh update` in the kit's clone copies the current `bwkit.py` and the units to all three and restarts the servers on `bw-forest` and `bw-mint`. Run it from a terminal: an auto-mode Claude session was refused that remote write on Oct 16, while it let the test scripts run.
4. **Prepayment of a window** (backlog B2 option b): the payer locks a window's value before bytes move. Not built; the receipt and the invoice are the settlement for now (B8 option d).
5. Then Phase 1: the radios. Bought on Oct 16 (see `SHOPPING-LIST.md`, "Bought"): three LILYGO T-Beam Supreme boards for the LoRa control plane, antennas, cables and cases; the Heltec Wi-Fi HaLow dongle pair for the data plane through the trees. The tunnel configuration carries over unchanged: the HaLow pair replaces the bench cable between `bw-house` and `bw-forest`, and the Pi talks to its dongle over Ethernet. The Phase 1 test is to cut the house's internet mid-window and show the window still settles when it returns.

## DHCP reservations on the gateway (Grace)

The gateway at 192.168.0.1 is a UniFi Cloud Gateway Ultra running UniFi OS; its login is Grace's alone, so this is a hands-on step. In a browser:

1. Open https://192.168.0.1 and sign in (the browser warns about the gateway's own certificate; continue).
2. Open the **Network** application.
3. **Client Devices** in the left sidebar. Find `bw-house` (MAC `b8:27:eb:9b:c7:6e`; the list can be searched) and click its row.
4. In the client's panel open **Settings** (the gear tab), turn on **Fixed IP Address**, keep `192.168.0.74` (the address it holds now is offered) and **Apply Changes**.
5. The same for `bw-forest` (`b8:27:eb:83:7c:6b`, `192.168.0.226`) and `bw-mint` (`b8:27:eb:6b:1b:09`, `192.168.0.61`).

Older Network versions put the same switch under the client's **Config** tab as "Use fixed IP address". The reservation changes nothing visible until the next lease, since each node already has its address; the check is that the client's row carries the fixed-IP mark and that `ssh bw-house 'ip -4 addr show eth0'` still says `.74` after a reboot. If a node ever does come up on another address, nothing in the lab breaks (the nodes use `.local` names and the tunnel's endpoints are resolved at `provision.sh tunnel` time), but this file and `/etc/wireguard/wg0.conf` on the two tunnel nodes would be stale.

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
- When the hop declines a receipt its sample does not move, so its next ack covers the declined window too. With keepalive traffic that is a few KB inside the agreement margin and settles at the payer's count; with real traffic it is a dispute, settled at the payer's count: the hop loses the window it declined. The payer's receipt for the declined window stays on the Mint as a receipt without ack, forever.
- `date -s @$(($(date +%s) + 10))` drops the fraction of a second, so the step is 9.88 s, not 10. chrony's `makestep 1 3` steps an offset over 1 s back within its first three updates, about 5 s after a restart with `iburst`.
- bwkit 0.1.0's hop says nothing in its journal when it declines; only the payer's log has the 409 and its reason. 0.1.1 logs it on the server side too, and the Mint logs what it refuses.
- Claude's auto-mode permission classifier lets the test scripts run but refused `phase0/provision.sh update` as a remote write. Run it from a terminal.
- Never commit a private key, a password, or a node's WireGuard private key to either repo. Keys stay on the nodes and on the Mac.
