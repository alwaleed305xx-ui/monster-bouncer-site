// Input: Pointer Events on stage.view turned into gestures in design units — down/move/up/tap/doubletap/hold/drag/dragend/swipe
// (see docs/ENGINE.md). Usage: input.init(stage); input.on('tap', p => ...). Payload objects are reused between emits: copy
// what you need inside the handler, never keep the object. The per-event path allocates nothing: client px go through
// stage.toDesign(cx, cy, PT) into one module point (the view origin is cached per layout, no rect read per event).
// Letterbox bars (tablet / desktop): a pointer that goes down on the stage's own container (stage.parent, when that is a
// dedicated element such as #app, not <body>) beside the canvas is a game pointer too, in design units with x < 0 or
// x > 390 (stage.screenL / screenR give the screen edges). Anything else inside the container keeps its own events.
// Multi-touch: every pointer gets its own record and its own down / move / drag / up / tap / swipe, tagged with the
// pointer's id (payload.id); nothing here drops a second finger. A scene that acts on one touch at a time decides which
// pointer wins (input.primary is only the oldest one still down, a convenience for 'where is the finger').
// Haptics: input.vibrate(pattern) -> navigator.vibrate on the web; a native shell sets input.vibrator (js/native.js:
// Capacitor Haptics), which then plays every pulse instead; input.haptics (the saved setting) gates both.
const TUNE = {
  holdMs: 320,        // press this long without moving more than holdSlop -> 'hold'
  holdSlop: 8,        // moving further than this (units from the start point) cancels a hold
  dragStart: 6,       // moving further than this starts a drag and disqualifies a tap
  doubleTapMs: 300,   // a second tap within this many ms...
  doubleTapDist: 40,  // ...and within this many units of the first -> 'doubletap'
  flickSpeed: 600,    // release speed (units/s) above this -> dragend.flick
  swipeMaxMs: 300,    // down->up faster than this...
  swipeDist: 40,      // ...and further than this (units from the start point) -> 'swipe'
  velSamples: 4,      // velocity is averaged over this many move samples
  velStaleMs: 100,    // no move for this long before release -> release velocity is 0
  minSampleDt: 0.002, // s; floors a sample's dt so same-frame moves cannot explode the velocity
  defaultVibrateMs: 10,
};

// Reused payloads (one per event type; no allocation per event).
const P = {
  down: { x: 0, y: 0, id: 0, t: 0, type: 'touch' },
  move: { x: 0, y: 0, dx: 0, dy: 0, id: 0 },
  up: { x: 0, y: 0, id: 0, dur: 0, cancelled: false },
  tap: { x: 0, y: 0, id: 0 },
  doubletap: { x: 0, y: 0, id: 0 },
  hold: { x: 0, y: 0, id: 0 },
  drag: { x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0, ox: 0, oy: 0, id: 0 },
  dragend: { x: 0, y: 0, vx: 0, vy: 0, flick: false, id: 0 },
  swipe: { dir: 'left', vx: 0, vy: 0, dx: 0, dy: 0, x: 0, y: 0, id: 0 },
};

// the one design-space point every pointer event converts into (stage.toDesign(cx, cy, PT)): no allocation and no rect
// read per event; handlers copy it into locals at once, so a nested dispatch can never see a half-updated point
const PT = { x: 0, y: 0 };

const listeners = {};
let depth = 0, dirty = false;
const pool = [];
const lastTap = { x: 0, y: 0, t: -1e9 };
let stg = null, boundView = null, boundBars = null, inited = false, trustedDown = false;

function userActivated() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userActivation;
  if (ua) return !!ua.hasBeenActive;
  return trustedDown;
}

