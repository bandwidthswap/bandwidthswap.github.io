#!/bin/sh
# apply-card.sh <hostname> : customise the Pi OS card mounted under /Volumes (cloud-init files, the ssh switch file, and a one-shot firstrun.sh), then eject it.
set -e
H="$1"; S="$(cd "$(dirname "$0")" && pwd)"
[ -n "$H" ] || { echo "usage: apply-card.sh <hostname>"; exit 2; }
B="${BOOT_DIR:-}"   # BOOT_DIR=<dir>: write into that directory instead of a mounted card and do not eject (a dry run)
[ -n "$B" ] || for v in /Volumes/*; do [ -f "$v/config.txt" ] && [ -f "$v/cmdline.txt" ] && B="$v"; done
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
# Per-host details the card should carry, from a file only you can read: ~/.config/bwkit/<hostname>.env (mode 600), with
#   WIFI_SSID / WIFI_PSK     a Wi-Fi network the node joins on its own (a NetworkManager profile, written on first boot)
#   WIFI_COUNTRY             the regulatory domain for Wi-Fi (default US)
#   TS_AUTHKEY               a Tailscale pre-authentication key: the node installs tailscale and joins the tailnet by itself
#                            once it has any network, then shreds the key; make the key one-off, and disable key expiry
#                            for the node in the admin console afterwards
#   TS_EXTRA                 more flags for `tailscale up` (--advertise-exit-node for a hop that sells its connection)
# The file is shell syntax: quote a value that has a space or a quote in it, e.g. WIFI_SSID="Jim's Net". Nothing from it is
# printed here or logged on the card; firstrun.sh carries it until the first boot, then removes itself.
E="$HOME/.config/bwkit/$H.env"; X="$(mktemp)"; trap 'rm -f "$X"' EXIT
q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
if [ -f "$E" ]; then
  [ "$(stat -f '%Lp' "$E")" = "600" ] || echo "--- note: $E is not mode 600 (chmod 600 $E)"
  WIFI_SSID=""; WIFI_PSK=""; WIFI_COUNTRY="US"; TS_AUTHKEY=""; TS_EXTRA=""
  set -a; . "$E"; set +a
  if [ -n "$WIFI_SSID" ]; then
    {
      echo "# wifi: a NetworkManager profile for $(q "$WIFI_SSID"), applied on the next boot"
      echo "command -v raspi-config >/dev/null && raspi-config nonint do_wifi_country $(q "$WIFI_COUNTRY") >/dev/null 2>&1; rfkill unblock wifi 2>/dev/null"
      echo "install -d -m 755 /etc/NetworkManager/system-connections"
      printf '%s\n' "printf '[connection]\\nid=house\\ntype=wifi\\ninterface-name=wlan0\\nautoconnect=true\\nautoconnect-priority=10\\n\\n[wifi]\\nmode=infrastructure\\nssid=%s\\n\\n[wifi-security]\\nkey-mgmt=wpa-psk\\npsk=%s\\n\\n[ipv4]\\nmethod=auto\\n\\n[ipv6]\\nmethod=auto\\n' $(q "$WIFI_SSID") $(q "$WIFI_PSK") > /etc/NetworkManager/system-connections/house.nmconnection"
      echo "chmod 600 /etc/NetworkManager/system-connections/house.nmconnection; echo 'wifi profile written'"
    } >> "$X"
    echo "--- the card will join the Wi-Fi network from $E"
  fi
  if [ -n "$TS_AUTHKEY" ]; then
    {
      echo "# tailnet: the key waits, root-only, for a one-shot that joins once the node is online, then shreds it"
      echo "install -d -m 700 /etc/bwkit-join"
      printf '%s\n' "printf 'TS_AUTHKEY=%s\\nTS_EXTRA=%s\\n' $(q "$TS_AUTHKEY") $(q "$TS_EXTRA") > /etc/bwkit-join/tailnet.env; chmod 600 /etc/bwkit-join/tailnet.env"
      cat <<'EOJ'
cat > /usr/local/sbin/bwkit-join-tailnet <<'EOF2'
#!/bin/sh
# Joins the tailnet with the key in /etc/bwkit-join/tailnet.env, once, then shreds the key and disables itself.
set -u
. /etc/bwkit-join/tailnet.env
# A Pi has no clock until it syncs, and with the clock weeks off every HTTPS connection fails its certificate check
# (bw-cabin's first try, Oct 19, 2026): wait for time sync, then for the network, then try; on failure exit 1 so the
# unit's Restart= tries again in five minutes, the key kept for it.
for i in $(seq 1 60); do [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" = yes ] && break; sleep 10; done
for i in $(seq 1 30); do curl -fsI https://tailscale.com >/dev/null 2>&1 && break; sleep 10; done
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh >/dev/null 2>&1
if tailscale up --authkey "$TS_AUTHKEY" --hostname "$(hostname)" $TS_EXTRA >/dev/null 2>&1 && tailscale ip -4 >/dev/null 2>&1; then
  echo "$(hostname): on the tailnet at $(tailscale ip -4)"
  shred -u /etc/bwkit-join/tailnet.env 2>/dev/null || rm -f /etc/bwkit-join/tailnet.env
  systemctl disable bwkit-join-tailnet.service >/dev/null 2>&1
else
  echo "$(hostname): tailscale up failed (clock synced: $(timedatectl show -p NTPSynchronized --value 2>/dev/null)); again in five minutes, the key kept"
  exit 1
fi
EOF2
chmod 755 /usr/local/sbin/bwkit-join-tailnet
cat > /etc/systemd/system/bwkit-join-tailnet.service <<'EOF2'
[Unit]
Description=bandwidthswap: join the tailnet once with the key the card carried
After=network-online.target time-sync.target
Wants=network-online.target time-sync.target
ConditionPathExists=/etc/bwkit-join/tailnet.env
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/bwkit-join-tailnet
Restart=on-failure
RestartSec=300
[Install]
WantedBy=multi-user.target
EOF2
systemctl enable bwkit-join-tailnet.service >/dev/null 2>&1; echo 'tailnet join armed'
EOJ
    } >> "$X"
    echo "--- the card will join the tailnet from $E (one-off key; disable its expiry in the admin console after)"
  fi
else
  echo "--- no $E: the card gets no Wi-Fi and no tailnet (Ethernet on the house LAN, as the bench nodes)"
fi
sed -e "s|__HOST__|$H|" -e "s|__KEY1__|$KEY1|" -e "s|__KEY2__|$KEY2|" "$S/firstrun.tpl" | awk -v f="$X" '/^# __EXTRAS__$/{while((getline l<f)>0)print l;next}1' > "$B/firstrun.sh"
grep -q 'systemd.run=' "$B/cmdline.txt" || sed -i '' '1s|$| systemd.run=/boot/firmware/firstrun.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target|' "$B/cmdline.txt"
echo "--- wrote user-data, meta-data, the ssh switch file, firstrun.sh and the cmdline hook for $H"
echo "cmdline: $(cat "$B/cmdline.txt")"
if command -v ruby >/dev/null 2>&1; then ruby -ryaml -e 'ARGV.each{|f| YAML.load_file(f)}; puts "yaml ok"' "$B/user-data" "$B/meta-data" 2>&1 | grep -v ffi-; fi
bash -n "$B/firstrun.sh" && echo "firstrun.sh syntax ok"
grep -c 'ssh-ed25519' "$B/firstrun.sh" | sed 's/^/keys in firstrun.sh: /'
sync
[ -n "${BOOT_DIR:-}" ] && { echo "--- dry run into $B; nothing ejected"; exit 0; }
W=$(diskutil info "$B" | awk -F': *' '/Part of Whole/{print $2}')
diskutil eject "$W" && echo "--- ejected $W: card $H is ready to go back into its Pi"
