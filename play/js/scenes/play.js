// play.js: the 'play' scene of Monster Bouncer (GAME-SPEC §1 loop, §4 layout, §6 animations, §7 audio / haptics). One night at
// the velvet rope: the night's rule poster first pops BIG at screen centre over a dimmed street (the clip hook: readable
// in the first second), holds, then flies to its nail on the door frame; guests shuffle up the queue one by one
// (world.slots 3 -> 0). The player swipes (right = IN toward the door, left = OUT; a short fast flick counts too) anywhere
// in the lower 60 % (not from the outer 12 units of the SCREEN, where the system back gesture lives), or presses an OUT /
// IN plate: a swipe or fast flick that starts on a plate counts by its WORLD direction (the thumb rests on the plates), a
// plain press commits when the finger lifts on that plate, a slide off that is no swipe cancels. While a swipe is live the
// rope guest leans after the thumb (Tinder-style follow + actor.lean: perks up / shrinks, a heart / sweat-drop emote
// popping in), the plate of that verdict glows and the street answers (toward IN the door cracks open: an amber slit +
// spill; toward OUT the velvet rope goes taut and hot); it springs back on a cancel and a committed drag carries into the
// admit / yeet. Every finger is its own touch (two thumbs resting on the plates is the normal grip): each commits on its
// own release, a second thumb never cancels the first, and a verdict or MISS makes every touch still down stale (it can
// never commit, not onto the next guest).
// SPEED BONUS: a patience gauge drains along the front of a ring on the cobbles around the rope guest's feet (drawn
// after the guest, so no wide body hides it): its gold end is the quick window, shrinking to nothing at the guest's quick
// PAR (an absolute skill window: ~1.4 s for one clause, + per clause / a trick guest), then cream, red at the end; a
// right call inside the par is QUICK: a small gold QUICK! sticker on the verdict stamp's corner, a gold flash ring +
// sparkles and a combo-pill kick (the streak counts real calls only; the night's quick calls go to the result, and a
// passing night with quick calls on half its timed guests earns the quick-call star). Stamps share ONE lane (one on show
// at a time, never over the guest at the rope or the poster card; one plate construction, three inks: green good,
// cream-on-velvet bad, brass info): NICE / BUSTED! / NICE CATCH! / OOPS / MISS just above the poster, a milestone 'xN' /
// NEW BEST at the party window, SHIFT! over a shifter (it waits for the stamp on show), NEW RULES on the poster's strings
// (while it is up a good stamp is skipped); each exits by scale. A correct call rings the combo ladder (x5 / x10 /
// x15... a big 'xN' at the window's centre with stars, a harder bloom, window confetti and a hotter band - only the stamp
// while a trick guest is next up; a broken streak of 5+ drops the brass combo pill grey with a thud). Catching a trick
// is its own beat: a trap liar bounced is BUSTED (on the yeet's launch frame its fake comes off with a tear, a paper
// puff and tape strips fluttering down, the FAKE! tag popping off the rip point), one let in is a NICE CATCH (FAKE!
// rides its fake part in), as is a verdict-flipping shapeshifter called right; each kicks the combo pill. An admit hops
// the rope, spins through the door and, as it vanishes inside, a
// sparkle comet flies to the party window where its dancer pops in with a note burst, an amber glass flash and its
// instrument's one-shot (party.sfx.join); a correct bounce is YEETED: 60 ms hit-stop, kick + punch + the launch hit
// (scheduled for the launch frame), a high spinning arc that leaves to the upper left (dimmed while it crosses the
// poster), a star + dust ping + twinkle where it leaves the screen; props it knocked off fade out. A WRONG admit is never
// staged like a right one: the impostor holds smugly at the rope (a snicker; the WHY ring and badge read on it), the door
// creaks open (no cheer, no amber flash, no starburst), it sneaks in (sly tiptoe, a wink, the costume flapping off) and
// as it lands the crowd groans, the lamp falls, a red flash; it costs a strike and the queue waits for it. A wrong bounce
// droops at the rope in tears (its hurt "a-aww"), then shuffles off left along the street, looking back at the door (the
// step-up waits for it; in the All-Nighter it is a strike too). Any wrong call shows WHY, one cause that never
// contradicts the caption (strings.failHint): a wrong admit pops the broken clause with a red-cross badge (the ring keeps
// its polarity colour) and rings the guest's part (a dashed outline where a missing hat / tail should be); a wrong bounce
// pops every clause green-checked; a trap liar gets a FAKE! tag on its fake prop (ringed) either way, a flipping
// shapeshift its changed part ringed. A guest left waiting yawns at 60 % patience and shuffles off at 100 % (MISS; in the
// All-Nighter every MISS and every wrong call is a strike: data's missStrike / bounceStrike; its HUD shows the best to
// beat as a ghost pill under the score, and passing it slams NEW BEST at the window with the gold stinger). Patience is
// the night's patienceMs plus TUNE.patBonus (clauses beyond the first, a trick guest, the first guest under a re-pinned
// rule). The queue moves fast (step-up 0.1 s after a verdict, walk 0.5 s, 0.4 s in flow at combo >= 5: ~0.6 s from a
// verdict to the next decision); a pick made while the next guest is already decidable (and has been in view: 0.3 s at
// slot 1, or a walker past 40 % of its walk) is buffered, the walker glances at the plate and the rest of its walk runs
// 2.5x, so it lands within ~150 ms; a double-tap (a touch begun within 0.25 REAL s of a verdict, the same way or on the
// same plate) is dropped; a pick the other way inside the first 0.15 REAL s after a verdict is held and applied when that
// guard runs out; one made too early (or for a glove tutorial guest) wiggles the plate. Shapeshifters change at slot 1 (a few small puffs, then the changed part is ringed in purple - the
// whole body for a colour / pattern - and its clause on the poster too); a rule mutation tears the poster down and the
// new one SLAMS in big at centre (~0.8 s, the clauses that changed ringed in rule amber) under a NEW RULES banner with
// the 'rules' stinger, then flies to the nail, where the changed clauses pop again and a small NEW RULES sticker rides
// the strings (a combo milestone due then waits for the landing). 0.2 s after the final verdict the night ends in LAST
// CALL (the camera dollies so the party window fills the frame edge to edge with the whole band in it, the poster fades,
// the plates drop away, the stamp hangs under the sill pulsing on the beat with a final milestone folded under it,
// confetti, band swell; world.celebrate(level)'s encore - the band jumps on a downbeat - is the hold's second beat and
// the result cuts in right after it; its size follows the tier: a perfect night stamps PERFECT NIGHT in gold with double
// confetti and the gold stinger, a night that did not pass ends muted - a cream stamp, no swell, no confetti, no encore,
// a quick cut) or, after 3 strikes with guests still waiting, SHUT DOWN (the window lights die left to
// right, then a cream-on-velvet stamp slams over the street, the door slams once the impostor is in, the band drags to a
// vinyl stop with a scratch, a CLOSED tape drops across the door, the queue trudges off one by one, no confetti); a 3rd
// strike on the final guest finishes the night as LAST CALL (hard door slam, tier capped at bronze). Then
// scenes.go('result') with no fade (an amber flash covers the switch, the camera eases home under the result). A fresh
// profile gets the glove tutorial on its first 3 guests in EVERY mode: night 1 teaches on its own guests, any other entry
// (Daily, All-Nighter, a link) first plays 3 practice guests (tutorial.js makePrelude: night 1's plain 'must have' rule,
// patience frozen, not counted; their dancers poof out of the window as the real poster pops) before the real poster's
// reveal; the swipe-demo glove always fits between the caption and the plates (it shrinks on 16:9 phones), and a hint
// glove draws over the caption band (a fake tail is pointed at from the side, never from below). Captions
// (tutorial, why a call was wrong - until the next decision opens, one-time hints: first red slash, first AND rule, first
// clause on a never-seen attribute, first liar, first shapeshifter - judged at the rope, its change replayed there) share
// one slot: the caption band above the plates, an indigo sticker pill with a brass rim. Under an eyes clause the judged
// guest keeps its eyes readable (actor.steadyEyes). A live daily confirms its counted attempt at enter
// (profile.startDaily). Left-hand mode swaps the plates only: swipes keep their world meaning. The scene auto-pauses when
// the page is hidden or loses focus mid-guest or mid-reveal (window blur / pagehide: notification shade, Control Center, a
// call banner) or the engine shows the rotate card (onInterrupt), and the browser / Android back gesture opens the pause
// overlay instead of leaving (a history entry is pushed while playing; a second back closes the overlay); from the final
// verdict / the 3rd strike on nothing pauses (the pause button fades out) until the result. Every cached string rebuilds
// when the language changes (i18n.onChange, mid-night too) and on resume. Game timing runs on dt / speed
// (window.__play.speed(k) multiplies every timing for bots); HUD springs on real dt. Nothing on the per-frame path
// allocates (pooled guest records and stamps, reused option objects, cached strings).
// BOOSTERS (docs/MONETIZATION.md §4, §11.5): on a story night (night >= 3 at or below the frontier, no friend's challenge,
// not practice; never the Daily or the All-Nighter: wallet.boostersOpen) a compact BOOSTER BAR of round sticker chips
// sits in the band between the caption slot and the OUT plate's top (the IN plate's in left-hand mode): thumb-reachable,
// never on a plate's tap area, the queue lane, the rope guest or the top-right facecam zone; it pops in once the night's
// poster has landed and drops away with the plates, its chips' feet at least 18 units above the plates (a hurried OUT
// swipe stays clear). Each chip is a brass coin with a cream face under a soft brass halo (it reads on the dark hedge)
// wearing the booster's ONE icon, the shop's sticker art (shop.js drawArt: X-Ray glasses, Slow-Mo snail, Second Chance
// heart, as on the shop cards and the lobby strip), and
// shows its count on a badge (X-Ray: a FREE ribbon on the coin's foot on a VIP day), its gem price when none is owned (the tap then holds the night and opens the buy sheet: the shop's booster sheet as a popup, scene
// 'shop' { popup, sheet: 'booster:<id>' }, else this scene's own sheet; bought, it is used at once), a glowing rim while
// active and a check once spent; at most one of each per run (wallet.useBooster; a Slow-Mo / Second Chance tapped in the
// bar arms this night's wallet.run first, as the home / result strip would have). X-RAY (from the first night with tricks): a neon-pink scan beam
// sweeps the street, then for the guest at the rope and the next 4 every taped-on fake part gets a pulsing FAKE-pink ring
// + a FAKE label (kept whole on screen) and a scan line runs over each of them, and a shapeshifter still in its old look shimmers (shift purple)
// until it changes. SLOW-MO (tapped, or armed before the night on home / result: then it starts with the first
// decision): patience x 1.5 for the rest of the night (the running guest's clock refunds), the QUICK par stays absolute,
// the patience ring turns ice-cyan with an hourglass on it, a cyan time ripple + a short real slow-motion dip. SECOND
// CHANCE (tapped with strikes on the board: one strike comes back at once; tapped clean, or armed before the night: it
// waits and catches the next strike): the strike lamp still breaks on the verdict, then relights (spring pop, amber
// burst, sparkles, a brass SAVED! sticker) when the impostor lands, and the room is spared the crash; the call still
// counts as wrong (Gold stays skill-only). BOSS, REOPEN! (the task's continue offer, wallet.reopenPrice): a story-night
// SHUT DOWN with guests still waiting holds at its stamp (lights out, CLOSED tape, the queue still in line) and a panel
// rises: the boss monster in a pinstripe suit peeks over the card rubbing its mitts (gem glints), the price ON the
// primary's face at its text size ('Reopen <gem> 30': 30 / 60 / 120 within a run, paid ones counted; the first one ever 'On the house!' with a big
// FREE sticker on the button's corner), Reopen and No thanks the same size, low in the thumb zone (the buttons where the
// plates' tops were), no countdown, a tap outside or the X declines; too few gems: the primary's face says 'Get gems'
// over '<gem> 60 · need N' (the price first, the shortfall on the button itself; a buy sheet's the same), the balance
// chip on the card's corner at a readable size, and 'Get gems' pushes the shop as a popup with its 'not enough gems' sheet
// ({ popup, sheet: 'nogems', need }: its Get gems opens the Gems tab); the panel re-reads the balance on return (the
// in-play buy sheet does the same). Reopen: the tape tears off, the door swings open with a cheer, the window lights come back right to left, the
// third strike lamp relights, WE'RE OPEN! slams at the window, the queue cheers, the camera eases home, the plates rise and
// the night goes on from the next guest with 2 strikes (a reopened night passes at Bronze at best, by arithmetic).
// Declined (wallet.reopenDeclined): the normal Shut Down plays on. The equipped cosmetics (wallet.look) reach the street
// at enter through world.setLook / party.setTheme and the plates' skin argument, when those exist. The wallet
// (js/game/economy.js) is imported lazily, so without it the scene plays as before (no bar, no Reopen). EVERY run calls
// wallet.startRun (the Daily, the All-Nighter, a challenge and practice too: it clears the home / result arming and
// retires the last story run's key; it opens only on a story night) and exit calls wallet.endRun. One-time
// hint 'boost': the first story night with a bar points the glove at it ('Boosters! Tap one for help').
// Usage: scenes.register('play', play); scenes.go('play', { mode: 'night'|'daily'|'endless', night, date, seed?, vs?,
// startedAt?, hints?: false, tutorial?: true|false }). Pushes scenes.push('pause', { from: 'play', mode, night, date, seed, vs }).
// The result params carry quick (right calls made inside the quick par), timed (guests judged on a running clock) and
// bonusStars (1 = the quick-call star, judged here) for profile.recordNight, and for wallet.onResult: busted (trap liars
// bounced right), shiftCaught (verdict-flipping shapeshifters called right), boosted (a booster or a Reopen was used:
// the share card says so), reopens, boostersUsed { xray, slowmo, second } and runKey; for the result's booster strip
// (Slow-Mo / Second Chance above Next Night / Again, MONETIZATION §4.2): boostOpen (boosters worked on this run) and
// boostHint ('second' after a Shut Down or when wrong admits struck, 'slowmo' when guests walked off as often, else '').
// Test hook: window.__play = { state(), decide('in'|'out'), choose(kind, t0?, plate?), speed(k), step(dt, n), renderOnce(), pause(on),
// drag(dx) (a held thumb dragged dx units; drag(null) lifts it), leavers() (guests in flight), stamps() (the stamp lane),
// tune, last, boost(id) (taps a booster chip), panel('yes' | 'no' | 'close') (answers the Reopen / buy panel), wallet(w) (a
// mock wallet for dev pages: the §11.3 subset this scene calls), look (the cosmetics it applied) }.
import { stage } from '../core/stage.js';
import { loop } from '../core/loop.js';
import { input } from '../core/input.js';
import { camera } from '../core/camera.js';
import { particles } from '../core/particles.js';
import { post } from '../core/post.js';
import { draw, color } from '../core/draw.js';
import { text } from '../core/text.js';
import { i18n } from '../core/i18n.js';
import { scenes } from '../core/scene.js';
import { tweens, tween } from '../core/tween.js';
import { clamp, lerp, smoothstep, easeIndex } from '../core/math.js';
import { makeNight, endlessGuest, endlessParams, ruleAt, tierFor, dailySeed, dailyNightNumber, todayKey, firstFail, isTrapFake, isFlipShift, SPECIES } from '../game/data.js';
import { createActor, prewarmLater, setBeat as setActorBeat } from '../game/actor.js';
import { createWorld, WORLD_TUNE } from '../game/world.js';
import { drawPoster, drawPlate, drawStrikeLamp, drawStampText, drawPill, drawIconButton, drawGlove, drawClauseIcon, posterMetrics, label,
  drawButton, drawBadge, drawGlyph } from '../game/icons.js';
import { party } from '../game/party.js';
import { profile } from '../game/profile.js';
import { failHint, pluralCat } from '../game/strings.js';
import { audio } from '../core/audio.js';
import { tutorialWord, captionKey, makePrelude, negClause, TUTORIAL } from '../game/tutorial.js';
import { DICT as BOOST_DICT } from '../game/strings-boosters.js';

// the wallet (js/game/economy.js, MONETIZATION §11.3) and the catalog's booster prices (js/game/catalog.js BOOSTERS), loaded
// lazily: a build without them still plays every night (no booster bar, no Reopen). A dev page can hand in a mock with
// window.__play.wallet(w) instead
let WAL = null, REAL_WAL = null, CAT = null, walletOff = null;
import('../game/economy.js').then(m => {
  REAL_WAL = m && m.wallet ? m.wallet : null;
  if (REAL_WAL && !WAL) useWallet(REAL_WAL);
  return import('../game/catalog.js').then(c => { CAT = c || null; });
}).catch(() => {});
// a booster has ONE icon everywhere: the shop's sticker art (js/scenes/shop.js drawArt: X-Ray = glasses, Slow-Mo = snail,
// Second Chance = heart), the same the shop cards, the lobby strip and the result use; loaded lazily like the wallet
let ART = null;
import('./shop.js').then(m => { ART = m && typeof m.drawArt === 'function' ? m.drawArt : null; }).catch(() => {});

const TUNE = {
  pool: 14,                                   // guest records (4 in line + leavers in flight)
  introAt: 0.2,                               // s: the first poster reveal
  firstWalkAt: 0.6,                           // s: guest 1 leaves the queue for the rope (walks during the reveal hold)
  walk: 0.5, flowWalk: 0.4, flowCombo: 5,     // s: queue -> rope (nightParams.walkMs wins), outCubic; flowWalk at combo >= flowCombo
  rush: 2.5,                                  // a buffered pick runs the rest of the walk this many times faster
  shuffle: 0.35, stagger: 0.06,               // the rest of the queue steps up (outBack, staggered)
  enterDur: 0.62, enterFrom: 74,              // a new guest walks into the last slot from off-screen left
  stepAt: 0.1,                                // s after a verdict: the queue advances (verdict -> next decision ~0.6 s)
  // REAL seconds (performance.now: hit-stop / slow-mo never stretch it) after a verdict before a pick for the NEXT guest is
  // buffered; a pick the OTHER way inside it is HELD and applied when it runs out (a touch that began before the verdict
  // never commits). A pick whose touch began within dblTap REAL s after a verdict, the same way or on the plate that gave
  // it, is a double-tap: dropped (the plate wiggles), never held or buffered onto the next guest. A walker takes a
  // buffered pick only once it stood at slot 1 for bufferSeen s before it set off, or is past bufferWalk of its walk
  bufferGuard: 0.15, dblTap: 0.25, bufferSeen: 0.3, bufferWalk: 0.4,
  // s after the final verdict until LAST CALL (no dead air: < 0.25); SHUT DOWN waits for the impostor's landing (endShut
  // after a 3rd wrong admit = its hold at the rope + hop, endShutMiss after an All-Nighter MISS / wrong bounce); a 3rd
  // wrong admit ON the final guest finishes the night (LAST CALL after the impostor lands: endShut, tier capped at bronze)
  endLast: 0.2, endShut: 0.75, endShutMiss: 0.25,
  yawnAt: 0.6,
  // the speed bonus: a RIGHT call within the guest's quick PAR of its decision opening is QUICK. par = base + clause x the
  // rule's clauses + trick for a liar / shapeshifter + repin for the first guest under a re-pinned rule (s of game time,
  // at most maxShare of its patience): a skill window, not a default (a reader taking 0.8 s + 0.38 s a clause + 0.65 s for
  // a trick + 0-0.5 s is quick on ~35-45 % of calls, a flat 1.2-1.8 s one on ~35 % of one-clause calls).
  // It pays a small gold QUICK! sticker on the verdict stamp's corner (sub size, at subDx x the stamp's half width and
  // subDy x its size, rotated subRot, subAt s after it), a gold flash ring + sparkles and a kick of the combo pill; the
  // combo counts real calls only. A passing night whose quick calls reach `star` of its timed guests earns the quick-call
  // star (result bonusStars). The ring: a dark track on the cobbles around the rope guest's feet (rx x ry ellipse at the
  // slot, w thick; its back half drawn behind the guest, the front half after it) carries the patience gauge along the
  // FRONT arc (wrap rad past each side), draining from its right end toward the left (the way a guest gives up): its
  // last quick share is gold and shrinks to nothing at the par, the rest cream, all red from lateAt. Frozen guests (glove
  // tutorial, a one-time hint, practice) show no ring and are never quick
  quick: { base: 1.05, clause: 0.36, trick: 0.6, repin: 0.5, maxShare: 0.55, star: 0.5, rx: 50, ry: 13, w: 5, dy: 2, wrap: 0.1, pop: 0.22,
    fade: 7, lateAt: 0.75, col: '#ffd23f', mid: '#fff4dc', late: '#ff4d5e', track: 'rgba(255,244,220,0.2)', glow: 0.35, sparks: 12,
    flash: 0.35, sub: 17, subDx: 0.86, subDy: -0.88, subRot: 0.18, subAt: 0.08 },
  // patience bonus (s) on top of the night's patienceMs: per clause beyond the first, for a liar / shapeshifter, and for
  // the first guest under a re-pinned rule (reading 3 pictograms + checking a taped part takes a human 2.5-3.5 s)
  patBonus: { clause: 0.5, trick: 0.6, repin: 1.2 },
  edge: 12,                                   // swipes starting this close to the screen edge are ignored (system back gesture)
  // queue rows: actor dim (snapped to actor TUNE.dim.levels) + a cool lamp rim per slot, so the rows separate
  queue: { dim: [0, 0.15, 0.3, 0.48], lamp: [0, 0.35, 0.45, 0.55] },
  shiftPop: 0.36,                             // s from the shapeshift start to its pop (smoke + sparkle)
  // the SHIFT! stamp sits `gap` units above the shifter's drawn top (never on its face), clear of the rope guest (ropePad)
  // and under the poster's foot; a replay at the rope (the first-shifter hint) only stamps again after `again` s
  shiftFx: { cy: 52, gap: 12, size: 22, life: 0.8, ropePad: 8, again: 1.2 },
  poster: { drop: 300, slam: 0.38, tear: 0.5, overlap: 0.08, k: 120, c: 4.5, kick: 2.2, trauma: 0.2, kickY: 7, ready: 0.75 },
  // the night's first poster (and the real one after a practice prelude) is the clip hook: it pops at screen centre at
  // `scale` x (outBack pop s, card centred at y x H), holds, then flies to its nail (inOutCubic fly s) and lands there
  reveal: { pop: 0.3, hold: 0.35, fly: 0.3, scale: 1.8, y: 0.47, dim: 0.42, glow: 250, glowA: 0.55, glowCol: '#ffb347', arc: 26, spin: 0.12 },
  // a mid-night rule change (re-pin): the new card SLAMS in at centre (from `from` x its big scale down to `scale` over
  // pop s, a camera hit as it lands), holds so its centre stay is pop + hold (~0.8 s), then flies to the nail; the clauses
  // that differ from the old card pulse in rule amber during the hold and pop again (staggered) when it lands
  repinReveal: { pop: 0.2, hold: 0.6, fly: 0.3, scale: 1.7, y: 0.47, dim: 0.42, glow: 250, glowA: 0.55, glowCol: '#ffb347', arc: 26, spin: 0,
    from: 1.55, trauma: 0.28, kickY: 6 },
  changed: { life: 0.6, stagger: 0.09, pop: 1.3, popTight: 1.14, glow: 40, hold: 0.55 },
  // a wrong call shakes the broken clause on the poster: amp units at hz, fading over the pop
  failShake: { amp: 5, hz: 26 },
  // NEW RULES: a re-pinned rule gets the centre reveal too, with a big banner stamp (size, rot) slammed `dy` units above the
  // big card's top edge as it pops (bannerAt s into the reveal); once it lands, a small sticker rides the string area
  // above the card's top-RIGHT corner (dx in from it, dy above: never over a clause, and off the yeet's exit path, which
  // leaves to the upper left) for life s; while it is live the lane is its own: NICE / BUSTED / a milestone's stamp is
  // skipped (the ding, the pill kick and the quick sparkle still land), OOPS / MISS still cut in. The banner shrinks away
  // (scale, never a held mid alpha) over the first `bannerOut` of the fly, the sticker pops in and punches out by scale
  newRules: { size: 15, rot: 0.26, dx: 24, dy: -30, life: 1.3, banner: 30, bannerRot: -0.06, bannerDy: 22, bannerAt: 0.08, bannerOut: 0.45 },
  // the admit flight (mirrors dev/world.html): crouch, hop over the rope to the threshold (x leads by `lead`), then IN
  // through the doorway (clipped by world.beginDoorway), shrinking; the door shuts closeAfter s after it is inside. A WRONG
  // admit first holds smugly at the rope for wrongHold s (the WHY ring and badge read on it), then sneaks in
  admit: { flyDelay: 0.06, hop: 0.36, lead: 2.4, inside: 0.32, arc: 30, deep: 22, flyScale: 0.55, inScale: 0.4, closeAfter: 0.02,
    flash: 0.16, flashMs: 160, free: 2.5, wrongHold: 0.3 },
  // the guest joins the band: as it steps through the doorway a sparkle comet flies from the door top to its dancer
  // (comet s, timed so the dancer pops in - world.admit's delay - the moment the guest vanishes inside), then a sparkle +
  // note burst there and an amber flash over the window glass (glass alpha, glassMs)
  join: { comet: 0.22, sparks: 3, glass: 0.3, glassMs: 170, notes: 3, noteLife: 0.95, noteRise: 52, noteSpread: 26, noteSize: 19, arc: 34 },
  // yeet: launch hit-stop + kick + punch + the launch hit (party.sfx.yeet scheduled on the verdict for the launch frame,
  // sfx.launch on that frame as a fallback); while it flies the draw anchor drifts drift u/s back toward the door for
  // driftDur s (the actor's throw minus this = a high arc that leaves to the upper left, past the queue, before it can
  // cross the poster band); the body shrinks to `shrink` over shrinkDur (going away), dims to overA while it is over the
  // poster card, and a twinkle star + a dust / star puff ping where it leaves the screen (pingLate: fallback). The launch
  // stars come off the flying body's trailing side (starDx, starDy), short-lived, never over the next rope guest's head
  // the debris a yeet knocks off (props bouncing on the street) fades out debrisAt .. debrisAt + debrisFade s after the
  // launch, so no crown / hat lies beside the next guest under a hat rule
  yeet: { dir: -1, launch: 0.09, hitstop: 60, kick: 10, kickY: -3, life: 3, punch: 1.03, punchMs: 120, shrink: 0.85, shrinkDur: 0.5,
    drift: 180, driftDur: 0.45, pingEdge: 4, pingLate: 0.8, pingIn: 16, overA: 0.3, overRate: 18, overPad: 10, starDx: 50, starDy: 20,
    pan: 0.4, debrisAt: 0.6, debrisFade: 0.3 },
  ping: { life: 0.6, size: 30 },
  // walk-offs (a MISS, the SHUT DOWN queue trudging off) head left and fade out (fadeA .. fadeB s); past slot 0 x - behind
  // they draw in the queue layer. A wrong BOUNCE is hurt: it droops at the rope for `droop` s (tears, the hurt "a-aww"),
  // then shuffles off LEFT along the street in front of the queue (sadVx, sadVy: never down over the caption / plates),
  // looking back over its shoulder at the door, and leaves the screen opaque (no fade: it walks out of frame)
  off: { vx: -140, vy: 22, grow: 0.0006, sadVx: -230, sadVy: 9, sadGrow: 0.03, droop: 0.45, aww: 0.12,
    fadeA: 0.5, fadeB: 0.9, behind: 60, trudgeVx: -95, trudgeVy: 8 },
  // beat = extra s before the queue steps up after a wrong admit (its smug hold + the window crash land first), sadBeat
  // after a wrong bounce (the droop + the first steps clear the rope first); a wrong admit's flash is red and lands with
  // the impostor (never the admit's amber)
  wrong: { trauma: 0.4, early: 0.1, detuneMs: 1200, chroma: 0.9, chromaMs: 170, softChroma: 0.45, softMs: 120, missTrauma: 0.25,
    beat: 0.5, sadBeat: 0.55, flash: '#ff4d5e', flashA: 0.14, flashMs: 160 },
  // FAKE! is a small brass-ink tag pinned on the liar's fake part (actor anchor 'fake', dy above it), never a second plate
  // beside the verdict stamp; it flashes in, rides the part for life s and punches out
  fakeTag: { size: 15, dy: -18, life: 1.0, out: 0.11, flash: 0.25, glow: 26 },
  // a RIGHT call on a trap liar is its own beat. BUSTED (bounced): on the yeet's launch frame the fake comes off (the tear
  // sfx, a paper puff, `tapes` tape strips fluttering down - w x h units, launched vy up / +-vx, gravity g, flutter hz,
  // life s - and a brass ring for ring s) and the FAKE! tag pops off the rip point (rise units up, outBack over pop s,
  // drifting drift u/s the way the prop falls) for tagLife s; the verdict stamp says BUSTED! (`size` over the NICE size).
  // NICE CATCH (a trap liar let in, a verdict-flipping shapeshifter called right): its stamp, the tag riding the fake part
  // in for tagLife s. Both kick the combo pill (kick) with sparkles
  bust: { size: 6, tagLife: 0.5, rise: 26, pop: 0.18, drift: 40, kick: 22, ring: 0.3, tapes: 2, tapeW: 15, tapeH: 5, tapeVy: [150, 210],
    tapeVx: 70, tapeG: 420, tapeLife: 0.75, flutter: 9 },
  // a wrong call: the broken clause pops on the poster (spring to pop x, capped at popTight when the badges sit close:
  // 3 clauses, or every clause popping, staggered by stagger s; red glow, shake) for life s, as a verdict-marked badge
  // (icons.js mark 'bad' / 'ok': the ring keeps its polarity colour, the verdict is the corner sticker); the guest's
  // offending part is ringed for ring s (a MISSING 'must have' part gets a dashed outline where it should be); the
  // caption slot says why (strings.failHint) for capLife s, or until the next guest's decision opens
  fail: { pop: 1.35, popTight: 1.12, pop2: 1.22, stagger: 0.06, life: 0.8, col: '#ff4d5e', glow: 42, ring: 1.0, ringR: 30, capLife: 1.5,
    dash: 7 },
  // a shapeshift's pop rings the part that changed (shift purple) for life s on the guest, `delay` s after the pop (the
  // new look reads first; a colour / pattern change rings the whole body), and pulses the matching clause on the poster
  shiftRing: { life: 0.75, glow: 36, delay: 0.15, body: 0.55 },
  // swipe: a drag of >= min units, or a flick of >= flickMin units released faster than flickV units/s (velocity older
  // than velStale s counts as 0); ratio = horizontal over vertical
  swipe: { zone: 0.4, min: 46, ratio: 1.2, flickMin: 24, flickV: 560, velStale: 0.1, nudge: 3.2, glowFull: 70 },
  // drag-follow: the rope guest slides k x the drag (clamped to max) and tilts rot rad per unit (to rotMax), springing
  // back on a cancel (sk / sc) and acting it out (actor.lean); emote = the sticker size of the hopeful heart / worried
  // sweat drop (popping in outBack). The street answers: toward IN the door cracks (an amber slit + spill, crackW units
  // wide at full drag), toward OUT the velvet rope goes taut (a hot rim along it, ropeA, ropeW)
  drag: { k: 0.35, max: 56, rot: 0.0018, rotMax: 0.16, sk: 420, sc: 18, emote: 26, emoteFull: 30, leaveDecay: 14,
    crackW: 14, crackA: 1, crackX: 0.035, crackTop: 0.045, spill: 0.85, ropeA: 1, ropeW: 6 },
  plate: { w: 174, h: 136, gapX: 21, bottom: 12, slop: 12, k: 620, c: 26, flash: 0.35, kick: 9, dimA: 0.42, dimRate: 9,
    deny: { dur: 0.32, amp: 5, hz: 3 } },
  // best = the All-Nighter's ghost pill under the score pill (the best to beat: trophy + n, dim), bestDy below the row;
  // passing it slams NEW BEST at the party window (the milestone path, mileStars[1]) and the ghost pops gold, then goes
  hud: { row: 32, pause: 44, pauseX: 38, pillX: 108, pillW: 82, pillH: 34, comboX: 182, comboW: 54, comboH: 32,
    lamps: [228, 252, 276], lamp: 24, hitR: 30, pop: 0.28, comboKick: 16, progKick: 8, lampK: 420, lampC: 13, lampPop: 1.9,
    lampFlashDecay: 3, quickKick: 26,
    best: { dy: 31, w: 70, h: 24, size: 14, a: 0.62, col: '#191645', gold: '#c98d2e', pop: 0.5 } },
  pauseOv: { dim: 0.62, y: 0.42, title: 46, pillDy: 64, pillW: 150, pillH: 44 },
  // the stamp LANE: one stamp on show at a time (NICE / QUICK! / OOPS / MISS just above the poster: dy from the nail, over
  // the window sill; a combo milestone / NEW BEST at the party window's centre; SHIFT! over the shifter), each a word on a
  // dark sticker plate (one construction: the ink is green = good, cream on velvet = bad, brass = info), never over the
  // guest at the rope or the poster card. A verdict stamp pops `delay` s after the verdict (the crouch frame reads first;
  // nice / stamp sfx are scheduled for that moment) with a punch (scale punch -> 1 over punchMs, outBack); it punches the
  // stamp on show out first (scale to 0 over `out` s, inBack) and appears when that is gone. An info stamp (SHIFT!) waits
  // until the one on show has had minHold s (dropped after maxWait). Every stamp exits by scale, never by a held alpha.
  // NICE grows grow units per combo step (to growMax steps)
  stamp: { size: 34, grow: 0.6, growMax: 10, small: 30, rise: 16, life: 0.7, delay: 0.05, dy: -18, punch: 1.35, punchMs: 70,
    out: 0.1, minHold: 0.32, maxWait: 1.0, plate: 'rgba(12,11,36,0.55)' },
  // combo: one step per right call (a quick one too: the streak counts real calls, so a clean 20-guest night reaches x20
  // and celebrates 3-4 times, in step with party.ladder's chord on every 5th); each milestone (x5 / x10 / x15 ...,
  // every bloomEvery) swaps NICE for a big 'xN' stamp (size by tier, at the
  // party window's centre: wy x its height, never below the sill) with sticker stars around it, the bloom kicks harder,
  // confetti blasts out of the window's lower corners on the BACK layer (never over the rope guest) and the band plays
  // hotter (party.intensity by tier); while a re-pinned rule reveals, the milestone's sights wait for its landing. From 10
  // on every NICE adds a small burst. A break from breakFrom+ drops the pill (dropY, dropRot, grey) with a low thud while it
  // fades over breakDur. The pill is brass (the §5 accent family), the streak in cream
  combo: { bloomEvery: 5, confettiFrom: 10, bloom: 0.32, bloomDecay: 1.6, mile: [34, 38, 42], mileStars: [3, 5, 7], wy: 0.45,
    mileBloom: [1, 1.25, 1.5], energy: [0, 0.45, 0.75, 1], breakFrom: 5, breakDur: 0.6, dropY: 18, dropRot: 0.3, grey: '#6e6a92' },
  // LAST CALL: the camera dollies into the party window so it fills the frame: the zoom is the largest (zoomMin ..
  // zoomMax) that keeps the band row across the screen (the stage dancers' extent around the window's centre with at
  // least bandKeep of each outer member, + bandPad; the window's middle bandW share when nobody plays yet) and the
  // window under fill x H, its middle brought to sy x H (its top never above safeTop + top: the HUD row);
  // the stamp (on a dark plate) hangs just under the sill (gap units under the zoomed window's bottom) and pulses `pulse` on
  // every beat of the party clock (a milestone on the final verdict rides under it as a small 'xN', sub); the poster
  // fades out over posterFade s and the plates + caption band drop away (plateOff units, inBack over plateMs). The hold's
  // second beat is world.celebrate(level)'s encore (the whole band jumps on a downbeat, beams sweep, confetti from the
  // arch): the result cuts in afterEncore s after it lands (toResult clamped to toMin .. toMax), with no fade (an amber
  // flash covers the switch, the camera eases home over backMs). The ending follows the night's tier (data.tierFor, as
  // the result will show it): GOLD = a PERFECT NIGHT stamp (goldSize at most, fitted to the screen with edge units
  // each side) as a solid gold medal plate (goldPlate, goldCol ink) with goldConf x the confetti, a gold sparkle crown, celebrate(3) and the gold stinger goldAt s in;
  // silver / bronze = the LAST CALL above (celebrate(2 / 1)); ROPE (did not pass) = muted: a smaller cream LAST CALL
  // stamp (ropeSize, ropePulse on the beat), no stinger swell, no confetti, no encore, a soft flash (ropeFlash), ropeBloom, the band at
  // its base energy, and the result after ropeTo s
  lastcall: { toResult: 2.2, toMin: 1.6, toMax: 2.7, afterEncore: 0.62, bloom: 0.42, flash: 0.75, flashMs: 240, trauma: 0.3, punch: 1.05,
    slamAt: 0.24, size: 58, y: 0.47, backMs: 300, zoomMin: 1.6, zoomMax: 2.3, fill: 0.6, bandPad: 0, bandKeep: 0.7, bandW: 0.66, top: 52, sy: 0.37, dollyMs: 600,
    pad: 20, gap: 58, pulse: 0.06, plate: 'rgba(12,11,36,0.62)', sub: 26, subDy: 66, posterFade: 0.15, plateOff: 220, plateMs: 250,
    cut: '#ffd9a0', cutA: 0.5, cutMs: 220, goldSize: 54, edge: 14, goldConf: 2, goldAt: 0.5, goldCol: '#5a2f00', goldPlate: '#ffd23f',
    ropeTo: 1.3, ropeSize: 46, ropePulse: 0.025, ropeFlash: 0.3, ropeBloom: 0.35 },
  // SHUT DOWN (3 strikes): a cream-on-velvet stamp slammed at rot over the street (y x H, stampAt s in: after most of the
  // lights-out sweep, so it never hides the window dying), trauma, a push toward the door, the window lights die one
  // column per `bulb` s (cols columns, dark alpha), the CLOSED tape drops across the door at tapeAt, and the queue trudges
  // off left one by one from the back (trudgeAt + k x trudgeGap s)
  shut: { col: '#fff4dc', plate: '#b3203a', rot: -0.2, trauma: 0.45, y: 0.64, size: 50, stampAt: 0.5, zoom: 1.12, fy: 0.45, sy: 0.42,
    bulb: 0.08, cols: 8, dark: 0.68, tapeAt: 0.32, tapeDrop: 0.28, tapeW: 1.5, tapeH: 22, tapeRot: -0.36, tape2Rot: 0.3, tapeText: 13,
    flash: '#4a0614', trudgeAt: 0.7, trudgeGap: 0.25 },
  glance: { min: 2.0, max: 3.8, hold: 0.7 },
  // captions (tutorial + hints): one slot, the caption band just above the plates (feet + dy, never closer than gap to the
  // plates), an indigo sticker pill with a brass rim, sized to its text (padX each side, minW .. maxW)
  cap: { dy: 30, gap: 8, h: 36, size: 17, padX: 22, minW: 150, maxW: 340, col: '#2a2760', rim: '#d9a441', rimW: 2.6, pop: 0.32,
    fadeIn: 5, fadeOut: 6, failText: '#ffc2ca' },
  tutorial: { guests: TUTORIAL.guests, period: 1.7, slide: 104, glove: 62, gloveDy: 40, gloveH: 0.98, gloveGap: 3, gloveMin: 44,
    glow: { col: '#ffd166', a: 0.22, amp: 0.12, hz: 5, r: 120, dy: 46 },
    tap: { dx: 0.17, dy: -0.1, rot: -0.5 } },  // guest 3: the glove taps the right plate's glyph (plate-size fractions), label clear
  // one-time hints for the first red slash / liar / shapeshifter: glove pointing at the slashed clause on the poster, the
  // fake part (a hat from the right above its brim; a tied-on tail from the LEFT side, level with its curl - tailPad units
  // outside it, tailUp above, the hand angled up and away so it never dips into the caption band; a googly from its
  // side) or at the shifter (from the right at the rope, down onto it in line). The hint glove draws over the caption.
  // 'and' (the first 2+ clause rule): the glove sweeps under the clause row (andHz sweeps / s); 'attr' (the first clause of
  // a never-seen attribute): the glove points at that clause like 'neg'. tail = per species where a tail sits relative to
  // the feet (the WHY ring of a MISSING tail)
  hint: { glove: 54, ease: 10, hatDx: 16, hatUp: 18, pad: 4, midY: 58, topDx: 6, rotR: -Math.PI / 2 + 0.28, rotL: Math.PI / 2 - 0.28,
    rotDown: Math.PI - 0.3, andHz: 0.55, rotTail: Math.PI / 2 + 0.22, tailPad: 15, tailUp: 3,
    tail: { blob: [-64, -22], tall: [-36, -12], round: [-46, 8], square: [-56, 8], bean: [-43, 8] }, negPad: 6 },
  scrim: { above: 74, into: 12, a0: 0.0, a1: 0.8, a2: 0.92, col: '12,11,36' },
  // the booster bar (MONETIZATION §4): chips of diameter `chip`, centres `gap` apart from x0 in from the screen edge (the
  // OUT plate's side; mirrored in left-hand mode: x0 = chip / 2 + 20, so the edge chip's rim sits 20 units in, clear of
  // the back-gesture strip), their centres dy above the plates' top (never on a plate, under the
  // caption slot on every height) and never closer than gapMin from a chip's foot to the plates (a hurried OUT swipe
  // stays clear); hit = touch radius, slop = how far a press may slide and still tap; they pop in (outBack, staggered)
  // appearAt s after the night's poster has landed. fromNight / xrayNight: where they work (wallet.boostersOpen /
  // boosterShown win when present). price = gem prices when catalog.js is not loaded. A chip is a brass coin (rim
  // gradient, ink outline) with a cream face behind the booster's icon (face = its cream, faceR = its radius inside the
  // rim) so the icon reads on the dark hedge; a soft brass halo (halo x its radius, haloA breathing by haloAmp at haloHz)
  // sits behind every live chip. art = the icon size on a chip (the shop's sticker art, as the lobby strip draws it).
  // badge = the count badge's diameter (its digit ~13 units); the VIP day's FREE ribbon (freeW x freeH, freeSize text)
  // rides the coin's foot (freeDy x its radius below the centre, the icon lifted artUp over it), inside the chip's own
  // silhouette, so it never pokes up into the corner planter's topiary / urn
  boost: { chip: 42, gap: 50, x0: 41, dy: 41, gapMin: 18, hit: 26, slop: 22, pop: 0.34, stagger: 0.07, appearAt: 0.15, fromNight: 3, xrayNight: 4,
    brass: [[0, '#fff0b8'], [0.38, '#ffd166'], [0.72, '#d9a441'], [1, '#9c6a1c']], face: '#fff4dc', faceR: 15.5, faceInk: 'rgba(122,78,14,0.45)',
    halo: 1.8, haloCol: '#ffd166', haloA: 0.36, haloAmp: 0.08, haloHz: 2.2, dim: 0.42, kick: 7, deny: 0.3, art: 27,
    badge: 24, freeW: 46, freeH: 18, freeSize: 12.5, freeDy: 0.76, artUp: 3,
    price: { xray: 25, slowmo: 20, second: 30 },
    // X-RAY: the next `guests` guests (the one at the rope first); col = the FAKE! neon pink: a ring of `ring` units
    // (x the guest's scale) pulsing at hz on every fake part, its glow, a FAKE label `label` units above the part (kept
    // labelPad in from the SCREEN's edges: the back of the queue stands at the left edge); a scan
    // line sweeps each X-rayed guest top to bottom every `scan` s (its band `band` units tall); the activation beam sweeps
    // the street from the poster's foot to the plates over `beam` s; shimmer = a not-yet-shifted shapeshifter's purple
    // dashed halo + a sparkle every `spark` s
    xray: { guests: 5, col: '#ff4fd8', glowCol: '#ff7ae2', ring: 17, hz: 3.2, glow: 30, label: 11, labelDy: 21, labelPad: 6, scan: 1.3, band: 14,
      beam: 0.45, spark: 0.32, shimmer: 0.62 },
    // SLOW-MO: patience x k for the rest of the night; mid = the ring's ice tint (the visible clock), glass = the ring's
    // glow, warp = the activation's real slow-motion dip (loop.slowmo scale, ms)
    slowmo: { k: 1.5, col: '#8fe8ff', mid: '#c9f6ff', track: 'rgba(143,232,255,0.3)', glow: 0.22, warp: 0.35, warpMs: 650, hour: 15 },
    // SECOND CHANCE: the lamp relight (pop from `from` on a spring kick, an amber burst for `burst` s), the SAVED! sticker
    second: { from: 0.25, kick: 16, burst: 0.55, size: 15, dy: 34 },
    // the boost toasts (X-RAY! / SLOW-MO! / READY! / SAVED!): a small stamp rising `rise` over life s, punching out
    toast: { size: 15, rise: 8, life: 0.9, out: 0.12 } },
  // BOSS, REOPEN! within a SHUT DOWN: the sequence holds at holdAt s (the stamp has landed, the queue is still in line);
  // the panel rises panelAt s later. A Reopen runs: the SHUT DOWN stamp punches out (stampOut), the CLOSED tape tears off
  // at tape (flying tapeVy up, tapeG gravity, spinning), the door opens + the cheer at door, the window lights come back
  // right to left from light (one column per `bulb` s), the 3rd lamp relights at lamp, WE'RE OPEN! at stamp (size, at the
  // window's centre), the queue cheers at cheer, the plates rise from plates (plateMs), the camera eases home over homeMs,
  // and the next guest steps up at done
  reopen: { holdAt: 0.62, panelAt: 0.12, stampOut: 0.12, tape: 0.05, tapeVy: 260, tapeVx: 140, tapeG: 900, tapeSpin: 7, door: 0.22,
    light: 0.26, bulb: 0.06, lamp: 0.34, stamp: 0.4, size: 36, cheer: 0.3, plates: 0.45, plateMs: 280, homeMs: 420, done: 1.0,
    flash: '#ffd9a0' },
  // the Reopen / buy panel (screen space): a w x h sticker card centred at y x H, low in the thumb zone (at 844 the
  // buttons sit in the band the plates left; its foot never under safeBottom + foot; the SHUT DOWN stamp it would cut
  // in half fades out under it while it is up and back in if it closes on a decline), dim
  // behind it; bw x bh buttons gap apart, by below the card's top; a paid Reopen's price sits ON the primary's face at its
  // text size ('Reopen <gem> 30': a faceGem-tall gem faceGap after the word, facePad in from each end, shrunk as one only
  // past that), the first free one keeps the label and wears
  // a freeW x freeH FREE sticker (freeSize text) on its corner; the boss bust (bossW wide) rises from behind the card over
  // pop s (outBack) and rubs its mitts at rub Hz; in / out = open / close s; art = the booster's icon size over a buy
  // sheet (x its pop scale); too few gems: the primary's face carries the shortfall in two lines, 'Get gems' over
  // '<gem> 30 · need 18' (needSize text, the price first, so 'Get gems' never hides what it costs; needGap between the
  // lines). The balance chip (balW x balH, balSize digits after a balGem gem) straddles the card's top-left corner
  panel: { w: 322, h: 228, y: 0.79, foot: 26, dim: 0.62, title: 21, titleY: 32, subY: 70, sub: 15, note: 12, bw: 134, bh: 54, gap: 16, by: 150, tagH: 26,
    faceGem: 19, faceGap: 5, facePad: 10, freeW: 72, freeH: 30, freeSize: 16, freeInk: '#1f7a43',
    art: 30, needSize: 15, needGap: 3, balW: 86, balH: 32, balGem: 20, balSize: 16,
    in: 0.26, out: 0.2, pop: 0.42, bossW: 150, bossUp: 96, rub: 3.1, glint: 0.42, col: '#221f5c', rim: '#d9a441', go: '#2fae5e',
    no: '#3a3680', cream: '#fff4dc', dimText: 'rgba(255,244,220,0.62)', gem: '#52d4ff' },
  // accents (GAME-SPEC §5): stamps use three inks on one plate: good = nice green, bad = cream on a velvet-red plate
  // (oopsPlate: OOPS / MISS), info = brass (FAKE! / SHIFT! / NEW RULES / xN / NEW BEST); the combo pill is brass with
  // cream text; gameplay colours (the red WHY ring, shift purple, rule amber) stay
  col: { nice: '#3ddc84', quick: '#5dff9e', oops: '#fff4dc', oopsPlate: '#b3203a', info: '#ffc233', shift: '#c08cff',
    rule: '#ffc233', last: '#ffc93c', combo: '#c98d2e', pillNight: '#221f5c' },
};

const M_LINE = 1, M_ADMIT = 2, M_YEET = 3, M_OFF = 4;
const PH_INTRO = 'intro', PH_WALK = 'walk', PH_DECIDE = 'decide', PH_RESOLVE = 'resolve', PH_LAST = 'lastcall', PH_OVER = 'over';
const HAPTIC_WRONG = [20, 30, 20], HAPTIC_SHUT = [30, 40, 70];
const FALLBACK = { miss: 'MISS', fake: 'FAKE!', shift: 'SHIFT!', rule_new: 'NEW RULES', pause: 'Paused', resume: 'Resume', combo_hot: 'ON FIRE',
  best_stamp: 'NEW BEST' };
const HINT_KEY = { neg: 'cap_neg', fake: 'cap_fake', shift: 'cap_shift', and: 'cap_and' };
const outCubic = easeIndex.outCubic, outBack = easeIndex.outBack, inOutSine = easeIndex.inOutSine, inOutCubic = easeIndex.inOutCubic;
const inBack = easeIndex.inBack;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- reused option objects + particle presets
const DO = { alpha: 1, dim: 0, flip: false, light: { door: 0, lamp: 0 } };   // actor draw options
const PO = { scale: 1, alpha: 1, swing: 1, rot: 0, tear: 0 };                 // poster options
const PILL = { color: TUNE.col.pillNight, icon: 'moon', alpha: 1 };
const PILL_COMBO = { color: TUNE.col.combo, textColor: '#fff4dc', icon: '', size: 19, alpha: 1 };
const PILL_CAP = { color: TUNE.cap.col, icon: '', size: TUNE.cap.size, alpha: 1 };
const PILL_BEST = { color: TUNE.hud.best.col, textColor: '#e9e4ff', icon: 'trophy', size: TUNE.hud.best.size, alpha: 1 };
const BTN = { press: 0, alpha: 1 };
const GLOVE = { rot: 0, alpha: 1, press: 0, tap: false };
const GLOVE_TAP = { rot: 0, alpha: 1 };                                       // no press: the glove's own tap loop
const YEET_L = { dir: -1 }, YEET_R = { dir: 1 };
const SAD_WALK = { walk: true }, SAD_STAND = { walk: false }, SNEAK = { sneak: true };
const PULSE_WRONG = { chroma: TUNE.wrong.chroma, ms: TUNE.wrong.chromaMs };
const PULSE_SOFT = { chroma: TUNE.wrong.softChroma, ms: TUNE.wrong.softMs };
const BLOOM = { bloom: 0.45 };
const SPR = { scale: 1, rot: 0, alpha: 1 };
const DOLLY = { x: 0, y: 0, zoom: 1 };
const DOLLY_IN = { dur: 600, ease: inOutSine }, DOLLY_OUT = { dur: 300, ease: inOutSine };
const OV_DUST = { count: 8 };
const OV_STARS = { count: 6 };
const OV_STARS_YEET = { count: 3, life: [0.35, 0.55], glow: false, speed: [10, 60] };   // off the flying body, short-lived
const OV_SPARK = { count: 10, spawnRadius: 18 };
const OV_SHIFT_SPARK = { count: 6, spawnRadius: 16 };
const OV_SMOKE = { count: 4, layer: 'front', size: [8, 20] };         // a few small puffs: the new look reads through them
const OV_QUICK = { count: TUNE.quick.sparks, spawnRadius: 30 };
const OV_QUICK_PILL = { count: 6, spawnRadius: 12 };
const OV_BUST_PAPER = { count: 12, speed: [60, 190] };                  // the rip's paper puff
const OV_BUST_SPARK = { count: 8, spawnRadius: 10 };
const OV_CATCH_PILL = { count: 8, spawnRadius: 14 };
const DASH = [TUNE.fail.dash, TUNE.fail.dash * 0.8], NO_DASH = [];
const OV_CONF_BIG = { count: 22, speed: [240, 520], layer: 'back' };     // LAST CALL: behind the poster + stamp (never speckles them)
const OV_CONF_COMBO = { count: 9, speed: [180, 380], layer: 'back' };
const OV_CONF_MILE = [{ count: 16, speed: [220, 460], layer: 'back' }, { count: 26, speed: [250, 520], layer: 'back' },
  { count: 36, speed: [270, 580], layer: 'back' }];
const OV_MILE_STARS = TUNE.combo.mileStars.map((n, i) => ({ count: n, spawnRadius: 30 + i * 6 }));
const OV_PING_DUST = { count: 7 };
const OV_REVEAL_RING = { size: [30, 230], life: 0.45, layer: 'front' };
const OV_POOF = { count: 4, size: [8, 22], layer: 'front' };
const OV_PING_STARS = { count: 4, spawnRadius: 8 };
const BREAK_THUD = { vol: 0.55 };
const OV_RING = { size: [6, 70], life: 0.4 };
const OV_COMET = { count: TUNE.join.sparks, spawnRadius: 4, speed: [10, 40] };
const OV_JOIN = { count: 12, spawnRadius: 10 };
const OV_PING = { count: 7, spawnRadius: 6 };
const OV_PING_RING = { size: [4, 46], life: 0.35 };
const OV_BULB = { count: 3, spawnRadius: 4 };
const OV_SLAM = { count: 14 };
const SCALES = [1, 1, 1, 1], DIMS = TUNE.queue.dim;
const NOTE_KEYS = ['play-note-0', 'play-note-1', 'play-note-2'], NOTE_COLS = ['#ffd166', '#fff4d6', '#ff8fc8'];
const NOTE_BAKES = NOTE_COLS.map(col => c => paintNote(c, col));     // one bake function per note colour (built once)

particles.define('playShards', {
  count: 12, speed: [70, 240], life: [0.45, 0.85], size: [5, 3], sizeJitter: 0.4, colors: ['#ffe08a', '#ffb347', '#ffffff', '#f2861e'],
  shape: 'tri', gravity: 640, drag: 1.2, spin: [-12, 12], rot: 'random', alphaCurve: 'fadeLate', layer: 'front',
});
particles.define('playKick', {
  count: 10, speed: [60, 190], angle: -Math.PI / 2, spread: 2.2, life: [0.35, 0.6], size: [7, 16], sizeJitter: 0.35,
  colors: ['#c9c3ea', '#9e97c9', '#e6e1fa'], shape: 'blob', alpha: [0.4, 0.6], alphaCurve: 'soft', drag: 4.5, gravity: -20, layer: 'front',
});
particles.define('playPaper', {
  count: 9, speed: [40, 150], angle: -Math.PI / 2, spread: 2.6, life: [0.5, 0.9], size: [4, 2], sizeJitter: 0.4,
  colors: ['#f8eed6', '#efe2c4', '#d9a441'], shape: 'rect', gravity: 260, drag: 2, spin: [-8, 8], rot: 'random', alphaCurve: 'fadeLate', layer: 'front',
});

// ---------------------------------------------------------------- state
function spring(x, k, c) { return { x: x, v: 0, to: x, k: k, c: c }; }
function stepSpring(s, dt) {
  let n = Math.ceil(dt * 240);
  if (n < 1) n = 1; else if (n > 12) n = 12;
  const h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (s.k * (s.to - s.x) - s.c * s.v) * h; s.x += s.v * h; }
}
function newRec() {
  return { on: false, g: null, a: null, idx: -1, mode: 0, x: 0, y: 0, s: 1, dim: 0, flip: false, rot: 0, practice: false,
    fx: 0, fy: 0, fs: 1, fdim: 0, slot: -1, mt: 0, md: 1, ease: outCubic, moving: false, walkSet: false,
    shifted: true, popT: -1, t: 0, x0: 0, y0: 0, s0: 1, inside: false, joined: false, landed: false, ok: false, dir: 1,
    launched: false, pinged: false, vx: 0, vy: 0, closeT: -1, glance: 0, glancing: false, alpha: 1, sad: false, over: 1, leaveAt: -1,
    sneaking: true, shiftStampT: -9, s1T: -1, seen: 0, saved: false };
}
// s1T = game time it came to a stand at slot 1 (-1 = not there), seen = how long it stood there before it set off for the
// rope (a buffered pick only lands on a walker the player has had time to look at)
const POOL = [];
for (let i = 0; i < TUNE.pool; i++) POOL.push(newRec());
const line = [null, null, null, null];        // line[0] = at / heading to the rope, 1..3 = the queue
const SORT = [];                              // reused draw-order buffer
// the stamp lane: v = a verdict-class stamp (cuts the one on show), plate = its fill ('' = default), t < 0 = waiting
// (delay / queued behind the one on show: waited s so far), out = its punch-out clock (-1 = none), rec = the guest a
// SHIFT! labels (placed over it when it shows), sub = a small sticker on its corner (QUICK!: subCol ink, at subDx / subDy)
const STAMPS = [];
for (let i = 0; i < 6; i++) {
  STAMPS.push({ on: false, v: false, word: '', x: 0, y: 0, size: 40, col: '#fff', t: 0, life: 1, rise: 30, plate: '', punch: 1, out: -1,
    waited: 0, rec: null, sub: '', subCol: '', subDx: 0, subDy: 0 });
}
const PINGS = [];
for (let i = 0; i < 3; i++) PINGS.push({ on: false, x: 0, y: 0, t: 0, spin: 1 });
const NOTES = [];
for (let i = 0; i < 9; i++) NOTES.push({ on: false, x: 0, y: 0, vx: 0, t: 0, k: 0, wob: 0 });

// the poster: slamT = clock of the current slam (or centre reveal when reveal), tearT = the old one tearing down; mut = a
// mid-night rule change (the reveal carries the NEW RULES banner)
// chg = bit i set: clause i of the new rule is not on the old card (pulsed in rule amber); chgT = the landing pops' clock
const PS = { old: null, slamT: -9, tearT: -1, landed: false, settled: false, repin: false, reveal: false, clearBand: false, mut: false,
  rot: spring(0, TUNE.poster.k, TUNE.poster.c), chg: 0, chgT: 9, slammed: false };
const RV = { x: 0, y: 0, k: 1, glow: 0, rot: 0, a: 1 };             // the poster pose this frame (nail x, y, scale factor, angle, alpha)
const PRESS = [spring(0, TUNE.plate.k, TUNE.plate.c), spring(0, TUNE.plate.k, TUNE.plate.c)];   // 0 = OUT, 1 = IN
const PFLASH = [0, 0], DENY = [0, 0];
const LAMPS = [spring(1, TUNE.hud.lampK, TUNE.hud.lampC), spring(1, TUNE.hud.lampK, TUNE.hud.lampC), spring(1, TUNE.hud.lampK, TUNE.hud.lampC)];
const LFLASH = [0, 0, 0];
const COMBO = spring(0, 380, 15), PROG = spring(0, 380, 15), PAUSE = spring(0, 600, 30);
const DRAG = spring(0, TUNE.drag.sk, TUNE.drag.sc);                  // the rope guest's drag-follow offset (units)
// the touches in progress, one record per pointer (two thumbs resting on the plates is the normal grip): plate = the
// plate it STARTED on (-1 = a swipe), onPlate = still on it, swipe = a plate touch that turned into a swipe (dragged past
// swipe.min); vx / vT = its latest drag velocity (units/s) and when it was read (ms); t0 = when it went down
// (performance.now ms); seq = the order they went down (the newest live swipe drives the drag-follow); stale = a verdict /
// MISS landed while it was down: it can never commit. Each touch commits on its own release; the verdict makes every
// other touch stale, so a thumb resting on a plate never commits after another finger's swipe decided
function newTouch() {
  return { id: -1, x0: 0, y0: 0, x: 0, y: 0, zone: false, plate: -1, onPlate: false, swipe: false, pause: false, vx: 0, vT: 0, t0: 0,
    stale: false, seq: 0, chip: null };
}
const TOUCHES = [newTouch(), newTouch(), newTouch()];
let touchSeq = 0;
// a pick (the other way) that arrived inside the real-time buffer guard: applied (kind; t0 = its touch's start, plate =
// the plate it began on) when the guard runs out at `at` (performance.now ms)
const HELD = { kind: '', at: 0, t0: 0, plate: -1 };
// the patience ring under the rope guest: a = its fade, pop = its pop-in clock, pat = the patience it shows (kept through
// the fade-out), q = the guest's quick par as a share of its patience, flash = the QUICK flash
const RING = { a: 0, pop: 9, pat: 0, q: 0, flash: 0, on: false };
// the FAKE! tag on a liar's fake part: rec = the guest (its anchor 'fake' while it has one), (x, y) = the last spot, t =
// clock, life = how long it rides; bust = pinned where a BUSTED liar's fake came off (bx, by, bs = that spot and the
// guest's scale, dir = the way the prop falls) instead of riding the guest
const FTAG = { rec: null, x: 0, y: 0, t: 9, word: '', life: 1, bust: false, bx: 0, by: 0, bs: 1, dir: -1 };
// a BUSTED liar whose fake comes off on its yeet's launch frame (rec; null = none)
const BUST = { rec: null };
// the tape strips fluttering down off a ripped fake
const TAPES = [];
for (let i = 0; i < 3; i++) TAPES.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, ph: 0, s: 1, rot: 0 });
// the one-time hint: rec = the guest it is about (null = none), kind 'neg' | 'and' | 'attr' | 'fake' | 'shift', a = fade,
// (gx, gy, rot) = the glove, ci = the clause it points at ('attr'), seen = the profile flag it sets once judged
const HINT = { rec: null, kind: '', str: '', w: 200, t: 0, a: 0, gx: 0, gy: 0, rot: 0, snap: true, ci: -1, attr: '', seen: '' };
const SEEN_ATTR = { color: 'attr_color', eyes: 'attr_eyes', hat: 'attr_hat', tail: 'attr_tail', pattern: 'attr_pattern' };
const NEW_KEY = { color: 'cap_new_color', eyes: 'cap_new_eyes', hat: 'cap_new_hat', tail: 'cap_new_tail', pattern: 'cap_new_pattern' };
const HT = { x: 0, y: 0, rot: 0 };
const TUT = { idx: -1, cap: '', w: 200, icon: '' };                  // cached tutorial caption (rebuilt per guest / resume)
const BAND = {};                                                     // species -> the last guest of it admitted correctly
const XY = { x: 0, y: 0 };                                           // reused point
// the wrong-call lesson: the poster clause (rule, ci) pops for fail.life s; the guest's part (rec, part) is ringed (a
// dashed outline when `missing`: a 'must have' part it does not have); the caption slot shows why (str, w) for
// fail.capLife s (ct)
const FAIL = { rule: null, ci: -1, t: 9, rec: null, part: '', rt: 9, str: '', w: 200, ct: 9, admit: false, g: null, missing: false, fake: false };
// a shapeshift's pop: the changed part (rec, part) is ringed in shift purple for shiftRing.life s (t; < 0 = waiting)
const SHR = { rec: null, part: '', t: 9 };
// the combo pill's break (from breakFrom+): t = clock (>= breakDur: off); last = the streak it keeps showing as it drops
const BRK = { t: 9, last: '' };
const NEWR = { t: 9, word: '', out: -1 };                            // the NEW RULES corner sticker (t = its clock, out = punch-out)
const MILE_WORDS = {};                                               // 'x5', 'x10'... built once per milestone
// a milestone whose sights wait for a re-pinned rule's landing: k = tier (-1 none), n = the combo it showed
const MILE = { k: -1, n: 0, last: -1 };
// the joined guest's comet + note burst: d = its dancer record, sp = its species, (x0, y0) = the door top, t = clock, hit = burst fired
const JOIN = { d: null, sp: '', x0: 0, y0: 0, t: 0, hit: true, glass: 0 };
// LAST CALL / SHUT DOWN: the screen-space stamp (+ a folded-in milestone 'xN' under it: sub), the lights-out sweep and the
// CLOSED tape; hard = the door slams hard (an impostor got in on the final guest); tier = the night's tier (its ending),
// goldAt = when a perfect night's gold stinger rings (s into LAST CALL, -1 = none / done)
const LC = { on: false, shut: false, word: '', col: '#fff', plate: '', t: 0, rot: 0, size: 58, bulbs: 0, tapeKey: '', tapeW: 0, sub: '', hard: false,
  tier: '', goldAt: -1 };

let world = null, night = null, rule = null;
let mode = 'night', nightN = 1, dateKey = '', seed = 0, total = 0, endless = false, startedAt = 0;
let pre = 0, preRule = null, preGuests = null;                       // the practice prelude (fresh profiles outside night 1)
let phase = PH_OVER, t = 0, gt = 0, speedK = 1, paused = false, active = false, hintsOn = true;
let nextIdx = 0, frontIdx = -1, pat = 0, patSec = 7, yawned = false, pending = '', stepT = -1, endT = -1, lcT = -1, slamDoorT = -1;
let verdictAt = -9, shutOut = false, lateStrike = false, plateOffT = -1, pauseA = 1, repinBonus = false;
let correct = 0, strikes = 0, combo = 0, comboMax = 0, resolved = 0, bounced = 0, letIn = 0, missed = 0, wrongAdmits = 0, wrongBounces = 0;
const admitted = {};
let walkSec = TUNE.walk, tutorial = false, tutT = 0, baseBloom = 0.45, bloomK = 0, lcBloom = 0, comboA = 0, lastBloom = -1, plateA = 1;
let progStr = '', comboStr = '', progN = -2, comboN = -1, scrimG = null, scrimH = 0, capA = 0, capT = 0, capStr = '', capW = 200, capIcon = '';
let lastParams = null, resultParams = null, leftAt = -1e9, historyOn = false, leanK = 0, energyTier = -1;
// verdictMs = the last verdict / MISS (performance.now ms: the buffer guard), verdictKind / verdictPlate = which way it
// went and the plate that gave it ('' / -1: a MISS, a swipe or a key), quickN = quick calls tonight, timedN = guests
// judged on a running clock tonight (the quick-call star's base), quickQ = the rope guest's quick par as a share of its
// patience, lcTo = the LAST CALL hold (s, from the encore), shiftPopAt = game time of the last shapeshift pop
let verdictMs = -1e9, verdictKind = '', verdictPlate = -1, quickN = 0, timedN = 0, quickQ = 0, lcTo = 2.2, shiftPopAt = -9;
let missStrike = 0, bounceStrike = 0, pendingPlate = -1;
// the All-Nighter's best to beat (profile.endlessBest at the start), its ghost pill string, passed = NEW BEST shown
let bestN = 0, bestStr = '', bestPassed = false, bestT = 9;

function resetCounters() {
  correct = 0; strikes = 0; combo = 0; comboMax = 0; resolved = 0; bounced = 0; letIn = 0; missed = 0; wrongAdmits = 0; wrongBounces = 0;
  quickN = 0; timedN = 0;
  for (let i = 0; i < SPECIES.length; i++) { admitted[SPECIES[i]] = 0; BAND[SPECIES[i]] = null; }
}
function word(key) {
  if (i18n.has(key)) return i18n.t(key);
  const f = FALLBACK[key];
  return f !== undefined ? f : label(key);
}
function hashNight(n) {
  const s = 'mbouncer-night:' + n;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function leftMode() { const s = profile.settings; return !!(s && s.left); }
function beatFn() { const c = party.clock(); return c.playing ? c.pos / 4 : -1; }
function nowMs() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
// caption pill width for a string (measured once when the caption changes)
function capWidth(str) {
  const C = TUNE.cap;
  const w = text.measure(stage.ctx, str, C.size, 800, 'Baloo 2') + C.padX * 2;
  return clamp(Math.ceil(w), C.minW, C.maxW);
}

// ---------------------------------------------------------------- guest records
function takeRec() {
  for (let i = 0; i < POOL.length; i++) if (!POOL[i].on) return POOL[i];
  for (let i = 0; i < POOL.length; i++) if (POOL[i].mode === M_YEET || POOL[i].mode === M_OFF) { freeRec(POOL[i]); return POOL[i]; }
  return null;
}
function freeRec(r) {
  r.on = false; r.a = null; r.g = null; r.mode = 0; r.idx = -1;
  if (HINT.rec === r) HINT.rec = null;
  if (FAIL.rec === r) FAIL.rec = null;
  if (SHR.rec === r) SHR.rec = null;
  if (FTAG.rec === r) FTAG.rec = null;
  if (BUST.rec === r) BUST.rec = null;
  for (let i = 0; i < STAMPS.length; i++) if (STAMPS[i].rec === r) STAMPS[i].rec = null;
}
// queue index i: the practice prelude first, then the night (or the endless stream)
function guestAt(i) {
  if (i < pre) return preGuests[i];
  const j = i - pre;
  if (endless) return endlessGuest(night, j);
  return j < total ? night.guests[j] : null;
}
function ruleFor(i) { return i < pre ? preRule : ruleAt(night, i - pre); }
function queueLen() { return pre + total; }
function spawn(i) {
  const g = guestAt(i);
  if (!g) return null;
  const r = takeRec();
  if (!r) return null;
  const G = TUNE.glance;
  r.on = true; r.g = g; r.idx = i; r.a = createActor(g); r.mode = M_LINE; r.flip = false; r.rot = 0; r.practice = i < pre;
  r.shifted = !(g.shift && g.pre); r.popT = -1; r.moving = false; r.glance = G.min + Math.random() * (G.max - G.min); r.glancing = false;
  r.closeT = -1; r.joined = false; r.landed = false; r.inside = false; r.launched = false; r.pinged = false; r.alpha = 1;
  r.sad = false; r.over = 1; r.leaveAt = -1; r.sneaking = true; r.shiftStampT = -9; r.s1T = -1; r.seen = 0; r.saved = false;
  prewarmLater(g, SCALES, DIMS);
  return r;
}
function place(r, k) {
  const S = world.slots[k];
  r.x = S.x; r.y = S.feetY; r.s = S.scale; r.dim = DIMS[k]; r.slot = k; r.moving = false; r.s1T = k === 1 ? gt : -1;
  r.a.setState(k === 0 ? 'wait' : 'idle');
}
function moveTo(r, k, dur, delayS, ease) {
  if (k === 0) r.seen = r.slot === 1 && !r.moving && r.s1T >= 0 ? gt - r.s1T : 0;   // how long it stood at slot 1 in view
  r.s1T = -1;
  r.fx = r.x; r.fy = r.y; r.fs = r.s; r.fdim = r.dim; r.slot = k; r.mt = -delayS; r.md = dur; r.ease = ease; r.moving = true;
  r.walkSet = false;
  if (k === 0 && !r.shifted) {            // never reached slot 1 (a fast bot): the shift pops in at once
    r.shifted = true;
    r.a.mutate(r.g.shift.attr, r.g.shift.value);
    shiftPuff(r);
  }
  if (delayS <= 0) { r.a.setState('walk'); r.walkSet = true; }
}
function arrive(r) {
  r.moving = false;
  if (!anyTouch()) r.a.look(null, null);
  if (r.slot === 0) r.a.setState('wait');
  else {
    if (r.slot === 1) r.s1T = gt;
    r.a.setState('idle');
    if (r.slot === 1 && !r.shifted) startShift(r);
  }
}
function startShift(r) {
  r.shifted = true;
  r.a.mutate(r.g.shift.attr, r.g.shift.value);
  party.sfx.shift();
  r.popT = TUNE.shiftPop;
  // the first-shapeshifter hint waits until this guest is AT the rope (updatePhase), where the change is replayed
}
// the shapeshift's pop: a few small smoke puffs + sparkle and a SHIFT! stamp over the guest (through the stamp lane: it
// waits for a verdict stamp on show), then the part that changed is ringed in shift purple (and its clause pulses on the
// poster when the rule has one). replay = the first-shifter hint replaying it at the rope: one SHIFT! per shifter unless
// the first one is long gone
function shiftPuff(r, replay) {
  const F = TUNE.shiftFx, cy = r.y - F.cy * r.s;
  particles.emit('smoke', r.x, cy, OV_SMOKE);
  particles.emit('sparkle', r.x, cy, OV_SHIFT_SPARK);
  shiftPopAt = gt;
  if (!replay || gt - r.shiftStampT > F.again) {
    r.shiftStampT = gt;
    const s = laneInfo(word('shift'), F.size, TUNE.col.info, F.life);
    s.rec = r; shiftStampXY(s);
  }
  if (r.g && r.g.shift) { SHR.rec = r; SHR.part = r.g.shift.attr; SHR.t = -TUNE.shiftRing.delay; }
}
// where the SHIFT! over guest s.rec goes (into s.x / s.y): gap units above its drawn top (never on its face), clear of the
// guest at the rope (left of it), and under the poster card's foot when it stands under the card
function shiftStampXY(s) {
  const r = s.rec, F = TUNE.shiftFx;
  if (!r || !r.on || !r.a) return;
  const rb = r.a.bounds(), top = r.y + rb.y * r.s, left = r.x + rb.x * r.s, half = F.size, hw = F.size * 2.3;   // from the record
  let x = r.x, y = top - F.gap - half;
  const f = line[0];
  if (f && f !== r) { const b = f.a.bounds(), fl = f.x + b.x * f.s - F.ropePad; if (x + hw > fl) x = fl - hw; }
  if (rule) {
    const P = world.poster, m = posterMetrics(rule), pw = m.w * 0.5 * P.scale, foot = P.y + m.foot * P.scale + half + 4;
    if (x + hw > P.x - pw && x - hw < P.x + pw && y < foot) {
      y = foot;
      // no room between the card and its head (a tall guest at the rope): beside it on the queue side, at head height
      if (y + half > top - F.gap * 0.5) { x = left - F.ropePad - hw; y = top + half + F.gap; }
    }
  }
  s.x = clamp(x, hw + 4, stage.w - hw - 4); s.y = y;
}

// the line steps forward one slot; a new guest walks into the last slot; the front one heads for the rope (faster in flow)
function advance() {
  line[0] = line[1]; line[1] = line[2]; line[2] = line[3]; line[3] = null;
  let fresh = null;
  if (endless || nextIdx < queueLen()) {
    fresh = spawn(nextIdx);
    if (fresh) {
      nextIdx++;
      const S = world.slots[3];
      fresh.x = S.x - TUNE.enterFrom; fresh.y = S.feetY - 4; fresh.s = S.scale * 0.92; fresh.dim = 0.62;
      line[3] = fresh;
    }
  }
  const walk = combo >= TUNE.flowCombo ? Math.min(walkSec, TUNE.flowWalk) : walkSec;
  for (let k = 0; k < 4; k++) {
    const r = line[k];
    if (!r) continue;
    if (k === 0) moveTo(r, 0, walk, 0, outCubic);
    else if (r === fresh) moveTo(r, k, TUNE.enterDur, k * TUNE.stagger, outCubic);
    else moveTo(r, k, TUNE.shuffle, (k - 1) * TUNE.stagger, outBack);
  }
  if (line[0]) {
    frontIdx = line[0].idx;
    const nr = ruleFor(frontIdx);
    const mut = nr !== rule && repin(nr);
    phase = PH_WALK; pat = 0; yawned = false;
    patSec = frontIdx < pre ? 7 : (endless ? endlessParams(frontIdx - pre).patienceMs : night.params.patienceMs) / 1000 + patBonus(line[0], mut);
    quickQ = line[0].practice ? 0 : Math.min(TUNE.quick.maxShare, quickPar(line[0], mut) / patSec);
    // Slow-Mo: the patience grows, the QUICK par stays absolute (its share of the longer clock shrinks by the same k)
    if (SM.on && !line[0].practice) { patSec *= SM.k; quickQ /= SM.k; }
  } else { frontIdx = -1; if (endT < 0) endT = 0.01; }
  xrayAdvance();
}
// the QUICK par (s from the decision opening) for this guest: a fixed base, per clause on the poster, a liar /
// shapeshifter, the first guest under a re-pinned rule - an absolute skill window, the same on night 1 and night 20
function quickPar(r, repinned) {
  const Q = TUNE.quick, g = r.g;
  return Q.base + rule.clauses.length * Q.clause + (isFake(g) || g.shift ? Q.trick : 0) + (repinned ? Q.repin : 0);
}
// extra patience (s) for the load of this decision: clauses beyond the first, a liar / shapeshifter, the first guest
// under a re-pinned rule
function patBonus(r, repinned) {
  if (r.practice) return 0;
  const B = TUNE.patBonus, g = r.g;
  let s = Math.max(0, rule.clauses.length - 1) * B.clause;
  if (isFake(g) || g.shift) s += B.trick;
  if (repinned) s += B.repin;
  return s;
}

// ---------------------------------------------------------------- poster
function slamPoster(delayS, reveal) { PS.slamT = -delayS; PS.landed = false; PS.settled = false; PS.reveal = !!reveal; PS.slammed = false; }
// the centre reveal's timing: a mid-night rule change slams (repinReveal), the night's first poster pops (reveal)
function revealTune() { return PS.mut ? TUNE.repinReveal : TUNE.reveal; }
function revealDur() { const R = revealTune(); return R.pop + R.hold + R.fly; }
// which clauses of rule nr are not on the old card (bit i = clause i: a new attribute, value or polarity)
function changedMask(old, nr) {
  const cs = nr.clauses, os = old && old.clauses;
  let m = 0;
  for (let i = 0; i < cs.length; i++) {
    let same = false;
    if (os) for (let j = 0; j < os.length; j++) if (os[j].attr === cs[i].attr && os[j].value === cs[i].value && os[j].has === cs[i].has) same = true;
    if (!same) m |= 1 << i;
  }
  return m;
}
// the old poster tears down and the new rule pops BIG at screen centre (the reveal: the night's real poster after a
// practice prelude, or a mid-night rule change with the NEW RULES banner + the 'rules' stinger), then flies to its nail.
// Returns true for a mid-night rule change (the first guest under it gets TUNE.patBonus.repin)
function repin(nr) {
  const real = pre > 0 && rule === preRule && nr !== preRule;
  PS.chg = real ? 0 : changedMask(rule, nr); PS.chgT = 9;
  PS.old = rule; rule = nr; PS.tearT = 0; PS.repin = true; PS.clearBand = real; PS.mut = !real;
  pending = ''; HELD.kind = '';           // nothing picked before the new rule is up may count against it
  const delay = TUNE.poster.tear - TUNE.poster.overlap;
  slamPoster(delay, true);
  party.sfx.tear();
  // record scratch + a fill rolling into the landing (audio seconds: game time runs at 1 / speedK)
  if (PS.mut) { NEWR.word = word('rule_new'); party.stinger('rules', (delay + revealDur()) * speedK); }
  const P = world.poster;
  particles.emit('playPaper', P.x, P.y + 50 * P.scale);
  for (let k = 0; k < 4; k++) if (line[k]) line[k].a.look(P.x, P.y + 40);
  return PS.mut;
}
function posterImpact() {
  const P = world.poster, T = TUNE.poster;
  PS.landed = true;
  camera.addTrauma(T.trauma);
  PS.rot.v += (Math.random() < 0.5 ? -1 : 1) * T.kick;
  party.sfx.poster();
  particles.emit('playKick', P.x - 50 * P.scale, P.y + 82 * P.scale);
  particles.emit('playKick', P.x + 50 * P.scale, P.y + 82 * P.scale);
  if (PS.repin) {
    camera.kick(0, T.kickY);
    particles.emit('ring', P.x, P.y + 45 * P.scale, OV_RING);
    if (PS.mut) {                          // the small reminder rides the strings above the card; what changed pops amber
      NEWR.t = 0; NEWR.out = -1; NEWR.word = word('rule_new');
      PS.chgT = 0;
      // it owns the lane from here: a verdict stamp still on show punches out, one still due is dropped
      for (let i = 0; i < STAMPS.length; i++) {
        const s = STAMPS[i];
        if (!s.on || !s.v) continue;
        if (s.t < 0) s.on = false; else if (s.out < 0) s.out = 0;
      }
    }
  }
  // a milestone that waited for the landing: its sights now; under NEW RULES (which owns the stamp lane) without a stamp
  if (MILE.k >= 0) { const k = MILE.k; MILE.k = -1; milestoneFx(k, MILE.n, false, PS.mut); }
}
// the NEW RULES sticker above the landed poster's top-right corner, on the string area (never over a clause, off the
// yeet's exit to the upper left): pops in, punches out by scale at the end of its life or when a bad verdict stamp
// (OOPS / MISS) takes the lane
function drawNewRules(ctx, pp) {
  const N = TUNE.newRules, St = TUNE.stamp;
  if (!NEWR.word || !PS.mut || (NEWR.t >= N.life && NEWR.out < 0) || NEWR.out >= St.out) return;
  const P = world.poster, m = posterMetrics(rule), s = P.scale * pp.k;
  let sc = lerp(St.punch, 1, outBack(clamp(NEWR.t * 1000 / St.punchMs, 0, 1)));
  if (NEWR.out >= 0) sc *= 1 - inBack(clamp(NEWR.out / St.out, 0, 1));
  if (sc <= 0.01) return;
  ctx.save();
  ctx.translate(pp.x + m.w * 0.5 * s - N.dx, pp.y + m.hang * s + N.dy); ctx.rotate(N.rot); ctx.scale(sc, sc);
  drawStampText(ctx, NEWR.word, 0, 0, N.size, TUNE.col.rule, NEWR.t, St.plate);
  ctx.restore();
}
// the NEW RULES sticker is up (landed, not yet punching out): the stamp lane is its own
function newRulesLive() { return !!NEWR.word && PS.mut && NEWR.t < TUNE.newRules.life && NEWR.out < 0; }
// the big NEW RULES banner slammed above the big card's nail while a rule change reveals at centre (fixed bake size,
// scaled with the card as it flies to its nail and shrinking away over the first bannerOut of the fly: never a held
// mid alpha)
function drawNewRulesBanner(ctx, pp) {
  const N = TUNE.newRules, R = revealTune(), ts = PS.slamT - N.bannerAt;
  if (!PS.mut || ts < 0 || !NEWR.word) return;
  const fly = clamp((PS.slamT - R.pop - R.hold) / R.fly, 0, 1), out = 1 - inBack(clamp(fly / N.bannerOut, 0, 1)), k = pp.k / R.scale * out;
  if (k <= 0.01) return;
  ctx.save();
  ctx.translate(pp.x, pp.y - N.bannerDy * pp.k / R.scale); ctx.rotate(N.bannerRot + pp.rot); ctx.scale(k, k);
  drawStampText(ctx, NEWR.word, 0, 0, N.banner, TUNE.col.rule, ts, TUNE.stamp.plate);
  ctx.restore();
}
// the clauses a rule change brought: an amber glow pulses behind them on the big card through the centre hold (big), then
// they pop in turn on the landed card (staggered outBack, rule amber) so the eye goes straight to what changed
function drawChangedClauses(ctx, big) {
  const Cg = TUNE.changed, n = rule.clauses.length;
  if (!PS.chg) return;
  const s = world.poster.scale, ic = posterMetrics(rule).icon;
  if (big) {
    const R = revealTune(), ts = PS.slamT - R.pop;
    if (ts < 0 || ts > R.hold + R.fly * 0.5) return;
    const pp = posterPose(), a = clamp(ts / 0.12, 0, 1) * (1 - smoothstep(R.hold, R.hold + R.fly * 0.5, ts));
    const k = s * pp.k, pulse = 1 + 0.08 * Math.sin(ts * 14);
    for (let i = 0; i < n; i++) {
      if (!(PS.chg & (1 << i))) continue;
      const p = clauseXY(i), x = p.x, y = p.y;
      draw.glow(ctx, x, y, Cg.glow * k * pulse, TUNE.col.rule, 0.45 * a);
      ringAt(ctx, x, y, ic * k * 0.56 * pulse, TUNE.col.rule, a);
    }
    return;
  }
  if (PS.chgT >= Cg.life + Cg.stagger * n) return;
  const pm = n >= 3 ? Cg.popTight : Cg.pop;
  for (let i = 0, k = 0; i < n; i++) {
    if (!(PS.chg & (1 << i))) continue;
    const ft = PS.chgT - (k++) * Cg.stagger, u = ft / Cg.life;
    if (u <= 0 || u >= 1) continue;
    const pop = 1 + (pm - 1) * outBack(clamp(u / 0.3, 0, 1)) * (1 - smoothstep(0.5, 1, u)), p = clauseXY(i);
    draw.glow(ctx, p.x, p.y, Cg.glow * s * pop, TUNE.col.rule, 0.8 * (1 - smoothstep(0.6, 1, u)));
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(RV.rot); ctx.scale(pop, pop);
    drawClauseIcon(ctx, rule.clauses[i], 0, 0, ic * s);
    ctx.restore();
  }
}
function posterReady() {
  if (PS.tearT >= 0) return false;
  return PS.reveal ? PS.slamT >= revealDur() - 0.04 : PS.slamT >= TUNE.poster.slam * TUNE.poster.ready;
}
function updatePoster(dt) {
  const T = TUNE.poster, R = revealTune();
  if (PS.tearT >= 0) { PS.tearT += dt; if (PS.tearT >= T.tear) { PS.tearT = -1; PS.old = null; } }
  if (PS.chgT < 9) PS.chgT += dt;
  if (PS.slamT > -9 && !PS.settled) {
    const prev = PS.slamT;
    PS.slamT += dt;
    if (PS.slamT >= 0) {
      if (prev < 0) PS.rot.x = 0;
      if (PS.reveal) {
        if (prev < 0 && !PS.mut) {                                        // the night's poster pops in at centre with a ring
          party.sfx.stamp();
          const m = posterMetrics(rule);
          particles.emit('ring', stage.w / 2, stage.h * R.y, OV_REVEAL_RING);
          particles.emit('sparkle', stage.w / 2, stage.h * R.y - m.h * 0.5 * world.poster.scale * R.scale, OV_SPARK);
        }
        if (PS.mut && !PS.slammed && PS.slamT >= R.pop) {                 // a new rule SLAMS down at centre
          PS.slammed = true;
          const m = posterMetrics(rule), cy = stage.h * R.y;
          party.sfx.poster(); party.sfx.stamp();
          camera.addTrauma(R.trauma); camera.kick(0, R.kickY);
          particles.emit('ring', stage.w / 2, cy, OV_REVEAL_RING);
          particles.emit('playKick', stage.w / 2 - m.w * 0.4 * world.poster.scale * R.scale, cy + m.h * 0.5 * world.poster.scale * R.scale);
          particles.emit('playKick', stage.w / 2 + m.w * 0.4 * world.poster.scale * R.scale, cy + m.h * 0.5 * world.poster.scale * R.scale);
        }
        if (prev < R.pop + R.hold && PS.slamT >= R.pop + R.hold) {          // flies to its nail
          party.sfx.whoosh(1);
          if (PS.clearBand) clearPracticeBand();
        }
        if (PS.slamT >= revealDur()) { posterImpact(); PS.settled = true; }
      } else {
        const u = clamp(PS.slamT / T.slam, 0, 1);
        if (!PS.landed && outBack(u) >= 1) posterImpact();
        if (u >= 1) { if (!PS.landed) posterImpact(); PS.settled = true; }
      }
    }
  }
  stepSpring(PS.rot, dt);
}
// the practice prelude is over (under the real poster's reveal dim): its dancers poof out of the window and their
// instruments stop, so the night's band is only what the night earns
function clearPracticeBand() {
  PS.clearBand = false;
  const ds = world.dancers;
  if (ds) for (let i = 0; i < ds.length; i++) { const p = dancerXY(ds[i]); particles.emit('smoke', p.x, p.y, OV_POOF); }
  world.setBand(null);
  party.resetLayers();
  JOIN.d = null; JOIN.hit = true;
}
function posterDrop() { const T = TUNE.poster, u = clamp(PS.slamT / T.slam, 0, 1); return (1 - outBack(u)) * T.drop; }
function revealing() { return PS.reveal && !PS.landed && PS.slamT >= 0; }
// the current poster's nail position, scale factor and extra angle (into RV): the centre reveal (pop, hold, fly to the
// nail on an arc), else the slam drop + its spring
function posterPose() {
  const P = world.poster;
  if (revealing()) {
    const R = revealTune(), m = posterMetrics(rule), ts = PS.slamT;
    const cy = stage.h * R.y - (m.hang + m.h * 0.5) * P.scale * R.scale;          // the nail that centres the big card
    RV.a = 1;
    if (ts < R.pop) {
      const u = ts / R.pop;
      RV.x = stage.w / 2; RV.y = cy; RV.glow = clamp(u * 2, 0, 1);
      if (PS.mut) { RV.k = R.scale * lerp(R.from, 1, u * u); RV.rot = 0; RV.a = clamp(u * 3, 0, 1); }   // slams down (accelerating)
      else { RV.k = R.scale * lerp(0.35, 1, outBack(u)); RV.rot = R.spin * (1 - outCubic(u)); }
    } else if (ts < R.pop + R.hold) {
      const h = ts - R.pop;
      // the slam's squash settles (a mutation), else a soft breathing pulse
      RV.x = stage.w / 2; RV.y = cy; RV.rot = 0; RV.glow = 1;
      RV.k = R.scale * (PS.mut ? 1 - 0.05 * Math.exp(-h * 9) * Math.cos(h * 30) : 1 + 0.012 * Math.sin(h * 18));
    } else {
      const v = clamp((ts - R.pop - R.hold) / R.fly, 0, 1), e = inOutCubic(v);
      RV.x = lerp(stage.w / 2, P.x, e); RV.y = lerp(cy, P.y, e) - Math.sin(v * Math.PI) * R.arc;
      RV.k = lerp(R.scale, 1, e); RV.rot = -0.07 * Math.sin(v * Math.PI); RV.glow = 1 - e;
    }
  } else { RV.x = P.x; RV.y = P.y - (PS.reveal ? 0 : posterDrop()); RV.k = 1; RV.rot = PS.rot.x; RV.glow = 0; RV.a = 1; }
  return RV;
}
// world position of clause ci's icon on the poster as drawn now (into XY; the slam / reveal angle, sway ignored)
// (the row geometry is icons.js posterMetrics: badge size, row0 + ci x step, rowY below the nail)
function clauseXY(ci) {
  const P = world.poster, m = posterMetrics(rule), pp = posterPose(), s = P.scale * pp.k;
  const lx = m.row0 + ci * m.step, ly = m.rowY;
  const a = pp.rot, ca = Math.cos(a), sa = Math.sin(a);
  XY.x = pp.x + s * (lx * ca - ly * sa); XY.y = pp.y + s * (lx * sa + ly * ca);
  return XY;
}
function drawPosters(ctx) {
  const P = world.poster, T = TUNE.poster;
  // LAST CALL: the poster fades out as the stamp lands over it during the dolly (no clause rings through the word)
  const fade = LC.on && !LC.shut ? 1 - clamp(LC.t / TUNE.lastcall.posterFade, 0, 1) : 1;
  if (fade <= 0.01) return;
  PO.scale = P.scale; PO.alpha = fade; PO.swing = 1;
  if (PS.old && PS.tearT >= 0) {
    PO.rot = 0; PO.tear = clamp(PS.tearT / T.tear, 0, 1);
    drawPoster(ctx, PS.old, P.x, P.y, t, PO);
  }
  if (rule && PS.slamT >= 0 && !revealing()) {
    const pp = posterPose();
    PO.rot = pp.rot; PO.tear = 0; PO.swing = 1;
    if (tutorial && frontIdx >= 0 && frontIdx < TUNE.tutorial.guests && phase === PH_DECIDE) {
      const Gl = TUNE.tutorial.glow;
      draw.glow(ctx, P.x, P.y + Gl.dy * P.scale, Gl.r * P.scale, Gl.col, Gl.a + Gl.amp * Math.sin(t * Gl.hz));
    }
    drawPoster(ctx, rule, pp.x, pp.y, t, PO);
    if (fade >= 1) { drawShiftClause(ctx); drawChangedClauses(ctx, false); drawNewRules(ctx, pp); drawFailClause(ctx); }
  }
  PO.alpha = 1;
}
// a shapeshift just popped: the clause on its attribute (if the rule has one) pulses a shift-purple ring on the card
function drawShiftClause(ctx) {
  const Sr = TUNE.shiftRing;
  if (SHR.t >= Sr.life || SHR.t < 0 || !SHR.part) return;
  const cs = rule.clauses;
  let ci = -1;
  for (let i = 0; i < cs.length; i++) if (cs[i].attr === SHR.part) { ci = i; break; }
  if (ci < 0) return;
  const u = SHR.t / Sr.life, p = clauseXY(ci), m = posterMetrics(rule), s = world.poster.scale;
  const a = 1 - smoothstep(0.6, 1, u), pop = outBack(clamp(u / 0.25, 0, 1));
  ringAt(ctx, p.x, p.y, m.icon * s * (0.4 + 0.18 * pop) * (1 + 0.06 * Math.sin(SHR.t * 22)), TUNE.col.shift, a);
}
// an inked ring in col (the WHY ring on a guest's part, the shapeshift ring), alpha a; dashed = an outline where a
// MISSING part should be
function ringAt(ctx, x, y, rad, col, a, dashed) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (dashed) ctx.setLineDash(DASH);
  ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU);
  ctx.lineWidth = 6; ctx.strokeStyle = '#1d1840'; ctx.stroke();
  ctx.lineWidth = 3.5; ctx.strokeStyle = col; ctx.stroke();
  if (dashed) ctx.setLineDash(NO_DASH);
  ctx.restore();
}
// the centre reveal draws over the whole street (after the front layer): a soft dim + amber glow behind the big card
function drawReveal(ctx) {
  if (!rule || !revealing()) return;
  const R = revealTune(), P = world.poster, pp = posterPose(), m = posterMetrics(rule), s = P.scale * pp.k;
  if (pp.glow > 0.01) {
    ctx.save();
    ctx.globalAlpha *= R.dim * pp.glow; ctx.fillStyle = '#0c0b24'; ctx.fillRect(-20, -20, stage.w + 40, stage.h + 40);
    ctx.restore();
    draw.glow(ctx, pp.x, pp.y + (m.hang + m.h * 0.5) * s, R.glow * pp.k / R.scale, R.glowCol, R.glowA * pp.glow);
  }
  PO.scale = s; PO.alpha = pp.a; PO.swing = 0.4; PO.rot = pp.rot; PO.tear = 0;
  drawPoster(ctx, rule, pp.x, pp.y, t, PO);
  PO.scale = P.scale; PO.swing = 1; PO.alpha = 1;
  drawChangedClauses(ctx, true);
  drawNewRulesBanner(ctx, pp);
}
// the WHY on the poster: the clause a wrong call broke springs to fail.pop x as a verdict-marked badge (red ring + red
// cross sticker, icons.js mark 'bad'), shaking; ci -2 (a matching guest was bounced): every clause pops in turn
// (stagger s apart) as a green-checked badge ('ok'), still. Close badges (3 clauses, or all popping) cap at popTight so
// a popped badge never swallows its neighbours or spills off the card
function drawFailClause(ctx) {
  const F = TUNE.fail, n = rule.clauses.length;
  if (FAIL.rule !== rule || FAIL.ci >= n || (FAIL.ci < 0 && FAIL.ci !== -2)) return;
  if (FAIL.ci === -2) {
    if (FAIL.t >= F.life + F.stagger * (n - 1)) return;
    const pm = n >= 3 ? F.popTight : n === 2 ? F.pop2 : F.pop;
    for (let i = 0; i < n; i++) failBadge(ctx, i, 'ok', TUNE.col.nice, 0, FAIL.t - i * F.stagger, pm);
  } else if (FAIL.t < F.life) failBadge(ctx, FAIL.ci, 'bad', F.col, TUNE.failShake.amp, FAIL.t, n >= 3 ? F.popTight : F.pop);
}
function failBadge(ctx, ci, mark, col, amp, ft, popMax) {
  const F = TUNE.fail, Sh = TUNE.failShake, u = ft / F.life, s = world.poster.scale;
  if (u <= 0 || u >= 1) return;
  const pop = 1 + (popMax - 1) * outBack(clamp(u / 0.22, 0, 1)) * (1 - smoothstep(0.55, 1, u)), a = 1 - smoothstep(0.75, 1, u);
  const p = clauseXY(ci), shake = amp * Math.sin(ft * Sh.hz * TAU) * (1 - smoothstep(0.1, 0.7, u));
  const x = p.x + shake, y = p.y, ic = posterMetrics(rule).icon * s;
  draw.glow(ctx, x, y, F.glow * s * pop, col, 0.7 * a);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); ctx.rotate(RV.rot + shake * 0.02); ctx.scale(pop, pop);
  drawClauseIcon(ctx, rule.clauses[ci], 0, 0, ic, mark);     // one bake per size: the pop is the ctx scale
  ctx.restore();
}

// ---------------------------------------------------------------- stamps (one lane)
function takeStamp() {
  for (let i = 0; i < STAMPS.length; i++) if (!STAMPS[i].on) return STAMPS[i];
  let s = STAMPS[0];
  for (let i = 1; i < STAMPS.length; i++) if (STAMPS[i].t > s.t) s = STAMPS[i];
  return s;
}
// the lane stamp on show (shown and not punching out), `not` excepted
function shownStamp(not) {
  for (let i = 0; i < STAMPS.length; i++) { const s = STAMPS[i]; if (s.on && s !== not && s.t >= 0 && s.out < 0) return s; }
  return null;
}
function verdictWaiting() {
  for (let i = 0; i < STAMPS.length; i++) { const s = STAMPS[i]; if (s.on && s.v && s.t < 0) return true; }
  return false;
}
// a verdict-class stamp (NICE / QUICK! / OOPS / MISS / xN / NEW BEST) at (x, y): the stamp on show (and the NEW RULES
// sticker) punch out first and it appears once they are gone (>= stamp.delay after the verdict: t = -that); another
// verdict still waiting is replaced; a waiting SHIFT! keeps waiting behind it
function laneVerdict(w, x, y, size, col, plate, life) {
  const St = TUNE.stamp;
  let wait = St.delay;
  for (let i = 0; i < STAMPS.length; i++) {
    const s = STAMPS[i];
    if (!s.on) continue;
    if (s.t >= 0) { if (s.out < 0) s.out = 0; wait = Math.max(wait, St.out - s.out); }
    else if (s.v) s.on = false;
  }
  if (NEWR.t < TUNE.newRules.life && NEWR.out < 0 && NEWR.word) { NEWR.out = 0; wait = Math.max(wait, St.out); }
  const s = takeStamp();
  s.on = true; s.v = true; s.word = w; s.x = x; s.y = y; s.size = size; s.col = col; s.t = -wait; s.life = life; s.rise = St.rise;
  s.plate = plate || St.plate; s.punch = St.punch; s.out = -1; s.waited = 0; s.rec = null; s.sub = '';
  return s;
}
// an info stamp (SHIFT!): it waits behind the stamp on show (that one keeps minHold s) and any verdict still due; placed
// by the caller (shiftStampXY), re-placed when it shows
function laneInfo(w, size, col, life) {
  const s = takeStamp();
  s.on = true; s.v = false; s.word = w; s.x = 0; s.y = 0; s.size = size; s.col = col; s.t = -1e-4; s.life = life; s.rise = 0;
  s.plate = TUNE.stamp.plate; s.punch = TUNE.stamp.punch; s.out = -1; s.waited = 0; s.rec = null; s.sub = '';
  return s;
}
// half the drawn width of a stamp plate for word at size (icons.js bakeWord: the word + 0.95 x size of rim), measured
// once per stamp, never per frame
function stampHalfW(w, size) {
  const disp = text.dir(w) === 'rtl' ? w : w.toUpperCase();
  return (text.measure(stage.ctx, disp, size, 800, 'Baloo 2') + size * 0.95) * 0.5;
}
// NICE / BUSTED! / OOPS / MISS: never on the guest at the rope - quick, on a sticker plate just above the poster (over
// the window sill), kept on screen, punching in (plate: the stamp's fill, default the dark sticker)
function verdictStamp(w, size, col, plate) {
  const St = TUNE.stamp, P = world.poster, hw = stampHalfW(w, size) + 6;
  return laneVerdict(w, clamp(P.x, hw, stage.w - hw), P.y + St.dy, size, col, plate, St.life);
}
// the QUICK! sticker on stamp s's upper corner (toward the screen's middle), slapped on just after it
function stampSub(s, w, col) {
  const Q = TUNE.quick, side = s.x > stage.w * 0.5 ? -1 : 1;
  s.sub = w; s.subCol = col; s.subDx = side * stampHalfW(s.word, s.size) * Q.subDx; s.subDy = s.size * Q.subDy;
}
function clearStamps() { for (let i = 0; i < STAMPS.length; i++) { STAMPS[i].on = false; STAMPS[i].v = false; STAMPS[i].rec = null; } }
// the lane's clock: a delayed / queued stamp shows when its turn comes, a shown one punches out (scale to 0) after life
function updateStamps(dt) {
  const St = TUNE.stamp;
  for (let i = 0; i < STAMPS.length; i++) {
    const s = STAMPS[i];
    if (!s.on) continue;
    if (s.out >= 0) { s.out += dt; if (s.out >= St.out) { s.on = false; s.v = false; s.rec = null; } continue; }
    if (s.t < 0) {
      s.t += dt;
      if (s.t < 0 || s.v) continue;
      // an info stamp's turn: only once the one on show has been read (minHold) and no verdict is due
      const cur = shownStamp(s);
      if ((cur && cur.t < St.minHold) || verdictWaiting()) {
        s.t = -1e-4; s.waited += dt;
        if (s.waited > St.maxWait) { s.on = false; s.rec = null; }
        continue;
      }
      if (cur) { cur.out = 0; s.t = -St.out; continue; }
      if (s.rec) { if (s.rec.on) shiftStampXY(s); else { s.on = false; continue; } }
      s.t = 0;
      continue;
    }
    s.t += dt;
    if (s.t >= s.life) s.out = 0;
  }
}
function drawStamps(ctx) {
  const St = TUNE.stamp;
  for (let i = 0; i < STAMPS.length; i++) {
    const s = STAMPS[i];
    if (!s.on || s.t < 0) continue;
    let sc = s.punch !== 1 ? lerp(s.punch, 1, outBack(clamp(s.t * 1000 / St.punchMs, 0, 1))) : 1;   // the pop punch
    if (s.out >= 0) sc *= 1 - inBack(clamp(s.out / St.out, 0, 1));                                   // the punch-out
    if (sc <= 0.01) continue;
    const y = s.y - s.rise * outCubic(clamp(s.t / s.life * 1.4, 0, 1));
    ctx.save();
    ctx.translate(s.x, y); ctx.scale(sc, sc);
    drawStampText(ctx, s.word, 0, 0, s.size, s.col, s.t, s.plate);
    if (s.sub && s.t >= TUNE.quick.subAt) {
      ctx.translate(s.subDx, s.subDy); ctx.rotate(s.subDx < 0 ? -TUNE.quick.subRot : TUNE.quick.subRot);
      drawStampText(ctx, s.sub, 0, 0, TUNE.quick.sub, s.subCol, s.t - TUNE.quick.subAt, St.plate);
    }
    ctx.restore();
  }
}
// the FAKE! tag: a small brass-ink stamp pinned over the liar's fake part (it follows the part while the guest is on
// screen), flashing in with a glow, punching out by scale
function startFakeTag(r, life) {
  FTAG.rec = r; FTAG.t = 0; FTAG.word = word('fake'); FTAG.life = life > 0 ? life : TUNE.fakeTag.life; FTAG.bust = false;
  fakeTagXY();
}
function fakeTagXY() {
  if (FTAG.bust) {                       // BUSTED: popped off the rip point, drifting the way the prop falls
    const B = TUNE.bust, k = Math.max(0.6, FTAG.bs);
    FTAG.x = clamp(FTAG.bx + FTAG.dir * B.drift * FTAG.bs * Math.min(FTAG.t, FTAG.life), 40, stage.w - 40);
    FTAG.y = FTAG.by + (TUNE.fakeTag.dy - B.rise * outBack(clamp(FTAG.t / B.pop, 0, 1))) * k;
    return;
  }
  const r = FTAG.rec;
  if (!r || !r.on || !r.a) return;
  const a = r.a.anchor('fake');
  FTAG.x = clamp(a.x, 40, stage.w - 40); FTAG.y = a.y + TUNE.fakeTag.dy * Math.max(0.6, r.s);
}
function drawFakeTag(ctx) {
  const F = TUNE.fakeTag, St = TUNE.stamp;
  if (FTAG.t >= FTAG.life + F.out || !FTAG.word) return;
  fakeTagXY();
  let sc = lerp(St.punch, 1, outBack(clamp(FTAG.t * 1000 / St.punchMs, 0, 1)));
  if (FTAG.t > FTAG.life) sc *= 1 - inBack(clamp((FTAG.t - FTAG.life) / F.out, 0, 1));
  if (sc <= 0.01) return;
  if (FTAG.bust && FTAG.t < TUNE.bust.ring) {   // the brass ring bursting off the rip point
    const u = FTAG.t / TUNE.bust.ring;
    ringAt(ctx, FTAG.bx, FTAG.by, (10 + 30 * outCubic(u)) * Math.max(0.6, FTAG.bs), TUNE.col.info, 1 - u * u);
  }
  if (FTAG.t < F.flash) draw.glow(ctx, FTAG.x, FTAG.y, F.glow, TUNE.col.info, 0.8 * (1 - FTAG.t / F.flash));
  ctx.save();
  ctx.translate(FTAG.x, FTAG.y); ctx.scale(sc, sc);
  drawStampText(ctx, FTAG.word, 0, 0, F.size, TUNE.col.info, FTAG.t, St.plate);
  ctx.restore();
}
// BUSTED: a trap liar bounced right - its fake comes off on the yeet's launch frame (updateLeaver calls bustRip)
function startBust(r) { BUST.rec = r; }
// the launch frame: the tear, a paper puff, tape strips fluttering down and the FAKE! tag popping off where the fake
// part was (its last drawn spot: the actor drops it as debris this same frame)
function bustRip(r) {
  const a = r.a.anchor('fake'), x = a.x, y = a.y, s = r.s;
  BUST.rec = null;
  party.sfx.tear();
  particles.emit('playPaper', x, y, OV_BUST_PAPER);
  particles.emit('sparkle', x, y, OV_BUST_SPARK);
  for (let i = 0; i < TUNE.bust.tapes; i++) addTape(x, y, s, i);
  FTAG.rec = null; FTAG.t = 0; FTAG.word = word('fake'); FTAG.life = TUNE.bust.tagLife;
  FTAG.bust = true; FTAG.bx = x; FTAG.by = y; FTAG.bs = s; FTAG.dir = r.dir;
}
function addTape(x, y, s, i) {
  let p = null;
  for (let k = 0; k < TAPES.length; k++) if (!TAPES[k].on) { p = TAPES[k]; break; }
  if (!p) return;
  const B = TUNE.bust, side = i % 2 === 0 ? 1 : -1;
  p.on = true; p.x = x; p.y = y; p.t = 0; p.s = Math.max(0.6, s); p.ph = Math.random() * TAU;
  p.vx = side * B.tapeVx * (0.5 + Math.random() * 0.5); p.vy = -(B.tapeVy[0] + Math.random() * (B.tapeVy[1] - B.tapeVy[0]));
  p.rot = side * 0.6;
}
// tape strips: thrown up, then fluttering down (air drag caps the fall, a sway + a flipping tilt)
function updateTapes(dt) {
  const B = TUNE.bust;
  for (let i = 0; i < TAPES.length; i++) {
    const p = TAPES[i];
    if (!p.on) continue;
    p.t += dt;
    if (p.t >= B.tapeLife) { p.on = false; continue; }
    p.vy = Math.min(p.vy + B.tapeG * dt, 90); p.vx *= Math.exp(-dt * 3);
    p.x += (p.vx + Math.sin(p.t * B.flutter + p.ph) * 34) * dt * p.s; p.y += p.vy * dt * p.s;
    p.rot = Math.sin(p.t * B.flutter * 0.8 + p.ph) * 0.9;
  }
}
function drawTapes(ctx) {
  const B = TUNE.bust;
  for (let i = 0; i < TAPES.length; i++) {
    const p = TAPES[i];
    if (!p.on) continue;
    const u = p.t / B.tapeLife, k = p.s * (1 - smoothstep(0.7, 1, u)), w = B.tapeW * k, h = B.tapeH * k;
    if (k <= 0.01) continue;
    // a flip about its long axis: the strip foreshortens as it turns
    const fh = h * (0.35 + 0.65 * Math.abs(Math.cos(p.t * B.flutter + p.ph)));
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = 'rgba(29,24,64,0.55)'; ctx.fillRect(-w / 2 - 1, -fh / 2 - 1, w + 2, fh + 2);
    ctx.fillStyle = 'rgba(246,238,214,0.88)'; ctx.fillRect(-w / 2, -fh / 2, w, fh);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w / 2, -fh / 2, w, Math.max(0.8, fh * 0.3));
    ctx.restore();
  }
}
// NICE CATCH / BUSTED: the combo pill kicks with sparkles
function catchFx() {
  const H = TUNE.hud;
  COMBO.v += TUNE.bust.kick;
  particles.emit('sparkle', H.comboX, stage.safeTop + H.row, OV_CATCH_PILL);
}

// ---------------------------------------------------------------- hints (first red slash / first liar / first shapeshifter)
function isFake(g) { const f = g.fake; return !!(f && (f.eyes || f.hat || f.tail)); }
// the first clause of rule `ru` on an attribute this profile has never been taught (-1 = none)
function newAttrClause(ru) {
  const cs = ru && ru.clauses;
  if (!cs) return -1;
  for (let i = 0; i < cs.length; i++) { const k = SEEN_ATTR[cs[i].attr]; if (k && !profile.hasSeen(k)) return i; }
  return -1;
}
// the hint this guest would trigger for the current profile ('' = none); practice and glove-tutorial guests never
// trigger one. One new thing per guest, in teaching order: the red slash, AND (2+ clauses), a new attribute, a liar, a
// shapeshifter
function hintKind(r) {
  if (!hintsOn || !r || !r.g || r.practice || (tutorial && r.idx < TUNE.tutorial.guests)) return '';
  const ru = ruleFor(r.idx);
  if (negClause(ru) >= 0 && !profile.hasSeen('neg')) return 'neg';
  if (ru.clauses.length >= 2 && !profile.hasSeen('and')) return 'and';
  if (newAttrClause(ru) >= 0) return 'attr';
  if (isFake(r.g) && !profile.hasSeen('fake')) return 'fake';
  if (r.g.shift && r.g.pre && !profile.hasSeen('shift')) return 'shift';
  if (BR.open && BAR.length > 0 && !profile.hasSeen('boost')) return 'boost';   // the booster bar, once
  return '';
}
function startHint(kind, r) {
  HINT.rec = r; HINT.kind = kind; HINT.t = 0; HINT.snap = true; HINT.ci = -1; HINT.attr = ''; HINT.seen = kind;
  if (kind === 'attr') {
    HINT.ci = newAttrClause(rule); HINT.attr = HINT.ci >= 0 ? rule.clauses[HINT.ci].attr : '';
    HINT.seen = SEEN_ATTR[HINT.attr] || '';
  }
  hintStr();
  pending = ''; HELD.kind = '';
  party.sfx.stamp();
  // the first shapeshifter: the change is replayed at the rope (the changed part ringed; a SHIFT! again only when the
  // queue's one is long gone), so the caption is about the guest being judged
  if (kind === 'shift') shiftPuff(r, true);
}
// the hint caption in the current language (rebuilt on resume: the language may have changed in settings)
function hintStr() {
  HINT.str = HINT.kind === 'attr' ? tutorialWord(NEW_KEY[HINT.attr] || 'cap_new') : HINT.kind === 'boost' ? boostWord('cap_boost') : tutorialWord(HINT_KEY[HINT.kind]);
  HINT.w = capWidth(HINT.str);
}
function endHint(seen) {
  if (seen && HINT.seen) profile.markSeen(HINT.seen);
  HINT.rec = null;
}
// the attributes the glove tutorial just taught (its rule's clauses) never get a 'new attribute' hint
function markTaught(ru) {
  const cs = ru && ru.clauses;
  if (cs) for (let i = 0; i < cs.length; i++) { const k = SEEN_ATTR[cs[i].attr]; if (k && !profile.hasSeen(k)) profile.markSeen(k); }
}
// the glove beside clause ci of the poster, from outside the card so no other clause is covered: the first clause from
// the left, the last from the right, a middle one from below (into HT)
function gloveAtClause(ci) {
  const H = TUNE.hint, n = rule.clauses.length, p = clauseXY(ci);
  const off = (posterMetrics(rule).icon * 0.5 + H.negPad) * world.poster.scale;
  if (ci === 0) { HT.x = p.x - off; HT.y = p.y; HT.rot = H.rotL; }
  else if (ci === n - 1) { HT.x = p.x + off; HT.y = p.y; HT.rot = H.rotR; }
  else { HT.x = p.x; HT.y = p.y + off; HT.rot = 0; }
}
// where the hint glove's fingertip goes (HT), from the guest's last drawn pose / the poster
function hintTarget(r) {
  const H = TUNE.hint, s = r.s, b = r.a.bounds(), front = r === line[0];
  if (HINT.kind === 'boost') {            // from the inner side of the booster bar, level with its chips
    const c = BAR[BAR.length - 1], left = leftMode();
    if (c) { HT.x = c.x + (left ? -1 : 1) * (TUNE.boost.chip * 0.5 + H.pad); HT.y = c.y; HT.rot = left ? H.rotL : H.rotR; }
    return;
  }
  if (HINT.kind === 'neg') { const c0 = negClause(rule); gloveAtClause(c0 < 0 ? 0 : c0); }
  else if (HINT.kind === 'attr') gloveAtClause(HINT.ci < 0 ? 0 : HINT.ci);
  else if (HINT.kind === 'and') {
    // under the clause row, sweeping from the first badge to the last and back (ALL of them count)
    const n = rule.clauses.length, a = clauseXY(0), ax = a.x, ay = a.y, z = clauseXY(n - 1);
    const off = (posterMetrics(rule).icon * 0.5 + H.negPad) * world.poster.scale, k = 0.5 - 0.5 * Math.cos(HINT.t * H.andHz * TAU);
    HT.x = lerp(ax, z.x, k); HT.y = lerp(ay, z.y, k) + off; HT.rot = 0;
  } else if (HINT.kind === 'fake') {
    const f = r.g.fake;
    if (f.hat) { const a = r.a.anchor('head'); HT.x = a.x + H.hatDx * s; HT.y = a.y - H.hatUp * s; HT.rot = H.rotR; }
    else if (f.tail) {                    // from the left, level with the tied-on tail's curl (never down in the caption band)
      const a = r.a.anchor('tail');
      HT.x = a.x - H.tailPad * s; HT.y = a.y - H.tailUp * s; HT.rot = H.rotTail;
    } else { const a = r.a.anchor('face'); HT.x = r.x + (b.x + b.w) * s + H.pad; HT.y = a.y; HT.rot = H.rotR; }
  } else if (front) { HT.x = r.x + (b.x + b.w) * s + H.pad; HT.y = r.y - H.midY * s; HT.rot = H.rotR; }
  else { HT.x = r.x + H.topDx * s; HT.y = r.y + b.y * s - H.pad; HT.rot = H.rotDown; }   // in line: down onto its head
}
function updateHint(dt) {
  const H = TUNE.hint;
  if (HINT.rec) {
    HINT.t += dt;
    HINT.a = Math.min(1, HINT.a + dt * TUNE.cap.fadeIn);
    hintTarget(HINT.rec);
    if (HINT.snap) { HINT.gx = HT.x; HINT.gy = HT.y; HINT.rot = HT.rot; HINT.snap = false; }
    else {
      const k = 1 - Math.exp(-dt * H.ease);
      HINT.gx += (HT.x - HINT.gx) * k; HINT.gy += (HT.y - HINT.gy) * k; HINT.rot += (HT.rot - HINT.rot) * k;
    }
  } else if (HINT.a > 0) HINT.a = Math.max(0, HINT.a - dt * TUNE.cap.fadeOut);
}
function drawHintGlove(ctx) {
  if (HINT.a <= 0.01) return;
  GLOVE_TAP.alpha = HINT.a; GLOVE_TAP.rot = HINT.rot;
  drawGlove(ctx, HINT.gx, HINT.gy, TUNE.hint.glove, t, GLOVE_TAP);
}

// ---------------------------------------------------------------- captions (tutorial + hints share one slot)
function capY() {
  const C = TUNE.cap, P = TUNE.plate, plateTop = stage.h - stage.safeBottom - P.bottom - P.h;
  return Math.min(world.slots[0].feetY + C.dy, plateTop - C.h / 2 - C.gap);
}
// the swipe-demo glove (guests 1-2, drawn in the HUD over the scrim), into TG: its fingertip under the caption and the
// whole hand (gloveH x its size below the tip, bob and tilt included) clear of the plates. On 16:9 phones (stage h 700)
// the band between the caption and the plates is short: the glove shrinks to fit it (down to gloveMin); only when even
// that does not fit does it point from above the pill instead
const TG = { y: 0, size: 62 };
function tutGlove() {
  const T = TUNE.tutorial, C = TUNE.cap, P = TUNE.plate, cy = capY();
  const plateTop = stage.h - stage.safeBottom - P.bottom - P.h, capBot = cy + C.h / 2 + T.gloveGap;
  const size = Math.min(T.glove, (plateTop - T.gloveGap - capBot) / T.gloveH);
  if (size >= T.gloveMin) { TG.size = size; TG.y = Math.min(cy + T.gloveDy, plateTop - T.gloveGap - size * T.gloveH); }
  else { TG.size = T.glove; TG.y = cy - C.h / 2 - T.glove * 0.45; }
  return TG;
}
// the caption on show now: a one-time hint wins, then why the last call was wrong, then the tutorial; fades and pops in
// on change (HUD clock)
function updateCaption(dt) {
  let str = '', w = 0, icon = '';
  if (HINT.rec) { str = HINT.str; w = HINT.w; }
  else if (FAIL.str && FAIL.ct < TUNE.fail.capLife && phase !== PH_LAST && phase !== PH_OVER) { str = FAIL.str; w = FAIL.w; icon = 'x'; }
  else if (tutorialOn()) { tutStrings(); str = TUT.cap; w = TUT.w; icon = TUT.icon; }
  if (str && str !== capStr) { capStr = str; capT = 0; }
  if (str) { capW = w; capIcon = icon; }
  capT += dt;
  capA = str ? Math.min(1, capA + dt * TUNE.cap.fadeIn) : Math.max(0, capA - dt * TUNE.cap.fadeOut);
}
function drawCaption(ctx) {
  if (capA <= 0.01 || !capStr) return;
  const C = TUNE.cap, w = capW, h = C.h, sc = 0.7 + 0.3 * outBack(clamp(capT / C.pop, 0, 1));
  PILL_CAP.alpha = 1; PILL_CAP.icon = capIcon === 'x' ? '' : capIcon;
  PILL_CAP.textColor = capIcon === 'x' ? C.failText : undefined;
  ctx.save();
  ctx.translate(stage.w / 2, capY()); ctx.scale(sc, sc);
  ctx.globalAlpha *= capA;
  draw.roundRect(ctx, -w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, h / 2 + 1.5);
  ctx.lineWidth = C.rimW; ctx.strokeStyle = C.rim; ctx.stroke();
  drawPill(ctx, 0, 0, w, h, capStr, PILL_CAP);
  ctx.restore();
}

// ---------------------------------------------------------------- verdicts
// a pick for the guest that is NOT at the rope yet: buffered only when that guest is already decidable from the screen
// (the poster for its rule is up, it stood in view - at slot 1 for bufferSeen s, or a walker past bufferWalk of its walk
// - with any shapeshift popped, and no one-time hint is due for it)
function bufferable() {
  if (!posterReady()) return null;
  let r = null;
  if (phase === PH_WALK) {
    r = line[0];
    if (r && r.moving && r.seen < TUNE.bufferSeen && r.mt < TUNE.bufferWalk * r.md) return null;
  } else if (phase === PH_RESOLVE && stepT >= 0 && endT < 0) {
    r = line[1];
    if (!r || r.moving || ruleFor(r.idx) !== rule || r.s1T < 0 || gt - r.s1T < TUNE.bufferSeen) return null;
  }
  if (!r || !r.shifted || r.popT >= 0 || HINT.rec || hintKind(r) !== '') return null;
  if (tutorial && r.idx < TUNE.tutorial.guests) return null;   // every glove guest is judged at the rope, with its lesson
  return r;
}
// a pick from the player (t0 = when its touch began, performance.now ms; plate = the plate it began on, -1 = a swipe /
// a key). At the rope it decides; otherwise a double-tap (begun within dblTap of the last verdict, the same way or on the
// same plate) is dropped, a pick the other way inside the buffer guard is held, and one for a decidable next guest is
// buffered
function choose(kind, t0, plate) {
  const pl = plate >= 0 ? plate : -1;
  if (phase === PH_DECIDE) return decide(kind, pl);
  if (ending()) return false;
  const now = nowMs(), st = t0 > 0 ? t0 : now;
  if (st - verdictMs < TUNE.dblTap * 1000 && (kind === verdictKind || (pl >= 0 && pl === verdictPlate))) { denyPlate(kind); return false; }
  // inside the real-time guard after a verdict: held, and applied the moment the guard runs out (update)
  const until = verdictMs + TUNE.bufferGuard * 1000;
  if (now < until) { HELD.kind = kind; HELD.at = until; HELD.t0 = st; HELD.plate = pl; return true; }
  const r = bufferable();
  if (r) {
    pending = kind; pendingPlate = pl; flashPlate(kind);
    plateRect(kind === 'in' ? 1 : 0, PR);
    r.a.look(PR.x, PR.y); r.glancing = false;           // the walker glances at the plate at once (its walk then rushes)
    return true;
  }
  denyPlate(kind);                         // not yet: the plate shakes its head
  return false;
}
function denyPlate(kind) { DENY[kind === 'in' ? 1 : 0] = 1; }
function flashPlate(kind) {
  const i = kind === 'in' ? 1 : 0;
  PFLASH[i] = 1;
  PRESS[i].v += TUNE.plate.kick;
}

// the night is over or its end is already scheduled (the final verdict, a 3rd strike): no pause, no more picks
function ending() { return phase === PH_LAST || phase === PH_OVER || endT >= 0; }
// a guest whose patience does not run (the glove tutorial, a one-time hint, practice): no patience ring, never quick
function frozenGuest(r) { return r.practice || (tutorial && r.idx < TUNE.tutorial.guests) || HINT.rec === r; }
function hasEyesClause(ru) {
  const cs = ru && ru.clauses;
  if (cs) for (let i = 0; i < cs.length; i++) if (cs[i].attr === 'eyes') return true;
  return false;
}
// a verdict / MISS landed: every touch still down began before it, so none of them may commit onto the next guest
function staleTouch() {
  HELD.kind = '';
  let any = false;
  for (let i = 0; i < TOUCHES.length; i++) {
    const T = TOUCHES[i];
    if (T.id === -1) continue;
    T.stale = true; T.zone = false; T.plate = -1; T.swipe = false; T.pause = false; T.onPlate = false; any = true;
  }
  if (!any) return;
  PRESS[0].to = 0; PRESS[1].to = 0; PAUSE.to = 0;
  lookAll(null, null);
}

// a trap liar called right: BUSTED (bounced: the fake comes off) or NICE CATCH (let in: seen through); a verdict-flipping
// shapeshifter called right: NICE CATCH
const CK_BUSTED = 1, CK_CATCH = 2;
function decide(kind, plate) {
  if (phase !== PH_DECIDE) return false;
  const r = line[0];
  if (!r) return false;
  const wantIn = kind === 'in', ok = wantIn === r.g.inside, practice = r.practice, timed = !frozenGuest(r);
  const quick = ok && timed && pat < quickQ;      // the speed bonus: inside the guest's quick par (judged before the hint ends)
  const trap = ok && !practice && isFake(r.g) && isTrapFake(rule, r.g), flip = ok && !practice && !trap && isFlipShift(r.g);
  const ck = trap ? (wantIn ? CK_CATCH : CK_BUSTED) : flip ? CK_CATCH : 0;
  if (ck === CK_BUSTED) BR.busted++;
  if (flip) BR.shiftCaught++;
  line[0] = null;
  if (!practice) resolved++;
  if (!practice && timed) timedN++;
  pending = ''; pendingPlate = -1;
  verdictAt = gt; verdictMs = nowMs(); verdictKind = kind; verdictPlate = plate >= 0 ? plate : -1;
  staleTouch();
  r.a.steadyEyes(false);
  RING.on = false;
  flashPlate(kind);
  // the drag-follow lean carries into the leave (offset + tilt), then the rope spring is free for the next guest
  r.x += DRAG.x; r.rot = dragRot(); DRAG.x = 0; DRAG.v = 0; DRAG.to = 0;
  party.sfx.whoosh(wantIn ? 1 : -1);      // world direction: IN toward the door (right), OUT away from it
  // the tutorial counts as seen once its last glove guest is decided (quitting halfway shows it again next time); the
  // attribute it taught never gets a 'new attribute' hint
  if (tutorial && r.idx >= TUNE.tutorial.guests - 1 && !profile.hasSeen('tutorial')) { profile.markSeen('tutorial'); markTaught(ruleFor(r.idx)); }
  if (HINT.rec === r) endHint(true);
  const last = !endless && !line[1] && nextIdx >= queueLen();
  if (wantIn) {
    if (!practice) letIn++;
    startAdmit(r, ok);
    if (ok) {
      if (!practice) { admitted[r.g.species]++; BAND[r.g.species] = r.g; }
      if (trap) startFakeTag(r, TUNE.bust.tagLife);   // seen through: FAKE! rides the fake part as it hops in
      onCorrect(practice, last, quick, ck);
    } else wrongAdmit(r);
  } else {
    if (!practice) bounced++;
    if (ok) { startYeet(r); if (trap) startBust(r); onCorrect(practice, last, quick, ck); }
    else wrongBounce(r);
  }
  finishGuest(last, wantIn && !ok, !wantIn && !ok);
  return true;
}
// wrongIn: a wrong admit (the queue waits a beat for the window crash; a 3rd strike's SHUT DOWN waits for the impostor's
// landing), wrongOut: a wrong bounce (the hurt walk-off clears the rope first). A 3rd strike on the FINAL guest finishes
// the night instead (LAST CALL with a hard door slam, the tier capped at bronze: no Shut Down after a whole night played)
function finishGuest(last, wrongIn, wrongOut) {
  phase = PH_RESOLVE;
  const W = TUNE.wrong;
  if (strikes >= 3 && last) { lateStrike = true; endT = wrongIn ? TUNE.endShut : TUNE.endLast; stepT = -1; }
  else if (strikes >= 3) { shutOut = true; endT = wrongIn ? TUNE.endShut : TUNE.endShutMiss; stepT = -1; }
  else if (last) { endT = wrongIn ? TUNE.endShut : TUNE.endLast; stepT = -1; }
  else stepT = TUNE.stepAt + (wrongIn ? W.beat : wrongOut ? W.sadBeat : 0);
}
// last: this was the night's final guest (a milestone then folds into the LAST CALL stamp instead of its own); quick: a
// right call inside the quick par (a small QUICK! sticker on the stamp's corner, a gold flash ring, the pill kicks; the
// streak still counts it as one call); ck: a trick caught (CK_BUSTED / CK_CATCH: its own stamp instead of NICE, the pill
// kicks). While the NEW RULES sticker is up the lane is its own: a good stamp is skipped (the sounds and kicks land)
function onCorrect(practice, last, quick, ck) {
  const C = TUNE.combo, St = TUNE.stamp, prev = combo;
  if (!practice) {
    correct++; combo++;
    if (combo > comboMax) comboMax = combo;
    if (quick) quickN++;
  }
  const c = practice ? 1 : combo;
  party.ladder(c);
  // a milestone each time the streak reaches a multiple of bloomEvery (x5 / x10 / x15...)
  const tier = Math.floor(combo / C.bloomEvery), mile = !practice && tier > Math.floor(prev / C.bloomEvery) ? Math.min(C.mile.length, tier) - 1 : -1;
  const best = endless && !practice && !bestPassed && bestN > 0 && correct > bestN, hold = newRulesLive();
  let s = null;
  if (best) { s = newBest(); if (mile >= 0) setEnergy(mile + 1); }
  else if (mile >= 0) s = milestone(mile, last, hold);
  else if (hold) s = null;
  else if (ck) s = verdictStamp(tutorialWord(ck === CK_BUSTED ? 'busted' : 'catch'), St.size + Math.min(c, St.growMax) * St.grow + TUNE.bust.size, TUNE.col.quick);
  else s = verdictStamp(label('nice'), St.size + Math.min(c, St.growMax) * St.grow, TUNE.col.nice);
  if (s && quick) stampSub(s, tutorialWord('quick'), TUNE.quick.col);
  // the sparkle + rubber thunk land with the stamp's punch-in (audio seconds: game time runs at 1 / speedK)
  const d = (s ? Math.max(0, -s.t) : St.delay) * speedK;
  party.sfx.nice(c, d);
  party.sfx.stamp(d);
  if (practice) return;
  COMBO.v += TUNE.hud.comboKick;
  if (quick) quickFx();
  if (ck) catchFx();
  BRK.t = 9;
  if (mile < 0 && combo >= C.confettiFrom && !repinComing() && !hold) {
    // a small burst out of one lower window corner (alternating), on the back layer: never over the rope guest
    const w = world.window, right = (combo & 1) === 1;
    particles.emit('confetti', right ? w.x + w.w - 22 : w.x + 22, w.y + w.h * 0.85, OV_CONF_COMBO);
  }
}
// the QUICK call's payoff: a gold flash ring + sparkles off the patience ring, a sparkle and a harder kick on the combo pill
function quickFx() {
  const S = world.slots[0], H = TUNE.hud;
  RING.flash = 1;
  particles.emit('sparkle', S.x, S.feetY - 6 * S.scale, OV_QUICK);
  particles.emit('sparkle', H.comboX, stage.safeTop + H.row, OV_QUICK_PILL);
  COMBO.v += H.quickKick;
}
// the next guest in line stands under a different rule: the poster is about to be torn down and re-revealed
function repinComing() { const r = line[1]; return !!(r && rule && ruleFor(r.idx) !== rule); }
// a trick guest (liar / shapeshifter) is next up (at a verdict, line[1] steps up to the rope and line[2] to slot 1), or a
// shapeshift just popped: a milestone then stays quiet (its stamp only), so the trick is never buried under confetti
function trickNear() {
  for (let k = 0; k < 3; k++) { const r = line[k]; if (r && r.g && (isFake(r.g) || r.g.shift)) return true; }
  return gt - shiftPopAt < 0.6;
}
// combo x5 / x10 / x15...: the ladder chord (party.ladder) rings now; the sights (a big 'xN' stamp at the window's
// centre with sticker stars, a harder bloom kick, window confetti, a hotter band) wait for a re-pinned rule's landing,
// and on the final guest they fold into the LAST CALL stamp (lastCall reads MILE.last); while the NEW RULES sticker is
// up (hold) the sights play without a stamp. Returns the stamp (null: none now)
function milestone(k, last, hold) {
  const n = Math.floor(combo / TUNE.combo.bloomEvery) * TUNE.combo.bloomEvery;   // the multiple reached
  MILE.last = last ? combo : -1;
  if (last) { setEnergy(k + 1); return null; }
  if (repinComing()) { MILE.k = k; MILE.n = n; setEnergy(k + 1); return null; }
  return milestoneFx(k, n, trickNear(), hold);
}
// quiet: a trick guest is near (the stamp + the band only: no stars, confetti or bloom kick); noStamp: the lane belongs
// to NEW RULES (a milestone that waited for a rule change's landing: the sights and the combo pill's kick only)
function milestoneFx(k, n, quiet, noStamp) {
  const C = TUNE.combo, St = TUNE.stamp, w = world.window, x = w.x + w.w / 2, y = w.y + w.h * C.wy;
  let s = MILE_WORDS[n];
  if (s === undefined) { s = 'x' + n; MILE_WORDS[n] = s; }
  const st = noStamp ? null : laneVerdict(s, x, y, C.mile[k], TUNE.col.last, St.plate, St.life + 0.25);
  if (noStamp) COMBO.v += TUNE.hud.quickKick;
  particles.emit('sparkle', TUNE.hud.comboX, stage.safeTop + TUNE.hud.row, OV_SPARK);
  if (!quiet) {
    particles.emit('stars', x, y - 6, OV_MILE_STARS[k]);
    particles.emit('confetti', w.x + 22, w.y + w.h * 0.85, OV_CONF_MILE[k]);
    particles.emit('confetti', w.x + w.w - 22, w.y + w.h * 0.85, OV_CONF_MILE[k]);
    bloomK = C.mileBloom[k];
  }
  input.vibrate(12);
  setEnergy(k + 1);
  return st;
}
// the All-Nighter passed its best: NEW BEST slams at the party window (the milestone path: stars, confetti, bloom) with
// the gold stinger, and the ghost 'best' pill pops gold and goes
function newBest() {
  const C = TUNE.combo, St = TUNE.stamp, w = world.window, x = w.x + w.w / 2, y = w.y + w.h * C.wy;
  bestPassed = true; bestT = 0;
  const st = laneVerdict(word('best_stamp'), x, y, C.mile[1], TUNE.col.last, St.plate, St.life + 0.5);
  particles.emit('stars', x, y - 6, OV_MILE_STARS[1]);
  particles.emit('confetti', w.x + 22, w.y + w.h * 0.85, OV_CONF_MILE[1]);
  particles.emit('confetti', w.x + w.w - 22, w.y + w.h * 0.85, OV_CONF_MILE[1]);
  particles.emit('sparkle', TUNE.hud.pillX, stage.safeTop + TUNE.hud.row + TUNE.hud.best.dy, OV_SPARK);
  bloomK = C.mileBloom[1];
  party.stinger('gold');
  input.vibrate(20);
  return st;
}
// the band's energy follows the combo tier (0 = base): only on a change (party ramps it)
function setEnergy(tier) {
  if (tier === energyTier) return;
  energyTier = tier;
  party.intensity(TUNE.combo.energy[tier]);
}
// a streak ends: from breakFrom+ the pill drops grey with a low thud (it keeps showing the old streak as it goes)
function breakCombo() {
  if (combo >= TUNE.combo.breakFrom) {
    BRK.t = 0; BRK.last = comboStr;
    if (!profile.settings || profile.settings.sfx !== false) audio.kick(BREAK_THUD);
  }
  combo = 0;
  setEnergy(0);
}
// a strike lamp pops out (wrong admit, or an All-Nighter MISS)
function popLamp() {
  const i = clamp(strikes - 1, 0, 2), H = TUNE.hud;
  LAMPS[i].x = H.lampPop; LAMPS[i].v = 0; LFLASH[i] = 1;
  particles.emit('playShards', H.lamps[i], stage.safeTop + H.row - 2);
}
// the guest's fake part ('eyes' / 'hat' / 'tail'; '' = none)
function fakePart(g) { const f = g.fake; return !f ? '' : f.eyes ? 'eyes' : f.hat ? 'hat' : f.tail ? 'tail' : ''; }
// the wrong-call lesson, one cause that never contradicts the caption (strings.failHint):
//   wrong admit  -> the clause its REAL state breaks pops with a red-cross badge (the ring keeps its polarity colour) and
//                   that part of the guest is ringed (a dashed outline where a MISSING 'must have' hat / tail should be);
//                   a trap fake on that very part instead gets the ring + a FAKE! tag on the fake prop
//   wrong bounce -> every clause pops green-checked (its real state passed them all); the part that fooled the eye is
//                   ringed: a trap fake (+ the FAKE! tag) or a verdict-flipping shapeshift; else nothing on it is ringed
function markFail(r, wasAdmit) {
  const g = r.g, cs = rule.clauses, fa = fakePart(g), trap = fa !== '' && isTrapFake(rule, g);
  let attr = '', ci = -2, missing = false, tag = false;
  if (wasAdmit) {
    const c = firstFail(rule, g);
    ci = -1;
    if (c) {
      for (let i = 0; i < cs.length; i++) if (cs[i] === c) { ci = i; break; }
      attr = c.attr;
      if (trap && fa === c.attr) tag = true;
      else missing = c.has !== false && ((c.attr === 'hat' && g.hat === 'none') || (c.attr === 'tail' && !g.tail));
    }
  } else if (trap) { attr = fa; tag = true; }
  else if (g.shift && isFlipShift(g)) attr = g.shift.attr;
  FAIL.rule = rule; FAIL.ci = ci; FAIL.t = 0;
  FAIL.rec = attr ? r : null; FAIL.part = attr; FAIL.rt = 0; FAIL.missing = missing; FAIL.fake = tag;
  if (tag) startFakeTag(r);
  // the one-line why in the caption slot (built once per wrong verdict; rebuilt after a language change)
  FAIL.g = g; FAIL.admit = wasAdmit;
  FAIL.str = failHint(rule, g, wasAdmit); FAIL.w = FAIL.str ? capWidth(FAIL.str) : 0; FAIL.ct = 0;
}
function wrongAdmit(r) {
  if (!r.practice) { wrongAdmits++; breakCombo(); }
  party.sfx.oops();
  party.detune(TUNE.wrong.detuneMs);
  verdictStamp(label('oops'), TUNE.stamp.size, TUNE.col.oops, TUNE.col.oopsPlate);
  input.vibrate(HAPTIC_WRONG);
  camera.addTrauma(TUNE.wrong.early);
  markFail(r, true);
  if (r.practice) return;
  strikes++;
  popLamp();
  trySecond(r);                            // an armed Second Chance takes the strike back (the lamp relights on the landing)
}
// an All-Nighter strike that is not a wrong admit (a MISS, a wrong bounce): the lamp pops, the room takes the hit now
function sideStrike(n) {
  strikes = Math.min(3, strikes + n);
  popLamp();
  party.sfx.strike();
  world.degrade(strikes);
  camera.addTrauma(TUNE.wrong.missTrauma);
  post.pulse(PULSE_SOFT);
  input.vibrate(HAPTIC_WRONG);
}
// the impostor lands in the doorway: the crowd groans, the room takes the hit (the lamp falls, the band flinches, the
// lamp's crash) under a red flash (practice: only the groan and the sting)
function wrongImpact(r) {
  const W = TUNE.wrong;
  post.pulse(r.practice ? PULSE_SOFT : PULSE_WRONG);
  camera.flash(W.flash, W.flashA, W.flashMs);
  party.sfx.groan();                     // deduped against the groan sfx.door(false, landIn) scheduled for this frame
  if (r.practice) return;
  if (r.saved) {                         // Second Chance: the lamp that broke on the verdict relights, the room is spared
    r.saved = false; SC.wait = false;
    if (SC.lamp >= 0) relightLamp(SC.lamp, true);
    camera.addTrauma(W.early);
    return;
  }
  world.degrade(strikes < 3 ? strikes : 3);
  party.sfx.strike();
  camera.addTrauma(W.trauma);
}
function wrongBounce(r) {
  if (!r.practice) { wrongBounces++; breakCombo(); }
  party.sfx.oops();
  party.sfx.aww(r.g.species, TUNE.off.aww * speedK);   // the guest's hurt "a-aww": the guilty beat
  verdictStamp(label('oops'), TUNE.stamp.small, TUNE.col.oops, TUNE.col.oopsPlate);
  post.pulse(PULSE_SOFT);
  input.vibrate(14);
  markFail(r, false);
  // the All-Nighter: bouncing a guest who belonged inside costs a strike too (data's bounceStrike: else OUT on everyone
  // never ends the run)
  if (endless && !r.practice && bounceStrike > 0) sideStrike(bounceStrike);
  startOff(r, OFF_SAD);
}
function miss() {
  const r = line[0];
  if (!r) return;
  line[0] = null;
  missed++; resolved++; timedN++; pending = ''; pendingPlate = -1; verdictAt = gt; verdictMs = nowMs(); verdictKind = ''; verdictPlate = -1;
  staleTouch();
  r.a.steadyEyes(false);
  RING.on = false;
  breakCombo();
  DRAG.x = 0; DRAG.v = 0; DRAG.to = 0;
  if (HINT.rec === r) endHint(false);
  verdictStamp(word('miss'), TUNE.stamp.small, TUNE.col.oops, TUNE.col.oopsPlate);
  if (endless && missStrike > 0) sideStrike(missStrike);   // the All-Nighter: waiting one out is a strike (data's missStrike)
  startOff(r, OFF_WALK);
  finishGuest(!endless && !line[1] && nextIdx >= queueLen(), false, false);
}

// ok = a right call: hop + spin, the amber flash, the door's cheer and the guest's happy blip. A WRONG admit is never
// staged like a right one: the impostor first holds smugly at the rope (a snicker; the WHY ring + badge read on it), then
// the door creaks open (no cheer, no swell, no starburst, no amber flash) and it sneaks in (the sly tiptoe, a look back
// with a wink, the costume flapping off at the threshold); as it lands the crowd groans and the lamp falls (wrongImpact)
function startAdmit(r, ok) {
  const A = TUNE.admit;
  r.mode = M_ADMIT; r.t = ok ? 0 : -A.wrongHold; r.x0 = r.x; r.y0 = r.y; r.s0 = r.s; r.inside = false; r.joined = false; r.landed = false;
  r.ok = ok; r.closeT = -1; r.moving = false; r.sneaking = ok;
  r.a.setPatience(0);
  if (ok) {
    r.a.setState('admit');
    party.sfx.door(true);
    world.openDoor(A.flyDelay + A.hop);
    party.sfx.voice(r.g.species);
    input.vibrate(8);
    camera.flash('#ffb347', A.flash, A.flashMs);
  } else {
    r.a.setState('idle');
    r.a.look(stage.w * 0.5, stage.h);     // a smug look out at the player
    party.sfx.snicker(r.g.species);
  }
}
// the smug hold is over: the door creaks open and the impostor sneaks in (the crowd's groan is scheduled for its landing)
function startSneak(r) {
  const A = TUNE.admit;
  r.sneaking = true;
  r.a.look(null, null);
  r.a.setState('admit', SNEAK);
  world.openDoor();
  party.sfx.door(false, (A.flyDelay + A.hop) * speedK);
}
// a bounced guest always flies away from the door (left-hand mode only swaps the plates, never the street); the launch
// hit is scheduled now for the launch frame (audio seconds, panned toward where it flies), updateLeaver re-asks on that
// frame (deduped) and the twinkle plays where it leaves the screen (sfx.yeetLand)
function startYeet(r) {
  const Y = TUNE.yeet, dir = Y.dir;
  r.mode = M_YEET; r.t = 0; r.launched = false; r.pinged = false; r.dir = dir; r.moving = false; r.s0 = r.s; r.over = 1;
  r.a.setPatience(0);
  r.a.setState('yeet', dir < 0 ? YEET_L : YEET_R);
  party.sfx.yeet(Y.launch * speedK, Y.pan * dir);
}
// how a guest leaves on foot: OFF_WALK (a MISS: it gives up and walks off left), OFF_SAD (a wrong bounce: droops at the
// rope in tears, then shuffles off left along the street, looking back at the door), OFF_TRUDGE (SHUT DOWN: the queue
// trudges off left)
const OFF_WALK = 0, OFF_SAD = 1, OFF_TRUDGE = 2;
function startOff(r, kind) {
  const O = TUNE.off;
  r.mode = M_OFF; r.t = 0; r.moving = false; r.flip = true; r.alpha = 1; r.sad = kind === OFF_SAD; r.walkSet = false;
  r.a.setPatience(0);
  if (kind === OFF_SAD) {
    r.vx = O.sadVx; r.vy = O.sadVy; r.t = -O.droop;
    r.a.setState('sad', SAD_STAND);
    r.a.look(r.x - 10, stage.h);          // hurt, it looks down and out at the player
  }
  else if (kind === OFF_TRUDGE) { r.vx = O.trudgeVx; r.vy = O.trudgeVy; r.a.setState('sad', SAD_WALK); }
  else { r.vx = O.vx; r.vy = O.vy; r.a.setState('walk'); }
}
// the flyer's pose at r.t: hop over the rope to the threshold (arc), then IN through the doorway (clipped)
function flyPose(r) {
  const A = TUNE.admit, d = world.door, u = clamp((r.t - A.flyDelay) / A.hop, 0, 1), e = inOutSine(u), ex = 1 - Math.pow(1 - u, A.lead);
  const tx = d.x + d.w * 0.5, ty = d.y + d.h + 2, s1 = r.s0 * A.flyScale;
  if (u < 1) {
    r.inside = false;
    r.x = lerp(r.x0, tx, ex); r.y = lerp(r.y0, ty, e) - Math.sin(u * Math.PI) * A.arc; r.s = lerp(r.s0, s1, ex);
  } else {
    const v = clamp((r.t - A.flyDelay - A.hop) / A.inside, 0, 1), ev = outCubic(v);
    if (!r.inside) r.a.setState('walk');
    r.inside = true;
    r.x = tx; r.y = ty - A.deep * ev; r.s = lerp(s1, r.s0 * A.inScale, ev);
  }
}
// admits still on their way in (not yet fully inside the doorway), and the longest time until the last is inside
function admitsInFlight(except) {
  let n = 0;
  for (let i = 0; i < POOL.length; i++) { const r = POOL[i]; if (r.on && r.mode === M_ADMIT && r.closeT === -1 && r !== except) n++; }
  return n;
}
function admitsInsideIn() {
  const A = TUNE.admit, end = A.flyDelay + A.hop + A.inside;
  let w = 0;
  for (let i = 0; i < POOL.length; i++) { const r = POOL[i]; if (r.on && r.mode === M_ADMIT && r.closeT === -1) w = Math.max(w, end - r.t); }
  return w;
}
// the newest dancer of a species in the party window (world.admit just added it)
function newestDancer(species) {
  const ds = world.dancers;
  let best = null;
  if (!ds) return null;
  for (let i = 0; i < ds.length; i++) { const d = ds[i]; if (d.species === species && (!best || d.id > best.id)) best = d; }
  return best;
}
// a dancer's body centre in world space (room units -> the window), into XY
function dancerXY(d) {
  const w = world.window, k = w.w / WORLD_TUNE.room.RW;
  XY.x = w.x + d.x * k; XY.y = w.y + (d.y - 30 * d.s / 0.36) * k;
  return XY;
}
function joinBand(r) {
  world.admit(r.a);
  party.setLayer(r.g.species, true);
  const d = world.door;
  JOIN.d = newestDancer(r.g.species); JOIN.sp = r.g.species; JOIN.x0 = d.x + d.w * 0.5; JOIN.y0 = d.y + 10; JOIN.t = 0; JOIN.hit = false;
}
function updateJoin(dt) {
  JOIN.glass = Math.max(0, JOIN.glass - dt * 1000 / TUNE.join.glassMs);
  if (JOIN.hit || !JOIN.d) return;
  const J = TUNE.join;
  JOIN.t += dt;
  const u = clamp(JOIN.t / J.comet, 0, 1), e = inOutSine(u), p = dancerXY(JOIN.d);
  const hx = lerp(JOIN.x0, p.x, e), hy = lerp(JOIN.y0, p.y, e) - Math.sin(u * Math.PI) * J.arc;
  particles.emit('sparkle', hx, hy, OV_COMET);
  if (u >= 1) {
    JOIN.hit = true; JOIN.glass = 1;
    particles.emit('sparkle', p.x, p.y, OV_JOIN);
    for (let i = 0; i < J.notes; i++) addNote(p.x, p.y, i);
    party.sfx.join(JOIN.sp);              // the band grew, audibly: its instrument's one-shot on the next 8th
  }
}
function addNote(x, y, i) {
  let n = null;
  for (let k = 0; k < NOTES.length; k++) if (!NOTES[k].on) { n = NOTES[k]; break; }
  if (!n) return;
  const J = TUNE.join;
  n.on = true; n.x = x + (i - 1) * 6; n.y = y; n.vx = (i - 1) * J.noteSpread + (Math.random() - 0.5) * 8; n.t = -i * 0.06; n.k = i % 3;
  n.wob = Math.random() * TAU;
}
function updateLeaver(r, dt) {
  const A = TUNE.admit;
  r.t += dt;
  if (r.rot !== 0) { r.rot *= Math.exp(-dt * TUNE.drag.leaveDecay); if (Math.abs(r.rot) < 0.002) r.rot = 0; }
  if (r.mode === M_ADMIT) {
    if (!r.sneaking && r.t >= 0) startSneak(r);
    flyPose(r);
    const end = A.flyDelay + A.hop + A.inside;
    if (!r.landed && r.t >= A.flyDelay + A.hop) { r.landed = true; if (!r.ok) wrongImpact(r); }
    // the band join starts while it steps through the doorway: the comet lands (and the dancer pops in) as it vanishes
    if (!r.joined && r.t > end - TUNE.join.comet) { r.joined = true; if (r.ok) joinBand(r); }
    if (r.closeT === -1 && r.t > end) r.closeT = A.closeAfter;
    if (r.closeT >= 0) {
      r.closeT -= dt;
      if (r.closeT < 0) { r.closeT = -2; if (admitsInFlight(r) === 0 && phase !== PH_LAST) world.closeDoor(); }
    }
    if (r.closeT === -2 && (world.door.open < 0.08 || r.t > A.free)) { freeRec(r); return; }
  } else if (r.mode === M_YEET) {
    const Y = TUNE.yeet;
    if (!r.launched && r.t >= Y.launch) {
      r.launched = true;
      loop.hitstop(Y.hitstop);
      camera.kick(r.dir * Y.kick, Y.kickY);
      camera.punch(Y.punch, Y.punchMs);
      party.sfx.launch(r.dir * 0.5);      // the hit under the impact frame (silent when sfx.yeet already scheduled it)
      particles.emit('playKick', r.x, r.y, OV_DUST);
      // a few short stars off the body's trailing side: nothing lingers where the next guest's head will be
      particles.emit('stars', r.x - r.dir * Y.starDx * r.s, r.y - Y.starDy * r.s, OV_STARS_YEET);
      input.vibrate(14);
      if (BUST.rec === r) bustRip(r);     // BUSTED: the fake comes off with a tear (the actor drops it this same frame)
    }
    if (r.launched) {
      // the anchor drifts back toward the door while it flies (a higher, slower arc over the queue)
      if (r.t - Y.launch < Y.driftDur) r.x -= r.dir * Y.drift * dt;
      // going away: the body shrinks over its flight; where it leaves the screen it pings like a star
      r.s = r.s0 * lerp(1, Y.shrink, inOutSine(clamp((r.t - Y.launch) / Y.shrinkDur, 0, 1)));
      const c = r.a.anchor('center');
      // over the rule poster the flyer dims, so the card stays readable for the next decision; the props it knocked off
      // (bouncing on the street) fade out debrisAt s after the launch
      r.over += ((overPoster(c.x, c.y, Y.overPad) ? Y.overA : 1) - r.over) * (1 - Math.exp(-dt * Y.overRate));
      const since = r.t - Y.launch;
      r.alpha = r.over * (r.pinged ? 1 - smoothstep(Y.debrisAt, Y.debrisAt + Y.debrisFade, since) : 1);
      if (!r.pinged) {
        const e = Y.pingEdge;
        if (c.x < -e || c.x > stage.w + e || c.y < -e || r.t > Y.pingLate) {
          r.pinged = true;
          addPing(clamp(c.x, Y.pingIn, stage.w - Y.pingIn), clamp(c.y, stage.safeTop + Y.pingIn, stage.h - Y.pingIn));
        }
      }
      if (r.pinged && since >= Y.debrisAt + Y.debrisFade) { freeRec(r); return; }
    }
    if (r.a.finished || r.t > Y.life) { freeRec(r); return; }
  } else if (r.mode === M_OFF) {
    const O = TUNE.off;
    if (r.t >= 0) {
      if (r.sad && !r.walkSet) {             // the droop is over: it shuffles off hurt, looking back at the door
        const d = world.door;
        r.walkSet = true; r.a.setState('sad', SAD_WALK); r.a.look(d.x + d.w * 0.5, d.y + d.h * 0.45);
      }
      r.x += r.vx * dt; r.y += r.vy * dt;
      r.s += r.s * (r.sad ? O.sadGrow : O.grow * Math.abs(r.vx)) * dt;
    }
    r.alpha = r.sad ? 1 : 1 - smoothstep(O.fadeA, O.fadeB, r.t);
    if (r.x < stage.screenL - 70 * r.s || r.y > stage.h + 60 || r.alpha <= 0) { freeRec(r); return; }
  }
  r.a.update(dt);
}
// a walk-off that has cleared the rope draws in the queue layer (never over the next guest at the rope); the hurt
// walk-off heads for the camera and stays in front
function offBehind(r) { return r.mode === M_OFF && !r.sad && r.x < world.slots[0].x - TUNE.off.behind; }
// is world point (x, y) over the nailed rule poster's card (pad units of slack)?
function overPoster(x, y, pad) {
  if (!rule) return false;
  const P = world.poster, m = posterMetrics(rule), hw = m.w * 0.5 * P.scale + pad;
  return x > P.x - hw && x < P.x + hw && y > P.y - pad && y < P.y + m.foot * P.scale + pad;
}
function addPing(x, y) {
  let p = null;
  for (let i = 0; i < PINGS.length; i++) if (!PINGS[i].on) { p = PINGS[i]; break; }
  if (!p) p = PINGS[0];
  p.on = true; p.x = x; p.y = y; p.t = 0; p.spin = Math.random() < 0.5 ? -1 : 1;
  particles.emit('sparkle', x, y, OV_PING);
  particles.emit('ring', x, y, OV_PING_RING);
  particles.emit('playKick', x, y, OV_PING_DUST);           // the landing puff off-screen: dust + stars
  particles.emit('stars', x, y, OV_PING_STARS);
  party.sfx.yeetLand(x < stage.w / 2 ? -1 : 1);            // the off-screen impact, on this frame
}

// ---------------------------------------------------------------- LAST CALL / SHUT DOWN + result
// tween camera.base so world point (fx, fy) lands on screen (sx, sy) at `zoom`, never showing past the world's overscan
function dollyTo(fx, fy, sx, sy, zoom, ms) {
  const cx = stage.w / 2, cy = stage.h / 2, pad = TUNE.lastcall.pad;
  let bx = (sx - cx) - zoom * (fx - cx), by = (sy - cy) - zoom * (fy - cy);
  bx = clamp(bx, cx - zoom * (stage.w + pad - cx), zoom * (pad + cx) - cx);
  by = clamp(by, cy - zoom * (stage.h + pad - cy), zoom * (pad + cy) - cy);
  DOLLY.x = bx; DOLLY.y = by; DOLLY.zoom = zoom; DOLLY_IN.dur = ms;
  tween(camera.base, DOLLY, DOLLY_IN);
}
function resetDolly() {
  tweens.killTarget(camera.base);
  camera.base.x = 0; camera.base.y = 0; camera.base.zoom = 1;
}
// LAST CALL's dolly: the largest zoom (zoomMin .. zoomMax) that keeps the band row across the screen (its stage dancers'
// extent around the window's centre, bandKeep of the outer members, + bandPad; the window's middle bandW share while
// nobody plays) and the window under fill x H; the window's middle lands at sy x H, its top under the HUD row
function dollyLast() {
  const L = TUNE.lastcall, w = world.window, ds = world.dancers, cx = w.x + w.w / 2, k = w.w / WORLD_TUNE.room.RW;
  let half = w.w * L.bandW * 0.5;
  if (ds) {
    let ext = 0;
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (!d.band) continue;
      const p = dancerXY(d), b = d.actor ? d.actor.bounds() : null, hw = (b ? b.w * 0.5 : 50) * d.s * k;
      ext = Math.max(ext, Math.abs(p.x - cx) + hw * L.bandKeep);   // at least bandKeep of the outer members in frame
    }
    if (ext > 0) half = ext;
  }
  const zw = stage.w / (2 * (half + L.bandPad)), zh = L.fill * stage.h / w.h;
  const zoom = clamp(Math.min(zw, zh), L.zoomMin, L.zoomMax);
  // the window's middle at sy x H (the marquee and the night above it, the LAST CALL stamp and the confetti rain over
  // the street below), its top never under the HUD row
  const sy = Math.max(stage.h * L.sy, stage.safeTop + L.top + w.h * zoom * 0.5);
  dollyTo(cx, w.y + w.h * 0.5, stage.w / 2, sy, zoom, L.dollyMs);
}
function lastCall() {
  const L = TUNE.lastcall, Sh = TUNE.shut, shut = shutOut;
  phase = PH_LAST; lcT = 0; stepT = -1; endT = -1; pending = ''; plateOffT = 0;
  staleTouch();
  PRESS[0].to = PRESS[1].to = 0; DRAG.to = 0; RING.on = false;
  for (let k = 3, j = 0; k >= 0; k--) {
    const r = line[k];
    if (!r) continue;
    r.a.setPatience(0); r.a.setState(shut ? 'sad' : 'cheer');
    r.leaveAt = shut ? Sh.trudgeAt + (j++) * Sh.trudgeGap : -1;
  }
  LC.on = true; LC.shut = shut; LC.t = 0; LC.bulbs = 0; LC.hard = lateStrike;
  // one stamp owns the moment: the lane empties (and the FAKE! tag), and a milestone on the final verdict rides under it
  clearStamps(); FTAG.t = 9; NEWR.out = TUNE.stamp.out;
  LC.sub = '';
  if (!shut && MILE.last > 0) { let s = MILE_WORDS[MILE.last]; if (s === undefined) { s = 'x' + MILE.last; MILE_WORDS[MILE.last] = s; } LC.sub = s; }
  if (HINT.rec) endHint(false);
  input.vibrate(shut ? HAPTIC_SHUT : 40);
  const w = world.window, d = world.door, wait = admitsInsideIn();   // a guest still stepping in: the door waits for it
  energyTier = -1;                        // the stinger owns the band's energy from here (swell / die)
  if (shut) {
    // SHUT DOWN: the band dies, the door slams, the lights go out one by one, no confetti; the stamp slams over the street
    // once the sweep has mostly run, then the queue trudges off
    LC.word = tutorialWord('shut_stamp'); LC.col = Sh.col; LC.plate = Sh.plate; LC.rot = Sh.rot; LC.size = Sh.size;
    LC.tapeKey = 'play-tape-' + i18n.lang; LC.tapeW = d.w * Sh.tapeW;
    party.stinger('shut');
    if (wait > 0) slamDoorT = wait + TUNE.admit.closeAfter;
    else { if (world.door.open > 0.15) world.closeDoor(); slamDoorT = -1; doorSlam(true); }
    camera.flash(Sh.flash, 0.5, 200);
    camera.addTrauma(Sh.trauma);
    world.degrade(3);
    dollyTo(d.x + d.w * 0.5, d.y + d.h * Sh.fy, stage.w / 2, stage.h * Sh.sy, Sh.zoom, L.dollyMs);
    // Boss, Reopen!: a story night with guests still waiting holds here (the queue stays in line) for the offer
    REO.hold = reopenOffer(); REO.asked = false; REO.extra = 0; REO.on = false;
  } else {
    // the ending follows the night's tier: a PERFECT NIGHT goes bigger, a night that did not pass ends muted (the result
    // card that follows says why) - never a full celebration over a 'Get 9 right to pass'
    const tier = endTier(), gold = tier === 'gold', rope = tier === 'rope';
    LC.tier = tier; LC.goldAt = -1;
    LC.word = gold ? tutorialWord('lc_perfect') : label('lastcall'); LC.plate = gold ? L.goldPlate : L.plate; LC.rot = 0;
    LC.col = gold ? L.goldCol : rope ? TUNE.col.oops : TUNE.col.last;
    LC.size = fitStamp(LC.word, lcSize(tier));
    if (rope) {
      // muted: no stinger swell, no confetti burst, no encore; the band stays at its base energy, the door stays shut, a
      // cream stamp and a quick cut to the result
      lcTo = L.ropeTo;
      party.intensity(TUNE.combo.energy[0]);
      party.sfx.stamp(0.04 * speedK);
      if (wait > 0) slamDoorT = wait + TUNE.admit.closeAfter;
      else if (world.door.open > 0.15) { world.closeDoor(); slamDoorT = -1; doorSlam(LC.hard); }
      else slamDoorT = -1;
      camera.flash('#fff1d6', L.ropeFlash * L.flash, L.flashMs);
      lcBloom = L.ropeBloom;
    } else {
      // the hold's second beat is the world's encore on a downbeat: the result cuts in afterEncore s after it lands
      const enc = world.celebrate(gold ? 3 : tier === 'silver' ? 2 : 1);
      lcTo = clamp((typeof enc === 'number' && enc >= 0 ? enc : L.toResult - L.afterEncore) + L.afterEncore, L.toMin, L.toMax);
      party.stinger('lastcall');
      if (gold) LC.goldAt = L.goldAt;      // the gold stinger rings in over the brass (updateLast)
      if (wait > 0) slamDoorT = Math.max(wait + TUNE.admit.closeAfter, L.slamAt);
      else if (world.door.open > 0.15) { world.closeDoor(); slamDoorT = -1; doorSlam(LC.hard); }
      else { world.openDoor(); slamDoorT = L.slamAt; }
      camera.flash(gold ? '#fff3c4' : '#fff1d6', L.flash, L.flashMs);
      camera.addTrauma(L.trauma);
      camera.punch(L.punch, 220);
      // confetti out of the window's lower corners (the street drops out of frame under the dolly); gold: goldConf x
      const n = gold ? L.goldConf : 1;
      for (let i = 0; i < n; i++) {
        particles.emit('confetti', w.x + 24, w.y + w.h * 0.8, OV_CONF_BIG);
        particles.emit('confetti', w.x + w.w - 24, w.y + w.h * 0.8, OV_CONF_BIG);
      }
      particles.emit('stars', w.x + w.w / 2, w.y + w.h * 0.6, OV_STARS);
      if (gold) particles.emit('stars', w.x + w.w / 2, w.y + w.h * 0.35, OV_MILE_STARS[2]);
      lcBloom = 1;
    }
    dollyLast();                          // the band fills the frame for the last bars
  }
}
// the night's tier as the result will show it (3 strikes on the final guest cap it at bronze)
function endTier() {
  let tier = tierFor(correct, endless ? resolved : total, shutOut);
  if (lateStrike && !endless && (tier === 'gold' || tier === 'silver')) tier = 'bronze';
  return tier;
}
function lcSize(tier) { const L = TUNE.lastcall; return tier === 'gold' ? L.goldSize : tier === 'rope' ? L.ropeSize : L.size; }
// the LAST CALL stamp's size for word: `size`, or smaller so its plate (and its beat pulse) stays on screen
function fitStamp(w, size) {
  const L = TUNE.lastcall, hw = stampHalfW(w, size) * (1 + L.pulse), max = stage.w * 0.5 - L.edge;
  return hw > max ? Math.floor(size * max / hw) : size;
}
function doorSlam(hard) {
  const d = world.door;
  particles.emit('playKick', d.x + d.w * 0.5, d.y + d.h, hard ? OV_SLAM : undefined);
  if (hard) particles.emit('dust', d.x + d.w * 0.5, d.y + d.h - 4, OV_SLAM);
  party.sfx.poster();
}
function updateLast(dt) {
  const Sh = TUNE.shut;
  if (REO.on) { updateReopen(dt); return; }
  lcT += dt; LC.t += dt;
  // Boss, Reopen!: the lights, the tape and the stamp play out; the queue waits in line and the cut waits for the answer
  if (REO.hold && !REO.asked && LC.t >= TUNE.reopen.holdAt + TUNE.reopen.panelAt) openPanel('reopen', '');
  if (slamDoorT >= 0) { slamDoorT -= dt; if (slamDoorT < 0) { world.closeDoor(); doorSlam(LC.shut || LC.hard); } }
  if (LC.goldAt >= 0 && LC.t >= LC.goldAt) {   // a perfect night: the gold stinger and a sparkle crown on the stamp
    LC.goldAt = -1;
    party.stinger('gold');
    const w = world.window;
    particles.emit('sparkle', w.x + w.w * 0.3, w.y + w.h, OV_SPARK);
    particles.emit('sparkle', w.x + w.w * 0.7, w.y + w.h, OV_SPARK);
  }
  if (LC.shut) {
    const n = Math.min(Sh.cols, Math.floor(LC.t / Sh.bulb));
    while (LC.bulbs < n) {                  // the next column of window lights dies with a spark
      const w = world.window, x = w.x + (LC.bulbs + 0.5) * w.w / Sh.cols;
      particles.emit('sparkle', x, w.y + w.h * 0.3, OV_BULB);
      LC.bulbs++;
    }
    // the queue gives up: from the back of the line forward (leaveAt set by lastCall), each turns and trudges off left
    if (!REO.hold) for (let k = 0; k < 4; k++) { const r = line[k]; if (r && r.leaveAt >= 0 && LC.t >= r.leaveAt) { line[k] = null; startOff(r, OFF_TRUDGE); } }
  }
  if (!REO.hold && lcT >= (LC.shut ? TUNE.lastcall.toResult + REO.extra : lcTo)) goResult();
}
// the window lights die left to right (SHUT DOWN): dark columns over the glass, clipped to the arch
function drawLightsOut(ctx) {
  if (!LC.on || !LC.shut) return;
  const Sh = TUNE.shut, w = world.window, cw = w.w / Sh.cols, k = LC.t / Sh.bulb;
  if (k <= 0) return;
  ctx.save();
  draw.roundRect(ctx, w.x, w.y, w.w, w.h, [w.arch, w.arch, 4, 4]); ctx.clip();
  ctx.fillStyle = '#06041a';
  // a Reopen brings the columns back right to left
  const back = REO.on ? (REO.t - TUNE.reopen.light) / TUNE.reopen.bulb : -1;
  for (let i = 0; i < Sh.cols; i++) {
    let a = clamp(k - i, 0, 1);
    if (a <= 0) break;
    if (back > 0) a *= 1 - clamp(back - (Sh.cols - 1 - i), 0, 1);
    if (a <= 0.01) continue;
    ctx.globalAlpha = Sh.dark * a;
    ctx.fillRect(w.x + i * cw - 0.5, w.y, cw + 1, w.h);
  }
  ctx.restore();
}
function bakeTape(c, W, H, str) {
  const Sh = TUNE.shut;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(3, 5, W - 4, H - 6);
  c.fillStyle = '#ffd23f'; c.fillRect(2, 2, W - 4, H - 6);
  c.fillStyle = '#1d1840';
  for (let x = -H; x < W; x += 16) { c.beginPath(); c.moveTo(x, H - 4); c.lineTo(x + 7, H - 4); c.lineTo(x + 7 + H - 6, 2); c.lineTo(x + H - 6, 2); c.closePath(); c.fill(); }
  c.fillStyle = '#ffd23f'; c.fillRect(2 + H * 0.35, 4.5, W - 4 - H * 0.7, H - 11);
  c.lineWidth = 1.5; c.strokeStyle = '#1d1840'; c.strokeRect(2, 2, W - 4, H - 6);
  c.restore();
  if (str) draw.text(c, str, W / 2, H / 2 - 1, { size: Sh.tapeText, weight: 800, color: '#1d1840', maxWidth: W - H });
}
function bakeTapePlain(c, W, H) { bakeTape(c, W, H, ''); }
function bakeTapeLabel(c, W, H) { bakeTape(c, W, H, tutorialWord('closed')); }
// the CLOSED tape: two strips slap across the door (an X), the labelled one on top
function drawTape(ctx) {
  if (!LC.on || !LC.shut) return;
  const Sh = TUNE.shut, u = (LC.t - Sh.tapeAt) / Sh.tapeDrop;
  if (u <= 0) return;
  const d = world.door, W = Math.round(LC.tapeW), H = Sh.tapeH, e = outBack(clamp(u, 0, 1)), a = clamp(u * 3, 0, 1);
  const cx = d.x + d.w * 0.5, cy = d.y + d.h * 0.42;
  const plain = draw.cached('play-tape-plain', W, H, bakeTapePlain);
  const lab = draw.cached(LC.tapeKey, W, H, bakeTapeLabel);
  // a Reopen tears both strips off: they fly apart (up and out, spinning) and fall away
  const R = TUNE.reopen, ft = REO.on ? REO.t - R.tape : -1;
  const fx = ft > 0 ? R.tapeVx * ft : 0, fy = ft > 0 ? -R.tapeVy * ft + 0.5 * R.tapeG * ft * ft : 0, fr = ft > 0 ? R.tapeSpin * ft : 0;
  SPR.alpha = a * (ft > 0 ? 1 - smoothstep(0.25, 0.6, ft) : 1); SPR.scale = lerp(1.35, 1, e);
  if (SPR.alpha > 0.01) {
    SPR.rot = Sh.tape2Rot + fr; draw.sprite(ctx, plain, cx + fx, cy + fy, SPR);
    SPR.rot = Sh.tapeRot - fr; draw.sprite(ctx, lab, cx - fx, cy + fy, SPR);
  }
  SPR.alpha = 1; SPR.scale = 1; SPR.rot = 0;
}
// the LAST CALL / SHUT DOWN stamp in screen space (the camera is dollying): slams, then pulses on every beat
function drawLastStamp(ctx) {
  if (!LC.on || !LC.word) return;
  const L = TUNE.lastcall, Sh = TUNE.shut, c = party.clock();
  const ph = c.playing ? c.beatPhase : (LC.t * party.bpm / 60) % 1;
  const pulse = LC.shut ? 1 : 1 + (LC.tier === 'rope' ? L.ropePulse : L.pulse) * Math.pow(1 - ph, 3);
  const st = LC.shut ? LC.t - Sh.stampAt : LC.t;           // SHUT DOWN slams once the lights-out sweep has mostly run
  if (st < 0) return;
  let y;
  if (LC.shut) y = stage.h * Sh.y;
  else {                                   // under the zoomed window
    const b = camera.base, w = world.window, wy = w.y + w.h;
    y = stage.h / 2 + b.y + b.zoom * (wy - stage.h / 2) + L.gap;
  }
  const out = REO.on ? 1 - inBack(clamp(REO.t / TUNE.reopen.stampOut, 0, 1)) : 1;   // a Reopen punches it out
  // the Reopen panel covers the street's middle: the stamp it would half hide fades out under it (back in on a decline)
  const under = LC.shut && PANEL.on && PANEL.kind === 'reopen' ? 1 - panelOpen() : 1;
  if (out <= 0.01 || under <= 0.01) return;
  ctx.save();
  if (under < 1) ctx.globalAlpha *= under;
  ctx.translate(stage.w / 2, y); ctx.rotate(LC.rot); ctx.scale(pulse * out, pulse * out);
  drawStampText(ctx, LC.word, 0, 0, LC.size, LC.col, st, LC.plate);
  if (LC.sub) drawStampText(ctx, LC.sub, 0, L.subDy, L.sub, TUNE.col.last, st - 0.12, L.plate);   // the folded milestone
  ctx.restore();
}
// a plain copy of a guest's FINAL look (no shapeshift / pre: the card must not show the pre-shift state)
function bandSpec(g) {
  const f = g.fake;
  return { id: g.id, species: g.species, color: g.color, eyes: g.eyes, hat: g.hat, tail: g.tail, pattern: g.pattern,
    fake: { eyes: f ? f.eyes : 0, hat: !!(f && f.hat), tail: !!(f && f.tail) }, shift: null, inside: g.inside, pre: null };
}
function buildResult() {
  const shut = shutOut;
  const tot = endless ? resolved : total;
  const tier = endTier();
  // the quick-call star, judged here against this scene's own quick par: quick calls on `star` of the guests judged on a
  // running clock (profile.recordNight still requires a passing tier)
  const fast = !endless && tier !== 'rope' && tier !== 'shut' && timedN > 0 && quickN >= Math.ceil(TUNE.quick.star * timedN - 1e-9);
  const adm = {}, specs = {};
  for (let i = 0; i < SPECIES.length; i++) {
    const sp = SPECIES[i];
    adm[sp] = admitted[sp];
    if (BAND[sp]) specs[sp] = bandSpec(BAND[sp]);
  }
  return {
    mode: mode, night: nightN, date: dateKey, seed: seed, startedAt: startedAt, vs: lastParams && lastParams.vs ? lastParams.vs : null,
    correct: correct, total: tot, tier: tier, shutEarly: shut,
    admitted: adm, bounced: bounced, letIn: letIn, missed: missed, wrongAdmits: wrongAdmits, wrongBounces: wrongBounces,
    strikes: strikes, comboMax: comboMax, endlessScore: endless ? correct : 0, guests: resolved, bandSpecs: specs,
    quick: quickN,                         // right calls made inside the quick par (profile.recordNight's quick-call star)
    timed: timedN,                         // guests judged on a running clock (the quick share's base)
    bonusStars: fast ? 1 : 0,              // the quick-call star, judged by this scene (profile: 'bonusStars > 0')
    // for wallet.onResult (MONETIZATION §11.3 / §11.5): the medal stats, and whether boosters / a Reopen helped
    busted: BR.busted, shiftCaught: BR.shiftCaught, boosted: BR.boosted, reopens: BR.reopens,
    boostersUsed: { xray: BR.used.xray, slowmo: BR.used.slowmo, second: BR.used.second }, runKey: BR.open ? BR.key : '',
    // for the result's booster strip (MONETIZATION §4.2: Slow-Mo / Second Chance above Next Night / Again): boostOpen =
    // boosters worked on this run (a story night from 3: the strip's gate), boostHint = the one that would have helped
    boostOpen: BR.open, boostHint: hintBooster(shut),
  };
}
// the booster that would have helped tonight (the result strip pulses it): Second Chance after a Shut Down (on a story
// night only a wrong admit strikes) or when wrong admits cost strikes; Slow-Mo when guests walked off waiting at least as
// often (2+) as wrong admits struck; '' when neither, or when boosters did not work on this run
function hintBooster(shut) {
  if (!BR.open || endless) return '';
  if (shut) return 'second';
  if (missed >= 2 && missed >= wrongAdmits) return 'slowmo';
  return wrongAdmits > 0 ? 'second' : '';
}
function goResult() {
  phase = PH_OVER;
  resultParams = buildResult();
  // no black dip: the result opens straight over the same street (its card slides up at once), an amber flash covers
  // the switch and the camera eases home from the dolly underneath it (exit() leaves this tween running)
  DOLLY.x = 0; DOLLY.y = 0; DOLLY.zoom = 1; DOLLY_OUT.dur = TUNE.lastcall.backMs;
  tween(camera.base, DOLLY, DOLLY_OUT);
  const L = TUNE.lastcall;
  if (!shutOut) camera.flash(L.cut, L.cutA, L.cutMs);
  else camera.flash(TUNE.shut.flash, 0.4, L.cutMs);
  if (scenes.has('result')) scenes.go('result', resultParams, { transition: 'none' });
}

// ---------------------------------------------------------------- input
function plateRect(i, out) {
  const P = TUNE.plate, W = stage.w, H = stage.h, left = leftMode();
  const side = (i === 1) !== left ? 1 : -1;                // IN on the right unless mirrored
  out.x = W / 2 + side * (P.w / 2 + P.gapX / 2); out.y = H - stage.safeBottom - P.bottom - P.h / 2; out.w = P.w; out.h = P.h;
  return out;
}
const PR = { x: 0, y: 0, w: 0, h: 0 };
function onPlateRect(i, x, y, slop) {
  plateRect(i, PR);
  return Math.abs(x - PR.x) <= PR.w / 2 + slop && Math.abs(y - PR.y) <= PR.h / 2 + slop;
}
function hitPlate(x, y, slop) {
  for (let i = 0; i < 2; i++) if (onPlateRect(i, x, y, slop)) return i;
  return -1;
}
function platesLive() { return phase !== PH_LAST && phase !== PH_OVER; }
function pauseXY() { return stage.safeTop + TUNE.hud.row; }
function hitPause(x, y) { const dx = x - TUNE.hud.pauseX, dy = y - pauseXY(); return dx * dx + dy * dy < TUNE.hud.hitR * TUNE.hud.hitR; }
function doPause() {
  // LAST CALL / SHUT DOWN play out to the result (a pause there could Home / Restart away a fully played night
  // unrecorded): from the final verdict / 3rd strike on, nothing pauses
  if (ending()) return;
  if (scenes.has('pause')) {
    if (scenes.top !== play) return;
    scenes.push('pause', { from: 'play', mode: mode, night: nightN, date: dateKey, seed: seed, vs: lastParams && lastParams.vs ? lastParams.vs : null });
  } else paused = !paused;
}
// the page went to the background mid-guest (hidden, or only blurred: the notification shade, Control Center, a call
// banner, another window): pause so nobody comes back to a guest half out of patience
function autoPause() {
  if (!active || paused || scenes.top !== play || ending()) return;
  if (phase === PH_DECIDE || phase === PH_WALK || phase === PH_RESOLVE || phase === PH_INTRO) doPause();
}
function onVisibility() { if (typeof document !== 'undefined' && document.hidden) autoPause(); }
function onBlur() { autoPause(); }
// browser / Android back while playing: re-arm the history entry and pause instead of leaving the game (the pause
// overlay, when up, closes instead)
function onPopState() {
  if (!active) return;
  try { history.pushState({ mbouncer: 1 }, ''); } catch (e) { /* sandboxed frame */ }
  if (scenes.top !== play) { if (scenes.overlays.length) scenes.pop(); return; }
  if (PANEL.on) { panelNo(); return; }
  if (paused) { paused = false; return; }
  if (phase === PH_DECIDE || phase === PH_WALK || phase === PH_RESOLVE || phase === PH_INTRO) doPause();
}
function armHistory() {
  if (typeof window === 'undefined' || !window.history || !history.pushState) return;
  try { if (!(history.state && history.state.mbouncer)) history.pushState({ mbouncer: 1 }, ''); } catch (e) { return; }
  window.addEventListener('popstate', onPopState);
  historyOn = true;
}
function lookAll(x, y) {
  for (let k = 0; k < 4; k++) { const r = line[k]; if (r) { r.a.look(x, y); r.glancing = false; } }
}
// ---- touches: one record per pointer (TOUCHES). A second thumb never cancels the first and never commits on its
// behalf: each touch commits on its own release, and the verdict makes every other touch stale (a thumb resting on a
// plate never commits after another finger's swipe decided). The newest live swipe drives the drag-follow
function touchFor(id) {
  for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].id === id) return TOUCHES[i];
  return null;
}
function anyTouch() {
  for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].id !== -1) return true;
  return false;
}
// the newest live swipe (a zone touch, or a plate touch that turned into a swipe), or null
function swipeTouch() {
  let b = null;
  for (let i = 0; i < TOUCHES.length; i++) {
    const T = TOUCHES[i];
    if (T.id !== -1 && !T.stale && T.zone && (T.plate < 0 || T.swipe) && (!b || T.seq > b.seq)) b = T;
  }
  return b;
}
function swipeLive() { return swipeTouch() !== null; }
// the plates and the pause button show what the live touches press
function syncPress() {
  let p0 = 0, p1 = 0, pz = 0;
  for (let i = 0; i < TOUCHES.length; i++) {
    const T = TOUCHES[i];
    if (T.id === -1 || T.stale) continue;
    if (T.plate >= 0 && T.onPlate && !T.swipe) { if (T.plate === 1) p1 = 1; else p0 = 1; }
    if (T.pause && hitPause(T.x, T.y)) pz = 1;
  }
  PRESS[0].to = p0; PRESS[1].to = p1; PAUSE.to = pz;
}
// a free record for a new pointer: an empty one, else a stale one, else the oldest live touch gives way (it never commits)
function slotFor() {
  let b = null;
  for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].id === -1) return TOUCHES[i];
  for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].stale) return TOUCHES[i];
  for (let i = 0; i < TOUCHES.length; i++) if (!b || TOUCHES[i].seq < b.seq) b = TOUCHES[i];
  return b;
}
function resetTouches() {
  for (let i = 0; i < TOUCHES.length; i++) { TOUCHES[i].id = -1; TOUCHES[i].stale = false; }
}
// the guests look at the newest zone touch still down, else ahead again
function lookTouches() {
  let b = null;
  for (let i = 0; i < TOUCHES.length; i++) { const T = TOUCHES[i]; if (T.id !== -1 && !T.stale && T.zone && (!b || T.seq > b.seq)) b = T; }
  if (b) lookAll(b.x, b.y); else lookAll(null, null);
}
function onDown(d) {
  if (paused) { paused = false; return true; }
  const T = touchFor(d.id) || slotFor();
  T.id = d.id; T.x0 = T.x = d.x; T.y0 = T.y = d.y; T.pause = false; T.plate = -1; T.onPlate = false; T.swipe = false; T.vx = 0; T.vT = 0;
  T.t0 = nowMs(); T.stale = false; T.seq = ++touchSeq; T.zone = false; T.chip = null;
  if (!ending() && hitPause(d.x, d.y)) { T.pause = true; party.sfx.plate(); syncPress(); return true; }
  // a booster chip: pressed like a button (it commits on release over it), never a swipe or a plate
  const c = chipAt(d.x, d.y);
  if (c) { T.chip = c; c.press.to = 1; party.sfx.plate(); return true; }
  T.zone = d.y >= stage.h * TUNE.swipe.zone;
  const p = platesLive() ? hitPlate(d.x, d.y, 0) : -1;
  if (p >= 0) { T.plate = p; T.onPlate = true; party.sfx.plate(); }
  // the SCREEN's edges belong to the system back gesture (letterboxed: the side bars count as the screen)
  else if (d.x < stage.screenL + TUNE.edge || d.x > stage.screenR - TUNE.edge) T.zone = false;
  syncPress();
  if (T.zone) lookAll(d.x, d.y);
  return true;
}
function onMove(d) {
  const T = touchFor(d.id);
  if (!T) return true;
  if (T.chip) {                            // slid off the chip: the press lets go
    const dx = d.x - T.chip.x, dy = d.y - T.chip.y, S = TUNE.boost.slop + TUNE.boost.hit;
    T.chip.press.to = dx * dx + dy * dy <= S * S ? 1 : 0;
    return true;
  }
  if (T.stale) return true;
  T.x = d.x; T.y = d.y;
  if (T.plate >= 0 && !T.swipe) {
    // a plate touch turns into a swipe past swipe.min, or at once when it is a fast flick (so the drag-follow starts too)
    const adx = Math.abs(d.x - T.x0), S = TUNE.swipe;
    if (adx >= S.min || (adx >= S.flickMin && Math.abs(T.vx) >= S.flickV && nowMs() - T.vT <= S.velStale * 1000)) {
      T.swipe = true; T.onPlate = false;
    } else T.onPlate = onPlateRect(T.plate, d.x, d.y, TUNE.plate.slop);
  }
  syncPress();
  if (T.zone) {
    lookAll(d.x, d.y);
    if (T === swipeTouch() && line[0] && phase === PH_DECIDE) line[0].a.nudge(d.dx * TUNE.swipe.nudge, 0);
  }
  return true;
}
// the swipe a release makes: 1 = right (IN), -1 = left (OUT), 0 = none. A long drag, or a short fast flick (vx / vT =
// the touch's latest drag velocity and when it was read)
function swipeDir(dx, dy, dur, vx, vT) {
  const S = TUNE.swipe, adx = Math.abs(dx);
  if (adx < S.flickMin || adx < S.ratio * Math.abs(dy)) return 0;
  if (adx >= S.min) return dx > 0 ? 1 : -1;
  const v = nowMs() - vT <= S.velStale * 1000 ? vx : 0;
  const avg = dur > 0 ? adx / (dur / 1000) : 0;
  if ((v * dx > 0 && Math.abs(v) >= S.flickV) || avg >= S.flickV) return dx > 0 ? 1 : -1;
  return 0;
}
function onUp(d) {
  const T = touchFor(d.id);
  if (!T) return true;
  const dx = d.x - T.x0, dy = d.y - T.y0, stale = T.stale || T.t0 < verdictMs, t0 = T.t0, plate = T.plate, swipe = T.swipe;
  const pause = T.pause, zone = T.zone, vx = T.vx, vT = T.vT, chip = T.chip;
  T.id = -1; T.stale = false; T.chip = null;
  if (chip) {                              // a chip commits on release over it (a verdict meanwhile does not matter)
    chip.press.to = 0;
    const cx = d.x - chip.x, cy = d.y - chip.y, S = TUNE.boost.slop + TUNE.boost.hit;
    if (!d.cancelled && cx * cx + cy * cy <= S * S) tapChip(chip);
    return true;
  }
  syncPress();
  lookTouches();
  // cancelled, or a verdict / MISS landed while it was down: it never commits (not onto the next guest either)
  if (d.cancelled || stale) return true;
  if (pause) { if (hitPause(d.x, d.y)) doPause(); return true; }
  if (plate >= 0) {
    // a touch that started on a plate: a swipe or a short fast flick commits its WORLD direction, whichever plate it
    // started on (the thumb rests on the plates); only a press that is no swipe commits that plate, on release on it; a
    // slide off that is no swipe cancels
    if (!platesLive()) return true;
    const s = swipeDir(dx, dy, d.dur, vx, vT);
    if (s !== 0) choose(s > 0 ? 'in' : 'out', t0, plate);
    else if (!swipe && onPlateRect(plate, d.x, d.y, TUNE.plate.slop)) choose(plate === 1 ? 'in' : 'out', t0, plate);
    return true;
  }
  if (zone) {
    const s = swipeDir(dx, dy, d.dur, vx, vT);
    if (s !== 0) choose(s > 0 ? 'in' : 'out', t0, -1);
  }
  return true;
}
function onKey(e) {
  if (!active || e.repeat || scenes.top !== play) return;
  const k = e.key;
  if (PANEL.on) {                          // the Reopen / buy panel: Escape declines, Enter takes it
    if (k === 'Escape') { panelNo(); e.preventDefault(); } else if (k === 'Enter') { panelYes(); e.preventDefault(); }
    return;
  }
  if (paused) {                          // the fallback overlay: only resume keys work
    if (k === 'Escape' || k === 'p' || k === 'P' || k === 'Enter' || k === ' ') { paused = false; e.preventDefault(); }
    return;
  }
  if (k === 'ArrowRight' || k === 'ArrowLeft') { choose(k === 'ArrowRight' ? 'in' : 'out'); e.preventDefault(); }
  else if (k === 'Escape' || k === 'p' || k === 'P') doPause();
}

// ---------------------------------------------------------------- drag-follow
function dragRot() { const D = TUNE.drag; return clamp(DRAG.x / D.k * D.rot, -D.rotMax, D.rotMax); }
function updateDrag(dt) {
  const D = TUNE.drag, T = swipeTouch(), live = !!T && !!line[0] && phase === PH_DECIDE;
  DRAG.to = live ? clamp((T.x - T.x0) * D.k, -D.max, D.max) : 0;
  stepSpring(DRAG, dt);
  if (!line[0] && DRAG.to === 0) { DRAG.x = 0; DRAG.v = 0; }
  // the guest acts the preview out (actor.lean eases it): told only when the quantised target changes
  const k = live ? Math.round(DRAG.to / D.max * 20) / 20 : 0;
  if (!line[0]) leanK = 0;
  else if (k !== leanK) { leanK = k; line[0].a.lean(k); }
}
// the street answers the drag: toward IN the door cracks open (an amber slit down its latch edge + a warm spill on the
// cobbles), toward OUT the velvet rope goes taut (a hot rim along it, trembling)
function drawDoorCrack(ctx) {
  const D = TUNE.drag, k = DRAG.x / D.max;
  if (k <= 0.03 || world.door.open > 0.05) return;
  const d = world.door, a = clamp(k, 0, 1), sx = d.x + d.w * D.crackX, w = 1.5 + D.crackW * a;
  const top = d.y + d.h * D.crackTop, bot = d.y + d.h - 1, h = bot - top;
  draw.glow(ctx, sx, top + h * 0.5, h * 0.6, '#ff9a3d', D.spill * a);
  ctx.save();
  // the light wedge the crack throws on the sidewalk
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= 0.5 * a;
  ctx.fillStyle = '#ff9a3d';
  ctx.beginPath(); ctx.moveTo(sx - w * 0.5, bot); ctx.lineTo(sx + w * 0.5, bot); ctx.lineTo(sx + 36 * a, bot + 40); ctx.lineTo(sx - 70 * a, bot + 40); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= D.crackA * clamp(a * 2.2, 0, 1);
  // the hallway glow through the gap, the bright core, and the leaf's own dark edge as it swings in
  ctx.fillStyle = '#ff8a2a'; ctx.fillRect(sx - w * 0.5, top, w, h);
  ctx.fillStyle = '#fff1c4'; ctx.fillRect(sx - w * 0.22, top + 2, w * 0.44, h - 4);
  ctx.fillStyle = 'rgba(70,34,6,0.75)'; ctx.fillRect(sx + w * 0.5, top, 1.6, h);
  ctx.restore();
}
function drawRopeTaut(ctx) {
  const D = TUNE.drag, k = -DRAG.x / D.max, R = world.rope;
  if (k <= 0.03 || !R.on) return;
  const a = clamp(k, 0, 1), sag = (R.y - R.top) * (1 - 0.35 * a), j = Math.sin(t * 46) * 1.2 * a;
  const x1 = R.x1, x2 = R.x2, mx = (x1 + x2) / 2, y = R.top + j;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.quadraticCurveTo(mx, y + sag * 2, x2, y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= D.ropeA * a * 0.45;
  ctx.lineWidth = D.ropeW * 2.2; ctx.strokeStyle = '#ff3d64'; ctx.stroke();
  ctx.globalAlpha = D.ropeA * a;
  ctx.lineWidth = D.ropeW; ctx.strokeStyle = '#ff8fa8'; ctx.stroke();
  ctx.restore();
}
function bakeHeart(c) {
  draw.sticker(c, cc => draw.heart(cc, 16, 16, 24), { fill: '#ff5c8a', outline: '#1d1840', lineWidth: 2.4, highlight: 0.35 });
}
function bakeSweat(c) {
  draw.sticker(c, cc => {
    cc.beginPath(); cc.moveTo(13, 3); cc.bezierCurveTo(16, 10, 22, 15, 22, 21); cc.arc(13, 21, 9, 0, Math.PI); cc.bezierCurveTo(4, 15, 10, 10, 13, 3); cc.closePath();
  }, { fill: '#8fd8ff', outline: '#1d1840', lineWidth: 2.2, highlight: 0.45, bounds: SWEAT_BOUNDS });
}
// hopeful heart (dragged toward IN) / worried sweat drop (toward OUT) over the rope guest's head
function drawEmote(ctx) {
  const r = line[0], D = TUNE.drag;
  if (!r || Math.abs(DRAG.x) < 2) return;
  // pops in (outBack) over the first third of the drag, opaque early, then grows to `emote` units at emoteFull
  const a = clamp((Math.abs(DRAG.x) - 2) / D.emoteFull, 0, 1), dir = DRAG.x > 0 ? 1 : -1, h = r.a.anchor('head');
  const cv = dir > 0 ? draw.cached('play-emote-heart', 32, 30, bakeHeart) : draw.cached('play-emote-sweat', 26, 32, bakeSweat);
  SPR.alpha = clamp(a * 4, 0, 1); SPR.rot = dir * 0.25;
  SPR.scale = outBack(clamp(a * 3, 0, 1)) * (0.78 + 0.22 * a) * D.emote / 24 * Math.max(0.8, r.s);
  draw.sprite(ctx, cv, h.x + dir * 30 * r.s, h.y - 16 * r.s - 8 * a, SPR);
  SPR.alpha = 1; SPR.scale = 1; SPR.rot = 0;
}

// ---------------------------------------------------------------- boosters + Boss, Reopen! (MONETIZATION §4, §11.5)
// the run: open = boosters work tonight, key = the wallet's run key, pend = the wallet module had not arrived at enter
// (the run opens when it does, if the night has not started deciding), shownT = the bar's clock since the night's poster
// landed (-1 = not yet), used = what this run spent, boosted = a booster / Reopen was used (result + share card),
// reopens, busted / shiftCaught (medal stats), want = a booster whose buy sheet is open (used at once when bought),
// dirty = re-read the counts (wallet.onChange), slowmoArmed = armed before the night (starts at the first decision)
const BR = { open: false, key: '', pend: false, shownT: -1, boosted: false, reopens: 0, busted: 0, shiftCaught: 0, want: '', dirty: false,
  slowmoArmed: false, used: { xray: false, slowmo: false, second: false } };
const RUNCTX = { mode: 'night', night: 1, vs: null, practice: false };
// a chip: shown tonight (on), its centre (x, y: laid out per frame), n owned, free (VIP's daily X-Ray), badge = its count
// string, price + tagKey (the gem tag when none is owned), press spring, flash (a use), deny (a refused tap's shake)
function newChip(id) {
  return { id: id, on: false, x: 0, y: 0, n: 0, free: false, badge: '', price: 0, tagKey: '', press: spring(0, 600, 30), flash: 0, deny: 0 };
}
const CHIPS = [newChip('xray'), newChip('slowmo'), newChip('second')];
const CHIP = { xray: CHIPS[0], slowmo: CHIPS[1], second: CHIPS[2] };
const BAR = [];                                   // the chips on show tonight, edge first (reused)
// each booster's icon: the shop's art names (shop.js BOOSTER_ART), drawn through drawArt (baked once, scaled)
const BOOSTER_ART = { xray: 'glasses', slowmo: 'snail', second: 'heart' };
function boosterArt(ctx, id, x, y, size, alpha) { if (ART) ART(ctx, BOOSTER_ART[id], x, y, size, alpha); }
const ACTIVE_COL = { xray: TUNE.boost.xray.col, slowmo: TUNE.boost.slowmo.col, second: '#5dff9e' };
const TOAST_COL = { xray: TUNE.boost.xray.col, slowmo: TUNE.boost.slowmo.col, second: '#5dff9e' };
const BADGE_OPTS = { color: '#c98d2e', textColor: '#fff4dc' };
const CHECK_OPTS = { color: '#5dff9e' };
// X-RAY: on, the queue indexes [from, to) it covers, t = its clock (scan lines, pulses), beam = the activation sweep's
// clock, sparkT = the shimmer sparkle timer, word = the FAKE label
// hw = the FAKE label's stamp half width (measured with the word, never per frame)
const XR = { on: false, from: -1, to: -1, t: 0, beam: 9, sparkT: 0, word: '', hw: 0 };
function xrayWord() { XR.word = boostWord('bst_fake'); XR.hw = stampHalfW(XR.word, TUNE.boost.xray.label); }
// SLOW-MO: on, k = the patience factor in force (1 = off), t = since it started (the ripple)
const SM = { on: false, k: 1, t: 9 };
// SECOND CHANCE: armed (catches the next strike), lamp = the lamp it saves (-1), wait = that lamp keeps showing broken
// until the impostor lands; RL = each lamp's relight clock (s; >= burst: none)
const SC = { armed: false, lamp: -1, wait: false };
const RL = [9, 9, 9];
// small HUD-space stamps (X-RAY! / SLOW-MO! / READY! / SAVED! / USED)
const TOASTS = [];
for (let i = 0; i < 4; i++) TOASTS.push({ on: false, word: '', x: 0, y: 0, t: 0, col: '#fff' });
// the look the wallet gave at enter (world.setLook / party.setTheme / the plates' skin)
const LOOK = { club: '', rope: '', door: '', plate: '', outfit: {} };
let plateSkin;                                    // undefined = the default plates
// BOSS, REOPEN!: hold = this Shut Down offers it (the queue waits, the result waits), asked = the panel has opened,
// extra = s the hold added (the trudge and the cut run that much later after a decline), on = the reopen sequence runs
// (t = its clock), price = the offer, cols = window columns relit so far, plateRise = the plates' rise clock (-1 none)
const REO = { hold: false, asked: false, extra: 0, on: false, t: 0, price: 0, cols: 0 };
let plateRise = -1;
// the panel (Reopen offer / a booster's buy sheet): kind 'reopen' | 'buy', id = the booster, t = open clock, out =
// closing clock (-1 = open), the strings it shows (built on open / a balance or language change), key = its card bake,
// tagKey / balKey = the price tag + balance bakes, afford, need = the gems still missing (0 = affordable) + its sentence
// (needStr, the state hook's) and its short form on the primary's face (needShort: 'need 18'),
// shop = a shop scene to get gems in, down = the part pressed
const PANEL = { on: false, kind: '', id: '', t: 0, out: -1, price: 0, gems: 0, afford: true, need: 0, needStr: '', needShort: '', shop: false, ver: 0, key: '',
  tagKey: '', balKey: '', faceKey: '', freeKey: '', title: '', sub: '', note: '', yes: '', no: '', free: false, blink: 2.6, blinkT: 0, glintT: 0,
  down: -9, cx: 0, top: 0, w: 0, h: 0, lift: 0 };
const PBTN = [{ x: 0, y: 0, w: 0, h: 0, press: spring(0, 600, 30) }, { x: 0, y: 0, w: 0, h: 0, press: spring(0, 600, 30) },
  { x: 0, y: 0, w: 34, h: 34, press: spring(0, 600, 30) }];   // 0 = no, 1 = yes, 2 = close
const PB_NO = 0, PB_YES = 1, PB_CLOSE = 2, PB_CARD = 3, PB_OUT = -1;
const BTN_NO = { color: TUNE.panel.no, textColor: '#fff4dc', size: 18, press: 0, alpha: 1, rim: '' };
const BTN_YES = { color: TUNE.panel.go, textColor: '#fff4dc', size: 18, press: 0, alpha: 1, rim: '#ffd23f', glow: 0 };
const BTN_X = { color: '#3a3680', press: 0, alpha: 1 };
const GLINTS = [];
for (let i = 0; i < 4; i++) GLINTS.push({ on: false, x: 0, y: 0, t: 0, s: 1 });
const SHIM_DASH = [7, 6], OV_XRAY_SPARK = { count: 7, spawnRadius: 8 }, OV_CHIP_SPARK = { count: 9, spawnRadius: 16 };
const OV_SLOW_RING = { size: [10, 130], life: 0.55 }, OV_SHIM = { count: 2, spawnRadius: 4 };

particles.define('bstXray', {
  count: 8, speed: [20, 120], life: [0.4, 0.8], size: [6, 0], sizeJitter: 0.4, colors: ['#ff4fd8', '#ffb3f0', '#ffffff'], shape: 'star',
  glow: true, gravity: -20, drag: 2, spin: [-4, 4], rot: 'random', alphaCurve: 'fadeOut', spawnRadius: 10, layer: 'front',
});
particles.define('bstSlow', {
  count: 10, speed: [20, 90], life: [0.5, 0.9], size: [5, 0], sizeJitter: 0.4, colors: ['#8fe8ff', '#e6fbff', '#52d4ff'], shape: 'circle',
  glow: true, gravity: -30, drag: 2.5, alphaCurve: 'fadeOut', spawnRadius: 14, layer: 'front',
});
particles.define('bstShim', {
  count: 2, speed: [5, 30], life: [0.4, 0.7], size: [5, 0], sizeJitter: 0.4, colors: ['#c08cff', '#e9d6ff', '#ffffff'], shape: 'star',
  glow: true, gravity: -25, drag: 2, spin: [-3, 3], rot: 'random', alphaCurve: 'twinkle', twinkleFreq: [14, 22], layer: 'front',
});
particles.define('bstRing', { count: 1, speed: 0, life: 0.5, size: [8, 90], sizeJitter: 0, colors: ['#8fe8ff'], shape: 'ring', glow: true,
  stroke: [6, 0.4], alphaCurve: 'fadeOut', layer: 'front' });

// localised booster copy: the loaded dictionary first (main.js merges strings-*.js), then strings-boosters.js
function boostWord(key) {
  if (i18n.has(key)) return i18n.t(key);
  const d = BOOST_DICT[i18n.lang] || BOOST_DICT.en, s = d[key];
  if (s !== undefined) return s;
  const e = BOOST_DICT.en[key];
  return e !== undefined ? e : key;
}
function wfn(name) { return !!WAL && typeof WAL[name] === 'function'; }
function wcall(name, a, b) {
  if (!wfn(name)) return undefined;
  try { return WAL[name](a, b); } catch (e) { console.warn('[play] wallet.' + name + ' failed', e); return undefined; }
}
function useWallet(w) {
  if (walletOff) { try { walletOff(); } catch (e) { /* the old wallet is gone */ } walletOff = null; }
  WAL = w || null;
  if (WAL && typeof WAL.onChange === 'function') {
    try { walletOff = WAL.onChange(() => { BR.dirty = true; }); } catch (e) { walletOff = null; }
  }
  BR.dirty = true;
}
function boosterPrice(id) {
  const B = CAT && CAT.BOOSTERS ? CAT.BOOSTERS[id] : null;
  return B && B.gems > 0 ? B.gems : TUNE.boost.price[id];
}
function owned(id) { const n = wcall('boosters', id); return typeof n === 'number' && n > 0 ? n : 0; }
function haveBooster(id) { return owned(id) > 0 || (id === 'xray' && !!wcall('vipToken')); }
function gemsNow() { const g = wcall('gems'); return typeof g === 'number' && g > 0 ? Math.floor(g) : 0; }

// a story night at or below the frontier, from night 3, no friend's challenge (the wallet's boostersOpen has the last word)
function boostEligible() {
  const vs = lastParams && lastParams.vs;
  const counts = typeof profile.nightCounts === 'function' ? profile.nightCounts(nightN) : true;
  return mode === 'night' && !endless && nightN >= TUNE.boost.fromNight && !vs && counts;
}
// every booster record back to a fresh night; then the run opens when the night qualifies and the wallet is here
function startBoosters() {
  BR.open = false; BR.key = ''; BR.pend = false; BR.shownT = -1; BR.boosted = false; BR.reopens = 0; BR.busted = 0; BR.shiftCaught = 0;
  BR.want = ''; BR.dirty = false; BR.slowmoArmed = false; BR.used.xray = false; BR.used.slowmo = false; BR.used.second = false;
  XR.on = false; XR.from = -1; XR.to = -1; XR.t = 0; XR.beam = 9; xrayWord();
  SM.on = false; SM.k = 1; SM.t = 9;
  SC.armed = false; SC.lamp = -1; SC.wait = false; RL[0] = RL[1] = RL[2] = 9;
  REO.hold = false; REO.asked = false; REO.extra = 0; REO.on = false; REO.t = 0; plateRise = -1;
  PANEL.on = false; PANEL.out = -1; PANEL.down = -9;
  for (let i = 0; i < TOASTS.length; i++) TOASTS[i].on = false;
  for (let i = 0; i < GLINTS.length; i++) GLINTS[i].on = false;
  for (let i = 0; i < CHIPS.length; i++) { const c = CHIPS[i]; c.on = false; c.flash = 0; c.deny = 0; c.press.x = c.press.v = c.press.to = 0; }
  BAR.length = 0;
  if (!WAL) { BR.pend = true; return; }
  openRun(false);
}
// EVERY run (the Daily, the All-Nighter, a challenge and practice too) starts a wallet run: startRun takes and clears the
// home / result arming (never sticky: a Slow-Mo armed on home and then a Daily played is not carried to the next story
// night) and retires the last story run's key (a stale key can no longer use a booster or a Reopen); it comes back open
// only on a story night. late = the wallet arrived after the night began deciding: the arming is cleared, no bar
function openRun(late) {
  const C = RUNCTX, ok = boostEligible();
  C.mode = mode; C.night = nightN; C.vs = lastParams && lastParams.vs ? lastParams.vs : null; C.practice = !ok;
  const run = wcall('startRun', C);
  if (late || !ok) return;
  if (wfn('boostersOpen') && !wcall('boostersOpen', C)) return;
  if (!run || !run.open) return;
  BR.open = true; BR.key = run.key !== undefined && run.key !== null ? String(run.key) : 'run';
  BR.slowmoArmed = !!run.slowmo; SC.armed = !!run.second;
  const xr = wfn('boosterShown') ? !!wcall('boosterShown', 'xray', nightN) : xrayNight();
  BAR.length = 0;
  for (let i = 0; i < CHIPS.length; i++) {
    const c = CHIPS[i];
    c.on = c.id !== 'xray' || xr;
    if (c.on) BAR.push(c);
  }
  layoutBar();
  refreshChips();
}
// can tonight bring a trick (a liar or a shapeshifter)? X-Ray only shows then
function xrayNight() {
  const p = night && night.params;
  return nightN >= TUNE.boost.xrayNight && !!p && ((p.liarCount && p.liarCount[1] > 0) || (p.shiftCount && p.shiftCount[1] > 0));
}
// the chips' counts, badges and price tags (on enter, a wallet change, a resume, a language change: never per frame)
function refreshChips() {
  BR.dirty = false;
  for (let i = 0; i < CHIPS.length; i++) {
    const c = CHIPS[i];
    c.n = owned(c.id); c.free = c.id === 'xray' && !!wcall('vipToken');
    c.badge = c.free ? boostWord('free') : c.n > 0 ? String(Math.min(99, c.n)) : '';
    c.price = boosterPrice(c.id); c.tagKey = 'play-tag-' + c.price;
  }
  if (PANEL.on && PANEL.out < 0) panelStrings();
}
function barLive() {
  return BR.open && BAR.length > 0 && BR.shownT >= TUNE.boost.appearAt && !ending() && !(PANEL.on && PANEL.out < 0) && !paused &&
    !(pre > 0 && (frontIdx < 0 || frontIdx < pre));
}
// the bar's chip centres (into each chip): in the band between the caption slot and the plates, from the OUT plate's
// outer edge inward (mirrored in left-hand mode, the IN plate's side then being the left)
function layoutBar() {
  const B = TUNE.boost, P = TUNE.plate, top = stage.h - stage.safeBottom - P.bottom - P.h, left = leftMode();
  const y = Math.max(top - B.dy, capY() + TUNE.cap.h / 2 + B.chip / 2 + 4);
  const yy = Math.min(y, top - B.chip / 2 - B.gapMin);
  for (let i = 0; i < BAR.length; i++) { const c = BAR[i], x = B.x0 + i * B.gap; c.x = left ? stage.w - x : x; c.y = yy; }
}
function chipAt(x, y) {
  if (!barLive()) return null;
  const R = TUNE.boost.hit;
  for (let i = 0; i < BAR.length; i++) { const c = BAR[i], dx = x - c.x, dy = y - c.y; if (dx * dx + dy * dy <= R * R) return c; }
  return null;
}
function chipSpent(c) {
  if (c.id === 'xray') return BR.used.xray && !XR.on;
  if (c.id === 'slowmo') return false;
  return BR.used.second;
}
function chipActive(c) { return c.id === 'xray' ? XR.on : c.id === 'slowmo' ? SM.on : SC.armed && !BR.used.second; }
function denyChip(c) { if (c) c.deny = 1; party.sfx.plate(); }
// a use: the chip punches, sparkles in its colour, and its word pops beside the bar's inner end (level with the chips:
// clear of the caption slot above and the plates below)
function chipFx(c, word) {
  c.flash = 1; c.press.v += TUNE.boost.kick * 3;
  particles.emit(c.id === 'xray' ? 'bstXray' : c.id === 'slowmo' ? 'bstSlow' : 'sparkle', c.x, c.y, OV_CHIP_SPARK);
  if (!word) return;
  const B = TUNE.boost, last = BAR[BAR.length - 1] || c, left = leftMode(), hw = stampHalfW(word, B.toast.size) + 6;
  toast(word, last.x + (left ? -1 : 1) * (B.chip * 0.5 + 10 + hw), c.y, TOAST_COL[c.id]);
}
function toast(w, x, y, col) {
  let s = TOASTS[0];
  for (let i = 0; i < TOASTS.length; i++) if (!TOASTS[i].on) { s = TOASTS[i]; break; }
  const hw = stampHalfW(w, TUNE.boost.toast.size) + 6;
  s.on = true; s.word = w; s.x = clamp(x, hw, stage.w - hw); s.y = y; s.t = 0; s.col = col;
}
// a tap on chip c: use it, arm it, or (none owned) open its buy sheet; a spent / running one shakes
function tapChip(c) {
  if (!c || !barLive()) return;
  const id = c.id;
  if (id === 'second') { if (BR.used.second || (SC.armed && strikes <= 0)) { denyChip(c); return; } }
  else if (BR.used[id]) { denyChip(c); return; }
  if (!haveBooster(id)) { openBuy(id); return; }
  applyBooster(id);
}
function applyBooster(id) {
  if (id === 'xray') useXray();
  else if (id === 'slowmo') useSlowmo(false);
  else if (strikes > 0) saveNow();
  else armSecond();
}
// none owned: the night holds and a buy sheet opens: the shop's booster sheet as a popup over the street (scene 'shop',
// { popup, sheet: 'booster:<id>' }: x1 / x5 for gems, its own 'not enough gems' path), else this scene's own panel; a
// booster bought there is used the moment the night resumes (resume)
function openBuy(id) {
  BR.want = id;
  party.sfx.plate();
  if (scenes.has('shop') && scenes.top === play) { pushShop('booster:' + id, 0, 'play'); return; }
  openPanel('buy', id);
}
// the shop over the street (a booster's buy sheet, or Get gems from a panel: its 'not enough gems' sheet naming the gems
// still missing) as a popup. Overlays draw under the engine's camera, so the Shut Down dolly would shift and zoom the
// shop off-centre: the camera snaps home while the shop is up (the street behind is dimmed) and eases back to the saved
// framing when the night resumes (camBack)
const CAMSAVE = { on: false, x: 0, y: 0, zoom: 1 }, CAM_TO = { x: 0, y: 0, zoom: 1 }, CAM_BACK = { dur: 260, ease: inOutSine };
const SHOP_P = { popup: true, sheet: '', need: 0, tab: undefined, from: '' };
function pushShop(sheet, need, from) {
  const b = camera.base;
  if (!CAMSAVE.on) { CAMSAVE.on = true; CAMSAVE.x = b.x; CAMSAVE.y = b.y; CAMSAVE.zoom = b.zoom; }
  tweens.killTarget(b);
  b.x = 0; b.y = 0; b.zoom = 1;
  SHOP_P.sheet = sheet; SHOP_P.need = need; SHOP_P.tab = sheet === 'nogems' ? 'gems' : undefined; SHOP_P.from = from;
  scenes.push('shop', SHOP_P);
}
function camBack() {
  if (!CAMSAVE.on) return;
  CAMSAVE.on = false;
  if (CAMSAVE.x === 0 && CAMSAVE.y === 0 && CAMSAVE.zoom === 1) return;
  CAM_TO.x = CAMSAVE.x; CAM_TO.y = CAMSAVE.y; CAM_TO.zoom = CAMSAVE.zoom;
  tween(camera.base, CAM_TO, CAM_BACK);
}
// the wallet spends a Slow-Mo / Second Chance only when the run has it armed (the home / result strip arms them before
// the night): a tap in the bar arms it for this run (wallet.run, the reused RUN of this night's key) before using it
function armRun(id) {
  const run = WAL ? WAL.run : null;
  if (run && typeof run === 'object' && run.open && String(run.key) === BR.key && (id === 'slowmo' || id === 'second')) run[id] = true;
}
// X-RAY: the guest at the rope (or the next one up) and the 4 after it
function useXray() {
  const c = CHIP.xray;
  if (XR.on || BR.used.xray || !wcall('useBooster', 'xray', BR.key)) { denyChip(c); BR.dirty = true; return false; }
  BR.used.xray = true; BR.boosted = true; BR.dirty = true;
  const f = line[0] ? line[0].idx : line[1] ? line[1].idx : nextIdx;
  XR.on = true; XR.from = Math.max(f, pre); XR.to = XR.from + TUNE.boost.xray.guests; XR.t = 0; XR.beam = 0; XR.sparkT = 0;
  xrayWord();
  party.sfx.shift();
  camera.kick(0, -3); camera.flash(TUNE.boost.xray.glowCol, 0.14, 200);
  post.pulse(PULSE_SOFT);
  input.vibrate(12);
  chipFx(c, boostWord('bst_xray_on'));
  return true;
}
function isXray(r) { return XR.on && !!r && !!r.g && !r.practice && r.idx >= XR.from && r.idx < XR.to; }
// the next guest at the rope is past the X-rayed ones: the glasses come off
function xrayAdvance() { if (XR.on && (frontIdx < 0 || frontIdx >= XR.to)) XR.on = false; }
// SLOW-MO: patience x k from now on (the running guest's clock refunds: its elapsed share shrinks by k), the QUICK par
// stays absolute (its share of the longer patience shrinks by k too). auto = armed before the night, at the first decision
function useSlowmo(auto) {
  const c = CHIP.slowmo, S = TUNE.boost.slowmo;
  if (!SM.on && !BR.used.slowmo) armRun('slowmo');
  if (SM.on || BR.used.slowmo || !wcall('useBooster', 'slowmo', BR.key)) { BR.slowmoArmed = false; if (!auto) denyChip(c); BR.dirty = true; return false; }
  BR.used.slowmo = true; BR.boosted = true; BR.slowmoArmed = false; BR.dirty = true;
  SM.on = true; SM.k = S.k; SM.t = 0;
  const r = line[0];
  if (r && !r.practice && (phase === PH_DECIDE || phase === PH_WALK)) { patSec *= S.k; pat /= S.k; quickQ /= S.k; RING.q = quickQ; RING.pat = pat; }
  party.sfx.whoosh(-1); party.sfx.ping(0);
  loop.slowmo(S.warp, S.warpMs);
  camera.flash(S.col, 0.16, 260); camera.punch(1.025, 220);
  const s0 = world.slots[0];
  particles.emit('bstRing', s0.x, s0.feetY, OV_SLOW_RING);
  particles.emit('bstSlow', s0.x, s0.feetY - 10);
  input.vibrate(10);
  chipFx(c, boostWord('bst_slowmo_on'));
  return true;
}
// SECOND CHANCE armed with a clean board: it waits for the next strike (nothing is spent until it saves one)
function armSecond() {
  SC.armed = true;
  party.sfx.stamp(); party.sfx.ping(leftMode() ? 0.4 : -0.4);
  chipFx(CHIP.second, boostWord('bst_second_on'));
}
// a wrong admit just counted its strike: an armed Second Chance takes it back (the lamp shows broken until the
// impostor lands, then relights: wrongImpact). Returns true when it saved the strike
function trySecond(r) {
  if (!BR.open || !SC.armed || BR.used.second) return false;
  armRun('second');
  if (!wcall('useBooster', 'second', BR.key)) { SC.armed = false; BR.dirty = true; return false; }
  BR.used.second = true; BR.boosted = true; SC.armed = false; BR.dirty = true;
  SC.lamp = clamp(strikes - 1, 0, 2); SC.wait = true; r.saved = true;
  strikes--;
  return true;
}
// tapped with strikes on the board: the newest strike comes back at once (a clean board repairs the room)
function saveNow() {
  const c = CHIP.second;
  if (strikes > 0 && !BR.used.second) armRun('second');
  if (strikes <= 0 || BR.used.second || !wcall('useBooster', 'second', BR.key)) { denyChip(c); BR.dirty = true; return false; }
  BR.used.second = true; BR.boosted = true; SC.armed = false; BR.dirty = true;
  const i = clamp(strikes - 1, 0, 2);
  strikes--;
  relightLamp(i, true);
  if (strikes === 0) world.degrade(0);
  chipFx(c, '');
  return true;
}
// a strike lamp comes back: it pops up from small on a spring kick with an amber burst, a ring and stars (HUD space),
// a brass 'gotcha' + a SAVED! sticker under it when a Second Chance saved it
function relightLamp(i, saved) {
  const S = TUNE.boost.second, H = TUNE.hud;
  RL[i] = 0; LAMPS[i].x = S.from; LAMPS[i].v = S.kick; LFLASH[i] = 0;
  party.sfx.busted(0, 'shift');
  input.vibrate(12);
  if (saved) toast(boostWord('saved'), H.lamps[i], stage.safeTop + H.row + S.dy, TUNE.col.info);
}
function crossed(a, b, x) { return a < x && b >= x; }

// ---- Boss, Reopen!: offered on a story-night SHUT DOWN with guests still waiting (wallet.reopenPrice >= 0)
function reopenOffer() {
  if (!BR.open || !wfn('reopenPrice') || !wfn('reopen')) return false;
  if (!(line[1] || line[2] || line[3] || nextIdx < queueLen())) return false;
  const p = wcall('reopenPrice', BR.key, nightN);
  if (!(typeof p === 'number' && p >= 0)) return false;
  REO.price = Math.floor(p);
  // nothing to offer when the gems are short and there is no shop to get them in (a build without the shop scene)
  return REO.price <= gemsNow() || scenes.has('shop');
}
function declineReopen() {
  REO.hold = false;
  REO.extra = Math.max(0, LC.t - TUNE.reopen.holdAt);
  for (let k = 0; k < 4; k++) { const r = line[k]; if (r && r.leaveAt >= 0) r.leaveAt += REO.extra; }
  wcall('reopenDeclined');
}
// paid: the night comes back (updateReopen runs the sequence, then the next guest steps up)
function startReopen() {
  REO.hold = false; REO.on = true; REO.t = 0; REO.cols = 0;
  BR.reopens++; BR.boosted = true; BR.dirty = true;
  slamDoorT = -1;
  DOLLY.x = 0; DOLLY.y = 0; DOLLY.zoom = 1; DOLLY_OUT.dur = TUNE.reopen.homeMs;
  tween(camera.base, DOLLY, DOLLY_OUT);
}
function updateReopen(dt) {
  const R = TUNE.reopen, Sh = TUNE.shut, prev = REO.t;
  REO.t += dt;
  const t = REO.t, d = world.door, w = world.window;
  if (crossed(prev, t, R.tape)) {                          // the CLOSED tape tears off
    party.sfx.tear();
    particles.emit('playPaper', d.x + d.w * 0.5, d.y + d.h * 0.42, OV_BUST_PAPER);
  }
  if (crossed(prev, t, R.door)) {                          // the door swings open, the room is back, the crowd cheers
    world.degrade(0);
    world.openDoor(0.12);
    party.sfx.door(true);
    party.intensity(TUNE.combo.energy[1]);
    camera.flash(R.flash, 0.4, 220); camera.punch(1.04, 200); camera.addTrauma(0.15);
    particles.emit('confetti', w.x + 22, w.y + w.h * 0.85, OV_CONF_COMBO);
    particles.emit('confetti', w.x + w.w - 22, w.y + w.h * 0.85, OV_CONF_COMBO);
    input.vibrate(20);
  }
  if (t >= R.light) {                                      // the window lights come back right to left, a spark each
    const n = Math.min(Sh.cols, Math.floor((t - R.light) / R.bulb) + 1);
    while (REO.cols < n) {
      const x = w.x + (Sh.cols - REO.cols - 0.5) * w.w / Sh.cols;
      particles.emit('sparkle', x, w.y + w.h * 0.3, OV_BULB);
      REO.cols++;
    }
  }
  if (crossed(prev, t, R.lamp)) { strikes = Math.min(strikes, 2); relightLamp(2, false); }
  if (crossed(prev, t, R.stamp)) {
    laneVerdict(boostWord('bst_reopened'), w.x + w.w / 2, w.y + w.h * TUNE.combo.wy, R.size, TUNE.col.last, TUNE.stamp.plate, TUNE.stamp.life + 0.5);
    party.ladder(10); party.sfx.stamp();
    particles.emit('stars', w.x + w.w / 2, w.y + w.h * 0.45, OV_STARS);
  }
  if (crossed(prev, t, R.cheer)) {
    for (let k = 1; k < 4; k++) { const r = line[k]; if (r) { r.leaveAt = -1; r.a.setState('cheer'); } }
  }
  if (crossed(prev, t, R.plates)) plateRise = 0;
  if (t >= R.done) finishReopen();
}
function finishReopen() {
  REO.on = false;
  LC.on = false; LC.shut = false; LC.word = ''; LC.sub = '';
  shutOut = false; lateStrike = false; endT = -1; lcT = -1; slamDoorT = -1;
  for (let k = 1; k < 4; k++) { const r = line[k]; if (r) { r.leaveAt = -1; r.a.setState('idle'); } }
  if (world.door.open > 0.15) world.closeDoor();
  energyTier = -1; setEnergy(0);
  phase = PH_RESOLVE; stepT = TUNE.stepAt;
}

// ---- the panel (Reopen / a booster's buy sheet), screen space
function openPanel(kind, id) {
  PANEL.on = true; PANEL.kind = kind; PANEL.id = id || ''; PANEL.t = 0; PANEL.out = -1; PANEL.down = -9; PANEL.glintT = 0;
  PANEL.blinkT = 0; PANEL.blink = 2 + Math.random() * 2;
  for (let i = 0; i < PBTN.length; i++) { PBTN[i].press.x = PBTN[i].press.v = PBTN[i].press.to = 0; }
  if (kind === 'reopen') REO.asked = true;
  panelStrings();
  party.sfx.whoosh(0); party.sfx.stamp(0.1 * speedK);
  pending = ''; HELD.kind = ''; staleTouch();
}
function closePanel() { if (PANEL.on && PANEL.out < 0) PANEL.out = 0; PANEL.down = -9; }
// how far the panel is open (0..1: its open / close fades)
function panelOpen() {
  if (!PANEL.on) return 0;
  const P = TUNE.panel;
  return PANEL.out >= 0 ? 1 - clamp(PANEL.out / P.out, 0, 1) : clamp(PANEL.t / P.in, 0, 1);
}
// the panel's words + bakes for its numbers (balance, price): rebuilt on open, a balance change and a language change
function panelStrings() {
  const k = PANEL.kind, id = PANEL.id;
  PANEL.gems = gemsNow(); PANEL.shop = scenes.has('shop');
  PANEL.price = k === 'reopen' ? REO.price : boosterPrice(id);
  PANEL.free = k === 'reopen' && PANEL.price === 0;
  PANEL.afford = PANEL.gems >= PANEL.price;
  PANEL.need = PANEL.afford ? 0 : PANEL.price - PANEL.gems;
  PANEL.needStr = PANEL.need > 0 ? needWord(PANEL.need) : '';
  PANEL.needShort = PANEL.need > 0 ? boostWord('bst_need_short').replace('{n}', groupDigits(PANEL.need)) : '';
  if (k === 'reopen') {
    PANEL.title = boostWord('reopen'); PANEL.sub = PANEL.free ? boostWord('reopen_free') : boostWord('reopen_sub');
    PANEL.note = boostWord('bst_reopen_note'); PANEL.no = boostWord('bst_reopen_no');
    PANEL.yes = PANEL.afford ? boostWord('bst_reopen_go') : PANEL.shop ? boostWord('get_gems') : boostWord('not_enough');
  } else {
    PANEL.title = boostWord(id); PANEL.sub = id === 'second' && strikes > 0 ? boostWord('bst_second_now') : boostWord(id + '_sub');
    PANEL.note = boostWord('bst_buy_note'); PANEL.no = boostWord('bst_not_now');
    PANEL.yes = PANEL.afford ? boostWord('bst_buy_use') : PANEL.shop ? boostWord('get_gems') : boostWord('not_enough');
  }
  PANEL.ver++;
  PANEL.key = 'play-panel-' + PANEL.ver;
  PANEL.tagKey = PANEL.free ? 'play-tag-free-' + i18n.lang : 'play-tag-' + PANEL.price;
  PANEL.balKey = 'play-bal-' + PANEL.gems;
  PANEL.faceKey = 'play-yes-' + PANEL.ver;
  PANEL.freeKey = 'play-free-' + i18n.lang;
  TAGTXT.free = boostWord('free');
}
const TAGTXT = { free: 'FREE' };
// 'You need 10 more gems' (the plural form for n, the shop's 'not enough' wording; built on a panel rebuild only)
function needWord(n) {
  const k = 'bst_need_more_' + pluralCat(n, i18n.lang), d = BOOST_DICT[i18n.lang] || BOOST_DICT.en;
  return boostWord(i18n.has(k) || d[k] !== undefined ? k : 'bst_need_more').replace('{n}', groupDigits(n));
}
// the panel's geometry this frame (into PANEL / PBTN): the card centred, its foot clear of the safe bottom; lift = the
// open / close slide
function layoutPanel() {
  const P = TUNE.panel, w = Math.min(P.w, stage.w - 24), h = P.h;
  const cy = Math.min(stage.h * P.y, stage.h - stage.safeBottom - P.foot - h / 2);
  let lift = 0;
  if (PANEL.out >= 0) lift = 90 * inBack(clamp(PANEL.out / P.out, 0, 1));
  else lift = 70 * (1 - outBack(clamp(PANEL.t / P.in, 0, 1)));
  PANEL.cx = stage.w / 2; PANEL.top = cy - h / 2 + lift; PANEL.w = w; PANEL.h = h; PANEL.lift = lift;
  const by = PANEL.top + P.by, dx = P.bw / 2 + P.gap / 2;
  const b0 = PBTN[PB_NO], b1 = PBTN[PB_YES], bx = PBTN[PB_CLOSE];
  b0.x = PANEL.cx - dx; b0.y = by; b0.w = P.bw; b0.h = P.bh;
  b1.x = PANEL.cx + dx; b1.y = by; b1.w = P.bw; b1.h = P.bh;
  bx.x = PANEL.cx + w / 2 - 12; bx.y = PANEL.top + 12; bx.w = 34; bx.h = 34;
}
function panelHit(x, y) {
  for (let i = 0; i < PBTN.length; i++) {
    const b = PBTN[i], pad = i === PB_CLOSE ? 8 : 4;
    if (Math.abs(x - b.x) <= b.w / 2 + pad && Math.abs(y - b.y) <= b.h / 2 + pad) return i;
  }
  const top = PANEL.top - (PANEL.kind === 'reopen' ? TUNE.panel.bossUp : 40);
  if (Math.abs(x - PANEL.cx) <= PANEL.w / 2 && y >= top && y <= PANEL.top + PANEL.h) return PB_CARD;
  return PB_OUT;
}
function panelInput(evt, d) {
  const live = PANEL.out < 0 && PANEL.t >= 0.18;
  if (evt === 'down') {
    if (!live) { PANEL.down = -9; return true; }
    layoutPanel();
    PANEL.down = panelHit(d.x, d.y);
    if (PANEL.down >= 0 && PANEL.down < PBTN.length) { PBTN[PANEL.down].press.to = 1; party.sfx.plate(); }
    return true;
  }
  if (evt === 'move') {
    if (PANEL.down >= 0 && PANEL.down < PBTN.length) PBTN[PANEL.down].press.to = panelHit(d.x, d.y) === PANEL.down ? 1 : 0;
    return true;
  }
  if (evt === 'up') {
    const was = PANEL.down;
    PANEL.down = -9;
    for (let i = 0; i < PBTN.length; i++) PBTN[i].press.to = 0;
    if (!live || was === -9) return true;
    const h = panelHit(d.x, d.y);
    if (h !== was) return true;
    if (h === PB_YES) panelYes();
    else if (h === PB_NO || h === PB_CLOSE || h === PB_OUT) panelNo();
    return true;
  }
  return true;
}
// the primary: Reopen / Buy & use (paid at once), or Get gems (the shop as a popup over the street with its 'not enough
// gems' sheet naming the gems still missing, its Get gems opening the Gems tab; the panel re-reads the balance on
// return), or nothing (not enough gems, no shop)
function panelYes() {
  if (!PANEL.on || PANEL.out >= 0) return false;
  if (!PANEL.afford) {
    if (PANEL.shop && scenes.top === play) { pushShop('nogems', Math.max(1, PANEL.need), PANEL.kind === 'reopen' ? 'reopen' : 'booster'); return true; }
    PBTN[PB_YES].press.v += 6; party.sfx.plate();
    return false;
  }
  if (PANEL.kind === 'reopen') {
    if (!wcall('reopen', BR.key)) { REO.price = Math.max(REO.price, 0); panelStrings(); return false; }
    closePanel(); startReopen();
    return true;
  }
  const id = PANEL.id, res = wcall('buyBooster', id, 1);
  if (!res || !res.ok) { panelStrings(); PBTN[PB_YES].press.v += 6; return false; }
  BR.want = ''; BR.dirty = true;
  closePanel();
  party.sfx.busted(0, 'shift');
  applyBooster(id);
  return true;
}
function panelNo() {
  if (!PANEL.on || PANEL.out >= 0) return false;
  closePanel();
  if (PANEL.kind === 'reopen') declineReopen();
  else BR.want = '';
  return true;
}
// a buy sheet holds the night (a Reopen offer sits in the Shut Down hold, where nothing waits on a clock)
function panelHolds() { return PANEL.on && PANEL.out < 0 && PANEL.kind === 'buy'; }

// the equipped cosmetics (wallet.look) on tonight's street, in every mode (they never touch a call): world.setLook,
// party.setTheme and the plates' skin argument, each only where its owner's API exists. The rule poster, the guests,
// the HUD, the stamps, the strike lamps, the patience ring and the IN / OUT hues are never skinned (MONETIZATION §3.1)
let lookPend = false;
function applyLook() {
  plateSkin = undefined; lookPend = false;
  if (!WAL) { lookPend = true; return; }
  const lk = wcall('look', LOOK);
  if (!lk) return;
  if (typeof world.setLook === 'function') { try { world.setLook(lk); } catch (e) { console.warn('[play] world.setLook failed', e); } }
  if (typeof party.setTheme === 'function' && lk.club) { try { party.setTheme(lk.club); } catch (e) { console.warn('[play] party.setTheme failed', e); } }
  plateSkin = lk.plate && lk.plate !== 'plate.classic' ? lk.plate : undefined;
}

// ---- per-frame state (game time)
function updateBoosters(dt) {
  if (lookPend && WAL && resolved === 0) applyLook();
  if (BR.pend && WAL) { BR.pend = false; openRun(!(resolved === 0 && !ending())); }
  if (!BR.open) return;
  if (BR.shownT < 0 && PS.landed && !(pre > 0 && rule === preRule)) BR.shownT = 0;
  if (XR.on || XR.beam < 9) {
    XR.t += dt;
    if (XR.beam < TUNE.boost.xray.beam) {
      XR.beam += dt;
      if (XR.beam >= TUNE.boost.xray.beam) { XR.beam = 9; xrayBurst(); }
    }
    XR.sparkT -= dt;
    if (XR.on && XR.sparkT <= 0) { XR.sparkT = TUNE.boost.xray.spark; shimmerSparks(); }
  }
  if (SM.t < 9) SM.t += dt;
}
// the beam has swept the street: every X-rayed fake part bursts pink once
function xrayBurst() {
  for (let k = 0; k < 4; k++) {
    const r = line[k];
    if (!isXray(r) || !isFake(r.g)) continue;
    const a = r.a.anchor('fake');
    particles.emit('bstXray', a.x, a.y, OV_XRAY_SPARK);
  }
  party.sfx.ping(0);
}
// a shapeshifter still in its old look sparkles in shift purple around its body
function shimmerSparks() {
  for (let k = 0; k < 4; k++) {
    const r = line[k];
    if (!isXray(r) || !r.g.shift || r.shifted) continue;
    const b = r.a.bounds(), ang = Math.random() * TAU;
    const x = r.x + (b.x + b.w * 0.5 + Math.cos(ang) * b.w * 0.55) * r.s, y = r.y + (b.y + b.h * 0.5 + Math.sin(ang) * b.h * 0.5) * r.s;
    particles.emit('bstShim', x, y, OV_SHIM);
  }
}
// the HUD clocks (real time): chip springs, toasts, relights, the panel's open / close, the boss's blink + glints
function updateBoostHud(dt) {
  const B = TUNE.boost, Ps = TUNE.panel;
  if (BR.dirty && (BR.open || PANEL.on)) refreshChips();
  if (BR.open) layoutBar();                // chip centres for taps, the hint glove and the toasts (cheap: a few adds)
  if (BR.shownT >= 0) BR.shownT += dt;
  for (let i = 0; i < CHIPS.length; i++) {
    const c = CHIPS[i];
    stepSpring(c.press, dt);
    c.flash = Math.max(0, c.flash - dt * 2.5); c.deny = Math.max(0, c.deny - dt / B.deny);
  }
  for (let i = 0; i < TOASTS.length; i++) { const s = TOASTS[i]; if (s.on) { s.t += dt; if (s.t >= B.toast.life + B.toast.out) s.on = false; } }
  for (let i = 0; i < 3; i++) if (RL[i] < 9) { RL[i] += dt; if (RL[i] >= B.second.burst) RL[i] = 9; }
  if (plateRise >= 0) { plateRise += dt; if (plateRise * 1000 >= TUNE.reopen.plateMs) { plateRise = -1; plateOffT = -1; } }
  if (PANEL.on) {
    if (PANEL.out >= 0) { PANEL.out += dt; if (PANEL.out >= Ps.out) { PANEL.on = false; PANEL.out = -1; } }
    else PANEL.t += dt;
    for (let i = 0; i < PBTN.length; i++) stepSpring(PBTN[i].press, dt);
    PANEL.blinkT += dt;
    if (PANEL.blinkT > PANEL.blink + 0.14) { PANEL.blinkT = 0; PANEL.blink = 2 + Math.random() * 2.5; }
    if (PANEL.kind === 'reopen' && PANEL.t > Ps.pop) {
      PANEL.glintT -= dt;
      if (PANEL.glintT <= 0) { PANEL.glintT = Ps.glint * (0.7 + Math.random() * 0.6); addGlint(); }
    }
    for (let i = 0; i < GLINTS.length; i++) { const g = GLINTS[i]; if (g.on) { g.t += dt; if (g.t >= 0.5) g.on = false; } }
  }
}
function addGlint() {
  let g = null;
  for (let i = 0; i < GLINTS.length; i++) if (!GLINTS[i].on) { g = GLINTS[i]; break; }
  if (!g) return;
  g.on = true; g.t = 0; g.x = (Math.random() - 0.5) * 30; g.y = -8 - Math.random() * 16; g.s = 0.6 + Math.random() * 0.5;
}

// ---- drawing: the bar (HUD band), the X-Ray marks (world), the toasts + relights (HUD), the panel (HUD, on top)
function drawBar(ctx) {
  if (!BR.open || !BAR.length || BR.shownT < 0) return;
  const B = TUNE.boost, R = B.chip / 2, live = barLive();
  for (let i = 0; i < BAR.length; i++) {
    const c = BAR[i], u = clamp((BR.shownT - B.appearAt - i * B.stagger) / B.pop, 0, 1);
    if (u <= 0) continue;
    const spent = chipSpent(c), act = chipActive(c), empty = !spent && !act && c.n <= 0 && !c.free && !(c.id === 'slowmo' && BR.used.slowmo);
    const shake = c.deny > 0 ? Math.sin((1 - c.deny) * 3 * TAU) * 4 * c.deny : 0;
    const sc = outBack(u) * (1 - 0.1 * clamp(c.press.x, 0, 1)) * (1 + 0.18 * c.flash), x = c.x + shake, y = c.y;
    if (sc <= 0.01) continue;
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    if (!live || spent) ctx.globalAlpha *= spent ? B.dim : 0.8;
    if (act || c.flash > 0) draw.glow(ctx, 0, 0, R * 1.9, ACTIVE_COL[c.id], (act ? 0.42 + 0.14 * Math.sin(t * 6) : 0) + c.flash * 0.6);
    else if (!spent) draw.glow(ctx, 0, 0, R * B.halo, B.haloCol, B.haloA + B.haloAmp * Math.sin(t * B.haloHz * TAU + i * 1.3));
    draw.shadowBlob(ctx, 0, R + 3, R * 0.9, 4, 0.35);
    draw.sprite(ctx, draw.cached('play-chip-base', B.chip + 6, B.chip + 6, bakeChipBase), 0, 0, SPR);
    if (act) {                                         // a running booster: its colour chases round the rim
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = ACTIVE_COL[c.id]; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R - 1.5, t * 4, t * 4 + Math.PI * 1.3); ctx.stroke();
      ctx.restore();
    }
    const ribbon = c.free && !spent && !act;          // the VIP day's FREE ribbon rides the coin's foot: the icon lifts over it
    boosterArt(ctx, c.id, 0, ribbon ? -B.artUp : 0, B.art, empty ? 0.75 : 1);
    if (c.id === 'xray' && XR.on) {                   // the X-rayed guests still to come: pips round the foot
      const left = clamp(XR.to - Math.max(frontIdx, XR.from), 0, B.xray.guests);
      ctx.fillStyle = B.xray.col;
      for (let k = 0; k < left; k++) { const a = Math.PI * 0.5 + (k - (left - 1) / 2) * 0.32; ctx.beginPath(); ctx.arc(Math.cos(a) * (R + 5), Math.sin(a) * (R + 5), 2.4, 0, TAU); ctx.fill(); }
    }
    if (spent || (c.id === 'slowmo' && BR.used.slowmo && !SM.on)) drawGlyph(ctx, 'check', R * 0.62, -R * 0.62, 15, CHECK_OPTS);
    else if (act) { /* the rim says it */ }
    else if (ribbon) drawPill(ctx, 0, R * B.freeDy, B.freeW, B.freeH, c.badge, PILL_FREE);
    else if (c.badge) drawBadge(ctx, R * 0.66, -R * 0.66, B.badge, c.badge, BADGE_OPTS);
    else if (empty) draw.sprite(ctx, tagSprite(c.tagKey, c.price, false), R * 0.5, R * 0.78, SPR);
    ctx.restore();
  }
}
const PILL_FREE = { color: '#2fae5e', textColor: '#fff4dc', icon: '', size: TUNE.boost.freeSize, alpha: 1 };
// the X-Ray marks on one guest (drawn right after it): a scan line sweeping it, a pulsing FAKE-pink ring + glow + FAKE
// label on every fake part, a shift-purple dashed halo + glow on a shapeshifter that has not changed yet
function drawXrayRec(ctx, r) {
  if (!isXray(r) || !r.a || r.alpha <= 0.01) return;
  const X = TUNE.boost.xray, g = r.g, f = g.fake, s = Math.max(0.55, r.s), dx = r === line[0] ? DRAG.x : 0;
  const b = r.a.bounds(), left = r.x + dx + b.x * r.s, top = r.y + b.y * r.s, w = b.w * r.s, h = b.h * r.s;
  const on = clamp(XR.t / 0.25, 0, 1), u = (XR.t / X.scan + r.idx * 0.37) % 1, sy = top + h * u;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16 * on; ctx.fillStyle = X.col; ctx.fillRect(left - 4, sy - X.band * s, w + 8, X.band * s);
  ctx.globalAlpha = 0.8 * on; ctx.fillRect(left - 6, sy - 1, w + 12, 2);
  ctx.restore();
  if (f && (f.eyes || f.hat || f.tail)) {
    const pulse = 1 + 0.12 * Math.sin(XR.t * X.hz * TAU);
    if (f.eyes) { const a = r.a.anchor('fake'); xrayPart(ctx, a.x, a.y, s, pulse, on, sy); }
    if (f.hat) {
      let x, y;
      if (!f.eyes) { const a = r.a.anchor('fake'); x = a.x; y = a.y; } else { const a = r.a.anchor('head'); x = a.x; y = a.y - 16 * s; }
      xrayPart(ctx, x, y, s, pulse, on, sy);
    }
    if (f.tail) {
      const a = !f.eyes && !f.hat ? r.a.anchor('fake') : r.a.anchor('tail');
      xrayPart(ctx, a.x, a.y, s, pulse, on, sy);
    }
  }
  if (g.shift && (!r.shifted || r.popT >= 0)) {
    const c = r.a.anchor('center'), cx = c.x, cy = c.y, rx = w * 0.62, ry = h * 0.56, Sh = TUNE.col.shift;
    draw.glow(ctx, cx, cy, Math.max(rx, ry) * 1.1, Sh, (0.22 + 0.12 * Math.sin(XR.t * 7)) * on);
    ctx.save();
    ctx.globalAlpha *= X.shimmer * on;
    ctx.setLineDash(SHIM_DASH); ctx.lineDashOffset = -XR.t * 40;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.lineWidth = 5; ctx.strokeStyle = '#1d1840'; ctx.stroke();
    ctx.lineWidth = 2.6; ctx.strokeStyle = Sh; ctx.stroke();
    ctx.setLineDash(NO_DASH);
    ctx.restore();
  }
}
function xrayPart(ctx, x, y, s, pulse, on, sy) {
  const X = TUNE.boost.xray, hit = Math.abs(sy - y) < 10 * s ? 1 : 0;
  draw.glow(ctx, x, y, X.glow * s * (1 + 0.3 * hit), X.glowCol, (0.5 + 0.35 * hit) * on);
  ringAt(ctx, x, y, X.ring * s * pulse, X.col, on);
  // the label stays whole on screen: the back of the queue stands at the screen's left edge
  const lx = clamp(x, stage.screenL + X.labelPad + XR.hw, stage.screenR - X.labelPad - XR.hw);
  if (on > 0.5) drawStampText(ctx, XR.word, lx, y - X.labelDy * s, X.label, X.col, 1, TUNE.stamp.plate);
}
// the activation beam: a neon-pink band sweeping down the street from the poster's foot to the plates
function drawXrayBeam(ctx) {
  const X = TUNE.boost.xray;
  if (XR.beam >= X.beam) return;
  const u = clamp(XR.beam / X.beam, 0, 1), P = world.poster, top = P.y + 60 * P.scale;
  const bot = stage.h - stage.safeBottom - TUNE.plate.bottom - TUNE.plate.h, y = lerp(top, bot, outCubic(u)), a = 1 - smoothstep(0.75, 1, u);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22 * a; ctx.fillStyle = X.col; ctx.fillRect(-20, y - 26, stage.w + 40, 26);
  ctx.globalAlpha = 0.9 * a; ctx.fillStyle = X.glowCol; ctx.fillRect(-20, y - 2, stage.w + 40, 3);
  ctx.restore();
}
// the toasts and the relight bursts (HUD space)
function drawBoostHud(ctx) {
  const B = TUNE.boost, T2 = B.toast, St = TUNE.stamp, H = TUNE.hud, y0 = stage.safeTop + H.row;
  for (let i = 0; i < 3; i++) {
    if (RL[i] >= B.second.burst) continue;
    const u = RL[i] / B.second.burst, x = H.lamps[i];
    draw.glow(ctx, x, y0, H.lamp * (1.4 + 1.2 * u), '#ffb347', 0.9 * (1 - u));
    ringAt(ctx, x, y0, H.lamp * (0.6 + 1.4 * outCubic(u)), '#ffd23f', 1 - u * u);
  }
  for (let i = 0; i < TOASTS.length; i++) {
    const s = TOASTS[i];
    if (!s.on) continue;
    let sc = lerp(St.punch, 1, outBack(clamp(s.t * 1000 / St.punchMs, 0, 1)));
    if (s.t > T2.life) sc *= 1 - inBack(clamp((s.t - T2.life) / T2.out, 0, 1));
    if (sc <= 0.01) continue;
    ctx.save();
    ctx.translate(s.x, s.y - T2.rise * outCubic(clamp(s.t / T2.life, 0, 1))); ctx.scale(sc, sc);
    drawStampText(ctx, s.word, 0, 0, T2.size, s.col, s.t, St.plate);
    ctx.restore();
  }
}
function drawPanel(ctx) {
  if (!PANEL.on) return;
  const P = TUNE.panel;
  layoutPanel();
  const open = panelOpen();
  ctx.save();
  ctx.globalAlpha = P.dim * open; ctx.fillStyle = '#08071a'; ctx.fillRect(-20, -20, stage.w + 40, stage.h + 40);
  ctx.globalAlpha = open;
  const cx = PANEL.cx, top = PANEL.top, w = PANEL.w, h = PANEL.h;
  if (PANEL.kind === 'reopen') drawBoss(ctx, cx, top, false);
  draw.shadowBlob(ctx, cx, top + h + 6, w * 0.48, 10, 0.5);
  draw.sprite(ctx, draw.cached(PANEL.key, w + 12, h + 12, bakePanelCard), cx, top + h / 2, SPR);
  if (PANEL.kind === 'reopen') drawBoss(ctx, cx, top, true);
  else {                                               // the booster itself pops over the card's top edge
    const u = clamp(PANEL.t / P.pop, 0, 1), sc = outBack(u) * 1.9 * (1 + 0.04 * Math.sin(t * 4));
    draw.glow(ctx, cx, top - 12, 64, ACTIVE_COL[PANEL.id], 0.45 * u);
    if (sc > 0.01) boosterArt(ctx, PANEL.id, cx, top - 14, P.art * sc, 1);
  }
  drawStampText(ctx, PANEL.title, cx, top + P.titleY, P.title, '#ffc233', PANEL.t, TUNE.stamp.plate);
  if (PANEL.kind === 'reopen') {                       // two strikes stay broken, the third comes back
    const H = TUNE.hud, ly = top + 104;
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * 34, lit = i === 2;
      if (lit) draw.glow(ctx, x, ly, 26, '#ffb347', 0.4 + 0.2 * Math.sin(t * 5));
      drawStrikeLamp(ctx, x, ly, H.lamp, lit, !lit);
    }
  } else {
    SPR.scale = 1.25;
    draw.sprite(ctx, tagSprite(PANEL.tagKey, PANEL.price, PANEL.free), cx, top + 104, SPR);
    SPR.scale = 1;
  }
  const b0 = PBTN[PB_NO], b1 = PBTN[PB_YES], bx = PBTN[PB_CLOSE];
  BTN_NO.press = clamp(b0.press.x, 0, 1);
  drawButton(ctx, b0.x, b0.y, b0.w, b0.h, PANEL.no, BTN_NO);
  BTN_YES.press = clamp(b1.press.x, 0, 1); BTN_YES.alpha = PANEL.afford || PANEL.shop ? 1 : 0.55;
  BTN_YES.glow = PANEL.afford ? 0.35 + 0.25 * Math.sin(t * 4) : 0;
  BTN_YES.color = PANEL.afford ? P.go : '#c98d2e';
  // a paid Reopen wears its price ON the face at the button's own text size ('Reopen <gem> 30'): the face content is a
  // bake drawn over a blank button, riding its press (the shop's gem buttons do the same); the free one keeps its label
  // and a big FREE sticker on the corner; too few gems, the face says 'Get gems' over '<gem> 30 · need 18' (the price
  // first, then the shortfall: the panel's key fact sits on the button the thumb is about to press)
  const priced = PANEL.kind === 'reopen' && PANEL.afford && !PANEL.free, short = PANEL.need > 0;
  drawButton(ctx, b1.x, b1.y, b1.w, b1.h, priced || short ? '' : PANEL.yes, BTN_YES);
  if (priced || short) {
    const pr = BTN_YES.press;
    SPR.scale = 1 - 0.04 * pr;
    draw.sprite(ctx, draw.cached(PANEL.faceKey, b1.w, b1.h, short ? bakeNeedFace : bakeYesFace), b1.x, b1.y + Math.max(4, b1.h * 0.12) * pr * 0.85, SPR);
    SPR.scale = 1;
  } else if (PANEL.kind === 'reopen' && PANEL.free) {
    SPR.rot = 0.12; draw.sprite(ctx, draw.cached(PANEL.freeKey, P.freeW, P.freeH, bakeFreeSticker), b1.x + b1.w / 2 - 16, b1.y - b1.h / 2 - 3, SPR); SPR.rot = 0;
  }
  BTN_X.press = clamp(bx.press.x, 0, 1);
  drawIconButton(ctx, bx.x, bx.y, bx.w, 'close', BTN_X);
  // the balance chip straddles the card's top-left corner (clear of the boss's shoulder and the title stamp)
  draw.sprite(ctx, draw.cached(PANEL.balKey, P.balW, P.balH, bakeBalance), cx - w / 2 + 6 + P.balW / 2, top - 1, SPR);
  ctx.restore();
}
// the boss bust: back = the body behind the card (rising from behind it), front = the mitts on the card's top edge,
// rubbing (with gem glints popping between them)
function drawBoss(ctx, cx, top, front) {
  const P = TUNE.panel, u = clamp(PANEL.t / P.pop, 0, 1), rise = (1 - outBack(u)) * 110, bw = P.bossW;
  const ph = PANEL.t * P.rub * TAU, rub = Math.sin(ph), bob = Math.cos(ph);
  if (!front) {
    const bx = cx - bw / 2, by = top - P.bossUp - 56 + rise, breathe = 1 + 0.015 * Math.sin(t * 2.4);
    ctx.save();
    ctx.translate(cx, by + 168); ctx.scale(1, breathe); ctx.translate(-cx, -(by + 168));
    draw.sprite(ctx, draw.cached('play-boss', bw, 168, bakeBoss), cx, by + 84, SPR);
    // eyes: pupils glance at the price, a blink now and then; brows waggle with the rub
    const look = PANEL.afford ? 1 : -0.6, blink = PANEL.blinkT > PANEL.blink ? 1 : 0;
    bossEye(ctx, bx + 58, by + 70, 15, 6.5, look, blink);
    bossEye(ctx, bx + 97, by + 68, 9.5, 4.2, look, blink);
    const wag = 2.2 * Math.max(0, rub);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#1d1840'; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(bx + 42, by + 50 - wag); ctx.quadraticCurveTo(bx + 58, by + 42 - wag * 1.4, bx + 74, by + 48 - wag); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 87, by + 52 - wag); ctx.quadraticCurveTo(bx + 98, by + 46 - wag * 1.4, bx + 109, by + 51 - wag); ctx.stroke();
    ctx.restore();
    return;
  }
  const show = clamp((u - 0.55) / 0.3, 0, 1);
  if (show <= 0) return;
  const hy = top + 4 + rise * 0.3, mitt = draw.cached('play-boss-mitt', 32, 28, bakeMitt);
  SPR.scale = outBack(show);
  SPR.rot = -0.25 + 0.18 * rub; draw.sprite(ctx, mitt, cx - 15 + 6 * rub, hy + 2 * bob, SPR);
  SPR.sx = -1; SPR.rot = 0.25 + 0.18 * rub; draw.sprite(ctx, mitt, cx + 15 - 6 * rub, hy - 2 * bob, SPR);
  SPR.sx = 1; SPR.rot = 0; SPR.scale = 1;
  const star = draw.cached('play-ping-star', 40, 40, bakePing);
  for (let i = 0; i < GLINTS.length; i++) {
    const g = GLINTS[i];
    if (!g.on) continue;
    const k = g.t / 0.5, s = (k < 0.3 ? outBack(k / 0.3) : 1 - smoothstep(0.3, 1, k)) * g.s * 0.38;
    if (s <= 0.01) continue;
    draw.glow(ctx, cx + g.x, hy + g.y - 10 * k, 14 * s * 2, P.gem, 0.6 * (1 - k));
    SPR.scale = s; SPR.rot = k * 2; draw.sprite(ctx, star, cx + g.x, hy + g.y - 10 * k, SPR);
  }
  SPR.scale = 1; SPR.rot = 0;
}
function bossEye(ctx, x, y, r, pr, look, blink) {
  ctx.fillStyle = '#1d1840';
  ctx.beginPath(); ctx.arc(x + look * r * 0.32, y + Math.abs(look) * r * 0.22, pr, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x + look * r * 0.32 - pr * 0.35, y + Math.abs(look) * r * 0.22 - pr * 0.4, pr * 0.32, 0, TAU); ctx.fill();
  if (blink) {
    ctx.fillStyle = BOSS_LID;
    ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.6; ctx.strokeStyle = '#1d1840';
    ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + 1); ctx.quadraticCurveTo(x, y + r * 0.45, x + r * 0.8, y + 1); ctx.stroke();
  }
}

// ---- bakes (once per layout: draw.cached drops them on a resize)
const INK = '#1d1840', BOSS_G = '#7cc96b', BOSS_LID = '#5fae55';
// a booster chip: a brass coin (light from the top, ink outline, a catch-light) with a cream face inset in it, its lip
// shaded on the top edge, so the icon sits on cream (as on the shop's cards) and the chip reads on the dark hedge
function bakeChipBase(c, w, h) {
  const B = TUNE.boost, cx = w / 2, cy = h / 2, r = B.chip / 2 - 1, fr = Math.min(B.faceR, r - 4);
  draw.sticker(c, cc => draw.circle(cc, cx, cy, r), { fill: draw.gradient(c, 0, cy - r, 0, cy + r, B.brass), outline: INK, lineWidth: 3,
    highlight: 0.38, shadow: 0.16, bounds: [cx - r, cy - r, r * 2, r * 2] });
  draw.sticker(c, cc => draw.circle(cc, cx, cy, fr), { fill: B.face, outline: INK, lineWidth: 1.8, highlight: 0, shadow: 0.1,
    bounds: [cx - fr, cy - fr, fr * 2, fr * 2] });
  c.save();
  draw.circle(c, cx, cy, fr - 0.9); c.clip();
  c.lineWidth = 3; c.strokeStyle = B.faceInk;
  c.beginPath(); c.arc(cx, cy + 1.4, fr - 0.4, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  c.restore();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,250,228,0.75)';
  c.beginPath(); c.arc(cx, cy, r - 2.2, Math.PI * 1.15, Math.PI * 1.6); c.stroke();
}
// the Slow-Mo patience ring's hourglass (an effect riding the clock, not the booster's icon): brass plates, ice glass,
// mustard sand
function bakeHourglass(c) {
  const glass = cc => {
    cc.beginPath(); cc.moveTo(10, 7); cc.lineTo(24, 7); cc.quadraticCurveTo(24, 14, 18.4, 17); cc.quadraticCurveTo(24, 20, 24, 27);
    cc.lineTo(10, 27); cc.quadraticCurveTo(10, 20, 15.6, 17); cc.quadraticCurveTo(10, 14, 10, 7); cc.closePath();
  };
  draw.sticker(c, glass, { fill: '#c9f6ff', outline: INK, lineWidth: 2.2, highlight: 0.4, shadow: 0.1, bounds: [10, 7, 14, 20] });
  c.save(); glass(c); c.clip();
  c.fillStyle = '#ffc233'; c.beginPath(); c.moveTo(12, 27); c.quadraticCurveTo(17, 20, 22, 27); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(13.6, 10.5); c.lineTo(20.4, 10.5); c.lineTo(17, 15); c.closePath(); c.fill();
  c.fillRect(16.4, 15, 1.2, 9);
  c.restore();
  const plate = y => draw.sticker(c, cc => draw.roundRect(cc, 7, y, 20, 4.4, 2), { fill: '#d9a441', outline: INK, lineWidth: 2, highlight: 0.4, shadow: 0 });
  plate(3.6); plate(26);
}
// a gem (the spendable currency), drawn like the shop's (js/scenes/shop.js paintGem: an aqua brilliant cut, ink outline,
// a white glint) so a gem reads the same everywhere; s = its height, (x, y) = its centre
const GEM_COLS = ['#d4f8ff', '#3cc8f0', '#1563c0'];
function gemPath(c, x, y, s) {
  const w = s * 0.56, tw = s * 0.3, top = y - s * 0.38, gir = y - s * 0.1, bot = y + s * 0.5;
  c.beginPath(); c.moveTo(x - tw, top); c.lineTo(x + tw, top); c.lineTo(x + w, gir); c.lineTo(x, bot); c.lineTo(x - w, gir); c.closePath();
}
function paintGem(c, x, y, s) {
  const w = s * 0.56, tw = s * 0.3, top = y - s * 0.38, gir = y - s * 0.1, bot = y + s * 0.5;
  c.save();
  c.fillStyle = 'rgba(6,4,22,0.32)'; gemPath(c, x + s * 0.04, y + s * 0.07, s); c.fill();
  gemPath(c, x, y, s);
  c.fillStyle = draw.gradient(c, 0, top, 0, bot, [[0, GEM_COLS[0]], [0.36, GEM_COLS[1]], [1, GEM_COLS[2]]]); c.fill();
  c.save(); gemPath(c, x, y, s); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath(); c.moveTo(x - tw, top); c.lineTo(x + tw, top); c.lineTo(x + w, gir); c.lineTo(x - w, gir); c.closePath(); c.fill();
  c.fillStyle = 'rgba(10,16,80,0.24)'; c.beginPath(); c.moveTo(x, gir); c.lineTo(x + w, gir); c.lineTo(x, bot); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = Math.max(0.7, s * 0.025);
  c.beginPath(); c.moveTo(x - w, gir); c.lineTo(x + w, gir); c.moveTo(x - tw * 0.3, gir); c.lineTo(x, bot); c.moveTo(x + tw * 0.3, gir); c.lineTo(x, bot); c.stroke();
  c.restore();
  gemPath(c, x, y, s); c.lineJoin = 'round'; c.lineWidth = Math.max(1.4, s * 0.1); c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - w * 0.4, top + s * 0.16, s * 0.08, 0, TAU); c.fill();
  c.restore();
}
// the price tag (gem + number, or FREE) on a cream sticker label: tagSprite(key, price, free) bakes it once per key
const TAGB = { price: 0, free: false };
function tagSprite(key, price, free) { TAGB.price = price; TAGB.free = free; return draw.cached(key, 46, 22, bakeTag); }
function bakeTag(c, w, h) {
  draw.sticker(c, cc => draw.roundRect(cc, 2, 2, w - 4, h - 4, (h - 4) / 2), { fill: '#fff4dc', outline: INK, lineWidth: 2.2, highlight: 0.2, shadow: 0.12 });
  if (TAGB.free) { draw.text(c, TAGTXT.free, w / 2, h / 2 + 0.5, TAG_FREE); return; }
  paintGem(c, 13, h / 2, 14);
  draw.text(c, String(TAGB.price), 22, h / 2 + 0.5, TAG_TXT);
}
// the balance chip: an indigo pill with a brass inner rim, a balGem gem, the digits at balSize (Western digits in both
// languages, so the gem leads in both)
function bakeBalance(c, w, h) {
  const P = TUNE.panel, g = P.balGem, gx = 6 + g / 2 + 2;
  draw.sticker(c, cc => draw.roundRect(cc, 2, 2, w - 4, h - 4, (h - 4) / 2), { fill: '#191645', outline: INK, lineWidth: 2.4, highlight: 0.15, shadow: 0 });
  c.lineWidth = 1.8; c.strokeStyle = P.rim; draw.roundRect(c, 4.5, 4.5, w - 9, h - 9, (h - 9) / 2); c.stroke();
  paintGem(c, gx, h / 2, g);
  BAL_TXT.maxWidth = w - (gx + g / 2 + 4) - 10;
  draw.text(c, groupDigits(PANEL.gems), gx + g / 2 + 4, h / 2 + P.balSize * 0.06, BAL_TXT);
}
// 28987 -> '28,987' (the shop's and the lobby pill's format; called only when a balance sprite bakes)
function groupDigits(n) {
  const s = String(Math.max(0, Math.floor(n || 0)));
  let out = '';
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += ','; out += s[i]; }
  return out;
}
const BAL_TXT = { size: TUNE.panel.balSize, weight: 800, color: '#fff4dc', align: 'left', outline: INK, outlineWidth: 3.4, maxWidth: 48 };
const TAG_TXT = { size: 13, weight: 800, color: INK, align: 'left', maxWidth: 30 };
const TAG_FREE = { size: 12, weight: 800, color: '#1f7a43', align: 'center', maxWidth: 40 };
const CARD_SUB = { size: TUNE.panel.sub, weight: 700, color: TUNE.panel.cream, maxWidth: 290 };
const CARD_NOTE = { size: TUNE.panel.note, weight: 600, color: TUNE.panel.dimText, maxWidth: 296 };
function bakePanelCard(c, w, h) {
  const P = TUNE.panel, W2 = w - 12, H2 = h - 12, x = 6, y = 6, r = 24;
  draw.sticker(c, cc => draw.roundRect(cc, x, y, W2, H2, r), { fill: P.col, outline: INK, lineWidth: 3.2, highlight: 0.18, shadow: 0.22 });
  c.lineWidth = 2.4; c.strokeStyle = P.rim; draw.roundRect(c, x + 5, y + 5, W2 - 10, H2 - 10, r - 5); c.stroke();
  draw.text(c, PANEL.sub, w / 2, y + P.subY, CARD_SUB);
  if (PANEL.note) draw.text(c, PANEL.note, w / 2, y + H2 - 18, CARD_NOTE);
}
// too few gems: the primary's face content (over a blank button) in two lines, 'Get gems' at the button's text size over
// '<gem> 30 · need 18' at needSize, the price first in reading order (mirrored in Arabic), so 'Get gems' never hides
// what the Reopen / booster costs and the shortfall is on the button itself; each line shrinks alone past the face's
// inner width; the drawButton text style (cream, the face colour's dark outline, a soft drop)
function bakeNeedFace(c, w, h) {
  const P = TUNE.panel, fs = BTN_YES.size - 1, ns = P.needSize, gs = ns + 3, maxW = w - P.facePad * 2, rtl = i18n.isRTL;
  const ink = color.dark(BTN_YES.color, 0.58), lab = PANEL.yes, num = groupDigits(PANEL.price), need = PANEL.needShort, sep = 12;
  const y1 = -(ns + P.needGap) / 2 - 1, y2 = (fs + P.needGap) / 2 + 1;
  const o = YES_FACE;
  o.size = fs; o.outline = ink; o.outlineWidth = Math.max(2.5, fs * 0.2); o.shadowOffset = Math.max(1.2, fs * 0.07);
  const lw = text.measure(c, lab, fs, 800, 'Baloo 2') + o.outlineWidth / 2;
  c.save();
  c.translate(w / 2, h / 2);
  c.save(); c.translate(0, y1); const k1 = Math.min(1, maxW / lw); c.scale(k1, k1); draw.text(c, lab, 0, text.dir(lab) === 'rtl' ? 0 : fs * 0.07, o); c.restore();
  // the second line: gem + price, a dot, the shortfall
  o.size = ns; o.outlineWidth = Math.max(2.4, ns * 0.21); o.shadowOffset = Math.max(1, ns * 0.07);
  const nw = text.measure(c, num, ns, 800, 'Baloo 2') + o.outlineWidth / 2, tw = text.measure(c, need, ns, 800, 'Baloo 2') + o.outlineWidth / 2;
  const total = gs + 2 + nw + sep + tw, k2 = Math.min(1, maxW / total), dy = ns * 0.07;
  c.translate(0, y2); c.scale(k2, k2);
  let x = -total / 2;
  if (rtl) {                                   // left -> right: the shortfall, the dot, the number, the gem
    draw.text(c, need, x + tw / 2, 0, o); x += tw;
    draw.text(c, '·', x + sep / 2, dy, o); x += sep;
    draw.text(c, num, x + nw / 2, dy, o); x += nw + 2;
    paintGem(c, x + gs / 2, 0, gs);
  } else {
    paintGem(c, x + gs / 2, 0, gs); x += gs + 2;
    draw.text(c, num, x + nw / 2, dy, o); x += nw;
    draw.text(c, '·', x + sep / 2, dy, o); x += sep;
    draw.text(c, need, x + tw / 2, dy, o);
  }
  c.restore();
}
// a paid Reopen's primary face content (over a blank button): the word, a gem and the price at the button's text size,
// the drawButton text style (cream, the face colour's dark outline, a soft drop); scaled down as one when it would pass
// the face's inner width; mirrored in Arabic (reading order: the word, then the gem and the price)
function bakeYesFace(c, w, h) {
  const P = TUNE.panel, fs = BTN_YES.size, gs = P.faceGem, gap = P.faceGap, num = groupDigits(PANEL.price), lab = PANEL.yes;
  const rtl = text.dir(lab) === 'rtl', ow = Math.max(2.5, fs * 0.2);
  const lw = text.measure(c, lab, fs, 800, 'Baloo 2') + ow / 2, nw = text.measure(c, num, fs, 800, 'Baloo 2') + ow / 2;
  const total = lw + gap + gs + 2 + nw, maxW = w - P.facePad * 2, k = Math.min(1, maxW / total);
  const o = YES_FACE; o.size = fs; o.outline = color.dark(P.go, 0.58); o.outlineWidth = ow; o.shadowOffset = Math.max(1.2, fs * 0.07);
  c.save();
  c.translate(w / 2, h / 2); c.scale(k, k);
  let x = -total / 2;
  if (rtl) {                                   // left -> right: the price, the gem, the word
    draw.text(c, num, x + nw / 2, fs * 0.07, o); x += nw + 2;
    paintGem(c, x + gs / 2, 0, gs); x += gs + gap;
    draw.text(c, lab, x + lw / 2, 0, o);
  } else {
    draw.text(c, lab, x + lw / 2, fs * 0.07, o); x += lw + gap;
    paintGem(c, x + gs / 2, 0, gs); x += gs + 2;
    draw.text(c, num, x + nw / 2, fs * 0.07, o);
  }
  c.restore();
}
const YES_FACE = { size: 18, weight: 800, color: '#fff4dc', outline: '', outlineWidth: 3.6, shadow: 'rgba(0,0,0,0.28)', shadowOffset: 1.3 };
// the first Reopen ever: a big cream FREE sticker (green word, a green inner rim) for the primary's corner
const FREE_TXT = { size: TUNE.panel.freeSize, weight: 800, color: TUNE.panel.freeInk, maxWidth: 60 };
function bakeFreeSticker(c, w, h) {
  const r = (h - 4) / 2;
  draw.sticker(c, cc => draw.roundRect(cc, 2, 2, w - 4, h - 4, r), { fill: '#fff4dc', outline: INK, lineWidth: 2.6, highlight: 0.25, shadow: 0.12 });
  c.lineWidth = 1.4; c.strokeStyle = TUNE.panel.go; draw.roundRect(c, 5, 5, w - 10, h - 10, r - 3); c.stroke();
  FREE_TXT.maxWidth = w - 16;
  draw.text(c, TAGTXT.free, w / 2, h / 2 + (text.dir(TAGTXT.free) === 'rtl' ? 0 : FREE_TXT.size * 0.07), FREE_TXT);
}
function bakeMitt(c) {
  draw.sticker(c, cc => {
    cc.beginPath(); cc.moveTo(6, 20); cc.quadraticCurveTo(3, 8, 13, 5); cc.quadraticCurveTo(24, 3, 27, 12); cc.quadraticCurveTo(29, 22, 18, 24);
    cc.quadraticCurveTo(10, 25, 6, 20); cc.closePath();
  }, { fill: BOSS_G, outline: INK, lineWidth: 2.6, highlight: 0.35, shadow: 0.18, bounds: [3, 3, 26, 22] });
  draw.sticker(c, cc => draw.ellipse(cc, 23, 8, 4.4, 3.4), { fill: BOSS_G, outline: INK, lineWidth: 2.2, highlight: 0.3, shadow: 0 });
}
// the boss: a big green monster in a plum pinstripe suit, a too-small cocked top hat, one big eye behind a brass monocle
// and one small one (its wrong detail), little cream horns, a wide grin with one gold tooth, a brass bow tie
function bakeBoss(c, w, h) {
  const G = BOSS_G;
  // the suit (shoulders, lapels, the shirt V, the bow tie)
  const suit = cc => { cc.beginPath(); cc.moveTo(8, h + 2); cc.lineTo(8, 142); cc.quadraticCurveTo(12, 114, 46, 110); cc.lineTo(104, 110); cc.quadraticCurveTo(138, 114, 142, 142); cc.lineTo(142, h + 2); cc.closePath(); };
  draw.sticker(c, suit, { fill: '#3b2c78', outline: INK, lineWidth: 3, highlight: 0.2, shadow: 0.25, bounds: [8, 110, 134, 58] });
  c.save(); suit(c); c.clip();
  c.strokeStyle = 'rgba(233,228,255,0.18)'; c.lineWidth = 1.2;
  for (let x = 14; x < w; x += 9) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x, h); c.stroke(); }
  c.fillStyle = '#fff4dc'; c.beginPath(); c.moveTo(60, 110); c.lineTo(90, 110); c.lineTo(75, 146); c.closePath(); c.fill();
  c.fillStyle = '#2a1f5a';
  c.beginPath(); c.moveTo(56, 110); c.lineTo(75, 150); c.lineTo(52, h); c.lineTo(36, 114); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(94, 110); c.lineTo(75, 150); c.lineTo(98, h); c.lineTo(114, 114); c.closePath(); c.fill();
  c.restore();
  draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(75, 118); cc.lineTo(61, 111); cc.lineTo(61, 125); cc.closePath(); cc.moveTo(75, 118); cc.lineTo(89, 111); cc.lineTo(89, 125); cc.closePath(); },
    { fill: '#d9a441', outline: INK, lineWidth: 2.2, highlight: 0.35, shadow: 0, bounds: [61, 111, 28, 14] });
  draw.sticker(c, cc => draw.circle(cc, 75, 118, 3.6), { fill: '#ffd23f', outline: INK, lineWidth: 2, highlight: 0.3, shadow: 0 });
  // horns
  const horn = (bx, tx, ty) => draw.sticker(c, cc => { cc.beginPath(); cc.moveTo(bx - 7, 50); cc.quadraticCurveTo(tx - 2, ty + 10, tx, ty); cc.quadraticCurveTo(tx + 6, ty + 14, bx + 7, 48); cc.closePath(); },
    { fill: '#f3e6c8', outline: INK, lineWidth: 2.4, highlight: 0.3, shadow: 0.15, bounds: [Math.min(bx, tx) - 8, ty, 18, 50 - ty] });
  horn(40, 30, 26); horn(110, 122, 30);
  // head
  draw.sticker(c, cc => draw.roundRect(cc, 22, 36, 106, 82, 30), { fill: G, outline: INK, lineWidth: 3.2, highlight: 0.32, shadow: 0.2 });
  c.fillStyle = 'rgba(255,120,150,0.35)';
  c.beginPath(); c.ellipse(40, 96, 9, 5.5, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(112, 94, 8, 5, 0, 0, TAU); c.fill();
  // eyes (whites; pupils + lids are live) + the monocle and its chain
  draw.sticker(c, cc => draw.circle(cc, 58, 70, 15), { fill: '#ffffff', outline: INK, lineWidth: 2.6, highlight: 0, shadow: 0.12 });
  draw.sticker(c, cc => draw.circle(cc, 97, 68, 9.5), { fill: '#ffffff', outline: INK, lineWidth: 2.4, highlight: 0, shadow: 0.12 });
  c.lineWidth = 4.6; c.strokeStyle = INK; draw.circle(c, 58, 70, 18.5); c.stroke();
  c.lineWidth = 2.6; c.strokeStyle = '#ffd23f'; draw.circle(c, 58, 70, 18.5); c.stroke();
  c.lineWidth = 1.4; c.strokeStyle = '#d9a441'; c.beginPath(); c.moveTo(44, 82); c.quadraticCurveTo(30, 104, 46, 122); c.stroke();
  // the grin: a dark mouth, a row of teeth, one gold tooth
  const mouth = cc => { cc.beginPath(); cc.moveTo(50, 96); cc.quadraticCurveTo(76, 102, 104, 94); cc.quadraticCurveTo(98, 114, 77, 114); cc.quadraticCurveTo(56, 113, 50, 96); cc.closePath(); };
  draw.sticker(c, mouth, { fill: '#3a1030', outline: INK, lineWidth: 2.6, highlight: 0, shadow: 0, bounds: [50, 94, 54, 20] });
  c.save(); mouth(c); c.clip();
  c.fillStyle = '#fff4dc'; c.fillRect(48, 94, 60, 6.5);
  c.fillStyle = '#ffd23f'; c.fillRect(82, 95, 7, 7);
  c.strokeStyle = 'rgba(29,24,64,0.6)'; c.lineWidth = 1;
  for (let x = 58; x < 104; x += 8) { c.beginPath(); c.moveTo(x, 94); c.lineTo(x, 101); c.stroke(); }
  c.fillStyle = '#ff6b8a'; c.beginPath(); c.ellipse(77, 112, 10, 4, 0, 0, TAU); c.fill();
  c.restore();
  // the too-small top hat, cocked
  c.save();
  c.translate(92, 38); c.rotate(-0.22);
  draw.sticker(c, cc => draw.ellipse(cc, 0, 0, 19, 4.6), { fill: '#2b2148', outline: INK, lineWidth: 2.4, highlight: 0.2, shadow: 0 });
  draw.sticker(c, cc => draw.roundRect(cc, -12, -24, 24, 24, 3), { fill: '#2b2148', outline: INK, lineWidth: 2.4, highlight: 0.25, shadow: 0.15 });
  c.fillStyle = '#d9a441'; c.fillRect(-11, -8, 22, 5);
  c.restore();
}

// ---------------------------------------------------------------- update
function updateLine(dt) {
  for (let k = 0; k < 4; k++) {
    const r = line[k];
    if (!r) continue;
    const S = world.slots[r.slot >= 0 ? r.slot : k];
    if (r.moving) {
      r.mt += k === 0 && pending ? dt * TUNE.rush : dt;      // a buffered pick rushes the walker in
      if (r.mt >= 0) {
        if (!r.walkSet) { r.a.setState('walk'); r.walkSet = true; }
        const u = clamp(r.mt / r.md, 0, 1), e = r.ease(u);
        r.x = lerp(r.fx, S.x, e); r.y = lerp(r.fy, S.feetY, e); r.s = lerp(r.fs, S.scale, e);
        r.dim = clamp(lerp(r.fdim, DIMS[r.slot >= 0 ? r.slot : k], e), 0, 1);
        if (u >= 1) arrive(r);
      }
    } else { r.x = S.x; r.y = S.feetY; r.s = S.scale; r.dim = DIMS[r.slot >= 0 ? r.slot : k]; }
    if (r.popT >= 0) { r.popT -= dt; if (r.popT < 0) shiftPuff(r); }
    // the guest at the rope glances at the poster now and then (the thumb wins while it is down)
    if (k === 0 && !r.moving && !anyTouch()) {
      r.glance -= dt;
      if (r.glance <= 0) {
        const G = TUNE.glance;
        if (r.glancing) { r.glancing = false; r.a.look(null, null); r.glance = G.min + Math.random() * (G.max - G.min); }
        else { r.glancing = true; r.a.look(world.poster.x, world.poster.y + 40); r.glance = G.hold; }
      }
    }
    r.a.update(dt);
  }
}
function updatePhase(dt) {
  if (phase === PH_INTRO) {
    if (gt >= TUNE.firstWalkAt) advance();
  } else if (phase === PH_WALK) {
    const r = line[0];
    if (r && !r.moving && posterReady()) {
      phase = PH_DECIDE; pat = 0; yawned = false;
      // the judged guest keeps its eyes readable under an eyes clause; the last call's why gives the caption slot up
      r.a.steadyEyes(hasEyesClause(rule));
      if (FAIL.ct < TUNE.fail.capLife) FAIL.ct = TUNE.fail.capLife;
      if (BR.slowmoArmed && !r.practice) useSlowmo(true);   // armed before the night: it starts with the first decision
      if (!HINT.rec) { const k = hintKind(r); if (k) startHint(k, r); }
      RING.on = !frozenGuest(r); RING.pop = 0; RING.pat = 0; RING.q = quickQ;
      if (pending) { const p = pending, pl = pendingPlate; pending = ''; pendingPlate = -1; decide(p, pl); }
    }
  } else if (phase === PH_DECIDE) {
    const r = line[0];
    const frozen = (tutorial && frontIdx < TUNE.tutorial.guests) || HINT.rec !== null || r.practice;
    if (!frozen) pat += dt / patSec;
    RING.pat = pat;
    r.a.setPatience(pat);
    if (pat >= TUNE.yawnAt && !yawned) { yawned = true; party.sfx.yawn(); }
    if (pat >= 1) miss();
  }
  if (phase === PH_RESOLVE) {
    if (stepT >= 0) { stepT -= dt; if (stepT < 0) { stepT = -1; advance(); } }
    if (endT >= 0) { endT -= dt; if (endT < 0) { endT = -1; lastCall(); } }
  } else if (phase === PH_LAST) updateLast(dt);
}
function updateFx(dt) {
  const F = TUNE.fail, St = TUNE.stamp;
  if (FAIL.t < F.life + 0.3) FAIL.t += dt;                   // + the staggered pops of a 'matched guest bounced'
  if (FAIL.rec) { FAIL.rt += dt; if (FAIL.rt >= F.ring || !FAIL.rec.on) FAIL.rec = null; }
  if (SHR.t < TUNE.shiftRing.life) { SHR.t += dt; if (SHR.t >= TUNE.shiftRing.life) SHR.rec = null; }
  if (FAIL.ct < F.capLife) FAIL.ct += dt;
  if (FTAG.t < FTAG.life + TUNE.fakeTag.out) { FTAG.t += dt; if (FTAG.t >= FTAG.life + TUNE.fakeTag.out) { FTAG.rec = null; FTAG.bust = false; } }
  updateTapes(dt);
  if (NEWR.t < TUNE.newRules.life) { NEWR.t += dt; if (NEWR.t >= TUNE.newRules.life && NEWR.out < 0) NEWR.out = 0; }
  if (NEWR.out >= 0 && NEWR.out < St.out) NEWR.out += dt;
  updateStamps(dt);
  for (let i = 0; i < PINGS.length; i++) { const p = PINGS[i]; if (p.on) { p.t += dt; if (p.t >= TUNE.ping.life) p.on = false; } }
  const J = TUNE.join;
  for (let i = 0; i < NOTES.length; i++) {
    const n = NOTES[i];
    if (!n.on) continue;
    n.t += dt;
    if (n.t >= J.noteLife) { n.on = false; continue; }
    if (n.t > 0) n.x += n.vx * dt * (1 - n.t / J.noteLife);
  }
  updateJoin(dt);
}
function updateHud(dt) {
  const P = TUNE.plate, H = TUNE.hud;
  for (let i = 0; i < 2; i++) {
    stepSpring(PRESS[i], dt);
    PFLASH[i] = Math.max(0, PFLASH[i] - dt / P.flash);
    DENY[i] = Math.max(0, DENY[i] - dt / P.deny.dur);
  }
  plateA = lerp(plateA, platesLive() ? 1 : P.dimA, 1 - Math.exp(-dt * P.dimRate));
  pauseA = lerp(pauseA, ending() ? 0 : 1, 1 - Math.exp(-dt * P.dimRate * 1.5));   // the pause button stops visibly
  if (plateOffT >= 0 && plateOffT < 1) plateOffT += dt;
  // the patience ring: shown while a guest whose patience runs is being judged, fading out with its last state
  const Q = TUNE.quick, ringOn = RING.on && phase === PH_DECIDE && !!line[0] && !paused;
  RING.a = ringOn ? Math.min(1, RING.a + dt * Q.fade) : Math.max(0, RING.a - dt * Q.fade);
  if (ringOn) RING.pop += dt;
  RING.flash = Math.max(0, RING.flash - dt / Q.flash);
  if (bestT < 9) bestT += dt;
  for (let i = 0; i < 3; i++) { stepSpring(LAMPS[i], dt); LFLASH[i] = Math.max(0, LFLASH[i] - dt * H.lampFlashDecay); }
  stepSpring(COMBO, dt); stepSpring(PROG, dt); stepSpring(PAUSE, dt);
  comboA = lerp(comboA, combo >= 2 ? 1 : 0, 1 - Math.exp(-dt * 14));
  if (BRK.t < TUNE.combo.breakDur) BRK.t += dt;
  // progress: 'Practice' through the prelude, then n / total (endless: the score)
  const inPre = pre > 0 && resolved === 0 && (frontIdx < 0 ? phase === PH_INTRO : frontIdx < pre);
  const pn = inPre ? -1 : endless ? correct : (frontIdx >= 0 ? frontIdx - pre + 1 : Math.max(1, Math.min(resolved, total)));
  if (pn !== progN) {
    progN = pn;
    progStr = pn < 0 ? tutorialWord('cap_practice') : endless ? String(pn) : pn + '/' + total;
    if (pn > 0) PROG.v += H.progKick;
  }
  // the pill keeps the last streak while it fades out (never 'x0')
  if (combo !== comboN) { comboN = combo; if (combo >= 2) comboStr = 'x' + combo; }
  updateCaption(dt);
  updateBoostHud(dt);
  // bloom: combo-5 pulses and the LAST CALL glow sit on top of the engine's grade (exit() puts the base value back, under
  // the result switch's flash)
  bloomK = Math.max(0, bloomK - dt * TUNE.combo.bloomDecay);
  if (phase === PH_OVER) lcBloom = Math.max(0, lcBloom - dt * 1000 / TUNE.lastcall.backMs);
  else if (lcBloom > 0 && phase !== PH_LAST) lcBloom = Math.max(0, lcBloom - dt);
  const target = baseBloom + TUNE.combo.bloom * bloomK + TUNE.lastcall.bloom * lcBloom;
  if (Math.abs(target - lastBloom) > 0.003) { BLOOM.bloom = target; post.set(BLOOM); lastBloom = target; }
}

// ---------------------------------------------------------------- render
function drawRec(ctx, r) {
  let x = r.x, rot = r.rot;
  if (r === line[0]) { x += DRAG.x; rot = dragRot(); }
  if (r.alpha <= 0.01) return;
  DO.alpha = r.alpha; DO.dim = r.dim; DO.flip = r.flip;
  world.lightAt(x, r.y, DO.light);
  if (r.mode === M_LINE && r.slot > 0) { const q = TUNE.queue.lamp[r.slot]; if (DO.light.lamp < q) DO.light.lamp = q; }
  if (rot !== 0) {
    ctx.save(); ctx.translate(x, r.y); ctx.rotate(rot); ctx.translate(-x, -r.y);
    r.a.draw(ctx, x, r.y, r.s, DO);
    ctx.restore();
  } else r.a.draw(ctx, x, r.y, r.s, DO);
}
function sortByY(n) {
  for (let i = 1; i < n; i++) {
    const v = SORT[i];
    let j = i - 1;
    while (j >= 0 && SORT[j].y > v.y) { SORT[j + 1] = SORT[j]; j--; }
    SORT[j + 1] = v;
  }
}
// the amber glass flash when a guest joins the band, and its music notes rising out of the dancer
function drawJoin(ctx) {
  if (JOIN.glass > 0.01) {
    const w = world.window;
    draw.glow(ctx, w.x + w.w / 2, w.y + w.h * 0.55, w.w * 0.62, '#ffb347', TUNE.join.glass * JOIN.glass);
  }
  const J = TUNE.join;
  for (let i = 0; i < NOTES.length; i++) {
    const n = NOTES[i];
    if (!n.on || n.t < 0) continue;
    const u = n.t / J.noteLife, pop = outBack(clamp(u / 0.25, 0, 1));
    const cv = draw.cached(NOTE_KEYS[n.k], 22, 30, NOTE_BAKES[n.k]);
    SPR.alpha = 1 - smoothstep(0.6, 1, u); SPR.scale = pop * J.noteSize / 15; SPR.rot = 0.25 * Math.sin(n.t * 7 + n.wob);
    draw.sprite(ctx, cv, n.x, n.y - J.noteRise * outCubic(u), SPR);
  }
  SPR.alpha = 1; SPR.scale = 1; SPR.rot = 0;
}
const NOTE_BOUNDS = [2, 3, 18, 26], SWEAT_BOUNDS = [4, 3, 18, 27];
function paintNote(c, col) {
  draw.sticker(c, cc => {
    cc.beginPath();
    cc.ellipse(8, 23, 6, 4.6, -0.4, 0, TAU);
    cc.rect(12.2, 4, 2.6, 19);
    cc.moveTo(12.2, 4); cc.quadraticCurveTo(20, 6, 19, 14); cc.quadraticCurveTo(17, 9, 14.8, 9.5); cc.closePath();
  }, { fill: col, outline: '#1d1840', lineWidth: 1.8, highlight: 0.3, bounds: NOTE_BOUNDS });
}
// the twinkle star where a yeeted guest left the screen: pops, spins, shrinks away
function drawPings(ctx) {
  const P = TUNE.ping;
  for (let i = 0; i < PINGS.length; i++) {
    const p = PINGS[i];
    if (!p.on) continue;
    const u = p.t / P.life, s = u < 0.22 ? outBack(u / 0.22) * 1.15 : 1.15 * (1 - smoothstep(0.35, 1, u));
    if (s <= 0.01) continue;
    draw.glow(ctx, p.x, p.y, P.size * 1.3 * s, '#fff1b8', 0.7 * s);
    const cv = draw.cached('play-ping-star', 40, 40, bakePing);
    SPR.alpha = 1; SPR.scale = s * P.size / 30; SPR.rot = p.spin * u * 3;
    draw.sprite(ctx, cv, p.x, p.y, SPR);
  }
  SPR.scale = 1; SPR.rot = 0;
}
function bakePing(c) {
  draw.sticker(c, cc => draw.star(cc, 20, 20, 17, 5, 4), { fill: '#fff6c9', outline: '#1d1840', lineWidth: 2, highlight: 0.4 });
}
// a ring on guest r's `part` (hat / eyes / tail; a colour / pattern rings the whole body; else its middle), from its last
// drawn pose; tt = the ring's clock (s); fake = on its fake prop (anchor 'fake'); dashed = where a missing part should be
function drawPartRing(ctx, r, part, tt, col, a, fake, dashed) {
  if (!r || !r.on || !r.a || a <= 0) return;
  const s = r.s;
  let x, y, rad = TUNE.fail.ringR * Math.max(0.5, s);
  if (fake) { const f = r.a.anchor('fake'); x = f.x; y = f.y; }
  else if (part === 'hat') { const h = r.a.anchor('head'); x = h.x; y = h.y - 8 * s; }
  else if (part === 'eyes') { const f = r.a.anchor('face'); x = f.x; y = f.y; }
  else if (part === 'tail') { const tf = TUNE.hint.tail[r.g.species] || TUNE.hint.tail.blob; x = r.x + (r.flip ? -1 : 1) * (tf[0] + 16) * s; y = r.y + (tf[1] - 14) * s; }
  else if (part === 'color' || part === 'pattern') {
    const b = r.a.bounds(), c = r.a.anchor('center');
    x = c.x; y = c.y; rad = Math.max(b.w, b.h) * s * TUNE.shiftRing.body;
  } else { const c = r.a.anchor('center'); x = c.x; y = c.y; }
  ringAt(ctx, x, y, rad * (1 + 0.1 * Math.sin(tt * 22)), col, a, dashed);
}
// the wrong-call ring on the guest's offending part (follows it while it leaves), and the shapeshift's ring on the part
// that just changed (shift purple, popping in once the new look has read)
function drawFailRing(ctx) {
  const F = TUNE.fail;
  if (FAIL.rec) drawPartRing(ctx, FAIL.rec, FAIL.part, FAIL.rt, F.col, 1 - smoothstep(0.65, 1, FAIL.rt / F.ring), FAIL.fake, FAIL.missing);
  if (SHR.rec && SHR.t >= 0) {
    const u = SHR.t / TUNE.shiftRing.life;
    drawPartRing(ctx, SHR.rec, SHR.part, SHR.t, TUNE.col.shift, clamp(u / 0.12, 0, 1) * (1 - smoothstep(0.65, 1, u)), false, false);
  }
}
// the patience ring on the cobbles around the rope guest's feet, in two passes: the back (before the rope guest: the
// soft gold pool while the quick par runs, the back half of the dark track, the QUICK flash) and the front (after it, so
// no wide guest ever hides it: the front half of the track and the patience gauge). The gauge runs along the FRONT arc
// from its left end (pos 0) to its right end (pos 1) and drains from the right toward the left: the quick share at its
// right end is gold and shrinks to nothing at the par (a visible clock for the speed bonus), the rest is cream, and all
// of it turns red (pulsing) from lateAt. It pops in when the decision opens
function ringArc(ctx, rx, ry, a, b) {     // the gauge between positions a < b along the front arc
  const W = TUNE.quick.wrap, span = Math.PI + 2 * W;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI + W - span * a, Math.PI + W - span * b, true);
}
function drawPatienceRing(ctx, front) {
  const Q = TUNE.quick;
  if (RING.a <= 0.01 && (front || RING.flash <= 0.01)) return;
  const S = world.slots[0], s = S.scale, x = S.x, y = S.feetY + Q.dy * s;
  const rx = Q.rx * s, ry = Q.ry * s, p = clamp(RING.pat, 0, 1), f = 1 - p, q = RING.q;
  const k = 0.6 + 0.4 * outBack(clamp(RING.pop / Q.pop, 0, 1)), late = p >= Q.lateAt, inQ = p < q;
  // Slow-Mo tints the clock ice-cyan (track, gauge, a cool pool under the guest) and pins an hourglass on its right end
  const Sm = TUNE.boost.slowmo, slow = SM.on, mid = slow ? Sm.mid : Q.mid, track = slow ? Sm.track : Q.track;
  if (!front) {
    if (RING.a > 0.01) {
      if (slow) draw.glow(ctx, x, y, rx * 1.3, Sm.col, Sm.glow * RING.a * (1 + 0.25 * Math.sin(t * 3)));
      if (inQ) draw.glow(ctx, x, y, rx * 1.1, Q.col, Q.glow * RING.a * (0.35 + 0.65 * (1 - p / q)));
      ctx.save();
      ctx.globalAlpha *= RING.a;
      ctx.translate(x, y); ctx.scale(k, k);
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
      ctx.lineWidth = Q.w + 3; ctx.strokeStyle = track; ctx.stroke();
      ctx.restore();
    }
    if (RING.flash > 0.01) {               // the QUICK flash: a gold ring bursting outward
      const e = 1 - RING.flash, g = 1 + 0.6 * outCubic(e);
      ctx.save();
      ctx.globalAlpha *= RING.flash;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.ellipse(x, y, rx * g, ry * g, 0, 0, TAU);
      ctx.lineWidth = Q.w * 1.6; ctx.strokeStyle = Q.col; ctx.stroke();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.globalAlpha *= RING.a;
  ctx.translate(x, y); ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.lineWidth = Q.w + 3; ctx.strokeStyle = track; ctx.stroke();
  if (f > 0.004) {
    const pulse = late ? 1 + 0.25 * Math.max(0, Math.sin(t * 18)) : 1, lw = Q.w * pulse;
    const split = inQ ? 1 - q : f;           // cream up to here, gold from here to the end while the par runs
    ringArc(ctx, rx, ry, 0, f);
    ctx.lineWidth = lw + 2.6; ctx.strokeStyle = '#1d1840'; ctx.stroke();
    if (split > 0.004) { ringArc(ctx, rx, ry, 0, split); ctx.lineWidth = lw; ctx.strokeStyle = late ? Q.late : mid; ctx.stroke(); }
    if (inQ) { ringArc(ctx, rx, ry, split, f); ctx.lineWidth = lw + 1; ctx.strokeStyle = Q.col; ctx.stroke(); }
  }
  if (slow) {                                // the hourglass riding the clock, tipping gently (a clock effect: the booster's icon is the snail)
    SPR.scale = Sm.hour / 30; SPR.rot = 0.25 * Math.sin(t * 2.2);
    draw.sprite(ctx, draw.cached('play-ring-hourglass', 34, 34, bakeHourglass), rx + 9, -2, SPR);
    SPR.scale = 1; SPR.rot = 0;
  }
  ctx.restore();
}
function tutorialOn() { return tutorial && !!line[0] && phase === PH_DECIDE && frontIdx >= 0 && frontIdx < TUNE.tutorial.guests; }
// tutorial caption for the guest at the rope (built when the guest changes, never per frame)
function tutStrings() {
  if (TUT.idx === frontIdx) return;
  TUT.idx = frontIdx;
  const wantIn = line[0] ? line[0].g.inside : true;
  TUT.cap = tutorialWord(captionKey(rule, frontIdx, wantIn));
  TUT.icon = frontIdx === 1 ? (wantIn ? 'arrowR' : 'arrowL') : '';
  TUT.w = capWidth(TUT.cap) + (TUT.icon ? TUNE.cap.size * 1.4 : 0);
}
// the target plate breathes for every glove guest (world pass: before the HUD draws the plates)
function drawTutorial() {
  if (!tutorialOn()) return;
  const wantIn = line[0].g.inside;
  PFLASH[wantIn ? 1 : 0] = Math.max(PFLASH[wantIn ? 1 : 0], 0.35 + 0.25 * Math.sin(t * 6));
}
// HUD space, over the scrim: guests 1-2, the glove swipes the right way under the guest (below the caption, clamped
// clear of the plates: tutGlove); guest 3, the glove taps the right plate
function drawTutorialHud(ctx) {
  if (!tutorialOn() || HINT.rec) return;
  const T = TUNE.tutorial, wantIn = line[0].g.inside;
  if (frontIdx >= T.guests - 1) {
    plateRect(wantIn ? 1 : 0, PR);
    GLOVE_TAP.alpha = 1; GLOVE_TAP.rot = T.tap.rot;
    drawGlove(ctx, PR.x + PR.w * T.tap.dx, PR.y + PR.h * T.tap.dy, T.glove, t, GLOVE_TAP);
    return;
  }
  const dir = wantIn ? 1 : -1;                                     // the swipe that is right for this guest (world side)
  const u = (tutT % T.period) / T.period;
  const slide = smoothstep(0.18, 0.68, u), fade = u < 0.1 ? u / 0.1 : u > 0.82 ? Math.max(0, 1 - (u - 0.82) / 0.12) : 1;
  const x0 = stage.w / 2 - dir * T.slide * 0.45, g = tutGlove();
  GLOVE.alpha = fade; GLOVE.press = u > 0.12 && u < 0.74 ? 1 : 0; GLOVE.rot = -dir * 0.35;
  drawGlove(ctx, x0 + dir * T.slide * slide, g.y, g.size, t, GLOVE);
}
// the All-Nighter's best to beat: a dim ghost pill (trophy + n) under the score pill; once passed it pops gold and
// shrinks away (NEW BEST owns the window)
function drawBestPill(ctx, y) {
  const H = TUNE.hud, B = H.best;
  if (!endless || bestN <= 0 || !bestStr || (bestPassed && bestT >= B.pop)) return;
  let sc = 1;
  PILL_BEST.alpha = B.a; PILL_BEST.color = B.col;
  if (bestPassed) {
    const u = bestT / B.pop;
    sc = u < 0.35 ? 1 + 0.3 * outBack(u / 0.35) : 1.3 * (1 - inBack((u - 0.35) / 0.65));
    PILL_BEST.alpha = 1; PILL_BEST.color = B.gold;
  }
  if (sc <= 0.01) return;
  ctx.save(); ctx.translate(H.pillX, y + B.dy); ctx.scale(sc, sc);
  drawPill(ctx, 0, 0, B.w, B.h, bestStr, PILL_BEST);
  ctx.restore();
}
// HUD space, the lower band: the scrim, the plates, the caption and the tutorial glove (LAST CALL / SHUT DOWN: they drop
// out of the frame, inBack, so the payoff owns the screen)
function drawHudBand(ctx) {
  const k = stage.scale * stage.dpr;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  const P = TUNE.plate, Sc = TUNE.scrim, top = stage.h - stage.safeBottom - P.bottom - P.h, L = TUNE.lastcall;
  let off = plateOffT >= 0 ? L.plateOff * inBack(clamp(plateOffT * 1000 / L.plateMs, 0, 1)) : 0;
  if (plateRise >= 0) off = L.plateOff * (1 - outBack(clamp(plateRise * 1000 / TUNE.reopen.plateMs, 0, 1)));   // a Reopen
  if (off !== 0) ctx.translate(0, off);
  if (!scrimG || scrimH !== stage.h) {
    scrimH = stage.h;
    scrimG = ctx.createLinearGradient(0, top - Sc.above, 0, stage.h);
    scrimG.addColorStop(0, 'rgba(' + Sc.col + ',' + Sc.a0 + ')');
    scrimG.addColorStop(clamp((Sc.above + Sc.into) / (stage.h - top + Sc.above), 0, 1), 'rgba(' + Sc.col + ',' + Sc.a1 + ')');
    scrimG.addColorStop(1, 'rgba(' + Sc.col + ',' + Sc.a2 + ')');
  }
  ctx.fillStyle = scrimG; ctx.fillRect(-20, top - Sc.above, stage.w + 40, stage.h - top + Sc.above + 20);
  const left = leftMode(), T = swipeTouch();
  let dragIn = 0, dragOut = 0;
  if (T) {                                                   // a swipe lights the plate of the verdict it would give
    const dx = T.x - T.x0, g = clamp((Math.abs(dx) - 8) / (TUNE.swipe.glowFull - 8), 0, 1);
    if (dx > 0) dragIn = g; else dragOut = g;
  }
  if (plateA < 0.995) ctx.globalAlpha = plateA;
  for (let i = 0; i < 2; i++) {
    plateRect(i, PR);
    const glow = Math.max(PFLASH[i], i === 1 ? dragIn : dragOut, PRESS[i].x * 0.6) * plateA;
    const D = P.deny, shake = DENY[i] > 0 ? Math.sin((1 - DENY[i]) * D.hz * TAU) * D.amp * DENY[i] : 0;
    drawPlate(ctx, i === 1 ? 'in' : 'out', PR.x + shake, PR.y, PR.w, PR.h, clamp(PRESS[i].x, 0, 1), glow, undefined, left, plateSkin);
  }
  drawBar(ctx);
  ctx.globalAlpha = 1;
  drawCaption(ctx);
  drawTutorialHud(ctx);
  ctx.restore();
}
// HUD space, on top: the LAST CALL / SHUT DOWN stamp, the HUD row and the fallback pause overlay
function drawHud(ctx) {
  const H = TUNE.hud, y = stage.safeTop + H.row, k = stage.scale * stage.dpr;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  drawLastStamp(ctx);
  // HUD row: pause, progress, combo, strike lamps (the top-right 100 x 100 stays empty; the pause button fades away once
  // the night is over: LAST CALL plays out to the result)
  if (pauseA > 0.01) {
    BTN.press = clamp(PAUSE.x, 0, 1); BTN.alpha = pauseA;
    drawIconButton(ctx, H.pauseX, y, H.pause, 'pause', BTN);
  }
  const ps = 1 + PROG.x * H.pop;
  ctx.save(); ctx.translate(H.pillX, y); ctx.scale(ps, ps);
  PILL.icon = endless ? 'star' : mode === 'daily' ? 'calendar' : 'moon';
  drawPill(ctx, 0, 0, H.pillW, H.pillH, progStr, PILL);
  ctx.restore();
  drawBestPill(ctx, y);
  const C = TUNE.combo, brk = BRK.t < C.breakDur && combo < 2;
  if (comboA > 0.02 || brk) {
    // a streak of breakFrom+ that just broke drops off the cornice, tilts and greys out as it fades
    const bu = brk ? BRK.t / C.breakDur : 0, fall = brk ? clamp(bu / 0.45, 0, 1) : 0;
    const cs = brk ? 1 : (0.6 + 0.4 * comboA) * (1 + COMBO.x * H.pop);
    ctx.save(); ctx.translate(H.comboX, y + C.dropY * outCubic(fall)); ctx.rotate(C.dropRot * outBack(fall)); ctx.scale(cs, cs);
    PILL_COMBO.alpha = brk ? 1 - smoothstep(0.3, 1, bu) : comboA;
    PILL_COMBO.color = brk ? C.grey : TUNE.col.combo;
    drawPill(ctx, 0, 0, H.comboW, H.comboH, brk ? BRK.last : comboStr, PILL_COMBO);
    ctx.restore();
  }
  for (let i = 0; i < 3; i++) {
    const broken = i < strikes || (SC.wait && i === SC.lamp), x = H.lamps[i], s = LAMPS[i].x;
    if (!broken) draw.glow(ctx, x, y - 1, H.lamp * 0.9, '#ffb347', 0.32 + 0.08 * Math.sin(t * 3 + i));
    if (LFLASH[i] > 0) draw.glow(ctx, x, y, H.lamp * 1.6, '#ff4d5e', LFLASH[i] * 0.9);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    drawStrikeLamp(ctx, 0, 0, H.lamp, !broken, broken);
    ctx.restore();
  }
  if (paused) {
    const O = TUNE.pauseOv;
    ctx.fillStyle = 'rgba(8,7,26,' + O.dim + ')'; ctx.fillRect(-20, -20, stage.w + 40, stage.h + 40);
    drawStampText(ctx, word('pause'), stage.w / 2, stage.h * O.y, O.title, '#ffc233');
    PILL.icon = 'play';
    drawPill(ctx, stage.w / 2, stage.h * O.y + O.pillDy, O.pillW, O.pillH, word('resume'), PILL);
  }
  drawBoostHud(ctx);
  drawPanel(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------- scene
// every cached HUD / caption / stamp string in the current language: on resume and whenever the language changes mid-
// night (settings in the pause overlay, or another tab's save merged in by profile.js)
function rebuildStrings() {
  TUT.idx = -1; capStr = ''; progN = -2; comboN = -1;
  if (HINT.rec) hintStr();
  if (FAIL.g && FAIL.ct < TUNE.fail.capLife && FAIL.rule) { FAIL.str = failHint(FAIL.rule, FAIL.g, FAIL.admit); FAIL.w = FAIL.str ? capWidth(FAIL.str) : 0; }
  if (NEWR.word) NEWR.word = word('rule_new');
  if (FTAG.word) FTAG.word = word('fake');
  xrayWord();
  if (BR.open || PANEL.on) refreshChips();
  if (LC.on && LC.word) {
    LC.word = LC.shut ? tutorialWord('shut_stamp') : LC.tier === 'gold' ? tutorialWord('lc_perfect') : label('lastcall');
    if (!LC.shut) LC.size = fitStamp(LC.word, lcSize(LC.tier));
    if (LC.shut) LC.tapeKey = 'play-tape-' + i18n.lang;
  }
}
i18n.onChange(() => { if (active) rebuildStrings(); });

export const play = {
  get phase() { return phase; },
  get world() { return world; },
  get result() { return resultParams; },

  enter(params) {
    const p = params || {};
    // re-entered straight from itself (Restart from pause, a dev restart): the old night's confetti must not linger.
    // Entered from another scene, that scene's particles stay alive through the transition.
    if (nowMs() - leftAt < 100) particles.clear();
    lastParams = p;
    mode = p.mode === 'daily' || p.mode === 'endless' ? p.mode : 'night';
    endless = mode === 'endless';
    hintsOn = p.hints !== false;
    nightN = Math.max(1, Math.floor(+p.night || 1));
    dateKey = mode === 'daily' ? (p.date ? String(p.date) : todayKey()) : (p.date ? String(p.date) : '');
    if (mode === 'daily') { seed = p.seed !== undefined ? p.seed : dailySeed(dateKey); nightN = dailyNightNumber(dateKey); }
    else if (endless) { seed = p.seed !== undefined && p.seed !== null ? p.seed : (Date.now() % 1000000007); nightN = 0; }
    else seed = p.seed !== undefined && p.seed !== null ? p.seed : hashNight(nightN);
    night = makeNight({ seed: seed, night: nightN, mode: mode });
    total = endless ? 0 : night.guests.length;
    walkSec = (night.params && night.params.walkMs ? night.params.walkMs : TUNE.walk * 1000) / 1000;
    // a fresh profile learns on its first 3 guests in every mode: night 1 on its own, anything else after a prelude
    tutorial = p.tutorial === true || (p.tutorial !== false && !profile.hasSeen('tutorial'));
    pre = 0; preRule = null; preGuests = null;
    if (tutorial && !(mode === 'night' && nightN === 1)) {
      const pl = makePrelude();
      pre = pl.guests.length; preRule = pl.rule; preGuests = pl.guests;
    }
    rule = pre ? preRule : night.rule;
    // a daily's attempt counts from its start (profile.startDaily confirms a run the launching scene already marked)
    startedAt = typeof p.startedAt === 'number' && p.startedAt > 0 ? p.startedAt : Date.now();
    if (mode === 'daily') {
      profile.startDaily(dateKey, startedAt, total);
      if (p.startedAt !== startedAt) {                // the pause overlay reads the run's start from __play.last
        const q = {};
        for (const k in p) q[k] = p[k];
        q.startedAt = startedAt; lastParams = q;
      }
    }
    resetCounters();
    for (let i = 0; i < POOL.length; i++) freeRec(POOL[i]);
    line[0] = line[1] = line[2] = line[3] = null;
    clearStamps();
    for (let i = 0; i < PINGS.length; i++) PINGS[i].on = false;
    for (let i = 0; i < NOTES.length; i++) NOTES[i].on = false;
    phase = PH_INTRO; t = 0; gt = 0; paused = false; active = true; pending = ''; stepT = -1; endT = -1; lcT = -1; slamDoorT = -1;
    nextIdx = 0; frontIdx = -1; pat = 0; yawned = false; resultParams = null; verdictAt = -9; verdictMs = -1e9; HELD.kind = '';
    verdictKind = ''; verdictPlate = -1; pendingPlate = -1; quickQ = 0; RING.q = 0;
    shutOut = false; lateStrike = false; plateOffT = -1; pauseA = 1; lcTo = TUNE.lastcall.toResult; shiftPopAt = -9;
    tutT = 0; bloomK = 0; lcBloom = 0; comboA = 0; progN = -2; comboN = -1; plateA = 1; TUT.idx = -1; capA = 0; capStr = '';
    HINT.rec = null; HINT.a = 0; HINT.kind = ''; HINT.seen = '';
    FAIL.rule = null; FAIL.t = 9; FAIL.rec = null; FAIL.str = ''; FAIL.ct = 9; FAIL.g = null; FAIL.missing = false; FAIL.fake = false;
    JOIN.d = null; JOIN.hit = true; JOIN.glass = 0;
    BRK.t = 9; BRK.last = ''; comboStr = ''; NEWR.t = 9; NEWR.word = ''; NEWR.out = -1; SHR.rec = null; SHR.t = 9; SHR.part = '';
    FTAG.rec = null; FTAG.t = 9; FTAG.word = ''; FTAG.bust = false; FTAG.life = TUNE.fakeTag.life; BUST.rec = null;
    for (let i = 0; i < TAPES.length; i++) TAPES[i].on = false;
    RING.a = 0; RING.on = false; RING.flash = 0; RING.pat = 0; RING.pop = 9;
    MILE.k = -1; MILE.last = -1;
    LC.on = false; LC.word = ''; LC.sub = ''; LC.hard = false; LC.tier = ''; LC.goldAt = -1;
    resetTouches(); PRESS[0].x = PRESS[1].x = 0; PRESS[0].to = PRESS[1].to = 0; PFLASH[0] = PFLASH[1] = 0; DENY[0] = DENY[1] = 0;
    DRAG.x = DRAG.v = DRAG.to = 0; leanK = 0;
    for (let i = 0; i < 3; i++) { LAMPS[i].x = 1; LAMPS[i].v = 0; LFLASH[i] = 0; }
    COMBO.x = COMBO.v = 0; PROG.x = PROG.v = 0; PAUSE.x = PAUSE.v = 0; PAUSE.to = 0;
    PS.old = null; PS.tearT = -1; PS.repin = false; PS.clearBand = false; PS.mut = false; PS.rot.x = 0; PS.rot.v = 0; PS.chg = 0; PS.chgT = 9;
    // the All-Nighter: data's per-call strikes, and the best to beat (shown as a ghost pill; NEW BEST once passed)
    const ep = endless ? endlessParams(0) : null;
    missStrike = ep && ep.missStrike > 0 ? ep.missStrike : 0; bounceStrike = ep && ep.bounceStrike > 0 ? ep.bounceStrike : 0;
    bestN = endless ? profile.endlessBest : 0; bestStr = bestN > 0 ? String(bestN) : ''; bestPassed = false; bestT = 9;
    slamPoster(TUNE.introAt, true);                 // the clip hook: the rule pops at screen centre, then flies to its nail
    // the street (built once, reset per night) + the party clock
    const decor = profile.decorLevel();
    if (!world) world = createWorld({ lobby: false, decor: decor, band: null, beat: beatFn });
    else { world.setLobby(false); world.reset(true); world.setDecor(decor); world.setBeat(beatFn); }
    setActorBeat(beatFn);
    party.start('play');
    party.resetLayers();
    energyTier = -1; setEnergy(0);                  // last night's LAST CALL left the band at full energy
    camera.reset();
    resetDolly();
    baseBloom = post.params && post.params.bloom !== undefined && lastBloom < 0 ? post.params.bloom : baseBloom;
    lastBloom = -1;
    for (let k = 0; k < 4; k++) SCALES[k] = world.slots[k].scale;
    applyLook();
    startBoosters();
    // three guests already wait in the queue; the first steps up at firstWalkAt
    for (let k = 1; k <= 3; k++) {
      const r = spawn(nextIdx);
      if (!r) break;
      nextIdx++;
      place(r, k);
      line[k] = r;
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
      window.addEventListener('blur', onBlur);
      window.addEventListener('pagehide', onBlur);
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    armHistory();
  },

  exit() {
    active = false;
    leftAt = nowMs();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onBlur);
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    if (historyOn) { window.removeEventListener('popstate', onPopState); historyOn = false; }
    for (let i = 0; i < POOL.length; i++) freeRec(POOL[i]);
    line[0] = line[1] = line[2] = line[3] = null;
    HINT.rec = null; HINT.a = 0; FAIL.rec = null; JOIN.d = null; LC.on = false; SHR.rec = null;
    BLOOM.bloom = baseBloom; post.set(BLOOM); lastBloom = -1;
    // leaving for the result: the camera's ease home from the dolly keeps running under it (goResult); otherwise snap
    if (!(phase === PH_OVER && resultParams)) resetDolly();
    resetTouches(); HELD.kind = ''; DRAG.x = DRAG.v = DRAG.to = 0; BUST.rec = null;
    PANEL.on = false; PANEL.out = -1; REO.on = false; REO.hold = false; XR.on = false; SM.on = false; SM.k = 1; SC.wait = false;
    BR.open = false; BR.pend = false; BR.want = ''; plateRise = -1; CAMSAVE.on = false;
    wcall('endRun');                       // the run is over: its key no longer spends a booster or a Reopen
  },

  pause() {
    resetTouches(); HELD.kind = ''; PRESS[0].to = PRESS[1].to = 0; PAUSE.to = 0; DRAG.to = 0;
    for (let i = 0; i < CHIPS.length; i++) CHIPS[i].press.to = 0;
    for (let i = 0; i < PBTN.length; i++) PBTN[i].press.to = 0;
    PANEL.down = -9;
  },
  // back from an overlay (the pause overlay, maybe after a language change in settings; the shop or a booster's buy
  // sheet): every cached HUD / caption string rebuilds, the wallet is read again (a Reopen panel shows the new balance),
  // and a booster just bought from its sheet is used at once
  resume() {
    PAUSE.to = 0; rebuildStrings(); camBack();
    if (BR.want && !PANEL.on) {
      const id = BR.want;
      BR.want = '';
      if (BR.open && !ending() && haveBooster(id)) applyBooster(id);
    }
  },
  // the doc's hook for an outside Reopen offer (offer.js kind 'reopen' after wallet.reopen paid): the night goes on
  reopen() { if (!LC.on || !LC.shut || REO.on) return false; if (PANEL.on) closePanel(); startReopen(); return true; },
  // the engine's interrupts (the rotate-your-phone card): open the pause overlay first, so nobody comes back to a guest
  // half out of patience
  onInterrupt() { autoPause(); },

  update(dt) {
    if (!world || !active) return;
    updateHud(dt);
    if (paused || panelHolds()) return;
    const sdt = dt / speedK;
    t += dt; gt += sdt; tutT += dt;
    world.update(sdt);
    updatePoster(sdt);
    updatePhase(sdt);
    // a pick held inside the buffer guard is applied the moment the guard runs out (real time)
    if (HELD.kind && nowMs() >= HELD.at) { const k = HELD.kind; HELD.kind = ''; choose(k, HELD.t0, HELD.plate); }
    updateLine(sdt);
    updateDrag(dt);
    for (let i = 0; i < POOL.length; i++) { const r = POOL[i]; if (r.on && r.mode !== M_LINE) updateLeaver(r, sdt); }
    updateFx(sdt);
    updateBoosters(sdt);
    updateHint(dt);
  },

  render(ctx) {
    if (!world) return;
    world.drawBack(ctx);
    drawLightsOut(ctx);
    drawJoin(ctx);
    drawDoorCrack(ctx);
    // an admitted guest walking IN is the deepest thing on the street (clipped to the door opening)
    let door = false;
    for (let i = 0; i < POOL.length; i++) {
      const r = POOL[i];
      if (r.on && r.mode === M_ADMIT && r.inside) { if (!door) { world.beginDoorway(ctx); door = true; } drawRec(ctx, r); }
    }
    if (door) world.endDoorway(ctx);
    // the queue, back to front (plus walk-offs that have cleared the rope)
    let n = 0;
    for (let k = 1; k < 4; k++) if (line[k]) SORT[n++] = line[k];
    for (let i = 0; i < POOL.length; i++) { const r = POOL[i]; if (r.on && offBehind(r)) SORT[n++] = r; }
    sortByY(n);
    for (let i = 0; i < n; i++) drawRec(ctx, SORT[i]);
    if (XR.on) for (let k = 1; k < 4; k++) drawXrayRec(ctx, line[k]);
    particles.draw(ctx, 'back');
    drawPosters(ctx);
    world.drawMid(ctx);
    drawRopeTaut(ctx);
    drawPatienceRing(ctx, false);
    // the rope guest, admits on their hop, walk-offs still at the rope
    n = 0;
    if (line[0]) SORT[n++] = line[0];
    for (let i = 0; i < POOL.length; i++) {
      const r = POOL[i];
      if (r.on && ((r.mode === M_ADMIT && !r.inside) || (r.mode === M_OFF && !offBehind(r)))) SORT[n++] = r;
    }
    sortByY(n);
    for (let i = 0; i < n; i++) drawRec(ctx, SORT[i]);
    drawPatienceRing(ctx, true);           // the gauge's front arc: never hidden behind a wide guest
    if (XR.on) drawXrayRec(ctx, line[0]);
    world.drawFront(ctx);
    drawTape(ctx);
    for (let i = 0; i < POOL.length; i++) { const r = POOL[i]; if (r.on && r.mode === M_YEET) drawRec(ctx, r); }
    drawEmote(ctx);
    drawFailRing(ctx);
    drawTapes(ctx);
    drawFakeTag(ctx);
    drawPings(ctx);
    drawStamps(ctx);
    drawXrayBeam(ctx);
    drawReveal(ctx);
    drawTutorial();
    // the lower band (scrim, plates, caption), then the hint glove over it (it never sits under the caption pill), then
    // the HUD row on top
    drawHudBand(ctx);
    drawHintGlove(ctx);
    drawHud(ctx);
  },

  onInput(evt, d) {
    if (!active || phase === PH_OVER) return false;
    if (PANEL.on) return evt === 'down' || evt === 'move' || evt === 'up' ? panelInput(evt, d) : true;
    if (evt === 'down') return onDown(d);
    if (evt === 'move') return onMove(d);
    if (evt === 'up') return onUp(d);
    if (evt === 'drag') { const T = touchFor(d.id); if (T) { T.vx = d.vx; T.vT = nowMs(); } return true; }
    return false;
  },
};

// ---------------------------------------------------------------- test hook
function touchStale() { for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].id !== -1 && TOUCHES[i].stale) return true; return false; }
function touchCount() { let n = 0; for (let i = 0; i < TOUCHES.length; i++) if (TOUCHES[i].id !== -1) n++; return n; }
function frontSpec() { return line[0] ? line[0].g : null; }
function queueIdx() { return [line[0] ? line[0].idx : -1, line[1] ? line[1].idx : -1, line[2] ? line[2].idx : -1, line[3] ? line[3].idx : -1]; }
if (typeof window !== 'undefined') {
  window.__play = {
    tune: TUNE,
    // { phase, index (queue index, practice included), total (null in endless), pre (practice guests), practice (the front
    //   guest is one), correct, strikes, combo, comboMax, done (guests resolved), ended, ready (a decision is accepted now),
    //   front (the data guest at / heading to the rope), truth (its verdict), rule, pending (a buffered pick), hint ('neg' |
    //   'fake' | 'shift' | ''), caption (on show), paused, drag (the follow offset), shut (a SHUT DOWN ending), ... }
    state() {
      const f = frontSpec();
      return {
        phase: phase, index: frontIdx, total: endless ? null : total, pre: pre, practice: !!(line[0] && line[0].practice),
        correct: correct, strikes: strikes, combo: combo,
        comboMax: comboMax, done: resolved, ended: phase === PH_LAST || phase === PH_OVER, ready: phase === PH_DECIDE,
        front: f, truth: f ? f.inside : null, shown: line[0] ? line[0].a.spec : null, rule: rule, mode: mode, night: nightN, missed: missed, letIn: letIn,
        bounced: bounced, wrongAdmits: wrongAdmits, wrongBounces: wrongBounces, patience: pat, speed: speedK,
        tutorial: tutorial, result: resultParams, seed: seed, queue: queueIdx(), pending: pending, paused: paused,
        hint: HINT.rec ? HINT.kind : '', hintGlove: HINT.rec ? [HINT.gx, HINT.gy, HINT.rot, HINT.a] : null, caption: capA > 0.5 ? capStr : '',
        posterReady: posterReady(), left: leftMode(), drag: DRAG.x, shut: LC.on && LC.shut, lastcall: LC.on, camera: camera.base,
        quick: quickN, timed: timedN, quickOpen: phase === PH_DECIDE && RING.on && pat < quickQ, quickPar: quickQ * patSec, ring: RING.a,
        held: HELD.kind, best: bestN, bestPassed: bestPassed, stale: touchStale(), touches: touchCount(), lcTo: lcTo, lcTier: LC.tier, fail: FAIL.ci, failPart: FAIL.rec ? FAIL.part : '',
        failMissing: FAIL.missing, fakeTag: FTAG.t < FTAG.life ? FTAG.word : '', fakeTagBust: FTAG.bust, newRules: [NEWR.word, NEWR.t, NEWR.out, PS.mut, PS.chg],
        // boosters: open (the bar works tonight), bar (chip ids on show), live (tappable now), xray [from, to) while on,
        // slowmo k, second armed / saving, used, panel ('reopen' | 'buy' | ''), reopen (offer held / running), patSec
        boost: { open: BR.open, key: BR.key, bar: BAR.map(c => c.id), live: barLive(), shown: BR.shownT, xray: XR.on ? [XR.from, XR.to] : null,
          slowmo: SM.on ? SM.k : 0, second: SC.armed ? 'armed' : SC.wait ? 'saving' : '', used: { xray: BR.used.xray, slowmo: BR.used.slowmo, second: BR.used.second },
          counts: CHIPS.map(c => c.badge), boosted: BR.boosted, reopens: BR.reopens, busted: BR.busted, shiftCaught: BR.shiftCaught, wallet: !!WAL },
        panel: PANEL.on && PANEL.out < 0 ? PANEL.kind : '', panelInfo: PANEL.on ? { price: PANEL.price, gems: PANEL.gems, afford: PANEL.afford, need: PANEL.need,
          needStr: PANEL.needStr, yes: PANEL.yes, no: PANEL.no, title: PANEL.title } : null,
        reopen: { hold: REO.hold, on: REO.on, t: REO.t, price: REO.price }, patSec: patSec, quickQ: quickQ,
      };
    },
    // taps a booster chip (the player's path: buys / uses / arms / refuses like a real tap); returns the boost state
    boost(id) { const c = CHIP[id]; if (c) tapChip(c); return this.state().boost; },
    // answers the panel: 'yes' (Reopen / Buy & use / Get gems), 'no' (No thanks / Not now), 'close' (the X)
    panel(a) { if (!PANEL.on || PANEL.out >= 0) return false; return a === 'yes' ? panelYes() : panelNo(); },
    // a mock wallet (dev pages): the MONETIZATION §11.3 subset this scene calls; null puts the real one back if loaded
    wallet(w) { if (w !== undefined) useWallet(w === null ? REAL_WAL : w); return WAL; },
    get look() { return { club: LOOK.club, rope: LOOK.rope, door: LOOK.door, plate: LOOK.plate, skin: plateSkin }; },
    // the stamp lane now: [{ word, v (verdict-class), t, out, x, y }] (shown and waiting)
    stamps() {
      const out = [];
      for (let i = 0; i < STAMPS.length; i++) { const s = STAMPS[i]; if (s.on) out.push({ word: s.word, v: s.v, t: s.t, out: s.out, x: s.x, y: s.y, sub: s.sub }); }
      return out;
    },
    decide(kind) { return decide(kind === 'in' ? 'in' : 'out'); },
    // the player's path (buffers / holds / refuses like a swipe or plate release would; t0 = when its touch began,
    // performance.now ms, default now; plate = the plate it began on, default none)
    choose(kind, t0, plate) { return choose(kind === 'in' ? 'in' : 'out', t0, plate); },
    // multiplies every game timing by k (k < 1 = faster); returns the factor in use
    speed(k) { if (k > 0) speedK = k; return speedK; },
    // the fallback pause overlay (no 'pause' scene registered): pause(true / false); returns the paused flag
    pause(on) { if (on === true || on === false) paused = on; return paused; },
    // hand-steps the engine (tweens, camera, particles, scenes) n times by dt: works while rAF is throttled
    step(dt, n) {
      dt = dt > 0 ? dt : 1 / 120;
      n = n > 0 ? n : 1;
      for (let i = 0; i < n; i++) { tweens.update(dt); camera.update(dt); particles.update(dt); scenes.update(dt); }
      return phase;
    },
    renderOnce() {
      stage.begin(); camera.apply(stage.ctx); scenes.render(stage.ctx); particles.draw(stage.ctx, 'front'); camera.drawOverlay(stage.ctx); stage.end();
    },
    // a thumb held in the swipe zone dragged dx units sideways (the drag-follow preview); drag(null) lifts it, no verdict
    drag(dx) {
      let T = touchFor(999);
      if (dx === null || dx === undefined) { if (T) T.id = -1; return DRAG.x; }
      if (!T || T.stale) { T = T || slotFor(); T.t0 = nowMs(); T.stale = false; T.seq = ++touchSeq; }
      T.id = 999; T.zone = true; T.plate = -1; T.swipe = false; T.pause = false; T.onPlate = false;
      T.x0 = stage.w / 2; T.y0 = stage.h * 0.7; T.x = T.x0 + dx; T.y = T.y0;
      return DRAG.x;
    },
    // the guests in flight (admits, yeets, walk-offs): { mode, t, x, y, s, alpha, cx, cy (body centre), finished }
    leavers() {
      const out = [], names = ['', 'line', 'admit', 'yeet', 'off'];
      for (let i = 0; i < POOL.length; i++) {
        const r = POOL[i];
        if (!r.on || r.mode === M_LINE) continue;
        const c = r.a.anchor('center');
        out.push({ mode: names[r.mode], t: r.t, x: r.x, y: r.y, s: r.s, alpha: r.alpha, cx: c.x, cy: c.y, finished: r.a.finished, joined: r.joined });
      }
      return out;
    },
    get last() { return lastParams; },
  };
}
