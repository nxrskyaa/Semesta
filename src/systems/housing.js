// Housing — claim a piece of land, then raise your own home from gathered
// materials. Finished homes are personal safe zones that heal you quickly.
import * as THREE from 'three';
import { WATER_LEVEL } from '../world/terrain.js';

export const LAND_PRICE = 250;
export const HOUSE_SAFE_R = 8;
export const HOUSE_HEAL_R = 5;

export const HOUSE_DESIGNS = {
  cabin: {
    name: 'Cozy Cabin',
    desc: 'A snug log cabin with a green roof. Home sweet home.',
    cost: { hardwood: 15, iron_ore: 5 },
    coins: 0,
    roof: '#5a7a4a', wall: '#a8805a',
  },
  cottage: {
    name: 'Riverbrook Cottage',
    desc: 'A proper cottage with a chimney and a flower bed.',
    cost: { hardwood: 30, iron_ore: 12 },
    coins: 150,
    roof: '#5a7a9a', wall: '#d0b898',
  },
  villa: {
    name: 'Hilltop Villa',
    desc: 'Two floors, gold trim, bragging rights included.',
    cost: { hardwood: 45, iron_ore: 20 },
    coins: 400,
    roof: '#8a5a88', wall: '#e0d0b0',
  },
};

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

// a floating billboard label so land parcels are obvious from a distance
function makeLabel(title, sub, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,14,10,0.72)';
  ctx.fillRect(8, 8, 240, 80);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(9, 9, 238, 78);
  ctx.font = 'bold 30px monospace'; ctx.fillStyle = color;
  ctx.fillText(title, 128, 44);
  ctx.font = '18px monospace'; ctx.fillStyle = '#e2dfc8';
  ctx.fillText(sub, 128, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.6, 0.98, 1);
  spr.position.y = 2.1;
  return spr;
}

function buildSaleSign() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), lam('#8a6a48'));
  post.position.y = 0.5;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.08), lam('#c8a06a'));
  board.position.y = 1.05;
  const coin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), lam('#f0c455'));
  coin.position.set(-0.2, 1.05, 0.05);
  const home = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), lam('#a85a48'));
  home.position.set(0.15, 1.0, 0.05);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.06), lam('#6a4a30'));
  roof.position.set(0.15, 1.12, 0.05);
  // corner pegs marking the parcel
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const peg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), lam('#c8a06a'));
    peg.position.set(dx, 0.17, dz);
    g.add(peg);
  }
  g.add(post, board, coin, home, roof);
  return g;
}

function buildHouse(designId) {
  const d = HOUSE_DESIGNS[designId];
  const g = new THREE.Group();
  const wall = lam(d.wall);
  const beam = lam('#6a4a30');
  const roofM = lam(d.roof);
  const roofDark = lam('#4a3a2c');
  const gold = lam('#c8a03a');
  const twoStory = designId === 'villa';

  const H = twoStory ? 2.4 : 1.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, H, 2.5), wall);
  base.position.y = H / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  for (const [dx, dz] of [[-1.35, -1.2], [1.35, -1.2], [-1.35, 1.2], [1.35, 1.2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 0.18), beam);
    b.position.set(dx, H / 2, dz);
    g.add(b);
  }
  if (twoStory) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.6), gold);
    band.position.y = 1.25;
    g.add(band);
  }
  // roof stack
  for (let i = 0; i < 3; i++) {
    const w = 3.3 - i * 0.8;
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 3.0 - i * 0.7), i % 2 ? roofDark : roofM);
    r.position.y = H + 0.16 + i * 0.3;
    r.castShadow = true;
    g.add(r);
  }
  // chimney (cottage & villa)
  if (designId !== 'cabin') {
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.34), lam('#8d9294'));
    chimney.position.set(0.85, H + 0.85, -0.5);
    g.add(chimney);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.09), beam);
  door.position.set(0, 0.5, 1.28);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), gold);
  knob.position.set(0.18, 0.48, 1.33);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.09, 0.45), lam('#9aa0a2'));
  step.position.set(0, 0.04, 1.5);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.07), lam('#8ac4d8'));
  win.position.set(0.85, 0.95, 1.28);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.15),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  lantern.position.set(-0.55, 1.1, 1.32);
  const glow = new THREE.PointLight(0xffc878, 1.4, 6, 2);
  glow.position.set(0, 1.2, 1.6);
  g.add(door, knob, step, win, lantern, glow);
  if (twoStory) {
    const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.07), lam('#8ac4d8'));
    win2.position.set(-0.75, 1.9, 1.28);
    const win3 = win2.clone(); win3.position.x = 0.75;
    g.add(win2, win3);
  }
  return g;
}

