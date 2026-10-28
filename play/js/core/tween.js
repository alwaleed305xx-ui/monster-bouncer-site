// Tween: time-based property animation, physical springs, sequences and timelines (see docs/ENGINE.md).
// The loop calls tweens.update(dt) once per fixed step; everything here advances by dt seconds, never by frames.
// Usage: tween(obj, { x: 100, 'pos.y': 20 }, { dur: 300, ease: 'outBack' }).finished.then(ok => ...)
// Handles: { cancel(), finished: Promise (true = completed, false = cancelled), progress 0..1, done, cancelled }.
// Tweening or springing a property that another tween/spring owns releases it from the earlier one (per-property).
import { easeIndex, clamp, noise1 } from './math.js';

const TUNE = {
  defaultDur: 300,                 // ms, when opts.dur is omitted
  springStiffness: 170, springDamping: 14, springMass: 1, springPrecision: 0.01,
  springStep: 1 / 120,             // springs integrate at this step or finer (sub-stepped when dt is larger)
  springMaxSubSteps: 64,           // cap for a huge dt so a stalled tab never spins
  doneEps: 1e-6,                   // cycle fraction slack so float accumulation never leaves a tween one step short
  timerEps: 1e-6,                  // seconds slack for delay() timers, same reason
  tlEps: 1e-6,                     // ms slack for timeline offsets, same reason
  bezierSamples: 11, bezierNewtonIters: 4, bezierNewtonMinSlope: 0.001, bezierSubdivPrecision: 1e-7, bezierSubdivMaxIters: 10,
  shakeFreq: 0.03,                 // jitter frequency per ms (~30 Hz)
};

// ---------------------------------------------------------------- easing
const bezierCache = new Map();
// CSS-style cubic-bezier(x1, y1, x2, y2) -> t => value. Memoised per argument set; call once at setup, not per frame.
function bezier(x1, y1, x2, y2) {
  x1 = clamp(+x1, 0, 1); x2 = clamp(+x2, 0, 1); y1 = +y1; y2 = +y2;
  const key = x1 + ',' + y1 + ',' + x2 + ',' + y2;
  const hit = bezierCache.get(key);
  if (hit) return hit;
  let fn;
  if (x1 === y1 && x2 === y2) fn = easeIndex.linear;
  else {
    const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
    const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
    const calcX = t => ((ax * t + bx) * t + cx) * t;
    const calcY = t => ((ay * t + by) * t + cy) * t;
    const slopeX = t => (3 * ax * t + 2 * bx) * t + cx;
    const N = TUNE.bezierSamples, stepT = 1 / (N - 1), last = N - 1;
    const samples = new Float32Array(N);
    for (let i = 0; i < N; i++) samples[i] = calcX(i * stepT);
    const solve = x => {
      let intervalStart = 0, i = 1;
      for (; i !== last && samples[i] <= x; i++) intervalStart += stepT;
      i--;
      const d = (x - samples[i]) / (samples[i + 1] - samples[i]);
      let t = intervalStart + d * stepT;
      const s0 = slopeX(t);
      if (s0 >= TUNE.bezierNewtonMinSlope) {
        for (let k = 0; k < TUNE.bezierNewtonIters; k++) {
          const s = slopeX(t);
          if (s === 0) return t;
          t -= (calcX(t) - x) / s;
        }
        return t;
      }
      if (s0 === 0) return t;
      let a = intervalStart, b = intervalStart + stepT, cur = 0, k = 0;
      do {
        t = a + (b - a) / 2; cur = calcX(t) - x;
        if (cur > 0) b = t; else a = t;
      } while (Math.abs(cur) > TUNE.bezierSubdivPrecision && ++k < TUNE.bezierSubdivMaxIters);
      return t;
    };
    fn = x => (x <= 0 ? 0 : x >= 1 ? 1 : calcY(solve(x)));
  }
  bezierCache.set(key, fn);
  return fn;
}

export const ease = {};
for (const k in easeIndex) ease[k] = easeIndex[k];
ease.bezier = bezier;

