// result.js: the Monster Bouncer result scene ('result', GAME-SPEC §3 / §6 'card' / §8). enter(params) takes play's end-of-night
// record { mode, night, date, seed, correct, total, tier, shutEarly, admitted: { species: correct admits }, bounced, strikes,
// comboMax, endlessScore, startedAt, vs?, bandSpecs?: { species: guest spec } } and calls profile.recordNight once (the
// outcome is kept on params.__outcome, so a re-entry never records twice). The night's street stays on screen: the play
// scene's world (the party window with tonight's band still playing, the shut brass door, the rope, the LAST CALL confetti
// fading out over the first 0.3 s) is the backdrop under an indigo scrim (eased in over 0.25 s) with an amber glow behind
// the seal, and the card slides up over it at once (outBack) under a header pill, showing the seal's empty socket and the
// ribbon slot from the first frame. Play switches here with no transition (a warm amber camera flash covers the HUD
// leaving, so no black dip cuts the payoff); entered under a 'fade' instead (dev pages), the timeline starts at the fade's
// black point and play's leftovers drop there. The score rolls up on the party pitch ladder and the seal slams
// on its last tick (drawTierStamp, rays, trauma, tier chord; the ribbon under it names the tier: the name appears once).
// Gold / Silver confetti flies on the BACK particle layer, drawn over the card panel but under the seal and the score.
// A Shut Down is visibly a failure: the dark velvet seal (a brass padlock on its core) in a shadow halo (no rays, no amber, no confetti), a dust puff,
// the sad trombone, the street dimming, a red CLOSED rubber stamp slammed across it. The All-Nighter has no percentage
// tier: a moon medal over a ribbon with its best ('Best n', or 'New best!' in gold with confetti). Then the House Band row
// pops in with tonight's admits and each species' progress bar (mint: toward its seat in the band, gold: toward its next
// colour look; a species not let in tonight is drawMini's opaque shadowed icon, never alpha), then up to TWO highlight
// lines, best first (the friend's score from a challenge link / a Rope Holder's 'Get n right to pass' / streak / the Daily
// Night opening tonight / new decor / new member / new look / the quick-call star / best / practice: rewards as brass
// pills, the pass target and quiet notes as flat captions; a second line is only ever another reward pill, and the card
// grows by card.two to hold it). The line under the score counts correct calls on both sides (+ the guests who walked
// off). A species that joined tonight gets its overlay BEFORE any button exists: its drum roll starts under the card's
// last beat, a dim (ceremony.dim: the party room stays faintly visible) covers the street and the card fades away under
// it, and a little theatre takes the screen: velvet side drapes on brass tie-backs under a swagged valance, a wooden
// stage (plank deck, brass nosing, panelled apron with a row of footlight hoods chasing on the beat), the auditorium
// floor with the stage's warm bounce and two rows of rim-lit audience silhouettes bobbing on the beat; a hot amber
// spotlight ('lighter') lands its pool on the deck under the member's feet, the drop lands on the reveal of the new member
// (in its house look, the same look the band row then shows for it) popping in and hopping under confetti raining from
// above the spotlight (faded out with the overlay: none falls over the score), then playing its instrument; 'Tap to
// continue' in the indigo + brass tag on the stage apron like a plaque. Then the buttons (primary amber; the row + the corner Home in the indigo + brass secondary style):
// Next Night (PLAY Night N after a daily or a passed friend's night; Again after a shut / rope night or the All-Nighter;
// a campaign Again / Go for Gold deals a fresh queue: seed hashNight(n) ^ attempt, challenge links + dailies keep theirs),
// Go for Gold (a passed campaign night short of Gold: the same night again, in the row), Share (the 9:16 1080x1920 card of §8: the street copied from the stage canvas
// under the score, recorded in small steps once the buttons are in; the JPEG encode, which rasterises and reads back the
// whole card, starts only when a finger lands on Share, and the tap shares that File or the canvas, which share.js encodes
// inside the tap), Challenge (share.shareChallenge; icon-only when three labels do not fit) and Home (the round icon in
// the top-LEFT corner in both languages: the top-right 100 x 100 stays empty for the facecam; it hands the
// unlocked species to the lobby as already shown: a quiet hop-in, no second fanfare). enter() itself only records + lays out: the band-row measurements and mini
// bakes, then the card's first-draw bakes (panel, socket, rays, seal / medal, CLOSED, ribbon, pills, button faces, and the
// ceremony's spotlight + theatre when one is due) run one per frame under the fade, so nothing stalls the LAST CALL fade
// or the reveal. Tapping during the intro skips. onBack()
// (main.js, the browser / Android back): closes the unlock overlay, else goes home.
// The wallet (MONETIZATION §6.2): enter() keeps wallet.onResult(outcome, params) on params.__reward (paid once); the
// card wears tonight's gems as a sticker on its top-left corner (+ a gold 'x2' with VIP, the piggy's +20 / +40 under it),
// a Star Road step / Doorman Medal / streak milestone takes a highlight line, and after a Gold night (wallet.offerDue
// 'vip': night 6+, not VIP, once a day, never after 5 no's) a non-modal VIP card slides into a slot above the primary
// button: "VIP would have doubled tonight: +N gems" + See VIP (the shop's VIP sheet) + its X (wallet.offerDismissed).
import { stage } from '../core/stage.js';
import { input } from '../core/input.js';
import { draw } from '../core/draw.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { spring, tweens } from '../core/tween.js';
import { camera } from '../core/camera.js';
import { particles } from '../core/particles.js';
import { post } from '../core/post.js';
import { TAU, clamp, lerp, easeIndex } from '../core/math.js';
import { createActor, drawMini } from '../game/actor.js';
import { createWorld } from '../game/world.js';
import { drawTierStamp, drawStampText, drawPill, drawGlyph, drawButton, drawIconButton, withBakeRes, label as iconLabel } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { plural } from '../game/strings.js';
import { prepareCard, shareCanvas, shareChallenge, shareInfo, inAppBrowser } from '../game/share.js';
import { dailyNightNumber, tierFor, passNeed } from '../game/data.js';
import { paintLogo, paintLogoLit, logoMetrics } from '../game/logo.js';
import { SPECIES, INSTR_KEY, UI_INK, UI_ACCENT, createLabel, createTag, createButtons, createPanel, createToast, measure, beat, memberSpec, nightRetrySeed, takeLatePurchase } from './home.js';
import { wallet } from '../game/economy.js';
import { drawGem, drawArt, fmtGems, createWrap, addVipMiss } from './shop.js';

const TUNE = {
  // the street behind the card: a vertical indigo scrim (lighter over the party window, heavier under the buttons) and a
  // warm glow behind the seal that spills past the card's edges
  scrim: { rgb: '18,17,58', top: 0.34, mid: 0.55, bottom: 0.74, fadeIn: 0.25 },
  glow: { color: '#ffb347', r: 300, a: 0.3, tierA: 0.14 },
  bgNoWorld: [[0, '#2a2760'], [0.55, '#17163f'], [1, '#0b0a22']],
  // the switch from play (no transition): a warm flash over the HUD leaving (a dark velvet one after a Shut Down; none
  // when the leaving scene flashed already), play's leftover confetti fading out over `leftover` s (dropped at its end)
  enterFx: { flash: '#ffd27a', flashA: 0.36, flashMs: 220, shutFlash: '#3a0c1c', shutFlashA: 0.42, leftover: 0.3, leftoverK: 10 },
  // the card tucks under the party window's middle (its chandelier + decor stay in view) while it can keep minK of its size;
  // `two` = the extra height when a second highlight line shows
  card: { w: 346, h: 540, two: 30, color: '#262357', top: 66, gapBelow: 14, slideMs: 560, slideAt: 0.05, minK: 0.86 },
  // card content (card-local y; the card scales down on short stages). One highlight: a chipH pill at `extra`; two: chipH2
  // pills at extraA / extraB (the second pops in tl.extra2 s after the first)
  y: { stamp: 100, ribbon: 202, score: 273, line: 320, rule: 339, band: 356, base: 446, plus: 462, bar: 481, extra: 514, extraA: 508, extraB: 541 },
  chipH: 34, chipH2: 30, chipMaxW: 330, chipMinW: 120,
  stamp: { size: 168, from: 2.5, rot: -0.5, slam: 0.3, impact: 0.17, raysR: 172, raysA: 0.3, raysSpin: 0.22, trauma: 0.32 },
  // the empty setting the seal slams into + the ribbon's slot, shown from the first frame so the card is never bare
  socket: { a: 0.85, ribbonW: 190, ribbonH: 38 },
  // the band row: every species at one scale on one baseline; a species not let in tonight is drawn as drawMini's OPAQUE
  // shadowed icon at miniDim (never globalAlpha: internal overlaps would show through)
  lineScale: 0.4, cardLineScale: 0.36, miniStep: 64, miniDim: 0.8,
  bar: { w: 44, h: 7, join: '#4fe3b0', look: '#ffc93c', off: 'rgba(255,255,255,0.13)', star: 13 },
  // intro (s, from the switch: enter, or a fade's black point): the card slides at card.slideAt, the score rolls over
  // countDur and the seal's impact lands on its last tick (stamp + stamp.impact = count + countDur); buttons go live at
  // `buttons`; with an unlock the ceremony starts at `unlock` and the buttons follow it
  tl: { header: 0.11, count: 0.39, countDur: 0.5, stamp: 0.72, band: 0.93, bandStep: 0.07, extra: 1.23, extra2: 0.14, buttons: 1.19, unlock: 1.49 },
  ladderGap: 0.036,
  tierInk: { gold: '#ffc93c', silver: '#dfe8f4', bronze: '#ec9558', rope: '#ff7898', shut: '#b3203a' },
  // Shut Down reads as a failure: no rays, no amber glow, no confetti; a cold scrim, a velvet-red ember behind the dark
  // seal, a dust puff, and a CLOSED rubber stamp slammed across the seal `closedAt` s after its impact
  shut: { scrimA: 0.2, ember: '#7a1426', emberA: 0.3, shadowA: 0.5, closedAt: 0.32, closedSize: 34, closedX: 28, closedY: 38, closedRot: -0.2,
    closedCol: '#ff4d5e', trauma: 0.22, score: '#ffe4dc' },
  // the All-Nighter has no percentage tier: a moon medal (brass scalloped rim, night enamel, crescent + stars) over a
  // ribbon with the standing best ('Best n', or 'New best!' in gold with confetti)
  medal: { bump: 26, rim: [[0, '#ffe9a8'], [0.35, '#e2b04f'], [0.75, '#b07a22'], [1, '#7a4a10']], enamel: [[0, '#4a43a8'], [0.6, '#262170'], [1, '#14123f']],
    moon: '#fff1c9', star: '#ffe7a3', ribbon: '#d9a441', ribbonBest: '#ffc93c', rays: '#9d93ff', raysBest: '#ffd166' },
  // bottom row: Share / Challenge (+ Go for Gold after a passed campaign night short of Gold) sized to their labels inside
  // rowTotal (see sizeRow; 352 = the 358-unit safe width less a hair), one font for all; when three labels do not fit at
  // rowFont, Challenge goes icon-only (its trophy at iconFont on an iconW face) before any label shrinks. The indigo + brass
  // secondary sticker, each glyph carrying the button's one accent. Home is the round secondary icon in the top-LEFT
  // corner in both languages (homeX in from the edge, at the header's height): the top-right 100 x 100 stays empty (facecam)
  buttons: { primaryUp: 118, primaryW: 300, primaryH: 70, rowUp: 40, rowW: 108, rowH: 56, rowGap: 10, rowTotal: 352, rowMinW: 96, rowMaxW: 166,
    rowGap3: 6, rowTotal3: 352, rowPad: 24, rowFont: 17, rowFontMin: 12, iconW: 66, iconFont: 22, shareIcon: '#53d0f5', challengeIcon: '#ffd166', goldIcon: '#ffc93c',
    // the header pill: at most headMax wide, centred, but never past x headRight (the facecam zone starts at x 290)
    home: 46, homeX: 34, headMax: 220, headRight: 288 },
  // the highlight line: rewards are brass pills; quiet notes (practice, a replay, the standing best) and the Rope Holder's
  // 'Get n right to pass' goal are flat captions (no rim, no shadow: nothing that reads as a button), glyph + text
  flat: { size: 15, glyph: 17, gap: 7, maxW: 300, note: '#fff4dc', noteA: 0.7, goal: '#ffe2b8', goalGlyph: '#4fe3b0' },
  // the reveal: a dim (`dim` alpha: the party room stays faintly visible above the stage) covers the street and the card
  // (which fades away under it, so nothing of the card shows through); the unlock stinger fires `lead` s before the overlay
  // opens, so its drum roll runs under the card's last beat and its drop (party ROLL_END, 0.93 s into it) lands on the
  // reveal (`reveal` s into the overlay). The member's feet stand at `feet` x H on the stage deck. Confetti rains from above
  // the spotlight's edges (rainUp over the head, rainDx either side) past the face, and is faded out with the overlay
  // (never over the card's score); the hint tag sits on the stage apron. The Shut Down seal gets a brass padlock on its
  // dark core (shutLock x the seal size) so the centre never reads as a black hole
  ceremony: { reveal: 0.55, lead: 0.38, hops: 3, hopDur: 0.3, hopH: 46, scale: 1.45, feet: 0.6, tapAfter: 1.0, fade: 0.3, dim: 0.75,
    dimCol: '#0b0a22', rainUp: 250, rainDx: 92 },
  // the ceremony's theatre (stage units; baked once per stage height while the card plays): the deck runs deckBack above
  // the feet (its back edge `inset` in from each side) to deckFront below (full width, `planks` boards toward a vanishing
  // point), a brass nosing, a panelled apron (`panels`), `hoods` footlight hoods hoodStep apart on the nosing (bulb glow
  // bulbR, one in `chase` lit on each half beat), then the auditorium floor to the screen bottom with the stage's warm
  // bounce (bounceA). Drapes: drapeW wide at the top, gathered to tieW at drapeTie x their height, flaring to drapeBot at
  // the deck; the valance band reaches safeTop + valance with swagH swags `swag` wide. Audience: two rows crowdH tall at
  // the screen bottom, bobbing `bob` units on alternate beats. pad = overscan past the screen edges (camera shake)
  theatre: { deckBack: 30, deckFront: 20, nose: 5, apron: 64, inset: 40, planks: 14, panels: 5, pad: 20,
    hoods: 7, hoodStep: 46, hoodW: 24, hoodH: 10, bulbR: 17, chase: 3, bounceA: 0.5,
    drapeW: 84, tieW: 26, drapeTie: 0.6, drapeBot: 44, valance: 8, swag: 64, swagH: 18,
    crowdH: 150, bob: 3,
    wood: [[0, '#2e1a0c'], [0.45, '#5a3418'], [1, '#86542a']], apronCol: [[0, '#4a2614'], [1, '#1c0e08']],
    floor: [[0, '#150c22'], [0.3, '#0e0820'], [1, '#06051a']],
    velvet: [[0, '#4a0918'], [0.32, '#8e1a33'], [0.62, '#b3203a'], [0.86, '#9e1c36'], [1, '#5e0c20']],
    fringe: '#e2b04f', brass: [[0, '#f0c45a'], [0.5, '#b07a22'], [1, '#5a3a0a']],
    crowdBack: '#0f0c28', crowdFront: '#05040f', rim: 'rgba(255,184,110,', rimBack: 0.42, rimFront: 0.72 },
  shutLock: { size: 0.3, dy: 0.01, color: '#e2b04f' },
  // logo: the lockup fits maxW x maxH centred at y, the header line (night / daily / All-Nighter) at head
  card916: { w: 1080, h: 1920, scrim: 0.6, after: 0.35, snapW: 780, logo: { y: 92, maxW: 296, maxH: 118, head: 166 } },   // after: s past the buttons before the card paints
  // the wallet (MONETIZATION §6.2): tonight's gems as a sticker on the card's top-LEFT corner (card-local x / y, w x h,
  // tilted rot; + a gold 'x2' with VIP), the piggy's share under it (piggyDy), popping in at `at` s; the VIP card (a Gold
  // night, night 6+, not VIP, wallet caps: once a day, 5 dismissals) in a slot of h above the primary button, sliding in
  // `after` s past the buttons
  gem: { x: -112, y: 26, w: 96, h: 38, rot: -0.1, piggyDy: 40, pigW: 78, pigH: 28, at: 1.3 },
  vip: { w: 346, h: 62, gap: 8, after: 0.45, see: 98, seeH: 40, text: 168 },
};

