// Character Creation — dark-fantasy MMO layout: appearance column, live 3D
// hero preview on a pedestal, class column with stat bars & skills.
// Resolves with Promise<{config, continued}>.
import * as THREE from 'three';
import { buildCharacterMesh } from '../entities/player.js';
import {
  CLASSES, GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_COLORS,
  OUTFIT_STYLES, OUTFIT_COLORS, CAPE_COLORS, ACCESSORIES, defaultCharacter,
} from '../systems/classes.js';
import { SKILLS } from '../systems/skills.js';
import { skillIconUrl, itemIconUrl } from '../gfx/textures.js';

const CSS = `
#charcreate {
  position: fixed; inset: 0; z-index: 90; overflow-y: auto;
  background:
    radial-gradient(ellipse at 50% -10%, #2a3320 0%, transparent 55%),
    radial-gradient(ellipse at 15% 90%, #1a2418 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, #241a28 0%, transparent 45%),
    #0b0f0a;
  color: #d8e0d0; font-family: inherit;
}
#charcreate .inner { max-width: 1060px; margin: 0 auto; padding: 18px 14px 30px; }
#charcreate h1 {
  text-align: center; font-size: 38px; letter-spacing: 12px;
  color: #e8d9a8; margin-top: 6px;
  text-shadow: 0 0 24px #c8a03a44, 0 3px 0 #3a3016, 0 6px 14px #000;
}
#charcreate .subtitle {
  text-align: center; font-size: 10px; color: #8a967f; letter-spacing: 6px; margin: 4px 0 16px;
}
#charcreate .continue {
  display: block; margin: 0 auto 14px; padding: 10px 26px; font-family: inherit;
  font-size: 12px; letter-spacing: 2px; cursor: pointer;
  background: linear-gradient(180deg, #23303c, #182028); color: #c8dce8; border: 2px solid #3a5a6a;
}
#charcreate .continue:hover { filter: brightness(1.25); }
#charcreate .cols { display: flex; gap: 14px; align-items: stretch; }
#charcreate .col { display: flex; flex-direction: column; gap: 10px; }
#charcreate .col.left { flex: 1.05; min-width: 250px; }
#charcreate .col.mid { flex: 1; min-width: 240px; }
#charcreate .col.right { flex: 1.05; min-width: 250px; }

#charcreate .box {
  background: linear-gradient(180deg, var(--panel-1, rgba(22,28,18,0.92)), var(--panel-2, rgba(13,17,11,0.92)));
  border: 2px solid var(--line, #3a4633);
  box-shadow: inset 0 0 0 1px var(--gold-glow, #c8b06033), 0 0 0 1px var(--ink, #060906);
  clip-path: var(--cut);
  padding: 13px;
}
#charcreate .box .bt {
  font-size: 10px; letter-spacing: 3px; color: var(--gold, #c8b060); margin-bottom: 10px;
  border-bottom: 1px solid var(--gold-dim, #3a4633); padding-bottom: 6px;
}
#charcreate .box .bt::before { content: '◆ '; font-size: 8px; color: var(--gold-dim); vertical-align: 1px; }
#charcreate .row { margin-bottom: 10px; }
#charcreate .row:last-child { margin-bottom: 0; }
#charcreate .row label { display: block; font-size: 9px; color: #8a967f; letter-spacing: 2px; margin-bottom: 5px; }
#charcreate input[type=text] {
  width: 100%; background: #0e130d; border: 2px solid #3a4633; color: #e8e8d8;
  font-family: inherit; font-size: 14px; padding: 7px 10px; outline: none;
}
#charcreate input[type=text]:focus { border-color: #c8b060; }
#charcreate .segs { display: flex; gap: 5px; flex-wrap: wrap; }
#charcreate .segs button {
  flex: 1; min-width: 60px; background: #131a12; border: 2px solid #2c352c; color: #aab5a0;
  font-family: inherit; font-size: 11px; padding: 7px 4px; cursor: pointer;
}
#charcreate .segs button.sel { border-color: #c8b060; color: #f0e5c0; background: #23291a; }
#charcreate .swatches { display: flex; gap: 5px; flex-wrap: wrap; }
#charcreate .sw {
  width: 26px; height: 22px; border: 2px solid #2c352c; cursor: pointer; position: relative;
}
#charcreate .sw.sel { border-color: #f0e5c0; box-shadow: 0 0 7px #c8b06088; }
#charcreate .sw.none { background: repeating-linear-gradient(45deg, #131a12, #131a12 4px, #202a20 4px, #202a20 8px); }
#charcreate .sw.none::after { content: '✕'; position: absolute; inset: 0; text-align: center; line-height: 20px; font-size: 11px; color: #8a967f; }

#charcreate .previewbox {
  flex: 1; min-height: 380px; position: relative; overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 88%, #c8b06022 0%, transparent 40%),
    linear-gradient(180deg, #10160f, #0b100a);
  border: 2px solid #4a5236; box-shadow: 0 0 0 1px #060906, inset 0 0 60px #0009, 0 6px 18px #000a;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
}
#charcreate .previewbox canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#charcreate .previewbox .pname {
  position: relative; z-index: 2; margin-bottom: 12px; font-size: 13px; color: #f0e5c0;
  background: #000a; padding: 4px 14px; border: 1px solid #4a5236; letter-spacing: 1px;
}
#charcreate .previewbox .dice {
  position: absolute; top: 8px; right: 8px; z-index: 2; cursor: pointer;
  background: #131a12cc; border: 2px solid #3a4633; color: #d8e0d0;
  font-family: inherit; font-size: 14px; padding: 6px 10px;
}
#charcreate .previewbox .dice:hover { border-color: #c8b060; }
#charcreate .previewbox .hintspin {
  position: absolute; bottom: 46px; z-index: 2; font-size: 8px; letter-spacing: 2px; color: #6a7a62;
}

#charcreate .classes { display: flex; flex-direction: column; gap: 6px; }
#charcreate .cls {
  display: flex; align-items: center; gap: 10px;
  background: #131a12; border: 2px solid #2c352c; padding: 8px 10px; cursor: pointer;
}
#charcreate .cls.sel { border-color: var(--cc); background: #1c231a; box-shadow: inset 0 0 14px #0008, 0 0 8px var(--cc) inset; }
#charcreate .cls img.w { width: 26px; height: 26px; image-rendering: pixelated; }
#charcreate .cls .cn { font-size: 13px; color: var(--cc); }
#charcreate .cls .ct { font-size: 8px; color: #8a967f; letter-spacing: 1px; margin-top: 2px; }
#charcreate .clsdesc { font-size: 10px; color: #9aa890; line-height: 1.7; min-height: 44px; }
#charcreate .stats { display: flex; flex-direction: column; gap: 5px; }
#charcreate .stat { display: flex; align-items: center; gap: 8px; font-size: 9px; color: #8a967f; }
#charcreate .stat .sn { width: 52px; letter-spacing: 1px; }
#charcreate .stat .sb { flex: 1; height: 8px; background: #0e130d; border: 1px solid #2c352c; }
#charcreate .stat .sb > div { height: 100%; background: linear-gradient(90deg, var(--cc), var(--cc)); opacity: 0.85; }
#charcreate .skills { display: flex; flex-direction: column; gap: 5px; }
#charcreate .skills .sk {
  display: flex; gap: 8px; align-items: center; background: #131a12;
  border: 2px solid #2c352c; padding: 5px 8px; font-size: 10px; color: #cfd8c8;
}
#charcreate .skills img { width: 20px; height: 20px; image-rendering: pixelated; }
#charcreate .skills small { display: block; color: #7d8f74; font-size: 8px; margin-top: 2px; line-height: 1.5; }

#charcreate .go {
  display: block; width: min(420px, 90%); margin: 18px auto 0; padding: 15px; text-align: center;
  font-family: inherit; font-size: 17px; letter-spacing: 5px; cursor: pointer;
  background: linear-gradient(180deg, #57452a, #3a2e18);
  color: #ffe9b0; border: 2px solid #c8a03a; text-shadow: 0 2px 0 #241c0a;
  box-shadow: 0 0 20px #c8a03a33, 0 6px 16px #000a;
}
#charcreate .go:hover { filter: brightness(1.2); }

@media (max-width: 900px) {
  #charcreate .cols { flex-direction: column; }
  #charcreate .col.mid { order: -1; }
  #charcreate .previewbox { min-height: 260px; }
  #charcreate h1 { font-size: 26px; letter-spacing: 8px; }
}
`;

