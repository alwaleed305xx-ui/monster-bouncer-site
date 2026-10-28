// catalog.js: the Monster Bouncer / بودي قارد الوحوش economy CATALOG (docs/MONETIZATION.md §11.2): pure frozen data +
// lookups + selfTest(), no state, no DOM. The 22 in-app purchases of ALL_PRODUCTS mirror store/iap.json (same ids, types
// and USD base prices; NON_CONSUMABLE = the 11 restorable ones); PRODUCTS / PRODUCT_IDS are the ones THIS build sells
// (ALL_PRODUCTS minus HOLD_BACK: everything the shop lists, prices and buys), while productById() resolves all 22 so a
// paid transaction of any of them always finds its row. The 62 cosmetics of §3 (8 party themes, 35 band outfits = 7 outfit
// themes x 5 species, 7 ropes, 6 doors, 6 plates: 4 defaults, the Star Road freebies, the purchase exclusives, the theme
// bundles' items), boosters + Reopen prices and gates, the free gem sources (EARN, STREAK milestones, STAR_ROAD, the 20
// MEDALS = 785 gems, the daily GIFT cycle, the All-Nighter's daily gems), PIGGY, PASS (with its run bonus), VIP, the
// GOLD_ROAD premium track, FIRST_BUY (the three small gem packs pay double on their first purchase) and the OFFERS caps.
// The wallet (js/game/economy.js, which re-exports everything here) holds the state; payments.js / iap.js take product
// ids and NON_CONSUMABLE from here.
// Item rows { id, slot, gems (null = not sold for gems), via: 'default'|'shop'|'starter'|'vip', theme?, species?,
// bundle? (the theme-bundle product holding it: always an 'mb_bundle_<theme>' id), pack? (another money product made
// for it: the Crystal Street Set), road? (the Star Road step that gives it), gold? (the Gold Star Road step that gives
// it) }. Product rows { id, type: 'consumable'|'nonconsumable', usd, kind: 'gems'|'starter'|'vip'|'pass'|'bundle'|'set'|
// 'pro'|'owner'|'goldroad'|'boosters'|'piggy', gems?, bonus?, items?, boosters?, days?, perDay?, theme?, after? (pro:
// listed from the first launch at the bottom of Shop > Gems until that product is owned, then as Deals' personal offer in
// its place: wallet.dealLate) }.
// Added products (2026-10-25): mb_gems_300 (the SAR 11.99 impulse tier), mb_bundle_space / mb_bundle_spooky (every paid
// party theme now has a money bundle), mb_set_crystal (the Crystal rope + door + plate), mb_gold_road (a permanent second
// reward on every Star Road step), mb_pro_pack (the follow-up to the Starter Pack), mb_club_owner (Club Owner: Launch
// Set, the 51 launch cosmetics, the whale anchor at $49.99) and mb_booster_mega. Ids are never reused or renamed and types
// never change (App Store rule). Lookups return the frozen rows (never mutate them).
// Tuning of 2026-10-25 (review p4, docs/MONETIZATION.md §5): the piggy is the best gems per dollar on screen when full
// (500 to 1,500 for $2.99), First buy x2 only on the 100 / 315 / 550 packs, the Starter popup from night 3, Club Owner
// $49.99 (the 51 launch cosmetics), the Club Pass pays +10 gems a day on a 3+ day run of opens (never a forfeit).
// Review p5 (MONETIZATION §2.6, §12): HOLD_BACK keeps mb_gems_15000 off sale while gemSinks() (10,900 at launch) is under
// SINK_GATE (25,000; the selfTest ties the two), VIP Rope also doubles the piggy fill (VIP.piggyMult, derived from the
// owned flag, so Restore brings it back), and a gem-heavy pack added later is a CONSUMABLE with in-app "once" logic (the
// Starter / Pro Pack gems sit in non-consumables, so Restore never brings them back: their cards and Terms say so).
import { SPECIES } from './data.js';

function freezeDeep(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    for (const k in o) freezeDeep(o[k]);
    Object.freeze(o);
  }
  return o;
}

