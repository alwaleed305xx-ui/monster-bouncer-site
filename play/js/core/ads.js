// ads.js: opt-in rewarded video for Monster Bouncer / بودي قارد الوحوش (docs/MONETIZATION.md §6.3: the v1.1 plan).
// v1 SHIPS WITHOUT ADS: no provider is attached, available() is false, can() is 0 for every placement, so every "watch a
// video" button stays hidden and the v1 binary, its App Privacy ("Data Not Collected") and its age rating are unchanged.
// v1.1 turns it on in the native app only: js/native.js attaches its AdMob provider when the build asks for it
// (window.MB_BUILD = { ads: true, admobRewardedIos: '<unit id>' }, set by CI). The web build never shows a real ad.
// When the SDK ships, the same release must also change the store side: App Privacy (Device ID + Advertising Data +
// Diagnostics, not linked, not tracking, instead of 'Data Not Collected'), store/age_rating.json advertising: true, and
// GADApplicationIdentifier + SKAdNetworkItems in Info.plist (tools/ios_configure.py drops them for v1).
//
// Placements (TUNE.placements; all opt-in: no interstitials, no banners, no auto-play, nothing forced): at most
// TUNE.perDay (6) rewarded videos a local day across the four, each one a tap on a button that says what it pays.
//   'double'  result: x2 the night's gems (ctx.gems = what the night paid), at most gemsPerDay (50) extra gems a local
//             day, once per result (ctx.key: an id of that outcome)                  -> amount = the gems to add
//   'reopen'  the Shut Down panel: one Reopen on the house a day (instead of the Boss, Reopen! gem price) -> amount = 1
//   'gift'    the Free tab: x2 today's Free Gift once it is claimed (ctx.gems = the gift's gems, at most maxGems), once
//             a day                                                                   -> amount = the gems to add
//   'piggy'   the piggy card: +50 gems into the piggy once a day (ctx.room = what the pot still holds: a full pot has
//             no button, a nearly full one is offered only its room)                  -> amount = the gems to drop in
// VIP sees NONE of them: ads.hideWhen(() => wallet.vip()) (js/native.js wires it on every platform from the engine
// handle, with ads.refresh() on every wallet change) makes available() false, can() 0 and watch() 'hidden' while the
// predicate holds; a predicate that throws also hides them (a VIP never sees an ad by mistake).
// Contract for the scene owners (result.js, the reopen panel, the shop.js Free tab + piggy card), v1-safe as written:
//   const n = ads.can('double', { gems: reward.base, key: outcomeKey });     // 0 = no button. On enter / on change only.
//   button label: i18n.t('ad_double', { n })  (ad_reopen, ad_gift { n }, ad_piggy { n }; ad_left { n } = ads.left().shows)
//   the shared "this plays a video" mark on the button's leading corner: ads.drawMark(ctx, x, y, 26)
//   tap -> ads.watch('double', { gems, key, grant: n => wallet.addGems(n, 'ad'), art: drawGem })
//            .then(r => { if (r.ok) countUp(r.amount); });
//   piggy -> ads.can('piggy', { room: P.cap - P.gems }); grant: n => the wallet's piggy top-up (economy.js owns it)
//   ctx.grant(amount, placement) runs ONCE, synchronously, the moment the reward is earned (the video's reward event,
//   the mock's countdown end): before the video is closed, so a kill during the end card never loses it. The promise
//   resolves once the overlay is gone: { ok, placement, amount, error } with error '' | 'off' (no provider) | 'hidden'
//   (VIP) | 'capped' | 'busy' | 'closed' (left before the reward) | 'nofill' | 'timeout' | 'show'. ctx.art(ctx2d, x, y, size) (optional)
//   draws the reward glyph on the mock card; ctx.label overrides its reward line. ads.onChange(fn) fires after every
//   counted video, so buttons re-check can().
// The overlay: scene 'ad' (engine.js registers it), pushed over whatever is on top while a video runs. It takes every
// input (nothing underneath can be tapped), swallows onInterrupt (play under it never opens its pause) and onBack (a back
// = the X), holds the audio (audio.hold(on, 'ad')) and, while a native video covers the web view, parks the loop
// (loop.suspend(on, 'ad'): no game frames rendered behind a 30 s video). Cards, GAME-SPEC §5 sticker style (the
// brass-rimmed indigo panel, the amber 3D button, ink outlines):
//   loading  'Loading video…' + a brass spinner; the X cancels; after TUNE.loadMs it turns into the fail card
//   mock     the dev stand-in: a 5 s sample clip (a brass star bouncing on a little stage), the reward line, a button that
//            fills as the seconds run ('Reward in 4'), then pops into the amber Collect. The X while counting first warns
//            that the reward is lost (a velvet pill over the clip); a second tap within warnSec closes without it
//   covered  the native video is on top: only the dim. A tap that reaches the web view means the video is gone (its
//            dismiss event was lost): after coverTapSec the overlay closes with whatever was earned
//   fail     'No video right now' / 'Try again in a bit' (no fill, timeout, a failed show); closes after failSec or on a tap
// Providers: { name, ready() -> bool, show(hooks) -> Promise<{ ok, error }>, warm?(), release?() }. hooks.covered(): the
// video is on top; hooks.rewarded(): the reward is earned; hooks.live(): false once the overlay gave up (a late load must
// not show). release() is called when the overlay closed before the provider answered (a cancelled load, a lost
// dismiss): the provider drops its listeners for that video.
// 'mock' is built in and runs only on a dev host (localhost, 127.0.0.1, [::1], *.localhost, *.test; never inside the
// native app, whose origin is capacitor://localhost) when asked: ?ads=mock in the URL, or ads.useProvider('mock').
// Ledger: save key 'mbouncer.ads' (core/save.js; not the profile, so Reset progress keeps today's counts): { v, day, n,
// by: { double, reopen, gift, piggy }, gems (double gems today), keys (results already doubled), life: { n, gems } }
// (a ledger saved before 'piggy' existed reads its count as 0). A new local
// day starts the counts again; a day stored in the future (the clock went back) keeps them, so nothing pays twice.
// Dates: local 'YYYY-MM-DD' (profile.today()'s format); ads.useClock(profile.today) follows the game's dev clock. Every
// public call re-reads the stored ledger, so another tab's videos count too.
// Chrome: the overlay draws its own copy of the game's panel / button / round icon button; ads.skin({ button,
// iconButton }) hands it the game's own drawButton / drawIconButton (js/game/icons.js) for pixel-identical chrome.
// The mark: ads.drawMark(ctx, x, y, size) is the one "plays a video" sticker for every Watch button (a little retro TV:
// velvet cabinet, brass antenna, indigo screen, gold play triangle, ink outlines: GAME-SPEC §5), so the four placements
// read the same and the reward is never mistaken for a free tap.
// Dev: ads.useKey('ads.<scratch>') / ads.wipe() (scratch keys only), ads.info(), ads.selfTest() (pure: no storage).
import { stage } from './stage.js';
import { scenes } from './scene.js';
import { audio } from './audio.js';
import { loop } from './loop.js';
import { input } from './input.js';
import { i18n } from './i18n.js';
import { save } from './save.js';
import { draw, color } from './draw.js';
import { text } from './text.js';
import { clamp, TAU } from './math.js';
import { spring, tweens } from './tween.js';

