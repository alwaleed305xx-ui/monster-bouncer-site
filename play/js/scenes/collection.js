// collection.js: the House Band roster ('collection', GAME-SPEC §3 / §9), staged as the party room's back wall: damask
// wallpaper under a red velvet valance and side drapes, two amber sconces, a dado rail, and five arched stage wells in
// brass frames (3 + 2) with a wooden stage lip and a row of footlights. A member who has joined dances live in its well
// under a warm spotlight with its instrument (actor.js band mode on the party beat), the footlights chasing on the beat,
// its brass name plaque below and its colour looks as six swatch dots (owned / worn / still locked). A species still
// outside is a warm-backlit silhouette (amber rim, glow pulsing behind it) with a velvet '?' sticker, dark footlights and
// a mint bar of correct admits toward the next free seat (profile.bandProgress / bandNeedNow: the seat needs come from
// profile.js TUNE.bandNeeds by join order, so the bar, its 'n/need' and the hint line always match the profile);
// tapping it shakes it no. Tapping a member opens its dressing room: the room dims, a spotlight cone, the member big
// and dancing (party.solo plays its instrument alone), its six colour looks as swatch buttons (tap an owned one to wear it:
// profile.setLook, the member re-dressed with a pop + sparkles in that colour), the admits still needed for the next look,
// and a close button (or a tap outside). Under the wells: one hint line (the next seat's need / how to dress them), then
// the party decor plate (it stands on the stage-floor wainscot under the dado rail, nothing card-shaped around it):
// current decor (stars: a night's best tier is worth gold 3 / silver 2 / bronze 1 -> garland ... neon sign, then the
// club front's searchlights, fireworks, marquee lights), a 9-star level ladder with the next star filling, the gold star
// medal with the stars earned and how many more are needed (the ladder's stars: gold with an ink keyline when reached, a
// cream outline on an ink keyline when still to come, readable on the indigo plate). Header: the round Home button in the
// top-LEFT corner in both languages (the top-right 100 x 100 stays empty for the facecam, as on the result card; the
// indigo + brass secondary sticker), title, "Band n/5" pill. Labels are Baloo 2 (the decor header with an ink outline). Back (or
// the browser / Android back: onBack, which first closes an open dressing room) goes home (zoom). The lobby music keeps
// playing (party 'lobby' with the unlocked set); exit() clears any solo.
// Cosmetics (MONETIZATION §6.2): the dressing room has an Outfits row under the colour looks: the House clothes + the 7
// outfit themes of that member as round chips (the art agent's drawItemThumb). An owned outfit is worn with a tap
// (wallet.equip('outfit', id, species): the member re-dressed with a pop + sparkles; the worn chip is green with a
// check); a locked one shows its gem price under it and buys with two taps ('Tap again' bubble, wallet.buyItem, then it
// is worn; not enough gems opens the shop's Get gems sheet); a Starter-only look (Rock Star) opens the Starter Pack
// sheet. Under the Home button a round party-look button opens the shop's Party tab (themes, ropes, doors, plates to
// buy or use). Coming back from the shop (resume) re-dresses the wells.
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { draw } from '../core/draw.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens, delay } from '../core/tween.js';
import { particles } from '../core/particles.js';
import { TAU, clamp, easeIndex } from '../core/math.js';
import { createActor, drawMini, prewarm, setBeat, COLORS } from '../game/actor.js';
import { drawPill, drawGlyph, drawBadge } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { plural } from '../game/strings.js';
import { HOUSE, SPECIES, INSTR_KEY, UI_INK, UI_ACCENT, createLabel, createButtons, createPanel, createToast, beat, measure, memberSpec } from './home.js';
import { wallet, OUTFIT_THEMES, itemById } from '../game/economy.js';
import * as COSM from '../game/cosmetics-art.js';
import { drawGem, drawArt, fmtGems } from './shop.js';

const TUNE = {
  header: { y: 34, pillDy: 42, back: 46 },
  // stage wells: 3 on the first row, 2 centred on the second; well height fits the space between maxH and minH
  well: { w: 106, gap: 14, maxH: 172, minH: 112, rowGap: 16, top: 122, frame: 7, lip: 13, bottomBar: 16, plaqueH: 24, plaqueGap: 7, progH: 18 },
  hintGap: 14, hintH: 18,
  // the ladder's stars: reached = gold, still to come = a cream outline at emptyA; both on a keyline-wide ink edge
  decor: { h: 104, gap: 18, levels: 9, star: 9, starStep: 23, gold: '#ffc93c', next: '#ffb347', empty: 'rgba(255,244,220,0.45)', keyline: 2,
    emptyFill: '#211b52' },
  // dadoUp: the dado rail runs this far above the decor plate (the wainscot below it frames the plate)
  // floor: the wainscot under the dado is the stage floor (dark boards, plank seams, a warm sheen), no panels
  room: { wall: [[0, '#2e1f5a'], [0.45, '#231850'], [1, '#150e32']], stripe: 30, motif: 'rgba(255,209,102,0.07)', valance: '#9e1c36',
    valanceDark: '#5e0c1f', fringe: '#e2b04f', drape: 16, dadoUp: 6, sconceY: 92, sconceX: 34,
    floor: [[0, '#24163f'], [0.5, '#1a1030'], [1, '#0c0719']], plank: 13, seam: 'rgba(0,0,0,0.26)', seamHi: 'rgba(255,214,150,0.035)' },
  col: { pipOff: 'rgba(255,255,255,0.13)', join: '#4fe3b0', glow: '#ffb347', bulbOn: '#fff3c4', bulbOff: '#5a4630' },
  spot: { a: 0.55, beat: 0.25 },
  back: { a: 0.36, amp: 0.1, hz: 0.6 },                      // locked: the amber backlight behind the silhouette
  pop: { first: 0.08, step: 0.06 },
  shake: { amp: 7, dur: 0.38, hz: 22 },
  dress: { dim: 0.92, scale: 1.3, feet: 0.57, sw: 48, swGap: 10, swDy: 92, fade: 0.22, titleY: 0.14 },
  // the dressing room's Outfits row (8 chips: House + 7 themes), `dy` below the swatch row's centre, its label labelUp
  // above it, price tags tagDy under it; a gem chip's first tap arms it for confirmSec
  outfit: { sw: 40, gap: 5, dy: 120, labelUp: 30, tagDy: 29, thumb: 30, confirmSec: 3, worn: '#2f9e5e' },
  club: { size: 44, dy: 54 },                                  // the party-look button, dy under the Home button
  vibrate: 8,
};

const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5], AN_T = [0.5, 0];
const AO = { alpha: 1, dim: 0, flip: false, light: { door: 0.45, lamp: 0 } };
const DANCE_O = { instrument: true, tempo: 108, phase: 0 };
const PILL_BAND = { icon: 'band', color: '#2a2760' };
const GLY_STAR = { color: '#ffc93c' };
const GLY_TROPHY = { color: '#ffffff' };
const BADGE_Q = { color: UI_ACCENT.velvet, textColor: UI_ACCENT.velvetText };
const BADGE_GOLD = { color: UI_ACCENT.gold };
const SP_POP = { to: 1, stiffness: 260, damping: 14 };
const SP_PRESS = { to: 1, stiffness: 800, damping: 40 };
const SP_REL = { to: 0, stiffness: 500, damping: 14 };
const SP_DRESS = { to: 1, stiffness: 240, damping: 11, velocity: 3 };
const OV_SPARK = { count: 10, spawnRadius: 20 };
const OV_LOOK = { count: 18, spawnRadius: 46, colors: null };

