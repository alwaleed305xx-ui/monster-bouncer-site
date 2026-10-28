// Monster Bouncer data + rules engine (GAME-SPEC §2), pure logic with no DOM: the cast attributes, the difficulty ladder, seeded
// rule / guest / night generation under the fairness contract (IN-rate 35-65 %, verdict runs <= 3, plain first 5 guests,
// trap liars whose fake prop would flip the verdict if it were real, verdict-flipping shapeshifters, mid-night rule
// mutations), the endless ramp, the daily seed and selfTest() which proves every invariant over thousands of guests.
// The ladder adds ONE new thing per night (nightParams): 1 a 'must have' rule on colour or eye count, 2 hats (the rule is
// about the hat), 3 the first red slash ('must NOT', on a tail), 4 mixed polarity + the LIARS debut (exactly 2, the play
// scene's one-time hint), 5 two clauses read as AND, 6 the SHAPESHIFTERS debut (exactly 2), 7 the pattern (every
// attribute; the rule is about stripes / dots), 8 the first mid-night rule change, 11 the first 3-clause poster (the
// re-pin), then ONE twist a night on that base (TUNE.mods / TUNE.ladder, p.mod, nightMod(n)): 12 Liar Night (4 liars),
// 13 Double Rule Change (re-pins at guests 8 + 15), 14 Shapeshifter Night (3), 15 Big Night (24 guests), 16 Rush Hour
// (patience x 0.88, a fast line), 17 Early Rule Change (3 clauses from guest 7), 18 Close Calls (every OUT guest misses
// by one clause), 19 Masquerade (3 + 3 tricks); 20 three clauses from the start, and from 21 the twists rotate over it
// (one plain night in eight). No two of these meet on one night, and every attribute is on a poster before
// it can appear beside another new thing. Patience eases down night by night (6.5 s for nights 1-3 -> 5.0 s at 6 ->
// 4.4 s at 10 -> 3.8 s at 15, then -40 ms a night to a 3.0 s floor at 35; the All-Nighter 5.5 -> 2.6 s by guest 80); any
// per-guest load bonus (clauses, tricks, a fresh re-pin) and the quick-call reward are the play scene's, on top.
// Trick guests come in exact per-night QUOTAS on slots from guest 6, planned before the verdicts (exactly 2 on the night a
// kind debuts, then 3-5 tricks a night in all; a liar's verdict is pinned to one its fake can flip, so the fake always
// matters; two tricks of a kind are never neighbours and any two avoid it when the slots allow; consecutive liars fake
// different parts when the rule lets them; the first guest under a re-pinned rule is always plain); the daily (night 6's
// difficulty: 2 clauses) has exactly 2 shapeshifters and 2 liars and no re-pin; only the All-Nighter rolls tricks per
// guest (never two of a kind in a row). Polarity: after a 'must NOT' the next clause is 'must have' at >= 80 % and a
// 3-clause poster always holds a 'must have' (stacked red slashes read slowest for no added skill).
// Guest colours rotate like a soft shuffle bag: never the previous guest's colour and never a third of one colour in any 4
// consecutive guests unless the verdict forces it; a rule that paints guests one colour ('must be X': every IN guest and
// every trap liar; a lone 'must NOT be X': every OUT guest) gets a verdict schedule that keeps those painted guests to 2 in
// any 4, so the visible queue never turns one hue. Species come from shuffle bags, one for IN guests and one for OUT, so
// every species earns an even share of correct admits (with profile.js's seat needs 3/6/9/12/16 a 92 % player seats
// members around nights 1, 3-4, 5-6, 7-9, 10-12); night 1 pins one species to 4 IN guests - the first glove guest and
// one in each later stretch of the queue, never side by side - on a night of 6-7 IN guests (TUNE.night1), so a first
// night that passes ends with 'New band member!' even with one of them called wrong. tierFor gives 'shut' only for a night ended on 3 strikes (finishing
// with 0 right is still 'rope').
// The All-Nighter keeps a sliding window: state.guests holds the newest ~24-40 guests (state.base = the queue index of
// guests[0]; endlessGuest(state, i) for an index before the window returns null) and older re-pins fold into state.rule,
// so memory stays flat over thousands of guests. Its ramp: 1 clause on colour / eyes, tricks rolling from guest 11, a
// re-pin to 2 clauses (+ hats / tails) at guest 13, every attribute from 21, 3 clauses from 31, re-pins every 10 guests
// from 21; every wrong call and every MISS costs a strike (params.missStrike / bounceStrike), so bouncing everyone
// cannot carry a run. firstFail(rule, guest) names the clause a guest's REAL state breaks (the play scene pops it on the
// poster; strings.failHint words it).
// Used by the play / home / result scenes; dev/data.html prints the report, the ladder and sample nights.
import { rng as makeRng, clamp, lerp } from '../core/math.js';

const Q0 = Object.freeze([0, 0]), Q12 = Object.freeze([1, 2]), Q2 = Object.freeze([2, 2]), Q3 = Object.freeze([3, 3]);
const Q23 = Object.freeze([2, 3]);

const TUNE = {
  inMin: 0.35, inMax: 0.65,          // per-night IN-rate window
  maxRun: 3,                         // max same-verdict guests in a row
  trickFrom: 5,                      // campaign / daily: first guest index that may be a liar / shifter (5 plain guests first)
  planTries: 16,                     // trick placements tried per night (the most spread-out one wins)
  tutorialPrefix: [1, 0],            // night 1 opens IN, OUT so the swipe tutorial shows both directions
  // night 1's first band seat: one species takes `lead` IN guests - the first glove guest, then one in each later
  // stretch of the queue, never side by side (makeNight pins those slots IN) - on a night of at least minIn IN guests
  // (when a colour rule's spacing allows it), so the first seat (profile.js: need 3) has one guest of slack after the
  // frozen tutorial guest; `tries` = slot layouts tried before the minIn floor (then the spacing) gives way
  night1: { lead: 4, minIn: 6, tries: 24 },
  guard: 80,                         // rejection-sampling tries before a guest is constructed directly
  ruleGuard: 400,                    // rule candidates before the deterministic fallback
  popMin: 0.06, popMax: 0.85,        // share of the random population a rule may accept (never trivial either way)
  nearMiss: 0.6,                     // OUT guests of multi-clause rules: chance to fail exactly one clause
  shiftFlip: 0.88,                   // chance a shapeshift flips the verdict (contract: >= 70 %)
  twoFakes: 0.6,                     // rules of liar nights with 2+ clauses: chance they must hold 2+ fakeable clauses (eyes / hat / tail)
  liarDecoy: 0.05,                   // per-guest (All-Nighter) liars: chance of a harmless fake even when a trap fits
  decoyNoTrap: 0.15,                 // per-guest liars with no trap: chance to still tape on a harmless fake (else no liar)
  hasTrue: { color: 0.6, eyes: 0.6, hat: 0.5, tail: 0.5, pattern: 0.6 },   // clause polarity odds (true = must have)
  // stacked negatives read slowest for no added skill: after a 'must NOT' clause the next one is 'must have' at least
  // these odds (~10 % double-negative 2-clause rules), and a 3-clause rule always holds a 'must have'
  negStack: 0.8,
  plainAndUntil: 7,                  // campaign nights up to this one (and the daily, night 6's rules) never get 2 red slashes
  // the teaching override of those odds per night: 1 = every clause 'must have' (green ring), 0 = every clause 'must
  // NOT' (night 3 introduces the red slash on its own; the play scene hints it once); endless rules before guest
  // hasTrueUntil are positive too
  teach: { 1: 1, 2: 1, 3: 0 },
  // the night's first rule must use one of these attributes (the new thing that night teaches; the play scene's glove
  // points at it): night 2 hats, night 3 tails (under the first red slash), night 7 the pattern, so every attribute is
  // on a poster before it can show up beside another new thing (the first AND rule is night 5)
  focus: { 2: ['hat'], 3: ['tail'], 7: ['pattern'] },
  // colour variety (a soft shuffle bag): unconstrained colours are drawn with weight / (1 + k * recent use), the use
  // decaying by `decay` per guest, never the previous guest's colour and never a colour already `colorWin` times in the
  // last winLen - 1 guests, unless the verdict forces that colour
  colorBag: { k: 1.6, decay: 0.72 },
  // a rule that paints one verdict a single colour ('must be X' = every IN guest is X, and every trap liar too; a lone
  // 'must NOT be X' = every OUT guest is): those guests appear at most colorWin times in any winLen consecutive guests
  colorWin: 2, winLen: 4,
  weights: { color: [1, 1, 1, 1, 1, 1], eyes: [3, 4, 3], hat: [4, 2, 2, 2], tail: [55, 45], pattern: [4, 3, 3] },
  walkMs: 500, strikes: 3,          // walkMs: queue -> rope walk (the play scene shortens it further in flow)
  // patience per night: linear between the knots [night, ms], then -perNight ms a night down to floor (rounded to `round`):
  // 6.5 s for nights 1-3, 5.0 s at 6, 4.4 s at 10, 3.8 s at 15, 3.0 s from night 35 (the play scene adds its per-guest
  // load bonus and rewards quick calls on top, so this stays mild)
  patience: { knots: [[1, 6500], [3, 6500], [6, 5000], [10, 4400], [15, 3800]], perNight: 40, floor: 3000, round: 50 },
  // the daily: night 6's difficulty (2 clauses, colour / eyes / hat / tail) without a re-pin, exactly `shifters`
  // shapeshifters and `liars` liars (a day-1 player who has passed night dailyAfter in profile.js can win it)
  daily: { night: 6, epoch: '2026-10-22', salt: 'mbouncer-daily:', shifters: Q2, liars: Q2 },
  // the All-Nighter ramp by guest index: tricks roll from trickFrom (per-guest odds start at trickStart x the full
  // liars / shifters odds and reach them at trickFull), the rule re-pins at firstRepin and then on every multiple of
  // mutateEvery, clauses step up to 2 at clauseAt[0] and 3 at clauseAt[1] (taking effect on the re-pin at or after each),
  // patience falls patienceFrom -> patienceTo by guest patienceBy; every wrong call and every MISS is a strike
  // (missStrike / bounceStrike, read by the play scene), so bouncing everyone ends the run within a few guests
  endless: {
    firstRepin: 12, mutateEvery: 10, clauseAt: [12, 30], maxClauses: 3,
    patienceFrom: 5500, patienceTo: 2600, patienceBy: 80,
    trickFrom: 10, trickStart: 0.7, trickFull: 50, liars: 0.18, shifters: 0.12,
    prefill: 10, easyUntil: 10, midUntil: 20, hasTrueUntil: 10, missStrike: 1, bounceStrike: 1,
    keep: 24, window: 40,            // sliding window: past `window` stored guests the oldest are dropped down to `keep`
  },
  // the twist ladder: nights 12-19 each add ONE twist on top of night 11's base (2 clauses, a 3-clause re-pin at guest 11,
  // 2-3 liars + 1-2 shapeshifters), so the one-new-thing-a-night cadence never stalls; night 20 brings 3 clauses from
  // the start and from night rotate.from the twists come round again over that 3-clause base (one night in
  // rotate.list.length plain). nightParams carries the night's twist as p.mod (strings mod_<id> / mod_<id>_sub name it
  // for the poster reveal and the lobby). Per twist: guests, repins (guest indexes the rule re-pins at; [] keeps the
  // base's), liars / shifters (exact quotas), patience (x the night's patience) + walkMs, nearMiss (OUT guests of
  // multi-clause rules that fail exactly one clause), twoFakes (odds a liar night's rule holds 2 fakeable clauses)
  mods: {
    liars: { liars: [4, 4], shifters: [1, 1], twoFakes: 1 },              // Liar Night: 4 liars, faking different parts
    repin2: { repins: [7, 14] },                                           // Double Rule Change: re-pins at guests 8 + 15
    shifters: { liars: [2, 2], shifters: [3, 3] },                         // Shapeshifter Night
    big: { guests: 24, repins: [12], liars: [3, 3], shifters: [2, 3] },    // Big Night: 24 guests at the door
    rush: { patience: 0.88, walkMs: 380 },                                 // Rush Hour: less patience, a fast line
    early: { repins: [6] },                                                // Early Rule Change: 3 clauses from guest 7
    close: { nearMiss: 1 },                                                // Close Calls: every OUT guest misses by one thing
    masq: { liars: [3, 3], shifters: [3, 3] },                             // Masquerade: 6 tricks
  },
  ladder: { 12: 'liars', 13: 'repin2', 14: 'shifters', 15: 'big', 16: 'rush', 17: 'early', 18: 'close', 19: 'masq' },
  rotate: { from: 21, list: ['liars', 'repin2', 'shifters', 'big', 'rush', 'close', 'masq', ''] },
  tier: { silver: 0.9, bronze: 0.7 },
  // maxColorWin: share of 4-guest windows allowed a third guest of one colour that the verdict did not force
  // maxDoubleNeg: share of 2-clause rules that may be all 'must NOT'; tricks: a night's trick quota after the debuts
  // (trickMax: the twists that raise its top)
  test: { nights: 500, maxNight: 30, daily: 200, endless: 400, minTrap: 0.7, minFlip: 0.7, maxColorRepeat: 0.01, maxColorWin: 0.01, maxSpeciesSpread: 2,
    maxDoubleNeg: 0.15, tricks: [3, 5], trickMax: { big: 6, masq: 6 }, night1Seeds: 300 },
};