export const input = {
  pointers: new Map(),   // id -> { x, y, startX, startY, startT, moved, held, vx, vy, type, id }
  primary: null,         // first active pointer record or null
  isDown: false, x: 0, y: 0,
  haptics: true,         // master switch for vibrate()
  tune: TUNE,

  init(stage) {
    if (stage) stg = stage;
    if (!stg) return;
    bindView();
    bindBars();
    if (inited) return;
    inited = true;
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onCancel, { passive: false });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('gesturestart', prevent, { passive: false });  // Safari pinch zoom
    document.addEventListener('gesturechange', prevent, { passive: false });
    if (stg.onResize) stg.onResize(rebindIfSwapped);
    if (stg.onView) stg.onView(rebindIfSwapped);   // post FX toggled: the visible canvas changed without a layout change
  },

  on(evt, fn) {
    let fns = listeners[evt];
    if (!fns) fns = listeners[evt] = [];
    fns.push(fn);
    return () => input.off(evt, fn);
  },
  off(evt, fn) {
    const fns = listeners[evt];
    if (!fns) return;
    const i = fns.indexOf(fn);
    if (i < 0) return;
    if (depth > 0) { fns[i] = null; dirty = true; } else fns.splice(i, 1);
  },

  // native shells play haptics themselves: js/native.js sets this to fn(pattern) -> bool (Capacitor Haptics on iOS).
  // null = the web path below.
  vibrator: null,

  // Haptic pulse: ms or [pulse, gap, pulse, ...]. Returns false when haptics are off. Native: input.vibrator(pattern).
  // Web: navigator.vibrate guarded: no-op (returns false) where unsupported or before the first real touch (browsers
  // block and log it as an error).
  vibrate(pattern) {
    if (!this.haptics) return false;
    const v = this.vibrator;
    if (typeof v === 'function') {
      try { return !!v(pattern === undefined ? TUNE.defaultVibrateMs : pattern); } catch (e) { return false; }
    }
    if (!userActivated()) return false;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        return !!navigator.vibrate(pattern === undefined ? TUNE.defaultVibrateMs : pattern);
      }
    } catch (e) { /* unsupported or blocked by the browser */ }
    return false;
  },

  // Forget every active pointer (emits 'up' with cancelled:true); called on blur / page hide.
  releaseAll,
};

function emit(name, p) {
  const fns = listeners[name];
  if (!fns || fns.length === 0) return;
  depth++;
  for (let i = 0; i < fns.length; i++) { const f = fns[i]; if (f) f(p); }
  depth--;
  if (depth === 0 && dirty) compact();
}
function compact() {
  dirty = false;
  for (const k in listeners) {
    const fns = listeners[k];
    for (let i = fns.length - 1; i >= 0; i--) if (!fns[i]) fns.splice(i, 1);
  }
}

function makeRec() {
  const rec = {
    id: -1, type: 'touch', x: 0, y: 0, startX: 0, startY: 0, startT: 0, lastT: 0, lastMoveT: 0,
    moved: false, held: false, holdDead: false, holdTimer: 0, vx: 0, vy: 0,
    sdx: new Float64Array(TUNE.velSamples), sdy: new Float64Array(TUNE.velSamples), sdt: new Float64Array(TUNE.velSamples),
    head: 0, n: 0, onHold: null,
  };
  rec.onHold = () => {
    rec.holdTimer = 0;
    if (rec.holdDead || input.pointers.get(rec.id) !== rec) return;
    rec.held = true;
    P.hold.x = rec.x; P.hold.y = rec.y; P.hold.id = rec.id;
    emit('hold', P.hold);
  };
  return rec;
}

// first active pointer record (insertion order) without an iterator allocation
let firstRec = null;
function pickFirst(r) { if (firstRec === null) firstRec = r; }
function firstPointer() {
  firstRec = null;
  input.pointers.forEach(pickFirst);
  const r = firstRec;
  firstRec = null;
  return r;
}
function syncPrimary() {
  const first = firstPointer();
  input.primary = first;
  input.isDown = first !== null;
  if (first) { input.x = first.x; input.y = first.y; }
}

