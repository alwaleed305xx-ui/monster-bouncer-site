// icons.js: the Monster Bouncer icon + UI kit (GAME-SPEC §5, §11). Clause pictograms in has/not badges, the hanging rule poster
// (bake + sway / slam / tear), the IN / OUT decision plates, strike lamps, tier stamps, NICE / OOPS stamp words, HUD pills,
// chunky buttons, round icon buttons over a vector glyph set, count badges and the tutorial pointing glove.
// Every piece is a sticker painted once per (variant, size, language) into an offscreen bake and blitted with
// drawImage, so a frame allocates nothing: memo lookups compare fields, never build keys. Sizes snap to TUNE.quant for
// the bake and are drawn scaled to the exact value, so animate with ctx transforms, not by changing size every frame.
// Bakes match the stage resolution; withBakeRes(pxPerUnit, fn) re-bakes everything drawn inside fn at a higher one (the
// 1080x1920 share card) in a separate cache, so the stage sprites stay untouched.
// Coordinates are design units and every x, y is a CENTRE (drawPoster: the nail the strings hang from; drawGlove: the
// fingertip; drawStrikeLamp: the glass bulb). Text comes from i18n when the key is loaded, else a built-in EN / AR list.
// Pictograms (bold silhouettes filling ~85 % of the face, read at ~52 px on a 375 px phone, still legible at 32): colour =
// the whole face is a swatch of the guest's OWN rendered hue (actor.js COLORS) inside a white keyline, carrying the
// guest's birthmark (drawColorMark) big, so colour is never hue-only; eyes = white eggs with an indigo iris looking aside
// under a lid shade + rim: 1 big centred eye (two lashes, so it never reads as a target), 2 side by side, 3 in a 2-over-1
// triangle; hat = ONE bold pink striped party cone with a small gold crown + top hat tucked behind it as accents, off the
// NOT slash's diagonal; tail = a stubby indigo body end with a long, thick, tapering mustard curl (1.35 turns, a dark band
// ring + dark tip, the guests' real-tail marks); pattern = a bold indigo fabric tile with cream polka dots / horizontal
// stripes running off its edges (cloth, never a die). Has / NOT ride on the ring colour + the slash only (no corner
// sticker): NOT = red ring + a thin dark ink slash under a white keyline, the pictogram only faded TUNE.clause.fade
// beneath it. drawClauseIcon's `mark` ('ok' / 'bad', the WHY feedback) never recolours the ring (a red ring only ever
// means NOT): it adds a separate green check / red cross sticker at the upper-right corner. The rule poster is the
// clause row only (badges 62 / 62 / 60 for 1 / 2 / 3 clauses, packed into the same 212 x 97.4 footprint); its
// playbill topper tab shows only on the centre reveal, where drawPoster (above TUNE.poster.hiAt scale) blits a 2x bake.
// Seals: the tier is carried by metal + art (the result ribbon names it), the rim carries the game title (+ an optional
// sub line, e.g. "Night 7");
// Shut Down is its own velvet-red / charcoal seal with a chipped edge, a crack and a cut, frayed velvet rope, no glint.
// A broken strike lamp keeps the full bulb in smoked glass with a white crack, a red X badge and a smoke wisp.
// Buttons take opts.rim (an inner ring, e.g. brass on the indigo secondary sticker) and opts.iconColor (glyph fill).
// The trick-guest kit: drawTag is a die-cut brass hang tag stabbed onto a spot by a push pin and swinging on its string
// (x, y = the pin; the FAKE! tag on a ripped-off prop, a VIP / inspector badge, a night modifier pinned on the revealed
// poster via drawPoster's opts.tag), drawTape a loose torn strip of the guests' tape (the one that flutters off a busted
// fake), and the glyphs bolt (a QUICK call's sticker), tape (taped on / a double-fake night), badge (VIP pass), pin (re-pin).
// Built-in words cover the trick payoffs too: label('busted') / label('catch') / label('quick') before strings.js has them.
// Plate skins (docs/MONETIZATION.md §3.4, plate.<classic|studs|candy|neon|gold|crystal>): only the rim changes; the IN /
// OUT velvet hues, the glyphs and the label never do. drawPlate's 11th argument picks a skin for one call, else the one
// setPlateSkin(id) chose (PLATE_SKINS lists them). neon glows brighter while pressed; gold sweeps a sheen across its rim
// when a press is released (the verdict), on the game clock.
import { draw, color } from '../core/draw.js';
import { text } from '../core/text.js';
import { i18n } from '../core/i18n.js';
import { stage } from '../core/stage.js';
import { TAU, clamp, lerp, smoothstep, noise1, rng, easeIndex } from '../core/math.js';
import { loop } from '../core/loop.js';
import { COLORS as GUEST_COLORS, drawColorMark } from './actor.js';

const TUNE = {
  ink: '#1d1840', paper: '#f8eed6', brass: '#d9a441', brassDark: '#8a5a14', amber: '#ffb347',
  // the guests' RENDERED palette (actor.js), so a poster drop is always the exact hue the player sees on the guest
  hues: GUEST_COLORS,
  pict: '#4a4190',                        // neutral indigo for the non-colour pictograms (never one of the six guest hues)
  quant: 2,                               // bake sizes snap to this step; drawing scales to the exact size asked for
  memoCap: 160, posterCap: 48, maxBake: 4096,
  // smallest bake per piece: tinier draws (pop-in springs from 0) blit this bake scaled down instead of baking
  // negative insets / radii, which would make the core roundRect / arc throw and stop the loop
  minBake: { plateW: 48, plateH: 40, btn: 16, icon: 12, pill: 12, badge: 10, clause: 12, lamp: 10, tier: 24, word: 8, glyph: 8, glove: 16,
    tag: 8, tape: 8 },
  // badge geometry x size: ink rim + polarity ring (outer .. inner), an ink keyline, the tinted face (radius ~1.14 P, P =
  // pict x size: every pictogram spans ~0.97 P = ~85 % of the face, so it reads on a 375 px phone where a 3-clause
  // badge is ~52 px). The ring colour + the NOT slash carry has / NOT on their own: a plain badge has no corner sticker
  clause: {
    pad: 0.17, outer: 0.48, inner: 0.365, outline: 0.048, minOutline: 1.5, pict: 0.3,
    yes: '#2fc46a', no: '#ef3b55', fillYes: '#f2fbe8', fillNo: '#fdeeee', dropA: 0.3,
    // NOT: a thin dark ink bar (slash x badge size) under a white keyline (key x size, at least minKey units a side);
    // the pictogram under it is only faded by `fade`, so the "what" always reads
    slash: 0.064, key: 0.032, minKey: 1.0, slashCol: '#2b1a3a', keyCol: '#ffffff', fade: 0.15,
    // verdict mark (drawClauseIcon's `mark`, the WHY feedback after a wrong call): ring + face KEEP their polarity colour
    // (a red ring only ever means NOT); the verdict is a separate die-cut sticker (radius markR x size, centred markAt x
    // size from the badge centre at angle markA = the upper-right corner, clear of the NOT slash, half over the ring): a
    // white-edged green check (ok) or red cross (bad); markEdge = its white die-cut rim x the outline
    markR: 0.25, markAt: 0.55, markA: -0.785, markEdge: 1.1,
  },
  // colour pictogram: the whole face is a swatch of the guest's OWN rendered hue (actor.js COLORS) inside a white keyline
  // (key x the outline: coral never merges with the red NOT ring, lime / mint never with the green one) carrying the
  // colour's birthmark big in the middle (actor.js drawColorMark, mark x P across, dy x P down), so colour is never
  // hue-only; light hues (CIE L* > lightL: lime 91, mustard 82, the split actor.js uses) get a softer highlight
  swatch: { key: 0.85, hi: 0.42, hiLite: 0.16, mark: 1.3, markLite: 1.36, dy: 0.04, lightL: 78, gloss: 'rgba(255,255,255,0.7)' },
  // eyes pictogram (no thin details: lashes only on the lone eye): egg sclera (r x P, tall x), placed per count `at` [x, y
  // x P]: 1 = one big centred eye, 2 = side by side, 3 = a 2-over-1 triangle filling the face; iris (x er) looking aside
  // by look, lid line weight (x outline) from lidA0 to lidA1 (x PI), lid shade (lidDrop x the egg's height)
  eyes: { r: [0.7, 0.48, 0.38], tall: 1.1, at: [[0, 0.05], [-0.53, 0.06, 0.53, 0.06], [-0.46, -0.31, 0.46, -0.31, 0, 0.47]],
    iris: 0.62, look: [0.2, 0.14], lid: 1.3, lidA0: 1.1, lidA1: 1.9, lidShade: '#d8d1f4', lidDrop: 0.2,
    lashes: [-2.45, -0.69], lashL: 0.34, lashW: 1.15 },
  // tail pictogram: a stubby indigo body end (an ellipse [x, y, rx, ry] x P on the left edge, mostly off the face) with a
  // long, thick curly tail growing out of its back: a stem [root x, y, control x, y] sweeping into a spiral (centre x, y,
  // start radius r0 -> end radius r1, x P, over `turns` turns, sampled every `step` rad) in mustard (body x P stroke,
  // tapering taper[0] -> taper[1] root to tip, ink edge olK x the outline) with one dark band ring (ring [from, to] along
  // the path, 0..1) and a dark tip (the last `tip` of the path), the guests' real-tail marks (no pom / tuft: a pom +
  // ribbon is the FAKE tail's look), and a gloss streak (alpha gloss) along the outer edge of the curl over glossAt
  tail: { butt: [-1.18, 0.1, 0.6, 0.95], stem: [-0.66, 0.2, -0.22, 0.6], spiral: [0.26, -0.1, 0.6, 0.1], turns: 1.35, step: 0.12,
    body: 0.24, taper: [1.25, 0.72], olK: 0.62, col: GUEST_COLORS.mustard, dark: 0.55, ring: [0.17, 0.24], tip: 0.16, buttCol: '#4a4190',
    gloss: 0.55, glossAt: [0.03, 0.3] },
  // 'any hat' pictogram: ONE bold hero party cone [base centre x, y, height, half base] x P (pink + three wide white
  // stripes, yellow pom pomR x P, heavier outline x coneOl) with two small accents tucked behind it, both on the axis
  // perpendicular to the NOT slash so they survive it: a gold crown (lower left) and a top hat (upper right) [x, y of the
  // brim centre, size, rot] x P
  hat: {
    cone: [0.04, 0.78, 1.6, 0.66], coneOl: 1.15, pomR: 0.24, stripeH: 0.14, stripes: [0.36, 0.6, 0.84],
    crown: [-0.64, 0.5, 0.3, -0.26], top: [0.6, -0.3, 0.27, -0.12], accOl: 0.62,
    party: '#ff4fa3', stripe: '#fff6fb', pom: '#ffd23f', topCol: '#2d2745', topBand: '#ef3b5d',
    crownCol: '#ffc83d', gem: '#ff3d6e',
  },
  // pattern pictogram: a bold fabric tile (rounded square, half side `half`, corner r, tilted rot, x P) in a neutral indigo
  // with the pattern in light cream running OFF its edges (so it reads as fabric, never as a die): polka dots [x, y] of
  // radius dotR on a staggered grid, or horizontal stripes [y] stripeW thick (crossed cleanly by the diagonal NOT slash)
  tile: { half: 0.8, r: 0.26, rot: -0.1, body: '#4a4190', ink: '#fff0cc', olK: 1,
    dots: [-0.64, -0.8, 0, -0.8, 0.64, -0.8, -0.96, -0.27, -0.32, -0.27, 0.32, -0.27, 0.96, -0.27, -0.64, 0.27, 0, 0.27, 0.64, 0.27,
      -0.96, 0.8, -0.32, 0.8, 0.32, 0.8, 0.96, 0.8], dotR: 0.2,
    stripes: [-0.54, 0, 0.54], stripeW: 0.27 },
  // card = padTop + icon + padBot (+ strH 16 of string + torn edge + shadow below the nail). The clause row is the whole
  // card: iconN = the badge per clause count [1, 2, 3] (the 3-clause badge 60: ~55 units at the nail's 0.92 scale, >= 52
  // px on a 375 px phone), the badges packed close (padX card margin, plus = the gap a '+' (plusK x plus) bridges), so
  // the footprint stays the old 212 x 97.4 posterBox() the street layout clears (the widest card x the deepest foot) while
  // every badge grew. The door header is no longer on the card: it is a small topper tab (header units tall) that only
  // shows on the centre reveal (opts.header, default by scale headAt0 .. headAt1)
  poster: {
    iconN: [62, 62, 60], plus: 11, plusK: 0.6, padX: 5, padTop: 5, header: 10.5, padBot: 7, minW: 76, headAt0: 1.12, headAt1: 1.4,
    // topper [w, h] centred topperDy above the card's top edge (in the string triangle, clear of the nail, the grommets and
    // the badges); corner tape strips shrink on narrow cards (x card width / tapeW, at most 1)
    topper: [32, 14], topperDy: 3.5, headPop: 0.25, tapeW: 140,
    strH: 16, grommetIn: 13, grommetY: 8, pad: 16, shadowDy: 5, shadowBlur: 9, shadowA: 0.5,
    torn: 2.4, tornStep: 6.5, rough: 0.7, lines: 6.5, fibres: 22,
    swayAmp: 0.03, swayHz: 0.32, wobAmp: 0.014, wobHz: 0.7,
    // tear: each half pivots on its own grommet (inner edge drops, the rip opens along the whole seam), drifts out by
    // tearDx, falls tearFall (ease-in), and flutters: tearFlut rad of rocking over tearFlutN cycles plus a paper-turn squash
    tearPts: 15, tearAmp: 4.5, tearDx: 30, tearFall: 170, tearRot: 0.86, tearHold: 0.04, tearLet: 0.3,
    tearFlut: 0.2, tearFlutN: 1.6, tearSq: 0.3, tearSway: 10,
    nailR: 3.4, string: '#efe2c4', stringShadow: 'rgba(20,10,30,0.55)',
    // drawn above hiAt scale (a centre-screen rule reveal) the card blits from a second bake at hiK x the resolution
    hiAt: 1.1, hiK: 2,
    // opts.tag (a night modifier on the reveal): a hang tag of tagSize pinned tagAt [x of the card width right of centre,
    // units up from the card's bottom edge: on the paper margin under the badges], dangling below the card
    tagAt: [0.24, 3.5], tagSize: 10,
  },
  plate: {
    // skins: rim width per skin, studs gap, the gold sheen's sweep time (s), neon's press glow
    skin: { rimW: { classic: 2.8, studs: 4, candy: 5.2, neon: 2.4, gold: 4.6, crystal: 4.6 }, studGap: 13, sheen: 0.55, neonPress: 0.9 },
    radius: 0.22, maxRadius: 30, depth: 0.075, minDepth: 6, press: 0.06, pressDrop: 0.85,
    glowR: 0.85, glowA: 0.85, rimA: 0.95, rimBlur: 16, glyph: 0.48, label: 0.235,
    out: { col: '#b3203a', glow: '#ff4d6d' }, in: { col: '#1f9d55', glow: '#4dff9a' }, text: '#fff8ea',
  },
  // strike lamp; a broken one (a strike) keeps the full bulb in smoked glass (glass stops) with a white crack, a red X
  // badge (xR x bulb radius, centred at xAt) and a smoke wisp rising off the top (the bake grows wispH x size upward)
  lamp: { glow: 1.35, glowA: 0.6, core: 0.5, coreA: 0.32,
    smoke: [[0, '#4d4888'], [0.55, '#2a2760'], [1, '#161437']], crack: 'rgba(255,255,255,0.92)', x: '#ff4d5e', xR: 0.38, xAt: [0.62, 0.52],
    wispH: 0.24, wisp: 'rgba(214,208,240,0.8)' },
  tiers: {
    gold: { ink: '#ffc93c', deep: '#7a4a00', glint: true },
    silver: { ink: '#dfe8f4', deep: '#4a566e', glint: true },
    bronze: { ink: '#ec9558', deep: '#6e3510', glint: true },
    rope: { ink: '#ff7898', deep: '#741330', glint: false },
    // Shut Down: its own seal (paintShut): velvet-red rim band, charcoal core, a cut velvet rope, crack + chips, no glint
    shut: { ink: '#b3203a', deep: '#2a0a14', glint: false, core: '#2b2433', rope: '#e8455c', ropeDeep: '#4a0a18', text: '#ffe4dc' },
  },
  // seal rim: the game title on top, an optional sub line (drawTierStamp's `sub`, e.g. "Night 7") below, else three stars;
  // below `small` units the bottom ring is always the stars and the title grows (8 px ring text is unreadable)
  stamp: { tilt: -0.1, glintPer: 2.8, glintDur: 0.75, glintA: 0.9, specks: 0.9, small: 110, ringFs: 0.1, smallFs: 0.12, arc: 2.5, smallArc: 2.95 },
  // shut seal: chips [angle, half width (rad), depth (x R)], the crack polyline + branch in seal units (x size, centred)
  shut: {
    chips: [-2.3, 0.16, 0.07, 0.55, 0.12, 0.055, 2.55, 0.1, 0.05], wobble: 0.012,
    crack: [0.5, 0.2, 0.41, 0.15, 0.36, 0.21, 0.29, 0.19, 0.24, 0.25, 0.16, 0.22, 0.1, 0.26],
    branch: [0.36, 0.21, 0.39, 0.28, 0.35, 0.33],
    // the rope line across the core, hooked at both sides, cut in the middle: each half [hook x, y, control x, y, end x, y]
    ropeA: [-0.238, -0.06, -0.07, -0.07, -0.075, 0.1], ropeB: [0.238, -0.06, 0.08, -0.06, 0.085, 0.115], ropeW: 0.052, fray: 0.062,
    frayN: 7, fraySpread: 0.95, crackW: 0.022,
  },
  word: { slam: 0.22, fadeIn: 0.07, from: 1.9, rot: -0.12, rotFrom: -0.28, specks: 1.4 },
  // opts.rim paints a ring of that colour (rimW units, inset rimIn) just inside the ink outline: the brass edge of the
  // secondary sticker (indigo #2a2760 fill, rim #d9a441, cream text, iconColor = the one coloured accent)
  button: { radius: 0.42, depth: 0.12, minDepth: 4, press: 0.04, pressDrop: 0.85, text: 0.42, color: '#ffb347', textColor: '#fffaf0', glowA: 0.6, rimW: 2.6, rimIn: 2.9 },
  iconBtn: { depth: 0.08, minDepth: 3, glyph: 0.5, color: '#3b3584', press: 0.07, pressDrop: 0.85, glyphColor: '#ffffff', off: '#ff4d5e', rimW: 2.4, rimIn: 2.8 },
  pill: { color: '#221f5c', text: '#fff4dc', size: 0.56 },
  badge: { color: '#ff4d6d', text: '#ffffff', size: 0.56 },
  glove: { hz: 1.25, bob: 0.14, squash: 0.06, ring: 0.5, ringA: 0.5 },
  // hang tag (drawTag), x the font size: a brass body (h tall, pad of side room, corner r x h, a stamped inner rim inset
  // rim) with a round ear on top [w, h] holding a grommet eyelet (hole radius eye), a cord str long up to a push pin (head
  // radius pinR, colour pin); glyph = the optional glyph's box, gap to the word. Motion: slams in from `from` scale with
  // outBack over `slam` s (fadeIn s of alpha), then swings about the pin: starts `swing` rad out (opts.dir picks the side),
  // decays at damp / s, hz swings a second, plus an idle sway of idle rad at idleHz
  tag: { col: '#e8b34a', ink: '#1d1840', pin: '#ef3b55', h: 1.42, pad: 0.46, r: 0.24, rim: 0.13, ear: [0.92, 0.66], eye: 0.15,
    str: 1.0, pinR: 0.3, glyph: 1.05, gap: 0.2, slam: 0.2, fadeIn: 0.06, from: 1.7, swing: 0.75, damp: 3.4, hz: 1.5,
    idle: 0.035, idleHz: 0.45 },
  // a loose strip of the guests' tape (drawTape; actor.js palette: cream, translucent, torn ends): h x len wide, fill
  // alpha a, a tan edge, a gloss streak and one crease where it was ripped
  tape: { col: '#fff1b3', line: '#b39a4c', a: 0.9, h: 0.3, gloss: 'rgba(255,255,255,0.75)' },
};

const INK = TUNE.ink;
const NO = {};
const EMPTY = [];
const HUE_IDX = { coral: 0, lime: 1, sky: 2, grape: 3, mustard: 4, mint: 5 };
const ATTR_IDX = { color: 0, eyes: 1, hat: 2, tail: 3, pattern: 4 };
const PAT_IDX = { stripes: 0, dots: 1, none: 2 };

// Built-in labels; i18n wins whenever the key is loaded (js/game/strings.js), so these only cover dev pages / early boot.
const FALL = {
  // busted = a trap liar bounced (its fake ripped off), catch = a verdict-flipping shapeshifter called right, quick = the
  // speed bonus sticker, fake = the tag on a fake prop
  en: { in: 'IN', out: 'OUT', nice: 'NICE', oops: 'OOPS', lastcall: 'LAST CALL', gold: 'Gold Rope', silver: 'Silver Rope',
    bronze: 'Bronze Rope', rope: 'Rope Holder', shut: 'Shut Down', title: 'Monster Bouncer', busted: 'BUSTED!', catch: 'NICE CATCH!',
    quick: 'QUICK!', fake: 'FAKE!', vip: 'VIP' },
  ar: { in: 'ادخل', out: 'برّا', nice: 'حلو', oops: 'لا لا', lastcall: 'آخر طلب', gold: 'الحبل الذهبي', silver: 'الحبل الفضي',
    bronze: 'الحبل البرونزي', rope: 'ماسك الحبل', shut: 'سكّروها', title: 'بودي قارد الوحوش', busted: 'انكشف!', catch: 'عين صقر!',
    quick: 'سريع!', fake: 'مزيّف!', vip: 'VIP' },
};

export const GLYPH_NAMES = ['pause', 'home', 'gear', 'band', 'share', 'retry', 'next', 'lang', 'sound', 'music', 'vibrate', 'left',
  'close', 'calendar', 'moon', 'trophy', 'play', 'star', 'check', 'flame', 'lock', 'arrowL', 'arrowR', 'boot', 'door',
  'bolt', 'tape', 'badge', 'pin'];
export const TIERS = ['gold', 'silver', 'bronze', 'rope', 'shut'];
export const CLAUSE_HUES = TUNE.hues;

// ---------------------------------------------------------------- caches
let gen = 0;          // bumps on resize and when fonts arrive: every memo re-bakes at the new resolution / with real glyphs
function bump() { gen++; }
stage.onResize(bump);
draw.ready().then(bump);

// bake resolution: device pixels per design unit. RES > 0 is a withBakeRes() override; it routes every lookup to the
// MH / *H caches (which drop their contents whenever RES changes), so stage-resolution sprites are never replaced.
let RES = 0;
function bres() { return RES > 0 ? RES : draw.res(); }
function bake(w, h, fn) {
  const res = bres(), cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.min(TUNE.maxBake, Math.ceil(w * res)));
  cv.height = Math.max(1, Math.min(TUNE.maxBake, Math.ceil(h * res)));
  cv.designW = w; cv.designH = h; cv.res = res;
  const c = cv.getContext('2d');
  c.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
  fn(c, w, h);
  return cv;
}

