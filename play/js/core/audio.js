// Audio: lazily unlocked WebAudio synth (tone / noise / Karplus-Strong pluck / drums), a named SFX library and an
// intensity-layered 16th-note step sequencer for music. Call audio.unlock() on the first pointerdown; every call
// no-ops safely until an AudioContext exists (see docs/ENGINE.md). After that the module keeps the context alive by
// itself (suspend while hidden, resume on return / statechange / any later tap, incl. iOS 'interrupted').
// audio.hold(true) fades everything out on a duck stage after the compressor and then suspends the context, so the music
// clock stops instead of running on behind a cover (engine.js holds while the 'turn your phone' card parks the loop);
// hold(false) resumes and fades back in, the sequencer continuing where it stopped. While held nothing resumes the
// context (visibility, statechange, taps). Holds are per reason: hold(on, reason) ('rotate' from engine.js, 'ad' from
// core/ads.js while a rewarded video runs; none = 'main') and the audio stays held while any reason still holds it. SFX are defined as fn(arg, when, bus, scale):
// audio.sfx.name(arg) plays now on the sfx bus, while a theme pattern returning the sfx name schedules it at the
// step time on that layer's bus.
import { clamp } from './math.js';
import { save } from './save.js';

const TUNE = {
  masterVol: 1,
  sfxBus: 0.9,
  musicBus: 0.55,
  comp: { threshold: -16, knee: 18, ratio: 4, attack: 0.003, release: 0.2 },
  rampSec: 0.05,          // mute / volume ramps (s)
  holdFade: 0.22,         // hold(): fade out before the context is suspended / fade in after it resumes (s)
  musicMuteRamp: 0.3,     // music bus on / off ramp (s)
  nodeTail: 0.03,         // oscillators / sources stop this long after their envelope ends (s)
  noiseSeconds: 2,        // shared white-noise buffer length (s)
  noiseMargin: 0.5,       // noise sources start at least this far from the buffer end (s)
  pluckDur: 0.6,          // default pluck length (s)
  pluckBright: 0.6,       // 0 = soft nylon, 1 = bright steel
  pluckFade: 0.02,        // fade-out tail baked into every pluck buffer (s)
  pluckCache: 40,         // max cached Karplus-Strong buffers
  pluckHumanise: 0.004,   // random playbackRate spread (+-0.2 %)
  sfxMinGap: 0.03,        // the same named sfx cannot retrigger faster than this (s)
  lookahead: 0.1,         // sequencer schedules this far ahead (s)
  tickMs: 25,             // sequencer timer period (ms)
  seqStartDelay: 0.05,    // first step after music.start (s)
  seqResyncDelay: 0.02,   // first step after the clock is caught up (s)
  resyncBehind: 0.4,      // clock fell behind more than this (hidden tab): skip ahead instead of bursting notes
  layerFade: 0.35,        // time constant of layer fade in / out (s)
  themeFadeIn: 0.5,       // new theme fade in (s)
  musicFade: 0.7,         // theme stop fade (s)
  defaultIntensity: 0.5,
};

// ---------------------------------------------------------------- state
let ctx = null, master = null, comp = null, duck = null, sfxBus = null, musicBus = null, noiseBuf = null;
let held = false, holdTimer = 0;
let enabled = save.get('audio.on', true) !== false;
let musicOn = save.get('audio.music', true) !== false;
let vol = Number(save.get('audio.vol', TUNE.masterVol));
if (!(vol >= 0 && vol <= 1)) vol = TUNE.masterVol;

const EMPTY = {};
const OPEN = { open: true };
const TONE_DEF = { type: 'sine', dur: 0.15, vol: 0.3, attack: 0.005, sustain: 1, decay: 0, lp: 0, spread: 0 };
const PAD_DEF = { type: 'triangle', dur: 2, vol: 0.1, attack: 0.35, release: 0.6, sustain: 0.7, decay: 0.9, lp: 1100, spread: 6 };
const SWEEP_DEF = { type: 'sine', dur: 0.4, vol: 0.25, attack: 0.01, sustain: 1, decay: 0, lp: 0, spread: 0 };

const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-Ga-g])([#b]?)(-?\d+)$/;
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// ---------------------------------------------------------------- context
function unlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!ctx) {
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; } }
    if (!ctx) return false;
    buildGraph();
    watchState();
    audio.ctx = ctx; audio.master = master;
  }
  if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(noop); }
  if (pendingTheme && !seq) startTheme(pendingTheme);
  if (held && !holdTimer) holdTimer = setTimeout(suspendHeld, TUNE.holdFade * 1000);   // unlocked under a cover: park again
  return true;
}
function noop() {}

function buildGraph() {
  master = ctx.createGain(); master.gain.value = enabled ? vol : 0;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = TUNE.comp.threshold; comp.knee.value = TUNE.comp.knee; comp.ratio.value = TUNE.comp.ratio;
  comp.attack.value = TUNE.comp.attack; comp.release.value = TUNE.comp.release;
  duck = ctx.createGain(); duck.gain.value = held ? 0 : 1;
  master.connect(comp); comp.connect(duck); duck.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = TUNE.sfxBus; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? TUNE.musicBus : 0; musicBus.connect(master);
  const n = Math.floor(ctx.sampleRate * TUNE.noiseSeconds);
  noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}

function ramp(param, target, secs) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + secs);
}

