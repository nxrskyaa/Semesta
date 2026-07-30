// Graphics quality: four presets, five individually overridable groups.
//
// The knobs here were picked from what THIS game actually spends a frame on,
// not from a generic options menu:
//
//   * the sun's shadow map is 3072x3072 — the single most expensive pass
//   * the world holds tens of thousands of decor instances (trees x6 canopy
//     blobs, rocks, tufts, flowers, bushes) plus 110 fireflies & 22 butterflies
//   * the sea is an 84x84 plane whose vertices are rewritten every frame
//   * 12 lantern point lights each add a per-pixel term to every lit material
//   * render scale is quadratic on fill rate — the biggest single win
//
// Deliberately NOT a knob: texture resolution. Every texture is procedural
// pixel art (the terrain atlas is 80x80px, NearestFilter, no mipmaps), so
// there is nothing to scale down — a texture slider would be pure theatre.

const KEY = 'semesta.gfx.v1';

export const PRESETS = ['low', 'medium', 'high', 'ultra'];

export const PRESET_LABEL = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', ultra: 'ULTRA',
};

// A preset is just a set of group choices, so "preset + one override" stays a
// coherent state instead of a special case.
const PRESET_GROUPS = {
  low:    { res: 'low',   shadows: 'off',   fx: 'minimal', detail: 'sparse', view: 'near' },
  medium: { res: 'mid',   shadows: 'soft',  fx: 'normal',  detail: 'sparse', view: 'mid' },
  high:   { res: 'full',  shadows: 'soft',  fx: 'full',    detail: 'normal', view: 'far' },
  ultra:  { res: 'crisp', shadows: 'sharp', fx: 'full',    detail: 'lush',   view: 'far' },
};

// `live: true` = takes effect the instant it changes.
// `live: false` = baked into the world at build time, needs a fresh run.
export const GROUPS = [
  {
    id: 'res', label: 'RESOLUTION', live: true,
    hint: 'Render scale. The biggest single win on a slow GPU.',
    options: [
      { v: 'low', label: '60%' }, { v: 'mid', label: '80%' },
      { v: 'full', label: '100%' }, { v: 'crisp', label: '125%' },
    ],
  },
  {
    id: 'shadows', label: 'SHADOWS', live: true,
    hint: 'The sun\'s shadow pass — brutal on integrated graphics.',
    options: [
      { v: 'off', label: 'OFF' }, { v: 'soft', label: 'SOFT' }, { v: 'sharp', label: 'SHARP' },
    ],
  },
  {
    id: 'fx', label: 'VISUAL FX', live: true,
    hint: 'Particles, skill FX, weather, fireflies.',
    options: [
      { v: 'minimal', label: 'MINIMAL' }, { v: 'normal', label: 'NORMAL' }, { v: 'full', label: 'FULL' },
    ],
  },
  {
    id: 'detail', label: 'WORLD DETAIL', live: false,
    hint: 'Trees, rocks, flowers, lantern lights, water mesh.',
    options: [
      { v: 'sparse', label: 'SPARSE' }, { v: 'normal', label: 'NORMAL' }, { v: 'lush', label: 'LUSH' },
    ],
  },
  {
    id: 'view', label: 'DRAW DISTANCE', live: true,
    hint: 'How far the horizon draws before fog closes it.',
    options: [
      { v: 'near', label: 'NEAR' }, { v: 'mid', label: 'MID' }, { v: 'far', label: 'FAR' },
    ],
  },
];

const LIVE_GROUPS = new Set(GROUPS.filter((g) => g.live).map((g) => g.id));

