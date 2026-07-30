// Opening sequence: pixel-sky loading screen (drifting clouds, floating
// islands, snowy peaks, rising light beams — styled after the key art) with
// the SEMESTA logo, then the main menu: New Game / Continue / About.
// The logo & mascot are the only image assets in the game (everything else
// stays procedural).
import logoUrl from '../../logoasset/semesta.png';
import mascotUrl from '../../logoasset/nxrmascott.png';
import { paintRialoMark } from '../world/landmarks.js';
import { aboutInner, paintAboutRialo } from './about.js';
import { createGfxPanel } from './gfxpanel.js';
import { cleanImage } from '../gfx/logo.js';

export { logoUrl, mascotUrl };

const CSS = `
#opening {
  position: fixed; inset: 0; z-index: 120; overflow: hidden;
  background: linear-gradient(180deg,
    #2e5aa8 0%, #4a7ec8 22%, #6ba3dd 45%, #9cc8ea 68%, #cfe6f2 88%, #e8f2f5 100%);
  font-family: inherit; color: #e8f0f8; user-select: none;
}
#opening.fadeout { transition: opacity 0.7s; opacity: 0; pointer-events: none; }

#opening .layer { position: absolute; inset: 0; pointer-events: none; }
#opening canvas.px { position: absolute; image-rendering: pixelated; }

/* twinkling star specks near the top */
#opening .stars b {
  position: absolute; width: 3px; height: 3px; background: #fff;
  animation: op-twinkle 2.4s ease-in-out infinite;
}
@keyframes op-twinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 0.95; } }
#opening .stars b.d { width: 5px; height: 5px; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); }

/* rising aurora light beams */
#opening .beam {
  position: absolute; bottom: 30%; width: 46px; height: 65%;
  background: linear-gradient(180deg, rgba(180,220,255,0) 0%, rgba(190,225,255,0.5) 45%, rgba(220,240,255,0.85) 100%);
  filter: blur(6px); transform-origin: bottom center;
  animation: op-beam 5s ease-in-out infinite;
}
@keyframes op-beam { 0%,100% { opacity: 0.35; transform: scaleY(0.92); } 50% { opacity: 0.85; transform: scaleY(1.04); } }

/* drifting pixel clouds */
#opening .cloud { position: absolute; image-rendering: pixelated; animation: op-drift linear infinite; }
@keyframes op-drift { from { transform: translateX(-14vw); } to { transform: translateX(114vw); } }

/* bobbing floating islands */
#opening .isle { position: absolute; image-rendering: pixelated; animation: op-bob ease-in-out infinite; }
@keyframes op-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }

/* logo */
#opening .logo-wrap {
  position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%);
  text-align: center; pointer-events: none;
}
#opening .logo-wrap img {
  width: min(560px, 82vw); image-rendering: pixelated;
  filter: drop-shadow(0 10px 24px rgba(10,20,50,0.55)) drop-shadow(0 0 34px rgba(140,190,255,0.35));
  animation: op-logo 4s ease-in-out infinite;
}
@keyframes op-logo { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

/* loading bar */
#opening .loadbox {
  position: absolute; left: 50%; bottom: 16%; transform: translateX(-50%);
  width: min(340px, 70vw); text-align: center;
}
#opening .loadbox .txt { font-size: 10px; letter-spacing: 4px; color: #f0f6fc; text-shadow: 0 2px 0 #2a4a7a; margin-bottom: 8px; }
#opening .loadbox .rialoline {
  display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 14px;
  font-size: 10px; letter-spacing: 4px; color: #e8e2d2; text-shadow: 0 2px 0 #2a4a7a;
}
#opening .loadbox .rialoline canvas {
  width: 22px; height: 22px; image-rendering: pixelated; border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(232,226,210,0.4), 0 2px 8px rgba(0,0,0,0.35);
}
#opening .loadbox .bar {
  height: 14px; border: 2px solid #22324e; background: rgba(16,26,44,0.75);
  box-shadow: inset 0 0 0 1px rgba(200,220,255,0.25), 0 3px 8px rgba(10,20,40,0.4);
}
#opening .loadbox .bar > div {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #d8b866, #ffe9a8, #d8b866);
  background-size: 200% 100%; animation: op-barshine 1.2s linear infinite;
  transition: width 0.25s;
}
@keyframes op-barshine { from { background-position: 0 0; } to { background-position: 200% 0; } }

/* menu buttons */
#opening .menu {
  position: absolute; left: 50%; top: 60%; transform: translateX(-50%);
  display: none; flex-direction: column; gap: 12px; width: min(320px, 78vw);
}
#opening .menu.show { display: flex; animation: op-menuin 0.5s ease-out; }
@keyframes op-menuin { from { opacity: 0; transform: translateX(-50%) translateY(14px); } }
#opening .menu button {
  font-family: inherit; font-size: 15px; letter-spacing: 4px; padding: 14px 10px;
  cursor: pointer; color: #ffe9b0; text-shadow: 0 2px 0 #241c0a;
  background: linear-gradient(180deg, rgba(64,52,30,0.92), rgba(40,32,18,0.92));
  border: 2px solid #8a744a;
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.35), 0 4px 14px rgba(10,20,40,0.45);
  clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
  transition: filter 0.1s, transform 0.1s;
}
#opening .menu button:hover:not(:disabled) { filter: brightness(1.25); transform: scale(1.03); }
#opening .menu button:disabled { opacity: 0.45; cursor: default; }
#opening .menu button.primary {
  background: linear-gradient(180deg, rgba(88,68,34,0.95), rgba(58,46,24,0.95));
  border-color: #d8b866;
}
#opening .menu .continfo { font-size: 9px; letter-spacing: 1px; color: #dce8f4; text-align: center; margin-top: -8px; text-shadow: 0 1px 0 #2a4a7a; }
#opening .credit {
  position: absolute; bottom: 12px; left: 0; right: 0; text-align: center;
  font-size: 9px; letter-spacing: 3px; color: rgba(240,248,255,0.75); text-shadow: 0 1px 0 #2a4a7a;
}

/* about modal */
#opening .about {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(8, 14, 26, 0.72); pointer-events: auto;
}
#opening .about.show { display: flex; }
#opening .about .card {
  width: min(400px, 86vw); padding: 22px; text-align: center;
  background: linear-gradient(180deg, rgba(26,31,20,0.97), rgba(14,18,11,0.97));
  border: 2px solid #46523c;
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.25), 0 14px 40px rgba(0,0,0,0.6);
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
}
#opening .about img.mascot {
  width: min(230px, 62%); image-rendering: pixelated; margin-bottom: 10px;
  filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));
  animation: op-bob 3s ease-in-out infinite;
}
#opening .about h4 { font-size: 13px; letter-spacing: 4px; color: #d8b866; margin-bottom: 8px; }
#opening .about p { font-size: 10px; line-height: 1.9; color: #cfd8c8; margin-bottom: 14px; letter-spacing: 1px; }
#opening .about .xbtn {
  display: inline-block; font-family: inherit; font-size: 12px; letter-spacing: 2px;
  padding: 10px 22px; cursor: pointer; color: #e8f0f8; text-decoration: none;
  background: linear-gradient(180deg, #1c2732, #10161e); border: 2px solid #4a6a8a;
  box-shadow: inset 0 0 0 1px rgba(140,190,255,0.2);
}
#opening .about .xbtn:hover { filter: brightness(1.3); }
#opening .about .crew {
  margin: 14px 0 2px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25);
  display: flex; flex-direction: column; gap: 8px;
}
#opening .about .crew .ct { font-size: 9px; letter-spacing: 3px; color: #8a967f; margin-bottom: 2px; }
#opening .about .crew .member {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 7px 10px; background: rgba(10,14,9,0.6);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.16);
}
#opening .about .crew .who { text-align: left; }
#opening .about .crew .who b { display: block; font-size: 11px; color: #ffe9b0; letter-spacing: 1px; }
#opening .about .crew .who small { font-size: 8px; color: #8a967f; letter-spacing: 1px; }
#opening .about .crew a.xmini {
  flex-shrink: 0; font-family: inherit; font-size: 9px; letter-spacing: 1px;
  padding: 7px 12px; cursor: pointer; color: #e8f0f8; text-decoration: none;
  background: linear-gradient(180deg, #1c2732, #10161e); border: 2px solid #4a6a8a;
  box-shadow: inset 0 0 0 1px rgba(140,190,255,0.2);
}
#opening .about .crew a.xmini:hover { filter: brightness(1.3); }
#opening .about .closebtn {
  display: block; margin: 12px auto 0; font-family: inherit; font-size: 10px; letter-spacing: 2px;
  padding: 7px 18px; cursor: pointer; color: #c2cbb0;
  background: #1a2215; border: 1px solid #5a6a4a;
}
#opening .about .rialo-badge { display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25);
  font-family: var(--font-display, monospace); font-size: 11px; letter-spacing: 3px; color: #e8e3d5; }
#opening .about .rialo-badge canvas { width: 26px; height: 26px; image-rendering: pixelated; border-radius: 5px;
  box-shadow: 0 0 0 1px rgba(232,227,213,0.4), 0 2px 8px rgba(0,0,0,0.4); }
/* roadmap modal: numbered milestone plates */
#opening .roadmap .card { width: min(470px, 92vw); max-height: 88vh; overflow-y: auto; text-align: left; }
#opening .roadmap h4 { text-align: center; }
#opening .roadmap .rm-phases { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 2px; }
#opening .roadmap .rm {
  padding: 10px 12px; background: rgba(10,14,9,0.6);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.18), inset 3px 0 0 rgba(216,184,102,0.55);
}
#opening .roadmap .rm-h {
  display: flex; align-items: center; gap: 8px; font-family: var(--font-display, inherit);
  font-size: 10px; letter-spacing: 2px; color: #ffe9b0; margin-bottom: 5px;
}
#opening .roadmap .rm-n {
  font-size: 9px; color: #241c0a; background: var(--gold, #d8b866);
  padding: 2px 5px; letter-spacing: 0;
}
#opening .roadmap .rm p { font-size: 10px; line-height: 1.85; color: #cfd8c8; margin: 0; letter-spacing: 0.5px; }
#opening .roadmap .rm p b { color: #ffe9b0; }
`;

