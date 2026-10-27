// THE CROSSING — what you see when you step into the Chronicle Gate.
//
// The gate opens Semesta City, the other world of the Semesta Chronicle, in a
// NEW TAB. Navigating this one away would throw the hero out of Anavela; a new
// tab leaves Anavela exactly where it was (and saved), so coming back is just
// switching tabs.
//
// The ENTER control is a real `<a target="_blank">`, not a button that calls
// `window.open` later. A popup blocker only lets a new window through while a
// click is still "fresh", and the whole point of this screen is an animation —
// open the tab after a warp and Safari, which allows about a second, eats it.
// A link the player actually clicks is never blocked.
//
// The picture on the card is painted here (no asset files): Semesta City at
// dusk, seen through the same kind of ring you just walked into.

import { CHRONICLE_URL } from '../world/chroniclegate.js';

const W = 240, H = 104;

function rng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function glow(ctx, x, y, r, inner) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** A skyline band: blocky towers along a baseline, windows optional. */
function towers(ctx, rnd, base, minH, maxH, col, windows, wMin = 8, wMax = 18) {
  let x = -4;
  while (x < W + 4) {
    const w = wMin + Math.floor(rnd() * (wMax - wMin));
    const h = minH + Math.floor(rnd() * (maxH - minH));
    ctx.fillStyle = col;
    ctx.fillRect(x, base - h, w, h + (H - base));
    // a stepped crown on some
    if (rnd() < 0.35) ctx.fillRect(x + 2, base - h - 3, w - 4, 3);
    if (rnd() < 0.18) ctx.fillRect(x + (w >> 1), base - h - 9, 1, 6);
    if (windows) {
      for (let wy = base - h + 4; wy < base - 2; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 3) {
          const r = rnd();
          if (r < 0.42) continue;
          ctx.fillStyle = r < 0.82 ? 'rgba(255,214,140,0.85)' : 'rgba(120,236,255,0.85)';
          ctx.fillRect(wx, wy, 1, 2);
        }
      }
    }
    x += w + (rnd() < 0.3 ? 2 : 0);
  }
}

/** Semesta City at dusk. Deterministic: the same picture on every machine. */
function paintCity(cv) {
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rnd = rng(20261028);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#140f33');
  sky.addColorStop(0.42, '#3a2a6e');
  sky.addColorStop(0.72, '#b4567c');
  sky.addColorStop(1, '#f2a65e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = `rgba(255,255,240,${0.25 + rnd() * 0.6})`;
    ctx.fillRect((rnd() * W) | 0, (rnd() * 40) | 0, 1, 1);
  }
  // the setting sun behind the towers
  glow(ctx, 162, 74, 46, 'rgba(255,200,140,0.6)');
  ctx.fillStyle = '#ffe2b0';
  ctx.beginPath(); ctx.arc(162, 74, 12, 0, Math.PI * 2); ctx.fill();

  towers(ctx, rng(7), 82, 10, 26, '#5b3f7a', false, 10, 20);
  towers(ctx, rng(19), 88, 14, 40, '#3a2756', true, 8, 16);

  // THE SPIRE: the city's landmark, centre-left, with a beacon on top
  const sx = 96;
  ctx.fillStyle = '#241838';
  ctx.fillRect(sx - 7, 30, 14, H - 30);
  ctx.fillRect(sx - 10, 46, 20, 4);
  ctx.fillRect(sx - 4, 18, 8, 12);
  ctx.fillRect(sx - 1, 6, 2, 12);
  for (let wy = 54; wy < 92; wy += 5) {
    ctx.fillStyle = 'rgba(120,236,255,0.9)';
    ctx.fillRect(sx - 4, wy, 2, 2); ctx.fillRect(sx + 2, wy, 2, 2);
  }
  glow(ctx, sx, 6, 10, 'rgba(120,236,255,0.9)');
  ctx.fillStyle = '#eafcff';
  ctx.fillRect(sx - 1, 5, 2, 2);

  towers(ctx, rng(41), 96, 6, 22, '#1a1129', true, 12, 22);

  // NEAR FIELD: a bridge rail and a street lamp, cropped by the frame — the
  // dark shape that runs off the edge is what puts the city in the distance
  ctx.fillStyle = '#0d0818';
  ctx.fillRect(0, H - 8, W, 8);
  for (let x = 0; x < W; x += 9) ctx.fillRect(x, H - 14, 2, 6);
  ctx.fillRect(0, H - 15, W, 2);
  ctx.fillRect(214, 34, 3, H - 34);
  ctx.fillRect(206, 34, 14, 3);
  glow(ctx, 209, 40, 16, 'rgba(255,214,140,0.55)');
  ctx.fillStyle = '#ffe9b8';
  ctx.fillRect(207, 37, 4, 3);
}