const SPR = { scale: 1, sx: 1, sy: 1, rot: 0, alpha: 1, anchor: null };
const AN_C = [0.5, 0.5];
const A_TILT = -0.1;                                  // the medal rests at the seals' tilt (icons.js stamp.tilt)
const SCORE_O = { size: 80, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 12, shadow: 'rgba(0,0,0,0.42)', shadowOffset: 6 };
const RIB_O = { color: '#ffc93c', textColor: '#6a3f00', icon: '' };
const LOGO_O = { pupil: true, lookX: 0.15, lookY: 0.75 };          // the share card's lockup: a baked pupil looking down at the seal
const HEAD_O = { icon: 'moon', color: '#221f5c' };
const EXTRA_O = { icon: 'star', color: UI_ACCENT.brass }, EXTRA2_O = { icon: 'star', color: UI_ACCENT.brass };
const STAR_O = { color: '#ffc93c' };
const AO = { alpha: 1, dim: 0, flip: false, light: { door: 0.6, lamp: 0 } };
const PULSE = { chroma: 0.9, ms: 170 };
// the card's confetti lives on the BACK particle layer, which render() draws over the card panel but under the seal and
// the score (so the hero number is never speckled over); the ceremony's rain is front (over its dim)
const CONF_L = { angle: -1.05, spread: 0.7, count: 46, layer: 'back' }, CONF_R = { angle: -2.09, spread: 0.7, count: 46, layer: 'back' };
const RAIN = { angle: Math.PI / 2, spread: 0.6, speed: [90, 260], count: 32, spawnRadius: 30, layer: 'front' };
const OV_STARS = { count: 12, layer: 'back' }, OV_SPARK = { count: 22, spawnRadius: 40 }, OV_RING = { layer: 'back' };
const OV_DUST = { count: 14, speed: [40, 120], spread: 2.8, size: [16, 58], spawnRadius: 44, colors: ['#6f6890', '#8a83aa', '#544d74'], alpha: [0.4, 0.62] };
const MOON_O = { color: '#fff1c9' };
const WARM_B = { color: '', textColor: '', icon: '', size: 0, rim: '', iconColor: '' };
const SP_HEAD = { to: 1, stiffness: 300, damping: 15 };
const SP_POP = { to: 1, stiffness: 280, damping: 12 };
const SP_KICK = { to: 1, stiffness: 600, damping: 14, velocity: 3 };
const SP_ACTOR = { to: 1, stiffness: 220, damping: 10, velocity: 4 };

// rays behind the seal: one baked white-to-clear wedge fan per tier colour
const RAY_BAKE = {};
for (const k in TUNE.tierInk) RAY_BAKE[k] = makeRays(TUNE.tierInk[k]);
RAY_BAKE.endless = makeRays(TUNE.medal.rays); RAY_BAKE.best = makeRays(TUNE.medal.raysBest);
function makeRays(col) {
  return function (c, w, h) {
    const cx = w / 2, cy = h / 2, n = 16, R = w / 2;
    c.fillStyle = draw.radial(c, cx, cy, 0, R, [[0, col], [0.35, col], [1, 'rgba(0,0,0,0)']]);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, b = a + TAU / n * 0.42;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a, b); c.closePath(); c.fill();
    }
  };
}
// the ceremony spotlight (drawn with 'lighter' over the dim), a w x h bake: a hot amber core fading to clear at the cone's
// edges, built from `layers` nested cones (widest first, each a faint amber-to-cream wedge brighter near the lamp: their
// overlap makes the hot core, a lone outer layer the soft edge; bake time only). Each layer ends in its OWN footprint
// ellipse on the deck (squash = the deck's perspective), so the cone's foot is a nest of soft arcs, never a cut line, and
// the pool of light (its gradient squashed with it: soft all round) is centred poolY down the bake, with h - poolY of room
// below for its soft edge. The sprite is drawn with the pool centre on the member's feet (CONE_AN).
const CONE = { w: 320, h: 720, poolY: 640, layers: 26, a: 0.065, top: 0.1, bot: 0.5, squash: 0.16, core: [255, 224, 150], mid: [255, 150, 40],
  fadeTo: 0.4, footA: 0.15 };
const CONE_AN = [0.5, CONE.poolY / CONE.h];
function bakeCone(c, w, h) {
  const K = CONE, cx = w / 2, top = w * K.top / 2, bot = w * K.bot, py = K.poolY;
  for (let i = 0; i < K.layers; i++) {
    const f = 1 - i / K.layers, ht = top * f, hb = bot * f, ry = hb * K.squash, u = i / (K.layers - 1);
    const rgb = 'rgba(' + Math.round(K.mid[0] + (K.core[0] - K.mid[0]) * u) + ',' + Math.round(K.mid[1] + (K.core[1] - K.mid[1]) * u) + ',' + Math.round(K.mid[2] + (K.core[2] - K.mid[2]) * u) + ',';
    c.fillStyle = draw.gradient(c, 0, 0, 0, py + ry, [[0, rgb + K.a + ')'], [py / (py + ry), rgb + (K.a * K.fadeTo).toFixed(4) + ')'], [1, rgb + (K.a * K.footA).toFixed(4) + ')']]);
    c.beginPath(); c.moveTo(cx - ht, 0); c.lineTo(cx + ht, 0); c.lineTo(cx + hb, py);
    c.ellipse(cx, py, hb, ry, 0, 0, Math.PI);          // the footprint's near half (through the bottom)
    c.closePath(); c.fill();
  }
  const core = K.core.join(','), mid = K.mid.join(',');
  c.save(); c.translate(cx, py); c.scale(1, K.squash);
  c.fillStyle = draw.radial(c, 0, 0, 0, bot, [[0, 'rgba(' + core + ',0.8)'], [0.45, 'rgba(' + mid + ',0.35)'], [1, 'rgba(' + mid + ',0)']]);
  c.beginPath(); c.arc(0, 0, bot, 0, TAU); c.fill();
  c.restore();
}

// ---- the ceremony's theatre (TUNE.theatre). TH = its screen y's for this stage height (theatreLayout, from layout()):
// feet (the deck line the member stands on), front (the deck's front edge), apronTop / apronBot, stageH (the stage bake's
// height: from the deck's back edge to past the screen bottom), drapeH (a drape bake: from 20 above the screen to the deck)
const TH = { feet: 500, front: 520, apronTop: 525, apronBot: 589, stageH: 380, drapeH: 540, valH: 70 };
function theatreLayout() {
  const T = TUNE.theatre, H = stage.h;
  TH.feet = Math.round(H * TUNE.ceremony.feet);
  TH.front = TH.feet + T.deckFront; TH.apronTop = TH.front + T.nose; TH.apronBot = TH.apronTop + T.apron;
  TH.stageH = H + 12 - (TH.feet - T.deckBack);
  TH.drapeH = TH.front + 24;
  TH.valH = 20 + stage.safeTop + T.valance + T.swagH + 8;
}
// the stage, (390 + 2 pad) wide, y 0 = the deck's back edge: the auditorium floor under everything, the plank deck in
// perspective (dark at the back where the backdrop shadows it), the brass nosing, the panelled apron with brass studs,
// and the footlight hoods along the nosing (their bulbs glow per frame)
function bakeStage(c, w, h) {
  const T = TUNE.theatre, p = T.pad, yf = T.deckBack + T.deckFront, ya = yf + T.nose, yz = ya + T.apron;
  const bl = p + T.inset, br = w - p - T.inset;
  c.fillStyle = draw.gradient(c, 0, yz, 0, h, T.floor); c.fillRect(0, yz - 1, w, h - yz + 1);
  // the deck
  c.save();
  c.beginPath(); c.moveTo(bl, 0); c.lineTo(br, 0); c.lineTo(w, yf); c.lineTo(0, yf); c.closePath();
  c.fillStyle = draw.gradient(c, 0, 0, 0, yf, T.wood); c.fill();
  c.clip();
  for (let i = 1; i < T.planks; i++) {
    const u = i / T.planks, x0 = bl + (br - bl) * u, x1 = w * u;
    c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, yf); c.lineWidth = 1.3; c.strokeStyle = 'rgba(24,10,2,0.55)'; c.stroke();
    c.beginPath(); c.moveTo(x0 + 0.9, 0); c.lineTo(x1 + 1.3, yf); c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,214,150,0.08)'; c.stroke();
  }
  // staggered board ends
  for (let i = 0; i < T.planks; i++) {
    const v = ((i * 37) % 10) / 10 * 0.7 + 0.15, y = yf * v, u0 = i / T.planks, u1 = (i + 1) / T.planks;
    const xl = bl + (br - bl) * u0 + (w * u0 - bl - (br - bl) * u0) * v, xr = bl + (br - bl) * u1 + (w * u1 - bl - (br - bl) * u1) * v;
    c.fillStyle = 'rgba(24,10,2,0.45)'; c.fillRect(xl, y, xr - xl, 1);
  }
  c.fillStyle = draw.gradient(c, 0, 0, 0, 14, [[0, 'rgba(6,3,10,0.6)'], [1, 'rgba(6,3,10,0)']]); c.fillRect(0, 0, w, 14);
  c.fillStyle = draw.gradient(c, 0, yf - 8, 0, yf, [[0, 'rgba(255,214,150,0)'], [1, 'rgba(255,214,150,0.12)']]); c.fillRect(0, yf - 8, w, 8);
  c.restore();
  // the brass nosing
  c.fillStyle = draw.gradient(c, 0, yf, 0, ya, T.brass); c.fillRect(0, yf, w, T.nose);
  c.fillStyle = 'rgba(255,246,214,0.55)'; c.fillRect(0, yf, w, 1);
  // the apron: dark wood, recessed panels, brass studs between them, a shadow at its foot
  c.fillStyle = draw.gradient(c, 0, ya, 0, yz, T.apronCol); c.fillRect(0, ya, w, T.apron);
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, ya, w, 2);
  const n = T.panels, gap = 9, pw = (390 - 12 - (n - 1) * gap) / n, py = ya + 9, ph = T.apron - 18;
  for (let i = 0; i < n; i++) {
    const px = p + 6 + i * (pw + gap);
    draw.roundRect(c, px, py, pw, ph, 5); c.fillStyle = 'rgba(0,0,0,0.26)'; c.fill();
    draw.roundRect(c, px + 0.5, py + 0.5, pw - 1, ph - 1, 4.5); c.lineWidth = 1; c.strokeStyle = 'rgba(255,214,150,0.09)'; c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(px + 3, py + 1, pw - 6, 2.5);
    if (i > 0) {
      const sx = px - gap / 2;
      draw.sticker(c, cc => draw.circle(cc, sx, ya + T.apron / 2, 2.6), { fill: '#d9a441', outline: UI_INK, lineWidth: 1.2, highlight: 0.4, shadow: 0.2 });
    }
  }
  c.fillStyle = draw.gradient(c, 0, yz - 7, 0, yz, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); c.fillRect(0, yz - 7, w, 7);
  // footlight hoods sitting on the nosing (brass domes facing the house)
  for (let i = 0; i < T.hoods; i++) {
    const x = p + 195 + (i - (T.hoods - 1) / 2) * T.hoodStep, hw = T.hoodW / 2, y = yf + 1;
    c.beginPath(); c.ellipse(x, y, hw, T.hoodH, 0, Math.PI, 0); c.closePath();
    c.fillStyle = draw.gradient(c, 0, y - T.hoodH, 0, y, [[0, '#c48a2e'], [0.5, '#7a4a10'], [1, '#3a2208']]); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = UI_INK; c.stroke();
    c.beginPath(); c.ellipse(x, y, hw - 3, T.hoodH - 3, 0, Math.PI * 1.15, Math.PI * 1.6); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,236,190,0.6)'; c.stroke();
  }
}
// a velvet drape (the LEFT one; the right is the same bake mirrored), y 0 = 20 above the screen top: straight on the outer
// edge, its inner edge sweeping in from drapeW to a brass tie-back at drapeTie, then flaring out to drapeBot on the deck;
// folds follow the same sweep, the inner edge catches the spotlight in a warm rim
// (cont: true carries on the current subpath, for the drape's fill outline; else a fresh one, for a stroke)
function drapeEdge(c, f, h, cont) {
  const T = TUNE.theatre, tie = h * T.drapeTie, W0 = T.drapeW * f, tw = T.tieW * f, bw = T.drapeBot * f;
  if (cont) c.lineTo(W0, 0); else c.moveTo(W0, 0);
  c.quadraticCurveTo(W0 * 0.94, tie * 0.55, tw, tie);
  c.quadraticCurveTo(tw * 1.12, tie + (h - tie) * 0.45, bw, h);
}
function bakeDrape(c, w, h) {
  const T = TUNE.theatre, tie = h * T.drapeTie;
  c.beginPath(); c.moveTo(-2, 0); drapeEdge(c, 1, h, true); c.lineTo(-2, h); c.closePath();
  c.fillStyle = draw.gradient(c, 0, 0, T.drapeW, 0, T.velvet); c.fill();
  c.save(); c.clip();
  for (let k = 1; k <= 4; k++) {
    const f = k / 5;
    c.beginPath(); drapeEdge(c, f, h, false); c.lineWidth = 5; c.strokeStyle = 'rgba(36,0,10,0.42)'; c.stroke();
    c.save(); c.translate(3, 0); c.beginPath(); drapeEdge(c, f, h, false); c.lineWidth = 1.8; c.strokeStyle = 'rgba(255,170,170,0.11)'; c.stroke(); c.restore();
  }
  // the gathered folds under the tie-back sit in shadow; the inner edge catches the spotlight
  c.fillStyle = draw.gradient(c, 0, tie - 30, 0, tie + 50, [[0, 'rgba(20,0,8,0)'], [0.4, 'rgba(20,0,8,0.35)'], [1, 'rgba(20,0,8,0)']]);
  c.fillRect(0, tie - 30, w, 80);
  c.save(); c.translate(-2, 0); c.beginPath(); drapeEdge(c, 1, h, false); c.lineWidth = 4; c.strokeStyle = 'rgba(255,196,120,0.4)'; c.stroke(); c.restore();
  c.restore();
  c.beginPath(); drapeEdge(c, 1, h, false); c.lineWidth = 2.5; c.strokeStyle = UI_INK; c.stroke();
  // the tie-back: a brass rope band + a tassel
  const tw = T.tieW + 7;
  draw.roundRect(c, -4, tie - 5, tw + 4, 10, 5);
  c.fillStyle = draw.gradient(c, 0, tie - 5, 0, tie + 5, T.brass); c.fill();
  c.lineWidth = 1.8; c.strokeStyle = UI_INK; c.stroke();
  c.beginPath(); c.moveTo(tw - 3, tie + 4); c.lineTo(tw - 3, tie + 16); c.lineWidth = 1.6; c.strokeStyle = '#8a5a14'; c.stroke();
  draw.sticker(c, cc => draw.ellipse(cc, tw - 3, tie + 23, 4.5, 8), { fill: T.fringe, outline: UI_INK, lineWidth: 1.5, highlight: 0.35, shadow: 0.25 });
}
// the valance across the top (430 wide, y 0 = 20 above the screen top): a velvet band with swags and a gold fringe
function bakeValance(c, w, h) {
  const T = TUNE.theatre, vb = h - T.swagH - 8, sw = T.swag, n = Math.ceil(w / sw) + 1, x0 = (w - n * sw) / 2;
  c.fillStyle = draw.gradient(c, 0, 0, 0, vb + T.swagH, [[0, '#4a0918'], [0.6, '#9e1c36'], [1, '#7a1429']]);
  c.fillRect(0, 0, w, vb);
  for (let i = 0; i < n; i++) { c.beginPath(); c.ellipse(x0 + i * sw + sw / 2, vb, sw / 2 + 1, T.swagH, 0, 0, Math.PI); c.fill(); }
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * sw + sw / 2;
    c.beginPath(); c.ellipse(cx, vb - 3, sw / 2 - 8, T.swagH - 8, 0, 0.2, Math.PI - 0.2); c.lineWidth = 2.5; c.strokeStyle = 'rgba(36,0,10,0.4)'; c.stroke();
    c.beginPath(); c.ellipse(cx, vb, sw / 2 - 1, T.swagH - 1, 0, 0.1, Math.PI - 0.1); c.lineWidth = 3; c.strokeStyle = T.fringe; c.stroke();
    c.beginPath(); c.ellipse(cx, vb, sw / 2 + 1, T.swagH + 1, 0, 0.06, Math.PI - 0.06); c.lineWidth = 1.5; c.strokeStyle = UI_INK; c.stroke();
  }
  c.fillStyle = draw.gradient(c, 0, vb - 6, 0, vb + 1, T.brass); c.fillRect(0, vb - 6, w, 5);
  for (let i = 0; i <= n; i++) draw.sticker(c, cc => draw.circle(cc, x0 + i * sw, vb + 2, 4.5), { fill: T.fringe, outline: UI_INK, lineWidth: 1.4, highlight: 0.4, shadow: 0.2 });
}
// audience silhouettes (crowdH tall, anchored on the screen bottom): [kind, screen x, head top above the bottom, scale];
// hats, crowns, ears and antennae nod to the five guests; an `up` arm waves at the stage
const CROWD_BACK = [['tall', 22, 128, 0.74, 0], ['round', 84, 112, 0.78, 1], ['square', 150, 120, 0.74, 0], ['blob', 214, 116, 0.76, 0],
  ['bean', 276, 124, 0.74, 1], ['round', 334, 114, 0.78, 0], ['tall', 392, 126, 0.72, 0]];
