# Semesta game server

The authoritative half of Anavela Universe: the clock, the weather, the
monsters, the world boss, chat, and where everybody is standing.

It does **not** hold the map (every client generates an identical world from
fixed seeds) and it does **not** hold accounts or saves (those live in
Supabase). That is what keeps it small enough to run on one modest VPS.

## Run locally

```bash
cd server
npm install
npm start          # listens on :8787
curl localhost:8787/health
```

Point the game at it with `VITE_GAME_SERVER=ws://localhost:8787` in a `.env`
file at the repo root.

## Deploy

See `../MULTIPLAYER.md`. Short version, as root on a fresh Ubuntu 22.04 box:

```bash
bash deploy/setup-vps.sh play.yourdomain.com
```

## Update

```bash
bash /opt/semesta/server/deploy/update.sh
```

## Watch it

```bash
journalctl -u semesta -f
curl https://play.yourdomain.com/health
```