const TUNE = {
  key: 'ads', version: 1,
  perDay: 6,                                   // rewarded videos a local day, the three placements together
  placements: {
    double: { perDay: 6, gemsPerDay: 50 },     // also bounded by perDay; one per result key
    reopen: { perDay: 1 },
    gift: { perDay: 1, maxGems: 15 },          // x2 the claimed gift (catalog GIFT: 5 a day, 15 on day 7)
    piggy: { perDay: 1, gems: 50 },            // +50 into the piggy (never past its cap: ctx.room)
  },
  // the Watch mark (x its size): antenna room on top, cabinet height, corner radius, ink width, screen inset, play half height
  mark: { ear: 0.26, body: 0.7, r: 0.2, line: 0.09, inset: 0.14, tri: 0.17 },
  keysKept: 16,                                // newest doubled result keys remembered
  loadMs: 12000,                               // the video must be on screen within this, else the fail card
  failSec: 1.8,                                // the fail card closes by itself after this
  warnSec: 2.6,                                // mock: a second X within this closes without the reward
  coverTapSec: 1,                              // covered: a tap only counts this long after the video went on top
  closeSec: 0.18,                              // overlay fade-out
  closeGraceMs: 700,                           // ...finished by a timer when no frame runs it (hidden tab, parked loop)
  mock: { sec: 5, bounce: 0.62, jump: 54 },    // the sample clip: length, star bounce period (s) and height
  ui: {
    ink: '#1d1840', face: '#2a2760', indigo: '#3b3584', cream: '#fff4d6', lilac: 'rgba(236,230,255,0.82)',
    amber: '#ffb347', gold: '#ffc93c', brass: '#d9a441', velvet: '#b3203a', warn: '#ffb0b0', go: '#2f9e5e',
    dim: 0.72, dimCovered: 0.94, dimColor: '#06051a',
    big: { w: 312, h: 372 }, small: { w: 268, h: 172 }, radius: 28,
    screen: { w: 256, h: 148, top: 60, r: 16, floor: 26 },
    head: 34, reward: 246, button: { y: 312, w: 244, h: 58 }, x: { size: 40, inset: 32 }, tag: { w: 58, h: 26 },
    loadSpin: 74, line1: 124, line2: 150,
  },
};

const PLACES = ['double', 'reopen', 'gift', 'piggy'];
const NO = {};
const SP_IN = { to: 1, stiffness: 340, damping: 20 };
const SP_OUT = { to: 0, stiffness: 520, damping: 30 };
const SP_POP = { to: 1, stiffness: 420, damping: 13 };
const AN_C = [0.5, 0.5], AN_B = [0.5, 1];
const SPR ={ anchor: AN_C, alpha: 1, scale: 1, sx: 1, sy: 1, rot: 0 };

const DICT = {
  en: {
    ad_tag: 'AD', ad_sample: 'Sample video', ad_loading: 'Loading video…', ad_nofill: 'No video right now', ad_later: 'Try again in a bit',
    ad_in: 'Reward in {n}', ad_unlocked: 'Reward unlocked!', ad_lose: 'Close now and the reward is lost', ad_collect: 'Collect',
    ad_gems: '+{n} gems', ad_reopen_free: 'A free Reopen', ad_piggy_gems: '+{n} gems in the piggy',
    ad_double: 'Watch: +{n} gems', ad_reopen: 'Watch: reopen free', ad_gift: 'Watch: gift x2 (+{n})',
    ad_piggy: 'Watch: +{n} to the piggy',
    ad_left: '{n} videos left today', ad_none_left: 'No videos left today',
  },
  // Arabic: a signed number mid-line sits in an LTR isolate (U+2066 ... U+2069, as strings.js does), so '+12' never
  // turns into '12+'
  ar: {
    ad_tag: 'إعلان', ad_sample: 'فيديو تجريبي', ad_loading: 'جاري تحميل الفيديو…', ad_nofill: 'ما فيه فيديو الحين', ad_later: 'جرّب بعد شوي',
    ad_in: 'المكافأة بعد {n}', ad_unlocked: 'انفتحت المكافأة!', ad_lose: 'إذا سكّرت الحين تروح المكافأة', ad_collect: 'استلم',
    ad_gems: '⁦+{n}⁩ جوهرة', ad_reopen_free: 'فتحة مجانية', ad_piggy_gems: '⁦+{n}⁩ جوهرة في الحصّالة',
    ad_double: 'شاهد فيديو: ⁦+{n}⁩ جوهرة', ad_reopen: 'شاهد فيديو وافتح مجاناً', ad_gift: 'شاهد فيديو: الهدية مضاعفة (⁦+{n}⁩)',
    ad_piggy: 'شاهد فيديو: ⁦+{n}⁩ للحصّالة',
    ad_left: 'باقي {n} فيديو اليوم', ad_none_left: 'خلصت فيديوهات اليوم',
  },
};
i18n.load(DICT);

// ================================================================ ledger (pure helpers: selfTest runs them on plain objects)
function intIn(v, lo, hi, def) {
  v = typeof v === 'number' ? v : parseInt(v, 10);
  if (!isFinite(v)) return def;
  v = Math.floor(v);
  return v < lo ? lo : (v > hi ? hi : v);
}
function validDay(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function pad(n) { return n < 10 ? '0' + n : String(n); }
function localDay() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function blank(day) { return { v: TUNE.version, day: day || '', n: 0, by: { double: 0, reopen: 0, gift: 0, piggy: 0 }, gems: 0, keys: [], life: { n: 0, gems: 0 } }; }
// any stored value -> a well-formed ledger (unknown fields dropped, counts clamped)
function clean(raw) {
  const D = blank('');
  if (!raw || typeof raw !== 'object') return D;
  D.day = validDay(raw.day) ? raw.day : '';
  D.n = intIn(raw.n, 0, 1e6, 0);
  const by = raw.by && typeof raw.by === 'object' ? raw.by : NO;
  for (let i = 0; i < PLACES.length; i++) D.by[PLACES[i]] = intIn(by[PLACES[i]], 0, 1e6, 0);
  D.gems = intIn(raw.gems, 0, 1e9, 0);
  if (raw.keys && typeof raw.keys.length === 'number') {
    for (let i = 0; i < raw.keys.length && D.keys.length < TUNE.keysKept; i++) if (typeof raw.keys[i] === 'string' && raw.keys[i]) D.keys.push(raw.keys[i]);
  }
  const L = raw.life && typeof raw.life === 'object' ? raw.life : NO;
  D.life.n = intIn(L.n, 0, 1e9, 0); D.life.gems = intIn(L.gems, 0, 1e12, 0);
  return D;
}
// a new local day starts the counts again; a stored day in the future (the clock went back) keeps them
function roll(D, day) {
  if (D.day && D.day >= day) return D;
  D.day = day; D.n = 0; D.gems = 0;
  for (let i = 0; i < PLACES.length; i++) D.by[PLACES[i]] = 0;
  return D;
}
// what a placement may pay right now (0 = do not offer it)
function allow(D, place, ctx) {
  const P = TUNE.placements[place];
  if (!P) return 0;
  ctx = ctx || NO;
  if (D.n >= TUNE.perDay || D.by[place] >= P.perDay) return 0;
  if (place === 'double') {
    const key = ctx.key !== undefined && ctx.key !== null ? String(ctx.key) : '';
    if (key && D.keys.indexOf(key) >= 0) return 0;
    const left = P.gemsPerDay - D.gems;
    const g = intIn(ctx.gems, 0, 1e6, 0);
    return left > 0 && g > 0 ? Math.min(g, left) : 0;
  }
  if (place === 'gift') return Math.min(intIn(ctx.gems, 0, 1e6, 0), P.maxGems);
  if (place === 'piggy') {
    const room = ctx.room !== undefined && ctx.room !== null ? intIn(ctx.room, 0, 1e9, 0) : P.gems;
    return Math.min(P.gems, room);
  }
  return 1;
}
function count(D, place, ctx, amount) {
  ctx = ctx || NO;
  D.n++; D.by[place]++; D.life.n++;
  if (place === 'double') {
    D.gems += amount;
    const key = ctx.key !== undefined && ctx.key !== null ? String(ctx.key) : '';
    if (key) { D.keys.push(key); while (D.keys.length > TUNE.keysKept) D.keys.shift(); }
  }
  if (place !== 'reopen') D.life.gems += amount;
  return D;
}
// the VIP gate: a predicate that holds (or throws) hides every placement
function gated(fn) {
  if (typeof fn !== 'function') return false;
  try { return !!fn(); } catch (e) { return true; }
}

// ================================================================ state
// hide: the VIP predicate (ads.hideWhen); hid: its last answer, so ads.refresh() notifies only on a change
const S = { key: TUNE.key, provider: null, clock: null, listeners: [], skin: null, watched: 0, failed: 0, last: '', hide: null, hid: false };
// the running video (one at a time); token tells a stale provider callback from the current one
const W = { busy: false, token: 0, place: '', amount: 0, ctx: NO, rewarded: false, error: '', resolve: null, timer: 0, closeTimer: 0, mockEnd: null };
// the overlay
const V = { active: false, mode: '', t: 0, modeT: 0, a: 0, s: 0.9, closing: -1, sec: 0, warnT: 0, press: '', pressId: -1, pop: 0,
  coverAt: 0, top: 0, h: 0, w: 0, reward: '', title: '', btn: '', line1: '', line2: '', tag: '' };

function today() {
  if (S.clock) { try { const d = S.clock(); if (validDay(d)) return d; } catch (e) { /* a broken clock: the device date */ } }
  return localDay();
}
function cur() { return roll(clean(save.get(S.key, null)), today()); }
function store(D) { save.set(S.key, D); }
function notify() {
  for (let i = 0; i < S.listeners.length; i++) { try { S.listeners[i](); } catch (e) { console.error('[ads] onChange listener failed', e); } }
}
function devHost() {
  try {
    const C = typeof window !== 'undefined' ? window.Capacitor : null;
    if (C && typeof C.isNativePlatform === 'function' && C.isNativePlatform()) return false;   // capacitor://localhost
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h) || /\.test$/.test(h);
  } catch (e) { return false; }
}
function hidden() { return gated(S.hide); }
function ready() {
  const P = S.provider;
  if (!P) return false;
  if (P === MOCK && !devHost()) return false;
  try { return typeof P.ready === 'function' ? !!P.ready() : true; } catch (e) { return false; }
}
function result(ok, place, amount, error) { return { ok: ok, placement: place, amount: amount, error: error }; }

