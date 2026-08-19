// Farming — your own field at the village edge. Buy seeds at Pip's shop,
// plant them on a plot, wait for 3 growth stages, harvest, sell for coins.
// Extra plots can be purchased as your farm empire grows.
import * as THREE from 'three';
import { buildSignboard } from '../entities/npcs.js';
import { ITEMS } from './items.js';

const MAX_PLOTS = 8;
const FREE_PLOTS = 2;
export const PLOT_PRICE = 100;

const CROP_COLORS = {
  crop_wheat: ['#d8b23a', '#f0d05a'],
  crop_berry: ['#c83a4a', '#f06a7a'],
  crop_pumpkin: ['#c86a2a', '#f0923a'],
};

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

function buildPlotMesh(owned) {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), lam(owned ? '#6a4d38' : '#54432f'));
  soil.position.y = 0.06;
  g.add(soil);
  if (owned) {
    // tilled rows
    for (let i = 0; i < 3; i++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.16), lam('#7a5a42'));
      row.position.set(0, 0.13, -0.28 + i * 0.28);
      g.add(row);
    }
  } else {
    // "for sale" stake
    const stake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), lam('#8a6a48'));
    stake.position.set(0, 0.25, 0);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.05), lam('#c8a06a'));
    sign.position.set(0, 0.48, 0);
    const coin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), lam('#f0c455'));
    coin.position.set(0, 0.48, 0.03);
    g.add(stake, sign, coin);
  }
  g.userData.isBase = true;
  return g;
}

function buildCropMesh(cropId, stage) {
  // stage 0 sprout, 1 growing, 2 ready
  const g = new THREE.Group();
  const [dark, bright] = CROP_COLORS[cropId] || CROP_COLORS.crop_wheat;
  if (stage === 0) {
    for (let i = 0; i < 3; i++) {
      const sprout = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), lam('#6fbf55'));
      sprout.position.set(-0.25 + i * 0.25, 0.2, (i % 2) * 0.2 - 0.1);
      g.add(sprout);
    }
  } else if (stage === 1) {
    for (let i = 0; i < 3; i++) {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), lam('#4f9857'));
      stem.position.set(-0.25 + i * 0.25, 0.28, (i % 2) * 0.2 - 0.1);
      const bud = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), lam(dark));
      bud.position.set(-0.25 + i * 0.25, 0.46, (i % 2) * 0.2 - 0.1);
      g.add(stem, bud);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.07), lam('#4f9857'));
      stem.position.set(-0.25 + i * 0.25, 0.3, (i % 2) * 0.2 - 0.1);
      const fruit = new THREE.Mesh(
        cropId === 'crop_pumpkin' ? new THREE.IcosahedronGeometry(0.14, 0) : new THREE.BoxGeometry(0.16, 0.16, 0.16),
        lam(bright));
      fruit.position.set(-0.25 + i * 0.25, 0.52, (i % 2) * 0.2 - 0.1);
      g.add(stem, fruit);
    }
    // ready sparkle handled by main via prompt
  }
  return g;
}

