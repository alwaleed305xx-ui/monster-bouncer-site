// party.js: the party's music and the game's SFX, all synthesized on top of js/core/audio.js (GAME-SPEC §7).
// A 108 BPM 16th-note step sequencer (setTimeout lookahead on the AudioContext clock; a step that is already late is
// dropped, never played late) loops a 2-bar Dm9 | G13 groove in D Dorian / D minor pentatonic (with a b2 grace note):
// one layer per species (blob drum, tall bass, round keys, square guitar, bean lead) over an always-on base (warm
// filtered pad, room tone, crowd murmur). Odd loops swap in precomputed variants (a bass walk-down, an answer phrase
// for the lead, or a sparse one below energy 0.5, a tom fill on every 4th bar) and every 4th loop opens the hats.
// A layer switched on joins on the next beat that is not scheduled yet (the bar line when that is one beat later) and
// fades up over a bar. 'play' hears the party muffled behind the door (lowpass ~700 Hz opening per admitted layer);
// 'lobby' plays the House Band set with setLobbyBand; solo(species) previews one instrument with the door open.
// Music bus: layers -> mix -> vinyl delay (detune = Doppler pitch drag on the whole mix) -> vinyl lp -> door lp x2 ->
// duck -> sting duck -> swell -> run -> mute -> master; SFX use their own bus; both feed the core master compressor.
// Celebration stingers (tier chords, unlock fanfare, gold) are voiced on D E F G A only, so they agree with either bar
// of the groove wherever they land, and duck the band while they ring; 'lastcall' swells the band instead (by the
// night's tier: stinger('lastcall', 'gold') adds a held gold brass stack + crash + a longer swell, 'rope' is a muted
// ending with no swell and a sparse band), and 'shut'
// (a 3-strike Shut Down) kills it: door slam + power-down under a long vinyl drag and a deep duck; 'rules' (a re-pinned
// rule) scratches the record and rolls a fill into the new poster's landing, the band ducked deep until then.
// Verdict audio: an admit is sfx.door() + voice(); a WRONG admit has its own door, sfx.door(false, landIn) (latch, a
// slower creak, no cheer, no swell, and the crowd's groaning "awww" as the impostor lands landIn s later; or call
// sfx.groan() on that impact frame: deduped) + sfx.snicker(species). A bounce: the swipe's sfx.whoosh, then the launch
// hit (kick + thwack + boing) scheduled on the verdict by sfx.yeet(delay) so it is HEARD on the launch frame (the output
// latency is taken off), or played on that frame by sfx.yeetLaunch(pan) / launch(pan) (silent inside a yeet's window,
// so calling both is safe); sfx.yeetLand(pan) / ping(pan) is the twinkle as it leaves the screen. A wrong bounce gets
// the guest's hurt sfx.aww(species). nice(n, delay) / stamp(delay) take the stamp's punch-in delay so they land with
// the picture. sfx.busted(delay, kind) is the BUSTED payoff of a trap liar bounced right (the tape rips, a brass
// "gotcha"; kind 'shift' = a flipping shapeshifter caught: NICE CATCH). sfx.join(species) is the payoff when a guest joins the band: its instrument's one-shot on the next 8th.
// Each detune leaves ~30 ms of lag on the music bus that drains over ~9 s: beat-synced visuals must read party.clock()
// (which subtracts it), never audio.now() or loop time. Every call no-ops until audio.unlock() has made a context; the
// graph is built cheaply (the full noise buffer, reverb IRs and string buffers render afterwards in idle slices; the
// ambience waits for the noise) by the first party call,
// by party.warm(), or in idle time right after the first pointerdown. Settings rule: the music follows audio.musicOn
// and audio.enabled (setEnabled mirrors its music flag into audio.setMusic, so either path silences it); boot/settings
// code wires profile.onSettings(s => setEnabled(s.sfx, s.music)); the party sfx flag silences only party sounds (never
// the band changes a stinger or door carries) and does not gate the core audio.sfx.* sounds.
// Usage: party.start('play'); party.setLayer('blob', true); party.sfx.join('blob'); party.ladder(combo); party.sfx.door(ok);
//        party.stinger('rules', secondsToPosterLanding); party.detune();
import { audio } from '../core/audio.js';
import { clamp } from '../core/math.js';

const TUNE = {
  bpm: 108,
  lookahead: 0.22,          // schedule this far ahead (s); layer changes are bar-long fades, so the latency costs nothing
  tickMs: 25,               // scheduler timer period (ms)
  startDelay: 0.08,         // first step after start (s)
  late: 0.005,              // a step whose swung time is closer than this to now is dropped instead of starting late (s)
  resyncBehind: 0.05,       // scheduler fell behind more than this: jump whole steps
  swing8: 0.3,              // off-8th delay as a fraction of a 16th
  swing16: 0.07,            // each 8th's second 16th sits at (0.5 + this) of that swung 8th
  musicVol: 0.45,           // music mix level into the master compressor
  sfxVol: 0.85,
  fadeIn: 1.0, fadeOut: 0.7, muteRamp: 0.25,
  pollMs: 200,              // waits this often for audio.unlock() when start() came first
  minGap: 0.035,            // a named sfx cannot retrigger faster than this (s)
  tail: 0.05,               // nodes stop this long after their envelope ends (s)
  warmSlice: 3,             // work units (one string buffer / one IR chunk) per non-idle slice after build
  warmWait: 150,            // idle-callback timeout for those slices (ms)
  irChunk: 8192,            // reverb impulse samples rendered per work unit
  // white noise: a short starter buffer is made at build, the full one renders in idle slices (the ambience waits
  // for it); noise voices start at a random offset inside `span` x the buffer length
  noise: { sec: 2, starter: 0.3, chunk: 24000, span: 0.7 },
  ksCacheMax: 200,
  // a joining layer starts at level x its volume on the next unscheduled beat, or on the bar line when that comes
  // at most barWithin s after that beat; the downbeat test tolerates eps s of float drift
  join: { level: 0.3, barWithin: 0.6, eps: 0.001 },
  // celebration stingers duck the band to `duck` (`deep` for the shut-down trombone) for their length (s)
  sting: { duck: 0.5, deep: 0.28, attackTc: 0.03, releaseTc: 0.4, tier: 1.6, gold: 2.0, fanfare: 1.25, shut: 2.2 },
  groove: { leadBusy: 0.5 },  // odd loops: the lead answers at energy >= this, else it plays the sparse phrase
  layers: { drum: 0.85, bass: 0.9, keys: 0.8, guitar: 0.75, lead: 0.8 },
  pan: { drum: 0, bass: 0, keys: -0.26, guitar: 0.32, lead: 0.1 },
  send: { drum: 0.07, bass: 0, keys: 0.32, guitar: 0.24, lead: 0.34, pad: 0.45 },
  verb: { musicSec: 1.15, musicPow: 2.1, musicRet: 0.44, sfxSec: 0.9, sfxPow: 2.3, sfxRet: 0.32, preDelay: 0.012 },
  pad: { vol: 0.65, cut: 950, q: 0.9, lfoHz: 0.085, lfoDepth: 320, overlap: 0.55, osc: 0.034, sub: 0.06, lateMin: 0.6 },
  room: { vol: 0.02, hp: 140, lp: 1100 },
  // murmur: formant bands [Hz, Q, am Hz, am Hz] over noise, plus drifting voices [Hz, formant Hz, am Hz, glide Hz]
  // whose pitch also wobbles at speech-like rates and whose formant swings (vowels change, so it never sits as a drone)
  crowd: { vol: 0.07, cut: 950, swell: 2.6, fadeIn: 1.2,
    bands: [[330, 5, 2.3, 3.9], [560, 5, 3.1, 1.7], [900, 4, 4.4, 2.6], [1450, 4, 1.9, 5.1]], bandGain: 0.5, bandAm: [0.3, 0.22],
    voices: [[142, 650, 3.3, 0.17], [188, 980, 4.1, 0.23], [236, 1300, 2.7, 0.13]], voiceGain: 0.035, voiceAm: 0.03, voiceQ: 6,
    glide: 60, wobble: [1.3, 1.7, 1.1], wobbleCents: 35, swing: [0.7, 1.05, 0.55], swingDepth: 0.25 },
  door: { play: 700, lobby: 2200, open: 18000, energyOpen: 0.75, smooth: 0.45, swellHz: 5200, swellSec: 0.9 },
  duck: { deep: 0.38, soft: 0.68, pad: 0.8, padSoft: 0.92, attackTc: 0.008, hold: 0.06, releaseTc: 0.11, padRelease: 1.6 },
  // drag: pitch path in cents (dip, settle, hold, glide home) realised as a growing delay on the music bus; the extra
  // lag (~32 ms per default detune) then drains at +returnCents (~9 s, inaudible) and is reset whenever the music
  // restarts; the hold is clamped to [minHold, maxHold] s
  detune: { ms: 1200, cents: -40, dip: -62, inSec: 0.1, settle: 0.14, outSec: 0.35, lp: 650, lpIn: 0.14, wow: 9, wowHz: 4.2, duck: 0.72,
    base: 0.003, maxLag: 1.2, returnCents: 6, slices: 8, minHold: 0.3, maxHold: 4 },
  energy: { swell: 0.12, shaker: 0.5, crowd: 1.8 },
  lastcallSwellSec: 2.4,
  // LAST CALL by the night's tier (party.stinger('lastcall', tier)): gold = the full ending plus a held gold brass stack
  // at goldAt s with timpani, crash, shimmer + sparkles, a longer swell (swell s) and a bigger cheer [s, level]; silver /
  // bronze = the ending as it was; rope (a failed night) = no swell, the band drops to `energy` (a sparse floor), one
  // soft knock, a muted minor 'ta-dum' and polite applause [s, level]
  lastcall: { gold: { at: 0.82, swell: 3.4, cheer: [2.3, 1.15], sparks: 14 }, rope: { energy: 0.3, cheer: [0.8, 0.3], vol: 0.55 } },
  // a trap liar bounced right / a flipping shapeshifter caught (sfx.busted(delay, kind)): the tape rips (rip s, 'fake'
  // only) as the prop pops off, then a two-note brass "gotcha" (notes at hits s) with a ting on top; all inside ~0.4 s
  busted: { rip: 0.2, hits: [0.05, 0.13], dur: [0.07, 0.24], vol: 0.95 },
  shutDetuneMs: 2600,       // 'shut' stinger: the vinyl drag hold on a 3-strike Shut Down (ms)
  instr: { bassGate: 0.92, keys: 0.17, keysStrum: 0.004, gtrVol: 1.15, gtrDur: 0.32, gtrBright: 0.62,
    leadVol: 1.3, leadTail: 0.35, leadBright: 0.8, sparkMax: 0.3, sparkTail: 0.1 },
  sfx: { dingPluck: 0.15, dingDur: 0.5, dingBright: 0.85, strumVol: 0.12, strumDur: 0.9, strumBright: 0.75,
    tierVol: 0.24, tierDur: 1.1, tierBright: 0.82, voicePeak: 0.32, syl1: 0.085, sylGap: 0.035, syl2: 0.13,
    rollGap: 0.085, rollMin: 0.035, rollAccel: 0.93, rollHits: 18 },
  // yeet: the launch hit (kick + thwack + boing) is HEARD on the launch frame: sfx.yeet(delay) schedules it `delay` s
  // after the verdict (play.js TUNE.yeet.launch x speed; default `launch`), pulled earlier by the audio output latency
  // minus `frame` (the launch frame needs about one frame to reach the screen); a launch() / yeetLaunch() within
  // `dedupe` s of a hit yeet() already scheduled is the same hit and stays silent
  yeet: { launch: 0.09, dedupe: 0.2, frame: 0.016 },
  // sneaky door (a wrong admit): no cheer, no band swell, a slower creak, then the crowd inside groans `groanAt` s after
  // the verdict (play's admit flyDelay + hop: the impostor lands in the doorway) for `groan` s; snicker: syllables `n`,
  // gap s, pitch fall
  sneak: { creak: 0.8, groanAt: 0.42, groanLag: 0.05, groan: 1.0, dedupe: 0.3, snickerN: 3, snickerGap: 0.085, snickerFall: 0.06, snickerVol: 0.85 },
  // the wrong bounce's hurt "a-aww" in the species' voice: a short syllable, a gap, then a long falling one with a sob
  // vibrato; c1 / c2 = pitch contours (x the voice's f), vowel a -> o, level x the voice
  aww: { syl1: 0.1, gap: 0.035, syl2: 0.36, c1: [1.0, 0.93], c2: [0.9, 0.62], vib: 6.5, vibD: 28, vol: 0.85 },
  // join one-shot: lands on the next 8th of the party clock at least `ahead` s away; level per instrument (its own key:
  // a second `join` here would silently replace the layer-fade `join` above and turn every layer join into NaN)
  joinSfx: { ahead: 0.03, drum: 0.42, bass: 0.95, keys: 0.8, guitar: 0.9, lead: 1.1, sparkle: 0.6 },
  // 'rules' stinger: the record scratch, then a 16th-note snare / tom fill (at most fillMax hits, from fillFrom s) into
  // the new poster's landing `land` s after the call (default; play passes its own), the band ducked deep until then
  rules: { land: 1.3, fillFrom: 0.3, fillMax: 8, minLand: 0.5, maxLand: 3 },
};

const STEP = 60 / TUNE.bpm / 4, BAR = STEP * 16, LOOP = 32;
const INSTR = ['drum', 'bass', 'keys', 'guitar', 'lead'];
const SPECIES = ['blob', 'tall', 'round', 'square', 'bean'];
const TO_INSTR = { blob: 'drum', tall: 'bass', round: 'keys', square: 'guitar', bean: 'lead', drum: 'drum', bass: 'bass', keys: 'keys', guitar: 'guitar', lead: 'lead' };
const N = audio.note;
const I = TUNE.instr, S = TUNE.sfx;
// swung offset (in 16ths) of each 16th inside a beat: the off-8th is late by swing8, and each 8th's second 16th is
// swung proportionally inside its own (unequal) 8th, so the beat lands at 0, 1.31, 2.3, 3.27
const SWING = (function () {
  const s8 = TUNE.swing8, q = 0.5 + TUNE.swing16;
  return [0, (2 + s8) * q - 1, s8, 2 + s8 + (2 - s8) * q - 3];
})();
const WOW_AMP = (Math.pow(2, TUNE.detune.wow / 1200) - 1) / (2 * Math.PI * TUNE.detune.wowHz);   // delay swing (s) for the wow depth

// ---------------------------------------------------------------- state
let ctx = null, noiseBuf = null, noiseSpan = 0, noiseJob = null, noiseAt = 0;
let mix = null, vdel = null, vinyl = null, doorA = null, doorB = null, duckG = null, stingG = null, swellG = null, runG = null, muteG = null;
let musicVerb = null, padIn = null, padLP = null, padDuck = null, padOut = null, keysDuck = null;
let wowG = null, sfxBus = null, sfxWet = null;
let sfxOn = true, audible = false;
let mode = 'play', running = false, energy = 0, solo = null;
let stopTimer = 0, pollTimer = 0, pendingMode = null, swellEnd = 0, lastLadder = 0, yeetHitAt = -9, groanHitAt = -9;
let amb = null, crowdG = null, warmAt = 0, irAt = 0, buildMs = 0;
const L = [];                                    // { name, in, gain, on, onAt, offEnd }
const IRS = [];                                  // reverb impulses still rendering: { node, buf, pow, pre, ch, i, lp }
const playSet = { drum: false, bass: false, keys: false, guitar: false, lead: false };
const lobbySet = { drum: false, bass: false, keys: false, guitar: false, lead: false };
const seq = { timer: 0, next: 0, index: 0, live: false, padBar: -1 };
const drag = { t0: 0, hold: 0 };
// the vinyl delay's own schedule as knots, so its value at any time is known exactly (AudioParam.value can be a
// render quantum stale, or the default right after a cancel)
const KN = { n: 0, t: new Float64Array(TUNE.detune.slices * 3 + 6), v: new Float64Array(TUNE.detune.slices * 3 + 6) };
const CLOCK = { playing: false, bpm: TUNE.bpm, pos: 0, step: 0, bar: 0, loopStep: 0, beat: 0, beatPhase: 0, barPhase: 0 };
const STATE = {
  ready: false, playing: false, mode: 'play', energy: 0, sfx: true, music: true, solo: null, door: 0,
  layers: { drum: false, bass: false, keys: false, guitar: false, lead: false },
  play: { drum: false, bass: false, keys: false, guitar: false, lead: false },
  lobby: { drum: false, bass: false, keys: false, guitar: false, lead: false },
};
const lastFire = {};

