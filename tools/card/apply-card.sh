#!/bin/sh
# apply-card.sh <hostname> : customise the Pi OS card mounted under /Volumes (cloud-init files, the ssh switch file, and a one-shot firstrun.sh), then eject it.
set -e
H="$1"; S="$(cd "$(dirname "$0")" && pwd)"
[ -n "$H" ] || { echo "usage: apply-card.sh <hostname>"; exit 2; }
B=""; for v in /Volumes/*; do [ -f "$v/config.txt" ] && [ -f "$v/cmdline.txt" ] && B="$v"; done
[ -n "$B" ] || { echo "no Pi boot partition mounted"; exit 1; }
KEY1="$(cat "$HOME/.ssh/bandwidthswap_ed25519.pub")"
KEY2="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAKk23Do9bRHosHC25wICJsvk8eAhVzFm07LzMUjZ/KG bandwidthswap-pis"
mkdir -p "$S/stock-backup/$H"; for f in user-data meta-data network-config cmdline.txt; do [ -f "$S/stock-backup/$H/$f" ] || cp "$B/$f" "$S/stock-backup/$H/$f"; done
for f in firstrun.log cloud-init.log cloud-init-output.log; do [ -f "$B/$f" ] && { cp "$B/$f" "$S/$H-$f"; echo "--- saved $f from the card's last boot to $S/$H-$f"; }; done
cat > "$B/user-data" <<EOF
#cloud-config
# bandwidthswap phase 0 lab node. Written on the Mac on $(date +%Y-%m-%d); see PHASE0-SETUP.md in bandwidthswap/bandwidthswap.github.io.
hostname: $H
manage_etc_hosts: true
timezone: America/Chicago
ssh_pwauth: false
ssh_deletekeys: false
users:
- name: bw
  gecos: bandwidthswap
  shell: /bin/bash
  groups: users,adm,dialout,audio,netdev,video,plugdev,cdrom,games,input,gpio,spi,i2c,render,sudo
  lock_passwd: true
  sudo: ALL=(ALL) NOPASSWD:ALL
  ssh_authorized_keys:
  - $KEY1
  - $KEY2
EOF
cat > "$B/meta-data" <<EOF
dsmode: local
instance-id: $H-$(date +%Y%m%d-%H%M%S)
EOF
: > "$B/ssh"
sed -e "s|__HOST__|$H|" -e "s|__KEY1__|$KEY1|" -e "s|__KEY2__|$KEY2|" "$S/firstrun.tpl" > "$B/firstrun.sh"
grep -q 'systemd.run=' "$B/cmdline.txt" || sed -i '' '1s|$| systemd.run=/boot/firmware/firstrun.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target|' "$B/cmdline.txt"
echo "--- wrote user-data, meta-data, the ssh switch file, firstrun.sh and the cmdline hook for $H"
echo "cmdline: $(cat "$B/cmdline.txt")"
if command -v ruby >/dev/null 2>&1; then ruby -ryaml -e 'ARGV.each{|f| YAML.load_file(f)}; puts "yaml ok"' "$B/user-data" "$B/meta-data" 2>&1 | grep -v ffi-; fi
bash -n "$B/firstrun.sh" && echo "firstrun.sh syntax ok"
grep -c 'ssh-ed25519' "$B/firstrun.sh" | sed 's/^/keys in firstrun.sh: /'
sync
W=$(diskutil info "$B" | awk -F': *' '/Part of Whole/{print $2}')
diskutil eject "$W" && echo "--- ejected $W: card $H is ready to go back into its Pi"