function setEnabled(on) {
  enabled = !!on; audio.enabled = enabled; save.set('audio.on', enabled);
  if (ctx) { ramp(master.gain, enabled ? vol : 0, TUNE.rampSec); tryResume(); }
}
function setMusic(on) {
  musicOn = !!on; audio.musicOn = musicOn; save.set('audio.music', musicOn);
  if (ctx) ramp(musicBus.gain, musicOn ? TUNE.musicBus : 0, TUNE.musicMuteRamp);
}
function volume(v) {
  if (v === undefined || v === null) return vol;
  const n = Number(v);
  if (n !== n) return vol;
  vol = clamp(n, 0, 1); save.set('audio.vol', vol);
  if (ctx && enabled) ramp(master.gain, vol, TUNE.rampSec);
  return vol;
}

// ---------------------------------------------------------------- suspend / resume
// The context is suspended while the page is hidden and brought back afterwards. Any state other than 'running' /
// 'closed' counts as resumable: iOS Safari parks the context in the non-standard 'interrupted' state after app
// switches, calls or Siri, and may refuse resume() outside a user gesture. So resume is retried on visibility,
// pageshow, every statechange while visible, and on every later tap via a permanent window-level gesture hook
// (independent of whoever wired the first unlock, which may unhook itself once the context first runs).
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
const PASSIVE_CAPTURE = { capture: true, passive: true };
function resumable() { return !!ctx && ctx.state !== 'running' && ctx.state !== 'closed'; }
function tryResume() {
  if (!resumable() || !enabled || held || document.hidden) return;
  const p = ctx.resume(); if (p && p.catch) p.catch(noop);
}
// hold(on, reason): see the header. Returns the held flag.
const holds = {};   // reason -> true while it holds the audio
function hold(on, reason) {
  const r = typeof reason === 'string' && reason ? reason : 'main';
  if (on) holds[r] = true; else delete holds[r];
  on = false;
  for (const k in holds) { if (holds[k]) { on = true; break; } }
  if (on === held) return held;
  held = on; audio.held = held;
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
  if (!ctx) return held;
  if (on) {
    ramp(duck.gain, 0, TUNE.holdFade);
    holdTimer = setTimeout(suspendHeld, TUNE.holdFade * 1000 + 30);
  } else {
    tryResume();
    ramp(duck.gain, 1, TUNE.holdFade);   // a suspended clock is frozen: the fade plays out once the context runs again
  }
  return held;
}
function suspendHeld() {
  holdTimer = 0;
  if (held) suspendHidden();
}
function suspendHidden() {
  if (!ctx || ctx.state !== 'running') return;
  const p = ctx.suspend(); if (p && p.catch) p.catch(noop);
}
function onVisibility() { if (!ctx) return; if (document.hidden) suspendHidden(); else tryResume(); }
function onPageShow() { tryResume(); }
function onGesture() { tryResume(); }
function watchState() {
  if (ctx.addEventListener) ctx.addEventListener('statechange', tryResume);
  else ctx.onstatechange = tryResume;
}
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pageshow', onPageShow);
for (let i = 0; i < GESTURES.length; i++) window.addEventListener(GESTURES[i], onGesture, PASSIVE_CAPTURE);

// ---------------------------------------------------------------- node helpers
function route(g, pan, bus) {
  if (pan !== undefined && pan !== 0 && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
    g.connect(p); p.connect(bus); return p;
  }
  g.connect(bus); return null;
}
function finish(src, a, b, c, d) {
  src.onended = function () {
    src.disconnect();
    if (a) a.disconnect(); if (b) b.disconnect(); if (c) c.disconnect(); if (d) d.disconnect();
  };
}
// attack -> (decay to sustain) -> hold -> exponential release ending at t0 + dur; returns the end time
function env(p, t0, peak, attack, decay, sustain, dur, release) {
  peak = Math.max(0.0001, peak);
  const a = Math.max(0.001, attack), rel = Math.max(0.005, release);
  let t = t0 + a, level = peak;
  p.setValueAtTime(0.0001, t0);
  p.linearRampToValueAtTime(peak, t);
  if (sustain < 1) { level = Math.max(0.0001, peak * sustain); const dc = Math.max(0.005, decay); p.exponentialRampToValueAtTime(level, t + dc); t += dc; }
  const tr = Math.max(t, t0 + dur - rel);
  const end = Math.max(tr + 0.005, t0 + dur);
  p.setValueAtTime(level, tr);
  p.exponentialRampToValueAtTime(0.0001, end);
  return end;
}
function filt(type, f, f2, q, t0, dur) {
  const b = ctx.createBiquadFilter(); b.type = type; b.Q.value = q || 0.8;
  b.frequency.setValueAtTime(Math.max(20, f), t0);
  if (f2) b.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  return b;
}
function makeOsc(type, f, f2, glide, detune, t0, end, dest) {
  const osc = ctx.createOscillator(); osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (f2 && f2 > 0) osc.frequency.exponentialRampToValueAtTime(f2, t0 + Math.max(0.001, glide));
  if (detune) osc.detune.value = detune;
  osc.connect(dest); osc.start(t0); osc.stop(end + TUNE.nodeTail);
  return osc;
}

