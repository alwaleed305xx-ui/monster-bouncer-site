// home.js: the Monster Bouncer home scene ('home', GAME-SPEC §3) plus the small sticker-UI kit the other menu scenes import
// (createLabel: one text sprite per label, re-baked into its own canvas only when the string / align / colour / fonts /
// resolution change, so nothing piles up in draw's cache; createButtons: chunky icons.js buttons with spring press /
// release bump / pop-in, hold-to-confirm and overlay content, `secondary: true` = the one secondary style UI_SECONDARY
// (indigo sticker, brass rim, cream text, the button's accent hue only on its glyph); UI_ACCENT = the only accent hues
// (velvet badges / alerts, neon pink for neon only, brass + gold rewards); createPanel (brass-rimmed sticker panel);
// createTag (the indigo + brass hint pill); createToast; HOUSE
// looks, houseSpec(species, colour) / memberSpec(species) = a member in one of its colour looks / as the player dressed
// it; beat()). Scenes may expose onBack() -> true when they handled the browser / Android back (main.js routes it).
// Text is Baloo 2 (Arabic in Cairo) everywhere in the menus; Poppins only for multi-line body copy (settings' about).
// Home = the lobby diorama (world.js lobby mode: the unlocked House Band playing in the party window in the looks they
// wear, party decor by Gold Ropes; decor levels 7..9 dress the club front here: searchlights sweeping the sky, fireworks
// over the roofs, a marquee rail of chasing bulbs around the sign) under the neon lockup (js/game/logo.js: MONSTER over
// BOUNCER / بودي قارد over الوحوش, fitted between the safe top and the party window, its googly eye glancing around,
// following a finger and blinking) that powers on with a buzz and flickers now and then, a PLAY Night N button in the thumb zone (pulses + pointing glove on first launch), Daily
// Night #n (locked with 'Unlocks after Night n' (profile.tune.dailyAfter) until profile.dailyUnlocked(): it shakes no when
// tapped; then the friendly daily: 'Same guests for all' (everyone plays the same queue), streak flame, done check +
// 'Next in 7h 12m' (the countdown to local midnight, stepped once a minute, never per frame), "tried today" when a counted
// run was left with the app; on day 2+ with the streak not yet kept today it pulses and says "Keep your n-day streak";
// just opened and never played it pulses under a velvet 'NEW' sticker until the first daily (profile seen 'daily');
// starting it marks the day's one attempt: profile.markDailyStart) and All-Nighter (best) cards (indigo + brass secondary
// stickers, the hue only on the glyph), and
// an icon row: House Band -> collection, the Shop pill (gem glyph + balance + '+', MONETIZATION §6.2: pushes 'shop'; a brass
// dot when the Free Gift is ready or a Star Road reward is new, a ticket with the Club Pass days left, a jar when the
// piggy is full), settings (overlay push), and a language pill naming the other language
// ('عربي' / 'EN'). Back gesture at home: not handled (main.js lets the page go back). The lobby wears the equipped look
// (wallet.look -> world.setLook, party.setTheme; members in their outfits through memberSpec). From night 3 the line
// under the party window carries the booster strip (Slow-Mo / Second Chance toggles with their counts: a tap arms one for
// the next story night; with none left it opens the shop's buy sheet, which arms it once bought). The Starter Pack popup
// (the one modal offer, wallet.offerDue('starter')) opens once, after any ceremony and news, as the shop's popup sheet;
// the news line also says when the piggy is full (a tap opens its sheet), when a Club Pass ended, the Starter Pack's one
// extra reminder (wallet.offerDue('starterPill'), under the wallet's offer caps; a tap opens its popup), the Club Pass's
// daily gift (once per local day while the pass delivers: a tap-to-collect card 'Club Pass gift · Day 4 of 30 / +50
// gems + 1 Slow-Mo' with its '3 days in a row: +10' ribbon; the gems fly into the Shop pill, whose balance holds them
// back until they land; the wallet pays the pass at launch (payments.initPayments), so the card reads what was paid
// from wallet.pass() against its own record of what it last showed, PASS_GIFT.key) and when a purchase
// arrived while the shop was closed (onPurchase, granted 'update' / 'boot' / an earlier 'purchase': Ask to Buy approved,
// an unfinished purchase delivered at launch, a purchase the shop was closed on; result.js toasts it too through
// takeLatePurchase). On idle frames (the line free, no transition) it lets the shop pre-bake one card a frame
// (shop.prebakeStep), so the shop's first open never bakes everything at once. A challenge link
// (share.parseLaunchParams) turns PLAY into that night / daily with the friend's dare shown above it. enter({ unlocked:
// [species], shown }) brings members a result just unlocked into the lobby band: the full ceremony (world.unlock + party
// unlock stinger) or, with shown: true (the result already ran its spotlight + fanfare), a quiet hop-in with a voice blip.
// Then the news (TUNE.news), whatever route led home: a decor level the player has not seen yet (profile seen flags
// 'decor<n>': the window keeps the last seen decor until the reveal swaps the new piece in with a spotlight, a sparkle
// burst and a 'New decor: <name>' brass pill under the window) and the Daily opening ('Daily Night unlocked!', once, with
// sparkles on its card). Navigation: scenes.go('play', { mode, night, date, seed, vs }, { transition: 'wipe' }). RTL mirrors the card row and the
// icon row. Every per-frame draw blits cached sprites with reused option objects.
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { draw } from '../core/draw.js';
import { text } from '../core/text.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, delay, tweens } from '../core/tween.js';
import { camera } from '../core/camera.js';
import { particles } from '../core/particles.js';
import { post } from '../core/post.js';
import { TAU, clamp, noise1, easeIndex } from '../core/math.js';
import { createWorld } from '../game/world.js';
import { setBeat } from '../game/actor.js';
import { drawButton, drawIconButton, drawGlyph, drawPill, drawBadge, drawGlove } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { parseLaunchParams, challengeInvite } from '../game/share.js';
import { dailyNightNumber } from '../game/data.js';
import { plural, pluralCat } from '../game/strings.js';
import { DICT as SHOPUI } from '../game/strings-shopui.js';
import { PASS } from '../game/catalog.js';
import { save } from '../core/save.js';
import { paintLogo, paintLogoNeon, logoMetrics, logoEye, stepLogoEye, drawLogoEye, blinkLogoEye } from '../game/logo.js';
import { wallet } from '../game/economy.js';
import { canSell, onPurchase } from '../game/payments.js';
import { drawGem, drawArt, fmtGems, prebakeStep, shop as shopScene } from './shop.js';

const TUNE = {
  ink: '#1d1840', night: '#0b0a22',
  // the lockup fits maxW wide (never past kMax) between the safe top + padTop and the party window - padBottom
  title: { maxW: 356, kMax: 1.04, kMin: 0.62, padTop: 6, padBottom: 4, neon: '#ff4fa3', glowR: 220, glowA: 0.26, floatPx: 3, floatHz: 0.45,
    powerOn: [0, 0, 0.16, 1, 0.22, 0.12, 0.34, 1, 0.4, 0.25, 0.58, 1],   // [t, lit] pairs: the sign buzzing on at enter
    flickEvery: [3.5, 8], flickDur: 0.5, flickHz: 38, hum: 0.08 },
  play: { w: 304, h: 76, color: '#ffb347', pulse: 0.035, glow: 0.55 },
  // secondary cards: the indigo sticker with a brass rim (UI_SECONDARY); the guest hue lives only on the glyph. A live
  // streak not yet kept today pulses the Daily card (risk) and turns its line amber; a Daily just opened and never played
  // pulses the same way under a velvet 'NEW' sticker (newW x newH, wobbling newRot)
  card: { w: 170, h: 66, gap: 10, dailyIcon: '#4fe3b0', endlessIcon: '#ffd166', sub: 'rgba(236,230,255,0.82)', subRisk: '#ffcf7a', subDone: '#8ff0c4',
    riskPulse: 0.035, riskGlow: 0.4, newW: 56, newH: 24, newRot: 0.1,
    // the Daily before it opens (profile.dailyUnlocked: after night profile.tune.dailyAfter, once AND rules are taught): a
    // darker face, a lock in muted lilac, a dimmed title, 'Unlocks after Night n'; a tap shakes it no
    lockFace: '#211e4c', lockIcon: '#a59fd6', lockTitle: 'rgba(255,244,220,0.62)', lockSub: 'rgba(214,208,250,0.7)', title: '#fff4dc' },
  shake: { amp: 7, dur: 0.38, hz: 22 },
  icons: { size: 54, langW: 92, langH: 50, langGap: 12, langFont: 19, langIcon: '#ffd166', shopW: 112 },
  // the booster strip on the line under the party window (from night 3): two toggles w x h, gap apart
  strip: { w: 156, h: 38, gap: 12, font: 14, on: '#2f9e5e', dy: 32 },
  offerAfter: 1.1,                                            // s after the news / ceremonies before the Starter popup may open
  rows: { iconsUp: 38, cardsUp: 112, playUp: 202 },          // centres above H - safeBottom
  scrim: { from: 130, alpha: 0.86 },                          // starts this far above the PLAY button top
  pop: { first: 0.25, step: 0.07 },
  unlock: { start: 0.7, every: 2.3, lead: 0.5, hold: 1.9, quietStart: 0.55, quietEvery: 1.9 },   // ceremony: first at, spacing, stinger lead before world.unlock, banner hold; quiet hop-in timing
  // news after the result, one at a time on the banner line under the party window, after any member's hop-in: a new
  // decor level (held back at enter, swapped in at the reveal with world.setDecor's sparkle burst, a warm spotlight over
  // the piece (glowA, glowR x the window width; the sky + sign for the club-front levels 7..9), a ring, a sparkle chime)
  // and the Daily opening (sparkles on its card). first: s after enter; after: s after the last member hopped in; each
  // holds `hold` s, fades over `out`, `gap` before the next. pillH = the brass news pill's height. focus[level] = where the
  // window's piece hangs, as a fraction of the window height (world.js setDecor: garland and banner under the arch, the
  // disco ball off the ceiling, plants on the floor corners, cannons at the sides, the neon sign on the back wall)
  news: { first: 0.95, after: 0.45, hold: 2.5, out: 0.35, gap: 0.3, glowA: 0.55, glowR: 0.62, glowFade: 1.8, pillH: 38, maxW: 346,
    focus: [0.42, 0.29, 0.34, 0.82, 0.3, 0.5, 0.45] },
  // the Club Pass's daily gift card on the news line: w x h, held giftHold s unless tapped (Collect), the gems flying
  // into the Shop pill (fly: count, s each, stagger, arc height)
  gift: { w: 350, h: 62, giftHold: 6, collectHold: 0.9, fly: { n: 12, dur: 0.75, stagger: 0.05, arc: 120, size: 22 } },
  glove: { size: 52, inset: 20, dy: 4, rot: 1.0 },            // first-launch glove: fingertip inset from PLAY's trailing edge, tilt toward it
  // club-front decor past the party window's 6 levels (profile decor 7..9), all in the sky over the roofline (window.y - roofUp):
  // 7 searchlights sweeping behind the sign, 8 fireworks over the roofs (rocket rise, then a burst behind the title), 9 a
  // brass marquee rail of chasing bulbs around the neon wordmark (chase steps on the party beat)
  club: { roofUp: 36,
    beams: { x: [58, 332], w: 130, len: 340, swing: 0.36, lean: 0.2, hz: [0.11, 0.15], a: 0.42 },
    fw: { every: [1.3, 2.6], rise: [0.5, 0.75], x: [46, 344], top: 26, low: 46, cols: ['#ff4fa3', '#ffd166', '#53e0ff', '#a77bff', '#4fe3b0'] },
    marquee: { padX: 14, padY: 8, minW: 250, maxW: 370, h: 168, r: 30, step: 26, bulb: 3.3, glow: 15, chase: 3, rail: '#d9a441', railDark: '#7a4a10' } },
  vibrate: 8,
};

