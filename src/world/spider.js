// SPIDER — the basecamp cat.
//
// In Rialo Temple Play, Spider is Eric Argent's pet and follows him around
// sniffing out Bridge Gate messages. Here she is a small black cat who has the
// run of the plaza, and she is the one creature in Semesta that reacts to being
// TOUCHED rather than to being fought, farmed or sold.
//
// The whole thing lives or dies on the gestures. A cat that just walks in
// circles is a prop; a cat that stops, sits, washes a paw, stretches, and then
// notices you and comes over is a character. So the AI is a small state machine
// of cat behaviours with unequal weights — mostly sitting, occasionally
// grooming, rarely doing anything energetic — because that is the actual ratio
// a cat lives at.
//
// She has no combat, no drops and no quest. She is here because a basecamp with
// a cat in it feels lived in and one without does not.

import * as THREE from 'three';
import { boxMesh, sphereMesh, sharedMat } from '../gfx/meshcache.js';

const SAY = 'Grialo, spider is here! miaw miaw';

// how close before she notices you and comes over to be affectionate
const NOTICE = 5.5;
const NUZZLE = 1.5;
// She stops at NUZZLE and does not set off again until NUZZLE_OUT. Without the
// gap she oscillated across the stop distance at framerate.
const NUZZLE_OUT = 2.3;

const BUB_W = 512, BUB_H = 96;