const CSS = `
.cgate{position:fixed;inset:0;z-index:76;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at center,rgba(20,40,80,0.55),rgba(4,6,14,0.92));
  font-family:var(--font-body,monospace);opacity:0;transition:opacity .45s ease;touch-action:pan-y}
.cgate.on{opacity:1}
.cgate .cg-vortex{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;
  border-radius:50%;pointer-events:none;opacity:.55;
  background:conic-gradient(from 0deg,rgba(120,236,255,0) 0deg,rgba(120,236,255,.28) 40deg,rgba(154,124,255,0) 90deg,
    rgba(154,124,255,.24) 150deg,rgba(120,236,255,0) 200deg,rgba(87,227,159,.2) 260deg,rgba(120,236,255,0) 320deg);
  -webkit-mask:radial-gradient(circle,#000 0,#000 18%,transparent 62%);
          mask:radial-gradient(circle,#000 0,#000 18%,transparent 62%);
  transform:scale(.2) rotate(0deg);transition:transform 1.1s cubic-bezier(.2,.8,.2,1);
  animation:cgSpin 7s linear infinite}
.cgate.on .cg-vortex{transform:scale(1)}
@keyframes cgSpin{to{rotate:360deg}}
.cgate .cg-card{position:relative;width:min(440px,92vw);max-height:92vh;overflow:auto;touch-action:pan-y;
  background:linear-gradient(180deg,#141d36,#0d1326);border:var(--pix-frame,3px solid #2c4a6a);
  box-shadow:0 0 0 2px #0a0f1e,0 0 40px rgba(120,236,255,.25);padding:16px 18px 16px;
  transform:translateY(18px) scale(.94);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.25,1.1) .18s,opacity .4s ease .18s}
.cgate.on .cg-card{transform:none;opacity:1}
.cg-kick{font-family:var(--font-display,monospace);font-size:9px;letter-spacing:2px;color:#78ecff;text-align:center}
.cg-title{font-family:var(--font-display,monospace);font-size:24px;letter-spacing:2px;color:#eafcff;text-align:center;
  margin:4px 0 10px;text-shadow:0 0 12px rgba(120,236,255,.6),2px 2px 0 #0a1020}
.cg-art{position:relative;width:100%;aspect-ratio:${W}/${H};border:2px solid #2c4a6a;overflow:hidden;background:#140f33}
.cg-art canvas{width:100%;height:100%;image-rendering:pixelated;display:block}
.cg-art::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.45));}
.cg-art .cg-shine{position:absolute;top:0;bottom:0;width:30%;left:-40%;pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(200,250,255,.22),transparent);animation:cgShine 3.6s ease-in-out infinite}
@keyframes cgShine{0%{left:-40%}55%,100%{left:120%}}
.cg-body{font-size:12px;line-height:1.6;color:#a9bcd8;margin:12px 2px 6px}
.cg-body b{color:#eafcff;font-weight:normal}
.cg-url{font-size:10px;color:#5f84a8;text-align:center;margin-bottom:12px;letter-spacing:1px}
.cg-row{display:flex;gap:9px}
.cg-row > *{flex:1;padding:12px 8px;border:0;cursor:pointer;text-align:center;text-decoration:none;
  font-family:var(--font-display,monospace);font-size:12px;letter-spacing:1px;min-height:44px;box-sizing:border-box;
  display:flex;align-items:center;justify-content:center}
.cg-stay{background:#1d2740;color:#9fb2d0;box-shadow:var(--pix-btn,0 0 0 2px #2c3a5a)}
.cg-go{background:linear-gradient(180deg,#3fc8e8,#2a8fc0);color:#fff;
  box-shadow:var(--pix-btn,0 0 0 2px #78ecff),0 0 18px rgba(120,236,255,.45);animation:cgPulse 1.8s ease-in-out infinite}
@keyframes cgPulse{50%{box-shadow:var(--pix-btn,0 0 0 2px #78ecff),0 0 30px rgba(120,236,255,.8)}}
.cgate .cg-flash{position:absolute;inset:0;pointer-events:none;opacity:0;
  background:radial-gradient(circle,#fff 0,#bff6ff 30%,rgba(120,236,255,0) 75%)}
.cgate.warp .cg-flash{animation:cgFlash .9s ease-out forwards}
.cgate.warp .cg-card{transform:scale(.6);opacity:0;transition:transform .5s ease-in,opacity .4s ease-in}
.cgate.warp .cg-vortex{transform:scale(2.4);transition:transform .9s ease-in}
@keyframes cgFlash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
@media (max-width:420px){.cg-title{font-size:19px}.cg-body{font-size:11px}}
`;

