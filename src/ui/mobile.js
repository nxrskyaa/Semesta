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
/* touch-action: none - the old "manipulation" value still left PINCH to the
   browser, which is why two fingers zoomed the web page instead of the camera */
#touchui .camzone {
  position: absolute; right: 0; top: 24%; width: 55%; height: 30%;
  pointer-events: auto; touch-action: none;
}

/* action cluster bottom-right */
#touchui .btns {
  position: absolute; right: 10px; bottom: 14px; pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
#touchui .abtn {
  position: absolute; border-radius: 10px; border: 0;
  /* The FILL must be a background-COLOR, never a gradient in the shorthand.
     Skill and potion icons are applied later as background-image, which
     replaces the shorthand outright — that is what left every button fully
     transparent. A colour survives an image being set over it. */
  background-color: #2c3a24;
  background-position: center; background-repeat: no-repeat; background-size: 54%;
  image-rendering: pixelated;
  display: flex; align-items: center; justify-content: center;
  color: #dce5d5; font-family: inherit; text-shadow: 1px 1px 0 #000;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  pointer-events: auto;
  /* the ring is a box-shadow, not an outline: outlines do not reliably follow
     border-radius, which is what made the corners look sliced off */
  box-shadow:
    inset 0 2px 0 0 rgba(220,240,200,0.22), inset 0 -3px 0 0 rgba(0,0,0,0.45),
    inset 0 0 0 2px rgba(104,124,84,0.95),
    0 0 0 2px rgba(6,9,6,0.9),
    0 3px 7px rgba(0,0,0,0.45);
}
#touchui .abtn:active {
  transform: translateY(2px);
  box-shadow:
    inset 0 3px 4px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(190,220,150,0.8),
    0 0 0 2px rgba(6,9,6,0.8), 0 0 12px rgba(150,200,110,0.4);
}
#touchui .abtn .cdo { position: absolute; inset: 0; border-radius: 10px; display: none; overflow: hidden; }
#touchui .abtn.oncd .cdo { display: block; }

/* SIZES. The old cluster ate 260px of a 375px screen. Everything is ~20%
   smaller: still comfortably above the 44px minimum tap target, but the game
   gets its screen back. */
#touchui .attack { width: 60px; height: 60px; right: 6px; bottom: 6px; font-size: 22px;
  border-radius: 13px;
  background-color: #5c4520;
  box-shadow:
    inset 0 2px 0 0 rgba(255,230,160,0.3), inset 0 -3px 0 0 rgba(0,0,0,0.45),
    inset 0 0 0 2px rgba(214,174,70,0.95),
    0 0 0 2px rgba(6,9,6,0.9),
    0 0 12px rgba(200,160,58,0.22), 0 3px 7px rgba(0,0,0,0.45);
}
/* bottom row: attack (big) · roll · jump · potion — evenly spaced */
#touchui .roll { width: 45px; height: 45px; right: 74px; bottom: 6px; font-size: 16px; }
#touchui .jump { width: 45px; height: 45px; right: 127px; bottom: 6px; font-size: 16px; }
#touchui .pot { width: 42px; height: 42px; right: 180px; bottom: 7px; }
#touchui .pot .cnt { position: absolute; bottom: -1px; right: 3px; font-size: 10px; }
/* skill arc: a clean diagonal above the attack button, nothing overlapping */
#touchui .sk { width: 44px; height: 44px; }
#touchui .sk1 { right: 10px; bottom: 78px; }
#touchui .sk2 { right: 60px; bottom: 64px; }
#touchui .sk3 { right: 108px; bottom: 54px; }

