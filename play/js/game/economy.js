// economy.js: the Monster Bouncer / بودي قارد الوحوش economy (docs/MONETIZATION.md §2 to §7 and §11.3): the WALLET
// (`export const wallet`): gems, owned + equipped cosmetics, booster inventory, the per-run booster / Reopen state, every
// free gem source paid against reset-proof high-water marks, the piggy, the Club Pass, VIP, the IAP ledger and the offer
// caps. The frozen CATALOG it runs on (products mirroring store/iap.json, the 62 cosmetics, boosters, Reopen, earn rows,
// streak milestones, Star Road, medals, gift, piggy, pass, VIP and offer caps, lookups, selfTest()) is js/game/catalog.js
// (§11.2, pure data); this module re-exports all of it, so `import { wallet, PRODUCTS, itemById } from './economy.js'` works.
//
// Currencies: stars (profile.js) stay unspendable progress; GEMS are the only spendable currency. Gems come from play
// (welcome 50, 2 per new star, 3 per first pass, 5 per new Gold, 3 per counted daily: x2 with VIP on these four only;
// 25 per new band member, 5 per new colour look, streak milestones, 20 medals = 785, Star Road, the daily Free Gift) and
// from purchases (payments.js -> wallet.grantTx, the only door for paid content: nothing is granted before the payment
// provider confirms). The piggy (a separate bonus pot, paid out only by Break the Piggy) fills +30 a passed night, +60 a
// Gold, x2 with VIP.
//
// Save: 'mbouncer.wallet' through core/save.js with the 'mbouncer.' namespace swapped in around our own reads/writes (the
// profile.js pattern). It is NOT the profile: profile.reset() never touches it (Apple 3.1.1: Reset progress keeps
// purchases, gems, items, boosters, the pass, the piggy, VIP, medals, Star Road steps and the ledger). Every mutation
// re-reads the stored wallet first (another tab may have written: its copy is adopted whole) and applies its own delta
// to it, so a balance is never merged by max; rev goes up by 1 on every write; a 'storage' event from another tab reloads
// it. On native the wallet is mirrored (debounced 400 ms, at once on hide and before a store finish) into
// Capacitor.Plugins.Preferences key 'mbouncer.wallet' (UserDefaults 'CapacitorStorage.mbouncer.wallet'): iOS can reclaim a
// WKWebView's localStorage, and consumables cannot be restored from StoreKit. wallet.hydrate() (payments.initPayments
// runs it first) adopts the native copy when its rev is higher. wallet.flushed() resolves once the last write is durable
// (native mirror confirmed, else WebKit's ~1.5 s write-back window): payments.js finishes a store transaction only after it.
//
// Earning hooks: profile.recordNight / profile.abandonDaily call profile.onRecord listeners; this module subscribes, so
// wallet.onResult(outcome, r) runs right after every recorded night (result.js may call it again with the same outcome:
// the reward is kept on outcome.__reward and returned, never paid twice). A dev page that swaps only the PROFILE to a
// scratch key while the wallet stays on its live key earns nothing (tests swap both: wallet.useKey).
// Query helpers that return objects take an `out` argument; none of them is meant for per-frame use (call on enter / on
// change). Dates are local days from profile.today() (the dev clock profile.setToday applies here too); ms timings (pass,
// piggy pill, Reopen rest) use wallet.now() (dev offset: wallet.setNow(ms)). A date stored in the future (the device
// clock went back) never pays twice: the VIP token, the gift, the daily and the offer caps compare with < / >=.
//
// Delivery of a NON-CONSUMABLE (grantTx): the one-time extras (the Starter's gems + boosters, the Pro Pack's gems, the
// gem refund of items bought with gems, the Gold Star Road payback) are decided from the transaction, never from its age.
// payments marks every purchase it starts on THIS device (wallet.buyStarted(productId) right before the store sheet,
// wallet.buyEnded(productId, status) after it; a 'pending' Ask to Buy keeps its mark) and hands grantTx the delivery's
// source ('purchase' | 'update' | 'boot'), purchaseDate, signedDate (iap.storeTimes: when the App Store signed it) and
// originalTransactionId. A transaction this wallet has never processed and does not already own the product for is FULL
// when it is this device's own (marked, or the buy call's own result) AND new: first judged on the App Store's clock
// alone (signedDate within TUNE.storeFreshMs of purchaseDate: the store just created it; a re-download copy of an old
// purchase is signed long after it), so a device clock set days ahead cannot cost a buyer the extras; without a signed
// date, a purchaseDate not older than the mark (minus a day of clock slack), or the buy call's own result with no mark.
// Content + owned flag only for a restore (opts.restore / source 'restore'), a re-download copy (originalTransactionId
// differs from the id), a marked purchase whose store dates show an old purchase (StoreKit handing one back for free),
// and an 'update' / 'boot' delivery with no mark of this device (another iPhone / iPad on the same Apple ID: StoreKit
// delivers its transactions through Transaction.updates). So an unfinished purchase delivered days later (the app was
// killed after the sheet, Ask to Buy approved late) still pays everything, and a second device or a re-download gets
// content + flag only. The owned sync never swallows this device's purchase: an entitlement of a product with an open
// mark (Ask to Buy approved while Restore ran, an unfinished purchase the boot delivery missed) is delivered by this rule
// (restoreOwned -> grantTx), so the later unfinished / updates delivery of the same id is only a ledger duplicate. A mark
// lives TUNE.markMs; one stamped in the future (the clock went back while a purchase waited) is kept and restamped to now
// at load, never dropped. A product whose purchase was refunded (wallet.revokeTx) never pays its gems / boosters again.
// Refunds (a revoked transaction this wallet's ledger granted, wallet.revokeTx): the owned flag goes (VIP perks with it)
// and so do the items it gave that no other owned product holds; gems, boosters and items bought with gems stay.
// Paid booster grants never vanish at the 99 cap: what would go past it is paid as gems at the single price.
import { save } from '../core/save.js';
import { i18n } from '../core/i18n.js';
import { profile } from './profile.js';
import { SPECIES, nightParams } from './data.js';
import { SLOTS, DEFAULTS, OUTFIT_THEMES, SET_LOOK, BOOSTER_IDS, BOOSTERS, REOPEN, EARN, STREAK, STAR_ROAD, MEDALS, GIFT, PIGGY, PASS,
  VIP, OFFERS, FIRST_BUY, GOLD_ROAD, NON_CONSUMABLE, itemById, setItems, productById, firstBuyPack, selfTest as catalogSelfTest } from './catalog.js';
import { DICT as DICT_ECONOMY } from './strings-economy.js';
export * from './catalog.js';
i18n.load(DICT_ECONOMY);          // the economy's own words (new keys only), wherever the wallet is loaded

// ================================================================ wallet (§11.3)
const TUNE = {
  ns: 'mbouncer.', key: 'wallet', version: 1,
  ledgerMax: 300,                 // newest processed transaction ids kept
  markMs: 30 * 86400000,          // a purchase this device started (wallet.buyStarted) is remembered this long
  markSlackMs: 86400000,          // clock slack between the mark (device clock) and the store's purchaseDate
  storeFreshMs: 15 * 60000,       // App Store clock: a transaction signed this soon after its purchaseDate is a new purchase
  piggyHoldMs: 86400000,          // a pending piggy purchase (Ask to Buy) holds the piggy buy button this long
  starterPillGapMs: 86400000,     // the Starter news pill never shows within this long of any purchase
  maxGems: 1e9, maxCount: 1e9,
  mirror: { key: 'mbouncer.wallet', debounceMs: 400, timeoutMs: 2500, webkitMs: 1500 },
  medalsSeen: 0,
};
const DAY_MS = 86400000, HOUR_MS = 3600000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NO = {};
const NOLIST = Object.freeze([]);
const PAID_SRC = { iap: 1, piggy: 1, pass: 1 };              // gems from money (life.bought); everything else is earned
const MEDAL_IDS = {};
for (let i = 0; i < MEDALS.length; i++) MEDAL_IDS[MEDALS[i].id] = MEDALS[i];

let D = null;                     // the live wallet
let storeKey = TUNE.key;
let lastRev = -1;                 // the stored rev this tab last read or wrote
let clockOffset = 0;              // dev: wallet.setNow
const listeners = [];
const ARM = { slowmo: false, second: false };                 // armed for the next story run (never saved)
// reopens: every Reopen of the run (the cap of 3); paidReopens: the paid ones (the 30 / 60 / 120 ladder: the free first
// Reopen ever does not climb it)
const RUN = { key: 0, open: false, night: 0, mode: '', slowmo: false, second: false, boosted: false, reopens: 0, paidReopens: 0,
  used: { xray: false, slowmo: false, second: false } };
const SESSION = { modal: 0, lastAt: 0, shown: 0 };             // offer caps of this app session
const RES = { ok: false, reason: '', price: 0 };              // reused result of buyItem / buySet / buyBooster
const XRAY_NIGHT = new Map();                                  // night -> data says it can have liars (boosterShown cache)
let runSeq = 0;
let lastOutcome = null, lastReward = null;

function now() { return Date.now() + clockOffset; }
function today() { return profile.today(); }
function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
function intIn(v, lo, hi, def) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v !== '' ? Number(v) : NaN);
  if (!(n === n) || !isFinite(n)) return def;
  const r = Math.floor(n);
  return r < lo ? lo : (r > hi ? hi : r);
}
function dateOr(v, def) { return typeof v === 'string' && DATE_RE.test(v) && profile.validDate(v) ? v : def; }
function boosterSet(xray, slowmo, second) { return { xray: xray, slowmo: slowmo, second: second }; }

function defaults() {
  const outfit = {};
  for (let i = 0; i < SPECIES.length; i++) outfit[SPECIES[i]] = '';
  return {
    v: TUNE.version, rev: 0, created: 0,
    gems: 0,
    life: { earned: 0, bought: 0, spent: 0 },
    owned: {},
    equip: { club: DEFAULTS.club, rope: DEFAULTS.rope, door: DEFAULTS.door, plate: DEFAULTS.plate, outfit: outfit },
    boosters: boosterSet(0, 0, 0),
    vipDay: '',
    reopen: { firstUsed: false, declines: 0, restUntil: 0 },
    // gold: Gold Star Road steps paid; endlessDay: the local date the All-Nighter's daily gems were paid
    paid: { stars: 0, nights: 0, golds: 0, daily: '', band: {}, looks: {}, streak: 0, road: 0, medals: {}, gold: 0, endlessDay: '' },
    stats: { busted: 0, shift: 0, quick: 0, dailies: 0, comboBest: 0, streakBest: 0 },
    piggy: { gems: 0, seeded: false, breaks: 0, fullAt: 0 },
    // ahead: bought with the device clock over a day past the store's purchaseDate (only then may a clock fixed later move
    // the pass to start now); runDay / run: the last local date the app was opened while the pass delivered, and how
    // many days in a row that makes (the PASS.run bonus)
    pass: { start: 0, until: 0, paidDays: 0, ahead: false, runDay: '', run: 0 },
    gift: { day: '', n: 0 },
    purchases: [],
    iapLedger: {},
    firstBuy: {},                  // gem pack id -> 1 once its first (x2) purchase was paid (same save as the ledger)
    buying: {},                    // product id -> ms: a purchase this device started and the store has not delivered yet
    refunded: {},                  // non-consumable id -> 1: a purchase of it was refunded (its extras are never paid again)
    lastBuyAt: 0,                  // ms of the last full paid grant (the Starter news pill keeps away after a purchase)
    // starterAt: when the Starter popup was shown; starterShut: a Shut Down on night OFFERS.starterPill.night+ happened;
    // starterPill: the one extra Starter news pill was shown; piggyShows: full-piggy pills shown since the last break
    offers: { starter: false, vipDay: '', vipDismiss: 0, piggyAt: 0, day: '', n: 0, passEnded: 0, roadSeen: 0,
      starterAt: 0, starterShut: false, starterPill: false, piggyShows: 0 },
  };
}
// a brand-new wallet: the welcome grant (50 gems + 1 of each booster) and the piggy's welcome fill (PIGGY.start), once
function created() {
  const d = defaults();
  d.created = now();
  d.gems = EARN.welcome.gems; d.life.earned = EARN.welcome.gems;
  const W = EARN.welcome.boosters;
  d.boosters.xray = W.xray; d.boosters.slowmo = W.slowmo; d.boosters.second = W.second;
  d.piggy.gems = PIGGY.start; d.piggy.seeded = true;
  return d;
}

