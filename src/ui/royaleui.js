// LANTERNFALL — every screen round the match.
//
// None of this is Semesta's pixel UI on purpose. The match is a different game
// in a different place, and its HUD is a shooter's HUD: flat dark glass, one
// ember accent, big numerals, nothing decorative. Anavela's HUD is switched off
// for the duration (`body.inroyale`) and handed back untouched.
//
// Four pieces share one stylesheet: the LOBBY, the match HUD (zone timer,
// minimap + full map, vitals, weapon slots, crosshair, feed, prompts), the
// PAUSE card and the RESULT, plus the curtain the world is swapped behind.

import { ROYALE_CX, ROYALE_CZ, ISLE_R, POIS, ROADS } from '../world/royaleworld.js';
import { ROYALE_SIZE, DIFFICULTY } from '../systems/royale.js';
import { RARITIES, GUNS, gunIcon } from '../systems/royaleguns.js';

const CSS = `
.ry, .ry * { box-sizing: border-box; }
.ry { --bg: rgba(16,11,9,.78); --line: rgba(255,226,186,.14); --ink: #fff3e2; --dim: #c8b39a; --acc: #ffb238;
  --ember: #ff6a3c; --sh: #5ad1ff; --hp: #7be07b; font-family: Rubik, 'Segoe UI', system-ui, sans-serif; color: var(--ink);
  -webkit-font-smoothing: antialiased; letter-spacing: .01em; }
body.inroyale #hud > *:not(.dmg-num) { display: none !important; }
body.inroyale #touchui .btns, body.inroyale .chatdock, body.inroyale .chat { display: none !important; }
body.inroyale, body.inroyale canvas { cursor: none; }
body.inroyale .dmg-num { font-family: Rubik, system-ui, sans-serif; font-weight: 900; font-size: 20px; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.55), 0 0 10px rgba(255,120,60,.6); }
body.inroyale .dmg-num.shield { color: #8fe3ff; text-shadow: 0 2px 0 rgba(0,0,0,.55), 0 0 10px rgba(90,209,255,.7); }
.ry .glass { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.05); }
.ry kbd { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 5px; font: 700 11px Rubik, system-ui, sans-serif;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: var(--ink); }

/* ------------------------------------------------------------- the HUD --- */
.ryhud { position: fixed; inset: 0; z-index: 25; pointer-events: none; display: none; user-select: none; }
body.inroyale .ryhud { display: block; }
.ryhud .zone { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 8px 16px 8px 10px; min-width: 250px; }
.ryhud .zone .ico { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--acc) calc(var(--k,0) * 1turn), rgba(255,255,255,.1) 0); }
.ryhud .zone .ico i { width: 26px; height: 26px; border-radius: 50%; background: #1a120e; display: grid; place-items: center; font: 900 11px Rubik; font-style: normal; color: var(--acc); }
.ryhud .zone .lbl { font-size: 10px; font-weight: 700; letter-spacing: .16em; color: var(--dim); }
.ryhud .zone .tm { font-size: 22px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
.ryhud .zone.closing { border-color: rgba(255,106,60,.7); }
.ryhud .zone.closing .tm, .ryhud .zone.closing .ico i { color: var(--ember); }
.ryhud .zone.closing .ico { background: conic-gradient(var(--ember) calc(var(--k,0) * 1turn), rgba(255,255,255,.1) 0); }
.ryhud .place { position: absolute; top: 76px; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; letter-spacing: .28em; color: var(--ink);
  text-shadow: 0 2px 8px rgba(0,0,0,.7); opacity: 0; transition: opacity .5s; white-space: nowrap; }
.ryhud .place.on { opacity: .92; }

.ryhud .tr { position: absolute; top: 14px; right: 14px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.ryhud .mini { width: 184px; height: 184px; padding: 4px; pointer-events: auto; cursor: pointer; position: relative; }
.ryhud .mini canvas { width: 100%; height: 100%; border-radius: 9px; display: block; }
.ryhud .mini b { position: absolute; left: 10px; bottom: 8px; font-size: 9px; letter-spacing: .14em; color: var(--dim); font-weight: 700; }
.ryhud .pills { display: flex; gap: 8px; }
.ryhud .pill { padding: 6px 12px; display: flex; align-items: baseline; gap: 7px; border-radius: 10px; }
.ryhud .pill span { font-size: 10px; font-weight: 700; letter-spacing: .16em; color: var(--dim); }
.ryhud .pill em { font-style: normal; font-size: 20px; font-weight: 900; font-variant-numeric: tabular-nums; }
.ryhud .pill.k em { color: var(--acc); }

.ryhud .tl { position: absolute; top: 14px; left: 14px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.ryhud .menu { pointer-events: auto; cursor: pointer; width: 40px; height: 40px; display: grid; place-items: center; font-size: 18px; color: var(--ink); }
.ryhud .feed { display: flex; flex-direction: column; gap: 4px; }
.ryhud .feed div { font-size: 12px; font-weight: 500; padding: 4px 9px; border-radius: 7px; background: rgba(16,11,9,.6); color: var(--dim); animation: ryin .25s ease-out; white-space: nowrap; }
.ryhud .feed div b { color: var(--ink); font-weight: 700; }
.ryhud .feed div.me { background: rgba(255,178,56,.2); border: 1px solid rgba(255,178,56,.5); color: var(--ink); }
.ryhud .feed div i { font-style: normal; color: var(--ember); margin: 0 5px; }
@keyframes ryin { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }

.ryhud .vit { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); width: min(380px, 44vw); padding: 10px 12px; display: grid; gap: 6px; }
.ryhud .bar { height: 12px; border-radius: 6px; background: rgba(255,255,255,.1); overflow: hidden; position: relative; }
.ryhud .bar i { position: absolute; inset: 0; transform-origin: left; border-radius: 6px; transition: transform .16s ease-out; }
.ryhud .bar.sh { height: 9px; } .ryhud .bar.sh i { background: linear-gradient(90deg, #2fa8e0, var(--sh)); }
.ryhud .bar.hp i { background: linear-gradient(90deg, #44b85a, var(--hp)); }
.ryhud .bar.hp.low i { background: linear-gradient(90deg, #d9342a, #ff7a4a); }
.ryhud .bar.sh::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(16,11,9,.8); }
.ryhud .vit .row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: var(--dim); }
.ryhud .vit .row em { font-style: normal; color: var(--ink); font-size: 15px; font-weight: 900; font-variant-numeric: tabular-nums; }
.ryhud .vit .row em.s { color: var(--sh); }
.ryhud .cons { display: flex; gap: 10px; }
.ryhud .cons span { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--ink); font-weight: 900; }
.ryhud .cons span.zero { opacity: .35; }
.ryhud .cons i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }

.ryhud .slots { position: absolute; right: 14px; bottom: 20px; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.ryhud .slot { pointer-events: auto; cursor: pointer; display: grid; grid-template-columns: 22px 64px 1fr; align-items: center; gap: 9px; width: 270px; padding: 7px 11px 7px 8px; border-left: 4px solid var(--rc, rgba(255,255,255,.2));
  opacity: .62; transition: opacity .12s, transform .12s, width .12s; position: relative; overflow: hidden; }
.ryhud .slot.on { opacity: 1; width: 292px; border-color: var(--line); border-left-color: var(--rc, var(--acc)); background: rgba(30,20,15,.9); }
.ryhud .slot.empty { opacity: .3; }
.ryhud .slot svg { width: 64px; height: 32px; display: block; }
.ryhud .slot > div:nth-child(3) { min-width: 0; padding-right: 46px; }
.ryhud .slot .nm { font-size: 12px; font-weight: 700; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ryhud .slot .cl { font-size: 9px; font-weight: 700; letter-spacing: .14em; color: var(--rc, var(--dim)); }
.ryhud .slot .am { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); text-align: right; font-variant-numeric: tabular-nums; }
.ryhud .slot .am b { font-size: 22px; font-weight: 900; line-height: 1; }
.ryhud .slot .am b.out { color: var(--ember); }
.ryhud .slot .am small { display: block; font-size: 10px; color: var(--dim); font-weight: 700; }
.ryhud .slot .rl { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--acc); width: 0; }

.ryhud .prompt { position: absolute; left: 50%; bottom: 128px; transform: translateX(-50%); padding: 9px 14px; display: none; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; border-left: 4px solid var(--rc, var(--acc)); white-space: nowrap; }
.ryhud .prompt.on { display: flex; }
.ryhud .prompt b { font-weight: 900; } .ryhud .prompt small { font-size: 10px; letter-spacing: .14em; color: var(--rc); font-weight: 700; }
.ryhud .usebar { position: absolute; left: 50%; bottom: 112px; transform: translateX(-50%); width: 220px; padding: 8px 12px; display: none; }
.ryhud .usebar.on { display: block; }
.ryhud .usebar span { font-size: 10px; font-weight: 700; letter-spacing: .16em; color: var(--dim); }
.ryhud .usebar .bar { margin-top: 5px; height: 6px; } .ryhud .usebar .bar i { background: var(--acc); transition: none; }

.ryhud .big { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); text-align: center; pointer-events: none; opacity: 0; }
.ryhud .big.on { animation: rybig 2.6s ease-out forwards; }
.ryhud .big small { display: block; font-size: 12px; font-weight: 700; letter-spacing: .4em; color: var(--acc); margin-bottom: 4px; }
.ryhud .big b { display: block; font-size: clamp(26px, 4.4vw, 46px); font-weight: 900; letter-spacing: .04em; text-shadow: 0 4px 0 rgba(0,0,0,.35), 0 0 30px rgba(255,140,60,.55); }
.ryhud .big.red small { color: var(--ember); }
@keyframes rybig { 0% { opacity: 0; transform: translateX(-50%) scale(1.25); } 9% { opacity: 1; transform: translateX(-50%) scale(1); } 78% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } }

.ryhud .jump { position: absolute; left: 50%; bottom: 150px; transform: translateX(-50%); padding: 14px 22px; text-align: center; display: none; }
.ryhud .jump.on { display: block; }
.ryhud .jump b { display: block; font-size: 20px; font-weight: 900; letter-spacing: .08em; }
.ryhud .jump.go b { color: var(--acc); animation: rypulse .8s ease-in-out infinite; }
.ryhud .jump span { font-size: 11px; color: var(--dim); font-weight: 700; letter-spacing: .14em; }
@keyframes rypulse { 50% { transform: scale(1.06); } }

.ryhud .toast { position: absolute; left: 50%; bottom: 178px; transform: translateX(-50%); padding: 7px 14px; font-size: 13px; font-weight: 500; border-radius: 9px; background: rgba(16,11,9,.8); opacity: 0; transition: opacity .25s; white-space: nowrap; }
.ryhud .toast.on { opacity: 1; }
.ryhud .toast b { color: var(--rc, var(--acc)); font-weight: 900; }

.ryhud .vig { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity .3s; }
.ryhud .vig.hurt { background: radial-gradient(ellipse at center, transparent 52%, rgba(255,40,20,.6) 100%); }
.ryhud .vig.sh { background: radial-gradient(ellipse at center, transparent 58%, rgba(60,170,255,.45) 100%); }
.ryhud .vig.dark { background: radial-gradient(ellipse at center, transparent 40%, rgba(60,20,120,.72) 100%); }
.ryhud .darkmsg { position: absolute; left: 50%; top: 112px; transform: translateX(-50%); padding: 6px 14px; border-radius: 8px; background: rgba(90,40,170,.85); font-size: 12px; font-weight: 900; letter-spacing: .16em; display: none; }
.ryhud .darkmsg.on { display: block; animation: rypulse 1s infinite; }
.ryhud .dir { position: absolute; left: 50%; top: 50%; width: 0; height: 0; opacity: 0; transition: opacity .5s; }
.ryhud .dir::after { content: ''; position: absolute; left: -44px; top: -150px; width: 88px; height: 26px; border-radius: 50%; border-top: 5px solid rgba(255,70,40,.95); filter: drop-shadow(0 0 6px rgba(255,60,30,.9)); }

.rycross { position: fixed; left: 0; top: 0; z-index: 26; pointer-events: none; display: none; width: 0; height: 0; }
body.inroyale .rycross { display: block; }
body.touch .rycross { display: none !important; }
.rycross i { position: absolute; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.55); border-radius: 1px; }
.rycross i.t, .rycross i.b { width: 2px; height: 8px; left: -1px; } .rycross i.l, .rycross i.r { width: 8px; height: 2px; top: -1px; }
.rycross i.t { top: calc(-8px - var(--g, 6px)); } .rycross i.b { top: var(--g, 6px); }
.rycross i.l { left: calc(-8px - var(--g, 6px)); } .rycross i.r { left: var(--g, 6px); }
.rycross i.d { width: 2px; height: 2px; left: -1px; top: -1px; }
.rycross u { position: absolute; left: -13px; top: -13px; width: 26px; height: 26px; opacity: 0; background:
  linear-gradient(45deg, transparent 44%, #fff 44% 56%, transparent 56%), linear-gradient(-45deg, transparent 44%, #fff 44% 56%, transparent 56%);
  -webkit-mask: radial-gradient(circle, transparent 5px, #000 6px); mask: radial-gradient(circle, transparent 5px, #000 6px); }
.rycross u.on { animation: ryhit .22s ease-out; } .rycross u.kill { filter: drop-shadow(0 0 4px #ff4a2a) saturate(4) hue-rotate(-20deg); }
@keyframes ryhit { 0% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0; transform: scale(.9); } }
.rycross svg { position: absolute; left: -19px; top: -19px; width: 38px; height: 38px; transform: rotate(-90deg); display: none; }
.rycross svg.on { display: block; }
.rycross circle { fill: none; stroke: var(--acc, #ffb238); stroke-width: 3; stroke-dasharray: 100; stroke-linecap: round; }

/* touch */
.ryhud .tc { display: none; }
body.touch .ryhud .tc { display: block; }
.ryhud .tc button { position: absolute; pointer-events: auto; border: 1px solid var(--line); background: rgba(16,11,9,.7); color: var(--ink); border-radius: 50%; font: 900 11px Rubik, system-ui; letter-spacing: .06em; touch-action: none; }
.ryhud .tc .f { right: 22px; bottom: 96px; width: 86px; height: 86px; background: rgba(255,106,60,.5); border-color: rgba(255,160,110,.8); font-size: 13px; }
.ryhud .tc .r { right: 122px; bottom: 82px; width: 54px; height: 54px; } .ryhud .tc .s { right: 96px; bottom: 150px; width: 54px; height: 54px; }
.ryhud .tc .h { right: 28px; bottom: 196px; width: 54px; height: 54px; } .ryhud .tc .p { right: 164px; bottom: 150px; width: 54px; height: 54px; background: rgba(255,178,56,.55); display: none; }
.ryhud .tc .p.on { display: block; } .ryhud .tc .j { right: 22px; bottom: 96px; width: 86px; height: 86px; background: rgba(255,178,56,.6); display: none; font-size: 13px; }
body.touch .ryhud .slots { bottom: auto; top: 250px; right: 10px; } body.touch .ryhud .slot { width: 150px; grid-template-columns: 0 48px 1fr; } body.touch .ryhud .slot.on { width: 164px; }
body.touch .ryhud .slot svg { width: 48px; height: 24px; } body.touch .ryhud .slot .nm, body.touch .ryhud .slot kbd { display: none; }
body.touch .ryhud .vit { bottom: auto; top: 64px; left: 12px; transform: none; width: 190px; }
body.touch .ryhud .zone { min-width: 0; padding: 5px 10px 5px 6px; top: 8px; } body.touch .ryhud .zone .tm { font-size: 16px; }
body.touch .ryhud .place { top: 52px; font-size: 10px; } body.touch .ryhud .tl { top: 8px; left: 8px; } body.touch .ryhud .feed { display: none; }
body.touch .ryhud .tr { top: 8px; right: 8px; } body.touch .ryhud .mini { width: 112px; height: 112px; }
body.touch .ryhud .pill { padding: 3px 8px; } body.touch .ryhud .pill em { font-size: 15px; }
body.touch .ryhud .prompt { bottom: 236px; } body.touch .ryhud .usebar { bottom: 290px; } body.touch .ryhud .jump { bottom: 210px; }

/* -------------------------------------------------------- full-screen --- */
.ryscreen { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; cursor: default; overflow-x: hidden; overflow-y: auto; padding: 18px;
  background: radial-gradient(120% 90% at 50% 110%, #ff8a4a 0%, #b8432f 22%, #4a2148 55%, #150d1c 100%); animation: ryfade .35s ease-out; }
.ryscreen.dim { background: rgba(10,6,10,.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.ryscreen * { cursor: inherit; } .ryscreen button { cursor: pointer; }
@keyframes ryfade { from { opacity: 0; } }
.ryscreen .sun { position: fixed; left: 50%; bottom: -24vh; width: 70vh; height: 70vh; border-radius: 50%; transform: translateX(-50%); background: radial-gradient(circle, #ffe2a0 0%, #ffb04a 38%, rgba(255,120,60,0) 70%); opacity: .8; pointer-events: none; }
.ryscreen .ridge { position: fixed; left: 0; right: 0; bottom: 0; height: 26vh; pointer-events: none; background: #1a0f16;
  clip-path: polygon(0 62%, 7% 40%, 13% 46%, 19% 18%, 26% 22%, 30% 50%, 38% 44%, 44% 60%, 52% 30%, 58% 34%, 62% 8%, 69% 12%, 73% 48%, 81% 40%, 88% 58%, 94% 36%, 100% 52%, 100% 100%, 0 100%); }
.rycard { position: relative; width: min(880px, 100%); padding: 30px 34px 26px; border-radius: 18px; background: rgba(18,12,14,.82); border: 1px solid var(--line);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 30px 80px rgba(0,0,0,.5); touch-action: pan-y; }
.rycard .kick { font-size: 11px; font-weight: 700; letter-spacing: .42em; color: var(--acc); }
.rycard h1 { margin: 4px 0 6px; font-size: clamp(34px, 6.4vw, 64px); font-weight: 900; letter-spacing: .02em; line-height: .98;
  background: linear-gradient(180deg, #fff6e4 20%, #ffb86a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.rycard p { margin: 0; color: var(--dim); font-size: 14px; line-height: 1.55; max-width: 62ch; }
.rycard .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0 6px; }
.rycard .col { padding: 13px 14px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid var(--line); }
.rycard .col b { display: block; font-size: 13px; font-weight: 900; letter-spacing: .08em; margin-bottom: 4px; }
.rycard .col span { font-size: 12px; color: var(--dim); line-height: 1.45; display: block; }
.rycard .guns { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 2px; }
.rycard .guns div { display: flex; align-items: center; gap: 6px; padding: 4px 9px 4px 5px; border-radius: 8px; background: rgba(255,255,255,.05); font-size: 11px; font-weight: 700; color: var(--dim); }
.rycard .guns svg { width: 40px; height: 20px; }
.rycard h3 { margin: 18px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .28em; color: var(--dim); }
.rycard .diffs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rycard .diff { padding: 11px 12px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: var(--ink); text-align: left; font-family: inherit; }
.rycard .diff b { display: block; font-size: 14px; font-weight: 900; letter-spacing: .1em; } .rycard .diff span { font-size: 11px; color: var(--dim); }
.rycard .diff.on { border-color: var(--acc); background: rgba(255,178,56,.14); box-shadow: 0 0 0 1px var(--acc) inset; }
.rycard .stats { display: flex; gap: 22px; margin-top: 16px; flex-wrap: wrap; }
.rycard .stats div { font-size: 10px; font-weight: 700; letter-spacing: .18em; color: var(--dim); }
.rycard .stats em { display: block; font-style: normal; font-size: 24px; font-weight: 900; color: var(--ink); letter-spacing: 0; font-variant-numeric: tabular-nums; }
.rycard .acts { display: flex; gap: 10px; margin-top: 22px; position: sticky; bottom: 0; }
.rybtn { font: 900 15px Rubik, system-ui, sans-serif; letter-spacing: .14em; padding: 14px 26px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.07); color: var(--ink); }
.rybtn:hover { background: rgba(255,255,255,.14); }
.rybtn.go { flex: 1; border: 0; color: #2a1206; background: linear-gradient(180deg, #ffd27a, #ff9a3c); box-shadow: 0 8px 22px rgba(255,140,50,.4), inset 0 1px 0 rgba(255,255,255,.5); }
.rybtn.go:hover { filter: brightness(1.08); }
.rybtn.bad { color: #ffb3a2; border-color: rgba(255,106,60,.5); }
.rycard .note { margin-top: 12px; font-size: 11px; color: rgba(200,179,154,.75); }
.rycard .keys { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 22px; margin-top: 4px; font-size: 13px; color: var(--dim); }
.rycard .keys div { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.rycard.narrow { width: min(440px, 100%); }
.rycard .placebig { font-size: clamp(60px, 13vw, 120px); font-weight: 900; line-height: .9; letter-spacing: -.02em; color: var(--ink); }
.rycard .placebig small { font-size: .3em; color: var(--dim); letter-spacing: .04em; margin-left: 8px; }
.rycard.narrow.win { width: min(640px, 100%); }
.rycard.win h1 { font-size: clamp(32px, 6.2vw, 62px); }
.rymap { position: fixed; inset: 0; z-index: 60; display: none; place-items: center; background: rgba(10,6,10,.7); cursor: default; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); }
.rymap.on { display: grid; }
.rymap .box { padding: 10px; display: grid; grid-template-columns: auto 190px; gap: 14px; max-width: 96vw; }
.rymap canvas { width: min(78vh, 62vw); height: min(78vh, 62vw); border-radius: 10px; display: block; }
.rymap .leg { padding: 6px 4px; font-size: 12px; color: var(--dim); display: grid; gap: 9px; align-content: start; }
.rymap .leg h2 { margin: 0 0 4px; font-size: 20px; font-weight: 900; color: var(--ink); letter-spacing: .06em; }
.rymap .leg div { display: flex; align-items: center; gap: 9px; } .rymap .leg i { width: 16px; height: 16px; border-radius: 50%; flex: none; }
.rycurtain { position: fixed; inset: 0; z-index: 90; background: #0c070b; display: grid; place-items: center; opacity: 0; transition: opacity .45s; text-align: center; cursor: default; }
.rycurtain.on { opacity: 1; }
.rycurtain b { display: block; font-size: clamp(30px, 6vw, 60px); font-weight: 900; letter-spacing: .12em; color: #fff3e2; }
.rycurtain span { font-size: 12px; font-weight: 700; letter-spacing: .4em; color: #ffb238; }
@media (max-width: 720px) {
  .rycard { padding: 20px 18px 16px; } .rycard .cols { grid-template-columns: 1fr; gap: 6px; margin-top: 12px; } .rycard .col { padding: 9px 11px; }
  .rycard .guns { display: none; } .rycard .keys { grid-template-columns: 1fr; } .rybtn { padding: 12px 16px; font-size: 13px; }
  .rymap .box { grid-template-columns: 1fr; } .rymap canvas { width: 88vw; height: 88vw; } .rymap .leg { grid-template-columns: 1fr 1fr; } .rymap .leg h2 { grid-column: 1 / -1; }
}
`;