// ---------------------------------------------------------------- baked art
// the back wall (one bake per stage height): wallpaper stripes + damask diamonds, valance swags with a gold fringe, the
// side drapes, a dado rail with a darker wainscot below, two brass sconces
function bakeRoom(c, w, h) {
  const R = TUNE.room, top = stage.safeTop;
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, R.wall); c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += R.stripe) { c.fillStyle = 'rgba(255,255,255,0.028)'; c.fillRect(x, 0, R.stripe / 2, h); }
  c.fillStyle = R.motif;
  for (let y = 18, row = 0; y < h; y += 44, row++) {
    for (let x = (row & 1) ? R.stripe : R.stripe / 2; x < w; x += R.stripe * 2) {
      c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 5, y); c.lineTo(x, y + 7); c.lineTo(x - 5, y); c.closePath(); c.fill();
      c.fillRect(x - 0.6, y - 12, 1.2, 3); c.fillRect(x - 0.6, y + 9, 1.2, 3);
    }
  }
  // the stage floor under the dado rail (the decor plate stands on it): dark boards with plank seams and a warm sheen,
  // nothing card-shaped to peek out around the plate
  const dy = Math.round(st.dadoY);
  c.fillStyle = draw.gradient(c, 0, dy, 0, h, R.floor); c.fillRect(0, dy, w, h - dy);
  for (let y = dy + 10, i = 0; y < h; y += R.plank, i++) {
    c.fillStyle = R.seam; c.fillRect(0, y, w, 1.2);
    c.fillStyle = R.seamHi; c.fillRect(0, y + 1.2, w, 1);
    for (let x = ((i * 53) % 97) - 97; x < w; x += 97) { c.fillStyle = R.seam; c.fillRect(x, y - R.plank + 1.2, 1.2, R.plank - 1.2); }
  }
  c.fillStyle = draw.gradient(c, 0, dy, 0, dy + 26, [[0, 'rgba(255,179,71,0.08)'], [1, 'rgba(255,179,71,0)']]); c.fillRect(0, dy, w, 26);
  c.fillStyle = draw.gradient(c, 0, dy - 4, 0, dy + 6, [[0, '#f0c45a'], [0.5, '#b07a22'], [1, '#5a3a0a']]); c.fillRect(0, dy - 4, w, 9);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, dy + 5, w, 3);
  // sconces: brass cup + bulb (their light glows per frame)
  for (let i = 0; i < 2; i++) {
    const sx = i ? w - R.sconceX : R.sconceX, sy = top + R.sconceY;
    draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(sx - 9, sy); cc.lineTo(sx + 9, sy); cc.lineTo(sx + 5, sy + 10); cc.lineTo(sx - 5, sy + 10); cc.closePath(); },
      { fill: '#d9a441', outline: UI_INK, lineWidth: 2, highlight: 0.3, shadow: 0.2, bounds: [sx - 9, sy, 18, 10] });
    c.fillStyle = '#fff3c4'; c.beginPath(); c.ellipse(sx, sy - 5, 5, 7, 0, 0, TAU); c.fill();
    c.fillStyle = '#8a5a14'; c.fillRect(sx - 1.5, sy + 10, 3, 10);
  }
  // side drapes: folds of red velvet with a gold tie-back
  for (let i = 0; i < 2; i++) {
    const x0 = i ? w - R.drape : 0;
    c.fillStyle = draw.gradient(c, x0, 0, x0 + R.drape, 0, i ? [[0, R.valanceDark], [0.4, R.valance], [1, '#6e1226']] : [[0, '#6e1226'], [0.6, R.valance], [1, R.valanceDark]]);
    c.fillRect(x0, 0, R.drape, h);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x0 + R.drape * 0.45, 0, 2, h);
    c.fillStyle = R.fringe; c.fillRect(x0, Math.round(h * 0.52), R.drape, 6);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0, Math.round(h * 0.52) + 6, R.drape, 2);
  }
  // valance: a velvet band with scalloped swags and a gold fringe
  const vb = top - 6, sw = 48, n = Math.ceil(w / sw);
  c.fillStyle = draw.gradient(c, 0, 0, 0, vb + 18, [[0, R.valanceDark], [0.6, R.valance], [1, '#7a1429']]);
  c.fillRect(0, 0, w, vb);
  for (let i = 0; i < n; i++) { c.beginPath(); c.ellipse(i * sw + sw / 2, vb, sw / 2 + 1, 16, 0, 0, Math.PI); c.fill(); }
  c.strokeStyle = R.fringe; c.lineWidth = 3;
  for (let i = 0; i < n; i++) { c.beginPath(); c.ellipse(i * sw + sw / 2, vb, sw / 2 - 1, 15, 0, 0.12, Math.PI - 0.12); c.stroke(); }
  c.fillStyle = R.fringe;
  for (let i = 0; i <= n; i++) { c.beginPath(); c.arc(i * sw, vb + 2, 4, 0, TAU); c.fill(); }
}
// an arch path (flat bottom, semicircular top) in the box (x, y, w, h)
function arch(c, x, y, w, h) {
  const r = w / 2;
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath();
}
// the opening of a well inside its frame, in well-local coordinates (origin = the frame's top-left)
const OPEN = { x: 0, y: 0, w: 0, h: 0 };
function openingOf(W, H) {
  const T = TUNE.well;
  OPEN.x = T.frame; OPEN.y = T.frame; OPEN.w = W - 2 * T.frame; OPEN.h = H - T.frame - T.bottomBar;
  return OPEN;
}
// brass-framed stage well (on: velvet lit warm, off: dark), drawn at (4, 4) inside a (W + 8) x (H + 8) bake
function makeWell(on) {
  return function (c, bw, bh) {
    const W = bw - 8, H = bh - 8, x0 = 4, y0 = 4, T = TUNE.well, o = openingOf(W, H), ox = x0 + o.x, oy = y0 + o.y;
    c.fillStyle = 'rgba(6,4,22,0.5)'; arch(c, x0 + 1.5, y0 + 4, W, H); c.fill();
    c.fillStyle = draw.gradient(c, 0, y0, 0, y0 + H, [[0, '#ffe9a8'], [0.22, '#e2b04f'], [0.72, '#b07a22'], [1, '#7a4a10']]);
    arch(c, x0, y0, W, H); c.fill();
    c.lineWidth = 3; c.strokeStyle = UI_INK; c.stroke();
    arch(c, x0 + 3, y0 + 3, W - 6, H - 5); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.stroke();
    // the opening: velvet backdrop with folds, a wooden stage lip at its foot
    c.save();
    arch(c, ox, oy, o.w, o.h); c.clip();
    c.fillStyle = on ? draw.gradient(c, 0, oy, 0, oy + o.h, [[0, '#55204f'], [0.55, '#33113b'], [1, '#1d0a24']])
      : draw.gradient(c, 0, oy, 0, oy + o.h, [[0, '#2a1838'], [1, '#120a1c']]);
    c.fillRect(ox, oy, o.w, o.h);
    for (let x = ox + 6; x < ox + o.w; x += 12) {
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, oy, 4, o.h);
      c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(x + 5, oy, 2, o.h);
    }
    c.fillStyle = draw.radial(c, ox + o.w / 2, oy, 0, o.w, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(ox, oy, o.w, o.w * 0.6);
    const ly = oy + o.h - T.lip;
    c.fillStyle = draw.gradient(c, 0, ly, 0, oy + o.h, [[0, on ? '#9a6232' : '#4a3020'], [1, on ? '#4a2810' : '#24160c']]);
    c.fillRect(ox, ly, o.w, T.lip);
    c.fillStyle = 'rgba(255,230,180,' + (on ? 0.35 : 0.12) + ')'; c.fillRect(ox, ly, o.w, 1.5);
    c.restore();
    arch(c, ox, oy, o.w, o.h); c.lineWidth = 2; c.strokeStyle = UI_INK; c.stroke();
    // footlight trough along the bottom bar + the keystone medallion
    c.fillStyle = '#3a2208'; draw.roundRect(c, x0 + 10, y0 + H - T.bottomBar + 4, W - 20, 7, 3.5); c.fill();
    draw.sticker(c, cc => draw.circle(cc, x0 + W / 2, y0 + 5, 7), { fill: '#ffd166', outline: UI_INK, lineWidth: 2, highlight: 0.4, shadow: 0.2 });
  };
}
const BAKE_WELL_ON = makeWell(true), BAKE_WELL_OFF = makeWell(false);
function bakePlaque(c, w, h) {
  const x = 3, y = 3, W = w - 6, H = h - 7;
  c.fillStyle = 'rgba(6,4,22,0.45)'; draw.roundRect(c, x + 1, y + 3, W, H, 6); c.fill();
  c.fillStyle = draw.gradient(c, 0, y, 0, y + H, [[0, '#ffe39a'], [0.5, '#d9a441'], [1, '#9a6a1c']]);
  draw.roundRect(c, x, y, W, H, 6); c.fill();
  c.lineWidth = 2; c.strokeStyle = UI_INK; c.stroke();
  draw.roundRect(c, x + 2.5, y + 2.5, W - 5, H - 5, 4); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.45)'; c.stroke();
  c.fillStyle = '#7a4a10';
  c.beginPath(); c.arc(x + 6, y + H / 2, 1.6, 0, TAU); c.fill();
  c.beginPath(); c.arc(x + W - 6, y + H / 2, 1.6, 0, TAU); c.fill();
}
function bakeCone(c, w, h) {
  const top = w * 0.18;
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, 'rgba(255,220,150,0.8)'], [0.75, 'rgba(255,179,71,0.25)'], [1, 'rgba(255,179,71,0.08)']]);
  c.beginPath(); c.moveTo(w / 2 - top / 2, 0); c.lineTo(w / 2 + top / 2, 0); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  c.fillStyle = draw.radial(c, w / 2, h - 10, 0, w / 2, [[0, 'rgba(255,220,150,0.6)'], [1, 'rgba(255,179,71,0)']]);
  c.save(); c.translate(w / 2, h - 10); c.scale(1, 0.25); c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.restore(); c.fill();
}
function bakeBulb(c, w, h) {
  c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [[0, 'rgba(255,240,190,0.95)'], [0.3, 'rgba(255,190,90,0.5)'], [1, 'rgba(255,170,60,0)']]);
  c.fillRect(0, 0, w, h);
}
// locked silhouettes, two layers per species + size: an amber rim (the mini a touch larger, flat warm) and the dark body
const SIL = {}, RIM = {};
for (let i = 0; i < SPECIES.length; i++) {
  const sp = SPECIES[i];
  SIL[sp] = function (c, w, h) {
    drawMini(c, HOUSE[sp], w / 2, h / 2, w * 0.9);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#2a1a3c'], [1, '#100818']]);
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  };
  RIM[sp] = function (c, w, h) {
    c.save(); c.translate(w / 2, h / 2 - 1); c.scale(1.08, 1.06); c.translate(-w / 2, -h / 2);
    drawMini(c, HOUSE[sp], w / 2, h / 2, w * 0.9);
    c.restore();
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#ffd68a'], [1, '#ff8a3c']]);
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  };
}