// ================================================================ the built-in dev stand-in
const MOCK = {
  name: 'mock',
  ready() { return devHost(); },
  show() { return new Promise(res => { W.mockEnd = res; }); },
};
function mockEnd(r) { const f = W.mockEnd; W.mockEnd = null; if (f) f(r); }

// ================================================================ the job
function watch(place, ctx) {
  ctx = ctx || NO;
  if (W.busy) return Promise.resolve(result(false, place, 0, 'busy'));
  if (!ready()) return Promise.resolve(result(false, place, 0, 'off'));
  if (hidden()) return Promise.resolve(result(false, place, 0, 'hidden'));
  const amount = allow(cur(), place, ctx);
  if (!(amount > 0)) return Promise.resolve(result(false, place, 0, 'capped'));
  const P = S.provider, token = ++W.token;
  W.busy = true; W.place = place; W.amount = amount; W.ctx = ctx; W.rewarded = false; W.error = ''; W.mockEnd = null;
  return new Promise(resolve => {
    W.resolve = resolve;
    open(P === MOCK ? 'mock' : 'loading');
    const hooks = {
      live() { return W.busy && W.token === token && V.closing < 0 && V.mode !== 'fail'; },
      covered() { if (hooks.live()) setMode('covered'); },
      rewarded() { if (W.busy && W.token === token) earn(); },
    };
    clearTimeout(W.timer);
    W.timer = setTimeout(() => { if (W.busy && W.token === token && V.mode === 'loading' && V.closing < 0) fail('timeout'); }, TUNE.loadMs);
    let p = null;
    try { p = P.show(hooks); } catch (e) { console.error('[ads] provider show failed', e); p = null; }
    Promise.resolve(p).then(r => providerDone(token, r), e => { console.error('[ads] provider failed', e); providerDone(token, null); });
  });
}
function providerDone(token, r) {
  if (!W.busy || W.token !== token || V.closing >= 0 || V.mode === 'fail') return;
  clearTimeout(W.timer); W.timer = 0;
  if (r && r.ok === true) earn();                    // a provider that only reports at the end
  if (W.rewarded) { close(''); return; }
  const err = r && typeof r.error === 'string' && r.error ? r.error : 'show';
  if (err === 'closed') close('closed');
  else fail(err);
}
function earn() {
  if (W.rewarded || !W.busy) return;
  W.rewarded = true;
  const D = cur();
  count(D, W.place, W.ctx, W.amount);
  store(D);
  S.watched++;
  const g = W.ctx.grant;
  if (typeof g === 'function') { try { g(W.amount, W.place); } catch (e) { console.error('[ads] grant failed', e); } }
  spring(V, 'pop', SP_POP);
  notify();
}
function fail(err) {
  clearTimeout(W.timer); W.timer = 0;
  W.error = err || 'show'; S.failed++; S.last = W.error;
  setMode('fail');
}
function close(err) {
  if (V.closing >= 0) return;
  if (!W.rewarded && err) W.error = err;
  if (V.mode === 'covered') setMode('closing');
  V.closing = 0;
  spring(V, 'a', SP_OUT);
  clearTimeout(W.closeTimer);
  W.closeTimer = setTimeout(finish, TUNE.closeSec * 1000 + TUNE.closeGraceMs);
}
// the overlay is gone (or was popped by scenes.go): release the cover and answer the caller
function finish() {
  clearTimeout(W.closeTimer); W.closeTimer = 0;
  clearTimeout(W.timer); W.timer = 0;
  if (!W.busy) return;
  W.busy = false;
  const P = S.provider;
  if (P && typeof P.release === 'function') { try { P.release(); } catch (e) { /* nothing left to drop */ } }
  if (V.mode === 'covered') loop.suspend(false, 'ad');
  V.mode = '';
  scenes.remove(adScene);
  audio.hold(false, 'ad');
  const res = W.resolve, ok = W.rewarded;
  W.resolve = null; W.mockEnd = null;
  const r = result(ok, W.place, ok ? W.amount : 0, ok ? '' : (W.error || 'closed'));
  W.ctx = NO;
  if (res) res(r);
}

// ================================================================ the overlay scene ('ad')
function open(mode) {
  if (!scenes.has('ad')) scenes.register('ad', adScene);
  audio.hold(true, 'ad');
  V.mode = '';
  scenes.push('ad', NO);
  setMode(mode);
}
function setMode(m) {
  if (V.mode === m) return;
  if (V.mode === 'covered') loop.suspend(false, 'ad');
  V.mode = m; V.modeT = 0; V.press = ''; V.pressId = -1;
  if (m === 'covered') { V.coverAt = now(); loop.suspend(true, 'ad'); }
  refresh();
}
function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function rewardLine() {
  const c = W.ctx || NO;
  if (typeof c.label === 'string' && c.label) return c.label;
  if (W.place === 'reopen') return i18n.t('ad_reopen_free');
  if (W.place === 'piggy') return i18n.t('ad_piggy_gems', { n: W.amount });
  return i18n.t('ad_gems', { n: W.amount });
}
function refresh() {
  const U = TUNE.ui, big = V.mode === 'mock';
  WIDTHS.clear();                                    // fonts may have loaded since the last card
  V.w = big ? U.big.w : U.small.w; V.h = big ? U.big.h : U.small.h;
  V.top = Math.max(stage.safeTop + 8, Math.round((stage.h - V.h) / 2));
  V.title = i18n.t('ad_sample'); V.tag = i18n.t('ad_tag'); V.reward = rewardLine();
  V.btn = i18n.t('ad_collect');
  V.line1 = V.mode === 'fail' ? i18n.t('ad_nofill') : i18n.t('ad_loading');
  V.line2 = V.mode === 'fail' ? i18n.t('ad_later') : '';
}
function tapX() {
  if (V.mode === 'loading') { close('closed'); return; }
  if (V.mode !== 'mock') return;
  if (W.rewarded) { mockEnd({ ok: true }); return; }
  if (V.warnT > 0) { mockEnd({ ok: false, error: 'closed' }); return; }
  V.warnT = TUNE.warnSec;
  input.vibrate([12, 40, 12]);
}
function tapCollect() { if (V.mode === 'mock' && W.rewarded) mockEnd({ ok: true }); }
// the native video went away without telling us (the tap reached the web view)
function coverLost() { close(W.rewarded ? '' : 'closed'); }

