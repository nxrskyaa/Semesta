// Character Creation — pixel-art "hero forge": a big live 3D hero on a stone
// pedestal under a night sky, with one compact tabbed control panel
// (CLASS / BODY / OUTFIT). Works as a fixed full-screen app layout on desktop
// AND mobile (no page scrolling — panels scroll internally).
// Resolves with Promise<{config, continued}>.
import * as THREE from 'three';
import { buildCharacterMesh, applyCarryPose } from '../entities/player.js';
import {
  CLASSES, GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_COLORS,
  OUTFIT_STYLES, OUTFIT_COLORS, CAPE_COLORS, ACCESSORIES, defaultCharacter,
} from '../systems/classes.js';
import { SKILLS } from '../systems/skills.js';
import { ITEMS } from '../systems/items.js';
import { skillIconUrl, itemIconUrl } from '../gfx/textures.js';

const CSS = `
#charcreate {
  position: fixed; inset: 0; z-index: 90; overflow: hidden;
  display: grid; grid-template-rows: auto 1fr auto; gap: 10px;
  padding: 10px 12px;
  color: #d8e0d0; font-family: inherit;
  background:
    radial-gradient(ellipse at 50% 118%, #2c4030 0%, transparent 55%),
    radial-gradient(1.5px 1.5px at 12% 18%, #f0ead0 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 78% 9%, #d8e4f0 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 33% 7%, #f0ead0 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 62% 22%, #c8d4e8 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 90% 30%, #f0ead0 50%, transparent 51%),
    radial-gradient(2px 2px at 45% 14%, #fff8dc 50%, transparent 51%),
    linear-gradient(180deg, #0b1016 0%, #10181a 45%, #14201a 100%);
}

/* pixel frame: hard-stepped border drawn with box-shadows (no soft radius) */
#charcreate .pix {
  background: linear-gradient(180deg, #1c2418, #12180f);
  border: 0;
  box-shadow:
    0 -3px 0 0 #4a5a3c, 0 3px 0 0 #2a331f,
    -3px 0 0 0 #3a472e, 3px 0 0 0 #3a472e,
    0 -6px 0 0 #090c08, 0 6px 0 0 #090c08,
    -6px 0 0 0 #090c08, 6px 0 0 0 #090c08,
    inset 0 0 0 1px #0a0e08, inset 0 22px 20px -20px rgba(240,230,180,0.09);
}

/* ---- header ---- */
#charcreate .head { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 4px 0 0; }
#charcreate .head h1 {
  font-size: 26px; letter-spacing: 10px; color: #e8d9a8;
  text-shadow: 0 0 22px rgba(200,160,58,0.35), 0 3px 0 #3a3016, 0 5px 10px #000;
}
#charcreate .head .sub { font-size: 9px; color: #8a967f; letter-spacing: 4px; }
#charcreate .continue {
  font-family: inherit; font-size: 10px; letter-spacing: 1px; cursor: pointer;
  padding: 8px 16px; color: #c8dce8;
  background: linear-gradient(180deg, #23303c, #182028);
  border: 0; box-shadow: 0 -2px 0 0 #3a5a6a, 0 2px 0 0 #101820, -2px 0 0 0 #2a4452, 2px 0 0 0 #2a4452, 0 0 0 3px #090c08;
}
#charcreate .continue:hover { filter: brightness(1.3); }

/* ---- main: preview + control panel ---- */
#charcreate .main {
  display: grid; grid-template-columns: 1fr 340px; gap: 16px; min-height: 0;
  max-width: 1080px; width: 100%; margin: 0 auto;
}

#charcreate .stagebox { position: relative; min-height: 0; overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 96%, rgba(200,176,96,0.16) 0%, transparent 45%),
    linear-gradient(180deg, rgba(10,14,16,0.4), rgba(8,12,9,0.75));
}
#charcreate .stagebox canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: grab; }
#charcreate .stagebox .pname {
  position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 2;
  font-size: 12px; color: #f0e5c0; letter-spacing: 1px; white-space: nowrap;
  background: rgba(6,9,6,0.8); padding: 6px 16px;
  box-shadow: 0 0 0 2px #3a472e, 0 0 0 4px #090c08;
}
#charcreate .stagebox .dice {
  position: absolute; top: 10px; right: 10px; z-index: 2; cursor: pointer;
  font-family: inherit; font-size: 15px; padding: 7px 11px; color: #d8e0d0;
  background: linear-gradient(180deg, #1c2418, #12180f); border: 0;
  box-shadow: 0 0 0 2px #3a472e, 0 0 0 4px #090c08;
}
#charcreate .stagebox .dice:hover { color: #ffe27a; box-shadow: 0 0 0 2px #c8b060, 0 0 0 4px #090c08; }
#charcreate .stagebox .draghint {
  position: absolute; top: 14px; left: 14px; z-index: 2;
  font-size: 8px; letter-spacing: 2px; color: #6a7a62;
}

/* ---- control panel with pixel tabs ---- */
#charcreate .panelbox { display: flex; flex-direction: column; min-height: 0; }
#charcreate .tabs { display: flex; gap: 4px; padding: 0 4px; position: relative; z-index: 2; }
#charcreate .tabs button {
  flex: 1; font-family: inherit; font-size: 10px; letter-spacing: 2px; cursor: pointer;
  padding: 9px 4px 7px; color: #8a967f; border: 0; position: relative; top: 3px;
  background: linear-gradient(180deg, #161c12, #10150c);
  box-shadow: 0 -2px 0 0 #2c3524, -2px 0 0 0 #2c3524, 2px 0 0 0 #2c3524, 0 -4px 0 0 #090c08, -4px 0 0 0 #090c08, 4px 0 0 0 #090c08;
}
#charcreate .tabs button.on {
  color: #ffe27a; top: 0; padding-bottom: 10px;
  background: linear-gradient(180deg, #26301c, #1a2212);
  box-shadow: 0 -2px 0 0 #c8b060, -2px 0 0 0 #4a5a3c, 2px 0 0 0 #4a5a3c, 0 -4px 0 0 #090c08, -4px 0 0 0 #090c08, 4px 0 0 0 #090c08;
}
#charcreate .panel-body {
  flex: 1; min-height: 0; overflow-y: auto; padding: 13px 13px 15px;
  scrollbar-width: thin; scrollbar-color: #8a744a transparent;
}
#charcreate .pane { display: none; }
#charcreate .pane.on { display: block; }

#charcreate .row { margin-bottom: 12px; }
#charcreate .row:last-child { margin-bottom: 0; }
#charcreate .row label { display: block; font-size: 9px; color: #b9a76a; letter-spacing: 2px; margin-bottom: 6px; }
#charcreate .row label::before { content: '▸ '; color: #6a5a34; }

#charcreate .segs { display: flex; gap: 4px; flex-wrap: wrap; }
#charcreate .segs button {
  flex: 1; min-width: 58px; font-family: inherit; font-size: 10px; padding: 8px 4px; cursor: pointer;
  color: #aab5a0; border: 0; background: #131a12;
  box-shadow: inset 0 0 0 2px #2c352c, inset 0 -3px 0 0 rgba(0,0,0,0.4);
}
#charcreate .segs button.sel {
  color: #ffe9b0; background: #2c2a16;
  box-shadow: inset 0 0 0 2px #c8b060, inset 0 3px 0 0 rgba(255,230,160,0.12);
}
#charcreate .segs button:hover:not(.sel) { box-shadow: inset 0 0 0 2px #5a6a4a, inset 0 -3px 0 0 rgba(0,0,0,0.4); color: #dce5cc; }

#charcreate .swatches { display: flex; gap: 6px; flex-wrap: wrap; }
#charcreate .sw {
  width: 30px; height: 26px; cursor: pointer; position: relative;
  box-shadow: inset 0 0 0 2px rgba(0,0,0,0.45), 0 0 0 2px #2c352c;
}
#charcreate .sw:hover { transform: translateY(-2px); }
#charcreate .sw.sel { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.3), 0 0 0 2px #f0e5c0, 0 0 10px rgba(200,176,96,0.5); }
#charcreate .sw.none { background: repeating-linear-gradient(45deg, #131a12, #131a12 4px, #202a20 4px, #202a20 8px); }
#charcreate .sw.none::after { content: '✕'; position: absolute; inset: 0; text-align: center; line-height: 24px; font-size: 11px; color: #8a967f; }

/* class cards */
#charcreate .classes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
#charcreate .cls {
  display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer;
  background: #131a12; box-shadow: inset 0 0 0 2px #2c352c;
}
#charcreate .cls:hover { box-shadow: inset 0 0 0 2px #5a6a4a; }
#charcreate .cls.sel { background: #1c231a; box-shadow: inset 0 0 0 2px var(--cc), inset 0 0 16px rgba(0,0,0,0.55); }
#charcreate .clsnote {
  margin-top: 10px; padding: 10px 12px; font-size: 9px; line-height: 1.8;
  color: #9fb08c; background: rgba(10,14,10,0.5);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.22);
}
#charcreate .clsnote b { color: #ffe9b0; }
#charcreate .cls img.w { width: 24px; height: 24px; image-rendering: pixelated; }
#charcreate .cls .cn { font-size: 11px; color: var(--cc); }
#charcreate .cls .ct { font-size: 7px; color: #8a967f; letter-spacing: 1px; margin-top: 2px; }
#charcreate .clsdesc { font-size: 10px; color: #9aa890; line-height: 1.7; margin: 10px 0; min-height: 30px; }
#charcreate .stats { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
#charcreate .stat { display: flex; align-items: center; gap: 8px; font-size: 9px; color: #8a967f; }
#charcreate .stat .sn { width: 54px; letter-spacing: 1px; }
#charcreate .stat .sb { flex: 1; height: 10px; background: #0e130d; box-shadow: inset 0 0 0 1px #2c352c; display: flex; gap: 2px; padding: 2px; }
#charcreate .stat .sb i { flex: 1; background: #1a2416; }
#charcreate .stat .sb i.on { background: var(--cc); box-shadow: inset 0 -2px 0 rgba(0,0,0,0.35); }
#charcreate .skills .sk {
  display: flex; gap: 8px; align-items: center; padding: 6px 8px; margin-bottom: 5px;
  background: #131a12; box-shadow: inset 0 0 0 2px #2c352c; font-size: 10px; color: #cfd8c8;
}
#charcreate .skills img { width: 20px; height: 20px; image-rendering: pixelated; }
#charcreate .skills small { display: block; color: #7d8f74; font-size: 8px; margin-top: 2px; line-height: 1.5; }

/* ---- footer: name + begin ---- */
#charcreate .foot {
  display: flex; gap: 12px; align-items: stretch; justify-content: center;
  max-width: 1080px; width: 100%; margin: 0 auto; padding-bottom: 2px;
}
#charcreate .namewrap { display: flex; align-items: center; gap: 8px; padding: 0 12px; }
#charcreate .namewrap label { font-size: 9px; color: #b9a76a; letter-spacing: 2px; }
#charcreate input[type=text] {
  width: min(200px, 34vw); background: #0e130d; color: #e8e8d8; outline: none;
  font-family: inherit; font-size: 13px; padding: 9px 10px; border: 0;
  box-shadow: inset 0 0 0 2px #3a4633;
}
#charcreate input[type=text]:focus { box-shadow: inset 0 0 0 2px #c8b060; }
#charcreate .go {
  flex: 0 1 340px; padding: 13px 20px; text-align: center; cursor: pointer;
  font-family: inherit; font-size: 14px; letter-spacing: 4px;
  background: linear-gradient(180deg, #6a5430, #46381e); color: #ffe9b0; border: 0;
  text-shadow: 0 2px 0 #241c0a;
  box-shadow:
    0 -3px 0 0 #c8a03a, 0 3px 0 0 #2a2210, -3px 0 0 0 #8a744a, 3px 0 0 0 #8a744a,
    0 -6px 0 0 #090c08, 0 6px 0 0 #090c08, -6px 0 0 0 #090c08, 6px 0 0 0 #090c08,
    0 0 24px rgba(200,160,58,0.25);
  position: relative; overflow: hidden;
}
#charcreate .go::after {
  content: ''; position: absolute; top: 0; left: -80%; width: 40%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255,235,170,0.25), transparent);
  animation: cc-shine 3.2s ease-in-out infinite;
}
@keyframes cc-shine { 0%, 60% { left: -80%; } 100% { left: 130%; } }
#charcreate .go:hover { filter: brightness(1.18); }

/* ---- mobile: preview on top, panel fills the rest ---- */
@media (max-width: 860px) {
  #charcreate { padding: 8px; gap: 8px; }
  #charcreate .head h1 { font-size: 17px; letter-spacing: 6px; }
  #charcreate .head .sub { display: none; }
  #charcreate .main { grid-template-columns: 1fr; grid-template-rows: 30vh 1fr; gap: 12px; }
  #charcreate .stagebox { min-height: 0; }
  #charcreate .classes { grid-template-columns: 1fr 1fr; }
  #charcreate .foot { flex-wrap: wrap; gap: 8px; }
  #charcreate .namewrap { padding: 6px 10px; }
  #charcreate .go { flex: 1 1 100%; font-size: 12px; padding: 12px; }
  #charcreate .panel-body { padding: 11px; }
  #charcreate .sw { width: 34px; height: 30px; }
  #charcreate .segs button { padding: 10px 4px; }
}
`;

