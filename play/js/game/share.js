// share.js: the sharing transport of Monster Bouncer (GAME-SPEC §8): share text EN/AR, same-seed challenge links, launch-param
// parsing, and the card share: prepareCard() encodes the 9:16 result card as a 1080x1920 JPEG (q 0.9, ~0.2 MB; JPEG replaces
// the spec's PNG, which is ~1.6 MB; a wider canvas is downscaled, a smaller one kept) in an idle slice after the call, then
// shareCanvas(file) hands it to the Web Share API (Level 2, files) in the SAME task as the tap (iOS drops user activation
// across a long await), else downloads it via <a download> (and copies the text + link too, best effort), else copies the
// text + link. In-app webviews (TikTok, Instagram, Facebook, Snapchat, LINE) silently ignore blob downloads, so there the
// clipboard comes first. Nothing throws.
// Native app (Capacitor iOS, js/native.js): the card goes through @capacitor/filesystem (the JPEG written to the app's
// Caches folder) + @capacitor/share (the iOS share sheet with the card file and the text + link); a missing Filesystem
// shares the text + link alone, a share sheet that cannot open falls back to the clipboard; the Challenge button opens
// the share sheet with { title, text, url }. Closing the sheet is 'failed' + shareInfo.error 'abort' (silent), as on the
// web. Challenge links always point to the public web build TUNE.playUrl there (the app's own capacitor:// address means
// nothing to a friend); on the web they point to the page the game runs on, as before.
// Usage: on card show: prepared = await prepareCard(cardCanvas, result);
//        on Share tap: shareCanvas(prepared || cardCanvas, result, i18n.lang).then(how => ...)  // 'shared'|'downloaded'|'copied'|'failed'
//        toast: 'downloaded' + shareInfo.copied -> 'saved_copied', else the key named by `how` ('share_failed' for 'failed',
//        silent when shareInfo.error === 'abort'); inAppBrowser() -> true: show 'open_browser' next to the Share button.
// Links: ?mode=night&night=N&seed=S&vs=C-T | ?daily=YYYY-MM-DD&vs=C-T | ?mode=endless&seed=S&vs=SCORE. parseLaunchParams()
// -> { mode, night, daily, seed, vs }. Launch rule for the play scene: daily -> data.dailySeed(daily) (seed ignored); night /
// endless -> params.seed when it is not null, else the canonical seed the scene uses for night N without a link. Results
// handed to share MUST carry .seed = the seed actually played, so the friend gets the same guests. vs (the score to beat)
// feeds the 'A friend dares you' screen through challengeInvite(params) (a link without vs still names its night /
// daily / the All-Nighter: 'A friend dares you to play Night 7'). Daily links later than today, or before the
// launch epoch (unless today itself is earlier), are rejected (daily: null): future dailies stay unspoiled. Daily numbers
// and fallback tiers come from data.js (dailyNightNumber, tierFor), so the card, the link and the game never disagree.
import { DICT, plural } from './strings.js';
import { i18n } from '../core/i18n.js';
import { profile } from './profile.js';
import { tierFor, dailyNightNumber } from './data.js';
import { native } from '../native.js';

