// Retention systems: a 30-day check-in calendar, session play-time milestones,
// and a daily quest board that rolls over every 24h.
//
// All three share one save blob and one rule: rewards are DESCRIBED here as
// plain data and GRANTED by a single `grant()` callback the caller supplies, so
// this module never reaches into the inventory itself.

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// 30-day check-in ladder. Day 7 / 14 / 21 are chunky, day 30 is the prize.
// `kind` drives the icon the panel shows.
// ---------------------------------------------------------------------------
export const CHECKIN_DAYS = [
  { d: 1,  coins: 60,  label: '60 coins' },
  { d: 2,  item: 'tonic', n: 2, label: 'Tonic x2' },
  { d: 3,  item: 'forge_stone', n: 3, label: 'Forge Stone x3' },
  { d: 4,  coins: 120, label: '120 coins' },
  { d: 5,  item: 'seed_berry', n: 4, label: 'Berry Seeds x4' },
  { d: 6,  item: 'iron_ore', n: 4, label: 'Iron Ore x4' },
  { d: 7,  cosmetic: 'hat_chef', label: 'Chef Toque', big: true },
  { d: 8,  coins: 180, label: '180 coins' },
  { d: 9,  item: 'hardwood', n: 6, label: 'Hardwood x6' },
  { d: 10, item: 'tonic', n: 5, label: 'Tonic x5' },
  { d: 11, item: 'forge_stone', n: 6, label: 'Forge Stone x6' },
  { d: 12, coins: 260, label: '260 coins' },
  { d: 13, item: 'seed_pumpkin', n: 4, label: 'Pumpkin Seeds x4' },
  { d: 14, cosmetic: 'back_shell', label: 'Turtle Shell', big: true },
  { d: 15, coins: 340, label: '340 coins' },
  { d: 16, item: 'iron_ore', n: 8, label: 'Iron Ore x8' },
  { d: 17, item: 'forge_stone', n: 8, label: 'Forge Stone x8' },
  { d: 18, item: 'tonic', n: 8, label: 'Tonic x8' },
  { d: 19, coins: 420, label: '420 coins' },
  { d: 20, cosmetic: 'trail_frost', label: 'Frost Trail', big: true },
  { d: 21, cosmetic: 'hat_pirate', label: 'Pirate Tricorn', big: true },
  { d: 22, coins: 520, label: '520 coins' },
  { d: 23, item: 'hardwood', n: 12, label: 'Hardwood x12' },
  { d: 24, item: 'forge_stone', n: 12, label: 'Forge Stone x12' },
  { d: 25, coins: 650, label: '650 coins' },
  { d: 26, cosmetic: 'back_balloon', label: 'Red Balloon', big: true },
  { d: 27, item: 'tonic', n: 12, label: 'Tonic x12' },
  { d: 28, coins: 800, label: '800 coins' },
  { d: 29, cosmetic: 'hat_pumpkin', label: 'Pumpkin Head', big: true },
  { d: 30, mount: 'mount_pebble', label: 'PEBBLE MOUNT', grand: true },
];

// ---------------------------------------------------------------------------
// play-time milestones, per session (they reset when the tab reloads)
// ---------------------------------------------------------------------------
// PLAY-TIME LADDER. It used to stop at an hour, which meant a long session had
// nothing left to reach for after the first sixty minutes. It now runs out to
// four hours, and the rewards get correspondingly serious at the top.
export const PLAYTIME_TIERS = [
  { min: 5,   coins: 80,  label: '80 coins' },
  { min: 15,  item: 'tonic', n: 3, label: 'Tonic x3' },
  { min: 30,  item: 'forge_stone', n: 5, label: 'Forge Stone x5' },
  { min: 60,  coins: 400, label: '400 coins' },
  { min: 120, cosmetic: 'trail_lantern', label: 'Lantern Trail', big: true },
  { min: 240, cosmetic: 'hat_antlers', label: 'Spirit Antlers', big: true, grand: true },
];

// ---------------------------------------------------------------------------
// daily quest pool — three are drawn per day, seeded by the day number so a
// given day always shows the same board (no reroll-by-refresh)
// ---------------------------------------------------------------------------
/**
 * DAILY QUEST POOL.
 *
 * The board used to be twelve flat counters — "defeat 12 monsters", "catch 5
 * fish" — which told you to keep doing what you were already doing. These ask
 * for something SPECIFIC: a named species, a place, a time of day, a rarity.
 * That is the difference between a checklist and a reason to go somewhere.
 *
 * `ev` is the event main.js already fires. `need` narrows it: `{ kind }` matches
 * an enemy id, `{ rarity }` a minimum rarity, `{ where }` a place ('sea',
 * 'lake', 'snow', 'island'), `{ when }` a time ('night', 'day'). A quest with no
 * `need` counts every event of that type, as before.
 */
