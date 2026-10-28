// tutorial.js: the first-session teaching logic of Monster Bouncer (GAME-SPEC §3 "pointing-glove tutorial on guests 1-3"), pure
// logic with no drawing. The play scene runs the glove on the first 3 guests of whatever a fresh profile opens with: night
// 1 teaches on its own guests; any other entry (Daily, a challenge link, the All-Nighter, night N) gets a PRELUDE of 3
// practice guests from night 1's plain 'must have' rule (makePrelude) before the real poster slams. Captions follow the
// rule's polarity (green ring 'must have': Has it? IN / Missing it? OUT; red slash 'must NOT': No X? IN / Has it? OUT) and
// the one-time hints (first red slash, first AND rule, first clause on a never-seen attribute, first liar, first
// shapeshifter) say the rule, not just the tell. Copy lives here in EN / AR under cap_* keys (cap_new_<attr> names the
// attribute the 'new attribute' hint points at, cap_new is its generic fallback), plus the play scene's own stamp / tape
// words (closed, shut_stamp, quick = the speed bonus's QUICK! sticker, busted = a trap liar bounced, catch = a trap liar
// let in / a verdict-flipping shapeshifter called right, lc_perfect = the LAST CALL stamp of a perfect night); a
// dictionary loaded into i18n with the same keys wins (strings.js carries cap_and / cap_new).
// Usage: tutorialWord('cap_neg'); tutorialWord('quick'); captionKey(rule, guestIndex, wantIn); makePrelude(); negClause(rule).
import { i18n } from '../core/i18n.js';
import { makeNight } from './data.js';

const TUNE = {
  guests: 3,                       // glove-taught guests (prelude length)
  preludeSeed: 'mbouncer-practice',  // practice guests: night 1's generator on a fixed seed (IN, OUT, then any)
};

const COPY = {
  en: {
    cap_poster: 'Check the poster',
    cap_has_in: 'Has it? IN',
    cap_missing_out: 'Missing it? OUT',
    cap_hasnt_in: "Doesn't have it? IN",
    cap_has_out: 'Has it? OUT',
    cap_match: 'Matches? IN',
    cap_nomatch: 'No match? OUT',
    cap_tap: 'or tap a plate',
    cap_neg: 'Crossed out = NOT allowed',
    cap_fake: "Fake parts don't count!",
    cap_shift: 'It changed! Judge the new look',
    cap_and: 'Must match ALL',
    cap_new: 'New on the poster!',
    cap_new_color: 'New: check the colour!',
    cap_new_eyes: 'New: count the eyes!',
    cap_new_hat: 'New: check the hat!',
    cap_new_tail: 'New: check for a tail!',
    cap_new_pattern: 'New: check the pattern!',
    cap_practice: 'Practice',
    closed: 'CLOSED',
    shut_stamp: 'SHUT DOWN',
    quick: 'QUICK!',
    busted: 'BUSTED!',
    catch: 'NICE CATCH!',
    lc_perfect: 'PERFECT NIGHT',
  },
  ar: {
    cap_poster: 'شوف البوستر',
    cap_has_in: 'عنده؟ ادخل',
    cap_missing_out: 'ما عنده؟ برّا',
    cap_hasnt_in: 'ما عنده؟ ادخل',
    cap_has_out: 'عنده؟ برّا',
    cap_match: 'يطابق؟ ادخل',
    cap_nomatch: 'ما يطابق؟ برّا',
    cap_tap: 'أو اضغط اللوحة',
    cap_neg: 'المشطوب = ممنوع',
    cap_fake: 'القطع المزيفة ما تنحسب!',
    cap_shift: 'تحوّل! احكم على شكله الجديد',
    cap_and: 'لازم يطابق الكل',
    cap_new: 'جديد على البوستر!',
    cap_new_color: 'جديد: شوف اللون!',
    cap_new_eyes: 'جديد: عدّ العيون!',
    cap_new_hat: 'جديد: شوف القبعة!',
    cap_new_tail: 'جديد: عنده ذيل؟',
    cap_new_pattern: 'جديد: شوف النقشة!',
    cap_practice: 'تدريب',
    closed: 'مسكّر',
    shut_stamp: 'سكّروها',
    quick: 'سريع!',
    busted: 'انكشف!',
    catch: 'عين صقر!',
    lc_perfect: 'ليلة مثالية',
  },
};

// localised copy for a cap_* / closed / shut_stamp / quick / busted / catch / lc_perfect key: the loaded dictionary first,
// else this file's EN / AR (a
// cap_new_<attr> key missing everywhere falls back to cap_new)
export function tutorialWord(key) {
  if (i18n.has(key)) return i18n.t(key);
  const d = i18n.lang === 'ar' ? COPY.ar : COPY.en;
  const s = d[key];
  if (s !== undefined) return s;
  if (COPY.en[key] !== undefined) return COPY.en[key];
  return key.indexOf('cap_new_') === 0 ? tutorialWord('cap_new') : key;
}

// index of the first 'must NOT' (red slash) clause of a rule, -1 when it has none
export function negClause(rule) {
  const cs = rule && rule.clauses;
  if (!cs) return -1;
  for (let i = 0; i < cs.length; i++) if (cs[i].has === false) return i;
  return -1;
}

// the caption key for tutorial guest `idx` (0..guests-1) at the rope: 0 = look at the poster, 1 = the verdict phrased by
// the rule's polarity, 2 = the plates also work
export function captionKey(rule, idx, wantIn) {
  if (idx <= 0) return 'cap_poster';
  if (idx >= TUNE.guests - 1) return 'cap_tap';
  const cs = rule && rule.clauses;
  if (!cs || cs.length !== 1) return wantIn ? 'cap_match' : 'cap_nomatch';
  if (cs[0].has !== false) return wantIn ? 'cap_has_in' : 'cap_missing_out';
  return wantIn ? 'cap_hasnt_in' : 'cap_has_out';
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// the practice prelude: { rule, guests: [3 plain guests] } from night 1 (one 'must have' clause, IN then OUT first);
// built fresh per call so no actor ever shares a guest object with an earlier night
export function makePrelude() {
  const n = makeNight({ seed: hashStr(TUNE.preludeSeed), night: 1, mode: 'night' });
  return { rule: n.rule, guests: n.guests.slice(0, TUNE.guests), params: n.params };
}

export const TUTORIAL = { guests: TUNE.guests, copy: COPY };