// field by field onto fresh defaults, so an older or damaged save always loads (v1 schema; future versions migrate here)
function sanitize(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  const M = TUNE.maxCount;
  d.rev = intIn(raw.rev, 0, 1e15, 0);
  d.created = intIn(raw.created, 0, 1e15, 0);
  d.gems = intIn(raw.gems, 0, TUNE.maxGems, 0);
  const L = isObj(raw.life) ? raw.life : NO;
  d.life.earned = intIn(L.earned, 0, 1e15, 0); d.life.bought = intIn(L.bought, 0, 1e15, 0); d.life.spent = intIn(L.spent, 0, 1e15, 0);
  if (isObj(raw.owned)) {
    for (const k in raw.owned) {
      const it = itemById(k), v = raw.owned[k];
      if (it && it.via !== 'default' && (v === 'gems' || v === 'iap' || v === 'free')) d.owned[k] = v;
    }
  }
  const E = isObj(raw.equip) ? raw.equip : NO;
  for (let i = 0; i < SLOTS.length; i++) {
    const s = SLOTS[i];
    if (s === 'outfit') continue;
    const it = itemById(E[s]);
    if (it && it.slot === s) d.equip[s] = it.id;
  }
  const EO = isObj(E.outfit) ? E.outfit : NO;
  for (let i = 0; i < SPECIES.length; i++) {
    const sp = SPECIES[i], it = itemById(EO[sp]);
    if (it && it.slot === 'outfit' && it.species === sp) d.equip.outfit[sp] = it.id;
  }
  const B = isObj(raw.boosters) ? raw.boosters : NO;
  for (let i = 0; i < BOOSTER_IDS.length; i++) d.boosters[BOOSTER_IDS[i]] = intIn(B[BOOSTER_IDS[i]], 0, BOOSTERS.cap, 0);
  d.vipDay = dateOr(raw.vipDay, '');
  const R = isObj(raw.reopen) ? raw.reopen : NO;
  d.reopen.firstUsed = R.firstUsed === true; d.reopen.declines = intIn(R.declines, 0, 99, 0); d.reopen.restUntil = intIn(R.restUntil, 0, 1e15, 0);
  const P = isObj(raw.paid) ? raw.paid : NO;
  d.paid.stars = intIn(P.stars, 0, M, 0); d.paid.nights = intIn(P.nights, 0, M, 0); d.paid.golds = intIn(P.golds, 0, M, 0);
  d.paid.daily = dateOr(P.daily, '');
  d.paid.streak = intIn(P.streak, 0, M, 0); d.paid.road = intIn(P.road, 0, M, 0);
  d.paid.gold = intIn(P.gold, 0, M, 0); d.paid.endlessDay = dateOr(P.endlessDay, '');
  if (isObj(P.band)) for (let i = 0; i < SPECIES.length; i++) if (P.band[SPECIES[i]]) d.paid.band[SPECIES[i]] = 1;
  if (isObj(P.looks)) {
    for (const k in P.looks) {
      const dot = k.indexOf('.'), sp = dot > 0 ? k.slice(0, dot) : '', col = dot > 0 ? k.slice(dot + 1) : '';
      if (P.looks[k] && SPECIES.indexOf(sp) >= 0 && profile.looks(sp).indexOf(col) > 0) d.paid.looks[k] = 1;
    }
  }
  if (isObj(P.medals)) for (const k in P.medals) if (P.medals[k] && MEDAL_IDS[k]) d.paid.medals[k] = 1;
  const S = isObj(raw.stats) ? raw.stats : NO;
  d.stats.busted = intIn(S.busted, 0, M, 0); d.stats.shift = intIn(S.shift, 0, M, 0); d.stats.quick = intIn(S.quick, 0, M, 0);
  d.stats.dailies = intIn(S.dailies, 0, M, 0); d.stats.comboBest = intIn(S.comboBest, 0, M, 0); d.stats.streakBest = intIn(S.streakBest, 0, M, 0);
  const G = isObj(raw.piggy) ? raw.piggy : NO;
  d.piggy.gems = intIn(G.gems, 0, PIGGY.cap, 0); d.piggy.seeded = G.seeded === true; d.piggy.breaks = intIn(G.breaks, 0, M, 0);
  d.piggy.fullAt = intIn(G.fullAt, 0, 1e15, 0);
  const A = isObj(raw.pass) ? raw.pass : NO;
  d.pass.start = intIn(A.start, 0, 1e15, 0); d.pass.until = intIn(A.until, 0, 1e15, 0);
  if (d.pass.until < d.pass.start) d.pass.until = d.pass.start;
  d.pass.paidDays = intIn(A.paidDays, 0, passTotal(d.pass), 0);
  d.pass.ahead = A.ahead === true; d.pass.runDay = dateOr(A.runDay, ''); d.pass.run = intIn(A.run, 0, 36500, 0);
  const F = isObj(raw.gift) ? raw.gift : NO;
  d.gift.day = dateOr(F.day, ''); d.gift.n = intIn(F.n, 0, M, 0);
  if (Array.isArray(raw.purchases)) {
    for (let i = 0; i < raw.purchases.length; i++) {
      const id = raw.purchases[i];
      if (NON_CONSUMABLE.indexOf(id) >= 0 && d.purchases.indexOf(id) < 0) d.purchases.push(id);
    }
  }
  if (isObj(raw.iapLedger)) {
    const keys = Object.keys(raw.iapLedger), from = Math.max(0, keys.length - TUNE.ledgerMax);
    for (let i = from; i < keys.length; i++) { const v = raw.iapLedger[keys[i]]; if (typeof v === 'string' && keys[i]) d.iapLedger[keys[i]] = v; }
  }
  if (isObj(raw.firstBuy)) for (const k in raw.firstBuy) { if (raw.firstBuy[k] && firstBuyPack(k)) d.firstBuy[k] = 1; }
  if (isObj(raw.buying)) {
    for (const k in raw.buying) { const t = intIn(raw.buying[k], 0, 1e15, 0); if (t > 0 && productById(k)) d.buying[k] = t; }
  }
  if (isObj(raw.refunded)) for (const k in raw.refunded) { if (raw.refunded[k] && NON_CONSUMABLE.indexOf(k) >= 0) d.refunded[k] = 1; }
  d.lastBuyAt = intIn(raw.lastBuyAt, 0, 1e15, 0);
  const O = isObj(raw.offers) ? raw.offers : NO;
  d.offers.starter = O.starter === true; d.offers.vipDay = dateOr(O.vipDay, ''); d.offers.vipDismiss = intIn(O.vipDismiss, 0, 99, 0);
  d.offers.piggyAt = intIn(O.piggyAt, 0, 1e15, 0); d.offers.day = dateOr(O.day, ''); d.offers.n = intIn(O.n, 0, 99, 0);
  d.offers.passEnded = intIn(O.passEnded, 0, 1e15, 0); d.offers.roadSeen = intIn(O.roadSeen, 0, M, 0);
  d.offers.starterAt = intIn(O.starterAt, 0, 1e15, 0); d.offers.starterShut = O.starterShut === true;
  d.offers.starterPill = O.starterPill === true; d.offers.piggyShows = intIn(O.piggyShows, 0, 99, 0);
  d.v = TUNE.version;
  return d;
}

// ---- storage (the 'mbouncer.' namespace is swapped in only around our own reads/writes)
function readRaw() {
  const prev = save.ns;
  save.ns = TUNE.ns;
  try { return save.get(storeKey, null); } finally { save.ns = prev; }
}
function writeRaw(val) {
  const prev = save.ns;
  save.ns = TUNE.ns;
  try { save.set(storeKey, val); } finally { save.ns = prev; }
}
function delRaw() {
  const prev = save.ns;
  save.ns = TUNE.ns;
  try { save.del(storeKey); } finally { save.ns = prev; }
}
function revOf(raw) { return isObj(raw) ? intIn(raw.rev, 0, 1e15, 0) : -1; }

function load() {
  let raw = null;
  try { raw = readRaw(); } catch (e) { raw = null; }
  if (!isObj(raw)) {
    D = created();
    D.rev = Math.max(0, revOf(raw)) + 1;
    writeRaw(D);
    lastRev = D.rev;
    queueNative();
    settleOnLoad();
    return D;
  }
  D = sanitize(raw);
  lastRev = revOf(raw);
  if (!D.piggy.seeded) {                                       // a wallet from before the piggy: its welcome fill, once
    D.piggy.gems = Math.min(PIGGY.cap, Math.max(D.piggy.gems, PIGGY.start)); D.piggy.seeded = true;
    commit('piggy');
  }
  settleOnLoad();
  return D;
}
// on every load: drops expired purchase marks, restamps marks from the future and pays the Doorman Medals whose goal the
// progress already meets (a save whose progress predates the wallet would otherwise show a full bar with no check until
// its next result). A mark stamped in the future means the clock went back while a purchase of this device waited (Ask
// to Buy): it is kept (its approval must still pay in full) and restamped to now, so it lives TUNE.markMs from here and
// the piggy hold does not stretch over the clock's jump
function settleOnLoad() {
  let dirty = false;
  const t = now();
  for (const k in D.buying) {
    const m = D.buying[k];
    if (!(m > t - TUNE.markMs)) { delete D.buying[k]; dirty = true; }
    else if (m > t + TUNE.markSlackMs) { D.buying[k] = t; dirty = true; }
  }
  let g = 0;
  if (pairedKeys()) {
    const P = D.paid.medals;
    for (let i = 0; i < MEDALS.length; i++) {
      const m = MEDALS[i];
      if (P[m.id] || statValue(m.stat) < m.goal) continue;
      P[m.id] = 1;
      g += m.gems;
    }
  }
  if (g > 0) { addG(g, 'medal'); dirty = true; }
  if (dirty) commit(g > 0 ? 'gems' : '');
}
function data() { if (!D) load(); return D; }
// before every mutation: another tab (or the native mirror) wrote since we last read -> adopt its copy, then apply our delta
function fresh() {
  if (!D) { load(); return; }
  let raw = null;
  try { raw = readRaw(); } catch (e) { raw = null; }
  const rev = revOf(raw);
  if (rev >= 0 && rev !== lastRev) { D = sanitize(raw); lastRev = rev; }
  else if (rev < 0 && lastRev >= 0) { D.rev = Math.max(D.rev, lastRev); }   // our key was removed (storage cleared): rewrite ours
}
function commit(what) {
  D.rev = Math.max(D.rev, lastRev) + 1;
  writeRaw(D);
  lastRev = D.rev;
  queueNative();
  if (what) notify(what);
}
function notify(what) {
  for (let i = 0; i < listeners.length; i++) {
    try { listeners[i](what); } catch (e) { console.error('[wallet] onChange listener failed', e); }
  }
}
function onStorage(e) {
  if (!D || !e || e.key !== TUNE.ns + storeKey || typeof e.newValue !== 'string') return;
  let raw = null;
  try { raw = JSON.parse(e.newValue); } catch (err) { return; }
  if (!isObj(raw)) return;
  D = sanitize(raw); lastRev = revOf(raw);
  notify('all');
}

// ---- native mirror (Capacitor Preferences; off on the web and when the plugin is missing)
const MIR = { ok: false, timer: 0, dirty: false, job: Promise.resolve(false), has: '', hydrated: false, hydrating: null };
function prefs() {
  try {
    const C = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
    const P = C.Plugins && C.Plugins.Preferences;
    return P && typeof P.get === 'function' && typeof P.set === 'function' ? P : null;
  } catch (e) { return null; }
}
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }
function within(p, ms) { return Promise.race([Promise.resolve(p), wait(ms).then(() => { throw new Error('timeout'); })]); }
function mirrorKey() { return storeKey === TUNE.key ? TUNE.mirror.key : TUNE.ns + storeKey; }
function queueNative() {
  if (!MIR.ok) return;
  MIR.dirty = true;
  if (!MIR.timer) MIR.timer = setTimeout(flushNative, TUNE.mirror.debounceMs);
}
// writes the latest wallet to native storage now -> true once the native side holds it (or a newer copy)
function flushNative() {
  clearTimeout(MIR.timer); MIR.timer = 0;
  const P = MIR.ok ? prefs() : null;
  if (!P || !D) return Promise.resolve(false);
  let json = '';
  try { json = JSON.stringify(D); } catch (e) { return Promise.resolve(false); }
  if (!MIR.dirty && MIR.has === json) return Promise.resolve(true);
  MIR.dirty = false;
  const key = mirrorKey();
  MIR.job = MIR.job.catch(() => false)
    .then(() => within(P.set({ key: key, value: json }), TUNE.mirror.timeoutMs))
    .then(() => { MIR.has = json; return true; }, () => { MIR.dirty = true; return false; });
  return MIR.job;
}
async function hydrateNative() {
  const P = prefs();
  if (!P) return false;
  let rawStr = null;
  try {
    const r = await within(P.get({ key: mirrorKey() }), TUNE.mirror.timeoutMs);
    rawStr = r && typeof r.value === 'string' && r.value ? r.value : null;
  } catch (e) { return false; }                               // plugin missing or not answering: localStorage only
  MIR.ok = true;
  let s = null;
  if (rawStr) { try { s = JSON.parse(rawStr); } catch (e) { s = null; } }
  data();
  if (isObj(s) && revOf(s) > D.rev) {
    D = sanitize(s);
    writeRaw(D); lastRev = D.rev;                              // the working copy back in place (same rev)
    MIR.has = rawStr;
    notify('all');
    return true;
  }
  MIR.dirty = true; flushNative();                             // first launch with the mirror, or it lagged
  return false;
}
try {
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushNative(); });
    window.addEventListener('pagehide', () => { flushNative(); });
  }
} catch (e) { /* no DOM */ }

