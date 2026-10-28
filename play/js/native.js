// native.js: the native-app shell of Monster Bouncer / بودي قارد الوحوش inside Capacitor iOS (bundle app.monsterbouncer.game).
// There is no bundler: every plugin is reached through the bridge object window.Capacitor.Plugins (never an npm import),
// and every plugin is optional: a build without one keeps the web behaviour for that feature and nothing throws. On the
// web (no window.Capacitor, or isNativePlatform() false) nothing native runs: hydrate() / saveReady() return null, init()
// only wires the ad policy below (pure JS, no plugin) and returns false, so the web build is unchanged.
// Plugins (the Capacitor npm packages the iOS project ships; dev/native.html fakes every one of them):
//   Preferences  (@capacitor/preferences) the save mirror: core/save.js save.mirror, read before the engine starts
//   StatusBar    (@capacitor/status-bar)  hidden at launch and again on every resume
//   SplashScreen (@capacitor/splash-screen) hidden after the first engine frame (capacitor.config launchAutoHide: false;
//                index.html's boot guard also takes it down when the boot fails, so its 'tap to retry' can be seen)
//   Haptics      (@capacitor/haptics)     input.vibrate(pattern): one pulse -> impact LIGHT / MEDIUM / HEAVY by its length,
//                a multi-pulse pattern -> notification WARNING (soft) / ERROR; navigator.vibrate stays the web path
//   Filesystem + Share (@capacitor/filesystem, @capacitor/share) the result card: game/share.js writes the JPEG to the
//                app's Caches folder (cacheFile) and opens the iOS share sheet (share); the text carries the challenge link
//   App          (@capacitor/app)         pause / resume / appStateChange: the top scene's onInterrupt (play pauses), the
//                save mirrors flushed, audio resumed after calls / Siri / alarms; without it the page events do the same
//   AppLauncher  (@capacitor/app-launcher, optional) external links; without it location.assign(url) is handed to Safari
//                by Capacitor's navigation policy (server.allowNavigation must never list the site's host)
//   AdMob        (@capacitor-community/admob, v1.1 only) opt-in rewarded video for core/ads.js. OFF in v1: attached only
//                when the build turns it on (window.MB_BUILD = { ads: true, admobRewardedIos: '<unit id>', admobTesting }
//                written by CI, or TUNE.ads) AND the plugin is in the binary. Non-personalised ads only (npa: true on
//                every request), so there is NO App Tracking Transparency prompt (initialize gets
//                requestTrackingAuthorization: false and nothing here ever asks for tracking); Google's UMP consent form
//                shows only where the law requires it (EEA / UK / CH), the first time the player taps a Watch button.
//                maxAdContentRating 'General' (the game is 9+). The plugin needs GADApplicationIdentifier +
//                SKAdNetworkItems in Info.plist (tools/ios_configure.py), and App Privacy then declares the ad SDK's data
//                (Device ID + Advertising Data + Diagnostics: not linked, not tracking) instead of 'Data Not Collected'.
// Ad policy (every platform, init): VIP sees no Watch button at all (ads.hideWhen(() => eng.wallet.vip()), re-asked on
//                every wallet change through ads.refresh(), so a VIP bought mid-session hides them at once) and the
//                ad ledger's day follows the game's own clock (ads.useClock(eng.profile.today): the dev clock too).
// Lifecycle (js/main.js):  const gate = native.hydrate(300)   // null on the web; else Promise<start?> within 300 ms
//                          gate.then(go => go && start())    // false: the save mirror restored a copy and the page reloads
//                          ... startEngine ... native.init(eng, { flush })   // status bar, splash, haptics, links, 4.2, app events
//                          native.saveReady().then(() => payments)          // the store waits for the mirror's verdict
// Guideline 4.2 hygiene (native only): no pinch / double-tap zoom (viewport maximum-scale=1, user-scalable=no; Safari's
// gesture events), no selection or long-press callouts (contextmenu / selectstart / dragstart), no rubber band (touchmove
// outside .scrollable), on top of css/app.css (position: fixed body, user-select / touch-callout none, overscroll none).
// Links: on native window.open(url) of another origin (Settings / Shop Terms + Privacy, Support) opens Safari through
// openExternal; same-origin calls keep the original window.open.
import { save } from './core/save.js';
import { ads } from './core/ads.js';

