// THE AWAKENING, and the skill tree that follows it.
//
// Two overlays that share a look, because they are two halves of the same
// moment: choosing what you are, and then choosing what you can do.
//
// The awakening is deliberately heavy — full screen, one card per class, a
// confirm step, and no way to change your mind afterwards. A choice you can
// undo in a menu is not a choice, and this is the one decision in Semesta that
// is meant to define a character rather than decorate one.
//
// Both are DATA-DRIVEN off classes.js and classtree.js and grant nothing
// themselves: they call back with an id and let the caller do the work, the
// same contract dailies and the gamepass use.

import { CLASSES, ADVANCED_CLASSES } from '../systems/classes.js';
import { TIER_LEVEL, LOADOUT_SIZE } from '../systems/classtree.js';
import { SKILLS } from '../systems/skills.js';
import { skillIconUrl } from '../gfx/textures.js';
import { t } from './lang.js';

const TXT = {
  title: { en: 'CHOOSE YOUR PATH', id: 'PILIH JALANMU' },
  sub: {
    en: 'Grand Master Vell has watched you long enough. This cannot be undone.',
    id: 'Grand Master Vell sudah cukup lama mengamatimu. Pilihan ini tidak bisa diubah.',
  },
  branch: { en: 'AND YOUR WEAPON', id: 'DAN SENJATAMU' },
  confirm: { en: 'AWAKEN', id: 'BANGKITKAN' },
  back: { en: 'BACK', id: 'KEMBALI' },
  sure: { en: 'This is permanent. Are you sure?', id: 'Ini permanen. Yakin?' },
  yes: { en: 'YES — AWAKEN ME', id: 'YA — BANGKITKAN AKU' },
  treeTitle: { en: 'SKILL TREE', id: 'POHON SKILL' },
  points: { en: 'SKILL POINTS', id: 'POIN SKILL' },
  learn: { en: 'LEARN', id: 'PELAJARI' },
  slot: { en: 'SLOT', id: 'PASANG' },
  slotted: { en: 'SLOTTED', id: 'TERPASANG' },
  loadout: { en: 'ACTION SLOTS', id: 'SLOT AKSI' },
  empty: { en: 'empty', id: 'kosong' },
  tier: { en: 'TIER', id: 'TINGKAT' },
  close: { en: 'CLOSE', id: 'TUTUP' },
  hint: {
    en: 'Learning is permanent. Slotting is free — swap any time.',
    id: 'Mempelajari itu permanen. Memasang itu gratis — bisa ditukar kapan saja.',
  },
};