// ================================================================ shared UI kit (result / collection / settings / pause)
// default House Band looks (same as world.js HOUSE, so roster minis match the dancers in the window)
export const HOUSE = {
  blob: { species: 'blob', color: 'mint', eyes: 2, hat: 'party', tail: false, pattern: 'none' },
  tall: { species: 'tall', color: 'coral', eyes: 2, hat: 'top', tail: false, pattern: 'none' },
  round: { species: 'round', color: 'sky', eyes: 2, hat: 'none', tail: false, pattern: 'dots' },
  square: { species: 'square', color: 'mustard', eyes: 2, hat: 'crown', tail: false, pattern: 'none' },
  bean: { species: 'bean', color: 'grape', eyes: 2, hat: 'none', tail: true, pattern: 'stripes' },
};
export const SPECIES = ['blob', 'tall', 'round', 'square', 'bean'];
export const INSTR_KEY = { blob: 'inst_drum', tall: 'inst_bass', round: 'inst_keys', square: 'inst_guitar', bean: 'inst_lead' };
export const UI_INK = TUNE.ink;
// the ONE secondary-button style of every menu (GAME-SPEC §5: saturation sits on the cast, not the chrome): an indigo
// sticker with a brass inner rim and cream text; a button's single coloured accent is its glyph (b.iconColor /
// b.glyphColor). Primary = the amber default; velvet red only for destructive actions.
export const UI_SECONDARY = { color: '#2a2760', rim: '#d9a441', text: '#fff4dc', glyph: '#fff4dc' };
// the accent hues every menu draws from (GAME-SPEC §5 palette; nothing else): TWO accents only. velvet (cream text) =
// alerts + badges (First night!, the '?' stranger, counts, streak, a lost dare); neon pink = neon ONLY (the title tube,
// the FAKE! stamp); rewards / highlights in brass + gold (new member, new look, new decor, best, a won dare); the amber
// primary; the IN-plate green family for 'on' states; indigo for quiet notes (practice, replay, a tie).
export const UI_ACCENT = {
  velvet: '#b3203a', velvetText: '#fff4dc', neon: '#ff4fa3', brass: '#a8721e', gold: '#ffc93c', goldInk: '#6a3f00',
  amber: '#ffb347', go: '#2f9e5e', indigo: '#3b3584', cream: '#fff4dc', lilac: '#e9e4ff', rimBrass: '#d9a441', rimDark: '#8a5a14',
};
// houseSpec(species, colorKey?) -> the House look of a member in one of its colour looks (profile.looks): one shared spec
// object per species + colour, so actor / drawMini caches keyed by spec object stay warm. Omit the colour for the House one.
// outfit (optional): a band outfit item id (MONETIZATION §3.3, actor.js spec.outfit), '' = the House clothes
const LOOK_SPECS = {};
export function houseSpec(sp, col, outfit) {
  const base = HOUSE[sp];
  if (!base) return null;
  const c = col || base.color, o = outfit || '', key = sp + '.' + c + '.' + o;
  let s = LOOK_SPECS[key];
  if (!s) { s = {}; for (const k in base) s[k] = base[k]; s.color = c; if (o) s.outfit = o; LOOK_SPECS[key] = s; }
  return s;
}
// the member as the player dressed it (profile.lookOf + the outfit it wears from the wallet)
export function memberSpec(sp) { return houseSpec(sp, profile.lookOf(sp), wallet.equipped('outfit', sp)); }
// nightRetrySeed(n) -> the seed of the next campaign retry of night n (result's Again / Go for Gold, pause's Restart):
// play's hashNight(n) mixed with this session's attempt count (Knuth's golden-ratio step), so a retry deals a fresh
// queue of the same night's difficulty and is reading, not memory. Challenge links and dailies keep their fixed seeds.
const ATTEMPTS = {};
function hashNight(n) {
  const s = 'mbouncer-night:' + n;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function nightRetrySeed(n) {
  const a = (ATTEMPTS[n] || 0) + 1;
  ATTEMPTS[n] = a;
  return (hashNight(n) ^ Math.imul(a, 2654435761)) >>> 0;
}
// a few short UI words strings.js does not carry (namespaced 'ui.*' so they never collide with the game dictionary)
// (the Daily card's lines: daily_same = the friendly daily, everyone gets the same guests; next_in = the countdown to the
// next one once today's is played; daily_open = the Daily opening, on the result card and home's news line; new = the
// sticker on the Daily card until the first daily is played)
i18n.load({
  en: { 'ui.tap_continue': 'Tap to continue', 'ui.challenge': 'Challenge', 'ui.plus': '+{n}',
    'ui.vs_win': "You beat your friend's {s}!", 'ui.vs_tie': 'Tied with your friend: {s}', 'ui.vs_lose': 'Your friend still leads: {s}',
    'ui.daily_same': 'Same guests for all', 'ui.next_in': 'Next in {h}h {m}m', 'ui.next_in_m': 'Next in {m}m',
    'ui.daily_open': 'Daily Night unlocked!', 'ui.new': 'NEW' },
  ar: { 'ui.tap_continue': 'اضغط عشان تكمل', 'ui.challenge': 'تحدّى', 'ui.plus': '+{n}',
    'ui.vs_win': 'تعدّيت نتيجة صاحبك {s}!', 'ui.vs_tie': 'تعادلت مع صاحبك: {s}', 'ui.vs_lose': 'صاحبك لسّا متقدّم: {s}',
    'ui.daily_same': 'نفس الضيوف للكل', 'ui.next_in': 'الجاية بعد {h}س {m}د', 'ui.next_in_m': 'الجاية بعد {m}د',
    'ui.daily_open': 'انفتحت ليلة اليوم!', 'ui.new': 'جديد' },
});

// purchases the store delivered while the shop was closed (the shop announces its own): home's news line says so, and
// result.js asks takeLatePurchase() for a toast; the count waits for whichever scene shows first
const LATE = { n: 0 };
onPurchase(ev => {
  if (!ev || !ev.granted || ev.dup) return;
  // a Club Pass bought in the shop: its first day was just granted there, with its own fanfare
  if (ev.productId === 'mb_club_pass_30d' && shopScene && shopScene.state && shopScene.state.active) passGiftSeen();
  if (ev.source !== 'update' && ev.source !== 'boot' && ev.source !== 'purchase') return;
  if (shopScene && shopScene.state && shopScene.state.active) return;
  LATE.n++;
});
export function takeLatePurchase() { if (LATE.n > 0) { LATE.n = 0; return true; } return false; }
let FG = 0;                                     // font generation: text bakes redo once the bundled fonts arrive
draw.ready().then(() => { FG++; if (st.active) refresh(); });
export function fontGen() { return FG; }
// party beat clock for world / actors (beats; -1 while the music is stopped, so they fall back to their own clock)
export function beat() { const c = party.clock(); return c.playing ? c.pos / 4 : -1; }

const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5], AN_L = [0, 0.5], AN_R = [1, 0.5], AN_B = [0.5, 1];
let LID = 0;
let measureCtx = null;
export function measure(str, size, weight, family) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return text.measure(measureCtx, str, size, weight || 800, family || 'Baloo 2');
}

// createLabel(w, h, drawTextOpts) -> { set(str), align('left'|'center'|'right'), draw(ctx, x, y, alpha, scale, rot) }: one
// text sprite (draw.text with o, shrink-to-fit via o.maxWidth) in the label's own canvas, re-baked only when the string /
// align / fonts / stage resolution change (the old canvas is simply dropped: no draw.cached entry per string).
// x is the left edge for 'left', the right edge for 'right', else the centre. tint(colour) recolours the text.
export function createLabel(w, h, o) {
  const L = { id: ++LID, w: w, h: h, o: o, str: '', cv: null, gen: -1, res: 0 };
  if (o.maxWidth === undefined) o.maxWidth = w - 8;
  L.bake = function (c, bw, bh) {
    const a = L.o.align, x = a === 'left' ? 4 : (a === 'right' ? bw - 4 : bw / 2);
    draw.text(c, L.str, x, bh / 2, L.o);
  };
  L.set = function (str) {
    str = str === undefined || str === null ? '' : String(str);
    if (str !== L.str) { L.str = str; L.gen = -1; }
    return L;
  };
  L.align = function (a) { if ((L.o.align || 'center') !== a) { L.o.align = a; L.gen = -1; } return L; };
  L.tint = function (c) { if (L.o.color !== c) { L.o.color = c; L.gen = -1; } return L; };   // text colour (re-bakes once)
  L.draw = function (ctx, x, y, alpha, scale, rot) {
    if (!L.str) return;
    const res = draw.res();
    if (L.gen !== FG || L.res !== res || !L.cv) { L.cv = draw.bake(L.w, L.h, L.bake); L.gen = FG; L.res = res; }
    const a = L.o.align;
    SPR.anchor = a === 'left' ? AN_L : (a === 'right' ? AN_R : AN_C);
    SPR.alpha = alpha === undefined ? 1 : alpha; SPR.scale = scale === undefined ? 1 : scale; SPR.sx = 1; SPR.sy = 1; SPR.rot = rot || 0;
    draw.sprite(ctx, L.cv, x, y, SPR);
  };
  return L;
}

// createPanel(color, opts) -> { draw(ctx, x, y, w, h, alpha) }: a baked sticker panel in the UI_SECONDARY language: the
// bottom-right sticker shadow, an ink outline round a 3 px brass rim (light at the top, deep at the bottom, a cream
// catch-light along its top edge, a #8a5a14 inner line), then the face (top-left highlight, bottom-right shade, a soft
// white band along its top edge) and an optional inner hairline (o.inner). x / y = centre; re-baked when the size
// changes (snap sizes; animate with transforms). The rim sits inside the outline, so content insets are unchanged.
const PANEL = { shadow: 'rgba(6,4,22,0.5)', sx: 3, sy: 5, brass: 3, brassG: [[0, '#ffe39a'], [0.1, '#e8b955'], [0.55, '#d9a441'], [1, '#8a5a14']],
  inner: '#8a5a14', catch: 'rgba(255,246,214,0.75)', band: 0.08, bandH: 30 };