// group choice -> concrete engine values
const KNOBS = {
  res: { low: 0.6, mid: 0.8, full: 1.0, crisp: 1.25 },
  shadows: {
    off:   { on: false, size: 1024 },
    soft:  { on: true,  size: 1536 },
    sharp: { on: true,  size: 3072 },
  },
  fx: {
    minimal: { particles: 0.3,  weather: 0.3,  fireflies: 0.25, trails: false },
    normal:  { particles: 0.7,  weather: 0.65, fireflies: 0.6,  trails: true },
    full:    { particles: 1,    weather: 1,    fireflies: 1,    trails: true },
  },
  detail: {
    sparse: { decor: 0.3,  lights: 0,  critters: 0,   waterSeg: 28, fogDensity: 0.03 },
    normal: { decor: 0.65, lights: 6,  critters: 0.5, waterSeg: 52, fogDensity: 0.024 },
    lush:   { decor: 1,    lights: 12, critters: 1,   waterSeg: 84, fogDensity: 0.022 },
  },
  view: { near: 110, mid: 160, far: 220 },
};

// ---------------------------------------------------------------------------
// stored state: a preset plus any per-group overrides layered on top
// ---------------------------------------------------------------------------
function autoPreset() {
  // Phones stay conservative. Otherwise use the coarse hints the browser gives
  // us — few cores or little reported memory is a decent "potato" signal.
  const touch = typeof window !== 'undefined'
    && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  if (touch) return 'low';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null;
  if (cores <= 4 || (mem !== null && mem <= 4)) return 'medium';
  return 'high';
}

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && PRESETS.includes(raw.preset)) {
      return { preset: raw.preset, overrides: raw.overrides || {}, auto: false };
    }
  } catch { /* corrupt or blocked storage: fall through to autodetect */ }
  return { preset: autoPreset(), overrides: {}, auto: true };
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ preset: state.preset, overrides: state.overrides }));
  } catch { /* storage full/blocked: settings just won't survive a reload */ }
}

const listeners = new Set();
export function onQualityChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(changed) {
  for (const fn of listeners) fn(getQuality(), changed);
}

/** The group choice actually in force for `id` (override, else the preset's). */
export function choiceOf(id) {
  return state.overrides[id] ?? PRESET_GROUPS[state.preset][id];
}

export function getPreset() { return state.preset; }
export function isAuto() { return state.auto; }

/** True once any group has been pushed away from its preset value. */
export function isCustom() {
  return Object.keys(state.overrides).some((id) => state.overrides[id] !== PRESET_GROUPS[state.preset][id]);
}

/** Resolved engine values — what the renderer and world builders read. */
export function getQuality() {
  const sh = KNOBS.shadows[choiceOf('shadows')];
  const fx = KNOBS.fx[choiceOf('fx')];
  const det = KNOBS.detail[choiceOf('detail')];
  return {
    preset: state.preset,
    renderScale: KNOBS.res[choiceOf('res')],
    shadows: sh.on,
    shadowSize: sh.size,
    particleScale: fx.particles,
    weatherScale: fx.weather,
    fireflyScale: fx.fireflies,
    trails: fx.trails,
    decorScale: det.decor,
    lanternLights: det.lights,
    critterScale: det.critters,
    waterSegments: det.waterSeg,
    fogDensity: det.fogDensity,
    drawDistance: KNOBS.view[choiceOf('view')],
  };
}

/** Switching preset clears overrides — otherwise the new preset wouldn't stick. */
export function setPreset(preset) {
  if (!PRESETS.includes(preset)) return;
  state = { preset, overrides: {}, auto: false };
  persist();
  notify('preset');
}

export function setOverride(groupId, value) {
  if (!KNOBS[groupId] || !(value in KNOBS[groupId])) return;
  state.overrides[groupId] = value;
  state.auto = false;
  persist();
  notify(groupId);
}

/** Whether a group's change shows up now, or only on the next world build. */
export function isLive(groupId) { return LIVE_GROUPS.has(groupId); }

/**
 * Groups whose current value differs from what the running world was built
 * with — the panel marks these "NEXT RUN" instead of pretending the change
 * already happened.
 */
export function pendingAgainst(builtWith) {
  if (!builtWith) return [];
  return GROUPS.filter((g) => !g.live && builtWith[g.id] !== choiceOf(g.id)).map((g) => g.id);
}

/** Snapshot of the non-live choices, taken when the world is built. */
export function buildSnapshot() {
  const snap = {};
  for (const g of GROUPS) if (!g.live) snap[g.id] = choiceOf(g.id);
  return snap;
}