export function createHousing(scene, terrain, decorBlocked, particles, avoid = []) {
  const lands = [];
  const S2 = terrain.size / 2;
  // a parcel (future house ~3x3 cells) must never overlap a landmark/camp
  // footprint — checking just the center cell is not enough
  const HOUSE_FOOT = 3.4;
  const clearOfFoots = (x, z) => {
    for (const f of avoid) {
      if (Math.hypot(f.x - x, f.z - z) < (f.r ?? 4) + HOUSE_FOOT) return false;
    }
    return true;
  };

  // 4 scenic parcels, one per quadrant (closer in than the camps)
  const targets = [
    [-S2 * 0.3, -S2 * 0.32], [S2 * 0.34, -S2 * 0.28],
    [-S2 * 0.32, S2 * 0.3], [S2 * 0.28, S2 * 0.34],
  ];
  targets.forEach((t, idx) => {
    for (let tries = 0; tries < 120; tries++) {
      const x = t[0] + (Math.random() - 0.5) * (14 + tries * 0.1);
      const z = t[1] + (Math.random() - 0.5) * (14 + tries * 0.1);
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 8) continue;
      // structures live in the avoid list (footprint circles); blocked cells
      // here are mostly trees, which decor.clearArea scrubs after placement
      if (!clearOfFoots(x, z)) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      const y = terrain.surfaceY(x, z);
      const sign = buildSaleSign();
      sign.position.set(x, y, z);
      const label = makeLabel('LAND FOR SALE', `${LAND_PRICE} coins — press F`, '#f0c455');
      sign.add(label);
      scene.add(sign);
      lands.push({
        idx, x, z, y, sign, label,
        owned: false, built: null, houseMesh: null,
      });
      return;
    }
  });

  function refreshLabel(land) {
    if (!land.sign || !land.label) return;
    land.sign.remove(land.label);
    if (land.built) { land.label = null; return; }
    land.label = land.owned
      ? makeLabel('YOUR LAND', 'press F to BUILD', '#a8e06a')
      : makeLabel('LAND FOR SALE', `${LAND_PRICE} coins — press F`, '#f0c455');
    land.sign.add(land.label);
  }

  function buyLand(land) {
    if (land.owned) return false;
    land.owned = true;
    refreshLabel(land);
    particles.fountain(new THREE.Vector3(land.x, land.y + 0.5, land.z), '#f0c455', 16);
    return true;
  }

  function build(land, designId) {
    if (!land.owned || land.built) return false;
    land.built = designId;
    scene.remove(land.sign);
    land.houseMesh = buildHouse(designId);
    land.houseMesh.position.set(land.x, land.y, land.z);
    scene.add(land.houseMesh);
    // block the footprint
    const [cx, cz] = terrain.cellOf(land.x, land.z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) decorBlocked.add(`${cx + dx},${cz + dz}`);
    }
    particles.fountain(new THREE.Vector3(land.x, land.y + 1, land.z), '#ffd23e', 30);
    particles.shockwave?.(new THREE.Vector3(land.x, land.y, land.z), '#ffd23e', 5, 0.6);
    return true;
  }

  function nearest(pos, radius) {
    let best = null, bd = radius * radius;
    for (const l of lands) {
      const d = (l.x - pos.x) ** 2 + (l.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  function serialize() {
    return lands.map((l) => ({ owned: l.owned, built: l.built }));
  }
  function load(data) {
    if (!data) return;
    data.forEach((d, i) => {
      const l = lands[i];
      if (!l) return;
      if (d.owned) { l.owned = true; refreshLabel(l); }
      if (d.built) build(l, d.built);
    });
  }

  return { lands, buyLand, build, nearest, serialize, load, HOUSE_DESIGNS };
}
