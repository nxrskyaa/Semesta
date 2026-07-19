// Panels: Bag (Tab), Craft (C), Forge (V), Pets (P), Wardrobe (O), Help (?) — pixel style, touch friendly.
import { ITEMS, RARITY, RARITY_ORDER } from '../systems/items.js';
import { itemIconUrl } from '../gfx/textures.js';
import { recipesFor, canCraft, craft } from '../systems/crafting.js';
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
  font-size: 14px; letter-spacing: 4px; color: var(--gold); margin: -4px -4px 12px;
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
  economy, cooking, estate, gacha, wardrobe,
}) {
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
    panels.inv.innerHTML = `<h3>BAG <small>[Tab] close</small></h3>${coinBar}<div class="inv-grid">${grid}</div>${foods}${weps}`;
    panels.inv.querySelectorAll('[data-eq]').forEach((b) => {
      b.addEventListener('click', () => {
        inventory.equip(b.dataset.eq);
        audio.sfx('ui');
        renderInventory();
      });
    });
    panels.inv.querySelectorAll('[data-eat]').forEach((b) => {
      b.addEventListener('click', () => {
        economy?.eat(b.dataset.eat);
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
      b.addEventListener('click', () => { cooking.cook(b.dataset.cook); renderCook(); });
    });
  }

  function renderEstate() {
    if (!estate) return;
    const land = estate.currentLand();
    const coins = inventory.state.coins;
    const steps = (active) => `<div class="steps">
      <span class="${active >= 1 ? (active > 1 ? 'done' : 'now') : ''}">1 · Buy land</span>
      <span class="${active >= 2 ? (active > 2 ? 'done' : 'now') : ''}">2 · Gather wood & ore</span>
      <span class="${active >= 3 ? 'now' : ''}">3 · Build</span></div>`;
    let html = '';
    if (!land) {
      html = `<div class="help-body" style="font-size:11px">
        <b style="color:var(--gold)">How to build a house — 3 steps:</b><br>
        <b>1.</b> Find a <span class="tip">Land parcel</span> in the wilds — a wooden sign with a big
        <span style="color:#f0c455">"LAND FOR SALE"</span> label. It's marked <span style="color:#f0c455">◎</span> on the map
        (${isTouch ? 'tap the minimap' : 'press N'}). Walk onto it.<br>
        <b>2.</b> Gather building materials: chop <span class="tip">birch trees</span> for Hardwood and mine
        <span class="tip">ore boulders</span> for Iron Ore (press F on them, 3 hits each).<br>
        <b>3.</b> Stand on your land and press ${isTouch ? 'the ★ button' : '<b>F</b>'} — this menu opens to buy the
        land (250c) and pick a house design. Homes heal you & keep monsters away!
      </div>`;
    } else if (!land.owned) {
      const afford = coins >= estate.landPrice;
      html = `${steps(1)}<div class="coinbar"><img src="${itemIconUrl('coin')}"> ${coins} coins</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Step 1 — claim this plot. Earn coins by selling fish, crops & materials at Pip's shop.</div>
        <div class="rec-row"><div class="nm">Land Parcel #${land.idx + 1}
          <small>A scenic clearing, ready for a home of your own.</small></div>
          <div class="cost"><span class="${afford ? 'ok' : 'lack'}">${estate.landPrice}c</span></div>
          <button class="act" data-buyland ${afford ? '' : 'disabled'}>BUY LAND (${estate.landPrice}c)</button></div>`;
    } else if (!land.built) {
      html = `${steps(3)}<div class="coinbar"><img src="${itemIconUrl('coin')}"> ${coins} coins</div>
        <h4 class="sect">PICK A DESIGN — chop birch trees for Hardwood, mine boulders for Iron Ore</h4>`;
      for (const [id, d] of Object.entries(estate.designs)) {
        let cost = '';
        let ok = coins >= d.coins;
        for (const [mid, n] of Object.entries(d.cost)) {
          const have = inventory.count(mid);
          if (have < n) ok = false;
          cost += `<span class="${have >= n ? 'ok' : 'lack'}"><img src="${itemIconUrl(mid)}">${have}/${n}</span>`;
        }
        if (d.coins) cost += `<span class="${coins >= d.coins ? 'ok' : 'lack'}">${d.coins}c</span>`;
        html += `<div class="rec-row"><div class="dot" style="background:${d.roof}"></div>
          <div class="nm">${d.name}<small>${d.desc}</small></div>
          <div class="cost">${cost}</div>
          <button class="act" data-build="${id}" ${ok ? '' : 'disabled'}>BUILD</button></div>`;
      }
    } else {
      html = `<div style="font-size:11px;color:var(--text)">Welcome home! Your ${estate.designs[land.built].name} heals you while you're nearby, and monsters keep their distance.</div>`;
    }
    panels.estate.innerHTML = `<h3>YOUR ESTATE <small>[Esc] close</small></h3>${html}`;
    panels.estate.querySelector('[data-buyland]')?.addEventListener('click', () => {
      estate.buyLand(); renderEstate();
    });
    panels.estate.querySelectorAll('[data-build]').forEach((b) => {
      b.addEventListener('click', () => { estate.build(b.dataset.build); renderEstate(); });
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

    let stage;
    if (phase === 'spin') {
      stage = `<div class="g-machine spin">
          <div class="g-dome"><div class="g-caps a"></div><div class="g-caps b"></div><div class="g-caps c"></div></div>
          <div class="g-body">◈</div><div class="g-crank">✦</div>
        </div>
        <div class="g-hint">The capsule tumbles...</div>`;
    } else if (phase === 'drop' && result) {
      // the won capsule falls out, bounces, and cracks open in rarity light
      const R = RARITY[result.rarity];
      stage = `<div class="g-dropzone" style="--rc:${R.color}">
          <div class="g-fallcap"><div class="g-captop"></div><div class="g-capbot"></div></div>
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
      stage = `<div class="g-machine">
          <div class="g-dome"><div class="g-caps a"></div><div class="g-caps b"></div><div class="g-caps c"></div></div>
          <div class="g-body">◈</div><div class="g-crank">✦</div>
        </div>
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
        /* pixel capsule machine */
        .g-machine { display: inline-block; position: relative; width: 96px; }
        .g-dome { width: 84px; height: 56px; margin: 0 auto; border: 3px solid #3a2e18;
          border-bottom: none; border-radius: 42px 42px 0 0; position: relative; overflow: hidden;
          background: linear-gradient(180deg, rgba(200,230,255,0.16), rgba(140,180,220,0.06)); }
        .g-caps { position: absolute; width: 18px; height: 18px; border-radius: 50%; }
        .g-caps::after { content: ''; position: absolute; inset: 50% 0 0 0; border-radius: 0 0 9px 9px; background: #f4f0e4; }
        .g-caps.a { background: #f06a7a; left: 12px; bottom: 2px; }
        .g-caps.b { background: #5aa8e8; left: 34px; bottom: 6px; }
        .g-caps.c { background: #ffd23e; left: 54px; bottom: 1px; }
        .g-body { width: 96px; height: 46px; margin-top: -1px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(180deg, #c23a44, #8a2830); border: 3px solid #3a2e18;
          color: #ffd7a8; font-size: 18px; text-shadow: 0 0 8px rgba(255,200,120,0.6); }
        .g-crank { position: absolute; right: -7px; bottom: 14px; width: 20px; height: 20px; line-height: 20px;
          background: #ffd23e; border: 2px solid #3a2e18; border-radius: 50%; font-size: 10px; color: #5e3c10; }
        .g-machine .g-caps { animation: g-idle 2.6s ease-in-out infinite; }
        .g-machine .g-caps.b { animation-delay: 0.5s; }
        .g-machine .g-caps.c { animation-delay: 1.1s; }
        @keyframes g-idle { 50% { transform: translateY(-2.5px); } }
        .g-machine.spin { animation: g-rattle 0.14s linear infinite; }
        .g-machine.spin .g-caps.a { animation: g-jump 0.22s ease-in-out infinite; }
        .g-machine.spin .g-caps.b { animation: g-jump 0.19s ease-in-out infinite 0.05s; }
        .g-machine.spin .g-caps.c { animation: g-jump 0.25s ease-in-out infinite 0.1s; }
        .g-machine.spin .g-crank { animation: g-spin 0.5s linear infinite; }
        @keyframes g-rattle { 25% { transform: translate(-2px, 0) rotate(-1.5deg); } 75% { transform: translate(2px, 0) rotate(1.5deg); } }
        @keyframes g-jump { 50% { transform: translateY(-14px); } }
        @keyframes g-spin { to { transform: rotate(360deg); } }
        .g-hint { font-size: 10px; color: var(--muted); margin-top: 10px; letter-spacing: 1px; }
        /* capsule drop + crack-open phase */
        .g-dropzone { position: relative; height: 130px; }
        .g-fallcap { position: absolute; left: 50%; top: 0; width: 44px; height: 44px; margin-left: -22px;
          animation: g-fall 0.62s cubic-bezier(0.3, 0, 0.6, 1.4) forwards; }
        .g-captop, .g-capbot { position: absolute; left: 0; width: 44px; height: 22px; }
        .g-captop { top: 0; border-radius: 22px 22px 0 0; background: var(--rc);
          animation: g-crack-top 0.3s ease-in 0.66s forwards; }
        .g-capbot { bottom: 0; border-radius: 0 0 22px 22px; background: #f4f0e4;
          animation: g-crack-bot 0.3s ease-in 0.66s forwards; }
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
  let wardTab = 'style'; // style (appearance) | cosmetics
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
            <small style="color:${R.color}">${'◆'.repeat(RARITY_ORDER.indexOf(d.rarity) + 1)} ${R.name}</small>
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
      ${wardrobe.appearance ? `<div class="w-tabs">
        <button data-wtab="style" class="${wardTab === 'style' ? 'on' : ''}">☺ APPEARANCE</button>
        <button data-wtab="cosmetics" class="${wardTab === 'cosmetics' ? 'on' : ''}">🧢 COSMETICS</button>
      </div>` : ''}
      ${body}`;
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
    const { skillIds, skillSys, getPoints } = skillsApi;
    const pts = getPoints();
    let rows = `<div class="sp-banner">SKILL POINTS: <b>${pts}</b> <small>— earn one every character level</small></div>`;
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
    panels.skills.innerHTML = `<h3>SKILLS <small>[K] close</small></h3>
      <style>
        .sp-banner { font-size: 11px; color: var(--text); margin-bottom: 10px; padding: 7px 10px;
          background: rgba(216,184,102,0.08); border: 1px solid var(--gold-dim); letter-spacing: 1px; }
        .sp-banner b { color: var(--gold); font-size: 13px; }
        .sp-banner small { color: var(--muted); letter-spacing: 0; }
        .pips { margin-left: 6px; font-size: 9px; letter-spacing: 2px; }
        .pip { color: #3a4436; } .pip.on { color: var(--gold); text-shadow: 0 0 5px var(--gold-glow); }
      </style>${rows}`;
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

  const RENDER = {
    inv: renderInventory, cra: renderCrafting, forge: renderForge, pets: renderPets,
    skills: renderSkills, shop: renderShop, cook: renderCook, estate: renderEstate,
    gacha: () => renderGacha(), ward: renderWardrobe, help: renderHelp,
  };

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
