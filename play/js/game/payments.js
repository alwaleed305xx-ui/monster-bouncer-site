// payments.js: the payment providers of Monster Bouncer (docs/MONETIZATION.md §10, §11.4; port of the live payments layer).
//   'native' native iOS: Apple In-App Purchase (StoreKit 2) through js/game/iap.js (@capgo/native-purchases); the store
//            verifies and charges, prices come from the store (its localised priceString, never a hard-coded USD).
//   'mock'   the web build on a development host (localhost, 127.0.0.1, [::1], *.localhost) or any non-public host with
//            ?iap=mock: a clearly labelled in-game demo sheet ("Demo, no charge"). It never charges anything and it can
//            never run inside a store build: on native a forced 'mock' becomes 'none'.
//   'none'   payments off: a native shell without the plugin (or Android, not in v1: "Purchases are not available on
//            this device right now"), and every other web host, the public site's play/ included ("Purchases are in the
//            app"). The shop then hides every money button; the public page never hands out paid content.
// Delivery is "grant, save, then finish": wallet.grantTx() grants and writes the transaction id into the wallet's
// iapLedger in ONE save; the store is told to finish only after wallet.flushed() (the native save mirror confirmed it, or
// WebKit's write-back window passed). A replayed id is never granted twice, an unknown product is left unfinished for a
// newer app version, and a failed finish is retried at the next launch (the ledger blocks the second grant). Every
// delivery hands the wallet its source ('purchase' | 'update' | 'boot'), purchaseDate + signedDate (iap.storeTimes: the
// App Store's own clock, so a device clock set ahead never costs a buyer the extras) and originalTransactionId
// (iap.originalId): the wallet's delivery rule (economy.js header) pays a non-consumable's one-time extras only to this
// device's own new purchase, so a second iPhone / iPad on the same Apple ID (whose transactions StoreKit delivers through
// Transaction.updates) or a re-download gets content + flag only. Every buy marks its product on this device first
// (wallet.buyStarted right before the store sheet, wallet.buyEnded after it; 'pending' keeps the mark for the Ask to Buy
// approval). A revoked (refunded) transaction is never granted; one of a non-consumable this wallet granted takes its
// flag and items back (wallet.revokeTx); either way it is finished.
// Startup (initPayments, once from main.js): native save mirror -> Club Pass settle -> configure (autoFinishTransactions
// false) -> transactionUpdated listener -> deliver every unfinished transaction -> silent owned sync (current
// entitlements: the 11 non-consumables, content + flag only; an entitlement of a product with this device's purchase
// mark still open is that purchase itself and is delivered by the purchase rule instead) -> prices.
// Held-back products (catalog HOLD_BACK, off the first submission) are never listed, priced or bought here: productShown /
// canSell answer false and buy answers 'unavailable' / 'held'; a delivered transaction of one is still granted.
// Errors: cancel is silent ('cancelled'); 'pending' (Ask to Buy, a slow card) -> the UI shows purchase_pending and the item
// arrives later (transactionUpdated -> onPurchase listeners with source 'update'); a piggy break already waiting for
// approval on this device answers 'pending' again without asking the store (never two charges for one piggy); anything
// else -> 'failed'.
// Restore Purchases (Settings + the bottom of the Shop, provider 'native' only, from a user tap): restorePurchases ->
// unfinished -> owned sync -> { restored, owned }.
// UI hooks: onPrices(fn) (prices arrived), onPurchase(fn) (every delivery: { source 'purchase'|'update'|'boot'|'restore',
// productId, granted, dup, summary, error }), setCheckout(fn) (a custom demo sheet: fn(product, info) -> Promise<bool>;
// without one the built-in 'checkout' overlay scene below is pushed: main.js registers it).
// Every public function is a function declaration (safe across import cycles with the scene modules).
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { stage } from '../core/stage.js';
import { draw } from '../core/draw.js';
import { text } from '../core/text.js';
import { spring, tweens } from '../core/tween.js';
import { clamp } from '../core/math.js';
import { wallet, PRODUCTS, PRODUCT_IDS, NON_CONSUMABLE, productById, onSale } from './economy.js';
import * as iap from './iap.js';

export const CONFIG = {
  provider: 'auto',                                   // 'auto' | 'mock' | 'native' | 'none' (dev pages may force one)
  publicHosts: ['alwaleed305xx-ui.github.io'],        // ?iap=mock is ignored here: the public site never mocks
  priceRetryMs: 60000,                                // a store that answered is asked again at most this often
  entryPack: 'mb_gems_100',                           // the gem -> money reference (gemRef) uses this pack's store price
};

