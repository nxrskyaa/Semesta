// Pet companions — five collectible critters (Pokopia-inspired, original designs).
// Summoned via pet charms found in treasure chests. Each grants a small passive
// perk while active. Pets trot along behind you with happy little bounces.
import * as THREE from 'three';
import { makeCritterFaceTexture } from '../gfx/textures.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

export const PET_DEFS = {
  moku: {
    name: 'Moku', charm: 'charm_moku', color: '#7ac86a',
    desc: 'A sprout-cat with a fresh leaf on its head. Smells like morning grass.',
    perk: { key: 'speed', value: 0.10, label: '+10% move speed' },
  },
  piko: {
    name: 'Piko', charm: 'charm_piko', color: '#f0d05a',
    desc: 'A crackling spark-pup. Its zigzag tail never stops wagging.',
    perk: { key: 'dmg', value: 0.10, label: '+10% damage' },
  },
  bubbles: {
    name: 'Bubbles', charm: 'charm_bubbles', color: '#7ab8e8',
    desc: 'A cheerful axolotl that drips everywhere. Worth it.',
    perk: { key: 'regen', value: 1.2, label: '+1.2 HP/s regen' },
  },
  cinder: {
    name: 'Cinder', charm: 'charm_cinder', color: '#f08a5a',
    desc: 'An ember-fox with a flame-tipped tail. Warm to hug, slightly singed.',
    perk: { key: 'atkSpeed', value: 0.10, label: '+10% attack speed' },
  },
  luma: {
    name: 'Luma', charm: 'charm_luma', color: '#c8a8f0',
    desc: 'A star-bunny that glows faintly at night. Naps 20 hours a day.',
    perk: { key: 'xp', value: 0.15, label: '+15% XP' },
  },
};

// ---------------------------------------------------------------------------
// pet meshes — chibi critters with big glossy faces
// ---------------------------------------------------------------------------
const faceCache = new Map();
function petFace(id, opts) {
  if (!faceCache.has(id)) faceCache.set(id, makeCritterFaceTexture(opts));
  return faceCache.get(id);
}

function basePet(bodyColor, bellyColor, faceKey, faceOpts) {
  const g = new THREE.Group();
  const fur = lam(bodyColor);
  const belly = lam(bellyColor);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.34), fur);
  body.position.y = 0.2;
  body.castShadow = true;
  const tummy = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), belly);
  tummy.position.set(0, 0.16, 0.16);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), fur);
  head.position.y = 0.44;
  head.castShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22),
    new THREE.MeshBasicMaterial({ map: petFace(faceKey, faceOpts), transparent: true }));
  face.position.set(0, 0.01, 0.16);
  head.add(face);

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), fur);
    leg.position.set(sx * 0.09, 0.06, 0.08);
    g.add(leg);
    const legB = leg.clone(); legB.position.z = -0.1;
    g.add(legB);
  }

  g.add(body, tummy, head);
  g.userData = { head, body };
  return { g, fur, belly, head };
}

