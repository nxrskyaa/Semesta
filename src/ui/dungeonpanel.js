// THE GATE.
//
// One screen, asked once, before you commit: how hard, and how deep. Both
// answers matter and neither is recoverable mid-run, so they are made together
// and in front of you rather than buried in a submenu.
//
// It is deliberately NOT a level-select grid of thirty numbered boxes. Thirty
// boxes is a spreadsheet; what the player actually wants to know is "how far
// did I get, and what is next" — so the floor row shows your deepest cleared
// floor, the one below it, and the two landmark floors either side of it, and
// nothing else. Everything else is a jump you cannot make anyway.

const CSS = `
.dgate { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center;
  justify-content: center; background: rgba(6,4,10,0.82); backdrop-filter: blur(2px);
  font-family: var(--font-body, monospace); }
.dgate .card { width: min(680px, 94vw); max-height: 92vh; overflow: auto;
  background: #14101c; border: var(--pix-frame, 3px solid #4a4060); padding: 18px 20px 20px;
  box-shadow: 0 0 0 3px #0a0810, 0 14px 40px rgba(0,0,0,0.6); }
.dgate h2 { font-family: var(--font-display, monospace); font-size: 22px; margin: 0 0 2px;
  color: #e8d8ff; letter-spacing: 1px; }
.dgate .sub { color: #9a8ab8; font-size: 12px; margin-bottom: 14px; line-height: 1.5; }
.dgate .lbl { color: #7f72a0; font-size: 11px; letter-spacing: 2px; margin: 14px 0 7px; }
.dgate .diffs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.dgate .diff { background: #1d1830; border: 2px solid #2e2745; padding: 10px 9px; cursor: pointer;
  text-align: left; color: #cfc4e4; }
.dgate .diff:hover { border-color: #55486f; }
.dgate .diff.on { border-color: currentColor; background: #241d3a; }
.dgate .diff .t { font-family: var(--font-display, monospace); font-size: 13px; letter-spacing: 1px; }
.dgate .diff .n { font-size: 11px; color: #8f82ad; margin-top: 3px; }
.dgate .diff .b { font-size: 11px; color: #9c8fbb; margin-top: 6px; line-height: 1.45; }
.dgate .floors { display: flex; gap: 7px; flex-wrap: wrap; }
.dgate .fl { min-width: 62px; background: #1d1830; border: 2px solid #2e2745; padding: 8px 6px;
  cursor: pointer; text-align: center; color: #cfc4e4; }
.dgate .fl:hover { border-color: #55486f; }
.dgate .fl.on { border-color: #d8b45c; background: #2a2140; }
.dgate .fl .n { font-family: var(--font-display, monospace); font-size: 15px; }
.dgate .fl .k { font-size: 9px; letter-spacing: 1px; margin-top: 2px; color: #9a8ab8; }
.dgate .fl.warden .k { color: #ffc95c; }
.dgate .fl.great .k { color: #ff6b5e; }
.dgate .band { margin-top: 12px; padding: 9px 11px; background: #1a1526; border-left: 3px solid #55486f; }
.dgate .band .bn { font-family: var(--font-display, monospace); font-size: 12px; color: #d8c8ff; }
.dgate .band .bb { font-size: 11px; color: #8f82ad; margin-top: 3px; line-height: 1.5; }
.dgate .warn { margin-top: 12px; font-size: 11px; color: #ffb07a; line-height: 1.5; }
.dgate .row { display: flex; gap: 9px; margin-top: 16px; }
.dgate button.go { flex: 1; padding: 11px; background: #6a4ba8; color: #fff; border: var(--pix-btn, 2px solid #8a6ac8);
  font-family: var(--font-display, monospace); font-size: 13px; letter-spacing: 1px; cursor: pointer; }
.dgate button.go:disabled { background: #332c48; color: #6a6080; cursor: not-allowed; }
.dgate button.back { padding: 11px 16px; background: #241d33; color: #bfb2d8;
  border: var(--pix-btn, 2px solid #3d3454); cursor: pointer; font-size: 12px; }
`;

const KIND_LABEL = { hall: 'HALL', warden: 'WARDEN', great: 'LORD' };

/**
 * @param dj        the dungeon system
 * @param level     the hero's level, for the gate
 * @returns Promise<{difficulty, floor} | null>   null = walked away
 */