const TUNE = {
  hydrateMs: 300,             // the engine waits at most this long for the save mirror's read (main.js passes it too)
  readMs: 4000,               // the mirror read gives up after this: the mirror stays off for the session
  splashFrames: 2,            // rAF ticks after init before the launch splash goes (the first engine frame is on screen)
  splashMaxMs: 4000,          // ...or this late at the latest
  splashFadeMs: 200,
  hapticGapMs: 35,            // impacts closer together than this are dropped (no bridge spam)
  lightMs: 15, mediumMs: 30,  // strongest pulse <= lightMs -> LIGHT, <= mediumMs -> MEDIUM, else HEAVY
  resumeMs: [0, 250, 1000],   // audio resume attempts after the app is active again
  cacheDir: 'CACHE',          // Filesystem Directory.Cache: the shared card (only the latest one is kept)
  adoptFlag: 'mbouncer:restored',   // sessionStorage: a restore reloads at most once per launch
  // rewarded video (v1.1): window.MB_BUILD overrides on / units / testing; v1 ships with on: false
  ads: {
    on: false, unitIos: '', unitAndroid: '', testing: false,
    rating: 'General',        // maxAdContentRating (G: the 9+ game, Gulf audience)
    consentMs: 6000,          // the UMP consent-info request gives up after this (the form itself never times out)
    loadMs: 10000,            // a video not loaded by then: 'timeout' (core/ads.js shows 'No video right now')
    staleMs: 50 * 60000,      // a preloaded video is used within this (AdMob expires them after an hour)
    reloadMs: 1500,           // after a video closes the next one preloads this late
  },
};

// argument objects handed to the bridge, built once (no allocation per haptic / resume)
const IMPACT = { LIGHT: { style: 'LIGHT' }, MEDIUM: { style: 'MEDIUM' }, HEAVY: { style: 'HEAVY' } };
const NOTE = { WARNING: { type: 'WARNING' }, ERROR: { type: 'ERROR' } };
const SB_HIDE = { animation: 'NONE' };
const SPLASH_HIDE = { fadeOutDuration: TUNE.splashFadeMs };
const PASSIVE_NO = { passive: false };
function noop() {}

const S = {
  inited: false, eng: null, opts: null,
  job: null, status: '',             // the save mirror's start() and its verdict
  splash: false, frames: 0,
  lastHaptic: -1e9,
  lastCard: '',                      // Caches path of the last shared card (deleted before the next one is written)
  openOrig: null,
  calls: 0,                          // plugin calls made (dev pages)
  policy: false,                     // the ad policy is wired (once, on every platform)
};

function cap() {
  try {
    const C = typeof window !== 'undefined' ? window.Capacitor : null;
    return C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() ? C : null;
  } catch (e) { return null; }
}
function plugin(name) {
  const C = cap();
  const P = C && C.Plugins ? C.Plugins[name] : null;
  return P || null;
}
// fire-and-forget plugin call: never throws, a rejection is swallowed -> the call's promise or null
function call(p, method, arg) {
  if (!p || typeof p[method] !== 'function') return null;
  try {
    S.calls++;
    const r = p[method](arg);
    if (r && typeof r.then === 'function') r.then(noop, noop);
    return r || null;
  } catch (e) { return null; }
}
function session(op, v) {
  try {
    const s = window.sessionStorage;
    if (op === 'get') return s.getItem(TUNE.adoptFlag) !== null;
    if (op === 'set') s.setItem(TUNE.adoptFlag, String(v));
    else s.removeItem(TUNE.adoptFlag);
  } catch (e) { /* no sessionStorage: the read-back check in save.js still guards a restore */ }
  return false;
}