export function createPanel(col, o) {
  o = o || {};
  const P = { id: ++LID, col: col, w: 0, h: 0, key: '', gen: -1, r: o.radius || 26, ink: o.ink || TUNE.ink, lw: o.lineWidth || 3.5, inner: o.inner || '' };
  P.bake = function (c, bw, bh) {
    const x = 4, y = 4, w = bw - 8, h = bh - 10, r = P.r, K = PANEL;
    c.save(); c.fillStyle = K.shadow; draw.roundRect(c, x + K.sx, y + K.sy, w - K.sx + 1, h, r); c.fill(); c.restore();
    // the brass frame (its outline is the panel's ink outline)
    draw.roundRect(c, x, y, w, h, r);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + h, K.brassG); c.fill();
    c.save(); draw.roundRect(c, x, y, w, h, r); c.clip();
    c.beginPath(); c.rect(x, y, w, Math.min(h * 0.5, 60)); c.clip();
    draw.roundRect(c, x + P.lw * 0.5 + 0.6, y + P.lw * 0.5 + 0.6, w - P.lw - 1.2, h - P.lw - 1.2, Math.max(2, r - P.lw * 0.5)); c.lineWidth = 1; c.strokeStyle = K.catch; c.stroke();
    c.restore();
    draw.roundRect(c, x, y, w, h, r); c.lineJoin = 'round'; c.lineWidth = P.lw; c.strokeStyle = P.ink; c.stroke();
    // the face inside the rim
    const fi = P.lw * 0.5 + K.brass, fx = x + fi, fy = y + fi, fw = w - 2 * fi, fh = h - 2 * fi, fr = Math.max(4, r - fi);
    draw.sticker(c, cc => draw.roundRect(cc, fx, fy, fw, fh, fr), { fill: P.col, outline: K.inner, lineWidth: 1.6, highlight: 0.16, shadow: 0.2 });
    c.save(); draw.roundRect(c, fx, fy, fw, fh, fr); c.clip();
    c.fillStyle = draw.gradient(c, 0, fy, 0, fy + K.bandH, [[0, 'rgba(255,255,255,' + K.band + ')'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(fx, fy, fw, K.bandH);
    c.restore();
    if (P.inner) { draw.roundRect(c, fx + 5, fy + 5, fw - 10, fh - 10, Math.max(4, fr - 5)); c.lineWidth = 1.2; c.strokeStyle = P.inner; c.stroke(); }
  };
  P.draw = function (ctx, x, y, w, h, alpha) {
    w = Math.round(w); h = Math.round(h);
    if (w !== P.w || h !== P.h || P.gen !== FG) { P.w = w; P.h = h; P.gen = FG; P.key = 'ui.p' + P.id + '.' + w + 'x' + h + '.' + FG; }
    SPR.anchor = AN_C; SPR.alpha = alpha === undefined ? 1 : alpha; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
    draw.sprite(ctx, draw.cached(P.key, w + 8, h + 10, P.bake), x, y + 1, SPR);
  };
  return P;
}

// createToast() -> { show(str, sec, icon), hide(), update(dt), draw(ctx, x, y) }: a pill that pops up and fades (one string
// at a time). It only ticks while its scene updates, so scenes call hide() on enter (no stale toast on the next visit).
const TOAST_O = { color: '#221f5c', icon: '', alpha: 1 };
export function createToast() {
  const T = { str: '', t: 0, dur: 0, s: 0, w: 0, icon: '' };
  T.show = function (str, sec, icon) {
    if (!str) return;
    T.str = str; T.t = 0; T.dur = sec || 2.2; T.s = 0.6; T.icon = icon || '';
    T.w = Math.min(350, Math.max(140, measure(str, 15, 800) + (icon ? 64 : 44)));
    spring(T, 's', SP_TOAST);
  };
  T.hide = function () { T.str = ''; T.t = 0; tweens.killTarget(T); };
  T.update = function (dt) { if (T.str) { T.t += dt; if (T.t > T.dur) T.str = ''; } };
  T.draw = function (ctx, x, y) {
    if (!T.str) return;
    const a = clamp(Math.min(T.t / 0.12, (T.dur - T.t) / 0.3), 0, 1);
    TOAST_O.alpha = a; TOAST_O.icon = T.icon;
    ctx.save(); ctx.translate(x, y); ctx.scale(T.s, T.s);
    drawPill(ctx, 0, 0, T.w, 40, T.str, TOAST_O);
    ctx.restore();
  };
  return T;
}
const SP_TOAST = { to: 1, stiffness: 420, damping: 15 };

// createTag(maxW, h, o) -> { set(str), draw(ctx, x, y, alpha, scale), w }: the standard UI tag, the boot card's tap-hint
// look: an indigo sticker pill with a brass inner rim, a cream catch-light and cream Baloo text in an ink outline, sized
// to its string (up to maxW). One canvas per tag, re-baked only when the string / fonts / resolution change.
// o { size (font, default 16), color (face), textColor }
const TAG_SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
export function createTag(maxW, h, o) {
  o = o || {};
  const G = { id: ++LID, maxW: maxW, h: h, w: h * 2, str: '', cv: null, gen: -1, res: 0, size: o.size || 16,
    col: o.color || UI_SECONDARY.color, tc: o.textColor || UI_SECONDARY.text };
  const TXT = { size: G.size, weight: 800, color: G.tc, outline: TUNE.ink, outlineWidth: Math.max(3, G.size * 0.26), maxWidth: 100,
    shadow: 'rgba(0,0,0,0.3)', shadowOffset: 1.5 };
  G.bake = function (c, bw, bh) {
    const x = 4, y = 3, pw = bw - 8, ph = G.h, r = ph / 2, rim = UI_SECONDARY.rim;
    c.save(); c.fillStyle = 'rgba(6,4,22,0.5)'; draw.roundRect(c, x + 1.5, y + 4, pw, ph, r); c.fill(); c.restore();
    draw.sticker(c, cc => draw.roundRect(cc, x, y, pw, ph, r), { fill: G.col, outline: TUNE.ink, lineWidth: 3, highlight: 0.22, shadow: 0.25 });
    draw.roundRect(c, x + 3.4, y + 3.4, pw - 6.8, ph - 6.8, r - 3.4); c.lineWidth = 2.2; c.strokeStyle = rim; c.stroke();
    c.save(); c.beginPath(); c.rect(x, y, pw, ph * 0.45); c.clip();
    draw.roundRect(c, x + 2.7, y + 2.7, pw - 5.4, ph - 5.4, r - 2.7); c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,246,214,0.7)'; c.stroke();
    c.restore();
    TXT.maxWidth = pw - ph * 0.9;
    draw.text(c, G.str, x + pw / 2, y + ph / 2 + 1, TXT);
  };
  G.set = function (str) {
    str = str === undefined || str === null ? '' : String(str);
    if (str !== G.str) { G.str = str; G.gen = -1; }
    return G;
  };
  G.draw = function (ctx, x, y, alpha, scale) {
    if (!G.str) return;
    const res = draw.res();
    if (G.gen !== FG || G.res !== res || !G.cv) {
      G.w = Math.round(clamp(measure(G.str, G.size) + G.h * 1.25, G.h * 2.4, G.maxW));   // measured with the fonts in use
      G.cv = draw.bake(G.w + 8, G.h + 10, G.bake); G.gen = FG; G.res = res;
    }
    TAG_SPR.anchor = AN_C; TAG_SPR.alpha = alpha === undefined ? 1 : alpha; TAG_SPR.scale = scale === undefined ? 1 : scale;
    draw.sprite(ctx, G.cv, x, y + 2, TAG_SPR);
  };
  return G;
}

// ---- buttons
const SP_DOWN = { to: 1, stiffness: 900, damping: 42 };
const SP_UP = { to: 0, stiffness: 620, damping: 17 };
const SP_BUMP = { to: 0, stiffness: 380, damping: 10, velocity: 7 };
const SP_POP = { to: 1, stiffness: 250, damping: 13 };
const SP_HIDE = { to: 0, stiffness: 300, damping: 26 };
const BTN_DEPTH = 0.12, BTN_MIN = 4, BTN_PRESS = 0.04, ICON_DEPTH = 0.08, ICON_MIN = 3, ICON_PRESS = 0.07, DROP = 0.85;

// createButtons() -> set { list, add(b), onInput(evt, d), update(dt), draw(ctx, t), popIn(delaySec, stepSec), hideAll(), hit(x, y) }
// b = { id, x, y, w, h, kind: 'btn' | 'icon', label, icon, color, textColor, rim (inner ring colour), iconColor (a 'btn'
// glyph's fill), glyphColor (an 'icon' glyph's fill), secondary: true (fills color / rim / textColor / glyph colours from
// UI_SECONDARY where unset), size, off, onTap(b), holdSec + onHold(b) (hold to confirm: b.hold01 0..1 while held),
// overlay(ctx, b) (drawn on the face, moving with the press), breathe (pulse amplitude), glow, hidden }. Press: down = face
// sinks (spring), a slide off cancels, release inside = tap + bump.
export function createButtons() {
  const S = { list: [], active: null, pid: -1, locked: false };
  S.add = function (b) {
    b.press = 0; b.bump = 0; b.pop = b.pop === undefined ? 1 : b.pop; b.alpha = b.alpha === undefined ? 1 : b.alpha;
    b.glow = b.glow || 0; b.hidden = !!b.hidden; b.holdT = 0; b.hold01 = 0; b.breathe = b.breathe || 0;
    b.kind = b.kind || 'btn'; if (!b.h) b.h = b.w;
    if (b.secondary) {
      const U = UI_SECONDARY;
      if (!b.color) b.color = U.color;
      if (!b.rim) b.rim = U.rim;
      if (!b.textColor) b.textColor = U.text;
      if (b.kind === 'icon' && !b.glyphColor) b.glyphColor = U.glyph;
    }
    b.opts = { color: b.color, textColor: b.textColor, icon: '', press: 0, glow: 0, alpha: 1, off: false, size: b.size || 0,
      rim: '', iconColor: '', glyphColor: '' };
    S.list.push(b);
    return b;
  };
  S.inside = function (b, x, y, pad) { return Math.abs(x - b.x) <= b.w * 0.5 * b.pop + pad && Math.abs(y - b.y) <= b.h * 0.5 * b.pop + pad; };
  S.hit = function (x, y) {
    for (let i = S.list.length - 1; i >= 0; i--) {
      const b = S.list[i];
      if (!b.hidden && b.pop > 0.6 && b.alpha > 0.5 && S.inside(b, x, y, 5)) return b;
    }
    return null;
  };
  function release(b, commit) {
    S.active = null; S.pid = -1;
    spring(b, 'press', SP_UP);
    if (!commit) return;
    spring(b, 'bump', SP_BUMP);
    if (b.onTap) b.onTap(b);
  }
  S.onInput = function (evt, d) {
    if (evt === 'down') {
      if (S.locked || S.active) return !!S.active;
      const b = S.hit(d.x, d.y);
      if (!b) return false;
      S.active = b; S.pid = d.id; b.holdT = 0;
      spring(b, 'press', SP_DOWN);
      party.sfx.plate();
      input.vibrate(TUNE.vibrate);
      return true;
    }
    const b = S.active;
    if (!b || (d.id !== undefined && d.id !== S.pid)) return false;
    if (evt === 'move') { if (!S.inside(b, d.x, d.y, 22)) release(b, false); return true; }
    if (evt === 'up') { release(b, !S.locked && !b.holdSec && S.inside(b, d.x, d.y, 22)); return true; }
    return evt === 'tap' || evt === 'hold' || evt === 'drag' || evt === 'dragend' || evt === 'swipe';
  };
  S.update = function (dt) {
    for (let i = 0; i < S.list.length; i++) {
      const b = S.list[i];
      if (!b.holdSec) continue;
      if (S.active === b) {
        b.holdT += dt;
        if (b.holdT >= b.holdSec) { b.holdT = 0; b.hold01 = 0; release(b, false); spring(b, 'bump', SP_BUMP); if (b.onHold) b.onHold(b); continue; }
      } else if (b.holdT > 0) b.holdT = Math.max(0, b.holdT - dt * 3);
      b.hold01 = b.holdT / b.holdSec;
    }
  };
  S.draw = function (ctx, t) {
    for (let i = 0; i < S.list.length; i++) {
      const b = S.list[i];
      if (b.hidden || b.pop <= 0.02 || b.alpha <= 0) continue;
      let s = b.pop * (1 + 0.05 * b.bump);
      if (b.breathe) s *= 1 + b.breathe * (0.5 + 0.5 * Math.sin(t * 5.4));
      const o = b.opts, pr = clamp(b.press, 0, 1);
      o.press = pr; o.glow = b.glow; o.alpha = b.alpha; o.off = !!b.off; o.icon = b.icon || ''; o.color = b.color; o.textColor = b.textColor; o.size = b.size || 0;
      o.rim = b.rim || ''; o.iconColor = b.iconColor || ''; o.glyphColor = b.glyphColor || '';
      ctx.save();
      ctx.translate(b.x, b.y);
      if (s !== 1) ctx.scale(s, s);
      if (b.kind === 'icon') drawIconButton(ctx, 0, 0, b.w, o.icon, o);
      else drawButton(ctx, 0, 0, b.w, b.h, b.label || '', o);
      if (b.overlay) {
        let dy, k;
        if (b.kind === 'icon') { dy = Math.max(ICON_MIN, b.w * ICON_DEPTH) * pr * DROP; k = 1 - ICON_PRESS * pr; }
        else { dy = Math.max(BTN_MIN, b.h * BTN_DEPTH) * pr * DROP; k = 1 - BTN_PRESS * pr; }
        ctx.translate(0, dy);
        if (k !== 1) ctx.scale(k, k);
        if (b.alpha !== 1) ctx.globalAlpha *= b.alpha;
        b.overlay(ctx, b);
      }
      ctx.restore();
    }
  };
  // staggered spring pop-in of every visible button (setup-time closures only)
  S.popIn = function (first, step) {
    let n = 0;
    for (let i = 0; i < S.list.length; i++) {
      const b = S.list[i];
      b.pop = 0;
      if (b.hidden) continue;
      const at = (first + step * n++) * 1000;
      delay(at).then(ok => { if (ok) spring(b, 'pop', SP_POP); });
    }
  };
  S.hideAll = function () { for (let i = 0; i < S.list.length; i++) spring(S.list[i], 'pop', SP_HIDE); };
  S.reset = function () { S.active = null; S.pid = -1; for (let i = 0; i < S.list.length; i++) { const b = S.list[i]; b.press = 0; b.bump = 0; b.holdT = 0; b.hold01 = 0; } };
  S.kill = function () { for (let i = 0; i < S.list.length; i++) tweens.killTarget(S.list[i]); };
  return S;
}

// ================================================================ home scene
const SP_TITLE = { to: 1, stiffness: 130, damping: 10, velocity: 2.5 };
const SP_TITLE_POP = { to: 1, stiffness: 260, damping: 11, velocity: 2.2 };
const GLYPH_O = { color: '#ffffff' };
const PILL_FLAME = { icon: 'flame', color: UI_ACCENT.velvet, textColor: UI_ACCENT.velvetText };
const PILL_FIRST = { color: UI_ACCENT.velvet, textColor: UI_ACCENT.velvetText };
const PILL_DARE = { icon: 'trophy', color: UI_ACCENT.brass };
const BADGE_OK = { color: UI_ACCENT.go };
const BADGE_N = { color: UI_ACCENT.velvet, textColor: UI_ACCENT.velvetText };
const GLOVE_O = { rot: -0.55 };
const OV_SPARK = { count: 14, colors: ['#ff4fa3', '#ffd166', '#ffffff'] };
const PULSE = { chroma: 0.5, ms: 140 };

const st = { t: 0, active: false, titleS: 0, lit: 0, flickAt: 5, flickT: -1, first: false, unlockQ: [], unlockT: 0, unlockI: 0, doneAt: 0, quiet: false };
// club-front decor (levels 7..9): fireworks clock + the one rocket in flight, the marquee rail size for this title
const club = { level: 0, fwT: 1, rk: { on: false, x: 0, y0: 0, y1: 0, t: 0, dur: 0.6 }, mw: 300, mh: 100, bulbs: [] };
const FW_BURST = { count: 34, speed: [90, 230], life: [0.7, 1.25], size: [4.5, 0], colors: null, gravity: 70, drag: 1.6, layer: 'back' };
const FW_RING = { size: [6, 70], life: 0.45, colors: null, layer: 'back' };
const FW_SPARK = { count: 10, spawnRadius: 34, layer: 'back' };
const FW_COLS = [];
for (let i = 0; i < TUNE.club.fw.cols.length; i++) FW_COLS.push([TUNE.club.fw.cols[i], TUNE.club.fw.cols[i], '#ffffff']);
function bakeBeam(c, w, h) {
  // a soft searchlight wedge: narrow and bright at the bottom-centre origin, wide and faint at the top
  c.fillStyle = draw.gradient(c, 0, h, 0, 0, [[0, 'rgba(220,235,255,0.95)'], [0.35, 'rgba(190,210,255,0.45)'], [1, 'rgba(160,180,255,0)']]);
  c.beginPath(); c.moveTo(w / 2 - 3, h); c.lineTo(w / 2 + 3, h); c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.fill();
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = draw.gradient(c, 0, 0, w, 0, [[0, 'rgba(0,0,0,0)'], [0.3, 'rgba(0,0,0,0.85)'], [0.5, '#000'], [0.7, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}
function bakeBulbGlow(c, w, h) {
  c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [[0, 'rgba(255,236,170,0.95)'], [0.3, 'rgba(255,190,90,0.45)'], [1, 'rgba(255,170,60,0)']]);
  c.fillRect(0, 0, w, h);
}
function bakeRocket(c, w, h) {
  c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [[0, '#ffffff'], [0.35, 'rgba(255,230,180,0.6)'], [1, 'rgba(255,200,120,0)']]);
  c.fillRect(0, 0, w, h);
}
// bulb positions along the rounded rail (relative to the title centre), evenly spaced by arc length, clockwise from top-left
function layoutMarquee() {
  const M = TUNE.club.marquee, w = club.mw, h = club.mh, r = Math.min(M.r, h / 2), sx = w - 2 * r, sy = h - 2 * r, q = TAU * r / 4;
  const per = 2 * sx + 2 * sy + 4 * q, n = Math.max(12, Math.round(per / M.step)), B = club.bulbs;
  B.length = 0;
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per, x = 0, y = 0, a = 0;
    if (d < sx) { x = -sx / 2 + d; y = -h / 2; }
    else if ((d -= sx) < q) { a = -Math.PI / 2 + d / r; x = sx / 2 + Math.cos(a) * r; y = -sy / 2 + Math.sin(a) * r; }
    else if ((d -= q) < sy) { x = w / 2; y = -sy / 2 + d; }
    else if ((d -= sy) < q) { a = d / r; x = sx / 2 + Math.cos(a) * r; y = sy / 2 + Math.sin(a) * r; }
    else if ((d -= q) < sx) { x = sx / 2 - d; y = h / 2; }
    else if ((d -= sx) < q) { a = Math.PI / 2 + d / r; x = -sx / 2 + Math.cos(a) * r; y = sy / 2 + Math.sin(a) * r; }
    else if ((d -= q) < sy) { x = -w / 2; y = sy / 2 - d; }
    else { d -= sy; a = Math.PI + d / r; x = -sx / 2 + Math.cos(a) * r; y = -sy / 2 + Math.sin(a) * r; }
    B.push(x, y);
  }
}
function roofY() { return world ? world.window.y - TUNE.club.roofUp : 120; }
function updateClub(dt) {
  if (club.level < 8 || !world) return;
  const F = TUNE.club.fw, R = club.rk;
  if (R.on) {
    R.t += dt;
    if (R.t >= R.dur) {
      R.on = false;
      const c = FW_COLS[(Math.random() * FW_COLS.length) | 0];
      FW_BURST.colors = c; FW_RING.colors = c[0];
      particles.emit('burst', R.x, R.y1, FW_BURST);
      particles.emit('ring', R.x, R.y1, FW_RING);
      particles.emit('sparkle', R.x, R.y1, FW_SPARK);
    }
  } else if ((club.fwT -= dt) <= 0) {
    club.fwT = F.every[0] + Math.random() * (F.every[1] - F.every[0]);
    // the bursts keep off the wordmark's middle: the left or right third of the sky
    const side = Math.random() < 0.5 ? 0 : 1, span = (F.x[1] - F.x[0]) / 3;
    R.on = true; R.t = 0; R.dur = F.rise[0] + Math.random() * (F.rise[1] - F.rise[0]);
    R.x = side ? F.x[1] - Math.random() * span : F.x[0] + Math.random() * span;
    R.y0 = roofY(); R.y1 = stage.safeTop + F.top + Math.random() * Math.max(10, R.y0 - stage.safeTop - F.top - F.low);
  }
}
// behind the sign: searchlights (7+), the rising rocket and the burst particles (8+)
function drawClubBack(ctx) {
  const lv = club.level;
  if (lv < 7 || !world) return;
  const B = TUNE.club.beams, ry = roofY(), t = st.t;
  ctx.save();
  ctx.beginPath(); ctx.rect(-30, -30, stage.w + 60, ry + 30); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const beam = draw.cached('home.beam', B.w, B.len, bakeBeam);
  SPR.anchor = AN_B; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.alpha = B.a * clamp(t / 1.2, 0, 1);
  for (let i = 0; i < 2; i++) {
    const side = i ? -1 : 1;
    SPR.rot = side * B.lean + Math.sin(t * TAU * B.hz[i] + i * 2.1) * B.swing;
    draw.sprite(ctx, beam, B.x[i], ry + 8, SPR);
  }
  ctx.restore();
  if (lv < 8) return;
  const R = club.rk;
  if (R.on) {
    const k = 1 - Math.pow(1 - clamp(R.t / R.dur, 0, 1), 3), y = R.y0 + (R.y1 - R.y0) * k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    SPR.anchor = AN_C; SPR.rot = 0; SPR.alpha = 0.9; SPR.scale = 1;
    const rc = draw.cached('home.rocket', 16, 16, bakeRocket);
    draw.sprite(ctx, rc, R.x, y, SPR);
    SPR.alpha = 0.35; SPR.scale = 0.7; draw.sprite(ctx, rc, R.x, y + 9, SPR);
    SPR.alpha = 0.15; SPR.scale = 0.5; draw.sprite(ctx, rc, R.x, y + 17, SPR);
    ctx.restore();
  }
  particles.draw(ctx, 'back');
}
// around the sign (9): a brass rail with bulbs chasing in threes on the beat
function drawMarquee(ctx, ty, s) {
  if (club.level < 9 || s <= 0.01) return;
  const M = TUNE.club.marquee, B = club.bulbs, n = B.length / 2, w = club.mw, h = club.mh, a = clamp(s, 0, 1);
  const bt = beat(), ph = bt >= 0 ? Math.floor(bt * 2) : Math.floor(st.t * 4);
  ctx.save();
  ctx.translate(195, ty); ctx.scale(s, s);
  ctx.globalAlpha = a;
  draw.roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(M.r, h / 2));
  ctx.lineWidth = 5; ctx.strokeStyle = M.railDark; ctx.stroke();
  ctx.lineWidth = 2.4; ctx.strokeStyle = M.rail; ctx.stroke();
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = (i + ph) % M.chase === 0 ? '#fff3c4' : '#8a6a3a';
    ctx.beginPath(); ctx.arc(B[i * 2], B[i * 2 + 1], M.bulb, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  const g = draw.cached('home.bulb', 32, 32, bakeBulbGlow);
  SPR.anchor = AN_C; SPR.rot = 0; SPR.sx = 1; SPR.sy = 1; SPR.scale = M.glow * 2 / 32; SPR.alpha = 0.85 * a;
  for (let i = 0; i < n; i++) if ((i + ph) % M.chase === 0) draw.sprite(ctx, g, B[i * 2], B[i * 2 + 1], SPR);
  ctx.restore();
}
function setClub(level) {
  club.level = level;
  const M = TUNE.club.marquee;
  club.mw = Math.round(clamp(titleM.w * titleK + 2 * M.padX, M.minW, M.maxW));
  const room = world ? (world.window.y - 6 - titleY()) * 2 : M.h;
  club.mh = Math.round(clamp(Math.min(titleM.h * titleK + 2 * M.padY, room), 70, M.h));
  layoutMarquee();
}
let world = null, layoutH = -1, scrimG = null, scrimH = -1, launchChecked = false, challenge = null, dareStr = '';
let titleKey = '', neonKey = '', playParams = null;
let titleM = { w: 338, h: 144, eye: null }, titleK = 1, titleW = 400, titleH = 210, titleLang = '';   // the fitted lockup
const EYE = logoEye();
const btns = createButtons();
// one display face (GAME-SPEC §5: Baloo 2, Arabic in Cairo): the card sub-lines are Baloo 700 on the card face
const lbl = {
  dailyT: createLabel(118, 26, { size: 17, weight: 800, color: TUNE.card.title, outline: TUNE.ink, outlineWidth: 4, align: 'left' }),
  dailyS: createLabel(118, 20, { size: 13.5, weight: 700, color: TUNE.card.sub, align: 'left' }),
  endT: createLabel(118, 26, { size: 17, weight: 800, color: TUNE.card.title, outline: TUNE.ink, outlineWidth: 4, align: 'left' }),
  endS: createLabel(118, 20, { size: 13.5, weight: 700, color: TUNE.card.sub, align: 'left' }),
  unlock: createLabel(340, 40, { size: 22, weight: 800, color: '#fff4d6', outline: '#1d1840', outlineWidth: 6, shadow: true }),
  empty: createLabel(340, 26, { size: 15, weight: 700, color: '#ffe2b8', outline: '#14112e', outlineWidth: 4 }),
};
const view = { streak: 0, streakStr: '', dailyDone: false, dailyTried: false, dailyRisk: false, dailyLocked: false, bandN: 0, bandStr: '', firstStr: '',
  firstW: 120, unlockA: 0, shakeT: -1, shakeDx: 0, today: '', tickAt: 60,   // tickAt: st.t of the next minute tick
  dailyNew: false, newStr: '' };                                              // dailyNew: open, never played (the NEW sticker)
const PILL_NEW = { color: UI_ACCENT.velvet, textColor: UI_ACCENT.velvetText };

// ---- news (TUNE.news): up to four items, revealed one at a time once the member hop-ins are done. it: { kind ('decor' |
// 'daily' | 'piggy' (full: a tap opens its sheet) | 'pass' (the Club Pass ended) | 'starter' (the Starter Pack's one
// reminder: a tap opens its popup) | 'passgift' (the Club Pass's daily gift card: a tap collects) | 'purchase'), str,
// icon, w (pill width), at (nw.t when it fired, -1 = waiting) }. nw.t runs from enter; nw.wait = when the
// next one may fire; decor = the level being revealed, decorFrom = the level the window shows until then (-1 = none due)
const NEWS = [{ kind: '', str: '', icon: '', w: 0, at: -1 }, { kind: '', str: '', icon: '', w: 0, at: -1 },
  { kind: '', str: '', icon: '', w: 0, at: -1 }, { kind: '', str: '', icon: '', w: 0, at: -1 }];
const nw = { n: 0, i: 0, t: 0, wait: 0, s: 0, a: 0, glow: 0, fx: 195, fy: 200, fr: 200, decor: 0, decorFrom: -1 };
const NEWS_O = { icon: '', color: UI_ACCENT.brass, alpha: 1 };
const SP_NEWS = { to: 1, stiffness: 300, damping: 13, velocity: 3 };
const NEWS_RING = { size: [10, 120], life: 0.55, colors: '#ffd166' };
const NEWS_SPARK = { count: 18, spawnRadius: 60, colors: ['#ffd166', '#fff3c4', '#ffb347'] };
const DAILY_SPARK = { count: 14, spawnRadius: 40, colors: ['#4fe3b0', '#ffd166', '#ffffff'] };
// the highest decor level the player has seen revealed (0 = none: the bare room needs no reveal)
function seenDecor(lv) {
  for (let n = lv; n >= 1; n--) if (profile.hasSeen('decor' + n)) return n;
  return 0;
}
// a Daily that has never been played (no daily on record, none started from home since it opened)
function dailyNever() {
  if (profile.hasSeen('daily')) return false;
  const d = profile.data.daily;
  for (const k in d) if (d[k]) return false;
  return true;
}
// a late purchase joins the news line now (a finished line starts over)
function pushLate() {
  if (!takeLatePurchase()) return;
  if (nw.i >= nw.n) { nw.n = 0; nw.i = 0; nw.wait = nw.t + 0.25; }
  pushNews('purchase', i18n.t('purchase_arrived'), 'check');
}
function pushNews(kind, str, icon) {
  if (nw.n >= NEWS.length || !str) return;
  const it = NEWS[nw.n++], N = TUNE.news, fs = Math.round(N.pillH * 0.56);
  it.kind = kind; it.str = str; it.icon = icon; it.at = -1;
  it.w = Math.round(clamp(measure(str, fs) + fs * 1.62 + N.pillH * 0.6 + 10, 160, N.maxW));
}
// the decor level the window and the club front show now: the last seen one while a reveal waits, else the profile's
function shownDecor() { return nw.decorFrom >= 0 ? nw.decorFrom : profile.decorLevel(); }
// queues the news for this visit (enter): an unseen decor level, the Daily's first opening
function queueNews() {
  nw.n = 0; nw.i = 0; nw.t = 0; nw.wait = TUNE.news.first; nw.s = 0; nw.a = 0; nw.decorFrom = -1;
  const lv = profile.decorLevel(), seen = seenDecor(lv);
  if (lv > seen) {
    nw.decor = lv; nw.decorFrom = seen;
    pushNews('decor', i18n.t('decor_new', { name: i18n.t('decor_' + lv) }), 'star');
  }
  if (!profile.hasSeen('dailyOpen') && profile.dailyUnlocked() && dailyNever()) pushNews('daily', i18n.t('ui.daily_open'), 'calendar');
  // the wallet's quiet notes (MONETIZATION §6.2, capped by wallet.offerDue): a Club Pass that ended, a full piggy
  // the Club Pass's daily gift first (the gems are already in the wallet: the card is their arrival), then the notes
  passGiftQueue();
  if (wallet.offerDue('passEnded')) pushNews('pass', i18n.t('shop.pass_ended'), 'calendar');
  if (!challenge && wallet.offerDue('piggy')) { wallet.piggy(PIGO); pushNews('piggy', i18n.t('shop.piggy_full_news', { n: fmtGems(PIGO.gems) }), 'star'); }
  // the Starter Pack's one extra surfacing (never a popup; the wallet's caps: once ever, never in the popup's session,
  // never within a day of a purchase, at most OFFERS.perDay offers a day)
  else if (!challenge && wallet.offerDue('starterPill', starterCtx())) pushNews('starter', i18n.t('eco.starter_pill'), 'star');
}
const STARTER_CTX = { priceReady: true };
function starterCtx() { STARTER_CTX.priceReady = canSell('mb_starter_pack'); return STARTER_CTX; }

// ---- the Club Pass's daily gift (MONETIZATION §6.2): payments.initPayments pays the pass at launch (and on every return
// to the foreground), before home ever runs, so home reads what was paid from wallet.pass() and compares it with its own
// record of the last gift it showed ({ day, paid } under PASS_GIFT.key: one small save key; dev pages point it at a
// scratch key with usePassGiftKey). Due once per local day while today's open was counted (the pass delivered today):
// the days paid since the record (missed days included) + today's run bonus. The Shop pill's balance holds those gems
// back (PG.hold) until the card is collected and they land in it.
const PASS_GIFT = { key: 'home.passgift' };
export function usePassGiftKey(k) { if (k) PASS_GIFT.key = String(k); }
const PASSV = {};
const PG = { gems: 0, bonus: 0, hold: 0, title: '', got: '', run: '', runW: 0, collected: false, collectAt: -1 };
const PG_REC = { day: '', paid: 0 };
function passGiftRead() {
  let r = null;
  try { r = save.get(PASS_GIFT.key, null); } catch (e) { r = null; }
  PG_REC.day = r && typeof r.day === 'string' ? r.day : '';
  PG_REC.paid = r && r.paid > 0 ? Math.floor(r.paid) : 0;
  return PG_REC;
}
// today's gift is on screen (or was granted with its own fanfare in the shop): remember it
function passGiftSeen() {
  if (typeof wallet.pass !== 'function') return;
  wallet.pass(PASSV);
  try { save.set(PASS_GIFT.key, { day: profile.today(), paid: PASSV.paidDays | 0 }); } catch (e) { /* storage off: shown again next visit */ }
}
// a counted word of the shop dictionary ('<key>_<pluralCat>' when it has that variant)
function tpk(key, n, params) {
  const D = SHOPUI[i18n.lang] || SHOPUI.en, k = key + '_' + pluralCat(n, i18n.lang);
  return i18n.t(D[k] !== undefined ? k : key, params);
}
// queues today's gift card when due (fills PG; the Shop pill holds its gems back)
function passGiftQueue() {
  PG.hold = 0; PG.collected = false; PG.collectAt = -1; wv.dirty = true;
  if (typeof wallet.pass !== 'function') return;
  wallet.pass(PASSV);
  if (!(PASSV.paidDays > 0) || !PASSV.today) return;
  const rec = passGiftRead(), today = profile.today();
  if (rec.day === today) return;
  const base = rec.paid <= PASSV.paidDays ? rec.paid : 0;      // a fresh pass after the last one ran out starts at 0
  const days = Math.max(0, PASSV.paidDays - base), bonus = PASSV.bonusToday ? PASSV.runGems : 0;
  if (days <= 0 && bonus <= 0) return;
  const gems = days * PASS.gems;
  PG.gems = gems + bonus; PG.bonus = bonus;
  PG.title = i18n.t('shop.pg_title', { d: PASSV.paidDays, t: PASSV.total });
  if (days === 1) PG.got = i18n.t('shop.pg_got', { gems: fmtGems(gems), name: i18n.t('shop.b.' + PASS.rotate[(PASSV.paidDays - 1) % PASS.rotate.length]) });
  else if (days > 1) PG.got = tpk('shop.pg_got_n', days, { gems: fmtGems(gems), b: days });
  else PG.got = i18n.t('shop.pg_gems', { gems: fmtGems(bonus) });
  PG.run = bonus > 0 ? tpk('shop.pg_run', PASSV.run, { n: PASSV.run, g: bonus }) : '';
  PG.runW = PG.run ? Math.round(clamp(measure(PG.run, 13, 800) + 46, 120, 250)) : 0;
  PG_T.set(PG.title); PG_G.set(PG.got);
  PG.hold = PG.gems;
  pushNews('passgift', PG.got, 'star');
}
// Collect: the gems fly from the card into the Shop pill (each landing releases its share of the held balance)
const FLYH = [];
for (let i = 0; i < 14; i++) FLYH.push({ on: false, x0: 0, y0: 0, cx: 0, cy: 0, t: 0, d: 0.7, delay: 0, val: 0, rot: 0 });
let flyK = 0;
function passGiftCollect(x, y) {
  if (PG.collected) return;
  PG.collected = true;
  const F = TUNE.gift.fly, total = PG.hold, n = Math.min(F.n, FLYH.length, Math.max(4, Math.round(total / 10)));
  let left = total;
  for (let i = 0; i < n; i++) {
    const f = FLYH[i], share = i === n - 1 ? left : Math.floor(total / n);
    left -= share;
    f.on = true; f.t = 0; f.delay = i * F.stagger; f.d = F.dur * (0.85 + Math.random() * 0.3); f.val = share; f.rot = (Math.random() - 0.5) * 2;
    f.x0 = x + (Math.random() - 0.5) * 120; f.y0 = y + (Math.random() - 0.5) * 20;
    f.cx = (f.x0 + B.shop.x) / 2 + (Math.random() - 0.5) * 80; f.cy = Math.min(f.y0, B.shop.y) - F.arc * (0.5 + Math.random() * 0.5);
  }
  flyK = 0;
  party.sfx.nice(12);
  particles.emit('sparkle', x, y, NEWS_SPARK);
  camera.punch(1.02, 140);
}
function updateFlyH(dt) {
  for (let i = 0; i < FLYH.length; i++) {
    const f = FLYH[i];
    if (!f.on) continue;
    f.t += dt;
    if (f.t >= f.delay + f.d) {
      f.on = false;
      PG.hold = Math.max(0, PG.hold - f.val); wv.dirty = true;
      party.ladder(Math.min(12, 1 + flyK++));
      particles.emit('sparkle', B.shop.x, B.shop.y, LAND_SPARK);
      B.shop.bump = 1; spring(B.shop, 'bump', SP_SHOP_BUMP);
    }
  }
}
function drawFlyH(ctx) {
  const F = TUNE.gift.fly;
  for (let i = 0; i < FLYH.length; i++) {
    const f = FLYH[i];
    if (!f.on || f.t < f.delay) continue;
    const u = easeIndex.inOutCubic(clamp((f.t - f.delay) / f.d, 0, 1)), v = 1 - u;
    const x = v * v * f.x0 + 2 * u * v * f.cx + u * u * B.shop.x, y = v * v * f.y0 + 2 * u * v * f.cy + u * u * B.shop.y;
    drawGem(ctx, x, y, F.size * (1.1 - 0.35 * u), 1, f.rot * u);
  }
}
const LAND_SPARK = { count: 4, spawnRadius: 8, colors: ['#bff3ff', '#ffffff', '#ffd166'] };
const SP_SHOP_BUMP = { to: 0, stiffness: 380, damping: 10, velocity: 7 };
// the gift card: a gift-purple sticker panel, the ticket on the leading side, its two lines, the amber Collect chip on
// the trailing side, the run ribbon riding its top edge (x, y = its centre; a = alpha, k = scale)
const PG_PANEL = createPanel('#3a2a6a', { radius: 22, inner: 'rgba(255,209,102,0.4)' });
const PG_T = createLabel(208, 24, { size: 14, weight: 800, color: '#ffd166', outline: TUNE.ink, outlineWidth: 3.5, align: 'left' });
const PG_G = createLabel(208, 28, { size: 17, weight: 800, color: '#fff4dc', outline: TUNE.ink, outlineWidth: 4, align: 'left' });
const PILL_COLLECT = { color: UI_ACCENT.amber, textColor: '', icon: '', size: 14 }, PILL_RUN = { color: UI_ACCENT.brass, textColor: '#fff4dc', icon: 'flame', size: 13 };
const CHECK_O = { color: '#4fe3b0' };
function drawPassGift(ctx, x, y, a, k) {
  const G = TUNE.gift, rtl = i18n.isRTL, lead = rtl ? 1 : -1, hw = G.w / 2;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k, k);
  PG_PANEL.draw(ctx, 0, 0, G.w, G.h);
  drawArt(ctx, 'ticket', lead * (hw - 36), 1, 52);
  PG_T.align(rtl ? 'right' : 'left'); PG_G.align(rtl ? 'right' : 'left');
  PG_T.draw(ctx, lead * (hw - 66), -11); PG_G.draw(ctx, lead * (hw - 66), 12);
  if (!PG.collected) drawPill(ctx, -lead * (hw - 46), 1, 76, 32, i18n.t('shop.medal_collect'), PILL_COLLECT);
  else drawGlyph(ctx, 'check', -lead * (hw - 46), 1, 22, CHECK_O);
  if (PG.run) { ctx.save(); ctx.translate(-lead * (hw - 16 - PG.runW / 2), -G.h / 2 - 2); ctx.rotate(rtl ? -0.04 : 0.04); drawPill(ctx, 0, 0, PG.runW, 26, PG.run, PILL_RUN); ctx.restore(); }
  ctx.restore();
}
function fireNews(it) {
  const N = TUNE.news;
  it.at = nw.t;
  nw.s = 0.4; spring(nw, 's', SP_NEWS);
  if (it.kind === 'decor') {
    // the new piece swaps in (world.setDecor's own sparkle burst lands on it), under a warm spotlight
    const lv = nw.decor, w = world.window;
    nw.decorFrom = -1;
    world.setDecor(lv);
    setClub(lv);
    if (lv >= 7) { nw.fx = 195; nw.fy = titleY(); nw.fr = 230; }
    else { nw.fx = w.x + w.w / 2; nw.fy = w.y + w.h * N.focus[lv]; nw.fr = w.w * N.glowR; }
    nw.glow = 1;
    particles.emit('ring', nw.fx, nw.fy, NEWS_RING);
    particles.emit('sparkle', nw.fx, nw.fy, NEWS_SPARK);
    party.sfx.nice(12);
    camera.punch(1.02, 150);
    post.pulse(PULSE);
    profile.markSeen('decor' + lv);
  } else if (it.kind === 'daily') {
    const d = B.daily;
    particles.emit('sparkle', d.x, d.y, DAILY_SPARK);
    spring(d, 'bump', SP_NEWS_BUMP);
    party.sfx.nice(8);
    profile.markSeen('dailyOpen');
  } else if (it.kind === 'purchase') {
    party.sfx.nice(10);
    const w = world.window;
    particles.emit('sparkle', 195, w.y + w.h + 28, NEWS_SPARK);
  } else if (it.kind === 'passgift') {
    party.sfx.nice(10);
    particles.emit('sparkle', 195, newsY(), NEWS_SPARK);
    passGiftSeen();
  } else if (it.kind === 'starter') {
    party.sfx.nice(6);
    wallet.offerShown('starterPill');
  } else {
    party.sfx.nice(6);
    wallet.offerShown(it.kind === 'pass' ? 'passEnded' : 'piggy');
  }
}
// the news pill under the window when it is on screen and holds `kind` (a tap on the piggy one opens its sheet)
function newsHit(x, y, kind) {
  if (!world || nw.i >= nw.n || nw.a < 0.5) return false;
  const it = NEWS[nw.i], G = TUNE.gift, gift = it.kind === 'passgift';
  return it.kind === kind && it.at >= 0 && Math.abs(x - 195) <= (gift ? G.w : it.w) / 2 && Math.abs(y - newsY()) <= (gift ? G.h : TUNE.news.pillH) / 2 + 4;
}
// the news line's centre y (under the party window)
function newsY() { return world.window.y + world.window.h + 28; }
const SP_NEWS_BUMP = { to: 0, stiffness: 380, damping: 10, velocity: 9 };
function runNews(dt) {
  nw.glow = Math.max(0, nw.glow - dt / TUNE.news.glowFade);
  if (nw.i >= nw.n) return;
  const N = TUNE.news;
  nw.t += dt;
  if (st.unlockQ.length) { nw.wait = Math.max(nw.wait, nw.t + N.after); return; }   // the members hop in first
  const it = NEWS[nw.i];
  if (it.at < 0) { if (nw.t >= nw.wait && !scenes.transitioning) fireNews(it); return; }
  const gift = it.kind === 'passgift', ht = nw.t - it.at;
  let hold = gift ? TUNE.gift.giftHold : N.hold;
  if (gift) {
    // one never tapped collects itself when its hold runs out (the gems are the player's either way); a collected card
    // shows its check for collectHold s, then leaves
    if (!PG.collected && ht >= hold && world) { passGiftCollect(195, newsY()); PG.collectAt = nw.t; }
    if (PG.collected) hold = Math.min(hold, PG.collectAt - it.at + TUNE.gift.collectHold);
  }
  nw.a = ht < hold ? Math.min(1, ht / 0.15) : Math.max(0, 1 - (ht - hold) / N.out);
  if (ht >= hold + N.out) { nw.i++; nw.a = 0; nw.wait = nw.t + N.gap; }
}

