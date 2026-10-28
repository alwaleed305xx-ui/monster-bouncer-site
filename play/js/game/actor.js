// actor.js: the monster guests of Monster Bouncer (GAME-SPEC §5 art contract + the actor rows of §6). Five sticker species
// (blob, tall, round, square, bean) drawn in code: baked body/feet/mitten/eye/prop sprites (own LRU cache capped at
// TUNE.cache.maxMB, keyed per species, colour, pattern (+ eye layout), dim LEVEL and scale bucket) plus live parts (face,
// arms, tall's stilt legs). Each species has its own silhouette, ONE wrong detail and a face signature: blob = tiny hat
// knob + gummy one-tooth grin, tall = stilt legs on mismatched feet (clown shoe vs tiny foot) + mismatched eyes under one
// cocked brow, round = one horn and a snapped stump + huge eyes over a tiny cat mouth, square = an underbite (a thick lower
// lip jutting past the upper one, two pointed tusks rising from it), bean = one useless angel wing + a crooked smirk with
// two flat buck teeth hanging down. Arms are filled tapered shafts with one elbow (rubber hose; the square gets a crisp
// joint with a ball elbow and block hands) whose outline grows in from the shoulder, so they grow out of the body; the
// elbow bows outward / down by itself (auto bend) unless a pose keys it (the robot dance). Mittens have a thumb nub and a
// darker palm. Three eyes sit in a full-size triangle / row (or grow on a stalk). Patterns wrap the body (curved stripe
// bands, dots shrinking toward the edge) and leave a soft lighter face patch over the eyes + mouth. Pattern is a rule
// attribute, so its tones are SOLVED per colour for contrast (TUNE.pattern): >= 26 CIE L* off the body (light stripes
// +30), each band / dot with a thin darker edge line so it holds at the 0.48 queue dim; lime / mustard (L* > 78) carry dark
// dots + stripes, grape / coral / mint / sky light dots + LIGHT (candy) stripes, and light tones dim less than the body
// down the queue (TUNE.dim.patLight) so the pattern still reads at the back. A FADED actor (alpha < 1) is drawn into a
// pooled offscreen layer and composited once (TUNE.layer), so it fades as one sticker, never as see-through parts. ONE palette
// (COLORS): six hue families spread over CIE L* 45-91 (every pair >= 7 apart), each with its own
// dark birthmark (COLOR_MARKS: heart, leaf, cloud, moon, star, diamond; none fluid, none within one eye radius of any eye
// layout) low on the flank so colour is never hue-only; data.js must carry the same hexes for the poster swatches and
// icons.js should stamp drawColorMark into its colour drop. Cheeks are baked sticker blushes
// in each colour's own tone (white hatch strokes). Door / lamp light is painted as rim bands inside the outline (amber on
// coral / grape; a peach band ramping from the outline to nothing on the light and cool hues, where amber would mix to
// khaki) plus an amber kiss on the outer half of the outline where it faces the door and an amber catch-light on the
// door side of the hat; dimmed queue guests sink into the indigo. A REAL tail carries two solid dark band rings and a dark
// curl tip so it never melts into a same-coloured body, on a stalk TUNE.tail.ext longer than the costume copy's so its curl
// clears the silhouette, the hanging mitten and the rope stanchion (blob / round grow theirs straight out of the back).
// Each species walks its own gait (TUNE.walkSp: blob jelly scoot, tall lope with neck follow-through, round bounce-hop,
// square stiff march, bean hip sway). Props hang on springs: REAL parts follow the body stiffly (k 300 / c 22; the real
// stalk eye stiffer still); FAKE parts (taped googly eye, paper hat, ribbon-tied tail) hang on soft ~0.5 s pendulums, sit
// crooked, over-swing and never settle (a breath-driven sway, TUNE.fakeSway): the game's tell; their drawn swing is
// soft-clamped (TUNE.fakeClamp) so a paper hat wobbles instead of lying flat and a tied-on tail never swings its curl
// behind the body. Standing guests shift their weight on the beat every 0.9-1.4 s while waiting (TUNE.wait.hip*).
// Measured on a 120 Hz dt clock (4 seeds x 5 species, 7 s windows): waiting, fake hats are tilted > 0.12 rad 42-56 % of
// the time (peaks 0.38-0.49), fake tails 61-70 %, real hats stay <= 0.07 rad; walking, fake hats swing 0.15-0.38 rad on
// average (peaks <= 0.6) against 0.002-0.085 for real ones. Pressure rises continuously while a guest waits: from 35 %
// patience the foot taps, speeding up 1 -> 4 Hz over 50-100 % and hitting harder; sleepy (yawns + zzz stickers) from 60 %
// (a yawn never shuts the eyes: lids <= 0.4, pupils showing, a yawn tear, so the eye count stays decidable); a nervous
// sweat drop from 75 %; clearly mad from 80 % (live Z's pop away, puffed pulsing cheeks, red blush, anger vein, white
// sticker steam puffs in pairs on the puff beat, fists on the hips); from 85 % a red flush rises from the chin. While the
// player drags the rope guest the scene calls lean(k): it perks up toward IN (fists up, brows up, big pupils, grin) and
// shrinks and trembles toward OUT (sad brows, small pupils, wobbly mouth). The square's underbite smirk is kept for idle
// / cheer / dance only: bored, its jaw hangs slack and chews; sleepy, it hangs further with a drool glint. Hurt (sad) is its own
// face: wide wet puppy eyes, raised inner brows, a quivering pout, big tears that splat on the feet line (never below).
// Shut eyes (sleep, the blink peak) are a lash "u" on a shaded lid, never a ringed disc. Dances are per species (a drum
// loop on the 8ths with a head-bang, noodle wave, double-time roll, robot keyed poses with right-angle elbows, disco point)
// and grow bigger when the guest is drawn small; in band mode the hands are pinned to the species' instrument (floor toms,
// a long-necked sunburst bass, a synth on an X stand IN FRONT of the round, a short-necked red flying-V, mic) by a
// two-bone solve while the body keeps its groove. The YEET is a high spinning parabola over the queue that leaves the
// screen ~0.5 s after the launch (the body stops drawing once it is off-stage). The cheer throws a wide
// V that locks straight through the air. The fake paper hat is a kid's copy of the party cone folded from newsprint
// (blue-grey, a colour no body part uses, so it never merges with the cream horn / wing): text rows, two soft folds, one
// thick hot-pink crayon zigzag, a single translucent tape strip across the brim seam whose loose end flaps; on the round
// it leans away from the stump, and a googly worn with any hat moves to the forehead (gooH) so stump, eye and hat never
// pile up. Entering a loop state eases out of the previous pose over TUNE.blend.
// Deliberate deviations from GAME-SPEC §5/§6: fake props use k 165 / c 6.4 (the tied-on tail k 150 / c 6) instead of
// k 120 / c 7, a ~0.5 s wobble-wobble-settle that reads as floppy rather than a slow swing; YEET first RIPS every fake
// prop off (BUSTED, TUNE.rip: popped clear of the ducking body, hung a beat for the scene's FAKE! tag, its tape fluttering
// down) and knocks a REAL hat off at the launch (real eyes and real tails are body parts and fly with the body); the yawn runs 900 ms (inhale with the
// head tipped back and the arms stretched overhead / hold with the widest mouth of the set / exhale with a forward nod)
// instead of 700; the shapeshift wobble ramps to full strength in 120 ms and climbs 9 -> 16 Hz into the squash.
// Usage: const a = createActor(guest); a.setState('walk'); a.update(dt) every step; ONCE per frame
// a.draw(ctx, x, feetY, scale, { alpha, dim, flip, light: { door, lamp } }) where (x, feetY) is the ground point between
// the feet (scale 1 ~ 100 design units tall). States: walk idle wait yawn cheer yeet flinch admit dance shift sad sleep.
// Contract notes:
// - One-shots call opts.onDone(actor, false) when they end. setState() during a one-shot cancels it: the pending onDone is
//   called right away as onDone(actor, true) (after the new state is set), so a chain never hangs - check the flag.
// - mutate(attr, value, cb) plays the shapeshift (wobble, squash, pop). If anything interrupts it before the pop, the new
//   attribute pops in at once, so the actor always ends up showing the state data.js judges.
// - yeet: crouch, launch; onDone fires and a.gone turns true at crouch + TUNE.yeet.exit (the scene may move on; the body
//   is still flying); keep drawing until a.finished (the body flies on until it is past a stage edge, detached fake props
//   bounce on the ground). setState('yeet', { dir, rip }): a yeet IS a correct bounce, so unless rip === false every FAKE
//   part tears off right in setState (BUSTED, TUNE.rip: a world-anchored outBack pop away from the throw + puff + scraps,
//   done by the launch frame, a 0.3 s hang, the tape / ribbon end fluttering down as a strip) and a.ripped reports how many (the scene's cue for
//   its tear sfx, the BUSTED stamp and a FAKE! tag pinned on anchor('fake'), which now rides the torn-off part).
// - lean(k): the swipe preview while the player drags this guest (k in [-1, 1], + toward IN, 0 on release; eased inside,
//   reset by any state but idle / wait). The scene still owns the drag offset / tilt; lean only acts it out.
// - admit: crouch, hop + 360 spin; onDone fires at the end of the air phase (the 420 ms ADMIT budget) so the scene flies
//   the guest through the door; setState('admit', { land: true }) lands and settles in place instead.
//   setState('admit', { sneak: true }) is the WRONG-admit variant (TUNE.sneak, same timing contract): no spin / sparkle /
//   stars / blush, a sly crouch and low tiptoe hop leaning in, the face turned back over the shoulder with a wink and a
//   crooked snicker, and every FAKE prop flapping off at the threshold (world-anchored debris drawn over the body, so it
//   tumbles down in the doorway while the guest goes in; also dropped if the scene cuts the admit short); the sly face
//   lingers TUNE.sneak.linger s into the walk inside.
// - Draw each actor once per frame: prop inertia is read from the first draw position of each frame (a second draw in the
//   same frame is ignored for inertia; particles and anchor() follow the latest draw).
// - opts.dim snaps to the nearest TUNE.dim.levels entry (DIM_LEVELS). Call prewarm(guest, slotScales, slotDims) when a
//   guest joins the queue so walking between slots never bakes mid-walk, or prewarmLater(...) for the same work spread
//   over frames (TUNE.cache.warmMs per frame, pumped by actor draws or prewarmPump(ms)): queue a whole night's guests at
//   night start while the poster slams. actorCache() reports the sprite cache (sprites bake at draw.res() capped at
//   TUNE.cache.maxRes 2.5, so a tablet stays near a phone's memory; the cap grows with that res^2 up to capMB; parts in
//   use are re-touched so only unused ones are evicted, evicted canvases are recycled through a small pool, and a resize
//   re-bakes only when the bake res really changed).
// - setBeat(fn) hands in the party beat clock (fn() -> beats, negative when the music is stopped): idle guests bop and
//   dancers dance on it; without it every actor runs on one shared SIM clock advanced by update(dt) (so slow-mo, hit-stop
//   and hand-stepped tests move the groove too), and a crowd updated together always bops together.
// - dance: setState('dance', { tempo, phase, intensity, instrument }); intensity (> 0) overrides the automatic
//   small-on-screen boost; instrument: true = band mode (the party window: the guest grabs its instrument, which pops in
//   over TUNE.inst.grab, and plays it on the beat; bounds() grows to include it). a.instrument reports the mode.
// - anchor(name) -> reused { x, y, angle } in world space from the last draw: 'head' | 'face' | 'center' | 'feet' |
//   'top' (the top of bounds(), hop included) | 'handF' | 'handB' (the palms, angle = forearm direction on screen axes,
//   flip applied) | 'tail' (the curl of the real or tied-on tail, on its spring; else 'center') | 'fake' (the FAKE part:
//   taped googly, else the paper hat's middle, else the tied-on tail's curl; once it came off - the yeet's rip, the sneak's
//   flap - the torn-off part itself while it lasts; else 'head') so the world can hold props and pin tags / rings on the
//   exact part.
// - opts.alpha < 1 (or a ctx.globalAlpha < 1 around draw) fades the actor as ONE sticker through a shared offscreen layer
//   (TUNE.layer); the contact shadow stays a ground decal. drawMini(..., size, dim) bakes an OPAQUE shadowed icon.
// - steadyEyes(on): the scene keeps the judged guest's eyes readable (half blinks only) while the rule has an eyes clause;
//   a 'wait' guest already blinks quick and never shows the shut lash "u" (TUNE.blink).
// - Sprite buckets include 0.4 (the ~40 px party-window band and mini icons): prewarm the lobby / band / collection
//   scales at scene enter (prewarmLater) so they never bake mid-animation.
// drawMini(ctx, guest, x, y, size) draws a cached static icon of the FINAL state (never guest.pre) centred on (x, y); below
// TUNE.mini.crop px it is a head-and-shoulders crop (face centred, hat included) so eyes and hat stay readable.
// PROP_SPRINGS = { real, fake, fakeTail, stalk } (read-only) exposes the spring constants for labels / tests.
// Band outfits (docs/MONETIZATION.md §3.3; see "band outfits" below): spec.outfit = 'outfit.<theme>.<species>' | '<theme>' |
// '' (themes OUTFIT_THEMES: neon royal desert beach space spooky rock); actor.equip(id) changes it live, actor.outfit reads
// it; drawMini honours it; outfitKit(theme) hands world.js the kick drum / keyboard colours; paintOutfitHead(c, theme)
// lends the headwear to cosmetics-art.js (the DJ's theme hat, the owner's portrait). Outfits are cosmetic and only
// ever worn by band dancers (never by a guest in the queue), so the real / fake prop tell is untouched. Every theme carries
// ONE silhouette piece that reads at the ~40 px band size: neon light-up shoulder pads + a jacket that flashes on the beat,
// a tall royal crown + an ermine mantle collar, the desert farwa cloak, a striped beach float ring round the hips, the
// space bubble helmet, the spooky bat collar, rock spiked pauldrons; eyewear is per theme (neon rave paint, monocle,
// goggles pushed up, none at the beach, visor, a bat-wing mask, star shades), never one shared frame.
// COLOR_MARKS (colour -> mark shape) + drawColorMark(ctx, colorKey, x, y, size, fill?, line?) let the poster swatch repeat
// the actor's colour birthmark. probe() also reports sx / sy / skew / armK / eB / eF (elbows), the yeet velocity (vx, vy),
// live Z / steam, hat = the DRAWN hat swing (hatRaw = the spring's lag before the fake clamp), blink = the blink lid now,
// ripped / strips = the yeet's torn-off fakes and their fluttering tape strips.
import { stage } from '../core/stage.js';
import { draw, color } from '../core/draw.js';
import { particles } from '../core/particles.js';
import { camera } from '../core/camera.js';
import { TAU, clamp, lerp, lerpAngle, damp, noise1, smoothstep, easeIndex } from '../core/math.js';

const TUNE = {
  outline: 3, partLine: 2.4, eyeLine: 2.2, mouthLine: 2.8, browLine: 2.8, stalkW: 6.5, browK: 1.38,
  buckets: [0.4, 0.6, 1, 1.4, 2],            // sprite bake scales; an actor drawn at scale s uses the first bucket >= s (0.4: the
                                             // ~40 px party-window dancers and mini icons, so they never downscale a 0.6 bake)
  keep: [0.75, 1.3],                         // ...but keeps its bucket while s stays in this band of it (re-picked when the dim
                                             // level changes), so a walk swaps sprite sets once instead of twice
  // draw-time dim snaps to the nearest level. A dimmed guest sinks toward the night indigo (dark) faster than it greys
  // (desat); whites (eyes, teeth, gloss, paper) drift to `white` by `whiteAt` and only darken by whiteDark of the body's
  // amount; gloss / sticker highlight fades by glossFade at whiteAt. LIGHT dots / stripes dim at only patLight of the body's
  // amount: the pattern is a rule attribute the queue must show, so as the body sinks into the indigo a light pattern keeps
  // its lift and its contrast holds at the back (dimmed with the body it shrank to ~0.6x at the 0.48 slot); DARK patterns
  // (lime / mustard) sink patDark x the body's amount, deeper into the indigo than the light body, for the same reason.
  // Measured |dL*| pattern vs body at the queue dims 0 / 0.15 / 0.3 / 0.48: grape / coral / mint / sky 25-39 rising to
  // 34-41 (was 16-22 at 0.48), lime / mustard 27 held flat (was 17 at 0.48). Past the queue (patFull[0], the back slot) the
  // pattern eases back to the body's own dim by patFull[1], so a deep-shadow guest / a drawMini dim icon stays subdued
  dim: { levels: [0, 0.15, 0.3, 0.48, 0.62, 0.8], desat: 0.45, dark: 0.82, white: '#b8b4d8', whiteAt: 0.62, whiteDark: 0.3,
    glossFade: 0.75, patLight: 0.4, patDark: 1.6, patFull: [0.48, 0.8] },
  // stripes: curved bands that sag ry = rx * sag (follows the body's cross-section); dots: laid out by angle around the body,
  // shrinking (edgeShrink) and squashing (edgeSquash) toward the silhouette edge
  // patch: the face is kept clear of the pattern: an ellipse over the eyes + mouth of the current eye layout (half extents
  // x k / kY + pad) where the pattern shows at only (1 - cover), fading out over `fade` units, tinted `light` lighter
  // pattern TONES are solved per colour for a minimum CIE L* distance from the body (pattern is a rule attribute and has to
  // read at 100 px under the queue dim, where every contrast shrinks to ~0.7x): light bodies (L* > lightL: lime 91,
  // mustard 82) carry DARK dots + stripes (shade toward black, hue kept: light dots measured 1.1:1 on lime and color.dark()
  // of a saturated green stays luminous); every other body gets LIGHT dots (lifted toward white, at least dotLift). Below
  // stripeL (grape 45, coral 55, mint 65, sky 72) the stripes are LIGHT (candy) bands too (desaturated by lightDesat,
  // +lightDL), above it dark bands (color.dark, at least darkK: none of the six since sky went light; its dark bands sank
  // to ~16 L* off the body at the 0.48 queue slot). Every tone is pushed until |dL*| >= minDL (dark stripes / dots) or
  // lightDL (light stripes): the old dark(0.3) bands sat 12-16 L* off coral / grape / mint / sky. Light tones also dim
  // less than the body at the back of the queue (TUNE.dim.patLight).
  // Each band (and dot) carries a thin edge line (edgeW, a darker body tone at edgeA) so it holds at the 0.48 dim.
  pattern: { stripeGap: 15, stripeW: 7, sag: 0.17, dotGap: 15, dotRow: 13, dotR: 3.9, edgeShrink: 0.32, edgeSquash: 0.4, vShrink: 0.25,
    lightL: 78, stripeL: 76, minDL: 26, lightDL: 30, lightDesat: 0.15, dotLift: 0.71, darkK: 0.45, darkShade: 0.3, maxL: 97,
    edgeW: 1.25, dotEdgeW: 0.9, edgeA: 0.85, edgeDark: 0.42, edgeDarkLight: 0.5,
    patch: { k: 1.12, kY: 1.06, pad: 3.5, fade: 6, cover: 0.8, light: 0.06 } },
  // the per-colour birthmark (colourblind second cue, see COLOR_MARKS): a dark fill (shade -darkLight on light bodies, so it
  // stays darker than their dark pattern) over a pale halo (edge); line = halo width per 15 units of mark size
  mark: { dark: 0.5, darkLight: 0.58, edge: 0.5, line: 1.1 },
  // arms: a filled tapered shaft (shoulder / mid / wrist x armW) with one elbow; its outline grows in from nothing at the
  // shoulder (rootIn units inside the fill there), so the arm grows out of the body. elbow = auto bend (rad) at full
  // outward reach (x sp.elbowK): the elbow always bows outward / down; gloss = the highlight's span along the upper arm
  arm: { shoulder: 1.3, mid: 1.0, wrist: 0.8, rootIn: 0.6, elbow: 1.0, wristIn: 0.22, gloss: 0.3, glossW: 0.2 },
  // LRU cap of the sprite bakes (MB of canvas backing store at a bake res === refRes; scales with res^2 up to capMB); maxRes:
  // the bake resolution cap (draw.res() above it bakes at maxRes: tablets, big desktop windows),
  // mini icons kept, and the per-frame bake budget of prewarmLater(). Actors re-touch the parts they hold every
  // touchFrames frames, so a part in use is never the one evicted; evicted canvases are recycled through a pool of up to
  // pool canvases (freed at once beyond that). reRes: a resize re-bakes only when bakeRes() moved by more than this share
  cache: { maxMB: 32, refRes: 2, maxRes: 2.5, capMB: 48, trimTo: 0.75, minis: 96, warmMs: 2, warmGapMs: 4, touchFrames: 30, pool: 40, maxPx: 4096,
    reRes: 0.02 },
  // a FADED actor (opts.alpha, or the ctx's globalAlpha, below `from`) composites as ONE sticker: it is drawn opaque into a
  // pooled offscreen layer, which is then drawn once at the alpha, so its internal overlaps (arms over the body, horn and
  // brow lines, eye whites, the hat over the head) never ghost through. The contact shadow stays a ground decal drawn
  // straight onto the target. pad = [left, top, right, bottom] units kept around bounds() (raised arms, hops, props on
  // springs, the contact lines); fx / deb = the half box kept around each live sticker (Z, steam, tear) and dropped prop
  // (deb: a knocked-off party hat spins about its brim seat, its pom ~44 units away);
  // speed = the yeet speed lines' reach (x the species height); the layer renders at draw.res() x the camera zoom (up to
  // zoomMax) and a box wider than maxPx device px renders at a lower res; grow = the layer's size step (px), so the one
  // canvas reallocates only when a bigger actor than ever before fades
  layer: { from: 0.995, pad: [30, 52, 30, 14], fx: 34, deb: 54, speed: 1.4, zoomMax: 2, maxPx: 1400, grow: 128 },
  clockSync: 0.1,                            // an actor whose clock lags the shared SIM clock by more than this snaps to it
  real: { k: 300, c: 22, max: 6, posK: 0.18, sag: 0, rotK: 0.38 },   // rotK/posK: how much of the lag is drawn
  // fakes: a floppy pendulum of ~0.5 s (wobble-wobble-settle) instead of spec §5's k 120 (0.6 s, read as a slow swing)
  fake: { k: 165, c: 6.4, max: 16, posK: 0.9, sag: 120, rotK: 1.15 },
  fakeTail: { k: 150, c: 6, rotK: 1.9 },     // a ribbon-tied tail hangs looser than the other fakes
  // a FAKE hat / tail never settles: on top of its spring it rocks with the breath (amp rad at hz x idle breathing), so the
  // tell reads even in the gaps between weight shifts; real props get none
  fakeSway: { hat: 0.135, tail: 0.13, hz: 2.1, wob: 0.035, wobHz: 1.37 },
  // the DRAWN swing of a fake is soft-clamped (max x tanh(delta / max)): a paper hat never lies down like a horn, and a
  // tied-on tail swings up toward the body (tailUp) less than down / away (tailDown) and droops by tailBias, so its curl
  // never hides behind the silhouette
  fakeClamp: { hat: 0.6, tailUp: 0.34, tailDown: 0.8, tailBias: -0.1 },
  stalk: { k: 520, c: 38, max: 3, posK: 0.25 },   // the REAL stalk eye: stiff, so it reads still next to a jiggling googly
  googlyMax: 0.62,
  ext: { inertia: 0.55, max: 900, smooth: 22, body: 0.1, sameFrameMs: 3 },   // scene-driven motion: props lag when moved
  sway: { k: 230, c: 14, max: 18, roll: 0.006 },             // nudge() body spring
  squash: { k: 320, c: 12 },
  maxStep: 1 / 90,
  blend: 0.16,                               // s: entering a loop state eases out of the previous pose (no one-frame pop)
  // blinks every min..max s over dur s (double: the chance of a second one right after). The rope guest (state 'wait': the
  // one being judged) blinks quick (waitDur) and its lids stop at waitCap, short of the shut lash "u", so a frozen frame
  // never shows its eyes shut; steadyEyes(true) (the scene, while the rule has an eyes clause) caps them at `steady`
  blink: { min: 2, max: 5, dur: 0.17, double: 0.2, waitDur: 0.09, waitCap: 0.9, steady: 0.45 },
  gaze: { rate: 14, min: 0.9, max: 3.2, center: 0.3, face: 2.2, reach: 50 },
  walk: { open: 0.2, openBob: 0.25 },
  // per-species gait (each species walks its own way; §6's sy ±4 % is the floor, never the norm). hz = steps / s, bob =
  // body bob (x h) per step, lift = foot lift (units), stride, sy / sx = squash peak-to-peak, lean / waddle (rad), sway
  // (units), skew = shear (tall: neck follow-through, bean: hip sway, blob: jelly), lag = follow-through delay (s), hop =
  // bounce height (round: both feet leave the ground), snap = stiff march (outQuad steps, no roll), head = late head bob
  walkSp: {
    blob: { hz: 4.2, bob: 0.018, lift: 0, stride: 3.4, sy: 0.14, sx: 0.1, lean: 0.05, waddle: 0.03, sway: 1.4, skew: 0.07, lag: 0.07, arm: 0.42, hop: 0, snap: 0, head: 0 },
    tall: { hz: 2.4, bob: 0.07, lift: 7, stride: 7.5, sy: 0.08, sx: 0.04, lean: 0.075, waddle: 0.045, sway: 2.6, skew: 0.075, lag: 0.08, arm: 0.62, hop: 0, snap: 0, head: 3.2 },
    round: { hz: 3.6, bob: 0, lift: 4, stride: 4, sy: 0.13, sx: 0.09, lean: 0.06, waddle: 0.07, sway: 2, skew: 0, lag: 0.03, arm: 0.5, hop: 6, snap: 0, head: 0 },
    square: { hz: 3.0, bob: 0.032, lift: 7.5, stride: 5, sy: 0.08, sx: 0.04, lean: 0.035, waddle: 0, sway: 0.6, skew: 0, lag: 0, arm: 0.62, hop: 0, snap: 1, head: 0 },
    bean: { hz: 3.3, bob: 0.042, lift: 5.5, stride: 5, sy: 0.09, sx: 0.05, lean: 0.06, waddle: 0.075, sway: 1.6, skew: 0.12, lag: 0.05, arm: 0.6, hop: 0, snap: 0, head: 0 },
  },
  idle: { hz: 0.3, breathe: 0.026, breatheArm: 0.07, shift: 1.8, shiftHz: 0.2, roll: 0.03, fidgetMin: 3.5, fidgetMax: 7.5,
    bpm: 108, groove: 0.034, grooveSway: 0.9, grooveBob: 0.9, grooveArm: 0.08, grooveJitter: 0.07,   // bop on the beat
    hip: 0.75,                                 // idle (queue) hip shifts at this fraction of the wait amplitude
    settle: 1.4 },                             // fidget settle bounce: squash spring velocity impulse
  wave: { dur: 0.7, arm: -2.55, amp: 0.42, hz: 3.4, ramp: 6 },
  // hip*: the weight shift of a standing guest. Once hipEvery runs out, the next beat starts a smooth keyframed slide of the
  // body onto the other foot (hipA units, hipRoll rad per unit of lean, over hipDur s, inOutSine). Bounded acceleration:
  // stiff real props track it, soft fake props lag and over-swing, so the tell reads while the guest stands. hipSq = a
  // small squash impulse on the step (velocity, so it never pops).
  // mad (patience >= mad): brows slam down, cheeks puff on a puffHz pulse (sx), the blush doubles and reddens, the foot taps
  // at full height (madTap), steam puffs (TUNE.steam) rise in pairs on the puff beat and an anger-vein sticker pulses;
  // no more yawns / Z's
  // pressure rises continuously inside a guest: the foot tap starts at `bored` at tapHz[0] and speeds up to tapHz[1] over
  // patience tapRamp (its height growing toward madTap); a sweat drop flies off from sweatAt (again every sweatEvery s);
  // from flushAt the face flushes red, rising from the chin (flushA at full patience)
  wait: { tapHz: [1, 4], tapRamp: [0.5, 1], tap: 2.6, tapX: 1.5, bored: 0.35, yawnAt: 0.6, yawnEvery: 3.4, wave: 1.0, sleepyLid: 0.32, madLid: 0.12,
    hipEvery: [0.9, 1.4], hipA: 4, hipDur: 0.3, hipRoll: 0.01, hipSq: 0.5, hipOut: 8,
    mad: 0.8, madRate: 7, madArm: -0.42, madTap: 4, puff: 0.06, puffHz: 2, veinHz: 3.2,
    sweatAt: 0.75, sweatEvery: 1.5, flushAt: 0.85, flushA: 0.5, flushRise: 9 },
  // square's slack jaw (wait, from the bored threshold; smirk kept for idle / cheer / dance): the lower lip drops `bored`
  // units (`sleepy` from yawnAt), hinged at the back corner (hinge / mid / front = share of the drop there / mid-lip / at
  // the jutting front; flatU flattens the lip's smile-U, sag drops the upper lip's front corner), its curl and the tusk
  // lean flatten out over the first `flat` units; it chews sideways (chew units at chewHz, chewSleepy once
  // sleepy); the tongue shows from tongueAt and a drool glint hangs off the lip from droolAt. Eased in / out at `rate`
  jaw: { bored: 3, sleepy: 5, rate: 6, flat: 2, hinge: 0.12, mid: 0.6, front: 1.4, flatU: 0.3, sag: 0.25, chew: 1.5, chewSleepy: 0.45, chewHz: 0.8, tongueAt: 2.4,
    droolAt: 4.1, drool: [2.6, 2.4], droolHz: 0.35 },
  // mad steam: white sticker puffs (dark outline like the Z, pink tint underneath) leave the head in a pair on every puff
  // beat (the cheeks' puffHz peak), growing s0 -> s1 while they rise (vx / vy, drag), then pop (popS, over pop s)
  steam: { life: 0.62, pop: 0.11, s0: 0.6, s1: 1.1, popS: 1.35, vx: 30, vy: -54, drag: 2.4, out: 1.12, up: 2.2, line: 2 },
  // inhale (sy stretch, arms rise overhead, head tips back by `back` rad and the face lifts `lift`, mouth still parted) ->
  // hold (mouth at its widest, the biggest mouth in the set) -> exhale (arms fall, the body sags and the head nods forward
  // by droop rad, recovering by the end so a yawn inside the wait loop never pops). The eyes NEVER shut: the lids droop to
  // at most lidMax with the pupils showing and a yawn tear wells up (wet), so the eye count stays readable mid-decision.
  // reachK = the share of the species' full overhead reach (sp.reach) the arms stretch to, so the mittens clear the head
  // the stretch: arms sweep up the sides to just past vertical (arm), elbows bowed out hard (elbK x the auto bend) so the
  // two arms frame the head like a ( ) instead of standing up like antennae
  yawn: { dur: 0.9, inhale: 0.32, open: 0.26, hold: 0.6, sy: 0.13, sx: 0.05, sag: 0.06, back: -0.1, lift: 2.5, droop: 0.16, face: 3.5,
    arm: 3.02, reachK: 0.92, shiver: 0.07, elbK: 1.9, z1: 0.64, z2: 0.8, lidMax: 0.4, wet: 0.6 },
  // cheer: arms thrown up in a wide V (arm rad from hanging = about 0.5 from vertical, stretching to reach x their length)
  // that locks straight through the air (elbows at elbApex x the auto bend once the hop height passes lock[0] -> lock[1]
  // of its peak, the mittens spread to mitt x size) and re-bends on the landing (up to elbLand) as follow-through
  cheer: { dur: 1.0, hops: 2, hop: 13, sy: 0.08, sx: 0.05, arm: 2.64, armAmp: 0.07, armHz: 4.5, reach: 1.9, elbApex: 0.3, elbLand: 1.35, mitt: 1.1,
    lock: [0.12, 0.6] },
  // yeet: crouch (arms tucked down and back by crouchB / crouchF rad, elbows bent crouchE x auto), then for `align` s the
  // stretch lines up with the velocity (body up axis along the throw), easing in over `snap`; the stretch then springs back
  // over `relax` while the spin (rad/s) ramps in over spinRamp. The throw is a HIGH parabola (vx / vy / g: apex ~0.6 s,
  // ~320 units up, well above the queue's heads) that leaves the screen ~0.45 s after launch with about one full turn
  // (vx allows for the play scene shrinking the flyer to ~0.6 as it goes away: the drawn offset shrinks with the scale).
  // The arms fling up (arm, stretched to flingK) on the launch. Speed lines trail the body. The body stops drawing once
  // its centre is `edge` x its height past a stage edge (or `flight` s after the crouch, the fallback); exit = when
  // onDone fires (the scene's budget: the body is still flying then)
  yeet: { crouch: 0.09, csy: 0.78, csx: 1.14, ssx: 0.6, ssy: 1.55, vx: 820, vy: 1050, g: 1700, spin: 16, exit: 0.32, flight: 1.4, edge: 0.7,
    arm: 2.5, armAmp: 0.5, armHz: 7, flingK: 1.3, crouchB: 0.3, crouchF: 0.95, crouchE: 1.6, snap: 0.03, align: 0.09, relax: 0.15,
    spinRamp: 0.06, lines: 0.3, lineW: 3.2, lineGap: 0.5, lineLen: [0.42, 0.62, 0.36], lineOff: [-0.24, 0.02, 0.27] },
  debris: { g: 1500, bounce: 0.46, fric: 0.6, hold: 1.1, fade: 0.4, vyMin: 200, vyMax: 340, vxMin: 30, vxMax: 150, spin: 9 },
  // BUSTED (a correct bounce of a liar: setState('yeet') unless opts.rip === false): before the launch every FAKE part is
  // torn off the ducking body. An outBack pop over `pop` s along dir ([x, y]; x points AWAY from the throw, so every part
  // lands on the door side, clear of the flyer and of the queue stepping up behind it) by dist units with a twist (rad)
  // and a scale punch mid-pop; a white puff + paper scraps where it tore. The tied-on tail sits on the BACK (the throw
  // side), so it is flung over the ducking body: an arc (hump units, raised until its middle clears the crouched head by
  // `clear`), x eased in-out so it rises before it crosses, flipping over by its twist. Then each part hangs `hang` s on
  // low gravity (hangG: drifting `wake` units/s after the flyer, rising float units/s, rocking wob rad at wobHz, spinning
  // twist x spinK rad/s, at most spinMax) so the scene's FAKE! tag rides it (anchor('fake')), then falls and bounces like the other
  // debris. The tape that held it tears off as a strip (the tail: a ribbon end) that flutters down: a drag-limited fall
  // (stripG / stripDrag, launched at stripVx along the pop / stripVy up), swaying `sway` units, rocking `rock` rad and
  // turning edge-on at flutHz, fading after stripHold over stripFade s. pop + hang = 0.4 s, world-anchored, so the gotcha
  // beat never holds up or rides along with anything else. The pop is done by the launch frame (TUNE.yeet.crouch 0.09 s,
  // the scene's tear sfx / hit-stop / FAKE! tag), and `wake` matches the drift of play.js's BUSTED tag (TUNE.bust.drift)
  rip: { pop: 0.1, hang: 0.3, punch: 0.2, hangG: 240, wake: 40, float: 26, wob: 0.16, wobHz: 3.2, spinK: 2, spinMax: 1.2, clear: 14,
    hat: { dir: [0.6, -0.8], dist: 30, twist: 0.55, arc: 0 }, goo: { dir: [0.82, -0.57], dist: 26, twist: 1.6, arc: 0 },
    tail: { dir: [0.87, -0.5], dist: 92, twist: 2.4, arc: 30 },
    stripG: 400, stripDrag: 4.4, stripVx: [40, 90], stripVy: [130, 190], sway: 4, rock: 0.75, flutHz: 2.6, stripHold: 0.7, stripFade: 0.3 },
  flinch: { dur: 0.42, lean: 0.17, push: 3, armF: -2.0, armB: 1.6 },
  // crouch+air = 420 ms; the crouch sinks to sy 1 - csy, the landing (land: true) kicks the squash spring to landSx / landSy
  // and holds a landing squash (landHold) over the first part of the settle
  admit: { crouch: 0.06, air: 0.36, hop: 46, land: 0.21, csy: 0.2, csx: 0.12, arm: 2.4, armAmp: 0.3, landSx: 1.12, landSy: 0.84, landHold: 0.12 },
  // the impostor's admit (setState('admit', { sneak: true }): a WRONG admit, so it must never read as a celebration): the
  // same crouch + air budget as `admit` (onDone at the threshold), but no spin, sparkle, stars or blush. A sly crouch (lids
  // at `lid`, the crooked snicker, one brow cocked), then a low tiptoe hop (hop units) leaning toward the door (lean rad),
  // the front paw up and limp (armF, elbows x elbK) and the back arm tucked (armB); the face turns BACK over the shoulder
  // (faceBack x the eye radius toward the street, up by faceUp, eased in over `look` of the air) with the pupils hard back,
  // and the front eye winks from `wink` of the air. At the threshold (`flap` of the air, or whenever the scene cuts the
  // admit short) every FAKE prop flaps off: popped up clear of the head (flapVy, units/s) and a little back toward the
  // street (flapVx: small, so it stays inside the doorway clip) with a spin (flapSpin rad/s); the debris is anchored in world
  // space and drawn over the body, so it tumbles down in the doorway in front of the guest going on in. The sly
  // face (snicker, half lids, eyes back) lingers `linger` s into the walk inside
  sneak: { hop: 17, lean: 0.24, csy: 0.17, csx: 0.1, lid: 0.36, look: 0.32, faceBack: 0.62, faceUp: 1.5, wink: 0.38, armF: -1.5, armB: -0.35,
    elbK: 2.2, wag: 0.8, flap: 0.9, flapVx: [25, 55], flapVy: [250, 310], flapSpin: 8, linger: 0.75 },
  // one signature move per species (its instrument): blob drum loop, tall noodle wave, round double-time bounce + roll,
  // square robot steps, bean disco point. Small guests (the ~40 px party window) dance bigger: below `small` draw scale the
  // amplitudes grow toward `boost` at `tiny` (or setState('dance', { intensity })). robot: 4 keyed poses with right-angle
  // elbows, one per 8th note: a robotMove-second snap (outBack) then a hold, on the beat grid.
  // drum (blob): the front arm strikes on the beats, the back arm on the off-beats: a strikeIn-second outQuad down-stroke
  // that lands ON the 8th (from drumUp to drumDown rad), a strikeOut-second recovery, a wind-up lift (drumWind) before the
  // next hit; a raised arm stretches to drumReach x its length with the elbow bent (drumElb [raised, hit] x the auto bend),
  // straight on the hit. The body dips to drumDip on every beat, sways drumSway toward
  // the hitting arm, head-bangs +/- drumBang rad every 2 beats (bangSnap beats outBack) and puffs its cheeks on beat 1 of the
  // bar; the jelly wobble (shimmy) rings after each 8th as follow-through
  dance: { tempo: 108, bounce: 6.5, sway: 0.13, squash: 0.1, swayX: 2.5, arm: 2.3, armAmp: 0.5, step: 3,
    shimmy: 0.07, drumUp: 2.3, drumDown: 0.45, drumWind: 0.2, strikeIn: 0.06, strikeOut: 0.14, drumElb: [0.85, 0.3], drumReach: 1.5, drumDip: 0.9,
    drumSway: 2.6, drumBang: 0.12, bangSnap: 0.3, drumPuff: 0.9,
    waveRot: 0.1, waveSkew: 0.2, waveLag: 1.25, rollEvery: 8, robotMove: 0.08, robotRot: 0.09, robotReach: 1.75,
    discoArm: 2.75, discoLean: 0.13, small: 0.6, tiny: 0.4, boost: 1.5 },
  // drag preview (lean(k), the scene's swipe follow): k > 0 = dragged toward IN (hopeful: brows up, big pupils, grin, hands
  // clasped up), k < 0 = toward OUT (worried: sad brows, small pupils, wobbly mouth, shrinking, trembling); eased at
  // `rate`, the face switches past `face` of full drag; hands = the raised arm angle (rad from hanging) with the elbows bent
  // handsElb x the auto bend (fists up by the cheeks), shrink / stretch = the body squash at full drag, shake = tremble
  // (units) at shakeHz
  lean: { rate: 16, face: 0.2, pupilUp: 1.22, pupilDown: 0.78, hands: 2.05, handsElb: 2.1, stretch: 0.05, shrink: 0.07, shake: 0.7, shakeHz: 13, blush: 0.9 },
  // hurt (wrong bounce): puppy eyes (lids up to `lid`, pupils x pupil with a second highlight, welling tears), inner brow
  // ends raised, a pout whose lower lip quivers at quiverHz, a big tear (tear x the drop sprite) every tearEvery s
  sad: { droop: 0.93, tearEvery: 2.2, hzK: 0.55, lid: 0.06, pupil: 1.25, quiverHz: 6, quiver: 1.1, tear: 1.55 },
  sleep: { hz: 0.23, zGap: 0.42, zPause: 1.25 },             // zzz: three z's of growing size, then a pause
  z: { s: [0.9, 1.12, 1.36], vx: 9, vy: -22, wob: 7, wobHz: 4, life: 1.7, rise: 4, pop: 0.12 },   // pop: mad pops live Z's (s)
  // tears / sweat fall to the feet line of the draw (never through the floor), then splat: a flat puddle (splatRx x
  // splatRy, widening by splatGrow) and two droplets hopping out (dropVx / dropVy, dropG, dropR), all fading over `splat` s
  drop: { tearVy: 9, tearHold: 0.55, tearG: 420, tearLife: 2.4, sweatVx: -55, sweatVy: -70, sweatG: 520, sweatLife: 1.4,
    splat: 0.15, splatRx: 4.2, splatRy: 1.5, splatGrow: 0.6, dropVx: 46, dropVy: -80, dropG: 900, dropR: 1.5 },
  // shapeshift: the wobble reaches full strength (amp) by `ramp` s (outQuad) and its frequency climbs hz0 -> hz1 across the
  // wobble, so it visibly builds into the squash; then squash (sqSx / sqSy) -> pop (popSx / popSy) + white flash
  shift: { wobble: 0.35, squash: 0.08, settle: 0.22, ramp: 0.12, amp: 0.15, hz0: 9, hz1: 16, rot: 0.08,
    sqSy: 0.72, sqSx: 1.26, popSy: 1.32, popSx: 0.82, flash: 0.22 },
  googly: { g: 1100, bounce: 0.5, drag: 1.2, inertia: 1, rattle: 0.5 },
  // contact shadow: a tight two-stop core (stops) baked once, drawn at alpha; wide species get `wide` x their footprint;
  // contact: a thin dark line under each planted foot (fades out as the foot lifts by contactLift units)
  shadow: { alpha: 0.55, ry: 8, fall: 0.02, wide: 1.1, stops: [[0, 1], [0.3, 0.82], [0.6, 0.22], [0.85, 0.05], [1, 0]], tint: '#06051a',
    contact: 0.62, contactRy: 2.4, contactRx: 0.95, contactLift: 6 },
  // door (amber) / lamp (cool) light is painted INSIDE the outline only: a crisp band (band units wide at bandA) plus a soft
  // band (soft units at softA) on the lit edge, a faint body wash (wash <= 0.1) fading across the body, with the outline band
  // (outline + keep) and the gloss arc erased so the sticker outline stays dark and the gloss stays on top. limb/hat: a
  // source-over tint of the parts (limbFar on the far side), weak enough that their outlines stay dark too.
  // doorTint: per body colour, which door tint paints the rim: 0 = amber (reads as warm light on coral / grape), 1 = peach
  // (warmWhite: amber over cyan, green or yellow mixes to khaki, so the lit edge goes lighter instead). Each tint has its
  // band set (amberSet / warmSet / coolSet); fade > 0 ramps a band (full at the outline, 0 at band + fade, `steps` stacked
  // crescents) so a light edge reads as light, never as a cream sticker border. The door rim also gets an amber kiss ON the
  // outline (its outer kiss units at kissA, only where the edge faces the door: the body copy shifted kissD toward the
  // light, kissLift of it upward, minus the body), so the edge itself glows.
  // The limb washes take the body's tint; hats keep amber.
  // hatRim: an amber catch-light band (hatBand units, starting hatIn inside the edge) on the door side + top of the hat
  // (the newsprint paper hat takes a warmWhite band at paperRim instead)
  rim: { door: 1, lamp: 1, keep: 0.25, lift: 0.55, steps: 7,
    amberSet: { band: 3.6, bandA: 0.72, soft: 7.5, softA: 0.22, wash: 0.08, fade: 0 },
    warmSet: { band: 2.6, bandA: 0.78, soft: 10, softA: 0.34, wash: 0.12, fade: 4 },
    coolSet: { band: 3.6, bandA: 0.72, soft: 7.5, softA: 0.22, wash: 0.08, fade: 0 },
    kiss: 1.6, kissA: 0.95, kissD: 3.2, kissLift: 0.25,
    amber: '#ffb347', cool: '#8fb4ff', limb: 0.17, limbFar: 0.35, hat: 0.14, hatRim: 0.95, paperRim: 0.6, hatBand: 3.2, hatIn: 1.6, hatLift: 0.7,
    warmWhite: '#ffd2a1',
    doorTint: { coral: 0, grape: 0, sky: 1, mint: 1, lime: 1, mustard: 1 } },
  // blush: a soft sticker cheek baked per colour: tone + resting alpha per body colour (a fixed pink at low alpha went muddy
  // over green / cyan and vanished on coral), a flat core out to `core` of the radius with a soft rim, plus `hatch` white
  // strokes on the cheek; E.blush raises the alpha toward 1. mad: the red cheek cross-fades in with anger (madFrom..madTo)
  blush: { rx: 1.4, ry: 0.84, core: 0.55, hatch: 3, hatchA: 0.85, hatchW: 1.15, madFrom: 0.15, madTo: 0.5,
    coral: ['#c4164a', 0.8], lime: ['#ff5c8a', 0.88], mint: ['#ff5c8a', 0.9], sky: ['#ff6fa8', 0.86], grape: ['#ff7fc0', 0.72],
    mustard: ['#ff6a5a', 0.76], mad: '#ff2a3d' },
  pupil: 0.5, pupR: 9,
  // smirk = bean's resting mouth: a dark lip sliver (`thick` units at its middle) with two buck teeth toothW x toothH hanging
  // from the top lip at toothT along it (just right of centre), the second one tilted `crooked`; dimple = the corner tick.
  // The bean's teeth are flat blocks hanging DOWN (corner radius toothR x width); the square's tusks are points going UP
  smirk: { thick: 4.8, toothT: 0.53, toothW: 5.5, toothH: 7, crooked: 0.25, dimple: 2.4, dimpleW: 2, toothR: 0.16 },
  // under = square's underbite: a filled dark mouth slot whose thick lower lip (lip units, a darker body tone) juts `jut`
  // units past the upper lip (which stops at `upper` of the half width) and curls up by `curl` at the front; two pointed
  // tusks [small, big] (half-width hw, height h) rooted on the lower lip at `at` along it, leaning outward by `lean` rad
  under: { at: [0.24, 0.7], hw: [2.6, 3.5], h: [7.5, 11], lean: [-0.3, 0.26], jut: 6, upper: 0.78, lip: 4.2, depth: 8, curl: 3.2 },
  mini: { crop: 40, pad: 7, below: 9 },     // drawMini below `crop` px: a head-and-shoulders crop (pad / below in units)
  // a REAL tail is banded so it never melts into a same-coloured body: `rings` = a dash pattern along the tail stroke
  // (units along its 54-unit path: [0, gap, ring, gap, ring, rest], butt ends) and the dark curl tip from `tip` units on
  // (round ends), painted SOLID in a dark body tone (color.dark(base, ringDark)) at ringA. ext: the real tail's stalk is
  // this much longer than the costume copy's (its curl pushed out along the root direction, clear of the silhouette, the
  // hanging mitten and the rope stanchion); the rings move out by ringOut of it
  tail: { rings: [0, 15.5, 3.2, 3.4, 3.2, 80], tip: 44.5, ringA: 1, ringDark: 0.45, ext: 8, ringOut: 0.7 },
  // the taped paper hat (fake), folded from NEWSPRINT (blue-grey, a colour no body part uses: the cream copy merged with the
  // round's horn and the bean's wing): fold = the two soft fold lines' alpha, tape = strip length (x the hat width) /
  // height / angle across the brim seam / alpha, scribble = the hot-pink crayon zigzag [y top, y bottom, stroke gap] drawn
  // crayonW wide, print = the newsprint text rows [row gap, line width, alpha, first row y]
  paper: { fold: 0.32, tapeK: 0.6, tapeH: 5, tapeRot: -0.35, tapeA: 0.75, tapeX: 3, tapeY: 0.9, scribble: [-17, -10.5, 3.4], crayonW: 2.4,
    print: [2.5, 0.95, 0.6, -26] },
  // band mode, setState('dance', { instrument: true }): each species plays its instrument (blob two floor toms, tall a bass,
  // round a synth on an X stand, square a flying-V, bean a mic). The hands are pinned to it by a two-bone solve (chord +
  // rubber-hose stretch between kMin and kMax; a chord shorter than kMin x the arm bends the elbow instead, outward /
  // down), easing in over `grab` s while the instrument pops in (outBack). Floor instruments (ground) stand on the street;
  // the others ride the body. Body units of the species, scale 1; `ext` = [left, top, right] added to bounds()
  // keys: the synth stands IN FRONT of the round (x, y = the slab's top centre, ~0.85 of the body wide, under the mouth) so
  // no neighbour or booth can hide it; the front hand arpeggiates across span, the back hand stabs a chord at chord[0|1]
  // on the beats; the round lifts its face by `face` units and sings (a small "oo") over it.
  // bass vs guitar read by silhouette: the bass is a long-necked (~1.4x the guitar's neck) sunburst P-bass held steep,
  // the guitar a short-necked red flying-V held flat
  inst: { grab: 0.22, kMin: 0.82, kMax: 2.3, elb: 0.75, palm: 0.15,
    drum: { x: 51, y: -15, lift: 21, inward: 4, mitt: 5.5, hit: 0.11, sq: 0.84, flash: 0.9, ext: [-64, -60, 64] },
    keys: { x: 4, y: -18.5, tilt: 0, span: [-14, -2, 9, 21], chord: [-24, -15], tap: 2.4, stab: 3.4, face: -6, ext: [-52, -95, 62] },
    // body instruments: k = draw size (their own units: fret / strum offsets scale with it)
    bass: { x: -1, y: -36, rot: -0.62, k: 1.12, fret: [41, 51], slide: 0.3, strum: -2, strumAmp: 3, ext: [-30, -146, 70] },
    guitar: { x: -26, y: -19, rot: -0.08, k: 1.18, fret: [31, 37], strum: 1, strumAmp: 3.6, ext: [-50, -104, 52] },
    mic: { x: 40, y: -45, rot: -0.42, k: 1.3, bob: 1.6, tilt: 0.1, ext: [-48, -118, 52] } },
};

// six hue families on evenly spread values (CIE L* grape 45, coral 55, mint 65, sky 72, mustard 82, lime 91: every pair at
// least 7 apart) so they stay apart in greyscale (GAME-SPEC §5). ONE palette for the whole game: data.js COLORS (which
// icons.js paints the poster swatches with) must carry exactly these hexes; dev/actors.html (Moods tab) flags any drift.
export const COLORS = { coral: '#ec4450', lime: '#bff86e', sky: '#40bdeb', grape: '#8a48d6', mustard: '#ffc233', mint: '#19b18b' };
export const SPECIES = ['blob', 'tall', 'round', 'square', 'bean'];
export const STATES = ['walk', 'idle', 'wait', 'yawn', 'cheer', 'yeet', 'flinch', 'admit', 'dance', 'shift', 'sad', 'sleep'];
const LOOP = { walk: 1, idle: 1, wait: 1, dance: 1, sad: 1, sleep: 1 };
const KNOWN = {};
for (let i = 0; i < STATES.length; i++) KNOWN[STATES[i]] = 1;
const HATS = { none: 1, party: 1, top: 1, crown: 1 };
const PATTERNS = { none: 1, stripes: 1, dots: 1 };
const NIGHT_R = 27, NIGHT_G = 26, NIGHT_B = 77;
const NO = {};

const M_SMILE = 0, M_OPEN = 1, M_YAWN = 2, M_GRIN = 3, M_WORRY = 4, M_O = 5, M_FLAT = 6, M_FROWN = 7, M_POUT = 8, M_SLY = 9;
const EYE_OPEN = 0, EYE_HAPPY = 1, EYE_SQUEEZE = 2;
const BROW_NONE = 0, BROW_SAD = 1, BROW_MAD = 2, BROW_UP = 3, BROW_SLY = 4;
const GAZE_WANDER = 0, GAZE_FWD = 1, GAZE_DOWN = 2, GAZE_UP = 3, GAZE_PLEAD = 4, GAZE_BACK = 5;
const EYE_K1 = [1, 1];                      // per-eye size multipliers of the 2-eye layout (tall overrides: mismatched eyes)
const FX_Z = 1, FX_TEAR = 2, FX_SWEAT = 3, FX_STEAM = 4;
const DEB_GOO = 1, DEB_PAPER = 2, DEB_TAIL = 3, DEB_HAT = 4, DEB_STRIP = 5;   // STRIP: the BUSTED rip's torn tape / ribbon end
const TAIL_DIR = Math.atan2(-9, -19);       // root -> curl direction of the baked tail sprite

let GEN = 0;                                // bumps when the resolution changes: baked sprites are re-baked at the new one
let BAKE_RES = 0;                           // bakeRes() the current sprites were baked at
// the actor bake resolution: draw.res() capped at TUNE.cache.maxRes (tablets: a letterboxed 657-css-px stage at 2x is
// res 3.1-3.4, whose extra pixels do not show at guest size but would push the sprite cache past 60 MB on top of the
// stage, post and zoom canvases, near iOS Safari's total canvas budget)
function bakeRes() { const r = draw.res(), m = TUNE.cache.maxRes; return r < m ? r : m; }
// a resize re-bakes only when the resolution really moved (rotation storms, iOS keyboard / zoom viewport resizes keep it)
stage.onResize(() => {
  const r = bakeRes();
  if (BAKE_RES > 0 && Math.abs(r - BAKE_RES) <= BAKE_RES * TUNE.cache.reRes) return;
  BAKE_RES = r;
  GEN++;
  for (const k of RECS.values()) retire(k);
  RECS.clear(); CACHE.bytes = 0; MINI_KEYED.clear();
});
// the faded-actor layer (TUNE.layer): ONE canvas shared by every actor (they composite one at a time), grown in steps
const LAYER = { cv: null, c: null, w: 0, h: 0, busy: false };
function layerCtx(pw, ph) {
  const Ly = LAYER, G = TUNE.layer.grow;
  if (!Ly.cv) { Ly.cv = document.createElement('canvas'); Ly.cv.width = 1; Ly.cv.height = 1; Ly.c = Ly.cv.getContext('2d'); }
  if (pw > Ly.w || ph > Ly.h) {
    Ly.w = Math.max(Ly.w, Math.ceil(pw / G) * G); Ly.h = Math.max(Ly.h, Math.ceil(ph / G) * G);
    Ly.cv.width = Ly.w; Ly.cv.height = Ly.h;
  }
  return Ly.c;
}
const BEAT = { fn: null };
// SIM.t = the furthest simulated time any actor has reached (seconds, advanced by update(dt)); actors sync to it (clockSync)
const SIM = { t: 0 };
// shared beat position (in beats): the party clock when one is set and playing, else the actor's sim clock (dt-driven)
function beatNow(bpm, clk) {
  const v = BEAT.fn ? BEAT.fn() : -1;
  return typeof v === 'number' && v >= 0 ? v : clk * bpm / 60;
}
export function setBeat(fn) { BEAT.fn = typeof fn === 'function' ? fn : null; }

const rnd = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------------------------------------ species geometry
// Local units: x right (the facing side), y up is negative, (0,0) = ground point between the feet.
function roundPoly(c, pts, rad) {
  const n = pts.length >> 1;
  c.beginPath();
  c.moveTo((pts[(n - 1) * 2] + pts[0]) / 2, (pts[(n - 1) * 2 + 1] + pts[1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    c.arcTo(pts[i * 2], pts[i * 2 + 1], (pts[i * 2] + pts[j * 2]) / 2, (pts[i * 2 + 1] + pts[j * 2 + 1]) / 2, rad[i]);
  }
  c.closePath();
}
function pathBlob(c) {               // squat jelly dome with a scalloped, drippy hem
  c.beginPath();
  c.moveTo(-47, -13);
  c.bezierCurveTo(-53, -47, -36, -85, 2, -85);
  c.bezierCurveTo(39, -85, 54, -48, 47, -13);
  c.quadraticCurveTo(45, -4, 35, -5);
  c.quadraticCurveTo(24, -7, 14, -4);
  c.quadraticCurveTo(2, 0, -10, -4);
  c.quadraticCurveTo(-22, -8, -33, -5);
  c.quadraticCurveTo(-45, -3, -47, -13);
  c.closePath();
}
function pathTall(c) {               // lanky: a narrow pear body up on two stilt legs, a long neck, a bulb head leaning forward
  c.beginPath();
  c.moveTo(-11, -27);
  c.bezierCurveTo(-23, -37, -23, -62, -9, -73);
  c.bezierCurveTo(-4, -78, -5, -88, -11, -98);
  c.bezierCurveTo(-27, -113, -20, -142, 6, -142);
  c.bezierCurveTo(32, -142, 39, -116, 25, -100);
  c.bezierCurveTo(16, -91, 10, -82, 11, -74);
  c.bezierCurveTo(24, -62, 24, -37, 12, -27);
  c.bezierCurveTo(7, -21, -6, -21, -11, -27);
  c.closePath();
}
function pathRound(c) {              // a ball
  c.beginPath();
  c.ellipse(0, -46, 44, 42, 0, 0, TAU);
  c.closePath();
}
const SQ_PTS = [-38, -101, 35, -101, 38, -63, 47, -56, 46, -9, -39, -9];
const SQ_RAD = [15, 13, 5, 9, 11, 13];
function pathSquare(c) { roundPoly(c, SQ_PTS, SQ_RAD); }   // a box whose jaw juts forward (underbite)
function pathBean(c) {               // a leaning bean with a concave back
  c.beginPath();
  c.moveTo(-5, -7);
  c.bezierCurveTo(-30, -7, -36, -34, -27, -50);
  c.bezierCurveTo(-21, -60, -27, -70, -24, -84);
  c.bezierCurveTo(-20, -104, 6, -116, 23, -101);
  c.bezierCurveTo(37, -88, 35, -56, 30, -34);
  c.bezierCurveTo(26, -14, 15, -6, -5, -7);
  c.closePath();
}
function backBlob(c, p) {            // wrong detail: hats sit on a tiny knob, so every hat looks two sizes too small
  c.fillStyle = p.body; c.strokeStyle = p.outline; c.lineWidth = TUNE.partLine;
  c.beginPath(); c.moveTo(-2, -80); c.lineTo(-1.5, -89); c.lineTo(5.5, -89); c.lineTo(6, -80); c.closePath(); c.fill(); c.stroke();
  draw.sticker(c, cc => draw.circle(cc, 2, -91, 5.5), { fill: p.body, outline: p.outline, lineWidth: TUNE.partLine, highlight: 0.45, shadow: 0.15 });
}
const STUMP = [-28, -78, -42, -82.5, -44, -78.5, -46.5, -80, -47.5, -75.5, -49.5, -72.5, -41, -60];
const STUMP_CUT = [-42, -82.5, -44, -78.5, -46.5, -80, -47.5, -75.5, -49.5, -72.5, -46.2, -73.6, -45.4, -77.2, -43.4, -76.4];
function backRound(c, p) {           // wrong detail: ONE horn low on the right side, a snapped-off stump on the left
  const o = { fill: p.horn, outline: p.hornLine, lineWidth: TUNE.partLine, highlight: 0.4, shadow: 0.18 };
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(28, -78); cc.quadraticCurveTo(46, -90, 58, -86); cc.quadraticCurveTo(50, -73, 41, -60); cc.closePath(); }, Object.assign({ bounds: [28, -89, 30, 29] }, o));
  c.strokeStyle = p.hornLine; c.lineWidth = 1.3; c.globalAlpha = 0.5;
  c.beginPath(); c.moveTo(40.5, -80.5); c.quadraticCurveTo(45, -76, 45.5, -70); c.moveTo(48.5, -84.5); c.quadraticCurveTo(52, -81, 52, -77); c.stroke();
  c.globalAlpha = 1;
  draw.sticker(c, cc => draw.polygon(cc, STUMP), Object.assign({ bounds: [-50, -83, 22, 23] }, o));
  c.fillStyle = p.hornCut; c.strokeStyle = p.hornLine; c.lineWidth = 1.1;
  draw.polygon(c, STUMP_CUT); c.fill(); c.stroke();
}
function frontSquare(c, p) {         // jaw seam under the cheek makes the underbite read in silhouette
  c.strokeStyle = p.outline; c.lineWidth = 2; c.globalAlpha = 0.5;
  c.beginPath(); c.moveTo(46, -55); c.quadraticCurveTo(38, -52, 31, -54); c.stroke();
  c.globalAlpha = 1;
}

// Every number a part needs. face = centre between the eyes (face1 = cyclops override); r/sp = eye radius / half spacing
// (2 eyes), r1 = cyclops; eyes3 = the 3-eye layout [x0, y0, x1, y1, x2, y2, r, rThird] (a triangle or a row, every eye
// near full size) or null when the third eye grows on a stalk [x, y, len, angle] of radius r3; brow1 = single-eye brow
// height in r1; goo = taped googly centre per REAL eye count [x1, y1, x2, y2, x3, y3], kept clear of the hat seat, horn and
// eyes, radius gooR * r. Face signature: smile = resting mouth style (gummy grin + one tooth / droopy half-smile / tiny cat
// mouth / underbite fangs / crooked buck-tooth smirk); mw = resting mouth width, we = expressive (flat / worry / frown)
// width, mo = open-mouth size, grin = [width, depth] of the big grin (runs past the cheeks), yawn = [rx, ry, centre drop]
// at full open; lid / lidTilt = resting lids (tall: droopy, outer corners down). cheek = [x1, y1, x2, y2, r]; arm =
// shoulders [backX, backY, frontX, frontY], armL / armW, armUp / reach = shoulder rise and arm stretch when the arms go
// straight up; legs = hips [backX, backY, frontX, frontY] of stilt legs (legEnd = leg tip above each foot origin);
// feet = [backX, frontX]; foot = [rx, ry] (shoe = the front foot is a clown shoe); tail = root [x, y] + tailRot of a REAL
// tail (low behind the hip; blob / round: straight out of the back above the hanging arm, its curl clear of the silhouette
// and 6+ units off the mitten) and tailF = [x, y, rot] of a tied-on fake (it droops);
// mark = colour birthmark [x, y, size, rot], low on the flank / belly: never within one eye radius of any eye layout, clear of
// the cheeks and of the grin (so it never reads as a tear); shadow = [centreX, rx]; outer = [left, top, right] of the bare
// silhouette + back parts; dance = the species' signature move, inst = its instrument (band mode). eyeK = [back, front] eye
// size multipliers of the 2-eye layout, browRest = a quirky brow raised over the front eye at rest; armStyle 'curve'
// (rubber hose) | 'joint' (a crisp elbow with a ball joint), elbowK = share of the auto elbow bend, hand 'mitt' | 'block'.
// Optional: gooH / gooHR = the googly seats [x1, y1, x2, y2, x3, y3] and radius factors used while a hat (real or paper)
// is on (round: the default seat piles up with the stump and the hat brim), paperTilt = the paper hat's crooked lean
// (default -0.3; the round leans its copy away from the stump).
const SP = {
  blob: {
    name: 'blob', h: 95, w: 96, path: pathBlob, back: backBlob, front: null,
    box: [-58, -104, 116, 110], bounds: [-50, -85, 100, 85], outer: [-51, -98, 51], gloss: [-2, -46, 35, 3.78, 4.38],
    face: [6, -48], face1: null, r: 11, sp: 14, r1: 15.5, eyes3: [-9, -45, 21, -45, 6, -67, 10.5, 10], r3: 0, stalk: null, brow1: 1.38,
    goo: [27, -66, 35, -67, 39, -60], gooR: 0.9,
    mouth: [7, -28], mw: 26, we: 22, mo: 25, grin: [52, 19], yawn: [20, 17, 4], smile: 'gummy', lid: 0.06, lidTilt: 0,
    cheek: [-18, -33, 32, -33, 5.5],
    arm: [-42, -34, 42, -33], armL: 16, armW: 9, armRest: 0.42, armUp: 14, reach: 1.9,
    legs: null, feet: [-21, 21], footB: [12.5, 6.5], footF: [12.5, 6.5], shoe: false,
    hat: [2, -95], hatS: 0.62, hatRot: 0.06, tail: [-46, -50], tailRot: -0.75, tailF: [-42, -43, -0.15], wing: null,
    mark: [-27, -18, 15.5, -0.2], shadow: [0, 58], dance: 'shimmy', inst: 'drum', armStyle: 'curve', elbowK: 1, hand: 'mitt',
  },
  tall: {
    name: 'tall', h: 142, w: 44, path: pathTall, back: null, front: null,
    box: [-32, -150, 78, 132], bounds: [-23, -142, 57, 121], outer: [-24, -144, 36], gloss: [4, -120, 19, 3.7, 4.3],
    face: [7, -123], face1: [7, -124], r: 9.5, sp: 11, r1: 11.5, eyes3: null, r3: 9, stalk: [-10, -134, 20, -2.05], brow1: 1.25,
    goo: [31, -119, 34.6, -132, 34.6, -132], gooR: 0.88,
    mouth: [9, -106], mw: 18, we: 16, mo: 18, grin: [36, 11], yawn: [10, 13, 1], smile: 'droop', lid: 0.16, lidTilt: 0.12,
    eyeK: [0.84, 1.16], browRest: true,
    cheek: [-7, -111, 26, -111, 4],
    arm: [-16, -62, 17, -62], armL: 22, armW: 7, armRest: 0.3, armUp: 10, reach: 1.8,
    legs: [-7, -26, 6, -26], legW: 4.6, knee: 3, legEnd: [0, -6.6, 0.5, -7],
    feet: [-10, 9], footB: [5, 4.2], footF: [9, 6.5], shoe: true,
    hat: [8, -141], hatS: 0.85, hatRot: 0.1, tail: [-15, -34], tailRot: -0.2, tailF: [-14, -33, -0.7], wing: null,
    mark: [-4, -45, 15, 0.2], shadow: [8, 30], dance: 'wave', inst: 'bass', armStyle: 'curve', elbowK: 1.25, hand: 'mitt',
  },
  round: {
    name: 'round', h: 88, w: 88, path: pathRound, back: backRound, front: null,
    box: [-56, -104, 118, 110], bounds: [-44, -88, 88, 84], outer: [-51, -89, 60], gloss: [0, -46, 34, 3.72, 4.32],
    face: [5, -51], face1: null, r: 15, sp: 17, r1: 20, eyes3: [-11, -44, 21, -44, 5, -69, 13, 12.5], r3: 0, stalk: null, brow1: 1.3,
    goo: [-20, -77, -20, -77, -20, -77], gooR: 0.72, gooH: [-21, -68, 5, -68.5, 5, -68.5], gooHR: [0.72, 0.54, 0.54], paperTilt: 0.2,
    mouth: [6, -23], mw: 10, we: 15, mo: 22, grin: [54, 16], yawn: [17, 15, 0], smile: 'tiny', lid: 0.06, lidTilt: 0,
    cheek: [-21, -32, 32, -32, 5.5],
    arm: [-40, -42, 39, -42], armL: 19, armW: 8.5, armRest: 0.45, armUp: 14, reach: 1.9,
    legs: null, feet: [-14, 14], footB: [7.5, 5.5], footF: [7.5, 5.5], shoe: false,
    hat: [0, -88], hatS: 0.95, hatRot: 0, tail: [-36, -50], tailRot: -0.5, tailF: [-25, -12, -1.1], wing: null,
    mark: [-25, -15.5, 10.5, 0.3], shadow: [0, 50], dance: 'roll', inst: 'keys', armStyle: 'curve', elbowK: 1, hand: 'mitt',
  },
  square: {
    name: 'square', h: 101, w: 86, path: pathSquare, back: null, front: frontSquare,
    box: [-46, -108, 100, 114], bounds: [-39, -101, 86, 92], outer: [-40, -102, 48], gloss: [-8, -62, 32, 3.72, 4.25],
    face: [2, -71], face1: null, r: 11, sp: 14, r1: 15, eyes3: [-19, -72, 23, -72, 2, -72, 9.5, 9.5], r3: 0, stalk: null, brow1: 1.38,
    goo: [25, -86, 36, -90, 36, -90], gooR: 0.9,
    mouth: [15, -39], mw: 26, we: 22, mo: 24, grin: [54, 18], yawn: [18, 18, 4], smile: 'under', lid: 0.06, lidTilt: 0,
    cheek: [-15, -53, 31, -53, 5],
    arm: [-37, -48, 41, -44], armL: 20, armW: 8.6, armRest: 0.35, armUp: 18, reach: 2.0, armTaper: [1.2, 0.92, 0.84],
    legs: null, feet: [-20, 20], footB: [12.5, 6.5], footF: [12.5, 6.5], shoe: false,
    hat: [-1, -101], hatS: 0.95, hatRot: 0, tail: [-36, -14], tailRot: -0.8, tailF: [-35, -13, -1.1], wing: null,
    mark: [-22, -24, 17, 0.15], shadow: [3, 54], dance: 'robot', inst: 'guitar', armStyle: 'joint', elbowK: 0.55, hand: 'block',
  },
  bean: {
    name: 'bean', h: 110, w: 66, path: pathBean, back: null, front: null,
    box: [-46, -120, 90, 126], bounds: [-34, -110, 70, 104], outer: [-46, -117, 36], gloss: [-2, -82, 20, 3.55, 4.25],
    face: [9, -81], face1: null, r: 10.5, sp: 12.5, r1: 14, eyes3: null, r3: 9.5, stalk: [-6, -103, 21, -2.15], brow1: 1.38,
    goo: [28, -100, 28, -100, 28, -100], gooR: 0.85,
    mouth: [12, -57], mw: 22, we: 19, mo: 22, grin: [40, 16], yawn: [13, 15, 3], smile: 'smirk', lid: 0.06, lidTilt: 0,
    cheek: [-7, -65, 31, -65, 4.8],
    arm: [-26, -46, 27, -44], armL: 17, armW: 8, armRest: 0.38, armUp: 16, reach: 2.1,
    legs: null, feet: [-12, 15], footB: [10, 6], footF: [10, 6], shoe: false,
    hat: [5, -108], hatS: 0.85, hatRot: 0.22, tail: [-23, -14], tailRot: -0.8, tailF: [-22, -13, -1.1], wing: [-23, -70],
    mark: [-14, -27, 15, -0.25], shadow: [2, 38], dance: 'disco', inst: 'mic', armStyle: 'curve', elbowK: 1.1, hand: 'mitt',
  },
};

// Colour birthmarks: every colour family carries its own small mark shape on the body, so colour (a rule attribute) is
// never carried by hue alone (GAME-SPEC §5 colourblind rule). icons.js can repeat it in the poster swatch via drawColorMark
// (in pictDrop: drawColorMark(c, key, cx, by + rb * 0.05, rb * 1.15), the mark centred low in the drop). No mark is a fluid
// shape: sky's water drop read as a permanent tear (and clashed with the hurt tears), so sky carries a cloud.
export const COLOR_MARKS = { coral: 'heart', lime: 'leaf', sky: 'cloud', grape: 'moon', mustard: 'star', mint: 'diamond' };
// builds the path of a mark shape of size s (about s units across) centred on (x, y)
function markPath(c, shape, x, y, s) {
  const h = s / 2;
  c.beginPath();
  if (shape === 'heart') {
    c.moveTo(x, y + h * 0.95);
    c.bezierCurveTo(x - h * 1.35, y + h * 0.1, x - h * 1.05, y - h * 1.15, x, y - h * 0.45);
    c.bezierCurveTo(x + h * 1.05, y - h * 1.15, x + h * 1.35, y + h * 0.1, x, y + h * 0.95);
  } else if (shape === 'leaf') {
    c.moveTo(x - h, y + h * 0.75);
    c.quadraticCurveTo(x - h * 0.95, y - h * 0.95, x + h, y - h * 0.85);
    c.quadraticCurveTo(x + h * 0.85, y + h * 0.95, x - h, y + h * 0.75);
  } else if (shape === 'cloud') {      // three lobes (small / big / mid) on a flat base; arcs meet at their intersections
    const yb = y + h * 0.1;
    c.moveTo(x - h * 0.58, yb + h * 0.57);
    c.arc(x - h * 0.58, yb + h * 0.15, h * 0.42, Math.PI / 2, 4.553, false);
    c.arc(x - h * 0.05, yb - h * 0.2, h * 0.6, 3.25, 6.014, false);
    c.arc(x + h * 0.55, yb + h * 0.1, h * 0.46, 4.665, Math.PI * 2.5, false);
  } else if (shape === 'moon') {
    c.arc(x, y, h, -2.0, 2.0, false);
    c.arc(x - h * 0.55, y, h * 0.919, 1.424, -1.424, true);
  } else if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i & 1) ? h * 0.45 : h * 1.05;
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  } else {
    c.moveTo(x, y - h * 1.05); c.lineTo(x + h * 0.78, y); c.lineTo(x, y + h * 1.05); c.lineTo(x - h * 0.78, y);
  }
  c.closePath();
}
// light body colours (CIE L* above TUNE.pattern.lightL) get dark patterns and a deeper birthmark
const LIGHT = {};
function lstar(hex) {
  const c = color.parse(hex), f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
}
function isLight(key) {
  let v = LIGHT[key];
  if (v === undefined) { v = lstar(COLORS[key] || COLORS.coral) > TUNE.pattern.lightL; LIGHT[key] = v; }
  return v;
}
// The pattern tones of a body colour (undimmed hexes, solved once per colour at setup): see TUNE.pattern. A tone is pushed
// along its ramp in 0.01 steps until it sits at least dL CIE L* off the body (capped at maxL for the light ones).
const PTONES = {};
function greyed(hex, k) {
  const c = color.parse(hex), l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  return color.hex(lerp(c.r, l, k), lerp(c.g, l, k), lerp(c.b, l, k));
}
// kind: 'light' (the colour greyed by desat, mixed toward white), 'dark' (color.dark), 'shade' (toward black); k0 = the
// least amount
function solveTone(base, kind, k0, dL, desat) {
  const PT = TUNE.pattern, L0 = lstar(base), up = kind === 'light', tgt = up ? Math.min(PT.maxL, L0 + dL) : L0 - dL;
  const src = up && desat > 0 ? greyed(base, desat) : base;
  let k = k0, h = base;
  for (let i = 0; i < 101; i++) {
    h = up ? color.mix(src, '#ffffff', k) : kind === 'dark' ? color.dark(base, k) : color.shade(base, -k);
    const l = lstar(h);
    if (up ? l >= tgt : l <= tgt) break;
    k += 0.01;
    if (k > 1) break;
  }
  return h;
}
function patternTones(key) {
  let p = PTONES[key];
  if (p) return p;
  const PT = TUNE.pattern, base = COLORS[key] || COLORS.coral, L0 = lstar(base), lite = isLight(key), lightBands = !lite && L0 < PT.stripeL;
  p = {
    lightDot: !lite, lightStripe: lightBands,
    dot: lite ? solveTone(base, 'shade', PT.darkShade, PT.minDL, 0) : solveTone(base, 'light', PT.dotLift, PT.minDL, 0),
    stripe: lightBands ? solveTone(base, 'light', 0, PT.lightDL, PT.lightDesat) : lite ? solveTone(base, 'shade', PT.darkShade, PT.minDL, 0)
      : solveTone(base, 'dark', PT.darkK, PT.minDL, 0),
    // the band / dot edge line: a darker body tone (light bodies: shaded toward black, past their dark pattern)
    edge: lite ? color.shade(base, -PT.edgeDarkLight) : color.dark(base, PT.edgeDark),
  };
  PTONES[key] = p;
  return p;
}
function markTone(key) {
  const base = COLORS[key] || COLORS.coral, M = TUNE.mark;
  return isLight(key) ? color.shade(base, -M.darkLight) : color.dark(base, M.dark);
}
// Draws the colour's birthmark sticker exactly as the body bakes it: a pale halo (half of it outside the mark) under the
// dark fill. fill / line override the tones (default: the body's mark tone and a light tone of the colour).
export function drawColorMark(ctx, colorKey, x, y, size, fill, line) {
  const base = COLORS[colorKey] || COLORS.coral, M = TUNE.mark;
  markPath(ctx, COLOR_MARKS[colorKey] || 'heart', x, y, size);
  ctx.lineJoin = 'round';
  ctx.lineWidth = M.line * 2 * size / 15; ctx.strokeStyle = line || color.light(base, M.edge); ctx.stroke();
  ctx.fillStyle = fill || markTone(colorKey); ctx.fill();
}

// ------------------------------------------------------------------------------------------------ palette (per colour x dim level)
function dimColor(hex, d) {
  if (d <= 0) return hex;
  const c = color.parse(hex);
  const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11, ds = TUNE.dim.desat * d, dk = TUNE.dim.dark * d;
  return color.hex(lerp(lerp(c.r, l, ds), NIGHT_R, dk), lerp(lerp(c.g, l, ds), NIGHT_G, dk), lerp(lerp(c.b, l, ds), NIGHT_B, dk));
}
const PALS = {};
function palette(key, dl) {
  let row = PALS[key];
  if (!row) { row = []; PALS[key] = row; }
  let p = row[dl];
  if (p) return p;
  const DM = TUNE.dim, d = DM.levels[dl], base = COLORS[key] || COLORS.coral, wk = clamp(d / DM.whiteAt, 0, 1);
  const D = h => dimColor(h, d);
  const W = h => dimColor(color.mix(h, DM.white, wk), d * DM.whiteDark);   // whites drift to a shadowed lilac, darken less
  const body = D(base), BL = TUNE.blush[key] || TUNE.blush.coral, RM = TUNE.rim, warm = RM.doorTint[key] === 1;
  // pattern: solved tones (TUNE.pattern); light dots / bands dim at only DM.patLight of the body's amount, dark ones at
  // DM.patDark of it (deeper), so the queue still reads them; past DM.patFull[0] both ease back to the body's own dim
  const PF = DM.patFull, pk = d <= PF[0] ? 0 : d >= PF[1] ? 1 : (d - PF[0]) / (PF[1] - PF[0]);
  const dLit = lerp(d * DM.patLight, d, pk), dDrk = Math.min(1, lerp(d * DM.patDark, d, pk));
  const PT = patternTones(key), DP = h => dimColor(h, dLit), DD = h => dimColor(h, dDrk);
  p = {
    blushA: BL[1], blushHi: W('#ffffff'), fang: W('#fbf1e2'), fangShade: W('#d8cbe0'),
    doorTint: warm ? RM.warmWhite : RM.amber, doorKey: warm ? 'w' : 'a',   // the door light colour on this body (see TUNE.rim)
    body: body, outline: D(color.dark(base, 0.55)), foot: D(color.dark(base, 0.2)),
    // lids: a shaded, slightly greyed body tone (a plain darker coral read as bloodshot on half-closed eyes)
    lid: D(color.mix(color.shade(base, -0.1), '#6c6496', 0.2)), lidShut: D(color.shade(base, -0.12)),
    palm: D(color.shade(base, -0.1)), lip: D(color.mix(color.shade(base, -0.06), '#ff6f8f', 0.42)),
    stripe: PT.lightStripe ? DP(PT.stripe) : DD(PT.stripe),
    dot: PT.lightDot ? DP(PT.dot) : DD(PT.dot), patEdge: D(PT.edge), fakeTail: D(color.light(base, 0.3)),
    tailRing: D(color.dark(base, TUNE.tail.ringDark)),
    mark: D(markTone(key)), markEdge: D(color.light(base, TUNE.mark.edge)),
    blush: D(BL[0]), blushMad: D(TUNE.blush.mad), gloss: W('#ffffff'), sclera: W('#fffdf7'), pupil: D('#1d1236'), pupilRing: D('#4a3580'),
    mouth: D('#3b0f2e'), tongue: D('#ff7a9a'), gum: D('#e0507a'), teeth: W('#fffaf0'), horn: W('#fff0cf'), hornLine: D('#8a6a3a'), hornCut: D('#e2c48c'),
    partyA: D('#ff4fa3'), partyB: W('#fff6fb'), partyLine: D('#8c1c57'), pom: D('#ffd23f'), pomLine: D('#9a6b00'),
    top: D('#2d2745'), topLine: D('#0f0b1e'), topBand: D('#ef3b5d'), topHi: D('#6a5f96'),
    crown: D('#ffc83d'), crownLine: D('#8a5a0a'), crownHi: W('#fff2b0'), gemR: D('#ff3d6e'), gemB: D('#3dd6ff'),
    paper: D('#dfe6f3'), paperLine: D('#7b8bab'), paperInk: D('#8794b4'), crayonA: D('#ff3f86'),
    tape: W('#fff1b3'), tapeLine: D('#c4ad5f'),
    googly: W('#ffffff'), googlyLine: D('#29213a'), googlyShade: W('#cfd8ea'), googlyPup: D('#120c1c'),
    ribbon: D('#ff3f86'), ribbonLine: D('#8a0f3f'), wing: W('#fff7ee'), wingLine: D('#9b8fb5'),
    tear: D('#8fdcff'), tearLine: D('#2b78a8'), z: W('#f3efff'), zLine: D('#0c0b24'), steam: W('#fffafc'), steamPink: D('#ff9ec4'), drool: W('#d9f3ff'),
    vein: D('#ff2d55'), veinLine: D('#5a0820'),
    // band-mode instruments (colour-independent; they dim with the guest)
    iLine: D('#170f33'), drumShell: D('#3b4fd9'), drumBand: D('#7d8fff'), drumHead: W('#fff6e6'), brass: D('#ffc93c'), brassLine: D('#8a5a0a'),
    stand: D('#4a4478'), synth: D('#2a2350'), synthTop: D('#3d3470'), keyW: W('#fffaf0'), keyB: D('#1d1638'), led: D('#ff3f86'), led2: D('#3df0ff'),
    bassBody: D('#ffa23a'), bassHi: D('#ffe08a'), bassEdge: D('#8f2a12'), guard: W('#fff3d6'), wood: D('#e8b36a'), woodDark: D('#5a3420'), head: D('#3b2a20'),
    peg: W('#fff3d6'), vBody: D('#ef2d56'), vEdge: D('#9c1236'), string: W('#f5f1ff'),
    micHead: W('#e4e2f2'), micGrille: D('#7d7898'), micBody: D('#2a2547'), micRing: D('#ff3f86'),
    glossA: 1 - DM.glossFade * wk,      // gloss / sticker-highlight strength (fades into the shadow at the back)
  };
  row[dl] = p;
  return p;
}

// ------------------------------------------------------------------------------------------------ sprite bakes (setup time only)
// An LRU of baked parts (Map insertion order = recency). Actors re-touch the parts they hold every TUNE.cache.touchFrames
// frames (touchRec), so the LRU end holds parts nobody draws any more. An evicted part is marked dead and its canvas goes
// to COOL; at the next frame (FRM) COOL moves to POOL, whose canvases the next bakes reuse (resized) instead of creating
// new ones (iOS frees canvas memory only at GC; beyond TUNE.cache.pool the canvas is shrunk to 0 x 0 at once). Every
// eviction bumps EPOCH: an actor checks its parts for dead ones at the start of its next draw and re-acquires them, so no
// recycled canvas is ever drawn as an old part. A resolution change retires everything (GEN bump re-bakes).
const RECS = new Map();
const CACHE = { count: 0, mb: 0, bytes: 0, bakes: 0, evicted: 0, reused: 0, pooled: 0 };
const POOL = [], COOL = [];
const FRM = { n: 0, t: -1e9 };              // frame counter: advanced by the first actor draw of each frame (see frameTick)
let EPOCH = 0;
function retire(r) {                        // (r.cv keeps its pixels until the canvas is recycled on a later frame)
  r.dead = true; COOL.push(r.cv);
  EPOCH++;
}
// the first actor draw of a frame: last frame's evicted canvases become reusable (beyond the pool cap they are freed)
function frameTick(now) {
  if (now - FRM.t < TUNE.cache.warmGapMs) return;
  FRM.t = now; FRM.n++;
  const cap = TUNE.cache.pool;
  while (COOL.length) {
    const cv = COOL.pop();
    if (POOL.length < cap) POOL.push(cv); else { cv.width = 0; cv.height = 0; }
  }
  CACHE.pooled = POOL.length;
}
// draw.bake() on a recycled canvas when the pool has one: w x h units at bakeRes() (setting the size clears the canvas
// and resets its context state)
function bakeRec(w, h, fn) {
  const res = bakeRes(), mx = TUNE.cache.maxPx;
  if (!BAKE_RES) BAKE_RES = res;
  const cv = POOL.length ? POOL.pop() : document.createElement('canvas');
  if (cv.width > 0) CACHE.reused++;
  const pw = Math.max(1, Math.min(mx, Math.ceil(w * res))), ph = Math.max(1, Math.min(mx, Math.ceil(h * res)));
  cv.width = pw; cv.height = ph;
  const c = cv.getContext('2d');
  c.setTransform(pw / w, 0, 0, ph / h, 0, 0);
  fn(c, w, h);
  return cv;
}
// A baked part: canvas + the local-unit box it covers; drawn with blit(ctx, rec, x, y) where (x, y) is the part origin.
function rec(key, box, b, fn) {
  let r = RECS.get(key);
  if (r) { RECS.delete(key); RECS.set(key, r); return r; }
  const x0 = box[0], y0 = box[1], w = box[2], h = box[3];
  const cv = bakeRec(w * b, h * b, c => { c.scale(b, b); c.translate(-x0, -y0); c.lineCap = 'round'; c.lineJoin = 'round'; fn(c); });
  r = { cv: cv, x0: x0, y0: y0, w: w, h: h, bytes: cv.width * cv.height * 4, key: key, dead: false };
  RECS.set(key, r);
  CACHE.bytes += r.bytes; CACHE.bakes++;
  if (CACHE.bytes > capBytes()) trimCache();
  return r;
}
// keeps a held part at the fresh end of the LRU (no-op for a dead or missing part)
function touchRec(r) {
  if (r && !r.dead && RECS.get(r.key) === r) { RECS.delete(r.key); RECS.set(r.key, r); }
}
// cache cap: maxMB at the reference resolution, scaled by (res / refRes)^2 (res = the capped bake resolution) so a larger
// phone keeps as many guests as a DPR-2 one, never above capMB
function capBytes() {
  const C = TUNE.cache, k = bakeRes() / C.refRes, mb = C.maxMB * (k > 1 ? k * k : 1);
  return (mb < C.capMB ? mb : C.capMB) * 1048576;
}
// a flat-colour silhouette of a baked part (same box): the additive light wash for limbs, hats and tails
function tintRec(src, key, b, col) {
  return rec(key, [src.x0, src.y0, src.w, src.h], b, c => {
    c.drawImage(src.cv, src.x0, src.y0, src.w, src.h);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(src.x0, src.y0, src.w, src.h);
  });
}
// a catch-light band of a baked part on its `side` (+1 = +x) and top: the part's silhouette shifted in by `inn` (so the
// dark outline stays dark) minus the silhouette shifted in by inn + band, kept inside the part
function catchRec(src, key, b, col, side, inn, band, lift) {
  return rec(key, [src.x0, src.y0, src.w, src.h], b, c => {
    const x0 = src.x0, y0 = src.y0, w = src.w, h = src.h;
    c.drawImage(src.cv, x0 - side * inn, y0 + inn * lift, w, h);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(x0, y0, w, h);
    c.globalCompositeOperation = 'destination-out'; c.drawImage(src.cv, x0 - side * (inn + band), y0 + (inn + band) * lift, w, h);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(src.cv, x0, y0, w, h);
  });
}
function trimCache() {
  const goal = capBytes() * TUNE.cache.trimTo;
  for (const [k, r] of RECS) {
    if (CACHE.bytes <= goal) break;
    RECS.delete(k); CACHE.bytes -= r.bytes; CACHE.evicted++;
    retire(r);
  }
}
// A species path replayed into a Path2D (optionally offset), for even-odd crescents and hit tests (bake time only).
function toPath2D(fn, dx, dy) {
  const p = new Path2D();
  dx = dx || 0; dy = dy || 0;
  const w = {
    beginPath() {}, closePath() { p.closePath(); },
    moveTo(x, y) { p.moveTo(x + dx, y + dy); }, lineTo(x, y) { p.lineTo(x + dx, y + dy); },
    quadraticCurveTo(a, b, x, y) { p.quadraticCurveTo(a + dx, b + dy, x + dx, y + dy); },
    bezierCurveTo(a, b, e, f, x, y) { p.bezierCurveTo(a + dx, b + dy, e + dx, f + dy, x + dx, y + dy); },
    arcTo(a, b, x, y, r) { p.arcTo(a + dx, b + dy, x + dx, y + dy, r); },
    arc(x, y, r, a0, a1, ccw) { p.arc(x + dx, y + dy, r, a0, a1, ccw); },
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) { p.ellipse(x + dx, y + dy, rx, ry, rot, a0, a1, ccw); },
  };
  fn(w);
  return p;
}
// Per-row horizontal extents of a species silhouette ({ y0, L[], R[] }, one row per unit), so patterns can wrap around
// the body's own cross-section. Measured once per species with isPointInPath on a scratch canvas.
const EXT = {};
let probeCtx = null;
function extents(s) {
  let e = EXT[s.name];
  if (e) return e;
  if (!probeCtx) probeCtx = document.createElement('canvas').getContext('2d');
  const b = s.bounds, y0 = Math.floor(b[1]) - 1, y1 = Math.ceil(b[1] + b[3]) + 1, p = toPath2D(s.path);
  const L = [], R = [];
  for (let y = y0; y <= y1; y++) {
    let l = NaN, r = NaN;
    for (let x = b[0] - 4; x <= b[0] + b[2] + 4; x += 0.5) if (probeCtx.isPointInPath(p, x, y)) { if (l !== l) l = x; r = x; }
    L.push(l); R.push(r);
  }
  e = { y0: y0, L: L, R: R };
  EXT[s.name] = e;
  return e;
}
function rowAt(e, y) { const i = Math.round(y) - e.y0; return i >= 0 && i < e.L.length && e.L[i] === e.L[i] ? i : -1; }
// Stripes: curved bands (lower halves of ellipses whose rx follows the body's width at that height, sag ry = rx * sag),
// so they wrap the volume. Dots: laid out by angle around each row, shrinking and squashing toward the silhouette edge.
function drawPattern(c, s, p, pattern) {
  const P = TUNE.pattern, e = extents(s), b = s.bounds, top = b[1], bot = b[1] + b[3], cy = top + b[3] / 2, hh = b[3] / 2;
  c.strokeStyle = p.patEdge; c.lineJoin = 'round';
  if (pattern === 'stripes') {
    c.fillStyle = p.stripe; c.lineWidth = P.edgeW;
    for (let y = top + 6; y < bot + 4; y += P.stripeGap) {
      const i0 = rowAt(e, y), i1 = rowAt(e, y + P.stripeW);
      if (i0 < 0 && i1 < 0) continue;
      const a = i0 >= 0 ? i0 : i1, z = i1 >= 0 ? i1 : i0;
      const cx0 = (e.L[a] + e.R[a]) / 2, rx0 = (e.R[a] - e.L[a]) / 2 + 3, cx1 = (e.L[z] + e.R[z]) / 2, rx1 = (e.R[z] - e.L[z]) / 2 + 3;
      c.beginPath();
      c.ellipse(cx0, y, rx0, rx0 * P.sag, 0, Math.PI, 0, true);
      c.ellipse(cx1, y + P.stripeW, rx1, rx1 * P.sag, 0, 0, Math.PI, false);
      c.closePath(); c.fill();
      c.globalAlpha = P.edgeA; c.stroke(); c.globalAlpha = 1;     // the inked band edge (its side closures fall outside the body)
    }
  } else if (pattern === 'dots') {
    c.fillStyle = p.dot; c.lineWidth = P.dotEdgeW;
    let row = 0;
    for (let y = top + 6; y < bot; y += P.dotRow, row++) {
      const i = rowAt(e, y);
      if (i < 0) continue;
      const cx = (e.L[i] + e.R[i]) / 2, hw = (e.R[i] - e.L[i]) / 2;
      if (hw < 6) continue;
      const da = P.dotGap / hw, v = (y - cy) / hh, vk = 1 - P.vShrink * v * v, a0 = (row & 1) ? da / 2 : 0;
      const k0 = Math.ceil((-1.5 - a0) / da), k1 = Math.floor((1.5 - a0) / da);
      for (let k = k0; k <= k1; k++) {          // equal steps in angle around the row: dots crowd and shrink at the edges
        const u = Math.sin(a0 + k * da), u2 = u * u, sz = P.dotR * (1 - P.edgeShrink * u2) * vk;
        c.beginPath(); c.ellipse(cx + hw * u, y, sz * (1 - P.edgeSquash * u2), sz, 0, 0, TAU); c.fill();
        c.globalAlpha = P.edgeA; c.stroke(); c.globalAlpha = 1;
      }
    }
  }
}
// The face area of an eye layout (eyes 1 / 2 / 3 of species s, plus the mouth): [cx, cy, rx, ry] of the patch ellipse
const FB = [0, 0, 0, 0], FBX = [0, 0, 0, 0];
function fbAdd(x, y, r) {
  if (x - r < FBX[0]) FBX[0] = x - r; if (x + r > FBX[1]) FBX[1] = x + r;
  if (y - r < FBX[2]) FBX[2] = y - r; if (y + r > FBX[3]) FBX[3] = y + r;
}
function faceBox(s, eyes, withMouth) {
  FBX[0] = 1e9; FBX[1] = -1e9; FBX[2] = 1e9; FBX[3] = -1e9;
  if (eyes === 1) { const f1 = s.face1 || s.face; fbAdd(f1[0], f1[1], s.r1); }
  else if (eyes === 3 && s.eyes3) { const e = s.eyes3; fbAdd(e[0], e[1], e[6]); fbAdd(e[2], e[3], e[6]); fbAdd(e[4], e[5], e[7]); }
  else { const k = s.eyeK || EYE_K1; fbAdd(s.face[0] - s.sp, s.face[1], s.r * k[0]); fbAdd(s.face[0] + s.sp, s.face[1], s.r * k[1]); }
  if (withMouth) { fbAdd(s.mouth[0] - s.mw * 0.3, s.mouth[1] + 2, 4); fbAdd(s.mouth[0] + s.mw * 0.3, s.mouth[1] + 2, 4); }
  FB[0] = (FBX[0] + FBX[1]) / 2; FB[1] = (FBX[2] + FBX[3]) / 2; FB[2] = (FBX[1] - FBX[0]) / 2; FB[3] = (FBX[3] - FBX[2]) / 2;
  return FB;
}
// keeps the face readable on a patterned body: a soft, slightly lighter patch over the eyes + mouth where the pattern
// shows at only 1 - cover (the expressions are the most important read at 100 px)
function facePatch(c, s, p, eyes) {
  const P = TUNE.pattern.patch, b = faceBox(s, eyes, true), rx = b[2] * P.k + P.pad, ry = b[3] * P.kY + P.pad;
  const col = color.mix(p.body, '#ffffff', P.light), f = clamp(P.fade / Math.min(rx, ry), 0.05, 0.6);
  c.save(); c.translate(b[0], b[1]); c.scale(rx, ry);
  c.fillStyle = draw.radial(c, 0, 0, 0, 1, [[0, color.alpha(col, P.cover)], [1 - f, color.alpha(col, P.cover)], [1, color.alpha(col, 0)]]);
  c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill();
  c.restore();
}
function bakeBody(c, s, p, pattern, colorKey, eyes) {
  if (s.back) s.back(c, p);
  s.path(c); c.fillStyle = p.body; c.fill();
  if (pattern !== 'none') { c.save(); s.path(c); c.clip(); drawPattern(c, s, p, pattern); facePatch(c, s, p, eyes); c.restore(); }
  const mk = s.mark;          // the colour birthmark (over the pattern, under the outline + highlight)
  c.save(); c.translate(mk[0], mk[1]); c.rotate(mk[3]);
  markPath(c, COLOR_MARKS[colorKey] || 'heart', 0, 0, mk[2]);
  c.lineWidth = TUNE.mark.line * 2 * mk[2] / 15; c.strokeStyle = p.markEdge; c.lineJoin = 'round'; c.stroke();   // a thin pale halo...
  c.fillStyle = p.mark; c.fill();                                                                  // ...under a solid dark mark
  c.restore();
  draw.sticker(c, s.path, { fill: 'rgba(0,0,0,0)', outline: p.outline, lineWidth: TUNE.outline, highlight: 0.32 * p.glossA, shadow: 0.2, bounds: s.bounds });
  const g = s.gloss;
  c.save();
  c.globalAlpha = 0.55 * p.glossA; c.strokeStyle = p.gloss; c.lineWidth = 3.4;
  c.beginPath(); c.arc(g[0], g[1], g[2], g[3], g[4]); c.stroke();
  c.globalAlpha = 0.5 * p.glossA; c.fillStyle = p.gloss;
  c.beginPath(); c.arc(g[0] + Math.cos(g[4] + 0.22) * g[2], g[1] + Math.sin(g[4] + 0.22) * g[2], 1.8, 0, TAU); c.fill();
  c.restore();
  if (s.front) s.front(c, p);
}
function bakeSil(c, s) { s.path(c); c.fillStyle = '#ffffff'; c.fill(); }
// Painted light on the lit edge, INSIDE the outline: a soft band + a crisp band (even-odd crescents of the body against a
// copy shifted away from the light, clipped to the body) over a faint wash; a ramped set (B.fade > 0) stacks `steps`
// thinner and thinner crescents instead, so the band is full at the outline and fades to nothing inward. Then the outline
// band and the gloss arc are erased so the sticker outline stays dark and the gloss stays on top, and a door rim lays its
// amber kiss on the outer half of the outline (fading in toward the lit side). Drawn source-over at the light's strength.
function crescent(c, s, side, d) {
  const cres = toPath2D(s.path);
  cres.addPath(toPath2D(s.path, -side * d, d * TUNE.rim.lift));
  c.fill(cres, 'evenodd');
}
function bakeRim(c, s, side, col, B, kiss) {
  const R = TUNE.rim, b = s.bounds, body = toPath2D(s.path), lw = TUNE.outline + R.keep * 2;
  const inset = lw / 2;                                    // the visible band starts just inside the outline
  c.save();
  c.clip(body);
  const x0 = side > 0 ? b[0] + b[2] : b[0], x1 = side > 0 ? b[0] : b[0] + b[2];
  c.fillStyle = draw.gradient(c, x0, 0, x1, 0, [[0, color.alpha(col, B.wash)], [0.55, color.alpha(col, 0)], [1, color.alpha(col, 0)]]);
  c.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
  c.fillStyle = col;
  if (B.fade > 0) {                // ramps: layer i covers depth (i / n) x width, so coverage falls linearly-ish inward
    const n = R.steps, aSoft = 1 - Math.pow(1 - B.softA, 1 / n), aBand = 1 - Math.pow(1 - B.bandA, 1 / n);
    for (let i = n; i >= 1; i--) {
      c.globalAlpha = aSoft; crescent(c, s, side, inset + B.soft * i / n);
      c.globalAlpha = aBand; crescent(c, s, side, inset + (B.band + B.fade) * i / n);
    }
  } else {
    c.globalAlpha = B.softA; crescent(c, s, side, inset + B.soft);
    c.globalAlpha = B.bandA; crescent(c, s, side, inset + B.band);
  }
  c.restore();
  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = lw; c.strokeStyle = '#000'; c.lineJoin = 'round'; c.stroke(body);
  const g = s.gloss;
  c.lineWidth = 3.4 + 3; c.lineCap = 'round';
  c.beginPath(); c.arc(g[0], g[1], g[2], g[3] - 0.05, g[4] + 0.3); c.stroke();
  c.globalCompositeOperation = 'source-over';
  if (kiss > 0) {                  // the outline itself catches the door light: its outer half, amber, where it faces the door
    const out = new Path2D(), lit = toPath2D(s.path, side * R.kissD, -R.kissD * R.kissLift);
    out.rect(b[0] - 12, b[1] - 12, b[2] + 24, b[3] + 24); out.addPath(body);
    lit.addPath(body);
    c.save(); c.clip(out, 'evenodd'); c.clip(lit, 'evenodd');   // outside the body, inside its copy shifted toward the door
    c.strokeStyle = color.alpha(R.amber, kiss); c.lineWidth = R.kiss * 2; c.lineJoin = 'round'; c.stroke(body);
    c.restore();
  }
}
function bakeFoot(c, rx, ry, p) {
  draw.sticker(c, cc => draw.ellipse(cc, 0, -ry, rx, ry), { fill: p.foot, outline: p.outline, lineWidth: TUNE.partLine, highlight: 0.3 * p.glossA, shadow: 0.12 });
  c.strokeStyle = p.outline; c.lineWidth = 1.3; c.globalAlpha = 0.5;
  c.beginPath(); c.moveTo(rx * 0.38, -ry * 0.62); c.lineTo(rx * 0.56, -ry * 0.18); c.moveTo(rx * 0.06, -ry * 0.68); c.lineTo(rx * 0.18, -ry * 0.16); c.stroke();
  c.globalAlpha = 1;
}
const SHOE_BOX = [-10, -19, 37, 22];
function bakeShoe(c, p) {    // tall's wrong detail: one huge clown shoe (the other foot is tiny)
  const path = cc => {
    cc.beginPath(); cc.moveTo(-6, 0); cc.lineTo(-6.5, -4.5); cc.quadraticCurveTo(-6, -8.5, -1, -8.5); cc.lineTo(5, -8);
    cc.bezierCurveTo(7, -15, 20, -17, 23.5, -9); cc.quadraticCurveTo(25.5, -1, 19, 0); cc.closePath();
  };
  draw.sticker(c, path, { fill: p.foot, outline: p.outline, lineWidth: TUNE.partLine, highlight: 0.38 * p.glossA, shadow: 0.16, bounds: [-6.5, -16, 32, 16] });
  c.strokeStyle = p.outline; c.lineWidth = 1.3; c.globalAlpha = 0.55;
  c.beginPath(); c.moveTo(4, -7.5); c.quadraticCurveTo(10, -6, 12, -12); c.stroke();      // the toe-cap seam
  c.beginPath(); c.moveTo(-5, -2.2); c.lineTo(20, -2.2); c.stroke();                      // sole line
  c.globalAlpha = 1;
}
const mittBox = W => [-W - 3, -W - 3, W * 2 + 6, W * 2 + 6];
// a mitten at the wrist (local +y = along the forearm): a thumb nub angled up toward the front, the palm (round, or a
// rounded block for the square), the palm pad a shade darker on the thumb side and one finger crease
function bakeMitt(c, W, p, block) {
  const o = { fill: p.body, outline: p.outline, lineWidth: TUNE.partLine, highlight: 0.42 * p.glossA, shadow: 0.12 };
  c.save(); c.translate(W * 0.5, -W * 0.12); c.rotate(-0.62);
  draw.sticker(c, cc => draw.ellipse(cc, 0, 0, W * 0.27, W * 0.4), o);
  c.restore();
  const palm = block ? cc => draw.roundRect(cc, -W * 0.64, -W * 0.5, W * 1.26, W * 1.24, W * 0.34)
    : cc => draw.ellipse(cc, -W * 0.04, W * 0.12, W * 0.66, W * 0.7);
  palm(c); c.fillStyle = p.body; c.fill();
  c.save(); palm(c); c.clip();
  c.fillStyle = p.palm; c.beginPath(); c.ellipse(W * 0.5, W * 0.2, W * 0.46, W * 0.74, -0.2, 0, TAU); c.fill();
  c.restore();
  draw.sticker(c, palm, { fill: 'rgba(0,0,0,0)', outline: p.outline, lineWidth: TUNE.partLine, highlight: 0.42 * p.glossA, shadow: 0.12 });
  c.strokeStyle = p.outline; c.lineWidth = 1.2; c.globalAlpha = 0.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(W * 0.02, W * 0.78); c.quadraticCurveTo(W * 0.06, W * 0.6, W * 0.02, W * 0.44); c.stroke();
  c.globalAlpha = 1;
}
// the mad steam puff: a white sticker cloud (one outline around the union of its lobes, like the Z), a pink blush under
// its belly, sticker light, a gloss tick on the top lobe
const PUFF = [-4.6, 1.6, 4.3, 4.5, 2, 4, 0.2, -2.4, 5.1, -0.6, 3.2, 3.6];   // lobes [x, y, r] x 4
function puffPath(c, grow) {
  c.beginPath();
  for (let i = 0; i < PUFF.length; i += 3) { const r = PUFF[i + 2] + grow; c.moveTo(PUFF[i] + r, PUFF[i + 1]); c.arc(PUFF[i], PUFF[i + 1], r, 0, TAU); }
}
function bakeSteam(c, p) {
  puffPath(c, TUNE.steam.line); c.fillStyle = p.zLine; c.fill();
  draw.sticker(c, cc => puffPath(cc, 0), { fill: p.steam, lineWidth: 0, highlight: 0.3 * p.glossA, shadow: 0.2, bounds: [-8.9, -7.5, 17.4, 14.2] });
  c.save(); puffPath(c, 0); c.clip();
  c.fillStyle = draw.gradient(c, 0, -1, 0, 7, [[0, color.alpha(p.steamPink, 0)], [1, color.alpha(p.steamPink, 0.75)]]);
  c.fillRect(-10, -1, 20, 9);
  c.restore();
  c.strokeStyle = p.gloss; c.globalAlpha = 0.95 * p.glossA; c.lineWidth = 1.3; c.lineCap = 'round';
  c.beginPath(); c.arc(0.2, -2.4, 3.3, 3.6, 4.4); c.stroke(); c.globalAlpha = 1;
}
const STEAM_BOX = [-12, -11, 24, 21];
// sticker blush: baked at radius BLUSH_R (an ellipse rx x ry of it), stretched to the cheek size at draw time. A flat core
// with a soft rim (no muddy alpha ramp across the whole cheek) plus short white hatch strokes (the "///" sticker blush)
const BLUSH_R = 8;
const BLUSH_BOX = [-BLUSH_R * 1.5 - 1, -BLUSH_R - 1, BLUSH_R * 3 + 2, BLUSH_R * 2 + 2];
function bakeBlush(c, col, hi) {
  const B = TUNE.blush, R = BLUSH_R;
  c.save(); c.scale(B.rx, B.ry);
  c.fillStyle = draw.radial(c, 0, 0, 0, R, [[0, col], [B.core, col], [0.82, color.alpha(col, 0.55)], [1, color.alpha(col, 0)]]);
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.restore();
  if (!hi) return;
  c.strokeStyle = hi; c.lineWidth = B.hatchW * R / 6; c.lineCap = 'round'; c.globalAlpha = B.hatchA;
  const n = B.hatch, sx = R * B.rx * 0.36;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * sx + R * 0.12, y = -R * B.ry * 0.08;
    c.moveTo(x + R * 0.16, y - R * 0.3); c.lineTo(x - R * 0.16, y + R * 0.3);
  }
  c.stroke(); c.globalAlpha = 1;
}
// the contact shadow (and the foot contact lines): one soft disc with a tight core, stretched to size at draw time
const SHADOW_BOX = [-32, -32, 64, 64];
function bakeShadow(c) {
  const S = TUNE.shadow, st = [];
  for (let i = 0; i < S.stops.length; i++) st.push([S.stops[i][0], color.alpha(S.tint, S.stops[i][1])]);
  c.fillStyle = draw.radial(c, 0, 0, 0, 32, st);
  c.fillRect(-32, -32, 64, 64);
}
function shadowRec() { return rec('a.shadow', SHADOW_BOX, 0.5, bakeShadow); }
function bakeSclera(c, r, p) {
  draw.sticker(c, cc => draw.circle(cc, 0, 0, r), { fill: p.sclera, outline: p.outline, lineWidth: TUNE.eyeLine, highlight: 0, shadow: 0.16 });
}
function bakePupil(c, R, p) {
  c.fillStyle = p.pupil; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.strokeStyle = p.pupilRing; c.lineWidth = R * 0.2; c.beginPath(); c.arc(0, 0, R * 0.74, 0.25, 1.75); c.stroke();
  c.fillStyle = p.gloss;
  c.beginPath(); c.arc(-R * 0.34, -R * 0.36, R * 0.34, 0, TAU); c.fill();
  c.globalAlpha = 0.85; c.beginPath(); c.arc(R * 0.36, R * 0.34, R * 0.14, 0, TAU); c.fill(); c.globalAlpha = 1;
}
// the tail stroke from its root (0, 0); e = units the curl is pushed out along the root direction (TAIL_DIR): the real
// tail's longer stalk (TUNE.tail.ext), 0 for the costume copy
const TAIL_UX = Math.cos(Math.atan2(-9, -19)), TAIL_UY = Math.sin(Math.atan2(-9, -19));
function tailPath(c, e) {
  const dx = TAIL_UX * e, dy = TAIL_UY * e;
  c.beginPath();
  c.moveTo(3, 1);
  c.bezierCurveTo(-7 + dx * 0.45, 3 + dy * 0.45, -17 + dx, dy, -19 + dx, -8 + dy);
  c.bezierCurveTo(-21 + dx, -16 + dy, -13 + dx, -21 + dy, -9 + dx, -16 + dy);
  c.bezierCurveTo(-6 + dx, -12 + dy, -10 + dx, -9 + dy, -13 + dx, -11 + dy);
}
// the tail path is 54 units long (+ e: root 0 -> bottom of the curl 26 -> top 44 -> tip 54); TUNE.tail.rings dashes along it
const NO_DASH = [], TIP_DASH = [30, 1000], RING_DASH = TUNE.tail.rings.slice();
RING_DASH[1] += TUNE.tail.ext * TUNE.tail.ringOut;
function bakeTail(c, p, fake) {
  const e = fake ? 0 : TUNE.tail.ext;
  c.strokeStyle = p.outline; c.lineWidth = 10; tailPath(c, e); c.stroke();
  c.strokeStyle = fake ? p.fakeTail : p.body; c.lineWidth = 5.8; tailPath(c, e); c.stroke();
  if (!fake) {   // a real tail: two solid dark band rings + a dark tip, so it separates from a same-coloured body at any size
    c.save(); c.strokeStyle = p.tailRing; c.globalAlpha = TUNE.tail.ringA; c.lineCap = 'butt'; c.lineWidth = 5.8;
    c.setLineDash(RING_DASH); tailPath(c, e); c.stroke();
    c.lineCap = 'round'; c.setLineDash(TIP_DASH); c.lineDashOffset = 1030 - TUNE.tail.tip - e; tailPath(c, e); c.stroke();
    c.setLineDash(NO_DASH); c.lineDashOffset = 0; c.restore();
  }
  const gx = TAIL_UX * e * 0.5, gy = TAIL_UY * e * 0.5;     // the gloss streak along the stalk (stretched with it)
  c.save(); c.globalAlpha = 0.45; c.strokeStyle = p.gloss; c.lineWidth = 1.5; c.translate(-0.6, -1.3);
  c.beginPath(); c.moveTo(-4, 1); c.bezierCurveTo(-11 + gx, 1 + gy, -16 + gx * 2, -2 + gy * 2, -17.5 + gx * 2, -7 + gy * 2); c.stroke(); c.restore();
  if (fake) {   // costume tail: a fluffy pom stuck on the end
    const o = { fill: p.fakeTail, outline: p.outline, lineWidth: 1.8, highlight: 0.4, shadow: 0.1 };
    draw.sticker(c, cc => draw.circle(cc, -15, -13, 3.6), o);
    draw.sticker(c, cc => draw.circle(cc, -11.5, -15, 3.2), o);
  }
}
function bakeBow(c, p) {
  const o = { fill: p.ribbon, outline: p.ribbonLine, lineWidth: 1.8, highlight: 0.35, shadow: 0.12 };
  draw.sticker(c, cc => draw.polygon(cc, [-1, 1, -6, 10, -3, 11.5, 1.5, 4]), o);
  draw.sticker(c, cc => draw.polygon(cc, [1, 1, 6.5, 9, 3.5, 11, -1, 4]), o);
  c.save(); c.translate(-5.2, -1.5); c.rotate(-0.4); draw.sticker(c, cc => draw.ellipse(cc, 0, 0, 5.6, 3.6), o); c.restore();
  c.save(); c.translate(5.2, -1.5); c.rotate(0.4); draw.sticker(c, cc => draw.ellipse(cc, 0, 0, 5.6, 3.6), o); c.restore();
  draw.sticker(c, cc => draw.circle(cc, 0, -0.5, 2.8), o);
}
function bakeParty(c, p) {
  const path = cc => { cc.beginPath(); cc.moveTo(-14, 0); cc.lineTo(-1.6, -33); cc.quadraticCurveTo(0, -35, 1.6, -33); cc.lineTo(14, 0); cc.quadraticCurveTo(0, 4.5, -14, 0); cc.closePath(); };
  path(c); c.fillStyle = p.partyA; c.fill();
  c.save(); path(c); c.clip(); c.fillStyle = p.partyB;
  for (let i = 0; i < 5; i++) { const y = 2 - i * 8.5; c.beginPath(); c.moveTo(-20, y); c.lineTo(20, y - 9); c.lineTo(20, y - 13); c.lineTo(-20, y - 4); c.closePath(); c.fill(); }
  c.restore();
  draw.sticker(c, path, { fill: 'rgba(0,0,0,0)', outline: p.partyLine, lineWidth: TUNE.partLine, highlight: 0.35, shadow: 0.16, bounds: [-14, -35, 28, 39] });
  draw.sticker(c, cc => draw.circle(cc, 0, -35, 5), { fill: p.pom, outline: p.pomLine, lineWidth: 2, highlight: 0.5 });
}
function bakeTop(c, p) {
  draw.sticker(c, cc => draw.ellipse(cc, 0, -1.5, 19, 4.6), { fill: p.top, outline: p.topLine, lineWidth: TUNE.partLine, highlight: 0.25, shadow: 0.1 });
  const crown = cc => { cc.beginPath(); cc.moveTo(-11, -2); cc.lineTo(-12.5, -29); cc.quadraticCurveTo(0, -32, 12.5, -29); cc.lineTo(11, -2); cc.quadraticCurveTo(0, 0.5, -11, -2); cc.closePath(); };
  draw.sticker(c, crown, { fill: p.top, outline: p.topLine, lineWidth: TUNE.partLine, highlight: 0.3, shadow: 0.2, bounds: [-12.5, -32, 25, 31] });
  c.fillStyle = p.topBand; c.strokeStyle = p.topLine; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-11.2, -5.5); c.quadraticCurveTo(0, -3.5, 11.2, -5.5); c.lineTo(11.6, -12); c.quadraticCurveTo(0, -10, -11.6, -12); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = p.topHi; c.lineWidth = 1.6; c.globalAlpha = 0.7;
  c.beginPath(); c.moveTo(-8, -16); c.lineTo(-8.8, -26); c.stroke(); c.globalAlpha = 1;
}
function bakeCrown(c, p) {
  const path = cc => { cc.beginPath(); cc.moveTo(-15, 0); cc.lineTo(-16, -21); cc.lineTo(-8, -12); cc.lineTo(0, -25); cc.lineTo(8, -12); cc.lineTo(16, -21); cc.lineTo(15, 0); cc.quadraticCurveTo(0, 3, -15, 0); cc.closePath(); };
  draw.sticker(c, path, { fill: p.crown, outline: p.crownLine, lineWidth: TUNE.partLine, highlight: 0.45, shadow: 0.2, bounds: [-16, -25, 32, 28] });
  const ball = { fill: p.crownHi, outline: p.crownLine, lineWidth: 1.6, highlight: 0.3, shadow: 0.1 };
  draw.sticker(c, cc => draw.circle(cc, -16, -22, 2.6), ball);
  draw.sticker(c, cc => draw.circle(cc, 0, -26, 2.9), ball);
  draw.sticker(c, cc => draw.circle(cc, 16, -22, 2.6), ball);
  draw.sticker(c, cc => draw.circle(cc, 0, -6, 3.3), { fill: p.gemR, outline: p.crownLine, lineWidth: 1.4, highlight: 0.6 });
  draw.sticker(c, cc => draw.circle(cc, -9, -5.5, 2.2), { fill: p.gemB, outline: p.crownLine, lineWidth: 1.2, highlight: 0.6 });
  draw.sticker(c, cc => draw.circle(cc, 9, -5.5, 2.2), { fill: p.gemB, outline: p.crownLine, lineWidth: 1.2, highlight: 0.6 });
}
function tape(c, x, y, rot, w, h, p) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const a = w / 2, b = h / 2;
  c.beginPath();
  c.moveTo(-a, -b); c.lineTo(a, -b); c.lineTo(a - 1.2, -b * 0.45); c.lineTo(a, 0); c.lineTo(a - 1.2, b * 0.5); c.lineTo(a, b);
  c.lineTo(-a, b); c.lineTo(-a + 1.2, b * 0.45); c.lineTo(-a, 0); c.lineTo(-a + 1.2, -b * 0.5); c.closePath();
  c.globalAlpha = 0.88; c.fillStyle = p.tape; c.fill();
  c.globalAlpha = 1; c.strokeStyle = p.tapeLine; c.lineWidth = 1; c.stroke();
  c.globalAlpha = 0.55; c.strokeStyle = p.gloss; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-a + 2, -b + 1.3); c.lineTo(a - 2, -b + 1.3); c.stroke();
  c.restore();
}
// a translucent tape strip w x h centred on (x, y) at rot, with small torn (jagged) ends
const TORN_R = [0, -0.85, 0.15, -0.6, 0.3, -0.75, 0], TORN_L = [0, 0.7, -0.2, 0.85, 0.05, 0.6, 0];
function tornTape(c, x, y, rot, w, h, p, a) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const hw = w / 2, n = TORN_R.length - 1;
  c.beginPath(); c.moveTo(-hw, -h / 2);
  for (let i = 0; i <= n; i++) c.lineTo(hw + TORN_R[i], -h / 2 + h * i / n);
  for (let i = n; i >= 0; i--) c.lineTo(-hw + TORN_L[i], -h / 2 + h * i / n);
  c.closePath();
  c.globalAlpha = a; c.fillStyle = p.tape; c.fill();
  c.globalAlpha = a * 0.9; c.strokeStyle = p.tapeLine; c.lineWidth = 0.8; c.stroke();
  c.globalAlpha = a * 0.6; c.strokeStyle = p.gloss; c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-hw + 1.6, -h / 2 + 1.2); c.lineTo(hw - 1.6, -h / 2 + 1.2); c.stroke();
  c.restore();
}
// FAKE hat: a kid's copy of the party cone folded from a newspaper page: a hand-cut blue-grey cone with a bent tip, rows of
// newsprint (a headline bar, text columns broken by the folds, one photo box), two soft folds, one thick hot-pink crayon
// zigzag band, held on by a single translucent tape strip across the brim seam (its loose end flaps live, see drawFront)
const PAPER_W = 28;
const PRINT_DASH = [[3.4, 0.9, 2.1, 0.9, 4.2, 0.9], [2.4, 0.9, 4.4, 0.9, 1.8, 0.9], [4.8, 0.9, 2.6, 0.9, 3, 0.9]];   // newsprint words
// the tape's head-side end (hat units), where the live loose flap hinges
const FLAP_X = TUNE.paper.tapeX - Math.cos(TUNE.paper.tapeRot) * PAPER_W * TUNE.paper.tapeK * 0.5;
const FLAP_Y = TUNE.paper.tapeY - Math.sin(TUNE.paper.tapeRot) * PAPER_W * TUNE.paper.tapeK * 0.5;
function paperPath(cc) {
  cc.beginPath(); cc.moveTo(-14, 0.6);
  cc.quadraticCurveTo(-7.6, -14.5, -2.3, -30.2); cc.quadraticCurveTo(-0.8, -33.6, 1.7, -31.7);
  cc.quadraticCurveTo(7.8, -15.5, 14, 1);
  cc.quadraticCurveTo(9.2, 3.3, 4.2, 2.2); cc.quadraticCurveTo(-0.6, 1.3, -5, 2.7); cc.quadraticCurveTo(-10, 3.8, -14, 0.6);
  cc.closePath();
}
function bakePaper(c, p) {
  const PP = TUNE.paper, sc = PP.scribble;
  draw.sticker(c, paperPath, { fill: p.paper, outline: p.paperLine, lineWidth: 2, highlight: 0.25, shadow: 0.2, bounds: [-14, -33.6, 28, 37] });
  c.save(); paperPath(c); c.clip();
  // newsprint: text rows (dashed into words, broken at the two folds), a headline bar on top, a photo box low on the front
  const pr = PP.print;
  c.strokeStyle = p.paperInk; c.lineCap = 'butt'; c.globalAlpha = pr[2];
  c.lineWidth = pr[1] * 2.1;
  c.beginPath(); c.moveTo(-3.6, -24.6); c.lineTo(3.4, -24.6); c.stroke();                // headline
  c.lineWidth = pr[1];
  for (let y = pr[3] + 4, r = 0; y < 2; y += pr[0], r++) {
    if (y > sc[0] - 2.2 && y < sc[1] + 2.6) continue;              // under the crayon band
    const hw = 14 * (y + 33) / 34 - 1.2, fl = -0.9 - 3.4 * (y + 30) / 32, fr = 0.9 + 5.7 * (y + 30) / 32;
    c.setLineDash(PRINT_DASH[r % 3]); c.lineDashOffset = r * 1.7;
    c.beginPath();
    if (fl - 0.9 > -hw) { c.moveTo(-hw, y); c.lineTo(fl - 0.9, y); }
    c.moveTo(fl + 0.9, y); c.lineTo(fr - 0.9, y);
    if (fr + 0.9 < hw) { c.moveTo(fr + 0.9, y); c.lineTo(hw, y); }
    c.stroke();
  }
  c.setLineDash(NO_DASH); c.lineDashOffset = 0;
  c.fillStyle = p.paperInk; c.globalAlpha = pr[2] * 0.75;
  c.fillRect(1.6, -6.4, 4.6, 4.2);                                // the photo box
  c.fillStyle = p.paperLine; c.globalAlpha = 0.1;                  // the facet past the second fold sits a shade darker
  c.beginPath(); c.moveTo(0.9, -31); c.quadraticCurveTo(4.6, -14, 7, 3); c.lineTo(16, 3); c.lineTo(16, -34); c.closePath(); c.fill();
  c.globalAlpha = 0.95; c.strokeStyle = p.crayonA; c.lineWidth = PP.crayonW; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();                                                  // the crayon band: a thick back-and-forth zigzag, sagging
  for (let i = 0, x = -13; x <= 13.5; x += sc[2], i++) {
    const sag = 1.4 * (1 - (x / 13) * (x / 13)), jy = (i % 3) * 0.35;
    if (i === 0) c.moveTo(x, sc[1] + sag); else c.lineTo(x, ((i & 1) ? sc[0] : sc[1]) + sag + jy);
  }
  c.stroke();
  c.lineWidth = 1.2; c.globalAlpha = 0.85;                         // its wobbly crayon edges
  c.beginPath(); c.moveTo(-13, sc[0] + 0.4); c.quadraticCurveTo(0, sc[0] + 2.4, 13, sc[0] - 0.3);
  c.moveTo(-13, sc[1] + 0.2); c.quadraticCurveTo(0, sc[1] + 2.9, 13, sc[1] + 0.5); c.stroke();
  c.restore();
  c.strokeStyle = p.paperLine; c.lineWidth = 1; c.globalAlpha = PP.fold; c.lineCap = 'round';   // two soft folds
  c.beginPath(); c.moveTo(-0.9, -29.5); c.quadraticCurveTo(-2.6, -14, -4.3, 1.6);
  c.moveTo(0.9, -29.8); c.quadraticCurveTo(4.6, -14, 6.6, 2.2); c.stroke();
  c.globalAlpha = 1;
  tornTape(c, PP.tapeX, PP.tapeY, PP.tapeRot, PAPER_W * PP.tapeK, PP.tapeH, p, PP.tapeA);
}
function bakeGoo(c, R, p) {
  draw.sticker(c, cc => draw.circle(cc, 0, 0, R), { fill: p.googly, outline: p.googlyLine, lineWidth: 1.8, highlight: 0, shadow: 0.22 });
  c.strokeStyle = p.googlyShade; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R - 2, 0, TAU); c.stroke();
}
function bakeGooGloss(c, R, p) {
  c.strokeStyle = p.gloss; c.globalAlpha = 0.92; c.lineWidth = R * 0.17;
  c.beginPath(); c.arc(0, 0, R * 0.68, Math.PI * 1.06, Math.PI * 1.42); c.stroke();
  c.fillStyle = p.gloss; c.beginPath(); c.arc(R * 0.42, R * 0.36, R * 0.11, 0, TAU); c.fill();
  c.globalAlpha = 1;
}
function bakeGooPup(c, R, p) { c.fillStyle = p.googlyPup; c.beginPath(); c.arc(0, 0, R * 0.5, 0, TAU); c.fill(); }
function bakeWing(c, p) {    // bean's wrong detail: one tiny useless angel wing
  const path = cc => { cc.beginPath(); cc.moveTo(2, 3); cc.quadraticCurveTo(-6, -14, -22, -17); cc.quadraticCurveTo(-18, -11, -21, -7); cc.quadraticCurveTo(-14, -6, -16, -1); cc.quadraticCurveTo(-9, -1, -10, 4); cc.quadraticCurveTo(-4, 5, 2, 3); cc.closePath(); };
  draw.sticker(c, path, { fill: p.wing, outline: p.wingLine, lineWidth: 2, highlight: 0.3, shadow: 0.15, bounds: [-22, -17, 24, 22] });
  c.strokeStyle = p.wingLine; c.globalAlpha = 0.5; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 2); c.lineTo(-15, -9); c.moveTo(0, 2.5); c.lineTo(-11, -2); c.stroke(); c.globalAlpha = 1;
}
// the zzz sticker: a filled chunky Z (bars ~0.3 of its height, a wide diagonal), slightly italic, pale lilac fill, dark
// 2.5 outline, sticker light and a gloss tick on the top bar
const Z_PTS = [-5.5, -6, 5.5, -6, 5.5, -2.4, 0.4, 2.4, 5.5, 2.4, 5.5, 6, -5.5, 6, -5.5, 2.4, -0.4, -2.4, -5.5, -2.4];
function bakeZ(c, p) {
  c.save(); c.transform(1, 0, -0.14, 1, 0, 0);
  draw.sticker(c, cc => draw.polygon(cc, Z_PTS), { fill: p.z, outline: p.zLine, lineWidth: 2.5, highlight: 0.35 * p.glossA, shadow: 0.24 });
  c.strokeStyle = p.gloss; c.globalAlpha = 0.95 * p.glossA; c.lineWidth = 1.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-3.9, -4.4); c.lineTo(-1.2, -4.4); c.stroke();
  c.restore();
}
function bakeDrop(c, p) {
  const path = cc => { cc.beginPath(); cc.moveTo(0, -6); cc.bezierCurveTo(2, -2, 4.5, 0.5, 4.5, 2.5); cc.arc(0, 2.5, 4.5, 0, Math.PI, false); cc.bezierCurveTo(-4.5, 0.5, -2, -2, 0, -6); cc.closePath(); };
  draw.sticker(c, path, { fill: p.tear, outline: p.tearLine, lineWidth: 1.6, highlight: 0.5, shadow: 0.1, bounds: [-4.5, -6, 9, 13] });
}
// ---- band-mode instruments (baked per dim level x bucket; the outline is one ink for all, so they read on every body)
// floor tom: origin = the drum head centre, the floor 15 units below (TUNE.inst.drum.y = -15)
function bakeTom(c, p) {
  c.strokeStyle = p.iLine; c.lineWidth = 3.8; c.lineCap = 'round';          // two splayed legs to the floor
  c.beginPath(); c.moveTo(-7, 8); c.lineTo(-10.5, 14.4); c.moveTo(7, 8); c.lineTo(10.5, 14.4); c.stroke();
  c.strokeStyle = p.stand; c.lineWidth = 1.8; c.stroke();
  const shell = cc => { cc.beginPath(); cc.moveTo(-11.6, 0); cc.lineTo(-10.7, 9.4); cc.quadraticCurveTo(0, 13.4, 10.7, 9.4); cc.lineTo(11.6, 0); cc.closePath(); };
  draw.sticker(c, shell, { fill: p.drumShell, outline: p.iLine, lineWidth: 2, highlight: 0.38, shadow: 0.22, bounds: [-11.6, 0, 23.2, 13.4] });
  c.save(); shell(c); c.clip();                                               // a lighter wrap band round the shell
  c.fillStyle = p.drumBand; c.beginPath(); c.moveTo(-12, 4.6); c.quadraticCurveTo(0, 7.6, 12, 4.6); c.lineTo(12, 7); c.quadraticCurveTo(0, 10, -12, 7); c.closePath(); c.fill();
  c.restore();
  for (let i = -1; i <= 1; i++) {                                             // brass lugs
    c.fillStyle = p.brass; c.strokeStyle = p.brassLine; c.lineWidth = 0.8;
    draw.roundRect(c, i * 6.6 - 1.1, 1.6 + (i ? 0 : 0.8), 2.2, 4, 0.9); c.fill(); c.stroke();
  }
  draw.sticker(c, cc => draw.ellipse(cc, 0, 0, 12.4, 4.4), { fill: p.brass, outline: p.iLine, lineWidth: 1.8, highlight: 0.5, shadow: 0.1 });   // hoop
  c.fillStyle = p.drumHead; c.beginPath(); c.ellipse(0, -0.3, 10.4, 3.2, 0, 0, TAU); c.fill();                // head
  c.strokeStyle = p.gloss; c.globalAlpha = 0.8; c.lineWidth = 1;
  c.beginPath(); c.ellipse(-1.5, -0.9, 6.5, 1.6, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); c.globalAlpha = 1;
}
const TOM_BOX = [-15, -7, 30, 24];
// synth: origin = the slab's top centre (y down). A wide dark slab (~0.85 of the round) with a thin LED panel on top and a
// chunky white key bed along the front: 8 big white keys under ONE 2 + 3 group of black keys (reads as "piano" at 40 px,
// where a full row of thin black keys turned to grey noise), a pink trim on the front lip
const KEY_W = 8, KEY_BLACK = [1, 2, 4, 5, 6];       // white keys; black keys sit on these white-key boundaries
const KEY_X = 35, KEY_TOP = 3.4, KEY_BOT = 9.6, SLAB_H = 11.4;
function bakeKeys(c, p) {
  draw.sticker(c, cc => draw.roundRect(cc, -KEY_X - 2.4, 0, KEY_X * 2 + 4.8, SLAB_H, 3), { fill: p.synth, outline: p.iLine, lineWidth: 2, highlight: 0.3, shadow: 0.24 });
  c.fillStyle = p.synthTop; draw.roundRect(c, -KEY_X, 0.9, KEY_X * 2, 2, 1); c.fill();
  c.fillStyle = p.led2; c.beginPath(); c.arc(-KEY_X + 3, 1.9, 1.05, 0, TAU); c.arc(-KEY_X + 6.4, 1.9, 1.05, 0, TAU); c.fill();
  draw.sticker(c, cc => draw.circle(cc, -KEY_X + 11.5, 1.9, 1.5), { fill: p.brass, outline: p.iLine, lineWidth: 0.8, highlight: 0.5 });
  c.fillStyle = p.led; for (let i = 0; i < 5; i++) c.fillRect(KEY_X - 16 + i * 3, 1.2, 1.8, 1.4);
  const kw = KEY_X * 2 / KEY_W;
  c.fillStyle = p.keyW; c.strokeStyle = p.iLine; c.lineWidth = 1.1;
  c.beginPath(); c.rect(-KEY_X, KEY_TOP, KEY_X * 2, KEY_BOT - KEY_TOP); c.fill(); c.stroke();
  c.lineWidth = 0.9; c.globalAlpha = 0.8; c.beginPath();
  for (let i = 1; i < KEY_W; i++) { const x = -KEY_X + i * kw; c.moveTo(x, KEY_TOP); c.lineTo(x, KEY_BOT); }
  c.stroke(); c.globalAlpha = 1;
  c.fillStyle = p.keyB;
  for (let i = 0; i < KEY_BLACK.length; i++) { const x = -KEY_X + KEY_BLACK[i] * kw; draw.roundRect(c, x - 2.2, KEY_TOP - 0.2, 4.4, 3.9, 0.8); c.fill(); }
  c.strokeStyle = p.gloss; c.lineWidth = 0.8; c.globalAlpha = 0.7;              // a glint along the white keys' front edge
  c.beginPath(); c.moveTo(-KEY_X + 1, KEY_BOT - 1.1); c.lineTo(KEY_X - 1, KEY_BOT - 1.1); c.stroke();
  c.strokeStyle = p.led; c.lineWidth = 1.2; c.globalAlpha = 0.95;                // the pink trim along the front lip
  c.beginPath(); c.moveTo(-KEY_X + 1, SLAB_H - 0.9); c.lineTo(KEY_X - 1, SLAB_H - 0.9); c.stroke(); c.globalAlpha = 1;
}
const KEYS_BOX = [-KEY_X - 5, -3, KEY_X * 2 + 10, SLAB_H + 6];
// the synth's X stand under the slab: origin = the slab's top centre, the floor at -TUNE.inst.keys.y below it; two
// splayed legs crossing at a brass pivot, rubber feet on the floor
function bakeStand(c, p) {
  const fy = -TUNE.inst.keys.y, top = SLAB_H - 1.5, sx = KEY_X * 0.62, fx = KEY_X * 0.5;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-sx, top); c.lineTo(fx, fy - 1); c.moveTo(sx, top); c.lineTo(-fx, fy - 1);
  c.strokeStyle = p.iLine; c.lineWidth = 4.2; c.stroke(); c.strokeStyle = p.stand; c.lineWidth = 2.2; c.stroke();
  c.fillStyle = p.iLine; draw.roundRect(c, fx - 3, fy - 2, 6, 2, 1); c.fill(); draw.roundRect(c, -fx - 3, fy - 2, 6, 2, 1); c.fill();
  draw.sticker(c, cc => draw.circle(cc, 0, top + (fy - 1 - top) * sx / (sx + fx), 1.7), { fill: p.brass, outline: p.iLine, lineWidth: 1, highlight: 0.5 });
}
const STAND_BOX = [-KEY_X, SLAB_H - 6, KEY_X * 2, 14];
// bass: origin = the body centre, the neck along +x
function bassBody(cc) {
  cc.beginPath(); cc.moveTo(12, -6); cc.quadraticCurveTo(7, -6.5, 4, -8);
  cc.bezierCurveTo(-2, -12.5, -14, -11.5, -15, -2); cc.bezierCurveTo(-16, 8, -6, 12.5, 2, 9.5);
  cc.quadraticCurveTo(6, 8, 11, 9.2); cc.quadraticCurveTo(13, 9.4, 11.8, 6.6); cc.quadraticCurveTo(9, 3.2, 9, 0);
  cc.quadraticCurveTo(9, -3, 13.6, -4.6); cc.quadraticCurveTo(14.8, -5.6, 12, -6); cc.closePath();
}
function neck(c, p, x0, x1, hw, wood, frets, dots) {
  draw.sticker(c, cc => draw.roundRect(cc, x0, -hw, x1 - x0, hw * 2, 1.4), { fill: wood, outline: p.iLine, lineWidth: 1.5, highlight: 0.3, shadow: 0.15 });
  c.strokeStyle = frets; c.lineWidth = 0.75; c.globalAlpha = 0.75; c.beginPath();
  for (let x = x0 + 6, g = 5.4; x < x1 - 1; x += g, g *= 0.93) { c.moveTo(x, -hw + 0.6); c.lineTo(x, hw - 0.6); }
  c.stroke(); c.globalAlpha = 1;
  c.fillStyle = dots;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x0 + 13 + i * 9, 0, 0.75, 0, TAU); c.fill(); }
}
function strings(c, p, x0, x1, n, gap) {
  c.strokeStyle = p.string; c.lineWidth = 0.42; c.globalAlpha = 0.75; c.beginPath();
  for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * gap; c.moveTo(x0, y); c.lineTo(x1, y); }
  c.stroke(); c.globalAlpha = 1;
}
function pegs(c, p, xs, y) {
  for (let i = 0; i < xs.length; i++) draw.sticker(c, cc => draw.circle(cc, xs[i], y, 1.3), { fill: p.peg, outline: p.iLine, lineWidth: 0.9, highlight: 0.4 });
}
// the bass: a long maple neck (~1.4x the guitar's) on a big sunburst body (amber core, deep red-brown edge), a cream
// pickguard, four fat strings and a 2 + 2 headstock: a long diagonal with a warm blob at the end, unlike the red V
const BASS_NECK = 62, BASS_BODY = 1.14;
function bakeBass(c, p) {
  neck(c, p, 6, BASS_NECK, 3, p.wood, p.woodDark, p.woodDark);
  const h0 = BASS_NECK - 1;
  pegs(c, p, [h0 + 3.6, h0 + 7.8], -6.2); pegs(c, p, [h0 + 3.6, h0 + 7.8], 6.2);
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(h0, -3.4); cc.lineTo(h0 + 10.5, -5.6); cc.quadraticCurveTo(h0 + 13.8, -5.8, h0 + 13.2, -2.6);
    cc.lineTo(h0 + 12.2, 2.6); cc.quadraticCurveTo(h0 + 11.8, 4.3, h0 + 9.5, 3.9); cc.lineTo(h0, 3.4); cc.closePath(); },
    { fill: p.head, outline: p.iLine, lineWidth: 1.5, highlight: 0.3, shadow: 0.1, bounds: [h0, -5.8, 13.8, 10.1] });
  c.save(); c.scale(BASS_BODY, BASS_BODY);
  bassBody(c); c.fillStyle = p.bassBody; c.fill();
  c.save(); bassBody(c); c.clip();                                           // the sunburst: amber core -> red-brown edge
  c.fillStyle = draw.radial(c, -2.5, -0.5, 0, 17, [[0, p.bassHi], [0.42, p.bassBody], [0.78, p.bassEdge], [1, p.bassEdge]]);
  c.fillRect(-17, -13, 33, 24);
  c.restore();
  draw.sticker(c, bassBody, { fill: 'rgba(0,0,0,0)', outline: p.iLine, lineWidth: 2, highlight: 0.42, shadow: 0.2, bounds: [-16, -12.5, 31, 22] });
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(-9, 2); cc.quadraticCurveTo(-12, 8.5, -4, 8.6); cc.quadraticCurveTo(3, 8.4, 6, 4.2); cc.lineTo(0, 1.6); cc.closePath(); },
    { fill: p.guard, outline: p.iLine, lineWidth: 1, highlight: 0.3, shadow: 0.1, bounds: [-12, 1.6, 18, 7] });
  c.fillStyle = p.iLine; draw.roundRect(c, -3.4, -4.4, 3.4, 8.8, 1.2); c.fill();   // pickup
  draw.roundRect(c, -11.2, -3.6, 2.6, 7.2, 0.8); c.fill();                          // bridge
  c.restore();
  strings(c, p, -10 * BASS_BODY, BASS_NECK + 1, 4, 1.3);
}
const BASS_BOX = [-21, -16, BASS_NECK + 37, 32];
// flying V: origin = the body centre (the apex joins the neck along +x)
function vBody(cc) {
  cc.beginPath(); cc.moveTo(10, -3.2); cc.lineTo(-16, -13.6); cc.quadraticCurveTo(-20.4, -14.8, -19.8, -10.6); cc.lineTo(-9, 0);
  cc.lineTo(-19.8, 10.6); cc.quadraticCurveTo(-20.4, 14.8, -16, 13.6); cc.lineTo(10, 3.2); cc.quadraticCurveTo(12.4, 0, 10, -3.2); cc.closePath();
}
// the flying V: a short dark neck (the bass's is ~1.4x longer), six thin strings, a 3 + 3 arrow headstock
const GTR_NECK = 45;
function bakeGuitar(c, p) {
  neck(c, p, 7, GTR_NECK, 2.3, p.woodDark, p.peg, p.peg);
  const h0 = GTR_NECK - 1;
  pegs(c, p, [h0 + 4, h0 + 7.4, h0 + 10.8], -5.2); pegs(c, p, [h0 + 4, h0 + 7.4, h0 + 10.8], 5.2);
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(h0, -3); cc.lineTo(h0 + 11, -4.6); cc.lineTo(h0 + 14, 0); cc.lineTo(h0 + 11, 4.6); cc.lineTo(h0, 3); cc.closePath(); },
    { fill: p.head, outline: p.iLine, lineWidth: 1.5, highlight: 0.3, shadow: 0.1, bounds: [h0, -4.6, 14, 9.2] });
  draw.sticker(c, vBody, { fill: p.vBody, outline: p.iLine, lineWidth: 2, highlight: 0.42, shadow: 0.22, bounds: [-20.4, -14.8, 32.8, 29.6] });
  c.strokeStyle = p.vEdge; c.lineWidth = 1.1; c.globalAlpha = 0.7;            // the bevel along the inner edges of the wings
  c.beginPath(); c.moveTo(-16.6, -10.6); c.lineTo(-7.4, -1.2); c.moveTo(-16.6, 10.6); c.lineTo(-7.4, 1.2); c.stroke(); c.globalAlpha = 1;
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(7, -2.2); cc.lineTo(-5.6, -6.8); cc.lineTo(-5.6, 6.8); cc.lineTo(7, 2.2); cc.closePath(); },
    { fill: p.guard, outline: p.iLine, lineWidth: 1, highlight: 0.3, shadow: 0.1, bounds: [-5.6, -6.8, 12.6, 13.6] });
  c.fillStyle = p.iLine; draw.roundRect(c, -3.6, -3.4, 2.6, 6.8, 0.9); c.fill(); draw.roundRect(c, 1.4, -3.4, 2.6, 6.8, 0.9); c.fill();
  strings(c, p, -8, GTR_NECK + 1, 6, 0.7);
}
const GUITAR_BOX = [-23, -17, GTR_NECK + 39, 34];
// mic: origin = the grip, the ball head up
function bakeMic(c, p) {
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(-2.8, -6); cc.lineTo(2.8, -6); cc.lineTo(1.9, 9); cc.quadraticCurveTo(0, 10.6, -1.9, 9); cc.closePath(); },
    { fill: p.micBody, outline: p.iLine, lineWidth: 1.6, highlight: 0.35, shadow: 0.15, bounds: [-2.8, -6, 5.6, 16.6] });
  draw.sticker(c, cc => draw.roundRect(cc, -3.6, -8.6, 7.2, 3, 1.1), { fill: p.micRing, outline: p.iLine, lineWidth: 1.1, highlight: 0.4 });
  const head = cc => draw.circle(cc, 0, -14, 6.1);
  draw.sticker(c, head, { fill: p.micHead, outline: p.iLine, lineWidth: 1.8, highlight: 0.45, shadow: 0.25 });
  c.save(); head(c); c.clip();                                               // the grille mesh
  c.strokeStyle = p.micGrille; c.lineWidth = 0.6; c.globalAlpha = 0.85; c.beginPath();
  for (let i = -4; i <= 4; i++) { c.moveTo(i * 2 - 7, -21); c.lineTo(i * 2 + 7, -7); c.moveTo(i * 2 + 7, -21); c.lineTo(i * 2 - 7, -7); }
  c.stroke(); c.restore(); c.globalAlpha = 1;
  c.strokeStyle = p.gloss; c.lineWidth = 1.2; c.globalAlpha = 0.9;
  c.beginPath(); c.arc(0, -14, 4.2, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.globalAlpha = 1;
}
const MIC_BOX = [-9, -23, 18, 35];
const INST_BAKE = { drum: bakeTom, keys: bakeKeys, bass: bakeBass, guitar: bakeGuitar, mic: bakeMic };
const INST_BOX = { drum: TOM_BOX, keys: KEYS_BOX, bass: BASS_BOX, guitar: GUITAR_BOX, mic: MIC_BOX };
const INST_GROUND = { drum: 1, keys: 1 };

const HAT_BAKE = { party: bakeParty, top: bakeTop, crown: bakeCrown };
const HAT_TOP = { party: 42, top: 33, crown: 31, paper: 34 };   // hat height above its seat (unscaled), for bounds()
const HAT_BOX = { party: [-18, -44, 36, 50], top: [-23, -36, 46, 42], crown: [-21, -32, 42, 38] };
const PAPER_BOX = [-19, -36, 40, 44];
const TAIL_BOX = [-30, -28, 38, 36];
const RTAIL_BOX = [-30 - TUNE.tail.ext, -28 - TUNE.tail.ext * 0.5, 38 + TUNE.tail.ext, 36 + TUNE.tail.ext * 0.5];   // real: longer stalk
const BOW_BOX = [-14, -9, 28, 24];
const WING_BOX = [-26, -21, 32, 30];
const Z_BOX = [-9, -9, 18, 18];
const DROP_BOX = [-7, -9, 14, 18];
const DROP_BOT = 7.8;                       // the drop sprite's lowest point below its origin (units, incl. the outline)
const scaled = (r, k) => [-r * k - 3, -r * k - 3, r * k * 2 + 6, r * k * 2 + 6];

// particles
particles.define('actorDust', {
  count: 4, speed: [25, 70], angle: -Math.PI / 2, spread: 2.4, life: [0.32, 0.55], size: [4, 10], sizeJitter: 0.35,
  colors: ['#c9c3ea', '#9e97c9', '#e6e1fa'], shape: 'circle', alpha: [0.28, 0.45], alphaCurve: 'fadeOut', drag: 5, gravity: -30, layer: 'front',
});
particles.define('actorPuff', {
  count: 10, speed: [40, 130], life: [0.45, 0.8], size: [9, 22], sizeJitter: 0.35, colors: ['#ffffff', '#e9e2ff', '#cfc6f5'],
  shape: 'blob', alpha: [0.6, 0.85], alphaCurve: 'soft', drag: 3.5, gravity: -40, wobble: 4, wobbleFreq: [2, 4], layer: 'front',
});
// the BUSTED rip (TUNE.rip): a quick white puff where the fake part tore off + scraps of it fluttering out (colours per part)
particles.define('actorRipPuff', {
  count: 5, speed: [45, 110], life: [0.2, 0.34], size: [5, 12], sizeJitter: 0.3, colors: ['#ffffff', '#f3efff', '#e2dcf7'],
  shape: 'blob', alpha: [0.8, 0.95], alphaCurve: 'fadeOut', drag: 8, gravity: -25, layer: 'front',
});
particles.define('actorRipBits', {
  count: 7, speed: [80, 200], angle: -Math.PI / 2, spread: 2.6, life: [0.38, 0.62], size: [4, 2.5], sizeJitter: 0.4,
  colors: ['#dfe6f3', '#c3cde0', '#ff3f86', '#fff1b3'], shape: 'rect', gravity: 560, drag: 2.6, spin: [-14, 14], rot: 'random',
  flutter: true, flutterFreq: [10, 18], alphaCurve: 'fadeLate', layer: 'front',
});
const OV_RIP_PUFF = { count: 5 };
const OV_RIP_PAPER = { colors: ['#dfe6f3', '#c3cde0', '#ff3f86', '#fff1b3'] };   // newsprint, crayon, tape
const OV_RIP_GOO = { colors: ['#ffffff', '#cfd8ea', '#fff1b3', '#29213a'] };      // googly white, rim, tape, pupil
const OV_RIP_TAIL = {};                                                            // per colour: costume fluff + ribbon
for (const k in COLORS) OV_RIP_TAIL[k] = { colors: [color.light(COLORS[k], 0.3), COLORS[k], '#ff3f86', '#fff1b3'] };
const OV_DUST = { count: 3 };
const OV_DUST_BIG = { count: 6 };
const OV_STARS = { count: 6 };
const OV_SPARK = { count: 12 };
const OV_POP = { colors: null, count: 14 };
const POP_COLS = {};
for (const k in COLORS) POP_COLS[k] = [COLORS[k], color.light(COLORS[k], 0.4), '#ffffff'];

// ------------------------------------------------------------------------------------------------ arm shaft path
// Scratch of the arm being drawn (drawArm fills it): elbow (ex, ey), curve control (kx, ky), shaft end (hx, hy), unit
// normals at the shoulder (n0), the wrist (n1) and the elbow (nk), the width factor through the bend (m), joint style.
const AQ = { ex: 0, ey: 0, kx: 0, ky: 0, hx: 0, hy: 0, n0x: 1, n0y: 0, n1x: 1, n1y: 0, nkx: 1, nky: 0, m: 1, joint: false };
// The shaft outline at half-widths ws (shoulder) / wm (elbow) / ww (wrist); cap = round the shoulder end (behind it).
function armPath(ctx, ws, wm, ww, cap) {
  const q = AQ, wk = wm * q.m;
  ctx.beginPath();
  ctx.moveTo(-q.n0x * ws, -q.n0y * ws);
  if (q.joint) { ctx.lineTo(q.kx - q.nkx * wk, q.ky - q.nky * wk); ctx.lineTo(q.hx - q.n1x * ww, q.hy - q.n1y * ww); }
  else ctx.quadraticCurveTo(q.kx - q.nkx * wk, q.ky - q.nky * wk, q.hx - q.n1x * ww, q.hy - q.n1y * ww);
  ctx.lineTo(q.hx + q.n1x * ww, q.hy + q.n1y * ww);
  if (q.joint) { ctx.lineTo(q.kx + q.nkx * wk, q.ky + q.nky * wk); ctx.lineTo(q.n0x * ws, q.n0y * ws); }
  else ctx.quadraticCurveTo(q.kx + q.nkx * wk, q.ky + q.nky * wk, q.n0x * ws, q.n0y * ws);
  if (cap) { const a = Math.atan2(q.n0y, q.n0x); ctx.arc(0, 0, ws, a, a - Math.PI, true); }
  ctx.closePath();
}

// The blob's drum stroke: the arm angle (rad up from hanging) ts s after its last hit, for a hit every `sec` s: rebound
// from the hit up over strikeOut (outCubic), a wind-up lift to drumUp + drumWind, then the strikeIn down-stroke (outQuad)
// that lands on the next hit
function drumArm(ts, sec) {
  const D = TUNE.dance, tIn = sec - D.strikeIn;
  if (ts < D.strikeOut) return lerp(D.drumDown, D.drumUp, easeIndex.outCubic(ts / D.strikeOut));
  if (ts >= tIn) return lerp(D.drumUp + D.drumWind, D.drumDown, easeIndex.outQuad(clamp((ts - tIn) / D.strikeIn, 0, 1)));
  return D.drumUp + D.drumWind * easeIndex.inOutSine(clamp((ts - D.strikeOut) / (tIn - D.strikeOut), 0, 1));
}

// ------------------------------------------------------------------------------------------------ spec helpers
function setAttr(d, attr, v) {
  if (attr === 'color') { if (COLORS[v]) d.color = v; }
  else if (attr === 'eyes') { if (v === 1 || v === 2 || v === 3) d.eyes = v; }
  else if (attr === 'hat') { if (HATS[v]) d.hat = v; }
  else if (attr === 'tail') d.tail = !!v;
  else if (attr === 'pattern') { if (PATTERNS[v]) d.pattern = v; }
  else if (attr === 'species') { if (SP[v]) d.species = v; }
}
function applySpec(d, s) {
  if (!s) return;
  setAttr(d, 'species', s.species); setAttr(d, 'color', s.color); setAttr(d, 'eyes', s.eyes);
  setAttr(d, 'hat', s.hat); if (s.tail !== undefined) setAttr(d, 'tail', s.tail); setAttr(d, 'pattern', s.pattern);
  if (s.fake) { d.fake.eyes = s.fake.eyes ? 1 : 0; d.fake.hat = !!s.fake.hat; d.fake.tail = !!s.fake.tail; }
}
function makeSpec(src) {
  const d = { species: 'blob', color: 'coral', eyes: 2, hat: 'none', tail: false, pattern: 'none', fake: { eyes: 0, hat: false, tail: false }, outfit: '' };
  applySpec(d, src);
  d.outfit = outfitTheme(src && src.outfit);   // a band outfit (cosmetic; never on a judged guest)
  const pre = src && src.pre;       // a shapeshifter starts as its pre-shift snapshot (data.js); { attr, value } also accepted
  if (pre && typeof pre === 'object') {
    if (pre.attr !== undefined && pre.value !== undefined) setAttr(d, pre.attr, pre.value);
    else applySpec(d, pre);
  }
  return d;
}
const FINAL = { species: 'blob', color: 'coral', eyes: 2, hat: 'none', tail: false, pattern: 'none', fake: { eyes: 0, hat: false, tail: false }, outfit: '' };
function finalSpec(s) {              // the FINAL (judged) state of a guest with any shapeshifter pre stripped (reused object)
  const f = s.fake || NO, m = FINAL;
  m.species = s.species; m.color = s.color; m.eyes = s.eyes; m.hat = s.hat; m.tail = !!s.tail; m.pattern = s.pattern; m.outfit = outfitTheme(s.outfit);
  m.fake.eyes = f.eyes ? 1 : 0; m.fake.hat = !!f.hat; m.fake.tail = !!f.tail;
  return m;
}
function dimLevel(d) {               // index of the nearest TUNE.dim.levels entry
  const L = TUNE.dim.levels;
  let bi = 0, be = 9;
  for (let i = 0; i < L.length; i++) { const e = d > L[i] ? d - L[i] : L[i] - d; if (e < be) { be = e; bi = i; } }
  return bi;
}
function bucketFor(s) {
  const B = TUNE.buckets;
  for (let i = 0; i < B.length; i++) if (s <= B[i] * 1.08) return i;
  return B.length - 1;
}
function makeProp() {
  return { on: false, fake: false, kind: '', bx: 0, by: 0, th: 0, base: 0, L: 10, k: 300, c: 22, max: 6, posK: 0.2, sag: 0, rotK: 1,
    ax: 0, ay: 0, tx: 0, ty: 0, px: 0, py: 0, vx: 0, vy: 0, accX: 0, accY: 0, delta: 0, dr: 0, ox: 0, oy: 0, fresh: true, sw: 0, ph: 0 };
}

// ------------------------------------------------------------------------------------------------ band outfits
// The cosmetic outfits of the House Band (docs/MONETIZATION.md §3.3: outfit.<theme>.<species>), worn by band dancers only
// (the party window, the dressing room, the result row, the share card; never a guest in the queue). An outfit is four
// layers over the rig: HEADWEAR on the hat anchor (it replaces any hat, real or paper, and rides the stiff real-prop
// spring; a bandana's knot tails, a helmet antenna and a crown jewel's glint add live bits), EYEWEAR over the eyes of
// the layout (baked per eye layout, drawn with the face offset; beach wears none), a TORSO piece baked in body space and
// clipped to the silhouette below the shoulders and around the face (OFIT hole), plus SLEEVES on the arm shafts, an
// optional BACK piece (a cape with an ermine collar / cloak / bat collar behind the body that sways with it, or the far
// half of the float ring), SHOULDER pieces over both arm roots that ride the shoulder as the arms rise (OPAD), the
// float ring's near half over the torso, the neon jacket's additive light-up layer, and an INSTRUMENT skin (palette
// swap + trim motif of the species' own instrument). spec.outfit = a theme key (or 'outfit.<theme>.<species>'), '' none.
export const OUTFIT_THEMES = ['neon', 'royal', 'desert', 'beach', 'space', 'spooky', 'rock'];
const OUT_OK = { neon: 1, royal: 1, desert: 1, beach: 1, space: 1, spooky: 1, rock: 1 };
// 'outfit.neon.blob' | 'neon' -> 'neon'; anything else -> ''
export function outfitTheme(id) {
  if (typeof id !== 'string' || !id) return '';
  if (OUT_OK[id]) return id;
  const a = id.indexOf('.'), b = id.indexOf('.', a + 1), t = a >= 0 ? id.slice(a + 1, b > a ? b : id.length) : '';
  return OUT_OK[t] ? t : '';
}
// colours per theme (dimmed with the wearer by outPal); sleeve / sleeveInk / cuff: the arm shafts (short = to the elbow);
// back = the piece behind the body ('cape' | 'cloak' | 'bat' | 'ring': the far half of the beach float ring); eyes = it
// wears an eyewear layer; pad = shoulder pieces on both arm roots ('' none); lit = the jacket's neon lines light up on the beat
const OUT = {
  neon: { sleeve: '#221d44', sleeveInk: '#07061a', cuff: '#3df0ff', short: false, back: '', eyes: true, pad: 'neon', lit: true,
    col: { fab: '#221d44', fabHi: '#3a3470', ink: '#07061a', pipe: '#3df0ff', pipe2: '#ff3fb4', zip: '#d6dcff', patch: '#ff3fb4', led: '#3df0ff', paint: '#b6ff3a' } },
  royal: { sleeve: '', sleeveInk: '', cuff: '', short: false, back: 'cape', eyes: true, pad: '', lit: false,
    col: { fab: '#6b1d5e', fabHi: '#9a3485', ink: '#2a0724', gold: '#ffc94a', goldHi: '#fff0b0', goldInk: '#7a4a08', ruff: '#fbf6ec', ruffInk: '#7d7598', lining: '#e8b84a',
      pearl: '#fffaf2', gem: '#3dd6ff', gemR: '#ff3d6e', gemG: '#3ddc84', lens: '#cfefff', fur: '#fffdf8', furInk: '#8a83a6', furSpot: '#1a1420' } },
  desert: { sleeve: '#74452a', sleeveInk: '#2a160a', cuff: '#f2e6cf', short: false, back: 'cloak', eyes: true, pad: '', lit: false,
    col: { fab: '#74452a', fabHi: '#94603a', ink: '#2a160a', fleece: '#f2e6cf', fleeceInk: '#a08860', emb: '#e2ac3f', sadR: '#b3203a', sadK: '#231616',
      sadW: '#f5ecda', sadO: '#e0a030', beanie: '#3d2b27', beanieHi: '#5a4038', brass: '#d9a441', brassInk: '#6a430c', glass: '#ffb347', lining: '#f2e6cf' } },
  beach: { sleeve: '#1fa9a1', sleeveInk: '#0b4744', cuff: '#e8fffb', short: true, back: 'ring', eyes: false, pad: '', lit: false,
    col: { fab: '#1fa9a1', fabHi: '#52cfc4', ink: '#0b4744', flowerA: '#ff6f91', flowerB: '#ffd166', flowerC: '#fff4dc', leaf: '#1e6f4a', collar: '#e8fffb',
      straw: '#e9c46a', strawHi: '#f8e3a3', strawInk: '#7a5418', band: '#e76f51', button: '#fff4dc',
      ringA: '#ff5d8f', ringB: '#fff6e6', ringInk: '#7a1a36', ringShade: '#c23a66', valve: '#ffd166' } },
  space: { sleeve: '#c9d2e4', sleeveInk: '#3e4a66', cuff: '#3df0ff', short: false, back: '', eyes: true, pad: '', lit: false,
    col: { fab: '#c9d2e4', fabHi: '#f4f7fd', ink: '#3e4a66', seam: '#8792ad', collar: '#7d89a6', collarHi: '#b7c1d8', led: '#3df0ff', led2: '#ff3fb4', led3: '#9dff6a',
      glass: '#bfe9ff', visor: '#3d7be0', chrome: '#e4ecf8', chromeInk: '#45506c' } },
  spooky: { sleeve: '', sleeveInk: '', cuff: '', short: false, back: 'bat', eyes: true, pad: '', lit: false,
    col: { fab: '#2c1f3d', fabHi: '#46315f', ink: '#0d0716', lining: '#ff8c1a', pumpkin: '#ff8c1a', pumpkinHi: '#ffb04d', pumpkinInk: '#7a3406', stem: '#4d7a2a',
      stemInk: '#1e3510', glowC: '#ffe08a', mask: '#5b2f86', maskHi: '#8a55c0', brooch: '#b6ff7a' } },
  rock: { sleeve: '#26222e', sleeveInk: '#08060c', cuff: '#d9dee9', short: false, back: '', eyes: true, pad: 'rock', lit: false,
    col: { fab: '#26222e', fabHi: '#433d52', ink: '#08060c', stud: '#e6e9f2', studHi: '#ffffff', studInk: '#4f5466', zip: '#cfd4e0', bandana: '#d62839', bandanaHi: '#f0545f',
      bandanaInk: '#5a0a16', dot: '#fff4dc', frame: '#e8322f', lens: '#170f1e', flame: '#ff8a1a', flame2: '#ffd23f', pin: '#ffd23f' } },
};
// per species fit (body units): hat = headwear [dx, dy from the hat anchor, scale, rot]; top = the shoulder line at the
// centre (it slopes down `slope` per unit outward); hole = the face opening [cx, cy, rx, ry] a torso never covers (null:
// the face sits on a separate head); cx = the garment's centre line; hem = its bottom; cape = the back piece [cx, top y,
// top half width, hem y, hem half width]; neck = [x, y, half width] of the neckline ornaments (ruff, collar, clasp);
// open = the half width of an open cloak's front gap at the shoulders; gog = the goggles' height above the eyes (x r);
// bub = the space helmet's glass bubble round the head [cx, cy, rx, ry, collar y] (space wears no hat: the bubble is it);
// ring = the beach float ring round the hips [cx, cy, rx, ry, tube] (its far half behind the body, its near half over the
// torso, under the face, instrument and arms); pad = the scale of the shoulder pieces (neon light-up pads, rock spikes)
const OFIT = {
  blob: { bub: [4, -52, 50, 46, -14], hat: [0, 2, 0.8, 0.04], top: -52, slope: 0.32, hole: [6, -41, 31, 25], cx: 6, hem: -5, cape: [3, -64, 38, -3, 58], neck: [6, -16, 20], open: 10, gog: 1.75,
    ring: [3, -21, 52, 16, 8], pad: 1 },
  tall: { bub: [6, -121, 29, 29, -97], hat: [1, 1, 0.92, 0.08], top: -77, slope: 0.2, hole: null, cx: 1, hem: -26, cape: [2, -80, 13, -10, 31], neck: [1, -77, 12], open: 5, gog: 1.55,
    ring: [4, -40, 27, 10, 6.5], pad: 0.8 },
  round: { bub: [4, -50, 50, 46, -12], hat: [0, 3, 0.95, 0], top: -54, slope: 0.3, hole: [5, -40, 33, 27], cx: 5, hem: -4, cape: [2, -72, 34, -3, 54], neck: [5, -13, 20], open: 10, gog: 1.6,
    ring: [3, -21, 40, 15, 8], pad: 0.95 },
  square: { bub: [4, -60, 51, 50, -22], hat: [-1, 2, 0.95, 0], top: -68, slope: 0.25, hole: [6, -55, 34, 28], cx: 6, hem: -9, cape: [4, -90, 38, -4, 56], neck: [6, -27, 22], open: 10, gog: 1.7,
    ring: [4, -25, 50, 16, 8], pad: 1 },
  bean: { bub: [7, -84, 34, 36, -50], hat: [0, 2, 0.88, 0.2], top: -49, slope: 0.22, hole: [12, -57, 21, 11], cx: 3, hem: -7, cape: [2, -64, 25, -3, 40], neck: [10, -46, 15], open: 7, gog: 1.7,
    ring: [2, -27, 36, 14, 7.5], pad: 0.9 },
};
const OHEAD_BOX = { neon: [-20, -28, 48, 34], royal: [-21, -44, 42, 50], desert: [-20, -40, 40, 44], beach: [-31, -28, 62, 34], space: [-25, -54, 50, 58],
  spooky: [-21, -40, 42, 44], rock: [-20, -22, 40, 26] };
const OHEAD_TOP = { neon: 24, royal: 41, desert: 36, beach: 24, space: 50, spooky: 37, rock: 19 };   // height above the seat (bounds)
const OHEAD_HALF = { neon: 27, royal: 20, desert: 17, beach: 29, space: 0, spooky: 22, rock: 30 };    // half width about the seat (bounds)
// the shoulder piece (local: origin = the shoulder, +x = outward, y up negative): its bake box and its reach past the
// shoulder (out = outward, up = above it) for bounds()
const OPAD_BOX = { neon: [-11, -15, 33, 26], rock: [-12, -27, 38, 36] };
const OPAD_OUT = { neon: 21, rock: 25 }, OPAD_UP = { neon: 14, rock: 26 };
// the instrument skins: palette keys of the instrument bakes (dimmed with the wearer) + the world's kick / keyboard kit
const OUT_INST = {
  neon: { drumShell: '#17142e', drumBand: '#2b2550', brass: '#3df0ff', brassLine: '#0a5a66', drumHead: '#e9e6ff', stand: '#2b2550', synth: '#120f26', synthTop: '#2b2550',
    led: '#ff3fb4', led2: '#3df0ff', bassBody: '#1d1938', bassHi: '#3a3270', bassEdge: '#0c0a1c', guard: '#ff3fb4', vBody: '#1d1938', vEdge: '#3df0ff',
    micBody: '#1d1938', micRing: '#3df0ff', micHead: '#d9e1ff', head: '#141028', wood: '#2b2550', woodDark: '#141028',
    kit: { shell: '#17142e', shellDeep: '#0a0818', band: '#24204a', head: '#f1efff', ribbon: '#ff3fb4', ribbonInk: '#4a0a30', lug: '#3df0ff', lugInk: '#0a5a66',
      slab: '#141028', slabInk: '#05040e', trim: '#3df0ff', knob: '#ff3fb4' } },
  royal: { drumShell: '#f4ead2', drumBand: '#e0b040', brass: '#ffd36a', brassLine: '#7a4a08', drumHead: '#fffaf0', stand: '#c9962c', synth: '#f1e6cc', synthTop: '#e0b040',
    led: '#ff3d6e', led2: '#3dd6ff', bassBody: '#f6eedb', bassHi: '#fffdf6', bassEdge: '#c8963c', guard: '#ffd36a', vBody: '#f4ead2', vEdge: '#c8963c',
    micBody: '#c9962c', micRing: '#fffaf0', micHead: '#ffe7a0', head: '#5a2a14', wood: '#6a3418', woodDark: '#3a1a0a',
    kit: { shell: '#6b1d5e', shellDeep: '#3a0c32', band: '#f4ead2', head: '#fffaf0', ribbon: '#ffc94a', ribbonInk: '#7a4a08', lug: '#ffd36a', lugInk: '#7a4a08',
      slab: '#f1e6cc', slabInk: '#6a4a14', trim: '#e0b040', knob: '#ff3d6e' } },
  desert: { drumShell: '#8a4a26', drumBand: '#b3203a', brass: '#d9a441', brassLine: '#6a430c', drumHead: '#ead6b0', stand: '#5a3420', synth: '#6e3a1e', synthTop: '#8a4a26',
    led: '#e0a030', led2: '#f5ecda', bassBody: '#7a4424', bassHi: '#b0703e', bassEdge: '#3a1a0c', guard: '#f2e6cf', vBody: '#8a4a26', vEdge: '#3a1a0c',
    micBody: '#5a3420', micRing: '#b3203a', micHead: '#e8d2a6', head: '#3a1a0c', wood: '#c08850', woodDark: '#3a1a0c',
    kit: { shell: '#8a4a26', shellDeep: '#4a2410', band: '#5a2a14', head: '#ecd8b2', ribbon: '#b3203a', ribbonInk: '#3a0610', lug: '#d9a441', lugInk: '#6a430c',
      slab: '#6e3a1e', slabInk: '#2a1208', trim: '#e0a030', knob: '#d9a441' } },
  beach: { drumShell: '#1fb5ad', drumBand: '#ffd166', brass: '#fff4dc', brassLine: '#4a6a66', drumHead: '#fffaf0', stand: '#e76f51', synth: '#1fb5ad', synthTop: '#7fdcd5',
    led: '#ff6f91', led2: '#ffd166', bassBody: '#ff9f1c', bassHi: '#ffe8a3', bassEdge: '#e2553a', guard: '#fff4dc', vBody: '#1fb5ad', vEdge: '#0b6a64',
    micBody: '#ff6f91', micRing: '#ffd166', micHead: '#fff4dc', head: '#e76f51', wood: '#f2d29b', woodDark: '#8a5a24',
    kit: { shell: '#1fb5ad', shellDeep: '#0b6a64', band: '#ffd166', head: '#fffaf0', ribbon: '#ff6f91', ribbonInk: '#7a1a36', lug: '#fff4dc', lugInk: '#4a6a66',
      slab: '#1fb5ad', slabInk: '#06403c', trim: '#ffd166', knob: '#ff6f91' } },
  space: { drumShell: '#b9c4d8', drumBand: '#6c7b99', brass: '#e8eef8', brassLine: '#45506c', drumHead: '#f4f8ff', stand: '#6c7b99', synth: '#cfd8e8', synthTop: '#9aa8c2',
    led: '#ff3fb4', led2: '#3df0ff', bassBody: '#c6d0e2', bassHi: '#ffffff', bassEdge: '#64728f', guard: '#3d4a66', vBody: '#c6d0e2', vEdge: '#64728f',
    micBody: '#7d89a6', micRing: '#3df0ff', micHead: '#eef3fb', head: '#45506c', wood: '#9aa8c2', woodDark: '#45506c',
    kit: { shell: '#b9c4d8', shellDeep: '#5d6a88', band: '#7d89a6', head: '#f4f8ff', ribbon: '#3d7be0', ribbonInk: '#122a5a', lug: '#e8eef8', lugInk: '#45506c',
      slab: '#cfd8e8', slabInk: '#3e4a66', trim: '#3df0ff', knob: '#ff3fb4' } },
  spooky: { drumShell: '#3a2a4a', drumBand: '#ff8c1a', brass: '#b6ff7a', brassLine: '#2e5a14', drumHead: '#efe6d0', stand: '#2c1f3d', synth: '#2c1f3d', synthTop: '#46315f',
    led: '#ff8c1a', led2: '#b6ff7a', bassBody: '#2d2238', bassHi: '#5a3a6a', bassEdge: '#120a1a', guard: '#b6ff7a', vBody: '#ff8c1a', vEdge: '#7a3406',
    micBody: '#2d2238', micRing: '#b6ff7a', micHead: '#e9e2f5', head: '#1c1428', wood: '#3a2a4a', woodDark: '#120a1a', string: '#c8ff9a',
    kit: { shell: '#3a2a4a', shellDeep: '#1c1428', band: '#2c1f3d', head: '#efe6d0', ribbon: '#ff8c1a', ribbonInk: '#5a2402', lug: '#b6ff7a', lugInk: '#2e5a14',
      slab: '#2c1f3d', slabInk: '#0d0716', trim: '#ff8c1a', knob: '#b6ff7a' } },
  rock: { drumShell: '#17131c', drumBand: '#e8322f', brass: '#dfe3ee', brassLine: '#4f5466', drumHead: '#f4f1ec', stand: '#2a2532', synth: '#17131c', synthTop: '#2a2532',
    led: '#e8322f', led2: '#ffd23f', bassBody: '#17131c', bassHi: '#3a3346', bassEdge: '#000000', guard: '#e8322f', vBody: '#17131c', vEdge: '#e8322f',
    micBody: '#17131c', micRing: '#e8322f', micHead: '#e6e9f2', head: '#17131c', wood: '#2a2532', woodDark: '#0c0a10',
    kit: { shell: '#17131c', shellDeep: '#050407', band: '#2a2532', head: '#f4f1ec', ribbon: '#e8322f', ribbonInk: '#4a0608', lug: '#dfe3ee', lugInk: '#4f5466',
      slab: '#17131c', slabInk: '#000000', trim: '#e8322f', knob: '#ffd23f' } },
};
// the world's kick drum + keyboard colours of an outfit theme (null = the house kit)
export function outfitKit(theme) { const o = OUT_INST[theme]; return o ? o.kit : null; }
// an outfit theme's headwear, undimmed, about the seat (origin = the top of the head, y up negative), for the cosmetic art
// outside the band (cosmetics-art.js: the DJ's theme hat, the owner's portrait in the party room). Bake time only
export function paintOutfitHead(c, theme) { if (OUT[theme]) bakeOHead(c, theme, outPal(theme, 0)); }
// a theme's colours (and instrument colours) dimmed to dim level dl (cached)
const OPAL = {}, OIPAL = {};
function outPal(theme, dl) {
  let row = OPAL[theme];
  if (!row) { row = []; OPAL[theme] = row; }
  let p = row[dl];
  if (p) return p;
  const d = TUNE.dim.levels[dl], src = OUT[theme].col;
  p = {};
  for (const k in src) p[k] = dimColor(src[k], d);
  p.glossA = 1 - TUNE.dim.glossFade * clamp(d / TUNE.dim.whiteAt, 0, 1);
  row[dl] = p;
  return p;
}
function instPal(theme, base, dl, key) {
  const k = theme + '.' + key + '.' + dl;
  let p = OIPAL[k];
  if (p) return p;
  p = {};
  for (const q in base) p[q] = base[q];
  const src = OUT_INST[theme], d = TUNE.dim.levels[dl];
  for (const q in src) if (q !== 'kit') p[q] = dimColor(src[q], d);
  OIPAL[k] = p;
  return p;
}
const OS = { fill: '#fff', outline: '#000', lineWidth: 2, highlight: 0.3, shadow: 0.15, bounds: null };
function ost(c, path, fill, ink, lw, hi, sh, bounds) {
  OS.fill = fill; OS.outline = ink; OS.lineWidth = lw === undefined ? 2 : lw; OS.highlight = hi === undefined ? 0.3 : hi;
  OS.shadow = sh === undefined ? 0.15 : sh; OS.bounds = bounds || null;
  draw.sticker(c, path, OS);
  OS.bounds = null;
}
// a soft neon tube: a wide glow stroke under a bright core (bake time; c's current path)
function neonStroke(c, col, w, glowW) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = color.alpha(col, 0.28); c.lineWidth = glowW; c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = w * 0.4; c.stroke();
  c.restore();
}
// a five-petal hibiscus (bake time) of radius r at (x, y)
function flower(c, x, y, r, petal, mid, ink, rot) {
  c.save(); c.translate(x, y); c.rotate(rot || 0);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5;
    c.beginPath(); c.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.58, r * 0.4, a, 0, TAU);
    c.fillStyle = petal; c.fill(); c.lineWidth = Math.max(0.6, r * 0.12); c.strokeStyle = ink; c.stroke();
  }
  c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fillStyle = mid; c.fill(); c.strokeStyle = ink; c.lineWidth = Math.max(0.5, r * 0.1); c.stroke();
  c.restore();
}
// Sadu weave band (bake time): a strip [x, y, w, h] of red / black / white triangle rows with an ochre stripe
function saduBand(c, x, y, w, h, p) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = p.sadR; c.fillRect(x, y, w, h);
  const s = h * 0.62;
  c.fillStyle = p.sadK;
  for (let u = x - s; u < x + w + s; u += s) { c.beginPath(); c.moveTo(u, y + h * 0.82); c.lineTo(u + s * 0.5, y + h * 0.2); c.lineTo(u + s, y + h * 0.82); c.closePath(); c.fill(); }
  c.fillStyle = p.sadW;
  for (let u = x - s; u < x + w + s; u += s) { c.beginPath(); c.moveTo(u + s * 0.28, y + h * 0.66); c.lineTo(u + s * 0.5, y + h * 0.36); c.lineTo(u + s * 0.72, y + h * 0.66); c.closePath(); c.fill(); }
  c.fillStyle = p.sadO; c.fillRect(x, y, w, h * 0.14); c.fillRect(x, y + h * 0.86, w, h * 0.14);
  c.restore();
}
// ---- headwear (origin = the seat on top of the head, y up negative; scaled by OFIT.hat[2] when drawn)
function bakeOHead(c, theme, p) {
  if (theme === 'neon') {        // an LED visor cap: a dark dome, a cyan LED band, a translucent cyan visor jutting forward
    const dome = cc => { cc.beginPath(); cc.moveTo(-15, 0); cc.bezierCurveTo(-16, -14, -9, -21, 0, -21); cc.bezierCurveTo(9, -21, 16, -14, 15, 0); cc.quadraticCurveTo(0, 3, -15, 0); cc.closePath(); };
    ost(c, dome, p.fab, p.ink, 2.4, 0.32, 0.2, [-16, -21, 32, 24]);
    c.save(); dome(c); c.clip(); c.strokeStyle = color.alpha(p.fabHi, 0.9); c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(0, -21); c.quadraticCurveTo(3, -10, 2, 0); c.moveTo(-8, -18); c.quadraticCurveTo(-8, -8, -10, 0); c.stroke(); c.restore();
    c.beginPath(); c.moveTo(-14.5, -4.2); c.quadraticCurveTo(0, -1.4, 14.5, -4.2); neonStroke(c, p.led, 1.8, 5.5);
    c.beginPath(); c.moveTo(9, -3); c.quadraticCurveTo(22, -5.5, 26, -1.5); c.quadraticCurveTo(20, 2.4, 10, 1.4); c.closePath();
    c.fillStyle = color.alpha(p.pipe, 0.5); c.fill(); c.lineWidth = 1.6; c.strokeStyle = p.ink; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(13, -2.4); c.quadraticCurveTo(20, -3.8, 23.5, -2); c.stroke();
    for (let i = 0; i < 3; i++) { c.fillStyle = i === 1 ? p.pipe2 : p.led; c.beginPath(); c.arc(-7 + i * 4.5, -12.5 + Math.abs(i - 1) * 1.2, 1.2, 0, TAU); c.fill(); }
    ost(c, cc => draw.circle(cc, 0, -21.5, 2.2), p.pipe2, p.ink, 1.2, 0.5, 0.1);
  } else if (theme === 'royal') {   // a TALL gold crown: five pearl-tipped points round a velvet cap, a jewelled band
    const cap = cc => { cc.beginPath(); cc.moveTo(-13, -8); cc.bezierCurveTo(-15, -26, -6, -31, 0, -31); cc.bezierCurveTo(6, -31, 15, -26, 13, -8); cc.closePath(); };
    ost(c, cap, p.fab, p.ink, 2.2, 0.4, 0.25, [-14, -31, 28, 23]);
    c.save(); cap(c); c.clip(); c.strokeStyle = color.alpha(p.ink, 0.45); c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-6, -29); c.quadraticCurveTo(-8, -18, -6, -8); c.moveTo(6, -29); c.quadraticCurveTo(8, -18, 6, -8); c.stroke(); c.restore();
    // the gold rim: a band with five points (the middle one tallest), each point carrying a pearl
    const PT = [[-15.5, -27], [-8, -32], [0, -37], [8, -32], [15.5, -27]];
    const rim = cc => {
      cc.beginPath(); cc.moveTo(-16, 0);
      cc.lineTo(-17, -7); cc.lineTo(PT[0][0], PT[0][1]); cc.lineTo(-11.5, -12);
      cc.lineTo(PT[1][0], PT[1][1]); cc.lineTo(-4, -13); cc.lineTo(PT[2][0], PT[2][1]); cc.lineTo(4, -13);
      cc.lineTo(PT[3][0], PT[3][1]); cc.lineTo(11.5, -12); cc.lineTo(PT[4][0], PT[4][1]); cc.lineTo(17, -7);
      cc.lineTo(16, 0); cc.quadraticCurveTo(0, 2.5, -16, 0); cc.closePath();
    };
    rim(c); c.fillStyle = draw.gradient(c, -17, 0, 17, 0, [[0, p.goldInk], [0.18, p.gold], [0.42, p.goldHi], [0.62, p.gold], [1, color.dark(p.gold, 0.25)]]); c.fill();
    c.save(); rim(c); c.clip();
    c.fillStyle = color.alpha(p.goldInk, 0.35); c.fillRect(-18, -2.2, 36, 3);
    c.strokeStyle = color.alpha(p.goldHi, 0.9); c.lineWidth = 1;    // the band's top edge (an engraved line)
    c.beginPath(); c.moveTo(-16.5, -8.4); c.quadraticCurveTo(0, -6.2, 16.5, -8.4); c.stroke();
    c.restore();
    rim(c); c.lineWidth = 2.2; c.strokeStyle = p.goldInk; c.stroke();
    for (let i = 0; i < 5; i++) ost(c, cc => draw.circle(cc, PT[i][0], PT[i][1] - 1.6, i === 2 ? 2.9 : 2.3), p.pearl, p.ruffInk, 1.1, 0.7, 0.15);
    ost(c, cc => { cc.beginPath(); cc.moveTo(0, -9.5); cc.lineTo(3.6, -4.6); cc.lineTo(0, 0.2); cc.lineTo(-3.6, -4.6); cc.closePath(); }, p.gemR, p.goldInk, 1.1, 0.7, 0.15, [-3.6, -9.5, 7.2, 9.7]);
    ost(c, cc => draw.circle(cc, -9.5, -4.2, 2), p.gem, p.goldInk, 0.9, 0.6, 0.1);
    ost(c, cc => draw.circle(cc, 9.5, -4.2, 2), p.gemG, p.goldInk, 0.9, 0.6, 0.1);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(-1.1, -5.8, 0.9, 0, TAU); c.fill();
  } else if (theme === 'desert') {  // a knit beanie: rib stitches, a folded brim woven with a Sadu band, a fleece pompom
    const dome = cc => { cc.beginPath(); cc.moveTo(-14.5, -5); cc.bezierCurveTo(-15, -20, -8, -27, 0, -27); cc.bezierCurveTo(8, -27, 15, -20, 14.5, -5); cc.closePath(); };
    ost(c, dome, p.beanie, p.ink, 2.3, 0.3, 0.2, [-15, -27, 30, 22]);
    c.save(); dome(c); c.clip(); c.strokeStyle = color.alpha(p.beanieHi, 0.85); c.lineWidth = 0.9;
    for (let x = -12; x <= 12; x += 4) { c.beginPath(); c.moveTo(x, -5); c.quadraticCurveTo(x * 0.6, -18, x * 0.25, -27); c.stroke(); }
    c.restore();
    const brim = cc => draw.roundRect(cc, -16, -8.5, 32, 9, 3.5);
    brim(c); c.fillStyle = p.sadR; c.fill();
    saduBand(c, -16, -8.5, 32, 9, p);
    brim(c); c.lineWidth = 2.2; c.strokeStyle = p.ink; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-14, -7.6, 28, 1.2);
    const pom = cc => { cc.beginPath(); for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = (i & 1) ? 5.4 : 6.6; cc.lineTo(Math.cos(a) * r, -30 + Math.sin(a) * r); } cc.closePath(); };
    ost(c, pom, p.fleece, p.fleeceInk, 1.5, 0.4, 0.2, [-6.6, -36.6, 13.2, 13.2]);
  } else if (theme === 'beach') {   // a wide straw hat: woven crown + brim, a coral band, a hibiscus and a leaf
    const brim = cc => draw.ellipse(cc, 0, -2, 28, 6.5);
    ost(c, brim, p.straw, p.strawInk, 2.2, 0.3, 0.2);
    const crown = cc => { cc.beginPath(); cc.moveTo(-12.5, -3); cc.bezierCurveTo(-13, -17, -6, -21, 0, -21); cc.bezierCurveTo(6, -21, 13, -17, 12.5, -3); cc.quadraticCurveTo(0, 0, -12.5, -3); cc.closePath(); };
    ost(c, crown, p.straw, p.strawInk, 2.2, 0.35, 0.18, [-13, -21, 26, 21]);
    c.save(); crown(c); brim(c); c.clip(); c.strokeStyle = color.alpha(p.strawInk, 0.32); c.lineWidth = 0.7;
    for (let i = -30; i < 30; i += 3.2) { c.beginPath(); c.moveTo(i, -24); c.lineTo(i + 10, 6); c.moveTo(i + 10, -24); c.lineTo(i, 6); c.stroke(); }
    c.restore();
    c.beginPath(); c.moveTo(-12.6, -6.5); c.quadraticCurveTo(0, -3.5, 12.6, -6.5); c.lineTo(12.4, -10.5); c.quadraticCurveTo(0, -7.6, -12.4, -10.5); c.closePath();
    c.fillStyle = p.band; c.fill(); c.lineWidth = 1.2; c.strokeStyle = p.strawInk; c.stroke();
    leafShape(c, 13, -9, 9, 3.6, -0.5, p.leaf, p.strawInk);
    flower(c, 9, -9.5, 6.4, p.flowerA, p.flowerB, color.dark(p.flowerA, 0.45), 0.3);
  } else if (theme === 'space') {   // a glass bubble dome on a chrome collar ring (the antenna LED blinks live)
    c.strokeStyle = p.chromeInk; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(9, -34); c.lineTo(13, -45); c.stroke(); c.strokeStyle = p.chrome; c.lineWidth = 1.2; c.stroke();
    ost(c, cc => draw.circle(cc, 13.4, -46.5, 2.6), p.led2, p.chromeInk, 1.1, 0.6, 0.1);
    c.beginPath(); c.arc(0, -16, 21, Math.PI * 0.94, Math.PI * 2.06); c.closePath();
    c.fillStyle = color.alpha(p.glass, 0.22); c.fill(); c.lineWidth = 2.2; c.strokeStyle = color.alpha(p.chromeInk, 0.9); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -16, 16.5, Math.PI * 1.08, Math.PI * 1.36); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.arc(0, -16, 16.5, Math.PI * 1.44, Math.PI * 1.52); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(11, -27, 2.4, 1.3, -0.7, 0, TAU); c.fill();
    ost(c, cc => draw.roundRect(cc, -21.5, -5, 43, 7.5, 3.5), p.chrome, p.chromeInk, 2, 0.6, 0.25);
    for (let i = 0; i < 4; i++) { c.fillStyle = i & 1 ? p.led2 : p.led; c.beginPath(); c.arc(-12 + i * 8, -1.3, 1.1, 0, TAU); c.fill(); }
  } else if (theme === 'spooky') {  // a little carved pumpkin worn as a cap: lobes, a glowing cute face, a curly stem
    const lob = [[-8.5, -11, 8.5, 11], [8.5, -11, 8.5, 11], [0, -12, 9.5, 12.5]];
    for (let i = 0; i < 3; i++) { const l = lob[i]; ost(c, cc => draw.ellipse(cc, l[0], l[1], l[2], l[3]), i === 2 ? p.pumpkinHi : p.pumpkin, p.pumpkinInk, 2, 0.35, 0.2); }
    c.strokeStyle = color.alpha(p.pumpkinInk, 0.5); c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-3.6, -23); c.quadraticCurveTo(-6, -12, -3.4, -0.5); c.moveTo(3.6, -23); c.quadraticCurveTo(6, -12, 3.4, -0.5); c.stroke();
    c.fillStyle = p.glowC;
    c.beginPath(); c.moveTo(-7, -13); c.lineTo(-3.5, -13); c.lineTo(-5.2, -16.5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(3.5, -13); c.lineTo(7, -13); c.lineTo(5.2, -16.5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-6.5, -8.5); c.quadraticCurveTo(0, -3.5, 6.5, -8.5); c.lineTo(4, -7.2); c.lineTo(2.6, -8.6); c.lineTo(0, -6.8); c.lineTo(-2.6, -8.6); c.lineTo(-4, -7.2); c.closePath(); c.fill();
    c.strokeStyle = p.stemInk; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -23.5); c.quadraticCurveTo(1, -29, 4, -31.5); c.stroke();
    c.strokeStyle = p.stem; c.lineWidth = 2.4; c.stroke();
    c.strokeStyle = p.stem; c.lineWidth = 1.1; c.beginPath(); c.moveTo(1.5, -27); c.bezierCurveTo(-6, -30, -8, -24, -4.5, -24.5); c.stroke();
    leafShape(c, 4, -28, 8, 3.6, 0.9, p.stem, p.stemInk);
  } else if (theme === 'rock') {    // a red paisley bandana tied over the head (the knot tails flap live)
    const cap = cc => { cc.beginPath(); cc.moveTo(-15.5, -1); cc.bezierCurveTo(-16, -12, -8, -17.5, 0, -17.5); cc.bezierCurveTo(9, -17.5, 16, -12, 15.5, -1); cc.quadraticCurveTo(0, -4.5, -15.5, -1); cc.closePath(); };
    ost(c, cap, p.bandana, p.bandanaInk, 2.3, 0.35, 0.2, [-16, -17.5, 32, 17]);
    c.save(); cap(c); c.clip();
    for (let i = 0; i < 9; i++) {
      const x = -12 + (i % 3) * 11 + (i >= 3 && i < 6 ? 5 : 0), y = -14 + Math.floor(i / 3) * 5;
      c.fillStyle = p.dot; c.beginPath(); c.ellipse(x, y, 1.6, 1.1, 0.6, 0, TAU); c.fill();
      c.strokeStyle = p.dot; c.lineWidth = 0.6; c.beginPath(); c.arc(x + 1.8, y + 1.4, 1.5, -0.5, 1.8); c.stroke();
    }
    c.fillStyle = color.alpha(p.bandanaInk, 0.35); c.fillRect(-17, -4.5, 34, 4);
    c.restore();
    ost(c, cc => draw.ellipse(cc, -15.5, -3.5, 3.6, 3.1), p.bandanaHi, p.bandanaInk, 1.6, 0.4, 0.2);
  }
}
// a pointed leaf (bake time) from (x, y) of length len along rot (0 = up)
function leafShape(c, x, y, len, wid, rot, fill, ink) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * 0.4, 0, -len); c.quadraticCurveTo(-wid, -len * 0.4, 0, 0); c.closePath();
  c.fillStyle = fill; c.fill(); c.lineWidth = 0.9; c.strokeStyle = ink; c.stroke();
  c.strokeStyle = color.alpha(ink, 0.6); c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -len * 0.85); c.stroke();
  c.restore();
}
// ---- shoulder pieces (local: origin = the shoulder, +x = outward, y up negative; mirrored for the back arm)
function bakeOPad(c, theme, p) {
  if (theme === 'neon') {             // a puffy light-up epaulette: a quilted capsule along the shoulder slope, ringed by a
    // cyan neon tube, a pink tube inside it and three LED studs on top
    const A = 0.38, pad = cc => { cc.beginPath(); cc.ellipse(5, -1.5, 12.5, 7, A, 0, TAU); };
    ost(c, pad, p.fabHi, p.ink, 2.2, 0.35, 0.25, [-7, -10, 24, 17]);
    c.save(); pad(c); c.clip(); c.strokeStyle = color.alpha(p.fabHi, 0.95); c.lineWidth = 1;
    c.translate(5, -1.5); c.rotate(A);
    c.beginPath(); c.moveTo(-4, -7); c.quadraticCurveTo(-2.5, 0, -4, 7); c.moveTo(3, -7); c.quadraticCurveTo(4.5, 0, 3, 7); c.stroke();
    c.restore();
    pad(c); neonStroke(c, p.pipe, 1.9, 5.6);
    c.save(); c.translate(5, -1.5); c.rotate(A);
    c.beginPath(); c.ellipse(0, 0, 8.4, 3.6, 0, Math.PI * 1.05, Math.PI * 1.95); neonStroke(c, p.pipe2, 1.1, 3.2);
    for (let i = 0; i < 3; i++) { c.fillStyle = i === 1 ? p.pipe2 : p.led; c.beginPath(); c.arc(-5 + i * 5, -4.6 + Math.abs(i - 1) * 0.9, 1.1, 0, TAU); c.fill(); }
    c.restore();
  } else if (theme === 'rock') {      // a spiked leather pauldron: three chrome cones fanning outward and up, a stud row
    const pad = cc => { cc.beginPath(); cc.moveTo(-9, 4); cc.bezierCurveTo(-11, -8, 1, -14, 10, -9.5); cc.bezierCurveTo(16.5, -6, 16.5, 4, 12, 7.5); cc.quadraticCurveTo(1, 7, -9, 4); cc.closePath(); };
    const SPK = [[-1.5, -9.5, -1.75, 10.5], [6, -10, -1.12, 12.5], [12.5, -4.5, -0.45, 11]];   // base x, y, direction, length
    for (let i = 0; i < 3; i++) {
      const s = SPK[i], dx = Math.cos(s[2]), dy = Math.sin(s[2]), nx = -dy * 3.1, ny = dx * 3.1, tx = s[0] + dx * s[3], ty = s[1] + dy * s[3];
      const cone = cc => { cc.beginPath(); cc.moveTo(s[0] - nx, s[1] - ny); cc.lineTo(tx, ty); cc.lineTo(s[0] + nx, s[1] + ny); cc.closePath(); };
      cone(c); c.fillStyle = draw.gradient(c, s[0] - nx, s[1] - ny, s[0] + nx, s[1] + ny, [[0, p.studHi], [0.45, p.stud], [1, p.studInk]]); c.fill();
      c.lineWidth = 1.4; c.strokeStyle = p.ink; c.stroke();
    }
    ost(c, pad, p.fab, p.ink, 2.3, 0.4, 0.25, [-10, -13, 26, 21]);
    c.save(); pad(c); c.clip(); c.strokeStyle = color.alpha(p.fabHi, 0.95); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-6, -6); c.bezierCurveTo(0, -10, 8, -9, 12, -4); c.stroke();
    c.restore();
    for (let i = 0; i < 4; i++) ost(c, cc => draw.circle(cc, -3 + i * 4.6, 2.5 - Math.abs(i - 1.5) * 0.8, 1.3), p.stud, p.studInk, 0.7, 0.7, 0.1);
  }
}
// ---- the beach float ring [cx, cy, rx, ry, tube]: a striped inflatable round the hips; near = only its front half (the
// part in front of the body), else the whole ring (the back layer; the body hides its middle)
function ringPath(c, R) {
  const t = R[4];
  c.beginPath(); c.ellipse(R[0], R[1], R[2] + t, R[3] + t, 0, 0, TAU);
  c.moveTo(R[0] + R[2] - t, R[1]); c.ellipse(R[0], R[1], R[2] - t, Math.max(1, R[3] - t), 0, 0, TAU);
}
function bakeORing(c, R, p, near) {
  const cx = R[0], cy = R[1], rx = R[2], ry = R[3], t = R[4];
  c.save();
  if (near) { c.beginPath(); c.rect(cx - rx - t - 4, cy, (rx + t + 4) * 2, ry + t + 4); c.clip(); }
  ringPath(c, R); c.save(); c.clip('evenodd');
  c.fillStyle = p.ringA; c.fillRect(cx - rx - t - 2, cy - ry - t - 2, (rx + t + 2) * 2, (ry + t + 2) * 2);
  c.fillStyle = p.ringB;              // white segments, cut by angle round the ellipse (12 segments: 6 white)
  for (let i = 0; i < 6; i++) {
    const a0 = (i * 2 + 0.5) * TAU / 12, a1 = a0 + TAU / 12, k = 2.4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * rx * k, cy + Math.sin(a0) * ry * k); c.lineTo(cx + Math.cos(a1) * rx * k, cy + Math.sin(a1) * ry * k); c.closePath(); c.fill();
  }
  // the tube's round shading (lit from above): the centre line of the tube shifted down = a shadow along its underside,
  // shifted up = a broad shine along its crest, plus two crisp glints on the near side
  c.lineCap = 'butt';
  c.lineWidth = t * 1.1; c.strokeStyle = color.alpha(p.ringShade, 0.55);
  c.beginPath(); c.ellipse(cx, cy + t * 0.62, rx, ry, 0, 0, TAU); c.stroke();
  c.lineWidth = t * 0.55; c.strokeStyle = 'rgba(255,255,255,0.42)';
  c.beginPath(); c.ellipse(cx, cy - t * 0.38, rx, ry, 0, 0, TAU); c.stroke();
  c.lineCap = 'round'; c.lineWidth = Math.max(1.2, t * 0.22); c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.beginPath(); c.ellipse(cx, cy - t * 0.42, rx, ry, 0, Math.PI * 0.22, Math.PI * 0.36); c.stroke();
  c.beginPath(); c.ellipse(cx, cy - t * 0.42, rx, ry, 0, Math.PI * 0.62, Math.PI * 0.68); c.stroke();
  c.restore();
  ringPath(c, R); c.lineWidth = 2.2; c.strokeStyle = p.ringInk; c.stroke();
  if (near) {                         // the valve nub on the near side
    const vx = cx + rx * 0.42, vy = cy + ry * 0.9 + t * 0.15;
    ost(c, cc => draw.roundRect(cc, vx - 2.2, vy - 2, 4.4, 4.4, 1.6), p.valve, p.ringInk, 1, 0.6, 0.1);
  }
  c.restore();
}
// ---- torso: everything below the shoulder line (sloping down outward) and outside the face hole, inside the silhouette
function torsoClip(c, s, F) {
  s.path(c); c.clip();
  const cx = F.cx, t = F.top, k = F.slope;
  c.beginPath(); c.moveTo(cx - 90, t + 90 * k); c.lineTo(cx, t); c.lineTo(cx + 90, t + 90 * k); c.lineTo(cx + 90, 40); c.lineTo(cx - 90, 40); c.closePath(); c.clip();
  if (F.hole) {
    const h = F.hole;
    c.beginPath(); c.rect(-120, -200, 240, 260); c.moveTo(h[0] + h[2], h[1]); c.ellipse(h[0], h[1], h[2], h[3], 0, 0, TAU); c.clip('evenodd');
  }
}
// the torso region's open edges (shoulder line + face hole) as a path, for trims (bake time)
function torsoEdge(c, F) {
  const cx = F.cx, t = F.top, k = F.slope;
  c.beginPath(); c.moveTo(cx - 90, t + 90 * k); c.lineTo(cx, t); c.lineTo(cx + 90, t + 90 * k);
  if (F.hole) { const h = F.hole; c.moveTo(h[0] + h[2], h[1]); c.ellipse(h[0], h[1], h[2], h[3], 0, 0, TAU); }
}
// the y where a vertical line at x leaves the face hole downward (or the shoulder line): a front placket starts there
function holeBottom(F, x) {
  if (!F.hole) return F.top;
  const h = F.hole, u = (x - h[0]) / h[2];
  return h[1] + h[3] * Math.sqrt(Math.max(0, 1 - u * u));
}
// the open-front gap of a cloak (farwa / cape fronts): a wedge widening downward from the shoulders
function openGap(c, F, k) {
  const cx = F.cx, t = F.top - 4, o = F.open;
  c.moveTo(cx - o, t); c.lineTo(cx + o, t); c.lineTo(cx + o + k * 60, t + 60); c.lineTo(cx - o - k * 60, t + 60); c.closePath();
}
function torsoShade(c, s, p, ink) {
  const b = s.bounds;
  c.fillStyle = draw.gradient(c, 0, b[1], 0, b[1] + b[3], [[0, 'rgba(255,255,255,0.1)'], [0.6, 'rgba(0,0,0,0)'], [1, color.alpha(ink, 0.32)]]);
  c.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
  c.fillStyle = draw.radial(c, b[0] + b[2] * 0.25, b[1] + b[3] * 0.45, 0, b[3] * 0.6, [[0, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
}
function bakeOTorso(c, s, theme, p, pb) {
  const F = OFIT[s.name], cx = F.cx, b = s.bounds, hem = F.hem;
  c.save(); torsoClip(c, s, F);
  let ink = p.ink;
  if (theme === 'neon' || theme === 'beach' || theme === 'space' || theme === 'rock') {
    c.fillStyle = p.fab; c.fillRect(b[0] - 6, b[1] - 6, b[2] + 12, b[3] + 12);
    if (theme === 'beach') {          // flower print: hibiscus + leaves scattered on teal
      const r = rngLite(s.name.length * 31 + 7);
      for (let y = b[1] - 4; y < 4; y += 14) for (let x = b[0] - 6; x < b[0] + b[2] + 8; x += 16) {
        const jx = x + (r() - 0.5) * 8 + ((Math.round(y) & 8) ? 8 : 0), jy = y + (r() - 0.5) * 6;
        leafShape(c, jx + 3, jy + 4, 7, 3, r() * TAU, p.leaf, p.ink);
        flower(c, jx, jy, 3.6 + r() * 1.4, r() < 0.5 ? p.flowerA : p.flowerC, p.flowerB, p.ink, r() * TAU);
      }
    } else if (theme === 'space') {   // panel seams + rivet dots
      c.strokeStyle = color.alpha(p.seam, 0.9); c.lineWidth = 0.9;
      for (let y = hem - 9; y > b[1]; y -= 12) { c.beginPath(); c.moveTo(b[0] - 4, y); c.lineTo(b[0] + b[2] + 4, y); c.stroke(); }
      c.fillStyle = color.alpha(p.seam, 0.9);
      for (let y = hem - 9; y > b[1]; y -= 12) for (let x = b[0]; x < b[0] + b[2]; x += 9) { c.beginPath(); c.arc(x, y - 2.2, 0.6, 0, TAU); c.fill(); }
    } else if (theme === 'rock') {    // leather creases + sheen
      c.strokeStyle = color.alpha(p.fabHi, 0.9); c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const x = b[0] + b[2] * (0.15 + i * 0.22); c.beginPath(); c.moveTo(x, hem); c.quadraticCurveTo(x + 3, hem - 10, x - 1, hem - 22); c.stroke(); }
    } else {                          // neon bomber: quilted diagonal stitching
      c.strokeStyle = color.alpha(p.fabHi, 0.75); c.lineWidth = 0.8; c.setLineDash([2, 1.6]);
      for (let u = -140; u < 140; u += 9) { c.beginPath(); c.moveTo(u, -160); c.lineTo(u + 160, 0); c.moveTo(u, 0); c.lineTo(u + 160, -160); c.stroke(); }
      c.setLineDash(NO_DASH);
    }
    torsoShade(c, s, p, ink);
    // the front placket: from the face hole (or the collar) down to the hem
    const y0 = holeBottom(F, cx);
    if (theme === 'neon' || theme === 'rock') {
      const zx = theme === 'rock' ? cx + 4 : cx;
      c.strokeStyle = theme === 'rock' ? p.zip : p.pipe; c.lineWidth = 1.6; c.beginPath(); c.moveTo(zx, y0); c.lineTo(zx - (theme === 'rock' ? 3 : 0), hem + 2); c.stroke();
      c.strokeStyle = color.alpha(p.ink, 0.9); c.lineWidth = 0.7; c.setLineDash([0.8, 1.1]); c.stroke(); c.setLineDash(NO_DASH);
      ost(c, cc => draw.roundRect(cc, zx - 1.6, y0 + 1, 3.2, 5, 1.2), p.zip, p.ink, 0.9, 0.5, 0.1);
    } else if (theme === 'beach') {
      c.strokeStyle = color.alpha(p.ink, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(cx, y0); c.lineTo(cx, hem + 2); c.stroke();
      for (let y = y0 + 4; y < hem - 1; y += 6) ost(c, cc => draw.circle(cc, cx + 2.4, y, 1.3), p.button, p.ink, 0.7, 0.5, 0.1);
    } else {                          // space: a chest panel of three LED buttons beside the seam
      c.strokeStyle = color.alpha(p.seam, 1); c.lineWidth = 1.1; c.beginPath(); c.moveTo(cx, y0); c.lineTo(cx, hem + 2); c.stroke();
      const py = Math.min(hem - 8, y0 + 7), pw = 13;
      ost(c, cc => draw.roundRect(cc, cx + 3, py - 3.5, pw, 7, 2), p.collar, p.ink, 1, 0.4, 0.15);
      const L3 = [p.led, p.led2, p.led3];
      for (let i = 0; i < 3; i++) { c.fillStyle = L3[i]; c.beginPath(); c.arc(cx + 6.5 + i * 3.4, py, 1.15, 0, TAU); c.fill(); }
    }
    // hem band
    if (theme === 'neon') {
      c.fillStyle = p.fabHi; c.fillRect(b[0] - 6, hem - 5.5, b[2] + 12, 5.5);
      c.strokeStyle = p.pipe2; c.lineWidth = 1.1; c.beginPath(); c.moveTo(b[0] - 6, hem - 3.8); c.lineTo(b[0] + b[2] + 6, hem - 3.8); c.stroke();
      c.strokeStyle = p.pipe; c.beginPath(); c.moveTo(b[0] - 6, hem - 1.8); c.lineTo(b[0] + b[2] + 6, hem - 1.8); c.stroke();
      // a lightning patch on the far chest
      const px = cx - (F.hole ? F.hole[2] * 0.95 : 9), py = Math.max(F.top + 10, hem - 16);
      c.fillStyle = p.patch; c.beginPath(); c.moveTo(px + 1, py - 5); c.lineTo(px - 3, py + 0.5); c.lineTo(px, py + 0.5); c.lineTo(px - 1.5, py + 5.5); c.lineTo(px + 3.4, py - 1); c.lineTo(px + 0.4, py - 1); c.closePath();
      c.fill(); c.lineWidth = 0.8; c.strokeStyle = p.ink; c.stroke();
    } else if (theme === 'space') {
      c.fillStyle = p.collar; c.fillRect(b[0] - 6, hem - 6, b[2] + 12, 3.2);
      c.fillStyle = p.collarHi; c.fillRect(b[0] - 6, hem - 6, b[2] + 12, 0.9);
    } else if (theme === 'rock') {   // studs along the hem and the shoulder line
      for (let x = b[0] + 3; x < b[0] + b[2]; x += 5.5) ost(c, cc => draw.circle(cc, x, hem - 3, 1.15), p.stud, p.studInk, 0.6, 0.7, 0.1);
      ost(c, cc => draw.star(cc, cx - 9, Math.max(F.top + 12, hem - 15), 3.2, 0.45, 5), p.pin, p.ink, 0.8, 0.5, 0.1);
    }
    // collar along the open edges
    torsoEdge(c, F);
    if (theme === 'neon') { c.strokeStyle = p.fabHi; c.lineWidth = 7; c.stroke(); torsoEdge(c, F); neonStroke(c, p.pipe, 1.4, 3.4); }
    else if (theme === 'beach') { c.strokeStyle = p.collar; c.lineWidth = 7; c.stroke(); torsoEdge(c, F); c.strokeStyle = color.alpha(p.ink, 0.8); c.lineWidth = 1; c.save(); c.translate(0, 3.6); c.stroke(); c.restore(); }
    else if (theme === 'space') {
      c.strokeStyle = p.collar; c.lineWidth = 9; c.stroke(); torsoEdge(c, F); c.strokeStyle = p.collarHi; c.lineWidth = 1.4; c.stroke();
      // LED dots around the collar
      if (F.hole) {
        const h = F.hole;
        for (let a = 0.35; a < Math.PI - 0.3; a += 0.33) { c.fillStyle = (Math.round(a * 3) & 1) ? p.led : p.led2; c.beginPath(); c.arc(h[0] + Math.cos(a) * (h[2] + 2.4), h[1] + Math.sin(a) * (h[3] + 2.4), 0.95, 0, TAU); c.fill(); }
      } else for (let x = cx - 10; x <= cx + 10; x += 5) { c.fillStyle = (x & 1) ? p.led : p.led2; c.beginPath(); c.arc(x, F.top + 2.4, 0.95, 0, TAU); c.fill(); }
    } else if (theme === 'rock') {    // wide leather lapels with a stud row
      c.strokeStyle = p.fabHi; c.lineWidth = 8; c.stroke(); torsoEdge(c, F); c.strokeStyle = color.alpha(p.ink, 0.9); c.lineWidth = 1; c.save(); c.translate(0, 4); c.stroke(); c.restore();
      if (F.hole) {
        const h = F.hole;
        for (let a = 0.25; a < Math.PI - 0.2; a += 0.3) ost(c, cc => draw.circle(cc, h[0] + Math.cos(a) * (h[2] + 2.2), h[1] + Math.sin(a) * (h[3] + 2.2), 1.05), p.stud, p.studInk, 0.6, 0.7, 0.1);
      } else for (let x = cx - 12; x <= cx + 12; x += 4.5) ost(c, cc => draw.circle(cc, x, F.top + 2.4, 1.05), p.stud, p.studInk, 0.6, 0.7, 0.1);
    }
  } else if (theme === 'royal' || theme === 'spooky' || theme === 'desert') {
    // an open cloak: the two front panels (velvet / bat cape / farwa wool) beside an open gap that widens downward
    const k = theme === 'desert' ? 0.16 : 0.24;
    c.save();
    c.beginPath(); c.rect(-120, -200, 240, 260); openGap(c, F, k); c.clip('evenodd');
    c.fillStyle = p.fab; c.fillRect(b[0] - 6, b[1] - 6, b[2] + 12, b[3] + 12);
    c.strokeStyle = color.alpha(p.ink, 0.45); c.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) { const x = b[0] + b[2] * (0.08 + i * 0.22); c.beginPath(); c.moveTo(x, F.top); c.quadraticCurveTo(x + 4, (F.top + hem) / 2, x - 2, hem + 2); c.stroke(); }
    torsoShade(c, s, p, ink);
    // the panels' front edges: fleece lapels (farwa) / a gold-trimmed lining (royal) / orange lining (bat cape)
    c.beginPath(); openGap(c, F, k);
    const edgeCol = theme === 'desert' ? p.fleece : p.lining;
    c.strokeStyle = edgeCol; c.lineWidth = theme === 'desert' ? 11 : 6; c.stroke();
    if (theme === 'desert') {         // the fleece edge: soft scallops + an embroidered gold zigzag beside it
      c.strokeStyle = color.alpha(p.fleeceInk, 0.55); c.lineWidth = 0.8; c.setLineDash([1.6, 1.4]); c.beginPath(); openGap(c, F, k); c.stroke(); c.setLineDash(NO_DASH);
      c.save(); c.lineWidth = 1.1; c.strokeStyle = p.emb;
      for (let sgn = -1; sgn <= 1; sgn += 2) {
        c.beginPath();
        for (let y = F.top; y < hem + 4; y += 2.6) { const x = F.cx + sgn * (F.open + k * (y - F.top + 4) + 7.5) + (((y - F.top) / 2.6) & 1 ? 1.2 : -1.2) * sgn; if (y === F.top) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke();
      }
      c.restore();
    } else if (theme === 'royal') { c.beginPath(); openGap(c, F, k); c.strokeStyle = p.gold; c.lineWidth = 1.3; c.save(); c.stroke(); c.restore(); }
    c.beginPath(); openGap(c, F, k); c.strokeStyle = p.ink; c.lineWidth = 1.6; c.stroke();
    c.restore();
    // neckline ornaments
    const N = F.neck;
    if (theme === 'royal' && F.hole) {  // under a face: a gold chain with a ruby pendant (a ruff there read as teeth)
      c.restore(); c.save(); s.path(c); c.clip();
      const y = N[1] + 1.5, w = N[2] * 1.05;
      c.strokeStyle = p.goldInk; c.lineWidth = 2.6; c.beginPath(); c.moveTo(N[0] - w, y - 6); c.quadraticCurveTo(N[0], y + 9, N[0] + w, y - 6); c.stroke();
      c.strokeStyle = p.gold; c.lineWidth = 1.4; c.setLineDash([2, 1]); c.stroke(); c.setLineDash(NO_DASH);
      const gy = y + 5.5;
      ost(c, cc => draw.roundRect(cc, N[0] - 4.6, gy - 1.6, 9.2, 3.2, 1.5), p.gold, p.goldInk, 1, 0.6, 0.1);
      ost(c, cc => { cc.beginPath(); cc.moveTo(N[0], gy + 1.2); cc.lineTo(N[0] + 4.6, gy + 5); cc.lineTo(N[0], gy + 11); cc.lineTo(N[0] - 4.6, gy + 5); cc.closePath(); }, p.gemR, p.goldInk, 1.2, 0.7, 0.2, [N[0] - 4.6, gy + 1.2, 9.2, 9.8]);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(N[0] - 1.4, gy + 4.4, 1, 0, TAU); c.fill();
      ost(c, cc => draw.circle(cc, N[0] - w * 0.55, y + 0.6, 1.7), p.gem, p.goldInk, 0.8, 0.6, 0.1);
      ost(c, cc => draw.circle(cc, N[0] + w * 0.55, y + 0.6, 1.7), p.gem, p.goldInk, 0.8, 0.6, 0.1);
    } else if (theme === 'royal') {   // a pleated ruff round the neck + a brass clasp chain across the gap
      c.restore(); c.save(); s.path(c); c.clip();
      const n = 10, w = N[2] * 2, st = w / n, y0 = N[1] - 2.6, y1 = N[1] + 4.2;
      const ruff = cc => {
        cc.beginPath(); cc.moveTo(N[0] - N[2], y0);
        for (let i = 0; i < n; i++) { const x = N[0] - N[2] + i * st; cc.quadraticCurveTo(x + st * 0.5, y0 - 2.6, x + st, y0); }
        cc.lineTo(N[0] + N[2] + 1.5, y1);
        for (let i = n; i > 0; i--) { const x = N[0] - N[2] + i * st; cc.quadraticCurveTo(x - st * 0.5, y1 + 2.8, x - st, y1); }
        cc.closePath();
      };
      ost(c, ruff, p.ruff, p.ruffInk, 1.3, 0.4, 0.25, [N[0] - N[2], y0 - 2.6, w + 1.5, y1 - y0 + 5.4]);
      c.strokeStyle = color.alpha(p.ruffInk, 0.7); c.lineWidth = 0.7;
      for (let i = 1; i < n; i++) { const x = N[0] - N[2] + i * st; c.beginPath(); c.moveTo(x, y0 + 0.2); c.lineTo(x + 0.4, y1 - 0.2); c.stroke(); }
      const cy = N[1] + 7;
      c.strokeStyle = p.goldInk; c.lineWidth = 1.8; c.beginPath(); c.moveTo(F.cx - F.open - 1, cy); c.quadraticCurveTo(F.cx, cy + 3, F.cx + F.open + 1, cy); c.stroke();
      c.strokeStyle = p.gold; c.lineWidth = 0.9; c.setLineDash([1.6, 0.9]); c.stroke(); c.setLineDash(NO_DASH);
      ost(c, cc => draw.circle(cc, F.cx - F.open - 1, cy, 2.6), p.gold, p.goldInk, 1, 0.6, 0.15);
      ost(c, cc => draw.circle(cc, F.cx + F.open + 1, cy, 2.6), p.gold, p.goldInk, 1, 0.6, 0.15);
    } else if (theme === 'spooky') { // a little glowing bat brooch where the cape closes
      const bx = F.cx, by = F.top + 6;
      c.fillStyle = p.brooch; c.beginPath(); c.moveTo(bx, by - 1); c.quadraticCurveTo(bx - 3, by - 4, bx - 7, by - 2.5); c.quadraticCurveTo(bx - 5, by - 0.5, bx - 5.5, by + 1.5);
      c.quadraticCurveTo(bx - 3, by, bx, by + 2.5); c.quadraticCurveTo(bx + 3, by, bx + 5.5, by + 1.5); c.quadraticCurveTo(bx + 5, by - 0.5, bx + 7, by - 2.5); c.quadraticCurveTo(bx + 3, by - 4, bx, by - 1);
      c.closePath(); c.fill(); c.lineWidth = 0.9; c.strokeStyle = p.ink; c.stroke();
    } else {                          // farwa: a brass toggle at the neck
      ost(c, cc => draw.roundRect(cc, F.cx - 4, F.top + 2, 8, 3, 1.4), p.brass, p.brassInk, 0.9, 0.6, 0.1);
    }
  }
  // the silhouette's inner outline again over the garment, and its sticker cut along the open edges
  s.path(c); c.lineWidth = TUNE.outline; c.strokeStyle = pb.outline; c.stroke();
  if (theme !== 'royal' && theme !== 'spooky' && theme !== 'desert') { torsoEdge(c, F); c.lineWidth = 2; c.strokeStyle = ink; c.stroke(); }
  c.restore();
}
// the neon jacket's light-up layer (drawn additively, pulsing on the beat): bright tubes over its piping, a chevron of
// LED strips down the chest and the lightning patch, clipped like the torso
function bakeOLit(c, s, p) {
  const F = OFIT[s.name], cx = F.cx, b = s.bounds, hem = F.hem, y0 = holeBottom(F, cx);
  c.save(); torsoClip(c, s, F);
  c.beginPath(); c.moveTo(b[0] - 6, hem - 3.8); c.lineTo(b[0] + b[2] + 6, hem - 3.8); neonStroke(c, p.pipe2, 1.6, 6);
  c.beginPath(); c.moveTo(b[0] - 6, hem - 1.8); c.lineTo(b[0] + b[2] + 6, hem - 1.8); neonStroke(c, p.pipe, 1.6, 6);
  c.beginPath(); c.moveTo(cx, y0); c.lineTo(cx, hem + 2); neonStroke(c, p.pipe, 1.4, 5);
  const top = Math.max(y0 + 4, F.top + 6), mid = (top + hem) * 0.5, w = Math.min(26, b[2] * 0.42);
  for (let i = 0; i < 2; i++) {       // two LED chevrons pointing down the chest, either side of the zip
    const y = mid - 4 + i * 7;
    c.beginPath(); c.moveTo(cx - w, y - 6); c.lineTo(cx - 3, y); c.moveTo(cx + 3, y); c.lineTo(cx + w, y - 6);
    neonStroke(c, i ? p.pipe2 : p.pipe, 1.3, 4.6);
  }
  torsoEdge(c, F); neonStroke(c, p.pipe, 1.6, 6);
  c.restore();
}
// a tiny deterministic random (bake time)
function rngLite(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
// ---- back pieces (behind the body; body space): a velvet cape, a farwa cloak, a bat-collar cape
function capePath(c, C) {
  const cx = C[0], ty = C[1], tw = C[2], hy = C[3], hw = C[4];
  c.beginPath(); c.moveTo(cx - tw * 0.4, ty);
  c.quadraticCurveTo(cx - tw * 1.05, ty + 2, cx - tw * 1.08, ty + 12);
  c.quadraticCurveTo(cx - hw * 0.98, (ty + hy) * 0.5, cx - hw, hy);
  for (let i = 0; i < 4; i++) { const x0 = cx - hw + (i + 0.5) * hw * 0.5; c.quadraticCurveTo(x0, hy + 4.5, cx - hw + (i + 1) * hw * 0.5, hy); }
  c.quadraticCurveTo(cx + hw * 0.98, (ty + hy) * 0.5, cx + tw * 1.08, ty + 12);
  c.quadraticCurveTo(cx + tw * 1.05, ty + 2, cx + tw * 0.4, ty);
  c.closePath();
}
// the royal ermine collar: its fur width and its half span about the cape's centre (cape top half width tw)
const ERM_W = 12;
function ermHalf(tw) { return tw * 1.45 + 5; }
// an ermine fur band (royal): a fluffy roll of overlapping fur puffs along a quadratic arc (x0, y0) -> (x1, y1) whose
// control point sits `bulge` off the chord's middle, black ermine tails dotted along it (bake time)
function ermPt(x0, y0, x1, y1, bulge, u, o) {
  const iu = 1 - u, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + bulge;
  o[0] = iu * iu * x0 + 2 * iu * u * mx + u * u * x1; o[1] = iu * iu * y0 + 2 * iu * u * my + u * u * y1;
  return o;
}
const ERM_PT = [0, 0];
function ermine(c, x0, y0, x1, y1, bulge, w, p, n) {
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.abs(bulge), k = Math.max(4, Math.round(len / (w * 0.55))), r = w * 0.5;
  for (let pass = 0; pass < 3; pass++) {   // ink rim, fur, a soft top light on each puff
    c.fillStyle = pass === 0 ? p.furInk : pass === 1 ? p.fur : 'rgba(255,255,255,0.75)';
    for (let i = 0; i <= k; i++) {
      const q = ermPt(x0, y0, x1, y1, bulge, i / k, ERM_PT), rr = r * ((i & 1) ? 0.92 : 1.06);
      c.beginPath();
      if (pass === 0) c.arc(q[0], q[1], rr + 1.5, 0, TAU);
      else if (pass === 1) c.arc(q[0], q[1], rr, 0, TAU);
      else c.ellipse(q[0] - rr * 0.2, q[1] - rr * 0.35, rr * 0.45, rr * 0.26, -0.3, 0, TAU);
      c.fill();
    }
  }
  c.fillStyle = p.furSpot;
  for (let i = 0; i < n; i++) {         // the tails: little dark drops along the roll
    const q = ermPt(x0, y0, x1, y1, bulge, (i + 0.5) / n, ERM_PT), x = q[0], y = q[1] + ((i & 1) ? w * 0.12 : -w * 0.08);
    c.beginPath(); c.moveTo(x, y - w * 0.24); c.quadraticCurveTo(x + w * 0.17, y + w * 0.05, x, y + w * 0.26); c.quadraticCurveTo(x - w * 0.17, y + w * 0.05, x, y - w * 0.24); c.fill();
  }
}
function bakeOBack(c, s, theme, p) {
  const C = OFIT[s.name].cape, cx = C[0], ty = C[1], hy = C[3], hw = C[4], tw = C[2];
  if (theme === 'beach') { bakeORing(c, OFIT[s.name].ring, p, false); return; }
  if (theme === 'spooky') {           // the bat collar: two scalloped wings standing up behind the head sides
    for (let sg = -1; sg <= 1; sg += 2) {
      const bx = cx + sg * tw * 0.55, by = ty + 6;
      const wing = cc => { cc.beginPath(); cc.moveTo(bx, by); cc.lineTo(bx + sg * (tw * 0.6 + 6), by - 24); cc.quadraticCurveTo(bx + sg * (tw * 0.55 + 2), by - 18, bx + sg * (tw * 0.5 + 3), by - 13);
        cc.quadraticCurveTo(bx + sg * (tw * 0.35), by - 12, bx + sg * (tw * 0.3 + 2), by - 6); cc.quadraticCurveTo(bx + sg * 4, by - 6, bx, by); cc.closePath(); };
      ost(c, wing, p.fab, p.ink, 2, 0.25, 0.25, [Math.min(bx, bx + sg * (tw * 0.6 + 6)), by - 24, tw * 0.6 + 6, 24]);
      c.save(); wing(c); c.clip(); c.fillStyle = color.alpha(p.lining, 0.85); c.beginPath(); c.moveTo(bx + sg * 3, by - 1); c.lineTo(bx + sg * (tw * 0.55 + 3), by - 21); c.lineTo(bx + sg * (tw * 0.45), by - 10); c.closePath(); c.fill(); c.restore();
    }
  }
  const lining = theme === 'desert' ? p.fleece : p.lining;
  capePath(c, C); c.fillStyle = p.fab; c.fill();
  c.save(); capePath(c, C); c.clip();
  c.fillStyle = lining; c.beginPath(); c.moveTo(cx - hw - 4, hy - 5); c.quadraticCurveTo(cx, hy - 1, cx + hw + 4, hy - 5); c.lineTo(cx + hw + 4, hy + 8); c.lineTo(cx - hw - 4, hy + 8); c.closePath(); c.fill();
  c.strokeStyle = color.alpha(p.ink, 0.5); c.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) { const x = cx + i * hw * 0.38; c.beginPath(); c.moveTo(cx + i * tw * 0.3, ty + 6); c.quadraticCurveTo(x * 0.9 + cx * 0.1, (ty + hy) / 2, x, hy + 2); c.stroke(); }
  c.fillStyle = draw.gradient(c, cx - hw, 0, cx + hw, 0, [[0, 'rgba(255,255,255,0.1)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
  c.fillRect(cx - hw - 4, ty - 4, hw * 2 + 8, hy - ty + 10);
  c.restore();
  capePath(c, C); c.lineWidth = 2.4; c.strokeStyle = p.ink; c.stroke();
  if (theme === 'royal') {            // the king's mantle: an ermine hem, and a fat ermine collar standing out past both shoulders
    c.save(); capePath(c, C); c.clip(); ermine(c, cx - hw - 2, hy - 3, cx + hw + 2, hy - 3, 5, 8, p, 7); c.restore();
    const ew = ERM_W * Math.min(1, 0.55 + tw / 60), ex = ermHalf(tw);
    ermine(c, cx - ex, ty + 24, cx + ex, ty + 24, -30, ew, p, 8);   // draped: it rises behind the neck, falls over the shoulders
  }
  if (theme === 'desert') { c.save(); capePath(c, C); c.clip(); c.strokeStyle = p.emb; c.lineWidth = 1; c.setLineDash([2.2, 1.2]); c.beginPath(); c.moveTo(cx - hw, hy - 6); c.quadraticCurveTo(cx, hy - 2, cx + hw, hy - 6); c.stroke(); c.setLineDash(NO_DASH); c.restore(); }
}
// ---- eyewear (body space, the eye layout of the actor: EYES[0..n), baked per layout; sil = the species)
function bakeOEyes(c, theme, p, E, n, F, sil) {
  const gog = F.gog;
  if (!n) return;
  let x0 = 1e9, x1 = -1e9, ys = 0, rs = 0, fi = 0;
  for (let i = 0; i < n; i++) { const e = E[i]; if (e.x - e.r < x0) x0 = e.x - e.r; if (e.x + e.r > x1) x1 = e.x + e.r; ys += e.y; rs += e.r; if (e.x > E[fi].x) fi = i; }
  const ym = ys / n, rm = rs / n;
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (theme === 'space') {            // one tinted visor across every eye
    const pad = rm * 0.55, h = rm * 2.2, x = x0 - pad, w = x1 - x0 + pad * 2, y = ym - h * 0.5;
    draw.roundRect(c, x, y, w, h, h * 0.48);
    c.fillStyle = draw.gradient(c, 0, y, 0, y + h, [[0, color.alpha(p.glass, 0.5)], [1, color.alpha(p.visor, 0.62)]]); c.fill();
    c.lineWidth = 2.6; c.strokeStyle = p.chromeInk; c.stroke(); c.lineWidth = 1.2; c.strokeStyle = p.chrome; c.stroke();
    c.save(); draw.roundRect(c, x, y, w, h, h * 0.48); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(x + w * 0.12, y); c.lineTo(x + w * 0.3, y); c.lineTo(x + w * 0.18, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
    c.restore();
    // the glass bubble helmet round the whole head: a faint blue glass, a crisp white rim and two big reflections, an
    // antenna on top (its LED blinks live), a chrome collar ring with LED studs at the bottom
    const B = F.bub, bx = B[0], by = B[1], rx = B[2], ry = B[3], cy = B[4];
    const ax = bx + rx * 0.42, ay = by - ry * 0.91;
    c.strokeStyle = p.chromeInk; c.lineWidth = 2.8; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 4, ay - 11); c.stroke();
    c.strokeStyle = p.chrome; c.lineWidth = 1.3; c.stroke();
    ost(c, cc => draw.circle(cc, ax + 4.3, ay - 12.4, 2.8), p.led2, p.chromeInk, 1.1, 0.6, 0.1);
    c.beginPath(); c.ellipse(bx, by, rx, ry, 0, 0, TAU);
    c.fillStyle = draw.radial(c, bx - rx * 0.3, by - ry * 0.35, 0, Math.max(rx, ry), [[0, color.alpha(p.glass, 0.06)], [0.75, color.alpha(p.glass, 0.13)], [1, color.alpha(p.glass, 0.34)]]);
    c.fill();
    c.lineWidth = 3.2; c.strokeStyle = color.alpha(p.chromeInk, 0.55); c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(235,248,255,0.85)'; c.stroke();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = Math.max(2.4, rx * 0.075);
    c.beginPath(); c.ellipse(bx, by, rx * 0.8, ry * 0.8, 0, Math.PI * 1.1, Math.PI * 1.42); c.stroke();
    c.lineWidth = Math.max(1.4, rx * 0.04); c.beginPath(); c.ellipse(bx, by, rx * 0.8, ry * 0.8, 0, Math.PI * 1.5, Math.PI * 1.57); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = Math.max(1.6, rx * 0.05);
    c.beginPath(); c.ellipse(bx, by, rx * 0.84, ry * 0.84, 0, Math.PI * 0.12, Math.PI * 0.3); c.stroke();
    // the collar ring where the bubble meets the suit
    const hw = rx * Math.sqrt(Math.max(0, 1 - ((cy - by) / ry) * ((cy - by) / ry))) + 3;
    ost(c, cc => draw.roundRect(cc, bx - hw, cy - 4, hw * 2, 8, 4), p.chrome, p.chromeInk, 2, 0.55, 0.3);
    for (let i = 0; i < 5; i++) { c.fillStyle = i & 1 ? p.led2 : p.led; c.beginPath(); c.arc(bx - hw * 0.7 + i * hw * 0.35, cy, 1.15, 0, TAU); c.fill(); }
    return;
  }
  if (theme === 'desert') {           // sand goggles pushed up on the forehead: a strap + two brass-rimmed amber lenses
    const gy = ym - rm * gog, gr = Math.min(rm * 0.66, 7.6), gx = (x0 + x1) * 0.5, gd = Math.max(gr * 1.15, (x1 - x0) * 0.5 - rm * 0.55);
    c.strokeStyle = p.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(x0 - rm * 0.9, gy + 1.4); c.quadraticCurveTo(gx, gy - 3, x1 + rm * 0.9, gy + 1.4); c.stroke();
    c.strokeStyle = p.sadR; c.lineWidth = 2.8; c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      const lx = gx + s * gd;
      ost(c, cc => draw.circle(cc, lx, gy, gr + 2), p.brass, p.brassInk, 1.6, 0.55, 0.2);
      c.beginPath(); c.arc(lx, gy, gr, 0, TAU);
      c.fillStyle = draw.radial(c, lx - gr * 0.3, gy - gr * 0.3, 0, gr * 1.2, [[0, '#ffe3a8'], [0.6, p.glass], [1, color.dark(p.glass, 0.35)]]); c.fill();
      c.lineWidth = 1; c.strokeStyle = p.brassInk; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.1; c.beginPath(); c.arc(lx, gy, gr * 0.62, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    }
    return;
  }
  if (theme === 'royal') {            // a monocle over the front eye on a gold chain
    const e = E[fi], R = e.r * 1.16;
    c.strokeStyle = p.goldInk; c.lineWidth = 1.5; c.beginPath(); c.moveTo(e.x + R * 0.7, e.y + R * 0.7); c.quadraticCurveTo(e.x + R * 1.9, e.y + R * 2.2, e.x + R * 1.1, e.y + R * 3.4); c.stroke();
    c.strokeStyle = p.gold; c.lineWidth = 0.8; c.setLineDash([1.4, 0.9]); c.stroke(); c.setLineDash(NO_DASH);
    c.beginPath(); c.arc(e.x, e.y, R, 0, TAU); c.fillStyle = color.alpha(p.lens, 0.2); c.fill();
    c.lineWidth = 3.4; c.strokeStyle = p.goldInk; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = p.gold; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.arc(e.x, e.y, R * 0.7, Math.PI * 1.1, Math.PI * 1.4); c.stroke();
    return;
  }
  if (theme === 'neon') {             // glow-in-the-dark rave paint: a cyan and a pink flash at each outer eye corner (clear
    // of the cheek blush), a lime dot above it; clipped to the silhouette so it never paints the air beside a thin head
    c.save(); sil.path(c); c.clip();
    for (let s = -1; s <= 1; s += 2) {
      let e = E[0];
      for (let i = 1; i < n; i++) if (s > 0 ? E[i].x + E[i].r > e.x + e.r : E[i].x - E[i].r < e.x - e.r) e = E[i];
      const r = e.r, w = Math.max(1.7, r * 0.2), g = Math.max(4.2, r * 0.5), bx = e.x + s * r * 1.12;
      c.beginPath(); c.moveTo(bx, e.y - r * 0.12); c.lineTo(bx + s * r * 0.62, e.y - r * 0.5); neonStroke(c, p.pipe, w, g);
      c.beginPath(); c.moveTo(bx, e.y + r * 0.36); c.lineTo(bx + s * r * 0.62, e.y - r * 0.02); neonStroke(c, p.pipe2, w, g);
      c.fillStyle = p.paint; c.beginPath(); c.arc(bx + s * r * 0.08, e.y - r * 0.72, Math.max(1, r * 0.13), 0, TAU); c.fill();
    }
    c.restore();
    return;
  }
  if (theme === 'spooky') {           // a bat-wing eye mask: one velvet piece over the eye row, scalloped wings, eye holes
    let ry = -1e9;
    for (let i = 0; i < n; i++) if (E[i].y > ry) ry = E[i].y;
    let a0 = 1e9, a1 = -1e9, rr = 0, k = 0;
    for (let i = 0; i < n; i++) { const e = E[i]; if (ry - e.y > rm * 1.2) continue; if (e.x - e.r < a0) a0 = e.x - e.r; if (e.x + e.r > a1) a1 = e.x + e.r; rr += e.r; k++; }
    rr /= k;
    const mx = (a0 + a1) * 0.5, hw = (a1 - a0) * 0.5;
    const mask = cc => {
      cc.beginPath(); cc.moveTo(mx, ry - rr * 1.02);
      for (let sg = 1; sg >= -1; sg -= 2) {   // the right half (top edge, wing, scallops, bottom edge), then the left one mirrored
        const X = d => mx + sg * (hw + d * rr);
        if (sg > 0) {
          cc.quadraticCurveTo(mx + hw * 0.55, ry - rr * 1.62, X(0.1), ry - rr * 1.22); cc.lineTo(X(1.7), ry - rr * 2.05);
          cc.quadraticCurveTo(X(1.12), ry - rr * 1.08, X(1.45), ry - rr * 0.55); cc.quadraticCurveTo(X(0.82), ry - rr * 0.42, X(1.0), ry + rr * 0.28);
          cc.quadraticCurveTo(X(0.42), ry + rr * 0.32, X(0.15), ry + rr * 1.02); cc.quadraticCurveTo(mx + hw * 0.5, ry + rr * 1.48, mx, ry + rr * 0.72);
        } else {
          cc.quadraticCurveTo(mx - hw * 0.5, ry + rr * 1.48, X(0.15), ry + rr * 1.02); cc.quadraticCurveTo(X(0.42), ry + rr * 0.32, X(1.0), ry + rr * 0.28);
          cc.quadraticCurveTo(X(0.82), ry - rr * 0.42, X(1.45), ry - rr * 0.55); cc.quadraticCurveTo(X(1.12), ry - rr * 1.08, X(1.7), ry - rr * 2.05);
          cc.lineTo(X(0.1), ry - rr * 1.22); cc.quadraticCurveTo(mx - hw * 0.55, ry - rr * 1.62, mx, ry - rr * 1.02);
        }
      }
      cc.closePath();
      for (let i = 0; i < n; i++) { const e = E[i]; if (ry - e.y > rm * 1.2) continue; cc.moveTo(e.x + e.r * 1.1, e.y); cc.ellipse(e.x, e.y, e.r * 1.1, e.r * 1.06, 0, 0, TAU); }
    };
    c.save(); mask(c); c.clip('evenodd');
    c.fillStyle = draw.gradient(c, 0, ry - rr * 2, 0, ry + rr * 1.4, [[0, p.maskHi], [0.55, p.mask], [1, color.dark(p.mask, 0.35)]]);
    c.fillRect(mx - hw - rr * 2, ry - rr * 2.2, hw * 2 + rr * 4, rr * 3.8);
    c.strokeStyle = color.alpha(p.brooch, 0.85); c.lineWidth = Math.max(1, rr * 0.11);   // a glowing green piping on the top edge
    c.beginPath(); c.moveTo(mx - hw - rr * 0.1, ry - rr * 1.02); c.quadraticCurveTo(mx - hw * 0.55, ry - rr * 1.42, mx, ry - rr * 0.84); c.quadraticCurveTo(mx + hw * 0.55, ry - rr * 1.42, mx + hw + rr * 0.1, ry - rr * 1.02); c.stroke();
    c.restore();
    mask(c); c.lineWidth = 2.4; c.strokeStyle = p.ink; c.stroke();
    return;
  }
  // rock: star shades (per-eye star lenses joined by a bridge, temples out to the sides)
  const fr = p.frame, lensA = 0.62;
  for (let i = 0; i < n - 1; i++) {
    const a = E[i], b = E[i + 1];
    if (Math.abs(a.y - b.y) > rm * 1.2) continue;
    c.beginPath(); c.moveTo(a.x + a.r * 0.95, a.y - a.r * 0.2); c.quadraticCurveTo((a.x + b.x) * 0.5, Math.min(a.y, b.y) - rm * 0.55, b.x - b.r * 0.95, b.y - b.r * 0.2);
    c.lineWidth = 3.4; c.strokeStyle = p.ink; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = fr; c.stroke();
  }
  c.beginPath(); c.moveTo(x0 - rm * 0.05, ym - rm * 0.25); c.lineTo(x0 - rm * 0.6, ym - rm * 0.45); c.moveTo(x1 + rm * 0.05, ym - rm * 0.25); c.lineTo(x1 + rm * 0.6, ym - rm * 0.45);
  c.lineWidth = 3.2; c.strokeStyle = p.ink; c.stroke(); c.lineWidth = 1.6; c.strokeStyle = fr; c.stroke();
  for (let i = 0; i < n; i++) {
    const e = E[i], r = e.r;
    c.save(); c.translate(e.x, e.y);
    const lens = cc => draw.star(cc, 0, r * 0.05, r * 1.45, 0.55, 5);
    lens(c);
    c.fillStyle = draw.gradient(c, 0, -r, 0, r, [[0, color.alpha(p.lens, lensA * 0.8)], [1, color.alpha(p.lens, lensA)]]); c.fill();
    c.save(); lens(c); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.moveTo(-r * 1.2, -r * 0.1); c.lineTo(-r * 0.3, -r * 1.2); c.lineTo(r * 0.05, -r * 1.2); c.lineTo(-r * 0.95, r * 0.3); c.closePath(); c.fill();
    c.restore();
    lens(c); c.lineWidth = 3.4; c.strokeStyle = p.ink; c.stroke();
    lens(c); c.lineWidth = 1.9; c.strokeStyle = fr; c.stroke();
    c.restore();
  }
}
// ---- instrument trims (bake time, the instrument's own units after its palette bake)
function instTrim(c, kind, theme, p) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (theme === 'neon') {             // neon tube rims round the instrument's body
    c.save();
    if (kind === 'drum') { c.beginPath(); c.ellipse(0, 0, 12.4, 4.4, 0, 0, TAU); neonStroke(c, p.led2, 0.9, 2.6); c.beginPath(); c.moveTo(-10.8, 9.2); c.quadraticCurveTo(0, 13.2, 10.8, 9.2); neonStroke(c, p.led, 0.9, 2.6); }
    else if (kind === 'bass') { c.scale(BASS_BODY, BASS_BODY); bassBody(c); neonStroke(c, p.led2, 0.8, 2.4); }
    else if (kind === 'guitar') { vBody(c); neonStroke(c, p.led2, 0.8, 2.4); }
    else if (kind === 'mic') { c.beginPath(); c.arc(0, -14, 6.4, 0, TAU); neonStroke(c, p.led, 0.8, 2.4); }
    else if (kind === 'keys') { draw.roundRect(c, -KEY_X - 2.4, 0, KEY_X * 2 + 4.8, SLAB_H, 3); neonStroke(c, p.led2, 0.8, 2.4); }
    c.restore();
  } else if (theme === 'royal') {     // gold filigree scrolls
    c.strokeStyle = p.brassLine; c.lineWidth = 0.7;
    const scroll = (x, y, s, f) => { c.beginPath(); c.moveTo(x - 4 * s * f, y); c.bezierCurveTo(x - 2 * s * f, y - 3 * s, x + 2 * s * f, y - 3 * s, x + 2 * s * f, y); c.arc(x + 0.6 * s * f, y, 1.4 * s, 0, Math.PI * (f > 0 ? 1.4 : -1.4), f < 0); c.stroke(); };
    if (kind === 'bass') { scroll(-6, 3, 1.1, 1); scroll(-6, -4, 1.1, -1); }
    else if (kind === 'guitar') { scroll(-12, -6, 0.9, 1); scroll(-12, 6, 0.9, -1); }
    else if (kind === 'drum') { scroll(-5, 7, 0.8, 1); scroll(5, 7, 0.8, -1); }
    else if (kind === 'mic') { c.beginPath(); c.moveTo(-1.6, 0); c.lineTo(1.6, 4); c.moveTo(1.6, 0); c.lineTo(-1.6, 4); c.stroke(); }
    else if (kind === 'keys') { scroll(-KEY_X + 18, 2, 0.6, 1); scroll(KEY_X - 18, 2, 0.6, -1); }
  } else if (theme === 'desert') {    // Sadu bands + brass inlay; the guitar wears an oud-style rosette, the toms a tabl skin
    const SP2 = { sadR: '#b3203a', sadK: '#231616', sadW: '#f5ecda', sadO: '#e0a030' };
    if (kind === 'drum') { saduBand(c, -11.4, 4.2, 22.8, 3.6, SP2); c.fillStyle = 'rgba(120,80,40,0.25)'; c.beginPath(); c.ellipse(1.5, -0.5, 4, 1.2, 0, 0, TAU); c.fill(); }
    else if (kind === 'bass') { c.save(); c.scale(BASS_BODY, BASS_BODY); bassBody(c); c.clip(); saduBand(c, -16, 4.8, 30, 3.6, SP2); c.restore(); }
    else if (kind === 'guitar') {
      c.strokeStyle = p.brass; c.lineWidth = 0.7;
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8; c.beginPath(); c.moveTo(-9, 0); c.lineTo(-9 + Math.cos(a) * 4.4, Math.sin(a) * 4.4); c.stroke(); }
      c.beginPath(); c.arc(-9, 0, 4.4, 0, TAU); c.stroke(); c.beginPath(); c.arc(-9, 0, 2.2, 0, TAU); c.stroke();
    } else if (kind === 'mic') saduBand(c, -2.8, 0, 5.6, 4, SP2);
    else if (kind === 'keys') saduBand(c, -KEY_X, SLAB_H - 2.6, KEY_X * 2, 2.4, SP2);
  } else if (theme === 'beach') {     // shell + starfish stickers
    const shell = (x, y, s) => {
      c.save(); c.translate(x, y); c.scale(s, s);
      c.beginPath(); c.moveTo(0, 2.2); c.lineTo(-3, -1); c.quadraticCurveTo(0, -4.4, 3, -1); c.closePath(); c.fillStyle = '#fff4dc'; c.fill(); c.lineWidth = 0.6; c.strokeStyle = '#8a5a24'; c.stroke();
      c.beginPath(); c.moveTo(0, 2); c.lineTo(-1.6, -2.4); c.moveTo(0, 2); c.lineTo(0, -3); c.moveTo(0, 2); c.lineTo(1.6, -2.4); c.lineWidth = 0.4; c.stroke();
      c.restore();
    };
    const star = (x, y, s) => { c.save(); c.translate(x, y); draw.star(c, 0, 0, 3 * s, 0.45, 5); c.fillStyle = '#ff6f91'; c.fill(); c.lineWidth = 0.5; c.strokeStyle = '#7a1a36'; c.stroke(); c.restore(); };
    if (kind === 'bass') { shell(-7, 3, 1.1); star(-1, -6, 0.8); }
    else if (kind === 'guitar') { shell(-13, -6, 0.9); star(-13, 6, 0.8); }
    else if (kind === 'drum') { shell(-4, 7, 0.8); star(5, 7.5, 0.6); }
    else if (kind === 'mic') star(0, 2, 0.6);
    else if (kind === 'keys') { shell(-KEY_X + 16, 1.8, 0.45); star(KEY_X - 22, 1.9, 0.4); }
  } else if (theme === 'space') {     // LED dot rows
    const dots = (x, y, n, gap) => { for (let i = 0; i < n; i++) { c.fillStyle = i & 1 ? p.led : p.led2; c.beginPath(); c.arc(x + i * gap, y, 0.75, 0, TAU); c.fill(); } };
    if (kind === 'bass') dots(-11, 6, 5, 3);
    else if (kind === 'guitar') dots(-16, 0, 4, 3);
    else if (kind === 'drum') dots(-8, 6, 6, 3.2);
    else if (kind === 'mic') dots(-1.5, 3, 2, 3);
    else if (kind === 'keys') dots(-KEY_X + 15, 1.9, 4, 2.6);
  } else if (theme === 'spooky') {    // a cobweb in a corner + glowing strings
    const web = (x, y, r, a0) => {
      c.strokeStyle = 'rgba(241,236,255,0.8)'; c.lineWidth = 0.4;
      c.beginPath(); for (let k = 0; k < 4; k++) { const a = a0 + k * 0.5; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.stroke();
      for (let k = 1; k < 3; k++) { c.beginPath(); c.arc(x, y, r * 0.42 * k, a0, a0 + 1.5); c.stroke(); }
    };
    if (kind === 'bass') { web(-14, -8, 10, 0.2); c.save(); c.globalAlpha = 0.5; strings(c, p, -10 * BASS_BODY, BASS_NECK + 1, 4, 1.3); c.restore(); }
    else if (kind === 'guitar') { web(-18, -11, 9, 0.3); c.save(); c.globalAlpha = 0.5; strings(c, p, -8, GTR_NECK + 1, 6, 0.7); c.restore(); }
    else if (kind === 'drum') web(-11, 0.5, 8, 0.1);
    else if (kind === 'mic') web(-5, -19, 6, 0.2);
    else if (kind === 'keys') web(-KEY_X, 0, 9, 0.1);
  } else if (theme === 'rock') {      // flame decals licking along the body
    const flame = (x, y, s, rot) => {
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
      c.beginPath(); c.moveTo(-6, 2.5); c.quadraticCurveTo(-1, 2, 2, -0.5); c.quadraticCurveTo(0, -1, 5, -4); c.quadraticCurveTo(2, -0.5, 7, -1.5); c.quadraticCurveTo(3, 1.5, 8, 2);
      c.quadraticCurveTo(2, 4.5, -6, 4.5); c.closePath();
      c.fillStyle = p.led; c.fill(); c.lineWidth = 0.5; c.strokeStyle = '#4a0608'; c.stroke();
      c.beginPath(); c.moveTo(-4, 3.4); c.quadraticCurveTo(0, 3, 3, 1); c.quadraticCurveTo(1.5, 3, 5, 3); c.quadraticCurveTo(0, 4.2, -4, 4); c.closePath(); c.fillStyle = p.led2; c.fill();
      c.restore();
    };
    if (kind === 'bass') { c.save(); c.scale(BASS_BODY, BASS_BODY); bassBody(c); c.clip(); flame(-12, 3, 1.3, -0.15); flame(-12, -5, 1.1, -0.3); c.restore(); }
    else if (kind === 'guitar') { c.save(); vBody(c); c.clip(); flame(-17, -9, 1.1, 0.35); flame(-17, 7, 1.1, -0.35); c.restore(); }
    else if (kind === 'drum') flame(-7, 6, 0.8, 0);
    else if (kind === 'mic') flame(-1, 1, 0.45, -1.4);
    else if (kind === 'keys') { flame(-KEY_X + 8, 6.5, 0.55, 0); flame(KEY_X - 14, 6.5, 0.55, 0); }
  }
}

// ------------------------------------------------------------------------------------------------ the actor
export function createActor(input, opts) {
  opts = opts || NO;
  const spec = makeSpec(input);
  let sp = SP[spec.species];
  const fxOn = opts.fx !== false, still = !!opts.still;   // still: no beat groove (static icons)
  const seed = opts.seed !== undefined ? opts.seed : Math.random() * 1000;

  let state = 'idle', loopState = 'idle', st = 0, t = 0, onDone = null, patience = 0;
  let gone = false, vanish = false, launched = false, popped = false, landed = false, admitUp = false, admitApex = false, admitLand = false;
  let yeetDir = 1, yeetVX = 0, yeetVY = 0, yeetSpin = 0, spin = 0, offX = 0, offY = 0, admitDir = 1, admitSneak = false, flapped = false, slyT = 0;
  let tempo = TUNE.dance.tempo, beatPhase = 0, sadWalk = false, walkDust = true, walkPh = 0, stepIdx = 0, lastHop = 0;
  let flashT = 0, yawnZ = 0, zIdx = 0, inst = false;   // inst: band mode (dance with the species' instrument)
  const pend = { attr: null, value: null };
  const grooveOff = (((seed * 7.31) % 1 + 1) % 1 - 0.5) * 2 * TUNE.idle.grooveJitter;   // a little human looseness on the beat
  let blinkClock = rnd(0.6, TUNE.blink.max), blinkT = -1, blinkLid = 0, blinkTwice = false, blinkDur = TUNE.blink.dur, steady = false;
  let gx = 0, gy = 0, tgx = 0, tgy = 0, gazeClock = 0, hasLook = false, lookX = 0, lookY = 0;
  let fidgetClock = rnd(TUNE.idle.fidgetMin, TUNE.idle.fidgetMax), waveT = 0, waveDur = 1, yawnT = -1, yawnClock = 0;
  let tearClock = 0, zClock = 0, tapPh = 0, madK = 0, steamBeat = -1, danceK = 0, litDoor = 0, jawK = 0, jawTgt = 0, sweatClock = 0;
  let leanK = 0, leanTgt = 0;          // drag preview (lean(k)): eased value / the scene's target
  let clk = SIM.t, hipClock = rnd(0.3, TUNE.wait.hipEvery[1]), hipBeat = 0, hipSide = Math.random() < 0.5 ? -1 : 1;
  let hipX = 0, hipFrom = 0, hipTo = 0, hipT = 9, hipOn = false;   // weight-shift slide (body units), see TUNE.wait.hip*
  let wantSil = !!(input && input.pre), litDF = 0, litDB = 0, litLF = 0, litLB = 0;   // lit*: door / lamp wash, front / back side
  let litH = 0, litHL = 0;                                                               // hat: door / lamp wash
  let sqx = 1, sqy = 1, sqvx = 0, sqvy = 0, swx = 0, swy = 0, swvx = 0, swvy = 0;
  let wx = 0, wy = 0, ws = 1, wf = 1, lastNow = 0, extVx = 0, extVy = 0, seenVx = 0, seenVy = 0, drawn = false, mx = 0, my = 0;
  let ga = 1, curFlip = 1, nDeb = 0, nFx = 0, gpx = 0, gpy = 0, gpvx = 0, gpvy = 0;
  let ripN = 0, nPend = 0;            // fake parts the current yeet ripped off (TUNE.rip); debris waiting for a draw frame
  let litK = 0;                       // the neon outfit's beat pulse this frame (0..1; 0 for every other outfit)

  // armKB / armKF: arm length multipliers (rubber-hose stretch when the arms go up); skew: body shear (tall's noodle wave)
  const P = { lift: 0, rot: 0, cs: 1, sn: 0, pivotY: 0, sx: 1, sy: 1, swayX: 0, skew: 0, plant: 1, fbx: 0, fby: 0, ffx: 0, ffy: 0,
    armB: 0, armF: 0, armKB: 1, armKF: 1, faceDX: 0, faceDY: 0, wing: 0, wag: 0, gaze: GAZE_WANDER,
    eB: 0, eF: 0, eKB: 1, eKF: 1, mitt: 1,     // eB / eF: elbow bends (rad; NaN while posing = auto), eK*: auto bend multipliers
    ikB: 0, ikF: 0 };                          // ik*: how much of each arm is pinned to the instrument (no shoulder lift then)
  // band mode: IP = the instrument this step (x, y, rot in body space, or ground space for floor ones; s = pop-in scale;
  // hitB / hitF = s since each tom's last hit), IKT = the hand targets (wrist points, same space) and their weights
  const IP = { x: 0, y: 0, rot: 0, s: 0, hitB: 9, hitF: 9 };
  const IKT = { bx: 0, by: 0, fx: 0, fy: 0, wB: 0, wF: 0 };
  let BX = 0, BY = 0;                          // toBody() result
  const HP = { x: 0, y: 0, dx: 0, dy: 1 };     // handLocal() result
  // PR = last step's pose before the springs; PB = PR at the last switch into a loop state, faded out over TUNE.blend
  const PR = { lift: 0, rot: 0, sx: 1, sy: 1, swayX: 0, skew: 0, fbx: 0, fby: 0, ffx: 0, ffy: 0, armB: 0, armF: 0, armKB: 1, armKF: 1, eB: 0, eF: 0 };
  const PB = { lift: 0, rot: 0, sx: 1, sy: 1, swayX: 0, skew: 0, fbx: 0, fby: 0, ffx: 0, ffy: 0, armB: 0, armF: 0, armKB: 1, armKF: 1, eB: 0, eF: 0 };
  let blendT = 0;
  function copyPose(d, s) {
    d.lift = s.lift; d.rot = s.rot; d.sx = s.sx; d.sy = s.sy; d.swayX = s.swayX; d.skew = s.skew;
    d.fbx = s.fbx; d.fby = s.fby; d.ffx = s.ffx; d.ffy = s.ffy; d.armB = s.armB; d.armF = s.armF; d.armKB = s.armKB; d.armKF = s.armKF;
    d.eB = s.eB; d.eF = s.eF;
  }
  function blendPose(k) {
    P.lift = lerp(P.lift, PB.lift, k); P.rot = lerp(P.rot, PB.rot, k); P.sx = lerp(P.sx, PB.sx, k); P.sy = lerp(P.sy, PB.sy, k);
    P.swayX = lerp(P.swayX, PB.swayX, k); P.skew = lerp(P.skew, PB.skew, k); P.fbx = lerp(P.fbx, PB.fbx, k); P.fby = lerp(P.fby, PB.fby, k);
    P.ffx = lerp(P.ffx, PB.ffx, k); P.ffy = lerp(P.ffy, PB.ffy, k); P.armB = lerp(P.armB, PB.armB, k); P.armF = lerp(P.armF, PB.armF, k);
    P.armKB = lerp(P.armKB, PB.armKB, k); P.armKF = lerp(P.armKF, PB.armKF, k); P.eB = lerp(P.eB, PB.eB, k); P.eF = lerp(P.eF, PB.eF, k);
  }
  // anger / puff: the mad-wait face (red blush, puffed cheeks, vein sticker)
  // wet: welling tears + a second pupil highlight (hurt)
  // jaw: the square's slack-jaw drop (units, TUNE.jaw)
  // flush: the red face of a guest about to snap (patience past TUNE.wait.flushAt)
  // wink: 0, or the index + 1 of the one eye shut (the sneak admit)
  const E = { mouth: M_SMILE, open: 0, eyes: EYE_OPEN, lid: 0.06, pupil: 1, brow: BROW_NONE, browA: 1, blush: 0, spin: 0, anger: 0, puff: 0, wet: 0, jaw: 0,
    flush: 0, wink: 0 };
  const EYES = [{ x: 0, y: 0, r: 10, spr: null }, { x: 0, y: 0, r: 10, spr: null }, { x: 0, y: 0, r: 10, spr: null }];
  let nEyes = 0;
  const G = { x: 0, y: 0, R: 9, tapeRot: -0.35 };
  const hatP = makeProp(), tailP = makeProp(), stalkP = makeProp(), gooP = makeProp();
  // debris: local units of the draw frame; w = anchored in WORLD space (the sneak admit's dropped costume, the yeet's ripped
  // fakes): x / y are then units of the frame it was spawned in (ground point wx0 / wy0, scale ws0, flip wf0), so it stays
  // put while the guest moves; wp = spawned before the actor was ever drawn: pinned to the next draw's frame (track).
  // rip: a BUSTED part (TUNE.rip): eased from (x0, y0, r0) by (dx, dy, drot) (over an arc units hump) until free, drawn at
  // scale sc; a STRIP is
  // sw x sh (ribbon: the tail's ribbon end, else tape) with a flutter phase ph
  const DEB = [];
  for (let i = 0; i < 6; i++) DEB.push({ on: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, t: 0, alpha: 1, rest: false, bottom: 0,
    w: false, wp: false, wx0: 0, wy0: 0, ws0: 1, wf0: 1, rip: false, free: false, x0: 0, y0: 0, dx: 0, dy: 0, r0: 0, drot: 0, arc: 0,
    sc: 1, sw: 0, sh: 0, ribbon: false, ph: 0 });
  const FX = [];
  // FX: Z / steam / tear / sweat stickers (local units). pop: the Z's pop-out timer; sp: a drop's splat timer (-1 falling)
  for (let i = 0; i < 10; i++) FX.push({ on: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, pop: 0, rot: 0, side: 0, sp: -1 });
  const S = { body: null, sil: null, rim: [null, null, null, null], footB: null, footF: null, mitt: null, pupil: null, stalkScl: null,
    hat: null, paper: null, tail: null, ftail: null, bow: null, goo: null, gooGloss: null, gooPup: null, gooTape: null, wing: null, z: null, drop: null,
    hatRim: [null, null],                // door catch-light of the hat / paper hat: [door at +x, door at -x]
    inst: null, stand: null,             // band-mode instrument (+ the synth's stand), baked on first use
    // band outfit (spec.outfit): headwear, torso, back piece, eyewear, shoulder piece (both arms), the float ring's near half,
    // the neon jacket's light-up layer; oPal = its dimmed colours, oSl = sleeves
    oHead: null, oTorso: null, oBack: null, oEyes: null, oPad: null, oRing: null, oLit: null, oPal: null,
    oSl: { on: false, fill: '', ink: '', cuff: '', short: false },
    steam: null, shadow: null, blush: null, blushMad: null, b: 1,
    // light washes (lazy, per bucket): [amber, cool] silhouettes of the mitten, feet, hat, paper hat, tails
    tArm: [null, null], tFootB: [null, null], tFootF: [null, null], tHat: [null, null], tPaper: [null, null], tTail: [null, null], tFtail: [null, null],
    kArm: '', kFootB: '', kFootF: '', kHat: '' };   // shape keys of the washes (built in refresh, never per frame)
  let curDim = -1, curBucket = -1, curGen = -1, dirty = true;
  let seenEpoch = EPOCH, touchFrame = FRM.n - Math.floor(seed * 7.7) % TUNE.cache.touchFrames;   // staggered LRU touches
  let pal = palette(spec.color, 0);
  let QX = 0, QY = 0;

  // ---------------------------------------------------------------- layout (spec -> eyes / props)
  function setEye(x, y, r) { const e = EYES[nEyes++]; e.x = x; e.y = y; e.r = r; }
  function cfgProp(pr, kind, fake, bx, by, th, L, base) {
    const K = fake ? TUNE.fake : TUNE.real;
    pr.on = true; pr.kind = kind; pr.fake = fake; pr.bx = bx; pr.by = by; pr.th = th; pr.L = L; pr.base = base;
    pr.k = K.k; pr.c = K.c; pr.max = K.max; pr.posK = K.posK; pr.sag = K.sag; pr.rotK = K.rotK; pr.fresh = true; pr.delta = 0; pr.ox = 0; pr.oy = 0;
    pr.sw = 0; pr.ph = (seed * 1.618 + kind.length * 2.3) % TAU;
    // seed the anchors from the current pose, so a draw before the next update() never shows the prop at the feet
    poseXY(bx, by);
    const tx = QX + Math.cos(th + P.rot) * L, ty = QY + Math.sin(th + P.rot) * L;
    pr.ax = QX; pr.ay = QY; pr.tx = tx; pr.ty = ty; pr.px = tx; pr.py = ty; pr.vx = 0; pr.vy = 0; pr.accX = 0; pr.accY = 0;
  }
  function layout() {
    sp = SP[spec.species];
    const fx = sp.face[0], fy = sp.face[1], r = sp.r;
    nEyes = 0;
    if (spec.eyes === 1) { const f1 = sp.face1 || sp.face; setEye(f1[0], f1[1], sp.r1); }
    else if (spec.eyes === 3 && sp.eyes3) { const e3 = sp.eyes3; setEye(e3[0], e3[1], e3[6]); setEye(e3[2], e3[3], e3[6]); setEye(e3[4], e3[5], e3[7]); }
    else { const ek = sp.eyeK || EYE_K1; setEye(fx - sp.sp, fy, r * ek[0]); setEye(fx + sp.sp, fy, r * ek[1]); }
    stalkP.on = false;
    if (spec.eyes === 3 && sp.stalk) {
      cfgProp(stalkP, 'stalk', false, sp.stalk[0], sp.stalk[1], sp.stalk[3], sp.stalk[2], 0);
      stalkP.k = TUNE.stalk.k; stalkP.c = TUNE.stalk.c; stalkP.max = TUNE.stalk.max;
    }
    if (spec.outfit === 'space') hatP.on = false;   // the space bubble (an eyewear-layer overlay) replaces every hat
    else if (spec.outfit) {           // band outfit headwear replaces any hat: a real (stiff) prop on the hat anchor
      const H = OFIT[sp.name].hat;
      cfgProp(hatP, 'outfit', false, sp.hat[0] + H[0], sp.hat[1] + H[1], -Math.PI / 2 + H[3], 20 * H[2], H[3]);
    } else if (spec.hat !== 'none') cfgProp(hatP, 'hat', false, sp.hat[0], sp.hat[1], -Math.PI / 2 + sp.hatRot, 20 * sp.hatS, sp.hatRot);
    else if (spec.fake.hat) {         // the paper copy sits crooked (paperTilt): it leans away from the round's stump
      const pt = sp.hatRot + (sp.paperTilt !== undefined ? sp.paperTilt : -0.3);
      cfgProp(hatP, 'paper', true, sp.hat[0] + 1.5, sp.hat[1] + 1, -Math.PI / 2 + pt, 20 * sp.hatS, pt);
    } else hatP.on = false;
    const tr = sp.tailRot;
    if (spec.tail) cfgProp(tailP, 'tail', false, sp.tail[0], sp.tail[1], TAIL_DIR + tr, 19 + TUNE.tail.ext, tr);
    else if (spec.fake.tail) {
      const tf = sp.tailF;            // a tied-on tail sits on its own spot and hangs droopier than a real one
      cfgProp(tailP, 'ftail', true, tf[0], tf[1], TAIL_DIR + tf[2], 19, tf[2]);
      tailP.k = TUNE.fakeTail.k; tailP.c = TUNE.fakeTail.c; tailP.rotK = TUNE.fakeTail.rotK; tailP.sw = TUNE.fakeSway.tail;
    } else tailP.on = false;
    if (hatP.on && hatP.fake) hatP.sw = TUNE.fakeSway.hat;
    gooP.on = false;
    if (spec.fake.eyes) {
      // a hat (real or paper) moves the googly to its gooH seat where the species has one (round: down off the stump,
      // between the eyes as a pretend third eye, so eye, hat and stump never pile up in one cream corner)
      const gi = (spec.eyes - 1) * 2, hatOn = spec.hat !== 'none' || spec.fake.hat || !!spec.outfit, hs = hatOn && sp.gooH;
      const seat = hs ? sp.gooH : sp.goo;
      G.x = seat[gi]; G.y = seat[gi + 1]; G.R = r * (hs && sp.gooHR ? sp.gooHR[spec.eyes - 1] : sp.gooR);
      cfgProp(gooP, 'goo', true, G.x + 1.5, G.y - G.R * 0.8, Math.PI / 2 + 0.28, G.R * 0.8, 0);
      gooP.max = G.R * TUNE.googlyMax;
    }
    dirty = true;
  }

  function refresh(dl, bi) {
    curDim = dl; curBucket = bi; curGen = GEN; dirty = false;
    const b = TUNE.buckets[bi], p = palette(spec.color, dl), sk = sp.name, s = sp;
    pal = p; S.b = b;
    const suf = '.' + dl + '.' + bi, csuf = '.' + spec.color + suf;
    const pe = spec.pattern !== 'none' ? spec.eyes : 0;     // patterned bodies keep a face patch per eye layout
    S.body = rec('a.body.' + sk + '.' + spec.pattern + pe + csuf, s.box, b, c => bakeBody(c, s, p, spec.pattern, spec.color, pe));
    S.sil = wantSil ? silRec() : null;      // the shapeshift flash: only shapeshifters (pre) and mutate() callers need it
    S.rim[0] = S.rim[1] = S.rim[2] = S.rim[3] = null;
    for (let i = 0; i < 2; i++) { S.tArm[i] = S.tFootB[i] = S.tFootF[i] = S.tHat[i] = S.tPaper[i] = S.tTail[i] = S.tFtail[i] = null; }
    const fb = s.footB, ff = s.footF, aw = s.armW;
    S.hatRim[0] = S.hatRim[1] = null; S.inst = null; S.stand = null;
    S.kArm ='mitt.' + aw + s.hand; S.kFootB = 'foot.' + fb[0] + 'x' + fb[1]; S.kFootF = s.shoe ? 'shoe' : 'foot.' + ff[0] + 'x' + ff[1]; S.kHat = 'hat.' + spec.hat;
    S.footB = rec('a.foot.' + fb[0] + 'x' + fb[1] + csuf, [-fb[0] - 3, -fb[1] * 2 - 3, fb[0] * 2 + 6, fb[1] * 2 + 6], b, c => bakeFoot(c, fb[0], fb[1], p));
    S.footF = s.shoe ? rec('a.shoe' + csuf, SHOE_BOX, b, c => bakeShoe(c, p))
      : rec('a.foot.' + ff[0] + 'x' + ff[1] + csuf, [-ff[0] - 3, -ff[1] * 2 - 3, ff[0] * 2 + 6, ff[1] * 2 + 6], b, c => bakeFoot(c, ff[0], ff[1], p));
    const blk = s.hand === 'block';
    S.mitt = rec('a.mitt.' + aw + (blk ? 'b' : '') + csuf, mittBox(aw), b, c => bakeMitt(c, aw, p, blk));
    S.shadow = shadowRec();
    S.steam = rec('a.steam' + suf, STEAM_BOX, b, c => bakeSteam(c, p));
    S.blush = rec('a.blush' + csuf, BLUSH_BOX, b, c => bakeBlush(c, p.blush, p.blushHi));
    S.blushMad = rec('a.blushm' + suf, BLUSH_BOX, b, c => bakeBlush(c, p.blushMad, null));
    for (let i = 0; i < nEyes; i++) { const r = EYES[i].r; EYES[i].spr = rec('a.scl.' + Math.round(r * 4) + csuf, scaled(r, 1), b, c => bakeSclera(c, r, p)); }
    if (stalkP.on) { const r3 = s.r3; S.stalkScl = rec('a.scl.' + Math.round(r3 * 4) + csuf, scaled(r3, 1), b, c => bakeSclera(c, r3, p)); }
    S.pupil = rec('a.pup' + suf, scaled(TUNE.pupR, 1), b, c => bakePupil(c, TUNE.pupR, p));
    // hats / tails: baked from the spec (not the prop flags), so a yeet's detached debris keeps its sprites
    S.hat = S.paper = S.tail = S.ftail = S.bow = S.goo = S.gooGloss = S.gooPup = S.gooTape = null;
    if (!stalkP.on) S.stalkScl = null;
    if (spec.hat !== 'none') { const hk = spec.hat; S.hat = rec('a.hat.' + hk + suf, HAT_BOX[hk], b, c => HAT_BAKE[hk](c, p)); }
    if (spec.fake.hat) S.paper = rec('a.paper' + suf, PAPER_BOX, b, c => bakePaper(c, p));
    if (spec.tail) S.tail = rec('a.tail' + csuf, RTAIL_BOX, b, c => bakeTail(c, p, false));
    if (spec.fake.tail) {
      S.ftail = rec('a.ftail' + csuf, TAIL_BOX, b, c => bakeTail(c, p, true));
      S.bow = rec('a.bow' + suf, BOW_BOX, b, c => bakeBow(c, p));
    }
    if (spec.fake.eyes || nDeb) {
      const R = G.R, rk = Math.round(R * 4);
      S.goo = rec('a.goo.' + rk + suf, scaled(R, 1), b, c => bakeGoo(c, R, p));
      S.gooGloss = rec('a.goog.' + rk + suf, scaled(R, 1), b, c => bakeGooGloss(c, R, p));
      S.gooPup = rec('a.goop.' + rk + suf, scaled(R, 0.55), b, c => bakeGooPup(c, R, p));
      S.gooTape = rec('a.goot.' + rk + suf, [-R * 1.3, -R * 0.6, R * 2.6, R * 1.2], b, c => tape(c, 0, 0, 0, R * 2.3, R * 0.78, p));
    }
    S.wing = s.wing ? rec('a.wing' + suf, WING_BOX, b, c => bakeWing(c, p)) : null;
    S.oHead = S.oTorso = S.oBack = S.oEyes = S.oPal = S.oPad = S.oRing = S.oLit = null; S.oSl.on = false;
    if (spec.outfit) {
      const th = spec.outfit, op = outPal(th, dl), O = OUT[th], F = OFIT[sk], ne = nEyes, ok = '.' + th + '.' + sk;
      S.oPal = op; S.kHat = 'ohat.' + th;
      S.oHead = rec('a.oh.' + th + suf, OHEAD_BOX[th], b, c => bakeOHead(c, th, op));
      S.oTorso = rec('a.ot' + ok + csuf, s.box, b, c => bakeOTorso(c, s, th, op, p));
      if (O.lit) S.oLit = rec('a.ol' + ok + suf, s.box, b, c => bakeOLit(c, s, op));
      if (O.pad) S.oPad = rec('a.opad.' + th + suf, OPAD_BOX[O.pad], b, c => bakeOPad(c, th, op));
      if (O.back === 'ring') {
        const R = F.ring, bw = R[2] + R[4] + 4, bh = R[3] + R[4] + 4;
        S.oBack = rec('a.ob' + ok + suf, [R[0] - bw, R[1] - bh, bw * 2, bh * 2], b, c => bakeOBack(c, s, th, op));
        S.oRing = rec('a.or' + ok + suf, [R[0] - bw, R[1] - 4, bw * 2, bh + 4], b, c => bakeORing(c, R, op, true));
      } else if (O.back) {
        const C = F.cape, hx = Math.max(C[4], ermHalf(C[2]) + ERM_W * 0.5) + 8;
        S.oBack = rec('a.ob' + ok + suf, [C[0] - hx, C[1] - 32, hx * 2, C[3] - C[1] + 44], b, c => bakeOBack(c, s, th, op));
      }
      const bx = s.box;
      if (O.eyes) S.oEyes = rec('a.oe' + ok + '.' + spec.eyes + suf, [bx[0] - 14, bx[1] - 24, bx[2] + 28, bx[3] + 38], b, c => bakeOEyes(c, th, op, EYES, ne, F, s));
      if (O.sleeve) {
        const d = TUNE.dim.levels[dl], L = S.oSl;
        L.on = true; L.fill = dimColor(O.sleeve, d); L.ink = dimColor(O.sleeveInk, d); L.cuff = dimColor(O.cuff, d); L.short = O.short;
      }
    }
    S.z = rec('a.z' + suf, Z_BOX, b, c => bakeZ(c, p));
    S.drop = rec('a.drop' + suf, DROP_BOX, b, c => bakeDrop(c, p));
  }
  // rims 0/1 = door (right / left side; amber or warm white per body colour, TUNE.rim.doorTint), 2/3 = lamp (cool)
  function rimRec(i) {
    let r = S.rim[i];
    if (!r) {
      const s = sp, R = TUNE.rim, side = (i === 0 || i === 3) ? 1 : -1, door = i < 2, warm = door && pal.doorKey === 'w';
      const col = door ? pal.doorTint : R.cool, set = door ? (warm ? R.warmSet : R.amberSet) : R.coolSet;
      r = rec('a.rim.' + s.name + '.' + i + (warm ? 'w.' : '.') + curBucket, s.box, S.b, c => bakeRim(c, s, side, col, set, door ? R.kissA : 0));
      S.rim[i] = r;
    }
    return r;
  }
  // the amber door catch-light of the hat / paper hat: i 0 = door at local +x, 1 = door at local -x (flipped)
  function hatRimRec(i) {
    let r = S.hatRim[i];
    if (!r) {
      // the newsprint copy catches a peach light (amber on blue-grey read as an orange stripe, not as light)
      const R = TUNE.rim, oh = hatP.kind === 'outfit', src = hatP.fake ? S.paper : oh ? S.oHead : S.hat, nm = hatP.fake ? 'paper' : oh ? 'o' + spec.outfit : spec.hat;
      r = catchRec(src, 'a.hrim.' + nm + '.' + i + '.' + curBucket, S.b, hatP.fake ? R.warmWhite : R.amber, i ? -1 : 1, R.hatIn, R.hatBand, R.hatLift);
      S.hatRim[i] = r;
    }
    return r;
  }
  function silRec() { const s = sp; return rec('a.sil.' + s.name + '.' + curBucket, s.box, S.b, c => bakeSil(c, s)); }
  // the parts this actor holds (see the LRU notes at RECS): visit(r) on each; holdsDead() -> any evicted since
  let anyDead = false;
  function chkDead(r) { if (r !== null && r.dead) anyDead = true; }
  function eachPart(visit) {
    visit(S.body); visit(S.sil); visit(S.footB); visit(S.footF); visit(S.mitt); visit(S.pupil); visit(S.stalkScl); visit(S.hat);
    visit(S.paper); visit(S.tail); visit(S.ftail); visit(S.bow); visit(S.goo); visit(S.gooGloss); visit(S.gooPup); visit(S.gooTape);
    visit(S.wing); visit(S.z); visit(S.drop); visit(S.inst); visit(S.stand); visit(S.steam); visit(S.shadow); visit(S.blush); visit(S.blushMad);
    visit(S.oHead); visit(S.oTorso); visit(S.oBack); visit(S.oEyes); visit(S.oPad); visit(S.oRing); visit(S.oLit);
    for (let i = 0; i < 4; i++) visit(S.rim[i]);
    for (let i = 0; i < 2; i++) {
      visit(S.hatRim[i]); visit(S.tArm[i]); visit(S.tFootB[i]); visit(S.tFootF[i]); visit(S.tHat[i]); visit(S.tPaper[i]); visit(S.tTail[i]); visit(S.tFtail[i]);
    }
    for (let i = 0; i < nEyes; i++) visit(EYES[i].spr);
  }
  function holdsDead() { anyDead = false; eachPart(chkDead); return anyDead; }
  function instRec() {                 // the species' instrument at this dim level / bucket (lazy: only band dancers bake it)
    if (!S.inst) {
      const k = sp.inst, th = spec.outfit, p = th ? instPal(th, pal, curDim, spec.color) : pal, suf = (th ? '.' + th : '') + '.' + curDim + '.' + curBucket;
      S.inst = rec('a.inst.' + k + suf, INST_BOX[k], S.b, c => { INST_BAKE[k](c, p); if (th) instTrim(c, k, th, p); });   // outfit: skinned
      if (k === 'keys') S.stand = rec('a.inst.stand' + suf, STAND_BOX, S.b, c => bakeStand(c, p));
    }
    return S.inst;
  }
  // light wash of a part: slot = one of the S.t* pairs, i = 0 door / 1 cool (lamp); keyed by shape (+ the door tint for
  // body-coloured parts), not colour. tinted: body-coloured limbs take the body's door tint, hats keep amber
  function washRec(slot, i, src, shape, tinted) {
    let r = slot[i];
    if (!r) {
      const dk = tinted ? pal.doorKey : 'a';
      r = tintRec(src, 'a.t.' + shape + '.' + i + (i ? '' : dk) + '.' + curBucket, S.b, i ? TUNE.rim.cool : dk === 'w' ? TUNE.rim.warmWhite : TUNE.rim.amber);
      slot[i] = r;
    }
    return r;
  }

  // ---------------------------------------------------------------- pose helpers
  function poseXY(bx, by) {      // body-space point -> pose space (shear, squash, sway, rotation about the pivot, lift)
    const x1 = (bx + P.skew * by) * P.sx + P.swayX, y1 = by * P.sy - P.pivotY;
    QX = x1 * P.cs - y1 * P.sn;
    QY = x1 * P.sn + y1 * P.cs + P.pivotY - P.lift;
  }
  function toBody(qx, qy) {      // pose space -> body space (the inverse of poseXY) -> BX, BY
    const y0 = qy - P.pivotY + P.lift, x1 = qx * P.cs + y0 * P.sn, y1 = -qx * P.sn + y0 * P.cs;
    BY = (y1 + P.pivotY) / P.sy; BX = (x1 - P.swayX) / P.sx - P.skew * BY;
  }
  // raised + stretched arms lift their shoulder so "arms up" clears the head; an arm pinned to an instrument never does
  function shoulderUp(rot, k, ik) {
    const c = -Math.cos(rot), R = sp.reach - 1;
    return c > 0 && ik < 1 ? sp.armUp * c * clamp((k - 1) / R, 0, 1) * (1 - ik) : 0;
  }
  // the hand of arm i (0 back, 1 front) in body space, as drawArm draws it: HP.x / y = the palm (a little past the wrist
  // along the forearm), HP.dx / dy = the forearm direction (unit)
  function handLocal(i) {
    const rot = i ? P.armF : P.armB, e = i ? P.eF : P.eB, k = i ? P.armKF : P.armKB;
    const h = sp.armL * k * 0.5, se = Math.sin(e * 0.5), ce = Math.cos(e * 0.5), ex = se * h, kx = sp.armStyle === 'joint' ? ex : 2 * ex;
    const hy = 2 * ce * h;
    let dx = -kx, dy = hy - ce * h;
    const l = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
    const pm = sp.armW * TUNE.inst.palm, ax = dx * pm, ay = hy + dy * pm, cr = Math.cos(rot), sr = Math.sin(rot);
    HP.x = sp.arm[i * 2] + ax * cr - ay * sr;
    HP.y = sp.arm[i * 2 + 1] - shoulderUp(rot, k, i ? P.ikF : P.ikB) + ax * sr + ay * cr;
    HP.dx = dx * cr - dy * sr; HP.dy = dx * sr + dy * cr;
  }
  function wX(lx) { return wx + lx * ws * wf; }
  function wY(ly) { return wy + ly * ws; }
  function emit(name, lx, ly, ov) { if (fxOn && drawn) particles.emit(name, wX(lx + offX), wY(ly + offY), ov); }
  function kickSquash(x, y) { sqx = x; sqy = y; sqvx = 0; sqvy = 0; }
  // the elbow bend an arm takes by itself: it bows toward "outward and down" (side -1 back arm, +1 front arm), so hanging
  // arms curve gently, raised arms frame the head and horizontal arms drop their elbows; 0 when the arm already points there
  function autoElbow(rot, side) {
    return TUNE.arm.elbow * sp.elbowK * (side * Math.cos(rot) + Math.sin(rot)) * 0.7071;
  }
  function arrival() {
    kickSquash(1.08, 0.88);
    emit('actorDust', sp.feet[0], 0, OV_DUST);
    emit('actorDust', sp.feet[1], 0, OV_DUST);
  }

  // ---------------------------------------------------------------- fx pools
  function freeFx() { for (let i = 0; i < FX.length; i++) if (!FX[i].on) return FX[i]; return FX[0]; }
  function spawnZ(i) {                // i = 0..2: the zzz sticker grows from z to Z
    const f = freeFx(), Z = TUNE.z;
    poseXY(sp.face[0] + 10 + i * Z.rise, sp.face[1] - sp.r * 2.6 - i * Z.rise);
    f.on = true; f.kind = FX_Z; f.x = QX; f.y = QY; f.vx = Z.vx; f.vy = Z.vy; f.t = 0; f.life = Z.life; f.s = Z.s[i]; f.pop = 0; f.sp = -1;
  }
  function popZ() {                   // anger chases the sleepiness away: live Z's pop (scale 1 -> 0, inBack, TUNE.z.pop)
    for (let i = 0; i < FX.length; i++) { const f = FX[i]; if (f.on && f.kind === FX_Z && f.pop <= 0) f.pop = 1e-4; }
  }
  function spawnSteam() {             // mad: a pair of steam puffs pops out of both sides of the head and rises
    const Sm = TUNE.steam;
    for (let side = -1; side <= 1; side += 2) {
      const f = freeFx();
      poseXY(sp.face[0] + side * (sp.sp + sp.r) * Sm.out, sp.face[1] - sp.r * Sm.up);
      f.on = true; f.kind = FX_STEAM; f.x = QX; f.y = QY; f.vx = side * Sm.vx; f.vy = Sm.vy; f.t = 0; f.life = Sm.life + Sm.pop; f.s = 1; f.pop = 0;
      f.rot = side * 0.18; f.side = side; f.sp = -1;
    }
  }
  function spawnDrop(kind) {
    const f = freeFx(), e = EYES[0];
    const Dr = TUNE.drop;
    let s = 1;
    if (kind === FX_TEAR) { poseXY(e.x + P.faceDX - e.r * 0.3, e.y + P.faceDY + e.r * 0.95); f.vx = 0; f.vy = Dr.tearVy; f.life = Dr.tearLife; s = TUNE.sad.tear; }
    else { poseXY(sp.face[0] - sp.r * 2.2, sp.face[1] - sp.r * 1.6); f.vx = Dr.sweatVx; f.vy = Dr.sweatVy; f.life = Dr.sweatLife; }
    f.on = true; f.kind = kind; f.x = QX; f.y = QY; f.t = 0; f.s = s; f.pop = 0; f.rot = 0; f.side = 0; f.sp = -1;
  }
  function spawnDebris(kind, x, y, rot, bottom) {
    let d = null;
    for (let i = 0; i < DEB.length; i++) if (!DEB[i].on) { d = DEB[i]; break; }
    if (!d) return null;
    const D = TUNE.debris, dl = yeetDir * wf;
    d.on = true; d.kind = kind; d.x = x; d.y = y; d.rot = rot; d.t = 0; d.alpha = 1; d.rest = false; d.bottom = bottom; d.w = false;
    d.wp = false; d.rip = false; d.free = false; d.sc = 1; d.ribbon = false; d.arc = 0;
    d.vx = dl * rnd(D.vxMin, D.vxMax) * (Math.random() < 0.3 ? -1 : 1); d.vy = -rnd(D.vyMin, D.vyMax); d.vr = rnd(-D.spin, D.spin);
    nDeb++;
    return d;
  }
  // anchor a debris in WORLD space at the frame of the last draw (or of the next one, if the actor was never drawn)
  function worldDeb(d) {
    d.w = true;
    if (drawn) { d.wp = false; d.wx0 = wx; d.wy0 = wy; d.ws0 = ws > 0 ? ws : 1; d.wf0 = wf; }
    else { d.wp = true; nPend++; }
  }
  function pinPending() {            // track(): debris spawned before the first draw take this draw's frame
    for (let i = 0; i < DEB.length; i++) {
      const d = DEB[i];
      if (d.on && d.wp) { d.wp = false; d.wx0 = wx; d.wy0 = wy; d.ws0 = ws > 0 ? ws : 1; d.wf0 = wf; }
    }
    nPend = 0;
  }
  function detachProps() {           // yeet launch: a real hat (and any fake the rip left on: rip false) flies off and bounces
    if (gooP.on) { spawnDebris(DEB_GOO, gooP.px + offX, gooP.py + offY, 0, G.R); gooP.on = false; }
    if (hatP.on && hatP.kind !== 'outfit') { spawnDebris(hatP.fake ? DEB_PAPER : DEB_HAT, hatP.ax + hatP.ox + offX, hatP.ay + hatP.oy + offY, P.rot + hatP.base + hatP.dr, 3); hatP.on = false; }
    if (tailP.on && tailP.fake) { spawnDebris(DEB_TAIL, tailP.ax + offX, tailP.ay + offY, P.rot + tailP.base + tailP.dr, 6); tailP.on = false; }
  }
  // BUSTED (TUNE.rip), at setState('yeet'): every FAKE part tears off the body as it ducks into the crouch: a world-anchored
  // outBack pop away from it (so the scene drifting / shrinking the flyer never drags it along), a puff + scraps where it
  // tore, and the tape that held it (the tail: its ribbon end) fluttering down as a strip. ax = local x pointing AWAY from
  // the throw: every part lands on that side, clear of the flying body and of the queue (the tied-on tail, on the back,
  // is flung over the ducking head to get there)
  function ripFakes() {
    const R = TUNE.rip, ax = -yeetDir * wf;
    if (gooP.on) {
      const c = R.goo;
      ripPart(DEB_GOO, gooP.px + offX, gooP.py + offY, 0, G.R, c.dir[0] * ax, c.dir[1], c.dist, c.twist * ax, 0, OV_RIP_GOO);
      ripStrip(gooP.ax + offX, gooP.ay + offY, P.rot + G.tapeRot, G.R * 1.15, G.R * 0.78, false, c.dir[0] * ax);
      gooP.on = false;
    }
    if (hatP.on && hatP.fake) {
      const c = R.hat, PP = TUNE.paper, hs = sp.hatS, a = P.rot + hatP.base + hatP.dr, cs = Math.cos(a), sn = Math.sin(a);
      const hx = hatP.ax + hatP.ox + offX, hy = hatP.ay + hatP.oy + offY, tx = PP.tapeX * hs, ty = PP.tapeY * hs;
      ripPart(DEB_PAPER, hx, hy, a, 3, c.dir[0] * ax, c.dir[1], c.dist, c.twist * ax, 0, OV_RIP_PAPER);
      ripStrip(hx + tx * cs - ty * sn, hy + tx * sn + ty * cs, a + PP.tapeRot, PAPER_W * PP.tapeK * 0.5 * hs, PP.tapeH * hs, false, c.dir[0] * ax);
      hatP.on = false;
    }
    if (tailP.on && tailP.fake) {
      // over the top: the arc's middle (outBack ~1.09 of dy by then) clears the crouched silhouette top by R.clear
      const c = R.tail, y0 = tailP.ay + offY, top = sp.outer[1] * TUNE.yeet.csy;
      const arc = Math.max(c.arc, y0 + c.dir[1] * c.dist * 1.09 - top + R.clear);
      ripPart(DEB_TAIL, tailP.ax + offX, y0, P.rot + tailP.base + tailP.dr, 6, c.dir[0] * ax, c.dir[1], c.dist, c.twist * ax, arc,
        OV_RIP_TAIL[spec.color] || OV_RIP_PAPER);
      ripStrip(tailP.ax + offX, y0, P.rot + 0.4, 10, 3.6, true, -0.5 * ax);   // the ribbon end drops off behind
      tailP.on = false;
    }
  }
  function ripPart(kind, x, y, rot, bottom, dx, dy, dist, twist, arc, ov) {
    const d = spawnDebris(kind, x, y, rot, bottom);
    if (!d) return;
    worldDeb(d);
    d.rip = true; d.x0 = x; d.y0 = y; d.dx = dx * dist; d.dy = dy * dist; d.r0 = rot; d.drot = twist; d.arc = arc;
    d.vx = 0; d.vy = 0; d.vr = 0;
    ripN++;
    emit('actorRipPuff', x - offX, y - offY, OV_RIP_PUFF);
    emit('actorRipBits', x - offX, y - offY, ov);
  }
  function ripStrip(x, y, rot, w, h, ribbon, dirX) {
    const R = TUNE.rip, d = spawnDebris(DEB_STRIP, x, y, rot, 1.5);
    if (!d) return;
    worldDeb(d);
    d.sw = w; d.sh = h; d.ribbon = ribbon; d.ph = rnd(0, TAU);
    d.vx = dirX * rnd(R.stripVx[0], R.stripVx[1]); d.vy = -rnd(R.stripVy[0], R.stripVy[1]); d.vr = 0;
  }
  // a dropped costume part stays where it fell in world space (the sneak admit): thrown back toward the street, up, spinning
  function flapOff(d) {
    if (!d) return;
    const K = TUNE.sneak;
    worldDeb(d);
    d.vx = -rnd(K.flapVx[0], K.flapVx[1]); d.vy = -rnd(K.flapVy[0], K.flapVy[1]); d.vr = (Math.random() < 0.5 ? -1 : 1) * rnd(0.6, 1) * K.flapSpin;
  }
  function flapFakes() {             // sneak admit, at the threshold: the costume (fake props only) flaps off; a real hat stays
    if (gooP.on) { flapOff(spawnDebris(DEB_GOO, gooP.px + offX, gooP.py + offY, 0, G.R)); gooP.on = false; }
    if (hatP.on && hatP.fake) { flapOff(spawnDebris(DEB_PAPER, hatP.ax + hatP.ox + offX, hatP.ay + hatP.oy + offY, P.rot + hatP.base + hatP.dr, 3)); hatP.on = false; }
    if (tailP.on && tailP.fake) { flapOff(spawnDebris(DEB_TAIL, tailP.ax + offX, tailP.ay + offY, P.rot + tailP.base + tailP.dr, 6)); tailP.on = false; }
  }

  // ---------------------------------------------------------------- states
  function finish() {
    const cb = onDone;
    onDone = null;
    if (state === 'admit') { patience = 0; setState('idle'); }   // admitted guests are happy: never back to a bored wait
    else setState(loopState);
    if (cb) cb(actor, false);
  }
  function restore() {
    gone = false; vanish = false; launched = false; offX = 0; offY = 0; spin = 0;
    for (let i = 0; i < DEB.length; i++) DEB[i].on = false;
    nDeb = 0; nPend = 0;
    layout();
  }
  // Switches state. A one-shot still running is cancelled: an interrupted shapeshift pops its new attribute in right now
  // (the actor must always show what data.js judges) and the dropped onDone is called with cancelled = true at the end.
  function setState(name, o) {
    if (!KNOWN[name]) return actor;
    o = o || NO;
    const prev = state, dropped = onDone;
    onDone = null;
    if (prev === 'shift' && !popped && pend.attr) pop();
    if (prev === 'admit' && admitSneak) {          // the impostor got in: the costume drops (if the threshold was cut short)
      if (!flapped) { flapped = true; flapFakes(); }  // and the sly face lingers into the walk inside
      slyT = TUNE.sneak.linger; admitSneak = false;
    }
    pend.attr = null;
    if (prev === 'yeet' || gone || vanish) restore();
    state = name; st = 0;
    onDone = typeof o.onDone === 'function' ? o.onDone : null;
    if (name !== 'sleep' && name !== 'wait' && name !== 'yawn') {
      for (let i = 0; i < FX.length; i++) { const f = FX[i]; if (f.on && f.kind === FX_Z && f.life - f.t > 0.3) f.life = f.t + 0.3; }
    }
    if (LOOP[name]) {
      loopState = name;
      if (prev !== name && prev !== 'yeet' && P.pivotY === 0) { copyPose(PB, PR); blendT = TUNE.blend; }   // not mid-spin / flight
    } else blendT = 0;
    launched = false; popped = false; landed = false; admitUp = false; admitApex = false; flapped = false; lastHop = 0; yawnZ = 0;
    offX = 0; offY = 0; spin = 0; ripN = 0;
    if (name === 'walk') walkDust = o.dust !== false;
    else if (name === 'idle' || name === 'wait') {
      if (prev === 'walk' || (prev === 'sad' && sadWalk)) arrival();
      if (name === 'wait') { yawnClock = 0.4; yawnT = -1; if (prev === 'walk' && o.wave !== false) { waveT = TUNE.wait.wave; waveDur = waveT; } }
    } else if (name === 'yeet') {
      yeetDir = o.dir < 0 ? -1 : 1;
      if (o.rip !== false) ripFakes();   // BUSTED: the fakes tear off first (a.ripped counts them for the scene's tag / sfx)
    }
    else if (name === 'dance') {
      tempo = o.tempo > 0 ? o.tempo : TUNE.dance.tempo; beatPhase = o.phase || 0; danceK = o.intensity > 0 ? o.intensity : 0;
      inst = !!o.instrument; IP.s = 0; IKT.wB = 0; IKT.wF = 0;
    }
    else if (name === 'sad') { sadWalk = !!o.walk; tearClock = 0.7; }
    else if (name === 'sleep') { zClock = 0.3; zIdx = 0; }
    else if (name === 'flinch') { kickSquash(1.12, 0.86); spawnDrop(FX_SWEAT); }
    else if (name === 'admit') { admitDir = wf; admitLand = !!o.land; admitSneak = !!o.sneak; }
    if (name !== 'dance') inst = false;
    if (name !== 'idle' && name !== 'wait') { leanTgt = 0; leanK = 0; }   // the drag preview ends with the verdict
    if (dropped) dropped(actor, true);
    return actor;
  }

  // Each species walks its own gait (TUNE.walkSp, k = amplitude, hzK = cadence factor): blob scoots like jelly (no foot
  // lift, the squash and a shear trail the scoot), tall lopes (long slow strides, a big bob, the neck shear and the face
  // trail the body by `lag`), round bounce-hops (both feet leave the ground, squash on every landing), square marches
  // stiffly (outQuad-snapped steps that plant and hold, no roll, near-straight arms), bean sways its hips (shear + a
  // counter slide, so the hips swing and the shoulders answer)
  function poseWalk(dt, k, hzK) {
    const W = TUNE.walk, G = TUNE.walkSp[sp.name], spd = G.hz * hzK * Math.PI;
    walkPh += dt * spd;
    const s1 = Math.sin(walkPh), c1 = Math.cos(walkPh), as = s1 < 0 ? -s1 : s1;
    const lp = walkPh - G.lag * spd, sl = Math.sin(lp), asl = sl < 0 ? -sl : sl;     // the follow-through phase
    const sf = walkPh / Math.PI, si0 = Math.floor(sf), f = sf - si0, odd = si0 & 1;    // step fraction, which foot moves
    let bump = as;
    if (G.snap) {                      // march: the moving foot snaps forward (outQuad), plants by 62 % and holds
      const u = clamp(f / 0.62, 0, 1), eu = easeIndex.outQuad(u), up = Math.sin(Math.PI * u);
      const mv = (2 * eu - 1) * G.stride * k, pl = (1 - 2 * f) * G.stride * k, fl = up * G.lift * k;
      if (odd) { P.ffx = mv; P.ffy = fl; P.fbx = pl; P.fby = 0; } else { P.fbx = mv; P.fby = fl; P.ffx = pl; P.ffy = 0; }
      bump = up;
      P.rot = G.lean * k;
      const sw = (odd ? -1 : 1) * (2 * eu - 1);
      P.armB = sp.armRest + G.arm * sw * k; P.armF = -sp.armRest - G.arm * sw * k;
      P.eKB = P.eKF = 0.3;
    } else {
      P.fbx = -c1 * G.stride * k; P.fby = (s1 > 0 ? s1 : 0) * G.lift * k;
      P.ffx = c1 * G.stride * k; P.ffy = (s1 < 0 ? -s1 : 0) * G.lift * k;
      P.rot = (G.lean + G.waddle * s1) * k;
      P.armB = sp.armRest + G.arm * s1 * k; P.armF = -sp.armRest - G.arm * s1 * k;
    }
    P.swayX = G.sway * s1 * k;
    if (G.hop) {                       // round: every step is a hop; the feet leave the ground with the body
      const air = 4 * f * (1 - f);
      P.lift = G.hop * air * k; P.plant = 1 - 0.85 * k;
      P.sy = 1 + G.sy * (air - 0.5) * k; P.sx = 1 - G.sx * (air - 0.5) * k;
      bump = air;
    } else {
      P.lift = sp.h * G.bob * bump * k;
      const sq = (G.lag > 0 ? asl : bump) - 0.5;   // stretch at the top of the step, squash at the contact (lagged on jelly)
      P.sy = 1 + G.sy * sq * k; P.sx = 1 - G.sx * sq * k;
    }
    if (G.skew) {
      if (sp.name === 'blob') P.skew = G.skew * Math.cos(2 * lp) * k;                 // jelly: the top trails each scoot
      else if (sp.name === 'bean') { P.skew = G.skew * s1 * k; P.swayX += G.skew * s1 * k * sp.h * 0.4; }   // hips
      else P.skew = G.skew * sl * k;                                                   // neck follow-through
    }
    if (G.head) P.faceDY += G.head * (asl - 0.5) * k;
    P.gaze = GAZE_FWD;
    const si = Math.floor(walkPh / Math.PI);
    if (si !== stepIdx) {
      stepIdx = si;
      if (walkDust && k > 0.8) emit('actorDust', (si & 1) ? sp.feet[0] : sp.feet[1], 0, OV_DUST);
    }
    E.mouth = M_OPEN; E.open = W.open + W.openBob * as;
  }
  function poseIdle(dt) {
    const I = TUNE.idle, br = Math.sin(t * TAU * I.hz + seed);
    P.sy = 1 + I.breathe * br; P.sx = 1 - I.breathe * 0.45 * br;
    P.swayX = I.shift * noise1(t * I.shiftHz + seed);
    P.rot = I.roll * noise1(t * I.shiftHz * 1.3 + seed + 7.7);
    P.armB = sp.armRest + I.breatheArm * br; P.armF = -sp.armRest - I.breatheArm * br;
    if (!still) {                    // groove: lean left / right on alternate beats, dip on every beat (shared clock)
      const bn = beatNow(I.bpm, clk) + grooveOff, bp = bn * Math.PI, gs = Math.cos(bp), gb = Math.sin(bp);
      P.rot += I.groove * gs; P.swayX += I.grooveSway * gs; P.lift += I.grooveBob * (gb < 0 ? -gb : gb);
      P.armB += I.grooveArm * gs; P.armF += I.grooveArm * gs;
      // weight shift: once the clock runs out, the next beat lands a hip kick onto the other foot (the standing tell)
      hipClock -= dt;
      const bi = Math.floor(bn);
      if (bi !== hipBeat) {
        hipBeat = bi;
        if (hipClock <= 0 && (state === 'idle' || (state === 'wait' && yawnT < 0))) {   // never mid-yawn
          const W = TUNE.wait, k = state === 'wait' ? 1 : I.hip;
          hipClock = rnd(W.hipEvery[0], W.hipEvery[1]);
          hipSide = -hipSide; hipFrom = hipX; hipTo = hipSide * W.hipA * k; hipT = 0;
          sqvy -= W.hipSq * k; sqvx += W.hipSq * 0.6 * k;
        }
      }
      hipOn = true; hipT += dt;
      const hd = TUNE.wait.hipDur;
      hipX = hipT < hd ? lerp(hipFrom, hipTo, easeIndex.inOutSine(hipT / hd)) : hipTo;
    }
    fidgetClock -= dt;
    if (fidgetClock <= 0) {
      fidgetClock = rnd(I.fidgetMin, I.fidgetMax);
      const r = Math.random();
      if (r < 0.35) { sqvx += I.settle * 0.7; sqvy -= I.settle; }   // a settle bounce (velocity: no position step)
      else if (r < 0.6 && !hasLook) { tgx = Math.random() < 0.5 ? -0.95 : 0.95; tgy = rnd(-0.5, 0.2); gazeClock = 1.3; }
      else if (r < 0.8) { blinkClock = 0; blinkTwice = true; }
      else if (waveT <= 0) { waveT = TUNE.wave.dur; waveDur = waveT; }   // never restart a running wave (its ramp would snap)
    }
    if (waveT > 0) {
      const Wv = TUNE.wave;
      waveT -= dt;
      const k = Math.min(1, waveT * Wv.ramp, (waveDur - waveT) * Wv.ramp);   // ramps in and out from the wave's own length
      P.armF = lerp(P.armF, Wv.arm + Wv.amp * Math.sin(t * TAU * Wv.hz), clamp(k, 0, 1));
    }
  }
  function poseYawn(u) {
    // inhale: the body stretches up (sy), the head tips back and the arms rise overhead while the mouth only parts; hold:
    // the mouth opens at its widest, the lids droop (never past lidMax: the pupils and the eye count stay visible) and a
    // yawn tear wells up; exhale: arms fall, the body sags and the head nods forward, recovering by u = 1 (no pop)
    const Y = TUNE.yawn, ease = easeIndex.inOutSine;
    const inh = u < Y.inhale ? ease(u / Y.inhale) : 1, out = u < Y.hold ? 0 : ease((u - Y.hold) / (1 - Y.hold));
    const up = inh * (1 - out), wide = u < Y.open ? 0.18 * inh : easeIndex.outCubic(clamp((u - Y.open) / 0.14, 0, 1)) * (1 - out);
    const sag = Math.sin(out * Math.PI), lid = Math.min(Y.lidMax, 0.2 * inh + 0.25 * wide);
    E.mouth = M_YAWN; E.open = wide; E.lid = Math.max(Math.min(E.lid, Y.lidMax), lid); E.brow = BROW_NONE;
    E.eyes = EYE_OPEN; E.wet = Math.max(E.wet, Y.wet * wide);   // (no blinks start mid-yawn, see updateBlink)
    P.sy *= 1 + Y.sy * up - Y.sag * sag; P.sx *= 1 - Y.sx * up + Y.sag * 0.5 * sag;
    P.rot += Y.back * up + Y.droop * sag; P.faceDY += -Y.lift * up + Y.face * sag;
    const sh = Y.shiver * Math.sin(t * TAU * 9) * wide;
    P.armB = lerp(P.armB, Y.arm + sh, up); P.armF = lerp(P.armF, -Y.arm - sh, up);
    P.armKB = P.armKF = 1 + (sp.reach - 1) * Y.reachK * up;
    P.eKB = P.eKF = 1 + (Y.elbK - 1) * up;
    if (madK < 0.01) {                 // a guest that is turning mad is past sleepy: no more Z's
      if (u > Y.z1 && yawnZ === 0) { yawnZ = 1; spawnZ(0); }
      else if (u > Y.z2 && yawnZ === 1) { yawnZ = 2; spawnZ(2); }
    }
  }
  function poseWait(dt) {
    const W = TUNE.wait, p = patience;
    madK = damp(madK, p >= W.mad ? 1 : 0, W.madRate, dt);   // blended, so crossing the threshold never pops
    if (p >= W.bored) {
      E.mouth = M_FLAT; E.lid = Math.max(E.lid, 0.16);
      jawTgt = (p >= W.yawnAt ? TUNE.jaw.sleepy : TUNE.jaw.bored) * (1 - madK);   // square: the jaw goes slack
      // the tension curve: the foot tap speeds up (tapHz[0] -> [1] over tapRamp) and hits harder as patience runs out
      const pr = clamp((p - W.tapRamp[0]) / (W.tapRamp[1] - W.tapRamp[0]), 0, 1);
      tapPh += dt * lerp(W.tapHz[0], W.tapHz[1], pr) * TAU;
      const tp = Math.sin(tapPh);
      P.ffy = tp > 0 ? tp * lerp(W.tap, W.madTap, Math.max(madK, pr * pr)) : 0; P.ffx = W.tapX;
    }
    if (p >= W.sweatAt) {               // nervous sweat: a drop flies off the head, then again every sweatEvery s
      sweatClock -= dt;
      if (sweatClock <= 0) { sweatClock = W.sweatEvery; spawnDrop(FX_SWEAT); }
    } else sweatClock = 0;
    if (p > W.flushAt) E.flush = smoothstep(W.flushAt, 1, p);   // the face flushes red from the chin up
    if (p >= W.yawnAt && madK < 0.5) {   // sleepy (yawns) until it turns mad
      E.lid = Math.max(E.lid, W.sleepyLid);
      yawnClock -= dt;
      if (yawnClock <= 0 && yawnT < 0) { yawnT = 0; yawnZ = 0; yawnClock = W.yawnEvery; }
    } else yawnClock = 0.3;
    if (madK > 0.001) popZ();
    if (madK > 0.01) {
      E.brow = BROW_MAD; E.browA = madK;
      P.eKB = P.eKF = 1 + 0.9 * madK;                                                  // elbows out: fists on the hips
      E.lid = lerp(E.lid, W.madLid, madK);
      if (madK > 0.5) E.mouth = M_FROWN;
      P.armB = lerp(P.armB, W.madArm, madK); P.armF = lerp(P.armF, -W.madArm, madK);   // fists folded in on the hips
      const pf = madK * (0.5 + 0.5 * Math.sin(t * TAU * W.puffHz));                     // puffed cheeks, pulsing
      P.sx *= 1 + W.puff * pf; P.sy *= 1 - W.puff * 0.3 * pf;
      E.puff = pf; E.anger = madK; E.blush = Math.max(E.blush, madK);
      const pb = Math.floor(t * W.puffHz - 0.25);                                       // the puff beat: each cheek peak
      if (pb !== steamBeat) { steamBeat = pb; if (madK > 0.6) spawnSteam(); }        // ...blows a pair of steam puffs
    }
    if (yawnT >= 0) {
      yawnT += dt;
      poseYawn(yawnT / TUNE.yawn.dur);
      if (yawnT >= TUNE.yawn.dur) yawnT = -1;
    }
    if (waveT > 0 && p < W.bored) { E.mouth = M_GRIN; E.blush = 0.6; }
  }
  function poseCheer() {
    const C = TUNE.cheer, u = st / C.dur;
    const hp = (u * C.hops) % 1, hi = Math.floor(u * C.hops), s = Math.sin(hp * Math.PI);
    if (hi !== lastHop && hi <= C.hops) { lastHop = hi; kickSquash(1.12, 0.85); emit('actorDust', 0, 0, OV_DUST); }
    P.lift = C.hop * 4 * hp * (1 - hp); P.plant = 0;
    P.sy = 1 + C.sy * s; P.sx = 1 - C.sx * s;
    // both arms shoot up into a wide V on every hop (rubber-hose stretch), easing in over the first 80 ms; at the apex the
    // elbows lock straight and the mittens spread, on the landing they re-bend (follow-through)
    const k = clamp(st / 0.08, 0, 1), w = C.armAmp * Math.sin(t * TAU * C.armHz), ap = smoothstep(C.lock[0], C.lock[1], s);
    P.armB = lerp(sp.armRest, C.arm + w, k); P.armF = lerp(-sp.armRest, -C.arm - w, k);
    P.armKB = P.armKF = lerp(1, sp.reach * (0.85 + 0.15 * s), k);
    P.eKB = P.eKF = lerp(1, lerp(C.elbLand, C.elbApex, ap), k);
    P.mitt = 1 + (C.mitt - 1) * ap * k;
    E.eyes = EYE_HAPPY; E.mouth = M_GRIN; E.open = 1; E.blush = 1;
    P.wag = 0.5 * Math.sin(t * TAU * 6); P.wing = 0.55 * Math.sin(t * TAU * 9); P.gaze = GAZE_UP;
    if (u >= 1) finish();
  }
  function launch() {
    const Y = TUNE.yeet, dl = yeetDir * wf;
    launched = true;
    yeetVX = dl * Y.vx; yeetVY = -Y.vy; yeetSpin = dl * Y.spin;
    kickSquash(1, 1);                  // the launch stretch is keyframed in poseYeet (lined up with the velocity)
    spin = 0;
    detachProps();
    emit('actorDust', 0, 0, OV_DUST_BIG);
    emit('stars', 0, -sp.h * 0.5, OV_STARS);
  }
  function poseYeet(dt) {
    const Y = TUNE.yeet;
    E.mouth = M_O; E.open = 1; E.pupil = 0.62; E.brow = BROW_UP; E.lid = 0.02; P.plant = 0;
    P.armB = Y.arm + Y.armAmp * Math.sin(t * TAU * Y.armHz); P.armF = -Y.arm - Y.armAmp * Math.sin(t * TAU * Y.armHz + 1.3);
    P.armKB = P.armKF = Y.flingK;
    if (st < Y.crouch) {               // wind-up: both arms tuck down and back, elbows bent
      const k = easeIndex.outQuad(st / Y.crouch);
      P.sy = lerp(1, Y.csy, k); P.sx = lerp(1, Y.csx, k); P.plant = 1;
      P.armB = sp.armRest + Y.crouchB * k; P.armF = -sp.armRest + Y.crouchF * k;
      P.armKB = P.armKF = 1; P.eKB = P.eKF = 1 + (Y.crouchE - 1) * k;
      return;
    }
    if (!launched) launch();
    offX += yeetVX * dt; offY += yeetVY * dt; yeetVY += Y.g * dt;
    // smear: for `align` s the body's up axis follows the velocity (so sx .6 / sy 1.55 stretches ALONG the throw), then the
    // spin takes over (ramping in) while the stretch springs back to 1 with a small overshoot
    const ft = st - Y.crouch, va = Math.atan2(yeetVY, yeetVX) + Math.PI / 2;
    if (ft < Y.align) {
      const k = easeIndex.outQuad(clamp(ft / Y.snap, 0, 1));
      spin = va * k;
      P.sx = lerp(Y.csx, Y.ssx, k); P.sy = lerp(Y.csy, Y.ssy, k);
    } else {
      spin += yeetSpin * clamp((ft - Y.align) / Y.spinRamp, 0, 1) * dt;
      const r = easeIndex.outBack(clamp((ft - Y.align) / Y.relax, 0, 1));
      P.sx = lerp(Y.ssx, 1, r); P.sy = lerp(Y.ssy, 1, r);
    }
    P.rot = spin; P.pivotY = -sp.h * 0.5;
    if (st >= Y.crouch + Y.flight || flownOff()) vanish = true;   // well past a screen edge: stop drawing the body
    if (st >= Y.crouch + Y.exit && !gone) {                // off-screen: the scene may move on (90 + 320 ms budget)
      gone = true;
      const cb = onDone; onDone = null;
      if (cb) cb(actor, false);
    }
  }
  // The drag preview (lean(k), on top of the idle / wait pose): toward IN the guest perks up (stretch, fists up "pick me!",
  // brows up, big pupils, grin, blush); toward OUT it shrinks and trembles (hands pulled in to the belly, sad brows, small
  // pupils, a wobbly mouth). The body blends with |k|; the face switches past TUNE.lean.face and always keeps its eyes
  // open (the eye count stays readable). Anger, puff and the red flush fade under it.
  function poseLean(k) {
    const L = TUNE.lean, a = k < 0 ? -k : k, f = a > L.face;
    if (k > 0) {
      P.sy *= 1 + L.stretch * a; P.sx *= 1 - L.stretch * 0.5 * a;
      P.armB = lerp(P.armB, L.hands, a); P.armF = lerp(P.armF, -L.hands, a);
      P.eKB = P.eKF = lerp(P.eKB, L.handsElb, a);
      E.pupil = lerp(E.pupil, L.pupilUp, a);
      if (f) { E.brow = BROW_UP; E.mouth = M_GRIN; E.open = 0.7 + 0.3 * a; E.blush = Math.max(E.blush, L.blush * a); }
    } else {
      P.sy *= 1 - L.shrink * a; P.sx *= 1 + L.shrink * 0.4 * a;
      P.swayX += L.shake * a * Math.sin(t * TAU * L.shakeHz);
      P.armB = lerp(P.armB, -0.25, a); P.armF = lerp(P.armF, 0.25, a);
      P.eKB = P.eKF = lerp(P.eKB, 1.5, a);
      E.pupil = lerp(E.pupil, L.pupilDown, a);
      if (f) { E.brow = BROW_SAD; E.mouth = M_WORRY; E.blush = 0; }
    }
    if (f) { E.eyes = EYE_OPEN; E.browA = 1; E.lid = Math.min(E.lid, 0.04); E.wet = 0; }
    E.anger *= 1 - a; E.puff *= 1 - a; E.flush *= 1 - a;
  }
  // the thrown body's centre (last draw) is TUNE.yeet.edge x its height past the left / right / bottom stage edge (going
  // over the top is fine: the arc brings it back down)
  function flownOff() {
    if (!drawn) return false;
    const m = sp.h * TUNE.yeet.edge * ws, cx = wX(offX), cy = wY(offY - sp.h * 0.5);
    return cx < -m || cx > stage.w + m || cy > stage.h + m;
  }
  function poseFlinch() {
    const F = TUNE.flinch, u = st / F.dur;
    const env = u < 0.18 ? easeIndex.outQuad(u / 0.18) : 1 - easeIndex.inOutSine(clamp((u - 0.18) / 0.82, 0, 1));
    P.rot += -F.lean * env; P.swayX -= F.push * env;
    E.eyes = env > 0.3 ? EYE_SQUEEZE : EYE_OPEN; E.mouth = M_WORRY; E.brow = BROW_UP; E.lid = 0.02;
    P.armF = lerp(P.armF, F.armF, env); P.armB = lerp(P.armB, F.armB, env);
    if (u >= 1) finish();
  }
  function poseAdmit() {
    const A = TUNE.admit;
    E.eyes = EYE_HAPPY; E.mouth = M_GRIN; E.open = 1; E.blush = 1; P.plant = 0; P.gaze = GAZE_UP;
    P.armB = A.arm + A.armAmp * Math.sin(t * TAU * 4); P.armF = -A.arm - A.armAmp * Math.sin(t * TAU * 4 + 1);
    P.wag = 0.55 * Math.sin(t * TAU * 7); P.wing = 0.6 * Math.sin(t * TAU * 10);
    if (st < A.crouch) {
      const k = easeIndex.outQuad(st / A.crouch);
      P.sy = 1 - A.csy * k; P.sx = 1 + A.csx * k; P.plant = 1;
      P.armB = lerp(sp.armRest, sp.armRest + 0.5, k); P.armF = lerp(-sp.armRest, -sp.armRest + 0.7, k); P.eKB = P.eKF = 1.6;
    } else if (st < A.crouch + A.air) {
      const u = (st - A.crouch) / A.air;
      if (!admitUp) { admitUp = true; kickSquash(0.86, 1.2); emit('sparkle', 0, -sp.h * 0.4, OV_SPARK); emit('actorDust', 0, 0, OV_DUST); }
      P.lift = A.hop * 4 * u * (1 - u);
      P.rot = TAU * easeIndex.inOutCubic(u) * admitDir * wf; P.pivotY = -sp.h * 0.5;
      if (u > 0.5 && !admitApex) { admitApex = true; emit('stars', 0, -sp.h * 0.6 - A.hop, OV_STARS); }
    } else if (!admitLand) finish();                      // airborne at the door: the scene flies the guest through it
    else {
      if (!landed) { landed = true; kickSquash(A.landSx, A.landSy); emit('actorDust', 0, 0, OV_DUST_BIG); }
      const lu = (st - A.crouch - A.air) / A.landHold;   // weight: the landing squash holds before the spring takes it back
      if (lu < 1) { const h = 1 - easeIndex.inOutSine(lu < 0 ? 0 : lu); P.sy *= 1 - (1 - A.landSy) * 0.35 * h; P.sx *= 1 + (A.landSx - 1) * 0.35 * h; }
      P.armB = lerp(P.armB, sp.armRest + 0.3, 0.6); P.armF = lerp(P.armF, -sp.armRest - 0.3, 0.6);
      if (st >= A.crouch + A.air + A.land) finish();
    }
  }
  // the impostor slipping in (TUNE.sneak): sly crouch -> low tiptoe hop toward the door with a look back over the shoulder
  // and a wink -> the fakes flap off at the threshold. Same timing contract as poseAdmit (onDone at crouch + air)
  function poseSneak() {
    const A = TUNE.admit, K = TUNE.sneak, air = A.crouch + A.air;
    E.mouth = M_SLY; E.lid = K.lid; E.brow = BROW_SLY; E.blush = 0; P.gaze = GAZE_BACK; P.wag = K.wag * Math.sin(t * TAU * 5);
    P.wing = 0.25 * Math.sin(t * TAU * 6);
    if (st < A.crouch) {               // the sly crouch: sink, the paws come up
      const k = easeIndex.outQuad(st / A.crouch);
      P.sy = 1 - K.csy * k; P.sx = 1 + K.csx * k; P.rot = K.lean * 0.5 * k;
      P.armF = lerp(-sp.armRest, K.armF, k); P.armB = lerp(sp.armRest, K.armB, k); P.eKF = P.eKB = lerp(1, K.elbK, k);
      return;
    }
    if (st < air) {                    // the tiptoe hop: lean in, look back, wink
      const u = (st - A.crouch) / A.air, lk = easeIndex.outCubic(clamp(u / K.look, 0, 1));
      if (!admitUp) { admitUp = true; kickSquash(0.9, 1.12); emit('actorDust', 0, 0, OV_DUST); }
      P.plant = 0; P.lift = K.hop * 4 * u * (1 - u);
      P.rot = K.lean * (0.5 + 0.5 * lk); P.sy = 1 + 0.05 * lk; P.sx = 1 - 0.03 * lk;
      P.armF = K.armF + 0.12 * Math.sin(u * TAU * 2); P.armB = K.armB - 0.1 * Math.sin(u * TAU * 2); P.eKF = P.eKB = K.elbK;
      P.fbx = -3 * lk; P.fby = 3 * lk; P.ffy = 1.5 * lk;   // tiptoe: the back foot trails
      P.faceDX = -sp.r * K.faceBack * lk; P.faceDY = -K.faceUp * lk;
      if (u >= K.wink && nEyes > 1) E.wink = 2;           // the front eye
      if (u >= K.flap && !flapped) { flapped = true; flapFakes(); }   // the threshold: the costume flaps off
      return;
    }
    if (!flapped) { flapped = true; flapFakes(); }
    if (!admitLand) { finish(); return; }                 // the scene walks it on in
    if (!landed) { landed = true; kickSquash(A.landSx, A.landSy); emit('actorDust', 0, 0, OV_DUST); }
    const lu = clamp((st - air) / A.land, 0, 1), k = 1 - easeIndex.inOutSine(lu);
    P.rot = K.lean * 0.5 * k; P.faceDX = -sp.r * K.faceBack * k; P.faceDY = -K.faceUp * k;
    P.armF = lerp(-sp.armRest, K.armF, k); P.armB = lerp(sp.armRest, K.armB, k); P.eKF = P.eKB = lerp(1, K.elbK, k);
    if (nEyes > 1 && lu < 0.6) E.wink = 2;
    if (st >= air + A.land) finish();
  }
  // Each species dances its own signature move on the shared beat (its instrument's feel):
  // blob = drum shimmy, tall = noodle wave rolling up through the neck, round = double-time bounce with a roll every
  // rollEvery beats, square = robot: 4 keyed poses with right-angle elbows, one per 8th note (snap, then hold), bean =
  // disco point with alternating arms. Guests drawn small dance bigger (TUNE.dance small / tiny / boost) so the moves
  // still read in the ~40 px party window instead of turning into jitter.
  // robot keys: [rot, back upper arm, back forearm, front upper arm, front forearm] (rotations of the hanging arm: 0 down,
  // +/-PI/2 out to the side, +/-PI up; forearm - upper arm = a right-angle elbow)
  const RH = Math.PI / 2, RP = Math.PI;
  const ROBOT = [0.09, RH, RP, -RH, -RP, -0.09, RH, 0, -RH, -RP, 0.09, 0, -RH, -RH, 0, -0.09, RH, RP, 0, -RH];
  function poseDance() {
    const D = TUNE.dance;
    const beat = beatNow(tempo, clk) + beatPhase, bi = Math.floor(beat), bf = beat - bi;
    const inv = 1 - bf, hit = inv * inv * inv * inv, sw = Math.sin(beat * Math.PI), up = Math.sin(bf * Math.PI);
    const sc = drawn ? ws : 1, amp = danceK > 0 ? danceK : 1 + (D.boost - 1) * clamp((D.small - sc) / (D.small - D.tiny), 0, 1);
    let rolling = false;
    P.plant = 0.55; P.wag = 0.45 * sw; P.wing = 0.5 * Math.sin(t * TAU * 6); P.gaze = GAZE_UP;
    E.mouth = ((bi >> 2) & 1) ? M_GRIN : M_OPEN; E.open = 0.6 + 0.4 * hit;
    E.eyes = (bi % 4 === 3) ? EYE_HAPPY : EYE_OPEN; E.blush = 0.6;
    P.fby = (bi & 1) ? D.step * up : 0; P.ffy = (bi & 1) ? 0 : D.step * up;
    const mv = sp.dance;
    if (mv === 'shimmy') {             // drummer: a drum loop on the 8ths, front arm on the beats, back arm on the off-beats
      const sec = 60 / tempo, f8 = beat * 2 - Math.floor(beat * 2), ring = (1 - f8) * (1 - f8);
      const aF = drumArm(bf * sec, sec), aB = drumArm((bf < 0.5 ? bf + 0.5 : bf - 0.5) * sec, sec);
      P.armF = -aF; P.armB = aB;
      // raised: the rubber-hose arm stretches (drumReach) so the mitten clears the dome, elbow bent; on the hit: straight
      const span = D.drumUp - D.drumDown, uF = clamp((aF - D.drumDown) / span, 0, 1), uB = clamp((aB - D.drumDown) / span, 0, 1);
      P.eKF = lerp(D.drumElb[1], D.drumElb[0], uF); P.eKB = lerp(D.drumElb[1], D.drumElb[0], uB);
      P.armKF = 1 + (D.drumReach - 1) * uF; P.armKB = 1 + (D.drumReach - 1) * uB;
      const j = Math.sin(f8 * TAU * 1.5) * ring;                          // jelly ringing after every 8th (follow-through)
      P.lift = D.bounce * 0.3 * up;
      P.sy = 1 - (1 - D.drumDip) * hit - D.shimmy * 0.8 * j; P.sx = 1 + (1 - D.drumDip) * 0.55 * hit + D.shimmy * j;
      P.swayX = D.drumSway * Math.cos(beat * TAU);                         // leans into whichever arm is hitting
      const side = (bi >> 1) & 1 ? -1 : 1, bk = easeIndex.outBack(clamp((((beat % 2) + 2) % 2) / D.bangSnap, 0, 1));
      P.rot = D.drumBang * lerp(-side, side, bk);                          // head-bang: tilts over every 2 beats
      P.fby = 0; P.ffy = 0;
      if ((bi & 3) === 0 && bf < 0.6) {                                    // beat 1 of the bar: cheeks puffed, lips pursed
        const pf = D.drumPuff * Math.sin(bf / 0.6 * Math.PI);
        E.puff = pf; E.mouth = M_O; E.open = 0; P.sx *= 1 + 0.05 * pf;
      }
    } else if (mv === 'wave') {        // bassist: slow sway, the shear lags the lean so a wave rolls up the noodle
      const ph = beat * Math.PI * 0.5;
      P.lift = D.bounce * 0.4 * up;
      P.rot = D.waveRot * Math.sin(ph); P.skew = D.waveSkew * Math.sin(ph - D.waveLag); P.swayX = 2 * Math.sin(ph - 0.4);
      P.sy = 1 - D.squash * 0.5 * hit; P.sx = 1 + D.squash * 0.35 * hit;
      P.faceDX += 2.5 * Math.sin(ph - 2.2);
      P.armB = 0.9 + 0.7 * Math.sin(ph - 0.8); P.armF = -0.9 - 0.7 * Math.sin(ph + Math.PI - 0.8);
      P.armKB = P.armKF = 1.15; P.eKB = P.eKF = 1.4;
      E.mouth = M_SMILE; E.eyes = EYE_HAPPY;
    } else if (mv === 'roll') {        // keys: double-time bounce, and every rollEvery beats a full roll over one beat
      const b2 = beat * 2, f2 = b2 - Math.floor(b2), u2 = Math.sin(f2 * Math.PI), i2 = 1 - f2, h2 = i2 * i2 * i2 * i2;
      P.lift = D.bounce * 0.85 * u2; P.sy = 1 - D.squash * h2 + 0.05 * u2; P.sx = 1 + D.squash * 0.8 * h2;
      P.rot = 0.08 * sw; P.swayX = D.swayX * sw;
      P.armB = 2.2 + 0.5 * Math.sin(b2 * Math.PI); P.armF = -2.2 - 0.5 * Math.sin(b2 * Math.PI);
      if (bi % D.rollEvery === D.rollEvery - 1) {
        P.lift = D.bounce * 2.2 * up * amp; P.rot = TAU * easeIndex.inOutCubic(bf); P.pivotY = -sp.h * 0.5; P.sx = 1; P.sy = 1;
        E.eyes = EYE_HAPPY; rolling = true;
      }
    } else if (mv === 'robot') {       // guitarist: snap (robotMove s, outBack) into the next key on every 8th, then hold
      const e8 = beat * 2, i8 = Math.floor(e8), f8 = e8 - i8, b = (i8 & 3) * 5, a = ((i8 + 3) & 3) * 5;
      const mt = D.robotMove * tempo / 30, u = f8 < mt ? f8 / mt : 1, k = easeIndex.outBack(u);
      P.rot = lerp(ROBOT[a], ROBOT[b], k) * (D.robotRot / 0.09);
      const ub = lerp(ROBOT[a + 1], ROBOT[b + 1], k), fb = lerp(ROBOT[a + 2], ROBOT[b + 2], k);
      const uf = lerp(ROBOT[a + 3], ROBOT[b + 3], k), ff = lerp(ROBOT[a + 4], ROBOT[b + 4], k);
      P.armB = (ub + fb) * 0.5; P.eB = fb - ub; P.armF = (uf + ff) * 0.5; P.eF = ff - uf;
      P.armKB = P.armKF = D.robotReach;
      P.lift = u < 1 ? 2.5 * Math.sin(Math.PI * u) : 0; P.sx = 1; P.sy = u < 1 ? 1 - 0.035 * Math.sin(Math.PI * u) : 1;
      P.swayX = (i8 & 1 ? -1 : 1) * 1.5;
      const st8 = u < 1 ? D.step * Math.sin(Math.PI * u) : 0;
      P.fby = (i8 & 1) ? st8 : 0; P.ffy = (i8 & 1) ? 0 : st8;
      E.mouth = M_FLAT; E.eyes = EYE_OPEN; P.gaze = GAZE_FWD;
    } else {                           // lead (bean): disco point, switching arms every 2 beats, hips swinging
      const side = (bi >> 1) & 1 ? -1 : 1, sk = easeIndex.outBack(clamp(((beat % 2) + 2) % 2 / 0.25, 0, 1));
      const from = -side;
      const s = lerp(from, side, sk);
      P.lift = D.bounce * 0.6 * up; P.sy = 1 - D.squash * 0.8 * hit; P.sx = 1 + D.squash * 0.6 * hit;
      P.rot = D.discoLean * s; P.swayX = 3 * Math.sin(beat * Math.PI);
      P.armF = lerp(0.35, -D.discoArm, (s + 1) / 2); P.armB = lerp(-0.35, D.discoArm, (1 - s) / 2);
      P.armKF = 1 + 0.35 * clamp(s, 0, 1); P.armKB = 1 + 0.35 * clamp(-s, 0, 1);
      P.eKF = 1 - 0.7 * clamp(s, 0, 1); P.eKB = 1 - 0.7 * clamp(-s, 0, 1);   // the pointing arm goes straight
    }
    if (amp !== 1 && !rolling) {       // small on screen: dance bigger (bounce, lean, sway, shear, steps; squash a little)
      const sq = 1 + (amp - 1) * 0.6;
      P.lift *= amp; P.rot *= amp; P.swayX *= amp; P.skew *= amp; P.fby *= amp; P.ffy *= amp;
      P.sx = 1 + (P.sx - 1) * sq; P.sy = 1 + (P.sy - 1) * sq;
    }
    if (inst) poseInst(beat, bi, bf, up);
  }
  // Band mode: the instrument's pose this step and the hand targets (wrist points) the arm solve pins the hands to after
  // the springs (solveInst). The body keeps its signature groove; only the arms are taken over:
  // drum (blob): each hand rises and strikes its floor tom on the drum loop's 8ths (front on the beats, back on the
  //   off-beats, the same stroke curve as the air drums), the tom head gives on the hit;
  // keys (round): the front hand arpeggiates across the synth on the 8ths, tapping on the 16ths, the back arm keeps waving;
  //   it lets go for the roll and grabs back after it;
  // bass (tall): the front hand slides between two frets every 2 beats, the back hand plucks on the 8ths;
  // guitar (square): robot strums, down / up snapped (outBack) on each 8th, the fret hand jumps every 2 beats;
  // mic (bean): the front hand holds the mic at the mouth, bobbing on the beat; the back arm keeps the disco point.
  const AR = [0, 2, 1, 3];
  function poseInst(beat, bi, bf, up) {
    const I = TUNE.inst, D = TUNE.dance, kind = sp.inst, g = clamp(st / I.grab, 0, 1), w = easeIndex.inOutSine(g);
    IP.s = easeIndex.outBack(g); IP.rot = 0; IKT.wB = 0; IKT.wF = w;
    if (kind === 'drum') {
      const Dm = I.drum, sec = 60 / tempo, span = D.drumUp + D.drumWind - D.drumDown;
      IP.hitF = bf * sec; IP.hitB = (bf < 0.5 ? bf + 0.5 : bf - 0.5) * sec;
      const uF = clamp((drumArm(IP.hitF, sec) - D.drumDown) / span, 0, 1), uB = clamp((drumArm(IP.hitB, sec) - D.drumDown) / span, 0, 1);
      IKT.fx = Dm.x - uF * Dm.inward; IKT.fy = Dm.y - Dm.mitt - uF * Dm.lift;
      IKT.bx = -Dm.x + uB * Dm.inward; IKT.by = Dm.y - Dm.mitt - uB * Dm.lift;
      IKT.wB = w; P.gaze = (bi >> 2) & 1 ? GAZE_UP : GAZE_DOWN;
    } else if (kind === 'keys') {
      const K = I.keys, e8 = beat * 2, i8 = Math.floor(e8), f8 = e8 - i8, f16 = e8 * 2 - Math.floor(e8 * 2);
      const a = K.span[AR[(i8 + 3) & 3]], b = K.span[AR[i8 & 3]], tp = Math.sin(Math.PI * f16);
      IP.x = K.x; IP.y = K.y; IP.rot = K.tilt;
      // palms rest on the key bed: the front hand runs the arpeggio (tapping on the 16ths), the back hand stabs a chord on
      // every beat, moving between two chord shapes every 2 beats
      IKT.fx = K.x + lerp(a, b, easeIndex.outCubic(clamp(f8 / 0.3, 0, 1))); IKT.fy = K.y + KEY_TOP + 0.6 - K.tap * tp * tp;
      const sb = Math.sin(Math.PI * bf);
      IKT.bx = K.x + K.chord[(bi >> 1) & 1]; IKT.by = K.y + KEY_TOP + 0.6 - K.stab * sb * sb;
      const bm = ((beat % D.rollEvery) + D.rollEvery) % D.rollEvery, re = D.rollEvery;   // let go for the roll, grab back after
      const rw = bm >= re - 1 ? 0 : bm > re - 1.3 ? 1 - smoothstep(re - 1.3, re - 1, bm) : bm < 0.3 ? smoothstep(0, 0.3, bm) : 1;
      IKT.wF = w * rw; IKT.wB = w * rw; P.gaze = (bi >> 2) & 1 ? GAZE_UP : GAZE_DOWN;
      P.faceDY += K.face * w;                                                   // the face lifts clear of the slab...
      E.mouth = M_O; E.open = 0.2 + 0.35 * up;                                  // ...and sings a small "oo" over it
    } else if (kind === 'bass') {
      const B = I.bass, c = Math.cos(B.rot) * B.k, s = Math.sin(B.rot) * B.k, f2 = beat * 0.5 - Math.floor(beat * 0.5), i2 = Math.floor(beat * 0.5) & 1;
      const fk = easeIndex.inOutSine(clamp(f2 / B.slide, 0, 1)), ft = i2 ? lerp(B.fret[0], B.fret[1], fk) : lerp(B.fret[1], B.fret[0], fk);
      const f8 = beat * 2 - Math.floor(beat * 2), pk = f8 < 0.12 ? easeIndex.outQuad(f8 / 0.12) : 1 - easeIndex.inOutSine((f8 - 0.12) / 0.88);
      const sy = lerp(-B.strumAmp, B.strumAmp, pk);
      IP.x = B.x; IP.y = B.y; IP.rot = B.rot;
      IKT.fx = B.x + c * ft; IKT.fy = B.y + s * ft;
      IKT.bx = B.x + c * B.strum - s * sy; IKT.by = B.y + s * B.strum + c * sy;
      IKT.wB = w; P.gaze = (bi >> 2) & 1 ? GAZE_UP : GAZE_DOWN;
    } else if (kind === 'guitar') {
      const Gt = I.guitar, c = Math.cos(Gt.rot) * Gt.k, s = Math.sin(Gt.rot) * Gt.k, e8 = beat * 2, i8 = Math.floor(e8), f8 = e8 - i8;
      const mt = D.robotMove * tempo / 30, k = easeIndex.outBack(f8 < mt ? f8 / mt : 1);
      const y0 = (i8 & 1) ? Gt.strumAmp : -Gt.strumAmp, sy = lerp(y0, -y0, k);
      const fi = (i8 >> 2) & 1, ft = (i8 & 3) === 0 ? lerp(Gt.fret[1 - fi], Gt.fret[fi], k) : Gt.fret[fi];
      IP.x = Gt.x; IP.y = Gt.y; IP.rot = Gt.rot;
      IKT.fx = Gt.x + c * ft; IKT.fy = Gt.y + s * ft;
      IKT.bx = Gt.x + c * Gt.strum - s * sy; IKT.by = Gt.y + s * Gt.strum + c * sy;
      IKT.wB = w;
    } else {                           // mic: held at the mouth, the head toward the lips; the bean sings
      const Mc = I.mic;
      IP.x = Mc.x; IP.y = Mc.y - Mc.bob * up; IP.rot = Mc.rot + Mc.tilt * Math.sin(beat * Math.PI);
      IKT.fx = IP.x; IKT.fy = IP.y;
      E.mouth = M_OPEN; E.open = 0.35 + 0.65 * up;
    }
  }
  // pins the hands: per arm, the chord angle to the target and the stretch k that lands the hand on it with an elbow bend
  // of elb x the auto bend (a short chord bends the elbow further instead of squashing the arm below kMin)
  function solveArm(i, tx, ty, w) {
    const I = TUNE.inst, side = i ? 1 : -1, vx = tx - sp.arm[i * 2], vy = ty - sp.arm[i * 2 + 1], L = sp.armL;
    const d = Math.sqrt(vx * vx + vy * vy), rot = Math.atan2(-vx, vy);
    let e = autoElbow(rot, side) * I.elb;
    if (e > -0.06 && e < 0.06) e = 0.06 * side;
    let k = d / (L * Math.cos(e * 0.5));
    if (k < I.kMin) { const cc = d / (L * I.kMin); e = (e < 0 ? -2 : 2) * Math.acos(cc < 1 ? cc : 1); k = I.kMin; }
    else if (k > I.kMax) k = I.kMax;
    if (i) { P.armF = lerpAngle(P.armF, rot, w); P.eF = lerp(P.eF, e, w); P.armKF = lerp(P.armKF, k, w); P.ikF = w; }
    else { P.armB = lerpAngle(P.armB, rot, w); P.eB = lerp(P.eB, e, w); P.armKB = lerp(P.armKB, k, w); P.ikB = w; }
  }
  function solveInst() {
    const gnd = INST_GROUND[sp.inst];
    if (IKT.wB > 0.001) { if (gnd) { toBody(IKT.bx, IKT.by); solveArm(0, BX, BY, IKT.wB); } else solveArm(0, IKT.bx, IKT.by, IKT.wB); }
    if (IKT.wF > 0.001) { if (gnd) { toBody(IKT.fx, IKT.fy); solveArm(1, BX, BY, IKT.wF); } else solveArm(1, IKT.fx, IKT.fy, IKT.wF); }
    PR.armB = P.armB; PR.armF = P.armF; PR.armKB = P.armKB; PR.armKF = P.armKF; PR.eB = P.eB; PR.eF = P.eF;   // blend-out source
  }
  function poseSad(dt) {
    const S = TUNE.sad, br = Math.sin(t * TAU * 0.3 + seed);
    if (sadWalk) poseWalk(dt, 0.6, S.hzK);
    else P.swayX = 1.2 * noise1(t * 0.2 + seed);
    P.sy *= S.droop + 0.015 * br; P.sx *= 1.04; P.rot += -0.035; P.faceDY += 3;
    P.armB = 0.12; P.armF = -0.12; P.eKB = P.eKF = 0.6;
    // hurt, not bored: wide wet puppy eyes looking up at you, inner brows up, a quivering pout
    E.mouth = M_POUT; E.lid = S.lid; E.brow = BROW_SAD; E.open = 0; E.pupil = S.pupil; E.wet = 1;
    P.gaze = GAZE_PLEAD;
    tearClock -= dt;
    if (tearClock <= 0) { tearClock = S.tearEvery; spawnDrop(FX_TEAR); }
  }
  function poseSleep(dt) {
    const Z = TUNE.sleep, br = Math.sin(t * TAU * Z.hz);
    P.sy = 1 + 0.04 * br; P.sx = 1 - 0.02 * br; P.rot = -0.05 + 0.012 * br; P.faceDY = 2;
    P.armB = sp.armRest * 0.6; P.armF = -sp.armRest * 0.6;
    E.lid = 1; E.mouth = M_O; E.open = 0.35 + 0.35 * br; E.blush = 0.3;
    zClock -= dt;
    if (zClock <= 0) { spawnZ(zIdx); zIdx = (zIdx + 1) % 3; zClock = zIdx ? Z.zGap : Z.zPause; }
  }
  function pop() {
    popped = true;
    if (pend.attr) setAttr(spec, pend.attr, pend.value);
    pend.attr = null;
    layout();
    kickSquash(TUNE.shift.popSx, TUNE.shift.popSy);
    flashT = TUNE.shift.flash;
    OV_POP.colors = POP_COLS[spec.color];
    emit('actorPuff', 0, -sp.h * 0.5, null);
    emit('pop', 0, -sp.h * 0.5, OV_POP);
  }
  function poseShift() {
    const S = TUNE.shift, t1 = S.wobble, t2 = t1 + S.squash, t3 = t2 + S.settle;
    if (st < t1) {
      // full strength by S.ramp, frequency sweeping hz0 -> hz1 (phase = integral of the rising frequency): it builds up
      const env = easeIndex.outQuad(clamp(st / S.ramp, 0, 1)), ph = TAU * (S.hz0 * st + (S.hz1 - S.hz0) * st * st / (2 * t1));
      const w = Math.sin(ph) * env;
      P.sx *= 1 + S.amp * w; P.sy *= 1 - S.amp * w; P.rot += S.rot * Math.sin(ph * 0.5) * env;
      E.mouth = M_O; E.open = 0.6; E.spin = 1; E.brow = BROW_UP; E.lid = 0.02;
    } else if (st < t2) {
      // the wobble's last swing (its value at t1) settles out while the squash eases in: no pose step at the hand-over
      const u = (st - t1) / S.squash, k = easeIndex.inQuad(u), r = 1 - easeIndex.outQuad(u), ph1 = TAU * t1 * (S.hz0 + S.hz1) / 2;
      const w1 = S.amp * Math.sin(ph1) * r;
      P.sy *= lerp(1, S.sqSy, k) - w1; P.sx *= lerp(1, S.sqSx, k) + w1; P.rot += S.rot * Math.sin(ph1 * 0.5) * r;
      E.eyes = EYE_SQUEEZE; E.mouth = M_O;
    } else {
      if (!popped) pop();
      E.mouth = M_GRIN; E.open = 1; E.eyes = st < t2 + 0.12 ? EYE_HAPPY : EYE_OPEN; E.blush = 0.8;
      if (st >= t3) finish();
    }
  }

  // ---------------------------------------------------------------- simulation
  function stepProp(pr, dt, dvx, dvy, rigid) {
    poseXY(pr.bx, pr.by);
    const ax = QX, ay = QY, th = pr.th + P.rot;
    const tx = ax + Math.cos(th) * pr.L, ty = ay + Math.sin(th) * pr.L;
    if (pr.fresh) { pr.px = tx; pr.py = ty; pr.vx = 0; pr.vy = 0; pr.tx = tx; pr.ty = ty; pr.fresh = false; }
    const tvx = clamp((tx - pr.tx) / dt, -2500, 2500), tvy = clamp((ty - pr.ty) / dt, -2500, 2500);
    if (rigid && !pr.fake) { pr.px = tx; pr.py = ty; pr.vx = tvx; pr.vy = tvy; pr.accX = 0; pr.accY = 0; }
    else {
      pr.vx -= dvx; pr.vy -= dvy;
      const fx = -pr.k * (pr.px - tx) - pr.c * (pr.vx - tvx);
      const fy = -pr.k * (pr.py - ty) - pr.c * (pr.vy - tvy) + pr.sag;
      pr.vx += fx * dt; pr.vy += fy * dt;
      pr.px += pr.vx * dt; pr.py += pr.vy * dt;
      pr.accX = fx; pr.accY = fy;
      const dx = pr.px - tx, dy = pr.py - ty, d2 = dx * dx + dy * dy, m = pr.max;
      if (d2 > m * m) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        pr.px = tx + nx * m; pr.py = ty + ny * m;
        const vn = (pr.vx - tvx) * nx + (pr.vy - tvy) * ny;
        if (vn > 0) { pr.vx -= vn * nx; pr.vy -= vn * ny; }
      }
    }
    pr.ax = ax; pr.ay = ay; pr.tx = tx; pr.ty = ty;
    const rx = tx - ax, ry = ty - ay, qx = pr.px - ax, qy = pr.py - ay;
    pr.delta = Math.atan2(rx * qy - ry * qx, rx * qx + ry * qy) * pr.rotK;
    if (pr.sw > 0) {                   // a fake prop never settles: it rocks with the breath (+ a slower off-beat wobble)
      const F = TUNE.fakeSway, w = TAU * TUNE.idle.hz * F.hz;
      pr.delta += pr.sw * Math.sin(t * w + pr.ph) + F.wob * Math.sin(t * TAU * F.wobHz + pr.ph * 2.3);
    }
    // the drawn swing (dr): fakes are soft-clamped (TUNE.fakeClamp); real props draw their lag as is
    const FC = TUNE.fakeClamp;
    if (pr.kind === 'paper') pr.dr = FC.hat * Math.tanh(pr.delta / FC.hat);
    else if (pr.kind === 'ftail') {
      const d = pr.delta + FC.tailBias;
      pr.dr = d > 0 ? FC.tailUp * Math.tanh(d / FC.tailUp) : FC.tailDown * Math.tanh(d / FC.tailDown);
    } else pr.dr = pr.delta;
    pr.ox = (pr.px - tx) * pr.posK; pr.oy = (pr.py - ty) * pr.posK;
  }
  function stepGoogly(dt) {
    const K = TUNE.googly, lim = G.R * 0.42;
    gpvx += (-gooP.accX * K.inertia) * dt;
    gpvy += (K.g - gooP.accY * K.inertia) * dt;
    const dk = 1 / (1 + K.drag * dt);
    gpvx *= dk; gpvy *= dk;
    gpx += gpvx * dt; gpy += gpvy * dt;
    const d2 = gpx * gpx + gpy * gpy;
    if (d2 > lim * lim) {
      const d = Math.sqrt(d2), nx = gpx / d, ny = gpy / d;
      gpx = nx * lim; gpy = ny * lim;
      const vn = gpvx * nx + gpvy * ny;
      if (vn > 0) {
        gpvx -= (1 + K.bounce) * vn * nx; gpvy -= (1 + K.bounce) * vn * ny;
        if (vn > 40) { gpvx += (Math.random() - 0.5) * vn * K.rattle; gpvy += (Math.random() - 0.5) * vn * K.rattle; }
      }
    }
  }
  function stepDebris(dt) {
    const D = TUNE.debris, R = TUNE.rip;
    nDeb = 0;
    for (let i = 0; i < DEB.length; i++) {
      const d = DEB[i];
      if (!d.on) continue;
      d.t += dt;
      if (d.kind === DEB_STRIP) {          // torn tape / ribbon end: a slow, drag-limited flutter down (sway + turn: drawDebris)
        if (!d.rest) {
          const k = 1 / (1 + R.stripDrag * dt);
          d.vy = (d.vy + R.stripG * dt) * k; d.vx *= k;
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.y > -d.bottom) { d.y = -d.bottom; d.vx = 0; d.vy = 0; d.rest = true; }
        }
        d.alpha = d.t > R.stripHold ? 1 - (d.t - R.stripHold) / R.stripFade : 1;
      } else {
        if (d.rip && !d.free) {            // BUSTED: the outBack pop off the body (keyed, then handed to the sim at rest)
          const u = d.t < R.pop ? d.t / R.pop : 1, e = easeIndex.outBack(u), s = Math.sin(Math.PI * u);
          const ex = d.arc > 0 ? u * u * (3 - 2 * u) : e;   // an arc (the tail over the head): rise first, then cross
          d.x = d.x0 + d.dx * ex; d.y = d.y0 + d.dy * e - d.arc * s; d.rot = d.r0 + d.drot * ex; d.sc = 1 + R.punch * s;
          if (u >= 1) {                      // at rest after the overshoot: it drifts off in the flyer's wake, floating up
            const vr = d.drot * R.spinK;
            d.free = true; d.sc = 1; d.vx = yeetDir * (d.wp ? wf : d.wf0) * R.wake; d.vy = -R.float;
            d.vr = vr > R.spinMax ? R.spinMax : vr < -R.spinMax ? -R.spinMax : vr;
          }
        } else if (!d.rest) {
          const g = d.rip && d.t < R.pop + R.hang ? R.hangG : D.g;   // a ripped part hangs a beat (the FAKE! tag), then drops
          d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
          if (d.y > -d.bottom) {
            d.y = -d.bottom;
            if (d.vy > 90) { d.vy = -d.vy * D.bounce; d.vx *= D.fric; d.vr *= 0.5; }
            else { d.vy = 0; d.vx = 0; d.vr = 0; d.rest = true; }
          }
        }
        d.alpha = d.t > D.hold ? 1 - (d.t - D.hold) / D.fade : 1;
      }
      if (d.alpha <= 0) { d.on = false; continue; }
      nDeb++;
    }
  }
  // tears / sweat fall to the feet line (local y 0) and splat there (f.sp counts the splat); never through the floor
  function stepFx(dt) {
    const Z = TUNE.z, Dr = TUNE.drop;
    nFx = 0;
    for (let i = 0; i < FX.length; i++) {
      const f = FX[i];
      if (!f.on) continue;
      f.t += dt;
      if (f.kind === FX_TEAR || f.kind === FX_SWEAT) {
        if (f.sp >= 0) { f.sp += dt; if (f.sp >= Dr.splat) { f.on = false; continue; } }
        else {
          if (f.kind === FX_SWEAT) f.vy += Dr.sweatG * dt; else if (f.t > Dr.tearHold) f.vy += Dr.tearG * dt;
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.y + DROP_BOT * f.s >= 0) { f.y = -DROP_BOT * f.s; f.sp = 0; f.vx = 0; f.vy = 0; }
          else if (f.t >= f.life) { f.on = false; continue; }
        }
        nFx++;
        continue;
      }
      if (f.pop > 0) f.pop += dt;
      if (f.t >= f.life || f.pop >= Z.pop) { f.on = false; continue; }
      nFx++;
      if (f.kind === FX_Z) { f.x += (f.vx + Z.wob * Math.sin(f.t * Z.wobHz)) * dt; f.y += f.vy * dt; }
      else { const k = 1 / (1 + TUNE.steam.drag * dt); f.vx *= k; f.vy *= k; f.x += f.vx * dt; f.y += f.vy * dt; }
    }
  }
  function updateGaze(dt) {
    const Gz = TUNE.gaze;
    if (hasLook && drawn) {
      const fwx = wX(sp.face[0] + offX), fwy = wY(sp.face[1] - P.lift + offY);
      const dx = (lookX - fwx) * wf / ws, dy = (lookY - fwy) / ws, m = Math.sqrt(dx * dx + dy * dy);
      if (m > 0.001) { const k = Math.min(1, m / Gz.reach) / m; tgx = dx * k; tgy = dy * k; } else { tgx = 0; tgy = 0; }
    } else if (P.gaze === GAZE_FWD) { tgx = 0.7; tgy = 0.08; }
    else if (P.gaze === GAZE_DOWN) { tgx = 0.15; tgy = 0.8; }
    else if (P.gaze === GAZE_UP) { tgx = 0.25; tgy = -0.5; }
    else if (P.gaze === GAZE_PLEAD) { tgx = 0.35; tgy = -0.42; }
    else if (P.gaze === GAZE_BACK) { tgx = -1; tgy = -0.12; }
    else {
      gazeClock -= dt;
      if (gazeClock <= 0) {
        gazeClock = rnd(Gz.min, Gz.max);
        if (Math.random() < Gz.center) { tgx = 0.1; tgy = 0.05; } else { tgx = rnd(-1, 1); tgy = rnd(-0.6, 0.5); }
      }
    }
    gx = damp(gx, tgx, Gz.rate, dt); gy = damp(gy, tgy, Gz.rate, dt);
  }
  function updateBlink(dt) {
    const Bk = TUNE.blink;
    blinkClock -= dt;
    if (blinkClock <= 0 && blinkT < 0 && yawnT < 0 && state !== 'yawn') {
      blinkT = 0; blinkClock = rnd(Bk.min, Bk.max);
      blinkDur = state === 'wait' ? Bk.waitDur : Bk.dur;      // fixed for the whole blink (a state change mid-blink keeps it)
    }
    if (blinkT >= 0) {
      blinkT += dt;
      const u = blinkT / blinkDur, cap = steady ? Bk.steady : state === 'wait' ? Bk.waitCap : 1;
      blinkLid = (u < 0.38 ? u / 0.38 : u < 1 ? 1 - (u - 0.38) / 0.62 : 0) * cap;
      if (u >= 1) {
        blinkT = -1; blinkLid = 0;
        if (blinkTwice) { blinkTwice = false; blinkClock = 0.07; }
        else if (Math.random() < TUNE.blink.double) blinkTwice = true;
      }
    }
  }
  function step(dt) {
    t += dt; st += dt;
    clk += dt;                         // shared sim clock: a paused actor snaps forward, the leader pushes SIM.t on
    if (clk < SIM.t - TUNE.clockSync) clk = SIM.t;
    else if (clk > SIM.t && !still) SIM.t = clk;   // static icon / prewarm actors never drag the crowd's clock ahead
    const ik = TUNE.ext.inertia;
    const dvx = (extVx - seenVx) * ik, dvy = (extVy - seenVy) * ik;
    seenVx = extVx; seenVy = extVy;
    flashT = flashT > dt ? flashT - dt : 0;
    if (!vanish) {
      P.lift = 0; P.rot = 0; P.pivotY = 0; P.sx = 1; P.sy = 1; P.swayX = 0; P.skew = 0; P.plant = 1; P.armKB = 1; P.armKF = 1;
      P.fbx = 0; P.fby = 0; P.ffx = 0; P.ffy = 0; P.faceDX = 0; P.faceDY = 0;
      P.eB = NaN; P.eF = NaN; P.eKB = 1; P.eKF = 1; P.mitt = 1; P.ikB = 0; P.ikF = 0;
      P.wing = 0.12 * Math.sin(t * TAU * 0.8 + seed); P.wag = 0.06 * Math.sin(t * TAU * 0.7 + seed); P.gaze = GAZE_WANDER;
      E.mouth = M_SMILE; E.open = 0; E.eyes = EYE_OPEN; E.lid = sp.lid; E.pupil = 1; E.brow = BROW_NONE; E.browA = 1; E.blush = 0; E.spin = 0;
      E.anger = 0; E.puff = 0; E.wet = 0; E.flush = 0; E.wink = 0;
      switch (state) {
        case 'walk': poseWalk(dt, 1, 1); break;
        case 'idle': poseIdle(dt); break;
        case 'wait': poseIdle(dt); poseWait(dt); break;
        case 'yawn': poseIdle(dt); poseYawn(st / TUNE.yawn.dur); if (st >= TUNE.yawn.dur) finish(); break;
        case 'cheer': poseCheer(); break;
        case 'yeet': poseYeet(dt); break;
        case 'flinch': poseIdle(dt); poseFlinch(); break;
        case 'admit': if (admitSneak) poseSneak(); else poseAdmit(); break;
        case 'dance': poseDance(); break;
        case 'sad': poseSad(dt); break;
        case 'sleep': poseSleep(dt); break;
        case 'shift': poseIdle(dt); poseShift(); break;
      }
      if (slyT > 0) {                  // an impostor that got in keeps its sly face a moment into the walk inside
        slyT -= dt;
        if (state === 'walk' || state === 'idle') {
          const K = TUNE.sneak, k = clamp(slyT / (K.linger * 0.4), 0, 1);
          E.mouth = M_SLY; E.brow = BROW_SLY; E.lid = K.lid; E.blush = 0; P.gaze = GAZE_BACK;
          P.faceDX -= sp.r * K.faceBack * k; P.faceDY -= K.faceUp * k;
        }
      }
      leanK = damp(leanK, leanTgt, TUNE.lean.rate, dt);
      if ((leanK > 0.005 || leanK < -0.005) && (state === 'idle' || state === 'wait')) poseLean(leanK);
      // elbows: a pose may set the bend outright (robot); otherwise it bows outward / down from the arm's angle
      if (P.eB !== P.eB) P.eB = autoElbow(P.armB, -1) * P.eKB;
      if (P.eF !== P.eF) P.eF = autoElbow(P.armF, 1) * P.eKF;
      if (state !== 'wait') madK = damp(madK, 0, TUNE.wait.madRate, dt);
      jawK = damp(jawK, jawTgt, TUNE.jaw.rate, dt); jawTgt = 0;          // the square's slack jaw eases in / out
      E.jaw = jawK > 0.01 ? jawK : 0;
      // weight shift: set by poseIdle; any other state eases it back to centre (no pop when a standing guest starts walking)
      if (!hipOn) { hipX = damp(hipX, 0, TUNE.wait.hipOut, dt); hipFrom = hipTo = hipX; hipT = 9; }
      hipOn = false;
      P.swayX += hipX; P.rot += hipX * TUNE.wait.hipRoll;
      if (blendT > 0) { blendPose(easeIndex.inOutSine(blendT / TUNE.blend)); blendT -= dt; }
      copyPose(PR, P);
    }
    if (!vanish) {
      // springs: squash/stretch and the nudge sway
      const Q = TUNE.squash, W = TUNE.sway;
      sqvx += (-Q.k * (sqx - 1) - Q.c * sqvx) * dt; sqx += sqvx * dt;
      sqvy += (-Q.k * (sqy - 1) - Q.c * sqvy) * dt; sqy += sqvy * dt;
      swvx -= dvx * TUNE.ext.body;
      swvx += (-W.k * swx - W.c * swvx) * dt; swx = clamp(swx + swvx * dt, -W.max, W.max);
      swvy += (-W.k * swy - W.c * swvy) * dt; swy = clamp(swy + swvy * dt, -W.max, W.max);
      P.sx *= sqx; P.sy *= sqy; P.swayX += swx; P.lift -= swy; P.rot += swx * W.roll;
      updateGaze(dt);
      P.faceDX += gx * TUNE.gaze.face; P.faceDY += gy * TUNE.gaze.face * 0.6;
      P.cs = Math.cos(P.rot); P.sn = Math.sin(P.rot);
      if (inst && state === 'dance') solveInst();   // band mode: the hands go to the instrument (after the springs)
      const rigid = P.pivotY !== 0;
      if (hatP.on) stepProp(hatP, dt, dvx, dvy, rigid);
      if (tailP.on) stepProp(tailP, dt, dvx, dvy, rigid);
      if (stalkP.on) stepProp(stalkP, dt, dvx, dvy, rigid);
      if (gooP.on) {
        gooP.bx = G.x + 1.5 + P.faceDX; gooP.by = G.y - G.R * 0.8 + P.faceDY;
        stepProp(gooP, dt, dvx, dvy, rigid);
        stepGoogly(dt);
      }
      updateBlink(dt);
    }
    stepDebris(dt);
    stepFx(dt);
  }
  function update(dt) {
    if (!(dt > 0)) return;
    if (dt > 0.25) dt = 0.25;
    while (dt > 1e-6) { const h = dt > TUNE.maxStep ? TUNE.maxStep : dt; step(h); dt -= h; }
  }

  // ---------------------------------------------------------------- drawing
  function blit(ctx, s, x, y) { ctx.drawImage(s.cv, x + s.x0, y + s.y0, s.w, s.h); }
  function blitRot(ctx, s, x, y, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(s.cv, s.x0, s.y0, s.w, s.h);
    ctx.restore();
  }
  // door (amber) / lamp (cool) tint of a part, in the part's current transform: source-over at a low alpha (an additive
  // wash bleached the colours and turned the outlines orange; a weak tint keeps them dark)
  function wash(ctx, s, slot, shape, wA, wC, tinted) {
    if (wA > 0.01) { const r = washRec(slot, 0, s, shape, tinted); ctx.globalAlpha = ga * wA; ctx.drawImage(r.cv, r.x0, r.y0, r.w, r.h); }
    if (wC > 0.01) { const r = washRec(slot, 1, s, shape, tinted); ctx.globalAlpha = ga * wC; ctx.drawImage(r.cv, r.x0, r.y0, r.w, r.h); }
    ctx.globalAlpha = ga;
  }
  // A stub arm (shoulder at (x, y), chord angle rot, elbow bend e, stretch k): a filled tapered shaft (TUNE.arm shoulder /
  // mid / wrist x armW) through one elbow, the rubber-hose curve or the square's crisp joint with a ball elbow. Its outline
  // is the shaft grown by partLine everywhere except the shoulder, where it starts inside the fill, so the dark edge grows
  // in along the upper arm and the arm reads as growing out of the body, not a ringed capsule glued on. The mitten turns
  // with the forearm. Lit arms take the door / lamp tint over the fill.
  function drawArm(ctx, x, y, rot, e, k, wA, wC) {
    const A = TUNE.arm, q = AQ, h = sp.armL * k * 0.5, W = sp.armW, lw = TUNE.partLine, joint = sp.armStyle === 'joint';
    const tp = sp.armTaper, se = Math.sin(e * 0.5), ce = Math.cos(e * 0.5);
    const hs = W * (tp ? tp[0] : A.shoulder) * 0.5, hm = W * (tp ? tp[1] : A.mid) * 0.5, hw = W * (tp ? tp[2] : A.wrist) * 0.5;
    // local frame: shoulder (0, 0), the chord to the hand along +y; elbow E = (se, ce) h, hand = (0, 2 ce h)
    q.joint = joint; q.ex = se * h; q.ey = ce * h;
    q.kx = joint ? q.ex : 2 * q.ex; q.ky = q.ey;               // the curve's control point, so it passes through E
    const hy = 2 * ce * h;
    let l = Math.sqrt(q.kx * q.kx + q.ky * q.ky) || 1;
    const t0x = q.kx / l, t0y = q.ky / l;
    let dx = -q.kx, dy = hy - q.ky;
    l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
    q.n0x = t0y; q.n0y = -t0x; q.n1x = dy; q.n1y = -dx;
    let nkx = q.n0x + q.n1x, nky = q.n0y + q.n1y;
    l = Math.sqrt(nkx * nkx + nky * nky) || 1; q.nkx = nkx / l; q.nky = nky / l;
    const cosH = q.nkx * q.n0x + q.nky * q.n0y;
    q.m = 1 / (cosH > 0.55 ? cosH : 0.55);                      // keep the width through the bend
    q.hx = -dx * W * A.wristIn; q.hy = hy - dy * W * A.wristIn; // the shaft ends just inside the mitten
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    armPath(ctx, hs - A.rootIn, hm + lw, hw + lw, false);
    ctx.fillStyle = pal.outline; ctx.fill();
    if (joint) { ctx.beginPath(); ctx.arc(q.ex, q.ey, hm * 1.12 + lw, 0, TAU); ctx.fill(); }
    armPath(ctx, hs, hm, hw, true);
    ctx.fillStyle = pal.body; ctx.fill();
    const SL = S.oSl;
    if (SL.on) {                       // outfit sleeve: the whole shaft (short: to the elbow) in the garment, a cuff band at its end
      if (SL.short) {
        const er = Math.sqrt(q.ex * q.ex + q.ey * q.ey) * 0.9;
        ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(0, 0, er, 0, TAU); ctx.fillStyle = SL.fill; ctx.fill();
        ctx.strokeStyle = SL.cuff; ctx.lineWidth = 2.4; ctx.stroke(); ctx.strokeStyle = SL.ink; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, er + 1.3, 0, TAU); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = SL.fill; ctx.fill();
        const cw = hw + lw * 0.5, cx = q.hx - (q.hx - q.ex) * 0.16, cy = q.hy - (q.hy - q.ey) * 0.16;
        ctx.beginPath(); ctx.moveTo(cx - q.n1x * cw, cy - q.n1y * cw); ctx.lineTo(cx + q.n1x * cw, cy + q.n1y * cw);
        ctx.strokeStyle = SL.ink; ctx.lineWidth = 3.8; ctx.stroke(); ctx.strokeStyle = SL.cuff; ctx.lineWidth = 2.2; ctx.stroke();
      }
      armPath(ctx, hs, hm, hw, true);
    }
    const lit = wA > 0.01 || wC > 0.01, tint = wA >= wC ? pal.doorTint : TUNE.rim.cool, ta = ga * (wA > wC ? wA : wC);
    if (lit) { ctx.fillStyle = tint; ctx.globalAlpha = ta; ctx.fill(); ctx.globalAlpha = ga; }
    if (joint) {                       // the robot's ball elbow
      ctx.beginPath(); ctx.arc(q.ex, q.ey, hm * 1.12, 0, TAU); ctx.fillStyle = pal.body; ctx.fill();
      if (lit) { ctx.fillStyle = tint; ctx.globalAlpha = ta; ctx.fill(); ctx.globalAlpha = ga; }
      ctx.fillStyle = pal.gloss; ctx.globalAlpha = ga * 0.45 * pal.glossA;
      ctx.beginPath(); ctx.arc(q.ex - hm * 0.38, q.ey - hm * 0.38, hm * 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
    }
    // gloss: a thin highlight down the upper arm on its top-left side (world space)
    const cr = Math.cos(rot), sr = Math.sin(rot), gs = (q.n0x * cr - q.n0y * sr) + (q.n0x * sr + q.n0y * cr) > 0 ? -1 : 1;
    const g0 = A.gloss, gw = hm * 0.5 * gs;
    ctx.beginPath();
    ctx.moveTo(t0x * h * g0 + q.n0x * gw, t0y * h * g0 + q.n0y * gw);
    ctx.lineTo(q.ex * 0.92 + q.nkx * gw, q.ey * 0.92 + q.nky * gw);
    ctx.strokeStyle = pal.gloss; ctx.lineWidth = W * A.glossW; ctx.globalAlpha = ga * 0.34 * pal.glossA; ctx.stroke(); ctx.globalAlpha = ga;
    ctx.translate(0, hy); ctx.rotate(Math.atan2(-dx, dy));
    if (P.mitt !== 1) ctx.scale(P.mitt, P.mitt);                // the cheer spreads its mittens at the apex
    ctx.drawImage(S.mitt.cv, S.mitt.x0, S.mitt.y0, S.mitt.w, S.mitt.h);
    if (lit) wash(ctx, S.mitt, S.tArm, S.kArm, wA, wC, true);
    ctx.restore();
  }
  // tall's stilt legs: hip (body space, follows shear / squash / sway) to the foot, knees bowing forward as the body squashes
  function drawLegs(ctx, pk) {
    const L = sp.legs, le = sp.legEnd, lw = sp.legW;
    for (let i = 0; i < 2; i++) {
      const hxL = L[i * 2], hyL = L[i * 2 + 1];
      const hx = (hxL + P.skew * hyL) * P.sx + P.swayX, hy = hyL * P.sy;
      const fx = sp.feet[i] + (i ? P.ffx : P.fbx) + le[i * 2], fy = pk - (i ? P.ffy : P.fby) + le[i * 2 + 1];
      const bend = sp.knee + (1 - P.sy) * 40;
      const mx = (hx + fx) * 0.5 + bend, my = (hy + fy) * 0.5;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, fx, fy);
      ctx.strokeStyle = pal.outline; ctx.lineWidth = lw + TUNE.partLine * 2; ctx.stroke();
      ctx.strokeStyle = pal.foot; ctx.lineWidth = lw; ctx.stroke();
    }
  }
  // a limb / tail / foot sprite at (x, y, rot) plus its light washes (wA amber, wC cool; 0 = unlit)
  function part(ctx, s, x, y, rot, slot, shape, wA, wC) {
    if (!(wA > 0.01) && !(wC > 0.01)) { if (rot) blitRot(ctx, s, x, y, rot); else blit(ctx, s, x, y); return; }
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(s.cv, s.x0, s.y0, s.w, s.h);
    wash(ctx, s, slot, shape, wA, wC, true);
    ctx.restore();
  }
  function drawLid(ctx, x, y, r, lid) {
    ctx.fillStyle = pal.lid; ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.eyeLine;
    if (lid >= 0.97) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.85, 0.22 * Math.PI, 0.78 * Math.PI); ctx.stroke();
      return;
    }
    const ly = y - r + 2 * r * lid, h = (ly - y) / r, a = Math.asin(h < -1 ? -1 : h > 1 ? 1 : h), ca = Math.cos(a);
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI - a, TAU + a, false);
    ctx.quadraticCurveTo(x, ly + r * 0.3 * ca, x - r * ca, ly);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // a shut eye (sleep, the blink peak): no sclera, no ring - a soft lid a shade darker than the body, one thick
  // down-curved lash line (a "u") and two short lashes flicking out at the outer end
  function drawShut(ctx, x, y, r, idx) {
    const out = idx === 0 && nEyes > 1 ? -1 : 1, lw = Math.max(TUNE.mouthLine, r * 0.27), y0 = y + r * 0.02;
    ctx.fillStyle = pal.lidShut; ctx.globalAlpha = ga * 0.85;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.08, r * 0.9, r * 0.66, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
    ctx.strokeStyle = pal.outline; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.7, y0); ctx.quadraticCurveTo(x, y0 + r * 0.72, x + r * 0.7, y0); ctx.stroke();
    const ex = x + out * r * 0.7;
    ctx.lineWidth = lw * 0.62;
    ctx.beginPath();
    ctx.moveTo(ex - out * r * 0.04, y0 + r * 0.06); ctx.lineTo(ex + out * r * 0.3, y0 - r * 0.18);
    ctx.moveTo(ex - out * r * 0.2, y0 + r * 0.24); ctx.lineTo(ex + out * r * 0.16, y0 + r * 0.16 - r * 0.2);
    ctx.stroke();
  }
  function drawEye(ctx, x, y, r, spr, idx) {
    const mode = E.eyes;
    if (mode === EYE_HAPPY) {
      ctx.strokeStyle = pal.outline; ctx.lineWidth = Math.max(2.4, r * 0.3);
      ctx.beginPath(); ctx.arc(x, y + r * 0.45, r * 0.72, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      return;
    }
    if (mode === EYE_SQUEEZE) {
      const side = idx === 0 && nEyes > 1 ? 1 : -1;
      ctx.strokeStyle = pal.outline; ctx.lineWidth = Math.max(2.4, r * 0.28);
      ctx.beginPath(); ctx.moveTo(x - side * r * 0.55, y - r * 0.5); ctx.lineTo(x + side * r * 0.45, y); ctx.lineTo(x - side * r * 0.55, y + r * 0.5); ctx.stroke();
      return;
    }
    const lid = E.lid > blinkLid ? E.lid : blinkLid;
    if (lid >= 0.95 || E.wink === idx + 1) { drawShut(ctx, x, y, r, idx); return; }
    ctx.drawImage(spr.cv, x + spr.x0, y + spr.y0, spr.w, spr.h);
    const pr = r * TUNE.pupil * E.pupil, m = r - pr - r * 0.12;
    let px, py;
    if (E.spin) { px = Math.cos(t * 13 + idx * 1.7) * m * 0.85; py = Math.sin(t * 13 + idx * 1.7) * m * 0.85; }
    else { px = gx * m; py = gy * m * 0.9; }
    const ps = S.pupil, f = pr / TUNE.pupR;
    ctx.drawImage(ps.cv, x + px + ps.x0 * f, y + py + ps.y0 * f, ps.w * f, ps.h * f);
    if (E.wet > 0) {
      // hurt: a second big highlight on the pupil and a tear welling along the bottom of the eye
      ctx.fillStyle = pal.gloss; ctx.globalAlpha = ga * 0.95 * E.wet;
      ctx.beginPath(); ctx.arc(x + px + pr * 0.38, y + py + pr * 0.4, pr * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.tear; ctx.globalAlpha = ga * 0.8 * E.wet;
      ctx.beginPath(); ctx.arc(x, y, r * 0.84, 0.16 * Math.PI, 0.84 * Math.PI, false);
      ctx.quadraticCurveTo(x, y + r * 0.42, x + r * 0.84 * Math.cos(0.16 * Math.PI), y + r * 0.84 * Math.sin(0.16 * Math.PI));
      ctx.fill();
      ctx.fillStyle = pal.gloss; ctx.globalAlpha = ga * 0.9 * E.wet;
      ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.62, r * 0.09, 0, TAU); ctx.fill();
      ctx.globalAlpha = ga;
    }
    if (lid > 0.02) {
      // droopy species tilt the lid so the outer corners hang (only while the lid is low: a blink closes flat)
      const tl = sp.lidTilt * (lid < 0.9 ? 1 : 0) * (idx === 0 && nEyes > 1 ? -1 : idx === 1 ? 1 : 0);
      if (tl) { ctx.save(); ctx.translate(x, y); ctx.rotate(tl); drawLid(ctx, 0, 0, r, lid); ctx.restore(); }
      else drawLid(ctx, x, y, r, lid);
    }
  }
  function drawBrows(ctx, fdx, fdy) {
    const b = E.brow, n = nEyes, a = E.browA * (E.anger > 0 ? 1 + 0.35 * E.anger : 1);   // a: blend-in amount
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.browLine;
    if (E.browA < 1) ctx.globalAlpha = ga * (E.browA < 0.34 ? E.browA * 3 : 1);
    for (let i = 0; i < n; i++) {
      const single = n === 1 || i === 2, bk = single ? sp.brow1 : TUNE.browK, e = EYES[i];
      const x = e.x + fdx, y = e.y + fdy - e.r * bk - (b === BROW_UP ? 3 : 0) + (b === BROW_MAD ? 1.5 * E.anger : 0), hw = e.r * 0.72;
      ctx.beginPath();
      if (b === BROW_SLY) {            // the impostor: pressed down over the winking eye, cocked high over the open one
        if (E.wink === i + 1) { ctx.moveTo(x - hw, y + 2.4); ctx.quadraticCurveTo(x, y + 4.4, x + hw, y + 3.2); }
        else { ctx.moveTo(x - hw, y + 0.6); ctx.quadraticCurveTo(x - hw * 0.15, y - 6.5, x + hw * 1.05, y - 2.2); }
      } else if (single) {
        const ends = (b === BROW_SAD ? 2 : -1) * a, mid = (b === BROW_SAD ? -4 : b === BROW_MAD ? 5 : -3) * a;
        ctx.moveTo(x - hw, y + ends); ctx.quadraticCurveTo(x, y + mid, x + hw, y + ends);
      } else {
        const inner = (b === BROW_SAD ? -4.8 : b === BROW_MAD ? 3.2 : 0) * a;
        if (i === 0) { ctx.moveTo(x - hw, y); ctx.lineTo(x + hw, y + inner); } else { ctx.moveTo(x - hw, y + inner); ctx.lineTo(x + hw, y); }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = ga;
  }
  // open D mouth: the top lip dips by `dip` in the middle (corners up = a smile), a deep bottom curve h below the corners
  function mouthD(ctx, x, y, W, h, dip) {
    ctx.beginPath();
    ctx.moveTo(x - W / 2, y);
    ctx.quadraticCurveTo(x, y + dip, x + W / 2, y);
    ctx.bezierCurveTo(x + W * 0.48, y + h * 1.3, x - W * 0.48, y + h * 1.3, x - W / 2, y);
    ctx.closePath();
  }
  function tooth(ctx, x, y, w, h, rot) {   // a flat block tooth hanging DOWN from (x, y), barely rounded corners
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    const r = w * TUNE.smirk.toothR;
    ctx.beginPath(); ctx.moveTo(-w / 2, -1); ctx.lineTo(-w / 2, h - r); ctx.quadraticCurveTo(-w / 2, h, 0, h);
    ctx.quadraticCurveTo(w / 2, h, w / 2, h - r); ctx.lineTo(w / 2, -1); ctx.closePath();
    ctx.fillStyle = pal.teeth; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = pal.outline; ctx.stroke();
    ctx.restore();
  }
  // the species' teeth under the top lip of an open mouth (corners at y, lip dipping by dip): blob = pink gums + ONE tooth,
  // bean = two buck teeth (one crooked), square = none on top (its fangs come up from below), others = a plain top row
  function teethTop(ctx, x, y, W, h, dip) {
    const st = sp.smile, my = y + dip * 0.5;
    if (st === 'gummy') {
      ctx.fillStyle = pal.gum; ctx.beginPath();
      ctx.moveTo(x - W * 0.47, y + dip * 0.11); ctx.quadraticCurveTo(x, y + dip, x + W * 0.47, y + dip * 0.11);
      ctx.quadraticCurveTo(x, y + dip + h * 0.42, x - W * 0.47, y + dip * 0.11); ctx.closePath(); ctx.fill();
      tooth(ctx, x + W * 0.13, my + h * 0.1, Math.max(3.4, W * 0.13), h * 0.34, 0.08);
    } else if (st === 'smirk') {           // two big buck teeth just right of centre, the second one crooked
      const SM = TUNE.smirk, tw = Math.max(SM.toothW, W * 0.15), th = clamp(h * 0.5, 4, SM.toothH + 1), cx = x + W * 0.05;
      tooth(ctx, cx - tw * 0.5, my - 0.3, tw, th, -0.04);
      tooth(ctx, cx + tw * 0.52, my - 0.5, tw * 0.92, th * 0.9, SM.crooked);
    } else if (st !== 'under') {
      ctx.fillStyle = pal.teeth; ctx.beginPath();
      ctx.moveTo(x - W * 0.45, y + dip * 0.1); ctx.quadraticCurveTo(x, y + dip + 0.6, x + W * 0.45, y + dip * 0.1);
      ctx.lineTo(x + W * 0.37, y + dip * 0.3 + h * 0.2); ctx.quadraticCurveTo(x, y + dip + h * 0.24, x - W * 0.37, y + dip * 0.3 + h * 0.2);
      ctx.closePath(); ctx.fill();
    }
  }
  function drawVein(ctx, x, y, s) {      // the cross-popping anger vein sticker (four brackets bowing toward the centre)
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const sx = k === 0 || k === 3 ? 1 : -1, sy = k < 2 ? 1 : -1;
      ctx.moveTo(x + sx * 0.22 * s, y + sy * s); ctx.quadraticCurveTo(x + sx * 0.28 * s, y + sy * 0.28 * s, x + sx * s, y + sy * 0.22 * s);
    }
    ctx.strokeStyle = pal.veinLine; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = pal.vein; ctx.lineWidth = 2.2; ctx.stroke();
  }
  function tongue(ctx, x, y, rx, ry) {
    ctx.fillStyle = pal.tongue; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }
  // a pointed tusk rooted at (0, 0) pointing UP, its tip leaning `lean` rad outward (the bean's teeth are blocks hanging down)
  function tuskPath(ctx, hw, h, lean) {
    const tx = Math.sin(lean) * h, ty = -Math.cos(lean) * h;
    ctx.beginPath();
    ctx.moveTo(-hw, 1.2);
    ctx.quadraticCurveTo(-hw * 0.8 + tx * 0.45, ty * 0.5, tx, ty);
    ctx.quadraticCurveTo(hw * 0.95 + tx * 0.55, ty * 0.42, hw, 1.2);
    ctx.closePath();
  }
  // an ivory tusk rising from its root (x, y); the far side is shaded, the big one gets a gloss dot
  function fang(ctx, x, y, hw, h, lean, big) {
    ctx.save(); ctx.translate(x, y);
    tuskPath(ctx, hw, h, lean); ctx.fillStyle = pal.fang; ctx.fill();
    ctx.save(); ctx.clip(); ctx.rotate(lean * 0.5); ctx.fillStyle = pal.fangShade; ctx.fillRect(hw * 0.3, -h - 3, hw * 2, h + 6); ctx.restore();
    if (big) { ctx.fillStyle = pal.gloss; ctx.beginPath(); ctx.arc(-hw * 0.25 + Math.sin(lean) * h * 0.55, -h * 0.55, 1, 0, TAU); ctx.fill(); }
    tuskPath(ctx, hw, h, lean); ctx.strokeStyle = pal.outline; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  // square's underbite on the other mouth shapes: the two tusks (small, big) rooted at (x1, y1) / (x2, y2), leaning out
  function underbite(ctx, x1, y1, x2, y2) {
    const U = TUNE.under;
    fang(ctx, x1, y1, U.hw[0], U.h[0], U.lean[0], false);
    fang(ctx, x2, y2, U.hw[1], U.h[1], U.lean[1], true);
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.fillStyle = pal.mouth;
  }
  // open mouths: the tusks rise from the lower lip (y0), over the mouth
  function underbiteOpen(ctx, x, y0, w) {
    fang(ctx, x - w * 0.3, y0 + 1, 2.8, 6.5, -0.26, false); fang(ctx, x + w * 0.22, y0 + 1, 3.6, 10, 0.24, true);
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.fillStyle = pal.mouth;
  }
  // square's resting / flat mouth: a dark slot under the upper lip, a thick lower lip that juts past the upper lip and
  // curls up at the front (smile = how far the front end rises), the two pointed tusks rooted on that lower lip.
  // jaw > 0 (bored / sleepy, TUNE.jaw): the lower jaw hangs slack - it drops `jaw` units hinged at the back corner, its
  // curl and the tusks' lean flatten out (tusks upright), it chews sideways, the tongue shows in the opened slot and, past
  // droolAt, a drool glint hangs off the lip
  function squareSlot(ctx, lx, y, ux, uy, fx, fy, cx, cy, bx, by, x) {
    ctx.beginPath();
    ctx.moveTo(lx, y); ctx.quadraticCurveTo(x, y + 1.6, ux, uy);
    ctx.lineTo(fx - 1.5, fy); ctx.quadraticCurveTo(cx, cy, bx, by); ctx.closePath();
  }
  function squareMouth(ctx, x, y, w, smile, jaw) {
    const U = TUNE.under, J = TUNE.jaw, hw = w * 0.5, ux = x + hw * U.upper;
    const sk = jaw > 0 ? clamp(jaw / J.flat, 0, 1) : 0, curl = U.curl * (1 - sk);
    let dx = 0;
    if (jaw > 0) {                                    // the sideways chew, slower and smaller once it is sleepy
      const sl = clamp((jaw - J.bored) / (J.sleepy - J.bored), 0, 1);
      dx = lerp(J.chew, J.chewSleepy, sl) * clamp(jaw / J.bored, 0, 1) * Math.sin(t * TAU * J.chewHz);
    }
    smile *= 1 - sk;
    // slack: the front of the lip drops most (front), the U of the lower lip flattens (flatU), the upper lip's front
    // corner sags (sag): a hanging jaw instead of a smile
    const uy = y - smile * 0.5 + jaw * J.sag, fx = x + hw + U.jut + dx, fy = y - smile - 0.8 + jaw * J.front;
    const cx = x + hw * 0.3 + dx, cy = y + (U.depth + 1.2) * (1 - J.flatU * sk) + jaw * J.mid, lx = x - hw, bx = lx + dx * 0.3, by = y + jaw * J.hinge;
    squareSlot(ctx, lx, y, ux, uy, fx, fy, cx, cy, bx, by, x);   // the dark slot between the lips
    ctx.fillStyle = pal.mouth; ctx.fill();
    if (jaw > J.tongueAt) {                           // the slack jaw shows the tongue lying in the open slot
      ctx.save(); ctx.clip();
      ctx.globalAlpha = ga * clamp(jaw - J.tongueAt, 0, 1);
      tongue(ctx, x + hw * 0.05 + dx * 0.7, by * 0.25 + cy * 0.5 + fy * 0.25 - 1.2, hw * 0.62, 3.2);
      ctx.restore();
    }
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.quadraticCurveTo(x, y + 1.6, ux, uy); ctx.stroke();
    for (let i = 0; i < 2; i++) {                     // tusks rooted on the lower lip's top edge (a quadratic bx -> fx)
      const u = U.at[i], v = 1 - u, qx = v * v * bx + 2 * v * u * cx + u * u * (fx - 1.5), qy = v * v * by + 2 * v * u * cy + u * u * fy;
      fang(ctx, qx, qy + 1.4, U.hw[i], U.h[i], U.lean[i] * (1 - sk), i === 1);
    }
    ctx.beginPath();                                  // the jutting lower lip over the tusk roots
    ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, fx - 1.5, fy);
    ctx.quadraticCurveTo(fx + 1.6, fy + U.lip * 0.35 - curl * 0.2, fx - 1.2, fy + U.lip);
    ctx.quadraticCurveTo(cx, cy + U.lip * 1.45, bx + 0.8, by + U.lip * 0.45);
    ctx.closePath();
    ctx.fillStyle = pal.lip; ctx.fill(); ctx.lineWidth = TUNE.mouthLine * 0.85; ctx.stroke();
    ctx.strokeStyle = pal.gloss; ctx.lineWidth = 1.1; ctx.globalAlpha = ga * 0.45 * pal.glossA;
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.25, cy + U.lip * 0.15 - 0.6); ctx.quadraticCurveTo(cx + hw * 0.2, cy + U.lip * 0.1 - 1.2, fx - 3.5, fy + U.lip * 0.35); ctx.stroke();
    ctx.globalAlpha = ga;
    if (jaw > J.droolAt) {                            // sleepy: a drool glint hangs off the lip, slowly stretching
      const da = clamp((jaw - J.droolAt) / 0.6, 0, 1), u = 0.3, v = 1 - u, L = (J.drool[0] + J.drool[1] * (0.5 + 0.5 * Math.sin(t * TAU * J.droolHz))) * da;
      const qx = v * v * (fx - 1.2) + 2 * v * u * cx + u * u * (bx + 0.8), qy = v * v * (fy + U.lip) + 2 * v * u * (cy + U.lip * 1.45) + u * u * (by + U.lip * 0.45) - 0.8;
      const r = 1.1 + 0.6 * da;
      ctx.beginPath(); ctx.moveTo(qx - 1.2, qy);
      ctx.quadraticCurveTo(qx - 0.4, qy + L * 0.55, qx - r, qy + L); ctx.arc(qx, qy + L, r, Math.PI, 0, true);
      ctx.quadraticCurveTo(qx + 0.4, qy + L * 0.55, qx + 1.2, qy); ctx.closePath();
      ctx.globalAlpha = ga * 0.9 * da; ctx.fillStyle = pal.drool; ctx.fill();
      ctx.strokeStyle = pal.tearLine; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = pal.gloss; ctx.beginPath(); ctx.arc(qx - r * 0.35, qy + L - r * 0.3, r * 0.38, 0, TAU); ctx.fill();
      ctx.globalAlpha = ga;
    }
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.fillStyle = pal.mouth;
  }
  // Mouths are sized per species (mw resting, we expressive, mo open, grin, yawn) and carry its face signature.
  function drawMouth(ctx, x, y) {
    const m = E.mouth, o = E.open, s = sp, st = s.smile, under = st === 'under';
    ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.fillStyle = pal.mouth;
    let lip = y, fw = s.we;
    if (m === M_SMILE) {
      const w = s.mw;
      if (st === 'gummy') {              // blob: a wide open gummy grin with one tooth
        const h = w * 0.34, dip = h * 0.3;
        mouthD(ctx, x, y, w, h, dip); ctx.fill();
        tongue(ctx, x + w * 0.05, y + h * 0.74, w * 0.2, h * 0.2);
        teethTop(ctx, x, y, w, h, dip);
        mouthD(ctx, x, y, w, h, dip); ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.stroke();
      } else if (st === 'droop') {       // tall: a lazy lopsided half-smile with a dimple
        ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - 0.5); ctx.quadraticCurveTo(x - w * 0.05, y + w * 0.3, x + w * 0.5, y - w * 0.15);
        ctx.moveTo(x + w * 0.42, y - w * 0.27); ctx.quadraticCurveTo(x + w * 0.56, y - w * 0.18, x + w * 0.55, y - w * 0.04); ctx.stroke();
      } else if (st === 'tiny') {        // round: a tiny cat mouth under the huge eyes
        const q = w * 0.25;
        ctx.beginPath(); ctx.arc(x - q, y, q, 0.1 * Math.PI, 0.95 * Math.PI); ctx.moveTo(x + q + q * Math.cos(0.05 * Math.PI), y + q * Math.sin(0.05 * Math.PI));
        ctx.arc(x + q, y, q, 0.05 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      } else if (st === 'smirk') {       // bean: a crooked smirk sliver (dark lip) with two big buck teeth over the lower lip
        const SM = TUNE.smirk, x0 = x - w * 0.45, y0 = y + 0.5, x1 = x + w * 0.02, y1 = y + w * 0.2, x2 = x + w * 0.5, y2 = y - w * 0.2;
        const lx = x1 + w * 0.04, ly = y1 + SM.thick * 2;          // lower-lip control: the sliver is `thick` at its middle
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.quadraticCurveTo(lx, ly, x0, y0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.quadraticCurveTo(lx, ly, x0, y0); ctx.stroke();
        // the teeth hang from the top lip at toothT (x + w * 0.05), leaning with half its slope, over the lower lip
        const u = SM.toothT, v = 1 - u, tx = v * v * x0 + 2 * v * u * x1 + u * u * x2, ty = v * v * y0 + 2 * v * u * y1 + u * u * y2;
        const ang = Math.atan2(v * (y1 - y0) + u * (y2 - y1), v * (x1 - x0) + u * (x2 - x1)), ca = Math.cos(ang), sa = Math.sin(ang), hw = SM.toothW * 0.5;
        tooth(ctx, tx - ca * hw, ty - sa * hw - 0.8, SM.toothW, SM.toothH, ang * 0.5);
        tooth(ctx, tx + ca * hw * 1.04, ty + sa * hw * 1.04 - 0.6, SM.toothW * 0.94, SM.toothH * 0.92, ang * 0.5 + SM.crooked);
        ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
        const d = SM.dimple;                                       // the smirk dimple: a small tick off the high corner
        ctx.lineWidth = SM.dimpleW;
        ctx.beginPath(); ctx.moveTo(x2 + d * 0.55, y2 - d * 0.95); ctx.quadraticCurveTo(x2 + d * 1.25, y2 - d * 0.2, x2 + d * 0.9, y2 + d * 0.65); ctx.stroke();
      } else squareMouth(ctx, x - 2, y - 1, w * 0.9, TUNE.under.curl, E.jaw);   // square: the jutting underbite
      return;
    } else if (m === M_FLAT) {
      const hw = fw * 0.36;
      if (under) {                       // bored / sleepy: the slack jaw; otherwise (robot dance) a flat underbite
        if (E.jaw > 0) squareMouth(ctx, x - 2, y - 1, s.mw * 0.9, TUNE.under.curl, E.jaw); else squareMouth(ctx, x - 2, y, fw * 0.95, 0.4, 0);
        return;
      }
      ctx.beginPath(); ctx.moveTo(x - hw, y + 1); ctx.lineTo(x + hw, y); ctx.stroke();
      return;
    } else if (m === M_FROWN) {
      if (E.puff > 0) fw *= 0.8 - 0.1 * E.puff;          // puffed cheeks press the frown small and tight
      const r = fw * 0.48, cy = y + fw * 0.5;
      if (under) {
        const U = TUNE.under, hw = r * Math.cos(0.22 * Math.PI), d1 = hw * (2 * U.at[0] - 1), d2 = hw * (2 * U.at[1] - 1);
        underbite(ctx, x + d1, cy - Math.sqrt(r * r - d1 * d1), x + d2, cy - Math.sqrt(r * r - d2 * d2));
      }
      ctx.beginPath(); ctx.arc(x, cy, r, 1.22 * Math.PI, 1.78 * Math.PI); ctx.stroke();
      return;
    } else if (m === M_WORRY) {
      const wb = Math.sin(t * 15) * 1.3;
      if (under) underbite(ctx, x - fw * 0.22, y + 0.6, x + fw * 0.2, y + 1.2);
      ctx.beginPath(); ctx.moveTo(x - fw * 0.42, y + 1.5);
      ctx.bezierCurveTo(x - fw * 0.15, y - 3 - wb, x + fw * 0.15, y + 4 + wb, x + fw * 0.42, y - 0.5); ctx.stroke();
      return;
    } else if (m === M_POUT) {           // hurt: a small open pout under an arching top lip, the lower lip quivering
      const Sd = TUNE.sad, hw = fw * 0.36, q = Sd.quiver * Math.sin(t * TAU * Sd.quiverHz), cy = y + 2;
      ctx.beginPath(); ctx.moveTo(x - hw, cy + 2.6);
      ctx.quadraticCurveTo(x, cy - 6, x + hw, cy + 2.6);
      ctx.quadraticCurveTo(x, cy - 0.6 + q, x - hw, cy + 2.6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (under) underbite(ctx, x - hw * 0.55, cy + 2.2, x + hw * 0.5, cy + 2.2);
      ctx.lineWidth = TUNE.mouthLine * 0.85;
      ctx.beginPath(); ctx.moveTo(x - hw * 0.62, cy + 4.4 - q * 0.3); ctx.quadraticCurveTo(x, cy + 7.6 + q, x + hw * 0.62, cy + 4.4 + q * 0.3); ctx.stroke();
      return;
    } else if (m === M_SLY) {            // the impostor's snicker: a crooked sliver rising to the BACK corner (the look-back side)
      const SM = TUNE.smirk, w = fw * 1.08, x0 = x + w * 0.44, y0 = y + 1, x1 = x - w * 0.04, y1 = y + w * 0.26, x2 = x - w * 0.5, y2 = y - w * 0.2;
      const lx = x1 - w * 0.02, ly = y1 + SM.thick * 1.9;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.quadraticCurveTo(lx, ly, x0, y0); ctx.closePath(); ctx.fill();
      if (st === 'smirk') {              // bean: its two buck teeth hang from the top lip
        const u = 0.42, v = 1 - u, tx = v * v * x0 + 2 * v * u * x1 + u * u * x2, ty = v * v * y0 + 2 * v * u * y1 + u * u * y2;
        const ang = Math.atan2(v * (y1 - y0) + u * (y2 - y1), v * (x1 - x0) + u * (x2 - x1)) + Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), hw = SM.toothW * 0.5;
        tooth(ctx, tx - ca * hw, ty - sa * hw - 0.8, SM.toothW * 0.9, SM.toothH * 0.85, ang * 0.5);
        tooth(ctx, tx + ca * hw * 1.04, ty + sa * hw * 1.04 - 0.6, SM.toothW * 0.85, SM.toothH * 0.78, ang * 0.5 + SM.crooked);
      } else if (!under) {               // the others: a row of teeth peeking under the top lip (heh heh)
        ctx.save(); ctx.clip();
        ctx.strokeStyle = pal.teeth; ctx.lineWidth = 4.2; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(x0, y0 - 0.4); ctx.quadraticCurveTo(x1, y1 - 0.4, x2, y2 - 0.4); ctx.stroke();
        ctx.strokeStyle = pal.outline; ctx.lineWidth = 0.9; ctx.globalAlpha = ga * 0.5;   // tooth gaps
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
          const u = i / 4, v = 1 - u, qx = v * v * x0 + 2 * v * u * x1 + u * u * x2, qy = v * v * y0 + 2 * v * u * y1 + u * u * y2;
          ctx.moveTo(qx, qy); ctx.lineTo(qx + 0.3, qy + 2.6);
        }
        ctx.stroke(); ctx.restore(); ctx.globalAlpha = ga;
        ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.lineCap = 'round';
      }
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.quadraticCurveTo(lx, ly, x0, y0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
      if (under) {                       // square: its tusks still rise from the jutting lower lip
        const U = TUNE.under;
        for (let i = 0; i < 2; i++) {
          const u = 0.3 + 0.38 * i, v = 1 - u, qx = v * v * x0 + 2 * v * u * lx + u * u * x2, qy = v * v * y0 + 2 * v * u * ly + u * u * y2;
          fang(ctx, qx, qy - 0.5, U.hw[i] * 0.85, U.h[i] * 0.75, U.lean[i] * 0.6, i === 1);
        }
      }
      const d = SM.dimple;               // the dimple tick off the high (back) corner
      ctx.lineWidth = SM.dimpleW; ctx.strokeStyle = pal.outline;
      ctx.beginPath(); ctx.moveTo(x2 - d * 0.55, y2 - d * 0.95); ctx.quadraticCurveTo(x2 - d * 1.25, y2 - d * 0.2, x2 - d * 0.9, y2 + d * 0.65); ctx.stroke();
      return;
    } else if (m === M_O) {
      const k = 0.75 + 0.5 * o, rx = s.mo * 0.2 * k, ry = s.mo * 0.27 * k, cy = y + ry * 0.6;
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
      tongue(ctx, x, cy + ry * 0.52, rx * 0.6, ry * 0.32);
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.stroke(); lip = cy + ry;
    } else if (m === M_YAWN) {
      const Y = s.yawn, rx = lerp(s.mo * 0.16, Y[0], o), ry = lerp(s.mo * 0.1, Y[1], o), cy = y + lerp(ry * 0.4, Y[2], o);
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
      if (o > 0.2) {
        tongue(ctx, x, cy + ry * 0.55, rx * 0.62, ry * 0.3);
        ctx.fillStyle = pal.mouth; ctx.globalAlpha = ga * 0.5;       // the throat: a darker hollow at the back
        ctx.beginPath(); ctx.ellipse(x, cy - ry * 0.12, rx * 0.42, ry * 0.36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
      }
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.stroke(); lip = cy + ry;
    } else {
      const grin = m === M_GRIN, W = grin ? s.grin[0] : s.mo * 0.8, h = grin ? s.grin[1] * (0.85 + 0.15 * o) : s.mo * (0.22 + 0.3 * o);
      const dip = grin ? h * 0.22 : h * 0.1;
      mouthD(ctx, x, y, W, h, dip); ctx.fill();
      tongue(ctx, x + W * 0.06, y + h * 0.72, W * 0.22, h * 0.22);
      if (grin || st === 'gummy' || st === 'smirk') teethTop(ctx, x, y, W, h, dip);
      mouthD(ctx, x, y, W, h, dip); ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.mouthLine; ctx.stroke(); lip = y + h;
      fw = W * 0.75;
    }
    if (under) underbiteOpen(ctx, x, lip, Math.min(fw, s.we));      // open mouths: the fangs rise from the lower lip
  }
  function drawFace(ctx) {
    const fdx = P.faceDX, fdy = P.faceDY, ck = sp.cheek, gp = E.mouth === M_GRIN ? 1 : 0, an = E.anger;
    const cr = ck[4] * (1 + 0.28 * E.puff + 0.12 * an + 0.08 * gp), cdy = -2.5 * gp, cdx = 1.5 * gp;
    // sticker cheeks: the colour's own blush tone at its resting alpha (E.blush raises it); anger lays the red cheek over it
    const BL = TUNE.blush, k = cr / BLUSH_R, bw = BLUSH_BOX[2] * k, bh = BLUSH_BOX[3] * k, ox = BLUSH_BOX[0] * k, oy = BLUSH_BOX[1] * k;
    const x1 = ck[0] - cdx + fdx * 0.7 + ox, y1 = ck[1] + cdy + fdy * 0.7 + oy, x2 = ck[2] + cdx + fdx * 0.7 + ox, y2 = ck[3] + cdy + fdy * 0.7 + oy;
    const ba = pal.blushA, bl = E.blush < 1 ? E.blush : 1, mad = clamp((an - BL.madFrom) / (BL.madTo - BL.madFrom), 0, 1);
    ctx.globalAlpha = ga * (ba + (1 - ba) * bl);
    ctx.drawImage(S.blush.cv, x1, y1, bw, bh); ctx.drawImage(S.blush.cv, x2, y2, bw, bh);
    if (mad > 0) {
      ctx.globalAlpha = ga * 0.95 * mad;
      ctx.drawImage(S.blushMad.cv, x1, y1, bw, bh); ctx.drawImage(S.blushMad.cv, x2, y2, bw, bh);
    }
    if (E.flush > 0.01) {             // about to snap: a red flush spreads from the cheeks and rises from the chin
      const W = TUNE.wait, fl = E.flush, hw = (ck[2] - ck[0]) * 0.5 * (0.75 + 0.4 * fl) + ck[4];
      const cx = (ck[0] + ck[2]) * 0.5 + fdx * 0.7, cy = lerp(sp.mouth[1] + W.flushRise, (ck[1] + sp.face[1]) * 0.5, fl) + fdy * 0.7;
      const fk = hw / (BLUSH_R * BL.rx), fky = fk * (0.9 + 0.6 * fl);
      ctx.globalAlpha = ga * W.flushA * fl;
      ctx.drawImage(S.blushMad.cv, cx + BLUSH_BOX[0] * fk, cy + BLUSH_BOX[1] * fky, BLUSH_BOX[2] * fk, BLUSH_BOX[3] * fky);
    }
    ctx.globalAlpha = ga;
    for (let i = 0; i < nEyes; i++) { const e = EYES[i]; drawEye(ctx, e.x + fdx, e.y + fdy, e.r, e.spr, i); }
    if (E.brow && E.eyes === EYE_OPEN) drawBrows(ctx, fdx, fdy);
    else if (sp.browRest && E.eyes === EYE_OPEN && nEyes === 2 && E.lid < 0.95 && blinkLid < 0.95) {
      // tall's quirk: one brow cocked high over its bigger front eye (curious, never sleepy)
      const e = EYES[1], bx = e.x + fdx, by = e.y + fdy - e.r * 1.5, hw = e.r * 0.78;
      ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.browLine;
      ctx.beginPath(); ctx.moveTo(bx - hw, by + 2.2); ctx.quadraticCurveTo(bx - hw * 0.1, by - 4.2, bx + hw, by - 0.6); ctx.stroke();
    }
    drawMouth(ctx, sp.mouth[0] + fdx * 0.8, sp.mouth[1] + fdy * 0.8);
    if (an > 0.3) {                   // the anger vein pops on the forehead corner and throbs
      const e = EYES[nEyes > 1 ? 1 : 0], vs = 4.6 * (1 + 0.18 * Math.sin(t * TAU * TUNE.wait.veinHz)) * clamp((an - 0.3) / 0.4, 0, 1);
      if (vs > 0.3) drawVein(ctx, e.x + fdx + e.r * 0.95, e.y + fdy - e.r * 1.75, vs);
    }
  }
  function drawGoogly(ctx, ex, ey, ppx, ppy) {
    blit(ctx, S.goo, ex, ey);
    blit(ctx, S.gooPup, ex + ppx, ey + ppy);
    blit(ctx, S.gooGloss, ex, ey);
  }
  function drawBack(ctx) {
    if (S.oBack) {                     // the outfit's cape / cloak hangs behind everything (the tail pokes out over it)
      ctx.save(); bodyXf(ctx); bodyXf2(ctx);
      if (!S.oRing) {                  // a cape sways from its top edge; the float ring's far half stays put with its near half
        const C = OFIT[sp.name].cape, ty = C[1];
        const k = clamp(-swvx * 0.0016 - P.swayX * 0.008 - P.skew * 0.5 + 0.035 * Math.sin(t * 2.2 + seed), -0.14, 0.14);
        ctx.transform(1, 0, k, 1, -k * ty, 0);
      }
      blit(ctx, S.oBack, 0, 0);
      ctx.restore();
    }
    if (tailP.on) {
      const fk = tailP.fake;
      part(ctx, fk ? S.ftail : S.tail, tailP.ax + tailP.ox, tailP.ay + tailP.oy, P.rot + tailP.base + tailP.dr + (fk ? 0 : P.wag),
        fk ? S.tFtail : S.tTail, fk ? 'ftail' : 'tail', litDB, litLB);
    }
    if (stalkP.on) {
      const pr = stalkP, th = pr.th + P.rot, cx = pr.ax + Math.cos(th) * pr.L * 0.5, cy = pr.ay + Math.sin(th) * pr.L * 0.5;
      const k = TUNE.stalk.posK, ex = pr.tx + (pr.px - pr.tx) * k, ey = pr.ty + (pr.py - pr.ty) * k;
      ctx.beginPath(); ctx.moveTo(pr.ax, pr.ay); ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.strokeStyle = pal.outline; ctx.lineWidth = TUNE.stalkW; ctx.stroke();
      ctx.strokeStyle = pal.body; ctx.lineWidth = TUNE.stalkW - 3; ctx.stroke();
      drawEye(ctx, ex, ey, sp.r3, S.stalkScl, 2);
    }
  }
  // the outfit headwear's live bits, in the headwear's own transform: back = behind it (the bandana's knot tails
  // flapping), else over it (the helmet antenna's blinking LED, the neon cap's LED pulsing on the beat, the pumpkin's
  // candle flicker, the crown's jewel glint)
  function drawOutfitHead(ctx, back) {
    const th = spec.outfit, op = S.oPal;
    if (!op) return;
    if (back) {
      if (th === 'rock') {
        const f = Math.sin(t * 9 + seed), f2 = Math.sin(t * 7.3 + seed * 1.7), d = hatP.dr * 18;
        ctx.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath(); ctx.moveTo(-16, -3.5); ctx.quadraticCurveTo(-21, -3 + (i ? f : f2) * 1.5, -26 + i * 3 + d, (i ? 6 : 1) + (i ? f2 : f) * 2.2);
          ctx.strokeStyle = op.bandanaInk; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = op.bandana; ctx.lineWidth = 3.4; ctx.stroke();
        }
      }
      return;
    }
    if (th === 'space') draw.glow(ctx, 13.4, -46.5, 7, '#ff6fcf', ((t * 1.3 + seed) % 1) < 0.5 ? 0.85 : 0.2);
    else if (th === 'neon') { const b = beatNow(TUNE.dance.tempo, clk), k = 1 - (b - Math.floor(b)); draw.glow(ctx, 0, -4, 17, '#3df0ff', 0.22 + 0.35 * k * k); }
    else if (th === 'spooky') draw.glow(ctx, 0, -11, 10, '#ffb347', 0.38 + 0.14 * Math.sin(t * 11 + seed));
    else if (th === 'royal') {        // the centre jewel glints every couple of seconds
      const g = ((t * 0.45 + seed * 0.37) % 1) * 7;
      if (g < 1) draw.glow(ctx, 0, -5, 9, '#ffe7a0', Math.sin(g * Math.PI) * 0.8);
    }
  }
  // the outfit's shoulder piece on one arm root (side -1 = the back arm, mirrored), at the shoulder as drawArm places it;
  // neon pads glow with the jacket's beat pulse (litK)
  function drawPad(ctx, x, y, side) {
    const s = OFIT[sp.name].pad, r = S.oPad;
    ctx.save(); ctx.translate(x, y); ctx.scale(side * s, s);
    ctx.drawImage(r.cv, r.x0, r.y0, r.w, r.h);
    if (litK > 0.02) draw.glow(ctx, 4, -6, 15, '#3df0ff', litK * 0.45);
    ctx.restore();
  }
  function drawFront(ctx) {
    if (gooP.on) {
      drawGoogly(ctx, gooP.px, gooP.py, gpx, gpy);
      blitRot(ctx, S.gooTape, gooP.ax, gooP.ay, P.rot + G.tapeRot);
    }
    if (hatP.on) {
      const oh = hatP.kind === 'outfit', hs = oh ? OFIT[sp.name].hat[2] : sp.hatS, h = hatP.fake ? S.paper : oh ? S.oHead : S.hat;
      ctx.save();
      ctx.translate(hatP.ax + hatP.ox, hatP.ay + hatP.oy); ctx.rotate(P.rot + hatP.base + hatP.dr); ctx.scale(hs, hs);
      if (oh) drawOutfitHead(ctx, true);
      ctx.drawImage(h.cv, h.x0, h.y0, h.w, h.h);
      if (oh) drawOutfitHead(ctx, false);
      if (litH > 0.01 || litHL > 0.01) wash(ctx, h, hatP.fake ? S.tPaper : S.tHat, hatP.fake ? 'paper' : S.kHat, litH, litHL, false);
      if (litDoor > 0.01) {            // the amber catch-light on the door side + top of the hat
        const r = hatRimRec(curFlip > 0 ? 0 : 1);
        ctx.globalAlpha = ga * litDoor * (hatP.fake ? TUNE.rim.paperRim : TUNE.rim.hatRim); ctx.drawImage(r.cv, r.x0, r.y0, r.w, r.h); ctx.globalAlpha = ga;
      }
      if (hatP.fake) {   // the tape's loose end (on the head side) has come unstuck and flaps
        const PP = TUNE.paper, motion = Math.min(1, (hatP.dr < 0 ? -hatP.dr : hatP.dr) * 3), hh = PP.tapeH * 0.5;
        ctx.translate(FLAP_X, FLAP_Y); ctx.rotate(PP.tapeRot + 0.25 + 0.5 * Math.sin(t * 13 + seed) * (0.35 + motion));
        ctx.beginPath(); ctx.moveTo(0.6, -hh); ctx.lineTo(-4.6, -hh + 0.4); ctx.lineTo(-4, -hh * 0.2); ctx.lineTo(-4.9, hh * 0.4);
        ctx.lineTo(-4.3, hh); ctx.lineTo(0.6, hh); ctx.closePath();
        ctx.fillStyle = pal.tape; ctx.globalAlpha = ga * PP.tapeA; ctx.fill();
        ctx.strokeStyle = pal.tapeLine; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = ga;
      }
      ctx.restore();
    }
    if (tailP.on && tailP.fake) blitRot(ctx, S.bow, tailP.ax, tailP.ay, P.rot + tailP.dr * 0.35);
  }
  function drawRims(ctx, door, lamp, flip) {       // painted (source-over) light bands, baked inside the outline
    if (door > 0.01) { ctx.globalAlpha = ga * door * TUNE.rim.door; blit(ctx, rimRec(flip > 0 ? 0 : 1), 0, 0); }
    if (lamp > 0.01) { ctx.globalAlpha = ga * lamp * TUNE.rim.lamp; blit(ctx, rimRec(flip > 0 ? 2 : 3), 0, 0); }
    ctx.globalAlpha = ga;
  }
  // band mode: the instrument pops in (IP.s, outBack); floor instruments grow from the floor and are drawn in ground space
  // in front of the body, the others ride the body under the arms. The toms give on each hit: the head drops (squash about
  // the floor), the shell spreads, a white ring flashes on the head
  function drawInst(ctx) {
    const s = IP.s, spr = instRec(), kind = sp.inst;
    if (kind === 'drum') {
      const Dm = TUNE.inst.drum, fy = -Dm.y;
      for (let i = 0; i < 2; i++) {
        const ht = i ? IP.hitF : IP.hitB, q = ht < Dm.hit ? 1 - ht / Dm.hit : 0, qq = q * q;
        ctx.save(); ctx.translate(i ? Dm.x : -Dm.x, 0); ctx.scale(s * (1 + (1 - Dm.sq) * 0.5 * qq), s * (1 - (1 - Dm.sq) * qq)); ctx.translate(0, -fy);
        ctx.drawImage(spr.cv, spr.x0, spr.y0, spr.w, spr.h);
        if (q > 0.02) {
          ctx.globalAlpha = ga * Dm.flash * q; ctx.strokeStyle = pal.gloss; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(0, -0.3, 6 + 5 * (1 - q), 1.8 + 1.4 * (1 - q), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = ga;
        }
        ctx.restore();
      }
      return;
    }
    ctx.save();
    if (kind === 'keys') {             // the stand stays upright on the floor; the synth tilts toward the player
      const st2 = S.stand, fy = -IP.y;
      ctx.translate(IP.x, 0); if (s !== 1) ctx.scale(s, s); ctx.translate(0, -fy);
      ctx.drawImage(st2.cv, st2.x0, st2.y0, st2.w, st2.h);
      ctx.rotate(IP.rot);
    } else {
      const k = s * TUNE.inst[kind].k;
      ctx.translate(IP.x, IP.y); if (IP.rot) ctx.rotate(IP.rot); ctx.scale(k, k);
    }
    ctx.drawImage(spr.cv, spr.x0, spr.y0, spr.w, spr.h);
    ctx.restore();
  }
  // the body transform (rotation about the pivot, lift; then sway, squash / stretch and shear), from the feet origin
  function bodyXf(ctx) {
    ctx.translate(0, P.pivotY - P.lift);
    if (P.rot !== 0) ctx.rotate(P.rot);
    ctx.translate(0, -P.pivotY);
  }
  function bodyXf2(ctx) {
    ctx.translate(P.swayX, 0);
    ctx.scale(P.sx, P.sy);
    if (P.skew) ctx.transform(1, 0, P.skew, 1, 0, 0);
  }
  // yeet speed lines: 2-3 short streaks trailing the body centre against the velocity, fading over TUNE.yeet.lines s
  function drawSpeedLines(ctx) {
    const Y = TUNE.yeet, ft = st - Y.crouch;
    if (!launched || ft > Y.lines) return;
    const v = Math.sqrt(yeetVX * yeetVX + yeetVY * yeetVY) || 1, ux = yeetVX / v, uy = yeetVY / v, h = sp.h;
    const a = 1 - ft / Y.lines, grow = clamp(ft / 0.06, 0, 1), cx = 0, cy = -h * 0.5;
    ctx.lineCap = 'round'; ctx.strokeStyle = pal.gloss; ctx.lineWidth = Y.lineW;
    for (let i = 0; i < 3; i++) {
      const off = Y.lineOff[i] * h, back = h * (Y.lineGap + 0.08 * i), len = Y.lineLen[i] * h * grow;
      const x0 = cx - ux * back - uy * off, y0 = cy - uy * back + ux * off;
      ctx.globalAlpha = ga * a * (0.85 - 0.15 * i);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - ux * len, y0 - uy * len); ctx.stroke();
    }
    ctx.globalAlpha = ga;
  }
  // world = the world-anchored ones (drawn over the body: a dropped costume lies in front of the guest walking away
  // into the doorway), else the local ones (behind the body, bouncing around its feet)
  function drawDebris(ctx, world) {
    const hs = sp.hatS, R = TUNE.rip;
    for (let i = 0; i < DEB.length; i++) {
      const d = DEB[i];
      if (!d.on || d.w !== world) continue;
      ctx.globalAlpha = ga * d.alpha;
      ctx.save();
      if (d.w && !d.wp) {            // world-anchored: map its spawn frame into the current draw frame
        const k = d.ws0 / ws, m = d.wf0 * wf;
        ctx.translate((d.wx0 + d.x * d.ws0 * d.wf0 - wx) / (ws * wf), (d.wy0 + d.y * d.ws0 - wy) / ws);
        ctx.scale(k * m, k);
      } else ctx.translate(d.x, d.y);
      if (d.kind === DEB_STRIP) {    // flutter: it sways, rocks and turns edge-on (|cos| width) while it falls; flat once landed
        const fl = d.rest ? 0 : 1, w = d.t * TAU * R.flutHz + d.ph, turn = Math.cos(w * 1.7);
        ctx.translate(R.sway * fl * Math.sin(w), 0);
        ctx.rotate(d.rot + R.rock * fl * Math.sin(w + 1.1));
        if (fl) ctx.scale(0.22 + 0.78 * (turn < 0 ? -turn : turn), 1);
        drawStrip(ctx, d);
        ctx.restore();
        continue;
      }
      if (d.sc !== 1) ctx.scale(d.sc, d.sc);
      let rot = d.rot;
      if (d.rip && d.free) {         // the hang: a ripped part rocks like loose paper, settling as it starts to fall
        const ht = d.t - R.pop, env = ht < R.hang ? 1 : 1 - (ht - R.hang) / 0.25;
        if (env > 0) rot += R.wob * env * Math.sin(ht * TAU * R.wobHz);
      }
      ctx.rotate(rot);
      if (d.kind === DEB_GOO) { drawGoogly(ctx, 0, 0, 0, G.R * 0.42); blit(ctx, S.gooTape, 0, -G.R * 0.8); }
      else if (d.kind === DEB_PAPER || d.kind === DEB_HAT) { ctx.scale(hs, hs); blit(ctx, d.kind === DEB_HAT ? S.hat : S.paper, 0, 0); }
      else { blit(ctx, S.ftail, 0, 0); blit(ctx, S.bow, 0, 0); }
      ctx.restore();
    }
    ctx.globalAlpha = ga;
  }
  // a torn strip d.sw x d.sh centred on the origin (both ends jagged: TORN_R / TORN_L): translucent tape, or the pink ribbon
  function drawStrip(ctx, d) {
    const hw = d.sw * 0.5, hh = d.sh * 0.5, n = TORN_R.length - 1, a = ctx.globalAlpha;
    ctx.beginPath(); ctx.moveTo(-hw, -hh);
    for (let k = 0; k <= n; k++) ctx.lineTo(hw + TORN_R[k], -hh + d.sh * k / n);
    for (let k = n; k >= 0; k--) ctx.lineTo(-hw + TORN_L[k], -hh + d.sh * k / n);
    ctx.closePath();
    if (d.ribbon) { ctx.fillStyle = pal.ribbon; ctx.fill(); ctx.strokeStyle = pal.ribbonLine; ctx.lineWidth = 1; ctx.stroke(); }
    else {
      ctx.globalAlpha = a * TUNE.paper.tapeA; ctx.fillStyle = pal.tape; ctx.fill();
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = pal.tapeLine; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = pal.gloss; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-hw + 1.4, -hh + 1.1); ctx.lineTo(hw - 1.4, -hh + 1.1); ctx.stroke();
    ctx.globalAlpha = a;
  }
  function drawFx(ctx) {
    for (let i = 0; i < FX.length; i++) {
      const f = FX[i];
      if (!f.on) continue;
      const u = f.t / f.life, a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      ctx.globalAlpha = ga * a;
      if (f.kind === FX_Z) {          // a sticker: pops in (outBack), stays opaque, fades only at the end of its rise
        ctx.globalAlpha = ga * (u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1);
        const s = f.s * (0.8 + 0.35 * u) * easeIndex.outBack(clamp(u / 0.12, 0, 1)) *
          (f.pop > 0 ? 1 - easeIndex.inBack(clamp(f.pop / TUNE.z.pop, 0, 1)) : 1);
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(s * curFlip, s); ctx.rotate(-0.2 + 0.25 * Math.sin(f.t * 3));
        ctx.drawImage(S.z.cv, S.z.x0, S.z.y0, S.z.w, S.z.h); ctx.restore();
      } else if (f.kind === FX_STEAM) {   // a sticker puff: pops in, grows s0 -> s1 as it rises, then bursts (popS) and goes
        const Sm = TUNE.steam, sp = S.steam;
        let s = lerp(Sm.s0, Sm.s1, easeIndex.outCubic(clamp(f.t / Sm.life, 0, 1))) * easeIndex.outBack(clamp(f.t / 0.09, 0, 1)), a = 1;
        if (f.t > Sm.life) { const q = clamp((f.t - Sm.life) / Sm.pop, 0, 1); s *= 1 + (Sm.popS / Sm.s1 - 1) * easeIndex.outQuad(q); a = 1 - q * q; }
        ctx.globalAlpha = ga * a;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + 0.12 * Math.sin(f.t * 7 + f.side)); ctx.scale(s, s);
        ctx.drawImage(sp.cv, sp.x0, sp.y0, sp.w, sp.h); ctx.restore();
      } else if (f.sp < 0) {              // a falling tear / sweat drop
        const d = S.drop, s = f.s;
        ctx.globalAlpha = ga * clamp(f.t / 0.08, 0, 1);
        ctx.drawImage(d.cv, f.x + d.x0 * s, f.y + d.y0 * s, d.w * s, d.h * s);
      } else {                            // ...splatted on the feet line: a flat puddle + two droplets hopping out, fading
        const Dr = TUNE.drop, q = f.sp / Dr.splat, s = f.s, gy = f.y + DROP_BOT * s;
        const rx = Dr.splatRx * s * (1 + Dr.splatGrow * easeIndex.outQuad(q)), ry = Dr.splatRy * s * (1 - 0.35 * q);
        const tt = f.sp, hx = rx * 0.55 + Dr.dropVx * tt * s, hy = Dr.dropVy * tt + 0.5 * Dr.dropG * tt * tt, dr = Dr.dropR * s * (1 - 0.45 * q);
        ctx.globalAlpha = ga * (1 - q);
        ctx.fillStyle = pal.tear; ctx.strokeStyle = pal.tearLine; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.ellipse(f.x, gy - ry, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.arc(f.x - hx, gy - ry + (hy < 0 ? hy : 0) * s, dr, 0, TAU);
        ctx.moveTo(f.x + hx + dr * 0.8, gy - ry + (hy < 0 ? hy : 0) * s * 0.8); ctx.arc(f.x + hx, gy - ry + (hy < 0 ? hy : 0) * s * 0.8, dr * 0.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = pal.gloss; ctx.beginPath(); ctx.ellipse(f.x - rx * 0.35, gy - ry * 1.35, rx * 0.22, ry * 0.32, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = ga;
  }
  // scene-driven velocity for the prop springs, from the FIRST draw of each frame (a repeat draw in the same frame, e.g.
  // street + party window, is ignored here so it cannot fake a velocity); wx/wy (particles, anchor) follow the latest draw
  function track(x, y, s, f) {
    const now = performance.now(), same = drawn && now - lastNow < TUNE.ext.sameFrameMs;
    if (drawn && !same) {
      const ddt = (now - lastNow) * 0.001;
      if (ddt < 0.2) {
        const M = TUNE.ext.max;
        const vx = clamp((x - mx) / ddt / s * f, -M, M), vy = clamp((y - my) / ddt / s, -M, M);
        extVx = damp(extVx, vx, TUNE.ext.smooth, ddt); extVy = damp(extVy, vy, TUNE.ext.smooth, ddt);
      } else { extVx = 0; extVy = 0; seenVx = 0; seenVy = 0; }
    }
    if (!same) { lastNow = now; mx = x; my = y; }
    drawn = true; wx = x; wy = y; ws = s; wf = f;
    if (nPend) pinPending();
  }
  // the contact shadow: a ground decal under the feet (drawn straight onto the target, also for a faded actor)
  function drawShadow(ctx, x, feetY, scale, flip, alpha) {
    if (vanish) return;
    const SH = TUNE.shadow, air = P.lift - (offY < 0 ? offY : 0), sk = 1 / (1 + air * SH.fall), sh = S.shadow;
    if (!sh) return;
    const rx = sp.shadow[1] * scale * sk * P.sx, ry = SH.ry * scale * sk, cx = x + (offX + sp.shadow[0]) * scale * flip;
    const g0 = ctx.globalAlpha;
    ctx.globalAlpha = g0 * SH.alpha * alpha * sk;
    ctx.drawImage(sh.cv, cx - rx, feetY + scale - ry, rx * 2, ry * 2);
    ctx.globalAlpha = g0;
  }
  // the faded actor's layer box (TUNE.layer) in the draw's world units -> LB, from this frame's pose: bounds() + pad,
  // squash / shear about the feet, spin about the pivot, the hop, the yeet flight + speed lines, live stickers and debris
  const LB = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function lbAdd(x0, y0, x1, y1) {
    if (x0 < LB.x0) LB.x0 = x0; if (x1 > LB.x1) LB.x1 = x1; if (y0 < LB.y0) LB.y0 = y0; if (y1 > LB.y1) LB.y1 = y1;
  }
  function layerBox(x, feetY, s, f) {
    const Ly = TUNE.layer, pd = Ly.pad, b = actor.bounds();
    const ksx = P.sx > 1 ? P.sx : 1, ksy = P.sy > 1 ? P.sy : 1, sk = P.skew < 0 ? -P.skew : P.skew;
    let y0 = (b.y - pd[1]) * ksy, y1 = pd[3];
    const lean = sk * -y0, sw = P.swayX < 0 ? -P.swayX : P.swayX;
    let x0 = (b.x - pd[0]) * ksx - lean - sw, x1 = (b.x + b.w + pd[2]) * ksx + lean + sw;
    if (P.rot > 0.01 || P.rot < -0.01) {          // spinning about the pivot: the box's farthest corner sweeps a circle
      const py = P.pivotY, dy0 = y0 - py, dy1 = y1 - py, dx = -x0 > x1 ? -x0 : x1;
      const r = Math.sqrt(dx * dx + (dy0 * dy0 > dy1 * dy1 ? dy0 * dy0 : dy1 * dy1));
      x0 = -r; x1 = r; y0 = py - r; y1 = py + r;
    }
    if (P.lift > 0) y0 -= P.lift;
    if (vanish) { LB.x0 = 1e9; LB.y0 = 1e9; LB.x1 = -1e9; LB.y1 = -1e9; }   // flown off-stage: only debris / stickers left
    else { LB.x0 = x0 + offX; LB.x1 = x1 + offX; LB.y0 = y0 + offY; LB.y1 = y1 + offY; }
    if (state === 'yeet' && launched && !vanish) {
      const m = sp.h * Ly.speed, cx = offX, cy = offY - P.lift - sp.h * 0.5;
      lbAdd(cx - m, cy - m, cx + m, cy + m);
    }
    if (nFx) {
      const r = Ly.fx;
      for (let i = 0; i < FX.length; i++) { const q = FX[i]; if (q.on) lbAdd(q.x + offX - r, q.y + offY - r, q.x + offX + r, q.y + offY + r); }
    }
    if (nDeb) {
      for (let i = 0; i < DEB.length; i++) {
        const d = DEB[i];
        if (!d.on) continue;
        if (d.w) {                               // world-anchored debris, mapped into this draw's frame (see drawDebris)
          const lx = (d.wx0 + d.x * d.ws0 * d.wf0 - x) / (s * f), ly = (d.wy0 + d.y * d.ws0 - feetY) / s, r = Ly.deb * d.ws0 / s;
          lbAdd(lx - r, ly - r, lx + r, ly + r);
        } else lbAdd(d.x - Ly.deb, d.y - Ly.deb, d.x + Ly.deb, d.y + Ly.deb);
      }
    }
    // local units -> the draw's world units (the flip mirrors x about the feet)
    const a0 = LB.x0, a1 = LB.x1;
    LB.x0 = f > 0 ? x + a0 * s : x - a1 * s; LB.x1 = f > 0 ? x + a1 * s : x - a0 * s;
    LB.y0 = feetY + LB.y0 * s; LB.y1 = feetY + LB.y1 * s;
  }
  // a faded actor: shadow on the target, the rest opaque into the shared layer, then the layer at the alpha in ONE drawImage
  function drawLayered(ctx, x, feetY, scale, flip, a) {
    const Ly = TUNE.layer, z = camera.zoom > 1 ? (camera.zoom < Ly.zoomMax ? camera.zoom : Ly.zoomMax) : 1;
    layerBox(x, feetY, scale, flip);
    if (!(LB.x1 > LB.x0 && LB.y1 > LB.y0)) return;   // nothing left to draw (flown off-stage, no debris)
    let D = draw.res() * z;
    const big = Math.max(LB.x1 - LB.x0, LB.y1 - LB.y0) * D;
    if (big > Ly.maxPx) D *= Ly.maxPx / big;
    const x0 = Math.floor(LB.x0 * D) / D, y0 = Math.floor(LB.y0 * D) / D;   // whole device px on an unzoomed stage: no resample blur
    const pw = Math.ceil((LB.x1 - x0) * D) + 1, ph = Math.ceil((LB.y1 - y0) * D) + 1;
    const lc = layerCtx(pw, ph);
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, Math.min(LAYER.w, pw + 2), Math.min(LAYER.h, ph + 2));
    lc.setTransform(D, 0, 0, D, -x0 * D, -y0 * D);
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over';
    LAYER.busy = true;
    try { paint(lc, x, feetY, scale, flip, 1); } finally { LAYER.busy = false; }
    const g0 = ctx.globalAlpha;
    ctx.globalAlpha = a;
    ctx.drawImage(LAYER.cv, 0, 0, pw, ph, x0, y0, pw / D, ph / D);
    ctx.globalAlpha = g0;
  }
  function drawActor(ctx, x, feetY, scale, o) {
    o = o || NO;
    const alpha = o.alpha !== undefined ? o.alpha : 1;
    if (!(alpha > 0.002) || !(scale > 0)) return;
    const flip = o.flip ? -1 : 1, a = ctx.globalAlpha * alpha;
    prepare(x, feetY, scale, o, flip);
    drawShadow(ctx, x, feetY, scale, flip, alpha);
    if (a >= TUNE.layer.from || LAYER.busy) paint(ctx, x, feetY, scale, flip, alpha);
    else drawLayered(ctx, x, feetY, scale, flip, a);
  }
  // per-draw bookkeeping (once per draw call, before any painting): scene velocity for the props, the light washes, the
  // sprite bucket / dim level (bakes or re-touches parts)
  let pDoor = 0, pLamp = 0;
  function prepare(x, feetY, scale, o, flip) {
    const lt = o.light;
    const door = lt && lt.door > 0 ? Math.min(1, lt.door) : 0, lamp = lt && lt.lamp > 0 ? Math.min(1, lt.lamp) : 0;
    pDoor = door; pLamp = lamp;
    track(x, feetY, scale, flip);
    curFlip = flip;
    if (WQ.n) pumpWarm(false);
    {   // light washes of the parts drawn over / beside the body; local +x faces the door when not flipped
      const R = TUNE.rim, dW = door * R.limb, lW = lamp * R.lamp * R.limb, fr = flip > 0;
      litDF = fr ? dW : dW * R.limbFar; litDB = fr ? dW * R.limbFar : dW;
      litLF = fr ? lW * R.limbFar : lW; litLB = fr ? lW : lW * R.limbFar;
      litH = door * R.hat; litHL = lamp * R.lamp * R.hat; litDoor = door;
    }
    frameTick(performance.now());
    if (seenEpoch !== EPOCH) { seenEpoch = EPOCH; if (curBucket >= 0 && holdsDead()) dirty = true; }   // a held part was evicted
    const dl = o.dim > 0 ? dimLevel(o.dim < 1 ? o.dim : 1) : 0, K = TUNE.keep, cb = curBucket >= 0 ? TUNE.buckets[curBucket] : 0;
    const bi = dl === curDim && curGen === GEN && scale >= cb * K[0] && scale <= cb * K[1] ? curBucket : bucketFor(scale);
    if (dirty || dl !== curDim || bi !== curBucket || curGen !== GEN) refresh(dl, bi);
    if (FRM.n - touchFrame >= TUNE.cache.touchFrames) { touchFrame = FRM.n; eachPart(touchRec); }   // in use: keep it fresh
  }
  // everything but the shadow, at alpha on top of the ctx's own (1 into the faded-actor layer)
  function paint(ctx, x, feetY, scale, flip, alpha) {
    const SH = TUNE.shadow, door = pDoor, lamp = pLamp;
    ctx.save();
    ctx.translate(x, feetY);
    ctx.scale(scale * flip, scale);
    ctx.globalAlpha *= alpha;
    ga = ctx.globalAlpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (nDeb) drawDebris(ctx, false);
    if (!vanish) {
      // contact lines: a thin dark line where each planted foot meets the ground
      const up = offY < 0 ? -offY : 0, sh = S.shadow;
      for (let i = 0; i < 2; i++) {
        const lift = P.lift * (1 - P.plant) + (i ? P.ffy : P.fby) + up, a = SH.contact * (1 - lift / SH.contactLift);
        if (a <= 0.02) continue;
        const ft = i ? sp.footF : sp.footB, shoe = i && sp.shoe, rx = (shoe ? 15 : ft[0]) * SH.contactRx, ry = SH.contactRy;
        const fx = offX + sp.feet[i] + (i ? P.ffx : P.fbx) + (shoe ? 8.5 : 0);
        ctx.globalAlpha = ga * a; ctx.drawImage(sh.cv, fx - rx, -ry * 0.7, rx * 2, ry * 2);
      }
      ctx.globalAlpha = ga;
      ctx.translate(offX, offY);
      if (state === 'yeet') drawSpeedLines(ctx);
      drawBack(ctx);
      ctx.save();
      bodyXf(ctx);
      const pk = P.lift * P.plant;
      if (sp.legs) drawLegs(ctx, pk);
      part(ctx, S.footB, sp.feet[0] + P.fbx, pk - P.fby, 0, S.tFootB, S.kFootB, litDB, litLB);
      part(ctx, S.footF, sp.feet[1] + P.ffx, pk - P.ffy, 0, S.tFootF, S.kFootF, litDF, litLF);
      bodyXf2(ctx);
      if (S.wing) blitRot(ctx, S.wing, sp.wing[0], sp.wing[1], P.wing);
      blit(ctx, S.body, 0, 0);
      if (S.oTorso) blit(ctx, S.oTorso, 0, 0);   // the outfit's torso piece (baked, clipped to the silhouette)
      litK = 0;
      if (S.oLit) {                    // the neon jacket lights up on every beat (additive, fading through the beat)
        const bn = beatNow(TUNE.dance.tempo, clk), f = 1 - (bn - Math.floor(bn));
        litK = f * f;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * (0.28 + 0.72 * litK);
        blit(ctx, S.oLit, 0, 0);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga;
      }
      if (S.oRing) blit(ctx, S.oRing, 0, 0);     // the float ring's near half, over the torso (face, instrument, arms over it)
      if (door > 0.01 || lamp > 0.01) drawRims(ctx, door, lamp, flip);
      if (flashT > 0) {
        if (!S.sil) S.sil = silRec();
        ctx.globalAlpha = ga * (flashT / TUNE.shift.flash); blit(ctx, S.sil, 0, 0); ctx.globalAlpha = ga;
      }
      drawFace(ctx);
      if (S.oEyes) {                   // the outfit's eyewear rides the face (the space bubble stays on the head)
        if (spec.outfit === 'space') {
          blit(ctx, S.oEyes, 0, 0);
          const B = OFIT[sp.name].bub;
          if (((t * 1.3 + seed) % 1) < 0.5) draw.glow(ctx, B[0] + B[2] * 0.42 + 4.3, B[1] - B[3] * 0.91 - 12.4, 8, '#ff6fcf', 0.85);
        } else blit(ctx, S.oEyes, P.faceDX, P.faceDY);
      }
      if (inst && state === 'dance' && IP.s > 0.01) {   // band mode: the instrument goes between the body and the arms
        if (INST_GROUND[sp.inst]) { ctx.restore(); drawInst(ctx); ctx.save(); bodyXf(ctx); bodyXf2(ctx); }
        else drawInst(ctx);
      }
      // both stub arms sit on top of the body so gestures read (and take the door / lamp light). Raised arms stretch
      // (armK) and lift their shoulder, so "arms up" clears the head
      const kB = P.armKB, kF = P.armKF, upB = shoulderUp(P.armB, kB, P.ikB), upF = shoulderUp(P.armF, kF, P.ikF);
      drawArm(ctx, sp.arm[0], sp.arm[1] - upB, P.armB, P.eB, kB, litDB, litLB);
      if (S.oPad) drawPad(ctx, sp.arm[0], sp.arm[1] - upB, -1);   // shoulder pieces sit over each arm's root
      drawArm(ctx, sp.arm[2], sp.arm[3] - upF, P.armF, P.eF, kF, litDF, litLF);
      if (S.oPad) drawPad(ctx, sp.arm[2], sp.arm[3] - upF, 1);
      ctx.restore();
      drawFront(ctx);
      if (nFx) drawFx(ctx);
      ctx.translate(-offX, -offY);
    }
    if (nDeb) drawDebris(ctx, true);
    ctx.restore();
  }

  // ---------------------------------------------------------------- public
  const BOUNDS = { x: 0, y: 0, w: 0, h: 0 };
  const ANCHOR = { x: 0, y: 0, angle: 0 };
  // anchor('tail' | 'fake') -> ANCHOR from the props' drawn pose (springs included): the tail's curl (real or tied-on), or
  // the FAKE part (the taped googly eye, else the paper hat's middle, else the tied-on tail's curl); false = no such part
  function anchorProp(fakeOnly) {
    let lx = 0, ly = 0, ang = P.rot;
    if (fakeOnly && gooP.on) { lx = gooP.px; ly = gooP.py; }
    else if (fakeOnly && hatP.on && hatP.fake) {
      const a = P.rot + hatP.base + hatP.dr, h = HAT_TOP.paper * sp.hatS * 0.45;
      lx = hatP.ax + hatP.ox + Math.sin(a) * h; ly = hatP.ay + hatP.oy - Math.cos(a) * h; ang = a;
    } else if (tailP.on && (tailP.fake || !fakeOnly)) {   // the curl's middle on the baked tail path (+ the real tail's ext)
      const e = tailP.fake ? 0 : TUNE.tail.ext, a = P.rot + tailP.base + tailP.dr + (tailP.fake ? 0 : P.wag);
      const cx = -14 + TAIL_UX * e, cy = -11 + TAIL_UY * e, cs = Math.cos(a), sn = Math.sin(a);
      lx = tailP.ax + tailP.ox + cx * cs - cy * sn; ly = tailP.ay + tailP.oy + cx * sn + cy * cs; ang = a;
    } else return fakeOnly ? anchorDeb() : false;
    ANCHOR.x = wX(lx + offX); ANCHOR.y = wY(ly + offY); ANCHOR.angle = ang * wf;
    return true;
  }
  // the FAKE part after it came off (the yeet's BUSTED rip, the sneak's flap, a rip: false yeet): the first costume debris
  // still alive (googly, else paper hat, else tied-on tail: spawn order), at its middle as drawn (pop scale included)
  function anchorDeb() {
    for (let i = 0; i < DEB.length; i++) {
      const d = DEB[i];
      if (!d.on || !(d.kind === DEB_GOO || d.kind === DEB_PAPER || d.kind === DEB_TAIL)) continue;
      let ox = 0, oy = 0;
      if (d.kind === DEB_PAPER) oy = -HAT_TOP.paper * sp.hatS * 0.45;
      else if (d.kind === DEB_TAIL) { ox = -14; oy = -11; }
      const cs = Math.cos(d.rot), sn = Math.sin(d.rot);
      const lx = d.x + (ox * cs - oy * sn) * d.sc, ly = d.y + (ox * sn + oy * cs) * d.sc;
      if (d.w && !d.wp) { ANCHOR.x = d.wx0 + lx * d.ws0 * d.wf0; ANCHOR.y = d.wy0 + ly * d.ws0; ANCHOR.angle = d.rot * d.wf0; }
      else { ANCHOR.x = wX(lx); ANCHOR.y = wY(ly); ANCHOR.angle = d.rot * wf; }
      return true;
    }
    return false;
  }
  const actor = {
    spec: spec,
    update: update,
    draw: drawActor,
    setState: setState,
    look(x, y) {
      if (x === null || x === undefined) hasLook = false;
      else { hasLook = true; lookX = x; lookY = y; }
      return actor;
    },
    // shapeshift into { attr: value }: wobble, squash, pop (new attribute + puff), then back to the loop state; cb(actor,
    // cancelled). A shift interrupted by setState / another mutate pops right away, so the attribute is never lost.
    mutate(attr, value, cb) {
      const fn = typeof cb === 'function' ? cb : null;
      wantSil = true;
      if (!S.sil && curBucket >= 0 && curGen === GEN) S.sil = silRec();   // bake the pop flash now, not at the pop
      setState('shift');
      if (state !== 'shift') {           // a cancelled callback re-routed the actor: apply the attribute without the show
        setAttr(spec, attr, value); layout();
        if (fn) fn(actor, true);
        return actor;
      }
      pend.attr = attr; pend.value = value; onDone = fn;
      return actor;
    },
    nudge(vx, vy) { swvx += (vx || 0); swvy += (vy || 0); return actor; },
    // the swipe preview while the player drags this guest: k in [-1, 1] (+ toward IN = hopeful, - toward OUT = worried,
    // 0 = released); call it every frame of the drag (e.g. drag offset / max offset). Eased inside (TUNE.lean.rate), so a
    // cancelled drag springs back to the plain face; reset by any state other than idle / wait (the verdict)
    lean(k) { leanTgt = k > 1 ? 1 : k < -1 ? -1 : (k > 0 || k < 0 ? k : 0); return actor; },
    setPatience(p) { patience = p > 0 ? (p < 1 ? p : 1) : 0; return actor; },
    // keep the eyes readable while they are being judged (the scene: the rope guest while the rule has an eyes clause):
    // blinks stop at TUNE.blink.steady lids, the pupils always show. Off by default
    steadyEyes(on) { steady = !!on; return actor; },
    get state() { return state; },
    get loopState() { return loopState; },
    get gone() { return gone; },
    get finished() { return vanish && nDeb === 0 && nFx === 0; },
    // how many FAKE parts the current yeet tore off (TUNE.rip; set by setState('yeet'), 0 in any other state or with
    // rip: false): the scene's cue for the BUSTED beat (sfx tear, the FAKE! tag riding anchor('fake'))
    get ripped() { return state === 'yeet' ? ripN : 0; },
    get busy() { return !LOOP[state]; },
    get instrument() { return inst && state === 'dance'; },
    // band outfit: equip('outfit.neon.blob' | 'neon' | '' to take it off); the actor re-bakes its layers on the next draw
    equip(id) {
      const th = outfitTheme(id);
      if (th !== spec.outfit) { spec.outfit = th; layout(); }
      return actor;
    },
    get outfit() { return spec.outfit; },
    get species() { return sp.name; },
    get patience() { return patience; },
    // {x, y, w, h} in local units relative to the feet at scale 1 (reused object: copy it if you keep it)
    // covers the silhouette with its back parts (horn, stump, knob, wing), hat, stalk eye, tail, taped googly and hanging arms
    bounds() {
      const ou = sp.outer, mg = sp.armL * 0.4;
      let top = ou[1], left = Math.min(ou[0], sp.arm[0] - sp.armW - mg), right = Math.max(ou[2], sp.arm[2] + sp.armW + mg);
      if (spec.outfit) {
        const F = OFIT[sp.name], H = F.hat;
        top = Math.min(top, spec.outfit === 'space' ? F.bub[1] - F.bub[3] - 16 : sp.hat[1] + H[1] - OHEAD_TOP[spec.outfit] * H[2]);
        const hw = spec.outfit === 'space' ? F.bub[2] + 4 : OHEAD_HALF[spec.outfit] * H[2] + 4, hx = spec.outfit === 'space' ? F.bub[0] : sp.hat[0] + H[0];
        left = Math.min(left, hx - hw) - 7; right = Math.max(right, hx + hw) + 7; top -= 8;   // + the dance's sway / skew on the bigger head pieces
        const O = OUT[spec.outfit];
        if (O.back === 'ring') { const R = F.ring, w = R[2] + R[4] + 2; left = Math.min(left, R[0] - w); right = Math.max(right, R[0] + w); }
        else if (O.back) {
          const C = F.cape, sw = (C[3] - C[1]) * 0.14, ew = O.back === 'cape' ? ermHalf(C[2]) + ERM_W * 0.5 + 2 : 0;
          left = Math.min(left, C[0] - C[4] - 2 - sw, C[0] - ew - sw); right = Math.max(right, C[0] + C[4] + 2 + sw, C[0] + ew + sw);
        }
        if (O.pad) {                   // shoulder pieces: their reach past each shoulder (pad scale), and up when the arms rise
          const ps = F.pad, out = OPAD_OUT[O.pad] * ps;
          left = Math.min(left, sp.arm[0] - out); right = Math.max(right, sp.arm[2] + out);
          top = Math.min(top, Math.min(sp.arm[1], sp.arm[3]) - sp.armUp - OPAD_UP[O.pad] * ps);
        }
        if (spec.outfit === 'spooky' && nEyes) {   // the bat mask's wing tips (see bakeOEyes)
          let a0 = 1e9, a1 = -1e9, ry = -1e9, rr = 0;
          for (let i = 0; i < nEyes; i++) { const e = EYES[i]; if (e.x - e.r < a0) a0 = e.x - e.r; if (e.x + e.r > a1) a1 = e.x + e.r; if (e.y > ry) ry = e.y; if (e.r > rr) rr = e.r; }
          left = Math.min(left, a0 - rr * 1.7 - 4); right = Math.max(right, a1 + rr * 1.7 + 4); top = Math.min(top, ry - rr * 2.05 - 4);
        }
      } else if (spec.hat !== 'none') top = Math.min(top, sp.hat[1] - HAT_TOP[spec.hat] * sp.hatS);
      else if (spec.fake.hat) top = Math.min(top, sp.hat[1] - HAT_TOP.paper * sp.hatS);
      if (spec.eyes === 3 && sp.stalk) {
        const a = sp.stalk[3], ex = sp.stalk[0] + Math.cos(a) * sp.stalk[2], ey = sp.stalk[1] + Math.sin(a) * sp.stalk[2];
        top = Math.min(top, ey - sp.r3 - 2); left = Math.min(left, ex - sp.r3 - 2);
      }
      if (spec.tail) left = Math.min(left, sp.tail[0] - 25 - TUNE.tail.ext);
      else if (spec.fake.tail) left = Math.min(left, sp.tailF[0] - 25);
      if (sp.shoe) right = Math.max(right, sp.feet[1] + 26);
      if (spec.fake.eyes) { right = Math.max(right, G.x + G.R + 2); left = Math.min(left, G.x - G.R - 2); top = Math.min(top, G.y - G.R * 1.5); }
      if (inst && state === 'dance') {   // band mode: the instrument (and the arms reaching it) widen the box
        const ex = TUNE.inst[sp.inst].ext;
        left = Math.min(left, ex[0]); top = Math.min(top, ex[1]); right = Math.max(right, ex[2]);
      }
      BOUNDS.x = left; BOUNDS.y = top; BOUNDS.w = right - left; BOUNDS.h = -top;
      return BOUNDS;
    },
    // world-space point of 'head' | 'face' | 'center' | 'feet' | 'handF' | 'handB' from the last draw (reused object
    // { x, y, angle }). The hands follow the full pose (lift, spin, sway, squash, shear, arm stretch, elbow): x / y = the
    // palm, angle = the forearm's direction in world space (rad, atan2 on screen axes: 0 = right, PI/2 = down; the flip is
    // applied), so a prop drawn with ctx.rotate(angle) lies along the forearm. Other anchors: angle = the body's tilt.
    anchor(name) {
      if (name === 'handF' || name === 'handB') {
        handLocal(name === 'handF' ? 1 : 0);
        poseXY(HP.x, HP.y);
        const vx = (HP.dx + P.skew * HP.dy) * P.sx, vy = HP.dy * P.sy;
        ANCHOR.x = wX(QX + offX); ANCHOR.y = wY(QY + offY);
        ANCHOR.angle = Math.atan2(vx * P.sn + vy * P.cs, (vx * P.cs - vy * P.sn) * wf);
        return ANCHOR;
      }
      if (name === 'tail' || name === 'fake') {
        if (anchorProp(name === 'fake')) return ANCHOR;
        name = name === 'fake' ? 'head' : 'center';
      }
      let lx = 0, ly = 0;
      if (name === 'head') { lx = sp.hat[0]; ly = sp.hat[1]; }
      else if (name === 'face') { lx = sp.face[0]; ly = sp.face[1]; }
      else if (name === 'center') { ly = -sp.h * 0.5; }
      else if (name === 'top') ly = actor.bounds().y;
      ANCHOR.x = wX(lx + offX); ANCHOR.y = wY(ly - (name === 'feet' ? 0 : P.lift) + offY);
      ANCHOR.angle = P.rot * wf;
      return ANCHOR;
    },
    // bake every sprite for a scale/dim ahead of time (avoids a first-draw hitch)
    prewarm(scale, dim) {
      refresh(dimLevel(clamp(dim || 0, 0, 1)), bucketFor(scale || 1));
      return actor;
    },
    reset() { restore(); setState('idle'); sqx = sqy = 1; sqvx = sqvy = 0; swx = swy = swvx = swvy = 0; return actor; },
    // debug/test read-out of the prop springs (reused object): angle lag (rad) and tip offset (units) per prop
    probe() {
      PROBE.hat = hatP.on ? hatP.dr : 0; PROBE.hatRaw = hatP.on ? hatP.delta : 0; PROBE.hatOff = hatP.on ? Math.hypot(hatP.px - hatP.tx, hatP.py - hatP.ty) : 0;
      PROBE.tail = tailP.on ? tailP.dr : 0; PROBE.eye = gooP.on ? Math.hypot(gooP.px - gooP.tx, gooP.py - gooP.ty) : stalkP.on ? Math.hypot(stalkP.px - stalkP.tx, stalkP.py - stalkP.ty) : 0;
      PROBE.pupilX = gpx; PROBE.pupilY = gpy; PROBE.debris = nDeb; PROBE.lift = P.lift; PROBE.rot = P.rot; PROBE.offX = offX; PROBE.offY = offY;
      PROBE.armB = P.armB; PROBE.armF = P.armF; PROBE.swayX = P.swayX; PROBE.mad = madK;
      PROBE.sx = P.sx; PROBE.sy = P.sy; PROBE.skew = P.skew; PROBE.armK = P.armKF > P.armKB ? P.armKF : P.armKB; PROBE.eB = P.eB; PROBE.eF = P.eF;
      PROBE.vx = launched ? yeetVX : 0; PROBE.vy = launched ? yeetVY : 0; PROBE.zs = 0; PROBE.steam = 0; PROBE.blink = blinkLid;
      PROBE.ripped = state === 'yeet' ? ripN : 0; PROBE.strips = 0;
      for (let i = 0; i < DEB.length; i++) if (DEB[i].on && DEB[i].kind === DEB_STRIP) PROBE.strips++;
      for (let i = 0; i < FX.length; i++) if (FX[i].on) { if (FX[i].kind === FX_Z) PROBE.zs++; else if (FX[i].kind === FX_STEAM) PROBE.steam++; }
      return PROBE;
    },
  };
  const PROBE = { hat: 0, hatRaw: 0, hatOff: 0, tail: 0, eye: 0, pupilX: 0, pupilY: 0, debris: 0, lift: 0, rot: 0, offX: 0, offY: 0, armB: 0, armF: 0, swayX: 0, mad: 0,
    sx: 1, sy: 1, skew: 0, armK: 1, eB: 0, eF: 0, vx: 0, vy: 0, zs: 0, steam: 0, blink: 0, ripped: 0, strips: 0 };
  layout();
  return actor;
}

// ------------------------------------------------------------------------------------------------ mini icons
const MINI = new WeakMap();
const MINI_KEYED = new Map();
const MINI_OPTS = { alpha: 1, dim: 0, flip: false, light: null };
const MINI_ACTOR = { fx: false, seed: 0, still: true };
function sameMini(r, s, size, dl) {
  const f = s.fake || NO;
  return r.size === size && r.dl === dl && r.gen === GEN && r.species === s.species && r.color === s.color && r.eyes === s.eyes &&
    r.hat === s.hat && r.tail === !!s.tail && r.pattern === s.pattern && r.fe === (f.eyes ? 1 : 0) && r.fh === !!f.hat && r.ft === !!f.tail &&
    r.outfit === outfitTheme(s.outfit);
}
// head-and-shoulders crop of a guest for tiny icons: a square around the face, from the hat (or head) top down to just
// under the mouth, wide enough for the eyes -> CROP { cx, cy, half } in local units
const CROP = { cx: 0, cy: 0, half: 1 };
function headCrop(s) {
  const p = SP[s.species] || SP.blob, M = TUNE.mini, f = s.fake || NO;
  const b = faceBox(p, s.eyes === 1 || s.eyes === 3 ? s.eyes : 2, false);
  let top = Math.min(b[1] - b[3], p.outer[1]);
  if (s.eyes === 3 && p.stalk) top = Math.min(top, p.stalk[1] + Math.sin(p.stalk[3]) * p.stalk[2] - p.r3);
  const ot = outfitTheme(s.outfit);
  if (ot) { const F = OFIT[s.species] || OFIT.blob, H = F.hat; top = Math.min(top, ot === 'space' ? F.bub[1] - F.bub[3] - 14 : p.hat[1] + H[1] - OHEAD_TOP[ot] * H[2]); }
  else if (s.hat !== 'none' && HAT_TOP[s.hat]) top = Math.min(top, p.hat[1] - HAT_TOP[s.hat] * p.hatS);
  else if (f.hat) top = Math.min(top, p.hat[1] - HAT_TOP.paper * p.hatS);
  const bot = Math.max(p.mouth[1] + M.below, b[1] + b[3] + 4), half = Math.max((bot - top) / 2, b[2] + M.pad) + 2;
  CROP.cx = Math.min(b[0], p.mouth[0]) + Math.abs(b[0] - p.mouth[0]) * 0.5; CROP.cy = (top + bot) / 2; CROP.half = half;
  return CROP;
}
function bakeMini(s, size, dl) {
  const a = createActor(finalSpec(s), MINI_ACTOR);     // the icon shows the FINAL state, never a shapeshifter's pre
  MINI_OPTS.dim = TUNE.dim.levels[dl];
  a.update(1 / 120);
  let sc, cx, fy;
  if (size < TUNE.mini.crop) {                         // tiny: head and shoulders, so eyes and hat stay readable
    const c = headCrop(s);
    sc = size * 0.5 / c.half; cx = size / 2 - c.cx * sc; fy = size / 2 - c.cy * sc;
  } else {
    const b = a.bounds();
    sc = Math.min(size * 0.84 / b.h, size * 0.9 / b.w); cx = size / 2 - (b.x + b.w / 2) * sc; fy = size / 2 + (b.h / 2) * sc;
  }
  const crop = size < TUNE.mini.crop;
  const cv = draw.bake(size, size, c => {
    a.draw(c, cx, fy, sc, MINI_OPTS);
    if (crop) {                                        // a bust: the cut at the bottom fades out instead of a hard edge
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = draw.gradient(c, 0, size * 0.8, 0, size, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
      c.fillRect(0, size * 0.8, size, size * 0.2);
      c.globalCompositeOperation = 'source-over';
    }
  });
  const f = s.fake || NO;
  MINI_OPTS.dim = 0;
  return { cv: cv, size: size, dl: dl, gen: GEN, species: s.species, color: s.color, eyes: s.eyes, hat: s.hat, tail: !!s.tail,
    pattern: s.pattern, fe: f.eyes ? 1 : 0, fh: !!f.hat, ft: !!f.tail, outfit: outfitTheme(s.outfit) };
}
// Static icon of a guest (band roster, share card): baked once per spec + size (+ dim), centred on (x, y) in a size x size
// box. dim (0..1, snapped to DIM_LEVELS): an OPAQUE shadowed icon (the queue's sink into the night indigo: darker, greyer,
// whites kept) for a guest that is "not here / not tonight": use it instead of globalAlpha, which shows the plate through
export function drawMini(ctx, spec, x, y, size, dim) {
  if (!spec || !(size > 0)) return;
  const dl = dim > 0 ? dimLevel(dim < 1 ? dim : 1) : 0;
  let r = MINI.get(spec);
  if (!r || !sameMini(r, spec, size, dl)) {
    const f = spec.fake || NO;
    const key = spec.species + spec.color + spec.eyes + spec.hat + (spec.tail ? 1 : 0) + spec.pattern + (f.eyes ? 1 : 0) + (f.hat ? 1 : 0) + (f.tail ? 1 : 0) + outfitTheme(spec.outfit) + '@' + size + 'd' + dl;
    r = MINI_KEYED.get(key);
    if (!r || r.gen !== GEN) {
      r = bakeMini(spec, size, dl);
      MINI_KEYED.delete(key); MINI_KEYED.set(key, r);
      if (MINI_KEYED.size > TUNE.cache.minis) MINI_KEYED.delete(MINI_KEYED.keys().next().value);
    }
    MINI.set(spec, r);
  }
  ctx.drawImage(r.cv, x - size / 2, y - size / 2, size, size);
}

// Bake one guest's sprites ahead of time so walking up the queue never bakes mid-walk. With scales.length === dims.length
// the pairs are the queue slots in walking order (far -> rope): each slot is baked plus every dim level crossed between
// two neighbouring slots (at the scale bucket in force there); otherwise every scale x dim. A shapeshifter (spec.pre) is
// baked in both its pre and its final state. Call it when a guest joins the queue (setup time, not per frame).
const WARM = { fx: false, seed: 0, still: true };
export function prewarm(spec, scales, dims) {
  if (!spec) return;
  const ss = scales || [1], ds = dims || [0];
  warm(createActor(spec, WARM), ss, ds, null);
  if (spec.pre) warm(createActor(finalSpec(spec), WARM), ss, ds, null);
}
// The same bakes as prewarm(), queued and spread over frames: each frame bakes (scale, dim) sets until TUNE.cache.warmMs is
// used (at least one set). Pumped by the first actor draw of each frame, or call prewarmPump(ms) yourself (e.g. during a
// loading beat). Jobs run in queue order, so queue guests in the order they will walk up.
const WQ = { jobs: [], i: 0, n: 0, last: -1e9 };
export function prewarmLater(spec, scales, dims) {
  if (!spec) return;
  const ss = scales || [1], ds = dims || [0];
  warm(createActor(spec, WARM), ss, ds, WQ);
  if (spec.pre) warm(createActor(finalSpec(spec), WARM), ss, ds, WQ);
}
export function prewarmPump(ms) { pumpWarm(true, ms); return WQ.n; }   // -> jobs still queued
function pumpWarm(force, ms) {
  if (WQ.i >= WQ.jobs.length) { WQ.n = 0; return; }
  const now = performance.now();
  if (!force && now - WQ.last < TUNE.cache.warmGapMs) return;      // once per frame, however many actors draw
  WQ.last = now;
  const budget = ms > 0 ? ms : TUNE.cache.warmMs, J = WQ.jobs;
  do {
    const j = J[WQ.i++];
    j.a.prewarm(j.s, j.d);
    j.a = null;
  } while (WQ.i < J.length && performance.now() - now < budget);
  if (WQ.i >= J.length) { J.length = 0; WQ.i = 0; }
  WQ.n = J.length - WQ.i;
}
function warmJob(a, s, d, q) {
  if (!q) { a.prewarm(s, d); return; }
  q.jobs.push({ a: a, s: s, d: d }); q.n = q.jobs.length - q.i;
}
function warm(a, ss, ds, q) {
  if (ss.length !== ds.length) { for (let i = 0; i < ss.length; i++) for (let j = 0; j < ds.length; j++) warmJob(a, ss[i], ds[j], q); return; }
  const L = TUNE.dim.levels;
  for (let i = 0; i < ss.length; i++) {
    warmJob(a, ss[i], ds[i], q);
    if (i === 0) continue;
    const d0 = ds[i - 1], d1 = ds[i], lo = d0 < d1 ? d0 : d1, hi = d0 < d1 ? d1 : d0;
    for (let l = 0; l < L.length; l++) {
      if (L[l] <= lo || L[l] >= hi) continue;
      const k = (L[l] - d0) / (d1 - d0);
      warmJob(a, lerp(ss[i - 1], ss[i], k), L[l], q);
    }
  }
}
export const PROP_SPRINGS = { real: TUNE.real, fake: TUNE.fake, fakeTail: TUNE.fakeTail, stalk: TUNE.stalk };
export const ACTOR_TUNE = TUNE;   // live-tuning hook for dev pages (mutate in place; never needed by scenes)
export const DIM_LEVELS = TUNE.dim.levels;
// sprite cache read-out (reused object): { count, mb, bytes, bakes (total ever), evicted }
export function actorCache() { CACHE.count = RECS.size; CACHE.mb = Math.round(CACHE.bytes / 10485.76) / 100; return CACHE; }