// ---------------------------------------------------------------- save mirror (Preferences)
function prefsBackend() {
  const P = plugin('Preferences');
  if (!P || typeof P.get !== 'function' || typeof P.set !== 'function') return null;
  return {
    get(key) { return Promise.resolve(P.get({ key: key })).then(r => (r && typeof r.value === 'string' ? r.value : null)); },
    set(key, value) { return Promise.resolve(P.set({ key: key, value: value })); },
  };
}
function startMirror() {
  if (S.job) return S.job;
  const be = prefsBackend();
  if (!be) return null;
  S.job = save.mirror.start(be, { readMs: TUNE.readMs, allowAdopt: !session('get') }).then(st => {
    S.status = st;
    if (st === 'adopted') { session('set', Date.now()); native.reload(); }
    else if (st !== 'off') session('del');
    return st;
  }, () => { S.status = 'off'; return 'off'; });
  return S.job;
}

// ---------------------------------------------------------------- splash + status bar
function statusBar() { call(plugin('StatusBar'), 'hide', SB_HIDE); }
function hideSplash() {
  if (S.splash) return;
  S.splash = true;
  call(plugin('SplashScreen'), 'hide', SPLASH_HIDE);
}
function splashTick() {
  if (S.splash) return;
  if (++S.frames >= TUNE.splashFrames) { hideSplash(); return; }
  requestAnimationFrame(splashTick);
}

// ---------------------------------------------------------------- haptics (input.vibrator)
// pattern: ms (one pulse) or [pulse, gap, pulse, ...] -> true when a haptic was played
function haptic(pattern) {
  const H = plugin('Haptics');
  if (!H) return false;
  let max = 0, n = 0;
  if (typeof pattern === 'number') { max = pattern; n = 1; }
  else if (pattern && typeof pattern.length === 'number') {
    for (let i = 0; i < pattern.length; i += 2) { const v = +pattern[i]; if (v > 0) { n++; if (v > max) max = v; } }
  }
  if (!(max > 0)) return false;
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (t - S.lastHaptic < TUNE.hapticGapMs) return false;
  S.lastHaptic = t;
  if (n > 1) call(H, 'notification', max <= TUNE.lightMs ? NOTE.WARNING : NOTE.ERROR);
  else call(H, 'impact', max <= TUNE.lightMs ? IMPACT.LIGHT : (max <= TUNE.mediumMs ? IMPACT.MEDIUM : IMPACT.HEAVY));
  return true;
}

// ---------------------------------------------------------------- external links (Safari)
function isExternal(url) {
  if (typeof url !== 'string' || !url) return false;
  let u = null;
  try { u = new URL(url, location.href); } catch (e) { return false; }
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') return true;
  return (u.protocol === 'https:' || u.protocol === 'http:') && u.origin !== location.origin;
}
function openExternal(url) {
  const L = plugin('AppLauncher');
  const r = L ? call(L, 'openUrl', { url: url }) : null;
  if (r) { r.then(res => { if (res && res.completed === false) native.navigate(url); }, () => native.navigate(url)); return true; }
  native.navigate(url);
  return true;
}
function routeLinks() {
  if (S.openOrig || typeof window.open !== 'function') return;
  const orig = window.open;
  S.openOrig = orig;
  window.open = function (url) {
    const u = url === undefined || url === null ? '' : String(url);
    if (isExternal(u)) { openExternal(u); return null; }
    return orig.apply(window, arguments);
  };
}

// ---------------------------------------------------------------- rewarded video (AdMob, v1.1; core/ads.js is the policy)
// RewardAdPluginEvents of @capacitor-community/admob
const AD_EV = { showed: 'onRewardedVideoAdShowed', failedToShow: 'onRewardedVideoAdFailedToShow', dismissed: 'onRewardedVideoAdDismissed',
  rewarded: 'onRewardedVideoAdReward' };
