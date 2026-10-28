// Save: namespaced JSON in localStorage with versioning, safe in private mode (see docs/ENGINE.md).
// Everything the game stores lives under the 'mbouncer.' namespace (engine keys: audio.on / audio.music / audio.vol /
// lang; the profile: profile.js 'profile'; the wallet: economy.js 'wallet'). One-time rename migration, run before any
// module reads a key: builds from before the rename saved the profile and the engine keys under older prefixes (RENAME);
// the first load copies every such key that has no 'mbouncer.' value yet, checks the copy, marks the move done
// ('mbouncer.__renamed') and only then drops the old keys, so no progress is lost and a key the game deletes on purpose
// later (Auto language clears 'lang') never comes back.
//
// Native mirror (save.mirror; off on the web, where nothing below runs): iOS may reclaim a WKWebView's localStorage (low
// disk space) or lose its last ~1.5 s of writes when the app is killed, so in the Capacitor app js/native.js attaches a
// backend (Capacitor Preferences = UserDefaults) with save.mirror.start(backend) before the engine starts. localStorage
// stays the synchronous working copy; the backend holds ONE snapshot of every 'mbouncer.' key (backend key
// 'mbouncer.__mirror': { v: 1, id, rev, at, keys: { fullKey: rawJson } }), written 400 ms after the first change of a
// burst, at once when the app is hidden / paused (save.mirror.flush), retried after a failure. Lineage: the working copy
// carries { id, rev } in localStorage 'mbouncer:mirror' (outside the namespace, so all() / clear() never touch it); rev
// goes up once per burst of writes, before the snapshot of that burst is taken, so a snapshot never claims more than the
// working copy had. At launch (start) the working copy's { id, rev } as it was BEFORE any module wrote decides:
//   - no snapshot yet (first launch with the mirror)       -> 'fresh': ours becomes the snapshot
//   - same id and rev >= the snapshot's                    -> 'kept': ours stays (written again when it is newer)
//   - anything else (storage reclaimed: no id; lost writes: a lower rev; another lineage) -> 'adopted': every 'mbouncer.'
//     key is replaced by the snapshot's, writes stop, and native.js reloads the page so every module reads it
//   - the read failed / timed out, or a restore is not allowed (it already reloaded once this launch) -> 'off': the
//     mirror is neither read nor written this session (a later launch tries again; nothing good is ever overwritten)
// Writes made before start() or while its read is pending stay local (an evicted boot's fresh profile never reaches the
// snapshot); on 'kept' they are handed over right away.
// The wallet keeps its own Preferences mirror too (economy.js 'mbouncer.wallet', rev-checked at payments start), so
// purchases have two independent native copies.
const mem = {}; // fallback store when localStorage is unavailable
let storage = null;
try { storage = window.localStorage; storage.setItem('__t', '1'); storage.removeItem('__t'); } catch (e) { storage = null; }

const NS = 'mbouncer.';
const RENAME = {
  mark: NS + '__renamed',
  // every key under these moves (the pre-rename prefix, spelled as char codes so the retired name never shows in shipped code)
  whole: [String.fromCharCode(119, 104, 111, 115, 105, 110) + '.'],
  some: { 'tg.': ['audio.on', 'audio.music', 'audio.vol', 'lang', '__version'] },   // only the engine's own keys move
};
function renameMigrate() {
  if (!storage) return;
  try {
    if (storage.getItem(RENAME.mark) !== null) return;
    const moves = [];                                                   // [oldKey, newKey] pairs
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k) continue;
      for (let j = 0; j < RENAME.whole.length; j++) {
        const p = RENAME.whole[j];
        if (k.indexOf(p) === 0 && k.length > p.length) moves.push([k, NS + k.slice(p.length)]);
      }
      for (const p in RENAME.some) {
        if (k.indexOf(p) === 0 && RENAME.some[p].indexOf(k.slice(p.length)) >= 0) moves.push([k, NS + k.slice(p.length)]);
      }
    }
    for (let i = 0; i < moves.length; i++) {
      const from = moves[i][0], to = moves[i][1];
      if (storage.getItem(to) === null) storage.setItem(to, storage.getItem(from));
    }
    for (let i = 0; i < moves.length; i++) if (storage.getItem(moves[i][1]) === null) return;   // a copy failed: retry next load
    storage.setItem(RENAME.mark, '1');
    for (let i = 0; i < moves.length; i++) storage.removeItem(moves[i][0]);
  } catch (e) { /* quota / blocked storage: the old keys stay, the move is retried on the next load */ }
}

