// Wardrobe cosmetics — hats, back gear and movement trails. Hats snap onto the
// player's head, back pieces onto the torso; trails are particle colors used
// by the main loop. Rarity drives how flashy each piece looks.
import * as THREE from 'three';
import { ITEMS } from './items.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }
function glow(color) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }); }

// trail cosmetics: color + emission style consumed by main's trail emitter
export const TRAILS = {
  trail_petal:   { colors: ['#f4a8ce', '#f9d0e4'], rate: 5, rise: 0.6 },
  trail_ember:   { colors: ['#ff9a3a', '#ffd166'], rate: 7, rise: 1.4 },
  trail_star:    { colors: ['#ffe27a', '#fff6c8'], rate: 6, rise: 0.9 },
  trail_rainbow: { rainbow: true, rate: 9, rise: 1.0 },
};

const HAT_BUILDERS = {
  hat_straw() {
    const g = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 10), lam('#d8b86a'));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), lam('#e8cc82'));
    top.position.y = 0.1;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.05, 8), lam('#b0503f'));
    band.position.y = 0.04;
    g.add(brim, top, band);
    return g;
  },
  hat_leaf() {
    const g = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#5cb050'));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 5), lam('#3a7343'));
    stem.position.y = 0.3;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.09), lam('#7ac866'));
    leaf.position.set(0.06, 0.37, 0); leaf.rotation.z = 0.3;
    g.add(cap, stem, leaf);
    return g;
  },
  hat_bandana() {
    const g = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.12, 8), lam('#c8443a'));
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.08), lam('#a83028'));
    knot.position.set(0, -0.02, -0.28);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.04), lam('#c8443a'));
    tail.position.set(0.04, -0.14, -0.3); tail.rotation.x = 0.3;
    g.add(band, knot, tail);
    g.position.y = -0.08;
    return g;
  },
  hat_miner() {
    const g = new THREE.Group();
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#8a8e92'));
    const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.06), lam('#4a4e52'));
    lampBase.position.set(0, 0.12, 0.28);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), glow('#ffe9a8'));
    bulb.position.set(0, 0.12, 0.32);
    const light = new THREE.PointLight(0xffe0a0, 1.2, 4, 2);
    light.position.set(0, 0.12, 0.34);
    g.add(helm, lampBase, bulb, light);
    return g;
  },
  hat_wizard() {
    const g = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.05, 9), lam('#5a4a9a'));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 8), lam('#6a5ab0'));
    cone.position.y = 0.28; cone.rotation.y = 0.4;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), lam('#5a4a9a'));
    tip.position.set(0.05, 0.6, 0); tip.rotation.z = -0.5;
    for (const [sx, sy] of [[0.1, 0.2], [-0.08, 0.34], [0.02, 0.46]]) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glow('#ffe27a'));
      star.position.set(sx, sy, 0.16);
      g.add(star);
    }
    g.add(brim, cone, tip);
    return g;
  },
  hat_catears() {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 4), lam('#f2a6cc'));
      ear.position.set(sx * 0.16, 0.1, 0);
      ear.rotation.z = -sx * 0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), lam('#fbd6e8'));
      inner.position.set(0, -0.01, 0.03);
      ear.add(inner);
      g.add(ear);
    }
    return g;
  },
  hat_viking() {
    const g = new THREE.Group();
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#7a7e84'));
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.31, 0.06, 8), lam('#c8a03a'));
    rim.position.y = -0.01;
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 6), lam('#f0e8d6'));
      horn.position.set(sx * 0.3, 0.12, 0);
      horn.rotation.z = -sx * 0.9;
      g.add(horn);
    }
    g.add(helm, rim);
    return g;
  },
  hat_crown() {
    const g = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 8), lam('#e8c24a'));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), lam('#f0d05a'));
      spike.position.set(Math.cos(a) * 0.24, 0.13, Math.sin(a) * 0.24);
      g.add(spike);
    }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), glow('#e8474e'));
    gem.position.set(0, 0.06, 0.27);
    const light = new THREE.PointLight(0xffd23e, 0.8, 3, 2);
    light.position.y = 0.2;
    g.add(band, gem, light);
    return g;
  },
  hat_halo() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 18), glow('#fff2c0'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    const light = new THREE.PointLight(0xfff0b0, 1.8, 5, 2);
    light.position.y = 0.3;
    g.add(ring, light);
    g.userData.spin = ring;
    return g;
  },
};

