// Panels: Bag (Tab), Craft (C), Forge (V), Pets (P), Wardrobe (O), Help (?) — pixel style, touch friendly.
import * as THREE from 'three';
import { ITEMS, RARITY, RARITY_ORDER } from '../systems/items.js';
import { aboutInner, paintAboutRialo, ABOUT_BADGE_CSS } from './about.js';
import { itemIconUrl } from '../gfx/textures.js';
import { machineUrl, crankUrl, capsuleUrl, capsuleHalfUrl, CAPSULE_COLORS } from '../gfx/gachaart.js';
import { buildCharacterMesh } from '../entities/player.js';
import { buildCosmetic } from '../systems/cosmetics.js';
import { CLASSES } from '../systems/classes.js';
import { recipesFor, canCraft, craft } from '../systems/crafting.js';
import { createCraftShow } from './craftshow.js';
import { createIndexPanel } from './indexpanel.js';
import { forgeCost, forgeChance, MAX_PLUS } from '../systems/forge.js';
import { PET_DEFS } from '../systems/pets.js';
import { MOUNT_DEFS } from '../systems/mounts.js';
import {
  GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_COLORS,
  OUTFIT_STYLES, OUTFIT_COLORS, CAPE_COLORS, ACCESSORIES,
} from '../systems/classes.js';

const CSS = `
.panel {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -52%);
  width: min(500px, calc(100vw - 32px)); max-height: 78vh; overflow-y: auto;
  background:
    var(--dither) 0 0/4px 4px,
    linear-gradient(180deg, var(--panel-1), var(--panel-2));
  border: 0;
  box-shadow: var(--pix-frame), inset 0 0 50px rgba(0,0,0,0.45);
  padding: 15px; display: none;
  pointer-events: auto; z-index: 30;
  scrollbar-width: thin; scrollbar-color: var(--gold-dim) transparent;
}
.panel.show { display: block; animation: panel-in 0.14s ease-out; }
@keyframes panel-in { from { transform: translate(-50%, -50%) scale(0.97); opacity: 0; } }
.panel h3 {
  font-family: var(--font-display);
  font-size: 13px; letter-spacing: 3px; color: var(--gold); margin: -4px -4px 12px;
  padding: 8px 10px;
  background: linear-gradient(180deg, rgba(216,184,102,0.12), rgba(216,184,102,0.03));
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.22), inset 0 -3px 0 0 rgba(0,0,0,0.35);
  text-shadow: 0 1px 0 var(--ink), 0 0 12px var(--gold-glow);
}
.panel h3::before { content: '◆ '; font-size: 10px; color: var(--gold-dim); vertical-align: 2px; }
.panel h3 small { float: right; color: var(--muted); font-size: 10px; letter-spacing: 1px; }
.panel h4.sect {
  font-size: 11px; letter-spacing: 3px; color: var(--gold-dim); margin: 14px 0 8px;
}
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 5px; margin-bottom: 13px; }
.inv-cell {
  aspect-ratio: 1; background: #141a12; border: 2px solid #2c352c;
  display: flex; align-items: center; justify-content: center; position: relative;
}
.inv-cell img { width: 72%; height: 72%; image-rendering: pixelated; }
.inv-cell .cnt { position: absolute; bottom: 0; right: 2px; font-size: 10px; text-shadow: 1px 1px 0 #000; color: #e8e8d8; }
.inv-cell[data-pick] { cursor: pointer; }
.inv-cell[data-pick]:hover { border-color: #5a6a50; }
.inv-cell.picked { border-color: var(--gold, #d8b866); background: #1e2618; }
.inv-detail {
  display: flex; align-items: center; gap: 10px; padding: 8px;
  margin: 8px 0; background: rgba(216,184,102,0.07); border: 1px solid var(--gold-dim, #6a5a34);
}
.inv-detail img.ic { width: 34px; height: 34px; image-rendering: pixelated; }
.inv-detail .nm { flex: 1; font-size: 11px; color: #ffe8c8; min-width: 0; }
.inv-detail .nm .cnt { color: var(--gold, #d8b866); }
.inv-detail .nm small { display: block; font-size: 9px; color: #9aa890; margin-top: 3px; line-height: 1.6; }
.inv-detail .acts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
.inv-detail .act { font-size: 9px; padding: 5px 8px; }
.inv-detail .act.drop { background: #3a2620; color: #e0b0a0; }
.inv-detail .act.drop.armed { background: #a8392c; color: #fff; }
.inv-hint { font-size: 9.5px; color: var(--muted, #8d9a80); letter-spacing: 0.5px; margin: 8px 0; }
.wep-row, .rec-row, .pet-row {
  display: flex; align-items: center; gap: 9px; padding: 7px;
  border: 2px solid #2c352c; background: #141a12; margin-bottom: 6px;
}
.wep-row img.ic, .rec-row img.ic { width: 32px; height: 32px; image-rendering: pixelated; }
.wep-row .nm, .rec-row .nm, .pet-row .nm { flex: 1; font-size: 12px; color: #e5ead8; }
.wep-row .nm small, .rec-row .nm small, .pet-row .nm small { display: block; color: #8fa584; font-size: 9px; margin-top: 3px; line-height: 1.5; }
.wep-row .plus, .forge-target .plus { color: #ffd23e; }
.rec-row .cost { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; max-width: 130px; justify-content: flex-end; }
.rec-row .cost span { display: flex; align-items: center; font-size: 10px; gap: 2px; }
.rec-row .cost img { width: 15px; height: 15px; image-rendering: pixelated; }
.rec-row .cost .lack { color: #e87a6a; }
.rec-row .cost .ok { color: #b8e89a; }
.panel button.act {
  font-family: inherit; font-size: 11px; padding: 8px 14px; cursor: pointer;
  background: linear-gradient(180deg, #57452a, #3a2e18); color: #ffe9b0;
  border: 0; letter-spacing: 1px; margin: 2px;
  box-shadow:
    0 -2px 0 0 #8a744a, 0 2px 0 0 #241c0a,
    -2px 0 0 0 #5a4a2a, 2px 0 0 0 #5a4a2a,
    0 0 0 3px var(--ink) inset;
  text-shadow: 0 1px 0 #241c0a;
}
.panel button.act:hover:not(:disabled) { filter: brightness(1.25); }
.panel button.act:active:not(:disabled) { transform: translateY(2px); }
.panel button.act:disabled {
  background: #242a24; color: #666f60; cursor: default; text-shadow: none;
  box-shadow: 0 -2px 0 0 #333c33, 0 2px 0 0 #181c18, -2px 0 0 0 #2a322a, 2px 0 0 0 #2a322a, 0 0 0 3px var(--ink) inset;
}
.panel button.eq {
  font-family: inherit; font-size: 11px; padding: 7px 12px; cursor: pointer;
  background: linear-gradient(180deg, #2a3522, #1a2215); color: #c2cbb0;
  border: 0; margin: 2px; box-shadow: var(--pix-btn);
}
.panel button.eq:hover:not(:disabled) { color: #ffe9b0; filter: brightness(1.2); }
.panel button.eq:active:not(:disabled) { transform: translateY(2px); }
.panel button.eq:disabled { opacity: 0.55; cursor: default; }
.forge-target {
  display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 10px;
  border: 2px solid #4a4034; background: linear-gradient(180deg, #1d1812, #141008);
}
.forge-target img { width: 40px; height: 40px; image-rendering: pixelated; }
.forge-target .nm { flex: 1; font-size: 13px; color: #ffe8c8; }
.forge-target .nm small { display: block; font-size: 9px; color: #9a8a70; margin-top: 3px; }
.forge-info { font-size: 10px; color: #9aa890; line-height: 1.9; margin-bottom: 10px; }
.forge-info .chance-hi { color: #b8e89a; } .forge-info .chance-lo { color: #e8a35d; }
.forge-cost { display: flex; gap: 10px; margin-bottom: 12px; }
.forge-cost span { display: flex; gap: 4px; align-items: center; font-size: 11px; }
.forge-cost img { width: 18px; height: 18px; image-rendering: pixelated; }
.forge-anim { animation: forge-shake 0.35s; }
@keyframes forge-shake { 25% { transform: translate(-50%, -52%) rotate(-1deg); } 75% { transform: translate(-50%, -52%) rotate(1deg); } }
.pet-row .dot { width: 34px; height: 34px; border: 2px solid #2c352c; image-rendering: pixelated;
  display: flex; align-items: center; justify-content: center; font-size: 17px; }
.pet-row.locked { opacity: 0.5; }
.pet-row .perk { color: #9fe86e; }
.coinbar {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--gold);
  margin-bottom: 10px; padding: 6px 10px; letter-spacing: 1px;
  background: rgba(216,184,102,0.08); border: 1px solid var(--gold-dim);
}
.coinbar img { width: 16px; height: 16px; image-rendering: pixelated; }
.steps { display: flex; gap: 6px; margin-bottom: 10px; }
.steps span { flex: 1; text-align: center; font-size: 9px; letter-spacing: 1px; padding: 5px 4px;
  border: 1px solid var(--line-soft); color: var(--muted); background: rgba(0,0,0,0.2); }
.steps span.now { border-color: var(--gold); color: var(--gold); box-shadow: 0 0 6px var(--gold-glow); }
.steps span.done { border-color: #4a7a4a; color: #8ac86a; }
.help-body { font-size: 11px; color: #cfd8c8; line-height: 2; }
.help-body h4 { font-size: 12px; color: #ffe9a8; letter-spacing: 2px; margin: 10px 0 4px; }
.help-body b { background: #202a20; border: 1px solid #39443a; padding: 0 5px; color: #c5cdbd; font-weight: normal; }
.help-body .tip { color: #b8d89a; }
`;