const AD = { init: null, ready: false, loaded: 0, loading: null, shows: 0, fails: 0, last: '', consent: '', attached: false, lastReq: null, lastInit: null,
  end: null };   // end(err) of the video on screen (release() calls it when core/ads.js closed without its dismiss)
function adsConfig() {
  const T = TUNE.ads;
  let B = null;
  try { B = typeof window !== 'undefined' && window.MB_BUILD && typeof window.MB_BUILD === 'object' ? window.MB_BUILD : null; } catch (e) { B = null; }
  const os = native.platform();
  const ios = B && typeof B.admobRewardedIos === 'string' ? B.admobRewardedIos.trim() : T.unitIos;
  const and = B && typeof B.admobRewardedAndroid === 'string' ? B.admobRewardedAndroid.trim() : T.unitAndroid;
  return {
    on: B && typeof B.ads === 'boolean' ? B.ads : T.on,
    unit: os === 'ios' ? ios : (os === 'android' ? and : ''),
    testing: B && typeof B.admobTesting === 'boolean' ? B.admobTesting : T.testing,
  };
}
function within(p, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    Promise.resolve(p).then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}
function adError(e) { return /timeout/i.test(String((e && e.message) || e || '')) ? 'timeout' : 'nofill'; }
// Google UMP: the consent form only where it is required; a failure never blocks a video (npa ads need no ATT)
function adConsent(A) {
  if (typeof A.requestConsentInfo !== 'function') return Promise.resolve();
  S.calls++;
  return within(A.requestConsentInfo(), TUNE.ads.consentMs).then(info => {
    AD.consent = info && typeof info.status === 'string' ? info.status : '';
    if (info && info.isConsentFormAvailable === true && info.status === 'REQUIRED' && typeof A.showConsentForm === 'function') {
      S.calls++;
      return Promise.resolve(A.showConsentForm()).then(r => { AD.consent = r && typeof r.status === 'string' ? r.status : AD.consent; });
    }
    return null;
  }).then(noop, noop);
}
function adInit(A, cfg) {
  if (AD.init) return AD.init;
  AD.lastInit = { initializeForTesting: cfg.testing, requestTrackingAuthorization: false, tagForUnderAgeOfConsent: false,
    maxAdContentRating: TUNE.ads.rating };
  AD.init = adConsent(A).then(() => { S.calls++; return A.initialize(AD.lastInit); }).then(() => { AD.ready = true; return true; });
  AD.init.then(noop, () => { AD.init = null; });
  return AD.init;
}
function adPrepare(A, cfg) {
  if (AD.loaded && Date.now() - AD.loaded < TUNE.ads.staleMs) return Promise.resolve(true);
  if (AD.loading) return AD.loading;
  AD.lastReq = { adId: cfg.unit, isTesting: cfg.testing, npa: true };
  S.calls++;
  AD.loading = within(A.prepareRewardVideoAd(AD.lastReq), TUNE.ads.loadMs).then(() => {
    AD.loading = null; AD.loaded = Date.now(); return true;
  }, e => { AD.loading = null; AD.loaded = 0; AD.fails++; AD.last = adError(e); throw e; });
  return AD.loading;
}
function adListen(A, ev, fn) {
  try { const h = A.addListener(ev, fn); if (h && typeof h.then === 'function') h.then(noop, noop); return h; } catch (e) { return null; }
}
function adDrop(list) {
  for (let i = 0; i < list.length; i++) {
    Promise.resolve(list[i]).then(h => { if (h && typeof h.remove === 'function') { const r = h.remove(); if (r && r.then) r.then(noop, noop); } }, noop);
  }
  list.length = 0;
}
// background preload, once consent + init ran (they only ever run from a tap on a Watch button)
function adWarm() {
  const A = plugin('AdMob'), cfg = adsConfig();
  if (!A || !cfg.on || !cfg.unit || !AD.ready) return;
  adPrepare(A, cfg).then(noop, noop);
}
const ADMOB = {
  name: 'admob',
  ready() { const cfg = adsConfig(); return !!(cfg.on && cfg.unit && plugin('AdMob')); },
  warm: adWarm,
  // core/ads.js hooks: live() / covered() / rewarded() -> Promise<{ ok, error }>, never rejects
  show(h) {
    const A = plugin('AdMob'), cfg = adsConfig();
    if (!A || !cfg.on || !cfg.unit) return Promise.resolve({ ok: false, error: 'off' });
    return adInit(A, cfg).then(() => adPrepare(A, cfg)).then(() => {
      if (!h.live()) return { ok: false, error: 'closed' };           // the overlay gave up meanwhile: the video waits for the next tap
      return new Promise(resolve => {
        const subs = [];
        let got = false, done = false;
        const reward = () => { if (!got) { got = true; h.rewarded(); } };
        const end = err => {
          if (done) return;
          done = true; adDrop(subs); AD.loaded = 0; AD.shows++;
          if (AD.end === end) AD.end = null;
          statusBar();                                                 // a full-screen video may have shown the status bar
          resolve({ ok: got, error: got ? '' : err });
          setTimeout(adWarm, TUNE.ads.reloadMs);
        };
        AD.end = end;
        subs.push(adListen(A, AD_EV.showed, () => h.covered()));
        subs.push(adListen(A, AD_EV.rewarded, reward));
        subs.push(adListen(A, AD_EV.dismissed, () => end('closed')));
        subs.push(adListen(A, AD_EV.failedToShow, () => { AD.fails++; AD.last = 'show'; end('show'); }));
        let r = null;
        try { S.calls++; r = A.showRewardVideoAd(); } catch (e) { end('show'); return; }
        // the promise resolves with the reward item once it is earned (the event may come first, or not at all)
        Promise.resolve(r).then(item => { if (item && typeof item === 'object') reward(); }, () => end('show'));
      });
    }, e => ({ ok: false, error: adError(e) }));
  },
  // the overlay closed first (its dismiss event was lost): drop that video's listeners
  release() { if (AD.end) AD.end('closed'); },
};
// the ad policy, from the engine handle (main.js sets eng.wallet / eng.profile before init): VIP hides every placement,
// the ledger's day is the game's day. Pure JS: it runs on the web too (the dev 'mock' provider honours it)
function adsPolicy(eng) {
  if (S.policy || !eng) return false;
  const w = eng.wallet, p = eng.profile;
  if (w && typeof w.vip === 'function') {
    S.policy = true;
    ads.hideWhen(() => w.vip());
    if (typeof w.onChange === 'function') w.onChange(() => { ads.refresh(); });
  }
  if (p && typeof p.today === 'function') { S.policy = true; ads.useClock(() => p.today()); }
  return S.policy;
}
// hands the AdMob provider to core/ads.js when this build turns ads on -> whether it did
function attachAds() {
  if (!cap() || !ADMOB.ready()) return false;
  AD.attached = true;
  ads.provide(ADMOB);
  return true;
}

