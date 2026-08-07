// THE NETWORK CLIENT.
//
// Connects to the game server, sends where this player is, and hands everything
// coming back to callbacks. It knows nothing about three.js — rendering remote
// players is src/net/remote.js's job — so this file can be reasoned about and
// tested on its own.
//
// The single most important behaviour here is that MULTIPLAYER IS OPTIONAL. If
// there is no server URL, if the box is down, if the player is on a train — the
// game runs exactly as it does today. `connect()` failing is a normal outcome,
// not an error state. Everything is wrapped so a network problem can never take
// the game loop down with it.

import { C2S, S2C, PROTOCOL_VERSION, RATES, encode, decode } from './protocol.js';

const SERVER_URL = import.meta.env?.VITE_GAME_SERVER || '';

export const serverConfigured = () => !!SERVER_URL;

export function createNetClient(handlers = {}) {
  const state = {
    connected: false,
    id: null,
    ping: 0,
    players: new Map(),     // id -> { name, cls, appearance, x, y, z, f, a, lv }
    lastError: null,
    attempts: 0,
  };

  let ws = null;
  let sendTimer = null;
  let pingTimer = null;
  let reconnectTimer = null;
  let closedOnPurpose = false;
  let getLocal = () => null;   // supplied by connect()

  function log(...a) { if (import.meta.env?.DEV) console.log('[net]', ...a); }

  function connect(identity, localStateFn) {
    if (!SERVER_URL) return false;
    getLocal = localStateFn;
    closedOnPurpose = false;
    try {
      ws = new WebSocket(SERVER_URL);
    } catch (e) {
      state.lastError = e.message;
      scheduleReconnect(identity, localStateFn);
      return false;
    }

    ws.onopen = () => {
      state.attempts = 0;
      ws.send(encode(C2S.HELLO, { ...identity, protocol: PROTOCOL_VERSION }));
    };

    ws.onmessage = (ev) => {
      const msg = decode(ev.data);
      if (!msg) return;
      try { route(msg); } catch (e) { console.warn('[net] handler threw:', e); }
    };

    ws.onclose = () => {
      const was = state.connected;
      state.connected = false;
      stopTimers();
      state.players.clear();
      if (was) handlers.onDisconnect?.();
      if (!closedOnPurpose) scheduleReconnect(identity, localStateFn);
    };

    ws.onerror = () => { state.lastError = 'connection failed'; };
    return true;
  }

  /**
   * Reconnect with backoff. A server restart should not mean the player has to
   * reload the page — Semesta's world regenerates from seeds, so rejoining is
   * seamless and there is nothing to resynchronise but position.
   */
  function scheduleReconnect(identity, localStateFn) {
    clearTimeout(reconnectTimer);
    state.attempts++;
    const wait = Math.min(15000, 1000 * Math.pow(1.6, Math.min(6, state.attempts)));
    handlers.onReconnecting?.(Math.round(wait / 1000), state.attempts);
    reconnectTimer = setTimeout(() => connect(identity, localStateFn), wait);
  }

  function route({ type, data }) {
    switch (type) {
      case S2C.WELCOME: {
        state.connected = true;
        state.id = data.id;
        state.players.clear();
        for (const p of data.players || []) state.players.set(p.id, { ...p, tx: p.x, ty: p.y, tz: p.z });
        handlers.onConnect?.(data);
        if (data.clock) handlers.onClock?.(data.clock);
        if (data.boss) handlers.onBoss?.(data.boss);
        startTimers();
        break;
      }
      case S2C.REJECT:
        closedOnPurpose = true;
        handlers.onReject?.(data?.reason || 'Rejected by the server.');
        break;

      case S2C.JOIN:
        state.players.set(data.id, { ...data, tx: data.x, ty: data.y, tz: data.z });
        handlers.onJoin?.(data);
        break;

      case S2C.LEAVE:
        state.players.delete(data.id);
        handlers.onLeave?.(data.id);
        break;

      case S2C.PLAYERS: {
        // Positions arrive as TARGETS, not as truth. The renderer eases toward
        // them, which is what turns 8 updates a second into smooth movement —
        // snapping to each packet is what makes networked characters stutter.
        for (const [id, x, y, z, f, a] of data) {
          if (id === state.id) continue;
          const p = state.players.get(id);
          if (!p) continue;
          p.tx = x; p.ty = y; p.tz = z; p.tf = f; p.a = a;
        }
        break;
      }

      case S2C.ENTITIES: handlers.onEntities?.(data); break;
      case S2C.ENTITY_HIT: handlers.onEntityHit?.(data); break;
      case S2C.ENTITY_GONE: handlers.onEntityGone?.(data.ids || []); break;
      case S2C.BOSS: handlers.onBoss?.(data); break;
      case S2C.CLOCK: handlers.onClock?.(data); break;
      case S2C.CHAT: handlers.onChat?.(data); break;
      case S2C.FARM: handlers.onFarm?.(data); break;
      case S2C.TOAST: handlers.onToast?.(data?.text); break;
      case S2C.PONG:
        state.ping = Math.round(performance.now() - (data?.t || 0));
        break;
    }
  }

  function startTimers() {
    stopTimers();
    sendTimer = setInterval(() => {
      if (!state.connected || ws?.readyState !== 1) return;
      const s = getLocal?.();
      if (!s) return;
      ws.send(encode(C2S.STATE, s));
    }, 1000 / RATES.playerState);
    pingTimer = setInterval(() => {
      if (ws?.readyState === 1) ws.send(encode(C2S.PING, { t: performance.now() }));
    }, 1000 / RATES.ping);
  }
  function stopTimers() { clearInterval(sendTimer); clearInterval(pingTimer); }

  const raw = (type, data) => { if (ws?.readyState === 1) ws.send(encode(type, data)); };

  return {
    state,
    connect,
    disconnect() { closedOnPurpose = true; clearTimeout(reconnectTimer); stopTimers(); ws?.close(); },
    chat: (text) => raw(C2S.CHAT, { text }),
    attack: (id, dmg, skill) => raw(C2S.ATTACK, { id, dmg, skill }),
    interact: (payload) => raw(C2S.INTERACT, payload),
    isOnline: () => state.connected,
  };
}