function memo(cap) { return { list: [], cap: cap || TUNE.memoCap, next: 0, gen: -1, res: 0 }; }
function mget(m, a, b, c, d, e, f, g, h, k) {
  if (m.gen !== gen || m.res !== RES) { m.list.length = 0; m.next = 0; m.gen = gen; m.res = RES; return null; }
  const L = m.list;
  for (let i = 0; i < L.length; i++) {
    const it = L[i];
    if (it.a === a && it.b === b && it.c === c && it.d === d && it.e === e && it.f === f && it.g === g && it.h === h && it.k === k) return it.cv;
  }
  return null;
}
function mput(m, cv, a, b, c, d, e, f, g, h, k) {
  const it = { a: a, b: b, c: c, d: d, e: e, f: f, g: g, h: h, k: k, cv: cv };
  if (m.list.length < m.cap) m.list.push(it);
  else { m.list[m.next] = it; m.next = (m.next + 1) % m.cap; }
  return cv;
}
function memoSet(hi) {
  const k = hi ? 0.25 : 1, n = v => Math.max(4, Math.round(v * k));
  return {
    plate: memo(n(16)), plateBase: memo(n(16)), rim: memo(n(16)), btn: memo(n(160)), btnBase: memo(n(160)), icon: memo(n(160)),
    iconBase: memo(n(160)), glyph: memo(n(160)), pill: memo(n(160)), badge: memo(n(160)), lamp: memo(n(24)), tier: memo(n(24)),
    glint: memo(n(8)), word: memo(n(32)), glove: memo(n(8)), tag: memo(n(24)), tape: memo(n(16)),
  };
}
const M = memoSet(false), MH = memoSet(true);
let MC = M;                                   // the memo set in use: M at stage resolution, MH inside withBakeRes
const clauseMap = new Map(), clauseMapH = new Map();
let clauseGen = -1, clauseGenH = -1, clauseResH = 0;
const posterMap = new Map(), posterMapH = new Map();
let posterGen = -1, posterGenH = -1, posterResH = 0;
const posters = new WeakMap(), postersH = new WeakMap();
let emptyE = null, emptyEH = null;

// withBakeRes(pxPerUnit, fn) -> fn's result: everything drawn inside fn is baked at pxPerUnit device pixels per design
// unit (e.g. 1080 / 390 for the share card) instead of the stage's. Nesting restores the outer value.
export function withBakeRes(res, fn) {
  const prevR = RES, prevM = MC;
  RES = res > 0 ? res : 0;
  MC = RES > 0 ? MH : M;
  try { return fn(); } finally { RES = prevR; MC = prevM; }
}

function q(v) { const s = TUNE.quant; const r = Math.round(v / s) * s; return r < s ? s : r; }
function blit(ctx, cv, x, y, sx, sy) {
  const w = cv.designW * sx, h = cv.designH * sy;
  ctx.drawImage(cv, x - w / 2, y - h / 2, w, h);
}
export function clearIconCache() { bump(); clauseMap.clear(); clauseMapH.clear(); posterMap.clear(); posterMapH.clear(); }

// label(key): the loaded i18n string, else the built-in EN / AR fallback (returns stored strings: no allocation)
export function label(key) {
  if (i18n.has(key)) return i18n.t(key);
  const d = FALL[i18n.lang] || FALL.en;
  const s = d[key];
  if (s !== undefined) return s;
  return FALL.en[key] !== undefined ? FALL.en[key] : key;
}

let measureCtx = null;
function mctx() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

// ---------------------------------------------------------------- glyph set (unit box [-1, 1], two passes: outlines, then fills)
let GP = 0, GOL = 0.1, GFILL = '#fff', GOUT = INK;
function gf(c) {                       // fill a closed shape
  if (GP === 0) { c.lineWidth = GOL * 2; c.strokeStyle = GOUT; c.stroke(); }
  else if (GP === 1) { c.fillStyle = GFILL; c.fill(); }
}
function gl(c, lw) {                   // stroke a line shape
  if (GP === 0) { c.lineWidth = lw + GOL * 2; c.strokeStyle = GOUT; c.stroke(); }
  else if (GP === 1) { c.lineWidth = lw; c.strokeStyle = GFILL; c.stroke(); }
}
function gx(c, col) { if (GP === 1) { c.fillStyle = col; c.fill(); } }          // detail fill (fill pass only)
function pf(c) { c.lineWidth = GOL * 2; c.strokeStyle = GOUT; c.stroke(); c.fillStyle = GFILL; c.fill(); }   // overlay pass
function pl(c, lw) { c.lineWidth = lw + GOL * 2; c.strokeStyle = GOUT; c.stroke(); c.lineWidth = lw; c.strokeStyle = GFILL; c.stroke(); }

function crescent(c, x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.sqrt(dx * dx + dy * dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const px = x1 + a * dx / d, py = y1 + a * dy / d, ox = -dy / d * h, oy = dx / d * h;
  const ax = px + ox, ay = py + oy, bx = px - ox, by = py - oy;
  c.beginPath();
  c.arc(x1, y1, r1, Math.atan2(ay - y1, ax - x1), Math.atan2(by - y1, bx - x1), false);
  c.arc(x2, y2, r2, Math.atan2(by - y2, bx - x2), Math.atan2(ay - y2, ax - x2), true);
  c.closePath();
}
function bootPath(c) {
  c.beginPath();
  c.moveTo(-0.04, -0.9); c.lineTo(0.52, -0.9);
  c.lineTo(0.54, 0.42); c.quadraticCurveTo(0.56, 0.66, 0.38, 0.68);
  c.lineTo(-0.7, 0.68); c.quadraticCurveTo(-0.98, 0.66, -0.97, 0.4);
  c.quadraticCurveTo(-0.95, 0.1, -0.6, 0.04); c.lineTo(-0.16, -0.04);
  c.quadraticCurveTo(-0.05, -0.12, -0.05, -0.32);
  c.closePath();
}

const GLYPHS = {
  pause(c) { draw.roundRect(c, -0.6, -0.72, 0.42, 1.44, 0.16); gf(c); draw.roundRect(c, 0.18, -0.72, 0.42, 1.44, 0.16); gf(c); },
  home(c) {
    draw.roundRect(c, 0.34, -0.8, 0.24, 0.5, 0.05); gf(c);
    c.beginPath(); c.moveTo(0, -0.88); c.lineTo(0.92, -0.04); c.lineTo(0.68, -0.04); c.lineTo(0.68, 0.82);
    c.lineTo(-0.68, 0.82); c.lineTo(-0.68, -0.04); c.lineTo(-0.92, -0.04); c.closePath(); gf(c);
    draw.roundRect(c, -0.2, 0.24, 0.4, 0.58, [0.2, 0.2, 0, 0]); gx(c, GOUT);
  },
  gear(c) {
    const n = 8, w = TAU / n, r0 = 0.64, r1 = 0.94;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i * w - Math.PI / 2;
      const p0 = a - w * 0.5, p1 = a - w * 0.27, p2 = a - w * 0.17, p3 = a + w * 0.17, p4 = a + w * 0.27;
      if (i === 0) c.moveTo(Math.cos(p0) * r0, Math.sin(p0) * r0); else c.lineTo(Math.cos(p0) * r0, Math.sin(p0) * r0);
      c.lineTo(Math.cos(p1) * r0, Math.sin(p1) * r0); c.lineTo(Math.cos(p2) * r1, Math.sin(p2) * r1);
      c.lineTo(Math.cos(p3) * r1, Math.sin(p3) * r1); c.lineTo(Math.cos(p4) * r0, Math.sin(p4) * r0);
    }
    c.closePath(); gf(c);
    draw.circle(c, 0, 0, 0.27); gx(c, GOUT);
  },
  band(c) {             // House Band: a horned blob monster singing (big round "O" mouth) with a music note floating off it
    // the note (behind, upper right): stem + flag stroked, head filled; outlines merge with the monster's in pass 0
    c.beginPath(); c.moveTo(0.7, 0.06); c.lineTo(0.7, -0.84); gl(c, 0.15);
    c.beginPath(); c.moveTo(0.7, -0.84); c.bezierCurveTo(0.98, -0.72, 1.04, -0.5, 0.88, -0.28); gl(c, 0.15);
    c.save(); c.translate(0.5, 0.1); c.rotate(-0.42); draw.ellipse(c, 0, 0, 0.25, 0.18); c.restore(); gf(c);
    // two stubby horns, then the dome (actor.js blob: a squat jelly dome with a scalloped hem)
    c.beginPath(); c.moveTo(-0.78, -0.12); c.quadraticCurveTo(-0.92, -0.44, -0.74, -0.62); c.quadraticCurveTo(-0.66, -0.36, -0.48, -0.26); c.closePath(); gf(c);
    c.beginPath(); c.moveTo(0.06, -0.26); c.quadraticCurveTo(0.24, -0.36, 0.3, -0.62); c.quadraticCurveTo(0.48, -0.42, 0.34, -0.1); c.closePath(); gf(c);
    c.beginPath();
    c.moveTo(-0.98, 0.7);
    c.bezierCurveTo(-1.04, 0.1, -0.78, -0.4, -0.3, -0.4);
    c.bezierCurveTo(0.18, -0.4, 0.44, 0.1, 0.38, 0.7);
    c.quadraticCurveTo(0.36, 0.86, 0.22, 0.84); c.quadraticCurveTo(0.06, 0.8, -0.06, 0.86);
    c.quadraticCurveTo(-0.2, 0.92, -0.36, 0.86); c.quadraticCurveTo(-0.52, 0.8, -0.68, 0.86);
    c.quadraticCurveTo(-0.94, 0.92, -0.98, 0.7);
    c.closePath(); gf(c);
    if (GP === 1) {
      // face: two ink eyes glancing up at the note, a round singing mouth
      c.fillStyle = GOUT;
      draw.circle(c, -0.56, 0.08, 0.12); c.fill(); draw.circle(c, -0.06, 0.08, 0.12); c.fill();
      draw.ellipse(c, -0.3, 0.48, 0.15, 0.19); c.fill();
      c.fillStyle = GFILL; draw.circle(c, -0.52, 0.04, 0.045); c.fill(); draw.circle(c, -0.02, 0.04, 0.045); c.fill();
    }
  },
  share(c) {
    c.beginPath(); c.moveTo(-0.3, -0.14); c.lineTo(-0.66, -0.14); c.lineTo(-0.66, 0.82); c.lineTo(0.66, 0.82); c.lineTo(0.66, -0.14); c.lineTo(0.3, -0.14); gl(c, 0.2);
    c.beginPath(); c.moveTo(0, 0.36); c.lineTo(0, -0.74); gl(c, 0.2);
    c.beginPath(); c.moveTo(-0.36, -0.42); c.lineTo(0, -0.8); c.lineTo(0.36, -0.42); gl(c, 0.2);
  },
  retry(c) {
    const r = 0.6, cy = 0.08, a0 = -0.22 * Math.PI, a1 = 1.4 * Math.PI;
    c.beginPath(); c.arc(0, cy, r, a0, a1, false); gl(c, 0.22);
    const ex = Math.cos(a1) * r, ey = cy + Math.sin(a1) * r, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
    c.beginPath();
    c.moveTo(ex + tx * 0.42, ey + ty * 0.42);
    c.lineTo(ex + nx * 0.36 - tx * 0.08, ey + ny * 0.36 - ty * 0.08);
    c.lineTo(ex - nx * 0.36 - tx * 0.08, ey - ny * 0.36 - ty * 0.08);
    c.closePath(); gf(c);
  },
  next(c) {
    c.beginPath(); c.moveTo(-0.74, 0); c.lineTo(0.3, 0); gl(c, 0.3);
    c.beginPath(); c.moveTo(0.04, -0.62); c.lineTo(0.84, 0); c.lineTo(0.04, 0.62); c.closePath(); gf(c);
  },
  lang(c) {
    draw.circle(c, 0, 0, 0.82); gf(c);
    if (GP === 1) {
      c.strokeStyle = GOUT; c.lineWidth = 0.11;
      c.beginPath(); c.ellipse(0, 0, 0.36, 0.82, 0, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(-0.82, 0); c.lineTo(0.82, 0); c.stroke();
      c.beginPath(); c.moveTo(0, -0.82); c.lineTo(0, 0.82); c.stroke();
      c.beginPath(); c.moveTo(-0.7, -0.42); c.quadraticCurveTo(0, -0.3, 0.7, -0.42); c.stroke();
      c.beginPath(); c.moveTo(-0.7, 0.42); c.quadraticCurveTo(0, 0.3, 0.7, 0.42); c.stroke();
    }
  },
  sound(c) {
    c.beginPath(); c.moveTo(-0.8, -0.3); c.lineTo(-0.42, -0.3); c.lineTo(0.0, -0.7); c.lineTo(0.0, 0.7); c.lineTo(-0.42, 0.3); c.lineTo(-0.8, 0.3); c.closePath(); gf(c);
    c.beginPath(); c.arc(0.06, 0, 0.36, -0.85, 0.85); gl(c, 0.15);
    c.beginPath(); c.arc(0.06, 0, 0.7, -0.85, 0.85); gl(c, 0.15);
  },
  music(c) {
    c.beginPath(); c.moveTo(0.12, 0.48); c.lineTo(0.12, -0.8); gl(c, 0.17);
    c.beginPath(); c.moveTo(0.12, -0.8); c.bezierCurveTo(0.52, -0.64, 0.74, -0.38, 0.52, -0.02); gl(c, 0.17);
    c.save(); c.translate(-0.18, 0.54); c.rotate(-0.42); draw.ellipse(c, 0, 0, 0.36, 0.26); c.restore(); gf(c);
  },
  vibrate(c) {
    draw.roundRect(c, -0.34, -0.76, 0.68, 1.52, 0.16); gf(c);
    draw.roundRect(c, -0.2, -0.56, 0.4, 0.92, 0.06); gx(c, GOUT);
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 0.58, -0.38); c.lineTo(s * 0.58, 0.38); gl(c, 0.13);
      c.beginPath(); c.moveTo(s * 0.86, -0.2); c.lineTo(s * 0.86, 0.2); gl(c, 0.13);
    }
  },
  left(c) {             // left-hand mode: the two plates trade places (swap arrow over them)
    draw.roundRect(c, -0.94, 0.16, 0.8, 0.66, 0.16); gf(c);
    draw.roundRect(c, 0.14, 0.16, 0.8, 0.66, 0.16); gf(c);
    if (GP === 1) {
      c.fillStyle = GOUT;
      c.beginPath(); c.moveTo(-0.4, 0.3); c.lineTo(-0.68, 0.49); c.lineTo(-0.4, 0.68); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0.4, 0.3); c.lineTo(0.68, 0.49); c.lineTo(0.4, 0.68); c.closePath(); c.fill();
    }
    c.beginPath(); c.moveTo(-0.5, -0.12); c.quadraticCurveTo(0, -0.96, 0.5, -0.12); gl(c, 0.17);
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 0.6, 0.06); c.lineTo(s * 0.21, -0.07); c.lineTo(s * 0.7, -0.35); c.closePath(); gf(c);
    }
  },
  close(c) {
    c.beginPath(); c.moveTo(-0.56, -0.56); c.lineTo(0.56, 0.56); gl(c, 0.3);
    c.beginPath(); c.moveTo(0.56, -0.56); c.lineTo(-0.56, 0.56); gl(c, 0.3);
  },
  calendar(c) {
    draw.roundRect(c, -0.8, -0.62, 1.6, 1.44, 0.22); gf(c);
    if (GP === 1) {
      c.save(); draw.roundRect(c, -0.8, -0.62, 1.6, 1.44, 0.22); c.clip();
      c.fillStyle = '#ff5a6e'; c.fillRect(-0.84, -0.66, 1.68, 0.44); c.restore();
      c.fillStyle = GOUT;
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { draw.circle(c, -0.42 + k * 0.42, 0.12 + r * 0.38, 0.1); c.fill(); }
    }
    draw.roundRect(c, -0.5, -0.9, 0.18, 0.44, 0.09); gf(c);
    draw.roundRect(c, 0.32, -0.9, 0.18, 0.44, 0.09); gf(c);
  },
  moon(c) {
    crescent(c, -0.06, 0.04, 0.8, 0.36, -0.3, 0.62); gf(c);
    draw.star(c, 0.5, -0.36, 0.24, 0.42, 4); gf(c);
  },
  trophy(c) {
    c.beginPath(); c.arc(-0.56, -0.38, 0.26, Math.PI * 0.5, Math.PI * 1.5); gl(c, 0.14);
    c.beginPath(); c.arc(0.56, -0.38, 0.26, -Math.PI * 0.5, Math.PI * 0.5); gl(c, 0.14);
    c.beginPath(); c.moveTo(-0.6, -0.78); c.lineTo(0.6, -0.78); c.lineTo(0.54, -0.22);
    c.quadraticCurveTo(0.44, 0.26, 0, 0.3); c.quadraticCurveTo(-0.44, 0.26, -0.54, -0.22); c.closePath(); gf(c);
    draw.roundRect(c, -0.13, 0.22, 0.26, 0.34, 0.04); gf(c);
    draw.roundRect(c, -0.48, 0.52, 0.96, 0.28, 0.08); gf(c);
    if (GP === 1) { draw.star(c, 0, -0.3, 0.22, 0.45, 5); c.fillStyle = GOUT; c.fill(); }
  },
  play(c) { c.beginPath(); c.moveTo(-0.46, -0.74); c.lineTo(0.82, 0); c.lineTo(-0.46, 0.74); c.closePath(); gf(c); },
  star(c) { draw.star(c, 0, 0.06, 0.92, 0.48, 5); gf(c); },
  check(c) { c.beginPath(); c.moveTo(-0.62, 0.02); c.lineTo(-0.18, 0.48); c.lineTo(0.66, -0.52); gl(c, 0.3); },
  flame(c) {
    c.beginPath(); c.moveTo(0.02, -0.92);
    c.bezierCurveTo(0.5, -0.46, 0.78, -0.08, 0.64, 0.38); c.quadraticCurveTo(0.5, 0.86, 0, 0.88);
    c.quadraticCurveTo(-0.5, 0.86, -0.64, 0.38); c.bezierCurveTo(-0.72, 0.02, -0.44, -0.12, -0.26, -0.4);
    c.bezierCurveTo(-0.1, -0.12, 0.12, -0.4, 0.02, -0.92); c.closePath(); gf(c);
    if (GP === 1) {
      c.beginPath(); c.moveTo(0.02, -0.08); c.bezierCurveTo(0.3, 0.14, 0.42, 0.42, 0.3, 0.6);
      c.quadraticCurveTo(0.16, 0.76, 0, 0.76); c.quadraticCurveTo(-0.18, 0.76, -0.3, 0.6);
      c.bezierCurveTo(-0.4, 0.38, -0.2, 0.18, 0.02, -0.08); c.closePath(); c.fillStyle = TUNE.amber; c.fill();
    }
  },
  lock(c) {
    c.beginPath(); c.arc(0, -0.24, 0.38, Math.PI, TAU, false); c.lineTo(0.38, 0.0); c.moveTo(-0.38, 0.0); c.lineTo(-0.38, -0.24); gl(c, 0.2);
    draw.roundRect(c, -0.62, -0.18, 1.24, 1.02, 0.2); gf(c);
    if (GP === 1) {
      c.fillStyle = GOUT; draw.circle(c, 0, 0.22, 0.14); c.fill();
      draw.roundRect(c, -0.06, 0.24, 0.12, 0.3, 0.04); c.fill();
    }
  },
  arrowR(c) {
    c.beginPath(); c.moveTo(-0.46, 0); c.lineTo(0.32, 0); gl(c, 0.3);
    c.beginPath(); c.moveTo(0.1, -0.58); c.lineTo(0.9, 0); c.lineTo(0.1, 0.58); c.closePath(); gf(c);
    c.beginPath(); c.moveTo(-0.96, -0.34); c.lineTo(-0.66, -0.34); gl(c, 0.13);
    c.beginPath(); c.moveTo(-0.96, 0.34); c.lineTo(-0.66, 0.34); gl(c, 0.13);
  },
  boot(c) {
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0.68, -0.52 + i * 0.34); c.lineTo(0.96 - i * 0.06, -0.52 + i * 0.34); gl(c, 0.12); }
    bootPath(c); gf(c);
    if (GP === 1) {
      c.save(); bootPath(c); c.clip();
      c.fillStyle = GOUT; c.fillRect(-1.1, 0.5, 2.2, 0.3);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-0.1, -0.92, 0.7, 0.2);
      c.restore();
      c.strokeStyle = GOUT; c.lineWidth = 0.08;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-0.02, -0.6 + i * 0.18); c.lineTo(0.22, -0.66 + i * 0.18); c.stroke(); }
    }
  },
  door(c) {
    draw.roundRect(c, -0.64, -0.9, 0.98, 1.76, [0.49, 0.49, 0.06, 0.06]); gf(c);
    if (GP === 1) {
      draw.roundRect(c, -0.5, -0.76, 0.7, 1.5, [0.35, 0.35, 0.02, 0.02]);
      c.fillStyle = '#ffcf6e'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.45)'; draw.ellipse(c, -0.15, -0.1, 0.22, 0.5); c.fill();
    }
    c.beginPath(); c.moveTo(0.2, -0.74); c.lineTo(0.64, -0.94); c.lineTo(0.64, 1.0); c.lineTo(0.2, 0.76); c.closePath(); gf(c);
    if (GP === 1) { c.fillStyle = GOUT; draw.circle(c, 0.53, 0.08, 0.065); c.fill(); }
    if (GP === 2) {
      c.beginPath(); c.moveTo(-1.0, 0.14); c.lineTo(-0.36, 0.14); pl(c, 0.24);
      c.beginPath(); c.moveTo(-0.46, -0.22); c.lineTo(-0.04, 0.14); c.lineTo(-0.46, 0.5); c.closePath(); pf(c);
    }
  },
  bolt(c) {             // speed (a QUICK call): one bold lightning bolt with a gloss streak down its upper limb
    c.beginPath(); c.moveTo(0.02, -0.94); c.lineTo(0.52, -0.94); c.lineTo(0.12, -0.2); c.lineTo(0.62, -0.2);
    c.lineTo(-0.3, 0.96); c.lineTo(-0.06, 0.16); c.lineTo(-0.56, 0.16); c.closePath(); gf(c);
    if (GP === 1) {
      c.beginPath(); c.moveTo(0.12, -0.84); c.lineTo(0.3, -0.84); c.lineTo(-0.12, -0.06); c.lineTo(-0.3, -0.06); c.closePath();
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill();
    }
  },
  tape(c) {             // taped on (a fake part, a double-fake night): two crossed strips of tape, torn ends, the top one over
    tapePath(c, -0.62); gf(c);
    if (GP === 1) { tapeGloss(c, -0.62); }
    if (GP === 2) { tapePath(c, 0.62); pf(c); tapeGloss(c, 0.62); }
  },
  badge(c) {            // a VIP pass on a lanyard (a VIP / inspector guest): white card, clip slot, gold star, name line
    c.beginPath(); c.moveTo(-0.62, -0.96); c.lineTo(-0.12, -0.42); c.moveTo(0.62, -0.96); c.lineTo(0.12, -0.42); gl(c, 0.16);
    draw.roundRect(c, -0.56, -0.5, 1.12, 1.42, 0.18); gf(c);
    if (GP === 1) {
      c.fillStyle = GOUT;
      draw.roundRect(c, -0.2, -0.38, 0.4, 0.11, 0.055); c.fill();
      draw.roundRect(c, -0.32, 0.66, 0.64, 0.1, 0.05); c.fill();
      draw.star(c, 0, 0.18, 0.38, 0.47, 5); c.fillStyle = '#ffc93c'; c.fill();
      c.lineWidth = GOL * 0.9; c.strokeStyle = GOUT; c.lineJoin = 'round'; c.stroke();
    }
  },
  pin(c) {              // a push pin, leaning (a re-pin night: the rules get pinned again)
    c.rotate(0.5);
    c.beginPath(); c.moveTo(0, 0.24); c.lineTo(0, 0.98); gl(c, 0.12);
    draw.roundRect(c, -0.62, 0.02, 1.24, 0.26, 0.12); gf(c);
    c.beginPath(); c.moveTo(-0.3, 0.08); c.lineTo(-0.22, -0.56); c.lineTo(0.22, -0.56); c.lineTo(0.3, 0.08); c.closePath(); gf(c);
    draw.roundRect(c, -0.5, -0.86, 1.0, 0.34, 0.15); gf(c);
    if (GP === 1) {
      c.fillStyle = 'rgba(29,24,64,0.2)';
      c.beginPath(); c.moveTo(0.08, 0.06); c.lineTo(0.12, -0.54); c.lineTo(0.22, -0.54); c.lineTo(0.28, 0.06); c.closePath(); c.fill();
      draw.roundRect(c, 0.16, -0.82, 0.28, 0.26, 0.1); c.fill();
    }
  },
};
// one tape strip of the 'tape' glyph (unit box), rotated by ang about the centre, with torn zigzag ends
function tapePath(c, ang) {
  const L = 0.94, H = 0.27;
  c.save(); c.rotate(ang);
  c.beginPath(); c.moveTo(-L, -H); c.lineTo(L, -H); c.lineTo(L + 0.09, -H * 0.4); c.lineTo(L - 0.03, 0.04); c.lineTo(L + 0.07, H * 0.55);
  c.lineTo(L, H); c.lineTo(-L, H); c.lineTo(-L - 0.08, H * 0.45); c.lineTo(-L + 0.03, -0.03); c.lineTo(-L - 0.09, -H * 0.5); c.closePath();
  c.restore();
}
function tapeGloss(c, ang) {
  c.save(); c.rotate(ang);
  c.beginPath(); c.moveTo(-0.78, -0.13); c.lineTo(0.78, -0.13);
  c.lineCap = 'round'; c.lineWidth = 0.09; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
  c.restore();
}
const GLYPH_ALIAS = { arrowL: 'arrowR' };