const CROWD_FRONT = [['blob', 30, 84, 1.0, 0], ['bean', 104, 70, 0.98, 0], ['square', 196, 64, 1.04, 1], ['tall', 282, 82, 0.98, 0], ['round', 362, 72, 1.02, 0]];
// adds one silhouette's subpaths (all clockwise, so the nonzero fill is their union) with its head top at (x, top)
function rrPath(c, x, y, w, h, r) {
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}
function silPath(c, kind, x, top, s, up, bottom) {
  const sh = top + 44 * s;
  rrPath(c, x - 34 * s, sh, 68 * s, bottom - sh + 20, 24 * s);
  if (up) { rrPath(c, x + 22 * s, top - 4 * s, 11 * s, 64 * s, 5.5 * s); c.moveTo(x + 27.5 * s + 8 * s, top - 6 * s); c.arc(x + 27.5 * s, top - 6 * s, 8 * s, 0, TAU); }
  if (kind === 'blob') {
    c.moveTo(x + 27 * s, top + 30 * s); c.ellipse(x, top + 30 * s, 27 * s, 23 * s, 0, 0, TAU);
    c.moveTo(x - 11 * s, top + 11 * s); c.lineTo(x + 1 * s, top - 18 * s); c.lineTo(x + 12 * s, top + 9 * s); c.closePath();
  } else if (kind === 'tall') {
    c.moveTo(x + 19 * s, top + 36 * s); c.ellipse(x, top + 36 * s, 19 * s, 30 * s, 0, 0, TAU);
    rrPath(c, x - 21 * s, top + 6 * s, 42 * s, 6 * s, 2 * s); rrPath(c, x - 13 * s, top - 22 * s, 26 * s, 30 * s, 3 * s);
  } else if (kind === 'round') {
    c.moveTo(x + 26 * s, top + 28 * s); c.arc(x, top + 28 * s, 26 * s, 0, TAU);
    c.moveTo(x - 13 * s, top + 6 * s); c.arc(x - 20 * s, top + 6 * s, 7 * s, 0, TAU);
    c.moveTo(x + 27 * s, top + 6 * s); c.arc(x + 20 * s, top + 6 * s, 7 * s, 0, TAU);
  } else if (kind === 'square') {
    rrPath(c, x - 24 * s, top + 4 * s, 48 * s, 46 * s, 11 * s);
    c.moveTo(x - 18 * s, top + 8 * s); c.lineTo(x - 18 * s, top - 10 * s); c.lineTo(x - 9 * s, top); c.lineTo(x, top - 14 * s);
    c.lineTo(x + 9 * s, top); c.lineTo(x + 18 * s, top - 10 * s); c.lineTo(x + 18 * s, top + 8 * s); c.closePath();
  } else {
    c.moveTo(x + 21 * s, top + 32 * s); c.ellipse(x, top + 32 * s, 21 * s, 29 * s, 0.18, 0, TAU);
    rrPath(c, x + 3 * s, top - 14 * s, 3.4 * s, 22 * s, 1.7 * s);
    c.moveTo(x + 4.7 * s + 6 * s, top - 15 * s); c.arc(x + 4.7 * s, top - 15 * s, 6 * s, 0, TAU);
  }
}
// a row: each silhouette filled in the stage's warm rim colour, then its dark body shifted down `rim` inside it, so only
// a warm crescent lights its top edges
function crowdBake(list, dark, rimA, rim) {
  return function (c, w, h) {
    const T = TUNE.theatre, p = T.pad;
    for (let i = 0; i < list.length; i++) {
      const e = list[i], x = p + e[1], top = h - e[2];
      c.save();
      c.beginPath(); silPath(c, e[0], x, top, e[3], e[4], h); c.clip();
      c.fillStyle = T.rim + rimA + ')'; c.fillRect(0, 0, w, h);
      c.translate(0, rim);
      c.beginPath(); silPath(c, e[0], x, top, e[3], e[4], h); c.fillStyle = dark; c.fill();
      c.restore();
    }
  };
}
const TT = TUNE.theatre;
const BAKE_CROWD_B = crowdBake(CROWD_BACK, TT.crowdBack, TT.rimBack, 2);
const BAKE_CROWD_F = crowdBake(CROWD_FRONT, TT.crowdFront, TT.rimFront, 2.6);
function bakeBulb(c, w, h) {
  c.fillStyle = draw.radial(c, w / 2, h / 2, 0, w / 2, [[0, 'rgba(255,240,190,0.95)'], [0.3, 'rgba(255,190,90,0.5)'], [1, 'rgba(255,170,60,0)']]);
  c.fillRect(0, 0, w, h);
}
// the stage's warm bounce on the auditorium floor below the apron (a soft wide ellipse, its gradient squashed with it)
function bakeBounce(c, w, h) {
  c.save(); c.translate(w / 2, h / 2); c.scale(1, h / w);
  c.fillStyle = draw.radial(c, 0, 0, 0, w / 2, [[0, 'rgba(255,190,110,0.7)'], [0.5, 'rgba(255,150,60,0.25)'], [1, 'rgba(255,150,60,0)']]);
  c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.fill();
  c.restore();
}
function stageCv() { return draw.cached('result.stage', 390 + 2 * TT.pad, TH.stageH, bakeStage); }
function drapeCv() { return draw.cached('result.drape', TT.drapeW + 8, TH.drapeH, bakeDrape); }
function valanceCv() { return draw.cached('result.valance', 390 + 2 * TT.pad, TH.valH, bakeValance); }
function crowdBCv() { return draw.cached('result.crowdB', 390 + 2 * TT.pad, TT.crowdH, BAKE_CROWD_B); }
function crowdFCv() { return draw.cached('result.crowdF', 390 + 2 * TT.pad, TT.crowdH, BAKE_CROWD_F); }
function coneCv() { return draw.cached('result.cone', CONE.w, CONE.h, bakeCone); }
// the All-Nighter medal of diameter S at (cx, cy): a brass scalloped rim, a bevel ring, night-blue enamel with a star
// field, the crescent moon glyph, a glossy highlight. Painted straight into any ctx (the stage bake and the share card).
function scallop(c, cx, cy, R, n) {
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = i * TAU / n, a1 = (i + 0.5) * TAU / n, a2 = (i + 1) * TAU / n, rv = R * 0.93, rp = R * 1.07;
    if (i === 0) c.moveTo(cx + Math.cos(a0) * rv, cy + Math.sin(a0) * rv);
    c.quadraticCurveTo(cx + Math.cos(a1) * rp, cy + Math.sin(a1) * rp, cx + Math.cos(a2) * rv, cy + Math.sin(a2) * rv);
  }
  c.closePath();
}
const MEDAL_STARS = [-0.42, -0.3, 0.09, 0.38, -0.26, 0.11, 0.3, 0.42, 0.07, 0.47, 0.22, 0.06, -0.47, 0.18, 0.05, 0.12, -0.5, 0.07, -0.18, 0.44, 0.06];
function paintMedal(c, cx, cy, S) {
  const M = TUNE.medal, R = S * 0.47, lw = Math.max(2, S * 0.018);
  c.save();
  c.fillStyle = 'rgba(6,4,22,0.45)'; scallop(c, cx + S * 0.012, cy + S * 0.035, R, M.bump); c.fill();
  scallop(c, cx, cy, R, M.bump);
  c.fillStyle = draw.gradient(c, 0, cy - R, 0, cy + R, M.rim); c.fill();
  c.lineWidth = lw; c.strokeStyle = UI_INK; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.8, 0, TAU);
  c.fillStyle = draw.gradient(c, 0, cy - R * 0.8, 0, cy + R * 0.8, [[0, '#7a4a10'], [0.5, '#b07a22'], [1, '#ffe39a']]); c.fill();
  c.lineWidth = lw * 0.8; c.strokeStyle = UI_INK; c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.72, 0, TAU);
  c.fillStyle = draw.radial(c, cx - R * 0.2, cy - R * 0.25, 0, R * 0.9, M.enamel); c.fill();
  c.lineWidth = lw * 0.7; c.strokeStyle = UI_INK; c.stroke();
  // star field (unit offsets x R: x, y, size)
  c.fillStyle = M.star;
  for (let i = 0; i < MEDAL_STARS.length; i += 3) { draw.star(c, cx + MEDAL_STARS[i] * R, cy + MEDAL_STARS[i + 1] * R, MEDAL_STARS[i + 2] * R, 0.42, 4); c.fill(); }
  MOON_O.color = M.moon;
  drawGlyph(c, 'moon', cx - R * 0.04, cy + R * 0.02, R * 0.98, MOON_O);
  // gloss across the top of the enamel
  c.beginPath(); c.arc(cx, cy, R * 0.72, 0, TAU); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.beginPath(); c.ellipse(cx - R * 0.12, cy - R * 0.5, R * 0.62, R * 0.26, -0.3, 0, TAU); c.fill();
  c.restore();
}
function bakeMedal(c, w, h) { paintMedal(c, w / 2, h / 2, TUNE.stamp.size); }
// the Shut Down seal's dark core carries a brass padlock (the door is locked), so its centre never reads as a void
const LOCK_O = { color: '#e2b04f' };
function drawShutLock(c, cx, cy, S) {
  const L = TUNE.shutLock;
  LOCK_O.color = L.color;
  drawGlyph(c, 'lock', cx, cy + S * L.dy, S * L.size, LOCK_O);
}
// the seal's empty setting: a recessed dark well with a faint brass lip (the seal slams into it)
function bakeSocket(c, w, h) {
  const cx = w / 2, cy = h / 2, R = TUNE.stamp.size * 0.47;
  c.fillStyle = draw.radial(c, cx, cy + R * 0.1, R * 0.4, R * 1.05, [[0, 'rgba(8,6,28,0.55)'], [0.85, 'rgba(8,6,28,0.32)'], [1, 'rgba(8,6,28,0)']]);
  c.beginPath(); c.arc(cx, cy, R * 1.04, 0, TAU); c.fill();
  c.beginPath(); c.arc(cx, cy, R * 0.9, 0, TAU); c.lineWidth = 2; c.strokeStyle = 'rgba(217,164,65,0.28)'; c.stroke();
  c.beginPath(); c.arc(cx, cy + 1.5, R * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,236,190,0.12)'; c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.62, 0, TAU); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.06)'; c.stroke();
}