// ---------------------------------------------------------------- Guideline 4.2 hygiene
function prevent(e) { if (e.cancelable) e.preventDefault(); }
function noRubber(e) {
  if (!e.cancelable) return;
  const t = e.target;
  if (t && typeof t.closest === 'function' && t.closest('.scrollable')) return;   // an HTML list that scrolls inside itself
  e.preventDefault();
}
function fixViewport() {
  const m = document.querySelector('meta[name="viewport"]');
  if (!m) return;
  const c = m.getAttribute('content') || '';
  if (c.indexOf('user-scalable') < 0) m.setAttribute('content', c + ', maximum-scale=1, user-scalable=no');
}
function hygiene() {
  fixViewport();
  try { document.documentElement.classList.add('native'); } catch (e) { /* no classList */ }
  document.addEventListener('contextmenu', prevent, PASSIVE_NO);
  document.addEventListener('selectstart', prevent, PASSIVE_NO);
  document.addEventListener('dragstart', prevent, PASSIVE_NO);
  document.addEventListener('gesturestart', prevent, PASSIVE_NO);
  document.addEventListener('touchmove', noRubber, PASSIVE_NO);
}

// ---------------------------------------------------------------- app lifecycle
function interruptTop() {
  const sc = S.eng && S.eng.scenes;
  if (!sc) return;
  const top = sc.top, base = sc.current;
  const s = top && top.onInterrupt ? top : (base && base.onInterrupt ? base : null);
  if (s) { try { s.onInterrupt('native'); } catch (e) { console.error('[native] onInterrupt failed', e); } }
}
function flushAll() {
  save.mirror.flush();
  const f = S.opts && S.opts.flush;
  if (typeof f === 'function') { try { const r = f(); if (r && typeof r.then === 'function') r.then(noop, noop); } catch (e) { /* the next hide retries */ } }
}
function resumeAudio() {
  const a = S.eng && S.eng.audio;
  if (!a || !a.ctx || a.held || !a.enabled || document.hidden) return;
  const st = a.state();
  if (st === 'running' || st === 'closed') return;
  try { const p = a.ctx.resume(); if (p && typeof p.then === 'function') p.then(noop, noop); } catch (e) { /* audio.js retries on the next tap */ }
}
function onInactive() { interruptTop(); flushAll(); }
function onActive() {
  statusBar();
  for (let i = 0; i < TUNE.resumeMs.length; i++) setTimeout(resumeAudio, TUNE.resumeMs[i]);
}
function onAppState(s) { if (s && s.isActive === false) onInactive(); else if (s && s.isActive === true) onActive(); }
function onVisibility() { if (document.hidden) onInactive(); else onActive(); }
function appEvents() {
  const A = plugin('App');
  if (A && typeof A.addListener === 'function') {
    try {
      S.calls++;
      const r1 = A.addListener('appStateChange', onAppState); if (r1 && r1.then) r1.then(noop, noop);
      const r2 = A.addListener('pause', onInactive); if (r2 && r2.then) r2.then(noop, noop);
      const r3 = A.addListener('resume', onActive); if (r3 && r3.then) r3.then(noop, noop);
    } catch (e) { /* the page events below still run */ }
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onActive);
}