// ---------------------------------------------------------------- state
const st = { t: 0, active: false, solo: '', top: 120, wellH: 150, rowY: [0, 0], hintY: 600, decorY: 700, dadoY: 640, n: 0, roomKey: '', layoutH: -1 };
const rows = [];
for (let i = 0; i < SPECIES.length; i++) {
  rows.push({
    sp: SPECIES[i], x: 0, y: 0, top: 0, pop: 0, press: 0, shakeT: -1, actor: null, scale: 0.5, ax: 0, unlocked: false,
    prog: { stage: 'join', count: 0, need: 3, unlocked: false, total: 0, looks: 0, looksMax: 6, look: '' },
    name: createLabel(TUNE.well.w - 10, 22, { size: 14, weight: 800, color: '#3a2208', maxWidth: TUNE.well.w - 22 }),
    frac: createLabel(44, 18, { size: 12.5, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 3 }),
    silKey: '', rimKey: '', silS: 0, wellKey: '', looks: null, worn: '',
  });
}
const lbl = {
  title: createLabel(250, 44, { size: 28, weight: 800, color: '#fff4d6', outline: UI_INK, outlineWidth: 7, shadow: true }),
  hint: createLabel(360, 22, { size: 14, weight: 700, color: '#ffe2b8', outline: 'rgba(14,8,32,0.85)', outlineWidth: 3.5 }),
  decor: createLabel(200, 22, { size: 14.5, weight: 800, color: UI_ACCENT.lilac, outline: UI_INK, outlineWidth: 3.5, align: 'left' }),
  decorName: createLabel(230, 30, { size: 21, weight: 800, color: '#ffd166', outline: UI_INK, outlineWidth: 5, align: 'left' }),
  decorNext: createLabel(250, 20, { size: 13, weight: 700, color: 'rgba(233,228,255,0.78)', align: 'left' }),
  golds: createLabel(70, 22, { size: 14, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 4 }),
  // dressing room
  dName: createLabel(340, 44, { size: 30, weight: 800, color: '#ffd166', outline: UI_INK, outlineWidth: 8, shadow: true }),
  dInst: createLabel(300, 28, { size: 17, weight: 800, color: '#ffe2b8', outline: UI_INK, outlineWidth: 4.5 }),
  dLooks: createLabel(200, 24, { size: 15, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 4 }),
  dNeed: createLabel(350, 22, { size: 14, weight: 700, color: 'rgba(255,240,214,0.88)', outline: UI_INK, outlineWidth: 3 }),
};
const panelDecor = createPanel('#2f2560', { radius: 24, inner: 'rgba(255,209,102,0.3)' });
const btns = createButtons();
const back = btns.add({ id: 'back', kind: 'icon', x: 36, y: 60, w: TUNE.header.back, secondary: true, icon: 'home', onTap: goBack });
const view = { bandStr: '', bandW: 120, level: 0, golds: 0, next: null, frac: 0, decorPop: 0, hintPop: 0, confirmStr: '' };
let pressed = null, pressId = -1;

