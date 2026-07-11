// Touch controls — clean & compact: dynamic joystick on the left, tight action
// cluster bottom-right, contextual interact button, camera swipe zone that
// stays out of the way. Sized/spaced so it never smothers the view.
import { SKILLS } from '../systems/skills.js';
import { skillIconUrl, itemIconUrl } from '../gfx/textures.js';

const CSS = `
#touchui { position: fixed; inset: 0; pointer-events: none; z-index: 20; }

/* joystick: left 42% of the screen, lower 60% */
#touchui .joyzone { position: absolute; left: 0; bottom: 0; width: 42%; height: 60%; pointer-events: auto; }
#touchui .joy {
  position: absolute; width: 96px; height: 96px; border-radius: 50%;
  border: 2px solid rgba(200,220,190,0.28); background: rgba(16,22,14,0.25);
  display: none; transform: translate(-50%, -50%);
}
#touchui .joy .nub {
  position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; border-radius: 50%;
  background: rgba(200,220,190,0.45); border: 2px solid rgba(240,245,230,0.5);
  transform: translate(-50%, -50%);
}

/* camera swipe: right side, middle band (below minimap, above buttons) */
#touchui .camzone { position: absolute; right: 0; top: 24%; width: 55%; height: 30%; pointer-events: auto; }

/* action cluster bottom-right */
#touchui .btns {
  position: absolute; right: 10px; bottom: 14px; pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
#touchui .abtn {
  position: absolute; border-radius: 50%; border: 2px solid rgba(200,220,190,0.35);
  background: rgba(16,22,14,0.5) center/56% no-repeat; image-rendering: pixelated;
  display: flex; align-items: center; justify-content: center;
  color: #dce5d5; font-family: inherit; text-shadow: 1px 1px 0 #000;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  pointer-events: auto;
}
#touchui .abtn:active { background-color: rgba(110,140,90,0.55); border-color: rgba(220,240,200,0.7); }
#touchui .abtn .cdo { position: absolute; inset: -2px; border-radius: 50%; display: none; }
#touchui .abtn.oncd .cdo { display: block; }

#touchui .attack { width: 74px; height: 74px; right: 4px; bottom: 4px; font-size: 27px;
  border-color: rgba(230,200,140,0.5); }
#touchui .roll { width: 50px; height: 50px; right: 86px; bottom: 0; font-size: 18px; }
#touchui .jump { width: 46px; height: 46px; right: 140px; bottom: 52px; font-size: 17px; }
#touchui .sk { width: 46px; height: 46px; }
#touchui .sk1 { right: 92px; bottom: 58px; }
#touchui .sk2 { right: 62px; bottom: 104px; }
#touchui .sk3 { right: 6px; bottom: 122px; }
#touchui .pot { width: 42px; height: 42px; right: 142px; bottom: 4px; }
#touchui .pot .cnt { position: absolute; bottom: -1px; right: 3px; font-size: 10px; }

/* contextual interact button (talk / chest / fish) */
#touchui .ctx {
  position: absolute; right: 148px; bottom: 64px; width: 54px; height: 54px;
  border-radius: 50%; border: 2px solid #d8b85a; background: rgba(40,34,14,0.7);
  color: #ffe9a8; font-size: 21px; display: none; align-items: center; justify-content: center;
  pointer-events: auto; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow: 0 0 12px #c8a03a55;
}
#touchui .ctx.show { display: flex; animation: ctx-in 0.15s; }
#touchui .ctx:active { background: rgba(90,74,30,0.85); }
#touchui .ctx .lbl {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  font-size: 8px; color: #ffe9a8; white-space: nowrap; letter-spacing: 1px;
  text-shadow: 1px 1px 0 #000;
}
@keyframes ctx-in { from { transform: scale(0.7); opacity: 0; } }
`;

export function isTouchDevice() {
  return 'ontouchstart' in window && matchMedia('(pointer: coarse)').matches;
}