let open = null;

export function isChronicleOpen() { return !!open; }

/**
 * Show the crossing. Resolves when it closes.
 * @param onEnter called the instant ENTER is clicked (save + sfx); the link
 *   itself opens the tab, so nothing here can be popup-blocked.
 */
export function showChronicleGate({ onEnter } = {}) {
  if (open) return open.promise;
  if (!document.getElementById('cgate-css')) {
    const st = document.createElement('style');
    st.id = 'cgate-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'cgate';
  el.innerHTML = `
    <div class="cg-vortex"></div>
    <div class="cg-card" role="dialog" aria-label="Semesta City">
      <div class="cg-kick">◆ THE CHRONICLE GATE ◆</div>
      <div class="cg-title">SEMESTA CITY</div>
      <div class="cg-art"><canvas></canvas><div class="cg-shine"></div></div>
      <div class="cg-body">The gate hums open onto <b>Semesta City</b> — another world of the
        <b>Semesta Chronicle</b>. It opens in a new tab: Anavela stays exactly where you left it,
        saved, one tab away whenever you want to come home.</div>
      <div class="cg-url">${CHRONICLE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
      <div class="cg-row">
        <button class="cg-stay" data-stay>STAY</button>
        <a class="cg-go" data-go href="${CHRONICLE_URL}" target="_blank" rel="noopener noreferrer">STEP THROUGH ➜</a>
      </div>
    </div>
    <div class="cg-flash"></div>`;
  paintCity(el.querySelector('canvas'));
  document.body.appendChild(el);
  // two frames so the transition has a start state to animate from
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  // a fallback in case rAF is throttled (background tab): never leave it invisible
  setTimeout(() => el.classList.add('on'), 60);

  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  let closing = false;
  const close = (entered, delay) => {
    if (closing) return;
    closing = true;
    window.removeEventListener('keydown', key, true);
    if (!entered) el.classList.remove('on');
    setTimeout(() => { el.remove(); open = null; resolve(entered); }, delay);
  };
  // swallow every key while the crossing is up so nothing behind it fires —
  // capture on window runs before the game's own window listener
  const key = (e) => {
    // Immediate, not plain stopPropagation: a key event fired AT the window
    // (rather than at the page) reaches the game's listener in the same target
    // phase, and only stopImmediatePropagation stops that one too.
    e.stopImmediatePropagation();
    if (e.code === 'Escape') close(false, 420);
    else if (e.code === 'Enter') el.querySelector('[data-go]').click();
  };
  window.addEventListener('keydown', key, true);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) {
      // let the link do its job — no preventDefault
      try { onEnter?.(); } catch (err) { console.warn('[semesta] chronicle onEnter', err); }
      el.classList.add('warp');
      close(true, 950);
    } else if (e.target.closest('[data-stay]') || e.target === el) {
      close(false, 420);
    }
  });
  open = { el, promise, close: () => close(false, 0) };
  return promise;
}

/** Tear it down without ceremony (used by invariants). */
export function closeChronicleGate() { open?.close(); }