// ---------------------------------------------------------------- native mirror (see the header)
const MIRROR = {
  key: NS + '__mirror',        // backend key of the snapshot
  meta: 'mbouncer:mirror',     // localStorage: { id, rev } of the working copy
  debounceMs: 400,             // a burst of writes is snapshotted this long after its first write
  readMs: 4000,                // start(): the backend read gives up after this ('off')
  writeMs: 2500,               // one backend write gives up after this (retried)
  retryMs: 3000,               // a failed write is retried this long after
  version: 1,
};
const NO = {};
const M = {
  state: storage ? 'idle' : 'none',   // 'none' (no localStorage) | 'idle' (never started: the web) | 'pending' | 'on' | 'off' | 'adopting'
  status: '',                          // start()'s verdict: 'fresh' | 'kept' | 'adopted' | 'off'
  be: null, id: '', rev: 0,
  dirty: false,                        // the working copy changed since the last snapshot was taken
  since: false,                        // a write happened while the read was pending
  timer: 0, retry: 0,
  has: '',                             // the snapshot the backend is known to hold
  job: Promise.resolve(false),         // the backend write chain (one at a time, in order)
  writes: 0, fails: 0,
  boot: null,                          // { id, rev } of the working copy before any module wrote
};

function readMeta() {
  if (!storage) return null;
  try {
    const m = JSON.parse(storage.getItem(MIRROR.meta));
    if (m && typeof m.id === 'string' && m.id.length > 0 && typeof m.rev === 'number' && m.rev >= 0 && Math.floor(m.rev) === m.rev) return { id: m.id, rev: m.rev };
  } catch (e) { /* missing or unreadable: no lineage */ }
  return null;
}
function writeMeta() {
  try { storage.setItem(MIRROR.meta, JSON.stringify({ id: M.id, rev: M.rev })); } catch (e) { /* quota: the snapshot still carries the rev */ }
}
function newId() { return Date.now().toString(36) + '-' + Math.floor(Math.random() * 2176782336).toString(36); }
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }
function within(p, ms) { return Promise.race([Promise.resolve(p), wait(ms).then(() => { throw new Error('timeout'); })]); }
function no() { return false; }

// after every write through save.set / save.del
function touch() {
  if (M.state === 'pending' || M.state === 'idle') { M.since = true; return; }   // module loads before start(): stay local
  if (M.state !== 'on') return;
  if (!M.dirty) { M.rev++; writeMeta(); M.dirty = true; }
  if (!M.timer) M.timer = setTimeout(flushMirror, MIRROR.debounceMs);
}
function snapshot() {
  const keys = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.indexOf(NS) === 0) { const v = storage.getItem(k); if (typeof v === 'string') keys[k] = v; }
  }
  return JSON.stringify({ v: MIRROR.version, id: M.id, rev: M.rev, at: Date.now(), keys: keys });
}
// writes the working copy to the backend now -> Promise<true once the backend holds it>
function flushMirror() {
  clearTimeout(M.timer); M.timer = 0;
  if (M.state !== 'on') return Promise.resolve(false);
  if (!M.dirty) return M.job;
  M.dirty = false;
  let json = '';
  try { json = snapshot(); } catch (e) { M.dirty = true; return Promise.resolve(false); }
  const be = M.be;
  M.job = M.job.then(no, no)
    .then(() => within(be.set(MIRROR.key, json), MIRROR.writeMs))
    .then(() => { M.has = json; M.writes++; return true; }, () => {
      M.dirty = true; M.fails++;
      if (!M.retry) M.retry = setTimeout(retryFlush, MIRROR.retryMs);
      return false;
    });
  return M.job;
}
function retryFlush() { M.retry = 0; flushMirror(); }
function onHide() { if (document.hidden) flushMirror(); }
function onPageHide() { flushMirror(); }

