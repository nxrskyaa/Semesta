// Semesta HUD — character plate, skill bar with cooldowns, minimap, quest
// tracker, interact prompt, pickup toasts, damage vignette. Compact, doesn't
// smother the world.
import { ITEMS } from '../systems/items.js';
import { itemIconUrl, skillIconUrl, makePlayerFaceTexture } from '../gfx/textures.js';
import { SKILLS } from '../systems/skills.js';
import { CLASSES, SKIN_TONES, HAIR_COLORS, EYE_COLORS } from '../systems/classes.js';

const CSS = `
#hud { font-family: inherit; }
#hud .frame {
  background: linear-gradient(180deg, rgba(20,24,17,0.88), rgba(12,16,11,0.88));
  border: 2px solid #4a5a42; box-shadow: 0 0 0 1px #0a0f0a, 0 4px 14px #000a;
}

/* ---- character plate (top left) ---- */
#hud .plate {
  position: absolute; top: 10px; left: 10px; display: flex; gap: 8px;
  padding: 7px 12px 7px 7px; align-items: center; border-radius: 2px;
}
#hud .plate .portrait {
  width: 46px; height: 46px; border: 2px solid var(--cc, #5a7a4a);
  background: #10160f; image-rendering: pixelated; position: relative;
}
#hud .plate .portrait canvas { width: 100%; height: 100%; image-rendering: pixelated; }
#hud .plate .portrait .lv {
  position: absolute; bottom: -7px; right: -7px; background: #202a20;
  border: 1px solid var(--cc, #5a7a4a); color: #ffe27a; font-size: 9px; padding: 1px 4px;
}
#hud .plate .bars { display: flex; flex-direction: column; gap: 3px; min-width: 148px; }
#hud .plate .pname { font-size: 11px; color: #e8e8d8; display: flex; justify-content: space-between; gap: 8px; }
#hud .plate .pname .cls { color: var(--cc, #9ab86a); font-size: 9px; letter-spacing: 1px; }
#hud .bar { height: 10px; background: #17120f; border: 1px solid #0a0f0a; position: relative; }
#hud .bar > div { height: 100%; transition: width 0.12s; }
#hud .bar.hp > div { background: linear-gradient(180deg, #8fe062, #4f9f34 60%, #3d7a28); }
#hud .bar.st { height: 7px; }
#hud .bar.st > div { background: linear-gradient(180deg, #ffd27a, #e0941e); }
#hud .bar .txt {
  position: absolute; inset: 0; font-size: 8px; text-align: center; line-height: 10px;
  color: #fff; text-shadow: 1px 1px 0 #000;
}
#hud .buffs { position: absolute; top: 74px; left: 12px; display: flex; gap: 4px; }
#hud .buffs .bf {
  width: 24px; height: 24px; border: 1px solid #6a7a5a; background: #141a12 center/80% no-repeat;
  image-rendering: pixelated; position: relative;
}
#hud .buffs .bf i {
  position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #9ab86a;
}

/* ---- minimap + clock (top right) ---- */
#hud .mapbox { position: absolute; top: 10px; right: 10px; width: 148px; }
#hud .mapbox .minimap { width: 148px; height: 148px; position: relative; overflow: hidden; }
#hud .mapbox canvas { width: 100%; height: 100%; display: block; }
#hud .mapbox .compass {
  position: absolute; top: 3px; left: 6px; font-size: 9px; color: #ffe27a; text-shadow: 1px 1px 0 #000;
}
#hud .mapbox .under {
  display: flex; justify-content: space-between; align-items: center; margin-top: 4px;
  padding: 3px 8px;
}
#hud .mapbox .clock { font-size: 13px; color: #e5ead8; }
#hud .mapbox .daynight { font-size: 11px; }
#hud .iconbtn {
  pointer-events: auto; cursor: pointer; background: #1a231a; border: 2px solid #35422f;
  color: #aab5a0; font-family: inherit; font-size: 11px; padding: 3px 8px;
}
#hud .iconbtn:hover { border-color: #9ab86a; color: #dcedc8; }

/* ---- quest tracker (right, under minimap) ---- */
#hud .quests {
  position: absolute; top: 196px; right: 10px; width: 168px; display: flex;
  flex-direction: column; gap: 4px; pointer-events: none;
}
#hud .quests .q {
  padding: 5px 8px; font-size: 9px; line-height: 1.6;
  background: rgba(14,18,12,0.78); border-left: 3px solid #7da05e; color: #cfd8c8;
}
#hud .quests .q .qn { color: #ffe9a8; font-size: 10px; display: block; }
#hud .quests .q.done { border-left-color: #ffd23e; }
#hud .quests .q.done .qp { color: #ffd23e; }
#hud .quests .q .qp { color: #b8d89a; }

/* ---- interact prompt (bottom center, above skill bar) ---- */
#hud .prompt {
  position: absolute; left: 50%; bottom: 118px; transform: translateX(-50%);
  font-size: 12px; color: #f0ead8; background: rgba(14,18,12,0.85);
  border: 2px solid #4a5a42; padding: 6px 14px; display: none; white-space: nowrap;
  letter-spacing: 1px;
}
#hud .prompt.show { display: block; animation: prompt-in 0.12s; }
#hud .prompt b { color: #ffe27a; background: #202a20; border: 1px solid #4a5a42; padding: 0 5px; margin-right: 5px; }
@keyframes prompt-in { from { transform: translateX(-50%) translateY(4px); opacity: 0; } }

/* ---- skill bar (bottom center) ---- */
#hud .actionbar {
  position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
#hud .xpline { display: flex; align-items: center; gap: 7px; }
#hud .xpbar {
  width: 300px; height: 6px; background: #141a12; border: 1px solid #0a0f0a; box-shadow: 0 0 0 1px #39443a;
}
#hud .xpbar > div { height: 100%; background: linear-gradient(180deg, #8fe062, #58c93f); }
#hud .xplvl { font-size: 10px; color: #b8e89a; text-shadow: 1px 1px 0 #000; }
#hud .skillrow { display: flex; gap: 6px; padding: 6px 8px; border-radius: 3px; }
#hud .skill {
  width: 52px; height: 52px; position: relative; cursor: pointer; pointer-events: auto;
  background: #141a12 center/72% no-repeat; border: 2px solid #3a463a;
  image-rendering: pixelated;
}
#hud .skill:hover { border-color: #9ab86a; }
#hud .skill .key {
  position: absolute; top: 1px; left: 3px; font-size: 9px; color: #9aa890; text-shadow: 1px 1px 0 #000;
}
#hud .skill .cd {
  position: absolute; inset: 0; background: conic-gradient(rgba(6,8,6,0.85) 0turn, rgba(6,8,6,0.85) 0turn, transparent 0turn);
  display: none;
}
#hud .skill .cdt {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  font-size: 15px; color: #fff; text-shadow: 1px 1px 0 #000;
}
#hud .skill.oncd .cd, #hud .skill.oncd .cdt { display: flex; }
#hud .skill .cnt {
  position: absolute; bottom: 1px; right: 3px; font-size: 10px; color: #e8e8d8; text-shadow: 1px 1px 0 #000;
}
#hud .skill.empty { opacity: 0.45; }
#hud .weapon-chip {
  position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%);
  display: flex; gap: 6px; align-items: center; font-size: 10px; color: #cfd8c8;
  background: rgba(12,16,11,0.7); padding: 3px 9px; border: 1px solid #35422f;
}
#hud .weapon-chip img { width: 18px; height: 18px; image-rendering: pixelated; }
#hud .weapon-chip .plus { color: #ffd23e; }

/* ---- menu (bottom right) ---- */
#hud .menubar { position: absolute; right: 10px; bottom: 10px; display: flex; gap: 5px; }

/* ---- toasts (bottom left) ---- */
#hud .toasts { position: absolute; left: 10px; bottom: 10px; display: flex; flex-direction: column-reverse; gap: 3px; }
#hud .toast {
  display: flex; align-items: center; gap: 6px; font-size: 11px;
  background: rgba(14,18,12,0.85); border-left: 3px solid #7da05e;
  padding: 3px 9px 3px 5px; color: #dde5d5; width: max-content;
  animation: toast-in 0.15s;
}
#hud .toast img { width: 15px; height: 15px; image-rendering: pixelated; }
#hud .toast.quest { border-left-color: #ffd23e; color: #ffe9a8; }
@keyframes toast-in { from { transform: translateX(-8px); opacity: 0; } }

/* ---- overlays ---- */
#hud .vignette {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.15s;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(160,20,10,0.5) 100%);
}
#hud .lowhp {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(140,10,5,0.42) 100%);
  animation: lowhp-pulse 1.1s infinite;
}
@keyframes lowhp-pulse { 50% { opacity: 0.9; } }
#hud .banner {
  position: absolute; left: 50%; top: 24%; transform: translateX(-50%);
  font-size: 26px; color: #ffe27a; text-shadow: 0 2px 0 #5e3c10, 0 4px 10px #000;
  letter-spacing: 3px; opacity: 0; transition: opacity 0.3s; white-space: nowrap;
}
#hud .deadwrap {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, #300606aa 30%, #1a0303dd 100%);
  display: none; align-items: center; justify-content: center; flex-direction: column; gap: 16px;
}
#hud .deadwrap.show { display: flex; pointer-events: auto; }
#hud .deadwrap h2 { font-size: 34px; color: #ffb0a0; letter-spacing: 7px; text-shadow: 0 3px 0 #400; }
#hud .deadwrap button {
  font-family: inherit; font-size: 14px; padding: 10px 26px; cursor: pointer;
  background: #2a332a; color: #e8e8d8; border: 2px solid #46534a;
}
#hud .hint-desktop {
  position: absolute; right: 10px; bottom: 46px; font-size: 9px; color: #8fa584;
  text-align: right; line-height: 1.9; text-shadow: 1px 1px 0 #000;
}
#hud .hint-desktop b { background: #202a20; border: 1px solid #39443a; padding: 0 4px; color: #c5cdbd; }

/* touch devices: skills live on the right-hand buttons, hide the center bar */
body.touch #hud .skillrow { display: none; }
body.touch #hud .weapon-chip { bottom: 30px; }
body.touch #hud .actionbar { bottom: 8px; }
body.touch #hud .hint-desktop { display: none; }
body.touch #hud .prompt { display: none !important; } /* mobile uses the context button */
body.touch #hud .menubar { right: unset; left: 10px; bottom: unset; top: 74px; flex-direction: column; }
body.touch #hud .buffs { top: unset; bottom: 64px; left: 10px; }

@media (max-width: 760px) {
  #hud .mapbox { width: 96px; }
  #hud .mapbox .minimap { width: 96px; height: 96px; }
  #hud .plate .bars { min-width: 104px; }
  #hud .plate .portrait { width: 38px; height: 38px; }
  #hud .skill { width: 46px; height: 46px; }
  #hud .xpbar { width: 180px; }
  #hud .hint-desktop { display: none; }
  #hud .quests { top: 150px; right: 6px; width: 132px; }
  #hud .quests .q { font-size: 8px; padding: 4px 6px; }
  #hud .banner { font-size: 18px; }
}
`;