// a card's glyph in its accent hue (the card itself is the indigo + brass secondary sticker)
const CARD_GLYPH = { color: '#ffffff' };
function cardOverlay(ctx, b) {
  const rtl = i18n.isRTL, hw = b.w / 2, side = rtl ? 1 : -1;
  CARD_GLYPH.color = b.glyphTint;
  drawGlyph(ctx, b.glyph, side * (hw - 27), -1, 27, CARD_GLYPH);
  const tx = side * (hw - 46);
  b.lt.draw(ctx, tx, -9);
  b.ls.draw(ctx, tx, 12, 0.95);
}

const C = TUNE.card, I = TUNE.icons;
const B = {
  play: btns.add({ id: 'play', x: 195, y: 600, w: TUNE.play.w, h: TUNE.play.h, color: TUNE.play.color, icon: 'play', label: '', onTap: tapPlay }),
  daily: btns.add({ id: 'daily', x: 106, y: 700, w: C.w, h: C.h, secondary: true, glyph: 'calendar', glyphTint: C.dailyIcon, lt: lbl.dailyT, ls: lbl.dailyS, overlay: cardOverlay, onTap: tapDaily }),
  endless: btns.add({ id: 'endless', x: 284, y: 700, w: C.w, h: C.h, secondary: true, glyph: 'moon', glyphTint: C.endlessIcon, lt: lbl.endT, ls: lbl.endS, overlay: cardOverlay, onTap: tapEndless }),
  band: btns.add({ id: 'band', kind: 'icon', x: 121, y: 790, w: I.size, secondary: true, icon: 'band', onTap: tapBand }),
  gear: btns.add({ id: 'gear', kind: 'icon', x: 195, y: 790, w: I.size, secondary: true, icon: 'gear', onTap: tapGear }),
  // the language toggle: a readable pill naming the OTHER language ('عربي' in English, 'EN' in Arabic), globe glyph in amber
  lang: btns.add({ id: 'lang', x: 269, y: 790, w: I.langW, h: I.langH, secondary: true, icon: 'lang', iconColor: I.langIcon, label: '', size: I.langFont, onTap: tapLang }),
  // the Shop pill: gem + balance + '+' (MONETIZATION §6.2), in the thumb zone, never top-right
  shop: btns.add({ id: 'shop', x: 195, y: 790, w: I.shopW, h: I.langH, secondary: true, label: '', overlay: shopOverlay, onTap: tapShop }),
  // the booster strip (from night 3): Slow-Mo / Second Chance toggles on the line under the party window
  slow: btns.add({ id: 'slow', x: 110, y: 560, w: TUNE.strip.w, h: TUNE.strip.h, secondary: true, label: '', overlay: stripOverlay, onTap: tapStrip,
    booster: 'slowmo', art: 'snail', lbl: createLabel(TUNE.strip.w - 70, 24, { size: TUNE.strip.font, weight: 800, color: '#fff4dc', outline: TUNE.ink, outlineWidth: 3.5, align: 'left' }), count: '', on: false, hidden: true }),
  second: btns.add({ id: 'second', x: 280, y: 560, w: TUNE.strip.w, h: TUNE.strip.h, secondary: true, label: '', overlay: stripOverlay, onTap: tapStrip,
    booster: 'second', art: 'heart', lbl: createLabel(TUNE.strip.w - 70, 24, { size: TUNE.strip.font, weight: 800, color: '#fff4dc', outline: TUNE.ink, outlineWidth: 3.5, align: 'left' }), count: '', on: false, hidden: true }),
};
const STRIP = [B.slow, B.second];
const ICON_LTR = [B.band, B.shop, B.gear, B.lang], ICON_RTL = [B.lang, B.gear, B.shop, B.band];