// ---------------------------------------------------------------- graph
function ensure() {
  const c = audio.ctx;
  if (!c) return false;
  if (ctx === c) return true;
  ctx = c;
  build();
  return true;
}

function gain(v, dest) { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
function biquad(type, f, q, dest) {
  const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
  if (dest) b.connect(dest);
  return b;
}
function makeNoise(sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function useNoise(b) { noiseBuf = b; noiseSpan = b.duration * TUNE.noise.span; }
// fill the full noise buffer `budget` samples at a time; swaps it in when done
function noiseSlice(budget) {
  const d = noiseJob.getChannelData(0), stop = Math.min(d.length, noiseAt + budget);
  for (let i = noiseAt; i < stop; i++) d[i] = Math.random() * 2 - 1;
  noiseAt = stop;
  if (stop < d.length) return false;
  useNoise(noiseJob); noiseJob = null;
  return true;
}
// stereo room impulse: decaying noise that darkens as it fades, short pre-delay; rendered in chunks by prewarm()
// (the convolver stays silent until its buffer lands); the (1 - x)^pow decay is evaluated per 32-sample block and
// interpolated in between
function irJob(node, sec, pow) {
  const sr = ctx.sampleRate, pre = Math.floor(sr * TUNE.verb.preDelay);
  IRS.push({ node: node, buf: ctx.createBuffer(2, Math.floor(sr * sec), sr), pow: pow, pre: pre, ch: 0, i: pre, lp: 0 });
}
function irSlice(J, budget) {
  const n = J.buf.length, span = n - J.pre;
  while (budget > 0 && J.ch < 2) {
    const d = J.buf.getChannelData(J.ch), stop = Math.min(n, J.i + budget);
    let i = J.i, lp = J.lp;
    while (i < stop) {
      const bEnd = Math.min(stop, i + 32), x0 = (i - J.pre) / span, x1 = (bEnd - J.pre) / span;
      let e = Math.pow(1 - x0, J.pow) * 0.6;
      const de = (Math.pow(Math.max(0, 1 - x1), J.pow) * 0.6 - e) / (bEnd - i), k = 0.18 + 0.7 * (1 - x0);
      for (; i < bEnd; i++) { lp += (Math.random() * 2 - 1 - lp) * k; d[i] = lp * e; e += de; }
    }
    budget -= stop - J.i; J.i = i; J.lp = lp;
    if (i >= n) { J.ch++; J.i = J.pre; J.lp = 0; }
  }
  if (J.ch < 2) return false;
  J.node.buffer = J.buf;
  return true;
}

function knotReset(t, v) { KN.n = 1; KN.t[0] = t; KN.v[0] = v; }
function knotAdd(t, v) { if (KN.n < KN.t.length) { KN.t[KN.n] = t; KN.v[KN.n] = v; KN.n++; } }
function lagAt(t) {
  if (!KN.n) return TUNE.detune.base;
  if (t <= KN.t[0]) return KN.v[0];
  for (let i = 1; i < KN.n; i++) if (t <= KN.t[i]) return KN.v[i - 1] + (KN.v[i] - KN.v[i - 1]) * (t - KN.t[i - 1]) / (KN.t[i] - KN.t[i - 1]);
  return KN.v[KN.n - 1];
}
function wantAudible() { return audio.musicOn !== false && audio.enabled !== false; }
function snapParam(p, v, now) { p.cancelScheduledValues(0); p.setValueAtTime(v, now); }

function build() {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  IRS.length = 0; irAt = 0;
  useNoise(makeNoise(TUNE.noise.starter));
  noiseJob = ctx.createBuffer(1, Math.floor(ctx.sampleRate * TUNE.noise.sec), ctx.sampleRate); noiseAt = 0;
  // music chain: voices -> layer gains -> mix -> vinyl delay -> vinyl lp -> door lp x2 -> duck -> sting -> swell -> run -> mute -> master
  audible = wantAudible();
  muteG = gain(audible ? 1 : 0, audio.master);
  runG = gain(0, muteG);
  swellG = gain(1 + energy * TUNE.energy.swell, runG);
  stingG = gain(1, swellG);
  duckG = gain(1, stingG);
  doorB = biquad('lowpass', TUNE.door.open, 0.5, duckG);
  doorA = biquad('lowpass', TUNE.door.open, 0.62, doorB);
  vinyl = biquad('lowpass', 20000, 0.9, doorA);
  vdel = ctx.createDelay(TUNE.detune.maxLag + 0.25); vdel.delayTime.value = TUNE.detune.base; vdel.connect(vinyl);
  knotReset(ctx.currentTime, TUNE.detune.base);
  mix = gain(TUNE.musicVol, vdel);
  musicVerb = ctx.createConvolver(); irJob(musicVerb, TUNE.verb.musicSec, TUNE.verb.musicPow);
  musicVerb.connect(gain(TUNE.verb.musicRet, mix));
  for (let i = 0; i < INSTR.length; i++) {
    const name = INSTR[i], g = gain(0);
    let tail = g;
    if (name === 'keys') { keysDuck = gain(1); g.connect(keysDuck); tail = keysDuck; }
    if (ctx.createStereoPanner && TUNE.pan[name]) {
      const p = ctx.createStereoPanner(); p.pan.value = TUNE.pan[name];
      tail.connect(p); p.connect(mix);
    } else tail.connect(mix);
    if (TUNE.send[name]) tail.connect(gain(TUNE.send[name], musicVerb));
    L[i] = { name: name, in: g, gain: g, on: false, onAt: 0, offEnd: 0 };
  }
  padOut = gain(TUNE.pad.vol, mix);
  padDuck = gain(1, padOut);
  padLP = biquad('lowpass', TUNE.pad.cut, TUNE.pad.q, padDuck);
  padIn = gain(1, padLP);
  padOut.connect(gain(TUNE.send.pad, musicVerb));
  const lfo = ctx.createOscillator(); lfo.frequency.value = TUNE.pad.lfoHz;
  lfo.connect(gain(TUNE.pad.lfoDepth, padLP.frequency)); lfo.start();
  // wow: a slow wobble on the vinyl delay (gain stays 0 except during a detune); no per-voice pitch wiring at all
  const wow = ctx.createOscillator(); wow.frequency.value = TUNE.detune.wowHz;
  wowG = gain(0, vdel.delayTime); wow.connect(wowG); wow.start();
  // sfx chain: dry voices -> sfxBus; voices that want air -> sfxWet (dry + room)
  sfxBus = gain(sfxOn ? TUNE.sfxVol : 0, audio.master);
  const sfxVerb = ctx.createConvolver(); irJob(sfxVerb, TUNE.verb.sfxSec, TUNE.verb.sfxPow);
  sfxVerb.connect(gain(TUNE.verb.sfxRet, sfxBus));
  sfxWet = gain(1, sfxBus); sfxWet.connect(sfxVerb);
  applyLayers();               // the sequencer is halted, so layer gains and door filters land on their targets: no sweep
  prewarm();
  buildMs = t0 ? performance.now() - t0 : 0;
}

// cancel automation from `now` while keeping the current value (Firefox lacks cancelAndHoldAtTime)
function hold(p, now) {
  if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
  else { const v = p.value; p.cancelScheduledValues(now); p.setValueAtTime(v, now); }
}
function rampTo(p, v, secs) { const now = ctx.currentTime; hold(p, now); p.linearRampToValueAtTime(v, now + secs); }

// ---------------------------------------------------------------- voices (absolute time t, destination node, volume scale k)
// attack -> optional decay toward sustain -> hold -> exponential release, the whole shape fitted inside [t0, t0 + dur]:
// the release never exceeds half the note for decaying (s < 1) shapes, the decay is cut at the release start and
// the release leaves from the level actually reached there; returns the end time (always t0 + dur)
function env(p, t0, peak, a, d, s, dur, r) {
  peak = Math.max(0.0002, peak);
  dur = Math.max(0.012, dur);
  const end = t0 + dur, at = Math.max(0.001, a);
  const room = s < 1 ? dur * 0.5 : Math.max(dur - at, dur * 0.3);
  const rr = Math.min(Math.max(0.01, r), room), rel = end - rr, tA = Math.min(t0 + at, rel);
  let level = peak;
  p.setValueAtTime(0.0001, t0);
  p.linearRampToValueAtTime(peak, tA);
  if (s < 1 && rel > tA) {
    const sus = Math.max(0.0002, peak * s), dc = Math.max(0.005, d);
    if (tA + dc <= rel) { p.exponentialRampToValueAtTime(sus, tA + dc); level = sus; }
    else { level = peak * Math.pow(sus / peak, (rel - tA) / dc); p.exponentialRampToValueAtTime(level, rel); }
  }
  p.setValueAtTime(level, rel);
  p.exponentialRampToValueAtTime(0.0001, end);
  return end;
}
function endVoice() {
  const n = this;
  n.disconnect();
  if (n._g) n._g.disconnect();
  if (n._f) n._f.disconnect();
  if (n._p) n._p.disconnect();
  if (n._v) n._v.disconnect();
  if (n._vg) n._vg.disconnect();
  n._g = n._f = n._p = n._v = n._vg = null;
}
function panTo(g, pan, dest) {
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(dest); return p; }
  g.connect(dest);
  return null;
}
// o: { type, f, r2 (end/start pitch), glide, dur, vol, a, d, s, r, det, lp, lp2, lpT, q, vib (Hz), vib0, vibD (cents), vibT }
function tone(o, t, dest, k, fo, durO, pan) {
  const f = fo !== undefined ? fo : o.f, dur = durO !== undefined ? durO : o.dur;
  const g = ctx.createGain();
  const end = env(g.gain, t, o.vol * k, o.a !== undefined ? o.a : 0.004, o.d || 0.1, o.s !== undefined ? o.s : 1, dur, o.r !== undefined ? o.r : dur * 0.6);
  const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(f, t);
  if (o.r2) osc.frequency.exponentialRampToValueAtTime(Math.max(15, f * o.r2), t + (o.glide || dur));
  if (o.det) osc.detune.setValueAtTime(o.det, t);
  let flt = null;
  if (o.lp) {
    flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = o.q || 0.7;
    flt.frequency.setValueAtTime(o.lp, t);
    if (o.lp2) flt.frequency.exponentialRampToValueAtTime(o.lp2, t + (o.lpT || dur));
    osc.connect(flt); flt.connect(g);
  } else osc.connect(g);
  osc._p = panTo(g, pan, dest);
  osc._v = null; osc._vg = null;
  if (o.vib) {
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = o.vib;
    vg.gain.setValueAtTime(o.vib0 || 0, t); vg.gain.linearRampToValueAtTime(o.vibD, t + (o.vibT || dur * 0.6));
    vib.connect(vg); vg.connect(osc.detune); vib.start(t); vib.stop(end + TUNE.tail);
    osc._v = vib; osc._vg = vg;
  }
  osc._g = g; osc._f = flt;
  osc.onended = endVoice;
  osc.start(t); osc.stop(end + TUNE.tail);
  return end;
}
// o: { dur, vol, a, d, s, r, hp|bp (+hp2|bp2), q, lp (+lp2), fT }; fo overrides the hp/bp frequency (sweeps keep their ratio)
function noise(o, t, dest, k, durO, pan, fo) {
  const dur = durO !== undefined ? durO : o.dur, a = o.a !== undefined ? o.a : 0.002;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const g = ctx.createGain();
  const end = env(g.gain, t, o.vol * k, a, o.d || 0.05, o.s !== undefined ? o.s : 1, dur, o.r !== undefined ? o.r : Math.max(0.01, dur - a));
  const fT = t + (o.fT || dur);
  let head = src, f1 = null, f2 = null;
  const f1f = o.bp || o.hp;
  if (f1f) {
    const ff = fo !== undefined ? fo : f1f, f12 = o.bp2 || o.hp2;
    f1 = ctx.createBiquadFilter(); f1.type = o.bp ? 'bandpass' : 'highpass'; f1.Q.value = o.q || 0.8;
    f1.frequency.setValueAtTime(ff, t);
    if (f12) f1.frequency.exponentialRampToValueAtTime(f12 * ff / f1f, fT);
    head.connect(f1); head = f1;
  }
  if (o.lp) {
    f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.Q.value = 0.7;
    f2.frequency.setValueAtTime(o.lp, t);
    if (o.lp2) f2.frequency.exponentialRampToValueAtTime(o.lp2, fT);
    head.connect(f2); head = f2;
  }
  head.connect(g);
  src._p = panTo(g, pan, dest);
  src._g = g; src._f = f1; src._v = f2; src._vg = null;
  src.onended = endVoice;
  src.start(t, Math.random() * noiseSpan);
  src.stop(end + TUNE.tail);
  return end;
}
// Karplus-Strong string rendered once per (pitch, length, brightness) into a cached buffer (same scheme as audio.js)
const ksCache = new Map();
function ks(f, dur, bright) {
  const key = (Math.round(f * 10) * 512 + Math.round(dur * 100)) * 16 + Math.round(bright * 15);
  let b = ksCache.get(key);
  if (b) return b;
  if (ksCache.size > TUNE.ksCacheMax) ksCache.clear();
  const sr = ctx.sampleRate, P = sr / f - 0.5, Nn = Math.max(2, Math.floor(P)), fr = clamp(P - Nn, 0, 1);
  const seed = Nn + 2, len = Math.max(seed + 1, Math.floor(dur * sr));
  b = ctx.createBuffer(1, len, sr);
  const d = b.getChannelData(0), kk = 0.12 + bright * 0.88;
  let lpv = 0;
  for (let i = 0; i < seed; i++) { lpv += (Math.random() * 2 - 1 - lpv) * kk; d[i] = lpv; }
  const decay = Math.pow(0.001, 1 / (dur * f)), a = decay * 0.5 * (1 - fr), c = decay * 0.5 * fr;
  for (let i = seed; i < len; i++) d[i] = a * (d[i - Nn] + d[i - Nn - 1]) + c * (d[i - Nn - 1] + d[i - Nn - 2]);
  const fadeN = Math.min(len, Math.floor(sr * 0.02));
  for (let j = 0; j < fadeN; j++) d[len - 1 - j] *= j / fadeN;
  let peak = 0;
  for (let i = 0; i < len; i++) { const q = d[i] < 0 ? -d[i] : d[i]; if (q > peak) peak = q; }
  if (peak > 0) { const s = 0.9 / peak; for (let i = 0; i < len; i++) d[i] *= s; }
  ksCache.set(key, b);
  return b;
}
// holder (an event object) caches its buffer so the hot path never builds a key
function pluck(t, dest, f, dur, vol, bright, holder, pan) {
  let buf = holder ? holder.buf : null;
  if (!buf || buf.sampleRate !== ctx.sampleRate) { buf = ks(f, dur, bright); if (holder) holder.buf = buf; }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + 0.002);
  src.connect(g);
  src._p = panTo(g, pan, dest);
  src._g = g; src._f = null; src._v = null; src._vg = null;
  src.onended = endVoice;
  src.start(t);
  return t + dur;
}
// electric-piano-ish note: sine carrier with a 1:1 FM modulator whose index decays (bell bark -> soft body)
function epNote(t, dest, f, dur, vol) {
  const g = ctx.createGain();
  const end = env(g.gain, t, vol, 0.006, 0.35, 0.45, dur, 0.18);
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
  car.frequency.setValueAtTime(f, t); mod.frequency.setValueAtTime(f, t);
  mg.gain.setValueAtTime(f * 1.3, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.35);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest);
  car._g = g; car._f = null; car._p = null; car._v = mod; car._vg = mg;
  car.onended = endVoice;
  mod.start(t); car.start(t); mod.stop(end + TUNE.tail); car.stop(end + TUNE.tail);
}
// generic cleanup for one-off sfx graphs
function endList() { const n = this._n; this.disconnect(); if (n) for (let i = 0; i < n.length; i++) n[i].disconnect(); this._n = null; }
function own(src, nodes) { src._n = nodes; src.onended = endList; }

