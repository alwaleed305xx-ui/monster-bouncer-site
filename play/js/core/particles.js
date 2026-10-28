// Particles: a pooled 2D particle system (max 2000, zero allocation per frame) with premium presets, continuous emitters
// and additive glow batching. Usage: particles.emit('confetti', x, y, { count: 120 }); particles.update(dt) in the loop;
// particles.draw(ctx, 'back') before the scene and particles.draw(ctx, 'front') after it (see docs/ENGINE.md).
// Mobile budget: at most TUNE.glowBudget halo sprites per draw() call; past that, glow particles keep their additive
// shape but skip the halo. Timed emitters (opts.duration) remove themselves when they expire. particles.clear('front')
// / particles.fade('front', 0.3) drop or dim one layer's leftovers (e.g. LAST CALL confetti under a result dim).
import { TAU, rand, pick } from './math.js';

const TUNE = {
  max: 2000,
  haloScale: 2.6, haloAlpha: 0.55,     // soft additive halo (radial sprite) drawn behind every glow particle
  glowBudget: 400,                      // max halos per draw() call (each halo is an extra drawImage under 'lighter')
  spritePx: 128,                        // soft radial sprite resolution, baked once per colour
  spriteStops: [[0, 1], [0.18, 0.8], [0.42, 0.36], [0.7, 0.09], [1, 0]],   // [offset, alpha] of the soft falloff
  sparkMinLen: 0.6, sparkSpeedK: 1 / 90,  // spark length = size * (minLen + speed * speedK)
  stretchK: 1 / 260,                    // velocity stretch: ellipse length = size * (1 + stretch * speed * stretchK)
  rectAspect: 0.62, triBase: 1.0,
  starInner: 0.46,
  backFaceAlpha: 0.72,                  // flutter/flip particles dim when showing their back
  minAlpha: 0.004, minSize: 0.05,
  emitterDefaultRate: 30,
};

export const PALETTE = { gold: '#ffd166', coral: '#ff6b6b', mint: '#4ecdc4', violet: '#a78bfa', sky: '#60a5fa', white: '#ffffff' };
const PREMIUM = [PALETTE.gold, PALETTE.coral, PALETTE.mint, PALETTE.violet, PALETTE.sky, PALETTE.white];

const SHAPE = { circle: 0, rect: 1, star: 2, ring: 3, spark: 4, tri: 5, line: 6, ellipse: 7, blob: 8 };
const LAYER = { back: 0, front: 1 };

// Alpha curves: (t = age / maxLife in 0..1, particle) -> multiplier.
export const ALPHA = {
  one: () => 1,
  fadeOut: t => 1 - t,
  fadeLate: t => (t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45),
  flash: t => 1 - t * t,
  inOut: t => Math.sin(t * Math.PI),
  soft: t => (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85),
  twinkle: (t, p) => (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.age * p.twinkleFreq + p.phase))) * (1 - t * t),
};

// Every preset field, with the value used when a preset leaves it out. Overrides passed to emit() win over the preset.
const DEFAULTS = {
  count: 12, speed: [100, 300], angle: undefined, spread: TAU, life: [0.6, 1.2],
  size: [6, 0], sizeJitter: 0.25, alpha: 1, alphaCurve: 'fadeOut',
  colors: PREMIUM, color2: undefined, shape: 'circle', glow: false, layer: 'front',
  gravity: 0, drag: 0, spin: 0, rot: 0, wobble: 0, wobbleFreq: 6, flutter: false, flutterFreq: 12,
  stretch: 0, twinkleFreq: 20, stroke: [4, 0.5], spawnRadius: 0, vx: 0, vy: 0, also: undefined,
};