// ---- internal mutators (inside a fresh() ... commit() bracket)
function addG(n, src) {
  n = intIn(n, 0, TUNE.maxGems, 0);
  if (n <= 0) return 0;
  D.gems = Math.min(TUNE.maxGems, D.gems + n);
  if (PAID_SRC[src]) D.life.bought += n; else D.life.earned += n;
  return n;
}
// adds a booster set up to the 99 cap; what would go past the cap is paid as gems at the single price (source `src`),
// so a granted booster never silently vanishes -> the overflow gems added
function addB(set, into, src) {
  if (!set) return 0;
  let over = 0;
  for (let i = 0; i < BOOSTER_IDS.length; i++) {
    const id = BOOSTER_IDS[i], n = intIn(set[id], 0, 999, 0);
    if (n <= 0) continue;
    const before = D.boosters[id], room = Math.max(0, BOOSTERS.cap - before), k = n < room ? n : room;
    D.boosters[id] = before + k;
    if (into) into[id] += k;
    if (n > k) over += (n - k) * BOOSTERS[id].gems;
  }
  return over > 0 ? addG(over, src || 'refund') : 0;
}
// how many boosters of `set` would go past the cap right now (the shop's warning before a booster purchase)
function overflowOf(set) {
  if (!set) return 0;
  let n = 0;
  for (let i = 0; i < BOOSTER_IDS.length; i++) {
    const id = BOOSTER_IDS[i], k = intIn(set[id], 0, 999, 0);
    if (k > 0) n += Math.max(0, D.boosters[id] + k - BOOSTERS.cap);
  }
  return n;
}
function hasVip() { return data().purchases.indexOf('mb_vip_rope') >= 0; }
function ownsIn(id) {
  const it = itemById(id);
  if (!it) return false;
  if (it.via === 'default') return true;
  if (it.via === 'vip' && hasVip()) return true;
  return !!D.owned[id];
}
// grants an item for free (Star Road): its gem price comes back as gems when it is already owned -> gems paid instead
function grantFree(id, items) {
  const it = itemById(id);
  if (!it) return 0;
  if (ownsIn(id)) return it.gems ? addG(it.gems, 'road') : 0;
  D.owned[id] = 'free';
  items.push(id);
  return 0;
}
// an item bought with money (a content purchase, the Gold Star Road): owned as 'iap'; on a full grant an item the player
// already bought with gems (or got free) pays its gem price back as gems once ('refund') -> the gems paid back
function grantPaidItem(id, items, full) {
  const it = itemById(id);
  if (!it || it.via === 'default') return 0;
  const via = D.owned[id];
  if (!via && !(it.via === 'vip' && hasVip())) { D.owned[id] = 'iap'; items.push(id); return 0; }
  if (full && (via === 'gems' || via === 'free') && it.gems) { D.owned[id] = 'iap'; return addG(it.gems, 'refund'); }
  return 0;
}
function trimLedger() {
  const L = D.iapLedger, ks = Object.keys(L);
  for (let i = 0; i < ks.length - TUNE.ledgerMax; i++) delete L[ks[i]];
}
function passTotal(p) { return p.until > p.start ? Math.round((p.until - p.start) / DAY_MS) : 0; }
// storeMs: the store's purchaseDate (ms, 0 = unknown). A device clock more than a day past it marks the pass `ahead`
function passGrantIn(days, storeMs) {
  const n = now(), P = D.pass, add = intIn(days, 1, 3650, PASS.days) * DAY_MS;
  if (P.until > n) P.until += add;                            // buying again adds 30 days of deliveries
  else { P.start = n; P.until = n + add; P.paidDays = 0; P.ahead = storeMs > 0 && n - storeMs > DAY_MS; }
}
// pays every accrued, unpaid pass day (missed days included) and the run bonus of today's open -> fills `out`
// { days, gems (run bonus included), boosters, bonus, run } and returns the days paid
function passSettleIn(out) {
  const P = D.pass;
  if (!P.until) return 0;
  const n = now();
  if (n < P.start) {
    // before the pass's start: only a pass BOUGHT with the clock set forward (P.ahead: over a day past the store's own
    // purchaseDate) moves to start now once the clock is fixed (its days and paid days kept), so its deliveries follow
    // real time instead of waiting for the wrong date. A clock merely moved back after a normal purchase waits: moving
    // start back with it would pay the skipped days at once when the clock returns
    if (!P.ahead || n >= P.start - DAY_MS) return 0;
    const shift = P.start - n;
    P.start = n; P.until -= shift; P.ahead = false;
  }
  const total = passTotal(P);
  const accrued = Math.min(total, Math.floor((Math.min(n, P.until) - P.start) / DAY_MS) + 1);
  const owed = accrued - P.paidDays;
  if (owed > 0) {
    const gift = boosterSet(0, 0, 0);
    for (let day = P.paidDays; day < accrued; day++) gift[PASS.rotate[day % PASS.rotate.length]]++;
    P.paidDays = accrued;
    const g = addG(PASS.gems * owed, 'pass') + addB(gift, out.boosters, 'pass');
    out.days += owed; out.gems += g;
  }
  passRunIn(out, owed > 0 || passLeftIn(P, n) > 0);
  return owed > 0 ? owed : 0;
}
// the Club Pass run: the first open of a local day while the pass delivers (`live`) counts that day; PASS.run.from days in
// a row pay PASS.run.gems that day. A missed day restarts the run at 1 (never a forfeit: missed deliveries still arrive);
// a runDay in the future (the clock went back) waits for the real date to pass it
function passRunIn(out, live) {
  const P = D.pass, t = today();
  if (!live || (P.runDay && P.runDay >= t)) { out.run = passRunNow(P, t); return 0; }
  P.run = P.runDay && profile.addDays(P.runDay, 1) === t ? P.run + 1 : 1;
  P.runDay = t;
  out.run = P.run;
  if (P.run < PASS.run.from) return 0;
  const g = addG(PASS.run.gems, 'pass');
  out.bonus += g; out.gems += g;
  return g;
}
// the run as of local date t: counted today or yesterday, else broken (0)
function passRunNow(P, t) {
  if (!P.runDay || !P.run) return 0;
  return P.runDay >= t || profile.addDays(P.runDay, 1) === t ? P.run : 0;
}
function passOut(boosters) { return { days: 0, gems: 0, boosters: boosters || boosterSet(0, 0, 0), bonus: 0, run: 0 }; }
// the days of deliveries still to come, today counted while today's delivery is paid; 0 once every day is paid (a clock
// moved forward and back cannot show days that will never arrive) or the pass ran out
function passLeftIn(P, n) {
  const total = passTotal(P);
  if (!P.until || P.paidDays >= total || n >= P.until) return 0;
  const accrued = n < P.start ? 0 : Math.min(total, Math.floor((Math.min(n, P.until) - P.start) / DAY_MS) + 1);
  return total - P.paidDays + (accrued > 0 && accrued <= P.paidDays ? 1 : 0);
}
function piggyAddIn(n) {
  const before = D.piggy.gems;
  D.piggy.gems = Math.min(PIGGY.cap, before + n);
  if (D.piggy.gems >= PIGGY.cap && before < PIGGY.cap) D.piggy.fullAt = now();
  return D.piggy.gems - before;
}
// a break: every gem in the piggy; a bought break (mb_piggy_break) always pays at least minBreak (two Ask to Buy
// purchases approved together, or a pot emptied another way, still deliver what was paid for)
function piggyBreakIn(bought) {
  const g = bought ? Math.max(D.piggy.gems, PIGGY.minBreak) : D.piggy.gems;
  D.piggy.gems = 0; D.piggy.breaks++; D.piggy.fullAt = 0;
  D.offers.piggyShows = 0; D.offers.piggyAt = 0;
  return addG(g, 'piggy');
}
function purchasedIn(id) { return D.purchases.indexOf(id) >= 0; }
function dateMs(v) {
  if (v === undefined || v === null || v === '') return 0;
  const t = typeof v === 'number' ? v : Date.parse(String(v));
  return t === t && isFinite(t) && t > 0 ? t : 0;
}
// a purchase of productId this device started (payments: wallet.buyStarted) and the store has not delivered yet -> ms | 0
function markAt(productId) {
  const t = D.buying[productId];
  return t > 0 && t > now() - TUNE.markMs ? t : 0;
}
// the App Store's clock alone says this transaction is new: signed (o.signedDate, iap.storeTimes) within
// TUNE.storeFreshMs of its purchaseDate. A re-download / restore copy of an old purchase is signed long after it
function storeFresh(o) {
  const s = dateMs(o.signedDate), b = dateMs(o.purchaseDate);
  return s > 0 && b > 0 && s >= b - 60000 && s - b < TUNE.storeFreshMs;
}
// may this delivery of a non-consumable pay its one-time extras (gems, boosters, refunds, the Gold Star Road payback)?
// From the transaction itself, never from its age (see the header): restore and re-download copies never; a product
// refunded before never pays its gems / boosters again; an unmarked 'update' / 'boot' delivery = another device's
// purchase, never. This device's own (a mark, or the buy call's result: mine): new by the App Store's own times
// (storeFresh: the device clock cannot move it), else a store purchaseDate not older than the mark, else (the buy
// call's result with no mark) yes; otherwise (a dev / test grant without a source) yes
function fullGrant(p, txId, o) {
  if (o.restore === true || o.source === 'restore') return false;
  const orig = o.originalTransactionId !== undefined ? o.originalTransactionId : o.originalId;
  if (orig !== undefined && orig !== null && orig !== '' && String(orig) !== txId) return false;
  if (o.mine === false) return false;
  if (D.refunded[p.id] && (p.gems > 0 || !!p.boosters)) return false;
  const at = markAt(p.id);
  if (at <= 0 && o.mine !== true) return !(o.source === 'update' || o.source === 'boot');
  if (storeFresh(o)) return true;
  if (at > 0) { const when = dateMs(o.purchaseDate); return !when || when >= at - TUNE.markSlackMs; }
  return true;
}
// the Gold Star Road reward items of the steps already paid (k < paid.gold) that are not owned any more (taken back by a
// refund) come back as 'iap' (no gems: those steps were paid once) -> the item ids into `items`
function goldBackIn(items) {
  let n = 0;
  const T = GOLD_ROAD.steps, m = Math.min(D.paid.gold, T.length);
  for (let k = 0; k < m; k++) {
    const id = T[k].item;
    if (id && itemById(id) && !ownsIn(id)) { D.owned[id] = 'iap'; items.push(id); n++; }
  }
  return n;
}
// is this item still held through an owned money product other than `skip` (its items, or a Gold Star Road step already
// paid while the Gold Star Road is owned)?
function heldElsewhere(id, skip) {
  for (let i = 0; i < D.purchases.length; i++) {
    const q = productById(D.purchases[i]);
    if (!q || q.id === skip) continue;
    if (q.kind === 'goldroad') {
      const T = GOLD_ROAD.steps, m = Math.min(D.paid.gold, T.length);
      for (let k = 0; k < m; k++) if (T[k].item === id) return true;
    } else if (q.kind !== 'vip' && q.items && q.items.indexOf(id) >= 0) return true;
  }
  return false;
}

// ---- earning (onResult) helpers
function liveStars() { return Math.max(D.paid.stars, profile.data.stars); }
function statValue(stat) {
  const S = D.stats;
  if (stat === 'passed') return Math.max(D.paid.nights, profile.nextNight() - 1);
  if (stat === 'nights') return Math.max(D.paid.nights, profile.nextNight() - 1) + 1;
  if (stat === 'golds') return Math.max(D.paid.golds, profile.data.golds);
  if (stat === 'band') { let n = 0; for (let i = 0; i < SPECIES.length; i++) if (D.paid.band[SPECIES[i]] || profile.data.bandUnlocked[SPECIES[i]]) n++; return n; }
  if (stat === 'looks') {
    let n = 0;
    for (let i = 0; i < SPECIES.length; i++) {
      const sp = SPECIES[i], L = profile.looks(sp), own = profile.looksOwned(sp);
      let paidLooks = 0;
      for (let j = 1; j < L.length; j++) if (D.paid.looks[sp + '.' + L[j]]) paidLooks++;
      n += Math.max(own, (D.paid.band[sp] ? 1 : 0) + paidLooks);
    }
    return n;
  }
  if (stat === 'busted') return S.busted;
  if (stat === 'shift') return S.shift;
  if (stat === 'quick') return S.quick;
  if (stat === 'combo') return S.comboBest;
  if (stat === 'dailies') return S.dailies;
  if (stat === 'endless') return profile.endlessBest;
  return 0;
}
// the Star Road step k (0-based): the table, then every STAR_ROAD.every stars after STAR_ROAD.after
const ROAD_EXTRA = { stars: 0, gems: STAR_ROAD.gems };
function roadStep(k) {
  const T = STAR_ROAD.steps;
  if (k < T.length) return T[k];
  ROAD_EXTRA.stars = STAR_ROAD.after + STAR_ROAD.every * (k - T.length + 1);
  return ROAD_EXTRA;
}
function newReward() {
  return { gems: 0, base: 0, vipBonus: 0, vipMiss: 0, piggy: 0, vipPiggy: 0, items: [], medals: [], streakDays: 0, roadSteps: 0, goldSteps: 0,
    boosters: boosterSet(0, 0, 0),
    lines: { stars: 0, pass: 0, gold: 0, daily: 0, band: 0, looks: 0, streak: 0, road: 0, goldRoad: 0, medals: 0, endless: 0 } };
}
function frozen(o) { for (const k in o) if (o[k] && typeof o[k] === 'object') frozen(o[k]); return Object.freeze(o); }
const EMPTY_REWARD = frozen(newReward());
// the four "gems from nights" rows (stars, first passes, new Golds, the counted daily) against the high-water marks;
// VIP doubles exactly these
function payNightRows(R, dailyDate) {
  const P = D.paid, E = EARN, d = profile.data;
  const stars = d.stars, passed = Math.max(0, profile.nextNight() - 1), golds = d.golds;
  if (stars > P.stars) { R.lines.stars = (stars - P.stars) * E.perStar; P.stars = stars; }
  if (passed > P.nights) { R.lines.pass = (passed - P.nights) * E.firstPass; P.nights = passed; }
  if (golds > P.golds) { R.lines.gold = (golds - P.golds) * E.newGold; P.golds = golds; }
  if (dailyDate && dailyDate > P.daily) { R.lines.daily = E.dailyPlayed; P.daily = dailyDate; D.stats.dailies++; }
  R.base = R.lines.stars + R.lines.pass + R.lines.gold + R.lines.daily;
  if (R.base > 0 && hasVip()) R.vipBonus = R.base * (E.vipMult - 1);
  else R.vipMiss = R.base * (E.vipMult - 1);                  // what VIP would have added tonight (the VIP card)
  R.gems += addG(R.base + R.vipBonus, 'night');
}
function payBandAndLooks(R) {
  const P = D.paid, d = profile.data;
  for (let i = 0; i < SPECIES.length; i++) {
    const sp = SPECIES[i];
    if (!d.bandUnlocked[sp]) continue;
    if (!P.band[sp]) { P.band[sp] = 1; R.lines.band += EARN.band; }
    const L = profile.looks(sp), own = profile.looksOwned(sp);
    for (let j = 1; j < own && j < L.length; j++) {
      const key = sp + '.' + L[j];
      if (!P.looks[key]) { P.looks[key] = 1; R.lines.looks += EARN.look; }
    }
  }
  R.gems += addG(R.lines.band, 'band') + addG(R.lines.looks, 'look');
}
function payMedals(R) {
  const P = D.paid.medals;
  for (let i = 0; i < MEDALS.length; i++) {
    const m = MEDALS[i];
    if (P[m.id] || statValue(m.stat) < m.goal) continue;
    P[m.id] = 1;
    R.medals.push(m.id);
    R.lines.medals += m.gems;
  }
  R.gems += addG(R.lines.medals, 'medal');
}
function payRoad(R) {
  const stars = liveStars();
  for (;;) {
    const s = roadStep(D.paid.road);
    if (stars < s.stars) break;
    D.paid.road++;
    R.roadSteps++;
    let g = 0;
    if (s.gems) g += addG(s.gems, 'road');
    if (s.boosters) g += addB(s.boosters, R.boosters, 'road');
    if (s.item) g += grantFree(s.item, R.items);
    if (s.set) { const L = setItems(s.set); for (let i = 0; i < L.length; i++) g += grantFree(L[i], R.items); }
    R.lines.road += g;
    R.gems += g;
  }
  if (goldOwned()) {
    const G = payGoldIn(R.items, R.boosters, true);
    R.goldSteps += G.steps; R.lines.goldRoad += G.gems; R.lines.road += G.gems; R.gems += G.gems;
  }
}
// ---- the Gold Star Road (mb_gold_road): step k pairs with the free road's step k; after the table, `every` per step
const GOLD_EXTRA = { gems: GOLD_ROAD.every.gems };
function goldStep(k) { return k < GOLD_ROAD.steps.length ? GOLD_ROAD.steps[k] : GOLD_EXTRA; }
function goldOwned() { return purchasedIn(GOLD_ROAD.product); }
const GOLD_OUT = { steps: 0, gems: 0 };
const RESTORE_ITEMS = [];
// pays every Gold step up to the free road's paid steps (paid.road). full: gems + boosters + items (a purchase, a
// step reached in play); not full (restore / another device): the items only, steps marked paid -> GOLD_OUT (reused)
function payGoldIn(items, boosters, full) {
  GOLD_OUT.steps = 0; GOLD_OUT.gems = 0;
  while (D.paid.gold < D.paid.road) {
    const s = goldStep(D.paid.gold);
    D.paid.gold++;
    GOLD_OUT.steps++;
    if (full && s.gems) GOLD_OUT.gems += addG(s.gems, 'iap');
    if (full && s.boosters) GOLD_OUT.gems += addB(s.boosters, boosters, 'iap');
    if (s.item) {
      const it = itemById(s.item);
      if (it && ownsIn(s.item)) { if (full && it.gems) GOLD_OUT.gems += addG(it.gems, 'refund'); }
      else if (it) { D.owned[s.item] = 'iap'; items.push(s.item); }
    }
  }
  return GOLD_OUT;
}
function payStreak(R, count) {
  const S = D.stats;
  if (count > S.streakBest) S.streakBest = count;
  let over = 0;
  for (let i = 0; i < STREAK.length; i++) {
    const m = STREAK[i];
    if (m.days <= D.paid.streak || m.days > S.streakBest) continue;
    D.paid.streak = m.days;
    R.streakDays = m.days;
    R.lines.streak += m.gems;
    if (m.boosters) over += addB(m.boosters, R.boosters, 'streak');   // past the cap: already paid as gems
  }
  R.gems += addG(R.lines.streak, 'streak') + over;
  R.lines.streak += over;
}
// the run key of the current story run, given as the number startRun returned or as its string (String(run.key))
function sameRun(k) { return RUN.key > 0 && k !== undefined && k !== null && String(k) === String(RUN.key); }
function pairedKeys() { return !(profile.key !== profile.tune.key && storeKey === TUNE.key); }

// ---- offers (a day stored in the future, the clock went back, counts as today: the caps never reopen early)
function offerDayCount() { return D.offers.day && D.offers.day >= today() ? D.offers.n : 0; }
// a stored local date that is not before today: today's VIP token is spent, today's VIP card was shown
function dayUsed(d) { return !!d && d >= today(); }

// ---- boosters
function liarNight(night) {
  let v = XRAY_NIGHT.get(night);
  if (v === undefined) {
    let p = null;
    try { p = nightParams(night); } catch (e) { p = null; }
    v = !!(p && p.liarCount && p.liarCount[1] > 0);
    XRAY_NIGHT.set(night, v);
  }
  return v;
}

