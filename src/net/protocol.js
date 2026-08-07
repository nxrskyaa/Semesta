// THE WIRE PROTOCOL.
//
// Shared, character for character, between the server and the browser client —
// server/src/protocol.js and src/net/protocol.js are the same file. If they ever
// drift, the bugs are silent and awful, so keep them identical.
//
// Everything is JSON. That is a deliberate choice: at the message rates this
// game needs (players at 10Hz, entities at 8Hz, a few dozen players) JSON costs
// a fraction of a modern connection, and being able to read the traffic in the
// browser's network tab is worth far more during development than the bytes a
// binary format would save. If the player count ever makes that false, the place
// to change it is here and nowhere else.

/** Bumped whenever a message shape changes. The server rejects mismatches. */
export const PROTOCOL_VERSION = 1;

/** How often each side sends, in Hz. */
export const RATES = {
  playerState: 10,     // client -> server: my position and pose
  worldSnapshot: 8,    // server -> client: entities near you
  clock: 0.2,          // server -> client: time of day + weather, every 5s
  ping: 0.5,
};

/** Nothing beyond this radius is sent to a player. Interest management is the
 *  single most important optimisation in a shared world: without it every
 *  client pays for every entity in the map. */
export const INTEREST_RADIUS = 70;

export const C2S = {
  HELLO: 'hello',            // { token, name, appearance, cls }
  STATE: 'st',               // { x, z, y, f, a } position, facing, anim
  CHAT: 'chat',              // { text }
  ATTACK: 'atk',             // { targetId, dmg, skill }
  INTERACT: 'int',           // { kind, id }  e.g. plant/harvest/gather
  PING: 'ping',              // { t }
};

export const S2C = {
  WELCOME: 'welcome',        // { id, seed, tick, players[], clock }
  REJECT: 'reject',          // { reason }
  JOIN: 'join',              // { id, name, appearance, cls }
  LEAVE: 'leave',            // { id }
  PLAYERS: 'pl',             // [{ id, x, y, z, f, a }]  — the movement snapshot
  ENTITIES: 'en',            // [{ id, t, x, y, z, f, hp, hpMax, lv, elite }]
  ENTITY_GONE: 'eg',         // { ids: [] }
  ENTITY_HIT: 'eh',          // { id, hp, by }
  BOSS: 'boss',              // { id, kind, x, z, hp, hpMax, phase } | null
  CLOCK: 'clock',            // { time, weather, tick }
  CHAT: 'chat',              // { id, name, text, at }
  FARM: 'farm',              // [{ i, seed, stage, owner }]
  PONG: 'pong',              // { t }
  TOAST: 'toast',            // { text }
};

/** Cheap, dependency-free message framing. */
export const encode = (type, data) => JSON.stringify([type, data]);
export function decode(raw) {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || typeof v[0] !== 'string') return null;
    return { type: v[0], data: v[1] };
  } catch {
    return null;
  }
}

/** Positions are rounded before they go on the wire: two decimal places is far
 *  below what anyone can see at this camera distance, and it roughly halves the
 *  size of a movement snapshot. */
export const r2 = (n) => Math.round(n * 100) / 100;