// ---------------------------------------------------------------- state
const st = {
  t: 0, active: false, skipping: false, slide: 1, head: 0, count: 0, shown: -1, lastNote: -1, scoreK: 1, stampT: -1, impact: false,
  extra: 0, extra2: 0, bandPop: [0, 0, 0, 0, 0], k: 1, cardTop: 100, cardH: 540, fired: 0, cer: false,   // cer: an unlock ceremony is due
  gemS: 0,                                  // tonight's gems sticker (pop spring)
  cardHu: 540,                              // the card's unscaled height (card.h, + card.two with a second highlight line)
  cleared: false, closed: false, warm: 0,   // cleared: play's leftover particles dropped; closed: the CLOSED stamp landed
  began: false, faded: false,               // began: the first update ran (the switch); faded: entered under a 'fade'
  gold: false,                              // the Go for Gold button is offered (a passed campaign night short of Gold)
};
// st.fired bits: 1 header, 2..32 band minis, 64 highlight, 128 buttons shown, 256 ceremony started, 512 first stinger fired,
// 1024 second highlight
// uc.sting: s since the current member's unlock stinger fired (-1 = none yet: openUnlock fires it), uc.rt: s since its
// reveal (-1 = not yet)
const uc = { on: false, i: 0, t: 0, a: 0, actor: null, sp: '', hop: 0, popK: 0, out: false, outT: 0, list: null, sting: -1, rt: -1 };
let P = null, O = null, tier = 'rope', mode = 'night', scoreStrs = [], bandSpecs = {}, prepared = null, prepToken = 0;
let scrimG = null, scrimH = -1, bgG = null;
let extraStr = '', extraIcon = 'star', headStr = '', headW = 160, headX = 195, tierName = '', ribW = 200, primaryParams = null, raysKey = '';
// the highlight as a flat caption ('note': a quiet note in cream 70 %, 'goal': the Rope Holder's pass target) or '' (a pill)
let extraFlat = '';
// the second highlight line (always a reward pill) or ''; chipN = lines offered (0..2); chipW = each pill's width
let extra2Str = '', chipN = 0;
const chipW = [0, 0];
let primaryFresh = false;    // the primary is a campaign Again: its seed is dealt (retrySeed) when it is tapped
// what the seal slot shows: 'seal' (a tier seal), 'shut' (the Shut Down seal + CLOSED), 'medal' (the All-Nighter moon medal);
// ribbonStr / ribCol: the one line under it (the tier name, or the All-Nighter's best); best: the All-Nighter set a record
let look = 'seal', ribbonStr = '', ribCol = '#ffc93c', best = false, closedStr = '';
const plus = [], prog = [], barK = [0, 0, 0, 0, 0], barCol = ['', '', '', '', ''], barMax = [false, false, false, false, false];
for (let i = 0; i < 5; i++) {
  plus.push(createLabel(60, 24, { size: 16, weight: 800, color: '#fff4d6', outline: UI_INK, outlineWidth: 4 }));
  prog.push({ stage: 'join', count: 0, need: 3, unlocked: false, total: 0, looks: 0, looksMax: 6, look: '' });
}
// one display face (GAME-SPEC §5): Baloo 2 (Arabic in Cairo); the section header in Baloo 800 with an ink outline
const lbl = {
  line: createLabel(330, 26, { size: 16.5, weight: 700, color: '#ffe2b8' }),
  band: createLabel(240, 24, { size: 14.5, weight: 800, color: UI_ACCENT.lilac, outline: UI_INK, outlineWidth: 3.5 }),
  ucTitle: createLabel(360, 56, { size: 34, weight: 800, color: '#ffd166', outline: UI_INK, outlineWidth: 9, shadow: true }),
  ucName: createLabel(340, 34, { size: 22, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 6 }),
  ucInst: createLabel(300, 28, { size: 17, weight: 800, color: '#ffe2b8', outline: UI_INK, outlineWidth: 4.5 }),
  flat: createLabel(TUNE.flat.maxW + 8, 26, { size: TUNE.flat.size, weight: 700, color: TUNE.flat.note }),   // the flat highlight caption
};
// the flat caption's glyph + the measured width of its text (flatOpts, at setup)
const FLAT_O = { color: '#fff4dc', alpha: 1 };
let flatTW = 0;
function flatOpts() {
  const F = TUNE.flat, goal = extraFlat === 'goal';
  lbl.flat.set(extraFlat ? extraStr : '').tint(goal ? F.goal : F.note);
  FLAT_O.color = goal ? F.goalGlyph : F.note;
  flatTW = extraFlat ? Math.min(F.maxW, measure(extraStr, F.size, 700)) : 0;
}
// glyph + text centred as a group on (0, 0), the glyph on the leading side (right in Arabic); a note in cream at noteA
function drawFlat(ctx) {
  const F = TUNE.flat, a = extraFlat === 'goal' ? 1 : F.noteA, total = F.glyph + F.gap + flatTW, left = -total / 2, rtl = i18n.isRTL;
  const gx = rtl ? left + flatTW + F.gap + F.glyph / 2 : left + F.glyph / 2, tx = rtl ? left + flatTW / 2 : left + F.glyph + F.gap + flatTW / 2;
  FLAT_O.alpha = a;
  drawGlyph(ctx, extraIcon, gx, 0, F.glyph, FLAT_O);
  lbl.flat.draw(ctx, tx, 1, a);
}
const ucHint = createTag(300, 42, { size: 17 });
const panel = createPanel(TUNE.card.color, { radius: 30, inner: 'rgba(255,209,102,0.22)' });
const toast = createToast();
const btns = createButtons();
const BT0 = TUNE.buttons;
const B = {
  primary: btns.add({ id: 'primary', x: 195, y: 700, w: BT0.primaryW, h: BT0.primaryH, icon: 'next', label: '', onTap: tapPrimary }),
  share: btns.add({ id: 'share', x: 76, y: 790, w: BT0.rowW, h: BT0.rowH, secondary: true, iconColor: BT0.shareIcon, icon: 'share', label: '', size: BT0.rowFont, onTap: tapShare }),
  challenge: btns.add({ id: 'challenge', x: 195, y: 790, w: BT0.rowW, h: BT0.rowH, secondary: true, iconColor: BT0.challengeIcon, icon: 'trophy', label: '', size: BT0.rowFont, onTap: tapChallenge }),
  gold: btns.add({ id: 'gold', x: 314, y: 790, w: BT0.rowW, h: BT0.rowH, secondary: true, iconColor: BT0.goldIcon, icon: 'retry', label: '', size: BT0.rowFont, hidden: true, onTap: tapGold }),
  home: btns.add({ id: 'home', kind: 'icon', x: BT0.homeX, y: 60, w: BT0.home, secondary: true, icon: 'home', onTap: tapHome }),
};
const ROW = [B.share, B.challenge, B.gold];
// ---- the wallet on the result: the reward (wallet.onResult, kept on params.__reward), its chips, the VIP card
const RW = { gems: 0, vipBonus: 0, vipMiss: 0, piggy: 0, gemStr: '', pigStr: '' };
const gemLbl = createLabel(72, 30, { size: 19, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 5 });
const pigLbl = createLabel(56, 24, { size: 14, weight: 800, color: '#ffffff', outline: UI_INK, outlineWidth: 4 });
const vipTxt = createWrap(TUNE.vip.text, 40, { size: 13, weight: 800, color: '#fff4dc', lines: 2, align: 'left' });
const vc = { on: false, s: 0, shown: false, out: false, at: 0, y: 0 };      // on: offered on this result; s: slide 0..1
const GEM_PILL = { color: '#1f1c52', textColor: '#ffffff', icon: '' }, PIG_PILL = { color: '#3b2a6e', textColor: '#ffffff', icon: '' };
const X2_BADGE = { color: '#ffc93c', textColor: '#6a3f00' };
const SP_GEM = { to: 1, stiffness: 300, damping: 11, velocity: 3 };
const SP_VIP = { to: 1, stiffness: 240, damping: 20 }, SP_VIP0 = { to: 0, stiffness: 400, damping: 30 };
B.vipSee = btns.add({ id: 'vipSee', x: 300, y: 600, w: TUNE.vip.see, h: TUNE.vip.seeH, label: '', size: 15, hidden: true, onTap: tapVip });
B.vipX = btns.add({ id: 'vipX', kind: 'icon', x: 360, y: 580, w: 28, secondary: true, icon: 'close', hidden: true, onTap: tapVipX });
const VIP_PANEL = createPanel('#16131f', { radius: 20, inner: 'rgba(226,176,79,0.5)' });
function tapVip() {
  if (scenes.transitioning) return;
  scenes.push('shop', { tab: 'deals', sheet: 'mb_vip_rope', from: 'result' });
}
function tapVipX() {
  if (vc.out) return;
  vc.out = true;
  wallet.offerDismissed('vip');
  spring(vc, 's', SP_VIP0);
  B.vipSee.hidden = true; B.vipX.hidden = true;
}
// the width icons.drawButton needs to show `str` + its glyph at font `fs` without shrinking (its content box, mirrored)
function needW(str, fs) { return measure(str, fs) + Math.max(2.5, fs * 0.2) + fs * 1.42 + TUNE.buttons.rowPad; }
// sizes the bottom row to its labels in this language: one font for all (rowFont, lowered only when the row would not
// fit). Two buttons (Share, Challenge): equal widths. Three (+ Go for Gold): each sized to its own label inside rowTotal3,
// so the longest label sets no width for the others; when the three do not fit at rowFont, Challenge drops its label
// (its trophy alone on an iconW face) first. The spare width is shared out evenly, up to rowMaxW (an icon-only face keeps
// iconW). Call it after the labels are set (setup).
const NEED = [0, 0, 0];
function rowNeed(i, fs) { const b = ROW[i]; return b.label ? Math.max(TUNE.buttons.rowMinW, needW(b.label, fs)) : TUNE.buttons.iconW; }
function sizeRow() {
  const BT = TUNE.buttons, n = B.gold.hidden ? 2 : 3, gap = n === 3 ? BT.rowGap3 : BT.rowGap;
  const avail = (n === 3 ? BT.rowTotal3 : BT.rowTotal) - (n - 1) * gap;
  let fs = BT.rowFont, sum = 0;
  if (n === 3) {
    for (let i = 0; i < n; i++) sum += rowNeed(i, fs);
    if (sum > avail) B.challenge.label = '';
  }
  let pad = 0, fixed = 0;
  for (let i = 0; i < n; i++) { if (ROW[i].label) pad += BT.rowPad; else fixed += BT.iconW; }
  for (let pass = 0; pass < 2; pass++) {
    sum = 0;
    for (let i = 0; i < n; i++) { NEED[i] = rowNeed(i, fs); sum += NEED[i]; }
    if (n === 2) { NEED[0] = NEED[1] = Math.max(NEED[0], NEED[1]); sum = 2 * NEED[0]; }
    if (sum <= avail || pass === 1) break;
    fs = Math.max(BT.rowFontMin, Math.floor(fs * (avail - pad - fixed) / (sum - pad - fixed) * 2) / 2);
  }
  const grow = n - (fixed > 0 ? 1 : 0);
  let k = 1, extra = (avail - sum) / grow;
  if (extra < 0) { k = avail / sum; extra = 0; }
  for (let i = 0; i < n; i++) ROW[i].w = ROW[i].label ? 2 * Math.floor(Math.min(BT.rowMaxW, NEED[i] * k + extra) / 2) : 2 * Math.floor(NEED[i] * k / 2);
  for (let i = 0; i < ROW.length; i++) ROW[i].size = ROW[i].label ? fs : BT.iconFont;
}

// ---------------------------------------------------------------- the street behind the card
// the play scene's world (still showing tonight's band + LAST CALL); a private one when the result opens without a night
let ownWorld = null;
function backWorld() {
  const ps = scenes.get('play'), w = ps && ps.world ? ps.world : null;
  if (w) return w;
  if (!ownWorld) ownWorld = createWorld({ lobby: false, decor: profile.decorLevel(), band: [], beat: beat });
  return ownWorld;
}
function drawStreet(ctx, w) {
  w.drawBack(ctx);
  w.drawMid(ctx);
  w.drawFront(ctx);
}
// lighter over the party window (down to its sill), the card's level in the middle, heavier under the buttons
function scrimFor(ctx, H, sill) {
  const S = TUNE.scrim, c = 'rgba(' + S.rgb + ',', f = clamp(sill / H, 0.1, 0.6);
  return draw.gradient(ctx, 0, 0, 0, H, [[0, c + S.top + ')'], [f, c + S.top + ')'], [Math.min(0.75, f + 0.12), c + S.mid + ')'], [0.8, c + S.mid + ')'], [1, c + S.bottom + ')']]);
}

