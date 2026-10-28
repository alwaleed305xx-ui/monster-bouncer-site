// Camera: trauma-based shake (noise driven), zoom punch, directional kick and a full-screen flash overlay, applied
// around the stage centre. The loop calls camera.update(dt) each step and the renderer calls camera.apply(ctx) before
// the scene and camera.drawOverlay(ctx) after it. x/y are the scene offset in design units, zoom is a multiplier and
// rotation is in radians; camera.base holds the game-driven position/zoom/rotation that effects are layered on top of
// (see docs/ENGINE.md).
import { clamp, noise1, easeIndex } from './math.js';
import { stage } from './stage.js';

const TUNE = {
  traumaDecay: 1.8,                     // trauma lost per second (linear)
  maxOffset: 14,                        // shake offset in design units at trauma = 1 (amplitude = trauma^2 * maxOffset)
  maxRotation: 1.2 * Math.PI / 180,     // shake rotation in radians at trauma = 1
  shakeFreq: 19,                        // noise samples per second for the shake jitter
  shakeSeedX: 11.3, shakeSeedY: 173.7, shakeSeedR: 311.1,   // noise offsets so the three channels never line up
  punchScale: 1.06, punchMs: 160,       // defaults for punch()
  kickMs: 120,                          // default for kick()
  flashColor: '#fff', flashAlpha: 0.6, flashMs: 120,       // defaults for flash()
  maxTrauma: 1,
};

const outCubic = easeIndex.outCubic;
const outQuad = easeIndex.outQuad;

// effect state (plain numbers: nothing is allocated per frame)
let noiseT = 0;                               // seconds * shakeFreq, advanced only while shaking
let shakeX = 0, shakeY = 0, shakeRot = 0;     // current shake contribution
let punchAmp = 0, punchT = 0, punchDur = 0;   // zoom punch: zoom = 1 + punchAmp * (1 - outCubic(t))
let kickX = 0, kickY = 0, kickT = 0, kickDur = 0;          // directional kick vector easing back to 0
let flashColor = TUNE.flashColor, flashAlpha = 0, flashT = 0, flashDur = 0;   // flash overlay
let kickCurX = 0, kickCurY = 0, punchCur = 1, flashCur = 0;  // evaluated values for this step

