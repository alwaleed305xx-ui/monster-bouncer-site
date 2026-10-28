// logo.js: the game's lockup, MONSTER over BOUNCER / بودي قارد over الوحوش, in the ONE sticker style (GAME-SPEC §5): every
// glyph sits in a dark neon tube (the outer sticker border), a 3 px-feel ink outline, a short 3D extrusion in a deep tone
// of its face and a glossy two-tone face (a hard highlight edge across the top). The monster word is slime mint, the
// bouncer word warm brass gold (in both languages, so the colours carry the meaning). Motifs: in English the O of MONSTER
// is a big googly eye (its pupil is drawn live by drawLogoEye: it follows the finger and blinks); in Arabic the same eye is
// taped onto the lockup's top-left corner like the liars' taped-on googly eyes. Under the bouncer line hangs a velvet rope
// between two brass stanchion heads (the club door). English letters are laid out one by one with a slight seeded tilt;
// Arabic lines are always drawn whole (Cairo heavy, connected script, never split). Lines are justified to one width.
// Usage (all at bake time, design units, the lockup centred on cx, cy and scaled by k):
//   const M = logoMetrics(lang);            // { w, h, eye: { x, y, r } | null, ... } at k = 1 (allocates: call on refresh)
//   paintLogo(c, cx, cy, k, lang, opts);    // the sticker lockup; opts { pupil: true, lookX, lookY } bakes a static pupil
//   paintLogoNeon(c, cx, cy, k, lang);      // the bright neon tube only, on its OWN bake (blend it 'lighter', alpha = how lit)
//   paintLogoLit(c, cx, cy, k, lang, lit);  // the neon on a scratch layer blended onto a finished picture (share card)
//   const E = logoEye();                    // a live eye state; per frame: stepLogoEye(E, dt, M, x, y, k, fingerDown, fx, fy)
//   drawLogoEye(ctx, x, y, k, M, E.x, E.y, E.blink)   // per frame, allocation-free: pupil looking at E.x, E.y in -1..1, lid 0..1
// logoBox(lang, k) -> { w, h } the bake size that holds the lockup + its neon glow at scale k (allocates).
import { draw } from '../core/draw.js';
import { text } from '../core/text.js';
import { TAU } from '../core/math.js';