/** Her speech bubble. Same canvas-sprite trick the remote players use. */
function makeBubble(text) {
  const c = document.createElement('canvas');
  c.width = BUB_W; c.height = BUB_H;
  const ctx = c.getContext('2d');
  // MEASURE, then shrink to fit. The line is a fixed string but the webfont
  // may or may not have loaded, so the width it actually renders at is not
  // something to assume — it was overflowing a 320px canvas and getting clipped.
  let size = 26;
  ctx.font = `${size}px "Pixelify Sans", system-ui, sans-serif`;
  while (size > 13 && ctx.measureText(text).width > BUB_W - 44) {
    size -= 1;
    ctx.font = `${size}px "Pixelify Sans", system-ui, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.min(BUB_W - 8, ctx.measureText(text).width + 36);
  const h = 46, x = (BUB_W - w) / 2, y = 4;
  ctx.fillStyle = 'rgba(18,14,22,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ff9ad8';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = 'rgba(18,14,22,0.92)';
  ctx.beginPath();
  ctx.moveTo(BUB_W / 2 - 8, y + h - 1);
  ctx.lineTo(BUB_W / 2 + 8, y + h - 1);
  ctx.lineTo(BUB_W / 2, y + h + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9f6';
  ctx.fillText(text, BUB_W / 2, y + h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(3.6, 0.68, 1);
  spr.renderOrder = 22;
  spr.position.y = 1.5;
  return spr;
}

/** A small black cat. Chibi proportions to match the villagers: big head,
 *  short body, and eyes far too large for either. */
function buildSpider() {
  const g = new THREE.Group();
  const FUR = '#211d26';          // not pure black — pure black loses all form
  const FUR_HI = '#332c3c';

  const body = boxMesh(0.34, 0.26, 0.5, FUR);
  body.position.y = 0.3;
  g.add(body);
  const rump = boxMesh(0.3, 0.24, 0.18, FUR_HI);
  rump.position.set(0, 0.31, -0.24);
  g.add(rump);

  // the head pivots, so she can look at you
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.42, 0.26);
  g.add(headPivot);
  const head = boxMesh(0.36, 0.32, 0.3, FUR);
  headPivot.add(head);
  const muzzle = boxMesh(0.16, 0.1, 0.08, FUR_HI);
  muzzle.position.set(0, -0.08, 0.18);
  headPivot.add(muzzle);
  const nose = boxMesh(0.05, 0.04, 0.03, '#ff9ad8');
  nose.position.set(0, -0.05, 0.23);
  headPivot.add(nose);

  // ears twitch independently — the cheapest, most catlike motion there is
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.12, 0.17, 0);
    const shell = boxMesh(0.1, 0.14, 0.05, FUR);
    ear.add(shell);
    const inner = boxMesh(0.05, 0.08, 0.02, '#ff9ad8');
    inner.position.set(0, -0.01, 0.03);
    ear.add(inner);
    headPivot.add(ear);
    ears.push(ear);
  }

  // big glossy eyes, per the art direction
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = sphereMesh(0.075, '#8ad86e');
    e.position.set(sx * 0.09, 0.02, 0.155);
    headPivot.add(e);
    eyes.push(e);
    const pupil = sphereMesh(0.035, '#120f16');
    pupil.position.set(sx * 0.095, 0.02, 0.205);
    headPivot.add(pupil);
    const glint = sphereMesh(0.018, '#ffffff');
    glint.position.set(sx * 0.075, 0.05, 0.215);
    headPivot.add(glint);
  }

  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = boxMesh(0.09, 0.2, 0.09, FUR);
    l.position.set(sx * 0.12, 0.1, sz * 0.16);
    g.add(l);
    legs.push(l);
  }

  // the tail: three segments on nested pivots, so it can curl and flick
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 0.38, -0.3);
  g.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = i ? 0.16 : 0;
    const seg = boxMesh(0.08 - i * 0.012, 0.18, 0.08 - i * 0.012, i === 2 ? FUR_HI : FUR);
    seg.position.y = 0.09;
    pivot.add(seg);
    parent.add(pivot);
    tailSegs.push(pivot);
    parent = pivot;
  }

  g.userData = { headPivot, ears, eyes, legs, tailRoot, tailSegs, body };
  return g;
}

/**
 * @param opts.centre  {x,z} the plaza she patrols
 * @param opts.radius  how far she will wander from it
 */
export function createSpider(scene, terrain, opts = {}) {
  const centre = opts.centre || { x: 0, z: 0 };
  const R = opts.radius ?? 11;

  const mesh = buildSpider();
  mesh.position.set(centre.x + 2.5, terrain.surfaceY(centre.x + 2.5, centre.z + 2), centre.z + 2);
  scene.add(mesh);

  const P = mesh.userData;
  const state = {
    // A CAT'S ACTUAL BUDGET: mostly sitting still, sometimes walking, rarely
    // anything else. An even spread across the behaviours reads as a robot
    // cycling through animations.
    mode: 'sit',
    t: 2,
    dir: Math.random() * Math.PI * 2,
    phase: 0,
    bubble: null,
    bubbleT: 0,
    affection: 0,     // rises while you are close, drives the nuzzle
    blink: 2,
    // latched so a distance right on a threshold cannot chatter
    interested: false,
    approaching: false,
    move: 0,          // smoothed 0..1 "am I trotting", so legs never pop
    turnCd: 0,        // one deliberate turn when blocked, not one per frame
    earCd: 2, earT: 0, earWhich: 0,
  };

  const MODES = [
    ['sit', 5.5], ['walk', 3.0], ['groom', 2.2], ['stretch', 1.0], ['look', 2.0],
  ];

  function pickMode() {
    const total = MODES.reduce((a, m) => a + m[1], 0);
    let r = Math.random() * total;
    for (const [m, w] of MODES) { if ((r -= w) <= 0) return m; }
    return 'sit';
  }

  function nextMode() {
    state.mode = pickMode();
    state.t = state.mode === 'walk' ? 1.6 + Math.random() * 2.4
      : state.mode === 'sit' ? 2.5 + Math.random() * 4
        : 1.2 + Math.random() * 1.6;
    if (state.mode === 'walk') state.dir += (Math.random() - 0.5) * 2.2;
  }

  /** Say the line, with a little hop. Called on click/tap. */
  function greet() {
    if (state.bubble) {
      mesh.remove(state.bubble);
      state.bubble.material.map?.dispose();
      state.bubble.material.dispose();
    }
    state.bubble = makeBubble(SAY);
    mesh.add(state.bubble);
    state.bubbleT = 4.2;
    state.mode = 'greet';
    state.t = 1.1;
    state.affection = 3.5;
    return SAY;
  }

  function update(dt, playerPos) {
    // A FIXED TIMESTEP FOR THE POSE.
    //
    // Everything below eases toward a target at `dt * k`. On a frame that
    // stutters, dt spikes and those eases overshoot — which is a decent part of
    // what the twitching was. Clamping dt means a hitch makes her briefly slow
    // rather than briefly explode.
    dt = Math.min(dt, 1 / 30);
    state.phase += dt;
    state.t -= dt;
    if (state.turnCd > 0) state.turnCd -= dt;

    const d = playerPos
      ? Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z)
      : 99;

    // HYSTERESIS, everywhere a decision is made from a distance.
    //
    // `interested` used to be `affection > 1.2 && d < NOTICE`, a hard edge. Stand
    // at exactly that distance and it flipped true/false every single frame, and
    // since the tail, the ears and the head all pick a different target based on
    // it, the whole cat vibrated. Entering and leaving now use different radii,
    // so there is no value of `d` that can chatter.
    if (d < NOTICE) state.affection = Math.min(4, state.affection + dt * 1.4);
    else state.affection = Math.max(0, state.affection - dt * 0.8);

    const wantInterest = state.interested
      ? (state.affection > 0.6 && d < NOTICE + 1.2)   // stays keen a bit longer
      : (state.affection > 1.4 && d < NOTICE);
    state.interested = wantInterest;
    const interested = state.interested;

    if (state.t <= 0 && state.mode !== 'greet') nextMode();

    // ---- movement --------------------------------------------------------
    let wantMove = false;
    let heading = mesh.rotation.y;

    if (state.mode === 'greet') {
      if (state.t <= 0) nextMode();
    } else if (interested) {
      // APPROACH WITH A DEADBAND. She walks in until NUZZLE and does not set off
      // again until she has drifted past NUZZLE_OUT — without that gap she
      // reached the stop distance, halted, floated a hair over it and started
      // again, forty times a second.
      if (state.approaching && d < NUZZLE) state.approaching = false;
      else if (!state.approaching && d > NUZZLE_OUT) state.approaching = true;

      if (state.approaching && playerPos) {
        heading = Math.atan2(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z);
        const sp = 2.0 * dt;
        const nx = mesh.position.x + Math.sin(heading) * sp;
        const nz = mesh.position.z + Math.cos(heading) * sp;
        if (terrain.walkable(nx, nz, mesh.position.y)) {
          mesh.position.x = nx;
          mesh.position.z = nz;
          wantMove = true;
        }
      }
    } else if (state.mode === 'walk') {
      const nx = mesh.position.x + Math.sin(state.dir) * 1.4 * dt;
      const nz = mesh.position.z + Math.cos(state.dir) * 1.4 * dt;
      const outside = Math.hypot(nx - centre.x, nz - centre.z) > R;
      if (outside || !terrain.walkable(nx, nz, mesh.position.y)) {
        // TURN ONCE, then commit to it. This used to add 2.0 radians on every
        // frame it was blocked — a hundred and twenty radians a second — so a
        // cat that reached the edge of the plaza span like a top. The cooldown
        // makes it one deliberate turn.
        if (state.turnCd <= 0) {
          state.dir += Math.PI * 0.6 + Math.random() * 0.8;
          state.turnCd = 0.5;
        }
      } else {
        mesh.position.x = nx;
        mesh.position.z = nz;
        heading = state.dir;
        wantMove = true;
      }
    }

    // EASED HEADING, never snapped. She used to be assigned a facing directly,
    // so circling her made the body jump between angles every frame.
    let df = heading - mesh.rotation.y;
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    mesh.rotation.y += df * Math.min(1, dt * 7);

    // `moving` is smoothed too, so the trot fades in and out instead of the
    // legs popping between posed and decaying on alternate frames.
    state.move += ((wantMove ? 1 : 0) - state.move) * Math.min(1, dt * 8);
    const moving = state.move;

    // ---- one place decides the pose --------------------------------------
    //
    // The old version let three branches write the same bones: the trot posed
    // all four legs, then the groom branch overwrote leg 0 regardless, so a cat
    // trotting toward you was also licking a raised paw. Each bone is written
    // exactly once now, from a single blended target.
    const legs = P.legs;
    const groundY = terrain.surfaceY(mesh.position.x, mesh.position.z);
    const gait = state.phase * 7.5;

    const sitting = moving < 0.2 && (state.mode === 'sit' || state.mode === 'groom');
    const grooming = moving < 0.2 && state.mode === 'groom';
    const stretching = moving < 0.2 && state.mode === 'stretch';
    const greeting = state.mode === 'greet';

    // legs: trot blended against whatever the still pose wants
    const trot = [0, Math.PI, Math.PI, 0].map((o) => Math.sin(gait + o) * 0.5);
    let still = [0, 0, 0, 0];
    if (grooming) still = [-0.85 + Math.sin(state.phase * 3.2) * 0.16, 0, 0, 0];
    else if (stretching) {
      const w = Math.sin(Math.min(1, Math.max(0, (1.4 - state.t) * 2)) * Math.PI);
      still = [-0.7 * w, -0.7 * w, 0, 0];
    }
    for (let i = 0; i < 4; i++) {
      const target = trot[i] * moving + still[i] * (1 - moving);
      legs[i].rotation.x += (target - legs[i].rotation.x) * Math.min(1, dt * 12);
    }

    // body height: terrain + one bob, chosen once
    let lift = 0;
    if (greeting) lift = Math.abs(Math.sin(state.phase * 4.5)) * 0.07;
    else lift = Math.abs(Math.sin(gait)) * 0.02 * moving;
    mesh.position.y = groundY + lift;

    // the body box: sits lower when she is sitting, leans on a stretch
    const body = P.body;
    body.position.y += ((sitting ? 0.26 : 0.3) - body.position.y) * Math.min(1, dt * 5);
    const bodyTilt = stretching
      ? -0.16 * Math.sin(Math.min(1, Math.max(0, (1.4 - state.t) * 2)) * Math.PI)
      : 0;
    body.rotation.x += (bodyTilt - body.rotation.x) * Math.min(1, dt * 6);

    // head: tracks you when interested, otherwise a slow idle sway — one write
    let headY = Math.sin(state.phase * 0.7) * 0.22;
    let headX = 0;
    if (interested && playerPos) {
      const a = Math.atan2(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z);
      let hd = a - mesh.rotation.y;
      while (hd > Math.PI) hd -= Math.PI * 2;
      while (hd < -Math.PI) hd += Math.PI * 2;
      headY = Math.max(-0.9, Math.min(0.9, hd));
      headX = -0.12;
    }
    if (grooming) { headX = 0.42 + Math.sin(state.phase * 3.2) * 0.11; headY = 0; }
    else if (stretching) {
      headX = -0.35 * Math.sin(Math.min(1, Math.max(0, (1.4 - state.t) * 2)) * Math.PI);
    }
    P.headPivot.rotation.y += (headY - P.headPivot.rotation.y) * Math.min(1, dt * 4);
    P.headPivot.rotation.x += (headX - P.headPivot.rotation.x) * Math.min(1, dt * 4);

    // EARS. The flick used to be `sin(...) > 0.985`, which is true for a run of
    // consecutive frames and then false — a stutter, not a flick. It is a timer
    // now: one ear, one quick twitch, then a long wait.
    state.earCd -= dt;
    if (state.earCd <= 0) {
      state.earCd = 1.8 + Math.random() * 3.5;
      state.earWhich = Math.random() < 0.5 ? 0 : 1;
      state.earT = 0.18;
    }
    if (state.earT > 0) state.earT -= dt;
    for (let i = 0; i < P.ears.length; i++) {
      const e = P.ears[i];
      const flick = (i === state.earWhich && state.earT > 0)
        ? Math.sin((1 - state.earT / 0.18) * Math.PI) * 0.3 : 0;
      const targetZ = (i ? -1 : 1) * (0.06 + flick);
      e.rotation.z += (targetZ - e.rotation.z) * Math.min(1, dt * 14);
      const targetX = interested ? -0.18 : 0;
      e.rotation.x += (targetX - e.rotation.x) * Math.min(1, dt * 5);
    }

    // blink
    state.blink -= dt;
    if (state.blink <= 0) state.blink = 2.5 + Math.random() * 3;
    const lid = state.blink < 0.12 ? 0.15 : 1;
    for (const e of P.eyes) e.scale.y += (lid - e.scale.y) * Math.min(1, dt * 22);

    // the tail: a slow S-curl at rest, held up when she is interested
    for (let i = 0; i < P.tailSegs.length; i++) {
      const seg = P.tailSegs[i];
      const upX = i === 0 ? -1.05 : -0.1;
      const restX = i === 0 ? -0.45 : 0.18;
      const targetX = interested ? upX : restX;
      seg.rotation.x += (targetX - seg.rotation.x) * Math.min(1, dt * 3);
      // one sway, amplitude blended by interest — not two different waves
      // fighting over the same bone
      const amp = 0.16 + (0.07 - 0.16) * (interested ? 1 : 0);
      const targetZ = Math.sin(state.phase * (interested ? 2.4 : 1.1) + i * 0.8) * amp;
      seg.rotation.z += (targetZ - seg.rotation.z) * Math.min(1, dt * 6);
    }

    // the bubble expires on its own
    if (state.bubble) {
      state.bubbleT -= dt;
      if (state.bubbleT <= 0) {
        mesh.remove(state.bubble);
        state.bubble.material.map?.dispose();
        state.bubble.material.dispose();
        state.bubble = null;
      } else {
        state.bubble.material.opacity = Math.min(1, state.bubbleT / 0.6);
      }
    }
  }

  return {
    mesh, update, greet, state,
    /** Is the player close enough to pet her? Drives the interact prompt. */
    near: (pos, r = 2.4) => Math.hypot(mesh.position.x - pos.x, mesh.position.z - pos.z) < r,
    line: SAY,
  };
}
