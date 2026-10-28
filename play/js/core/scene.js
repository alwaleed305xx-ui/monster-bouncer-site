// Scene manager: register(name, scene) / go(name, params, { transition, ms }) with 'fade' | 'wipe' | 'zoom' | 'none'
// transitions (both scenes render while one runs: old first, then new, the manager owning alpha/clip), an overlay
// stack (push/pop: the base keeps rendering but stops updating; remove(scene) takes one out wherever it sits, so an
// overlay that ends by itself (core/ads.js 'ad') never pops someone else's) and input routing to the top scene through
// scenes.dispatch(evt, data). A scene is a plain object { enter(params), exit(), update(dt), render(ctx),
// onInput(evt, data), pause(), resume() } with every hook optional. (see docs/ENGINE.md)
import { stage } from './stage.js';
import { lerp, TAU, easeIndex } from './math.js';

const TUNE = {
  defaultTransition: 'fade', defaultMs: 350,
  fadeColor: '#000',                                   // fade passes through this colour
  zoomOutTo: 1.08, zoomInFrom: 0.92,                   // zoom: old scene grows to zoomOutTo while fading, new one grows from zoomInFrom
  wipeRim: 6, wipeRimColor: 'rgba(255,255,255,0.65)',  // bright edge on the iris / diagonal wipe (0 = none)
  blockInputWhileTransitioning: true,
};
const INPUT_EVENTS = ['down', 'move', 'up', 'tap', 'doubletap', 'hold', 'drag', 'dragend', 'swipe'];

const registry = {};
const stack = [];    // overlays, bottom -> top
let base = null;     // the scene chosen by go()
// the single reusable transition record (nothing is allocated per frame or per transition except go()'s promise)
const T = { active: false, kind: 'fade', ms: 350, elapsed: 0, t: 0, from: null, to: null, x: 0, y: 0, shape: 'iris', resolve: null };
// offscreen layer for the zoom transition, so a scene's own globalAlpha writes cannot defeat the cross-fade
const layer = { canvas: null, ctx: null };

function renderScene(ctx, s) {
  if (!s || !s.render) return;
  ctx.save(); s.render(ctx); ctx.restore();
}
function fillScreen(ctx, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-stage.w, -stage.h, stage.w * 3, stage.h * 3); // oversized so camera shake/zoom never exposes an edge
  ctx.restore();
}
function farCorner(x, y) {
  const dx = x > stage.w - x ? x : stage.w - x, dy = y > stage.h - y ? y : stage.h - y;
  return Math.sqrt(dx * dx + dy * dy) + 1;
}
// draws scene s into the offscreen layer (design-unit transform), then composites it with alpha + scale about the centre
function layerDraw(ctx, s, alpha, scale) {
  if (!s || !s.render || alpha <= 0) return;
  const src = ctx.canvas;
  if (!layer.canvas) { layer.canvas = document.createElement('canvas'); layer.ctx = layer.canvas.getContext('2d'); }
  if (layer.canvas.width !== src.width || layer.canvas.height !== src.height) { layer.canvas.width = src.width; layer.canvas.height = src.height; }
  const lc = layer.ctx, k = stage.scale * stage.dpr;
  lc.setTransform(k, 0, 0, k, 0, 0);
  lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, stage.w + 2, stage.h + 2);
  lc.save(); s.render(lc); lc.restore();
  const cx = stage.w / 2, cy = stage.h / 2;
  ctx.save();
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  ctx.drawImage(layer.canvas, 0, 0, stage.w, stage.h);
  ctx.restore();
}