// paints glyph `name` centred at cx, cy into a box of `s` design units (white fill + dark outline by default)
function paintGlyph(c, name, cx, cy, s, fill, out, flip) {
  let key = name, fl = !!flip;
  if (GLYPH_ALIAS[name]) { key = GLYPH_ALIAS[name]; fl = !fl; }
  const fn = GLYPHS[key];
  if (!fn) return;
  const u = s / 2;
  c.save();
  c.translate(cx, cy); c.scale(fl ? -u : u, u);
  c.lineJoin = 'round'; c.lineCap = 'round';
  GOL = Math.max(1.3, s * 0.06) / u; GFILL = fill || '#fff'; GOUT = out || INK;
  for (GP = 0; GP < 3; GP++) { c.save(); fn(c); c.restore(); }
  GP = 0;
  c.restore();
}

// ---------------------------------------------------------------- clause pictograms
// Every pictogram is drawn around (cx, cy) in units of P (= TUNE.clause.pict x the badge size) and spans ~0.97 P of the
// ~1.14 P face: bold silhouettes, thick ink, no hairline details, so each one reads at ~50 px on a 375 px phone.
// CIE L* of a guest hue (the split actor.js uses for its light bodies), memoised per hue key at bake time
const LSTAR = {};
function lstarOf(key) {
  let v = LSTAR[key];
  if (v === undefined) {
    const p = color.parse(TUNE.hues[key] || '#cccccc'), f = u => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
    const Y = 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
    v = Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
    LSTAR[key] = v;
  }
  return v;
}
// colour clause: the whole face is the swatch (rf = the face radius): a white keyline, the guest's own hue with a sticker
// highlight + a gloss arc, and the colour's birthmark (actor.js drawColorMark, the guests' own dark mark) big in the middle
function pictSwatch(c, key, cx, cy, P, ol, rf) {
  const SW = TUNE.swatch, hue = TUNE.hues[key] || '#cccccc', lite = lstarOf(key) > SW.lightL, r = Math.max(0.5, rf - ol * SW.key);
  c.fillStyle = '#ffffff'; draw.circle(c, cx, cy, rf + 1); c.fill();
  draw.sticker(c, cc => draw.circle(cc, cx, cy, r), { fill: hue, lineWidth: 0, highlight: lite ? SW.hiLite : SW.hi, shadow: 0.22 });
  c.lineCap = 'round'; c.strokeStyle = SW.gloss; c.lineWidth = Math.max(0.8, r * 0.11);
  c.beginPath(); c.arc(cx, cy, r * 0.78, Math.PI * 1.1, Math.PI * 1.38); c.stroke();
  if (GUEST_COLORS[key]) drawColorMark(c, key, cx, cy + P * SW.dy, P * (lite ? SW.markLite : SW.mark));
}
// eyes clause: white eggs with an indigo iris + ink pupil looking aside under a lid shade + lid line and a heavy upper
// rim (the real guests' eye); 1 = one big centred eye (with two lashes, so it never reads as a target), 2 = side by side,
// 3 = a 2-over-1 triangle that fills the face
function pictEyes(c, n, cx, cy, P, ol) {
  n = clamp(n | 0, 1, 3);
  const E = TUNE.eyes, A = E.at[n - 1], er = P * E.r[n - 1], ery = er * E.tall;
  for (let i = 0; i < n; i++) {
    const ex = cx + A[i * 2] * P, ey = cy + A[i * 2 + 1] * P;
    draw.sticker(c, cc => draw.ellipse(cc, ex, ey, er, ery), { fill: '#ffffff', outline: INK, lineWidth: ol, highlight: 0.1, shadow: 0.24 });
    const ir = er * E.iris, ix = ex + er * E.look[0], iy = ey + er * E.look[1];
    c.save(); draw.ellipse(c, ex, ey, Math.max(0.2, er - ol * 0.5), Math.max(0.2, ery - ol * 0.5)); c.clip();
    c.fillStyle = TUNE.pict; draw.circle(c, ix, iy, ir); c.fill();
    c.fillStyle = INK; draw.circle(c, ix + ir * 0.06, iy + ir * 0.04, ir * 0.56); c.fill();
    c.fillStyle = '#ffffff'; draw.circle(c, ix - ir * 0.36, iy - ir * 0.38, ir * 0.32); c.fill();
    // the upper lid, a little closed: a lavender shade over the top of the egg down to a curved lid edge
    const ly = ey - ery + ery * 2 * E.lidDrop;
    c.beginPath(); c.moveTo(ex - er * 1.2, ey - ery * 1.2); c.lineTo(ex + er * 1.2, ey - ery * 1.2);
    c.lineTo(ex + er * 1.2, ly - ery * 0.2); c.quadraticCurveTo(ex, ly + ery * 0.24, ex - er * 1.2, ly - ery * 0.2); c.closePath();
    c.fillStyle = E.lidShade; c.fill();
    c.beginPath(); c.moveTo(ex - er * 1.2, ly - ery * 0.2); c.quadraticCurveTo(ex, ly + ery * 0.24, ex + er * 1.2, ly - ery * 0.2);
    c.lineWidth = ol * 0.8; c.strokeStyle = INK; c.stroke();
    c.restore();
    // upper rim: a heavier ink arc over the top of the egg (+ the lone eye's two lashes flicking out from it)
    c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = ol * E.lid;
    c.beginPath(); c.ellipse(ex, ey, er, ery, 0, Math.PI * E.lidA0, Math.PI * E.lidA1); c.stroke();
    if (n === 1) {
      c.lineWidth = ol * E.lashW;
      for (let k = 0; k < E.lashes.length; k++) {
        const a = E.lashes[k], ox = ex + Math.cos(a) * er, oy = ey + Math.sin(a) * ery, l = er * E.lashL;
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * l * 1.05, oy + Math.sin(a) * l); c.stroke();
      }
    }
  }
}
// 'any hat' (data.ruleAccepts: party, top or crown): ONE bold striped party cone (pink, three wide white stripes, yellow
// pom, heavier outline) with a small gold crown (lower left) and a small top hat (upper right) tucked behind it as accents,
// both off the NOT slash's diagonal, so "every hat counts" still shows under the slash
function crownPath(cc, s) {
  cc.beginPath(); cc.moveTo(-s, 0); cc.lineTo(-s * 1.1, -s * 1.25); cc.lineTo(-s * 0.45, -s * 0.66); cc.lineTo(0, -s * 1.5);
  cc.lineTo(s * 0.45, -s * 0.66); cc.lineTo(s * 1.1, -s * 1.25); cc.lineTo(s, 0); cc.quadraticCurveTo(0, s * 0.24, -s, 0); cc.closePath();
}
function topHatPath(cc, s) {
  cc.beginPath(); cc.moveTo(-s * 0.68, -s * 0.1); cc.lineTo(-s * 0.76, -s * 1.6); cc.quadraticCurveTo(0, -s * 1.74, s * 0.76, -s * 1.6);
  cc.lineTo(s * 0.68, -s * 0.1); cc.quadraticCurveTo(0, s * 0.06, -s * 0.68, -s * 0.1); cc.closePath();
}
function pictHat(c, cx, cy, P, ol) {
  const H = TUNE.hat, aol = ol * H.accOl;
  let k = H.crown, s = k[2] * P;
  c.save(); c.translate(cx + k[0] * P, cy + k[1] * P); c.rotate(k[3]);
  draw.sticker(c, cc => crownPath(cc, s), { fill: H.crownCol, outline: INK, lineWidth: aol, highlight: 0.45, shadow: 0.18, bounds: [-s * 1.1, -s * 1.5, s * 2.2, s * 1.62] });
  c.fillStyle = H.gem; draw.circle(c, 0, -s * 0.36, s * 0.24); c.fill();
  c.restore();
  k = H.top; s = k[2] * P;
  c.save(); c.translate(cx + k[0] * P, cy + k[1] * P); c.rotate(k[3]);
  draw.sticker(c, cc => topHatPath(cc, s), { fill: H.topCol, outline: INK, lineWidth: aol, highlight: 0.3, shadow: 0.2, bounds: [-s * 0.76, -s * 1.74, s * 1.52, s * 1.7] });
  c.fillStyle = H.topBand;
  c.beginPath(); c.moveTo(-s * 0.7, -s * 0.3); c.quadraticCurveTo(0, -s * 0.2, s * 0.7, -s * 0.3);
  c.lineTo(s * 0.72, -s * 0.72); c.quadraticCurveTo(0, -s * 0.62, -s * 0.72, -s * 0.72); c.closePath(); c.fill();
  draw.sticker(c, cc => draw.ellipse(cc, 0, -s * 0.04, s * 1.16, s * 0.28), { fill: H.topCol, outline: INK, lineWidth: aol, highlight: 0.25, shadow: 0.15 });
  c.restore();
  // the hero cone, in its own frame: base centre at the origin, apex straight up
  const K = H.cone, ht = K[2] * P, bw = K[3] * P, col = ol * H.coneOl, dip = P * 0.26;
  c.save(); c.translate(cx + K[0] * P, cy + K[1] * P);
  const path = cc => { cc.beginPath(); cc.moveTo(0, -ht); cc.lineTo(bw, 0); cc.quadraticCurveTo(0, dip, -bw, 0); cc.closePath(); };
  draw.sticker(c, path, { fill: H.party, outline: INK, lineWidth: col, highlight: 0.3, shadow: 0.22, bounds: [-bw, -ht, bw * 2, ht + dip * 0.5] });
  c.save(); path(c); c.clip();
  c.fillStyle = H.stripe;
  const h2 = P * H.stripeH, sl = P * 0.26;
  for (let i = 0; i < H.stripes.length; i++) {
    const yy = -ht + ht * H.stripes[i];
    c.beginPath(); c.moveTo(-bw * 1.6, yy + sl - h2); c.lineTo(bw * 1.6, yy - sl - h2);
    c.lineTo(bw * 1.6, yy - sl + h2); c.lineTo(-bw * 1.6, yy + sl + h2); c.closePath(); c.fill();
  }
  c.restore();
  path(c); c.lineJoin = 'round'; c.lineWidth = col; c.strokeStyle = INK; c.stroke();
  draw.sticker(c, cc => draw.circle(cc, 0, -ht, P * H.pomR), { fill: H.pom, outline: INK, lineWidth: ol, highlight: 0.45, shadow: 0.25 });
  c.restore();
}
// curly tail: the tail path (a stem out of the body end sweeping into a spiral) as a polyline in a fixed scratch buffer,
// built at bake time; TAIL_D is the reused two-entry dash array for the band ring + the dark tip
const TL = TUNE.tail;
const TAIL_PTS = new Float32Array(512), TAIL_S = new Float32Array(256);    // points + the path length at each one
let tailN = 0, tailLen = 0;
function tailPush(x, y) {
  if (tailN >= TAIL_PTS.length) return;
  if (tailN > 0) tailLen += Math.sqrt((x - TAIL_PTS[tailN - 2]) * (x - TAIL_PTS[tailN - 2]) + (y - TAIL_PTS[tailN - 1]) * (y - TAIL_PTS[tailN - 1]));
  TAIL_S[tailN >> 1] = tailLen;
  TAIL_PTS[tailN++] = x; TAIL_PTS[tailN++] = y;
}
function tailBuild(cx, cy, P) {
  const St = TL.stem, Sp = TL.spiral, scx = cx + Sp[0] * P, scy = cy + Sp[1] * P, r0 = Sp[2] * P, r1 = Sp[3] * P;
  const x0 = cx + St[0] * P, y0 = cy + St[1] * P, qx = cx + St[2] * P, qy = cy + St[3] * P, x1 = scx, y1 = scy + r0;
  tailN = 0; tailLen = 0;
  for (let i = 0; i <= 8; i++) {          // the stem: a quadratic into the spiral's bottom point, arriving heading right
    const u = i / 8, v = 1 - u;
    tailPush(v * v * x0 + 2 * v * u * qx + u * u * x1, v * v * y0 + 2 * v * u * qy + u * u * y1);
  }
  const th0 = Math.PI * 0.5, span = TL.turns * TAU, n = Math.max(2, Math.ceil(span / TL.step));
  for (let i = 1; i <= n; i++) {           // up the right side, over the top, down the left: winding inward
    const u = i / n, th = th0 - span * u, r = r0 + (r1 - r0) * u;
    tailPush(scx + Math.cos(th) * r, scy + Math.sin(th) * r);
  }
}
function tailTrace(c) {
  c.beginPath(); c.moveTo(TAIL_PTS[0], TAIL_PTS[1]);
  for (let i = 2; i < tailN; i += 2) c.lineTo(TAIL_PTS[i], TAIL_PTS[i + 1]);
}
// one pass over the tail as round-capped segments whose width tapers root -> tip (taper [root, tip] x the body width,
// + add); col = 0: one colour (fill) all along, else mustard with the dark band ring and the dark tip
function tailPass(c, w, add, fill, col, dark) {
  const n = tailN >> 1, L = tailLen > 0 ? tailLen : 1;
  for (let i = 1; i < n; i++) {
    const u = (TAIL_S[i - 1] + TAIL_S[i]) * 0.5 / L;
    c.lineWidth = w * lerp(TL.taper[0], TL.taper[1], u) + add;
    c.strokeStyle = !col ? fill : (u >= 1 - TL.tip || (u >= TL.ring[0] && u <= TL.ring[1])) ? dark : col;
    c.beginPath(); c.moveTo(TAIL_PTS[i * 2 - 2], TAIL_PTS[i * 2 - 1]); c.lineTo(TAIL_PTS[i * 2], TAIL_PTS[i * 2 + 1]); c.stroke();
  }
}
function pictTail(c, cx, cy, P, ol) {
  const B = TL.butt, w = TL.body * P, olW = ol * TL.olK, dark = color.dark(TL.col, TL.dark);
  tailBuild(cx, cy, P);
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.save(); c.translate(P * 0.03, P * 0.07); c.globalAlpha *= 0.22; c.strokeStyle = INK; c.lineWidth = w + olW * 2; tailTrace(c); c.stroke(); c.restore();
  tailPass(c, w, olW * 2, INK, 0, 0);            // the ink edge under everything, then the banded body over it
  tailPass(c, w, 0, '', TL.col, dark);
  // a gloss streak along the outer edge of the curl's first sweep (glossAt = the stretch of the spiral, 0..1)
  const Sp = TL.spiral, sx = cx + Sp[0] * P, sy = cy + Sp[1] * P, span = TL.turns * TAU;
  c.globalAlpha *= TL.gloss; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(0.6, w * 0.2);
  c.beginPath();
  for (let i = 0; i <= 10; i++) {
    const v = lerp(TL.glossAt[0], TL.glossAt[1], i / 10), th = Math.PI * 0.5 - span * v;
    const r = (Sp[2] + (Sp[3] - Sp[2]) * v) * P + w * 0.16 * lerp(TL.taper[0], TL.taper[1], 0.5);
    if (i === 0) c.moveTo(sx + Math.cos(th) * r, sy + Math.sin(th) * r); else c.lineTo(sx + Math.cos(th) * r, sy + Math.sin(th) * r);
  }
  c.stroke();
  c.restore();
  // the stubby body end the tail grows out of, in front of the tail's root (half of it off the face, clipped by the badge)
  const bx = cx + B[0] * P, by = cy + B[1] * P, rx = B[2] * P, ry = B[3] * P;
  draw.sticker(c, cc => draw.ellipse(cc, bx, by, rx, ry), { fill: TL.buttCol, outline: INK, lineWidth: ol, highlight: 0.34, shadow: 0.2 });
}
// pattern clause: a bold fabric tile in neutral indigo carrying the pattern in light cream, cut off at its edges so it
// reads as cloth (never a die): staggered polka dots, or three wide horizontal stripes
function pictTile(c, dots, cx, cy, P, ol) {
  const T = TUNE.tile, h = T.half * P, r = T.r * P, lw = ol * T.olK;
  c.save(); c.translate(cx, cy); c.rotate(T.rot);
  const path = cc => draw.roundRect(cc, -h, -h, h * 2, h * 2, r);
  draw.sticker(c, path, { fill: T.body, outline: INK, lineWidth: lw, highlight: 0, shadow: 0 });
  c.save(); path(c); c.clip();
  c.fillStyle = T.ink;
  if (dots) {
    const D = T.dots, dr = T.dotR * P;
    for (let i = 0; i < D.length; i += 2) { draw.circle(c, D[i] * P, D[i + 1] * P, dr); c.fill(); }
  } else {
    const S = T.stripes, sw = T.stripeW * P;
    for (let i = 0; i < S.length; i++) c.fillRect(-h * 1.2, S[i] * P - sw * 0.5, h * 2.4, sw);
  }
  // sticker light over the pattern: a soft top-left sheen and a bottom-right shade, then the ink edge
  draw.sticker(c, path, { fill: 'rgba(0,0,0,0)', lineWidth: 0, highlight: 0.3, shadow: 0.22 });
  c.restore();
  path(c); c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
  c.restore();
}
function pictUnknown(c, cx, cy, P) {
  draw.text(c, '?', cx, cy, { size: P * 1.6, color: INK, weight: 800 });
}
function paintPict(c, attr, value, cx, cy, P, ol, rf) {
  if (attr === 'color') pictSwatch(c, value, cx, cy, P, ol, rf);
  else if (attr === 'eyes') pictEyes(c, value, cx, cy, P, ol);
  else if (attr === 'hat') pictHat(c, cx, cy, P, ol);
  else if (attr === 'tail') pictTail(c, cx, cy, P, ol);
  else if (attr === 'pattern') pictTile(c, value === 'dots', cx, cy, P, ol);
  else pictUnknown(c, cx, cy, P);
}

// the full badge: ink rim, polarity ring (green = must have, red = must NOT have), ink keyline, tinted face, pictogram,
// and for NOT the slash. mk (verdict mark: 0 none, 1 ok, 2 bad) never touches the ring or the face (a red ring only ever
// means NOT): it adds a separate die-cut sticker at the upper-right corner, a green check (ok) or a red cross (bad)
function paintClause(c, cl, cx, cy, S, mk) {
  const C = TUNE.clause, has = cl.has !== false;
  const ol = Math.max(C.minOutline, S * C.outline);
  const ring = has ? C.yes : C.no, face = has ? C.fillYes : C.fillNo;
  const ro = S * C.outer, ri = S * C.inner, rf = ri - ol * 0.5, P = S * C.pict;
  c.save();
  c.fillStyle = 'rgba(10,6,30,' + C.dropA + ')'; draw.circle(c, cx + S * 0.02, cy + S * 0.05, ro + ol * 0.5); c.fill();
  c.fillStyle = INK; draw.circle(c, cx, cy, ro + ol * 0.5); c.fill();
  draw.sticker(c, cc => draw.circle(cc, cx, cy, ro - ol * 0.5), { fill: ring, lineWidth: 0, highlight: 0.45, shadow: 0.24 });
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = ol * 0.8; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, (ro + ri) * 0.5, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  c.fillStyle = INK; draw.circle(c, cx, cy, ri + ol * 0.5); c.fill();
  draw.sticker(c, cc => draw.circle(cc, cx, cy, rf), { fill: face, lineWidth: 0, highlight: 0.5, shadow: 0.1 });
  c.save(); draw.circle(c, cx, cy, rf); c.clip();
  if (has || cl.attr === 'color') paintPict(c, cl.attr, cl.value, cx, cy, P, ol, rf);    // a swatch stays full strength
  else { c.save(); c.globalAlpha *= 1 - C.fade; paintPict(c, cl.attr, cl.value, cx, cy, P, ol, rf); c.restore(); }
  if (!has) {
    // NOT: the pictogram stays whole, crossed by a thin dark ink bar inside a white keyline that cuts it cleanly from
    // whatever it crosses (a coral swatch, the cream stripes, the pink cone)
    const k = ri, w = S * C.slash, kl = Math.max(C.minKey, S * C.key);
    c.lineCap = 'butt';
    c.beginPath(); c.moveTo(cx - k, cy - k); c.lineTo(cx + k, cy + k);
    c.strokeStyle = C.keyCol; c.lineWidth = w + kl * 2; c.stroke();
    c.strokeStyle = C.slashCol; c.lineWidth = w; c.stroke();
    c.beginPath(); c.moveTo(cx - k - w * 0.14, cy - k + w * 0.14); c.lineTo(cx + k - w * 0.14, cy + k + w * 0.14);
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = w * 0.24; c.stroke();
  }
  c.restore();
  if (mk) paintMark(c, cx + Math.cos(C.markA) * S * C.markAt, cy + Math.sin(C.markA) * S * C.markAt, S * C.markR, ol, mk === 1);
  c.restore();
}
// the verdict sticker: a white die-cut rim, ink edge, green / red disc, a white check / cross with an ink edge
function paintMark(c, nx, ny, nr, ol, ok) {
  const C = TUNE.clause;
  c.fillStyle = 'rgba(10,6,30,0.32)'; draw.circle(c, nx + nr * 0.06, ny + nr * 0.14, nr + ol * C.markEdge); c.fill();
  c.fillStyle = '#ffffff'; draw.circle(c, nx, ny, nr + ol * C.markEdge); c.fill();
  c.fillStyle = INK; draw.circle(c, nx, ny, nr + ol * 0.2); c.fill();
  draw.sticker(c, cc => draw.circle(cc, nx, ny, nr - ol * 0.5), { fill: ok ? C.yes : C.no, lineWidth: 0, highlight: 0.5, shadow: 0.22 });
  c.beginPath();
  if (ok) { c.moveTo(nx - nr * 0.46, ny + nr * 0.02); c.lineTo(nx - nr * 0.12, ny + nr * 0.36); c.lineTo(nx + nr * 0.48, ny - nr * 0.34); }
  else { const x = nr * 0.36; c.moveTo(nx - x, ny - x); c.lineTo(nx + x, ny + x); c.moveTo(nx + x, ny - x); c.lineTo(nx - x, ny + x); }
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = nr * 0.3 + ol * 1.1; c.stroke();
  c.strokeStyle = '#ffffff'; c.lineWidth = nr * 0.3; c.stroke();
}