const SUMMARY_KEYS = ['gems', 'refund'];
// SUMMARY { productId, kind, gems (every gem added, refund and overflow included), refund, overflow (boosters past the
// cap, paid as gems), firstBuy (the x2 first purchase of a gem pack), bonus (its extra gems), boosters, items (new item
// ids), passDays, goldSteps (Gold Star Road steps paid), full (the one-time extras were paid), restored, any }
function newSummary(p) {
  return { productId: p.id, kind: p.kind, gems: 0, refund: 0, overflow: 0, firstBuy: false, bonus: 0, boosters: boosterSet(0, 0, 0),
    items: [], passDays: 0, goldSteps: 0, full: false, restored: false, any: false };
}
function summaryAny(s) {
  for (let i = 0; i < SUMMARY_KEYS.length; i++) if (s[SUMMARY_KEYS[i]] > 0) return true;
  return s.items.length > 0 || s.passDays > 0 || s.boosters.xray + s.boosters.slowmo + s.boosters.second > 0 || s.restored;
}

export const wallet = {
  tune: TUNE,
  get key() { return storeKey; },
  get data() { return data(); },

  // ---------------------------------------------------------------- lifecycle
  load() { load(); notify('all'); return D; },
  // dev pages: switch to a scratch key (loaded, created with the welcome when empty) -> the previous key
  useKey(key) {
    const prev = storeKey;
    storeKey = typeof key === 'string' && key.length ? key : TUNE.key;
    D = null; lastRev = -1;
    // the native mirror is per key: a switch starts like a cold launch (hydrate() reads the new key's mirror)
    clearTimeout(MIR.timer); MIR.timer = 0; MIR.ok = false; MIR.dirty = false; MIR.has = ''; MIR.hydrating = null; MIR.hydrated = false;
    lastOutcome = null; lastReward = null;
    wallet.endRun();
    load();
    notify('all');
    return prev;
  },
  // dev pages only: deletes the CURRENT scratch key (never the live wallet) -> true when deleted
  wipe() {
    if (storeKey === TUNE.key) return false;
    delRaw(); D = null; lastRev = -1;
    return true;
  },
  onChange(fn) {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  },
  // the last write is durable: the native mirror confirmed it, else WebKit's write-back window has passed
  flushed() {
    if (MIR.ok) return flushNative().then(ok => ok || wait(TUNE.mirror.webkitMs).then(() => false));
    return wait(TUNE.mirror.webkitMs).then(() => false);
  },
  // native: reads the Preferences mirror once; the copy with the higher rev wins -> Promise<adopted native copy>
  hydrate(force) {
    if (MIR.hydrating && force !== true) return MIR.hydrating;
    if (force === true) { MIR.ok = false; MIR.has = ''; MIR.dirty = false; clearTimeout(MIR.timer); MIR.timer = 0; }   // dev: a "relaunch"
    MIR.hydrating = hydrateNative().then(v => { MIR.hydrated = true; return v; }, () => { MIR.hydrated = true; return false; });
    return MIR.hydrating;
  },
  get mirrored() { return MIR.ok; },
  now() { return now(); },
  // dev clock: ms added to Date.now() for the pass / piggy pill / Reopen rest (dates follow profile.setToday)
  setNow(offsetMs) { clockOffset = intIn(offsetMs, -1e14, 1e14, 0); return now(); },

  // ---------------------------------------------------------------- balance
  gems() { return data().gems; },
  // src: 'welcome'|'night'|'daily'|'gift'|'streak'|'medal'|'band'|'look'|'road'|'pass'|'piggy'|'iap'|'refund'|'dev'
  addGems(n, src) {
    n = intIn(n, 0, TUNE.maxGems, 0);
    if (n <= 0) return data().gems;
    fresh(); addG(n, src); commit('gems');
    return D.gems;
  },
  spendGems(n, why) {
    n = intIn(n, 0, TUNE.maxGems, 0);
    if (n <= 0) return false;
    fresh();
    if (D.gems < n) return false;
    D.gems -= n; D.life.spent += n;
    commit('gems');
    return true;
  },
  life(out) { const o = out || {}, L = data().life; o.earned = L.earned; o.bought = L.bought; o.spent = L.spent; return o; },

  // ---------------------------------------------------------------- cosmetics
  owns(id) { data(); return ownsIn(id); },
  // 'gems'|'iap'|'free'|'default'|'vip'|'' (how the item is owned)
  ownedVia(id) {
    const it = itemById(id);
    if (!it) return '';
    if (it.via === 'default') return 'default';
    if (it.via === 'vip') return hasVip() ? 'vip' : '';
    return data().owned[id] || '';
  },
  priceOf(id) { const it = itemById(id); if (!it || it.gems === null || wallet.owns(id)) return null; return it.gems; },
  setPrice(theme) {
    if (OUTFIT_THEMES.indexOf(theme) < 0 || theme === 'rock') return 0;
    const L = setItems(theme);
    let n = 0;
    data();
    for (let i = 0; i < L.length; i++) if (!ownsIn(L[i])) n++;
    return n * SET_LOOK;
  },
  // -> RES (reused) { ok, reason: ''|'owned'|'gems'|'not_for_sale', price }
  buyItem(id) {
    const it = itemById(id);
    RES.ok = false; RES.reason = ''; RES.price = 0;
    if (!it) { RES.reason = 'not_for_sale'; return RES; }
    fresh();
    if (ownsIn(id)) { RES.reason = 'owned'; return RES; }
    if (it.gems === null) { RES.reason = 'not_for_sale'; return RES; }
    RES.price = it.gems;
    if (D.gems < it.gems) { RES.reason = 'gems'; return RES; }
    D.gems -= it.gems; D.life.spent += it.gems;
    D.owned[id] = 'gems';
    commit('items');
    notify('gems');
    RES.ok = true;
    return RES;
  },
  buySet(theme) {
    RES.ok = false; RES.reason = ''; RES.price = 0;
    if (OUTFIT_THEMES.indexOf(theme) < 0 || theme === 'rock') { RES.reason = 'not_for_sale'; return RES; }
    fresh();
    const price = wallet.setPrice(theme), L = setItems(theme);
    RES.price = price;
    if (price <= 0) { RES.reason = 'owned'; return RES; }
    if (D.gems < price) { RES.reason = 'gems'; return RES; }
    D.gems -= price; D.life.spent += price;
    for (let i = 0; i < L.length; i++) if (!ownsIn(L[i])) D.owned[L[i]] = 'gems';
    commit('items');
    notify('gems');
    RES.ok = true;
    return RES;
  },
  // outfit: itemId '' takes it off; species required for outfit -> true when worn (or already worn)
  equip(slot, id, species) {
    if (SLOTS.indexOf(slot) < 0) return false;
    data();
    if (slot === 'outfit') {
      if (SPECIES.indexOf(species) < 0) return false;
      const want = id || '';
      if (want) { const it = itemById(want); if (!it || it.slot !== 'outfit' || it.species !== species || !ownsIn(want)) return false; }
      fresh();
      if (D.equip.outfit[species] === want) return true;
      D.equip.outfit[species] = want;
      commit('equip');
      return true;
    }
    const it = itemById(id);
    if (!it || it.slot !== slot || !ownsIn(id)) return false;
    fresh();
    if (D.equip[slot] === id) return true;
    D.equip[slot] = id;
    commit('equip');
    return true;
  },
  // the worn item of a slot (a default when the stored one is not owned any more); outfit: '' = none
  equipped(slot, species) {
    const d = data();
    if (slot === 'outfit') { const id = d.equip.outfit[species] || ''; return id && ownsIn(id) ? id : ''; }
    const id = d.equip[slot];
    return id && ownsIn(id) ? id : (DEFAULTS[slot] || '');
  },
  // { club, rope, door, plate, outfit: { species: id } } for world / actor / icons / party (refill on change only)
  look(out) {
    const o = out || {};
    o.club = wallet.equipped('club'); o.rope = wallet.equipped('rope'); o.door = wallet.equipped('door'); o.plate = wallet.equipped('plate');
    if (!o.outfit || typeof o.outfit !== 'object') o.outfit = {};
    for (let i = 0; i < SPECIES.length; i++) o.outfit[SPECIES[i]] = wallet.equipped('outfit', SPECIES[i]);
    return o;
  },
  // the current look with one item swapped in (the Shop's 3 s "Try it" preview: world.previewLook(wallet.lookWith(id)))
  lookWith(id, out) {
    const o = wallet.look(out), it = itemById(id);
    if (!it) return o;
    if (it.slot === 'outfit') o.outfit[it.species] = it.id; else o[it.slot] = it.id;
    return o;
  },

  // ---------------------------------------------------------------- boosters + reopen
  boosters(id) { return BOOSTER_IDS.indexOf(id) >= 0 ? data().boosters[id] : 0; },
  // VIP: today's free X-Ray is unused (1 a day, does not stack; a vipDay in the future, the clock went back, counts as
  // spent until the real date passes it)
  vipToken() { return hasVip() && !dayUsed(data().vipDay); },
  // n 1 or 5 (the pack price) -> RES { ok, reason: ''|'gems'|'cap'|'not_for_sale', price }
  buyBooster(id, n) {
    RES.ok = false; RES.reason = ''; RES.price = 0;
    if (BOOSTER_IDS.indexOf(id) < 0) { RES.reason = 'not_for_sale'; return RES; }
    const k = n === 5 ? 5 : 1, B = BOOSTERS[id], price = k === 5 ? B.pack5 : B.gems;
    RES.price = price;
    fresh();
    if (D.boosters[id] + k > BOOSTERS.cap) { RES.reason = 'cap'; return RES; }
    if (D.gems < price) { RES.reason = 'gems'; return RES; }
    D.gems -= price; D.life.spent += price;
    D.boosters[id] += k;
    commit('boosters');
    notify('gems');
    RES.ok = true;
    return RES;
  },
  // ctx { mode, night, vs, practice }: a story night at or below the frontier, night >= 3, no friend's challenge, not
  // practice. Never the Daily, the All-Nighter or a challenge
  boostersOpen(ctx) {
    const c = ctx || NO, mode = c.mode || 'night', night = intIn(c.night, 0, 1e6, 0);
    if (mode !== 'night' || c.vs || c.practice === true) return false;
    if (night < REOPEN.fromNight) return false;
    return profile.nightCounts(night);
  },
  // is booster `id` offered on night n? (X-Ray only from night 4 and only on nights that can hold liars)
  boosterShown(id, night) {
    if (BOOSTER_IDS.indexOf(id) < 0) return false;
    const n = intIn(night, 0, 1e6, 0);
    if (n < BOOSTERS[id].fromNight) return false;
    return id !== 'xray' || liarNight(n);
  },
  // slowmo / second, for the next story run only (never saved, never sticky) -> the armed state
  arm(id, on) {
    if (id !== 'slowmo' && id !== 'second') return false;
    ARM[id] = !!on && wallet.boosters(id) > 0;
    return ARM[id];
  },
  armed(id) { return id === 'slowmo' || id === 'second' ? ARM[id] : false; },
  // the play scene at enter: takes and clears the arming -> RUN (reused) { key, open, night, slowmo, second, boosted,
  // reopens, used }; everything false when boosters are not open on this run. useBooster / reopenPrice / reopen take the
  // key back as the number or as its string
  startRun(ctx) {
    const c = ctx || NO, night = intIn(c.night, 0, 1e6, 0);
    RUN.key = ++runSeq; RUN.night = night; RUN.mode = c.mode || 'night';
    RUN.open = wallet.boostersOpen(c);
    RUN.slowmo = RUN.open && ARM.slowmo && wallet.boosterShown('slowmo', night) && wallet.boosters('slowmo') > 0;
    RUN.second = RUN.open && ARM.second && wallet.boosterShown('second', night) && wallet.boosters('second') > 0;
    RUN.boosted = false; RUN.reopens = 0; RUN.paidReopens = 0;
    RUN.used.xray = false; RUN.used.slowmo = false; RUN.used.second = false;
    ARM.slowmo = false; ARM.second = false;
    return RUN;
  },
  get run() { return RUN; },
  endRun() { RUN.key = 0; RUN.open = false; RUN.slowmo = false; RUN.second = false; },
  // consumes one (the VIP token first for X-Ray) -> false when this run already used one, none is left, or not open
  useBooster(id, runKey) {
    if (!RUN.open || !sameRun(runKey) || BOOSTER_IDS.indexOf(id) < 0 || RUN.used[id]) return false;
    if (id === 'xray') {
      if (!wallet.boosterShown('xray', RUN.night)) return false;
      fresh();
      if (hasVip() && !dayUsed(D.vipDay)) D.vipDay = today();
      else if (D.boosters.xray > 0) D.boosters.xray--;
      else return false;
    } else {
      if (!RUN[id]) return false;
      fresh();
      if (D.boosters[id] <= 0) { RUN[id] = false; return false; }
      D.boosters[id]--;
    }
    RUN.used[id] = true; RUN.boosted = true;
    commit('boosters');
    return true;
  },
  // 0 = free (the first Reopen ever), then the paid ladder 30 / 60 / 120 within one run (the free one does not climb it:
  // free -> 30 -> 60 in that run), -1 = not offered (not a story run, night < 3, the 24 h rest after 3 declines in a
  // row, or 3 Reopens already used this run)
  reopenPrice(runKey, night) {
    if (!RUN.open || !sameRun(runKey)) return -1;
    const n = night === undefined ? RUN.night : intIn(night, 0, 1e6, 0);
    if (n < REOPEN.fromNight) return -1;
    const d = data();
    if (d.reopen.restUntil > now()) return -1;
    if (RUN.reopens >= REOPEN.prices.length) return -1;
    if (REOPEN.firstFree && !d.reopen.firstUsed) return 0;
    return RUN.paidReopens < REOPEN.prices.length ? REOPEN.prices[RUN.paidReopens] : -1;
  },
  // pays (or uses the free one) and counts -> false when not offered or not enough gems
  reopen(runKey) {
    const price = wallet.reopenPrice(runKey);
    if (price < 0) return false;
    fresh();
    if (price > 0) {
      if (D.gems < price) return false;
      D.gems -= price; D.life.spent += price;
      RUN.paidReopens++;
    }
    RUN.reopens++; RUN.boosted = true;
    D.reopen.firstUsed = true; D.reopen.declines = 0;
    commit('gems');
    return true;
  },
  // the player chose Again over a Reopen: 3 in a row -> the panel rests for 24 h
  reopenDeclined() {
    fresh();
    D.reopen.declines++;
    if (D.reopen.declines >= REOPEN.restAfter) { D.reopen.restUntil = now() + REOPEN.restHours * HOUR_MS; D.reopen.declines = 0; }
    commit('');
  },

  // ---------------------------------------------------------------- results
  // once per recorded night, right after profile.recordNight (this module's profile.onRecord hook calls it; result.js
  // may call it again with the same outcome: the stored reward comes back, nothing is paid twice).
  // -> REWARD { gems (total added), base (night rows), vipBonus, vipMiss (what VIP would have added), piggy (gems into the
  //   piggy, VIP's x2 included), vipPiggy (the part of piggy VIP added), items: [ids],
  //   medals: [ids], streakDays, roadSteps, goldSteps (Gold Star Road steps paid), boosters: { xray, slowmo, second },
  //   lines: { stars, pass, gold, daily, band, looks, streak, road (both tracks), goldRoad, medals, endless } }
  onResult(outcome, r) {
    if (!isObj(outcome) || outcome.ignored) return EMPTY_REWARD;
    if (outcome.__reward) return outcome.__reward;
    if (outcome === lastOutcome && lastReward) return lastReward;
    const R = newReward();
    r = isObj(r) ? r : NO;
    if (!pairedKeys()) { outcome.__reward = R; return R; }
    fresh();
    const mode = outcome.mode || r.mode || 'night', practice = outcome.practice === true;
    // 1. gems from nights (high-water marks) x VIP
    const dailyDate = mode === 'daily' && outcome.first === true && !practice ? dateOr(r.date, today()) : '';
    payNightRows(R, dailyDate);
    // 2. piggy: a passed story night (replays too) or a counted daily: +30, +60 on a Gold run, x VIP.piggyMult with VIP
    // (vipPiggy: the part VIP added, after the cap)
    const counted = (mode === 'night' && !practice) || (mode === 'daily' && outcome.first === true && !practice);
    if (counted && outcome.passed === true) {
      const fill = r.tier === 'gold' ? PIGGY.perGold : PIGGY.perPass, vip = hasVip();
      R.piggy = piggyAddIn(vip ? fill * VIP.piggyMult : fill);
      if (vip) R.vipPiggy = Math.max(0, R.piggy - fill);
    }
    // 3. band + 4. colour looks (every member / look owned and never paid: reset-proof, migration-safe)
    payBandAndLooks(R);
    // 5. stats from the run (not practice)
    if (!practice) {
      const S = D.stats;
      S.busted = Math.min(TUNE.maxCount, S.busted + intIn(r.busted, 0, 1e6, 0));
      S.shift = Math.min(TUNE.maxCount, S.shift + intIn(r.shiftCaught, 0, 1e6, 0));
      S.quick = Math.min(TUNE.maxCount, S.quick + intIn(r.quick, 0, 1e6, 0));
      S.comboBest = Math.max(S.comboBest, intIn(r.comboMax, 0, 1e6, 0));
    }
    // the All-Nighter: its gems once per local day (EARN.endless; not doubled by VIP, no piggy, the shared best untouched)
    if (mode === 'endless' && !practice && !dayUsed(D.paid.endlessDay)) {
      const E = EARN.endless, score = intIn(r.endlessScore !== undefined ? r.endlessScore : r.correct, 0, 1e6, 0);
      if (score >= E.from) {
        R.lines.endless = Math.min(E.max, E.gems + Math.floor((score - E.from) / E.every));
        D.paid.endlessDay = today();
        R.gems += addG(R.lines.endless, 'night');
      }
    }
    // a story night lost from night OFFERS.starterPill.night on, after the Starter popup was shown: the Starter Pack may
    // come back once, as a news pill
    if (D.offers.starter && mode === 'night' && !practice && outcome.passed !== true && intIn(r.night, 0, 1e6, 0) >= OFFERS.starterPill.night &&
      !purchasedIn('mb_starter_pack')) D.offers.starterShut = true;
    // 6. medals, 7. Star Road (lifetime stars; + the Gold Star Road when owned), 8. streak milestones (lifetime best streak)
    payMedals(R);
    payRoad(R);
    payStreak(R, outcome.streak ? intIn(outcome.streak.count, 0, 1e6, 0) : 0);
    commit('gems');
    if (R.piggy) notify('piggy');
    if (R.items.length) notify('items');
    if (R.boosters.xray + R.boosters.slowmo + R.boosters.second > 0) notify('boosters');
    outcome.__reward = R;
    lastOutcome = outcome; lastReward = R;
    return R;
  },
  // a counted daily left mid-run (profile.abandonDaily stored it as the day's Shut Down): its daily gems
  onAbandon(res, r) {
    const R = newReward();
    if (!isObj(res) || res.recorded !== true || !pairedKeys()) return R;
    fresh();
    payNightRows(R, dateOr(r && r.date, today()));
    payMedals(R);
    payStreak(R, res.streak ? intIn(res.streak.count, 0, 1e6, 0) : 0);
    commit('gems');
    return R;
  },

  // ---------------------------------------------------------------- free sources
  giftReady() { const d = data().gift.day; return !d || d < today(); },
  // { ready, day (1..7 of the next claim), gems, xray (the 7th claim's booster) }
  gift(out) {
    const o = out || {}, n = data().gift.n % GIFT.cycle.length;
    o.ready = wallet.giftReady(); o.day = n + 1; o.gems = GIFT.cycle[n]; o.xray = n === GIFT.cycle.length - 1 ? GIFT.seventh.xray : 0;
    return o;
  },
  // -> { gems, boosters, day } | null (one claim per local date; a missed day never resets the cycle)
  claimGift() {
    if (!wallet.giftReady()) return null;
    fresh();
    if (D.gift.day && D.gift.day >= today()) return null;
    const idx = D.gift.n % GIFT.cycle.length, out = { gems: 0, boosters: boosterSet(0, 0, 0), day: idx + 1 };
    out.gems = addG(GIFT.cycle[idx], 'gift');
    if (idx === GIFT.cycle.length - 1) out.gems += addB(GIFT.seventh, out.boosters, 'gift');
    D.gift.n++; D.gift.day = today();
    commit('gems');
    if (idx === GIFT.cycle.length - 1) notify('boosters');
    return out;
  },
  // { stars (lifetime), next (stars of the next step), reward (that step: { stars, gems?, item?, boosters?, set? }), done,
  //   gold (the Gold Star Road is owned), goldDone (its steps paid), goldReward (the Gold reward of the next step:
  //   { gems?, boosters?, item? }) }
  road(out) {
    const o = out || {}, d = data();
    o.stars = liveStars(); o.done = d.paid.road;
    const s = roadStep(d.paid.road);
    o.next = s.stars; o.reward = s === ROAD_EXTRA ? { stars: s.stars, gems: s.gems } : s;
    o.gold = goldOwned(); o.goldDone = d.paid.gold; o.goldReward = wallet.goldStep(d.paid.road);
    return o;
  },
  roadStep(k) { const s = roadStep(intIn(k, 0, 1e6, 0)); return s === ROAD_EXTRA ? { stars: s.stars, gems: s.gems } : s; },
  // the Gold Star Road reward paired with Star Road step k (0-based): { gems?, boosters?, item? } (a frozen row or a copy)
  goldStep(k) { const s = goldStep(intIn(k, 0, 1e6, 0)); return s === GOLD_EXTRA ? { gems: s.gems } : s; },
  // what owning the Gold Star Road would pay right now for the steps already reached -> { steps, gems, boosters, items }
  goldBacklog(out) {
    const o = out || {}, d = data();
    o.steps = 0; o.gems = 0; o.items = 0; o.boosters = 0;
    for (let k = d.paid.gold; k < d.paid.road; k++) {
      const s = goldStep(k);
      o.steps++;
      if (s.gems) o.gems += s.gems;
      if (s.boosters) o.boosters += intIn(s.boosters.xray, 0, 99, 0) + intIn(s.boosters.slowmo, 0, 99, 0) + intIn(s.boosters.second, 0, 99, 0);
      if (s.item) o.items++;
    }
    return o;
  },
  // a Star Road reward was paid since the Shop last showed it (the Shop pill's brass dot)
  roadNew() { const d = data(); return d.paid.road > d.offers.roadSeen; },
  markRoadSeen() { fresh(); if (D.offers.roadSeen !== D.paid.road) { D.offers.roadSeen = D.paid.road; commit(''); } },
  // [{ id, stat, goal, have, done, ready, gems }] (rows reused when outList is passed back). Medals whose goal the
  // progress meets are paid when the wallet loads (and on every result), so `ready` (met, not paid yet: a "Collect"
  // chip) only shows between a profile change and the next result; wallet.collectMedals() pays them at once
  medals(outList) {
    const L = Array.isArray(outList) ? outList : [];
    data();
    for (let i = 0; i < MEDALS.length; i++) {
      const m = MEDALS[i], o = L[i] || (L[i] = {});
      o.id = m.id; o.stat = m.stat; o.goal = m.goal; o.gems = m.gems;
      o.done = !!D.paid.medals[m.id];
      const have = o.done ? m.goal : statValue(m.stat);
      o.ready = !o.done && have >= m.goal;
      o.have = Math.min(m.goal, have);
    }
    L.length = MEDALS.length;
    return L;
  },
  // pays every medal whose goal is met -> { gems, medals: [ids] } (the Shop's Collect chip; nothing when none is ready)
  collectMedals() {
    const R = newReward();
    if (!pairedKeys()) return { gems: 0, medals: R.medals };
    fresh();
    payMedals(R);
    if (R.gems > 0) commit('gems');
    return { gems: R.gems, medals: R.medals };
  },
  // the streak milestones with their state: [{ days, gems, boosters, done }]
  streakMilestones(outList) {
    const L = Array.isArray(outList) ? outList : [];
    const paid = data().paid.streak;
    for (let i = 0; i < STREAK.length; i++) {
      const m = STREAK[i], o = L[i] || (L[i] = {});
      o.days = m.days; o.gems = m.gems; o.boosters = m.boosters || null; o.done = m.days <= paid;
    }
    L.length = STREAK.length;
    return L;
  },
  stats(out) { const o = out || {}, S = data().stats; for (const k in S) o[k] = S[k]; return o; },

  // ---------------------------------------------------------------- piggy / pass / vip
  // { gems, cap, minBreak, canBreak (the pot holds at least minBreak), full, pending }: pending = a piggy purchase of
  // this device waits for approval (Ask to Buy, wallet.buyStarted + buyEnded 'pending'): for up to TUNE.piggyHoldMs
  // payments.buy answers 'pending' ("Waiting for approval") instead of asking the store again, so a child can never send
  // two charges for one piggy (canBreak stays true: the card keeps its price, a tap says it is waiting)
  piggy(out) {
    const o = out || {}, d = data(), g = d.piggy.gems, m = markAt('mb_piggy_break');
    o.gems = g; o.cap = PIGGY.cap; o.minBreak = PIGGY.minBreak; o.full = g >= PIGGY.cap;
    o.pending = m > 0 && now() - m < TUNE.piggyHoldMs;
    o.canBreak = g >= PIGGY.minBreak;
    return o;
  },
  // dev / tests: every gem in the piggy goes to the wallet -> gems added (the paid break is grantTx 'mb_piggy_break')
  piggyBreak() { fresh(); const g = piggyBreakIn(false); commit('gems'); notify('piggy'); return g; },
  // dev / tests (the purchase is grantTx 'mb_club_pass_30d')
  passGrant(days) { fresh(); passGrantIn(days, 0); commit('pass'); },
  // pays every accrued unpaid day and today's run bonus (on app open, home enter, return to the foreground) ->
  // { days, gems (the run bonus included), boosters, bonus (the run bonus), run (days in a row) } | null (nothing paid)
  passSettle() {
    if (!data().pass.until) return null;
    fresh();
    const out = passOut(), start = D.pass.start, runDay = D.pass.runDay;
    passSettleIn(out);
    if (out.days <= 0 && out.bonus <= 0) {
      if (D.pass.start !== start || D.pass.runDay !== runDay) commit('pass');   // a clock fix moved it / a run day counted
      return null;
    }
    commit('gems'); notify('pass');
    if (out.days > 0) notify('boosters');
    return out;
  },
  // deliveries are still to come (passLeftIn: days left counts today while today's delivery is paid)
  passActive() { return wallet.passDaysLeft() > 0; },
  passDaysLeft() { const d = data(); return passLeftIn(d.pass, now()); },
  // { daysLeft, active, paidDays, total, until, run (opens in a row, counting today or yesterday; 0 = broken), today
  // (today's open is counted), runFrom / runGems (PASS.run), bonusToday (today paid the run bonus), runNext (the bonus the
  // next counted open would pay: today's when today is not counted yet, else tomorrow's; 0 while the run is still short)
  // } for the Club Pass card and home's daily pass gift strip
  pass(out) {
    const o = out || {}, P = data().pass, t = today();
    o.daysLeft = wallet.passDaysLeft(); o.active = o.daysLeft > 0; o.paidDays = P.paidDays; o.total = passTotal(P); o.until = P.until;
    o.run = passRunNow(P, t); o.today = !!P.runDay && P.runDay >= t;
    o.runFrom = PASS.run.from; o.runGems = PASS.run.gems;
    o.bonusToday = o.today && o.run >= PASS.run.from;
    o.runNext = o.active && o.run + 1 >= PASS.run.from ? PASS.run.gems : 0;
    return o;
  },
  // the only VIP truth (profile.vip stays a reserved, unused field)
  vip() { return hasVip(); },

  // ---------------------------------------------------------------- purchases (payments.js only)
  hasTx(txId) { return !!data().iapLedger[String(txId)]; },
  // payments: a purchase of productId starts on THIS device (call it right before the store sheet). The mark is saved,
  // so a delivery that arrives later (Ask to Buy, an app killed after the sheet) is known as this device's own; an
  // unmarked 'update' / 'boot' delivery of a non-consumable is another device's (content + flag only)
  buyStarted(productId) {
    const p = productById(productId);
    if (!p) return;
    fresh();
    D.buying[p.id] = now();
    commit(p.kind === 'piggy' ? 'piggy' : '');
  },
  // payments: the buy call ended with status 'ok'|'cancelled'|'failed'|'unavailable'|'pending'; anything but 'pending'
  // (still waiting for the store) clears the mark
  buyEnded(productId, status) {
    if (status === 'pending') return;
    data();
    if (!D.buying[productId]) return;
    fresh();
    delete D.buying[productId];
    commit(productId === 'mb_piggy_break' ? 'piggy' : '');
  },
  // a purchase of productId started on this device is waiting for the store (Ask to Buy) -> bool
  buyPending(productId) { data(); return markAt(productId) > 0; },
  // the next purchase of this gem pack pays FIRST_BUY.mult x its gems (the "First buy: x2" ribbon) -> bool
  firstBuy(productId) { return firstBuyPack(productId) && !data().firstBuy[productId]; },
  // boosters of this product that would go past the 99 cap right now (paid as gems instead: the shop's warning) -> n
  boosterOverflow(productId) {
    const p = productById(productId);
    if (!p || !p.boosters) return 0;
    data();
    return overflowOf(p.boosters);
  },
  // the shop lists this deal now: every product from the first launch (App Review must find all 22), owned
  // non-consumables aside
  dealOpen(productId) {
    const p = productById(productId);
    if (!p) return false;
    return !(p.type === 'nonconsumable' && wallet.purchased(p.id));
  },
  // the shop lists this deal at the BOTTOM of Deals for now: the Pro Pack until its `after` product (the Starter Pack) is
  // owned, so it never competes with the Starter; once that is owned it moves up to the slot right under it
  dealLate(productId) {
    const p = productById(productId);
    return !!p && !!p.after && !wallet.purchased(p.after);
  },
  // a content product's items against what is owned -> { total, owned, left (not owned), worth (gems of the ones left),
  // back (gems that a purchase now would pay back: items bought with gems or got free) }
  contentLeft(productId, out) {
    const o = out || {}, p = productById(productId);
    o.total = 0; o.owned = 0; o.left = 0; o.worth = 0; o.back = 0;
    if (!p || !p.items || p.kind === 'vip') return o;
    data();
    for (let i = 0; i < p.items.length; i++) {
      const id = p.items[i], it = itemById(id);
      if (!it) continue;
      o.total++;
      if (ownsIn(id)) { o.owned++; const v = D.owned[id]; if ((v === 'gems' || v === 'free') && it.gems) o.back += it.gems; }
      else { o.left++; if (it.gems) o.worth += it.gems; }
    }
    return o;
  },
  // the money product that also sells this item: its theme bundle or its set ('' = none)
  bundleFor(itemId) { const it = itemById(itemId); return it ? (it.bundle || it.pack || '') : ''; },
  // grants what productId contains and records txId in the ledger in ONE save -> SUMMARY | null (null: txId already
  // processed or unknown product). opts { purchaseDate, signedDate (the App Store's signing time, iap.storeTimes),
  // originalTransactionId, source ('purchase'|'update'|'boot'|'restore'), restore, mine } (payments.deliver passes them
  // all): consumables always deliver in full (a small gem
  // pack's first purchase x2, boosters past the cap as gems, a bought piggy break at least PIGGY.minBreak, the pass with
  // today's delivery); a non-consumable pays its one-time extras (gems, boosters, refunds of items owned through gems,
  // the Gold Star Road payback) only on a full grant (fullGrant: never decided by the transaction's age), else content +
  // owned flag only. SUMMARY: see newSummary
  grantTx(productId, txId, opts) {
    const p = productById(productId);
    txId = txId === undefined || txId === null ? '' : String(txId);
    if (!p || !txId) return null;
    fresh();
    if (D.iapLedger[txId]) return null;
    const o = opts || NO, S = newSummary(p), before = D.gems;
    D.iapLedger[txId] = productId;                             // in the same save as the grant
    trimLedger();
    if (p.kind === 'gems') {
      const first = firstBuyPack(p.id) && !D.firstBuy[p.id];
      if (first) D.firstBuy[p.id] = 1;                         // same save as the ledger; never restored (a consumable)
      addG(first ? p.gems * FIRST_BUY.mult : p.gems, 'iap');
      S.firstBuy = first; S.full = true;
    } else if (p.kind === 'boosters') { S.overflow = addB(p.boosters, S.boosters, 'iap'); S.full = true; }
    else if (p.kind === 'pass') {
      passGrantIn(p.days, dateMs(o.purchaseDate));
      S.passDays = p.days;
      passSettleIn(passOut(S.boosters));                       // today's delivery at once (+ today's open of a run)
      S.full = true;
    } else if (p.kind === 'piggy') { piggyBreakIn(true); S.full = true; }
    else if (p.type === 'nonconsumable') {
      const had = purchasedIn(p.id), full = !had && fullGrant(p, txId, o);
      if (!had) { D.purchases.push(p.id); S.restored = !full; }
      S.full = full;
      if (full && p.gems) addG(p.gems, 'iap');
      if (full && p.boosters) S.overflow = addB(p.boosters, S.boosters, 'iap');
      if (p.kind === 'vip') { if (!had) for (let i = 0; i < p.items.length; i++) S.items.push(p.items[i]); }
      else if (p.items) for (let i = 0; i < p.items.length; i++) S.refund += grantPaidItem(p.items[i], S.items, full);
      if (p.kind === 'goldroad') { goldBackIn(S.items); S.goldSteps = payGoldIn(S.items, S.boosters, full).steps; }
    }
    S.gems = D.gems - before;
    if (p.kind === 'gems' && S.firstBuy) S.bonus = S.gems - p.gems;
    if (S.full) D.lastBuyAt = now();
    delete D.buying[p.id];                                     // delivered: this device's purchase mark is done
    S.any = summaryAny(S);
    commit('gems');
    if (p.kind === 'piggy') notify('piggy');
    if (p.kind === 'pass') notify('pass');
    if (S.items.length) notify('items');
    if (p.kind === 'vip') notify('vip');
    if (S.boosters.xray + S.boosters.slowmo + S.boosters.second > 0) notify('boosters');
    return S;
  },
  // a store entitlement of a non-consumable (Restore Purchases, the silent owned sync): content + flag only, never gems,
  // boosters or refunds (the Gold Star Road: its flag + the cosmetics of the steps already reached); txId (optional)
  // goes in the ledger so a later redelivery of it is not granted in full -> true when anything came back.
  // Except this device's own purchase still on its way: a product not owned yet with an open mark (buyStarted: Ask to Buy
  // approved while Restore ran, an unfinished purchase the boot delivery missed) is DELIVERED here by grantTx's rule
  // (source 'boot'; opts { purchaseDate, signedDate, originalTransactionId } as payments passes them), never written to
  // the ledger as a bare restore that would turn the real delivery into a duplicate and swallow its extras
  restoreOwned(productId, txId, opts) {
    const p = productById(productId);
    if (!p || p.type !== 'nonconsumable') return false;
    fresh();
    let changed = false, ledger = false;
    const t = txId === undefined || txId === null ? '' : String(txId);
    if (t && !D.iapLedger[t] && !purchasedIn(p.id) && markAt(p.id) > 0) {
      const o = opts || NO;
      const S = wallet.grantTx(p.id, t, { purchaseDate: o.purchaseDate, signedDate: o.signedDate,
        originalTransactionId: o.originalTransactionId, source: 'boot' });
      return !!S && S.any;
    }
    if (t && !D.iapLedger[t]) { D.iapLedger[t] = productId; trimLedger(); ledger = true; }
    if (!purchasedIn(p.id)) { D.purchases.push(p.id); changed = true; }
    if (p.kind !== 'vip' && p.items) for (let i = 0; i < p.items.length; i++) if (!D.owned[p.items[i]]) { D.owned[p.items[i]] = 'iap'; changed = true; }
    if (p.kind === 'goldroad') {
      if (goldBackIn(RESTORE_ITEMS) > 0) changed = true;
      if (D.paid.gold < D.paid.road) { payGoldIn(RESTORE_ITEMS, null, false); changed = true; }
      RESTORE_ITEMS.length = 0;
    }
    if (changed || ledger) commit(changed ? 'items' : '');
    if (changed && p.kind === 'vip') notify('vip');
    return changed;
  },
  // a refunded / revoked store transaction (payments.deliver: revocationDate) of a non-consumable. Only when this
  // wallet's ledger shows it (txId or its originalTransactionId) granted this product and the product is owned: the owned
  // flag goes (with it every VIP perk: x2 night gems, the daily X-Ray, the VIP rope + lounge) and so do the items it gave
  // ('iap') that no other owned product holds (heldElsewhere). Gems, boosters, items bought with gems or earned free stay
  // (nothing goes below zero). refunded[productId] is kept, so buying it again never pays its gems / boosters twice; a
  // worn item that goes falls back to the slot's default -> { productId, items: [ids taken back] } | null (nothing to do)
  revokeTx(productId, txId, originalTransactionId) {
    const p = productById(productId);
    if (!p || p.type !== 'nonconsumable') return null;
    fresh();
    const L = D.iapLedger, t = txId === undefined || txId === null ? '' : String(txId);
    const og = originalTransactionId === undefined || originalTransactionId === null ? '' : String(originalTransactionId);
    if (!((t && L[t] === p.id) || (og && L[og] === p.id)) || !purchasedIn(p.id)) return null;
    D.purchases.splice(D.purchases.indexOf(p.id), 1);
    D.refunded[p.id] = 1;
    const out = { productId: p.id, items: [] };
    let ids = NOLIST;
    if (p.kind === 'goldroad') {
      ids = [];
      for (let k = 0; k < Math.min(D.paid.gold, GOLD_ROAD.steps.length); k++) if (GOLD_ROAD.steps[k].item) ids.push(GOLD_ROAD.steps[k].item);
    } else if (p.kind !== 'vip' && p.items) ids = p.items;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (D.owned[id] === 'iap' && !heldElsewhere(id, p.id)) { delete D.owned[id]; out.items.push(id); }
    }
    commit('items');
    if (p.kind === 'vip') notify('vip');
    return out;
  },
  purchased(productId) { return data().purchases.indexOf(productId) >= 0; },

  // ---------------------------------------------------------------- offers (§6.2 caps)
  // kind 'starter' (the one popup) | 'starterPill' (its one extra news pill) | 'vip' | 'piggy' | 'passEnded';
  // ctx: { tier, night } for 'vip', { priceReady } for 'starter' and 'starterPill'
  offerDue(kind, ctx) {
    const d = data(), c = ctx || NO, t = now();
    if (kind === 'passEnded') {
      return d.pass.until > 0 && (d.pass.until <= t || d.pass.paidDays >= passTotal(d.pass)) && d.offers.passEnded !== d.pass.until;
    }
    if (profile.nextNight() < OFFERS.minNight) return false;
    if (offerDayCount() >= OFFERS.perDay) return false;
    if (SESSION.lastAt && t - SESSION.lastAt < OFFERS.gapMs) return false;     // never two offers back to back
    if (kind === 'starter') {
      return !purchasedIn('mb_starter_pack') && !d.offers.starter && profile.nextNight() >= OFFERS.starterAt &&
        SESSION.modal < OFFERS.perSession && c.priceReady !== false;
    }
    if (kind === 'starterPill') {
      // once ever, never a popup, no countdown: after the popup was shown, on the first Shut Down from night 5 on (since
      // then) or OFFERS.starterPill.afterH later; never within a day of any purchase, never in the popup's session
      if (purchasedIn('mb_starter_pack') || !d.offers.starter || d.offers.starterPill || SESSION.modal > 0 || c.priceReady === false) return false;
      if (d.lastBuyAt && t - d.lastBuyAt < TUNE.starterPillGapMs) return false;
      const aged = d.offers.starterAt > 0 && t - d.offers.starterAt >= OFFERS.starterPill.afterH * HOUR_MS;
      return d.offers.starterShut || aged;
    }
    if (kind === 'vip') {
      const night = c.night !== undefined ? intIn(c.night, 0, 1e6, 0) : profile.nextNight() - 1;
      return !hasVip() && c.tier === 'gold' && night >= OFFERS.vip.minNight && !dayUsed(d.offers.vipDay) &&
        d.offers.vipDismiss < OFFERS.vip.maxDismiss;
    }
    if (kind === 'piggy') {
      return d.piggy.gems >= PIGGY.cap && d.offers.piggyShows < OFFERS.piggyMaxShows &&
        (!d.offers.piggyAt || t - d.offers.piggyAt >= OFFERS.piggyEveryH * HOUR_MS);
    }
    return false;
  },
  // the offer was put on screen (marks it, counts it toward the caps)
  offerShown(kind) {
    fresh();
    const t = today(), O = D.offers;
    if (kind === 'passEnded') { O.passEnded = D.pass.until; commit(''); return; }
    if (!O.day || O.day < t) { O.day = t; O.n = 0; }
    O.n++;
    SESSION.lastAt = now(); SESSION.shown++;
    if (kind === 'starter') { O.starter = true; O.starterAt = now(); SESSION.modal++; }
    else if (kind === 'starterPill') O.starterPill = true;
    else if (kind === 'vip') O.vipDay = t;
    else if (kind === 'piggy') { O.piggyAt = now(); O.piggyShows++; }
    commit('');
  },
  offerDismissed(kind) {
    if (kind !== 'vip') return;
    fresh();
    D.offers.vipDismiss++;
    commit('');
  },
  // dev: a new app session for the per-session caps
  newSession() { SESSION.modal = 0; SESSION.lastAt = 0; SESSION.shown = 0; },

  // ---------------------------------------------------------------- dev
  selfTest() { return walletSelfTest(); },
};