const TUNE = {
  ink: '#14112e',
  shadow: 'rgba(8,4,24,0.6)', shadowDy: 6, shadowBlur: 9,
  tube: '#5a1d4c', tubeW: 21,                     // the dark tube the neon lives in: the lockup's outer sticker border
  neon: '#ff4fa3', neonW: 18, neonBlur: 15,
  outline: 9.5,                                   // ink outline (half of it shows outside the glyph)
  extrude: 5,                                     // 3D depth under every face
  sep: 3.4,                                       // the thin ink line between a face and its extrusion
  pad: 30,                                        // bake margin around the lockup for the neon glow + shadow
  faces: {
    monster: { top: '#f4ffdc', hi: '#c9f77a', lo: '#5fd36c', bot: '#1fa06a', deep: '#0d5a46' },
    bouncer: { top: '#fffbe8', hi: '#ffe08a', lo: '#ffbf3c', bot: '#ff8240', deep: '#8a3412' },
  },
  gloss: 0.47,                                    // where the hard highlight edge crosses each face (0 top .. 1 bottom)
  glossA: 0.5,                                    // the white sheen above that edge
  en: {
    lines: ['MONSTER', 'BOUNCER'], faces: ['monster', 'bouncer'], size: 60, font: 'Baloo 2', weight: 800,
    track: 0.6, gap: 0.12, eye: [0, 1], eyeR: 0.6,          // eye replaces line 0 char 1 (the O), radius x cap height
    rot: [[-0.05, 0, 0.04, -0.035, 0.045, -0.02, 0.05], [0.035, -0.03, 0.035, -0.045, 0.025, -0.035, 0.045]],
    dy: [[0, 0, -0.8, 0.6, -0.9, 0.3, 0.7], [0.5, -0.4, 0.6, -0.3, 0.6, -0.6, 0.3]],
  },
  // Arabic: the bouncer line on top, right-aligned (where RTL starts) and ending in the taped googly eye, which fills the
  // line's left end; the monster line under it, bigger. eyeR = the eye's radius, eyeGap = room between it and the line,
  // eyeDy = its centre above line 0's baseline (x line 0's size)
  ar: {
    lines: ['بودي قارد', 'الوحوش'], faces: ['bouncer', 'monster'], size: [50, 66], font: 'Cairo', weight: 900,
    gap: -0.13, maxGrow: 1.3, tilt: [-0.016, 0.02], eyeR: 19, eyeGap: 10, eyeDy: 0.3,
  },
  // the velvet rope under the bouncer line between two brass stanchions: ring just under the baseline, sag = how far the
  // middle hangs below the baseline (x size), post = stanchion offset past the lines, ballUp = ball centre above the ring
  rope: { sag: 0.5, w: 11, color: '#b3203a', dark: '#4a0a1c', hi: 'rgba(255,170,185,0.6)', post: 18, ball: 10, ballUp: 15,
    foot: 0.42, brass: '#d9a441', brassDark: '#8a5a14' },
  // the googly eye: pupilR / look = pupil radius / reach (x eye radius); live behaviour (stepLogoEye): glances somewhere
  // new every lookEvery s, eases there at lookRate, follows a finger (reach = followPx design units for full deflection),
  // blinks every blinkEvery s for blinkDur s
  eye: { sclera: '#ffffff', shade: '#ddd6f6', deep: '#9a90c8', pupil: '#1d1840', pupilR: 0.47, look: 0.36, lid: '#4fcf72',
    tape: 'rgba(255,248,214,0.86)', tapeEdge: 'rgba(150,120,70,0.5)',
    lookEvery: [0.7, 1.8], lookRate: 10, followPx: 140, blinkEvery: [2.2, 4.8], blinkDur: 0.17 },
};

// ---------------------------------------------------------------- layout (logo units, centred on 0, 0, at k = 1)
let mcv = null;
function mctx() {
  if (!mcv) mcv = document.createElement('canvas').getContext('2d');
  return mcv;
}
function fontOf(str, size, weight, family) { return text.font(str, size, weight, family); }

function layoutEn() {
  const E = TUNE.en, c = mctx(), S = E.size;
  c.font = fontOf('M', S, E.weight, E.font);
  const cap = c.measureText('MONSTERBOUNCER').actualBoundingBoxAscent || S * 0.62;
  const er = cap * E.eyeR;
  const lines = [];
  let maxW = 0;
  for (let l = 0; l < E.lines.length; l++) {
    const str = E.lines[l], ws = [];
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      let cw = c.measureText(str[i]).width;
      if (l === E.eye[0] && i === E.eye[1]) cw = Math.max(cw, er * 2 + 2);
      ws.push(cw); w += cw;
    }
    lines.push({ str: str, ws: ws, w: w, track: E.track });
    w += E.track * (str.length - 1);
    lines[l].full = w;
    if (w > maxW) maxW = w;
  }
  // justify: the narrower line spreads its tracking to the wider one's width
  for (let l = 0; l < lines.length; l++) {
    const L = lines[l], n = L.str.length;
    if (n > 1 && L.full < maxW) L.track += (maxW - L.full) / (n - 1);
  }
  const gap = E.gap * S, b0 = 0, b1 = cap + gap + TUNE.extrude;
  const items = [];
  let eye = null;
  for (let l = 0; l < lines.length; l++) {
    const L = lines[l], base = l ? b1 : b0, face = E.faces[l];
    let x = -maxW / 2;
    for (let i = 0; i < L.str.length; i++) {
      const cw = L.ws[i], cx = x + cw / 2, dy = E.dy[l][i] || 0;
      if (l === E.eye[0] && i === E.eye[1]) eye = { x: cx, y: base - cap / 2 + dy, r: er };
      else items.push({ kind: 'ch', s: L.str[i], x: cx, y: base + dy, rot: E.rot[l][i] || 0, font: fontOf(L.str[i], S, E.weight, E.font), top: -cap, bot: 0, face: face });
      x += cw + L.track;
    }
  }
  return finish({ lang: 'en', items: items, eye: eye, eyeTaped: false, width: maxW, top: b0 - cap, base: b1, size: S, cap: cap });
}