const DQ_POOL = [
  // --- hunting: named prey, not "twelve of anything" ---
  { id: 'dq_slime',  label: 'Hunt 10 slimes',                 goal: 10, ev: 'kill', need: { kind: 'slime' },     coins: 170, item: 'tonic', n: 2 },
  { id: 'dq_boar',   label: 'Hunt 8 boars in the long grass', goal: 8,  ev: 'kill', need: { kind: 'boar' },      coins: 190, item: 'forge_stone', n: 2 },
  { id: 'dq_bat',    label: 'Hunt 10 bats after dark',        goal: 10, ev: 'kill', need: { when: 'night' },     coins: 210, item: 'tonic', n: 3 },
  { id: 'dq_frost',  label: 'Hunt 6 beasts in the snow',      goal: 6,  ev: 'kill', need: { where: 'snow' },     coins: 240, item: 'forge_stone', n: 3 },
  { id: 'dq_elite',  label: 'Bring down 3 elites',            goal: 3,  ev: 'kill', need: { elite: true },       coins: 320, item: 'forge_stone', n: 4 },
  { id: 'dq_boss',   label: 'Defeat a world boss',            goal: 1,  ev: 'boss',                              coins: 600, item: 'forge_stone', n: 6, big: true },
  { id: 'dq_slay_l', label: 'Clear 25 of the wilds',          goal: 25, ev: 'kill',                              coins: 300, item: 'forge_stone', n: 3 },

  // --- fishing: where and what, not just how many ---
  { id: 'dq_fish_sea',  label: 'Land 5 fish from the open sea', goal: 5, ev: 'fish', need: { where: 'sea' },     coins: 200, item: 'tonic', n: 2 },
  { id: 'dq_fish_lake', label: 'Land 6 fish from a lake',       goal: 6, ev: 'fish', need: { where: 'lake' },    coins: 190, item: 'seed_berry', n: 3 },
  { id: 'dq_fish_night',label: 'Fish 4 times under the stars',  goal: 4, ev: 'fish', need: { when: 'night' },    coins: 230, item: 'tonic', n: 3 },
  { id: 'dq_fish_rare', label: 'Land something RARE or better', goal: 1, ev: 'fish', need: { rarity: 'rare' },   coins: 350, item: 'forge_stone', n: 3, big: true },

  // --- going somewhere ---
  { id: 'dq_island', label: 'Set foot on an island',        goal: 1,  ev: 'island',                             coins: 260, item: 'tonic', n: 3 },
  { id: 'dq_sail',   label: 'Take a craft out on the water', goal: 1, ev: 'sail',                               coins: 180, item: 'tonic', n: 2 },
  { id: 'dq_camp',   label: 'Rest at 2 wilderness camps',   goal: 2,  ev: 'camp',                               coins: 200, item: 'green_herb', n: 3 },

  // --- the quiet work ---
  { id: 'dq_chest',  label: 'Open 3 treasure chests',       goal: 3,  ev: 'chest',                              coins: 200, item: 'forge_stone', n: 2 },
  { id: 'dq_gather', label: 'Gather 10 wood or ore',        goal: 10, ev: 'gather',                             coins: 180, item: 'iron_ore', n: 3 },
  { id: 'dq_harvest',label: 'Harvest 4 crops',              goal: 4,  ev: 'harvest',                            coins: 170, item: 'seed_wheat', n: 4 },
  { id: 'dq_cook',   label: 'Cook 3 meals',                 goal: 3,  ev: 'cook',                               coins: 190, item: 'green_herb', n: 3 },
  { id: 'dq_forge',  label: 'Forge your weapon once',       goal: 1,  ev: 'forge',                              coins: 220, item: 'forge_stone', n: 4 },
  { id: 'dq_gacha',  label: 'Spin the Wonder Capsules',     goal: 1,  ev: 'gacha',                              coins: 140, item: 'tonic', n: 1 },
];


// deterministic day-seeded shuffle so the board is stable within a day
function pickDaily(dayIndex) {
  const out = [];
  const pool = [...DQ_POOL];
  let seed = (dayIndex * 9301 + 49297) % 233280;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 3 && pool.length; i++) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }
  return out;
}

/** Local day number — check-ins roll over at local midnight, not on a timer. */
function dayNumber(ts = Date.now()) {
  const d = new Date(ts);
  return Math.floor((ts - d.getTimezoneOffset() * 60000) / DAY_MS);
}

