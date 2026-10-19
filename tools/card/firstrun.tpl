#!/bin/bash
# bandwidthswap phase 0 lab: one-shot node setup, run once by systemd.run= from cmdline.txt. Removes itself and reboots.
set +e
H='__HOST__'
BOOT=/boot/firmware; [ -d "$BOOT" ] || BOOT=/boot
exec >>"$BOOT/firstrun.log" 2>&1
echo "=== firstrun start $(date) host=$H"
echo "$H" > /etc/hostname
if grep -q '^127\.0\.1\.1' /etc/hosts; then sed -i "s/^127\.0\.1\.1.*/127.0.1.1\t$H/" /etc/hosts; else printf '127.0.1.1\t%s\n' "$H" >> /etc/hosts; fi
if ! id bw >/dev/null 2>&1; then
  if getent passwd 1000 >/dev/null; then useradd -m -s /bin/bash bw; else useradd -m -u 1000 -s /bin/bash bw; fi
fi
echo "user: $(id bw)"
for g in adm dialout cdrom sudo audio video plugdev games users input render netdev gpio i2c spi; do getent group "$g" >/dev/null && usermod -aG "$g" bw; done
passwd -l bw
install -d -m 700 -o bw -g bw /home/bw/.ssh
printf '%s\n%s\n' '__KEY1__' '__KEY2__' > /home/bw/.ssh/authorized_keys
chown bw:bw /home/bw/.ssh/authorized_keys; chmod 600 /home/bw/.ssh/authorized_keys
printf 'bw ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/010_bw-nopasswd; chmod 440 /etc/sudoers.d/010_bw-nopasswd
[ -x /usr/lib/userconf-pi/cancel-rename ] && /usr/lib/userconf-pi/cancel-rename bw
rm -f /etc/ssh/sshd_config.d/rename_user.conf
systemctl disable userconfig.service 2>/dev/null
mkdir -p /etc/ssh/sshd_config.d; printf 'PasswordAuthentication no\n' > /etc/ssh/sshd_config.d/10-keys-only.conf
systemctl enable ssh
ln -sf /usr/share/zoneinfo/America/Chicago /etc/localtime; echo America/Chicago > /etc/timezone
[ -f /etc/default/keyboard ] && sed -i 's/^XKBLAYOUT=.*/XKBLAYOUT="us"/' /etc/default/keyboard
# __EXTRAS__
cp /var/log/cloud-init.log /var/log/cloud-init-output.log "$BOOT/" 2>/dev/null
rm -f "$BOOT/firstrun.sh"
sed -i 's| systemd\.run=[^ ]*||; s| systemd\.run_success_action=[^ ]*||; s| systemd\.unit=kernel-command-line\.target||' "$BOOT/cmdline.txt"
echo "=== firstrun done $(date)"
exit 0
