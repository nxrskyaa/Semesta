// CINEMATICS — short camera shots that put a moment on screen properly.
//
// The game had exactly one way of saying "something important just happened":
// a line of gold text in the middle of the HUD. A world boss arriving, finding
// an island, a Hollow lord rising off its medallion and a crafted spoon all got
// the same banner, so none of them felt like more than the others.
//
// A cinematic here is a handful of SHOTS (each a function from 0..1 to a camera
// position and a look-at point), wrapped in letterbox bars and a title card. Three
// rules keep them from becoming the thing everybody skips:
//   * SHORT. Three to five seconds. Every one is skippable with any key or tap,
//     and the skip is swallowed so it cannot also swing a sword.
//   * NEVER A CUT BACK. It eases in from wherever the camera was and eases out
//     to exactly where the gameplay camera wants to be, so the world never jumps.
//   * THE WORLD SLOWS, IT DOES NOT STOP. Monsters and arrows run at 12% while a
//     shot plays, and the hero cannot be hurt — a boss intro that lets the boss
//     hit you during its own title card is a trap, and a frozen world reads as
//     a pause menu.
import * as THREE from 'three';

const CSS = `
#cine { position: fixed; inset: 0; z-index: 44; pointer-events: none; font-family: var(--font-body, inherit); }
#cine .bar { position: absolute; left: 0; right: 0; height: 0; background: #000;
  transition: height 0.55s cubic-bezier(.6,0,.2,1); }
#cine .bar.t { top: 0; } #cine .bar.b { bottom: 0; }
#cine.on .bar { height: 11vh; }
#cine .card { position: absolute; left: max(6vw, 22px); bottom: calc(11vh + 22px); max-width: 80vw;
  text-shadow: 0 3px 0 rgba(0,0,0,0.8), 0 0 22px rgba(0,0,0,0.65); opacity: 0; transition: opacity 0.5s; }
#cine .card.show { opacity: 1; }
#cine .k { font-family: var(--font-display, inherit); font-size: 10px; letter-spacing: 5px; color: var(--acc, #ffd36a); }
#cine h2 { margin: 6px 0 0; font-family: var(--font-display, inherit); font-weight: normal; color: #fff6e0;
  font-size: clamp(22px, 4.4vw, 46px); letter-spacing: 0.1em; line-height: 1.05; }
#cine h2 span { display: inline-block; opacity: 0; transform: translateY(10px); }
#cine .card.show h2 span { animation: cn-l 0.6s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes cn-l { to { opacity: 1; transform: none; } }
#cine .r { height: 2px; width: 0; margin: 10px 0 8px; background: linear-gradient(90deg, var(--acc, #ffd36a), transparent); }
#cine .card.show .r { animation: cn-r 1.1s cubic-bezier(.2,.8,.2,1) 0.3s forwards; }
@keyframes cn-r { to { width: min(300px, 55vw); } }
#cine .s { font-size: 12px; letter-spacing: 2px; color: #ddd6f2; opacity: 0; transition: opacity 0.6s 0.5s; }
#cine .card.show .s { opacity: 1; }
#cine .skip { position: absolute; right: max(4vw, 16px); bottom: calc(5.5vh - 6px); font-size: 9px;
  letter-spacing: 2px; color: rgba(255,255,255,0.4); opacity: 0; transition: opacity 0.4s; }
#cine.on .skip { opacity: 1; transition-delay: 0.9s; }
body.cine #hud, body.cine #touchui, body.cine #chat, body.cine #fgauge { opacity: 0 !important; transition: opacity 0.35s; pointer-events: none !important; }

/* PLACE TITLE — the small one. No camera, no bars: a name that fades in at
   the top of the screen when you reach somewhere, the way old adventure games
   told you where you were. */
#placecard { position: fixed; left: 50%; top: 15%; transform: translateX(-50%); z-index: 27; pointer-events: none;
  text-align: center; font-family: var(--font-body, inherit); opacity: 0; transition: opacity 0.8s;
  text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.6); width: max-content; max-width: 88vw; }
#placecard.show { opacity: 1; }
#placecard .k { font-family: var(--font-display, inherit); font-size: 8px; letter-spacing: 4px; color: #ffd36a; }
#placecard .t { font-family: var(--font-display, inherit); font-size: clamp(16px, 2.6vw, 26px); letter-spacing: 0.14em; color: #fff6e0; margin-top: 4px; }
#placecard .l { height: 1px; margin: 7px auto 6px; width: 0; background: linear-gradient(90deg, transparent, #ffd36a, transparent); transition: width 1.2s 0.2s; }
#placecard.show .l { width: 100%; }
#placecard .s { font-size: 10px; letter-spacing: 1px; color: #d8d2ec; }
body.touch #placecard { top: 30%; }
@media (prefers-reduced-motion: reduce) { #cine .bar { transition: none; } }
`;