export function createTouchControls(input, skillIds, callbacks) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'touchui';
  root.innerHTML = `
    <div class="joyzone"></div>
    <div class="camzone"></div>
    <div class="joy"><div class="nub"></div></div>
    <div class="btns">
      <button class="abtn attack">⚔</button>
      <button class="abtn roll">↺</button>
      <button class="abtn jump">⤒</button>
      ${skillIds.map((s, i) => `<button class="abtn sk sk${i + 1}" data-skill="${s}"
        style="background-image:url(${skillIconUrl(s, SKILLS[s].icon)})"><span class="cdo"></span></button>`).join('')}
      <button class="abtn pot" style="background-image:url(${itemIconUrl('tonic')})"><span class="cnt">0</span></button>
      <button class="ctx"><span class="ic">★</span><span class="lbl"></span></button>
    </div>
  `;
  document.body.appendChild(root);

  const joyEl = root.querySelector('.joy');
  const nub = root.querySelector('.nub');
  const joyzone = root.querySelector('.joyzone');
  const camzone = root.querySelector('.camzone');
  const ctxBtn = root.querySelector('.ctx');
  const ctxLbl = root.querySelector('.ctx .lbl');

  // --- dynamic joystick: appears where the thumb lands ---
  let joyId = null, joyCx = 0, joyCy = 0;
  const R = 40;
  joyzone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyCx = t.clientX; joyCy = t.clientY;
    joyEl.style.display = 'block';
    joyEl.style.left = `${joyCx}px`;
    joyEl.style.top = `${joyCy}px`;
    input.joy.active = true;
    input.joy.x = 0; input.joy.y = 0;
    e.preventDefault();
  }, { passive: false });
  joyzone.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      let dx = t.clientX - joyCx, dy = t.clientY - joyCy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      // screen up = forward: dy<0 -> joy.y<0 -> forward in moveVec
      input.joy.x = dx / R;
      input.joy.y = dy / R;
    }
    e.preventDefault();
  }, { passive: false });
  const joyEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null;
      input.joy.active = false; input.joy.x = 0; input.joy.y = 0;
      joyEl.style.display = 'none';
      nub.style.transform = 'translate(-50%, -50%)';
    }
  };
  joyzone.addEventListener('touchend', joyEnd);
  joyzone.addEventListener('touchcancel', joyEnd);

  // --- camera swipe in the middle-right band ---
  let camId = null, camLastX = 0;
  camzone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    camId = t.identifier; camLastX = t.clientX;
  }, { passive: true });
  camzone.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== camId) continue;
      callbacks.onCameraDrag((t.clientX - camLastX) * 0.008);
      camLastX = t.clientX;
    }
  }, { passive: true });

  // --- action buttons ---
  const on = (sel, fn) => {
    root.querySelector(sel).addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
  };
  on('.attack', callbacks.onAttack);
  on('.roll', callbacks.onRoll);
  on('.jump', () => callbacks.onJump?.());
  on('.pot', callbacks.onPotion);
  on('.ctx', () => callbacks.onInteract?.());
  root.querySelectorAll('[data-skill]').forEach((b) => {
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      callbacks.onSkill(b.dataset.skill);
    }, { passive: false });
  });

  // contextual button: pass null to hide, or { label } to show
  function setPrompt(p) {
    if (!p) { ctxBtn.classList.remove('show'); return; }
    ctxLbl.textContent = p.label;
    ctxBtn.classList.add('show');
  }

  function update(skillSys, potionCount) {
    root.querySelectorAll('[data-skill]').forEach((b) => {
      const frac = skillSys.cdFrac(b.dataset.skill);
      b.classList.toggle('oncd', frac > 0);
      if (frac > 0) {
        const deg = (1 - frac) * 360;
        b.querySelector('.cdo').style.background =
          `conic-gradient(transparent ${deg}deg, rgba(6,8,6,0.7) ${deg}deg)`;
      }
    });
    root.querySelector('.pot .cnt').textContent = potionCount;
  }

  return { update, setPrompt, root };
}