const CSS = `
.tree .row { display: flex; gap: 8px; }
.tree .row .close { flex: 1; }
.tree .respec {
  padding: 9px 12px; background: #3a2436; color: #ffb0c8;
  border: var(--pix-btn, 2px solid #6a3a58); cursor: pointer;
  font-family: var(--font-display, monospace); font-size: 11px; letter-spacing: 1px;
}
.tree .respec[data-armed="1"] { background: #6a2038; color: #fff; border-color: #a83a5c; }
.awk {
  position: fixed; inset: 0; z-index: 190;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 35%, rgba(30,26,44,0.97), rgba(6,8,10,0.98));
  font-family: var(--font-body, sans-serif); padding: 18px; overflow-y: auto;
  animation: awk-in 0.4s ease-out;
}
@keyframes awk-in { from { opacity: 0; transform: scale(0.98); } }
.awk h2 {
  font-family: var(--font-display, sans-serif); font-size: 17px; letter-spacing: 4px;
  color: #ffe9b0; margin: 0 0 6px; text-align: center;
}
.awk .sub { font-size: 10.5px; color: #9fb08c; margin-bottom: 18px; text-align: center; line-height: 1.7; }
.awk .grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
  width: min(880px, 96vw);
}
.awk .cls {
  padding: 14px 12px; cursor: pointer; text-align: left; border: 0;
  font-family: inherit; color: #eaf2df;
  background: linear-gradient(180deg, rgba(30,38,30,0.94), rgba(18,24,18,0.94));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  transition: transform 0.12s, filter 0.12s;
}
.awk .cls:hover { transform: translateY(-3px); filter: brightness(1.2); }
.awk .cls.sel { box-shadow: inset 0 0 0 2px #d8b866, 0 8px 24px rgba(0,0,0,0.5); }
.awk .cls .nm {
  font-family: var(--font-display, sans-serif); font-size: 12px; letter-spacing: 2px;
  display: flex; align-items: center; gap: 7px; margin-bottom: 4px;
}
.awk .cls .dot { width: 9px; height: 9px; display: inline-block; }
.awk .cls .tag { font-size: 9px; color: #b8a86a; letter-spacing: 1px; margin-bottom: 7px; }
.awk .cls .ds { font-size: 10px; color: #b6c0ac; line-height: 1.65; min-height: 46px; }
.awk .cls .st { display: flex; gap: 8px; margin-top: 9px; font-size: 9px; color: #8a9880; }
.awk .cls .st b { color: #d8b866; font-weight: normal; }
.awk .branches { display: flex; gap: 10px; margin-top: 14px; width: min(560px, 94vw); }
.awk .branches button {
  flex: 1; padding: 12px; cursor: pointer; border: 0; font-family: inherit;
  color: #eaf2df; font-size: 11px; text-align: left;
  background: rgba(24,30,24,0.94); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}
.awk .branches button.sel { box-shadow: inset 0 0 0 2px #d8b866; }
.awk .branches button small { display: block; font-size: 9px; color: #9fb08c; margin-top: 5px; line-height: 1.6; }
.awk .row { display: flex; gap: 10px; margin-top: 18px; align-items: center; }
.awk button.go {
  font-family: inherit; cursor: pointer; border: 0; padding: 12px 26px;
  font-size: 11px; letter-spacing: 2px; color: #10160f; background: #d8b866;
  box-shadow: 0 3px 0 #8a7038;
}
.awk button.go:disabled { opacity: 0.35; cursor: default; box-shadow: none; }
.awk button.ghost {
  font-family: inherit; cursor: pointer; border: 0; padding: 12px 20px;
  font-size: 11px; letter-spacing: 2px; color: #9fb08c; background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
}
.awk .warn { font-size: 10px; color: #e8a33d; margin-top: 12px; text-align: center; }
@media (max-width: 780px) { .awk .grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 520px) {
  .awk .grid { grid-template-columns: 1fr; }
  .awk .cls .ds { min-height: 0; }
  .awk .branches { flex-direction: column; }
}

/* ---- skill tree ---- */
.awk .tree { width: min(760px, 96vw); }
.awk .tierhdr {
  display: flex; align-items: center; gap: 8px; margin: 16px 0 8px;
  font-family: var(--font-display, sans-serif); font-size: 10px; letter-spacing: 2px; color: #b8a86a;
}
.awk .tierhdr i { flex: 1; height: 1px; background: rgba(216,184,102,0.25); }
.awk .node {
  display: flex; gap: 11px; align-items: center; padding: 9px 11px; margin-bottom: 6px;
  background: rgba(20,26,20,0.9); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
}
.awk .node.own { box-shadow: inset 0 0 0 1px rgba(138,216,110,0.45); }
.awk .node.lock { opacity: 0.45; }
.awk .node .ic {
  width: 34px; height: 34px; flex: none; background-size: cover;
  image-rendering: pixelated; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5);
}
.awk .node .info { flex: 1; min-width: 0; }
.awk .node .info b { font-size: 11px; color: #eaf2df; font-weight: normal; }
.awk .node .info small { display: block; font-size: 9.5px; color: #9fb08c; line-height: 1.6; margin-top: 3px; }
.awk .node .act { display: flex; gap: 5px; flex: none; }
.awk .node .act button {
  font-family: inherit; font-size: 9px; letter-spacing: 1px; cursor: pointer; border: 0;
  padding: 7px 9px; color: #10160f; background: #d8b866;
}
.awk .node .act button.s2 { background: #8ad86e; }
.awk .node .act button:disabled { opacity: 0.3; cursor: default; }
.awk .node .why { font-size: 9px; color: #7d8a70; flex: none; }
.awk .load { display: flex; gap: 8px; margin: 4px 0 6px; }
.awk .load .sl {
  flex: 1; padding: 9px; text-align: center; font-size: 9.5px; color: #9fb08c;
  background: rgba(14,18,14,0.9); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.07);
}
.awk .load .sl b { display: block; color: #ffe9b0; font-size: 10.5px; font-weight: normal; margin-bottom: 3px; }
.awk .pts { font-size: 11px; color: #d8b866; margin-bottom: 4px; }
`;

