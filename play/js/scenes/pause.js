// pause.js: the pause overlay ('pause', GAME-SPEC §3), pushed by the play scene with its own params:
// scenes.push('pause', { mode, night, date, seed, vs }). The play scene stays drawn underneath (the scene manager freezes
// its update and calls its pause() / resume()); this overlay dims it and pops a sticker panel: "Paused" + what is being
// played, Resume (primary: animates out, then scenes.pop()), Restart (scenes.go('play', the same params; a campaign night
// on a fresh queue: home.js nightRetrySeed), Home, and a row
// of quick toggles (sound, music with the red mute slash; the gear pushes the settings overlay on top); every secondary
// is the indigo + brass sticker (home.js UI_SECONDARY). A tap outside the panel (or onBack) resumes too: a whole tap
// (down AND up outside) that starts once the overlay has settled (TUNE.outsideAfter), so the second tap of a double-tap
// on play's pause button (which sits outside the panel) never closes the overlay it just opened. Today's counted daily (profile.dailyAttemptLive) is one attempt: once a guest has been decided, the
// panel warns that leaving ends today's try, Restart reads "Restart as practice", and Home / Restart store the run so far
// as the day's Shut Down (profile.abandonDaily); left before any decision, the attempt is handed back (unmarkDailyStart).
// A restarted daily marks a new run (profile.markDailyStart), so only the first run of a day can count.
import { stage } from '../core/stage.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens } from '../core/tween.js';
import { clamp } from '../core/math.js';
import { profile } from '../game/profile.js';
import { party } from '../game/party.js';
import { dailyNightNumber } from '../game/data.js';
import { UI_INK, createLabel, createButtons, createPanel, nightRetrySeed } from './home.js';

const TUNE = {
  dim: 0.6,
  panel: { w: 300, h: 406, color: '#2a2760', radius: 30 },
  y: { title: 46, sub: 82, resume: 146, restart: 220, home: 284, icons: 358, divider: 327 },   // divider sits between Home's 3D lip and the icon row
  warn: { dy: 24, y: 106, color: '#ff9a9a' },                // the daily warning line: everything below it moves down dy
  btnW: 236, resumeH: 66, btnH: 54, icon: 48, iconGap: 66,
  restartIcon: '#ffd166',                                    // Restart / Home / toggles: the indigo + brass secondary sticker
  closeMs: 160,
  outsideAfter: 0.3,                                         // s after enter before a tap outside the panel can resume
};

const SP_IN = { to: 1, stiffness: 320, damping: 18 };
const SP_OUT = { to: 0, stiffness: 520, damping: 30 };
const SP_OUT_S = { to: 0.9, stiffness: 520, damping: 30 };

// outId: the pointer of a 'down' outside the panel (resumes on its 'up' outside), -1 = none
const st = { t: 0, active: false, a: 0, s: 0.86, closing: -1, top: 200, params: null, h: TUNE.panel.h, off: 0, outId: -1 };
// today's counted daily in play: live = this run is the one that counts, decided = a guest was already judged
const daily = { live: false, decided: false, date: '', startedAt: 0, correct: 0, total: 0 };
const lbl = {
  title: createLabel(240, 46, { size: 34, weight: 800, color: '#fff4d6', outline: UI_INK, outlineWidth: 8, shadow: true }),
  sub: createLabel(240, 24, { size: 16, weight: 800, color: '#ffb347', outline: UI_INK, outlineWidth: 3.5 }),
  warn: createLabel(270, 22, { size: 13.5, weight: 700, color: TUNE.warn.color }),
};
const panel = createPanel(TUNE.panel.color, { radius: TUNE.panel.radius, inner: 'rgba(255,209,102,0.18)' });
const btns = createButtons();
const B = {
  resume: btns.add({ id: 'resume', x: 195, y: 0, w: TUNE.btnW, h: TUNE.resumeH, icon: 'play', label: '', onTap: resume }),
  restart: btns.add({ id: 'restart', x: 195, y: 0, w: TUNE.btnW, h: TUNE.btnH, secondary: true, iconColor: TUNE.restartIcon, icon: 'retry', label: '', size: 20, onTap: restart }),
  home: btns.add({ id: 'home', x: 195, y: 0, w: TUNE.btnW, h: TUNE.btnH, secondary: true, icon: 'home', label: '', size: 20, onTap: goHome }),
  sound: btns.add({ id: 'sound', kind: 'icon', x: 129, y: 0, w: TUNE.icon, secondary: true, icon: 'sound', onTap: toggleSfx }),
  music: btns.add({ id: 'music', kind: 'icon', x: 195, y: 0, w: TUNE.icon, secondary: true, icon: 'music', onTap: toggleMusic }),
  gear: btns.add({ id: 'gear', kind: 'icon', x: 261, y: 0, w: TUNE.icon, secondary: true, icon: 'gear', onTap: openSettings }),
};

