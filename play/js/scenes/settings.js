// settings.js: the settings overlay ('settings', GAME-SPEC §3; opened with scenes.push('settings') from home or pause).
// A sticker panel pops over the dimmed scene below: Sound, Music, Vibration and Left-hand mode switches (tap the row; the
// knob springs across, the track cross-fades; sticker switches in the UI kit's language: a 3 px ink outline round a brass
// inner rim, a top highlight, the IN-plate green when on / deep indigo when off, a cream outlined knob with a soft
// top-left highlight), Language (its globe disc + label on the same column as the switch rows) with an Auto / English /
// العربية segmented control, Reset progress as a hold-to-confirm
// button that does not out-shout the panel (the indigo + brass secondary sticker with a red glyph; red shows only as the
// hold fill sweeping across it: 1.5 s, release early to cancel; on completion profile.reset() keeps the settings, the
// screen shakes and a toast confirms), the about line + version, and a close button (indigo + brass
// secondary sticker; also a tap outside the panel or the browser / Android back: onBack). The language segment follows
// the language actually in use (i18n.onChange / profile 'lang'), also when it was switched elsewhere while the panel is
// open. Every change goes through profile.setSetting; this module
// also wires profile.onSettings -> party.setEnabled(sfx, music) once at load (replayed immediately), so the party music and
// sfx follow the saved switches from the first frame.
// Purchases (MONETIZATION §6.1 / §9.3, Apple 3.1.1): a Restore Purchases row (payments.restore() from the tap, a toast
// with what came back; hidden where purchases are off: the public web build), Terms · Privacy links (the site's absolute
// URLs, opened in the browser / Safari) under the about line, and the reset caption says gems and purchases stay.
import { restore as restorePurchases, providerName } from '../game/payments.js';
import { drawGem, restoreNote } from './shop.js';
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { draw } from '../core/draw.js';
import { text } from '../core/text.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens } from '../core/tween.js';
import { camera } from '../core/camera.js';
import { post } from '../core/post.js';
import { clamp } from '../core/math.js';
import { drawGlyph, drawBadge } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { UI_INK, createLabel, createButtons, createPanel, createToast, fontGen, measure } from './home.js';

const TUNE = {
  version: '1.0.0',
  dim: 0.66,
  panel: { w: 350, color: '#2a2760', top: 70, row: 54, lang: 64, reset: 84, about: 66, pad: 18, radius: 30, restore: 60, links: 28 },
  restore: { w: 262, h: 42, font: 16 },
  links: { terms: 'https://alwaleed305xx-ui.github.io/monster-bouncer-site/terms.html',
    privacy: 'https://alwaleed305xx-ui.github.io/monster-bouncer-site/privacy.html', gap: 54 },
  // switches: the IN plate's green family when on, a deep indigo well when off (both sticker tracks: `ink` outline, a brass
  // rim rimIn inside it); the cream knob carries a soft top-left highlight
  sw: { w: 58, h: 32, knob: 24, on: '#2f9e5e', off: '#1f1c52', knobFill: '#fff4dc', ink: 3, rim: '#d9a441', rimIn: 3.4, rimW: 1.8 },
  // reset: the secondary sticker (UI_SECONDARY) with a red glyph; the hold fill is velvet with a bright leading edge
  reset: { w: 262, h: 44, up: 30, cap: 64, glyph: '#ff5a6a', fill: 'rgba(179,32,58,0.66)', edge: 'rgba(255,214,222,0.95)', font: 17 },
  // the language segments (narrow enough that the row's globe disc + label share the switch rows' label column)
  seg: { w: 60, h: 34, gap: 4, on: '#ffb347', off: '#1f1c52' },
  holdSec: 1.5,
  closeMs: 170,
  vibrate: 8,
};

// party wiring: the saved sfx / music switches drive the party buses (replayed now, then on every change)
profile.onSettings((k, v, s) => { if (k === 'sfx' || k === 'music') party.setEnabled(s.sfx, s.music); }, true);