// ---------------------------------------------------------------- the 9:16 share card (§8), painted in steps
let cardCv = null;
// the look the band row shows for a species: a member who joined tonight in the look its ceremony showed (memberSpec:
// its house look, as dressed), any other species as tonight's admitted guest of it, else the member as dressed
function joinedTonight(sp) { return !!(O && O.unlocked && O.unlocked.indexOf(sp) >= 0); }
function specOf(sp) { return joinedTonight(sp) ? memberSpec(sp) : (bandSpecs[sp] || memberSpec(sp)); }
function cardSpec(sp) {
  const s = specOf(sp), c = {};
  for (const k in s) c[k] = s[k];                   // its own object: drawMini caches per spec object + size
  return c;
}
const card = { step: -1, at: 0, enc: false };         // step: next paint step (-1 idle / done), at: s when painting may start
const BOOST_GLY = { color: '#ffd166' };
const BOOST_TXT = { size: 11, weight: 800, color: '#ffd166', align: 'right', outline: UI_INK, outlineWidth: 3, maxWidth: 96 };
// the street for the card is copied from the stage canvas right after render() drew it (one GPU blit, instead of
// re-rasterising the whole world at 1080 px): want = asked for by the paint, ok = a fresh copy is in snapCv
const snap = { want: false, ok: false };
let snapCv = null;
function takeSnap() {
  const src = stage.canvas;
  if (!src || !(src.width > 0)) return;
  const w = Math.min(src.width, TUNE.card916.snapW), h = Math.round(src.height * w / src.width);
  if (!snapCv) snapCv = document.createElement('canvas');
  if (snapCv.width !== w || snapCv.height !== h) { snapCv.width = w; snapCv.height = h; }
  const c = snapCv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(src, 0, 0, w, h);
  snap.want = false; snap.ok = true;
}
function cardCtx() {
  if (!cardCv) { cardCv = document.createElement('canvas'); cardCv.width = TUNE.card916.w; cardCv.height = TUNE.card916.h; }
  const c = cardCv.getContext('2d'), k = cardCv.width / 390;
  c.setTransform(k, 0, 0, k, 0, 0);
  return c;
}
// one paint step of the card (each a few ms; rasterisation itself is deferred to the GPU); -> true when the card is complete
function paintStep(n) {
  const c = cardCtx(), k = cardCv.width / 390, H = cardCv.height / k, ar = i18n.isRTL;
  if (n === 0) {
    // the street (cropped to the card's height) under a deeper scrim, or the plain night gradient
    const w = backWorld();
    c.fillStyle = '#0c0b24'; c.fillRect(0, 0, 390, H);
    if (w) {
      if (snap.ok) c.drawImage(snapCv, 0, 0, snapCv.width, Math.min(snapCv.height, snapCv.height * H / stage.h), 0, 0, 390, Math.min(H, stage.h));
      else { c.save(); drawStreet(c, w); c.restore(); }
      c.fillStyle = draw.gradient(c, 0, 0, 0, H, [[0, 'rgba(18,17,58,' + (TUNE.card916.scrim - 0.08) + ')'], [0.5, 'rgba(18,17,58,' + TUNE.card916.scrim + ')'], [1, 'rgba(9,8,30,0.86)']]);
    } else c.fillStyle = draw.gradient(c, 0, 0, 0, H, [[0, '#2f2b6e'], [0.5, '#1b1a4d'], [1, '#0c0b24']]);
    c.fillRect(0, 0, 390, H);
    c.save(); c.globalCompositeOperation = 'lighter';
    if (look === 'shut') draw.glow(c, 195, 290, 220, TUNE.shut.ember, TUNE.shut.emberA);
    else {
      draw.glow(c, 195, 290, 260, TUNE.glow.color, 0.22);
      draw.glow(c, 195, 290, 200, look === 'medal' ? (best ? TUNE.medal.raysBest : TUNE.medal.rays) : TUNE.tierInk[tier], 0.14);
    }
    c.restore();
    return false;
  }
  if (n === 1) {
    // seal (or the All-Nighter medal) on its rays; a Shut Down gets a dark halo and the CLOSED stamp instead
    if (look !== 'shut') {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.32;
      c.translate(195, 276); c.rotate(0.2);
      c.drawImage(draw.cached(raysKey, 360, 360, RAY_BAKE[raysOf()]), -180, -180, 360, 360);
      c.restore();
    } else {
      c.fillStyle = draw.radial(c, 195, 286, 40, 150, [[0, 'rgba(4,3,14,' + TUNE.shut.shadowA + ')'], [1, 'rgba(4,3,14,0)']]);
      c.fillRect(30, 120, 330, 330);
    }
    // the lockup (logo.js) over the rays, lit, its googly eye looking down at the seal (the top-right 100 px of the 1080
    // card stays empty for a facecam: the lockup sits left of x 340 and starts below y 30)
    const L = TUNE.card916.logo, LM = logoMetrics(i18n.lang), lk = Math.min(L.maxW / LM.w, L.maxH / LM.h);
    draw.glow(c, 195, L.y, LM.w * lk * 0.6, '#ff4fa3', 0.2);
    paintLogo(c, 195, L.y, lk, i18n.lang, LOGO_O);
    paintLogoLit(c, 195, L.y, lk, i18n.lang, 1);
    draw.text(c, headStr, 195, L.head, { size: 21, weight: 800, color: '#ffb347', maxWidth: 330, outline: UI_INK, outlineWidth: 5 });
    withBakeRes(k, () => {
      if (look === 'medal') paintMedal(c, 195, 276, 196);
      else drawTierStamp(c, tier, 195, 276, 196, 2);
      if (look === 'shut') drawShutLock(c, 195, 276, 196);
      if (look === 'shut') { c.save(); c.translate(195 + 34, 276 + 46); c.rotate(TUNE.shut.closedRot); drawStampText(c, closedStr, 0, 0, 40, TUNE.shut.closedCol); c.restore(); }
      RIB_O.color = ribCol; RIB_O.textColor = '#fffaf0'; RIB_O.icon = '';
      drawPill(c, 195, 392, Math.max(200, ribW + 20), 42, ribbonStr, RIB_O);
    });
    return false;
  }
  draw.text(c, scoreStrs[scoreStrs.length - 1], 195, 462, { size: 92, color: look === 'shut' ? TUNE.shut.score : '#ffffff', outline: UI_INK, outlineWidth: 13, shadow: 'rgba(0,0,0,0.42)', shadowOffset: 6 });
  draw.text(c, lbl.line.str, 195, 516, { size: 18, weight: 700, color: '#ffe2b8', maxWidth: 340, outline: 'rgba(12,11,36,0.8)', outlineWidth: 4 });
  // the band built tonight
  draw.sticker(c, cc => draw.roundRect(cc, 26, 544, 338, 108, 24), { fill: '#24225a', outline: 'rgba(255,255,255,0.16)', lineWidth: 2, highlight: 0.1, shadow: 0.2 });
  draw.text(c, i18n.t('band'), 195, 563, { size: 14, weight: 800, color: UI_ACCENT.lilac, outline: UI_INK, outlineWidth: 3.5 });
  // a boosted night (a booster or a Reopen was used) says so on the card (MONETIZATION §7.3): bolt + 'Boosters used' in the
  // band panel's outer top corner
  if (P && P.boosted) {
    BOOST_TXT.align = ar ? 'left' : 'right';
    drawGlyph(c, 'bolt', ar ? 42 : 348, 563, 13, BOOST_GLY);
    draw.text(c, i18n.t('boosted'), ar ? 54 : 336, 563, BOOST_TXT);
  }
  const m = k / draw.res();
  for (let i = 0; i < SPECIES.length; i++) {
    const sp = SPECIES[i], n2 = admittedOf(sp), x = 195 + (ar ? 2 - i : i - 2) * 62, L = LINE_C[i];
    measureOne(i);
    c.save(); c.translate(x, 626 + L.dy); c.scale(1 / m, 1 / m);
    drawMini(c, L.spec, 0, 0, L.size * m, n2 > 0 ? 0 : TUNE.miniDim);
    c.restore();
    draw.text(c, n2 > 0 ? 'x' + n2 : '-', x, 640, { size: 14, weight: 800, color: n2 > 0 ? '#fff4d6' : 'rgba(255,255,255,0.32)', outline: UI_INK, outlineWidth: 3 });
  }
  draw.text(c, 'Monster Bouncer · بودي قارد الوحوش', 195, H - 20, { size: 12.5, weight: 700, font: 'Cairo', color: 'rgba(255,255,255,0.3)' });
  return true;
}
function restartCard(atSec) { card.step = 0; card.at = atSec; card.enc = false; prepared = null; prepToken++; snap.ok = false; snap.want = false; }
// runs one paint step per frame once due (recording only: cheap); `now` finishes every remaining step -> true when complete
function pumpCard(now) {
  if (card.step < 0) return true;
  if (!now && st.t < card.at) return false;
  if (!now && card.step === 0 && !snap.ok && backWorld()) { snap.want = true; return false; }   // render() copies the street first
  do {
    const done = paintStep(card.step);
    card.step++;
    if (done) { card.step = -1; return true; }
  } while (now);
  return false;
}
// The JPEG encode rasterises and reads back the whole 1080x1920 card (100+ ms even on a desktop), so it never runs on its
// own: it starts when a finger lands on Share, and the tap shares the File when it is ready by the release, else the
// canvas (share.js encodes that synchronously inside the tap's activation).
function encodeCard() {
  if (card.enc) return;
  pumpCard(true);
  card.enc = true;
  const token = ++prepToken;
  prepared = null;
  prepareCard(cardCv, P).then(f => { if (token === prepToken) prepared = f; });
}

// ---------------------------------------------------------------- band row
// lineup: drawMini normalises every guest into its box, so each species gets the box size that shows it at one common
// scale, and the box centre that stands its feet on the baseline (measured from actor bounds, one species per frame)
const MEASURE_O = { fx: false, still: true };
const LINE_S = [], LINE_C = [];   // per species (SPECIES order): stage row / share card { size, dy, spec, of }
for (let i = 0; i < 5; i++) { LINE_S.push({ size: 58, dy: 0, spec: null, of: null }); LINE_C.push({ size: 52, dy: 0, spec: null, of: null }); }
let lineI = 5;                     // next species to measure (5 = done)
let warmCv = null;
function lineFor(spec, scale, out) {
  const b = createActor(spec, MEASURE_O).bounds();
  out.size = Math.ceil(Math.max(scale * b.h / 0.84, scale * b.w / 0.9));
  const s = Math.min(out.size * 0.84 / b.h, out.size * 0.9 / b.w);
  out.dy = -b.h * s / 2;
  return out;
}
// (re)measures one species when the look shown for it changed, and bakes its row mini ahead of the pop-in
function measureOne(i) {
  const sp = SPECIES[i], src = specOf(sp), S = LINE_S[i], C = LINE_C[i];
  if (S.of !== src) {
    S.of = src; S.spec = src; lineFor(src, TUNE.lineScale, S);
    if (!warmCv) { warmCv = document.createElement('canvas'); warmCv.width = 2; warmCv.height = 2; }
    drawMini(warmCv.getContext('2d'), S.spec, 0, 0, S.size, miniDim(sp));
  }
  if (C.of !== src) { C.of = src; C.spec = cardSpec(sp); C.size = S.size * TUNE.cardLineScale / TUNE.lineScale; C.dy = S.dy * TUNE.cardLineScale / TUNE.lineScale; }
}
// the card's first-draw bakes, one per frame under play's fade (each keyed exactly as render() asks for it later): the
// panel, the seal's socket, the rays, the seal / medal, the CLOSED stamp, the ribbon, the header + highlight pills, the
// buttons' faces, the ceremony's spotlight + theatre when one is due. Nothing then bakes on the frame the seal slams, the
// buttons pop or the overlay opens.
const WARM_N = 16, SOCK_PX = Math.ceil(TUNE.stamp.size * 1.2), MEDAL_PX = Math.ceil(TUNE.stamp.size * 1.12);
function warmCtx() {
  if (!warmCv) { warmCv = document.createElement('canvas'); warmCv.width = 2; warmCv.height = 2; }
  return warmCv.getContext('2d');
}
function warmButton(c, b) {
  const o = WARM_B;
  o.color = b.color || ''; o.textColor = b.textColor || ''; o.icon = b.icon || ''; o.size = b.size || 0; o.rim = b.rim || ''; o.iconColor = b.iconColor || '';
  drawButton(c, 0, 0, b.w, b.h, b.label || '', o);
}
function warmStep(i) {
  const c = warmCtx(), T = TUNE;
  if (i === 0) panel.draw(c, 0, st.cardHu / 2, T.card.w, st.cardHu);
  else if (i === 1) draw.cached('result.socket', SOCK_PX, SOCK_PX, bakeSocket);
  else if (i === 2) { if (look !== 'shut') draw.cached(raysKey, 360, 360, RAY_BAKE[raysOf()]); }
  else if (i === 3) { if (look === 'medal') draw.cached('result.medal', MEDAL_PX, MEDAL_PX, bakeMedal); else drawTierStamp(c, tier, 0, 0, T.stamp.size, 0); }
  else if (i === 4) { if (look === 'shut') { drawStampText(c, closedStr, 0, 0, T.shut.closedSize, T.shut.closedCol); drawShutLock(c, 0, 0, T.stamp.size); } }
  else if (i === 5) { ribbonOpts(); drawPill(c, 0, 0, Math.max(T.socket.ribbonW, ribW), T.socket.ribbonH, ribbonStr, RIB_O); }
  else if (i === 6) { drawPill(c, 0, 0, headW, 40, headStr, HEAD_O); drawChips(c, 1); }
  else if (i === 7) { warmButton(c, B.primary); warmButton(c, B.share); }
  else if (i === 8) { warmButton(c, B.challenge); if (!B.gold.hidden) warmButton(c, B.gold); warmIcon(c, B.home); }
  else if (!st.cer) return;
  // the ceremony's spotlight and theatre, before the overlay opens
  else if (i === 9) coneCv();
  else if (i === 10) stageCv();
  else if (i === 11) drapeCv();
  else if (i === 12) valanceCv();
  else if (i === 13) crowdBCv();
  else if (i === 14) crowdFCv();
  else { draw.cached('result.bulb', 32, 32, bakeBulb); draw.cached('result.bounce', 300, 60, bakeBounce); }
}
const WARM_I = { color: '', rim: '', glyphColor: '' };
function warmIcon(c, b) {
  WARM_I.color = b.color || ''; WARM_I.rim = b.rim || ''; WARM_I.glyphColor = b.glyphColor || '';
  drawIconButton(c, 0, 0, b.w, b.icon, WARM_I);
}
function ribbonOpts() { RIB_O.color = ribCol; RIB_O.textColor = '#fffaf0'; RIB_O.icon = ''; return RIB_O; }
function admittedOf(sp) {
  const a = P && P.admitted ? P.admitted[sp] : 0;
  const n = a && typeof a === 'object' ? a.correct : a;
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
}
// the band row's dim for a species: none when it was let in tonight, else the opaque shadowed 'not tonight' icon
function miniDim(sp) { return admittedOf(sp) > 0 ? 0 : TUNE.miniDim; }
function num(v) { return typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0; }
function cardX(i) { return (i18n.isRTL ? 2 - i : i - 2) * TUNE.miniStep; }