// ---------------------------------------------------------------- cast + attributes
export const SPECIES = Object.freeze(['blob', 'tall', 'round', 'square', 'bean']);
// ONE palette for the whole game: these are actor.js COLORS exactly (tuned there for greyscale separation), so the poster
// swatch (icons.js paints it from here) always matches the guest
export const COLORS = Object.freeze({ coral: '#ec4450', lime: '#bff86e', sky: '#40bdeb', grape: '#8a48d6', mustard: '#ffc233', mint: '#19b18b' });
export const COLOR_KEYS = Object.freeze(Object.keys(COLORS));
export const HATS = Object.freeze(['none', 'party', 'top', 'crown']);
export const PATTERNS = Object.freeze(['none', 'stripes', 'dots']);
export const INSTRUMENT = Object.freeze({ blob: 'drum', tall: 'bass', round: 'keys', square: 'guitar', bean: 'lead' });
export const ATTRS = Object.freeze(['color', 'eyes', 'hat', 'tail', 'pattern']);
export const FAKEABLE = Object.freeze(['eyes', 'hat', 'tail']);
const DOMAIN = { color: COLOR_KEYS, eyes: [1, 2, 3], hat: HATS, tail: [false, true], pattern: PATTERNS };
const ATTRS_EASY = Object.freeze(['color', 'eyes']);
const ATTRS_MID = Object.freeze(['color', 'eyes', 'hat', 'tail']);
const STATS = { fallbackGuests: 0, fallbackRules: 0, liarSkipped: 0, schedRelax: 0 };

// ---------------------------------------------------------------- difficulty
// patience (ms) for night n: linear between TUNE.patience.knots, then perNight less each night down to the floor
export function patienceFor(n) {
  const P = TUNE.patience, K = P.knots;
  n = Math.max(1, Math.floor(n || 1));
  let ms = -1;
  if (n <= K[0][0]) ms = K[0][1];
  else {
    for (let i = 1; i < K.length; i++) {
      if (n <= K[i][0]) { ms = lerp(K[i - 1][1], K[i][1], (n - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); break; }
    }
    if (ms < 0) { const L = K[K.length - 1]; ms = Math.max(P.floor, L[1] - P.perNight * (n - L[0])); }
  }
  return Math.round(ms / P.round) * P.round;
}
// is guest index i the first under a re-pinned rule? (campaign / daily: p.repins)
function isRepin(p, i) { return !!p.repins && p.repins.indexOf(i) >= 0; }
// trick guests a night can place: slots trickFrom..guests-1, minus the first guest under each re-pinned rule
function trickSlots(p) {
  let n = p.guests - p.trickFrom;
  for (let k = 0; k < p.repins.length; k++) if (p.repins[k] >= p.trickFrom && p.repins[k] < p.guests) n--;
  return Math.max(0, n);
}
// liars / shifters = the expected share of the trick slots (display + 'is this kind on tonight'); the quotas decide
function setRates(p) {
  const s = trickSlots(p) || 1;
  p.liars = (p.liarCount[0] + p.liarCount[1]) / 2 / s;
  p.shifters = (p.shiftCount[0] + p.shiftCount[1]) / 2 / s;
  if (p.clausesAfter < p.clauses) p.clausesAfter = p.clauses;
  return p;
}

// The campaign ladder, one new thing per night (each trick kind debuts with an exact quota of 2 and the play scene's
// one-time hint; after its debut a night carries 3-5 tricks in all, on slots from guest trickFrom + 1 = 6):
//   1    12 guests, 1 'must have' clause on colour / eyes     2    12 guests, + hats ('must have', about the hat)
//   3    14 guests, the first red slash ('must NOT', a tail)  4    16 guests, mixed polarity + LIARS debut (exactly 2)
//   5    18 guests, 2 clauses (AND), 3 liars                  6    20 guests, SHAPESHIFTERS debut (2) + 2 liars
//   7    + the pattern (every attribute, about it), 2 + 2     8    the first mid-night RULE CHANGE at guest 11 (2 clauses)
//   9-10 re-pin, 2 liars + 2 shifters                         11   the re-pin brings the first 3-CLAUSE poster
//   12-19 night 11's base + ONE twist a night (TUNE.ladder / TUNE.mods: 12 Liar Night, 13 Double Rule Change, 14
//         Shapeshifter Night, 15 Big Night, 16 Rush Hour, 17 Early Rule Change, 18 Close Calls, 19 Masquerade)
//   20   3 clauses from the start                             21+  the twists rotate over the 3-clause base (TUNE.rotate)
// p.focus (nights 2, 3 and 7): the first rule uses one of these attributes. p.repins: the guest indexes the rule re-pins
// at (p.mutationAt = the first of them, or null). p.mod: the night's twist (null on a plain night). missStrike /
// bounceStrike: strikes a MISS / a wrong bounce costs (campaign 0; the All-Nighter's are 1)
const R10 = Object.freeze([10]), R0 = Object.freeze([]);
// the twist of campaign night n (a TUNE.mods key) or null
export function nightMod(n) {
  n = Math.max(1, Math.floor(n || 1));
  const R = TUNE.rotate;
  const id = n >= R.from ? R.list[(n - R.from) % R.list.length] : TUNE.ladder[n];
  return id && TUNE.mods[id] ? id : null;
}
function applyMod(p, id) {
  const m = TUNE.mods[id];
  p.mod = id;
  if (m.guests) p.guests = m.guests;
  if (m.repins) p.repins = Object.freeze(m.repins.slice());
  if (m.liars) p.liarCount = m.liars;
  if (m.shifters) p.shiftCount = m.shifters;
  if (m.patience) p.patienceMs = Math.round(p.patienceMs * m.patience / TUNE.patience.round) * TUNE.patience.round;
  if (m.walkMs) p.walkMs = m.walkMs;
  if (m.nearMiss !== undefined) p.nearMiss = m.nearMiss;
  if (m.twoFakes !== undefined) p.twoFakes = m.twoFakes;
}
export function nightParams(n) {
  n = Math.max(1, Math.floor(n || 1));
  const p = {
    night: n, guests: 20, clauses: 2, clausesAfter: 2, attrs: ATTRS, patienceMs: patienceFor(n), walkMs: TUNE.walkMs,
    strikes: TUNE.strikes, mutationAt: null, repins: R0, liars: 0, shifters: 0, liarCount: Q0, shiftCount: Q0, trickFrom: TUNE.trickFrom,
    focus: TUNE.focus[n] || null, missStrike: 0, bounceStrike: 0, mod: null, nearMiss: TUNE.nearMiss, twoFakes: TUNE.twoFakes,
  };
  if (n === 1) { p.guests = 12; p.clauses = 1; p.attrs = ATTRS_EASY; }
  else if (n === 2) { p.guests = 12; p.clauses = 1; p.attrs = ATTRS_MID; }
  else if (n === 3) { p.guests = 14; p.clauses = 1; p.attrs = ATTRS_MID; }
  else if (n === 4) { p.guests = 16; p.clauses = 1; p.attrs = ATTRS_MID; p.liarCount = Q2; }
  else if (n === 5) { p.guests = 18; p.attrs = ATTRS_MID; p.liarCount = Q3; }
  else if (n === 6) { p.attrs = ATTRS_MID; p.liarCount = Q2; p.shiftCount = Q2; }
  else if (n === 7) { p.liarCount = Q2; p.shiftCount = Q2; }
  else if (n === 8) { p.repins = R10; p.liarCount = Q2; p.shiftCount = Q12; }
  else if (n <= 10) { p.repins = R10; p.liarCount = Q2; p.shiftCount = Q2; }
  else if (n === 11) { p.repins = R10; p.clausesAfter = 3; p.liarCount = Q2; p.shiftCount = Q12; }
  else {
    p.clauses = n >= 20 ? 3 : 2; p.clausesAfter = 3; p.repins = R10; p.liarCount = Q23; p.shiftCount = Q12;
    const id = nightMod(n);
    if (id) applyMod(p, id);
  }
  if (p.clauses === 1) p.clausesAfter = 1;
  p.mutationAt = p.repins.length ? p.repins[0] : null;
  return setRates(p);
}
// the daily: night TUNE.daily.night's rules and pace with no re-pin, exactly TUNE.daily.shifters shapeshifters and
// TUNE.daily.liars liars
export function dailyParams() {
  const p = nightParams(TUNE.daily.night);
  p.daily = true; p.mutationAt = null; p.repins = R0; p.clausesAfter = p.clauses; p.focus = null; p.mod = null;
  p.liarCount = TUNE.daily.liars; p.shiftCount = TUNE.daily.shifters;
  return setRates(p);
}

// the All-Nighter's re-pins: firstRepin, then every multiple of mutateEvery after it (12, 20, 30, 40...)
function endlessRepin(i) {
  const E = TUNE.endless;
  return i === E.firstRepin || (i > E.firstRepin && i % E.mutateEvery === 0);
}
// the first re-pin after guest index i (the end of i's verdict block)
function nextRepin(i) {
  const E = TUNE.endless;
  if (i < E.firstRepin) return E.firstRepin;
  return (Math.floor(i / E.mutateEvery) + 1) * E.mutateEvery;
}
// Endless (All-Nighter) parameters for guest index i: clauses 1 -> 2 at guest clauseAt[0] -> 3 at clauseAt[1] (a rule
// takes the count of the index it is pinned at), patience 5.5 -> 2.6 s by guest 80, liars / shifters roll per guest from
// guest 10 (from 70 % of their full odds, reaching 0.18 / 0.12 at guest 50), re-pins at 12, 20, 30... Every wrong call and
// every MISS costs a strike (missStrike / bounceStrike).
export function endlessParams(i) {
  const E = TUNE.endless;
  i = Math.max(0, Math.floor(i || 0));
  const ramp = i >= E.trickFrom ? lerp(E.trickStart, 1, clamp((i - E.trickFrom) / (E.trickFull - E.trickFrom), 0, 1)) : 0;
  let clauses = 1;
  for (let k = 0; k < E.clauseAt.length; k++) if (i >= E.clauseAt[k]) clauses++;
  clauses = Math.min(E.maxClauses, clauses);
  return {
    night: 0, endless: true, index: i, guests: Infinity, clauses, clausesAfter: clauses,
    attrs: i < E.easyUntil ? ATTRS_EASY : i < E.midUntil ? ATTRS_MID : ATTRS,
    patienceMs: Math.round(lerp(E.patienceFrom, E.patienceTo, clamp(i / E.patienceBy, 0, 1))),
    walkMs: TUNE.walkMs, strikes: TUNE.strikes, mutationAt: E.firstRepin, mutateEvery: E.mutateEvery,
    liars: E.liars * ramp, shifters: E.shifters * ramp, trickFrom: E.trickFrom, focus: null,
    missStrike: E.missStrike, bounceStrike: E.bounceStrike,
  };
}

function fmtSec(ms) { return (ms / 1000).toFixed(1); }
function qText(q) { return q[0] === q[1] ? String(q[0]) : q[0] + '-' + q[1]; }
function trickText(p) {
  const extras = [];
  if (p.shiftCount[1] > 0) extras.push(qText(p.shiftCount) + (p.shiftCount[1] === 1 ? ' shapeshifter' : ' shapeshifters'));
  if (p.liarCount[1] > 0) extras.push(qText(p.liarCount) + (p.liarCount[1] === 1 ? ' liar' : ' liars'));
  return extras.length ? extras.join(' + ') + ' from guest ' + (p.trickFrom + 1) : '';
}
const MOD_TEXT = { liars: 'LIAR NIGHT', repin2: 'DOUBLE RULE CHANGE', shifters: 'SHAPESHIFTER NIGHT', big: 'BIG NIGHT', rush: 'RUSH HOUR (less patience, a fast line)',
  early: 'EARLY RULE CHANGE', close: 'CLOSE CALLS (every OUT guest misses by one clause)', masq: 'MASQUERADE' };
function guestList(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) out.push(list[i] + 1);
  return (out.length > 1 ? 'guests ' : 'guest ') + out.join(' + ');
}
function tableRow(label, a, b) {
  const p = nightParams(a), q = nightParams(b), o = a > 1 ? nightParams(a - 1) : null;
  const extras = [], teach = TUNE.teach[a];
  if (a === 1) extras.push('one species takes ' + TUNE.night1.lead + ' IN guests (the first band seat)');
  if (teach === 1) extras.push("'must have' rules only (green ring)");
  else if (teach === 0) extras.push("first red slash: 'must NOT' rules");
  else if (a > 1 && TUNE.teach[a - 1] !== undefined) extras.push('first mixed polarity (ring or slash)');
  if (p.focus) extras.push('the rule is about ' + p.focus.join(' / '));
  if (o && p.clauses > 1 && o.clauses < 2) extras.push('first AND rule (must match ALL)');
  if (o && p.liarCount[1] > 0 && o.liarCount[1] === 0) extras.push('LIARS debut (one-time hint)');
  if (o && p.shiftCount[1] > 0 && o.shiftCount[1] === 0) extras.push('SHAPESHIFTERS debut (one-time hint)');
  if (a !== b && a >= TUNE.rotate.from) extras.push('a twist a night, rotating: ' + TUNE.rotate.list.map(id => (id ? MOD_TEXT[id].split(' (')[0].toLowerCase() : 'plain')).join(', '));
  else if (p.mod) extras.push('twist: ' + MOD_TEXT[p.mod]);
  if (p.repins.length) extras.push((o && !o.repins.length ? 'first ' : '') + 'rule re-pinned at ' + guestList(p.repins));
  if (o && p.clausesAfter >= 3 && o.clausesAfter < 3) extras.push('first 3-clause poster');
  const tr = trickText(p);
  if (tr) extras.push(tr);
  const cl = p.clauses === q.clauses ? String(p.clauses) : p.clauses + '-' + q.clauses;
  return Object.freeze({
    nights: label, from: a, to: b, guests: p.guests, mod: a === b ? p.mod : null,
    clauses: cl + (p.repins.length ? ', ' + p.clausesAfter + ' from guest ' + (p.repins[0] + 1) : ''),
    attrs: p.attrs.join(', '),
    patience: fmtSec(p.patienceMs) + (q.patienceMs !== p.patienceMs ? ' -> ' + fmtSec(q.patienceMs) : '') + ' s',
    extras: extras.length ? extras.join('; ') : 'plain guests only',
    liars: p.liarCount, shifters: p.shiftCount, mutationAt: p.mutationAt, repins: p.repins,
  });
}
const DP = dailyParams();
export const PARAMS_TABLE = Object.freeze([
  tableRow('1', 1, 1), tableRow('2', 2, 2), tableRow('3', 3, 3), tableRow('4', 4, 4), tableRow('5', 5, 5), tableRow('6', 6, 6),
  tableRow('7', 7, 7), tableRow('8', 8, 8), tableRow('9-10', 9, 10), tableRow('11', 11, 11), tableRow('12', 12, 12), tableRow('13', 13, 13),
  tableRow('14', 14, 14), tableRow('15', 15, 15), tableRow('16', 16, 16), tableRow('17', 17, 17), tableRow('18', 18, 18), tableRow('19', 19, 19),
  tableRow('20', 20, 20), tableRow('21+', TUNE.rotate.from, 40),
  Object.freeze({ nights: 'daily', from: TUNE.daily.night, to: TUNE.daily.night, guests: DP.guests, mod: null, clauses: String(DP.clauses), attrs: DP.attrs.join(', '),
    patience: fmtSec(DP.patienceMs) + ' s', extras: 'night ' + TUNE.daily.night + ' rules, no re-pin, ' + trickText(DP),
    liars: DP.liarCount, shifters: DP.shiftCount, mutationAt: null, repins: R0 }),
  Object.freeze({ nights: 'endless', from: 0, to: Infinity, guests: Infinity, mod: null,
    clauses: '1 -> 2 from guest ' + (nextRepin(TUNE.endless.clauseAt[0] - 1) + 1) + ' -> 3 from guest ' + (nextRepin(TUNE.endless.clauseAt[1] - 1) + 1),
    attrs: 'color, eyes; + hat, tail from guest ' + (TUNE.endless.easyUntil + 1) + '; all from guest ' + (TUNE.endless.midUntil + 1),
    patience: fmtSec(TUNE.endless.patienceFrom) + ' -> ' + fmtSec(TUNE.endless.patienceTo) + ' s by guest ' + (TUNE.endless.patienceBy + 1),
    extras: 'rule re-pinned at guest ' + (TUNE.endless.firstRepin + 1) + ', then every ' + TUNE.endless.mutateEvery + '; liars/shifters roll per guest from guest ' +
      (TUNE.endless.trickFrom + 1) + ' (full odds at ' + (TUNE.endless.trickFull + 1) + '); every wrong call and every MISS is a strike',
    liars: TUNE.endless.liars, shifters: TUNE.endless.shifters, mutationAt: TUNE.endless.firstRepin }),
]);

