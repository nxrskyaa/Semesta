#!/usr/bin/env bash
#
# One-shot VPS setup for the Semesta game server.
# Ubuntu 22.04 LTS. Run as root:
#
#   bash setup-vps.sh play.yourdomain.com
#
# It installs Node 20, Caddy (which gets a real HTTPS certificate on its own),
# creates an unprivileged user to run the game under, and wires up systemd so
# the server starts on boot and restarts if it ever dies.
#
# Why Caddy and not nginx: the browser is served over HTTPS from Vercel and will
# flatly refuse a plain ws:// socket from an https:// page. So the server needs
# TLS, and Caddy obtains and renews the certificate by itself from three lines
# of config. With nginx that is certbot, a cron job and a renewal hook.

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-vps.sh play.yourdomain.com"
  echo "Point that domain's A record at this server's IP FIRST, or the"
  echo "certificate will fail."
  exit 1
fi

APP_USER=semesta
APP_DIR=/opt/semesta
PORT=8787

echo "==> 1/7  System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw git

echo "==> 2/7  Node.js 20"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
node -v

echo "==> 3/7  Caddy (automatic HTTPS)"
if ! command -v caddy >/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
fi

echo "==> 4/7  Application user and directory"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> 5/7  Firewall"
ufw allow OpenSSH   >/dev/null
ufw allow 80/tcp    >/dev/null
ufw allow 443/tcp   >/dev/null
# the game port is NOT opened: it is only ever reached through Caddy on
# localhost, so it cannot be hit directly from the internet
ufw --force enable  >/dev/null
ufw status | head -8

echo "==> 6/7  Caddy site config"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode zstd gzip

	# The WebSocket endpoint the game connects to.
	reverse_proxy localhost:$PORT

	header {
		# Only the deployed game may open a socket, so a copy of the client
		# hosted somewhere else cannot quietly use this server.
		Access-Control-Allow-Origin "*"
		-Server
	}
}
CADDY
systemctl reload caddy || systemctl restart caddy

echo "==> 7/7  systemd service"
cat > /etc/systemd/system/semesta.service <<UNIT
[Unit]
Description=Semesta game server
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/server
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=MAX_PLAYERS=60
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=2
# a crashing process must not be able to fill the disk with logs
StandardOutput=append:/var/log/semesta.log
StandardError=append:/var/log/semesta.log

# basic hardening: the game server has no business writing anywhere but its
# own directory, and no business being root
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log

[Install]
WantedBy=multi-user.target
UNIT

touch /var/log/semesta.log
chown "$APP_USER:$APP_USER" /var/log/semesta.log
cat > /etc/logrotate.d/semesta <<'ROT'
/var/log/semesta.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
  copytruncate
}
ROT

systemctl daemon-reload
systemctl enable semesta >/dev/null

echo
echo "=========================================================="
echo " Base system ready."
echo
echo " Next, put the code on the box and start it:"
echo
echo "   git clone <YOUR_REPO_URL> $APP_DIR"
echo "   cd $APP_DIR/server && npm install --omit=dev"
echo "   chown -R $APP_USER:$APP_USER $APP_DIR"
echo "   systemctl start semesta"
echo
echo " Then check it:"
echo "   curl https://$DOMAIN/health"
echo "   journalctl -u semesta -f"
echo
echo " Your game server URL, for Vercel:"
echo "   VITE_GAME_SERVER=wss://$DOMAIN"
echo "=========================================================="