let styled = false;
function ensureStyle() {
  if (styled) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  styled = true;
}

const statRow = (c) => `<div class="st">
  <span>PWR <b>${c.stats.power}</b></span><span>SPD <b>${c.stats.speed}</b></span>
  <span>RNG <b>${c.stats.range}</b></span><span>DEF <b>${c.stats.defense}</b></span>
</div>`;

/**
 * The awakening ritual.
 * @returns Promise<{ cls, branch } | null>  null if they backed out
 */
export function showAwakening() {
  ensureStyle();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'awk';
    el.innerHTML = `
      <h2>${t(TXT.title)}</h2>
      <div class="sub">${t(TXT.sub)}</div>
      <div class="grid">
        ${ADVANCED_CLASSES.map((k) => {
          const c = CLASSES[k];
          return `<button class="cls" data-c="${k}">
            <div class="nm"><i class="dot" style="background:${c.color}"></i>${c.name.toUpperCase()}</div>
            <div class="tag">${c.tagline}</div>
            <div class="ds">${c.desc}</div>
            ${statRow(c)}
          </button>`;
        }).join('')}
      </div>
      <div class="branchwrap"></div>
      <div class="row">
        <button class="go" disabled>${t(TXT.confirm)}</button>
      </div>
      <div class="warn"></div>`;
    document.body.appendChild(el);

    const grid = el.querySelector('.grid');
    const branchWrap = el.querySelector('.branchwrap');
    const go = el.querySelector('.go');
    const warn = el.querySelector('.warn');
    let sel = null, branch = null, armed = false;

    function reset() {
      armed = false;
      go.textContent = t(TXT.confirm);
      warn.textContent = '';
    }

    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      sel = b.dataset.c;
      branch = null;
      reset();
      [...grid.children].forEach((c) => c.classList.toggle('sel', c === b));
      const def = CLASSES[sel];
      if (def.branches) {
        branchWrap.innerHTML = `<h2 style="margin-top:20px;font-size:12px">${t(TXT.branch)}</h2>
          <div class="branches">${def.branches.map((br) => `
            <button data-b="${br.id}"><b>${br.name}</b><small>${br.desc}</small></button>`).join('')}</div>`;
        go.disabled = true;    // a branch class is not chosen until the branch is
      } else {
        branchWrap.innerHTML = '';
        go.disabled = false;
      }
    });

    branchWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-b]');
      if (!b) return;
      branch = b.dataset.b;
      reset();
      [...b.parentElement.children].forEach((c) => c.classList.toggle('sel', c === b));
      go.disabled = false;
    });

    go.addEventListener('click', () => {
      if (!sel) return;
      // TWO STEPS. This is the only irreversible choice in the game and it is
      // one click away from a card you might have clicked to read.
      if (!armed) {
        armed = true;
        go.textContent = t(TXT.yes);
        warn.textContent = t(TXT.sure);
        return;
      }
      el.style.transition = 'opacity 0.4s';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); resolve({ cls: sel, branch }); }, 420);
    });
  });
}

