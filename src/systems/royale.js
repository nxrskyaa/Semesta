// LANTERNFALL — the match.
//
// A battleground, played from above: twenty-four keepers ride the Dawnskiff
// over the Emberwaste, jump when they like, glide down, and land with a knife
// and nothing else. Everything that matters is lying on the ground or falling
// out of the sky under a balloon: seven kinds of gun in four rarities, tonics,
// shield cells, ammunition. The Dark closes six times. Last light standing.
//
// This file owns the whole fight and borrows nothing from Semesta's combat —
// no levels, no gear, no skills come with you. It reads the arena through
// `world` (collision, line of sight, houses) and tells the outside what
// happened through `hooks.on(type, data)`; it never touches the bag.

import * as THREE from 'three';
import { buildCharacterMesh } from '../entities/player.js';
import { ROYALE_CX, ROYALE_CZ, ISLE_R } from '../world/royaleworld.js';
import { GUNS, RARITIES, KNIFE, rollGun, gunScore, buildGun, buildKnife, buildItem } from './royaleguns.js';

export const ROYALE_SIZE = 24;
export const DIFFICULTY = {
  easy: { name: 'EASY', dmg: 0.3, aim: 1.9, react: 1.0 },
  normal: { name: 'NORMAL', dmg: 0.44, aim: 1.25, react: 0.62 },
  hard: { name: 'HARD', dmg: 0.64, aim: 0.8, react: 0.36 },
};

const HP = 100, SHIELD = 100, MAX_TONIC = 4, MAX_CELL = 4, MAX_AMMO = 300;
const TONIC_HEAL = 50, TONIC_TIME = 1.5, CELL_CHARGE = 50, CELL_TIME = 1.3;
const SHIP_Y = 48, SHIP_SPEED = 17, GLIDE_FALL = 7.6, GLIDE_SPEED = 10.5;
const BODY_R = 0.68, BOT_SPEED = 5.0;
// the pace of a match lives in these four numbers; see the measurements in CLAUDE.md
const TUNE = { rival: 0.07, truce: 25, sight: 20, sightBot: 9 };
// nobody starts a fight in the first seconds on the ground: everybody loots
// the chibi rig is small under a camera this high, so every keeper is drawn larger
const KEEPER_SCALE = 1.32;
// reserve units a round costs: a marksman round is worth six pistol rounds
const AMMO_COST = { wick: 1, rattler: 1, lance: 1, bloom: 4, longwick: 6, mortar: 9, sunray: 0.34 };
const TRACER = { wick: '#ffe9a8', rattler: '#ffc46a', lance: '#ffd98a', bloom: '#ffb070', longwick: '#bfe6ff', mortar: '#ff9a4a', sunray: '#fff1a0' };

// wait, then close to r over `shrink` seconds; `dark` is health a second outside
const PHASES = [
  { wait: 46, shrink: 28, r: 68, dark: 1.5 },
  { wait: 36, shrink: 26, r: 46, dark: 2.5 },
  { wait: 30, shrink: 22, r: 30, dark: 4 },
  { wait: 24, shrink: 20, r: 17, dark: 6 },
  { wait: 18, shrink: 16, r: 7, dark: 9 },
  { wait: 12, shrink: 14, r: 0, dark: 14 },
];

const NAMES = ['Wick', 'Tallow', 'Ember', 'Cinder', 'Sable', 'Marrow', 'Quill', 'Bramble',
  'Thistle', 'Moth', 'Juniper', 'Flint', 'Rook', 'Sorrel', 'Ashby', 'Pike', 'Lark', 'Vesper',
  'Nettle', 'Birch', 'Garnet', 'Oriel', 'Sedge', 'Tarn', 'Wren', 'Hollis', 'Fenn', 'Brindle'];