function clauseKey(cl, S, mk) {
  const a = ATTR_IDX[cl.attr];
  if (a === undefined) return -(S + 1) * 3 - mk;
  let v = 0;
  if (a === 0) { v = HUE_IDX[cl.value]; if (v === undefined) v = 7; }
  else if (a === 1) v = clamp(cl.value | 0, 1, 3);
  else if (a === 4) { v = PAT_IDX[cl.value]; if (v === undefined) v = 0; }
  return (((a * 8 + v) * 2 + (cl.has === false ? 0 : 1)) * 3 + mk) * 4096 + S;
}

// drawClauseIcon(ctx, clause, x, y, size, mark): one rule clause as a badge `size` units across, centred on x, y.
// mark (optional, the WHY feedback after a wrong call): 'ok' = a green check sticker at the upper-right corner (a clause
// the guest satisfied), 'bad' = a red cross sticker there (the clause it broke). The ring keeps its polarity colour and
// the pictogram + a NOT clause's slash stay, so "NOT stripes" + check reads "had no stripes: fine".
// Every distinct size (2-unit step) is its own bake: to pop / spring a badge, keep size fixed and animate ctx.scale.
export function drawClauseIcon(ctx, clause, x, y, size, mark) {
  if (!clause || !(size > 0)) return;
  const S = Math.max(q(size), TUNE.minBake.clause), hi = RES > 0, map = hi ? clauseMapH : clauseMap;
  const mk = mark === 'ok' ? 1 : mark === 'bad' ? 2 : 0;
  if (hi) { if (clauseGenH !== gen || clauseResH !== RES) { clauseMapH.clear(); clauseGenH = gen; clauseResH = RES; } }
  else if (clauseGen !== gen) { clauseMap.clear(); clauseGen = gen; }
  const k = clauseKey(clause, S, mk);
  let cv = map.get(k);
  if (!cv) {
    const W = Math.ceil(S * (1 + TUNE.clause.pad * 2));
    cv = bake(W, W, c => paintClause(c, clause, W / 2, W / 2, S, mk));
    if (map.size >= TUNE.memoCap) map.clear();
    map.set(k, cv);
  }
  const sc = size / S;
  blit(ctx, cv, x, y, sc, sc);
}

// ---------------------------------------------------------------- rule poster
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function clausesOf(rule) {
  if (Array.isArray(rule)) return rule;
  return rule && rule.clauses ? rule.clauses : EMPTY;
}
function ruleKey(cl) {
  let k = '';
  for (let i = 0; i < cl.length; i++) k += (i ? '|' : '') + cl[i].attr + ':' + cl[i].value + ':' + (cl[i].has === false ? 0 : 1);
  return k || 'none';
}
// badge size on an n-clause card (n 0 / > 3 clamp to the 1- / 3-clause sizes)
function iconFor(n) { const N = TUNE.poster.iconN; return N[clamp(n, 1, N.length) - 1]; }
function rowW(n) { return n * iconFor(n) + Math.max(0, n - 1) * TUNE.poster.plus; }
function cardW(n) { const P = TUNE.poster; return Math.max(P.minW, P.padX * 2 + rowW(n)); }
function cardH(n) { const P = TUNE.poster; return P.padTop + iconFor(n) + P.padBot; }

function polyPath(c, pts) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function roughCard(x0, y0, cw, ch, r) {
  const P = TUNE.poster, pts = [], j = () => (r.next() - 0.5) * P.rough * 2;
  for (let x = 0; x < cw; x += 10) pts.push(x0 + x, y0 + j());
  pts.push(x0 + cw, y0 + j());
  for (let y = 9; y < ch - 3; y += 9) pts.push(x0 + cw + j(), y0 + y);
  let up = true;
  for (let x = cw; x > 0; x -= P.tornStep) { pts.push(x0 + x + j() * 0.6, y0 + ch + (up ? -1 : 1) * P.torn * (0.35 + 0.65 * r.next())); up = !up; }
  pts.push(x0, y0 + ch - P.torn * 0.5);
  for (let y = ch - 9; y > 3; y -= 9) pts.push(x0 + j(), y0 + y);
  return pts;
}
function paintTape(c, cx, cy, ang, k) {
  const L = 17, h = 5.6;
  c.save(); c.translate(cx, cy); c.rotate(ang); c.scale(k, k);
  c.beginPath();
  c.moveTo(-L, -h); c.lineTo(L, -h); c.lineTo(L + 1.6, -h * 0.5); c.lineTo(L, 0); c.lineTo(L + 1.6, h * 0.5); c.lineTo(L, h);
  c.lineTo(-L, h); c.lineTo(-L - 1.6, h * 0.5); c.lineTo(-L, 0); c.lineTo(-L - 1.6, -h * 0.5); c.closePath();
  c.fillStyle = 'rgba(240,222,160,0.8)'; c.fill();
  c.strokeStyle = 'rgba(150,118,56,0.4)'; c.lineWidth = 0.6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(-L, -h * 0.55, L * 2, h * 0.36);
  c.restore();
}
function paintGrommet(c, x, y) {
  c.fillStyle = TUNE.brass; draw.circle(c, x, y, 3.5); c.fill();
  c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#4a3210'; draw.circle(c, x, y, 1.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)'; draw.circle(c, x - 1.6, y - 1.6, 0.8); c.fill();
}
function paintPlus(c, cx, cy, s) {
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - s / 2, cy); c.lineTo(cx + s / 2, cy); c.moveTo(cx, cy - s / 2); c.lineTo(cx, cy + s / 2);
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = s * 0.36 + 2; c.stroke();
  c.strokeStyle = '#3a2f6e'; c.lineWidth = s * 0.34; c.stroke();
}
// tiny door header glyph: a lit doorway with the door swung open and a question mark in the light
function paintDoorMini(c, cx, cy, s) {
  const w = s * 0.6, h = s * 0.96, x = cx - w / 2 - s * 0.08, y = cy - h / 2, ol = Math.max(1.1, s * 0.075);
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw.roundRect(c, x, y, w, h, [w / 2, w / 2, 1, 1]);
  c.fillStyle = '#ffcf6e'; c.fill(); c.lineWidth = ol; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x + w, y + h * 0.16); c.lineTo(x + w + w * 0.46, y + h * 0.04); c.lineTo(x + w + w * 0.46, y + h * 1.06); c.lineTo(x + w, y + h);
  c.closePath(); c.fillStyle = TUNE.brass; c.fill(); c.stroke();
  c.fillStyle = INK; draw.circle(c, x + w + w * 0.33, y + h * 0.6, ol * 0.55); c.fill();
  const qx = x + w / 2, qy = y + h * 0.42, qr = w * 0.2;
  c.beginPath(); c.arc(qx, qy, qr, -Math.PI * 0.95, Math.PI * 0.3, false); c.lineTo(qx, qy + qr * 1.6);
  c.lineWidth = ol * 0.95; c.strokeStyle = INK; c.stroke();
  draw.circle(c, qx, qy + qr * 2.5, ol * 0.6); c.fillStyle = INK; c.fill();
  c.beginPath(); c.moveTo(x - s * 0.12, y + h + ol * 0.2); c.lineTo(x + w + w * 0.6, y + h + ol * 0.2); c.lineWidth = ol; c.stroke();
}
function paintPoster(c, cl, cw, ch, seed) {
  const P = TUNE.poster, x0 = P.pad, y0 = P.pad, r = rng(seed || 1), n = cl.length;
  const pts = roughCard(x0, y0, cw, ch, r), res = bres();
  c.save();
  c.shadowColor = 'rgba(8,4,30,' + P.shadowA + ')'; c.shadowBlur = P.shadowBlur * res; c.shadowOffsetY = P.shadowDy * res;
  polyPath(c, pts); c.fillStyle = TUNE.paper; c.fill();
  c.restore();
  c.save(); polyPath(c, pts); c.clip();
  c.fillStyle = draw.gradient(c, 0, y0, 0, y0 + ch, [[0, '#fcf4e0'], [0.6, '#f4e5c4'], [1, '#e9d6ad']]);
  c.fillRect(x0 - 4, y0 - 4, cw + 8, ch + 8);
  c.strokeStyle = 'rgba(120,90,50,0.075)'; c.lineWidth = 0.8;
  for (let y = y0 + P.padTop + 2; y < y0 + ch; y += P.lines) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + cw, y); c.stroke(); }
  c.strokeStyle = 'rgba(110,80,40,0.08)'; c.lineWidth = 0.6;
  for (let i = 0; i < P.fibres; i++) {
    const fx = x0 + r.next() * cw, fy = y0 + r.next() * ch, a = r.next() * TAU, l = 2 + r.next() * 5;
    c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); c.stroke();
  }
  c.fillStyle = draw.radial(c, x0 + cw / 2, y0 + ch / 2, Math.min(cw, ch) * 0.3, Math.max(cw, ch) * 0.72, [[0, 'rgba(130,85,30,0)'], [1, 'rgba(130,85,30,0.24)']]);
  c.fillRect(x0 - 4, y0 - 4, cw + 8, ch + 8);
  const fx = x0 + cw * (0.5 + (r.next() - 0.5) * 0.12);
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(110,80,40,0.13)'; c.beginPath(); c.moveTo(fx, y0); c.lineTo(fx, y0 + ch + 4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(fx + 0.9, y0); c.lineTo(fx + 0.9, y0 + ch + 4); c.stroke();
  c.restore();
  // pale torn fibre along the ripped bottom edge, then the paper edge line
  c.save(); polyPath(c, pts); c.clip();
  c.strokeStyle = 'rgba(255,252,240,0.95)'; c.lineWidth = 2.2; c.beginPath();
  let started = false;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i + 1] > y0 + ch - P.torn * 1.5) { if (!started) { c.moveTo(pts[i], pts[i + 1] - 0.6); started = true; } else c.lineTo(pts[i], pts[i + 1] - 0.6); }
  }
  c.stroke(); c.restore();
  polyPath(c, pts); c.lineWidth = 1.3; c.strokeStyle = '#a88a58'; c.lineJoin = 'round'; c.stroke();
  // the clause row IS the card (no header row: it only cost height and said nothing), '+' separators between badges
  const hx = x0 + cw / 2, ic = iconFor(n), iy = y0 + P.padTop + ic / 2;
  let ix = hx - rowW(n) / 2 + ic / 2;
  for (let i = 0; i < n; i++) {
    paintClause(c, cl[i], ix, iy, ic, 0);
    if (i < n - 1) paintPlus(c, ix + ic / 2 + P.plus / 2, iy, P.plus * P.plusK);
    ix += ic + P.plus;
  }
  // tape over the corners, grommets the strings tie through
  const tk = Math.min(1, cw / P.tapeW);
  paintTape(c, x0 + 4 * tk, y0 + 4 * tk, -0.76, tk);
  paintTape(c, x0 + cw - 4 * tk, y0 + 4 * tk, 0.76, tk);
  paintGrommet(c, x0 + P.grommetIn, y0 + P.grommetY);
  paintGrommet(c, x0 + cw - P.grommetIn, y0 + P.grommetY);
}

// bakePoster(rule) -> canvas (cached per rule content): the card only, P.pad padding all round; .cardW/.cardH set on it
export function bakePoster(rule) {
  const P = TUNE.poster, cl = clausesOf(rule), key = ruleKey(cl), hi = RES > 0, map = hi ? posterMapH : posterMap;
  if (hi) { if (posterGenH !== gen || posterResH !== RES) { posterMapH.clear(); posterGenH = gen; posterResH = RES; } }
  else if (posterGen !== gen) { posterMap.clear(); posterGen = gen; }
  let cv = map.get(key);
  if (!cv) {
    if (map.size >= TUNE.posterCap) map.clear();
    cv = posterCanvas(cl, key);
    map.set(key, cv);
  }
  return cv;
}
function posterCanvas(cl, key) {
  const P = TUNE.poster, cw = cardW(cl.length), ch = cardH(cl.length);
  const cv = bake(cw + P.pad * 2, ch + P.pad * 2 + P.shadowDy, c => paintPoster(c, cl, cw, ch, hashStr(key)));
  cv.cardW = cw; cv.cardH = ch;
  return cv;
}
// the centre reveal's topper: an indigo playbill tab with a brass rim (the old header: a lit doorway with a '?' flanked
// by two brass diamonds) between the strings, just over the card's top edge; baked once per gen at hiK x the resolution
// (it only shows at big scales)
let topperCv = null, topperGen = -1, topperRes = 0;
function topperBake() {
  const P = TUNE.poster, res = bres() * P.hiK;
  if (topperCv && topperGen === gen && topperRes === res) return topperCv;
  const prev = RES, w = P.topper[0], h = P.topper[1], pad = 4;
  RES = res;
  try {
    topperCv = bake(w + pad * 2, h + pad * 2, c => {
      const x = pad, y = pad, r = h * 0.42;
      draw.sticker(c, cc => draw.roundRect(cc, x, y, w, h, r), { fill: '#2a2760', outline: INK, lineWidth: 1.6, highlight: 0.3, shadow: 0.2 });
      draw.roundRect(c, x + 2.2, y + 2.2, w - 4.4, h - 4.4, r - 2); c.lineWidth = 1.2; c.strokeStyle = TUNE.brass; c.stroke();
      const cx = x + w / 2, cy = y + h / 2, dd = h * 0.17;
      paintDoorMini(c, cx + 0.6, cy - 0.3, P.header);
      c.fillStyle = TUNE.brass;
      for (let s = -1; s <= 1; s += 2) {
        const b = cx + s * (w * 0.33);
        c.beginPath(); c.moveTo(b + s * dd, cy); c.lineTo(b, cy - dd); c.lineTo(b - s * dd, cy); c.lineTo(b, cy + dd); c.closePath(); c.fill();
      }
    });
  } finally { RES = prev; }
  topperGen = gen; topperRes = res;
  return topperCv;
}
// posterBox() -> { w, foot }: the footprint every rule poster fits in at scale 1 (the widest card x the deepest foot over
// 1..3 clauses; world.js lays the guests out against it)
const BOX = { w: 0, foot: 0 };
let boxGen = -1;
export function posterBox() {
  if (boxGen !== gen) {
    const P = TUNE.poster;
    BOX.w = 0; BOX.foot = 0; boxGen = gen;
    for (let n = 1; n <= P.iconN.length; n++) {
      BOX.w = Math.max(BOX.w, cardW(n));
      BOX.foot = Math.max(BOX.foot, P.strH + cardH(n) + P.torn + P.shadowDy);
    }
  }
  return BOX;
}
// the card at TUNE.poster.hiK x the resolution, baked once per entry the first time it is drawn above hiAt scale
function posterHi(e, rule) {
  if (!e.cvHi) {
    const cl = clausesOf(rule), prev = RES;
    RES = bres() * TUNE.poster.hiK;
    try { e.cvHi = posterCanvas(cl, ruleKey(cl)); } finally { RES = prev; }
  }
  return e.cvHi;
}

function makeEntry(cl) {
  const P = TUNE.poster;
  const n = cl.length, ic = iconFor(n);
  const e = {
    cv: bakePoster(cl), cvHi: null, gen: gen, res: RES, n: n, attrs: [], vals: [], hass: [],
    w: cardW(n), h: cardH(n), hang: P.strH, foot: P.strH + cardH(n) + P.torn + P.shadowDy,
    // clause row geometry below the nail at scale 1: badge size, '+' gap, card bottom pad, the row's centre y, the first
    // badge's centre x and the step between badge centres (clause i sits at row0 + i * step, rowY)
    icon: ic, plus: P.plus, padBot: P.padBot, rowY: P.strH + P.padTop + ic / 2, row0: -rowW(n) / 2 + ic / 2, step: ic + P.plus,
    phase: (hashStr(ruleKey(cl)) % 1000) / 1000 * TAU,
  };
  for (let i = 0; i < cl.length; i++) { e.attrs.push(cl[i].attr); e.vals.push(cl[i].value); e.hass.push(cl[i].has !== false); }
  return e;
}
function posterEntry(rule) {
  const cl = clausesOf(rule), hi = RES > 0;
  if (cl.length === 0) {           // null / empty / non-object rule: one shared entry, nothing allocated per call
    let z = hi ? emptyEH : emptyE;
    if (!z || z.gen !== gen || z.res !== RES) { z = makeEntry(EMPTY); if (hi) emptyEH = z; else emptyE = z; }
    return z;
  }
  const wm = hi ? postersH : posters;
  let e = rule && typeof rule === 'object' ? wm.get(rule) : null;
  if (e && e.gen === gen && e.res === RES && e.n === cl.length) {
    let same = true;
    for (let i = 0; i < cl.length; i++) {
      const k = cl[i];
      if (e.attrs[i] !== k.attr || e.vals[i] !== k.value || e.hass[i] !== (k.has !== false)) { same = false; break; }
    }
    if (same) return e;
  }
  e = makeEntry(cl);
  if (rule && typeof rule === 'object') wm.set(rule, e);
  return e;
}
// posterMetrics(rule) -> { w, h, hang, foot, icon, plus, padBot, rowY, row0, step } in design units (reused object per
// rule): card width / height, the string drop from the nail to the card top, foot = the whole footprint below the nail
// (strings + card + torn edge + drop shadow) at scale 1, and the clause row: badge size `icon` (per clause count: 62 / 62
// / 60), clause i's centre at (row0 + i * step, rowY) from the nail (rowY = hang + h - padBot - icon / 2). Layout: the
// poster occupies y .. y + foot * scale, x +- w / 2 * scale (GAME-SPEC §4 band 262..330); posterBox() bounds every rule.
export function posterMetrics(rule) { return posterEntry(rule); }

const TEAR = new Float32Array(TUNE.poster.tearPts);
(function () { const r = rng(9137); for (let i = 0; i < TEAR.length; i++) TEAR[i] = ((i & 1) ? 1 : -1) * (0.35 + 0.65 * r.next()); })();

// tear flutter for one half at tear progress k: rocking phase (halves out of step) and an envelope that grows in fast
function flutS(side, k) { return Math.sin(k * TUNE.poster.tearFlutN * TAU + (side > 0 ? 0 : 2.2)) * smoothstep(0, 0.3, k); }
// the half's pivot = its grommet, carried out by tearDx (+ flutter sway) and down by tearFall (ease-in)
function tearPivotX(e, side, k) { const P = TUNE.poster; return side * (e.w / 2 - P.grommetIn + P.tearDx * k + P.tearSway * flutS(side, k)); }
function tearPivotY(k) { const P = TUNE.poster; return P.strH + P.grommetY + P.tearFall * k * k; }
// turn about the grommet: the opposite sign of the side, so the inner (torn) edge is the one that drops
function tearAng(side, k) { const P = TUNE.poster; return -side * (P.tearRot * k + P.tearFlut * flutS(side, k)); }
function tearSqz(side, k) { const P = TUNE.poster; return 1 - P.tearSq * k * (0.5 + 0.5 * flutS(side, k)); }
// where card point (px, py) of half `side` lands at tear k (the same transform as tornHalf; used by the self test)
function tearX(e, side, k, px, py) {
  const P = TUNE.poster, gx = side * (e.w / 2 - P.grommetIn), gy = P.strH + P.grommetY, a = tearAng(side, k);
  return tearPivotX(e, side, k) + (px - gx) * tearSqz(side, k) * Math.cos(a) - (py - gy) * Math.sin(a);
}