const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);

/** Camera on a circle round `c`, from angle a0 to a1, looking at `look`. */
export function orbit(c, radius, height, a0, a1, lookY = 1.2, r1 = radius, h1 = height) {
  return (k, pos, look) => {
    const e = ease(k);
    const a = a0 + (a1 - a0) * e;
    const r = radius + (r1 - radius) * e;
    pos.set(c.x + Math.sin(a) * r, c.y + height + (h1 - height) * e, c.z + Math.cos(a) * r);
    look.set(c.x, c.y + lookY, c.z);
  };
}

/** A straight move from p0 to p1 while the aim slides from l0 to l1. */
export function dolly(p0, p1, l0, l1 = l0, shape = ease) {
  return (k, pos, look) => {
    const e = shape(k);
    pos.lerpVectors(p0, p1, e);
    look.lerpVectors(l0, l1, e);
  };
}
export { ease, easeOut };

export function createCinematics({ camera, followPose }) {
  // followPose(outPos, outLook): where the gameplay camera wants to be NOW
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'cine';
  root.innerHTML = `<div class="bar t"></div><div class="bar b"></div>
    <div class="card"><div class="k"></div><h2></h2><div class="r"></div><div class="s"></div></div>
    <div class="skip">ANY KEY · SKIP</div>`;
  document.body.appendChild(root);
  const card = root.querySelector('.card');
  const place = document.createElement('div');
  place.id = 'placecard';
  place.innerHTML = '<div class="k"></div><div class="t"></div><div class="l"></div><div class="s"></div>';
  document.body.appendChild(place);

  const BLEND_IN = 0.7, BLEND_OUT = 0.9;
  let cur = null;              // the sequence playing
  const queue = [];
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const fromPos = new THREE.Vector3(), fromLook = new THREE.Vector3();
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  const lastPos = new THREE.Vector3(), lastLook = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  function setCard(c) {
    if (!c) { card.classList.remove('show'); return; }
    root.style.setProperty('--acc', c.accent || '#ffd36a');
    card.querySelector('.k').textContent = c.kicker || '';
    card.querySelector('h2').innerHTML = [...(c.title || '')].map((ch, i) => ch === ' '
      ? '<span>&nbsp;</span>'
      : `<span style="animation-delay:${(0.15 + i * 0.04).toFixed(2)}s">${ch.replace(/[<>&]/g, '')}</span>`).join('');
    card.querySelector('.s').textContent = c.sub || '';
    card.classList.remove('show');
    void card.offsetWidth;                 // restart the letter animation
    card.classList.add('show');
  }

  function start(seq) {
    cur = { ...seq, i: 0, t: 0, phase: 'shots', total: 0, outT: 0 };
    // where the camera is looking right now, so the first shot eases out of it
    fromPos.copy(camera.position);
    camera.getWorldDirection(_dir);
    fromLook.copy(camera.position).addScaledVector(_dir, 14);
    root.classList.add('on');
    document.body.classList.add('cine');
    setTimeout(() => { if (cur && cur.card) setCard(cur.card); }, 380);
    seq.onStart?.();
  }

  /**
   * seq: { shots: [{ dur, path(k, pos, look) }], card?: {kicker,title,sub,accent},
   *        slow?: world time scale, onStart?, onEnd?, priority? }
   */
  function play(seq) {
    if (!seq?.shots?.length) return false;
    if (cur) {
      if (queue.length < 2) queue.push(seq);
      return true;
    }
    start(seq);
    return true;
  }

  function finish() {
    const done = cur;
    cur = null;
    setCard(null);
    root.classList.remove('on');
    document.body.classList.remove('cine');
    done?.onEnd?.();
    if (queue.length) setTimeout(() => { if (!cur && queue.length) start(queue.shift()); }, 350);
  }

  /** Skip straight to the ease back to the gameplay camera. */
  function skip() {
    if (!cur || cur.phase === 'out') return;
    cur.phase = 'out';
    cur.outT = 0;
    lastPos.copy(camera.position);
    camera.getWorldDirection(_dir);
    lastLook.copy(camera.position).addScaledVector(_dir, 14);
    setCard(null);
    root.classList.remove('on');
  }

  // ANY key or tap skips — and is SWALLOWED, so the key that skipped the boss
  // intro does not also open the bag or swing at the boss
  const swallow = (e) => {
    if (!cur) return;
    if (e.type === 'keydown' && (e.repeat || e.key === 'Shift' || e.key === 'Meta')) return;
    if (cur.phase !== 'out' && cur.total > 0.35) skip();
    e.stopImmediatePropagation();
    if (e.cancelable && e.type !== 'keydown') e.preventDefault();
  };
  for (const ev of ['keydown', 'mousedown', 'pointerdown', 'touchstart']) {
    window.addEventListener(ev, swallow, { capture: true, passive: false });
  }

  /** Returns true while it owns the camera this frame. */
  function update(dt) {
    if (!cur) return false;
    cur.total += dt;
    if (cur.phase === 'shots') {
      const shot = cur.shots[cur.i];
      cur.t += dt;
      const k = Math.min(1, cur.t / shot.dur);
      shot.path(k, pos, look);
      // ease out of wherever the camera was into the first shot
      if (cur.i === 0 && cur.t < BLEND_IN) {
        const b = ease(cur.t / BLEND_IN);
        pos.lerpVectors(fromPos, pos, b);
        look.lerpVectors(fromLook, look, b);
      }
      lastPos.copy(pos); lastLook.copy(look);
      if (k >= 1) {
        cur.i++;
        cur.t = 0;
        if (cur.i >= cur.shots.length) {
          cur.phase = 'out';
          cur.outT = 0;
          setCard(null);
          root.classList.remove('on');
        }
      }
    } else {
      // ease back to exactly where the gameplay camera wants to be
      cur.outT += dt;
      const b = ease(Math.min(1, cur.outT / BLEND_OUT));
      followPose(goalPos, goalLook);
      pos.lerpVectors(lastPos, goalPos, b);
      look.lerpVectors(lastLook, goalLook, b);
      if (b >= 1) {
        camera.position.copy(goalPos);
        camera.lookAt(goalLook);
        finish();
        return true;
      }
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    return true;
  }

  let placeTimer = null;
  /** The small place title: no camera, no bars. */
  function placeTitle(kicker, title, sub = '') {
    if (cur) return;                          // a cinematic is already saying it
    place.querySelector('.k').textContent = kicker || '';
    place.querySelector('.t').textContent = title;
    place.querySelector('.s').textContent = sub;
    place.classList.remove('show');
    void place.offsetWidth;
    place.classList.add('show');
    clearTimeout(placeTimer);
    placeTimer = setTimeout(() => place.classList.remove('show'), 3600);
  }

  return {
    play, skip, update, placeTitle,
    active: () => !!cur,
    /** world time scale while a shot plays (the ease-out runs at full speed) */
    worldScale: () => (cur && cur.phase === 'shots' ? (cur.slow ?? 0.12) : 1),
    busy: () => !!cur || queue.length > 0,
  };
}