// ---------------------------------------------------------------- clauses + rules
function attrHas(clause, v) {
  if (clause.attr === 'hat') return clause.value === 'any' ? v !== 'none' : v === clause.value;
  return v === clause.value;
}
function valueAccepts(clause, v) { return attrHas(clause, v) === clause.has; }
export function clauseAccepts(clause, guest) { return valueAccepts(clause, guest[clause.attr]); }
export function ruleAccepts(rule, guest) {
  const cs = rule.clauses;
  for (let i = 0; i < cs.length; i++) if (!valueAccepts(cs[i], guest[cs[i].attr])) return false;
  return true;
}
function countFails(rule, guest) {
  const cs = rule.clauses; let n = 0;
  for (let i = 0; i < cs.length; i++) if (!valueAccepts(cs[i], guest[cs[i].attr])) n++;
  return n;
}
// the first clause of `rule` the guest's REAL state fails (null when it passes them all): the clause a wrong admit got wrong
export function firstFail(rule, guest) {
  const cs = rule.clauses;
  for (let i = 0; i < cs.length; i++) if (!valueAccepts(cs[i], guest[cs[i].attr])) return cs[i];
  return null;
}
function clausePop(clause) {
  const vals = DOMAIN[clause.attr], w = TUNE.weights[clause.attr];
  let a = 0, t = 0;
  for (let i = 0; i < vals.length; i++) { t += w[i]; if (valueAccepts(clause, vals[i])) a += w[i]; }
  return a / t;
}
// Share of the random guest population the rule accepts (attributes are independent, clauses use distinct attributes).
export function rulePop(rule) {
  let p = 1;
  for (let i = 0; i < rule.clauses.length; i++) p *= clausePop(rule.clauses[i]);
  return p;
}
function sameClause(a, b) { return a.attr === b.attr && a.value === b.value && a.has === b.has; }
function ruleHasClause(rule, c) {
  for (let i = 0; i < rule.clauses.length; i++) if (sameClause(rule.clauses[i], c)) return true;
  return false;
}
// A mutation must show something new on the poster: at least one clause the previous rule did not have.
function ruleDiffers(rule, avoid) {
  if (!avoid) return true;
  for (let i = 0; i < rule.clauses.length; i++) if (!ruleHasClause(avoid, rule.clauses[i])) return true;
  return false;
}
function hasAny(list, wanted) {
  for (let i = 0; i < list.length; i++) if (wanted.indexOf(list[i]) >= 0) return true;
  return false;
}
function countIn(list, wanted) {
  let n = 0;
  for (let i = 0; i < list.length; i++) if (wanted.indexOf(list[i]) >= 0) n++;
  return n;
}
// clause polarity odds for these params: the teaching override (TUNE.teach, campaign nights only), positive-only early
// endless rules, else the per-attribute odds. Always one rng draw per clause.
function hasTrueOdds(params, attr) {
  if (params && params.endless) return params.index < TUNE.endless.hasTrueUntil ? 1 : TUNE.hasTrue[attr];
  const o = params && !params.daily ? TUNE.teach[params.night] : undefined;
  return o !== undefined ? o : TUNE.hasTrue[attr];
}
// stack = every clause drawn before this one is a 'must NOT': the odds of 'must have' rise to TUNE.negStack (never on
// a taught night, whose odds are 0 or 1)
function makeClause(r, attr, params, stack) {
  let value;
  if (attr === 'color') value = r.pick(COLOR_KEYS);
  else if (attr === 'eyes') value = r.int(1, 3);
  else if (attr === 'hat') value = 'any';
  else if (attr === 'tail') value = true;
  else value = r.pick(['stripes', 'dots']);
  const odds = hasTrueOdds(params, attr);
  return { attr, value, has: r.chance(stack && odds > 0 && odds < 1 ? Math.max(odds, TUNE.negStack) : odds) };
}
function allNegative(clauses) {
  for (let i = 0; i < clauses.length; i++) if (clauses[i].has) return false;
  return clauses.length > 0;
}
function byAttr(a, b) { return ATTRS.indexOf(a.attr) - ATTRS.indexOf(b.attr); }

export function makeRule(r, params, avoid) {
  const attrs = params.attrs;
  const n = Math.max(1, Math.min(params.clauses, attrs.length));
  const needFake = params.liars > 0 && hasAny(attrs, FAKEABLE);
  const focus = params.focus && hasAny(attrs, params.focus) ? params.focus : null;
  // liar nights often get two fakeable clauses, so consecutive liars can fake different parts (a Liar Night always)
  const two = needFake && n >= 2 && r.chance(params.twoFakes !== undefined ? params.twoFakes : TUNE.twoFakes);
  for (let t = 0; t < TUNE.ruleGuard; t++) {
    const pick = r.shuffle(attrs.slice()).slice(0, n);
    if (needFake && !hasAny(pick, FAKEABLE)) continue;
    if (two && t < TUNE.ruleGuard / 2 && countIn(pick, FAKEABLE) < 2) continue;
    if (focus && !hasAny(pick, focus)) continue;
    const clauses = [];
    for (let i = 0; i < pick.length; i++) clauses.push(makeClause(r, pick[i], params, allNegative(clauses)));
    // three red slashes: the slowest poster to parse; and the nights that teach AND / debut shapeshifters (and the daily)
    // never stack two
    if (allNegative(clauses) && (clauses.length >= 3 || (clauses.length === 2 && params.night >= 1 && params.night <= TUNE.plainAndUntil))) continue;
    clauses.sort(byAttr);
    const rule = { clauses };
    const p = rulePop(rule);
    if (p < TUNE.popMin || p > TUNE.popMax) continue;
    if (!ruleDiffers(rule, avoid)) continue;
    return rule;
  }
  STATS.fallbackRules++;
  for (let v = 1; v <= 3; v++) {
    const rule = { clauses: [{ attr: 'eyes', value: v, has: true }] };
    if (ruleDiffers(rule, avoid)) return rule;
  }
  return { clauses: [{ attr: 'eyes', value: 2, has: false }] };
}

// ---------------------------------------------------------------- guests
// The colour context of the guest being generated (set by makeGuest around one guest; empty = plain weights):
// use = the night's decaying colour-use counts, avoid = the colour to skip (the previous guest's, unless forced),
// block = a colour already TUNE.colorWin times among the last winLen - 1 guests (unless forced), fake = the part the
// previous liar faked (the next liar fakes another one when it can), near = the night's near-miss odds (params.nearMiss).
const CC = { use: null, avoid: undefined, block: undefined, fake: null, near: TUNE.nearMiss };
// a night's variety context (makeNight / the endless generator keep one): colour use, the previous colour and the last
// winLen - 1 colours (hist), the previous liar's faked part, and the species bags (IN and OUT guests each draw their
// species from their own bag of the 5, refilled when empty, never the previous guest's), so every species gets an even
// share of the correct admits that seat it in the House Band
function newMix() {
  return { use: [0, 0, 0, 0, 0, 0], prev: undefined, hist: [], lastFake: null, inBag: SPECIES.slice(), outBag: SPECIES.slice() };
}
function colorClause(rule) {
  const cs = rule.clauses;
  for (let i = 0; i < cs.length; i++) if (cs[i].attr === 'color') return i;
  return -1;
}
// does the verdict pin the guest's colour? (IN under 'must be X', or OUT under a lone 'must NOT be X')
export function colorForced(rule, wantIn) {
  const ci = colorClause(rule);
  if (ci < 0) return false;
  const c = rule.clauses[ci];
  return wantIn ? c.has : (rule.clauses.length === 1 && !c.has);
}
// the verdict a rule paints one colour (1: every IN guest wears it, 0: every OUT guest does, -1: none)
function paintVerdict(rule) {
  const ci = colorClause(rule);
  if (ci < 0) return -1;
  if (rule.clauses[ci].has) return 1;
  return rule.clauses.length === 1 ? 0 : -1;
}
// the colour the mix's recent history already holds colorWin times (a third in the window would read as one hue)
function blockedColor(mix) {
  const h = mix.hist;
  for (let i = 0; i < h.length; i++) {
    let n = 0;
    for (let j = 0; j < h.length; j++) if (h[j] === h[i]) n++;
    if (n >= TUNE.colorWin) return h[i];
  }
  return undefined;
}
function colorFits(clause, accept, v) { return !clause || valueAccepts(clause, v) === accept; }
// a colour among those with the wanted clause status, weighted against recent use, skipping CC.avoid and CC.block
// while another colour fits (and CC.avoid alone when only those two would)
function pickColor(r, clause, accept) {
  const vals = COLOR_KEYS, w = TUNE.weights.color, use = CC.use, k = TUNE.colorBag.k;
  let n = 0, free = 0;
  for (let i = 0; i < vals.length; i++) {
    if (!colorFits(clause, accept, vals[i])) continue;
    n++;
    if (vals[i] !== CC.avoid && vals[i] !== CC.block) free++;
  }
  const skipA = n > 1 ? CC.avoid : undefined, skipB = free > 0 ? CC.block : undefined;
  let total = 0, last = vals[0];
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === skipA || vals[i] === skipB || !colorFits(clause, accept, vals[i])) continue;
    total += w[i] / (1 + (use ? k * use[i] : 0));
  }
  let x = r.next() * total;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === skipA || vals[i] === skipB || !colorFits(clause, accept, vals[i])) continue;
    last = vals[i]; x -= w[i] / (1 + (use ? k * use[i] : 0));
    if (x < 0) return vals[i];
  }
  return last;
}
function colorAvoided(v) { return v === CC.avoid || v === CC.block; }
function pickFor(r, attr, clause, accept, not) {
  if (attr === 'color') return pickColor(r, clause, accept);
  const vals = DOMAIN[attr], w = TUNE.weights[attr];
  let total = 0, last = vals[0];
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === not || (clause && valueAccepts(clause, vals[i]) !== accept)) continue;
    total += w[i];
  }
  let x = r.next() * total;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === not || (clause && valueAccepts(clause, vals[i]) !== accept)) continue;
    last = vals[i]; x -= w[i];
    if (x < 0) return vals[i];
  }
  return last;
}
// one species from `bag` (removed from it; refilled with all 5 once empty), never `prev` nor `next` (the species the
// following guest is pinned to; a bag holding only those gets the next round added first, so the shares stay even)
function bagSpecies(r, bag, prev, next) {
  let n = 0;
  for (let i = 0; i < bag.length; i++) if (bag[i] !== prev && bag[i] !== next) n++;
  if (n === 0) {
    for (let i = 0; i < SPECIES.length; i++) bag.push(SPECIES[i]);
    for (let i = 0; i < bag.length; i++) if (bag[i] !== prev && bag[i] !== next) n++;
  }
  let sp, k = r.int(0, n - 1);
  for (let i = 0; i < bag.length; i++) { if (bag[i] === prev || bag[i] === next) continue; if (k-- === 0) { sp = bag[i]; break; } }
  takeSpecies(bag, sp);
  return sp;
}
// a pinned species leaves its bag too (when it is in there), so the other species keep their even share
function takeSpecies(bag, sp) {
  const j = bag.indexOf(sp);
  if (j >= 0) bag.splice(j, 1);
  if (!bag.length) for (let i = 0; i < SPECIES.length; i++) bag.push(SPECIES[i]);
}
function pickSpecies(r, prev) {
  const i = r.int(0, SPECIES.length - 1);
  if (SPECIES[i] !== prev) return SPECIES[i];
  return SPECIES[(i + 1 + r.int(0, SPECIES.length - 2)) % SPECIES.length];
}
function baseGuest(r, id, species) {
  return {
    id, species,
    color: pickFor(r, 'color', null, true, undefined), eyes: pickFor(r, 'eyes', null, true, undefined),
    hat: pickFor(r, 'hat', null, true, undefined), tail: pickFor(r, 'tail', null, true, undefined),
    pattern: pickFor(r, 'pattern', null, true, undefined),
    fake: { eyes: 0, hat: false, tail: false }, shift: null, inside: false, pre: null,
  };
}
// Exact conditional construction: attributes are independent and every clause owns one attribute, so resampling each
// clause attribute from the values with the wanted status samples the conditional distribution directly.
function forceClauses(r, rule, g, failIndex) {
  const cs = rule.clauses;
  for (let i = 0; i < cs.length; i++) {
    const want = i !== failIndex;
    if (valueAccepts(cs[i], g[cs[i].attr]) !== want) g[cs[i].attr] = pickFor(r, cs[i].attr, cs[i], want, undefined);
  }
  return g;
}
function constructGuest(r, rule, wantIn, id, species) {
  STATS.fallbackGuests++;
  let fi = -1;
  if (!wantIn) {
    fi = r.int(0, rule.clauses.length - 1);
    // an OUT guest fails on its colour instead when passing a 'must be X' clause would repeat a recent colour, and on
    // another clause when failing a 'must NOT be X' clause would (the verdict never needs that colour then)
    const ci = colorClause(rule), n = rule.clauses.length;
    if (ci >= 0 && colorAvoided(rule.clauses[ci].value)) {
      if (rule.clauses[ci].has) fi = ci;
      else if (fi === ci && n > 1) fi = (ci + 1 + r.int(0, n - 2)) % n;
    }
  }
  return forceClauses(r, rule, baseGuest(r, id, species), fi);
}
// fails: -1 any failing count (OUT), 0 all pass (IN), 1 exactly one failing clause (near miss)
function sampleGuest(r, rule, fails, id, species) {
  for (let t = 0; t < TUNE.guard; t++) {
    const g = baseGuest(r, id, species);
    const f = countFails(rule, g);
    if (fails < 0 ? f > 0 : f === fails) return g;
  }
  return constructGuest(r, rule, fails === 0, id, species);
}
function plainGuest(r, rule, wantIn, id, species) {
  if (wantIn) return sampleGuest(r, rule, 0, id, species);
  const near = rule.clauses.length > 1 && r.chance(CC.near);
  return sampleGuest(r, rule, near ? 1 : -1, id, species);
}