function tornHalf(ctx, e, side, k) {
  const P = TUNE.poster, cv = e.cv, dw = cv.designW, dh = cv.designH;
  const top = P.strH - P.pad, bot = top + dh, edge = side * (dw / 2 + 6);
  const gx = side * (e.w / 2 - P.grommetIn), gy = P.strH + P.grommetY;
  ctx.save();
  // hanging by one string, each half swings about its own grommet so its INNER edge drops and the rip opens along the
  // whole seam; then it drifts out, falls and flutters (rocking + a paper-turn squash)
  ctx.translate(tearPivotX(e, side, k), tearPivotY(k));
  ctx.rotate(tearAng(side, k));
  ctx.scale(tearSqz(side, k), 1);
  ctx.translate(-gx, -gy);
  ctx.beginPath(); ctx.moveTo(edge, top - 4);
  for (let i = 0; i < TEAR.length; i++) ctx.lineTo(TEAR[i] * P.tearAmp, top + (bot - top) * (i / (TEAR.length - 1)));
  ctx.lineTo(edge, bot + 4); ctx.closePath(); ctx.clip();
  ctx.drawImage(cv, -dw / 2, top, dw, dh);
  // pale ripped fibre along the tear, card height only
  const y0 = P.strH + 1, y1 = P.strH + e.h - 2;
  let on = false;
  ctx.beginPath();
  for (let i = 0; i < TEAR.length; i++) {
    const ty = top + (bot - top) * (i / (TEAR.length - 1));
    if (ty < y0 || ty > y1) continue;
    if (!on) { ctx.moveTo(TEAR[i] * P.tearAmp - side * 0.8, ty); on = true; } else ctx.lineTo(TEAR[i] * P.tearAmp - side * 0.8, ty);
  }
  ctx.globalAlpha *= smoothstep(0, P.tearLet * 0.3, k);      // the rip line fades in, so tear = 0+ matches the hung card
  ctx.strokeStyle = 'rgba(255,251,238,0.95)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

// drawPoster(ctx, rule, x, y, t, opts): the rule poster hanging from the nail at x, y on two strings, swaying with time t
// (seconds). opts { scale = 1, alpha = 1, swing = 1 (sway multiplier; 0 = still), rot = 0 (extra angle, e.g. a slam
// spring), tear = 0 (0..1 rips the card in two halves that fall apart; strings dangle), header (0..1: the playbill topper
// tab over the card's top edge; default by scale: 0 at the nail, in from headAt0 to full at headAt1, so the centre
// reveal shows it and it fades out as the card flies to its nail), tag (a short localised string: the night's modifier,
// e.g. 'VIP NIGHT', on a brass hang tag pinned to the card's bottom margin, dangling BELOW the card, so outside
// posterBox(); it shows and fades with the topper (header), i.e. on the centre reveal only), tagT (its drawTag clock:
// seconds since it was pinned; omit = at rest), tagGlyph (a glyph name on the tag, e.g. 'badge' / 'tape' / 'pin') }.
const TAG_PO = { glyph: '', alpha: 1, dir: -1 };
export function drawPoster(ctx, rule, x, y, t, opts) {
  opts = opts || NO;
  const P = TUNE.poster, e = posterEntry(rule), cv = e.cv;
  const s = opts.scale !== undefined ? opts.scale : 1;
  const alpha = opts.alpha !== undefined ? opts.alpha : 1;
  const swing = opts.swing !== undefined ? opts.swing : 1;
  const tear = opts.tear !== undefined ? clamp(opts.tear, 0, 1) : 0;
  const head = opts.header !== undefined ? clamp(opts.header, 0, 1) : smoothstep(P.headAt0, P.headAt1, s);
  if (alpha <= 0 || s <= 0) return;
  t = t || 0;
  const ang = (opts.rot || 0) + swing * (P.swayAmp * Math.sin(t * P.swayHz * TAU + e.phase) + P.wobAmp * noise1(t * P.wobHz + e.phase * 3));
  ctx.save();
  ctx.translate(x, y);
  if (s !== 1) ctx.scale(s, s);
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  if (tear > 0) {
    // each string rides its half's grommet (same transform as tornHalf), then lets go and eases into a short dangle,
    // so tear = 0+ starts exactly where the hanging pose left off
    const da = Math.sin(t * 5 + e.phase) * 0.2 * (1 - tear), drop = smoothstep(P.tearHold, P.tearLet, tear);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // the halves pivot on their grommets, so each string end is simply the moved pivot (then the outer sway `ang`)
    const lpx = tearPivotX(e, -1, tear), lpy = tearPivotY(tear);
    const rpx = tearPivotX(e, 1, tear), rpy = lpy;
    const lx = lerp(lpx * ca - lpy * sa, -4 + da * 8, drop), ly = lerp(lpx * sa + lpy * ca, 13, drop);
    const rx = lerp(rpx * ca - rpy * sa, 4 + da * 8, drop), ry = lerp(rpx * sa + rpy * ca, 12, drop);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lx, ly); ctx.moveTo(0, 0); ctx.lineTo(rx, ry);
    ctx.strokeStyle = P.stringShadow; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = P.string; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = P.string; draw.circle(ctx, lx, ly, 1.7); ctx.fill(); draw.circle(ctx, rx, ry, 1.7); ctx.fill();
    ctx.save();
    ctx.rotate(ang);
    ctx.globalAlpha *= 1 - tear * tear;
    tornHalf(ctx, e, -1, tear);
    tornHalf(ctx, e, 1, tear);
    ctx.restore();
  } else {
    const img = s > P.hiAt ? posterHi(e, rule) : cv;
    ctx.save();
    ctx.rotate(ang);
    ctx.drawImage(img, -cv.designW / 2, P.strH - P.pad, cv.designW, cv.designH);
    const gx = e.w / 2 - P.grommetIn, gy = P.strH + P.grommetY;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-gx, gy); ctx.moveTo(0, 0); ctx.lineTo(gx, gy);
    ctx.strokeStyle = P.stringShadow; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = P.string; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = P.string; draw.circle(ctx, -gx, gy, 1.7); ctx.fill(); draw.circle(ctx, gx, gy, 1.7); ctx.fill();
    if (opts.tag && head > 0.01) {
      // the modifier tag; above hiAt scale it bakes at hiK x the resolution (the hi memo set), like the card itself
      const prevR = RES, prevM = MC;
      if (s > P.hiAt) { RES = bres() * P.hiK; MC = MH; }
      TAG_PO.glyph = opts.tagGlyph || ''; TAG_PO.alpha = head;
      try { drawTag(ctx, e.w * P.tagAt[0], P.strH + e.h - P.tagAt[1], P.tagSize, opts.tag, opts.tagT, TAG_PO); }
      finally { RES = prevR; MC = prevM; }
    }
    if (head > 0.01) {
      // the playbill topper over the card's top edge: pops in (outBack-ish overshoot) and fades with `head`
      const tp = topperBake(), k = head < 1 ? lerp(0.6, 1, head) + Math.sin(head * Math.PI) * P.headPop * 0.4 : 1;
      ctx.globalAlpha *= head;
      ctx.drawImage(tp, -tp.designW * k / 2, P.strH - P.topperDy - tp.designH * k / 2, tp.designW * k, tp.designH * k);
    }
    ctx.restore();
  }
  ctx.fillStyle = TUNE.brass; draw.circle(ctx, 0, 0, P.nailR); ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; draw.circle(ctx, -1.1, -1.1, P.nailR * 0.35); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- decision plates
function tufting(c, x, y, W, H, col) {
  const sx = W / 4.2, sy = H / 2.4, x0 = x + W / 2, y0 = y + H * 0.1, k = sx / sy;
  const crease = color.alpha(color.dark(col, 0.55), 0.38), lift = 'rgba(255,255,255,0.09)';
  c.lineWidth = 1.3;
  for (let i = -8; i <= 8; i++) {
    const bx = x0 + i * sx;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? lift : crease;
      const o = pass ? 1 : 0;
      c.beginPath(); c.moveTo(bx - H * k * 2, y0 - H * 2 + o); c.lineTo(bx + H * k * 2, y0 + H * 2 + o); c.stroke();
      c.beginPath(); c.moveTo(bx + H * k * 2, y0 - H * 2 + o); c.lineTo(bx - H * k * 2, y0 + H * 2 + o); c.stroke();
    }
  }
  const btn = color.dark(col, 0.5);
  for (let j = 0; j < 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const bx = x0 + i * sx + ((j & 1) ? sx / 2 : 0), by = y0 + j * sy / 2;
      if (bx < x - 3 || bx > x + W + 3 || by > y + H + 3) continue;
      c.fillStyle = 'rgba(255,255,255,0.07)'; draw.circle(c, bx + sx / 2, by + sy / 4, sx * 0.3); c.fill();
      c.fillStyle = btn; draw.circle(c, bx, by, 2.4); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; draw.circle(c, bx - 0.7, by - 0.8, 0.9); c.fill();
    }
  }
}
export const PLATE_SKINS = ['classic', 'studs', 'candy', 'neon', 'gold', 'crystal'];
let PLATE_SKIN = 0;   // the default skin index (setPlateSkin)
function skinIdx(id) {
  if (typeof id !== 'string' || !id) return -1;
  const i = PLATE_SKINS.indexOf(id.indexOf('plate.') === 0 ? id.slice(6) : id);
  return i;
}
// setPlateSkin('plate.gold' | 'gold' | ''): the skin every drawPlate without an explicit skin uses (classic when unknown)
export function setPlateSkin(id) { const i = skinIdx(id); PLATE_SKIN = i < 0 ? 0 : i; return PLATE_SKINS[PLATE_SKIN]; }
export function plateSkin() { return PLATE_SKINS[PLATE_SKIN]; }
// the rim of a skinned plate face (bake time): x, y, W, H, r = the face; glow = the plate's own glow hue
function paintPlateRim(c, sk, x, y, W, H, r, glow) {
  const PS = TUNE.plate.skin, rw = PS.rimW[PLATE_SKINS[sk]] || 2.8, rr = Math.max(4, r - 4);
  const ring = () => draw.roundRect(c, x + 6, y + 6, W - 12, H - 12, rr);
  if (sk === 1) {                     // brass studs: a broad brass rim dotted with domed studs
    ring(); c.lineWidth = rw; c.strokeStyle = TUNE.brass; c.stroke();
    ring(); c.lineWidth = 0.9; c.strokeStyle = 'rgba(60,30,0,0.65)'; c.save(); c.translate(0, 0); c.stroke(); c.restore();
    const g = PS.studGap, x0 = x + 6, y0 = y + 6, w = W - 12, h = H - 12;
    const stud = (sx, sy) => { draw.sticker(c, cc => draw.circle(cc, sx, sy, 2.3), { fill: '#e8b34a', outline: '#5a3606', lineWidth: 0.9, highlight: 0.7, shadow: 0.25 }); };
    for (let u = x0 + rr; u <= x0 + w - rr + 0.1; u += Math.max(8, (w - rr * 2) / Math.max(1, Math.round((w - rr * 2) / g)))) { stud(u, y0); stud(u, y0 + h); }
    for (let v = y0 + rr; v <= y0 + h - rr + 0.1; v += Math.max(8, (h - rr * 2) / Math.max(1, Math.round((h - rr * 2) / g)))) { stud(x0, v); stud(x0 + w, v); }
  } else if (sk === 2) {              // candy stripe: a fat white rim wound with red stripes
    ring(); c.lineWidth = rw + 2; c.strokeStyle = INK; c.stroke();
    ring(); c.lineWidth = rw; c.strokeStyle = '#fff6f2'; c.stroke();
    c.save(); ring(); c.setLineDash([4.2, 4.2]); c.lineWidth = rw; c.strokeStyle = '#e8203c'; c.stroke(); c.setLineDash(EMPTY); c.restore();
    ring(); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.save(); c.translate(-0.6, -0.8); c.stroke(); c.restore();
  } else if (sk === 3) {              // neon: a glowing tube in the plate's own hue (it brightens live on press)
    const res = bres();
    c.save(); ring(); c.shadowColor = glow; c.shadowBlur = 8 * res; c.lineWidth = rw + 1.6; c.strokeStyle = glow; c.stroke(); c.restore();
    ring(); c.lineWidth = rw * 0.45; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
  } else if (sk === 4) {              // gold leaf: a broad burnished gold rim with a fine inner line
    ring(); c.lineWidth = rw + 1.8; c.strokeStyle = '#6a4206'; c.stroke();
    ring(); c.lineWidth = rw; c.strokeStyle = draw.gradient(c, x, y, x + W, y + H, [[0, '#fff0b0'], [0.35, '#ffc93c'], [0.7, '#c8901e'], [1, '#ffe08a']]); c.stroke();
    draw.roundRect(c, x + 6 + rw * 0.5 + 0.8, y + 6 + rw * 0.5 + 0.8, W - 12 - rw - 1.6, H - 12 - rw - 1.6, Math.max(3, rr - rw * 0.5)); c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,240,180,0.85)'; c.stroke();
  } else if (sk === 5) {              // crystal: a faceted rim of light / pale-blue facets with sparkles at the corners
    ring(); c.lineWidth = rw + 1.8; c.strokeStyle = '#2a3a5a'; c.stroke();
    ring(); c.lineWidth = rw; c.strokeStyle = '#cfe6ff'; c.stroke();
    c.save(); ring(); c.setLineDash([3, 3]); c.lineWidth = rw; c.strokeStyle = '#ffffff'; c.stroke(); c.setLineDash(EMPTY); c.restore();
    c.save(); ring(); c.setLineDash([1.5, 4.5]); c.lineDashOffset = 1.5; c.lineWidth = rw; c.strokeStyle = '#9fc4f0'; c.stroke(); c.setLineDash(EMPTY); c.restore();
    c.fillStyle = '#ffffff';
    const cs = [x + 6 + rr * 0.3, y + 6 + rr * 0.3, x + W - 6 - rr * 0.3, y + 6 + rr * 0.3];
    for (let i = 0; i < 2; i++) { draw.star(c, cs[i * 2], cs[i * 2 + 1], 4, 0.25, 4); c.fill(); }
  }
}
function bakePlateFace(isIn, W, H, lab, flip, sk) {
  const P = TUNE.plate, col = isIn ? P.in.col : P.out.col, pad = 4;
  return bake(W + pad * 2, H + pad * 2, c => {
    const x = pad, y = pad, r = Math.min(H * P.radius, P.maxRadius), deep = color.dark(col, 0.55);
    draw.roundRect(c, x, y, W, H, r);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + H, [[0, color.light(col, 0.2)], [0.45, col], [1, color.dark(col, 0.32)]]); c.fill();
    c.save(); draw.roundRect(c, x, y, W, H, r); c.clip();
    tufting(c, x, y, W, H, col);
    c.fillStyle = draw.radial(c, x + W / 2, y + H * 0.42, Math.min(W, H) * 0.32, Math.max(W, H) * 0.72, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(12,0,20,0.45)']]);
    c.fillRect(x, y, W, H);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + H * 0.45, [[0, 'rgba(255,255,255,0.34)'], [1, 'rgba(255,255,255,0)']]);
    draw.roundRect(c, x + 7, y + 4, W - 14, H * 0.42, [r * 0.8, r * 0.8, r * 0.4, r * 0.4]); c.fill();
    c.restore();
    if (sk > 0) paintPlateRim(c, sk, x, y, W, H, r, isIn ? P.in.glow : P.out.glow);   // a skinned rim (MONETIZATION §3.4)
    else {
      draw.roundRect(c, x + 6, y + 6, W - 12, H - 12, Math.max(4, r - 4)); c.lineWidth = 2.8; c.strokeStyle = TUNE.brass; c.stroke();
      draw.roundRect(c, x + 7.8, y + 7.8, W - 15.6, H - 15.6, Math.max(3, r - 5.8)); c.lineWidth = 0.9; c.strokeStyle = 'rgba(60,30,0,0.65)'; c.stroke();
      c.save(); c.beginPath(); c.rect(x, y, W, H * 0.4); c.clip();
      draw.roundRect(c, x + 5.2, y + 5.2, W - 10.4, H - 10.4, Math.max(4, r - 3.2)); c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,240,200,0.75)'; c.stroke();
      c.restore();
    }
    draw.roundRect(c, x, y, W, H, r); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    const gs = Math.min(H * P.glyph, W * 0.42);
    paintGlyph(c, isIn ? 'door' : 'boot', x + W / 2, y + H * 0.4, gs, P.text, deep, flip);
    if (lab) {
      draw.text(c, lab, x + W / 2, y + H * 0.79 + (text.dir(lab) === 'rtl' ? 0 : H * 0.012), {
        size: Math.round(H * P.label), weight: 800, color: P.text, outline: deep, outlineWidth: 5,
        shadow: 'rgba(0,0,0,0.35)', shadowOffset: 2.5, maxWidth: W - 30, letterSpacing: 1,
      });
    }
  });
}
function bakeSlab(col, W, H, r) {
  return bake(W + 8, H + 8, c => {
    draw.roundRect(c, 4, 4, W, H, r);
    c.fillStyle = draw.gradient(c, 0, 4, 0, H + 4, [[0, color.dark(col, 0.42)], [1, color.dark(col, 0.62)]]); c.fill();
    c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  });
}
function bakeRim(glowCol, W, H, r) {
  const g = TUNE.plate.rimBlur + 8;
  return bake(W + g * 2, H + g * 2, c => {
    const res = bres();
    c.shadowColor = glowCol; c.shadowBlur = TUNE.plate.rimBlur * res;
    draw.roundRect(c, g, g, W, H, r); c.lineWidth = 4; c.strokeStyle = glowCol; c.stroke(); c.stroke();
    c.shadowBlur = 0; c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
  });
}