function layoutAr() {
  const A = TUNE.ar, c = mctx();
  const lines = [];
  for (let l = 0; l < A.lines.length; l++) {
    const str = A.lines[l];
    c.font = fontOf(str, A.size[l], A.weight, A.font);
    lines.push({ str: str, size: A.size[l], w: c.measureText(str).width });
  }
  // the monster line sets the width; the bouncer line + its eye fill it (the line grows by size, never past maxGrow:
  // Arabic is never letter-spaced, it stays connected)
  const L0 = lines[0], L1 = lines[1], room = L1.w - (A.eyeR * 2 + A.eyeGap);
  if (L0.w < room) L0.size = Math.min(L0.size * A.maxGrow, L0.size * room / L0.w);
  for (let l = 0; l < lines.length; l++) {
    const L = lines[l];
    c.font = fontOf(L.str, L.size, A.weight, A.font);
    const m = c.measureText(L.str);
    L.w = m.width; L.asc = m.actualBoundingBoxAscent || L.size * 0.8; L.desc = m.actualBoundingBoxDescent || L.size * 0.3;
  }
  const W = Math.max(L1.w, L0.w + A.eyeR * 2 + A.eyeGap);
  const b0 = 0, b1 = b0 + L0.desc + A.gap * L1.size + L1.asc;
  const items = [];
  // line 0 right-aligned (its centre W/2 - L0.w/2 left of the right edge), line 1 centred
  items.push({ kind: 'line', s: L0.str, x: W / 2 - L0.w / 2, y: b0, rot: A.tilt[0] || 0, font: fontOf(L0.str, L0.size, A.weight, A.font), top: -L0.asc, bot: L0.desc, face: A.faces[0] });
  items.push({ kind: 'line', s: L1.str, x: 0, y: b1, rot: A.tilt[1] || 0, font: fontOf(L1.str, L1.size, A.weight, A.font), top: -L1.asc, bot: L1.desc, face: A.faces[1] });
  const eye = { x: -W / 2 + A.eyeR, y: b0 - L0.size * A.eyeDy, r: A.eyeR };
  return finish({ lang: 'ar', items: items, eye: eye, eyeTaped: true, width: W, top: b0 - L0.asc, base: b1 + L1.desc * 0.35, size: L1.size, cap: L1.asc });
}

// rope + extents, then everything shifted so the visual block is centred on 0, 0
function finish(M) {
  const R = TUNE.rope, S = M.size;
  const half = M.width / 2 + R.post;
  const ringY = M.base + TUNE.extrude + 3, sagY = M.base + S * R.sag;
  M.rope = { x0: -half, x1: half, y: ringY, sag: sagY, ballY: ringY - R.ballUp, postBot: ringY + S * R.foot };
  const pad = TUNE.tubeW / 2, r = M.rope;
  let top = M.top - pad, bot = Math.max(r.postBot + 6, sagY + R.w), left = -half - R.ball - 3, right = half + R.ball + 3;
  if (M.eye) { top = Math.min(top, M.eye.y - M.eye.r - pad); left = Math.min(left, M.eye.x - M.eye.r - pad); }
  left = Math.min(left, -M.width / 2 - pad); right = Math.max(right, M.width / 2 + pad);
  const oy = -(top + bot) / 2, ox = -(left + right) / 2;
  for (let i = 0; i < M.items.length; i++) { M.items[i].x += ox; M.items[i].y += oy; }
  if (M.eye) { M.eye.x += ox; M.eye.y += oy; }
  r.x0 += ox; r.x1 += ox; r.y += oy; r.sag += oy; r.ballY += oy; r.postBot += oy;
  M.w = right - left; M.h = bot - top;
  return M;
}