const presets = {};
const pool = new Array(TUNE.max);
for (let i = 0; i < TUNE.max; i++) {
  pool[i] = {
    x: 0, y: 0, vx: 0, vy: 0, drag: 0, gravity: 0, life: 0, maxLife: 1, age: 0,
    size0: 1, size1: 0, sizeFn: null, alpha0: 1, alphaFn: null, color: '#fff', color2: '#fff',
    rot: 0, spin: 0, shape: 0, glow: false, layer: 1, wobble: 0, wobbleFreq: 0, phase: 0,
    flutter: false, flutterFreq: 0, stretch: 0, twinkleFreq: 0, stroke0: 0, stroke1: 0,
  };
}
let n = 0;          // pool[0..n-1] are alive
let steal = 0;      // round-robin victim when the pool is full
const emitters = [];

const field = (pr, ov, k) => (ov && ov[k] !== undefined ? ov[k] : pr[k]);
const range = v => (Array.isArray(v) ? rand(v[0], v[1]) : v);

// Soft radial sprite per colour (any CSS colour string): the colour masked by a radial alpha falloff. Baked on first
// use of a colour, then reused by every halo and blob, so the draw loop never builds gradients.
const sprites = {};
function softSprite(color) {
  let s = sprites[color];
  if (s) return s;
  const px = TUNE.spritePx, half = px / 2;
  s = document.createElement('canvas'); s.width = s.height = px;
  const c = s.getContext('2d');
  c.fillStyle = color; c.fillRect(0, 0, px, px);
  const g = c.createRadialGradient(half, half, 0, half, half, half);
  const stops = TUNE.spriteStops;
  for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], 'rgba(255,255,255,' + stops[i][1] + ')');
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, px, px);
  sprites[color] = s;
  return s;
}

function spawn(pr, ov, x, y) {
  let p;
  if (n >= TUNE.max) { p = pool[steal % n]; steal++; } else { p = pool[n++]; }
  const sr = field(pr, ov, 'spawnRadius');
  if (sr > 0) { const r = Math.sqrt(Math.random()) * sr, a = Math.random() * TAU; x += Math.cos(a) * r; y += Math.sin(a) * r; }
  p.x = x; p.y = y;
  const ang = field(pr, ov, 'angle');
  const a = ang === undefined ? Math.random() * TAU : ang + (Math.random() - 0.5) * field(pr, ov, 'spread');
  const sp = range(field(pr, ov, 'speed'));
  p.vx = Math.cos(a) * sp + field(pr, ov, 'vx');
  p.vy = Math.sin(a) * sp + field(pr, ov, 'vy');
  p.drag = field(pr, ov, 'drag'); p.gravity = field(pr, ov, 'gravity');
  p.life = p.maxLife = Math.max(0.016, range(field(pr, ov, 'life'))); p.age = 0;
  const s = field(pr, ov, 'size');
  if (typeof s === 'function') { p.sizeFn = s; p.size0 = p.size1 = 1; }
  else if (Array.isArray(s)) { p.sizeFn = null; p.size0 = s[0]; p.size1 = s[1]; }
  else { p.sizeFn = null; p.size0 = p.size1 = s; }
  const j = field(pr, ov, 'sizeJitter');
  if (j) { const k = 1 + (Math.random() * 2 - 1) * j; p.size0 *= k; p.size1 *= k; }
  p.alpha0 = range(field(pr, ov, 'alpha'));
  const ac = field(pr, ov, 'alphaCurve');
  p.alphaFn = typeof ac === 'string' ? ALPHA[ac] || ALPHA.fadeOut : ac;
  const c = field(pr, ov, 'colors');
  p.color = Array.isArray(c) ? pick(c) : c;
  const c2 = field(pr, ov, 'color2');
  p.color2 = c2 === undefined ? p.color : c2;
  const sh = field(pr, ov, 'shape');
  p.shape = typeof sh === 'number' ? sh : (SHAPE[sh] !== undefined ? SHAPE[sh] : 0);
  p.glow = !!field(pr, ov, 'glow');
  const ly = field(pr, ov, 'layer');
  p.layer = typeof ly === 'number' ? ly : (LAYER[ly] !== undefined ? LAYER[ly] : 1);
  const rt = field(pr, ov, 'rot');
  p.rot = rt === 'random' ? Math.random() * TAU : rt === 'velocity' ? a : rt;
  p.spin = range(field(pr, ov, 'spin'));
  p.wobble = field(pr, ov, 'wobble'); p.wobbleFreq = range(field(pr, ov, 'wobbleFreq'));
  p.phase = Math.random() * TAU;
  p.flutter = !!field(pr, ov, 'flutter'); p.flutterFreq = range(field(pr, ov, 'flutterFreq'));
  p.stretch = field(pr, ov, 'stretch'); p.twinkleFreq = range(field(pr, ov, 'twinkleFreq'));
  const st = field(pr, ov, 'stroke');
  if (Array.isArray(st)) { p.stroke0 = st[0]; p.stroke1 = st[1]; } else { p.stroke0 = p.stroke1 = st; }
}