// ---- hit areas (design units)
function xPos(out) {
  const U = TUNE.ui, L = 195 - V.w / 2, R = 195 + V.w / 2;
  out.x = i18n.isRTL ? R - U.x.inset : L + U.x.inset; out.y = V.top + (V.mode === 'mock' ? U.head : U.x.inset);
  return out;
}
const PX = { x: 0, y: 0 };
function hit(x, y) {
  if (V.mode !== 'mock' && V.mode !== 'loading') return '';
  xPos(PX);
  const r = TUNE.ui.x.size / 2 + 8;
  if ((x - PX.x) * (x - PX.x) + (y - PX.y) * (y - PX.y) <= r * r) return 'x';
  if (V.mode === 'mock' && W.rewarded) {
    const B = TUNE.ui.button, by = V.top + B.y;
    if (Math.abs(x - 195) <= B.w / 2 + 6 && Math.abs(y - by) <= B.h / 2 + 8) return 'collect';
  }
  return '';
}

const adScene = {
  name: 'ad',
  enter() {
    V.active = true; V.t = 0; V.a = 0; V.s = 0.9; V.closing = -1; V.sec = 0; V.warnT = 0; V.pop = 0; V.press = ''; V.pressId = -1;
    spring(V, 'a', SP_IN); spring(V, 's', SP_IN);
  },
  // popped from outside (scenes.go clears the overlays): the job ends with whatever was earned
  exit() { V.active = false; tweens.killTarget(V); if (W.busy) finish(); },
  // a back = the X; never leaves the overlay underneath a running native video
  onBack() { if (V.mode === 'fail') close(W.error); else if (V.mode !== 'covered') tapX(); return true; },
  // the app lost focus (or the phone turned) during a video: nothing underneath reacts (play would open its pause)
  onInterrupt() { },
  update(dt) {
    V.t += dt; V.modeT += dt;
    if (V.warnT > 0) V.warnT = Math.max(0, V.warnT - dt);
    if (V.mode === 'mock' && !W.rewarded && V.closing < 0) {
      V.sec = Math.min(TUNE.mock.sec, V.sec + dt);
      if (V.sec >= TUNE.mock.sec) earn();
    }
    if (V.mode === 'fail' && V.closing < 0 && V.modeT >= TUNE.failSec) close(W.error);
    if (V.closing >= 0) { V.closing += dt; if (V.closing >= TUNE.closeSec) finish(); }
  },
  render(ctx) { renderOverlay(ctx); },
  onInput(evt, d) {
    if (V.closing >= 0 || !W.busy) return true;
    const id = d && d.id !== undefined ? d.id : 0;
    if (V.mode === 'covered') {
      if (evt === 'up' && now() - V.coverAt >= TUNE.coverTapSec * 1000) coverLost();
      return true;
    }
    if (V.mode === 'fail') { if (evt === 'up') close(W.error); return true; }
    if (evt === 'down') { V.press = hit(d.x, d.y); V.pressId = id; return true; }
    if (evt === 'up' && id === V.pressId) {
      const was = V.press;
      V.press = ''; V.pressId = -1;
      if (!was || hit(d.x, d.y) !== was) return true;
      input.vibrate(8);
      if (was === 'x') tapX(); else if (was === 'collect') tapCollect();
    }
    return true;
  },
};

// ================================================================ drawing (GAME-SPEC §5 sticker chrome)
const PANEL = { shadow: 'rgba(6,4,22,0.5)', sx: 3, sy: 5, brass: 3, lw: 3.5,
  brassG: [[0, '#ffe39a'], [0.1, '#e8b955'], [0.55, '#d9a441'], [1, '#8a5a14']], inner: '#8a5a14', catch: 'rgba(255,246,214,0.75)',
  band: 'rgba(255,255,255,0.08)', bandH: 30, hair: 'rgba(255,209,102,0.18)' };