export function logoMetrics(lang) { return lang === 'ar' ? layoutAr() : layoutEn(); }
// the bake size (design units) that holds the lockup at scale k with room for its neon glow and drop shadow
export function logoBox(lang, k) {
  const M = logoMetrics(lang), p = TUNE.pad;
  return { w: Math.ceil(M.w * k + p * 2), h: Math.ceil(M.h * k + p * 2 + TUNE.shadowDy), metrics: M };
}

// ---------------------------------------------------------------- painting (bake time)
function glyph(c, it, dy, fill, stroke, lw) {
  c.save();
  c.translate(it.x, it.y + dy);
  if (it.rot) c.rotate(it.rot);
  c.font = it.font;
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(it.s, 0, 0); }
  if (fill) { c.fillStyle = fill; c.fillText(it.s, 0, 0); }
  c.restore();
}
function eyeDisc(c, e, dy, fill, stroke, lw) {
  c.beginPath(); c.arc(e.x, e.y + dy, e.r, 0, TAU);
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  if (fill) { c.fillStyle = fill; c.fill(); }
}
function faceFill(c, it) {
  const F = TUNE.faces[it.face], g = c.createLinearGradient(0, it.top, 0, it.bot), k = TUNE.gloss;
  g.addColorStop(0, F.top); g.addColorStop(k - 0.01, F.hi); g.addColorStop(k, F.lo); g.addColorStop(1, F.bot);
  return g;
}
function faceGlyph(c, it) {
  c.save();
  c.translate(it.x, it.y);
  if (it.rot) c.rotate(it.rot);
  c.font = it.font;
  c.fillStyle = faceFill(c, it); c.fillText(it.s, 0, 0);
  c.restore();
}
function setText(c, M) {
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.direction = M.lang === 'ar' ? 'rtl' : 'ltr';
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  c.lineJoin = 'round'; c.lineCap = 'round'; c.miterLimit = 2;
}
function paintRope(c, M) {
  const R = TUNE.rope, r = M.rope, I = TUNE.ink;
  // the stanchions first (the rope hangs in front of them from their rings): foot, post, ring, ball
  for (let s = 0; s < 2; s++) {
    const x = s ? r.x1 : r.x0;
    draw.sticker(c, cc => draw.ellipse(cc, x, r.postBot, 10, 4), { fill: R.brass, outline: I, lineWidth: 2.4, highlight: 0.35, shadow: 0.2 });
    draw.sticker(c, cc => draw.roundRect(cc, x - 3.6, r.ballY, 7.2, r.postBot - r.ballY - 2, 3), { fill: R.brass, outline: I, lineWidth: 2.4, highlight: 0.45, shadow: 0.25 });
    draw.sticker(c, cc => draw.ellipse(cc, x, r.y, 6.6, 3.6), { fill: R.brassDark, outline: I, lineWidth: 2.2, highlight: 0.2, shadow: 0.1 });
    draw.sticker(c, cc => draw.circle(cc, x, r.ballY, R.ball), { fill: R.brass, outline: I, lineWidth: 2.6, highlight: 0.6, shadow: 0.3 });
  }
  c.save();
  c.lineCap = 'round';
  for (let pass = 0; pass < 4; pass++) {
    c.beginPath();
    const o = pass === 3 ? -R.w * 0.2 : 0;
    c.moveTo(r.x0 + 3, r.y + o);
    c.quadraticCurveTo(0, r.sag * 2 - r.y + o, r.x1 - 3, r.y + o);
    c.lineWidth = pass === 0 ? R.w + 4.5 : pass === 1 ? R.w : pass === 2 ? R.w - 3 : R.w * 0.24;
    c.strokeStyle = pass === 0 ? I : pass === 1 ? R.dark : pass === 2 ? R.color : R.hi;
    c.stroke();
  }
  c.restore();
}
// the googly eye's white (tube + ink + extrusion are painted with the glyph passes); pupil optional (static bakes)
function paintSclera(c, e, taped) {
  const Y = TUNE.eye;
  c.fillStyle = draw.radial(c, e.x - e.r * 0.3, e.y - e.r * 0.35, e.r * 0.1, e.r * 1.15, [[0, Y.sclera], [0.62, Y.sclera], [1, Y.shade]]);
  c.beginPath(); c.arc(e.x, e.y, e.r, 0, TAU); c.fill();
  if (taped) {
    // a strip of tape across the eye's top-left, like the fakes the liars wear
    c.save();
    c.translate(e.x - e.r * 0.62, e.y - e.r * 0.78); c.rotate(-0.62);
    const tw = e.r * 1.25, th = e.r * 0.5;
    c.fillStyle = Y.tape; c.fillRect(-tw / 2, -th / 2, tw, th);
    c.strokeStyle = Y.tapeEdge; c.lineWidth = 0.9; c.strokeRect(-tw / 2, -th / 2, tw, th);
    c.restore();
  }
}
function pupilAt(c, e, lx, ly, k) {
  const Y = TUNE.eye, pr = e.r * Y.pupilR * k, reach = e.r * Y.look * k;
  const px = lx * reach, py = ly * reach;
  c.fillStyle = Y.pupil;
  c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath(); c.arc(px - pr * 0.36, py - pr * 0.38, pr * 0.3, 0, TAU); c.fill();
}

