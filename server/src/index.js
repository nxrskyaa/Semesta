// SEMESTA GAME SERVER.
//
// One process, one shared world, WebSockets. Run it on the VPS behind Caddy,
// which terminates TLS — the browser is served over HTTPS from Vercel and will
// refuse a plain ws:// connection from an https:// page, so wss:// is not
// optional. See MULTIPLAYER.md.
//
// Deliberately small: no database, no framework, no build step. Player accounts
// and saves live in Supabase and never come through here; this process only owns
// what has to be shared in real time. If it crashes, systemd restarts it and
// everyone reconnects into a world that regenerates itself from the same seeds.

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { C2S, S2C, PROTOCOL_VERSION, RATES, encode, decode, r2 } from './protocol.js';
import { createWorld } from './world.js';

const PORT = Number(process.env.PORT || 8787);
const TICK_HZ = 20;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 60);
const CHAT_COOLDOWN_MS = 700;

// --- a tiny health endpoint, so you can curl the box and Caddy can probe it ---
const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, players: players.size, uptime: Math.round(process.uptime()),
      protocol: PROTOCOL_VERSION,
    }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server: http });
const players = new Map();       // id -> player
let nextPlayerId = 1;

const world = createWorld({
  onBossSpawn: (b) => broadcast(S2C.TOAST, { text: `A world boss has risen: ${b.kind.replace(/_/g, ' ')}` }),
});

function broadcast(type, data, exceptId = null) {
  const msg = encode(type, data);
  for (const p of players.values()) {
    if (p.id === exceptId) continue;
    if (p.ws.readyState === 1) p.ws.send(msg);
  }
}
const send = (p, type, data) => { if (p.ws.readyState === 1) p.ws.send(encode(type, data)); };

wss.on('connection', (ws, req) => {
  if (players.size >= MAX_PLAYERS) {
    ws.send(encode(S2C.REJECT, { reason: 'The world is full — try again in a moment.' }));
    ws.close();
    return;
  }

  let player = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    // a hostile client is a normal condition, not an exception
    if (raw.length > 4096) return;
    const msg = decode(raw.toString());
    if (!msg) return;

    if (msg.type === C2S.HELLO) {
      if (player) return;
      const d = msg.data || {};
      if (d.protocol !== PROTOCOL_VERSION) {
        send({ ws }, S2C.REJECT, { reason: 'Your game is a different version — reload the page.' });
        ws.close();
        return;
      }
      const id = nextPlayerId++;
      player = {
        id, ws,
        // The name is displayed to other people, so it is clamped and stripped
        // here rather than trusted. Never render what a client sent verbatim.
        name: String(d.name || 'Wanderer').slice(0, 16).replace(/[<>&"]/g, ''),
        cls: String(d.cls || 'knight').slice(0, 16),
        appearance: sanitiseAppearance(d.appearance),
        level: Math.max(1, Math.min(99, Number(d.level) || 1)),
        x: 0, y: 0, z: 0, f: 0, a: 'idle',
        swimming: false, busy: false,
        lastChat: 0, lastState: 0,
      };
      players.set(id, player);

      send(player, S2C.WELCOME, {
        id,
        tick: world.state.tick,
        clock: world.clock(),
        players: [...players.values()].filter((p) => p.id !== id).map(publicPlayer),
        boss: world.state.boss ? publicBoss(world.state.boss) : null,
      });
      broadcast(S2C.JOIN, publicPlayer(player), id);
      broadcast(S2C.CHAT, { id: 0, name: '', text: `${player.name} joined Anavela.`, at: Date.now() });
      return;
    }

    if (!player) return;   // nothing else is accepted before HELLO

    switch (msg.type) {
      case C2S.STATE: {
        const d = msg.data || {};
        // clamp to the map: a client claiming to be at x=1e9 is not a crash
        player.x = clamp(Number(d.x) || 0, -90, 90);
        player.y = clamp(Number(d.y) || 0, -20, 60);
        player.z = clamp(Number(d.z) || 0, -90, 90);
        player.f = Number(d.f) || 0;
        player.a = String(d.a || 'idle').slice(0, 12);
        player.swimming = !!d.sw;
        player.busy = !!d.b;
        if (d.lv) player.level = clamp(Number(d.lv), 1, 99);
        break;
      }
      case C2S.GEAR: {
        // Ids only, length-capped. They are looked up in the receiver's OWN
        // item table, so an id that does not exist there simply draws nothing —
        // a made-up string cannot become code in somebody else's browser.
        const d = msg.data || {};
        const id16 = (v) => (typeof v === 'string' && v ? v.slice(0, 24) : null);
        player.weapon = id16(d.weapon);
        player.pet = id16(d.pet);
        player.mount = id16(d.mount);
        broadcast(S2C.GEAR, {
          id: player.id, weapon: player.weapon, pet: player.pet, mount: player.mount,
        }, player.id);
        break;
      }
      case C2S.CHAT: {
        const now = Date.now();
        if (now - player.lastChat < CHAT_COOLDOWN_MS) return;   // flood guard
        player.lastChat = now;
        const text = String(msg.data?.text || '').slice(0, 140).replace(/[<>&"]/g, '').trim();
        if (!text) return;
        broadcast(S2C.CHAT, { id: player.id, name: player.name, text, at: now });
        break;
      }
      case C2S.ATTACK: {
        const d = msg.data || {};
        // Damage is capped rather than trusted. This does not stop a determined
        // cheat, it stops a stray bug or a bored console from one-shotting a
        // boss everyone else is fighting.
        const dmg = clamp(Number(d.dmg) || 0, 0, 400);
        const res = world.damage(Number(d.id), dmg, player.id);
        if (!res) break;
        broadcast(S2C.ENTITY_HIT, { id: Number(d.id), hp: Math.max(0, res.e.hp), by: player.id });
        if (!res.alive) {
          if (res.kind === 'boss') {
            broadcast(S2C.CHAT, {
              id: 0, name: '',
              text: `${res.e.kind.replace(/_/g, ' ')} has fallen. ${res.e.contributors.size} hunters share the spoils.`,
              at: Date.now(),
            });
          }
          broadcast(S2C.ENTITY_GONE, { ids: [Number(d.id)] });
        }
        break;
      }
      case C2S.INTERACT: {
        const d = msg.data || {};
        if (d.kind === 'plant' || d.kind === 'harvest') {
          const i = clamp(Number(d.i) || 0, 0, 63);
          const plot = world.state.farm.get(i) || { seed: null, stage: 0, t: 0, owner: null };
          if (d.kind === 'plant' && !plot.seed) {
            plot.seed = String(d.seed || '').slice(0, 24);
            plot.stage = 0; plot.t = 0; plot.owner = player.id;
          } else if (d.kind === 'harvest' && plot.stage >= 2) {
            plot.seed = null; plot.stage = 0; plot.t = 0; plot.owner = null;
          }
          world.state.farm.set(i, plot);
          broadcast(S2C.FARM, [[i, plot.seed, plot.stage]]);
        }
        break;
      }
      case C2S.PING:
        send(player, S2C.PONG, { t: msg.data?.t });
        break;
    }
  });

  ws.on('close', () => {
    if (!player) return;
    players.delete(player.id);
    broadcast(S2C.LEAVE, { id: player.id });
    broadcast(S2C.CHAT, { id: 0, name: '', text: `${player.name} left.`, at: Date.now() });
  });
  ws.on('error', () => {});
});

// --- the tick ---------------------------------------------------------------
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  world.update(dt, players);

  // damage the enemies dealt this tick
  for (const e of world.state.enemies.values()) {
    if (!e.hit) continue;
    const target = players.get(e.hit.target);
    if (target) send(target, S2C.ENTITY_HIT, { id: e.id, hp: e.hp, dmgToMe: e.hit.dmg });
    e.hit = null;
  }
}, 1000 / TICK_HZ);