// Fake props: 'eyes' (one extra googly eye, needs real eyes <= 2), 'hat' (paper hat, needs real hat 'none'),
// 'tail' (tied-on tail, needs real tail false). A fake is a TRAP when the verdict would flip if the prop were real.
function fakeFits(g, prop) {
  if (prop === 'eyes') return g.eyes <= 2 && g.fake.eyes === 0;
  if (prop === 'hat') return g.hat === 'none' && !g.fake.hat;
  return !g.tail && !g.fake.tail;
}
function acceptsIfReal(rule, g, prop) {
  let ok;
  if (prop === 'eyes') { g.eyes += 1; ok = ruleAccepts(rule, g); g.eyes -= 1; }
  else if (prop === 'hat') { const h = g.hat; g.hat = 'party'; ok = ruleAccepts(rule, g); g.hat = h; }
  else { const tl = g.tail; g.tail = true; ok = ruleAccepts(rule, g); g.tail = tl; }
  return ok;
}
function realValue(prop, v) { return prop === 'eyes' ? v + 1 : prop === 'hat' ? 'party' : true; }
function fitsValue(prop, v) { return prop === 'eyes' ? v <= 2 : prop === 'hat' ? v === 'none' : v === false; }
function pickFake(r, rule, g, trap) {
  const verdict = ruleAccepts(rule, g);
  const opts = [];
  for (let i = 0; i < FAKEABLE.length; i++) {
    const p = FAKEABLE[i];
    if (fakeFits(g, p) && (acceptsIfReal(rule, g, p) !== verdict) === trap) opts.push(p);
  }
  // consecutive liars fake different parts whenever this guest has another option
  if (opts.length > 1 && CC.fake) { const j = opts.indexOf(CC.fake); if (j >= 0) opts.splice(j, 1); }
  return opts.length ? r.pick(opts) : null;
}
function applyFake(g, prop) {
  if (prop === 'eyes') g.fake.eyes = 1;
  else if (prop === 'hat') g.fake.hat = true;
  else g.fake.tail = true;
  return g;
}
// The fake prop is the edge: every other clause passes, the faked clause decides, and making the prop real flips it.
function constructTrap(r, rule, wantIn, id, species) {
  const cs = r.shuffle(rule.clauses.slice());
  // the part the previous liar faked is tried last
  for (let k = 0; k < cs.length - 1; k++) if (cs[k].attr === CC.fake) { const c = cs[k]; cs.splice(k, 1); cs.push(c); break; }
  for (let k = 0; k < cs.length; k++) {
    const c = cs[k];
    if (FAKEABLE.indexOf(c.attr) < 0) continue;
    const vals = DOMAIN[c.attr], cands = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (fitsValue(c.attr, v) && valueAccepts(c, v) === wantIn && valueAccepts(c, realValue(c.attr, v)) !== wantIn) cands.push(v);
    }
    if (!cands.length) continue;
    const g = forceClauses(r, rule, baseGuest(r, id, species), -1);
    g[c.attr] = r.pick(cands);
    if (ruleAccepts(rule, g) !== wantIn) continue;
    return applyFake(g, c.attr);
  }
  return null;
}
// can a guest with this verdict carry a TRAP fake under `rule`? (some fakeable clause has a value that fits a fake prop,
// gives the wanted verdict, and would flip it if the prop were real)
export function trapPossible(rule, wantIn) {
  const cs = rule.clauses;
  for (let k = 0; k < cs.length; k++) {
    const c = cs[k];
    if (FAKEABLE.indexOf(c.attr) < 0) continue;
    const vals = DOMAIN[c.attr];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (fitsValue(c.attr, v) && valueAccepts(c, v) === wantIn && valueAccepts(c, realValue(c.attr, v)) !== wantIn) return true;
    }
  }
  return false;
}
// does the rule have a fakeable clause other than `prop`? (a liar can then fake another part than the previous one)
function otherFakeable(rule, prop) {
  if (!prop) return false;
  for (let i = 0; i < rule.clauses.length; i++) { const a = rule.clauses[i].attr; if (a !== prop && FAKEABLE.indexOf(a) >= 0) return true; }
  return false;
}
// quota = true: a planned liar (makeNight) always wears a fake: a trap whenever one fits, else a harmless decoy
// (the first half of the tries holds out for a part the previous liar did not fake, when the rule has another one)
function liarGuest(r, rule, wantIn, id, species, quota) {
  if (quota || !r.chance(TUNE.liarDecoy)) {
    const vary = otherFakeable(rule, CC.fake);
    for (let t = 0; t < TUNE.guard; t++) {
      const g = baseGuest(r, id, species);
      if (ruleAccepts(rule, g) !== wantIn) continue;
      const p = pickFake(r, rule, g, true);
      if (p && !(vary && p === CC.fake && t < TUNE.guard / 2)) return applyFake(g, p);
    }
    const built = constructTrap(r, rule, wantIn, id, species);
    if (built) return built;
    if (!quota && !r.chance(TUNE.decoyNoTrap)) { STATS.liarSkipped++; return plainGuest(r, rule, wantIn, id, species); }
  }
  for (let t = 0; t < (quota ? TUNE.guard : 1); t++) {
    const g = plainGuest(r, rule, wantIn, id, species);
    const p = pickFake(r, rule, g, false);
    if (p) return applyFake(g, p);
    if (!quota) return g;
  }
  STATS.liarSkipped++;
  return plainGuest(r, rule, wantIn, id, species);
}

function snapshot(g) {
  return {
    id: g.id, species: g.species, color: g.color, eyes: g.eyes, hat: g.hat, tail: g.tail, pattern: g.pattern,
    fake: { eyes: g.fake.eyes, hat: g.fake.hat, tail: g.fake.tail }, inside: g.inside,
  };
}
// Shapeshifter: the guest object is the FINAL state (judged at the rope); g.pre is what the actor shows before the pop.
function shifterGuest(r, rule, wantIn, id, species) {
  let g, attr, preVal;
  if (r.chance(TUNE.shiftFlip)) {
    g = sampleGuest(r, rule, wantIn ? 0 : 1, id, species);
    const c = wantIn ? r.pick(rule.clauses) : firstFail(rule, g);
    attr = c.attr;
    preVal = pickFor(r, attr, c, !wantIn, undefined);
  } else {
    g = plainGuest(r, rule, wantIn, id, species);
    const cands = [];
    for (let a = 0; a < ATTRS.length; a++) {
      const vals = DOMAIN[ATTRS[a]], cur = g[ATTRS[a]];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === cur) continue;
        g[ATTRS[a]] = vals[i];
        if (ruleAccepts(rule, g) === wantIn) cands.push(a * 8 + i);
        g[ATTRS[a]] = cur;
      }
    }
    const k = r.pick(cands);
    attr = ATTRS[(k / 8) | 0];
    preVal = DOMAIN[attr][k % 8];
  }
  g.inside = ruleAccepts(rule, g);
  const pre = snapshot(g);
  pre[attr] = preVal;
  pre.inside = ruleAccepts(rule, pre);
  g.shift = { attr, value: g[attr] };
  g.pre = pre;
  return g;
}

// makeGuest(rng, rule, params, wantIn, opts?) -> guest with inside === wantIn.
// opts: { id, prevSpecies, liar, shifter, quota, mix, species, nextSpecies } (makeNight / endlessGuest decide who is a
// liar or shifter per index; quota = a planned liar that must wear a fake; mix = the night's variety context from
// newMix(), updated here; species = a pinned species (night 1's band seat; the caller keeps it off its neighbours),
// nextSpecies = the species the next guest is pinned to, which this one then avoids)
export function makeGuest(r, rule, params, wantIn, opts) {
  const o = opts || {};
  const id = o.id !== undefined ? o.id : 0;
  const col = o.mix || null;
  wantIn = !!wantIn;
  let species;
  if (o.species && SPECIES.indexOf(o.species) >= 0) { species = o.species; if (col) takeSpecies(wantIn ? col.inBag : col.outBag, species); }
  else species = col ? bagSpecies(r, wantIn ? col.inBag : col.outBag, o.prevSpecies, o.nextSpecies) : pickSpecies(r, o.prevSpecies);
  const free = col && !colorForced(rule, wantIn);
  CC.use = col ? col.use : null;
  CC.avoid = free ? col.prev : undefined;
  CC.block = free ? blockedColor(col) : undefined;
  CC.fake = col ? col.lastFake : null;
  CC.near = params && params.nearMiss !== undefined ? params.nearMiss : TUNE.nearMiss;
  let g;
  try {
    if (o.shifter) g = shifterGuest(r, rule, wantIn, id, species);
    else if (o.liar) g = liarGuest(r, rule, wantIn, id, species, o.quota === true);
    else g = plainGuest(r, rule, wantIn, id, species);
    g.inside = ruleAccepts(rule, g);
    if (g.inside !== wantIn) { g = constructGuest(r, rule, wantIn, id, species); g.inside = ruleAccepts(rule, g); }
  } finally { CC.use = null; CC.avoid = undefined; CC.block = undefined; CC.fake = null; CC.near = TUNE.nearMiss; }
  if (col) {
    const u = col.use, d = TUNE.colorBag.decay;
    for (let i = 0; i < u.length; i++) u[i] *= d;
    u[COLOR_KEYS.indexOf(g.color)] += 1;
    col.prev = g.color;
    col.hist.push(g.color);
    if (col.hist.length > TUNE.winLen - 1) col.hist.shift();
    if (isLiar(g)) col.lastFake = g.fake.eyes ? 'eyes' : g.fake.hat ? 'hat' : 'tail';
  }
  return g;
}

// ---------------------------------------------------------------- verdict schedule
// verdict history carried across schedule blocks (the All-Nighter): last value (-1 none), its run length, and the last
// winLen - 1 values as bits (newest in bit 0) of which hn are known
function newHist() { return { last: -1, run: 0, h: 0, hn: 0 }; }
function pushHist(H, x) {
  H.run = x === H.last ? H.run + 1 : 1; H.last = x;
  H.h = ((H.h << 1) | x) & ((1 << (TUNE.winLen - 1)) - 1); H.hn = Math.min(TUNE.winLen - 1, H.hn + 1);
}
// is position p (verdict x) painted the rule's colour? paint[p]: -1 never, 0 / 1 when its verdict is that one, 2 always
// (a trap liar under 'must be X'); positions before the block (p < 0) read like its first one
function painted(paint, p, x) {
  const v = paint[p < 0 ? 0 : p];
  return v === 2 || v === x;
}
// Uniform sample over every 0/1 sequence of length n with minIn..maxIn ones and no run longer than maxRun, continuing
// from the history H0 (newHist() for a fresh night). All optional: prefix forces the first values; mask (per position:
// bit x set = verdict x allowed) pins trap liars to a verdict their fake can flip; paint (per position, see painted())
// keeps the guests a rule paints one colour to at most TUNE.colorWin in any TUNE.winLen consecutive guests (so also in a
// row). When nothing fits: paint is relaxed to its verdict-only form (soft, liars dropped), then off, then the mask
// and the prefix go; strict = true returns null instead (no rng drawn), so the caller can try another layout.
function makeSchedule(r, n, minIn, maxIn, maxRun, H0, prefix, paint, mask, strict) {
  const memo = new Map(), W = TUNE.winLen - 1, M = (1 << W) - 1;
  // the run length after placing x at pos with history (h, hn, run), or 0 when x is not allowed there
  function step(pos, x, h, hn, run) {
    if (prefix && pos < prefix.length && prefix[pos] !== x) return 0;
    if (mask && !(mask[pos] & (1 << x))) return 0;
    const nr = hn > 0 && (h & 1) === x ? run + 1 : 1;
    if (nr > maxRun) return 0;
    if (paint && painted(paint, pos, x)) {
      let k = 1;
      for (let j = 0; j < hn; j++) if (painted(paint, pos - 1 - j, (h >> j) & 1)) k++;
      if (k > TUNE.colorWin) return 0;
    }
    return nr;
  }
  function count(pos, ins, h, hn, run) {
    if (ins > maxIn || ins + (n - pos) < minIn) return 0;
    if (pos === n) return 1;
    const key = (((pos * 64 + ins) * (M + 1) + h) * (W + 1) + hn) * 16 + run;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let c = 0;
    for (let x = 0; x <= 1; x++) {
      const nr = step(pos, x, h, hn, run);
      if (nr) c += count(pos + 1, ins + x, ((h << 1) | x) & M, Math.min(W, hn + 1), nr);
    }
    memo.set(key, c);
    return c;
  }
  const h0 = H0.h & M, hn0 = Math.min(W, H0.hn), run0 = H0.last < 0 ? 0 : H0.run;
  if (count(0, 0, h0, hn0, run0) === 0) {
    if (strict) return null;
    STATS.schedRelax++;
    if (paint && paint.indexOf(2) >= 0) {
      const soft = [];
      for (let i = 0; i < paint.length; i++) soft.push(paint[i] === 2 ? 1 : paint[i]);   // 2 only comes from 'must be X' (paints IN)
      return makeSchedule(r, n, minIn, maxIn, maxRun, H0, prefix, soft, mask);
    }
    if (paint) return makeSchedule(r, n, minIn, maxIn, maxRun, H0, prefix, null, mask);
    if (mask) return makeSchedule(r, n, minIn, maxIn, maxRun, H0, prefix, null, null);
    if (prefix) return makeSchedule(r, n, minIn, maxIn, maxRun, H0, null, null, null);
    const out = [];
    for (let i = 0; i < n; i++) out.push((i + (H0.last === 1 ? 1 : 0)) % 2 === 0 ? 1 : 0);
    return out;
  }
  const out = [];
  let ins = 0, h = h0, hn = hn0, run = run0;
  for (let pos = 0; pos < n; pos++) {
    let c0 = 0, c1 = 0;
    const r0 = step(pos, 0, h, hn, run), r1 = step(pos, 1, h, hn, run);
    const nh0 = (h << 1) & M, nh1 = ((h << 1) | 1) & M, nhn = Math.min(W, hn + 1);
    if (r0) c0 = count(pos + 1, ins, nh0, nhn, r0);
    if (r1) c1 = count(pos + 1, ins + 1, nh1, nhn, r1);
    const x = r.next() * (c0 + c1) < c1 ? 1 : 0;
    out.push(x);
    ins += x; run = x ? r1 : r0; h = x ? nh1 : nh0; hn = nhn;
  }
  return out;
}
export function inBounds(n) {
  return { min: Math.ceil(TUNE.inMin * n - 1e-9), max: Math.floor(TUNE.inMax * n + 1e-9) };
}