function resKey() { return Math.round(draw.res() * 100); }
function bakePanel(c, bw, bh) {
  const K = PANEL, x = 4, y = 4, w = bw - 8, h = bh - 10, r = TUNE.ui.radius, lw = K.lw;
  c.save(); c.fillStyle = K.shadow; draw.roundRect(c, x + K.sx, y + K.sy, w - K.sx + 1, h, r); c.fill(); c.restore();
  draw.roundRect(c, x, y, w, h, r);
  c.fillStyle = draw.gradient(c, 0, y, 0, y + h, K.brassG); c.fill();
  c.save(); draw.roundRect(c, x, y, w, h, r); c.clip();
  c.beginPath(); c.rect(x, y, w, Math.min(h * 0.5, 60)); c.clip();
  draw.roundRect(c, x + lw * 0.5 + 0.6, y + lw * 0.5 + 0.6, w - lw - 1.2, h - lw - 1.2, Math.max(2, r - lw * 0.5));
  c.lineWidth = 1; c.strokeStyle = K.catch; c.stroke();
  c.restore();
  draw.roundRect(c, x, y, w, h, r); c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = TUNE.ui.ink; c.stroke();
  const fi = lw * 0.5 + K.brass, fx = x + fi, fy = y + fi, fw = w - 2 * fi, fh = h - 2 * fi, fr = Math.max(4, r - fi);
  draw.sticker(c, cc => draw.roundRect(cc, fx, fy, fw, fh, fr), { fill: TUNE.ui.face, outline: K.inner, lineWidth: 1.6, highlight: 0.16, shadow: 0.2 });
  c.save(); draw.roundRect(c, fx, fy, fw, fh, fr); c.clip();
  c.fillStyle = draw.gradient(c, 0, fy, 0, fy + K.bandH, [[0, K.band], [1, 'rgba(255,255,255,0)']]); c.fillRect(fx, fy, fw, K.bandH);
  c.restore();
  draw.roundRect(c, fx + 5, fy + 5, fw - 10, fh - 10, Math.max(4, fr - 5)); c.lineWidth = 1.2; c.strokeStyle = K.hair; c.stroke();
}
function drawPanel(ctx, cx, cy, w, h) {
  const cv = draw.cached('ads.panel.' + w + 'x' + h + '.' + resKey(), w + 8, h + 10, bakePanel);
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
  draw.sprite(ctx, cv, cx, cy + 1, SPR);
}
// the 3D button: face (light-to-dark fill, gloss, inner rim, ink outline) over a darker slab
function btnFace(col, w, h, label, rim) {
  return function (c) {
    const x = 4, y = 4, r = Math.min(h * 0.42, w / 2);
    draw.roundRect(c, x, y, w, h, r);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + h, [[0, color.light(col, 0.28)], [0.55, col], [1, color.dark(col, 0.14)]]); c.fill();
    c.save(); draw.roundRect(c, x, y, w, h, r); c.clip();
    c.fillStyle = draw.gradient(c, 0, y, 0, y + h * 0.48, [[0, 'rgba(255,255,255,0.38)'], [1, 'rgba(255,255,255,0)']]);
    draw.roundRect(c, x + r * 0.35, y + 3, w - r * 0.7, h * 0.44, h * 0.2); c.fill();
    c.restore();
    if (rim) { draw.roundRect(c, x + 2.9, y + 2.9, w - 5.8, h - 5.8, Math.max(2, r - 2.9)); c.lineWidth = 2.6; c.strokeStyle = rim; c.stroke(); }
    else { draw.roundRect(c, x + 2.2, y + 2.2, w - 4.4, h - 4.4, Math.max(2, r - 2.2)); c.lineWidth = 1.3; c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke(); }
    draw.roundRect(c, x, y, w, h, r); c.lineWidth = 3; c.strokeStyle = TUNE.ui.ink; c.stroke();
    if (label) draw.text(c, label, x + w / 2, y + h / 2 + 1, { size: Math.round(h * 0.42), weight: 800, color: '#fffaf0', outline: color.dark(col, 0.58), outlineWidth: 4.5, maxWidth: w - 34 });
  };
}
function btnSlab(col, w, h) {
  return function (c) {
    const r = Math.min(h * 0.42, w / 2);
    draw.roundRect(c, 4, 4, w, h, r);
    c.fillStyle = draw.gradient(c, 0, 4, 0, h + 4, [[0, color.dark(col, 0.42)], [1, color.dark(col, 0.62)]]); c.fill();
    c.lineWidth = 3; c.strokeStyle = TUNE.ui.ink; c.stroke();
  };
}
const BTN_O = { color: '', rim: '', textColor: '', press: 0, glow: 0, alpha: 1, size: 0, icon: '' };
function drawBtn(ctx, x, y, w, h, label, col, rim, press, glow) {
  const sk = S.skin;
  if (sk && typeof sk.button === 'function') {
    BTN_O.color = col; BTN_O.rim = rim || ''; BTN_O.textColor = rim ? TUNE.ui.cream : ''; BTN_O.press = press; BTN_O.glow = glow;
    try { sk.button(ctx, x, y, w, h, label, BTN_O); return; } catch (e) { S.skin = null; }
  }
  const rk = resKey(), depth = Math.max(4, h * 0.12);
  const slab = draw.cached('ads.slab.' + col + w + 'x' + h + '.' + rk, w + 8, h + 8, btnSlab(col, w, h));
  const face = draw.cached('ads.btn.' + col + (rim || '') + w + 'x' + h + '.' + label + '.' + rk, w + 8, h + 8, btnFace(col, w, h, label, rim));
  if (glow > 0) draw.glow(ctx, x, y, Math.max(w, h) * 0.8, color.light(col, 0.2), glow * 0.6);
  draw.shadowBlob(ctx, x, y + h * 0.5 + depth, w * 0.52, Math.max(4, h * 0.14), 0.4);
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
  draw.sprite(ctx, slab, x, y + depth, SPR);
  const k = 1 - 0.04 * press;
  SPR.sx = k; SPR.sy = k;
  draw.sprite(ctx, face, x, y + depth * press * 0.85, SPR);
  SPR.sx = 1; SPR.sy = 1;
}
// the round X: indigo sticker, cream cross, ink outline
function bakeX(c, W) {
  const s = TUNE.ui.x.size, cx = W / 2, cy = W / 2, r = s / 2 - 1.5, col = TUNE.ui.indigo;
  draw.circle(c, cx, cy, r);
  c.fillStyle = draw.gradient(c, 0, cy - r, 0, cy + r, [[0, color.light(col, 0.24)], [0.55, col], [1, color.dark(col, 0.18)]]); c.fill();
  c.save(); draw.circle(c, cx, cy, r); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.2)'; draw.ellipse(c, cx, cy - r * 0.52, r * 0.74, r * 0.42); c.fill();
  c.restore();
  draw.circle(c, cx, cy, Math.max(1, r - 2.8)); c.lineWidth = 2.2; c.strokeStyle = TUNE.ui.brass; c.stroke();
  draw.circle(c, cx, cy, r); c.lineWidth = 3; c.strokeStyle = TUNE.ui.ink; c.stroke();
  const k = s * 0.17;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - k, cy - k); c.lineTo(cx + k, cy + k); c.moveTo(cx + k, cy - k); c.lineTo(cx - k, cy + k);
  c.lineWidth = 6.5; c.strokeStyle = TUNE.ui.ink; c.stroke();
  c.lineWidth = 3.4; c.strokeStyle = TUNE.ui.cream; c.stroke();
}
const ICON_O = { color: '', rim: '', press: 0, alpha: 1, glyphColor: '' };
function drawX(ctx, x, y, press, warn) {
  const s = TUNE.ui.x.size;
  if (warn > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(warn, 0, 1);
    draw.circle(ctx, x, y, s / 2 + 5); ctx.lineWidth = 3; ctx.strokeStyle = TUNE.ui.velvet; ctx.stroke();
    ctx.restore();
  }
  const sk = S.skin;
  if (sk && typeof sk.iconButton === 'function') {
    ICON_O.color = TUNE.ui.indigo; ICON_O.rim = TUNE.ui.brass; ICON_O.press = press; ICON_O.glyphColor = TUNE.ui.cream;
    try { sk.iconButton(ctx, x, y, s, 'close', ICON_O); return; } catch (e) { S.skin = null; }
  }
  const cv = draw.cached('ads.x.' + resKey(), s + 6, s + 6, bakeX);
  draw.shadowBlob(ctx, x, y + s * 0.5 + 2, s * 0.46, 4, 0.35);
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.rot = 0; SPR.scale = 1 - 0.07 * press; SPR.sx = 1; SPR.sy = 1;
  draw.sprite(ctx, cv, x, y + 2 * press, SPR);
  SPR.scale = 1;
}
function bakeTag(label) {
  return function (c, w, h) {
    draw.sticker(c, cc => draw.roundRect(cc, 2, 2, w - 4, h - 4, (h - 4) / 2), { fill: TUNE.ui.velvet, outline: TUNE.ui.ink, lineWidth: 2.6, highlight: 0.22, shadow: 0.16 });
    draw.text(c, label, w / 2, h / 2 + 0.5, { size: 13.5, weight: 800, color: TUNE.ui.cream, maxWidth: w - 14 });
  };
}
// the Watch mark: a little retro TV (velvet cabinet, brass rabbit-ear antenna, indigo screen, a gold play triangle), ink
// outlines, tilted a touch. Never a red box with a white triangle: that reads as a real video brand (MONETIZATION §6.4)
function bakeMark(c, w, h) {
  const K = TUNE.mark, U = TUNE.ui, s = w - 6, x = 3, lw = Math.max(1.8, s * K.line);
  const top = 3 + s * K.ear, bh = s * K.body, r = s * K.r, cx = x + s / 2;
  // the antenna first, so the cabinet covers its foot
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx, top + lw); c.lineTo(cx - s * 0.2, 3 + s * 0.06); c.moveTo(cx, top + lw); c.lineTo(cx + s * 0.22, 3 + s * 0.1);
  c.lineWidth = lw * 1.7; c.strokeStyle = U.ink; c.stroke();
  c.lineWidth = lw * 0.7; c.strokeStyle = U.brass; c.stroke();
  const tips = [cx - s * 0.2, 3 + s * 0.06, cx + s * 0.22, 3 + s * 0.1];
  for (let i = 0; i < 4; i += 2) { draw.circle(c, tips[i], tips[i + 1], s * 0.06); c.fillStyle = U.gold; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = U.ink; c.stroke(); }
  // the cabinet + its screen
  draw.sticker(c, cc => draw.roundRect(cc, x, top, s, bh, r), { fill: U.velvet, outline: U.ink, lineWidth: lw, highlight: 0.3, shadow: 0.2 });
  const ix = x + s * K.inset, iy = top + s * K.inset * 0.9, iw = s - 2 * s * K.inset, ih = bh - 2 * s * K.inset * 0.9;
  draw.roundRect(c, ix, iy, iw, ih, Math.max(2, r * 0.6));
  c.fillStyle = draw.gradient(c, 0, iy, 0, iy + ih, [[0, U.indigo], [1, U.face]]); c.fill();
  c.lineWidth = Math.max(1, lw * 0.55); c.strokeStyle = U.ink; c.stroke();
  // the play triangle, a hair right of centre (optical centre of a triangle)
  const px = ix + iw * 0.53, py = iy + ih / 2, k = Math.min(ih * 0.36, s * K.tri);
  c.beginPath(); c.moveTo(px - k * 0.8, py - k); c.lineTo(px + k * 0.95, py); c.lineTo(px - k * 0.8, py + k); c.closePath();
  c.lineJoin = 'round'; c.lineWidth = lw * 0.8; c.strokeStyle = U.ink; c.stroke();
  c.fillStyle = U.gold; c.fill();
}
function drawMark(ctx, x, y, size) {
  const s = Math.max(12, Math.round(size || 26));
  const cv = draw.cached('ads.mark.' + s + '.' + resKey(), s + 6, s + 6, bakeMark);
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = i18n.isRTL ? 0.12 : -0.12;
  draw.sprite(ctx, cv, x, y, SPR);
  SPR.rot = 0;
}
// the sample clip's backdrop: a little stage under a spotlight
function bakeScreen(c, w, h) {
  const U = TUNE.ui.screen, r = U.r, fy = h - U.floor;
  c.save();
  draw.roundRect(c, 2, 2, w - 4, h - 4, r); c.clip();
  c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, '#2a2760'], [0.7, '#141238'], [1, '#0c0b24']]); c.fillRect(0, 0, w, h);
  // spotlight cone + its pool on the floor
  c.beginPath(); c.moveTo(w / 2 - 18, 0); c.lineTo(w / 2 + 18, 0); c.lineTo(w / 2 + 74, fy); c.lineTo(w / 2 - 74, fy); c.closePath();
  c.fillStyle = draw.gradient(c, 0, 0, 0, fy, [[0, 'rgba(255,179,71,0.34)'], [1, 'rgba(255,179,71,0.05)']]); c.fill();
  c.fillStyle = '#2a2760'; c.fillRect(0, fy, w, h - fy);
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, fy, w, 2);
  c.save(); c.translate(w / 2, fy + 8); c.scale(84, 12);
  c.fillStyle = draw.radial(c, 0, 0, 0, 1, [[0, 'rgba(255,179,71,0.42)'], [1, 'rgba(255,179,71,0)']]); c.fillRect(-1, -1, 2, 2);
  c.restore();
  // marquee bulbs along the top edge
  for (let i = 0; i < 9; i++) { draw.circle(c, 20 + i * (w - 40) / 8, 10, 3); c.fillStyle = i % 2 ? '#ffd166' : '#d9a441'; c.fill(); }
  c.restore();
  draw.roundRect(c, 2, 2, w - 4, h - 4, r); c.lineWidth = 3; c.strokeStyle = TUNE.ui.ink; c.stroke();
  draw.roundRect(c, 5, 5, w - 10, h - 10, Math.max(4, r - 3)); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,209,102,0.22)'; c.stroke();
}
function bakeStar(c, w, h) {
  draw.sticker(c, cc => draw.star(cc, w / 2, h / 2 + 1, w * 0.42, w * 0.2, 5), { fill: '#ffc93c', outline: TUNE.ui.ink, lineWidth: 3, highlight: 0.36, shadow: 0.18,
    bounds: [w * 0.08, h * 0.08, w * 0.84, h * 0.84] });
  draw.circle(c, w * 0.43, h * 0.5, w * 0.045); c.fillStyle = TUNE.ui.ink; c.fill();
  draw.circle(c, w * 0.57, h * 0.5, w * 0.045); c.fill();
}
function drawClip(ctx, x, y, t) {
  const U = TUNE.ui.screen, M = TUNE.mock, w = U.w, h = U.h, fy = y + h - U.floor;
  const bg = draw.cached('ads.screen.' + resKey(), w, h, bakeScreen);
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
  draw.sprite(ctx, bg, x + w / 2, y + h / 2, SPR);
  // equaliser bars on both sides of the stage, on the beat of the bounce
  ctx.save();
  ctx.lineWidth = 2; ctx.strokeStyle = TUNE.ui.ink;
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? 0 : 1, j = i % 4;
    const bx = side ? x + w - 28 - j * 13 : x + 16 + j * 13;
    const bh = 8 + 26 * Math.abs(Math.sin(t * (3.1 + j * 0.9) + i * 1.7));
    draw.roundRect(ctx, bx, fy - bh, 9, bh, 3);
    ctx.fillStyle = side ? TUNE.ui.amber : TUNE.ui.gold; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // the star: bounce with squash on landing, a contact shadow that shrinks with height
  const ph = (t / M.bounce) % 1, up = Math.sin(ph * Math.PI), land = 1 - clamp(up / 0.18, 0, 1);
  const st = draw.cached('ads.star.' + resKey(), 50, 50, bakeStar);
  draw.shadowBlob(ctx, x + w / 2, fy + 2, 22 * (1 - up * 0.45), 5, 0.45 * (1 - up * 0.5));
  SPR.anchor = AN_B; SPR.sx = 1 + 0.18 * land; SPR.sy = 1 - 0.16 * land; SPR.rot = Math.sin(t * 2.4) * 0.16;
  draw.sprite(ctx, st, x + w / 2, fy + 3 - up * M.jump, SPR);
  SPR.anchor = AN_C; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
  // twinkles over the stage
  for (let i = 0; i < 3; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1);
    draw.glow(ctx, x + 50 + i * 78, y + 34 + (i % 2) * 16, 12, '#ffe39a', 0.5 * k);
  }
}
function drawSpinner(ctx, x, y, t) {
  ctx.save();
  ctx.lineCap = 'round';
  draw.circle(ctx, x, y, 22); ctx.lineWidth = 9; ctx.strokeStyle = TUNE.ui.ink; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();
  const a0 = t * 5.2, len = 1.6 + 0.9 * Math.sin(t * 2.6);
  ctx.beginPath(); ctx.arc(x, y, 22, a0, a0 + len); ctx.lineWidth = 9; ctx.strokeStyle = TUNE.ui.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 22, a0, a0 + len); ctx.lineWidth = 5; ctx.strokeStyle = TUNE.ui.brass; ctx.stroke();
  ctx.restore();
}
// the 'no video' glyph: a dark little screen with a slash
function drawNoVideo(ctx, x, y) {
  ctx.save();
  draw.roundRect(ctx, x - 26, y - 18, 52, 36, 9);
  ctx.fillStyle = '#141238'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = TUNE.ui.ink; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y - 8); ctx.lineTo(x + 9, y); ctx.lineTo(x - 6, y + 8); ctx.closePath();
  ctx.fillStyle = 'rgba(236,230,255,0.45)'; ctx.fill();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 22, y + 20); ctx.lineTo(x + 22, y - 20);
  ctx.lineWidth = 7; ctx.strokeStyle = TUNE.ui.ink; ctx.stroke();
  ctx.lineWidth = 3.6; ctx.strokeStyle = TUNE.ui.warn; ctx.stroke();
  ctx.restore();
}
const TXT = { size: 22, weight: 800, color: '', outline: '', outlineWidth: 6, maxWidth: 0, align: 'center', shadow: false };
function label(ctx, str, x, y, size, col, outlineW, maxW, align) {
  TXT.size = size; TXT.color = col; TXT.outline = outlineW > 0 ? TUNE.ui.ink : ''; TXT.outlineWidth = outlineW; TXT.maxWidth = maxW || 0;
  TXT.align = align || 'center'; TXT.shadow = outlineW > 0;
  return draw.text(ctx, str, x, y, TXT);
}
// widths of the few strings the cards centre by hand, measured once per string + size (no TextMetrics per frame)
const WIDTHS = new Map();
function textW(str, size) {
  const c = stage.ctx;
  if (!c || !str) return 0;
  const k = size + '|' + str;
  let w = WIDTHS.get(k);
  if (w === undefined) {
    if (WIDTHS.size > 48) WIDTHS.clear();
    c.save(); w = text.measure(c, str, size, 800, 'Baloo 2'); c.restore();
    WIDTHS.set(k, w);
  }
  return w;
}