/** Does what just happened satisfy a quest's narrowing conditions? */
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
function matches(need, info) {
  if (need.kind && info.kind !== need.kind) return false;
  if (need.elite && !info.elite) return false;
  if (need.where && info.where !== need.where) return false;
  if (need.when && info.when !== need.when) return false;
  if (need.rarity && (RARITY_RANK[info.rarity] ?? -1) < RARITY_RANK[need.rarity]) return false;
  return true;
}

export function createDailies({ grant, onToast, onBanner }) {
  const state = {
    streak: 0,          // how many calendar days claimed (1..30, wraps)
    lastDay: null,      // dayNumber of the last claim
    claimedToday: false,
    // daily quests
    qDay: null,         // dayNumber the board was drawn for
    quests: [],         // [{ id, label, goal, ev, coins, item, n, p, done, claimed }]
    // play-time (per session)
    sessionMs: 0,
    ptClaimed: [],      // minutes tiers already taken this session
  };

  function load(data) {
    if (!data) { rollDay(); return; }
    state.streak = data.streak || 0;
    state.lastDay = data.lastDay ?? null;
    state.qDay = data.qDay ?? null;
    state.quests = Array.isArray(data.quests) ? data.quests : [];
    rollDay();
  }

  function serialize() {
    return { streak: state.streak, lastDay: state.lastDay, qDay: state.qDay, quests: state.quests };
  }

  /** Refresh "is today claimed" + redraw the quest board if the day changed. */
  function rollDay() {
    const today = dayNumber();
    state.claimedToday = state.lastDay === today;
    // a gap of more than one day breaks the streak
    if (state.lastDay !== null && today - state.lastDay > 1) state.streak = 0;
    if (state.qDay !== today) {
      state.qDay = today;
      state.quests = pickDaily(today).map((q) => ({ ...q, p: 0, done: false, claimed: false }));
    }
  }

  // --- check-in ---
  function nextDayIndex() { return (state.streak % 30); }        // 0-based into CHECKIN_DAYS
  function canCheckIn() { rollDay(); return !state.claimedToday; }

  function checkIn() {
    rollDay();
    if (state.claimedToday) return null;
    const reward = CHECKIN_DAYS[nextDayIndex()];
    state.streak += 1;
    state.lastDay = dayNumber();
    state.claimedToday = true;
    grant(reward);
    onBanner?.(`DAY ${reward.d} CLAIMED — ${reward.label.toUpperCase()}`);
    return reward;
  }

  // --- play-time ---
  function tick(dt) {
    state.sessionMs += dt * 1000;
    const mins = state.sessionMs / 60000;
    for (const t of PLAYTIME_TIERS) {
      if (mins >= t.min && !state.ptClaimed.includes(t.min)) {
        state.ptClaimed.push(t.min);
        grant(t);
        onBanner?.(`${t.min} MINUTES — ${t.label.toUpperCase()}!`);
      }
    }
  }
  function playMinutes() { return state.sessionMs / 60000; }
  function nextPlaytimeTier() {
    return PLAYTIME_TIERS.find((t) => !state.ptClaimed.includes(t.min)) || null;
  }

  // --- daily quests ---
  /** Feed gameplay events in; returns true if something advanced. */
  /**
   * @param ev   the event id main.js fires
   * @param ctx  what happened, for quests that care: { kind, elite, rarity,
   *             where, when }. A quest with no `need` ignores it entirely, so
   *             every existing call site keeps working unchanged.
   */
  function event(ev, ctx = 1) {
    rollDay();
    // back-compat: event('kill', 2) still means "two of them"
    const amount = typeof ctx === 'number' ? ctx : (ctx.amount || 1);
    const info = typeof ctx === 'number' ? {} : ctx;
    let changed = false;
    for (const q of state.quests) {
      if (q.ev !== ev || q.done) continue;
      if (q.need && !matches(q.need, info)) continue;
      q.p = Math.min(q.goal, q.p + amount);
      changed = true;
      if (q.p >= q.goal) {
        q.done = true;
        onToast?.(`Daily quest complete: ${q.label}`);
      }
    }
    return changed;
  }

  function claimQuest(id) {
    const q = state.quests.find((x) => x.id === id);
    if (!q || !q.done || q.claimed) return null;
    q.claimed = true;
    grant(q);
    onBanner?.(`DAILY REWARD CLAIMED`);
    return q;
  }

  /** Pending things the HUD can badge: unclaimed check-in or finished quests. */
  function pending() {
    rollDay();
    return (state.claimedToday ? 0 : 1) + state.quests.filter((q) => q.done && !q.claimed).length;
  }

  return {
    state, load, serialize, rollDay,
    canCheckIn, checkIn, nextDayIndex,
    tick, playMinutes, nextPlaytimeTier,
    event, claimQuest, pending,
    CHECKIN_DAYS, PLAYTIME_TIERS,
  };
}