// dressing room: one member up close with its six looks as swatch buttons
const dr = { on: false, out: false, a: 0, t: 0, row: null, actor: null, pop: 1, k: 0, need: 0, prog: { stage: 'join', count: 0, need: 10, unlocked: true, total: 0, looks: 1, looksMax: 6, look: '' } };
const dbtns = createButtons();
const dClose = dbtns.add({ id: 'close', kind: 'icon', x: 36, y: 60, w: TUNE.header.back, secondary: true, icon: 'close', onTap: closeDress });
const SW = [];
for (let i = 0; i < 6; i++) SW.push(dbtns.add({ id: 'look' + i, kind: 'icon', x: 0, y: 0, w: TUNE.dress.sw, color: '#2a2550', icon: '', col: '', own: false, shake: -1, dx: 0, onTap: tapSwatch }));
// the Outfits row: chip 0 = the House clothes, then one per outfit theme (MONETIZATION §3.3)
const OUT = [];
for (let i = 0; i <= OUTFIT_THEMES.length; i++) {
  const b = dbtns.add({ id: 'out' + i, kind: 'icon', x: 0, y: 0, w: TUNE.outfit.sw, secondary: true, icon: '', overlay: outfitOverlay, onTap: tapOutfit,
    theme: i ? OUTFIT_THEMES[i - 1] : '', oid: '', thumbKey: '', own: true, worn: false, price: 0, excl: false, confirm: 0,
    tag: createLabel(52, 20, { size: 11.5, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 3 }) });
  // the look's thumbnail (art agent's drawItemThumb), baked once per item into its own sprite (thumbKey carries the id)
  b.thumbFn = function (c, w, h) { if (typeof COSM.drawItemThumb !== 'function' || !COSM.drawItemThumb(c, b.oid, w / 2, h / 2, w)) drawArt(c, 'bow', w / 2, h / 2, w * 0.7); };
  OUT.push(b);
}
const outLbl = createLabel(200, 22, { size: 13.5, weight: 800, color: '#ffe2b8', outline: UI_INK, outlineWidth: 3.5 });
const toast = createToast();
const club = btns.add({ id: 'club', kind: 'icon', x: 36, y: 110, w: TUNE.club.size, secondary: true, icon: '', overlay: clubOverlay, onTap: tapClub });
const GLY_HOME = { color: '#fff4dc' }, GLY_OK = { color: '#ffffff' };
const PILL_CONF = { color: '#2f9e5e', textColor: '#fff4dc', icon: '' };
const BADGE_OK = { color: '#2f9e5e', textColor: '#fff4dc' }, BADGE_LOCK = { color: '#3b3584', textColor: '#fff4dc' };
function clubOverlay(ctx) { drawArt(ctx, 'house', 0, 0, 26); }
function outfitOverlay(ctx, b) {
  const T = TUNE.outfit;
  if (!b.theme) drawGlyph(ctx, 'home', 0, 0, 20, GLY_HOME);
  else { SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1; draw.sprite(ctx, draw.cached(b.thumbKey, T.thumb, T.thumb, b.thumbFn), 0, 1, SPR); }
  if (!b.own) { ctx.fillStyle = 'rgba(12,10,36,0.42)'; ctx.beginPath(); ctx.arc(0, 0, T.sw / 2 - 3, 0, TAU); ctx.fill(); }
  if (b.excl && !b.own) { drawBadge(ctx, T.sw * 0.32, -T.sw * 0.32, 16, '', BADGE_LOCK); drawGlyph(ctx, 'lock', T.sw * 0.32, -T.sw * 0.32, 10, GLY_HOME); }
  if (b.worn) { drawBadge(ctx, T.sw * 0.34, -T.sw * 0.32, 17, '', BADGE_OK); drawGlyph(ctx, 'check', T.sw * 0.34, -T.sw * 0.32, 11, GLY_OK); }
}
// the chips' states for the member in the dressing room (on open and after every change)
function outfitStates() {
  const r = dr.row;
  if (!r) return;
  const sp = r.sp, worn = wallet.equipped('outfit', sp);
  for (let i = 0; i < OUT.length; i++) {
    const b = OUT[i], id = b.theme ? 'outfit.' + b.theme + '.' + sp : '', it = id ? itemById(id) : null;
    if (b.oid !== id) { b.oid = id; b.thumbKey = 'coll.othumb.' + id; }
    b.own = !id || wallet.owns(id); b.worn = worn === id; b.confirm = 0;
    b.excl = !!it && (it.gems === null || it.gems === undefined);
    b.price = !b.own && it && !b.excl ? it.gems : 0;
    b.tag.set(b.price ? fmtGems(b.price) : '');
    b.color = b.worn ? TUNE.outfit.worn : '#2a2760';
  }
  outLbl.set(i18n.t('shop.outfits'));
}
function wearOutfit(r, id, b) {
  if (!wallet.equip('outfit', id, r.sp)) return;
  dr.actor = createActor(memberSpec(r.sp));
  dr.actor.setState('cheer', { onDone: backToDance });
  dr.pop = 0.7; spring(dr, 'pop', SP_DRESS);
  dressActor(r);
  party.sfx.voice(r.sp);
  input.vibrate(TUNE.vibrate);
  particles.emit('sparkle', b.x, b.y - 10, OV_SPARK);
  particles.emit('sparkle', 195, stage.h * TUNE.dress.feet - 70, OV_OUT);
}
const OV_OUT = { count: 18, spawnRadius: 46, colors: ['#ffd166', '#ffffff', '#ff4fa3', '#53e0ff'] };
function tapOutfit(b) {
  const r = dr.row;
  if (!r) return;
  if (b.own) {
    if (!b.worn) wearOutfit(r, b.oid, b);
    else if (b.oid) { wearOutfit(r, '', b); toast.show(i18n.t('shop.house_back'), 1.8); }
    outfitStates();
    return;
  }
  if (b.excl) { scenes.push('shop', { popup: true, sheet: 'mb_starter_pack', from: 'collection' }); return; }
  const have = wallet.gems();
  if (have < b.price) { scenes.push('shop', { popup: true, sheet: 'nogems', need: b.price - have, from: 'collection' }); return; }
  if (b.confirm <= 0) {
    for (let i = 0; i < OUT.length; i++) OUT[i].confirm = 0;
    b.confirm = TUNE.outfit.confirmSec; party.sfx.plate();
    return;
  }
  const res = wallet.buyItem(b.oid);
  if (res && res.ok) {
    wearOutfit(r, b.oid, b);
    toast.show(i18n.t('shop.bought', { name: i18n.t('shop.outfit_name', { theme: i18n.t('shop.th.' + b.theme), name: i18n.t('sp_' + r.sp) }) }), 2.2, 'check');
    party.sfx.nice(10);
  }
  outfitStates();
}
function tapClub() { if (!scenes.transitioning) scenes.push('shop', { tab: 'club', from: 'collection' }); }

function goBack() {
  if (scenes.transitioning) return;
  btns.locked = true;
  scenes.go('home', {}, { transition: 'zoom', ms: 420 });
}