export function createHUD(root, { inventory, character, forge, audio }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const cls = CLASSES[character.cls];
  const skillIds = cls.skills;

  root.innerHTML = `
    <div class="vignette"></div>
    <div class="lowhp"></div>
    <div class="plate frame" style="--cc:${cls.color}">
      <div class="portrait"><canvas width="16" height="16"></canvas><span class="lv"></span></div>
      <div class="bars">
        <div class="pname"><span>${character.name}</span><span class="cls">${cls.name.toUpperCase()}</span></div>
        <div class="bar hp"><div></div><span class="txt"></span></div>
        <div class="bar st"><div></div></div>
      </div>
    </div>
    <div class="buffs"></div>
    <div class="mapbox">
      <div class="minimap frame"><canvas width="150" height="150"></canvas><span class="compass">N</span></div>
      <div class="under frame">
        <span class="clock">10:00</span><span class="daynight">☀</span>
        <button class="iconbtn mute">${audio.isMuted() ? '🔇' : '🔊'}</button>
      </div>
    </div>
    <div class="quests"></div>
    <div class="prompt"></div>
    <div class="weapon-chip"></div>
    <div class="actionbar">
      <div class="xpline"><span class="xplvl"></span><div class="xpbar"><div></div></div></div>
      <div class="skillrow frame">
        ${skillIds.map((s, i) => `
          <div class="skill" data-skill="${s}" style="background-image:url(${skillIconUrl(s, SKILLS[s].icon)})" title="${SKILLS[s].name} — ${SKILLS[s].desc}">
            <span class="key">${i + 1}</span><div class="cd"></div><span class="cdt"></span>
          </div>`).join('')}
        <div class="skill potion" data-potion="1" style="background-image:url(${itemIconUrl('tonic')})" title="Health Tonic">
          <span class="key">4</span><span class="cnt">0</span>
        </div>
      </div>
    </div>
    <div class="menubar">
      <button class="iconbtn" data-menu="inv">BAG <small>[Tab]</small></button>
      <button class="iconbtn" data-menu="cra">CRAFT <small>[C]</small></button>
      <button class="iconbtn" data-menu="forge">FORGE <small>[V]</small></button>
      <button class="iconbtn" data-menu="pets">PETS <small>[P]</small></button>
      <button class="iconbtn" data-menu="help">?</button>
    </div>
    <div class="hint-desktop">
      <b>LMB</b> Attack · <b>RMB</b> Roll ${cls.hasShield ? '· <b>Shift</b> Block' : ''} · <b>F</b> Interact / Fish<br>
      <b>1-3</b> Skills · <b>4</b> Tonic · <b>Q/E</b> Camera · <b>Scroll</b> Zoom
    </div>
    <div class="toasts"></div>
    <div class="banner"></div>
    <div class="deadwrap"><h2>YOU FELL</h2><button>RISE AT THE VILLAGE</button></div>
  `;

  const els = {
    hpFill: root.querySelector('.bar.hp > div'),
    hpTxt: root.querySelector('.bar.hp .txt'),
    stFill: root.querySelector('.bar.st > div'),
    lv: root.querySelector('.plate .lv'),
    buffs: root.querySelector('.buffs'),
    xpFill: root.querySelector('.xpbar > div'),
    xpLvl: root.querySelector('.xplvl'),
    weaponChip: root.querySelector('.weapon-chip'),
    skillEls: [...root.querySelectorAll('[data-skill]')],
    potionEl: root.querySelector('[data-potion]'),
    toasts: root.querySelector('.toasts'),
    clock: root.querySelector('.clock'),
    daynight: root.querySelector('.daynight'),
    banner: root.querySelector('.banner'),
    dead: root.querySelector('.deadwrap'),
    deadBtn: root.querySelector('.deadwrap button'),
    minimapCanvas: root.querySelector('.minimap canvas'),
    vignette: root.querySelector('.vignette'),
    lowhp: root.querySelector('.lowhp'),
    muteBtn: root.querySelector('.mute'),
    quests: root.querySelector('.quests'),
    prompt: root.querySelector('.prompt'),
  };

  // pixel portrait from the character's face texture
  {
    const skin = SKIN_TONES[(character.skin ?? 0) % SKIN_TONES.length];
    const hairC = HAIR_COLORS[(character.hairColor ?? 0) % HAIR_COLORS.length];
    const eyeC = EYE_COLORS[(character.eyes ?? 0) % EYE_COLORS.length];
    const faceTex = makePlayerFaceTexture(skin, hairC, eyeC, character.gender === 'female', character.hairStyle === 7);
    const pc = root.querySelector('.portrait canvas');
    pc.getContext('2d').drawImage(faceTex.image, 0, 0);
  }

  let bannerT = null;
  let vignetteT = 0;
  let raining = false;

  const callbacks = { onSkill: null, onPotion: null, onMenu: null, onRespawn: null };
  function bind(cb) { Object.assign(callbacks, cb); }

  root.querySelector('.skillrow').addEventListener('click', (e) => {
    const sk = e.target.closest('[data-skill]');
    if (sk) callbacks.onSkill?.(sk.dataset.skill);
    if (e.target.closest('[data-potion]')) callbacks.onPotion?.();
  });
  root.querySelector('.menubar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]');
    if (b) callbacks.onMenu?.(b.dataset.menu);
  });
  els.deadBtn.addEventListener('click', () => callbacks.onRespawn?.());
  els.muteBtn.addEventListener('click', () => {
    const m = audio.toggleMute();
    els.muteBtn.textContent = m ? '🔇' : '🔊';
  });

  function updateVitals(player, leveling, dt) {
    const s = player.state;
    els.hpFill.style.width = `${(s.hp / s.maxHp) * 100}%`;
    els.hpTxt.textContent = `${Math.ceil(s.hp)} / ${s.maxHp}`;
    els.stFill.style.width = `${(s.stamina / s.maxStamina) * 100}%`;
    els.lv.textContent = `Lv${leveling.state.level}`;
    els.xpFill.style.width = `${leveling.progress() * 100}%`;
    els.xpLvl.textContent = `Lv${leveling.state.level}`;
    els.lowhp.style.opacity = s.hp / s.maxHp < 0.3 && !s.dead ? '0.7' : '0';
    if (vignetteT > 0) {
      vignetteT -= dt;
      if (vignetteT <= 0) els.vignette.style.opacity = '0';
    }
    // buffs
    const html = s.buffs.filter((b) => b.t < 9000).map((b) => {
      const sk = SKILLS[b.id];
      const url = sk ? skillIconUrl(b.id, sk.icon) : '';
      return `<div class="bf" style="background-image:url(${url})" title="${sk?.name || b.id}"><i style="width:${Math.min(100, b.t * 16)}%"></i></div>`;
    }).join('');
    if (els.buffs.innerHTML !== html) els.buffs.innerHTML = html;
  }

  function updateSkills(skillSys) {
    for (const el of els.skillEls) {
      const id = el.dataset.skill;
      const frac = skillSys.cdFrac(id);
      if (frac > 0) {
        el.classList.add('oncd');
        const deg = (1 - frac) * 360;
        el.querySelector('.cd').style.background =
          `conic-gradient(transparent ${deg}deg, rgba(6,8,6,0.85) ${deg}deg)`;
        el.querySelector('.cdt').textContent = Math.ceil(frac * SKILLS[id].cd);
      } else {
        el.classList.remove('oncd');
      }
    }
    const n = inventory.count('tonic');
    els.potionEl.querySelector('.cnt').textContent = n;
    els.potionEl.classList.toggle('empty', n === 0);
  }

  function updateWeaponChip() {
    const id = inventory.state.equipped;
    const d = ITEMS[id];
    const plus = forge.plusOf(id);
    els.weaponChip.innerHTML =
      `<img src="${itemIconUrl(id)}"> ${d.name} ${plus > 0 ? `<span class="plus">+${plus}</span>` : ''}`;
  }
  inventory.onChange(updateWeaponChip);
  updateWeaponChip();

  // quest tracker: [{name, label, p, n, done}]
  function updateQuests(lines) {
    const html = lines.map((l) =>
      `<div class="q ${l.done ? 'done' : ''}"><span class="qn">${l.name}</span>
        <span class="qp">${l.done ? '✔ Return to ' + l.giverName : `${l.label} — ${l.p}/${l.n}`}</span></div>`
    ).join('');
    if (els.quests.innerHTML !== html) els.quests.innerHTML = html;
  }

  // interact prompt: pass null to hide; { key, label } to show
  function setPrompt(p) {
    if (!p) { els.prompt.classList.remove('show'); return; }
    const html = `<b>${p.key}</b>${p.label}`;
    if (els.prompt.innerHTML !== html) els.prompt.innerHTML = html;
    els.prompt.classList.add('show');
  }

  function showHurt() {
    els.vignette.style.opacity = '1';
    vignetteT = 0.35;
  }

  function toast(id, count) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<img src="${itemIconUrl(id)}"> ${ITEMS[id].name}${count > 1 ? ` x${count}` : ''}`;
    els.toasts.appendChild(el);
    while (els.toasts.childElementCount > 6) els.toasts.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 2600);
    setTimeout(() => el.remove(), 3100);
  }

  function toastText(text) {
    const el = document.createElement('div');
    el.className = 'toast quest';
    el.textContent = text;
    els.toasts.appendChild(el);
    while (els.toasts.childElementCount > 6) els.toasts.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 3200);
    setTimeout(() => el.remove(), 3700);
  }

  function banner(text) {
    els.banner.textContent = text;
    els.banner.style.opacity = '1';
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { els.banner.style.opacity = '0'; }, 2200);
  }

  function setClock(text, isNight) {
    els.clock.textContent = text;
    els.daynight.textContent = raining ? '🌧' : (isNight ? '🌙' : '☀');
  }
  function setWeather(r) { raining = r; }
  function showDead(show) { els.dead.classList.toggle('show', show); }

  return {
    updateVitals, updateSkills, toast, toastText, banner, setClock, setWeather,
    showDead, showHurt, bind, els, updateQuests, setPrompt,
  };
}
