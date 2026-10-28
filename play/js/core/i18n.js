// i18n: flat EN/AR dictionaries, t(key, params) with {name} interpolation; the language persists via save.js ('lang')
// and mirrors to <html dir lang>. Usage: i18n.load({ en: {...}, ar: {...} }); i18n.t('play.start', { name }); i18n.set('ar'). (see docs/ENGINE.md)
import { save } from './save.js';

const TUNE = { saveKey: 'lang', fallback: 'en', rtl: ['ar', 'he', 'fa', 'ur'] };

const dicts = { en: {}, ar: {} };
const listeners = [];
const PARAM_RE = /\{(\w+)\}/g;
let curParams = null; // params of the t() call in progress, so String.replace needs no per-call closure

function replaceParam(match, name) {
  const v = curParams[name];
  return v === undefined || v === null ? match : String(v);
}

function detectLang() {
  const saved = save.get(TUNE.saveKey, null);
  if (typeof saved === 'string' && saved.length) return saved;
  let nav = 'en';
  try { nav = navigator.language || 'en'; } catch (e) { nav = 'en'; }
  return String(nav).toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';
}

function applyToDocument() {
  try {
    const el = document.documentElement;
    el.setAttribute('lang', i18n.lang);
    el.setAttribute('dir', i18n.dir);
  } catch (e) { /* no DOM (tests) */ }
}

export const i18n = {
  lang: 'en',
  dicts,
  get dir() { return TUNE.rtl.indexOf(i18n.lang) >= 0 ? 'rtl' : 'ltr'; },
  get isRTL() { return TUNE.rtl.indexOf(i18n.lang) >= 0; },
  get languages() { return Object.keys(dicts); },

  // switch language: persists, updates <html dir/lang>, notifies listeners fn(lang, changed)
  set(lang) {
    if (typeof lang !== 'string' || !lang.length) lang = TUNE.fallback;
    const changed = lang !== i18n.lang;
    i18n.lang = lang;
    save.set(TUNE.saveKey, lang);
    applyToDocument();
    for (let i = 0; i < listeners.length; i++) {
      try { listeners[i](lang, changed); } catch (e) { console.error('[i18n] onChange listener failed', e); }
    }
    return lang;
  },
  toggle() { return i18n.set(i18n.lang === 'ar' ? 'en' : 'ar'); },

  // translate: current language, then English, then the key itself; {name} tokens come from params
  t(key, params, lang) {
    const l = lang || i18n.lang;
    let d = dicts[l];
    let s = d ? d[key] : undefined;
    if (s === undefined && l !== TUNE.fallback) { d = dicts[TUNE.fallback]; s = d ? d[key] : undefined; }
    if (s === undefined) return key;
    if (typeof s !== 'string') s = String(s);
    if (!params || s.indexOf('{') < 0) return s;
    curParams = params;
    const out = s.replace(PARAM_RE, replaceParam);
    curParams = null;
    return out;
  },
  has(key, lang) { const d = dicts[lang || i18n.lang]; return !!d && d[key] !== undefined; },

  onChange(fn) {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  },

  // merge { en: {...}, ar: {...} } into the dictionaries (later loads override earlier keys)
  load(dict) {
    for (const l in dict) {
      if (!dicts[l]) dicts[l] = {};
      const src = dict[l], dst = dicts[l];
      for (const k in src) dst[k] = src[k];
    }
    return i18n;
  },
};

i18n.lang = detectLang();
applyToDocument();
