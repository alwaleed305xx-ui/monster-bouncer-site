// profile.js: the saved meta progress of Monster Bouncer (GAME-SPEC §9): next night, best results, the Gold Rope count, STARS
// -> party decor (EVERY passed night counts, not only Golds: a night's best tier is worth gold 3 / silver 2 / bronze 1
// stars, a counted daily the same, + 1 quick-call star once per night / counted daily for a passing run with quick calls
// on >= 50 % of its guests (r.quick from the play scene, TUNE.speedStar); a replay only adds the difference to that
// night's best; 10 decor levels at TUNE.decorStars 0, 3, 6, 10, 15, 21, 28, 36, 45, 56 stars: 0..6 dress the party
// window, 7..9 the club front in the lobby, a new level every 2-3 nights for a 90 % (silver) player; decorReveal() /
// markDecorSeen() let the lobby spotlight each new level once), the House Band (a
// species joins when its CORRECT admits reach the need of the next free seat: 3, 6, 9, 12, 16 by join order; data.js
// deals every species an even share of IN guests and night 1 four IN guests of one species, and a passed night that
// still leaves the band empty seats the species with the most correct admits (TUNE.firstSeat), so the first pass always
// seats a member and a campaign player another every 2-3 nights, sooner with dailies and retries; after joining, every
// 10 more correct admits of it earns its next colour look, 6 looks per species; the newest one is worn automatically
// only when no other species wears that hue (one hue per member; else it waits in the dressing room), profile.setLook to
// change), the Daily unlock (after night TUNE.dailyAfter = 5: profile.dailyUnlocked(); recordNight's dailyUnlocked flags
// the night that opened it and dailyNew() stays true until a daily is first started: the lobby's 'New' sticker), the
// daily history + streak with
// 2 auto-consumed freezes per ISO week, the All-Nighter best and the settings (applied immediately: language via i18n,
// haptics via input.haptics, sfx /
// music / left-hand mode through profile.onSettings(fn) so the party-music wiring stays in the scenes).
// Usage: import { profile } from './profile.js';
//        profile.recordNight({ mode, night, correct, total, tier, admitted, date, startedAt, seed, quick }) -> outcome (see recordNight)
// Money lives elsewhere: gems, cosmetics, boosters, the piggy, the Club Pass, VIP, the starter / offer flags and the IAP
// ledger are the WALLET (js/game/economy.js, its own save 'mbouncer.wallet', docs/MONETIZATION.md §11.3), so reset()
// never touches anything bought or earned there. profile.onRecord(fn) hands every recorded result to the wallet, which
// pays its gems against its own reset-proof high-water marks. profile.vip is a reserved field the game never reads
// (wallet.vip() is the only VIP truth).
// Daily attempts: one attempt counts, and it counts from its START. The play scene calls
//        profile.startDaily(date, startedAt, total) -> { run, counts }
// when a daily run begins (enter / restart): run = that date's run number (0 = not a live daily: practice), counts = this
// is the day's counted attempt. The first live run of a date records the attempt right away as a placeholder result
// (Shut Down 0/total, flagged open), so leaving it any way at all (pause -> Home, a crash, killing the app) still uses up
// the day: recordNight on that run replaces the placeholder with the real score, abandonDaily (left from the pause
// overlay after a decision) with the score so far, unmarkDailyStart (left before any decision) hands the attempt back; a
// placeholder still open TUNE.openStaleMs after its start is closed on the next load as the day's Shut Down (streak
// credited, like a 3-strike night). Scenes that launch a daily before the play scene runs (home, boot's challenge link,
// result's Again, pause restart) may call profile.markDailyStart(date, startedAt) instead; the play scene's startDaily
// for the same date then confirms that run instead of counting a second one. Later runs of the date are replays.
// Several tabs: every write first folds in what another tab saved since (best results, unlocks, counts, the newer
// settings), and a 'storage' event merges another tab's save live, so no tab overwrites another's progress.
// Progression: a night PASSES at Bronze Rope or better (>= 70 % correct; TUNE.passTiers). Wrong bounces cost no strike and
// 35-65 % of guests are OUT, so 'rope' (bounce-everyone territory) is a Retry, never a Next Night. Only the FRONTIER night
// (night === nextNight()) advances progress; replays of earlier nights update their best + Gold; a night beyond the
// frontier (a friend's challenge link) is practice: only the band counts, nothing else is stored.
// Dailies: only a daily dated TODAY earns streak credit and its Gold, plus yesterday's daily during the first TUNE.graceHours
// when its run STARTED before local midnight (the play scene passes r.startedAt = Date.now() at the run's start; without it
// there is no grace). Any other date (old links, rolled-back clocks) is stored as practice ({ practice: true }), a future
// date is never stored, and streak.last never moves past today (a later value from a clock rollback is clamped on record).
// Freezes are only spent on a gap they actually bridge: a gap too long to save restarts the streak at 1 and keeps this
// week's freezes (or a fresh 2 in a new week) for the new streak.
// Settings: listeners get fn(key, value, settings). Party wiring: profile.onSettings((k, v, s) => party.setEnabled(s.sfx,
// s.music), true). Language: profile.settings.lang is the single source of truth; toggle it with profile.setSetting('lang',
// 'en'|'ar'|'') ('' = follow the device); a direct i18n.set/toggle elsewhere (boot's double-tap) is picked up by an
// i18n.onChange hook and saved as the explicit setting, so the next load never reverts it. In Auto, i18n's own 'lang' key
// is cleared.
// Decor API: decorLevel(); decorInfo() -> { level, stars, prev, next, ropes, golds } (golds = stars: the decor currency, the
// field older callers read; ropes = the Gold Rope count); tune.decorGolds is the same table as tune.decorStars.
// Query helpers (streakInfo, bandProgress, decorInfo, dailyStatus, bandUnlocked) allocate small objects/strings: call them on
// scene enter or after recordNight and cache the result (or pass an `out` object to refill), never per frame.
// The save lives under 'mbouncer.profile': save.js with the 'mbouncer.' namespace (save.js's own default; it is still
// swapped in around profile reads/writes, so an integrator that changes save.ns stays compatible). A save from before the
// rename is moved over once by save.js's rename migration before this module loads it. Tiers come from data.tierFor.
import { save } from '../core/save.js';
import { i18n } from '../core/i18n.js';
import { input } from '../core/input.js';
import { tierFor } from './data.js';

