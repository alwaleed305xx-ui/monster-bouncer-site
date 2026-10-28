// iap.js: the StoreKit 2 bridge of Monster Bouncer (docs/MONETIZATION.md §10; port of the live StoreKit bridge,
// docs/ios-decisions.md §5; iOS only). This is the ONLY module that talks to the native in-app purchase plugin
// @capgo/native-purchases (the pinned version, docs/ios-decisions.md §2 and §5). There is no bundler, so the plugin is
// reached through the Capacitor bridge object window.Capacitor.Plugins.NativePurchases (never an npm import). Enabled
// only on native iOS: Android (Google Play Billing, with its serial queue + recover() polling + watchdog) is not part
// of v1, so an Android shell reports the plugin as unavailable and payments.js falls back to 'none' (buy buttons hidden).
// Product type: the string 'inapp' for every product; App Store Connect decides consumable vs non-consumable.
// Every call returns a Promise and throws 'iap-unavailable' without the plugin (callers check available() first), except
// originalId(tx) and storeTimes(tx), pure reads of a transaction object (payments.js hands them to the wallet's delivery
// rule: storeTimes gives the App Store's own signing and purchase times, which no device clock can move).
const TYPE = 'inapp';

function cap() { return (typeof window !== 'undefined' && window.Capacitor) || null; }
export function isNativeShell() {
  try { const C = cap(); return !!(C && C.isNativePlatform && C.isNativePlatform()); } catch (e) { return false; }
}
export function platform() {
  try { const C = cap(); return (C && C.getPlatform && C.getPlatform()) || 'web'; } catch (e) { return 'web'; }
}
export function isIOS() { return isNativeShell() && platform() === 'ios'; }
function plugin() {
  if (!isIOS()) return null;
  const C = cap();
  return (C && C.Plugins && C.Plugins.NativePurchases) || null;
}
export function available() { return !!plugin(); }
function P() { const p = plugin(); if (!p) throw new Error('iap-unavailable'); return p; }
function msgOf(e) { return String((e && (e.message || e.errorMessage)) || e || ''); }

// cancel stays silent, pending (Ask to Buy, a slow card) shows "Waiting for approval" and the item arrives later through
// transactionUpdated or the next launch; everything else is a generic failure. StoreKit's error text is localised, so
// only these plugin strings are matched (the iOS plugin carries no error codes).
export function errorKind(e) {
  const m = msgOf(e);
  if ((e && e.code === 'USER_CANCELED') || /user cancel/i.test(m) || /cancelled by user/i.test(m)) return 'cancelled';
  if (/pending/i.test(m)) return 'pending';
  return 'failed';
}

// a backup for capacitor.config.json plugins.NativePurchases.autoFinishTransactions = false: the game finishes a
// transaction only after its grant is saved (payments.js "grant, save, then finish")
export async function configure() { await P().configure({ autoFinishTransactions: false }); }
// Ask to Buy approvals, purchases made on another device, renewals of nothing (no subscriptions here) while the app runs.
// Capacitor drops events fired before JS listens, so payments.initPayments adds this listener before anything else.
export function onTransaction(fn) { return P().addListener('transactionUpdated', fn); }
// StoreKit's unfinished transactions (a purchase whose grant or finish never completed): the recovery path at launch
export async function unfinished() { const r = await P().getUnfinishedTransactions(); return (r && r.transactions) || []; }

// Localised products -> Map(id -> { identifier, price, priceString, currencyCode, ... }). getProducts silently drops ids
// it cannot find, so gaps are retried one by one, strictly in sequence (the native client does not support parallel
// queries). A product the store does not return stays out of the map (the shop hides it).
export async function products(ids) {
  const p = P(), out = new Map();
  try {
    const r = await p.getProducts({ productIdentifiers: ids, productType: TYPE });
    const list = (r && r.products) || [];
    for (let i = 0; i < list.length; i++) { const sp = list[i]; if (sp && sp.identifier) out.set(sp.identifier, sp); }
  } catch (e) { /* filled one by one below */ }
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (out.has(id)) continue;
    try {
      const r = await p.getProduct({ productIdentifier: id, productType: TYPE });
      if (r && r.product && r.product.identifier === id) out.set(id, r.product);
    } catch (e) { /* not on the store (yet) */ }
  }
  return out;
}