let styled = false;
function style() {
  if (styled) return;
  styled = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&display=swap';
  document.head.appendChild(link);
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}
const el = (cls, html = '', tag = 'div') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const backdrop = '<div class="sun"></div><div class="ridge"></div>';

const KEYS = [
  ['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Aim', 'Mouse'], ['Fire (hold for automatics)', 'Left click'],
  ['Dodge roll', 'Right click'], ['Jump from the skiff', '<kbd>Space</kbd>'], ['Knife / gun / gun', '<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> or wheel'],
  ['Reload', '<kbd>R</kbd>'], ['Pick up / swap a gun', '<kbd>E</kbd>'], ['Drink a tonic', '<kbd>F</kbd>'], ['Charge a shield cell', '<kbd>G</kbd>'],
  ['Map', '<kbd>M</kbd>'], ['Pause', '<kbd>Esc</kbd>'],
];

/** The lobby. Resolves { difficulty } or null. */
export function showRoyaleLobby({ stats = {}, difficulty = 'normal' } = {}) {
  style();
  return new Promise((resolve) => {
    let diff = DIFFICULTY[difficulty] ? difficulty : 'normal';
    const blurb = { easy: 'Slow hands, wide aim.', normal: 'They shoot back.', hard: 'Fast, accurate, unkind.' };
    const root = el('ry ryscreen roylobby', `${backdrop}
      <div class="rycard">
        <div class="kick">SEMESTA · BATTLEGROUND</div>
        <h1>LANTERNFALL</h1>
        <p>${ROYALE_SIZE} keepers ride the Dawnskiff over the Emberwaste. Jump when you like, land with a knife, and arm yourself from what is lying on the ground. The Dark closes six times. Last light standing wins.</p>
        <div class="cols">
          <div class="col"><b>DROP</b><span>Pick your moment and steer the glide. Thirteen named places, each with its own loot and cover.</span></div>
          <div class="col"><b>LOOT</b><span>Seven guns in four rarities, tonics, shield cells, ammunition. Lantern drops fall under a balloon with the best of it.</span></div>
          <div class="col"><b>SURVIVE</b><span>Houses hide you: a roof is solid from outside. Walls stop rounds, windows do not. Stay in the light.</span></div>
        </div>
        <div class="guns">${Object.keys(GUNS).map((id) => `<div>${gunIcon(id, '#ffd9a8')}${GUNS[id].cls}</div>`).join('')}</div>
        <h3>THE OTHER ${ROYALE_SIZE - 1}</h3>
        <div class="diffs">${Object.keys(DIFFICULTY).map((k) => `<button class="diff" data-d="${k}"><b>${DIFFICULTY[k].name}</b><span>${blurb[k]}</span></button>`).join('')}</div>
        <div class="stats">
          <div>MATCHES<em>${stats.played | 0}</em></div><div>WINS<em>${stats.wins | 0}</em></div>
          <div>ELIMINATIONS<em>${stats.kills | 0}</em></div><div>BEST PLACE<em>${stats.best ? `#${stats.best}` : '–'}</em></div>
        </div>
        <div class="acts"><button class="rybtn" data-no>BACK</button><button class="rybtn go" data-go>DROP IN</button></div>
        <div class="note">The other keepers are bots: a shared match needs a server update that has not shipped. Nothing in your bag comes with you and nothing can be lost. Coins, XP and Gamepass XP are paid at the end.</div>
      </div>`);
    const paint = () => root.querySelectorAll('.diff').forEach((b) => b.classList.toggle('on', b.dataset.d === diff));
    paint();
    const done = (v) => { window.removeEventListener('keydown', key, true); root.remove(); resolve(v); };
    const key = (e) => {
      if (e.code === 'Escape') { e.stopImmediatePropagation(); done(null); }
      if (e.code === 'Enter') { e.stopImmediatePropagation(); done({ difficulty: diff }); }
    };
    root.addEventListener('click', (e) => {
      const d = e.target.closest('.diff');
      if (d) { diff = d.dataset.d; paint(); return; }
      if (e.target.closest('[data-go]')) done({ difficulty: diff });
      else if (e.target.closest('[data-no]')) done(null);
    });
    window.addEventListener('keydown', key, true);
    document.body.appendChild(root);
  });
}

/** The result. Resolves 'again' or 'leave'. */
export function showRoyaleResult(r) {
  style();
  return new Promise((resolve) => {
    const head = r.won
      ? '<div class="kick">VICTORY</div><h1>LAST LIGHT STANDING</h1>'
      : r.forfeit ? '<div class="kick">YOU LEFT THE ISLE</div><h1>MATCH ABANDONED</h1>'
        : `<div class="kick">${r.by ? `PUT OUT BY ${esc(String(r.by).toUpperCase())}` : 'YOUR LIGHT WENT OUT'}</div><div class="placebig">#${r.place}<small>/ ${r.total}</small></div>`;
    const root = el(`ry ryscreen royresult${r.won ? '' : ' dim'}`, `${r.won ? backdrop : ''}
      <div class="rycard narrow${r.won ? ' win' : ''}">
        ${head}
        <div class="stats">
          <div>ELIMINATIONS<em>${r.kills}</em></div><div>SURVIVED<em>${mmss(r.time)}</em></div>
          <div>COINS<em>+${r.coins}</em></div><div>XP<em>+${r.xp}</em></div>
        </div>
        <div class="acts"><button class="rybtn" data-leave>ANAVELA</button><button class="rybtn go" data-again>PLAY AGAIN</button></div>
      </div>`);
    const done = (v) => { root.remove(); resolve(v); };
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-again]')) done('again');
      else if (e.target.closest('[data-leave]')) done('leave');
    });
    document.body.appendChild(root);
  });
}

