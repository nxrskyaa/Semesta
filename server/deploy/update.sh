#!/usr/bin/env bash
# Pull the latest code and restart the server. Run as root on the VPS:
#   bash /opt/semesta/server/deploy/update.sh
set -euo pipefail
APP_DIR=/opt/semesta
cd "$APP_DIR"
git pull --ff-only
cd server
npm install --omit=dev
chown -R semesta:semesta "$APP_DIR"
systemctl restart semesta
sleep 1
systemctl --no-pager status semesta | head -12