// drawPlate(ctx, kind 'in'|'out', x, y, w, h, press 0..1, glow 0..1, label, flip, skin): a big decision plate centred on x, y.
// OUT = red velvet + kicking boot, IN = green velvet + open door with arrow in. label defaults to the localised IN / OUT;
// flip mirrors the glyph (left-hand mode). press sinks the face onto its slab (scale .94); glow adds a halo past the thumb.
// skin = 'plate.<id>' | '<id>' (default: setPlateSkin's), see PLATE_SKINS.
const SHEEN = [{ p: 0, t0: -9 }, { p: 0, t0: -9 }];   // per kind: last press, when the gold sheen started (game clock)
// a rounded rect added to the current path (no beginPath), for even-odd rings
function rrSub(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export function drawPlate(ctx, kind, x, y, w, h, press, glow, lab, flip, skin) {
  if (!(w > 0 && h > 0)) return;
  const P = TUNE.plate, isIn = kind === 'in', K = isIn ? P.in : P.out;
  press = clamp(press || 0, 0, 1); glow = clamp(glow || 0, 0, 1);
  const W = Math.max(q(w), TUNE.minBake.plateW), H = Math.max(q(h), TUNE.minBake.plateH), fl = !!flip, kid = isIn ? 1 : 0;
  const str = lab === undefined || lab === null ? label(isIn ? 'in' : 'out') : lab;
  const r = Math.min(H * P.radius, P.maxRadius);
  const si = skin === undefined || skin === null ? PLATE_SKIN : Math.max(0, skinIdx(skin));
  let face = mget(MC.plate, kid, W, H, str, fl, si);
  if (!face) face = mput(MC.plate, bakePlateFace(isIn, W, H, str, fl, si), kid, W, H, str, fl, si);
  let slab = mget(MC.plateBase, kid, W, H);
  if (!slab) slab = mput(MC.plateBase, bakeSlab(K.col, W, H, r), kid, W, H);
  const sx = w / W, sy = h / H, depth = Math.max(P.minDepth * Math.min(1, h / H), h * P.depth);
  if (glow > 0) draw.glow(ctx, x, y + depth * 0.5, Math.max(w, h) * P.glowR * (0.85 + 0.15 * glow), K.glow, glow * P.glowA);
  draw.shadowBlob(ctx, x, y + h * 0.5 + depth + 2, w * 0.56, 10, 0.5);
  blit(ctx, slab, x, y + depth, sx, sy);
  const k = 1 - P.press * press, dy = depth * press * P.pressDrop;
  blit(ctx, face, x, y + dy, sx * k, sy * k);
  if (si === 3 && press > 0.01) draw.glow(ctx, x, y + dy, Math.max(w, h) * 0.62, K.glow, press * P.skin.neonPress * 0.55);   // neon: brighter on press
  if (si === 4) {                     // gold: a sheen sweeps across the rim when a press is let go (the verdict)
    const S = SHEEN[kid], now = loop.time;
    if (S.p > 0.5 && press < S.p - 0.25) S.t0 = now;
    S.p = press;
    const u = (now - S.t0) / P.skin.sheen;
    if (u >= 0 && u < 1) {
      const fw = w * k, fh = h * k, fx = x - fw / 2, fy = y + dy - fh / 2, rr = Math.max(4, r * k - 4), bx = fx - fw * 0.3 + (fw * 1.6) * u;
      ctx.save();
      ctx.beginPath(); rrSub(ctx, fx + 3, fy + 3, fw - 6, fh - 6, rr + 1); rrSub(ctx, fx + 9, fy + 9, fw - 18, fh - 18, Math.max(3, rr - 4));
      ctx.clip('evenodd');
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= Math.sin(u * Math.PI);
      ctx.fillStyle = 'rgba(255,248,210,0.95)';
      ctx.beginPath(); ctx.moveTo(bx, fy - 4); ctx.lineTo(bx + 14, fy - 4); ctx.lineTo(bx - 6, fy + fh + 4); ctx.lineTo(bx - 20, fy + fh + 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (glow > 0) {
    let rim = mget(MC.rim, kid, W, H);
    if (!rim) rim = mput(MC.rim, bakeRim(K.glow, W, H, r), kid, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= glow * P.rimA;
    blit(ctx, rim, x, y + dy, sx * k, sy * k);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- strike lamp
function paintLamp(c, state, cx, cy, S) {
  const L = TUNE.lamp, R = S * 0.4, ol = Math.max(1.4, S * 0.045), by = cy + R * 0.98;
  draw.sticker(c, cc => draw.roundRect(cc, cx - R * 0.48, by, R * 0.96, R * 0.62, R * 0.1), { fill: TUNE.brass, outline: INK, lineWidth: ol, highlight: 0.4, shadow: 0.3 });
  c.strokeStyle = 'rgba(90,55,10,0.8)'; c.lineWidth = ol * 0.6; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx - R * 0.44, by + R * (0.18 + i * 0.16)); c.lineTo(cx + R * 0.44, by + R * (0.1 + i * 0.16)); c.stroke(); }
  draw.sticker(c, cc => draw.roundRect(cc, cx - R * 0.22, by + R * 0.62, R * 0.44, R * 0.2, R * 0.08), { fill: '#3a3350', outline: INK, lineWidth: ol * 0.8, highlight: 0.2, shadow: 0 });
  const glass = cc => {
    cc.beginPath(); cc.moveTo(cx - R * 0.44, by + R * 0.06); cc.lineTo(cx - R * 0.5, cy + R * 0.866);
    cc.arc(cx, cy, R, Math.PI * 2 / 3, Math.PI / 3, false); cc.lineTo(cx + R * 0.44, by + R * 0.06); cc.closePath();
  };
  const stops = state === 1 ? [[0, '#fffdf0'], [0.3, '#ffe08a'], [0.72, '#ffb347'], [1, '#f2861e']]
    : state === 0 ? [[0, '#6e628c'], [0.6, '#3d365c'], [1, '#27223f']] : L.smoke;
  glass(c); c.fillStyle = draw.radial(c, cx - R * 0.2, cy - R * 0.25, 0, R * 1.3, stops); c.fill();
  // filament
  c.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    if (state === 1) { c.strokeStyle = pass ? '#fff8dc' : '#ff8a00'; c.lineWidth = pass ? ol * 0.55 : ol * 1.2; }
    else { if (pass) break; c.strokeStyle = state === 0 ? '#9c90b8' : '#7d7298'; c.lineWidth = ol * 0.55; }
    c.beginPath();
    c.moveTo(cx - R * 0.16, by + R * 0.04); c.lineTo(cx - R * 0.24, cy + R * 0.12);
    if (state === 2) {
      c.lineTo(cx - R * 0.08, cy - R * 0.02);
      c.moveTo(cx + R * 0.16, by + R * 0.04); c.lineTo(cx + R * 0.22, cy + R * 0.3); c.lineTo(cx + R * 0.36, cy + R * 0.22);
    } else {
      for (let i = 1; i <= 6; i++) c.lineTo(cx - R * 0.24 + i * R * 0.08, cy + R * 0.12 - ((i & 1) ? R * 0.14 : 0));
      c.lineTo(cx + R * 0.16, by + R * 0.04);
    }
    c.stroke();
  }
  glass(c); c.lineWidth = ol; c.strokeStyle = INK; c.stroke();
  if (state === 2) {
    // smoked glass, sooty at the top, split by a white crack (main run + two branches)
    c.save(); glass(c); c.clip();
    c.fillStyle = draw.radial(c, cx + R * 0.1, cy - R * 0.6, 0, R * 0.95, [[0, 'rgba(8,6,24,0.5)'], [1, 'rgba(8,6,24,0)']]);
    c.fillRect(cx - R * 1.2, cy - R * 1.3, R * 2.4, R * 2.6);
    c.lineJoin = 'miter'; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? L.crack : 'rgba(10,8,30,0.55)'; c.lineWidth = pass ? ol * 0.62 : ol * 1.1;
      const o = pass ? 0 : R * 0.04;
      c.beginPath();
      c.moveTo(cx + R * 0.62 + o, cy - R * 0.84 + o); c.lineTo(cx + R * 0.28 + o, cy - R * 0.44 + o); c.lineTo(cx + R * 0.38 + o, cy - R * 0.16 + o);
      c.lineTo(cx + R * 0.04 + o, cy + R * 0.08 + o); c.lineTo(cx + R * 0.14 + o, cy + R * 0.34 + o); c.lineTo(cx - R * 0.06 + o, cy + R * 0.58 + o);
      c.moveTo(cx + R * 0.28 + o, cy - R * 0.44 + o); c.lineTo(cx - R * 0.06 + o, cy - R * 0.5 + o); c.lineTo(cx - R * 0.24 + o, cy - R * 0.8 + o);
      c.moveTo(cx + R * 0.04 + o, cy + R * 0.08 + o); c.lineTo(cx - R * 0.32 + o, cy + R * 0.02 + o);
      c.stroke();
    }
    c.restore();
  }
  c.strokeStyle = 'rgba(255,255,255,' + (state === 1 ? 0.85 : state === 0 ? 0.38 : 0.3) + ')';
  c.lineWidth = R * 0.12; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, R * 0.68, Math.PI * 1.12, Math.PI * 1.42); c.stroke();
  c.fillStyle = c.strokeStyle; draw.circle(c, cx - R * 0.6, cy + R * 0.12, R * 0.06); c.fill();
  if (state === 2) {
    // a smoke wisp curling off the top, then the red X badge: a lost strike, never just a dim bulb
    c.lineCap = 'round'; c.strokeStyle = L.wisp;
    c.lineWidth = R * 0.16;
    c.beginPath(); c.moveTo(cx + R * 0.1, cy - R * 1.04);
    c.bezierCurveTo(cx + R * 0.42, cy - R * 1.22, cx - R * 0.22, cy - R * 1.4, cx + R * 0.1, cy - R * 1.66); c.stroke();
    c.lineWidth = R * 0.1; c.globalAlpha = 0.7;
    c.beginPath(); c.moveTo(cx - R * 0.26, cy - R * 1.02); c.quadraticCurveTo(cx - R * 0.46, cy - R * 1.24, cx - R * 0.3, cy - R * 1.42); c.stroke();
    c.globalAlpha = 1;
    const xr = R * L.xR, xx = cx + R * L.xAt[0], xy = cy + R * L.xAt[1], a = xr * 0.42;
    draw.sticker(c, cc => draw.circle(cc, xx, xy, xr), { fill: L.x, outline: INK, lineWidth: ol * 0.9, highlight: 0.4, shadow: 0.2 });
    c.strokeStyle = '#ffffff'; c.lineWidth = xr * 0.34; c.lineCap = 'round';
    c.beginPath(); c.moveTo(xx - a, xy - a); c.lineTo(xx + a, xy + a); c.moveTo(xx + a, xy - a); c.lineTo(xx - a, xy + a); c.stroke();
  }
}

// drawStrikeLamp(ctx, x, y, size, lit, broken): one strike-counter bulb centred on its glass at x, y (size = bulb width)
export function drawStrikeLamp(ctx, x, y, size, lit, broken) {
  if (!(size > 0)) return;
  const st = broken ? 2 : lit ? 1 : 0, S = Math.max(q(size), TUNE.minBake.lamp), L = TUNE.lamp;
  let cv = mget(MC.lamp, st, S);
  if (!cv) {
    const up = st === 2 ? S * L.wispH : 0, W = Math.ceil(S), H = Math.ceil(S * 1.42 + up);
    cv = bake(W, H, c => paintLamp(c, st, W / 2, S * 0.5 + up, S));
    cv.cy = S * 0.5 + up;
    mput(MC.lamp, cv, st, S);
  }
  const sc = size / S, w = cv.designW * sc, h = cv.designH * sc;
  if (st === 1) draw.glow(ctx, x, y, size * L.glow, TUNE.amber, L.glowA);
  ctx.drawImage(cv, x - w / 2, y - cv.cy * sc, w, h);
  if (st === 1) draw.glow(ctx, x, y - size * 0.04, size * L.core, '#fff3c8', L.coreA);
}

// ---------------------------------------------------------------- tier stamp (seal with ring text + rope knot)
function arcText(c, str, cx, cy, r, bottom, size, fill, out, arcK) {
  if (!str) return;
  const rtl = text.dir(str) === 'rtl';
  const disp = rtl ? str : str.toUpperCase();
  const units = rtl ? disp.split(' ') : Array.from(disp);
  if (rtl) units.reverse();
  let fs = size;
  const measureAll = () => {
    const ws = [], track = rtl ? 0 : fs * 0.1, space = rtl ? text.measure(c, ' ', fs, 800, 'Cairo') * 1.4 : 0;
    let tot = 0;
    for (let i = 0; i < units.length; i++) { const w = text.measure(c, units[i], fs, 800, 'Baloo 2'); ws.push(w); tot += w + (i ? track + space : 0); }
    return { ws: ws, tot: tot, track: track, space: space };
  };
  let m = measureAll();
  const maxArc = r * (arcK || TUNE.stamp.arc);
  if (m.tot > maxArc) { fs = fs * maxArc / m.tot; m = measureAll(); }
  let s = 0;
  for (let i = 0; i < units.length; i++) {
    const w = m.ws[i], mid = s + w / 2;
    const a = bottom ? Math.PI / 2 + (m.tot / 2 - mid) / r : -Math.PI / 2 - m.tot / 2 / r + mid / r;
    c.save();
    c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2);
    draw.text(c, units[i], 0, rtl ? 0 : fs * 0.04, { size: fs, weight: 800, color: fill, outline: out, outlineWidth: Math.max(1.5, fs * 0.16) });
    c.restore();
    s += w + m.track + m.space;
  }
}
function paintKnot(c, cx, cy, R, rope, deep) {
  const pts = [], N = 72;
  for (let i = 0; i <= N; i++) {
    const t = i / N * TAU, d = 1 + Math.sin(t) * Math.sin(t);
    pts.push(cx + R * Math.cos(t) / d, cy - R * 0.12 + R * 1.25 * Math.sin(t) * Math.cos(t) / d);
  }
  const lw = R * 0.26;
  const strokeRope = (draw0) => {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = deep; c.lineWidth = lw + Math.max(1.6, R * 0.1); draw0(); c.stroke();
    c.strokeStyle = rope; c.lineWidth = lw; draw0(); c.stroke();
  };
  const tail = (sx) => () => { c.beginPath(); c.moveTo(cx, cy - R * 0.12); c.quadraticCurveTo(cx + sx * R * 0.25, cy + R * 0.45, cx + sx * R * 0.52, cy + R * 0.92); };
  strokeRope(tail(-1));
  strokeRope(() => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); });
  strokeRope(tail(1));
  const i0 = Math.round(N * 0.18) * 2, i1 = Math.round(N * 0.32) * 2;
  strokeRope(() => { c.beginPath(); c.moveTo(pts[i0], pts[i0 + 1]); for (let i = i0 + 2; i <= i1; i += 2) c.lineTo(pts[i], pts[i + 1]); });
  // twist hatching
  c.strokeStyle = color.alpha(deep, 0.55); c.lineWidth = Math.max(0.8, R * 0.05);
  for (let i = 2; i < pts.length - 2; i += 6) {
    const dx = pts[i + 2] - pts[i - 2], dy = pts[i + 3] - pts[i - 1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / l, ny = dx / l, tx = dx / l, ty = dy / l, h = lw * 0.42;
    c.beginPath(); c.moveTo(pts[i] + nx * h - tx * h * 0.6, pts[i + 1] + ny * h - ty * h * 0.6); c.lineTo(pts[i] - nx * h + tx * h * 0.6, pts[i + 1] - ny * h + ty * h * 0.6); c.stroke();
  }
  // frayed tail ends
  c.strokeStyle = rope; c.lineWidth = Math.max(0.8, R * 0.05);
  for (let s = -1; s <= 1; s += 2) {
    const ex = cx + s * R * 0.52, ey = cy + R * 0.92;
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + s * R * 0.06 + k * R * 0.07, ey + R * 0.16); c.stroke(); }
  }
}
function grunge(c, cx, cy, S, seed, density) {
  const r = rng(seed), n = Math.round(S * density);
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    const a = r.next() * TAU, d = Math.sqrt(r.next()) * S * 0.5;
    c.globalAlpha = 0.25 + r.next() * 0.6;
    c.fillStyle = '#000';
    draw.circle(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.25 + r.next() * r.next() * 1.3); c.fill();
  }
  c.globalAlpha = 0.35; c.strokeStyle = '#000'; c.lineWidth = 0.6; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = r.next() * TAU, d = S * (0.15 + r.next() * 0.3), l = S * (0.05 + r.next() * 0.08), b = r.next() * TAU;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l); c.stroke();
  }
  c.restore();
}
// rim text: `top` (the game title) over the top ring; `bot` (a sub line) under it, or three stars dressing the bottom ring
function ringText(c, cx, cy, S, top, bot, fill, out) {
  const A = TUNE.stamp, small = S < A.small, fs = S * (small ? A.smallFs : A.ringFs);
  arcText(c, top, cx, cy, S * 0.34, false, fs, fill, out, small ? A.smallArc : A.arc);
  if (bot && !small) arcText(c, bot, cx, cy, S * 0.34, true, fs * 0.92, fill, out, A.arc);
  else {
    c.fillStyle = fill;
    for (let i = -1; i <= 1; i++) {
      const a = Math.PI / 2 + i * 0.42, r = i ? 0.05 : 0.065;
      draw.star(c, cx + Math.cos(a) * S * 0.34, cy + Math.sin(a) * S * 0.34, S * r, 0.45, 5); c.fill();
    }
  }
}
function paintTier(c, tier, cx, cy, S, top, bot) {
  if (tier === 'shut') { paintShut(c, cx, cy, S, top, bot); return; }
  const K = TUNE.tiers[tier] || TUNE.tiers.rope, ol = Math.max(1.5, S * 0.022), n = 30;
  c.save(); c.translate(S * 0.015, S * 0.032); c.fillStyle = 'rgba(10,5,30,0.38)'; draw.star(c, cx, cy, S * 0.5, 0.93, n); c.fill(); c.restore();
  draw.sticker(c, cc => draw.star(cc, cx, cy, S * 0.5, 0.93, n), { fill: K.ink, outline: K.deep, lineWidth: ol * 1.4, highlight: 0.38, shadow: 0.26 });
  c.strokeStyle = K.deep;
  c.lineWidth = S * 0.02; draw.circle(c, cx, cy, S * 0.43); c.stroke();
  c.lineWidth = S * 0.01; draw.circle(c, cx, cy, S * 0.405); c.stroke();
  c.lineWidth = S * 0.018; draw.circle(c, cx, cy, S * 0.275); c.stroke();
  draw.sticker(c, cc => draw.circle(cc, cx, cy, S * 0.262), { fill: color.mix(K.ink, K.deep, 0.14), lineWidth: 0, highlight: 0.25, shadow: 0.22 });
  c.fillStyle = K.deep;
  draw.star(c, cx - S * 0.34, cy, S * 0.036, 0.45, 5); c.fill();
  draw.star(c, cx + S * 0.34, cy, S * 0.036, 0.45, 5); c.fill();
  ringText(c, cx, cy, S, top, bot, K.deep, color.light(K.ink, 0.55));
  paintKnot(c, cx, cy + S * 0.02, S * 0.17, color.light(K.ink, 0.4), K.deep);
  grunge(c, cx, cy, S, hashStr(tier) + 7, TUNE.stamp.specks);
}
// the chipped rim of the Shut Down seal: a hand-pressed circle (slight wobble) with V-shaped bites knocked out of it
function shutEdge(c, cx, cy, R) {
  const Z = TUNE.shut, ch = Z.chips, N = 96;
  c.beginPath();
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    let r = R * (1 + Z.wobble * Math.sin(a * 11 + 0.7));
    for (let k = 0; k < ch.length; k += 3) {
      let d = Math.abs(a - (ch[k] + TAU) % TAU);
      if (d > Math.PI) d = TAU - d;
      if (d < ch[k + 1]) r -= R * ch[k + 2] * (1 - d / ch[k + 1]);
    }
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
}
// one cut half of the velvet rope: brass clip at the seal's edge, a drooping run, a frayed end (fibres splaying out)
function cutRope(c, pts, cx, cy, S, K) {
  const Z = TUNE.shut, x0 = cx + pts[0] * S, y0 = cy + pts[1] * S, qx = cx + pts[2] * S, qy = cy + pts[3] * S;
  const x1 = cx + pts[4] * S, y1 = cy + pts[5] * S, lw = S * Z.ropeW, ol = Math.max(1.4, S * 0.016);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // frayed fibres first (they sit under the rope's cut end), fanned around the end tangent
  const tx = x1 - qx, ty = y1 - qy, tl = Math.sqrt(tx * tx + ty * ty) || 1, ux = tx / tl, uy = ty / tl, fl = S * Z.fray;
  const fn = Z.frayN, half = (fn - 1) / 2;
  for (let pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass ? color.light(K.rope, 0.18) : K.ropeDeep; c.lineWidth = pass ? S * 0.009 : S * 0.009 + ol * 0.9;
    for (let k = 0; k < fn; k++) {
      const f = (k - half) / half, a = f * Z.fraySpread, ca = Math.cos(a), sa = Math.sin(a);
      const dx = ux * ca - uy * sa, dy = ux * sa + uy * ca, l = fl * (1 - Math.abs(f) * 0.35) * (k & 1 ? 0.82 : 1);
      c.beginPath(); c.moveTo(x1 - ux * lw * 0.3 + dy * lw * f * 0.3, y1 - uy * lw * 0.3 - dx * lw * f * 0.3);
      c.quadraticCurveTo(x1 + dx * l * 0.5, y1 + dy * l * 0.5, x1 + dx * l + uy * l * f * 0.15, y1 + dy * l - ux * l * f * 0.15); c.stroke();
    }
  }
  const run = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(qx, qy, x1, y1); };
  c.lineCap = 'butt';
  run(); c.strokeStyle = K.ropeDeep; c.lineWidth = lw + ol * 2; c.stroke();
  run(); c.strokeStyle = K.rope; c.lineWidth = lw; c.stroke();
  // velvet twist: short dark ticks along the run + a soft sheen line
  c.strokeStyle = color.alpha(K.ropeDeep, 0.6); c.lineWidth = Math.max(0.8, S * 0.007); c.lineCap = 'round';
  for (let i = 1; i < 6; i++) {
    const u = i / 6, v = 1 - u, px = v * v * x0 + 2 * v * u * qx + u * u * x1, py = v * v * y0 + 2 * v * u * qy + u * u * y1;
    const dx = 2 * v * (qx - x0) + 2 * u * (x1 - qx), dy = 2 * v * (qy - y0) + 2 * u * (y1 - qy), dl = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / dl, ny = dx / dl, h = lw * 0.42;
    c.beginPath(); c.moveTo(px + nx * h - dx / dl * h * 0.7, py + ny * h - dy / dl * h * 0.7); c.lineTo(px - nx * h + dx / dl * h * 0.7, py - ny * h + dy / dl * h * 0.7); c.stroke();
  }
  c.save(); c.translate(-lw * 0.2, -lw * 0.22); run(); c.strokeStyle = 'rgba(255,220,226,0.35)'; c.lineWidth = lw * 0.22; c.stroke(); c.restore();
  draw.sticker(c, cc => draw.circle(cc, x0, y0, S * 0.034), { fill: TUNE.brass, outline: INK, lineWidth: ol, highlight: 0.5, shadow: 0.25 });
}
// Shut Down: not a medal. A velvet-red rim band on a chipped, hand-pressed edge (no rosette rays, no glint), a charcoal
// core with the velvet rope cut in two (frayed ends drooping from their brass clips) and a crack through rim and core
function paintShut(c, cx, cy, S, top, bot) {
  const K = TUNE.tiers.shut, Z = TUNE.shut, R = S * 0.48, ol = Math.max(1.5, S * 0.022);
  c.save(); c.translate(S * 0.015, S * 0.032); c.fillStyle = 'rgba(10,5,30,0.42)'; shutEdge(c, cx, cy, R); c.fill(); c.restore();
  draw.sticker(c, cc => shutEdge(cc, cx, cy, R), { fill: K.ink, outline: K.deep, lineWidth: ol * 1.5, highlight: 0.3, shadow: 0.3, bounds: [cx - R, cy - R, R * 2, R * 2] });
  // velvet nap: a soft darker falloff toward the rim
  c.save(); shutEdge(c, cx, cy, R); c.clip();
  c.fillStyle = draw.radial(c, cx, cy, S * 0.3, R, [[0, 'rgba(40,0,12,0)'], [1, 'rgba(40,0,12,0.35)']]); c.fillRect(cx - R, cy - R, R * 2, R * 2);
  c.restore();
  c.strokeStyle = K.deep;
  c.lineWidth = S * 0.016; draw.circle(c, cx, cy, S * 0.43); c.stroke();
  c.setLineDash([S * 0.018, S * 0.022]); c.lineWidth = S * 0.008; c.strokeStyle = 'rgba(255,214,220,0.55)';   // bake time only
  draw.circle(c, cx, cy, S * 0.405); c.stroke(); c.setLineDash(EMPTY);   // stitched seam
  c.strokeStyle = K.deep; c.lineWidth = S * 0.02; draw.circle(c, cx, cy, S * 0.275); c.stroke();
  draw.sticker(c, cc => draw.circle(cc, cx, cy, S * 0.265), { fill: K.core, lineWidth: 0, highlight: 0.18, shadow: 0.3 });
  c.fillStyle = K.text;
  draw.circle(c, cx - S * 0.34, cy, S * 0.018); c.fill(); draw.circle(c, cx + S * 0.34, cy, S * 0.018); c.fill();
  ringText(c, cx, cy, S, top, bot, K.text, K.deep);
  // the crack: a dark split with a pale lit lip, from the chipped rim into the core (kept inside the edge)
  const cr = Z.crack, br = Z.branch;
  c.save(); shutEdge(c, cx, cy, R - ol * 0.4); c.clip();
  for (let pass = 0; pass < 2; pass++) {
    const o = pass ? -S * 0.005 : 0;
    c.strokeStyle = pass ? 'rgba(255,200,210,0.55)' : '#120810'; c.lineWidth = pass ? S * 0.007 : S * Z.crackW;
    c.lineJoin = 'miter'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + cr[0] * S + o, cy + cr[1] * S + o);
    for (let i = 2; i < cr.length; i += 2) c.lineTo(cx + cr[i] * S + o, cy + cr[i + 1] * S + o);
    c.moveTo(cx + br[0] * S + o, cy + br[1] * S + o);
    for (let i = 2; i < br.length; i += 2) c.lineTo(cx + br[i] * S + o, cy + br[i + 1] * S + o);
    c.stroke();
  }
  c.restore();
  cutRope(c, Z.ropeA, cx, cy, S, K);
  cutRope(c, Z.ropeB, cx, cy, S, K);
  grunge(c, cx, cy, S, hashStr('shut') + 7, TUNE.stamp.specks * 1.3);
}