export const SLOTS = Object.freeze(['club', 'rope', 'door', 'plate', 'outfit']);
export const DEFAULTS = Object.freeze({ club: 'club.house', rope: 'rope.velvet', door: 'door.brass', plate: 'plate.classic', outfit: '' });
export const OUTFIT_THEMES = Object.freeze(['neon', 'royal', 'desert', 'beach', 'space', 'spooky', 'rock']);
export const CLUB_THEMES = Object.freeze(['house', 'neon', 'royal', 'desert', 'space', 'beach', 'spooky', 'vip']);
export const SET_LOOK = 96;                                  // a set costs 96 gems per look still missing (480 for a full set)
export const BOOSTER_IDS = Object.freeze(['xray', 'slowmo', 'second']);
export const BOOSTERS = freezeDeep({
  xray: { gems: 25, pack5: 110, fromNight: 4, guests: 5 },
  slowmo: { gems: 20, pack5: 90, fromNight: 3, patience: 1.5 },
  second: { gems: 30, pack5: 135, fromNight: 3 },
  cap: 99,                                                   // inventory cap of each booster (never expires)
});
export const REOPEN = freezeDeep({ prices: [30, 60, 120], fromNight: 3, firstFree: true, restAfter: 3, restHours: 24 });
export const EARN = freezeDeep({
  welcome: { gems: 50, boosters: { xray: 1, slowmo: 1, second: 1 } },
  perStar: 2, firstPass: 3, newGold: 5, dailyPlayed: 3, band: 25, look: 5, vipMult: 2,
  // the All-Nighter, once per local day: `gems` when a run reaches `from` guests, +1 per `every` beyond, at most `max`
  // (not doubled by VIP, no piggy; the shared best is untouched)
  endless: { from: 20, gems: 5, every: 10, max: 10 },
});
export const STREAK = freezeDeep([
  { days: 3, gems: 20 }, { days: 7, gems: 50, boosters: { slowmo: 1 } }, { days: 14, gems: 80 },
  { days: 30, gems: 150, boosters: { xray: 1, slowmo: 1, second: 1 } }, { days: 60, gems: 200 }, { days: 100, gems: 300 },
]);
export const STAR_ROAD = freezeDeep({
  steps: [
    { stars: 12, gems: 30 }, { stars: 24, item: 'rope.silver' }, { stars: 40, boosters: { xray: 1, slowmo: 1, second: 1 } },
    { stars: 56, item: 'plate.studs' }, { stars: 75, gems: 60 }, { stars: 100, item: 'club.beach' },
    { stars: 125, gems: 80, boosters: { xray: 1, slowmo: 1, second: 1 } }, { stars: 150, item: 'door.oak' },
    { stars: 180, gems: 100 }, { stars: 220, set: 'beach' },
  ],
  after: 220, every: 40, gems: 100,                          // then 100 gems every 40 stars, for ever
});
// stat: 'passed' (nights passed), 'nights' (the night reached), 'golds', 'band', 'looks' (colour looks owned, house
// looks included: 30 in all), 'busted', 'shift', 'quick', 'combo' (best in one run), 'dailies' (counted), 'endless' (best)
export const MEDALS = freezeDeep([
  { id: 'first_pass', stat: 'passed', goal: 1, gems: 10 },
  { id: 'first_gold', stat: 'golds', goal: 1, gems: 20 },
  { id: 'gold_10', stat: 'golds', goal: 10, gems: 40 },
  { id: 'night_10', stat: 'nights', goal: 10, gems: 25 },
  { id: 'night_25', stat: 'nights', goal: 25, gems: 50 },
  { id: 'night_50', stat: 'nights', goal: 50, gems: 100 },
  { id: 'band_full', stat: 'band', goal: 5, gems: 50 },
  { id: 'looks_10', stat: 'looks', goal: 10, gems: 25 },
  { id: 'looks_all', stat: 'looks', goal: 30, gems: 100 },
  { id: 'busted_10', stat: 'busted', goal: 10, gems: 15 },
  { id: 'busted_100', stat: 'busted', goal: 100, gems: 50 },
  { id: 'shift_10', stat: 'shift', goal: 10, gems: 15 },
  { id: 'shift_50', stat: 'shift', goal: 50, gems: 40 },
  { id: 'quick_50', stat: 'quick', goal: 50, gems: 15 },
  { id: 'quick_500', stat: 'quick', goal: 500, gems: 60 },
  { id: 'combo_10', stat: 'combo', goal: 10, gems: 15 },
  { id: 'combo_20', stat: 'combo', goal: 20, gems: 30 },
  { id: 'daily_7', stat: 'dailies', goal: 7, gems: 25 },
  { id: 'daily_30', stat: 'dailies', goal: 30, gems: 60 },
  { id: 'endless_50', stat: 'endless', goal: 50, gems: 40 },
]);
export const GIFT = freezeDeep({ cycle: [5, 5, 5, 5, 5, 5, 15], seventh: { xray: 1 } });
// the piggy (mb_piggy_break, $2.99): every wallet starts with `start` (= minBreak, so App Review can buy it on a fresh
// install), then fills from play; full it is the best gems per dollar in the shop (1,500 / $2.99 ≈ 500 a dollar, against
// 202 to 251 for the First buy packs and the Starter's gems), which is what makes a piggy convert. After a break, 17
// passed nights refill it to the minimum and 50 to full (half that on Gold runs, half again with VIP: VIP.piggyMult)
export const PIGGY = freezeDeep({ start: 500, minBreak: 500, cap: 1500, perPass: 30, perGold: 60 });
// the Club Pass: `gems` + 1 booster (rotate) per day for `days`, missed days paid later. run: on every local day the app
// is opened while the pass delivers, a run of `from`+ days in a row adds `gems` (a missed day only restarts the run: the
// deliveries themselves are never forfeited)
export const PASS = freezeDeep({ days: 30, gems: 50, rotate: ['xray', 'slowmo', 'second'], run: { from: 3, gems: 10 } });
// VIP Rope (mb_vip_rope, $6.99), every perk derived from the owned flag (Restore brings all of it back, a refund takes it):
// mult x the night rows (EARN.vipMult), the VIP rope + lounge, xrayPerDay free X-Ray, and piggyMult x every piggy fill
// (30 -> 60 a passed night, 60 -> 120 a Gold: about +900 piggy gems a month for a daily player, which also brings the
// next Break the Piggy sooner)
export const VIP = freezeDeep({ mult: 2, items: ['rope.vip', 'club.vip'], xrayPerDay: 1, piggyMult: 2 });
// gapMs: the "never two offers back to back" rule (no other offer within this long of one being shown).
// starterAt 4: the one automatic modal (the Starter Pack popup) waits for the first home visit after night 3 (boosters
// have just unlocked, the band ceremony comes first; most first-day churn happens before night 5, so it must come
// earlier than that). The Starter Pack is in Deals from the first launch for App Review.
// starterPill: ONE more, non-modal surfacing of the Starter Pack (a home news pill, no countdown, never after a purchase):
// after the first Shut Down on night `night` or later, or `afterH` hours after the popup was shown.
// piggy: the full-piggy pill rests piggyEveryH between shows and stops after piggyMaxShows per fill (a break resets it).
export const OFFERS = freezeDeep({ minNight: 3, perSession: 1, perDay: 2, starterAt: 4, vip: { minNight: 6, perDay: 1, maxDismiss: 5 },
  starterPill: { night: 5, afterH: 72 }, piggyEveryH: 168, piggyMaxShows: 3, gapMs: 90000 });