// --- movement snapshot ------------------------------------------------------
setInterval(() => {
  if (!players.size) return;
  const all = [...players.values()].map((p) =>
    [p.id, r2(p.x), r2(p.y), r2(p.z), +p.f.toFixed(2), p.a]);
  broadcast(S2C.PLAYERS, all);
}, 1000 / RATES.worldSnapshot);

// --- per-player entity snapshot (interest-managed) --------------------------
setInterval(() => {
  for (const p of players.values()) {
    send(p, S2C.ENTITIES, world.snapshotFor(p));
  }
  const b = world.state.boss;
  broadcast(S2C.BOSS, b ? publicBoss(b) : null);
}, 1000 / RATES.worldSnapshot);

// --- clock + weather --------------------------------------------------------
setInterval(() => broadcast(S2C.CLOCK, world.clock()), 1000 / RATES.clock);

// --- drop dead sockets ------------------------------------------------------
setInterval(() => {
  for (const p of players.values()) {
    if (p.ws.isAlive === false) { p.ws.terminate(); continue; }
    p.ws.isAlive = false;
    p.ws.ping();
  }
}, 30000);

// --- helpers ----------------------------------------------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const publicPlayer = (p) => ({
  id: p.id, name: p.name, cls: p.cls, appearance: p.appearance,
  x: r2(p.x), y: r2(p.y), z: r2(p.z), f: +p.f.toFixed(2), lv: p.level,
  weapon: p.weapon || null, pet: p.pet || null, mount: p.mount || null,
});
const publicBoss = (b) => ({
  id: b.id, kind: b.kind, x: r2(b.x), z: r2(b.z), f: +b.f.toFixed(2),
  hp: Math.max(0, Math.round(b.hp)), hpMax: b.hpMax, phase: b.phase,
});

/** Appearance is drawn by every other client, so only numbers in known ranges
 *  are let through. A string where an index belongs would be a crash in
 *  somebody else's browser, not ours. */
function sanitiseAppearance(a) {
  const n = (v, hi) => clamp(Math.floor(Number(v) || 0), 0, hi);
  a = a || {};
  return {
    gender: a.gender === 'female' ? 'female' : 'male',
    skin: n(a.skin, 15), hairStyle: n(a.hairStyle, 23), hairColor: n(a.hairColor, 19),
    eyes: n(a.eyes, 11), accessory: n(a.accessory, 13),
    outfitStyle: n(a.outfitStyle, 9), outfit: n(a.outfit, 19),
    cape: a.cape === -1 || a.cape === undefined ? -1 : n(a.cape, 11),
    hat: typeof a.hat === 'string' ? a.hat.slice(0, 24) : null,
    back: typeof a.back === 'string' ? a.back.slice(0, 24) : null,
  };
}

http.listen(PORT, () => {
  console.log(`[semesta] game server listening on :${PORT} (protocol v${PROTOCOL_VERSION})`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log('[semesta] shutting down');
    broadcast(S2C.TOAST, { text: 'Server restarting — you will reconnect shortly.' });
    setTimeout(() => process.exit(0), 200);
  });
}
