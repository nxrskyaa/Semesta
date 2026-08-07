// Wardrobe cosmetics — hats, back gear and movement trails. Hats snap onto the
// player's head, back pieces onto the torso; trails are particle colors used
// by the main loop. Rarity drives how flashy each piece looks.
import * as THREE from 'three';
import { ITEMS } from './items.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }
function glow(color) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }); }

// trail cosmetics: color + emission style consumed by main's trail emitter
export const TRAILS = {
  trail_leaf:    { colors: ['#7ac866', '#b8e8a8'], rate: 4, rise: 0.5 },
  trail_petal:   { colors: ['#f4a8ce', '#f9d0e4'], rate: 5, rise: 0.6 },
  trail_frost:   { colors: ['#bfe6ff', '#e8f6ff'], rate: 5, rise: 0.4 },
  trail_ember:   { colors: ['#ff9a3a', '#ffd166'], rate: 7, rise: 1.4 },
  trail_star:    { colors: ['#ffe27a', '#fff6c8'], rate: 6, rise: 0.9 },
  trail_rainbow: { rainbow: true, rate: 9, rise: 1.0 },
  // --- SEASON ONE additions ---
  trail_bubble:  { colors: ['#a8e0f8', '#e0f6ff'], rate: 4, rise: 1.6 },
  trail_lantern: { colors: ['#ffdca0', '#ffb85c'], rate: 4, rise: 0.7 },
  trail_ink:     { colors: ['#2a2438', '#6a5a9a'], rate: 6, rise: 0.3 },
  trail_aurora:  { colors: ['#7fd0c8', '#c8a0f0'], rate: 8, rise: 1.2 },
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
    // little stars orbit the cone
    const orbit = new THREE.Group();
    orbit.position.y = 0.32;
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glow('#ffe27a'));
      const a = (i / 3) * Math.PI * 2;
      star.position.set(Math.cos(a) * 0.3, (i - 1) * 0.1, Math.sin(a) * 0.3);
      orbit.add(star);
    }
    g.add(brim, cone, tip, orbit);
    g.userData.orbit = orbit;
    return g;
  },
  hat_catears() {
    const g = new THREE.Group();
    const ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 4), lam('#f2a6cc'));
      ear.position.set(sx * 0.16, 0.1, 0);
      ear.rotation.z = -sx * 0.2;
      ear.userData.baseZ = -sx * 0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), lam('#fbd6e8'));
      inner.position.set(0, -0.01, 0.03);
      ear.add(inner);
      g.add(ear);
      ears.push(ear);
    }
    g.userData.ears = ears; // twitch cutely now and then
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
    g.userData.gem = gem; // pulses regally
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
  hat_chef() {
    const g = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.12, 9), lam('#f4f4ec'));
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), lam('#ffffff'));
    puff.position.y = 0.22;
    puff.scale.y = 0.8;
    for (const a of [0.5, 2.5, 4.4]) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), lam('#ffffff'));
      bump.position.set(Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2);
      g.add(bump);
    }
    g.add(band, puff);
    return g;
  },
  hat_pirate() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#2c2c30'));
    for (const a of [0, 2.1, 4.2]) { // three cocked brims
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.16), lam('#2c2c30'));
      brim.position.set(Math.cos(a) * 0.22, 0.08, Math.sin(a) * 0.22);
      brim.rotation.y = -a;
      brim.rotation.z = 0.35;
      g.add(brim);
    }
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), lam('#f0ead8'));
    skull.position.set(0, 0.12, 0.27);
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.29, 0.04, 8), lam('#c8a03a'));
    trim.position.y = 0.0;
    g.add(dome, skull, trim);
    return g;
  },
  hat_pumpkin() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), lam('#e8823a'));
    body.position.y = 0.14;
    body.scale.y = 0.85;
    for (let i = 0; i < 4; i++) { // ribs
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 4, 12), lam('#c96a2e'));
      rib.position.y = 0.14;
      rib.rotation.y = (i / 4) * Math.PI;
      rib.rotation.x = Math.PI / 2;
      rib.scale.y = 0.85;
      g.add(rib);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.14, 5), lam('#4f9857'));
    stem.position.y = 0.46;
    stem.rotation.z = 0.2;
    // glowing jack-o-lantern face
    for (const [ex, ey] of [[-0.11, 0.2], [0.11, 0.2]]) {
      const eye = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 3), glow('#ffd166'));
      eye.position.set(ex, ey, 0.31);
      g.add(eye);
    }
    const grin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), glow('#ffd166'));
    grin.position.set(0, 0.07, 0.33);
    const light = new THREE.PointLight(0xff9a3a, 0.9, 3, 2);
    light.position.y = 0.2;
    g.add(body, stem, grin, light);
    return g;
  },
  hat_kitsune() {
    const g = new THREE.Group();
    // white fox mask worn on the head, red markings, gold bell
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.16), lam('#f8f4ec'));
    mask.position.set(0, 0.1, 0.14);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), lam('#f8f4ec'));
      ear.position.set(sx * 0.16, 0.34, 0.08);
      ear.rotation.z = -sx * 0.15;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 4), lam('#d84a4a'));
      inner.position.set(sx * 0.16, 0.32, 0.11);
      g.add(ear, inner);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.02), lam('#d84a4a'));
      mark.position.set(sx * 0.12, 0.14, 0.23);
      mark.rotation.z = sx * 0.5;
      g.add(mark);
    }
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), lam('#f8f4ec'));
    snout.position.set(0, 0.0, 0.24);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), lam('#d84a4a'));
    nose.position.set(0, -0.01, 0.3);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), glow('#ffd166'));
    bell.position.set(0, -0.12, 0.22);
    g.add(mask, snout, nose, bell);
    return g;
  },
  // --- SEASON ONE additions -------------------------------------------------
  hat_lantern() {
    const g = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 10), lam('#6a4a30'));
    brim.position.y = 0.26;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.035), lam('#4a3a28'));
    post.position.set(0, 0.36, 0);
    const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8),
      sharedMat('#ffdca0', { unique: true, emissive: '#ffb85c' }));
    lant.material.emissiveIntensity = 0.9;
    lant.position.y = 0.52;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.08, 8), lam('#c46a3a'));
    cap.position.y = 0.65;
    g.add(brim, post, lant, cap);
    return g;
  },
  hat_fox() {
    const g = new THREE.Group();
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), lam('#e08a4a'));
    hood.scale.set(1, 0.82, 1);
    hood.position.y = 0.18;
    g.add(hood);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), lam('#e08a4a'));
      ear.position.set(sx * 0.17, 0.4, 0.02);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), lam('#f8f4ec'));
      inner.position.set(sx * 0.17, 0.39, 0.05);
      g.add(ear, inner);
    }
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), lam('#f8f4ec'));
    snout.position.set(0, 0.16, 0.28);
    g.add(snout);
    return g;
  },
  hat_antlers() {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const main = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.4, 5), lam('#d8c894'));
      main.position.set(sx * 0.14, 0.4, 0);
      main.rotation.z = sx * 0.28;
      g.add(main);
      for (let i = 0; i < 3; i++) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.16, 5),
          sharedMat('#eee6c2', { unique: true, emissive: '#c8a03a' }));
        tine.material.emissiveIntensity = 0.4;
        tine.position.set(sx * (0.2 + i * 0.05), 0.42 + i * 0.11, 0);
        tine.rotation.z = sx * (0.8 + i * 0.15);
        g.add(tine);
      }
    }
    return g;
  },
  hat_bucket() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.26, 10), lam('#8d9294'));
    body.position.y = 0.32;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 5, 12), lam('#6a7276'));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.45;
    g.add(body, rim);
    return g;
  },
  hat_flower() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 5, 14), lam('#5e8a3c'));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
    g.add(ring);
    const COLS = ['#f0a8c8', '#f6e07a', '#e8e0f8', '#f08a8a', '#c8e8a0'];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), lam(COLS[i % COLS.length]));
      f.position.set(Math.cos(a) * 0.27, 0.33, Math.sin(a) * 0.27);
      g.add(f);
    }
    return g;
  },
  hat_horns() {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035 - i * 0.007, 0.05 - i * 0.008, 0.11, 6),
          sharedMat(i > 1 ? '#ff8a3c' : '#5a2a18', { unique: true, emissive: i > 1 ? '#ff5a2c' : '#2a1008' }));
        seg.material.emissiveIntensity = i > 1 ? 0.7 : 0.15;
        seg.position.set(sx * (0.15 + i * 0.03), 0.32 + i * 0.09, -0.02 - i * 0.02);
        seg.rotation.z = sx * (0.3 + i * 0.16);
        g.add(seg);
      }
    }
    return g;
  },
  hat_starcap() {
    const g = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      lam('#3a4a7a'));
    cap.position.y = 0.26;
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.18), lam('#2a3358'));
    peak.position.set(0, 0.26, 0.26);
    g.add(cap, peak);
    for (const [dx, dy, dz] of [[0.1, 0.4, 0.1], [-0.12, 0.36, 0.05], [0.02, 0.46, -0.06]]) {
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0),
        sharedMat('#ffe27a', { unique: true, emissive: '#ffd23e' }));
      st.material.emissiveIntensity = 0.8;
      st.position.set(dx, dy, dz);
      g.add(st);
    }
    return g;
  },
  hat_moon() {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 18, Math.PI * 1.35),
      sharedMat('#eef2ff', { unique: true, emissive: '#9fb8ff' }));
    outer.material.emissiveIntensity = 1.0;
    outer.position.y = 0.52;
    outer.rotation.z = 0.6;
    g.add(outer);
    const orbit = new THREE.Group();
    orbit.position.y = 0.52;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5),
        sharedMat('#dfe8ff', { unique: true, emissive: '#8aa8ff' }));
      m.material.emissiveIntensity = 0.9;
      m.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
      orbit.add(m);
    }
    g.add(orbit);
    g.userData.orbit = orbit;
    return g;
  },
};