// ---------------------------------------------------------------- primitives (internal: absolute `when`, target bus, volume scale)
function toneAt(o, when, bus, scale, fOver, defs) {
  const D = defs || TONE_DEF;
  const t0 = when !== undefined ? when : ctx.currentTime + (o.at || 0);
  const dur = Math.max(0.005, o.dur !== undefined ? o.dur : D.dur);
  const v = (o.vol !== undefined ? o.vol : D.vol) * scale;
  const f = Math.max(1, fOver !== undefined ? fOver : (o.f !== undefined ? o.f : 440));
  const type = o.type || D.type;
  const attack = o.attack !== undefined ? o.attack : D.attack;
  const release = o.release !== undefined ? o.release : (D.release !== undefined ? D.release : Math.min(0.08, dur * 0.5));
  const sustain = o.sustain !== undefined ? o.sustain : D.sustain;
  const decay = o.decay !== undefined ? o.decay : D.decay;
  const lp = o.lp !== undefined ? o.lp : D.lp;
  const spread = o.spread !== undefined ? o.spread : D.spread;
  const glide = o.glide !== undefined ? o.glide : dur;
  const detune = o.detune || 0;
  const g = ctx.createGain();
  const end = env(g.gain, t0, v, attack, decay, sustain, dur, release);
  let head = g, flt = null;
  if (lp) { flt = filt('lowpass', lp, o.lp2, o.q || 0.7, t0, dur); flt.connect(g); head = flt; }
  const osc = makeOsc(type, f, o.f2, glide, detune - spread, t0, end, head);
  const osc2 = spread ? makeOsc(type, f, o.f2, glide, detune + spread, t0, end, head) : null;
  const p = route(g, o.pan, bus);
  finish(osc, g, flt, p, osc2);
  return end;
}

function noiseAt(o, when, bus, scale) {
  const t0 = when !== undefined ? when : ctx.currentTime + (o.at || 0);
  const dur = Math.max(0.005, o.dur !== undefined ? o.dur : 0.2);
  const v = (o.vol !== undefined ? o.vol : 0.3) * scale;
  const attack = o.attack !== undefined ? o.attack : 0.002;
  const release = o.release !== undefined ? o.release : Math.max(0.005, dur - attack);
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const g = ctx.createGain();
  const end = env(g.gain, t0, v, attack, 0, 1, dur, release);
  let head = src, hp = null, lp = null;
  if (o.hp) { hp = filt('highpass', o.hp, o.hp2, o.q, t0, dur); head.connect(hp); head = hp; }
  if (o.lp) { lp = filt('lowpass', o.lp, o.lp2, o.q, t0, dur); head.connect(lp); head = lp; }
  head.connect(g);
  const p = route(g, o.pan, bus);
  src.start(t0, Math.random() * (TUNE.noiseSeconds - TUNE.noiseMargin));
  src.stop(end + TUNE.nodeTail);
  finish(src, g, hp, lp, p);
  return end;
}

// Karplus-Strong rendered into a cached AudioBuffer: a short noise burst fed through a 2-tap averaging delay line
// with a per-period decay. The averager adds half a sample of delay and the rest of the loop length is fractional
// (linear interpolation between adjacent taps), so the loop period matches sr / f to a few hundredths of a sample at
// any pitch. (A DelayNode feedback loop is clamped to one render quantum, so notes above ~340 Hz would detune;
// rendering the string in JS costs ~0.1 ms per new note.)
const pluckCache = new Map();
function ksBuffer(f, dur, bright) {
  const key = Math.round(f * 10) + '|' + Math.round(dur * 100) + '|' + Math.round(bright * 10);
  let b = pluckCache.get(key);
  if (b) return b;
  if (pluckCache.size >= TUNE.pluckCache) pluckCache.clear();
  const sr = ctx.sampleRate;
  const P = sr / f - 0.5;                                  // loop delay minus the averager's half sample
  const N = Math.max(2, Math.floor(P)), fr = clamp(P - N, 0, 1);
  const seed = N + 2, len = Math.max(seed + 1, Math.floor(dur * sr));
  b = ctx.createBuffer(1, len, sr);
  const d = b.getChannelData(0);
  const k = 0.12 + bright * 0.88;
  let lpv = 0;
  for (let i = 0; i < seed; i++) { lpv += (Math.random() * 2 - 1 - lpv) * k; d[i] = lpv; }
  const decay = Math.pow(0.001, 1 / (dur * f));           // one factor per period: -60 dB after dur seconds
  const a = decay * 0.5 * (1 - fr), c = decay * 0.5 * fr;
  for (let i = seed; i < len; i++) d[i] = a * (d[i - N] + d[i - N - 1]) + c * (d[i - N - 1] + d[i - N - 2]);
  const fadeN = Math.min(len, Math.floor(sr * TUNE.pluckFade));
  for (let j = 0; j < fadeN; j++) d[len - 1 - j] *= j / fadeN;
  let peak = 0;
  for (let i = 0; i < len; i++) { const q = d[i] < 0 ? -d[i] : d[i]; if (q > peak) peak = q; }
  if (peak > 0) { const s = 0.9 / peak; for (let i = 0; i < len; i++) d[i] *= s; }
  pluckCache.set(key, b);
  return b;
}
function pluckAt(o, when, bus, scale, fOver) {
  const t0 = when !== undefined ? when : ctx.currentTime + (o.at || 0);
  const f = clamp(fOver !== undefined ? fOver : (o.f || 440), 20, 8000);
  const dur = clamp(o.dur !== undefined ? o.dur : TUNE.pluckDur, 0.05, 4);
  const v = (o.vol !== undefined ? o.vol : 0.4) * scale;
  const src = ctx.createBufferSource();
  src.buffer = ksBuffer(f, dur, o.bright !== undefined ? o.bright : TUNE.pluckBright);
  src.playbackRate.value = 1 + (Math.random() - 0.5) * TUNE.pluckHumanise;
  const g = ctx.createGain(); g.gain.setValueAtTime(Math.max(0.0001, v), t0);
  src.connect(g);
  const p = route(g, o.pan, bus);
  src.start(t0);
  finish(src, g, p, null, null);
  return t0 + dur;
}