function renderOverlay(ctx) {
  const U = TUNE.ui, W2 = stage.w, H = stage.h, a = clamp(V.a, 0, 1);
  ctx.save();
  ctx.globalAlpha = a * (V.mode === 'covered' ? U.dimCovered : U.dim);
  ctx.fillStyle = U.dimColor; ctx.fillRect(-30, -30, W2 + 60, H + 60);
  ctx.restore();
  if (a <= 0.01 || V.mode === 'covered' || V.mode === 'closing' || !V.mode) return;
  const cx = 195, cy = V.top + V.h / 2, T = V.top, rtl = i18n.isRTL;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.scale(V.s, V.s); ctx.translate(-cx, -cy);
  drawPanel(ctx, cx, cy, V.w, V.h);
  if (V.mode === 'mock') renderMock(ctx, cx, T, rtl);
  else {
    if (V.mode === 'loading') drawSpinner(ctx, cx, T + U.loadSpin, V.t);
    else drawNoVideo(ctx, cx, T + U.loadSpin);
    label(ctx, V.line1, cx, T + U.line1, 21, U.cream, 6, V.w - 40);
    if (V.line2) label(ctx, V.line2, cx, T + U.line2, 15, U.lilac, 0, V.w - 40);
    if (V.mode === 'loading') { xPos(PX); drawX(ctx, PX.x, PX.y, V.press === 'x' ? 1 : 0, 0); }
  }
  ctx.restore();
}
function renderMock(ctx, cx, T, rtl) {
  const U = TUNE.ui, M = TUNE.mock, SC = U.screen, L = cx - V.w / 2, R = cx + V.w / 2;
  // header: X on the leading corner, the title, the velvet AD tag on the trailing one
  xPos(PX);
  drawX(ctx, PX.x, PX.y, V.press === 'x' ? 1 : 0, V.warnT > 0 ? Math.min(1, V.warnT * 3) : 0);
  const tag = draw.cached('ads.tag.' + V.tag + '.' + resKey(), U.tag.w, U.tag.h, bakeTag(V.tag));
  SPR.anchor = AN_C; SPR.alpha = 1; SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0;
  draw.sprite(ctx, tag, rtl ? L + 38 : R - 38, T + U.head, SPR);
  label(ctx, V.title, cx, T + U.head + 1, 22, U.cream, 6, V.w - 150);
  // the clip
  const sx = cx - SC.w / 2, sy = T + SC.top;
  drawClip(ctx, sx, sy, V.t);
  if (V.warnT > 0) {
    const k = clamp(V.warnT * 3, 0, 1), wy = sy + SC.h - 20, ww = Math.min(SC.w - 16, textW(i18n.t('ad_lose'), 13.5) + 30);
    ctx.save();
    ctx.globalAlpha *= k;
    draw.roundRect(ctx, cx - ww / 2, wy - 13, ww, 26, 13);
    ctx.fillStyle = U.velvet; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = U.ink; ctx.stroke();
    label(ctx, i18n.t('ad_lose'), cx, wy + 0.5, 13.5, U.cream, 0, ww - 16);
    ctx.restore();
  }
  // the reward line: the caller's glyph + what the video pays
  const art = W.ctx && typeof W.ctx.art === 'function' ? W.ctx.art : null;
  // a long line ('+50 gems in the piggy') shrinks to the card, the glyph staying beside it
  const gw = art ? 34 : 0, tw = Math.min(textW(V.reward, 26), V.w - 40 - gw), ry = T + U.reward, total = tw + gw, x0 = cx - total / 2;
  const pop = W.rewarded ? 1 + 0.12 * Math.sin(clamp(V.pop, 0, 1) * Math.PI) : 1;
  ctx.save();
  ctx.translate(cx, ry); ctx.scale(pop, pop); ctx.translate(-cx, -ry);
  if (W.rewarded) draw.glow(ctx, cx, ry, 90, '#ffd166', 0.32);
  if (art) { try { art(ctx, rtl ? x0 + total - 14 : x0 + 14, ry, 28); } catch (e) { W.ctx.art = null; } }
  label(ctx, V.reward, rtl ? x0 + tw / 2 : x0 + gw + tw / 2, ry + 1, 26, U.gold, 6, tw + 1);
  ctx.restore();
  // the button: fills while the seconds run, then pops into the amber Collect
  const B = U.button, by = T + B.y;
  if (!W.rewarded) {
    const k = clamp(V.sec / M.sec, 0, 1), left = Math.max(1, Math.ceil(M.sec - V.sec - 1e-6));
    drawBtn(ctx, cx, by, B.w, B.h, '', U.face, U.brass, 0, 0);
    const r = Math.min(B.h * 0.42, B.w / 2), bx = cx - B.w / 2, top = by - B.h / 2;
    ctx.save();
    draw.roundRect(ctx, bx + 4, top + 4, B.w - 8, B.h - 8, r - 4); ctx.clip();
    ctx.fillStyle = 'rgba(255,179,71,0.86)';
    if (rtl) ctx.fillRect(bx + B.w - B.w * k, top, B.w * k, B.h); else ctx.fillRect(bx, top, B.w * k, B.h);
    ctx.restore();
    label(ctx, i18n.t('ad_in', { n: left }), cx, by + 1, 21, U.cream, 5, B.w - 40);
  } else {
    const p = clamp(V.pop, 0, 1.2), s = 0.82 + 0.18 * p;
    ctx.save();
    ctx.translate(cx, by); ctx.scale(s, s); ctx.translate(-cx, -by);
    drawBtn(ctx, cx, by, B.w, B.h, V.btn, U.amber, '', V.press === 'collect' ? 1 : 0, 0.35 + 0.25 * Math.sin(V.t * 4));
    ctx.restore();
    label(ctx, i18n.t('ad_unlocked'), cx, sy + 22, 17, U.gold, 5, SC.w - 30);
  }
}