// ---------------------------------------------------------------- presets (built once)
const P = {
  kick: { type: 'sine', f: 150, r2: 0.28, glide: 0.1, dur: 0.32, vol: 0.75, a: 0.002, r: 0.26 },
  kickClick: { hp: 2200, dur: 0.018, vol: 0.16, a: 0.001 },
  snareN: { hp: 900, lp: 8500, dur: 0.17, vol: 0.38, a: 0.001 },
  snareT: { type: 'triangle', f: 210, r2: 0.7, glide: 0.08, dur: 0.1, vol: 0.3, a: 0.001, r: 0.08 },
  clap: { bp: 1300, q: 0.9, dur: 0.014, vol: 0.26, a: 0.001, r: 0.012 },
  clapTail: { bp: 1150, q: 0.8, dur: 0.15, vol: 0.2, a: 0.002 },
  hat: { hp: 8200, dur: 0.045, vol: 0.2, a: 0.001 },
  hatOpen: { hp: 7200, dur: 0.26, vol: 0.15, a: 0.001 },
  shaker: { hp: 5200, lp: 11000, dur: 0.06, vol: 0.09, a: 0.018, r: 0.04 },
  bassSine: { type: 'sine', vol: 0.17, a: 0.004, d: 0.14, s: 0.72, r: 0.06 },
  bassTri: { type: 'triangle', vol: 0.16, a: 0.004, d: 0.1, s: 0.6, r: 0.05, lp: 1400, lp2: 780, lpT: 0.16, q: 2 },
  // an octave-up square partial (2f, 6f, 10f...) so the line still reads on phone speakers that drop the fundamental
  bassBite: { type: 'square', vol: 0.055, a: 0.004, d: 0.12, s: 0.55, r: 0.05, lp: 1700, lp2: 820, lpT: 0.14, q: 0.8 },
  tom: { type: 'sine', r2: 0.62, glide: 0.14, dur: 0.24, vol: 0.5, a: 0.002, r: 0.2 },
  tomN: { lp: 2600, dur: 0.03, vol: 0.14, a: 0.001 },
  leadSpark: { type: 'sine', vol: 0.1, a: 0.003, d: 0.08, s: 0.3, r: 0.1 },
  padA: { type: 'sawtooth', vol: 1, a: 0.7, r: 0.9, det: -7 },
  padB: { type: 'sawtooth', vol: 1, a: 0.7, r: 0.9, det: 7 },
  padSub: { type: 'sine', vol: 1, a: 0.6, r: 0.9 },
  // sfx
  ding: { type: 'sine', dur: 0.6, vol: 0.2, a: 0.002, r: 0.55 },
  ding2: { type: 'sine', dur: 0.32, vol: 0.07, a: 0.002, r: 0.3 },
  ding3: { type: 'sine', dur: 0.16, vol: 0.03, a: 0.002, r: 0.15 },
  chordPad: { type: 'triangle', dur: 1.0, vol: 0.05, a: 0.02, r: 0.75, lp: 2600 },
  ting: { type: 'sine', dur: 0.16, vol: 0.06, a: 0.002, r: 0.14 },
  air: { hp: 7500, dur: 0.12, vol: 0.04, a: 0.01 },
  latchN: { hp: 2800, dur: 0.014, vol: 0.28, a: 0.001 },
  latchT: { type: 'square', f: 1750, dur: 0.02, vol: 0.04, a: 0.001, r: 0.015 },
  latchRing: { type: 'sine', f: 920, r2: 0.96, dur: 0.08, vol: 0.07, a: 0.001, r: 0.07 },
  knock: { bp: 320, q: 1.4, dur: 0.06, vol: 0.4, a: 0.001 },
  boing: { type: 'sine', f: 175, r2: 1.75, glide: 0.3, dur: 0.36, vol: 0.28, a: 0.004, r: 0.2, vib: 15, vib0: 160, vibD: 10, vibT: 0.34 },
  boingTri: { type: 'triangle', f: 350, r2: 1.75, glide: 0.3, dur: 0.24, vol: 0.06, a: 0.004, r: 0.15, vib: 15, vib0: 160, vibD: 10, vibT: 0.24 },
  buzzA: { type: 'square', f: 98, r2: 0.93, dur: 0.38, vol: 0.11, a: 0.02, r: 0.2, lp: 520, q: 1.1 },
  buzzB: { type: 'sawtooth', f: 98.7, r2: 0.93, dur: 0.38, vol: 0.1, a: 0.02, r: 0.2, lp: 480, q: 1.1 },
  buzzSub: { type: 'sine', f: 196, r2: 0.9, dur: 0.3, vol: 0.075, a: 0.015, r: 0.2 },
  crashN: { hp: 1800, lp: 9500, lp2: 3500, dur: 0.38, vol: 0.3, a: 0.001, r: 0.36 },
  crashRing: { bp: 4600, q: 2.2, dur: 0.55, vol: 0.18, a: 0.002, r: 0.5 },
  crashThunk: { type: 'sine', f: 165, r2: 0.4, glide: 0.12, dur: 0.16, vol: 0.3, a: 0.002, r: 0.13 },
  tinkle: { type: 'sine', dur: 0.14, vol: 0.09, a: 0.001, r: 0.13 },
  // glass shards after the lamp crash: n tinkles at `at` + random^curve x spread s, random Hz / length / level / pan
  shards: { n: 12, at: 0.03, spread: 0.65, curve: 1.6, f: [2600, 4400], dur: [0.06, 0.12], k: [0.5, 0.6], pan: 1.3 },
  warble: { type: 'sine', f: 480, r2: 2.9, glide: 0.36, dur: 0.36, vol: 0.17, a: 0.03, r: 0.08, vib: 17, vib0: 20, vibD: 110, vibT: 0.32 },
  warble5: { type: 'triangle', f: 720, r2: 2.9, glide: 0.36, dur: 0.36, vol: 0.05, a: 0.04, r: 0.08, vib: 17, vib0: 20, vibD: 110, vibT: 0.32 },
  popT: { type: 'sine', f: 420, r2: 2.6, glide: 0.05, dur: 0.08, vol: 0.34, a: 0.002, r: 0.05 },
  popN: { hp: 3000, dur: 0.022, vol: 0.12, a: 0.001 },
  sparkle: { type: 'sine', dur: 0.12, vol: 0.06, a: 0.002, r: 0.1 },
  slap: { bp: 1400, q: 0.9, dur: 0.05, vol: 0.5, a: 0.001 },
  rustle: { hp: 3200, dur: 0.14, vol: 0.07, a: 0.008 },
  slapThud: { type: 'sine', f: 140, r2: 0.45, glide: 0.1, dur: 0.14, vol: 0.42, a: 0.002, r: 0.12 },
  slapLow: { lp: 260, dur: 0.09, vol: 0.28, a: 0.002 },
  rubber: { type: 'sine', f: 205, r2: 0.36, glide: 0.08, dur: 0.14, vol: 0.4, a: 0.002, r: 0.11 },
  rubberTri: { type: 'triangle', f: 95, dur: 0.1, vol: 0.18, a: 0.002, r: 0.08 },
  squish: { bp: 520, q: 1.6, dur: 0.05, vol: 0.24, a: 0.002 },
  swipe: { bp: 600, bp2: 3200, q: 0.9, dur: 0.2, vol: 1.9, a: 0.045, r: 0.13 },
  clickHi: { type: 'square', f: 2300, dur: 0.008, vol: 0.06, a: 0.001, r: 0.006 },
  clickBody: { type: 'sine', f: 330, r2: 0.55, glide: 0.025, dur: 0.03, vol: 0.24, a: 0.001, r: 0.025 },
  clickN: { hp: 4200, dur: 0.008, vol: 0.06, a: 0.001 },
  brassA: { type: 'sawtooth', vol: 0.07, a: 0.025, d: 0.2, s: 0.75, r: 0.14, lp: 520, lp2: 2600, lpT: 0.07, q: 1.2, det: -8 },
  brassB: { type: 'sawtooth', vol: 0.07, a: 0.025, d: 0.2, s: 0.75, r: 0.14, lp: 520, lp2: 2600, lpT: 0.07, q: 1.2, det: 8 },
  brassV: { type: 'sawtooth', vol: 0.07, a: 0.03, d: 0.25, s: 0.8, r: 0.3, lp: 520, lp2: 2400, lpT: 0.09, q: 1.2, vib: 5.5, vib0: 0, vibD: 16, vibT: 0.5 },
  timp: { type: 'sine', f: 98, r2: 0.72, glide: 0.5, dur: 0.75, vol: 0.32, a: 0.003, r: 0.7 },
  timpLow: { type: 'sine', f: N('D2'), r2: 0.72, glide: 0.5, dur: 0.75, vol: 0.32, a: 0.003, r: 0.7 },
  // custom graphs (creak / cheer / rip / yawn): pitch knots [Hz] at fractions fAt of the length, formant bands
  // [Hz, Q, level], envelope a / r as fractions of the length
  creak: { f: [34, 54, 27, 40], fAt: [0.35, 0.8], jitHz: 11, jit: 6, vol: 1.6, a: 0.05, r: 0.4,
    bands: [[560, 11, 1], [1320, 9, 0.6], [2500, 7, 0.35]], sweep: [540, 640] },
  cheer: { vol: 0.5, a: 0.35, r: 0.6, lp: 3200, bands: [[850, 2.5], [1350, 3]], voices: 3, f: 210, fStep: 47,
    rise: 1.22, riseAt: 0.6, settle: 1.05, voiceVol: 0.05, fmt: 780, fmtStep: 160, fmtQ: 4 },
  // the crowd's "awww" (a wrong admit lands): darker breath + voices that lift a hair (lift at liftAt) and then sag to
  // `fall` x their pitch, their formants closing from an open "a" (fmt) to a round "o" (fmt2); a slow shared wobble
  groan: { vol: 0.42, a: 0.16, r: 0.5, lp: 1500, bands: [[480, 3], [820, 3.5]], voices: 4, f: 205, fStep: 31,
    lift: 1.04, liftAt: 0.18, fall: 0.66, voiceVol: 0.06, fmt: 760, fmt2: 430, fmtStep: 95, fmtQ: 4.5, wob: 4.6, wobD: 22 },
  rip: { dur: 0.38, bp: 2300, bpQ: 0.8, hp: 900, am: 0.55, depth: 0.45, chop: [32, 140], chopAt: 0.8, vol: 0.5, a: 0.25, r: 0.05 },
  yawn: { dur: 0.95, f: [300, 330, 165], riseAt: 0.2, vibHz: 5, vibD: 30, vol: 0.75, a: 0.16, r: 0.38, fmtAt: 0.15,
    f1: [820, 420], q1: 6, f2: [1250, 780], q2: 8, f2Vol: 0.5, rustle: 0.6, rustleLen: 0.8 },
  cymbal: { hp: 5200, dur: 1.1, vol: 0.13, a: 0.002, r: 1.05 },
  cymSwell: { hp: 4800, dur: 0.62, vol: 0.12, a: 0.42, r: 0.04 },
  boom: { type: 'sine', f: 92, r2: 0.38, glide: 0.35, dur: 0.45, vol: 0.62, a: 0.002, r: 0.4 },
  boomN: { lp: 420, lp2: 120, dur: 0.3, vol: 0.38, a: 0.002 },
  shimmer: { hp: 7000, dur: 1.4, vol: 0.05, a: 0.3, r: 1.0 },
  trombone: { type: 'sawtooth', vol: 0.22, a: 0.03, d: 0.1, s: 0.8, r: 0.08, lp: 480, lp2: 1300, lpT: 0.12, q: 2.5 },
  tromboneV: { type: 'sawtooth', vol: 0.22, a: 0.03, d: 0.1, s: 0.8, r: 0.4, lp: 480, lp2: 1100, lpT: 0.2, q: 2.5, vib: 6, vib0: 0, vibD: 40, vibT: 0.4 },
  vinylSaw: { type: 'sawtooth', f: 260, r2: 0.13, glide: 0.55, dur: 0.6, vol: 0.12, a: 0.01, r: 0.3, lp: 1800, lp2: 180, lpT: 0.55 },
  scratch: { bp: 900, bp2: 300, q: 1.2, dur: 0.14, vol: 0.2, a: 0.004 },
  // the yeet's off-screen twinkle: a bright sine blip that chirps up a fourth + a glassy octave on top
  ping: { type: 'sine', f: 2637, r2: 1.335, glide: 0.04, dur: 0.24, vol: 0.12, a: 0.002, r: 0.22 },
  pingHi: { type: 'triangle', f: 5274, dur: 0.1, vol: 0.035, a: 0.001, r: 0.09 },
  // shut down: the whole room powers down (a sagging lowpassed saw under the vinyl stop)
  powerDown: { type: 'sawtooth', f: 196, r2: 0.25, glide: 1.1, dur: 1.2, vol: 0.1, a: 0.01, r: 0.6, lp: 1100, lp2: 120, lpT: 1.1, q: 1.4 },
  // the yeet launch: a punchy body kick + a slap transient (the boing presets ride on top)
  launchKick: { type: 'sine', f: 165, r2: 0.28, glide: 0.08, dur: 0.24, vol: 0.55, a: 0.001, r: 0.2 },
  launchSlap: { bp: 1900, q: 0.8, dur: 0.035, vol: 0.42, a: 0.001 },
  // the snicker: per syllable an "h" breath + a short voiced "eh"
  snickH: { hp: 1400, lp: 5200, dur: 0.035, vol: 0.12, a: 0.003 },
  // the record scratch: forward + back gestures (band-passed noise sweeps over a gliding saw "needle" tone)
  scratchFwd: { bp: 650, bp2: 2700, q: 2.4, dur: 0.11, vol: 0.55, a: 0.004, r: 0.05 },
  scratchBack: { bp: 2500, bp2: 480, q: 2.4, dur: 0.14, vol: 0.5, a: 0.004, r: 0.06 },
  needleFwd: { type: 'sawtooth', f: 170, r2: 2.7, glide: 0.11, dur: 0.11, vol: 0.08, a: 0.004, r: 0.05, lp: 2600 },
  needleBack: { type: 'sawtooth', f: 460, r2: 0.3, glide: 0.14, dur: 0.14, vol: 0.075, a: 0.004, r: 0.06, lp: 2200 },
};

