// THE INDEX PANEL — the collection log, rendered.
//
// The layout is doing one job: make the EMPTY slots interesting. A grid of
// things you already own is a receipt; a grid where two thirds of the cells are
// dark, numbered and hinted is a to-do list you gave yourself.
//
// So an unfound entry is not hidden and it is not blank. It shows a dark cell
// with a "?" over a rarity-tinted frame, keeps the rarity colour (so you can
// see at a glance that there is a mythic fish out there somewhere), and carries
// its hint — "Out at sea, after dark" — as the row's subtitle. The name is the
// only thing withheld, because the name is the prize.
import { itemIconUrl } from '../gfx/textures.js';
import { RARITY } from '../systems/items.js';

const CSS = `
.idx { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.idx .sum {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: rgba(216,184,102,0.08); border: 1px solid var(--gold-dim);
}
.idx .sum b { color: var(--gold); font-size: 15px; }
.idx .sum small { color: var(--muted); letter-spacing: 1px; }
.idx .sum .barwrap { flex: 1; height: 8px; background: #222a1e; box-shadow: inset 0 0 0 1px #131a10; }
.idx .sum .barwrap i { display: block; height: 100%; background: var(--gold); }

.idx .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
.idx .tabs button {
  font: inherit; font-size: 9px; letter-spacing: 1px; padding: 5px 8px; cursor: pointer;
  color: #a8b49c; background: #1d241a; border: 1px solid #2f3a29;
}
.idx .tabs button.on { color: #12160f; background: var(--gold); border-color: var(--gold); }
.idx .tabs button i { font-style: normal; opacity: 0.7; margin-left: 4px; }
.idx .tabs button.done::after { content: ' ✓'; color: #8ad86e; }
.idx .tabs button.on.done::after { color: #12160f; }

.idx .blurb { font-size: 10px; color: var(--muted); line-height: 1.7; }
.idx .claim {
  width: 100%; padding: 8px; font: inherit; font-size: 11px; letter-spacing: 2px; cursor: pointer;
  color: #12160f; background: var(--gold); border: 0;
}
.idx .claim[disabled] { opacity: 0.45; cursor: default; }

.idx .grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 6px; overflow-y: auto; padding-right: 4px;
}
.idx .cell {
  display: flex; gap: 8px; align-items: center; padding: 6px 8px;
  background: #161c13; border: 1px solid #262f21;
}
.idx .cell.found { background: #1b2317; }
.idx .cell .ic {
  width: 34px; height: 34px; flex: 0 0 34px; image-rendering: pixelated;
  display: flex; align-items: center; justify-content: center;
  background: #10140d; box-shadow: inset 0 0 0 1px currentColor;
  font-size: 17px;
}
.idx .cell .ic img { width: 30px; height: 30px; image-rendering: pixelated; }
/* an unfound icon is the real art, blacked out — a silhouette, not a blank */
.idx .cell:not(.found) .ic img { filter: brightness(0) opacity(0.42); }
.idx .cell .nm { min-width: 0; }
.idx .cell .nm b { display: block; font-size: 10px; letter-spacing: 0.5px; }
.idx .cell .nm small {
  display: block; font-size: 8.5px; color: #8b9781; letter-spacing: 0.5px;
  margin-top: 2px; line-height: 1.5;
}
.idx .cell:not(.found) .nm b { color: #6c7763; letter-spacing: 3px; }
@media (max-width: 560px) {
  .idx .grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
}
`;

/**
 * @param host the panel element to render into.
 * @param index the createIndex() instance.
 * @param audio for the claim sting.
 */
export function createIndexPanel(host, index, audio) {
  if (!document.getElementById('idx-css')) {
    const s = document.createElement('style');
    s.id = 'idx-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  let tab = index.cats[0]?.id || 'fish';

  function render() {
    const all = index.overall();
    const cat = index.cats.find((c) => c.id === tab) || index.cats[0];
    const p = index.progress(cat.id);
    const complete = p.have >= p.total && p.total > 0;
    const claimed = index.isClaimed(cat.id);

    const tabs = index.cats.map((c) => {
      const cp = index.progress(c.id);
      const full = cp.have >= cp.total && cp.total > 0;
      return `<button data-tab="${c.id}" class="${c.id === tab ? 'on' : ''} ${full ? 'done' : ''}">
        ${c.glyph} ${c.name}<i>${cp.have}/${cp.total}</i></button>`;
    }).join('');

    const cells = index.rows(cat.id).map((e) => {
      const col = RARITY[e.rarity]?.color || '#c8c2b0';
      const art = e.icon
        ? `<img src="${itemIconUrl(e.icon)}" alt="">`
        : (e.found ? cat.glyph : '?');
      return `<div class="cell ${e.found ? 'found' : ''}">
        <div class="ic" style="color:${e.found ? col : '#2f3a29'}">${art}</div>
        <div class="nm">
          <b style="${e.found ? `color:${col}` : ''}">${e.found ? e.name : '???'}</b>
          <small>${e.found ? (RARITY[e.rarity]?.name || e.rarity || '') : e.hint}</small>
        </div>
      </div>`;
    }).join('');

    const reward = complete && !claimed
      ? `<button class="claim" data-claim="${cat.id}">CLAIM — ${cat.name} COMPLETE</button>`
      : complete
        ? `<div class="blurb" style="color:#8ad86e">✓ Complete, and claimed.</div>`
        : '';

    host.innerHTML = `<h3>THE INDEX <small>[Esc] close</small></h3>
      <div class="idx">
        <div class="sum">
          <b>${all.have}/${all.total}</b>
          <div class="barwrap"><i style="width:${(all.pct * 100).toFixed(1)}%"></i></div>
          <small>${Math.round(all.pct * 100)}% LOGGED</small>
        </div>
        <div class="tabs">${tabs}</div>
        <div class="blurb">${cat.blurb}</div>
        ${reward}
        <div class="grid">${cells}</div>
      </div>`;

    host.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => { tab = b.dataset.tab; audio?.sfx?.('ui'); render(); });
    });
    host.querySelector('[data-claim]')?.addEventListener('click', (e) => {
      const r = index.claim(e.currentTarget.dataset.claim);
      if (r) audio?.sfx?.('quest_done');
      render();
    });
  }

  return { render, show: (cat) => { if (cat) tab = cat; render(); } };
}
