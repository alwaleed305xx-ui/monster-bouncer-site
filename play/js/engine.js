// engine.js: shared engine bootstrap used by js/main.js and by every dev page that needs a running scene.
// startEngine({ scenes: { name: sceneObj }, first, params, dict, post }) boots stage → post → input → audio unlock hook →
// i18n → scenes → loop in the contract order (docs/ENGINE.md § main.js) and returns the engine handle (also window.__tg).
// Beyond the contract it runs four small shell services:
//  - a frame-time governor (window.__tg.perf): when the smoothed frame interval stays above TUNE.perf.slowMs for
//    sustainMs it steps quality down one level (DPR 2 → 1.5, then half-res bloom, then post FX off, then DPR 1). A step
//    that does not speed frames up (a 30 Hz-capped display, Low Power Mode) is undone and the governor stops, so capped
//    devices keep full quality.
//  - the 'turn your phone' overlay (#rotate in index.html, shown by the same media query in css/app.css): while it covers
//    the game the loop is suspended (no timer or patience ticks behind it), audio is held (faded out, its context and
//    the music clock suspended: audio.hold) and the top scene gets an optional onInterrupt('rotate') hook first (play
//    can open its pause overlay there). Turning back unparks the loop and fades the audio back in.
//  - the letterbox ambience (window.__tg.ambient): where the viewport is wider than the 390 x 700 stage (tablets, desktop)
//    the side bars are not dead black. A small <canvas id="ambient"> behind the stage gets the live frame with each bar
//    mirroring the stage edge next to it (stretched when the bar is wider than half the stage) a dozen times a second,
//    cross-faded with the previous picture; css/app.css blurs and dims it and fades it out toward the screen edges into
//    the static night-street backdrop of #app. The seam reads as the scene's own light spilling past the frame. Off
//    (no canvas work) where nothing letterboxes, and frozen once the governor has turned post FX off. The canvas is
//    pointer-events: none, so a touch that starts in a bar lands on #app and input.js hands it to the game.
//  - a baked 2D vignette drawn when post FX is off or unsupported, so the frame keeps its framing without WebGL.
//  - the rewarded-video overlay (core/ads.js, window.__tg.ads): its scene 'ad' is registered next to the game's scenes.
//    v1 attaches no provider, so it never shows (docs/MONETIZATION.md §6.3); v1.1's native AdMob provider offers four
//    opt-in placements (x2 night gems, a free Reopen, gift x2, piggy +50; 6 a day, none for VIP: js/native.js wires the
//    gate from this handle's wallet); ?ads=mock plays them on a dev host. The rotate card and a video each park the
//    loop and hold the audio under their own reason ('rotate' / 'ad'), so one lifting never wakes the game under the other.
// Audio: the first down / up creates and unlocks the AudioContext; after that audio.js keeps a permanent gesture hook that
// resumes a suspended or iOS-'interrupted' context on any later tap, so these one-shot hooks can unhook themselves.
import { stage } from './core/stage.js';
import { loop } from './core/loop.js';
import { input } from './core/input.js';
import { tweens, tween, spring, delay } from './core/tween.js';
import { camera } from './core/camera.js';
import { particles } from './core/particles.js';
import { post } from './core/post.js';
import { audio } from './core/audio.js';
import { draw, color } from './core/draw.js';
import { text } from './core/text.js';
import { i18n } from './core/i18n.js';
import { scenes } from './core/scene.js';
import { save } from './core/save.js';
import { ads } from './core/ads.js';