function resolveEase(e) {
  if (typeof e === 'function') return e;
  if (typeof e === 'string' && typeof ease[e] === 'function') return ease[e];
  return ease.outCubic;
}

// ---------------------------------------------------------------- registry
const active = [], springs = [], timers = [], timelines = [], groups = [];
let updating = false;

function warnPath(path) { console.warn('[tween] unresolvable property path: ' + path); }

// 'pos.x' -> { obj: target.pos, key: 'x' } (null when an intermediate object is missing)
function resolvePath(target, path) {
  if (target === null || target === undefined) return null;
  if (path.indexOf('.') < 0) return { obj: target, key: path };
  const parts = path.split('.');
  let obj = target;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (obj === null || obj === undefined || typeof obj !== 'object') return null;
  }
  return { obj: obj, key: parts[parts.length - 1] };
}

// Take ownership of (obj, key): drop it from every other tween and kill any spring driving it.
function releaseProp(obj, key, except) {
  for (let i = 0; i < active.length; i++) {
    const r = active[i];
    if (r === except || r.dead) continue;
    for (let j = 0; j < r.n; j++) {
      if (r.objs[j] === obj && r.keys[j] === key) {
        r.objs.splice(j, 1); r.keys.splice(j, 1); r.spec.splice(j, 1); r.from.splice(j, 1); r.to.splice(j, 1);
        r.n--;
        if (r.n === 0) finish(r, false);
        break;
      }
    }
  }
  for (let i = 0; i < springs.length; i++) {
    const s = springs[i];
    if (s !== except && !s.dead && s.obj === obj && s.key === key) finishSpring(s, false);
  }
}

// ---------------------------------------------------------------- tweens
function collectProps(r, target, props, prefix, fromOv) {
  for (const k in props) {
    const v = props[k], path = prefix + k;
    if (v !== null && typeof v === 'object') { collectProps(r, target, v, path + '.', fromOv); continue; }
    const p = resolvePath(target, path);
    if (!p) { warnPath(path); continue; }
    if (fromOv && fromOv[path] !== undefined) p.obj[p.key] = +fromOv[path];
    r.objs.push(p.obj); r.keys.push(p.key); r.spec.push(v); r.from.push(0); r.to.push(0);
    r.n++;
  }
}

function makeTween(target, props, opts, startElapsed) {
  opts = opts || {};
  const yoyo = !!opts.yoyo;
  const loopN = opts.loop === true ? Infinity : typeof opts.loop === 'number' ? Math.max(0, Math.floor(opts.loop)) : 0;
  const r = {
    target: target, objs: [], keys: [], spec: [], from: [], to: [], n: 0,
    dur: (opts.dur !== undefined ? +opts.dur : TUNE.defaultDur) / 1000,
    delay: (opts.delay !== undefined ? +opts.delay : 0) / 1000,
    elapsed: startElapsed || 0, started: false, dead: false,
    ease: resolveEase(opts.ease), onUpdate: opts.onUpdate || null, onComplete: opts.onComplete || null,
    yoyo: yoyo, total: (1 + loopN) * (yoyo ? 2 : 1), progress: 0, resolve: null, handle: null,
  };
  if (r.dur !== r.dur || r.dur < 0) r.dur = 0;
  if (r.delay !== r.delay || r.delay < 0) r.delay = 0;
  if (props) collectProps(r, target, props, '', opts.from);
  for (let i = 0; i < r.n; i++) releaseProp(r.objs[i], r.keys[i], r);
  const finished = new Promise(res => { r.resolve = res; });
  const h = {
    target: target, finished: finished, done: false, cancelled: false,
    cancel() { if (!r.dead) finish(r, false); },
    get progress() { return r.progress; },
  };
  r.handle = h;
  active.push(r);
  return h;
}