const ROWS = [
  { key: 'sfx', label: 'sound', icon: 'sound', k: 0, y: 0 },
  { key: 'music', label: 'music', icon: 'music', k: 0, y: 0 },
  { key: 'haptics', label: 'haptics', icon: 'vibrate', k: 0, y: 0 },
  { key: 'left', label: 'left', icon: 'left', k: 0, y: 0 },
];
const LANGS = [{ v: '', key: 'lang_auto', x: 0, k: 0 }, { v: 'en', key: 'lang_en', x: 0, k: 0 }, { v: 'ar', key: 'lang_ar', x: 0, k: 0 }];
const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5];
const SP_IN = { to: 1, stiffness: 300, damping: 18 };
const SP_KNOB = { to: 1, stiffness: 420, damping: 20 };
const SP_KNOB0 = { to: 0, stiffness: 420, damping: 20 };
const SP_SEG = { to: 1, stiffness: 400, damping: 22 };
const SP_SEG0 = { to: 0, stiffness: 400, damping: 22 };
const GLY = { color: '#ffffff' };
const BADGE_ROW = { color: '#3b3584' };
const PULSE = { chroma: 1, ms: 220 };

const st = { t: 0, active: false, a: 0, s: 0.9, closing: -1, top: 100, h: 500, from: '', aboutKey: '', aboutGen: -1, langY: 0, resetCapY: 0, aboutY: 0 };
const lbl = {
  title: createLabel(240, 40, { size: 26, weight: 800, color: '#fff4d6', outline: UI_INK, outlineWidth: 6 }),
  lang: createLabel(76, 26, { size: 16, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 4, align: 'left' }),
  reset: createLabel(300, 20, { size: 13, weight: 700, color: 'rgba(233,228,255,0.72)' }),
  version: createLabel(200, 18, { size: 12, weight: 700, color: 'rgba(233,228,255,0.45)' }),
};
const rowLbl = [], segLbl = [];
for (let i = 0; i < ROWS.length; i++) rowLbl.push(createLabel(200, 26, { size: 16, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 4, align: 'left' }));
for (let i = 0; i < LANGS.length; i++) segLbl.push(createLabel(TUNE.seg.w - 6, 26, { size: 13, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 3.5 }));
const panel = createPanel(TUNE.panel.color, { radius: TUNE.panel.radius, inner: 'rgba(255,209,102,0.18)' });
const toast = createToast();
const btns = createButtons();
const closeBtn = btns.add({ id: 'close', kind: 'icon', x: 340, y: 120, w: 42, secondary: true, icon: 'close', onTap: close });
const resetBtn = btns.add({ id: 'reset', x: 195, y: 500, w: TUNE.reset.w, h: TUNE.reset.h, secondary: true, iconColor: TUNE.reset.glyph, icon: 'retry',
  label: '', size: TUNE.reset.font, holdSec: TUNE.holdSec, onHold: doReset, overlay: holdFill });
let pressed = null, pressId = -1;
// Restore Purchases (secondary sticker, a gem on its leading side) + the Terms · Privacy links
const restoreBtn = btns.add({ id: 'restore', x: 195, y: 440, w: TUNE.restore.w, h: TUNE.restore.h, secondary: true, label: '', size: TUNE.restore.font,
  overlay: restoreOverlay, onTap: doRestore });
