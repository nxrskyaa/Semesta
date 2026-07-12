// Background remover for the branding PNGs (logo + mascot). The source images
// ship with a solid background (white for the logo, blue for the mascot), so
// we key it out at load time: flood-fill inward from the border, clearing
// pixels close to the sampled corner color. Flood-fill (not a global color
// key) protects light/blue details INSIDE the art — only the connected outer
// background is removed. A soft edge pass feathers the anti-aliased fringe.
const cache = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

export async function cleanImage(url) {
  if (cache.has(url)) return cache.get(url);
  let result = url;
  try {
    const im = await loadImage(url);
    const w = im.naturalWidth, h = im.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    // sample the four corners for the background color
    const corner = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const cs = [corner(1, 1), corner(w - 2, 1), corner(1, h - 2), corner(w - 2, h - 2)];
    const bg = [0, 1, 2].map((k) => Math.round(cs.reduce((s, p) => s + p[k], 0) / cs.length));

    // generous tolerance handles gradient backgrounds (the mascot's blue is
    // vignetted); flood-fill still protects interior art since it only reaches
    // background pixels connected to the border
    const HARD = 90;   // within this distance of bg -> fully transparent
    const SOFT = 150;  // between HARD and SOFT -> feathered alpha, flood stops
    const dist2 = (i) => {
      const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
      return dr * dr + dg * dg + db * db;
    };

    const visited = new Uint8Array(w * h);
    const stack = [];
    // seed from every border pixel
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + (w - 1)); }

    const HARD2 = HARD * HARD, SOFT2 = SOFT * SOFT;
    while (stack.length) {
      const p = stack.pop();
      if (visited[p]) continue;
      visited[p] = 1;
      const i = p * 4;
      const dd = dist2(i);
      if (dd <= HARD2) {
        d[i + 3] = 0; // clear
      } else if (dd <= SOFT2) {
        // feather: partial alpha, but don't flood through (protects edges)
        const t = (dd - HARD2) / (SOFT2 - HARD2);
        d[i + 3] = Math.min(d[i + 3], Math.round(255 * t));
        continue;
      } else {
        continue; // real art — stop
      }
      const x = p % w, y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }

    ctx.putImageData(img, 0, 0);
    result = c.toDataURL('image/png');
  } catch {
    result = url; // fall back to the raw image on any failure
  }
  cache.set(url, result);
  return result;
}