// ---------------------------------------------------------------- nights
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
function withClauses(params, n) {
  const p = Object.assign({}, params);
  p.clauses = n;
  return p;
}
// All-Nighter: one roll per guest against the ramped odds (0 plain, 1 liar, 2 shifter)
function rollTrick(r, params, i) {
  const roll = r.next();
  if (i < params.trickFrom) return 0;
  if (roll < params.shifters) return 2;
  if (roll < params.shifters + params.liars) return 1;
  return 0;
}
function quota(r, q) { return q[0] + (q[1] > q[0] ? r.int(0, q[1] - q[0]) : 0); }
// is a trick of `kind` (1 liar, 2 shifter; 0 = any trick) next to slot i?
function trickNear(plan, i, kind) {
  const a = i > 0 ? plan[i - 1] : 0, b = i + 1 < plan.length ? plan[i + 1] : 0;
  return kind ? a === kind || b === kind : a > 0 || b > 0;
}
// the verdicts a trap liar may take at slot i (bit x = verdict x): those whose fake can flip it (0: no trap fits)
function trapMask(night, i) {
  const rule = ruleAt(night, i);
  return (trapPossible(rule, false) ? 1 : 0) | (trapPossible(rule, true) ? 2 : 0);
}
// does a trap liar at slot i wear its rule's colour? (under 'must be X' it passes every clause but the faked one)
function liarPainted(night, i) { return paintVerdict(ruleAt(night, i)) === 1; }
// one placement of `liars` + `shifters` on the shuffled slots into plan (cleared first) -> its score (lower is better:
// decoy liars, then tricks of a kind side by side, colour-painted liars close together, any tricks side by side)
function placeTricks(night, slots, plan, liars, shifters) {
  for (let i = 0; i < plan.length; i++) plan[i] = 0;
  let score = 0;
  for (let pass = 0; pass < 4 && liars > 0; pass++) {
    for (let k = 0; k < slots.length && liars > 0; k++) {
      const i = slots[k];
      if (plan[i]) continue;
      if (pass < 3 && !trapMask(night, i)) continue;
      if (pass < 2 && trickNear(plan, i, pass === 0 ? 0 : 1)) continue;
      plan[i] = 1; liars--;
      if (pass === 3) score += 1000;
    }
  }
  for (let pass = 0; pass < 3 && shifters > 0; pass++) {
    for (let k = 0; k < slots.length && shifters > 0; k++) {
      const i = slots[k];
      if (plan[i] || (pass < 2 && trickNear(plan, i, pass === 0 ? 0 : 2))) continue;
      plan[i] = 2; shifters--;
    }
  }
  for (let i = 1; i < plan.length; i++) if (plan[i] && plan[i - 1]) score += plan[i] === plan[i - 1] ? 20 : 1;
  for (let i = 0; i < plan.length; i++) {
    if (plan[i] !== 1 || !liarPainted(night, i)) continue;
    for (let j = i + 1; j < plan.length && j < i + TUNE.winLen; j++) if (plan[j] === 1 && liarPainted(night, j)) score += 10;
  }
  // spread over the night: every unit two neighbouring tricks sit closer than an even share of the slots costs 1
  let n = 0, last = -1, lo = plan.length, hi = 0;
  for (let k = 0; k < slots.length; k++) { if (slots[k] < lo) lo = slots[k]; if (slots[k] > hi) hi = slots[k]; }
  for (let i = 0; i < plan.length; i++) if (plan[i]) n++;
  const even = n > 1 ? Math.floor((hi - lo + 1) / n) : 0;
  for (let i = 0; i < plan.length; i++) {
    if (!plan[i]) continue;
    if (last >= 0 && i - last < even) score += even - (i - last);
    last = i;
  }
  return score;
}
// Campaign / daily, planned BEFORE the verdicts: the night's exact trick quotas on shuffled slots from trickFrom (never
// the first guest under any re-pinned rule), spread out: liars go to slots where a trap fake fits (the fake must matter)
// with no trick beside them, relaxing step by step (no liar beside, then any trap slot, then a harmless decoy anywhere);
// shapeshifters take the slots left, never beside another shifter while a slot allows it. The best of TUNE.planTries
// shuffles wins. -> array per guest index: 0 plain, 1 liar, 2 shifter (makeNight then pins each trap liar's verdict)
function trickPlan(r, night) {
  const p = night.params, plan = [], best = [], slots = [];
  for (let i = 0; i < p.guests; i++) { plan.push(0); best.push(0); }
  for (let i = p.trickFrom; i < p.guests; i++) if (!isRepin(p, i)) slots.push(i);
  const liars = Math.min(quota(r, p.liarCount), slots.length);
  const shifters = Math.min(quota(r, p.shiftCount), slots.length - liars);
  if (!liars && !shifters) return plan;
  let bestScore = Infinity;
  for (let t = 0; t < TUNE.planTries && bestScore > 0; t++) {
    r.shuffle(slots);
    const s = placeTricks(night, slots, plan, liars, shifters);
    if (s < bestScore) { bestScore = s; for (let i = 0; i < plan.length; i++) best[i] = plan[i]; }
  }
  return best;
}

export function ruleAt(night, index) {
  let rule = night.rule;
  const m = night.mutations;
  for (let i = 0; i < m.length; i++) {
    if (m[i].at <= index) rule = m[i].rule; else break;
  }
  return rule;
}

// makeNight({ seed, night, mode: 'night'|'daily'|'endless' }) -> { mode, seed, night, rule, params, guests, mutations }
// (endless: + base, the queue index of guests[0]; see endlessGuest)
export function makeNight(opts) {
  const o = opts || {};
  const mode = o.mode === 'daily' || o.mode === 'endless' ? o.mode : 'night';
  const seed = o.seed !== undefined ? o.seed : 1;
  if (mode === 'endless') return makeEndless(seed);
  const nightN = mode === 'daily' ? TUNE.daily.night : Math.max(1, Math.floor(o.night || 1));
  const params = mode === 'daily' ? dailyParams() : nightParams(nightN);
  const r = makeRng(hashStr(String(seed) + '|' + nightN + '|' + mode));
  const rule = makeRule(r, params, null);
  const mutations = [];
  for (let k = 0; k < params.repins.length; k++) {
    const at = params.repins[k];
    if (at < params.guests) mutations.push({ at, rule: makeRule(r, withClauses(params, params.clausesAfter), mutations.length ? mutations[mutations.length - 1].rule : rule) });
  }
  const b = inBounds(params.guests);
  const first = mode === 'night' && nightN === 1;
  const prefix = first ? TUNE.tutorialPrefix : null;
  const night = { mode, seed, night: nightN, rule, params, guests: [], mutations };
  // tricks first: a trap liar's verdict is pinned to one its fake can flip, and under 'must be X' it wears X whatever
  // its verdict (paint 2), so the schedule spaces the painted guests out around it
  const plan = trickPlan(r, night), paint = [], mask = [];
  for (let i = 0; i < params.guests; i++) {
    let pv = paintVerdict(ruleAt(night, i)), m = 3;
    if (plan[i] === 1) { const tm = trapMask(night, i); if (tm) { m = tm; if (pv === 1) pv = 2; } }
    paint.push(pv); mask.push(m);
  }
  let sched = null, seats = null;
  if (first) {
    // night 1's band seat: lay out the lead species' slots, pin them IN and sample the verdicts around them (minIn IN
    // guests while a layout allows it, then the plain floor, then the relaxing schedule)
    const N1 = TUNE.night1;
    for (let t = 0; t < 2 * N1.tries && !sched; t++) {
      seats = seatSlots(r, params.guests);
      for (let i = 0; i < mask.length; i++) mask[i] = 3;
      for (let k = 0; k < seats.length; k++) mask[seats[k]] = 2;
      sched = makeSchedule(r, params.guests, t < N1.tries ? Math.max(b.min, N1.minIn) : b.min, b.max, TUNE.maxRun, newHist(), prefix, paint, mask, true);
    }
    if (!sched) sched = makeSchedule(r, params.guests, b.min, b.max, TUNE.maxRun, newHist(), prefix, paint, mask);
  } else sched = makeSchedule(r, params.guests, b.min, b.max, TUNE.maxRun, newHist(), prefix, paint, mask);
  const pin = first ? seatPins(r, sched, seats) : null;
  const mix = newMix();
  let prev;
  for (let i = 0; i < params.guests; i++) {
    const g = makeGuest(r, ruleAt(night, i), params, sched[i] === 1,
      { id: i, prevSpecies: prev, liar: plan[i] === 1, shifter: plan[i] === 2, quota: true, mix,
        species: pin ? pin[i] : undefined, nextSpecies: pin && i + 1 < pin.length ? pin[i + 1] : undefined });
    night.guests.push(g);
    prev = g.species;
  }
  return night;
}
// night 1's band seat slots: guest 1 (the first glove guest, always IN) and one slot in each later stretch of the
// queue (guests 3.. split into lead - 1 even stretches), two or more apart so the pinned species is never side by side
// -> the guest indexes (ascending)
function seatSlots(r, n) {
  const k = TUNE.night1.lead - 1, from = TUNE.tutorialPrefix.length, span = (n - from) / Math.max(1, k), out = [0];
  for (let j = 0; j < k; j++) {
    const lo = Math.max(Math.floor(from + j * span), out[out.length - 1] + 2);
    const hi = Math.min(n - 1, Math.max(lo, Math.floor(from + (j + 1) * span) - 1));
    if (lo > n - 1) break;
    out.push(lo + r.int(0, hi - lo));
  }
  return out;
}
// night 1's band seat: one species pinned to the seat slots the schedule let in (all of them unless it had to relax)
// -> per guest index the pinned species or undefined
function seatPins(r, sched, seats) {
  const pin = [], sp = r.pick(SPECIES);
  for (let i = 0; i < sched.length; i++) pin.push(undefined);
  if (seats) for (let k = 0; k < seats.length; k++) if (sched[seats[k]] === 1) pin[seats[k]] = sp;
  return pin;
}