const KICK_BODY = { f: 150, f2: 40, glide: 0.11, type: 'sine', dur: 0.28, vol: 0.9, attack: 0.002, release: 0.24 };
const KICK_CLICK = { hp: 1800, dur: 0.02, vol: 0.25, attack: 0.001 };
const SNARE_NOISE = { hp: 900, lp: 9000, dur: 0.18, vol: 0.55, attack: 0.001 };
const SNARE_TONE = { f: 180, f2: 120, type: 'triangle', dur: 0.11, vol: 0.5, attack: 0.001, release: 0.09 };
const HAT = { hp: 7500, dur: 0.045, vol: 0.32, attack: 0.001 };
const HAT_OPEN = { hp: 7000, dur: 0.22, vol: 0.28, attack: 0.001 };
function drumTime(o, when) { return when !== undefined ? when : ctx.currentTime + (o.at || 0); }
function kickAt(o, when, bus, scale) {
  const v = (o.vol !== undefined ? o.vol : 1) * scale, t0 = drumTime(o, when);
  toneAt(KICK_BODY, t0, bus, v); noiseAt(KICK_CLICK, t0, bus, v);
}
function snareAt(o, when, bus, scale) {
  const v = (o.vol !== undefined ? o.vol : 1) * scale, t0 = drumTime(o, when);
  noiseAt(SNARE_NOISE, t0, bus, v); toneAt(SNARE_TONE, t0, bus, v);
}
function hatAt(o, when, bus, scale) {
  const v = (o.vol !== undefined ? o.vol : 1) * scale, t0 = drumTime(o, when);
  noiseAt(o.open ? HAT_OPEN : HAT, t0, bus, v);
}