const TUNE = {
  fileBase: 'monster-bouncer',
  playUrl: 'https://alwaleed305xx-ui.github.io/monster-bouncer-site/play/',   // challenge links from the native app
  exportW: 1080,                 // shared card width (aspect kept): 1080x1920, the Stories / TikTok size of the 9:16 card
  mime: 'image/jpeg', quality: 0.9, ext: '.jpg',
  backdrop: '#0c0b24',           // JPEG has no alpha: transparent card pixels are flattened onto the backdrop ink
  revokeMs: 4000,                // object URL lifetime after a download click
  idleMs: 250,                   // prepareCard: the encode starts in an idle slice at most this late
  maxNight: 9999, maxSeed: 4294967295, maxScore: 1000000,
  modes: ['night', 'daily', 'endless'],
  tiers: ['gold', 'silver', 'bronze', 'rope', 'shut'],
  shutStrikes: 3,
  epochProbe: '2100-01-01',      // any date after launch: the launch epoch is derived from data.dailyNightNumber
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SEED_RE = /^\d{1,10}$/;
const VS_RE = /^(\d{1,7})(?:-(\d{1,7}))?$/;
const PARAM_RE = /\{(\w+)\}/g;
// in-app webviews where <a download> of a blob does nothing (case-sensitive tokens of their user agents)
const INAPP_RE = /FBAN|FBAV|FB_IAB|Instagram|musical_ly|TikTok|BytedanceWebview|Snapchat|\bLine\//;
const DAY_MS = 86400000;
const NO = {};
let scratch = null;              // reused export canvas for prepareCard / shareCanvas(canvas)

// what the last shareCanvas()/shareChallenge() did; error 'abort' = the player closed the share sheet (stay silent);
// copied = the text + link reached the clipboard (also true alongside a 'downloaded' card)
export const shareInfo = { last: '', error: '', copied: false };

function dayNum(s) {
  const m = typeof s === 'string' ? DATE_RE.exec(s) : null;
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS) : NaN;
}
function validDate(s) {
  const n = dayNum(s);
  if (!(n === n)) return false;
  const d = new Date(n * DAY_MS);
  const back = d.getUTCFullYear() + '-' + (d.getUTCMonth() < 9 ? '0' : '') + (d.getUTCMonth() + 1) + '-' + (d.getUTCDate() < 10 ? '0' : '') + d.getUTCDate();
  return back === s;
}
function posInt(v, max) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN);
  return n === n && n >= 1 && n <= max && Math.floor(n) === n ? n : null;
}
function langOf(lang) { return lang && DICT[lang] ? lang : (DICT[i18n.lang] ? i18n.lang : 'en'); }
function tr(lang, key, params) {
  const d = DICT[lang] || DICT.en;
  let s = d[key];
  if (s === undefined) s = DICT.en[key];
  if (s === undefined) return key;
  if (!params) return s;
  return s.replace(PARAM_RE, (m, k) => (params[k] === undefined || params[k] === null ? m : String(params[k])));
}
function modeOf(r) {
  if (TUNE.modes.indexOf(r.mode) >= 0) return r.mode;
  return validDate(r.date) && r.night === undefined ? 'daily' : 'night';
}
function todayOf(today) { return validDate(today) ? today : profile.today(); }
// day number of Daily Night #1 (data.js owns the epoch: probe date number - its daily number + 1)
const EPOCH_DN = dayNum(TUNE.epochProbe) - dailyNightNumber(TUNE.epochProbe) + 1;
function dailyNumberOf(date) { return dailyNightNumber(validDate(date) ? date : profile.today()); }
function dailyNumber(r) {
  if (posInt(r.dailyNumber, 1e6)) return r.dailyNumber;
  return dailyNumberOf(r.date);
}
function nightOf(r) { const n = posInt(r.night, TUNE.maxNight); return n ? n : 1; }
function num(v) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : 0; }
// only the five real tiers; anything else is worked out from the score by data.tierFor (shut when it ended on strikes)
function tierOf(r) {
  if (TUNE.tiers.indexOf(r.tier) >= 0) return r.tier;
  return tierFor(num(r.correct), num(r.total), r.shutEarly === true || num(r.strikes) >= TUNE.shutStrikes);
}
// a seed that replays exactly: integer 0..2^32-1 (anything else is left out of the link)
function seedOf(v) {
  return typeof v === 'number' && Math.floor(v) === v && v >= 0 && v <= TUNE.maxSeed ? v : null;
}
function endlessScore(r) { return num(r.endlessScore !== undefined ? r.endlessScore : r.correct); }
// 'C-T' for night/daily, 'S' for endless, '' when the result has no score
function vsOf(r, mode) {
  if (mode === 'endless') { const s = endlessScore(r); return s > 0 ? String(Math.min(s, TUNE.maxScore)) : ''; }
  const t = num(r.total), c = num(r.correct);
  return t > 0 && t <= TUNE.maxScore ? Math.min(c, t) + '-' + t : '';
}

// 'I ran the door in Monster Bouncer Night 4: 18/20 Silver Rope' (daily: '#N (date)', endless: guests sorted, plural-aware)
export function shareText(result, lang) {
  const r = result || NO, l = langOf(lang), mode = modeOf(r);
  if (mode === 'endless') { const s = endlessScore(r); return plural('share_endless', s, l, { s }); }
  const p = { n: nightOf(r), c: num(r.correct), t: num(r.total), tier: tr(l, tierOf(r)) };
  if (mode === 'daily') {
    p.d = dailyNumber(r);
    if (validDate(r.date)) { p.date = r.date; return tr(l, 'share_daily', p); }
    return tr(l, 'share_daily_nodate', p);
  }
  return tr(l, 'share_night', p);
}

function baseUrl() {
  try {
    if (native.isNative()) return TUNE.playUrl;
    const pr = location.protocol;
    if (pr !== 'http:' && pr !== 'https:' && pr !== 'file:') return TUNE.playUrl;   // another app scheme: the public build
    return location.origin && location.origin !== 'null' ? location.origin + location.pathname : String(location.href).split('#')[0].split('?')[0];
  } catch (e) { return TUNE.playUrl; }
}