// layered feathered wings: each side is a fan of 4 overlapping feather quills
// (long → short) tinted from colorA→colorB, tipped with a glowing gem. The two
// wing roots pivot so `update` can flap them in a smooth two-stage beat.
function wing(colorA, colorB, opacity = 1, additive = false) {
  const g = new THREE.Group();
  const cA = new THREE.Color(colorA), cB = new THREE.Color(colorB);
  const feather = (t) => {
    // one teardrop feather: a circle body + a slim quill spine
    const col = cA.clone().lerp(cB, t);
    const matOpts = { color: col, side: THREE.DoubleSide, transparent: opacity < 1, opacity };
    if (additive) { matOpts.blending = THREE.AdditiveBlending; matOpts.depthWrite = false; }
    const f = new THREE.Group();
    const vane = new THREE.Mesh(new THREE.CircleGeometry(0.1, 7), new THREE.MeshLambertMaterial(matOpts));
    vane.scale.set(1, 2.2, 1);
    vane.position.y = 0.12;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.012),
      new THREE.MeshLambertMaterial({ ...matOpts, color: cB.clone().multiplyScalar(0.7) }));
    spine.position.y = 0.1;
    f.add(vane, spine);
    return f;
  };
  const roots = [];
  for (const sx of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set(sx * 0.1, 0.02, -0.03);
    // 4 feathers fanning outward & down, longest at the top
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const f = feather(t);
      const len = 1 - t * 0.4;
      f.scale.setScalar(len);
      f.position.set(sx * (0.06 + i * 0.11), 0.16 - i * 0.13, -i * 0.012);
      f.rotation.z = sx * (0.35 + i * 0.32);
      f.rotation.y = sx * 0.45;
      root.add(f);
    }
    // glowing gem at the wing shoulder
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04),
      new THREE.MeshBasicMaterial({ color: cB, transparent: true, opacity: 0.95 }));
    gem.position.set(sx * 0.05, 0.2, 0.02);
    root.add(gem);
    g.add(root);
    roots.push(root);
  }
  g.userData.wingRoots = roots; // flapped in update
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
    g.userData.flicker = light; // ember-light breathes
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
  back_shell() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#5a8a52'));
    dome.rotation.x = Math.PI / 2; // dome bulges backwards off the back
    dome.position.z = -0.02;
    for (const [dx, dy] of [[0, 0.06], [-0.11, -0.06], [0.11, -0.06]]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), lam('#c8b464'));
      plate.position.set(dx, dy, -0.2);
      g.add(plate);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 5, 12), lam('#4a7043'));
    rim.position.z = -0.01;
    g.add(dome, rim);
    return g;
  },
  back_balloon() {
    const g = new THREE.Group();
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), lam('#e05a48'));
    balloon.position.set(0.12, 0.55, -0.12);
    balloon.scale.y = 1.15;
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.06, 5), lam('#b8443a'));
    knot.position.set(0.12, 0.32, -0.12);
    knot.rotation.x = Math.PI;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), glow('#ffc8c0'));
    shine.position.set(0.06, 0.62, -0.02);
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.34, 0.015), lam('#e8e2d2'));
    string.position.set(0.12, 0.14, -0.12);
    g.add(balloon, knot, shine, string);
    g.userData.balloon = balloon; // bobs in update
    g.userData.balloonBits = [knot, shine, string];
    return g;
  },
  back_koi() {
    const g = new THREE.Group();
    // a koinobori windsock on a little bamboo pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 5), lam('#8a6a48'));
    pole.position.set(-0.12, 0.25, -0.1);
    pole.rotation.z = 0.25;
    const koi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.42), lam('#f0716a'));
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.42), lam('#f8f4ec'));
    belly.position.y = -0.05;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.14), lam('#d84a4a'));
    tail.position.z = -0.26;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), lam('#2c2c30'));
    eye.position.set(0, 0.03, 0.16);
    koi.add(body, belly, tail, eye);
    koi.position.set(-0.24, 0.62, -0.1);
    g.add(pole, koi);
    g.userData.koi = koi; // swims in the wind
    return g;
  },
  // --- SEASON ONE additions -------------------------------------------------
  back_cloakfeather() {
    const g = new THREE.Group();
    const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.05), lam('#5a6478'));
    cloak.position.set(0, 0.34, -0.16);
    g.add(cloak);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.03),
          lam(r % 2 ? '#8d9aae' : '#6f7c90'));
        f.position.set(-0.15 + i * 0.1, 0.5 - r * 0.12, -0.19);
        f.rotation.z = (i - 1.5) * 0.12;
        g.add(f);
      }
    }
    return g;
  },
  back_lanterns() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), lam('#6a4a30'));
    pole.position.set(0, 0.5, -0.16);
    g.add(pole);
    const swing = new THREE.Group();
    swing.position.set(0, 0.74, -0.16);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), lam('#6a4a30'));
    swing.add(bar);
    for (const dx of [-0.18, 0, 0.18]) {
      const cord = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.012), lam('#4a3a28'));
      cord.position.set(dx, -0.06, 0);
      const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 8),
        sharedMat('#ffdca0', { unique: true, emissive: '#ffb85c' }));
      lant.material.emissiveIntensity = 0.85;
      lant.position.set(dx, -0.18, 0);
      swing.add(cord, lant);
    }
    g.add(swing);
    g.userData.swing = swing;
    return g;
  },
  back_reef() {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26 - i * 0.05, 0.02),
          lam(i % 2 ? '#5ec0b0' : '#7fd0f0'));
        fin.position.set(sx * (0.16 + i * 0.06), 0.44, -0.14);
        fin.rotation.z = sx * (0.25 + i * 0.18);
        g.add(fin);
      }
    }
    return g;
  },
  back_frost() {
    const g = wing('#bfe6f2', '#eafaff', 0.72, true);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const sh = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), lam('#eafaff'));
        sh.position.set(sx * (0.2 + i * 0.1), 0.6 - i * 0.09, -0.14);
        sh.rotation.z = sx * 0.5;
        g.add(sh);
      }
    }
    return g;
  },
  back_scroll() {
    const g = new THREE.Group();
    for (const [dx, dy, rz] of [[-0.1, 0.4, 0.3], [0.1, 0.46, -0.25], [0, 0.34, 0.05]]) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 7), lam('#e8dcc0'));
      roll.position.set(dx, dy, -0.17);
      roll.rotation.z = Math.PI / 2 + rz;
      const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 7), lam('#8a6a44'));
      capA.position.set(dx - 0.15, dy, -0.17); capA.rotation.z = Math.PI / 2;
      const capB = capA.clone(); capB.position.x = dx + 0.15;
      g.add(roll, capA, capB);
    }
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
    if (hatMesh?.userData.orbit) hatMesh.userData.orbit.rotation.y = time * 1.6;
    if (hatMesh?.userData.gem) {
      hatMesh.userData.gem.rotation.y = time * 2;
      hatMesh.userData.gem.scale.setScalar(1 + Math.sin(time * 3.2) * 0.2);
    }
    if (hatMesh?.userData.ears) {
      // occasional quick twitch (kitty radar)
      const tw = Math.max(0, Math.sin(time * 0.9)) ** 24;
      hatMesh.userData.ears.forEach((ear, i) => {
        ear.rotation.z = ear.userData.baseZ + (i ? -1 : 1) * tw * 0.35;
      });
    }
    // layered wings: a two-stage flap (quick down-beat, slow rise) that folds
    // the whole feather fan in and out
    if (backMesh?.userData.wingRoots) {
      const beat = (Math.sin(time * 4) * 0.5 + 0.5) ** 1.6; // 0..1, snappy peak
      const open = 0.15 + beat * 0.6;
      const roots = backMesh.userData.wingRoots;
      roots[0].rotation.y = open;
      roots[1].rotation.y = -open;
      roots[0].rotation.z = beat * 0.12;
      roots[1].rotation.z = -beat * 0.12;
    }
    if (backMesh?.userData.flicker) {
      backMesh.userData.flicker.intensity = 1.1 + Math.sin(time * 5.2) * 0.3;
    }
    if (backMesh?.userData.prism) {
      _hue.setHSL((time * 0.12) % 1, 0.7, 0.72);
      backMesh.traverse((o) => { if (o.isMesh) o.material.color.copy(_hue); });
    }
    if (backMesh?.userData.balloon) {
      const bob = Math.sin(time * 1.8) * 0.05;
      backMesh.userData.balloon.position.y = 0.55 + bob;
      backMesh.userData.balloonBits[1].position.y = 0.62 + bob;
    }
    if (backMesh?.userData.koi) {
      backMesh.userData.koi.rotation.y = Math.sin(time * 2.2) * 0.4;
      backMesh.userData.koi.rotation.z = Math.sin(time * 3.1) * 0.15;
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