// drawTierStamp(ctx, tier, x, y, size, t, sub): result tier seal ('gold'|'silver'|'bronze'|'rope'|'shut') of diameter
// `size`; t (seconds) drives the glint sweep on the metal tiers. The seal says WHICH tier by metal + art (the result
// ribbon names it, so the name is never printed twice): the top ring carries the localised game title, the bottom ring
// `sub` (optional, e.g. "Night 7" / the daily date: pass a cached string) or three stars. Below TUNE.stamp.small units
// the bottom ring is always the stars. 'shut' is its own chipped velvet seal with a cut rope and no glint.
export function drawTierStamp(ctx, tier, x, y, size, t, sub) {
  if (!(size > 0)) return;
  const K = TUNE.tiers[tier] || TUNE.tiers.rope, S = Math.max(q(size), TUNE.minBake.tier), A = TUNE.stamp;
  const top = label('title'), bot = S < A.small || !sub ? '' : sub;
  let cv = mget(MC.tier, tier, S, top, bot);
  if (!cv) {
    const W = Math.ceil(S * 1.12);
    cv = mput(MC.tier, bake(W, W, c => paintTier(c, tier, W / 2, W / 2, S, top, bot)), tier, S, top, bot);
  }
  const sc = size / S;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(A.tilt);
  blit(ctx, cv, 0, 0, sc, sc);
  if (K.glint && t !== undefined) {
    const u = (((t % A.glintPer) + A.glintPer) % A.glintPer) / A.glintDur;
    if (u < 1) {
      let band = mget(MC.glint, S);
      if (!band) {
        band = mput(MC.glint, bake(S, S, c => {
          c.fillStyle = draw.gradient(c, 0, 0, S, 0, [[0, 'rgba(255,255,255,0)'], [0.4, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.7)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
          c.fillRect(0, 0, S, S);
        }), S);
      }
      ctx.beginPath(); ctx.arc(0, 0, size * 0.47, 0, TAU); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= A.glintA * Math.sin(u * Math.PI);
      ctx.rotate(0.5);
      blit(ctx, band, lerp(-0.75, 0.75, u) * size, 0, sc, sc * 1.6);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stamp words (NICE / OOPS / LAST CALL)
function bakeWord(word, S, col, plate) {
  const rtl = text.dir(word) === 'rtl', disp = rtl ? word : word.toUpperCase();
  const tw = text.measure(mctx(), disp, S, 800, 'Baloo 2');
  const bw = Math.ceil(tw + S * 0.95), bh = Math.ceil(S * 1.42), pad = Math.ceil(S * 0.25);
  const W = bw + pad * 2, H = bh + pad * 2;
  return bake(W, H, c => {
    const x = pad, y = pad, deep = color.dark(col, 0.55), ol = Math.max(1.5, S * 0.06), cx = W / 2, cy = H / 2;
    draw.roundRect(c, x, y, bw, bh, S * 0.24); c.fillStyle = plate || color.alpha(col, 0.16); c.fill();
    c.lineJoin = 'round';
    c.lineWidth = S * 0.1 + ol * 2; c.strokeStyle = deep; c.stroke();
    c.lineWidth = S * 0.1; c.strokeStyle = col; c.stroke();
    const ins = S * 0.17;
    draw.roundRect(c, x + ins, y + ins, bw - ins * 2, bh - ins * 2, S * 0.14);
    c.lineWidth = S * 0.035 + ol * 1.4; c.strokeStyle = deep; c.stroke();
    c.lineWidth = S * 0.035; c.strokeStyle = col; c.stroke();
    const ty = cy + (rtl ? -S * 0.02 : S * 0.06);
    draw.text(c, disp, cx, ty, { size: S, weight: 800, color: col, outline: deep, outlineWidth: S * 0.16, maxWidth: bw - S * 0.5 });
    c.save(); c.beginPath(); c.rect(0, 0, W, cy - S * 0.08); c.clip();
    draw.text(c, disp, cx, ty, { size: S, weight: 800, color: color.light(col, 0.4), maxWidth: bw - S * 0.5 });
    c.restore();
    grunge(c, cx, cy, Math.max(bw, bh), hashStr(word) + 3, TUNE.word.specks);
  });
}

// drawStampText(ctx, word, x, y, size, color, t, plate): a rubber-stamp word (pass the localised string) with font size
// `size`; t = seconds since it hit: slams in from TUNE.word.from scale with outBack over TUNE.word.slam s, then rests
// tilted. t < 0 draws nothing (lets callers stagger stamps); omit t for the resting pose. plate (optional CSS colour) fills
// the stamp's interior instead of the default faint wash of `color`: an opaque one (e.g. '#fff4dc') so nothing behind
// shows through the word, or a dark sticker plate (e.g. 'rgba(12,11,36,0.55)') to lift it off a busy lit backdrop.
export function drawStampText(ctx, word, x, y, size, col, t, plate) {
  if (!word || !(size > 0)) return;
  col = col || '#3ddc84';
  const W = TUNE.word, S = Math.max(q(size), TUNE.minBake.word), pl = plate || '';
  t = t === undefined ? 1 : t;
  const a = clamp(t / W.fadeIn, 0, 1);
  if (a <= 0) return;
  let cv = mget(MC.word, word, S, col, pl);
  if (!cv) cv = mput(MC.word, bakeWord(word, S, col, pl), word, S, col, pl);
  const u = clamp(t / W.slam, 0, 1);
  const sc = (size / S) * lerp(W.from, 1, easeIndex.outBack(u));
  ctx.save();
  ctx.translate(x, y); ctx.rotate(W.rot + (1 - u) * W.rotFrom);
  ctx.globalAlpha *= a;
  blit(ctx, cv, 0, 0, sc, sc);
  ctx.restore();
}

// ---------------------------------------------------------------- hang tag (FAKE! on a busted prop, VIP, night modifiers)
// the tag's die-cut outline: a rounded body (x0, y0, w, h, corner r) with a round-topped ear (ew wide, eh tall, centred
// on cx) rising from its top edge, joined by small concave fillets, as ONE path so the ink outline never crosses the seam
function tagPath(c, x0, y0, w, h, r, cx, ew, eh) {
  const er = ew / 2, f = Math.min(er * 0.45, h * 0.12), l = cx - er, rr = cx + er;
  c.beginPath();
  c.moveTo(x0 + r, y0); c.lineTo(l - f, y0); c.quadraticCurveTo(l, y0, l, y0 - f);
  c.lineTo(l, y0 - eh + er); c.arc(cx, y0 - eh + er, er, Math.PI, TAU, false);
  c.lineTo(rr, y0 - f); c.quadraticCurveTo(rr, y0, rr + f, y0);
  c.lineTo(x0 + w - r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + r, r);
  c.lineTo(x0 + w, y0 + h - r); c.arcTo(x0 + w, y0 + h, x0 + w - r, y0 + h, r);
  c.lineTo(x0 + r, y0 + h); c.arcTo(x0, y0 + h, x0, y0 + h - r, r);
  c.lineTo(x0, y0 + r); c.arcTo(x0, y0, x0 + r, y0, r);
  c.closePath();
}
// one tag bake at font size S: the pin sits at (cv.pinX, cv.pinY), the pivot drawTag swings it about
function bakeTag(word, S, col, ink, pin, gly) {
  const T = TUNE.tag, rtl = text.dir(word) === 'rtl', disp = rtl ? word : word.toUpperCase();
  const tw = text.measure(mctx(), disp, S, 800, 'Baloo 2'), gw = gly ? S * T.glyph : 0, gap = gly && tw > 0 ? S * T.gap : 0;
  const bw = Math.ceil(tw + gw + gap + S * T.pad * 2), bh = S * T.h, ew = S * T.ear[0], eh = S * T.ear[1];
  const pr = S * T.pinR, m = Math.ceil(S * 0.45 + 3), W = bw + m * 2, px = W / 2, py = Math.ceil(pr + 3);
  const eyeY = py + S * T.str, y0 = eyeY + eh * 0.48, H = Math.ceil(y0 + bh + m);
  const cv = bake(W, H, c => {
    const x0 = m, cx = px, cy = y0 + bh / 2, r = bh * T.r, ol = Math.max(1.3, S * 0.075), res = bres();
    const path = cc => tagPath(cc, x0, y0, bw, bh, r, cx, ew, eh);
    // a soft drop shadow lifts it off whatever it is pinned to
    c.save();
    c.shadowColor = 'rgba(10,5,30,0.5)'; c.shadowBlur = S * 0.24 * res; c.shadowOffsetY = S * 0.12 * res;
    path(c); c.fillStyle = color.dark(col, 0.4); c.fill();
    c.restore();
    const grad = draw.gradient(c, 0, y0 - eh, 0, y0 + bh, [[0, color.light(col, 0.4)], [0.5, col], [1, color.dark(col, 0.2)]]);
    draw.sticker(c, path, { fill: grad, outline: INK, lineWidth: ol * 1.6, highlight: 0.32, shadow: 0.2, bounds: [x0, y0 - eh, bw, bh + eh] });
    // the stamped inner rim (a dark groove with a light lip under it)
    const ri = S * T.rim;
    draw.roundRect(c, x0 + ri, y0 + ri + 0.6, bw - ri * 2, bh - ri * 2, Math.max(1, r - ri));
    c.lineWidth = Math.max(0.8, S * 0.05); c.strokeStyle = color.alpha(color.light(col, 0.6), 0.7); c.stroke();
    draw.roundRect(c, x0 + ri, y0 + ri, bw - ri * 2, bh - ri * 2, Math.max(1, r - ri));
    c.strokeStyle = color.alpha(color.dark(col, 0.45), 0.75); c.stroke();
    // the grommet eyelet in the ear
    const er = S * T.eye;
    c.fillStyle = '#f6dc98'; draw.circle(c, cx, eyeY, er * 1.75); c.fill();
    c.lineWidth = ol * 0.7; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#2b1a0a'; draw.circle(c, cx, eyeY, er); c.fill();
    // the cord from the pin, through the eyelet (a shadowed string, a knot over the hole)
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(px, py); c.lineTo(cx, eyeY);
    c.strokeStyle = TUNE.poster.stringShadow; c.lineWidth = Math.max(1.6, S * 0.13); c.stroke();
    c.strokeStyle = TUNE.poster.string; c.lineWidth = Math.max(0.9, S * 0.07); c.stroke();
    c.fillStyle = TUNE.poster.string; draw.circle(c, cx, eyeY - er * 0.2, Math.max(0.9, S * 0.08)); c.fill();
    // the word (ink, a light embossed edge) + the optional glyph, centred together, RTL aware
    const cw = tw + gw + gap, left = cx - cw / 2;
    const tx = rtl ? left + tw / 2 : left + gw + gap + tw / 2, gx = rtl ? left + tw + gap + gw / 2 : left + gw / 2;
    if (gly) paintGlyph(c, gly, gx, cy, gw, '#fff4dc', INK, false);
    draw.text(c, disp, tx, cy + (rtl ? -S * 0.02 : S * 0.06), { size: S, weight: 800, color: ink, outline: color.light(col, 0.55), outlineWidth: S * 0.13 });
    // the push pin's head over the cord
    draw.sticker(c, cc => draw.circle(cc, px, py, pr), { fill: pin, outline: INK, lineWidth: ol * 1.1, highlight: 0.55, shadow: 0.3 });
    c.fillStyle = 'rgba(255,255,255,0.85)'; draw.circle(c, px - pr * 0.36, py - pr * 0.36, pr * 0.24); c.fill();
  });
  cv.pinX = px; cv.pinY = py; cv.phase = (hashStr(word) % 628) / 100;
  return cv;
}
// drawTag(ctx, x, y, size, word, t, opts): a brass hang tag stabbed onto (x, y) by a push pin, hanging on its cord below
// it (x, y = the PIN, the pivot), the word at font size `size` (pass the localised string). t = seconds since it was
// pinned: it slams in (outBack from TUNE.tag.from scale) and swings out on the cord, damping over ~1 s; t < 0 draws
// nothing; omit t for the resting pose. opts { color (body, brass), ink (word), pin (pin head), glyph (a GLYPH_NAMES name
// before the word), dir (1 / -1: the side it swings out to first), swing (start angle, rad), rot (an extra angle about the
// pin), alpha }. Pin it on a flying prop by passing the prop's anchor every frame: it keeps hanging under gravity.
export function drawTag(ctx, x, y, size, word, t, opts) {
  if (!word || !(size > 0)) return;
  opts = opts || NO;
  const T = TUNE.tag, S = Math.max(q(size), TUNE.minBake.tag);
  t = t === undefined ? 9 : t;
  if (t < 0) return;
  const a = clamp(t / T.fadeIn, 0, 1) * (opts.alpha !== undefined ? opts.alpha : 1);
  if (a <= 0) return;
  const col = opts.color || T.col, ink = opts.ink || T.ink, pin = opts.pin || T.pin, gly = opts.glyph || '';
  let cv = mget(MC.tag, word, S, col, ink, pin, gly);
  if (!cv) cv = mput(MC.tag, bakeTag(word, S, col, ink, pin, gly), word, S, col, ink, pin, gly);
  const sc = (size / S) * lerp(T.from, 1, easeIndex.outBack(clamp(t / T.slam, 0, 1)));
  const amp = opts.swing !== undefined ? opts.swing : T.swing, dir = opts.dir < 0 ? -1 : 1;
  const ang = (opts.rot || 0) + dir * amp * Math.exp(-T.damp * t) * Math.cos(t * T.hz * TAU) + T.idle * Math.sin(t * T.idleHz * TAU + cv.phase);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalAlpha *= a;
  ctx.drawImage(cv, -cv.pinX * sc, -cv.pinY * sc, cv.designW * sc, cv.designH * sc);
  ctx.restore();
}

// ---------------------------------------------------------------- loose tape strip (ripped off a busted fake)
const TAPE_R = [0, -0.85, 0.15, -0.6, 0.3, -0.75, 0], TAPE_L = [0, 0.7, -0.2, 0.85, 0.05, 0.6, 0];
function bakeTape(L) {
  const T = TUNE.tape, h = Math.max(3, L * T.h), W = L + 8, H = Math.ceil(h + 6);
  return bake(W, H, c => {
    const hw = L / 2, cx = W / 2, cy = H / 2, n = TAPE_R.length - 1, j = Math.min(2.2, L * 0.07), lw = Math.max(0.7, h * 0.11);
    c.beginPath(); c.moveTo(cx - hw, cy - h / 2);
    for (let i = 0; i <= n; i++) c.lineTo(cx + hw + TAPE_R[i] * j, cy - h / 2 + h * i / n);
    for (let i = n; i >= 0; i--) c.lineTo(cx - hw + TAPE_L[i] * j, cy - h / 2 + h * i / n);
    c.closePath();
    c.globalAlpha = T.a; c.fillStyle = T.col; c.fill();
    c.globalAlpha = 1; c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = T.line; c.stroke();
    c.lineCap = 'round'; c.lineWidth = Math.max(0.7, h * 0.13); c.strokeStyle = T.gloss;
    c.beginPath(); c.moveTo(cx - hw + j + 1, cy - h * 0.26); c.lineTo(cx + hw - j - 1, cy - h * 0.26); c.stroke();
    c.globalAlpha = 0.4; c.lineWidth = lw * 0.8; c.strokeStyle = T.line;
    c.beginPath(); c.moveTo(cx + hw * 0.3, cy - h / 2); c.lineTo(cx + hw * 0.18, cy + h / 2); c.stroke();
  });
}
// drawTape(ctx, x, y, len, rot, opts): a loose strip of the guests' tape (torn ends) len units long, centred on x, y at
// angle rot. opts { alpha, turn (rad: the paper turning about its long axis, the strip's width scales by cos(turn), so
// a growing turn reads as a flutter) }. Animate x, y, rot and turn; len is snapped for the bake (keep it fixed).
export function drawTape(ctx, x, y, len, rot, opts) {
  if (!(len > 0)) return;
  opts = opts || NO;
  const a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0) return;
  const L = Math.max(q(len), TUNE.minBake.tape);
  let cv = mget(MC.tape, L);
  if (!cv) cv = mput(MC.tape, bakeTape(L), L);
  const sc = len / L, sq = opts.turn ? Math.cos(opts.turn) : 1;
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.globalAlpha *= a;
  blit(ctx, cv, 0, 0, sc, sc * (Math.abs(sq) < 0.06 ? 0.06 : sq));
  ctx.restore();
}

// ---------------------------------------------------------------- shared content layout (icon + label, RTL aware)
function paintContent(c, cx, cy, maxW, str, icon, size, tc, oc, ic) {
  const has = !!str && str.length > 0, rtl = has && text.dir(str) === 'rtl';
  let fs = size;
  const iw = icon ? size * 1.1 : 0, gap = icon && has ? size * 0.32 : 0, ow = Math.max(2.5, fs * 0.2);
  let tw = has ? text.measure(c, str, fs, 800, 'Baloo 2') + ow : 0;
  if (tw + iw + gap > maxW && tw > 0) {
    fs = Math.max(size * 0.5, fs * (maxW - iw - gap) / tw);
    tw = text.measure(c, str, fs, 800, 'Baloo 2') + ow;
  }
  const total = tw + iw + gap, left = cx - total / 2;
  let ix, tx;
  if (rtl) { tx = left + tw / 2; ix = left + tw + gap + iw / 2; } else { ix = left + iw / 2; tx = left + iw + gap + tw / 2; }
  if (icon) paintGlyph(c, icon, ix, cy, iw, ic || tc, oc, false);
  if (has) {
    draw.text(c, str, tx, cy + (rtl ? 0 : fs * 0.07), {
      size: fs, weight: 800, color: tc, outline: oc, outlineWidth: Math.max(2.5, fs * 0.2), shadow: 'rgba(0,0,0,0.28)', shadowOffset: Math.max(1.2, fs * 0.07),
    });
  }
}

// ---------------------------------------------------------------- pill
function bakePill(col, W, H, str, icon, tc, fs) {
  return bake(W + 6, H + 6, c => {
    const x = 3, y = 3, r = H / 2;
    draw.sticker(c, cc => draw.roundRect(cc, x, y, W, H, r), { fill: col, outline: INK, lineWidth: 2.5, highlight: 0.2, shadow: 0.22 });
    c.save(); draw.roundRect(c, x + 2, y + 2, W - 4, H - 4, r - 2); c.clip();
    draw.roundRect(c, x + 2.6, y + 2.6, W - 5.2, H + 4, r - 2.6); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,0.2)'; c.stroke();
    c.restore();
    paintContent(c, x + W / 2, y + H / 2, W - H * 0.6, str, icon, fs || Math.round(H * TUNE.pill.size), tc, color.dark(col, 0.6));
  });
}
// drawPill(ctx, x, y, w, h, textStr, opts): HUD capsule with text (+ optional glyph). opts { color, textColor, size, icon, alpha }.
// Pass cached strings ('7/20' built when the value changes), not a new string every frame.
export function drawPill(ctx, x, y, w, h, textStr, opts) {
  opts = opts || NO;
  if (!(w > 0 && h > 0)) return;
  const col = opts.color || TUNE.pill.color, tc = opts.textColor || TUNE.pill.text, icon = opts.icon || '', fs = opts.size || 0;
  const W = Math.max(q(w), TUNE.minBake.pill), H = Math.max(q(h), TUNE.minBake.pill);
  const str = textStr === undefined || textStr === null ? '' : (typeof textStr === 'string' ? textStr : String(textStr));
  let cv = mget(MC.pill, col, W, H, str, icon, tc, fs);
  if (!cv) cv = mput(MC.pill, bakePill(col, W, H, str, icon, tc, fs), col, W, H, str, icon, tc, fs);
  const a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0) return;
  if (a !== 1) { ctx.save(); ctx.globalAlpha *= a; blit(ctx, cv, x, y, w / W, h / H); ctx.restore(); }
  else blit(ctx, cv, x, y, w / W, h / H);
}

// ---------------------------------------------------------------- chunky button
function bakeButtonFace(col, W, H, str, icon, tc, fs, rim, ic) {
  return bake(W + 8, H + 8, c => {
    const x = 4, y = 4, r = Math.min(H * TUNE.button.radius, W / 2);
    draw.roundRect(c, x, y, W, H, r);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + H, [[0, color.light(col, 0.28)], [0.55, col], [1, color.dark(col, 0.14)]]); c.fill();
    c.save(); draw.roundRect(c, x, y, W, H, r); c.clip();
    c.fillStyle = draw.gradient(c, 0, y, 0, y + H * 0.48, [[0, 'rgba(255,255,255,0.38)'], [1, 'rgba(255,255,255,0)']]);
    draw.roundRect(c, x + r * 0.35, y + 3, W - r * 0.7, H * 0.44, H * 0.2); c.fill();
    c.restore();
    const B = TUNE.button;
    if (rim) {                 // brass (or any) inner ring + a hairline catch-light on its top edge
      const ri = B.rimIn;
      draw.roundRect(c, x + ri, y + ri, W - ri * 2, H - ri * 2, Math.max(2, r - ri)); c.lineWidth = B.rimW; c.strokeStyle = rim; c.stroke();
      c.save(); c.beginPath(); c.rect(x, y, W, H * 0.45); c.clip();
      draw.roundRect(c, x + ri - 0.7, y + ri - 0.7, W - ri * 2 + 1.4, H - ri * 2 + 1.4, Math.max(2, r - ri + 0.7)); c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,246,214,0.7)'; c.stroke();
      c.restore();
    } else { draw.roundRect(c, x + 2.2, y + 2.2, W - 4.4, H - 4.4, Math.max(2, r - 2.2)); c.lineWidth = 1.3; c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke(); }
    draw.roundRect(c, x, y, W, H, r); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    paintContent(c, x + W / 2, y + H / 2, W - Math.max(24, r), str, icon, fs || Math.round(H * B.text), tc, color.dark(col, 0.58), ic);
  });
}
// drawButton(ctx, x, y, w, h, label, opts): chunky 3D sticker button centred on x, y.
// opts { color = amber, textColor, size (font), icon (glyph name), iconColor (glyph fill; default textColor), rim (inner
// ring colour), press 0..1, glow 0..1, alpha }. Secondary style (GAME-SPEC §5: saturation on the cast, not the chrome):
// { color: '#2a2760', rim: '#d9a441', textColor: '#fff4dc', iconColor: <the one accent hue> }
export function drawButton(ctx, x, y, w, h, lab, opts) {
  opts = opts || NO;
  const B = TUNE.button, col = opts.color || B.color, tc = opts.textColor || B.textColor, icon = opts.icon || '', fs = opts.size || 0;
  const rim = opts.rim || '', ic = opts.iconColor || '';
  const press = clamp(opts.press || 0, 0, 1), glow = clamp(opts.glow || 0, 0, 1);
  const a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0 || !(w > 0 && h > 0)) return;
  const W = Math.max(q(w), TUNE.minBake.btn), H = Math.max(q(h), TUNE.minBake.btn), str = lab === undefined || lab === null ? '' : lab;
  let face = mget(MC.btn, col, W, H, str, icon, tc, fs, rim, ic);
  if (!face) { face = mput(MC.btn, bakeButtonFace(col, W, H, str, icon, tc, fs, rim, ic), col, W, H, str, icon, tc, fs, rim, ic); face.glowCol = color.light(rim || col, 0.2); }
  let slab = mget(MC.btnBase, col, W, H);
  if (!slab) slab = mput(MC.btnBase, bakeSlab(col, W, H, Math.min(H * B.radius, W / 2)), col, W, H);
  const sx = w / W, sy = h / H, depth = Math.max(B.minDepth * Math.min(1, h / H), h * B.depth);
  if (a !== 1) { ctx.save(); ctx.globalAlpha *= a; }
  if (glow > 0) draw.glow(ctx, x, y, Math.max(w, h) * 0.8, face.glowCol, glow * B.glowA);
  draw.shadowBlob(ctx, x, y + h * 0.5 + depth, w * 0.52, Math.max(4, h * 0.14), 0.4);
  blit(ctx, slab, x, y + depth, sx, sy);
  const k = 1 - B.press * press;
  blit(ctx, face, x, y + depth * press * B.pressDrop, sx * k, sy * k);
  if (a !== 1) ctx.restore();
}

// ---------------------------------------------------------------- round icon button
function bakeIconFace(col, S, icon, off, gcol, rim) {
  const W = S + 6;
  return bake(W, W, c => {
    const cx = W / 2, cy = W / 2, r = S / 2 - 1.5;
    draw.circle(c, cx, cy, r);
    c.fillStyle = draw.gradient(c, 0, cy - r, 0, cy + r, [[0, color.light(col, 0.24)], [0.55, col], [1, color.dark(col, 0.18)]]); c.fill();
    c.save(); draw.circle(c, cx, cy, r); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.2)'; draw.ellipse(c, cx, cy - r * 0.52, r * 0.74, r * 0.42); c.fill();
    c.restore();
    const I = TUNE.iconBtn;
    if (rim) { draw.circle(c, cx, cy, Math.max(1, r - I.rimIn)); c.lineWidth = I.rimW; c.strokeStyle = rim; c.stroke(); }
    else { draw.circle(c, cx, cy, Math.max(1, r - 2.4)); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.28)'; c.stroke(); }
    draw.circle(c, cx, cy, r); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    paintGlyph(c, icon, cx, cy, S * TUNE.iconBtn.glyph, gcol, color.dark(col, 0.62), false);
    if (off) {
      const k = S * 0.27;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - k, cy - k); c.lineTo(cx + k, cy + k);
      c.strokeStyle = INK; c.lineWidth = S * 0.12; c.stroke();
      c.strokeStyle = TUNE.iconBtn.off; c.lineWidth = S * 0.075; c.stroke();
    }
  });
}
// drawIconButton(ctx, x, y, size, icon, opts): round HUD button of diameter `size` with a glyph from GLYPH_NAMES.
// opts { color, glyphColor, rim (inner ring colour, e.g. brass), press 0..1, off (red slash: muted), alpha }
export function drawIconButton(ctx, x, y, size, icon, opts) {
  opts = opts || NO;
  const I = TUNE.iconBtn, col = opts.color || I.color, gcol = opts.glyphColor || I.glyphColor, off = !!opts.off, rim = opts.rim || '';
  const press = clamp(opts.press || 0, 0, 1), a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0 || !(size > 0)) return;
  const S = Math.max(q(size), TUNE.minBake.icon);
  let face = mget(MC.icon, col, S, icon, off, gcol, rim);
  if (!face) face = mput(MC.icon, bakeIconFace(col, S, icon, off, gcol, rim), col, S, icon, off, gcol, rim);
  let slab = mget(MC.iconBase, col, S);
  if (!slab) slab = mput(MC.iconBase, bakeSlab(col, S - 3, S - 3, S / 2), col, S);
  const sc = size / S, depth = Math.max(I.minDepth * Math.min(1, size / S), size * I.depth);
  if (a !== 1) { ctx.save(); ctx.globalAlpha *= a; }
  draw.shadowBlob(ctx, x, y + size * 0.5 + depth * 0.6, size * 0.46, Math.max(3, size * 0.12), 0.4);
  blit(ctx, slab, x, y + depth, sc, sc);
  const k = 1 - I.press * press;
  blit(ctx, face, x, y + depth * press * I.pressDrop, sc * k, sc * k);
  if (a !== 1) ctx.restore();
}