function endlessRuleParams(at) {
  const p = endlessParams(at);
  p.liars = endlessParams(at + TUNE.endless.mutateEvery - 1).liars;
  return p;
}
function makeEndless(seed) {
  const r = makeRng(hashStr(String(seed) + '|0|endless'));
  const state = { mode: 'endless', seed, night: 0, rule: makeRule(r, endlessRuleParams(0), null), params: endlessParams(0), guests: [], mutations: [], base: 0 };
  Object.defineProperty(state, 'gen', {
    value: { r, queue: [], qpos: 0, hist: newHist(), paint: [], lastTrick: 0, prevSpecies: undefined, mix: newMix() }, enumerable: false, writable: true,
  });
  for (let i = 0; i < TUNE.endless.prefill; i++) endlessGuest(state, i);
  return state;
}
// drops the oldest stored guests down to `keep` and folds the re-pins at or before the new window start into state.rule,
// so ruleAt(state, i) stays exact for every stored guest
function trimEndless(state, keep) {
  const drop = state.guests.length - keep;
  if (drop <= 0) return;
  state.guests.splice(0, drop);
  state.base += drop;
  let k = 0;
  while (k < state.mutations.length && state.mutations[k].at <= state.base) { state.rule = state.mutations[k].rule; k++; }
  if (k) state.mutations.splice(0, k);
}
// Lazily extends an endless state up to `index` (deterministic: guests are always generated in order) and returns that
// guest; an index older than the sliding window (state.base) returns null. Memory stays flat: once more than
// TUNE.endless.window guests are stored the oldest go, down to TUNE.endless.keep.
export function endlessGuest(state, index) {
  const gen = state.gen, base = state.base | 0;
  index = Math.max(0, Math.floor(index || 0));
  if (!gen) return index >= base ? state.guests[index - base] || null : null;
  const E = TUNE.endless;
  while (state.base + state.guests.length <= index) {
    const i = state.base + state.guests.length;
    if (endlessRepin(i)) {
      const last = state.mutations.length ? state.mutations[state.mutations.length - 1].at : 0;
      if (last < i) state.mutations.push({ at: i, rule: makeRule(gen.r, endlessRuleParams(i), ruleAt(state, i - 1)) });
    }
    if (gen.qpos >= gen.queue.length) {
      // a verdict block runs from one re-pin to the next (12, 8, then 10 guests), so one rule decides its colour cap
      const len = nextRepin(i) - i, b = inBounds(len), pv = paintVerdict(ruleAt(state, i));
      gen.paint.length = 0;
      for (let k = 0; k < len; k++) gen.paint.push(pv);
      gen.queue = makeSchedule(gen.r, len, b.min, b.max, TUNE.maxRun, gen.hist, null, gen.paint);
      gen.qpos = 0;
    }
    const want = gen.queue[gen.qpos++];
    pushHist(gen.hist, want);
    const p = endlessParams(i);
    let trick = rollTrick(gen.r, p, i);
    if (trick && trick === gen.lastTrick) trick = 0;           // never two liars / two shifters back to back
    gen.lastTrick = trick;
    const g = makeGuest(gen.r, ruleAt(state, i), p, want === 1, { id: i, prevSpecies: gen.prevSpecies, liar: trick === 1, shifter: trick === 2, mix: gen.mix });
    state.guests.push(g);
    gen.prevSpecies = g.species;
    if (state.guests.length > E.window) trimEndless(state, E.keep);
  }
  return index >= state.base ? state.guests[index - state.base] : null;
}

// ---------------------------------------------------------------- scoring + daily
// 'shut' only when the door was shut (3 strikes, shutEarly); a night played to its end is at least 'rope', even with
// nothing right (everyone walked off: nobody wrecked the party, it is simply not a pass)
export function tierFor(correct, total, shutEarly) {
  if (shutEarly) return 'shut';
  if (total > 0 && correct >= total) return 'gold';
  const f = total > 0 ? correct / total : 0;
  if (f >= TUNE.tier.silver) return 'silver';
  if (f >= TUNE.tier.bronze) return 'bronze';
  return 'rope';
}
// correct calls a night of `total` guests needs to pass (Bronze Rope: 9/12, 10/14, 13/18, 14/20) - the result card's
// 'Get {n} right to pass' line on a Rope Holder night
export function passNeed(total) {
  const t = Math.max(0, Math.floor(total || 0));
  return Math.min(t, Math.ceil(TUNE.tier.bronze * t - 1e-9));
}
function pad2(n) { return n < 10 ? '0' + n : String(n); }
// Local calendar day as 'YYYY-MM-DD' (the daily key).
export function todayKey(d) {
  const t = d instanceof Date ? d : new Date();
  return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
}
function dateKey(date) { return date instanceof Date ? todayKey(date) : String(date).trim(); }
export function dailySeed(date) { return hashStr(TUNE.daily.salt + dateKey(date)); }
function dayIndex(key) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
}
// Days since 2026-10-22, plus 1 (launch day = #1; earlier or malformed dates clamp to 1).
export function dailyNightNumber(date) {
  const d = dayIndex(dateKey(date)) - dayIndex(TUNE.daily.epoch) + 1;
  return d >= 1 ? d : 1;
}

// ---------------------------------------------------------------- debug helpers
export function shownEyes(g) { return g.eyes + g.fake.eyes; }
export function isLiar(g) { return g.fake.eyes > 0 || g.fake.hat || g.fake.tail; }
// true when one of the guest's fake props would flip its verdict if it were real (the liar trap)
export function isTrapFake(rule, g) {
  const v = ruleAccepts(rule, g);
  if (g.fake.eyes && acceptsIfReal(rule, g, 'eyes') !== v) return true;
  if (g.fake.hat && acceptsIfReal(rule, g, 'hat') !== v) return true;
  if (g.fake.tail && acceptsIfReal(rule, g, 'tail') !== v) return true;
  return false;
}
export function isFlipShift(g) { return !!(g.shift && g.pre && g.pre.inside !== g.inside); }
function clauseText(c) {
  const v = c.attr === 'eyes' ? c.value + '-eyes' : c.attr === 'hat' ? 'hat' : c.attr === 'tail' ? 'tail' : c.value;
  return (c.has ? '+' : '!') + v;
}
export function describeRule(rule) {
  const out = [];
  for (let i = 0; i < rule.clauses.length; i++) out.push(clauseText(rule.clauses[i]));
  return out.join(' & ');
}
export function describeGuest(g) {
  if (!g) return '(none)';
  let s = '#' + g.id + ' ' + g.species + ' ' + g.color + ' ' + g.eyes + 'e' + (g.fake.eyes ? '(+1 fake)' : '') +
    ' hat:' + g.hat + (g.fake.hat ? '(+fake)' : '') + ' tail:' + (g.tail ? 'y' : 'n') + (g.fake.tail ? '(+fake)' : '') +
    ' ' + g.pattern;
  if (g.shift) s += ' shift ' + g.shift.attr + ' ' + g.pre[g.shift.attr] + '->' + g.shift.value + (isFlipShift(g) ? ' (flip)' : '');
  return s + ' => ' + (g.inside ? 'IN' : 'OUT');
}

// ---------------------------------------------------------------- self test
function validGuest(g) {
  if (SPECIES.indexOf(g.species) < 0 || COLOR_KEYS.indexOf(g.color) < 0 || DOMAIN.eyes.indexOf(g.eyes) < 0) return 'bad species/color/eyes';
  if (HATS.indexOf(g.hat) < 0 || typeof g.tail !== 'boolean' || PATTERNS.indexOf(g.pattern) < 0) return 'bad hat/tail/pattern';
  const f = g.fake;
  if (!f || (f.eyes !== 0 && f.eyes !== 1) || typeof f.hat !== 'boolean' || typeof f.tail !== 'boolean') return 'bad fake shape';
  if (f.eyes && g.eyes > 2) return 'fake eye on 3 eyes';
  if (f.hat && g.hat !== 'none') return 'fake hat over a real hat';
  if (f.tail && g.tail) return 'fake tail over a real tail';
  if ((f.eyes ? 1 : 0) + (f.hat ? 1 : 0) + (f.tail ? 1 : 0) > 1) return 'more than one fake';
  if (!!g.shift !== !!g.pre) return 'shift without pre';
  if (g.shift) {
    if (isLiar(g)) return 'liar and shifter';
    const a = g.shift.attr;
    if (ATTRS.indexOf(a) < 0 || g.shift.value !== g[a] || g.pre[a] === g[a]) return 'bad shift';
    if (DOMAIN[a].indexOf(g.pre[a]) < 0) return 'bad pre value';
    for (let i = 0; i < ATTRS.length; i++) if (ATTRS[i] !== a && g.pre[ATTRS[i]] !== g[ATTRS[i]]) return 'pre differs in more than the shift';
    if (g.pre.species !== g.species || g.pre.id !== g.id) return 'pre identity';
  }
  return null;
}
function validRule(rule, params, nClauses) {
  const cs = rule.clauses;
  if (!cs || cs.length !== Math.min(nClauses, params.attrs.length)) return 'clause count ' + (cs ? cs.length : 0) + ' != ' + nClauses;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (params.attrs.indexOf(c.attr) < 0) return 'attr not allowed: ' + c.attr;
    for (let j = 0; j < i; j++) if (cs[j].attr === c.attr) return 'duplicate attr';
    if (typeof c.has !== 'boolean') return 'has not boolean';
    if (c.attr === 'hat' ? c.value !== 'any' : c.attr === 'tail' ? c.value !== true : c.attr === 'pattern' ? (c.value !== 'stripes' && c.value !== 'dots') : DOMAIN[c.attr].indexOf(c.value) < 0) return 'bad value';
  }
  const p = rulePop(rule);
  if (!(p >= TUNE.popMin - 1e-9 && p <= TUNE.popMax + 1e-9)) return 'population acceptance ' + p.toFixed(3);
  if (params.liars > 0 && hasAny(params.attrs, FAKEABLE) && !hasAny(cs.map(c => c.attr), FAKEABLE)) return 'liar rule without fakeable clause';
  return null;
}
function newAcc() {
  return { nights: 0, guests: 0, inMin: 1, inMax: 0, inSum: 0, maxRun: 0, liars: 0, traps: 0, shifters: 0, flips: 0, mutations: 0, popMin: 1, popMax: 0, tricky: 0,
    colorRep: 0, colorTop: 0, spSpread: 0, windows: 0, winPile: 0, winLoose: 0, sameFake: 0, liarPairs: 0, trickNext: 0, kindNext: 0, multi2: 0, neg2: 0 };
}
// is guest g's colour pinned (the verdict forces it, or it is a trap liar that must pass a 'must be X' clause)?
function colorPinned(rule, g) {
  if (colorForced(rule, g.inside)) return true;
  const ci = colorClause(rule);
  return ci >= 0 && rule.clauses[ci].has && isLiar(g) && isTrapFake(rule, g);
}
// windows of winLen consecutive guests holding more than colorWin of one colour: winPile counts them all, winLoose those
// whose newest pile-up guest's colour was not pinned
function scanColorWindows(night, from, to, acc) {
  const gs = night.guests, W = TUNE.winLen;
  for (let i = Math.max(from, W - 1); i < to; i++) {
    let n = 0;
    for (let j = i - W + 1; j <= i; j++) if (gs[j].color === gs[i].color) n++;
    acc.windows++;
    if (n <= TUNE.colorWin) continue;
    acc.winPile++;
    if (!colorPinned(ruleAt(night, i), gs[i])) acc.winLoose++;
  }
}
// trick spacing: tricks side by side (any kind / the same kind) and consecutive liars faking the same part although
// the later one's rule had another fakeable clause (liarPairs counts those chances)
function scanTricks(night, acc) {
  const gs = night.guests;
  let lastFake = '';
  for (let i = 0; i < gs.length; i++) {
    const t = isLiar(gs[i]) ? 1 : gs[i].shift ? 2 : 0;
    if (t && i > 0) {
      const u = isLiar(gs[i - 1]) ? 1 : gs[i - 1].shift ? 2 : 0;
      if (u) acc.trickNext++;
      if (u === t) acc.kindNext++;
    }
    if (t === 1) {
      const f = gs[i].fake.eyes ? 'eyes' : gs[i].fake.hat ? 'hat' : 'tail';
      if (lastFake && otherFakeable(ruleAt(night, i), lastFake)) { acc.liarPairs++; if (f === lastFake) acc.sameFake++; }
      lastFake = f;
    }
  }
}
function scanRun(guests, from, to) {
  let best = 0, run = 0;
  for (let i = from; i < to; i++) { run = i > from && guests[i].inside === guests[i - 1].inside ? run + 1 : 1; if (run > best) best = run; }
  return best;
}
function checkGuests(night, from, to, acc, fail, tag) {
  const gs = night.guests, params = night.params;
  for (let i = from; i < to; i++) {
    const g = gs[i], rule = ruleAt(night, i);
    const bad = validGuest(g);
    if (bad) fail(tag + ' guest ' + i + ': ' + bad);
    if (g.id !== i) fail(tag + ' guest ' + i + ': id ' + g.id);
    if (ruleAccepts(rule, g) !== g.inside) fail(tag + ' guest ' + i + ': inside disagrees with ruleAccepts');
    const p = night.mode === 'endless' ? endlessParams(i) : params;
    if (i < Math.max(TUNE.trickFrom, p.trickFrom) && (isLiar(g) || g.shift)) fail(tag + ' guest ' + i + ': trick before guest ' + p.trickFrom);
    if (night.mode !== 'endless' && isRepin(p, i) && (isLiar(g) || g.shift)) fail(tag + ' guest ' + i + ': trick on the first guest of a re-pinned rule');
    if (i >= p.trickFrom) acc.tricky++;
    // colour variety: the previous guest's colour again only when the verdict pins it
    if (i > 0 && g.color === gs[i - 1].color && !colorForced(rule, g.inside)) acc.colorRep++;
    if (isLiar(g)) {
      acc.liars++;
      if (p.liars <= 0) fail(tag + ' guest ' + i + ': liar while liars = 0');
      if (isTrapFake(rule, g)) acc.traps++;
    }
    if (g.shift) {
      acc.shifters++;
      if (p.shifters <= 0) fail(tag + ' guest ' + i + ': shifter while shifters = 0');
      if (g.pre.inside !== ruleAccepts(rule, g.pre)) fail(tag + ' guest ' + i + ': pre.inside wrong');
      if (isFlipShift(g)) acc.flips++;
    }
    if (i > 0 && g.species === gs[i - 1].species) fail(tag + ' guest ' + i + ': same species twice in a row');
  }
  acc.guests += to - from;
}
function checkRules(night, acc, fail, tag) {
  const all = [night.rule];
  for (let i = 0; i < night.mutations.length; i++) all.push(night.mutations[i].rule);
  for (let k = 0; k < all.length; k++) {
    const at = k === 0 ? 0 : night.mutations[k - 1].at;
    const p = night.mode === 'endless' ? endlessRuleParams(at) : night.params;
    const n = night.mode === 'endless' ? p.clauses : (k === 0 ? p.clauses : p.clausesAfter);
    const bad = validRule(all[k], p, n);
    if (bad) fail(tag + ' rule ' + k + ' (' + describeRule(all[k]) + '): ' + bad);
    if (k > 0 && !ruleDiffers(all[k], all[k - 1])) fail(tag + ' mutation ' + k + ' does not change the rule');
    const nc = all[k].clauses.length, neg = allNegative(all[k].clauses);
    if (nc >= 3 && neg) fail(tag + ' rule ' + k + ' (' + describeRule(all[k]) + '): ' + nc + " clauses, all 'must NOT'");
    if (nc === 2) { acc.multi2++; if (neg) acc.neg2++; }
    if (nc === 2 && neg && night.mode !== 'endless' && night.params.night <= TUNE.plainAndUntil) fail(tag + ' rule ' + k + ' (' + describeRule(all[k]) + "): two red slashes on a teaching night");
    const pop = rulePop(all[k]);
    if (pop < acc.popMin) acc.popMin = pop;
    if (pop > acc.popMax) acc.popMax = pop;
    // the rule must decide both ways inside its own stretch of the queue
    const end = k + 1 < all.length ? night.mutations[k].at : night.guests.length;
    let ins = 0;
    for (let i = at; i < end; i++) if (night.guests[i].inside) ins++;
    if (end > at + TUNE.maxRun && (ins === 0 || ins === end - at)) fail(tag + ' rule ' + k + ' segment is one-sided');
  }
  acc.mutations += night.mutations.length;
}
function checkNight(night, acc, fail, tag) {
  const p = night.params, gs = night.guests;
  if (gs.length !== p.guests) fail(tag + ': ' + gs.length + ' guests, expected ' + p.guests);
  if (night.mutations.length !== p.repins.length) fail(tag + ': ' + night.mutations.length + ' re-pins, expected ' + p.repins.length);
  for (let k = 0; k < night.mutations.length && k < p.repins.length; k++) if (night.mutations[k].at !== p.repins[k]) fail(tag + ': re-pin ' + k + ' at ' + night.mutations[k].at);
  if ((p.mutationAt === null) !== (p.repins.length === 0) || (p.repins.length && p.mutationAt !== p.repins[0])) fail(tag + ': mutationAt disagrees with repins');
  checkRules(night, acc, fail, tag);
  checkGuests(night, 0, gs.length, acc, fail, tag);
  // exact trick quotas
  let ins = 0, liars = 0, shifters = 0;
  const tally = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < gs.length; i++) {
    if (gs[i].inside) ins++;
    if (isLiar(gs[i])) liars++;
    if (gs[i].shift) shifters++;
    tally[COLOR_KEYS.indexOf(gs[i].color)]++;
  }
  if (liars < p.liarCount[0] || liars > p.liarCount[1]) fail(tag + ': ' + liars + ' liars, quota ' + qText(p.liarCount));
  if (shifters < p.shiftCount[0] || shifters > p.shiftCount[1]) fail(tag + ': ' + shifters + ' shifters, quota ' + qText(p.shiftCount));
  for (let k = 0; k < tally.length; k++) if (tally[k] / gs.length > acc.colorTop) acc.colorTop = tally[k] / gs.length;
  // the House Band's share: IN guests spread evenly over the species
  const sp = [0, 0, 0, 0, 0];
  for (let i = 0; i < gs.length; i++) if (gs[i].inside) sp[SPECIES.indexOf(gs[i].species)]++;
  const spread = Math.max.apply(null, sp) - Math.min.apply(null, sp);
  if (night.mode === 'night' && night.night === 1) {
    // night 1 seats its first member: one species holds TUNE.night1.lead of the IN guests, the first glove guest among them
    const top = Math.max.apply(null, sp);
    if (top < TUNE.night1.lead) fail(tag + ': no species has ' + TUNE.night1.lead + ' IN guests (' + sp.join(',') + ')');
    else if (sp[SPECIES.indexOf(gs[0].species)] !== top) fail(tag + ': the first guest is not the band-seat species');
  } else {
    if (spread > acc.spSpread) acc.spSpread = spread;
    if (spread > TUNE.test.maxSpeciesSpread) fail(tag + ': IN species spread ' + spread + ' (' + sp.join(',') + ')');
  }
  // the guests a rule paints its colour by verdict: at most colorWin in any winLen (so also in a row)
  for (let i = 0; i < gs.length; i++) {
    const pv = paintVerdict(ruleAt(night, i)), x = gs[i].inside ? 1 : 0;
    if (pv !== x) continue;
    let k = 0;
    for (let j = Math.max(0, i - TUNE.winLen + 1); j <= i; j++) if (paintVerdict(ruleAt(night, j)) === (gs[j].inside ? 1 : 0)) k++;
    if (k > TUNE.colorWin) { fail(tag + ' guest ' + i + ': ' + (x ? 'IN' : 'OUT') + ' guests pile up under a colour rule (' + k + ' in ' + TUNE.winLen + ')'); break; }
  }
  scanColorWindows(night, 0, gs.length, acc);
  scanTricks(night, acc);
  // the night's new attribute is on its first poster
  if (p.focus && !hasAny(night.rule.clauses.map(c => c.attr), p.focus)) fail(tag + ': first rule misses the focus ' + p.focus.join('/'));
  // the teaching ladder: every clause of a taught night carries the taught polarity
  const teach = night.mode === 'night' ? TUNE.teach[night.night] : undefined;
  if (teach !== undefined) {
    const all = [night.rule];
    for (let k = 0; k < night.mutations.length; k++) all.push(night.mutations[k].rule);
    for (let k = 0; k < all.length; k++) {
      for (let c = 0; c < all[k].clauses.length; c++) if (all[k].clauses[c].has !== (teach === 1)) fail(tag + ': taught polarity broken (' + describeRule(all[k]) + ')');
    }
  }
  const rate = ins / gs.length, b = inBounds(gs.length);
  if (ins < b.min || ins > b.max) fail(tag + ': IN-rate ' + (rate * 100).toFixed(1) + ' %');
  const run = scanRun(gs, 0, gs.length);
  if (run > TUNE.maxRun) fail(tag + ': verdict run ' + run);
  if (night.mode === 'night' && night.night === 1 && (!gs[0].inside || gs[1].inside)) fail(tag + ': tutorial opening not IN, OUT');
  acc.nights++; acc.inSum += rate;
  if (rate < acc.inMin) acc.inMin = rate;
  if (rate > acc.inMax) acc.inMax = rate;
  if (run > acc.maxRun) acc.maxRun = run;
}
function pct(x) { return (x * 100).toFixed(1) + ' %'; }
function accLine(name, a) {
  return name + ': ' + a.nights + ' nights, ' + a.guests + ' guests | IN-rate min ' + pct(a.inMin) + ' max ' + pct(a.inMax) +
    ' mean ' + pct(a.nights ? a.inSum / a.nights : 0) + ' | max run ' + a.maxRun + ' | liars ' + a.liars + ' (trap ' +
    pct(a.liars ? a.traps / a.liars : 0) + ') | shifters ' + a.shifters + ' (flip ' + pct(a.shifters ? a.flips / a.shifters : 0) +
    ') | mutations ' + a.mutations + ' | rule pop ' + a.popMin.toFixed(3) + '-' + a.popMax.toFixed(3) +
    ' | colour repeats ' + a.colorRep + (a.colorTop ? ', top colour share ' + pct(a.colorTop) : '') +
    ' | 3+ of a colour in ' + TUNE.winLen + ': ' + pct(a.windows ? a.winPile / a.windows : 0) + ' (unforced ' + a.winLoose + ')' +
    ' | tricks side by side ' + a.trickNext + ' (same kind ' + a.kindNext + '), same fake twice ' + a.sameFake + '/' + a.liarPairs +
    (a.multi2 ? ' | double-NOT 2-clause rules ' + pct(a.neg2 / a.multi2) : '') + (a.spSpread ? ' | IN species spread <= ' + a.spSpread : '');
}

