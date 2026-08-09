// THE STATS PANEL.
//
// Four rows, a big point counter, and a derived summary at the bottom so you
// can see what the build actually adds up to rather than having to trust the
// per-point text.
//
// The + button is the only control. There is no respec and no confirm dialog:
// a single point is a small enough commitment that asking "are you sure" for
// each one would be noise, and the cost of a wrong point is one level of
// patience rather than a ruined character.

import { ATTR_ORDER, POINTS_PER_LEVEL } from '../systems/stats.js';
import { t } from './lang.js';

const TXT = {
  title: { en: 'CHARACTER STATS', id: 'STATUS KARAKTER' },
  points: { en: 'POINTS TO SPEND', id: 'POIN TERSEDIA' },
  none: { en: 'No points left — level up for more.', id: 'Poin habis — naik level untuk tambahan.' },
  hint: {
    en: `${POINTS_PER_LEVEL} points every level. There is no respec, so spend them on what you actually play.`,
    id: `${POINTS_PER_LEVEL} poin setiap level. Tidak ada respec, jadi pakailah sesuai gaya mainmu.`,
  },
  totals: { en: 'WHAT YOUR BUILD ADDS UP TO', id: 'HASIL TOTAL BUILD-MU' },
  close: { en: 'CLOSE', id: 'TUTUP' },
  cap: { en: 'MAX', id: 'MAKS' },
};

const CSS = `
#statspanel {
  position: fixed; inset: 0; z-index: 190;
  display: flex; align-items: center; justify-content: center; padding: 18px;
  background: radial-gradient(circle at 50% 35%, rgba(24,30,24,0.96), rgba(6,9,7,0.98));
  font-family: var(--font-body, sans-serif); overflow-y: auto;
  animation: sp-in 0.3s ease-out;
}
@keyframes sp-in { from { opacity: 0; } }
#statspanel .card {
  width: min(560px, 96vw);
  background: linear-gradient(180deg, rgba(28,36,28,0.96), rgba(16,22,16,0.96));
  box-shadow: inset 0 0 0 2px #d8b866, inset 0 0 0 4px #0a0e0b, 0 20px 60px rgba(0,0,0,0.6);
  padding: 22px 20px 18px;
}
#statspanel h2 {
  font-family: var(--font-display, sans-serif); font-size: 15px; letter-spacing: 3px;
  color: #ffe9b0; margin: 0 0 4px; text-align: center;
}
#statspanel .hint { font-size: 9.5px; color: #9fb08c; text-align: center; line-height: 1.7; margin-bottom: 14px; }
#statspanel .pts {
  text-align: center; margin-bottom: 14px; padding: 9px;
  background: rgba(10,14,10,0.55); box-shadow: inset 0 0 0 1px rgba(216,184,102,0.3);
}
#statspanel .pts b {
  display: block; font-family: var(--font-display, sans-serif);
  font-size: 26px; color: #ffe9b0; font-weight: normal;
}
#statspanel .pts span { font-size: 8.5px; letter-spacing: 3px; color: #9fb08c; }
#statspanel .row {
  display: flex; align-items: center; gap: 11px; padding: 10px 11px; margin-bottom: 7px;
  background: rgba(20,26,20,0.9); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
}
#statspanel .row .tag {
  width: 42px; flex: none; text-align: center; font-family: var(--font-display, sans-serif);
  font-size: 10px; letter-spacing: 1px; padding: 5px 0; color: #10160f;
}
#statspanel .row .info { flex: 1; min-width: 0; }
#statspanel .row .info b { font-size: 11.5px; color: #eaf2df; font-weight: normal; }
#statspanel .row .info small { display: block; font-size: 9px; color: #9fb08c; line-height: 1.6; margin-top: 2px; }
#statspanel .row .info em { font-style: normal; color: #d8b866; }
#statspanel .row .val {
  font-family: var(--font-display, sans-serif); font-size: 17px; color: #ffe9b0;
  min-width: 34px; text-align: right;
}
#statspanel .row button {
  flex: none; width: 34px; height: 34px; border: 0; cursor: pointer;
  font-family: inherit; font-size: 17px; color: #10160f; background: #d8b866;
}
#statspanel .row button:disabled { opacity: 0.22; cursor: default; }
#statspanel .tot {
  margin-top: 14px; padding: 11px; background: rgba(10,14,10,0.5);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
}
#statspanel .tot h3 {
  font-family: var(--font-display, sans-serif); font-size: 9px; letter-spacing: 2px;
  color: #b8a86a; margin: 0 0 8px;
}
#statspanel .tot .g { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 14px; }
#statspanel .tot .g div { display: flex; justify-content: space-between; font-size: 10px; color: #9fb08c; }
#statspanel .tot .g div b { color: #eaf2df; font-weight: normal; }
#statspanel .close {
  display: block; width: 100%; margin-top: 14px; padding: 11px; border: 0; cursor: pointer;
  font-family: inherit; font-size: 10px; letter-spacing: 2px;
  color: #9fb08c; background: transparent; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
}
#statspanel .close:hover { color: #eaf2df; }
`;

let styled = false;

/**
 * @param stats the createStats() handle
 * @param on    { onChange() } called after every point so the caller can
 *              re-apply the pools and save
 */
export function showStats(stats, on = {}) {
  if (!styled) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    styled = true;
  }
  // never stack two of them
  document.getElementById('statspanel')?.remove();

  const el = document.createElement('div');
  el.id = 'statspanel';
  document.body.appendChild(el);

  function paint() {
    const rows = stats.rows();
    el.innerHTML = `
      <div class="card">
        <h2>${t(TXT.title)}</h2>
        <div class="hint">${t(TXT.hint)}</div>
        <div class="pts">
          <b>${stats.state.points}</b>
          <span>${stats.state.points ? t(TXT.points) : t(TXT.none)}</span>
        </div>
        ${rows.map((r) => `
          <div class="row">
            <span class="tag" style="background:${r.color}">${r.short}</span>
            <span class="info">
              <b>${r.name}</b>
              <small>${r.desc}<br><em>${r.per}</em> per point</small>
            </span>
            <span class="val">${r.value}${r.capped ? ` ${t(TXT.cap)}` : ''}</span>
            <button data-a="${r.id}" ${r.canBuy ? '' : 'disabled'}>+</button>
          </div>`).join('')}
        <div class="tot">
          <h3>${t(TXT.totals)}</h3>
          <div class="g">
            ${stats.summary().map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}
          </div>
        </div>
        <button class="close">${t(TXT.close)}</button>
      </div>`;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (b) {
      if (stats.spend(b.dataset.a, 1)) { on.onChange?.(); paint(); }
      return;
    }
    if (e.target.closest('.close') || e.target === el) el.remove();
  });

  paint();
  return { close: () => el.remove() };
}