/**
 * The skill tree.
 * @param api  { cls, level, tree }  tree is the createClassTree() handle
 * @param on   { onChange() }  called after any learn/slot so the caller can
 *             repaint the action bar and save
 */
export function showSkillTree(api, on = {}) {
  ensureStyle();
  const el = document.createElement('div');
  el.className = 'awk';
  document.body.appendChild(el);

  function paint() {
    const rows = api.tree.rows(api.cls(), api.level());
    const load = api.tree.state.loadout;
    const byTier = [0, 1, 2].map((tr) => rows.filter((r) => r.tier === tr));

    el.innerHTML = `
      <h2>${t(TXT.treeTitle)} — ${(CLASSES[api.cls()]?.name || '').toUpperCase()}</h2>
      <div class="sub">${t(TXT.hint)}</div>
      <div class="tree">
        <div class="pts">${t(TXT.points)}: <b>${api.tree.state.points}</b></div>
        <div class="tierhdr">${t(TXT.loadout)}<i></i></div>
        <div class="load">
          ${Array.from({ length: LOADOUT_SIZE }, (_, i) => {
            const id = load[i];
            return `<div class="sl"><b>${id && SKILLS[id] ? SKILLS[id].name : '—'}</b>${i + 1} · ${id ? '' : t(TXT.empty)}</div>`;
          }).join('')}
        </div>
        ${byTier.map((nodes, tr) => !nodes.length ? '' : `
          <div class="tierhdr">${t(TXT.tier)} ${tr + 1} · Lv${TIER_LEVEL[tr]}<i></i></div>
          ${nodes.map((n) => `
            <div class="node ${n.learned ? 'own' : ''} ${n.blocked && !n.learned ? 'lock' : ''}">
              <div class="ic" style="background-image:url(${skillIconUrl(n.id, n.def.icon)})"></div>
              <div class="info">
                <b>${n.def.name}</b>
                <small>${n.def.desc}</small>
              </div>
              ${n.learned
                ? `<div class="act">${Array.from({ length: LOADOUT_SIZE }, (_, k) => `
                    <button class="${load[k] === n.id ? 's2' : ''}" data-slot="${k}" data-id="${n.id}">${k + 1}</button>`).join('')}</div>`
                : (n.blocked
                  ? `<div class="why">${n.blocked}</div>`
                  : `<div class="act"><button data-learn="${n.id}">${t(TXT.learn)} · ${n.cost}</button></div>`)}
            </div>`).join('')}
        `).join('')}
      </div>
      <div class="row">
        ${on.onReset ? `<button class="respec" data-reset="1">RESET SKILL POINTS</button>` : ''}
        <button class="ghost close">${t(TXT.close)}</button>
      </div>`;
  }

  el.addEventListener('click', (e) => {
    // Two-step, same reasoning as the attribute reset: it undoes a build rather
    // than destroying anything, so it needs a confirmation but not a warning.
    const rb = e.target.closest('[data-reset]');
    if (rb) {
      if (rb.dataset.armed !== '1') {
        rb.dataset.armed = '1';
        rb.textContent = 'UNLEARN EVERYTHING?';
        setTimeout(() => {
          if (!rb.isConnected) return;
          rb.dataset.armed = '';
          rb.textContent = 'RESET SKILL POINTS';
        }, 4000);
        return;
      }
      on.onReset?.();
      paint();
      return;
    }
    const learn = e.target.closest('[data-learn]');
    if (learn) {
      if (api.tree.learn(api.cls(), learn.dataset.learn, api.level())) {
        on.onChange?.();
        paint();
      }
      return;
    }
    const slot = e.target.closest('[data-slot]');
    if (slot) {
      api.tree.equip(slot.dataset.id, Number(slot.dataset.slot));
      on.onChange?.();
      paint();
      return;
    }
    if (e.target.closest('.close')) {
      el.remove();
      on.onClose?.();
    }
  });

  paint();
  return { close: () => el.remove() };
}
