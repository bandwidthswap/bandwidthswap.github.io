# Preparing a node's card on the Mac

`apply-card.sh <hostname>` customises a Raspberry Pi OS card whose boot partition is mounted under `/Volumes` (bootfs), then ejects it. It was written on October 16, 2026 when the Imager's own customisation turned out not to have applied to the three Phase 0 cards (they booted as `raspberrypi` with SSH off and no user).

It writes three things, any one of which would do most of the job:

- `user-data` and `meta-data` for cloud-init: hostname, user `bw` with both lab keys, key-only SSH, `ssh_deletekeys: false`. The stock image's `meta-data` spells the key `instance_id`, which cloud-init ignores; it reads `instance-id`, and without a new one it treats every boot as the same instance and only re-applies the hostname.
- The empty `ssh` file, which Raspberry Pi OS has honoured for years: SSH is enabled on the next boot.
- `firstrun.sh` plus a `systemd.run=` hook on `cmdline.txt` (the mechanism the Imager uses): on the next boot it creates `bw` (locked password, passwordless sudo, both keys), turns SSH on key-only, sets the timezone, copies cloud-init's logs to the boot partition, removes itself and reboots. Its log is `firstrun.log` on the boot partition.

Both public keys are in the template: the Mac's `~/.ssh/bandwidthswap_ed25519.pub` and the author's key from `PHASE0-SETUP.md`. The card must be physically reinserted after each eject before the Mac sees it again.