// ---------------------------------------------------------------- the groove (event tables built once)
const K_KICK = 1, K_SNARE = 2, K_HAT = 3, K_OHAT = 4, K_SHAKER = 5, K_BASS = 6, K_KEYS = 7, K_GTR = 8, K_LEAD = 9, K_GHOST = 10, K_TOM = 11;
function ev(k, f, len, v) { return { k: k, f: f, len: len, v: v, fs: null, buf: null }; }
function track() { const t = new Array(LOOP); for (let i = 0; i < LOOP; i++) t[i] = null; return t; }
function put(tr, step, e) { if (!tr[step]) tr[step] = []; tr[step].push(e); }
// TRACKS = the main loop per layer; the variants are swapped in by trackFor() on odd / every 4th loop
const TRACKS = [track(), track(), track(), track(), track()];
const DRUM_OPEN = track(), DRUM_FILL = track(), BASS_B = track(), LEAD_B = track(), LEAD_SPARSE = track();
const PAD = [['D3', 'A3', 'C4', 'F4'], ['G2', 'F3', 'B3', 'E4']];
const PAD_HZ = [];
// drum (blob): kick 1/3, snare+clap 2/4, swung 8th hats, 16th shaker when the energy is up, open-hat pickup;
// kind 1 opens two more hats and adds a syncopated kick, kind 2 ends bar 2 with ghost snares and a falling tom run
function drumTrack(tr, kind) {
  for (let b = 0; b < 2; b++) {
    const o = b * 16, fill = kind === 2 && b === 1;
    put(tr, o, ev(K_KICK, 0, 1, 1)); put(tr, o + 8, ev(K_KICK, 0, 1, 0.92));
    put(tr, o + 4, ev(K_SNARE, 0, 1, 1)); put(tr, o + 12, ev(K_SNARE, 0, 1, fill ? 0.9 : 1));
    for (let s = 0; s < 16; s += 2) {
      if (fill && s >= 12) continue;
      const open = (b === 1 && s === 14) || (kind === 1 && o + s === 14) || (kind === 1 && o + s === 22);
      put(tr, o + s, open ? ev(K_OHAT, 0, 1, 1) : ev(K_HAT, 0, 1, (s & 2) ? 0.95 : 0.5));
    }
    for (let s = 1; s < 16; s += 2) put(tr, o + s, ev(K_SHAKER, 0, 1, (s & 2) ? 0.8 : 0.6));
  }
  put(tr, 7, ev(K_GHOST, 0, 1, 0.14));
  if (kind === 1) put(tr, 11, ev(K_KICK, 0, 1, 0.55));
  if (kind === 2) {
    put(tr, 26, ev(K_GHOST, 0, 1, 0.3)); put(tr, 27, ev(K_GHOST, 0, 1, 0.42));
    put(tr, 29, ev(K_TOM, N('A3'), 1, 0.8)); put(tr, 30, ev(K_TOM, N('F3'), 1, 0.9)); put(tr, 31, ev(K_TOM, N('D3'), 1, 1));
  } else { put(tr, 30, ev(K_KICK, 0, 1, 0.5)); put(tr, 31, ev(K_GHOST, 0, 1, 0.22)); }
}
function noteTrack(tr, k, list, bend) {
  for (let i = 0; i < list.length; i++) put(tr, list[i][0], ev(k, N(list[i][1]), list[i][2], (list[i][0] & 3) ? bend : 1));
}
(function buildGroove() {
  for (let b = 0; b < 2; b++) { const row = []; for (let i = 0; i < 4; i++) row.push(N(PAD[b][i])); PAD_HZ.push(row); }
  const bass = TRACKS[1], keys = TRACKS[2], gtr = TRACKS[3], lead = TRACKS[4];
  drumTrack(TRACKS[0], 0); drumTrack(DRUM_OPEN, 1); drumTrack(DRUM_FILL, 2);
  // bass (tall): round octave line, Dm then G with a pentatonic walk back home; B lifts to F3 and walks down instead
  const BL = [[0, 'D2', 3], [3, 'D3', 1], [6, 'D2', 2], [8, 'D2', 2], [10, 'D3', 1], [11, 'A2', 1], [12, 'C3', 2], [14, 'D3', 1],
    [16, 'G2', 3], [19, 'G3', 1], [22, 'G2', 2], [24, 'G2', 2], [26, 'G3', 1], [28, 'F2', 1], [29, 'G2', 1], [30, 'A2', 1], [31, 'C3', 1]];
  const BL_B = [[0, 'D2', 3], [3, 'D3', 1], [6, 'D2', 2], [8, 'D2', 2], [10, 'D3', 1], [11, 'A2', 1], [12, 'C3', 2], [14, 'F3', 1],
    [16, 'G2', 3], [19, 'G3', 1], [22, 'G2', 2], [24, 'G2', 2], [26, 'G3', 1], [28, 'A2', 1], [29, 'G2', 1], [30, 'F2', 1], [31, 'E2', 1]];
  noteTrack(bass, K_BASS, BL, 0.8); noteTrack(BASS_B, K_BASS, BL_B, 0.8);
  // keys (round): rootless Dm9 / G13, a held chord, an off-beat stab and a second push (sidechained to the kick)
  const KV = [['F3', 'A3', 'C4', 'E4'], ['F3', 'A3', 'B3', 'E4']];
  const KR = [[0, 5, 1], [7, 1.5, 0.6], [10, 4, 0.85]];
  for (let b = 0; b < 2; b++) {
    const fs = []; for (let i = 0; i < 4; i++) fs.push(N(KV[b][i]));
    for (let i = 0; i < KR.length; i++) { const e = ev(K_KEYS, 0, KR[i][1], KR[i][2]); e.fs = fs; put(keys, b * 16 + KR[i][0], e); }
  }
  // guitar (square): funky muted pluck arpeggio
  const GL = [[0, 'A3'], [2, 'D4'], [3, 'F4'], [5, 'A3'], [6, 'C4'], [8, 'A3'], [10, 'D4'], [11, 'E4'], [13, 'C4'], [14, 'A3'],
    [16, 'B3'], [18, 'D4'], [19, 'F4'], [21, 'B3'], [22, 'E4'], [24, 'B3'], [26, 'D4'], [27, 'F4'], [29, 'E4'], [30, 'D4']];
  for (let i = 0; i < GL.length; i++) put(gtr, GL[i][0], ev(K_GTR, N(GL[i][1]), 1, (GL[i][0] & 3) ? 0.72 : 1));
  // lead (bean): bar 1 calls, bar 2 answers from the 5th of G (no 11th on the downbeat) and lands home through the
  // b2 (Eb) grace note; C stays a passing tone on the weak 26
  const ML = [[0, 'A4', 1], [2, 'D5', 1], [3, 'F5', 2], [6, 'G5', 1], [7, 'A5', 3], [10, 'G5', 1], [11, 'F5', 1], [12, 'G5', 3],
    [16, 'D6', 2], [18, 'A5', 1], [19, 'G5', 1], [20, 'F5', 2], [22, 'D5', 2], [24, 'F5', 1], [25, 'D5', 1], [26, 'C5', 2],
    [28, 'A4', 1], [29, 'Eb5', 0.6], [30, 'D5', 2]];
  // B: the call climbs to the 7th and the answer circles G before the same b2 landing; SPARSE leaves room (low energy)
  const ML_B = [[0, 'D5', 1], [2, 'F5', 1], [3, 'G5', 2], [6, 'A5', 1], [7, 'C6', 2], [10, 'D6', 1], [11, 'C6', 1], [12, 'A5', 3],
    [16, 'A5', 2], [18, 'G5', 1], [19, 'F5', 1], [20, 'G5', 3], [24, 'D5', 1], [26, 'F5', 1], [27, 'G5', 1], [28, 'F5', 1],
    [29, 'Eb5', 0.6], [30, 'D5', 2]];
  const ML_S = [[0, 'A4', 2], [3, 'D5', 3], [7, 'F5', 4], [12, 'G5', 3], [16, 'A5', 3], [20, 'F5', 2], [24, 'D5', 4], [30, 'C5', 2]];
  noteTrack(lead, K_LEAD, ML, 0.8); noteTrack(LEAD_B, K_LEAD, ML_B, 0.8); noteTrack(LEAD_SPARSE, K_LEAD, ML_S, 0.8);
})();
TRACKS[0].id = 'drum'; TRACKS[1].id = 'bass'; TRACKS[2].id = 'keys'; TRACKS[3].id = 'guitar'; TRACKS[4].id = 'lead';
DRUM_OPEN.id = 'drum-open'; DRUM_FILL.id = 'drum-fill'; BASS_B.id = 'bass-b'; LEAD_B.id = 'lead-b'; LEAD_SPARSE.id = 'lead-sparse';
// which table a layer reads for loop `idx >> 5`: drum = main, open hats every 4th loop (2, 6, ...), the tom fill on
// odd loops (so every 4th bar); bass B and the lead answer (or sparse phrase) on odd loops
function trackFor(i, idx) {
  const lp = idx >> 5;
  if (i === 0) return (lp & 1) ? DRUM_FILL : ((lp & 3) === 2 ? DRUM_OPEN : TRACKS[0]);
  if (i === 1) return (lp & 1) ? BASS_B : TRACKS[1];
  if (i === 4) return (lp & 1) ? (energy >= TUNE.groove.leadBusy ? LEAD_B : LEAD_SPARSE) : TRACKS[4];
  return TRACKS[i];
}

// ladder: D minor pentatonic from F4 so degrees 5 / 10 / 15 land on D
const LADDER = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'D7'];
const LADDER_HZ = [], LADDER_EV = [];
for (let i = 0; i < LADDER.length; i++) { LADDER_HZ.push(N(LADDER[i])); LADDER_EV.push({ buf: null }); }
function hzList(names) { const o = []; for (let i = 0; i < names.length; i++) o.push(N(names[i])); return o; }
// everything that rings over the band is voiced on D E F G A: chord tones or tensions of both Dm9 and G13, so a chord
// lands sweet on either bar (no F# / C# against the band's F / C, no Bb, no long B or C against the other bar)
const RESOLVE = [hzList(['D4', 'F4', 'A4', 'D5']), hzList(['D4', 'A4', 'E5', 'F5', 'A5']), hzList(['D3', 'A3', 'D4', 'F4', 'A4', 'E5', 'A5'])];
const TIERS = {
  // gold: open D sus stack (fifths + 9th + 11th) rising to A6; silver: F6/9; bronze: Dm(add9); rope: plain Dm
  gold: { arp: hzList(['D4', 'A4', 'D5', 'E5', 'G5', 'A5', 'D6', 'E6', 'A6']), pad: hzList(['D3', 'A3', 'E4', 'A4', 'D5']), step: 0.045, shimmer: 1, vol: 1 },
  silver: { arp: hzList(['F3', 'A3', 'D4', 'E4', 'G4', 'A4', 'D5']), pad: hzList(['F3', 'A3', 'E4', 'G4']), step: 0.06, shimmer: 0.5, vol: 0.9 },
  bronze: { arp: hzList(['D3', 'A3', 'F4', 'A4', 'E5']), pad: hzList(['D3', 'A3', 'F4', 'E5']), step: 0.075, shimmer: 0, vol: 0.8 },
  rope: { arp: hzList(['D3', 'A3', 'D4', 'F4']), pad: hzList(['D3', 'A3', 'F4']), step: 0.09, shimmer: 0, vol: 0.7 },
};
const SAD = hzList(['A3', 'G#3', 'G3', 'F#3']);  // the shut-down trombone is meant to sag out of key (the band ducks deep)
// unlock: heraldic open fifths with a 9th (D A E A), the top voice with vibrato
const FANFARE = hzList(['A4', 'A4', 'A4']), FANFARE_CHORD = hzList(['D4', 'A4', 'E5', 'A5']), FANFARE_SPARK = hzList(['A5', 'D6', 'E6', 'A6', 'D7']);
// last call: bIII - IV - i staccato brass hits (F with no 5th, G power fifth, held Dm add9), all on D E F G A so no hit
// grinds a semitone against either bar; the top voice climbs A4 -> D5 -> E5
const LASTCALL = [hzList(['F3', 'A3', 'F4', 'A4']), hzList(['G3', 'D4', 'G4', 'D5']), hzList(['D3', 'D4', 'F4', 'A4', 'E5'])];
// a gold LAST CALL lifts the held Dm add9 into the open gold stack (fifths + 9th, top A5 with vibrato); a failed night's
// muted 'ta-dum' falls Dm -> Dm/A
const LASTCALL_GOLD = hzList(['D3', 'A3', 'D4', 'E4', 'A4', 'D5', 'A5']);
const LASTCALL_ROPE = [hzList(['D4', 'F4', 'A4']), hzList(['A3', 'D4', 'F4'])];
// the "gotcha" of a busted liar: a fourth up, A4 -> D5 (a caught shapeshifter answers higher, D5 -> A5)
const BUSTED = hzList(['A4', 'D5']), CAUGHT = hzList(['D5', 'A5']);
const SHIFT_SPARK = hzList(['A5', 'C6', 'D6', 'F6']);
const SPARK_HZ = hzList(['D7', 'E7', 'G7', 'A7', 'D8', 'E8']);   // celebration sparkles pick from these
function ladderIdx(n) { n = Math.max(1, Math.floor(Number(n) || 1)); return n <= LADDER.length ? n - 1 : 10 + ((n - 11) % 5); }
const ROLL_TIMES = [];
(function buildRoll() {
  let t = 0, gap = S.rollGap;
  for (let i = 0; i < S.rollHits; i++) { ROLL_TIMES.push(t); t += gap; gap = Math.max(S.rollMin, gap * S.rollAccel); }
})();
const ROLL_END = ROLL_TIMES[ROLL_TIMES.length - 1] + 0.05;
// formants (Hz) for the cute species blips: [F1, F2]
const VOWEL = { a: [800, 1250], e: [520, 1850], i: [320, 2300], o: [470, 860], u: [340, 760] };
const VOICES = {
  blob: { type: 'sawtooth', f: 185, c1: [1.0, 1.04], c2: [1.12, 0.9], v1: 'u', v2: 'a', fmt: 1.15, vol: 2 },
  tall: { type: 'sawtooth', f: 118, c1: [1.05, 1.0], c2: [0.95, 0.8], v1: 'o', v2: 'o', fmt: 1.0, vol: 2.2 },
  round: { type: 'triangle', f: 290, c1: [0.96, 1.04], c2: [1.12, 1.32], v1: 'u', v2: 'i', fmt: 1.25, vol: 1.1 },
  square: { type: 'square', f: 225, c1: [1.06, 1.06], c2: [1.1, 0.92], v1: 'e', v2: 'a', fmt: 1.15, vol: 1.5 },
  bean: { type: 'sawtooth', f: 430, c1: [0.98, 1.08], c2: [1.2, 1.4], v1: 'i', v2: 'i', fmt: 1.35, vol: 1.4 },
};
// band-join one-shots (sfx.join), voiced per bar (0 = Dm9, 1 = G13) so each sits on whichever bar it lands on: the
// bass pops root -> octave, the keys stab the band's own rootless voicing (+ A on top), the guitar strums up, the lead
// runs a pentatonic lick that fits both bars, the drum rolls toms into a kick + splash
const JOIN_BASS = [hzList(['D2', 'D3']), hzList(['G2', 'G3'])];
const JOIN_KEYS = [hzList(['F3', 'A3', 'C4', 'E4', 'A4']), hzList(['F3', 'A3', 'B3', 'E4', 'A4'])];
const JOIN_GTR = [hzList(['D4', 'F4', 'A4', 'C5', 'E5']), hzList(['G3', 'D4', 'F4', 'B4', 'E5'])];
const JOIN_LEAD = hzList(['F5', 'G5', 'A5', 'D6']);
const JOIN_TOMS = hzList(['A3', 'F3', 'D3']);
const JOIN_GTR_EV = [[], []], JOIN_LEAD_EV = [];       // Karplus-Strong buffer holders (warmed below)
const JOIN_LEAD_DUR = [0.16, 0.16, 0.2, 0.55];         // lick note lengths (s; the last one rings)
const JT = { live: false, k: 0, t: 0, lag: 0, bar: 0 };   // reused result of joinGrid()
for (let b = 0; b < 2; b++) for (let i = 0; i < JOIN_GTR[b].length; i++) JOIN_GTR_EV[b].push({ buf: null });
for (let i = 0; i < JOIN_LEAD.length; i++) JOIN_LEAD_EV.push({ buf: null });
// every Karplus-Strong buffer the groove and the celebration sfx will ask for: [Hz, dur, brightness, holder | null],
// rendered in idle slices right after build so a first admit or a gold tier never renders strings on the spot
const WARM = [];
(function buildWarm() {
  for (let i = 0; i < LADDER_HZ.length; i++) WARM.push([LADDER_HZ[i], S.dingDur, S.dingBright, LADDER_EV[i]]);
  const LEADS = [TRACKS[4], LEAD_B, LEAD_SPARSE];
  for (let s = 0; s < LOOP; s++) {
    const g = TRACKS[3][s];
    if (g) for (let j = 0; j < g.length; j++) WARM.push([g[j].f, I.gtrDur, I.gtrBright, g[j]]);
    for (let v = 0; v < LEADS.length; v++) {
      const l = LEADS[v][s];
      if (l) for (let j = 0; j < l.length; j++) WARM.push([l[j].f, l[j].len * STEP + I.leadTail, I.leadBright, l[j]]);
    }
  }
  for (let b = 0; b < 2; b++) for (let i = 0; i < JOIN_GTR[b].length; i++) WARM.push([JOIN_GTR[b][i], I.gtrDur * 2, I.gtrBright, JOIN_GTR_EV[b][i]]);
  for (let i = 0; i < JOIN_LEAD.length; i++) WARM.push([JOIN_LEAD[i], JOIN_LEAD_DUR[i] + I.leadTail, I.leadBright, JOIN_LEAD_EV[i]]);
  for (let r = 0; r < RESOLVE.length; r++) for (let i = 0; i < RESOLVE[r].length; i++) WARM.push([RESOLVE[r][i], S.strumDur, S.strumBright, null]);
  for (const k in TIERS) { const arp = TIERS[k].arp; for (let i = 0; i < arp.length; i++) WARM.push([arp[i], S.tierDur, S.tierBright, null]); }
})();