/* contextual interact button (talk / chest / fish) */
#touchui .ctx {
  position: absolute; right: 26px; bottom: 136px; width: 50px; height: 50px;
  border-radius: 12px; border: 0; background: linear-gradient(180deg, rgba(96,80,28,0.9), rgba(50,40,14,0.92));
  color: #ffe9a8; font-size: 21px; display: none; align-items: center; justify-content: center;
  pointer-events: auto; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow:
    inset 0 2px 0 0 rgba(255,230,160,0.35), inset 0 -3px 0 0 rgba(0,0,0,0.5),
    inset 0 0 0 2px #d8b85a, 0 0 0 2px rgba(6,9,6,0.8), 0 0 14px rgba(200,160,58,0.45);
  animation: ctx-pulse 1.6s ease-in-out infinite;
}
#touchui .ctx.show { display: flex; }
/* secondary context button — sits left of the primary ★, calmer green */
#touchui .ctx2 {
  position: absolute; right: 86px; bottom: 132px; width: 44px; height: 44px;
  border-radius: 12px; border: 0; background: linear-gradient(180deg, rgba(52,74,40,0.92), rgba(28,44,20,0.94));
  color: #cdeaa8; font-size: 18px; display: none; align-items: center; justify-content: center;
  pointer-events: auto; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow:
    inset 0 2px 0 0 rgba(200,240,160,0.3), inset 0 -3px 0 0 rgba(0,0,0,0.5),
    inset 0 0 0 2px #8ac86a, 0 0 0 2px rgba(6,9,6,0.8), 0 0 12px rgba(120,200,90,0.4);
}
#touchui .ctx2.show { display: flex; }
#touchui .ctx2:active { transform: translateY(2px); filter: brightness(1.2); }
#touchui .ctx2 .lbl {
  position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%);
  font-size: 7px; color: #cdeaa8; white-space: nowrap; letter-spacing: 1px; text-shadow: 1px 1px 0 #000;
}
@keyframes ctx-pulse { 50% { box-shadow:
  inset 0 2px 0 0 rgba(255,230,160,0.35), inset 0 -3px 0 0 rgba(0,0,0,0.5),
  inset 0 0 0 2px #ffe27a, 0 0 0 2px rgba(6,9,6,0.8), 0 0 22px rgba(255,210,62,0.6); } }
#touchui .afk {
  position: absolute; right: 88px; bottom: 186px; width: 40px; height: 40px;
  border-radius: 10px; border: 0; background: linear-gradient(180deg, rgba(34,48,66,0.9), rgba(18,26,38,0.92));
  color: #b8d0f0; font-size: 15px; display: none; align-items: center; justify-content: center;
  pointer-events: auto; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow:
    inset 0 2px 0 0 rgba(190,215,245,0.25), inset 0 -3px 0 0 rgba(0,0,0,0.5),
    inset 0 0 0 2px rgba(150,180,220,0.6), 0 0 0 2px rgba(6,9,6,0.8);
}
#touchui .afk.show { display: flex; }
/* menu close button (ESC replacement on touch) — top-right, only while a panel is open */
#touchui .closebtn {
  position: absolute; top: 10px; right: 10px; width: 42px; height: 42px;
  border-radius: 12px; border: 0; background: linear-gradient(180deg, rgba(90,30,26,0.92), rgba(48,16,14,0.94));
  color: #ffd8d0; font-size: 22px; display: none; align-items: center; justify-content: center;
  pointer-events: auto; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  box-shadow:
    inset 0 2px 0 0 rgba(255,200,190,0.3), inset 0 -3px 0 0 rgba(0,0,0,0.5),
    inset 0 0 0 2px #c88, 0 0 0 2px rgba(6,9,6,0.8), 0 2px 10px rgba(0,0,0,0.5);
  z-index: 45;
}
#touchui .closebtn.show { display: flex; }
#touchui .closebtn:active, #touchui .ctx:active, #touchui .afk:active { transform: translateY(2px); filter: brightness(1.2); }
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

/** Three buttons, always. An empty slot is drawn dimmed rather than skipped,
 *  or the arc of skill buttons would move every time a skill is learned and a
 *  player's thumb would have to re-learn the layout. */
function skillBtns(ids) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const id = ids[i];
    out.push(id && SKILLS[id]
      ? `<button class="abtn sk sk${i + 1}" data-skill="${id}"
          style="background-image:url(${skillIconUrl(id, SKILLS[id].icon)})"><span class="cdo"></span></button>`
      : `<button class="abtn sk sk${i + 1} skempty" disabled></button>`);
  }
  return out.join('');
}