function startTween(r) {
  r.started = true;
  for (let i = 0; i < r.n; i++) {
    const obj = r.objs[i], key = r.keys[i], spec = r.spec[i];
    let from = +obj[key];
    if (from !== from) from = 0;
    let to;
    if (typeof spec === 'string') {
      const rel = spec.slice(0, 2);
      to = rel === '+=' ? from + parseFloat(spec.slice(2)) : rel === '-=' ? from - parseFloat(spec.slice(2)) : parseFloat(spec);
    } else to = +spec;
    if (to !== to) to = from;
    r.from[i] = from; r.to[i] = to;
  }
}

function stepTween(r, dt) {
  r.elapsed += dt;
  if (r.elapsed < r.delay) return;
  if (!r.started) startTween(r);
  const local = r.elapsed - r.delay;
  let cyc, frac, done = false;
  if (r.dur <= 0) { cyc = (r.total === Infinity ? (r.yoyo ? 2 : 1) : r.total) - 1; frac = 1; done = true; }
  else {
    const q = local / r.dur;
    cyc = Math.floor(q); frac = q - cyc;
    if (q + TUNE.doneEps >= r.total) { cyc = r.total - 1; frac = 1; done = true; }
  }
  const fwd = !r.yoyo || cyc % 2 === 0;
  r.progress = done ? 1 : r.total === Infinity ? frac : local / (r.dur * r.total);
  if (done) {
    for (let i = 0; i < r.n; i++) r.objs[i][r.keys[i]] = fwd ? r.to[i] : r.from[i];
  } else {
    const e = r.ease(fwd ? frac : 1 - frac);
    for (let i = 0; i < r.n; i++) r.objs[i][r.keys[i]] = r.from[i] + (r.to[i] - r.from[i]) * e;
  }
  if (r.onUpdate) r.onUpdate(r.target, r.progress);
  if (done) finish(r, true);
}

function finish(r, completed) {
  if (r.dead) return;
  r.dead = true;
  const h = r.handle;
  h.done = completed; h.cancelled = !completed;
  if (completed) { r.progress = 1; if (r.onComplete) r.onComplete(r.target); }
  r.resolve(completed);
}

export function tween(target, props, opts) { return makeTween(target, props, opts, 0); }
export function to(target, props, opts) { return makeTween(target, props, opts, 0); }

// Promise that resolves after ms of loop time (true), or false when killed by killAll.
export function delay(ms) {
  return new Promise(res => { timers.push({ t: (+ms || 0) / 1000, resolve: res, dead: false }); });
}

// ---------------------------------------------------------------- springs
function deadHandle(target) {
  return { target: target, finished: Promise.resolve(false), done: false, cancelled: true, cancel() {}, progress: 1, value: 0, velocity: 0, to: 0 };
}

// Damped harmonic spring on one property: m*a = -k*(x-to) - c*v, semi-implicit Euler at TUNE.springStep.
export function spring(target, prop, opts) {
  opts = opts || {};
  const p = resolvePath(target, prop);
  if (!p) { warnPath(prop); return deadHandle(target); }
  releaseProp(p.obj, p.key, null);
  let x = +p.obj[p.key];
  if (x !== x) x = 0;
  const s = {
    target: target, obj: p.obj, key: p.key, x: x,
    v: opts.velocity !== undefined ? +opts.velocity : 0,
    to: opts.to !== undefined ? +opts.to : x,
    k: opts.stiffness !== undefined ? +opts.stiffness : TUNE.springStiffness,
    c: opts.damping !== undefined ? +opts.damping : TUNE.springDamping,
    m: opts.mass !== undefined && +opts.mass > 0 ? +opts.mass : TUNE.springMass,
    precision: opts.precision !== undefined ? +opts.precision : TUNE.springPrecision,
    onUpdate: opts.onUpdate || null, onComplete: opts.onComplete || null,
    span: 0, progress: 0, dead: false, resolve: null, handle: null,
  };
  s.span = Math.abs(s.x - s.to);
  const finished = new Promise(res => { s.resolve = res; });
  const h = {
    target: target, finished: finished, done: false, cancelled: false,
    cancel() { if (!s.dead) finishSpring(s, false); },
    get progress() { return s.progress; },
    get value() { return s.x; },
    get velocity() { return s.v; }, set velocity(v) { s.v = +v; },
    get to() { return s.to; }, set to(v) { s.to = +v; s.span = Math.abs(s.x - s.to); },
  };
  s.handle = h;
  springs.push(s);
  return h;
}