function resume() {
  if (st.closing >= 0) return;
  st.closing = 0;
  btns.locked = true;
  spring(st, 'a', SP_OUT);
  spring(st, 's', SP_OUT_S);
}
function restart(b) {
  if (scenes.transitioning) return;
  btns.locked = true;
  const p = st.params || {}, q = { mode: p.mode, night: p.night, date: p.date, seed: p.seed, vs: p.vs };
  // a campaign night restarts on a fresh queue (a friend's challenge keeps its seed, a daily its date's)
  if ((q.mode === 'night' || !q.mode) && !q.vs) q.seed = nightRetrySeed(Math.max(1, Math.floor(+q.night || 1)));
  if (q.mode === 'daily') {
    leaveDaily();
    q.startedAt = Date.now();
    profile.markDailyStart(q.date || profile.today(), q.startedAt);
  }
  scenes.go('play', q, { transition: 'wipe', ms: 520, x: b.x, y: b.y });
}
function goHome(b) {
  if (scenes.transitioning) return;
  btns.locked = true;
  leaveDaily();
  scenes.go('home', {}, { transition: 'wipe', ms: 520, x: b.x, y: b.y });
}
// the counted daily is being left: after a decision it is stored as the day's Shut Down, before one it is handed back
function leaveDaily() {
  if (!daily.live) return;
  readPlay();
  if (daily.decided) profile.abandonDaily(daily);
  else profile.unmarkDailyStart(daily.date);
  daily.live = false;
}
// what the play scene knows about the run (its test hook is the only read-out it has; without it: assume decided)
function readPlay() {
  const P = typeof window !== 'undefined' ? window.__play : null, s = P && P.state ? P.state() : null, last = P ? P.last : null;
  daily.decided = s ? s.done > 0 || s.correct > 0 : true;
  daily.correct = s ? s.correct : 0;
  daily.total = s && s.total ? s.total : 20;
  daily.startedAt = last && typeof last.startedAt === 'number' && last.startedAt > 0 ? last.startedAt : Date.now();
}
function toggleSfx() { profile.setSetting('sfx', !profile.settings.sfx); sync(); }
function toggleMusic() { profile.setSetting('music', !profile.settings.music); sync(); }
function openSettings() { scenes.push('settings', { from: 'pause' }); }
function sync() { B.sound.off = !profile.settings.sfx; B.music.off = !profile.settings.music; }