// ---------------------------------------------------------------- sequencer
function isActive(name) {
  if (solo) return solo === name;
  return mode === 'lobby' ? lobbySet[name] : playSet[name];
}
// the first beat whose steps are not scheduled yet, or the bar line when it comes at most join.barWithin s later
function joinTime() {
  const idx = seq.index, beat = (idx + 3) & ~3, bar = (idx + 15) & ~15;
  const tb = seq.next + (beat - idx) * STEP, tbar = seq.next + (bar - idx) * STEP;
  return tbar - tb <= TUNE.join.barWithin ? tbar : tb;
}
// is layer Lr heard at time t (joined and not yet past its fade-out)
function sounding(Lr, t) { return Lr.on ? t >= Lr.onAt - TUNE.join.eps : t <= Lr.offEnd; }
// while the sequencer is halted (silent) every change snaps; while it runs, a joining layer enters on the next free
// beat / bar line at join.level and fades up over a bar (a layer still fading out just turns around), a leaving layer
// fades out over a bar; the door opens on the join
function applyLayers() {
  if (!ctx) return;
  const now = ctx.currentTime, snap = !seq.live;
  let at = now;
  for (let i = 0; i < L.length; i++) {
    const Lr = L[i], want = isActive(Lr.name);
    if (want === Lr.on) continue;
    Lr.on = want;
    const p = Lr.gain.gain, v = want ? TUNE.layers[Lr.name] : 0;
    if (snap) { snapParam(p, v, now); Lr.offEnd = now; Lr.onAt = now; continue; }
    if (!want) {
      if (now < Lr.onAt) { snapParam(p, 0, now); Lr.offEnd = now; continue; }   // never got to play a note
      hold(p, now); p.linearRampToValueAtTime(0, now + BAR);
      Lr.offEnd = now + BAR + 0.3;
      continue;
    }
    hold(p, now);
    if (now <= Lr.offEnd) { p.linearRampToValueAtTime(v, now + BAR); Lr.onAt = now; continue; }
    const tj = joinTime();
    p.setValueAtTime(v * TUNE.join.level, tj); p.linearRampToValueAtTime(v, tj + BAR);
    Lr.onAt = tj;
    if (tj > at) at = tj;
  }
  applyDoor(at);
}
function doorBase() {
  if (solo) return TUNE.door.open;               // an instrument preview is heard in the room, not through the door
  let n = 0;
  for (let i = 0; i < L.length; i++) if (L[i].on) n++;
  const closed = mode === 'lobby' ? TUNE.door.lobby : TUNE.door.play, open = TUNE.door.open;
  const f = closed * Math.pow(open / closed, n / 5);
  return f * Math.pow(open / f, energy * TUNE.door.energyOpen);
}
function setDoorParam(p, now, base, at) {
  hold(p, now);
  if (now < swellEnd) { p.setTargetAtTime(Math.max(base, TUNE.door.swellHz), now, 0.06); p.setTargetAtTime(base, Math.max(swellEnd, at), TUNE.door.smooth); }
  else p.setTargetAtTime(base, at, TUNE.door.smooth);
}
// glide the door to its target from `at` (default now: a layer join passes its beat)
function applyDoor(at) {
  if (!ctx) return;
  const now = ctx.currentTime, base = doorBase(), from = at > now ? at : now;
  STATE.door = Math.round(base);
  if (!seq.live) { snapParam(doorA.frequency, base, now); snapParam(doorB.frequency, base, now); return; }
  setDoorParam(doorA.frequency, now, base, from);
  setDoorParam(doorB.frequency, now, base, from);
}
function doorSwell(secs) {
  if (!ctx || !running) return;
  const now = ctx.currentTime;
  swellEnd = now + secs;
  applyDoor();
  if (crowdG) {
    const p = crowdG.gain, base = crowdLevel();
    hold(p, now); p.setTargetAtTime(base * TUNE.crowd.swell, now, 0.08); p.setTargetAtTime(base, now + secs, 0.35);
  }
}
function crowdLevel() { return TUNE.crowd.vol * (1 + energy * (TUNE.energy.crowd - 1)); }

// music on/off follows audio.musicOn + audio.enabled (whoever flips them); while silent the ambience is halted too
function syncMusic(now) {
  const on = wantAudible();
  if (on !== audible) { audible = on; rampTo(muteG.gain, on ? 1 : 0, TUNE.muteRamp); }
  if (!seq.live) return;
  if (on && !amb && !noiseJob) ambStart(now + 0.02);         // the ambience waits for the full noise buffer
  else if (!on && amb) ambStop(now + TUNE.muteRamp + 0.03);
}
function tick() {
  if (!seq.live || !ctx) return;
  const now = ctx.currentTime;
  syncMusic(now);
  if (seq.next < now - TUNE.resyncBehind) {
    const skip = Math.ceil((now - seq.next) / STEP);
    seq.next += skip * STEP; seq.index += skip;
  }
  while (seq.next < now + TUNE.lookahead) {
    scheduleStep(seq.index, seq.next, now);
    seq.next += STEP; seq.index++;
  }
  seq.timer = setTimeout(tick, TUNE.tickMs);
}
// tg = the step's straight grid time; steps already too late (main-thread stall) are dropped whole, except the bar's
// pad, which (like after an unmute mid-bar) enters late for the rest of its bar
function scheduleStep(idx, tg, now) {
  if (!audible) return;
  const step = idx % LOOP, s16 = step & 15, t = tg + SWING[s16 & 3] * STEP, bar = idx >> 4;
  if (bar !== seq.padBar) {
    seq.padBar = bar;
    const ps = t < now + TUNE.late ? now + 0.01 : t, left = tg + (16 - s16) * STEP - ps;
    if (left >= TUNE.pad.lateMin) padChord(step >> 4, ps, left + TUNE.pad.overlap);
  }
  if (t < now + TUNE.late) return;
  if (s16 === 0 || s16 === 8) duckAt(t);
  for (let i = 0; i < L.length; i++) {
    const Lr = L[i];
    if (!sounding(Lr, t)) continue;
    const evs = trackFor(i, idx)[step];
    if (!evs) continue;
    for (let j = 0; j < evs.length; j++) playEv(Lr.in, evs[j], t);
  }
}
function playEv(dest, e, t) {
  switch (e.k) {
    case K_KICK: tone(P.kick, t, dest, e.v); noise(P.kickClick, t, dest, e.v); break;
    case K_SNARE:
      noise(P.snareN, t, dest, e.v); tone(P.snareT, t, dest, e.v);
      noise(P.clap, t, dest, e.v); noise(P.clap, t + 0.011, dest, e.v * 0.8); noise(P.clapTail, t + 0.022, dest, e.v);
      break;
    case K_GHOST: noise(P.snareN, t, dest, e.v); break;
    case K_TOM: tone(P.tom, t, dest, e.v, e.f); noise(P.tomN, t, dest, e.v); break;
    case K_HAT: noise(P.hat, t, dest, e.v); break;
    case K_OHAT: noise(P.hatOpen, t, dest, e.v); break;
    case K_SHAKER: if (energy >= TUNE.energy.shaker) noise(P.shaker, t, dest, e.v * (0.4 + energy * 0.6)); break;
    case K_BASS: {
      const d = e.len * STEP * I.bassGate;
      tone(P.bassSine, t, dest, e.v, e.f, d); tone(P.bassTri, t, dest, e.v, e.f, d); tone(P.bassBite, t, dest, e.v, e.f * 2, d);
      break;
    }
    case K_KEYS: {
      const d = e.len * STEP, fs = e.fs;
      for (let i = 0; i < fs.length; i++) epNote(t + i * I.keysStrum, dest, fs[i], d, I.keys * e.v);
      break;
    }
    case K_GTR: pluck(t, dest, e.f, I.gtrDur, I.gtrVol * e.v, I.gtrBright, e); break;
    case K_LEAD:
      pluck(t, dest, e.f, e.len * STEP + I.leadTail, I.leadVol * e.v, I.leadBright, e);
      tone(P.leadSpark, t, dest, e.v, e.f * 2, Math.min(I.sparkMax, e.len * STEP + I.sparkTail));
      break;
    default: break;
  }
}
function padChord(bar, t, d) {
  const ch = PAD_HZ[bar], k = TUNE.pad.osc;
  for (let i = 0; i < ch.length; i++) { tone(P.padA, t, padIn, k, ch[i], d); tone(P.padB, t, padIn, k, ch[i], d); }
  tone(P.padSub, t, padIn, TUNE.pad.sub, ch[0] * 0.5, d);
}
// sidechain pump on the kick: only when the drum layer is in (or still fading out), never a kick-less tremolo
function duckAt(t) {
  const D = TUNE.duck, Ld = L[0];
  if (!sounding(Ld, t)) return;
  const g = keysDuck.gain, pg = padDuck.gain;
  g.setTargetAtTime(Ld.on ? D.deep : D.soft, t, D.attackTc); g.setTargetAtTime(1, t + D.hold, D.releaseTc);
  pg.setTargetAtTime(Ld.on ? D.pad : D.padSoft, t, D.attackTc); pg.setTargetAtTime(1, t + D.hold, D.releaseTc * D.padRelease);
}

// always-on base: room tone + a crowd murmur (formant-filtered noise and three "voices" whose pitch glides and
// wobbles and whose formant swings, all amplitude-modulated at syllable rates) under the pad
function ambStart(t) {
  const nodes = [], srcs = [], C = TUNE.crowd;
  function lfo(hz, depth, param, type) {
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = hz;
    const g = gain(depth, param); o.connect(g); o.start(t); nodes.push(o, g); srcs.push(o);
  }
  const room = ctx.createBufferSource(); room.buffer = noiseBuf; room.loop = true;
  const rg = gain(TUNE.room.vol, mix), rl = biquad('lowpass', TUNE.room.lp, 0.5, rg), rh = biquad('highpass', TUNE.room.hp, 0.5, rl);
  room.connect(rh); room.start(t, 0.3); nodes.push(room, rh, rl, rg); srcs.push(room);
  crowdG = gain(0, mix);
  crowdG.gain.setValueAtTime(0, t); crowdG.gain.linearRampToValueAtTime(crowdLevel(), t + C.fadeIn);
  const cl = biquad('lowpass', C.cut, 0.6, crowdG), sum = gain(1, cl);
  nodes.push(crowdG, cl, sum);
  const cs = ctx.createBufferSource(); cs.buffer = noiseBuf; cs.loop = true; cs.start(t, 1.1); nodes.push(cs); srcs.push(cs);
  for (let i = 0; i < C.bands.length; i++) {
    const B = C.bands[i], am = gain(C.bandGain, sum), bp = biquad('bandpass', B[0], B[1], am);
    cs.connect(bp); nodes.push(am, bp);
    lfo(B[2], C.bandAm[0], am.gain); lfo(B[3], C.bandAm[1], am.gain);
  }
  for (let i = 0; i < C.voices.length; i++) {
    const V = C.voices[i], o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = V[0];
    const am = gain(C.voiceGain, sum), bp = biquad('bandpass', V[1], C.voiceQ, am);
    o.connect(bp); o.start(t); nodes.push(o, am, bp); srcs.push(o);
    lfo(V[3], C.glide, o.detune, 'triangle'); lfo(C.wobble[i], C.wobbleCents, o.detune); lfo(V[2], C.voiceAm, am.gain);
    lfo(C.swing[i], V[1] * C.swingDepth, bp.frequency);
  }
  amb = { nodes: nodes, srcs: srcs };
}
function ambStop(at) {
  if (!amb) return;
  const now = ctx.currentTime;
  for (let i = 0; i < amb.srcs.length; i++) { try { amb.srcs[i].stop(at); } catch (e) { amb.srcs[i] = null; } }
  const nodes = amb.nodes;
  setTimeout(() => { for (let i = 0; i < nodes.length; i++) nodes[i].disconnect(); }, (at - now) * 1000 + 120);
  amb = null; crowdG = null;
}

function realStart(m) {
  pendingMode = null;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = 0; }
  const changed = m !== mode;
  mode = m;
  if (changed) setEnergy(0);
  applyLayers();                                 // snaps while halted, so the first start never sweeps the door
  const now = ctx.currentTime;
  if (!seq.live) {
    snapParam(vdel.delayTime, TUNE.detune.base, now); snapParam(wowG.gain, 0, now);   // drop any leftover drag lag
    knotReset(now, TUNE.detune.base);
    drag.t0 = 0;
    seq.live = true; seq.index = 0; seq.padBar = -1; seq.next = now + TUNE.startDelay;
    tick();                                      // syncs the mute and starts the ambience when audible
  }
  running = true;
  rampTo(runG.gain, 1, TUNE.fadeIn);
}
function halt() {
  stopTimer = 0;
  seq.live = false;
  clearTimeout(seq.timer);
  ambStop(ctx.currentTime + 0.02);
}
function setEnergy(v) {
  energy = clamp(Number(v) || 0, 0, 1);
  if (!ctx) return;
  const sw = 1 + energy * TUNE.energy.swell;
  if (seq.live) rampTo(swellG.gain, sw, 0.6); else snapParam(swellG.gain, sw, ctx.currentTime);
  if (crowdG) rampTo(crowdG.gain, crowdLevel(), 0.6);
  applyDoor();
}
// render the full noise buffer, the reverb impulses, then the WARM strings, in idle slices; a slice that only came
// from the timeout (busy or throttled main thread) still does warmSlice units, so everything lands within a few seconds
function prewarm() {
  warmAt = 0;
  const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : null, built = ctx;
  function more() { return !!noiseJob || irAt < IRS.length || warmAt < WARM.length; }
  function slice(dl) {
    if (ctx !== built) return;
    const idle = dl && dl.timeRemaining && !dl.didTimeout;
    let n = 0;
    while (more() && (idle ? (n < 1 || dl.timeRemaining() > 2) : n < TUNE.warmSlice)) {
      if (noiseJob) noiseSlice(TUNE.noise.chunk);
      else if (irAt < IRS.length) { if (irSlice(IRS[irAt], TUNE.irChunk)) irAt++; }
      else {
        const w = WARM[warmAt++];
        if (!w[3] || !w[3].buf || w[3].buf.sampleRate !== ctx.sampleRate) { const b = ks(w[0], w[1], w[2]); if (w[3]) w[3].buf = b; }
      }
      n++;
    }
    if (more()) { if (ric) ric(slice, { timeout: TUNE.warmWait }); else setTimeout(slice, 30); }
  }
  if (ric) ric(slice, { timeout: TUNE.warmWait }); else setTimeout(slice, 30);
}
// sting duck: the band steps back under a celebration chord from t for secs, then comes back up
function stingDuck(t, secs, depth) {
  const p = stingG.gain;
  hold(p, ctx.currentTime);
  p.setTargetAtTime(depth, t, TUNE.sting.attackTc);
  p.setTargetAtTime(1, t + secs, TUNE.sting.releaseTc);
}

// ---------------------------------------------------------------- sfx
function gate(name) {
  if (!sfxOn || !audio.enabled || !ensure()) return false;
  const now = ctx.currentTime, l = lastFire[name];
  if (l !== undefined && now - l < TUNE.minGap) return false;
  lastFire[name] = now;
  return true;
}
function T() { return ctx.currentTime + 0.005; }
// an optional sfx delay argument (s, 0..1): sounds a stamp / verdict picture lands after the call are scheduled on the
// audio clock, never on a timer
function after(d) { return d !== undefined ? clamp(Number(d) || 0, 0, 1) : 0; }
// how much earlier than its frame a scheduled hit must start so it is HEARD with that frame: the output path's latency
// less the ~frame the picture itself needs to reach the screen (never negative)
function outLead() { return Math.max(0, (ctx.outputLatency || 0) + (ctx.baseLatency || 0) - TUNE.yeet.frame); }