// ---------------------------------------------------------------- musical helpers
function note(name) {
  if (typeof name === 'number') return name;
  if (!name) return 440;
  const m = NOTE_RE.exec(String(name).trim());
  if (!m) return 440;
  let semi = NOTE_IDX[m[1].toUpperCase()];
  if (m[2] === '#') semi++; else if (m[2] === 'b') semi--;
  const midi = 12 * (parseInt(m[3], 10) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function scale(root, mode, octaves) {
  const r = note(root), iv = MODES[mode] || MODES.major, oct = octaves || 1, out = [];
  for (let o = 0; o < oct; o++) for (let i = 0; i < iv.length; i++) out.push(r * Math.pow(2, (o * 12 + iv[i]) / 12));
  out.push(r * Math.pow(2, oct));
  return out;
}

// ---------------------------------------------------------------- sfx library
const RAW = {}, sfx = {}, lastFire = {};
function define(name, fn) {
  RAW[name] = fn;
  sfx[name] = function (a) {
    if (!ctx || !enabled) return;
    const now = ctx.currentTime, last = lastFire[name];
    if (last !== undefined && now - last < TUNE.sfxMinGap) return;
    lastFire[name] = now;
    fn(a, undefined, sfxBus, 1);
  };
  return sfx[name];
}
function at(when) { return when !== undefined ? when : ctx.currentTime; }

const SX = {
  tap: { f: 1800, f2: 1500, type: 'triangle', dur: 0.04, vol: 0.22, attack: 0.002, release: 0.03 },
  popTone: { f: 500, f2: 900, type: 'sine', dur: 0.06, vol: 0.35, attack: 0.003, release: 0.035 },
  popNoise: { hp: 3000, dur: 0.02, vol: 0.08, attack: 0.001 },
  whoosh: { hp: 150, lp: 300, lp2: 3800, q: 1.2, dur: 0.3, vol: 0.4, attack: 0.1, release: 0.18 },
  thudTone: { f: 120, f2: 60, type: 'sine', dur: 0.12, vol: 0.6, attack: 0.003, release: 0.09 },
  thudNoise: { lp: 350, dur: 0.08, vol: 0.25, attack: 0.002 },
  ding1: { f: 1320, type: 'sine', dur: 0.5, vol: 0.3, attack: 0.002, release: 0.45 },
  ding2: { f: 1765, type: 'sine', dur: 0.35, vol: 0.12, attack: 0.002, release: 0.3 },
  ding3: { f: 2640, type: 'sine', dur: 0.2, vol: 0.05, attack: 0.002, release: 0.17 },
  coin1: { f: 1320, type: 'sine', dur: 0.1, vol: 0.3, attack: 0.002, release: 0.05 },
  coin2: { f: 1760, type: 'sine', dur: 0.35, vol: 0.3, attack: 0.002, release: 0.3 },
  success: { type: 'triangle', dur: 0.28, vol: 0.24, attack: 0.004, release: 0.2 },
  successPad: { type: 'sine', dur: 0.55, vol: 0.07, attack: 0.05, release: 0.4 },
  fail1: { f: 330, type: 'square', dur: 0.16, vol: 0.12, attack: 0.005, release: 0.06, lp: 1400 },
  fail2: { f: 220, type: 'square', dur: 0.28, vol: 0.12, attack: 0.005, release: 0.2, lp: 1200 },
  combo: { type: 'triangle', dur: 0.14, vol: 0.26, attack: 0.003, release: 0.1 },
  comboSpark: { type: 'sine', dur: 0.1, vol: 0.09, attack: 0.002, release: 0.08 },
  levelUp: { type: 'triangle', dur: 0.35, vol: 0.22, attack: 0.004, release: 0.25 },
  levelShimmer: { hp: 6000, dur: 0.7, vol: 0.12, attack: 0.25, release: 0.4 },
  levelPad: { type: 'sine', dur: 0.8, vol: 0.07, attack: 0.05, release: 0.6 },
  swipeNoise: { hp: 600, hp2: 2500, lp: 6000, dur: 0.14, vol: 0.25, attack: 0.02, release: 0.1 },
  swipeTone: { f: 500, f2: 1100, type: 'sine', dur: 0.1, vol: 0.08, attack: 0.01, release: 0.06 },
  bounce1: { f: 420, f2: 200, type: 'triangle', dur: 0.11, vol: 0.3, attack: 0.003, release: 0.08 },
  bounce2: { f: 220, f2: 140, type: 'sine', dur: 0.12, vol: 0.15, attack: 0.003, release: 0.09 },
  clickTone: { f: 2400, type: 'square', dur: 0.015, vol: 0.12, attack: 0.001, release: 0.01 },
  clickNoise: { hp: 4000, dur: 0.012, vol: 0.08, attack: 0.001 },
  chargeTone: { f: 180, f2: 880, type: 'sawtooth', dur: 0.6, vol: 0.16, attack: 0.45, release: 0.1, lp: 600, lp2: 3000 },
  chargeNoise: { hp: 800, hp2: 5000, dur: 0.6, vol: 0.1, attack: 0.5, release: 0.08 },
  releaseNoise: { hp: 1200, lp: 8000, dur: 0.12, vol: 0.3, attack: 0.003, release: 0.1 },
  releaseTone: { f: 900, f2: 300, type: 'sine', dur: 0.16, vol: 0.2, attack: 0.003, release: 0.1 },
  explodeNoise: { lp: 1200, lp2: 120, dur: 0.7, vol: 0.7, attack: 0.004, release: 0.65 },
  explodeSub: { f: 95, f2: 35, type: 'sine', dur: 0.45, vol: 0.7, attack: 0.004, release: 0.4 },
  explodeCrack: { hp: 2000, dur: 0.06, vol: 0.3, attack: 0.001 },
  sparkle: { type: 'sine', dur: 0.12, vol: 0.08, attack: 0.002, release: 0.1 },
  tickTone: { f: 1200, type: 'square', dur: 0.012, vol: 0.1, attack: 0.001, release: 0.008 },
  tickNoise: { hp: 5000, dur: 0.008, vol: 0.06, attack: 0.001 },
  warning: { f: 880, type: 'square', dur: 0.08, vol: 0.14, attack: 0.003, release: 0.04, lp: 2600 },
};
const SUCCESS_NOTES = [523.25, 659.25, 783.99, 1046.5];
const LEVEL_NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.51];
const LEVEL_PAD = [1046.5, 1318.51, 1567.98];

define('tap', (n, w, bus, k) => { toneAt(SX.tap, w, bus, k); });
define('pop', (n, w, bus, k) => { toneAt(SX.popTone, w, bus, k); noiseAt(SX.popNoise, w, bus, k); });
define('whoosh', (n, w, bus, k) => { noiseAt(SX.whoosh, w, bus, k); });
define('thud', (n, w, bus, k) => { toneAt(SX.thudTone, w, bus, k); noiseAt(SX.thudNoise, w, bus, k); });
define('ding', (n, w, bus, k) => {
  const t0 = at(w);
  toneAt(SX.ding1, t0, bus, k); toneAt(SX.ding2, t0, bus, k); toneAt(SX.ding3, t0 + 0.01, bus, k);
});
define('coin', (n, w, bus, k) => { const t0 = at(w); toneAt(SX.coin1, t0, bus, k); toneAt(SX.coin2, t0 + 0.07, bus, k); });
define('success', (n, w, bus, k) => {
  const t0 = at(w);
  for (let i = 0; i < 4; i++) toneAt(SX.success, t0 + i * 0.06, bus, k, SUCCESS_NOTES[i]);
  for (let i = 0; i < 3; i++) toneAt(SX.successPad, t0 + 0.18, bus, k, SUCCESS_NOTES[i]);
});
define('fail', (n, w, bus, k) => { const t0 = at(w); toneAt(SX.fail1, t0, bus, k); toneAt(SX.fail2, t0 + 0.17, bus, k); });
define('combo', (n, w, bus, k) => {
  const c = clamp(n || 0, 0, 30), f = 440 * Math.pow(1.06, c), t0 = at(w);
  toneAt(SX.combo, t0, bus, k, f);
  toneAt(SX.comboSpark, t0 + 0.03, bus, k, f * 2);
  toneAt(SX.comboSpark, t0 + 0.06, bus, k * 0.6, f * 3);
});
define('levelUp', (n, w, bus, k) => {
  const t0 = at(w);
  for (let i = 0; i < 5; i++) toneAt(SX.levelUp, t0 + i * 0.07, bus, k, LEVEL_NOTES[i]);
  noiseAt(SX.levelShimmer, t0, bus, k);
  for (let i = 0; i < 3; i++) toneAt(SX.levelPad, t0 + 0.35, bus, k, LEVEL_PAD[i]);
});
define('swipe', (n, w, bus, k) => { noiseAt(SX.swipeNoise, w, bus, k); toneAt(SX.swipeTone, w, bus, k); });
define('bounce', (n, w, bus, k) => { toneAt(SX.bounce1, w, bus, k); toneAt(SX.bounce2, w, bus, k); });
define('click', (n, w, bus, k) => { toneAt(SX.clickTone, w, bus, k); noiseAt(SX.clickNoise, w, bus, k); });
define('charge', (n, w, bus, k) => { toneAt(SX.chargeTone, w, bus, k); noiseAt(SX.chargeNoise, w, bus, k); });
define('release', (n, w, bus, k) => { noiseAt(SX.releaseNoise, w, bus, k); toneAt(SX.releaseTone, w, bus, k); });
define('explode', (n, w, bus, k) => {
  const t0 = at(w);
  noiseAt(SX.explodeNoise, t0, bus, k); toneAt(SX.explodeSub, t0, bus, k); noiseAt(SX.explodeCrack, t0, bus, k);
});
define('sparkle', (n, w, bus, k) => {
  const t0 = at(w);
  for (let i = 0; i < 5; i++) toneAt(SX.sparkle, t0 + i * 0.04, bus, k, 2000 + Math.random() * 3200);
});
define('tick', (n, w, bus, k) => { toneAt(SX.tickTone, w, bus, k); noiseAt(SX.tickNoise, w, bus, k); });
define('warning', (n, w, bus, k) => { const t0 = at(w); toneAt(SX.warning, t0, bus, k); toneAt(SX.warning, t0 + 0.13, bus, k); });

// ---------------------------------------------------------------- music sequencer
const themes = {};
let seq = null, pendingTheme = null, intensity = TUNE.defaultIntensity;

function defineTheme(name, def) {
  def = def || EMPTY;
  themes[name] = { bpm: def.bpm || 110, bars: def.bars || 4, swing: def.swing || 0, layers: def.layers || [] };
  return themes[name];
}

function startTheme(name) {
  name = name || 'main';
  if (!ctx) { pendingTheme = name; return; }
  pendingTheme = null;
  const def = themes[name];
  if (!def) return;
  if (seq && seq.name === name) return;
  if (seq) stopTheme();
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + TUNE.themeFadeIn);
  g.connect(musicBus);
  const layers = [];
  for (let i = 0; i < def.layers.length; i++) {
    const L = def.layers[i], lg = ctx.createGain();
    lg.gain.value = 0; lg.connect(g);
    layers.push({ def: L, gain: lg, min: L.min || 0, vol: L.vol !== undefined ? L.vol : 1, target: -1, offAt: 0 });
  }
  seq = { name: name, def: def, gain: g, layers: layers, step: 0, bar: 0, count: 0, stepDur: 60 / def.bpm / 4, next: now + TUNE.seqStartDelay, timer: 0 };
  music.bpm = def.bpm; music.theme = name; music.playing = true; music.step = 0; music.bar = 0;
  applyIntensity();
  tick();
}