// Raw preset objects are merged with DEFAULTS once and cached (keyed by the object), so emit(obj, ...) and emitters
// built from an object allocate nothing after the first call. Edit the object before its first use.
const resolved = new WeakMap();
function resolve(preset) {
  if (typeof preset === 'string') { const pr = presets[preset]; if (!pr) throw new Error('particles: unknown preset ' + preset); return pr; }
  if (preset.__ready) return preset;
  let r = resolved.get(preset);
  if (!r) { r = Object.assign({ __ready: true }, DEFAULTS, preset); resolved.set(preset, r); }
  return r;
}

function emit(preset, x, y, ov) {
  const pr = resolve(preset);
  const count = Math.round(field(pr, ov, 'count'));
  for (let i = 0; i < count; i++) spawn(pr, ov, x, y);
  const also = field(pr, ov, 'also');
  if (also) for (let i = 0; i < also.length; i++) emit(also[i].preset, x, y, also[i].overrides);
}

// Returns 1 when a halo sprite was drawn (counted against TUNE.glowBudget), else 0.
function drawOne(ctx, p, halo) {
  let t = p.age / p.maxLife; if (t > 1) t = 1;
  let a = p.alpha0 * p.alphaFn(t, p);
  if (a <= TUNE.minAlpha) return 0;
  if (a > 1) a = 1;
  const size = p.sizeFn ? p.sizeFn(t, p) : p.size0 + (p.size1 - p.size0) * t;
  if (size <= TUNE.minSize) return 0;
  let drewHalo = 0;
  let x = p.x;
  const y = p.y;
  if (p.wobble) x += Math.sin(p.age * p.wobbleFreq + p.phase) * p.wobble;
  let flip = 1;
  if (p.flutter) { flip = Math.cos(p.age * p.flutterFreq + p.phase); if (flip < 0) a *= TUNE.backFaceAlpha; }
  const col = flip < 0 ? p.color2 : p.color;
  ctx.fillStyle = col;
  if (halo && p.shape !== SHAPE.blob && p.shape !== SHAPE.ring) {
    const R = size * TUNE.haloScale;
    ctx.globalAlpha = a * TUNE.haloAlpha;
    ctx.drawImage(softSprite(col), x - R, y - R, R * 2, R * 2);
    drewHalo = 1;
  }
  ctx.globalAlpha = a;
  const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
  switch (p.shape) {
    case SHAPE.circle: {
      if (p.stretch) {
        const sp = Math.hypot(p.vx, p.vy);
        const len = size * (1 + p.stretch * sp * TUNE.stretchK);
        ctx.beginPath(); ctx.ellipse(x, y, len, size, Math.atan2(p.vy, p.vx), 0, TAU); ctx.fill();
      } else { ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill(); }
      break;
    }
    case SHAPE.rect: {
      const hw = size * flip, hh = size * TUNE.rectAspect;
      const ax = cr * hw, ay = sr * hw, bx = -sr * hh, by = cr * hh;
      ctx.beginPath();
      ctx.moveTo(x + ax + bx, y + ay + by); ctx.lineTo(x - ax + bx, y - ay + by);
      ctx.lineTo(x - ax - bx, y - ay - by); ctx.lineTo(x + ax - bx, y + ay - by);
      ctx.closePath(); ctx.fill();
      break;
    }
    case SHAPE.star: {
      const inner = size * TUNE.starInner, step = Math.PI / 5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i & 1) ? inner : size, an = p.rot - Math.PI / 2 + i * step;
        const px = x + Math.cos(an) * r, py = y + Math.sin(an) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    case SHAPE.ring: {
      const lw = p.stroke0 + (p.stroke1 - p.stroke0) * t;
      if (lw <= 0.02) return 0;
      ctx.strokeStyle = p.color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.stroke();
      break;
    }
    case SHAPE.spark: {
      const sp = Math.hypot(p.vx, p.vy);
      const len = size * (TUNE.sparkMinLen + sp * TUNE.sparkSpeedK);
      const inv = sp > 0.001 ? len / sp : 0;
      const dx = p.vx * inv, dy = p.vy * inv;
      ctx.strokeStyle = p.color; ctx.lineWidth = size * 0.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx * 0.4, y + dy * 0.4); ctx.stroke();
      break;
    }
    case SHAPE.tri: {
      const r = size * TUNE.triBase;
      ctx.beginPath();
      ctx.moveTo(x + cr * r, y + sr * r);
      ctx.lineTo(x + Math.cos(p.rot + 2.4) * r * 0.9, y + Math.sin(p.rot + 2.4) * r * 0.9);
      ctx.lineTo(x + Math.cos(p.rot + 4.3) * r * 0.75, y + Math.sin(p.rot + 4.3) * r * 0.75);
      ctx.closePath(); ctx.fill();
      break;
    }
    case SHAPE.line: {
      const len = size * 2.4;
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.5, size * 0.35); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - cr * len, y - sr * len); ctx.lineTo(x + cr * len, y + sr * len); ctx.stroke();
      break;
    }
    case SHAPE.ellipse: {
      let rx = size * (flip < 0 ? -flip : flip); if (rx < 0.4) rx = 0.4;
      ctx.beginPath(); ctx.ellipse(x, y, rx, size, p.rot, 0, TAU); ctx.fill();
      break;
    }
    case SHAPE.blob: { ctx.drawImage(softSprite(col), x - size, y - size, size * 2, size * 2); break; }
    default: { ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill(); }
  }
  return drewHalo;
}