const TUNE = {
  ns: 'mbouncer.', key: 'profile', version: 1,
  species: ['blob', 'tall', 'round', 'square', 'bean'],
  bandNeeds: [3, 6, 9, 12, 16],              // correct admits a species needs to join, by join order (1st seat 3, 2nd 6...)
  // the first seat is never missed: a passed night / daily that ends with nobody seated seats the species with the
  // most correct admits (at least `min`; night 1 deals one species 4 IN guests, so this only covers a pass that still
  // missed two of them)
  firstSeat: { min: 1 },
  legacyNeed: 5,                             // the old flat need: skin progress of members unlocked before join order existed
  lookEvery: 10,                             // after joining: every 10 more correct admits earns the species' next look
  // each species' 6 colour looks, the House look (world.js / home.js HOUSE) first, then from most to least contrasting
  looks: {
    blob: ['mint', 'coral', 'sky', 'mustard', 'grape', 'lime'],
    tall: ['coral', 'sky', 'mustard', 'mint', 'grape', 'lime'],
    round: ['sky', 'mustard', 'coral', 'lime', 'grape', 'mint'],
    square: ['mustard', 'grape', 'mint', 'coral', 'sky', 'lime'],
    bean: ['grape', 'lime', 'mustard', 'sky', 'coral', 'mint'],
  },
  decorStars: [0, 3, 6, 10, 15, 21, 28, 36, 45, 56],   // stars needed for decor level 0..9
  tierStars: { gold: 3, silver: 2, bronze: 1, rope: 0, shut: 0 },   // stars a night's best tier (or a counted daily) is worth
  // the quick-call star: a passing run (Bronze+) where at least `share` of the guests got a quick call (the play scene
  // counts them: r.quick) earns `stars` more, once per night and per counted daily. QUICK is a real skill window (an
  // absolute par per guest, ~30-50 % of a good player's calls), so half the night quick is a mastery goal that stays
  // reachable on late nights
  speedStar: { share: 0.5, stars: 1 },
  dailyAfter: 5,                             // the Daily unlocks once night dailyAfter is passed (nextNight() > it): after the
                                             // first liars (4) and the first AND (5), so shapeshifters are its one new thing
  dailyRunsKeep: 14,                         // days of daily start marks kept
  dailyTotal: 20,                            // guests of a daily (the placeholder's total when the caller passes none)
  openStaleMs: 10 * 60000,                   // an open daily placeholder this old is a left run: closed on load
  freezesPerWeek: 2,                         // streak freezes per ISO week, auto-consumed for missed days
  graceHours: 3,                             // yesterday's daily still counts until 03:00 if its run started before 00:00
  shutStrikes: 3,                            // strikes that shut the door (tier fallback when a result carries none)
  tiers: ['shut', 'rope', 'bronze', 'silver', 'gold'],   // worst -> best (index = rank)
  passTiers: ['gold', 'silver', 'bronze'],   // Bronze (>= 70 %) or better unlocks the next night; rope = Retry
  streakNeedsPass: false,                    // true: only passing dailies extend the streak
  dailyKeep: 400,                            // daily history entries kept (oldest dropped)
  maxNight: 9999, maxCount: 1e7,
  langs: ['', 'en', 'ar'],                   // '' = follow the device language
  i18nKey: 'lang',                           // i18n's own save key (core/i18n.js), cleared while the setting is Auto
  testHour: 12,                              // hour of day reported while a dev clock (setToday) is active
};
TUNE.decorGolds = TUNE.decorStars;           // the old name of the decor table (collection.js reads it), same array

const DAY_MS = 86400000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEK_RE = /^(\d{4})-W(\d{2})$/;
const NO = {};
const SETTING_DEFAULTS = { sfx: true, music: true, haptics: true, lang: '', left: false };
const listeners = [];
const recordListeners = [];  // profile.onRecord: fn(outcome, r, kind) after a recorded result (the economy's gem payouts)
const SIM = { ok: true, used: 0, freezes: 0, mon: NaN };   // scratch result of simulateFreezes()
const CREDIT = { up: false, used: 0, broke: false };       // scratch result of creditStreak()

let D = null;                // the live profile object
let storeKey = TUNE.key;
let todayOverride = '';      // dev/test hook: profile.setToday('YYYY-MM-DD', hour)
let hourOverride = -1;
let applying = false;        // true while profile itself drives i18n (the onChange hook ignores those changes)
let lastRev = -1;            // the save revision this tab last read or wrote (a different stored rev = another tab wrote)
const ARMED = { date: '', run: 0 };                        // a daily run marked by markDailyStart, not yet confirmed by startDaily
const DAILY_START = { run: 0, counts: false };             // reused result of startDaily()

// ---- date helpers (calendar days as integers, computed in UTC so DST never shifts a day) ----
function pad(n) { return n < 10 ? '0' + n : String(n); }
function dayNum(s) {
  const m = typeof s === 'string' ? DATE_RE.exec(s) : null;
  if (!m) return NaN;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
}
function dateOf(dn) {
  const d = new Date(dn * DAY_MS);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}
function validDate(s) { const n = dayNum(s); return n === n && dateOf(n) === s; }
// day number of the Monday of dn's ISO week (day 0 = 1970-01-01 was a Thursday); equal Mondays = same ISO week
function mondayOf(dn) { return dn - ((dn % 7 + 10) % 7); }
function isoWeek(dn) {
  const thu = mondayOf(dn) + 3;                                 // the Thursday of that week decides the ISO year
  const year = new Date(thu * DAY_MS).getUTCFullYear();
  const jan1 = Math.round(Date.UTC(year, 0, 1) / DAY_MS);
  return year + '-W' + pad(1 + Math.floor((thu - jan1) / 7));
}
// 'YYYY-Www' -> day number of that week's Monday (NaN when empty/invalid)
function weekStart(s) {
  const m = typeof s === 'string' ? WEEK_RE.exec(s) : null;
  if (!m) return NaN;
  return mondayOf(Math.round(Date.UTC(+m[1], 0, 4) / DAY_MS)) + 7 * (+m[2] - 1);   // week 1 holds Jan 4
}
function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function hourNow() { return todayOverride ? hourOverride : new Date().getHours(); }

// ---- sanitising ----
function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
function intIn(v, lo, hi, def) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v !== '' ? Number(v) : NaN);
  if (!(n === n) || !isFinite(n)) return def;
  const r = Math.floor(n);
  return r < lo ? lo : (r > hi ? hi : r);
}
function tierFrom(correct, total) { return tierFor(correct, total, false); }
function validTier(t) { return typeof t === 'string' && TUNE.tiers.indexOf(t) >= 0; }
// the tier a result earned: its own valid tier, else shut when it ended on strikes (data.tierFor's shutEarly), else by ratio
function resultTier(r, correct, total) {
  if (validTier(r.tier)) return r.tier;
  if (r.shutEarly === true || intIn(r.strikes, 0, 1e6, 0) >= TUNE.shutStrikes) return 'shut';
  return tierFrom(correct, total);
}
function entry(e) {
  if (!isObj(e)) return null;
  const total = intIn(e.total, 0, 1e6, 0);
  const correct = intIn(e.correct, 0, total > 0 ? total : 1e6, 0);
  const out = { correct, total, tier: validTier(e.tier) ? e.tier : tierFrom(correct, total) };
  if (e.fast === true) out.fast = true;                       // the quick-call star was earned on this night / daily
  if (e.practice === true) out.practice = true;
  // a daily's attempt placeholder (startDaily): open until that run is recorded / left; at = when it started (ms)
  if (e.open === true && !out.practice) { out.open = true; out.at = typeof e.at === 'number' && isFinite(e.at) ? e.at : 0; }
  return out;
}
function coerceSetting(key, v) {
  if (key === 'lang') return typeof v === 'string' && TUNE.langs.indexOf(v) >= 0 ? v : '';
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'on';
  return !!v;
}

