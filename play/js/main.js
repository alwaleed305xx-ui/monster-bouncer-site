// main.js: the single module entry point of index.html and dev/all.html. Boots Monster Bouncer through engine.startEngine with
// every scene (boot, home, play, result, collection, settings, pause, shop, checkout) and the game dictionary (strings.js +
// every strings-*.js + boot's keys),
// applies the saved profile settings (language, sound / music through party.setEnabled, haptics; left-hand mode is read
// by the play scene), and turns a challenge link (share.parseLaunchParams: ?mode=night&night=N&seed=S&vs=C-T, ?daily=...,
// ?mode=endless...) into boot -> play with the friend's dare on the title card. The query is stripped afterwards so the
// lobby never offers the same dare again and a reload opens the normal game. window.__tg is the engine handle (+ profile,
// + wallet, + pay: the payments module, + native).
// Native app (Capacitor iOS, js/native.js; every hook below is a no-op on the web, which starts exactly as before): the
// save mirror (core/save.js, Capacitor Preferences) is read BEFORE the engine starts, waiting at most TUNE.hydrateMs:
// WKWebView may have lost localStorage, and a mirror copy that is newer than what the modules just loaded is written
// back and the page reloads instead of starting (the launch splash stays up meanwhile). After startEngine native.init
// hides the status bar, takes the launch splash down after the first frame, routes haptics / external links / the app
// lifecycle (a pause also flushes the wallet's own mirror), and payments start once the save mirror has its verdict.
// Dictionary: strings.js, then every builder's js/game/strings-<key>.js (each exports DICT = { en, ar }; listed in
// STRING_MODULES below, later ones win on a shared key), then boot's own keys. Economy (docs/MONETIZATION.md §10, §11):
// the 'shop' overlay (js/scenes/shop.js) and the 'checkout' overlay (payments.js: the web demo purchase sheet; an 'offer'
// scene joins this list once js/scenes/offer.js exists) are registered with the scenes, and initPayments()
// runs once after boot (native save mirror -> Club Pass settle -> StoreKit: unfinished transactions, owned sync, prices).
// Back gesture / back button (Android edge swipe, browser back, an installed PWA): the first tap pushes one history entry
// ({ mbouncer: 1 }, re-armed on a later tap after it was used: an entry pushed inside a user gesture is one the browser's
// back honours). A back then stays in the game: while a night is in play the play scene's own popstate handler pauses it;
// anywhere else the top scene's onBack() handles it (settings / pause close, the dressing room closes, collection and
// result head home) and a scene without one goes home; only the lobby (or the title card) lets the page go back.
import { startEngine } from './engine.js';
import { input } from './core/input.js';
import { scenes } from './core/scene.js';
import { i18n } from './core/i18n.js';
import { DICT } from './game/strings.js';
import { DICT as DICT_BOOSTERS } from './game/strings-boosters.js';
import { DICT as DICT_SHOPUI } from './game/strings-shopui.js';
import { DICT as DICT_COSMETICS } from './game/strings-cosmetics.js';
import { profile } from './game/profile.js';
import { wallet } from './game/economy.js';
import * as pay from './game/payments.js';
import { setEnabled } from './game/party.js';
import { parseLaunchParams } from './game/share.js';
import { native } from './native.js';
import { boot, bootDict } from './scenes/boot.js';
import { home } from './scenes/home.js';
import { play } from './scenes/play.js';
import { result } from './scenes/result.js';
import { collection } from './scenes/collection.js';
import { settings } from './scenes/settings.js';
import { pause } from './scenes/pause.js';
import { shop } from './scenes/shop.js';

// first scene: the CSS splash fades over the title card's own entrance; leaveMs: how long a back from the lobby waits for
// the page to go before it counts as "nothing to go back to"
// hydrateMs: native only, the longest the engine waits for the save mirror's read (js/native.js)
const TUNE = { first: 'boot', transition: 'none', ms: 0, leaveMs: 800, hydrateMs: 300 };

// every strings-*.js module, merged over strings.js in this order (boot's keys go last)
const STRING_MODULES = [DICT_BOOSTERS, DICT_SHOPUI, DICT_COSMETICS];

// merges { en, ar } dictionaries left to right (a later one wins on a shared key)
function mergeDicts(list) {
  const out = {};
  const langs = ['en', 'ar'];
  for (let i = 0; i < langs.length; i++) {
    const l = langs[i], d = {};
    for (let j = 0; j < list.length; j++) { const src = list[j] && list[j][l]; if (src) Object.assign(d, src); }
    out[l] = d;
  }
  return out;
}