export function selfTest() {
  const T = TUNE.test;
  const fails = [];
  const fail = msg => { fails.push(msg); };
  const t0 = Date.now();
  STATS.fallbackGuests = 0; STATS.fallbackRules = 0; STATS.liarSkipped = 0; STATS.schedRelax = 0;
  const report = [];

  // the ladder: one new thing per step (spot checks)
  const NP = [null];
  for (let n = 1; n <= 40; n++) NP.push(nightParams(n));
  const q = (a, lo, hi) => a[0] === lo && a[1] === hi;
  const noTricks = p => p.liarCount[1] === 0 && p.shiftCount[1] === 0;
  const plain = p => noTricks(p) && p.mutationAt === null;
  const fx = p => (p.focus ? p.focus.join() : '');
  if (NP[1].guests !== 12 || NP[1].clauses !== 1 || NP[1].patienceMs !== 6500 || NP[1].attrs.join() !== 'color,eyes' || !plain(NP[1]) || TUNE.teach[1] !== 1) fail('params night 1');
  if (NP[2].guests !== 12 || NP[2].clauses !== 1 || NP[2].attrs.length !== 4 || fx(NP[2]) !== 'hat' || !plain(NP[2]) || TUNE.teach[2] !== 1) fail('params night 2: + hats');
  if (NP[3].guests !== 14 || NP[3].clauses !== 1 || NP[3].attrs.length !== 4 || fx(NP[3]) !== 'tail' || NP[3].patienceMs !== 6500 || !plain(NP[3]) || TUNE.teach[3] !== 0) fail('params night 3: first red slash (on a tail)');
  if (NP[4].guests !== 16 || NP[4].clauses !== 1 || NP[4].attrs.length !== 4 || fx(NP[4]) || !q(NP[4].liarCount, 2, 2) || NP[4].shiftCount[1] ||
      NP[4].mutationAt !== null || NP[4].trickFrom !== 5 || TUNE.teach[4] !== undefined) fail('params night 4: mixed polarity + the liars debut (exactly 2 from guest 6)');
  if (NP[5].guests !== 18 || NP[5].clauses !== 2 || NP[5].attrs.length !== 4 || NP[5].shiftCount[1] || NP[5].mutationAt !== null) fail('params night 5: 2 clauses');
  if (NP[6].guests !== 20 || NP[6].clauses !== 2 || NP[6].attrs.length !== 4 || !q(NP[6].shiftCount, 2, 2) || !q(NP[6].liarCount, 2, 2) || NP[6].mutationAt !== null ||
      fx(NP[6]) || fx(NP[5]) || NP[6].patienceMs !== 5000) fail('params night 6: the shapeshifters debut (exactly 2)');
  if (NP[7].attrs.length !== 5 || fx(NP[7]) !== 'pattern' || NP[7].mutationAt !== null || NP[6].attrs.indexOf('pattern') >= 0) fail('params night 7: + the pattern');
  if (NP[8].mutationAt !== 10 || NP[8].clausesAfter !== 2 || NP[7].mutationAt !== null) fail('params night 8: first re-pin, 2 clauses');
  if (NP[10].clausesAfter !== 2 || NP[11].clausesAfter !== 3 || NP[11].clauses !== 2 || NP[11].mutationAt !== 10) fail('params night 11: first 3-clause poster (the re-pin)');
  if (patienceFor(10) !== 4400 || patienceFor(15) !== 3800 || patienceFor(35) !== 3000 || patienceFor(99) !== TUNE.patience.floor || NP[10].patienceMs !== 4400 ||
      NP[15].patienceMs !== 3800 || NP[20].clauses !== 3) fail('params patience knots + night 20');
  for (let n = 2; n <= 40; n++) if (patienceFor(n) > patienceFor(n - 1)) fail('patience rises at night ' + n);
  for (let n = 1; n <= 40; n++) {
    const m = NP[n].mod ? TUNE.mods[NP[n].mod] : null;
    if ((m && m.patience ? NP[n].patienceMs >= patienceFor(n) : NP[n].patienceMs !== patienceFor(n))) fail('night ' + n + ': patience ' + NP[n].patienceMs + ' vs ' + patienceFor(n) + ' (' + NP[n].mod + ')');
  }
  for (let n = 1; n <= 3; n++) if (!noTricks(NP[n])) fail('night ' + n + ': tricks before the liars debut');
  for (let n = 5; n <= 40; n++) {
    const lo = NP[n].liarCount[0] + NP[n].shiftCount[0], hi = NP[n].liarCount[1] + NP[n].shiftCount[1];
    const top = NP[n].mod && T.trickMax[NP[n].mod] ? T.trickMax[NP[n].mod] : T.tricks[1];
    if (lo < T.tricks[0] || hi > top) fail('night ' + n + ': ' + lo + '-' + hi + ' tricks (after the debuts: ' + T.tricks[0] + '-' + top + ')');
  }
  // the twist ladder: nights 1-11 and 20 plain, 12-19 one distinct twist each (one new thing a night), then the rotation
  // (every twist comes round, one night in the cycle plain); every twist changes what the night plays like
  const seenMod = {};
  for (let n = 1; n <= 20; n++) {
    const id = NP[n].mod;
    if ((n < 12 || n === 20) && id) fail('night ' + n + ': twist ' + id + ' outside the twist ladder');
    if (n >= 12 && n <= 19) { if (!id) fail('night ' + n + ': no twist'); else if (seenMod[id]) fail('night ' + n + ': twist ' + id + ' twice'); else seenMod[id] = n; }
  }
  for (const id in TUNE.mods) if (!seenMod[id]) fail('twist ' + id + ' never on nights 12-19');
  const RL = TUNE.rotate.list, rotSeen = {};
  for (let n = TUNE.rotate.from; n < TUNE.rotate.from + RL.length; n++) rotSeen[NP[n].mod || ''] = true;
  for (let k = 0; k < RL.length; k++) if (!rotSeen[RL[k]] || nightMod(TUNE.rotate.from + k + RL.length) !== (RL[k] || null)) fail('twist rotation at ' + RL[k]);
  const base12 = { guests: 20, repins: '10', liars: '2,3', shifters: '1,2', walk: TUNE.walkMs, near: TUNE.nearMiss };
  for (let n = 12; n <= 19; n++) {
    const p = NP[n], m = TUNE.mods[p.mod];
    if (!m) continue;
    const same = p.guests === base12.guests && p.repins.join() === base12.repins && p.liarCount.join() === base12.liars && p.shiftCount.join() === base12.shifters &&
      p.walkMs === base12.walk && p.nearMiss === base12.near && p.patienceMs === patienceFor(n);
    if (same) fail('night ' + n + ': twist ' + p.mod + ' changes nothing');
    if (p.clauses !== 2 || p.clausesAfter !== 3) fail('night ' + n + ': the twist must ride on the 2 -> 3 clause base');
  }
  if (NP[13].repins.join() !== '7,14' || NP[15].guests !== 24 || NP[17].repins.join() !== '6' || NP[18].nearMiss !== 1 || !(NP[16].walkMs < TUNE.walkMs)) fail('twist anchors');
  const DPt = dailyParams();
  if (DPt.mutationAt !== null || !q(DPt.liarCount, 2, 2) || !q(DPt.shiftCount, 2, 2) || DPt.clausesAfter !== DPt.clauses || DPt.clauses !== 2 || DPt.focus) fail('daily params');
  const E0 = TUNE.endless;
  if (endlessParams(0).patienceMs !== E0.patienceFrom || endlessParams(E0.patienceBy).patienceMs !== E0.patienceTo ||
      endlessParams(0).clauses !== 1 || endlessParams(11).clauses !== 1 || endlessParams(12).clauses !== 2 || endlessParams(29).clauses !== 2 ||
      endlessParams(30).clauses !== 3 || endlessParams(0).missStrike !== 1 || endlessParams(0).bounceStrike !== 1) fail('endless params');
  if (endlessParams(E0.trickFrom - 1).liars !== 0 || endlessParams(E0.trickFrom - 1).shifters !== 0 || !(endlessParams(E0.trickFrom).liars > 0) ||
      endlessParams(E0.trickFull).liars !== E0.liars || endlessParams(E0.trickFull - 1).liars >= E0.liars) fail('endless trick ramp');

  // campaign nights
  const accN = newAcc();
  for (let k = 0; k < T.nights; k++) {
    const nn = 1 + (k % T.maxNight), seed = 1000 + k * 7919;
    const night = makeNight({ seed, night: nn, mode: 'night' });
    checkNight(night, accN, fail, 'night ' + nn + ' seed ' + seed);
    if (k % 25 === 0 && JSON.stringify(night) !== JSON.stringify(makeNight({ seed, night: nn, mode: 'night' }))) fail('night ' + nn + ' seed ' + seed + ': not deterministic');
  }
  report.push(accLine('campaign', accN));

  // night 1's band seat over many seeds: the lead species' IN guests (the first glove guest included), the runner-up,
  // the IN count, and how many lead guests after the glove guests a player may get wrong and still seat it (need 3)
  const N1 = TUNE.night1, lead = {}, ins1 = {};
  let minSlack = 99, n1Relax = 0;
  for (let k = 0; k < T.night1Seeds; k++) {
    const nt = makeNight({ seed: 50000 + k * 104729, night: 1, mode: 'night' }), sp = [0, 0, 0, 0, 0];
    let ins = 0;
    for (let i = 0; i < nt.guests.length; i++) if (nt.guests[i].inside) { ins++; sp[SPECIES.indexOf(nt.guests[i].species)]++; }
    const li = SPECIES.indexOf(nt.guests[0].species), top = sp[li];
    let second = 0;
    for (let j = 0; j < sp.length; j++) if (j !== li && sp[j] > second) second = sp[j];
    const key = top + '/' + second;
    lead[key] = (lead[key] || 0) + 1;
    ins1[ins] = (ins1[ins] || 0) + 1;
    if (ins < N1.minIn) n1Relax++;
    // slack: lead guests the player may miss and still reach 3 correct admits (the glove guests 1-3 are taught calls)
    let taught = 0, rest = 0;
    for (let i = 0; i < nt.guests.length; i++) {
      if (!nt.guests[i].inside || SPECIES.indexOf(nt.guests[i].species) !== li) continue;
      if (i < 3) taught++; else rest++;
    }
    const slack = taught + rest - 3;
    if (slack < minSlack) minSlack = slack;
    if (top < N1.lead) fail('night 1 seed ' + k + ': lead species has ' + top + ' IN guests');
  }
  if (minSlack < N1.lead - 3) fail('night 1: band-seat slack ' + minSlack);
  report.push('night 1 band seat (' + T.night1Seeds + ' seeds): lead/runner-up ' + Object.keys(lead).sort().map(k => k + ' x' + lead[k]).join(', ') +
    ' | IN guests ' + Object.keys(ins1).sort().map(k => k + ' x' + ins1[k]).join(', ') + ' (below ' + N1.minIn + ': ' + n1Relax + ') | slack >= ' + minSlack);

  // daily nights
  const accD = newAcc();
  const seen = {};
  let collisions = 0;
  const day0 = Date.UTC(2026, 9, 22);
  for (let k = 0; k < T.daily; k++) {
    const d = new Date(day0 + k * 86400000);
    const key = d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
    const seed = dailySeed(key);
    if (seed !== dailySeed(key) || seed !== (seed >>> 0)) fail('daily ' + key + ': seed not a stable uint32');
    if (seen[seed]) collisions++;
    seen[seed] = true;
    if (dailyNightNumber(key) !== k + 1) fail('daily ' + key + ': number ' + dailyNightNumber(key) + ' != ' + (k + 1));
    const night = makeNight({ seed, night: TUNE.daily.night, mode: 'daily' });
    if (night.night !== TUNE.daily.night || !night.params.daily || night.mutations.length) fail('daily ' + key + ': wrong params');
    checkNight(night, accD, fail, 'daily ' + key);
    if (k % 20 === 0 && JSON.stringify(night) !== JSON.stringify(makeNight({ seed, night: 3, mode: 'daily' }))) fail('daily ' + key + ': not identical for everyone');
  }
  if (collisions) fail('daily seeds collide: ' + collisions);
  if (dailyNightNumber('2026-10-22') !== 1 || dailyNightNumber('2027-10-22') !== 366 || dailyNightNumber('2026-11-01') !== 11) fail('dailyNightNumber anchors');
  report.push(accLine('daily', accD) + ' | unique seeds ' + (T.daily - collisions) + '/' + T.daily + ' | #1 = 2026-10-22');

  // endless: generated one guest at a time like the play scene; `full` keeps a copy of everything for the checks while
  // the state itself only holds its sliding window
  const accE = newAcc(), E = TUNE.endless;
  const es = makeNight({ seed: 4242, mode: 'endless' });
  if (es.guests.length !== E.prefill || es.base !== 0) fail('endless prefill ' + es.guests.length);
  const full = { mode: 'endless', seed: es.seed, night: 0, rule: es.rule, params: es.params, guests: [], mutations: [] };
  let lastAt = 0, peakG = 0, peakM = 0;
  for (let i = 0; i < T.endless; i++) {
    const g = endlessGuest(es, i);
    if (!g || g.id !== i || endlessGuest(es, i) !== g) fail('endless guest ' + i + ' not stored');
    full.guests.push(g);
    for (let k = 0; k < es.mutations.length; k++) if (es.mutations[k].at > lastAt) { full.mutations.push(es.mutations[k]); lastAt = es.mutations[k].at; }
    if (es.guests.length > peakG) peakG = es.guests.length;
    if (es.mutations.length > peakM) peakM = es.mutations.length;
  }
  if (es.base + es.guests.length !== T.endless) fail('endless length ' + (es.base + es.guests.length));
  if (peakG > E.window || peakM > Math.ceil(E.window / E.mutateEvery) + 1) fail('endless memory not flat: ' + peakG + ' guests, ' + peakM + ' re-pins stored');
  if (es.base <= 0 || endlessGuest(es, 0) !== null || endlessGuest(es, es.base) !== es.guests[0]) fail('endless window bookkeeping');
  for (let i = es.base; i < T.endless; i++) if (ruleAt(es, i) !== ruleAt(full, i)) { fail('endless ruleAt drifts after trimming at ' + i); break; }
  const repins = [];
  for (let i = 1; i < T.endless; i++) if (endlessRepin(i)) repins.push(i);
  if (repins[0] !== E.firstRepin || repins[1] !== 2 * E.mutateEvery || repins[2] !== 3 * E.mutateEvery) fail('endless re-pin points ' + repins.slice(0, 4).join(','));
  if (full.mutations.length !== repins.length) fail('endless mutations ' + full.mutations.length + ' != ' + repins.length);
  for (let i = 0; i < full.mutations.length; i++) if (full.mutations[i].at !== repins[i]) { fail('endless mutation ' + i + ' at ' + full.mutations[i].at); break; }
  checkRules(full, accE, fail, 'endless');
  checkGuests(full, 0, full.guests.length, accE, fail, 'endless');
  scanColorWindows(full, 0, full.guests.length, accE);
  scanTricks(full, accE);
  const run = scanRun(full.guests, 0, full.guests.length);
  if (run > TUNE.maxRun) fail('endless verdict run ' + run);
  for (let w = 0; w + 20 <= full.guests.length; w += 20) {
    let ins = 0;
    for (let i = w; i < w + 20; i++) if (full.guests[i].inside) ins++;
    const b = inBounds(20);
    if (ins < b.min || ins > b.max) fail('endless window ' + w + ': ' + ins + '/20 IN');
    const rate = ins / 20;
    if (rate < accE.inMin) accE.inMin = rate;
    if (rate > accE.inMax) accE.inMax = rate;
    accE.inSum += rate; accE.nights++;
  }
  accE.maxRun = run;
  if (full.rule.clauses.length !== 1 || ruleAt(full, E.firstRepin - 1).clauses.length !== 1 || ruleAt(full, E.firstRepin).clauses.length !== 2 ||
      ruleAt(full, 29).clauses.length !== 2 || ruleAt(full, 30).clauses.length !== 3 || ruleAt(full, 60).clauses.length !== 3) fail('endless clause ramp');
  let firstTrick = -1;
  for (let i = 0; i < full.guests.length && firstTrick < 0; i++) if (isLiar(full.guests[i]) || full.guests[i].shift) firstTrick = i;
  if (firstTrick < E.trickFrom || firstTrick > E.trickFull) fail('endless first trick at guest ' + firstTrick);
  const es2 = makeNight({ seed: 4242, mode: 'endless' });
  endlessGuest(es2, T.endless - 1);
  if (JSON.stringify(es2) !== JSON.stringify(es)) fail('endless not deterministic under lazy access');
  report.push(accLine('endless', accE).replace(/nights/, 'windows of 20') + ' | stored at most ' + peakG + ' guests');
  const allG = accN.guests + accD.guests + accE.guests, reps = accN.colorRep + accD.colorRep + accE.colorRep;
  if (reps / allG > T.maxColorRepeat) fail('unforced colour repeats ' + pct(reps / allG));
  // the visible queue never turns one hue: a third guest of one colour in any 4 only when its colour is pinned
  const wins = accN.windows + accD.windows + accE.windows, loose = accN.winLoose + accD.winLoose + accE.winLoose;
  if (loose / wins > T.maxColorWin) fail('unforced colour pile-ups in ' + TUNE.winLen + ' guests: ' + pct(loose / wins));
  if (accN.kindNext + accD.kindNext > (accN.liars + accN.shifters + accD.liars + accD.shifters) * 0.02) fail('tricks of a kind side by side ' + (accN.kindNext + accD.kindNext));
  if (accN.liarPairs && accN.sameFake / accN.liarPairs > 0.25) fail('consecutive liars fake the same part ' + pct(accN.sameFake / accN.liarPairs));
  const m2 = accN.multi2 + accD.multi2 + accE.multi2, n2 = accN.neg2 + accD.neg2 + accE.neg2;
  if (m2 && n2 / m2 > T.maxDoubleNeg) fail('double-negative 2-clause rules ' + pct(n2 / m2));

  // trap rates across everything
  const liars = accN.liars + accD.liars + accE.liars, traps = accN.traps + accD.traps + accE.traps;
  const shifters = accN.shifters + accD.shifters + accE.shifters, flips = accN.flips + accD.flips + accE.flips;
  if (liars < 50) fail('too few liars to judge: ' + liars);
  if (shifters < 50) fail('too few shifters to judge: ' + shifters);
  if (liars && traps / liars < T.minTrap) fail('liar trap rate ' + pct(traps / liars));
  if (shifters && flips / shifters < T.minFlip) fail('shift flip rate ' + pct(flips / shifters));
  if (accE.liars < 5 || accE.shifters < 5) fail('endless tricks missing');

  // tiers
  if (tierFor(20, 20, false) !== 'gold' || tierFor(18, 20, false) !== 'silver' || tierFor(14, 20, false) !== 'bronze' ||
      tierFor(13, 20, false) !== 'rope' || tierFor(1, 20, false) !== 'rope' || tierFor(20, 20, true) !== 'shut' || tierFor(0, 12, false) !== 'rope' ||
      tierFor(0, 20, true) !== 'shut') fail('tierFor');
  for (const t of [12, 14, 16, 18, 20]) {
    const n = passNeed(t);
    if (tierFor(n, t, false) !== 'bronze' && tierFor(n, t, false) !== 'silver' && tierFor(n, t, false) !== 'gold') fail('passNeed(' + t + ') = ' + n + ' does not pass');
    if (tierFor(n - 1, t, false) !== 'rope') fail('passNeed(' + t + ') = ' + n + ' is not the minimum');
  }
  if (passNeed(12) !== 9 || passNeed(14) !== 10 || passNeed(20) !== 14) fail('passNeed anchors');

  report.push('traps: liars ' + liars + ' (trap ' + pct(liars ? traps / liars : 0) + ', no-trap liars skipped ' + STATS.liarSkipped + ') | shifters ' + shifters +
    ' (verdict flip ' + pct(shifters ? flips / shifters : 0) + ')');
  report.push('fallbacks: constructed guests ' + STATS.fallbackGuests + ', fallback rules ' + STATS.fallbackRules + ', relaxed schedules ' + STATS.schedRelax +
    ' | ' + (Date.now() - t0) + ' ms');
  const ok = fails.length === 0;
  report.unshift(ok ? 'selfTest OK' : 'selfTest FAILED: ' + fails.length + ' problems');
  for (let i = 0; i < fails.length && i < 25; i++) report.push('FAIL ' + fails[i]);
  return {
    ok, report,
    stats: {
      campaign: accN, daily: accD, endless: accE, liars, traps, shifters, flips,
      trapRate: liars ? traps / liars : 0, flipRate: shifters ? flips / shifters : 0,
      fallbackGuests: STATS.fallbackGuests, fallbackRules: STATS.fallbackRules, ms: Date.now() - t0,
    },
  };
}