function defaults() {
  const band = {}, unlocked = {}, at = {}, look = {};
  for (let i = 0; i < TUNE.species.length; i++) {
    const sp = TUNE.species[i];
    band[sp] = 0; unlocked[sp] = false; at[sp] = 0; look[sp] = TUNE.looks[sp][0];
  }
  const settings = {};
  for (const k in SETTING_DEFAULTS) settings[k] = SETTING_DEFAULTS[k];
  return {
    v: TUNE.version, night: 1, bestNight: {}, golds: 0, stars: 0, band, bandUnlocked: unlocked, bandAt: at, look,
    streak: { count: 0, last: '', freezes: TUNE.freezesPerWeek, freezeWeek: '' },
    daily: {}, dailyRuns: {}, endlessBest: 0, seen: { tutorial: false }, settings, settingsAt: 0, vip: false, rev: 0,
    decorSeen: 0,   // the decor level the lobby has revealed (decorReveal / markDecorSeen)
  };
}

// ---- House Band (operate on D) ----
function seatsTaken() {
  let n = 0;
  for (let i = 0; i < TUNE.species.length; i++) if (D.bandUnlocked[TUNE.species[i]]) n++;
  return n;
}
// correct admits the next species to join needs (the need of the next free seat)
function needNow() { const N = TUNE.bandNeeds; return N[Math.min(seatsTaken(), N.length - 1)]; }
// looks a member owns (1 = its House look; 0 while it is not in the band)
function looksOwned(sp) {
  if (!D.bandUnlocked[sp]) return 0;
  return Math.min(TUNE.looks[sp].length, 1 + Math.floor(Math.max(0, D.band[sp] - D.bandAt[sp]) / TUNE.lookEvery));
}
// seats every locked species whose count reaches the next seat's need, the highest count first (SPECIES order on ties);
// pushes them onto `out` (when given) in join order
function joinPass(out) {
  for (;;) {
    const need = needNow();
    let best = '', bc = -1;
    for (let i = 0; i < TUNE.species.length; i++) {
      const sp = TUNE.species[i];
      if (!D.bandUnlocked[sp] && D.band[sp] >= need && D.band[sp] > bc) { best = sp; bc = D.band[sp]; }
    }
    if (!best) return;
    D.bandUnlocked[best] = true; D.bandAt[best] = need; D.look[best] = TUNE.looks[best][0];
    if (out) out.push(best);
  }
}
// the guaranteed first seat (TUNE.firstSeat): nobody seated yet -> the species with the most correct admits (SPECIES
// order on ties) joins now; its looks count from its admits so far; pushed onto `out`
function seatFirst(out) {
  if (seatsTaken() > 0) return;
  let best = '', bc = TUNE.firstSeat.min - 1;
  for (let i = 0; i < TUNE.species.length; i++) { const sp = TUNE.species[i]; if (D.band[sp] > bc) { best = sp; bc = D.band[sp]; } }
  if (!best) return;
  D.bandUnlocked[best] = true; D.bandAt[best] = D.band[best]; D.look[best] = TUNE.looks[best][0];
  out.push(best);
}
function trimRuns() {
  const tn = dayNum(profile.today());
  for (const k in D.dailyRuns) if (!(dayNum(k) >= tn - TUNE.dailyRunsKeep)) delete D.dailyRuns[k];
}

// Merges whatever was stored onto fresh defaults, field by field, so older or damaged saves always load (v:1 schema).
function sanitize(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  d.night = intIn(raw.night, 1, TUNE.maxNight, 1);
  let goldsSeen = 0;
  if (isObj(raw.bestNight)) {
    for (const k in raw.bestNight) {
      const n = intIn(k, 0, TUNE.maxNight, 0), e = entry(raw.bestNight[k]);
      if (n >= 1 && e) {
        if (e.practice) delete e.practice;
        if (e.open) { delete e.open; delete e.at; }
        d.bestNight[String(n)] = e; if (e.tier === 'gold') goldsSeen++;
      }
    }
  }
  if (isObj(raw.daily)) {
    for (const k in raw.daily) {
      const e = entry(raw.daily[k]);
      if (validDate(k) && e) { d.daily[k] = e; if (e.tier === 'gold' && !e.practice) goldsSeen++; }
    }
  }
  d.golds = Math.max(intIn(raw.golds, 0, TUNE.maxCount, 0), goldsSeen);
  // stars only ever grow: the stored count, or what the kept results are worth when that is more (a save from before
  // stars existed migrates here; trimmed old dailies never take stars back)
  d.stars = Math.max(intIn(raw.stars, 0, TUNE.maxCount, 0), starsOf(d));
  const band = isObj(raw.band) ? raw.band : NO, unl = isObj(raw.bandUnlocked) ? raw.bandUnlocked : NO;
  const at = isObj(raw.bandAt) ? raw.bandAt : NO, look = isObj(raw.look) ? raw.look : NO;
  for (let i = 0; i < TUNE.species.length; i++) {
    const sp = TUNE.species[i];
    d.band[sp] = intIn(band[sp], 0, TUNE.maxCount, 0);
    d.bandUnlocked[sp] = unl[sp] === true;
    // a member from before join order kept its seat; its looks count from the old flat need
    d.bandAt[sp] = d.bandUnlocked[sp] ? intIn(at[sp], 0, d.band[sp], Math.min(d.band[sp], TUNE.legacyNeed)) : 0;
  }
  if (isObj(raw.dailyRuns)) for (const k in raw.dailyRuns) { const n = intIn(raw.dailyRuns[k], 0, 99, 0); if (validDate(k) && n > 0) d.dailyRuns[k] = n; }
  // a damaged save (counts without seats) is repaired silently; the worn look must be one the member owns
  const keep = D;
  D = d;
  try {
    joinPass(null);
    for (let i = 0; i < TUNE.species.length; i++) {
      const sp = TUNE.species[i], L = TUNE.looks[sp], j = L.indexOf(look[sp]);
      d.look[sp] = j >= 0 && j < looksOwned(sp) ? L[j] : L[0];
    }
  } finally { D = keep; }
  if (isObj(raw.streak)) {
    const s = raw.streak;
    d.streak.count = intIn(s.count, 0, TUNE.maxCount, 0);
    d.streak.last = validDate(s.last) ? s.last : '';
    d.streak.freezes = intIn(s.freezes, 0, TUNE.freezesPerWeek, TUNE.freezesPerWeek);
    d.streak.freezeWeek = typeof s.freezeWeek === 'string' && WEEK_RE.test(s.freezeWeek) ? s.freezeWeek : '';
    if (!d.streak.last) d.streak.count = 0;
  }
  d.endlessBest = intIn(raw.endlessBest, 0, TUNE.maxCount, 0);
  if (isObj(raw.seen)) for (const k in raw.seen) d.seen[k] = raw.seen[k] === true;
  // a save that already holds a daily has met the Daily (no 'New' sticker); one from before the decor reveal existed
  // (no decorSeen and no seen.decor<N> marks) has seen every level it owns: no reveal of old decor on its first load
  if (!d.seen.daily) for (const k in d.daily) { d.seen.daily = true; break; }
  const lvl = decorFor(d.stars);
  if (raw.decorSeen !== undefined) d.decorSeen = Math.min(lvl, intIn(raw.decorSeen, 0, TUNE.decorStars.length - 1, lvl));
  else if (decorMarked(d, lvl) > 0) d.decorSeen = 0;
  else { d.decorSeen = lvl; if (lvl > 0) d.seen['decor' + lvl] = true; }
  if (isObj(raw.settings)) for (const k in SETTING_DEFAULTS) if (raw.settings[k] !== undefined) d.settings[k] = coerceSetting(k, raw.settings[k]);
  d.settingsAt = intIn(raw.settingsAt, 0, 1e15, 0);
  d.rev = intIn(raw.rev, 0, 1e15, 0);
  d.vip = raw.vip === true;
  d.v = TUNE.version;   // v0 (no field) -> v1: every field above already defaulted; future versions migrate here
  return d;
}