// drawGlyph(ctx, name, x, y, size, opts): a bare glyph (no button). opts { color = white, outline = ink, flip, rot, alpha }
export function drawGlyph(ctx, name, x, y, size, opts) {
  opts = opts || NO;
  if (!(size > 0)) return;
  const col = opts.color || '#ffffff', out = opts.outline || INK, flip = !!opts.flip, S = Math.max(q(size), TUNE.minBake.glyph);
  let cv = mget(MC.glyph, name, S, col, out, flip);
  if (!cv) {
    const W = Math.ceil(S * 1.3);
    cv = mput(MC.glyph, bake(W, W, c => paintGlyph(c, name, W / 2, W / 2, S, col, out, flip)), name, S, col, out, flip);
  }
  const sc = size / S, a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0) return;
  if (opts.rot || a !== 1) {
    ctx.save(); ctx.translate(x, y); if (opts.rot) ctx.rotate(opts.rot); ctx.globalAlpha *= a;
    blit(ctx, cv, 0, 0, sc, sc); ctx.restore();
  } else blit(ctx, cv, x, y, sc, sc);
}

// ---------------------------------------------------------------- count badge
// drawBadge(ctx, x, y, size, textStr, opts): small round count / alert badge. opts { color, textColor }
export function drawBadge(ctx, x, y, size, textStr, opts) {
  opts = opts || NO;
  if (!(size > 0)) return;
  const col = opts.color || TUNE.badge.color, tc = opts.textColor || TUNE.badge.text, S = Math.max(q(size), TUNE.minBake.badge);
  const str = textStr === undefined || textStr === null ? '' : (typeof textStr === 'string' ? textStr : String(textStr));
  let cv = mget(MC.badge, col, S, str, tc);
  if (!cv) {
    cv = mput(MC.badge, bake(S + 6, S + 6, c => {
      const cx = S / 2 + 3, cy = S / 2 + 3;
      draw.sticker(c, cc => draw.circle(cc, cx, cy, S / 2 - 1.2), { fill: col, outline: INK, lineWidth: 2.4, highlight: 0.35, shadow: 0.2 });
      if (str) draw.text(c, str, cx, cy + (text.dir(str) === 'rtl' ? 0 : S * 0.04), { size: Math.round(S * TUNE.badge.size), weight: 800, color: tc, outline: color.dark(col, 0.6), outlineWidth: Math.max(2, S * 0.1), maxWidth: S * 0.8 });
    }), col, S, str, tc);
  }
  blit(ctx, cv, x, y, size / S, size / S);
}

// ---------------------------------------------------------------- tutorial glove
function paintGlove(c, fx, fy, S) {
  const ol = Math.max(1.6, S * 0.035), res = bres();
  const st = { fill: '#ffffff', outline: INK, lineWidth: ol, highlight: 0.22, shadow: 0.22 };
  c.save();
  c.shadowColor = 'rgba(10,5,30,0.45)'; c.shadowBlur = S * 0.06 * res; c.shadowOffsetX = S * 0.03 * res; c.shadowOffsetY = S * 0.05 * res;
  c.fillStyle = '#ffffff';
  draw.roundRect(c, fx - S * 0.085, fy, S * 0.17, S * 0.5, S * 0.085); c.fill();
  draw.roundRect(c, fx - S * 0.24, fy + S * 0.36, S * 0.48, S * 0.4, S * 0.15); c.fill();
  draw.roundRect(c, fx - S * 0.21, fy + S * 0.72, S * 0.44, S * 0.22, S * 0.06); c.fill();
  c.restore();
  draw.sticker(c, cc => draw.roundRect(cc, fx - S * 0.085, fy, S * 0.17, S * 0.52, S * 0.085), st);
  c.strokeStyle = 'rgba(80,70,120,0.35)'; c.lineWidth = ol * 0.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(fx - S * 0.04, fy + S * 0.22); c.lineTo(fx + S * 0.04, fy + S * 0.22); c.stroke();
  draw.sticker(c, cc => draw.roundRect(cc, fx - S * 0.22, fy + S * 0.36, S * 0.44, S * 0.4, S * 0.15), st);
  for (let i = 0; i < 3; i++) {
    const yy = fy + S * (0.38 + i * 0.105);
    draw.sticker(c, cc => draw.roundRect(cc, fx - S * 0.04, yy, S * 0.3, S * 0.12, S * 0.06), st);
  }
  draw.sticker(c, cc => { cc.save(); cc.translate(fx - S * 0.05, fy + S * 0.63); cc.rotate(-0.5); draw.roundRect(cc, -S * 0.16, -S * 0.065, S * 0.3, S * 0.13, S * 0.065); cc.restore(); },
    { fill: '#ffffff', outline: INK, lineWidth: ol, highlight: 0.22, shadow: 0.2, bounds: [fx - S * 0.2, fy + S * 0.52, S * 0.3, S * 0.22] });
  draw.sticker(c, cc => draw.roundRect(cc, fx - S * 0.21, fy + S * 0.73, S * 0.44, S * 0.2, S * 0.06), { fill: '#f1eefb', outline: INK, lineWidth: ol, highlight: 0.3, shadow: 0.2 });
  c.strokeStyle = 'rgba(80,70,120,0.4)'; c.lineWidth = ol * 0.55;
  for (let i = 0; i < 3; i++) { const xx = fx - S * 0.1 + i * S * 0.1; c.beginPath(); c.moveTo(xx, fy + S * 0.77); c.lineTo(xx, fy + S * 0.89); c.stroke(); }
}
// drawGlove(ctx, x, y, size, t, opts): white cartoon glove pointing up with its fingertip at x, y, tapping on a loop driven by
// t (seconds). opts { rot (radians about the fingertip; -PI/2 points left), alpha, press (0..1 overrides the tap loop), tap: false }
export function drawGlove(ctx, x, y, size, t, opts) {
  opts = opts || NO;
  if (!(size > 0)) return;
  const G = TUNE.glove, S = Math.max(q(size), TUNE.minBake.glove);
  let cv = mget(MC.glove, S);
  if (!cv) {
    const W = Math.ceil(S * 0.8), H = Math.ceil(S * 1.08);
    cv = bake(W, H, c => paintGlove(c, W * 0.42, S * 0.05, S));
    cv.tipX = W * 0.42; cv.tipY = S * 0.05;
    mput(MC.glove, cv, S);
  }
  const a = opts.alpha !== undefined ? opts.alpha : 1;
  if (a <= 0) return;
  const loop = opts.tap === false ? 0 : 0.5 - 0.5 * Math.cos((t || 0) * TAU * G.hz);
  const press = opts.press !== undefined ? clamp(opts.press, 0, 1) : loop * loop * loop;
  const sc = size / S;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  if (press > 0.6) {
    const k = (press - 0.6) / 0.4;
    const ga = ctx.globalAlpha;
    ctx.beginPath(); ctx.arc(0, 0, size * G.ring * (0.4 + 0.6 * k), 0, TAU);
    ctx.globalAlpha = ga * G.ringA * (1 - k * 0.6);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.globalAlpha = ga;
  }
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.translate(0, -(1 - press) * size * G.bob);
  ctx.scale(1 + press * G.squash, 1 - press * G.squash);
  ctx.drawImage(cv, -cv.tipX * sc, -cv.tipY * sc, cv.designW * sc, cv.designH * sc);
  ctx.restore();
}

// ---------------------------------------------------------------- self test (dev pages / bots)
function inked(cv) {
  try {
    const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++;
    return n;
  } catch (e) { return -1; }
}
// iconsSelfTest() -> { ok, report }: bakes every variant into a scratch canvas and checks each one actually paints pixels
export function iconsSelfTest() {
  const report = [];
  let ok = true;
  const check = (name, fn) => {
    try {
      const cv = bake(160, 160, c => fn(c));
      const px = inked(cv);
      const pass = px !== 0;
      if (!pass) ok = false;
      report.push((pass ? 'ok   ' : 'FAIL ') + name + ' px=' + px);
    } catch (e) { ok = false; report.push('FAIL ' + name + ' threw ' + (e && e.message)); }
  };
  const vals = { color: Object.keys(TUNE.hues), eyes: [1, 2, 3], hat: ['any'], tail: [true], pattern: ['stripes', 'dots'] };
  for (const attr in vals) {
    for (let i = 0; i < vals[attr].length; i++) {
      for (let h = 0; h < 2; h++) {
        const cl = { attr: attr, value: vals[attr][i], has: h === 0 };
        check('clause ' + attr + ':' + cl.value + (cl.has ? '' : ' NOT'), c => drawClauseIcon(c, cl, 80, 80, 40));
      }
    }
  }
  check('poster 3', c => drawPoster(c, { clauses: [{ attr: 'color', value: 'sky', has: true }, { attr: 'eyes', value: 2, has: false }, { attr: 'tail', value: true, has: true }] }, 80, 10, 0, { scale: 0.6 }));
  check('poster torn', c => drawPoster(c, { clauses: [{ attr: 'hat', value: 'any', has: true }] }, 80, 10, 0, { tear: 0.4 }));
  check('plate out', c => drawPlate(c, 'out', 80, 80, 140, 100, 0.5, 0.5));
  check('plate in', c => drawPlate(c, 'in', 80, 80, 140, 100, 0, 1, undefined, true));
  check('lamp lit', c => drawStrikeLamp(c, 80, 70, 40, true, false));
  check('lamp off', c => drawStrikeLamp(c, 80, 70, 40, false, false));
  check('lamp broken', c => drawStrikeLamp(c, 80, 70, 40, false, true));
  for (let i = 0; i < TIERS.length; i++) check('tier ' + TIERS[i], c => drawTierStamp(c, TIERS[i], 80, 80, 120, 0.3));
  check('tier shut + sub line', c => drawTierStamp(c, 'shut', 80, 80, 150, 0.3, 'Night 7'));
  check('poster revealed at 1.7x (hi-res card)', c => drawPoster(c, { clauses: [{ attr: 'hat', value: 'any', has: false }] }, 80, 4, 0, { scale: 1.7 }));
  check('secondary button (rim + accent icon)', c => drawButton(c, 80, 80, 150, 50, 'Daily', { color: '#2a2760', rim: '#d9a441', textColor: '#fff4dc', iconColor: '#3fbfc4', icon: 'calendar' }));
  check('icon button rim', c => drawIconButton(c, 80, 80, 48, 'gear', { rim: '#d9a441' }));
  check('stamp nice', c => drawStampText(c, label('nice'), 80, 80, 36, '#3ddc84'));
  check('stamp lastcall', c => drawStampText(c, label('lastcall'), 80, 80, 26, '#ffb347', 0.1));
  check('stamp on an opaque plate', c => drawStampText(c, label('lastcall'), 80, 80, 26, '#ffc93c', 1, '#fff4dc'));
  check('pill', c => drawPill(c, 80, 80, 90, 34, '7/20', { icon: 'star' }));
  check('button', c => drawButton(c, 80, 80, 140, 52, 'PLAY', { icon: 'play', press: 0.5 }));
  for (let i = 0; i < GLYPH_NAMES.length; i++) check('icon ' + GLYPH_NAMES[i], c => drawIconButton(c, 80, 80, 48, GLYPH_NAMES[i], { off: i % 5 === 0 }));
  check('badge', c => drawBadge(c, 80, 80, 30, '12'));
  check('glove', c => drawGlove(c, 80, 30, 80, 0.3, { rot: -0.3 }));
  check('tier small (no title ring)', c => drawTierStamp(c, 'bronze', 80, 80, 88, 0.3));
  check('button glow', c => drawButton(c, 80, 80, 140, 52, 'PLAY', { glow: 0.8 }));
  check('poster empty', c => drawPoster(c, null, 80, 10, 0));
  check('tag FAKE! (pin, cord, ear, eyelet)', c => drawTag(c, 80, 30, 15, label('fake'), 0.05));
  check('tag at rest with a glyph', c => drawTag(c, 80, 30, 14, label('vip'), undefined, { glyph: 'badge', dir: -1 }));
  check('tag in Arabic', c => drawTag(c, 80, 30, 14, 'انكشف!', 0.3, { glyph: 'tape' }));
  check('tape strip (turning)', c => drawTape(c, 80, 80, 30, 0.4, { turn: 0.9 }));
  check('stamp busted', c => drawStampText(c, label('busted'), 80, 80, 30, '#ffc233', 0.3, 'rgba(12,11,36,0.55)'));
  check('poster with a modifier tag (reveal)', c => drawPoster(c, { clauses: [{ attr: 'eyes', value: 2, has: true }] }, 80, 4, 0, { scale: 1.4, header: 1, tag: 'VIP NIGHT', tagT: 0.2, tagGlyph: 'badge' }));
  const fact = (name, pass) => { if (!pass) ok = false; report.push((pass ? 'ok   ' : 'FAIL ') + name); };
  // every built-in word exists in both languages (a missing AR key would show English mid-Arabic)
  {
    let same = true;
    for (const k in FALL.en) if (FALL.ar[k] === undefined) same = false;
    for (const k in FALL.ar) if (FALL.en[k] === undefined) same = false;
    fact('built-in words: EN and AR carry the same keys', same);
  }
  // the tag swings about its pin: the pin is near the top centre of the bake and the body hangs below it
  {
    drawTag(bake(4, 4, () => {}).getContext('2d'), 2, 2, 16, 'FAKE!', 0);
    const tc = mget(MC.tag, 'FAKE!', 16, TUNE.tag.col, TUNE.tag.ink, TUNE.tag.pin, '');
    fact('tag pivots on its pin (top centre of the bake)', !!tc && Math.abs(tc.pinX - tc.designW / 2) < 0.01 && tc.pinY < tc.designH * 0.2);
  }
  // poster drops are the guests' rendered hues (one palette, actor.js COLORS) for every clause colour
  {
    let same = true;
    for (const k in GUEST_COLORS) if (TUNE.hues[k] !== GUEST_COLORS[k]) same = false;
    fact('poster drops use the guest palette (actor.js)', same && Object.keys(TUNE.hues).length === 6);
  }
  fact('empty rule shares one entry', posterEntry(null) === posterEntry({ clauses: [] }) && posterEntry(undefined) === posterEntry('x'));
  // the poster contract: every card fits posterBox(), the badge row fills >= 70 % of the card, and the row geometry the
  // play scene reads (rowY / row0 / step) is where paintPoster puts the badges
  {
    const B = posterBox(), CLS = [{ attr: 'color', value: 'sky' }, { attr: 'eyes', value: 2, has: false }, { attr: 'tail', value: true }];
    let fits = true, fill = 1, geo = true;
    for (let n = 1; n <= 3; n++) {
      const e = posterEntry({ clauses: CLS.slice(0, n) });
      if (e.w > B.w + 0.01 || e.foot > B.foot + 0.01) fits = false;
      fill = Math.min(fill, rowW(n) / e.w);
      if (Math.abs(e.rowY - (e.hang + e.h - e.padBot - e.icon / 2)) > 0.01 || Math.abs(e.row0 + (n - 1) * e.step * 0.5) > 0.01) geo = false;
    }
    fact('every poster fits posterBox ' + B.w + ' x ' + B.foot + ', badge row fills ' + Math.round(fill * 100) + '% of the card, row geometry agrees',
      fits && fill >= 0.7 && geo);
  }
  check('clause mark ok (NOT clause satisfied)', c => drawClauseIcon(c, { attr: 'pattern', value: 'stripes', has: false }, 80, 80, 44, 'ok'));
  check('clause mark bad (has clause broken)', c => drawClauseIcon(c, { attr: 'tail', value: true, has: true }, 80, 80, 44, 'bad'));
  // a verdict mark never recolours the ring (a red ring only ever means NOT): the ring's left side (away from the corner
  // sticker) is the same pixel with and without an 'ok' / 'bad' mark, on a must-have and on a must-NOT clause
  {
    const C = TUNE.clause, S = 80, W = 120, CLS = [{ attr: 'eyes', value: 1, has: true }, { attr: 'eyes', value: 1, has: false }];
    const ringPx = (cl, mk) => {
      const cv = bake(W, W, c => paintClause(c, cl, W / 2, W / 2, S, mk)), k = cv.width / W;
      const d = cv.getContext('2d').getImageData(Math.round((W / 2 - S * (C.outer + C.inner) * 0.5) * k), Math.round(W / 2 * k), 1, 1).data;
      return d[0] * 65536 + d[1] * 256 + d[2];
    };
    let same = true;
    try { for (let i = 0; i < CLS.length; i++) { const p0 = ringPx(CLS[i], 0); if (ringPx(CLS[i], 1) !== p0 || ringPx(CLS[i], 2) !== p0) same = false; } }
    catch (e) { same = false; }
    fact('verdict marks keep the ring in its polarity colour', same);
  }
  // the 3-clause badge reads on a phone: >= 52 units at the nail's scale (world.js play.posterS[0] 0.92)
  fact('3-clause badge ' + (iconFor(3) * 0.92).toFixed(1) + ' units at the nail (>= 52)', iconFor(3) * 0.92 >= 52);
  check('poster topper (reveal scale)', c => drawPoster(c, { clauses: [{ attr: 'color', value: 'lime', has: true }] }, 80, 4, 0, { scale: 1.6, header: 1 }));
  // tear: at every step the right half's seam stays right of the left half's (no crossing), and by k = 0.35 the rip is
  // open along the whole card height, bottom included
  {
    const PP = TUNE.poster, e3 = posterEntry({ clauses: [{ attr: 'color', value: 'sky' }, { attr: 'eyes', value: 2 }, { attr: 'tail', value: true }] });
    let minGap = 1e9, openTop = 1e9, openBot = 1e9;
    for (let s = 1; s <= 19; s++) {
      const k = s / 20;
      for (let i = 0; i < TEAR.length; i++) {
        const py = (PP.strH - PP.pad) + (e3.cv.designH) * (i / (TEAR.length - 1));
        if (py < PP.strH || py > PP.strH + e3.h) continue;
        const px = TEAR[i] * PP.tearAmp, g = tearX(e3, 1, k, px, py) - tearX(e3, -1, k, px, py);
        minGap = Math.min(minGap, g);
        if (s === 7) { if (py < PP.strH + e3.h * 0.3) openTop = Math.min(openTop, g); else if (py > PP.strH + e3.h * 0.7) openBot = Math.min(openBot, g); }
      }
    }
    fact('tear opens along the seam (min gap ' + minGap.toFixed(1) + ', k .35 top ' + openTop.toFixed(1) + ' bottom ' + openBot.toFixed(1) + ')',
      minGap >= 0 && openTop > 8 && openBot > 8);
  }
  // pop-in springs pass tiny / zero / NaN sizes: nothing may throw (a throw in render stops the loop for good)
  {
    const tiny = [0, -3, NaN, 0.3, 1, 2.5, 5, 9, 13, 21, 29], TCL = { attr: 'tail', value: true, has: false };
    const HCL = { attr: 'hat', value: 'any', has: false }, CCL = { attr: 'color', value: 'coral', has: false }, ECL = { attr: 'eyes', value: 3, has: true };
    let threw = '';
    const cv = bake(64, 64, () => {});
    const c = cv.getContext('2d');
    for (let i = 0; i < tiny.length && !threw; i++) {
      const s = tiny[i];
      try {
        drawPlate(c, 'in', 30, 30, s, s * 0.7, 0.5, 0.5); drawPlate(c, 'out', 30, 30, s * 2, s, 0, 0, 'OUT', true);
        drawButton(c, 30, 30, s, s * 0.4, 'PLAY', NO); drawButton(c, 30, 30, s * 3, s, 'GO', { icon: 'play', glow: 1 });
        drawIconButton(c, 30, 30, s, 'gear', NO); drawPill(c, 30, 30, s, s * 0.4, '7/20', NO); drawBadge(c, 30, 30, s, '3');
        drawClauseIcon(c, TCL, 30, 30, s); drawStrikeLamp(c, 30, 30, s, true, false); drawStrikeLamp(c, 30, 30, s, false, true);
        drawTierStamp(c, 'gold', 30, 30, s, 0.3); drawTierStamp(c, 'shut', 30, 30, s, 0.3, 'N'); drawStampText(c, 'NICE', 30, 30, s, '#3ddc84', 0.1);
        drawClauseIcon(c, HCL, 30, 30, s); drawClauseIcon(c, CCL, 30, 30, s); drawClauseIcon(c, ECL, 30, 30, s);
        drawGlyph(c, 'door', 30, 30, s); drawGlove(c, 30, 30, s, 0.2); drawPoster(c, null, 30, 5, 0, { scale: s / 40, tear: 0.5 });
        drawTag(c, 30, 30, s, 'FAKE!', 0.1, { glyph: 'tape' }); drawTape(c, 30, 30, s, 0.3, { turn: 1.5 }); drawGlyph(c, 'pin', 30, 30, s);
      } catch (err) { threw = s + ': ' + (err && err.message); }
    }
    fact('tiny / zero / NaN sizes never throw' + (threw ? ' (size ' + threw + ')' : ''), !threw);
  }
  const base = bres(), hiR = base * 1.5, cl = { attr: 'tail', value: true, has: true }, rule = { clauses: [cl] };
  let hiTier = null, hiPoster = null;
  withBakeRes(hiR, () => {
    check('hi-res clause', c => drawClauseIcon(c, cl, 80, 80, 40));
    check('hi-res tier', c => drawTierStamp(c, 'gold', 80, 80, 120, 0.3));
    hiTier = mget(MC.tier, 'gold', 120, label('title'), '');
    hiPoster = bakePoster(rule);
  });
  fact('withBakeRes bakes at its res (tier ' + (hiTier && hiTier.res) + ', poster ' + (hiPoster && hiPoster.res) + ')',
    !!hiTier && hiTier.res === hiR && !!hiPoster && hiPoster.res === hiR && RES === 0 && MC === M);
  fact('stage bakes untouched by withBakeRes', bakePoster(rule).res === base);
  return { ok: ok, report: report };
}

export const icons = {
  TUNE, GLYPH_NAMES, TIERS, CLAUSE_HUES, label, drawClauseIcon, drawPoster, bakePoster, posterMetrics, posterBox, drawPlate,
  drawStrikeLamp, drawTierStamp, drawStampText, drawPill, drawButton, drawIconButton, drawGlyph, drawBadge, drawGlove,
  drawTag, drawTape, withBakeRes, clearIconCache, iconsSelfTest, PLATE_SKINS, setPlateSkin, plateSkin,
};
