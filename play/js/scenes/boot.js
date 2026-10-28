// Boot scene ('boot'): the Monster Bouncer / بودي قارد الوحوش title card. An indigo night (baked sky + stars, slow party-coloured orbs),
// a brass marquee sign with chasing bulbs carrying the neon sticker lockup (js/game/logo.js: MONSTER over BOUNCER with the
// googly-eye O and the velvet rope; in Arabic بودي قارد over الوحوش with the taped googly eye; the same lockup as the home
// sign, its eye looking at your finger and blinking) and the tagline, five monster actors (actor.js, one per species, one wearing a taped googly eye) peeking over the sign's top
// edge on springs, glancing around and ducking now and then. The foreground is crafted, not flat: a night skyline with
// warm windows behind the sign, the club's cobbled pavement in perspective from a kerb, the marquee's amber spill pooling
// on the cobbles, the velvet rope with gold tassels on brass stanchions standing in that pool, and two more monsters (one
// in a taped-on paper hat) leaning in from the bottom corners, backlit, watching the sign and your finger. The tap hint is
// the standard sticker pill (indigo, brass rim, cream outlined text) with the pointing glove tapping it, and it says what
// a tap does ("Tap to start the night"). A tap (or 2.2 s after the splash is gone) pops every monster up cheering and wipes
// to the next scene (the lobby).
// enter({ next = 'home', nextParams, dare }) — main.js passes next: 'play' + the challenge's play params and the parsed
// launch params as `dare` (shown as the friend's dare pill; a challenge waits for the tap instead of auto-advancing). A
// daily from a link marks its attempt on the way in (profile.markDailyStart: one attempt counts).
// Strings: bootDict ({ en, ar }) is merged into the game dictionary by main.js. Every per-frame draw blits cached sprites
// with reused option objects.
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { camera } from '../core/camera.js';
import { particles } from '../core/particles.js';
import { post } from '../core/post.js';
import { draw, color } from '../core/draw.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens } from '../core/tween.js';
import { TAU, noise1, clamp } from '../core/math.js';
import { createActor } from '../game/actor.js';
import { drawPill, drawGlove } from '../game/icons.js';
import { paintLogo, paintLogoNeon, logoBox, logoEye, stepLogoEye, drawLogoEye, blinkLogoEye } from '../game/logo.js';
import { party } from '../game/party.js';
import { challengeInvite } from '../game/share.js';
import { profile } from '../game/profile.js';

const TUNE = {
  autoSec: 2.2,                                 // visible time (after the splash is gone) before going on by itself
  leaveSec: 0.34,                               // tap -> transition (the monsters pop first)
  bg: [[0, '#2a2760'], [0.5, '#1b1a4d'], [1, '#0c0b24']],
  bgPad: 40,
  orbPx: 256,
  orbs: [
    { color: '#ffb347', r: 190, alpha: 0.30, speed: 0.06, ax: 0.30, ay: 0.08, cy: 0.40, seed: 3.1 },    // the party's amber spill
    { color: '#ff4fa3', r: 140, alpha: 0.20, speed: 0.08, ax: 0.42, ay: 0.14, cy: 0.22, seed: 17.7 },   // neon pink
    { color: '#4cc9f0', r: 150, alpha: 0.16, speed: 0.07, ax: 0.40, ay: 0.12, cy: 0.70, seed: 41.3 },   // cool street lamp
    { color: '#a06cd5', r: 220, alpha: 0.22, speed: 0.05, ax: 0.35, ay: 0.10, cy: 0.92, seed: 77.9 },
  ],
  moon: { x: 66, y: 0.105, px: 120, r: 21, cut: 0.62, color: '#fff1c9', glow: 'rgba(255,236,190,0.22)' },
  stars: { n: 46, h: 0.42, seed: 7, twinkle: 9, twinkleHz: [0.6, 1.4] },
  sign: { w: 356, h: 206, y: 0.4, r: 28, rim: 9, bulbs: 38, chaseHz: 7, ink: '#14112e', brass: '#d9a441', brassDark: '#8a5a14',
    panel: [[0, '#3a2470'], [1, '#221a55']], glow: '#ffb347', glowR: 260, glowA: 0.26 },
  // the lockup fits maxW x maxH (design units) centred dy below the sign's centre (its eye: logo.js stepLogoEye)
  title: { maxW: 318, maxH: 142, dy: -14, neon: '#ff4fa3', breathe: 0.012, breatheHz: 1.1, glowR: 200, glowA: 0.24,
    powerOn: [0, 0, 0.2, 1, 0.26, 0.15, 0.36, 1, 0.42, 0.3, 0.6, 1],   // [t, lit] pairs: the neon buzzing on
    flickEvery: [3, 7], flickDur: 0.45, flickHz: 38, hum: 0.08 },
  tag: { w: 320, h: 30, size: 16.5, dy: 74 },
  // the peekers: species looks, x on the sign, scale, the local eye height (actor units above the feet) and order of rising
  cast: [
    { spec: { species: 'tall', color: 'coral', eyes: 2, hat: 'top', tail: false, pattern: 'none' }, x: 62, s: 0.86, eye: 123, at: 0.15, flip: false },
    { spec: { species: 'blob', color: 'mint', eyes: 2, hat: 'party', tail: false, pattern: 'none', fake: { eyes: 1, hat: false, tail: false } }, x: 128, s: 0.98, eye: 48, at: 0.4, flip: false },
    { spec: { species: 'round', color: 'sky', eyes: 3, hat: 'none', tail: false, pattern: 'dots' }, x: 198, s: 1.0, eye: 51, at: 0, flip: false },
    { spec: { species: 'bean', color: 'grape', eyes: 1, hat: 'none', tail: true, pattern: 'stripes' }, x: 264, s: 0.92, eye: 81, at: 0.28, flip: true },
    { spec: { species: 'square', color: 'mustard', eyes: 2, hat: 'crown', tail: false, pattern: 'none' }, x: 328, s: 0.92, eye: 71, at: 0.52, flip: true },
  ],
  peek: { first: 0.35, eyeUp: 27, popUp: 40, hideGap: 8, hold: [2.2, 4.2], hidden: [0.5, 1.2], duckFrom: 2.4, lookEvery: [0.7, 1.8],
    light: { door: 0.35, lamp: 0.2 } },
  // the foreground (no flat carpet): a night skyline behind the sign, the club's cobbled pavement in perspective from the
  // kerb at ground.y, a pool of amber light spilling down from the marquee onto it, the velvet rope on brass stanchions
  // standing in the pool, and two more monsters peeking in from the bottom corners (backlit, tilted in, eyes on you)
  skyline: { top: 0.43, seed: 11, cols: ['#14123f', '#18164a', '#110f36', '#1c1952'], win: '#ffcf7a', winOff: 'rgba(60,56,140,0.55)', winP: 0.24, haze: 'rgba(255,179,71,0.16)' },
  ground: { y: 0.6, kerb: 7, stone: 30, k0: 0.45, rowMin: 4, rowMax: 30, seed: 5, fill: [[0, '#26236a'], [0.3, '#1a1850'], [1, '#0d0b2a']],
    stoneA: [0.07, 0.15], fog: 'rgba(18,17,58,0.9)' },
  pool: { y: 0.742, rx: 200, ry: 68, a: 0.95, beat: 0.08, coneA: 0.16, px: 128 },
  refl: { h: 130, a: 0.55, stretch: 3.2, xs: [-120, 0, 120], r: [34, 52, 34], cols: ['rgba(255,179,71,0.5)', 'rgba(255,79,163,0.55)', 'rgba(255,179,71,0.5)'] },
  rope: { y: 0.66, x0: 86, x1: 304, postH: 74, ringDy: 12, sag: 26, swayHz: 0.7, swayPx: 3, color: '#b3203a', dark: '#4a0a1c', hi: 'rgba(255,170,185,0.55)',
    tassel: '#d9a441' },
  fg: [
    { spec: { species: 'blob', color: 'lime', eyes: 3, hat: 'top', tail: false, pattern: 'none' }, x: 34, s: 1.3, rot: 0.34, eye: 48, flip: false, at: 0.75 },
    { spec: { species: 'bean', color: 'coral', eyes: 2, hat: 'none', tail: false, pattern: 'dots', fake: { eyes: 0, hat: true, tail: false } }, x: 360, s: 1.22, rot: -0.3, eye: 81, flip: true, at: 1.15 },
  ],
  fgPeek: { eyeUp: 52, hideGap: 14, hold: [2.6, 4.8], hidden: [0.7, 1.5], light: { door: 0.75, lamp: 0 }, dim: 0.15 },
  // the tap hint: the standard sticker pill (indigo, brass rim, cream outlined text) with the tutorial glove tapping it
  // glove: fingertip on the pill's trailing cap (capIn in from its end, gloveDy under its centre), so the tap ripple lands
  // on the brass rim and never on the words; the hand hangs below the pill, between the two corner peekers
  hint: { w: 266, h: 50, size: 19, y: 0.842, pulseHz: 1.1, breathe: 0.025, minAlpha: 0.78, glove: 44, capIn: 18, gloveDy: 12, gloveRot: 0.22 },
  dare: { y: 0.553, w: 346, h: 38, color: '#a8721e' },        // a friend's dare hangs over the skyline, under the sign
  tap: { punch: 1.05, punchMs: 160, trauma: 0.2, chroma: 0.7, chromaMs: 150, vibrateMs: 12 },
};