// ---------------------------------------------------------------- public surface
export const native = {
  tune: TUNE,
  isNative() { return !!cap(); },
  platform() { const C = cap(); try { return C && C.getPlatform ? C.getPlatform() : 'web'; } catch (e) { return 'web'; } },
  plugin: plugin,
  has(name) { return !!plugin(name); },

  // main.js, before the engine starts: reads the save mirror. null on the web (start at once); else a Promise that
  // resolves within maxMs: true = start the engine, false = a restore was written and the page is reloading
  hydrate(maxMs) {
    if (!cap()) return null;
    statusBar();
    const job = startMirror();
    if (!job) return null;
    const ms = maxMs >= 0 ? maxMs : TUNE.hydrateMs;
    return new Promise(res => {
      const t = setTimeout(() => res(true), ms);
      job.then(st => { clearTimeout(t); res(st !== 'adopted'); });
    });
  },
  // the mirror's verdict ('fresh' | 'kept' | 'adopted' | 'off'); null on the web or without the Preferences plugin
  saveReady() { return cap() ? (S.job || startMirror()) : null; },
  get saveStatus() { return S.status; },

  // main.js, right after startEngine: eng = the engine handle; opts.flush() = an extra durable write on pause (the wallet)
  init(eng, opts) {
    adsPolicy(eng);                  // every platform: VIP sees no Watch button, the ad ledger keeps the game's day
    if (S.inited || !cap()) return false;
    S.inited = true; S.eng = eng || null; S.opts = opts || null;
    statusBar();
    S.frames = 0;
    try { requestAnimationFrame(splashTick); } catch (e) { hideSplash(); }
    setTimeout(hideSplash, TUNE.splashMaxMs);
    if (eng && eng.input) eng.input.vibrator = haptic;
    hygiene();
    routeLinks();
    appEvents();
    attachAds();
    return true;
  },

  haptic: haptic,
  hideSplash: hideSplash,
  openExternal(url) { return cap() && isExternal(String(url)) ? openExternal(String(url)) : false; },
  isExternal: isExternal,

  // ---- share (game/share.js): true when the share sheet / the Caches folder are reachable
  canShare() { const P = plugin('Share'); return !!(P && typeof P.share === 'function'); },
  canCache() { const F = plugin('Filesystem'); return !!(F && typeof F.writeFile === 'function'); },
  // writes base64 data as Caches/<name> (the previous card is deleted first) -> Promise<file uri | null>, never rejects
  cacheFile(name, base64) {
    const F = plugin('Filesystem');
    if (!F || typeof F.writeFile !== 'function' || !name || !base64) return Promise.resolve(null);
    const prev = S.lastCard;
    const gone = prev && prev !== name && typeof F.deleteFile === 'function'
      ? Promise.resolve(call(F, 'deleteFile', { path: prev, directory: TUNE.cacheDir })).then(noop, noop) : Promise.resolve();
    return gone.then(() => {
      S.calls++;
      return F.writeFile({ path: name, data: base64, directory: TUNE.cacheDir });
    }).then(r => {
      S.lastCard = name;
      return r && typeof r.uri === 'string' && r.uri ? r.uri : null;
    }, () => null);
  },
  // the iOS share sheet: o { title, text, url, files: [uri] } -> Promise<'shared' | 'abort' | 'error'>, never rejects
  share(o) {
    const P = plugin('Share');
    if (!P || typeof P.share !== 'function') return Promise.resolve('error');
    let r = null;
    try { S.calls++; r = P.share(o); } catch (e) { return Promise.resolve('error'); }
    return Promise.resolve(r).then(() => 'shared', e => {
      const m = String((e && (e.message || e.errorMessage)) || e || '');
      return (e && (e.code === 'CANCELED' || e.code === 'CANCELLED')) || /cancel/i.test(m) ? 'abort' : 'error';
    });
  },

  // ---- rewarded video (v1.1): the build's ad config, attach (again: a dev page that set window.MB_BUILD), bookkeeping
  adsConfig: adsConfig,
  attachAds: attachAds,
  adsPolicy: adsPolicy,
  adsInfo() {
    const c = adsConfig();
    return { on: c.on, unit: c.unit, testing: c.testing, plugin: !!plugin('AdMob'), attached: AD.attached, ready: AD.ready, policy: S.policy,
      loaded: AD.loaded > 0, shows: AD.shows, fails: AD.fails, last: AD.last, consent: AD.consent,
      init: AD.lastInit ? { requestTrackingAuthorization: AD.lastInit.requestTrackingAuthorization, maxAdContentRating: AD.lastInit.maxAdContentRating,
        initializeForTesting: AD.lastInit.initializeForTesting } : null,
      request: AD.lastReq ? { adId: AD.lastReq.adId, isTesting: AD.lastReq.isTesting, npa: AD.lastReq.npa } : null };
  },

  // flush the save mirror now (also done on every pause / hide) -> Promise<boolean>
  flush() { return save.mirror.flush(); },
  // replaceable by dev pages (a restore reloads; an external link without AppLauncher leaves through Capacitor)
  reload() { try { location.reload(); } catch (e) { /* nothing to do */ } },
  navigate(url) { try { location.assign(url); } catch (e) { /* nothing to do */ } },
  // dev pages: bookkeeping
  info() {
    return { native: !!cap(), inited: S.inited, status: S.status, splash: S.splash, frames: S.frames, calls: S.calls,
      lastCard: S.lastCard, links: !!S.openOrig, mirror: save.mirror.info(), ads: native.adsInfo() };
  },
};