function ding(t, f, k, idx) {
  const hi = clamp((f - 1000) / 1500, 0, 1);
  tone(P.ding, t, sfxWet, k, f);
  tone(P.ding2, t, sfxWet, k * (1 - hi * 0.6), f * 2);
  tone(P.ding3, t, sfxWet, k * (1 - hi * 0.85), f * 3.01);
  pluck(t, sfxWet, f, S.dingDur, S.dingPluck * k, S.dingBright, idx >= 0 ? LADDER_EV[idx] : null);
}
function strum(t, fs, gap, k, padK) {
  for (let i = 0; i < fs.length; i++) {
    pluck(t + i * gap, sfxWet, fs[i], S.strumDur, S.strumVol * k, S.strumBright, null, (i / (fs.length - 1) - 0.5) * 0.5);
    if (padK) tone(P.chordPad, t + i * gap * 0.5, sfxWet, padK, fs[i]);
  }
}
function sparkles(t, count, spread, k) {
  for (let i = 0; i < count; i++) tone(P.sparkle, t + i * spread, sfxWet, k, SPARK_HZ[Math.floor(Math.random() * SPARK_HZ.length)], undefined, (Math.random() - 0.5) * 1.2);
}
// stick-slip creak: a slow sawtooth pulse train ringing three narrow wood resonances
function creak(t, dur, k) {
  const C = P.creak, osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(C.f[0], t);
  osc.frequency.linearRampToValueAtTime(C.f[1], t + dur * C.fAt[0]);
  osc.frequency.linearRampToValueAtTime(C.f[2], t + dur * C.fAt[1]);
  osc.frequency.linearRampToValueAtTime(C.f[3], t + dur);
  const jit = ctx.createOscillator(); jit.type = 'triangle'; jit.frequency.value = C.jitHz;
  const jg = gain(C.jit, osc.frequency); jit.connect(jg);
  const g = ctx.createGain(); g.connect(sfxWet);
  const end = env(g.gain, t, C.vol * k, C.a, 0.1, 1, dur, dur * C.r);
  const B = C.bands, b1 = biquad('bandpass', B[0][0], B[0][1], g);
  const g2 = gain(B[1][2], g), b2 = biquad('bandpass', B[1][0], B[1][1], g2), g3 = gain(B[2][2], g), b3 = biquad('bandpass', B[2][0], B[2][1], g3);
  b1.frequency.setValueAtTime(C.sweep[0], t); b1.frequency.linearRampToValueAtTime(C.sweep[1], t + dur);
  osc.connect(b1); osc.connect(b2); osc.connect(b3);
  own(osc, [jit, jg, g, b1, g2, b2, g3, b3]);
  osc.start(t); jit.start(t); osc.stop(end + TUNE.tail); jit.stop(end + TUNE.tail);
}
// crowd "whoa": formant-filtered noise plus rising detuned voices
function cheer(t, dur, k) {
  const C = P.cheer, g = ctx.createGain(); g.connect(sfxWet);
  const end = env(g.gain, t, C.vol * k, dur * C.a, 0.1, 1, dur, dur * C.r);
  const lp = biquad('lowpass', C.lp, 0.6, g);
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const b1 = biquad('bandpass', C.bands[0][0], C.bands[0][1], lp), b2 = biquad('bandpass', C.bands[1][0], C.bands[1][1], lp);
  src.connect(b1); src.connect(b2);
  for (let i = 0; i < C.voices; i++) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const f = C.f + i * C.fStep;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * C.rise, t + dur * C.riseAt); o.frequency.exponentialRampToValueAtTime(f * C.settle, t + dur);
    const vg = gain(C.voiceVol, null), bp = biquad('bandpass', C.fmt + i * C.fmtStep, C.fmtQ, lp);
    o.connect(vg); vg.connect(bp);
    o.start(t); o.stop(end + TUNE.tail);
    own(o, [vg, bp]);
  }
  own(src, [g, lp, b1, b2]);
  src.start(t, Math.random() * noiseSpan); src.stop(end + TUNE.tail);
}
// crowd "awww": darker formant-filtered breath plus detuned voices that lift a hair, then sag while their formants
// close from "a" to "o" (the cheer's mirror image), with one slow shared wobble
function groan(t, dur, k) {
  const C = P.groan, g = ctx.createGain(); g.connect(sfxWet);
  const end = env(g.gain, t, C.vol * k, dur * C.a, 0.1, 1, dur, dur * C.r);
  const lp = biquad('lowpass', C.lp, 0.6, g);
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const b1 = biquad('bandpass', C.bands[0][0], C.bands[0][1], lp), b2 = biquad('bandpass', C.bands[1][0], C.bands[1][1], lp);
  src.connect(b1); src.connect(b2);
  const wob = ctx.createOscillator(); wob.frequency.value = C.wob;
  const wg = gain(C.wobD, null); wob.connect(wg);
  for (let i = 0; i < C.voices; i++) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const f = (C.f + i * C.fStep) * (0.985 + Math.random() * 0.03);
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * C.lift, t + dur * C.liftAt);
    o.frequency.exponentialRampToValueAtTime(f * C.fall, t + dur);
    wg.connect(o.detune);
    const vg = gain(C.voiceVol, null), bp = biquad('bandpass', C.fmt + i * C.fmtStep, C.fmtQ, lp);
    bp.frequency.setValueAtTime(C.fmt + i * C.fmtStep, t + dur * C.liftAt);
    bp.frequency.exponentialRampToValueAtTime(C.fmt2 + i * C.fmtStep * 0.6, t + dur);
    o.connect(vg); vg.connect(bp);
    o.start(t); o.stop(end + TUNE.tail);
    own(o, [vg, bp]);
  }
  own(src, [g, lp, b1, b2, wg]);
  own(wob, null);
  wob.start(t); wob.stop(end + TUNE.tail);
  src.start(t, Math.random() * noiseSpan); src.stop(end + TUNE.tail);
}
// the hurt "a-aww" in the species' voice V (the wrong bounce): a short syllable, a gap, a long falling one with a sob
// vibrato, vowel "a" closing to "o"
function awwVoice(t, V) {
  const A = TUNE.aww, peak = S.voicePeak * V.vol * A.vol, f0 = V.f * (0.97 + Math.random() * 0.06);
  const t2 = t + A.syl1 + A.gap, end = t2 + A.syl2;
  const o = ctx.createOscillator(); o.type = V.type;
  o.frequency.setValueAtTime(f0 * A.c1[0], t); o.frequency.linearRampToValueAtTime(f0 * A.c1[1], t + A.syl1);
  o.frequency.setValueAtTime(f0 * A.c2[0], t2); o.frequency.exponentialRampToValueAtTime(f0 * A.c2[1], end);
  const vib = ctx.createOscillator(); vib.frequency.value = A.vib;
  const vg = gain(0, o.detune); vib.connect(vg);
  vg.gain.setValueAtTime(0, t2); vg.gain.linearRampToValueAtTime(A.vibD, end);
  const g = ctx.createGain(); g.connect(sfxWet);
  const p = g.gain;
  p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + 0.015);
  p.setValueAtTime(peak, t + A.syl1 - 0.02); p.exponentialRampToValueAtTime(0.004, t + A.syl1 + 0.01);
  p.setValueAtTime(0.004, t2 - 0.005); p.linearRampToValueAtTime(peak, t2 + 0.03);
  p.setValueAtTime(peak, end - A.syl2 * 0.45); p.exponentialRampToValueAtTime(0.0001, end + 0.03);
  const fa = VOWEL.a, fo = VOWEL.o;
  const b1 = biquad('bandpass', fa[0] * V.fmt, 6, g), g2 = gain(0.5, g), b2 = biquad('bandpass', fa[1] * V.fmt, 8, g2);
  b1.frequency.setValueAtTime(fa[0] * V.fmt, t2); b1.frequency.exponentialRampToValueAtTime(fo[0] * V.fmt, end);
  b2.frequency.setValueAtTime(fa[1] * V.fmt, t2); b2.frequency.exponentialRampToValueAtTime(fo[1] * V.fmt, end);
  o.connect(b1); o.connect(b2);
  own(o, [g, b1, g2, b2]);
  own(vib, [vg]);
  o.start(t); vib.start(t); o.stop(end + 0.06); vib.stop(end + 0.06);
}
// tiny formant synth: one source, two parallel formant bandpasses, vowel A -> gap -> vowel B with a pitch contour
function formant(t, V, jitter) {
  const f0 = V.f * jitter, F1a = VOWEL[V.v1][0] * V.fmt, F2a = VOWEL[V.v1][1] * V.fmt, F1b = VOWEL[V.v2][0] * V.fmt, F2b = VOWEL[V.v2][1] * V.fmt;
  const t2 = t + S.syl1 + S.sylGap, end = t2 + S.syl2;
  const o = ctx.createOscillator(); o.type = V.type;
  o.frequency.setValueAtTime(f0 * V.c1[0], t); o.frequency.linearRampToValueAtTime(f0 * V.c1[1], t + S.syl1);
  o.frequency.setValueAtTime(f0 * V.c2[0], t2); o.frequency.linearRampToValueAtTime(f0 * V.c2[1], end);
  const g = ctx.createGain(); g.connect(sfxWet);
  const p = g.gain, peak = S.voicePeak * V.vol;
  p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + 0.012);
  p.setValueAtTime(peak, t + S.syl1 - 0.025); p.exponentialRampToValueAtTime(0.004, t + S.syl1 + 0.01);
  p.setValueAtTime(0.004, t2 - 0.005); p.linearRampToValueAtTime(peak * 1.05, t2 + 0.015);
  p.setValueAtTime(peak * 1.05, end - 0.06); p.exponentialRampToValueAtTime(0.0001, end + 0.02);
  const b1 = biquad('bandpass', F1a * 0.6, 7, g), g2 = gain(0.55, g), b2 = biquad('bandpass', F2a, 9, g2);
  // the first syllable opens from a closed "m" to its vowel, the second glides to vowel B
  b1.frequency.setValueAtTime(F1a * 0.55, t); b1.frequency.exponentialRampToValueAtTime(F1a, t + 0.035);
  b1.frequency.setValueAtTime(F1a, t2 - 0.01); b1.frequency.exponentialRampToValueAtTime(F1b, t2 + 0.05);
  b2.frequency.setValueAtTime(F2a, t2 - 0.01); b2.frequency.exponentialRampToValueAtTime(F2b, t2 + 0.05);
  o.connect(b1); o.connect(b2);
  own(o, [g, b1, g2, b2]);
  o.start(t); o.stop(end + 0.06);
}
function brass(t, f, dur, k, vibrato) {
  if (vibrato) { tone(P.brassV, t, sfxWet, k, f, dur); tone(P.brassB, t, sfxWet, k * 0.8, f, dur); }
  else { tone(P.brassA, t, sfxWet, k, f, dur); tone(P.brassB, t, sfxWet, k, f, dur); }
}
function vinylStop(t) { tone(P.vinylSaw, t, sfxBus, 1); noise(P.scratch, t, sfxBus, 1); }
// paper rip: band-passed noise chopped by an accelerating square wave
function rip(t, dur) {
  const R = P.rip, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = biquad('bandpass', R.bp, R.bpQ, null), hp = biquad('highpass', R.hp, 0.7, null);
  const am = gain(R.am, null), chop = ctx.createOscillator(); chop.type = 'square';
  chop.frequency.setValueAtTime(R.chop[0], t); chop.frequency.exponentialRampToValueAtTime(R.chop[1], t + dur * R.chopAt);
  const cg = gain(R.depth, am.gain); chop.connect(cg);
  const g = ctx.createGain(); g.connect(sfxWet);
  const end = env(g.gain, t, R.vol, dur * R.a, 0.1, 1, dur, R.r);
  src.connect(hp); hp.connect(bp); bp.connect(am); am.connect(g);
  own(src, [bp, hp, am, cg, g, chop]);
  src.start(t, Math.random() * noiseSpan); chop.start(t); src.stop(end + TUNE.tail); chop.stop(end + TUNE.tail);
}

// the band ducks under every tier chord (deep under the shut-down trombone)
function tierStinger(t, name) {
  const G = TUNE.sting;
  if (name === 'shut') {
    stingDuck(t, G.shut, G.deep);
    for (let i = 0; i < 3; i++) tone(P.trombone, t + i * 0.32, sfxWet, 1, SAD[i], 0.3);
    tone(P.tromboneV, t + 0.96, sfxWet, 1, SAD[3], 1.0);
    return;
  }
  stingDuck(t, name === 'gold' ? G.gold : G.tier, G.duck);
  const C = TIERS[name] || TIERS.rope;
  const arp = C.arp;
  for (let i = 0; i < arp.length; i++) {
    const at = t + i * C.step;
    pluck(at, sfxWet, arp[i], S.tierDur, S.tierVol * C.vol, S.tierBright, null, (i / (arp.length - 1) - 0.5) * 0.6);
    tone(P.ting, at, sfxWet, C.vol * 1.2, arp[i] * 2);
  }
  const pt = t + arp.length * C.step * 0.4;
  for (let i = 0; i < C.pad.length; i++) tone(P.chordPad, pt, sfxWet, C.vol * 1.7, C.pad[i], 1.6);
  if (C.shimmer) { noise(P.shimmer, t, sfxWet, C.shimmer); sparkles(t + 0.25, 8, 0.06, 0.8 * C.shimmer); }
}
function fanfare(t) {
  for (let i = 0; i < 3; i++) brass(t + i * 0.1, FANFARE[i], 0.085, 1, false);
  const t2 = t + 0.32;
  for (let i = 0; i < FANFARE_CHORD.length; i++) brass(t2, FANFARE_CHORD[i], 0.75, i === 3 ? 1.1 : 0.8, i === 3);
  tone(P.timp, t2, sfxWet, 1);
  noise(P.cymbal, t2, sfxWet, 1);
  for (let i = 0; i < FANFARE_SPARK.length; i++) tone(P.ting, t2 + 0.1 + i * 0.05, sfxWet, 0.9, FANFARE_SPARK[i]);
}
// the yeet's launch hit at t: body kick + slap transient + the rubbery boing, panned with the flight
function launchHit(t, pan) {
  const p = pan ? clamp(pan, -1, 1) * 0.35 : 0;
  tone(P.launchKick, t, sfxBus, 1, undefined, undefined, p); noise(P.kickClick, t, sfxBus, 1.4, undefined, p);
  noise(P.launchSlap, t, sfxWet, 1, undefined, p);
  tone(P.boing, t + 0.012, sfxWet, 1, undefined, undefined, p); tone(P.boingTri, t + 0.012, sfxWet, 1, undefined, undefined, p);
}
// a sly "heh-heh-heh" in the species' voice: breathy "h" + a short voiced "eh" per syllable, each a little lower
function snickerVoice(t, V) {
  const Z = TUNE.sneak, f1 = VOWEL.e[0] * V.fmt, f2 = VOWEL.e[1] * V.fmt, peak = S.voicePeak * V.vol * Z.snickerVol;
  for (let i = 0; i < Z.snickerN; i++) {
    const ts = t + i * Z.snickerGap, f0 = V.f * (1.22 - i * Z.snickerFall) * (0.97 + Math.random() * 0.06), te = ts + 0.075;
    noise(P.snickH, ts, sfxWet, 1);
    const o = ctx.createOscillator(); o.type = V.type;
    o.frequency.setValueAtTime(f0, ts + 0.02); o.frequency.linearRampToValueAtTime(f0 * 0.9, te);
    const g = ctx.createGain(); g.connect(sfxWet);
    const p = g.gain;
    p.setValueAtTime(0.0001, ts + 0.018); p.linearRampToValueAtTime(peak, ts + 0.028);
    p.setValueAtTime(peak, ts + 0.045); p.exponentialRampToValueAtTime(0.0001, te);
    const b1 = biquad('bandpass', f1, 6, g), g2 = gain(0.5, g), b2 = biquad('bandpass', f2, 8, g2);
    o.connect(b1); o.connect(b2);
    own(o, [g, b1, g2, b2]);
    o.start(ts + 0.015); o.stop(te + 0.02);
  }
}
// the next 8th note of the party clock at least TUNE.joinSfx.ahead s away -> JT { k (its step index), t (when it is heard:
// the music bus's vinyl lag added, since the sfx bus has none), bar (0 = Dm9, 1 = G13) }; without the sequencer: now
function joinGrid() {
  const now = ctx.currentTime + TUNE.joinSfx.ahead;
  JT.live = seq.live;
  if (!seq.live) { JT.k = 0; JT.t = now; JT.lag = 0; JT.bar = 0; return JT; }
  let k = Math.ceil((seq.index + (now - seq.next) / STEP) / 2) * 2;
  if (seq.next + (k - seq.index + SWING[k & 3]) * STEP < now) k += 2;
  JT.k = k; JT.lag = lagAt(now); JT.t = gridT(k); JT.bar = (k >> 4) & 1;
  return JT;
}
// when step j (a 16th of the party clock, swung) is heard, near the JT grid point (straight 16ths without the sequencer)
function gridT(j) {
  if (!JT.live) return JT.t + (j - JT.k) * STEP;
  return seq.next + (j - seq.index + SWING[j & 3]) * STEP + JT.lag;
}
// one instrument's 'I just joined' phrase from step k (an 8th) on bar `bar`, on the band's own swung 16ths
function joinShot(name, k, bar) {
  const J = TUNE.joinSfx, pan = TUNE.pan[name] || 0;
  if (name === 'drum') {
    // ta-ta-BOOM: two toms on the 16ths into kick + snare + splash on the next 8th
    const v = J.drum, tl = gridT(k + 2);
    for (let i = 0; i < 2; i++) { const at = gridT(k + i); tone(P.tom, at, sfxWet, v * (0.8 + i * 0.15), JOIN_TOMS[i]); noise(P.tomN, at, sfxWet, v); }
    tone(P.tom, tl, sfxWet, v, JOIN_TOMS[2]); tone(P.kick, tl, sfxBus, v); noise(P.kickClick, tl, sfxBus, v);
    noise(P.hatOpen, tl, sfxWet, v * 1.3); noise(P.snareN, tl, sfxWet, v * 0.8); noise(P.clap, tl, sfxWet, v);
  } else if (name === 'bass') {
    // root on the 8th, octave pop on the next 16th
    const fs = JOIN_BASS[bar], v = J.bass;
    for (let i = 0; i < fs.length; i++) {
      const at = gridT(k + i), d = i ? 0.26 : 0.12;
      tone(P.bassSine, at, sfxBus, v, fs[i], d); tone(P.bassTri, at, sfxBus, v, fs[i], d); tone(P.bassBite, at, sfxBus, v * 1.4, fs[i] * 2, d);
    }
  } else if (name === 'keys') {
    const fs = JOIN_KEYS[bar], t = gridT(k);
    for (let i = 0; i < fs.length; i++) epNote(t + i * I.keysStrum * 2, sfxWet, fs[i], STEP * 3, I.keys * J.keys);
    tone(P.ting, t + 0.02, sfxWet, J.sparkle, fs[fs.length - 1] * 4, undefined, pan);
  } else if (name === 'guitar') {
    const fs = JOIN_GTR[bar], hs = JOIN_GTR_EV[bar], t = gridT(k);
    for (let i = 0; i < fs.length; i++) pluck(t + i * 0.018, sfxWet, fs[i], I.gtrDur * 2, I.gtrVol * J.guitar * 0.55, I.gtrBright, hs[i], pan + (i / (fs.length - 1) - 0.5) * 0.3);
  } else {
    for (let i = 0; i < JOIN_LEAD.length; i++) {
      const at = gridT(k + i);
      pluck(at, sfxWet, JOIN_LEAD[i], JOIN_LEAD_DUR[i] + I.leadTail, I.leadVol * J.lead * 0.5, I.leadBright, JOIN_LEAD_EV[i], pan);
      tone(P.leadSpark, at, sfxWet, J.sparkle, JOIN_LEAD[i] * 2, Math.min(I.sparkMax, JOIN_LEAD_DUR[i]), pan);
    }
  }
}
// record scratch at t (forward + back), then a 16th snare roll into a falling tom run that lands on `land` with a
// kick, crash and boom
function rulesHit(t, land) {
  const R = TUNE.rules;
  noise(P.scratchFwd, t, sfxBus, 1); tone(P.needleFwd, t, sfxBus, 1);
  noise(P.scratchBack, t + 0.12, sfxBus, 1); tone(P.needleBack, t + 0.12, sfxBus, 1);
  const n = Math.min(R.fillMax, Math.floor((land - t - R.fillFrom) / STEP));
  for (let i = n; i >= 1; i--) {
    const at = land - i * STEP, u = 1 - (i - 1) / Math.max(1, n);
    if (i <= JOIN_TOMS.length) { tone(P.tom, at, sfxWet, 0.75 + u * 0.3, JOIN_TOMS[JOIN_TOMS.length - i]); noise(P.tomN, at, sfxWet, 1); }
    else noise(P.snareN, at, sfxWet, 0.35 + u * 0.6);
  }
  tone(P.kick, land, sfxBus, 0.6); noise(P.kickClick, land, sfxBus, 0.8);
  noise(P.cymbal, land, sfxWet, 1); tone(P.boom, land, sfxBus, 0.4); noise(P.boomN, land, sfxBus, 0.4);
}