// --- tiny pixel-art painters (canvas, chunky pixels) ---
function pxCanvas(w, h, scale, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx);
  c.style.width = `${w * scale}px`;
  c.style.height = `${h * scale}px`;
  return c;
}

function drawCloud(ctx, w, h, tint = '#ffffff') {
  // lumpy pixel cloud: overlapping filled circles snapped to a grid
  const lumps = 4 + Math.floor(Math.random() * 3);
  ctx.fillStyle = 'rgba(255,255,255,0)';
  const blob = (cx, cy, r, col) => {
    ctx.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  };
  for (let i = 0; i < lumps; i++) {
    const cx = 6 + Math.floor(Math.random() * (w - 12));
    const cy = h - 6 - Math.floor(Math.random() * 4);
    blob(cx, cy - 3, 4 + Math.floor(Math.random() * 3), tint);
  }
  // flat base + soft shadow line
  ctx.fillStyle = tint;
  ctx.fillRect(3, h - 5, w - 6, 3);
  ctx.fillStyle = 'rgba(150,180,220,0.65)';
  ctx.fillRect(4, h - 2, w - 8, 1);
}

function drawIsland(ctx) {
  // floating rock with grass top and a tiny tree
  const g = (x, y, w2, h2, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w2, h2); };
  // rock (tapered down)
  g(6, 14, 20, 5, '#7a6a5a'); g(8, 19, 16, 4, '#6a5a4c'); g(11, 23, 10, 3, '#584a3e');
  g(14, 26, 4, 3, '#4a3e34');
  // grass cap
  g(5, 11, 22, 4, '#5e9448'); g(4, 12, 24, 2, '#6aa84f');
  g(6, 10, 4, 1, '#7fbd62'); g(18, 10, 5, 1, '#7fbd62');
  // tiny tree
  g(14, 3, 4, 5, '#3a7343'); g(13, 4, 6, 3, '#4a8a50'); g(15, 8, 2, 3, '#5a4432');
  // hanging vines
  g(7, 15, 1, 3, '#4f7a3e'); g(24, 15, 1, 4, '#4f7a3e');
}