// the first purchase of each of the three small gem packs (per wallet) pays `mult` x its gems ("First buy: x2" ribbon):
// the x2 converts first-time buyers, while the big packs keep their stated value (a first $49.99 / $99.99 at x2 would
// hand out 14,000 / 30,000 gems, more than every cosmetic in the game costs)
export const FIRST_BUY = freezeDeep({ mult: 2, packs: ['mb_gems_100', 'mb_gems_300', 'mb_gems_550'] });
// this gem pack pays FIRST_BUY.mult on its first purchase (the wallet keeps which ones were bought)
export function firstBuyPack(id) { return FIRST_BUY.packs.indexOf(id) >= 0; }
// the Gold Star Road (mb_gold_road, permanent, no season timer): a second reward on every Star Road step (steps[k] pairs
// with STAR_ROAD.steps[k]), then `every` on each 40-star step after 220. Owning it pays back the steps already reached.
// Its items stay on sale for gems (an item already owned pays its gem price as gems instead, as the free road does).
export const GOLD_ROAD = freezeDeep({
  product: 'mb_gold_road',
  steps: [
    { gems: 60 }, { boosters: { xray: 1, slowmo: 1, second: 1 } }, { item: 'plate.gold' }, { gems: 100 },
    { boosters: { xray: 2, slowmo: 2, second: 2 } }, { item: 'door.royal' }, { gems: 150 }, { item: 'rope.royal' },
    { gems: 200, boosters: { xray: 2, slowmo: 2, second: 2 } }, { item: 'door.najdi' },
  ],
  every: { gems: 100 },
});