// the play params a challenge link asks for (mirrors home.js: a daily without a date is today's)
function challengeParams(lp) {
  if (lp.mode === 'daily') return { mode: 'daily', date: lp.daily || profile.today(), vs: lp.vs, startedAt: 0 };
  if (lp.mode === 'endless') return { mode: 'endless', seed: lp.seed, vs: lp.vs };
  return { mode: 'night', night: lp.night || 1, seed: lp.seed, vs: lp.vs };
}

function stripQuery() {
  try {
    if (location.search && history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
  } catch (e) { /* file:// or a sandboxed frame: the lobby then shows the dare once more, harmless */ }
}

// ---- back gesture (see the header)
const BACK = { on: false, leaving: false };
function armed() { const s = history.state; return !!(s && s.mbouncer); }
// on a tap (pointer up = a user activation): make sure a back has an entry of ours to land on
function arm() {
  if (!BACK.on || BACK.leaving || armed()) return;
  try { history.pushState({ mbouncer: 1 }, ''); } catch (e) { BACK.on = false; }
}
function onBack() {
  if (BACK.leaving) { try { history.back(); } catch (e) { /* nothing left */ } return; }   // still on an entry of ours: keep stepping out
  const play = scenes.get('play'), home = scenes.get('home'), boot = scenes.get('boot');
  // a night in play (or fading out to its result) listens itself: it pauses / closes its overlay and re-arms
  if (play && (scenes.current === play || scenes.previous === play)) return;
  if (scenes.transitioning) return;                     // mid-transition: swallow it, the next tap re-arms
  const top = scenes.top;
  if (top && top !== home && top !== boot && typeof top.onBack === 'function' && top.onBack()) return;
  if (scenes.current !== home && scenes.current !== boot && home) { scenes.go('home', {}, { transition: 'zoom', ms: 420 }); return; }
  // the lobby / title card: the back leaves the game (the entry we pushed is already gone, so one more step; any older
  // entries of ours are stepped over above)
  BACK.leaving = true;
  try { history.back(); } catch (e) { BACK.leaving = false; }
  setTimeout(() => { BACK.leaving = false; }, TUNE.leaveMs);   // still here (nothing to go back to): a later tap re-arms
}
function initBack() {
  if (typeof window === 'undefined' || !window.history || !history.pushState) return;
  BACK.on = true;
  window.addEventListener('popstate', onBack);
  input.on('up', arm);
}

function main() {
  const lp = parseLaunchParams();
  const dare = lp && lp.mode ? lp : null;
  const bootParams = dare ? { next: 'play', nextParams: challengeParams(dare), dare: dare } : { next: 'home' };
  if (dare) stripQuery();

  const eng = startEngine({
    scenes: { boot, home, play, result, collection, settings, pause, shop, checkout: pay.checkout },
    first: TUNE.first, params: bootParams, transition: TUNE.transition, ms: TUNE.ms,
    dict: mergeDicts([DICT].concat(STRING_MODULES, [bootDict])),
  });

  // saved settings: language + haptics are applied by profile.load(); replaying them also reaches every listener
  // (settings.js wires sfx / music into the party buses); the explicit setEnabled covers a build without that overlay
  const S = profile.settings;
  profile.applySettings();
  setEnabled(S.sfx, S.music);
  document.title = i18n.t('title');
  i18n.onChange(() => { document.title = i18n.t('title'); });

  eng.profile = profile;
  eng.wallet = wallet;
  eng.pay = pay;
  eng.launch = dare;
  initBack();
  eng.back = BACK;
  eng.native = native;
  native.init(eng, { flush: () => wallet.flushed() });
  // the store never holds up the title card: payments start once the engine runs (initPayments catches its own failures);
  // native: once the save mirror has its verdict (a restore reloads first)
  const saved = native.saveReady();
  if (saved) saved.then(st => { if (st !== 'adopted') return pay.initPayments(); }).catch(e => console.error('[main] payments init failed', e));
  else pay.initPayments().catch(e => console.error('[main] payments init failed', e));
}

function start() {
  try {
    main();
  } catch (e) {
    console.error('[main] boot failed', e);
    if (window.__shell && window.__shell.fail) window.__shell.fail();
    throw e;
  }
}

// web: null, start now; native: Promise<false while a mirror restore reloads the page, else true> within TUNE.hydrateMs
const gate = native.hydrate(TUNE.hydrateMs);
if (gate) gate.then(go => { if (go) start(); });
else start();