function stepSpring(s, dt) {
  let steps = 1, h = dt;
  if (dt > TUNE.springStep) {
    steps = Math.ceil(dt / TUNE.springStep);
    if (steps > TUNE.springMaxSubSteps) steps = TUNE.springMaxSubSteps;
    h = dt / steps;
  }
  let x = s.x, v = s.v;
  const k = s.k, c = s.c, invM = 1 / s.m, to = s.to;
  for (let i = 0; i < steps; i++) {
    const a = (-k * (x - to) - c * v) * invM;
    v += a * h;
    x += v * h;
  }
  if (Math.abs(v) < s.precision && Math.abs(x - to) < s.precision) {
    s.x = to; s.v = 0; s.obj[s.key] = to; s.progress = 1;
    if (s.onUpdate) s.onUpdate(s.target, to);
    finishSpring(s, true);
    return;
  }
  s.x = x; s.v = v; s.obj[s.key] = x;
  s.progress = s.span > 0 ? clamp(1 - Math.abs(x - to) / s.span, 0, 1) : 1;
  if (s.onUpdate) s.onUpdate(s.target, x);
}

function finishSpring(s, completed) {
  if (s.dead) return;
  s.dead = true;
  const h = s.handle;
  h.done = completed; h.cancelled = !completed;
  if (completed) { s.progress = 1; if (s.onComplete) s.onComplete(s.target); }
  s.resolve(completed);
}

// ---------------------------------------------------------------- jitter helper
// shakeValue(amp, decayMs) -> fn(timeMs) -> smooth noise in -amp..amp that dies out quadratically over decayMs (0 = constant).
export function shakeValue(amp, decayMs) {
  const seed = Math.random() * 1000, f = TUNE.shakeFreq;
  const inv = decayMs > 0 ? 1 / decayMs : 0;
  return t => {
    const k = 1 - t * inv;
    if (k <= 0) return 0;
    return noise1(seed + t * f) * amp * k * k;
  };
}

// ---------------------------------------------------------------- composition
function startStep(step) {
  if (typeof step === 'function') return step();
  if (typeof step === 'number') return delay(step);
  return step;
}
function asPromise(r) {
  if (r && r.finished && typeof r.finished.then === 'function') return r.finished;
  if (r && typeof r.then === 'function') return r;
  return Promise.resolve(r);
}
// A handle/spring/group reports its own progress; a bare Promise (delay, user promise) counts as 0 until it settles.
function stepProgress(r) {
  if (r && typeof r.progress === 'number') return r.progress;
  if (r && typeof r.then === 'function') return 0;
  return 1;
}
// A step settled with `false` (killed tween/spring/timer, cancelled group) or whose handle says so was cancelled.
function stepCancelled(ok, r) { return ok === false || !!(r && r.cancelled === true); }

// Shared settle logic for sequence/parallel: records the outcome on the handle and its group record once.
function makeGroup() {
  const g = { done: false, cancelled: false, resolve: null, rec: { dead: false, cancel: null }, h: null };
  g.finished = new Promise(res => { g.resolve = res; });
  g.settle = ok => {
    if (g.done || g.cancelled) return;
    if (ok) g.done = true; else g.cancelled = true;
    g.h.done = !!ok; g.h.cancelled = !ok;
    g.rec.dead = true;
    g.resolve(!!ok);
  };
  return g;
}