// ---- the 62 cosmetics (§3 tables). gems: price (null = not sold for gems); via: 'default'|'shop'|'starter'|'vip';
// bundle: the theme-bundle product that holds it; road: the Star Road step (stars) that gives it for free
const ITEM_LIST = [];
function addItem(id, slot, gems, via, extra) {
  const r = { id: id, slot: slot, gems: gems, via: via };
  if (extra) for (const k in extra) if (extra[k] !== undefined) r[k] = extra[k];
  ITEM_LIST.push(r);
}
const BUNDLE_OF = { neon: 'mb_bundle_neon', royal: 'mb_bundle_royal', desert: 'mb_bundle_desert', space: 'mb_bundle_space', spooky: 'mb_bundle_spooky' };
addItem('club.house', 'club', null, 'default', { theme: 'house' });
addItem('club.neon', 'club', 600, 'shop', { theme: 'neon', bundle: 'mb_bundle_neon' });
addItem('club.royal', 'club', 600, 'shop', { theme: 'royal', bundle: 'mb_bundle_royal' });
addItem('club.desert', 'club', 600, 'shop', { theme: 'desert', bundle: 'mb_bundle_desert' });
addItem('club.space', 'club', 600, 'shop', { theme: 'space', bundle: 'mb_bundle_space' });
addItem('club.beach', 'club', 500, 'shop', { theme: 'beach', road: 100 });
addItem('club.spooky', 'club', 500, 'shop', { theme: 'spooky', bundle: 'mb_bundle_spooky' });
addItem('club.vip', 'club', null, 'vip', { theme: 'vip' });
for (let i = 0; i < OUTFIT_THEMES.length; i++) {
  const th = OUTFIT_THEMES[i], rock = th === 'rock';
  for (let j = 0; j < SPECIES.length; j++) {
    addItem('outfit.' + th + '.' + SPECIES[j], 'outfit', rock ? null : 120, rock ? 'starter' : 'shop',
      { theme: th, species: SPECIES[j], bundle: BUNDLE_OF[th], road: th === 'beach' ? 220 : undefined });
  }
}
addItem('rope.velvet', 'rope', null, 'default');
addItem('rope.silver', 'rope', 150, 'shop', { road: 24 });
addItem('rope.candy', 'rope', 200, 'shop');
addItem('rope.neon', 'rope', 250, 'shop');
addItem('rope.royal', 'rope', 250, 'shop', { gold: 150 });
addItem('rope.crystal', 'rope', 300, 'shop', { pack: 'mb_set_crystal' });
addItem('rope.vip', 'rope', null, 'vip');
addItem('door.brass', 'door', null, 'default');
addItem('door.oak', 'door', 200, 'shop', { road: 150 });
addItem('door.najdi', 'door', 300, 'shop', { gold: 220 });
addItem('door.neon', 'door', 250, 'shop');
addItem('door.royal', 'door', 300, 'shop', { gold: 100 });
addItem('door.crystal', 'door', 300, 'shop', { pack: 'mb_set_crystal' });
addItem('plate.classic', 'plate', null, 'default');
addItem('plate.studs', 'plate', 150, 'shop', { road: 56 });
addItem('plate.candy', 'plate', 250, 'shop');
addItem('plate.neon', 'plate', 300, 'shop');
addItem('plate.gold', 'plate', 350, 'shop', { gold: 40 });
addItem('plate.crystal', 'plate', 350, 'shop', { pack: 'mb_set_crystal' });
export const ITEMS = freezeDeep(ITEM_LIST);

const ITEM_MAP = new Map();
for (let i = 0; i < ITEMS.length; i++) ITEM_MAP.set(ITEMS[i].id, ITEMS[i]);
const SLOT_LISTS = {};
for (let i = 0; i < SLOTS.length; i++) {
  const s = SLOTS[i], L = [];
  for (let j = 0; j < ITEMS.length; j++) if (ITEMS[j].slot === s) L.push(ITEMS[j]);
  SLOT_LISTS[s] = Object.freeze(L);
}
const SET_LISTS = {};
for (let i = 0; i < OUTFIT_THEMES.length; i++) {
  const th = OUTFIT_THEMES[i], L = [];
  for (let j = 0; j < SPECIES.length; j++) L.push('outfit.' + th + '.' + SPECIES[j]);
  SET_LISTS[th] = Object.freeze(L);
}
const NOLIST = Object.freeze([]);
export function itemById(id) { return typeof id === 'string' ? ITEM_MAP.get(id) || null : null; }
export function itemsBySlot(slot) { return SLOT_LISTS[slot] || NOLIST; }
export function setItems(theme) { return SET_LISTS[theme] || NOLIST; }

// every gem a player can sink into cosmetics: the gem prices of all the items sold for gems (10,900 at launch; boosters
// and Reopen are repeat sinks on top). HOLD_BACK's gate and MONETIZATION §2.6 / §12 read it
const GEM_SINKS = ITEMS.reduce((n, it) => n + (it.via === 'shop' && it.gems > 0 ? it.gems : 0), 0);
export function gemSinks() { return GEM_SINKS; }