function parseSnap(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let s = null;
  try { s = JSON.parse(raw); } catch (e) { return null; }
  if (!s || s.v !== MIRROR.version || typeof s.id !== 'string' || !s.id.length) return null;
  if (typeof s.rev !== 'number' || !(s.rev >= 0) || Math.floor(s.rev) !== s.rev || !s.keys || typeof s.keys !== 'object') return null;
  const keys = {};
  for (const k in s.keys) if (k.indexOf(NS) === 0 && typeof s.keys[k] === 'string') keys[k] = s.keys[k];
  return { id: s.id, rev: s.rev, keys: keys };
}
// replaces every 'mbouncer.' key with the snapshot's (+ its lineage) -> true when the read-back matches
function adopt(snap) {
  try {
    const drop = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.indexOf(NS) === 0 && !Object.prototype.hasOwnProperty.call(snap.keys, k)) drop.push(k);
    }
    for (let i = 0; i < drop.length; i++) storage.removeItem(drop[i]);
    for (const k in snap.keys) storage.setItem(k, snap.keys[k]);
    M.id = snap.id; M.rev = snap.rev;
    writeMeta();
    for (const k in snap.keys) if (storage.getItem(k) !== snap.keys[k]) return false;
    const m = readMeta();
    return !!m && m.id === snap.id && m.rev === snap.rev;
  } catch (e) { return false; }
}
function finish(st) { M.status = st; return st; }
function goOn() {
  M.state = 'on';
  try {
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
  } catch (e) { /* no DOM */ }
}
function decide(raw, allowAdopt) {
  const snap = parseSnap(raw), boot = M.boot;
  if (!snap) {                                            // first launch with the mirror (or an unreadable snapshot)
    M.id = boot ? boot.id : newId(); M.rev = boot ? boot.rev : 0;
    goOn(); touch(); flushMirror();
    return finish('fresh');
  }
  if (boot && boot.id === snap.id && boot.rev >= snap.rev) {
    M.id = boot.id; M.rev = boot.rev;
    goOn();
    if (boot.rev > snap.rev || M.since) { touch(); flushMirror(); }   // the snapshot lagged, or this boot wrote: hand it over
    else { M.has = raw; M.job = Promise.resolve(true); }
    return finish('kept');
  }
  if (!allowAdopt) { M.state = 'off'; return finish('off'); }
  M.state = 'adopting';                                   // from here on writes stop until the page reloads
  if (!adopt(snap)) { M.state = 'off'; return finish('off'); }
  return finish('adopted');
}
// backend { get(key) -> Promise<string|null>, set(key, value) -> Promise }; opts { readMs, allowAdopt (default true) }
// -> Promise<'fresh'|'kept'|'adopted'|'off'> (never rejects; a second call returns the first verdict)
function start(backend, opts) {
  if (M.state !== 'idle') return Promise.resolve(M.status || 'off');
  if (!backend || typeof backend.get !== 'function' || typeof backend.set !== 'function') return Promise.resolve('off');
  const o = opts || NO;
  const readMs = o.readMs > 0 ? o.readMs : MIRROR.readMs, allowAdopt = o.allowAdopt !== false;
  M.state = 'pending'; M.be = backend;
  let read = null;
  try { read = within(backend.get(MIRROR.key), readMs); } catch (e) { read = Promise.reject(e); }
  return read.then(raw => decide(raw, allowAdopt), () => { M.state = 'off'; return finish('off'); })
    .then(st => st, () => { M.state = 'off'; return finish('off'); });
}

M.boot = readMeta();      // before any module (or the rename move below) writes
renameMigrate();

export const save = {
  ns: NS,
  version: 1,
  get(key, def) {
    const k = this.ns + key;
    try {
      const raw = storage ? storage.getItem(k) : mem[k];
      if (raw === null || raw === undefined) return def;
      return JSON.parse(raw);
    } catch (e) { return def; }
  },
  set(key, val) {
    if (M.state === 'adopting') return val;               // a restore is in place: the reload reads it, nothing may overwrite it
    const k = this.ns + key;
    try { const raw = JSON.stringify(val); if (storage) storage.setItem(k, raw); else mem[k] = raw; } catch (e) { mem[k] = JSON.stringify(val); }
    if (storage) touch();
    return val;
  },
  del(key) {
    if (M.state === 'adopting') return;
    const k = this.ns + key;
    try { if (storage) storage.removeItem(k); } catch (e) { /* ignore */ }
    delete mem[k];
    if (storage) touch();
  },
  all() {
    const out = {};
    try {
      if (storage) { for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.indexOf(this.ns) === 0) out[k.slice(this.ns.length)] = JSON.parse(storage.getItem(k)); } }
      else for (const k in mem) if (k.indexOf(this.ns) === 0) out[k.slice(this.ns.length)] = JSON.parse(mem[k]);
    } catch (e) { /* ignore */ }
    return out;
  },
  // run fn(data) once when the stored schema version is older than `fromVersion`
  migrate(fromVersion, fn) {
    const v = this.get('__version', 0);
    if (v < fromVersion) { try { fn(this.all()); } catch (e) { /* ignore */ } this.set('__version', fromVersion); }
    this.version = Math.max(this.version, fromVersion);
  },
  clear() { for (const k in this.all()) this.del(k); },
  // dev / test hook: runs the one-time rename move again (it is a no-op once 'mbouncer.__renamed' is set)
  renameMigrate,
  // the native mirror (see the header); js/native.js is its only caller in the game
  mirror: {
    tune: MIRROR,
    start,
    flush: flushMirror,
    get state() { return M.state; },
    get status() { return M.status; },
    // dev / test: a copy of the mirror's bookkeeping
    info() {
      return { state: M.state, status: M.status, id: M.id, rev: M.rev, dirty: M.dirty, since: M.since, writes: M.writes, fails: M.fails,
        held: M.has.length, boot: M.boot ? { id: M.boot.id, rev: M.boot.rev } : null };
    },
  },
};