function refresh() {
  const rtl = i18n.isRTL;
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], sp = r.sp;
    profile.bandProgress(sp, r.prog);
    r.unlocked = r.prog.unlocked;
    if (r.unlocked) n++;
    r.looks = profile.looks(sp); r.worn = profile.lookOf(sp);
    r.name.set(i18n.t('sp_' + sp));
    r.frac.set(i18n.t('band_progress', { n: r.prog.count, need: r.prog.need }));
  }
  st.n = n;
  view.bandStr = i18n.t('band_count', { n: n, t: SPECIES.length });
  view.bandW = measure(view.bandStr, 15) + 60;
  lbl.title.set(i18n.t('band'));
  lbl.hint.set(n < SPECIES.length ? i18n.t('seat_next', { n: profile.bandNeedNow() }) : i18n.t('look_pick'));
  const di = profile.decorInfo();
  // the decor currency is stars (profile.decorInfo: stars, prev = this level's need, next = the next level's)
  const stars = di.stars !== undefined ? di.stars : di.golds, prevNeed = di.prev !== undefined ? di.prev : profile.tune.decorGolds[di.level];
  view.level = di.level; view.golds = stars; view.next = di.next;
  view.frac = di.next === null ? 1 : clamp((stars - prevNeed) / Math.max(1, di.next - prevNeed), 0, 1);
  const al = rtl ? 'right' : 'left';
  lbl.decor.set(i18n.t('decor')).align(al);
  lbl.decorName.set(i18n.t('decor_' + di.level)).align(al);
  const more = di.next === null ? 0 : di.next - stars;
  lbl.decorNext.set(di.next === null ? '' : plural('decor_next', more, i18n.lang, { n: more })).align(al);
  lbl.golds.set(String(stars));
  view.confirmStr = i18n.t('shop.confirm');
  if (dr.on && dr.row) { dressTexts(); outfitStates(); }
  layout();
}

function layout() {
  const T = TUNE, H = stage.h, Wl = T.well, rtl = i18n.isRTL;
  st.layoutH = H;
  // top-left in both languages: the top-right 100 x 100 stays empty (facecam)
  back.y = dClose.y = stage.safeTop + T.header.y;
  back.x = dClose.x = 36;
  const bottom = H - stage.safeBottom - 10;
  st.decorY = bottom - T.decor.h / 2;
  st.dadoY = st.decorY - T.decor.h / 2 - T.room.dadoUp;
  st.roomKey = 'coll.room.' + H + '.' + stage.safeTop + '.' + Math.round(st.dadoY);
  st.hintY = st.decorY - T.decor.h / 2 - T.decor.gap - T.hintH / 2;
  const top = stage.safeTop + Wl.top, below = Wl.plaqueGap + Wl.plaqueH + Wl.progH;
  const area = st.hintY - T.hintH / 2 - T.hintGap - top;
  st.wellH = Math.round(clamp((area - Wl.rowGap) / 2 - below, Wl.minH, Wl.maxH));
  const used = 2 * (st.wellH + below) + Wl.rowGap;
  st.top = top + Math.max(0, (area - used) * 0.45);
  st.rowY[0] = st.top; st.rowY[1] = st.top + st.wellH + below + Wl.rowGap;
  const step = Wl.w + Wl.gap, key = st.wellH;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], row = i < 3 ? 0 : 1, col = row === 0 ? i - 1 : (i === 3 ? -0.5 : 0.5);
    r.x = 195 + (rtl ? -col : col) * step;
    r.top = st.rowY[row]; r.y = r.top + st.wellH / 2;
    r.wellKey = 'coll.well.' + Wl.w + 'x' + key;
    const o = openingOf(Wl.w, st.wellH), ss = Math.round(Math.min(o.w - 14, o.h - Wl.lip - 18));
    if (r.silS !== ss) { r.silS = ss; r.silKey = 'coll.sil.' + r.sp + '.' + ss; r.rimKey = 'coll.rim.' + r.sp + '.' + ss; }
    fitActor(r);
  }
  // dressing room swatches, centred under the member
  const D = T.dress, feet = H * D.feet, n = SW.length, sw = D.sw + D.swGap;
  for (let i = 0; i < n; i++) { const c = (i - (n - 1) / 2) * sw; SW[i].x = 195 + (rtl ? -c : c); SW[i].y = feet + D.swDy; }
  // the Outfits row under the colour looks' progress, in reading order
  const O = T.outfit, on = OUT.length, ow = O.sw + O.gap;
  for (let i = 0; i < on; i++) { const c = (i - (on - 1) / 2) * ow; OUT[i].x = 195 + (rtl ? -c : c); OUT[i].y = feet + D.swDy + O.dy; }
  // the party-look button under Home (top-left in both languages)
  club.x = back.x; club.y = back.y + T.club.dy;
}
// a live member: the scale that fits the opening (bounds include the instrument in band mode), centred on its box
function fitActor(r) {
  if (!r.actor) return;
  const Wl = TUNE.well, o = openingOf(Wl.w, st.wellH), b = r.actor.bounds();
  r.scale = Math.min(0.6, (o.h - Wl.lip - 16) / b.h, (o.w - 10) / b.w);
  r.ax = -(b.x + b.w / 2) * r.scale;
}
function dressActor(r) {
  r.actor = createActor(memberSpec(r.sp));
  DANCE_O.phase = Math.random() * 0.2;
  r.actor.setState('dance', DANCE_O);
  r.actor.update(1 / 120);
  fitActor(r);
}

function rowAt(x, y) {
  const Wl = TUNE.well, h = st.wellH + Wl.plaqueGap + Wl.plaqueH;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (Math.abs(x - r.x) <= Wl.w / 2 + 4 && y >= r.top - 4 && y <= r.top + h + 4) return r;
  }
  return null;
}
function tapRow(r) {
  if (r.unlocked) openDress(r);
  else {
    r.shakeT = 0;
    party.sfx.plate();
    input.vibrate([10, 40, 10]);
  }
}
function backToDance(a, cancelled) { if (!cancelled && st.active) a.setState('dance', DANCE_O); }

// ---------------------------------------------------------------- dressing room
function dressTexts() {
  const r = dr.row, p = dr.prog;
  profile.bandProgress(r.sp, p);
  lbl.dName.set(i18n.t('look_name', { color: i18n.t('col_' + profile.lookOf(r.sp)), name: i18n.t('sp_' + r.sp) }));
  lbl.dInst.set(i18n.t('plays', { inst: i18n.t(INSTR_KEY[r.sp]) }));
  lbl.dLooks.set(i18n.t('looks_count', { n: p.looks, t: p.looksMax }));
  const left = Math.max(0, p.need - p.count);
  lbl.dNeed.set(p.stage === 'max' ? i18n.t('looks_all') : plural('look_need', left, i18n.lang, { n: left }));
  const L = profile.looks(r.sp), worn = profile.lookOf(r.sp);
  for (let i = 0; i < SW.length; i++) {
    const b = SW[i], c = L[i], own = i < p.looks;
    b.col = c; b.own = own;
    b.color = own ? COLORS[c] : '#2a2550';
    b.icon = !own ? 'lock' : (c === worn ? 'check' : '');
  }
}
function openDress(r) {
  if (dr.on) return;
  dr.on = true; dr.out = false; dr.t = 0; dr.a = 0; dr.row = r; dr.pop = 0.6;
  dr.actor = createActor(memberSpec(r.sp));
  dr.actor.setState('dance', DANCE_O);
  dressTexts();
  outfitStates();
  spring(dr, 'pop', SP_DRESS);
  btns.locked = true; dbtns.reset(); dbtns.locked = false; dbtns.popIn(0.1, 0.04);
  st.solo = r.sp; party.solo(r.sp); party.sfx.voice(r.sp);
  if (r.actor) r.actor.setState('cheer', { onDone: backToDance });
  particles.emit('sparkle', r.x, r.y, OV_SPARK);
}
function closeDress() {
  if (!dr.on || dr.out) return;
  dr.out = true; dr.t = 0; dbtns.locked = true;
  st.solo = ''; party.solo(null);
}
function tapSwatch(b) {
  const r = dr.row;
  if (!r) return;
  if (!b.own) { b.shake = 0; party.sfx.plate(); input.vibrate([10, 40, 10]); return; }
  if (!profile.setLook(r.sp, b.col)) { party.sfx.voice(r.sp); return; }
  dr.actor = createActor(memberSpec(r.sp));
  dr.actor.setState('cheer', { onDone: backToDance });
  dr.pop = 0.7; spring(dr, 'pop', SP_DRESS);
  dressTexts();
  dressActor(r);
  party.sfx.voice(r.sp);
  input.vibrate(TUNE.vibrate);
  OV_LOOK.colors = OV_LOOK_COLS[b.col] || null;
  particles.emit('sparkle', 195, stage.h * TUNE.dress.feet - 70, OV_LOOK);
}
const OV_LOOK_COLS = {};
for (const k in COLORS) OV_LOOK_COLS[k] = [COLORS[k], '#ffffff', '#ffd166'];