const TUNE = {
  post: { bloom: 0.45, bloomThreshold: 0.55, vignette: 0.42, saturation: 1.08, contrast: 1.03 },
  splash: { minFrames: 2, fontWaitMs: 1500, maxWaitMs: 3000, removeAfterMs: 600 },
  perf: {
    warmupMs: 4000,     // no judgement while fonts load and the first sprites bake
    slowMs: 22,         // smoothed frame interval above this (≈ 45 fps) counts as slow
    sustainMs: 2000,    // ...for this long before a step down
    settleMs: 700,      // after a step: ignore frames while caches re-bake
    helpK: 0.9,         // a step must cut the frame interval by >= 10 %, else it is undone and the governor stops
    levels: [
      { dpr: 2, bloomDiv: 4, post: true },
      { dpr: 1.5, bloomDiv: 4, post: true },
      { dpr: 1.5, bloomDiv: 8, post: true },
      { dpr: 1.5, bloomDiv: 8, post: false },
      { dpr: 1, bloomDiv: 8, post: false },
    ],
  },
  // must match the #rotate media query in css/app.css
  rotateQuery: '(orientation: landscape) and (pointer: coarse) and (max-height: 540px)',
  ambient: {
    minBar: 8,        // css px of bar per side before it runs (an iPhone SE's 2 px sliver keeps the CSS backdrop)
    rows: 180,        // canvas height in px (width follows the viewport): >= 128 x 129 keeps Chrome's canvas on the GPU
    margin: 64,       // css px the canvas overhangs every viewport edge, so the CSS blur never fades in from a border
    hz: 12,           // refreshes per second
    keep: 0.5,        // share of the previous picture kept per refresh: calm colour drift, no strobing of flashes
    maxShare: 0.5,    // a bar mirrors at most this share of the stage width (a wider bar stretches it)
    fadeIn: 0.32,     // the mask keeps this much of the light at the screen edge (0 = only the CSS backdrop there)
    freezeLevel: 3,   // governor quality level (post FX off) from which the picture stops refreshing
  },
  vignette: { px: 96, stops: 12, inner: 0.45, outer: 1.5 },   // the 2D fallback mirrors post.js's smoothstep vignette
};

let started = false;

export function startEngine(opts) {
  opts = opts || {};
  if (started) return window.__tg;
  started = true;
  let frames = 0, fontsReady = false, splashDone = false, offDown = null, offUp = null;

  function hideSplash() {
    if (splashDone) return;
    splashDone = true;
    const el = document.getElementById('splash');
    if (!el) return;
    el.classList.add('fade');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, TUNE.splash.removeAfterMs);
  }
  // touch browsers grant activation on release, so both hooks try until the context runs
  function unlockAudio() {
    audio.unlock();
    if (audio.ctx && audio.ctx.state === 'running') {
      if (offDown) { offDown(); offDown = null; }
      if (offUp) { offUp(); offUp = null; }
    }
  }

  const app = document.getElementById('app') || document.body;
  stage.init({ parent: app, post: opts.post !== undefined ? opts.post : true });
  post.init(stage);
  post.set(TUNE.post);
  input.init(stage);
  offDown = input.on('down', unlockAudio);
  offUp = input.on('up', unlockAudio);
  if (opts.dict) i18n.load(opts.dict);
  const list = opts.scenes || {};
  for (const name in list) scenes.register(name, list[name]);
  if (!scenes.has('ad')) scenes.register('ad', ads.scene);
  scenes.bindInput(input);

  const gov = makeGovernor(stage.postEnabled);
  const amb = makeAmbient(app, gov);
  const ctx = stage.ctx;
  loop.onUpdate(dt => {
    tweens.update(dt);
    camera.update(dt);
    particles.update(dt);
    scenes.update(dt);
  });
  loop.onRender(() => {
    stage.begin();
    camera.apply(ctx);
    scenes.render(ctx);
    particles.draw(ctx, 'front');
    camera.drawOverlay(ctx);
    if (!stage.postEnabled) drawVignette(ctx);
    stage.end();
    gov.frame();
    amb.frame();
    if (!splashDone && ++frames >= TUNE.splash.minFrames && fontsReady) hideSplash();
  });

  draw.ready().then(() => { fontsReady = true; });
  setTimeout(() => { fontsReady = true; }, TUNE.splash.fontWaitMs);
  setTimeout(hideSplash, TUNE.splash.maxWaitMs);

  loop.start();
  if (opts.first) scenes.go(opts.first, opts.params || {}, { transition: opts.transition || 'fade', ms: opts.ms || 450 });
  const rot = watchRotate();

  window.__tg = { stage, loop, input, tweens, tween, spring, delay, camera, particles, post, audio, draw, color, text, i18n, scenes, save, ads, perf: gov, rotate: rot, ambient: amb };
  window.__ok = true;
  return window.__tg;
}

