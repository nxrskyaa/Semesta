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
export const PLAYTIME_TIERS = [
  { min: 5,  coins: 80,  label: '80 coins' },
  { min: 15, item: 'tonic', n: 3, label: 'Tonic x3' },
  { min: 30, item: 'forge_stone', n: 5, label: 'Forge Stone x5' },
  { min: 45, coins: 300, label: '300 coins' },
  { min: 60, cosmetic: 'trail_leaf', label: 'Leaf Trail', big: true },
];

// ---------------------------------------------------------------------------
// daily quest pool — three are drawn per day, seeded by the day number so a
// given day always shows the same board (no reroll-by-refresh)
// ---------------------------------------------------------------------------
const DQ_POOL = [
  { id: 'dq_slay',   label: 'Defeat 12 monsters',        goal: 12, ev: 'kill',    coins: 150, item: 'tonic', n: 2 },
  { id: 'dq_slay_l', label: 'Defeat 25 monsters',        goal: 25, ev: 'kill',    coins: 280, item: 'forge_stone', n: 3 },
  { id: 'dq_fish',   label: 'Catch 5 fish',              goal: 5,  ev: 'fish',    coins: 160, item: 'tonic', n: 2 },
  { id: 'dq_chest',  label: 'Open 3 treasure chests',    goal: 3,  ev: 'chest',   coins: 180, item: 'forge_stone', n: 2 },
  { id: 'dq_gather', label: 'Gather 10 wood or ore',     goal: 10, ev: 'gather',  coins: 170, item: 'iron_ore', n: 3 },
  { id: 'dq_plant',  label: 'Plant 4 crops',             goal: 4,  ev: 'plant',   coins: 140, item: 'seed_berry', n: 3 },
  { id: 'dq_harvest',label: 'Harvest 4 crops',           goal: 4,  ev: 'harvest', coins: 160, item: 'seed_wheat', n: 4 },
  { id: 'dq_cook',   label: 'Cook 2 meals',              goal: 2,  ev: 'cook',    coins: 150, item: 'green_herb', n: 3 },
  { id: 'dq_forge',  label: 'Forge your weapon once',    goal: 1,  ev: 'forge',   coins: 200, item: 'forge_stone', n: 4 },
  { id: 'dq_skill',  label: 'Cast 15 skills',            goal: 15, ev: 'skill',   coins: 150, item: 'tonic', n: 2 },
  { id: 'dq_boss',   label: 'Defeat a world boss',       goal: 1,  ev: 'boss',    coins: 500, item: 'forge_stone', n: 6 },
  { id: 'dq_gacha',  label: 'Spin the Wonder Capsules',  goal: 1,  ev: 'gacha',   coins: 120, item: 'tonic', n: 1 },
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
  function event(ev, amount = 1) {
    rollDay();
    let changed = false;
    for (const q of state.quests) {
      if (q.ev !== ev || q.done) continue;
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