function raysOf() { return look === 'medal' ? (best ? 'best' : 'endless') : tier; }
function setup() {
  const p = P, o = O, lang = i18n.lang;
  mode = p.mode === 'daily' || p.mode === 'endless' ? p.mode : 'night';
  const total = num(p.total), correct = Math.min(num(p.correct), total > 0 ? total : 1e6);
  // an All-Nighter always ends on 3 strikes and has no percentage tier: its slot shows the moon medal and its best
  if (mode === 'endless') tier = tierFor(correct, total, false);
  else tier = TUNE.tierInk[p.tier] ? p.tier : tierFor(correct, total, p.shutEarly === true || num(p.strikes) >= 3);
  const score = mode === 'endless' ? num(p.endlessScore !== undefined && p.endlessScore !== null ? p.endlessScore : correct) : correct;
  scoreStrs.length = 0;
  for (let i = 0; i <= score; i++) scoreStrs.push(mode === 'endless' ? String(i) : i + '/' + total);
  // header
  if (mode === 'daily') { headStr = i18n.t('daily_date', { n: dailyNightNumber(p.date || profile.today()), date: p.date || profile.today() }); HEAD_O.icon = 'calendar'; }
  else if (mode === 'endless') { headStr = i18n.t('endless'); HEAD_O.icon = 'moon'; }
  else { headStr = i18n.t('night', { n: num(p.night) || 1 }); HEAD_O.icon = 'moon'; }
  // clear of the corner Home and of the top-right facecam zone: a long header (the Arabic daily) slides left of centre
  headW = Math.min(TUNE.buttons.headMax, Math.max(150, measure(headStr, 17) + 70));
  headX = Math.min(195, TUNE.buttons.headRight - headW / 2);
  // the seal slot + its one ribbon line (the tier name appears once: the seal carries the title, the ribbon the name)
  tierName = iconLabel(tier);
  best = mode === 'endless' && !!(o && o.newBest);
  if (mode === 'endless') {
    look = 'medal';
    ribbonStr = best ? i18n.t('new_best') : i18n.t('endless_best', { n: Math.max(profile.endlessBest, score) });
    ribCol = best ? TUNE.medal.ribbonBest : TUNE.medal.ribbon;
  } else {
    look = tier === 'shut' ? 'shut' : 'seal';
    ribbonStr = tierName; ribCol = TUNE.tierInk[tier];
  }
  closedStr = i18n.t('closed');
  raysKey = 'result.rays.' + raysOf();
  ribW = measure(ribbonStr, 18) + 40;
  SCORE_O.color = look === 'shut' ? TUNE.shut.score : '#ffffff';
  // the line + band (progress toward a seat in the band, then toward the next look)
  let adm = 0;
  for (let i = 0; i < SPECIES.length; i++) {
    const n = admittedOf(SPECIES[i]), g = prog[i];
    adm += n;
    plus[i].set(n > 0 ? i18n.t('ui.plus', { n: n }) : '-');
    profile.bandProgress(SPECIES[i], g);
    barK[i] = g.need > 0 ? clamp(g.count / g.need, 0, 1) : 0;
    barCol[i] = g.unlocked ? TUNE.bar.look : TUNE.bar.join;
    barMax[i] = g.stage === 'max';
  }
  lineI = 0; st.warm = 0;
  // correct calls on both sides (admitted = correct admits; bounced counts every bounce, so the wrong ones come off), and
  // the guests who walked off waiting when there were any
  const okOut = Math.max(0, num(p.bounced) - num(p.wrongBounces)), missed = num(p.missed);
  if (mode === 'endless') lbl.line.set(plural('sorted', score, lang));
  else if (missed > 0) lbl.line.set(plural('result_line_miss', missed, lang, { a: adm, b: okOut, n: missed }));
  else lbl.line.set(plural('result_line', adm, lang, { a: adm, b: okOut }));
  lbl.band.set(i18n.t('band'));
  // the highlight lines, best first (offer: the first may be a flat caption, a second only ever another reward pill):
  // rewards in brass pills (UI_ACCENT: the result's primary is the amber one, nothing competes with it), a dare in its
  // pill (brass won / indigo tie / velvet lost); a Rope Holder's pass target and the quiet notes (practice, a replay, the
  // standing best) as flat captions, never a button-like pill. The long-tail rewards rank above the quick-call star, so a
  // new decor level or the Daily opening is never crowded out by it
  const A = UI_ACCENT;
  extraStr = ''; extraIcon = 'star'; EXTRA_O.color = A.brass; extraFlat = ''; extra2Str = ''; EXTRA2_O.color = A.brass; chipN = 0;
  const vs = p.vs && typeof p.vs === 'object' && num(p.vs.correct) > 0 ? p.vs : null;
  if (vs) {
    // a challenge link: tonight's score against the friend's
    const theirs = num(vs.correct), vt = num(vs.total), s = mode === 'endless' || !vt ? String(theirs) : theirs + '/' + vt;
    const k = score > theirs ? 'ui.vs_win' : (score === theirs ? 'ui.vs_tie' : 'ui.vs_lose');
    offer(i18n.t(k, { s: s }), 'trophy', score > theirs ? A.brass : (score === theirs ? A.indigo : A.velvet), '');
  }
  // a failed night says what passing takes (Bronze: data.passNeed), the first session's fail included
  if (mode !== 'endless' && tier === 'rope' && total > 0) offer(i18n.t('pass_need', { n: passNeed(total) }), 'check', '', 'goal');
  if (mode === 'daily' && o.streakUp && o.streak) offer(plural('streak', o.streak.count, lang), 'flame', A.brass, '');
  // the Daily Night opened tonight (night profile.tune.dailyAfter passed): the game's daily hook, said out loud once
  if (mode === 'night' && o.advanced && profile.nextNight() === profile.tune.dailyAfter + 1) offer(i18n.t('ui.daily_open'), 'calendar', A.brass, '');
  if (o.decorUp) offer(i18n.t('decor_new', { name: i18n.t('decor_' + o.decor) }), 'star', A.brass, '');
  if (o.unlocked && o.unlocked.length) offer(i18n.t('unlocked'), 'band', A.brass, '');
  if (o.looks && o.looks.length) {
    const lk = o.looks[o.looks.length - 1];
    offer(i18n.t('look_new', { look: i18n.t('look_name', { color: i18n.t('col_' + lk.color), name: i18n.t('sp_' + lk.species) }) }), 'band', A.brass, '');
  }
  // the wallet's one-time rewards tonight: a Star Road step, a Doorman Medal, a streak milestone
  const R = P.__reward;
  if (R && R.roadSteps > 0) {
    const it = R.items && R.items.length ? String(R.items[0]) : '';
    const what = !it ? i18n.t('shop.gems_n', { n: fmtGems(R.lines && R.lines.road ? R.lines.road : 0) })
      : it.indexOf('outfit.') === 0 ? i18n.t('shop.road_set', { name: i18n.t('shop.th.' + it.split('.')[1]) }) : i18n.t('shop.it.' + it);
    offer(i18n.t('shop.res_road', { what: what }), 'star', A.brass, '');
  }
  if (R && R.medals && R.medals.length) offer(i18n.t('shop.res_medal', { name: i18n.t('shop.medal.' + R.medals[0]) }), 'trophy', A.brass, '');
  if (R && R.streakDays > 0) offer(i18n.t('shop.res_streak', { n: R.streakDays }), 'flame', A.brass, '');
  // the quick-call star, earned for the first time on this night / daily (profile.recordNight bonusStars)
  if (num(o.bonusStars) > 0) offer(i18n.t('speed_star'), 'star', A.brass, '');
  if (o.newBest && mode !== 'endless') offer(i18n.t('new_best'), 'trophy', A.brass, '');
  if (chipN === 0) {
    if (o.practice) offer(i18n.t(mode === 'daily' ? 'practice' : 'practice_night'), 'retry', '', 'note');
    else if (mode === 'daily' && !o.first) offer(i18n.t('daily_replay'), 'retry', '', 'note');
    else if (mode === 'night' && tier !== 'shut') {
      // the standing best, only when it is not tonight's own score (a first clear / a tie says nothing new)
      const b = profile.bestNight(num(p.night) || 1);
      if (b && !(b.correct === correct && b.total === total)) offer(i18n.t('best_night', { c: b.correct, t: b.total }), 'trophy', '', 'note');
    }
  }
  EXTRA_O.icon = extraIcon;
  const C2 = chipN === 2, ch = C2 ? TUNE.chipH2 : TUNE.chipH;
  chipW[0] = extraStr && !extraFlat ? pillW(extraStr, ch) : 0;
  chipW[1] = C2 ? pillW(extra2Str, ch) : 0;
  st.cardHu = TUNE.card.h + (C2 ? TUNE.card.two : 0);
  flatOpts();
  // buttons
  const night = num(p.night) || 1, nn = profile.nextNight();
  // a campaign night replayed from here (Again / Go for Gold) deals a fresh queue; a friend's challenge keeps its seed
  const own = mode === 'night' && !vs && !o.practice;
  if ((mode === 'night' && o.practice && o.passed) || mode === 'daily') {
    // a friend's night beyond the frontier, or any daily (its replays earn nothing): on to the player's own campaign
    primaryParams = { mode: 'night', night: nn };
    B.primary.label = i18n.t('play_night', { n: nn }); B.primary.icon = 'play';
  } else if (mode === 'night' && o.passed) {
    primaryParams = { mode: 'night', night: Math.min(night + 1, nn) };
    B.primary.label = i18n.t('next'); B.primary.icon = i18n.isRTL ? 'arrowL' : 'next';   // forward reads right-to-left in Arabic
  } else {
    if (mode === 'endless') primaryParams = { mode: 'endless' };
    else primaryParams = { mode: 'night', night: night, seed: p.seed };
    B.primary.label = i18n.t('retry'); B.primary.icon = 'retry';
  }
  primaryFresh = own && primaryParams.mode === 'night' && primaryParams.night === night && !o.passed;   // Again: dealt at the tap
  // passed but short of Gold: the same night once more, for the Gold Rope (a fresh queue)
  st.gold = own && !!o.passed && tier !== 'gold';
  B.gold.hidden = !st.gold;
  B.share.label = i18n.t('share');
  B.challenge.label = i18n.t('ui.challenge');
  B.gold.label = i18n.t('go_gold');
  B.home.label = i18n.t('home');
  // tonight's gems (+ the VIP x2 badge) and the piggy's share as card stickers; the VIP card's words
  RW.gemStr = '+' + fmtGems(RW.gems); gemLbl.set(RW.gemStr); pigLbl.set('+' + RW.piggy);
  vipTxt.set(i18n.t('shop.vip_more', { n: fmtGems(RW.vipMiss) })).align(i18n.isRTL ? 'right' : 'left');
  B.vipSee.label = i18n.t('shop.see_vip');
  sizeRow();
  ucHint.set(i18n.t('ui.tap_continue'));
  layout();
}
// every Again / Go for Gold is a new queue of the same night's difficulty (home.js retrySeed: hashNight(n) ^ attempt)
const retrySeed = nightRetrySeed;

function layout() {
  const T = TUNE, H = stage.h, base = H - stage.safeBottom, BT = T.buttons, rtl = i18n.isRTL;
  B.primary.y = base - BT.primaryUp;
  // the row, centred as a group, in reading order (mirrored in RTL)
  const ry = base - BT.rowUp, dir = rtl ? -1 : 1, n = B.gold.hidden ? 2 : 3, gap = n === 3 ? BT.rowGap3 : BT.rowGap;
  let total = (n - 1) * gap;
  for (let i = 0; i < n; i++) { ROW[i].y = ry; total += ROW[i].w; }
  let x = -total / 2;
  for (let i = 0; i < n; i++) { const b = ROW[i]; b.x = 195 + dir * (x + b.w / 2); x += b.w + gap; }
  // Home: the round icon in the top-LEFT corner in both languages (as play keeps its pause button): the top-right 100 x 100
  // stays empty for the facecam (GAME-SPEC §4 / §8), at the header pill's height
  B.home.x = BT.homeX; B.home.y = stage.safeTop + 30;
  // the VIP card's slot (when offered) sits between the card and the primary button
  vc.y = B.primary.y - BT.primaryH / 2 - T.card.gapBelow - T.vip.h / 2;
  const bottom = B.primary.y - BT.primaryH / 2 - T.card.gapBelow - (vc.on ? T.vip.h + T.vip.gap : 0), w = backWorld(), win = w ? w.window : null;
  const mid = win ? win.y + win.h * 0.5 : 0, ch = st.cardHu;
  const top = Math.max(stage.safeTop + T.card.top, Math.min(mid, bottom - ch * T.card.minK));
  const avail = bottom - top;
  st.k = Math.min(1, avail / ch);
  st.cardH = ch * st.k;
  st.cardTop = top + Math.max(0, (avail - st.cardH) * 0.5);
  scrimG = null; bgG = null;
  theatreLayout();
}

// card-local -> screen (for particles)
function sx(lx) { return 195 + lx * st.k; }
function sy(ly) { return st.cardTop + st.slide * stage.h + ly * st.k; }

function impact() {
  st.impact = true;
  const T = TUNE.stamp, x = sx(0), y = sy(TUNE.y.stamp);
  party.sfx.stamp();
  camera.addTrauma(T.trauma);
  input.vibrate(look === 'shut' ? [20, 30, 20] : 28);
  if (look === 'shut') {
    // a failure lands heavy and dark: sad trombone, a dust puff, no ring / stars / confetti, no chroma pulse
    party.sfx.tier('shut');
    camera.punch(1.02, 160);
    particles.emit('smoke', x, y + 62 * st.k, OV_DUST);
    return;
  }
  if (look === 'medal') { if (best) party.stinger('gold'); else party.sfx.tier('bronze'); }
  else if (tier === 'gold') party.stinger('gold'); else party.sfx.tier(tier);
  camera.punch(1.035, 180);
  post.pulse(PULSE);
  particles.emit('ring', x, y, OV_RING);
  particles.emit('stars', x, y, OV_STARS);
  if (look === 'medal' ? best : (tier === 'gold' || tier === 'silver')) {
    particles.emit('confetti', 10, y + 40, CONF_L);
    particles.emit('confetti', stage.w - 10, y + 40, CONF_R);
  } else particles.emit('sparkle', x, y, OV_SPARK);
}
// Shut Down: the CLOSED rubber stamp slams across the seal a beat after it lands
function closedImpact() {
  st.closed = true;
  party.sfx.stamp();
  camera.addTrauma(TUNE.shut.trauma);
  input.vibrate(16);
}

// the buttons appear once: after the intro, or after the last unlock overlay closes (never while the scene is leaving)
function showButtons() {
  if (st.fired & 128) return;
  st.fired |= 128;
  if (!st.active || scenes.current !== result) return;
  btns.locked = false;
  btns.popIn(0, 0.07);
  if (card.step >= 0) card.at = st.t + TUNE.card916.after;   // the share card paints once the row has popped in
}
// -> true when the overlay opened (the buttons then wait for its end)
function startCeremony() {
  if (!O || !O.unlocked || !O.unlocked.length) return false;
  if (!st.active || scenes.current !== result || (st.fired & 128)) return false;
  uc.list = O.unlocked; uc.i = 0;
  openUnlock();
  return true;
}
// the unlock stinger: its drum roll leads the reveal by ceremony.lead + reveal (its drop lands on the reveal)
function sting() { uc.sting = 0; party.stinger('unlock'); }
function openUnlock() {
  const sp = uc.list[uc.i];
  uc.on = true; uc.t = 0; uc.out = false; uc.sp = sp; uc.popK = 0; uc.hop = 0; uc.rt = -1;
  uc.actor = createActor(memberSpec(sp));            // the same look the band row shows for it
  uc.actor.setState('cheer');
  btns.locked = true;
  // the overlay covers the card: its confetti goes (never grey squares under the dim), and nothing hangs over the spotlight
  particles.clear('front');
  particles.clear('back');
  if (uc.sting < 0) sting();                         // not fired ahead (a skipped intro): the reveal waits for its drop
  lbl.ucTitle.set(i18n.t('unlocked'));
  lbl.ucName.set(i18n.t('unlock_name', { name: i18n.t('sp_' + sp) }));
  lbl.ucInst.set(i18n.t('plays', { inst: i18n.t(INSTR_KEY[sp]) }));
}
function closeUnlock() {
  if (uc.out) return;
  uc.out = true; uc.t = Math.max(uc.t, TUNE.ceremony.tapAfter);
  uc.outT = 0;
  // another member follows: its stinger rolls under this one's fade
  uc.sting = -1;
  if (uc.list && uc.i + 1 < uc.list.length) sting();
}

// the overlay takes its closing tap from tapAfter, and never sooner than tapAfter - reveal after the member popped in
function tapGap() { const C = TUNE.ceremony; return Math.max(0, C.tapAfter - C.reveal); }
function canTap() { return uc.rt >= tapGap() && uc.t >= TUNE.ceremony.tapAfter; }
// the end of the intro: the ceremony start when one is due, else the buttons
function introEnd() { return st.cer ? TUNE.tl.unlock : TUNE.tl.buttons; }
function skipIntro() {
  const end = introEnd();
  if (st.t >= end) return;
  st.skipping = true;
  st.t = end - 1e-4;
}

// ---------------------------------------------------------------- buttons
function tapPrimary(b) {
  if (scenes.transitioning) return;
  btns.locked = true; st.fired |= 256;
  const p = primaryParams;
  if (p.mode === 'daily') { p.startedAt = Date.now(); profile.markDailyStart(p.date, p.startedAt); }
  if (primaryFresh) p.seed = retrySeed(p.night);
  scenes.go('play', p, { transition: 'wipe', ms: 560, x: b.x, y: b.y });
}
// Go for Gold: the same campaign night again, a fresh queue
function tapGold(b) {
  if (scenes.transitioning || !st.gold) return;
  btns.locked = true; st.fired |= 256;
  const n = num(P.night) || 1;
  scenes.go('play', { mode: 'night', night: n, seed: retrySeed(n) }, { transition: 'wipe', ms: 560, x: b.x, y: b.y });
}
function tapHome(b) {
  if (scenes.transitioning) return;
  // the overlay already celebrated tonight's new members: the lobby only hops them in (no second fanfare); left before
  // the overlay ran (the back gesture during the intro), the lobby gives them the full ceremony
  const shown = !st.cer || (st.fired & 256) !== 0;
  btns.locked = true; st.fired |= 256;
  scenes.go('home', { unlocked: O && O.unlocked ? O.unlocked : null, shown: shown }, { transition: 'wipe', ms: 520, x: b.x, y: b.y });
}
function tapShare() {
  const inApp = inAppBrowser();
  pumpCard(true);                                    // a tap before the idle paint finished: complete it now
  shareCanvas(prepared || cardCv, P, i18n.lang).then(how => {
    if (!st.active) return;
    if (inApp && how !== 'shared') toast.show(i18n.t('open_browser'), 3.2);   // in-app webviews drop the card download
    else if (how === 'shared') toast.show(i18n.t('shared'), 1.8, 'check');
    else if (how === 'downloaded') toast.show(i18n.t(shareInfo.copied ? 'saved_copied' : 'downloaded'), 2.4, 'check');
    else if (how === 'copied') toast.show(i18n.t('copied'), 1.8, 'check');
    else if (shareInfo.error !== 'abort') toast.show(i18n.t('share_failed'), 2.2);
  });
}
function tapChallenge() {
  shareChallenge(P, i18n.lang).then(how => {
    if (!st.active) return;
    if (how === 'shared') toast.show(i18n.t('shared'), 1.8, 'check');
    else if (how === 'copied') toast.show(i18n.t('copied'), 1.8, 'check');
    else if (shareInfo.error !== 'abort') toast.show(i18n.t('share_failed'), 2.2);
  });
}

