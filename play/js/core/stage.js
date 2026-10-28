// Stage: the DPR-aware portrait canvas. Design width is always 390 units; height follows the viewport (see docs/ENGINE.md).
// Resize is cheap to call: window / orientation / visualViewport events are coalesced to one layout per animation frame
// (+ one late re-check after an orientation change, for browsers that report the new size late), and resize() returns
// early when the viewport, DPR and safe insets are unchanged, so onResize listeners (which drop every baked sprite
// cache) only run on a real layout change. stage.setMaxDpr(v) lowers the DPR cap at runtime (engine's frame governor);
// stage.onView(fn) fires when the visible canvas is swapped (post FX on / off) without a layout change.
// Letterbox: a viewport wider than 390 x 700 units centres the stage between side bars (offsetX css px each). The bars
// belong to the game: engine.js paints them with the scene's ambient light and input.js delivers touches that start
// there, in design units (x < 0 or x > 390). stage.screenL / stage.screenR are the design-unit x of the SCREEN's left /
// right edge (0 / 390 when nothing letterboxes), so an edge rule meant for the system back gesture can test against the
// screen edge instead of the stage edge.
// toDesign(cx, cy, out) runs for every pointer event (120-240 Hz moves on current phones): it reads the view origin
// cached at layout time (stage.viewL / viewT, client px) instead of getBoundingClientRect(), and writes into `out` when
// given, so the input path neither allocates nor forces a layout flush.
const TUNE = { designW: 390, minH: 700, maxDpr: 2, minSafeTop: 24, minSafeBottom: 16, orientRecheckMs: 300, capMin: 1, capMax: 4 };
// Capture-only override (store screenshots and the app icon: dev/store.html, dev/icon.html, tools/store_shots.py):
// ?capdpr=<n> (capMin..capMax) renders the stage at exactly n device px per css px whatever the screen's own ratio is, so
// a 390-css-px-wide window yields a 1290-px-wide frame at n = 3.3076923. Neither the cap (setMaxDpr, the engine's frame
// governor) nor the window's devicePixelRatio moves it. Without the param (every real player) nothing changes.
const CAP_DPR = readCapDpr();

let postRef = null; // set by stage.usePost(postModule) so stage.end() can hand the frame over
const resizeFns = [], viewFns = [];
let rafPending = 0, maxDpr = TUNE.maxDpr;
// the inputs of the last applied layout (resize() is a no-op while they are unchanged)
const last = { vw: -1, vh: -1, dpr: -1, st: -1, sb: -1 };