const linkLbl = {
  terms: createLabel(110, 22, { size: 13, weight: 800, color: '#c9c3f0' }),
  privacy: createLabel(110, 22, { size: 13, weight: 800, color: '#c9c3f0' }),
};
const RS = { busy: false, show: true, linksY: 0 };
function restoreOverlay(ctx, b) { drawGem(ctx, (i18n.isRTL ? 1 : -1) * (b.w / 2 - 26), 0, 22); }
function doRestore() {
  if (RS.busy) return;
  RS.busy = true;
  toast.show(i18n.t('shop.restoring'), 1.6);
  // the same words as the shop's footer (shop.restoreNote): a cancelled Apple ID sheet says nothing, a failure says the
  // restore failed, and a reinstall whose purchases came back silently at launch says they are all here (r.owned)
  restorePurchases().then(r => {
    RS.busy = false;
    if (!st.active) return;
    const m = restoreNote(r, providerName() === 'mock');
    if (!m) toast.hide(); else toast.show(i18n.t(m.key, m.params), 2.6, m.icon);
  }, () => { RS.busy = false; if (st.active) toast.show(i18n.t('shop.restore_failed'), 2.4); });
}
function linkAt(x, y) {
  if (Math.abs(y - RS.linksY) > 14) return '';
  const L = TUNE.links;
  if (Math.abs(x - (195 - L.gap)) < 46) return L.terms;
  if (Math.abs(x - (195 + L.gap)) < 46) return L.privacy;
  return '';
}

// the hold progress: velvet red sweeping across the face from the leading end (inside the brass rim), a bright edge
function holdFill(ctx, b) {
  const k = b.hold01;
  if (k <= 0) return;
  const R = TUNE.reset, w = b.w - 10, h = b.h - 10, rtl = i18n.isRTL, fw = w * k;
  ctx.save();
  draw.roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.clip();
  const x0 = rtl ? w / 2 - fw : -w / 2;
  ctx.fillStyle = R.fill;
  ctx.fillRect(x0, -h / 2, fw, h);
  // the glyph + words again over the fill (cream on velvet), laid out as icons.js lays out the face
  ctx.beginPath(); ctx.rect(x0, -h / 2, fw, h); ctx.clip();
  const fs = b.size, iw = fs * 1.1, gap = fs * 0.32, tw = HOLD.tw, total = tw + iw + gap, left = -total / 2;
  const ix = HOLD.rtl ? left + tw + gap + iw / 2 : left + iw / 2, tx = HOLD.rtl ? left + tw / 2 : left + iw + gap + tw / 2;
  drawGlyph(ctx, 'retry', ix, 0, iw, GLY_HOLD);
  holdLbl.draw(ctx, tx, HOLD.rtl ? 0 : fs * 0.07);
  ctx.restore();
  ctx.save();
  draw.roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.clip();
  ctx.fillStyle = R.edge;
  ctx.fillRect(rtl ? x0 - 1 : x0 + fw - 2, -h / 2, 3, h);
  ctx.restore();
}
const HOLD = { tw: 0, rtl: false };
const GLY_HOLD = { color: '#fff4dc', outline: '#4a0a1c' };
const holdLbl = createLabel(240, 32, { size: TUNE.reset.font, weight: 800, color: '#fff4dc', outline: '#4a0a1c', outlineWidth: Math.max(2.5, TUNE.reset.font * 0.2),
  shadow: 'rgba(0,0,0,0.28)', shadowOffset: Math.max(1.2, TUNE.reset.font * 0.07) });

