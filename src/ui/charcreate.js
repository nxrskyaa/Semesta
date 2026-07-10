// Layar Create Character: nama, gender, class (MMO style), kustomisasi penuh,
// dengan preview karakter 3D yang berputar. Mengembalikan Promise<{config, continued}>.
import * as THREE from 'three';
import { buildCharacterMesh } from '../entities/player.js';
import {
  CLASSES, GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, OUTFIT_COLORS, defaultCharacter,
} from '../systems/classes.js';
import { SKILLS } from '../systems/skills.js';
import { skillIconUrl, itemIconUrl } from '../gfx/textures.js';
import { ITEMS } from '../systems/items.js';

const CSS = `
#charcreate {
  position: fixed; inset: 0; z-index: 90; overflow-y: auto;
  background:
    radial-gradient(ellipse at 30% 20%, #1c2a1c 0%, transparent 60%),
    radial-gradient(ellipse at 80% 80%, #16201a 0%, transparent 55%),
    #0e140e;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit; color: #d8e0d0;
}
#charcreate .wrap {
  display: flex; gap: 22px; padding: 22px; max-width: 900px; width: 100%;
  align-items: stretch; flex-wrap: wrap; justify-content: center;
}
#charcreate h1 {
  width: 100%; text-align: center; font-size: 34px; letter-spacing: 10px;
  color: #cfe3b8; text-shadow: 0 3px 0 #2a3a22, 0 6px 14px #000;
  margin-bottom: 2px;
}
#charcreate .subtitle { width: 100%; text-align: center; font-size: 11px; color: #7d8f74; letter-spacing: 3px; margin-bottom: 10px; }
#charcreate .previewbox {
  width: 280px; min-height: 380px; flex-shrink: 0;
  background: linear-gradient(180deg, #131b13, #0f150f);
  border: 3px solid #39443a; box-shadow: 0 6px 24px #000a, inset 0 0 40px #0006;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  position: relative;
}
#charcreate .previewbox canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#charcreate .previewbox .pname {
  position: relative; z-index: 2; margin-bottom: 12px; font-size: 13px; color: #e8e8d8;
  background: #0009; padding: 3px 12px; border: 1px solid #39443a;
}
#charcreate .form { flex: 1; min-width: 300px; max-width: 430px; display: flex; flex-direction: column; gap: 10px; }
#charcreate .row label { display: block; font-size: 10px; color: #8a967f; letter-spacing: 2px; margin-bottom: 4px; }
#charcreate input[type=text] {
  width: 100%; background: #10160f; border: 2px solid #39443a; color: #e8e8d8;
  font-family: inherit; font-size: 14px; padding: 7px 10px; outline: none;
}
#charcreate input[type=text]:focus { border-color: #9ab86a; }
#charcreate .genders { display: flex; gap: 6px; }
#charcreate .genders button, #charcreate .pill {
  flex: 1; background: #161d16; border: 2px solid #2c352c; color: #aab5a0;
  font-family: inherit; font-size: 12px; padding: 8px; cursor: pointer;
}
#charcreate .genders button.sel { border-color: #9ab86a; color: #dcedc8; background: #22301e; }
#charcreate .classes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
#charcreate .cls {
  background: #161d16; border: 2px solid #2c352c; padding: 8px; cursor: pointer; position: relative;
}
#charcreate .cls.sel { border-color: var(--cc); background: #1d261c; box-shadow: 0 0 10px #0006 inset; }
#charcreate .cls .cn { font-size: 13px; color: var(--cc); }
#charcreate .cls .ct { font-size: 9px; color: #8a967f; margin-top: 2px; letter-spacing: 1px; }
#charcreate .cls img.w { position: absolute; top: 7px; right: 7px; width: 22px; height: 22px; image-rendering: pixelated; }
#charcreate .clsdesc { font-size: 10px; color: #9aa890; line-height: 1.6; min-height: 30px; }
#charcreate .skills { display: flex; gap: 6px; }
#charcreate .skills .sk {
  display: flex; gap: 5px; align-items: center; background: #161d16;
  border: 2px solid #2c352c; padding: 4px 7px; font-size: 9px; color: #aab5a0; flex: 1;
}
#charcreate .skills img { width: 18px; height: 18px; image-rendering: pixelated; }
#charcreate .swatches { display: flex; gap: 5px; flex-wrap: wrap; }
#charcreate .sw {
  width: 30px; height: 24px; border: 2px solid #2c352c; cursor: pointer;
}
#charcreate .sw.sel { border-color: #e8e8d8; box-shadow: 0 0 6px #fff5; }
#charcreate .stepper { display: flex; align-items: center; gap: 8px; }
#charcreate .stepper button {
  width: 34px; height: 30px; background: #161d16; border: 2px solid #2c352c;
  color: #dcedc8; font-family: inherit; font-size: 14px; cursor: pointer;
}
#charcreate .stepper span { flex: 1; text-align: center; font-size: 12px; }
#charcreate .go {
  margin-top: 6px; padding: 13px; font-family: inherit; font-size: 16px; letter-spacing: 4px;
  background: linear-gradient(180deg, #3d5c35, #2c4527); color: #e5f0d5;
  border: 3px solid #5a7a4a; cursor: pointer; text-shadow: 0 2px 0 #1a2a15;
}
#charcreate .go:hover { filter: brightness(1.15); }
#charcreate .continue {
  padding: 10px; font-family: inherit; font-size: 12px; letter-spacing: 2px;
  background: #1d2a33; color: #c8dcE8; border: 2px solid #3a5a6a; cursor: pointer;
}
@media (max-width: 700px) {
  #charcreate .wrap { padding: 12px; gap: 12px; }
  #charcreate .previewbox { width: 100%; min-height: 240px; }
  #charcreate h1 { font-size: 26px; }
}
`;