function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.cancelable) e.preventDefault();
  if (e.isTrusted) trustedDown = true;
  const id = e.pointerId;
  const stale = input.pointers.get(id);
  if (stale) release(stale, true);
  const rec = pool.length ? pool.pop() : makeRec();
  stg.toDesign(e.clientX, e.clientY, PT);
  const x = PT.x, y = PT.y;
  const t = performance.now();
  rec.id = id; rec.type = e.pointerType || 'touch';
  rec.x = x; rec.y = y; rec.startX = x; rec.startY = y;
  rec.startT = t; rec.lastT = t; rec.lastMoveT = t;
  rec.moved = false; rec.held = false; rec.holdDead = false; rec.vx = 0; rec.vy = 0; rec.head = 0; rec.n = 0;
  rec.holdTimer = setTimeout(rec.onHold, TUNE.holdMs);
  input.pointers.set(id, rec);
  syncPrimary();
  P.down.x = x; P.down.y = y; P.down.id = id; P.down.t = t; P.down.type = rec.type;
  emit('down', P.down);
}

function onMove(e) {
  const rec = input.pointers.get(e.pointerId);
  if (!rec) return;
  stg.toDesign(e.clientX, e.clientY, PT);
  const x = PT.x, y = PT.y;
  const dx = x - rec.x, dy = y - rec.y;
  if (dx === 0 && dy === 0) return;
  const t = performance.now();
  let dt = (t - rec.lastT) / 1000;
  if (dt < TUNE.minSampleDt) dt = TUNE.minSampleDt;
  // ring buffer of the last N samples -> windowed average velocity
  rec.sdx[rec.head] = dx; rec.sdy[rec.head] = dy; rec.sdt[rec.head] = dt;
  rec.head = (rec.head + 1) % TUNE.velSamples;
  if (rec.n < TUNE.velSamples) rec.n++;
  let sx = 0, sy = 0, st = 0;
  for (let i = 0; i < rec.n; i++) { sx += rec.sdx[i]; sy += rec.sdy[i]; st += rec.sdt[i]; }
  rec.vx = sx / st; rec.vy = sy / st;
  rec.x = x; rec.y = y; rec.lastT = t; rec.lastMoveT = t;
  const ox = x - rec.startX, oy = y - rec.startY;
  const far = Math.hypot(ox, oy);
  if (!rec.moved && far > TUNE.dragStart) rec.moved = true;
  if (!rec.holdDead && far > TUNE.holdSlop) {
    rec.holdDead = true;
    if (rec.holdTimer) { clearTimeout(rec.holdTimer); rec.holdTimer = 0; }
  }
  if (rec === input.primary) { input.x = x; input.y = y; }
  P.move.x = x; P.move.y = y; P.move.dx = dx; P.move.dy = dy; P.move.id = rec.id;
  emit('move', P.move);
  if (rec.moved) {
    P.drag.x = x; P.drag.y = y; P.drag.dx = dx; P.drag.dy = dy; P.drag.vx = rec.vx; P.drag.vy = rec.vy;
    P.drag.ox = ox; P.drag.oy = oy; P.drag.id = rec.id;
    emit('drag', P.drag);
  }
}

function onUp(e) {
  const rec = input.pointers.get(e.pointerId);
  if (!rec) return;
  if (e.cancelable) e.preventDefault();
  stg.toDesign(e.clientX, e.clientY, PT);
  rec.x = PT.x; rec.y = PT.y;
  release(rec, false);
}
function onCancel(e) {
  const rec = input.pointers.get(e.pointerId);
  if (rec) release(rec, true);
}
function releaseAll() {
  while (input.pointers.size) release(firstPointer(), true);
}
function onVisibility() { if (document.hidden) releaseAll(); }

