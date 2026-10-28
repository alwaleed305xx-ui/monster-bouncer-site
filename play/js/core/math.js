// Math helpers, deterministic RNG, value noise and the easing index shared by every module (see docs/ENGINE.md).
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp(invLerp(a, b, v), 0, 1));
export const smoothstep = (a, b, v) => { const t = clamp(invLerp(a, b, v), 0, 1); return t * t * (3 - 2 * t); };
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
export const wrapAngle = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
export const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;
export const sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
// Frame-rate independent exponential damping: moves v toward target with time constant `rate` per second.
export const damp = (v, target, rate, dt) => lerp(v, target, 1 - Math.exp(-rate * dt));

export const rand = (a, b) => { if (a === undefined) { a = 0; b = 1; } else if (b === undefined) { b = a; a = 0; } return a + Math.random() * (b - a); };
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const chance = p => Math.random() < p;

// Deterministic PRNG (mulberry32). rng(seed) -> { next, int, range, pick, chance, shuffle, seed }
export function rng(seed) {
  let s = (seed === undefined ? 123456789 : seed) >>> 0;
  if (typeof seed === 'string') { s = 2166136261; for (let i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; } }
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    seed: s,
    next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
    shuffle: arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
  };
  return r;
}

// Smooth 1D value noise in -1..1 (hash based, deterministic, continuous).
function hash1(i) { let h = (i | 0) * 374761393; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) / 4294967296) * 2 - 1; }
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u);
}

// Easing index: every function maps t in 0..1 to 0..1 (back/elastic overshoot by design).
const c1 = 1.70158, c3 = c1 + 1, c2 = c1 * 1.525, c4 = TAU / 3;
export const easeIndex = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: t => t * t * t * t,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inBack: t => c3 * t * t * t - c1 * t * t,
  outBack: t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  inOutBack: t => (t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2),
  outElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
  outBounce: t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; },
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: t => Math.sin((t * Math.PI) / 2),
  outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
};