const sfx = {
  // door latch + creak + cheer; the band swells through the open door for a moment (music, so not gated by sfx).
  // door(false, landIn?) = a wrong admit sneaking in: its OWN door: the latch, a slower creak, no cheer, no swell, and
  // the crowd inside groans as the impostor lands in the doorway, landIn s from now (default TUNE.sneak.groanAt; pass
  // 0 / a negative number to leave the groan to sfx.groan() on the impact frame). Pair it with snicker.
  door(cheerOn, landIn) {
    const ok = cheerOn !== false, Z = TUNE.sneak;
    if (ok && ensure()) doorSwell(TUNE.door.swellSec);
    if (!gate('door')) return;
    const t = T();
    noise(P.latchN, t, sfxBus, 1); tone(P.latchT, t, sfxBus, 1); tone(P.latchRing, t, sfxWet, 1);
    noise(P.latchN, t + 0.07, sfxBus, 0.7); tone(P.latchRing, t + 0.07, sfxWet, 0.6, 760);
    creak(t + 0.1, ok ? 0.55 : Z.creak, ok ? 1 : 0.8);
    if (ok) { cheer(t + 0.2, 0.9, 0.55); return; }
    const land = landIn !== undefined ? Number(landIn) || 0 : Z.groanAt;
    if (land > 0) { groanHitAt = t + clamp(land, 0, 2); groan(groanHitAt + Z.groanLag, Z.groan, 1); }
  },
  // the crowd's "awww" right now (a wrong admit's impact frame); silent when door(false) already scheduled it for about
  // now, so play may call both
  groan() {
    if (!sfxOn || !audio.enabled || !ensure()) return;
    if (Math.abs(ctx.currentTime - groanHitAt) < TUNE.sneak.dedupe) return;
    if (!gate('groan')) return;
    groan(T() + TUNE.sneak.groanLag, TUNE.sneak.groan, 1);
  },
  // a wrong admit's sly "heh-heh-heh" in the species' voice (instead of voice())
  snicker(species) {
    if (!gate('snicker')) return;
    snickerVoice(T(), VOICES[species] || VOICES.blob);
  },
  // a wrong bounce: the guest's hurt "a-aww" in its species' voice (the guilty beat, opposite of the yeet)
  aww(species, delay) {
    if (!gate('aww')) return;
    awwVoice(T() + after(delay), VOICES[species] || VOICES.blob);
  },
  // a bounce, called on the verdict: schedules the launch hit (kick + thwack + rubbery boing) `delay` s later (default
  // TUNE.yeet.launch: play's launch frame, x its speed) so it is HEARD on that frame (the output latency is taken off,
  // see TUNE.yeet); pan -1 .. 1 follows the flight. The swipe whoosh is play's own sfx.whoosh, the exit is yeetLand()
  yeet(delay, pan) {
    if (!gate('yeet')) return;
    const d = delay !== undefined ? clamp(Number(delay) || 0, 0, 1) : TUNE.yeet.launch, now = ctx.currentTime;
    yeetHitAt = Math.max(now + 0.005, now + d - outLead());
    launchHit(yeetHitAt, pan || 0);
  },
  // the launch hit right now (call it on the launch frame, with the hit-stop; pan -1 .. 1); silent when a yeet() call
  // already scheduled this hit, so play may call either or both
  launch(pan) {
    if (!sfxOn || !audio.enabled || !ensure()) return;
    if (Math.abs(ctx.currentTime - yeetHitAt) < TUNE.yeet.dedupe) return;
    if (!gate('launch')) return;
    launchHit(T(), pan);
  },
  // the yeet's two visual beats by name: yeetLaunch(pan) on the launch frame (= launch: deduped against yeet()),
  // yeetLand(pan) where the flyer leaves the screen (= ping: the twinkle, panned to that edge)
  yeetLaunch(pan) { sfx.launch(pan); },
  yeetLand(pan) { sfx.ping(pan); },
  // a guest joined the band (the comet lands in the window): that species' instrument plays its one-shot (drum fill,
  // bass pop, keys stab, guitar strum, lead lick) on the next 8th of the party clock, voiced for the bar it lands on
  join(species) {
    const name = TO_INSTR[species];
    if (!name || !gate('join')) return;
    const g = joinGrid();
    joinShot(name, g.k, g.bar);
  },
  // the stamp's sparkle, tuned above the last ladder note (call party.ladder(combo) for the ding itself); delay (s) =
  // when the NICE stamp punches in (play's stamp delay), so the sparkle lands with the picture
  nice(n, delay) {
    if (!gate('nice')) return;
    const t = T() + after(delay), idx = n ? ladderIdx(n) : lastLadder;
    const f = LADDER_HZ[Math.min(idx + 3, LADDER.length - 1)];
    tone(P.ting, t, sfxWet, 1.6, f * 2); tone(P.ting, t + 0.055, sfxWet, 1.3, f * 3);
    noise(P.air, t, sfxWet, 1);
  },
  oops() {
    if (!gate('oops')) return;
    const t = T();
    tone(P.buzzA, t, sfxBus, 1); tone(P.buzzB, t, sfxBus, 1); tone(P.buzzSub, t, sfxBus, 1);
  },
  // glass lamp crash: thunk + noise burst + ringing band + scattered tinkles
  strike() {
    if (!gate('strike')) return;
    const t = T(), Z = P.shards;
    tone(P.crashThunk, t, sfxBus, 1); noise(P.crashN, t, sfxWet, 1); noise(P.crashRing, t + 0.005, sfxWet, 1);
    for (let i = 0; i < Z.n; i++) {
      const at = t + Z.at + Math.pow(Math.random(), Z.curve) * Z.spread;
      tone(P.tinkle, at, sfxWet, Z.k[0] + Math.random() * Z.k[1], Z.f[0] + Math.random() * Z.f[1], Z.dur[0] + Math.random() * Z.dur[1], (Math.random() - 0.5) * Z.pan);
    }
  },
  // magical warble then a pop and a little sparkle run
  shift() {
    if (!gate('shift')) return;
    const t = T();
    tone(P.warble, t, sfxWet, 1); tone(P.warble5, t, sfxWet, 1);
    const tp = t + 0.35;
    tone(P.popT, tp, sfxBus, 1); noise(P.popN, tp, sfxBus, 1);
    for (let i = 0; i < SHIFT_SPARK.length; i++) tone(P.ting, tp + 0.04 + i * 0.045, sfxWet, 0.7, SHIFT_SPARK[i] * 2);
  },
  // descending "aaa-ohh" with breath
  yawn() {
    if (!gate('yawn')) return;
    const Y = P.yawn, t = T(), dur = Y.dur;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(Y.f[0], t); o.frequency.linearRampToValueAtTime(Y.f[1], t + Y.riseAt); o.frequency.exponentialRampToValueAtTime(Y.f[2], t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = Y.vibHz; const vg = gain(0, o.detune);
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(Y.vibD, t + dur); vib.connect(vg);
    const g = ctx.createGain(); g.connect(sfxWet);
    const end = env(g.gain, t, Y.vol, Y.a, 0.1, 1, dur, Y.r);
    const b1 = biquad('bandpass', Y.f1[0], Y.q1, g), g2 = gain(Y.f2Vol, g), b2 = biquad('bandpass', Y.f2[0], Y.q2, g2);
    b1.frequency.setValueAtTime(Y.f1[0], t + Y.fmtAt); b1.frequency.exponentialRampToValueAtTime(Y.f1[1], t + dur);
    b2.frequency.setValueAtTime(Y.f2[0], t + Y.fmtAt); b2.frequency.exponentialRampToValueAtTime(Y.f2[1], t + dur);
    o.connect(b1); o.connect(b2);
    own(o, [vib, vg, g, b1, g2, b2]);
    o.start(t); vib.start(t); o.stop(end + TUNE.tail); vib.stop(end + TUNE.tail);
    noise(P.rustle, t, sfxWet, Y.rustle, dur * Y.rustleLen);
  },
  // paper slap + body thud + rustle
  poster() {
    if (!gate('poster')) return;
    const t = T();
    noise(P.slap, t, sfxWet, 1); noise(P.rustle, t + 0.01, sfxWet, 1);
    tone(P.slapThud, t, sfxBus, 1); noise(P.slapLow, t, sfxBus, 1);
  },
  // rubber-stamp thunk; delay (s) = when the stamp it belongs to punches in
  stamp(delay) {
    if (!gate('stamp')) return;
    const t = T() + after(delay);
    tone(P.rubber, t, sfxBus, 1); tone(P.rubberTri, t, sfxBus, 1); noise(P.squish, t + 0.004, sfxBus, 1);
  },
  // result-card chord over the ducked band: gold = shimmering open D sus stack, silver F6/9, bronze Dm(add9),
  // rope Dm, shut = sad trombone (deep duck)
  tier(name) {
    if (!gate('tier')) return;
    tierStinger(T(), name || 'rope');
  },
  unlock() {
    if (!gate('unlock')) return;
    const t = T();
    stingDuck(t, TUNE.sting.fanfare, TUNE.sting.duck);
    fanfare(t);
  },
  // a cute two-syllable blip per species
  voice(species) {
    if (!gate('voice')) return;
    const V = VOICES[species] || VOICES.blob;
    formant(T(), V, 0.95 + Math.random() * 0.1);
  },
  // swipe whoosh; dir -1 / 1 pans with the gesture
  whoosh(dir) {
    if (!gate('whoosh')) return;
    noise(P.swipe, T(), sfxWet, 1, undefined, dir ? clamp(dir, -1, 1) * 0.45 : 0);
  },
  plate() {
    if (!gate('plate')) return;
    const t = T();
    tone(P.clickHi, t, sfxBus, 1); tone(P.clickBody, t, sfxBus, 1); noise(P.clickN, t, sfxBus, 1);
  },
  tear() {
    if (!gate('tear')) return;
    rip(T(), P.rip.dur);
  },
  // the BUSTED beat (delay s = the launch frame / stamp punch-in): kind 'fake' (default) = a trap liar's taped part rips
  // off (short tape rip + pop) under a brass "gotcha" A4 -> D5; kind 'shift' = a verdict-flipping shapeshifter caught
  // (NICE CATCH): a pop + a sparkle flick under a higher D5 -> A5. Done in ~0.4 s, so the queue's pace holds
  busted(delay, kind) {
    if (!gate('busted')) return;
    const B = TUNE.busted, t = T() + after(delay), shift = kind === 'shift', fs = shift ? CAUGHT : BUSTED;
    if (!shift) rip(t, B.rip);
    tone(P.popT, t + 0.015, sfxBus, B.vol); noise(P.popN, t + 0.015, sfxBus, B.vol);
    if (shift) sparkles(t, 4, 0.03, 0.7);
    for (let i = 0; i < fs.length; i++) {
      brass(t + B.hits[i], fs[i], B.dur[i], B.vol, i === fs.length - 1);
      brass(t + B.hits[i], fs[i] / 2, B.dur[i], B.vol * 0.6, false);
    }
    const top = t + B.hits[B.hits.length - 1];
    tone(P.ting, top, sfxWet, 1.2, fs[fs.length - 1] * 2); tone(P.ting, top + 0.05, sfxWet, 0.9, fs[fs.length - 1] * 3);
  },
  // a yeeted guest vanishes into the night sky: "ping!" (pan -1 .. 1 = where it left the screen)
  ping(pan) {
    if (!gate('ping')) return;
    const t = T(), p = pan ? clamp(pan, -1, 1) * 0.6 : 0;
    tone(P.ping, t, sfxWet, 1, undefined, undefined, p); tone(P.pingHi, t + 0.012, sfxWet, 1, undefined, undefined, p);
    tone(P.ting, t + 0.09, sfxWet, 0.8, 3520, undefined, p);
  },
};

// ---------------------------------------------------------------- public surface
function start(m) {
  m = m === 'lobby' ? 'lobby' : 'play';
  if (ensure()) { realStart(m); return; }
  pendingMode = m;
  mode = m;
  if (!pollTimer) pollTimer = setInterval(() => { if (pendingMode && ensure()) realStart(pendingMode); }, TUNE.pollMs);
}
function stop() {
  pendingMode = null;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = 0; }
  if (!ctx || !running) return;
  running = false;
  rampTo(runG.gain, 0, TUNE.fadeOut);
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(halt, (TUNE.fadeOut + 0.15) * 1000);
}
function setLayer(species, on) {
  const name = TO_INSTR[species];
  if (!name) return;
  playSet[name] = !!on;
  applyLayers();
}
function resetLayers() {
  for (let i = 0; i < INSTR.length; i++) playSet[INSTR[i]] = false;
  solo = null;
  setEnergy(0);
  applyLayers();
}
function setLobbyBand(list) {
  for (let i = 0; i < INSTR.length; i++) lobbySet[INSTR[i]] = false;
  if (list) for (let i = 0; i < list.length; i++) { const n = TO_INSTR[list[i]]; if (n) lobbySet[n] = true; }
  applyLayers();
}
// drag pitch (cents) x seconds into a detune: dip, settle, hold, glide home
function bendCents(x, holdS) {
  const D = TUNE.detune;
  if (x <= 0 || x >= holdS + D.outSec) return 0;
  if (x < D.inSec) return D.dip * x / D.inSec;
  if (x < D.inSec + D.settle) return D.dip + (D.cents - D.dip) * (x - D.inSec) / D.settle;
  if (x < holdS) return D.cents;
  return D.cents * (1 - (x - holdS) / D.outSec);
}
// delay growth (s per s) that lowers everything passing through by c cents (Doppler: heard f = f * (1 - delay'))
function lagRate(c) { return 1 - Math.pow(2, c / 1200); }
// whole-mix vinyl drag held for `ms` (clamped to [minHold, maxHold] s): the music bus delay grows along the cents path
// (the mix, its reverb and the room all bend and slow together, at zero per-voice cost), with wow, a muffle and a
// duck; the gained lag (~32 ms) then drains at +returnCents (~9 s) and is reset whenever the sequencer restarts
function detune(ms) {
  if (!ensure()) return;
  const D = TUNE.detune, now = ctx.currentTime, holdS = clamp((Number(ms) || D.ms) / 1000, D.minHold, D.maxHold), total = holdS + D.outSec;
  const p = vdel.delayTime, back = Math.pow(2, D.returnCents / 1200) - 1;
  let lag = lagAt(now), from = now;
  if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else { p.cancelScheduledValues(now); p.setValueAtTime(lag, now); }
  knotReset(now, lag);
  if (lag + 0.05 < D.maxLag) {                   // the line only fills up under a detune spam: then it just muffles
    drag.t0 = now; drag.hold = holdS;
    let x = 0;
    for (let seg = 0; seg < 4; seg++) {
      const xe = seg === 0 ? D.inSec : (seg === 1 ? D.inSec + D.settle : (seg === 2 ? holdS : total));
      const n = seg === 2 ? 1 : D.slices, dx = (xe - x) / n;
      for (let k = 0; k < n; k++) {
        lag += dx * lagRate(bendCents(x + dx * 0.5, holdS));
        x += dx;
        p.linearRampToValueAtTime(lag, now + x); knotAdd(now + x, lag);
      }
    }
    from = now + total;
    const w = wowG.gain;
    hold(w, now); w.linearRampToValueAtTime(WOW_AMP, now + D.inSec); w.setValueAtTime(WOW_AMP, now + holdS); w.linearRampToValueAtTime(0, now + total);
  }
  const home = from + Math.max(0.01, lag - D.base) / back;
  p.linearRampToValueAtTime(D.base, home); knotAdd(home, D.base);
  const f = vinyl.frequency;
  hold(f, now);
  f.exponentialRampToValueAtTime(D.lp, now + D.lpIn);
  f.setValueAtTime(D.lp, now + holdS * 0.45);
  f.exponentialRampToValueAtTime(20000, now + total);
  const g = duckG.gain;
  hold(g, now); g.linearRampToValueAtTime(D.duck, now + D.lpIn); g.setValueAtTime(D.duck, now + holdS * 0.6); g.linearRampToValueAtTime(1, now + total);
  if (sfxOn && audio.enabled) vinylStop(now + 0.005);
}
// combo note: degree n of the D minor pentatonic ladder; 5 / 10 / 15 resolve onto a D minor chord
function ladder(n) {
  if (!gate('ladder')) return;
  n = Math.max(1, Math.floor(Number(n) || 1));
  const idx = ladderIdx(n), f = LADDER_HZ[idx], t = T();
  lastLadder = idx;
  ding(t, f, 1, idx);
  if (n % 5 === 0) {
    const lvl = Math.min(3, n / 5) - 1;
    strum(t + 0.03, RESOLVE[lvl], 0.028, 0.9 + lvl * 0.15, 0.9 + lvl * 0.2);
    if (lvl >= 1) sparkles(t + 0.12, 4 + lvl * 3, 0.05, 0.7);
    if (lvl >= 2) { noise(P.shimmer, t, sfxWet, 0.8); tone(P.timpLow, t, sfxWet, 0.6); }
  }
}
// 'lastcall': door slam + bIII-IV-i brass hits + cymbal + cheer, and the band swells (energy 1, door open) even with
// the sfx off; its second argument is the night's tier (TUNE.lastcall): 'gold' adds the held gold brass stack, timpani,
// crash, shimmer and a longer swell + cheer (PERFECT NIGHT); 'rope' (a failed night) gets no swell, a sparse band, one
// soft knock, a muted minor ta-dum and polite applause; silver / bronze / none = the plain ending. 'unlock':
// accelerating drum roll into the fanfare over the ducked band; 'gold': the gold tier chord
// with a cheer and extra sparkle over the ducked band; 'rules' (a mid-night rule change): record scratch + a 16th
// snare / tom fill landing with a kick + crash `sec` s later (when the new poster lands: TUNE.rules.land by default),
// the band ducked deep until then (the duck runs even with the sfx off)
function stinger(name, sec) {
  if (name === 'lastcall' && (sec === 'gold' || sec === 'rope')) { lastcallTier(sec); return; }
  if (name === 'rules') {
    const R = TUNE.rules, land = clamp(sec !== undefined ? Number(sec) || R.land : R.land, R.minLand, R.maxLand);
    if (ensure()) stingDuck(ctx.currentTime, land, TUNE.sting.deep);
    if (!gate('stinger')) return;
    const t = T();
    rulesHit(t, t + land);
    return;
  }
  if (name === 'lastcall') {
    setEnergy(1);
    if (ensure()) doorSwell(TUNE.lastcallSwellSec);
  } else if (name === 'shut') {
    // the band dies instead of swelling: energy drops, a long vinyl drag (detune plays the vinyl stop itself) and the
    // band ducks deep for the slam; music changes, so they run even with the sfx off
    setEnergy(0);
    detune(TUNE.shutDetuneMs);
    if (ctx) stingDuck(ctx.currentTime, TUNE.sting.shut, TUNE.sting.deep);
  }
  if (!gate('stinger')) return;
  const t = T();
  if (name === 'shut') {
    tone(P.boom, t, sfxBus, 1); noise(P.boomN, t, sfxBus, 1); noise(P.knock, t, sfxBus, 1);
    noise(P.latchN, t + 0.09, sfxBus, 0.8); tone(P.latchRing, t + 0.09, sfxWet, 0.5, 620);
    tone(P.powerDown, t + 0.05, sfxWet, 1);
  } else if (name === 'lastcall') {
    lastcallHits(t);
    cheer(t + 0.3, 1.6, 0.9);
  } else if (name === 'unlock') {
    stingDuck(t, ROLL_END + TUNE.sting.fanfare, TUNE.sting.duck);
    for (let i = 0; i < ROLL_TIMES.length; i++) noise(P.snareN, t + ROLL_TIMES[i], sfxWet, 0.25 + 0.6 * i / ROLL_TIMES.length);
    noise(P.cymSwell, t + ROLL_END - 0.62, sfxWet, 0.8);
    fanfare(t + ROLL_END);
    cheer(t + ROLL_END + 0.2, 1.2, 0.7);
  } else if (name === 'gold') {
    tierStinger(t, 'gold');
    cheer(t + 0.15, 1.4, 0.8);
    sparkles(t + 0.5, 10, 0.07, 0.8);
  }
}
// the plain LAST CALL hits (door boom, bIII-IV-i brass, cymbal swell + crash) from t
function lastcallHits(t) {
  tone(P.boom, t, sfxBus, 1); noise(P.boomN, t, sfxBus, 1); noise(P.knock, t, sfxBus, 1);
  for (let c = 0; c < 3; c++) {
    const ch = LASTCALL[c], at = t + 0.1 + c * 0.18, d = c === 2 ? 1.3 : 0.15;
    for (let i = 0; i < ch.length; i++) brass(at, ch[i], d, c === 2 ? 0.85 : 0.75, c === 2 && i === ch.length - 1);
  }
  noise(P.cymSwell, t, sfxWet, 0.6, 0.46);
  noise(P.cymbal, t + 0.46, sfxWet, 1);
}
// LAST CALL for a gold or a failed (rope) night (see stinger); the music side runs even with the sfx off
function lastcallTier(tier) {
  const G = TUNE.lastcall;
  if (tier === 'gold') {
    const C = G.gold;
    setEnergy(1);
    if (ensure()) doorSwell(C.swell);
    if (!gate('stinger')) return;
    const t = T(), at = t + C.at;
    lastcallHits(t);
    for (let i = 0; i < LASTCALL_GOLD.length; i++) brass(at, LASTCALL_GOLD[i], 1.5, i >= LASTCALL_GOLD.length - 2 ? 0.9 : 0.7, i === LASTCALL_GOLD.length - 1);
    tone(P.timp, at, sfxWet, 1); tone(P.timpLow, at + 0.02, sfxWet, 0.7);
    noise(P.cymbal, at, sfxWet, 1.2); noise(P.shimmer, at, sfxWet, 1.3);
    sparkles(at + 0.08, C.sparks, 0.055, 0.9);
    cheer(t + 0.3, C.cheer[0], C.cheer[1]);
    return;
  }
  const C = G.rope;
  setEnergy(C.energy);                     // the floor thins out; no swell through the door
  if (!gate('stinger')) return;
  const t = T();
  noise(P.knock, t, sfxBus, C.vol); tone(P.slapThud, t, sfxBus, C.vol * 0.6);
  for (let c = 0; c < LASTCALL_ROPE.length; c++) {
    const ch = LASTCALL_ROPE[c], at = t + 0.12 + c * 0.24, d = c ? 0.6 : 0.12;
    for (let i = 0; i < ch.length; i++) brass(at, ch[i], d, C.vol, false);
  }
  cheer(t + 0.3, C.cheer[0], C.cheer[1]);
}
// settings: sfxOn gates the party sfx bus; the music flag is mirrored into audio.setMusic, and the music bus follows
// audio.musicOn (plus the master mute) from then on, so a direct audio.setMusic call silences the party too
function setEnabled(sfxOnArg, musicOnArg) {
  sfxOn = sfxOnArg !== false;
  const m = musicOnArg !== false;
  if ((audio.musicOn !== false) !== m) audio.setMusic(m);
  if (!ctx) return;
  rampTo(sfxBus.gain, sfxOn ? TUNE.sfxVol : 0, TUNE.muteRamp);
  syncMusic(ctx.currentTime);
}
// beat clock for visuals (dancers, lights): position on the straight 16th grid as the listener hears it now (output
// latency and the vinyl lag taken off the scheduling clock); returns a reused object
function clock() {
  const C = CLOCK;
  C.playing = running && seq.live && !!ctx;
  if (!C.playing) { C.pos = 0; C.step = 0; C.bar = 0; C.loopStep = 0; C.beat = 0; C.beatPhase = 0; C.barPhase = 0; return C; }
  const heard = ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) - lagAt(ctx.currentTime);
  let pos = seq.index - (seq.next - heard) / STEP;
  if (pos < 0) pos = 0;
  const i = Math.floor(pos);
  C.pos = pos; C.loopStep = i % LOOP; C.step = i & 15; C.bar = (i >> 4) & 1; C.beat = (i >> 2) & 3;
  C.beatPhase = (pos / 4) % 1; C.barPhase = (pos / 16) % 1;
  return C;
}
// reused snapshot: layers = what is sounding now (mode + solo applied), play / lobby = the two stored sets
function state() {
  const St = STATE;
  St.ready = !!ctx; St.playing = running; St.mode = mode; St.energy = energy; St.sfx = sfxOn; St.music = audio.musicOn !== false; St.solo = solo;
  for (let i = 0; i < INSTR.length; i++) {
    const n = INSTR[i];
    St.layers[n] = ctx && L[i] ? L[i].on : isActive(n);
    St.play[n] = playSet[n]; St.lobby[n] = lobbySet[n];
  }
  return St;
}