// Runs each step (fn -> handle | Promise, or a number of ms) after the previous one settles.
// A step that is cancelled (killAll, killTarget, per-property release, handle.cancel) cancels the whole sequence:
// no later step starts and `finished` resolves false.
export function sequence(...steps) {
  const g = makeGroup();
  let i = 0, cur = null;
  const h = {
    finished: g.finished, done: false, cancelled: false,
    cancel() {
      if (g.done || g.cancelled) return;
      const c = cur;
      g.settle(false);
      if (c && typeof c.cancel === 'function') c.cancel();
    },
    get progress() {
      if (g.done) return 1;
      if (!steps.length) return 1;
      return clamp((i + stepProgress(cur)) / steps.length, 0, 1);
    },
  };
  g.h = h;
  const onStep = ok => {
    if (g.done || g.cancelled) return;
    if (stepCancelled(ok, cur)) { g.settle(false); return; }
    cur = null; i++; next();
  };
  const next = () => {
    if (g.done || g.cancelled) return;
    if (i >= steps.length) { g.settle(true); return; }
    cur = startStep(steps[i]);
    asPromise(cur).then(onStep);
  };
  g.rec.cancel = h.cancel;
  next();
  if (!g.rec.dead) groups.push(g.rec);
  return h;
}

// Starts every step now; settles when all have. Resolves false when any step was cancelled.
export function parallel(...steps) {
  const g = makeGroup();
  const hs = [];
  const h = {
    finished: g.finished, done: false, cancelled: false,
    cancel() {
      if (g.done || g.cancelled) return;
      g.settle(false);
      for (let i = 0; i < hs.length; i++) if (hs[i] && typeof hs[i].cancel === 'function') hs[i].cancel();
    },
    get progress() {
      if (g.done) return 1;
      if (!hs.length) return 1;
      let sum = 0;
      for (let i = 0; i < hs.length; i++) sum += stepProgress(hs[i]);
      return clamp(sum / hs.length, 0, 1);
    },
  };
  g.h = h;
  for (let i = 0; i < steps.length; i++) hs.push(startStep(steps[i]));
  const ps = [];
  for (let i = 0; i < hs.length; i++) ps.push(asPromise(hs[i]));
  Promise.all(ps).then(oks => {
    if (g.done || g.cancelled) return;
    for (let i = 0; i < oks.length; i++) if (stepCancelled(oks[i], hs[i])) { g.settle(false); return; }
    g.settle(true);
  });
  g.rec.cancel = h.cancel;
  groups.push(g.rec);
  return h;
}

// ---------------------------------------------------------------- timeline
// timeline().to(obj, props, opts, atMs).call(fn, atMs).play() -> Promise. `at` omitted = right after the previous item.
export function timeline() {
  const items = [], spawned = [];
  let cursor = 0, duration = 0, playing = false, time = 0, nextItem = 0, resolveFn = null, promise = null;
  const rec = { dead: true, step: null, cancel: null };
  const tl = {
    to(target, props, opts, at) {
      opts = opts || {};
      const start = at !== undefined ? +at : cursor;
      const dur = opts.dur !== undefined ? +opts.dur : TUNE.defaultDur;
      const dl = opts.delay !== undefined ? +opts.delay : 0;
      const loopN = typeof opts.loop === 'number' ? Math.max(0, Math.floor(opts.loop)) : 0; // infinite loops count as one play
      const end = start + dl + dur * (1 + loopN) * (opts.yoyo ? 2 : 1);
      items.push({ kind: 0, at: start, target: target, props: props, opts: opts, fn: null });
      cursor = end;
      if (end > duration) duration = end;
      return tl;
    },
    call(fn, at) {
      const start = at !== undefined ? +at : cursor;
      items.push({ kind: 1, at: start, target: null, props: null, opts: null, fn: fn });
      if (start > duration) duration = start;
      if (start > cursor) cursor = start;
      return tl;
    },
    play() {
      if (playing) return promise;
      items.sort((a, b) => a.at - b.at);
      time = 0; nextItem = 0; spawned.length = 0; playing = true;
      promise = new Promise(res => { resolveFn = res; });
      rec.dead = false;
      if (timelines.indexOf(rec) < 0) timelines.push(rec);
      return promise;
    },
    cancel() {
      if (!playing) return;
      playing = false; rec.dead = true;
      for (let i = 0; i < spawned.length; i++) spawned[i].cancel();
      spawned.length = 0;
      resolveFn(false);
    },
    get duration() { return duration; },
    get time() { return time; },
    get playing() { return playing; },
    get progress() { return duration > 0 ? clamp(time / duration, 0, 1) : playing ? 0 : 1; },
  };
  rec.cancel = tl.cancel;
  rec.step = dt => {
    time += dt * 1000;
    let firedNow = false;
    while (nextItem < items.length && items[nextItem].at <= time + TUNE.tlEps) {
      const it = items[nextItem++];
      firedNow = true;
      if (it.kind === 1) it.fn(tl);
      else {
        spawned.push(makeTween(it.target, it.props, it.opts, Math.max(0, time - it.at) / 1000));
        stepTween(active[active.length - 1], 0); // write this step's value now instead of one step late
      }
    }
    if (!firedNow && time + TUNE.tlEps >= duration) {
      playing = false; rec.dead = true; spawned.length = 0;
      resolveFn(true);
    }
  };
  return tl;
}