// the hint says what a tap does: the monsters cheer and the night starts in the lobby (a dare goes straight to its night)
export const bootDict = {
  en: { 'boot.tap': 'Tap to start the night', 'boot.tap_dare': 'Tap to take the dare', 'boot.tag': 'Tonight YOU run the door' },
  ar: { 'boot.tap': 'المس وابدأ السهرة', 'boot.tap_dare': 'المس واقبل التحدّي', 'boot.tag': 'الليلة الباب بإيدك' },
};

// spring + emit option objects are reused: spring() reads them once at creation
const SP = {
  title: { to: 1, stiffness: 130, damping: 10, velocity: 2.5 },
  titlePop: { to: 1, stiffness: 260, damping: 11, velocity: 2.2 },
  rise: { to: 1, stiffness: 240, damping: 12, velocity: 0 },
  duck: { to: 0, stiffness: 180, damping: 18 },
  pop: { to: 1.0, stiffness: 300, damping: 9, velocity: 9 },
};
const PULSE = { chroma: TUNE.tap.chroma, ms: TUNE.tap.chromaMs };
const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5];
const DO = { alpha: 1, dim: 0, flip: false, light: { door: TUNE.peek.light.door, lamp: TUNE.peek.light.lamp } };
const DO_FG = { alpha: 1, dim: TUNE.fgPeek.dim, flip: false, light: { door: TUNE.fgPeek.light.door, lamp: TUNE.fgPeek.light.lamp } };
const GLOVE_O = { rot: 0, alpha: 1 };
const AN_B = [0.5, 1], AN_T = [0.5, 0];
const PILL_DARE = { icon: 'trophy', color: TUNE.dare.color, alpha: 1 };
const OV_SPARK = { count: 14, colors: ['#ff4fa3', '#ffd166', '#ffffff'] };
const OV_CONF = { count: 26, speed: [220, 460] };
const CHEER = { };

// ---------------------------------------------------------------- state
const st = { t: 0, vis: 0, titleS: 0, lit: 0, flickAt: 5, flickT: -1, leaving: false, leaveT: 0, active: false };
let nextScene = 'home', nextParams = null, dareLp = null, dareStr = '', splashEl = null, splashGone = false;
let bg = null, bgH = -1, groundKey = '', skyKey = '', coneKey = '', starKey = '', FG = 0;
let titleKey = '', neonKey = '', tagKey = '', hintKey = '', titleK = 1, titleW = 330, titleH = 140, titleM = null;
const EYE = logoEye();                             // the lockup's googly eye
let goX = 195, goY = 300;
const BULB_X = new Float32Array(TUNE.sign.bulbs), BULB_Y = new Float32Array(TUNE.sign.bulbs);
const TW = [];                                     // twinkling stars { x, y, hz, ph, r }
const MON = [];                                    // peekers { a, c, p, up, timer, lookT, hide, ... }
const FGM = [];                                    // the two corner peekers in the foreground (same record shape)

for (let i = 0; i < TUNE.orbs.length; i++) { const o = TUNE.orbs[i]; o.key = 'boot.orb.' + o.color; o.bake = bakeOrb(o.color); }
(function initStars() {
  let s = TUNE.stars.seed * 9301 + 49297;
  function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
  for (let i = 0; i < TUNE.stars.twinkle; i++) {
    const hz = TUNE.stars.twinkleHz;
    TW.push({ x: 14 + rnd() * 362, y: 0.04 + rnd() * 0.34, hz: hz[0] + rnd() * (hz[1] - hz[0]), ph: rnd() * TAU, r: 5 + rnd() * 5 });
  }
})();

