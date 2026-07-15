// NPC dialog box (bottom center) with quest offer / progress / turn-in actions.
import { ITEMS } from '../systems/items.js';
import { itemIconUrl } from '../gfx/textures.js';

const CSS = `
#dialog {
  position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%);
  width: min(560px, calc(100vw - 36px)); z-index: 40; display: none;
  background:
    var(--dither) 0 0/4px 4px,
    linear-gradient(180deg, var(--panel-1), var(--panel-2));
  border: 0;
  box-shadow: var(--pix-frame);
  padding: 14px 18px; pointer-events: auto;
}
#dialog.show { display: block; animation: dlg-in 0.15s; }
@keyframes dlg-in { from { transform: translateX(-50%) translateY(8px); opacity: 0; } }
#dialog .who { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
#dialog .who .nm { font-size: 15px; color: #ffe9a8; letter-spacing: 1px; }
#dialog .who .role { font-size: 10px; color: #8fa584; letter-spacing: 2px; }
#dialog .txt { font-size: 12px; color: #dde5d5; line-height: 1.75; min-height: 40px; }
#dialog .quest-tag {
  display: inline-block; font-size: 10px; letter-spacing: 2px; padding: 2px 8px;
  border: 1px solid #c8a03a; color: #ffd23e; margin-bottom: 7px;
}
#dialog .objective { font-size: 11px; color: #b8d89a; margin-top: 7px; }
#dialog .rewards { display: flex; gap: 10px; align-items: center; margin-top: 8px; font-size: 11px; color: #cfd8c8; }
#dialog .rewards img { width: 16px; height: 16px; image-rendering: pixelated; vertical-align: -3px; }
#dialog .rewards .xp { color: #9fe86e; }
#dialog .btns { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
#dialog button {
  font-family: inherit; font-size: 12px; padding: 8px 18px; cursor: pointer;
  background: linear-gradient(180deg, #2a3522, #1a2215); color: #c2cbb0;
  border: 0; box-shadow: var(--pix-btn); letter-spacing: 1px; margin: 2px;
}
#dialog button.primary {
  background: linear-gradient(180deg, #57452a, #3a2e18); color: #ffe9b0;
  box-shadow:
    0 -2px 0 0 #8a744a, 0 2px 0 0 #241c0a,
    -2px 0 0 0 #5a4a2a, 2px 0 0 0 #5a4a2a,
    0 0 0 3px var(--ink) inset;
  text-shadow: 0 1px 0 #241c0a;
}
#dialog button:hover { filter: brightness(1.2); }
#dialog button:active { transform: translateY(2px); }
`;

export function createDialog(audio) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'dialog';
  document.body.appendChild(root);

  let onCloseCb = null;
  let open = false;

  function rewardsHtml(reward) {
    if (!reward) return '';
    let h = `<span class="xp">+${reward.xp} XP</span>`;
    for (const it of reward.items || []) {
      h += `<span><img src="${itemIconUrl(it.id)}"> ${ITEMS[it.id].name}${it.count > 1 ? ` x${it.count}` : ''}</span>`;
    }
    return `<div class="rewards">Reward: ${h}</div>`;
  }

  // opts: { name, role, text, quest?, mode?: 'offer'|'progress'|'turnin',
  //         progress?, onAccept?, onTurnIn?, onClose? }
  function show(opts) {
    open = true;
    onCloseCb = opts.onClose || null;
    const q = opts.quest;
    let inner = `
      <div class="who"><span class="nm">${opts.name}</span><span class="role">${(opts.role || '').toUpperCase()}</span></div>
    `;
    if (q && opts.mode === 'offer') {
      inner += `<div class="quest-tag">NEW QUEST — ${q.name.toUpperCase()}</div>
        <div class="txt">${opts.text}</div>
        <div class="objective">◆ ${q.objective.label}</div>
        ${rewardsHtml(q.reward)}
        <div class="btns"><button data-a="close">LATER</button><button class="primary" data-a="accept">ACCEPT QUEST</button></div>`;
    } else if (q && opts.mode === 'turnin') {
      inner += `<div class="quest-tag">QUEST COMPLETE — ${q.name.toUpperCase()}</div>
        <div class="txt">${opts.text}</div>
        ${rewardsHtml(q.reward)}
        <div class="btns"><button class="primary" data-a="turnin">CLAIM REWARD</button></div>`;
    } else if (q && opts.mode === 'progress') {
      inner += `<div class="quest-tag">IN PROGRESS — ${q.name.toUpperCase()}</div>
        <div class="txt">${opts.text}</div>
        <div class="objective">◆ ${q.objective.label} — ${opts.progress}/${q.objective.n}</div>
        <div class="btns"><button class="primary" data-a="close">OK</button></div>`;
    } else {
      const extraBtn = opts.extra ? `<button class="primary" data-a="extra">${opts.extra.label}</button>` : '';
      inner += `<div class="txt">${opts.text}</div>
        <div class="btns"><button data-a="close">CLOSE</button>${extraBtn}</div>`;
    }
    root.innerHTML = inner;
    root.classList.add('show');

    root.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const a = b.dataset.a;
        audio.sfx('ui');
        if (a === 'accept') { opts.onAccept?.(); hide(); }
        else if (a === 'turnin') { opts.onTurnIn?.(); hide(); }
        else if (a === 'extra') { hide(); opts.extra?.onClick?.(); }
        else hide();
      });
    });
  }

  function hide() {
    if (!open) return;
    open = false;
    root.classList.remove('show');
    onCloseCb?.();
  }

  return { show, hide, isOpen: () => open };
}
