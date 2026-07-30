// The graphics settings panel — a pixel-bevel plate pinned to the RIGHT edge,
// so it never fights the menu buttons that own the left/centre.
//
// One component, two homes: it rides the loading/opening screen (where someone
// on a slow machine actually wants it) and the in-game ☰ menu. Live groups
// apply the instant they change; WORLD DETAIL is baked at build time, so it is
// tagged NEXT RUN rather than silently lying about having taken effect.
import {
  GROUPS, PRESETS, PRESET_LABEL, choiceOf, getPreset, isCustom, isAuto,
  setPreset, setOverride, onQualityChange, pendingAgainst,
} from '../gfx/quality.js';

const CSS = `
.gfxp {
  position: absolute; right: max(3%, 14px); top: 50%; transform: translateY(-50%);
  z-index: 40; width: min(300px, 44vw); min-width: 226px;
  font-family: var(--font-body, inherit); text-align: right;
  background:
    var(--dither, none) 0 0/4px 4px,
    linear-gradient(180deg, rgba(26,31,20,0.96), rgba(14,18,11,0.97));
  box-shadow: var(--pix-frame, 0 0 0 2px #46523c), inset 0 0 40px rgba(0,0,0,0.5);
  padding: 14px 15px 15px;
}
.gfxp h4 {
  margin: 0 0 3px; font-family: var(--font-display, inherit);
  font-size: 11px; letter-spacing: 3px; color: var(--gold, #d8b866);
  text-shadow: 0 0 10px rgba(216,184,102,0.35);
}
.gfxp .sub { font-size: 8px; letter-spacing: 1.4px; color: var(--muted, #93a084); line-height: 1.7; margin-bottom: 10px; }

/* preset row: four chunky pixel plates */
.gfxp .presets { display: flex; gap: 4px; margin-bottom: 11px; }
.gfxp .presets button {
  flex: 1; font-family: inherit; font-size: 8px; letter-spacing: 1px; cursor: pointer;
  padding: 8px 2px; border: 0; color: #aab5a0; background: #141a12;
  box-shadow: inset 0 0 0 2px #2c352c, inset 0 -2px 0 rgba(0,0,0,0.4);
}
.gfxp .presets button.on {
  color: #ffe9b0; background: #2c2a16;
  box-shadow: inset 0 0 0 2px var(--gold, #d8b866), inset 0 2px 0 rgba(255,230,160,0.14);
}
.gfxp .presets button:hover:not(.on) { box-shadow: inset 0 0 0 2px #5a6a4a; color: #dce5cc; }

.gfxp .grp { margin-bottom: 9px; }
.gfxp .glabel {
  font-size: 8px; letter-spacing: 2px; color: #b9a76a; margin-bottom: 4px;
  display: flex; align-items: center; justify-content: flex-end; gap: 6px;
}
.gfxp .glabel .tag {
  font-size: 6.5px; letter-spacing: 1px; color: #ffc98a; padding: 1px 4px;
  background: rgba(216,184,102,0.16); box-shadow: inset 0 0 0 1px rgba(216,184,102,0.45);
}
.gfxp .opts { display: flex; gap: 3px; justify-content: flex-end; }
.gfxp .opts button {
  flex: 1; font-family: inherit; font-size: 7.5px; letter-spacing: 0.8px; cursor: pointer;
  padding: 7px 1px; border: 0; color: #9aa890; background: #131a12;
  box-shadow: inset 0 0 0 2px #262f24;
}
.gfxp .opts button.on {
  color: #eaffd8; background: #23301c;
  box-shadow: inset 0 0 0 2px #8ac86a, inset 0 1px 0 rgba(220,255,200,0.2);
}
.gfxp .opts button:hover:not(.on) { box-shadow: inset 0 0 0 2px #4a5a42; }
.gfxp .hint {
  font-size: 7.5px; letter-spacing: 0.6px; color: #8d9a80; line-height: 1.8;
  min-height: 13px; margin-top: 8px; padding-top: 8px;
  border-top: 1px solid rgba(150,166,120,0.25);
}
.gfxp .closebtn {
  width: 100%; margin-top: 10px; font-family: var(--font-display, inherit);
  font-size: 9px; letter-spacing: 2.5px; cursor: pointer; padding: 10px 4px; border: 0;
  color: #ffe9b0; background: linear-gradient(180deg, #6a5430, #46381e);
  box-shadow: 0 -2px 0 0 #c8a03a, 0 2px 0 0 #2a2210, -2px 0 0 0 #8a744a, 2px 0 0 0 #8a744a;
}
.gfxp .closebtn:hover { filter: brightness(1.18); }

/* collapsible mode (the opening screen): a small right-edge tab that expands.
   On a phone the menu buttons own the middle of the screen, so the panel has
   to fold away instead of sitting on top of NEW ADVENTURE. */
.gfxp .gtoggle {
  display: none; width: 100%; font-family: var(--font-display, inherit);
  font-size: 9px; letter-spacing: 2px; cursor: pointer; padding: 9px 6px; border: 0;
  color: var(--gold, #d8b866); background: #1a2114;
  box-shadow: inset 0 0 0 2px #3c4a34, inset 0 -2px 0 rgba(0,0,0,0.4);
  text-align: right;
}
.gfxp .gtoggle:hover { color: #ffe9b0; filter: brightness(1.15); }
.gfxp.collapsible .gtoggle { display: block; }
.gfxp.collapsible.folded { width: auto; min-width: 0; padding: 0; box-shadow: none; background: none; }
.gfxp.collapsible.folded .gtoggle {
  box-shadow: var(--pix-frame, 0 0 0 2px #46523c); background: linear-gradient(180deg, #2a3522, #1a2215);
  white-space: nowrap;
}
.gfxp.folded .gbody { display: none; }
.gfxp.collapsible:not(.folded) .gbody { margin-top: 10px; }

/* A narrow screen gets a tighter panel, but it STAYS pinned right — the rest
   of the screen belongs to the menu. */
@media (max-width: 900px), (max-height: 560px) {
  .gfxp {
    right: 8px; left: auto; width: min(240px, 60vw); min-width: 0;
    max-height: 88vh; overflow-y: auto; padding: 10px 11px 11px;
  }
  .gfxp h4 { font-size: 10px; letter-spacing: 2px; }
  .gfxp .grp { margin-bottom: 6px; }
  .gfxp .opts button { padding: 8px 1px; }  /* keep the tap target honest */
  /* expanded on a phone: hug the top-right so it can't cover the menu column */
  .gfxp.collapsible:not(.folded) { top: 8px; transform: none; }
}
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Builds the panel element.
 *
 * @param builtWith snapshot from quality.buildSnapshot() for the running world,
 *                  or null before one exists — drives the NEXT RUN tags
 * @param onClose   if given, renders a dismiss button with this label/handler
 */
export function createGfxPanel({
  builtWith = null, onClose = null, closeLabel = 'CLOSE', sfx = null,
  title = true, collapsible = false,
} = {}) {
  injectCss();
  const root = document.createElement('div');
  root.className = `gfxp${collapsible ? ' collapsible' : ''}`;
  // a phone opens folded (the menu column needs the room); a desktop opens wide
  let folded = collapsible && (innerWidth <= 900 || innerHeight <= 560);
  if (folded) root.classList.add('folded');

  let hoverHint = '';

  function render() {
    const pending = new Set(pendingAgainst(builtWith));
    const preset = getPreset();
    const custom = isCustom();

    root.innerHTML = `
      ${collapsible ? `<button class="gtoggle">${folded ? '⚙' : '✕'} GRAPHICS &middot; ${PRESET_LABEL[preset]}${custom ? '*' : ''}</button>` : ''}
      <div class="gbody">
      ${title ? '<h4>GRAPHICS</h4>' : ''}
      <div class="sub">${custom
        ? `CUSTOM &middot; BASED ON ${PRESET_LABEL[preset]}`
        : (isAuto() ? `${PRESET_LABEL[preset]} &middot; PICKED FOR THIS DEVICE` : PRESET_LABEL[preset])}</div>
      <div class="presets">
        ${PRESETS.map((p) => `<button data-preset="${p}" class="${!custom && p === preset ? 'on' : ''}">${PRESET_LABEL[p]}</button>`).join('')}
      </div>
      ${GROUPS.map((g) => {
        const cur = choiceOf(g.id);
        return `<div class="grp">
          <div class="glabel">${pending.has(g.id) ? '<span class="tag">NEXT RUN</span>' : ''}${g.label}</div>
          <div class="opts">
            ${g.options.map((o) => `<button data-g="${g.id}" data-v="${o.v}" data-hint="${g.hint}" class="${o.v === cur ? 'on' : ''}">${o.label}</button>`).join('')}
          </div>
        </div>`;
      }).join('')}
      <div class="hint">${hoverHint || 'Drop RESOLUTION and turn SHADOWS off first — those two carry the most cost.'}</div>
      ${onClose ? `<button class="closebtn">${closeLabel}</button>` : ''}
      </div>
    `;

    root.querySelector('.gtoggle')?.addEventListener('click', () => {
      sfx?.('ui');
      folded = !folded;
      root.classList.toggle('folded', folded);
      render();
    });
    root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
      sfx?.('ui');
      setPreset(b.dataset.preset);
    }));
    root.querySelectorAll('[data-g]').forEach((b) => {
      b.addEventListener('click', () => {
        sfx?.('ui');
        setOverride(b.dataset.g, b.dataset.v);
      });
      // the hint line explains what a row actually costs, on hover or touch
      const show = () => {
        hoverHint = b.dataset.hint;
        const h = root.querySelector('.hint');
        if (h) h.textContent = hoverHint;
      };
      b.addEventListener('pointerenter', show);
      b.addEventListener('pointerdown', show);
    });
    root.querySelector('.closebtn')?.addEventListener('click', () => { sfx?.('ui'); onClose(); });
  }

  render();
  // any change (including one made from another instance of this panel) re-renders
  const off = onQualityChange(() => render());

  return {
    el: root,
    /** Point the NEXT RUN tags at a freshly built world. */
    setBuiltWith(snap) { builtWith = snap; render(); },
    dispose() { off(); root.remove(); },
  };
}