// a sticker track: the fill (a touch lighter at the top), a soft inner shade under the top edge, a top highlight band,
// a bottom-right shade, the brass inner rim with a cream catch-light along its top, and the 3 px ink outline
function bakeTrack(col) {
  return function (c, w, h) {
    const S = TUNE.sw, W = S.w, H = S.h, x = (w - W) / 2, y = (h - H) / 2, r = H / 2, ri = S.rimIn;
    draw.sticker(c, cc => draw.roundRect(cc, x, y, W, H, r), { fill: col, outline: UI_INK, lineWidth: S.ink, highlight: 0, shadow: 0.22 });
    c.save(); draw.roundRect(c, x, y, W, H, r); c.clip();
    c.fillStyle = draw.gradient(c, 0, y, 0, y + 6, [[0, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(x, y, W, 6);
    c.fillStyle = 'rgba(255,255,255,0.2)'; draw.roundRect(c, x + r * 0.6, y + H * 0.2, W - r * 1.2, H * 0.24, H * 0.12); c.fill();
    c.restore();
    draw.roundRect(c, x + ri, y + ri, W - 2 * ri, H - 2 * ri, r - ri); c.lineWidth = S.rimW; c.strokeStyle = S.rim; c.stroke();
    c.save(); c.beginPath(); c.rect(x, y, W, H * 0.45); c.clip();
    draw.roundRect(c, x + ri - 0.9, y + ri - 0.9, W - 2 * ri + 1.8, H - 2 * ri + 1.8, r - ri + 0.9); c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,246,214,0.6)'; c.stroke();
    c.restore();
    draw.roundRect(c, x, y, W, H, r); c.lineWidth = S.ink; c.strokeStyle = UI_INK; c.stroke();
  };
}
const TRACK_ON = bakeTrack(TUNE.sw.on), TRACK_OFF = bakeTrack(TUNE.sw.off);
function bakeKnob(c, w, h) {
  const r = TUNE.sw.knob / 2;
  draw.shadowBlob(c, w / 2 + 1, h / 2 + 3, r, r * 0.9, 0.35);
  draw.sticker(c, cc => draw.circle(cc, w / 2, h / 2, r), { fill: TUNE.sw.knobFill, outline: UI_INK, lineWidth: 2.5, highlight: 0.45, shadow: 0.25 });
  c.beginPath(); c.arc(w / 2, h / 2, r * 0.42, 0, Math.PI * 2); c.lineWidth = 1.2; c.strokeStyle = 'rgba(29,24,64,0.18)'; c.stroke();
  // the soft top-left highlight
  c.beginPath(); c.ellipse(w / 2 - r * 0.32, h / 2 - r * 0.38, r * 0.36, r * 0.2, -0.6, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
}
function bakeSeg(col) {
  return function (c, w, h) {
    const W = TUNE.seg.w, H = TUNE.seg.h;
    draw.sticker(c, cc => draw.roundRect(cc, (w - W) / 2, (h - H) / 2, W, H, H / 2), { fill: col, outline: UI_INK, lineWidth: 2.5, highlight: 0.25, shadow: 0.2 });
  };
}
const SEG_ON = bakeSeg(TUNE.seg.on), SEG_OFF = bakeSeg(TUNE.seg.off);
function bakeAbout(c, w, h) {
  const o = ABOUT_O, size = o.size, lines = text.wrap(c, i18n.t('about_text'), w - 16, size, o.weight, o.font);
  const n = Math.min(3, lines.length), lh = size * 1.45, y0 = h / 2 - (n - 1) * lh / 2;
  for (let i = 0; i < n; i++) draw.text(c, lines[i], w / 2, y0 + i * lh, o);
}
const ABOUT_O = { size: 12, weight: 600, font: 'Poppins', color: 'rgba(233,228,255,0.72)' };

function close() {
  if (st.closing >= 0) return;
  st.closing = 0;
  btns.locked = true;
  spring(st, 'a', SP_OUT);
  spring(st, 's', SP_OUT_S);
}
const SP_OUT = { to: 0, stiffness: 500, damping: 30 };
const SP_OUT_S = { to: 0.9, stiffness: 500, damping: 30 };

function doReset() {
  profile.reset(true);
  camera.addTrauma(0.35);
  post.pulse(PULSE);
  party.sfx.strike();
  input.vibrate([20, 40, 30]);
  toast.show(i18n.t('reset_done'), 2.2, 'check');
}

// the segment to light: the saved choice ('' = Auto), unless the language in use was switched elsewhere without it (a
// bare i18n.set): then the language actually showing
function langSel() {
  const cur = profile.settings.lang;
  return cur && cur !== i18n.lang ? i18n.lang : cur;
}
function setLangKnobs() {
  const cur = langSel();
  for (let i = 0; i < LANGS.length; i++) spring(LANGS[i], 'k', LANGS[i].v === cur ? SP_SEG : SP_SEG0);
}

function refresh() {
  const al = i18n.isRTL ? 'right' : 'left';
  lbl.title.set(i18n.t('settings'));
  lbl.lang.set(i18n.t('language')).align(al);
  lbl.reset.set(i18n.t('shop.reset_keeps'));
  restoreBtn.label = i18n.t('shop.restore');
  linkLbl.terms.set(i18n.t('shop.terms')); linkLbl.privacy.set(i18n.t('shop.privacy'));
  RS.show = providerName() !== 'none';
  restoreBtn.hidden = !RS.show;
  lbl.version.set(i18n.t('version', { v: TUNE.version }));
  for (let i = 0; i < ROWS.length; i++) rowLbl[i].set(i18n.t(ROWS[i].label)).align(al);
  for (let i = 0; i < LANGS.length; i++) segLbl[i].set(i18n.t(LANGS[i].key));
  resetBtn.label = i18n.t('reset_hold');
  holdLbl.set(resetBtn.label);
  HOLD.rtl = text.dir(resetBtn.label) === 'rtl';
  HOLD.tw = measure(resetBtn.label, TUNE.reset.font) + Math.max(2.5, TUNE.reset.font * 0.2);
  st.aboutGen = -1;
  layout();
}

function layout() {
  const P = TUNE.panel, H = stage.h, rtl = i18n.isRTL;
  st.h = P.top + ROWS.length * P.row + P.lang + (RS.show ? P.restore : 0) + P.reset + P.about + P.links + P.pad;
  st.top = Math.max(stage.safeTop + 8, Math.round((H - st.h) / 2));
  let y = st.top + P.top;
  for (let i = 0; i < ROWS.length; i++) { ROWS[i].y = y + P.row / 2; y += P.row; }
  st.langY = y + P.lang / 2; y += P.lang;
  if (RS.show) { restoreBtn.y = y + P.restore / 2; y += P.restore; }
  resetBtn.y = y + TUNE.reset.up; st.resetCapY = y + TUNE.reset.cap; y += P.reset;
  st.aboutY = y + P.about / 2 - 6; y += P.about;
  RS.linksY = y + P.links / 2 - 4;
  closeBtn.y = st.top + 34;
  closeBtn.x = rtl ? 195 - P.w / 2 + 34 : 195 + P.w / 2 - 34;
  const S = TUNE.seg, n = LANGS.length, total = n * S.w + (n - 1) * S.gap, edge = rtl ? 195 - P.w / 2 + P.pad : 195 + P.w / 2 - P.pad;
  // visual order mirrored in RTL: Auto stays at the leading end (left in LTR, right in RTL)
  for (let i = 0; i < n; i++) LANGS[i].x = rtl ? edge + total - S.w / 2 - i * (S.w + S.gap) : edge - total + S.w / 2 + i * (S.w + S.gap);
}

function rowAt(x, y) {
  if (Math.abs(x - 195) > TUNE.panel.w / 2 - 8) return null;
  for (let i = 0; i < ROWS.length; i++) if (Math.abs(y - ROWS[i].y) <= TUNE.panel.row / 2) return ROWS[i];
  return null;
}
function segAt(x, y) {
  if (Math.abs(y - st.langY) > TUNE.seg.h / 2 + 6) return null;
  for (let i = 0; i < LANGS.length; i++) if (Math.abs(x - LANGS[i].x) <= TUNE.seg.w / 2 + TUNE.seg.gap / 2) return LANGS[i];
  return null;
}
function toggle(r) {
  const v = !profile.settings[r.key];
  profile.setSetting(r.key, v);
  spring(r, 'k', v ? SP_KNOB : SP_KNOB0);
  party.sfx.plate();
  if (r.key === 'haptics' && v) input.vibrate(18);
}

export const settings = {
  get state() { return st; },
  get buttons() { return btns; },
  rows: ROWS, langs: LANGS,

  enter(p) {
    p = p || {};
    st.active = true; st.t = 0; st.a = 0; st.s = 0.86; st.closing = -1; st.from = p.from || '';
    toast.hide();
    btns.reset(); btns.locked = false;
    for (let i = 0; i < btns.list.length; i++) btns.list[i].pop = 1;
    const S = profile.settings;
    for (let i = 0; i < ROWS.length; i++) ROWS[i].k = S[ROWS[i].key] ? 1 : 0;
    const sel = langSel();
    for (let i = 0; i < LANGS.length; i++) LANGS[i].k = LANGS[i].v === sel ? 1 : 0;
    refresh();
    spring(st, 'a', SP_IN);
    spring(st, 's', SP_IN);
  },
  exit() {
    st.active = false;
    tweens.killTarget(st); btns.kill();
    for (let i = 0; i < ROWS.length; i++) tweens.killTarget(ROWS[i]);
    for (let i = 0; i < LANGS.length; i++) tweens.killTarget(LANGS[i]);
    pressed = null;
  },

  // the browser / Android back (main.js) closes the panel like its close button
  onBack() { close(); return true; },

  update(dt) {
    st.t += dt;
    btns.update(dt);
    toast.update(dt);
    if (st.closing >= 0) {
      st.closing += dt;
      if (st.closing * 1000 >= TUNE.closeMs && scenes.top === settings) scenes.pop();
    }
  },

  render(ctx) {
    const W = stage.w, H = stage.h, P = TUNE.panel, rtl = i18n.isRTL, a = clamp(st.a, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * TUNE.dim;
    ctx.fillStyle = '#06051a'; ctx.fillRect(-30, -30, W + 60, H + 60);
    ctx.restore();
    if (a <= 0.01) return;
    const cy = st.top + st.h / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(195, cy); ctx.scale(st.s, st.s); ctx.translate(-195, -cy);
    panel.draw(ctx, 195, cy, P.w, st.h);
    lbl.title.draw(ctx, 195, st.top + 36);
    // switch rows
    const lead = rtl ? 195 + P.w / 2 - P.pad : 195 - P.w / 2 + P.pad, dir = rtl ? -1 : 1;
    const swX = rtl ? 195 - P.w / 2 + P.pad + TUNE.sw.w / 2 : 195 + P.w / 2 - P.pad - TUNE.sw.w / 2;
    SPR.anchor = AN_C; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
    for (let i = 0; i < ROWS.length; i++) {
      const r = ROWS[i], y = r.y, k = clamp(r.k, 0, 1);
      if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(195 - P.w / 2 + 16, y - P.row / 2, P.w - 32, 1.2); }
      if (pressed === r) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; draw.roundRect(ctx, 195 - P.w / 2 + 8, y - P.row / 2 + 3, P.w - 16, P.row - 6, 14); ctx.fill(); }
      const ix = lead + dir * 17;
      drawBadge(ctx, ix, y, 34, '', BADGE_ROW);
      drawGlyph(ctx, r.icon, ix, y, 19, GLY);
      rowLbl[i].draw(ctx, lead + dir * 44, y + 1);
      SPR.alpha = 1;
      draw.sprite(ctx, draw.cached('set.track0', TUNE.sw.w + 4, TUNE.sw.h + 4, TRACK_OFF), swX, y, SPR);
      if (k > 0.01) { SPR.alpha = k; draw.sprite(ctx, draw.cached('set.track1', TUNE.sw.w + 4, TUNE.sw.h + 4, TRACK_ON), swX, y, SPR); SPR.alpha = 1; }
      const travel = (TUNE.sw.w - TUNE.sw.knob) / 2 - 3, kx = swX + (rtl ? -1 : 1) * (r.k * 2 - 1) * travel;
      draw.sprite(ctx, draw.cached('set.knob', TUNE.sw.knob + 8, TUNE.sw.knob + 8, bakeKnob), kx, y, SPR);
    }
    // language: its globe disc + label on the switch rows' columns
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(195 - P.w / 2 + 16, st.langY - P.lang / 2, P.w - 32, 1.2);
    drawBadge(ctx, lead + dir * 17, st.langY, 34, '', BADGE_ROW);
    drawGlyph(ctx, 'lang', lead + dir * 17, st.langY, 19, GLY);
    lbl.lang.draw(ctx, lead + dir * 44, st.langY + 1);
    for (let i = 0; i < LANGS.length; i++) {
      const L = LANGS[i], k = clamp(L.k, 0, 1), sw = TUNE.seg.w + 4, sh = TUNE.seg.h + 4;
      SPR.alpha = 1; SPR.scale = 1 + 0.06 * k;
      draw.sprite(ctx, draw.cached('set.seg0', sw, sh, SEG_OFF), L.x, st.langY, SPR);
      if (k > 0.01) { SPR.alpha = k; draw.sprite(ctx, draw.cached('set.seg1', sw, sh, SEG_ON), L.x, st.langY, SPR); }
      SPR.scale = 1;
      segLbl[i].draw(ctx, L.x, st.langY + 1, 0.75 + 0.25 * k, 1 + 0.06 * k);
    }
    // restore + reset + about + links
    if (RS.show) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(195 - P.w / 2 + 16, restoreBtn.y - P.restore / 2, P.w - 32, 1.2); }
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(195 - P.w / 2 + 16, resetBtn.y - TUNE.reset.up, P.w - 32, 1.2);
    linkLbl.terms.draw(ctx, 195 - TUNE.links.gap, RS.linksY); linkLbl.privacy.draw(ctx, 195 + TUNE.links.gap, RS.linksY);
    ctx.fillStyle = 'rgba(201,195,240,0.7)'; ctx.beginPath(); ctx.arc(195, RS.linksY, 1.8, 0, Math.PI * 2); ctx.fill();
    btns.draw(ctx, st.t);
    lbl.reset.draw(ctx, 195, st.resetCapY, 0.95);
    if (st.aboutGen !== fontGen()) { st.aboutGen = fontGen(); st.aboutKey = 'set.about.' + i18n.lang + '.' + st.aboutGen; }
    SPR.alpha = 1; SPR.scale = 1;
    draw.sprite(ctx, draw.cached(st.aboutKey, P.w - 40, 44, bakeAbout), 195, st.aboutY, SPR);
    lbl.version.draw(ctx, 195, st.aboutY + 30);
    ctx.restore();
    if (toast.str) {                                    // outside the panel's scale, but it fades with it
      ctx.save(); ctx.globalAlpha = a;
      toast.draw(ctx, 195, st.top - 28 > stage.safeTop + 16 ? st.top - 28 : st.top + st.h - 30);
      ctx.restore();
    }
  },

  onInput(evt, d) {
    if (st.closing >= 0) return true;
    if (btns.onInput(evt, d)) return true;
    if (evt === 'down') {
      const inPanel = Math.abs(d.x - 195) <= TUNE.panel.w / 2 && d.y >= st.top && d.y <= st.top + st.h;
      if (!inPanel) { party.sfx.plate(); close(); return true; }
      const url = linkAt(d.x, d.y);
      if (url) { party.sfx.plate(); try { window.open(url, '_blank', 'noopener'); } catch (e) { /* blocked */ } return true; }
      const r = rowAt(d.x, d.y);
      if (r) { pressed = r; pressId = d.id; return true; }
      const L = segAt(d.x, d.y);
      if (L && L.v !== langSel()) {
        party.sfx.plate(); input.vibrate(TUNE.vibrate);
        profile.setSetting('lang', L.v);
        setLangKnobs();
      }
      return true;
    }
    if (evt === 'move' && pressed && d.id === pressId) { if (rowAt(d.x, d.y) !== pressed) pressed = null; return true; }
    if (evt === 'up' && pressed && d.id === pressId) {
      const r = pressed;
      pressed = null;
      if (rowAt(d.x, d.y) === r) { toggle(r); input.vibrate(TUNE.vibrate); }
      return true;
    }
    return true;
  },
};

stage.onResize(() => { if (st.active) layout(); });
// a language switched from anywhere (the home pill, another tab's save, a bare i18n.set) re-lights the segment too
i18n.onChange(() => { if (st.active) { refresh(); setLangKnobs(); } });
profile.onSettings((k, v) => { if (k === 'lang' && st.active) setLangKnobs(); });
