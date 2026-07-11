// Panels: Bag (Tab), Craft (C), Forge (V), Pets (P), Help (?) — pixel style, touch friendly.
import { ITEMS } from '../systems/items.js';
import { itemIconUrl } from '../gfx/textures.js';
import { recipesFor, canCraft, craft } from '../systems/crafting.js';
import { forgeCost, forgeChance, MAX_PLUS } from '../systems/forge.js';
import { PET_DEFS } from '../systems/pets.js';
import { MOUNT_DEFS } from '../systems/mounts.js';

const CSS = `
.panel {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -52%);
  width: min(500px, calc(100vw - 20px)); max-height: 78vh; overflow-y: auto;
  background: linear-gradient(180deg, var(--panel-1), var(--panel-2));
  border: 2px solid var(--line);
  box-shadow: inset 0 0 0 1px var(--gold-glow), inset 0 0 50px rgba(0,0,0,0.45), 0 0 0 1px var(--ink);
  clip-path: var(--cut);
  padding: 15px; display: none;
  pointer-events: auto; z-index: 30;
  scrollbar-width: thin; scrollbar-color: var(--gold-dim) transparent;
}
.panel.show { display: block; animation: panel-in 0.14s ease-out; }
@keyframes panel-in { from { transform: translate(-50%, -50%) scale(0.97); opacity: 0; } }
.panel h3 {
  font-size: 15px; letter-spacing: 4px; color: var(--gold); margin-bottom: 12px;
  border-bottom: 1px solid var(--gold-dim); padding-bottom: 8px;
  text-shadow: 0 1px 0 var(--ink);
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
  font-family: inherit; font-size: 11px; padding: 7px 14px; cursor: pointer;
  background: linear-gradient(180deg, #57452a, #3a2e18); color: #ffe9b0;
  border: 1px solid var(--gold-dim); box-shadow: 0 0 0 1px var(--ink);
  letter-spacing: 1px;
}
.panel button.act:hover:not(:disabled) { border-color: var(--gold); filter: brightness(1.2); }
.panel button.act:disabled { background: #242a24; color: #666f60; border-color: #333c33; cursor: default; }
.panel button.eq {
  font-family: inherit; font-size: 11px; padding: 6px 12px; cursor: pointer;
  background: linear-gradient(180deg, #2a3522, #1a2215); color: #c2cbb0;
  border: 1px solid #5a6a4a; box-shadow: 0 0 0 1px var(--ink);
}
.panel button.eq:hover:not(:disabled) { border-color: var(--gold); color: #f0e9cc; }
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
.help-body { font-size: 11px; color: #cfd8c8; line-height: 2; }
.help-body h4 { font-size: 12px; color: #ffe9a8; letter-spacing: 2px; margin: 10px 0 4px; }
.help-body b { background: #202a20; border: 1px solid #39443a; padding: 0 5px; color: #c5cdbd; font-weight: normal; }
.help-body .tip { color: #b8d89a; }
`;

export function createPanels(hudRoot, {
  inventory, forge, character, weaponType, audio, pets, isTouch,
  onCraft, onForged, onSummonPet, onSummonMount, mountsRef,
}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panels = {
    inv: document.createElement('div'),
    cra: document.createElement('div'),
    forge: document.createElement('div'),
    pets: document.createElement('div'),
    help: document.createElement('div'),
  };
  for (const p of Object.values(panels)) {
    p.className = 'panel';
    hudRoot.appendChild(p);
  }

  function renderInventory() {
    const mats = [...inventory.state.materials.entries()];
    let grid = '';
    const cells = Math.max(18, Math.ceil(mats.length / 6) * 6);
    for (let i = 0; i < cells; i++) {
      const m = mats[i];
      grid += m
        ? `<div class="inv-cell" title="${ITEMS[m[0]].name}"><img src="${itemIconUrl(m[0])}"><span class="cnt">${m[1]}</span></div>`
        : '<div class="inv-cell"></div>';
    }
    let weps = '';
    for (const id of inventory.state.weapons) {
      const d = ITEMS[id];
      const eq = inventory.state.equipped === id;
      const plus = forge.plusOf(id);
      weps += `<div class="wep-row"><img class="ic" src="${itemIconUrl(id)}">
        <div class="nm">${d.name} ${plus ? `<span class="plus">+${plus}</span>` : ''}<small>DMG ${d.dmg} · SPD ${d.speed}${d.hits ? ` ×${d.hits}` : ''}</small></div>
        <button class="eq" data-eq="${id}" ${eq ? 'disabled' : ''}>${eq ? 'EQUIPPED' : 'EQUIP'}</button></div>`;
    }
    panels.inv.innerHTML = `<h3>BAG <small>[Tab] close</small></h3><div class="inv-grid">${grid}</div>${weps}`;
    panels.inv.querySelectorAll('[data-eq]').forEach((b) => {
      b.addEventListener('click', () => {
        inventory.equip(b.dataset.eq);
        audio.sfx('ui');
        renderInventory();
      });
    });
  }

  function renderCrafting() {
    const recipes = recipesFor(weaponType);
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
        const r = recipes.find((x) => x.out === b.dataset.craft);
        if (r && craft(r, inventory)) {
          audio.sfx('craft');
          onCraft(r);
          renderCrafting();
        }
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

  function renderHelp() {
    const touch = isTouch;
    panels.help.innerHTML = `
      <h3>ADVENTURER'S GUIDE <small>[Esc] close</small></h3>
      <div class="help-body">
        <h4>CONTROLS</h4>
        ${touch
          ? `Left stick to move · <b>⚔</b> attack (auto-aims) · <b>↺</b> roll · <b>⤒</b> jump · right side buttons for skills & tonic · <b>★</b> context button to talk / open chests / fish · drag the middle-right area to turn the camera.`
          : `<b>WASD</b> move · <b>Space</b> jump · <b>LMB</b> attack (auto-aims at the nearest enemy) · <b>RMB</b> roll ·
             <b>1-3</b> skills · <b>4</b> tonic · <b>F</b> talk / open chests / fish · <b>M</b> mount · <b>Q/E</b> rotate camera · <b>Scroll</b> zoom.`}
        <h4>HOW TO GROW STRONGER</h4>
        1. Hunt monsters for XP and materials — tougher ones live far from the village.<br>
        2. <b>CRAFT</b> better weapons from monster parts (menu C).<br>
        3. <b>FORGE</b> your weapon up to +9 with Forge Stones (menu V).<br>
        4. Open sparkling <span class="tip">treasure chests</span> — goodies and rare <span class="tip">pet charms</span>.<br>
        5. Take quests from the villagers (look for the <span style="color:#ffd23e">!</span> marks) — they pay well,
        and some reward <span class="tip">rideable mounts</span>!
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

  const RENDER = { inv: renderInventory, cra: renderCrafting, forge: renderForge, pets: renderPets, help: renderHelp };

  function toggle(which) {
    const target = panels[which];
    for (const [k, p] of Object.entries(panels)) {
      if (k !== which) p.classList.remove('show');
    }
    const show = !target.classList.contains('show');
    target.classList.toggle('show', show);
    if (show) RENDER[which]();
    return show;
  }

  function refresh() {
    for (const [k, p] of Object.entries(panels)) {
      if (p.classList.contains('show')) RENDER[k]();
    }
  }

  function anyOpen() { return Object.values(panels).some((p) => p.classList.contains('show')); }
  function closeAll() { for (const p of Object.values(panels)) p.classList.remove('show'); }

  inventory.onChange(refresh);

  return { toggle, refresh, anyOpen, closeAll };
}
