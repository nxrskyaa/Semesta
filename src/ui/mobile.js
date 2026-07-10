// Kontrol sentuh: joystick virtual kiri + tombol aksi kanan.
// Didesain minimal supaya tidak menutupi dunia; hanya aktif di perangkat sentuh.
import { SKILLS } from '../systems/skills.js';
import { skillIconUrl, itemIconUrl } from '../gfx/textures.js';

const CSS = `
#touchui { position: fixed; inset: 0; pointer-events: none; z-index: 20; }
#touchui .joyzone { position: absolute; left: 0; bottom: 0; width: 45%; height: 62%; pointer-events: auto; }
#touchui .joy {
  position: absolute; width: 108px; height: 108px; border-radius: 50%;
  border: 2px solid rgba(190,210,180,0.35); background: rgba(20,26,18,0.3);
  display: none; transform: translate(-50%, -50%);
}
#touchui .joy .nub {
  position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; border-radius: 50%;
  background: rgba(190,210,180,0.5); transform: translate(-50%, -50%);
}
#touchui .btns { position: absolute; right: 12px; bottom: 88px; pointer-events: auto; }
#touchui .abtn {
  position: absolute; border-radius: 50%; border: 2px solid rgba(190,210,180,0.4);
  background: rgba(20,26,18,0.55) center/58% no-repeat; image-rendering: pixelated;
  display: flex; align-items: center; justify-content: center;
  color: #dce5d5; font-family: inherit; text-shadow: 1px 1px 0 #000;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
}
#touchui .abtn:active { background-color: rgba(90,120,74,0.55); }
#touchui .abtn .cdo {
  position: absolute; inset: -2px; border-radius: 50%; display: none;
}
#touchui .abtn.oncd .cdo { display: block; }
#touchui .attack { width: 84px; height: 84px; right: 0; bottom: 0; font-size: 30px; }
#touchui .roll { width: 56px; height: 56px; right: 96px; bottom: -4px; font-size: 20px; }
#touchui .sk { width: 54px; height: 54px; }
#touchui .sk1 { right: 102px; bottom: 62px; }
#touchui .sk2 { right: 66px; bottom: 116px; }
#touchui .sk3 { right: 2px; bottom: 138px; }
#touchui .pot { width: 48px; height: 48px; right: 148px; bottom: 8px; }
#touchui .pot .cnt { position: absolute; bottom: 0; right: 4px; font-size: 11px; }
#touchui .camzone { position: absolute; right: 0; top: 0; width: 55%; height: 45%; pointer-events: auto; }
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
      ${skillIds.map((s, i) => `<button class="abtn sk sk${i + 1}" data-skill="${s}"
        style="background-image:url(${skillIconUrl(s, SKILLS[s].icon)})"><span class="cdo"></span></button>`).join('')}
      <button class="abtn pot" style="background-image:url(${itemIconUrl('tonic')})"><span class="cnt">0</span></button>
    </div>
  `;
  document.body.appendChild(root);

  const joyEl = root.querySelector('.joy');
  const nub = root.querySelector('.nub');
  const joyzone = root.querySelector('.joyzone');
  const camzone = root.querySelector('.camzone');

  // --- joystick ---
  let joyId = null, joyCx = 0, joyCy = 0;
  const R = 44;
  joyzone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyCx = t.clientX; joyCy = t.clientY;
    joyEl.style.display = 'block';
    joyEl.style.left = `${joyCx}px`;
    joyEl.style.top = `${joyCy}px`;
    input.joy.active = true;
    e.preventDefault();
  }, { passive: false });
  joyzone.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      let dx = t.clientX - joyCx, dy = t.clientY - joyCy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
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

  // --- swipe kamera di area kanan-atas ---
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

  // --- tombol aksi ---
  const on = (sel, fn) => {
    root.querySelector(sel).addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
  };
  on('.attack', callbacks.onAttack);
  on('.roll', callbacks.onRoll);
  on('.pot', callbacks.onPotion);
  root.querySelectorAll('[data-skill]').forEach((b) => {
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      callbacks.onSkill(b.dataset.skill);
    }, { passive: false });
  });

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

  return { update, root };
}