// same-seed challenge link (see the header for the format); the score to beat rides along as &vs=
export function challengeUrl(result) {
  const r = result || NO, mode = modeOf(r);
  let q;
  if (mode === 'daily') q = '?daily=' + (validDate(r.date) ? r.date : profile.today());
  else {
    q = mode === 'endless' ? '?mode=endless' : '?mode=night&night=' + nightOf(r);
    const seed = seedOf(r.seed);
    if (seed !== null) q += '&seed=' + seed;
  }
  const vs = vsOf(r, mode);
  if (vs) q += '&vs=' + vs;
  return baseUrl() + q;
}

// -> { mode: 'night'|'daily'|'endless'|null, night: int|null, daily: 'YYYY-MM-DD'|null, seed: uint32|null,
//      vs: { correct, total: int|null (null = endless score) }|null }; invalid values become null.
// today (optional, 'YYYY-MM-DD') defaults to profile.today(); daily dates after it or before the launch epoch are rejected.
export function parseLaunchParams(search, today) {
  const out = { mode: null, night: null, daily: null, seed: null, vs: null };
  let s = search;
  if (typeof s !== 'string') { try { s = location.search; } catch (e) { s = ''; } }
  let p = null;
  try { p = new URLSearchParams(s); } catch (e) { return out; }
  const daily = p.get('daily'), night = p.get('night'), mode = p.get('mode'), seed = p.get('seed'), vs = p.get('vs');
  let dailyBad = false;
  if (daily !== null) {
    const tn = dayNum(todayOf(today)), dn = dayNum(daily), first = Math.min(EPOCH_DN, tn);
    if (validDate(daily) && dn <= tn && dn >= first) out.daily = daily; else dailyBad = true;
  }
  if (night !== null) out.night = posInt(night, TUNE.maxNight);
  if (seed !== null && SEED_RE.test(seed) && Number(seed) <= TUNE.maxSeed) out.seed = Number(seed);
  if (mode !== null && TUNE.modes.indexOf(mode) >= 0) out.mode = mode === 'daily' && dailyBad ? null : mode;
  else if (out.daily) out.mode = 'daily';
  else if (out.night) out.mode = 'night';
  const m = vs !== null ? VS_RE.exec(vs) : null;
  if (m) {
    const c = Number(m[1]), t = m[2] !== undefined ? Number(m[2]) : null;
    if (t === null ? c >= 1 && c <= TUNE.maxScore : t >= 1 && t <= TUNE.maxScore && c <= t) out.vs = { correct: c, total: t };
  }
  return out;
}

// the receiving side's line: 'A friend dares you to beat 18/20 on Night 4'; a link without a score still names what it
// dares ('A friend dares you to play Night 7' / '... Daily Night #12' / '... to the All-Nighter'); '' for no challenge
export function challengeInvite(params, lang) {
  const p = params || NO, l = langOf(lang), vs = p.vs && typeof p.vs === 'object' ? p.vs : null;
  const daily = p.mode === 'daily' || (!p.mode && !!p.daily), endless = p.mode === 'endless';
  if (!daily && !endless && p.mode !== 'night' && !p.night) return '';
  if (endless || (vs && (vs.total === null || vs.total === undefined))) {
    return vs ? tr(l, 'challenge_vs_endless', { s: num(vs.correct) }) : tr(l, 'dare_endless');
  }
  const what = daily ? tr(l, 'daily_num', { n: dailyNumberOf(p.daily) }) : tr(l, 'night', { n: posInt(p.night, TUNE.maxNight) || 1 });
  if (!vs) return tr(l, 'dare_play', { what });
  return tr(l, 'challenge_vs', { score: num(vs.correct) + '/' + num(vs.total), what });
}

export function cardFileName(result) {
  const r = result || NO, mode = modeOf(r);
  if (mode === 'daily' && validDate(r.date)) return TUNE.fileBase + '-daily-' + r.date + TUNE.ext;
  if (mode === 'endless') return TUNE.fileBase + '-all-nighter' + TUNE.ext;
  return TUNE.fileBase + '-night-' + nightOf(r) + TUNE.ext;
}

// full message used by every transport: share line + newline + challenge link
export function shareMessage(result, lang) {
  let text = '', url = '';
  try { text = shareText(result, lang); } catch (e) { text = ''; }
  try { url = challengeUrl(result); } catch (e) { url = ''; }
  return text && url ? text + '\n' + url : text + url;
}