// ---------------------------------------------------------------- bakes (setup time only)
function bakeOrb(col) {
  return function (c, w, h) {
    c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [
      [0, color.alpha(col, 1)], [0.3, color.alpha(col, 0.62)], [0.65, color.alpha(col, 0.16)], [1, color.alpha(col, 0)],
    ]);
    c.fillRect(0, 0, w, h);
  };
}
function bakeStars(c, w, h) {
  let s = TUNE.stars.seed;
  function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
  for (let i = 0; i < TUNE.stars.n; i++) {
    const x = rnd() * w, y = rnd() * h * (0.35 + 0.65 * rnd()), r = 0.6 + rnd() * 1.3;
    c.globalAlpha = (0.25 + 0.6 * rnd()) * (1 - y / h * 0.6);
    c.fillStyle = rnd() < 0.2 ? '#ffe2b8' : '#e6e1fa';
    draw.circle(c, x, y, r); c.fill();
  }
  c.globalAlpha = 1;
}
function bakeTwinkle(c, w, h) {
  const cx = w / 2, cy = h / 2;
  c.fillStyle = draw.radial(c, cx, cy, 0, w / 2, [[0, 'rgba(255,248,220,0.9)'], [0.25, 'rgba(255,230,190,0.35)'], [1, 'rgba(255,230,190,0)']]);
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#fffaf0';
  draw.star(c, cx, cy, w * 0.3, 0.22, 4); c.fill();
}
function bakeBoard(c, w, h) {
  const S = TUNE.sign, x = 6, y = 6, W = S.w, H = S.h, r = S.r;
  // drop shadow
  c.save(); c.fillStyle = 'rgba(6,4,22,0.5)'; draw.roundRect(c, x + 2, y + 9, W, H, r); c.fill(); c.restore();
  // brass frame
  draw.sticker(c, cc => draw.roundRect(cc, x, y, W, H, r), { fill: S.brass, outline: S.ink, lineWidth: 4, highlight: 0.3, shadow: 0.22 });
  c.save();
  draw.roundRect(c, x, y, W, H, r); c.clip();
  c.fillStyle = draw.gradient(c, 0, y, 0, y + H, [[0, 'rgba(255,240,190,0.35)'], [0.5, 'rgba(255,240,190,0)'], [1, 'rgba(90,50,0,0.35)']]);
  c.fillRect(x, y, W, H);
  c.restore();
  // inner panel
  const ix = x + S.rim + 6, iy = y + S.rim + 6, iw = W - 2 * (S.rim + 6), ih = H - 2 * (S.rim + 6), ir = r - S.rim - 2;
  draw.roundRect(c, ix, iy, iw, ih, ir);
  c.fillStyle = draw.gradient(c, 0, iy, 0, iy + ih, S.panel); c.fill();
  c.lineWidth = 3; c.strokeStyle = S.brassDark; c.stroke();
  c.save();
  draw.roundRect(c, ix, iy, iw, ih, ir); c.clip();
  c.fillStyle = draw.gradient(c, 0, iy, 0, iy + 18, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(ix, iy, iw, 18);
  // faint diagonal velvet sheen
  c.globalAlpha = 0.07; c.fillStyle = '#ffffff';
  for (let i = -2; i < 9; i++) { c.beginPath(); c.moveTo(ix + i * 46, iy + ih); c.lineTo(ix + i * 46 + 22, iy + ih); c.lineTo(ix + i * 46 + 72, iy); c.lineTo(ix + i * 46 + 50, iy); c.closePath(); c.fill(); }
  c.restore();
  // bulb sockets on the brass band (lit bulbs are drawn live)
  for (let i = 0; i < BULB_X.length; i++) {
    const bx = BULB_X[i] + x, by = BULB_Y[i] + y;
    c.fillStyle = S.brassDark; draw.circle(c, bx, by, 3.6); c.fill();
    c.fillStyle = '#ffe9b0'; c.globalAlpha = 0.55; draw.circle(c, bx - 0.6, by - 0.6, 2.3); c.fill(); c.globalAlpha = 1;
  }
}
function bakeBulb(c, w, h) {
  const cx = w / 2, cy = h / 2;
  c.fillStyle = draw.radial(c, cx, cy, 0, w / 2, [[0, 'rgba(255,236,170,0.95)'], [0.22, 'rgba(255,200,110,0.6)'], [0.5, 'rgba(255,179,71,0.18)'], [1, 'rgba(255,179,71,0)']]);
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff6d8'; draw.circle(c, cx, cy, 3.3); c.fill();
}
// the lockup (logo.js) at titleK in a titleW x titleH bake, and its bright neon tube on its own sprite (blended 'lighter',
// alpha = how lit the sign is)
function bakeTitle(c, w, h) { paintLogo(c, w / 2, h / 2, titleK, i18n.lang); }
function bakeNeon(c, w, h) { paintLogoNeon(c, w / 2, h / 2, titleK, i18n.lang); }
// the tagline in the display face (GAME-SPEC §5: Baloo 2, Arabic in Cairo), ink-outlined like every sticker label
function bakeTag(c, w, h) {
  draw.text(c, i18n.t('boot.tag'), w / 2, h / 2, { size: TUNE.tag.size, weight: 800, color: '#ffd9a0', outline: TUNE.sign.ink, outlineWidth: 3.5, maxWidth: w - 12 });
}
// the tap hint: an indigo sticker pill with a brass inner rim and cream outlined text (bake = pill + 8 units of shadow room)
function bakeHint(c, w, h) {
  const H = TUNE.hint, x = 4, y = 3, pw = w - 8, ph = H.h, r = ph / 2, ink = TUNE.sign.ink;
  c.save(); c.fillStyle = 'rgba(6,4,22,0.5)'; draw.roundRect(c, x + 1, y + 5, pw, ph, r); c.fill(); c.restore();
  draw.sticker(c, cc => draw.roundRect(cc, x, y, pw, ph, r), { fill: '#2a2760', outline: ink, lineWidth: 3, highlight: 0.22, shadow: 0.25 });
  draw.roundRect(c, x + 3.4, y + 3.4, pw - 6.8, ph - 6.8, r - 3.4); c.lineWidth = 2.4; c.strokeStyle = TUNE.sign.brass; c.stroke();
  c.save(); c.beginPath(); c.rect(x, y, pw, ph * 0.45); c.clip();
  draw.roundRect(c, x + 2.7, y + 2.7, pw - 5.4, ph - 5.4, r - 2.7); c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,246,214,0.7)'; c.stroke();
  c.restore();
  draw.text(c, i18n.t(dareLp ? 'boot.tap_dare' : 'boot.tap'), x + pw / 2, y + ph / 2 + 1, {
    size: H.size, weight: 800, font: 'Baloo 2', color: '#fff4dc', outline: ink, outlineWidth: 5, maxWidth: pw - 70,
    shadow: 'rgba(0,0,0,0.3)', shadowOffset: 1.5,
  });
}
// a seeded random stream for the bakes (the same skyline / cobbles every launch)
let SEED = 1;
function srnd() { SEED = (SEED * 16807) % 2147483647; return SEED / 2147483647; }
// the night skyline behind the sign: flat-roofed blocks in four deep indigos, a few warm windows, water tanks + antennas,
// a warm haze where it meets the street
function bakeSkyline(c, w, h) {
  const K = TUNE.skyline;
  SEED = K.seed * 7919 + 17;
  let x = -14;
  for (let i = 0; x < w + 10; i++) {
    const bw = 30 + srnd() * 40, bh = h * (0.32 + srnd() * 0.62), top = h - bh;
    c.fillStyle = K.cols[i % K.cols.length];
    c.fillRect(x, top, bw, bh + 2);
    c.fillStyle = 'rgba(160,150,255,0.07)'; c.fillRect(x, top, bw, 1.5);                // a faint roof edge catching the sky
    if (srnd() < 0.3) { c.fillStyle = K.cols[(i + 2) % K.cols.length]; c.fillRect(x + bw * 0.25, top - 9, 11, 9); c.fillRect(x + bw * 0.25 + 2, top - 12, 7, 3); }
    else if (srnd() < 0.3) { c.fillStyle = K.cols[(i + 1) % K.cols.length]; c.fillRect(x + bw * 0.6, top - 16, 1.6, 16); }
    for (let wy = top + 7; wy < h - 6; wy += 11) {
      for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
        const lit = srnd() < K.winP;
        c.fillStyle = lit ? K.win : K.winOff;
        c.globalAlpha = lit ? 0.45 + srnd() * 0.45 : 1;
        c.fillRect(wx, wy, 3.4, 4.6);
      }
    }
    c.globalAlpha = 1;
    x += bw - 1;
  }
  c.fillStyle = draw.gradient(c, 0, h * 0.55, 0, h, [[0, 'rgba(255,179,71,0)'], [1, K.haze]]);
  c.fillRect(0, h * 0.55, w, h * 0.45);
}
// the club's pavement: a kerb, then cobbles in perspective (rows grow toward the viewer, the stones fan out from the
// centre line), a distance fog at the kerb and a dark rim at the bottom
function bakeGround(c, w, h) {
  const G = TUNE.ground, cx = w / 2;
  SEED = G.seed * 7919 + 3;
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, G.fill); c.fillRect(0, 0, w, h);
  let y = G.kerb + 2, r = 0;
  while (y < h) {
    const f = Math.min(1, y / Math.max(1, h * 0.85)), rh = G.rowMin + (G.rowMax - G.rowMin) * Math.pow(f, 1.3);
    const sw = G.stone * (G.k0 + (1 - G.k0) * f * 1.5), off = (r & 1) ? 0.5 : 0, n = Math.ceil(w / sw / 2) + 2;
    const gx = Math.max(0.8, sw * 0.07), gy = Math.max(0.8, rh * 0.13), rad = Math.min(rh, sw) * 0.32;
    for (let i = -n; i <= n; i++) {
      const sx = cx + (i + off) * sw - sw / 2, jw = sw * (0.9 + srnd() * 0.18);
      const a = G.stoneA[0] + srnd() * (G.stoneA[1] - G.stoneA[0]);
      c.fillStyle = 'rgba(150,140,235,' + (a * (0.45 + 0.75 * f)).toFixed(3) + ')';
      draw.roundRect(c, sx + gx, y + gy, Math.max(1, jw - gx * 2), Math.max(1, rh - gy * 2), rad); c.fill();
      c.fillStyle = 'rgba(225,218,255,' + (0.04 + 0.06 * f).toFixed(3) + ')';
      c.fillRect(sx + gx + rad * 0.6, y + gy, Math.max(0, jw - gx * 2 - rad * 1.2), Math.max(0.6, rh * 0.09));
    }
    y += rh; r++;
  }
  // kerb: a dark stone lip with a warm catch-light along its edge
  c.fillStyle = '#0b0a24'; c.fillRect(0, 0, w, G.kerb);
  c.fillStyle = 'rgba(255,214,150,0.22)'; c.fillRect(0, G.kerb, w, 1.2);
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, 0, w, 1);
  c.fillStyle = draw.gradient(c, 0, G.kerb, 0, G.kerb + h * 0.18, [[0, G.fog], [1, 'rgba(18,17,58,0)']]); c.fillRect(0, G.kerb, w, h * 0.18);
  c.fillStyle = draw.gradient(c, 0, h * 0.72, 0, h, [[0, 'rgba(6,5,20,0)'], [1, 'rgba(6,5,20,0.7)']]); c.fillRect(0, h * 0.72, w, h * 0.28);
}
// the amber pool on the cobbles (drawn squashed, additive)
function bakePool(c, w, h) {
  c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [[0, 'rgba(255,200,120,1)'], [0.25, 'rgba(255,170,70,0.7)'], [0.6, 'rgba(240,120,50,0.22)'], [1, 'rgba(240,120,50,0)']]);
  c.fillRect(0, 0, w, h);
}
// the marquee mirrored on the damp cobbles just past the kerb: soft vertical streaks, neon pink under the wordmark and
// amber under the bulbs either side (drawn additive, brightening with the sign)
function bakeRefl(c, w, h) {
  const xs = TUNE.refl.xs, cols = TUNE.refl.cols;
  for (let i = 0; i < xs.length; i++) {
    c.save(); c.translate(w / 2 + xs[i], 0); c.scale(1, TUNE.refl.stretch);
    c.fillStyle = draw.radial(c, 0, 0, 0, TUNE.refl.r[i], [[0, cols[i]], [1, 'rgba(0,0,0,0)']]);
    c.beginPath(); c.arc(0, 0, TUNE.refl.r[i], 0, TAU); c.fill();
    c.restore();
  }
}
// the marquee's spill falling from the sign's bottom edge to the pool (top width = the sign, bottom = the pool)
function bakeCone(c, w, h) {
  const top = TUNE.sign.w * 0.82, bot = w;
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, 'rgba(255,200,120,0.55)'], [0.6, 'rgba(255,179,71,0.18)'], [1, 'rgba(255,179,71,0.05)']]);
  c.beginPath(); c.moveTo(w / 2 - top / 2, 0); c.lineTo(w / 2 + top / 2, 0); c.lineTo(w / 2 + bot / 2, h); c.lineTo(w / 2 - bot / 2, h); c.closePath(); c.fill();
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = draw.gradient(c, 0, 0, w, 0, [[0, 'rgba(0,0,0,0)'], [0.2, 'rgba(0,0,0,0.7)'], [0.5, '#000'], [0.8, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}
function bakePost(c, w, h) {
  const S = TUNE.sign, cx = w / 2, top = 12, foot = h - 10, R = TUNE.rope;
  draw.shadowBlob(c, cx, foot + 2, 22, 6, 0.45);
  draw.sticker(c, cc => draw.ellipse(cc, cx, foot - 4, 19, 7), { fill: S.brass, outline: S.ink, lineWidth: 3, highlight: 0.35, shadow: 0.2 });
  draw.sticker(c, cc => draw.roundRect(cc, cx - 5, top + 8, 10, foot - top - 12, 4), { fill: S.brass, outline: S.ink, lineWidth: 3, highlight: 0.4, shadow: 0.25 });
  draw.sticker(c, cc => draw.ellipse(cc, cx, top + R.ringDy + 2, 9, 4.5), { fill: S.brassDark, outline: S.ink, lineWidth: 2.5, highlight: 0.2, shadow: 0.1 });
  draw.sticker(c, cc => draw.circle(cc, cx, top + 2, 10), { fill: S.brass, outline: S.ink, lineWidth: 3, highlight: 0.5, shadow: 0.25 });
}
// bulb centres along the brass band (sign-local, relative to the board's top-left), clockwise from the top-left corner
function layoutBulbs() {
  const S = TUNE.sign, inset = S.rim * 0.5 + 2, W = S.w - 2 * inset, H = S.h - 2 * inset, r = Math.max(2, S.r - inset);
  const sw = W - 2 * r, sh = H - 2 * r, arc = Math.PI * r / 2, L = 2 * sw + 2 * sh + 4 * arc, n = BULB_X.length;
  for (let i = 0; i < n; i++) {
    let d = (i + 0.5) / n * L, x = 0, y = 0;
    if (d < sw) { x = r + d; y = 0; }
    else if ((d -= sw) < arc) { const a = -Math.PI / 2 + d / r; x = W - r + Math.cos(a) * r; y = r + Math.sin(a) * r; }
    else if ((d -= arc) < sh) { x = W; y = r + d; }
    else if ((d -= sh) < arc) { const a = d / r; x = W - r + Math.cos(a) * r; y = H - r + Math.sin(a) * r; }
    else if ((d -= arc) < sw) { x = W - r - d; y = H; }
    else if ((d -= sw) < arc) { const a = Math.PI / 2 + d / r; x = r + Math.cos(a) * r; y = H - r + Math.sin(a) * r; }
    else if ((d -= arc) < sh) { x = 0; y = H - r - d; }
    else { d -= sh; const a = Math.PI + d / r; x = r + Math.cos(a) * r; y = r + Math.sin(a) * r; }
    BULB_X[i] = x + inset; BULB_Y[i] = y + inset;
  }
}
layoutBulbs();

// ---------------------------------------------------------------- monsters
function rand(a, b) { return a + Math.random() * (b - a); }
function bakeMoon(c, w, h) {
  const M = TUNE.moon, cx = w / 2, cy = h / 2;
  c.fillStyle = draw.radial(c, cx, cy, M.r * 0.8, w / 2, [[0, M.glow], [1, 'rgba(255,236,190,0)']]);
  c.fillRect(0, 0, w, h);
  const m = document.createElement('canvas');
  m.width = c.canvas.width; m.height = c.canvas.height;
  const mc = m.getContext('2d'), k = m.width / w;
  mc.setTransform(k, 0, 0, k, 0, 0);
  draw.sticker(mc, cc => draw.circle(cc, cx, cy, M.r), { fill: M.color, outline: '#c9a96a', lineWidth: 2, highlight: 0.3, shadow: 0.12 });
  mc.globalCompositeOperation = 'destination-out';
  draw.circle(mc, cx + M.r * M.cut, cy - M.r * 0.28, M.r * 0.92); mc.fill();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(m, 0, 0); c.restore();
}
function signTop() { return stage.h * TUNE.sign.y - TUNE.sign.h / 2; }
function signY() { return stage.h * TUNE.sign.y; }
function ensureCast() {
  if (MON.length) return;
  for (let i = 0; i < TUNE.cast.length; i++) {
    const c = TUNE.cast[i], a = createActor(c.spec);
    const b = a.bounds();
    MON.push({ a: a, c: c, p: 0, up: false, timer: 0, lookT: rand(0.4, 1.2), top: -b.y, ducks: i === 1 || i === 3 });
  }
}
// feet y for peek amount p (0 = hidden under the edge, 1 = eyes over it, > 1 = popping up)
function feetFor(m, p) {
  const P = TUNE.peek, s = m.c.s, top = signTop();
  const hidden = top + (m.top + P.hideGap) * s, peek = top + (m.c.eye - P.eyeUp) * s;
  return hidden + (peek - hidden) * p;
}
function rise(m) { m.up = true; m.timer = rand(TUNE.peek.hold[0], TUNE.peek.hold[1]); spring(m, 'p', SP.rise); }
function duck(m) { m.up = false; m.timer = rand(TUNE.peek.hidden[0], TUNE.peek.hidden[1]); spring(m, 'p', SP.duck); }
function lookSomewhere(m, i) {
  const k = Math.random(), P = TUNE.peek;
  m.lookT = rand(P.lookEvery[0], P.lookEvery[1]);
  if (input.isDown) { m.a.look(input.x, input.y); return; }
  if (k < 0.3) m.a.look(null, null);
  else if (k < 0.55) m.a.look(195, stage.h * TUNE.hint.y);
  else if (k < 0.8) { const o = MON[(i + (Math.random() < 0.5 ? 1 : MON.length - 1)) % MON.length]; m.a.look(o.c.x, signTop() - 30); }
  else m.a.look(m.c.x + (m.c.flip ? -120 : 120), signTop() - 80);
}
function updateCast(dt) {
  const P = TUNE.peek;
  for (let i = 0; i < MON.length; i++) {
    const m = MON[i];
    m.a.update(dt);
    if (st.leaving) continue;
    if (!m.up && m.timer <= 0 && st.vis >= P.first + m.c.at) rise(m);
    m.timer -= dt;
    if (m.up && m.ducks && m.timer <= 0 && st.vis > P.duckFrom) duck(m);
    else if (!m.up && m.timer <= 0 && st.vis > P.first + m.c.at) rise(m);
    m.lookT -= dt;
    if (m.lookT <= 0 && m.p > 0.5) lookSomewhere(m, i);
  }
}
function drawCast(ctx) {
  for (let i = 0; i < MON.length; i++) {
    const m = MON[i];
    if (m.p <= 0.005) continue;
    DO.flip = m.c.flip;
    m.a.draw(ctx, m.c.x, feetFor(m, m.p), m.c.s, DO);
  }
}

// ---- the corner peekers: they lean in from below the bottom corners (tilted toward the middle), backlit by the pool
function ensureFg() {
  if (FGM.length) return;
  for (let i = 0; i < TUNE.fg.length; i++) {
    const c = TUNE.fg[i], a = createActor(c.spec), b = a.bounds();
    FGM.push({ a: a, c: c, p: 0, up: false, timer: 0, lookT: rand(0.4, 1.2), top: -b.y, ducks: true });
  }
}
// feet y (before the tilt) for peek amount p: 0 = under the bottom edge, 1 = eyes eyeUp above it
function fgFeet(m, p) {
  const F = TUNE.fgPeek, s = m.c.s, H = stage.h;
  const hidden = H + F.hideGap + m.top * s, peek = H - F.eyeUp + m.c.eye * s;
  return hidden + (peek - hidden) * p;
}
function fgLook(m) {
  m.lookT = rand(TUNE.peek.lookEvery[0], TUNE.peek.lookEvery[1]);
  if (input.isDown) { m.a.look(input.x, input.y); return; }
  const k = Math.random();
  if (k < 0.45) m.a.look(195, signY());                          // the sign
  else if (k < 0.75) m.a.look(195, stage.h * TUNE.hint.y);       // the hint (you)
  else m.a.look((TUNE.rope.x0 + TUNE.rope.x1) / 2, stage.h * TUNE.rope.y);
}
function updateFg(dt) {
  const F = TUNE.fgPeek, P = TUNE.peek;
  for (let i = 0; i < FGM.length; i++) {
    const m = FGM[i];
    m.a.update(dt);
    if (st.leaving) continue;
    m.timer -= dt;
    if (!m.up && m.timer <= 0 && st.vis >= P.first + m.c.at) { m.up = true; m.timer = rand(F.hold[0], F.hold[1]); spring(m, 'p', SP.rise); }
    else if (m.up && m.timer <= 0 && st.vis > P.duckFrom + m.c.at) { m.up = false; m.timer = rand(F.hidden[0], F.hidden[1]); spring(m, 'p', SP.duck); }
    m.lookT -= dt;
    if (m.lookT <= 0 && m.p > 0.4) fgLook(m);
  }
}
function drawFg(ctx) {
  for (let i = 0; i < FGM.length; i++) {
    const m = FGM[i];
    if (m.p <= 0.005) continue;
    DO_FG.flip = m.c.flip;
    ctx.save();
    ctx.translate(m.c.x, fgFeet(m, m.p)); ctx.rotate(m.c.rot);
    m.a.draw(ctx, 0, 0, m.c.s, DO_FG);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- actions
function refreshKeys() {
  const box = logoBox(i18n.lang, 1), M = box.metrics;
  titleK = Math.min(TUNE.title.maxW / M.w, TUNE.title.maxH / M.h);
  const b = logoBox(i18n.lang, titleK);
  titleW = b.w; titleH = b.h; titleM = b.metrics;
  titleKey = 'boot.title.' + i18n.lang + '.' + FG;
  neonKey = 'boot.neon.' + i18n.lang + '.' + FG;
  tagKey = 'boot.tag.' + i18n.lang + '.' + FG;
  hintKey = 'boot.hint.' + i18n.lang + '.' + (dareLp ? 'd' : 'p') + '.' + FG;
  dareStr = dareLp ? (challengeInvite(dareLp, i18n.lang) || i18n.t('challenge_from')) : '';
}
function leave(x, y, tapped) {
  if (st.leaving || scenes.transitioning) return;
  st.leaving = true; st.leaveT = tapped ? TUNE.leaveSec : TUNE.leaveSec * 0.6;
  goX = x; goY = y;
  for (let i = 0; i < MON.length; i++) {
    const m = MON[i];
    SP.pop.to = 1.25 + 0.12 * (i % 2); SP.pop.velocity = 7 + i;
    spring(m, 'p', SP.pop);
    m.a.setState('cheer', CHEER);
    m.a.look(x, y);
  }
  for (let i = 0; i < FGM.length; i++) {
    const m = FGM[i];
    SP.pop.to = 1.12; SP.pop.velocity = 6 + i;
    spring(m, 'p', SP.pop);
    m.a.setState('cheer', CHEER);
    m.a.look(x, y);
  }
  spring(st, 'titleS', SP.titlePop);
  st.flickT = 0;
  if (tapped) {
    particles.emit('burst', x, y);
    particles.emit('sparkle', x, y, OV_SPARK);
    particles.emit('ring', x, y);
    particles.emit('confetti', 195, signTop() + 10, OV_CONF);
    camera.punch(TUNE.tap.punch, TUNE.tap.punchMs);
    camera.addTrauma(TUNE.tap.trauma);
    post.pulse(PULSE);
    party.sfx.stamp();
    party.sfx.voice('round');
    input.vibrate(TUNE.tap.vibrateMs);
  }
}
function go() {
  const p = nextParams || {};
  if (p.mode === 'daily' && nextScene === 'play') { p.startedAt = Date.now(); profile.markDailyStart(p.date, p.startedAt); }   // grace runs from the tap; one attempt counts
  scenes.go(nextScene, p, { transition: 'wipe', ms: 560, x: goX, y: goY });
}

// ---------------------------------------------------------------- scene
export const boot = {
  get state() { return st; },
  get cast() { return MON; },
  get next() { return nextScene; },
  tap(x, y) { leave(x === undefined ? 195 : x, y === undefined ? signY() : y, true); },

  enter(p) {
    p = p || {};
    nextScene = p.next && scenes.has(p.next) ? p.next : 'home';
    nextParams = p.nextParams || null;
    dareLp = p.dare && p.dare.mode ? p.dare : null;
    st.active = true; st.t = 0; st.vis = 0; st.titleS = 0; st.lit = 0; st.flickT = -1; st.flickAt = 5; st.leaving = false; st.leaveT = 0;
    splashEl = typeof document !== 'undefined' ? document.getElementById('splash') : null;
    splashGone = !splashEl || !splashEl.isConnected;
    ensureCast(); ensureFg();
    for (let i = 0; i < MON.length; i++) {
      const m = MON[i];
      m.p = 0; m.up = false; m.timer = 0; m.lookT = rand(0.4, 1.2);
      m.a.setState('idle'); m.a.look(195, stage.h * TUNE.hint.y);
    }
    for (let i = 0; i < FGM.length; i++) {
      const m = FGM[i];
      m.p = 0; m.up = false; m.timer = 0; m.lookT = rand(0.4, 1.2);
      m.a.setState('idle'); m.a.look(195, signY());
    }
    refreshKeys();
    if (splashGone) spring(st, 'titleS', SP.title);   // else the entrance waits for the splash to fade (update)
  },

  exit() {
    st.active = false;
    tweens.killTarget(st);
    for (let i = 0; i < MON.length; i++) tweens.killTarget(MON[i]);
    for (let i = 0; i < FGM.length; i++) tweens.killTarget(FGM[i]);
  },

  update(dt) {
    st.t += dt;
    if (!splashGone) {
      splashGone = !splashEl.isConnected || splashEl.classList.contains('fade') || splashEl.classList.contains('hidden');
      if (splashGone) spring(st, 'titleS', SP.title);
    } else st.vis += dt;
    updateCast(dt);
    updateFg(dt);
    // neon power-on, then a hum with an occasional stutter
    const T = TUNE.title, PO = T.powerOn, pt = st.vis - 0.2;
    let lit = 1;
    if (pt < PO[PO.length - 2]) { lit = 0; for (let i = 0; i < PO.length; i += 2) if (pt >= PO[i]) lit = PO[i + 1]; }
    else {
      st.flickAt -= dt;
      if (st.flickAt <= 0) { st.flickAt = T.flickEvery[0] + Math.random() * (T.flickEvery[1] - T.flickEvery[0]); st.flickT = 0; }
      if (st.flickT >= 0) {
        st.flickT += dt;
        if (st.flickT > T.flickDur) st.flickT = -1;
        else lit = Math.sin(st.flickT * T.flickHz + Math.sin(st.flickT * 17) * 2) > -0.2 ? 1 : 0.2;
      }
      lit *= 1 - T.hum * (0.5 + 0.5 * noise1(st.t * 7.3));
    }
    st.lit = lit;
    const ts = st.titleS * (1 + Math.sin(st.t * T.breatheHz * TAU) * T.breathe);
    stepLogoEye(EYE, dt, titleM, 195, signY() + T.dy, titleK * ts, input.isDown || st.leaving, st.leaving ? goX : input.x, st.leaving ? goY : input.y);
    if (st.leaving) {
      st.leaveT -= dt;
      if (st.leaveT <= 0 && !scenes.transitioning && scenes.current === boot) go();
    } else if (!dareLp && st.vis >= TUNE.autoSec) leave(195, signY(), false);
  },

  render(ctx) {
    const w = stage.w, h = stage.h, P = TUNE.bgPad, t = st.t, vis = clamp(st.titleS, 0, 1);
    // sky + stars + party-coloured orbs
    if (!bg || bgH !== h) {
      bg = draw.gradient(ctx, 0, 0, 0, h, TUNE.bg); bgH = h;
      const hk = Math.round(h);
      starKey = 'boot.stars.' + hk; groundKey = 'boot.ground.' + hk; skyKey = 'boot.sky.' + hk; coneKey = 'boot.cone.' + hk;
    }
    ctx.fillStyle = bg; ctx.fillRect(-P, -P, w + P * 2, h + P * 2);
    SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1;
    const sh = Math.round(h * TUNE.stars.h);
    draw.sprite(ctx, draw.cached(starKey, w, sh, bakeStars), w / 2, sh / 2, SPR);
    const M = TUNE.moon;
    draw.sprite(ctx, draw.cached('boot.moon', M.px, M.px, bakeMoon), M.x, h * M.y + Math.sin(t * 0.5) * 2, SPR);
    for (let i = 0; i < TW.length; i++) {
      const s = TW[i], a = 0.5 + 0.5 * Math.sin(t * s.hz * TAU + s.ph);
      if (a < 0.08) continue;
      SPR.scale = s.r * (0.6 + 0.5 * a) / 16; SPR.alpha = a; SPR.rot = t * 0.4 + s.ph;
      draw.sprite(ctx, draw.cached('boot.twinkle', 32, 32, bakeTwinkle), s.x, h * s.y, SPR);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    SPR.rot = 0;
    for (let i = 0; i < TUNE.orbs.length; i++) {
      const o = TUNE.orbs[i];
      const x = w * (0.5 + o.ax * noise1(t * o.speed + o.seed));
      const y = h * (o.cy + o.ay * noise1(t * o.speed * 0.83 + o.seed + 100));
      SPR.scale = (o.r * 2) / TUNE.orbPx; SPR.sx = 1; SPR.sy = 1; SPR.alpha = o.alpha;
      draw.sprite(ctx, draw.cached(o.key, TUNE.orbPx, TUNE.orbPx, o.bake), x, y, SPR);
    }
    ctx.restore();
    // the skyline behind the sign, then the club's pavement from the kerb down
    const G = TUNE.ground, R = TUNE.rope, gy = Math.round(h * G.y), ry = h * R.y, skyTop = Math.round(h * TUNE.skyline.top);
    SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0; SPR.sx = 1; SPR.sy = 1;
    SPR.anchor = AN_B;
    const BW = 390 + 2 * P;                              // as wide as the sky fill, so a camera shake never shows an edge
    draw.sprite(ctx, draw.cached(skyKey, BW, gy - skyTop + 2, bakeSkyline), w / 2, gy + 1, SPR);
    SPR.anchor = AN_T;
    const gh = Math.max(40, Math.round(h - gy + P));
    draw.sprite(ctx, draw.cached(groundKey, BW, gh, bakeGround), w / 2, gy, SPR);
    SPR.anchor = AN_C;
    particles.draw(ctx, 'back');
    // the sign: warm glow, the peekers BEHIND it, the board, lit bulbs, wordmark, tagline
    const S = TUNE.sign, sy = signY(), top = signTop(), left = w / 2 - S.w / 2;
    draw.glow(ctx, w / 2, sy - 10, S.glowR, S.glow, S.glowA * vis);
    drawCast(ctx);
    SPR.alpha = 1; SPR.scale = 1; SPR.rot = 0;
    draw.sprite(ctx, draw.cached('boot.board', S.w + 12, S.h + 20, bakeBoard), w / 2, top + (S.h + 20) / 2 - 6, SPR);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const chase = Math.floor(t * S.chaseHz), bulb = draw.cached('boot.bulb', 22, 22, bakeBulb);
    for (let i = 0; i < BULB_X.length; i++) {
      if ((i + chase) % 3 !== 0) continue;
      SPR.alpha = 0.95 * (0.4 + 0.6 * st.lit);
      draw.sprite(ctx, bulb, left + BULB_X[i], top + BULB_Y[i], SPR);
    }
    ctx.restore();
    const T = TUNE.title, ty = sy + T.dy, ts = st.titleS * (1 + Math.sin(t * T.breatheHz * TAU) * T.breathe);
    if (ts > 0.01) {
      draw.glow(ctx, w / 2, ty, T.glowR, T.neon, T.glowA * st.lit * vis);
      SPR.scale = ts; SPR.alpha = 1;
      draw.sprite(ctx, draw.cached(titleKey, titleW, titleH, bakeTitle), w / 2, ty, SPR);
      if (st.lit > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        SPR.alpha = st.lit;
        draw.sprite(ctx, draw.cached(neonKey, titleW, titleH, bakeNeon), w / 2, ty, SPR);
        ctx.restore();
      }
      drawLogoEye(ctx, w / 2, ty, titleK * ts, titleM, EYE.x, EYE.y, EYE.blink);
      SPR.scale = 1; SPR.alpha = clamp((st.vis - 0.6) / 0.4, 0, 1);
      draw.sprite(ctx, draw.cached(tagKey, TUNE.tag.w, TUNE.tag.h, bakeTag), w / 2, sy + TUNE.tag.dy, SPR);
    }
    // the marquee's spill down to the pavement and the pool of amber light the rope stands in (warming as the sign lights)
    const PO = TUNE.pool, py = h * PO.y, sb = top + S.h + 4, lit = 0.55 + 0.45 * st.lit;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const RF = TUNE.refl;
    SPR.anchor = AN_T; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = RF.a * st.lit * vis;
    if (SPR.alpha > 0.01) draw.sprite(ctx, draw.cached('boot.refl', 390, RF.h, bakeRefl), w / 2, gy + G.kerb + 1, SPR);
    SPR.anchor = AN_T; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = PO.coneA * lit * vis * 2;
    draw.sprite(ctx, draw.cached(coneKey, PO.rx * 2, Math.max(20, Math.round(py - sb)), bakeCone), w / 2, sb, SPR);
    SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = PO.rx * 2 / PO.px; SPR.sy = PO.ry * 2 / PO.px;
    SPR.alpha = (PO.a + PO.beat * Math.sin(t * S.chaseHz * 0.5)) * lit * Math.max(0.35, vis);
    draw.sprite(ctx, draw.cached('boot.pool', PO.px, PO.px, bakePool), w / 2, py, SPR);
    ctx.restore();
    SPR.sx = 1; SPR.sy = 1;
    // rope: two posts, a sagging velvet rope that sways a little, gold tassels hanging at the hooks
    const postC = draw.cached('boot.post', 48, R.postH + 22, bakePost), postY = ry + R.postH / 2 - 6;
    SPR.alpha = 1; SPR.scale = 1; SPR.anchor = AN_C;
    const ringY = postY - (R.postH + 22) / 2 + 12 + R.ringDy, sway = Math.sin(t * R.swayHz * TAU) * R.swayPx;
    draw.sprite(ctx, postC, R.x0, postY, SPR);
    draw.sprite(ctx, postC, R.x1, postY, SPR);
    ctx.save();
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      ctx.beginPath();
      ctx.moveTo(R.x0 + 4, ringY + (pass === 2 ? -2 : 0));
      ctx.quadraticCurveTo((R.x0 + R.x1) / 2 + sway, ringY + R.sag * 2 + (pass === 2 ? -2.5 : 0), R.x1 - 4, ringY + (pass === 2 ? -2 : 0));
      ctx.lineWidth = pass === 0 ? 13 : pass === 1 ? 8.5 : 2.6;
      ctx.strokeStyle = pass === 0 ? R.dark : pass === 1 ? R.color : R.hi;
      ctx.stroke();
    }
    ctx.fillStyle = R.tassel; ctx.strokeStyle = TUNE.sign.ink; ctx.lineWidth = 1.6;
    for (let j = 0; j < 2; j++) {
      const tx = j ? R.x1 - 9 : R.x0 + 9, sw2 = Math.sin(t * R.swayHz * TAU + j) * 1.5;
      ctx.beginPath(); ctx.moveTo(tx - 3, ringY + 4); ctx.lineTo(tx + 3, ringY + 4); ctx.lineTo(tx + 4.5 + sw2, ringY + 15); ctx.lineTo(tx - 4.5 + sw2, ringY + 15); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, ringY + 3.5, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // the corner peekers lean in over everything on the street
    drawFg(ctx);
    // the friend's dare + the tap hint
    if (dareStr) {
      const D = TUNE.dare, a = clamp((st.vis - 0.7) / 0.35, 0, 1);
      if (a > 0) {
        PILL_DARE.alpha = a;
        const k = 0.85 + 0.15 * a + 0.025 * Math.sin(t * 5.4);
        ctx.save(); ctx.translate(w / 2, h * D.y); ctx.scale(k, k);
        drawPill(ctx, 0, 0, D.w, D.h, dareStr, PILL_DARE);
        ctx.restore();
      }
    }
    // the tap hint: the sticker pill breathing, the glove tapping at its trailing end
    const H = TUNE.hint, wave = 0.5 + 0.5 * Math.sin(t * H.pulseHz * TAU), inA = clamp((st.vis - 0.5) / 0.4, 0, 1);
    const ha = (H.minAlpha + (1 - H.minAlpha) * wave) * inA * (st.leaving ? 0.4 : 1), hy = h * H.y;
    if (ha > 0.01) {
      SPR.anchor = AN_C; SPR.rot = 0; SPR.sx = 1; SPR.sy = 1; SPR.alpha = ha; SPR.scale = (0.9 + 0.1 * inA) * (1 + H.breathe * wave);
      draw.sprite(ctx, draw.cached(hintKey, H.w + 8, H.h + 10, bakeHint), w / 2, hy + 2, SPR);
      if (!st.leaving) {
        const edge = i18n.isRTL ? -1 : 1;
        GLOVE_O.rot = -edge * H.gloveRot; GLOVE_O.alpha = inA;
        drawGlove(ctx, w / 2 + edge * (H.w / 2 - H.capIn), hy + H.gloveDy, H.glove, t, GLOVE_O);
      }
    }
  },

  onInput(evt, d) {
    if (evt === 'down') { leave(d.x, d.y, true); return true; }
    return evt === 'up' || evt === 'tap' || evt === 'move';
  },
};

stage.onResize(() => { bg = null; });
i18n.onChange(refreshKeys);
draw.ready().then(() => { FG++; refreshKeys(); });
refreshKeys();
