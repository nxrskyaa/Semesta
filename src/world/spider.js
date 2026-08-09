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

  g.userData = { headPivot, ears, eyes, legs, tailRoot, tailSegs };
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
    state.phase += dt;
    state.t -= dt;

    const d = playerPos
      ? Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z)
      : 99;

    // NOTICING YOU. She breaks whatever she was doing, turns, and if you stay
    // close she comes over — a cat that ignores you entirely is scenery.
    if (d < NOTICE) {
      state.affection = Math.min(4, state.affection + dt * 1.4);
    } else {
      state.affection = Math.max(0, state.affection - dt * 0.8);
    }
    const interested = state.affection > 1.2 && d < NOTICE;

    if (state.t <= 0 && state.mode !== 'greet') nextMode();

    let moving = false;
    if (state.mode === 'greet') {
      // a small excited hop in place
      // ONE small hop, not a vibration. 14Hz was a buzz; a cat greeting you
      // lifts its front end once and settles.
      mesh.position.y = terrain.surfaceY(mesh.position.x, mesh.position.z)
        + Math.abs(Math.sin(state.phase * 4.5)) * 0.07;
      if (state.t <= 0) nextMode();
    } else if (interested && d > NUZZLE) {
      // trot toward you
      const a = Math.atan2(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z);
      mesh.rotation.y = a;
      const sp = 2.4 * dt;
      mesh.position.x += Math.sin(a) * sp;
      mesh.position.z += Math.cos(a) * sp;
      moving = true;
    } else if (state.mode === 'walk') {
      const nx = mesh.position.x + Math.sin(state.dir) * 1.5 * dt;
      const nz = mesh.position.z + Math.cos(state.dir) * 1.5 * dt;
      // turn back rather than leave the plaza or walk into water
      if (Math.hypot(nx - centre.x, nz - centre.z) > R || !terrain.walkable(nx, nz, mesh.position.y)) {
        state.dir += 2.0;
      } else {
        mesh.position.x = nx; mesh.position.z = nz;
        mesh.rotation.y = state.dir;
        moving = true;
      }
    }

    if (state.mode !== 'greet') {
      mesh.position.y = terrain.surfaceY(mesh.position.x, mesh.position.z);
    }

    // --- the gestures -------------------------------------------------------
    const legs = P.legs;
    if (moving) {
      // a light four-beat trot, diagonal pairs together
      const w = state.phase * 7.5;
      legs[0].rotation.x = Math.sin(w) * 0.5;
      legs[3].rotation.x = Math.sin(w) * 0.5;
      legs[1].rotation.x = Math.sin(w + Math.PI) * 0.5;
      legs[2].rotation.x = Math.sin(w + Math.PI) * 0.5;
      mesh.position.y += Math.abs(Math.sin(w)) * 0.02;
    } else {
      for (const l of legs) l.rotation.x *= 0.85;
    }

    // sitting drops the rump and lifts the chest
    const sitting = !moving && (state.mode === 'sit' || state.mode === 'groom');
    mesh.children[0].position.y += ((sitting ? 0.26 : 0.3) - mesh.children[0].position.y) * Math.min(1, dt * 5);

    // grooming: short licks at a raised front paw
    if (state.mode === 'groom') {
      legs[0].rotation.x = -0.85 + Math.sin(state.phase * 3.2) * 0.16;
      P.headPivot.rotation.x = 0.42 + Math.sin(state.phase * 3.2) * 0.11;
    } else if (state.mode === 'stretch') {
      const w = Math.sin(Math.min(1, (1.4 - state.t) * 2) * Math.PI);
      P.headPivot.rotation.x = -0.35 * w;
      legs[0].rotation.x = -0.7 * w;
      legs[1].rotation.x = -0.7 * w;
      mesh.children[0].rotation.x = -0.16 * w;
    } else {
      mesh.children[0].rotation.x *= 0.9;
      // LOOK AT THE PLAYER when interested, otherwise idle head sway
      if (interested && playerPos) {
        const a = Math.atan2(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z);
        let df = a - mesh.rotation.y;
        while (df > Math.PI) df -= Math.PI * 2;
        while (df < -Math.PI) df += Math.PI * 2;
        P.headPivot.rotation.y += (Math.max(-0.9, Math.min(0.9, df)) - P.headPivot.rotation.y) * Math.min(1, dt * 4);
        P.headPivot.rotation.x += (-0.12 - P.headPivot.rotation.x) * Math.min(1, dt * 4);
      } else {
        P.headPivot.rotation.y = Math.sin(state.phase * 0.7) * 0.22;
        P.headPivot.rotation.x *= 0.9;
      }
    }

    // ears: a fast independent twitch, one at a time, at random
    for (let i = 0; i < P.ears.length; i++) {
      const e = P.ears[i];
      // an occasional flick, not a permanent wobble
      const tw = Math.sin(state.phase * 1.4 + i * 2.3);
      e.rotation.z = (i ? -1 : 1) * (0.06 + (tw > 0.985 ? 0.28 : 0));
      // pinned forward when she is paying attention to you
      e.rotation.x = interested ? -0.18 : 0;
    }

    // blink
    state.blink -= dt;
    if (state.blink <= 0) state.blink = 2.5 + Math.random() * 3;
    const lid = state.blink < 0.12 ? 0.15 : 1;
    for (const e of P.eyes) e.scale.y += (lid - e.scale.y) * Math.min(1, dt * 22);

    // the tail: a slow S-curl at rest, a happy upright quiver when interested
    for (let i = 0; i < P.tailSegs.length; i++) {
      const seg = P.tailSegs[i];
      if (interested) {
        // tail up, with a slow sway — not a buzzing quiver
        seg.rotation.x += ((i === 0 ? -1.05 : -0.1) - seg.rotation.x) * Math.min(1, dt * 4);
        seg.rotation.z = Math.sin(state.phase * 2.4 + i * 0.7) * 0.07;
      } else {
        seg.rotation.x += ((i === 0 ? -0.45 : 0.18) - seg.rotation.x) * Math.min(1, dt * 3);
        seg.rotation.z = Math.sin(state.phase * 1.1 + i * 0.9) * 0.16;
      }
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