export function createFarming(scene, terrain, decorBlocked, particles) {
  const plots = [];

  // A FIELD ON SOIL, outside the paved plaza. The old offsets put the beds at
  // ~7.5 units from spawn, which is inside the 11.5-unit paving — soil plots
  // sitting on stone flags, which is nonsense. The field now starts past the
  // kerb, laid out as a tidy 4x2 grid on an axis so it reads as a plot of land
  // rather than crates dropped on a floor.
  const FIELD_ANG = Math.PI * 0.75 + Math.PI / 4;   // between two avenues
  const FIELD_R = 19.5;   // kerb is at 11.5 and the flat pad runs to 13 — the
                          // field has to start well past BOTH or its beds cut
                          // into the paving, which is what the screenshot shows
  const fcx = terrain.spawn.x + Math.sin(FIELD_ANG) * FIELD_R;
  const fcz = terrain.spawn.z + Math.cos(FIELD_ANG) * FIELD_R;

  // A BOARD ON THE FIELD. Eight bare soil beds beside the village told a new
  // player nothing; the sign names it and the pictogram reads from the plaza.
  {
    const sx = terrain.spawn.x + Math.sin(FIELD_ANG) * (FIELD_R - 3.0);
    const sz = terrain.spawn.z + Math.cos(FIELD_ANG) * (FIELD_R - 3.0);
    const sign = buildSignboard('FARM', 'sprout', '#7fc44f', 2.3);
    sign.position.set(sx, terrain.surfaceY(sx, sz), sz);
    sign.rotation.y = Math.atan2(terrain.spawn.x - sx, terrain.spawn.z - sz);
    scene.add(sign);
  }
  const ca = Math.cos(-FIELD_ANG), sa = Math.sin(-FIELD_ANG);
  for (let i = 0; i < MAX_PLOTS; i++) {
    // rows run along the field's own axis, so the grid faces the village
    const lx = (Math.floor(i / 4) - 0.5) * 1.45;
    const lz = ((i % 4) - 1.5) * 1.45;
    const x = fcx + lx * ca - lz * sa;
    const z = fcz + lx * sa + lz * ca;
    const y = terrain.surfaceY(x, z);
    const owned = i < FREE_PLOTS;
    // the beds are worked soil: block the cell so scenery never grows through
    {
      const [cx, cz] = terrain.cellOf(x, z);
      decorBlocked.add(`${cx},${cz}`);
    }
    const group = new THREE.Group();
    group.position.set(x, y, z);
    scene.add(group);
    const base = buildPlotMesh(owned);
    group.add(base);
    const plot = {
      i, x, z, y, group, base,
      owned, seed: null, stage: -1, t: 0, cropMesh: null,
      sign: makeSign(),
    };
    group.add(plot.sign.spr);
    plots.push(plot);
  }

  // ==========================================================================
  // A TIMER OVER THE SOIL.
  //
  // Planting used to be a leap of faith: you pressed Plant, a sprout appeared,
  // and then there was no way to know whether it needed ten more seconds or two
  // more minutes except standing there. So people either camped a plot doing
  // nothing, or wandered off and forgot which of the eight they had sown.
  //
  // The sign answers both without a UI panel: the crop's name, a bar, and the
  // time left — and READY in green when it can be picked, so a full field can be
  // read at a glance from the path.
  //
  // Drawn on a 128x40 canvas so it stays in the game's pixel idiom, and only
  // repainted when the SECOND changes rather than every frame: a canvas upload
  // per plot per frame would cost more than the crop is worth.
  // ==========================================================================
  function makeSign() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 40;
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(1.5, 0.47, 1);
    spr.position.y = 1.15;
    spr.renderOrder = 6;
    spr.visible = false;
    return { c, tex, spr, last: -1 };
  }

  function paintSign(p, secsLeft, frac, label) {
    const g = p.sign.c.getContext('2d');
    g.clearRect(0, 0, 128, 40);
    const ready = secsLeft <= 0;
    g.fillStyle = 'rgba(12,16,12,0.78)';
    g.fillRect(6, 2, 116, 36);
    g.strokeStyle = ready ? '#6ac06a' : '#5a5040';
    g.lineWidth = 2;
    g.strokeRect(7, 3, 114, 34);
    g.font = 'bold 12px monospace';
    g.textAlign = 'center';
    g.fillStyle = '#e8e8dc';
    g.fillText(label, 64, 16);
    if (ready) {
      g.fillStyle = '#8fe08a';
      g.fillText('READY', 64, 31);
    } else {
      // the bar, then the clock over it — mm:ss reads faster than a percentage
      g.fillStyle = '#2a2418';
      g.fillRect(14, 22, 100, 9);
      g.fillStyle = '#c8a33a';
      g.fillRect(14, 22, Math.round(100 * Math.max(0, Math.min(1, frac))), 9);
      const m = Math.floor(secsLeft / 60), sec = Math.ceil(secsLeft % 60);
      g.fillStyle = '#fff';
      g.font = 'bold 11px monospace';
      g.fillText(m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`, 64, 31);
    }
    p.sign.tex.needsUpdate = true;
  }

  function setBase(p) {
    p.group.remove(p.base);
    p.base = buildPlotMesh(p.owned);
    p.group.add(p.base);
  }

  function setCropMesh(p) {
    if (p.cropMesh) { p.group.remove(p.cropMesh); p.cropMesh = null; }
    if (p.seed && p.stage >= 0) {
      p.cropMesh = buildCropMesh(ITEMS[p.seed].seed, p.stage);
      p.group.add(p.cropMesh);
    }
  }

  function buyNextPlot() {
    const p = plots.find((pl) => !pl.owned);
    if (!p) return false;
    p.owned = true;
    setBase(p);
    particles.fountain(new THREE.Vector3(p.x, p.y + 0.3, p.z), '#f0c455', 12);
    return true;
  }
  function nextPlotPrice() {
    return plots.some((p) => !p.owned) ? PLOT_PRICE : null;
  }

  function plant(p, seedId) {
    if (!p.owned || p.seed) return false;
    p.seed = seedId;
    p.stage = 0;
    p.t = 0;
    setCropMesh(p);
    particles.burst(new THREE.Vector3(p.x, p.y + 0.2, p.z), '#8ac86a', 8, 1.6);
    return true;
  }

  function harvest(p) {
    if (!p.seed || p.stage < 2) return null;
    const cropId = ITEMS[p.seed].seed;
    const count = 2 + (Math.random() < 0.35 ? 1 : 0);
    p.seed = null;
    p.stage = -1;
    setCropMesh(p);
    particles.fountain(new THREE.Vector3(p.x, p.y + 0.3, p.z), CROP_COLORS[cropId]?.[1] || '#f0d05a', 12);
    return { id: cropId, count };
  }

  function update(dt) {
    for (const p of plots) {
      if (!p.seed || p.stage < 0) { if (p.sign.spr.visible) p.sign.spr.visible = false; continue; }
      const grow = ITEMS[p.seed].growTime / 2; // two stage-ups
      if (p.stage < 2) {
        p.t += dt;
        if (p.t >= grow) {
          p.t = 0;
          p.stage++;
          setCropMesh(p);
        }
      }
      // TIME LEFT ACROSS THE WHOLE PLANT, not just this stage — a bar that
      // refills every time the sprout grows is a bar that lies about how long
      // you have to wait.
      const stagesLeft = Math.max(0, 2 - p.stage);
      const secs = p.stage >= 2 ? 0 : stagesLeft * grow - p.t;
      const total = 2 * grow;
      p.sign.spr.visible = true;
      const whole = Math.ceil(secs);
      if (whole !== p.sign.last) {
        p.sign.last = whole;
        paintSign(p, secs, 1 - secs / total, ITEMS[ITEMS[p.seed].seed]?.name || 'Crop');
      }
    }
  }

  // nearest interactable plot: ready to harvest > empty owned > buyable
  function nearest(pos, radius) {
    let best = null, bd = radius * radius;
    for (const p of plots) {
      const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function serialize() {
    return plots.map((p) => ({ owned: p.owned, seed: p.seed, stage: p.stage, t: p.t }));
  }
  function load(data) {
    if (!data) return;
    data.forEach((d, i) => {
      const p = plots[i];
      if (!p) return;
      p.owned = d.owned;
      p.seed = d.seed;
      p.stage = d.stage;
      p.t = d.t || 0;
      setBase(p);
      setCropMesh(p);
    });
  }

  return { plots, plant, harvest, buyNextPlot, nextPlotPrice, update, nearest, serialize, load };
}
