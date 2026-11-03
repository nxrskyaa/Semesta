// THE LINE GAUGE — what the fight looks like from the rod's end.
//
// Two readings and one instruction, nothing else: how much strain is on the
// line (the bar you must keep out of the red), how far the fish still is (it
// swims toward the reel as you win), and a single line telling you what the
// fish is doing right now. The instruction changes colour with the danger, so
// a glance is enough mid-fight; it is the one thing on screen that has to be
// read in under a second.
const CSS = `
#fgauge {
  /* above the interact prompt (its top sits 206px off the bottom on desktop)
     and below the hero, so neither the fish nor the button is covered */
  position: fixed; left: 50%; bottom: 216px; transform: translateX(-50%);
  width: min(320px, calc(100vw - 32px)); z-index: 26; pointer-events: none;
  font-family: var(--font-body, inherit); display: none;
  padding: 9px 12px 10px;
  background: linear-gradient(180deg, rgba(14,22,30,0.92), rgba(8,12,18,0.94));
  box-shadow: inset 0 0 0 2px #2b3f4e, inset 0 0 0 4px rgba(0,0,0,0.5), 0 6px 0 rgba(0,0,0,0.35);
}
#fgauge.show { display: block; animation: fg-in 0.28s cubic-bezier(.2,1.6,.4,1); }
@keyframes fg-in { from { transform: translateX(-50%) scale(0.85); opacity: 0; } }
#fgauge .t { font-family: var(--font-display, inherit); font-size: 10px; letter-spacing: 2px; color: #ffe9b0;
  text-align: center; margin-bottom: 7px; text-shadow: 0 2px 0 #000; }
#fgauge .row { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 8px; margin-top: 5px; }
#fgauge .k { font-size: 8px; letter-spacing: 1px; color: #8fa6b4; }
#fgauge .ten { position: relative; height: 12px;
  background: linear-gradient(90deg, #3d8a4e 0 58%, #c9a03a 58% 84%, #c2463c 84% 100%);
  box-shadow: inset 0 0 0 2px rgba(0,0,0,0.55); }
#fgauge .ten::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.45);
  left: var(--t, 0%); }
#fgauge .ten i { position: absolute; top: -3px; bottom: -3px; width: 4px; left: var(--t, 0%); margin-left: -2px;
  background: #fff6dc; box-shadow: 0 0 6px rgba(255,240,200,0.9), 0 0 0 1px #000; }
#fgauge.hot .ten i { animation: fg-shake 0.09s linear infinite; }
@keyframes fg-shake { 50% { transform: translateX(2px); } }
#fgauge .trk { position: relative; height: 12px; background: rgba(110,170,200,0.16);
  box-shadow: inset 0 0 0 2px rgba(0,0,0,0.55); }
#fgauge .trk::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: var(--p, 0%);
  background: linear-gradient(90deg, rgba(120,200,230,0.1), rgba(120,200,230,0.42)); }
#fgauge .trk .fish { position: absolute; top: 50%; left: var(--p, 0%); width: 18px; height: 10px; margin: -5px 0 0 -9px; }
#fgauge.run .trk .fish { animation: fg-wig 0.16s linear infinite; }
@keyframes fg-wig { 50% { transform: rotate(12deg); } }
#fgauge .trk .you { position: absolute; right: -2px; top: -3px; bottom: -3px; width: 4px; background: #ffe27a; }
#fgauge .st { height: 3px; margin: 3px 0 0 42px; background: rgba(255,255,255,0.08); }
#fgauge .st b { display: block; height: 100%; width: var(--s, 100%); background: #e07a5a; transition: width 0.25s; }
#fgauge .h { margin-top: 8px; text-align: center; font-family: var(--font-display, inherit); font-size: 11px;
  letter-spacing: 2px; text-shadow: 0 2px 0 #000; }
#fgauge .h.good { color: #9fe79a; }
#fgauge .h.warn { color: #ffd36a; }
#fgauge .h.bad { color: #ff8a78; animation: fg-blink 0.32s steps(2) infinite; }
@keyframes fg-blink { 50% { opacity: 0.55; } }
body.touch #fgauge { bottom: auto; top: 57%; width: min(270px, calc(100vw - 32px)); }
`;

const FISH_SVG = `<svg class="fish" viewBox="0 0 18 10" shape-rendering="crispEdges"><path fill="#bfe6f4"
  d="M2 3h2v1h1V3h6v1h2v1h1v1h-1v1h-2v1H5V7H4v1H2V7h1V6h1V5H3V4H2z"/><path fill="#16242e" d="M12 4h1v1h-1z"/></svg>`;

export function createFishGauge() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.id = 'fgauge';
  el.innerHTML = `
    <div class="t"></div>
    <div class="row"><span class="k">LINE</span><div class="ten"><i></i></div></div>
    <div class="row"><span class="k">FISH</span><div class="trk">${FISH_SVG}<span class="you"></span></div></div>
    <div class="st"><b></b></div>
    <div class="h"></div>`;
  document.body.appendChild(el);
  const tEl = el.querySelector('.t'), hEl = el.querySelector('.h');
  const ten = el.querySelector('.ten'), trk = el.querySelector('.trk'), stEl = el.querySelector('.st b');
  let shown = false, lastHint = '', lastTitle = '';

  /** data: { title, hint, tone, tension, progress, stam, running } or null */
  function set(d) {
    if (!d) {
      if (shown) { el.classList.remove('show', 'hot', 'run'); shown = false; lastHint = lastTitle = ''; }
      return;
    }
    if (!shown) { el.classList.add('show'); shown = true; }
    if (d.title !== lastTitle) { tEl.textContent = d.title; lastTitle = d.title; }
    if (d.hint !== lastHint) { hEl.textContent = d.hint; hEl.className = `h ${d.tone}`; lastHint = d.hint; }
    ten.style.setProperty('--t', `${(d.tension * 100).toFixed(1)}%`);
    trk.style.setProperty('--p', `${(d.progress * 100).toFixed(1)}%`);
    stEl.style.setProperty('--s', `${(d.stam * 100).toFixed(0)}%`);
    el.classList.toggle('hot', d.tension > 0.84);
    el.classList.toggle('run', !!d.running);
  }
  return { set };
}
