// WIND.
//
// A world where every blade of grass is welded still reads as a diorama, however
// much is in it. Wind is the cheapest life you can add: one global vector that
// slowly changes direction and strength, and a scatter of things carried on it.
//
// Two parts:
//  1. A SHARED STATE anything can read — `wind.dir`, `wind.strength`, and
//     `sway(phase)` for a value already in the right rhythm. Trees, banners,
//     lanterns and crops all lean off the same source, so the whole world moves
//     TOGETHER rather than each prop wobbling on its own private sine. That
//     coherence is the difference between "windy" and "everything is jittering".
// There are deliberately NO drifting motes. A first pass carried leaves across
// the screen on the wind; they read as debris ON THE CAMERA rather than in the
// world, and constantly crossing the middle of the view is distracting in a game
// you are trying to aim in. The wind is better felt through what it MOVES —
// cloth, lanterns, flowers — than through litter flying past your face.

const TAU = Math.PI * 2;

export function buildWind() {
  const state = {
    dir: Math.random() * TAU,     // where it is blowing TO
    target: 0,
    strength: 0.55,               // 0..1
    targetStrength: 0.55,
    gust: 0,                      // short-lived surge on top
    t: 0,
  };
  state.target = state.dir;

  /**
   * A sway value in the wind's own rhythm, for anything that leans.
   * @param phase per-object offset so a whole treeline does not move in lockstep
   */
  function sway(phase = 0) {
    return Math.sin(state.t * 1.1 + phase) * (0.35 + state.strength * 0.65)
      + Math.sin(state.t * 2.7 + phase * 1.7) * 0.25 * state.strength
      + state.gust * 0.8;
  }

  function update(dt) {
    state.t += dt;
    // the wind WANDERS: a new heading and strength every so often, eased into,
    // so it never snaps and never sits perfectly still
    if (Math.random() < dt * 0.06) {
      state.target = state.dir + (Math.random() - 0.5) * 1.6;
      state.targetStrength = 0.25 + Math.random() * 0.7;
    }
    state.dir += (state.target - state.dir) * Math.min(1, dt * 0.35);
    state.strength += (state.targetStrength - state.strength) * Math.min(1, dt * 0.2);
    // gusts: rare, sharp, and they decay
    if (Math.random() < dt * 0.11) state.gust = 0.35 + Math.random() * 0.5;
    state.gust *= Math.pow(0.25, dt);
  }

  function dispose() {}

  return { state, sway, update, dispose };
}