const CLASSES = ['warrior', 'archer', 'mage', 'assassin', 'priest'];

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createRoyale({ scene, world, particles, player, hooks }) {
  const state = { active: null, stats: { played: 0, wins: 0, kills: 0, best: 0 } };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const on = (type, data) => hooks.on?.(type, data);
  const group = new THREE.Group();                 // everything the match owns
  scene.add(group);

  // ------------------------------------------------------------ prototypes ---
  const protos = new Map();
  function gunMesh(id, rar) {
    const key = `${id}|${rar}`;
    if (!protos.has(key)) protos.set(key, id === 'knife' ? buildKnife() : buildGun(id, rar));
    return protos.get(key).clone();
  }
  const itemProto = {};
  const itemMesh = (kind) => (itemProto[kind] ||= buildItem(kind)).clone();

  const ringGeo = new THREE.RingGeometry(0.5, 0.6, 28).rotateX(-Math.PI / 2);
  const poolGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const poolMats = new Map();
  const poolMat = (color) => {
    if (!poolMats.has(color)) {
      poolMats.set(color, new THREE.MeshBasicMaterial({ map: world.glow(), color: new THREE.Color(color), transparent: true, opacity: 0.38,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    }
    return poolMats.get(color);
  };
  const pillarGeo = new THREE.CylinderGeometry(0.09, 0.2, 1, 6, 1, true).translate(0, 0.5, 0);
  const tracerGeo = new THREE.BoxGeometry(0.07, 0.07, 1).translate(0, 0, -0.5);
  const shellGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const canopyGeo = new THREE.SphereGeometry(1.25, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const addMats = new Map();
  const addMat = (color, op = 1) => {
    const k = `${color}|${op}`;
    if (!addMats.has(k)) {
      addMats.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    }
    return addMats.get(k);
  };
  const solidMats = new Map();
  const solid = (color) => {
    if (!solidMats.has(color)) solidMats.set(color, new THREE.MeshLambertMaterial({ color: new THREE.Color(color), flatShading: true, side: THREE.DoubleSide }));
    return solidMats.get(color);
  };

  // pooled one-frame things: tracers, muzzle flares
  const tracerPool = [], flarePool = [];
  let flareMat = null;
  function flare(x, y, z, size, color) {
    if (!flareMat) flareMat = new THREE.SpriteMaterial({ map: world.glow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    let s = flarePool.pop();
    if (!s) s = new THREE.Sprite(flareMat.clone());
    s.material.color.set(color); s.material.opacity = 1;
    s.position.set(x, y, z); s.scale.setScalar(size);
    group.add(s);
    state.active?.flares.push({ s, life: 0.07, size });
  }

  // WHERE YOU ARE AND WHERE YOU ARE POINTING, drawn through everything. A ring
  // under the hero and a fading line along the barrel: the two things a
  // twin-stick shooter cannot let a rock or a roof take away from you.
  let mark = null;
  function heroMark() {
    if (mark) return mark;
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.7)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
    const tex = new THREE.CanvasTexture(c);
    const mk = (o) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, fog: false, ...o });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.69, 36).rotateX(-Math.PI / 2), mk({ opacity: 0.8 }));
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), mk({ map: tex, opacity: 0.8 }));
    const tip = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), mk({ opacity: 0.9 }));
    ring.renderOrder = line.renderOrder = tip.renderOrder = 9;
    tip.position.z = 0.98;
    const arm = new THREE.Group(); arm.add(line, tip);
    mark = new THREE.Group(); mark.add(ring, arm);
    mark.userData = { arm, line };
    group.add(mark);
    return mark;
  }

  // ----------------------------------------------------------------- rigs ---
  // Built once and reused every match: a rig is a few hundred shared parts and
  // a face texture, and twenty-three of them a match would be a leak.
  const rigs = [];
  function plate(name) {
    const c = document.createElement('canvas'); c.width = 192; c.height = 56;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
    sp.scale.set(2.1, 0.61, 1); sp.position.y = 2.2; sp.renderOrder = 5;
    const p = { sp, c, tex, key: '', name };
    return p;
  }
  function drawPlate(p, k) {
    const key = `${p.name}|${Math.ceil(k.hp / 4)}|${Math.ceil(k.shield / 4)}`;
    if (key === p.key) return;
    p.key = key;
    const g = p.c.getContext('2d');
    g.clearRect(0, 0, 192, 56);
    g.font = '700 22px Rubik, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 5; g.strokeStyle = 'rgba(12,8,6,0.85)'; g.strokeText(p.name, 96, 16);
    g.fillStyle = '#fff4e2'; g.fillText(p.name, 96, 16);
    const bar = (y, h, v, col) => {
      g.fillStyle = 'rgba(12,8,6,0.8)'; g.fillRect(30, y, 132, h);
      g.fillStyle = col; g.fillRect(32, y + 2, 128 * clamp(v, 0, 1), h - 4);
    };
    bar(31, 9, k.shield / SHIELD, '#5ad1ff');
    bar(41, 11, k.hp / HP, k.hp > 50 ? '#7be07b' : k.hp > 25 ? '#ffc04a' : '#ff5a4a');
    p.tex.needsUpdate = true;
  }
  function rigFor(i, rnd) {
    if (!rigs[i]) {
      const built = buildCharacterMesh({
        cls: CLASSES[i % CLASSES.length], gender: rnd() < 0.5 ? 'male' : 'female',
        skin: Math.floor(rnd() * 16), hairStyle: Math.floor(rnd() * 24),
        hairColor: Math.floor(rnd() * 20), eyes: Math.floor(rnd() * 12),
        accessory: rnd() < 0.3 ? Math.floor(rnd() * 14) : 0,
        outfitStyle: Math.floor(rnd() * 10), outfit: Math.floor(rnd() * 20),
        cape: rnd() < 0.4 ? Math.floor(rnd() * 12) : -1,
      });
      built.setWeapon?.(null);
      built.setWeaponVisible?.(false);
      built.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      built.group.scale.setScalar(KEEPER_SCALE);
      const p = plate('');
      built.group.add(p.sp);
      rigs[i] = { built, plate: p };
    }
    return rigs[i];
  }

  // -------------------------------------------------------------- keepers ---
  function keeper(isBot, name) {
    return {
      isBot, name, hp: HP, shield: 0, alive: true, phase: 'ship', pos: null, parts: null,
      aim: 0, slot: 0, guns: [null, null], ammo: 0, tonics: 0, cells: 0, kills: 0,
      fireCd: 0, reloadT: 0, reloadDur: 1, useT: 0, useDur: 1, useKind: null,
      kick: 0, swingT: 0, gun: null, gunKey: '', canopy: null, walk: 0, moving: false, gy: SHIP_Y,
    };
  }
  const heldGun = (k) => (k.slot > 0 ? k.guns[k.slot - 1] : null);
  const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

  function syncGun(k) {
    const g = heldGun(k);
    const key = k.phase !== 'ground' || !k.alive ? '' : g ? `${g.id}|${g.rar}` : 'knife|0';
    if (key === k.gunKey) return;
    k.gunKey = key;
    if (k.gun) { k.gun.parent?.remove(k.gun); k.gun = null; }
    if (!key || !k.parts?.handR) return;
    const [id, rar] = key.split('|');
    k.gun = gunMesh(id, +rar);
    k.gun.rotation.x = Math.PI / 2;
    k.gun.scale.setScalar(1.15);
    k.parts.handR.add(k.gun);
  }
  function setCanopy(k, on_) {
    if (on_ && !k.canopy) {
      k.canopy = new THREE.Mesh(canopyGeo, solid(k.isBot ? ['#d9483b', '#3b8fd9', '#e0a52e', '#5cb85c', '#b25cd9'][k.name.length % 5] : '#ffd27a'));
      k.canopy.scale.set(1, 0.62, 1);
      group.add(k.canopy);
    } else if (!on_ && k.canopy) { group.remove(k.canopy); k.canopy = null; }
  }

  // ----------------------------------------------------------------- loot ---
  const RAR_COL = RARITIES.map((r) => r.color);
  function addItem(m, kind, x, z, o = {}) {
    const col = kind === 'gun' ? RAR_COL[o.rar] : kind === 'tonic' ? '#63e08a' : kind === 'cell' ? '#5ad1ff' : '#ffd27a';
    const g = new THREE.Group();
    const body = kind === 'gun' ? gunMesh(o.id, o.rar) : itemMesh(kind);
    if (kind === 'gun') { body.scale.setScalar(2.3); body.position.y = 0.6; body.rotation.z = 0.35; }
    else body.scale.setScalar(1.35);
    g.add(body);
    const ring = new THREE.Mesh(ringGeo, addMat(col, 0.95)); ring.position.y = 0.07; ring.scale.setScalar(kind === 'gun' ? 1.5 : 1.1); g.add(ring);
    const pool = new THREE.Mesh(poolGeo, poolMat(col)); pool.position.y = 0.05; pool.scale.setScalar(kind === 'gun' ? 1.25 + (o.rar || 0) * 0.2 : 0.95); g.add(pool);
    if (kind === 'gun') {
      const pil = new THREE.Mesh(pillarGeo, addMat(col, 0.16 + o.rar * 0.08)); pil.scale.set(1 + o.rar * 0.3, 1.6 + o.rar * 1.9, 1 + o.rar * 0.3); g.add(pil);
    }
    const y = world.heightAt(x, z);
    g.position.set(x, y, z);
    group.add(g);
    const it = { kind, x, z, y, id: o.id, rar: o.rar || 0, mag: o.mag ?? (kind === 'gun' ? GUNS[o.id].mag : 0), g, body, ph: m.rnd() * 6, taken: false, pop: o.pop ? 0.35 : 0 };
    m.items.push(it);
    return it;
  }
  function removeItem(m, it) {
    if (it.taken) return;
    it.taken = true;
    group.remove(it.g);
    const i = m.items.indexOf(it);
    if (i >= 0) m.items.splice(i, 1);
  }
  /** Throw something on the ground beside a point, on a free cell. */
  function spill(m, kind, x, z, o) {
    for (let t = 0; t < 14; t++) {
      const a = m.rnd() * Math.PI * 2, d = 0.9 + m.rnd() * 1.2;
      const px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
      if (world.walkable(px, pz)) return addItem(m, kind, px, pz, { ...o, pop: true });
    }
    return addItem(m, kind, x, z, { ...o, pop: true });
  }

  /** Does this keeper want it? `swap` is the slot a gun would go into. */
  function wants(k, it) {
    if (it.kind === 'tonic') return k.tonics < MAX_TONIC;
    if (it.kind === 'cell') return k.cells < MAX_CELL;
    if (it.kind === 'ammo') return !k.isBot && k.ammo < MAX_AMMO;
    if (!k.guns[0] || !k.guns[1]) return !k.guns.some((g) => g && g.id === it.id && g.rar >= it.rar);
    if (k.guns.some((g) => g.id === it.id && g.rar >= it.rar)) return false;
    const worst = Math.min(gunScore(k.guns[0].id, k.guns[0].rar), gunScore(k.guns[1].id, k.guns[1].rar));
    return gunScore(it.id, it.rar) > worst * 1.2;
  }
  function take(m, k, it, slot = -1) {
    if (it.taken) return false;
    const hero = !k.isBot;
    if (it.kind === 'tonic') { if (k.tonics >= MAX_TONIC) return false; k.tonics++; }
    else if (it.kind === 'cell') { if (k.cells >= MAX_CELL) return false; k.cells++; }
    else if (it.kind === 'ammo') { if (k.ammo >= MAX_AMMO) return false; k.ammo = Math.min(MAX_AMMO, k.ammo + 60); }
    else {
      let s = slot;
      if (s < 0) s = !k.guns[0] ? 0 : !k.guns[1] ? 1 : -1;
      if (s < 0) {
        if (hero) s = k.slot > 0 ? k.slot - 1 : 0;
        else s = gunScore(k.guns[0].id, k.guns[0].rar) < gunScore(k.guns[1].id, k.guns[1].rar) ? 0 : 1;
      }
      const old = k.guns[s];
      if (old) spill(m, 'gun', k.pos.x, k.pos.z, { id: old.id, rar: old.rar, mag: old.mag });
      k.guns[s] = { id: it.id, rar: it.rar, mag: it.mag };
      if (hero) k.ammo = Math.min(MAX_AMMO, k.ammo + Math.ceil(GUNS[it.id].mag * AMMO_COST[it.id]));
      // pick a gun up and it is in your hands: nobody wants to fumble a key first
      if (k.slot === 0 || k.slot === s + 1 || !hero) k.slot = s + 1;
      k.reloadT = 0;
    }
    removeItem(m, it);
    if (hero) {
      on('pickup', { kind: it.kind, id: it.id, rar: it.rar });
      hooks.sfx?.(it.kind === 'gun' ? 'gun_pick' : 'crate_open');
    }
    return true;
  }

  // -------------------------------------------------------------- gunfire ---
  function bodyAt(m, x, z, owner, pad = 0) {
    for (const k of m.keepers) {
      if (k === owner || !k.alive || k.phase !== 'ground') continue;
      const dx = k.pos.x - x, dz = k.pos.z - z, r = BODY_R + pad;
      if (dx * dx + dz * dz < r * r) return k;
    }
    return null;
  }
  function heard(m, k, name, loud = 1) {
    const you = m.you;
    if (k === you) { hooks.sfx?.(name, 1); return; }
    const d = dist(k, you);
    if (d < 62 && m.sfxBudget > 0) { m.sfxBudget--; hooks.sfx?.(name, clamp(1.1 - d / 56, 0.06, 0.8) * loud); }
    if (d < 70 && (k.pingT || 0) <= 0) { k.pingT = 1.2; m.pings.push({ x: k.pos.x, z: k.pos.z, t: 2.4 }); }
  }

  function hurt(m, k, amount, from, o = {}) {
    if (!k.alive || k.phase !== 'ground' || m.over) return 0;
    if (from && from.isBot) amount *= k.isBot ? TUNE.rival : m.diff.dmg;
    const hadShield = k.shield > 0 && !o.dark;
    let left = amount;
    if (hadShield) { const s = Math.min(k.shield, left); k.shield -= s; left -= s; }
    k.hp -= left;
    k.hitT = 0.12;
    const you = m.you;
    if (k === you) {
      on('hurt', { amount, shield: hadShield, dark: !!o.dark, ang: from ? Math.atan2(from.pos.x - k.pos.x, from.pos.z - k.pos.z) : null });
      if (!o.dark) hooks.sfx?.(hadShield ? 'shield_hit' : 'hurt', 0.9);
      if (k.useT > 0 && !o.dark) k.useT = 0;                      // a hit breaks the drink
    } else if (from === you) {
      hooks.dmgNum?.(V(k.pos.x, k.pos.y + 1.7, k.pos.z), Math.max(1, Math.round(amount)), hadShield ? 'shield' : '');
      on('hit', { shield: hadShield, kill: k.hp <= 0, broke: hadShield && k.shield <= 0 });
    }
    if (hadShield && k.shield <= 0) particles.shockwave(V(k.pos.x, k.pos.y + 0.9, k.pos.z), '#5ad1ff', 1.6, 0.25);
    if (!o.dark) {
      particles.burst(V(k.pos.x, k.pos.y + 1, k.pos.z), hadShield ? '#7fdcff' : '#ff6b5e', 4, 2.6, 5, 0.3);
      if (from === you || k === you) particles.impact?.(V(k.pos.x, k.pos.y + 1, k.pos.z), hadShield ? '#9fe8ff' : '#fff0d0', 1.1, 0.16);
    }
    if (k.isBot && from && from !== k && !k.target) { k.target = from; k.react = 0.15; }
    if (k.hp <= 0) eliminate(m, k, from, o);
    return amount;
  }

  function eliminate(m, k, by, o = {}) {
    if (!k.alive) return;
    k.alive = false; k.hp = 0;
    m.alive--;
    const place = m.alive + 1;
    // what they carried is on the ground now, which is the reason to push a fight
    for (const g of k.guns) if (g) spill(m, 'gun', k.pos.x, k.pos.z, g);
    for (let i = 0; i < Math.min(2, k.tonics); i++) spill(m, 'tonic', k.pos.x, k.pos.z);
    for (let i = 0; i < Math.min(2, k.cells); i++) spill(m, 'cell', k.pos.x, k.pos.z);
    if (k.isBot) spill(m, 'ammo', k.pos.x, k.pos.z);
    k.guns = [null, null]; k.slot = 0;
    syncGun(k);
    particles.burst(V(k.pos.x, k.pos.y + 0.9, k.pos.z), '#ffd27a', 18, 3.6, 4, 0.7);
    particles.beam?.(V(k.pos.x, k.pos.y, k.pos.z), '#ffd27a', 0.35, 7, 0.5);
    if (k.isBot) { k.fallT = 0.001; k.rig.plate.sp.visible = false; }
    const how = o.dark ? 'the Dark' : o.how || (by ? (heldGun(by) ? GUNS[heldGun(by).id].name : KNIFE.name) : 'a fall');
    if (by && by !== k) by.kills++;
    on('feed', { a: by && by !== k ? by.name : null, b: k.name, how, you: by === m.you || k === m.you });
    if (by === m.you && k !== m.you) { m.streak++; on('kill', { name: k.name, streak: m.streak, kills: m.you.kills, how }); hooks.sfx?.('royale_kill'); }
    if (k === m.you) { finish(m, false, place, by ? by.name : how); return; }
    if (m.alive === 1 && m.you.alive) { finish(m, true, 1, null); return; }
    if ([10, 5, 3, 2].includes(m.alive)) on('milestone', { n: m.alive });
  }

  function finish(m, won, place, by) {
    if (m.over) return;
    m.over = true;
    const kills = m.you.kills;
    const s = state.stats;
    s.played++; s.kills += kills; if (won) s.wins++;
    if (!s.best || place < s.best) s.best = place;
    m.result = {
      won, place, total: m.total, kills, time: m.t, by,
      coins: 30 + kills * 18 + (m.total - place) * 5 + (won ? 220 : 0),
      xp: 60 + kills * 30 + (m.total - place) * 6 + (won ? 300 : 0),
    };
    m.endT = 0.001;
  }

  function fire(m, k, g, aimDist) {
    const G = GUNS[g.id], mult = RARITIES[g.rar].mult;
    g.mag--;
    k.fireCd = 1 / G.rate;
    k.kick = Math.min(0.5, k.kick + G.kick * 2.2);
    const y = k.pos.y + 0.95;
    const reach = 0.55 + G.len * 0.8;
    const mx = k.pos.x + Math.sin(k.aim) * reach, mz = k.pos.z + Math.cos(k.aim) * reach;
    const col = TRACER[g.id];
    flare(mx, y, mz, G.pellets > 1 ? 2.3 : G.beam ? 0.8 : 1.3 + G.dmg * 0.02, col);
    if (!G.beam || (k.beamS = (k.beamS || 0) - 1) < 0) { k.beamS = 4; heard(m, k, G.sfx, G.beam ? 0.7 : 1); }
    if (k === m.you) hooks.shake?.(G.kick * 0.9);
    const bloom = G.spread * (k.moving ? 1.35 : 1) * (k.isBot ? m.diff.aim : 1);
    for (let p = 0; p < G.pellets; p++) {
      const a = k.aim + (m.rnd() - 0.5) * 2 * bloom;
      const dx = Math.sin(a), dz = Math.cos(a);
      if (G.beam) { beamShot(m, k, mx, y, mz, dx, dz, G, mult, col); continue; }
      if (G.arc) {
        const d = clamp(aimDist, 3, G.range);
        const mesh = new THREE.Mesh(shellGeo, addMat(col, 1));
        group.add(mesh);
        m.shells.push({ mesh, x0: mx, z0: mz, y0: y, x1: mx + dx * d, z1: mz + dz * d, t: 0, dur: d / G.speed, owner: k, dmg: G.dmg * mult, blast: G.blast, h: 2.4 + d * 0.22 });
        continue;
      }
      let mesh = tracerPool.pop();
      if (!mesh) mesh = new THREE.Mesh(tracerGeo, addMat(col));
      mesh.material = addMat(col);
      mesh.position.set(mx, y, mz); mesh.rotation.y = a;
      mesh.scale.set(G.pierce ? 1.6 : 1, G.pierce ? 1.6 : 1, clamp(G.speed * 0.04, 1.2, 3.6));
      group.add(mesh);
      m.bullets.push({ mesh, x: mx, z: mz, dx, dz, sp: G.speed, left: G.range, owner: k, dmg: G.dmg * mult, pierce: !!G.pierce, seen: G.pierce ? new Set() : null, col });
    }
  }
  function beamShot(m, k, x, y, z, dx, dz, G, mult, col) {
    let d = 0, hitK = null;
    for (; d < G.range; d += 0.4) {
      const px = x + dx * d, pz = z + dz * d;
      if (world.shotBlocked(px, pz)) break;
      hitK = bodyAt(m, px, pz, k, 0.1);
      if (hitK) break;
    }
    let mesh = tracerPool.pop();
    if (!mesh) mesh = new THREE.Mesh(tracerGeo, addMat(col));
    mesh.material = addMat(col);
    mesh.position.set(x + dx * d, y, z + dz * d); mesh.rotation.y = Math.atan2(dx, dz);
    mesh.scale.set(1.5, 1.5, Math.max(0.2, d));
    group.add(mesh);
    m.beams.push({ mesh, life: 0.06 });
    if (hitK) hurt(m, hitK, G.dmg * mult, k);
    else if (d < G.range && m.rnd() < 0.3) particles.burst(V(x + dx * d, y, z + dz * d), col, 2, 1.6, 3, 0.2);
  }
  function explode(m, x, y, z, s) {
    particles.shockwave(V(x, y + 0.1, z), '#ff9a4a', s.blast * 1.1, 0.35);
    particles.burst(V(x, y + 0.5, z), '#ffb04a', 20, 5.5, 6, 0.6);
    particles.burst(V(x, y + 0.5, z), '#3a2a22', 10, 3, 2, 0.9);
    flare(x, y + 0.8, z, s.blast * 3.2, '#ffb04a');
    const you = m.you, dy = Math.hypot(you.pos.x - x, you.pos.z - z);
    if (dy < 40) { hooks.sfx?.('gun_boom', clamp(1.1 - dy / 40, 0.1, 1)); hooks.shake?.(clamp(0.5 - dy / 30, 0, 0.5)); }
    for (const k of m.keepers) {
      if (!k.alive || k.phase !== 'ground') continue;
      const d = Math.hypot(k.pos.x - x, k.pos.z - z);
      if (d > s.blast || (d > 1 && !world.losClear(x, z, k.pos.x, k.pos.z))) continue;
      hurt(m, k, s.dmg * (1 - 0.6 * d / s.blast) * (k === s.owner ? 0.5 : 1), s.owner, { how: GUNS.mortar.name });
    }
  }
  function knife(m, k) {
    k.fireCd = 1 / KNIFE.rate; k.swingT = 0.24;
    particles.slash?.(V(k.pos.x, k.pos.y + 0.9, k.pos.z), k.aim, '#fff2d8', KNIFE.range, KNIFE.arc, 0.2);
    heard(m, k, 'swing', 0.8);
    for (const o of m.keepers) {
      if (o === k || !o.alive || o.phase !== 'ground') continue;
      const d = dist(k, o);
      if (d > KNIFE.range + BODY_R) continue;
      if (Math.abs(angDiff(Math.atan2(o.pos.x - k.pos.x, o.pos.z - k.pos.z), k.aim)) > KNIFE.arc / 2 + 0.2) continue;
      hurt(m, o, KNIFE.dmg, k, { how: KNIFE.name });
    }
  }
  function startReload(m, k) {
    const g = heldGun(k);
    if (!g || k.reloadT > 0) return false;
    const G = GUNS[g.id];
    if (g.mag >= G.mag) return false;
    if (!k.isBot && k.ammo < AMMO_COST[g.id]) return false;
    k.reloadDur = G.reload; k.reloadT = G.reload;
    if (k === m.you) hooks.sfx?.('gun_reload');
    return true;
  }
  function endReload(k) {
    const g = heldGun(k);
    if (!g) return;
    const G = GUNS[g.id], need = G.mag - g.mag;
    if (k.isBot) { g.mag = G.mag; return; }
    const can = Math.min(need, Math.floor(k.ammo / AMMO_COST[g.id]));
    g.mag += can; k.ammo = Math.max(0, k.ammo - can * AMMO_COST[g.id]);
  }
  function startUse(m, k, kind) {
    if (k.useT > 0 || k.phase !== 'ground') return false;
    if (kind === 'tonic') { if (k.tonics <= 0 || k.hp >= HP) return false; k.useDur = TONIC_TIME; }
    else { if (k.cells <= 0 || k.shield >= SHIELD) return false; k.useDur = CELL_TIME; }
    k.useKind = kind; k.useT = k.useDur; k.reloadT = 0;
    if (k === m.you) hooks.sfx?.('potion', 0.5);
    return true;
  }
  function endUse(m, k) {
    if (k.useKind === 'tonic') { k.tonics--; k.hp = Math.min(HP, k.hp + TONIC_HEAL); particles.rise?.(V(k.pos.x, k.pos.y, k.pos.z), '#63e08a', 1, 10); }
    else { k.cells--; k.shield = Math.min(SHIELD, k.shield + CELL_CHARGE); particles.rise?.(V(k.pos.x, k.pos.y, k.pos.z), '#5ad1ff', 1, 10); }
    if (k === m.you) hooks.sfx?.(k.useKind === 'tonic' ? 'potion' : 'shield_up');
    k.useKind = null;
  }

  // ------------------------------------------------------------- airdrops ---
  function callDrop(m) {
    const r = m.ring;
    let spot = null;
    for (let t = 0; t < 40 && !spot; t++) {
      const a = m.rnd() * Math.PI * 2, d = m.rnd() * Math.max(4, r.nr * 0.8);
      const x = r.nx + Math.sin(a) * d, z = r.nz + Math.cos(a) * d;
      if (world.walkable(x, z) && !world.blocked(x, z, 2) && world.houseAt(x, z) < 0) spot = { x, z };
    }
    if (!spot) return;
    const g = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), solid('#8a5a2e'));
    crate.position.y = 0.55; crate.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.2, 1.56), solid('#ffb238')); band.position.y = 0.7;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.6), solid('#6e4520')); lid.position.y = 1.16;
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), addMat('#ffd27a', 1)); lamp.position.y = 1.6;
    const bal = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), solid(i % 2 ? '#f2e6cc' : '#e0522f'));
      s.scale.set(0.45, 1.15, 1); s.rotation.y = (i / 6) * Math.PI; bal.add(s);
    }
    bal.position.y = 4.6;
    for (const [sx, sz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 4), solid('#d8c8a8'));
      rope.position.set(sx * 0.8, 2.3, sz * 0.8); bal.parent || g.add(rope); rope.userData.rope = true;
    }
    const pil = new THREE.Mesh(pillarGeo, addMat('#ffb238', 0.22)); pil.scale.set(5, 60, 5);
    const ring = new THREE.Mesh(ringGeo, addMat('#ffb238', 0.9)); ring.scale.setScalar(3.4);
    g.add(crate, band, lid, lamp, bal);
    const gy = world.heightAt(spot.x, spot.z);
    g.position.set(spot.x, gy + 46, spot.z);
    pil.position.set(spot.x, gy, spot.z); ring.position.set(spot.x, gy + 0.08, spot.z);
    group.add(g, pil, ring);
    m.drops.push({ x: spot.x, z: spot.z, gy, g, bal, lid, lamp, pil, ring, landed: false, opened: false, t: 0 });
    on('drop', { x: spot.x, z: spot.z });
    hooks.sfx?.('royale_supply');
  }
  function openDrop(m, d, by) {
    d.opened = true;
    d.lid.visible = false; d.lamp.visible = false;
    group.remove(d.pil); d.ring.material = addMat('#ffb238', 0.3);
    const a = rollGun(m.rnd, 3), b = rollGun(m.rnd, 2);
    spill(m, 'gun', d.x, d.z, { id: a.id, rar: Math.max(2, a.rar) === 2 && m.rnd() < 0.5 ? 3 : Math.max(2, a.rar) });
    spill(m, 'gun', d.x, d.z, { id: b.id === a.id ? 'lance' : b.id, rar: Math.max(1, b.rar) });
    spill(m, 'cell', d.x, d.z); spill(m, 'cell', d.x, d.z); spill(m, 'tonic', d.x, d.z); spill(m, 'ammo', d.x, d.z);
    particles.burst(V(d.x, d.gy + 1, d.z), '#ffd27a', 26, 4.5, 5, 0.8);
    particles.shockwave(V(d.x, d.gy + 0.1, d.z), '#ffb238', 3.4, 0.4);
    if (by === m.you || dist({ pos: d }, m.you) < 30) hooks.sfx?.('weapon_up', by === m.you ? 1 : 0.4);
  }

  // ------------------------------------------------------------------ AI ---
  function steer(m, b, ang, dt, speed) {
    const tries = [0, 0.55 * b.side, -0.55 * b.side, 1.15 * b.side, -1.15 * b.side, 1.8 * b.side, -1.8 * b.side];
    for (const o of tries) {
      const a = ang + o, sx = Math.sin(a), sz = Math.cos(a);
      if (!world.walkable(b.pos.x + sx * 0.6, b.pos.z + sz * 0.6)) continue;
      b.pos.x += sx * speed * dt; b.pos.z += sz * speed * dt;
      b.moveA = a; b.moving = true;
      if (o !== 0 && Math.sign(o) !== b.side) b.side = -b.side;
      return true;
    }
    b.side = -b.side;
    return false;
  }
  /** Walk toward a point, going through doors rather than into walls. */
  function nav(m, b, tx, tz, dt, speed = BOT_SPEED) {
    const hb = world.houseAt(b.pos.x, b.pos.z), hg = world.houseAt(tx, tz);
    const key = `${hb}|${hg}`;
    if (key !== b.doorKey) { b.doorKey = key; b.atDoor = false; }
    if (hb !== hg) {
      const H = world.houses[hb >= 0 ? hb : hg];
      const first = hb >= 0 ? H.inner : H.outer, second = hb >= 0 ? H.outer : H.inner;
      if (!b.atDoor && Math.hypot(first.x - b.pos.x, first.z - b.pos.z) < 0.55) b.atDoor = true;
      const w = b.atDoor ? second : first;
      tx = w.x; tz = w.z;
    }
    if (b.detourT > 0) { b.detourT -= dt; return steer(m, b, b.detourA, dt, speed); }
    const d = Math.hypot(tx - b.pos.x, tz - b.pos.z);
    // no progress for a while: go sideways, the way water finds a way round a stone
    b.stallT += dt;
    if (d < b.bestD - 0.4) { b.bestD = d; b.stallT = 0; }
    if (b.stallT > 1.3) { b.stallT = 0; b.bestD = d + 2; b.detourT = 0.7 + m.rnd() * 0.7; b.detourA = Math.atan2(tx - b.pos.x, tz - b.pos.z) + b.side * (1.2 + m.rnd() * 0.9); b.side = m.rnd() < 0.5 ? 1 : -1; }
    if (d < 0.25) { b.moving = false; return true; }
    return steer(m, b, Math.atan2(tx - b.pos.x, tz - b.pos.z), dt, speed);
  }
  const inRing = (m, x, z, pad = 0) => Math.hypot(x - m.ring.x, z - m.ring.z) < m.ring.r - pad;
  function setGoal(b, x, z, why) { b.goal = { x, z, why }; b.bestD = 1e9; b.stallT = 0; b.goalT = 0; }

  function think(m, b) {
    // who can I see
    const truce = b.groundT < TUNE.truce;
    let best = null, bd = 1e9;
    for (const o of m.keepers) {
      if (o === b || !o.alive || o.phase !== 'ground') continue;
      // a keeper is hunted by two at most (three for you): a fight, not a pile
      if ((o.hunters || 0) >= (o === m.you ? 3 : 2) && b.target !== o) continue;
      const d = dist(b, o);
      if (d >= bd || d > (truce ? 4 : o.isBot ? TUNE.sightBot : TUNE.sight)) continue;
      if (d > 4 && !world.losClear(b.pos.x, b.pos.z, o.pos.x, o.pos.z)) continue;
      best = o; bd = d;
    }
    if (best !== b.target) { b.target = best; if (best) b.react = m.diff.react * (0.6 + m.rnd() * 0.8); }
    if (b.target) return;
    // what is worth walking to
    let item = null, id = 26;
    for (const it of m.items) {
      const d = Math.hypot(it.x - b.pos.x, it.z - b.pos.z);
      if (d < id && wants(b, it) && inRing(m, it.x, it.z, 1)) { item = it; id = d; }
    }
    if (item) { b.item = item; setGoal(b, item.x, item.z, 'loot'); return; }
    b.item = null;
    const armed = b.guns[0] || b.guns[1];
    for (const d of m.drops) {
      if (!d.opened && inRing(m, d.x, d.z, 1) && Math.hypot(d.x - b.pos.x, d.z - b.pos.z) < 42 && (!armed || m.rnd() < 0.4)) { setGoal(b, d.x + 1.2, d.z, 'drop'); return; }
    }
    if (!b.goal || b.goal.why === 'loot' || b.goalT > 14) {
      // roam: somewhere with loot spots, inside the light; sometimes a house to hold
      for (let t = 0; t < 12; t++) {
        const hs = world.houses;
        const s = hs.length && m.rnd() < 0.3 ? hs[Math.floor(m.rnd() * hs.length)].centre : world.lootSpots[Math.floor(m.rnd() * world.lootSpots.length)];
        const d = Math.hypot(s.x - b.pos.x, s.z - b.pos.z);
        if (d > 8 && d < 60 && inRing(m, s.x, s.z, 3)) { setGoal(b, s.x, s.z, 'roam'); return; }
      }
      setGoal(b, m.ring.x, m.ring.z, 'roam');
    }
  }

  function botGround(m, b, dt) {
    b.moving = false;
    b.thinkT -= dt; b.goalT = (b.goalT || 0) + dt;
    if (b.react > 0) b.react -= dt;
    if (b.thinkT <= 0) { b.thinkT = 0.28 + m.rnd() * 0.2; think(m, b); }
    const r = m.ring;
    const dc = Math.hypot(b.pos.x - r.x, b.pos.z - r.z);
    const outside = dc > r.r - 1.5 - Math.min(4, r.r * 0.15);
    const willBe = Math.hypot(b.pos.x - r.nx, b.pos.z - r.nz) > r.nr - 2 && (r.mode === 'shrink' || r.left < 14);
    if (b.useT > 0 && !outside) return;
    const t = b.target && b.target.alive ? b.target : (b.target = null);
    const g = heldGun(b);

    // put the best gun in hand
    if (!g && (b.guns[0] || b.guns[1])) b.slot = b.guns[0] ? 1 : 2;
    if (b.guns[0] && b.guns[1] && b.reloadT <= 0 && t) {
      const d = dist(b, t);
      const fit = (x) => -Math.abs(GUNS[x.id].ideal - d) + (x.mag > 0 ? 6 : 0);
      const want = fit(b.guns[0]) >= fit(b.guns[1]) ? 1 : 2;
      if (want !== b.slot && (b.swapT = (b.swapT || 0) - dt) <= 0) { b.slot = want; b.swapT = 2.5; b.fireCd = Math.max(b.fireCd, 0.35); }
    }

    if (outside && (!t || dc > r.r + 1)) {                       // the Dark first
      nav(m, b, r.x + (b.pos.x - r.x) * 0.55 * (r.r / Math.max(1, dc)), r.z + (b.pos.z - r.z) * 0.55 * (r.r / Math.max(1, dc)), dt, BOT_SPEED * 1.08);
      b.aim = b.moveA ?? b.aim;
      return;
    }
    if (t) {
      const d = dist(b, t), ta = Math.atan2(t.pos.x - b.pos.x, t.pos.z - b.pos.z);
      const los = d < 4 || world.losClear(b.pos.x, b.pos.z, t.pos.x, t.pos.z);
      // aim eases onto the target, with a wobble that is the difficulty
      b.wob = (b.wob || 0) + dt * 2.3;
      const err = Math.sin(b.wob + b.seed) * 0.07 * m.diff.aim * (1.4 - b.skill);
      b.aim += angDiff(ta + err, b.aim) * Math.min(1, dt * (7 + b.skill * 5));
      const hurtBad = b.hp + b.shield * 0.5 < 45;
      if (hurtBad && b.tonics > 0 && (!los || d > 15)) { startUse(m, b, 'tonic'); return; }
      if (!g) {
        // nothing to shoot with: rush with the knife if they are close, else go find a gun
        if (d < 4.5) { nav(m, b, t.pos.x, t.pos.z, dt, BOT_SPEED * 1.1); if (d < KNIFE.range + 0.2 && b.fireCd <= 0 && b.react <= 0) knife(m, b); }
        else if (b.goal) nav(m, b, b.goal.x, b.goal.z, dt);
        return;
      }
      const G = GUNS[g.id];
      if (g.mag <= 0 && b.reloadT <= 0) startReload(m, b);
      const ideal = Math.min(12, hurtBad ? G.ideal * 1.5 : G.ideal);
      b.strafeT = (b.strafeT || 0) - dt;
      if (b.strafeT <= 0) { b.strafeT = 0.8 + m.rnd() * 1.6; b.strafe = m.rnd() < 0.5 ? 1 : -1; }
      if (!los || d > Math.min(G.range * 0.85, ideal * 1.3, 15)) nav(m, b, t.pos.x, t.pos.z, dt);
      else if (d < ideal * 0.55) steer(m, b, ta + Math.PI + b.strafe * 0.5, dt, BOT_SPEED * 0.9);
      else steer(m, b, ta + b.strafe * Math.PI / 2, dt, BOT_SPEED * 0.6);
      if (willBe && !outside && m.rnd() < 0.02) b.target = null;
      // fire in bursts: nobody holds a trigger down for a whole magazine
      b.burstT = (b.burstT || 0) - dt;
      if (b.burstT < -(0.25 + (1 - b.skill) * 0.5)) b.burstT = G.auto ? 0.45 + m.rnd() * 0.6 : 0.05;
      if (los && b.react <= 0 && b.reloadT <= 0 && g.mag > 0 && b.fireCd <= 0 && d < Math.min(G.range * 0.95, 17)
          && Math.abs(angDiff(ta, b.aim)) < 0.2 && (b.burstT > 0 || !G.auto)) {
        fire(m, b, g, d);
        if (!G.auto) b.fireCd += 0.12 + m.rnd() * 0.3 * (1.5 - b.skill);
      }
      return;
    }
    // nobody about: mend, reload, loot, move with the light
    if (g && g.mag < GUNS[g.id].mag * 0.5 && b.reloadT <= 0) startReload(m, b);
    if (b.hp < 70 && b.tonics > 0 && startUse(m, b, 'tonic')) return;
    if (b.shield < 55 && b.cells > 0 && startUse(m, b, 'cell')) return;
    if (willBe && (!b.goal || b.goal.why !== 'ring')) {
      const a = m.rnd() * 6.28, d = m.rnd() * r.nr * 0.6;
      setGoal(b, r.nx + Math.sin(a) * d, r.nz + Math.cos(a) * d, 'ring');
    }
    if (b.holdT > 0) { b.holdT -= dt; b.aim += Math.sin(m.t * 0.7 + b.seed) * dt * 0.8; return; }
    if (!b.goal) return;
    nav(m, b, b.goal.x, b.goal.z, dt);
    b.aim = b.moveA ?? b.aim;
    const gd = Math.hypot(b.goal.x - b.pos.x, b.goal.z - b.pos.z);
    if (b.item && !b.item.taken && Math.hypot(b.item.x - b.pos.x, b.item.z - b.pos.z) < 1.1) { take(m, b, b.item); b.item = null; b.goal = null; b.thinkT = 0; }
    else if (gd < 0.9) {
      if (b.goal.why === 'roam' && world.houseAt(b.pos.x, b.pos.z) >= 0) b.holdT = 2.5 + m.rnd() * 5;
      b.goal = null; b.thinkT = 0;
    }
  }

  function pose(k, dt, time) {
    const P = k.parts;
    if (!P) return;
    const g = heldGun(k);
    k.kick = Math.max(0, k.kick - dt * 3.2);
    if (k.swingT > 0) k.swingT -= dt;
    if (k.isBot) {
      k.walk += dt * (k.moving ? 11 : 0);
      const sw = k.moving ? Math.sin(k.walk) * 0.75 : 0;
      P.legL.rotation.x = sw; P.legR.rotation.x = -sw;
      P.armL.rotation.set(-sw * 0.7, 0, 0); P.armR.rotation.set(sw * 0.7, 0, 0);
      if (k.rig.built.vis) k.rig.built.vis.position.y = k.moving ? Math.abs(Math.sin(k.walk)) * 0.05 : 0;
    }
    if (k.phase === 'glide') {
      P.armL.rotation.set(-2.9, 0, 0.5); P.armR.rotation.set(-2.9, 0, -0.5);
      P.legL.rotation.x = 0.25 + Math.sin(time * 3) * 0.1; P.legR.rotation.x = 0.1 - Math.sin(time * 3) * 0.1;
      return;
    }
    if (k.phase !== 'ground') return;
    if (k.useT > 0) { P.armR.rotation.set(-2.3, 0, -0.5); P.armL.rotation.set(-0.3, 0, 0); return; }
    if (g) {
      const long = GUNS[g.id].len > 0.45;
      const dip = k.reloadT > 0 ? 0.55 + Math.sin(time * 14) * 0.08 : 0;
      P.armR.rotation.set(-1.5 - k.kick + dip, 0, long ? -0.1 : 0);
      if (long) P.armL.rotation.set(-1.28 - k.kick * 0.6 + dip, 0, 0.56);
    } else if (k.swingT > 0) {
      const w = 1 - k.swingT / 0.24;
      P.armR.rotation.set(-2.3 + w * 2.5, 0, -0.5 + w * 0.9);
    } else if (k.isBot) P.armR.rotation.x = -0.7;
  }

  // ---------------------------------------------------------------- match ---
  function start(opts = {}) {
    stop();
    const rnd = world.mulberry(opts.seed ?? ((Math.random() * 1e9) | 0));
    const a = rnd() * Math.PI * 2, off = (rnd() - 0.5) * 56, half = ISLE_R + 30;
    const dx = Math.sin(a), dz = Math.cos(a);
    const chord = Math.sqrt((ISLE_R - 10) ** 2 - off * off);
    const m = {
      rnd, t: 0, total: ROYALE_SIZE, alive: ROYALE_SIZE, over: false, result: null, endT: 0,
      diff: DIFFICULTY[opts.difficulty] || DIFFICULTY.normal, diffId: DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal',
      keepers: [], items: [], bullets: [], shells: [], beams: [], flares: [], drops: [], pings: [],
      ship: { x: ROYALE_CX - dx * half - dz * off, z: ROYALE_CZ - dz * half + dx * off, dx, dz, s: 0, len: half * 2, sIn: half - chord, sOut: half + chord, x0: 0, z0: 0 },
      ring: { x: ROYALE_CX, z: ROYALE_CZ, r: ISLE_R + 8, nx: ROYALE_CX, nz: ROYALE_CZ, nr: PHASES[0].r, mode: 'wait', left: PHASES[0].wait, idx: 0, fx: ROYALE_CX, fz: ROYALE_CZ, fr: ISLE_R + 8 },
      streak: 0, onHero: 0, sfxBudget: 3, fire: false, tap: false, dryT: 0, darkT: 0, firstDrop: 38, you: null,
    };
    m.ship.x0 = m.ship.x; m.ship.z0 = m.ship.z;
    pickNext(m);
    const you = keeper(false, hooks.heroName?.() || 'You');
    you.pos = player.state.pos; you.parts = player.parts;
    player.state.group.scale.setScalar(KEEPER_SCALE);
    m.you = you; m.keepers.push(you);
    const names = [...NAMES].sort(() => rnd() - 0.5);
    for (let i = 0; i < ROYALE_SIZE - 1; i++) {
      const rig = rigFor(i, rnd);
      const b = keeper(true, names[i % names.length]);
      b.rig = rig; b.parts = rig.built.parts; b.pos = rig.built.group.position;
      rig.plate.name = b.name; rig.plate.key = ''; rig.plate.sp.visible = false;
      rig.built.group.visible = false; rig.built.group.rotation.set(0, 0, 0);
      b.skill = 0.35 + rnd() * 0.65; b.seed = rnd() * 100; b.side = rnd() < 0.5 ? 1 : -1; b.strafe = 1;
      b.thinkT = rnd() * 0.4; b.stallT = 0; b.bestD = 1e9; b.detourT = 0; b.holdT = 0;
      b.jumpS = m.ship.sIn + 3 + rnd() * (m.ship.sOut - m.ship.sIn - 6);
      group.add(rig.built.group);
      m.keepers.push(b);
    }
    // the ground is covered in things worth having: that is the first minute
    for (const s of world.lootSpots) {
      const roll = rnd();
      if (roll > 0.84) continue;
      const lift = s.poi ? 0.5 : 0;
      if (roll < 0.5) { const g = rollGun(rnd, lift + (s.house ? 0.6 : 0)); addItem(m, 'gun', s.x, s.z, g); }
      else if (roll < 0.62) addItem(m, 'ammo', s.x, s.z);
      else if (roll < 0.74) addItem(m, 'tonic', s.x, s.z);
      else addItem(m, 'cell', s.x, s.z);
    }
    you.gy = SHIP_Y;
    you.pos.set(m.ship.x, SHIP_Y + 1.1, m.ship.z);
    world.setRing(m.ring.x, m.ring.z, m.ring.r);
    const sk = world.skiff;
    if (sk) { sk.visible = true; sk.position.set(m.ship.x, SHIP_Y, m.ship.z); sk.rotation.y = Math.atan2(dx, dz); }
    state.active = m;
    return m;
  }

  function pickNext(m) {
    const r = m.ring, P = PHASES[r.idx];
    r.nr = P.r;
    const slack = Math.max(0, r.r - P.r) * 0.75;
    for (let t = 0; t < 30; t++) {
      const a = m.rnd() * Math.PI * 2, d = Math.sqrt(m.rnd()) * slack;
      const x = r.x + Math.sin(a) * d, z = r.z + Math.cos(a) * d;
      if (Math.hypot(x - ROYALE_CX, z - ROYALE_CZ) + P.r * 0.5 < ISLE_R - 6) { r.nx = x; r.nz = z; return; }
    }
    r.nx = r.x; r.nz = r.z;
  }

  function stop() {
    const m = state.active;
    if (!m) return;
    for (const k of m.keepers) {
      if (k.gun) { k.gun.parent?.remove(k.gun); k.gun = null; }
      setCanopy(k, false);
      if (k.isBot) group.remove(k.rig.built.group);
    }
    for (const b of m.bullets) { group.remove(b.mesh); tracerPool.push(b.mesh); }
    for (const b of m.beams) { group.remove(b.mesh); tracerPool.push(b.mesh); }
    for (const f of m.flares) { group.remove(f.s); flarePool.push(f.s); }
    for (const s of m.shells) group.remove(s.mesh);
    for (const it of m.items) group.remove(it.g);
    for (const d of m.drops) group.remove(d.g, d.pil, d.ring);
    if (world.skiff) world.skiff.visible = false;
    if (mark) mark.visible = false;
    player.state.group.scale.setScalar(1);
    player.setWeaponVisible?.(true);
    state.active = null;
  }

  function land(m, k) {
    let x = k.pos.x, z = k.pos.z;
    if (!world.walkable(x, z)) {
      search: for (let r = 0.6; r < 16; r += 0.6) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + r;
          if (world.walkable(x + Math.sin(a) * r, z + Math.cos(a) * r)) { x += Math.sin(a) * r; z += Math.cos(a) * r; break search; }
        }
      }
    }
    k.pos.set(x, world.heightAt(x, z), z);
    k.phase = 'ground';
    setCanopy(k, false);
    particles.shockwave(V(x, k.pos.y + 0.05, z), '#f3dcb0', 1.8, 0.3);
    particles.burst(V(x, k.pos.y + 0.2, z), '#e8c898', 10, 2.6, 4, 0.5);
    if (k === m.you) { on('landed', {}); hooks.sfx?.('royale_land'); hooks.shake?.(0.3); }
    else k.rig.plate.sp.visible = true;
  }

  function airborne(m, k, dt, time) {
    const s = m.ship;
    if (k.phase === 'ship') {
      k.pos.set(s.x, SHIP_Y + 1.1, s.z);
      const go = k.isBot ? s.s >= k.jumpS : (s.s >= s.sOut || (m.jump && s.s >= s.sIn));
      if (!go) return;
      k.phase = 'glide'; k.gy = SHIP_Y;
      setCanopy(k, true);
      if (k.isBot) {
        k.rig.built.group.visible = true;
        let best = null, bd = 1e9;
        for (let i = 0; i < 10; i++) {
          const sp = world.lootSpots[Math.floor(m.rnd() * world.lootSpots.length)];
          const d = Math.hypot(sp.x - s.x, sp.z - s.z);
          if (d < 52 && (!best || m.rnd() < 0.5)) { best = sp; bd = d; }
        }
        k.landAt = best || { x: s.x, z: s.z };
      } else { on('jumped', {}); hooks.sfx?.('royale_drop'); }
      return;
    }
    // gliding: steer where you like, the ground comes up at its own pace
    let vx = 0, vz = 0;
    if (k.isBot) {
      const dx = k.landAt.x - k.pos.x, dz = k.landAt.z - k.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.6) { vx = dx / d; vz = dz / d; }
    } else {
      const mv = hooks.moveVec?.();
      if (mv) { vx = mv.x; vz = mv.z; }
    }
    let x = k.pos.x + vx * GLIDE_SPEED * dt, z = k.pos.z + vz * GLIDE_SPEED * dt;
    const dc = Math.hypot(x - ROYALE_CX, z - ROYALE_CZ);
    if (dc > ISLE_R - 5) { x = ROYALE_CX + (x - ROYALE_CX) * (ISLE_R - 5) / dc; z = ROYALE_CZ + (z - ROYALE_CZ) * (ISLE_R - 5) / dc; }
    k.gy -= GLIDE_FALL * dt;
    if (vx || vz) k.aim = Math.atan2(vx, vz);
    k.pos.set(x, k.gy, z);
    if (k.canopy) { k.canopy.position.set(x, k.gy + 2.7, z); k.canopy.rotation.y = k.aim; }
    if (k.isBot) k.rig.built.group.rotation.y = k.aim;
    if (k.gy <= world.heightAt(x, z) + 0.05) land(m, k);
  }

  function heroGround(m, you, dt) {
    const p = player.state;
    you.moving = !!p.isMoving;
    // aim: the cursor on a desk, the nearest keeper you can see on a phone
    const pt = hooks.aimPoint?.();
    let aimDist = 12;
    if (pt) { you.aim = Math.atan2(pt.x - you.pos.x, pt.z - you.pos.z); aimDist = Math.hypot(pt.x - you.pos.x, pt.z - you.pos.z); }
    else {
      const g = heldGun(you), reach = g ? GUNS[g.id].range : 6;
      let best = null, bd = reach + 3;
      for (const o of m.keepers) {
        if (o === you || !o.alive || o.phase !== 'ground') continue;
        const d = dist(you, o);
        if (d < bd && world.losClear(you.pos.x, you.pos.z, o.pos.x, o.pos.z)) { best = o; bd = d; }
      }
      if (best) { you.aim = Math.atan2(best.pos.x - you.pos.x, best.pos.z - you.pos.z); aimDist = bd; }
      else if (you.moving) you.aim = p.facing;
    }
    if (p.rolling <= 0) { p.facing = you.aim; p.group.rotation.y = you.aim; }
    // what is at my feet
    let near = null, nd = 1.9;
    for (const it of m.items) {
      const d = Math.hypot(it.x - you.pos.x, it.z - you.pos.z);
      if (d > 2.2 || it.pop > 0) continue;
      if (d < 1.25 && (it.kind !== 'gun' ? wants(you, it) : (!you.guns[0] || !you.guns[1]) && !you.guns.some((g) => g && g.id === it.id && g.rar >= it.rar))) { take(m, you, it); continue; }
      if (it.kind === 'gun' && d < nd) { near = it; nd = d; }
    }
    you.near = near;
    // the trigger
    const g = heldGun(you), tap = m.tap;
    m.tap = false;
    if (you.useT > 0 || p.rolling > 0) return;
    if (!g) { if ((tap || m.fire) && you.fireCd <= 0) knife(m, you); return; }
    const G = GUNS[g.id];
    if (you.reloadT > 0) return;
    if (g.mag <= 0) {
      if (!startReload(m, you) && (tap || (m.fire && m.dryT <= 0))) { m.dryT = 0.4; hooks.sfx?.('gun_dry'); on('dry', {}); }
      return;
    }
    if (you.fireCd <= 0 && (tap || (m.fire && (G.auto || m.fresh)))) { m.fresh = false; fire(m, you, g, aimDist); }
  }

  function update(dt, time) {
    const m = state.active;
    if (!m) return;
    m.t += dt;
    if (m.over) {
      if (m.endT > 0) { m.endT += dt; if (m.endT > 0.9) { m.endT = 0; hooks.onEnd?.(m.result); } }
      tickFx(m, dt, time);
      return;
    }
    m.sfxBudget = 3;
    if (m.dryT > 0) m.dryT -= dt;
    const you = m.you;

    // ---- the ship
    const s = m.ship;
    if (s.s < s.len) {
      s.s += SHIP_SPEED * dt;
      s.x = s.x0 + s.dx * s.s; s.z = s.z0 + s.dz * s.s;
      const sk = world.skiff;
      if (sk) { sk.position.set(s.x, SHIP_Y + Math.sin(time * 1.3) * 0.25, s.z); sk.visible = true; }
    } else if (world.skiff) world.skiff.visible = false;

    // ---- the Dark
    const r = m.ring, P = PHASES[r.idx];
    r.left -= dt;
    if (r.mode === 'wait' && r.left <= 0) {
      r.mode = 'shrink'; r.left = P.shrink; r.fx = r.x; r.fz = r.z; r.fr = r.r;
      on('ring', { what: 'closing', idx: r.idx }); hooks.sfx?.('ring_warn');
    } else if (r.mode === 'shrink') {
      const k = clamp(1 - r.left / P.shrink, 0, 1);
      r.x = r.fx + (r.nx - r.fx) * k; r.z = r.fz + (r.nz - r.fz) * k; r.r = r.fr + (r.nr - r.fr) * k;
      if (r.left <= 0) {
        r.x = r.nx; r.z = r.nz; r.r = r.nr;
        if (r.idx < PHASES.length - 1) {
          r.idx++; r.mode = 'wait'; r.left = PHASES[r.idx].wait; pickNext(m);
          on('ring', { what: 'held', idx: r.idx });
          if (r.idx <= 4) callDrop(m);
        } else { r.mode = 'done'; r.left = 0; }
      }
    }
    world.setRing(r.x, r.z, r.r);
    if (m.firstDrop > 0 && (m.firstDrop -= dt) <= 0) callDrop(m);
    const dark = PHASES[r.mode === 'wait' && r.idx > 0 ? r.idx - 1 : r.idx].dark;
    m.darkT -= dt;

    // ---- everybody
    for (const k of m.keepers) k.hunters = 0;
    for (const k of m.keepers) if (k.isBot && k.alive && k.target) k.target.hunters++;
    for (const k of m.keepers) {
      if (k.isBot && k.fallT > 0) {                               // a keeper going down
        k.fallT += dt;
        const G = k.rig.built.group;
        G.rotation.x = -Math.min(1, k.fallT / 0.35) * 1.5;
        if (k.fallT > 2.2) { G.visible = false; k.fallT = 0; }
      }
      if (!k.alive) continue;
      if (k.pingT > 0) k.pingT -= dt;
      if (k.fireCd > 0) k.fireCd -= dt;
      if (k.pop > 0) k.pop -= dt;
      if (k.hitT > 0) k.hitT -= dt;
      if (k.phase !== 'ground') { airborne(m, k, dt, time); syncGun(k); pose(k, dt, time); continue; }
      if (k.reloadT > 0 && (k.reloadT -= dt) <= 0) endReload(k);
      if (k.useT > 0 && (k.useT -= dt) <= 0) endUse(m, k);
      k.groundT = (k.groundT || 0) + dt;
      if (k.isBot) {
        botGround(m, k, dt);
        k.pos.y = world.heightAt(k.pos.x, k.pos.z);
        const G = k.rig.built.group;
        G.rotation.y += angDiff(k.target ? k.aim : (k.moveA ?? k.aim), G.rotation.y) * Math.min(1, dt * 12);
        if (k.target) G.rotation.y = k.aim;
        drawPlate(k.rig.plate, k);
        // a keeper under a roof is hidden unless you are under it too
        const hb = world.houseAt(k.pos.x, k.pos.z);
        const seen = hb < 0 || hb === world.houseAt(you.pos.x, you.pos.z);
        k.rig.plate.sp.visible = seen && dist(k, you) < 34;
      } else heroGround(m, k, dt);
      syncGun(k);
      pose(k, dt, time);
      if (Math.hypot(k.pos.x - r.x, k.pos.z - r.z) > r.r) {
        k.inDark = true;
        if (m.darkT <= 0) hurt(m, k, dark * 0.5, null, { dark: true });
      } else k.inDark = false;
      if (!m.over) for (const d of m.drops) if (d.landed && !d.opened && Math.hypot(d.x - k.pos.x, d.z - k.pos.z) < 2.3) openDrop(m, d, k);
    }
    if (m.darkT <= 0) m.darkT = 0.5;
    if (m.you.alive) player.setWeaponVisible?.(false);
    const mk = heroMark(), hg = heldGun(you);
    mk.visible = you.alive && you.phase === 'ground';
    if (mk.visible) {
      mk.position.set(you.pos.x, you.pos.y + 0.09, you.pos.z);
      mk.userData.arm.rotation.y = you.aim;
      mk.userData.arm.visible = !!hg;
      if (hg) mk.userData.line.scale.z = Math.min(GUNS[hg.id].range, 11);
    }
    tickFx(m, dt, time);
  }

  function tickFx(m, dt, time) {
    const you = m.you;
    // rounds in flight, stepped so a fast one cannot skip a wall or a body
    for (let i = m.bullets.length - 1; i >= 0; i--) {
      const b = m.bullets[i];
      let step = b.sp * dt, dead = false;
      while (step > 0 && !dead) {
        const d = Math.min(0.5, step); step -= d;
        b.x += b.dx * d; b.z += b.dz * d; b.left -= d;
        if (b.left <= 0) { dead = true; break; }
        if (world.shotBlocked(b.x, b.z)) {
          particles.burst(V(b.x, world.heightAt(b.x, b.z) + 0.95, b.z), '#ffd9a0', 3, 2.2, 5, 0.25);
          dead = true; break;
        }
        const k = bodyAt(m, b.x, b.z, b.owner);
        if (k && !(b.seen && b.seen.has(k))) {
          hurt(m, k, b.dmg, b.owner);
          if (b.pierce) b.seen.add(k); else dead = true;
        }
      }
      if (dead) { group.remove(b.mesh); tracerPool.push(b.mesh); m.bullets.splice(i, 1); }
      else b.mesh.position.set(b.x, world.heightAt(b.x, b.z) + 0.95, b.z);
    }
    for (let i = m.shells.length - 1; i >= 0; i--) {
      const s = m.shells[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const x = s.x0 + (s.x1 - s.x0) * k, z = s.z0 + (s.z1 - s.z0) * k;
      const gy = world.heightAt(x, z);
      const y = s.y0 + (gy + 0.2 - s.y0) * k + Math.sin(k * Math.PI) * s.h;
      s.mesh.position.set(x, y, z);
      if (m.rnd() < 0.5) particles.burst(V(x, y, z), '#ffb04a', 1, 0.4, 0, 0.25);
      if (k >= 1 || (k > 0.15 && y < gy + 1.6 && world.shotBlocked(x, z))) { group.remove(s.mesh); m.shells.splice(i, 1); explode(m, x, gy, z, s); }
    }
    for (let i = m.beams.length - 1; i >= 0; i--) {
      const b = m.beams[i];
      if ((b.life -= dt) <= 0) { group.remove(b.mesh); tracerPool.push(b.mesh); m.beams.splice(i, 1); }
    }
    for (let i = m.flares.length - 1; i >= 0; i--) {
      const f = m.flares[i];
      f.life -= dt;
      f.s.material.opacity = Math.max(0, f.life / 0.07);
      if (f.life <= 0) { group.remove(f.s); flarePool.push(f.s); m.flares.splice(i, 1); }
    }
    for (let i = m.pings.length - 1; i >= 0; i--) if ((m.pings[i].t -= dt) <= 0) m.pings.splice(i, 1);
    // things on the ground turn and bob; far ones are not drawn
    for (const it of m.items) {
      const d = Math.abs(it.x - you.pos.x) + Math.abs(it.z - you.pos.z);
      it.g.visible = d < 70;
      if (!it.g.visible) continue;
      if (it.pop > 0) it.pop -= dt;
      it.body.rotation.y = time * 1.4 + it.ph;
      it.g.position.y = it.y + Math.max(0, it.pop) * 2.2 + (it.kind === 'gun' ? Math.sin(time * 2 + it.ph) * 0.07 : 0);
    }
    for (const d of m.drops) {
      d.t += dt;
      if (!d.landed) {
        const y = Math.max(d.gy, d.g.position.y - 4.2 * dt);
        d.g.position.y = y;
        d.g.rotation.y = Math.sin(d.t * 0.8) * 0.3;
        d.ring.scale.setScalar(3.4 + Math.sin(d.t * 5) * 0.3);
        if (y <= d.gy) {
          d.landed = true; d.g.rotation.y = 0;
          for (const c of [...d.g.children]) if (c.userData.rope) d.g.remove(c);
          particles.shockwave(V(d.x, d.gy + 0.1, d.z), '#f3dcb0', 3.2, 0.4);
          particles.burst(V(d.x, d.gy + 0.3, d.z), '#e8c898', 16, 3.4, 4, 0.6);
          const dy = Math.hypot(d.x - you.pos.x, d.z - you.pos.z);
          if (dy < 40) { hooks.sfx?.('royale_land', clamp(1 - dy / 40, 0.1, 1)); hooks.shake?.(clamp(0.3 - dy / 60, 0, 0.3)); }
          on('dropLanded', { x: d.x, z: d.z });
        }
      } else if (d.bal.parent) {                                   // the balloon lets go
        d.bal.position.y += dt * 5; d.bal.scale.multiplyScalar(1 - dt * 0.5);
        if (d.bal.position.y > 26) d.g.remove(d.bal);
      }
      d.lamp.rotation.y += dt * 2;
    }
  }

  // ------------------------------------------------------------- controls ---
  function act(name) {
    const m = state.active;
    if (!m || m.over) return false;
    const you = m.you;
    if (name === 'jump') { if (you.phase === 'ship' && m.ship.s >= m.ship.sIn) { m.jump = true; return true; } return false; }
    if (you.phase !== 'ground' || !you.alive) return false;
    if (name.startsWith('slot')) {
      const s = +name.slice(4);
      if (s === you.slot || (s > 0 && !you.guns[s - 1])) return false;
      you.slot = s; you.reloadT = 0; you.fireCd = Math.max(you.fireCd, 0.22); hooks.sfx?.('gun_swap');
      return true;
    }
    if (name === 'next' || name === 'prev') {
      const order = [0, 1, 2].filter((s) => s === 0 || you.guns[s - 1]);
      const i = order.indexOf(you.slot);
      return act(`slot${order[(i + (name === 'next' ? 1 : order.length - 1)) % order.length]}`);
    }
    if (name === 'reload') return startReload(m, you);
    if (name === 'tonic') return startUse(m, you, 'tonic');
    if (name === 'cell') return startUse(m, you, 'cell');
    if (name === 'heal') return startUse(m, you, you.shield < SHIELD && you.cells > 0 && (you.hp >= HP || you.hp > 60) ? 'cell' : 'tonic') || startUse(m, you, 'cell');
    if (name === 'pickup') { if (you.near) return take(m, you, you.near, you.slot > 0 ? you.slot - 1 : (!you.guns[0] ? 0 : !you.guns[1] ? 1 : 0)); return false; }
    return false;
  }
  function setFire(v) { const m = state.active; if (m) { if (v && !m.fire) m.fresh = true; m.fire = !!v; } }
  function tapFire() { const m = state.active; if (m) m.tap = true; }

  function forfeit() {
    const m = state.active;
    if (!m || m.over) return null;
    m.over = true;
    m.result = { won: false, place: m.alive, total: m.total, kills: m.you.kills, time: m.t, forfeit: true, coins: 0, xp: 0 };
    return m.result;
  }

  /** Everything the HUD draws, in one read. */
  function view() {
    const m = state.active;
    if (!m) return null;
    const you = m.you, g = heldGun(you), s = m.ship;
    const gun = (x) => (x ? { id: x.id, rar: x.rar, mag: x.mag, max: GUNS[x.id].mag, name: GUNS[x.id].name, cls: GUNS[x.id].cls, reserve: Math.floor(you.ammo / AMMO_COST[x.id]) } : null);
    return {
      t: m.t, alive: m.alive, total: m.total, over: m.over, diff: m.diff.name,
      ring: m.ring, phases: PHASES.length,
      ship: { x: s.x, z: s.z, dx: s.dx, dz: s.dz, x0: s.x0, z0: s.z0, len: s.len, on: s.s < s.len, canJump: s.s >= s.sIn && s.s < s.sOut },
      you: {
        x: you.pos.x, z: you.pos.z, aim: you.aim, hp: you.hp, shield: you.shield, alive: you.alive, phase: you.phase,
        alt: Math.max(0, you.pos.y - world.heightAt(you.pos.x, you.pos.z)), slot: you.slot, guns: [gun(you.guns[0]), gun(you.guns[1])],
        tonics: you.tonics, cells: you.cells, kills: you.kills, ammo: Math.floor(you.ammo), inDark: !!you.inDark,
        reload: you.reloadT > 0 ? 1 - you.reloadT / you.reloadDur : -1,
        use: you.useT > 0 ? 1 - you.useT / you.useDur : -1, useKind: you.useKind,
        near: you.near ? { id: you.near.id, rar: you.near.rar, name: GUNS[you.near.id].name, cls: GUNS[you.near.id].cls, swap: !!(you.guns[0] && you.guns[1]) } : null,
        spread: g ? GUNS[g.id].spread : 0.05, range: g ? GUNS[g.id].range : KNIFE.range,
      },
      drops: m.drops, pings: m.pings,
      place: world.placeAt(you.pos.x, you.pos.z),
    };
  }

  const serialize = () => ({ ...state.stats });
  function load(d) { if (d && typeof d === 'object') Object.assign(state.stats, { played: d.played | 0, wins: d.wins | 0, kills: d.kills | 0, best: d.best | 0 }); }

  return { state, start, stop, update, view, act, setFire, tapFire, forfeit, serialize, load, tune: TUNE };
}