function stopTheme() {
  if (!seq) return;
  const s = seq; seq = null;
  music.playing = false; music.theme = null;
  clearTimeout(s.timer);
  ramp(s.gain.gain, 0, TUNE.musicFade);
  setTimeout(() => { s.gain.disconnect(); for (let i = 0; i < s.layers.length; i++) s.layers[i].gain.disconnect(); }, (TUNE.musicFade + 0.3) * 1000);
}

function applyIntensity() {
  if (!seq) return;
  const now = ctx.currentTime;
  for (let i = 0; i < seq.layers.length; i++) {
    const L = seq.layers[i];
    const target = (L.min <= 0 || intensity >= L.min - 1e-6) ? 1 : 0;
    if (target === L.target) continue;
    L.target = target; if (target === 0) L.offAt = now;
    L.gain.gain.cancelScheduledValues(now);
    L.gain.gain.setTargetAtTime(target, now, TUNE.layerFade);
  }
}

function tick() {
  const s = seq;
  if (!s) return;
  const now = ctx.currentTime;
  if (s.next < now - TUNE.resyncBehind) s.next = now + TUNE.seqResyncDelay;
  while (s.next < now + TUNE.lookahead) {
    scheduleStep(s, s.next);
    s.next += s.stepDur;
    s.step++; s.count++;
    if (s.step >= 16) { s.step = 0; s.bar++; if (s.bar >= s.def.bars) s.bar = 0; }
  }
  music.step = s.step; music.bar = s.bar;
  s.timer = setTimeout(tick, TUNE.tickMs);
}

function scheduleStep(s, t) {
  if (!enabled || !musicOn) return;
  if (s.def.swing && (s.step & 1)) t += s.def.swing * s.stepDur;
  for (let i = 0; i < s.layers.length; i++) {
    const L = s.layers[i];
    if (L.target <= 0 && t > L.offAt + TUNE.layerFade * 4) continue;
    const ev = L.def.pattern(s.step, s.bar, s.count, intensity);
    if (ev) playEvent(ev, t, L.vol, L.gain);
  }
}