let webMockCache = -1;                                // -1 unknown, 0 no, 1 yes (decided once: main.js may strip the query)
function devHost(h) {
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
}
// may a web page on this host / query run the demo checkout?
function mockAllowed(host, search, protocol) {
  const h = String(host || '').toLowerCase();
  if (devHost(h)) return true;
  return /[?&]iap=mock(&|$)/.test(String(search || '')) && !!h && CONFIG.publicHosts.indexOf(h) < 0 && protocol !== 'file:';
}
function webMock() {
  if (webMockCache >= 0) return webMockCache === 1;
  let yes = false;
  try { yes = mockAllowed(location.hostname, location.search, location.protocol); } catch (e) { yes = false; }
  webMockCache = yes ? 1 : 0;
  return yes;
}
// the provider for: forced (CONFIG.provider), a native shell?, StoreKit available (iOS + the plugin)?, demo allowed?
function decide(forced, native, storeKit, mockOk) {
  let p = forced || 'auto';
  if (p === 'auto') p = native ? 'native' : (mockOk ? 'mock' : 'none');
  if (native && p === 'mock') p = 'none';                // a demo checkout never runs inside a store build
  if (!native && p === 'native') p = 'none';
  if (p === 'native' && !storeKit) p = 'none';           // plugin missing, or not iOS (Android is not in v1)
  return p === 'mock' || p === 'native' ? p : 'none';
}
// 'native' | 'mock' | 'none' (see the header)
export function providerName() {
  const native = iap.isNativeShell();
  return decide(CONFIG.provider, native, native && iap.available(), !native && webMock());
}
export function isMock() { return providerName() === 'mock'; }
// why money buttons are hidden: 'app' (a web page: "Purchases are in the app") | 'device' (a native shell without
// StoreKit) | '' (purchases work)
export function unavailableReason() {
  const pv = providerName();
  if (pv !== 'none') return '';
  return iap.isNativeShell() ? 'device' : 'app';
}

// ---------------------------------------------------------------- store-localised prices
const priceCache = new Map();                         // id -> { price, currencyCode, priceString }
const priceListeners = [];
let priceTried = false, priceJob = null, priceAt = 0;
function emitPrices() {
  for (let i = 0; i < priceListeners.length; i++) { try { priceListeners[i](); } catch (e) { console.error('[payments] onPrices listener failed', e); } }
}
export function onPrices(fn) {
  priceListeners.push(fn);
  return () => { const i = priceListeners.indexOf(fn); if (i >= 0) priceListeners.splice(i, 1); };
}
// native: asks the store for every product it has not priced yet (the shop calls it again on open) -> Promise
export function loadPrices() {
  if (providerName() !== 'native') return Promise.resolve();
  if (priceJob) return priceJob;
  const missing = PRODUCT_IDS.filter(id => !priceCache.has(id));
  if (!missing.length || (priceTried && Date.now() - priceAt < CONFIG.priceRetryMs)) return Promise.resolve();
  priceJob = (async () => {
    try {
      const found = await iap.products(missing);
      found.forEach((sp, id) => {
        if (sp && typeof sp.priceString === 'string' && sp.priceString) {
          priceCache.set(id, { price: typeof sp.price === 'number' ? sp.price : Number(sp.price), currencyCode: String(sp.currencyCode || ''), priceString: sp.priceString });
        }
      });
    } catch (e) { /* store unreachable: products stay hidden, retried when the shop opens again */ }
    priceTried = true; priceAt = Date.now(); priceJob = null;
    refCache.clear();
    emitPrices();
  })();
  return priceJob;
}
export function storePrice(id) { return priceCache.get(id) || null; }
// the price label of a product: native = the store's priceString ('…' while loading or when the store did not return
// it: such a product is hidden, see productShown), mock = 'US$0.99 (demo)', none = ''
const mockLabels = new Map();
export function priceString(id) {
  const p = productById(id);
  if (!p) return '';
  const pv = providerName();
  if (pv === 'native') { const sp = priceCache.get(id); return sp ? sp.priceString : '…'; }
  if (pv !== 'mock') return '';
  const key = i18n.lang + '|' + id;
  let s = mockLabels.get(key);
  if (!s) { s = i18n.t('price_demo', { price: 'US$' + p.usd.toFixed(2) }); mockLabels.set(key, s); }
  return s;
}
// the shop renders this product (native: while prices load, or once the store returned it)
export function productShown(id) {
  if (!onSale(id)) return false;
  const pv = providerName();
  if (pv === 'mock') return !!productById(id);
  if (pv !== 'native') return false;
  return priceCache.has(id) || !priceTried;
}
// the buy button is enabled: the provider is ready and (native) its store price is loaded
export function canSell(id) {
  const pv = providerName();
  if (!onSale(id)) return false;
  return pv === 'mock' || (pv === 'native' && priceCache.has(id));
}
// the store answered and returned nothing at all (offline, or the products are not live yet)
export function storeUnavailable() { return providerName() === 'native' && priceTried && !priceJob && priceCache.size === 0; }
export function pricesLoading() { return providerName() === 'native' && (!priceTried || !!priceJob); }
// the gem -> money reference '≈ SAR 4.79' (n gems at the store price of mb_gems_100, in its currency); '' when unknown
const refCache = new Map();
export function gemRef(n) {
  const pv = providerName();
  n = Math.max(0, Math.floor(+n || 0));
  let price = 0, cur = '';
  if (pv === 'native') { const sp = priceCache.get(CONFIG.entryPack); if (sp && sp.price > 0 && sp.currencyCode) { price = sp.price; cur = sp.currencyCode; } }
  else if (pv === 'mock') { price = productById(CONFIG.entryPack).usd; cur = 'USD'; }
  if (!(price > 0) || !cur || !n) return '';
  const key = n + '|' + cur + '|' + price + '|' + (i18n.isRTL ? 1 : 0);
  let s = refCache.get(key);
  if (s) return s;
  const v = n * price / 100;
  let f = '';
  try { f = new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); }
  catch (e) { f = cur + ' ' + v.toFixed(2); }
  s = '≈ ' + f;
  if (i18n.isRTL) s = '⁦' + s + '⁩';     // a left-to-right run inside Arabic text (strings.js bidi rule)
  if (refCache.size > 400) refCache.clear();
  refCache.set(key, s);
  return s;
}