function drawMountains(ctx, w, h) {
  // two layered snowy ridges
  const ridge = (baseY, peaks, col, snow) => {
    ctx.fillStyle = col;
    let x = 0;
    for (const [pw, ph] of peaks) {
      // triangle peak drawn in pixel steps
      for (let i = 0; i < pw; i++) {
        const t = i / pw;
        const y = t < 0.5 ? ph * (t * 2) : ph * (2 - t * 2);
        ctx.fillRect(x + i, baseY - Math.floor(y), 1, Math.floor(y) + (h - baseY));
      }
      // snow cap
      ctx.fillStyle = snow;
      for (let i = Math.floor(pw * 0.36); i < Math.ceil(pw * 0.64); i++) {
        const t = i / pw;
        const y = t < 0.5 ? ph * (t * 2) : ph * (2 - t * 2);
        const capH = Math.max(2, Math.floor(ph * 0.16));
        ctx.fillRect(x + i, baseY - Math.floor(y), 1, capH);
      }
      ctx.fillStyle = col;
      x += pw - Math.floor(pw * 0.22); // overlap peaks
    }
  };
  ridge(h, [[70, 46], [90, 62], [60, 40], [84, 56], [70, 48]], '#5a7a9e', '#e8f2f8');
  ctx.globalAlpha = 0.9;
  ridge(h, [[54, 30], [64, 38], [58, 32], [66, 40], [60, 34], [52, 28]], '#7a9ec0', '#f0f6fa');
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// showOpening(saved) -> Promise<{ action: 'new' | 'continue' }>
// ---------------------------------------------------------------------------
export function showOpening(saved) {
  return new Promise(async (resolve) => {
    // key out the solid PNG backgrounds so the logo/mascot float cleanly
    const [logo, mascot] = await Promise.all([cleanImage(logoUrl), cleanImage(mascotUrl)]);

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'opening';
    document.body.appendChild(root);

    // --- sky layers ---
    // stars
    const stars = document.createElement('div');
    stars.className = 'layer stars';
    for (let i = 0; i < 26; i++) {
      const b = document.createElement('b');
      if (Math.random() < 0.3) b.className = 'd';
      b.style.left = `${Math.random() * 100}%`;
      b.style.top = `${Math.random() * 34}%`;
      b.style.animationDelay = `${Math.random() * 2.4}s`;
      stars.appendChild(b);
    }
    root.appendChild(stars);

    // light beams
    for (const [left, delay, hgt] of [[14, 0, 60], [30, 1.6, 48], [68, 0.8, 55], [86, 2.2, 62]]) {
      const beam = document.createElement('div');
      beam.className = 'beam';
      beam.style.left = `${left}%`;
      beam.style.height = `${hgt}%`;
      beam.style.animationDelay = `${delay}s`;
      root.appendChild(beam);
    }

    // mountains (bottom)
    const mtn = pxCanvas(340, 80, 1, (ctx) => drawMountains(ctx, 340, 80));
    mtn.className = 'px';
    mtn.style.cssText += 'left:0;right:0;bottom:0;width:100%;height:34vh;';
    root.appendChild(mtn);

    // clouds
    for (let i = 0; i < 9; i++) {
      const w = 34 + Math.floor(Math.random() * 26);
      const cl = pxCanvas(w, 18, 4 + Math.random() * 3, (ctx) => drawCloud(ctx, w, 18));
      cl.className = 'px cloud';
      cl.style.top = `${4 + Math.random() * 55}%`;
      cl.style.left = `${-10 + Math.random() * 100}%`;
      const dur = 60 + Math.random() * 80;
      cl.style.animationDuration = `${dur}s`;
      cl.style.animationDelay = `${-Math.random() * dur}s`;
      cl.style.opacity = 0.75 + Math.random() * 0.25;
      root.appendChild(cl);
    }

    // floating islands
    for (const [left, top, scale, delay, flip] of [
      [8, 26, 4, 0, false], [78, 18, 5, 1.2, true], [64, 44, 3, 0.5, false], [22, 52, 2.5, 1.8, true],
    ]) {
      const isle = pxCanvas(32, 30, scale, (ctx) => drawIsland(ctx));
      isle.className = 'px isle';
      isle.style.left = `${left}%`;
      isle.style.top = `${top}%`;
      isle.style.animationDuration = `${3.6 + Math.random() * 1.6}s`;
      isle.style.animationDelay = `${delay}s`;
      if (flip) isle.style.transform = 'scaleX(-1)';
      root.appendChild(isle);
    }

    // --- logo ---
    const logoWrap = document.createElement('div');
    logoWrap.className = 'logo-wrap';
    logoWrap.innerHTML = `<img src="${logo}" alt="SEMESTA">`;
    root.appendChild(logoWrap);

    // --- loading bar -> menu ---
    const loadbox = document.createElement('div');
    loadbox.className = 'loadbox';
    // (the mini Rialo mark is painted right after the innerHTML below)
    loadbox.innerHTML = `<div class="txt">AWAKENING THE WORLD...</div><div class="bar"><div></div></div>
      <div class="rialoline"><canvas class="rlogo" width="40" height="40"></canvas><span>BUILD FOR RIALO</span></div>`;
    root.appendChild(loadbox);
    paintRialoMark(loadbox.querySelector('.rlogo').getContext('2d'), 40);

    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.innerHTML = `
      <button class="primary" data-m="new">⚔ &nbsp;NEW ADVENTURE</button>
      ${saved ? `<button data-m="continue">▶ &nbsp;CONTINUE</button>
        <div class="continfo">${saved.character?.name || 'Adventurer'} · Lv${saved.level || 1}</div>` : ''}
      <button data-m="roadmap">◈ &nbsp;ROADMAP</button>
      <button data-m="about">✦ &nbsp;ABOUT</button>
    `;
    root.appendChild(menu);

    // graphics settings live on the opening screen — pinned to the RIGHT edge,
    // so someone on a slow machine can turn things down before the world builds
    // (no sfx here: audio only starts on the first menu click)
    const gfx = createGfxPanel({ collapsible: true });
    root.appendChild(gfx.el);

    const credit = document.createElement('div');
    credit.className = 'credit';
    credit.textContent = 'A WORLD BY NXRSKYAA';
    root.appendChild(credit);

    // --- about modal ---
    const about = document.createElement('div');
    about.className = 'about';
    about.innerHTML = `<div class="card">${aboutInner(logo)}<button class="closebtn">BACK</button></div>`;
    root.appendChild(about);
    paintAboutRialo(about);
    about.querySelector('.closebtn').addEventListener('click', () => about.classList.remove('show'));
    about.addEventListener('click', (e) => { if (e.target === about) about.classList.remove('show'); });

    // --- roadmap modal: where Semesta is headed ---
    const roadmap = document.createElement('div');
    roadmap.className = 'about roadmap';
    roadmap.innerHTML = `<div class="card">
      <h4>◆ SEMESTA ROADMAP ◆</h4>
      <div class="rm-phases">
        <div class="rm">
          <div class="rm-h"><span class="rm-n">01</span>TOKEN LAUNCHPAD</div>
          <p>Semesta launches its own token on the <b>Semesta Launchpad</b> with a
          total supply of <b>1,000,000,000 (1B)</b>.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">02</span>HOLD TO PLAY</div>
          <p>After launch, playing Semesta requires holding a minimum of
          <b>1,000 SEMESTA</b> in your wallet.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">03</span>TOKEN GACHA</div>
          <p>The in-game gacha accepts <b>SEMESTA token</b> alongside in-game
          <b>gold</b> — two ways to chase the same wonders.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">04</span>GENESIS NFT</div>
          <p>Once the game is live, a <b>free-mint Genesis NFT</b> drops for
          players who actively play Semesta.</p>
        </div>
      </div>
      <div class="rialo-badge">
        <canvas class="rlogo-about" width="44" height="44"></canvas>
        <span>BUILD FOR RIALO</span>
      </div>
      <button class="closebtn">BACK</button>
    </div>`;
    root.appendChild(roadmap);
    paintAboutRialo(roadmap);
    roadmap.querySelector('.closebtn').addEventListener('click', () => roadmap.classList.remove('show'));
    roadmap.addEventListener('click', (e) => { if (e.target === roadmap) roadmap.classList.remove('show'); });

    // fake-but-tasty loading progress, then reveal the menu
    const fill = loadbox.querySelector('.bar > div');
    let prog = 0;
    const tick = setInterval(() => {
      prog = Math.min(100, prog + 7 + Math.random() * 16);
      fill.style.width = `${prog}%`;
      if (prog >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          loadbox.style.display = 'none';
          menu.classList.add('show');
        }, 250);
      }
    }, 160);

    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'about') { about.classList.add('show'); return; }
      if (b.dataset.m === 'roadmap') { roadmap.classList.add('show'); return; }
      const action = b.dataset.m;
      gfx.dispose();
      root.classList.add('fadeout');
      setTimeout(() => root.remove(), 750);
      resolve({ action });
    });
  });
}