// ---- the 22 in-app purchases (store/iap.json, same order). type 'consumable'|'nonconsumable'; usd: the USA base price
// (the shop shows the store's own priceString on native); gems: what is granted (bonus included; pass: per day).
// The gem packs stay in ascending order (the shop numbers its pack art and names by their order: shop.pack_1..7).
function bundleRow(theme, usd) {
  const items = ['club.' + theme];
  const L = setItems(theme);
  for (let i = 0; i < L.length; i++) items.push(L[i]);
  return { id: 'mb_bundle_' + theme, type: 'nonconsumable', usd: usd, kind: 'bundle', theme: theme, items: items };
}
// Club Owner: Launch Set: the 51 cosmetics sold for gems when this catalog first shipped. The list is FROZEN on purpose:
// a cosmetic added later is never slipped into it (the selfTest pins it at 51 items worth 10,900 gems); every content
// drop sells as its own new product id instead (a monthly theme bundle, a seasonal Gold Road: MONETIZATION §12)
const OWNER_ITEMS = [];
for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i].via === 'shop' && ITEMS[i].gems > 0) OWNER_ITEMS.push(ITEMS[i].id);
// HOLD_BACK: store/iap.json ids this build does not sell (not listed, priced or bought; left off the submission:
// tools/asc.py HOLD_BACK_FROM_FIRST_SUBMISSION must list the same ids, or App Review looks for a product the shop never
// shows). A held id must be the LAST of its kind, so the shop's pack art / names keep their numbers. mb_gems_15000
// ($99.99) waits while gemSinks() < SINK_GATE: 15,000 gems against 10,900 of cosmetics would leave a top spender with
// gems and nothing to buy. When a content update takes the sinks past the gate (the 1.1 prestige items, §12), empty
// HOLD_BACK, the asc.py tuple and §9.1 together, and attach the pack to that version
export const SINK_GATE = 25000;
export const HOLD_BACK = Object.freeze(['mb_gems_15000']);
export const ALL_PRODUCTS = freezeDeep([
  { id: 'mb_gems_100', type: 'consumable', usd: 0.99, kind: 'gems', gems: 100, bonus: 0 },
  { id: 'mb_gems_300', type: 'consumable', usd: 2.99, kind: 'gems', gems: 315, bonus: 5 },
  { id: 'mb_gems_550', type: 'consumable', usd: 4.99, kind: 'gems', gems: 550, bonus: 10 },
  { id: 'mb_gems_1200', type: 'consumable', usd: 9.99, kind: 'gems', gems: 1200, bonus: 20 },
  { id: 'mb_gems_2600', type: 'consumable', usd: 19.99, kind: 'gems', gems: 2600, bonus: 30 },
  { id: 'mb_gems_7000', type: 'consumable', usd: 49.99, kind: 'gems', gems: 7000, bonus: 40 },
  { id: 'mb_gems_15000', type: 'consumable', usd: 99.99, kind: 'gems', gems: 15000, bonus: 50 },
  { id: 'mb_starter_pack', type: 'nonconsumable', usd: 1.99, kind: 'starter', gems: 500, items: setItems('rock').slice(),
    boosters: { xray: 3, slowmo: 3, second: 3 } },
  { id: 'mb_vip_rope', type: 'nonconsumable', usd: 6.99, kind: 'vip', items: VIP.items.slice() },
  { id: 'mb_club_pass_30d', type: 'consumable', usd: 4.99, kind: 'pass', days: 30, perDay: 50 },
  bundleRow('neon', 2.99),
  bundleRow('desert', 2.99),
  bundleRow('royal', 2.99),
  { id: 'mb_booster_bundle', type: 'consumable', usd: 1.99, kind: 'boosters', boosters: { xray: 5, slowmo: 5, second: 5 } },
  { id: 'mb_piggy_break', type: 'consumable', usd: 2.99, kind: 'piggy' },
  bundleRow('space', 2.99),
  bundleRow('spooky', 2.99),
  { id: 'mb_set_crystal', type: 'nonconsumable', usd: 2.99, kind: 'set', items: ['rope.crystal', 'door.crystal', 'plate.crystal'] },
  { id: 'mb_gold_road', type: 'nonconsumable', usd: 4.99, kind: 'goldroad' },
  { id: 'mb_pro_pack', type: 'nonconsumable', usd: 4.99, kind: 'pro', gems: 1200, items: setItems('beach').concat(['rope.neon']),
    after: 'mb_starter_pack' },
  { id: 'mb_club_owner', type: 'nonconsumable', usd: 49.99, kind: 'owner', items: OWNER_ITEMS },
  { id: 'mb_booster_mega', type: 'consumable', usd: 4.99, kind: 'boosters', boosters: { xray: 15, slowmo: 15, second: 15 } },
]);
export const NON_CONSUMABLE = Object.freeze(['mb_starter_pack', 'mb_vip_rope', 'mb_bundle_neon', 'mb_bundle_desert', 'mb_bundle_royal',
  'mb_bundle_space', 'mb_bundle_spooky', 'mb_set_crystal', 'mb_gold_road', 'mb_pro_pack', 'mb_club_owner']);