// ---------------------------------------------------------------- scene
export const result = {
  get state() { return st; },
  get outcome() { return O; },
  get params() { return P; },
  get buttons() { return btns; },
  get ceremony() { return uc; },
  // the share card canvas, painted on demand (dev pages / tests read it straight away); encode() starts the JPEG as a
  // Share press does, prepared is the File once it is done
  get card() { pumpCard(true); return cardCv; },
  get prepared() { return prepared; },
  get cardReady() { return card.step < 0; },
  encode() { encodeCard(); },

  enter(p) {
    P = p || {};
    if (!P.__outcome) P.__outcome = profile.recordNight(P);
    O = P.__outcome;
    // the wallet's reward for this night (paid once: economy's profile hook already ran it; this returns the same one)
    if (!P.__reward) P.__reward = wallet.onResult(O, P);
    const R = P.__reward;
    RW.gems = R && R.gems > 0 ? R.gems : 0; RW.vipBonus = R && R.vipBonus > 0 ? R.vipBonus : 0;
    RW.vipMiss = R && R.vipMiss > 0 ? R.vipMiss : 0; RW.piggy = R && R.piggy > 0 ? R.piggy : 0;
    // what VIP would have doubled tonight joins the running total the shop's VIP card shows (once per night's params)
    if (RW.vipMiss > 0 && !P.__vipMissAdded) { P.__vipMissAdded = true; addVipMiss(RW.vipMiss); }
    // the VIP card: after a Gold night when VIP would have doubled something (wallet caps: night 6+, once a day, 5 no's)
    vc.on = RW.vipMiss > 0 && P.tier === 'gold' && P.mode !== 'endless' &&
      wallet.offerDue('vip', { tier: 'gold', night: P.mode === 'night' ? num(P.night) : undefined });
    vc.s = 0; vc.shown = false; vc.out = false; vc.at = 0; st.gemS = 0;
    B.vipSee.hidden = true; B.vipX.hidden = true;
    bandSpecs = P.bandSpecs && typeof P.bandSpecs === 'object' ? P.bandSpecs : {};
    st.active = true; st.t = 0; st.skipping = false; st.slide = 1; st.head = 0; st.count = 0; st.shown = -1; st.lastNote = -1;
    st.scoreK = 1; st.stampT = -1; st.impact = false; st.extra = 0; st.extra2 = 0; st.fired = 0; st.cleared = false; st.closed = false;
    st.began = false; st.faded = false;
    st.cer = !!(O && O.unlocked && O.unlocked.length);
    for (let i = 0; i < 5; i++) st.bandPop[i] = 0;
    uc.on = false; uc.actor = null; uc.a = 0; uc.sting = -1; uc.rt = -1;
    toast.hide();
    btns.reset(); btns.locked = true;                  // live once showButtons pops them in
    for (let i = 0; i < btns.list.length; i++) btns.list[i].pop = 0;
    setup();
    restartCard(1e9);                                  // painted after the buttons pop in (showButtons sets the time)
  },
  exit() {
    st.active = false;
    btns.kill(); tweens.killTarget(st); tweens.killTarget(uc); tweens.killTarget(vc);
    uc.on = false; uc.actor = null;
  },
  // back from the shop (See VIP): VIP bought there takes the card away
  resume() {
    if (vc.on && wallet.vip() && !vc.out) { vc.out = true; spring(vc, 's', SP_VIP0); B.vipSee.hidden = true; B.vipX.hidden = true; }
  },

  update(dt) {
    const T = TUNE, TL = T.tl, E = T.enterFx;
    st.t += dt;
    // a purchase the store delivered while the shop was closed (Ask to Buy approved, a launch delivery): say so here
    if (st.t > 1.5 && scenes.top === result && takeLatePurchase()) toast.show(i18n.t('purchase_arrived'), 2.6, 'check');
    if (!st.began) {
      // the switch: play cuts straight here (the warm flash covers its HUD leaving); entered under a fade instead, the
      // timeline starts at the fade's black point
      st.began = true;
      const tr = scenes.transition;
      if (tr && tr.to === result && tr.kind === 'fade' && tr.t < 0.5) { st.faded = true; st.t = -(0.5 - tr.t) * tr.ms / 1000; }
      else if ((!tr || tr.kind !== 'fade') && !(camera.flashAlpha > 0.01)) {
        // only when the leaving scene did not flash already (play's goResult does: its own amber, or the Shut Down one)
        if (look === 'shut') camera.flash(E.shutFlash, E.shutFlashA, E.flashMs);
        else camera.flash(E.flash, E.flashA, E.flashMs);
      }
    }
    const t = st.t;
    // the street keeps partying under the card (play still drives it during a fade in)
    const ps = scenes.get('play'), w = backWorld();
    if (w && scenes.current === result && !(scenes.transitioning && scenes.previous === ps)) w.update(dt);
    // play's leftover LAST CALL particles (they would rain over the card and its score): faded out over the first
    // `leftover` s and dropped, or dropped at a fade's black point
    if (!st.cleared) {
      if (st.faded ? t >= 0 : t >= E.leftover) { st.cleared = true; particles.clear('front'); particles.clear('back'); }
      else if (!st.faded) { const k = Math.exp(-dt * E.leftoverK); particles.fade('front', k); particles.fade('back', k); }
    }
    // deferred work, one piece per frame: the band-row lineup, then the card's first-draw bakes (warm), then (when due) the
    // share card, so neither enter() nor the first frames of the reveal stall the fade
    if (lineI < 5) measureOne(lineI++);
    else if (st.warm < WARM_N) warmStep(st.warm++);
    else pumpCard(false);
    btns.update(dt);
    toast.update(dt);
    // card slide (outBack) and header
    st.slide = 1 - easeIndex.outBack(clamp((t - T.card.slideAt) / (T.card.slideMs / 1000), 0, 1));
    if (!(st.fired & 1) && t >= TL.header) { st.fired |= 1; spring(st, 'head', SP_HEAD); }
    // score roll on the pitch ladder
    const n = scoreStrs.length - 1, ct = clamp((t - TL.count) / TL.countDur, 0, 1);
    st.count = n * easeIndex.outQuad(ct);
    const shown = Math.floor(st.count + 1e-6);
    if (shown !== st.shown) {
      if (shown > st.shown && shown >= 1 && !st.skipping && t - st.lastNote >= T.ladderGap) { party.ladder(shown); st.lastNote = t; st.scoreK = 1.08; spring(st, 'scoreK', SP_KICK); }
      st.shown = shown;
    }
    // seal
    if (t >= TL.stamp) {
      st.stampT = t - TL.stamp;
      if (!st.impact && st.stampT >= T.stamp.impact) impact();
      if (look === 'shut' && !st.closed && st.stampT >= T.stamp.impact + T.shut.closedAt) closedImpact();
    }
    // band row + highlight + buttons
    for (let i = 0; i < 5; i++) if (!(st.fired & (2 << i)) && t >= TL.band + i * TL.bandStep) { st.fired |= 2 << i; measureOne(i); spring(st.bandPop, String(i), SP_POP); }
    if (!(st.fired & 64) && t >= TL.extra) { st.fired |= 64; if (extraStr) spring(st, 'extra', SP_POP); }
    if (!(st.fired & 1024) && t >= TL.extra + TL.extra2) { st.fired |= 1024; if (chipN === 2) spring(st, 'extra2', SP_POP); }
    // tonight's gems sticker (2048), then the VIP card once the buttons are in (never over the unlock overlay)
    if (!(st.fired & 2048) && t >= T.gem.at) { st.fired |= 2048; if (RW.gems > 0 || RW.piggy > 0) { spring(st, 'gemS', SP_GEM); if (!st.skipping) party.sfx.nice(10); } }
    if (vc.on && !vc.shown && (st.fired & 128) && !uc.on && scenes.top === result) {
      if (!vc.at) vc.at = t + T.vip.after;
      else if (t >= vc.at) {
        vc.shown = true;
        wallet.offerShown('vip');
        spring(vc, 's', SP_VIP);
        B.vipSee.hidden = false; B.vipX.hidden = false; B.vipSee.pop = 0; B.vipX.pop = 0;
        spring(B.vipSee, 'pop', SP_POP); spring(B.vipX, 'pop', SP_POP);
      }
    }
    if (vc.on) {
      const V = T.vip, side = i18n.isRTL ? -1 : 1, off = (1 - clamp(vc.s, 0, 1)) * 420 * side;
      B.vipSee.x = 195 + off + side * (V.w / 2 - 22 - V.see / 2); B.vipSee.y = vc.y;
      B.vipX.x = 195 + off + side * (V.w / 2 - 4); B.vipX.y = vc.y - V.h / 2 + 4;
    }
    if (uc.sting >= 0) uc.sting += dt;
    if (st.cer) {
      // a new member: its stinger rolls in under the card's last beat (ceremony.lead ahead), its overlay runs first, the
      // buttons pop in when the last one closes
      if (!(st.fired & 512) && t >= TL.unlock - T.ceremony.lead) { st.fired |= 512; if (scenes.current === result && !(st.fired & 128)) sting(); }
      if (!(st.fired & 256) && t >= TL.unlock) { st.fired |= 256; if (!startCeremony()) showButtons(); }
    } else if (!(st.fired & 128) && t >= TL.buttons) showButtons();
    st.skipping = false;
    // unlock ceremony
    if (uc.on) {
      const C = T.ceremony;
      uc.t += dt;
      if (uc.rt >= 0) uc.rt += dt;
      if (uc.actor) uc.actor.update(dt);
      if (uc.out) {
        uc.outT += dt;
        uc.a = Math.max(0, 1 - uc.outT / C.fade);
        particles.fade('front', Math.exp(-dt * 10));   // its confetti leaves with it: none falls over the card's score
        if (uc.outT >= C.fade) {
          uc.i++;
          if (uc.list && uc.i < uc.list.length) openUnlock();
          else { uc.on = false; uc.actor = null; particles.clear('front'); showButtons(); }
        }
      } else uc.a = Math.min(1, uc.t / 0.25);
      // the reveal lands on the stinger's drop (lead + reveal after it fired)
      if (uc.rt < 0 && !uc.out && uc.sting >= C.lead + C.reveal) {
        uc.rt = 0;
        uc.popK = 0.01; spring(uc, 'popK', SP_ACTOR);
        party.sfx.voice(uc.sp);
        const y = TH.feet;
        particles.emit('sparkle', 195, y - 70, OV_SPARK);
        // confetti rains from above the spotlight's edges, past the newcomer's face (never bursting out of it)
        particles.emit('confetti', 195 - C.rainDx, y - C.rainUp, RAIN);
        particles.emit('confetti', 195 + C.rainDx, y - C.rainUp, RAIN);
        camera.punch(1.04, 200);
        post.pulse(PULSE);
      }
      const hopT = uc.rt, hops = C.hops * C.hopDur;
      if (hopT > 0 && hopT < hops) { const u = (hopT % C.hopDur) / C.hopDur; uc.hop = C.hopH * 4 * u * (1 - u) * (1 - 0.25 * Math.floor(hopT / C.hopDur)); }
      else uc.hop = 0;
      if (uc.actor && hopT >= hops && uc.actor.state !== 'dance') uc.actor.setState('dance', DANCE_O);
    }
    if (scrimH !== stage.h) layout();
  },

  render(ctx) {
    const W = stage.w, H = stage.h, T = TUNE, t = st.t;
    // the street, dimmed (the scrim settles in as the card rises), and the warm light behind the seal
    const w = backWorld();
    if (w) { drawStreet(ctx, w); if (snap.want) takeSnap(); }
    else {
      if (!bgG) bgG = draw.gradient(ctx, 0, 0, 0, H, T.bgNoWorld);
      ctx.fillStyle = bgG; ctx.fillRect(-30, -30, W + 60, H + 60);
    }
    if (!scrimG || scrimH !== H) { scrimG = scrimFor(ctx, H, w ? w.window.y + w.window.h : H * 0.3); scrimH = H; }
    const shut = look === 'shut', stT = st.stampT;
    ctx.save();
    ctx.globalAlpha = easeIndex.outQuad(clamp(t / T.scrim.fadeIn, 0, 1));
    ctx.fillStyle = scrimG; ctx.fillRect(-30, -30, W + 60, H + 60);
    // a Shut Down: the lights go out on the street a little more once the seal lands
    if (shut && stT >= 0) { ctx.globalAlpha = T.shut.scrimA * clamp(stT / 0.4, 0, 1); ctx.fillStyle = '#05040f'; ctx.fillRect(-30, -30, W + 60, H + 60); }
    ctx.restore();
    // the unlock ceremony hides the card (it fades out under the dim, so nothing of it shows through the spotlight)
    const cardA = uc.on ? 1 - clamp(uc.a, 0, 1) : 1;
    if (cardA > 0.01) drawCard(ctx, cardA);
    drawVip(ctx);
    btns.draw(ctx, t);
    toast.draw(ctx, 195, stage.safeTop + 30);
    if (uc.on) drawCeremony(ctx);
  },

  // the browser / Android back (main.js): closes the unlock overlay, else heads home like the Home button
  onBack() {
    if (uc.on) { if (canTap()) closeUnlock(); return true; }
    if (!scenes.transitioning) tapHome(B.home);
    return true;
  },

  onInput(evt, d) {
    if (uc.on) {
      if (evt === 'down' && canTap()) { closeUnlock(); party.sfx.plate(); }
      return true;
    }
    if (st.t < introEnd()) { if (evt === 'down') skipIntro(); return true; }
    if (!(st.fired & 128)) return true;                // the ceremony is about to open: nothing to press yet
    if (evt === 'down' && !btns.locked && btns.hit(d.x, d.y) === B.share) encodeCard();   // the encode runs while the finger is down
    return btns.onInput(evt, d);
  },
};