export function createTouchControls(input, skillIds, callbacks) {
  skillIds = [...(skillIds || [])];
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
      ${skillBtns(skillIds)}
      <button class="abtn pot" style="background-image:url(${itemIconUrl('tonic')})"><span class="cnt">0</span></button>
      <button class="ctx"><span class="ic">★</span><span class="lbl"></span></button>
      <button class="ctx2"><span class="ic">✦</span><span class="lbl"></span></button>
      <button class="afk" title="AFK fishing">💤</button>
    </div>
    <button class="closebtn" title="Close">✕</button>
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

  // --- camera: one finger swipes the yaw, TWO fingers pinch the zoom ---
  // The pinch listens on the whole root rather than the camera band, because on
  // a phone you naturally pinch wherever you happen to be looking; restricting
  // it to a strip on the right made it feel broken. The joystick and the action
  // buttons stop propagation, so a pinch never fights a control.
  let camId = null, camLastX = 0;
  camzone.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    camId = t.identifier; camLastX = t.clientX;
  }, { passive: true });
  camzone.addEventListener('touchmove', (e) => {
    if (pinchDist !== null) return;     // a pinch is in progress; don't also spin
    for (const t of e.changedTouches) {
      if (t.identifier !== camId) continue;
      callbacks.onCameraDrag((t.clientX - camLastX) * 0.008);
      camLastX = t.clientX;
    }
  }, { passive: true });

  let pinchDist = null;
  const spanOf = (touches) => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
  // NOT passive: a pinch has to be claimed with preventDefault or the browser
  // runs its own page zoom and the camera never sees the gesture.
  root.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchDist = spanOf(e.touches);
      camId = null;                     // drop any swipe that was running
    }
  }, { passive: false });
  root.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || pinchDist === null) return;
    e.preventDefault();
    const d = spanOf(e.touches);
    // spreading fingers zooms IN (camera closer), pinching zooms out
    callbacks.onCameraZoom?.((pinchDist - d) * 0.045);
    pinchDist = d;
  }, { passive: false });
  const endPinch = (e) => { if (e.touches.length < 2) pinchDist = null; };
  root.addEventListener('touchend', endPinch, { passive: true });
  root.addEventListener('touchcancel', endPinch, { passive: true });

  // --- action buttons ---
  const on = (sel, fn) => {
    root.querySelector(sel).addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
  };
  on('.attack', callbacks.onAttack);
  on('.roll', callbacks.onRoll);
  on('.jump', () => callbacks.onJump?.());
  on('.pot', callbacks.onPotion);
  on('.ctx', () => callbacks.onInteract?.());
  on('.ctx2', () => callbacks.onInteract2?.());
  on('.afk', () => callbacks.onAfkFish?.());
  on('.closebtn', () => callbacks.onCloseMenu?.());
  const afkBtn = root.querySelector('.afk');
  const ctx2Btn = root.querySelector('.ctx2');
  const ctx2Lbl = root.querySelector('.ctx2 .lbl');
  const closeBtn = root.querySelector('.closebtn');
  // DELEGATED, not bound per button. The skill buttons are rebuilt whenever the
  // loadout changes, and a handler attached to the old element would go with it
  // — the button would still be drawn and would simply stop working.
  root.querySelector('.btns').addEventListener('touchstart', (e) => {
    const b = e.target.closest('[data-skill]');
    if (!b) return;
    e.preventDefault();
    callbacks.onSkill(b.dataset.skill);
  }, { passive: false });

  // contextual buttons: primary { label, afk? } + optional secondary { label }
  function setPrompt(p, p2 = null) {
    if (!p) { ctxBtn.classList.remove('show'); afkBtn.classList.remove('show'); }
    else {
      ctxLbl.textContent = p.label;
      ctxBtn.classList.add('show');
      afkBtn.classList.toggle('show', !!p.afk);
    }
    if (!p2) { ctx2Btn.classList.remove('show'); }
    else {
      ctx2Lbl.textContent = p2.label;
      ctx2Btn.classList.add('show');
    }
  }

  // show/hide the ESC-replacement close button while a menu/panel/popup is open.
  // CRUCIAL: the transparent joystick & camera capture zones live ABOVE the HUD
  // (higher stacking context), so while any UI is open we must switch OFF their
  // pointer-events — otherwise the joystick swallows every tap meant for a menu
  // tile or panel button (that's why the ☰ popup was un-tappable).
  function setMenuOpen(open) {
    closeBtn.classList.toggle('show', !!open);
    root.querySelector('.btns').style.opacity = open ? '0.25' : '1';
    joyzone.style.pointerEvents = open ? 'none' : 'auto';
    camzone.style.pointerEvents = open ? 'none' : 'auto';
    if (open) { // drop any in-progress joystick so movement doesn't stick
      joyId = null; input.joy.active = false; input.joy.x = 0; input.joy.y = 0;
      joyEl.style.display = 'none';
    }
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

  /** Rebuild the three skill buttons after the loadout changes. Safe because
   *  the tap handler is delegated off `.btns` rather than bound per button. */
  function setSkills(ids) {
    skillIds = ids || [];
    const btns = root.querySelector('.btns');
    if (!btns) return;
    const old = [...btns.querySelectorAll('.abtn.sk')];
    if (!old.length) return;
    const frag = document.createElement('div');
    frag.innerHTML = skillBtns(skillIds);
    const fresh = [...frag.children];
    old.forEach((o, i) => { if (fresh[i]) btns.replaceChild(fresh[i], o); });
  }

  return { update, setPrompt, setMenuOpen, setSkills, root };
}