export function showCharacterCreation(savedGame) {
  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const config = savedGame?.character ? { ...savedGame.character } : defaultCharacter();

    const root = document.createElement('div');
    root.id = 'charcreate';
    document.body.appendChild(root);

    root.innerHTML = `
      <div class="wrap">
        <h1>SEMESTA</h1>
        <div class="subtitle">CIPTAKAN LEGENDAMU</div>
        <div class="previewbox">
          <canvas></canvas>
          <div class="pname"></div>
        </div>
        <div class="form">
          ${savedGame ? `<button class="continue">▶ LANJUTKAN — ${savedGame.character.name} · ${CLASSES[savedGame.character.cls].name} Lv${savedGame.level || 1}</button>` : ''}
          <div class="row"><label>NAMA</label><input type="text" maxlength="14" value="${config.name}"></div>
          <div class="row"><label>GENDER</label><div class="genders"></div></div>
          <div class="row"><label>CLASS</label><div class="classes"></div><div class="clsdesc" style="margin-top:5px"></div></div>
          <div class="row"><label>SKILL CLASS</label><div class="skills"></div></div>
          <div class="row"><label>WARNA KULIT</label><div class="swatches skin"></div></div>
          <div class="row"><label>GAYA RAMBUT</label><div class="stepper hair">
            <button data-d="-1">&lt;</button><span></span><button data-d="1">&gt;</button></div></div>
          <div class="row"><label>WARNA RAMBUT</label><div class="swatches hairc"></div></div>
          <div class="row"><label>WARNA PAKAIAN</label><div class="swatches outfit"></div></div>
          <button class="go">⚔ MULAI PETUALANGAN</button>
        </div>
      </div>
    `;

    // --- preview 3D ---
    const pCanvas = root.querySelector('.previewbox canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: false, alpha: true });
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    cam.position.set(0, 1.35, 3.4);
    cam.lookAt(0, 0.75, 0);
    scene.add(new THREE.HemisphereLight(0xbfccb8, 0x3a443a, 1.15));
    const key = new THREE.DirectionalLight(0xfff2dc, 1.6);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.18, 8),
      new THREE.MeshLambertMaterial({ color: 0x39443a })
    );
    pedestal.position.y = -0.09;
    scene.add(pedestal);

    let rig = null;
    function rebuild() {
      if (rig) scene.remove(rig.group);
      rig = buildCharacterMesh(config);
      rig.setWeapon(CLASSES[config.cls].startWeapon);
      scene.add(rig.group);
    }
    rebuild();

    let alive = true;
    function resizePreview() {
      const r = pCanvas.parentElement.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
    }
    resizePreview();
    window.addEventListener('resize', resizePreview);

    let t0 = performance.now();
    (function spin(now) {
      if (!alive) return;
      requestAnimationFrame(spin);
      const dt = (now - t0) / 1000; t0 = now;
      if (rig) rig.group.rotation.y += dt * 0.9;
      renderer.render(scene, cam);
    })(t0);

    // --- kontrol form ---
    const els = {
      name: root.querySelector('input'),
      pname: root.querySelector('.pname'),
      genders: root.querySelector('.genders'),
      classes: root.querySelector('.classes'),
      clsdesc: root.querySelector('.clsdesc'),
      skills: root.querySelector('.skills'),
      skin: root.querySelector('.swatches.skin'),
      hairc: root.querySelector('.swatches.hairc'),
      outfit: root.querySelector('.swatches.outfit'),
      hairLabel: root.querySelector('.stepper.hair span'),
    };

    function renderForm() {
      els.pname.textContent = `${config.name} · ${CLASSES[config.cls].name}`;
      els.genders.innerHTML = Object.entries(GENDERS)
        .map(([id, nm]) => `<button data-g="${id}" class="${config.gender === id ? 'sel' : ''}">${nm}</button>`).join('');
      els.classes.innerHTML = Object.entries(CLASSES).map(([id, c]) =>
        `<div class="cls ${config.cls === id ? 'sel' : ''}" data-c="${id}" style="--cc:${c.color}">
          <img class="w" src="${itemIconUrl(c.startWeapon)}">
          <div class="cn">${c.name}</div><div class="ct">${c.tagline.toUpperCase()}</div>
        </div>`).join('');
      els.clsdesc.textContent = CLASSES[config.cls].desc;
      els.skills.innerHTML = CLASSES[config.cls].skills.map((s) =>
        `<div class="sk" title="${SKILLS[s].desc}"><img src="${skillIconUrl(s, SKILLS[s].icon)}">${SKILLS[s].name}</div>`).join('');
      els.skin.innerHTML = SKIN_TONES.map((c, i) =>
        `<div class="sw ${config.skin === i ? 'sel' : ''}" data-i="${i}" style="background:${c}"></div>`).join('');
      els.hairc.innerHTML = HAIR_COLORS.map((c, i) =>
        `<div class="sw ${config.hairColor === i ? 'sel' : ''}" data-i="${i}" style="background:${c}"></div>`).join('');
      els.outfit.innerHTML = OUTFIT_COLORS.map((c, i) =>
        `<div class="sw ${config.outfit === i ? 'sel' : ''}" data-i="${i}" style="background:${c}"></div>`).join('');
      els.hairLabel.textContent = HAIR_STYLES[config.hairStyle];
    }
    renderForm();

    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]');
      if (g) { config.gender = g.dataset.g; renderForm(); rebuild(); return; }
      const c = e.target.closest('[data-c]');
      if (c) { config.cls = c.dataset.c; renderForm(); rebuild(); return; }
      const sw = e.target.closest('.sw');
      if (sw) {
        const i = +sw.dataset.i;
        if (sw.parentElement === els.skin) config.skin = i;
        else if (sw.parentElement === els.hairc) config.hairColor = i;
        else if (sw.parentElement === els.outfit) config.outfit = i;
        renderForm(); rebuild(); return;
      }
      const st = e.target.closest('.stepper button');
      if (st) {
        config.hairStyle = (config.hairStyle + +st.dataset.d + 5) % 5;
        renderForm(); rebuild(); return;
      }
    });

    els.name.addEventListener('input', () => {
      config.name = els.name.value.trim() || 'Petualang';
      els.pname.textContent = `${config.name} · ${CLASSES[config.cls].name}`;
    });

    function finish(continued) {
      alive = false;
      window.removeEventListener('resize', resizePreview);
      renderer.dispose();
      root.remove();
      resolve({ config: continued ? savedGame.character : config, continued });
    }

    root.querySelector('.go').addEventListener('click', () => finish(false));
    root.querySelector('.continue')?.addEventListener('click', () => finish(true));
  });
}