stage.onResize(() => { if (V.active) refresh(); });
i18n.onChange(() => { if (V.active) refresh(); });

// ?ads=mock on a dev host: the stand-in, so the placements can be played in a desktop browser
try {
  if (typeof location !== 'undefined' && /(?:^|[?&])ads=mock(?:&|$)/.test(location.search) && devHost()) S.provider = MOCK;
} catch (e) { /* no location (tests) */ }

// ================================================================ public surface
export const ads = {
  tune: TUNE,
  scene: adScene,
  dict: DICT,

  // the provider: native.js hands over its AdMob one; 'mock' (dev hosts only) or 'none' / null by name
  provide(p) {
    if (p === 'mock') S.provider = devHost() ? MOCK : null;
    else if (p && typeof p === 'object' && typeof p.show === 'function') S.provider = p;
    else S.provider = null;
    notify();
    return ads.available();
  },
  useProvider(p) { return ads.provide(p); },
  get provider() { return S.provider ? String(S.provider.name || 'custom') : 'none'; },
  // false in v1 (no provider) and for VIP: every placement button stays hidden
  available() { return ready() && !hidden(); },
  // what the placement pays if offered now (0 = no button); call on enter / on change, never per frame
  can(place, ctx) {
    if (!ready() || W.busy || hidden()) return 0;
    return allow(cur(), place, ctx);
  },
  // today's state for button copy: { available, shows (left today), perDay, used, double (gems left), reopen, gift, piggy }
  left(out) {
    const o = out || {}, D = cur(), P = TUNE.placements, on = ready() && !hidden();
    const shows = on ? Math.max(0, TUNE.perDay - D.n) : 0;
    o.available = on; o.perDay = TUNE.perDay; o.used = D.n; o.shows = shows;
    o.double = shows > 0 && D.by.double < P.double.perDay ? Math.max(0, P.double.gemsPerDay - D.gems) : 0;
    o.reopen = shows > 0 ? Math.max(0, P.reopen.perDay - D.by.reopen) : 0;
    o.gift = shows > 0 ? Math.max(0, P.gift.perDay - D.by.gift) : 0;
    o.piggy = shows > 0 ? Math.max(0, P.piggy.perDay - D.by.piggy) : 0;
    return o;
  },
  // the VIP gate: fn() true = hide every placement (js/native.js: () => wallet.vip()); null = never hidden
  hideWhen(fn) { S.hide = typeof fn === 'function' ? fn : null; S.hid = hidden(); notify(); return S.hid; },
  // re-asks the gate (a purchase may have made the player VIP) and tells the buttons when the answer changed
  refresh() { const now = hidden(); if (now !== S.hid) { S.hid = now; notify(); } return now; },
  get hidden() { return hidden(); },
  // the shared "plays a video" sticker for a Watch button (size = its width in design units)
  drawMark: drawMark,
  watch: watch,
  // preload a video where the provider can (call when a placement button shows)
  warm() { const P = S.provider; if (P && typeof P.warm === 'function' && ready()) { try { P.warm(); } catch (e) { /* the tap loads it */ } } },
  get busy() { return W.busy; },
  onChange(fn) {
    S.listeners.push(fn);
    return () => { const i = S.listeners.indexOf(fn); if (i >= 0) S.listeners.splice(i, 1); };
  },
  // the game's own chrome: { button: drawButton, iconButton: drawIconButton } (js/game/icons.js); null = the built-in copy
  skin(fns) { S.skin = fns && typeof fns === 'object' ? fns : null; },
  // local-day source (profile.today keeps the dev clock in step); null = the device date
  useClock(fn) { S.clock = typeof fn === 'function' ? fn : null; return today(); },
  today: today,

  // ---- dev pages
  get key() { return S.key; },
  // switch to a scratch key ('ads.<name>') -> the previous key
  useKey(key) { const prev = S.key; S.key = typeof key === 'string' && key.length ? key : TUNE.key; notify(); return prev; },
  // deletes the CURRENT scratch key (never the live ledger) -> true when deleted
  wipe() { if (S.key === TUNE.key) return false; save.del(S.key); notify(); return true; },
  ledger() { return cur(); },
  info() {
    const D = cur();
    return { provider: ads.provider, available: ready() && !hidden(), hidden: hidden(), gate: !!S.hide, busy: W.busy, mode: V.mode, key: S.key, day: D.day, n: D.n,
      by: { double: D.by.double, reopen: D.by.reopen, gift: D.by.gift, piggy: D.by.piggy }, gems: D.gems, life: { n: D.life.n, gems: D.life.gems },
      watched: S.watched, failed: S.failed, last: S.last, parked: loop.suspended, held: audio.held };
  },
  // the cap rules on plain ledgers (no storage, no provider) -> { ok, report }
  selfTest() {
    const lines = [];
    let ok = true;
    function check(c, name) { lines.push((c ? 'PASS ' : 'FAIL ') + name); if (!c) ok = false; }
    const day = '2026-10-25', next = '2026-10-26', prev = '2026-10-24';
    let D = roll(blank(''), day);
    check(allow(D, 'double', { gems: 12, key: 'r1' }) === 12, 'double pays the night\'s gems');
    check(allow(D, 'double', { gems: 0, key: 'r0' }) === 0, 'a night that paid nothing has no double');
    check(allow(D, 'double', { gems: 80, key: 'r9' }) === 50, 'a double is capped at 50 gems a day');
    count(D, 'double', { key: 'r1' }, 12);
    check(allow(D, 'double', { gems: 12, key: 'r1' }) === 0, 'a result is doubled once');
    check(allow(D, 'double', { gems: 40, key: 'r2' }) === 38, 'the day\'s double gems are capped at +50 in total');
    count(D, 'double', { key: 'r2' }, 38);
    check(allow(D, 'double', { gems: 5, key: 'r3' }) === 0, 'no double once +50 gems were doubled today');
    check(allow(D, 'reopen', NO) === 1, 'a free Reopen is offered');
    count(D, 'reopen', NO, 1);
    check(allow(D, 'reopen', NO) === 0, 'one free Reopen a day');
    check(allow(D, 'gift', NO) === 0, 'an extra gift needs its gems');
    check(allow(D, 'gift', { gems: 99 }) === 15, 'an extra gift is capped at 15 gems');
    count(D, 'gift', NO, 5);
    check(allow(D, 'gift', { gems: 5 }) === 0, 'one extra gift a day');
    check(allow(D, 'nope', { gems: 5 }) === 0, 'unknown placements are never offered');
    D = roll(blank(''), day);
    for (let i = 0; i < 6; i++) count(D, 'double', { key: 'k' + i }, 1);
    check(D.n === 6 && allow(D, 'reopen', NO) === 0 && allow(D, 'gift', { gems: 5 }) === 0 && allow(D, 'double', { gems: 3, key: 'z' }) === 0,
      'at most 6 videos a day across every placement');
    roll(D, next);
    check(D.n === 0 && D.gems === 0 && D.by.double === 0 && allow(D, 'reopen', NO) === 1, 'a new local day starts the counts again');
    check(D.keys.length === 6 && allow(D, 'double', { gems: 3, key: 'k1' }) === 0, 'a doubled result stays doubled the next day');
    count(D, 'reopen', NO, 1);
    roll(D, prev);
    check(D.day === next && allow(D, 'reopen', NO) === 0, 'a clock set back never pays twice');
    const C = clean({ day: 'x', n: -4, by: { double: '3', reopen: 1e9 }, gems: 7.9, keys: [1, 'a', '', 'b'], life: { n: 2 } });
    check(C.day === '' && C.n === 0 && C.by.double === 3 && C.by.reopen === 1e6 && C.by.gift === 0 && C.gems === 7 && C.keys.join() === 'a,b' && C.life.n === 2,
      'a damaged ledger is cleaned');
    D = blank(day);
    for (let i = 0; i < 40; i++) { D.n = 0; D.by.double = 0; D.gems = 0; count(D, 'double', { key: 'q' + i }, 1); }
    check(D.keys.length === TUNE.keysKept && D.keys[D.keys.length - 1] === 'q39', 'only the newest result keys are kept');
    check(TUNE.perDay === 6 && TUNE.placements.double.gemsPerDay === 50 && TUNE.placements.reopen.perDay === 1 && TUNE.placements.gift.perDay === 1 &&
      TUNE.placements.piggy.perDay === 1 && TUNE.placements.piggy.gems === 50,
      'the v1.1 caps: 6 a day, +50 double gems, 1 Reopen, 1 gift x2, 1 piggy +50');
    // the piggy: +50 once a day, never past the pot's cap
    D = roll(blank(''), day);
    check(allow(D, 'piggy', NO) === 50 && allow(D, 'piggy', { room: 900 }) === 50, 'the piggy is offered +50');
    check(allow(D, 'piggy', { room: 20 }) === 20, 'a nearly full piggy is offered only its room');
    check(allow(D, 'piggy', { room: 0 }) === 0, 'a full piggy has no button');
    count(D, 'piggy', NO, 50);
    check(allow(D, 'piggy', { room: 900 }) === 0 && D.life.gems === 50, 'one piggy video a day');
    for (let i = 0; i < 5; i++) count(D, 'double', { key: 'p' + i }, 1);
    check(D.n === 6 && allow(D, 'reopen', NO) === 0, 'the piggy counts toward the 6 a day');
    check(clean({ day: day, by: { double: 1 } }).by.piggy === 0, 'a ledger from before the piggy reads 0 piggy videos');
    // the VIP gate
    check(!gated(null) && !gated(() => false) && gated(() => true), 'the VIP gate hides only while it holds');
    check(gated(() => { throw new Error('x'); }), 'a VIP gate that throws hides the placements');
    return { ok: ok, report: lines.join('\n') };
  },
};

if (typeof window !== 'undefined') window.__ads = ads;