export const stage = {
  canvas: null, ctx: null, view: null, parent: null,
  w: TUNE.designW, h: 844, dpr: 1, scale: 1, safeTop: TUNE.minSafeTop, safeBottom: TUNE.minSafeBottom,
  cssW: 390, cssH: 844, offsetX: 0, offsetY: 0, screenL: 0, screenR: TUNE.designW, postEnabled: false, layouts: 0,
  viewL: 0, viewT: 0,   // client-px origin of the visible canvas, re-read once per layout / view swap (toDesign uses it)
  capDpr: CAP_DPR,      // the ?capdpr= capture override in force (0 = none)

  init(opts) {
    opts = opts || {};
    this.parent = opts.parent || document.body;
    this.postEnabled = opts.post !== undefined ? !!opts.post : true;
    // The game canvas. When post FX is active it stays offscreen and post.js owns the visible canvas.
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.view = this.canvas;
    this.view.id = 'stage';
    styleView(this.view);
    this.parent.appendChild(this.view);
    // a rotation fires 'orientationchange', 'resize' and visualViewport 'resize': one layout per frame handles them all
    const flush = () => { rafPending = 0; this.resize(); };
    const onR = () => { if (!rafPending) rafPending = requestAnimationFrame(flush); };
    const onOrient = () => { onR(); setTimeout(onR, TUNE.orientRecheckMs); };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onOrient);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onR);
    this.resize(true);
    return this;
  },

  // post.js calls this after creating its WebGL canvas: the WebGL canvas becomes the visible view.
  usePost(post, glCanvas) {
    postRef = post;
    if (glCanvas && glCanvas !== this.view) swapView(this, glCanvas);
    else this.resize(true);
  },
  setPost(enabled) {
    this.postEnabled = !!enabled && !!postRef && postRef.supported;
    if (postRef && postRef.setEnabled) postRef.setEnabled(this.postEnabled);
    if (!this.postEnabled && this.view !== this.canvas) swapView(this, this.canvas);          // show the 2D canvas directly
    else if (this.postEnabled && postRef.canvas && this.view !== postRef.canvas) swapView(this, postRef.canvas);
    else this.resize(true);
  },
  // runtime DPR cap (never above TUNE.maxDpr); a real change re-lays out and re-bakes once
  setMaxDpr(v) {
    const n = Number(v);
    maxDpr = n > 0 ? Math.min(TUNE.maxDpr, n) : TUNE.maxDpr;
    this.resize();
    return maxDpr;
  },
  get maxDpr() { return maxDpr; },

  // Lays the canvases out for the current viewport. Returns true when the layout changed (and onResize listeners ran).
  // force = also re-apply sizes / styles to the canvases when nothing changed (a freshly swapped view needs them).
  resize(force) {
    const vv = window.visualViewport;
    const vw = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
    const vh = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
    const dpr = CAP_DPR > 0 ? CAP_DPR : Math.min(maxDpr, window.devicePixelRatio || 1);
    const st = readSafe('top'), sb = readSafe('bottom');
    const changed = vw !== last.vw || vh !== last.vh || dpr !== last.dpr || st !== last.st || sb !== last.sb;
    if (!changed && !force) return false;
    last.vw = vw; last.vh = vh; last.dpr = dpr; last.st = st; last.sb = sb;
    this.dpr = dpr;
    // scale so the design width fills the viewport width, but never let the design height drop under minH (letterbox wide screens)
    let scale = vw / TUNE.designW;
    if (vh / scale < TUNE.minH) scale = vh / TUNE.minH;
    this.scale = scale;
    this.w = TUNE.designW;
    this.h = Math.round(vh / scale);
    this.cssW = Math.round(this.w * scale); this.cssH = Math.round(this.h * scale);
    this.offsetX = Math.round((vw - this.cssW) / 2); this.offsetY = 0;
    this.screenL = -this.offsetX / scale; this.screenR = this.w + (vw - this.cssW - this.offsetX) / scale;
    this.safeTop = Math.max(TUNE.minSafeTop, Math.round(st / scale));
    this.safeBottom = Math.max(TUNE.minSafeBottom, Math.round(sb / scale));
    const pw = Math.ceil(this.w * scale * this.dpr), ph = Math.ceil(this.h * scale * this.dpr);
    sizeCanvas(this.canvas, pw, ph, this);
    if (this.view !== this.canvas) sizeCanvas(this.view, pw, ph, this);
    readOrigin(this);
    this.ctx.setTransform(scale * this.dpr, 0, 0, scale * this.dpr, 0, 0);
    if (postRef && postRef.resize) postRef.resize();
    if (!changed) return false;
    this.layouts++;
    for (let i = 0; i < resizeFns.length; i++) resizeFns[i](this);
    return true;
  },
  onResize(fn) { resizeFns.push(fn); return () => { const i = resizeFns.indexOf(fn); if (i >= 0) resizeFns.splice(i, 1); }; },
  onView(fn) { viewFns.push(fn); return () => { const i = viewFns.indexOf(fn); if (i >= 0) viewFns.splice(i, 1); }; },

  // client px -> design units. Pass `out` ({ x, y }, reused by the caller) on hot paths; without it a new point is returned.
  toDesign(clientX, clientY, out) {
    const p = out || { x: 0, y: 0 };
    p.x = (clientX - this.viewL) / this.scale;
    p.y = (clientY - this.viewT) / this.scale;
    return p;
  },

  begin() {
    const c = this.ctx;
    c.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000'; c.fillRect(0, 0, this.w, this.h);
  },
  end() {
    if (this.postEnabled && postRef && postRef.present) postRef.present(this.canvas);
  },
};

function sizeCanvas(cv, pw, ph, st) {
  if (cv.width !== pw) cv.width = pw;
  if (cv.height !== ph) cv.height = ph;
  const s = cv.style;
  s.width = st.cssW + 'px'; s.height = st.cssH + 'px';
  s.left = st.offsetX + 'px'; s.top = st.offsetY + 'px';
}
// the visible canvas changes (post FX on / off): size the new one, then tell listeners (input re-binds its pointer hooks)
function swapView(st, cv) {
  if (st.view.parentNode) st.view.parentNode.removeChild(st.view);
  st.view = cv; st.view.id = 'stage'; styleView(st.view); st.parent.appendChild(st.view);
  st.resize(true);
  for (let i = 0; i < viewFns.length; i++) viewFns[i](st);
}
// The view is position: fixed at (offsetX, offsetY); the one rect read per layout (styles were just applied, so it is
// exact) also covers a dev page that nests the stage in an offset or transformed container.
function readOrigin(st) {
  let l = st.offsetX, t = st.offsetY;
  try {
    if (st.view && st.view.isConnected) { const r = st.view.getBoundingClientRect(); l = r.left; t = r.top; }
  } catch (e) { /* detached or no layout: the computed offsets stand */ }
  st.viewL = l; st.viewT = t;
}
function styleView(cv) {
  const s = cv.style;
  s.position = 'fixed'; s.touchAction = 'none'; s.userSelect = 'none'; s.webkitUserSelect = 'none';
  s.webkitTouchCallout = 'none'; s.display = 'block'; s.background = '#000';
}
// ?capdpr=<n> -> n when it is a number in TUNE.capMin..capMax, else 0 (no override)
function readCapDpr() {
  try {
    const m = /[?&]capdpr=([0-9]*\.?[0-9]+)/.exec(window.location.search);
    const v = m ? parseFloat(m[1]) : 0;
    return v >= TUNE.capMin && v <= TUNE.capMax ? v : 0;
  } catch (e) { return 0; }
}
function readSafe(side) {
  // env() is readable through a probe element; falls back to 0
  try {
    let probe = document.getElementById('__safe_' + side);
    if (!probe) {
      probe = document.createElement('div'); probe.id = '__safe_' + side;
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-' + side + ':env(safe-area-inset-' + side + ')';
      document.body.appendChild(probe);
    }
    return parseFloat(getComputedStyle(probe)['padding' + side[0].toUpperCase() + side.slice(1)]) || 0;
  } catch (e) { return 0; }
}