// ---- storage (the 'mbouncer.' namespace is swapped in only around our own reads/writes) ----
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
function revOf(raw) { return isObj(raw) ? intIn(raw.rev, 0, 1e15, 0) : -1; }

// ---- several tabs: fold another tab's saved profile `o` (sanitized) into D. Progress only ever grows: the later
// frontier, the better best, every unlock, the higher counts, the newer streak, the union of the daily history (a
// counted result beats a practice one or an open placeholder); settings follow whichever tab changed them last.
function mergeFrom(o) {
  D.night = Math.max(D.night, o.night);
  for (const k in o.bestNight) {
    const a = D.bestNight[k], b = o.bestNight[k], fast = !!((a && a.fast) || b.fast);
    if (!a || better(b, a)) D.bestNight[k] = b;
    if (fast) D.bestNight[k].fast = true;                      // a quick-call star earned in either tab stays earned
  }
  for (const k in o.daily) {
    const a = D.daily[k], b = o.daily[k];
    if (!a || (a.practice && !b.practice) || (a.open && !b.open && !b.practice)) D.daily[k] = b;
  }
  for (const k in o.dailyRuns) if (!(D.dailyRuns[k] >= o.dailyRuns[k])) D.dailyRuns[k] = o.dailyRuns[k];
  for (let i = 0; i < TUNE.species.length; i++) {
    const sp = TUNE.species[i];
    if (o.band[sp] > D.band[sp]) D.band[sp] = o.band[sp];
    if (o.bandUnlocked[sp] && !D.bandUnlocked[sp]) { D.bandUnlocked[sp] = true; D.bandAt[sp] = o.bandAt[sp]; D.look[sp] = o.look[sp]; }
  }
  joinPass(null);
  let goldsSeen = 0;
  for (const k in D.bestNight) if (D.bestNight[k].tier === 'gold') goldsSeen++;
  for (const k in D.daily) if (D.daily[k].tier === 'gold' && !D.daily[k].practice) goldsSeen++;
  D.golds = Math.max(D.golds, o.golds, goldsSeen);
  D.stars = Math.max(D.stars, o.stars, starsOf(D));
  const S = D.streak, R = o.streak;
  if (R.last > S.last || (R.last === S.last && R.count > S.count)) { S.count = R.count; S.last = R.last; S.freezes = R.freezes; S.freezeWeek = R.freezeWeek; }
  D.endlessBest = Math.max(D.endlessBest, o.endlessBest);
  for (const k in o.seen) if (o.seen[k]) D.seen[k] = true;
  D.decorSeen = Math.min(decorFor(D.stars), Math.max(D.decorSeen, o.decorSeen));
  D.vip = D.vip || o.vip;
  D.rev = Math.max(D.rev, o.rev);
  if (o.settingsAt > D.settingsAt) {
    const old = D.settings;
    D.settings = o.settings; D.settingsAt = o.settingsAt;
    for (const k in SETTING_DEFAULTS) if (old[k] !== D.settings[k]) { applyOne(k, D.settings[k]); notify(k, D.settings[k]); }
  }
}
// the write path: when another tab saved since our last read / write, merge its save first; then bump the revision
function commit() {
  let raw = null;
  try { raw = readRaw(); } catch (e) { raw = null; }
  const rev = revOf(raw);
  if (rev >= 0 && rev !== lastRev) mergeFrom(sanitize(raw));
  D.rev = Math.max(D.rev, rev) + 1;
  writeRaw(D);
  lastRev = D.rev;
}
// another tab saved our key: merge it live (nothing is written back; our next save carries the merge)
function onStorage(e) {
  if (!D || !e || e.key !== TUNE.ns + storeKey || typeof e.newValue !== 'string') return;
  let raw = null;
  try { raw = JSON.parse(e.newValue); } catch (err) { return; }
  if (!isObj(raw)) return;
  mergeFrom(sanitize(raw));
  lastRev = revOf(raw);
}

// ---- settings application ----
function navLang() {
  let nav = 'en';
  try { nav = String(navigator.language || 'en').toLowerCase(); } catch (e) { nav = 'en'; }
  return nav.indexOf('ar') === 0 ? 'ar' : 'en';
}
function applyOne(key, v) {
  if (key === 'lang') {
    applying = true;
    try {
      const want = v || navLang();
      if (want !== i18n.lang) i18n.set(want);
      if (!v) { try { save.del(TUNE.i18nKey); } catch (e) { /* ignore */ } }   // Auto: the device language decides every boot
    } finally { applying = false; }
  } else if (key === 'haptics') {
    if (input && 'haptics' in input) input.haptics = !!v;
  }
}
function notify(key, v) {
  for (let i = 0; i < listeners.length; i++) {
    try { listeners[i](key, v, D.settings); } catch (e) { console.error('[profile] onSettings listener failed', e); }
  }
}
// a recorded result reaches the onRecord listeners (after its save; a listener's failure never breaks the record)
function emitRecord(outcome, r, kind) {
  for (let i = 0; i < recordListeners.length; i++) {
    try { recordListeners[i](outcome, r, kind); } catch (e) { console.error('[profile] onRecord listener failed', e); }
  }
}
// a language switch made straight through i18n (boot double-tap, a home toggle) becomes the saved explicit setting
function onI18nChange(lang, changed) {
  if (applying || !changed || !D || typeof lang !== 'string' || !lang) return;
  if (TUNE.langs.indexOf(lang) < 0 || D.settings.lang === lang) return;
  D.settings.lang = lang;
  D.settingsAt = Date.now();
  commit();
  notify('lang', lang);
}

// ---- streak ----
// Walks the missed days [from..to] consuming freezes (refilled per ISO week, weeks compared by their Monday); fills SIM.
function simulateFreezes(freezes, weekMon, from, to) {
  SIM.ok = true; SIM.used = 0; SIM.freezes = freezes; SIM.mon = weekMon;
  for (let d = from; d <= to; d++) {
    const m = mondayOf(d);
    if (m !== SIM.mon) { SIM.mon = m; SIM.freezes = TUNE.freezesPerWeek; }
    if (SIM.freezes > 0) { SIM.freezes--; SIM.used++; } else { SIM.ok = false; break; }
  }
  return SIM;
}
// a streak.last later than today (device clock rolled back) is pulled back to today
function clampLast(tn) {
  const S = D.streak, lastN = S.last ? dayNum(S.last) : NaN;
  if (lastN === lastN && lastN > tn) S.last = dateOf(tn);
}
// Credits a completed daily on day dn (today or yesterday, never later than today tn); fills CREDIT { up, used, broke }.
// A gap the freezes cannot bridge spends none of them: the stored week's freezes stay (a new week refills below).
function creditStreak(dn, tn) {
  const S = D.streak;
  clampLast(tn);
  if (dn > tn) dn = tn;
  const lastN = S.last ? dayNum(S.last) : NaN;
  CREDIT.up = false; CREDIT.used = 0; CREDIT.broke = false;
  let freezes = S.freezes, fMon = weekStart(S.freezeWeek);
  if (!(lastN === lastN) || S.count <= 0) S.count = 1;
  else if (dn <= lastN) return CREDIT;                       // same day or back in time: nothing to credit
  else {
    const sim = simulateFreezes(freezes, fMon, lastN + 1, dn - 1);
    if (sim.ok) { S.count += 1; CREDIT.used = sim.used; freezes = sim.freezes; fMon = sim.mon; }
    else { S.count = 1; CREDIT.broke = true; }              // freezes/fMon keep their pre-gap values
  }
  const m = mondayOf(dn);
  if (m !== fMon) { fMon = m; freezes = TUNE.freezesPerWeek; }
  S.freezes = freezes;
  S.freezeWeek = isoWeek(fMon);
  S.last = dateOf(dn);
  CREDIT.up = true;
  return CREDIT;
}

