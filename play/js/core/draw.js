// Draw: vector "sticker" primitives, outlined text, gradients, glow/contact shadows, sprite baking + cache (see docs/ENGINE.md).
// Everything is in design units. sticker()/bake()/gradient() allocate and belong at bake/setup time; sprite(), glow(),
// shadowBlob() and text() are allocation-free per call (gradients are unit-sized and cached per context).
import { stage } from './stage.js';
import { TAU, noise1, clamp, lerp } from './math.js';
import { text as T } from './text.js';

const TUNE = {
  lineWidth: 3, highlight: 0.28, shadow: 0.14, outlineDark: 0.42,
  hiCx: 0.30, hiCy: 0.26, hiR: 0.60,       // highlight centre / radius as fractions of the shape bounds (light from top-left)
  shCx: 0.72, shCy: 0.78, shR: 0.66,       // shadow centre / radius (bottom-right)
  shadowTint: '20,8,40',                   // rgb of the inner shadow (cool dark reads richer than pure black)
  blobSegs: 48, blobFreq: 2.2,
  textOutline: 4, textShadowAlpha: 0.35, textShadowDy: 0.08,
  contactAlpha: 0.25,
  maxBake: 4096, minRes: 0.5,
  fontProbe: ["800 32px 'Baloo 2'", "800 32px 'Cairo'", "900 32px 'Cairo'", "700 32px 'Poppins'"],
};

const NO = {};
const DEF_ANCHOR = [0.5, 0.5];
const B = { x: 0, y: 0, w: 0, h: 0 };     // bounds of the last path helper call; sticker() positions its lighting with it
const cache = new Map();                   // cached(key) -> baked canvas
const gradsByCtx = new WeakMap();          // ctx -> Map(key -> unit CanvasGradient)
const lsStrings = new Map();               // letterSpacing number -> 'Npx'
let hasLetterSpacing = -1;

function setB(x, y, w, h) { B.x = x; B.y = y; B.w = w; B.h = h; }