// ---- encoding ----
function isBlob(v) { return typeof Blob === 'function' && v instanceof Blob; }
function asFile(blob, name) {
  if (!blob) return null;
  try { if (typeof File === 'function' && !(blob instanceof File)) return new File([blob], name, { type: blob.type || TUNE.mime }); }
  catch (e) { /* old engines: keep the Blob */ }
  return blob;
}
// the canvas to encode: the card flattened onto the backdrop ink (JPEG has no alpha) in the reused scratch canvas,
// downscaled to TUNE.exportW when wider (never upscaled); the card itself when there is no DOM or no 2D context
function exportCanvas(canvas) {
  if (!canvas || !(canvas.width > 0) || !(canvas.height > 0)) return null;
  if (typeof document === 'undefined') return canvas;
  const w = Math.min(canvas.width, TUNE.exportW), h = Math.round(canvas.height * w / canvas.width);
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
  const c = scratch.getContext('2d');
  if (!c) return canvas;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.fillStyle = TUNE.backdrop;
  c.fillRect(0, 0, w, h);
  c.drawImage(canvas, 0, 0, w, h);
  return scratch;
}
// synchronous encode (toDataURL) so a raw canvas can still reach navigator.share inside the tap's activation
function syncFile(canvas, name) {
  try {
    const src = exportCanvas(canvas);
    if (!src || typeof src.toDataURL !== 'function') return null;
    const url = src.toDataURL(TUNE.mime, TUNE.quality), comma = url.indexOf(',');
    const type = url.slice(5, url.indexOf(';')) || TUNE.mime, bin = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return asFile(new Blob([bytes], { type }), name);
  } catch (e) { return null; }
}

// runs fn in an idle slice (requestIdleCallback, at most TUNE.idleMs late) or on a 0 ms timer: never inside the caller's frame
function later(fn) {
  try { if (typeof requestIdleCallback === 'function') { requestIdleCallback(fn, { timeout: TUNE.idleMs }); return; } } catch (e) { /* fall through */ }
  setTimeout(fn, 0);
}
// Encodes the card ahead of the tap (call it once the card is painted). The downscale + JPEG encode start in an idle
// slice, never inside the caller's frame (a scene's enter() can call it freely). Resolves a File (Blob on old engines) or
// null; never rejects.
export function prepareCard(canvas, result) {
  return new Promise(resolve => {
    later(() => {
      try {
        const src = exportCanvas(canvas), name = cardFileName(result);
        if (!src) { resolve(null); return; }
        const wrap = b => resolve(b ? asFile(b, name) : null);
        if (typeof src.toBlob === 'function') src.toBlob(wrap, TUNE.mime, TUNE.quality);
        else if (typeof src.convertToBlob === 'function') src.convertToBlob({ type: TUNE.mime, quality: TUNE.quality }).then(wrap, () => resolve(null));
        else resolve(syncFile(src, name));
      } catch (e) { resolve(null); }
    });
  });
}

function downloadBlob(blob, name) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const a = document.createElement('a');
  if (!('download' in a)) return false;
  const href = URL.createObjectURL(blob);
  a.href = href; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => { try { URL.revokeObjectURL(href); } catch (e) { /* ignore */ } }, TUNE.revokeMs);
  return true;
}

async function copyText(msg) {
  try {
    const cb = typeof navigator !== 'undefined' ? navigator.clipboard : null;
    if (cb && typeof cb.writeText === 'function') { await cb.writeText(msg); return true; }
  } catch (e) { /* fall back to execCommand */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) { return false; }
}

function done(how, err, copied) { shareInfo.last = how; shareInfo.error = err || ''; shareInfo.copied = copied === true; return how; }

// true inside the in-app browsers of TikTok, Instagram, Facebook/Messenger, Snapchat and LINE (ua defaults to this device's)
export function inAppBrowser(ua) {
  let s = ua;
  if (typeof s !== 'string') { try { s = String(navigator.userAgent || ''); } catch (e) { s = ''; } }
  return INAPP_RE.test(s);
}

// after the (already started) share promise: abort = silent; any other failure (NotAllowedError, TypeError) -> download
// (+ best-effort copy, so the challenge link still travels) -> copy. In-app webviews: copy first, download as a last try.
// With no share promise this runs synchronously up to the first clipboard call, so it still holds the tap's activation.
async function settle(pending, file, name, msg) {
  try {
    if (pending) {
      try { await pending; return done('shared'); }
      catch (e) { if (e && e.name === 'AbortError') return done('failed', 'abort'); }
    }
    const inApp = inAppBrowser();
    if (inApp && await copyText(msg)) return done('copied', '', true);
    if (file) {
      let saved = false;
      try { saved = downloadBlob(file, name); } catch (e) { saved = false; }
      if (saved) return done('downloaded', '', inApp ? false : await copyText(msg));
    }
    if (!inApp && await copyText(msg)) return done('copied', '', true);
    return done('failed', 'unsupported');
  } catch (e) { return done('failed', 'error'); }
}