// the sticker lockup. opts { pupil: bake a pupil (static uses), lookX, lookY }
export function paintLogo(c, cx, cy, k, lang, opts) {
  const M = logoMetrics(lang), T = TUNE, its = M.items, e = M.eye, X = T.extrude;
  const o = opts || {};
  c.save();
  c.translate(cx, cy); c.scale(k, k);
  setText(c, M);
  // 1 the rope + stanchions behind the letters, 2 the dark tube (its lower copy casts the soft drop shadow), 3 ink,
  // 4 extrusion, 5 the separator line, 6 faces, 7 the googly eye's white, 8 gloss
  paintRope(c, M);
  const res = Math.abs(c.getTransform().a);
  for (let p = 0; p < 2; p++) {
    const dy = p ? 0 : X;
    c.save();
    if (!p) { c.shadowColor = T.shadow; c.shadowBlur = T.shadowBlur * res; c.shadowOffsetY = T.shadowDy * res; }
    for (let i = 0; i < its.length; i++) glyph(c, its[i], dy, T.tube, T.tube, T.tubeW);
    if (e) eyeDisc(c, e, dy, T.tube, T.tube, T.tubeW);
    c.restore();
  }
  for (let p = 0; p < 2; p++) {
    const dy = p ? 0 : X;
    for (let i = 0; i < its.length; i++) glyph(c, its[i], dy, T.ink, T.ink, T.outline);
    if (e) eyeDisc(c, e, dy, T.ink, T.ink, T.outline);
  }
  for (let d = X; d >= 1; d--) {
    for (let i = 0; i < its.length; i++) glyph(c, its[i], d, T.faces[its[i].face].deep, '', 0);
    if (e) eyeDisc(c, e, d, T.eye.deep, '', 0);
  }
  for (let i = 0; i < its.length; i++) glyph(c, its[i], 0, '', T.ink, T.sep);
  if (e) eyeDisc(c, e, 0, '', T.ink, T.sep);
  for (let i = 0; i < its.length; i++) faceGlyph(c, its[i]);
  if (e) paintSclera(c, e, M.eyeTaped);
  // the gloss: a white wash over the top of every face, kept inside the faces by painting it through a glyph mask
  paintGloss(c, M);
  if (e && o.pupil) { c.save(); c.translate(e.x, e.y); pupilAt(c, e, o.lookX || 0, o.lookY || 0, 1); c.restore(); }
  c.restore();
}
// the sheen above each face's highlight edge, masked to the faces on a scratch canvas the size of the lockup (bake time
// only; c's transform is a plain scale + translate here, as in every bake and the share card)
function paintGloss(c, M) {
  const t = c.getTransform(), m = document.createElement('canvas');
  const x0 = Math.floor(t.e + t.a * (-M.w / 2 - 12)), y0 = Math.floor(t.f + t.d * (-M.h / 2 - 12));
  m.width = Math.max(1, Math.ceil(Math.abs(t.a) * (M.w + 24))); m.height = Math.max(1, Math.ceil(Math.abs(t.d) * (M.h + 24)));
  const mc = m.getContext('2d');
  mc.setTransform(t.a, t.b, t.c, t.d, t.e - x0, t.f - y0);
  setText(mc, M);
  const its = M.items, k = TUNE.gloss;
  for (let i = 0; i < its.length; i++) {
    const it = its[i];
    mc.save(); mc.translate(it.x, it.y); if (it.rot) mc.rotate(it.rot); mc.font = it.font;
    const g = mc.createLinearGradient(0, it.top, 0, it.top + (it.bot - it.top) * k);
    g.addColorStop(0, 'rgba(255,255,255,' + TUNE.glossA + ')'); g.addColorStop(0.85, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    mc.fillStyle = g; mc.fillText(it.s, 0, 0);
    mc.restore();
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(m, x0, y0); c.restore();
}

// the bright neon tube alone (outside the ink), meant to be blended 'lighter' with alpha = how lit the sign is
export function paintLogoNeon(c, cx, cy, k, lang) {
  const M = logoMetrics(lang), T = TUNE, its = M.items, e = M.eye, X = T.extrude;
  const res = Math.abs(c.getTransform().a) * k;
  c.save();
  c.translate(cx, cy); c.scale(k, k);
  setText(c, M);
  c.save();
  c.shadowColor = T.neon; c.shadowBlur = T.neonBlur * res;
  for (let p = 0; p < 2; p++) {
    const dy = p ? X : 0;
    for (let i = 0; i < its.length; i++) glyph(c, its[i], dy, T.neon, T.neon, T.neonW);
    if (e) eyeDisc(c, e, dy, T.neon, T.neon, T.neonW);
  }
  c.restore();
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (let p = 0; p < 2; p++) {
    const dy = p ? X : 0;
    for (let i = 0; i < its.length; i++) glyph(c, its[i], dy, '#000', '#000', T.outline + 2);
    if (e) eyeDisc(c, e, dy, '#000', '#000', T.outline + 2);
  }
  for (let d = X; d >= 1; d--) for (let i = 0; i < its.length; i++) glyph(c, its[i], d, '#000', '', 0);
  c.restore();
  c.restore();
  // a hotter core along the top of the tube
  c.save(); c.globalCompositeOperation = 'source-atop';
  const y0 = cy - M.h * k * 0.62, y1 = cy + M.h * k * 0.3;
  c.fillStyle = draw.gradient(c, 0, y0, 0, y1, [[0, 'rgba(255,255,255,0.32)'], [0.55, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(cx - M.w * k, y0, M.w * k * 2, y1 - y0);
  c.restore();
}

// bake time, on any canvas (a share card): the neon tube built on its own scratch layer (paintLogoNeon erases inside the
// letters, so it never paints straight onto a finished picture) and blended 'lighter' at alpha `lit`
export function paintLogoLit(c, cx, cy, k, lang, lit) {
  const M = logoMetrics(lang), t = c.getTransform(), p = TUNE.pad;
  const x0 = Math.floor(t.e + t.a * (cx - (M.w / 2) * k - p)), y0 = Math.floor(t.f + t.d * (cy - (M.h / 2) * k - p));
  const m = document.createElement('canvas');
  m.width = Math.max(1, Math.ceil(Math.abs(t.a) * (M.w * k + p * 2))); m.height = Math.max(1, Math.ceil(Math.abs(t.d) * (M.h * k + p * 2)));
  const mc = m.getContext('2d');
  mc.setTransform(t.a, t.b, t.c, t.d, t.e - x0, t.f - y0);
  paintLogoNeon(mc, cx, cy, k, lang);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = lit === undefined ? 1 : lit;
  c.drawImage(m, x0, y0);
  c.restore();
}

// per frame: the googly eye's pupil (looking toward lx, ly in -1..1) and its lid (blink 0 open .. 1 shut), on top of a
// lockup sprite drawn centred on x, y at scale k. Allocation-free.
export function drawLogoEye(ctx, x, y, k, M, lx, ly, blink) {
  const e = M && M.eye;
  if (!e || !(k > 0)) return;
  const ex = x + e.x * k, ey = y + e.y * k, r = e.r * k;
  ctx.save();
  ctx.translate(ex, ey);
  pupilAt(ctx, e, lx, ly, k);
  if (blink > 0.02) {
    ctx.beginPath(); ctx.arc(0, 0, r - 0.4, 0, TAU); ctx.clip();
    const h = r * 2 * Math.min(1, blink);
    ctx.fillStyle = TUNE.eye.lid; ctx.fillRect(-r, -r, r * 2, h);
    ctx.fillStyle = TUNE.ink; ctx.fillRect(-r, -r + h - Math.max(1, r * 0.12), r * 2, Math.max(1, r * 0.12));
  }
  ctx.restore();
}

// a live eye state for stepLogoEye / drawLogoEye
export function logoEye() { return { x: 0.3, y: 0.2, tx: 0.3, ty: 0.2, lookT: 0.5, blink: 0, blinkT: 2, bt: -1 }; }
// per frame, allocation-free: the eye of lockup M drawn centred on x, y at scale k follows a finger at fx, fy (design
// units) while `follow`, else glances around; blinks now and then (E.blink 0..1 for drawLogoEye)
export function stepLogoEye(E, dt, M, x, y, k, follow, fx, fy) {
  const Y = TUNE.eye, e = M && M.eye;
  if (!e) return;
  if (follow) {
    const ex = x + e.x * k, ey = y + e.y * k, d = Y.followPx;
    E.tx = Math.max(-1, Math.min(1, (fx - ex) / d)); E.ty = Math.max(-1, Math.min(1, (fy - ey) / d)); E.lookT = 0.6;
  } else if ((E.lookT -= dt) <= 0) {
    E.lookT = Y.lookEvery[0] + Math.random() * (Y.lookEvery[1] - Y.lookEvery[0]);
    if (Math.random() < 0.3) { E.tx = 0; E.ty = 0.1; }
    else { const a = Math.random() * TAU, r = 0.45 + 0.55 * Math.random(); E.tx = Math.cos(a) * r; E.ty = Math.sin(a) * r * 0.8; }
  }
  const q = 1 - Math.exp(-Y.lookRate * dt);
  E.x += (E.tx - E.x) * q; E.y += (E.ty - E.y) * q;
  if (E.bt >= 0) {
    E.bt += dt;
    if (E.bt >= Y.blinkDur) { E.bt = -1; E.blink = 0; }
    else E.blink = 1 - Math.abs(2 * E.bt / Y.blinkDur - 1);
  } else if ((E.blinkT -= dt) <= 0) {
    E.blinkT = Y.blinkEvery[0] + Math.random() * (Y.blinkEvery[1] - Y.blinkEvery[0]);
    E.bt = 0;
  }
}
// an instant blink (a tap on the sign)
export function blinkLogoEye(E) { E.bt = 0; E.blinkT = TUNE.eye.blinkEvery[0]; }

export const logo = { TUNE, metrics: logoMetrics, box: logoBox, paint: paintLogo, paintNeon: paintLogoNeon, paintLit: paintLogoLit, drawEye: drawLogoEye, eye: logoEye, stepEye: stepLogoEye, blink: blinkLogoEye };