/** Black, a title, `mid()` at the darkest frame, and back. */
export function royaleCurtain(title, sub, mid) {
  style();
  return new Promise((resolve) => {
    const c = el('ry rycurtain roycurtain', `<div><span>${esc(sub)}</span><b>${esc(title)}</b></div>`);
    document.body.appendChild(c);
    requestAnimationFrame(() => c.classList.add('on'));
    setTimeout(() => {
      try { mid?.(); } finally {
        setTimeout(() => {
          c.classList.remove('on');
          setTimeout(() => { c.remove(); resolve(); }, 480);
        }, 650);
      }
    }, 520);
  });
}

export function createRoyaleHud({ world, act, fire }) {
  style();
  const hud = el('ry ryhud', `
    <div class="vig hurt"></div><div class="vig sh"></div><div class="vig dark"></div><div class="dir"></div>
    <div class="tl"><button class="glass menu" data-menu title="Pause">&#9776;</button><div class="feed"></div></div>
    <div class="glass zone"><div class="ico"><i></i></div><div><div class="lbl"></div><div class="tm"></div></div></div>
    <div class="place"></div><div class="darkmsg">YOU ARE IN THE DARK</div>
    <div class="tr">
      <div class="glass mini" data-map><canvas width="368" height="368"></canvas><b>M · MAP</b></div>
      <div class="pills"><div class="glass pill"><span>ALIVE</span><em data-alive></em></div><div class="glass pill k"><span>KILLS</span><em data-kills></em></div></div>
    </div>
    <div class="big"><small></small><b></b></div>
    <div class="glass jump"><b></b><span></span></div>
    <div class="toast"></div>
    <div class="glass prompt"></div>
    <div class="glass usebar"><span></span><div class="bar"><i></i></div></div>
    <div class="glass vit">
      <div class="row"><span>SHIELD <em class="s" data-sh></em></span><div class="cons"><span data-ton><i style="background:#63e08a"></i><b></b><kbd>F</kbd></span><span data-cel><i style="background:#5ad1ff"></i><b></b><kbd>G</kbd></span></div></div>
      <div class="bar sh"><i></i></div><div class="bar hp"><i></i></div>
      <div class="row"><span>HEALTH <em data-hp></em></span><span data-ammo></span></div>
    </div>
    <div class="slots">${[0, 1, 2].map((i) => `<div class="glass slot" data-slot="${i}"><kbd>${i + 1}</kbd><div class="ic"></div><div><div class="nm"></div><div class="cl"></div></div><div class="am"></div><div class="rl"></div></div>`).join('')}</div>
    <div class="tc"><button class="f">FIRE</button><button class="j">JUMP</button><button class="r">RELOAD</button><button class="s">SWAP</button><button class="h">HEAL</button><button class="p">PICK</button></div>`);
  document.body.appendChild(hud);
  const cross = el('rycross', '<i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="d"></i><u></u><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="15.9" pathLength="100"/></svg>');
  document.body.appendChild(cross);
  const map = el('ry rymap', `<div class="glass box"><canvas width="900" height="900"></canvas><div class="leg"><h2>THE EMBERWASTE</h2>
    <div><i style="border:2px solid #fff"></i>The light, now</div><div><i style="border:2px dashed #ffb238"></i>Where it closes to</div>
    <div><i style="background:#5a2aa8"></i>The Dark</div><div><i style="background:#ffb238;border-radius:3px"></i>Lantern drop</div>
    <div><i style="background:#ff4a2a"></i>Shots heard</div><div><i style="background:#8a5a3a;border-radius:3px"></i>Houses</div>
    <div><kbd>M</kbd> or <kbd>Esc</kbd> to close</div></div></div>`);
  document.body.appendChild(map);
  map.addEventListener('click', () => toggleMap(false));

  const $ = (s) => hud.querySelector(s);
  const zone = $('.zone'), zLbl = $('.zone .lbl'), zTm = $('.zone .tm'), zIco = $('.zone .ico'), zNum = $('.zone .ico i');
  const place = $('.place'), feed = $('.feed'), big = $('.big'), jump = $('.jump'), toastEl = $('.toast'), prompt = $('.prompt');
  const use = $('.usebar'), useLbl = $('.usebar span'), useBar = $('.usebar i');
  const shBar = $('.bar.sh i'), hpBar = $('.bar.hp i'), hpWrap = $('.bar.hp');
  const vHurt = $('.vig.hurt'), vSh = $('.vig.sh'), vDark = $('.vig.dark'), dir = $('.dir'), darkMsg = $('.darkmsg');
  const slots = [...hud.querySelectorAll('.slot')];
  const mini = $('.mini canvas'), mctx = mini.getContext('2d'), big2 = map.querySelector('canvas'), bctx = big2.getContext('2d');
  const hitm = cross.querySelector('u'), ring = cross.querySelector('svg'), ringC = cross.querySelector('circle');
  const tc = { f: $('.tc .f'), j: $('.tc .j'), p: $('.tc .p') };
  const last = {};
  const set = (key, node, val, prop = 'textContent') => { if (last[key] !== val) { last[key] = val; node[prop] = val; } };
  const cls = (key, node, name, on_) => { if (last[key] !== on_) { last[key] = on_; node.classList.toggle(name, !!on_); } };
  let hurtK = 0, shK = 0, dirK = 0, toastT = 0, placeName = '', mapOpen = false, frame = 0, mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  let lastView = null;

  // ---- input the HUD owns ----
  hud.addEventListener('click', (e) => {
    const s = e.target.closest('.slot');
    if (s) { act?.(`slot${s.dataset.slot}`); return; }
    if (e.target.closest('[data-map]')) toggleMap();
    else if (e.target.closest('[data-menu]')) pause();
  });
  const hold = (b, down, up) => {
    b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
    b.addEventListener('touchend', (e) => { e.preventDefault(); up?.(); }, { passive: false });
    b.addEventListener('touchcancel', () => up?.());
  };
  hold(tc.f, () => fire?.(true), () => fire?.(false));
  hold(tc.j, () => act?.('jump'));
  hold($('.tc .r'), () => act?.('reload'));
  hold($('.tc .s'), () => act?.('next'));
  hold($('.tc .h'), () => act?.('heal'));
  hold(tc.p, () => act?.('pickup'));
  window.addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; });

  // ---- the map ----
  const SPAN = ISLE_R + 10;
  let base = null;
  function paintBase() {
    base = document.createElement('canvas'); base.width = base.height = 1024;
    const g = base.getContext('2d'), k = 1024 / (SPAN * 2), X = (x) => (x + SPAN) * k, R = (r) => r * k;
    g.fillStyle = '#2a1a2e'; g.fillRect(0, 0, 1024, 1024);
    const grad = g.createRadialGradient(512, 512, R(20), 512, 512, R(ISLE_R));
    grad.addColorStop(0, '#e9c48a'); grad.addColorStop(0.8, '#dba968'); grad.addColorStop(1, '#b9783e');
    g.beginPath(); g.arc(512, 512, R(ISLE_R), 0, 7); g.fillStyle = grad; g.fill();
    g.lineWidth = 5; g.strokeStyle = '#7a4326'; g.stroke();
    g.lineCap = 'round'; g.strokeStyle = 'rgba(150,100,56,.75)'; g.lineWidth = R(2.4);
    for (const [ax, az, bx, bz] of ROADS) { g.beginPath(); g.moveTo(X(ax), X(az)); g.lineTo(X(bx), X(bz)); g.stroke(); }
    for (const p of POIS) {
      g.beginPath(); g.arc(X(p.x), X(p.z), R(p.r * 0.8), 0, 7);
      g.fillStyle = p.id === 'oasis' ? 'rgba(110,170,90,.75)' : p.id === 'canyon' ? 'rgba(190,96,56,.7)' : 'rgba(240,214,170,.55)'; g.fill();
    }
    { const o = POIS.find((p) => p.id === 'oasis'); g.beginPath(); g.arc(X(o.x), X(o.z), R(8.5), 0, 7); g.fillStyle = '#4ab4c8'; g.fill(); }
    g.fillStyle = '#a2643c';
    for (const m of world.mesas) { g.beginPath(); g.arc(X(m.x), X(m.z), R(m.r), 0, 7); g.fill(); }
    for (const h of world.houses) {
      g.save(); g.translate(X(h.x - ROYALE_CX), X(h.z - ROYALE_CZ)); g.rotate(Math.atan2(h.s, h.c));
      g.fillStyle = '#8a5a3a'; g.fillRect(-R(h.hw), -R(h.hd), R(h.hw * 2), R(h.hd * 2));
      g.strokeStyle = '#4a2a1a'; g.lineWidth = 2; g.strokeRect(-R(h.hw), -R(h.hd), R(h.hw * 2), R(h.hd * 2)); g.restore();
    }
  }
  /** Draw the isle onto `g` (size px) showing `span` world units around (cx, cz). */
  function drawMap(g, size, v, cx, cz, span, full) {
    if (!base) paintBase();
    const k = size / (span * 2), X = (x) => (x - cx + span) * k, Z = (z) => (z - cz + span) * k;
    g.fillStyle = '#2a1a2e'; g.fillRect(0, 0, size, size);
    const bk = 1024 / (SPAN * 2);
    g.drawImage(base, (cx - ROYALE_CX - span + SPAN) * bk, (cz - ROYALE_CZ - span + SPAN) * bk, span * 2 * bk, span * 2 * bk, 0, 0, size, size);
    const r = v.ring;
    // the Dark: everything outside the light
    g.save(); g.beginPath(); g.rect(0, 0, size, size); g.arc(X(r.x), Z(r.z), Math.max(0.5, r.r * k), 0, 7, true);
    g.fillStyle = 'rgba(70,30,150,.5)'; g.fill('evenodd'); g.restore();
    g.lineWidth = full ? 3 : 2.5; g.strokeStyle = '#fff'; g.beginPath(); g.arc(X(r.x), Z(r.z), Math.max(0.5, r.r * k), 0, 7); g.stroke();
    if (r.mode !== 'done') {
      g.setLineDash([7, 6]); g.strokeStyle = '#ffb238'; g.beginPath(); g.arc(X(r.nx), Z(r.nz), Math.max(1, r.nr * k), 0, 7); g.stroke(); g.setLineDash([]);
    }
    if (full) {
      g.textAlign = 'center'; g.font = '700 15px Rubik, system-ui, sans-serif';
      for (const p of POIS) {
        const x = X(ROYALE_CX + p.x), z = Z(ROYALE_CZ + p.z) - p.r * 0.8 * k - 6;
        g.lineWidth = 4; g.strokeStyle = 'rgba(20,12,10,.85)'; g.strokeText(p.name, x, z);
        g.fillStyle = '#fff3e2'; g.fillText(p.name, x, z);
      }
    }
    if (v.ship.on) {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.setLineDash([4, 6]);
      g.beginPath(); g.moveTo(X(v.ship.x0), Z(v.ship.z0)); g.lineTo(X(v.ship.x0 + v.ship.dx * v.ship.len), Z(v.ship.z0 + v.ship.dz * v.ship.len)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(v.ship.x), Z(v.ship.z), full ? 8 : 6, 0, 7); g.fill();
    }
    for (const p of v.pings) {
      g.strokeStyle = `rgba(255,74,42,${Math.min(1, p.t / 1.2)})`; g.lineWidth = 2.5;
      g.beginPath(); g.arc(X(p.x), Z(p.z), (full ? 9 : 7) + (2.4 - p.t) * 5, 0, 7); g.stroke();
    }
    for (const d of v.drops) {
      if (d.opened) continue;
      const x = X(d.x), z = Z(d.z), s = full ? 9 : 7;
      g.fillStyle = '#ffb238'; g.strokeStyle = '#2a1206'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, z - s); g.lineTo(x + s, z); g.lineTo(x, z + s); g.lineTo(x - s, z); g.closePath(); g.fill(); g.stroke();
    }
    // you
    g.save(); g.translate(X(v.you.x), Z(v.you.z)); g.rotate(Math.PI - v.you.aim);
    const s = full ? 11 : 9;
    g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(s * 0.8, s * 0.9); g.lineTo(0, s * 0.45); g.lineTo(-s * 0.8, s * 0.9); g.closePath();
    g.lineWidth = 3; g.strokeStyle = '#1a0f0a'; g.stroke(); g.fillStyle = '#fff'; g.fill(); g.restore();
  }
  function toggleMap(force) {
    mapOpen = force === undefined ? !mapOpen : !!force;
    map.classList.toggle('on', mapOpen);
    if (mapOpen && lastView) drawMap(bctx, 900, lastView, ROYALE_CX, ROYALE_CZ, SPAN, true);
  }

  // ---- pause ----
  let pauseEl = null, onLeave = null;
  function pause(force) {
    const want = force === undefined ? !pauseEl : !!force;
    if (!want) { pauseEl?.remove(); pauseEl = null; return; }
    if (pauseEl) return;
    toggleMap(false);
    pauseEl = el('ry ryscreen dim roypause', `<div class="rycard narrow"><div class="kick">LANTERNFALL</div><h1 style="font-size:40px">PAUSED</h1>
      <p>The match does not stop while this is open.</p>
      <h3>CONTROLS</h3><div class="keys">${KEYS.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('')}</div>
      <div class="acts"><button class="rybtn bad" data-leave>LEAVE MATCH</button><button class="rybtn go" data-res>RESUME</button></div></div>`);
    pauseEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-res]')) pause(false);
      else if (e.target.closest('[data-leave]')) { pause(false); onLeave?.(); }
    });
    document.body.appendChild(pauseEl);
  }

  function bigText(kick, text, red) {
    big.classList.remove('on'); void big.offsetWidth;
    big.classList.toggle('red', !!red);
    big.querySelector('small').textContent = kick; big.querySelector('b').textContent = text;
    big.classList.add('on');
  }
  function toast(html, color) {
    toastEl.innerHTML = html; toastEl.style.setProperty('--rc', color || '#ffb238');
    toastEl.classList.add('on'); toastT = 2.2;
  }
  function addFeed(html, me) {
    const d = el(me ? 'me' : '', html);
    feed.prepend(d);
    while (feed.children.length > 5) feed.lastChild.remove();
    setTimeout(() => d.remove(), 6500);
  }

  function event(type, d = {}) {
    if (type === 'feed') addFeed(d.a ? `<b>${esc(d.a)}</b><i>▸</i><b>${esc(d.b)}</b> · ${esc(d.how)}` : `<b>${esc(d.b)}</b> was taken by ${esc(d.how)}`, d.you);
    else if (type === 'kill') bigText(d.streak > 1 ? `${d.streak} IN A ROW` : 'ELIMINATED', d.name.toUpperCase(), true);
    else if (type === 'hit') { hitm.classList.remove('on', 'kill'); void hitm.offsetWidth; hitm.classList.add('on'); if (d.kill) hitm.classList.add('kill'); }
    else if (type === 'hurt') {
      if (d.dark) return;
      if (d.shield) shK = 1; else hurtK = 1;
      if (d.ang !== null && d.ang !== undefined) { dir.style.transform = `rotate(${Math.PI - d.ang}rad)`; dirK = 1; }
    } else if (type === 'milestone') bigText('STILL STANDING', d.n === 2 ? 'ONE KEEPER LEFT' : `TOP ${d.n}`);
    else if (type === 'drop') { bigText('MARKED ON YOUR MAP', 'LANTERN DROP INBOUND'); }
    else if (type === 'ring') { if (d.what === 'closing') bigText(`RING ${d.idx + 1}`, 'THE DARK IS CLOSING', true); }
    else if (type === 'pickup') {
      if (d.kind === 'gun') { const r = RARITIES[d.rar]; toast(`<b>${r.name}</b> ${esc(GUNS[d.id].name)}`, r.color); }
      else toast(d.kind === 'tonic' ? '<b>+1</b> Ember Tonic' : d.kind === 'cell' ? '<b>+1</b> Shield Cell' : '<b>+60</b> Ammunition', d.kind === 'tonic' ? '#63e08a' : d.kind === 'cell' ? '#5ad1ff' : '#ffd27a');
    } else if (type === 'dry') toast('<b>EMPTY</b> — find ammunition or swap', '#ff6a3c');
    else if (type === 'landed') toast('Find a gun. They are lying everywhere.');
  }

  function reset() {
    feed.innerHTML = ''; hurtK = shK = dirK = 0; placeName = ''; place.classList.remove('on');
    big.classList.remove('on'); toastEl.classList.remove('on'); toggleMap(false); pause(false);
    for (const k of Object.keys(last)) delete last[k];
  }

  function update(v, dt) {
    if (!v) return;
    lastView = v;
    frame++;
    const y = v.you, r = v.ring;
    // zone
    const closing = r.mode === 'shrink';
    set('zl', zLbl, r.mode === 'done' ? 'NO LIGHT LEFT' : closing ? 'THE DARK IS CLOSING' : 'DARK CLOSES IN');
    set('zt', zTm, r.mode === 'done' ? '0:00' : mmss(r.left + 0.99));
    set('zn', zNum, `${Math.min(v.phases, r.idx + 1)}/${v.phases}`);
    cls('zc', zone, 'closing', closing || r.mode === 'done');
    if (frame % 6 === 0) zIco.style.setProperty('--k', closing ? (1 - r.left / 28).toFixed(2) : '1');
    set('al', $('[data-alive]'), String(v.alive)); set('ki', $('[data-kills]'), String(y.kills));
    // where am I
    const pn = v.place ? v.place.name : '';
    if (pn !== placeName) { placeName = pn; if (pn) { place.textContent = pn; place.classList.add('on'); } else place.classList.remove('on'); }
    // vitals
    const sh = Math.max(0, Math.ceil(y.shield)), hp = Math.max(0, Math.ceil(y.hp));
    set('sh', $('[data-sh]'), String(sh)); set('hp', $('[data-hp]'), String(hp));
    if (last.shb !== sh) { last.shb = sh; shBar.style.transform = `scaleX(${sh / 100})`; }
    if (last.hpb !== hp) { last.hpb = hp; hpBar.style.transform = `scaleX(${hp / 100})`; }
    cls('hpl', hpWrap, 'low', hp <= 30);
    set('tn', $('[data-ton] b'), String(y.tonics)); set('cn', $('[data-cel] b'), String(y.cells));
    cls('tz', $('[data-ton]'), 'zero', !y.tonics); cls('cz', $('[data-cel]'), 'zero', !y.cells);
    set('am', $('[data-ammo]'), `AMMO ${y.ammo}`);
    // slots
    for (let i = 0; i < 3; i++) {
      const s = slots[i], g = i === 0 ? null : y.guns[i - 1];
      const key = i === 0 ? 'knife' : g ? `${g.id}|${g.rar}` : '';
      if (last[`s${i}`] !== key) {
        last[`s${i}`] = key;
        const col = g ? RARITIES[g.rar].color : '#d8cdb4';
        s.style.setProperty('--rc', i === 0 ? 'rgba(255,255,255,.3)' : g ? col : 'rgba(255,255,255,.15)');
        s.querySelector('.ic').innerHTML = key ? gunIcon(i === 0 ? 'knife' : g.id, col) : '';
        s.querySelector('.nm').textContent = i === 0 ? "Keeper's Knife" : g ? g.name : 'Empty';
        s.querySelector('.cl').textContent = i === 0 ? 'MELEE' : g ? `${RARITIES[g.rar].name} · ${g.cls}` : 'FIND A GUN';
        s.classList.toggle('empty', i > 0 && !g);
      }
      cls(`so${i}`, s, 'on', y.slot === i);
      const am = g ? `${g.mag}|${g.reserve}` : '';
      if (last[`a${i}`] !== am) { last[`a${i}`] = am; s.querySelector('.am').innerHTML = g ? `<b class="${g.mag ? '' : 'out'}">${g.mag}</b><small>${g.reserve}</small>` : ''; }
      const rl = y.slot === i && y.reload >= 0 ? Math.round(y.reload * 100) : 0;
      if (last[`r${i}`] !== rl) { last[`r${i}`] = rl; s.querySelector('.rl').style.width = `${rl}%`; }
    }
    // prompt
    const n = y.near, pk = n ? `${n.id}|${n.rar}|${n.swap}` : '';
    if (last.pk !== pk) {
      last.pk = pk;
      prompt.classList.toggle('on', !!n); tc.p.classList.toggle('on', !!n);
      if (n) { const rr = RARITIES[n.rar]; prompt.style.setProperty('--rc', rr.color); prompt.innerHTML = `<kbd>E</kbd><span>${n.swap ? 'SWAP FOR' : 'PICK UP'}</span><b>${esc(n.name)}</b><small>${rr.name} · ${n.cls}</small>`; }
    }
    // using / reloading
    const using = y.use >= 0;
    cls('us', use, 'on', using);
    if (using) { set('ul', useLbl, y.useKind === 'tonic' ? 'DRINKING A TONIC' : 'CHARGING A CELL'); useBar.style.transform = `scaleX(${y.use})`; }
    // the skiff and the glide
    const air = y.phase !== 'ground' && y.alive;
    cls('jo', jump, 'on', air);
    if (air) {
      const ship = y.phase === 'ship';
      cls('jg', jump, 'go', ship && v.ship.canJump);
      set('jb', jump.querySelector('b'), ship ? (v.ship.canJump ? 'SPACE — JUMP' : 'APPROACHING THE ISLE') : `${Math.round(y.alt)} m`, 'textContent');
      set('js', jump.querySelector('span'), ship ? 'OPEN THE MAP (M) AND PICK A PLACE' : 'WASD TO STEER THE GLIDE');
    }
    const showJ = y.phase === 'ship' ? 'block' : 'none';
    if (last.tj !== showJ) { last.tj = showJ; tc.j.style.display = showJ; tc.f.style.display = showJ === 'block' ? 'none' : 'block'; }
    // feelings
    hurtK = Math.max(0, hurtK - dt * 2.2); shK = Math.max(0, shK - dt * 3); dirK = Math.max(0, dirK - dt * 1.1);
    vHurt.style.opacity = Math.max(hurtK * 0.9, hp <= 30 && y.alive ? 0.3 + Math.sin(v.t * 5) * 0.12 : 0).toFixed(2);
    vSh.style.opacity = shK.toFixed(2); dir.style.opacity = Math.min(1, dirK * 1.6).toFixed(2);
    cls('dk', darkMsg, 'on', y.inDark && y.phase === 'ground');
    vDark.style.opacity = y.inDark && y.phase === 'ground' ? '1' : '0';
    if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('on');
    // crosshair
    cross.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    const gap = `${Math.round(5 + y.spread * 150 + (y.reload >= 0 ? 6 : 0))}px`;
    if (last.gap !== gap) { last.gap = gap; cross.style.setProperty('--g', gap); }
    cls('rr', ring, 'on', y.reload >= 0);
    if (y.reload >= 0) ringC.style.strokeDashoffset = String(100 - y.reload * 100);
    // maps
    if (frame % 3 === 0) drawMap(mctx, 368, v, y.x, y.z, y.phase === 'ground' ? 44 : 80, false);
    if (mapOpen && frame % 6 === 0) drawMap(bctx, 900, v, ROYALE_CX, ROYALE_CZ, SPAN, true);
  }

  return {
    update, event, reset, toast, toggleMap, pause,
    isMapOpen: () => mapOpen, isPaused: () => !!pauseEl,
    setLeave: (fn) => { onLeave = fn; },
  };
}