function playEvent(ev, t, scale, bus) {
  if (Array.isArray(ev)) { for (let i = 0; i < ev.length; i++) playEvent(ev[i], t, scale, bus); return; }
  if (typeof ev === 'number') { pluckAt(EMPTY, t, bus, scale, ev); return; }
  if (typeof ev === 'string') {
    if (ev === 'kick') kickAt(EMPTY, t, bus, scale);
    else if (ev === 'snare') snareAt(EMPTY, t, bus, scale);
    else if (ev === 'hat') hatAt(EMPTY, t, bus, scale);
    else if (ev === 'hatOpen') hatAt(OPEN, t, bus, scale);
    else if (RAW[ev]) RAW[ev](undefined, t, bus, scale);
    return;
  }
  if (ev.at) t += ev.at;
  switch (ev.t) {
    case 'pluck': pluckAt(ev, t, bus, scale); break;
    case 'pad': toneAt(ev, t, bus, scale, undefined, PAD_DEF); break;
    case 'tone': toneAt(ev, t, bus, scale); break;
    case 'noise': noiseAt(ev, t, bus, scale); break;
    case 'kick': kickAt(ev, t, bus, scale); break;
    case 'snare': snareAt(ev, t, bus, scale); break;
    case 'hat': hatAt(ev, t, bus, scale); break;
    default: if (ev.f) pluckAt(ev, t, bus, scale);
  }
}

const music = {
  bpm: 112, theme: null, playing: false, step: 0, bar: 0, intensity: TUNE.defaultIntensity, themes: themes,
  start(theme) { startTheme(theme); },
  stop() { pendingTheme = null; stopTheme(); },
  setIntensity(v) { intensity = clamp(Number(v) || 0, 0, 1); music.intensity = intensity; applyIntensity(); },
  defineTheme: defineTheme,
};

// ---------------------------------------------------------------- default themes (event tables are built once; patterns only index them)
function padBar(names, o) {
  const out = [];
  for (let i = 0; i < names.length; i++) out.push({ t: 'pad', f: note(names[i]), dur: o.dur, vol: o.vol, attack: o.attack, release: o.release, lp: o.lp, type: o.type, spread: o.spread });
  return out;
}
function padTable(chords, o) {
  const bars = [];
  for (let b = 0; b < chords.length; b++) { const row = new Array(16).fill(null); row[0] = padBar(chords[b], o); bars.push(row); }
  return bars;
}
function melodyTable(table, hz, o) {
  const bars = [];
  for (let b = 0; b < table.length; b++) {
    const row = [];
    for (let s = 0; s < 16; s++) {
      const d = table[b][s];
      row.push(d === undefined || d < 0 ? null : { t: 'pluck', f: hz[d], dur: o.dur, vol: o.vol, bright: o.bright, pan: (d - (hz.length - 1) / 2) * o.panSpread });
    }
    bars.push(row);
  }
  return bars;
}
function bassTable(roots, o) {
  const bars = [];
  for (let b = 0; b < roots.length; b++) {
    const row = new Array(16).fill(null), f = note(roots[b]);
    row[0] = { t: 'pluck', f: f, dur: o.dur, vol: o.vol, bright: o.bright };
    row[8] = { t: 'pluck', f: f, dur: o.dur, vol: o.vol * 0.85, bright: o.bright };
    if (b & 1) row[12] = { t: 'pluck', f: f * 1.4983, dur: o.dur * 0.6, vol: o.vol * 0.6, bright: o.bright };
    bars.push(row);
  }
  return bars;
}
function arpTable(chords, o) {
  const bars = [], slots = [2, 6, 10, 14], order = [0, 1, 2, 1];
  for (let b = 0; b < chords.length; b++) {
    const row = new Array(16).fill(null);
    for (let i = 0; i < 4; i++) row[slots[i]] = { t: 'pluck', f: note(chords[b][order[i]]) * 2, dur: o.dur, vol: o.vol, bright: o.bright, pan: o.pan };
    bars.push(row);
  }
  return bars;
}
const D_HAT = { t: 'hat', vol: 0.8 }, D_HAT_SOFT = { t: 'hat', vol: 0.4 }, D_GHOST = { t: 'hat', vol: 0.22 }, D_GHOST2 = { t: 'hat', vol: 0.16 };
const D_KICK_HAT = ['kick', D_HAT], D_SNARE = { t: 'snare', vol: 0.75 }, D_OPEN = { t: 'hat', open: true, vol: 0.6 };
const D_SOFT_KICK = { t: 'kick', vol: 0.45 }, D_SOFT_HAT = { t: 'hat', vol: 0.35 };
function beatTable(bars) {
  const out = [];
  for (let b = 0; b < bars; b++) {
    const row = new Array(16).fill(null);
    row[0] = 'kick'; row[2] = D_HAT; row[4] = D_HAT_SOFT; row[6] = D_HAT; row[8] = 'kick'; row[10] = (b & 1) ? D_KICK_HAT : D_HAT; row[12] = D_HAT_SOFT; row[14] = D_HAT;
    out.push(row);
  }
  return out;
}
function fullTable(bars) {
  const out = [];
  for (let b = 0; b < bars; b++) {
    const row = new Array(16).fill(null);
    row[1] = D_GHOST; row[3] = D_GHOST2; row[4] = D_SNARE; row[5] = D_GHOST; row[7] = D_GHOST2; row[9] = D_GHOST; row[11] = D_GHOST2; row[12] = D_SNARE; row[13] = D_GHOST;
    row[15] = (b === bars - 1) ? D_OPEN : D_GHOST2;
    out.push(row);
  }
  return out;
}
function table(rows) { return (step, bar) => rows[bar % rows.length][step]; }

