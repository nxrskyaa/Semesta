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
  confTitle: { en: 'DELETE THIS HERO?', id: 'HAPUS PAHLAWAN INI?' },
  confBody: {
    en: 'This cannot be undone. The character, their level, everything they own and their cloud backup are all removed.',
    id: 'Ini tidak bisa dibatalkan. Karakter, levelnya, semua miliknya, dan cadangan cloud-nya ikut terhapus.',
  },
  confType: { en: 'Type the hero\'s name to confirm:', id: 'Ketik nama pahlawannya untuk konfirmasi:' },
  confKeep: { en: 'KEEP THEM', id: 'BATAL' },
  confGo: { en: 'DELETE', id: 'HAPUS' },
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
/* THE DELETE CONFIRMATION.
   The old version just relabelled the DELETE button in place, which on a phone
   is a second tap in the same 40 pixels — an impatient double-tap wiped a
   character. This is a separate surface, the safe choice is the big one, and
   the destructive one does not enable until the hero's name has been typed. */
#charsel .conf {
  position: fixed; inset: 0; z-index: 2; display: grid; place-items: center;
  background: rgba(4,6,5,0.86); padding: 18px;
}
#charsel .conf .box {
  width: min(420px, 94vw); padding: 22px 20px;
  background: linear-gradient(180deg, rgba(38,26,26,0.98), rgba(20,14,14,0.98));
  box-shadow: inset 0 0 0 2px #e8574a, inset 0 0 0 4px #0a0e0b;
  text-align: center;
}
#charsel .conf h3 {
  font-family: var(--font-display, sans-serif); font-size: 14px; letter-spacing: 2px;
  color: #ffb0a0; margin: 0 0 10px;
}
#charsel .conf p { font-size: 10.5px; color: #d8c4c0; line-height: 1.8; margin: 0 0 14px; }
#charsel .conf .who {
  font-family: var(--font-display, sans-serif); font-size: 15px; color: #ffe9b0; margin-bottom: 12px;
}
#charsel .conf label { display: block; font-size: 9.5px; color: #c0a8a4; margin-bottom: 6px; }
#charsel .conf input {
  width: 100%; box-sizing: border-box; font-family: inherit; font-size: 13px;
  padding: 9px 10px; margin-bottom: 14px; color: #eaf2df; text-align: center;
  background: rgba(8,10,8,0.9); border: 0; outline: 0;
  box-shadow: inset 0 0 0 1px rgba(232,87,74,0.5);
}
#charsel .conf .acts { display: flex; flex-direction: column; gap: 8px; }
#charsel .conf .keep {
  padding: 13px; font-size: 11px; letter-spacing: 2px;
  color: #10160f; background: #8ad86e; box-shadow: 0 3px 0 #4f8a3f;
}
#charsel .conf .go {
  padding: 11px; font-size: 10px; letter-spacing: 2px;
  color: #e8574a; background: transparent; box-shadow: inset 0 0 0 1px rgba(232,87,74,0.55);
}
#charsel .conf .go:disabled { opacity: 0.3; cursor: default; }
#charsel .conf .go:not(:disabled):hover { color: #10160f; background: #e8574a; }
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
      if (act === 'del') { askDelete(i); }
    });

    /**
     * Ask properly. A relabelled button is not a confirmation for something
     * that destroys hours of play — this is its own surface, the safe answer is
     * the big green one, and DELETE stays disabled until the player has typed
     * the hero's name. Typing it is the point: it is impossible to do by
     * accident and it forces you to look at who you are about to erase.
     */
    function askDelete(i) {
      const hero = listSlots()[i];
      if (!hero || hero.empty) return;

      const conf = document.createElement('div');
      conf.className = 'conf';
      conf.innerHTML = `
        <div class="box">
          <h3>${t(TXT.confTitle)}</h3>
          <div class="who"></div>
          <p>${t(TXT.confBody)}</p>
          <label>${t(TXT.confType)}</label>
          <input autocomplete="off" spellcheck="false">
          <div class="acts">
            <button class="keep">${t(TXT.confKeep)}</button>
            <button class="go" disabled>${t(TXT.confGo)}</button>
          </div>
        </div>`;
      el.appendChild(conf);
      // textContent: a hero name is player-typed
      conf.querySelector('.who').textContent = `${hero.name} · Lv${hero.level}`;

      const input = conf.querySelector('input');
      const go = conf.querySelector('.go');
      const match = () => input.value.trim().toLowerCase() === String(hero.name).trim().toLowerCase();
      input.addEventListener('input', () => { go.disabled = !match(); });
      input.focus();

      conf.querySelector('.keep').addEventListener('click', () => conf.remove());
      conf.addEventListener('click', (e) => { if (e.target === conf) conf.remove(); });
      go.addEventListener('click', () => {
        if (!match()) return;
        conf.remove();
        finish({ action: 'delete', slot: i });
      });
    }

    paint();
  });
}