// ---------------------------------------------------------------- scene
export const collection = {
  get rows() { return rows; },
  get state() { return st; },
  get buttons() { return btns; },
  get dressing() { return dr; },
  get swatches() { return SW; },

  // the browser / Android back (main.js): closes the dressing room, else back to the lobby
  onBack() {
    if (dr.on) { closeDress(); return true; }
    goBack();
    return true;
  },

  // back from the shop (the party-look button, a Starter / Get gems sheet): outfits may have changed or been bought
  resume() {
    btns.locked = dr.on; dbtns.locked = !dr.on;
    for (let i = 0; i < rows.length; i++) if (rows[i].unlocked) dressActor(rows[i]);
    if (dr.on && dr.row) { dr.actor = createActor(memberSpec(dr.row.sp)); dr.actor.setState('dance', DANCE_O); dressTexts(); outfitStates(); }
  },
  enter() {
    st.active = true; st.t = 0; st.solo = '';
    dr.on = false; dr.row = null; dr.actor = null;
    toast.hide();
    btns.reset(); btns.locked = false;
    setBeat(beat);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      r.pop = 0; r.press = 0; r.shakeT = -1; r.actor = null;
    }
    refresh();
    for (let i = 0; i < rows.length; i++) if (rows[i].unlocked) dressActor(rows[i]);
    layout();
    for (let i = 0; i < rows.length; i++) if (rows[i].actor) prewarm(memberSpec(rows[i].sp), [rows[i].scale], [0]);
    party.start('lobby');
    party.setLobbyBand(profile.bandUnlocked());
    btns.popIn(0, 0);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      delay((TUNE.pop.first + i * TUNE.pop.step) * 1000).then(ok => { if (ok && st.active) spring(r, 'pop', SP_POP); });
    }
    view.decorPop = 0; view.hintPop = 0;
    delay((TUNE.pop.first + rows.length * TUNE.pop.step) * 1000).then(ok => { if (ok && st.active) { spring(view, 'decorPop', SP_POP); spring(view, 'hintPop', SP_POP); } });
  },
  exit() {
    st.active = false;
    party.solo(null);
    btns.kill(); dbtns.kill();
    for (let i = 0; i < rows.length; i++) { tweens.killTarget(rows[i]); rows[i].actor = null; }
    tweens.killTarget(view); tweens.killTarget(dr);
    dr.on = false; dr.actor = null; dr.row = null;
  },

  update(dt) {
    st.t += dt;
    btns.update(dt); dbtns.update(dt);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.actor) r.actor.update(dt);
      if (r.shakeT >= 0) { r.shakeT += dt; if (r.shakeT > TUNE.shake.dur) r.shakeT = -1; }
    }
    if (dr.on) {
      dr.t += dt;
      if (dr.actor) dr.actor.update(dt);
      if (dr.out) {
        dr.a = Math.max(0, 1 - dr.t / TUNE.dress.fade);
        if (dr.a <= 0) { dr.on = false; dr.actor = null; dr.row = null; btns.locked = false; }
      } else dr.a = Math.min(1, dr.t / TUNE.dress.fade);
      for (let i = 0; i < SW.length; i++) { const b = SW[i]; if (b.shake >= 0) { b.shake += dt; if (b.shake > TUNE.shake.dur) b.shake = -1; } }
      for (let i = 0; i < OUT.length; i++) { const b = OUT[i]; if (b.confirm > 0) b.confirm = Math.max(0, b.confirm - dt); }
    }
    toast.update(dt);
    if (st.layoutH !== stage.h) layout();
  },

  render(ctx) {
    const W = stage.w, H = stage.h, T = TUNE, rtl = i18n.isRTL, t = st.t;
    SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1;
    draw.sprite(ctx, draw.cached(st.roomKey, W, H, bakeRoom), W / 2, H / 2, SPR);
    // sconce light, flickering a touch
    const fl = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 2.9);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    draw.glow(ctx, T.room.sconceX, stage.safeTop + T.room.sconceY - 4, 70, T.col.glow, 0.3 * fl);
    draw.glow(ctx, W - T.room.sconceX, stage.safeTop + T.room.sconceY - 4, 70, T.col.glow, 0.3 * fl);
    ctx.restore();
    // header
    const hy = stage.safeTop + T.header.y;
    lbl.title.draw(ctx, W / 2, hy);
    drawPill(ctx, W / 2, hy + T.header.pillDy, view.bandW, 30, view.bandStr, PILL_BAND);
    btns.draw(ctx, t);
    // the stage wells
    const bt = beat(), ph = bt >= 0 ? bt - Math.floor(bt) : (t * 1.8) % 1, pulse = (1 - ph) * (1 - ph);
    for (let i = 0; i < rows.length; i++) drawWell(ctx, rows[i], pulse, bt, t);
    // hint
    if (view.hintPop > 0.01) lbl.hint.draw(ctx, W / 2, st.hintY, clamp(view.hintPop, 0, 1));
    drawDecor(ctx, rtl);
    if (dr.on) drawDress(ctx, pulse);
  },

  onInput(evt, d) {
    if (dr.on) {
      if (dr.out) return true;
      if (dbtns.onInput(evt, d)) return true;
      // a tap outside the member and the swatch row closes the room
      if (evt === 'down') {
        const D = TUNE.dress, feet = stage.h * D.feet;
        const onRow = Math.abs(d.y - SW[0].y) <= D.sw * 0.7 || Math.abs(d.y - OUT[0].y) <= TUNE.outfit.sw * 0.5 + 34;
        const onStage = Math.abs(d.x - 195) < 90 && d.y > feet - 190 && d.y < feet + 20;
        if (!onRow && !onStage) { party.sfx.plate(); closeDress(); }
        else if (onStage && dr.actor) { dr.actor.setState('cheer', { onDone: backToDance }); party.sfx.voice(dr.row.sp); }
      }
      return true;
    }
    if (btns.onInput(evt, d)) return true;
    if (evt === 'down') {
      const r = rowAt(d.x, d.y);
      if (!r) return false;
      pressed = r; pressId = d.id;
      spring(r, 'press', SP_PRESS);
      return true;
    }
    if (!pressed || (d.id !== undefined && d.id !== pressId)) return false;
    if (evt === 'move') { if (rowAt(d.x, d.y) !== pressed) { spring(pressed, 'press', SP_REL); pressed = null; } return true; }
    if (evt === 'up') {
      const r = pressed;
      pressed = null;
      spring(r, 'press', SP_REL);
      if (rowAt(d.x, d.y) === r) tapRow(r);
      return true;
    }
    return false;
  },
};

