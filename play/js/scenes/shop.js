// shop.js: the Monster Bouncer shop ('shop', docs/MONETIZATION.md §6.1 / §6.2 / §9.1), an overlay pushed over home,
// result, collection or play's Reopen panel: scenes.push('shop', { tab, sheet, popup, from, arm }). A full-height sticker
// sheet (brass-rimmed indigo panel) slides up over the dimmed scene: the round close button top-LEFT (the top-right
// 100 x 100 stays empty, as on every menu), the title, the gem counter (it rolls up as bought gems fly into it; its '+'
// opens the Gems tab), six tabs that between them sell every one of the 22 catalog products (Deals, at most 5 cards
// (docs/MONETIZATION.md §6.1): the Free Gift when ready, the ONE personal offer (the Starter Pack while unowned, else the
// Pro Doorman Pack once wallet.dealOpen, else a full Piggy, else Club Owner), VIP Rope while unowned, Club Pass with its
// days left, and one theme bundle that rotates daily; Gems: the packs 2-up, ONE tag in each card's top-trailing corner
// (the green 'First buy: x2' while that pack still pays double (FIRST_BUY: only the 3 small packs), else its brass
// bonus), the 'Recommended' Chest, the Vault as a full-width hero row with the computed Best value, then the Piggy (its
// 'Best value when full' line) and the Pro Pack when Deals does not hold them;
// Outfits: 6 outfit themes with the 5 members dancing live in each (actor.js, spec.outfit; a member not in the band yet
// dances dimmed and its chip is a lock that says when it joins) and a chip per look: gem price / Wear / a check while
// worn, the Whole-set button at 96 x missing looks (with 'Includes n members who join later' under it), then the 5
// bundles and the Starter-only Rock Star looks; Party: Club Owner, the Crystal Street Set, then party themes, ropes,
// doors and IN / OUT buttons (an OUT + IN pair) as tiles, each opening an item sheet with a
// LIVE preview (a private world.js in lobby mode for themes, street mode for ropes / doors, icons.drawPlate for plates;
// world.setLook / party.setTheme when the art agent provides them) and, over the lobby, a 3 s 'Try it' on home's own
// world (world.previewLook; a round play button on the preview's corner); Boosters: X-Ray / Slow-Mo / Second Chance
// singles and 5-packs + the Booster Bundle + the Mega Booster Bundle; Free: the Daily Gift, how play earns gems, the Star
// Road (each step's Gold Star Road reward beside it on a gold disc, behind a small lock until owned, and the Gold strip
// with its buy button), streak milestones and the 20 Doorman Medals (ready and nearest first, trophies by tier)) and a
// fixed footer: Restore Purchases (Apple requires it), Terms · Privacy and the one-line legal line (prices in local
// currency, payment through Apple / Google Play; 'Demo, no charge' on the mock provider; 'Purchases are in the app' on
// the public web build).
// Money: native prices are payments.priceString only ('…' while loading, a disabled button until canSell); a card's price
// button buys at once (the store's own sheet is the confirmation), a tap on the card body opens the product's sheet
// (exact contents + price); the grant plays: gems fly from the button into the counter (pitch ladder per gem), confetti,
// the gold stinger. Value anchors are computed one way, at the shop's own gem prices and only for what this player gets
// ('Worth N gems', 'Worth N gems to you' once some items are owned; what a purchase pays back is said with its amount,
// only when it is > 0). Gem prices take two taps (the button turns green and pulses: 'Confirm 💎 200'; a second tap
// sooner than TUNE.confirmDwell after the first never spends, so a double tap cannot skip it) and an item sheet shows
// the '≈ $' reference at the entry pack's rate (payments.gemRef: mb_gems_100, MONETIZATION §2.2) under its button, the
// theme bundle as a brass button with its 'Worth N gems' tag under that; a band look still missing counts at the Whole-set
// price (SET_LOOK) in every worth. Not enough gems opens a 'Not enough gems' sheet that offers the theme bundle holding
// the item (when unowned) with the cheapest covering store product beside it, else that product alone (the cheapest gem
// pack that covers it counting its first-buy x2, or the Starter Pack / the Piggy when they cover it for less) and, once a
// pack is bought, finishes the gem purchase that was short (the sheet says so).
// popup: true shows only the sheet over the scene below (home's Starter offer, the booster buy sheet of
// home's strip, result's See VIP) and closing it pops the shop; its gem counter shows only on gem-priced sheets (or while
// gems fly), clipped to the sheet's top edge. The shop draws in screen space (play's Shut Down dolly zoom never reaches it;
// only the camera punch / shake does). Theme stages (bundle, outfit and Starter cards, their sheets) are baked from the
// real party-room recipe (cosmetics-art THEMES[theme].room + its wall motif, deco, chandelier and front props). 'Try it'
// in an item sheet reopens that sheet when the 3 s preview ends. Everything is drawn in code in the GAME-SPEC §5 sticker
// style (exports paintGem / drawGem / drawArt for home, result and collection). Only the visible cards draw (and only
// they keep live actors); per-frame paths reuse option objects. The home.js UI kit is used lazily (init()), because
// home.js imports this module back. Contract: economy.js wallet, payments.js, catalog.js (MONETIZATION.md §11).
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { draw } from '../core/draw.js';
import { text } from '../core/text.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens } from '../core/tween.js';
import { camera } from '../core/camera.js';
import { particles } from '../core/particles.js';
import { post } from '../core/post.js';
import { TAU, clamp, easeIndex } from '../core/math.js';
import { createActor } from '../game/actor.js';
import { createWorld } from '../game/world.js';
import { drawButton, drawGlyph, drawPill, drawBadge, drawPlate, drawStrikeLamp } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { PRODUCTS, OUTFIT_THEMES, BOOSTERS, STAR_ROAD, GOLD_ROAD, STREAK, GIFT, PIGGY, PASS, FIRST_BUY, SET_LOOK, itemById, itemsBySlot } from '../game/catalog.js';
import { wallet } from '../game/economy.js';
import { providerName, canSell, priceString, productShown, loadPrices, gemRef, buy, restore, onPrices, onPurchase, busy as payBusy } from '../game/payments.js';
import * as COSM from '../game/cosmetics-art.js';
import { DICT } from '../game/strings-shopui.js';
import { pluralCat, plural } from '../game/strings.js';
import { save } from '../core/save.js';
import { HOUSE, SPECIES, createLabel, createButtons, createPanel, createToast, measure, beat, fontGen, memberSpec, playTop } from './home.js';

i18n.load(DICT);

const TUNE = {
  dim: 0.76, popupDim: 0.7,
  // the big sheet: inset from the screen edges; header rows measured from its top
  panel: { side: 8, top: 4, bottom: 6, radius: 30, color: '#1f1c4c' },
  head: { title: 30, counter: 74, tabs: 122, content: 152 },
  counter: { w: 158, h: 40, font: 21, plus: 26 },
  // the smallest text anywhere in the shop is TUNE.minText (12.5 units: ~11.5 px at 360 wide); tab labels 13, an
  // inactive tab's label in lilac at offA
  minText: 12.5,
  tabs: { h: 52, font: 13, glyph: 22, ind: '#ffb347', off: '#e9e4ff', offA: 0.9 },
  // the footer: Restore + Terms · Privacy on one row (restoreY below the list), the legal line on one row (legalY)
  foot: { h: 60, restoreW: 200, restoreH: 36, font: 12.5, restoreY: 21, legalY: 48 },
  content: { x: 20, w: 350, gap: 12, padTop: 6, padBottom: 18, fadeH: 16 },
  scroll: { friction: 4.2, rubber: 0.38, back: 12, minFling: 40, start: 8 },
  sheet: { w: 346, radius: 28, color: '#262357' },
  // a gem price arms on the first tap for confirmSec; the second tap spends only once confirmDwell has passed since the
  // arming (a double tap never skips the confirm)
  confirmSec: 3, confirmDwell: 0.3,
  // a content deal (Club Owner, the Crystal Street Set) leaves the shop when what it still holds for this player (gems of
  // the items left + gems it would pay back) falls under this: Club Owner's 7,000 = what its price ($49.99) buys as gems
  // in the 7,000 pack, so it never sits in front of a buyer as a worse deal than the pack at the same price; Deals holds
  // at most dealsMax cards; the 'Recommended' pack
  minWorth: { mb_club_owner: 7000, mb_set_crystal: 500 }, dealsMax: 5, popular: 'mb_gems_1200',
  // the card perk lists (VIP, Club Owner, Gold Star Road, Club Pass): one font size per list, shrunk together from size
  // to min to fit w; a line that still does not fit wraps to 2 lines (pitch2); x = the list's text column
  perk: { w: 180, size: 13, min: 12.5, pitch: 22, pitch2: 36 },
  fly: { min: 5, max: 22, per: 30, dur: [0.55, 0.85], stagger: 0.04, arc: 110, size: 22 },
  // Try it: the lobby shows the look for trySec; its tag (with a ring that runs down the seconds) sits tagUp above
  // home's PLAY button (home.playTop), and a tap on it opens that product's sheet
  trySec: 3, tryTag: { h: 44, up: 30, ring: 15 },
  toastDy: 36,                     // the full shop's toast: this far under the gem counter's centre
  // the item sheet's live preview: rope = the two-post run x1..x2 (ropeL / ropeR world units of street beside it, so the
  // third post stays out of view; centred ropeDy under rope.top), door = a portrait close-up (the leaf + doorUp of fanlight
  // above + doorDown of street, doorSide of wall each side, never past the world's 24-unit overscan), a party theme = the
  // party window + winPad (centred winUp above its middle: the facade top + sky in view)
  preview: { w: 304, h: 200, ropeDy: 20, ropeL: 16, ropeR: 14, doorUp: 40, doorDown: 16, doorSide: 30, overscan: 22, winUp: 24, winPad: 120 },
  links: { terms: 'https://alwaleed305xx-ui.github.io/monster-bouncer-site/terms.html',
    privacy: 'https://alwaleed305xx-ui.github.io/monster-bouncer-site/privacy.html' },
  dance: { tempo: 108 },
  vibrate: 8,
};
// the UI kit palette (home.js UI_ACCENT / UI_SECONDARY, mirrored here as literals: home.js imports this module back)
const INK = '#1d1840', CREAM = '#fff4dc', LILAC = '#e9e4ff', BRASS = '#d9a441', AMBER = '#ffb347', GOLD = '#ffc93c', GO = '#2f9e5e';
const BUNDLE_BTN = '#a8721e';      // the item sheet's theme-bundle button: brass (the better deal), cream text, gold rim
const VELVET = '#b3203a', INDIGO = '#2a2760', SOFT = 'rgba(233,228,255,0.78)', DIMTXT = 'rgba(233,228,255,0.6)', MINT = '#4fe3b0';
const TAB_IDS = ['deals', 'gems', 'looks', 'club', 'boosters', 'free'];
const TAB_ART = { deals: 'tag', gems: 'gem', looks: 'bow', club: 'house', boosters: 'bolt', free: 'gift' };
const BOOSTER_IDS = ['xray', 'slowmo', 'second'];
const BOOSTER_ART = { xray: 'glasses', slowmo: 'snail', second: 'heart' };
const SLOT_ORDER = ['club', 'rope', 'door', 'plate'];
// the theme bundles in PRODUCTS order (every paid party theme but Beach, a Star Road reward)
const BUNDLE_THEMES = ['neon', 'desert', 'royal', 'space', 'spooky'];
// the content deals beside the bundles (catalog.js): the Crystal Street Set's items, the Club Owner's party themes
const CRYSTAL_SET = 'mb_set_crystal', GOLD_PID = GOLD_ROAD.product, PRO_PID = 'mb_pro_pack', OWNER_PID = 'mb_club_owner', MEGA_PID = 'mb_booster_mega';

// ================================================================ art (sticker style, baked)
function lwOf(s, k) { return Math.max(1.4, s * (k || 0.06)); }
function sparkle(c, x, y, r, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.closePath(); c.fill();
}
function gemPath(c, x, y, s) {
  const w = s * 0.56, tw = s * 0.3, top = y - s * 0.38, gir = y - s * 0.1, bot = y + s * 0.5;
  c.beginPath(); c.moveTo(x - tw, top); c.lineTo(x + tw, top); c.lineTo(x + w, gir); c.lineTo(x, bot); c.lineTo(x - w, gir); c.closePath();
}
const GEM_HUES = { aqua: ['#d4f8ff', '#3cc8f0', '#1563c0'], violet: ['#efe0ff', '#a77bff', '#5a2fbf'] };
// paintGem(c, x, y, s, hue): a brilliant-cut gem s tall (aqua by default), ink outline, a white glint
export function paintGem(c, x, y, s, hue) {
  const H = GEM_HUES[hue] || GEM_HUES.aqua, w = s * 0.56, tw = s * 0.3, top = y - s * 0.38, gir = y - s * 0.1, bot = y + s * 0.5;
  c.save();
  c.fillStyle = 'rgba(6,4,22,0.32)'; gemPath(c, x + s * 0.04, y + s * 0.07, s); c.fill();
  gemPath(c, x, y, s);
  c.fillStyle = draw.gradient(c, 0, top, 0, bot, [[0, H[0]], [0.36, H[1]], [1, H[2]]]); c.fill();
  c.save(); gemPath(c, x, y, s); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath(); c.moveTo(x - tw, top); c.lineTo(x + tw, top); c.lineTo(x + w, gir); c.lineTo(x - w, gir); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.beginPath(); c.moveTo(x - tw * 0.55, top); c.lineTo(x + tw * 0.55, top); c.lineTo(x + tw * 0.3, gir); c.lineTo(x - tw * 0.3, gir); c.closePath(); c.fill();
  c.fillStyle = 'rgba(10,16,80,0.24)'; c.beginPath(); c.moveTo(x, gir); c.lineTo(x + w, gir); c.lineTo(x, bot); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(x - w, gir); c.lineTo(x - tw * 0.3, gir); c.lineTo(x, bot); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = Math.max(0.7, s * 0.025);
  c.beginPath(); c.moveTo(x - w, gir); c.lineTo(x + w, gir); c.moveTo(x - tw * 0.3, gir); c.lineTo(x, bot); c.moveTo(x + tw * 0.3, gir); c.lineTo(x, bot); c.stroke();
  c.restore();
  gemPath(c, x, y, s); c.lineJoin = 'round'; c.lineWidth = lwOf(s, 0.075); c.strokeStyle = INK; c.stroke();
  sparkle(c, x - w * 0.4, top + s * 0.13, s * 0.16, '#ffffff');
  c.restore();
}
function bakeGemS(c, w, h) { paintGem(c, w / 2, h / 2, 26); }
function bakeGemL(c, w, h) { paintGem(c, w / 2, h / 2, 72); }
const GSPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
// drawGem(ctx, x, y, size, alpha, rot): the gem sprite (two bakes: small UI and big), scaled to size
export function drawGem(ctx, x, y, size, alpha, rot) {
  const big = size > 32, s = big ? 72 : 26, box = Math.ceil(s * 1.3);
  const cv = draw.cached(big ? 'shop.gem.l' : 'shop.gem.s', box, box, big ? bakeGemL : bakeGemS);
  GSPR.scale = size / s; GSPR.alpha = alpha === undefined ? 1 : alpha; GSPR.rot = rot || 0;
  draw.sprite(ctx, cv, x, y, GSPR);
}

function rrect(x, y, w, h, r) { return function (cc) { draw.roundRect(cc, x, y, w, h, r); }; }
function stk(c, path, fill, s, bounds, hi, sh) {
  draw.sticker(c, path, { fill: fill, outline: INK, lineWidth: lwOf(s, 0.055), highlight: hi === undefined ? 0.28 : hi, shadow: sh === undefined ? 0.2 : sh, bounds: bounds });
}
function paintGift(c, x, y, s) {
  const w = s * 0.74, h = s * 0.44, bx = x - w / 2, by = y - s * 0.06, lw2 = w * 1.1, lh = s * 0.17, ly = by - lh + s * 0.02;
  draw.shadowBlob(c, x, by + h + s * 0.02, w * 0.5, s * 0.07, 0.35);
  stk(c, rrect(bx, by, w, h, s * 0.05), '#e8455e', s);
  stk(c, rrect(x - s * 0.075, by, s * 0.15, h, 1), '#ffd166', s, undefined, 0.2, 0.1);
  stk(c, rrect(x - lw2 / 2, ly, lw2, lh, s * 0.05), '#ff6b80', s);
  stk(c, rrect(x - s * 0.085, ly, s * 0.17, lh, 1), '#ffd166', s, undefined, 0.2, 0.1);
  for (let i = -1; i <= 1; i += 2) {
    stk(c, cc => { cc.beginPath(); cc.ellipse(x + i * s * 0.14, ly - s * 0.07, s * 0.15, s * 0.09, i * 0.5, 0, TAU); }, '#ffd166', s, [x + i * s * 0.14 - s * 0.15, ly - s * 0.16, s * 0.3, s * 0.18]);
  }
  stk(c, cc => draw.circle(cc, x, ly - s * 0.03, s * 0.065), '#ffb347', s);
}
function paintJar(c, x, y, s) {
  const r = s * 0.34, cy = y + s * 0.04;
  draw.shadowBlob(c, x, cy + r * 1.02, r * 0.85, s * 0.06, 0.4);
  for (let i = -1; i <= 1; i += 2) stk(c, cc => draw.ellipse(cc, x + i * r * 0.5, cy + r * 0.86, r * 0.24, r * 0.16), '#8a63d8', s);
  for (let i = -1; i <= 1; i += 2) {
    const hx = x + i * r * 0.62, hy = cy - r * 0.7;
    stk(c, cc => { cc.beginPath(); cc.moveTo(hx - r * 0.2, hy + r * 0.16); cc.quadraticCurveTo(hx + i * r * 0.06, hy - r * 0.42, hx + i * r * 0.18, hy - r * 0.34); cc.lineTo(hx + r * 0.2, hy + r * 0.12); cc.closePath(); }, '#ffd166', s, [hx - r * 0.2, hy - r * 0.42, r * 0.4, r * 0.58]);
  }
  stk(c, cc => draw.circle(cc, x, cy, r), '#a985f0', s, undefined, 0.36, 0.26);
  // the coin slot with a gold coin going in
  stk(c, cc => draw.circle(cc, x, cy - r * 0.98, r * 0.24), '#ffc93c', s, undefined, 0.4, 0.15);
  c.fillStyle = '#2a1650'; draw.roundRect(c, x - r * 0.34, cy - r * 0.86, r * 0.68, r * 0.13, r * 0.06); c.fill();
  // face
  for (let i = -1; i <= 1; i += 2) {
    stk(c, cc => draw.circle(cc, x + i * r * 0.34, cy - r * 0.12, r * 0.22), '#ffffff', s, undefined, 0, 0.1);
    c.fillStyle = INK; c.beginPath(); c.arc(x + i * r * 0.34 + r * 0.05, cy - r * 0.08, r * 0.1, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + i * r * 0.34 + r * 0.02, cy - r * 0.13, r * 0.035, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,120,170,0.5)'; c.beginPath(); c.ellipse(x + i * r * 0.62, cy + r * 0.22, r * 0.14, r * 0.08, 0, 0, TAU); c.fill();
  }
  c.strokeStyle = INK; c.lineWidth = lwOf(s, 0.04); c.lineCap = 'round';
  c.beginPath(); c.arc(x, cy + r * 0.2, r * 0.18, 0.2, Math.PI - 0.2); c.stroke();
}
function paintTicket(c, x, y, s) {
  const w = s * 0.86, h = s * 0.48, x0 = -w / 2, y0 = -h / 2, n = h * 0.18;
  c.save(); c.translate(x, y); c.rotate(-0.12);
  const path = cc => {
    cc.beginPath(); cc.moveTo(x0 + 6, y0); cc.lineTo(x0 + w - 6, y0); cc.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + 6);
    cc.lineTo(x0 + w, -n); cc.arc(x0 + w, 0, n, -Math.PI / 2, Math.PI / 2, true); cc.lineTo(x0 + w, y0 + h - 6);
    cc.quadraticCurveTo(x0 + w, y0 + h, x0 + w - 6, y0 + h); cc.lineTo(x0 + 6, y0 + h); cc.quadraticCurveTo(x0, y0 + h, x0, y0 + h - 6);
    cc.lineTo(x0, n); cc.arc(x0, 0, n, Math.PI / 2, -Math.PI / 2, true); cc.lineTo(x0, y0 + 6); cc.quadraticCurveTo(x0, y0, x0 + 6, y0); cc.closePath();
  };
  draw.shadowBlob(c, 0, h / 2 + s * 0.06, w * 0.45, s * 0.06, 0.3);
  draw.sticker(c, path, { fill: '#ffc93c', outline: INK, lineWidth: lwOf(s, 0.05), highlight: 0.35, shadow: 0.22, bounds: [x0, y0, w, h] });
  c.strokeStyle = 'rgba(122,74,16,0.7)'; c.lineWidth = lwOf(s, 0.025);
  for (let yy = y0 + h * 0.16; yy < y0 + h * 0.86; yy += h * 0.14) { c.beginPath(); c.moveTo(x0 + w * 0.27, yy); c.lineTo(x0 + w * 0.27, yy + h * 0.07); c.stroke(); }
  c.fillStyle = '#b3203a'; draw.star(c, w * 0.12, 0, h * 0.28, 0.48, 5); c.fill();
  c.lineWidth = lwOf(s, 0.03); c.strokeStyle = INK; c.stroke();
  c.restore();
}
function paintCrown(c, x, y, s) {
  const w = s * 0.4, yb = y + s * 0.2, yt = y - s * 0.26;
  const path = cc => {
    cc.beginPath(); cc.moveTo(x - w, yb); cc.lineTo(x - w * 1.06, yt + s * 0.08); cc.lineTo(x - w * 0.48, y - s * 0.04); cc.lineTo(x, yt);
    cc.lineTo(x + w * 0.48, y - s * 0.04); cc.lineTo(x + w * 1.06, yt + s * 0.08); cc.lineTo(x + w, yb); cc.closePath();
  };
  draw.shadowBlob(c, x, yb + s * 0.06, w, s * 0.06, 0.3);
  draw.sticker(c, path, { fill: '#ffc93c', outline: INK, lineWidth: lwOf(s, 0.055), highlight: 0.4, shadow: 0.25, bounds: [x - w * 1.06, yt, w * 2.12, yb - yt] });
  stk(c, rrect(x - w * 1.02, yb - s * 0.11, w * 2.04, s * 0.13, s * 0.03), '#e8a72a', s, undefined, 0.3, 0.2);
  const tips = [x - w * 1.06, yt + s * 0.08, x, yt, x + w * 1.06, yt + s * 0.08];
  for (let i = 0; i < 6; i += 2) stk(c, cc => draw.circle(cc, tips[i], tips[i + 1], s * 0.055), '#fff3c4', s, undefined, 0.5, 0.1);
  stk(c, cc => draw.circle(cc, x, yb - s * 0.045, s * 0.045), '#e8455e', s, undefined, 0.5, 0.1);
  stk(c, cc => draw.circle(cc, x - w * 0.55, yb - s * 0.045, s * 0.035), '#3cc8f0', s, undefined, 0.5, 0.1);
  stk(c, cc => draw.circle(cc, x + w * 0.55, yb - s * 0.045, s * 0.035), '#3cc8f0', s, undefined, 0.5, 0.1);
}
function paintBow(c, x, y, s) {
  const w = s * 0.44, h = s * 0.3;
  for (let i = -1; i <= 1; i += 2) {
    stk(c, cc => { cc.beginPath(); cc.moveTo(x, y); cc.quadraticCurveTo(x + i * w * 0.5, y - h * 1.1, x + i * w, y - h * 0.8); cc.quadraticCurveTo(x + i * w * 1.12, y, x + i * w, y + h * 0.8); cc.quadraticCurveTo(x + i * w * 0.5, y + h * 1.1, x, y); cc.closePath(); },
      '#e8455e', s, [Math.min(x, x + i * w * 1.12), y - h, w * 1.12, h * 2]);
  }
  stk(c, rrect(x - s * 0.09, y - s * 0.12, s * 0.18, s * 0.24, s * 0.06), '#ff6b80', s);
  c.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = -1; i <= 1; i += 2) { c.beginPath(); c.arc(x + i * w * 0.55, y - h * 0.25, s * 0.035, 0, TAU); c.fill(); }
}
function paintHouse(c, x, y, s) {
  const w = s * 0.74, h = s * 0.56, bx = x - w / 2, by = y - s * 0.18;
  draw.shadowBlob(c, x, by + h + s * 0.02, w * 0.55, s * 0.06, 0.35);
  stk(c, rrect(bx, by, w, h, s * 0.04), '#4a43a8', s);
  stk(c, rrect(bx - s * 0.04, by - s * 0.1, w + s * 0.08, s * 0.12, s * 0.03), '#d9a441', s, undefined, 0.35, 0.2);
  // the glowing arched party window + the brass door
  const aw = w * 0.5, ah = h * 0.48, ax = x - aw / 2, ay = by + h * 0.12;
  stk(c, cc => { cc.beginPath(); cc.moveTo(ax, ay + ah); cc.lineTo(ax, ay + aw / 2); cc.arc(x, ay + aw / 2, aw / 2, Math.PI, 0); cc.lineTo(ax + aw, ay + ah); cc.closePath(); }, '#ffb347', s, [ax, ay, aw, ah], 0.45, 0.1);
  stk(c, rrect(x - w * 0.12, by + h * 0.66, w * 0.24, h * 0.34, s * 0.02), '#8a5a14', s, undefined, 0.2, 0.2);
  c.fillStyle = '#fff3c4';
  for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(bx + w * (0.1 + i * 0.2), by - s * 0.04, s * 0.022, 0, TAU); c.fill(); }
}
function paintTag(c, x, y, s) {
  const w = s * 0.62, h = s * 0.42, x0 = x - w / 2 + s * 0.06, y0 = y - h / 2;
  c.save(); c.translate(x, y); c.rotate(-0.35); c.translate(-x, -y);
  const path = cc => { cc.beginPath(); cc.moveTo(x0, y0); cc.lineTo(x0 + w, y0); cc.lineTo(x0 + w, y0 + h); cc.lineTo(x0, y0 + h); cc.lineTo(x0 - s * 0.2, y); cc.closePath(); };
  draw.sticker(c, path, { fill: '#ffb347', outline: INK, lineWidth: lwOf(s, 0.06), highlight: 0.35, shadow: 0.2, bounds: [x0 - s * 0.2, y0, w + s * 0.2, h] });
  c.fillStyle = INK; c.beginPath(); c.arc(x0 + s * 0.02, y, s * 0.045, 0, TAU); c.fill();
  c.fillStyle = '#ffffff'; draw.star(c, x0 + w * 0.55, y, h * 0.3, 0.48, 5); c.fill();
  c.lineWidth = lwOf(s, 0.03); c.strokeStyle = INK; c.stroke();
  c.restore();
}
// the X-Ray Glasses: a chunky violet frame (two wide rounded lenses on a top bar, a bridge, temple arms folded back at
// the outer corners) with glowing pink x-ray lenses, a dark lens rim and a diagonal glare: reads as glasses at 24 px
// a rounded rect ADDED to the current path (no beginPath; clockwise, so several of them fill as one union)
function rrPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function paintGlasses(c, x, y, s) {
  const lw = s * 0.31, lh = s * 0.26, dx = s * 0.225, cy = y + s * 0.03, fr = s * 0.042, rr = lh * 0.42;
  const lens = (cc, lx, g) => rrPath(cc, lx - lw / 2 - g, cy - lh / 2 - g, lw + g * 2, lh + g * 2, rr + g);
  c.lineCap = 'round'; c.lineJoin = 'round';
  draw.shadowBlob(c, x, cy + lh * 0.5 + s * 0.1, s * 0.42, s * 0.05, 0.3);
  // temple arms, behind the frame: out from the top outer corners, folded back
  for (let i = -1; i <= 1; i += 2) {
    const ox = x + i * (dx + lw / 2 + fr * 0.6), oy = cy - lh * 0.32;
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + i * s * 0.1, oy - s * 0.035); c.lineTo(ox + i * s * 0.14, oy + s * 0.12);
    c.lineWidth = lwOf(s, 0.12); c.strokeStyle = INK; c.stroke();
    c.lineWidth = lwOf(s, 0.06); c.strokeStyle = '#7b4fd0'; c.stroke();
  }
  // the frame: both rims + the bridge in one violet sticker
  const frame = cc => { lens(cc, x - dx, fr); lens(cc, x + dx, fr); cc.rect(x - dx + lw / 2, cy - lh * 0.36, (dx - lw / 2) * 2, lh * 0.22); };
  draw.sticker(c, cc => { cc.beginPath(); frame(cc); }, { fill: '#8a5ae6', outline: INK, lineWidth: lwOf(s, 0.075), highlight: 0.45, shadow: 0.25,
    bounds: [x - dx - lw / 2 - fr, cy - lh / 2 - fr, (dx + lw / 2 + fr) * 2, lh + fr * 2] });
  for (let i = -1; i <= 1; i += 2) {
    const lx = x + i * dx;
    // the lens: a dark rim, the glowing x-ray glass, a glare streak + a sparkle
    c.beginPath(); lens(c, lx, 0); c.fillStyle = '#2a1050'; c.fill();
    c.beginPath(); lens(c, lx, -s * 0.022);
    c.fillStyle = draw.radial(c, lx, cy, 0, lw * 0.6, [[0, '#ffe2f2'], [0.35, '#ff7cc4'], [1, '#d81f8a']]); c.fill();
    c.save(); c.beginPath(); lens(c, lx, -s * 0.022); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.moveTo(lx - lw * 0.42, cy + lh * 0.1); c.lineTo(lx - lw * 0.1, cy - lh * 0.6); c.lineTo(lx + lw * 0.06, cy - lh * 0.6); c.lineTo(lx - lw * 0.26, cy + lh * 0.1); c.closePath(); c.fill();
    c.restore();
    sparkle(c, lx + lw * 0.22, cy - lh * 0.14, s * 0.05, '#ffffff');
  }
}
function paintSnail(c, x, y, s) {
  const by = y + s * 0.2;
  draw.shadowBlob(c, x, by + s * 0.1, s * 0.4, s * 0.06, 0.35);
  stk(c, cc => { cc.beginPath(); cc.moveTo(x - s * 0.44, by + s * 0.08); cc.quadraticCurveTo(x - s * 0.46, by - s * 0.22, x - s * 0.3, by - s * 0.24); cc.quadraticCurveTo(x - s * 0.2, by - s * 0.16, x - s * 0.18, by - s * 0.04); cc.lineTo(x + s * 0.38, by - s * 0.02); cc.quadraticCurveTo(x + s * 0.48, by + s * 0.06, x + s * 0.36, by + s * 0.1); cc.closePath(); },
    '#4fe3b0', s, [x - s * 0.46, by - s * 0.24, s * 0.94, s * 0.34]);
  c.strokeStyle = INK; c.lineWidth = lwOf(s, 0.035); c.lineCap = 'round';
  for (let i = 0; i < 2; i++) { const ex = x - s * (0.36 - i * 0.08); c.beginPath(); c.moveTo(ex, by - s * 0.2); c.lineTo(ex - s * 0.04, by - s * 0.36); c.stroke(); }
  for (let i = 0; i < 2; i++) stk(c, cc => draw.circle(cc, x - s * (0.4 - i * 0.08), by - s * 0.37, s * 0.045), '#ffffff', s, undefined, 0, 0);
  c.fillStyle = INK; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(x - s * (0.4 - i * 0.08) + s * 0.012, by - s * 0.365, s * 0.02, 0, TAU); c.fill(); }
  const sx = x + s * 0.08, sy = by - s * 0.22, R = s * 0.25;
  stk(c, cc => draw.circle(cc, sx, sy, R), '#ffb347', s, undefined, 0.38, 0.25);
  c.strokeStyle = '#8a5a14'; c.lineWidth = lwOf(s, 0.04); c.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * 2.1, rr = R * (0.82 - i / 40 * 0.74); const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  c.stroke();
}
function paintHeart(c, x, y, s) {
  draw.shadowBlob(c, x, y + s * 0.4, s * 0.3, s * 0.06, 0.35);
  draw.sticker(c, cc => draw.heart(cc, x, y, s * 0.74), { fill: '#ff5a6a', outline: INK, lineWidth: lwOf(s, 0.06), highlight: 0.42, shadow: 0.28 });
  c.strokeStyle = '#ffd166'; c.lineWidth = lwOf(s, 0.05); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s * 0.1, y); c.lineTo(x + s * 0.1, y); c.moveTo(x, y - s * 0.1); c.lineTo(x, y + s * 0.1); c.stroke();
  sparkle(c, x - s * 0.18, y - s * 0.16, s * 0.08, '#ffffff');
}
// a drawstring pouch: a round sack, its neck cinched by a tied gold cord (a bow loop + two knotted ends), the gathered
// frill flaring above it and gems peeking out of the opening
function paintPouch(c, x, y, s) {
  const nk = y - s * 0.05, nw = s * 0.1, bot = y + s * 0.42;
  draw.shadowBlob(c, x, bot, s * 0.36, s * 0.07, 0.4);
  // the gems peeking out (behind the frill)
  paintGem(c, x + s * 0.02, nk - s * 0.27, s * 0.2, 'aqua');
  paintGem(c, x - s * 0.1, nk - s * 0.17, s * 0.22, 'violet');
  paintGem(c, x + s * 0.11, nk - s * 0.19, s * 0.24, 'aqua');
  // the gathered frill: two ruffled flaps flaring out of the neck
  for (let i = -1; i <= 1; i += 2) {
    stk(c, cc => {
      cc.beginPath(); cc.moveTo(x + i * nw * 0.5, nk + s * 0.02);
      cc.quadraticCurveTo(x + i * s * 0.1, nk - s * 0.08, x + i * s * 0.25, nk - s * 0.13);
      cc.quadraticCurveTo(x + i * s * 0.2, nk - s * 0.06, x + i * s * 0.25, nk - s * 0.01);
      cc.quadraticCurveTo(x + i * s * 0.16, nk + s * 0.01, x + i * nw, nk + s * 0.04); cc.closePath();
    }, '#b45ccc', s, [Math.min(x, x + i * s * 0.25), nk - s * 0.13, s * 0.25, s * 0.17], 0.35, 0.15);
  }
  // the sack
  stk(c, cc => { cc.beginPath(); cc.moveTo(x - nw, nk); cc.bezierCurveTo(x - s * 0.44, y + s * 0.03, x - s * 0.5, bot, x, bot); cc.bezierCurveTo(x + s * 0.5, bot, x + s * 0.44, y + s * 0.03, x + nw, nk); cc.closePath(); },
    '#8e3aa6', s, [x - s * 0.5, nk, s, bot - nk], 0.3, 0.28);
  c.strokeStyle = 'rgba(40,6,60,0.42)'; c.lineWidth = lwOf(s, 0.025); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - nw * 0.4, nk + s * 0.06); c.quadraticCurveTo(x - s * 0.15, y + s * 0.12, x - s * 0.21, y + s * 0.24);
  c.moveTo(x + nw * 0.5, nk + s * 0.06); c.quadraticCurveTo(x + s * 0.13, y + s * 0.1, x + s * 0.16, y + s * 0.2); c.stroke();
  // a gold gem stamp on the front
  c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(x, y + s * 0.14); c.lineTo(x + s * 0.07, y + s * 0.22); c.lineTo(x, y + s * 0.31); c.lineTo(x - s * 0.07, y + s * 0.22); c.closePath(); c.fill();
  c.lineWidth = lwOf(s, 0.025); c.strokeStyle = INK; c.stroke();
  // the cord: a band round the neck, a bow loop and two knotted ends hanging down the side
  c.lineWidth = lwOf(s, 0.06); c.strokeStyle = INK;
  c.beginPath(); c.moveTo(x + nw * 0.8, nk + s * 0.01); c.quadraticCurveTo(x + s * 0.2, nk + s * 0.08, x + s * 0.2, nk + s * 0.18);
  c.moveTo(x + nw * 0.8, nk + s * 0.01); c.quadraticCurveTo(x + s * 0.12, nk + s * 0.12, x + s * 0.1, nk + s * 0.22); c.stroke();
  c.lineWidth = lwOf(s, 0.032); c.strokeStyle = GOLD; c.stroke();
  for (let i = 0; i < 2; i++) stk(c, cc => draw.circle(cc, i ? x + s * 0.1 : x + s * 0.2, i ? nk + s * 0.23 : nk + s * 0.19, s * 0.034), GOLD, s * 0.4, undefined, 0.45, 0.1);
  c.save(); c.translate(x + nw * 1.3, nk - s * 0.02); c.rotate(-0.5);
  c.beginPath(); c.ellipse(0, 0, s * 0.075, s * 0.04, 0, 0, TAU); c.lineWidth = lwOf(s, 0.06); c.strokeStyle = INK; c.stroke(); c.lineWidth = lwOf(s, 0.032); c.strokeStyle = GOLD; c.stroke();
  c.restore();
  stk(c, rrect(x - nw * 1.3, nk - s * 0.035, nw * 2.6, s * 0.07, s * 0.03), GOLD, s * 0.5, undefined, 0.45, 0.15);
  stk(c, cc => draw.circle(cc, x + nw * 0.9, nk, s * 0.045), '#e8a72a', s * 0.45, undefined, 0.45, 0.1);
}
function paintChest(c, x, y, s, big) {
  const w = s * (big ? 0.92 : 0.8), h = s * 0.36, bx = x - w / 2, by = y + s * 0.02;
  if (big) {
    c.fillStyle = draw.radial(c, x, by - s * 0.05, 0, s * 0.62, [[0, 'rgba(255,230,140,0.75)'], [0.5, 'rgba(255,200,90,0.25)'], [1, 'rgba(255,200,90,0)']]);
    c.fillRect(x - s * 0.62, by - s * 0.68, s * 1.24, s * 1.24);
  }
  draw.shadowBlob(c, x, by + h + s * 0.03, w * 0.55, s * 0.07, 0.45);
  // the open lid behind (its dark inside facing us), then the heap of gems, then the front of the body
  stk(c, cc => { cc.beginPath(); cc.moveTo(bx + w * 0.02, by); cc.lineTo(bx + w * 0.06, by - h * 0.95); cc.quadraticCurveTo(x, by - h * 1.35, bx + w * 0.94, by - h * 0.95); cc.lineTo(bx + w * 0.98, by); cc.closePath(); },
    '#7a4520', s, [bx, by - h * 1.35, w, h * 1.35], 0.15, 0.2);
  c.fillStyle = '#3a1c0c'; c.beginPath(); c.moveTo(bx + w * 0.1, by); c.lineTo(bx + w * 0.13, by - h * 0.78); c.quadraticCurveTo(x, by - h * 1.12, bx + w * 0.87, by - h * 0.78); c.lineTo(bx + w * 0.9, by); c.closePath(); c.fill();
  const G = big ? [[-0.28, -0.1, 0.24, 'violet'], [0.28, -0.1, 0.24, 'aqua'], [-0.12, -0.2, 0.28, 'aqua'], [0.14, -0.2, 0.28, 'violet'], [0, -0.32, 0.3, 'aqua'], [-0.34, 0.0, 0.2, 'aqua'], [0.34, 0.0, 0.2, 'violet']]
    : [[-0.2, -0.08, 0.24, 'violet'], [0.2, -0.08, 0.24, 'aqua'], [0, -0.2, 0.3, 'aqua']];
  for (let i = 0; i < G.length; i++) paintGem(c, x + G[i][0] * s, by + G[i][1] * s, G[i][2] * s, G[i][3]);
  stk(c, rrect(bx, by, w, h, s * 0.05), '#9a5a2a', s, undefined, 0.25, 0.25);
  c.strokeStyle = 'rgba(40,16,4,0.45)'; c.lineWidth = lwOf(s, 0.02);
  c.beginPath(); c.moveTo(bx + 3, by + h * 0.5); c.lineTo(bx + w - 3, by + h * 0.5); c.stroke();
  for (let i = 0; i < 2; i++) stk(c, rrect(bx + (i ? w * 0.78 : w * 0.1), by, w * 0.12, h, 1), '#d9a441', s, undefined, 0.35, 0.15);
  stk(c, rrect(x - s * 0.07, by + h * 0.18, s * 0.14, h * 0.5, s * 0.03), '#ffd166', s, undefined, 0.4, 0.15);
  c.fillStyle = INK; c.beginPath(); c.arc(x, by + h * 0.4, s * 0.022, 0, TAU); c.fill();
  if (big) { sparkle(c, x - s * 0.36, by - s * 0.34, s * 0.07, '#ffffff'); sparkle(c, x + s * 0.4, by - s * 0.22, s * 0.05, '#ffffff'); }
}
// the top pack: a round gold-rimmed vault door (bolts, the wheel) in a burst of gold rays, a wide spill of gems heaped in
// front of it and the crown on top: a different silhouette from every chest below it
function paintVault(c, x, y, s) {
  const vy = y - s * 0.08, R = s * 0.34;
  c.fillStyle = draw.radial(c, x, vy, 0, s * 0.62, [[0, 'rgba(255,236,150,0.85)'], [0.5, 'rgba(255,200,90,0.3)'], [1, 'rgba(255,200,90,0)']]);
  c.fillRect(x - s * 0.62, vy - s * 0.62, s * 1.24, s * 1.24);
  c.fillStyle = 'rgba(255,214,102,0.22)';
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.13, b = a + 0.16; c.beginPath(); c.moveTo(x, vy); c.lineTo(x + Math.cos(a) * s * 0.62, vy + Math.sin(a) * s * 0.62); c.lineTo(x + Math.cos(b) * s * 0.62, vy + Math.sin(b) * s * 0.62); c.closePath(); c.fill(); }
  draw.shadowBlob(c, x, y + s * 0.44, s * 0.5, s * 0.07, 0.45);
  // the door: steel face, a gold rim with bolts, an inner ring, the wheel
  draw.sticker(c, cc => draw.circle(cc, x, vy, R), { fill: '#8f9ab0', outline: INK, lineWidth: lwOf(s, 0.06), highlight: 0.4, shadow: 0.3 });
  c.save(); draw.circle(c, x, vy, R); c.clip();
  c.fillStyle = draw.gradient(c, x - R, vy - R, x + R, vy + R, [[0, 'rgba(255,255,255,0.35)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(10,14,40,0.35)']]); c.fillRect(x - R, vy - R, R * 2, R * 2);
  c.restore();
  c.beginPath(); c.arc(x, vy, R * 0.86, 0, TAU); c.lineWidth = lwOf(s, 0.07); c.strokeStyle = INK; c.stroke(); c.lineWidth = lwOf(s, 0.045); c.strokeStyle = GOLD; c.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; stk(c, cc => draw.circle(cc, x + Math.cos(a) * R * 0.86, vy + Math.sin(a) * R * 0.86, s * 0.026), '#fff3c4', s * 0.3, undefined, 0.5, 0.1); }
  c.beginPath(); c.arc(x, vy, R * 0.52, 0, TAU); c.lineWidth = lwOf(s, 0.025); c.strokeStyle = 'rgba(29,24,64,0.55)'; c.stroke();
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + 0.4, ex = x + Math.cos(a) * R * 0.44, ey = vy + Math.sin(a) * R * 0.44;
    c.beginPath(); c.moveTo(x, vy); c.lineTo(ex, ey); c.lineWidth = lwOf(s, 0.045); c.strokeStyle = INK; c.stroke(); c.lineWidth = lwOf(s, 0.026); c.strokeStyle = '#ffd166'; c.stroke();
    stk(c, cc => draw.circle(cc, ex, ey, s * 0.04), GOLD, s * 0.4, undefined, 0.5, 0.1);
  }
  stk(c, cc => draw.circle(cc, x, vy, s * 0.075), GOLD, s * 0.6, undefined, 0.5, 0.15);
  // the spill: three rows of gems, the widest in front
  const M = [[-0.3, 0.12, 0.2, 'violet'], [0.3, 0.12, 0.2, 'aqua'], [-0.4, 0.24, 0.22, 'aqua'], [-0.14, 0.24, 0.24, 'violet'], [0.14, 0.24, 0.24, 'aqua'], [0.4, 0.24, 0.22, 'violet'],
    [-0.5, 0.37, 0.2, 'violet'], [-0.29, 0.38, 0.24, 'aqua'], [-0.07, 0.39, 0.26, 'violet'], [0.15, 0.39, 0.25, 'aqua'], [0.35, 0.38, 0.23, 'violet'], [0.52, 0.36, 0.19, 'aqua']];
  for (let i = 0; i < M.length; i++) paintGem(c, x + M[i][0] * s, y + M[i][1] * s, M[i][2] * s, M[i][3]);
  paintCrown(c, x, vy - R - s * 0.06, s * 0.36);
  sparkle(c, x - s * 0.52, vy - s * 0.2, s * 0.07, '#ffffff'); sparkle(c, x + s * 0.5, vy - s * 0.3, s * 0.06, '#ffffff'); sparkle(c, x + s * 0.36, vy + s * 0.05, s * 0.05, '#fff3c4');
}
// the gem packs, smallest to largest (MONETIZATION §5; numbered by PRODUCTS order: 1 gem, a pile, the pouch, a chest,
// the big chest, the crowned treasure, the vault)
function paintPile(c, x, y, s, tier) {
  if (tier <= 1) { paintGem(c, x, y, s * 0.62, 'aqua'); sparkle(c, x + s * 0.3, y - s * 0.24, s * 0.07, '#ffffff'); return; }
  if (tier === 2) {
    paintGem(c, x - s * 0.22, y + s * 0.1, s * 0.42, 'violet'); paintGem(c, x + s * 0.22, y + s * 0.1, s * 0.42, 'aqua'); paintGem(c, x, y - s * 0.06, s * 0.5, 'aqua');
    return;
  }
  if (tier === 3) { paintPouch(c, x, y, s * 0.95); return; }
  if (tier === 4) { paintChest(c, x, y + s * 0.04, s * 0.95, false); return; }
  if (tier === 5) { paintChest(c, x, y + s * 0.04, s, true); return; }
  if (tier >= 7) { paintVault(c, x, y, s); return; }
  // treasure: a gold ring of light, the big chest raised on a gem mound that spills wider than the chest, sparkles, and
  // the crown sitting on the heap (centred: the bonus ribbon lives in the card's corner, never over the art)
  c.fillStyle = draw.radial(c, x, y - s * 0.06, 0, s * 0.6, [[0, 'rgba(255,236,150,0.9)'], [0.45, 'rgba(255,200,90,0.38)'], [1, 'rgba(255,200,90,0)']]);
  c.fillRect(x - s * 0.6, y - s * 0.66, s * 1.2, s * 1.2);
  c.strokeStyle = 'rgba(255,214,102,0.85)'; c.lineWidth = lwOf(s, 0.035); c.beginPath(); c.arc(x, y - s * 0.04, s * 0.5, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,244,200,0.5)'; c.lineWidth = lwOf(s, 0.015); c.beginPath(); c.arc(x, y - s * 0.04, s * 0.55, 0, TAU); c.stroke();
  paintChest(c, x, y - s * 0.05, s * 0.88, true);
  const M = [[-0.48, 0.34, 0.2, 'violet'], [0.48, 0.34, 0.2, 'aqua'], [-0.33, 0.37, 0.24, 'aqua'], [0.33, 0.37, 0.24, 'violet'],
    [-0.17, 0.4, 0.24, 'violet'], [0.17, 0.4, 0.24, 'aqua'], [0, 0.43, 0.26, 'aqua'], [-0.24, 0.28, 0.2, 'aqua'], [0.25, 0.28, 0.2, 'violet']];
  for (let i = 0; i < M.length; i++) paintGem(c, x + M[i][0] * s, y + M[i][1] * s, M[i][2] * s, M[i][3]);
  paintCrown(c, x, y - s * 0.42, s * 0.38);
  sparkle(c, x - s * 0.5, y - s * 0.3, s * 0.07, '#ffffff'); sparkle(c, x + s * 0.52, y - s * 0.12, s * 0.06, '#ffffff'); sparkle(c, x + s * 0.3, y - s * 0.56, s * 0.05, '#fff3c4');
}
// the VIP rope deal: gold posts, a black velvet rope with a gold braid, a crown
function paintVip(c, x, y, s) {
  c.fillStyle = draw.radial(c, x, y, 0, s * 0.6, [[0, 'rgba(255,214,120,0.45)'], [1, 'rgba(255,214,120,0)']]);
  c.fillRect(x - s * 0.6, y - s * 0.6, s * 1.2, s * 1.2);
  const p0 = x - s * 0.36, p1 = x + s * 0.36, top = y - s * 0.04, foot = y + s * 0.36;
  draw.shadowBlob(c, x, foot + s * 0.02, s * 0.46, s * 0.06, 0.4);
  c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = s * 0.11; c.beginPath(); c.moveTo(p0, top + s * 0.02); c.quadraticCurveTo(x, top + s * 0.28, p1, top + s * 0.02); c.stroke();
  c.strokeStyle = '#16131c'; c.lineWidth = s * 0.08; c.stroke();
  c.strokeStyle = '#e2b04f'; c.lineWidth = s * 0.018; c.setLineDash([s * 0.05, s * 0.04]); c.stroke(); c.setLineDash([]);
  for (let i = 0; i < 2; i++) {
    const px = i ? p1 : p0;
    stk(c, rrect(px - s * 0.035, top, s * 0.07, foot - top, s * 0.03), '#e2b04f', s, undefined, 0.4, 0.2);
    stk(c, cc => draw.circle(cc, px, top - s * 0.02, s * 0.065), '#ffd166', s, undefined, 0.5, 0.15);
    stk(c, cc => draw.ellipse(cc, px, foot, s * 0.12, s * 0.04), '#b07a22', s, undefined, 0.3, 0.2);
  }
  paintCrown(c, x, y - s * 0.3, s * 0.42);
}
// the Gold Star Road: a trail of three gold stars climbing a dotted gold path out of the lower left into a big crowned
// gold star, in a warm glow
const GR_TRAIL = [[0.18, 0.07], [0.46, 0.085], [0.74, 0.1]];
function paintGoldRoad(c, x, y, s) {
  c.fillStyle = draw.radial(c, x + s * 0.08, y - s * 0.12, 0, s * 0.62, [[0, 'rgba(255,226,140,0.78)'], [0.5, 'rgba(255,200,90,0.24)'], [1, 'rgba(255,200,90,0)']]);
  c.fillRect(x - s * 0.62, y - s * 0.66, s * 1.24, s * 1.24);
  const ax = x - s * 0.44, ay = y + s * 0.4, qx = x - s * 0.4, qy = y - s * 0.02, bx = x + s * 0.06, by = y - s * 0.1;
  draw.shadowBlob(c, x - s * 0.1, y + s * 0.46, s * 0.4, s * 0.06, 0.35);
  // the path: an ink-edged gold dotted line
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(qx, qy, bx, by);
  c.setLineDash([s * 0.035, s * 0.05]); c.lineWidth = lwOf(s, 0.07); c.strokeStyle = INK; c.stroke();
  c.lineWidth = lwOf(s, 0.035); c.strokeStyle = '#ffd166'; c.stroke(); c.setLineDash([]);
  for (let i = 0; i < GR_TRAIL.length; i++) {
    const u = GR_TRAIL[i][0], v = 1 - u, px = v * v * ax + 2 * u * v * qx + u * u * bx, py = v * v * ay + 2 * u * v * qy + u * u * by, r = s * GR_TRAIL[i][1];
    draw.sticker(c, cc => draw.star(cc, px, py, r, 0.5, 5), { fill: '#ffd166', outline: INK, lineWidth: lwOf(s, 0.04), highlight: 0.45, shadow: 0.2 });
  }
  // the big star: gold face, a lighter inner star, the crown on its top point
  const sx = x + s * 0.12, sy = y - s * 0.14, R = s * 0.3;
  draw.sticker(c, cc => draw.star(cc, sx, sy, R, 0.5, 5), { fill: GOLD, outline: INK, lineWidth: lwOf(s, 0.06), highlight: 0.45, shadow: 0.28 });
  c.fillStyle = 'rgba(255,246,200,0.55)'; draw.star(c, sx - R * 0.04, sy - R * 0.02, R * 0.46, 0.5, 5); c.fill();
  paintCrown(c, sx, sy - R * 1.08, s * 0.26);
  sparkle(c, x - s * 0.46, y - s * 0.2, s * 0.07, '#ffffff'); sparkle(c, x + s * 0.5, y + s * 0.12, s * 0.06, '#fff3c4'); sparkle(c, x + s * 0.44, y - s * 0.46, s * 0.05, '#ffffff');
}
// Club Owner: the party house wearing the crown, on a gold burst
function paintOwner(c, x, y, s) {
  c.fillStyle = draw.radial(c, x, y - s * 0.06, 0, s * 0.62, [[0, 'rgba(255,226,140,0.7)'], [0.5, 'rgba(255,200,90,0.22)'], [1, 'rgba(255,200,90,0)']]);
  c.fillRect(x - s * 0.62, y - s * 0.66, s * 1.24, s * 1.24);
  c.fillStyle = 'rgba(255,214,102,0.2)';
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2, b = a + 0.2; c.beginPath(); c.moveTo(x, y - s * 0.06); c.lineTo(x + Math.cos(a) * s * 0.6, y - s * 0.06 + Math.sin(a) * s * 0.6); c.lineTo(x + Math.cos(b) * s * 0.6, y - s * 0.06 + Math.sin(b) * s * 0.6); c.closePath(); c.fill(); }
  paintHouse(c, x, y + s * 0.1, s * 0.92);
  paintCrown(c, x, y - s * 0.25, s * 0.44);
  sparkle(c, x - s * 0.46, y - s * 0.3, s * 0.07, '#ffffff'); sparkle(c, x + s * 0.48, y - s * 0.12, s * 0.06, '#fff3c4');
}
// the Mega Booster Bundle: a brass-banded wooden crate with the three boosters piled three deep out of its top (a
// pyramid: 3, 2, 1), the front row tucked behind the crate's lip
const CRATE_ROWS = [[['heart', 0, -0.47, 0.27]], [['snail', -0.17, -0.33, 0.3], ['glasses', 0.18, -0.34, 0.3]],
  [['glasses', -0.29, -0.17, 0.32], ['heart', 0.01, -0.2, 0.31], ['snail', 0.3, -0.16, 0.31]]];
function paintCrate(c, x, y, s) {
  const w = s * 0.92, h = s * 0.46, x0 = x - w / 2, y0 = y - s * 0.04;
  draw.shadowBlob(c, x, y0 + h + s * 0.03, w * 0.55, s * 0.06, 0.4);
  // the pile: the top row first, the front row last (just behind the lip)
  for (let r = 0; r < CRATE_ROWS.length; r++) for (let i = 0; i < CRATE_ROWS[r].length; i++) { const P = CRATE_ROWS[r][i]; ART[P[0]](c, x + P[1] * s, y + P[2] * s, P[3] * s); }
  // the crate: a planked face, a darker lip on top, brass corner bands with rivets
  stk(c, rrect(x0, y0, w, h, s * 0.04), '#b9772f', s, undefined, 0.3, 0.28);
  c.save(); draw.roundRect(c, x0, y0, w, h, s * 0.04); c.clip();
  c.strokeStyle = 'rgba(80,40,10,0.55)'; c.lineWidth = lwOf(s, 0.02);
  for (let k = 1; k < 3; k++) { const py = y0 + h * k / 3; c.beginPath(); c.moveTo(x0, py); c.lineTo(x0 + w, py); c.stroke(); }
  c.fillStyle = 'rgba(255,230,180,0.16)'; c.fillRect(x0, y0 + h * 0.06, w, h * 0.1);
  c.restore();
  stk(c, rrect(x0 - s * 0.02, y0 - s * 0.03, w + s * 0.04, s * 0.09, s * 0.03), '#8a5420', s, undefined, 0.35, 0.2);
  for (let i = -1; i <= 1; i += 2) {
    const bx = i < 0 ? x0 - s * 0.01 : x0 + w - s * 0.1;
    stk(c, rrect(bx, y0 - s * 0.02, s * 0.11, h + s * 0.03, s * 0.025), '#d9a441', s, undefined, 0.45, 0.15);
    c.fillStyle = '#fff3c4';
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(bx + s * 0.055, y0 + s * 0.04 + k * (h - s * 0.06) / 2, s * 0.016, 0, TAU); c.fill(); }
  }
  // a stencilled bolt on the front plank
  c.save(); c.globalAlpha = 0.55; paintBoltMark(c, x, y0 + h * 0.56, s * 0.2); c.restore();
}
function paintBoltMark(c, x, y, s) {
  c.beginPath(); c.moveTo(x + s * 0.12, y - s * 0.5); c.lineTo(x - s * 0.3, y + s * 0.08); c.lineTo(x - s * 0.02, y + s * 0.08);
  c.lineTo(x - s * 0.14, y + s * 0.5); c.lineTo(x + s * 0.3, y - s * 0.1); c.lineTo(x + s * 0.02, y - s * 0.1); c.closePath();
  c.fillStyle = '#5a3210'; c.fill();
}
// the Booster Bundle: the three boosters side by side, big (the count is one sticker beside them, drawn live)
function paintTrio(c, x, y, s) {
  draw.shadowBlob(c, x, y + s * 0.3, s * 0.5, s * 0.05, 0.3);
  paintSnail(c, x - s * 0.3, y + s * 0.02, s * 0.38);
  paintHeart(c, x + s * 0.3, y + s * 0.03, s * 0.36);
  paintGlasses(c, x, y - s * 0.09, s * 0.42);
}
// the X-Ray sheet's scene (the glasses are drawn live above it): their pink beam falling on a liar's party hat, a strip
// of the guests' tape across it (the fake the glasses expose), its rim glowing in the beam
function paintXHat(c, x, y, s) {
  const top = y - s * 0.52, bot = y + s * 0.22;
  c.fillStyle = draw.gradient(c, 0, top, 0, bot, [[0, 'rgba(255,124,196,0.6)'], [0.7, 'rgba(255,124,196,0.22)'], [1, 'rgba(255,124,196,0.04)']]);
  c.beginPath(); c.moveTo(x - s * 0.1, top); c.lineTo(x + s * 0.1, top); c.lineTo(x + s * 0.36, bot); c.lineTo(x - s * 0.36, bot); c.closePath(); c.fill();
  const hx = x, hb = y + s * 0.3, hw = s * 0.24, ht = y - s * 0.12;
  draw.shadowBlob(c, hx, hb + s * 0.03, hw * 1.1, s * 0.05, 0.4);
  const cone = cc => { cc.beginPath(); cc.moveTo(hx - hw, hb); cc.quadraticCurveTo(hx, hb + s * 0.05, hx + hw, hb); cc.lineTo(hx + s * 0.02, ht); cc.closePath(); };
  draw.sticker(c, cone, { fill: '#7b4fd0', outline: INK, lineWidth: lwOf(s, 0.04), highlight: 0.35, shadow: 0.25, bounds: [hx - hw, ht, hw * 2, hb - ht] });
  c.save(); cone(c); c.clip();
  c.strokeStyle = '#ffd166'; c.lineWidth = s * 0.035;
  for (let k = 0; k < 3; k++) { const yy = hb - (k + 0.6) * (hb - ht) / 3.4; c.beginPath(); c.moveTo(hx - hw, yy + s * 0.05); c.lineTo(hx + hw, yy - s * 0.03); c.stroke(); }
  c.restore();
  stk(c, cc => draw.circle(cc, hx + s * 0.02, ht - s * 0.02, s * 0.045), '#ff7cc4', s, undefined, 0.45, 0.1);
  // the tape across it, torn ends
  c.save(); c.translate(hx, y + s * 0.13); c.rotate(-0.42);
  const tw = s * 0.46, th = s * 0.07;
  stk(c, cc => { cc.beginPath(); cc.moveTo(-tw / 2, -th / 2); cc.lineTo(tw / 2, -th / 2); cc.lineTo(tw / 2 - th * 0.3, 0); cc.lineTo(tw / 2, th / 2); cc.lineTo(-tw / 2, th / 2); cc.lineTo(-tw / 2 + th * 0.3, 0); cc.closePath(); },
    '#efe6cf', s, [-tw / 2, -th / 2, tw, th], 0.3, 0.1);
  c.restore();
  // the beam's rim light on the hat
  c.save(); cone(c); c.lineWidth = s * 0.018; c.strokeStyle = 'rgba(255,190,230,0.85)'; c.stroke(); c.restore();
  sparkle(c, x - s * 0.3, y - s * 0.02, s * 0.05, '#ffe2f2'); sparkle(c, x + s * 0.3, y + s * 0.08, s * 0.04, '#ffffff');
}
// the Slow-Mo sheet's scene (the snail is drawn live in it): the patience ring frosted ice-cyan, most of it full
function paintIceRing(c, x, y, s) {
  const R = s * 0.42, lw = s * 0.1, a0 = -Math.PI / 2;
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, R, 0, TAU); c.lineWidth = lw + s * 0.035; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.arc(x, y, R, 0, TAU); c.lineWidth = lw; c.strokeStyle = '#1c2552'; c.stroke();
  c.beginPath(); c.arc(x, y, R, a0, a0 + TAU * 0.74); c.lineWidth = lw; c.strokeStyle = '#7fd4ff'; c.stroke();
  c.beginPath(); c.arc(x, y, R - lw * 0.18, a0 + 0.08, a0 + TAU * 0.74 - 0.08); c.lineWidth = lw * 0.28; c.strokeStyle = 'rgba(235,250,255,0.85)'; c.stroke();
  c.fillStyle = 'rgba(159,220,255,0.12)'; c.beginPath(); c.arc(x, y, R - lw * 0.6, 0, TAU); c.fill();
  sparkle(c, x - R * 0.95, y - R * 0.55, s * 0.05, '#e6f8ff'); sparkle(c, x + R * 1.0, y + R * 0.4, s * 0.045, '#e6f8ff'); sparkle(c, x + R * 0.6, y - R * 0.95, s * 0.035, '#ffffff');
}
const ART = { gift: paintGift, jar: paintJar, ticket: paintTicket, crown: paintCrown, bow: paintBow, house: paintHouse, tag: paintTag,
  glasses: paintGlasses, snail: paintSnail, heart: paintHeart, vip: paintVip, goldroad: paintGoldRoad, owner: paintOwner, crate: paintCrate, trio: paintTrio,
  xhat: paintXHat, icering: paintIceRing,
  gem: function (c, x, y, s) { paintGem(c, x, y, s * 0.86); } };
const ART_BAKE = {};
function artBaker(name, s) {
  const k = name + '.' + s;
  let f = ART_BAKE[k];
  if (!f) { f = function (c, w, h) { if (name.indexOf('pile') === 0) paintPile(c, w / 2, h / 2, s, +name.slice(4)); else ART[name](c, w / 2, h / 2, s); }; ART_BAKE[k] = f; }
  return f;
}
const ASPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const ART_KEYS_S = {}, ART_KEYS_L = {};          // name -> its draw.cached key (built once, never per frame)
// drawArt(ctx, name, x, y, size, alpha): a shop glyph (gift, jar, ticket, crown, bow, house, tag, glasses, snail, heart,
// vip, goldroad, owner, gem, pile1..pile7, bolt = icons.js' bolt) from one of two bakes (small <= 44, large), scaled to size
export function drawArt(ctx, name, x, y, size, alpha) {
  if (name === 'bolt') { BOLT_O.alpha = alpha === undefined ? 1 : alpha; drawGlyph(ctx, 'bolt', x, y, size * 0.9, BOLT_O); return; }
  const big = size > 44, s = big ? 120 : 40, box = Math.ceil(s * 1.3);
  const KM = big ? ART_KEYS_L : ART_KEYS_S;
  let key = KM[name];
  if (!key) { key = 'shop.art.' + name + (big ? '.l' : '.s'); KM[name] = key; }
  ASPR.scale = size / s; ASPR.alpha = alpha === undefined ? 1 : alpha;
  draw.sprite(ctx, draw.cached(key, box, box, artBaker(name, s)), x, y, ASPR);
}
const BOLT_O = { color: '#ffd166', alpha: 1 };

// ---- party-item thumbnails (approximations for the tiles; the live preview shows the real skin)
const THEME_ART = {
  house: { sky: ['#12113a', '#2a2760'], wall: '#3b3584', trim: '#d9a441', glow: '#ffb347' },
  neon: { sky: ['#06050c', '#1a1030'], wall: '#14111e', trim: '#ff4fa3', glow: '#53e0ff' },
  royal: { sky: ['#1e0a2c', '#40164e'], wall: '#5b2a6e', trim: '#e2b04f', glow: '#ffd27a' },
  desert: { sky: ['#0a1236', '#26306a'], wall: '#7a5236', trim: '#c9a26a', glow: '#ffb347', ground: '#b9824a' },
  space: { sky: ['#100828', '#2c1a5c'], wall: '#3a4560', trim: '#9fb4d8', glow: '#7ff3ff' },
  beach: { sky: ['#0c1d44', '#22457a'], wall: '#7a6a3a', trim: '#e9c46a', glow: '#ffcf7a', ground: '#d9b77a' },
  spooky: { sky: ['#08160f', '#183022'], wall: '#2c2a3a', trim: '#7ff58a', glow: '#ff9a3c' },
  vip: { sky: ['#060509', '#1a1408'], wall: '#111014', trim: '#e2b04f', glow: '#ffd27a' },
  rock: { sky: ['#1a0610', '#3a0c1e'], wall: '#2a1018', trim: '#ff6a3c', glow: '#ffb347' },
};
function themeBackdrop(c, x, y, w, h, theme) {
  const A = THEME_ART[theme] || THEME_ART.house;
  c.fillStyle = draw.gradient(c, 0, y, 0, y + h, [[0, A.sky[0]], [1, A.sky[1]]]); c.fillRect(x, y, w, h);
  const gy = y + h * 0.8;
  c.fillStyle = 'rgba(255,255,255,0.75)';
  if (theme !== 'neon' && theme !== 'royal') for (let i = 0; i < 14; i++) { const sx = x + ((i * 53) % 97) / 97 * w, sy = y + ((i * 31) % 47) / 47 * h * 0.55; c.fillRect(sx, sy, 1.4, 1.4); }
  if (theme === 'desert') {
    c.fillStyle = 'rgba(200,210,255,0.08)'; c.beginPath(); c.ellipse(x + w * 0.55, y + h * 0.25, w * 0.6, h * 0.08, -0.35, 0, TAU); c.fill();
    c.fillStyle = A.ground; c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x + w * 0.3, gy - h * 0.16, x + w * 0.6, gy - h * 0.02); c.quadraticCurveTo(x + w * 0.8, gy - h * 0.12, x + w, gy - h * 0.04); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
  } else if (theme === 'beach') {
    c.fillStyle = '#f4f1d0'; c.beginPath(); c.arc(x + w * 0.78, y + h * 0.22, h * 0.09, 0, TAU); c.fill();
    c.fillStyle = '#0a2a52'; c.fillRect(x, gy - h * 0.1, w, h * 0.12);
    c.fillStyle = A.ground; c.fillRect(x, gy, w, y + h - gy);
    c.strokeStyle = '#0a1830'; c.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const px = x + (i ? w * 0.9 : w * 0.08); c.beginPath(); c.moveTo(px, gy); c.quadraticCurveTo(px + 4, gy - h * 0.25, px + 2, gy - h * 0.42); c.stroke(); c.fillStyle = '#0a1830'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(px + 2 + Math.cos(k * 1.6) * 7, gy - h * 0.42, 9, 2.4, k * 1.6, 0, TAU); c.fill(); } }
  } else if (theme === 'space') {
    c.fillStyle = 'rgba(167,123,255,0.25)'; c.beginPath(); c.ellipse(x + w * 0.3, y + h * 0.3, w * 0.35, h * 0.15, 0.3, 0, TAU); c.fill();
    c.fillStyle = '#c7a6ff'; c.beginPath(); c.arc(x + w * 0.8, y + h * 0.22, h * 0.1, 0, TAU); c.fill();
    c.strokeStyle = '#fff3c4'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x + w * 0.8, y + h * 0.22, h * 0.17, h * 0.04, -0.3, 0, TAU); c.stroke();
    c.fillStyle = '#20263a'; c.fillRect(x, gy, w, y + h - gy);
  } else if (theme === 'spooky') {
    c.fillStyle = '#c8ff9a'; c.beginPath(); c.arc(x + w * 0.78, y + h * 0.24, h * 0.11, 0, TAU); c.fill();
    c.fillStyle = '#0a1210';
    for (let i = 0; i < 2; i++) { const bx = x + w * (0.2 + i * 0.4), by = y + h * (0.18 + i * 0.08); c.beginPath(); c.moveTo(bx - 7, by); c.quadraticCurveTo(bx - 3, by - 4, bx, by + 1); c.quadraticCurveTo(bx + 3, by - 4, bx + 7, by); c.quadraticCurveTo(bx, by + 4, bx - 7, by); c.fill(); }
    c.fillStyle = '#141a14'; c.fillRect(x, gy, w, y + h - gy);
  } else if (theme === 'vip') {
    c.strokeStyle = 'rgba(226,176,79,0.22)'; c.lineWidth = 1;
    for (let i = 0; i < w; i += 8) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i, y + h); c.stroke(); }
    c.fillStyle = 'rgba(255,214,120,0.16)';
    for (let i = 0; i < 2; i++) { const bx = x + (i ? w * 0.85 : w * 0.15); c.beginPath(); c.moveTo(bx, gy); c.lineTo(bx + (i ? -w * 0.3 : w * 0.3) - 10, y); c.lineTo(bx + (i ? -w * 0.3 : w * 0.3) + 10, y); c.closePath(); c.fill(); }
    c.fillStyle = '#0c0b10'; c.fillRect(x, gy, w, y + h - gy);
  } else {
    c.fillStyle = 'rgba(8,6,24,0.55)';
    for (let i = 0; i < 6; i++) { const bw = w * 0.12, bh = h * (0.18 + ((i * 37) % 5) * 0.05); c.fillRect(x + i * w * 0.17, gy - bh, bw, bh); }
    c.fillStyle = theme === 'neon' ? '#0c0a12' : theme === 'royal' ? '#2a1032' : theme === 'rock' ? '#1a0810' : '#1b1a4d'; c.fillRect(x, gy, w, y + h - gy);
  }
}
function paintClubThumb(c, w, h, id) {
  const theme = id.slice(5), A = THEME_ART[theme] || THEME_ART.house, r = 10;
  c.save(); draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.clip();
  themeBackdrop(c, 0, 0, w, h, theme);
  const bw = w * 0.56, bh = h * 0.56, bx = (w - bw) / 2, by = h * 0.3;
  c.fillStyle = A.wall; c.fillRect(bx, by, bw, bh + 4);
  if (theme === 'desert') { c.fillStyle = A.wall; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(bx + i * bw / 6, by); c.lineTo(bx + (i + 0.5) * bw / 6, by - 5); c.lineTo(bx + (i + 1) * bw / 6, by); c.fill(); } }
  if (theme === 'spooky') { c.fillStyle = A.wall; c.beginPath(); c.moveTo(bx - 3, by + 1); c.lineTo(bx + bw * 0.45, by - 12); c.lineTo(bx + bw + 4, by - 2); c.closePath(); c.fill(); }
  c.fillStyle = A.trim; c.fillRect(bx - 2, by, bw + 4, 2.5);
  const aw = bw * 0.46, ah = bh * 0.5, ax = (w - aw) / 2, ay = by + bh * 0.14;
  c.fillStyle = A.glow; c.beginPath(); c.moveTo(ax, ay + ah); c.lineTo(ax, ay + aw / 2); c.arc(w / 2, ay + aw / 2, aw / 2, Math.PI, 0); c.lineTo(ax + aw, ay + ah); c.closePath(); c.fill();
  c.lineWidth = 1.6; c.strokeStyle = theme === 'neon' ? '#ff4fa3' : A.trim; c.stroke();
  if (theme === 'neon') { c.strokeStyle = '#53e0ff'; c.lineWidth = 1.4; c.strokeRect(bx + 3, by + 4, bw - 6, bh - 4); }
  if (theme === 'space') { c.fillStyle = '#7ff3ff'; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(bx + (i ? bw * 0.86 : bw * 0.14), by + bh * 0.4, 3.2, 0, TAU); c.fill(); } }
  if (theme === 'spooky') { c.fillStyle = '#ff9a3c'; c.beginPath(); c.ellipse(bx - 2, by + bh - 2, 5, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#2a1408'; c.fillRect(bx - 4, by + bh - 3, 1.6, 1.6); c.fillRect(bx - 0.6, by + bh - 3, 1.6, 1.6); }
  c.fillStyle = theme === 'royal' || theme === 'vip' ? A.trim : '#8a5a14'; c.fillRect(w / 2 - bw * 0.1, by + bh * 0.72, bw * 0.2, bh * 0.3);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 6, w, 6);
  c.restore();
  draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
}
const ROPE_ART = {
  velvet: { post: '#d9a441', rope: '#b3203a' }, silver: { post: '#c9d3e0', rope: '#aab6c8', chain: true },
  candy: { post: '#7fe0c0', rope: '#ffffff', stripe: '#e8455e' }, neon: { post: '#26222f', rope: '#ff4fa3', glow: true },
  royal: { post: '#e2b04f', rope: '#6a2a7e', tassel: '#ffd166' }, crystal: { post: '#bfe6f5', rope: '#e8f8ff', beads: true },
  vip: { post: '#e2b04f', rope: '#16131c', braid: '#e2b04f' },
};
function ropeCurve(c, x0, y0, x1, y1, sag) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + sag, x1, y1); }
function paintRopeThumb(c, w, h, id) {
  const R = ROPE_ART[id.slice(5)] || ROPE_ART.velvet, r = 10;
  c.save(); draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.clip();
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#2a2760'], [1, '#141236']]); c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,179,71,0.12)'; c.fillRect(0, h * 0.78, w, h * 0.22);
  const p0 = w * 0.18, p1 = w * 0.82, top = h * 0.3, foot = h * 0.84, sag = h * 0.3;
  c.lineCap = 'round';
  if (R.glow) { c.save(); c.globalCompositeOperation = 'lighter'; ropeCurve(c, p0, top + 4, p1, top + 4, sag); c.strokeStyle = 'rgba(255,79,163,0.35)'; c.lineWidth = 12; c.stroke(); c.restore(); }
  ropeCurve(c, p0, top + 4, p1, top + 4, sag); c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
  c.strokeStyle = R.rope; c.lineWidth = 5.4; c.stroke();
  if (R.stripe) { c.strokeStyle = R.stripe; c.lineWidth = 5.4; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
  if (R.braid) { c.strokeStyle = R.braid; c.lineWidth = 1.4; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]); }
  if (R.chain || R.beads) {
    for (let i = 1; i < 12; i++) {
      const u = i / 12, bx = (1 - u) * (1 - u) * p0 + 2 * u * (1 - u) * (w / 2) + u * u * p1, by = (1 - u) * (1 - u) * (top + 4) + 2 * u * (1 - u) * (top + 4 + sag) + u * u * (top + 4);
      c.beginPath(); if (R.chain) c.ellipse(bx, by, 3.4, 2.2, 0, 0, TAU); else c.arc(bx, by, 2.8, 0, TAU);
      c.fillStyle = R.chain ? '#dde4ee' : '#f4fbff'; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
    }
  }
  if (R.tassel) for (let i = 0; i < 2; i++) { const tx = i ? p1 - 8 : p0 + 8; c.fillStyle = R.tassel; c.beginPath(); c.moveTo(tx - 3, top + 10); c.lineTo(tx + 3, top + 10); c.lineTo(tx + 4, top + 20); c.lineTo(tx - 4, top + 20); c.closePath(); c.fill(); }
  for (let i = 0; i < 2; i++) {
    const px = i ? p1 : p0;
    stk(c, rrect(px - 3.4, top, 6.8, foot - top, 3), R.post, 40, undefined, 0.35, 0.2);
    stk(c, cc => draw.circle(cc, px, top - 1, 5.2), R.post, 40, undefined, 0.5, 0.15);
    stk(c, cc => draw.ellipse(cc, px, foot, 10, 3.6), R.post, 40, undefined, 0.3, 0.2);
  }
  c.restore();
  draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
}
const DOOR_ART = {
  brass: { frame: '#d9a441', leaf: '#7a2e1e', detail: '#d9a441' }, oak: { frame: '#5a3a1a', leaf: '#9a6432', detail: '#3a3a46', planks: true },
  najdi: { frame: '#8a5a2a', leaf: '#c98a3a', detail: '#2aa198', tri: true }, neon: { frame: '#ff4fa3', leaf: '#121018', detail: '#53e0ff', glow: true },
  royal: { frame: '#e2b04f', leaf: '#f1ece2', detail: '#e2b04f', mould: true }, crystal: { frame: '#9fd6ea', leaf: '#d8f2fb', detail: '#ffffff', facets: true },
};
function paintDoorThumb(c, w, h, id) {
  const D = DOOR_ART[id.slice(5)] || DOOR_ART.brass, r = 10;
  c.save(); draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.clip();
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#2a2760'], [1, '#17153f']]); c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 6; y < h; y += 10) c.fillRect(0, y, w, 1);
  const dw = w * 0.4, dh = h * 0.78, dx = (w - dw) / 2, dy = h - dh;
  if (D.glow) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = draw.radial(c, w / 2, dy + dh / 2, 0, dw, [[0, 'rgba(255,79,163,0.35)'], [1, 'rgba(255,79,163,0)']]); c.fillRect(0, 0, w, h); c.restore(); }
  const arch = cc => { cc.beginPath(); cc.moveTo(dx - 5, h); cc.lineTo(dx - 5, dy + dw / 2); cc.arc(w / 2, dy + dw / 2, dw / 2 + 5, Math.PI, 0); cc.lineTo(dx + dw + 5, h); cc.closePath(); };
  draw.sticker(c, arch, { fill: D.frame, outline: INK, lineWidth: 2, highlight: 0.35, shadow: 0.2, bounds: [dx - 5, dy - 5, dw + 10, dh + 5] });
  const leaf = cc => { cc.beginPath(); cc.moveTo(dx, h); cc.lineTo(dx, dy + dw / 2); cc.arc(w / 2, dy + dw / 2, dw / 2, Math.PI, 0); cc.lineTo(dx + dw, h); cc.closePath(); };
  draw.sticker(c, leaf, { fill: D.leaf, outline: INK, lineWidth: 1.6, highlight: 0.25, shadow: 0.25, bounds: [dx, dy, dw, dh] });
  c.save(); leaf(c); c.clip();
  c.strokeStyle = D.detail; c.fillStyle = D.detail; c.lineWidth = 1.6;
  if (D.planks) { for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(dx + dw * i / 4, dy); c.lineTo(dx + dw * i / 4, h); c.stroke(); } c.lineWidth = 3.2; for (let i = 0; i < 2; i++) { const yy = dy + dh * (0.35 + i * 0.35); c.beginPath(); c.moveTo(dx, yy); c.lineTo(dx + dw, yy); c.stroke(); } }
  else if (D.tri) { for (let row = 0; row < 4; row++) { const yy = dy + dh * 0.3 + row * 9; c.fillStyle = row % 2 ? '#ffffff' : D.detail; for (let i = 0; i < 4; i++) { const xx = dx + 2 + i * dw / 4; c.beginPath(); c.moveTo(xx, yy + 7); c.lineTo(xx + dw / 8, yy); c.lineTo(xx + dw / 4 - 2, yy + 7); c.closePath(); c.fill(); } } }
  else if (D.mould) { c.lineWidth = 1.4; c.strokeRect(dx + 4, dy + dh * 0.3, dw - 8, dh * 0.28); c.strokeRect(dx + 4, dy + dh * 0.64, dw - 8, dh * 0.3); }
  else if (D.facets) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; for (let i = -3; i < 6; i++) { c.beginPath(); c.moveTo(dx + i * 8, h); c.lineTo(dx + i * 8 + dh * 0.5, dy); c.stroke(); } }
  else if (D.glow) { c.lineWidth = 1.6; c.strokeRect(dx + 4, dy + dh * 0.32, dw - 8, dh * 0.6); }
  else { c.lineWidth = 1.4; c.strokeRect(dx + 4, dy + dh * 0.3, dw - 8, dh * 0.26); c.strokeRect(dx + 4, dy + dh * 0.62, dw - 8, dh * 0.3); }
  c.restore();
  stk(c, cc => draw.circle(cc, dx + dw - 6, dy + dh * 0.6, 2.6), '#ffd166', 30, undefined, 0.5, 0.1);
  c.restore();
  draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
}
const PLATE_ART = { classic: { rim: '#145a35' }, studs: { rim: '#d9a441', studs: true }, candy: { rim: '#ffffff', stripe: '#e8455e' },
  neon: { rim: '#53ffb0', glow: true }, gold: { rim: '#ffc93c', sheen: true }, crystal: { rim: '#d8f2fb', facets: true } };
const PLATE_GLY = { color: '#ffffff' };
function paintPlateThumb(c, w, h, id) {
  const P = PLATE_ART[id.slice(6)] || PLATE_ART.classic, r = 10;
  c.save(); draw.roundRect(c, 1, 1, w - 2, h - 2, r); c.clip();
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#24214f'], [1, '#141236']]); c.fillRect(0, 0, w, h);
  c.restore();
  const pw = w * 0.66, ph = h * 0.62, px = (w - pw) / 2, py = (h - ph) / 2 + 2;
  if (P.glow) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = draw.radial(c, w / 2, h / 2, 0, pw * 0.7, [[0, 'rgba(83,255,176,0.45)'], [1, 'rgba(83,255,176,0)']]); c.fillRect(0, 0, w, h); c.restore(); }
  draw.sticker(c, rrect(px - 4, py - 4, pw + 8, ph + 8, 14), { fill: P.rim, outline: INK, lineWidth: 2, highlight: 0.35, shadow: 0.25 });
  if (P.stripe) { c.save(); draw.roundRect(c, px - 4, py - 4, pw + 8, ph + 8, 14); c.clip(); c.strokeStyle = P.stripe; c.lineWidth = 3; for (let i = -6; i < 12; i++) { c.beginPath(); c.moveTo(px + i * 8, py - 6); c.lineTo(px + i * 8 + 14, py + ph + 6); c.stroke(); } c.restore(); }
  draw.sticker(c, rrect(px, py, pw, ph, 11), { fill: '#2fbf6a', outline: INK, lineWidth: 1.6, highlight: 0.35, shadow: 0.25 });
  if (P.studs) { c.fillStyle = '#fff0b8'; for (let i = 0; i < 4; i++) { const sx = i % 2 ? px + pw - 1 : px + 1, sy = i < 2 ? py + 1 : py + ph - 1; c.beginPath(); c.arc(sx, sy, 2.4, 0, TAU); c.fill(); c.lineWidth = 0.8; c.strokeStyle = INK; c.stroke(); } }
  if (P.sheen) { c.save(); draw.roundRect(c, px, py, pw, ph, 11); c.clip(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.moveTo(px + pw * 0.15, py); c.lineTo(px + pw * 0.35, py); c.lineTo(px + pw * 0.15, py + ph); c.lineTo(px - pw * 0.05, py + ph); c.closePath(); c.fill(); c.restore(); }
  if (P.facets) { c.save(); draw.roundRect(c, px - 4, py - 4, pw + 8, ph + 8, 14); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.9; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(px - 4 + i * pw / 7, py - 4); c.lineTo(px - 4 + i * pw / 7 + 6, py + 1); c.stroke(); } c.restore(); }
  drawGlyph(c, 'door', w / 2, py + ph / 2, ph * 0.62, PLATE_GLY);
}
// IN / OUT tiles (40+ units): the OUT + IN pair the player gets, fanned side by side (icons.drawPlate in the skin, no
// label: the boot and the door glyph say which is which), each ringed AGAIN in its skin at tile scale (a broad brass rim
// with studs, a candy stripe, a neon tube, gold leaf, crystal facets), so the five skins read at 60 px
const PLATE_GLOW = { in: '#5dffb0', out: '#ff6a8a' };
function plateRing(c, k, w, h, kind) {
  if (k === 'classic' || !PLATE_ART[k]) return;
  const r = Math.max(4, h * 0.27), lw = 4.2, i0 = 2.6 + lw / 2;
  const ring = () => draw.roundRect(c, -w / 2 + i0, -h / 2 + i0, w - i0 * 2, h - i0 * 2, r - i0 * 0.6);
  c.save(); c.lineCap = 'round';
  if (k === 'studs') {
    ring(); c.lineWidth = lw + 1.6; c.strokeStyle = INK; c.stroke(); ring(); c.lineWidth = lw; c.strokeStyle = BRASS; c.stroke();
    const x0 = -w / 2 + i0, y0 = -h / 2 + i0, ww = w - i0 * 2, hh = h - i0 * 2;
    for (let i = 0; i < 4; i++) for (let s = 0; s < 2; s++) {
      const u = (i + 0.5) / 4, v = (s + 0.5) / 2;
      stk(c, cc => draw.circle(cc, x0 + u * ww, s ? y0 + hh : y0, 1.9), '#ffe08a', 20, undefined, 0.6, 0.1);
      if (i < 2) stk(c, cc => draw.circle(cc, i ? x0 + ww : x0, y0 + v * hh, 1.9), '#ffe08a', 20, undefined, 0.6, 0.1);
    }
  } else if (k === 'candy') {
    ring(); c.lineWidth = lw + 1.8; c.strokeStyle = INK; c.stroke(); ring(); c.lineWidth = lw; c.strokeStyle = '#fff6f2'; c.stroke();
    ring(); c.setLineDash([3.6, 3.6]); c.lineWidth = lw; c.strokeStyle = '#e8203c'; c.stroke(); c.setLineDash([]);
  } else if (k === 'neon') {
    const g = PLATE_GLOW[kind];
    c.shadowColor = g; c.shadowBlur = 7 * draw.res(); ring(); c.lineWidth = lw; c.strokeStyle = g; c.stroke(); c.shadowBlur = 0;
    ring(); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.stroke();
  } else if (k === 'gold') {
    ring(); c.lineWidth = lw + 1.8; c.strokeStyle = '#6a4206'; c.stroke();
    ring(); c.lineWidth = lw; c.strokeStyle = draw.gradient(c, -w / 2, -h / 2, w / 2, h / 2, [[0, '#fff0b0'], [0.35, '#ffc93c'], [0.7, '#c8901e'], [1, '#ffe08a']]); c.stroke();
  } else if (k === 'crystal') {
    ring(); c.lineWidth = lw + 1.8; c.strokeStyle = '#2a3a5a'; c.stroke(); ring(); c.lineWidth = lw; c.strokeStyle = '#cfe6ff'; c.stroke();
    ring(); c.setLineDash([2.6, 2.6]); c.lineWidth = lw; c.strokeStyle = '#ffffff'; c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffffff'; draw.star(c, -w / 2 + i0 + 1, -h / 2 + i0 + 1, 4.2, 0.25, 4); c.fill(); draw.star(c, w / 2 - i0 - 1, -h / 2 + i0 + 1, 3.4, 0.25, 4); c.fill();
  }
  c.restore();
}
function paintPlatePair(c, w, h, id) {
  const k = id.slice(6), S = Math.min(w, h);
  c.fillStyle = draw.radial(c, w / 2, h * 0.5, 0, S * 0.62, [[0, 'rgba(255,210,122,0.38)'], [1, 'rgba(255,210,122,0)']]); c.fillRect(0, 0, w, h);
  const pw = Math.round(S * 0.55), ph = Math.round(pw * 0.82);
  for (let i = 0; i < 2; i++) {
    const out = i === 0, px = w / 2 + (out ? -1 : 1) * S * 0.205, py = h * 0.44 + (out ? -2 : 3);
    c.save(); c.translate(px, py); c.rotate(out ? -0.1 : 0.08);
    drawPlate(c, out ? 'out' : 'in', 0, 0, pw, ph, 0, 0, '', false, k);
    plateRing(c, k, pw, ph, out ? 'out' : 'in');
    c.restore();
  }
}
// the Crystal and Gilded door tiles (40+ units): the leaf + frame from cosmetics-art (paintDoorLeaf / paintDoorFrame),
// raised into a whole doorway: a glowing fanlight with spokes over the lintel, the skin's light spilling round it, a
// polished knob, a stone step and sparkles, so the pale leaves never read as a flat panel
const DOOR_LIGHT = { crystal: ['rgba(191,228,255,', '#ffffff'], royal: ['rgba(255,210,122,', '#ffe7a0'] };
function paintDoorTile(c, w, h, id) {
  const k = id.slice(5), D = COSM.DOOR ? COSM.DOOR[k] : null, L = DOOR_LIGHT[k];
  if (!D || !L || typeof COSM.paintDoorLeaf !== 'function' || typeof COSM.paintDoorFrame !== 'function') { thumbBaker(id)(c, w, h); return; }
  const S = Math.min(w, h), cx = w / 2, dw = S * 0.38, dh = S * 0.5, dx = cx - dw / 2, dy = h - S * 0.1 - dh, sk = dw / 80;
  const fy = dy - 12 * sk, rx = dw / 2 + 13 * sk, ry = rx * 0.82;
  c.fillStyle = draw.radial(c, cx, dy + dh * 0.2, 0, S * 0.6, [[0, L[0] + '0.55)'], [0.55, L[0] + '0.2)'], [1, L[0] + '0)']]); c.fillRect(0, 0, w, h);
  // the wall recess behind the doorway
  c.fillStyle = '#0a0820';
  c.beginPath(); c.moveTo(dx - 16 * sk, dy + dh); c.lineTo(dx - 16 * sk, fy); c.ellipse(cx, fy, rx + 3, ry + 3, 0, Math.PI, TAU); c.lineTo(dx + dw + 16 * sk, dy + dh); c.closePath(); c.fill();
  // the fanlight: the skin's fan glass, spokes, a frame arch in the skin colour
  c.save(); c.beginPath(); c.ellipse(cx, fy, rx, ry, 0, Math.PI, TAU); c.closePath(); c.clip();
  c.fillStyle = draw.radial(c, cx, fy, 1, ry, [[0, D.fan[0]], [0.55, D.fan[1]], [1, D.fan[2]]]); c.fillRect(cx - rx, fy - ry, rx * 2, ry);
  c.strokeStyle = D.spoke; c.lineWidth = 1.3;
  for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; c.beginPath(); c.moveTo(cx, fy); c.lineTo(cx + Math.cos(a) * rx, fy + Math.sin(a) * ry); c.stroke(); }
  c.restore();
  c.beginPath(); c.ellipse(cx, fy, rx, ry, 0, Math.PI, TAU); c.lineWidth = 4.4; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = D.frame; c.stroke();
  stk(c, cc => draw.circle(cc, cx, fy - ry, 2.6), k === 'royal' ? '#ffc94a' : '#e8f6ff', 24, undefined, 0.6, 0.1);
  // the lit opening, the frame and the leaf
  c.fillStyle = draw.radial(c, cx, dy + dh * 0.5, 2, dh * 0.8, [[0, '#ffe3a8'], [0.4, '#ffb347'], [1, '#4a1426']]); c.fillRect(dx, dy, dw, dh);
  c.save(); c.translate(dx, dy); c.scale(sk, sk);
  COSM.paintDoorFrame(c, k, 0, 0, 80, dh / sk); COSM.paintDoorLeaf(c, k, 80, dh / sk);
  c.restore();
  // the light round the door edges + a polished knob on the leaf's handle side
  c.save(); c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L[0] + '0.5)'; c.lineWidth = 3; draw.roundRect(c, dx - 1, dy - 1, dw + 2, dh + 2, 3); c.stroke();
  c.restore();
  stk(c, cc => draw.circle(cc, dx + 10.5 * sk, dy + dh * 0.5 + 2 * sk, 2.4), k === 'royal' ? '#ffd36a' : '#f4fbff', 24, undefined, 0.7, 0.15);
  stk(c, cc => draw.roundRect(cc, dx - 18 * sk, dy + dh - 1, dw + 36 * sk, 5, 2), '#3a3684', 24, undefined, 0.3, 0.25);
  c.fillStyle = L[1];
  draw.star(c, cx - rx - 2, fy - ry * 0.3, 3.4, 0.25, 4); c.fill(); draw.star(c, cx + rx + 3, fy + 4, 2.6, 0.25, 4); c.fill(); draw.star(c, cx + rx * 0.5, fy - ry - 4, 2.2, 0.25, 4); c.fill();
}
// the shop's own painter for a thumbnail of 40+ units, or null (cosmetics-art's drawItemThumb draws the rest)
function shopThumb(id, size) {
  if (size < 40) return null;
  if (id === 'door.crystal' || id === 'door.royal') return paintDoorTile;
  if (id.indexOf('plate.') === 0) return paintPlatePair;
  return null;
}
const THUMB_FN = {};
function thumbBaker(id) {
  let f = THUMB_FN[id];
  if (!f) {
    const slot = id.slice(0, id.indexOf('.'));
    f = function (c, w, h) {
      if (slot === 'club') paintClubThumb(c, w, h, id);
      else if (slot === 'rope') paintRopeThumb(c, w, h, id);
      else if (slot === 'door') paintDoorThumb(c, w, h, id);
      else paintPlateThumb(c, w, h, id);
    };
    THUMB_FN[id] = f;
  }
  return f;
}
// an item's square thumbnail (cosmetics-art drawItemThumb, else the shop's own tile art) for one draw.cached sprite: the
// key is made once by the caller (thumbKey), never per frame
const ITH_FN = {};
function itemThumbFn(id) {
  let f = ITH_FN[id];
  if (!f) {
    f = function (cc, w, h) {
      const own = shopThumb(id, Math.min(w, h));
      if (own) { own(cc, w, h, id); return; }
      if (typeof COSM.drawItemThumb === 'function' && COSM.drawItemThumb(cc, id, w / 2, h / 2, Math.min(w, h))) return;
      if (id.indexOf('outfit.') === 0 || id.indexOf('set.') === 0) paintGem(cc, w / 2, h / 2, h * 0.7); else thumbBaker(id)(cc, w, h);
    };
    ITH_FN[id] = f;
  }
  return f;
}
function thumbKey(id, size) { return 'shop.sq.' + id + '.' + size; }
function drawThumb(ctx, key, id, x, y, size, alpha) {
  SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = alpha === undefined ? 1 : alpha; SPR.rot = 0;
  draw.sprite(ctx, draw.cached(key, size, size, itemThumbFn(id)), x, y, SPR);
  SPR.alpha = 1;
}
// ---- theme stages for a theme's dancers (bundle cards, outfit cards, the Starter, their sheets), baked from the REAL
// party-room recipe of that theme (cosmetics-art THEMES[theme].room, the one world.js paints the party window from): the
// wall gradient + the theme's wall motif (synthwave sun + neon tubes, drapes, the tent's Sadu bands, the starfield,
// bamboo, cobwebs, gold leaf), the chandelier's light, the wainscot + rail, the theme's deco and chandelier, bunting in the
// room's flag colours, then a stage in the theme's wood / skirt / trim with footlights and the theme's front props.
// feet = the y the dancers stand on (the stage's front edge). Rock Star (an outfit theme with no party theme) has its own
// black + flame-red room: a star burst, lightning bolts and amp stacks.
const ROCK_TH = { id: 'rock', room: { wall: ['#100309', '#260812', '#380c1a'], motif: 'rock', wains: ['#1c060c', '#110308'], rail: '#ff6a3c',
  stage: ['#2a221e', '#44362c'], skirt: ['#b3203a', '#5a0c18'], skirtTrim: '#ffc93c', foot: '#ff6a3c',
  flags: ['#ff6a3c', '#16131c', '#ffc93c', '#e8322f', '#f6efd6', '#16131c'], chand: '', front: 'amps', light: '#ff6a3c' } };
const STAGE_L = { RW: 0, RH: 0, archR: 26, lobby: false, room: { fb: 0 } };
const CHANDS = { crystal: 1, ring: 1, lanterns: 1, orb: 1, paper: 1, candles: 1, gold: 1 };
function stageTheme(theme) { return theme === 'rock' ? ROCK_TH : (COSM.THEMES && COSM.THEMES[theme]) || null; }
function paintRockWall(c, w, wt) {
  const cx = w / 2, cy = wt * 0.62;
  c.fillStyle = 'rgba(255,106,60,0.1)';
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, b = a + 0.11; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); c.lineTo(cx + Math.cos(b) * w, cy + Math.sin(b) * w); c.closePath(); c.fill(); }
  c.save(); c.globalCompositeOperation = 'lighter'; draw.glow(c, cx, cy, w * 0.36, '#ff6a3c', 0.42); c.restore();
  for (let s = 0; s < 2; s++) {
    const x = s ? w * 0.86 : w * 0.14, y0 = 6, y1 = wt - 6, k = (y1 - y0) / 4;
    const bolt = cc => { cc.beginPath(); cc.moveTo(x + 4, y0); cc.lineTo(x - 7, y0 + k * 2.1); cc.lineTo(x + 1, y0 + k * 2.1); cc.lineTo(x - 5, y1); cc.lineTo(x + 9, y0 + k * 1.7); cc.lineTo(x + 1, y0 + k * 1.7); cc.lineTo(x + 10, y0); cc.closePath(); };
    draw.sticker(c, bolt, { fill: '#ffc93c', outline: INK, lineWidth: 1.8, highlight: 0.4, shadow: 0.2, bounds: [x - 7, y0, 17, y1 - y0] });
  }
  c.fillStyle = 'rgba(255,201,60,0.55)';
  for (let i = 0; i < 9; i++) { draw.star(c, ((i * 67) % 97) / 97 * w, 6 + ((i * 29) % 41) / 41 * (wt - 14), 2 + (i % 3), 0.45, 5); c.fill(); }
}
function paintAmps(c, w, F) {
  for (let s = 0; s < 2; s++) {
    const x = s ? w - 16 : 16;
    for (let k = 0; k < 2; k++) {
      const bw = 26, bh = 20, by = F - (k + 1) * bh;
      stk(c, rrect(x - bw / 2, by, bw, bh, 2.5), '#16131c', 40, undefined, 0.2, 0.25);
      c.fillStyle = '#2c2732'; draw.roundRect(c, x - bw / 2 + 3, by + 3, bw - 6, bh - 6, 2); c.fill();
      c.strokeStyle = 'rgba(255,106,60,0.75)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, by + bh / 2, 5.5, 0, TAU); c.stroke();
      c.fillStyle = '#c9c9d6'; c.fillRect(x - bw / 2 + 3, by + 1, 3, 1.4);
    }
  }
}
function paintBunting(c, w, flags) {
  const y0 = 5, sag = 9, n = Math.max(8, Math.round(w / 22));
  c.strokeStyle = 'rgba(20,10,30,0.85)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(w / 2, y0 + sag * 2, w, y0); c.stroke();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = u * w, y = y0 + 4 * sag * u * (1 - u);
    c.fillStyle = flags[i % flags.length]; c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.lineTo(x, y + 9); c.closePath(); c.fill();
    c.lineWidth = 0.9; c.strokeStyle = 'rgba(8,4,16,0.8)'; c.stroke();
  }
}
function paintThemeStage(c, w, h, theme, feet) {
  const TH = stageTheme(theme);
  if (!TH) { themeBackdrop(c, 0, 0, w, h, theme); return; }
  const TR = TH.room, F = feet, fb = F - 9, wt = Math.max(20, fb - 18), L = STAGE_L;
  L.RW = w; L.RH = F - 1; L.room.fb = fb; L.archR = Math.min(30, h * 0.3); L.lobby = false;
  c.save(); draw.roundRect(c, 1, 1, w - 2, h - 2, 14); c.clip();
  // the wall + its motif
  c.fillStyle = draw.gradient(c, 0, 0, 0, fb, [[0, TR.wall[0]], [0.5, TR.wall[1]], [1, TR.wall[2]]]); c.fillRect(0, 0, w, fb + 1);
  if (TR.motif === 'rock') paintRockWall(c, w, wt);
  else if (TR.motif !== 'damask' && typeof COSM.paintRoomMotif === 'function') COSM.paintRoomMotif(c, L, TH, wt);
  else {
    c.fillStyle = 'rgba(255,196,130,0.075)';
    for (let y = 7, row = 0; y < wt; y += 14, row++) for (let x = (row & 1) ? 9 : 1; x < w + 8; x += 16) { c.beginPath(); c.moveTo(x, y - 4.5); c.lineTo(x + 3, y); c.lineTo(x, y + 4.5); c.lineTo(x - 3, y); c.closePath(); c.fill(); }
  }
  // the chandelier's light on the wall, the wainscot + rail
  c.save(); c.globalCompositeOperation = 'lighter'; draw.glow(c, w / 2, 10, w * 0.44, TR.light, 0.3); c.restore();
  c.fillStyle = draw.gradient(c, 0, wt, 0, fb, [[0, TR.wains[0]], [1, TR.wains[1]]]); c.fillRect(0, wt, w, fb - wt + 1);
  c.strokeStyle = 'rgba(255,190,120,0.12)'; c.lineWidth = 1;
  for (let x = 4; x < w; x += 30) { draw.roundRect(c, x, wt + 3, 24, fb - wt - 6, 2); c.stroke(); }
  c.fillStyle = TR.rail; c.fillRect(0, wt - 2, w, 2.4); c.fillStyle = 'rgba(255,236,190,0.45)'; c.fillRect(0, wt - 2, w, 0.7);
  // the theme's deco (drapes, tent poles, string lights, searchlights), bunting, the chandelier
  if (TR.motif !== 'rock' && typeof COSM.paintRoomDeco === 'function') COSM.paintRoomDeco(c, L, TH);
  if (TR.motif !== 'drapes') paintBunting(c, w, TR.flags);
  if (CHANDS[TR.chand] && typeof COSM.paintChandelierTheme === 'function') { c.save(); c.translate(w / 2 - 33 * 0.7, -3); c.scale(0.7, 0.7); COSM.paintChandelierTheme(c, TH); c.restore(); }
  // the stage: the top in the theme's wood, the skirt + its trim, footlights
  c.fillStyle = draw.gradient(c, 0, fb, 0, F, [[0, TR.stage[0]], [1, TR.stage[1]]]); c.fillRect(0, fb, w, F - fb);
  c.fillStyle = 'rgba(20,8,4,0.3)'; c.fillRect(0, fb + 3, w, 0.7); c.fillRect(0, fb + 6, w, 0.7);
  c.fillStyle = draw.gradient(c, 0, F, 0, h, [[0, TR.skirt[0]], [1, TR.skirt[1]]]); c.fillRect(0, F, w, h - F);
  c.fillStyle = 'rgba(0,0,0,0.22)'; for (let x = 4; x < w; x += 9) c.fillRect(x, F + 1, 2.2, h - F);
  c.fillStyle = TR.skirtTrim; c.fillRect(0, F - 0.6, w, 2);
  c.fillStyle = INK; c.fillRect(0, F + 1.4, w, 0.9);
  for (let x = 22; x < w - 10; x += 34) { draw.glow(c, x, F + 4, 10, TR.foot, 0.5); c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(x, F + 5, 1.6, 0, TAU); c.fill(); }
  // the theme's front props on the stage's corners
  if (TR.front === 'amps') paintAmps(c, w, F);
  else if (typeof COSM.paintRoomFrontTheme === 'function' && TH.id !== 'house') COSM.paintRoomFrontTheme(c, L, TH);
  // a soft vignette at the sides keeps the dancers the brightest thing
  c.fillStyle = draw.gradient(c, 0, 0, w, 0, [[0, 'rgba(6,4,22,0.4)'], [0.12, 'rgba(6,4,22,0)'], [0.88, 'rgba(6,4,22,0)'], [1, 'rgba(6,4,22,0.4)']]); c.fillRect(0, 0, w, h);
  c.restore();
  draw.roundRect(c, 1, 1, w - 2, h - 2, 14); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
}
const STAGE_FN = {};
function stageBaker(theme, feet) {
  const k = theme + '.' + feet;
  let f = STAGE_FN[k];
  if (!f) { f = function (c, w, h) { paintThemeStage(c, w, h, theme, feet); }; STAGE_FN[k] = f; }
  return f;
}

// ================================================================ helpers
function fmt(n) {
  n = Math.max(0, Math.floor(n || 0));
  const s = String(n);
  if (n < 1000) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += ','; out += s[i]; }
  return out;
}
export function fmtGems(n) { return fmt(n); }
function itemName(id) {
  const it = itemById(id);
  if (it && it.slot === 'outfit') return i18n.t('shop.outfit_name', { theme: i18n.t('shop.th.' + it.theme), name: i18n.t('sp_' + it.species) });
  return i18n.t('shop.it.' + id);
}
function themeName(t) { return i18n.t('shop.th.' + t); }
// the native shell's own platform wins (an emulated or odd user agent never makes an iOS build name Google Play)
function isAndroid() {
  try {
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.getPlatform) return C.getPlatform() === 'android';
    return /Android/i.test(navigator.userAgent || '');
  } catch (e) { return false; }
}
function productOf(id) { for (let i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
function bundleOf(theme) { for (let i = 0; i < PRODUCTS.length; i++) { const p = PRODUCTS[i]; if (p.kind === 'bundle' && p.id === 'mb_bundle_' + theme) return p; } return null; }
function packTier(p) { let n = 0; for (let i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].kind === 'gems') { n++; if (PRODUCTS[i] === p) return n; } return 1; }
function bestPack() {
  let best = null, bv = 1e9;
  for (let i = 0; i < PRODUCTS.length; i++) { const p = PRODUCTS[i]; if (p.kind !== 'gems' || !p.gems) continue; const v = p.usd / p.gems * 1000; if (v < bv) { bv = v; best = p; } }
  return best;
}
// the House spec of a member wearing an outfit (one shared object per outfit id, so actor caches stay warm)
const OUT_SPECS = {};
function outfitSpec(sp, id) {
  const k = sp + '|' + id;
  let s = OUT_SPECS[k];
  if (!s) { s = {}; const b = HOUSE[sp]; for (const f in b) s[f] = b[f]; s.outfit = id; OUT_SPECS[k] = s; }
  return s;
}
function outfitId(theme, sp) { return 'outfit.' + theme + '.' + sp; }
const LOOK_A = { club: '', rope: '', door: '', plate: '', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
const LOOK_B = { club: '', rope: '', door: '', plate: '', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
function lookWith(out, slot, id) {
  wallet.look(out);
  if (slot && id) { if (slot === 'outfit') { const it = itemById(id); if (it) out.outfit[it.species] = id; } else out[slot] = id; }
  return out;
}
function homeWorld() {
  const h = scenes.current;
  return h && h.name === 'home' && h.world ? h.world : null;
}
function setTheme(id) { if (typeof party.setTheme === 'function') party.setTheme(id); }
function openUrl(u) { try { window.open(u, '_blank', 'noopener'); } catch (e) { /* blocked: nothing to do */ } }
// a counted shop string: '<key>_<pluralCat>' when this dictionary has that variant (Arabic: one / two / few), else key
function tp(key, n, params) {
  const D = DICT[i18n.lang] || DICT.en, k = key + '_' + pluralCat(n, i18n.lang);
  return i18n.t(D[k] !== undefined ? k : key, params);
}
// (the item sheet's money reference of a gem price is payments.gemRef: n gems at the entry pack's store price, the rate
// MONETIZATION §2.2 quotes; the rate a small spender actually pays, never the cheaper Vault rate)
// what a content product (a theme bundle, the Crystal set, Club Owner) holds for THIS player, in gems: the items left
// (CL.worth, a band look still missing counted at the Whole-set price SET_LOOK, the way the Outfits tab sells it) + what
// buying it now pays back for items bought with gems (CL.back, the wallet's real refund); OTHER = items owned through
// another purchase (paid back nothing). Fills CL; -> the worth
let OTHER = 0;
function worthYou(pid) {
  wallet.contentLeft(pid, CL);
  OTHER = 0;
  const p = productOf(pid);
  if (p && p.items) for (let i = 0; i < p.items.length; i++) {
    const v = wallet.ownedVia(p.items[i]);
    if (v && v !== 'gems' && v !== 'free') OTHER++;
    if (!v) { const it = itemById(p.items[i]); if (it && it.slot === 'outfit' && it.gems > SET_LOOK) CL.worth -= it.gems - SET_LOOK; }
  }
  return CL.worth + CL.back;
}
// 'Worth 1,080 gems', or 'Worth 480 gems to you' once some of its items are owned
function worthLine(pid) {
  const n = worthYou(pid);
  return i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(n) });
}
// the line that says what a purchase pays back (only when it does) and that items got elsewhere are not refunded
function backLine() {
  let s = CL.back > 0 ? i18n.t('shop.back_n', { n: fmt(CL.back) }) : '';
  if (OTHER > 0) s += (s ? ' ' : '') + i18n.t('shop.back_other');
  return s;
}
// a content deal stays in the shop while it still holds enough for this player (TUNE.minWorth)
function dealWorthIt(pid) { const m = TUNE.minWorth[pid] || 0; return !m || wallet.purchased(pid) || worthYou(pid) >= m; }
// the Starter Pack's value: its gems + its boosters at their single gem prices (its 5 Rock Star looks are not sold for gems)
function starterWorth() {
  const p = productOf('mb_starter_pack');
  if (!p) return 0;
  let n = p.gems || 0;
  if (p.boosters) for (let i = 0; i < BOOSTER_IDS.length; i++) { const B = BOOSTERS[BOOSTER_IDS[i]]; n += (p.boosters[BOOSTER_IDS[i]] | 0) * (B ? B.gems : 0); }
  return n;
}
// the Club Pass's value: its 30 days of gems + the 30 rotating boosters at their single gem prices (the run bonus is not
// counted: it depends on the player) = 2,250
function passWorth() {
  let n = PASS.days * PASS.gems;
  for (let d = 0; d < PASS.days; d++) { const B = BOOSTERS[PASS.rotate[d % PASS.rotate.length]]; n += B ? B.gems : 0; }
  return n;
}
// the gems a pack pays on its next purchase (a first buy of the 3 small packs pays FIRST_BUY.mult)
function packGems(p) { return p && p.gems ? (p.kind === 'gems' && wallet.firstBuy(p.id) ? p.gems * FIRST_BUY.mult : p.gems) : 0; }
// the Gold Star Road's whole fixed track: { gems (gem rewards + boosters and skins at their gem prices), b (boosters),
// k (skins), s (stars of its last step) }
const GOLDV = { n: 0, b: 0, k: 0, s: 0 };
function goldWorth() {
  if (GOLDV.s) return GOLDV;
  const G = GOLD_ROAD.steps;
  for (let i = 0; i < G.length; i++) {
    const r = G[i];
    if (r.gems) GOLDV.n += r.gems;
    if (r.boosters) for (let k = 0; k < BOOSTER_IDS.length; k++) { const q = r.boosters[BOOSTER_IDS[k]] | 0, B = BOOSTERS[BOOSTER_IDS[k]]; GOLDV.b += q; GOLDV.n += q * (B ? B.gems : 0); }
    if (r.item) { const it = itemById(r.item); GOLDV.k++; if (it && it.gems) GOLDV.n += it.gems; }
  }
  const sp = STAR_ROAD.steps[Math.min(G.length, STAR_ROAD.steps.length) - 1];
  GOLDV.s = sp ? sp.stars : 0;
  return GOLDV;
}
// what VIP would have added over every night so far (result.js adds each night's REWARD.vipMiss): the VIP card shows it
// once it reaches 200. Its own save key (dev pages point it at a scratch key with useVipMissKey)
const VMISS = { key: 'shop.vipmiss' };
export function useVipMissKey(k) { if (k) VMISS.key = String(k); }
export function addVipMiss(n) {
  n = Math.floor(+n || 0);
  if (!(n > 0) || wallet.vip()) return;
  try { save.set(VMISS.key, vipMissTotal() + n); } catch (e) { /* storage off: the card simply never shows it */ }
}
export function vipMissTotal() { let v = 0; try { v = +save.get(VMISS.key, 0) || 0; } catch (e) { v = 0; } return Math.max(0, Math.floor(v)); }
// the toast for a payments.restore() result (the shop footer and Settings say the same thing) -> { key, params, icon }, or
// null for a cancelled Apple ID sheet (no toast). A fresh install restores silently at launch, so 'ok' with nothing new
// but owned > 0 says it is all here
const RN = { key: '', params: null, icon: '' };
export function restoreNote(r, mock) {
  const s = r && r.status, n = r && r.restored ? r.restored : 0, own = r && r.owned ? r.owned : 0;
  RN.params = null; RN.icon = '';
  if (s === 'cancelled') return null;
  if (s === 'failed') RN.key = 'shop.restore_failed';
  else if (s === 'unavailable') RN.key = mock ? 'shop.restore_demo' : 'shop.in_app';
  else if (n > 0) { RN.key = 'shop.restored_n'; RN.params = { n: n }; RN.icon = 'check'; }
  else if (own > 0) { RN.key = 'shop.restored_all'; RN.params = { n: own }; RN.icon = 'check'; }
  else RN.key = 'shop.restored_none';
  return RN;
}

// createWrap(w, h, o) -> { set, align, draw(ctx, x, y, alpha), free }: a wrapped multi-line label (up to o.lines) in its own
// canvas, re-baked when the string / fonts / resolution change (result's VIP card uses it too)
export function createWrap(w, h, o) {
  const L = { w: w, h: h, o: o, str: '', cv: null, gen: -1, res: 0, lines: o.lines || 2 };
  L.bake = function (c, bw, bh) {
    const O = L.o, lines = text.wrap(c, L.str, bw - 8, O.size, O.weight || 700, O.font);
    const n = Math.min(L.lines, lines.length), lh = O.size * 1.32, y0 = bh / 2 - (n - 1) * lh / 2;
    const a = O.align || 'center', x = a === 'left' ? 4 : a === 'right' ? bw - 4 : bw / 2;
    for (let i = 0; i < n; i++) draw.text(c, lines[i], x, y0 + i * lh, O);
  };
  L.set = function (str) { str = str === undefined || str === null ? '' : String(str); if (str !== L.str) { L.str = str; L.gen = -1; } return L; };
  L.align = function (a) { if ((L.o.align || 'center') !== a) { L.o.align = a; L.gen = -1; } return L; };
  L.draw = function (ctx, x, y, alpha) {
    if (!L.str) return;
    const res = draw.res(), fg = fontGen();
    if (L.gen !== fg || L.res !== res || !L.cv) { L.cv = draw.bake(L.w, L.h, L.bake); L.gen = fg; L.res = res; }
    const a = L.o.align;
    WSPR.anchor = a === 'left' ? AN_L : a === 'right' ? AN_R : AN_C; WSPR.alpha = alpha === undefined ? 1 : alpha;
    draw.sprite(ctx, L.cv, x, y, WSPR);
  };
  L.free = function () { L.cv = null; L.gen = -1; };
  return L;
}
const WSPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5], AN_L = [0, 0.5], AN_R = [1, 0.5], AN_T = [0.5, 0], AN_TL = [0, 0];
function freeLabel(L) { if (L && L.cv) { L.cv = null; L.gen = -1; } }

// ================================================================ state
const st = { t: 0, active: false, inited: false, a: 0, slide: 1, closing: -1, popup: false, tab: 'deals', from: '', arm: false,
  top: 0, bot: 0, viewTop: 0, viewBot: 0, contentH: 0, maxScroll: 0, dirty: true, disp: 0, pending: 0, bump: 0, shownN: -1,
  tryT: -1, tryA: 1, hintW: 200, popCY: 80, autoClose: 0, landN: 0, ind: 0, restoring: false, provider: 'none', lastProv: '', layoutH: -1, layoutLang: '', counterY: 0, pop: 0,
  payBusy: false, session: 0, buyPid: '', confetti: false };
const SCROLL = { deals: 0, gems: 0, looks: 0, club: 0, boosters: 0, free: 0 };
const sc = { v: 0, pid: -1, startY: 0, startX: 0, lastY: 0, moved: false, btn: null, card: null, cardX: 0, cardY: 0, horiz: false };
const CARDS = {};                 // id -> card (made once in init)
const LIST = { deals: [], gems: [], looks: [], club: [], boosters: [], free: [] };
let K = null;                     // the UI kit pieces made in init() (labels, panels, buttons, toast)
let offWallet = null, offPrices = null, offPurchase = null;
const PIG = { gems: 0, cap: 720, minBreak: 360, canBreak: false, full: false };
const GIFT_O = { ready: false, day: 1, gems: 5, xray: 0 };
const STREAK_LIST = [];
const ROAD = { stars: 0, next: 0, reward: null, done: 0, gold: false, goldDone: 0, goldReward: null };
const GB = { steps: 0, gems: 0, items: 0, boosters: 0 };                  // wallet.goldBacklog
const CL = { total: 0, owned: 0, left: 0, worth: 0, back: 0 };            // wallet.contentLeft
const MEDAL_LIST = [], MEDAL_VIEW = [];      // wallet.medals rows; the Medals card's order (refresh sorts)
const DANCE = { instrument: true, tempo: TUNE.dance.tempo, phase: 0 };
const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };

// ---- the buttons drawn inside the scrolling cards (own press handling: a drag scrolls instead)
const SP_DOWN = { to: 1, stiffness: 900, damping: 42 };
const SP_UP = { to: 0, stiffness: 620, damping: 17 };
const SP_BUMP = { to: 0, stiffness: 380, damping: 10, velocity: 7 };
const SP_IN = { to: 1, stiffness: 260, damping: 22 };
const SP_OUT = { to: 0, stiffness: 420, damping: 30 };
const SP_IND = { to: 0, stiffness: 420, damping: 30 };
const SP_COUNT = { to: 0, stiffness: 520, damping: 14, velocity: 6 };
const SP_SHEET = { to: 1, stiffness: 320, damping: 20 };
const SP_SHEET0 = { to: 0, stiffness: 520, damping: 34 };
const BTN_O = { color: '', textColor: '', icon: '', size: 0, rim: '', iconColor: '', press: 0, glow: 0, alpha: 1 };
const ICON_O = { color: '', glyphColor: '', rim: '', press: 0, alpha: 1 };
// kind: 'iap' (label = the store price), 'gem' (gem glyph + price, two taps), 'act' (a word: Wear / Use / Claim ...)
function cbtn(o) {
  const b = { id: o.id || '', lx: o.lx || 0, ly: o.ly || 0, w: o.w || 100, h: o.h || 40, kind: o.kind || 'act', label: '', price: 0, pre: '',
    color: o.color || AMBER, textColor: o.textColor || '', rim: o.rim || '', icon: o.icon || '', iconColor: o.iconColor || '', size: o.size || 0,
    press: 0, bump: 0, confirm: 0, armT: 0, enabled: true, hidden: false, glow: 0, onTap: o.onTap || null, arg: o.arg || '', n: o.n || 1,
    lp: null, lc: null, lcp: null, lpre: null, pw: 0, prew: 0, cw: 0, secondary: !!o.secondary, offKey: '', offN: 0, pid: '' };
  if (b.secondary) { b.color = INDIGO; b.rim = BRASS; if (!b.textColor) b.textColor = CREAM; }
  if (b.kind === 'gem') gemLabels(b, o.size || 16);
  return b;
}
// a gem price's labels: the price (lp) and its prefix (lpre) in white on a brown outline over the amber face; in the
// confirm state the word (lc, 'Confirm') and the price again (lcp) in white on a deep-green outline over the green face,
// all at the button's own size (never a small caption)
function gemLabels(b, fs) {
  b.lp = createLabel(Math.max(60, b.w - 20), Math.ceil(fs * 1.7), { size: fs, weight: 800, color: '#ffffff', outline: '#6a3f00', outlineWidth: 3.5 });
  b.lcp = createLabel(Math.max(60, b.w - 20), Math.ceil(fs * 1.7), { size: fs, weight: 800, color: '#ffffff', outline: '#0b3d22', outlineWidth: 3.5 });
  b.lc = createLabel(Math.max(60, b.w - 10), Math.ceil(fs * 1.7), { size: fs, weight: 800, color: '#ffffff', outline: '#0b3d22', outlineWidth: 3.5 });
  b.lpre = createLabel(Math.max(44, b.w - 70), Math.ceil(fs * 1.7), { size: fs, weight: 800, color: '#ffffff', outline: '#6a3f00', outlineWidth: 3.5 });
}
function setGemPrice(b, n, pre) {
  b.price = n; b.pre = pre || '';
  const s = fmt(n), fs = b.lp.o.size;
  if (b.lp.str !== s) { b.lp.set(s); b.lcp.set(s); b.pw = measure(s, fs, 800) + 3; }
  b.lpre.set(b.pre); b.prew = b.pre ? measure(b.pre, fs, 800) + 6 : 0;
  const cs = i18n.t('shop.confirm_buy');
  if (b.lc.str !== cs) { b.lc.set(cs); b.cw = measure(cs, fs, 800) + 6; }
}
// the face content of a gem button, centred on (0, 0): '[pre] 💎 price'; armed (confirm > 0): 'Confirm 💎 price' on one
// line in white over the green face; a button too narrow for all of it says just 'Confirm' (x1 / x5), and a look chip
// (~56 wide) keeps '💎 price' (its green face and pulse say it)
function gemFace(ctx, b) {
  const conf = b.confirm > 0, gs = b.lp.o.size >= 17 ? 20 : 17, rtl = i18n.isRTL, room = (b.w || 120) - 18;
  const word = conf && b.cw + gs + b.pw + 10 <= room;
  if (conf && !word && b.cw <= room) { b.lc.draw(ctx, 0, 1); return; }
  const lead = conf ? (word ? b.cw : 0) : b.prew;
  const total = lead + gs + 3 + b.pw, y = 1, P = conf ? b.lcp : b.lp, W = conf ? b.lc : b.lpre;
  let x = -total / 2;
  if (rtl) {
    P.draw(ctx, x + b.pw / 2, y); x += b.pw + 3;
    drawGem(ctx, x + gs / 2, y, gs); x += gs + 3;
    if (lead) W.draw(ctx, x + lead / 2, y);
  } else {
    if (lead) { W.draw(ctx, x + lead / 2, y); x += lead; }
    drawGem(ctx, x + gs / 2, y, gs); x += gs + 3;
    P.draw(ctx, x + b.pw / 2, y);
  }
}
// an armed gem button's pulse (scale), the same for card buttons and the sheet's
function armPulse(conf) { return conf > 0 ? 1 + 0.045 * (0.5 + 0.5 * Math.sin(st.t * 9)) : 1; }
function drawCBtn(ctx, b, x, y, alpha) {
  if (b.hidden) return;
  const o = BTN_O, pr = clamp(b.press, 0, 1), s = (1 + 0.05 * b.bump) * (b.kind === 'gem' ? armPulse(b.confirm) : 1);
  o.press = pr; o.glow = b.glow; o.alpha = (alpha === undefined ? 1 : alpha) * (b.enabled ? 1 : 0.55);
  o.color = b.kind === 'gem' && b.confirm > 0 ? GO : b.color; o.textColor = b.textColor; o.icon = b.icon; o.size = b.size; o.rim = b.rim; o.iconColor = b.iconColor;
  ctx.save(); ctx.translate(x, y); if (s !== 1) ctx.scale(s, s);
  drawButton(ctx, 0, 0, b.w, b.h, b.kind === 'gem' ? '' : b.label, o);
  if (b.kind === 'gem') {
    const dy = Math.max(4, b.h * 0.12) * pr * 0.85, k = 1 - 0.04 * pr;
    ctx.translate(0, dy); if (k !== 1) ctx.scale(k, k);
    if (o.alpha !== 1) ctx.globalAlpha *= o.alpha;
    gemFace(ctx, b);
  }
  ctx.restore();
}

// ================================================================ cards
// card: { id, kind, x (content-local), y, w, h, panel, draw(ctx, c, X, Y), btns [], tap(c, x, y) (body tap), specs, actors,
// danceY / danceH / danceW (the live dancers' row), lead: labels aligned to the reading side }
function mkCard(id, kind, h, o) {
  const c = { id: id, kind: kind, x: 0, y: 0, w: TUNE.content.w, h: h, panel: null, draw: null, btns: [], tap: null, specs: null, actors: null,
    danceY: 0, danceH: 80, danceW: 56, danceX: null, lead: [], L: {}, vis: false, flash: 0, data: null };
  if (o) for (const k in o) c[k] = o[k];
  CARDS[id] = c;
  return c;
}
function leadLabel(c, name, w, size, color, outline, weight) {
  const L = createLabel(w, Math.ceil(size * 1.9), { size: size, weight: weight || 800, color: color, outline: outline || '', outlineWidth: outline ? Math.max(2.5, size * 0.24) : 0, align: 'left' });
  c.L[name] = L; c.lead.push(L);
  return L;
}
function midLabel(c, name, w, size, color, outline) {
  const L = createLabel(w, Math.ceil(size * 1.9), { size: size, weight: 800, color: color, outline: outline || '', outlineWidth: outline ? Math.max(2.5, size * 0.24) : 0 });
  c.L[name] = L;
  return L;
}
// x in card space mirrored for RTL
function mx(c, lx) { return i18n.isRTL ? c.w - lx : lx; }
function alignLead(c) { const a = i18n.isRTL ? 'right' : 'left'; for (let i = 0; i < c.lead.length; i++) c.lead[i].align(a); }
function ensureActors(c) {
  if (c.actors || !c.specs) return;
  c.actors = [];
  const n = c.specs.length;
  for (let i = 0; i < n; i++) {
    const a = createActor(c.specs[i]);
    DANCE.phase = (i * 0.17) % 1;
    a.setState('dance', DANCE);
    a.update(1 / 120);
    const b = a.bounds(), s = Math.min(c.danceH / b.h, c.danceW / b.w, 0.62);
    c.actors.push({ a: a, s: s, ox: -(b.x + b.w / 2) * s });
  }
}
function dropActors(c) { c.actors = null; }
// the live dancers across a card's stage (danceY = their feet, card-local)
function drawDancers(ctx, c, X, Y, x0, x1) {
  ensureActors(c);
  const A = c.actors;
  if (!A) return;
  const n = A.length, rtl = i18n.isRTL;
  for (let i = 0; i < n; i++) {
    const k = rtl ? n - 1 - i : i, cx = X + x0 + (x1 - x0) * (k + 0.5) / n, fy = Y + c.danceY, lk = c.locked && c.locked[i];
    draw.shadowBlob(ctx, cx, fy + 1, 18, 4, 0.45);
    // a member not in the band yet: dimmed, a lock at its feet
    AO.alpha = lk ? 0.42 : 1;
    A[i].a.draw(ctx, cx + A[i].ox, fy, A[i].s, AO);
    if (lk) drawGlyph(ctx, 'lock', cx, fy - 14, 18, GLY_LOCK);
  }
  AO.alpha = 1;
}
const AO = { alpha: 1, dim: 0, flip: false, light: { door: 0.45, lamp: 0 } };

// ---- card painters (X, Y = the card's top-left on screen)
function drawPanel(ctx, c, X, Y, alpha) { c.panel.draw(ctx, X + c.w / 2, Y + c.h / 2, c.w, c.h, alpha); }
function drawBtns(ctx, c, X, Y) { for (let i = 0; i < c.btns.length; i++) { const b = c.btns[i]; drawCBtn(ctx, b, X + mx(c, b.lx), Y + b.ly); } }
const GLY_CHECK = { color: MINT }, GLY_W = { color: '#ffffff' }, GLY_LOCK = { color: '#c9c3f0' }, GLY_GOLD = { color: GOLD }, GLY_STAR = { color: GOLD };
const PILL_GOLD = { color: GOLD, textColor: '#6a3f00', icon: '' }, PILL_VEL = { color: VELVET, textColor: CREAM, icon: '' }, PILL_GO = { color: GO, textColor: CREAM, icon: 'check' };
const PILL_IND = { color: '#221f5c', textColor: CREAM, icon: '' };
const PILL_BRASS = { color: '#a8721e', textColor: CREAM, icon: 'star' };
const PILL_WORTH = { color: '#a8721e', textColor: CREAM, icon: '', size: 13 }, PILL_FIRST = { color: GO, textColor: CREAM, icon: '', size: 12.5 };

// ---- perk lists (TUNE.perk): n wrapped labels in the card's lead (they follow the reading side); perkFit (on refresh,
// after their strings are set) shrinks the whole list to ONE size that fits its column (never under perk.min) and gives a
// line that still does not fit 2 lines; drawPerks lays them out from the card-local y0 with a glyph before each
function perkLabels(c, n) {
  const P = TUNE.perk;
  c.perks = []; c.perkY = []; c.perkTwo = []; c.perkN = n; c.perkH = n * P.pitch;
  for (let i = 0; i < n; i++) {
    const L = createWrap(P.w + 8, Math.ceil(P.size * 2.9), { size: P.size, weight: 800, color: CREAM, lines: 2, align: 'left' });
    c.L['p' + i] = L; c.lead.push(L); c.perks.push(L); c.perkY.push(0); c.perkTwo.push(false);
  }
}
function perkFit(c, n) {
  const P = TUNE.perk;
  let s = P.size;
  for (let i = 0; i < n; i++) { const w = measure(c.perks[i].str, P.size, 800); if (w > P.w) s = Math.min(s, P.size * P.w / w); }
  s = Math.max(P.min, Math.floor(s * 4) / 4);
  c.perkN = n; c.perkH = 0;
  for (let i = 0; i < n; i++) {
    const L = c.perks[i];
    if (L.o.size !== s) { L.o.size = s; L.gen = -1; }
    const two = measure(L.str, s, 800) > P.w, ph = two ? P.pitch2 : P.pitch;
    c.perkY[i] = c.perkH + ph / 2; c.perkTwo[i] = two; c.perkH += ph;
  }
}
const PERK_X = 140;
function drawPerks(ctx, c, X, Y, y0, go, gly) {
  const lh = c.perks.length ? c.perks[0].o.size * 1.32 : 17;
  for (let i = 0; i < c.perkN; i++) {
    const y = Y + y0 + c.perkY[i], gy = c.perkTwo[i] ? y - lh / 2 : y;
    drawGlyph(ctx, gly || 'check', X + mx(c, PERK_X - 14), gy, 15, go);
    c.perks[i].draw(ctx, X + mx(c, PERK_X - 4), y + 1);
  }
}
// the brass 'Worth N gems' pill riding a money deal's top edge on the trailing side (c.worthStr / c.worthW from refresh)
function drawWorth(ctx, c, X, Y) {
  ctx.save(); ctx.translate(X + mx(c, c.w - 14 - c.worthW / 2), Y + 6); ctx.rotate(i18n.isRTL ? -0.04 : 0.04);
  drawPill(ctx, 0, 0, c.worthW, 26, c.worthStr, PILL_WORTH); ctx.restore();
}
function setWorth(c, str, maxW) { c.worthStr = str; c.worthW = str ? Math.round(clamp(measure(str, 13, 800) + 34, 120, maxW || 220)) : 0; }
function drawNote(ctx, c, X, Y) { c.L.t.draw(ctx, X + c.w / 2, Y + c.h / 2); }
function drawSec(ctx, c, X, Y) {
  const rtl = i18n.isRTL, L = c.L.t;
  L.draw(ctx, X + mx(c, 4), Y + c.h / 2 + 2);
  ctx.fillStyle = 'rgba(217,164,65,0.35)';
  const tw = Math.min(c.w - 20, c.tw || 120);
  if (rtl) ctx.fillRect(X, Y + c.h / 2 + 2, c.w - tw - 16, 1.5); else ctx.fillRect(X + tw + 14, Y + c.h / 2 + 2, c.w - tw - 14, 1.5);
}

// ================================================================ the sheet (one modal at a time)
const sh = { on: false, out: false, a: 0, s: 0.9, t: 0, kind: '', pid: '', item: '', slot: '', booster: '', need: 0, busy: false,
  w: TUNE.sheet.w, h: 440, top: 0, artY: 168, textY: 254, nLines: 0, art: '', theme: '', specs: null, actors: null, from: null, closeAll: false, preview: '',
  noteLines: 0, mainTab: '', noTab: '' };
let pw = null;                    // the private preview world (lazy, dropped on exit)

function init() {
  if (st.inited) return;
  st.inited = true;
  K = {
    main: createPanel(TUNE.panel.color, { radius: TUNE.panel.radius, inner: 'rgba(255,209,102,0.16)' }),
    card: createPanel('#2a2760', { radius: 22, inner: 'rgba(255,209,102,0.14)' }),
    hero: createPanel('#4a1640', { radius: 24, inner: 'rgba(255,209,102,0.32)' }),
    vip: createPanel('#16131f', { radius: 24, inner: 'rgba(226,176,79,0.5)' }),
    tile: createPanel('#24214f', { radius: 18 }),
    tileOn: createPanel('#1f4a3a', { radius: 18, inner: 'rgba(79,227,176,0.45)' }),
    neon: createPanel('#1c1530', { radius: 22, inner: 'rgba(255,79,163,0.3)' }),
    royal: createPanel('#3a1a48', { radius: 22, inner: 'rgba(226,176,79,0.35)' }),
    desert: createPanel('#40281a', { radius: 22, inner: 'rgba(233,196,106,0.35)' }),
    space: createPanel('#161c44', { radius: 22, inner: 'rgba(159,220,255,0.35)' }),
    spooky: createPanel('#2a1a3e', { radius: 22, inner: 'rgba(255,140,26,0.32)' }),
    crystal: createPanel('#163247', { radius: 22, inner: 'rgba(191,230,245,0.42)' }),
    gold: createPanel('#3e2a12', { radius: 24, inner: 'rgba(255,201,60,0.5)' }),
    goldStrip: createPanel('#4a3212', { radius: 18, inner: 'rgba(255,214,102,0.45)' }),
    pro: createPanel('#123a52', { radius: 24, inner: 'rgba(255,209,102,0.32)' }),
    gift: createPanel('#3a2a6a', { radius: 22, inner: 'rgba(255,209,102,0.4)' }),
    go: createPanel('#1f6a44', { radius: 18, inner: 'rgba(255,209,102,0.35)' }),
    sheet: createPanel(TUNE.sheet.color, { radius: TUNE.sheet.radius, inner: 'rgba(255,209,102,0.22)' }),
    toast: createToast(),
    title: createLabel(220, 40, { size: 26, weight: 800, color: '#fff4d6', outline: INK, outlineWidth: 6, shadow: true }),
    count: createLabel(110, 32, { size: TUNE.counter.font, weight: 800, color: '#ffffff', outline: INK, outlineWidth: 5 }),
    legal: createLabel(350, 20, { size: TUNE.foot.font, weight: 700, color: DIMTXT }),
    terms: createLabel(90, 22, { size: 12.5, weight: 800, color: '#c9c3f0' }),
    privacy: createLabel(90, 22, { size: 12.5, weight: 800, color: '#c9c3f0' }),
    tabs: [], chrome: createButtons(), sbtns: createButtons(),
    hint: createLabel(250, 30, { size: 15, weight: 800, color: CREAM, outline: INK, outlineWidth: 4 }),
  };
  for (let i = 0; i < TAB_IDS.length; i++) K.tabs.push({ id: TAB_IDS[i], x: 0, w: 58, lbl: createLabel(64, 24, { size: TUNE.tabs.font, weight: 800, color: CREAM, outline: INK, outlineWidth: 3 }), dot: false });
  K.close = K.chrome.add({ id: 'close', kind: 'icon', x: 44, y: 60, w: 44, secondary: true, icon: 'close', onTap: close });
  K.restore = K.chrome.add({ id: 'restore', x: 120, y: 700, w: TUNE.foot.restoreW, h: TUNE.foot.restoreH, secondary: true, icon: 'retry', iconColor: '#ffd166', label: '', size: 14, onTap: doRestore });
  // the sheet's buttons: main (the price / Buy / Use / Done), alt (a bundle / a pack / x1 / See all packs), no (Not now /
  // Earn free gems), x (close), try (a round play button on the art's corner)
  K.sMain = K.sbtns.add({ id: 'main', x: 195, y: 600, w: 250, h: 58, label: '', size: 21, onTap: sheetMain, overlay: null });
  K.sAlt = K.sbtns.add({ id: 'alt', x: 195, y: 650, w: 150, h: 46, secondary: true, label: '', size: 16, onTap: sheetAlt, overlay: null });
  K.sNo = K.sbtns.add({ id: 'no', x: 195, y: 700, w: 160, h: 40, secondary: true, label: '', size: 14.5, onTap: sheetNo });
  K.sX = K.sbtns.add({ id: 'x', kind: 'icon', x: 60, y: 200, w: 40, secondary: true, icon: 'close', onTap: closeSheet });
  K.sTry = K.sbtns.add({ id: 'try', kind: 'icon', x: 300, y: 200, w: 42, secondary: true, icon: 'play', glyphColor: AMBER, hidden: true, onTap: sheetTry });
  // the sheet's gem faces (a booster's x5 / x1, an item's price): the same labels as a card gem button, at 20 / 16
  K.sGemMain = { pw: 0, prew: 0, cw: 0, price: 0, pre: '', confirm: 0, armT: 0, w: 250, h: 58 }; gemLabels(K.sGemMain, 20);
  K.sGemAlt = { pw: 0, prew: 0, cw: 0, price: 0, pre: '', confirm: 0, armT: 0, w: 150, h: 46 }; gemLabels(K.sGemAlt, 16);
  K.sGemAlt.lp.o.outline = INK; K.sGemAlt.lpre.o.outline = INK;
  K.sL = {
    // the title never runs into the close X (sheet.w - 2 x (the X's 40 + 20)); the subtitle keeps 25 off each rim
    title: createLabel(226, 40, { size: 25, weight: 800, color: '#ffd166', outline: INK, outlineWidth: 6, shadow: true }),
    sub: createLabel(296, 24, { size: 14, weight: 700, color: SOFT }),
    head: createLabel(300, 22, { size: 13, weight: 800, color: '#c9c3f0' }),
    lines: [0, 1, 2, 3].map(() => createLabel(270, 26, { size: 15, weight: 800, color: CREAM, align: 'left' })),
    note: createWrap(300, 58, { size: 12.5, weight: 700, color: SOFT, lines: 3 }),
    state: createLabel(300, 24, { size: 14, weight: 800, color: '#ffe2b8' }),
    big: createLabel(200, 40, { size: 30, weight: 800, color: '#ffffff', outline: INK, outlineWidth: 7 }),
    // the small caption under the primary button (an item's '200 gems ≈ $1.33'), the Gold Star Road's track
    cap: createLabel(300, 22, { size: 13, weight: 700, color: SOFT }),
    trackHead: createLabel(300, 22, { size: 13, weight: 800, color: '#ffd166' }),
    track: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => createLabel(196, 22, { size: 12.5, weight: 800, color: CREAM, align: 'left' })),
    trackAfter: createLabel(300, 20, { size: 12.5, weight: 700, color: SOFT }),
  };
  K.lineArt = ['', '', '', ''];
  buildCards();
}

// ---------------------------------------------------------------- the cards of every tab (made once)
function buildCards() {
  const W = TUNE.content.w;
  // notes + section headers
  // the Party tab opens on a selling line; its fairness promise (skins never hide a clue) is the item sheet's small print
  const notes = [['n_gems', 'shop.gems_head'], ['n_looks', 'shop.looks_head'], ['n_club', 'shop.club_sell'], ['n_boost', 'shop.b_rules']];
  for (let i = 0; i < notes.length; i++) {
    const c = mkCard(notes[i][0], 'note', 34, { key: notes[i][1] });
    c.L.t = createWrap(W, 34, { size: 12.5, weight: 700, color: SOFT, lines: 2 });
    c.draw = drawNote;
  }
  for (let i = 0; i < SLOT_ORDER.length; i++) {
    const c = mkCard('sec_' + SLOT_ORDER[i], 'sec', 36, { key: 'shop.sec.' + SLOT_ORDER[i] });
    leadLabel(c, 't', 260, 17, '#ffd166', INK);
    c.draw = drawSec;
  }
  // ---- Free Gift banner (Deals, while ready)
  {
    // the Claim button (88 wide) sits 16 in from the rim; the title column ends 12 short of it
    const c = mkCard('gift_d', 'gift_d', 74, { panel: K.gift });
    leadLabel(c, 't', 172, 16, '#ffd166', INK); leadLabel(c, 's', 172, 12.5, SOFT, '', 700);
    c.btns.push(cbtn({ id: 'claim', lx: W - 60, ly: 36, w: 88, h: 40, size: 16, onTap: claimGift }));
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      drawArt(ctx, 'gift', X + mx(c, 36), Y + 36, 44 + 3 * Math.sin(st.t * 4));
      c.L.t.draw(ctx, X + mx(c, 64), Y + 27); c.L.s.draw(ctx, X + mx(c, 64), Y + 49);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Starter Pack
  {
    // its value rides the card's top edge (as on every money deal: the same brass pill, the one value claim on the card:
    // 'Worth 725 gems + 5 exclusive looks'); the contents row: 500 gems / the Rock Star looks (exclusive: a gold crown
    // badge at the chip's leading edge, inside it) / '9 boosters'; the buy button clears the chips by 9 (274 tall)
    const c = mkCard('starter', 'starter', 274, { panel: K.hero, danceY: 158, danceH: 82, danceW: 54, stageKey: 'shop.stage2.rock.' + (W - 28), worthStr: '' });
    leadLabel(c, 't', 230, 24, '#ffd166', INK); leadLabel(c, 's', 260, 13, SOFT, '', 700);
    c.chips = [midLabel(c, 'c0', 70, 13.5, CREAM, INK), midLabel(c, 'c1', 80, 13.5, CREAM, INK), midLabel(c, 'c2', 82, 13.5, CREAM, INK)];
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W / 2, ly: 242, w: 230, h: 48, size: 19, onTap: tapProduct, arg: 'mb_starter_pack' }));
    c.tap = function () { openSheet('iap', 'mb_starter_pack'); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 18), Y + 30); c.L.s.draw(ctx, X + mx(c, 18), Y + 55);
      if (c.worthStr) drawWorth(ctx, c, X, Y);
      SPR.anchor = AN_TL; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
      draw.sprite(ctx, draw.cached(c.stageKey, c.w - 28, 98, stageBaker('rock', 86)), X + 14, Y + 72, SPR);
      drawDancers(ctx, c, X, Y, 20, c.w - 20);
      // contents, in reading order: [gem] 500 / [crown][bow] Rock Star / [bolt] 9 boosters
      const y = Y + 194, rtl = i18n.isRTL, dir = rtl ? -1 : 1;
      let lx = 14;
      for (let i = 0; i < 3; i++) {
        const w = STARTER_CHIP_W[i], x0 = X + mx(c, lx), xl = x0 + dir * 4, x1 = x0 + dir * (w - 4);
        ctx.fillStyle = 'rgba(8,6,24,0.4)'; draw.roundRect(ctx, Math.min(xl, x1), y - 17, w - 8, 34, 17); ctx.fill();
        let ix = xl + dir * 18;
        if (i === 1) { drawBadge(ctx, ix, y, 22, '', BADGE_GOLD); drawArt(ctx, 'crown', ix, y - 1, 15); ix += dir * 22; }
        if (i === 0) drawGem(ctx, ix, y, 20); else drawArt(ctx, i === 1 ? 'bow' : 'bolt', ix, y, 24);
        const tx0 = ix + dir * 14;
        c.chips[i].draw(ctx, (tx0 + x1) / 2, y + 1);
        lx += w;
      }
      drawBtns(ctx, c, X, Y);
    };
    c.specs = [];
    for (let i = 0; i < SPECIES.length; i++) c.specs.push(null);
  }
  // ---- Pro Doorman Pack (the follow-up to the Starter Pack: in Deals once that is owned or from its minNight, while
  // unowned; wallet.dealOpen): 1,200 gems + the Beach Party outfits (dancing on the Beach stage) + the Neon Tube rope
  {
    const c = mkCard('pro', 'pro', 274, { panel: K.pro, pid: PRO_PID, danceY: 158, danceH: 82, danceW: 54, stageKey: 'shop.stage2.beach.' + (W - 28), ropeKey: thumbKey('rope.neon', 30), worthStr: '' });
    leadLabel(c, 't', 230, 24, '#ffd166', INK); leadLabel(c, 's', 260, 13, SOFT, '', 700);
    c.chips = [midLabel(c, 'c0', 78, 13.5, CREAM, INK), midLabel(c, 'c1', 78, 13.5, CREAM, INK), midLabel(c, 'c2', 78, 13.5, CREAM, INK)];
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W / 2, ly: 242, w: 230, h: 48, size: 19, onTap: tapProduct, arg: PRO_PID }));
    c.tap = function () { openSheet('iap', PRO_PID); };
    c.specs = [];
    for (let i = 0; i < SPECIES.length; i++) c.specs.push(outfitSpec(SPECIES[i], outfitId('beach', SPECIES[i])));
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 18), Y + 30); c.L.s.draw(ctx, X + mx(c, 18), Y + 55);
      // its value rides the card's top edge on the trailing side (the title keeps its whole row)
      if (c.worthStr) drawWorth(ctx, c, X, Y);
      SPR.anchor = AN_TL; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
      draw.sprite(ctx, draw.cached(c.stageKey, c.w - 28, 98, stageBaker('beach', 86)), X + 14, Y + 72, SPR);
      drawDancers(ctx, c, X, Y, 20, c.w - 20);
      // contents: 1,200 gems / Beach Party x5 / the Neon Tube rope (the same rows as the Starter card)
      const y = Y + 194, cw = (c.w - 28) / 3;
      for (let i = 0; i < 3; i++) {
        const k = i18n.isRTL ? 2 - i : i, x = X + 14 + cw * (k + 0.5), ix = x - cw / 2 + 22;
        ctx.fillStyle = 'rgba(8,6,24,0.4)'; draw.roundRect(ctx, x - cw / 2 + 4, y - 17, cw - 8, 34, 17); ctx.fill();
        if (i === 0) drawGem(ctx, ix, y, 20); else if (i === 1) drawArt(ctx, 'bow', ix, y, 22); else drawThumb(ctx, c.ropeKey, 'rope.neon', ix - 1, y, 28);
        c.chips[i].draw(ctx, x + 15, y + 1);
      }
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Piggy
  {
    // two separate full-width lines under the jar (the note, then how it fills: PIGGY.perPass / perGold), then a row of
    // their own: 'Best value when full: 1,500 gems for $2.99' (2 lines, gold: a full piggy is the best gems per dollar in
    // the shop) + the break button (212 tall, the button at ly 176, so no line ever runs under it in either language);
    // below its minimum the button gives way to 'Ready to break at 500 gems (n/500)'
    const c = mkCard('piggy', 'piggy', 212, { panel: K.card });
    leadLabel(c, 't', 230, 20, '#ffd166', INK); leadLabel(c, 'n', 230, 16, CREAM, INK);
    c.L.cap = createWrap(184, 40, { size: 12.5, weight: 800, color: GOLD, lines: 2, align: 'left' }); c.lead.push(c.L.cap);
    leadLabel(c, 'note', 326, 12.5, SOFT, '', 700); leadLabel(c, 'fill', 326, 12.5, SOFT, '', 700);
    leadLabel(c, 'ready', 320, 13, '#ffe2b8', '', 800);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 76, ly: 176, w: 132, h: 44, size: 17, onTap: tapProduct, arg: 'mb_piggy_break' }));
    c.tap = function () { openSheet('iap', 'mb_piggy_break'); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      const wob = PIG.full ? Math.sin(st.t * 7) * 0.05 : 0;
      ctx.save(); ctx.translate(X + mx(c, 52), Y + 56); ctx.rotate(wob); drawArt(ctx, 'jar', 0, 0, 84); ctx.restore();
      c.L.t.draw(ctx, X + mx(c, 100), Y + 26); c.L.n.draw(ctx, X + mx(c, 100), Y + 52);
      // fill bar: gems / cap, the break line at minBreak
      const bw = 150, bx = X + (i18n.isRTL ? c.w - 100 - bw : 100), by = Y + 76, k = clamp(PIG.gems / Math.max(1, PIG.cap), 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.13)'; draw.roundRect(ctx, bx, by - 5, bw, 10, 5); ctx.fill();
      ctx.fillStyle = PIG.full ? GOLD : '#a985f0'; const fw = Math.max(10, bw * k); draw.roundRect(ctx, i18n.isRTL ? bx + bw - fw : bx, by - 5, fw, 10, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,220,0.7)'; const mk = PIG.minBreak / Math.max(1, PIG.cap) * bw; ctx.fillRect(i18n.isRTL ? bx + bw - mk : bx + mk, by - 7, 1.6, 14);
      c.L.note.draw(ctx, X + mx(c, 18), Y + 110); c.L.fill.draw(ctx, X + mx(c, 18), Y + 131);
      if (c.btns[0].hidden && c.L.ready.str) c.L.ready.draw(ctx, X + mx(c, 18), Y + 176);
      else c.L.cap.draw(ctx, X + mx(c, 14), Y + 176);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- VIP Rope
  {
    // the perks (one size, a long one on 2 lines) under the title column, the buy button in a row of its own under them
    // (the card's height follows the list); after 200 gems missed, what VIP would have doubled so far beside the button
    const c = mkCard('vip', 'vip', 190, { panel: K.vip });
    leadLabel(c, 't', 200, 22, '#ffd166', INK); leadLabel(c, 's', 220, 12.5, SOFT, '', 700);
    perkLabels(c, 3);
    c.L.miss = createWrap(190, 38, { size: 12.5, weight: 800, color: GOLD, lines: 2, align: 'left' }); c.lead.push(c.L.miss);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 74, ly: 160, w: 128, h: 46, size: 17, onTap: tapProduct, arg: 'mb_vip_rope' }));
    c.tap = function () { openSheet('iap', 'mb_vip_rope'); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      const on = c.owned;
      draw.glow(ctx, X + mx(c, 60), Y + 74, 70, '#ffd27a', 0.18 + 0.06 * Math.sin(st.t * 2.4));
      drawArt(ctx, 'vip', X + mx(c, 60), Y + (on ? 50 : 76), on ? 70 : 100);
      c.L.t.draw(ctx, X + mx(c, 118), Y + 28); c.L.s.draw(ctx, X + mx(c, 118), Y + 50);
      drawPerks(ctx, c, X, Y, 64, on ? GLY_CHECK : GLY_GOLD);
      if (!on && c.L.miss.str) c.L.miss.draw(ctx, X + mx(c, 14), Y + c.btns[0].ly);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Club Pass
  {
    // its value rides the top edge ('Worth 2,250 gems': the 1,500 gems + 30 boosters at their gem prices), the two daily
    // perks, the days left while active, the run bonus ('Open 3 days in a row: +10 a day'), and the honest terms on ONE
    // line (does not renew, not restored on a new device: what store/iap.json's review note promises the card says; the
    // rest of the terms are in its sheet)
    const c = mkCard('pass', 'pass', 218, { panel: K.card, worthStr: '' });
    leadLabel(c, 't', 220, 19, '#ffd166', INK); leadLabel(c, 's', 220, 12.5, SOFT, '', 700);
    c.perks = [leadLabel(c, 'p0', 210, 13.5, CREAM), leadLabel(c, 'p1', 210, 13.5, CREAM), leadLabel(c, 'p2', 210, 13, GOLD)];
    leadLabel(c, 'act', 186, 13.5, MINT, INK);
    leadLabel(c, 'dev', 326, 12.5, SOFT, '', 700);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 74, ly: 164, w: 128, h: 46, size: 17, onTap: tapProduct, arg: 'mb_club_pass_30d' }));
    c.tap = function () { openSheet('iap', 'mb_club_pass_30d'); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      drawArt(ctx, 'ticket', X + mx(c, 56), Y + 72, 92);
      c.L.t.draw(ctx, X + mx(c, 108), Y + 30); c.L.s.draw(ctx, X + mx(c, 108), Y + 52);
      if (c.worthStr) drawWorth(ctx, c, X, Y);
      for (let i = 0; i < 3; i++) { const y = Y + 80 + i * 23; drawGlyph(ctx, i === 2 ? 'flame' : 'check', X + mx(c, 116), y, 15, GLY_GOLD); c.perks[i].draw(ctx, X + mx(c, 130), y + 1); }
      if (c.L.act.str) c.L.act.draw(ctx, X + mx(c, 18), Y + 164);
      c.L.dev.draw(ctx, X + mx(c, 18), Y + 202);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Gold Star Road (also the gold strip of the Star Road card in Free): the crowned star trail, its 3 promises, what
  // owning it pays back at once for the steps already reached (+N on a gold pill); owned: what Gold gives next
  {
    const c = mkCard('goldroad', 'goldroad', 194, { panel: K.gold, pid: GOLD_PID, backStr: '' });
    leadLabel(c, 't', 210, 21, '#ffd166', INK); leadLabel(c, 's', 222, 12.5, SOFT, '', 700);
    perkLabels(c, 3);
    midLabel(c, 'back', 110, 14, CREAM, INK);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 74, ly: 160, w: 128, h: 46, size: 17, onTap: tapProduct, arg: GOLD_PID }));
    c.tap = function () { openSheet('iap', GOLD_PID); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      const on = c.owned;
      draw.glow(ctx, X + mx(c, 60), Y + 70, 70, '#ffd27a', 0.16 + 0.06 * Math.sin(st.t * 2.4));
      drawArt(ctx, 'goldroad', X + mx(c, 60), Y + (on ? 60 : 72), on ? 80 : 108);
      c.L.t.draw(ctx, X + mx(c, 118), Y + 28); c.L.s.draw(ctx, X + mx(c, 118), Y + 50);
      drawPerks(ctx, c, X, Y, 64, on ? GLY_STAR : GLY_GOLD, on ? 'star' : 'check');
      if (!on && c.L.back.str) drawBackPill(ctx, c, X + mx(c, 18 + c.backW / 2), Y + c.btns[0].ly);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Club Owner: every cosmetic sold for gems today (51, named by count on the card, the 6 party themes shown), its
  // value in gems; with some owned already: how many are new
  {
    // perks (one size for the list) under the title column, then the 6 theme thumbs and a last row: its worth to this
    // player + the buy button (rows follow the perk list's height: c.ty, c.rowY). Its terms ('the items available today')
    // are in its sheet, said before the price
    const c = mkCard('owner', 'owner', 224, { panel: K.vip, pid: OWNER_PID, worthStr: '', ownStr: '', ty: 144, rowY: 194 });
    leadLabel(c, 't', 200, 22, '#ffd166', INK); leadLabel(c, 's', 220, 12.5, SOFT, '', 700);
    perkLabels(c, 2);
    const op = productOf(OWNER_PID), items = op ? op.items : [];
    c.clubs = []; c.clubKeys = []; c.clubOwn = [];
    for (let i = 0; i < items.length; i++) if (items[i].indexOf('club.') === 0) { c.clubs.push(items[i]); c.clubKeys.push(thumbKey(items[i], 46)); c.clubOwn.push(false); }
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 74, ly: 214, w: 128, h: 44, size: 17, onTap: tapProduct, arg: OWNER_PID }));
    c.tap = function () { openSheet('iap', OWNER_PID); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      draw.glow(ctx, X + mx(c, 58), Y + 62, 66, '#ffd27a', 0.16 + 0.06 * Math.sin(st.t * 2.2));
      drawArt(ctx, 'owner', X + mx(c, 58), Y + 62, 100);
      c.L.t.draw(ctx, X + mx(c, 118), Y + 28); c.L.s.draw(ctx, X + mx(c, 118), Y + 50);
      drawPerks(ctx, c, X, Y, 66, GLY_GOLD);
      // the party themes it holds, in reading order (a mint check on the ones already owned)
      const n = c.clubs.length, rtl = i18n.isRTL, ty = Y + c.ty;
      for (let i = 0; i < n; i++) {
        const k = rtl ? n - 1 - i : i, cx = X + 14 + (c.w - 28) * (k + 0.5) / n;
        drawThumb(ctx, c.clubKeys[i], c.clubs[i], cx, ty, 46);
        if (c.clubOwn[i]) drawGlyph(ctx, 'check', cx + 16, ty + 16, 14, GLY_CHECK);
      }
      if (c.worthStr) { ctx.save(); ctx.translate(X + mx(c, 14 + c.worthW / 2), Y + c.rowY); drawPill(ctx, 0, 0, c.worthW, 30, c.worthStr, PILL_WORTH); ctx.restore(); }
      if (c.owned) { ctx.save(); ctx.translate(X + mx(c, c.w - 74), Y + c.rowY); drawPill(ctx, 0, 0, 112, 36, c.ownStr, PILL_GO); ctx.restore(); }
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- the 5 theme bundles (also in Outfits)
  const BT = BUNDLE_THEMES;
  for (let i = 0; i < BT.length; i++) {
    const th = BT[i], pid = 'mb_bundle_' + th;
    // its value (the theme + 5 looks at their gem prices) rides the top edge; 'Try it' is a small round play button in
    // the stage's top-leading corner, clear of the dancers' heads
    const c = mkCard('bundle_' + th, 'bundle', 184, { panel: K[th], theme: th, pid: pid, danceY: 104, danceH: 76, danceW: 52, stageKey: 'shop.stage2.' + th + '.' + (W - 24), worthStr: '' });
    leadLabel(c, 't', 192, 18.5, '#ffd166', INK); leadLabel(c, 's', 192, 12.5, SOFT, '', 700);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 72, ly: 148, w: 124, h: 44, size: 17, onTap: tapProduct, arg: pid }));
    c.btns.push(cbtn({ id: 'try', lx: 32, ly: 31, w: 34, h: 32, size: 13, secondary: true, icon: 'play', iconColor: AMBER, onTap: tapTry, arg: 'club.' + th }));
    c.tap = function () { openSheet('iap', pid); };
    c.specs = [];
    for (let k = 0; k < SPECIES.length; k++) c.specs.push(outfitSpec(SPECIES[k], outfitId(th, SPECIES[k])));
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      SPR.anchor = AN_TL; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
      draw.sprite(ctx, draw.cached(c.stageKey, c.w - 24, 104, stageBaker(c.theme, 92)), X + 12, Y + 12, SPR);
      drawDancers(ctx, c, X, Y, 18, c.w - 18);
      if (c.worthStr && !c.owned) drawWorth(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 16), Y + 138); c.L.s.draw(ctx, X + mx(c, 16), Y + 160);
      if (c.owned) { ctx.save(); ctx.translate(X + mx(c, c.w - 72), Y + 148); drawPill(ctx, 0, 0, 112, 36, c.ownStr, PILL_GO); ctx.restore(); }
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Crystal Street Set (Deals, and the top of Party): the crystal rope, door and IN / OUT buttons as their own
  // thumbnails (a mint check on the ones already owned), its value in gems
  {
    const cp = productOf(CRYSTAL_SET), ids = cp ? cp.items.slice() : [];
    // the three pieces fill the card, each on its own soft well with its name under it (Rope skin · Door · IN / OUT
    // buttons), then a last row: its worth to this player + the buy button
    const c = mkCard('crystal', 'crystal', 246, { panel: K.crystal, pid: CRYSTAL_SET, ids: ids, keys: [], own: [], worthStr: '', ownStr: '', names: [] });
    c.sheetKeys = [];
    for (let i = 0; i < ids.length; i++) { c.keys.push(thumbKey(ids[i], 98)); c.sheetKeys.push(thumbKey(ids[i], 92)); c.own.push(false); c.names.push(midLabel(c, 'nm' + i, 104, 12.5, CREAM, INK)); }
    leadLabel(c, 't', 230, 19, '#ffd166', INK); leadLabel(c, 's', 236, 12.5, SOFT, '', 700);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 72, ly: 214, w: 124, h: 44, size: 17, onTap: tapProduct, arg: CRYSTAL_SET }));
    c.tap = function () { openSheet('iap', CRYSTAL_SET); };
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 16), Y + 26); c.L.s.draw(ctx, X + mx(c, 16), Y + 48);
      const n = c.ids.length, rtl = i18n.isRTL, cw = (c.w - 28) / n;
      for (let i = 0; i < n; i++) {
        const k = rtl ? n - 1 - i : i, cx = X + 14 + cw * (k + 0.5), cy = Y + 116;
        ctx.fillStyle = 'rgba(8,6,24,0.32)'; draw.roundRect(ctx, cx - cw / 2 + 4, Y + 64, cw - 8, 122, 14); ctx.fill();
        drawThumb(ctx, c.keys[i], c.ids[i], cx, cy, 98);
        c.names[i].draw(ctx, cx, Y + 172);
        if (c.own[i]) drawGlyph(ctx, 'check', cx + cw / 2 - 18, Y + 80, 18, GLY_CHECK);
      }
      if (c.worthStr) { ctx.save(); ctx.translate(X + mx(c, 14 + c.worthW / 2), Y + 214); drawPill(ctx, 0, 0, c.worthW, 30, c.worthStr, PILL_WORTH); ctx.restore(); }
      if (c.owned) { ctx.save(); ctx.translate(X + mx(c, c.w - 72), Y + 214); drawPill(ctx, 0, 0, 112, 36, c.ownStr, PILL_GO); ctx.restore(); }
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Booster Bundle + Mega Booster Bundle (Boosters): the bundle = the three boosters big side by side, the Mega =
  // its own crate with the three piled three deep under a neon glow; each with its count as ONE big gold sticker ('×5' /
  // '×15'), the contents in words in the text column
  const BP = [['boostb', 'mb_booster_bundle', K.card, 'trio'], ['megab', MEGA_PID, K.neon, 'crate']];
  for (let i = 0; i < BP.length; i++) {
    const pid = BP[i][1], p = productOf(pid), each = p && p.boosters ? p.boosters.xray : 0;
    const c = mkCard(BP[i][0], BP[i][0], 138, { panel: BP[i][2], pid: pid, art: BP[i][3], cnt: '×' + each, each: each, mega: pid === MEGA_PID });
    leadLabel(c, 't', 196, 19, '#ffd166', INK); leadLabel(c, 's', 196, 12.5, SOFT, '', 700);
    c.L.l = createLabel(196, 24, { size: 13, weight: 800, color: CREAM, align: 'left' }); c.lead.push(c.L.l);
    c.btns.push(cbtn({ id: 'buy', kind: 'iap', lx: W - 72, ly: 106, w: 124, h: 44, size: 17, onTap: tapProduct, arg: pid }));
    c.tap = function () { openSheet('iap', pid); };
    c.draw = drawBoostPack;
  }
  // ---- gem packs: 2 per row, the top pack (the Vault) a full-width hero row of its own under them (no orphan cell)
  let heroId = '';
  for (let i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].kind === 'gems') heroId = PRODUCTS[i].id;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p.kind !== 'gems') continue;
    const tier = packTier(p), hero = p.id === heroId;
    // ONE tag per pack: while it still pays double on this wallet (FIRST_BUY: the 3 small packs only; store/iap.json's
    // review note names this tag) the green 'First buy: x2' rides its top edge, as 'Recommended' does on TUNE.popular (a
    // row with a top-edge tag gets the room above it); otherwise its bonus ('+20%') on a small brass tag in the trailing
    // corner of the top row, beside the name and ABOVE the art (the art carries the tier: pouch / chests / the crowned
    // treasure). Brass: a reward, never the velvet of a warning
    const c = mkCard('pack_' + p.id, 'pack', hero ? 170 : 190, { panel: hero ? K.gold : K.card, pid: p.id, tier: tier, w: hero ? W : (W - 12) / 2, first: false, hero: hero, tagTop: false, tagW: 0 });
    leadLabel(c, 'name', hero ? 150 : 84, 13.5, LILAC, INK, 800);
    if (hero) leadLabel(c, 'n', 180, 30, '#ffffff', INK); else midLabel(c, 'n', 150, 25, '#ffffff', INK);
    midLabel(c, 'best', 110, 12.5, '#6a3f00');
    c.btns.push(hero ? cbtn({ id: 'buy', kind: 'iap', lx: W - 104, ly: 134, w: 176, h: 44, size: 17, onTap: tapProduct, arg: p.id })
      : cbtn({ id: 'buy', kind: 'iap', lx: c.w / 2, ly: 162, w: c.w - 28, h: 42, size: 16, onTap: tapProduct, arg: p.id }));
    c.tap = function () { openSheet('iap', p.id); };
    c.draw = hero ? drawHeroPack : function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      drawArt(ctx, 'pile' + c.tier, X + c.w / 2, Y + 82, 92);
      const ry = c.tagTop ? Y + 25 : Y + 21;
      c.L.name.draw(ctx, X + mx(c, 12), ry);
      if (c.tagStr) drawPackTag(ctx, c, X + mx(c, c.w - 10 - c.tagW / 2), ry);
      c.L.n.draw(ctx, X + c.w / 2, Y + 128);
      drawBtns(ctx, c, X, Y);
      if (c.tagTop) { ctx.save(); ctx.translate(X + c.w / 2, Y - 4); drawPill(ctx, 0, 0, c.topW, 26, c.L.best.str, c.first ? PILL_TOP_FIRST : PILL_BRASS); ctx.restore(); }
    };
  }
  // ---- outfit themes (5 dancers + a chip each + the set button)
  for (let i = 0; i < OUTFIT_THEMES.length; i++) {
    const th = OUTFIT_THEMES[i];
    // a member not in the band yet (profile.bandUnlocked) dances dimmed and its chip is a lock (a tap says when it
    // joins); 'Includes n members who join later' under the Whole-set button while the set holds their looks (c.h 274)
    const c = mkCard('look_' + th, 'look', 248, { panel: th === 'rock' ? K.hero : K.card, theme: th, danceY: 150, danceH: 84, danceW: 56, stageKey: 'shop.stage2.' + th + '.' + (W - 24), locked: [false, false, false, false, false] });
    leadLabel(c, 't', 220, 19, '#ffd166', INK); leadLabel(c, 's', 300, 12.5, SOFT, '', 700);
    c.specs = []; c.ids = [];
    const cw = (W - 24) / 5;
    for (let k = 0; k < SPECIES.length; k++) {
      const id = outfitId(th, SPECIES[k]);
      c.ids.push(id); c.specs.push(outfitSpec(SPECIES[k], id));
      c.btns.push(cbtn({ id: 'chip' + k, kind: 'gem', lx: 12 + cw * (k + 0.5), ly: 178, w: cw - 6, h: 34, size: 14, onTap: tapLookChip, arg: id }));
    }
    c.btns.push(cbtn({ id: 'set', kind: 'gem', lx: W / 2, ly: 222, w: 220, h: 40, size: 16, onTap: tapSet, arg: th }));
    c.L.ref = midLabel(c, 'ref', 300, 12.5, '#ffe2b8');
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 16), Y + 24); c.L.s.draw(ctx, X + mx(c, 16), Y + 46);
      SPR.anchor = AN_TL; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
      draw.sprite(ctx, draw.cached(c.stageKey, c.w - 24, 96, stageBaker(c.theme, 88)), X + 12, Y + 62, SPR);
      drawDancers(ctx, c, X, Y, 12, c.w - 12);
      drawBtns(ctx, c, X, Y);
      if (c.L.ref.str) c.L.ref.draw(ctx, X + c.w / 2, Y + 254);
    };
  }
  // ---- party items as tiles (3 per row)
  for (let s = 0; s < SLOT_ORDER.length; s++) {
    const list = itemsBySlot(SLOT_ORDER[s]);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const c = mkCard('tile_' + it.id, 'tile', 140, { panel: K.tile, item: it.id, slot: it.slot, w: (W - 16) / 3 });
      // the art agent's thumbnail (cosmetics-art drawItemThumb) baked once into this tile's own sprite, else ours
      c.thumbKey = 'shop.ithumb.' + it.id + '.' + TILE_TH.h;
      c.thumbFn = function (cc, w, h) {
        const own = shopThumb(it.id, h);
        if (own) own(cc, w, h, it.id);
        else if (typeof COSM.drawItemThumb !== 'function' || !COSM.drawItemThumb(cc, it.id, w / 2, h / 2, h)) thumbBaker(it.id)(cc, w, h);
      };
      midLabel(c, 'n', c.w - 10, 12.5, CREAM, INK); midLabel(c, 'st', c.w - 30, 12.5, '#ffe2b8');
      c.tap = function () { openSheet('item', it.id); };
      c.draw = drawTile;
    }
  }
  // ---- boosters
  for (let i = 0; i < BOOSTER_IDS.length; i++) {
    const id = BOOSTER_IDS[i], B = BOOSTERS[id];
    const c = mkCard('boost_' + id, 'boost', 146, { panel: K.card, booster: id });
    leadLabel(c, 't', 220, 19, '#ffd166', INK); leadLabel(c, 's', 230, 13.5, CREAM, '', 800); leadLabel(c, 'h', 240, 12.5, SOFT, '', 700);
    leadLabel(c, 'vip', 240, 12.5, GOLD, '', 800);
    // the inventory reads as words under the art ('You have 3'), so the ×1 / ×5 on the buttons only ever mean a quantity
    midLabel(c, 'n', 96, 12.5, MINT, INK);
    c.btns.push(cbtn({ id: 'b1', kind: 'gem', lx: 152, ly: 116, w: 104, h: 40, size: 15, onTap: tapBooster, arg: id, n: 1 }));
    c.btns.push(cbtn({ id: 'b5', kind: 'gem', lx: 266, ly: 116, w: 116, h: 40, size: 15, onTap: tapBooster, arg: id, n: 5 }));
    c.price1 = B ? B.gems : 0; c.price5 = B ? B.pack5 : 0;
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      const ax = X + mx(c, 50), ay = Y + 56;
      draw.glow(ctx, ax, ay, 46, '#ffb347', 0.12);
      drawArt(ctx, BOOSTER_ART[c.booster], ax, ay, 70);
      c.L.n.draw(ctx, ax, Y + 112);
      c.L.t.draw(ctx, X + mx(c, 98), Y + 24); c.L.s.draw(ctx, X + mx(c, 98), Y + 47); c.L.h.draw(ctx, X + mx(c, 98), Y + 67);
      if (c.L.vip.str) c.L.vip.draw(ctx, X + mx(c, 98), Y + 86);
      drawBtns(ctx, c, X, Y);
    };
  }
  // ---- Free: gift, earn, road, streak, medals
  {
    const c = mkCard('gift_f', 'gift_f', 182, { panel: K.gift });
    leadLabel(c, 't', 220, 20, '#ffd166', INK);
    c.L.s = createWrap(230, 36, { size: 12.5, weight: 700, color: SOFT, lines: 2, align: 'left' }); c.lead.push(c.L.s);
    c.days = [];
    for (let i = 0; i < 7; i++) c.days.push(midLabel(c, 'd' + i, 40, 12.5, '#ffffff', INK));
    c.btns.push(cbtn({ id: 'claim', lx: W / 2, ly: 152, w: 200, h: 42, size: 17, onTap: claimGift }));
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      drawArt(ctx, 'gift', X + mx(c, 46), Y + 46, 62 + (c.ready ? 3 * Math.sin(st.t * 4) : 0));
      c.L.t.draw(ctx, X + mx(c, 92), Y + 28); c.L.s.draw(ctx, X + mx(c, 92), Y + 58);
      const n = 7, bw = 40, gap = (c.w - 28 - n * bw) / (n - 1);
      for (let i = 0; i < n; i++) {
        const k = i18n.isRTL ? n - 1 - i : i, x = X + 14 + k * (bw + gap) + bw / 2, y = Y + 104, last = i === 6, cur = i === c.day - 1, past = i < c.day - 1;
        ctx.fillStyle = cur ? 'rgba(255,179,71,0.42)' : last ? 'rgba(255,201,60,0.28)' : 'rgba(8,6,24,0.45)'; draw.roundRect(ctx, x - bw / 2, y - 20, bw, 40, 10); ctx.fill();
        if (last || cur) { ctx.lineWidth = cur ? 2.2 : 1.5; ctx.strokeStyle = cur ? AMBER : GOLD; ctx.stroke(); }
        if (past) { drawGlyph(ctx, 'check', x, y, 18, GLY_CHECK); continue; }
        drawGem(ctx, x - (last ? 8 : 0), y - 7, 15);
        if (last) drawArt(ctx, 'glasses', x + 9, y - 7, 18);
        c.days[i].draw(ctx, x, y + 10);
      }
      drawBtns(ctx, c, X, Y);
    };
  }
  {
    const c = mkCard('earn', 'earn', 120, { panel: K.card });
    leadLabel(c, 't', 300, 17, '#ffd166', INK);
    c.perks = [leadLabel(c, 'p0', 290, 13, CREAM, '', 700), leadLabel(c, 'p1', 290, 13, CREAM, '', 700), leadLabel(c, 'p2', 290, 13, CREAM, '', 700)];
    c.draw = function (ctx, c, X, Y) {
      drawPanel(ctx, c, X, Y);
      c.L.t.draw(ctx, X + mx(c, 18), Y + 24);
      for (let i = 0; i < 3; i++) { const y = Y + 52 + i * 22; drawGem(ctx, X + mx(c, 26), y, 14); c.perks[i].draw(ctx, X + mx(c, 40), y + 1); }
    };
  }
  {
    // the free road's rows, then (while the store sells it or it is owned) the Gold Star Road: a gold reward beside every
    // step (dimmed with a lock until owned) and a gold strip under the rows with its buy button / what Gold gives next
    const steps = STAR_ROAD.steps, base = 104 + steps.length * ROAD_PITCH + 26;
    const c = mkCard('road', 'road', base + ROAD_GOLD.h + 12, { panel: K.card, pid: GOLD_PID, base: base, goldY: base - 2, showGold: true, gold: false, backStr: '' });
    leadLabel(c, 't', 200, 20, '#ffd166', INK); leadLabel(c, 's', 260, 12.5, SOFT, '', 700);
    midLabel(c, 'stars', 100, 15, '#ffffff', INK); leadLabel(c, 'next', 220, 12.5, CREAM, '', 800);
    c.rows = [];
    // each step shows what it gives as art before its words: the item's own thumbnail (cosmetics-art, baked once into
    // this row's sprite), a gem, or the booster bolt; its Gold reward the same way on a gold disc
    for (let i = 0; i < steps.length; i++) {
      const sp = steps[i], tid = sp.item ? sp.item : sp.set ? 'set.' + sp.set : '', gs = GOLD_ROAD.steps[i], gid = gs && gs.item ? gs.item : '';
      const row = { n: midLabel(c, 'rn' + i, 44, 12.5, '#6a3f00'), r: leadLabel(c, 'rr' + i, 180, 13, CREAM, '', 800),
        kind: tid ? 'thumb' : sp.gems ? 'gem' : 'bolt', ik: tid ? 'shop.roadth.' + tid : '', ifn: null,
        gk: gid ? 'thumb' : gs && gs.gems ? 'gem' : 'bolt', gid: gid, gkey: gid ? thumbKey(gid, 28) : '' };
      if (tid) row.ifn = function (cc, w, h) { if (typeof COSM.drawItemThumb !== 'function' || !COSM.drawItemThumb(cc, tid, w / 2, h / 2, h)) paintGem(cc, w / 2, h / 2, h * 0.7); };
      c.rows.push(row);
    }
    leadLabel(c, 'after', 300, 12.5, SOFT, '', 700);
    leadLabel(c, 'gt', 230, 16, '#ffd166', INK); leadLabel(c, 'gs', 236, 12.5, CREAM, '', 700); leadLabel(c, 'gb', 184, 12.5, SOFT, '', 700);
    midLabel(c, 'back', 110, 14, CREAM, INK);
    c.btns.push(cbtn({ id: 'gold', kind: 'iap', lx: W - 80, ly: c.goldY + ROAD_GOLD.btnY, w: 120, h: 40, size: 16, onTap: tapProduct, arg: GOLD_PID }));
    c.draw = drawRoad;
  }
  {
    // a row: [flame][N-day streak] ........ [gem][amount][booster icons][check]
    const c = mkCard('streak', 'streak', 92 + STREAK.length * 30, { panel: K.card });
    leadLabel(c, 't', 260, 18, '#ffd166', INK); leadLabel(c, 's', 260, 12.5, SOFT, '', 700);
    c.rows = [];
    for (let i = 0; i < STREAK.length; i++) {
      const B = STREAK[i].boosters, bi = [];
      if (B) for (let k = 0; k < BOOSTER_IDS.length; k++) if (B[BOOSTER_IDS[k]] > 0) bi.push(BOOSTER_ART[BOOSTER_IDS[k]]);
      c.rows.push({ d: leadLabel(c, 'sd' + i, 150, 13, CREAM, '', 800), r: midLabel(c, 'sr' + i, 60, 13.5, '#ffffff', INK), aw: 20, bi: bi });
    }
    c.draw = drawStreak;
  }
  {
    // rows in MEDAL_VIEW order (ready to collect, then the nearest to done, the done ones last); a tap collects the ready
    const n = wallet.medals(MEDAL_LIST).length || 20, c = mkCard('medals', 'medals', 86 + n * 38, { panel: K.card, ready: 0 });
    leadLabel(c, 't', 260, 18, '#ffd166', INK); leadLabel(c, 's', 200, 12.5, SOFT, '', 700);
    c.rows = [];
    for (let i = 0; i < n; i++) c.rows.push({ n: leadLabel(c, 'mn' + i, 190, 13, CREAM, '', 800), g: midLabel(c, 'mg' + i, 60, 13, '#ffffff', INK), p: leadLabel(c, 'mp' + i, 60, 12.5, SOFT, '', 800) });
    midLabel(c, 'collect', 70, 12.5, '#6a3f00');
    c.tap = function (c) { if (c.ready > 0) collectMedals(c); };
    c.draw = drawMedals;
  }
}
const BADGE_GOLD = { color: GOLD, textColor: '#6a3f00' };
// the Starter card's three content chips, in reading order (they fill the card's inner 322): 500 / Rock Star / 9 boosters
const STARTER_CHIP_W = [80, 126, 116];
const BADGE_DONE = { color: GO, textColor: CREAM };
const BADGE_OFF = { color: '#3b3584', textColor: CREAM };

// the tile thumbnail fills the tile's width (the art is the product: a 500-600 gem theme deserves the room)
const TILE_TH = { w: 104, h: 84, y: 50, name: 103, state: 125 };
function drawTile(ctx, c, X, Y) {
  (c.inUse ? K.tileOn : K.tile).draw(ctx, X + c.w / 2, Y + c.h / 2, c.w, c.h);
  SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
  draw.sprite(ctx, draw.cached(c.thumbKey, TILE_TH.w, TILE_TH.h, c.thumbFn), X + c.w / 2, Y + TILE_TH.y, SPR);
  if (c.excl) { ctx.save(); ctx.translate(X + mx(c, c.w - 18), Y + 14); drawBadge(ctx, 0, 0, 24, '', BADGE_GOLD); drawArt(ctx, 'crown', 0, -1, 16); ctx.restore(); }
  c.L.n.draw(ctx, X + c.w / 2, Y + TILE_TH.name);
  // state line: in use (mint check) / owned / gem price / free / VIP / star road
  const y = Y + TILE_TH.state;
  if (c.inUse) { drawGlyph(ctx, 'check', X + c.w / 2 - c.stW / 2 - 9, y, 14, GLY_CHECK); c.L.st.draw(ctx, X + c.w / 2 + 6, y); }
  else if (c.gemPrice > 0) { drawGem(ctx, X + c.w / 2 - c.stW / 2 - 7, y, 14); c.L.st.draw(ctx, X + c.w / 2 + 6, y); }
  else c.L.st.draw(ctx, X + c.w / 2, y);
}
function drawRoad(ctx, c, X, Y) {
  drawPanel(ctx, c, X, Y);
  c.L.t.draw(ctx, X + mx(c, 18), Y + 26); c.L.s.draw(ctx, X + mx(c, 18), Y + 48);
  ctx.save(); ctx.translate(X + mx(c, c.w - 58), Y + 30); drawPill(ctx, 0, 0, 96, 30, '', PILL_IND); drawGlyph(ctx, 'star', i18n.isRTL ? 30 : -30, 0, 16, GLY_STAR); ctx.restore();
  c.L.stars.draw(ctx, X + mx(c, c.w - 52), Y + 31);
  // progress to the next step
  const bx = X + 18, bw = c.w - 36, by = Y + 70, k = ROAD.next > 0 ? clamp(ROAD.stars / ROAD.next, 0, 1) : 1;
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; draw.roundRect(ctx, bx, by - 5, bw, 10, 5); ctx.fill();
  ctx.fillStyle = GOLD; const fw = Math.max(10, bw * k); draw.roundRect(ctx, i18n.isRTL ? bx + bw - fw : bx, by - 5, fw, 10, 5); ctx.fill();
  c.L.next.draw(ctx, X + mx(c, 18), Y + 90);
  const steps = STAR_ROAD.steps;
  for (let i = 0; i < c.rows.length; i++) {
    const y = Y + 120 + i * ROAD_PITCH, done = ROAD.stars >= steps[i].stars, R = c.rows[i];
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(X + 16, y - ROAD_PITCH / 2, c.w - 32, 1); }
    drawBadge(ctx, X + mx(c, 34), y, 26, '', done ? BADGE_GOLD : BADGE_OFF);
    R.n.draw(ctx, X + mx(c, 34), y + 1);
    const ix = X + mx(c, 66), ia = done ? 0.6 : 1;
    if (R.kind === 'thumb') { SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = ia; SPR.rot = 0; draw.sprite(ctx, draw.cached(R.ik, 28, 28, R.ifn), ix, y, SPR); SPR.alpha = 1; }
    else if (R.kind === 'gem') drawGem(ctx, ix, y, 17, ia);
    else drawArt(ctx, 'bolt', ix, y, 20, ia);
    R.r.draw(ctx, X + mx(c, 84), y + 1, ia);
    if (c.showGold) {
      // the step's Gold reward on a 32-unit gold disc, its reward art in full view; until the Gold Star Road is owned
      // only a small lock on the disc's corner says it is locked (the paid track reads at a glance)
      const gx = X + mx(c, c.w - 62), ga = c.gold && done ? 0.6 : 1;
      ctx.save(); ctx.globalAlpha *= ga;
      draw.glow(ctx, gx, y, 22, '#ffd27a', c.gold ? 0.1 : 0.22);
      drawBadge(ctx, gx, y, 32, '', BADGE_GOLD);
      if (R.gk === 'thumb') drawThumb(ctx, R.gkey, R.gid, gx, y, 28); else if (R.gk === 'gem') drawGem(ctx, gx, y + 1, 19); else drawArt(ctx, 'bolt', gx, y, 22);
      ctx.restore();
      if (!c.gold) { drawBadge(ctx, gx + (i18n.isRTL ? -13 : 13), y + 11, 15, '', BADGE_OFF); drawGlyph(ctx, 'lock', gx + (i18n.isRTL ? -13 : 13), y + 11, 10, GLY_W); }
    }
    if (done) drawGlyph(ctx, 'check', X + mx(c, c.w - 26), y, 16, GLY_CHECK);
  }
  c.L.after.draw(ctx, X + mx(c, 18), Y + c.base - 20);
  if (!c.showGold) return;
  // the Gold Star Road strip
  const gy = Y + c.goldY, G = ROAD_GOLD;
  K.goldStrip.draw(ctx, X + c.w / 2, gy + G.h / 2, c.w - 20, G.h);
  drawArt(ctx, 'goldroad', X + mx(c, 54), gy + 42, 56);
  c.L.gt.draw(ctx, X + mx(c, 90), gy + 24); c.L.gs.draw(ctx, X + mx(c, 90), gy + 46);
  if (c.L.back.str) drawBackPill(ctx, c, X + mx(c, 22 + c.backW / 2), gy + G.btnY + 4);
  else c.L.gb.draw(ctx, X + mx(c, 24), gy + G.btnY + 1);
  drawBtns(ctx, c, X, Y);
}
const ROAD_GOLD = { h: 110, btnY: 78 };
const ROAD_PITCH = 34;            // the Star Road rows (room for the 32-unit Gold discs)
// the Gold Star Road's payback for the steps already reached: a FLAT badge (gold outline, a faint gold wash, no raise,
// no shadow: it must never read as a second button beside the price), a gem and '+60 now' in cream (the gem leads on
// the reading side), under the strip's art
function drawBackPill(ctx, c, x, y) {
  const w = c.backW || 108, h = 28, rtl = i18n.isRTL;
  ctx.fillStyle = 'rgba(255,201,60,0.13)'; draw.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.lineWidth = 1.8; ctx.strokeStyle = GOLD; ctx.stroke();
  drawGem(ctx, x + (rtl ? 1 : -1) * (w / 2 - 17), y, 17);
  c.L.back.draw(ctx, x + (rtl ? -9 : 9), y + 1);
}
// a pack's corner bonus tag (brass), and its top-edge 'First buy: x2' (green, the star of a reward)
const PILL_TAG_BONUS = { color: '#a8721e', textColor: CREAM, icon: '', size: 13 }, PILL_TOP_FIRST = { color: GO, textColor: CREAM, icon: 'star', size: 13 };
function drawPackTag(ctx, c, x, y) { drawPill(ctx, x, y, c.tagW, 24, c.tagStr, PILL_TAG_BONUS); }
// the top pack as a full-width hero: its art large on the leading side; name + bonus, the count, Best value and the buy
// button in the column beside it
function drawHeroPack(ctx, c, X, Y) {
  drawPanel(ctx, c, X, Y);
  const ax = X + mx(c, 86);
  draw.glow(ctx, ax, Y + 82, 84, '#ffd27a', 0.2 + 0.05 * Math.sin(st.t * 2.2));
  drawArt(ctx, 'pile' + c.tier, ax, Y + 88, 112);
  c.L.name.draw(ctx, X + mx(c, 164), Y + 28);
  if (c.tagStr) drawPackTag(ctx, c, X + mx(c, c.w - 14 - c.tagW / 2), Y + 28);
  c.L.n.draw(ctx, X + mx(c, 164), Y + 62);
  if (c.isBest) { ctx.save(); ctx.translate(X + mx(c, 164 + 62), Y + 96); drawPill(ctx, 0, 0, 124, 26, c.L.best.str, PILL_BRASS); ctx.restore(); }
  drawBtns(ctx, c, X, Y);
}
// the Booster Bundle / Mega Booster Bundle card: its art on the leading side (the trio / the crate under a pulsing neon
// glow), the count as one big tilted gold sticker on the art's bottom-trailing corner, title + sub + '5 of each booster'
// in the text column, the buy button under them
const PILL_COUNT = { color: GOLD, textColor: '#6a3f00', icon: '', size: 20 };
function drawBoostPack(ctx, c, X, Y) {
  drawPanel(ctx, c, X, Y);
  const ax = X + mx(c, 70), ay = Y + 64, rtl = i18n.isRTL;
  if (c.mega) draw.glow(ctx, ax, ay - 6, 66, '#ff4fa3', 0.22 + 0.08 * Math.sin(st.t * 3));
  else draw.glow(ctx, ax, ay, 56, '#ffb347', 0.12);
  drawArt(ctx, c.art, ax, ay + (c.mega ? 2 : 0), c.mega ? 104 : 108);
  stickerCount(ctx, X + mx(c, c.mega ? 112 : 108), Y + 106, c.cnt, c.mega);
  c.L.t.draw(ctx, X + mx(c, 146), Y + 28); c.L.s.draw(ctx, X + mx(c, 146), Y + 50); c.L.l.draw(ctx, X + mx(c, 146), Y + 72);
  drawBtns(ctx, c, X, Y);
}
// a booster count sticker ('×5' / '×15'): a gold pill, tilted, a soft bob on the Mega one
function stickerCount(ctx, x, y, str, big) {
  const w = big ? 64 : 52, h = big ? 34 : 32;
  ctx.save(); ctx.translate(x, y + (big ? Math.sin(st.t * 2.6) * 1.5 : 0)); ctx.rotate(i18n.isRTL ? 0.12 : -0.12);
  PILL_COUNT.size = big ? 21 : 20; drawPill(ctx, 0, 0, w, h, str, PILL_COUNT); ctx.restore();
}
function drawStreak(ctx, c, X, Y) {
  drawPanel(ctx, c, X, Y);
  c.L.t.draw(ctx, X + mx(c, 18), Y + 26); c.L.s.draw(ctx, X + mx(c, 18), Y + 48);
  for (let i = 0; i < c.rows.length; i++) {
    const y = Y + 78 + i * 30, done = STREAK_LIST[i] ? !!STREAK_LIST[i].done : c.best >= STREAK[i].days, R = c.rows[i], a = done ? 0.6 : 1;
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(X + 16, y - 15, c.w - 32, 1); }
    drawGlyph(ctx, 'flame', X + mx(c, 28), y, 18, done ? GLY_GOLD : GLY_LOCK);
    R.d.draw(ctx, X + mx(c, 44), y + 1, a);
    // the reward cluster, laid out from the trailing edge inward: booster icons, the amount, the gem
    const xr = c.w - 42, nb = R.bi.length;
    for (let k = 0; k < nb; k++) drawArt(ctx, R.bi[k], X + mx(c, xr - (nb - 1 - k) * 21 - 10), y, 21, a);
    const ar = xr - nb * 21 - (nb ? 5 : 0);
    R.r.draw(ctx, X + mx(c, ar - R.aw / 2), y + 1, a);
    drawGem(ctx, X + mx(c, ar - R.aw - 11), y, 15, a);
    if (done) drawGlyph(ctx, 'check', X + mx(c, c.w - 20), y, 15, GLY_CHECK);
  }
}
// a medal's trophy tint by its tier (its gem reward): bronze, silver, gold
const GLY_BRONZE = { color: '#e0915a' }, GLY_SILVER = { color: '#dfe6f2' };
function medalGly(m) { return m.gems >= 40 ? GLY_GOLD : m.gems >= 20 ? GLY_SILVER : GLY_BRONZE; }
function drawMedals(ctx, c, X, Y) {
  drawPanel(ctx, c, X, Y);
  c.L.t.draw(ctx, X + mx(c, 18), Y + 26); c.L.s.draw(ctx, X + mx(c, 18), Y + 48);
  const n = Math.min(c.rows.length, MEDAL_VIEW.length), rtl = i18n.isRTL;
  for (let i = 0; i < n; i++) {
    const m = MEDAL_VIEW[i], y = Y + 82 + i * 38, R = c.rows[i], a = m.done ? 0.6 : 1;
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(X + 16, y - 19, c.w - 32, 1); }
    if (m.ready) draw.glow(ctx, X + mx(c, 28), y - 2, 22, '#ffd27a', 0.35);
    drawGlyph(ctx, 'trophy', X + mx(c, 28), y - 2, 21, medalGly(m));
    R.n.draw(ctx, X + mx(c, 46), y - 8, a);
    // the progress bar with its count inline at its end
    const bw = 150, bx = X + (rtl ? c.w - 46 - bw : 46), k = m.goal > 0 ? clamp(m.have / m.goal, 0, 1) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; draw.roundRect(ctx, bx, y + 7, bw, 6, 3); ctx.fill();
    if (k > 0) { ctx.fillStyle = m.done ? MINT : GOLD; const fw = Math.max(6, bw * k); draw.roundRect(ctx, rtl ? bx + bw - fw : bx, y + 7, fw, 6, 3); ctx.fill(); }
    R.p.draw(ctx, X + mx(c, 46 + bw + 8), y + 10, a);
    if (m.ready) { ctx.save(); ctx.translate(X + mx(c, c.w - 52), y); drawPill(ctx, 0, 0, 76, 26, '', PILL_GOLD); c.L.collect.draw(ctx, 0, 1); ctx.restore(); continue; }
    drawGem(ctx, X + mx(c, c.w - 62), y - 2, 14, m.done ? 0.55 : 1);
    R.g.draw(ctx, X + mx(c, c.w - 34), y - 1, m.done ? 0.55 : 1);
    if (m.done) drawGlyph(ctx, 'check', X + mx(c, c.w - 84), y - 2, 13, GLY_CHECK);
  }
}
// the Medals card tapped with medals ready: pay them (wallet.collectMedals) and fly the gems into the counter
function collectMedals(c) {
  const r = wallet.collectMedals();
  if (!r || !(r.gems > 0)) return;
  const x = TUNE.content.x + c.x + c.w / 2, y = st.viewTop + c.y - SCROLL[st.tab] + 82;
  flyGems(x, Math.max(st.viewTop + 20, y), r.gems);
  celebrate(x, Math.max(st.viewTop + 20, y), false, r.gems);
  st.dirty = true;
}

// ---------------------------------------------------------------- refresh: texts, states, which cards each tab shows
function refreshCards() {
  const lang = i18n.lang, prov = providerName();
  st.provider = prov;
  // deals
  let c = CARDS.gift_d;
  c.L.t.set(i18n.t('shop.gift_ready')); c.L.s.set(i18n.t('shop.gift_sub_short')); c.btns[0].label = i18n.t('shop.claim');
  c = CARDS.starter;
  c.L.t.set(i18n.t('shop.starter')); c.L.s.set(i18n.t('shop.starter_sub'));
  const stp = productOf('mb_starter_pack'), stb = stp && stp.boosters ? (stp.boosters.xray | 0) + (stp.boosters.slowmo | 0) + (stp.boosters.second | 0) : 9;
  c.chips[0].set(fmt(stp ? stp.gems : 500)); c.chips[1].set(themeName('rock')); c.chips[2].set(i18n.t('shop.starter_chip_b', { n: stb }));
  setWorth(c, i18n.t('shop.worth_starter', { n: fmt(starterWorth()) }), 300);
  for (let i = 0; i < SPECIES.length; i++) c.specs[i] = outfitSpec(SPECIES[i], outfitId('rock', SPECIES[i]));
  iapBtn(c.btns[0], 'mb_starter_pack');
  c = CARDS.pro;
  const pro = productOf(PRO_PID);
  c.L.t.set(i18n.t('eco.pro')); c.L.s.set(i18n.t('eco.pro_sub'));
  // its value: the 1,200 gems + the items at their gem prices (worth to this player once some are owned)
  const proItems = worthYou(PRO_PID);
  setWorth(c, i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(proItems + (pro && pro.gems ? pro.gems : 0)) }));
  c.chips[0].set(fmt(pro && pro.gems ? pro.gems : 0)); c.chips[1].set(themeName('beach')); c.chips[2].set(itemName('rope.neon'));
  iapBtn(c.btns[0], PRO_PID);
  wallet.piggy(PIG);
  c = CARDS.piggy;
  c.L.t.set(i18n.t('shop.piggy')); c.L.n.set(i18n.t(PIG.full ? 'shop.piggy_full' : 'shop.piggy_inside', { n: fmt(PIG.gems) }));
  c.L.note.set(i18n.t('shop.piggy_note')); c.L.fill.set(i18n.t('shop.piggy_fill', { a: PIGGY.perPass, b: PIGGY.perGold }));
  // a full piggy is the best gems per dollar in the shop (catalog.selfTest checks it): said with the price beside it
  c.L.cap.set(st.provider === 'none' ? i18n.t('shop.piggy_cap', { n: fmt(PIG.cap) }) : i18n.t('shop.piggy_best', { n: fmt(PIG.cap), price: priceString('mb_piggy_break') || i18n.t('shop.waiting') }));
  c.L.ready.set(i18n.t('shop.piggy_ready_at', { m: fmt(PIG.minBreak), n: fmt(PIG.gems) }));
  iapBtn(c.btns[0], 'mb_piggy_break'); if (!PIG.canBreak) { c.btns[0].enabled = false; c.btns[0].hidden = true; }
  c = CARDS.vip;
  c.owned = wallet.vip();
  c.L.t.set(i18n.t('shop.vip')); c.L.s.set(i18n.t(c.owned ? 'shop.vip_on' : 'shop.vip_sub2'));
  c.perks[0].set(i18n.t('shop.vip_c1')); c.perks[1].set(i18n.t(c.owned ? 'shop.vip_c3' : 'shop.vip_c2')); c.perks[2].set(i18n.t('shop.vip_c3'));
  perkFit(c, c.owned ? 2 : 3);
  // what VIP would have doubled over every night so far, once it is worth saying (200+)
  const vm = c.owned ? 0 : vipMissTotal();
  c.L.miss.set(vm >= 200 ? i18n.t('shop.vip_missed', { n: fmt(vm) }) : '');
  iapBtn(c.btns[0], 'mb_vip_rope'); c.btns[0].hidden = c.owned;
  c.btns[0].ly = Math.max(126, 64 + c.perkH) + 34;
  c.h = c.owned ? Math.max(104, 64 + c.perkH + 16) : c.btns[0].ly + 30;
  c = CARDS.pass;
  const pa = wallet.passActive(), pd = pa ? wallet.passDaysLeft() : 0;
  c.L.t.set(i18n.t('shop.pass')); c.L.s.set(i18n.t('shop.pass_sub'));
  c.perks[0].set(i18n.t('shop.pass_l1')); c.perks[1].set(i18n.t('shop.pass_l2'));
  c.perks[2].set(i18n.t('shop.pass_run_c', { n: PASS.run.from, g: PASS.run.gems }));
  c.L.act.set(pa ? tp('shop.pass_left', pd, { n: pd }) : '');
  c.L.dev.set(i18n.t('shop.pass_terms'));
  setWorth(c, i18n.t('eco.worth', { n: fmt(passWorth()) }));
  iapBtn(c.btns[0], 'mb_club_pass_30d');
  // the Gold Star Road (its sheet + the Free tab's strip; the card stays for the sheet's look)
  wallet.road(ROAD); wallet.goldBacklog(GB);
  const gOwn = wallet.purchased(GOLD_PID), gNext = goldNextText(), gBack = !gOwn && GB.gems > 0 ? i18n.t('shop.gold_now', { n: fmt(GB.gems) }) : '';
  const gBackW = gBack ? Math.round(measure(gBack, 14, 800) + 52) : 0;
  c = CARDS.goldroad;
  c.owned = gOwn;
  c.L.t.set(i18n.t(gOwn ? 'eco.gold_on' : 'eco.gold')); c.L.s.set(gOwn ? gNext : i18n.t('eco.gold_sub'));
  if (gOwn) { c.perks[0].set(i18n.t('eco.gold_after')); perkFit(c, 1); }
  else { c.perks[0].set(goldWorthText()); c.perks[1].set(i18n.t('eco.gold_l2')); c.perks[2].set(i18n.t('eco.gold_l3')); perkFit(c, 3); }
  c.L.back.set(gBack); c.backW = gBackW;
  iapBtn(c.btns[0], GOLD_PID); c.btns[0].hidden = c.btns[0].hidden || gOwn;
  c.btns[0].ly = Math.max(126, 64 + c.perkH) + 34;
  c.h = gOwn ? Math.max(124, 64 + c.perkH + 16) : c.btns[0].ly + 30;
  // Club Owner: what it holds for this player (worth + what it pays back), the rows under its perk list
  c = CARDS.owner;
  c.owned = contentDone(OWNER_PID);
  const ow = worthYou(OWNER_PID);
  c.L.t.set(i18n.t('eco.owner'));
  c.L.s.set(!c.owned && CL.owned > 0 && CL.left > 0 ? i18n.t('eco.new_items', { n: CL.left }) : i18n.t('eco.owner_sub'));
  c.perks[0].set(i18n.t('shop.owner_c1', { n: CL.total })); c.perks[1].set(i18n.t('shop.owner_l2'));
  perkFit(c, 2);
  c.ty = 66 + c.perkH + 34; c.rowY = c.ty + 52; c.h = c.rowY + 30;
  setWorth(c, c.owned ? '' : i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(ow) }), 196); c.ownStr = i18n.t('shop.owned');
  for (let i = 0; i < c.clubs.length; i++) c.clubOwn[i] = wallet.owns(c.clubs[i]);
  iapBtn(c.btns[0], OWNER_PID); c.btns[0].hidden = c.btns[0].hidden || c.owned; c.btns[0].ly = c.rowY;
  c.worthIt = c.owned || ow >= (TUNE.minWorth[OWNER_PID] || 0);
  // the Crystal Street Set
  c = CARDS.crystal;
  c.owned = contentDone(CRYSTAL_SET);
  const cw = worthYou(CRYSTAL_SET);
  c.L.t.set(i18n.t('eco.crystal'));
  c.L.s.set(!c.owned && CL.owned > 0 && CL.left > 0 ? i18n.t('eco.new_items', { n: CL.left }) : i18n.t('eco.crystal_sub'));
  setWorth(c, c.owned ? '' : i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(cw) }), 196); c.ownStr = i18n.t('shop.owned');
  for (let i = 0; i < c.ids.length; i++) { c.own[i] = wallet.owns(c.ids[i]); const it = itemById(c.ids[i]); c.names[i].set(it ? i18n.t('shop.kind.' + it.slot) : ''); }
  iapBtn(c.btns[0], CRYSTAL_SET); c.btns[0].hidden = c.btns[0].hidden || c.owned;
  c.worthIt = c.owned || cw >= (TUNE.minWorth[CRYSTAL_SET] || 0);
  const BT = BUNDLE_THEMES;
  for (let i = 0; i < BT.length; i++) {
    c = CARDS['bundle_' + BT[i]];
    const nm = i18n.t('shop.it.club.' + BT[i]);
    c.owned = contentDone(c.pid);
    c.L.t.set(i18n.t('shop.bundle', { name: nm })); c.L.s.set(i18n.t('shop.bundle_short'));
    c.ownStr = i18n.t('shop.owned');
    setWorth(c, worthLine(c.pid));
    iapBtn(c.btns[0], c.pid); c.btns[0].hidden = c.owned;
    c.btns[1].label = ''; c.btns[1].hidden = !canTry() || wallet.owns('club.' + BT[i]);
  }
  c = CARDS.boostb;
  c.L.t.set(i18n.t('shop.boost_bundle')); c.L.s.set(i18n.t('shop.boost_bundle_sub')); c.L.l.set(i18n.t('shop.each_n', { n: c.each }));
  iapBtn(c.btns[0], 'mb_booster_bundle');
  c = CARDS.megab;
  c.L.t.set(i18n.t('eco.mega')); c.L.s.set(i18n.t('eco.mega_sub')); c.L.l.set(i18n.t('shop.each_n', { n: c.each }));
  iapBtn(c.btns[0], MEGA_PID);
  // gems: one corner tag per pack (First buy: x2, else its bonus), the Best value on the hero, 'Recommended' on
  // TUNE.popular
  const best = bestPack();
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p.kind !== 'gems') continue;
    c = CARDS['pack_' + p.id];
    c.L.name.set(i18n.t('shop.pack_' + c.tier)); c.L.n.set(fmt(p.gems));
    c.first = wallet.firstBuy(p.id);
    c.isBest = p === best; c.tagTop = !c.hero && (c.first || p.id === TUNE.popular);
    c.L.best.set(i18n.t(c.first ? 'eco.first_x2' : c.tagTop ? 'shop.popular' : 'shop.best'));
    c.topW = c.tagTop ? Math.round(clamp(measure(c.L.best.str, 13, 800) + 52, 110, 150)) : 0;
    c.tagStr = !c.first && p.bonus ? i18n.t('shop.bonus_s', { n: p.bonus }) : '';
    c.tagW = c.tagStr ? Math.round(measure(c.tagStr, 13, 800) + 24) : 0;
    iapBtn(c.btns[0], p.id);
  }
  // outfits
  const band = profile.bandUnlocked();
  for (let i = 0; i < OUTFIT_THEMES.length; i++) {
    const th = OUTFIT_THEMES[i];
    c = CARDS['look_' + th];
    c.L.t.set(themeName(th));
    const it0 = itemById(c.ids[0]), excl = it0 && it0.gems === null;
    const road = it0 && it0.road ? it0.road : 0;
    c.L.s.set(excl ? i18n.t('shop.starter_only') : road ? i18n.t('shop.road_free', { n: road }) + ' · ' + i18n.t('shop.per_look', { n: it0.gems }) : i18n.t('shop.per_look', { n: it0 ? it0.gems : 120 }));
    // members not in the band yet: dimmed dancers, lock chips, and the set says it holds their looks
    let future = 0;
    for (let k = 0; k < SPECIES.length; k++) {
      c.locked[k] = band.indexOf(SPECIES[k]) < 0;
      lookChip(c.btns[k], c.ids[k], SPECIES[k], c.locked[k]);
      if (c.locked[k] && !wallet.owns(c.ids[k])) future++;
    }
    const set = c.btns[5], sp = wallet.setPrice(th);
    set.hidden = false; set.enabled = true; set.icon = ''; set.label = '';
    if (excl) {
      const own = wallet.owns(c.ids[0]);
      set.kind = 'act'; set.label = own ? i18n.t('shop.set_done') : i18n.t('shop.starter'); set.color = own ? GO : AMBER; set.icon = own ? 'check' : '';
      set.enabled = !own; c.L.ref.set('');
    } else if (sp > 0) {
      set.kind = 'gem'; set.color = AMBER; setGemPrice(set, sp, i18n.t('shop.set') + ' ');
      c.L.ref.set(future > 0 ? tp('shop.set_future', future, { n: future }) : '');
    } else {
      set.kind = 'act'; set.label = i18n.t('shop.set_done'); set.color = GO; set.icon = 'check'; set.enabled = false; c.L.ref.set('');
    }
    c.h = c.L.ref.str ? 274 : 248;
  }
  // party tiles
  for (let s = 0; s < SLOT_ORDER.length; s++) {
    const slot = SLOT_ORDER[s], list = itemsBySlot(slot);
    CARDS['sec_' + slot].L.t.set(i18n.t('shop.sec.' + slot));
    CARDS['sec_' + slot].tw = measure(CARDS['sec_' + slot].L.t.str, 17);
    for (let i = 0; i < list.length; i++) tileState(CARDS['tile_' + list[i].id], list[i]);
  }
  // boosters
  const vip = wallet.vip(), tok = vip && wallet.vipToken();
  for (let i = 0; i < BOOSTER_IDS.length; i++) {
    const id = BOOSTER_IDS[i];
    c = CARDS['boost_' + id];
    c.L.t.set(i18n.t('shop.b.' + id)); c.L.s.set(i18n.t('shop.bs.' + id)); c.L.h.set(i18n.t('shop.bw.' + id));
    c.L.vip.set(id === 'xray' ? (tok ? i18n.t('shop.b_free_today') : i18n.t('shop.b_vip')) : '');
    const have = wallet.boosters(id), cap = BOOSTERS.cap || 99;
    c.L.n.set(i18n.t('shop.b_have', { n: have })).tint(have > 0 ? MINT : '#c9c3f0');
    setGemPrice(c.btns[0], c.price1, '×1 '); setGemPrice(c.btns[1], c.price5, '×5 ');
    // at the cap (99) a pack that would overflow it is shown off; a tap says why
    for (let k = 0; k < 2; k++) { const b = c.btns[k]; b.enabled = have + b.n <= cap; b.offKey = b.enabled ? '' : 'shop.b_cap'; b.offN = cap; }
  }
  // free
  c = CARDS.gift_f;
  c.ready = wallet.giftReady();
  wallet.gift(GIFT_O); c.day = GIFT_O.day;
  c.L.t.set(i18n.t('shop.gift')); c.L.s.set(i18n.t('shop.gift_sub'));
  for (let i = 0; i < 7; i++) c.days[i].set(String(GIFT.cycle[i]));
  c.btns[0].label = i18n.t(c.ready ? 'shop.claim' : 'shop.claimed'); c.btns[0].enabled = c.ready; c.btns[0].color = c.ready ? AMBER : INDIGO;
  c.btns[0].rim = c.ready ? '' : BRASS; c.btns[0].textColor = c.ready ? '' : CREAM;
  CARDS.gift_d.btns[0].enabled = c.ready;
  c = CARDS.earn;
  c.L.t.set(i18n.t('shop.earn_head')); c.perks[0].set(i18n.t('shop.earn_l1')); c.perks[1].set(i18n.t('shop.earn_l2')); c.perks[2].set(i18n.t('shop.earn_l3'));
  c = CARDS.road;
  c.L.t.set(i18n.t('shop.road')); c.L.s.set(i18n.t('shop.road_sub')); c.L.stars.set(fmt(ROAD.stars));
  c.L.next.set(ROAD.next > 0 ? i18n.t('shop.road_next', { n: ROAD.next }) + ': ' + rewardText(ROAD.reward) : '');
  for (let i = 0; i < c.rows.length; i++) {
    const sp = STAR_ROAD.steps[i];
    c.rows[i].n.set(String(sp.stars)).tint(ROAD.stars >= sp.stars ? '#6a3f00' : CREAM); c.rows[i].r.set(rewardText(sp));
  }
  c.L.after.set(i18n.t('shop.road_after'));
  // its Gold Star Road strip: while the store sells it, or once owned (then what Gold gives next)
  c.gold = gOwn; c.showGold = gOwn || shown(GOLD_PID); c.h = c.base + (c.showGold ? ROAD_GOLD.h + 12 : 0);
  c.L.gt.set(i18n.t(gOwn ? 'eco.gold_on' : 'eco.gold')); c.L.gs.set(gOwn ? gNext : i18n.t('eco.gold_sub'));
  c.L.gb.set(gOwn ? i18n.t('eco.gold_after') : goldWorthShort()); c.L.back.set(gBack); c.backW = gBackW;
  iapBtn(c.btns[0], GOLD_PID); c.btns[0].hidden = c.btns[0].hidden || gOwn || !c.showGold;
  c = CARDS.streak;
  const S = profile.data && profile.data.streak ? profile.data.streak : null;
  c.best = Math.max(S && S.best ? S.best : 0, S && S.count ? S.count : 0);
  if (typeof wallet.streakMilestones === 'function') wallet.streakMilestones(STREAK_LIST);
  c.L.t.set(i18n.t('shop.streak')); c.L.s.set(tp('shop.streak_best', c.best, { n: c.best }));
  for (let i = 0; i < c.rows.length; i++) {
    const R = STREAK[i], s = fmt(R.gems);
    c.rows[i].d.set(tp('shop.streak_days', R.days, { n: R.days })); c.rows[i].r.set(s); c.rows[i].aw = measure(s, 13.5, 800) + 4;
  }
  wallet.medals(MEDAL_LIST);
  c = CARDS.medals;
  let done = 0;
  c.ready = 0;
  MEDAL_VIEW.length = 0;
  for (let i = 0; i < MEDAL_LIST.length; i++) { const m = MEDAL_LIST[i]; if (m.done) done++; if (m.ready) c.ready++; MEDAL_VIEW.push(m); }
  // ready to collect first, then the nearest to done, the done ones last (stable by catalog order)
  MEDAL_VIEW.sort(medalOrder);
  c.L.t.set(i18n.t('shop.medals')); c.L.s.set(i18n.t('shop.medals_sub', { n: done, t: MEDAL_LIST.length }));
  c.L.collect.set(i18n.t('shop.medal_collect'));
  for (let i = 0; i < c.rows.length && i < MEDAL_VIEW.length; i++) {
    const m = MEDAL_VIEW[i];
    c.rows[i].n.set(i18n.t('shop.medal.' + m.id)); c.rows[i].g.set(String(m.gems)); c.rows[i].p.set(Math.min(m.have, m.goal) + '/' + m.goal);
  }
  // notes
  const notes = ['n_gems', 'n_looks', 'n_club', 'n_boost'];
  for (let i = 0; i < notes.length; i++) { c = CARDS[notes[i]]; c.L.t.set(i18n.t(c.key)); }
  for (const id in CARDS) alignLead(CARDS[id]);
  // the lists. Deals = a deals page, not a catalogue (TUNE.dealsMax): the gift when ready, the ONE personal offer (the
  // Starter Pack while unowned, else the Pro Pack once open, else a full Piggy, else Club Owner while it holds enough),
  // VIP while unowned, the Club Pass, and one theme bundle that rotates daily. Every other product has its own tab:
  // gem packs + the Piggy + the Pro Pack in Gems, the bundles in Outfits, Club Owner + the Crystal set in Party, the
  // booster bundles in Boosters, the Gold Star Road on the Star Road in Free
  const starterOn = !wallet.purchased('mb_starter_pack') && shown('mb_starter_pack');
  const proOn = wallet.dealOpen(PRO_PID) && shown(PRO_PID), piggyOn = shown('mb_piggy_break');
  const ownerOn = CARDS.owner.owned || (shown(OWNER_PID) && CARDS.owner.worthIt);
  const crysOn = CARDS.crystal.owned || (shown(CRYSTAL_SET) && CARDS.crystal.worthIt);
  const personal = starterOn ? CARDS.starter : proOn ? CARDS.pro : piggyOn && PIG.full && PIG.canBreak ? CARDS.piggy
    : ownerOn && !CARDS.owner.owned ? CARDS.owner : null;
  const D = LIST.deals; D.length = 0;
  if (CARDS.gift_f.ready) D.push(CARDS.gift_d);
  if (personal) D.push(personal);
  if (!wallet.vip() && shown('mb_vip_rope')) D.push(CARDS.vip);
  if (shown('mb_club_pass_30d')) D.push(CARDS.pass);
  const rot = dailyBundle();
  if (rot && D.length < TUNE.dealsMax) D.push(rot);
  const G = LIST.gems; G.length = 0; G.push(CARDS.n_gems);
  let hero = null;
  for (let i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].kind === 'gems' && shown(PRODUCTS[i].id)) { const pc = CARDS['pack_' + PRODUCTS[i].id]; if (pc.hero) hero = pc; else G.push(pc); }
  if (hero) G.push(hero);
  if (piggyOn && personal !== CARDS.piggy) G.push(CARDS.piggy);
  if (proOn && personal !== CARDS.pro) G.push(CARDS.pro);
  // tab dots: a gift waiting (Free), a full piggy (on the tab that lists it)
  K.tabs[5].dot = CARDS.gift_f.ready; K.tabs[0].dot = PIG.full && personal === CARDS.piggy; K.tabs[1].dot = PIG.full && piggyOn && personal !== CARDS.piggy;
  // Outfits: the looks a player can buy with gems first (the earn-and-spend loop), then the 5 money bundles, then the
  // Starter-only Rock Star looks
  const Lk = LIST.looks; Lk.length = 0; Lk.push(CARDS.n_looks);
  for (let i = 0; i < OUTFIT_THEMES.length; i++) if (OUTFIT_THEMES[i] !== 'rock') Lk.push(CARDS['look_' + OUTFIT_THEMES[i]]);
  for (let i = 0; i < BT.length; i++) { const bc = CARDS['bundle_' + BT[i]]; if (bc.owned || shown(bc.pid)) Lk.push(bc); }
  if (CARDS.look_rock) Lk.push(CARDS.look_rock);
  // Party: the selling line, Club Owner and the Crystal Street Set (its rope, door and buttons are tiles below), the tiles
  const Cl = LIST.club; Cl.length = 0; Cl.push(CARDS.n_club);
  if (ownerOn && personal !== CARDS.owner) Cl.push(CARDS.owner);
  if (crysOn) Cl.push(CARDS.crystal);
  for (let s = 0; s < SLOT_ORDER.length; s++) { Cl.push(CARDS['sec_' + SLOT_ORDER[s]]); const list = itemsBySlot(SLOT_ORDER[s]); for (let i = 0; i < list.length; i++) Cl.push(CARDS['tile_' + list[i].id]); }
  const Bo = LIST.boosters; Bo.length = 0; Bo.push(CARDS.n_boost, CARDS.boost_xray, CARDS.boost_slowmo, CARDS.boost_second);
  if (shown('mb_booster_bundle')) Bo.push(CARDS.boostb);
  if (shown(MEGA_PID)) Bo.push(CARDS.megab);
  const F = LIST.free; F.length = 0; F.push(CARDS.gift_f, CARDS.earn, CARDS.road, CARDS.streak, CARDS.medals);
  // footer + header words
  K.title.set(i18n.t('shop.title'));
  for (let i = 0; i < K.tabs.length; i++) K.tabs[i].lbl.set(i18n.t('shop.tab.' + K.tabs[i].id));
  K.restore.label = i18n.t('shop.restore'); K.restore.hidden = prov === 'none';
  K.terms.set(i18n.t('shop.terms')); K.privacy.set(i18n.t('shop.privacy'));
  // Terms · Privacy as a measured pair in the space beside Restore (centred when Restore is hidden), in reading order
  const tw = measure(K.terms.str, 12.5, 800), pw2 = measure(K.privacy.str, 12.5, 800), gap = 18, total = tw + gap + pw2;
  const rtl = i18n.isRTL, rw = TUNE.foot.restoreW, mid = prov === 'none' ? 195 : (rtl ? (20 + 370 - rw) / 2 - 4 : (20 + rw + 370) / 2 + 4);
  LNK.tx = rtl ? mid + total / 2 - tw / 2 : mid - total / 2 + tw / 2;
  LNK.px = rtl ? mid - total / 2 + pw2 / 2 : mid + total / 2 - pw2 / 2;
  LNK.dot = rtl ? mid + total / 2 - tw - gap / 2 : mid - total / 2 + tw + gap / 2;
  LNK.tw = tw / 2 + 8; LNK.pw = pw2 / 2 + 8;
  K.legal.set(prov === 'mock' ? i18n.t('shop.legal_demo') : prov === 'none' ? i18n.t('shop.in_app') : i18n.t(isAndroid() ? 'shop.legal_android' : 'shop.legal_ios'));
  // (st.layoutLang is set by layout() only: a refresh in the same frame as a language change must not hide the relayout)
}
function rewardText(r) {
  if (!r) return '';
  if (typeof r === 'number') return i18n.t('shop.gems_n', { n: fmt(r) });
  if (typeof r === 'string') return itemById(r) ? itemName(r) : '';
  const parts = [];
  if (r.gems) parts.push(i18n.t('shop.gems_n', { n: fmt(r.gems) }));
  if (r.item) parts.push(itemName(r.item));
  if (r.set) parts.push(i18n.t('shop.road_set', { name: themeName(r.set) }));
  if (r.boosters) parts.push(i18n.t('shop.road_boosters'));
  return parts.join(' + ');
}
// a Gold Star Road reward ({ gems?, boosters?, item? }) in words: '60 gems', 'Gold plate', '1 of each booster ×2'
function goldText(r) {
  if (!r) return '';
  const parts = [];
  if (r.gems) parts.push(i18n.t('shop.gems_n', { n: fmt(r.gems) }));
  if (r.item) parts.push(itemName(r.item));
  if (r.boosters) { const n = r.boosters.xray | 0; parts.push(i18n.t('shop.road_boosters') + (n > 1 ? ' ×' + n : '')); }
  return parts.join(' + ');
}
// 'Gold at 75 stars: 100 gems' (ROAD filled by wallet.road)
function goldNextText() { return ROAD.next > 0 ? i18n.t('eco.gold_next', { n: ROAD.next, what: goldText(ROAD.goldReward) }) : ''; }
// the whole Gold track in one honest line: 'Gems, 15 boosters + 4 skins (2,085+ gems) by 220 stars' / the short one
function goldWorthText() { const G = goldWorth(); return i18n.t('shop.gold_worth', { b: G.b, k: G.k, n: fmt(G.n), s: G.s }); }
function goldWorthShort() { const G = goldWorth(); return i18n.t('shop.gold_worth_short', { n: fmt(G.n), s: G.s }); }
// a Gold Star Road step in the sheet's track: '12★ 60 gems', '24★ 1 of each booster', '100★ Gilded door'
function goldStepText(i) {
  const r = GOLD_ROAD.steps[i], sp = STAR_ROAD.steps[i];
  if (!r || !sp) return '';
  const parts = [];
  const nb = r.boosters ? (r.boosters.xray | 0) + (r.boosters.slowmo | 0) + (r.boosters.second | 0) : 0;
  // gems + boosters in one short phrase ('200 gems + 6 boosters'), so the track's two columns fit the sheet
  if (r.gems && nb) parts.push(i18n.t('shop.trk_gb', { g: fmt(r.gems), b: nb }));
  else if (r.gems) parts.push(i18n.t('shop.gems_n', { n: fmt(r.gems) }));
  if (r.item) { const k = 'shop.trk.' + r.item, D = DICT[i18n.lang] || DICT.en; parts.push(D[k] !== undefined ? i18n.t(k) : itemName(r.item)); }
  if (nb && !r.gems) { const n = r.boosters.xray | 0; parts.push(n > 1 ? i18n.t('shop.each_n', { n: n }) : i18n.t('shop.road_boosters')); }
  return i18n.t('shop.trk_step', { s: sp.stars, what: parts.join(' + ') });
}
// the Medals card order: ready to collect, then the nearest to done (progress share), the done ones last
function medalOrder(a, b) {
  const ra = a.ready ? 0 : a.done ? 2 : 1, rb = b.ready ? 0 : b.done ? 2 : 1;
  if (ra !== rb) return ra - rb;
  const ka = a.goal > 0 ? a.have / a.goal : 0, kb = b.goal > 0 ? b.have / b.goal : 0;
  if (ra === 1 && ka !== kb) return kb - ka;
  return MEDAL_LIST.indexOf(a) - MEDAL_LIST.indexOf(b);
}
// Deals' one theme bundle: the unowned bundles the store sells take turns, one per local day
function dailyBundle() {
  const L = [];
  for (let i = 0; i < BUNDLE_THEMES.length; i++) { const bc = CARDS['bundle_' + BUNDLE_THEMES[i]]; if (bc && !bc.owned && shown(bc.pid)) L.push(bc); }
  if (!L.length) return null;
  const d = new Date(), day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return L[day % L.length];
}
// ---- words for the placements other scenes own (call on change only, never per frame)
// roadRewardWhat(R): what a result's Star Road step(s) gave (R = wallet.onResult's REWARD with roadSteps > 0): the item /
// outfit set, else '80 gems + 1 of each booster', '1 of each booster' or 'N gems' (never '0 gems'). R.boosters may also
// hold a same-night streak milestone's boosters; the step table decides which wording applies.
export function roadRewardWhat(R) {
  if (!R) return '';
  const it = R.items && R.items.length ? String(R.items[0]) : '';
  if (it) return it.indexOf('outfit.') === 0 ? i18n.t('shop.road_set', { name: themeName(it.split('.')[1]) }) : i18n.t('shop.it.' + it);
  const g = R.lines && R.lines.road ? R.lines.road : 0, B = R.boosters;
  const nb = B ? (B.xray | 0) + (B.slowmo | 0) + (B.second | 0) : 0;
  if (g > 0 && nb > 0) return i18n.t('shop.road_gems_boosters', { n: fmt(g) });
  if (nb > 0 || g <= 0) return i18n.t('shop.road_boosters');
  return i18n.t('shop.gems_n', { n: fmt(g) });
}
// passNewsText(res): home's news line for a Club Pass delivery (res = wallet.passSettle()'s { days, gems, boosters }):
// 'Club Pass: +50 gems + 1 Slow-Mo (day 4/30)', or the total for several missed days; '' when nothing was paid
const PASS_O = { active: false, daysLeft: 0, paidDays: 0, total: 0, until: 0 };
export function passNewsText(res) {
  if (!res || !(res.days > 0)) return '';
  const B = res.boosters || {}, nb = (B.xray | 0) + (B.slowmo | 0) + (B.second | 0);
  if (res.days === 1 && nb === 1) {
    const id = B.xray ? 'xray' : B.slowmo ? 'slowmo' : 'second';
    if (typeof wallet.pass === 'function') wallet.pass(PASS_O);
    return i18n.t('shop.pass_news', { gems: fmt(res.gems), name: i18n.t('shop.b.' + id), d: PASS_O.paidDays || 1, t: PASS_O.total || 30 });
  }
  return i18n.t('shop.pass_news_n', { gems: fmt(res.gems), b: nb });
}
// an IAP button: the store price, disabled until it can be sold; on the public web build: 'In the app'
function iapBtn(b, pid) {
  const prov = st.provider;
  b.kind = 'iap'; b.hidden = false; b.color = AMBER; b.rim = ''; b.textColor = ''; b.icon = ''; b.offKey = ''; b.offN = 0;
  if (prov === 'none') { b.label = i18n.t('shop.in_app'); b.enabled = false; b.color = INDIGO; b.rim = BRASS; b.textColor = CREAM; b.size = 12; return; }
  // while a store purchase is still open (even one started before the shop was closed and reopened) every buy waits
  const busyNow = payBusy();
  b.label = busyNow && st.buyPid === pid ? i18n.t('shop.waiting') : priceString(pid) || i18n.t('shop.waiting'); b.enabled = canSell(pid) && !busyNow;
  b.pid = pid;
  if (busyNow) b.offKey = 'shop.busy';
  if (prov === 'native' && !productShown(pid)) b.hidden = true;
}
// the store returned this product (native) or the provider shows every product (mock / none)
function shown(pid) { return st.provider !== 'native' || productShown(pid); }
// a look's chip: worn = a big check on a green chip (no word: the chip is ~56 wide), owned = 'Wear' at 14.5, else its
// gem price; a member not in the band yet = a lock on a dim chip (b.locked: a tap says when it joins), a Starter-only
// look = a lock (its tap opens the Starter Pack)
function lookChip(b, id, sp, locked) {
  const it = itemById(id), own = wallet.owns(id), worn = own && wallet.equipped('outfit', sp) === id;
  b.enabled = true; b.hidden = false; b.rim = ''; b.textColor = ''; b.icon = ''; b.iconColor = ''; b.label = ''; b.locked = false;
  if (worn) { b.kind = 'act'; b.color = GO; b.icon = 'check'; b.iconColor = '#ffffff'; b.size = 16; }
  else if (own) { b.kind = 'act'; b.label = i18n.t('shop.wear'); b.color = INDIGO; b.rim = BRASS; b.textColor = CREAM; b.size = 14.5; }
  else if (locked) { b.kind = 'act'; b.icon = 'lock'; b.color = '#2a2760'; b.rim = '#6a5a9a'; b.iconColor = '#a59fd6'; b.size = 15; b.locked = true; }
  else if (it && it.gems !== null && it.gems !== undefined) { b.kind = 'gem'; b.color = AMBER; setGemPrice(b, wallet.priceOf(id) || it.gems, ''); }
  else { b.kind = 'act'; b.icon = 'lock'; b.color = '#3b3584'; b.rim = BRASS; b.iconColor = '#c9c3f0'; }
}
function tileState(c, it) {
  const own = wallet.owns(it.id), inUse = own && wallet.equipped(it.slot) === it.id;
  c.inUse = inUse; c.excl = it.via === 'vip' || it.via === 'starter'; c.gemPrice = 0;
  c.L.n.set(itemName(it.id));
  let s;
  if (inUse) s = i18n.t('shop.in_use');
  else if (own) s = i18n.t(it.via === 'default' ? 'shop.free_item' : 'shop.owned');
  else if (it.gems !== null && it.gems !== undefined) { c.gemPrice = it.gems; s = fmt(it.gems); }
  else if (it.via === 'vip') s = i18n.t('shop.vip_only');
  else s = i18n.t('shop.in_shop');
  c.L.st.set(s).tint(inUse ? MINT : c.gemPrice ? '#ffffff' : '#ffe2b8');
  c.stW = measure(s, 12.5, 800);
}
function canTry() { const w = homeWorld(); return !!(w && typeof w.previewLook === 'function'); }

// ---------------------------------------------------------------- layout
function layout() {
  const H = stage.h, P = TUNE.panel, Hd = TUNE.head, rtl = i18n.isRTL;
  st.layoutH = H; st.layoutLang = i18n.lang;
  st.top = stage.safeTop + P.top;
  st.bot = H - stage.safeBottom - P.bottom;
  K.close.x = 44; K.close.y = st.top + Hd.title;
  st.counterY = st.top + Hd.counter;
  const tw = TUNE.content.w / TAB_IDS.length;
  for (let i = 0; i < K.tabs.length; i++) { const k = rtl ? K.tabs.length - 1 - i : i; K.tabs[i].x = TUNE.content.x + tw * (k + 0.5); K.tabs[i].w = tw; }
  st.viewTop = st.top + Hd.content;
  st.viewBot = st.bot - TUNE.foot.h;
  K.restore.y = st.viewBot + TUNE.foot.restoreY;
  K.restore.x = rtl ? 370 - TUNE.foot.restoreW / 2 : 20 + TUNE.foot.restoreW / 2;
  layoutList();
}
function layoutList() {
  const L = LIST[st.tab], C = TUNE.content;
  let y = C.padTop, rowX = 0, rowH = 0;
  for (let i = 0; i < L.length; i++) {
    const c = L[i];
    if (c.w < C.w - 1) {
      // grid cells (packs: 2 per row, tiles: 3 per row) sit side by side
      if (rowX + c.w > C.w + 1) { y += rowH + C.gap; rowX = 0; rowH = 0; }
      // a row whose card wears a tag on its top edge ('Recommended') gets the room above it
      if (rowX === 0) { const nx = L[i + 1]; if (c.tagTop || (nx && nx.w < C.w - 1 && nx.tagTop)) y += 12; }
      c.x = i18n.isRTL ? C.w - rowX - c.w : rowX; c.y = y;
      rowX += c.w + (c.kind === 'pack' ? 12 : 8); rowH = Math.max(rowH, c.h);
      const nx = L[i + 1];
      if (!nx || nx.w >= C.w - 1) { y += rowH + C.gap; rowX = 0; rowH = 0; }
      continue;
    }
    c.x = 0; c.y = y; y += c.h + (c.kind === 'note' || c.kind === 'sec' ? 4 : C.gap);
  }
  st.contentH = y + C.padBottom;
  st.maxScroll = Math.max(0, st.contentH - (st.viewBot - st.viewTop));
  SCROLL[st.tab] = clamp(SCROLL[st.tab], 0, st.maxScroll);
}
function setTab(id, keepScroll) {
  if (id === st.tab && keepScroll) return;
  const old = LIST[st.tab];
  // the old tab's live dancers + label canvases go (they are re-made when it shows again)
  for (let i = 0; i < old.length; i++) { dropActors(old[i]); if (LIST[id].indexOf(old[i]) < 0) for (const k in old[i].L) freeLabel(old[i].L[k]); }
  st.tab = id;
  sc.v = 0;
  disarmAll(null);
  if (!keepScroll) SCROLL[id] = 0;
  const idx = TAB_IDS.indexOf(id);
  SP_IND.to = idx; spring(st, 'ind', SP_IND);
  if (id === 'free' && typeof wallet.markRoadSeen === 'function') wallet.markRoadSeen();
  layoutList();
}

// ---------------------------------------------------------------- the grant / spend fx: gems flying to or from the counter
const FLY = [];
for (let i = 0; i < 28; i++) FLY.push({ on: false, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, t: 0, d: 0.7, delay: 0, val: 0, back: false, rot: 0 });
let flyN = 0;
function counterX() { return 195; }
function counterTarget() { return st.popup ? st.popCY : st.counterY; }
function flyGems(x, y, amount, back) {
  const F = TUNE.fly, n = clamp(Math.round(amount / F.per) + F.min, F.min, F.max);
  let left = amount, k = 0;
  for (let i = 0; i < FLY.length && k < n; i++) {
    const f = FLY[i];
    if (f.on) continue;
    const share = k === n - 1 ? left : Math.floor(amount / n);
    left -= share;
    f.on = true; f.t = 0; f.delay = k * F.stagger; f.d = F.dur[0] + Math.random() * (F.dur[1] - F.dur[0]); f.val = back ? 0 : share; f.back = !!back;
    const sx = x + (Math.random() - 0.5) * 40, sy = y + (Math.random() - 0.5) * 20, tx = counterX() - 50, ty = counterTarget();
    if (back) { f.x0 = tx; f.y0 = ty; f.x1 = sx; f.y1 = sy; } else { f.x0 = sx; f.y0 = sy; f.x1 = tx; f.y1 = ty; }
    f.cx = (f.x0 + f.x1) / 2 + (Math.random() - 0.5) * F.arc * 2; f.cy = Math.min(f.y0, f.y1) - F.arc * (0.4 + Math.random() * 0.6);
    f.rot = (Math.random() - 0.5) * 2;
    k++;
  }
  if (!back) st.pending += amount - left;
}
function updateFly(dt) {
  flyN = 0;
  for (let i = 0; i < FLY.length; i++) {
    const f = FLY[i];
    if (!f.on) continue;
    f.t += dt;
    if (f.t >= f.delay + f.d) {
      f.on = false;
      if (!f.back) {
        st.pending = Math.max(0, st.pending - f.val);
        st.bump = 1; spring(st, 'bump', SP_COUNT);
        if (st.confetti) { st.confetti = false; confettiAt(f.x1 + 50, f.y1); }
        party.ladder(Math.min(12, 1 + (st.landN++ % 12)));
        particles.emit('sparkle', f.x1, f.y1, LAND_SPARK);
      } else particles.emit('sparkle', f.x1, f.y1, LAND_SPARK);
      continue;
    }
    flyN++;
  }
  if (flyN === 0 && st.pending > 0 && !anyFly()) st.pending = 0;
}
function anyFly() { for (let i = 0; i < FLY.length; i++) if (FLY[i].on) return true; return false; }
const LAND_SPARK = { count: 4, spawnRadius: 6, colors: ['#bff3ff', '#ffffff', '#ffd166'], layer: 'front' };
function drawFly(ctx) {
  for (let i = 0; i < FLY.length; i++) {
    const f = FLY[i];
    if (!f.on || f.t < f.delay) continue;
    const u = easeIndex.inOutCubic(clamp((f.t - f.delay) / f.d, 0, 1)), v = 1 - u;
    const x = v * v * f.x0 + 2 * u * v * f.cx + u * u * f.x1, y = v * v * f.y0 + 2 * u * v * f.cy + u * u * f.y1;
    const s = TUNE.fly.size * (f.back ? 1 - 0.4 * u : 1.15 - 0.35 * u);
    drawGem(ctx, x, y, s, 1, f.rot * u);
  }
}

// ---------------------------------------------------------------- actions
function toast(key, params, sec, icon) { K.toast.show(i18n.t(key, params), sec || 2.2, icon || ''); }
const PT = { x: 0, y: 0 };
function btnScreen(c, b) { PT.x = TUNE.content.x + c.x + mx(c, b.lx); PT.y = st.viewTop + c.y - SCROLL[st.tab] + b.ly; return PT; }

// a card's price button buys at once: the store's own sheet (Face ID / the demo checkout) is the confirmation, and the
// card already shows what it holds (a tap on the card body still opens the product's sheet)
function tapProduct(c, b) {
  if (!b.enabled) { if (st.provider === 'none') toast('shop.in_app'); return; }
  const p = btnScreen(c, b);
  buyProduct(b.arg, p.x, p.y);
  if (sh.busy) { st.buyPid = b.arg; st.dirty = true; }
}
// a card's Try it: the preview ends back on the list; its tag opens the card's own sheet (the bundle and its price)
function tapTry(c, b) { TRY.kind = ''; TRY.buyKind = 'iap'; TRY.buyArg = c.pid || ''; tryLook('club', b.arg); }

// ---- 'Not enough gems' -> a store product -> the short gem purchase finishes. RESUME is armed by every gem buy that can
// fall short (right before its gem check); a 'nogems' sheet keeps it and names it in its note. Buying the sheet's product
// copies it to PEND; an 'ok' moves it to AFTER, which runs once the bought gems have landed in the counter.
const RESUME = { kind: '', id: '', n: 0, price: 0, sheet: false };
const PEND = { kind: '', id: '', n: 0, price: 0, sheet: false };
const AFTER = { kind: '', id: '', n: 0, price: 0, sheet: false, t: -1 };
function armResume(kind, id, n, price, sheet) { RESUME.kind = kind; RESUME.id = id; RESUME.n = n || 0; RESUME.price = price || 0; RESUME.sheet = !!sheet; }
function copyResume(to, from) { to.kind = from.kind; to.id = from.id; to.n = from.n; to.price = from.price; to.sheet = from.sheet; }
function resumeName(R) {
  if (R.kind === 'item' || R.kind === 'look') return itemName(R.id);
  if (R.kind === 'set') return i18n.t('shop.road_set', { name: themeName(R.id) });
  if (R.kind === 'booster') { const nm = i18n.t('shop.b.' + R.id); return R.n > 1 ? R.n + ' ' + nm : nm; }
  return '';
}
// the cheapest product the store sells that covers `need`: the cheapest gem pack whose NEXT purchase pays enough (a
// first buy of the 3 small packs pays x2: 520 short is covered by the $2.99 pack's 630, not the $4.99 one), or the
// Starter Pack (500 gems, while unowned) or the Piggy (its contents, once breakable) when they cover it for less
function coverOffer(need) {
  let best = null;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p.kind !== 'gems' || !shown(p.id) || packGems(p) < need) continue;
    if (!best || p.usd < best.usd) best = p;
  }
  const sp = productOf('mb_starter_pack');
  if (sp && !wallet.purchased(sp.id) && (sp.gems || 0) >= need && shown(sp.id) && (!best || sp.usd < best.usd)) best = sp;
  wallet.piggy(PIG);
  const pg = productOf('mb_piggy_break');
  if (pg && PIG.canBreak && PIG.gems >= need && shown(pg.id) && (!best || pg.usd < best.usd)) best = pg;
  return best;
}
function offerLine(p) {
  if (p.kind === 'gems') return i18n.t('shop.offer_pack', { name: i18n.t('shop.pack_' + packTier(p)), n: fmt(p.gems) });
  if (p.kind === 'starter') return i18n.t('shop.offer_starter');
  if (p.kind === 'bundle') return i18n.t('shop.offer_bundle', { name: i18n.t('iap_' + p.id) });
  return i18n.t('shop.offer_piggy', { n: fmt(PIG.gems) });
}
// the theme bundle that holds what RESUME was short for (an item / a look: wallet.bundleFor; a whole set: its theme's
// bundle), when it is unowned and the store sells it now; else null. 'Not enough gems' offers it first: it holds that
// exact item plus the rest of the theme, so the player's gems stay theirs
function resumeBundle() {
  let pid = '';
  if (RESUME.kind === 'item' || RESUME.kind === 'look') pid = wallet.bundleFor(RESUME.id);
  else if (RESUME.kind === 'set') { const b = bundleOf(RESUME.id); pid = b ? b.id : ''; }
  const p = pid ? productOf(pid) : null;
  if (!p || p.kind !== 'bundle' || contentDone(pid) || !shown(pid) || !canSell(pid)) return null;
  return p;
}
// the gem purchase that was short, now paid with the bought gems (the sheet's note promised it)
function doAfter() {
  const k = AFTER.kind, id = AFTER.id, n = AFTER.n;
  AFTER.kind = ''; AFTER.t = -1;
  if (!st.active || st.closing >= 0 || !k) return;
  let r = null, it = null;
  if (k === 'item' || k === 'look') { it = itemById(id); if (it) { r = wallet.buyItem(id); if (r && r.ok) wallet.equip(it.slot, id, it.species); } }
  else if (k === 'set') { r = wallet.buySet(id); if (r && r.ok) for (let s = 0; s < SPECIES.length; s++) wallet.equip('outfit', outfitId(id, SPECIES[s]), SPECIES[s]); }
  else if (k === 'booster') { r = wallet.buyBooster(id, n); if (r && r.ok && st.arm && id !== 'xray') wallet.arm(id, true); }
  st.dirty = true;
  if (!r || !r.ok) { if (r && r.reason === 'cap') toast('shop.b_cap', { n: BOOSTERS.cap || 99 }); return; }
  spentFx(195, stage.h * 0.46, r.price || AFTER.price || 1);
  if (k === 'booster') toast('shop.b_got', { n: n, name: i18n.t('shop.b.' + id) }, 2.2, 'check');
  else toast('shop.bought', { name: k === 'set' ? themeName(id) : itemName(id) }, 2.2, 'check');
  if (it && it.species) party.sfx.voice(it.species);
  if (AFTER.sheet && (k === 'item' || k === 'look') && it) { openSheet('item', id); K.sNo.label = i18n.t('shop.done'); }
  else if (st.popup) st.autoClose = 1.4;
}
// leave a sheet for a tab of the full shop (a popup turns into the full shop)
function openTab(id) {
  if (st.popup) { st.popup = false; st.slide = 1; spring(st, 'slide', SP_OUT); }
  closeSheet(true); setTab(id);
}
function claimGift(c, b) {
  if (!wallet.giftReady()) return;
  const before = wallet.gems(), r = wallet.claimGift();
  if (!r) return;
  const p = btnScreen(c, b), got = wallet.gems() - before;
  if (got > 0) flyGems(p.x, p.y, got);
  celebrate(p.x, p.y, false, got);
  if (r.boosters) for (const k in r.boosters) if (r.boosters[k] > 0) { toast('shop.b_got', { n: r.boosters[k], name: i18n.t('shop.b.' + k) }, 2.4, 'check'); break; }
  st.dirty = true;
}
// gem purchases: the first tap arms the button ('Confirm 💎 price', green, pulsing), the second spends, but only once
// TUNE.confirmDwell has passed since the arming (a double tap is one decision, never two); short of gems: the 'nogems'
// sheet (RESUME, armed by the caller, rides along to it). The same gate guards the sheet's gem buttons (armGate).
function armGate(b) {
  if (b.confirm <= 0) { b.confirm = TUNE.confirmSec; b.armT = st.t; party.sfx.plate(); input.vibrate(TUNE.vibrate); return false; }
  if (st.t - b.armT < TUNE.confirmDwell) return false;
  b.confirm = 0;
  return true;
}
function gemGate(b, price) {
  const have = wallet.gems();
  if (have < price) { openSheet('nogems', '', price - have); return false; }
  RESUME.kind = '';
  if (b.confirm <= 0) disarmAll(b);
  return armGate(b);
}
// every armed gem button of every list (and the sheet's) goes back to its price: a tab switch, a sheet opening or
// closing never leaves one armed out of sight
function disarmAll(keep) {
  for (let t = 0; t < TAB_IDS.length; t++) {
    const L = LIST[TAB_IDS[t]];
    for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].btns.length; k++) if (L[i].btns[k] !== keep) L[i].btns[k].confirm = 0;
  }
  if (K && K.sGemMain && keep !== K.sGemMain) K.sGemMain.confirm = 0;
  if (K && K.sGemAlt && keep !== K.sGemAlt) K.sGemAlt.confirm = 0;
}
function spentFx(x, y, price) {
  flyGems(x, y, price, true);
  particles.emit('sparkle', x, y, BUY_SPARK);
  party.sfx.nice(10);
  camera.punch(1.02, 140);
}
const BUY_SPARK = { count: 18, spawnRadius: 26, colors: ['#ffd166', '#ffffff', '#bff3ff'], layer: 'front' };
function tapLookChip(c, b) {
  const id = b.arg, it = itemById(id);
  if (!it) return;
  // a member not in the band yet: its look waits until it joins ('Bean: 4 more correct admits to join')
  if (b.locked && !wallet.owns(id)) {
    const P = profile.bandProgress(it.species), left = Math.max(1, (P.need | 0) - (P.count | 0));
    toast('shop.joins', { name: i18n.t('sp_' + it.species), what: plural('band_need', left, i18n.lang, { n: left }) }, 2.8, 'lock');
    party.sfx.plate();
    return;
  }
  if (wallet.owns(id)) {
    const worn = wallet.equipped('outfit', it.species) === id;
    if (wallet.equip('outfit', worn ? '' : id, it.species)) {
      toast(worn ? 'shop.house_back' : 'shop.worn', { name: itemName(id) }, 1.8, worn ? '' : 'check');
      party.sfx.voice(it.species);
      c.flash = 1;
    }
    st.dirty = true;
    return;
  }
  if (it.gems === null || it.gems === undefined) { openSheet('iap', 'mb_starter_pack'); return; }
  const price = b.price;
  armResume('look', id, 0, price, false);
  if (!gemGate(b, price)) return;
  const r = wallet.buyItem(id);
  if (r && r.ok) {
    const p = btnScreen(c, b);
    spentFx(p.x, p.y, price);
    wallet.equip('outfit', id, it.species);
    toast('shop.bought', { name: itemName(id) }, 2.2, 'check');
    party.sfx.voice(it.species);
    c.flash = 1;
  } else failRes(r, price);
  st.dirty = true;
}
function tapSet(c, b) {
  const th = b.arg, it0 = itemById(outfitId(th, SPECIES[0]));
  if (it0 && (it0.gems === null || it0.gems === undefined)) { if (!wallet.owns(it0.id)) openSheet('iap', 'mb_starter_pack'); return; }
  const price = b.price;
  if (!(price > 0)) return;
  armResume('set', th, 0, price, false);
  if (!gemGate(b, price)) return;
  const r = wallet.buySet(th);
  if (r && r.ok) {
    const p = btnScreen(c, b);
    spentFx(p.x, p.y, price);
    for (let k = 0; k < SPECIES.length; k++) wallet.equip('outfit', outfitId(th, SPECIES[k]), SPECIES[k]);
    toast('shop.bought', { name: themeName(th) }, 2.2, 'check');
    celebrate(p.x, p.y - 60, false);
    c.flash = 1;
  } else failRes(r, price);
  st.dirty = true;
}
function tapBooster(c, b) {
  const id = b.arg, n = b.n, price = b.price;
  armResume('booster', id, n, price, false);
  if (!gemGate(b, price)) return;
  const r = wallet.buyBooster(id, n);
  if (r && r.ok) {
    const p = btnScreen(c, b);
    spentFx(p.x, p.y, price);
    toast('shop.b_got', { n: n, name: i18n.t('shop.b.' + id) }, 2, 'check');
    if (st.arm && id !== 'xray') wallet.arm(id, true);
  } else failRes(r, price);
  st.dirty = true;
}
function failRes(r, price) {
  if (r && r.reason === 'gems') openSheet('nogems', '', Math.max(1, price - wallet.gems()));
  else if (r && r.reason === 'owned') toast('shop.owned');
  else if (r && r.reason === 'cap') { toast('shop.b_cap', { n: BOOSTERS.cap || 99 }, 2.4); party.sfx.plate(); }
}
// the grant's fanfare; with gems flying (gems > 0) the confetti waits and bursts from the counter as the first gem lands
// there (the bought card's art and number stay readable), else it fires from x, y
function celebrate(x, y, big, gems) {
  if (gems > 0) st.confetti = true;
  else confettiAt(x, y);
  if (big) { party.stinger('gold'); post.pulse(PULSE); camera.punch(1.04, 200); }
  else { party.sfx.nice(12); camera.punch(1.02, 150); }
}
function confettiAt(x, y) { particles.emit('confetti', x - 60, y, CONF_L); particles.emit('confetti', x + 60, y, CONF_R); }
const CONF_L = { angle: -1.2, spread: 0.6, count: 26, layer: 'front' }, CONF_R = { angle: -1.94, spread: 0.6, count: 26, layer: 'front' };
const PULSE = { chroma: 0.22, ms: 140 };

// the IAP path: payments.buy -> grant fx from the button (gems fly into the counter), or a toast for pending / failed
function buyProduct(pid, x, y) {
  if (sh.busy) return;
  if (st.provider === 'none') { toast('shop.in_app'); return; }
  // a store purchase still open (one started before the shop was closed and reopened): wait for it, never 'unavailable'
  if (payBusy()) { toast('shop.busy', null, 2.4); return; }
  if (!canSell(pid)) { toast('shop.unavailable', null, 2.6); return; }
  sh.busy = true;
  const before = wallet.gems(), sess = st.session;
  buy(pid).then(res => {
    sh.busy = false; st.buyPid = '';
    if (!st.active) { PEND.kind = ''; return; }
    const s = res && res.status, why = res && res.reason;
    // a purchase started in an earlier visit of the shop (closed while it was open) lands in this one: the wallet has
    // it already (the counter rolls up); say so, and leave this visit's sheet / button positions alone
    if (sess !== st.session) {
      PEND.kind = '';
      if (s === 'ok') toast('purchase_arrived', null, 2.6, 'check');
      st.dirty = true;
      return;
    }
    if (s === 'ok') {
      if (PEND.kind) { copyResume(AFTER, PEND); AFTER.t = 0.45; }
      bought(pid, before, x, y);
    } else if (s === 'pending') toast('shop.pending', null, 2.8);
    else if (s === 'failed') toast('shop.failed', null, 2.6);
    else if (s === 'unavailable') {
      if (why === 'busy') toast('shop.busy', null, 2.4);
      else if (why === 'owned') toast('shop.owned', null, 2.2);
      else if (why === 'piggy') { wallet.piggy(PIG); toast('shop.piggy_ready_at', { m: fmt(PIG.minBreak), n: fmt(PIG.gems) }, 2.6); }
      else toast('shop.unavailable', null, 2.8);
    }
    PEND.kind = ''; BUNDLE_EQUIP.id = '';
    st.dirty = true;
  }, () => { sh.busy = false; st.buyPid = ''; BUNDLE_EQUIP.id = ''; PEND.kind = ''; if (st.active && sess === st.session) toast('shop.failed', null, 2.6); });
}
function bought(pid, before, x, y) {
  const got = wallet.gems() - before;
  if (sh.on) closeSheet(true);
  if (got > 0) flyGems(x, y, got);
  celebrate(x, y - 90, true, got);
  toast('shop.thanks', null, 2.4, 'check');
  const p = productOf(pid);
  // the new look goes on at once: a bundle's (or the Pro Pack's Beach) outfits, the Crystal set's rope, door and buttons
  if (p && (p.kind === 'bundle' || p.kind === 'pro')) {
    const th = p.kind === 'pro' ? 'beach' : pid.slice('mb_bundle_'.length);
    for (let k = 0; k < SPECIES.length; k++) wallet.equip('outfit', outfitId(th, SPECIES[k]), SPECIES[k]);
  }
  if (p && p.kind === 'set') for (let k = 0; k < p.items.length; k++) { const it = itemById(p.items[k]); if (it) wallet.equip(it.slot, it.id); }
  // a bundle bought from 'not enough gems' (or an item sheet's bundle button): the item it was for goes on at once
  const eq = BUNDLE_EQUIP.id ? itemById(BUNDLE_EQUIP.id) : null, reopen = !!eq && BUNDLE_EQUIP.sheet;
  if (eq && wallet.owns(eq.id)) wallet.equip(eq.slot, eq.id, eq.species);
  BUNDLE_EQUIP.id = ''; BUNDLE_EQUIP.sheet = false;
  if (reopen && eq.slot !== 'outfit' && !st.popup) { openSheet('item', eq.id); return; }
  // a popup closes on its own after the grant, unless the short gem purchase still has to finish (doAfter closes then)
  if (st.popup && !AFTER.kind) st.autoClose = 1.6;
}
// a purchase the store delivers later (Ask to Buy approved, a slow card: transactionUpdated -> source 'update') while the
// shop is open: the counter counts up through onWallet, this says why
function onLatePurchase(ev) {
  if (!st.active || !ev || ev.source !== 'update' || !ev.granted) return;
  toast('purchase_arrived', null, 2.6, 'check');
  st.dirty = true;
}
function doRestore() {
  if (st.restoring) return;
  st.restoring = true;
  toast('shop.restoring', null, 1.6);
  // payments.restore() -> { status, restored (new), owned (this Apple ID's non-consumables) }: a fresh install has
  // usually restored everything silently at launch, so 'ok' with owned > 0 and nothing new says it is all here
  restore().then(r => {
    st.restoring = false;
    if (!st.active) return;
    const m = restoreNote(r, st.provider === 'mock');
    if (!m) K.toast.hide(); else toast(m.key, m.params, 2.6, m.icon);
    st.dirty = true;
  }, () => { st.restoring = false; if (st.active) toast('shop.restore_failed', null, 2.4); });
}

// ---- Try it: the shop steps aside for 3 s while home's own world shows the look (world.previewLook). Only a tag shows:
// 'Try it · name' just above home's PLAY button (TUNE.tryTag: clear of the Daily / All-Nighter cards and the lobby's
// lines), a ring on its leading end running the seconds down, a chevron on its trailing end; a tap on the tag opens the
// product's sheet (buyKind / buyArg) at once, a tap anywhere else ends the preview. A Try started in a sheet (TRY.kind)
// reopens that sheet when the preview ends, so its Buy is one tap away
const TRY = { kind: '', arg: '', buyKind: '', buyArg: '' };
function tryLook(slot, id) {
  const w = homeWorld();
  if (!w || typeof w.previewLook !== 'function') return;
  w.previewLook(lookWith(LOOK_A, slot, id), TUNE.trySec);
  if (slot === 'club') setTheme(id);
  st.tryT = TUNE.trySec;
  K.hint.set(i18n.t('shop.try') + ' · ' + itemName(id));
  st.hintW = Math.min(340, measure(K.hint.str, 15) + 92);
  party.sfx.whoosh(0);
}
// the tag's centre y: TUNE.tryTag.up above home's PLAY button (else above the safe bottom's button rows)
function tryTagY() { const pt = playTop(); return pt > 0 ? pt - TUNE.tryTag.up : stage.h - stage.safeBottom - 260; }
function tryTagHit(x, y) { return Math.abs(x - 195) <= st.hintW / 2 + 8 && Math.abs(y - tryTagY()) <= TUNE.tryTag.h / 2 + 8; }
const PILL_TRY = { color: '#221f5c', textColor: CREAM, icon: '' }, BADGE_TRY = { color: '#141236', textColor: CREAM }, GLY_TRY = { color: AMBER };
function drawTryTag(ctx, a) {
  const T = TUNE.tryTag, w = st.hintW, y = tryTagY(), rtl = i18n.isRTL, lead = rtl ? 1 : -1;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(195, y);
  drawPill(ctx, 0, 0, w, T.h, '', PILL_TRY);
  K.hint.draw(ctx, -lead * 4, 1);
  // the seconds left: a dark disc with the count, its amber arc running down
  const rx = lead * (w / 2 - T.ring - 7), left = clamp(st.tryT / TUNE.trySec, 0, 1);
  drawBadge(ctx, rx, 0, T.ring * 2, String(Math.max(1, Math.ceil(st.tryT))), BADGE_TRY);
  ctx.beginPath(); ctx.arc(rx, 0, T.ring - 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * left * (rtl ? -1 : 1), rtl);
  ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.strokeStyle = AMBER; ctx.stroke();
  drawGlyph(ctx, rtl ? 'arrowL' : 'arrowR', -lead * (w / 2 - 20), 0, 16, GLY_TRY);
  ctx.restore();
}
function endTry(reopen) {
  if (st.tryT < 0) return;
  st.tryT = -1;
  const w = homeWorld();
  if (w && typeof w.setLook === 'function') w.setLook(wallet.look(LOOK_A));
  setTheme(wallet.equipped('club'));
  const k = TRY.kind, a = TRY.arg;
  TRY.kind = '';
  if (reopen === true && k && st.active && st.closing < 0 && (!sh.on || sh.out)) openSheet(k, a);
}

// ================================================================ sheet
// the sheet's height from what it shows (art, the state line or chip, 'What you get' + its lines, the Gold track, the
// note), then ONE button stack in its order: the primary (main), its small caption (the ≈ money reference), the
// secondary (alt: a bundle, a pack, x1, See all packs), the quiet one (no: Not now / Earn free gems); tight steps
// between them (SB), no dead room above them. Try it is a round play button on the art's corner, never in the stack.
// The caption sits under the primary button's slab AND its drop shadow (capDy: SB.mainD + the slab's ~7 + 9 more),
// never inside the 3D edge. A booster sheet's art band is its little scene (boosterScene), 150 tall.
const SB = { gap: 12, main: 58, mainD: 6, cap: 26, capDy: 16, alt: 46, altD: 5, no: 40, noD: 4, step: 6, pad: 12, trackRow: 21, noteLH: 16.5 };
function sheetMetrics() {
  const L = K.sL;
  sh.artY = sh.kind === 'item' ? 178 : sh.track ? 148 : sh.kind === 'nogems' ? (sh.specs ? 160 : 152) : sh.kind === 'booster' ? 160 : 168;
  sh.textY = sh.artY + (sh.kind === 'item' ? 118 : sh.specs ? 80 : sh.track ? 70 : sh.kind === 'nogems' ? 80 : sh.kind === 'booster' ? 82 : 86);
  let y = sh.textY;
  if (L.state.str) y += 26;
  if (sh.nLines) y += 24 + sh.nLines * 27;
  if (sh.track) y += 22 + 5 * SB.trackRow + 22;
  // the note wraps to 1-3 lines (the Club Pass terms take 3); its height follows
  sh.noteLines = L.note.str ? clamp(Math.ceil(measure(L.note.str, 12.5, 700) / 282), 1, 3) : 0;
  if (sh.noteLines) y += sh.noteLines * SB.noteLH + 6;
  y += SB.gap;
  sh.mainDy = sh.altDy = sh.noDy = sh.capDy = 0;
  if (!K.sMain.hidden) { sh.mainDy = y + SB.main / 2; y += SB.main + SB.mainD; }
  if (L.cap.str) { sh.capDy = y + SB.capDy; y += SB.cap; }
  if (!K.sAlt.hidden) { y += SB.step + (sh.altTag ? 10 : 0); sh.altDy = y + SB.alt / 2; y += SB.alt + SB.altD; }
  if (!K.sNo.hidden) { y += SB.step; sh.noDy = y + SB.no / 2; y += SB.no + SB.noD; }
  sh.h = Math.round(y + SB.pad);
}
function sheetLayout() {
  const H = stage.h, w = sh.w, h = sh.h, bx = 195, pc = st.popup && popCounter() ? POPC.push : 0;
  sh.top = Math.round(clamp((H - h) / 2 + (st.popup ? 18 : 0) + pc, stage.safeTop + (st.popup ? 40 : 12) + pc, H - stage.safeBottom - h - 8));
  K.sX.x = bx - w / 2 + 30; K.sX.y = sh.top + 30;
  K.sMain.x = bx; K.sMain.y = sh.top + sh.mainDy;
  K.sAlt.x = bx; K.sAlt.y = sh.top + sh.altDy;
  K.sNo.x = bx; K.sNo.y = sh.top + sh.noDy;
  // Try it: on the art's top-trailing corner (the item preview, or a bundle's stage)
  const P = TUNE.preview, hw = sh.kind === 'item' ? P.w / 2 : 150, hh = sh.kind === 'item' ? P.h / 2 : 62;
  K.sTry.x = bx + (i18n.isRTL ? -1 : 1) * (hw - 27); K.sTry.y = sh.top + sh.artY - hh + 27;
  st.popCY = sh.top + POPC.dy;
}
// re-measure and re-place an open sheet after its state changed (bought, used, a price arrived)
function relayoutSheet() { sheetMetrics(); sheetLayout(); }
function sheetShape() { return (K.sMain.hidden ? 1 : 0) + (K.sAlt.hidden ? 2 : 0) + (K.sNo.hidden ? 4 : 0) + (K.sL.cap.str ? 8 : 0) + (K.sL.state.str ? 16 : 0); }
// the popup's gem counter: only on gem-priced sheets (a booster, an item, 'not enough gems'), never over a money
// product (Starter, VIP, Pass); it sits ON the sheet's top edge (inside its scale-in), so it never lands on the scene's
// wordmark; after the sheet closes it stays there only while gems are still flying into it
// (a popup sheet that shows it sits POPC.push lower, so the counter clears the scene's wordmark and the title below it)
const POPC = { dy: -10, push: 20 };
function popCounter() { return sh.kind === 'booster' || sh.kind === 'item' || sh.kind === 'nogems'; }
// a stage sheet's band in a theme's outfits (Starter / bundle / Pro / a 'nogems' bundle or Starter offer)
function sheetStage(th) {
  sh.theme = th; sh.stageKey = 'shop.stage2.' + th + '.300'; sh.specs = [];
  for (let k = 0; k < SPECIES.length; k++) sh.specs.push(outfitSpec(SPECIES[k], outfitId(th, SPECIES[k])));
}
// the 'Owned' / 'In use' state: a green status chip on the state line and one 'Done' (no second button)
function sheetDone(key) {
  K.sL.state.set(i18n.t(key)); sh.chip = 'go'; sh.done = true;
  K.sMain.hidden = false; K.sMain.overlay = null; K.sMain.label = i18n.t('shop.done'); K.sMain.enabled = true; K.sMain.color = AMBER; K.sMain.icon = '';
  K.sMain.rim = ''; K.sMain.textColor = ''; K.sAlt.hidden = true; K.sNo.hidden = true; K.sL.cap.set('');
}
const BUNDLE_EQUIP = { id: '', sheet: false };          // a bundle bought from 'not enough gems': the item it was for
const NEVER_SKIN = { shown: false };                       // the item sheet's fairness line was shown this session
// openSheet('iap', productId) | ('item', itemId) | ('booster', boosterId) | ('nogems', '', need)
function openSheet(kind, arg, need) {
  if (sh.busy) return;
  if (kind !== 'nogems') RESUME.kind = '';
  sh.on = true; sh.out = false; sh.t = 0; sh.kind = kind; sh.need = need || 0; sh.pid = ''; sh.item = ''; sh.booster = ''; sh.slot = ''; sh.preview = '';
  sh.actors = null; sh.specs = null; sh.theme = ''; sh.art = ''; sh.stageKey = ''; sh.thumbKey = ''; sh.mainTab = ''; sh.noTab = '';
  sh.altPid = ''; sh.firstOn = ''; sh.firstStr = ''; sh.track = false; sh.done = false; sh.chip = ''; sh.sticker = ''; sh.stickW = 0;
  sh.count = ''; sh.altTag = ''; sh.altTagW = 0;
  K.sMain.hidden = false; K.sAlt.hidden = true; K.sNo.hidden = false; K.sMain.enabled = true; K.sAlt.enabled = true; K.sTry.hidden = true;
  K.sMain.color = AMBER; K.sMain.rim = ''; K.sMain.textColor = ''; K.sMain.icon = ''; K.sMain.overlay = null; K.sMain.label = ''; K.sMain.off = false;
  K.sMain.w = 250; K.sMain.size = 21; K.sMain.alpha = 1; K.sAlt.alpha = 1; K.sMain.breathe = 0; K.sAlt.breathe = 0;
  K.sMain.offKey = ''; K.sMain.offP = null; K.sAlt.offKey = ''; K.sAlt.offP = null;
  K.sAlt.overlay = null; K.sAlt.icon = ''; K.sAlt.label = ''; K.sAlt.w = 150; K.sAlt.size = 16; K.sAlt.color = INDIGO; K.sAlt.rim = BRASS; K.sAlt.textColor = CREAM;
  disarmAll(null);
  const L = K.sL;
  for (let i = 0; i < 4; i++) { L.lines[i].set(''); K.lineArt[i] = ''; }
  L.note.set(''); L.state.set(''); L.big.set(''); L.head.set(''); L.cap.set('');
  K.sNo.label = i18n.t('shop.not_now');
  let nl = 0;
  const line = (str, art) => { if (nl < 4) { L.lines[nl].set(str); K.lineArt[nl] = art; nl++; } };
  if (kind === 'iap') {
    const p = productOf(arg);
    if (!p) { sh.on = false; return; }
    sh.pid = arg;
    L.head.set(i18n.t('shop.what_you_get'));
    if (p.kind === 'gems') {
      L.title.set(i18n.t('shop.gems_n', { n: fmt(p.gems) })); L.sub.set(i18n.t('shop.pack_' + packTier(p)));
      sh.art = 'pile' + packTier(p);
      line(i18n.t('shop.gems_n', { n: fmt(p.gems) }), 'gem');
      if (p.bonus) line(i18n.t('shop.bonus', { n: p.bonus }), 'star');
      if (wallet.firstBuy(p.id)) line(i18n.t('eco.first_x2_sub', { name: i18n.t('shop.pack_' + packTier(p)), n: fmt(packGems(p)) }), 'star');
      L.note.set(i18n.t('shop.gems_head'));
    } else if (p.kind === 'starter') {
      // the popup's value sticker on the Rock Star stage (its gems + boosters at their gem prices; the looks are exclusive)
      // (its one value claim is the sticker; 'What you get' lists the contents)
      L.title.set(i18n.t('shop.starter')); L.sub.set(i18n.t('shop.starter_sub'));
      sheetStage('rock');
      sh.sticker = i18n.t('shop.worth_starter', { n: fmt(starterWorth()) });
      line(i18n.t('shop.starter_l1'), 'gem'); line(i18n.t('shop.starter_l2'), 'bow'); line(i18n.t('shop.starter_l3'), 'bolt');
      L.note.set(i18n.t('shop.starter_note'));
    } else if (p.kind === 'vip') {
      L.title.set(i18n.t('shop.vip')); L.sub.set(i18n.t('shop.vip_sub2')); sh.art = 'vip';
      line(i18n.t('shop.vip_l1'), 'gem'); line(i18n.t('shop.vip_l2'), 'crown'); line(i18n.t('shop.vip_l3'), 'glasses');
      const vm = wallet.vip() ? 0 : vipMissTotal();
      if (vm >= 200) L.state.set(i18n.t('shop.vip_missed', { n: fmt(vm) }));
      L.note.set(i18n.t('shop.forever') + '. ' + i18n.t('shop.restorable') + '.');
    } else if (p.kind === 'pass') {
      L.title.set(i18n.t('shop.pass')); L.sub.set(i18n.t('shop.pass_sub')); sh.art = 'ticket';
      line(i18n.t('shop.pass_l1'), 'gem'); line(i18n.t('shop.pass_l2'), 'bolt'); line(i18n.t('shop.pass_l3'), 'star');
      line(i18n.t('shop.pass_run_c', { n: PASS.run.from, g: PASS.run.gems }), 'flame');
      if (wallet.passActive()) { const d = wallet.passDaysLeft(); L.state.set(tp('shop.pass_left', d, { n: d }) + ' · ' + i18n.t('shop.pass_more')); }
      L.note.set(i18n.t('shop.pass_note') + ' ' + i18n.t('shop.pass_device'));
    } else if (p.kind === 'bundle') {
      const th = arg.slice('mb_bundle_'.length), nm = i18n.t('shop.it.club.' + th);
      L.title.set(i18n.t('shop.bundle', { name: nm })); L.sub.set(i18n.t('shop.forever'));
      sheetStage(th);
      line(i18n.t('shop.bundle_l1', { name: nm }), 'house'); line(i18n.t('shop.bundle_l2', { name: themeName(th) }), 'bow');
      contentState(arg);
      if (canTry() && !wallet.owns('club.' + th)) { K.sTry.hidden = false; sh.preview = 'club.' + th; }
    } else if (p.kind === 'boosters') {
      const mega = p.id === MEGA_PID;
      L.title.set(i18n.t(mega ? 'eco.mega' : 'shop.boost_bundle')); L.sub.set(i18n.t(mega ? 'eco.mega_sub' : 'shop.boost_bundle_sub'));
      sh.art = mega ? 'crate' : 'trio'; sh.count = '×' + (p.boosters.xray | 0);
      for (let k = 0; k < 3; k++) line('×' + (p.boosters[BOOSTER_IDS[k]] | 0) + ' ' + i18n.t('shop.b.' + BOOSTER_IDS[k]), BOOSTER_ART[BOOSTER_IDS[k]]);
      // boosters that would pass the 99 cap come as gems: said before the purchase
      const over = wallet.boosterOverflow(p.id);
      if (over > 0) L.state.set(i18n.t('eco.boost_over', { n: over }));
      L.note.set(i18n.t('shop.b_rules'));
    } else if (p.kind === 'set') {
      L.title.set(i18n.t('eco.crystal')); L.sub.set(i18n.t('eco.crystal_sub')); sh.art = 'crystal';
      line(i18n.t('eco.crystal_l1'), 'check'); line(i18n.t('eco.crystal_l2'), 'check'); line(i18n.t('eco.crystal_l3'), 'check');
      contentState(arg);
    } else if (p.kind === 'goldroad') {
      // the whole fixed track in words (iap.json's review note: everything listed before buying), what it pays at once
      wallet.road(ROAD); wallet.goldBacklog(GB);
      L.title.set(i18n.t('eco.gold')); L.sub.set(i18n.t('eco.gold_sub')); sh.art = 'goldroad'; sh.track = true;
      line(i18n.t('eco.gold_l2'), 'gem'); line(i18n.t('eco.gold_l3'), 'check');
      if (wallet.purchased(arg)) L.state.set(i18n.t('eco.gold_on'));
      else if (GB.gems > 0) L.state.set(i18n.t('eco.gold_paid', { what: '+' + i18n.t('shop.gems_n', { n: fmt(GB.gems) }) }));
      else L.state.set(goldWorthShort());
      L.trackHead.set(i18n.t('shop.gold_track'));
      for (let i = 0; i < L.track.length; i++) L.track[i].set(goldStepText(i));
      trackFit();
      L.trackAfter.set(i18n.t('eco.gold_after'));
      L.note.set(i18n.t('shop.forever') + '. ' + i18n.t('shop.restorable') + '.');
    } else if (p.kind === 'pro') {
      L.title.set(i18n.t('eco.pro')); L.sub.set(i18n.t('eco.pro_sub'));
      sheetStage('beach');
      const iw = worthYou(PRO_PID);
      sh.sticker = i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(iw + (p.gems || 0)) });
      line(i18n.t('eco.pro_l1'), 'gem'); line(i18n.t('eco.pro_l2'), 'bow'); line(i18n.t('eco.pro_l3'), 'check');
      L.note.set(i18n.t('eco.pro_note'));
    } else if (p.kind === 'owner') {
      L.title.set(i18n.t('eco.owner')); L.sub.set(i18n.t('eco.owner_sub')); sh.art = 'owner';
      line(i18n.t('eco.owner_l1', { n: p.items.length }), 'check'); line(i18n.t('shop.owner_l2'), 'house');
      contentState(arg);
      // "items available today": said in the sheet too, before the price
      if (!wallet.purchased(arg)) L.note.set(i18n.t('eco.owner_l3') + ' ' + L.note.str);
    } else if (p.kind === 'piggy') {
      wallet.piggy(PIG);
      L.title.set(i18n.t('shop.piggy')); L.sub.set(i18n.t('shop.piggy_sub')); sh.art = 'jar';
      L.big.set(fmt(PIG.gems));
      line(i18n.t('shop.piggy_inside', { n: fmt(PIG.gems) }), 'gem'); line(i18n.t('shop.piggy_cap', { n: fmt(PIG.cap) }), 'jar');
      if (st.provider !== 'none') L.state.set(i18n.t('shop.piggy_best', { n: fmt(PIG.cap), price: priceString('mb_piggy_break') || i18n.t('shop.waiting') }));
      L.note.set(i18n.t('shop.piggy_note') + '. ' + i18n.t('shop.piggy_fill_long', { a: PIGGY.perPass, b: PIGGY.perGold }) + '.');
    }
    if (sh.sticker) sh.stickW = Math.round(clamp(measure(sh.sticker, 15, 800) + 66, 150, 296));
    if (soldOut(p)) sheetDone('shop.owned');
    else sheetPrice();
  } else if (kind === 'item') {
    const it = itemById(arg);
    if (!it) { sh.on = false; return; }
    sh.item = arg; sh.slot = it.slot; sh.thumbKey = 'shop.thumb.' + arg + '.92';
    // the subtitle says what the item is (one rope skin, one door...), never the plural shelf name
    L.title.set(itemName(arg)); L.sub.set(i18n.t('shop.kind.' + it.slot));
    // the fairness promise (skins never hide a clue) on the first item sheet of a session, not on every one
    if (!NEVER_SKIN.shown) { NEVER_SKIN.shown = true; L.note.set(i18n.t('shop.never_skin')); }
    preparePreview(it);
    itemSheetState(it);
  } else if (kind === 'booster') {
    sh.booster = arg;
    L.title.set(i18n.t('shop.b.' + arg)); L.sub.set(i18n.t('shop.bs.' + arg)); sh.art = BOOSTER_ART[arg];
    L.state.set(i18n.t('shop.b_have', { n: wallet.boosters(arg) }));
    const B = BOOSTERS[arg];
    L.note.set(i18n.t('shop.bw.' + arg) + '. ' + i18n.t('shop.b_rules_one', { n: B ? B.fromNight : 3 }));
    K.sMain.overlay = sheetGemOverlay; setSheetGem(K.sGemMain, B ? B.pack5 : 0, '×5 ');
    K.sAlt.hidden = false; K.sAlt.overlay = sheetGemOverlay; setSheetGem(K.sGemAlt, B ? B.gems : 0, '×1 ');
    boosterCap();
  } else {
    // Not enough gems. When the short purchase is an item / look / set whose theme bundle the player does not own, that
    // bundle is the offer (it holds the exact item + the rest of the theme: the gems stay theirs) with the covering
    // pack as the second button; else the cheapest store product that covers the gap, bought right here (its price on
    // the button), then the purchase that was short finishes with the new gems (the note says so). A pack's first
    // purchase pays double: said on its button. 'See all packs' / 'Earn free gems'.
    L.title.set(i18n.t('shop.not_enough')); L.sub.set(i18n.t('shop.need_more', { n: fmt(sh.need) }));
    const bp = st.provider === 'none' ? null : resumeBundle(), o = st.provider === 'none' ? null : coverOffer(sh.need);
    K.sNo.label = i18n.t('shop.earn_free'); sh.noTab = 'free';
    if (bp) {
      sh.pid = bp.id; sheetStage(bp.theme); sh.sticker = worthLine(bp.id);
      L.state.set(offerLine(bp));
      L.note.set(i18n.t('shop.nogems_bundle', { name: resumeName(RESUME) }));
      K.sMain.w = 300; K.sMain.size = 17;
      if (o) { sh.altPid = o.id; K.sAlt.hidden = false; K.sAlt.w = 270; K.sAlt.size = 15.5; if (o.kind === 'gems' && wallet.firstBuy(o.id)) { sh.firstOn = 'alt'; sh.firstStr = i18n.t('shop.first_x2_to', { n: fmt(packGems(o)) }); } }
      nogemsPrice();
    } else if (o) {
      sh.pid = o.id;
      if (o.kind === 'starter') sheetStage('rock'); else sh.art = o.kind === 'gems' ? 'pile' + packTier(o) : 'jar';
      L.state.set(offerLine(o));
      if (RESUME.kind) L.note.set(i18n.t('shop.nogems_then', { name: resumeName(RESUME) }));
      K.sMain.w = 290; K.sMain.size = 18;
      if (o.kind === 'gems' && wallet.firstBuy(o.id)) { sh.firstOn = 'main'; sh.firstStr = i18n.t('shop.first_x2_to', { n: fmt(packGems(o)) }); }
      nogemsPrice();
      K.sAlt.hidden = false; K.sAlt.label = i18n.t('shop.see_packs');
    } else if (st.provider === 'none') {
      sh.art = 'pile3'; L.note.set(i18n.t('shop.in_app'));
      K.sMain.label = i18n.t('shop.earn_free'); sh.mainTab = 'free'; K.sNo.label = i18n.t('shop.not_now'); sh.noTab = '';
    } else { sh.art = 'pile6'; K.sMain.label = i18n.t('shop.get_gems'); sh.mainTab = 'gems'; }
  }
  if (sh.firstStr) sh.firstW = Math.round(clamp(measure(sh.firstStr, 12.5, 800) + 30, 120, 250));
  sh.nLines = nl;
  sheetMetrics();
  sheetLayout();
  sh.a = 0; sh.s = 0.86; spring(sh, 'a', SP_SHEET); spring(sh, 's', SP_SHEET);
  K.sbtns.reset(); K.sbtns.locked = false;
  for (let i = 0; i < K.sbtns.list.length; i++) K.sbtns.list[i].pop = 1;
  party.sfx.whoosh(0);
}
function sheetPrice() {
  const prov = st.provider;
  if (sh.done) return;
  if (prov === 'none') { K.sMain.label = i18n.t('shop.in_app'); K.sMain.enabled = false; K.sMain.color = INDIGO; K.sMain.rim = BRASS; K.sMain.textColor = CREAM; return; }
  if (sh.pid === 'mb_piggy_break') {
    wallet.piggy(PIG);
    if (!PIG.canBreak) {
      // below its minimum: say when it opens instead of a dead price
      K.sMain.enabled = false; K.sMain.size = 15; K.sMain.w = 286; K.sMain.offKey = 'shop.piggy_ready_at';
      if (!K.sMain.offP) K.sMain.offP = { m: '', n: '' };
      K.sMain.offP.m = fmt(PIG.minBreak); K.sMain.offP.n = fmt(PIG.gems);
      K.sMain.label = i18n.t('shop.piggy_ready_at', K.sMain.offP);
      return;
    }
    K.sMain.size = 21; K.sMain.w = 250; K.sMain.offKey = '';
  }
  const busyNow = payBusy();
  K.sMain.label = sh.busy ? i18n.t('shop.waiting') : (priceString(sh.pid) || i18n.t('shop.waiting'));
  K.sMain.enabled = canSell(sh.pid) && !sh.busy && !busyNow;
  K.sMain.offKey = busyNow && !sh.busy ? 'shop.busy' : '';
}
// a cosmetics-only deal (a theme bundle, the Crystal set, Club Owner) has nothing left to give when it is owned, or when
// every item in it is owned already and none of them would pay gems back (got through another purchase, e.g. Club
// Owner): the shop then shows it as owned and never sells it (call on change, never per frame)
const CONTENT_KINDS = { bundle: 1, set: 1, owner: 1 };
function contentDone(pid) {
  if (wallet.purchased(pid)) return true;
  const p = productOf(pid);
  if (!p || !CONTENT_KINDS[p.kind]) return false;
  wallet.contentLeft(pid, CL);
  return CL.total > 0 && CL.left === 0 && CL.back === 0;
}
function soldOut(p) { return !!p && p.type === 'nonconsumable' && (wallet.purchased(p.id) || (CONTENT_KINDS[p.kind] === 1 && contentDone(p.id))); }
// a content deal's sheet (a theme bundle, the Crystal set, Club Owner): its worth TO THIS PLAYER on the state line ('Worth
// 1,080 gems', or '3 new for you · Worth 480 gems to you': the items left + what buying it pays back, no money
// reference), and the note: what it pays back, only when it does, with the amount, and that items got through another
// purchase are not refunded; a bundle's worth also rides its stage as a sticker
function contentState(pid) {
  const L = K.sL, own = wallet.purchased(pid), n = worthYou(pid);
  const w = i18n.t(CL.owned > 0 ? 'shop.worth_you' : 'eco.worth', { n: fmt(n) });
  if (!own) {
    L.state.set(CL.owned > 0 && CL.left > 0 ? i18n.t('eco.new_items', { n: CL.left }) + ' · ' + w : w);
    if (sh.specs) { sh.sticker = w; L.state.set(CL.owned > 0 && CL.left > 0 ? i18n.t('eco.new_items', { n: CL.left }) : ''); }
  }
  const back = own ? '' : backLine();
  L.note.set(back ? back + ' ' + i18n.t('shop.forever') + '.' : i18n.t('shop.forever') + '. ' + i18n.t('shop.restorable') + '.');
}
// an offer button's label: '550 gems · SAR 18.99' / 'Bundle: theme + 5 outfits · SAR 11.99' / 'Starter Pack · SAR 7.99'
function offerLabel(pid) {
  const p = productOf(pid);
  if (!p) return '';
  const price = sh.busy ? i18n.t('shop.waiting') : (priceString(pid) || i18n.t('shop.waiting'));
  if (p.kind === 'gems') return i18n.t('shop.offer_gems', { n: fmt(p.gems), price: price });
  if (p.kind === 'bundle') return i18n.t('eco.bundle_cta', { price: price });
  return i18n.t('shop.offer_deal', { name: i18n.t(p.kind === 'starter' ? 'shop.starter' : 'shop.piggy_break'), price: price });
}
// the 'nogems' sheet's offer buttons (main: the bundle or the covering product; alt: the covering pack beside a bundle)
function nogemsPrice() {
  if (!sh.pid) return;
  const busyNow = payBusy(), off = busyNow && !sh.busy ? 'shop.busy' : '';
  K.sMain.label = offerLabel(sh.pid); K.sMain.enabled = canSell(sh.pid) && !sh.busy && !busyNow; K.sMain.offKey = off;
  if (sh.altPid) { K.sAlt.label = offerLabel(sh.altPid); K.sAlt.enabled = canSell(sh.altPid) && !sh.busy && !busyNow; K.sAlt.offKey = off; }
}
// an item sheet's bundle button: 'Bundle: theme + 5 outfits · $2.99'
function altBundlePrice() {
  if (!sh.altPid) return;
  const busyNow = payBusy();
  K.sAlt.label = offerLabel(sh.altPid); K.sAlt.enabled = canSell(sh.altPid) && !sh.busy && !busyNow; K.sAlt.offKey = busyNow && !sh.busy ? 'shop.busy' : '';
}
// a booster sheet at the cap (99): the pack that would overflow it is off, a tap says why
function boosterCap() {
  const have = wallet.boosters(sh.booster), cap = BOOSTERS.cap || 99;
  K.sMain.enabled = have + 5 <= cap; K.sAlt.enabled = have + 1 <= cap;
  if (!K.sMain.offP) K.sMain.offP = { m: '', n: '' };
  if (!K.sAlt.offP) K.sAlt.offP = { m: '', n: '' };
  K.sMain.offP.n = cap; K.sAlt.offP.n = cap;
  K.sMain.offKey = K.sMain.enabled ? '' : 'shop.b_cap'; K.sAlt.offKey = K.sAlt.enabled ? '' : 'shop.b_cap';
}
function setSheetGem(g, price, pre) { setGemPrice(g, price, pre); g.confirm = 0; }
function sheetGemOverlay(ctx, b) { gemFace(ctx, b === K.sMain ? K.sGemMain : K.sGemAlt); }
// the item sheet's state + buttons: In use (a green chip + Done) / Owned (Use) / its gem price (two taps; the ≈ money
// reference at the entry pack's rate in a caption under it; its theme bundle one tap away under that, as a brass button
// wearing its 'Worth 1,080 gems' tag, so the better deal reads as one) / exclusive -> its deal / Star Road
function itemSheetState(it) {
  const L = K.sL, own = wallet.owns(it.id), inUse = own && wallet.equipped(it.slot) === it.id;
  K.sMain.overlay = null; K.sMain.icon = ''; K.sMain.enabled = true; K.sMain.color = AMBER; K.sMain.rim = ''; K.sMain.textColor = ''; K.sMain.label = '';
  K.sMain.hidden = false; K.sAlt.hidden = true; K.sAlt.overlay = null; K.sAlt.icon = ''; K.sNo.hidden = false; K.sTry.hidden = true;
  L.cap.set(''); sh.chip = ''; sh.done = false; sh.preview = ''; sh.altPid = ''; sh.altTag = '';
  K.sAlt.color = INDIGO; K.sAlt.rim = BRASS; K.sAlt.textColor = CREAM;
  if (inUse) sheetDone('shop.in_use');
  else if (own) { L.state.set(i18n.t('shop.owned')); sh.chip = 'ind'; K.sMain.label = i18n.t('shop.use'); }
  else if (it.gems !== null && it.gems !== undefined) {
    L.state.set(it.road ? i18n.t('shop.road_free', { n: it.road }) : it.bundle ? i18n.t('shop.in_bundle', { name: i18n.t('shop.it.club.' + it.bundle.slice('mb_bundle_'.length)) }) : '');
    K.sMain.overlay = sheetGemOverlay; setSheetGem(K.sGemMain, it.gems, '');
    const ref = gemRef(it.gems);
    if (ref) L.cap.set(i18n.t('shop.gem_ref', { n: fmt(it.gems), ref: ref }));
    const bp = it.bundle && st.provider !== 'none' && shown(it.bundle) && !contentDone(it.bundle) ? productOf(it.bundle) : null;
    if (bp) {
      sh.altPid = bp.id; K.sAlt.hidden = false; K.sAlt.w = 290; K.sAlt.size = 15.5; altBundlePrice();
      K.sAlt.color = BUNDLE_BTN; K.sAlt.rim = GOLD; K.sAlt.textColor = CREAM;
      sh.altTag = worthLine(bp.id); sh.altTagW = Math.round(clamp(measure(sh.altTag, 13, 800) + 30, 120, 230));
    }
    if (it.slot === 'club' && canTry()) { K.sTry.hidden = false; sh.preview = it.id; }
  } else if (it.via === 'vip') { L.state.set(i18n.t('shop.vip_only')); K.sMain.label = i18n.t('shop.see_vip'); }
  else { L.state.set(i18n.t('shop.starter_only')); K.sMain.label = i18n.t('shop.starter'); }
}
function preparePreview(it) {
  if (it.slot === 'plate' || it.slot === 'rope') return;
  const street = it.slot === 'door';
  if (!pw) {
    const band = profile.bandUnlocked(), specs = [];
    for (let i = 0; i < band.length; i++) specs.push(memberSpec(band[i]));
    pw = createWorld({ lobby: !street, decor: profile.decorLevel(), band: specs, beat: beat });
  } else if (pw.lobby === street && typeof pw.setLobby === 'function') pw.setLobby(!street);
  if (typeof pw.setLook === 'function') pw.setLook(lookWith(LOOK_B, it.slot, it.id));
  if (it.slot === 'club') setTheme(it.id);
}
// a sheet button that is off says why on a tap (busy store, the booster cap, the piggy below its minimum) and does nothing
function offTap(b) {
  if (b.enabled) return false;
  if (b.offKey) toast(b.offKey, b.offP, 2.4);
  else if (st.provider === 'none' && sh.kind === 'iap') toast('shop.in_app');
  return true;
}
// buy a 'nogems' offer (the bundle: it holds the item, nothing to finish after; a pack / Starter / Piggy: the purchase
// that was short finishes once its gems land) or an item sheet's bundle
function buyOffer(pid, b) {
  const p = productOf(pid);
  if (!p) return;
  if (p.kind === 'bundle') {
    PEND.kind = '';
    BUNDLE_EQUIP.id = sh.kind === 'item' ? sh.item : (RESUME.kind === 'item' || RESUME.kind === 'look') ? RESUME.id : '';
    BUNDLE_EQUIP.sheet = sh.kind === 'item' || RESUME.sheet;
  } else copyResume(PEND, RESUME);
  buyProduct(pid, b.x, b.y);
  if (sh.busy) { if (sh.kind === 'nogems') nogemsPrice(); else altBundlePrice(); K.sMain.enabled = false; K.sAlt.enabled = false; }
  else { PEND.kind = ''; BUNDLE_EQUIP.id = ''; }
}
function sheetMain(b) {
  if (offTap(b)) return;
  if (sh.done) { closeSheet(); return; }
  if (sh.kind === 'iap') { buyProduct(sh.pid, b.x, b.y); K.sMain.label = i18n.t('shop.waiting'); K.sMain.enabled = false; return; }
  if (sh.kind === 'nogems') {
    if (sh.pid) { buyOffer(sh.pid, b); return; }
    openTab(sh.mainTab || 'gems'); return;
  }
  if (sh.kind === 'booster') { sheetBooster(K.sGemMain, 5, b); return; }
  const it = itemById(sh.item);
  if (!it) return;
  if (wallet.owns(it.id)) {
    if (wallet.equip(it.slot, it.id)) { toast('shop.used', { name: itemName(it.id) }, 2, 'check'); particles.emit('sparkle', b.x, b.y - 40, BUY_SPARK); party.sfx.nice(8); }
    itemSheetState(it); relayoutSheet(); st.dirty = true; return;
  }
  if (it.via === 'vip') { closeSheet(true); openSheet('iap', 'mb_vip_rope'); return; }
  if (it.gems === null || it.gems === undefined) { closeSheet(true); openSheet('iap', 'mb_starter_pack'); return; }
  const g = K.sGemMain;
  armResume('item', it.id, 0, it.gems, true);
  if (wallet.gems() < it.gems) { const need = it.gems - wallet.gems(); closeSheet(true); openSheet('nogems', '', need); return; }
  RESUME.kind = '';
  if (!armGate(g)) return;
  const r = wallet.buyItem(it.id);
  if (r && r.ok) {
    spentFx(b.x, b.y, it.gems);
    wallet.equip(it.slot, it.id);
    toast('shop.bought', { name: itemName(it.id) }, 2.2, 'check');
    celebrate(195, sh.top + 140, false);
    itemSheetState(it); relayoutSheet();
  } else failRes(r, it.gems);
  st.dirty = true;
}
function sheetAlt(b) {
  if (sh.kind === 'booster') { if (offTap(b)) return; sheetBooster(K.sGemAlt, 1, b); return; }
  if (offTap(b)) return;
  if (sh.altPid) { buyOffer(sh.altPid, b); return; }
  if (sh.kind === 'nogems') openTab('gems');
}
// Try it (the round play button on the art): remember the sheet, the preview's end reopens it with its Buy right there
function sheetTry() {
  if (!sh.preview) return;
  TRY.kind = sh.kind; TRY.arg = sh.kind === 'iap' ? sh.pid : sh.item; TRY.buyKind = TRY.kind; TRY.buyArg = TRY.arg;
  const id = sh.preview; closeSheet(true); tryLook('club', id);
}
function sheetNo() {
  if (sh.kind === 'nogems' && sh.noTab) { openTab(sh.noTab); return; }
  closeSheet();
}
function sheetBooster(g, n, b) {
  const id = sh.booster, price = g.price;
  armResume('booster', id, n, price, false);
  if (wallet.gems() < price) { const need = price - wallet.gems(); closeSheet(true); openSheet('nogems', '', need); return; }
  RESUME.kind = '';
  if (g.confirm <= 0) (g === K.sGemMain ? K.sGemAlt : K.sGemMain).confirm = 0;
  if (!armGate(g)) return;
  const r = wallet.buyBooster(id, n);
  if (r && r.ok) {
    spentFx(b.x, b.y, price);
    toast('shop.b_got', { n: n, name: i18n.t('shop.b.' + id) }, 2, 'check');
    if (st.arm && id !== 'xray') wallet.arm(id, true);
    K.sL.state.set(i18n.t('shop.b_have', { n: wallet.boosters(id) }));
    // a popup closes on its own: its buttons go dead at once, so an impatient second tap never buys again
    if (st.popup) { st.autoClose = 1.1; K.sbtns.locked = true; K.sbtns.reset(); }
    else { K.sNo.label = i18n.t('shop.done'); boosterCap(); }
  } else failRes(r, price);
  st.dirty = true;
}
function closeSheet(keepPopup) {
  if (!sh.on || sh.out) return;
  sh.out = true; sh.t = 0;
  disarmAll(null);
  K.sbtns.locked = true;
  spring(sh, 'a', SP_SHEET0); spring(sh, 's', SP_SHEET0);
  if (sh.slot === 'club') setTheme(wallet.equipped('club'));
  if (st.popup && keepPopup !== true) {
    if (sh.kind === 'iap' && sh.pid === 'mb_starter_pack' && st.from === 'home') wallet.offerDismissed('starter');
    close();
  }
}

// the Gold Star Road track's two columns, measured: each column as wide as its longest step, TRK.gap apart, the block
// centred and kept TRK.pad clear of the sheet's inner rims (the font steps down from TUNE.minText only if a language
// needs it, never under 11.5)
const TRK = { w0: 0, w1: 0, gap: 18, total: 0, pad: 14, inner: 18 };
function trackFit() {
  const L = K.sL.track, n = L.length, rows = Math.ceil(n / 2), room = sh.w - 2 * (TRK.inner + TRK.pad);
  let size = TUNE.minText;
  for (let pass = 0; pass < 2; pass++) {
    TRK.w0 = 0; TRK.w1 = 0;
    for (let i = 0; i < n; i++) { const w = measure(L[i].str, size, 800) + 2; if (i < rows) TRK.w0 = Math.max(TRK.w0, w); else TRK.w1 = Math.max(TRK.w1, w); }
    TRK.total = TRK.w0 + TRK.gap + TRK.w1;
    if (TRK.total <= room || pass === 1) break;
    size = Math.max(11.5, Math.floor(size * room / TRK.total * 4) / 4);
  }
  for (let i = 0; i < n; i++) if (L[i].o.size !== size) { L[i].o.size = size; L[i].gen = -1; }
  TRK.total = Math.min(TRK.total, room);
}
// the art region of the sheet (top, y = its centre)
const PILL_STICK = { color: '#a8721e', textColor: CREAM, icon: 'star', size: 15 };
function drawSheetArt(ctx, y) {
  const x = 195;
  if (sh.kind === 'item') { const P = TUNE.preview; drawPreview(ctx, x - P.w / 2, y - P.h / 2, P.w, P.h); return; }
  draw.glow(ctx, x, y, 120, '#ffd27a', 0.16);
  if (sh.specs) {
    SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
    draw.sprite(ctx, draw.cached(sh.stageKey, 300, 124, stageBaker(sh.theme, 112)), x, y, SPR);
    if (!sh.actors) {
      sh.actors = [];
      for (let i = 0; i < sh.specs.length; i++) {
        const a = createActor(sh.specs[i]); DANCE.phase = (i * 0.21) % 1; a.setState('dance', DANCE); a.update(1 / 120);
        const b = a.bounds(), s = Math.min(92 / b.h, 56 / b.w, 0.62);
        sh.actors.push({ a: a, s: s, ox: -(b.x + b.w / 2) * s });
      }
    }
    const n = sh.actors.length, rtl = i18n.isRTL;
    for (let i = 0; i < n; i++) {
      const k = rtl ? n - 1 - i : i, cx = x - 140 + 280 * (k + 0.5) / n, fy = y + 50;
      draw.shadowBlob(ctx, cx, fy + 1, 18, 4, 0.45);
      sh.actors[i].a.draw(ctx, cx + sh.actors[i].ox, fy, sh.actors[i].s, AO);
    }
    // the value sticker on the stage's top-leading corner (Starter, a bundle, the Pro Pack; Try it keeps the trailing
    // one), tilted, with a soft bob
    if (sh.sticker) {
      ctx.save(); ctx.translate(x + (i18n.isRTL ? 1 : -1) * (150 - sh.stickW / 2 + 8), y - 62 + Math.sin(st.t * 2.4) * 1.5);
      ctx.rotate(i18n.isRTL ? 0.06 : -0.06); drawPill(ctx, 0, 0, sh.stickW, 34, sh.sticker, PILL_STICK); ctx.restore();
    }
    return;
  }
  if (sh.kind === 'booster') { boosterScene(ctx, sh.booster, x, y); return; }
  if (sh.art === 'trio' || sh.art === 'crate') {
    // a booster bundle: the trio / the Mega crate big, under a glow, with its count sticker on the trailing side
    const mega = sh.art === 'crate';
    draw.glow(ctx, x, y, 112, mega ? '#ff4fa3' : '#ffb347', mega ? 0.22 + 0.08 * Math.sin(st.t * 3) : 0.14);
    drawArt(ctx, sh.art, x, y + (mega ? 6 : 2), mega ? 150 : 168);
    stickerCount(ctx, x + (i18n.isRTL ? -1 : 1) * (mega ? 92 : 98), y + 40, sh.count, true);
    return;
  }
  if (sh.art === 'crystal') {
    // the three crystal pieces in reading order
    const C = CARDS.crystal, n = C.ids.length, rtl = i18n.isRTL;
    for (let i = 0; i < n; i++) { const k = rtl ? n - 1 - i : i; drawThumb(ctx, C.sheetKeys[i], C.ids[i], x + (k - (n - 1) / 2) * 98, y + (k === 1 ? -4 : 4), 92); }
    return;
  }
  if (sh.art === 'gem' || sh.art.indexOf('pile') === 0) { drawArt(ctx, sh.art, x, y, 128); return; }
  const bob = Math.sin(st.t * 2.2) * 3;
  drawArt(ctx, sh.art, x, y + bob, sh.art === 'vip' ? 150 : sh.track ? 108 : 124);
  if (K.sL.big.str) K.sL.big.draw(ctx, x, y + 58);
}
// a booster sheet's little scene (its art band, 150 tall): X-Ray = the glasses bobbing over their beam on a liar's taped
// hat; Slow-Mo = the snail inside an ice-cyan patience ring; Second Chance = the heart over three strike lamps, the first
// one cracking and relighting on a loop (the strike it forgives)
function boosterScene(ctx, id, x, y) {
  const t = st.t, bob = Math.sin(t * 2.2) * 3;
  if (id === 'xray') {
    draw.glow(ctx, x, y + 26, 70, '#ff7cc4', 0.16 + 0.06 * Math.sin(t * 5));
    drawArt(ctx, 'xhat', x, y + 14, 132);
    drawArt(ctx, 'glasses', x, y - 46 + bob, 82);
  } else if (id === 'slowmo') {
    draw.glow(ctx, x, y, 80, '#7fd4ff', 0.16);
    drawArt(ctx, 'icering', x, y, 138);
    drawArt(ctx, 'snail', x, y + 4 + bob * 0.4, 74);
  } else {
    // the loop: 1.8 s; the first lamp (reading order) is broken for 0.7 s, then the heart dips and it relights
    const ph = (t % 1.8) / 1.8, broken = ph < 0.4, rtl = i18n.isRTL, ly = y + 36;
    for (let i = 0; i < 3; i++) {
      const k = rtl ? 2 - i : i, lx = x + (k - 1) * 50, first = i === 0;
      if (first && !broken) draw.glow(ctx, lx, ly, 40, '#ffd166', 0.5 * (1 - (ph - 0.4) / 0.6));
      drawStrikeLamp(ctx, lx, ly, 34, !(first && broken), first && broken);
    }
    // the heart floats over the first lamp and dips onto it as it relights
    const hx = x + (rtl ? 1 : -1) * 50, dip = ph > 0.28 && ph < 0.46 ? Math.sin((ph - 0.28) / 0.18 * Math.PI) * 10 : 0;
    draw.glow(ctx, hx, y - 28, 50, '#ff5a6a', 0.18);
    drawArt(ctx, 'heart', hx, y - 30 + bob + dip, 64);
  }
}
// the rope sheet's close-up: exactly the two posts of the skin, centred, the rope swinging between them on plain
// cobblestones under the club wall (cosmetics-art's own stanchion + rope painters: never the door step, the third post or
// the queue's pennants that a crop of the live street would catch)
const ROPE_ST = { w: 26, h: 64, foot: 60, hook: 21 };
const POST_FN = {};
function postBaker(k) {
  let f = POST_FN[k];
  if (!f) { f = function (c, w, h) { COSM.paintStanchionSkin(c, k, ROPE_ST.w, ROPE_ST.foot, ROPE_ST.hook); }; POST_FN[k] = f; }
  return f;
}
function bakeCobbles(c, w, h) {
  const gy = Math.round(h * 0.46);
  c.fillStyle = draw.gradient(c, 0, 0, 0, gy, [[0, '#211e4c'], [1, '#2f2a68']]); c.fillRect(0, 0, w, gy);
  c.strokeStyle = 'rgba(10,8,30,0.4)'; c.lineWidth = 1;
  for (let y = 9, r = 0; y < gy - 3; y += 12, r++) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    for (let x = (r & 1) ? 14 : 0; x < w; x += 28) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(gy - 3, y + 12)); c.stroke(); }
  }
  c.fillStyle = '#3a3684'; c.fillRect(0, gy - 3, w, 7); c.fillStyle = 'rgba(255,240,210,0.16)'; c.fillRect(0, gy - 3, w, 1.5);
  c.fillStyle = draw.gradient(c, 0, gy, 0, h, [[0, '#1f1c48'], [1, '#141236']]); c.fillRect(0, gy + 4, w, h - gy);
  for (let row = 0, y = gy + 9; y < h + 10; row++) {
    const sw = 16 + row * 4, sh2 = 6 + row * 1.4;
    for (let x = (row & 1) ? -sw / 2 : 0; x < w + sw; x += sw + 3) {
      c.fillStyle = (row + Math.round(x / sw)) & 1 ? '#2c2963' : '#252257';
      draw.roundRect(c, x, y, sw, sh2, sh2 * 0.45); c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(8,6,24,0.55)'; c.stroke();
    }
    y += sh2 + 3;
  }
  c.fillStyle = draw.radial(c, w / 2, h * 0.66, 0, w * 0.55, [[0, 'rgba(255,179,71,0.2)'], [1, 'rgba(255,179,71,0)']]); c.fillRect(0, 0, w, h);
}
const POST_SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: [0.5, ROPE_ST.foot / ROPE_ST.h] };
function drawRopeStage(ctx, vx, vy, vw, vh, id) {
  const k = id.slice(5);
  SPR.anchor = AN_TL; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
  draw.sprite(ctx, draw.cached('shop.cobbles.' + vw + 'x' + vh, vw, vh, bakeCobbles), vx, vy, SPR);
  if (typeof COSM.paintStanchionSkin !== 'function' || typeof COSM.strokeRope !== 'function') return;
  const sc = vh / 102, f = vy + vh * 0.87, hk = (ROPE_ST.foot - ROPE_ST.hook) * sc, x0 = vx + vw * 0.17, x1 = vx + vw * 0.83, bt = beat();
  const post = draw.cached('shop.post.' + k, ROPE_ST.w, ROPE_ST.h, postBaker(k));
  POST_SPR.scale = sc;
  for (let i = 0; i < 2; i++) { const px = i ? x1 : x0; draw.shadowBlob(ctx, px, f + 2, 16 * sc, 4 * sc, 0.5); draw.sprite(ctx, post, px, f, POST_SPR); }
  COSM.strokeRope(ctx, k, x0 + 3 * sc, f - hk, x1 - 3 * sc, f - hk, 12 * sc, sc, bt >= 0 ? bt : st.t * 1.8);
}
// the live preview viewport: themes in a lobby view, doors on the street, ropes on their own close-up, plates as the
// real plates
const PLATE_PRESS = { v: 0 };
function drawPreview(ctx, vx, vy, vw, vh) {
  // the view: a door = a portrait close-up centred on the door (the viewport narrows instead of showing empty wall or
  // past the world's overscan), a party theme = the window + its facade, fitted to the stage width
  const P = TUNE.preview, street = !!pw && !pw.lobby;
  let fcx = 0, fcy = 0, k = 1;
  if (pw && sh.slot !== 'plate' && sh.slot !== 'rope') {
    if (street) {
      const d = pw.door, y0 = d.y - P.doorUp, y1 = d.y + d.h + P.doorDown;
      fcx = d.x + d.w / 2; fcy = (y0 + y1) / 2; k = vh / Math.max(40, y1 - y0);
      const hw = Math.max(20, Math.min(d.w / 2 + P.doorSide, stage.w + P.overscan - fcx, fcx + P.overscan));
      const nw = Math.min(vw, Math.round(2 * hw * k));
      vx += (vw - nw) / 2; vw = nw;
    } else {
      const wn = pw.window; fcx = 195; fcy = wn.y + wn.h * 0.5 - P.winUp; k = vh / (wn.h + P.winPad);
      if (vw / k > stage.w) k = vw / stage.w;
      fcx = clamp(fcx, vw / (2 * k), stage.w - vw / (2 * k));
    }
    fcy = clamp(fcy, vh / (2 * k), stage.h - vh / (2 * k));
  }
  ctx.save();
  draw.roundRect(ctx, vx, vy, vw, vh, 18); ctx.fillStyle = '#0c0b24'; ctx.fill();
  ctx.save(); draw.roundRect(ctx, vx, vy, vw, vh, 18); ctx.clip();
  if (sh.slot === 'plate') {
    const bt = beat(), ph = bt >= 0 ? bt % 2 : (st.t * 1.8) % 2, inP = ph < 1 ? 1 - ph : 0, outP = ph >= 1 ? 2 - ph : 0;
    ctx.fillStyle = draw.gradient(ctx, 0, vy, 0, vy + vh, [[0, '#2a2760'], [1, '#12113a']]); ctx.fillRect(vx, vy, vw, vh);
    drawPlate(ctx, 'out', vx + vw * 0.27, vy + vh * 0.55, 118, 96, outP * outP, 0, undefined, false, sh.item);
    drawPlate(ctx, 'in', vx + vw * 0.73, vy + vh * 0.55, 118, 96, inP * inP, 0, undefined, false, sh.item);
  } else if (sh.slot === 'rope') drawRopeStage(ctx, vx, vy, vw, vh, sh.item);
  else if (pw) {
    ctx.translate(vx + vw / 2, vy + vh / 2); ctx.scale(k, k); ctx.translate(-fcx, -fcy);
    if (street) { pw.drawBack(ctx); pw.drawMid(ctx); pw.drawFront(ctx); } else pw.drawLobby(ctx);
  } else {
    SPR.anchor = AN_C; SPR.scale = 2.4; SPR.alpha = 1; SPR.rot = 0;
    draw.sprite(ctx, draw.cached(sh.thumbKey, 92, 64, thumbBaker(sh.item)), vx + vw / 2, vy + vh / 2, SPR);
  }
  ctx.restore();
  draw.roundRect(ctx, vx, vy, vw, vh, 18); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  draw.roundRect(ctx, vx + 3, vy + 3, vw - 6, vh - 6, 15); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(217,164,65,0.7)'; ctx.stroke();
  ctx.restore();
}
const LINE_GLY = { color: '#ffd166' };
const PILL_CHIP_GO = { color: GO, textColor: CREAM, icon: 'check', size: 15 }, PILL_CHIP_IND = { color: '#3b3584', textColor: CREAM, icon: '', size: 15 };
function drawSheet(ctx) {
  const a = clamp(sh.a, 0, 1);
  if (a <= 0.01) return;
  const w = sh.w, h = sh.h, top = sh.top, cy = top + h / 2, L = K.sL;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(195, cy); ctx.scale(sh.s, sh.s); ctx.translate(-195, -cy);
  K.sheet.draw(ctx, 195, cy, w, h);
  if (st.popup && popCounter() && !sh.out) drawCounter(ctx, top + POPC.dy, 1);
  L.title.draw(ctx, 195, top + 34);
  L.sub.draw(ctx, 195, top + 62);
  drawSheetArt(ctx, top + sh.artY);
  let y = top + sh.textY;
  if (L.state.str) {
    // a state chip (In use / Owned) or the plain state line
    if (sh.chip) { const cw = Math.round(clamp(measure(L.state.str, 15, 800) + 56, 110, 300)); drawPill(ctx, 195, y, cw, 30, L.state.str, sh.chip === 'go' ? PILL_CHIP_GO : PILL_CHIP_IND); }
    else L.state.draw(ctx, 195, y);
    y += 26;
  }
  if (sh.nLines) {
    L.head.draw(ctx, 195, y); y += 24;
    const rtl = i18n.isRTL, x0 = rtl ? 195 + 128 : 195 - 128;
    for (let i = 0; i < sh.nLines; i++) {
      const art = K.lineArt[i];
      if (art === 'gem') drawGem(ctx, x0, y, 18); else if (art === 'star' || art === 'check' || art === 'flame') drawGlyph(ctx, art, x0, y, 17, LINE_GLY); else if (art) drawArt(ctx, art, x0, y, 24);
      L.lines[i].align(rtl ? 'right' : 'left').draw(ctx, x0 + (rtl ? -18 : 18), y + 1);
      y += 27;
    }
  }
  if (sh.track) {
    // the Gold Star Road's 10 fixed steps in two measured columns (reading order), the block centred with TRK.pad clear
    // of each rim (trackFit sized them), then what comes after
    L.trackHead.draw(ctx, 195, y); y += 22;
    const rtl = i18n.isRTL, n = L.track.length, rows = Math.ceil(n / 2), x0 = 195 - TRK.total / 2;
    for (let i = 0; i < n; i++) {
      const col = i < rows ? 0 : 1, r = i - col * rows, lx = col === 0 ? 0 : TRK.w0 + TRK.gap;
      // label x = its left edge (LTR) / right edge (RTL); the block mirrors in Arabic
      const x = rtl ? 195 + TRK.total / 2 - lx + 4 : x0 + lx - 4;
      L.track[i].align(rtl ? 'right' : 'left').draw(ctx, x, y + r * SB.trackRow);
    }
    y += rows * SB.trackRow;
    L.trackAfter.draw(ctx, 195, y + 4); y += 22;
  }
  if (L.note.str) L.note.draw(ctx, 195, y + 1 + sh.noteLines * SB.noteLH / 2);
  if (L.cap.str) L.cap.draw(ctx, 195, top + sh.capDy);
  K.sbtns.draw(ctx, st.t);
  // the bundle button's value tag on its top-trailing corner (an item sheet: the better deal says so)
  if (sh.altTag && !K.sAlt.hidden) {
    const B = K.sAlt;
    ctx.save(); ctx.translate(B.x + (i18n.isRTL ? -1 : 1) * (B.w / 2 - sh.altTagW / 2 + 6), B.y - B.h / 2 - 3); ctx.rotate(i18n.isRTL ? -0.04 : 0.04);
    drawPill(ctx, 0, 0, sh.altTagW, 24, sh.altTag, PILL_WORTH); ctx.restore();
  }
  // a pack's first purchase pays double: said on the button that sells it
  if (sh.firstOn) {
    const B = sh.firstOn === 'alt' ? K.sAlt : K.sMain;
    if (!B.hidden) { ctx.save(); ctx.translate(B.x + (i18n.isRTL ? -1 : 1) * (B.w / 2 - sh.firstW / 2 + 8), B.y - B.h / 2 - 4); ctx.rotate(i18n.isRTL ? -0.05 : 0.05); drawPill(ctx, 0, 0, sh.firstW, 24, sh.firstStr, PILL_FIRST); ctx.restore(); }
  }
  if (sh.busy && (sh.kind === 'iap' || sh.kind === 'nogems')) { ctx.save(); ctx.translate(K.sMain.x + K.sMain.w / 2 - 22, K.sMain.y); ctx.rotate(st.t * 6); drawGlyph(ctx, 'retry', 0, 0, 18, GLY_W); ctx.restore(); }
  ctx.restore();
}

// ================================================================ chrome: header, counter, tabs, footer
const TAB_GLY_ON = { color: INK }, TAB_GLY = { color: CREAM, alpha: 0.85 };
function drawCounter(ctx, y, alpha) {
  const C = TUNE.counter, x = 195, s = 1 + 0.08 * st.bump;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
  draw.sprite(ctx, draw.cached('shop.counter', C.w + 10, C.h + 12, bakeCounter), 0, 1, SPR);
  const rtl = i18n.isRTL, gx = rtl ? C.w / 2 - 24 : -C.w / 2 + 24, px = rtl ? -C.w / 2 + 22 : C.w / 2 - 22;
  drawGem(ctx, gx, 0, 26, 1, Math.sin(st.t * 1.7) * 0.06);
  K.count.draw(ctx, (gx + px) / 2 + (rtl ? 4 : -4), 1);
  draw.sprite(ctx, draw.cached('shop.plus', C.plus + 6, C.plus + 6, bakePlus), px, 0, SPR);
  ctx.restore();
}
function bakePlus(c, w, h) {
  const r = TUNE.counter.plus / 2, x = w / 2, y = h / 2;
  draw.sticker(c, cc => draw.circle(cc, x, y, r), { fill: AMBER, outline: INK, lineWidth: 2.4, highlight: 0.4, shadow: 0.22 });
  c.fillStyle = '#6a3f00'; c.fillRect(x - r * 0.46, y - r * 0.13, r * 0.92, r * 0.26); c.fillRect(x - r * 0.13, y - r * 0.46, r * 0.26, r * 0.92);
}
function bakeCounter(c, w, h) {
  const C = TUNE.counter, x = 5, y = 4, W = C.w, H = C.h;
  c.fillStyle = 'rgba(6,4,22,0.5)'; draw.roundRect(c, x + 1.5, y + 4, W, H, H / 2); c.fill();
  draw.sticker(c, rrect(x, y, W, H, H / 2), { fill: '#141236', outline: INK, lineWidth: 3, highlight: 0.15, shadow: 0.25 });
  draw.roundRect(c, x + 3.4, y + 3.4, W - 6.8, H - 6.8, H / 2 - 3.4); c.lineWidth = 2.2; c.strokeStyle = BRASS; c.stroke();
}
function drawTabs(ctx, y) {
  const T = TUNE.tabs, n = K.tabs.length, tw = K.tabs[0].w, x0 = TUNE.content.x;
  SPR.anchor = AN_C; SPR.scale = 1; SPR.alpha = 1; SPR.rot = 0;
  draw.sprite(ctx, draw.cached('shop.tabwell', TUNE.content.w + 8, T.h + 10, bakeTabWell), 195, y, SPR);
  // the amber indicator slides between tabs (st.ind = the index, a spring)
  const ix = i18n.isRTL ? x0 + tw * (n - 1 - st.ind + 0.5) : x0 + tw * (st.ind + 0.5);
  draw.sprite(ctx, draw.cached('shop.tabind', tw + 6, T.h + 4, bakeTabInd), ix, y, SPR);
  for (let i = 0; i < n; i++) {
    // the label turns dark only once the sliding amber indicator covers most of its tab (k = that coverage), so it is
    // never dark-on-dark while the indicator is still on its way
    const tb = K.tabs[i], k = clamp(1 - Math.abs(st.ind - i), 0, 1), lit = k >= 0.5;
    if (TAB_ART[tb.id] === 'bolt') drawGlyph(ctx, 'bolt', tb.x, y - 9, T.glyph * 0.9, lit ? TAB_GLY_ON : TAB_GLY);
    else drawArt(ctx, TAB_ART[tb.id], tb.x, y - 9, T.glyph * (1 + 0.12 * k));
    if (tb.lit !== lit) { tb.lit = lit; tb.lbl.o.outline = lit ? '' : INK; tb.lbl.tint(lit ? '#3a2208' : T.off); tb.lbl.gen = -1; }
    tb.lbl.draw(ctx, tb.x, y + 13, lit ? 1 : T.offA);
    if (tb.dot) drawBadge(ctx, tb.x + tw / 2 - 9, y - 18, 12, '', BADGE_GOLD);
  }
}
function bakeTabWell(c, w, h) {
  const x = 4, y = 4, W = w - 8, H = TUNE.tabs.h;
  draw.roundRect(c, x, y, W, H, 18); c.fillStyle = '#100e2c'; c.fill();
  c.save(); draw.roundRect(c, x, y, W, H, 18); c.clip();
  c.fillStyle = draw.gradient(c, 0, y, 0, y + 10, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(x, y, W, 10);
  c.restore();
  draw.roundRect(c, x, y, W, H, 18); c.lineWidth = 2; c.strokeStyle = 'rgba(217,164,65,0.45)'; c.stroke();
}
function bakeTabInd(c, w, h) {
  const x = 3, y = 3, W = w - 6, H = h - 6;
  draw.sticker(c, rrect(x + 1, y + 1, W - 2, H - 2, 15), { fill: AMBER, outline: INK, lineWidth: 2.5, highlight: 0.35, shadow: 0.2 });
}
function drawFooter(ctx, alpha) {
  const y = st.viewBot, rtl = i18n.isRTL;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(217,164,65,0.28)'; ctx.fillRect(28, y + 2, 334, 1.4);
  const ry = y + TUNE.foot.restoreY;
  K.terms.draw(ctx, LNK.tx, ry); K.privacy.draw(ctx, LNK.px, ry);
  ctx.fillStyle = 'rgba(201,195,240,0.7)'; ctx.beginPath(); ctx.arc(LNK.dot, ry, 1.8, 0, TAU); ctx.fill();
  K.legal.draw(ctx, 195, y + TUNE.foot.legalY);
  ctx.restore();
}
function linkAt(x, y) {
  const fy = st.viewBot + TUNE.foot.restoreY;
  if (Math.abs(y - fy) > 16) return '';
  if (Math.abs(x - LNK.tx) < LNK.tw) return TUNE.links.terms;
  if (Math.abs(x - LNK.px) < LNK.pw) return TUNE.links.privacy;
  return '';
}
const LNK = { tx: 280, px: 340, dot: 310, tw: 30, pw: 30 };

// ================================================================ list input + render
function cardAt(x, y) {
  const L = LIST[st.tab], cy = y - st.viewTop + SCROLL[st.tab], lx = x - TUNE.content.x;
  for (let i = 0; i < L.length; i++) { const c = L[i]; if (lx >= c.x && lx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h) return c; }
  return null;
}
function btnAt(c, x, y) {
  const X = TUNE.content.x + c.x, Y = st.viewTop + c.y - SCROLL[st.tab];
  for (let i = c.btns.length - 1; i >= 0; i--) {
    const b = c.btns[i];
    if (b.hidden) continue;
    const bx = X + mx(c, b.lx), by = Y + b.ly;
    if (Math.abs(x - bx) <= b.w / 2 + 4 && Math.abs(y - by) <= b.h / 2 + 4) return b;
  }
  return null;
}
function pressBtn(b) { spring(b, 'press', SP_DOWN); party.sfx.plate(); input.vibrate(TUNE.vibrate); }
const BTN_OFFP = { n: 0 };
function offParams(n) { BTN_OFFP.n = n; return BTN_OFFP; }
function releaseBtn(b, commit, c) {
  spring(b, 'press', SP_UP);
  if (!commit) return;
  spring(b, 'bump', SP_BUMP);
  if (b.onTap && b.enabled) b.onTap(c, b);
  else if (!b.enabled && b.offKey) toast(b.offKey, offParams(b.offN), 2.4);
  else if (!b.enabled && b.kind === 'iap' && st.provider === 'none') toast('shop.in_app');
}
function listInput(evt, d) {
  if (evt === 'down') {
    if (sc.pid >= 0) return;
    if (d.y < st.viewTop || d.y > st.viewBot) return;
    sc.pid = d.id; sc.startY = d.y; sc.startX = d.x; sc.lastY = d.y; sc.moved = false; sc.v = 0; sc.horiz = false;
    sc.card = cardAt(d.x, d.y); sc.btn = sc.card ? btnAt(sc.card, d.x, d.y) : null;
    if (sc.btn) pressBtn(sc.btn);
    else if (sc.card && sc.card.tap) { sc.card.press = 1; }
    return;
  }
  if (d.id !== sc.pid) return;
  if (evt === 'move') {
    const dy = d.y - sc.lastY, oy = d.y - sc.startY, ox = d.x - sc.startX;
    if (!sc.moved && (Math.abs(oy) > TUNE.scroll.start || Math.abs(ox) > TUNE.scroll.start * 2)) {
      sc.moved = true; sc.horiz = Math.abs(ox) > Math.abs(oy) * 1.4;
      if (sc.btn) { releaseBtn(sc.btn, false, sc.card); sc.btn = null; }
      if (sc.card) sc.card.press = 0;
    }
    if (sc.moved && !sc.horiz) {
      let s = SCROLL[st.tab] - dy;
      if (s < 0 || s > st.maxScroll) s = SCROLL[st.tab] - dy * TUNE.scroll.rubber;
      SCROLL[st.tab] = s;
    }
    sc.lastY = d.y;
    return;
  }
  if (evt === 'up') {
    if (!sc.moved) {
      if (sc.btn) releaseBtn(sc.btn, true, sc.card);
      else if (sc.card && sc.card.tap) { sc.card.press = 0; party.sfx.plate(); sc.card.tap(sc.card, d.x, d.y); }
    } else if (sc.horiz) {
      const ox = d.x - sc.startX;
      if (Math.abs(ox) > 60) { const i = TAB_IDS.indexOf(st.tab), dir = (ox < 0 ? 1 : -1) * (i18n.isRTL ? -1 : 1), j = clamp(i + dir, 0, TAB_IDS.length - 1); if (j !== i) { setTab(TAB_IDS[j]); party.sfx.whoosh(dir); } }
    }
    sc.pid = -1; sc.btn = null; sc.card = null;
    return;
  }
  if (evt === 'dragend' && !sc.horiz) {
    if (Math.abs(d.vy) > TUNE.scroll.minFling) sc.v = -d.vy;
  }
}
function updateScroll(dt) {
  if (sc.pid >= 0 && sc.moved) return;
  let s = SCROLL[st.tab];
  const S = TUNE.scroll;
  if (sc.v) {
    s += sc.v * dt;
    sc.v *= Math.exp(-S.friction * dt);
    if (Math.abs(sc.v) < 6) sc.v = 0;
  }
  if (s < 0) { s += (0 - s) * Math.min(1, dt * S.back); if (sc.v < 0) sc.v *= 0.5; }
  else if (s > st.maxScroll) { s += (st.maxScroll - s) * Math.min(1, dt * S.back); if (sc.v > 0) sc.v *= 0.5; }
  SCROLL[st.tab] = s;
}
function drawList(ctx, alpha) {
  const L = LIST[st.tab], top = st.viewTop, bot = st.viewBot, sy = SCROLL[st.tab], X0 = TUNE.content.x;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, top, stage.w, bot - top); ctx.clip();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  for (let i = 0; i < L.length; i++) {
    const c = L[i], Y = top + c.y - sy;
    const vis = Y + c.h > top - 40 && Y < bot + 40;
    if (!vis) { if (c.vis) { c.vis = false; } continue; }
    c.vis = true;
    const X = X0 + c.x;
    if (c.flash > 0) { draw.glow(ctx, X + c.w / 2, Y + c.h / 2, c.w * 0.6, '#ffd27a', 0.35 * c.flash); }
    if (c.press) { ctx.save(); ctx.translate(X + c.w / 2, Y + c.h / 2); ctx.scale(0.985, 0.985); ctx.translate(-(X + c.w / 2), -(Y + c.h / 2)); c.draw(ctx, c, X, Y); ctx.restore(); }
    else c.draw(ctx, c, X, Y);
  }
  ctx.restore();
  // soft fades at the clip edges (gradients made once per layout)
  const F = TUNE.content.fadeH;
  if (FADE.top !== top || FADE.bot !== bot) { FADE.top = top; FADE.bot = bot; FADE.t = draw.gradient(ctx, 0, top, 0, top + F, FADE_STOPS_T); FADE.b = draw.gradient(ctx, 0, bot - F, 0, bot, FADE_STOPS_B); }
  const fx = TUNE.panel.side + 6, fw = stage.w - 2 * TUNE.panel.side - 12;
  if (sy > 1) { ctx.fillStyle = FADE.t; ctx.fillRect(fx, top, fw, F); }
  if (sy < st.maxScroll - 1) { ctx.fillStyle = FADE.b; ctx.fillRect(fx, bot - F, fw, F); }
  // a slim scroll thumb on the trailing edge
  if (st.maxScroll > 4) {
    const vh = bot - top, th = Math.max(30, vh * vh / st.contentH), ty = top + (vh - th) * clamp(sy / st.maxScroll, 0, 1), tx = i18n.isRTL ? 12 : stage.w - 12;
    ctx.fillStyle = 'rgba(233,228,255,0.18)'; draw.roundRect(ctx, tx - 2, ty, 4, th, 2); ctx.fill();
  }
}
const FADE = { t: null, b: null, top: -1, bot: -1 };
const FADE_STOPS_T = [[0, 'rgba(31,28,76,0.95)'], [1, 'rgba(31,28,76,0)']], FADE_STOPS_B = [[0, 'rgba(31,28,76,0)'], [1, 'rgba(31,28,76,0.95)']];

// ================================================================ open / close
function close() {
  if (st.closing >= 0) return;
  st.closing = 0;
  endTry();
  K.chrome.locked = true; K.sbtns.locked = true;
  spring(st, 'a', SP_OUT);
  if (!st.popup) { SP_SLIDE.to = 1; spring(st, 'slide', SP_SLIDE); }
  if (sh.on && !sh.out) { sh.out = true; spring(sh, 'a', SP_SHEET0); }
}
const SP_SLIDE = { to: 0, stiffness: 260, damping: 26 };

function onWallet() { st.dirty = true; }
function onStorePrices() { st.dirty = true; }

// ---- pre-bake (home's idle frames call prebakeStep once a frame while the shop is closed): the shop's first open, its
// first Outfits visit after a cache clear (stage.onResize clears draw's cache when the pixel ratio changes) and a
// language switch would otherwise bake every stage, panel, thumbnail, label and dancer of the visible cards in one frame.
// One card per call is drawn into a 1 x 1 canvas (the draw bakes everything it needs and creates its dancers, then the
// dancers are let go: actor.js keeps its own sprite caches warm). Redone after a cache clear, a language or font change.
const WARM = { i: -1, sig: '', ctx: null, list: [], size: 0 };
function warmSig() { return i18n.lang + '|' + fontGen() + '|' + draw.res(); }
export function prebakeStep() {
  if (st.active) return false;
  const sig = warmSig(), size = draw.cacheSize ? draw.cacheSize() : 0;
  if (sig !== WARM.sig || size < WARM.size) { WARM.sig = sig; WARM.i = -1; }
  WARM.size = size;
  if (WARM.i === -2) return false;
  try {
    if (WARM.i === -1) {
      // step 0: the UI kit, every card's words, the lists, and the order to warm them in (Deals, Outfits, Gems, then
      // the shop's own chrome)
      init(); st.provider = providerName(); refreshCards();
      const L = WARM.list; L.length = 0;
      const tabs = ['deals', 'looks', 'gems'];
      for (let t = 0; t < tabs.length; t++) { const T = LIST[tabs[t]]; for (let i = 0; i < T.length; i++) if (L.indexOf(T[i]) < 0) L.push(T[i]); }
      if (!WARM.ctx) { const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; WARM.ctx = cv.getContext('2d'); }
      WARM.i = 0;
      return true;
    }
    const ctx = WARM.ctx;
    if (WARM.i < WARM.list.length) {
      const c = WARM.list[WARM.i++];
      ctx.save(); c.draw(ctx, c, 0, 0); ctx.restore();
      dropActors(c);
      return true;
    }
    // the chrome: the big panel, the counter, the tab well + indicator, the footer
    ctx.save();
    K.main.draw(ctx, 195, 400, stage.w - 2 * TUNE.panel.side, Math.max(200, stage.h - stage.safeTop - stage.safeBottom - TUNE.panel.top - TUNE.panel.bottom));
    drawCounter(ctx, 60, 1); drawTabs(ctx, 120); K.legal.draw(ctx, 195, 0); K.terms.draw(ctx, 0, 0); K.privacy.draw(ctx, 0, 0);
    ctx.restore();
  } catch (e) { console.warn('[shop] prebake step failed', e); }
  WARM.i = -2;
  return false;
}

export const shop = {
  get state() { return st; },
  get sheet() { return sh; },
  get cards() { return CARDS; },
  get lists() { return LIST; },
  get scroll() { return SCROLL; },
  get fly() { return FLY; },
  get preview() { return pw; },
  get warm() { return WARM; },
  // dev / tests: the gem purchase a 'nogems' buy will finish (armed / in flight / waiting for the gems to land)
  get pendingBuy() { return { armed: RESUME, pending: PEND, after: AFTER }; },
  // dev / tests: switch tab, scroll, open a sheet, read a card's screen box
  tab(id) { if (TAB_IDS.indexOf(id) >= 0) setTab(id); },
  scrollTo(y) { SCROLL[st.tab] = clamp(y, 0, st.maxScroll); sc.v = 0; },
  open(kind, arg, need) { openSheet(kind, arg, need); },
  closeSheet() { closeSheet(); },
  box(id) { const c = CARDS[id]; return c ? { x: TUNE.content.x + c.x, y: st.viewTop + c.y - SCROLL[st.tab], w: c.w, h: c.h } : null; },
  btn(id, bid) {
    const c = CARDS[id];
    if (!c) return null;
    for (let i = 0; i < c.btns.length; i++) if (c.btns[i].id === bid) { const p = btnScreen(c, c.btns[i]); return { x: p.x, y: p.y }; }
    return null;
  },

  enter(p) {
    p = p || {};
    init();
    st.active = true; st.t = 0; st.closing = -1; st.tryT = -1; st.autoClose = 0; st.landN = 0; st.session++; st.buyPid = ''; st.confetti = false;
    st.popup = p.popup === true; st.from = p.from || (scenes.current ? scenes.current.name : ''); st.arm = p.arm === true;
    st.a = 0; st.slide = st.popup ? 0 : 1;
    st.provider = providerName(); st.payBusy = payBusy();
    loadPrices();
    RESUME.kind = ''; PEND.kind = ''; AFTER.kind = ''; AFTER.t = -1; TRY.kind = '';
    // the tab: the caller's, else the Free tab when home's Shop pill shows its brass dot (a gift ready / a new Star
    // Road reward), else the last tab this session (Deals at first)
    let tab = TAB_IDS.indexOf(p.tab) >= 0 ? p.tab : '';
    if (!tab && !p.sheet && st.from === 'home' && (wallet.giftReady() || (typeof wallet.roadNew === 'function' && wallet.roadNew()))) tab = 'free';
    if (!tab) tab = st.tab || 'deals';
    if (tab === 'free' && typeof wallet.markRoadSeen === 'function') wallet.markRoadSeen();
    st.disp = wallet.gems(); st.pending = 0; st.bump = 0; st.shownN = -1;
    K.toast.hide();
    K.chrome.reset(); K.chrome.locked = false;
    for (let i = 0; i < K.chrome.list.length; i++) K.chrome.list[i].pop = 1;
    sh.on = false; sh.busy = false; sh.a = 0;
    sc.pid = -1; sc.v = 0; sc.btn = null; sc.card = null;
    refreshCards();
    st.tab = tab; st.ind = TAB_IDS.indexOf(tab);
    layout();
    if (p.tab) SCROLL[tab] = 0;
    if (p.focus && CARDS[p.focus]) SCROLL[tab] = clamp(CARDS[p.focus].y - 8, 0, st.maxScroll);
    st.dirty = false;
    offWallet = wallet.onChange(onWallet);
    offPrices = onPrices(onStorePrices);
    offPurchase = onPurchase(onLatePurchase);
    spring(st, 'a', SP_IN);
    if (!st.popup) { SP_SLIDE.to = 0; spring(st, 'slide', SP_SLIDE); }
    if (p.sheet) {
      const s = String(p.sheet), i = s.indexOf(':');
      if (s === 'nogems') openSheet('nogems', '', Math.max(1, p.need | 0));
      else if (i > 0) openSheet(s.slice(0, i), s.slice(i + 1)); else openSheet('iap', s);
    }
    if (st.popup && !sh.on) st.popup = false;
  },
  exit() {
    st.active = false;
    endTry();
    if (offWallet) { offWallet(); offWallet = null; }
    if (offPrices) { offPrices(); offPrices = null; }
    if (offPurchase) { offPurchase(); offPurchase = null; }
    tweens.killTarget(st); tweens.killTarget(sh);
    K.chrome.kill(); K.sbtns.kill();
    for (const id in CARDS) { const c = CARDS[id]; dropActors(c); for (let i = 0; i < c.btns.length; i++) { tweens.killTarget(c.btns[i]); c.btns[i].press = 0; c.btns[i].confirm = 0; } }
    for (let i = 0; i < FLY.length; i++) FLY[i].on = false;
    sh.on = false; sh.actors = null;
    RESUME.kind = ''; PEND.kind = ''; AFTER.kind = ''; AFTER.t = -1; TRY.kind = '';
    pw = null;
    setTheme(wallet.equipped('club'));
  },
  pause() { K.chrome.reset(); },
  resume() { st.dirty = true; },
  // the browser / Android back: a sheet closes first, then the shop
  onBack() { if (st.tryT >= 0) { endTry(true); return true; } if (sh.on && !sh.out) { closeSheet(); return true; } close(); return true; },

  update(dt) {
    st.t += dt;
    // a store purchase opening / finishing (payments' own flag) re-reads every buy button
    const pb = payBusy();
    if (pb !== st.payBusy) { st.payBusy = pb; st.dirty = true; }
    // read BEFORE the dirty refresh: a wallet change and a language change in the same frame must still relayout
    const langChanged = st.layoutLang !== i18n.lang;
    if (st.dirty && st.closing < 0) {
      st.dirty = false; refreshCards(); layoutList();
      if (sh.on && !sh.out && sh.kind === 'item') {
        // re-read the item's state; the sheet re-measures only when its shape changed (a button or the caption came / went)
        const it = itemById(sh.item), shape = sheetShape();
        if (it) { itemSheetState(it); if (sheetShape() !== shape) relayoutSheet(); }
      }
      else if (sh.on && !sh.out && sh.kind === 'iap') { const p = productOf(sh.pid); if (p && !soldOut(p)) sheetPrice(); }
      else if (sh.on && !sh.out && sh.kind === 'nogems' && sh.pid) nogemsPrice();
    }
    if (st.layoutH !== stage.h || langChanged) { if (langChanged) refreshCards(); layout(); if (sh.on) sheetLayout(); }
    // the gem purchase a 'nogems' buy stood in for, once the bought gems have landed
    if (AFTER.kind) { if (AFTER.t > 0) AFTER.t -= dt; if (AFTER.t <= 0 && !anyFly()) doAfter(); }
    // the lobby behind keeps partying (home's world is paused under an overlay)
    const hw = homeWorld();
    if (hw) hw.update(dt);
    if (pw && sh.on && sh.kind === 'item') pw.update(dt);
    K.chrome.update(dt); K.sbtns.update(dt); K.toast.update(dt);
    updateScroll(dt);
    updateFly(dt);
    // the counter rolls toward the balance minus the gems still in flight
    const target = Math.max(0, wallet.gems() - st.pending);
    st.disp += (target - st.disp) * Math.min(1, dt * 9);
    if (Math.abs(target - st.disp) < 0.5) st.disp = target;
    const n = Math.round(st.disp);
    if (n !== st.shownN) { st.shownN = n; K.count.set(fmt(n)); }
    // visible cards: their dancers, armed gem buttons cooling down, flashes
    const L = LIST[st.tab];
    for (let i = 0; i < L.length; i++) {
      const c = L[i];
      if (c.flash > 0) c.flash = Math.max(0, c.flash - dt * 1.6);
      for (let k = 0; k < c.btns.length; k++) { const b = c.btns[k]; if (b.confirm > 0) b.confirm = Math.max(0, b.confirm - dt); }
      if (c.vis && c.actors) for (let k = 0; k < c.actors.length; k++) c.actors[k].a.update(dt);
    }
    if (sh.on) {
      sh.t += dt;
      if (sh.actors) for (let k = 0; k < sh.actors.length; k++) sh.actors[k].a.update(dt);
      if (K.sGemMain.confirm > 0) K.sGemMain.confirm = Math.max(0, K.sGemMain.confirm - dt);
      if (K.sGemAlt.confirm > 0) K.sGemAlt.confirm = Math.max(0, K.sGemAlt.confirm - dt);
      // an armed gem button: green with a gentle pulse until the second tap (or its 3 s) is up
      if (K.sMain.overlay === sheetGemOverlay) { const on = K.sGemMain.confirm > 0; K.sMain.color = on ? GO : AMBER; K.sMain.breathe = on ? 0.035 : 0; }
      else K.sMain.breathe = 0;
      if (K.sAlt.overlay === sheetGemOverlay) { const on = K.sGemAlt.confirm > 0; K.sAlt.color = on ? GO : INDIGO; K.sAlt.rim = on ? '' : BRASS; K.sAlt.breathe = on ? 0.035 : 0; }
      else K.sAlt.breathe = 0;
      // an off button reads as off (an 'Owned' / 'In use' state button keeps its full colour)
      K.sMain.alpha = K.sMain.enabled || K.sMain.color === GO ? 1 : 0.62;
      K.sAlt.alpha = K.sAlt.enabled ? 1 : 0.62;
      if (sh.kind === 'iap' && !sh.busy && !K.sMain.enabled && K.sMain.label === i18n.t('shop.waiting')) sheetPrice();
      // (the 'nogems' offer button re-reads its price through st.dirty: store prices, payments' busy flag, a purchase)
      if (sh.out && sh.a < 0.02) { sh.on = false; sh.actors = null; K.sbtns.locked = false; }
    }
    if (st.tryT >= 0) { st.tryT -= dt; if (st.tryT < 0) { st.tryT = 0; endTry(true); } }
    st.tryA += ((st.tryT >= 0 ? 0 : 1) - st.tryA) * Math.min(1, dt * 10);
    if (st.autoClose > 0) { st.autoClose -= dt; if (st.autoClose <= 0 && st.popup) close(); }
    if (st.closing >= 0) {
      st.closing += dt;
      if (st.closing > 0.26 && scenes.top === shop) scenes.pop();
    }
  },

  render(ctx) {
    const W = stage.w, H = stage.h, a = clamp(st.a, 0, 1), ta = st.tryA;
    // screen space (the scene manager wraps this render in save / restore): a scene below that zoomed its camera.base
    // (play's Shut Down dolly, under the Reopen panel's 'Get gems') never zooms the shop, so what the player sees is
    // where the taps land; the camera's punch + shake still apply around the stage centre
    const ks = stage.scale * stage.dpr, cx = W / 2, cy = H / 2, pz = camera.punchZoom || 1;
    ctx.setTransform(ks, 0, 0, ks, 0, 0);
    ctx.translate(cx + (camera.shakeX || 0) + (camera.kickX || 0), cy + (camera.shakeY || 0) + (camera.kickY || 0));
    if (pz !== 1) ctx.scale(pz, pz);
    ctx.translate(-cx, -cy);
    ctx.save();
    ctx.globalAlpha = a * (st.popup ? TUNE.popupDim : TUNE.dim) * ta;
    ctx.fillStyle = '#06051a'; ctx.fillRect(-30, -30, W + 60, H + 60);
    ctx.restore();
    if (a <= 0.01) return;
    if (st.tryT >= 0 || ta < 0.99) {
      // Try it: only its tag while the lobby shows the look
      if (ta < 0.99) drawTryTag(ctx, (1 - ta) * a);
      if (ta < 0.02) { drawFly(ctx); return; }
    }
    if (!st.popup) {
      const off = st.slide * (H - st.top + 20);
      ctx.save();
      ctx.globalAlpha = ta;
      ctx.translate(0, off);
      K.main.draw(ctx, 195, (st.top + st.bot) / 2, W - 2 * TUNE.panel.side, st.bot - st.top);
      K.title.draw(ctx, 195, st.top + TUNE.head.title);
      K.chrome.draw(ctx, st.t);
      drawCounter(ctx, st.counterY, 1);
      drawTabs(ctx, st.top + TUNE.head.tabs);
      drawList(ctx, 1);
      drawFooter(ctx, 1);
      ctx.restore();
    } else if (flyN > 0 && (!sh.on || sh.out || !popCounter())) {
      // a popup's counter outside its sheet: only while gems are still flying into it
      drawCounter(ctx, st.popCY, 1);
    }
    if (sh.on) {
      if (!st.popup) { ctx.save(); ctx.globalAlpha = clamp(sh.a, 0, 1) * 0.55; ctx.fillStyle = '#06051a'; ctx.fillRect(-30, -30, W + 60, H + 60); ctx.restore(); }
      drawSheet(ctx);
    }
    drawFly(ctx);
    // the toast lands under the counter that just changed (a popup: above its sheet)
    if (K.toast.str) K.toast.draw(ctx, 195, st.popup ? Math.max(stage.safeTop + 26, sh.top - 80) : st.counterY + TUNE.toastDy);
  },

  onInput(evt, d) {
    if (st.closing >= 0) return true;
    if (st.tryT >= 0) {
      if (evt === 'down') {
        // the tag opens the product's sheet; anywhere else ends the preview (back to the sheet it came from, if any)
        if (tryTagHit(d.x, d.y) && TRY.buyKind && TRY.buyArg) { TRY.kind = TRY.buyKind; TRY.arg = TRY.buyArg; party.sfx.plate(); }
        endTry(true);
      }
      return true;
    }
    if (sh.on) {
      if (sh.out) return true;
      if (K.sbtns.onInput(evt, d)) return true;
      if (evt === 'down') {
        const inside = Math.abs(d.x - 195) <= sh.w / 2 && d.y >= sh.top && d.y <= sh.top + sh.h;
        if (!inside) { party.sfx.plate(); closeSheet(); }
      }
      return true;
    }
    if (st.popup) return true;
    if (K.chrome.onInput(evt, d)) return true;
    if (evt === 'down') {
      // the counter's '+' (and the counter itself): the Gems tab
      if (Math.abs(d.y - st.counterY) < 22 && Math.abs(d.x - 195) < TUNE.counter.w / 2) { party.sfx.plate(); setTab('gems'); return true; }
      const ty = st.top + TUNE.head.tabs;
      if (Math.abs(d.y - ty) < TUNE.tabs.h / 2 + 2) {
        for (let i = 0; i < K.tabs.length; i++) if (Math.abs(d.x - K.tabs[i].x) <= K.tabs[i].w / 2) { if (K.tabs[i].id !== st.tab) { party.sfx.plate(); input.vibrate(TUNE.vibrate); setTab(K.tabs[i].id); } return true; }
        return true;
      }
      if (d.y > st.viewBot) { const u = linkAt(d.x, d.y); if (u) { party.sfx.plate(); openUrl(u); } return true; }
    }
    listInput(evt, d);
    return true;
  },
};

scenes.register('shop', shop);