(function buildDefaultThemes() {
  const pent = scale('C5', 'pentatonic', 2);
  // main: I - V - vi - IV in C, 112 bpm, light swing
  const mainChords = [['C4', 'E4', 'G4'], ['B3', 'D4', 'G4'], ['C4', 'E4', 'A4'], ['C4', 'F4', 'A4']];
  const mainBar = 16 * (60 / 112 / 4);
  const mainMelody = [
    [0, -1, 2, -1, 3, -1, -1, 2, -1, 4, -1, 3, -1, -1, 2, -1],
    [-1, -1, 1, -1, 3, -1, 1, -1, 0, -1, -1, -1, -1, 1, -1, 2],
    [4, -1, -1, 3, -1, 2, -1, -1, 5, -1, 4, -1, 3, -1, -1, -1],
    [-1, 2, -1, 0, -1, -1, 1, -1, 0, -1, -1, -1, -1, -1, -1, -1],
  ];
  defineTheme('main', {
    bpm: 112, bars: 4, swing: 0.08,
    layers: [
      { min: 0, pattern: table(padTable(mainChords, { dur: mainBar - 0.1, vol: 0.09, attack: 0.35, release: 0.6, lp: 1100, type: 'triangle', spread: 6 })) },
      { min: 0.15, pattern: table(melodyTable(mainMelody, pent, { dur: 0.55, vol: 0.3, bright: 0.6, panSpread: 0.09 })) },
      { min: 0.3, pattern: table(bassTable(['C3', 'G2', 'A2', 'F2'], { dur: 0.7, vol: 0.5, bright: 0.25 })) },
      { min: 0.5, pattern: table(beatTable(4)) },
      { min: 0.75, pattern: table(fullTable(4)) },
      { min: 0.75, pattern: table(arpTable(mainChords, { dur: 0.3, vol: 0.13, bright: 0.9, pan: 0.45 })) },
    ],
  });
  // menu: vi - IV - I - V, 84 bpm, soft sine pads and a sparse pluck line
  const menuChords = [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']];
  const menuBar = 16 * (60 / 84 / 4);
  const menuMelody = [
    [4, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, 2, -1, -1, -1],
    [-1, -1, 5, -1, -1, -1, -1, -1, 4, -1, -1, -1, -1, -1, -1, -1],
    [3, -1, -1, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1],
  ];
  const menuPerc = [];
  for (let b = 0; b < 4; b++) { const row = new Array(16).fill(null); row[0] = D_SOFT_KICK; row[8] = D_SOFT_HAT; row[12] = D_GHOST; menuPerc.push(row); }
  defineTheme('menu', {
    bpm: 84, bars: 4, swing: 0,
    layers: [
      { min: 0, pattern: table(padTable(menuChords, { dur: menuBar - 0.15, vol: 0.11, attack: 0.7, release: 1.0, lp: 800, type: 'sine', spread: 5 })) },
      { min: 0, pattern: table(melodyTable(menuMelody, pent, { dur: 1.0, vol: 0.22, bright: 0.35, panSpread: 0.08 })) },
      { min: 0.6, pattern: table(menuPerc) },
    ],
  });
})();

// ---------------------------------------------------------------- public surface
export const audio = {
  ctx: null, master: null, enabled: enabled, musicOn: musicOn, held: false,
  unlock: unlock, setEnabled: setEnabled, setMusic: setMusic, volume: volume, hold: hold,
  now() { return ctx ? ctx.currentTime : 0; },
  state() { return ctx ? ctx.state : 'none'; },   // 'none' | 'suspended' | 'running' | 'interrupted' (iOS) | 'closed'
  tone(o) { if (ctx && enabled) toneAt(o || EMPTY, undefined, sfxBus, 1); },
  noise(o) { if (ctx && enabled) noiseAt(o || EMPTY, undefined, sfxBus, 1); },
  pluck(o) { if (ctx && enabled) pluckAt(o || EMPTY, undefined, sfxBus, 1); },
  kick(o) { if (ctx && enabled) kickAt(o || EMPTY, undefined, sfxBus, 1); },
  snare(o) { if (ctx && enabled) snareAt(o || EMPTY, undefined, sfxBus, 1); },
  hat(o) { if (ctx && enabled) hatAt(o || EMPTY, undefined, sfxBus, 1); },
  chord(freqs, o) {
    if (!ctx || !enabled || !freqs) return;
    o = o || EMPTY;
    const t0 = ctx.currentTime + (o.at || 0), strum = (o.strum || 0) / 1000, k = 1 / Math.sqrt(Math.max(1, freqs.length));
    for (let i = 0; i < freqs.length; i++) toneAt(o, t0 + i * strum, sfxBus, k, note(freqs[i]));
  },
  arp(freqs, stepMs, o) {
    if (!ctx || !enabled || !freqs) return;
    o = o || EMPTY;
    const t0 = ctx.currentTime + (o.at || 0), step = (stepMs || 60) / 1000;
    for (let i = 0; i < freqs.length; i++) toneAt(o, t0 + i * step, sfxBus, 1, note(freqs[i]));
  },
  sweep(o) {
    if (!ctx || !enabled) return;
    o = o || EMPTY;
    toneAt(o, undefined, sfxBus, 1, o.f1 !== undefined ? o.f1 : (o.f !== undefined ? o.f : 200), SWEEP_DEF);
  },
  note: note, scale: scale,
  music: music, sfx: sfx, define: define,
};