function drawWell(ctx, r, pulse, bt, t) {
  const T = TUNE, Wl = T.well, C = T.col, s = r.pop;
  if (s <= 0.01) return;
  const Wd = Wl.w, Hd = st.wellH, o = openingOf(Wd, Hd);
  let dx = 0;
  if (r.shakeT >= 0) { const k = 1 - r.shakeT / T.shake.dur; dx = Math.sin(r.shakeT * T.shake.hz) * T.shake.amp * k; }
  const ps = 1 - 0.04 * clamp(r.press, 0, 1), cx = r.x + dx, x0 = cx - Wd / 2, y0 = r.top;
  ctx.save();
  ctx.translate(cx, r.y); ctx.scale(s * ps, s * ps); ctx.translate(-cx, -r.y);
  ctx.globalAlpha *= clamp(s, 0, 1);
  SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1;
  draw.sprite(ctx, draw.cached(r.wellKey + (r.unlocked ? '.on' : '.off'), Wd + 8, Hd + 8, r.unlocked ? BAKE_WELL_ON : BAKE_WELL_OFF), cx, y0 + Hd / 2, SPR);
  // inside the opening
  const ox = x0 + o.x, oy = y0 + o.y, feet = oy + o.h - Wl.lip * 0.45;
  ctx.save();
  arch(ctx, ox, oy, o.w, o.h); ctx.clip();
  if (r.unlocked) {
    ctx.globalCompositeOperation = 'lighter';
    SPR.anchor = AN_T; SPR.alpha = T.spot.a + T.spot.beat * pulse;
    if (r.coneW !== o.w || r.coneH !== o.h) { r.coneW = o.w; r.coneH = o.h; r.coneKey = 'coll.cone.' + Math.round(o.w) + 'x' + Math.round(o.h); }   // key built on a size change only
    draw.sprite(ctx, draw.cached(r.coneKey, o.w, o.h, bakeCone), cx, oy, SPR);
    ctx.globalCompositeOperation = 'source-over';
    draw.shadowBlob(ctx, cx, feet, 26, 5, 0.5);
    if (r.actor) r.actor.draw(ctx, cx + r.ax, feet, r.scale, AO);
  } else {
    const k = T.back.a + T.back.amp * Math.sin(t * TAU * T.back.hz + r.x * 0.05), sy = feet - r.silS * 0.5;
    ctx.globalCompositeOperation = 'lighter';
    draw.glow(ctx, cx, sy, o.w * 0.75, C.glow, k);
    ctx.globalCompositeOperation = 'source-over';
    SPR.anchor = AN_C; SPR.alpha = 0.9;
    draw.sprite(ctx, draw.cached(r.rimKey, r.silS, r.silS, RIM[r.sp]), cx, sy, SPR);
    SPR.alpha = 1;
    draw.sprite(ctx, draw.cached(r.silKey, r.silS, r.silS, SIL[r.sp]), cx, sy + 1, SPR);
  }
  ctx.restore();
  // footlights along the bottom bar: lit + chasing on the beat for a member, dark for a stranger
  const by = y0 + Hd - Wl.bottomBar + 7.5, n = 5, span = Wd - 30, step = Math.floor(bt >= 0 ? bt * 2 : t * 4);
  for (let j = 0; j < n; j++) {
    const bx = cx - span / 2 + j * span / (n - 1), lit = r.unlocked ? ((j + step) % 2 === 0 ? 1 : 0.55) : 0;
    ctx.fillStyle = lit > 0 ? C.bulbOn : C.bulbOff;
    ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, TAU); ctx.fill();
  }
  if (r.unlocked) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = draw.cached('coll.bulb', 24, 24, bakeBulb);
    SPR.anchor = AN_C;
    for (let j = 0; j < n; j++) {
      SPR.alpha = (j + step) % 2 === 0 ? 0.9 : 0.4; SPR.scale = 1;
      draw.sprite(ctx, g, cx - span / 2 + j * span / (n - 1), by - 1, SPR);
    }
    ctx.restore();
  } else {
    // the '?' sticker on the stranger, bobbing
    const qx = cx + Wd * 0.24, qy = oy + o.h * 0.38 + Math.sin(t * 2.4 + r.x) * 2.5;
    ctx.save(); ctx.translate(qx, qy); ctx.rotate(0.18 + (r.shakeT >= 0 ? Math.sin(r.shakeT * 30) * 0.3 : 0));
    drawBadge(ctx, 0, 0, 30, '?', BADGE_Q);
    ctx.restore();
  }
  // brass name plaque + progress (a stranger: admits toward its seat; a member: its looks as swatch dots)
  const py = y0 + Hd + Wl.plaqueGap + Wl.plaqueH / 2;
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1;
  if (r.plaqueW !== Wd) { r.plaqueW = Wd; r.plaqueKey = 'coll.plaque.' + (Wd - 6); }
  draw.sprite(ctx, draw.cached(r.plaqueKey, Wd - 6 + 6, Wl.plaqueH + 7, bakePlaque), cx, py + 2, SPR);
  r.name.draw(ctx, cx, py);
  const gy = py + Wl.plaqueH / 2 + Wl.progH / 2 + 2;
  if (r.unlocked) {
    const L = r.looks, own = r.prog.looks, n2 = L.length, st2 = 13;
    for (let j = 0; j < n2; j++) {
      const k = i18n.isRTL ? n2 - 1 - j : j, x = cx + (k - (n2 - 1) / 2) * st2, c = L[j];
      if (j < own) {
        ctx.fillStyle = COLORS[c]; ctx.beginPath(); ctx.arc(x, gy, 4.6, 0, TAU); ctx.fill();
        ctx.lineWidth = c === r.worn ? 2 : 1.4; ctx.strokeStyle = c === r.worn ? '#ffffff' : UI_INK; ctx.stroke();
      } else {
        ctx.fillStyle = C.pipOff; ctx.beginPath(); ctx.arc(x, gy, 3.4, 0, TAU); ctx.fill();
      }
    }
  } else {
    const bw = Wd - 46, bx = cx - Wd / 2 + 6, k = r.prog.need > 0 ? clamp(r.prog.count / r.prog.need, 0, 1) : 0;
    const x1 = i18n.isRTL ? cx + Wd / 2 - 6 - bw : bx;
    ctx.fillStyle = C.pipOff; draw.roundRect(ctx, x1, gy - 4, bw, 8, 4); ctx.fill();
    if (k > 0) { ctx.fillStyle = C.join; draw.roundRect(ctx, i18n.isRTL ? x1 + bw - Math.max(8, bw * k) : x1, gy - 4, Math.max(8, bw * k), 8, 4); ctx.fill(); }
    r.frac.draw(ctx, i18n.isRTL ? cx - Wd / 2 + 20 : cx + Wd / 2 - 20, gy, 0.95);
  }
  ctx.restore();
}