// one purchase -> the StoreKit Transaction { transactionId, productIdentifier, purchaseDate (ISO), revocationDate?, ... }.
// autoAcknowledgePurchases false: payments.js finishes it after the grant is durable.
export function purchase(id, consumable) {
  return P().purchaseProduct({ productIdentifier: id, productType: TYPE, quantity: 1, isConsumable: !!consumable, autoAcknowledgePurchases: false });
}

// the id of the first purchase a StoreKit transaction belongs to (a re-download or restore copy carries the original's
// id, a new purchase its own): the plugin's originalTransactionId when it reports one, else the field of the same name
// in the signed transaction's payload (jwsRepresentation, read here without verifying the signature: the wallet only
// ever uses it to WITHHOLD one-time extras, never to grant anything) -> string ('' when unknown)
export function originalId(tx) {
  if (!tx) return '';
  const v = tx.originalTransactionId !== undefined && tx.originalTransactionId !== null ? tx.originalTransactionId : tx.originalId;
  if (v !== undefined && v !== null && v !== '') return String(v);
  const o = jwsPayload(tx);
  const id = o ? o.originalTransactionId : undefined;
  return id !== undefined && id !== null && id !== '' ? String(id) : '';
}
// the decoded payload of a transaction's jwsRepresentation (StoreKit 2's JWSTransactionDecodedPayload), read without
// verifying the signature: callers only ever use it to WITHHOLD or to time one-time extras -> object | null
function jwsPayload(tx) {
  const parts = tx && typeof tx.jwsRepresentation === 'string' ? tx.jwsRepresentation.split('.') : null;
  if (!parts || parts.length !== 3 || parts[1].length < 8 || typeof atob !== 'function') return null;
  try {
    let b = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    const o = JSON.parse(atob(b));
    return o && typeof o === 'object' ? o : null;
  } catch (e) { return null; }
}
function msOf(v) {
  const t = typeof v === 'number' ? v : (typeof v === 'string' && v !== '' ? (/^\d+$/.test(v) ? Number(v) : Date.parse(v)) : NaN);
  return t === t && isFinite(t) && t > 0 ? t : 0;
}
// the App Store's own times of a transaction -> { signed, purchased } in ms (0 = unknown). Both come from the signed
// payload (signedDate: when the App Store signed it; purchaseDate), else the plugin's fields of the same names. A new
// purchase is signed seconds after it is made; a re-download or restore copy of an old one is signed long after
// (the wallet's delivery rule: economy.js header). The device clock is never involved
export function storeTimes(tx) {
  const out = { signed: 0, purchased: 0 };
  if (!tx) return out;
  const o = jwsPayload(tx);
  if (o) { out.signed = msOf(o.signedDate); out.purchased = msOf(o.purchaseDate); }
  if (!out.signed) out.signed = msOf(tx.signedDate);
  if (!out.purchased) out.purchased = msOf(tx.purchaseDate);
  return out;
}

// true when StoreKit no longer holds the transaction; "not found or already finished" counts as success (a finish
// retried after a crash). Any other failure -> false: the transaction stays unfinished and is redelivered at the next
// launch, where the wallet's ledger blocks a second grant.
export async function finish(transactionId) {
  try { await P().finishTransaction({ transactionId: String(transactionId) }); return true; }
  catch (e) { return /not found or already finished/i.test(msgOf(e)); }
}

// AppStore.sync: may show an Apple ID sheet, so call it ONLY from a user tap (Restore Purchases)
export async function restore() { await P().restorePurchases(); }
// Transaction.currentEntitlements of THIS Apple ID (never consumables). Never the default getPurchases form, which
// covers other Apple IDs.
export async function entitlements() {
  const r = await P().getPurchases({ productType: TYPE, onlyCurrentEntitlements: true });
  return (r && r.purchases) || [];
}