function refresh() {
  const p = st.params || {};
  lbl.title.set(i18n.t('pause'));
  if (p.mode === 'daily') lbl.sub.set(i18n.t('daily_num', { n: dailyNightNumber(p.date || profile.today()) }));
  else if (p.mode === 'endless') lbl.sub.set(i18n.t('endless'));
  else lbl.sub.set(i18n.t('night', { n: p.night || profile.nextNight() }));
  const warn = daily.live && daily.decided;
  lbl.warn.set(warn ? i18n.t('daily_leave') : '');
  B.resume.label = i18n.t('resume');
  B.restart.label = i18n.t(warn ? 'restart_practice' : 'restart');
  B.restart.size = warn ? 17 : 20;
  B.home.label = i18n.t('home');
  st.off = warn ? TUNE.warn.dy : 0;
  st.h = TUNE.panel.h + st.off;
  sync();
  layout();
}
function layout() {
  const Y = TUNE.y, rtl = i18n.isRTL, o = st.off;
  st.top = Math.max(stage.safeTop + 8, Math.round((stage.h - st.h) / 2));
  B.resume.y = st.top + Y.resume + o; B.restart.y = st.top + Y.restart + o; B.home.y = st.top + Y.home + o;
  const iy = st.top + Y.icons + o, order = rtl ? [B.gear, B.music, B.sound] : [B.sound, B.music, B.gear];
  for (let i = 0; i < 3; i++) { order[i].x = 195 + (i - 1) * TUNE.iconGap; order[i].y = iy; }
}

export const pause = {
  get state() { return st; },
  get buttons() { return btns; },

  enter(p) {
    st.params = p || {};
    st.active = true; st.t = 0; st.a = 0; st.s = 0.86; st.closing = -1; st.outId = -1;
    daily.live = false;
    if (st.params.mode === 'daily') {
      readPlay();
      daily.date = st.params.date || profile.today();
      daily.live = profile.dailyAttemptLive(daily.date, daily.startedAt);
    }
    btns.reset(); btns.locked = false;
    refresh();
    btns.popIn(0.04, 0.05);
    spring(st, 'a', SP_IN);
    spring(st, 's', SP_IN);
  },
  exit() { st.active = false; tweens.killTarget(st); btns.kill(); },
  resume() { btns.locked = st.closing >= 0; st.outId = -1; refresh(); },
  // the browser / Android back (main.js, when play's own handler is not the one listening) resumes like a tap outside
  onBack() { resume(); return true; },

  update(dt) {
    st.t += dt;
    btns.update(dt);
    if (st.closing >= 0) {
      st.closing += dt;
      if (st.closing * 1000 >= TUNE.closeMs && scenes.top === pause) scenes.pop();
    }
  },

  render(ctx) {
    const W = stage.w, H = stage.h, P = TUNE.panel, a = clamp(st.a, 0, 1), ph = st.h, o = st.off;
    ctx.save();
    ctx.globalAlpha = a * TUNE.dim;
    ctx.fillStyle = '#06051a'; ctx.fillRect(-30, -30, W + 60, H + 60);
    ctx.restore();
    if (a <= 0.01) return;
    const cy = st.top + ph / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(195, cy); ctx.scale(st.s, st.s); ctx.translate(-195, -cy);
    panel.draw(ctx, 195, cy, P.w, ph);
    lbl.title.draw(ctx, 195, st.top + TUNE.y.title);
    lbl.sub.draw(ctx, 195, st.top + TUNE.y.sub);
    if (o) lbl.warn.draw(ctx, 195, st.top + TUNE.warn.y);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(195 - P.w / 2 + 22, st.top + TUNE.y.divider + o, P.w - 44, 1.2);
    btns.draw(ctx, st.t);
    ctx.restore();
  },

  onInput(evt, d) {
    if (st.closing >= 0) return true;
    if (btns.onInput(evt, d)) return true;
    const P = TUNE.panel, inPanel = Math.abs(d.x - 195) <= P.w / 2 && d.y >= st.top && d.y <= st.top + st.h, id = d.id === undefined ? 0 : d.id;
    // a whole tap outside the panel resumes; a 'down' while the overlay is still popping in (a double-tap) is ignored
    if (evt === 'down') st.outId = !inPanel && st.t >= TUNE.outsideAfter ? id : -1;
    else if (evt === 'up' && st.outId !== -1 && id === st.outId) {
      st.outId = -1;
      if (!inPanel) { party.sfx.plate(); resume(); }
    }
    return true;
  },
};

stage.onResize(() => { if (st.active) layout(); });
i18n.onChange(() => { if (st.active) refresh(); });