// the card + its seal light (render): faded by cardA (the unlock ceremony hides it)
function drawCard(ctx, cardA) {
  const H = stage.h, T = TUNE, Y = T.y, t = st.t, shut = look === 'shut', S = T.stamp, stT = st.stampT;
  const sealY = st.cardTop + st.slide * H + Y.stamp * st.k, rise = clamp(1 - st.slide, 0, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = cardA;
  if (shut) { if (stT >= 0) draw.glow(ctx, 195, sealY, T.glow.r * 0.75, T.shut.ember, T.shut.emberA * clamp(stT / 0.3, 0, 1)); }
  else {
    draw.glow(ctx, 195, sealY, T.glow.r, T.glow.color, T.glow.a * rise);
    if (stT >= 0) draw.glow(ctx, 195, sealY, T.glow.r * 0.8, look === 'medal' ? (best ? T.medal.raysBest : T.medal.rays) : T.tierInk[tier], T.glow.tierA * clamp(stT / 0.3, 0, 1));
  }
  ctx.restore();
  // the card, pass 1: the panel, the seal's empty socket + the ribbon slot, the rays
  const k = st.k, top = st.cardTop + st.slide * H;
  ctx.save();
  ctx.globalAlpha = cardA;
  ctx.translate(195, top); ctx.scale(k, k);
  panel.draw(ctx, 0, st.cardHu / 2, T.card.w, st.cardHu);
  const e = stT >= 0 ? easeIndex.outBack(clamp(stT / S.slam, 0, 1)) : 0, vis = stT >= 0 ? clamp(stT / 0.06, 0, 1) : 0;
  const rk = stT >= 0 ? clamp((stT - S.impact) / 0.25, 0, 1) : 0;
  SPR.anchor = AN_C; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.scale = 1;
  if (vis < 1) {
    SPR.alpha = T.socket.a * (1 - vis);
    draw.sprite(ctx, draw.cached('result.socket', SOCK_PX, SOCK_PX, bakeSocket), 0, Y.stamp, SPR);
  }
  if (rk < 1) {
    ctx.fillStyle = 'rgba(8,6,28,' + (0.32 * (1 - rk)).toFixed(3) + ')';
    draw.roundRect(ctx, -T.socket.ribbonW / 2, Y.ribbon - T.socket.ribbonH / 2, T.socket.ribbonW, T.socket.ribbonH, T.socket.ribbonH / 2); ctx.fill();
  }
  if (stT >= 0 && !shut) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-T.card.w / 2 + 8, 8, T.card.w - 16, st.cardHu - 16); ctx.clip();   // inside the brass rim
    ctx.globalCompositeOperation = 'lighter';
    SPR.scale = (2 * S.raysR / 360) * (0.6 + 0.4 * e); SPR.rot = t * S.raysSpin; SPR.alpha = S.raysA * vis;
    draw.sprite(ctx, draw.cached(raysKey, 360, 360, RAY_BAKE[raysOf()]), 0, Y.stamp, SPR);
    ctx.restore();
  } else if (stT >= 0) {
    // the Shut Down seal sits in a dark halo instead of rays
    SPR.scale = 1.25; SPR.rot = 0; SPR.alpha = T.shut.shadowA * vis;
    draw.sprite(ctx, draw.cached('result.socket', SOCK_PX, SOCK_PX, bakeSocket), 0, Y.stamp + 4, SPR);
  }
  ctx.restore();
  // the card's confetti / dust (back layer): over the panel, under the seal and the score
  particles.draw(ctx, 'back');
  // the card, pass 2: seal, ribbon, score, line, band row, highlight
  ctx.save();
  ctx.globalAlpha = cardA;
  ctx.translate(195, top); ctx.scale(k, k);
  if (stT >= 0) {
    ctx.save();
    ctx.translate(0, Y.stamp);
    ctx.rotate((1 - e) * S.rot);
    const sc = lerp(S.from, 1, e);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= vis;
    if (look === 'medal') {
      SPR.scale = 1; SPR.rot = A_TILT; SPR.alpha = 1;
      draw.sprite(ctx, draw.cached('result.medal', MEDAL_PX, MEDAL_PX, bakeMedal), 0, 0, SPR);
    } else {
      drawTierStamp(ctx, tier, 0, 0, S.size, t);
      if (shut) drawShutLock(ctx, 0, 0, S.size);
    }
    ctx.restore();
    // CLOSED, slammed across the Shut Down seal
    if (shut && st.closed) {
      ctx.save(); ctx.translate(T.shut.closedX, Y.stamp + T.shut.closedY); ctx.rotate(T.shut.closedRot);
      drawStampText(ctx, closedStr, 0, 0, T.shut.closedSize, T.shut.closedCol, stT - S.impact - T.shut.closedAt);
      ctx.restore();
    }
    // ribbon
    if (rk > 0) {
      ribbonOpts();
      ctx.save(); ctx.translate(0, Y.ribbon); const rs = easeIndex.outBack(rk); ctx.scale(rs, rs);
      drawPill(ctx, 0, 0, Math.max(T.socket.ribbonW, ribW), T.socket.ribbonH, ribbonStr, RIB_O);
      ctx.restore();
    }
  }
  // score
  if (t >= T.tl.count - 0.1) {
    const s = st.scoreK, i = clamp(Math.floor(st.count + 1e-6), 0, scoreStrs.length - 1);
    ctx.save(); ctx.translate(0, Y.score); if (s !== 1) ctx.scale(s, s);
    ctx.globalAlpha *= clamp((t - T.tl.count + 0.1) / 0.2, 0, 1);
    draw.text(ctx, scoreStrs[i], 0, 0, SCORE_O);
    ctx.restore();
    lbl.line.draw(ctx, 0, Y.line, clamp((t - T.tl.count - 0.3) / 0.3, 0, 1));
  }
  // band row
  const bp0 = st.bandPop[0];
  if (bp0 > 0.01) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-140, Y.rule, 280, 1.5);
    lbl.band.draw(ctx, 0, Y.band, clamp(bp0, 0, 1));
  }
  const BR = T.bar;
  for (let i = 0; i < 5; i++) {
    const s = st.bandPop[i];
    if (s <= 0.01) continue;
    const sp = SPECIES[i], x = cardX(i), on = admittedOf(sp) > 0, L = LINE_S[i], a = clamp(s, 0, 1);
    draw.shadowBlob(ctx, x, Y.base + 1, 20 * s, 4.5 * s, on ? 0.4 : 0.25);
    ctx.save(); ctx.translate(x, Y.base); ctx.scale(s, s);
    drawMini(ctx, L.spec, 0, L.dy, L.size, on ? 0 : TUNE.miniDim);   // not tonight: the opaque shadowed icon, no alpha
    ctx.restore();
    plus[i].draw(ctx, x, Y.plus, on ? a : 0.4 * a);
    // progress: mint toward a seat in the band, gold toward the member's next look (a star once every look is in)
    if (barMax[i]) { STAR_O.alpha = a; drawGlyph(ctx, 'star', x, Y.bar, BR.star, STAR_O); continue; }
    const bw = BR.w * a, bx = x - bw / 2;
    ctx.fillStyle = BR.off; draw.roundRect(ctx, bx, Y.bar - BR.h / 2, bw, BR.h, BR.h / 2); ctx.fill();
    const fw = bw * barK[i];
    if (fw > 1) {
      ctx.fillStyle = barCol[i];
      draw.roundRect(ctx, i18n.isRTL ? bx + bw - fw : bx, Y.bar - BR.h / 2, Math.max(BR.h, fw), BR.h, BR.h / 2); ctx.fill();
    }
  }
  drawChips(ctx, 0);
  if (st.gemS > 0.01) drawGemChip(ctx);
  ctx.restore();
  // header pill (a share / challenge toast takes its place while it shows), above any confetti
  if (st.head > 0.01 && !toast.str) {
    ctx.save(); ctx.globalAlpha = cardA; ctx.translate(headX, stage.safeTop + 30); ctx.scale(st.head, st.head);
    drawPill(ctx, 0, 0, headW, 40, headStr, HEAD_O);
    ctx.restore();
  }
}

const DANCE_O = { instrument: true, tempo: 108, phase: 0 };
// tonight's gems on the card's top-left corner (card-local; the top-right stays clear in both languages), a gold 'x2'
// with VIP, the piggy's share under it
function drawGemChip(ctx) {
  const G = TUNE.gem, s = st.gemS;
  ctx.save(); ctx.translate(G.x, G.y); ctx.rotate(G.rot); ctx.scale(s, s);
  if (RW.gems > 0) {
    drawPill(ctx, 0, 0, G.w, G.h, '', GEM_PILL);
    drawGem(ctx, -G.w / 2 + 20, 0, 22, 1, Math.sin(st.t * 2) * 0.08);
    gemLbl.draw(ctx, 11, 1);
    if (RW.vipBonus > 0) drawPill(ctx, G.w / 2 - 6, -G.h / 2 + 1, 36, 20, 'x2', X2_BADGE);
  }
  if (RW.piggy > 0) {
    if (RW.gems > 0) ctx.translate(-6, G.piggyDy);
    drawPill(ctx, 0, 0, G.pigW, G.pigH, '', PIG_PILL);
    drawArt(ctx, 'jar', -G.pigW / 2 + 15, 0, 22);
    pigLbl.draw(ctx, 9, 1);
  }
  ctx.restore();
}
// the VIP card in its slot above the primary button, sliding in from the reading end: crown, the words, See VIP (+ its X)
function drawVip(ctx) {
  if (!vc.on || vc.s <= 0.01) return;
  const V = TUNE.vip, rtl = i18n.isRTL, side = rtl ? -1 : 1, x = 195 + (1 - clamp(vc.s, 0, 1)) * 420 * side, y = vc.y;
  ctx.save(); ctx.globalAlpha *= clamp(vc.s, 0, 1);
  VIP_PANEL.draw(ctx, x, y, V.w, V.h);
  drawArt(ctx, 'crown', x - side * (V.w / 2 - 30), y, 34);
  vipTxt.draw(ctx, x - side * (V.w / 2 - 54), y);
  ctx.restore();
}
// offers a highlight line (setup, best first): the first offer takes line one (a pill, or a flat caption when `flat`), the
// next reward PILL takes line two; a quiet note never takes the second line
function offer(str, icon, col, flat) {
  if (!str) return;
  if (chipN === 0) { extraStr = str; extraIcon = icon; extraFlat = flat; if (!flat) EXTRA_O.color = col || UI_ACCENT.brass; chipN = 1; }
  else if (chipN === 1 && !flat) { extra2Str = str; EXTRA2_O.icon = icon; EXTRA2_O.color = col || UI_ACCENT.brass; chipN = 2; }
}
// a reward pill's width: its text at icons.drawPill's font (h x 0.56) + glyph + the pill's ends, so it never shrinks to fit
function pillW(str, h) {
  const fs = Math.round(h * 0.56);
  return Math.round(clamp(measure(str, fs) + Math.max(2.5, fs * 0.2) + fs * 1.42 + h * 0.6 + 8, TUNE.chipMinW, TUNE.chipMaxW));
}
// the highlight line(s) in card-local space: one at y.extra, two (chipH2 pills) at extraA / extraB; scaled by their pop
// springs (st.extra / st.extra2), or at rest for the warm-up bake
function drawChips(ctx, warm) {
  const Y = TUNE.y, two = chipN === 2, h = two ? TUNE.chipH2 : TUNE.chipH;
  const s1 = warm ? 1 : st.extra, s2 = warm ? 1 : st.extra2;
  if (extraStr && s1 > 0.01) {
    ctx.save(); ctx.translate(0, two ? Y.extraA : Y.extra); ctx.scale(s1, s1);
    if (extraFlat) drawFlat(ctx); else drawPill(ctx, 0, 0, chipW[0], h, extraStr, EXTRA_O);
    ctx.restore();
  }
  if (two && s2 > 0.01) {
    ctx.save(); ctx.translate(0, Y.extraB); ctx.scale(s2, s2);
    drawPill(ctx, 0, 0, chipW[1], h, extra2Str, EXTRA2_O);
    ctx.restore();
  }
}

const AN_T = [0.5, 0], AN_TL = [0, 0], AN_B = [0.5, 1];
// the overlay: the dim, the theatre (stage + floor, then the light: spotlight pool, warm bounce, footlights; then the
// drapes + valance over the cone's edges), the member, the audience rows, the texts, the tag on the apron. Every piece is
// a sprite baked ahead (warmStep), blitted with the shared SPR options.
function drawCeremony(ctx) {
  const W = stage.w, H = stage.h, C = TUNE.ceremony, T = TUNE.theatre, a = uc.a;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * C.dim;
  ctx.fillStyle = C.dimCol; ctx.fillRect(-30, -30, W + 60, H + 60);
  ctx.globalAlpha = a;
  const feet = TH.feet, bt = beat(), bb = bt >= 0 ? bt : uc.t * DANCE_O.tempo / 60;
  SPR.scale = 1; SPR.sx = 1; SPR.sy = 1; SPR.rot = 0; SPR.alpha = 1;
  SPR.anchor = AN_T;
  draw.sprite(ctx, stageCv(), W / 2, feet - T.deckBack, SPR);
  // the light, added: the spotlight with its pool on the deck under the feet, the bounce on the floor, the footlights
  // (one in `chase` bright on each half beat)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const up = 0.55 + 0.45 * clamp(uc.t / 0.5, 0, 1);
  SPR.anchor = CONE_AN; SPR.alpha = up;
  draw.sprite(ctx, coneCv(), W / 2, feet, SPR);
  SPR.anchor = AN_C; SPR.alpha = T.bounceA * up;
  draw.sprite(ctx, draw.cached('result.bounce', 300, 60, bakeBounce), W / 2, TH.apronBot + 16, SPR);
  const ph = Math.floor(bb * 2), bulb = draw.cached('result.bulb', 32, 32, bakeBulb);
  SPR.scale = T.bulbR * 2 / 32;
  for (let i = 0; i < T.hoods; i++) {
    SPR.alpha = (i + ph) % T.chase === 0 ? 0.95 : 0.45;
    draw.sprite(ctx, bulb, W / 2 + (i - (T.hoods - 1) / 2) * T.hoodStep, TH.front - 7, SPR);
  }
  ctx.restore();
  SPR.scale = 1; SPR.alpha = 1; SPR.anchor = AN_TL;
  const dr = drapeCv();
  draw.sprite(ctx, dr, 0, -20, SPR);
  SPR.sx = -1; draw.sprite(ctx, dr, W, -20, SPR); SPR.sx = 1;
  SPR.anchor = AN_T;
  draw.sprite(ctx, valanceCv(), W / 2, -20, SPR);
  if (uc.actor && uc.popK > 0) {
    const s = C.scale * Math.max(0, uc.popK), lift = uc.hop / C.hopH;
    draw.shadowBlob(ctx, W / 2, feet + 2, 62 * s * (1 - 0.3 * lift), 12 * s * (1 - 0.3 * lift), 0.45 * a);
    AO.alpha = 1;
    uc.actor.draw(ctx, W / 2, feet - uc.hop, s, AO);
  }
  // the house: two rows bobbing on alternate beats
  SPR.anchor = AN_B;
  draw.sprite(ctx, crowdBCv(), W / 2, H + 6 - T.bob * Math.abs(Math.cos(bb * Math.PI)), SPR);
  draw.sprite(ctx, crowdFCv(), W / 2, H + 8 - T.bob * Math.abs(Math.sin(bb * Math.PI)), SPR);
  const tt = uc.rt;
  if (tt >= 0) {
    const y0 = Math.max(stage.safeTop + 70, H * 0.17);
    const ts = easeIndex.outBack(clamp(tt / 0.3, 0, 1));
    lbl.ucTitle.draw(ctx, W / 2, y0, a, 1.6 - 0.6 * ts, -0.05);
    lbl.ucName.draw(ctx, W / 2, y0 + 50, a * clamp((tt - 0.15) / 0.25, 0, 1));
    lbl.ucInst.draw(ctx, W / 2, y0 + 80, a * clamp((tt - 0.3) / 0.25, 0, 1));
    // 'Tap to continue': the indigo + brass tag on the stage apron like a plaque, breathing (eases in once the tap is accepted)
    if (canTap() || uc.out) {
      const ht = Math.max(0, Math.min(uc.t - C.tapAfter, tt - tapGap())), k = clamp(ht / 0.25, 0, 1), wave = 0.5 + 0.5 * Math.sin(ht * 4);
      ucHint.draw(ctx, W / 2, TH.apronTop + T.apron / 2 - 2, a * k * (0.78 + 0.22 * wave), (0.9 + 0.1 * easeIndex.outBack(k)) * (1 + 0.02 * wave));
    }
  }
  ctx.restore();
}

stage.onResize(() => { scrimH = -1; });
// a language switch or the bundled fonts arriving redo the texts and repaint the card (straight away once it was shown)
function repaint() { if (st.active && P) { setup(); restartCard(st.fired & 128 ? st.t : 1e9); } }
i18n.onChange(repaint);
draw.ready().then(repaint);