// ---------------------------------------------------------------- delivery
const purchaseListeners = [];
const finishing = [];                                 // finish promises still in flight (settled() waits for them)
function emitPurchase(res) {
  for (let i = 0; i < purchaseListeners.length; i++) { try { purchaseListeners[i](res); } catch (e) { console.error('[payments] onPurchase listener failed', e); } }
}
export function onPurchase(fn) {
  purchaseListeners.push(fn);
  return () => { const i = purchaseListeners.indexOf(fn); if (i >= 0) purchaseListeners.splice(i, 1); };
}
function txIdOf(tx) { return tx && tx.transactionId !== undefined && tx.transactionId !== null ? String(tx.transactionId) : ''; }
// Deliver one store transaction: synchronous until the first await (grant + ledger in one wallet save), then finish.
// source: 'purchase' (the buy call: its result returns at once, the finish follows), 'update' (transactionUpdated: Ask
// to Buy, another device, a refund), 'boot' (unfinished at launch / Restore). -> Promise<res> (res.revoked: the wallet's
// revokeTx result for a refunded non-consumable it had granted)
function deliver(tx, source, finish) {
  const id = tx && typeof tx.productIdentifier === 'string' ? tx.productIdentifier : '';
  const txId = txIdOf(tx), p = id ? productById(id) : null;
  const res = { ok: false, granted: false, dup: false, error: '', productId: id, txId: txId, summary: null, finished: null, source: source, revoked: null };
  if (!txId || !p) { res.error = 'unknown-product'; return Promise.resolve(res); }   // left unfinished for a newer version
  const orig = iap.originalId(tx), T = iap.storeTimes(tx);
  if (tx.revocationDate) {                                                             // refunded / revoked: never granted
    res.error = 'revoked';
    if (p.type === 'nonconsumable') res.revoked = wallet.revokeTx(id, txId, orig);
  } else if (wallet.hasTx(txId)) { res.ok = true; res.dup = true; }
  else {
    const s = wallet.grantTx(id, txId, { purchaseDate: T.purchased || undefined, signedDate: T.signed || undefined,
      originalTransactionId: orig, source: source, mine: source === 'purchase' ? true : undefined, restore: source === 'restore' });
    res.ok = !!s; res.dup = !s; res.granted = !!(s && s.any); res.summary = s;
  }
  emitPurchase(res);
  if (!finish) return Promise.resolve(res);
  // finish only once the grant is durable (a kill before it leaves the transaction unfinished: redelivered, ledger-blocked)
  const job = wallet.flushed().then(() => iap.finish(txId)).then(ok => { res.finished = ok; return res; }, () => { res.finished = false; return res; });
  finishing.push(job);
  job.then(() => { const i = finishing.indexOf(job); if (i >= 0) finishing.splice(i, 1); });
  return source === 'purchase' ? Promise.resolve(res) : job;
}
// every store finish started so far has completed (dev pages, tests)
export function settled() { return Promise.all(finishing.slice()).then(() => true); }