function decorFor(stars) {
  let lvl = 0;
  for (let i = 0; i < TUNE.decorStars.length; i++) if (stars >= TUNE.decorStars[i]) lvl = i;
  return lvl;
}
// the highest decor level up to lvl that profile d marks seen as seen.decor<N> (the lobby's own reveal marks), 0 = none
function decorMarked(d, lvl) {
  for (let n = lvl; n >= 1; n--) if (d.seen['decor' + n] === true) return n;
  return 0;
}
// the decor level the lobby has revealed: decorSeen or a seen.decor<N> mark, whichever is higher
function decorShown(d) { return Math.max(d.decorSeen, decorMarked(d, decorFor(d.stars))); }
function tierStars(tier) { const v = TUNE.tierStars[tier]; return v > 0 ? v : 0; }
// what a kept result is worth: its tier's stars + the quick-call star when it was earned there
function entryStars(e) { return tierStars(e.tier) + (e.fast === true ? TUNE.speedStar.stars : 0); }
// stars the kept results of profile `d` are worth: every night's best + every counted daily (no practice runs, no open
// placeholders)
function starsOf(d) {
  let n = 0;
  for (const k in d.bestNight) n += entryStars(d.bestNight[k]);
  for (const k in d.daily) { const e = d.daily[k]; if (!e.practice && !e.open) n += entryStars(e); }
  return n;
}
// did run r earn the quick-call star? A passing run whose quick calls (r.quick, counted by the play scene) reach
// speedStar.share of its guests, or one the play scene flags itself (r.bonusStars > 0)
function fastRun(r, total, passed) {
  if (!passed || total <= 0) return false;
  if (intIn(r.bonusStars, 0, 1e6, 0) > 0) return true;
  return intIn(r.quick, 0, 1e6, 0) >= Math.ceil(TUNE.speedStar.share * total - 1e-9);
}
// is hue `color` free for species sp? (no other species wears it; a species still to join wears its House look, so it
// keeps that hue for when it joins): the band keeps one hue per member
function hueFree(sp, color) {
  for (let i = 0; i < TUNE.species.length; i++) { const o = TUNE.species[i]; if (o !== sp && D.look[o] === color) return false; }
  return true;
}
function better(a, b) {
  const ra = TUNE.tiers.indexOf(a.tier), rb = TUNE.tiers.indexOf(b.tier);
  if (ra !== rb) return ra > rb;
  return a.correct > b.correct;
}
function trimDaily() {
  const keys = Object.keys(D.daily);
  if (keys.length <= TUNE.dailyKeep) return;
  keys.sort();
  for (let i = 0; i < keys.length - TUNE.dailyKeep; i++) delete D.daily[keys[i]];
}
// epoch ms of local 00:00 on calendar day dn (the device's time zone; the Date constructor handles DST)
function localMidnight(dn) {
  const d = new Date(dn * DAY_MS);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime();
}
// true when a daily dated `dn` counts for streak + Gold now: today's, or yesterday's inside the midnight grace when its run
// started (startedAt, epoch ms) on that day, i.e. before local midnight
function dailyLive(dn, tn, startedAt) {
  if (dn === tn) return true;
  if (dn !== tn - 1 || hourNow() >= TUNE.graceHours) return false;
  if (typeof startedAt !== 'number' || !isFinite(startedAt)) return false;
  return startedAt >= localMidnight(dn) && startedAt < localMidnight(tn);
}
function outObj(out) { return out && typeof out === 'object' ? out : {}; }
const LOOKS_BEFORE = [0, 0, 0, 0, 0];
const NOLIST = [];
function clampInt(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function runsOf(date) { return D.dailyRuns[date] > 0 ? D.dailyRuns[date] : 0; }
// has the date no counted result yet? (nothing stored, a practice entry, or the open placeholder of its counted run)
function uncounted(e) { return !e || e.practice === true || e.open === true; }
// one more run of a live daily `key` started at `at` (ms): -> its run number (0 = not live: practice, nothing stored).
// The first run records the attempt at once: an open Shut Down placeholder that only that run's result replaces.
function markRun(key, at, total) {
  const d = D, tn = dayNum(profile.today());
  if (!dailyLive(dayNum(key), tn, at)) return 0;
  const run = runsOf(key) + 1;
  d.dailyRuns[key] = run;
  d.seen.daily = true;                                       // the Daily's 'New' sticker goes once one is started
  if (run === 1 && uncounted(d.daily[key])) d.daily[key] = { correct: 0, total: intIn(total, 1, 1e6, TUNE.dailyTotal), tier: 'shut', open: true, at };
  trimRuns();
  trimDaily();
  profile.save();
  return run;
}
// an open placeholder whose run started TUNE.openStaleMs ago was left (app killed, crashed): it stays as that day's Shut
// Down and, like a left run, keeps the streak alive. Runs on load only (a run in progress is never older than this).
function closeStale() {
  const now = Date.now(), tn = dayNum(profile.today());
  let changed = false;
  for (const k in D.daily) {
    const e = D.daily[k];
    if (!e.open || now - e.at < TUNE.openStaleMs) continue;
    delete e.open; delete e.at;
    clampLast(tn);
    if (!TUNE.streakNeedsPass) creditStreak(Math.min(dayNum(k), tn), tn);
    changed = true;
  }
  return changed;
}

export const profile = {
  tune: TUNE,
  species: TUNE.species,
  get data() { if (!D) profile.load(); return D; },
  get settings() { return profile.data.settings; },
  get endlessBest() { return profile.data.endlessBest; },
  get vip() { return profile.data.vip; },
  get key() { return storeKey; },

  // (re)reads the save, migrates/repairs it, applies language + haptics (no listener calls); returns the data
  load() {
    let raw = null;
    try { raw = readRaw(); } catch (e) { raw = null; }
    D = sanitize(raw);
    lastRev = revOf(raw);
    ARMED.date = ''; ARMED.run = 0;
    applyOne('lang', D.settings.lang);
    applyOne('haptics', D.settings.haptics);
    if (closeStale()) commit();
    return D;
  },
  // writes the profile (merging first whatever another tab saved since this tab last read or wrote)
  save() { if (D) commit(); return D; },

  // switches the storage key (dev tests use a scratch key) and loads it; returns the previous key
  useKey(key) {
    const prev = storeKey;
    storeKey = typeof key === 'string' && key.length ? key : TUNE.key;
    profile.load();
    return prev;
  },

  // the ONLY way to change a setting (language included: 'en' | 'ar' | '' = follow the device)
  setSetting(key, value) {
    if (!Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, key)) return undefined;
    const S = profile.data.settings, v = coerceSetting(key, value);
    S[key] = v;
    D.settingsAt = Date.now();
    applyOne(key, v);
    profile.save();
    notify(key, v);
    return v;
  },
  // fn(key, value, settings) on every setSetting (and on a language picked up from i18n); immediate = true also replays now
  onSettings(fn, immediate) {
    listeners.push(fn);
    if (immediate) { const S = profile.data.settings; for (const k in SETTING_DEFAULTS) { try { fn(k, S[k], S); } catch (e) { console.error(e); } } }
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  },
  // re-applies every setting and replays it to all listeners (e.g. once the party music is wired up)
  applySettings() {
    const S = profile.data.settings;
    for (const k in SETTING_DEFAULTS) { applyOne(k, S[k]); notify(k, S[k]); }
  },

  // r = { mode: 'night'|'daily'|'endless', night, correct, total, tier, shutEarly, strikes, admitted: { species: CORRECT admits },
  //       date (daily: the date of the daily played), startedAt (daily: Date.now() when the run began), endlessScore,
  //       quick (guests decided with a quick call; or bonusStars > 0 when the play scene judged the quick-call star itself) }
  // -> { mode, unlocked: [species] (in join order), looks: [{ species, color, worn }] (looks earned tonight; worn = put on
  //      now: the newest one whose hue no other species wears), newGold, streak: streakInfo(today), decor, decorUp,
  //      decorFrom (the level before tonight: decorUp names decor_<decorFrom + 1> .. decor_<decor>), stars
  //      (total), starsGained (tonight: the tier's stars over the night's previous best, or a counted daily's, + bonusStars),
  //      bonusStars (the quick-call star earned for the first time on this night / daily: show it on the card), fast (this
  //      run qualified for it), firstSeat (unlocked[0] was the guaranteed first seat), dailyUnlocked (this run opened the
  //      Daily Night: 'daily_unlocked' on the card), newBest, passed, advanced, first, practice, streakUp, freezesUsed,
  //      streakBroke, ignored }
  // passed = the tier clears the night (Bronze+; route Next Night vs Retry on it); advanced = nextNight() moved.
  // night: practice = a night beyond the frontier (link): only the band counted. daily: first = the counted attempt of a
  // live daily; practice = not today (nor yesterday in the grace), so only the band and the stored result changed (a future
  // date is not even stored). ignored = a night/daily with no guests (total <= 0): nothing is stored or saved.
  recordNight(r) {
    r = isObj(r) ? r : NO;
    const d = profile.data;
    const today = profile.today(), tn = dayNum(today);
    const mode = r.mode === 'daily' || r.mode === 'endless' ? r.mode : 'night';
    const date = validDate(r.date) ? r.date : today;
    const total = intIn(r.total, 0, 1e6, 0);
    const correct = intIn(r.correct, 0, total > 0 ? total : 1e6, 0);
    const tier = resultTier(r, correct, total);
    const decorBefore = decorFor(d.stars), nightBefore = d.night;
    const out = { unlocked: [], looks: [], newGold: false, streak: null, decor: decorBefore, decorUp: false, decorFrom: decorBefore, newBest: false, passed: false,
      advanced: false, first: true, practice: false, streakUp: false, freezesUsed: 0, streakBroke: false, ignored: false, mode,
      stars: d.stars, starsGained: 0, bonusStars: 0, fast: false, firstSeat: false, dailyUnlocked: false };
    if (mode !== 'endless' && total <= 0) {                     // garbage / empty result: report, store nothing
      out.ignored = true; out.first = false;
      out.streak = profile.streakInfo(today);
      return out;
    }
    clampLast(tn);

    // House Band: only CORRECT admits count (a number per species, or { correct }); seats fill by join order, then looks
    const adm = isObj(r.admitted) ? r.admitted : NO, before = LOOKS_BEFORE;
    for (let i = 0; i < TUNE.species.length; i++) {
      const sp = TUNE.species[i], a = adm[sp];
      before[i] = looksOwned(sp);
      const n = intIn(isObj(a) ? a.correct : a, 0, 1e6, 0);
      if (n > 0) d.band[sp] = Math.min(TUNE.maxCount, d.band[sp] + n);
    }
    joinPass(out.unlocked);
    // the guaranteed first seat: a passed night / daily never ends a fresh band without its first member
    if (mode !== 'endless' && TUNE.passTiers.indexOf(tier) >= 0 && seatsTaken() === 0) { seatFirst(out.unlocked); out.firstSeat = out.unlocked.length > 0; }
    for (let i = 0; i < TUNE.species.length; i++) {
      const sp = TUNE.species[i], now = looksOwned(sp), L = TUNE.looks[sp], from = out.looks.length;
      for (let j = Math.max(1, before[i]); j < now; j++) out.looks.push({ species: sp, color: L[j], worn: false });
      // the newest look earned tonight whose hue no other species wears is put on straight away; when every new one
      // clashes the current look stays (the dressing room shows the new ones), so the band keeps one hue per member
      for (let k = out.looks.length - 1; k >= from; k--) {
        if (hueFree(sp, out.looks[k].color)) { d.look[sp] = out.looks[k].color; out.looks[k].worn = true; break; }
      }
    }

    if (mode === 'endless') {
      const score = intIn(r.endlessScore !== undefined ? r.endlessScore : correct, 0, TUNE.maxCount, 0);
      if (score > d.endlessBest) { d.endlessBest = score; out.newBest = true; }
      out.passed = true;
    } else {
      const res = { correct, total, tier };
      out.passed = TUNE.passTiers.indexOf(tier) >= 0;
      const fast = fastRun(r, total, out.passed), S1 = TUNE.speedStar.stars;
      if (mode === 'night') {
        const night = intIn(r.night, 1, TUNE.maxNight, 1), key = String(night), prev = d.bestNight[key];
        if (night > d.night) out.practice = true;                // beyond the frontier (a link): no best, no Gold, no progress
        else {
          if (tier === 'gold' && (!prev || prev.tier !== 'gold')) { d.golds++; out.newGold = true; }
          // a replay adds only what it beats the night's best by; the quick-call star counts once per night
          const gain = tierStars(tier) - (prev ? tierStars(prev.tier) : 0), had = !!(prev && prev.fast);
          if (gain > 0) out.starsGained = gain;
          if (fast) { out.fast = true; if (!had) { out.bonusStars = S1; out.starsGained += S1; } }
          if (!prev || better(res, prev)) { if (fast || had) res.fast = true; d.bestNight[key] = res; out.newBest = !!prev; }
          else if (fast && !had) prev.fast = true;
          if (out.passed && night === d.night && night < TUNE.maxNight) { d.night = night + 1; out.advanced = true; }
        }
      } else {
        const dn = dayNum(date), live = dailyLive(dn, tn, r.startedAt), prev = d.daily[date];
        out.practice = !live;
        d.seen.daily = true;
        // one attempt counts: the first run (its open placeholder is replaced here); a later run of a date whose first run
        // was started (and restarted, left or killed) is a replay
        out.first = live && uncounted(prev) && runsOf(date) <= 1;
        if (out.first) {
          if (fast) { res.fast = true; out.fast = true; out.bonusStars = S1; }
          d.daily[date] = res;
          if (tier === 'gold') { d.golds++; out.newGold = true; }
          out.starsGained = tierStars(tier) + out.bonusStars;
          if (out.passed || !TUNE.streakNeedsPass) {
            const c = creditStreak(dn, tn);
            out.streakUp = c.up; out.freezesUsed = c.used; out.streakBroke = c.broke;
          }
          trimDaily();
        } else if (!live && !prev && dn < tn) {
          d.daily[date] = { correct, total, tier, practice: true };   // an old daily from a link: kept, no streak, no Gold
          trimDaily();
        }
      }
    }
    if (out.starsGained > 0) d.stars = Math.min(TUNE.maxCount, d.stars + out.starsGained);
    out.stars = d.stars;
    out.streak = profile.streakInfo(today);
    out.decor = decorFor(d.stars);
    out.decorUp = out.decor > decorBefore;
    out.dailyUnlocked = nightBefore <= TUNE.dailyAfter && d.night > TUNE.dailyAfter;
    profile.save();
    emitRecord(out, r, 'night');
    return out;
  },
  // fn(outcome, r, kind) after every recorded result, once it is saved: kind 'night' (recordNight: outcome = its return
  // value, r = the play record) or 'abandon' (abandonDaily stored a counted daily: outcome = its { recorded, streakUp,
  // streak }). The economy (js/game/economy.js) pays its gems here. -> unsubscribe
  onRecord(fn) {
    if (typeof fn !== 'function') return () => {};
    recordListeners.push(fn);
    return () => { const i = recordListeners.indexOf(fn); if (i >= 0) recordListeners.splice(i, 1); };
  },

  nextNight() { return profile.data.night; },
  passed(tier) { return TUNE.passTiers.indexOf(tier) >= 0; },
  bestNight(n) { const e = profile.data.bestNight[String(n)]; return e ? e : null; },
  // would a daily dated `date` (run started at startedAt, epoch ms; omit before the run) earn streak + Gold if finished now?
  // The play/result scenes label the others with the 'practice' string.
  dailyCounts(date, startedAt) {
    const tn = dayNum(profile.today());
    return validDate(date) && dailyLive(dayNum(date), tn, startedAt);
  },
  // would night n count toward progress / best / Gold? false for a night beyond the frontier ('practice_night' label)
  nightCounts(n) { const k = intIn(n, 1, TUNE.maxNight, 0); return k >= 1 && k <= profile.data.night; },

  decorLevel() { return decorFor(profile.data.stars); },
  // { level, stars, prev: stars this level needed, next: stars the next level needs (null at max), ropes: Gold Rope count,
  //   golds: = stars (the decor currency under its older name) }
  decorInfo(out) {
    const o = outObj(out), d = profile.data, st = d.stars, lvl = decorFor(st), T = TUNE.decorStars;
    o.level = lvl; o.stars = st; o.golds = st; o.ropes = d.golds; o.prev = T[lvl]; o.next = lvl + 1 < T.length ? T[lvl + 1] : null;
    return o;
  },
  // the decor the lobby still has to reveal: { level: the newest level earned since the last reveal (0 = none), from:
  //   the first unrevealed level } - home spotlights it once ('New decor: <name>'), then calls markDecorSeen(). A
  //   seen.decor<N> mark (markSeen('decor' + N), the lobby's own bookkeeping) counts as revealed too
  decorReveal(out) {
    const o = outObj(out), d = profile.data, lvl = decorFor(d.stars), shown = decorShown(d);
    o.level = lvl > shown ? lvl : 0; o.from = lvl > shown ? shown + 1 : 0;
    return o;
  },
  // the lobby has shown decor up to `level` (default: the current one; also marked seen.decor<level>) -> the revealed level
  markDecorSeen(level) {
    const d = profile.data, lvl = decorFor(d.stars), to = level === undefined ? lvl : Math.min(lvl, intIn(level, 0, lvl, lvl));
    if (to > decorShown(d)) { d.decorSeen = to; if (to > 0) d.seen['decor' + to] = true; profile.save(); }
    return decorShown(d);
  },
  // the Daily Night is open once night TUNE.dailyAfter is passed (home shows it locked before; links still play it)
  dailyUnlocked() { return profile.data.night > TUNE.dailyAfter; },
  // the Daily is open and no daily was ever started on this profile: home pulses its card with a 'New' sticker
  // (strings new_tag; recordNight's dailyUnlocked flags the night that opened it, for the result card's chip)
  dailyNew() { const d = profile.data; return d.night > TUNE.dailyAfter && d.seen.daily !== true; },

  bandUnlocked() {
    const out = [], u = profile.data.bandUnlocked;
    for (let i = 0; i < TUNE.species.length; i++) if (u[TUNE.species[i]]) out.push(TUNE.species[i]);
    return out;
  },
  // { stage: 'join' | 'look' | 'max', count, need, unlocked, total (raw correct admits), looks (owned, 0 while locked),
  //   looksMax, look (worn colour key) }. join: count (capped) of need = the next free seat's need; look: correct admits
  //   since the last look earned, of lookEvery; max: every look owned (count = need).
  bandProgress(species, out) {
    const o = outObj(out), d = profile.data, raw = d.band[species] !== undefined ? d.band[species] : 0, L = TUNE.looks[species];
    o.unlocked = !!d.bandUnlocked[species]; o.total = raw; o.looksMax = L ? L.length : 0; o.look = d.look[species] || '';
    if (!L) { o.stage = 'join'; o.count = 0; o.need = needNow(); o.looks = 0; return o; }
    o.looks = looksOwned(species);
    if (!o.unlocked) { o.stage = 'join'; o.need = needNow(); o.count = Math.min(raw, o.need); }
    else if (o.looks >= L.length) { o.stage = 'max'; o.need = o.count = TUNE.lookEvery; }
    else { o.stage = 'look'; o.need = TUNE.lookEvery; o.count = clampInt(raw - d.bandAt[species] - (o.looks - 1) * TUNE.lookEvery, 0, o.need); }
    return o;
  },
  // correct admits the next species to join needs (the next free seat; the last seat's need once the band is full)
  bandNeedNow() { profile.data; return needNow(); },
  // the 6 colour keys of a species' looks (House look first; read-only), how many it owns, the one it wears
  looks(species) { return TUNE.looks[species] || NOLIST; },
  looksOwned(species) { profile.data; return TUNE.looks[species] ? looksOwned(species) : 0; },
  lookOf(species) { const L = TUNE.looks[species]; return L ? profile.data.look[species] || L[0] : ''; },
  // wears an owned look; -> true when it changed
  setLook(species, colorKey) {
    const L = TUNE.looks[species], d = profile.data;
    if (!L) return false;
    const j = L.indexOf(colorKey);
    if (j < 0 || j >= looksOwned(species) || d.look[species] === colorKey) return false;
    d.look[species] = colorKey;
    profile.save();
    return true;
  },

  // ---- daily attempts (see the header). startDaily is the play scene's call when a daily run begins: -> { run, counts }
  // (a reused object: read it at once). run = the date's run number (0: not a live daily, practice, nothing stored);
  // counts = this run is the day's counted attempt (its placeholder is stored). A run already marked by markDailyStart
  // for this date (the launching scene) is confirmed, not counted twice.
  startDaily(date, startedAt, total) {
    profile.data;
    const key = validDate(date) ? date : profile.today(), at = typeof startedAt === 'number' && isFinite(startedAt) ? startedAt : Date.now();
    const o = DAILY_START;
    if (ARMED.date === key && ARMED.run > 0) o.run = ARMED.run;
    else o.run = markRun(key, at, total);
    ARMED.date = ''; ARMED.run = 0;
    if (o.run === 1 && D.daily[key] && D.daily[key].open && total !== undefined) D.daily[key].total = intIn(total, 1, 1e6, TUNE.dailyTotal);
    o.counts = o.run === 1 && uncounted(D.daily[key]);
    return o;
  },
  // a launching scene marks the run it is about to start (records the attempt like startDaily) -> the run number (0: not live)
  markDailyStart(date, startedAt) {
    profile.data;
    const key = validDate(date) ? date : profile.today();
    const run = markRun(key, typeof startedAt === 'number' && isFinite(startedAt) ? startedAt : Date.now(), TUNE.dailyTotal);
    ARMED.date = run > 0 ? key : ''; ARMED.run = run;
    return run;
  },
  // the run was left before any decision: the attempt is handed back (its open placeholder goes too) -> runs left
  unmarkDailyStart(date) {
    const d = profile.data, key = validDate(date) ? date : profile.today(), n = runsOf(key);
    if (n <= 0) return 0;
    if (n === 1) {
      delete d.dailyRuns[key];
      if (d.daily[key] && d.daily[key].open) delete d.daily[key];
    } else d.dailyRuns[key] = n - 1;
    if (ARMED.date === key) { ARMED.date = ''; ARMED.run = 0; }
    profile.save();
    return n - 1;
  },
  dailyRuns(date) { profile.data; return runsOf(validDate(date) ? date : profile.today()); },
  // would the run of `date` now in play count (the first live run, nothing counted yet but its own placeholder)?
  dailyAttemptLive(date, startedAt) {
    const d = profile.data, key = validDate(date) ? date : profile.today();
    return profile.dailyCounts(key, startedAt) && uncounted(d.daily[key]) && runsOf(key) <= 1;
  },
  // r = { date, startedAt, correct, total }: the counted run was left mid-night -> stored as that day's Shut Down with the
  // score so far, streak credited (as a 3-strike night is). -> { recorded, streakUp, streak } (recorded false: not the counted run)
  abandonDaily(r) {
    r = isObj(r) ? r : NO;
    const d = profile.data, today = profile.today(), tn = dayNum(today), key = validDate(r.date) ? r.date : today;
    const res = { recorded: false, streakUp: false, streak: null };
    if (!profile.dailyAttemptLive(key, r.startedAt)) { res.streak = profile.streakInfo(today); return res; }
    clampLast(tn);
    const total = intIn(r.total, 1, 1e6, 20), correct = intIn(r.correct, 0, total, 0);
    d.daily[key] = { correct, total, tier: 'shut' };
    if (!TUNE.streakNeedsPass) res.streakUp = creditStreak(dayNum(key), tn).up;
    trimDaily();
    res.recorded = true;
    res.streak = profile.streakInfo(today);
    profile.save();
    emitRecord(res, r, 'abandon');
    return res;
  },

  // { correct, total, tier, practice, open } of the stored daily for `date` (default today), or null. open = the day's
  // counted attempt was started and not finished (it reads as played: a Shut Down unless that run finishes)
  dailyStatus(date, out) {
    const daily = profile.data.daily, key = date !== undefined && date !== null ? String(date) : profile.today();
    const e = Object.prototype.hasOwnProperty.call(daily, key) ? daily[key] : null;
    if (!e) return null;
    const o = outObj(out);
    o.correct = e.correct; o.total = e.total; o.tier = e.tier; o.practice = e.practice === true; o.open = e.open === true;
    return o;
  },

  // As of `date` (default today): { count (0 once broken), freezes (left this week after covering missed days), alive,
  // playedToday, used (freezes spent/pending on the current gap), last }. A streak.last later than `date` (clock rollback)
  // reads as played that day.
  streakInfo(date, out) {
    const o = outObj(out), S = profile.data.streak;
    const dn = dayNum(validDate(date) ? date : profile.today());
    const mon = mondayOf(dn), fMon = weekStart(S.freezeWeek);
    const lastN = S.last ? dayNum(S.last) : NaN;
    o.last = S.last; o.used = 0; o.playedToday = false;
    if (!(lastN === lastN) || S.count <= 0) {
      o.count = 0; o.freezes = fMon === mon ? S.freezes : TUNE.freezesPerWeek; o.alive = false;
      return o;
    }
    if (dn <= lastN) {
      o.count = S.count; o.freezes = fMon === mon ? S.freezes : TUNE.freezesPerWeek; o.alive = true; o.playedToday = true;
      return o;
    }
    const sim = simulateFreezes(S.freezes, fMon, lastN + 1, dn - 1);   // today itself is not missed yet
    o.count = sim.ok ? S.count : 0;
    o.alive = sim.ok;
    o.used = sim.ok ? sim.used : 0;
    // a broken streak spends no freezes (creditStreak keeps the stored week's count, a new week refills)
    if (sim.ok) o.freezes = sim.mon === mon ? sim.freezes : TUNE.freezesPerWeek;
    else o.freezes = fMon === mon ? S.freezes : TUNE.freezesPerWeek;
    return o;
  },

  today() { return todayOverride || localToday(); },
  // dev/test clock: setToday('YYYY-MM-DD', hour 0..23 = TUNE.testHour); setToday('') returns to the device clock
  setToday(date, hour) {
    todayOverride = validDate(date) ? date : '';
    hourOverride = todayOverride ? intIn(hour, 0, 23, TUNE.testHour) : -1;
    return profile.today();
  },

  hasSeen(key) { return profile.data.seen[key] === true; },
  markSeen(key) { profile.data.seen[key] = true; profile.save(); },

  // wipes progress; settings survive unless keepSettings === false (then defaults are applied + broadcast)
  reset(keepSettings) {
    const keep = keepSettings !== false, old = D ? D.settings : null, oldAt = D ? D.settingsAt : 0;
    let raw = null;
    try { raw = readRaw(); } catch (e) { raw = null; }
    D = defaults();
    if (keep && old) { D.settings = old; D.settingsAt = oldAt; } else D.settingsAt = Date.now();
    // a wipe is never merged back from the stored save: it is written over it as the newest revision
    D.rev = Math.max(lastRev, revOf(raw)) + 1;
    ARMED.date = ''; ARMED.run = 0;
    writeRaw(D);
    lastRev = D.rev;
    if (!keep) profile.applySettings();
    return D;
  },

  // helpers for other modules
  validDate,
  isoWeek(date) { return validDate(date) ? isoWeek(dayNum(date)) : ''; },
  addDays(date, n) { return validDate(date) ? dateOf(dayNum(date) + (n | 0)) : ''; },
};

i18n.onChange(onI18nChange);
try { if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('storage', onStorage); } catch (e) { /* no DOM */ }
profile.load();