// ---- native (Capacitor iOS): Filesystem + Share ----
// the card as base64 JPEG: a canvas is encoded here (exportCanvas + toDataURL), a File / Blob read with FileReader
function cardBase64(card) {
  return new Promise(resolve => {
    try {
      if (isBlob(card)) {
        if (typeof FileReader !== 'function') { resolve(''); return; }
        const fr = new FileReader();
        fr.onload = () => { const u = String(fr.result || ''), c = u.indexOf(','); resolve(c > 0 ? u.slice(c + 1) : ''); };
        fr.onerror = () => resolve('');
        fr.readAsDataURL(card);
        return;
      }
      const src = card ? exportCanvas(card) : null;
      if (!src || typeof src.toDataURL !== 'function') { resolve(''); return; }
      const u = src.toDataURL(TUNE.mime, TUNE.quality), c = u.indexOf(',');
      resolve(c > 0 && u.indexOf('data:' + TUNE.mime) === 0 ? u.slice(c + 1) : '');
    } catch (e) { resolve(''); }
  });
}
// how the share sheet ended -> the shared result (a sheet that could not open: the text + link go to the clipboard)
async function nativeSettle(how, msg) {
  if (how === 'shared') return done('shared');
  if (how === 'abort') return done('failed', 'abort');
  if (await copyText(msg)) return done('copied', '', true);
  return done('failed', 'error');
}
async function nativeCard(card, result, l, msg) {
  try {
    let uri = null;
    if (card && native.canCache()) {
      const b64 = await cardBase64(card);
      if (b64) uri = await native.cacheFile(cardFileName(result), b64);
    }
    const o = { title: tr(l, 'share_title'), text: msg };
    if (uri) o.files = [uri];
    return await nativeSettle(await native.share(o), msg);
  } catch (e) { return done('failed', 'error'); }
}

// card = the File/Blob from prepareCard (best), or the card canvas (encoded synchronously right here), or null (text only).
// navigator.share is called before anything awaits, so the tap's user activation is still valid on iOS.
// Native app: the card file + text + link through the iOS share sheet (see the header).
// Resolves 'shared'|'downloaded'|'copied'|'failed', never rejects.
export function shareCanvas(card, result, lang) {
  let l = 'en', msg = '', name = '', file = null, pending = null;
  try {
    l = langOf(lang); msg = shareMessage(result, l); name = cardFileName(result);
    if (native.isNative() && native.canShare()) return nativeCard(card, result, l, msg);
    file = isBlob(card) ? card : (card ? syncFile(card, name) : null);
    const nav = typeof navigator !== 'undefined' ? navigator : NO;
    if (file && typeof File === 'function' && file instanceof File && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
      const data = { files: [file] };
      if (nav.canShare(data)) {
        data.title = tr(l, 'share_title'); data.text = msg;
        pending = nav.share(data);
      }
    }
  } catch (e) { pending = null; }
  return settle(pending, file, name || cardFileName(result), msg);
}

// Challenge button: the score line + dare + link via Web Share (no file, called synchronously), else clipboard; the
// native app opens the iOS share sheet with the same title / text / url. Same results as shareCanvas, never rejects.
export function shareChallenge(result, lang) {
  let text = '', url = '', l = 'en', pending = null;
  try {
    l = langOf(lang);
    text = shareText(result, l) + '\n' + tr(l, 'share_dare');
    url = challengeUrl(result);
    if (native.isNative() && native.canShare()) {
      const msg = text + '\n' + url;
      return native.share({ title: tr(l, 'share_title'), text: text, url: url }).then(how => nativeSettle(how, msg), () => done('failed', 'error'));
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') pending = navigator.share({ title: tr(l, 'share_title'), text, url });
  } catch (e) { pending = null; }
  return (async () => {
    try {
      if (pending) {
        try { await pending; return done('shared'); }
        catch (e) { if (e && e.name === 'AbortError') return done('failed', 'abort'); }
      }
      if (await copyText(text + '\n' + url)) return done('copied', '', true);
      return done('failed', 'unsupported');
    } catch (e) { return done('failed', 'error'); }
  })();
}