// ---------------------------------------------------------------- buy
let buying = false;
function outcome(status, reason, summary) { return { status: status, reason: reason || '', summary: summary || null }; }
let mockSeq = 0;
function mockTxId() { return 'mock-' + Date.now().toString(36) + '-' + (++mockSeq).toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
// the demo: the sheet first (a cancel leaves no mark), then this device's mark and the 'purchase' delivery (the demo's
// store clock is the device clock: purchased and signed now, as a new purchase is)
async function buyMock(p) {
  const yes = await confirmMock(p);
  if (!yes) return outcome('cancelled');
  wallet.buyStarted(p.id);
  const at = wallet.now();
  const r = await deliver({ transactionId: mockTxId(), productIdentifier: p.id, purchaseDate: new Date(at).toISOString(), signedDate: at }, 'purchase', false);
  wallet.buyEnded(p.id, r.ok ? 'ok' : 'failed');
  return r.ok && r.summary ? outcome('ok', '', r.summary) : outcome('failed', r.error || 'grant');
}
// StoreKit: this device's mark is saved right before the store sheet (an app killed during the sheet, an Ask to Buy
// approval days later: the delivery is still known as this device's own); the buy's end clears it, except 'pending'
async function buyNative(p) {
  let tx = null;
  wallet.buyStarted(p.id);
  try { tx = await iap.purchase(p.id, p.type === 'consumable'); }
  catch (e) { const k = iap.errorKind(e); wallet.buyEnded(p.id, k); return outcome(k, 'store'); }   // 'cancelled' | 'pending' | 'failed'
  if (!tx || !txIdOf(tx)) { wallet.buyEnded(p.id, 'failed'); return outcome('failed', 'no-transaction'); }
  const r = await deliver(tx, 'purchase', true);
  wallet.buyEnded(p.id, r.ok ? 'ok' : 'failed');
  if (r.error === 'revoked') return outcome('failed', 'revoked');
  if (!r.ok) return outcome('failed', r.error || 'grant');
  return outcome('ok', r.dup ? 'dup' : '', r.summary);
}
// -> { status: 'ok'|'cancelled'|'pending'|'failed'|'unavailable', reason, summary (wallet.grantTx SUMMARY on 'ok') }.
// 'pending' with reason 'piggy': a piggy break of this device already waits for approval (Ask to Buy, wallet.piggy().pending):
// the store is not asked again. 'unavailable' reasons: 'unknown', 'held' (held back from this build: catalog HOLD_BACK),
// 'owned' (a non-consumable already owned), 'piggy' (below its minimum), 'provider' (payments off), 'price' (native: no
// store price yet), 'busy' (another purchase is open)
export async function buy(productId) {
  const p = productById(productId);
  if (!p) return outcome('unavailable', 'unknown');
  if (!onSale(p.id)) return outcome('unavailable', 'held');
  if (p.type === 'nonconsumable' && wallet.purchased(p.id)) return outcome('unavailable', 'owned');
  if (p.kind === 'piggy') {
    wallet.piggy(PIGGY_O);
    if (PIGGY_O.pending) return outcome('pending', 'piggy');
    if (!PIGGY_O.canBreak) return outcome('unavailable', 'piggy');
  }
  const pv = providerName();
  if (pv === 'none') return outcome('unavailable', 'provider');
  if (pv === 'native' && !priceCache.has(p.id)) return outcome('unavailable', 'price');
  if (buying) return outcome('unavailable', 'busy');
  buying = true;
  try { return await (pv === 'mock' ? buyMock(p) : buyNative(p)); }
  catch (e) { console.error('[payments] buy failed', e); return outcome('failed', 'error'); }
  finally { buying = false; }
}
const PIGGY_O = {};
export function busy() { return buying; }

// ---------------------------------------------------------------- restore + startup (native only)
async function processUnfinished() {
  let list = [];
  try { list = await iap.unfinished(); } catch (e) { return 0; }
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    try { const r = await deliver(list[i], 'boot', true); if (r.granted) n++; } catch (e) { /* retried next launch */ }
  }
  return n;
}
// the current entitlements of this Apple ID: every non-consumable comes back with its content + owned flag only
// (wallet.restoreOwned: never gems, boosters or a refund, so Restore cannot be farmed) -> { restored (new), owned }.
// One exception: a product this device has an open purchase mark for and does not own yet (Ask to Buy approved while
// Restore runs, an unfinished purchase whose boot delivery failed) is that purchase itself: it is delivered (and
// finished) by the purchase rule, so its extras are paid once and its own later delivery is a ledger duplicate
async function syncOwned() {
  const list = await iap.entitlements();
  let restored = 0, owned = 0;
  for (let i = 0; i < list.length; i++) {
    const tx = list[i], id = tx && tx.productIdentifier;
    if (!tx || tx.revocationDate || NON_CONSUMABLE.indexOf(id) < 0) continue;
    owned++;
    const txId = txIdOf(tx);
    if (txId && wallet.buyPending(id) && !wallet.purchased(id) && !wallet.hasTx(txId)) {
      const r = await deliver(tx, 'boot', true);
      if (r.granted) restored++;
      continue;
    }
    const T = iap.storeTimes(tx);
    if (wallet.restoreOwned(id, txId, { purchaseDate: T.purchased || undefined, signedDate: T.signed || undefined, originalTransactionId: iap.originalId(tx) })) {
      restored++;
      emitPurchase({ ok: true, granted: true, dup: false, error: '', productId: id, txId: txId, summary: null, finished: null, source: 'restore' });
    }
  }
  return { restored: restored, owned: owned };
}
// "Restore Purchases" (Guideline 3.1.1). Only from a user tap: AppStore.sync may show an Apple ID sheet.
// -> { status: 'ok'|'cancelled'|'failed'|'unavailable', restored, owned }
export async function restore() {
  if (providerName() !== 'native') return { status: 'unavailable', restored: 0, owned: 0 };
  try { await iap.restore(); }
  catch (e) { if (iap.errorKind(e) === 'cancelled') return { status: 'cancelled', restored: 0, owned: 0 }; /* entitlements are still readable */ }
  await processUnfinished();
  try { const r = await syncOwned(); return { status: 'ok', restored: r.restored, owned: r.owned }; }
  catch (e) { return { status: 'failed', restored: 0, owned: 0 }; }
}