// the products this build sells (ALL_PRODUCTS order, HOLD_BACK aside): what the shop lists and payments prices and buys
export const PRODUCTS = Object.freeze(ALL_PRODUCTS.filter(p => HOLD_BACK.indexOf(p.id) < 0));
export const PRODUCT_IDS = Object.freeze(PRODUCTS.map(p => p.id));
const PRODUCT_MAP = new Map();
for (let i = 0; i < ALL_PRODUCTS.length; i++) PRODUCT_MAP.set(ALL_PRODUCTS[i].id, ALL_PRODUCTS[i]);
// any of the 22 (a held one too: a delivered transaction always finds its row) -> row | null
export function productById(id) { return typeof id === 'string' ? PRODUCT_MAP.get(id) || null : null; }
// this build sells it (a known id, not held back)
export function onSale(id) { return !!productById(id) && HOLD_BACK.indexOf(id) < 0; }
export function gemPacks() { return GEM_PACKS; }
const GEM_PACKS = Object.freeze(PRODUCTS.filter(p => p.kind === 'gems'));
const ALL_PACKS = Object.freeze(ALL_PRODUCTS.filter(p => p.kind === 'gems'));
// the "Best value" badge: the lowest USD per 1,000 gems among the packs on sale (no fake "Most popular")
export function bestValueId() {
  let best = null, bv = Infinity;
  for (let i = 0; i < GEM_PACKS.length; i++) { const p = GEM_PACKS[i], v = p.usd / p.gems * 1000; if (v < bv) { bv = v; best = p.id; } }
  return best;
}
// a content product's value in gems at the shop's own prices (bundles, the Crystal set, the Pro Pack, Club Owner: the
// "Worth N gems" value anchor; items only, the Pro Pack's 1,200 gems not included)
export function bundleWorth(productId) {
  const p = productById(productId);
  if (!p || !p.items) return 0;
  let n = 0;
  for (let i = 0; i < p.items.length; i++) { const it = itemById(p.items[i]); if (it && it.gems) n += it.gems; }
  return n;
}