export function showDungeonGate(dj, level) {
  return new Promise((resolve) => {
    if (!document.getElementById('dgate-css')) {
      const st = document.createElement('style');
      st.id = 'dgate-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const ov = dj.overview(level);
    let diff = 'easy';
    let floor = 1;

    const el = document.createElement('div');
    el.className = 'dgate';
    document.body.appendChild(el);

    /**
     * The floors worth offering: the deepest you have cleared, the next one
     * down, and the landmark floors on the way. Never thirty boxes.
     */
    function floorChoices() {
      const open = dj.highestOpen(diff);
      const set = new Set([1, open]);
      if (open > 1) set.add(open - 1);
      // the last warden and lord you have already earned the right to revisit
      for (let n = 5; n <= open; n += 5) set.add(n);
      return [...set].filter((n) => n >= 1 && n <= open).sort((a, b) => a - b).slice(-6);
    }

    function paint() {
      const open = dj.highestOpen(diff);
      if (floor > open) floor = open;
      const choices = floorChoices();
      const theme = dj.THEMES[dj.floorTheme(floor)];
      const kind = dj.floorKind(floor);
      const d = dj.DIFFICULTIES[diff];

      el.innerHTML = `
      <div class="card">
        <h2>THE HOLLOW</h2>
        <div class="sub">Under the shrine, where the lights went out first.
          Nothing down here wanders off, and the way out is forward.</div>

        <div class="lbl">HOW DEEP DARE YOU</div>
        <div class="diffs">
          ${dj.DIFF_ORDER.map((id) => {
            const x = dj.DIFFICULTIES[id];
            const c = ov.difficulties.find((q) => q.id === id);
            return `<div class="diff ${id === diff ? 'on' : ''}" data-d="${id}" style="color:${x.color}">
              <div class="t">${x.tag}</div>
              <div class="n" style="color:${x.color}">${c.done ? 'CLEARED' : `Floor ${c.cleared} / ${dj.MAX_FLOOR}`}</div>
              <div class="b">${x.blurb}</div>
            </div>`;
          }).join('')}
        </div>

        <div class="lbl">WHERE TO ENTER &nbsp;·&nbsp; deepest open: ${open}</div>
        <div class="floors">
          ${choices.map((n) => {
            const k = dj.floorKind(n);
            return `<div class="fl ${k} ${n === floor ? 'on' : ''}" data-f="${n}">
              <div class="n">${n}</div><div class="k">${KIND_LABEL[k]}</div>
            </div>`;
          }).join('')}
        </div>

        <div class="band">
          <div class="bn">${theme.glyph} ${theme.name} &nbsp;·&nbsp; ${KIND_LABEL[kind]}</div>
          <div class="bb">${theme.blurb}</div>
        </div>

        <div class="warn">There is no auto-battle down here, and dying sends you home
          with whatever you have already picked up. Rewards up to
          <b style="color:${d.color}">${d.maxLoot.toUpperCase()}</b> on ${d.tag}.</div>

        <div class="row">
          <button class="back">WALK AWAY</button>
          <button class="go">DESCEND &nbsp;·&nbsp; FLOOR ${floor}</button>
        </div>
      </div>`;
    }

    // Delegated on `el`, which survives every repaint. The account strip in the
    // main menu was bound to a child that innerHTML destroyed and the buttons
    // silently died; the same mistake costs the same thing here.
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-d]');
      if (d) { diff = d.dataset.d; paint(); return; }
      const f = e.target.closest('[data-f]');
      if (f) { floor = Number(f.dataset.f); paint(); return; }
      if (e.target.closest('.back') || e.target === el) { close(null); return; }
      if (e.target.closest('.go')) {
        const can = dj.canEnter(level, diff, floor);
        if (can.ok) close({ difficulty: diff, floor });
      }
    });

    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);

    function close(res) {
      document.removeEventListener('keydown', onKey);
      el.remove();
      resolve(res);
    }
    paint();
  });
}

/**
 * The locked message. Shown instead of the gate below the unlock level, because
 * a gate you cannot open should say why rather than simply not respond.
 */
export function hollowLockedText(level, need) {
  return `The stair is sealed. The Hollow opens at level ${need} — you are ${level}.`;
}