// ---------------------------------------------------------------- frame-time governor
function makeGovernor(postAllowed) {
  const P = TUNE.perf;
  const gov = {
    enabled: true, level: 0, done: false, log: [],
    slowSince: 0, until: performance.now() + P.warmupMs, checkAt: 0, before: 0, prev: 0,
    frame() {
      if (!gov.enabled || gov.done || document.hidden || loop.suspended) return;
      const now = performance.now();
      if (now < gov.until) return;
      const fm = loop.frameMs;
      if (gov.checkAt) {                     // judging the last step
        if (now < gov.checkAt) return;
        gov.checkAt = 0;
        if (fm > gov.before * P.helpK) {     // no real gain: the display is capped, not the GPU: undo and stop
          gov.note('undo L' + gov.level + ' (' + gov.before.toFixed(1) + ' -> ' + fm.toFixed(1) + ' ms)');
          gov.apply(gov.prev); gov.done = true;
          return;
        }
        gov.note('kept L' + gov.level + ' (' + gov.before.toFixed(1) + ' -> ' + fm.toFixed(1) + ' ms)');
      }
      if (fm <= P.slowMs) { gov.slowSince = 0; return; }
      if (!gov.slowSince) { gov.slowSince = now; return; }
      if (now - gov.slowSince < P.sustainMs) return;
      gov.slowSince = 0;
      const next = gov.nextLevel();
      if (next < 0) { gov.done = true; return; }
      gov.before = fm; gov.prev = gov.level;
      gov.apply(next);
      gov.until = now + P.settleMs; gov.checkAt = now + P.settleMs + P.sustainMs;
      gov.note('step L' + next + ' at ' + fm.toFixed(1) + ' ms');
    },
    // the next level that actually changes something on this device, or -1
    nextLevel() {
      const cur = effective(gov.level);
      for (let i = gov.level + 1; i < P.levels.length; i++) {
        const e = effective(i);
        if (e.dpr !== cur.dpr || e.post !== cur.post || (e.post && e.bloomDiv !== cur.bloomDiv)) return i;
      }
      return -1;
    },
    apply(i) {
      const L = P.levels[i];
      gov.level = i;
      post.setBloomDiv(L.bloomDiv);
      const wantPost = L.post && postAllowed;
      if (wantPost !== stage.postEnabled) stage.setPost(wantPost);
      stage.setMaxDpr(L.dpr);
    },
    note(s) { gov.log.push(s); if (gov.log.length > 12) gov.log.shift(); },
  };
  function effective(i) {
    const L = P.levels[i];
    const dev = window.devicePixelRatio || 1;
    return { dpr: Math.min(L.dpr, dev), post: L.post && postAllowed && post.supported, bloomDiv: L.bloomDiv };
  }
  return gov;
}

// ---------------------------------------------------------------- letterbox ambience
// Canvas space: the canvas covers the viewport plus `margin` css px on every side at k px per css px; the stage sits at
// (sx .. sx + sw) over the full height. Each refresh draws the frame there and each bar mirrored out of the stage edge it
// touches. Layout work (sizes, the CSS mask seam) happens on stage resize only; a refresh is three drawImage calls.
function makeAmbient(parent, gov) {
  const A = TUNE.ambient;
  const st = {
    on: false, disabled: false, refreshes: 0, cv: null, c: null, next: 0, fresh: true,
    bw: 0, bh: 0, sx: 0, sw: 0, stripL: 0, stripR: 0,
    frame() {
      if (!st.on) return;
      const now = performance.now();
      if (now < st.next) return;
      st.next = now + 1000 / A.hz;
      if (!st.fresh && gov.level >= A.freezeLevel) return;
      st.draw();
    },
    draw() {
      const src = stage.canvas, c = st.c, cw = src.width, ch = src.height;
      if (!c || !(cw > 0) || !(ch > 0)) return;
      const bw = st.bw, bh = st.bh, sx = st.sx, sw = st.sw, k = cw / stage.cssW;
      c.globalAlpha = st.fresh ? 1 : 1 - A.keep;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(src, 0, 0, cw, ch, sx, 0, sw, bh);
      const pl = Math.min(cw, st.stripL * k), pr = Math.min(cw, st.stripR * k);
      // left bar: the stage's left strip mirrored (its edge column against the seam)
      c.setTransform(-1, 0, 0, 1, sx, 0);
      c.drawImage(src, 0, 0, pl, ch, 0, 0, sx, bh);
      // right bar: the right strip mirrored the same way
      c.setTransform(-1, 0, 0, 1, bw, 0);
      c.drawImage(src, cw - pr, 0, pr, ch, 0, 0, bw - sx - sw, bh);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      if (st.fresh) { st.fresh = false; st.cv.classList.add('on'); }
      st.refreshes++;
    },
    layout() {
      if (st.disabled) return;
      const left = stage.offsetX, right = (stage.screenR - stage.w) * stage.scale;
      const on = Math.min(left, right) >= A.minBar && !!parent && parent !== document.body;
      if (!on) {
        if (st.on) { st.on = false; if (st.cv) { st.cv.classList.remove('on'); st.cv.style.display = 'none'; } }
        return;
      }
      if (!st.cv) {
        st.cv = document.createElement('canvas');
        st.cv.id = 'ambient';
        st.cv.setAttribute('aria-hidden', 'true');
        parent.insertBefore(st.cv, parent.firstChild);
        // only where css/app.css styles it (blur, mask, click-through): a dev page without it keeps plain bars
        if (getComputedStyle(st.cv).pointerEvents !== 'none') {
          parent.removeChild(st.cv); st.cv = null; st.disabled = true;
          return;
        }
        st.c = st.cv.getContext('2d', { alpha: false });
      }
      const M = A.margin, vw = left + stage.cssW + right, vh = stage.cssH;
      const k = A.rows / (vh + M * 2);
      st.bh = A.rows; st.bw = Math.max(1, Math.round((vw + M * 2) * k));
      st.sx = (M + left) * k; st.sw = stage.cssW * k;
      // css px of stage each bar mirrors (bar + overhang, capped at maxShare of the stage)
      st.stripL = Math.min(left + M, stage.cssW * A.maxShare);
      st.stripR = Math.min(right + M, stage.cssW * A.maxShare);
      const cv = st.cv, s = cv.style;
      if (cv.width !== st.bw) cv.width = st.bw;
      if (cv.height !== st.bh) cv.height = st.bh;
      s.display = 'block';
      s.left = -M + 'px'; s.top = -M + 'px';
      s.width = (vw + M * 2) + 'px'; s.height = (vh + M * 2) + 'px';
      // the CSS mask is opaque over the stage and the seams and fades toward the screen edges
      s.setProperty('--seamL', ((M + left) / (vw + M * 2) * 100).toFixed(2) + '%');
      s.setProperty('--seamR', ((M + left + stage.cssW) / (vw + M * 2) * 100).toFixed(2) + '%');
      s.setProperty('--edgeA', String(A.fadeIn));
      st.on = true; st.fresh = true; st.next = 0;
    },
  };
  stage.onResize(st.layout);
  st.layout();
  return st;
}