// ---- earning hook: profile.recordNight / abandonDaily -> the wallet pays right away (reward kept on the outcome)
profile.onRecord(function (outcome, r, kind) {
  if (kind === 'abandon') wallet.onAbandon(outcome, r);
  else wallet.onResult(outcome, r);
});
try { if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('storage', onStorage); } catch (e) { /* no DOM */ }

// ================================================================ wallet self-test (scratch keys, restored afterwards)
function localDay() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayAfter(day, k) { return new Date(Date.parse(day + 'T12:00:00Z') + k * DAY_MS).toISOString().slice(0, 10); }
function walletSelfTest() {
  const lines = [];
  let ok = true;
  function check(c, name, detail) { lines.push((c ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' (' + detail + ')' : '')); if (!c) ok = false; }
  function iso(ms) { return new Date(ms).toISOString(); }
  function bsum() { return wallet.boosters('xray') + wallet.boosters('slowmo') + wallet.boosters('second'); }
  const cat = catalogSelfTest();
  check(cat.ok, 'catalog selfTest', cat.ok ? '' : cat.report.split('\n').filter(s => s.indexOf('FAIL') === 0).join('; '));
  const prevW = storeKey, prevP = profile.useKey('selftest.wprofile');
  const prevNow = clockOffset, prevDay = profile.today(), dayOverride = prevDay !== localDay() ? prevDay : '';
  const KEYS = ['selftest.wallet', 'selftest.wallet2', 'selftest.wallet3', 'selftest.wallet4', 'selftest.wallet5', 'selftest.wallet6',
    'selftest.wallet7'];
  profile.reset(true);
  wallet.useKey('selftest.wallet'); wallet.wipe(); wallet.useKey('selftest.wallet');
  try {
    // welcome once
    check(wallet.gems() === 50 && wallet.boosters('xray') === 1 && wallet.piggy().gems === PIGGY.start && wallet.piggy().canBreak,
      'welcome: 50 gems, 1 of each booster, piggy ' + PIGGY.start + ' (breakable at once)');
    wallet.load();
    check(wallet.gems() === 50, 'welcome is paid once per wallet (reload)');
    // a passed night: stars + first pass + band seat
    const O1 = profile.recordNight({ mode: 'night', night: 1, correct: 12, total: 12, tier: 'gold', admitted: { blob: 4, tall: 3 } });
    const R1 = O1.__reward;
    check(!!R1 && R1.lines.stars === 6 && R1.lines.pass === 3 && R1.lines.gold === 5, 'night 1 gold pays 3 stars x2 + pass 3 + gold 5', R1 ? JSON.stringify(R1.lines) : 'no reward');
    check(R1.piggy === PIGGY.perGold, 'gold run feeds the piggy +' + PIGGY.perGold, R1.piggy);
    check(R1.lines.band >= EARN.band, 'new band member pays 25', R1.lines.band);
    check(R1.medals.indexOf('first_pass') >= 0 && R1.medals.indexOf('first_gold') >= 0, 'first_pass + first_gold medals');
    check(wallet.onResult(O1, {}) === R1, 'a second onResult with the same outcome pays nothing more');
    const g1 = wallet.gems();
    // reset-proof high-water marks
    profile.reset(true);
    const O2 = profile.recordNight({ mode: 'night', night: 1, correct: 12, total: 12, tier: 'gold', admitted: { blob: 4, tall: 3 } });
    const R2 = O2.__reward;
    check(R2.base === 0 && R2.lines.band === 0 && R2.medals.length === 0, 'after profile.reset the same night pays no night gems, band or medals again', JSON.stringify(R2.lines));
    check(wallet.gems() === g1, 'balance unchanged by the replayed progress', wallet.gems() + ' vs ' + g1);
    check(R2.piggy === PIGGY.perGold, 'a passed replay still feeds the piggy');
    // ledger blocks replays; the first purchase of a gem pack pays x2, the next one its stated gems
    check(wallet.firstBuy('mb_gems_100'), 'a gem pack never bought shows First buy x2');
    const S1 = wallet.grantTx('mb_gems_100', 'st-tx-1', {});
    const S1b = wallet.grantTx('mb_gems_100', 'st-tx-1', {});
    const S1c = wallet.grantTx('mb_gems_100', 'st-tx-1c', {});
    check(!!S1 && S1.gems === 200 && S1.firstBuy && S1.bonus === 100 && !wallet.firstBuy('mb_gems_100'), 'first purchase of 100 Gems pays 200 (x2), once', S1 && S1.gems);
    check(S1b === null && wallet.hasTx('st-tx-1') && !!S1c && S1c.gems === 100 && !S1c.firstBuy, 'ledger: a replayed transaction id is never granted twice; the next purchase pays 100');
    const SB = wallet.grantTx('mb_gems_1200', 'st-tx-big', {});
    check(!wallet.firstBuy('mb_gems_1200') && wallet.firstBuy('mb_gems_300') && !!SB && SB.gems === 1200 && !SB.firstBuy,
      'the big packs keep their stated gems on a first purchase (x2 only on 100 / 315 / 550)', SB && SB.gems);
    // restore never grants gems
    const gb = wallet.gems();
    const rs = wallet.restoreOwned('mb_starter_pack', 'st-restore-1');
    check(rs && wallet.owns('outfit.rock.blob') && wallet.gems() === gb && wallet.boosters('slowmo') <= 3, 'restore brings the Rock Star set + flag, never gems', wallet.gems() - gb);
    const late = wallet.grantTx('mb_starter_pack', 'st-restore-1', {});
    check(late === null, 'the restored entitlement id is in the ledger (no later full grant)');
    const late2 = wallet.grantTx('mb_starter_pack', 'st-restore-2', { source: 'boot' });
    check(!!late2 && late2.gems === 0 && !late2.full, 'a second transaction of an owned non-consumable: content only');

    // ---- delivery rule: decided from the transaction, never from its age
    // a wallet that existed 4 days ago; its Starter Pack sheet opened 3 days ago (buyStarted: this device's mark) and the
    // app was killed before the grant
    clockOffset = prevNow - 4 * DAY_MS;
    wallet.useKey('selftest.wallet2'); wallet.wipe(); wallet.useKey('selftest.wallet2');
    clockOffset = prevNow - 3 * DAY_MS;
    wallet.buyStarted('mb_starter_pack');
    clockOffset = prevNow;
    const w2g = wallet.gems(), w2b = bsum(), old = now() - 3 * DAY_MS;
    const U1 = wallet.grantTx('mb_starter_pack', 'st-unf', { purchaseDate: iso(old), originalTransactionId: 'st-unf', source: 'boot' });
    const U2 = wallet.grantTx('mb_starter_pack', 'st-unf', { purchaseDate: iso(old), originalTransactionId: 'st-unf', source: 'boot' });
    check(!!U1 && U1.full && wallet.gems() - w2g === 500 && bsum() - w2b === 9 && wallet.owns('outfit.rock.bean') && U2 === null &&
      !wallet.buyPending('mb_starter_pack'), 'an unfinished Starter Pack of this device delivered 3 days late pays 500 gems + 9 boosters, once', U1 && U1.gems);
    // a second wallet (another device / a reinstall) seeing the same purchase
    wallet.useKey('selftest.wallet3'); wallet.wipe(); wallet.useKey('selftest.wallet3');
    check(wallet.dealOpen('mb_pro_pack') && wallet.dealLate('mb_pro_pack'), 'Pro Pack is listed from the first launch, at the bottom of Deals while the Starter Pack is not owned');
    const w3g = wallet.gems();
    const C1 = wallet.grantTx('mb_starter_pack', 'st-unf-copy', { purchaseDate: iso(old), originalTransactionId: 'st-unf', source: 'boot' });
    check(!!C1 && !C1.full && C1.restored && wallet.gems() === w3g && wallet.owns('outfit.rock.tall') && wallet.purchased('mb_starter_pack'),
      'a copy with another originalTransactionId (re-download / second device): content + flag only', C1 && C1.gems);
    check(wallet.dealOpen('mb_pro_pack') && !wallet.dealLate('mb_pro_pack'), 'once the Starter Pack is owned the Pro Pack moves up under it');
    wallet.buyStarted('mb_bundle_neon');
    check(wallet.buyPending('mb_bundle_neon'), 'buyStarted marks a purchase of this device');
    wallet.buyEnded('mb_bundle_neon', 'cancelled');
    check(!wallet.buyPending('mb_bundle_neon'), 'a cancel clears the mark');
    const P1 = wallet.grantTx('mb_pro_pack', 'st-pro-other', { source: 'update', originalTransactionId: 'st-pro-other', purchaseDate: iso(now()) });
    check(!!P1 && !P1.full && P1.gems === 0 && wallet.owns('outfit.beach.blob') && wallet.owns('rope.neon'),
      'an unmarked transactionUpdated (another device): Pro Pack items + flag, no 1,200 gems', P1 && P1.gems);
    // a device that never started a purchase (no mark of any kind): another device's Starter Pack arrives as an update
    wallet.useKey('selftest.wallet5'); wallet.wipe(); wallet.useKey('selftest.wallet5');
    const w5g = wallet.gems(), w5b = bsum();
    const UP = wallet.grantTx('mb_starter_pack', 'st-other-dev', { source: 'update', originalTransactionId: 'st-other-dev', purchaseDate: iso(now()) });
    check(!!UP && !UP.full && UP.restored && wallet.gems() === w5g && bsum() === w5b && wallet.owns('outfit.rock.blob'),
      "another device's Starter Pack on a wallet that never bought (update, no mark): Rock Star set + flag, 0 gems, 0 boosters", UP && UP.gems);
    // this device's own purchase: the buy call's result (mine) and a marked update both pay in full
    wallet.buyStarted('mb_pro_pack');
    const MP = wallet.grantTx('mb_pro_pack', 'st-pro-mine', { source: 'update', originalTransactionId: 'st-pro-mine', purchaseDate: iso(now()) });
    check(!!MP && MP.full && MP.gems === 1200 && wallet.owns('outfit.beach.tall'), 'a marked update (Ask to Buy approved on this device): Pro Pack in full, 1,200 gems', MP && MP.gems);
    // refunds: the flag and the items it gave go, gems stay; bought again it never pays its gems twice
    wallet.buyStarted('mb_vip_rope');
    wallet.grantTx('mb_vip_rope', 'st-vip5', { source: 'purchase', mine: true, purchaseDate: iso(now()) });
    wallet.equip('rope', 'rope.vip');
    const gR = wallet.gems();
    check(wallet.revokeTx('mb_vip_rope', 'st-nope', 'st-nope') === null && wallet.vip() && wallet.equipped('rope') === 'rope.vip', 'a revocation this ledger never granted takes nothing');
    const RV = wallet.revokeTx('mb_vip_rope', 'st-vip5', 'st-vip5');
    check(!!RV && !wallet.vip() && !wallet.owns('rope.vip') && !wallet.vipToken() && wallet.equipped('rope') === 'rope.velvet',
      'a refunded VIP Rope: x2, the daily X-Ray and the VIP rope + lounge go (the worn rope falls back to Velvet)');
    const RP = wallet.revokeTx('mb_pro_pack', 'st-pro-mine');
    check(!!RP && !wallet.purchased('mb_pro_pack') && !wallet.owns('outfit.beach.tall') && !wallet.owns('rope.neon') && wallet.gems() === gR &&
      RP.items.length === 6 && wallet.owns('outfit.rock.blob'), 'a refunded Pro Pack: its outfits + rope go, the gems already paid and other purchases stay', RP && RP.items.join());
    wallet.buyStarted('mb_pro_pack');
    const gA = wallet.gems(), AG = wallet.grantTx('mb_pro_pack', 'st-pro-again', { source: 'purchase', mine: true, purchaseDate: iso(now()) });
    check(!!AG && !AG.full && wallet.gems() === gA && wallet.owns('outfit.beach.tall'), 'bought again after the refund: items + flag, never the 1,200 gems twice', AG && AG.gems);
    wallet.grantTx('mb_club_owner', 'st-owner5', { source: 'purchase', mine: true });
    wallet.grantTx('mb_bundle_neon', 'st-neon5', { source: 'purchase', mine: true });
    const RB = wallet.revokeTx('mb_bundle_neon', 'st-neon5');
    check(!!RB && RB.items.length === 0 && wallet.owns('club.neon') && wallet.owns('outfit.neon.bean'), 'a refunded bundle keeps what Club Owner also holds', RB && RB.items.join());
    // the Club Pass: a clock moved back after a normal purchase only waits (no pull-forward of later days)
    wallet.grantTx('mb_club_pass_30d', 'st-pass5', { source: 'purchase', mine: true, purchaseDate: iso(now()) });
    clockOffset = prevNow - 3 * DAY_MS;
    const back = wallet.passSettle();
    clockOffset = prevNow + 60000;
    const fwd = wallet.passSettle();
    check(back === null && fwd === null && wallet.pass().paidDays === 1 && wallet.pass().total === 30, 'a clock moved back 3 days after buying the pass: nothing extra when it returns', wallet.pass().paidDays);
    // a run of opens: +10 a day from the 3rd day in a row; a missed day restarts the run, the missed delivery still comes
    const today5 = today(), runLog = [];
    for (let k = 1; k <= 6; k++) {
      if (k === 4) continue;
      profile.setToday(dayAfter(today5, k)); clockOffset = prevNow + k * DAY_MS + 60000;
      const s = wallet.passSettle();
      runLog.push(k + ':' + (s ? s.days + '/' + s.gems + '/' + s.bonus + '/' + s.run : '-'));
    }
    check(runLog.join(' ') === '1:1/50/0/2 2:1/60/10/3 3:1/60/10/4 5:2/100/0/1 6:1/50/0/2' && wallet.pass().paidDays === 7,
      'Club Pass run: +10 gems a day from the 3rd day in a row, a missed day restarts it and its delivery still arrives', runLog.join(' '));
    profile.setToday(dayAfter(today5, 5));
    check(wallet.passSettle() === null && wallet.pass().run === 2, 'the clock moved back a day: no second run day, nothing paid');
    profile.setToday(dayOverride);
    clockOffset = prevNow;
    wallet.useKey('selftest.wallet3');
    // Ask to Buy approved two days later on this device (marked): the full grant, refund of an item bought with gems
    wallet.addGems(1000, 'dev');
    const bo = wallet.buyItem('door.oak');
    wallet.buyStarted('mb_club_owner'); wallet.buyEnded('mb_club_owner', 'pending');
    check(bo.ok && wallet.buyPending('mb_club_owner'), 'a pending purchase keeps its mark');
    clockOffset = prevNow + 2 * DAY_MS;
    const left = wallet.contentLeft('mb_club_owner');
    const gO = wallet.gems(), OW = wallet.grantTx('mb_club_owner', 'st-owner', { source: 'update', purchaseDate: iso(now()) });
    check(!!OW && OW.full && OW.refund === 200 && wallet.gems() - gO === 200 && OW.items.length === left.left && !wallet.buyPending('mb_club_owner'),
      'Club Owner approved 2 days later: full grant, the Oak door bought with gems paid back (200)', OW && (OW.refund + '/' + OW.items.length + '/' + left.left));
    check(wallet.owns('club.space') && wallet.owns('plate.crystal') && wallet.owns('outfit.spooky.bean') && wallet.owns('outfit.royal.blob'),
      'Club Owner unlocks every gem cosmetic');
    clockOffset = prevNow;
    // a marked purchase whose store date is far older than the mark: a re-download, content only
    wallet.useKey('selftest.wallet4'); wallet.wipe(); wallet.useKey('selftest.wallet4');
    wallet.addGems(500, 'dev');
    wallet.buyItem('outfit.royal.blob');
    wallet.buyStarted('mb_bundle_royal');
    const RD = wallet.grantTx('mb_bundle_royal', 'st-royal-old', { source: 'purchase', purchaseDate: iso(now() - 5 * DAY_MS) });
    check(!!RD && !RD.full && RD.refund === 0 && wallet.owns('club.royal'), 'a re-download (store date 5 days before the mark): items + flag, no refund', RD && RD.refund);
    const CR = wallet.grantTx('mb_set_crystal', 'st-crystal', { source: 'purchase', purchaseDate: iso(now()) });
    check(!!CR && CR.full && CR.items.length === 3 && wallet.owns('door.crystal'), 'Crystal Street Set: rope + door + plate');

    // ---- review p5: the App Store's own clock, the owned sync meeting an open mark, a mark from the future
    // a Starter Pack bought with the device clock 2 days ahead: the store signed it right at its purchase, so it is this
    // device's new purchase whatever the mark's device time says
    const real = Date.now() + prevNow;                          // the App Store's clock (the honest time)
    wallet.useKey('selftest.wallet6'); wallet.wipe(); wallet.useKey('selftest.wallet6');
    clockOffset = prevNow + 2 * DAY_MS;
    wallet.buyStarted('mb_starter_pack');
    const w6g = wallet.gems(), w6b = bsum();
    const AH = wallet.grantTx('mb_starter_pack', 'st-ahead', { source: 'purchase', mine: true, originalTransactionId: 'st-ahead',
      purchaseDate: iso(real), signedDate: real + 4000 });
    check(!!AH && AH.full && wallet.gems() - w6g === 500 && bsum() - w6b === 9 && !wallet.buyPending('mb_starter_pack'),
      'a Starter Pack bought with the device clock 2 days ahead (signed at its purchase on the App Store clock): 500 gems + 9 boosters', AH && AH.gems);
    // StoreKit handing an old Pro Pack back through the buy button (signed now, bought 40 days ago): content + flag only
    wallet.buyStarted('mb_pro_pack');
    const g6 = wallet.gems();
    const OLD = wallet.grantTx('mb_pro_pack', 'st-old-pro', { source: 'purchase', mine: true, originalTransactionId: 'st-old-pro',
      purchaseDate: iso(real - 40 * DAY_MS), signedDate: real });
    check(!!OLD && !OLD.full && wallet.gems() === g6 && wallet.owns('rope.neon'),
      'an old Pro Pack handed back through the buy button (signed today, bought 40 days ago): items + flag, no 1,200 gems', OLD && OLD.gems);
    clockOffset = prevNow;
    // the owned sync sees this device's Ask to Buy purchase before its delivery: the sync delivers it in full, the later
    // delivery of the same id is a ledger duplicate, and the mark is gone
    wallet.useKey('selftest.wallet7'); wallet.wipe(); wallet.useKey('selftest.wallet7');
    wallet.buyStarted('mb_starter_pack'); wallet.buyEnded('mb_starter_pack', 'pending');
    const w7g = wallet.gems(), w7b = bsum();
    const RS = wallet.restoreOwned('mb_starter_pack', 'st-race', { purchaseDate: iso(now()), originalTransactionId: 'st-race' });
    const RS2 = wallet.grantTx('mb_starter_pack', 'st-race', { source: 'boot', purchaseDate: iso(now()), originalTransactionId: 'st-race' });
    check(RS && RS2 === null && wallet.gems() - w7g === 500 && bsum() - w7b === 9 && !wallet.buyPending('mb_starter_pack') && wallet.owns('outfit.rock.blob'),
      'the owned sync meets an Ask to Buy purchase of this device before its delivery: 500 gems + 9 boosters once, the delivery is a duplicate, no mark left', wallet.gems() - w7g);
    // Ask to Buy pending, then the clock goes back 3 days and the app relaunches: the mark stays, the approval pays in full
    wallet.buyStarted('mb_pro_pack'); wallet.buyEnded('mb_pro_pack', 'pending');
    clockOffset = prevNow - 3 * DAY_MS;
    wallet.load();
    const kept = wallet.buyPending('mb_pro_pack'), g7 = wallet.gems();
    const AB = wallet.grantTx('mb_pro_pack', 'st-atb-back', { source: 'update', originalTransactionId: 'st-atb-back', purchaseDate: iso(real + 60000) });
    check(kept && !!AB && AB.full && wallet.gems() - g7 === 1200 && !wallet.buyPending('mb_pro_pack'),
      'Ask to Buy pending, the clock moved back 3 days, relaunch: the mark is kept and the approval pays the Pro Pack in full', AB && AB.gems);
    clockOffset = prevNow;

    // ---- back on wallet 2: bundle refund once
    wallet.useKey('selftest.wallet2');
    wallet.addGems(2000, 'dev');
    wallet.buyItem('outfit.neon.blob'); wallet.buyItem('club.neon');
    const before = wallet.gems(), B1 = wallet.grantTx('mb_bundle_neon', 'st-b1', {});
    check(B1 && B1.refund === 720 && wallet.gems() === before + 720, 'bundle pays back the 2 items bought with gems (600 + 120)', B1 && B1.refund);
    const B2 = wallet.restoreOwned('mb_bundle_neon', 'st-b2');
    check(!B2 && wallet.gems() === before + 720, 'restoring the bundle again refunds nothing');
    const SP = wallet.grantTx('mb_bundle_space', 'st-space', {});
    check(!!SP && SP.items.length === 6 && wallet.owns('club.space') && wallet.owns('outfit.space.square'), 'Space Lounge Bundle: theme + 5 outfits');
    // reopen ladder: the free first Reopen does not climb it
    for (let n = 1; n <= 5; n++) profile.recordNight({ mode: 'night', night: n, correct: 20, total: 20, tier: 'gold', admitted: {} });
    let run = wallet.startRun({ mode: 'night', night: 4 });
    check(run.open && wallet.reopenPrice(run.key) === 0, 'first Reopen ever is free');
    wallet.reopen(run.key);
    check(wallet.reopenPrice(run.key) === 30 && wallet.reopen(run.key) && wallet.reopenPrice(run.key) === 60 && wallet.reopen(run.key) && wallet.reopenPrice(run.key) === -1,
      'free, then 30, then 60, then none in the same run');
    run = wallet.startRun({ mode: 'night', night: 4 });
    check(wallet.reopenPrice(run.key) === 30 && wallet.reopen(run.key) && wallet.reopenPrice(run.key) === 60, 'a new run: 30 then 60');
    wallet.reopenDeclined(); wallet.reopenDeclined(); wallet.reopenDeclined();
    check(wallet.reopenPrice(run.key) === -1, '3 declines in a row rest the panel for 24 h');
    // boosters closed in daily / endless / vs / practice / below night 3
    check(!wallet.boostersOpen({ mode: 'daily', night: 5 }) && !wallet.boostersOpen({ mode: 'endless', night: 5 }) &&
      !wallet.boostersOpen({ mode: 'night', night: 5, vs: 'C-1' }) && !wallet.boostersOpen({ mode: 'night', night: 99 }) &&
      !wallet.boostersOpen({ mode: 'night', night: 2 }) && wallet.boostersOpen({ mode: 'night', night: 3 }),
      'boosters only on story nights 3+ at or below the frontier');
    check(!wallet.boosterShown('xray', 3) && wallet.boosterShown('xray', 4) && wallet.boosterShown('slowmo', 3), 'X-Ray from night 4, Slow-Mo from night 3');
    // one of each per run
    wallet.arm('slowmo', true);
    run = wallet.startRun({ mode: 'night', night: 4 });
    const xs = wallet.boosters('xray'), ss = wallet.boosters('slowmo');
    check(run.slowmo && wallet.useBooster('slowmo', run.key) && !wallet.useBooster('slowmo', run.key) && wallet.boosters('slowmo') === ss - 1, 'Slow-Mo: armed, used once per run');
    check(wallet.useBooster('xray', run.key) && !wallet.useBooster('xray', run.key) && wallet.boosters('xray') === xs - 1, 'X-Ray: once per run');
    check(!wallet.armed('slowmo'), 'arming is cleared by startRun (never sticky)');
    // VIP x2 only on night gems
    wallet.grantTx('mb_vip_rope', 'st-vip', {});
    const O3 = profile.recordNight({ mode: 'night', night: 6, correct: 20, total: 20, tier: 'gold', admitted: {} });
    const R3 = O3.__reward;
    check(R3.base > 0 && R3.vipBonus === R3.base, 'VIP doubles the night rows', R3.base + '/' + R3.vipBonus);
    check(R3.piggy === PIGGY.perGold * VIP.piggyMult && R3.vipPiggy === R3.piggy - PIGGY.perGold, 'VIP doubles the piggy fill too (+' +
      PIGGY.perGold * VIP.piggyMult + ' on a Gold night)', R3.piggy + '/' + R3.vipPiggy);
    const gg = wallet.gems(), gf = wallet.claimGift();
    check(gf && wallet.gems() === gg + gf.gems && gf.gems === GIFT.cycle[0], 'VIP does not double the Free Gift');
    check(wallet.vipToken() && wallet.owns('rope.vip') && wallet.owns('club.vip'), 'VIP: free X-Ray token + rope + lounge');
    run = wallet.startRun({ mode: 'night', night: 6 });
    const xv = wallet.boosters('xray');
    check(wallet.useBooster('xray', run.key) && wallet.boosters('xray') === xv && !wallet.vipToken(), 'VIP token is spent before the inventory, 1 a day');
    // the device date moved forward and back: one token per real day
    const today0 = today();
    profile.setToday(dayAfter(today0, 2));
    check(wallet.vipToken(), 'a later day: a new VIP token');
    run = wallet.startRun({ mode: 'night', night: 6 });
    wallet.useBooster('xray', run.key);
    profile.setToday(today0);
    check(!wallet.vipToken(), 'back to the real date: no token until it passes the date already used');
    profile.setToday(dayOverride);
    // pass pays missed days
    wallet.grantTx('mb_club_pass_30d', 'st-pass', {});
    const p0 = wallet.pass();
    check(p0.paidDays === 1 && p0.total === 30 && p0.daysLeft === 30 && p0.active, 'pass: day 1 paid at purchase, 30 days left (today included)', p0.daysLeft);
    clockOffset = prevNow + 4 * DAY_MS + 1000;
    const st = wallet.passSettle();
    check(st && st.days === 4 && st.gems === 200, 'pass pays 4 missed days later (50 gems each)', st && st.days + ' days, ' + st.gems);
    clockOffset = prevNow + 40 * DAY_MS;
    const st2 = wallet.passSettle();
    check(st2 && st2.days === 25 && wallet.pass().paidDays === 30 && wallet.passSettle() === null, 'pass ends after 30 paid days and never renews');
    check(wallet.offerDue('passEnded'), 'pass-ended note is due once');
    wallet.offerShown('passEnded');
    check(!wallet.offerDue('passEnded'), 'pass-ended note shown once');
    clockOffset = prevNow;
    check(wallet.passDaysLeft() === 0 && !wallet.passActive(), 'clock moved back after every day was paid: 0 days left, not active', wallet.passDaysLeft());
    // bought while the device clock was 200 days ahead of the store's purchaseDate, then the clock is fixed: deliveries
    // follow real time
    const realNow = now();
    clockOffset = prevNow + 200 * DAY_MS;
    wallet.grantTx('mb_club_pass_30d', 'st-pass-fwd', { source: 'purchase', mine: true, purchaseDate: iso(realNow) });
    clockOffset = prevNow;
    wallet.passSettle();
    const pf = wallet.pass();
    check(pf.total === 30 && pf.paidDays === 1 && pf.daysLeft === 30 && Math.abs(wallet.data.pass.start - now()) < 60000,
      'a pass bought with the clock 200 days ahead restarts today once the clock is fixed', pf.daysLeft);
    clockOffset = prevNow + DAY_MS + 1000;
    const st3 = wallet.passSettle();
    check(st3 && st3.days === 1, 'and pays the next day', st3 && st3.days);
    clockOffset = prevNow;
    // piggy cap, pending hold, a bought break never pays less than minBreak
    for (let i = 0; i < 20; i++) profile.recordNight({ mode: 'night', night: 6, correct: 20, total: 20, tier: 'gold', admitted: {} });
    const pg = wallet.piggy();
    check(pg.gems === PIGGY.cap && pg.full && pg.canBreak, 'piggy caps at ' + PIGGY.cap, pg.gems);
    wallet.buyStarted('mb_piggy_break'); wallet.buyEnded('mb_piggy_break', 'pending');
    check(wallet.piggy().pending && wallet.buyPending('mb_piggy_break'), 'an Ask to Buy piggy purchase keeps its mark: pending (payments answers "Waiting for approval")');
    const pb = wallet.grantTx('mb_piggy_break', 'st-piggy', { source: 'update' });
    check(pb && pb.gems === PIGGY.cap && wallet.piggy().gems === 0 && !wallet.piggy().canBreak && !wallet.piggy().pending, 'Break the Piggy pays ' + PIGGY.cap + ' and empties it');
    const pb2 = wallet.grantTx('mb_piggy_break', 'st-piggy-2', {});
    check(pb2 && pb2.gems === PIGGY.minBreak, 'a second approved piggy purchase on an empty piggy still pays ' + PIGGY.minBreak, pb2 && pb2.gems);
    // booster overflow: past the 99 cap the boosters come as gems at the single price
    let want = 0;
    const bx = wallet.boosters('xray'), bs = wallet.boosters('slowmo'), bc = wallet.boosters('second'), gm = wallet.gems();
    for (let i = 0; i < 7; i++) wallet.grantTx('mb_booster_mega', 'st-mega-' + i, {});
    want = Math.max(0, bx + 105 - BOOSTERS.cap) * BOOSTERS.xray.gems + Math.max(0, bs + 105 - BOOSTERS.cap) * BOOSTERS.slowmo.gems +
      Math.max(0, bc + 105 - BOOSTERS.cap) * BOOSTERS.second.gems;
    check(wallet.boosters('xray') === BOOSTERS.cap && wallet.boosters('second') === BOOSTERS.cap && want > 0 && wallet.gems() - gm === want,
      'Mega Booster Bundles past the 99 cap: the extra boosters are paid as gems', (wallet.gems() - gm) + ' vs ' + want);
    check(wallet.boosterOverflow('mb_booster_bundle') === 15, 'the shop can warn before a booster purchase past the cap', wallet.boosterOverflow('mb_booster_bundle'));
    const B0 = wallet.grantTx('mb_booster_bundle', 'st-bb-over', {});
    check(B0 && B0.overflow === 5 * (BOOSTERS.xray.gems + BOOSTERS.slowmo.gems + BOOSTERS.second.gems) && B0.gems === B0.overflow, 'a Booster Bundle at the cap: 375 gems instead');

    // ---- wallet 4: medals settle on load, the All-Nighter, the Gold Star Road, the Starter news pill
    wallet.useKey('selftest.wallet4'); wallet.wipe(); wallet.useKey('selftest.wallet4');
    const ml = wallet.medals();
    let ready = 0;
    for (let i = 0; i < ml.length; i++) if (ml[i].ready) ready++;
    check(ml[0].done && ml[1].done && ready === 0 && wallet.gems() >= 50 + 30, 'medals whose progress predates the wallet are paid when it loads (no full bar without a check)', wallet.gems());
    const E1 = profile.recordNight({ mode: 'endless', endlessScore: 35, correct: 35, total: 35, admitted: {} }).__reward;
    const E2 = profile.recordNight({ mode: 'endless', endlessScore: 80, correct: 80, total: 80, admitted: {} }).__reward;
    check(E1.lines.endless === 6 && E1.piggy === 0 && E1.vipBonus === 0 && E2.lines.endless === 0, 'All-Nighter: 35 guests pay 6 gems, once a day', E1.lines.endless + '/' + E2.lines.endless);
    profile.recordNight({ mode: 'night', night: 6, correct: 20, total: 20, tier: 'gold', admitted: {} });
    const road0 = wallet.road();
    check(road0.done >= 1 && !road0.gold && wallet.goldBacklog().steps === road0.done, 'the Gold Star Road would pay back the steps already reached', road0.done);
    const gG = wallet.gems(), GR = wallet.grantTx('mb_gold_road', 'st-gold', {});
    check(!!GR && GR.full && GR.goldSteps === road0.done && wallet.gems() - gG === GOLD_ROAD.steps[0].gems, 'buying it pays the reached steps at once (60 gems)', GR && GR.goldSteps);
    let goldSeen = 0;
    for (let n = 7; n <= 14; n++) { const Rn = profile.recordNight({ mode: 'night', night: n, correct: 20, total: 20, tier: 'gold', admitted: {} }).__reward; goldSeen += Rn.goldSteps; }
    check(goldSeen >= 2 && wallet.owns('plate.gold') && wallet.data.paid.gold === wallet.data.paid.road, 'every new Star Road step pays its Gold reward too (Gold Leaf plate at 40 stars)', goldSeen);
    // restore on another wallet: the flag + the cosmetics of the steps reached there, no gems
    wallet.useKey('selftest.wallet3');
    profile.recordNight({ mode: 'night', night: 14, correct: 20, total: 20, tier: 'gold', admitted: {} });
    const g3 = wallet.gems(), RG = wallet.restoreOwned('mb_gold_road', 'st-gold');
    check(RG && wallet.purchased('mb_gold_road') && wallet.owns('plate.gold') && wallet.gems() === g3, 'restoring the Gold Star Road: flag + cosmetics, never gems');
    // the Starter Pack's one extra surfacing (a news pill, never a popup)
    wallet.useKey('selftest.wallet4');
    wallet.newSession();
    clockOffset = prevNow + 2 * DAY_MS;
    check(wallet.offerDue('starter'), 'the Starter popup is due from night ' + OFFERS.starterAt);
    wallet.offerShown('starter');
    check(!wallet.offerDue('starterPill'), 'no Starter pill in the same session as the popup');
    profile.recordNight({ mode: 'night', night: 6, correct: 5, total: 20, tier: 'rope', admitted: {} });
    wallet.newSession();
    clockOffset = prevNow + 3 * DAY_MS;
    profile.setToday(dayAfter(today0, 1));
    check(wallet.offerDue('starterPill'), 'after a Shut Down from night 5 on: the Starter news pill is due once');
    wallet.offerShown('starterPill');
    wallet.newSession();
    clockOffset = prevNow + 9 * DAY_MS;
    profile.setToday(dayAfter(today0, 5));
    check(!wallet.offerDue('starterPill') && !wallet.offerDue('starter'), 'and never again');
    profile.setToday(dayOverride);
    clockOffset = prevNow;
  } catch (e) {
    check(false, 'self-test threw', String(e && e.stack || e));
  } finally {
    clockOffset = prevNow;
    profile.setToday(dayOverride);
    wallet.newSession();
    // the caller's PROFILE comes back first: its wallet settles the Doorman Medals on load against the profile it is paired
    // with, so it must never load while the self-test's scratch progress (nights, golds, the All-Nighter best) is current
    profile.reset(true);
    const prevSave = save.ns;
    save.ns = TUNE.ns;
    try { save.del('selftest.wprofile'); for (let i = 0; i < KEYS.length; i++) save.del(KEYS[i]); } finally { save.ns = prevSave; }
    profile.useKey(prevP);
    D = null; lastRev = -1;
    wallet.useKey(prevW);
  }
  return { ok: ok, report: lines.join('\n') };
}