function drawDecor(ctx, rtl) {
  const T = TUNE, ds = view.decorPop;
  if (ds <= 0.01) return;
  const dy = st.decorY, dh = T.decor.h, pw = 2 * (195 - 24), px = rtl ? 195 + pw / 2 - 22 : 195 - pw / 2 + 22, dir = rtl ? -1 : 1;
  ctx.save();
  ctx.translate(195, dy); ctx.scale(ds, ds); ctx.translate(-195, -dy);
  ctx.globalAlpha *= clamp(ds, 0, 1);
  panelDecor.draw(ctx, 195, dy, pw, dh);
  lbl.decor.draw(ctx, px, dy - dh / 2 + 20);
  lbl.decorName.draw(ctx, px, dy - dh / 2 + 42);
  // the star medal on the far side: the stars earned (the decor currency)
  const gx = rtl ? 195 - pw / 2 + 42 : 195 + pw / 2 - 42;
  drawBadge(ctx, gx, dy - 12, 46, '', BADGE_GOLD);
  drawGlyph(ctx, 'star', gx, dy - 13, 26, GLY_TROPHY);
  lbl.golds.draw(ctx, gx, dy + 24);
  // the level ladder: a star per decor level, the next one filling with the stars earned toward it
  const D = T.decor, L = D.levels, sy = dy + 14, step = D.starStep, R = D.star;
  ctx.lineJoin = 'round';
  for (let j = 0; j < L; j++) {
    const x = px + dir * (j * step + R + 1), on = j < view.level, r = on ? R : R * 0.86;
    draw.star(ctx, x, sy, r, 0.5, 5);
    if (on) {
      ctx.fillStyle = D.gold; ctx.fill();
      ctx.lineWidth = D.keyline; ctx.strokeStyle = UI_INK; ctx.stroke();
      continue;
    }
    // still to come: the ink keyline outside, a dark well (the next star filling in amber with the stars earned toward
    // it), and the cream outline on the edge
    ctx.lineWidth = D.keyline * 2 + 1.6; ctx.strokeStyle = UI_INK; ctx.stroke();
    ctx.fillStyle = D.emptyFill; ctx.fill();
    if (j === view.level && view.next !== null && view.frac > 0) {
      ctx.save(); ctx.beginPath();
      const fw = 2 * r * view.frac;
      ctx.rect(rtl ? x + r - fw : x - r, sy - r, fw, 2 * r); ctx.clip();
      draw.star(ctx, x, sy, r, 0.5, 5); ctx.fillStyle = D.next; ctx.fill();
      ctx.restore();
      draw.star(ctx, x, sy, r, 0.5, 5);
    }
    ctx.lineWidth = 1.6; ctx.strokeStyle = D.empty; ctx.stroke();
  }
  lbl.decorNext.draw(ctx, px, dy + dh / 2 - 18, 0.95);
  ctx.restore();
}

const DCONE = { ch: -1, key: '' };   // the dressing-room cone's cache key (rebuilt when its height changes)
function drawDress(ctx, pulse) {
  const W = stage.w, H = stage.h, D = TUNE.dress, a = dr.a;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * D.dim;
  ctx.fillStyle = '#07051a'; ctx.fillRect(-30, -30, W + 60, H + 60);
  ctx.globalAlpha = a;
  const feet = H * D.feet;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  SPR.anchor = AN_T; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = a * (0.6 + 0.2 * pulse);
  const ch = Math.round(feet - stage.safeTop + 20);
  if (DCONE.ch !== ch) { DCONE.ch = ch; DCONE.key = 'coll.dcone.' + ch; }
  draw.sprite(ctx, draw.cached(DCONE.key, 260, ch, bakeCone), W / 2, stage.safeTop, SPR);
  ctx.restore();
  if (dr.actor) {
    const s = D.scale * Math.max(0.01, dr.pop);
    draw.shadowBlob(ctx, W / 2, feet + 2, 60 * s, 11 * s, 0.5 * a);
    AO.alpha = 1;
    dr.actor.draw(ctx, W / 2, feet, s, AO);
  }
  const y0 = Math.max(stage.safeTop + 74, H * D.titleY), ts = easeIndex.outBack(clamp(dr.t / 0.3, 0, 1));
  lbl.dName.draw(ctx, W / 2, y0, a, dr.out ? 1 : 0.7 + 0.3 * ts);
  lbl.dInst.draw(ctx, W / 2, y0 + 36, a);
  lbl.dLooks.draw(ctx, W / 2, feet + D.swDy - D.sw / 2 - 22, a);
  // swatches (a locked one shakes no when tapped: offset for this draw only)
  for (let i = 0; i < SW.length; i++) {
    const b = SW[i], k = b.shake >= 0 ? 1 - b.shake / TUNE.shake.dur : 0;
    b.dx = k > 0 ? Math.sin(b.shake * TUNE.shake.hz) * 5 * k : 0;
    b.x += b.dx;
  }
  dbtns.draw(ctx, st.t);
  for (let i = 0; i < SW.length; i++) SW[i].x -= SW[i].dx;
  lbl.dNeed.draw(ctx, W / 2, feet + D.swDy + D.sw / 2 + 24, a);
  const p = dr.prog;
  if (p.stage !== 'max') {
    const bw = 170, bx = W / 2 - bw / 2, by = feet + D.swDy + D.sw / 2 + 42, k = p.need > 0 ? clamp(p.count / p.need, 0, 1) : 0;
    ctx.fillStyle = TUNE.col.pipOff; draw.roundRect(ctx, bx, by - 4, bw, 8, 4); ctx.fill();
    if (k > 0) { ctx.fillStyle = '#ffc93c'; const fw = Math.max(8, bw * k); draw.roundRect(ctx, i18n.isRTL ? bx + bw - fw : bx, by - 4, fw, 8, 4); ctx.fill(); }
  } else drawGlyph(ctx, 'star', W / 2, feet + D.swDy + D.sw / 2 + 44, 18, GLY_STAR);
  // the Outfits row: its label, price tags under the locked looks, a 'Tap again' bubble over an armed one
  const O = TUNE.outfit, oy = feet + D.swDy + O.dy;
  outLbl.draw(ctx, W / 2, oy - O.labelUp, a);
  for (let i = 0; i < OUT.length; i++) {
    const b = OUT[i];
    if (!b.price) continue;
    const tw = b.tag.str.length * 7 + 14;
    drawGem(ctx, b.x - tw / 2 + 5, oy + O.tagDy, 11, a);
    b.tag.draw(ctx, b.x + 6, oy + O.tagDy + 1, a);
    if (b.confirm > 0) {
      const bx = clamp(b.x, 60, W - 60);
      ctx.save(); ctx.translate(bx, oy - O.sw / 2 - 18); drawPill(ctx, 0, 0, 108, 26, view.confirmStr, PILL_CONF); ctx.restore();
    }
  }
  if (toast.str) toast.draw(ctx, W / 2, H - stage.safeBottom - 26);
  ctx.restore();
}

stage.onResize(() => { st.layoutH = -1; });
i18n.onChange(() => { if (st.active) refresh(); });