export const particles = {
  presets, PALETTE, ALPHA,
  get count() { return n; },
  get emitters() { return emitters; },

  // register (or replace) a preset; missing fields take DEFAULTS. Returns the ready preset object.
  define(name, preset) {
    const pr = Object.assign({ __ready: true, name: name }, DEFAULTS, preset);
    presets[name] = pr;
    return pr;
  },

  emit(preset, x, y, overrides) { emit(preset, x, y, overrides); },

  // continuous source: opts = { x, y, rate /* particles per second */, on = true, duration /* s, optional */, ...overrides }.
  // A `duration` emitter kills itself (removed from the list) when it expires; untimed ones live until kill()/clear().
  // The preset's `also` sub-emits are OFF for emitters (no ring spam while streaming) unless opts.also is passed.
  emitter(preset, opts) {
    opts = opts || {};
    const ov = { count: 1, also: null };
    for (const k in opts) if (k !== 'x' && k !== 'y' && k !== 'rate' && k !== 'on' && k !== 'duration') ov[k] = opts[k];
    const e = {
      x: opts.x || 0, y: opts.y || 0,
      rate: opts.rate !== undefined ? opts.rate : TUNE.emitterDefaultRate,
      on: opts.on !== undefined ? !!opts.on : true,
      duration: opts.duration !== undefined ? opts.duration : -1,
      preset: preset, ov: ov, acc: 0, dead: false,
      stop() { this.on = false; },
      start() { this.on = true; },
      kill() {
        this.dead = true; this.on = false;
        const i = emitters.indexOf(this);
        if (i >= 0) { emitters[i] = emitters[emitters.length - 1]; emitters.pop(); }
      },
    };
    emitters.push(e);
    return e;
  },

  update(dt) {
    for (let i = emitters.length - 1; i >= 0; i--) {
      const e = emitters[i];
      if (e.dead) { emitters[i] = emitters[emitters.length - 1]; emitters.pop(); continue; }
      if (!e.on) continue;
      if (e.duration >= 0) {
        e.duration -= dt;
        if (e.duration <= 0) { e.dead = true; e.on = false; emitters[i] = emitters[emitters.length - 1]; emitters.pop(); continue; }
      }
      e.acc += e.rate * dt;
      const c = Math.floor(e.acc);
      if (c > 0) { e.acc -= c; e.ov.count = c; emit(e.preset, e.x, e.y, e.ov); }
    }
    for (let i = 0; i < n; i++) {
      const p = pool[i];
      p.life -= dt;
      if (p.life <= 0) { n--; pool[i] = pool[n]; pool[n] = p; i--; continue; }
      p.age += dt;
      p.vy += p.gravity * dt;
      if (p.drag > 0) { const k = 1 / (1 + p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  },

  // two batches per layer: normal (source-over) then glow (lighter), so compositing is switched at most twice.
  // Halo sprites stop after TUNE.glowBudget per call; the remaining glow particles still draw their additive shape.
  draw(ctx, layer) {
    const L = layer === 'back' ? 0 : 1;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) { const p = pool[i]; if (p.layer === L && !p.glow) drawOne(ctx, p, 0); }
    let lit = false, halos = 0;
    for (let i = 0; i < n; i++) {
      const p = pool[i];
      if (p.layer !== L || !p.glow) continue;
      if (!lit) { ctx.globalCompositeOperation = 'lighter'; lit = true; }
      halos += drawOne(ctx, p, halos < TUNE.glowBudget ? 1 : 0);
    }
    if (lit) ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  },

  // clear() drops every particle and emitter; clear('front' | 'back') drops only that layer's live particles (emitters stay)
  clear(layer) {
    if (layer !== 'front' && layer !== 'back') { n = 0; for (let i = 0; i < emitters.length; i++) emitters[i].dead = true; emitters.length = 0; return; }
    const L = layer === 'back' ? 0 : 1;
    for (let i = 0; i < n; i++) {
      const p = pool[i];
      if (p.layer === L) { n--; pool[i] = pool[n]; pool[n] = p; i--; }
    }
  },
  // dims the live particles of a layer ('front' | 'back', anything else = both) by k (0..1), e.g. under a dim overlay
  fade(layer, k) {
    const L = layer === 'back' ? 0 : layer === 'front' ? 1 : -1;
    const m = k > 0 ? (k < 1 ? k : 1) : 0;
    for (let i = 0; i < n; i++) { const p = pool[i]; if (L < 0 || p.layer === L) p.alpha0 *= m; }
  },
};

// ---- built-in presets --------------------------------------------------------------------------------------------
const UP = -Math.PI / 2;
particles.define('burst', {
  count: 26, speed: [160, 480], life: [0.45, 0.95], size: [6, 0], sizeJitter: 0.4, colors: PREMIUM,
  shape: 'circle', glow: true, gravity: 260, drag: 2.2, stretch: 0.7, alphaCurve: 'fadeLate',
});
particles.define('confetti', {
  count: 70, speed: [260, 640], angle: UP, spread: 1.5, life: [1.6, 2.8], size: [9, 8], sizeJitter: 0.3,
  colors: PREMIUM, shape: 'rect', gravity: 600, drag: 1.7, spin: [-9, 9], rot: 'random',
  flutter: true, flutterFreq: [9, 16], wobble: 6, wobbleFreq: [4, 8], alphaCurve: 'fadeLate',
});
particles.define('sparkle', {
  count: 16, speed: [15, 110], life: [0.5, 1.2], size: [7, 0], sizeJitter: 0.5,
  colors: [PALETTE.gold, PALETTE.white, PALETTE.white, PALETTE.violet], shape: 'star', glow: true,
  gravity: -30, drag: 1.5, spin: [-3, 3], rot: 'random', alphaCurve: 'twinkle', twinkleFreq: [14, 26], spawnRadius: 14,
});
particles.define('ring', {
  count: 1, speed: 0, life: 0.55, size: [8, 110], sizeJitter: 0, colors: PALETTE.white, shape: 'ring', glow: true,
  stroke: [7, 0.4], alphaCurve: 'fadeOut',
});
particles.define('smoke', {
  count: 9, speed: [15, 55], angle: UP, spread: 1.8, life: [1.2, 2.2], size: [16, 56], sizeJitter: 0.3,
  colors: ['#8b93a7', '#6b7280', '#a3a9b8'], shape: 'blob', alpha: [0.55, 0.85], alphaCurve: 'soft',
  gravity: -35, drag: 1.2, layer: 'back', wobble: 5, wobbleFreq: [1.5, 3], spawnRadius: 8,
});
particles.define('dust', {
  count: 24, speed: [4, 22], life: [2.5, 4.5], size: [1.6, 2.4], sizeJitter: 0.4,
  colors: [PALETTE.white, PALETTE.gold, '#cbd5e1'], shape: 'circle', glow: true, alpha: [0.5, 0.9], alphaCurve: 'inOut',
  gravity: -6, drag: 0.3, wobble: 8, wobbleFreq: [0.8, 1.8], spawnRadius: 60, layer: 'back',
});
particles.define('trail', {
  count: 1, speed: [0, 12], life: 0.3, size: [7, 0], sizeJitter: 0.15,
  colors: [PALETTE.sky, PALETTE.mint, PALETTE.white], shape: 'circle', glow: true, alphaCurve: 'fadeOut', drag: 3,
});
particles.define('pop', {
  count: 12, speed: [280, 520], life: [0.22, 0.4], size: [4, 0], sizeJitter: 0.3, colors: PREMIUM, shape: 'circle', glow: true,
  drag: 4, gravity: 120, stretch: 0.5, alphaCurve: 'fadeOut',
  also: [{ preset: 'ring', overrides: { size: [4, 60], life: 0.32, stroke: [5, 0.5] } }],
});
particles.define('shatter', {
  count: 16, speed: [140, 420], life: [0.8, 1.5], size: [9, 7], sizeJitter: 0.5,
  colors: [PALETTE.sky, PALETTE.white, '#bfdbfe', PALETTE.mint], shape: 'tri', gravity: 720, drag: 1.0,
  spin: [-11, 11], rot: 'random', alphaCurve: 'fadeLate',
});
particles.define('coin', {
  count: 12, speed: [160, 380], angle: UP, spread: 1.5, life: [1.0, 1.7], size: [8, 8], sizeJitter: 0.25,
  colors: [PALETTE.gold], color2: '#d19a2b', shape: 'ellipse', gravity: 720, drag: 0.8,
  flutter: true, flutterFreq: [8, 14], spin: [-2, 2], rot: 'random', alphaCurve: 'fadeLate',
});
particles.define('stars', {
  count: 8, speed: [35, 110], angle: UP, spread: 0.9, life: [1.2, 2.0], size: [9, 4], sizeJitter: 0.4,
  colors: [PALETTE.gold, PALETTE.white, '#fde68a'], shape: 'star', glow: true, gravity: -45, drag: 0.6,
  spin: [-2.5, 2.5], rot: 'random', alphaCurve: 'inOut', wobble: 7, wobbleFreq: [2, 4], spawnRadius: 10,
});
particles.define('splash', {
  count: 18, speed: [180, 460], angle: UP, spread: 1.7, life: [0.5, 0.95], size: [4.5, 1.2], sizeJitter: 0.4,
  colors: [PALETTE.sky, PALETTE.mint, '#bae6fd', PALETTE.white], shape: 'circle', gravity: 950, drag: 0.5,
  stretch: 1.1, alphaCurve: 'fadeLate',
});
particles.define('glow', {
  count: 1, speed: 0, life: 0.5, size: [50, 100], sizeJitter: 0, colors: [PALETTE.gold], shape: 'blob', glow: true,
  alpha: 1, alphaCurve: 'fadeOut',
});