// ---------------------------------------------------------------- 'turn your phone' overlay
function watchRotate() {
  const st = { on: false, mq: null };
  if (!window.matchMedia) return st;
  const mq = window.matchMedia(TUNE.rotateQuery);
  st.mq = mq;
  const apply = on => {
    on = !!on;
    if (on === st.on) return;
    st.on = on;
    if (on) {
      // let the scene react first (play opens its pause overlay), then park the loop behind the overlay
      const top = scenes.top, base = scenes.current;
      const s = top && top.onInterrupt ? top : (base && base.onInterrupt ? base : null);
      if (s) { try { s.onInterrupt('rotate'); } catch (e) { console.error('[engine] onInterrupt failed', e); } }
      loop.suspend(true, 'rotate');
      audio.hold(true, 'rotate');
    } else {
      loop.suspend(false, 'rotate');
      audio.hold(false, 'rotate');
    }
  };
  st.apply = apply;   // test hook: apply(true / false) acts as if the card showed / went away (the CSS card itself follows the query)
  const onChange = e => apply(e.matches);
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
  // belt and braces: a rotation is also a stage layout change, so re-read the query there too
  stage.onResize(() => apply(mq.matches));
  apply(mq.matches);
  return st;
}

// ---------------------------------------------------------------- 2D vignette (post FX off)
let vig = null;
function bakeVignette() {
  const V = TUNE.vignette, k = TUNE.post.vignette, px = V.px, half = px / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  // uv-space radius 1.5 of length(d * 2) sits at 0.75 of the canvas width from the centre (the corners are at 0.707)
  const R = half * V.outer;
  const g = c.createRadialGradient(half, half, 0, half, half, R);
  for (let i = 0; i <= V.stops; i++) {
    const L = (i / V.stops) * V.outer;
    let t = (L - V.inner) / (V.outer - V.inner);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    g.addColorStop(i / V.stops, 'rgba(0,0,0,' + (k * t * t * (3 - 2 * t)).toFixed(4) + ')');
  }
  c.fillStyle = g;
  c.fillRect(0, 0, px, px);
  return cv;
}
function drawVignette(ctx) {
  if (!(TUNE.post.vignette > 0)) return;
  if (!vig) vig = bakeVignette();
  const k = stage.scale * stage.dpr;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(vig, 0, 0, stage.w, stage.h);
  ctx.restore();
}