// ---------------------------------------------------------------- driver
export const tweens = {
  update(dt) {
    if (!(dt > 0)) return;
    updating = true;
    let n = active.length, w = 0;
    for (let i = 0; i < n; i++) {
      const r = active[i];
      if (!r.dead) stepTween(r, dt);
      if (!r.dead) active[w++] = r;
    }
    for (let i = n; i < active.length; i++) active[w++] = active[i];
    active.length = w;

    n = springs.length; w = 0;
    for (let i = 0; i < n; i++) {
      const s = springs[i];
      if (!s.dead) stepSpring(s, dt);
      if (!s.dead) springs[w++] = s;
    }
    for (let i = n; i < springs.length; i++) springs[w++] = springs[i];
    springs.length = w;

    n = timers.length; w = 0;
    for (let i = 0; i < n; i++) {
      const t = timers[i];
      if (!t.dead) { t.t -= dt; if (t.t <= TUNE.timerEps) { t.dead = true; t.resolve(true); } }
      if (!t.dead) timers[w++] = t;
    }
    for (let i = n; i < timers.length; i++) timers[w++] = timers[i];
    timers.length = w;

    n = timelines.length; w = 0;
    for (let i = 0; i < n; i++) {
      const tl = timelines[i];
      if (!tl.dead) tl.step(dt);
      if (!tl.dead) timelines[w++] = tl;
    }
    for (let i = n; i < timelines.length; i++) timelines[w++] = timelines[i];
    timelines.length = w;

    n = groups.length; w = 0;                       // sequence/parallel records: compact the settled ones
    for (let i = 0; i < n; i++) { const g = groups[i]; if (!g.dead) groups[w++] = g; }
    for (let i = n; i < groups.length; i++) groups[w++] = groups[i];
    groups.length = w;
    updating = false;
  },
  killAll() {
    for (let i = 0; i < groups.length; i++) { const g = groups[i]; if (!g.dead) g.cancel(); }
    for (let i = 0; i < active.length; i++) finish(active[i], false);
    for (let i = 0; i < springs.length; i++) finishSpring(springs[i], false);
    for (let i = 0; i < timers.length; i++) { const t = timers[i]; if (!t.dead) { t.dead = true; t.resolve(false); } }
    for (let i = 0; i < timelines.length; i++) { const tl = timelines[i]; if (!tl.dead) tl.cancel(); }
    if (!updating) { active.length = 0; springs.length = 0; timers.length = 0; timelines.length = 0; groups.length = 0; }
  },
  killTarget(target) {
    for (let i = 0; i < active.length; i++) {
      const r = active[i];
      if (r.dead) continue;
      if (r.target === target) { finish(r, false); continue; }
      for (let j = 0; j < r.n; j++) if (r.objs[j] === target) { finish(r, false); break; }
    }
    for (let i = 0; i < springs.length; i++) {
      const s = springs[i];
      if (!s.dead && (s.target === target || s.obj === target)) finishSpring(s, false);
    }
  },
  get count() {
    let c = 0;
    for (let i = 0; i < active.length; i++) if (!active[i].dead) c++;
    for (let i = 0; i < springs.length; i++) if (!springs[i].dead) c++;
    return c;
  },
};