// ---- the wallet on home: the Shop pill's balance + badges, the booster strip, the equipped look on the lobby
// 52 wide (shrink-to-fit at 44): a 5-6 digit balance stays between the gem and the '+' badge
const SHOP_LBL = createLabel(52, 28, { size: 18, weight: 800, color: '#ffffff', outline: TUNE.ink, outlineWidth: 4.5 });
const BADGE_PLUS = { color: '#ffb347', textColor: '#6a3f00' };
const BADGE_DOT = { color: UI_ACCENT.gold, textColor: UI_ACCENT.goldInk };
const BADGE_PASS = { color: UI_ACCENT.brass, textColor: '#fff4dc' };
const BADGE_CNT = { color: '#1f1c52', textColor: '#fff4dc' };
const BADGE_ON = { color: TUNE.strip.on, textColor: '#fff4dc' };
const wv = { gems: -1, gemStr: '0', dot: false, pass: 0, passStr: '', piggy: false, strip: false, stripShown: false, offerDone: false, offerAt: 0, dirty: true, lookDirty: true, lookSig: '' };
const PIGO = { gems: 0, cap: 720, minBreak: 360, canBreak: false, full: false };
const LOOK = { club: '', rope: '', door: '', plate: '', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
const RUN_CTX = { mode: 'night', night: 1, vs: null, practice: false };
function shopOverlay(ctx, b) {
  const rtl = i18n.isRTL, hw = b.w / 2, side = rtl ? 1 : -1;
  const gx = side * (hw - 23), px = -side * (hw - 18);
  drawGem(ctx, gx, 0, 25, 1, Math.sin(st.t * 1.6) * 0.08);
  SHOP_LBL.draw(ctx, (gx + px) / 2 - side * 2, 1);
  drawBadge(ctx, px, 0, 20, '+', BADGE_PLUS);
}
function stripOverlay(ctx, b) {
  const rtl = i18n.isRTL, hw = b.w / 2, side = rtl ? 1 : -1;
  drawArt(ctx, b.art, side * (hw - 22), 0, 30);
  b.lbl.draw(ctx, side * (hw - 40), 1);
  drawBadge(ctx, -side * (hw - 18), 0, 24, b.on ? '' : b.count, b.on ? BADGE_ON : BADGE_CNT);
  if (b.on) drawGlyph(ctx, 'check', -side * (hw - 18), 0, 14, GLYPH_O);
}
// balance, badges, the strip's counts + armed state (on refresh and wallet changes, never per frame)
function walletView() {
  wv.dirty = false;
  const g = Math.max(0, wallet.gems() - PG.hold);            // a Club Pass gift's gems count once they land in the pill
  if (g !== wv.gems) { wv.gems = g; wv.gemStr = fmtGems(g); SHOP_LBL.set(wv.gemStr); }
  wv.dot = wallet.giftReady() || wallet.roadNew();
  wv.pass = wallet.passActive() ? wallet.passDaysLeft() : 0; wv.passStr = String(wv.pass);
  wallet.piggy(PIGO); wv.piggy = PIGO.full;
  RUN_CTX.night = profile.nextNight();
  wv.strip = !challenge && wallet.boostersOpen(RUN_CTX);
  const rtl = i18n.isRTL;
  for (let i = 0; i < STRIP.length; i++) {
    const b = STRIP[i], id = b.booster;
    b.on = wallet.armed(id); b.count = '×' + wallet.boosters(id);
    b.lbl.set(i18n.t(id === 'second' ? 'shop.b_short.second' : 'shop.b.' + id)).align(rtl ? 'right' : 'left');
    b.color = b.on ? TUNE.strip.on : UI_SECONDARY.color;
  }
}
// the equipped look on the lobby world + the party's music flavour; members re-dressed when an outfit changed
function applyLook() {
  wv.lookDirty = false;
  if (!world) return;
  wallet.look(LOOK);
  if (typeof world.setLook === 'function') world.setLook(LOOK);
  if (typeof party.setTheme === 'function') party.setTheme(LOOK.club);
  const O = LOOK.outfit, sig = O.blob + '|' + O.tall + '|' + O.round + '|' + O.square + '|' + O.bean;
  if (sig !== wv.lookSig) {
    const first = wv.lookSig === '';
    wv.lookSig = sig;
    if (!first && !st.unlockQ.length) world.setBand(specsOf(lobbyBand));
  }
}
function onWallet(what) {
  wv.dirty = true;
  if (what === 'equip' || what === 'items' || what === 'vip' || what === 'all') {
    wv.lookDirty = true;
    if (st.active && world) applyLook();                // live, also while the shop overlay covers the lobby
  }
}
wallet.onChange(onWallet);

function go(params, b) {
  if (scenes.transitioning) return;
  btns.locked = true;
  if (params.mode === 'daily') profile.markDailyStart(params.date, params.startedAt);   // one attempt counts (profile.js)
  camera.punch(1.03, 160);
  scenes.go('play', params, { transition: 'wipe', ms: 560, x: b.x, y: b.y });
}
function tapPlay(b) {
  if (challenge) {
    const p = playParams;
    if (p.mode === 'daily') p.startedAt = Date.now();      // the daily grace window runs from the tap, not from the page load
    challenge = null; go(p, b); return;
  }
  go({ mode: 'night', night: profile.nextNight() }, b);
}
function tapDaily(b) {
  if (view.dailyLocked) {                                // not open yet: the card shakes no (its line says when it opens)
    view.shakeT = 0;
    input.vibrate([10, 40, 10]);
    return;
  }
  if (scenes.transitioning) return;
  if (view.dailyNew) { profile.markSeen('daily'); view.dailyNew = false; }   // the NEW sticker has done its job
  go({ mode: 'daily', date: profile.today(), startedAt: Date.now() }, b);
}
function tapEndless(b) { go({ mode: 'endless' }, b); }
function tapBand() { if (!scenes.transitioning) { btns.locked = true; scenes.go('collection', {}, { transition: 'zoom', ms: 420 }); } }
function tapGear() { scenes.push('settings', { from: 'home' }); }
function tapShop() { if (!scenes.transitioning) scenes.push('shop', { from: 'home' }); }
// a booster toggle: arm / disarm it for the next story night; with none left, the shop's buy sheet (arms it once bought)
function tapStrip(b) {
  if (scenes.transitioning) return;
  const id = b.booster;
  if (wallet.boosters(id) > 0) {
    wallet.arm(id, !wallet.armed(id));
    walletView();
    if (b.on) { party.sfx.nice(6); particles.emit('sparkle', b.x, b.y, STRIP_SPARK); }
    return;
  }
  scenes.push('shop', { popup: true, sheet: 'booster:' + id, arm: true, from: 'home' });
}
const STRIP_SPARK = { count: 10, spawnRadius: 30, colors: ['#4fe3b0', '#ffffff', '#ffd166'] };
const SP_STRIP = { to: 1, stiffness: 260, damping: 13 };
function tapLang() {
  profile.setSetting('lang', i18n.lang === 'ar' ? 'en' : 'ar');
  spring(st, 'titleS', SP_TITLE_POP);
  st.flickT = 0;
}

// ---- title lockup (logo.js) at titleK in a titleW x titleH bake, and its bright neon tube on its own sprite (blended
// 'lighter', alpha = how lit the sign is)
function bakeTitle(c, w, h) { paintLogo(c, w / 2, h / 2, titleK, i18n.lang); }
function bakeNeon(c, w, h) { paintLogoNeon(c, w / 2, h / 2, titleK, i18n.lang); }
// fits the lockup between the safe top and the party window (on refresh / layout only: logoMetrics allocates)
function fitTitle() {
  const T = TUNE.title;
  if (titleLang !== i18n.lang + FG) { titleM = logoMetrics(i18n.lang); titleLang = i18n.lang + FG; }
  const room = titleRoom();
  titleK = clamp(Math.min(T.maxW / titleM.w, room / titleM.h, T.kMax), T.kMin, T.kMax);
  titleW = Math.ceil(titleM.w * titleK + 64); titleH = Math.ceil(titleM.h * titleK + 72);
  const kk = Math.round(titleK * 1000);
  titleKey = 'home.title.' + i18n.lang + '.' + FG + '.' + kk;
  neonKey = 'home.neon.' + i18n.lang + '.' + FG + '.' + kk;
}

// ---- state + layout
function refresh() {
  const T = TUNE;
  const today = profile.today();
  const d = profile.dailyStatus(today);
  view.dailyDone = !!d && !d.practice;
  view.dailyTried = !view.dailyDone && profile.dailyRuns(today) > 0;     // a counted try left with the app: replays only
  const si = profile.streakInfo(today);
  view.streak = si.count;
  view.streakStr = String(si.count);
  // the Daily opens after night profile.tune.dailyAfter; a challenge link still plays one (that goes through PLAY)
  view.dailyLocked = !profile.dailyUnlocked();
  // day 2+: a live streak that today's daily has not kept yet is at risk (the card pulses, its line says so)
  view.dailyRisk = !view.dailyLocked && si.alive && si.count > 0 && !si.playedToday && !view.dailyDone && !view.dailyTried;
  // just opened and never played: the card calls with a NEW sticker until the first daily
  view.dailyNew = !view.dailyLocked && !view.dailyRisk && !view.dailyDone && !view.dailyTried && dailyNever();
  view.newStr = i18n.t('ui.new');
  view.bandN = profile.bandUnlocked().length;
  view.bandStr = String(view.bandN);
  st.first = profile.nextNight() === 1 && !profile.bestNight(1);
  view.firstStr = i18n.t('first_night');
  view.firstW = Math.min(150, measure(view.firstStr, 14) + 34);
  if (challenge) {
    const c = challenge;
    if (c.mode === 'daily') { const dd = c.daily || today; playParams = { mode: 'daily', date: dd, vs: c.vs, startedAt: 0 }; B.play.label = i18n.t('challenge_daily', { d: dailyNightNumber(dd) }); }
    else if (c.mode === 'endless') { playParams = { mode: 'endless', seed: c.seed, vs: c.vs }; B.play.label = i18n.t('endless'); }
    else { const n = c.night || 1; playParams = { mode: 'night', night: n, seed: c.seed, vs: c.vs }; B.play.label = i18n.t('challenge_night', { n: n }); }
    dareStr = challengeInvite(c) || i18n.t('challenge_from');
  } else {
    playParams = null; dareStr = '';
    B.play.label = i18n.t('play_night', { n: profile.nextNight() });
  }
  const C = TUNE.card, locked = view.dailyLocked;
  view.today = today;
  lbl.dailyT.set(i18n.t('daily_num', { n: dailyNightNumber(today) })).tint(locked ? C.lockTitle : C.title);
  // the sub line: when it opens (profile.tune.dailyAfter) / the streak at risk / the countdown to the next one once today's
  // is played / a counted try already used / else what the Daily is: the friendly one, the same guests for everyone
  if (locked) lbl.dailyS.set(i18n.t('daily_locked', { n: profile.tune.dailyAfter }));
  else if (view.dailyRisk) lbl.dailyS.set(plural('daily_keep', view.streak, i18n.lang));
  else if (view.dailyDone) nextIn();
  else lbl.dailyS.set(i18n.t(view.dailyTried ? 'daily_tried' : 'ui.daily_same'));
  view.tickAt = st.t + tickIn();
  lbl.dailyS.tint(locked ? C.lockSub : view.dailyRisk ? C.subRisk : view.dailyDone ? C.subDone : C.sub);
  B.daily.glyph = locked ? 'lock' : 'calendar'; B.daily.glyphTint = locked ? C.lockIcon : C.dailyIcon;
  B.daily.color = locked ? C.lockFace : UI_SECONDARY.color;
  lbl.endT.set(i18n.t('endless'));
  lbl.endS.set(i18n.t('endless_best', { n: profile.endlessBest }));
  B.lang.label = i18n.t('lang_toggle');
  lbl.empty.set(i18n.t('band_empty'));
  walletView();
  const al = i18n.isRTL ? 'right' : 'left';
  lbl.dailyT.align(al); lbl.dailyS.align(al); lbl.endT.align(al); lbl.endS.align(al);
  layout();
}

// the Daily's countdown, on the minute (never per frame): the time left to local midnight, when profile.today() turns
function nextIn() {
  const now = new Date(), left = 86400000 - ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 - now.getMilliseconds();
  const mins = Math.max(1, Math.ceil(left / 60000)), h = Math.floor(mins / 60), m = mins % 60;
  lbl.dailyS.set(h > 0 ? i18n.t('ui.next_in', { h: h, m: m }) : i18n.t('ui.next_in_m', { m: m }));
}
// s until the next minute boundary (+ a hair, so the line has turned by then)
function tickIn() { return (60000 - Date.now() % 60000) / 1000 + 0.05; }
// once a minute: a new day re-reads everything (today's Daily opens), else the countdown steps
function tick() {
  view.tickAt = st.t + tickIn();
  if (profile.today() !== view.today) refresh();
  else if (view.dailyDone && !view.dailyLocked && !view.dailyRisk) nextIn();
}

// the PLAY button's top edge (the shop's 'Try it' tag sits just above it); 0 before the first layout
export function playTop() { return layoutH > 0 ? B.play.y - TUNE.play.h / 2 : 0; }
function layout() {
  const T = TUNE, H = stage.h, base = H - stage.safeBottom, rtl = i18n.isRTL;
  layoutH = H;
  B.play.y = base - T.rows.playUp;
  const cy = base - T.rows.cardsUp, off = (T.card.w + T.card.gap) / 2;
  B.daily.y = cy; B.endless.y = cy;
  B.daily.x = 195 + (rtl ? off : -off); B.endless.x = 195 + (rtl ? -off : off);
  // icon row: band, Shop pill, gear, language pill (mirrored in RTL), edge to edge langGap apart, centred as a group
  const iy = base - T.rows.iconsUp, I = T.icons;
  const order = rtl ? ICON_RTL : ICON_LTR;
  let x = 195 - (2 * I.size + I.shopW + I.langW + 3 * I.langGap) / 2;
  for (let i = 0; i < order.length; i++) { const b = order[i]; b.x = x + b.w / 2; b.y = iy; x += b.w + I.langGap; }
  // the booster strip rides the line under the party window (the news line), in reading order
  const S = T.strip, sy = world ? world.window.y + world.window.h + S.dy : base - T.rows.playUp - 60, so = (S.w + S.gap) / 2;
  B.slow.y = B.second.y = sy;
  B.slow.x = 195 + (rtl ? so : -so); B.second.x = 195 + (rtl ? -so : so);
  scrimG = null;
  fitTitle();
  setClub(shownDecor());
}

// the band of sky the lockup lives in: from the safe top (+ padTop) down to the party window (- padBottom)
function titleTop() { return stage.safeTop + TUNE.title.padTop; }
function titleBottom() { return world ? world.window.y - TUNE.title.padBottom : stage.safeTop + 190; }
function titleRoom() { return Math.max(60, titleBottom() - titleTop()); }
function titleY() { return (titleTop() + titleBottom()) / 2; }

function ensureWorld() {
  if (world) return;
  world = createWorld({ lobby: true, decor: profile.decorLevel(), band: [], beat: beat });
}

// the lobby unlock ceremony for members a result just unlocked (stinger first: its drum roll lands on the world's pop-in).
// Quiet (the result already played the spotlight + fanfare): no stinger, the member just hops in with its voice blip.
function runUnlocks(dt) {
  const Q = st.unlockQ;
  if (!Q.length) return;
  st.unlockT += dt;
  const U = TUNE.unlock, i = st.unlockI, quiet = st.quiet;
  if (i < Q.length) {
    const at = quiet ? U.quietStart + i * U.quietEvery : U.start + i * U.every, lead = quiet ? 0 : U.lead;
    if (!Q[i].stung && st.unlockT >= at) {
      Q[i].stung = true;
      if (!quiet) party.stinger('unlock');
      lbl.unlock.set(i18n.t('unlock_name', { name: i18n.t('sp_' + Q[i].sp) }));
    }
    if (st.unlockT >= at + lead) {
      world.unlock(memberSpec(Q[i].sp));
      if (quiet) party.sfx.voice(Q[i].sp);
      lobbyBand.push(Q[i].sp);
      party.setLobbyBand(lobbyBand);
      particles.emit('sparkle', 195, world.window.y + world.window.h * 0.62, OV_SPARK);
      st.unlockI++;
      st.doneAt = st.unlockT;
    }
  } else if (st.unlockT - st.doneAt > U.hold) Q.length = 0;
}
const lobbyBand = [];
let bandSig = '';
const BAND_SPECS = [];
// species list -> the members as dressed (one reused array; world.setBand copies what it needs)
function specsOf(list) {
  BAND_SPECS.length = 0;
  for (let i = 0; i < list.length; i++) BAND_SPECS.push(memberSpec(list[i]));
  return BAND_SPECS;
}

export const home = {
  get world() { return world; },
  get buttons() { return btns; },
  get state() { return st; },
  get challenge() { return challenge; },

  enter(p) {
    p = p || {};
    st.active = true; st.t = 0; st.titleS = 0; st.lit = 0; st.flickT = -1; st.flickAt = 6; view.shakeT = -1; view.shakeDx = 0;
    st.unlockQ.length = 0; st.unlockT = 0; st.unlockI = 0; view.unlockA = 0; st.quiet = p.shown === true;
    if (!launchChecked) {
      launchChecked = true;
      const lp = parseLaunchParams();
      if (lp && lp.mode) challenge = lp;
    }
    ensureWorld();
    const band = profile.bandUnlocked();
    if (p.unlocked && p.unlocked.length) {
      for (let i = 0; i < p.unlocked.length; i++) {
        const sp = p.unlocked[i], j = band.indexOf(sp);
        if (j >= 0) { band.splice(j, 1); st.unlockQ.push({ sp: sp, stung: false }); }
      }
    }
    lobbyBand.length = 0;
    for (let i = 0; i < band.length; i++) lobbyBand.push(band[i]);
    // the Club Pass pays any day it owes (a session left open past midnight; payments.js also settles at launch and on
    // every return to the foreground) before the news line asks whether it ended
    try { wallet.passSettle(); } catch (e) { console.warn('[home] pass settle failed', e); }
    queueNews();
    pushLate();
    world.setDecor(shownDecor());                     // a new level waits for its reveal (runNews)
    world.setBand(specsOf(band));
    bandSig = st.unlockQ.length ? '' : band.join(',');
    world.closeDoor();
    wv.lookSig = ''; applyLook();
    setBeat(beat);
    party.start('lobby');
    party.setLobbyBand(lobbyBand);
    btns.reset(); btns.locked = false;
    wv.offerDone = !!challenge; wv.offerAt = 0; wv.stripShown = false;
    for (let i = 0; i < STRIP.length; i++) STRIP[i].hidden = true;
    refresh();
    btns.popIn(TUNE.pop.first, TUNE.pop.step);
    spring(st, 'titleS', SP_TITLE);
  },
  exit() {
    st.active = false;
    // a gift card still flying: its gems are in the wallet already, the pill shows them all from here
    for (let i = 0; i < FLYH.length; i++) FLYH[i].on = false;
    PG.hold = 0; wv.dirty = true;
    btns.kill();
    tweens.killTarget(st);
    btns.reset();
  },
  pause() { btns.reset(); },
  // back from the settings overlay: language / progress may have changed (a reset empties the band)
  resume() {
    btns.locked = false;
    if (wv.lookDirty) applyLook();
    // a news item still waiting is re-read (a progress reset in settings drops a reveal that no longer applies)
    if (nw.i < nw.n && NEWS[nw.i].at < 0) { const t = nw.t; queueNews(); nw.t = t; nw.wait = t + TUNE.news.after; }
    refresh();
    world.setDecor(shownDecor());
    const band = profile.bandUnlocked(), sig = band.join(',');
    if (sig !== bandSig && !st.unlockQ.length) {
      bandSig = sig; world.setBand(specsOf(band));
      lobbyBand.length = 0;
      for (let i = 0; i < band.length; i++) lobbyBand.push(band[i]);
      party.setLobbyBand(lobbyBand);
    }
  },

  update(dt) {
    st.t += dt;
    if (world) world.update(dt);
    btns.update(dt);
    runUnlocks(dt);
    runNews(dt);
    updateFlyH(dt);
    view.unlockA += ((st.unlockQ.length && st.unlockQ[0].stung ? 1 : 0) - view.unlockA) * Math.min(1, dt * 6);
    if (!st.unlockQ.length && view.unlockA < 0.01) view.unlockA = 0;
    // neon: power-on sequence, then a steady hum with an occasional stutter
    const T = TUNE.title, P = T.powerOn, pt = st.t - 0.15;
    let lit = 1;
    if (pt < P[P.length - 2]) { lit = 0; for (let i = 0; i < P.length; i += 2) if (pt >= P[i]) lit = P[i + 1]; }
    else {
      st.flickAt -= dt;
      if (st.flickAt <= 0) { st.flickAt = T.flickEvery[0] + Math.random() * (T.flickEvery[1] - T.flickEvery[0]); st.flickT = 0; }
      if (st.flickT >= 0) {
        st.flickT += dt;
        if (st.flickT > T.flickDur) st.flickT = -1;
        else lit = Math.sin(st.flickT * T.flickHz + Math.sin(st.flickT * 17) * 2) > -0.2 ? 1 : 0.18;
      }
      lit *= 1 - T.hum * (0.5 + 0.5 * noise1(st.t * 7.3));
    }
    st.lit = lit;
    stepLogoEye(EYE, dt, titleM, 195, titleY() + Math.sin(st.t * T.floatHz * TAU) * T.floatPx, titleK * st.titleS, input.isDown, input.x, input.y);
    const wave = 0.6 + 0.4 * Math.sin(st.t * 5.4);
    B.play.breathe = st.first || challenge ? TUNE.play.pulse : 0;
    B.play.glow = st.first || challenge ? TUNE.play.glow * wave : 0;
    // a streak at risk, or a Daily just opened and never played: the Daily card is the one that calls (PLAY stays the
    // big primary, but still)
    const risk = (view.dailyRisk || view.dailyNew) && !challenge;
    B.daily.breathe = risk ? TUNE.card.riskPulse : 0;
    B.daily.glow = risk ? TUNE.card.riskGlow * wave : 0;
    // the locked Daily shaking no
    const SK = TUNE.shake;
    if (view.shakeT >= 0) {
      view.shakeT += dt;
      if (view.shakeT > SK.dur) { view.shakeT = -1; view.shakeDx = 0; }
      else view.shakeDx = Math.sin(view.shakeT * SK.hz) * SK.amp * (1 - view.shakeT / SK.dur);
    }
    updateClub(dt);
    if (st.t >= view.tickAt) tick();
    if (wv.dirty) walletView();
    // the booster strip owns the news line once the ceremonies and news are done
    const lineFree = !st.unlockQ.length && view.unlockA < 0.02 && nw.i >= nw.n;
    const strip = wv.strip && lineFree;
    if (strip !== wv.stripShown) {
      wv.stripShown = strip;
      for (let i = 0; i < STRIP.length; i++) {
        const b = STRIP[i];
        b.hidden = !strip;
        if (strip) { b.pop = 0; tweens.killTarget(b); spring(b, 'pop', SP_STRIP); }
      }
    }
    for (let i = 0; i < STRIP.length; i++) STRIP[i].glow = STRIP[i].on ? 0.45 + 0.25 * Math.sin(st.t * 4) : 0;
    if (LATE.n > 0 && scenes.top === home && nw.n < 4) pushLate();
    // idle: the shop bakes one card of its Deals / Outfits / Gems a frame while nothing else is happening here
    if (lineFree && st.t > 1.2 && !scenes.transitioning && scenes.top === home) prebakeStep();
    // the Starter Pack popup: the one modal offer, once (wallet caps), after the ceremonies and news, never over a dare
    if (!wv.offerDone && lineFree && !scenes.transitioning && scenes.top === home) {
      if (wv.offerAt <= 0) wv.offerAt = st.t + TUNE.offerAfter;
      else if (st.t >= wv.offerAt) {
        wv.offerDone = true;
        if (wallet.offerDue('starter', { priceReady: canSell('mb_starter_pack') })) {
          wallet.offerShown('starter');
          scenes.push('shop', { popup: true, sheet: 'mb_starter_pack', from: 'home' });
        }
      }
    }
    if (layoutH !== stage.h) layout();
  },

  render(ctx) {
    const W = stage.w, H = stage.h, t = st.t;
    if (world) world.drawLobby(ctx);
    else { ctx.fillStyle = TUNE.night; ctx.fillRect(-24, -24, W + 48, H + 48); }
    drawClubBack(ctx);
    // a decor reveal's warm spotlight over the new piece, fading out
    if (nw.glow > 0.01) {
      const g = easeIndex.outQuad(nw.glow);
      draw.glow(ctx, nw.fx, nw.fy, nw.fr, '#ffd27a', TUNE.news.glowA * g);
      draw.glow(ctx, nw.fx, nw.fy, nw.fr * 0.45, '#fff3c4', TUNE.news.glowA * 0.6 * g);
    }
    // scrim under the buttons so the facade never fights the labels
    const sTop = B.play.y - TUNE.play.h / 2 - TUNE.scrim.from;
    if (!scrimG || scrimH !== H) {
      scrimG = draw.gradient(ctx, 0, sTop, 0, H, [[0, 'rgba(11,10,34,0)'], [0.42, 'rgba(11,10,34,0.62)'], [1, 'rgba(8,7,26,' + TUNE.scrim.alpha + ')']]);
      scrimH = H;
    }
    ctx.fillStyle = scrimG; ctx.fillRect(-24, sTop, W + 48, H - sTop + 24);
    // title
    const T = TUNE.title, ty = titleY() + Math.sin(t * T.floatHz * TAU) * T.floatPx, s = st.titleS;
    if (s > 0.01) {
      draw.glow(ctx, W / 2, ty, T.glowR, T.neon, T.glowA * st.lit * clamp(s, 0, 1));
      drawMarquee(ctx, ty, s);
      SPR.anchor = AN_C; SPR.scale = s; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1;
      draw.sprite(ctx, draw.cached(titleKey, titleW, titleH, bakeTitle), W / 2, ty, SPR);
      if (st.lit > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        SPR.alpha = st.lit;
        draw.sprite(ctx, draw.cached(neonKey, titleW, titleH, bakeNeon), W / 2, ty, SPR);
        ctx.restore();
      }
      drawLogoEye(ctx, W / 2, ty, titleK * s, titleM, EYE.x, EYE.y, EYE.blink);
    }
    // the dare from a challenge link, above PLAY
    if (dareStr) {
      const a = clamp(B.play.pop, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      drawPill(ctx, 195, B.play.y - TUNE.play.h / 2 - 30, 346, 36, dareStr, PILL_DARE);
      ctx.restore();
    }
    const sdx = view.shakeDx;
    B.daily.x += sdx;                                     // the shake offsets this draw only
    btns.draw(ctx, t);
    B.daily.x -= sdx;
    // badges riding on the buttons
    const d = B.daily, ds = d.pop;
    if (ds > 0.3 && !view.dailyLocked) {
      const rtl = i18n.isRTL, edge = rtl ? -1 : 1;
      if (view.streak > 0) {
        ctx.save(); ctx.translate(d.x + edge * (d.w / 2 - 22) * ds, d.y - d.h / 2 * ds - 4); ctx.rotate(0.08 * edge); ctx.scale(ds, ds);
        drawPill(ctx, 0, 0, 52, 26, view.streakStr, PILL_FLAME);
        ctx.restore();
      }
      if (view.dailyDone) {
        const bx = d.x - edge * (d.w / 2 - 6) * ds, by = d.y - d.h / 2 * ds + 2;
        drawBadge(ctx, bx, by, 26 * ds, '', BADGE_OK);
        drawGlyph(ctx, 'check', bx, by, 15 * ds, GLYPH_O);
      }
      // a Daily never played yet: the velvet NEW sticker on its corner, wobbling with the card's pulse
      if (view.dailyNew && !challenge) {
        const C = TUNE.card, s = ds * (1 + 0.06 * Math.max(0, Math.sin(t * 5.4)));
        ctx.save(); ctx.translate(d.x + sdx + edge * (d.w / 2 - 20) * ds, d.y - d.h / 2 * ds - 3); ctx.rotate(edge * (C.newRot + 0.05 * Math.sin(t * 2.7))); ctx.scale(s, s);
        drawPill(ctx, 0, 0, C.newW, C.newH, view.newStr, PILL_NEW);
        ctx.restore();
      }
    }
    const bb = B.band;
    if (view.bandN > 0 && bb.pop > 0.3) drawBadge(ctx, bb.x + 19 * bb.pop, bb.y - 19 * bb.pop, 22 * bb.pop, view.bandStr, BADGE_N);
    // the Shop pill: a gold dot (gift ready / new Star Road reward), else a jar (piggy full); the Club Pass days left
    const sb = B.shop, sp = sb.pop;
    if (sp > 0.3) {
      const rtl = i18n.isRTL, ex = (rtl ? -1 : 1) * (sb.w / 2 - 6) * sp, ey = sb.y - (sb.h / 2 - 2) * sp;
      if (wv.dot) drawBadge(ctx, sb.x + ex, ey, 18 * sp, '!', BADGE_DOT);
      else if (wv.piggy) { drawBadge(ctx, sb.x + ex, ey, 24 * sp, '', BADGE_DOT); drawArt(ctx, 'jar', sb.x + ex, ey, 20 * sp); }
      if (wv.pass > 0) { const px = sb.x - ex; drawBadge(ctx, px, ey, 24 * sp, wv.passStr, BADGE_PASS); }
    }
    // first launch: a sticker tag + the pointing glove on PLAY
    if (st.first && !challenge && B.play.pop > 0.5) {
      const p = B.play, rtl = i18n.isRTL, edge = rtl ? -1 : 1;
      ctx.save(); ctx.translate(p.x + edge * (p.w / 2 - 34), p.y - p.h / 2 - 6 + Math.sin(t * 4) * 2); ctx.rotate(0.1 * edge);
      drawPill(ctx, 0, 0, view.firstW, 28, view.firstStr, PILL_FIRST);
      ctx.restore();
      const G = TUNE.glove;
      GLOVE_O.rot = -edge * G.rot;                         // tilted toward the button, the hand resting off its trailing end
      drawGlove(ctx, p.x + edge * (p.w / 2 - G.inset), p.y + G.dy, G.size, t, GLOVE_O);
    }
    // lobby unlock banner, or the empty-band hint on a first visit
    if (world && view.unlockA > 0.02) {
      const w = world.window;
      lbl.unlock.draw(ctx, W / 2, w.y + w.h + 28, view.unlockA, 0.8 + 0.2 * view.unlockA);
    } else if (world && nw.i < nw.n && NEWS[nw.i].at >= 0) {
      // the news line: a brass reward pill under the window (the Club Pass gift: its card)
      const w = world.window, it = NEWS[nw.i];
      if (nw.a > 0.01) {
        if (it.kind === 'passgift') drawPassGift(ctx, W / 2, w.y + w.h + 28, nw.a, nw.s);
        else {
          NEWS_O.icon = it.icon; NEWS_O.alpha = nw.a;
          ctx.save(); ctx.translate(W / 2, w.y + w.h + 28); ctx.scale(nw.s, nw.s);
          drawPill(ctx, 0, 0, it.w, TUNE.news.pillH, it.str, NEWS_O);
          ctx.restore();
        }
      }
    } else if (world && view.bandN === 0 && !st.unlockQ.length) {
      const w = world.window;
      lbl.empty.draw(ctx, W / 2, w.y + w.h + 26, clamp(st.t - 0.6, 0, 0.9));
    }
    drawFlyH(ctx);
  },

  onInput(evt, d) {
    if (btns.onInput(evt, d)) return true;
    if (evt === 'down' && newsHit(d.x, d.y, 'piggy') && !scenes.transitioning) {
      party.sfx.plate();
      scenes.push('shop', { popup: true, sheet: 'mb_piggy_break', from: 'home' });
      return true;
    }
    // the Starter Pack's reminder opens its popup sheet; the Club Pass gift card collects
    if (evt === 'down' && newsHit(d.x, d.y, 'starter') && !scenes.transitioning) {
      party.sfx.plate();
      scenes.push('shop', { popup: true, sheet: 'mb_starter_pack', from: 'home' });
      return true;
    }
    if (evt === 'down' && newsHit(d.x, d.y, 'passgift')) {
      if (!PG.collected) { party.sfx.plate(); passGiftCollect(195, newsY()); PG.collectAt = nw.t; }
      return true;
    }
    const th = titleM.h * titleK * 0.5;
    if (evt === 'down' && d.y < titleY() + th && d.y > titleY() - th) {
      spring(st, 'titleS', SP_TITLE_POP);
      blinkLogoEye(EYE);
      st.flickT = 0;
      particles.emit('sparkle', d.x, d.y, OV_SPARK);
      post.pulse(PULSE);
      party.sfx.plate();
      return true;
    }
    return false;
  },
};

stage.onResize(() => { scrimG = null; layoutH = -1; });
i18n.onChange(() => { if (st.active) refresh(); });
