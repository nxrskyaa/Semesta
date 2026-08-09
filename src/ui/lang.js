// LANGUAGE.
//
// Two languages, English by default. The pick is offered ONCE, on the way into
// a new character's prologue, because that is the first moment the game asks
// the player to read something long — offering it earlier, on a menu of six
// words, would be a decision with nothing riding on it.
//
// Deliberately NOT a full i18n framework. The game's UI is a few dozen chunky
// pixel labels and the strings that actually matter are the long ones: the
// prologue, the story chapters, the guide. A table of keys and a `t()` covers
// it, and pulling in a library to do that would be more code than the strings.
//
// The choice is remembered per browser, not per character, because a player's
// language is a fact about the player.

const KEY = 'semesta.lang.v1';

export const LANGUAGES = {
  en: { id: 'en', name: 'English', native: 'English', flag: 'EN' },
  id: { id: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: 'ID' },
};

let current = 'en';
try {
  const saved = localStorage.getItem(KEY);
  if (saved && LANGUAGES[saved]) current = saved;
} catch { /* private mode: English it is */ }

export function getLang() { return current; }
export function setLang(id) {
  if (!LANGUAGES[id]) return;
  current = id;
  try { localStorage.setItem(KEY, id); } catch { /* nothing to do */ }
}
export function hasPickedLang() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

/**
 * Look a string up. Values are `{ en, id }` pairs; a missing translation falls
 * back to English rather than showing a raw key, because a key on screen is
 * always worse than the wrong language.
 */
export function t(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry) return '';
  return entry[current] ?? entry.en ?? '';
}

const CSS = `
#langpick {
  position: fixed; inset: 0; z-index: 210;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 40%, #16201a 0%, #0a0e0b 70%);
  font-family: var(--font-body, sans-serif);
  animation: lp-in 0.4s ease-out;
}
@keyframes lp-in { from { opacity: 0; } }
#langpick .card {
  width: min(520px, 88vw); padding: 30px 26px 26px;
  background: rgba(14, 20, 15, 0.96);
  box-shadow: inset 0 0 0 2px #d8b866, inset 0 0 0 4px #0a0e0b, 0 20px 60px rgba(0,0,0,0.6);
  text-align: center;
}
#langpick .glyph { font-size: 30px; margin-bottom: 12px; }
#langpick h2 {
  font-family: var(--font-display, sans-serif);
  font-size: 17px; letter-spacing: 3px; color: #ffe9b0; margin: 0 0 6px;
}
#langpick .sub { font-size: 11px; color: #9fb08c; line-height: 1.7; margin-bottom: 22px; }
#langpick .opts { display: flex; flex-direction: column; gap: 10px; }
#langpick button {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 14px 16px; cursor: pointer; border: 0;
  font-family: inherit; font-size: 13px; color: #eaf2df; text-align: left;
  background: linear-gradient(180deg, rgba(34,44,34,0.95), rgba(22,30,22,0.95));
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.35);
  transition: filter 0.12s;
}
#langpick button:hover { filter: brightness(1.35); }
#langpick button .tag {
  font-family: var(--font-display, sans-serif); font-size: 12px; letter-spacing: 1px;
  color: #10160f; background: #d8b866; padding: 5px 8px; min-width: 34px; text-align: center;
}
#langpick button .nm { flex: 1; }
#langpick button .nm small { display: block; font-size: 9px; color: #9fb08c; margin-top: 3px; }
#langpick button.def .tag { background: #8ad86e; }
`;

/**
 * Show the picker and resolve with the chosen language id.
 * If the player has already chosen once, this resolves immediately — nobody
 * wants to be asked their language every time they make a character.
 */
export function pickLanguage({ force = false } = {}) {
  if (!force && hasPickedLang()) return Promise.resolve(current);

  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'langpick';
    el.innerHTML = `
      <div class="card">
        <div class="glyph">✦</div>
        <h2>CHOOSE YOUR LANGUAGE</h2>
        <div class="sub">
          Pilih bahasa untuk cerita dan panduan.<br>
          You can change this later in the menu.
        </div>
        <div class="opts">
          <button data-l="en" class="def">
            <span class="tag">EN</span>
            <span class="nm">English<small>Recommended — the default</small></span>
          </button>
          <button data-l="id">
            <span class="tag">ID</span>
            <span class="nm">Bahasa Indonesia<small>Cerita &amp; panduan dalam Bahasa Indonesia</small></span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-l]');
      if (!b) return;
      setLang(b.dataset.l);
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); style.remove(); }, 320);
      resolve(current);
    });
  });
}