export function showCharacterCreation(savedGame) {
  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const config = { ...defaultCharacter(), ...(savedGame?.character || {}) };
    // migrate any legacy save fields
    if (!(config.cls in CLASSES)) config.cls = 'knight';

    const root = document.createElement('div');
    root.id = 'charcreate';
    document.body.appendChild(root);

    root.innerHTML = `
      <div class="inner">
        <h1>SEMESTA</h1>
        <div class="subtitle">— FORGE YOUR LEGEND —</div>
        ${savedGame ? `<button class="continue">▶ CONTINUE — ${savedGame.character.name} · Lv${savedGame.level || 1}</button>` : ''}
        <div class="cols">
          <div class="col left">
            <div class="box">
              <div class="bt">IDENTITY</div>
              <div class="row"><label>NAME</label><input type="text" maxlength="14" value="${config.name}"></div>
              <div class="row"><label>GENDER</label><div class="segs genders"></div></div>
            </div>
            <div class="box" style="flex:1">
              <div class="bt">APPEARANCE</div>
              <div class="row"><label>SKIN TONE</label><div class="swatches skin"></div></div>
              <div class="row"><label>HAIR STYLE</label><div class="segs hairstyle"></div></div>
              <div class="row"><label>HAIR COLOR</label><div class="swatches hairc"></div></div>
              <div class="row"><label>EYE COLOR</label><div class="swatches eyes"></div></div>
              <div class="row"><label>FACE</label><div class="segs accessory"></div></div>
              <div class="row"><label>OUTFIT</label><div class="segs outfitstyle"></div></div>
              <div class="row"><label>OUTFIT COLOR</label><div class="swatches outfit"></div></div>
              <div class="row"><label>CAPE</label><div class="swatches cape"></div></div>
            </div>
          </div>
          <div class="col mid">
            <div class="previewbox">
              <canvas></canvas>
              <button class="dice" title="Randomize appearance">🎲</button>
              <div class="hintspin">PREVIEW ROTATES</div>
              <div class="pname"></div>
            </div>
          </div>
          <div class="col right">
            <div class="box">
              <div class="bt">CLASS</div>
              <div class="classes"></div>
              <div class="clsdesc" style="margin-top:8px"></div>
            </div>
            <div class="box">
              <div class="bt">ATTRIBUTES</div>
              <div class="stats"></div>
            </div>
            <div class="box" style="flex:1">
              <div class="bt">CLASS SKILLS</div>
              <div class="skills"></div>
            </div>
          </div>
        </div>
        <button class="go">⚔ &nbsp;BEGIN THE ADVENTURE&nbsp; ⚔</button>
      </div>
    `;

    // --- 3D preview ---
    const pCanvas = root.querySelector('.previewbox canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: false, alpha: true });
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    cam.position.set(0, 1.15, 3.1);
    cam.lookAt(0, 0.68, 0);
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

    let rig = null;
    function rebuild() {
      const prevRot = rig ? rig.group.rotation.y : 0.4;
      if (rig) scene.remove(rig.group);
      rig = buildCharacterMesh(config);
      rig.setWeapon(CLASSES[config.cls].startWeapon);
      rig.group.rotation.y = prevRot;
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
      if (rig) rig.group.rotation.y += dt * 0.8;
      renderer.render(scene, cam);
    })(t0);

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

      const c = CLASSES[config.cls];
      els.classes.innerHTML = Object.entries(CLASSES).map(([id, cc]) =>
        `<div class="cls ${config.cls === id ? 'sel' : ''}" data-c="${id}" style="--cc:${cc.color}">
          <img class="w" src="${itemIconUrl(cc.startWeapon)}">
          <div><div class="cn">${cc.name}</div><div class="ct">${cc.tagline.toUpperCase()}</div></div>
        </div>`).join('');
      els.clsdesc.textContent = c.desc;
      els.stats.innerHTML = Object.entries({ POWER: c.stats.power, SPEED: c.stats.speed, RANGE: c.stats.range, DEFENSE: c.stats.defense })
        .map(([nm, v]) => `<div class="stat" style="--cc:${c.color}"><span class="sn">${nm}</span>
          <div class="sb"><div style="width:${v * 20}%"></div></div></div>`).join('');
      els.skills.innerHTML = c.skills.map((s) =>
        `<div class="sk"><img src="${skillIconUrl(s, SKILLS[s].icon)}">
          <div>${SKILLS[s].name}<small>${SKILLS[s].desc}</small></div></div>`).join('');
    }
    renderForm();

    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]');
      if (g) { config.gender = g.dataset.g; renderForm(); rebuild(); return; }
      const c = e.target.closest('[data-c]');
      if (c) { config.cls = c.dataset.c; renderForm(); rebuild(); return; }
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