// catalog self-test (§11.2): -> { ok, report }
export function selfTest() {
  const lines = [];
  let ok = true;
  function check(c, name) { lines.push((c ? 'PASS ' : 'FAIL ') + name); if (!c) ok = false; }
  const ids = {};
  let dup = false;
  for (let i = 0; i < ITEMS.length; i++) { if (ids[ITEMS[i].id]) dup = true; ids[ITEMS[i].id] = 1; }
  for (let i = 0; i < ALL_PRODUCTS.length; i++) { if (ids[ALL_PRODUCTS[i].id]) dup = true; ids[ALL_PRODUCTS[i].id] = 1; }
  check(!dup, 'item + product ids unique');
  check(ITEMS.length === 62, '62 cosmetics (' + ITEMS.length + ')');
  check(ALL_PRODUCTS.length === 22, '22 products in store/iap.json (' + ALL_PRODUCTS.length + ')');
  let ascending = true, lastGems = 0;
  for (let i = 0; i < ALL_PACKS.length; i++) { if (!(ALL_PACKS[i].gems > lastGems)) ascending = false; lastGems = ALL_PACKS[i].gems; }
  check(ALL_PACKS.length === 7 && ascending, '7 gem packs in ascending order (the shop numbers its pack art by order)');
  // HOLD_BACK: known consumable ids, each the last of its kind (the shop's pack numbers do not shift), never restorable;
  // the 15,000 pack is held exactly while the gem sinks are under SINK_GATE
  let held = true;
  for (let i = 0; i < HOLD_BACK.length; i++) {
    const p = productById(HOLD_BACK[i]);
    if (!p || p.type !== 'consumable' || NON_CONSUMABLE.indexOf(p.id) >= 0 || onSale(p.id)) { held = false; continue; }
    for (let j = ALL_PRODUCTS.indexOf(p) + 1; j < ALL_PRODUCTS.length; j++) if (ALL_PRODUCTS[j].kind === p.kind && onSale(ALL_PRODUCTS[j].id)) held = false;
  }
  check(held && PRODUCTS.length === ALL_PRODUCTS.length - HOLD_BACK.length && PRODUCT_IDS.length === PRODUCTS.length,
    'PRODUCTS = the ' + PRODUCTS.length + ' on sale (HOLD_BACK aside: ' + HOLD_BACK.join(', ') + '; last of their kind, consumable)');
  check((HOLD_BACK.indexOf('mb_gems_15000') >= 0) === (gemSinks() < SINK_GATE),
    'the 15,000 pack is held back exactly while the gem sinks are under ' + SINK_GATE + ' (' + gemSinks() + ')');
  let five = true;
  for (let i = 0; i < OUTFIT_THEMES.length; i++) {
    const L = setItems(OUTFIT_THEMES[i]);
    if (L.length !== 5) five = false;
    for (let j = 0; j < L.length; j++) { const it = itemById(L[j]); if (!it || it.species !== SPECIES[j] || it.slot !== 'outfit') five = false; }
  }
  check(five, '5 species per outfit theme, in data.SPECIES order');
  let bundles = true, nb = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p.kind !== 'bundle') continue;
    nb++;
    if (p.items.length !== 6 || p.id !== 'mb_bundle_' + p.theme) bundles = false;
    for (let j = 0; j < p.items.length; j++) { const it = itemById(p.items[j]); if (!it || !(it.gems > 0) || it.bundle !== p.id) bundles = false; }
  }
  check(bundles && nb === 5, '5 theme bundles: items exist, are gem-priced and point back at their bundle');
  let paid = 0;
  for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i].via === 'shop' && ITEMS[i].bundle) paid++;
  check(paid === 30, 'every gem-sold party theme but Beach (a Star Road reward) has a money bundle (' + paid + ' items)');
  let content = true;
  const kinds = { set: 0, pro: 0, owner: 0 };
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (!(p.kind in kinds)) continue;
    kinds[p.kind]++;
    if (p.type !== 'nonconsumable' || !p.items || !p.items.length) content = false;
    for (let j = 0; j < p.items.length; j++) { const it = itemById(p.items[j]); if (!it || !(it.gems > 0) || it.via !== 'shop') content = false; }
  }
  const owner = productById('mb_club_owner'), crystal = productById('mb_set_crystal');
  check(content && kinds.set === 1 && kinds.pro === 1 && kinds.owner === 1, 'Crystal set, Pro Pack and Club Owner hold gem-sold items only');
  check(owner && owner.items.length === 51 && bundleWorth('mb_club_owner') === 10900 && gemSinks() === 10900,
    'Club Owner: Launch Set = the 51 launch cosmetics (a frozen list), worth 10,900 gems = every gem sink today (' +
    (owner ? owner.items.length : 0) + ', ' + bundleWorth('mb_club_owner') + ', ' + gemSinks() + ')');
  check(crystal && bundleWorth('mb_set_crystal') === 950 && crystal.items.every(id => itemById(id).pack === 'mb_set_crystal'), 'Crystal Street Set: 950 gems of content, items point back at it');
  let gold = GOLD_ROAD.steps.length === STAR_ROAD.steps.length && !!productById(GOLD_ROAD.product), goldItems = 0;
  for (let i = 0; i < GOLD_ROAD.steps.length; i++) {
    const s = GOLD_ROAD.steps[i];
    if (!(s.gems > 0) && !s.boosters && !s.item) gold = false;
    if (s.item) { goldItems++; const it = itemById(s.item); if (!it || !(it.gems > 0) || it.gold !== STAR_ROAD.steps[i].stars || it.bundle || it.road) gold = false; }
  }
  check(gold && goldItems === 4 && GOLD_ROAD.every.gems > 0, 'Gold Star Road: one reward per Star Road step, 4 cosmetics (none in a theme bundle or on the free road)');
  let small = FIRST_BUY.mult === 2 && FIRST_BUY.packs.length === 3;
  for (let i = 0; i < GEM_PACKS.length; i++) if (firstBuyPack(GEM_PACKS[i].id) !== (i < 3)) small = false;
  check(small, 'First buy x2 on the three smallest gem packs only (100 / 315 / 550)');
  // the piggy converts only when breaking it full is clearly the best deal on screen: gems per dollar above every pack
  // (First buy x2 included) and above the Starter Pack's gems
  const pig = productById('mb_piggy_break'), starter = productById('mb_starter_pack');
  let rival = starter.gems / starter.usd;
  for (let i = 0; i < ALL_PACKS.length; i++) {
    const p = ALL_PACKS[i], v = (firstBuyPack(p.id) ? p.gems * FIRST_BUY.mult : p.gems) / p.usd;
    if (v > rival) rival = v;
  }
  check(!!pig && PIGGY.cap / pig.usd > rival * 1.5 && PIGGY.minBreak / pig.usd > 150,
    'a full piggy is the best gems per dollar in the shop (' + Math.round(PIGGY.cap / pig.usd) + ' vs ' + Math.round(rival) + ')');
  check(PASS.run.from >= 2 && PASS.run.gems > 0 && PASS.run.gems * PASS.days < PASS.gems * PASS.days / 2, 'Club Pass run bonus is small and additive');
  check(owner && owner.usd >= 49.99 && bundleWorth('mb_club_owner') / (owner.usd * 100) > 2, 'Club Owner $49.99: still worth over 2x its price in gems');
  check(EARN.endless.from > 0 && EARN.endless.max >= EARN.endless.gems, 'All-Nighter daily gems are bounded');
  let excl = true, defs = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    if ((it.via === 'starter' || it.via === 'vip' || it.via === 'default') && it.gems !== null) excl = false;
    if (it.via === 'shop' && !(it.gems > 0)) excl = false;
    if (it.via === 'default') defs++;
  }
  check(excl, 'exclusives and defaults have gems null, shop items a price');
  check(defs === 4, '4 defaults');
  let defOk = true;
  for (let i = 0; i < SLOTS.length; i++) { const s = SLOTS[i]; if (s !== 'outfit') { const it = itemById(DEFAULTS[s]); if (!it || it.via !== 'default' || it.slot !== s) defOk = false; } }
  check(defOk, 'DEFAULTS are the default items of their slots');
  check(PIGGY.start === PIGGY.minBreak && PIGGY.cap > PIGGY.minBreak && PIGGY.perGold > PIGGY.perPass, 'piggy start == minBreak < cap, a Gold run fills it faster');
  check(VIP.piggyMult === 2 && PIGGY.perGold * VIP.piggyMult < PIGGY.minBreak, 'VIP doubles every piggy fill (a VIP Gold night: +' + PIGGY.perGold * VIP.piggyMult + ')');
  const pro = productById('mb_pro_pack');
  check(!!pro && productById(pro.after) && productById(pro.after).type === 'nonconsumable' && pro.minNight === undefined,
    'Pro Pack: listed from the first launch, moves up once ' + (pro ? pro.after : '?') + ' is owned');
  let packs = true;
  for (let i = 0; i < ALL_PACKS.length; i++) { const p = ALL_PACKS[i], base = Math.round(p.usd + 0.01) * 100; if (p.gems !== Math.round(base * (1 + p.bonus / 100))) packs = false; }
  check(packs, 'pack bonus labels match their amounts');
  let road = true;
  for (let i = 0; i < STAR_ROAD.steps.length; i++) {
    const s = STAR_ROAD.steps[i];
    if (i > 0 && !(s.stars > STAR_ROAD.steps[i - 1].stars)) road = false;
    if (s.item && !itemById(s.item)) road = false;
    if (s.item && itemById(s.item).road !== s.stars) road = false;
    if (s.set && setItems(s.set).length !== 5) road = false;
  }
  check(road, 'Star Road steps ascend and their items exist');
  let medals = 0;
  for (let i = 0; i < MEDALS.length; i++) medals += MEDALS[i].gems;
  check(MEDALS.length === 20 && medals === 785, '20 medals worth 785 gems (' + medals + ')');
  let nc = true;
  for (let i = 0; i < NON_CONSUMABLE.length; i++) { const p = productById(NON_CONSUMABLE[i]); if (!p || p.type !== 'nonconsumable') nc = false; }
  let ncCount = 0;
  for (let i = 0; i < ALL_PRODUCTS.length; i++) if (ALL_PRODUCTS[i].type === 'nonconsumable') ncCount++;
  check(nc && ncCount === NON_CONSUMABLE.length, 'NON_CONSUMABLE matches the nonconsumable rows');
  let allGems = 0;
  for (let i = 0; i < ITEMS.length; i++) { const it = ITEMS[i]; if (it.gems && it.slot !== 'outfit') allGems += it.gems; }
  for (let i = 0; i < OUTFIT_THEMES.length; i++) if (OUTFIT_THEMES[i] !== 'rock') allGems += 5 * SET_LOOK;
  check(Math.abs(allGems - 10200) <= 100, 'every gem cosmetic: 10,900 at item prices, about 10,200 with the outfits bought as sets (' + allGems + ')');
  const bestWant = onSale('mb_gems_15000') ? 'mb_gems_15000' : 'mb_gems_7000';
  check(bestValueId() === bestWant, 'best value is computed among the packs on sale (' + bestValueId() + ')');
  return { ok: ok, report: lines.join('\n') };
}