// Unit gradients (radius 1 at the origin) drawn through translate/scale so one object serves every size.
function unitGrad(ctx, key, build) {
  let m = gradsByCtx.get(ctx);
  if (!m) { m = new Map(); gradsByCtx.set(ctx, m); }
  let g = m.get(key);
  if (!g) { g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); build(g); m.set(key, g); }
  return g;
}
function whiteGrad(ctx, a) {
  return unitGrad(ctx, 'w' + Math.round(a * 100), g => {
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(0.45, 'rgba(255,255,255,' + (a * 0.45).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  });
}
function darkGrad(ctx, a) {
  return unitGrad(ctx, 'd' + Math.round(a * 100), g => {
    g.addColorStop(0, 'rgba(' + TUNE.shadowTint + ',' + a + ')');
    g.addColorStop(0.5, 'rgba(' + TUNE.shadowTint + ',' + (a * 0.4).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + TUNE.shadowTint + ',0)');
  });
}
function contactGrad(ctx) {
  return unitGrad(ctx, 'contact', g => {
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  });
}
function glowGrad(ctx, col) {
  return unitGrad(ctx, 'g' + col, g => {
    g.addColorStop(0, color.alpha(col, 1));
    g.addColorStop(0.25, color.alpha(col, 0.55));
    g.addColorStop(0.55, color.alpha(col, 0.18));
    g.addColorStop(0.8, color.alpha(col, 0.04));
    g.addColorStop(1, color.alpha(col, 0));
  });
}
function lsString(v) {
  let s = lsStrings.get(v);
  if (!s) { s = v + 'px'; lsStrings.set(v, s); }
  return s;
}

// blob() radius sampler: module-level state so the per-point call allocates nothing
let bR = 0, bW = 0, bSeed = 0, bT = 0;
function blobRadius(a) {
  const u = a / TAU;
  const n = noise1(bSeed + a * TUNE.blobFreq + bT) * (1 - u) + noise1(bSeed + (a - TAU) * TUNE.blobFreq + bT) * u;
  return bR * (1 + bW * n);
}

export const draw = {
  TUNE, bounds: B,

  // ---- paths (each begins its own path; fill/stroke/clip afterwards or hand them to sticker) ----
  roundRect(ctx, x, y, w, h, r) {
    const m = Math.min(w, h) / 2;
    let tl, tr, br, bl;
    if (r && typeof r === 'object') {
      if (r.length === 2) { tl = br = r[0]; tr = bl = r[1]; }
      else { tl = r[0]; tr = r.length > 1 ? r[1] : tl; br = r.length > 2 ? r[2] : tl; bl = r.length > 3 ? r[3] : tr; }
    } else { tl = tr = br = bl = r !== undefined ? r : m; }
    tl = clamp(tl, 0, m); tr = clamp(tr, 0, m); br = clamp(br, 0, m); bl = clamp(bl, 0, m);
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y); ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + tl, y, tl);
    ctx.closePath();
    setB(x, y, w, h);
  },
  circle(ctx, x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath();
    setB(x - r, y - r, r * 2, r * 2);
  },
  ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.closePath();
    setB(x - rx, y - ry, rx * 2, ry * 2);
  },
  // pts: flat [x0,y0,x1,y1,...] or nested [[x,y],...] / [{x,y},...]
  polygon(ctx, pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ctx.beginPath();
    if (pts.length && typeof pts[0] === 'number') {
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const px = pts[i], py = pts[i + 1];
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    } else {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const px = p.x !== undefined ? p.x : p[0], py = p.y !== undefined ? p.y : p[1];
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    ctx.closePath();
    if (minX === Infinity) minX = minY = maxX = maxY = 0;
    setB(minX, minY, maxX - minX, maxY - minY);
  },
  // inner: inner radius (values <= 1 are a fraction of r); n points (default 5)
  star(ctx, x, y, r, inner, n) {
    n = n || 5;
    const ri = inner === undefined ? r * 0.5 : inner <= 1 ? r * inner : inner;
    const step = Math.PI / n;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + i * step, rr = (i & 1) ? ri : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    setB(x - r, y - r, r * 2, r * 2);
  },
  // s: width of the heart (height is ~0.92 s), centred on x,y
  heart(ctx, x, y, s) {
    const w = s, h = s * 0.92, top = y - h / 2, bot = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(x, bot);
    ctx.bezierCurveTo(x - w * 0.66, y + h * 0.08, x - w * 0.56, top - h * 0.14, x, top + h * 0.24);
    ctx.bezierCurveTo(x + w * 0.56, top - h * 0.14, x + w * 0.66, y + h * 0.08, x, bot);
    ctx.closePath();
    setB(x - w / 2, top, w, h);
  },
  // circle whose radius wobbles with noise1(seed + angle*k + t); seamless around the seam, smooth (quadratic through midpoints)
  blob(ctx, x, y, r, wobble, seed, t) {
    bR = r; bW = wobble !== undefined ? wobble : 0.12; bSeed = seed || 0; bT = t || 0;
    const n = TUNE.blobSegs, step = TAU / n;
    let r0 = blobRadius(0), x0 = x + r0, y0 = y;
    let r1 = blobRadius(step), x1 = x + Math.cos(step) * r1, y1 = y + Math.sin(step) * r1;
    const sx = x0, sy = y0;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
    for (let i = 1; i <= n; i++) {
      const j = (i + 1) % n;
      let x2, y2;
      if (j === 0) { x2 = sx; y2 = sy; }
      else { const a = j * step, rr = blobRadius(a); x2 = x + Math.cos(a) * rr; y2 = y + Math.sin(a) * rr; }
      ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
      x1 = x2; y1 = y2;
    }
    ctx.closePath();
    const e = r * (1 + bW);
    setB(x - e, y - e, e * 2, e * 2);
  },

  // ---- the sticker style: flat fill + darker round-joined outline + soft top-left highlight + soft bottom-right shadow ----
  // opts: { fill, outline = dark(fill), lineWidth = 3, highlight = 0.28, shadow = 0.14, bounds: [x,y,w,h] for custom paths }
  sticker(ctx, pathFn, o) {
    o = o || NO;
    const fill = o.fill || '#ffffff';
    const lw = o.lineWidth !== undefined ? o.lineWidth : TUNE.lineWidth;
    const outline = o.outline !== undefined ? o.outline : (typeof fill === 'string' ? color.dark(fill) : '#000');
    const hi = o.highlight !== undefined ? o.highlight : TUNE.highlight;
    const sh = o.shadow !== undefined ? o.shadow : TUNE.shadow;
    ctx.save();
    pathFn(ctx);
    if (o.bounds) setB(o.bounds[0], o.bounds[1], o.bounds[2], o.bounds[3]);
    ctx.fillStyle = fill; ctx.fill();
    if (lw > 0 && outline) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = outline; ctx.stroke();
    }
    if ((hi > 0 || sh > 0) && B.w > 0 && B.h > 0) {
      ctx.clip();
      const bx = B.x, by = B.y, bw = B.w, bh = B.h;
      if (hi > 0) {
        ctx.save();
        ctx.translate(bx + bw * TUNE.hiCx, by + bh * TUNE.hiCy); ctx.scale(bw * TUNE.hiR, bh * TUNE.hiR);
        ctx.fillStyle = whiteGrad(ctx, hi); ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
      if (sh > 0) {
        ctx.save();
        ctx.translate(bx + bw * TUNE.shCx, by + bh * TUNE.shCy); ctx.scale(bw * TUNE.shR, bh * TUNE.shR);
        ctx.fillStyle = darkGrad(ctx, sh); ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  // contact shadow under a sprite: soft radial ellipse
  shadowBlob(ctx, x, y, rx, ry, alpha) {
    alpha = alpha !== undefined ? alpha : TUNE.contactAlpha;
    if (alpha <= 0 || rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(rx, ry);
    ctx.fillStyle = contactGrad(ctx); ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  },
  // additive radial glow
  glow(ctx, x, y, r, col, alpha) {
    alpha = alpha !== undefined ? alpha : 1;
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(r, r);
    ctx.fillStyle = glowGrad(ctx, col || '#ffffff'); ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  },

  // stops: [[offset, color], ...]
  gradient(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  },
  radial(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  },

  // Outlined display text. Arabic strings get the Cairo-first stack and RTL direction automatically; returns the size used.
  // opts: { size = 24, weight = 800, font = 'Baloo 2', color = '#fff', align = 'center', baseline = 'middle',
  //         outline, outlineWidth = 4, shadow (true | color), shadowOffset, maxWidth (shrink-to-fit), letterSpacing }
  text(ctx, str, x, y, o) {
    o = o || NO;
    if (str === undefined || str === null) return 0;
    if (typeof str !== 'string') str = String(str);
    let size = o.size !== undefined ? o.size : 24;
    const weight = o.weight !== undefined ? o.weight : 800;
    const family = o.font || 'Baloo 2';
    const rtl = T.dir(str) === 'rtl';
    const ow = o.outline ? (o.outlineWidth !== undefined ? o.outlineWidth : TUNE.textOutline) : 0;
    ctx.save();
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr';
    if (hasLetterSpacing < 0) hasLetterSpacing = ('letterSpacing' in ctx) ? 1 : 0;
    if (hasLetterSpacing) ctx.letterSpacing = lsString(o.letterSpacing && !rtl ? o.letterSpacing : 0);
    ctx.font = T.font(str, size, weight, family);
    if (o.maxWidth > 0) size = T.fit(ctx, str, o.maxWidth, size, weight, family);
    if (ow > 0) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2; ctx.lineWidth = ow; }
    if (o.shadow) {
      const sc = typeof o.shadow === 'string' ? o.shadow : 'rgba(0,0,0,' + TUNE.textShadowAlpha + ')';
      const dy = o.shadowOffset !== undefined ? o.shadowOffset : Math.max(2, size * TUNE.textShadowDy);
      if (ow > 0) { ctx.strokeStyle = sc; ctx.strokeText(str, x, y + dy); }
      ctx.fillStyle = sc; ctx.fillText(str, x, y + dy);
    }
    if (ow > 0) { ctx.strokeStyle = o.outline; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
    return size;
  },

  // ---- sprites ----
  // device pixels per design unit for baked sprites (matches what the stage shows on screen)
  res() { const r = stage.dpr * stage.scale; return r > TUNE.minRes ? r : TUNE.minRes; },
  // Offscreen canvas of w×h design units at stage resolution; fn(ctx, w, h) draws in design units. Returns the canvas with
  // .designW/.designH/.res set so sprite() can draw it back at design size.
  bake(w, h, fn) {
    const res = draw.res();
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.min(TUNE.maxBake, Math.ceil(w * res)));
    cv.height = Math.max(1, Math.min(TUNE.maxBake, Math.ceil(h * res)));
    cv.designW = w; cv.designH = h; cv.res = res;
    const c = cv.getContext('2d');
    c.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
    fn(c, w, h);
    return cv;
  },
  cached(key, w, h, fn) {
    let cv = cache.get(key);
    if (cv && cv.designW === w && cv.designH === h) return cv;
    cv = draw.bake(w, h, fn);
    cache.set(key, cv);
    return cv;
  },
  clearCache() { cache.clear(); },
  cacheSize() { return cache.size; },
  // Draws a baked canvas at design size. opts: { scale = 1, sx = 1, sy = 1 (squash/stretch, multiplied by scale),
  // rot = 0 (radians), alpha = 1, anchor = [0.5, 0.5] (pivot; [0.5, 1] keeps feet planted while squashing) }
  sprite(ctx, cv, x, y, o) {
    o = o || NO;
    const a = o.alpha !== undefined ? o.alpha : 1;
    if (a <= 0 || !cv) return;
    const s = o.scale !== undefined ? o.scale : 1;
    const sx = s * (o.sx !== undefined ? o.sx : 1), sy = s * (o.sy !== undefined ? o.sy : 1);
    const dw = cv.designW || cv.width, dh = cv.designH || cv.height;
    const an = o.anchor || DEF_ANCHOR;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    if (a !== 1) ctx.globalAlpha *= a;
    ctx.drawImage(cv, -dw * an[0], -dh * an[1], dw, dh);
    ctx.restore();
  },

  // Loads the bundled fonts (Baloo 2 / Cairo / Poppins) and resolves when document.fonts is ready; bake text after this.
  ready() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
    const loads = [];
    for (let i = 0; i < TUNE.fontProbe.length; i++) loads.push(document.fonts.load(TUNE.fontProbe[i], 'Hello مرحبا 123').catch(() => null));
    return Promise.all(loads).then(() => document.fonts.ready).then(() => true);
  },
};

// baked sprites only go stale when the pixels-per-unit change (a height-only change keeps them: cached() re-bakes any
// sprite whose design size changed on its own)
let cacheRes = -1;
stage.onResize(() => { const r = draw.res(); if (r !== cacheRes) { cacheRes = r; draw.clearCache(); } });

// ---- color helpers on #rgb / #rrggbb (also accept #rgba / #rrggbbaa / rgb() / rgba() strings) ----
const C = { r: 0, g: 0, b: 0, a: 1 };
const colorCache = new Map();
function parse(str) {
  C.r = C.g = C.b = 0; C.a = 1;
  if (typeof str !== 'string') return C;
  if (str.charCodeAt(0) === 35) {
    const h = str.length;
    if (h === 4 || h === 5) {
      C.r = parseInt(str[1] + str[1], 16); C.g = parseInt(str[2] + str[2], 16); C.b = parseInt(str[3] + str[3], 16);
      if (h === 5) C.a = parseInt(str[4] + str[4], 16) / 255;
    } else if (h >= 7) {
      const n = parseInt(str.substr(1, 6), 16);
      C.r = (n >> 16) & 255; C.g = (n >> 8) & 255; C.b = n & 255;
      if (h === 9) C.a = parseInt(str.substr(7, 2), 16) / 255;
    }
  } else if (str.indexOf('rgb') === 0) {
    const m = str.match(/[\d.]+/g);
    if (m && m.length >= 3) { C.r = +m[0]; C.g = +m[1]; C.b = +m[2]; C.a = m.length > 3 ? +m[3] : 1; }
  }
  return C;
}
function hx(v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }
function toHex(r, g, b) { return '#' + hx(r) + hx(g) + hx(b); }
function memo(key, fn) {
  let v = colorCache.get(key);
  if (v !== undefined) return v;
  if (colorCache.size > 2048) colorCache.clear();
  v = fn(); colorCache.set(key, v); return v;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: h, s: s, l: l };
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
  C.r = (r + m) * 255; C.g = (g + m) * 255; C.b = (b + m) * 255; C.a = 1;
  return C;
}
const pct = v => (v > 1 ? v / 100 : v);

export const color = {
  parse(str) { const c = parse(str); return { r: c.r, g: c.g, b: c.b, a: c.a }; },
  hex: toHex,
  // darker, slightly richer version (HSL lightness * (1-k)); the default sticker outline
  dark(hex, k) {
    k = k !== undefined ? k : TUNE.outlineDark;
    return memo('d' + k + hex, () => {
      const c = parse(hex), hsl = rgbToHsl(c.r, c.g, c.b);
      const o = hslToRgb(hsl.h, Math.min(1, hsl.s * 1.12), hsl.l * (1 - k));
      return toHex(o.r, o.g, o.b);
    });
  },
  light(hex, k) {
    k = k !== undefined ? k : 0.35;
    return memo('l' + k + hex, () => { const c = parse(hex); return toHex(lerp(c.r, 255, k), lerp(c.g, 255, k), lerp(c.b, 255, k)); });
  },
  mix(a, b, t) {
    const ca = parse(a), r0 = ca.r, g0 = ca.g, b0 = ca.b;
    const cb = parse(b);
    return toHex(lerp(r0, cb.r, t), lerp(g0, cb.g, t), lerp(b0, cb.b, t));
  },
  alpha(hex, a) {
    return memo('a' + a + hex, () => { const c = parse(hex); return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + a + ')'; });
  },
  // hsl(h 0..360, s 0..1, l 0..1) -> css 'hsl(...)' string (also accepts 0..100 for s/l)
  hsl(h, s, l) { return 'hsl(' + (((h % 360) + 360) % 360) + ',' + (pct(s) * 100).toFixed(1) + '%,' + (pct(l) * 100).toFixed(1) + '%)'; },
  // fromHsl(h, s, l) -> '#rrggbb' so the result can feed dark/light/mix
  fromHsl(h, s, l) { const c = hslToRgb(h, pct(s), pct(l)); return toHex(c.r, c.g, c.b); },
  toHsl(hex) { const c = parse(hex); return rgbToHsl(c.r, c.g, c.b); },
  // shade(hex, k): k < 0 darkens toward black, k > 0 lightens toward white (|k| 0..1)
  shade(hex, k) {
    if (!k) return hex;
    return memo('s' + k + hex, () => {
      const c = parse(hex), t = Math.min(1, Math.abs(k)), to = k < 0 ? 0 : 255;
      return toHex(lerp(c.r, to, t), lerp(c.g, to, t), lerp(c.b, to, t));
    });
  },
};