const BUILDERS = {
  moku() {
    const { g, head } = basePet('#7ac86a', '#b8e8a8', 'moku',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,140,0.6)' });
    // cat ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06), lam('#7ac86a'));
      ear.position.set(sx * 0.11, 0.19, 0);
      head.add(ear);
    }
    // leaf sprout
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), lam('#4f9857'));
    stem.position.set(0, 0.19, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.08), lam('#66b06a'));
    leaf.position.set(0.05, 0.25, 0);
    leaf.rotation.z = 0.3;
    head.add(stem, leaf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), lam('#7ac86a'));
    tail.position.set(0, 0.26, -0.2);
    tail.rotation.x = -0.5;
    g.add(tail);
    return g;
  },
  piko() {
    const { g, head } = basePet('#f0d05a', '#f8e8a8', 'piko',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'open', cheeks: 'rgba(240,120,90,0.7)' });
    // pointed ear tufts
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), lam('#f0d05a'));
      ear.position.set(sx * 0.12, 0.2, 0);
      ear.rotation.z = -sx * 0.3;
      head.add(ear);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), lam('#8a6a2a'));
      tip.position.y = 0.08; ear.add(tip);
    }
    // zigzag tail
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), lam('#f0d05a'));
    t1.position.set(0, 0.28, -0.2); t1.rotation.x = -0.7;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), lam('#f8e8a8'));
    t2.position.set(0, 0.07, 0); t2.rotation.x = 1.2; t1.add(t2);
    g.add(t1);
    return g;
  },
  bubbles() {
    const { g, head } = basePet('#7ab8e8', '#c8e4f5', 'bubbles',
      { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'open', cheeks: 'rgba(230,140,160,0.7)' });
    // axolotl gill frills
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const frill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), lam('#e890ac'));
        frill.position.set(sx * (0.19 + i * 0.015), 0.1 - i * 0.06, 0.02 - i * 0.03);
        frill.rotation.z = sx * (0.4 + i * 0.3);
        head.add(frill);
      }
    }
    // flat tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16), lam('#a8d0f0'));
    fin.position.set(0, 0.22, -0.24);
    g.add(fin);
    return g;
  },
  cinder() {
    const { g, head } = basePet('#f08a5a', '#f8c8a8', 'cinder',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(200,80,60,0.5)' });
    // fox ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.05), lam('#f08a5a'));
      ear.position.set(sx * 0.12, 0.2, -0.02);
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), lam('#f8c8a8'));
      inner.position.set(0, -0.01, 0.03); ear.add(inner);
    }
    // fluffy tail with flame tip
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), lam('#f08a5a'));
    tail.position.set(0, 0.28, -0.26);
    tail.rotation.x = -0.4;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffdd55 }));
    tip.position.set(0, 0.04, -0.12); tail.add(tip);
    g.add(tail);
    return g;
  },
  luma() {
    const { g, head } = basePet('#c8a8f0', '#e8dcf8', 'luma',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile', cheeks: 'rgba(240,150,180,0.6)' });
    // long bunny ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.05), lam('#c8a8f0'));
      ear.position.set(sx * 0.09, 0.28, 0);
      ear.rotation.z = -sx * 0.1;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.02), lam('#e8dcf8'));
      inner.position.set(0, 0, 0.03); ear.add(inner);
    }
    // star on forehead
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    star.position.set(0, 0.1, 0.16);
    star.rotation.z = Math.PI / 4;
    head.add(star);
    // soft glow
    const glow = new THREE.PointLight(0xc8a8f0, 0.8, 3, 2);
    glow.position.y = 0.4;
    g.add(glow);
    return g;
  },
};

// ---------------------------------------------------------------------------
// pet runtime — follows the player with a springy trot
// ---------------------------------------------------------------------------
export function createPets(scene, terrain, particles) {
  const state = { active: null, mesh: null, anim: 0 };

  function summon(petId, playerPos) {
    dismiss();
    if (!petId || !PET_DEFS[petId]) return false;
    state.active = petId;
    state.mesh = BUILDERS[petId]();
    state.mesh.position.set(playerPos.x - 0.8, playerPos.y, playerPos.z - 0.8);
    scene.add(state.mesh);
    particles.fountain(state.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)), PET_DEFS[petId].color, 14);
    return true;
  }

  function dismiss() {
    if (state.mesh) {
      particles.burst(state.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffffff', 8, 1.5);
      scene.remove(state.mesh);
    }
    state.active = null;
    state.mesh = null;
  }

  function update(dt, playerState, time) {
    if (!state.mesh) return;
    state.anim += dt;
    const p = state.mesh.position;
    const pp = playerState.pos;

    // heel position: behind and beside the player
    const f = playerState.facing;
    const tx = pp.x - Math.sin(f) * 0.9 - Math.cos(f) * 0.35;
    const tz = pp.z - Math.cos(f) * 0.9 + Math.sin(f) * 0.35;
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);

    if (d > 12) { // too far behind — pop over
      p.set(tx, terrain.surfaceY(tx, tz), tz);
      particles.burst(p.clone().add(new THREE.Vector3(0, 0.3, 0)), PET_DEFS[state.active].color, 6, 1.5);
      return;
    }
    if (d > 0.25) {
      const sp = Math.min(7, 2.2 + d * 2.2);
      p.x += (dx / d) * sp * dt;
      p.z += (dz / d) * sp * dt;
      state.mesh.rotation.y = Math.atan2(dx, dz);
      // trot bounce
      p.y = terrain.surfaceY(p.x, p.z) + Math.abs(Math.sin(state.anim * 10)) * 0.08;
    } else {
      // idle: sit & bob
      p.y = terrain.surfaceY(p.x, p.z);
      const u = state.mesh.userData;
      if (u.head) u.head.position.y = 0.44 + Math.sin(state.anim * 2.6) * 0.02;
      if (Math.random() < dt * 0.15) { // occasional happy hop
        p.y += 0.001; // noop-ish; the bounce below sells it
      }
    }
  }

  function serialize() { return { active: state.active }; }

  return { state, PET_DEFS, summon, dismiss, update, serialize };
}