let initJob = null;
export function initPayments() {
  if (initJob) return initJob;
  initJob = (async () => {
    try { await wallet.hydrate(); } catch (e) { /* localStorage only */ }
    try { wallet.passSettle(); } catch (e) { console.error('[payments] pass settle failed', e); }
    try {
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) { try { wallet.passSettle(); } catch (e) { /* next open */ } } });
    } catch (e) { /* no DOM */ }
    if (providerName() !== 'native') return;
    try { await iap.configure(); } catch (e) { /* the capacitor.config.json key already set it */ }
    try { await iap.onTransaction(tx => { deliver(tx, 'update', true).catch(() => null); }); } catch (e) { /* recovered at next launch */ }
    await processUnfinished();
    try { await syncOwned(); } catch (e) { /* offline: Restore Purchases retries */ }
    await loadPrices();
  })();
  return initJob;
}

// ---------------------------------------------------------------- the demo checkout (mock provider only)
let checkoutFn = null;
// a custom demo sheet: fn(product, info) -> Promise<boolean> (true = the player confirmed the demo purchase); null = the
// built-in 'checkout' overlay
export function setCheckout(fn) { checkoutFn = typeof fn === 'function' ? fn : null; }
function sheetInfo(p) {
  return { name: productName(p.id), sub: productSub(p.id), price: priceString(p.id) };
}
export function productName(id) { return i18n.t('iap_' + id); }
// 1,500 (Western digits with a thousands comma, as every count in strings.js)
function fmtN(n) { return String(Math.max(0, Math.floor(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
export function productSub(id) {
  const p = productById(id);
  if (p && p.kind === 'piggy') { wallet.piggy(PIGGY_O); return i18n.t('iap_mb_piggy_break_sub', { n: fmtN(PIGGY_O.gems), cap: fmtN(PIGGY_O.cap) }); }
  return i18n.t('iap_' + id + '_sub');
}
function confirmMock(p) {
  if (providerName() !== 'mock') return Promise.resolve(false);
  if (checkoutFn) {
    let r;
    try { r = checkoutFn(p, sheetInfo(p)); } catch (e) { return Promise.resolve(false); }
    return Promise.resolve(r).then(v => v === true, () => false);
  }
  return openSheet(p);
}

let UI = null, GL = null, GEM = null;                 // home.js UI factories, icons.js and the shop's gem glyph (first sheet)
let measureCtx = null;
const SH = { t: 0, a: 0, s: 0.86, closing: -1, top: 0, h: 0, outId: -1, product: null, done: null, answer: false, glyph: 'gem', subN: 0, noteN: 0, active: false };
let SU = null;
const SHEET = {
  w: 316, color: '#2a2760', radius: 30, dim: 0.62, pad: 26, btnW: 236, buyH: 62, cancelH: 50, gapBtn: 12, closeMs: 160, outsideAfter: 0.3,
  tagH: 30, titleH: 40, iconS: 64, nameH: 30, subH: 22, priceH: 38, noteH: 18, subW: 268, noteW: 272,
  gem: { fill: '#3fd0f0', deep: '#1a7fb8', ink: '#1d1840' },
};
const SP_IN = { to: 1, stiffness: 320, damping: 18 };
const SP_OUT = { to: 0, stiffness: 520, damping: 30 };
const SP_OUT_S = { to: 0.9, stiffness: 520, damping: 30 };
const GLYPH_O = { color: '#ffd166' };
const GEM_KEY = 'pay.gem.' + SHEET.iconS;
const ICON_SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };

function loadUi() {
  if (UI && GL) return Promise.resolve(true);
  // the shop's own gem sprite keeps the currency glyph identical everywhere (best effort: the sheet bakes its own without it)
  const gem = import('../scenes/shop.js').then(m => (m && typeof m.drawGem === 'function' ? m.drawGem : null), () => null);
  return Promise.all([import('../scenes/home.js'), import('./icons.js'), gem]).then(m => { UI = m[0]; GL = m[1]; GEM = m[2]; return true; });
}
function openSheet(p) {
  return new Promise(resolve => {
    if (!scenes.has('checkout') || SH.active) { resolve(false); return; }
    loadUi().then(() => {
      if (!scenes.has('checkout') || SH.active) { resolve(false); return; }
      scenes.push('checkout', { product: p, done: resolve });
    }, e => { console.error('[payments] demo sheet failed to load', e); resolve(false); });
  });
}
function buildSheet() {
  const ink = UI.UI_INK, A = UI.UI_ACCENT;
  const sub = [], note = [];
  for (let i = 0; i < 3; i++) sub.push(UI.createLabel(SHEET.subW + 8, SHEET.subH, { size: 15, weight: 700, color: '#ece8ff' }));
  for (let i = 0; i < 3; i++) note.push(UI.createLabel(SHEET.noteW + 8, SHEET.noteH, { size: 12.5, weight: 600, color: 'rgba(236,230,255,0.74)' }));
  SU = {
    panel: UI.createPanel(SHEET.color, { radius: SHEET.radius, inner: 'rgba(255,209,102,0.18)' }),
    tag: UI.createTag(260, SHEET.tagH, { size: 14, color: A.velvet, textColor: A.velvetText }),
    title: UI.createLabel(276, SHEET.titleH + 6, { size: 30, weight: 800, color: '#fff4d6', outline: ink, outlineWidth: 7, shadow: true }),
    name: UI.createLabel(276, SHEET.nameH + 6, { size: 22, weight: 800, color: '#ffd166', outline: ink, outlineWidth: 5 }),
    price: UI.createLabel(276, SHEET.priceH + 6, { size: 27, weight: 800, color: '#ffffff', outline: ink, outlineWidth: 6, shadow: true }),
    sub: sub, note: note,
    btns: UI.createButtons(),
  };
  SU.buy = SU.btns.add({ id: 'buy', x: 195, y: 0, w: SHEET.btnW, h: SHEET.buyH, icon: 'check', label: '', onTap: () => closeSheet(true) });
  SU.cancel = SU.btns.add({ id: 'cancel', x: 195, y: 0, w: SHEET.btnW, h: SHEET.cancelH, secondary: true, icon: 'close', label: '', size: 19, onTap: () => closeSheet(false) });
}
function wrapLines(str, maxW, size, weight, max) {
  if (!measureCtx) { try { measureCtx = document.createElement('canvas').getContext('2d'); } catch (e) { measureCtx = null; } }
  if (!measureCtx) return [str];
  return text.clampLines(text.wrap(measureCtx, str, maxW, size, weight, 'Baloo 2'), max);
}
function refreshSheet() {
  const p = SH.product;
  if (!p || !SU) return;
  SU.tag.set(i18n.t('demo_tag'));
  SU.title.set(i18n.t('demo_title'));
  SU.name.set(productName(p.id));
  SU.price.set(priceString(p.id));
  const subs = wrapLines(productSub(p.id), SHEET.subW, 15, 700, 3), notes = wrapLines(i18n.t('demo_note'), SHEET.noteW, 12.5, 600, 3);
  SH.subN = subs.length; SH.noteN = notes.length;
  for (let i = 0; i < 3; i++) { SU.sub[i].set(i < subs.length ? subs[i] : ''); SU.note[i].set(i < notes.length ? notes[i] : ''); }
  SU.buy.label = i18n.t('demo_buy');
  SU.cancel.label = i18n.t('cancel');
  SH.glyph = p.kind === 'vip' || p.kind === 'bundle' ? 'badge' : (p.kind === 'boosters' ? 'bolt' : 'gem');
  layoutSheet();
}
// the stacked rows, top to bottom (y offsets from the panel top) -> the panel height
const ROW = { tag: 0, title: 0, icon: 0, name: 0, sub: 0, price: 0, note: 0, buy: 0, cancel: 0 };
function layoutSheet() {
  const S = SHEET;
  let y = S.pad + S.tagH / 2;
  ROW.tag = y; y += S.tagH / 2 + 10 + S.titleH / 2;
  ROW.title = y; y += S.titleH / 2 + 8 + S.iconS / 2;
  ROW.icon = y; y += S.iconS / 2 + 8 + S.nameH / 2;
  ROW.name = y; y += S.nameH / 2 + 4 + S.subH / 2;
  ROW.sub = y; y += S.subH * (SH.subN - 1) + S.subH / 2 + 10 + S.priceH / 2;
  ROW.price = y; y += S.priceH / 2 + 8 + S.noteH / 2;
  ROW.note = y; y += S.noteH * (SH.noteN - 1) + S.noteH / 2 + 16 + S.buyH / 2;
  ROW.buy = y; y += S.buyH / 2 + S.gapBtn + S.cancelH / 2;
  ROW.cancel = y; y += S.cancelH / 2 + S.pad;
  SH.h = Math.round(y);
  SH.top = Math.max(stage.safeTop + 8, Math.round((stage.h - SH.h) / 2));
  SU.buy.y = SH.top + ROW.buy; SU.cancel.y = SH.top + ROW.cancel;
}
function closeSheet(yes) {
  if (SH.closing >= 0) return;
  SH.answer = !!yes;
  SH.closing = 0;
  if (SU) SU.btns.locked = true;
  spring(SH, 'a', SP_OUT);
  spring(SH, 's', SP_OUT_S);
}
function answer() {
  const fn = SH.done;
  SH.done = null;
  if (fn) { try { fn(SH.answer); } catch (e) { console.error('[payments] checkout answer failed', e); } }
}
// a sticker gem (the gem currency glyph of the sheet), baked once per size
function bakeGem(c, w, h) {
  const G = SHEET.gem, cx = w / 2, cy = h / 2 + 2, s = Math.min(w, h) / 64;
  const pts = [[-26, -8], [-14, -24], [14, -24], [26, -8], [0, 26]];
  c.save(); c.fillStyle = 'rgba(6,4,22,0.45)'; c.beginPath();
  for (let i = 0; i < pts.length; i++) { const x = cx + pts[i][0] * s + 2, y = cy + pts[i][1] * s + 4; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.closePath(); c.fill(); c.restore();
  draw.sticker(c, cc => {
    cc.beginPath();
    for (let i = 0; i < pts.length; i++) { const x = cx + pts[i][0] * s, y = cy + pts[i][1] * s; if (i) cc.lineTo(x, y); else cc.moveTo(x, y); }
    cc.closePath();
  }, { fill: G.fill, outline: G.ink, lineWidth: 3.2 * s, highlight: 0.32, shadow: 0.22, bounds: [cx - 26 * s, cy - 24 * s, 52 * s, 50 * s] });
  c.save();
  c.lineWidth = 1.6 * s; c.lineJoin = 'round'; c.strokeStyle = 'rgba(16,60,110,0.55)';
  c.beginPath();
  c.moveTo(cx - 26 * s, cy - 8 * s); c.lineTo(cx + 26 * s, cy - 8 * s);
  c.moveTo(cx - 14 * s, cy - 24 * s); c.lineTo(cx - 7 * s, cy - 8 * s); c.lineTo(cx, cy + 24 * s);
  c.moveTo(cx + 14 * s, cy - 24 * s); c.lineTo(cx + 7 * s, cy - 8 * s); c.lineTo(cx, cy + 24 * s);
  c.moveTo(cx - 7 * s, cy - 8 * s); c.lineTo(cx, cy - 24 * s); c.lineTo(cx + 7 * s, cy - 8 * s);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.beginPath(); c.moveTo(cx - 12 * s, cy - 20 * s); c.lineTo(cx - 5 * s, cy - 20 * s); c.lineTo(cx - 9 * s, cy - 11 * s); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = '#ffffff';
  draw.star(c, cx + 22 * s, cy - 22 * s, 5 * s, 1.6 * s, 4); c.fill();
}

export const checkout = {
  get state() { return SH; },
  get buttons() { return SU ? SU.btns : null; },
  enter(params) {
    const p = params || {};
    if (!SU) { if (!UI) { SH.done = p.done || null; SH.answer = false; answer(); scenes.pop(); return; } buildSheet(); }
    SH.product = p.product || null; SH.done = typeof p.done === 'function' ? p.done : null; SH.answer = false;
    SH.active = true; SH.t = 0; SH.a = 0; SH.s = 0.86; SH.closing = -1; SH.outId = -1;
    SU.btns.reset(); SU.btns.locked = false;
    refreshSheet();
    SU.btns.popIn(0.06, 0.06);
    spring(SH, 'a', SP_IN);
    spring(SH, 's', SP_IN);
  },
  exit() {
    SH.active = false;
    tweens.killTarget(SH);
    if (SU) SU.btns.kill();
    answer();                                         // removed without an answer (scenes.go elsewhere): a cancel
  },
  onBack() { closeSheet(false); return true; },
  update(dt) {
    SH.t += dt;
    if (SU) SU.btns.update(dt);
    if (SH.closing >= 0) {
      SH.closing += dt;
      if (SH.closing * 1000 >= SHEET.closeMs && scenes.top === checkout) { scenes.pop(); }
    }
  },
  render(ctx) {
    if (!SU) return;
    const W = stage.w, H = stage.h, a = clamp(SH.a, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * SHEET.dim;
    ctx.fillStyle = '#06051a'; ctx.fillRect(-30, -30, W + 60, H + 60);
    ctx.restore();
    if (a <= 0.01) return;
    const top = SH.top, cy = top + SH.h / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(195, cy); ctx.scale(SH.s, SH.s); ctx.translate(-195, -cy);
    SU.panel.draw(ctx, 195, cy, SHEET.w, SH.h);
    SU.tag.draw(ctx, 195, top + ROW.tag);
    SU.title.draw(ctx, 195, top + ROW.title);
    if (SH.glyph === 'gem') {
      if (GEM) GEM(ctx, 195, top + ROW.icon, SHEET.iconS * 0.95, 1, 0);
      else { ICON_SPR.anchor = null; ICON_SPR.alpha = 1; draw.sprite(ctx, draw.cached(GEM_KEY, SHEET.iconS, SHEET.iconS, bakeGem), 195, top + ROW.icon, ICON_SPR); }
    } else if (GL) GL.drawGlyph(ctx, SH.glyph, 195, top + ROW.icon, SHEET.iconS * 0.86, GLYPH_O);
    SU.name.draw(ctx, 195, top + ROW.name);
    for (let i = 0; i < SH.subN; i++) SU.sub[i].draw(ctx, 195, top + ROW.sub + i * SHEET.subH);
    SU.price.draw(ctx, 195, top + ROW.price);
    for (let i = 0; i < SH.noteN; i++) SU.note[i].draw(ctx, 195, top + ROW.note + i * SHEET.noteH);
    SU.btns.draw(ctx, SH.t);
    ctx.restore();
  },
  onInput(evt, d) {
    if (SH.closing >= 0 || !SU) return true;
    if (SU.btns.onInput(evt, d)) return true;
    const inPanel = Math.abs(d.x - 195) <= SHEET.w / 2 && d.y >= SH.top && d.y <= SH.top + SH.h, id = d.id === undefined ? 0 : d.id;
    // a whole tap outside the panel cancels (a 'down' while the sheet pops in is ignored)
    if (evt === 'down') SH.outId = !inPanel && SH.t >= SHEET.outsideAfter ? id : -1;
    else if (evt === 'up' && SH.outId !== -1 && id === SH.outId) { SH.outId = -1; if (!inPanel) closeSheet(false); }
    return true;
  },
};
// the overlay is popped by its own update once the close spring has played; the answer goes out on exit()
stage.onResize(() => { if (SH.active && SU) layoutSheet(); });
i18n.onChange(() => { mockLabels.clear(); refCache.clear(); if (SH.active && SU) refreshSheet(); });

// dev / test hooks (dev/shop-core.html)
export const __test = {
  reset() { priceCache.clear(); priceTried = false; priceJob = null; priceAt = 0; initJob = null; buying = false; webMockCache = -1; mockLabels.clear(); refCache.clear(); },
  deliver(tx, source, finish) { return deliver(tx, source, finish); },
  get prices() { return priceCache; },
  // o { forced, native, platform, plugin, host, search, protocol } -> the provider those conditions give
  providerFor(o) {
    const native = !!o.native, storeKit = native && o.platform === 'ios' && !!o.plugin;
    return decide(o.forced || 'auto', native, storeKit, !native && mockAllowed(o.host, o.search, o.protocol || 'https:'));
  },
  PRODUCTS: PRODUCTS,
};