function release(rec, cancelled) {
  const t = performance.now();
  if (rec.holdTimer) { clearTimeout(rec.holdTimer); rec.holdTimer = 0; }
  input.pointers.delete(rec.id);
  syncPrimary();
  const dur = t - rec.startT;
  if (t - rec.lastMoveT > TUNE.velStaleMs) { rec.vx = 0; rec.vy = 0; }
  const vx = rec.vx, vy = rec.vy, id = rec.id, x = rec.x, y = rec.y;
  const ox = x - rec.startX, oy = y - rec.startY;
  const moved = rec.moved, held = rec.held;
  rec.id = -1;
  pool.push(rec);

  P.up.x = x; P.up.y = y; P.up.id = id; P.up.dur = dur; P.up.cancelled = cancelled;
  emit('up', P.up);
  if (moved) {
    P.dragend.x = x; P.dragend.y = y; P.dragend.vx = vx; P.dragend.vy = vy; P.dragend.id = id;
    P.dragend.flick = !cancelled && Math.hypot(vx, vy) > TUNE.flickSpeed;
    emit('dragend', P.dragend);
  }
  if (cancelled) return;
  if (dur < TUNE.swipeMaxMs && Math.hypot(ox, oy) > TUNE.swipeDist) {
    const horizontal = Math.abs(ox) >= Math.abs(oy);
    P.swipe.dir = horizontal ? (ox < 0 ? 'left' : 'right') : (oy < 0 ? 'up' : 'down');
    P.swipe.vx = vx; P.swipe.vy = vy; P.swipe.dx = ox; P.swipe.dy = oy; P.swipe.x = x; P.swipe.y = y; P.swipe.id = id;
    emit('swipe', P.swipe);
  } else if (!moved && !held) {
    P.tap.x = x; P.tap.y = y; P.tap.id = id;
    emit('tap', P.tap);
    if (t - lastTap.t < TUNE.doubleTapMs && Math.hypot(x - lastTap.x, y - lastTap.y) < TUNE.doubleTapDist) {
      lastTap.t = -1e9;
      P.doubletap.x = x; P.doubletap.y = y; P.doubletap.id = id;
      emit('doubletap', P.doubletap);
    } else {
      lastTap.x = x; lastTap.y = y; lastTap.t = t;
    }
  }
}

function prevent(e) { if (e.cancelable) e.preventDefault(); }

// The visible canvas can be swapped by stage.setPost(); listeners follow it.
function rebindIfSwapped() { if (stg && boundView !== stg.view) bindView(); }
function bindView() {
  const v = stg.view;
  if (!v || v === boundView) return;
  if (boundView) unbindView(boundView);
  boundView = v;
  const s = v.style;
  s.touchAction = 'none'; s.userSelect = 'none'; s.webkitUserSelect = 'none'; s.webkitTouchCallout = 'none';
  v.addEventListener('pointerdown', onDown, { passive: false });
  v.addEventListener('touchstart', prevent, { passive: false });
  v.addEventListener('touchmove', prevent, { passive: false });
  v.addEventListener('contextmenu', prevent);
  v.addEventListener('dblclick', prevent);
  v.addEventListener('selectstart', prevent);
}
function unbindView(v) {
  v.removeEventListener('pointerdown', onDown);
  v.removeEventListener('touchstart', prevent);
  v.removeEventListener('touchmove', prevent);
  v.removeEventListener('contextmenu', prevent);
  v.removeEventListener('dblclick', prevent);
  v.removeEventListener('selectstart', prevent);
}

// The letterbox bars: events whose target IS the container (decor layers in it are pointer-events: none). Events from
// the canvas bubble up here too and are skipped (the view listener has them); <body> as the parent is never hooked, so
// a dev page's HTML buttons keep their clicks.
function bindBars() {
  const p = stg.parent;
  if (!p || p === boundBars || p === document.body || p === document.documentElement) return;
  boundBars = p;
  p.addEventListener('pointerdown', onBarDown, { passive: false });
  p.addEventListener('touchstart', onBarPrevent, { passive: false });
  p.addEventListener('touchmove', onBarPrevent, { passive: false });
  p.addEventListener('contextmenu', onBarPrevent);
}
function onBarDown(e) { if (e.target === boundBars) onDown(e); }
function onBarPrevent(e) { if (e.target === boundBars && e.cancelable) e.preventDefault(); }