// build the graph in idle time right after the first-tap unlock (whoever hooks audio.unlock), so the first sfx does not
// pay for it; any party call before that builds it on the spot
function autoWarm() {
  if (ctx) { document.removeEventListener('pointerdown', autoWarm, true); return; }
  setTimeout(idleBuild, 0);
}
function idleBuild() {
  if (ctx || !audio.ctx) return;
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => { ensure(); }, { timeout: TUNE.warmWait });
  else ensure();
}
if (typeof document !== 'undefined') document.addEventListener('pointerdown', autoWarm, { capture: true, passive: true });

export { setEnabled };
export const party = {
  SPECIES: SPECIES, INSTR: INSTR, TO_INSTR: TO_INSTR, bpm: TUNE.bpm, stepSec: STEP, barSec: BAR,
  start: start, stop: stop,
  // build the audio graph now if audio.unlock() already made a context (cheap; IRs and strings follow in idle slices)
  warm() { return ensure(); },
  setLayer: setLayer, resetLayers: resetLayers, setLobbyBand: setLobbyBand,
  solo(species) { solo = species ? (TO_INSTR[species] || null) : null; applyLayers(); },
  detune: detune, ladder: ladder, stinger: stinger,
  intensity(v) { setEnergy(v); },
  setEnabled: setEnabled,
  clock: clock, state: state,
  // live bus values for tests: { bend (drag cents), lag / lagParam (s), vinyl / door (Hz), duck, sting, run, mute, sfx,
  // swell, warm ('strings done/total'), ir ('impulses done/total'), noise (starter / full), amb, buildMs, loop (current
  // loop number), tables (variant each layer reads now), gains (layer gain values), joinStep (step index each sounding
  // layer joined on: a multiple of 4 = on a beat), now (audio clock), yeetAt / groanAt (audio time of the last scheduled
  // launch hit / crowd groan), lead (s a scheduled hit is pulled early for the output latency) }
  debug() {
    if (!ctx) return null;
    const tables = [], gains = {}, joinStep = {};
    for (let i = 0; i < L.length; i++) {
      tables.push(trackFor(i, seq.index).id);
      gains[L[i].name] = Math.round(L[i].gain.gain.value * 1000) / 1000;
      if (L[i].on) joinStep[L[i].name] = Math.round(((L[i].onAt - seq.next) / STEP + seq.index) * 1000) / 1000;
    }
    return {
      tables: tables.join(' '), gains: gains, joinStep: joinStep,
      bend: drag.t0 ? bendCents(ctx.currentTime - drag.t0, drag.hold) : 0, lag: lagAt(ctx.currentTime), lagParam: vdel.delayTime.value,
      vinyl: vinyl.frequency.value,
      door: doorA.frequency.value, duck: duckG.gain.value, sting: stingG.gain.value, run: runG.gain.value, mute: muteG.gain.value,
      sfx: sfxBus.gain.value, swell: swellG.gain.value, warm: warmAt + '/' + WARM.length, ir: irAt + '/' + IRS.length,
      noise: noiseJob ? 'starter' : 'full', amb: !!amb,
      buildMs: Math.round(buildMs * 100) / 100, loop: seq.live ? seq.index >> 5 : -1,
      now: ctx.currentTime, yeetAt: yeetHitAt, groanAt: groanHitAt, lead: outLead(),
    };
  },
  sfx: sfx,
};
