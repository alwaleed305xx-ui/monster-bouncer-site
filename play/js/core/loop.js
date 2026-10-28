// Game loop: fixed-step update (120 Hz, accumulator) + one render per animation frame, hitstop and slow-motion (see docs/ENGINE.md).
// The step budget covers a whole clamped frame (maxFrameDt), so game time keeps pace with real time down to 20 fps; only a
// longer stall (tab switch, GC pause) is dropped instead of being replayed. loop.frameMs is the smoothed real frame interval
// (engine's quality governor reads it). loop.suspend(true, reason) parks the loop (no update, no render) until every
// reason that parked it has called suspend(false, reason): the 'rotate your phone' overlay ('rotate', so nothing ticks
// behind it: patience, timers) and a native rewarded video on top of the web view ('ad', core/ads.js) each hold their own
// reason, so one cover lifting never unparks the loop under the other. No reason = 'main'.
const TUNE = { step: 1 / 120, maxFrameDt: 1 / 20, frameMsK: 0.08, frameMsMax: 100 };
// one spare step absorbs the carried fraction, so a full clamped frame never hits the cap and drops time
TUNE.maxSteps = Math.ceil(TUNE.maxFrameDt / TUNE.step) + 1;

const updateFns = [], renderFns = [];
let raf = 0, last = 0, acc = 0, hitstopUntil = 0, slow = null, fpsAcc = 0, fpsN = 0, suspended = false;
const parks = {};   // reason -> true while it holds the loop parked

export const loop = {
  running: false, time: 0, timeScale: 1, fps: 0, frame: 0, frameMs: 1000 / 60, dropped: 0,
  get suspended() { return suspended; },
  // the reasons holding the loop parked (dev pages)
  parkedBy() { return Object.keys(parks); },

  start() {
    if (this.running) return;
    this.running = true; last = performance.now(); acc = 0;
    if (!suspended && !raf) raf = requestAnimationFrame(tick);
  },
  stop() { this.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
  // park / unpark the loop for one reason without losing its state; returns the suspended flag (any reason holds it)
  suspend(on, reason) {
    const r = typeof reason === 'string' && reason ? reason : 'main';
    if (on) parks[r] = true; else delete parks[r];
    on = false;
    for (const k in parks) { if (parks[k]) { on = true; break; } }
    if (on === suspended) return suspended;
    suspended = on;
    if (on) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else resumeTicking();
    return suspended;
  },
  onUpdate(fn) { updateFns.push(fn); return () => { const i = updateFns.indexOf(fn); if (i >= 0) updateFns.splice(i, 1); }; },
  onRender(fn) { renderFns.push(fn); return () => { const i = renderFns.indexOf(fn); if (i >= 0) renderFns.splice(i, 1); }; },
  // freeze simulation (not rendering) for ms — impact frames
  hitstop(ms) { const until = performance.now() + ms; if (until > hitstopUntil) hitstopUntil = until; },
  // temporary time scale that eases back to 1 over ms
  slowmo(scale, ms) { slow = { scale: scale, ms: ms || 400, start: performance.now() }; this.timeScale = scale; },
};

function tick(now) {
  if (!loop.running || suspended) { raf = 0; return; }
  raf = requestAnimationFrame(tick);
  const rawMs = now - last;
  let dt = rawMs / 1000; last = now;
  if (dt > TUNE.maxFrameDt) dt = TUNE.maxFrameDt;
  if (dt < 0) dt = 0;
  // smoothed real frame interval (stalls longer than frameMsMax are not frame pacing: skipped)
  if (rawMs > 0 && rawMs < TUNE.frameMsMax) loop.frameMs += (rawMs - loop.frameMs) * TUNE.frameMsK;
  fpsAcc += dt; fpsN++; if (fpsAcc >= 0.5) { loop.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  // slow-motion envelope
  if (slow) {
    const k = (now - slow.start) / slow.ms;
    if (k >= 1) { loop.timeScale = 1; slow = null; }
    else loop.timeScale = slow.scale + (1 - slow.scale) * k * k; // eases back to 1
  }
  const frozen = now < hitstopUntil;
  if (!frozen) {
    acc += dt * loop.timeScale;
    let steps = 0;
    while (acc >= TUNE.step && steps < TUNE.maxSteps) {
      loop.time += TUNE.step;
      for (let i = 0; i < updateFns.length; i++) updateFns[i](TUNE.step);
      acc -= TUNE.step; steps++;
    }
    if (steps === TUNE.maxSteps && acc >= TUNE.step) { loop.dropped++; acc = 0; } // drop the backlog instead of spiralling
  }
  loop.frame++;
  const alpha = acc / TUNE.step;
  for (let i = 0; i < renderFns.length; i++) renderFns[i](alpha);
}

function resumeTicking() {
  last = performance.now(); acc = 0;
  if (loop.running && !suspended && !raf) raf = requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
  else if (!raf) resumeTicking();
});
window.__loop = loop;