const TRANSITIONS = {
  // black out over the first half (old scene), black in over the second (new scene)
  fade(ctx) {
    const e = easeIndex.inOutSine;
    if (!T.from) { renderScene(ctx, T.to); fillScreen(ctx, TUNE.fadeColor, 1 - e(T.t)); return; }
    if (T.t < 0.5) { renderScene(ctx, T.from); fillScreen(ctx, TUNE.fadeColor, e(T.t * 2)); }
    else { renderScene(ctx, T.to); fillScreen(ctx, TUNE.fadeColor, 1 - e((T.t - 0.5) * 2)); }
  },
  // circular iris from (x, y) (default: centre, pass go opts.x/y) or a diagonal sweep (opts.shape = 'diagonal') revealing the new scene
  wipe(ctx) {
    renderScene(ctx, T.from);
    const k = easeIndex.inOutQuad(T.t), diag = T.shape === 'diagonal';
    const p = k * (stage.w + stage.h), r = k * farCorner(T.x, T.y);
    ctx.save();
    ctx.beginPath();
    if (diag) { ctx.moveTo(-2, -2); ctx.lineTo(p, -2); ctx.lineTo(-2, p); ctx.closePath(); }
    else ctx.arc(T.x, T.y, r, 0, TAU);
    ctx.clip();
    renderScene(ctx, T.to);
    ctx.restore();
    if (TUNE.wipeRim > 0 && T.t < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - T.t;
      ctx.lineWidth = TUNE.wipeRim; ctx.strokeStyle = TUNE.wipeRimColor; ctx.lineCap = 'round';
      ctx.beginPath();
      if (diag) { ctx.moveTo(p, 0); ctx.lineTo(0, p); } else ctx.arc(T.x, T.y, r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  },
  // old scene scales up and fades out while the new one scales 0.92 -> 1 and fades in
  zoom(ctx) {
    const k = easeIndex.inOutCubic(T.t);
    if (T.from) layerDraw(ctx, T.from, 1 - k, lerp(1, TUNE.zoomOutTo, k));
    layerDraw(ctx, T.to, easeIndex.outQuad(T.t), lerp(TUNE.zoomInFrom, 1, easeIndex.outCubic(T.t)));
  },
};

function finishTransition() {
  if (!T.active) return;
  const from = T.from, resolve = T.resolve;
  T.active = false; T.t = 1; T.from = null; T.to = null; T.resolve = null;
  if (from && from !== base && from.exit) from.exit();
  if (resolve) resolve(base);
}

export const scenes = {
  register(name, scene) { scene.name = name; registry[name] = scene; return scene; },
  get(name) { return registry[name] || null; },
  has(name) { return !!registry[name]; },

  get current() { return base; },                                        // the scene chosen by go()
  get top() { return stack.length ? stack[stack.length - 1] : base; },   // topmost overlay, else the base
  get previous() { return T.active ? T.from : null; },                   // the scene leaving during a transition
  get transition() { return T.active ? T : null; },                      // { kind, t 0..1, ms, from, to } while running
  get transitioning() { return T.active; },
  overlays: stack,

  // switch the base scene; overlays are popped, a running transition is completed first. Resolves when the transition ends.
  go(name, params, opts) {
    const to = registry[name];
    if (!to) { console.warn('[scenes] go: unknown scene "' + name + '"'); return Promise.resolve(null); }
    opts = opts || {};
    while (stack.length) scenes.pop();
    finishTransition();
    let kind = opts.transition !== undefined ? opts.transition : TUNE.defaultTransition;
    const ms = opts.ms !== undefined ? opts.ms : TUNE.defaultMs;
    if (kind !== 'none' && !TRANSITIONS[kind]) { console.warn('[scenes] unknown transition "' + kind + '", using ' + TUNE.defaultTransition); kind = TUNE.defaultTransition; }
    const from = base;
    if (from === to && from && from.exit) from.exit(); // re-entering the same scene: leave first, reveal without a cross-render
    base = to;
    if (to.enter) to.enter(params || {});
    if (kind === 'none' || !(ms > 0)) {
      if (from && from !== to && from.exit) from.exit();
      return Promise.resolve(to);
    }
    T.active = true; T.kind = kind; T.ms = ms; T.elapsed = 0; T.t = 0;
    T.from = from === to ? null : from; T.to = to;
    T.x = opts.x !== undefined ? opts.x : stage.w / 2;
    T.y = opts.y !== undefined ? opts.y : stage.h / 2;
    T.shape = opts.shape || 'iris';
    return new Promise(resolve => { T.resolve = resolve; });
  },

  // overlay on top of the current top: it renders above and takes over update + input; the covered scene gets pause()
  push(name, params) {
    const s = registry[name];
    if (!s) { console.warn('[scenes] push: unknown scene "' + name + '"'); return null; }
    if (stack.indexOf(s) >= 0 || s === base) return s;
    const under = scenes.top;
    stack.push(s);
    if (under && under.pause) under.pause();
    if (s.enter) s.enter(params || {});
    return s;
  },
  pop() {
    if (!stack.length) return null;
    const s = stack.pop();
    if (s.exit) s.exit();
    const now = scenes.top;
    if (now && now.resume) now.resume();
    return s;
  },

  // take an overlay out wherever it is in the stack (the top one is popped: the scene under it resumes; a covered one just
  // leaves, the overlay above it stays on top); returns whether it was there
  remove(s) {
    const i = stack.indexOf(s);
    if (i < 0) return false;
    if (i === stack.length - 1) { scenes.pop(); return true; }
    stack.splice(i, 1);
    if (s.exit) s.exit();
    return true;
  },

  update(dt) {
    if (T.active) {
      T.elapsed += dt * 1000;
      T.t = T.elapsed >= T.ms ? 1 : T.elapsed / T.ms;
    }
    if (stack.length) {
      const top = stack[stack.length - 1];
      if (top.update) top.update(dt);
    } else {
      if (T.active && T.from && T.from.update) T.from.update(dt);
      if (base && base.update) base.update(dt);
    }
    if (T.active && T.t >= 1) finishTransition();
  },

  render(ctx) {
    if (T.active) TRANSITIONS[T.kind](ctx);
    else renderScene(ctx, base);
    for (let i = 0; i < stack.length; i++) renderScene(ctx, stack[i]);
  },

  // route an input event to the top scene only; returns whether a scene handled it
  dispatch(evt, data) {
    if (T.active && TUNE.blockInputWhileTransitioning) return false;
    const s = scenes.top;
    if (!s || typeof s.onInput !== 'function') return false;
    const r = s.onInput(evt, data);
    return r === undefined ? true : !!r;
  },
  // subscribe scenes.dispatch to every input.js event (or the given list); returns an unsubscribe function
  bindInput(input, events) {
    const list = events || INPUT_EVENTS, unsubs = [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      unsubs.push(input.on(e, d => scenes.dispatch(e, d)));
    }
    return () => { for (let i = 0; i < unsubs.length; i++) unsubs[i](); unsubs.length = 0; };
  },
};

if (typeof window !== 'undefined') window.__scenes = scenes;
