// THE CHARACTER SELECT.
//
// Three slots side by side, each either a hero or an empty plinth. It sits
// between the main menu and the world, and it is the only place a save can be
// deleted from — a delete button anywhere else would eventually be pressed by
// somebody who meant to press play.
//
// Each filled slot shows the things that actually distinguish one hero from
// another at a glance: name, class, level, and when it was last played. Not a
// stat block — you are choosing WHO to be, not comparing builds.

import { CLASSES } from '../systems/classes.js';
import { listSlots, MAX_SLOTS } from '../systems/profiles.js';
import { t } from './lang.js';

const TXT = {
  title: { en: 'CHOOSE YOUR HERO', id: 'PILIH PAHLAWANMU' },
  sub: { en: 'Three slots. Each one is a different life.', id: 'Tiga slot. Masing-masing satu kehidupan berbeda.' },
  empty: { en: 'EMPTY SLOT', id: 'SLOT KOSONG' },
  create: { en: '+ NEW HERO', id: '+ PAHLAWAN BARU' },
  play: { en: 'PLAY', id: 'MAIN' },
  del: { en: 'DELETE', id: 'HAPUS' },
  sure: { en: 'DELETE FOREVER?', id: 'HAPUS SELAMANYA?' },
  back: { en: 'BACK', id: 'KEMBALI' },
  lastPlayed: { en: 'last played', id: 'terakhir dimainkan' },
  never: { en: 'never played', id: 'belum pernah dimainkan' },
  lv: { en: 'Lv', id: 'Lv' },
};

function ago(ts) {
  if (!ts) return null;
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CSS = `
#charsel {
  position: fixed; inset: 0; z-index: 195;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; padding: 20px; overflow-y: auto;
  background: radial-gradient(circle at 50% 35%, #1a2420 0%, #080b09 72%);
  font-family: var(--font-body, sans-serif);
  animation: cs-in 0.35s ease-out;
}
@keyframes cs-in { from { opacity: 0; } }
#charsel h2 {
  font-family: var(--font-display, sans-serif); font-size: 17px; letter-spacing: 4px;
  color: #ffe9b0; margin: 0;
}
#charsel .sub { font-size: 10.5px; color: #9fb08c; margin-bottom: 4px; }
#charsel .slots {
  display: grid; grid-template-columns: repeat(${MAX_SLOTS}, minmax(0, 1fr));
  gap: 12px; width: min(760px, 96vw);
}
#charsel .slot {
  display: flex; flex-direction: column; gap: 8px; padding: 16px 14px; min-height: 190px;
  background: linear-gradient(180deg, rgba(28,36,28,0.95), rgba(16,22,16,0.95));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  text-align: center;
}
#charsel .slot.filled { box-shadow: inset 0 0 0 1px rgba(216,184,102,0.35); }
#charsel .slot .no { font-size: 8px; letter-spacing: 3px; color: #6a7860; }
#charsel .slot .nm {
  font-family: var(--font-display, sans-serif); font-size: 13px; color: #eaf2df;
  word-break: break-word;
}
#charsel .slot .cls { font-size: 10px; letter-spacing: 2px; }
#charsel .slot .lvl { font-size: 20px; color: #ffe9b0; font-family: var(--font-display, sans-serif); }
#charsel .slot .when { font-size: 8.5px; color: #7d8a70; }
#charsel .slot .spacer { flex: 1; }
#charsel .slot .mt { font-size: 10px; color: #5a6a55; letter-spacing: 2px; margin: auto 0; }
#charsel button {
  font-family: inherit; cursor: pointer; border: 0; padding: 9px 12px;
  font-size: 10px; letter-spacing: 2px;
}
#charsel .go { color: #10160f; background: #d8b866; box-shadow: 0 3px 0 #8a7038; }
#charsel .go:hover { filter: brightness(1.15); }
#charsel .new { color: #cfe8ff; background: rgba(30,52,72,0.9); box-shadow: inset 0 0 0 1px rgba(140,200,255,0.3); }
#charsel .del {
  color: #c08880; background: transparent; box-shadow: inset 0 0 0 1px rgba(200,90,80,0.35);
  font-size: 9px; padding: 6px;
}
#charsel .del:hover { color: #ffb0a0; }
#charsel .del.armed { color: #10160f; background: #e8574a; box-shadow: none; }
#charsel .ghost {
  color: #9fb08c; background: transparent; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
}
@media (max-width: 640px) {
  #charsel .slots { grid-template-columns: 1fr; }
  #charsel .slot { min-height: 0; }
}
`;

/**
 * @returns Promise<{ action: 'play'|'new'|'back', slot }>
 */
export function showCharacterSelect() {
  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'charsel';
    document.body.appendChild(el);

    function finish(res) {
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); style.remove(); resolve(res); }, 320);
    }

    function paint() {
      const slots = listSlots();
      el.innerHTML = `
        <h2>${t(TXT.title)}</h2>
        <div class="sub">${t(TXT.sub)}</div>
        <div class="slots">
          ${slots.map((s) => {
            if (s.empty) {
              return `<div class="slot" data-i="${s.i}">
                <div class="no">SLOT ${s.i + 1}</div>
                <div class="mt">${t(TXT.empty)}</div>
                <button class="new" data-act="new" data-i="${s.i}">${t(TXT.create)}</button>
              </div>`;
            }
            const c = CLASSES[s.cls] || CLASSES.origin;
            const when = ago(s.at);
            return `<div class="slot filled" data-i="${s.i}">
              <div class="no">SLOT ${s.i + 1}</div>
              <div class="nm"></div>
              <div class="cls" style="color:${c.color}">${c.name.toUpperCase()}</div>
              <div class="lvl">${t(TXT.lv)}${s.level}</div>
              <div class="when">${when ? `${t(TXT.lastPlayed)} ${when}` : t(TXT.never)}</div>
              <div class="spacer"></div>
              <button class="go" data-act="play" data-i="${s.i}">${t(TXT.play)}</button>
              <button class="del" data-act="del" data-i="${s.i}">${t(TXT.del)}</button>
            </div>`;
          }).join('')}
        </div>
        <button class="ghost" data-act="back">${t(TXT.back)}</button>`;

      // names go in with textContent — a hero name is player-typed
      slots.forEach((s) => {
        if (s.empty) return;
        const nm = el.querySelector(`.slot[data-i="${s.i}"] .nm`);
        if (nm) nm.textContent = s.name;
      });
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      const i = Number(b.dataset.i);

      if (act === 'back') { finish({ action: 'back' }); return; }
      if (act === 'play') { finish({ action: 'play', slot: i }); return; }
      if (act === 'new') { finish({ action: 'new', slot: i }); return; }
      if (act === 'del') {
        // two steps, like every other irreversible button in this game
        if (b.dataset.armed !== '1') {
          b.dataset.armed = '1';
          b.classList.add('armed');
          b.textContent = t(TXT.sure);
          setTimeout(() => {
            if (!b.isConnected) return;
            b.dataset.armed = '';
            b.classList.remove('armed');
            b.textContent = t(TXT.del);
          }, 4000);
          return;
        }
        // the caller owns deletion so the cloud copy can go with it
        finish({ action: 'delete', slot: i });
      }
    });

    paint();
  });
}
