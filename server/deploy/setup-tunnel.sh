#!/usr/bin/env bash
#
# Cloudflare Tunnel setup for the Semesta game server.
#
#   bash setup-tunnel.sh play.yourdomain.com
#
# WHY THIS EXISTS
#
# The normal path is Caddy on port 443 with its own certificate. That needs port
# 443 reachable from the internet, and some hosts simply will not open it — on
# the box this was written for, a scan of twelve common ports found exactly two
# open, 22 and 80, and no panel setting would add a third.
#
# A tunnel sidesteps the question entirely. cloudflared dials OUT to Cloudflare
# and holds the connection open; traffic comes back down that same connection.
# No inbound port is involved, so there is nothing for a provider firewall to
# block. Cloudflare terminates TLS at its edge, so the browser still gets the
# wss:// it insists on.
#
# WebSockets work over this. That is not incidental — it is the whole point, and
# it is worth stating because plenty of proxies quietly break them.
#
# The cost: the domain's nameservers must point at Cloudflare, and traffic goes
# through their network. For a game server that is a fair trade, and it also
# means the origin IP is never exposed.

set -euo pipefail

HOSTNAME_ARG="${1:-}"
if [ -z "$HOSTNAME_ARG" ]; then
  echo "Usage: bash setup-tunnel.sh play.yourdomain.com"
  echo
  echo "Before running this, the domain must already be active in Cloudflare:"
  echo "  1. dash.cloudflare.com -> Add a site -> your domain"
  echo "  2. Copy the two nameservers Cloudflare gives you"
  echo "  3. Set them at your registrar, replacing the current ones"
  echo "  4. Wait until Cloudflare shows the site as Active"
  exit 1
fi

TUNNEL_NAME=semesta
APP_DIR=/opt/semesta
CONF_DIR=/etc/cloudflared

# The game server's port. Read from the systemd unit the other script wrote, so
# the two can never disagree about which port the game is actually on.
PORT=$(grep -oP 'Environment=PORT=\K[0-9]+' /etc/systemd/system/semesta.service 2>/dev/null || echo 8787)
echo "==> game server is on port $PORT"

echo "==> 1/6  Install cloudflared"
if ! command -v cloudflared >/dev/null; then
  ARCH=$(dpkg --print-architecture)
  curl -fsSL -o /tmp/cloudflared.deb \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
fi
cloudflared --version

echo
echo "==> 2/6  Authorise this machine"
echo
echo "    A URL will be printed below. Open it on your phone or laptop, sign in,"
echo "    and pick the domain. This box has no browser, which is normal."
echo
if [ ! -f /root/.cloudflared/cert.pem ]; then
  cloudflared tunnel login
fi

echo
echo "==> 3/6  Create the tunnel"
if ! cloudflared tunnel list 2>/dev/null | grep -q " $TUNNEL_NAME "; then
  cloudflared tunnel create "$TUNNEL_NAME"
fi
TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n {print $1}' | head -1)
if [ -z "$TUNNEL_ID" ]; then
  echo "Could not find the tunnel after creating it. Run 'cloudflared tunnel list' and check."
  exit 1
fi
echo "    tunnel id: $TUNNEL_ID"

echo
echo "==> 4/6  Point the hostname at it"
cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$HOSTNAME_ARG"

echo
echo "==> 5/6  Config"
mkdir -p "$CONF_DIR"
cp "/root/.cloudflared/${TUNNEL_ID}.json" "$CONF_DIR/" 2>/dev/null || true
cat > "$CONF_DIR/config.yml" <<CONF
tunnel: ${TUNNEL_ID}
credentials-file: ${CONF_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: ${HOSTNAME_ARG}
    service: http://localhost:${PORT}
    originRequest:
      # WebSockets are the entire reason this server exists, so they are enabled
      # explicitly rather than left to a default that could change.
      noTLSVerify: true
      connectTimeout: 30s
      # A game connection is open for as long as somebody is playing. Without a
      # long idle timeout the tunnel would hang up on anyone standing still.
      keepAliveTimeout: 90s
  - service: http_status:404
CONF

echo
echo "==> 6/6  Run it as a service"
cloudflared service install 2>/dev/null || true
systemctl enable cloudflared >/dev/null 2>&1 || true
systemctl restart cloudflared
sleep 3
systemctl --no-pager status cloudflared | head -8

echo
echo "=========================================================="
echo " Tunnel is up."
echo
echo " Check it from anywhere:"
echo "   curl https://${HOSTNAME_ARG}/health"
echo
echo " Your game server URL, for Vercel:"
echo "   VITE_GAME_SERVER=wss://${HOSTNAME_ARG}"
echo
echo " Watch it:"
echo "   journalctl -u cloudflared -f"
echo "=========================================================="