export function createPanels(hudRoot, {
  inventory, forge, character, weaponType, audio, pets, isTouch,
  onCraft, onForged, onSummonPet, onSummonMount, mountsRef, skillsApi,
  economy, cooking, estate, gacha, wardrobe, dailies, gamepass, gfxPanelFactory,
  onDrink, onBoostActive, skilltree, onWorkStart, onWorkEnd, index, friendsApi,
}) {
  // THE WORKBENCH SHOW. Cooking and crafting both run through it, so it lives
  // here rather than in main.js — both buttons are already in this file, and a
  // module that owns a modal should own the modal.
  const craftShow = createCraftShow(audio);
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panels = {
    inv: document.createElement('div'),
    cra: document.createElement('div'),
    forge: document.createElement('div'),
    pets: document.createElement('div'),
    skills: document.createElement('div'),
    shop: document.createElement('div'),
    cook: document.createElement('div'),
    estate: document.createElement('div'),
    gacha: document.createElement('div'),
    ward: document.createElement('div'),
    help: document.createElement('div'),
    about: document.createElement('div'),
    daily: document.createElement('div'),
    pass: document.createElement('div'),
    gfx: document.createElement('div'),
    life: document.createElement('div'),
    index: document.createElement('div'),
    friends: document.createElement('div'),
  };
  for (const p of Object.values(panels)) {
    p.className = 'panel';
    hudRoot.appendChild(p);
  }

  // --- live 3D hero preview for the Wardrobe (rebuilt from the SAME config
  // and equipped cosmetics, so every edit shows instantly) ---
  const heroPreview = (() => {
    // owns a SINGLE persistent canvas + renderer (moved between panel renders)
    // so we never leak WebGL contexts on re-render
    let renderer = null, scene = null, cam = null, rig = null, raf = 0, alive = false;
    let hatMesh = null, backMesh = null, spin = 0.5;
    const canvas = document.createElement('canvas');
    canvas.className = 'w-preview';
    function ensure() {
      if (renderer) return;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
      scene = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      cam.position.set(0, 1.05, 3.0); cam.lookAt(0, 0.62, 0);
      scene.add(new THREE.HemisphereLight(0xcfd8c0, 0x3a443a, 1.25));
      const key = new THREE.DirectionalLight(0xfff2dc, 1.6); key.position.set(2, 3, 2.5); scene.add(key);
      const rim = new THREE.DirectionalLight(0xc8a03a, 0.75); rim.position.set(-2, 1.5, -2); scene.add(rim);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.14, 8),
        new THREE.MeshLambertMaterial({ color: 0x4a5236 }));
      ped.position.y = -0.07; scene.add(ped);
    }
    function rebuild() {
      if (!wardrobe?.appearance) return;
      ensure();
      if (rig) { scene.remove(rig.group); }
      hatMesh = backMesh = null;
      rig = buildCharacterMesh(wardrobe.appearance.config);
      rig.setWeapon(CLASSES[character.cls].startWeapon);
      rig.group.rotation.y = spin;
      scene.add(rig.group);
      // mirror the currently-equipped cosmetics
      const st = wardrobe.state;
      if (st.hat) { const c = buildCosmetic(st.hat); if (c) { hatMesh = c.mesh; hatMesh.position.y = 0.26; rig.parts.head.add(hatMesh); } }
      if (st.back) { const c = buildCosmetic(st.back); if (c) { backMesh = c.mesh; backMesh.position.set(0, 0.05, -0.16); rig.parts.body.add(backMesh); } }
    }
    function loop() {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      spin += 0.006;
      if (rig) rig.group.rotation.y = spin;
      // keep cosmetics lively in the preview
      const t = performance.now() / 1000;
      if (backMesh?.userData.wingRoots) {
        const beat = (Math.sin(t * 4) * 0.5 + 0.5) ** 1.6;
        backMesh.userData.wingRoots[0].rotation.y = 0.15 + beat * 0.6;
        backMesh.userData.wingRoots[1].rotation.y = -(0.15 + beat * 0.6);
      }
      if (hatMesh?.userData.spin) hatMesh.userData.spin.rotation.z = t * 0.8;
      if (renderer && scene && cam) renderer.render(scene, cam);
    }
    return {
      // slot = the placeholder element in the panel; we move our canvas into it
      mount(slot) {
        ensure();
        slot.replaceWith(canvas);
        const r = canvas.getBoundingClientRect();
        const w = r.width || 220, h = r.height || 200;
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
        rebuild();
        alive = true; if (!raf) loop();
      },
      refresh() { if (alive) rebuild(); },
      stop() { alive = false; cancelAnimationFrame(raf); raf = 0; },
    };
  })();

  function renderInventory() {
    const mats = [...inventory.state.materials.entries()];
    // the selected stack survives a re-render, unless it ran out
    if (invPick && !inventory.count(invPick)) invPick = null;

    let grid = '';
    const cells = Math.max(18, Math.ceil(mats.length / 6) * 6);
    for (let i = 0; i < cells; i++) {
      const m = mats[i];
      grid += m
        ? `<div class="inv-cell${m[0] === invPick ? ' picked' : ''}" data-pick="${m[0]}"
             title="${ITEMS[m[0]].name}"><img src="${itemIconUrl(m[0])}"><span class="cnt">${m[1]}</span></div>`
        : '<div class="inv-cell"></div>';
    }

    // THE CELLS USED TO BE INERT. An icon, a number and a tooltip — you could
    // not read what something was for, use it from there, or get rid of it, so
    // a bag full of Slime Gel just sat there forever. Clicking a stack now
    // selects it and opens the one row that says what it is and what you can
    // do with it.
    let detail = '';
    if (invPick) {
      const d = ITEMS[invPick] || {};
      const n = inventory.count(invPick);
      const bits = [];
      if (d.heal) bits.push(`Restores ${d.heal} HP`);
      if (d.buff) bits.push(`2x ${d.buff.toUpperCase()} for ${d.mins} min`);
      if (d.sell) bits.push(`Sells for ${d.sell}c each at Pip's`);
      if (d.fish) bits.push('Cook it at any campfire');
      if (d.petCharm) bits.push('Summon it from the Companions panel');
      if (d.mountId) bits.push('Ride it with M');
      if (d.cosmetic) bits.push('Wear it in the Wardrobe [O]');
      if (!bits.length) bits.push('A crafting material.');
      const canUse = d.consumable && !d.buff;
      detail = `<div class="inv-detail">
        <img class="ic" src="${itemIconUrl(invPick)}">
        <div class="nm">${d.name || invPick} <span class="cnt">x${n}</span>
          <small>${bits.join(' · ')}</small></div>
        <div class="acts">
          ${canUse ? `<button class="act" data-eat="${invPick}">USE</button>` : ''}
          ${d.buff ? `<button class="act" data-drink="${invPick}">DRINK</button>` : ''}
          <button class="act drop" data-drop1="${invPick}">DROP 1</button>
          ${n > 1 ? `<button class="act drop" data-dropall="${invPick}">DROP ALL</button>` : ''}
        </div>
      </div>`;
    } else {
      detail = '<div class="inv-hint">Click any item to see what it does — and to use or drop it.</div>';
    }
    // cooked food you can eat straight from the bag
    let foods = '';
    for (const [id, n] of mats) {
      const d = ITEMS[id];
      if (!d?.consumable || id === 'tonic') continue;
      foods += `<div class="rec-row"><img class="ic" src="${itemIconUrl(id)}">
        <div class="nm">${d.name} x${n}<small>Restores ${d.heal} HP</small></div>
        <button class="act" data-eat="${id}">EAT</button></div>`;
    }
    if (foods) foods = '<h4 class="sect">FOOD</h4>' + foods;
    // hour-long boosters get their own section: they are not food, and burying
    // a 2x XP potion in a list of cooked fish is how people never find them
    let boosts = '';
    for (const [id, n] of mats) {
      const d = ITEMS[id];
      if (!d?.buff) continue;
      const live = onBoostActive?.(id);
      boosts += `<div class="rec-row"><img class="ic" src="${itemIconUrl(id)}">
        <div class="nm">${d.name} x${n}<small>2x ${d.buff.toUpperCase()} for ${d.mins} min${live ? ` · ACTIVE ${live}` : ''}</small></div>
        <button class="act" data-drink="${id}">DRINK</button></div>`;
    }
    if (boosts) boosts = '<h4 class="sect">BOOSTERS</h4>' + boosts;
    let weps = '';
    for (const id of inventory.state.weapons) {
      const d = ITEMS[id];
      const eq = inventory.state.equipped === id;
      const plus = forge.plusOf(id);
      weps += `<div class="wep-row"><img class="ic" src="${itemIconUrl(id)}">
        <div class="nm">${d.name} ${plus ? `<span class="plus">+${plus}</span>` : ''}<small>DMG ${d.dmg} · SPD ${d.speed}${d.hits ? ` ×${d.hits}` : ''}</small></div>
        <button class="eq" data-eq="${id}" ${eq ? 'disabled' : ''}>${eq ? 'EQUIPPED' : 'EQUIP'}</button></div>`;
    }
    const coinBar = `<div class="coinbar"><img src="${itemIconUrl('coin')}"> ${inventory.state.coins} coins</div>`;
    panels.inv.innerHTML = `<h3>BAG <small>[Tab] close</small></h3>${coinBar}
      <div class="inv-grid">${grid}</div>${detail}${boosts}${foods}${weps}`;

    panels.inv.querySelectorAll('[data-pick]').forEach((c) => {
      c.addEventListener('click', () => {
        invPick = invPick === c.dataset.pick ? null : c.dataset.pick;
        audio.sfx('ui');
        renderInventory();
      });
    });
    // DROPPING IS DELIBERATE BUT NOT PRECIOUS. A single item goes without
    // ceremony; emptying a whole stack asks once, because "DROP ALL" next to
    // "DROP 1" is exactly the pair of buttons somebody mis-taps on a phone.
    panels.inv.querySelectorAll('[data-drop1]').forEach((b) => {
      b.addEventListener('click', () => {
        inventory.remove(b.dataset.drop1, 1);
        audio.sfx('ui');
        renderInventory();
      });
    });
    panels.inv.querySelectorAll('[data-dropall]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.dropall;
        if (b.dataset.armed !== '1') {
          b.dataset.armed = '1';
          b.textContent = `DROP ALL ${inventory.count(id)}?`;
          b.classList.add('armed');
          setTimeout(() => {
            if (!b.isConnected) return;
            b.dataset.armed = '0';
            b.textContent = 'DROP ALL';
            b.classList.remove('armed');
          }, 3500);
          return;
        }
        inventory.remove(id, inventory.count(id));
        invPick = null;
        audio.sfx('deny');
        renderInventory();
      });
    });
    panels.inv.querySelectorAll('[data-eq]').forEach((b) => {
      b.addEventListener('click', () => {
        inventory.equip(b.dataset.eq);
        audio.sfx('ui');
        renderInventory();
      });
    });
    panels.inv.querySelectorAll('[data-drink]').forEach((b) => {
      b.addEventListener('click', () => { onDrink?.(b.dataset.drink); renderInventory(); });
    });
    panels.inv.querySelectorAll('[data-eat]').forEach((b) => {
      b.addEventListener('click', () => {
        economy?.eat(b.dataset.eat);
        renderInventory();
      });
    });
  }

  function renderCrafting() {
    // Resolved EVERY time the panel is drawn. `weaponType` may be a live getter
    // supplied by main.js; awakening changes it, and a value captured once
    // would keep offering the class you no longer are.
    const recipes = recipesFor(typeof weaponType === 'function' ? weaponType() : weaponType);
    let rows = '';
    recipes.forEach((r) => {
      const d = ITEMS[r.out];
      const owned = d.weapon && inventory.state.weapons.has(r.out);
      let cost = '';
      for (const [id, n] of Object.entries(r.cost)) {
        const have = inventory.count(id);
        cost += `<span class="${have >= n ? 'ok' : 'lack'}" title="${ITEMS[id].name}"><img src="${itemIconUrl(id)}">${have}/${n}</span>`;
      }
      const stats = d.weapon ? `DMG ${d.dmg} · SPD ${d.speed}${d.hits ? ` ×${d.hits}` : ''} — ` : '';
      rows += `<div class="rec-row"><img class="ic" src="${itemIconUrl(r.out)}">
        <div class="nm">${d.name}<small>${stats}${r.desc}</small></div>
        <div class="cost">${cost}</div>
        <button class="act" data-craft="${r.out}" ${(!canCraft(r, inventory) || owned) ? 'disabled' : ''}>${owned ? 'OWNED' : 'CRAFT'}</button>
      </div>`;
    });
    panels.cra.innerHTML = `<h3>CRAFTING <small>[C] close</small></h3>${rows}`;
    panels.cra.querySelectorAll('[data-craft]').forEach((b) => {
      b.addEventListener('click', () => {
        if (craftShow.busy) return;
        const r = recipes.find((x) => x.out === b.dataset.craft);
        if (!r || !canCraft(r, inventory)) { audio.sfx('deny'); return; }
        // THE MATERIALS GO FIRST. `craft()` takes them out of the bag now, and
        // the weapon only lands when the last hammer blow does — so the scene is
        // the transaction rather than a replay of one that already happened.
        if (!craft(r, inventory, { withhold: true })) { audio.sfx('deny'); return; }
        onWorkStart?.('forge');
        craftShow.run({
          kind: 'forge',
          out: r.out,
          cost: r.cost,
          note: ITEMS[r.out]?.weapon ? 'equip it from the bag' : 'added to your bag',
          onDone: () => {
            inventory.add(r.out, 1);
            onWorkEnd?.('forge', r.out);
            onCraft(r);
            renderCrafting();
          },
        });
      });
    });
  }

  function renderForge() {
    const id = inventory.state.equipped;
    const d = ITEMS[id];
    const plus = forge.plusOf(id);
    const maxed = plus >= MAX_PLUS;
    const cost = maxed ? {} : forgeCost(plus);
    const chance = forgeChance(plus);
    const fmt = (v) => (Math.round(v * 10) / 10).toString();
    const dmgNow = fmt(d.dmg * (1 + plus * 0.08));
    const dmgNext = fmt(d.dmg * (1 + (plus + 1) * 0.08));

    let costHtml = '';
    for (const [cid, n] of Object.entries(cost)) {
      if (n <= 0) continue;
      const have = inventory.count(cid);
      costHtml += `<span class="${have >= n ? 'ok' : 'lack'}" style="color:${have >= n ? '#b8e89a' : '#e87a6a'}">
        <img src="${itemIconUrl(cid)}">${ITEMS[cid].name} ${have}/${n}</span>`;
    }

    panels.forge.innerHTML = `
      <h3>FORGE <small>[V] close</small></h3>
      <div class="forge-target">
        <img src="${itemIconUrl(id)}">
        <div class="nm">${d.name} ${plus ? `<span class="plus">+${plus}</span>` : ''}
          <small>${maxed ? 'MAXED OUT (+9)' : `DMG ${dmgNow} → <b style="color:#ffd23e">${dmgNext}</b> on success`}</small>
        </div>
      </div>
      ${maxed ? '' : `
      <div class="forge-info">
        Success chance: <span class="${chance > 0.7 ? 'chance-hi' : 'chance-lo'}">${Math.round(chance * 100)}%</span><br>
        On failure the materials burn, but your weapon is safe. Every monster drops Forge Stones (the Golem showers them).
      </div>
      <div class="forge-cost">${costHtml}</div>
      <button class="act" data-forge ${forge.canForge(id).ok ? '' : 'disabled'}>🔨 FORGE +${plus + 1}</button>
      `}
    `;
    panels.forge.querySelector('[data-forge]')?.addEventListener('click', () => {
      const res = forge.forge(id);
      if (!res) return;
      audio.sfx('forge_hit');
      panels.forge.classList.remove('forge-anim');
      void panels.forge.offsetWidth; // restart the shake animation
      panels.forge.classList.add('forge-anim');
      setTimeout(() => {
        audio.sfx(res.success ? 'forge_ok' : 'forge_fail');
        onForged(res, ITEMS[id]);
        renderForge();
      }, 320);
    });
  }

  function renderPets() {
    const activeId = pets.state.active;
    const mounts = mountsRef?.();
    const activeMount = mounts?.state.active;
    let rows = '<h4 class="sect">PETS — passive perks, found in chests / bosses / quests</h4>';
    for (const [id, def] of Object.entries(PET_DEFS)) {
      const owned = inventory.count(def.charm) > 0;
      const active = activeId === id;
      rows += `<div class="pet-row ${owned ? '' : 'locked'}">
        <div class="dot" style="background:${owned ? def.color : '#141a12'}">${owned ? '' : '?'}</div>
        <div class="nm">${owned ? def.name : '???'}
          <small>${owned ? def.desc : 'Found in treasure chests, world boss drops, and quests.'}</small>
          ${owned ? `<small class="perk">★ ${def.perk.label}</small>` : ''}
        </div>
        ${owned ? `<button class="eq" data-pet="${id}" ${active ? 'disabled' : ''}>${active ? 'ACTIVE' : 'SUMMON'}</button>` : ''}
      </div>`;
    }
    if (activeId) {
      rows += `<button class="eq" data-dismiss style="margin-bottom:4px">DISMISS ${PET_DEFS[activeId].name.toUpperCase()}</button>`;
    }
    rows += '<h4 class="sect">MOUNTS — earned from villager quests, ride with [M]</h4>';
    for (const [id, def] of Object.entries(MOUNT_DEFS)) {
      const owned = inventory.count(def.item) > 0;
      const active = activeMount === id;
      rows += `<div class="pet-row ${owned ? '' : 'locked'}">
        <div class="dot" style="background:${owned ? def.color : '#141a12'}">${owned ? '' : '?'}</div>
        <div class="nm">${owned ? def.name : '???'}
          <small>${owned ? def.desc : 'A villager quest rewards this mount.'}</small>
          ${owned ? `<small class="perk">★ x${def.speedMult} speed${def.jumpMult > 1.2 ? ' · high jump' : ''}${def.armor ? ' · tougher' : ''}</small>` : ''}
        </div>
        ${owned ? `<button class="eq" data-mount="${id}" ${active ? 'disabled' : ''}>${active ? 'RIDING' : 'RIDE'}</button>` : ''}
      </div>`;
    }
    if (activeMount) {
      rows += `<button class="eq" data-dismount>DISMOUNT ${MOUNT_DEFS[activeMount].name.toUpperCase()}</button>`;
    }
    panels.pets.innerHTML = `<h3>COMPANIONS <small>[P] close</small></h3>${rows}`;
    panels.pets.querySelectorAll('[data-pet]').forEach((b) => {
      b.addEventListener('click', () => {
        audio.sfx('pet_summon');
        onSummonPet(b.dataset.pet);
        renderPets();
      });
    });
    panels.pets.querySelector('[data-dismiss]')?.addEventListener('click', () => {
      audio.sfx('ui');
      onSummonPet(null);
      renderPets();
    });
    panels.pets.querySelectorAll('[data-mount]').forEach((b) => {
      b.addEventListener('click', () => {
        onSummonMount?.(b.dataset.mount);
        renderPets();
      });
    });
    panels.pets.querySelector('[data-dismount]')?.addEventListener('click', () => {
      audio.sfx('ui');
      onSummonMount?.(null);
      renderPets();
    });
  }

  function renderShop() {
    if (!economy) return;
    const coins = inventory.state.coins;
    let html = `<div class="coinbar"><img src="${itemIconUrl('coin')}"> ${coins} coins</div>`;

    html += '<h4 class="sect">BUY</h4>';
    for (const g of economy.goods()) {
      const afford = coins >= g.price && !g.soldout;
      html += `<div class="rec-row"><img class="ic" src="${itemIconUrl(g.icon || g.id)}">
        <div class="nm">${g.name}<small>${g.desc}</small></div>
        <div class="cost"><span class="${afford ? 'ok' : 'lack'}">${g.soldout ? 'SOLD OUT' : g.price + 'c'}</span></div>
        <button class="act" data-buy="${g.id}" ${afford ? '' : 'disabled'}>BUY</button></div>`;
    }

    html += '<h4 class="sect">SELL — fish, crops & materials</h4>';
    const sellables = [...inventory.state.materials.entries()]
      .filter(([id]) => ITEMS[id]?.sell)
      .sort((a, b) => (ITEMS[b[0]].sell) - (ITEMS[a[0]].sell));
    if (!sellables.length) html += '<div style="font-size:10px;color:var(--muted)">Nothing to sell yet — go fish, farm or hunt!</div>';
    for (const [id, n] of sellables) {
      const d = ITEMS[id];
      html += `<div class="rec-row"><img class="ic" src="${itemIconUrl(id)}">
        <div class="nm">${d.name} x${n}<small>${d.sell}c each</small></div>
        <button class="eq" data-sell="${id}">SELL 1</button>
        <button class="act" data-sellall="${id}">ALL (+${d.sell * n}c)</button></div>`;
    }

    panels.shop.innerHTML = `<h3>PIP'S SHOP <small>[Esc] close</small></h3>${html}`;
    panels.shop.querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => { economy.buy(b.dataset.buy); renderShop(); });
    });
    panels.shop.querySelectorAll('[data-sell]').forEach((b) => {
      b.addEventListener('click', () => { economy.sell(b.dataset.sell, 1); renderShop(); });
    });
    panels.shop.querySelectorAll('[data-sellall]').forEach((b) => {
      b.addEventListener('click', () => { economy.sell(b.dataset.sellall, Infinity); renderShop(); });
    });
  }

  function renderCook() {
    if (!cooking) return;
    let html = '<div style="font-size:10px;color:var(--muted);margin-bottom:10px;letter-spacing:1px">The fire crackles... time to grill the catch of the day.</div>';
    for (const r of cooking.recipes()) {
      const d = ITEMS[r.out];
      let cost = '';
      let ok = true;
      for (const [id, n] of Object.entries(r.cost)) {
        const have = inventory.count(id);
        if (have < n) ok = false;
        cost += `<span class="${have >= n ? 'ok' : 'lack'}" title="${ITEMS[id].name}"><img src="${itemIconUrl(id)}">${have}/${n}</span>`;
      }
      html += `<div class="rec-row"><img class="ic" src="${itemIconUrl(r.out)}">
        <div class="nm">${d.name}<small>Restores ${d.heal} HP · sells for ${d.sell}c</small></div>
        <div class="cost">${cost}</div>
        <button class="act" data-cook="${r.out}" ${ok ? '' : 'disabled'}>COOK</button></div>`;
    }
    panels.cook.innerHTML = `<h3>CAMPFIRE COOKING <small>[Esc] close</small></h3>${html}`;
    panels.cook.querySelectorAll('[data-cook]').forEach((b) => {
      b.addEventListener('click', () => {
        if (craftShow.busy) return;
        const out = b.dataset.cook;
        // `begin` spends the ingredients and works out how many portions the
        // pot made; nothing is added to the bag until the lid comes off.
        const started = cooking.begin(out);
        if (!started) { audio.sfx('deny'); return; }
        onWorkStart?.('cook');
        craftShow.run({
          kind: 'cook',
          out,
          cost: started.cost,
          portions: started.portions,
          note: `restores ${ITEMS[out].heal} HP`,
          onDone: () => {
            started.finish();
            onWorkEnd?.('cook', out);
            renderCook();
          },
        });
      });
    });
  }

  /**
   * THE HOMESTEAD PANEL.
   *
   * One plot and one ladder, so the panel is a ladder too: the tier you are on,
   * the tier you are working toward with its exact shopping list, and the tier
   * after that greyed out so you can see where the money is going. There is no
   * land to buy and no design to choose — the only question is whether you have
   * the materials yet.
   */
  function renderEstate() {
    if (!estate) return;
    const coins = inventory.state.coins;
    const tiers = estate.tiers;
    const tier = estate.tier();
    const next = estate.next();
    const onSite = estate.onSite();
    const isle = estate.isleName();

    const ladder = tiers.map((d) => {
      const state = d.tier <= tier ? 'done' : d.tier === tier + 1 ? 'now' : '';
      return `<span class="${state}">${d.tier} · ${d.name}</span>`;
    }).join('');

    let html = `<div class="steps">${ladder}</div>
      <div class="coinbar"><img src="${itemIconUrl('coin')}"> ${coins} coins</div>`;

    if (tier > 0) {
      const cur = tiers[tier - 1];
      html += `<div class="rec-row"><div class="dot" style="background:${cur.roof}"></div>
        <div class="nm">${cur.name} <small>Standing on ${isle}. It heals you nearby and monsters keep their distance.</small></div></div>`;
    }

    if (!next) {
      html += `<div style="font-size:11px;color:var(--text);margin-top:8px">
        The beacon is lit. There is nothing left to build here — which, for a Lanternkeeper, is the whole job done.</div>`;
    } else {
      const missing = estate.missing();
      let cost = '';
      for (const [mid, n] of Object.entries(next.cost)) {
        const have = inventory.count(mid);
        cost += `<span class="${have >= n ? 'ok' : 'lack'}"><img src="${itemIconUrl(mid)}">${have}/${n}</span>`;
      }
      if (next.coins) cost += `<span class="${coins >= next.coins ? 'ok' : 'lack'}">${next.coins}c</span>`;
      const ready = missing.length === 0;
      const label = tier === 0 ? 'BUILD' : 'UPGRADE';
      html += `<h4 class="sect">${tier === 0 ? 'RAISE YOUR HOUSE' : 'NEXT UPGRADE'}</h4>
        <div class="rec-row"><div class="dot" style="background:${next.roof}"></div>
          <div class="nm">${next.name}<small>${next.desc}</small></div>
          <div class="cost">${cost}</div>
          <button class="act" data-build ${ready && onSite ? '' : 'disabled'}>${label}</button></div>`;
      if (!onSite) {
        html += `<div style="font-size:10px;color:var(--gold);margin-top:6px">
          You have to be standing on the plot. ${isle} is the island marked <span style="color:#a8e06a">⌂</span> on the world map
          (${isTouch ? 'tap the minimap' : 'press N'}) — sail there with a boat, or swim.</div>`;
      } else if (!ready) {
        html += `<div style="font-size:10px;color:var(--muted);margin-top:6px">
          Still short. Chop <span class="tip">birch trees</span> for Hardwood and mine <span class="tip">ore boulders</span>
          for Iron Ore (${isTouch ? 'the ★ button' : '<b>F</b>'}, 3 hits each); sell fish and crops at Pip's for coins.</div>`;
      }
      if (tiers[tier + 1]) {
        const later = tiers[tier + 1];
        html += `<h4 class="sect">AFTER THAT</h4>
          <div class="rec-row" style="opacity:0.5"><div class="dot" style="background:${later.roof}"></div>
            <div class="nm">${later.name}<small>${later.desc}</small></div></div>`;
      }
    }

    panels.estate.innerHTML = `<h3>YOUR HOMESTEAD <small>[Esc] close</small></h3>${html}`;
    panels.estate.querySelector('[data-build]')?.addEventListener('click', () => {
      estate.build(); renderEstate();
    });
  }

  // --- Wonder Capsules v2: six-tier reveal show with a real capsule machine ---
  let gachaHistory = [];
  let gachaBusy = false; // don't let inventory refreshes stomp the animation
  let gachaView = 'machine'; // machine | prizes (the full pull catalogue)
  function renderGacha(phase = 'idle', result = null) {
    if (!gacha) return;
    if (gachaBusy && phase === 'idle') return;
    const coins = inventory.state.coins;
    const afford = coins >= gacha.price;
    const rc = (r) => RARITY[r].color;

    // PRIZES view: browse everything the machine can drop, grouped by rarity
    if (gachaView === 'prizes' && phase === 'idle' && gacha.prizeList) {
      const list = gacha.prizeList();
      let rows = '';
      for (const rarity of [...RARITY_ORDER].reverse()) {
        const R = RARITY[rarity];
        const w = gacha.odds.find(([r]) => r === rarity)?.[1] ?? 0;
        rows += `<div class="gp-tier" style="--rc:${R.color}">
          <span class="gp-tn">${'◆'.repeat(RARITY_ORDER.indexOf(rarity) + 1)} ${R.name.toUpperCase()}</span>
          <span class="gp-odds">${w}% · dupes refund ${R.refund}c</span>
        </div>`;
        for (const p of list[rarity]) {
          rows += `<div class="gp-row" style="--rc:${R.color}">
            <div class="gp-ic"><img src="${itemIconUrl(p.iconId)}"></div>
            <div class="gp-nm">${p.name}${p.note ? `<small>${p.note}</small>` : ''}</div>
            <span class="gp-kind">${p.kind}</span>
            ${p.owned ? '<span class="gp-own">✓ OWNED</span>' : ''}
          </div>`;
        }
      }
      panels.gacha.innerHTML = `<h3>WONDER CAPSULES <small>[Esc] close</small></h3>
        <style>
          .gp-tier { display: flex; justify-content: space-between; align-items: baseline; margin: 12px 0 6px;
            padding: 6px 10px; background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 18%, transparent), transparent);
            box-shadow: inset 2px 0 0 var(--rc); }
          .gp-tn { font-size: 11px; letter-spacing: 2px; color: var(--rc); text-shadow: 0 0 8px var(--rc); }
          .gp-odds { font-size: 8px; color: var(--muted); letter-spacing: 1px; }
          .gp-row { display: flex; align-items: center; gap: 9px; padding: 5px 8px; margin-bottom: 4px;
            background: #141a12; box-shadow: inset 0 0 0 2px #232c22; }
          .gp-ic { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.4); box-shadow: inset 0 0 0 1px var(--rc); flex-shrink: 0; }
          .gp-ic img { width: 24px; height: 24px; image-rendering: pixelated; }
          .gp-nm { flex: 1; font-size: 11px; color: #e5ead8; }
          .gp-nm small { display: block; font-size: 8px; color: var(--muted); margin-top: 2px; }
          .gp-kind { font-size: 7px; letter-spacing: 1px; color: var(--muted); padding: 2px 6px;
            box-shadow: inset 0 0 0 1px #39443a; }
          .gp-own { font-size: 8px; color: #8ac86a; letter-spacing: 1px; }
          .gp-back { width: 100%; margin-top: 12px; }
        </style>
        <div style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-bottom:2px">
          EVERYTHING THE MACHINE CAN DROP — weapons match your class</div>
        ${rows}
        <button class="act gp-back" data-gback>◈ BACK TO THE MACHINE</button>`;
      panels.gacha.querySelector('[data-gback]').addEventListener('click', () => {
        gachaView = 'machine'; audio.sfx('ui'); renderGacha();
      });
      return;
    }

    // The machine sprite plus its moving parts. Capsule slots are given in the
    // sprite's own 48x64 pixel grid and scaled x3, so they sit inside the
    // painted dome instead of being nudged into place by eye.
    const CAP_SLOTS = [[9, 15], [19, 12], [29, 15], [14, 8], [24, 7], [34, 11]];
    const machineHtml = (spinning) => {
      const caps = CAP_SLOTS.map(([cx, cy], i) => {
        const [a, b] = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
        return `<img class="g-cap" src="${capsuleUrl(a, b)}" style="left:${cx * 3}px;top:${cy * 3}px;`
          + `animation-delay:${(i * 0.17).toFixed(2)}s">`;
      }).join('');
      return `<div class="g-machine${spinning ? ' spin' : ''}">
        <img class="g-mach-body" src="${machineUrl()}">
        ${caps}
        <img class="g-crankarm" src="${crankUrl()}">
        <div class="g-glowpool"></div>
      </div>`;
    };

    let stage;
    if (phase === 'spin') {
      stage = `${machineHtml(true)}
        <div class="g-hint">The capsule tumbles...</div>`;
    } else if (phase === 'drop' && result) {
      // the won capsule falls out, bounces, and cracks open in rarity light
      const R = RARITY[result.rarity];
      stage = `<div class="g-dropzone" style="--rc:${R.color}">
          <div class="g-fallcap">
            <img class="g-half t" src="${capsuleHalfUrl(R.color, true)}">
            <img class="g-half b" src="${capsuleHalfUrl('#f2f2ea', false)}">
          </div>
          <div class="g-crackglow"></div>
        </div>
        <div class="g-hint" style="color:${R.color}">It's opening...</div>`;
    } else if (phase === 'reveal' && result) {
      const R = RARITY[result.rarity];
      const high = result.rarity === 'legendary' || result.rarity === 'mythic';
      const confetti = high ? Array.from({ length: 14 }, (_, i) =>
        `<i class="g-conf" style="left:${6 + Math.random() * 88}%;background:${['#ffd23e', R.color, '#f0f0e8'][i % 3]};animation-delay:${Math.random() * 0.5}s;animation-duration:${0.9 + Math.random() * 0.8}s"></i>`).join('') : '';
      stage = `<div class="g-flash" style="--rc:${R.color}"></div>${confetti}
        <div class="g-card flip ${high ? 'high' : ''} r-${result.rarity}" style="--rc:${R.color}">
          <div class="g-rarity">${'◆'.repeat(RARITY_ORDER.indexOf(result.rarity) + 1)} ${R.name.toUpperCase()}</div>
          <div class="g-icoframe"><img src="${itemIconUrl(result.iconId)}"></div>
          <div class="g-name">${result.name}</div>
          ${result.note ? `<div class="g-note">${result.note}</div>` : ''}
        </div>`;
    } else if (phase === 'multi' && result) {
      // 10-pull results: a staggered grid of mini cards, best rarity crowned
      const bestIdx = Math.max(...result.map((p) => RARITY_ORDER.indexOf(p.rarity)));
      const confetti = bestIdx >= 3 ? Array.from({ length: 16 }, (_, i) =>
        `<i class="g-conf" style="left:${4 + Math.random() * 92}%;background:${['#ffd23e', RARITY[RARITY_ORDER[bestIdx]].color, '#f0f0e8'][i % 3]};animation-delay:${Math.random() * 0.6}s;animation-duration:${0.9 + Math.random() * 0.8}s"></i>`).join('') : '';
      stage = `${confetti}<div class="g-grid">
        ${result.map((p, i) => {
          const R = RARITY[p.rarity];
          const best = RARITY_ORDER.indexOf(p.rarity) === bestIdx && bestIdx >= 2;
          return `<div class="g-mini ${best ? 'best' : ''}" style="--rc:${R.color};animation-delay:${i * 0.09}s">
            <img src="${itemIconUrl(p.iconId)}">
            <span class="g-mini-n">${p.name}</span>
          </div>`;
        }).join('')}
      </div>`;
    } else {
      stage = `${machineHtml(false)}
        <div class="g-hint">Cosmetics · exclusive pets · exclusive mounts... maybe a MYTHIC.</div>`;
    }

    const oddsLine = gacha.odds.map(([r, w]) =>
      `<span style="color:${rc(r)}">${RARITY[r].name} ${w}%</span>`).join(' · ');
    const hist = gachaHistory.slice(-8).reverse().map((h) =>
      `<span style="color:${rc(h.rarity)}">◆ ${h.name}</span>`).join('<br>');
    const pityPct = Math.min(100, (gacha.pity / 9) * 100);

    panels.gacha.innerHTML = `<h3>WONDER CAPSULES <small>[Esc] close</small></h3>
      <style>
        .g-stage { text-align: center; padding: 10px 0 4px; min-height: 190px; position: relative; }
        /* THE CAPSULE MACHINE — a painted pixel sprite, upscaled, not a stack of
           rounded divs with a glyph in the middle. Everything else in this game
           is procedural pixel art and the old one did not belong next to it. */
        .g-machine { display: inline-block; position: relative;
          width: 144px; height: 192px; image-rendering: pixelated; }
        .g-machine img { image-rendering: pixelated; position: absolute; }
        .g-mach-body { left: 0; top: 0; width: 144px; height: 192px; }
        /* capsules live INSIDE the painted dome, so they are positioned in the
           sprite's own pixel grid (x3) rather than by eye */
        .g-cap { width: 30px; height: 30px; }
        /* centred on the painted crank boss: sprite x26..38, y39..51 -> centre
           (32,45) in the 48x64 grid, so 96,135 at x3 */
        .g-crankarm { left: 72px; top: 111px; width: 48px; height: 48px;
          transform-origin: 50% 50%; }
        .g-glowpool { position: absolute; left: 18px; top: 12px; width: 108px; height: 66px;
          background: radial-gradient(ellipse at 50% 60%, rgba(255,240,190,0.30), transparent 70%);
          pointer-events: none; }
        .g-cap { animation: g-idle 2.6s ease-in-out infinite; }
        @keyframes g-idle { 50% { transform: translateY(-3px); } }
        .g-machine.spin { animation: g-rattle 0.13s linear infinite; }
        .g-machine.spin .g-cap { animation: g-jump 0.24s ease-in-out infinite; }
        .g-machine.spin .g-crankarm { animation: g-spin 0.42s linear infinite; }
        .g-machine.spin .g-glowpool { animation: g-pulse 0.5s ease-in-out infinite; }
        @keyframes g-rattle { 25% { transform: translate(-2px, 0) rotate(-1.2deg); } 75% { transform: translate(2px, 0) rotate(1.2deg); } }
        @keyframes g-jump { 50% { transform: translateY(-15px) rotate(140deg); } }
        @keyframes g-spin { to { transform: rotate(360deg); } }
        @keyframes g-pulse { 50% { opacity: 0.45; } }
        .g-half { position: absolute; left: 0; width: 44px; height: 26px; image-rendering: pixelated; }
        .g-half.t { top: 0; animation: g-crack-top 0.3s ease-in 0.66s forwards; }
        .g-half.b { top: 24px; animation: g-crack-bot 0.3s ease-in 0.66s forwards; }
        .g-hint { font-size: 10px; color: var(--muted); margin-top: 10px; letter-spacing: 1px; }
        /* capsule drop + crack-open phase */
        .g-dropzone { position: relative; height: 130px; }
        .g-fallcap { position: absolute; left: 50%; top: 0; width: 44px; height: 44px; margin-left: -22px;
          animation: g-fall 0.62s cubic-bezier(0.3, 0, 0.6, 1.4) forwards; }
        @keyframes g-fall {
          0% { transform: translateY(-8px); }
          55% { transform: translateY(72px); }
          75% { transform: translateY(52px) rotate(8deg); }
          100% { transform: translateY(70px) rotate(-4deg); }
        }
        @keyframes g-crack-top { to { transform: translate(-14px, -26px) rotate(-38deg); opacity: 0.15; } }
        @keyframes g-crack-bot { to { transform: translate(14px, 12px) rotate(30deg); opacity: 0.15; } }
        .g-crackglow { position: absolute; left: 50%; top: 74px; width: 10px; height: 10px; margin-left: -5px;
          border-radius: 50%; background: var(--rc); opacity: 0;
          box-shadow: 0 0 30px 16px var(--rc);
          animation: g-glowup 0.34s ease-out 0.66s forwards; }
        @keyframes g-glowup { to { opacity: 0.95; transform: scale(2.4); } }
        /* rarity flash + reveal card */
        .g-flash { position: absolute; inset: -15px; pointer-events: none;
          background: radial-gradient(circle at 50% 45%, var(--rc) 0%, transparent 55%);
          opacity: 0; animation: g-flashin 0.55s ease-out; }
        @keyframes g-flashin { 12% { opacity: 0.55; } 100% { opacity: 0; } }
        .g-card { display: inline-block; position: relative; padding: 14px 30px; border: 2px solid var(--rc);
          background: linear-gradient(180deg, rgba(10,14,9,0.9), rgba(6,9,6,0.95));
          box-shadow: 0 0 18px var(--rc), inset 0 0 0 1px rgba(0,0,0,0.7), inset 0 0 24px rgba(0,0,0,0.5);
          animation: g-pop 0.34s cubic-bezier(0.2, 1.8, 0.4, 1); }
        .g-card.flip { animation: g-flip 0.5s cubic-bezier(0.3, 1.4, 0.5, 1); }
        @keyframes g-flip {
          0% { transform: perspective(500px) rotateY(95deg) scale(0.7); opacity: 0; }
          60% { transform: perspective(500px) rotateY(-12deg) scale(1.06); opacity: 1; }
          100% { transform: perspective(500px) rotateY(0deg) scale(1); }
        }
        .g-conf { position: absolute; top: -6px; width: 6px; height: 6px; pointer-events: none;
          animation: g-confall linear forwards; }
        @keyframes g-confall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(190px) rotate(540deg); opacity: 0; }
        }
        .g-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; padding: 4px 2px; }
        .g-mini { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 3px 6px;
          background: rgba(8,12,8,0.9); box-shadow: inset 0 0 0 2px var(--rc), 0 0 8px color-mix(in srgb, var(--rc) 45%, transparent);
          animation: g-mini-in 0.4s cubic-bezier(0.2, 1.9, 0.4, 1) backwards; }
        .g-mini img { width: 26px; height: 26px; image-rendering: pixelated; }
        .g-mini-n { font-size: 7px; color: #e5ead8; text-align: center; line-height: 1.3;
          max-width: 100%; overflow: hidden; }
        .g-mini.best { box-shadow: inset 0 0 0 2px var(--rc), 0 0 16px var(--rc); }
        .g-mini.best::after { content: '★'; position: absolute; margin-top: -14px; margin-left: 40px;
          color: var(--rc); font-size: 11px; text-shadow: 0 0 6px var(--rc); }
        @keyframes g-mini-in { from { transform: scale(0.3) rotate(-6deg); opacity: 0; } }
        .g-card.high { animation: g-pop 0.44s cubic-bezier(0.2, 2.2, 0.4, 1); box-shadow: 0 0 34px var(--rc), inset 0 0 0 1px rgba(0,0,0,0.7); }
        .g-card.high::before, .g-card.high::after { content: '✦'; position: absolute; color: var(--rc); font-size: 13px;
          animation: g-tw 1.2s ease-in-out infinite; }
        .g-card.high::before { top: 4px; left: 8px; } .g-card.high::after { bottom: 4px; right: 8px; animation-delay: 0.6s; }
        .g-card.r-mythic { background: linear-gradient(160deg, rgba(40,10,30,0.92), rgba(6,9,6,0.95)); }
        @keyframes g-tw { 50% { opacity: 0.2; transform: scale(0.7); } }
        @keyframes g-pop { from { transform: scale(0.4); opacity: 0; } }
        .g-rarity { font-size: 9px; letter-spacing: 4px; color: var(--rc); margin-bottom: 9px; text-shadow: 0 0 8px var(--rc); }
        .g-icoframe { width: 58px; height: 58px; margin: 0 auto; display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--rc); background: rgba(0,0,0,0.4); }
        .g-icoframe img { width: 44px; height: 44px; image-rendering: pixelated; }
        .g-name { font-size: 13px; color: var(--text); margin-top: 8px; }
        .g-note { font-size: 9px; color: var(--gold); margin-top: 5px; }
        .g-hist { font-size: 9px; line-height: 1.9; margin-top: 10px; border-top: 1px solid var(--line-soft); padding-top: 8px; }
        .g-rollbtn { width: 100%; margin-top: 10px; font-size: 13px !important; padding: 12px !important; letter-spacing: 3px !important; }
        .g-odds { font-size: 8px; text-align: center; margin-top: 8px; letter-spacing: 1px; line-height: 1.9; color: var(--muted); }
        .g-pity { height: 5px; background: #141a12; border: 1px solid #0a0f0a; margin-top: 8px; }
        .g-pity > div { height: 100%; background: linear-gradient(90deg, #b06ae8, #f0c455); }
        .g-pitylbl { font-size: 8px; color: var(--muted); margin-top: 3px; letter-spacing: 1px; text-align: center; }
      </style>
      <div class="coinbar"><img src="${itemIconUrl('coin')}"> ${coins} coins</div>
      <div class="g-stage">${stage}</div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="act g-rollbtn" data-roll ${(!afford || phase === 'spin' || phase === 'drop') ? 'disabled' : ''}
          style="flex:1;margin-top:0">◈ SPIN — ${gacha.price}c</button>
        <button class="act g-rollbtn" data-roll10 ${(coins < gacha.price10 || phase === 'spin' || phase === 'drop') ? 'disabled' : ''}
          style="flex:1;margin-top:0">◈◈ 10× — ${gacha.price10}c</button>
      </div>
      <button class="eq g-prizesbtn" data-prizes ${(phase === 'spin' || phase === 'drop') ? 'disabled' : ''}
        style="width:100%;margin-top:6px;letter-spacing:2px">📜 VIEW ALL PRIZES</button>
      <div class="g-pity"><div style="width:${pityPct}%"></div></div>
      <div class="g-pitylbl">LUCK CHARGE ${Math.min(gacha.pity, 9)}/9 — charged spins pull higher tiers · dupes refund coins</div>
      <div class="g-odds">${oddsLine}</div>
      ${hist ? `<div class="g-hist">${hist}</div>` : ''}`;
    panels.gacha.querySelector('[data-prizes]')?.addEventListener('click', () => {
      gachaView = 'prizes'; audio.sfx('ui'); renderGacha();
    });
    panels.gacha.querySelector('[data-roll]')?.addEventListener('click', () => {
      const prize = gacha.roll();
      if (!prize) { audio.sfx('deny'); return; }
      gachaBusy = true;
      // show: crank rattle -> capsule drops & cracks open -> rarity reveal
      audio.sfx('gacha_crank');
      audio.sfx('gacha_riser');
      renderGacha('spin');
      setTimeout(() => {
        audio.sfx('gacha_drop');
        renderGacha('drop', prize);
      }, 900);
      setTimeout(() => { audio.sfx('gacha_pop'); }, 1560);
      setTimeout(() => {
        gachaHistory.push(prize);
        if (gachaHistory.length > 24) gachaHistory.splice(0, gachaHistory.length - 24);
        gachaBusy = false;
        audio.sfx(`reveal_${prize.rarity}`);
        renderGacha('reveal', prize);
      }, 1860);
    });
    panels.gacha.querySelector('[data-roll10]')?.addEventListener('click', () => {
      const prizes = gacha.roll10();
      if (!prizes) { audio.sfx('deny'); return; }
      gachaBusy = true;
      audio.sfx('gacha_crank');
      audio.sfx('gacha_riser');
      renderGacha('spin');
      setTimeout(() => { audio.sfx('gacha_drop'); }, 900);
      setTimeout(() => {
        gachaHistory.push(...prizes);
        if (gachaHistory.length > 24) gachaHistory.splice(0, gachaHistory.length - 24);
        gachaBusy = false;
        const best = prizes.reduce((a, b) =>
          RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a);
        audio.sfx(`reveal_${best.rarity}`);
        renderGacha('multi', prizes);
      }, 1300);
    });
  }

  // --- Wardrobe: full appearance editor (same options as character creation)
  // + cosmetics earned from gacha & level rewards ---
  const WARD_SLOTS = [
    ['hat', 'HATS — worn on your head'],
    ['back', 'BACK — packs & wings'],
    ['trail', 'TRAILS — sparkle in your footsteps'],
  ];
  // COSMETICS FIRST. The wardrobe used to open on APPEARANCE, so a player who
  // had just pulled a hat opened it, saw skin tone and hair style, and concluded
  // their prize could not be worn. Nobody opens this panel to change their hair;
  // they open it because they got something. Reported as "item gacha gabisa
  // dipakai" — the WEAR buttons were there the whole time, one tab across.
  let invPick = null;        // the stack selected in the bag grid
  let wardTab = 'cosmetics'; // cosmetics | style (appearance)
  function renderWardAppearance() {
    const cfg = wardrobe.appearance.config;
    const seg = (label, key, list, keyName) => {
      const items = Array.isArray(list) ? list : Object.entries(list);
      const btns = Array.isArray(list)
        ? list.map((nm, i) => `<button data-wa="${keyName}:${i}" class="${cfg[keyName] === i ? 'sel' : ''}">${nm}</button>`).join('')
        : items.map(([id, nm]) => `<button data-wa="${keyName}:${id}" class="${cfg[keyName] === id ? 'sel' : ''}">${nm}</button>`).join('');
      return `<div class="w-row"><label>${label}</label><div class="w-segs">${btns}</div></div>`;
    };
    const sw = (label, colors, keyName, extraNone = false) => {
      let h = extraNone ? `<div class="w-sw none ${cfg[keyName] === -1 ? 'sel' : ''}" data-wa="${keyName}:-1"></div>` : '';
      h += colors.map((c, i) =>
        `<div class="w-sw ${cfg[keyName] === i ? 'sel' : ''}" data-wa="${keyName}:${i}" style="background:${c}"></div>`).join('');
      return `<div class="w-row"><label>${label}</label><div class="w-sws">${h}</div></div>`;
    };
    return `
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;letter-spacing:1px">
        Restyle your hero anytime — changes apply instantly.</div>
      <div class="w-row"><label>NAME</label>
        <input class="w-name" type="text" maxlength="14" value="${cfg.name || ''}"
          style="width:100%;background:#0e130d;color:#e8e8d8;outline:none;font-family:inherit;
                 font-size:12px;padding:8px 10px;border:0;box-shadow:inset 0 0 0 2px #2c352c">
      </div>
      ${seg('GENDER', null, GENDERS, 'gender')}
      ${sw('SKIN TONE', SKIN_TONES, 'skin')}
      ${seg('HAIR STYLE', null, HAIR_STYLES, 'hairStyle')}
      ${sw('HAIR COLOR', HAIR_COLORS, 'hairColor')}
      ${sw('EYE COLOR', EYE_COLORS, 'eyes')}
      ${seg('FACE', null, ACCESSORIES, 'accessory')}
      ${seg('OUTFIT STYLE', null, OUTFIT_STYLES, 'outfitStyle')}
      ${sw('OUTFIT COLOR', OUTFIT_COLORS, 'outfit')}
      ${sw('CAPE', CAPE_COLORS, 'cape', true)}
    `;
  }
  function renderWardCosmetics() {
    const byRar = (a, b) => RARITY_ORDER.indexOf(ITEMS[a].rarity) - RARITY_ORDER.indexOf(ITEMS[b].rarity);
    let html = `<div style="font-size:10px;color:var(--muted);margin-bottom:10px;letter-spacing:1px">
      Cosmetics come from Wonder Capsules (gacha) & level milestones.</div>`;
    for (const [slot, label] of WARD_SLOTS) {
      const equipped = wardrobe.state[slot];
      html += `<h4 class="sect">${label}</h4>`;
      if (equipped) {
        html += `<button class="eq" data-unequip="${slot}" style="margin-bottom:6px">✕ REMOVE ${ITEMS[equipped].name.toUpperCase()}</button>`;
      }
      const ids = [...wardrobe.bySlot[slot]].sort(byRar);
      for (const id of ids) {
        const d = ITEMS[id];
        const owned = wardrobe.owned(id);
        const active = equipped === id;
        const R = RARITY[d.rarity];
        html += `<div class="pet-row ${owned ? '' : 'locked'}" style="border-color:${owned ? R.color + '55' : '#2c352c'}">
          <div class="dot" style="background:#141a12;border-color:${R.color}">
            ${owned ? `<img src="${itemIconUrl(id)}" style="width:26px;height:26px;image-rendering:pixelated">` : '?'}
          </div>
          <div class="nm">${owned ? d.name : '???'}
            <small style="color:${R.color}">${'◆'.repeat(RARITY_ORDER.indexOf(d.rarity) + 1)} ${R.name}${
              d.limited ? ` · <b style="color:#ffd23e">SEASON: ${d.limited.toUpperCase()}</b>` : ''}</small>
            ${owned ? '' : '<small>Pull it from the Wonder Capsules!</small>'}
          </div>
          ${owned ? `<button class="eq" data-wear="${slot}:${id}" ${active ? 'disabled' : ''}>${active ? 'WORN' : 'WEAR'}</button>` : ''}
        </div>`;
      }
    }
    return html;
  }
  function renderWardrobe() {
    if (!wardrobe) return;
    const body = wardTab === 'style' && wardrobe.appearance
      ? renderWardAppearance() : renderWardCosmetics();
    panels.ward.innerHTML = `<h3>WARDROBE <small>[O] close</small></h3>
      <style>
        .w-preview { display: block; width: 100%; height: 200px; margin-bottom: 10px;
          background: radial-gradient(ellipse at 50% 92%, rgba(200,176,96,0.16), transparent 55%),
          linear-gradient(180deg, rgba(10,14,16,0.4), rgba(8,12,9,0.7));
          box-shadow: inset 0 0 0 2px #2c352c, inset 0 0 40px rgba(0,0,0,0.5); image-rendering: auto; }
        .w-preview-hint { text-align: center; font-size: 8px; color: #6a7a62; letter-spacing: 2px; margin: -6px 0 10px; }
        .w-tabs { display: flex; gap: 5px; margin-bottom: 12px; }
        .w-tabs button { flex: 1; font-family: inherit; font-size: 10px; letter-spacing: 2px; cursor: pointer;
          padding: 8px 4px; color: #8a967f; border: 0; background: #131a12; box-shadow: inset 0 0 0 2px #2c352c; }
        .w-tabs button.on { color: #ffe9b0; background: #2c2a16; box-shadow: inset 0 0 0 2px var(--gold); }
        .w-row { margin-bottom: 11px; }
        .w-row label { display: block; font-size: 9px; color: #b9a76a; letter-spacing: 2px; margin-bottom: 5px; }
        .w-row label::before { content: '▸ '; color: #6a5a34; }
        .w-segs { display: flex; gap: 4px; flex-wrap: wrap; }
        .w-segs button { flex: 1; min-width: 56px; font-family: inherit; font-size: 10px; padding: 7px 4px;
          cursor: pointer; color: #aab5a0; border: 0; background: #131a12; box-shadow: inset 0 0 0 2px #2c352c; }
        .w-segs button.sel { color: #ffe9b0; background: #2c2a16; box-shadow: inset 0 0 0 2px var(--gold); }
        .w-sws { display: flex; gap: 6px; flex-wrap: wrap; }
        .w-sw { width: 28px; height: 24px; cursor: pointer; position: relative;
          box-shadow: inset 0 0 0 2px rgba(0,0,0,0.45), 0 0 0 2px #2c352c; }
        .w-sw.sel { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.3), 0 0 0 2px #f0e5c0, 0 0 8px var(--gold-glow); }
        .w-sw.none { background: repeating-linear-gradient(45deg, #131a12, #131a12 4px, #202a20 4px, #202a20 8px); }
        .w-sw.none::after { content: '✕'; position: absolute; inset: 0; text-align: center; line-height: 22px; font-size: 10px; color: #8a967f; }
      </style>
      ${wardrobe.appearance ? '<div class="w-preview-slot"></div><div class="w-preview-hint">◂ LIVE PREVIEW ▸</div>' : ''}
      ${wardrobe.appearance ? `<div class="w-tabs">
        <button data-wtab="cosmetics" class="${wardTab === 'cosmetics' ? 'on' : ''}">🧢 COSMETICS</button>
        <button data-wtab="style" class="${wardTab === 'style' ? 'on' : ''}">☺ APPEARANCE</button>
      </div>` : ''}
      ${body}`;
    const slot = panels.ward.querySelector('.w-preview-slot');
    if (slot) heroPreview.mount(slot);
    panels.ward.querySelectorAll('[data-wtab]').forEach((b) => {
      b.addEventListener('click', () => { wardTab = b.dataset.wtab; audio.sfx('ui'); renderWardrobe(); });
    });
    // rename: applies live as you type (persists with the save)
    panels.ward.querySelector('.w-name')?.addEventListener('input', (e) => {
      wardrobe.appearance?.rename?.(e.target.value.trim() || 'Adventurer');
    });
    // appearance edits: parse "key:value", coerce numeric indices, apply live
    panels.ward.querySelectorAll('[data-wa]').forEach((b) => {
      b.addEventListener('click', () => {
        const [key, raw] = b.dataset.wa.split(':');
        const cfg = wardrobe.appearance.config;
        cfg[key] = key === 'gender' ? raw : parseInt(raw, 10);
        wardrobe.appearance.apply();
        renderWardrobe();
      });
    });
    panels.ward.querySelectorAll('[data-wear]').forEach((b) => {
      b.addEventListener('click', () => {
        const [slot, id] = b.dataset.wear.split(':');
        wardrobe.equip(slot, id);
        renderWardrobe();
      });
    });
    panels.ward.querySelectorAll('[data-unequip]').forEach((b) => {
      b.addEventListener('click', () => {
        wardrobe.equip(b.dataset.unequip, null);
        renderWardrobe();
      });
    });
  }

  function renderSkills() {
    if (!skillsApi) return;
    const { skillSys, getPoints } = skillsApi;
    const skillIds = skillsApi.skillIds;      // a live getter, NOT destructured
    const pts = getPoints();
    let rows = `<div class="sp-banner">SKILL POINTS: <b>${pts}</b> <small>— earn one every character level</small></div>`;

    // AN EMPTY LIST HAS TO SAY WHY. This panel used to draw the points banner
    // and then nothing at all, which is indistinguishable from a broken screen —
    // and for anybody who had not opened the tree yet, that was every time.
    if (!skillIds.length) {
      rows += `<div class="help-body" style="font-size:11px;line-height:1.8">
        <b style="color:var(--gold)">You have not learned any skills yet.</b><br><br>
        Skills are not handed out — you learn them in your <b>class skill tree</b>,
        and this panel is where you make the ones you know stronger.<br><br>
        <b>1.</b> Reach <b>Lv10</b> and find <span class="tip">Grand Master Vell</span>,
        the owl on the shrine avenue, to awaken into a class.<br>
        <b>2.</b> Open the tree with <b>K</b> and spend tree points to LEARN skills,
        then slot any three onto your bar. Slotting is free and reversible.<br>
        <b>3.</b> Come back here to spend your <b>${pts} skill point${pts === 1 ? '' : 's'}</b>
        levelling those skills to Lv5 — each level is +22% power and −6% cooldown.
      </div>`;
    }

    for (const id of skillIds) {
      const def = skillsApi.SKILLS[id];
      const lvl = skillSys.levelOf(id);
      const maxed = lvl >= skillsApi.MAX_SKILL_LEVEL;
      let pips = '';
      for (let i = 1; i <= skillsApi.MAX_SKILL_LEVEL; i++) {
        pips += `<span class="${i <= lvl ? 'pip on' : 'pip'}">◆</span>`;
      }
      const power = Math.round((lvl - 1) * 22);
      const cdCut = Math.round((lvl - 1) * 6);
      rows += `<div class="pet-row">
        <div class="dot" style="background:#141a12"><img src="${skillsApi.iconUrl(id, def.icon)}" style="width:26px;height:26px;image-rendering:pixelated"></div>
        <div class="nm">${def.name} <span class="pips">${pips}</span>
          <small>${def.desc}</small>
          <small class="perk">${lvl > 1 ? `★ +${power}% power · -${cdCut}% cooldown` : 'Base level'}</small>
        </div>
        <button class="act" data-skillup="${id}" ${(maxed || pts <= 0) ? 'disabled' : ''}>${maxed ? 'MAX' : 'UPGRADE'}</button>
      </div>`;
    }
    // The header used to read "SKILLS [K] close", but K opens the class TREE —
    // a different panel. Two screens behind one name and one hotkey is most of
    // why this one looked broken rather than empty.
    panels.skills.innerHTML = `<h3>SKILL LEVELS <small>[Esc] close</small></h3>
      <button class="act" data-opentree style="width:100%;margin-bottom:10px">✦ OPEN THE SKILL TREE — LEARN &amp; SLOT [K]</button>
      <style>
        .sp-banner { font-size: 11px; color: var(--text); margin-bottom: 10px; padding: 7px 10px;
          background: rgba(216,184,102,0.08); border: 1px solid var(--gold-dim); letter-spacing: 1px; }
        .sp-banner b { color: var(--gold); font-size: 13px; }
        .sp-banner small { color: var(--muted); letter-spacing: 0; }
        .pips { margin-left: 6px; font-size: 9px; letter-spacing: 2px; }
        .pip { color: #3a4436; } .pip.on { color: var(--gold); text-shadow: 0 0 5px var(--gold-glow); }
      </style>${rows}`;
    panels.skills.querySelector('[data-opentree]')?.addEventListener('click', () => {
      closeAll();
      skillsApi.openTree?.();
    });
    panels.skills.querySelectorAll('[data-skillup]').forEach((b) => {
      b.addEventListener('click', () => {
        if (skillsApi.spendPoint(b.dataset.skillup)) {
          audio.sfx('levelup');
          renderSkills();
        } else {
          audio.sfx('deny');
        }
      });
    });
  }

  function renderHelp() {
    const touch = isTouch;
    panels.help.innerHTML = `
      <h3>ADVENTURER'S GUIDE <small>[Esc] close</small></h3>
      <div class="help-body">
        <h4>WHERE TO FIND EVERYTHING (talk with ${touch ? 'the ★ button' : '<b>F</b>'})</h4>
        <span class="tip">Pip the Shopkeeper</span> — by the striped market stall (buy seeds, sell fish/crops/materials). Talk to Pip → <b>OPEN SHOP</b>.<br>
        <span class="tip">Master NXR</span> — the koala at the capsule machine on the village's east side (gacha!). Talk → <b>WONDER CAPSULES</b>.<br>
        <span class="tip">Bruna the Blacksmith</span> — the anvil/forge corner (or press <b>V</b> anywhere).<br>
        <span class="tip">Farm plots</span> — the tilled field just west of the village.<br>
        <span class="tip">Land parcels</span> (◎ on the map) & <span class="tip">Rest Camps</span> (▲, a Ranger heals you there) are out in the wilds — open the map with ${touch ? 'a tap on the minimap' : '<b>N</b>'}.
        <h4>CONTROLS</h4>
        ${touch
          ? `Left stick to move · <b>⚔</b> attack (auto-aims) · <b>↺</b> roll · <b>⤒</b> jump · right side buttons for skills & tonic · <b>★</b> context button to talk / buy / open chests / fish · <b>✕</b> (top-right) closes any menu · drag the middle-right area to turn the camera.`
          : `<b>WASD</b> move · <b>Space</b> jump · <b>LMB</b> attack (auto-aims at the nearest enemy) · <b>RMB</b> roll ·
             <b>1-3</b> skills · <b>4</b> tonic · <b>F</b> talk / buy / open chests / fish · <b>M</b> mount · <b>N</b> map · <b>Q/E</b> rotate camera · <b>Scroll</b> zoom · <b>Esc</b> close menus.`}
        <h4>HOW TO GROW STRONGER</h4>
        1. Hunt monsters for XP and materials — tougher ones live far from the village.<br>
        2. <b>CRAFT</b> better weapons from monster parts (menu C).<br>
        3. <b>FORGE</b> your weapon up to +9 with Forge Stones (menu V).<br>
        3½. Every level grants a <span class="tip">Skill Point</span> — spend them in the <b>SKILLS</b> menu (K) to level your skills up to Lv5 (more power, shorter cooldowns).<br>
        4. Open sparkling <span class="tip">treasure chests</span> — goodies and rare <span class="tip">pet charms</span>.<br>
        5. Take quests from the villagers (look for the <span style="color:#ffd23e">!</span> marks) — they pay well,
        and some reward <span class="tip">rideable mounts</span>!
        <h4>HOW TO EARN COINS 💰</h4>
        Walk up to <span class="tip">Pip's market stall</span> (the striped shop — $ on the map) and press
        ${touch ? 'the ★ button' : '<b>F</b>'} to open the shop, then <b>SELL</b>:<br>
        • <span class="tip">Fish</span> you catch (Golden Koi = 60c!) &nbsp; • <span class="tip">Crops</span> you grow &nbsp;
        • <span class="tip">Monster drops</span> &nbsp; • <span class="tip">Wood & ore</span> you gather.<br>
        Then <b>BUY</b> seeds, tonics and extra farm plots. Coins also buy <span class="tip">land</span> for a house
        and <span class="tip">gacha spins</span>.
        <h4>SHOP · GACHA · BUILD A HOUSE — where?</h4>
        Everything is a landmark you walk up to and press ${touch ? '★' : '<b>F</b>'}:<br>
        • <span class="tip">Shop</span> ($) — Pip's striped stall, east side of the village.<br>
        • <span class="tip">Gacha</span> (◈) — the capsule machine by Master NXR the koala.<br>
        • <span class="tip">Forge</span> (⚒) — the anvil (or press V anywhere).<br>
        • <span class="tip">Build a house</span> — find a <span class="tip">Land parcel</span> (◎ on the map, out in the wilds),
        press ${touch ? '★' : '<b>F</b>'} to buy it (250c), then again to pick a design and build it from
        hardwood + iron ore. Rest camps (▲) let you build too — camps & homes are safe & heal you.
        <br>Open the map with ${touch ? 'a tap on the minimap' : '<b>N</b>'} to see every marker.
        <h4>AFK GRINDING 😴</h4>
        <span class="tip">Auto-Battle</span>: press ${touch ? 'the AUTO button' : '<b>B</b>'} (or the ⚔AUTO button) — your
        hero hunts nearby monsters on its own, casts skills and sips tonics. Great for idle XP & loot.<br>
        <span class="tip">AFK Fishing</span>: at a shore press ${touch ? 'the 💤 button' : '<b>G</b>'} to auto-fish
        (common fish only — manual fishing keeps the good rarity).
        <h4>GATHERING — WOOD & ORE ⛏️</h4>
        Two resource nodes are scattered across the wilds (they look different from scenery):<br>
        • <span class="tip">Iron Ore boulders</span> — <b>dark grey rocks with glowing orange veins</b>. Easiest to
        spot at night by the orange glow. Walk up and press ${touch ? 'the ★ button' : '<b>F</b>'} <b>3 times</b> to
        mine → <span class="tip">Iron Ore</span> (+ sometimes Forge Stones).<br>
        • <span class="tip">Birch trees</span> — pale white bark with dark bands & golden-green tops. Chop with
        ${touch ? '★' : '<b>F</b>'} ×3 → <span class="tip">Hardwood</span>.<br>
        The prompt tells you which one you're facing ("Mine ore (3)" / "Chop birch (3)"). Nodes regrow after ~2 min.
        <b>You need Iron Ore & Hardwood to BUILD A HOUSE</b>, to forge, and to sell for coins — so mine plenty!
        <h4>RARE MATERIALS — WHERE TO HUNT THEM 🌙</h4>
        Some crafting materials only drop from specific monsters at specific times/places:<br>
        • <span class="tip">Wisp Essence</span> — <b>Wisps only appear at NIGHT</b> (glowing blue spirits in the wilds).
        Wait for dark (see the clock by the minimap), hunt them, sleep-safe by day.<br>
        • <span class="tip">Frost Shard</span> — Frostlings roam the <b>snowy north-west corner</b> of the map.<br>
        • <span class="tip">Soft Plume</span> — Puffowls float above the grass <b>at night</b>.<br>
        • <span class="tip">Golem Core</span> — the Golem mini-boss lives <b>far from the village</b>.<br>
        • <span class="tip">★ Elite monsters</span> (gold ring) drop bonus Forge Stones & tonics.
        <h4>FISHING & AFK MODE</h4>
        Press <b>F</b> at a shore to fish manually (best rarity). Press <b>G</b> for
        <span class="tip">AFK fishing</span> — hands-free, but almost only common fish. Moving stops it.
        <h4>SAFE ZONES & RESTING</h4>
        Monsters never enter the <span class="tip">village</span>, <span class="tip">rest camps</span> (▲ on the map)
        or your <span class="tip">built homes</span>. Standing by a campfire or your house heals you fast,
        and everyone slowly recovers HP out of combat. Cook fish into meals at any campfire.
        <h4>THE MAP</h4>
        Press <b>N</b> (or tap the minimap) for the world map: village ⌂, camps ▲, land ◎, quests !, bosses ◆.
        <h4>WORLD BOSSES</h4>
        Every ~3 minutes a <span class="tip">World Boss</span> rises somewhere nearby — follow the gold
        diamond on the minimap. They hit hard but drop heaps of Forge Stones and pet charms.
        <h4>THE WORLD</h4>
        Day turns to night — <span class="tip">Wisps</span> only appear after dark. Rain comes and goes.
        Fish at any lake shore. Pets grant passive perks; mounts carry you faster across the wilds.
        <h4>TIPS</h4>
        <span class="tip">Roll (RMB) has invincibility frames — dodge the Boarling's charge!</span><br>
        <span class="tip">Jump (Space) lets you hop up ledges and over gaps.</span><br>
        <span class="tip">The Golem mini-boss guards the best loot, far from the village.</span>
      </div>
    `;
  }

  function renderAbout() {
    panels.about.innerHTML = `<h3>ABOUT <small>[Esc] close</small></h3>
      <style>
        .about-body { text-align: center; }
        .about-body h4 { font-family: var(--font-display, monospace); font-size: 12px; letter-spacing: 3px; color: var(--gold); margin: 6px 0 10px; }
        .about-body p { font-size: 10px; color: #cfd8c8; line-height: 1.9; letter-spacing: 1px; margin-bottom: 6px; }
        .about-body .crew { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 2px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25); }
        .about-body .ct { font-size: 9px; letter-spacing: 3px; color: #8a967f; }
        .about-body .member { display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 7px 12px; background: rgba(10,14,9,0.6); box-shadow: inset 0 0 0 1px rgba(216,184,102,0.16); }
        .about-body .who { text-align: left; }
        .about-body .who b { display: block; font-size: 11px; color: #ffe9b0; letter-spacing: 1px; }
        .about-body .who small { font-size: 8px; color: #8a967f; letter-spacing: 1px; }
        .about-body a.xmini { flex-shrink: 0; font-family: inherit; font-size: 9px; letter-spacing: 1px;
          padding: 7px 12px; cursor: pointer; color: #e8f0f8; text-decoration: none;
          background: linear-gradient(180deg, #1c2732, #10161e); box-shadow: var(--pix-btn); }
        .about-body a.xmini:hover { filter: brightness(1.3); }
        ${ABOUT_BADGE_CSS}
      </style>
      <div class="about-body">${aboutInner('')}</div>`;
    paintAboutRialo(panels.about);
  }

  // --- DAILY: 30-day check-in calendar + play-time ladder + quest board ---
  function renderDaily() {
    if (!dailies) return;
    dailies.rollDay();
    const st = dailies.state;
    const idx = dailies.nextDayIndex();
    const cal = dailies.CHECKIN_DAYS.map((r, i) => {
      // streak already counts the claim, so everything before `idx` is done
      const done = i < idx;
      const isNext = i === idx && !st.claimedToday;
      const cls = done ? 'done' : isNext ? 'next' : '';
      const icon = r.coins ? itemIconUrl('coin')
        : r.item ? itemIconUrl(r.item)
          : r.cosmetic ? itemIconUrl(r.cosmetic)
            : itemIconUrl(r.mount);
      return `<div class="dc ${cls} ${r.grand ? 'grand' : r.big ? 'big' : ''}" title="${r.label}">
        <span class="dc-d">D${r.d}</span>
        <img src="${icon}">
        ${done ? '<span class="dc-tick">✓</span>' : ''}
      </div>`;
    }).join('');

    const mins = dailies.playMinutes();
    const pt = dailies.PLAYTIME_TIERS.map((t) => {
      const got = st.ptClaimed.includes(t.min);
      const pct = Math.max(0, Math.min(100, (mins / t.min) * 100));
      return `<div class="pt ${got ? 'got' : ''}">
        <span class="pt-m">${t.min}m</span>
        <div class="pt-bar"><div style="width:${pct}%"></div></div>
        <span class="pt-r">${got ? '✓ ' : ''}${t.label}</span>
      </div>`;
    }).join('');

    const quests = st.quests.map((q) => `
      <div class="dq ${q.claimed ? 'claimed' : q.done ? 'ready' : ''}">
        <div class="dq-n">${q.label}<small>${q.p}/${q.goal} &middot; ${q.coins}c${q.item ? ` + ${ITEMS[q.item].name} x${q.n}` : ''}</small></div>
        ${q.claimed ? '<span class="dq-ok">CLAIMED</span>'
          : q.done ? `<button class="act" data-dq="${q.id}">CLAIM</button>`
            : `<div class="dq-bar"><div style="width:${(q.p / q.goal) * 100}%"></div></div>`}
      </div>`).join('');

    panels.daily.innerHTML = `<h3>DAILY REWARDS <small>[Esc] close</small></h3>
      <style>
        .d-streak { font-size: 10px; color: var(--muted); letter-spacing: 1px; margin-bottom: 8px; }
        .d-streak b { color: var(--gold); font-size: 12px; }
        .d-cal { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-bottom: 6px; }
        .dc { position: relative; aspect-ratio: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 1px; background: #141a12;
          box-shadow: inset 0 0 0 2px #2c352c; }
        .dc img { width: 20px; height: 20px; image-rendering: pixelated; }
        .dc-d { font-size: 7px; color: #8a967f; letter-spacing: 0.5px; }
        .dc.big { box-shadow: inset 0 0 0 2px #b06ae8; }
        .dc.grand { box-shadow: inset 0 0 0 2px #f0c455, 0 0 10px rgba(240,196,85,0.4); }
        .dc.next { box-shadow: inset 0 0 0 2px var(--gold), 0 0 12px var(--gold-glow);
          animation: dc-pulse 1.4s ease-in-out infinite; }
        @keyframes dc-pulse { 50% { filter: brightness(1.3); } }
        .dc.done { opacity: 0.42; }
        .dc-tick { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: #8ac86a; text-shadow: 0 0 6px #000; }
        .d-claim { width: 100%; margin: 6px 0 4px; font-size: 12px !important; padding: 11px !important; letter-spacing: 3px !important; }
        .pt { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; font-size: 9px; color: #cfd8c8; }
        .pt-m { width: 26px; color: #b9a76a; letter-spacing: 0.5px; }
        .pt-bar { flex: 1; height: 6px; background: #141a12; box-shadow: inset 0 0 0 1px #2c352c; }
        .pt-bar > div { height: 100%; background: linear-gradient(90deg, #58c93f, #9fe86e); }
        .pt-r { width: 96px; text-align: right; color: #9aa890; }
        .pt.got .pt-r { color: #8ac86a; }
        .dq { display: flex; align-items: center; gap: 8px; padding: 7px 9px; margin-bottom: 5px;
          background: #141a12; box-shadow: inset 0 0 0 2px #232c22; }
        .dq.ready { box-shadow: inset 0 0 0 2px var(--gold); }
        .dq.claimed { opacity: 0.5; }
        .dq-n { flex: 1; font-size: 10px; color: #e5ead8; }
        .dq-n small { display: block; font-size: 8px; color: var(--muted); margin-top: 2px; }
        .dq-bar { width: 68px; height: 6px; background: #0e130d; box-shadow: inset 0 0 0 1px #2c352c; }
        .dq-bar > div { height: 100%; background: linear-gradient(90deg, #d8b866, #ffe9a8); }
        .dq-ok { font-size: 8px; color: #8ac86a; letter-spacing: 1px; }
      </style>
      <div class="d-streak">CHECK-IN STREAK: <b>${st.streak}</b> / 30 &nbsp;·&nbsp; ${st.claimedToday ? 'come back tomorrow!' : 'a reward is waiting'}</div>
      <div class="d-cal">${cal}</div>
      <button class="act d-claim" data-checkin ${st.claimedToday ? 'disabled' : ''}>
        ${st.claimedToday ? '✓ CLAIMED TODAY' : `◆ CLAIM DAY ${dailies.CHECKIN_DAYS[idx].d}`}
      </button>
      <h4 class="sect">PLAY TIME — THIS SESSION (${Math.floor(mins)}m)</h4>
      ${pt}
      <h4 class="sect">DAILY QUESTS — NEW BOARD EVERY 24H</h4>
      ${quests}`;
    panels.daily.querySelector('[data-checkin]')?.addEventListener('click', () => {
      if (dailies.checkIn()) audio.sfx('quest_done');
      else audio.sfx('deny');
      renderDaily();
    });
    panels.daily.querySelectorAll('[data-dq]').forEach((b) => {
      b.addEventListener('click', () => {
        if (dailies.claimQuest(b.dataset.dq)) audio.sfx('quest_done');
        renderDaily();
      });
    });
  }

  // --- GAMEPASS: a single ladder of tiers with three reward rows -----------
  // A representative blade per exotic family, purely so the ladder has
  // something to draw before the reward is resolved to your class.
  const WEAPON_TIER_ICON = {
    epic: 'star_blade', legendary: 'dragon_edge', mythic: 'celestial_saber',
  };

  function renderPass() {
    if (!gamepass) return;
    const st = gamepass.state;
    const tier = gamepass.tierOf();
    const prog = gamepass.progressInTier();
    const owned = st.owned;
    const perk = gamepass.perks();

    const rowCell = (row, t) => {
      const e = gamepass.PASS_TRACK[t - 1][row];
      const claimed = st.claimed[row].includes(t);
      const can = gamepass.canClaim(row, t);
      const locked = (row === 'basic' && owned === 'none')
        || (row === 'premium' && owned !== 'premium');
      // A weaponTier reward has no item id of its own — it resolves to whatever
      // suits your class at CLAIM time. Passing undefined in here threw inside
      // the icon painter and took the entire panel down with it, which is why
      // the gamepass rendered as a black rectangle.
      const iconId = e.coins ? 'coin'
        : (e.item || e.cosmetic || e.mount || e.petCharm
          || (e.weaponTier ? WEAPON_TIER_ICON[e.weaponTier] : null)
          || 'forge_stone');
      const icon = itemIconUrl(iconId);
      return `<div class="pcell ${claimed ? 'got' : ''} ${can ? 'can' : ''} ${locked ? 'lock' : ''} ${e.grand ? 'grand' : e.big ? 'big' : ''}"
        data-row="${row}" data-tier="${t}" title="${e.label}">
        <img src="${icon}">
        ${claimed ? '<span class="tick">✓</span>' : ''}
        ${locked && !claimed ? '<span class="lk">🔒</span>' : ''}
      </div>`;
    };

    let ladder = '';
    for (let t = 1; t <= gamepass.PASS_TIERS; t++) {
      const reached = t <= tier;
      ladder += `<div class="pcol ${reached ? 'on' : ''}">
        <div class="pt">${t}</div>
        ${rowCell('free', t)}
        ${rowCell('basic', t)}
        ${rowCell('premium', t)}
      </div>`;
    }

    const buyRow = owned === 'premium'
      ? '<div class="pown">★ PREMIUM GAMEPASS ACTIVE — every row unlocked</div>'
      : `<div class="pbuy">
          <button class="act" data-buypass="basic" ${owned !== 'none' ? 'disabled' : ''}>
            ${owned === 'basic' ? '✓ BASIC OWNED' : `BASIC — ${gamepass.PASS_PRICES.basic}c`}
          </button>
          <button class="act prem" data-buypass="premium">
            ${owned === 'basic'
              ? `UPGRADE — ${gamepass.PASS_PRICES.premium - gamepass.PASS_PRICES.basic}c`
              : `PREMIUM — ${gamepass.PASS_PRICES.premium}c`}
          </button>
        </div>`;

    const waiting = gamepass.pending();

    panels.pass.innerHTML = `<h3>GAMEPASS <small>[Esc] close</small></h3>
      <style>
        .phead { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .ptier { font-family: var(--font-display); font-size: 22px; color: var(--gold);
          text-shadow: 0 0 10px var(--gold-glow); }
        .phead small { font-size: 8px; color: var(--muted); letter-spacing: 2px; display: block; }
        .pxp { flex: 1; height: 9px; background: #141a12; box-shadow: inset 0 0 0 2px #2c352c; }
        .pxp > div { height: 100%; background: linear-gradient(90deg, #d8b866, #ffe9a8); }
        .pperk { font-size: 9px; color: #b8e89a; letter-spacing: 1px; margin-bottom: 8px; }
        .pbuy { display: flex; gap: 6px; margin-bottom: 10px; }
        .pbuy .act { flex: 1; font-size: 10px !important; padding: 10px 4px !important; letter-spacing: 2px !important; }
        .pbuy .prem { background: linear-gradient(180deg, #6a4a86, #402c52); }
        .pown { font-size: 10px; color: var(--gold); letter-spacing: 2px; text-align: center;
          padding: 8px; margin-bottom: 10px; box-shadow: inset 0 0 0 2px var(--gold); }
        .ptrack { display: flex; gap: 3px; overflow-x: auto; padding: 4px 2px 8px; }
        .pcol { display: flex; flex-direction: column; gap: 3px; align-items: center; flex: 0 0 auto; }
        .pcol .pt { font-size: 8px; color: #6a7a5f; }
        .pcol.on .pt { color: var(--gold); }
        .pcell { width: 38px; height: 38px; position: relative; background: #141a12;
          box-shadow: inset 0 0 0 2px #2c352c; display: flex; align-items: center; justify-content: center; }
        .pcell img { width: 24px; height: 24px; image-rendering: pixelated; }
        .pcell.big { box-shadow: inset 0 0 0 2px #b06ae8; }
        .pcell.grand { box-shadow: inset 0 0 0 2px #f0c455, 0 0 10px rgba(240,196,85,0.45); }
        .pcell.can { box-shadow: inset 0 0 0 2px var(--gold), 0 0 10px var(--gold-glow);
          cursor: pointer; animation: pc 1.3s ease-in-out infinite; }
        @keyframes pc { 50% { filter: brightness(1.35); } }
        .pcell.got { opacity: 0.35; }
        .pcell.lock { opacity: 0.45; }
        .pcell .tick { position: absolute; inset: 0; display: flex; align-items: center;
          justify-content: center; font-size: 17px; color: #8ac86a; text-shadow: 0 0 6px #000; }
        .pcell .lk { position: absolute; bottom: 0; right: 1px; font-size: 9px; }
        .prowlbl { display: flex; flex-direction: column; gap: 3px; font-size: 7px;
          color: var(--muted); letter-spacing: 1px; }
        .prowlbl span { height: 38px; display: flex; align-items: center; }
      </style>
      <div class="phead">
        <div class="ptier">${tier}<small>TIER</small></div>
        <div style="flex:1">
          <div class="pxp"><div style="width:${Math.round(prog * 100)}%"></div></div>
          <div style="font-size:8px;color:var(--muted);margin-top:3px">
            ${st.xp} PASS XP · earn it from anything you do
          </div>
        </div>
      </div>
      <div class="pperk">ACTIVE: ${perk.label}</div>
      ${buyRow}
      ${waiting ? `<button class="act" data-claimall style="width:100%;margin-bottom:8px">◆ CLAIM ALL (${waiting})</button>` : ''}
      <div style="display:flex;gap:5px">
        <div class="prowlbl"><span style="height:14px"></span><span>FREE</span><span>BASIC</span><span>PREM</span></div>
        <div class="ptrack">${ladder}</div>
      </div>`;

    panels.pass.querySelectorAll('.pcell.can').forEach((c) => {
      c.addEventListener('click', () => {
        if (gamepass.claim(c.dataset.row, +c.dataset.tier)) audio.sfx('quest_done');
        renderPass();
      });
    });
    panels.pass.querySelectorAll('[data-buypass]').forEach((b) => {
      b.addEventListener('click', () => {
        if (gamepass.buy(b.dataset.buypass, (n) => inventory.spendCoins(n))) audio.sfx('levelup_big');
        else audio.sfx('deny');
        renderPass();
      });
    });
    panels.pass.querySelector('[data-claimall]')?.addEventListener('click', () => {
      if (gamepass.claimAll()) audio.sfx('quest_done');
      renderPass();
    });
  }

  // --- GRAPHICS: the same panel the opening screen uses, in a game panel ---
  let gfxInstance = null;
  function renderGfx() {
    if (!gfxPanelFactory) return;
    if (!gfxInstance) gfxInstance = gfxPanelFactory();
    panels.gfx.innerHTML = `<h3>GRAPHICS <small>[Esc] close</small></h3>
      <div class="gfx-host"></div>`;
    // the panel positions itself absolutely; inside a game panel we let it flow
    gfxInstance.el.style.position = 'static';
    gfxInstance.el.style.transform = 'none';
    gfxInstance.el.style.width = '100%';
    gfxInstance.el.style.boxShadow = 'none';
    gfxInstance.el.style.padding = '0';
    gfxInstance.el.style.background = 'none';
    panels.gfx.querySelector('.gfx-host').appendChild(gfxInstance.el);
  }

  /**
   * LIFE SKILLS. Three trees side by side — fishing, farming, cooking — each
   * with its own level bar, its unspent points, and nodes that show what they
   * actually change rather than a bare percentage.
   */
  function renderLife() {
    const t = skilltree;
    if (!t) { panels.life.innerHTML = '<h3>LIFE SKILLS</h3><p>Not available.</p>'; return; }
    const cols = t.SKILLS.map((sk) => {
      const pr = t.progress(sk.id);
      const pct = Math.min(100, (pr.xp / pr.need) * 100);
      const nodes = t.NODES.filter((n) => n.skill === sk.id).map((n) => {
        const have = t.ranksOf(sk.id, n.id);
        const c = t.canBuy(n.id);
        const cls = have >= n.ranks ? 'maxed' : c.ok ? 'buyable' : 'locked';
        return `<div class="lnode ${cls}" data-buy="${n.id}">
          <div class="ln-h"><span class="ln-n">${n.name}</span><span class="ln-r">${have}/${n.ranks}</span></div>
          <div class="ln-d">${n.desc}</div>
          <div class="ln-f">${have >= n.ranks ? 'MAXED'
            : c.ok ? `BUY · ${n.cost} pt${n.cost > 1 ? 's' : ''}` : c.why}</div>
        </div>`;
      }).join('');
      return `<div class="lcol" style="--sc:${sk.color}">
        <div class="lhead">
          <span class="li">${sk.icon}</span>
          <span class="lname">${sk.name}</span>
          <span class="llv">Lv ${pr.lv}</span>
        </div>
        <div class="lbar"><div style="width:${pct}%"></div></div>
        <div class="lxp">${pr.xp} / ${pr.need} XP${pr.pts ? ` · <b>${pr.pts} point${pr.pts > 1 ? 's' : ''}</b>` : ''}</div>
        ${nodes}
      </div>`;
    }).join('');
    panels.life.innerHTML = `<h3>LIFE SKILLS <small>[Esc] close</small></h3>
      <style>
        .lgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .lcol { padding: 8px; background: rgba(8,12,8,0.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }
        .lhead { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .lhead .li { font-size: 14px; }
        .lhead .lname { font-size: 10px; color: var(--sc); letter-spacing: 1px; flex: 1; }
        .lhead .llv { font-size: 9px; color: #ffe27a; }
        .lbar { height: 7px; background: #17120f; border: 1px solid #0a0f0a; }
        .lbar > div { height: 100%; background: var(--sc); transition: width 0.2s; }
        .lxp { font-size: 8px; color: #9fb08c; margin: 3px 0 8px; }
        .lxp b { color: #ffe27a; }
        .lnode { padding: 6px 7px; margin-bottom: 5px; cursor: default;
          background: rgba(0,0,0,0.3); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); }
        .lnode.buyable { cursor: pointer; box-shadow: inset 0 0 0 1px var(--sc); }
        .lnode.buyable:hover { background: rgba(255,255,255,0.06); }
        .lnode.maxed { opacity: 0.72; box-shadow: inset 0 0 0 1px #6a7a5a; }
        .lnode.locked { opacity: 0.5; }
        .ln-h { display: flex; justify-content: space-between; gap: 6px; }
        .ln-n { font-size: 9px; color: #e8ecd8; }
        .ln-r { font-size: 8px; color: var(--sc); }
        .ln-d { font-size: 8px; line-height: 1.6; color: #a8b596; margin: 3px 0 4px; }
        .ln-f { font-size: 8px; letter-spacing: 1px; color: #ffe27a; }
        .lnode.locked .ln-f { color: #8a9a7a; }
        .lnode.maxed .ln-f { color: #9ab86a; }
        @media (max-width: 720px) { .lgrid { grid-template-columns: 1fr; } }
      </style>
      <p class="hint">Fishing, farming and cooking level on their own. Every level pays a point; spend it on a node that changes how the work plays.</p>
      <div class="lgrid">${cols}</div>`;
    panels.life.querySelectorAll('.lnode.buyable').forEach((el) => {
      el.addEventListener('click', () => {
        const r = t.buy(el.dataset.buy);
        audio.sfx(r.ok ? 'craft' : 'deny');
        renderLife();
      });
    });
  }

  const indexPanel = index ? createIndexPanel(panels.index, index, audio) : null;

  /**
   * FRIENDS. Deliberately honest about what it is: a list on this device,
   * showing who is in the world with you right now. It says so at the bottom
   * rather than implying a request was sent somewhere.
   */
  function renderFriends() {
    if (!friendsApi) return;
    const rows = friendsApi.rows();
    const online = rows.filter((r) => r.online).length;
    let html = `<div class="sp-banner">FRIENDS: <b>${rows.length}</b>
      <small>— ${online} online right now</small></div>`;

    if (!rows.length) {
      html += `<div class="help-body" style="font-size:11px;line-height:1.8">
        <b style="color:var(--gold)">You have not added anyone yet.</b><br><br>
        In a shared world (<b>🌐 PLAY ONLINE</b> from the title screen),
        <b>click any other player</b> to open their card and add them.<br><br>
        Once someone is on your list you will see a green dot here whenever they
        are in the world with you, so you know when it is worth going online.
      </div>`;
    } else {
      for (const f of rows) {
        html += `<div class="pet-row" style="border-color:${f.online ? '#8ad86e55' : '#2c352c'}">
          <div class="dot" style="background:${f.online ? '#8ad86e' : '#2a3226'};
            box-shadow:${f.online ? '0 0 8px #8ad86e' : 'none'}"></div>
          <div class="nm">${f.name}
            <small>Lv ${f.lv} · ${f.online ? '<b style="color:#8ad86e">IN THE WORLD NOW</b>' : 'not online'}</small>
          </div>
          <button class="act" data-unfriend="${f.id}">REMOVE</button>
        </div>`;
      }
    }

    html += `<div style="font-size:9.5px;color:var(--muted);margin-top:10px;line-height:1.7">
      This list is stored on this device. Adding someone does not notify them —
      a two-way request needs the server, and that is not shipped yet.</div>`;

    panels.friends.innerHTML = `<h3>FRIENDS <small>[Esc] close</small></h3>${html}`;
    panels.friends.querySelectorAll('[data-unfriend]').forEach((b) => {
      b.addEventListener('click', () => {
        friendsApi.remove(b.dataset.unfriend);
        audio.sfx('ui');
        renderFriends();
      });
    });
  }

  const RENDER = {
    inv: renderInventory, cra: renderCrafting, forge: renderForge, pets: renderPets,
    skills: renderSkills, shop: renderShop, cook: renderCook, estate: renderEstate,
    gacha: () => renderGacha(), ward: renderWardrobe, help: renderHelp, about: renderAbout,
    daily: renderDaily, pass: renderPass, gfx: renderGfx, life: renderLife,
    index: () => indexPanel?.render(),
    friends: renderFriends,
  };

  function toggle(which) {
    const target = panels[which];
    // an unknown id used to throw on `.classList` and take the whole input
    // handler down with it; closing everything is the sane answer instead
    if (!target) { closeAll(); return; }
    for (const [k, p] of Object.entries(panels)) {
      if (k !== which) p.classList.remove('show');
    }
    const show = !target.classList.contains('show');
    target.classList.toggle('show', show);
    if (which !== 'ward' || !show) heroPreview.stop(); // pause the 3D preview off-panel
    if (show) RENDER[which]();
    return show;
  }

  function refresh() {
    // never re-render the wardrobe from an inventory change while it's open —
    // it would blow away the live preview & rename focus mid-edit
    for (const [k, p] of Object.entries(panels)) {
      if (k !== 'ward' && k !== 'gfx' && p.classList.contains('show')) RENDER[k]();
    }
  }

  function anyOpen() { return Object.values(panels).some((p) => p.classList.contains('show')); }
  function closeAll() { heroPreview.stop(); for (const p of Object.values(panels)) p.classList.remove('show'); }

  inventory.onChange(refresh);

  return { toggle, refresh, anyOpen, closeAll };
}