export const camera = {
  // current values, with every effect applied (read these; write camera.base instead)
  x: 0, y: 0, zoom: 1, rotation: 0,
  trauma: 0,
  // game-driven camera that effects are layered on top of
  base: { x: 0, y: 0, zoom: 1, rotation: 0 },
  // handy read-outs for HUDs/debugging
  shakeX: 0, shakeY: 0, punchZoom: 1, kickX: 0, kickY: 0, flashAlpha: 0,

  addTrauma(amount) {
    this.trauma = clamp(this.trauma + (amount || 0), 0, TUNE.maxTrauma);
  },

  punch(scale, ms) {
    const s = scale === undefined ? TUNE.punchScale : scale;
    const amp = s - 1;
    // keep whatever punch is still live if it is bigger than the new one
    const live = punchAmp * (1 - outCubic(punchDur > 0 ? clamp(punchT / punchDur, 0, 1) : 1));
    punchAmp = Math.abs(live) > Math.abs(amp) ? live : amp;
    punchDur = Math.max(1, ms === undefined ? TUNE.punchMs : ms) / 1000;
    punchT = 0;
  },

  kick(dx, dy, ms) {
    // fold the remaining travel of a live kick into the new one so it never snaps
    const k = kickDur > 0 ? 1 - outCubic(clamp(kickT / kickDur, 0, 1)) : 0;
    kickX = (dx || 0) + kickX * k;
    kickY = (dy || 0) + kickY * k;
    kickDur = Math.max(1, ms === undefined ? TUNE.kickMs : ms) / 1000;
    kickT = 0;
  },

  flash(color, alpha, ms) {
    flashColor = color === undefined ? TUNE.flashColor : color;
    flashAlpha = alpha === undefined ? TUNE.flashAlpha : alpha;
    flashDur = Math.max(1, ms === undefined ? TUNE.flashMs : ms) / 1000;
    flashT = 0;
    flashCur = flashAlpha;
  },

  // drop every effect instantly (scene changes, tests)
  reset() {
    this.trauma = 0; noiseT = 0; shakeX = shakeY = shakeRot = 0;
    punchAmp = 0; punchT = punchDur = 0; punchCur = 1;
    kickX = kickY = kickCurX = kickCurY = 0; kickT = kickDur = 0;
    flashAlpha = flashCur = 0; flashT = flashDur = 0;
    this.x = this.base.x; this.y = this.base.y; this.zoom = this.base.zoom; this.rotation = this.base.rotation;
    this.shakeX = this.shakeY = 0; this.punchZoom = 1; this.kickX = this.kickY = 0; this.flashAlpha = 0;
  },

  update(dt) {
    if (!(dt > 0)) dt = 0;
    // --- trauma shake: amplitude = trauma^2, jitter from smooth value noise so it never looks like random snapping
    let tr = this.trauma - TUNE.traumaDecay * dt;
    if (tr < 0) tr = 0;
    this.trauma = tr;
    if (tr > 0) {
      noiseT += dt * TUNE.shakeFreq;
      const amp = tr * tr;
      shakeX = amp * TUNE.maxOffset * noise1(noiseT + TUNE.shakeSeedX);
      shakeY = amp * TUNE.maxOffset * noise1(noiseT * 1.13 + TUNE.shakeSeedY);
      shakeRot = amp * TUNE.maxRotation * noise1(noiseT * 0.91 + TUNE.shakeSeedR);
    } else {
      shakeX = shakeY = shakeRot = 0;
    }
    // --- zoom punch eases back to 1 (outCubic)
    if (punchDur > 0) {
      punchT += dt;
      if (punchT >= punchDur) { punchDur = 0; punchAmp = 0; punchCur = 1; }
      else punchCur = 1 + punchAmp * (1 - outCubic(punchT / punchDur));
    } else punchCur = 1;
    // --- directional kick eases back to 0 (outCubic)
    if (kickDur > 0) {
      kickT += dt;
      if (kickT >= kickDur) { kickDur = 0; kickX = kickY = 0; kickCurX = kickCurY = 0; }
      else { const k = 1 - outCubic(kickT / kickDur); kickCurX = kickX * k; kickCurY = kickY * k; }
    } else kickCurX = kickCurY = 0;
    // --- flash fades out (outQuad on the remaining alpha)
    if (flashDur > 0) {
      flashT += dt;
      if (flashT >= flashDur) { flashDur = 0; flashCur = 0; }
      else flashCur = flashAlpha * (1 - outQuad(flashT / flashDur));
    } else flashCur = 0;
    // --- compose
    const b = this.base;
    this.x = b.x + shakeX + kickCurX;
    this.y = b.y + shakeY + kickCurY;
    this.zoom = b.zoom * punchCur;
    this.rotation = b.rotation + shakeRot;
    this.shakeX = shakeX; this.shakeY = shakeY; this.punchZoom = punchCur;
    this.kickX = kickCurX; this.kickY = kickCurY; this.flashAlpha = flashCur;
  },

  // multiplies the current transform: rotate + zoom around the stage centre, then offset by x/y (design units)
  apply(ctx) {
    const cx = stage.w * 0.5, cy = stage.h * 0.5;
    ctx.translate(cx + this.x, cy + this.y);
    if (this.rotation !== 0) ctx.rotate(this.rotation);
    if (this.zoom !== 1) ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
  },

  // draws the flash over the whole stage in screen space; draws nothing when no flash is live
  drawOverlay(ctx) {
    if (flashCur <= 0.001) return;
    const k = stage.scale * stage.dpr;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = flashCur > 1 ? 1 : flashCur;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, stage.w, stage.h);
    ctx.restore();
  },
};