export function showCharacterCreation(savedGame) {
  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const config = { ...defaultCharacter(), ...(savedGame?.character || {}) };
    // migrate any legacy save fields
    // ORIGIN, always. A new hero has no class — that is chosen at Lv10 from
    // Grand Master Vell, and offering the six here would give away the one
    // decision the first ten levels exist to earn.
    config.cls = 'origin';

    const root = document.createElement('div');
    root.id = 'charcreate';
    document.body.appendChild(root);

    root.innerHTML = `
      <div class="head">
        <h1>SEMESTA</h1><span class="sub">FORGE YOUR LEGEND</span>
        ${savedGame ? `<button class="continue">▶ CONTINUE — ${savedGame.character.name} · Lv${savedGame.level || 1}</button>` : ''}
      </div>
      <div class="main">
        <div class="stagebox pix">
          <canvas></canvas>
          <span class="draghint">◂ DRAG TO ROTATE ▸</span>
          <button class="dice" title="Randomize appearance">🎲</button>
          <div class="pname"></div>
        </div>
        <div class="panelbox">
          <div class="tabs">
            <button data-tab="class" class="on">⚔ ORIGIN</button>
            <button data-tab="body">☺ BODY</button>
            <button data-tab="outfit">🧥 OUTFIT</button>
          </div>
          <div class="panel-body pix">
            <div class="pane on" data-pane="class">
              <div class="classes"></div>
              <div class="clsdesc"></div>
              <div class="stats"></div>
              <div class="skills"></div>
            </div>
            <div class="pane" data-pane="body">
              <div class="row"><label>GENDER</label><div class="segs genders"></div></div>
              <div class="row"><label>SKIN TONE</label><div class="swatches skin"></div></div>
              <div class="row"><label>HAIR STYLE</label><div class="segs hairstyle"></div></div>
              <div class="row"><label>HAIR COLOR</label><div class="swatches hairc"></div></div>
              <div class="row"><label>EYE COLOR</label><div class="swatches eyes"></div></div>
              <div class="row"><label>FACE</label><div class="segs accessory"></div></div>
            </div>
            <div class="pane" data-pane="outfit">
              <div class="row"><label>OUTFIT STYLE</label><div class="segs outfitstyle"></div></div>
              <div class="row"><label>OUTFIT COLOR</label><div class="swatches outfit"></div></div>
              <div class="row"><label>CAPE</label><div class="swatches cape"></div></div>
              <div class="row" style="font-size:9px;color:#7d8f74;line-height:1.8;letter-spacing:1px">
                ✦ More styles await in-game: pull HATS, WINGS &amp; TRAILS from the gacha, then equip them in the WARDROBE [O].
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="foot">
        <div class="namewrap pix"><label>NAME</label><input type="text" maxlength="14" value="${config.name}"></div>
        <button class="go">⚔ &nbsp;BEGIN THE ADVENTURE&nbsp; ⚔</button>
      </div>
    `;

    // --- 3D preview ---
    const pCanvas = root.querySelector('.stagebox canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: false, alpha: true });
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    cam.position.set(0, 1.12, 3.0);
    cam.lookAt(0, 0.66, 0);
    scene.add(new THREE.HemisphereLight(0xcfd8c0, 0x3a443a, 1.2));
    const key = new THREE.DirectionalLight(0xfff2dc, 1.7);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8a03a, 0.8);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.92, 0.16, 8),
      new THREE.MeshLambertMaterial({ color: 0x4a5236 })
    );
    pedestal.position.y = -0.08;
    scene.add(pedestal);
    const pedestalTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.86, 0.04, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a7a3a })
    );
    pedestalTrim.position.y = -0.02;
    scene.add(pedestalTrim);
    // faint firefly dust drifting around the pedestal
    const dustGeo = new THREE.BufferGeometry();
    const DUST = 26;
    const dustPos = new Float32Array(DUST * 3);
    const dustSeed = [];
    for (let i = 0; i < DUST; i++) dustSeed.push(Math.random() * 10);
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xd8c888, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    scene.add(dust);

    let rig = null;
    let userSpin = 0.4, spinVel = 0.55; // gentle idle turn, draggable
    function rebuild() {
      const prevRot = rig ? rig.group.rotation.y : userSpin;
      if (rig) scene.remove(rig.group);
      rig = buildCharacterMesh(config);
      const startW = CLASSES[config.cls].startWeapon;
      rig.setWeapon(startW);
      // The preview never posed the hand, so the blade hung straight down
      // through the body. Same pose the game uses every frame.
      applyCarryPose(rig.parts, ITEMS[startW]?.type);
      rig.group.rotation.y = prevRot;
      scene.add(rig.group);
    }
    rebuild();

    // drag (mouse/touch) to rotate the hero
    let dragging = false, lastX = 0;
    const dragStart = (x) => { dragging = true; lastX = x; spinVel = 0; };
    const dragMove = (x) => {
      if (!dragging || !rig) return;
      rig.group.rotation.y += (x - lastX) * 0.012;
      lastX = x;
    };
    const dragEnd = () => { dragging = false; };
    pCanvas.addEventListener('mousedown', (e) => dragStart(e.clientX));
    window.addEventListener('mousemove', (e) => dragMove(e.clientX));
    window.addEventListener('mouseup', dragEnd);
    pCanvas.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientX), { passive: true });
    pCanvas.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX), { passive: true });
    pCanvas.addEventListener('touchend', dragEnd);

    let alive = true;
    function resizePreview() {
      const r = pCanvas.parentElement.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
    }
    resizePreview();
    window.addEventListener('resize', resizePreview);

    let t0 = performance.now(), tt = 0;
    (function spin(now) {
      if (!alive) return;
      requestAnimationFrame(spin);
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; tt += dt;
      if (rig && !dragging) rig.group.rotation.y += dt * spinVel;
      spinVel += (0.55 - spinVel) * Math.min(1, dt * 0.5); // ease back to idle spin
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        dustPos[i * 3] = Math.cos(tt * 0.24 + s * 2.4) * (0.9 + Math.sin(s) * 0.25);
        dustPos[i * 3 + 1] = 0.25 + ((tt * 0.07 + s * 0.6) % 1.5);
        dustPos[i * 3 + 2] = Math.sin(tt * 0.24 + s * 2.4) * (0.9 + Math.cos(s) * 0.25);
      }
      dustGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
    })(t0);

    // --- tabs ---
    root.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
        root.querySelectorAll('.pane').forEach((p) =>
          p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
      });
    });

    // --- form controls ---
    const els = {
      name: root.querySelector('input'),
      pname: root.querySelector('.pname'),
      genders: root.querySelector('.genders'),
      classes: root.querySelector('.classes'),
      clsdesc: root.querySelector('.clsdesc'),
      stats: root.querySelector('.stats'),
      skills: root.querySelector('.skills'),
      skin: root.querySelector('.swatches.skin'),
      hairc: root.querySelector('.swatches.hairc'),
      eyes: root.querySelector('.swatches.eyes'),
      accessory: root.querySelector('.segs.accessory'),
      outfit: root.querySelector('.swatches.outfit'),
      cape: root.querySelector('.swatches.cape'),
      hairstyle: root.querySelector('.segs.hairstyle'),
      outfitstyle: root.querySelector('.segs.outfitstyle'),
    };

    const swatchRow = (el, colors, sel, extraNone = false) => {
      let h = extraNone ? `<div class="sw none ${sel === -1 ? 'sel' : ''}" data-i="-1"></div>` : '';
      h += colors.map((c, i) =>
        `<div class="sw ${sel === i ? 'sel' : ''}" data-i="${i}" style="background:${c}"></div>`).join('');
      el.innerHTML = h;
    };

    function renderForm() {
      els.pname.textContent = `${config.name} · ${CLASSES[config.cls].name}`;
      els.genders.innerHTML = Object.entries(GENDERS)
        .map(([id, nm]) => `<button data-g="${id}" class="${config.gender === id ? 'sel' : ''}">${nm}</button>`).join('');
      els.hairstyle.innerHTML = HAIR_STYLES
        .map((nm, i) => `<button data-hs="${i}" class="${config.hairStyle === i ? 'sel' : ''}">${nm}</button>`).join('');
      els.outfitstyle.innerHTML = OUTFIT_STYLES
        .map((nm, i) => `<button data-os="${i}" class="${config.outfitStyle === i ? 'sel' : ''}">${nm}</button>`).join('');
      els.accessory.innerHTML = ACCESSORIES
        .map((nm, i) => `<button data-ac="${i}" class="${(config.accessory ?? 0) === i ? 'sel' : ''}">${nm}</button>`).join('');
      swatchRow(els.skin, SKIN_TONES, config.skin);
      swatchRow(els.hairc, HAIR_COLORS, config.hairColor);
      swatchRow(els.eyes, EYE_COLORS, config.eyes);
      swatchRow(els.outfit, OUTFIT_COLORS, config.outfit);
      swatchRow(els.cape, CAPE_COLORS, config.cape, true);

      const c = CLASSES.origin;
      // One card, and it is not a choice — it is an explanation of why there is
      // no choice yet. A greyed-out row of six locked classes would read as
      // content withheld; one card that names the moment reads as a promise.
      els.classes.innerHTML = `
        <div class="cls sel" style="--cc:${c.color}">
          <img class="w" src="${itemIconUrl(c.startWeapon)}">
          <div><div class="cn">${c.name}</div><div class="ct">${c.tagline.toUpperCase()}</div></div>
        </div>
        <div class="clsnote">
          Everyone begins the same way: one borrowed sword, no skills.<br>
          At <b>Lv10</b> the Grand Master will ask what you mean to become —
          Warrior, Archer, Mage, Priest, Assassin or Summoner.
        </div>`;
      els.clsdesc.textContent = c.desc;
      els.stats.innerHTML = Object.entries({ POWER: c.stats.power, SPEED: c.stats.speed, RANGE: c.stats.range, DEFENSE: c.stats.defense })
        .map(([nm, v]) => `<div class="stat" style="--cc:${c.color}"><span class="sn">${nm}</span>
          <div class="sb">${Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</div></div>`).join('');
      els.skills.innerHTML = c.skills.length
        ? c.skills.map((s) => `<div class="sk"><img src="${skillIconUrl(s, SKILLS[s].icon)}">
            <div>${SKILLS[s].name}<small>${SKILLS[s].desc}</small></div></div>`).join('')
        : `<div class="sk noskill"><div>No skills yet<small>Swing, roll, and read the tell.
            Your first three arrive with your class at Lv10.</small></div></div>`;
    }
    renderForm();

    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]');
      if (g) { config.gender = g.dataset.g; renderForm(); rebuild(); return; }
      const c = e.target.closest('[data-c]');
      if (c) return;   // the Origin card is not a choice — see renderForm()
      const hs = e.target.closest('[data-hs]');
      if (hs) { config.hairStyle = +hs.dataset.hs; renderForm(); rebuild(); return; }
      const os = e.target.closest('[data-os]');
      if (os) { config.outfitStyle = +os.dataset.os; renderForm(); rebuild(); return; }
      const ac = e.target.closest('[data-ac]');
      if (ac) { config.accessory = +ac.dataset.ac; renderForm(); rebuild(); return; }
      const sw = e.target.closest('.sw');
      if (sw) {
        const i = +sw.dataset.i;
        if (sw.parentElement === els.skin) config.skin = i;
        else if (sw.parentElement === els.hairc) config.hairColor = i;
        else if (sw.parentElement === els.eyes) config.eyes = i;
        else if (sw.parentElement === els.outfit) config.outfit = i;
        else if (sw.parentElement === els.cape) config.cape = i;
        renderForm(); rebuild(); return;
      }
      if (e.target.closest('.dice')) {
        const ri = (n) => Math.floor(Math.random() * n);
        config.gender = Math.random() < 0.5 ? 'male' : 'female';
        config.skin = ri(SKIN_TONES.length);
        config.hairStyle = ri(HAIR_STYLES.length);
        config.hairColor = ri(HAIR_COLORS.length);
        config.eyes = ri(EYE_COLORS.length);
        config.accessory = ri(ACCESSORIES.length);
        config.outfitStyle = ri(OUTFIT_STYLES.length);
        config.outfit = ri(OUTFIT_COLORS.length);
        config.cape = ri(CAPE_COLORS.length + 1) - 1;
        renderForm(); rebuild();
      }
    });

    els.name.addEventListener('input', () => {
      config.name = els.name.value.trim() || 'Adventurer';
      els.pname.textContent = `${config.name} · ${CLASSES[config.cls].name}`;
    });

    function finish(continued) {
      alive = false;
      window.removeEventListener('resize', resizePreview);
      renderer.dispose();
      root.remove();
      resolve({ config: continued ? { ...defaultCharacter(), ...savedGame.character } : config, continued });
    }

    root.querySelector('.go').addEventListener('click', () => finish(false));
    root.querySelector('.continue')?.addEventListener('click', () => finish(true));
  });
}
