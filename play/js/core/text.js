// Text helpers (Arabic-aware): font stacks, shrink-to-fit, word wrap, direction detection and digit formatting.
// draw.text builds on these; call them with the canvas ctx that will draw the string (see docs/ENGINE.md).
const TUNE = {
  families: ['Baloo 2', 'Cairo', 'Poppins'],   // bundled by css/fonts.css; Cairo carries the Arabic glyphs
  tail: 'system-ui,sans-serif',
  defaultFamily: 'Baloo 2', defaultWeight: 800,
  minFitScale: 0.4, fitShrink: 0.97, fitPasses: 8,
  ellipsis: '…', cacheMax: 512,
};

const NO = {};
const fonts = new Map();   // 'r|800|24|Baloo 2' -> css font string
const stacks = new Map();  // 'r:Baloo 2' -> family list
const INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const COMPACT = { en: ['K', 'M', 'B', 'T'], ar: [' ألف', ' مليون', ' مليار', ' تريليون'] };

function isRtlCode(c) {
  return (c >= 0x0590 && c <= 0x08FF) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF);
}
function isArabicCode(c) {
  return (c >= 0x0600 && c <= 0x06FF) || (c >= 0x0750 && c <= 0x077F) || (c >= 0x08A0 && c <= 0x08FF) || (c >= 0xFB50 && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF);
}
function isLtrCode(c) {
  return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0x00C0 && c <= 0x024F) || (c >= 0x0370 && c <= 0x052F) ||
    (c >= 0x3040 && c <= 0x30FF) || (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0xAC00 && c <= 0xD7AF);
}

// 'rtl' when the first strong character is Arabic (or Hebrew), otherwise 'ltr'.
export function dir(str) {
  if (!str) return 'ltr';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (isRtlCode(c)) return 'rtl';
    if (isLtrCode(c)) return 'ltr';
  }
  return 'ltr';
}
export function isArabic(str) {
  if (!str) return false;
  for (let i = 0; i < str.length; i++) if (isArabicCode(str.charCodeAt(i))) return true;
  return false;
}

// Family list: requested family first (Cairo first for RTL strings), then the other bundled families, then system fallbacks.
export function stack(rtl, family) {
  family = family || TUNE.defaultFamily;
  const key = (rtl ? 'r:' : 'l:') + family;
  let s = stacks.get(key);
  if (s) return s;
  const order = [];
  if (rtl) order.push('Cairo');
  if (order.indexOf(family) < 0) order.push(family);
  for (let i = 0; i < TUNE.families.length; i++) if (order.indexOf(TUNE.families[i]) < 0) order.push(TUNE.families[i]);
  s = '';
  for (let i = 0; i < order.length; i++) s += "'" + order[i] + "',";
  s += TUNE.tail;
  stacks.set(key, s);
  return s;
}

// CSS font string for `str` (memoised): weight + size + the right stack for its direction.
export function font(str, size, weight, family) {
  const rtl = dir(str) === 'rtl';
  weight = weight !== undefined ? weight : TUNE.defaultWeight;
  family = family || TUNE.defaultFamily;
  const key = (rtl ? 'r|' : 'l|') + weight + '|' + size + '|' + family;
  let f = fonts.get(key);
  if (f) return f;
  if (fonts.size >= TUNE.cacheMax) fonts.clear();
  f = weight + ' ' + size + 'px ' + stack(rtl, family);
  fonts.set(key, f);
  return f;
}

export function measure(ctx, str, size, weight, family) {
  ctx.font = font(str, size, weight, family);
  return ctx.measureText(str).width;
}

// Largest size <= `size` whose width fits maxWidth (never below size*minFitScale). Leaves ctx.font set to the result.
export function fit(ctx, str, maxWidth, size, weight, family) {
  let s = size;
  let w = measure(ctx, str, s, weight, family);
  if (!(w > maxWidth) || !(maxWidth > 0)) return s;
  const min = size * TUNE.minFitScale;
  s = Math.max(min, Math.floor((size * maxWidth / w) * 10) / 10);
  for (let i = 0; i < TUNE.fitPasses; i++) {
    w = measure(ctx, str, s, weight, family);
    if (w <= maxWidth || s <= min) break;
    s = Math.max(min, Math.floor(s * TUNE.fitShrink * 10) / 10);
  }
  return s;
}

// Greedy word wrap on spaces and explicit newlines. Arabic stays joined because each line is shaped by the canvas as a unit;
// a single word wider than maxWidth is broken by characters as a last resort.
export function wrap(ctx, str, maxWidth, size, weight, family) {
  const lines = [];
  if (str === undefined || str === null) return lines;
  str = String(str);
  ctx.font = font(str, size, weight, family);
  const paras = str.split('\n');
  for (let p = 0; p < paras.length; p++) {
    const words = paras[p].split(' ');
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word === '') continue;
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width <= maxWidth) { cur = test; continue; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(word).width <= maxWidth) { cur = word; continue; }
      let piece = '';
      for (let k = 0; k < word.length; k++) {
        const t2 = piece + word[k];
        if (piece && ctx.measureText(t2).width > maxWidth) { lines.push(piece); piece = word[k]; } else piece = t2;
      }
      cur = piece;
    }
    lines.push(cur);
  }
  return lines;
}

// Keep at most `max` lines; the last kept line gets an ellipsis when something was dropped.
export function clampLines(lines, max, ellipsis) {
  if (!lines || lines.length <= max) return lines;
  const out = lines.slice(0, Math.max(1, max));
  const last = out.length - 1;
  out[last] = out[last].replace(/[\s.,،]+$/, '') + (ellipsis !== undefined ? ellipsis : TUNE.ellipsis);
  return out;
}

export function toIndic(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    out += (c >= 48 && c <= 57) ? INDIC[c - 48] : str[i];
  }
  return out;
}

// number(1234567, 'ar', { indic: true }) -> '١٬٢٣٤٬٥٦٧'. opts: { indic, group = true, decimals, compact }
export function number(n, lang, opts) {
  opts = opts || NO;
  if (n === undefined || n === null || n !== n) return '';
  const neg = n < 0;
  let v = Math.abs(n);
  const indic = lang === 'ar' && !!opts.indic;
  let suffix = '';
  if (opts.compact && v >= 1000) {
    const units = COMPACT[lang === 'ar' ? 'ar' : 'en'];
    let u = -1;
    while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
    suffix = units[u];
    v = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
  }
  let s = opts.decimals !== undefined ? v.toFixed(opts.decimals) : String(Math.round(v * 1e6) / 1e6);
  if (s.indexOf('e') >= 0) s = Math.round(v).toLocaleString('en-US', { useGrouping: false });
  let intPart = s, frac = '';
  const dot = s.indexOf('.');
  if (dot >= 0) { intPart = s.slice(0, dot); frac = s.slice(dot + 1); }
  const sep = opts.group === false ? '' : (indic ? '٬' : ',');
  let out = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && sep && (intPart.length - i) % 3 === 0) out += sep;
    out += intPart[i];
  }
  if (frac) out += (indic ? '٫' : '.') + frac;
  if (indic) out = toIndic(out);
  return (neg ? '-' : '') + out + suffix;
}

export const text = { TUNE, dir, isArabic, stack, font, measure, fit, wrap, clampLines, toIndic, number };