function wing(colorA, colorB, opacity = 1, additive = false) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const matOpts = { color: new THREE.Color(colorA), side: THREE.DoubleSide, transparent: opacity < 1, opacity };
    if (additive) { matOpts.blending = THREE.AdditiveBlending; matOpts.depthWrite = false; }
    const big = new THREE.Mesh(new THREE.CircleGeometry(0.26, 8), new THREE.MeshLambertMaterial(matOpts));
    big.position.set(sx * 0.22, 0.08, -0.02);
    big.rotation.y = sx * 0.5;
    big.scale.set(1, 1.5, 1);
    const small = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8),
      new THREE.MeshLambertMaterial({ ...matOpts, color: new THREE.Color(colorB) }));
    small.position.set(sx * 0.18, -0.16, -0.02);
    small.rotation.y = sx * 0.5;
    g.add(big, small);
  }
  return g;
}

const BACK_BUILDERS = {
  back_pack() {
    const g = new THREE.Group();
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.14), lam('#8a6a48'));
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.16), lam('#6e5438'));
    flap.position.y = 0.14;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), lam('#b0503f'));
    roll.rotation.z = Math.PI / 2; roll.position.y = 0.24;
    g.add(pack, flap, roll);
    return g;
  },
  back_sprout() { return wing('#7ac866', '#b8e8a8'); },
  back_bubble() { return wing('#9ad4f0', '#cfeaf8', 0.55); },
  back_butterfly() {
    const g = wing('#b06ae8', '#f2a6cc');
    g.userData.flap = true;
    return g;
  },
  back_phoenix() {
    const g = wing('#ff9a3a', '#ffd166');
    const light = new THREE.PointLight(0xff9a3a, 1.2, 4, 2);
    g.add(light);
    g.userData.flap = true;
    return g;
  },
  back_prism() {
    const g = wing('#9ad4f0', '#f2a6cc', 0.85, true);
    const light = new THREE.PointLight(0xc8a8f0, 1.6, 5, 2);
    g.add(light);
    g.userData.flap = true;
    g.userData.prism = true; // hue-cycles in update
    return g;
  },
};

// build a cosmetic mesh by item id (hat or back)
export function buildCosmetic(id) {
  if (HAT_BUILDERS[id]) return { mesh: HAT_BUILDERS[id](), slot: 'hat' };
  if (BACK_BUILDERS[id]) return { mesh: BACK_BUILDERS[id](), slot: 'back' };
  return null;
}

// all cosmetic ids grouped by slot (from ITEMS)
export function cosmeticsBySlot() {
  const out = { hat: [], back: [], trail: [] };
  for (const [id, d] of Object.entries(ITEMS)) {
    if (d.cosmetic) out[d.cosmetic].push(id);
  }
  return out;
}

// runtime manager: attaches/removes cosmetic meshes on the player rig
export function createWardrobe(player) {
  const state = { hat: null, back: null, trail: null };
  let hatMesh = null, backMesh = null;
  const _hue = new THREE.Color();

  function equip(slot, id) {
    if (slot === 'hat') {
      if (hatMesh) { player.parts.head.remove(hatMesh); hatMesh = null; }
      state.hat = id || null;
      if (id) {
        const c = buildCosmetic(id);
        if (c) {
          hatMesh = c.mesh;
          hatMesh.position.y = 0.26; // sit on top of the head
          player.parts.head.add(hatMesh);
        }
      }
    } else if (slot === 'back') {
      if (backMesh) { player.parts.body.remove(backMesh); backMesh = null; }
      state.back = id || null;
      if (id) {
        const c = buildCosmetic(id);
        if (c) {
          backMesh = c.mesh;
          backMesh.position.set(0, 0.05, -0.16);
          player.parts.body.add(backMesh);
        }
      }
    } else if (slot === 'trail') {
      state.trail = id || null;
    }
  }

  function update(dt, time) {
    if (hatMesh?.userData.spin) hatMesh.userData.spin.rotation.z = time * 0.8;
    if (backMesh?.userData.flap) {
      const f = Math.sin(time * 6) * 0.35;
      if (backMesh.children[0]) backMesh.children[0].rotation.y = 0.5 + f;
      if (backMesh.children[2]) backMesh.children[2].rotation.y = -0.5 - f;
    }
    if (backMesh?.userData.prism) {
      _hue.setHSL((time * 0.12) % 1, 0.7, 0.72);
      backMesh.traverse((o) => { if (o.isMesh) o.material.color.copy(_hue); });
    }
  }

  // color for the equipped movement trail this frame (null = no trail)
  function trailColor(time) {
    if (!state.trail) return null;
    const def = TRAILS[state.trail];
    if (!def) return null;
    if (def.rainbow) {
      _hue.setHSL((time * 0.35) % 1, 0.85, 0.65);
      return { color: `#${_hue.getHexString()}`, rate: def.rate, rise: def.rise };
    }
    return { color: def.colors[Math.floor(time * 4) % def.colors.length], rate: def.rate, rise: def.rise };
  }

  function serialize() { return { ...state }; }
  function load(data) {
    if (!data) return;
    for (const slot of ['hat', 'back', 'trail']) {
      if (data[slot]) equip(slot, data[slot]);
    }
  }

  return { state, equip, update, trailColor, serialize, load };
}
