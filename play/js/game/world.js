// world.js: the street + party-window diorama of Monster Bouncer (GAME-SPEC §4 layout, §5 art contract, §6 rows ADMIT / wrong
// admit / LAST CALL / unlock band). createWorld({ lobby, decor 0..6, band: [species | guest spec], beat: fn -> beats }).
// Play scene draw order: world.drawBack(ctx); an admitted guest walking IN (world.beginDoorway(ctx), the guest,
// world.endDoorway(ctx): clipped to the door opening so it passes behind the jambs, the door leaf redrawn over it); the
// queue guests (world.slots 3..1); the rule poster with drawPoster(ctx, rule, poster.x, poster.y, t, { scale:
// poster.scale }); world.drawMid(ctx) (the rope run + stanchions in depth order: optional, drawBack draws them until
// drawMid is first called); the front guest (slot 0, walkers, a guest hopping over the rope); world.drawFront(ctx); and
// world.update(dt) every step. The world owns the layout: on short stages (H < 880 down to the 700 letterbox = every
// 16:9 phone) the window and header shrink and the facade base drops so the door keeps a door's proportions (top
// always 16 under the header). The rule poster hangs on the free wall between the building's corner and the door's brass
// frame, as big as TUNE.play.posterS allows (the 60-unit 3-clause badges stay ~50-55 units on stage at every height) and
// as close to posterX as that wall allows; the marquee's bulb row is phased so its nail hangs between two bulbs.
// slots[0].scale is the largest at which the tallest guest (a tall in a party hat, TUNE.guestEnv) clears the poster's
// footprint box at poster.scale (read live from icons.js at layout: posterBox() when it exports one, else the widest card
// x the deepest foot of posterMetrics over 1..3 clauses, so a bigger card never drifts out of sync: world.posterBox
// reports it; TUNE.poster.reserve can hold room for a wider one), so every guest at the rope is decidable from what is on
// screen; when stacking the poster over the guest would leave it under scale stackMin the poster slides left (its card
// over the corner quoins, the street lamp riding up beside it) and the front guest steps right as far as needed (slot 0
// x 264 .. ~272: its widest band stays clear of the big foreground stanchion) to keep sideS; only then does the card
// shrink. The door's sconce rides on its jamb (the right one, or none, when the front guest's head could reach the
// left one) and the house number is an enamel plate on the lintel: nothing of the door sits in the rope guest's head
// band. The queue follows GAME-SPEC §1's 0.8 / 0.64 / 0.5
// steps from the front, shrunk to clear the poster too (never below qFloor of the step; a tall hat may then tuck behind
// the poster, which is why the poster draws after the queue), spread back-left by row width (x 146 / 82 / 30, each back
// row standing higher so its head and torso marking clear the guest in front; the last one against the wall; every
// queued face stays >= ~85 % visible over all species pairs (it was ~70 %): dev/world.html queue()) so the guests read
// as a line; the street lamp hangs from the corner on an iron arm, so no post stands behind the back row; the left rope
// stanchion stands in the seam between the queue and the front guest. By H (icons.js 212 x 97.4 card, 60-unit 3-clause
// badges): poster scale / 3-clause badge on stage / slot 0 (x, scale): 700 0.83 / 50 / (272, 1.05) side; 780 0.86 / 51.5 /
// (271, 1.05) side; 844 0.91 / 54.7 / (240, 1.09) stacked (dev/world.html room() checks the wall, the lamp, the door).
// Everything static is baked once per layout with draw.cached (keys carry mode, stage height, decor level, language and
// font generation): the night sky + moon + distant city, the indigo facade with the arched PARTY WINDOW frame and the
// marquee header the rule poster hangs from, the brass door frame with its warm hallway, the cobbled street + sidewalk in
// perspective with the lamp's cool light pool (wet sheen on the stones) and wet reflections of the brass door and the
// lights, the velvet queue-lane carpet (a curve along the queue with worn shadows under each row, a soft end under the
// last guest, a brass rod before the rope), the street lamp (a lantern on a wrought-iron wall arm with a scroll brace);
// inside the window the room's wall, stage + back risers, dance floor, plants and the window glass (fanlight,
// reflections, garland, the raised banner (MONSTER BOUNCER on the street, HOUSE BAND / فرقة البيت in the lobby): under the arch
// between the chandelier and the DJ, or on the stage lip in short rooms, where the bunting moves up into the fanlight
// with a gap over the DJ so no flag ever crosses a face); in front the light-ray wedge, the ivy and two brass-rimmed
// planters with clipped topiaries (leafy scalloped clumps in a cool green indigo, a lamp-side rim, a string of fairy
// lights whose glow twinkles on the beat). Only animated bits draw per frame: twinkling stars, chasing marquee bulbs, the
// door leaf (one blit when shut, perspective slices while it swings) + its amber spill and pool on the cobbles (brighter
// as it opens), the lamp cone + moths, the stanchions + velvet rope sag, the chandelier pendulum, the standing lamp in
// the free right corner (always drawn in front of the band: on a wrong admit it topples RIGHT toward the jamb with
// outBounce while its foot skids left, the shade lands in the corner with sparks + smoke there), the tilted picture, the
// DJ monster (grooves, glares) at a booth with a 5-bar LED equaliser and spinning platters, the disco ball + light specks
// (phases integrate dt x spin, so spin-ups and the wrong-admit stop never jump), beat-lit floor tiles, neon flicker,
// confetti cannons, the unlock spotlight, the window's own particles, the LAST CALL street burst + rain, and the dancers:
// actor.js actors in band mode (each plays INSTRUMENT[species]; a drummer gets a world-drawn kit: a big kick drum in
// front with a lacquered shell band, brass lugs and a ribbon logo, and a hi-hat that ticks on the off-beats; the keys
// player dances behind a world-drawn keyboard on an X stand; each member gets a soft backlight). Band composition: the
// stage pairs flank the DJ, the floor slots sit in the gaps between them, two front-row slots flank the booth; a tall
// always takes a stage slot (a shorter member steps down for it). In play only the stage row is the band (instruments,
// kits, backlights); the floor and front rows are the crowd: hands-free dancers at ~0.84x the band's scale on two depth
// rows whose x slots sit in the band's gaps, so their heads stay under the stage lip and never cross an instrument. Play
// caps the window at 8 actors (4 band + 4 crowd); every member past that drops out of the actors (the oldest, with a
// poof) and joins the crowd silhouette along the sill instead (TUNE.crowd: dark backs of heads in a deep tone of their
// colour, stage-lit rims, bobbing on the beat, a hand up now and then), so the window keeps filling up all night without
// a pile-up (dev/world.html occlusion(): no member covers more than ~12 % of another).
// Nothing on the per-frame path allocates (reused option objects, pooled particles).
// Lobby mode frames the same street for the home screen: a bigger, lower party window (the House Band on the stage, its
// banner naming the act) whose marquee sits just over the home's PLAY button (anchored to the safe bottom, so no empty
// band of brick opens between them on tall phones), and below the marquee only brick: the PLAY button and cards cover
// that band, so there is no door, no rope or queue lane, no planters, and the street lamp stands just out of frame on
// the left (its cool cone and glow still wash the wall); the moon hangs high in the right corner, clear of the neon
// title's letters. drawLobby(ctx) = the §11 name for it (switches to lobby, back + front).
// API: update(dt), drawBack(ctx), drawMid(ctx), drawFront(ctx), drawLobby(ctx), beginDoorway(ctx), endDoorway(ctx),
// setBand(list), admit(guestOrActor) (its dancer appears TUNE.admit.delay s later, as play's sparkle comet lands, and
// springs in from 0.6 (a bouncy overshoot) with sparks in its colour flying out of its silhouette edge), unlock(species |
// spec | actor) (the §6 ceremony: amber spotlight on centre stage, pop-in 0 -> 1.25 -> 1 + triple hop, then a hop-walk to
// its slot, 1.75 s), spotlight(on, slot?), degrade(0..3) (every dancer flinches, bulbs black out, the glass pulses red,
// the disco ball dies, the lamp falls; 3 = SHUT DOWN (play's 3rd strike ends the night): the band slumps after the
// flinch, instruments down, the marquee bulbs die left to right in step with play's window columns, the disco stops dead,
// the floor goes dark, the DJ's platters stop; then, in the hold before the result, the DJ booth's EQ, the last light in
// the room, strobes and pops (TUNE.shut.dj s in) with sparks and black smoke and the DJ slumps over the booth, until
// reset), reset(clearBand), celebrate(tier) (amber / pink flash; confetti, ribbons
// and stars blasted out of the window down over the street to the rope by ~0.8 s, a second wave raining from the top
// across the whole width, a few pieces resting on the rope and the stanchion balls for a beat; then the hold's second
// beat, the encore, on the first beat of the party clock >= 2.1 beats later (~1.2-1.7 s): the whole band and the crowd
// jump together, two pink-white beams sweep the room and cross, a smaller flash, the disco spins up, every floor tile
// lights, confetti from the arch. Returns the seconds until the encore lands; world.encoreIn / encoreAge read it live,
// so the scene can hang its own beat (a counter, a sting) on it. tier = data.tierFor's result or a level (play.js: 3 gold,
// 2 silver, 1 bronze, 0 rope; TUNE.celebrate.gold / rope): 'silver' / 'bronze' / none = the above; 'gold' = twice
// the street burst (the extra half pouring down, never across the band) and its stars, more rain, mostly gold + cream,
// a brighter gold flash, a big chandelier swing with its candles flaring and a shower of gold stars, gold-white encore
// beams on a gold floor; 'rope' (a fail) = muted: no flash burst, no confetti, no street burst, no encore (returns -1:
// cut to the result), one polite hop, a sparse floor, the disco keeps its pace, the room's lights come down a little;
// world.tier reads it back), openDoor(popAt?) (popAt
// s later the ADMIT starburst pops in the door opening: pass the guest's threshold landing), closeDoor(), setDecor(0..6,
// reveal?) (a level up reveals its new piece in the window, TUNE.decorReveal: in the lobby the room dims round a soft
// spotlight on it (held while an unlock ceremony runs) and it makes an entrance: the garland is strung left to right
// behind a sparkle trail, the disco ball drops in on its cord, the plants and the cannons pop up from their base (the
// cannons fire), the banner unrolls down, the neon's board opens in an iris and its tubes stutter on; sparkles + sticker
// stars burst as it lands. Play gets a lighter one (no dim) once the rule intro has landed. reveal: a number = its delay,
// false = swap at once; world.reveal { on, lv, t, land, x, y } lets the scene hang a toast on it),
// setLobby(on), setBeat(fn), layout(), lightAt(x, feetY, out), debug(); fields slots[4] { x, feetY, scale, dim, light:
// { door, lamp } } (0 = the rope, 1..3 = the queue back-left), rope { x1, x2, y (sag middle), top (hook height), on },
// door { x, y, w, h, open }, poster { x, y (nail), scale }, posterBox { w, foot } (the footprint at scale 1 the layout
// cleared), window { x, y, w, h, arch }, dancers (records { actor, species, instrument, band (plays it: the stage row /
// the lobby), slot, x, y, s }), crowd (how many silhouettes line the sill), decor, level, lobby. All reused objects; they
// change on layout() (stage resize), so read them every frame.
// Cosmetics (docs/MONETIZATION.md §3): the look = { club, rope, door, plate, outfit: { species: id } }. setWorldLook(look)
// sets it for every world (and icons.js's plate skin); world.setLook(look) overrides it for one world (null = back to the
// shared one), world.previewLook(look, s) shows a look for s seconds then reverts ("Try it" behind the shop);
// setTheme / setRopeSkin / setDoorSkin / setOutfits change one part. A club theme (cosmetics-art.js THEMES) repaints the
// street (sky + skyline, facade texture, window trim, marquee + bulb colour, lamp light, corner props, ivy, the sky FX)
// and the party window (wall motif, floor, stage, chandelier, bunting colours, front props, beat-tile colours, the
// banner's cloth, the owner's portrait, the decor-6 wall sign, the DJ's headphones + hat: no theme keeps the house's heart
// sign, portrait or bare-headed DJ); the rope skin repaints the stanchions + the rope (per frame), the door skin the leaf +
// its frame; band outfits dress the band (and its kick drum / keyboard): in the lobby every member of that species, in
// play every dancer who takes a stage slot (the stage row is the band: an admitted guest joins it in the band's outfit for
// its species, so the bought outfits play all night), never the crowd on the floor. The look's bakes live in a shared cache pruned to the looks some
// world still shows (WCACHE), so browsing themes never piles up full-screen canvases. The amber door spill, the poster,
// the guests and the queue lane's legibility are never skinned.
// WORLD_TUNE exposes TUNE for dev/world.html (clearance + composition checks).
import { stage } from '../core/stage.js';
import { draw, color } from '../core/draw.js';
import { i18n } from '../core/i18n.js';
import { TAU, clamp, lerp, noise1, smoothstep, easeIndex, rng } from '../core/math.js';
import { createActor, prewarmLater, prewarmPump, COLORS as GUEST_COL, outfitTheme, outfitKit } from './actor.js';
import { THEMES, BULB_COL, themeOf, clubKey, ropeKey, doorKey, paintSkyTheme, paintSkyline, paintCityDeco, paintWallTexture, paintFacadeDeco,
  paintTrimDeco, paintHeaderDeco, hasFxSprite, paintFxSprite, paintPlanter, planterLights, paintCorner, drawSkyFx, paintRoomMotif, paintRoomDeco,
  paintChandelierTheme, paintRoomFrontTheme, kitTrim, paintStanchionSkin, strokeRope, DOOR, paintDoorLeaf, paintDoorFrame,
  paintRoomSign, signTube, paintRoomPicture, paintBannerTheme, paintDJHat, DJ_HAT_BOX } from './cosmetics-art.js';
import { INSTRUMENT } from './data.js';
import * as ICONS from './icons.js';   // posterBox() / posterMetrics(rule): the rule poster's footprint (read at layout)

const TUNE = {
  pal: {
    ink: '#0b0a22', night: '#0c0b24', deep: '#12113a', mid: '#1b1a4d', lift: '#2a2760',
    brass: '#d9a441', brassDark: '#8a5a14', brassInk: '#3f2707', amber: '#ffb347',
    velvet: '#b3203a', velvetDark: '#5e0c20', cool: '#9fbcff', coolHi: '#e4edff', moon: '#f4edd6',
    iron: '#1d1b48', stone: '#37337c', stoneHi: '#4a4598',
  },
  pad: 24,                                   // background overscan (design units) so camera shake never shows an edge
  bpm: 108,                                  // fallback beat clock when no party clock is handed in
  // play layout (GAME-SPEC §4). [a, b] pairs lerp by the squeeze sq = 0 at H >= squeezeH .. 1 at H = 700 (the letterbox
  // and every 16:9 phone): the window, header and poster shrink, the facade base drops so the door keeps a door's
  // proportions, and the street rows (measured down from the base) tighten above the plates (H - 250).
  // win [x, w] + winY, winH, arch; header [x, w] + headerH; base: facade base = H - base; door [x, w, w squeezed, max h],
  // doorGap = door top below the header bottom (the brass frame at y - 12 keeps 4 units of brick under the header);
  // lantern height above the base, moon [x, y, r], corner = the building's left edge (quoins), roof = cornice y
  play: { roof: 62, corner: 32, winY: 84, win: [58, 274], winH: [178, 128], arch: [50, 40], header: [50, 290], headerH: [22, 20],
    base: [376, 330], door: [304, 80, 72, 168], doorGap: 16, lantern: [150, 124], moon: [334, 40, 13], squeezeH: 880,
    // the street, down from the base: the front guest's feet, the rope stanchions, the big foreground stanchion (+ its
    // scale), the 3 queue rows; the lane carpet runs from just behind the last queue row to (lane.near, base + laneNear)
    // (each queue row stands high enough over the one in front that its head AND its torso marking clear the guest in
    // front: the back row stands against the wall, on the carpet's far end)
    front: [78, 62], ropeFeet: [60, 50], ffeet: [110, 76], fs: [1.3, 1.12], queue: [[44, 34], [13, 14], [-11, 2]],
    laneNear: [70, 58],
    // two arrangements [stacked, side by side]: the poster over the guest (GAME-SPEC §4), or slid left with the guest
    // moved right when there is no height to stack them (the stacked fit < stackMin and side by side fits bigger).
    // The poster hangs on the free wall between the building's corner and the door, as big as posterS (lerped by sq:
    // the 60-unit 3-clause badges stay >= ~50 units on stage at every height) and as close to posterX as the wall
    // allows: its card (the widest, posterBox) keeps posterL [stacked, side] off the building's left edge (stacked: clear
    // of the corner quoins; side: just inside the edge, its corner tape over the quoins and the street lamp riding up
    // clear of it) and posterGap off the door's brass frame (the sconce rides on that jamb). Side by side the front guest
    // steps right from frontX[1] (at most to where its widest band still clears the big foreground stanchion) to keep
    // sideS next to the card; only when that cannot fit does the card shrink (never under posterMin). The nail = header
    // top + nailDy; the marquee's bulb row is phased so the nail always hangs between two bulbs
    posterX: [195, 120], frontX: [240, 264], ropeX1: [190, 200], stackMin: 1, posterS: [0.92, 0.88], nailDy: 6,
    // (sideGap: extra air between the card's swaying corner and the guest's glances / arm swings beside it)
    posterL: [50, 36], posterGap: 10, posterMin: 0.66, sideS: 1.05, sideGap: 2.5,
    // the front guest's scale: the largest in [sMin, sMax] (sMax lerps by sq so the guest stays in proportion with the
    // door) at which the tallest guest clears the widest poster (see guestEnv); the queue follows GAME-SPEC §1's
    // 0.8 / 0.64 / 0.5 steps from the front, shrunk to clear the poster too but never below qFloor of the step
    sMin: 0.9, sMax: [1.6, 1.05], qStep: [0.8, 0.64, 0.5], qFloor: 0.75 },
  // the rule poster's footprint at scale 1: layout() reads it live from icons.js (posterBox(), else the widest card x the
  // deepest foot = strings + card + torn edge + drop shadow below the nail, over 1..3 clauses of posterMetrics); w / foot
  // here are only the fallback if icons.js reports nothing; gap = sway / air around it; reserve = a footprint the layout
  // holds room for at least (0 = none: dev/world.html previews a wider card with it before icons.js ships one)
  poster: { w: 212, foot: 97.4, gap: 6, reserve: [0, 0] },
  // worst-case guest silhouette, measured over every species x hat (party / top / crown / taped paper) x 3 eyes (the stalk)
  // in the wait state (bop, glance, weight shifts), mirrored for flip: pairs [band bottom above the feet, half width] at
  // scale 1; each band reaches up to the previous bottom, the first one to guestTop (a tall in a party hat: 181 units)
  guestTop: 182,
  guestEnv: [180, 25, 170, 33, 160, 42, 150, 47, 140, 48, 130, 47, 120, 49, 110, 50, 100, 50, 90, 62, 80, 73, 70, 72, 60, 76,
    50, 84, 40, 84, 30, 84, 20, 84, 10, 84, 0, 84],
  // lobby layout: fractions of H where < 1. The marquee header's bottom sits `foot` above the safe bottom: the home
  // scene's PLAY button tops out 240 above it, so a ~48-unit strip of brick (under home's scrim) separates them on every
  // phone, instead of the ~95-unit empty band a top-anchored window left on tall ones. The window is winW wide and
  // winH x H x grow tall (grow lerps by H over growH: the 16:9 letterbox keeps 1, tall phones get ~8 % more) with the
  // cornice winGap above its arch. The PLAY button + cards cover everything under the header, so the lobby street
  // carries nothing that could half-hide behind them: no door, no planters, and the street lamp stands just out of frame
  // on the left (lampX), its cool cone + glow still washing the wall. door = the (undrawn) door box the public `door`
  // object reports. moon [x share of W, y under the safe top, r], lifted when needed so its disc stays titleGap above the
  // neon title's letters (home.js titleY(): max(safeTop + 54, (safeTop + window.y) / 2 + 2), letters titleHalf tall)
  lobby: { foot: 288, winX: 24, winGap: 28, winW: 342, winH: 0.33, grow: [1, 1.08], growH: [700, 844], arch: 76, headerX: 17, headerH: 24,
    corner: 6, base: 0.85, door: [304, 80, 80, 150], doorGap: 16, lantern: 168, lampX: -22, moon: [0.86, 26, 16], titleHalf: 36, titleGap: 4 },
  // queue x (front guest x comes from play.frontX) and dims; the queue goes back-left, spread by row width (a wide round /
  // blob in front still leaves the next guest's face, pattern and tail clear: dev/world.html queue() keeps every queued
  // face >= ~85 % visible over all 25 species pairs; the worst case is a blob's tail brushing the blob behind) so the
  // guests read as a line
  slots: { x: [146, 82, 30], dim: [0, 0.15, 0.3, 0.48] },
  // velvet rope between two brass stanchions behind the front guest (x1 from play.ropeX1: the left stanchion stands in the
  // seam between the queue and the guest, never across the next guest's body), plus the front segment that swings forward to a big foreground stanchion at fx;
  // sag = rope dip, k / c = its wobble spring; col / ink / hi = the rope's velvet (darker than the coral guests in front
  // of it), outline and sheen
  rope: { x2: 334, s: 0.92, sag: 20, fx: 370, fsag: 15, k: 60, c: 4.2, kick: 75, col: '#8f1830', ink: '#1c020a', hi: 'rgba(255,120,150,0.55)' },
  // queue carpet: it starts `back` units behind the last queue guest (tapered, soft rounded end) and runs to x near;
  // half widths far / near; spot = [rx, ry, alpha] of the worn shadow under each queue row (scaled by the row's scale)
  lane: { near: 168, hwFar: 7, hwNear: 22, back: 12, spot: [30, 6.5, 0.42] },
  stanchion: { w: 26, h: 64, foot: 60, hook: 21 },
  door: { open: 1.3, openMs: 420, closeMs: 480, slices: 10, persp: 0.0024, eye: 0.36, flashDecay: 2.4 },
  // openDoor(popAt): the ADMIT starburst pops IN the door opening (at door.y + h * y), timed to the guest's landing on
  // the threshold: white / gold sticker stars + sparkles + an amber flare
  doorPop: { y: 0.35, stars: 7, sparks: 9, speed: [120, 230], flare: 0.55 },
  // the corner topiary in the brass planters: clipped leaf masses [dx toward the screen centre, dy above the planter
  // rim, r], back to front, in a cool green indigo (two-tone) with a lamp-side rim; fairy lights twinkle on the beat
  bush: { masses: [4, -40, 15, 22, -16, 14, -10, -18, 19, 9, -20, 17], lo: '#1f3a4a', hi: '#2a4f5a', deep: '#16293a', ink: '#081820',
    leafHi: '#46777e', leafLo: '#152b3a', rim: '#9fbcff', fairy: 4, fairyCol: '#ffc46b' },
  // the street lamp: a lantern hanging from an iron arm fixed to the building's corner quoins (x = the lantern, play; no
  // post, so nothing stands behind the queue's back row), its arm `arm` above the lantern centre, the wall plate `plate`
  // tall; flicker, moths, glow radii, cone alpha. Side by side (the poster's card over the quoins) the lantern rides up
  // until the bottom of its wall plate is `clear` above the card's top edge (the corner tape runs up-right from there,
  // away from it), so it hangs beside the card and lights it instead of its bracket poking out from under it
  lamp: { x: 12, arm: 40, plate: 30, flickHz: 6, flick: 0.06, moths: 5, glow: 36, fg: 130, coneA: 0.9, clear: 10 },
  // the door: its brass sconce sits ON the left jamb (dx from the door's left edge, dy under its top; box half width hw,
  // top / bottom from its centre), out of the rope guest's head band; when the front guest's head would still cover it
  // (side by side) it moves to the right jamb if that is on stage, else it is left out. The house number is an enamel
  // plate (w x h) centred on the lintel (num: its y from the door top), never at a guest's head height
  sconce: { dx: -6, dy: 14, hw: 7, top: 12, bot: 15, glow: 26, num: [24, 12, -7] },
  // light pools on the cobbles: the door's amber pool (shut a / open a) + the lamp's cool pool, and the wet reflections
  pool: { doorShut: 0.55, doorOpen: 1, refl: 0.36, lamp: 0.34, sheen: 0.5 },
  // actor light.{door, lamp} by distance; lampR reaches the front guest so the hero carries a faint cool rim too
  light: { doorBase: 0.55, doorOpen: 1.4, doorR: 300, lampR: 300, lampK: 0.8, lobbyDoor: 0.6 },
  // the unlock ceremony (GAME-SPEC §6 'unlock band'): the room dims and an amber spotlight falls from the arch onto centre
  // stage (in front of the DJ); the new member pops in there at reveal (scale K x its slot scale), hops hopN times hopH
  // high (hopDur each), then hop-walks to its slot over `travel` s (travelHops small hops) with the cone following it;
  // spotlight(on) holds the cone without a newcomer. rim = the warm door rim the spotlit member wears (no white wash)
  unlock: { dur: 1.75, fadeIn: 0.25, fadeOut: 0.4, reveal: 0.42, dim: 0.42, hopH: 20, hopN: 3, hopDur: 0.26, K: 1.12, travel: 0.55,
    travelHops: 2, travelH: 7, sparks: 12, stars: 6, cone: 0.25, rim: 0.85 },
  // marquee bulbs; on a wrong admit they blink off `blinks` times (on / off every `blinkT` s)
  bulbs: { step: 14, chase: 2, dim: 0.3, blinks: 3, blinkT: 0.085 },
  // the room inside the window, in room units (the play window is 274 wide; the lobby scales it by k = w / RW)
  room: {
    RW: 274, floor: 48, stage: [24, 250],
    floorMin: 40, chandMin: 0.72,          // a short room (RH 128..178) gets a shallower floor + a smaller chandelier
    // dancer slots [x, row, dy, scale], filled in this order. Rows: 1 = the stage, flanking the DJ in pairs 46 apart; 2 =
    // the dance floor, each slot in the GAP between two stage slots (never in front of one); 3 = the front row by the sill,
    // either side of the booth (their heads stay under the booth's EQ); 0 = the back risers (the lobby only). Every face and
    // instrument shows: no dancer covers another by more than ~12 % of its width. Room x 106-168 (the DJ booth) stays free
    // on the stage and the floor, and x 236-274 on the floor + front rows stays free for the standing lamp (and its fall).
    // In play the stage row is the band and rows 2 + 3 are the crowd (floorFree: hands-free, no kit / keyboard /
    // backlight) at ~0.84x the band's scale, so a crowd head stays under the stage lip, in a gap of the band.
    // The floor stands `lift` above the sill, the front row `front` above it, the risers `riser` behind the stage line;
    // floor + front scales shrink to shortK in the shortest room (the stage to shortStage: its heads stay under the
    // bunting). Play caps at `cap` dancers (`capShort` when the room is shorter than shortRH: the 16:9 letterbox, h 128);
    // past the cap the oldest member leaves the actors for the crowd silhouette (TUNE.crowd)
    slots: [[88, 1, 0, 0.36], [186, 1, 0, 0.36], [42, 1, 0, 0.36], [232, 1, 0, 0.36], [65, 2, 0, 0.3], [209, 2, 0, 0.3],
      [104, 3, 0, 0.31], [170, 3, 0, 0.31]],
    floorFree: true,
    // lobby: the House Band is the hero, so everyone is drawn bigger: the 4 stage slots, centre front (slot 4 must stay the
    // centre front: the unlock ceremony pops the newcomer there and scales from it), the floor gaps, then 2 risers
    lobbySlots: [[88, 1, 0, 0.45], [186, 1, 0, 0.45], [42, 1, 0, 0.44], [232, 1, 0, 0.44], [137, 3, 0, 0.46], [65, 2, 0, 0.46],
      [209, 2, 0, 0.46], [65, 0, 0, 0.38], [209, 0, 0, 0.38]],
    lift: 15, front: 6, riser: 9, shortK: 0.92, shortStage: 0.94, cap: 8, capShort: 8, shortRH: 140,
    // the standing lamp: x, its base `base` above the sill (in front of the floor row, in the free right corner); it is
    // drawn after the band and the plants so its fall is never hidden
    lamp: { x: 260, base: 10, glowY: -56 },
    // short rooms (RH below RH[0], fully at RH[1]): the bunting hangs up in the fanlight (dy above the transom bar), its
    // swags dip at most `dip`, flags shrink to `flag`, it leaves a gap of +-`gap` over the DJ's head and the chandelier,
    // and the disco ball rides higher, above it
    garland: { RH: [166, 140], dy: -10.5, dip: 4, flag: 0.8, gap: 32 },
  },
  // the drum kit the world stands round every drummer (blob), in dancer units (the actor's scale 1) about its feet: a big
  // kick drum (radius R, centre y above the feet, so it stands in front of the drummer, its foot `R - y` below theirs:
  // a dark lacquered shell band with brass lugs round a cream head with a port hole and the band's monster logo), and a
  // hi-hat on a thin stand on the drummer's back side at (hatX, hatY) whose top cymbal ticks `tick` up on the off-beats;
  // thump = the kick's squash on the beat
  kick: { R: 27, y: 12, thump: 0.07, hatX: -63, hatY: 56, hatR: 12, tick: 5 },
  // the keys player (round): the world sets a keyboard on an X stand in front of it (dancer units about its feet): a slab
  // `w` wide (~0.9 of the body), its top at `top`, `h` deep, centred at x; white keys with black-key notches across the
  // front, an LED trim; it pops in with the dancer. free: the round dances hands-free behind it (its own side synth off)
  keys: { x: 0, w: 80, top: -30, h: 14, free: true },
  // play: the crowd silhouette along the sill (room units), drawn over the dancers and under the plants. Every member the
  // cap pushes out of the actors joins it: the back of a head (head [width, corner share] per species: blob, tall,
  // round, square, bean; talls stand `tall` higher) with its hat's outline, filled in a deep tone of its colour (ink
  // share `ink`) under a stage-lit rim `rimW` thick in its own colour (rim alpha), bobbing on the beat out of step (bob
  // units), every other one throwing a hand up on the off-bars (arm = share of the beat it stays up). x = the places it
  // fills, in order: the gap between the front-row dancers (104 / 170) first, then outward; heads stand up[0]..up[1]
  // over the sill, under the floor row's feet (lift 15), so only a hat or a raised hand ever crosses a dancer's feet; at
  // most max (then the oldest swaps colour); a newcomer rises in over pop s
  crowd: { x: [137, 34, 240, 86, 188, 10, 264], head: [[27, 0.5], [16, 0.5], [24, 0.5], [23, 0.3], [19, 0.5]], up: [9, 12], tall: 4,
    max: 7, ink: 0.52, rim: 0.95, rimW: 1.7, bob: 1.6, pop: 0.35, arm: 0.45 },
  // DJ booth: a 5-bar LED equaliser (green / amber / red segments) jumping on the beat + spinning platters (rev/s)
  booth: { bars: 5, segs: 5, spin: 0.75 },
  chand: { k: 9, c: 0.55, drive: 0.03, celebrate: 1.15, degrade: 0.9 },
  picture: { tilt: [0.07, 0.3, 0.52, 0.74], k: 110, c: 5.5, kick: 3 },
  // the wrong-admit lamp topples RIGHT into the free corner: angle (outBounce over dur), while its foot skids `slide`
  // [dx, dy] (outQuad, done by the first impact at hit of dur) so the shade lands in the corner by the right jamb; sparks +
  // smoke burst where the shade lands, and the nearest dancer is nudged away from it
  lampFall: { dur: 0.6, angle: 1.42, slide: [-55, 6], hit: 0.364, sparks: 16, nudge: -60 },
  glare: { decay: 0.5, rest: 0.38 },
  // SHUT DOWN = level 3 (play ends the night on the 3rd strike): the band flinches, then slumps (sad: instruments down, the
  // kick and hi-hat fall silent); the marquee bulbs die left to right in step with play.js's window columns (TUNE.shut:
  // `bulb` s per 1/cols of the window width), each popping a spark as it goes; the disco ball stops dead, the floor goes
  // dark, the DJ's platters stop under a hard glare (glare), the specks and the window rays fade to `fade`. Then the last
  // light in the room goes, filling the hold before the result: the DJ booth's EQ strobes wildly for djFlick s and pops
  // at `dj` s (well after the marquee is dead) with djSparks sparks, a white-hot flash (djFlash s) and black smoke; the DJ
  // slumps `slump` units over the booth, its lid half shut, the glare gone out of it
  shut: { bulb: 0.08, cols: 8, glare: 0.75, fade: 0.25, flare: 0.06, sparks: 2, dj: 1.2, djFlick: 0.4, djSparks: 16, djFlash: 0.16, slump: 4 },
  smoke: { rate: [0, 0.35, 1.4, 3.4] },
  // wrong admit: every dancer flinches (stagger), the window glass pulses red (redMs), the disco ball stops and spins back
  // up over spinBack s, the floor tiles black out for one beat
  degrade: { stagger: 0.07, red: 0.15, redA: 0.3, spinBack: 1.3, tileHold: 0.55 },
  // LAST CALL: an additive amber / pink flash peaking at flashA, decaying over flash s (outQuad); the disco spins fast for
  // spin s; dancers hop; confetti: `confetti` pieces inside the window; the street burst: `street` pieces (rectangles +
  // curled ribbons, size [min, max]) + `stars` sticker stars blasted OUT of the lower window (speed [min, max], angles
  // from straight out to down-out) so they reach the rope line by ~0.8 s, then a second wave of `rain` pieces dropping from
  // safeTop across the whole width at rainAt s; plus `cannon` per cannon. Drag ramps from drag[0] (the blast) to drag[1]
  // (the flutter) over dragT s; a `stick` share of the pieces that fall onto the velvet rope or a stanchion ball rests
  // there for rest s, then slides off
  // encore: the hold's second beat, on the first beat of the party clock at least `after` beats after the call (the
  // dolly has landed and the first hops are done by then): every dancer and the crowd jump together (hop units high,
  // hopDur), two spotlight beams from the arch sweep across the room and cross (sweep s, alpha beamA, apexes beamX
  // either side of the centre, angles swing[0] -> swing[1] mirrored), a smaller flash (flash x flashA), the disco spins
  // fast again for spin s, every floor tile lights, the chandelier swings, confetti drops from the arch (+ the cannons)
  // celebrate(tier) plays the night's result: silver / bronze (or no tier) = the ending above; gold = a PERFECT / Gold Rope
  // night: `more` x the street burst (the extra pieces all pour down and out) and its stars, `rain` x the rain (a `share`
  // of the pieces dealt gold / cream, the stars gold + cream with a pink accent; inside the window only `inside` x: play's
  // dolly fills the screen with the window and doubles its own confetti there, so the band's faces still read), the
  // flash x flash in
  // gold (bloom) with the window's glow x glow, the dancers hop x hop, the chandelier swings chand x harder with its
  // candles flaring (flare, over flareT s) and a shower of sparks + gold stars off it; its encore swings the chandelier
  // encChand x, sweeps gold-white beams, lights every tile gold, drops encMore x the arch confetti. rope = a fail: no confetti, no burst, no rain, no encore (celebrate returns -1), only a
  // faint cream wash (flash x flash), one polite hop `hop` high, a sparse floor (`tiles` tiles at tileV), the disco ball
  // keeps its pace, the crowd stays put, the chandelier only stirs (chand x) and the room's lights come down by `dim`
  celebrate: { flash: 0.4, flashA: 0.35, spin: 1.4, hop: 16, hopDur: 0.36, hops: 2, stagger: 0.045, confetti: 46, street: 84, stars: 9,
    cannon: 18, ribbon: 0.3, life: [2.8, 4], g: 360, drag: [0.35, 1.7], dragT: [0.35, 1.1], size: [9, 13], speed: [230, 470],
    rain: 40, rainAt: 0.15, rainV: [40, 150], stick: 0.55, rest: [0.55, 1.2],
    encore: { after: 2.1, hop: 26, hopDur: 0.42, crowd: 7, sweep: 1.05, beamA: 0.95, beamX: 64, swing: [0.42, -0.78], flash: 0.6, spin: 0.9,
      confetti: 28, chand: 0.7 },
    gold: { more: 2, rain: 1.5, inside: 1, encMore: 1, share: 0.62, flash: 1.45, bloom: '#ffd166', glow: 1.7, hop: 1.2, chand: 1.9, flare: 0.9,
      flareT: 2.6, sparks: 22, stars: 8, spin: 1.6, encChand: 1.7 },
    rope: { flash: 0.28, bloom: '#f6efd6', hop: 6, hops: 1, chand: 0.3, tiles: 5, tileV: 0.45, dim: 0.1 } },
  // an admitted guest's dancer appears `delay` s after admit() (= play.js TUNE.join.comet: the sparkle comet from the door
  // lands on it) and springs in from scale `from` (k / c: a bouncy ~1.13 overshoot, settled by `settle` s) with a ring of
  // sparks in its own colour that starts at the silhouette edge (ring x the body's half width / height at its scale) and
  // fades in over fadeIn s, so no dash ever streaks across the body. The unlock ceremony's newcomer pops 0 -> peak -> 1
  // over pop s instead
  admit: { delay: 0.22, from: 0.6, k: 300, c: 12, settle: 0.8, pop: 0.22, peak: 1.25, sparks: 7, ring: 1.12, fadeIn: 0.06 },
  // setDecor(up): the new piece's reveal. It starts `delay` s after the call in the lobby (at once: home.js calls it at its
  // decor news beat, with its toast, ring and chime; held while an unlock ceremony runs), playDelay s in play (play.js
  // calls it at the night's start: once the rule intro has landed on its nail). The room dims round a soft spotlight
  // on the piece (lobby only: dim alpha in `soft` steps, each hole `edge` wider) over `in` s with a warm light pool on it
  // (pool; play gets playK of the pool, sparks and stars and no dim); the piece enters `at` s in, over `pop` s: the garland
  // is strung left to right (a sparkle trail every `trail` s at its front), the disco ball drops in on its cord and bounces,
  // the plants and the cannons pop up from their base 0 -> peak -> 1 (the right one `stagger` s later; the cannons fire as
  // they land), the banner unrolls down from its cords with a bounce, the neon's board opens in an iris (iris units) and
  // its tubes stutter on over `neon` s. land[lv] = the share of the entrance at which it lands: sparks + sticker stars burst
  // there. out = the fade out, dur = the whole reveal
  decorReveal: { delay: 0, playDelay: 1.3, in: 0.2, at: 0.15, pop: 0.6, out: 0.5, dur: 2.1, dim: 0.62, soft: 3, edge: 0.24, pool: 0.55,
    playK: 0.6, sparks: 12, stars: 6, stagger: 0.14, trail: 0.035, iris: 70, neon: 0.55, land: [0, 1, 0.62, 0.6, 0.38, 0.6, 0.7] },
  tiles: { perBeat: 5, decay: 2.2 },
  specks: 22,
  maxParticles: 240,
  maxStreet: 340,
};

const C = TUNE.pal;
let ENV_HALF = 0;   // the guest silhouette's widest band (half width at scale 1: its tail side)
for (let i = 1; i < TUNE.guestEnv.length; i += 2) ENV_HALF = Math.max(ENV_HALF, TUNE.guestEnv[i]);
const COBBLE = ['#1c1a4f', '#201e57', '#191749', '#23215c', '#1a1851', '#1e1c53'];
const CONF = ['#ffc233', '#ff5c8a', '#40bdeb', '#4fe3b0', '#f6efd6', '#ff8a3d', '#a77bff'];
const CONF_DK = ['#9a6a00', '#a3204e', '#13628a', '#167a5c', '#9a8a66', '#a14a10', '#5a35a8'];   // their ink (ribbon edges)
const STAR_COL = ['#ffc233', '#ff5c8a', '#53e0ff', '#7dffb0', '#fff4d6'];   // the last two of the door pop: gold + cream white
const BACKLIGHT = { drum: '#ffb347', bass: '#ff6fb0', keys: '#53e0ff', guitar: '#ff7a5c', lead: '#ffe08a' };   // per instrument
const EQ_COL = ['#4fe36b', '#4fe36b', '#ffc233', '#ffc233', '#ff3b4f'];
const EQ_SHAPE = [1, 0.85, 0.7, 0.8, 0.55];   // how hard each EQ band jumps on the kick
const TILE_COL = ['#ffb347', '#ff4fa3', '#53e0ff', '#a77bff', '#ffe08a'];
const FLAG_COL = ['#ffc233', '#ec4450', '#19b18b', '#40bdeb', '#8a48d6', '#f6efd6'];
// default House Band looks (setBand with bare species names)
const HOUSE = {
  blob: { species: 'blob', color: 'mint', eyes: 2, hat: 'party', tail: false, pattern: 'none' },
  tall: { species: 'tall', color: 'coral', eyes: 2, hat: 'top', tail: false, pattern: 'none' },
  round: { species: 'round', color: 'sky', eyes: 2, hat: 'none', tail: false, pattern: 'dots' },
  square: { species: 'square', color: 'mustard', eyes: 2, hat: 'crown', tail: false, pattern: 'none' },
  bean: { species: 'bean', color: 'grape', eyes: 2, hat: 'none', tail: true, pattern: 'stripes' },
};
const ACTOR_OPTS = { fx: false };
// each species' body [width, height] at scale 1 (actor.js silhouettes), for the pop-in spark ring
const BODY = { blob: [96, 95], tall: [44, 142], round: [88, 88], square: [86, 101], bean: [66, 110] };
const DANCE = { instrument: true, phase: 0, tempo: TUNE.bpm };
// the keys player dances hands-free behind the world's keyboard (TUNE.keys.free): its own side synth stays off; so does
// every crowd dancer on the play floor (band = false)
const DANCE_FREE = { instrument: false, phase: 0, tempo: TUNE.bpm };
// dance options for a species (band: plays its instrument), with a fresh phase
function danceFor(species, band) {
  const o = band && !(INSTRUMENT[species] === 'keys' && TUNE.keys.free) ? DANCE : DANCE_FREE;
  o.phase = Math.random() * 0.2;
  return o;
}
// the crowd silhouette's species order (TUNE.crowd.head) and hats
const CROWD_SP = ['blob', 'tall', 'round', 'square', 'bean'];
const CROWD_HAT = { none: 0, party: 1, top: 2, crown: 3 };
const CROWD_FILL = {}, CROWD_RIM = {};   // per guest colour name, filled on first use (join time, not per frame)
// the poster footprints layout() measures (1, 2 and 3 clauses: the widest card and the deepest foot can differ)
const POSTER_RULES = [
  { clauses: [{ attr: 'eyes', value: 2, has: true }] },
  { clauses: [{ attr: 'eyes', value: 2, has: true }, { attr: 'hat', value: 'any', has: false }] },
  { clauses: [{ attr: 'eyes', value: 2, has: true }, { attr: 'hat', value: 'any', has: false }, { attr: 'tail', value: true, has: true }] },
];
const SAD = { walk: false };

let GEN = 0, FONT_GEN = 0;
stage.onResize(() => { GEN++; });
// the shared look (setWorldLook) + its generation (worlds re-resolve when it moves)
const LOOK = { club: 'club.house', rope: 'rope.velvet', door: 'door.brass', plate: 'plate.classic', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
let LOOK_GEN = 0;
function copyLook(d, src) {
  if (!src) return d;
  if (src.club !== undefined) d.club = src.club;
  if (src.rope !== undefined) d.rope = src.rope;
  if (src.door !== undefined) d.door = src.door;
  if (src.plate !== undefined) d.plate = src.plate;
  if (src.outfit) for (const k in d.outfit) if (src.outfit[k] !== undefined) d.outfit[k] = src.outfit[k] || '';
  return d;
}
// setWorldLook(look): the look every world shows (wallet.look()), and the plates' skin (icons.setPlateSkin)
export function setWorldLook(look) {
  copyLook(LOOK, look);
  if (typeof ICONS.setPlateSkin === 'function') ICONS.setPlateSkin(LOOK.plate);
  LOOK_GEN++;
  return LOOK;
}
export function worldLook() { return LOOK; }
// WCACHE: the look-dependent bakes of every world, keyed by layout + look; each world lists the keys its last bake used
// and anything no world uses any more is dropped right away (a theme browsed in the shop never lingers)
const WCACHE = new Map(), WSETS = [];
function wcPrune() {
  for (const k of WCACHE.keys()) {
    let used = false;
    for (let i = 0; i < WSETS.length && !used; i++) used = WSETS[i].has(k);
    if (!used) WCACHE.delete(k);
  }
}
i18n.onChange(() => { GEN++; });
draw.ready().then(() => { FONT_GEN++; GEN++; });

// ------------------------------------------------------------------------------------------------ small helpers
const SO = { fill: '#fff', outline: '#000', lineWidth: 3, highlight: 0.28, shadow: 0.14, bounds: null };
// sticker shorthand (bake time only); bounds [x, y, w, h] for custom paths so the lighting lands on the shape
function stk(c, path, fill, outline, lw, hi, sh, bounds) {
  SO.fill = fill; SO.outline = outline; SO.lineWidth = lw === undefined ? 3 : lw;
  SO.highlight = hi === undefined ? 0.28 : hi; SO.shadow = sh === undefined ? 0.14 : sh; SO.bounds = bounds || null;
  draw.sticker(c, path, SO);
  SO.bounds = null;
}
// arched window path (works on a 2D context or a Path2D): straight jambs, an elliptical arch of rise a
function archPath(p, x, y, w, h, a) {
  p.moveTo(x, y + h);
  p.lineTo(x, y + a);
  p.ellipse(x + w / 2, y + a, w / 2, a, 0, Math.PI, TAU);
  p.lineTo(x + w, y + h);
  p.closePath();
}
function arch(c, x, y, w, h, a) { c.beginPath(); archPath(c, x, y, w, h, a); }
function poly(c, pts) { draw.polygon(c, pts); }
function box4(b, x, y, w, h) { b[0] = x; b[1] = y; b[2] = w; b[3] = h; }
function fillGlow(c, x, y, r0, r1, col, a) {
  c.fillStyle = draw.radial(c, x, y, r0, r1, [[0, rgba(col, a)], [0.45, rgba(col, a * 0.4)], [1, rgba(col, 0)]]);
  c.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
}
// 0..1 inside an elliptical light pool [cx, cy, rx, ry] (smooth falloff to the rim)
function poolK(p, x, y) {
  const dx = (x - p[0]) / p[2], dy = (y - p[1]) / p[3], d = dx * dx + dy * dy;
  return d < 1 ? (1 - d) * (1 - d) : 0;
}
// a wet-street reflection streak (bake time, additive by the caller): stacked horizontal dashes under a light, wobbling and
// thinning with distance
function streak(c, x, y0, w, h, col, a, seed) {
  const r = rng(seed);
  for (let yy = 0; yy < h; yy += 2.6) {
    const k = yy / h, ww = w * (0.55 + 0.45 * r.next()) * (1 - 0.45 * k), ox = (r.next() - 0.5) * w * 0.35;
    c.fillStyle = rgba(col, a * (1 - k) * (0.55 + 0.45 * r.next()));
    draw.roundRect(c, x - ww / 2 + ox, y0 + yy, ww, 1.5, 0.75); c.fill();
  }
}
const RGB = {};
function rgba(hex, a) {
  let v = RGB[hex];
  if (!v) { const n = parseInt(hex.slice(1), 16); v = RGB[hex] = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
  return 'rgba(' + v + ',' + a + ')';
}
// a pointed leaf from (x, y) along rot (+ up when rot = 0). line: outline colour, or with rdx / rdy the rim-light colour of a
// copy shifted toward the light (a crisp lit edge on one side only)
function leaf(c, x, y, len, wid, rot, fill, line, rdx, rdy) {
  for (let pass = rdx !== undefined ? 0 : 1; pass < 2; pass++) {
    c.save(); c.translate(x + (pass ? 0 : rdx), y + (pass ? 0 : rdy)); c.rotate(rot);
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(wid, -len * 0.35, 0, -len);
    c.quadraticCurveTo(-wid, -len * 0.35, 0, 0);
    c.closePath();
    c.fillStyle = pass ? fill : line; c.fill();
    if (pass && line && rdx === undefined) { c.lineWidth = 1.4; c.strokeStyle = line; c.stroke(); }
    c.restore();
  }
}

// ------------------------------------------------------------------------------------------------ static paints
// All take (c, L) and draw in design units; the room ones draw in room units (scaled by L.k by the caller).
function paintSky(c, L) {
  const P = TUNE.pad, W = L.W, H = L.H, TH = L.th, SK = TH.sky;
  c.fillStyle = draw.gradient(c, 0, -P, 0, L.base, [[0, SK[0]], [0.35, SK[1]], [0.75, SK[2]], [1, SK[3]]]);
  c.fillRect(-P, -P, W + P * 2, H + P * 2);
  c.fillStyle = draw.gradient(c, 0, L.cityTop - 40, 0, L.base, [[0, 'rgba(140,80,170,0)'], [1, TH.haze]]);
  c.fillRect(-P, L.cityTop - 40, W + P * 2, L.base - L.cityTop + 40);
  // stars
  const r = rng(L.lobby ? 4411 : 2207), sky = L.cityTop + 10;
  for (let i = 0; i < TH.stars; i++) {
    const x = -P + r.next() * (W + P * 2), y = -P + r.next() * (sky + P), s = 0.45 + Math.pow(r.next(), 3) * 1.2;
    const a = 0.22 + r.next() * 0.6, k = r.next();
    c.globalAlpha = a * (1 - clamp((y - (sky - 50)) / 60, 0, 0.8));
    c.fillStyle = k < 0.7 ? '#ffffff' : k < 0.88 ? '#d9e2ff' : '#ffe6bd';
    draw.circle(c, x, y, s); c.fill();
  }
  c.globalAlpha = 1;
  if (TH.moon !== 'moon') { paintSkyTheme(c, L, TH); return; }   // a club theme's own sky piece (cosmetics-art.js)
  // moon: big soft glow, then the disc with craters and a lit rim
  const m = L.moon;
  c.globalCompositeOperation = 'lighter';
  fillGlow(c, m.x, m.y, m.r * 0.8, m.r * 7, '#8c96ff', 0.2);
  fillGlow(c, m.x, m.y, m.r, m.r * 2.6, '#e8e6ff', 0.25);
  c.globalCompositeOperation = 'source-over';
  stk(c, cc => draw.circle(cc, m.x, m.y, m.r), C.moon, '#7d76ad', 2, 0.35, 0.18);
  c.fillStyle = 'rgba(150,140,190,0.32)';
  draw.circle(c, m.x - m.r * 0.32, m.y - m.r * 0.18, m.r * 0.24); c.fill();
  draw.circle(c, m.x + m.r * 0.3, m.y + m.r * 0.28, m.r * 0.17); c.fill();
  draw.circle(c, m.x + m.r * 0.1, m.y - m.r * 0.45, m.r * 0.1); c.fill();
}

// two layers of distant rooftops: lighter / hazier far, darker near; sparse lit windows, a water tower, an antenna
function paintCity(c, L) {
  const P = TUNE.pad, W = L.W, top = L.cityTop, base = L.base, TH = L.th, CT = TH.city;
  if (TH.skyline !== 'city') { paintSkyline(c, L, TH); return; }
  const r = rng(L.lobby ? 77 : 31);
  for (let layer = 0; layer < 2; layer++) {
    const fill = layer ? CT[1] : CT[0], rim = layer ? (TH.id === 'house' ? 'rgba(150,160,255,0.08)' : CT[2]) : CT[2];
    let x = -P - r.next() * 20;
    while (x < W + P) {
      const bw = 18 + r.next() * 30, h0 = layer ? top + 16 + r.next() * 30 : top + r.next() * 26;
      c.fillStyle = fill; c.fillRect(x, h0, bw, base - h0);
      c.fillStyle = rim; c.fillRect(x, h0, bw, 1.2);
      if (r.next() < 0.3) { c.fillStyle = fill; c.fillRect(x + bw * 0.2, h0 - 5, bw * 0.6, 5.5); }
      // windows
      for (let wy = h0 + 6; wy < base - 8; wy += 7) {
        for (let wx = x + 4; wx < x + bw - 4; wx += 6) {
          const v = r.next();
          if (v < 0.075) { c.fillStyle = v < 0.05 ? CT[3] : CT[4]; c.fillRect(wx, wy, 2.2, 3); }
        }
      }
      x += bw + r.next() * 4;
    }
  }
  // landmarks on their own blocks (positions come from layout so the live antenna light matches a cached bake)
  const tw = L.tower, an = L.antenna;
  c.fillStyle = CT[0]; c.fillRect(tw[0] - 16, tw[1], 32, base - tw[1]); c.fillRect(an[0] - 13, an[1] + 22, 26, base - an[1] - 22);
  c.fillStyle = CT[2]; c.fillRect(tw[0] - 16, tw[1], 32, 1.2); c.fillRect(an[0] - 13, an[1] + 22, 26, 1.2);
  c.strokeStyle = CT[0]; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(tw[0] - 7, tw[1]); c.lineTo(tw[0] - 5, tw[1] - 9); c.moveTo(tw[0] + 7, tw[1]); c.lineTo(tw[0] + 5, tw[1] - 9); c.stroke();
  c.fillStyle = CT[0]; draw.roundRect(c, tw[0] - 8, tw[1] - 21, 16, 13, 2); c.fill();
  poly(c, [tw[0] - 9, tw[1] - 21, tw[0] + 9, tw[1] - 21, tw[0], tw[1] - 28]); c.fill();
  c.strokeStyle = CT[0]; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(an[0], an[1] + 22); c.lineTo(an[0], an[1]); c.moveTo(an[0] - 4, an[1] + 8); c.lineTo(an[0] + 4, an[1] + 8); c.stroke();
  paintCityDeco(c, L, TH);
}

function paintGround(c, L) {
  const P = TUNE.pad, W = L.W, H = L.H, base = L.base, curb = L.curb, top = L.alley;
  c.fillStyle = draw.gradient(c, 0, top, 0, H + P, [[0, '#0f0d30'], [0.25, '#121038'], [1, '#0b0a26']]);
  c.fillRect(-P, top, W + P * 2, H + P - top);
  // cobbles: rows grow toward the viewer, stones spread from the vanishing point; inside the two light pools (the lamp's
  // cool one, the door's amber one) each wet stone gets a brighter sheen on its top in the pool's colour
  const vx = W * 0.5, vy = L.vpY, r = rng(L.lobby ? 517 : 313), sw = 25, PL = L.poolL, PD = L.poolD, CB = L.th.cobble;
  let y = curb + 7, row = 0;
  while (y < H + P) {
    const s = (y - vy) / (H - vy), rh = Math.max(3.2, 0.42 * sw * s);
    const off = (row & 1) ? sw * 0.5 : 0;
    for (let u = -1200 + off; u < 1200; u += sw) {
      const j0 = (r.next() - 0.5) * 5, j1 = (r.next() - 0.5) * 5;
      const xa = vx + (u + 1.6 + j0) * s, xb = vx + (u + sw - 1.6 + j1) * s;
      if (xb < -P || xa > W + P) continue;
      const ya = y + 0.9 + r.next() * 0.6 * s, hh = rh - 1.8 - r.next() * 0.8 * s, bw = xb - xa;
      c.fillStyle = CB[(r.next() * CB.length) | 0];
      draw.roundRect(c, xa, ya, bw, hh, Math.min(hh, bw) * 0.48); c.fill();
      c.fillStyle = 'rgba(200,210,255,0.06)';
      draw.ellipse(c, xa + bw * 0.42, ya + hh * 0.3, bw * 0.3, hh * 0.16); c.fill();
      c.fillStyle = 'rgba(4,3,18,0.22)';
      draw.ellipse(c, xa + bw * 0.55, ya + hh * 0.8, bw * 0.38, hh * 0.14); c.fill();
      const mx = xa + bw * 0.5, my = ya + hh * 0.5;
      const fl = poolK(PL, mx, my), fd = poolK(PD, mx, my);
      if (fl > 0.02) { c.fillStyle = 'rgba(176,200,255,' + (TUNE.pool.sheen * fl).toFixed(3) + ')'; draw.ellipse(c, xa + bw * 0.45, ya + hh * 0.32, bw * 0.34, hh * 0.2); c.fill(); }
      if (fd > 0.02) { c.fillStyle = 'rgba(255,190,110,' + (TUNE.pool.sheen * fd).toFixed(3) + ')'; draw.ellipse(c, xa + bw * 0.5, ya + hh * 0.32, bw * 0.34, hh * 0.2); c.fill(); }
    }
    y += rh; row++;
  }
  // sidewalk slabs (joints converge on the vanishing point) + the curb
  const sb = (base - vy) / (H - vy), sc = (curb - vy) / (H - vy);
  c.fillStyle = draw.gradient(c, 0, base, 0, curb, [[0, L.th.walk[0]], [1, L.th.walk[1]]]);
  c.fillRect(-P, base, W + P * 2, curb - base);
  c.strokeStyle = 'rgba(8,7,30,0.55)'; c.lineWidth = 1;
  c.beginPath();
  for (let u = -1500; u < 1500; u += 62) { c.moveTo(vx + u * sb, base); c.lineTo(vx + u * sc, curb); }
  const midY = base + (curb - base) * 0.42;
  c.moveTo(-P, midY); c.lineTo(W + P, midY);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(-P, midY + 1, W + P * 2, 1);
  c.fillStyle = L.th.curb; c.fillRect(-P, curb, W + P * 2, 3);
  c.fillStyle = '#0e0c2a'; c.fillRect(-P, curb + 3, W + P * 2, 4.5);
  c.fillStyle = 'rgba(210,220,255,0.16)'; c.fillRect(-P, curb, W + P * 2, 0.8);
  // the alley beyond the corner: darker ground fading into the back-left
  if (L.corner > 2) {
    c.fillStyle = draw.gradient(c, -P, 0, L.corner + 8, 0, [[0, 'rgba(6,5,20,0.85)'], [1, 'rgba(6,5,20,0)']]);
    c.fillRect(-P, top, L.corner + 8 + P, base - top + 30);
  }
}

function paintFacade(c, L) {
  const P = TUNE.pad, W = L.W, x0 = L.corner, top = L.roof, base = L.base, R = W + P, TH = L.th, FC = TH.facade;
  c.fillStyle = draw.gradient(c, 0, top, 0, base, [[0, FC[0]], [0.5, FC[1]], [1, FC[2]]]);
  c.fillRect(x0, top, R - x0, base - top);
  // bricks: faint per-brick tint, bed + head joints (a club theme brings its own wall texture)
  const r = rng(L.lobby ? 913 : 91);
  c.save(); c.beginPath(); c.rect(x0, top + 6, R - x0, base - top - 6); c.clip();
  if (TH.wall !== 'brick') paintWallTexture(c, L, TH, x0, top, R, base);
  else for (let y = top + 6, row = 0; y < base; y += 9, row++) {
    const off = (row & 1) ? 11 : 0;
    for (let x = x0 - 22 + off; x < R; x += 22) {
      const v = r.next();
      if (v < 0.55) { c.fillStyle = v < 0.22 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,10,0.08)'; c.fillRect(x + 1, y + 1, 20, 7); }
    }
    c.fillStyle = 'rgba(8,6,30,0.34)'; c.fillRect(x0, y, R - x0, 1);
    for (let x = x0 - 22 + off; x < R; x += 22) c.fillRect(x, y, 1, 9);
  }
  c.restore();
  // light washes on the wall: the party window (amber), the door (amber; play only), the street lamp (cool)
  c.globalCompositeOperation = 'lighter';
  const w = L.win;
  fillGlow(c, w.x + w.w / 2, w.y + w.h * 0.55, w.w * 0.2, w.w * 0.95, TH.glow, 0.17);
  if (!L.lobby) fillGlow(c, L.door.x + L.door.w / 2, L.door.y + 10, 20, 140, C.amber, 0.13);
  fillGlow(c, L.lamp.x, L.lamp.y, 10, 165, TH.lamp, 0.13);
  c.globalCompositeOperation = 'source-over';
  // cornice with dentils + its shadow
  c.fillStyle = draw.gradient(c, 0, top + 4, 0, top + 34, [[0, 'rgba(4,3,18,0.6)'], [1, 'rgba(4,3,18,0)']]);
  c.fillRect(x0, top + 4, R - x0, 30);
  c.fillStyle = TH.dentil;
  for (let x = x0 + 2; x < R; x += 10) c.fillRect(x, top + 5, 5.5, 4.5);
  c.fillStyle = 'rgba(5,4,20,0.7)';
  for (let x = x0 + 2; x < R; x += 10) c.fillRect(x, top + 9, 5.5, 1.2);
  stk(c, cc => draw.roundRect(cc, x0 - 7, top - 7, R - x0 + 14, 12, 3), TH.cornice, C.ink, 3, 0.3, 0.25);
  // plinth course at the base
  stk(c, cc => draw.roundRect(cc, x0 - 3, base - 16, R - x0 + 6, 18, 2), TH.plinth, C.ink, 2.5, 0.16, 0.25);
  // corner quoins with a cool rim from the lamp
  for (let y = top + 6, i = 0; y < base - 18; y += 15, i++) {
    const qw = (i & 1) ? 10 : 14, qy = y;   // narrow enough that a strip of brick separates them from the window trim
    stk(c, cc => draw.roundRect(cc, x0 - 2, qy, qw, 13.5, 2), TH.quoin, C.ink, 2, 0.22, 0.22);
  }
  c.fillStyle = 'rgba(160,190,255,0.16)'; c.fillRect(x0 - 2.5, top, 1.6, base - top);
  paintFacadeDeco(c, L, TH);
}

function paintWindowTrim(c, L) {
  const w = L.win, a = L.arch, T = 10, cx = w.x + w.w / 2;
  const ox = w.x - T, oy = w.y - T, ow = w.w + T * 2, oh = w.h + T;
  c.save(); c.translate(3, 4); arch(c, ox, oy, ow, oh, a + T); c.fillStyle = 'rgba(4,3,16,0.45)'; c.fill(); c.restore();
  stk(c, cc => arch(cc, ox, oy, ow, oh, a + T), L.th.trim, C.ink, 3, 0.22, 0.2, [ox, oy, ow, oh]);
  // voussoir joints on the arch, block joints on the jambs
  c.strokeStyle = 'rgba(8,7,30,0.6)'; c.lineWidth = 1.4;
  c.beginPath();
  for (let i = 1; i < 12; i++) {
    const t = Math.PI + (i / 12) * Math.PI, ct = Math.cos(t), st = Math.sin(t);
    c.moveTo(cx + ct * w.w / 2, w.y + a + st * a); c.lineTo(cx + ct * (w.w / 2 + T), w.y + a + st * (a + T));
  }
  for (let y = w.y + a + 18; y < w.y + w.h - 4; y += 20) { c.moveTo(ox, y); c.lineTo(w.x, y); c.moveTo(w.x + w.w, y); c.lineTo(ox + ow, y); }
  c.stroke();
  // keystone with a brass rosette
  stk(c, cc => poly(cc, [cx - 10, oy - 4, cx + 10, oy - 4, cx + 6.5, w.y + 9, cx - 6.5, w.y + 9]), L.th.trimHi, C.ink, 2.6, 0.3, 0.2);
  stk(c, cc => draw.circle(cc, cx, oy + 6, 3.6), C.brass, C.brassInk, 1.6, 0.5, 0.2);
  paintTrimDeco(c, L, L.th);
  // the hole (the room is drawn into it every frame)
  arch(c, w.x, w.y, w.w, w.h, a); c.fillStyle = '#1a0714'; c.fill();
}

function paintHeader(c, L) {
  const h = L.header;
  c.fillStyle = 'rgba(4,3,16,0.5)'; draw.roundRect(c, h.x + 2, h.y + 5, h.w, h.h, 5); c.fill();
  stk(c, cc => draw.roundRect(cc, h.x, h.y, h.w, h.h, 5), L.th.header, C.ink, 3, 0.2, 0.28);
  c.strokeStyle = L.th.rim; c.lineWidth = 1.5;
  draw.roundRect(c, h.x + 4, h.y + 4, h.w - 8, h.h - 8, 3); c.stroke();
  c.strokeStyle = 'rgba(255,230,170,0.35)'; c.lineWidth = 0.7;
  draw.roundRect(c, h.x + 5.2, h.y + 5.2, h.w - 10.4, h.h - 10.4, 2.4); c.stroke();
  // bulb sockets (lit per frame)
  const B = L.bulbs;
  for (let i = 0; i < B.n; i++) {
    c.fillStyle = '#4b3415'; draw.circle(c, B.xy[i * 2], B.xy[i * 2 + 1], 2.7); c.fill();
    c.lineWidth = 1; c.strokeStyle = C.ink; c.stroke();
  }
  paintHeaderDeco(c, L, L.th);
}

function paintDoorway(c, L) {
  const d = L.door, x = d.x, y = d.y, w = d.w, h = d.h, cx = x + w / 2;
  // recess + the warm hallway behind the door (seen when it opens)
  c.fillStyle = '#0a0820'; c.fillRect(x - 7, y - 7, w + 14, h + 7);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = draw.radial(c, cx, y + h * 0.5, 4, h * 0.8, [[0, '#ffe3a8'], [0.3, '#ffb347'], [0.7, '#b64a34'], [1, '#4a1426']]);
  c.fillRect(x, y, w, h);
  // velvet curtains drawn back at the far end + a warm floor runner
  for (let s = -1; s <= 1; s += 2) {
    const ex = s < 0 ? x : x + w, ix = cx + s * w * 0.18;
    c.fillStyle = C.velvet;
    c.beginPath(); c.moveTo(ex, y); c.lineTo(ix, y); c.quadraticCurveTo(cx + s * w * 0.3, y + h * 0.45, ex, y + h * 0.78); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,0,16,0.5)'; c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 1; i < 4; i++) { const fx = lerp(ex, ix, i / 4); c.moveTo(fx, y); c.quadraticCurveTo(lerp(ex, cx + s * w * 0.3, i / 4), y + h * 0.4, ex, y + h * (0.3 + i * 0.12)); }
    c.stroke();
  }
  c.fillStyle = 'rgba(120,20,40,0.85)';
  poly(c, [cx - w * 0.14, y + h * 0.72, cx + w * 0.14, y + h * 0.72, x + w * 0.86, y + h, x + w * 0.14, y + h]); c.fill();
  c.fillStyle = 'rgba(255,214,140,0.45)'; c.fillRect(cx - w * 0.14, y + h * 0.72 - 1, w * 0.28, 1.4);
  c.restore();
  // the frame (brass, or the door skin's)
  const DS = DOOR[L.doorSkin] || DOOR.brass;
  if (L.doorSkin !== 'brass') paintDoorFrame(c, L.doorSkin, x, y, w, h);
  else {
    stk(c, cc => draw.roundRect(cc, x - 10, y - 4, 8, h + 4, 2), C.brass, C.brassInk, 2.4, 0.4, 0.2);
    stk(c, cc => draw.roundRect(cc, x + w + 2, y - 4, 8, h + 4, 2), C.brass, C.brassInk, 2.4, 0.4, 0.2);
    stk(c, cc => draw.roundRect(cc, x - 13, y - 12, w + 26, 10, 3), C.brass, C.brassInk, 2.6, 0.4, 0.22);
    c.fillStyle = 'rgba(80,46,6,0.6)';
    for (let i = 0; i < 6; i++) { draw.circle(c, x - 8 + i * (w + 16) / 5, y - 7, 1.1); c.fill(); }
  }
  // transom fanlight in the gap above the door
  const g = L.transom;
  if (g >= 14) {
    const ty = y - 12, ry = Math.min(g - 4, w * 0.42);
    c.save(); c.beginPath(); c.ellipse(cx, ty, w * 0.42, ry, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = draw.radial(c, cx, ty, 2, w * 0.45, [[0, DS.fan[0]], [0.6, DS.fan[1]], [1, DS.fan[2]]]); c.fill();
    c.lineWidth = 2.6; c.strokeStyle = DS.ink; c.stroke();
    c.clip();
    c.strokeStyle = DS.spoke; c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 1; i < 6; i++) { const t = Math.PI + (i / 6) * Math.PI; c.moveTo(cx, ty); c.lineTo(cx + Math.cos(t) * w, ty + Math.sin(t) * w); }
    c.stroke();
    c.restore();
  }
  // threshold + step
  stk(c, cc => draw.roundRect(cc, x - 16, L.base - 3, w + 30, 9, 2), '#3a3684', C.ink, 2.4, 0.3, 0.25);
  stk(c, cc => draw.roundRect(cc, x - 4, L.base - 5, w + 8, 4, 1.5), L.doorSkin === 'brass' ? C.brass : DS.frame, DS.ink, 1.6, 0.5, 0.2);
  // the brass sconce on the door's jamb (left out when no jamb is clear of the front guest's head)
  if (!L.sconceOn) return;
  const sx = L.sconce[0], sy = L.sconce[1];
  c.fillStyle = 'rgba(4,3,16,0.4)'; draw.roundRect(c, sx - 4, sy - 3, 10, 20, 3); c.fill();   // its contact shadow on the jamb
  stk(c, cc => draw.roundRect(cc, sx - 2.5, sy + 6, 5, 9, 2), C.brass, C.brassInk, 1.6, 0.4, 0.2);
  stk(c, cc => poly(cc, [sx - 5.5, sy - 6, sx + 5.5, sy - 6, sx + 4, sy + 6, sx - 4, sy + 6]), '#ffd38a', C.brassInk, 1.8, 0.5, 0.1);
  stk(c, cc => poly(cc, [sx - 7, sy - 6, sx + 7, sy - 6, sx, sy - 12]), C.brass, C.brassInk, 1.6, 0.4, 0.2);
}

// the queue lane: a velvet carpet that follows the line of the queue (a Catmull-Rom curve from just behind the last queue
// row through every row's feet to the rope), tapering in perspective from a soft rounded end under the last guest to a
// brass carpet rod before the rope, gold edged; a worn shadow under each queue row
const LANE_N = 40, LANE = new Float32Array(LANE_N * 4);   // per sample: centre x, y, normal x, y (bake time)
function paintLane(c, L) {
  const ln = L.lane, Q = L.qs, hf = ln[4], hn = ln[5];
  const px = [ln[0], Q[3].x, Q[2].x, Q[1].x, ln[2]], py = [ln[1], Q[3].feetY + 1, Q[2].feetY + 1, Q[1].feetY + 1, ln[3]];
  const n = LANE_N, segs = px.length - 1;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) * segs, sI = Math.min(segs - 1, Math.floor(u)), f = u - sI;
    const i0 = Math.max(0, sI - 1), i3 = Math.min(segs, sI + 2), f2 = f * f, f3 = f2 * f;
    const cr = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f2 + (-a + 3 * b - 3 * cc + d) * f3);
    LANE[i * 4] = cr(px[i0], px[sI], px[sI + 1], px[i3]); LANE[i * 4 + 1] = cr(py[i0], py[sI], py[sI + 1], py[i3]);
  }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = LANE[b * 4] - LANE[a * 4], dy = LANE[b * 4 + 1] - LANE[a * 4 + 1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    LANE[i * 4 + 2] = -dy / l; LANE[i * 4 + 3] = dx / l;
  }
  const hw = i => hf + (hn - hf) * Math.pow(i / (n - 1), 1.3);
  const edge = (cc, k, from, to, step) => { for (let i = from; i !== to; i += step) cc.lineTo(LANE[i * 4] + LANE[i * 4 + 2] * hw(i) * k, LANE[i * 4 + 1] + LANE[i * 4 + 3] * hw(i) * k); };
  const fx = LANE[0], fy = LANE[1], ang = Math.atan2(LANE[5] - fy, LANE[4] - fx);
  const shape = cc => {
    cc.beginPath(); cc.moveTo(fx + LANE[2] * hf, fy + LANE[3] * hf);
    edge(cc, 1, 1, n, 1); edge(cc, -1, n - 1, -1, -1);
    cc.ellipse(fx, fy, hf * 1.5, hf, ang, Math.PI * 1.5, Math.PI * 0.5, true);
    cc.closePath();
  };
  const ex = LANE[(n - 1) * 4], ey = LANE[(n - 1) * 4 + 1];
  c.save();
  c.save(); c.translate(0, 2.5); shape(c); c.fillStyle = 'rgba(4,3,16,0.45)'; c.fill(); c.restore();
  shape(c);
  const CP = L.th.carpet, vipC = L.th.id === 'vip';
  c.fillStyle = draw.gradient(c, fx - Math.cos(ang) * hf * 1.5, fy - Math.sin(ang) * hf * 1.5, ex, ey, [[0, vipC ? 'rgba(8,6,10,0)' : 'rgba(70,8,28,0)'], [0.07, CP[0]],
    [0.4, CP[1]], [1, CP[2]]]);
  c.fill();
  c.clip();
  // pile texture: lines along the lane
  c.lineWidth = 0.8;
  for (let j = -6; j <= 6; j++) {
    const k = j / 6;
    c.strokeStyle = (j & 1) ? (vipC ? 'rgba(255,214,120,0.05)' : 'rgba(255,120,140,0.07)') : 'rgba(30,0,10,0.16)';
    c.beginPath(); c.moveTo(fx + LANE[2] * hf * k - Math.cos(ang) * 10, fy + LANE[3] * hf * k - Math.sin(ang) * 10); edge(c, k, 0, n, 1); c.stroke();
  }
  // worn shadow pools where the queue stands (bigger contact shadows, so the back guests sit in the line)
  const SPT = TUNE.lane.spot;
  for (let i = 1; i < 4; i++) {
    const s = Q[i].scale;
    c.save(); c.translate(Q[i].x, Q[i].feetY + 1); c.scale(1, SPT[1] / SPT[0]);
    c.fillStyle = draw.radial(c, 0, 0, 0, SPT[0] * s, [[0, 'rgba(10,0,8,' + SPT[2] + ')'], [0.6, 'rgba(10,0,8,' + SPT[2] * 0.5 + ')'], [1, 'rgba(10,0,8,0)']]);
    c.fillRect(-SPT[0] * s, -SPT[0] * s, SPT[0] * s * 2, SPT[0] * s * 2);
    c.restore();
  }
  c.restore();
  // gold edging, fading in from the far end
  c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = draw.gradient(c, fx, fy, ex, ey, [[0, 'rgba(217,164,65,0)'], [0.12, 'rgba(217,164,65,0.45)'], [1, CP[3]]]);
  if (vipC) c.lineWidth = 2.2;
  for (let k = -1; k <= 1; k += 2) { c.beginPath(); c.moveTo(fx + LANE[2] * hf * k, fy + LANE[3] * hf * k); edge(c, k, 1, n, 1); c.stroke(); }
  // the brass carpet rod across the near end
  const nx = LANE[(n - 1) * 4 + 2], ny = LANE[(n - 1) * 4 + 3];
  c.beginPath(); c.moveTo(ex - nx * (hn + 2), ey - ny * (hn + 2)); c.lineTo(ex + nx * (hn + 2), ey + ny * (hn + 2));
  c.lineWidth = 4.2; c.strokeStyle = C.brassInk; c.stroke();
  c.lineWidth = 2.4; c.strokeStyle = C.brass; c.stroke();
  c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,240,200,0.8)';
  c.beginPath(); c.moveTo(ex - nx * (hn + 1.5), ey - ny * (hn + 1.5) - 0.6); c.lineTo(ex + nx * (hn + 1.5), ey + ny * (hn + 1.5) - 0.6); c.stroke();
}

// the street lamp (play): a lantern hanging from a wrought-iron arm bolted to the building's corner quoins (a wall plate,
// a straight arm with a curled tip, a scroll brace under it, a hook + ring down to the lantern's finial), so no post
// stands behind the queue's back row; the lantern's glass glows, a drop finial hangs under it
function paintLampPost(c, L) {
  const x = L.lamp.x, ly = L.lamp.y, LP = TUNE.lamp, wx = L.corner + 1, ay = ly - LP.arm, pt = ay - 9;
  // wall plate on the quoins, two rivets
  c.fillStyle = 'rgba(4,3,16,0.4)'; draw.roundRect(c, wx + 1.5, pt + 2.5, 9, LP.plate, 3); c.fill();
  stk(c, cc => draw.roundRect(cc, wx - 1, pt, 9, LP.plate, 3), C.iron, C.ink, 2, 0.3, 0.22);
  c.fillStyle = '#5a56a0'; draw.circle(c, wx + 3.5, pt + 5, 1.3); c.fill(); draw.circle(c, wx + 3.5, pt + LP.plate - 5, 1.3); c.fill();
  // the arm (a curl at its outer tip) + the scroll brace from low on the plate up under the arm; ink, iron, a cool rim
  c.lineCap = 'round'; c.lineJoin = 'round';
  const arm = cc => {
    cc.beginPath();
    cc.moveTo(wx + 2, ay); cc.lineTo(x - 3, ay);
    cc.arc(x - 3, ay - 3.4, 3.4, Math.PI * 0.5, Math.PI * 1.6, false);
    cc.moveTo(wx + 2, ay + LP.plate * 0.62); cc.bezierCurveTo(x + 13, ay + LP.plate * 0.62, x + 6, ay + 1, x + 8, ay + 0.5);
    cc.moveTo(wx - 4, ay); cc.arc(wx - 4, ay + 3.2, 3.2, -Math.PI * 0.5, Math.PI * 0.85, false);   // a curl hung under the arm
  };
  arm(c); c.lineWidth = 4.6; c.strokeStyle = C.ink; c.stroke();
  arm(c); c.lineWidth = 2.4; c.strokeStyle = C.iron; c.stroke();
  c.beginPath(); c.moveTo(wx + 1, ay - 0.9); c.lineTo(x - 2, ay - 0.9); c.lineWidth = 0.9; c.strokeStyle = 'rgba(170,200,255,0.45)'; c.stroke();
  // hook + ring down to the lantern's finial
  c.beginPath(); c.moveTo(x, ay); c.lineTo(x, ly - 31.5); c.lineWidth = 3.4; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 1.5; c.strokeStyle = C.iron; c.stroke();
  c.beginPath(); c.arc(x, ly - 33, 2.6, 0, TAU); c.lineWidth = 2.6; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 1.1; c.strokeStyle = '#4a4598'; c.stroke();
  // the drop finial under the lantern
  stk(c, cc => poly(cc, [x - 5, ly + 18, x + 5, ly + 18, x, ly + 27]), C.iron, C.ink, 1.8, 0.3, 0.2);
  stk(c, cc => draw.circle(cc, x, ly + 28, 1.9), C.iron, C.ink, 1.2, 0.4, 0.2);
  // lantern: glowing glass, frame bars, cap, finial
  stk(c, cc => draw.roundRect(cc, x - 8, ly + 12, 16, 6, 2.5), C.iron, C.ink, 2, 0.3, 0.2);
  c.fillStyle = L.th.id === 'house' ? draw.radial(c, x, ly, 1, 14, [[0, '#ffffff'], [0.45, '#dfe9ff'], [1, '#8fb0f0']])
    : draw.radial(c, x, ly, 1, 14, [[0, '#ffffff'], [0.45, color.mix('#ffffff', L.th.lamp, 0.45)], [1, L.th.lamp]]);
  poly(c, [x - 10, ly - 13, x + 10, ly - 13, x + 7.5, ly + 12, x - 7.5, ly + 12]); c.fill();
  c.lineWidth = 2.2; c.strokeStyle = C.ink; c.stroke();
  c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, ly - 13); c.lineTo(x, ly + 12); c.moveTo(x - 9, ly - 1); c.lineTo(x + 9, ly - 1); c.stroke();
  stk(c, cc => poly(cc, [x - 14, ly - 12, x + 14, ly - 12, x, ly - 26]), C.iron, C.ink, 2.2, 0.3, 0.2);
  stk(c, cc => draw.circle(cc, x, ly - 28, 2.8), C.iron, C.ink, 1.6, 0.4, 0.2);
}

// wet street under the door: the brass leaf mirrored in rippled rows (squashed, fading with distance), its jambs, the warm
// porthole streak, and the lamp's cool streak below the curb (bake time, additive; the doorless lobby: the lamp's only)
function paintReflections(c, L) {
  streak(c, L.lamp.x + 3, L.curb + 6, 13, 100, L.th.lamp, 0.42, 11);
  if (L.lobby) return;
  const d = L.door, base = L.base, A = TUNE.pool.refl, rh = d.h * 0.42, q = rh / d.h, band = 2.4;
  const lf = draw.bake(d.w, d.h, cc => paintLeaf(cc, L)), px = lf.width / d.w, fcol = L.doorSkin === 'brass' ? C.brass : (DOOR[L.doorSkin] || DOOR.brass).frame;
  for (let yy = 0; yy < rh; yy += band) {
    const sy0 = d.h - (yy + band) / q;
    if (sy0 < 0) break;
    const k = yy / rh, ox = Math.sin(yy * 0.8 + 1.3) * (0.6 + 2.2 * k);
    c.globalAlpha = A * (1 - k) * (1 - k);
    c.drawImage(lf, 0, sy0 * px, lf.width, (band / q) * px, d.x + ox, base + 7 + yy, d.w, band * 0.72);
  }
  c.globalAlpha = 1;
  streak(c, d.x - 6, base + 8, 7, 50, fcol, 0.42, 7);
  streak(c, d.x + d.w + 6, base + 8, 7, 50, fcol, 0.42, 8);
  streak(c, d.x + d.w / 2, base + 10, 17, 92, C.amber, 0.5, 9);
}
// the door's amber pool on the cobbles (additive sprite, drawn live with the door's brightness), w x h, centred
function paintPool(c, w, h, col) {
  c.save(); c.translate(w / 2, h / 2); c.scale(1, h / w);
  fillGlow(c, 0, 0, 4, w / 2, col, 0.55);
  c.restore();
}
function paintBg(c, L) {
  const P = TUNE.pad;
  c.translate(P, P);
  paintSky(c, L);
  paintCity(c, L);
  paintGround(c, L);
  // ground light pools: the lamp (cool) and the warm leak under the shut door
  c.globalCompositeOperation = 'lighter';
  c.save(); c.translate(L.lamp.x + 34, L.base + 26); c.scale(1, 0.26);
  fillGlow(c, 0, 0, 6, 135, L.th.lamp, 0.24); c.restore();
  if (!L.lobby) { c.save(); c.translate(L.door.x + L.door.w / 2, L.base + 6); c.scale(1, 0.2); fillGlow(c, 0, 0, 4, 70, C.amber, 0.32); c.restore(); }
  // the lamp's cool pool out on the cobbles (the door's amber pool is drawn live: it brightens when the door opens)
  const PL = L.poolL;
  c.save(); c.translate(PL[0], PL[1]); c.scale(1, PL[3] / PL[2]);
  fillGlow(c, 0, 0, 6, PL[2], L.th.lamp, TUNE.pool.lamp); c.restore();
  // wet reflections: the brass door + its jambs + the lit porthole, and the lamp's cool streak
  paintReflections(c, L);
  c.globalCompositeOperation = 'source-over';
  paintFacade(c, L);
  paintWindowTrim(c, L);
  paintHeader(c, L);
  if (!L.lobby) { paintDoorway(c, L); paintLane(c, L); paintLampPost(c, L); }
  // foreground darkening (the plates sit on it) + a soft floor fog
  const H = L.H, W = L.W;
  c.fillStyle = draw.gradient(c, 0, H - 330, 0, H + P, [[0, 'rgba(5,4,18,0)'], [0.5, 'rgba(5,4,18,0.3)'], [1, 'rgba(5,4,18,0.7)']]);
  c.fillRect(-P, H - 330, W + P * 2, 330 + P);
}
const STAN_O = { scale: 1, anchor: [0.5, TUNE.stanchion.foot / TUNE.stanchion.h] };
function STAN_OPTS(s) { STAN_O.scale = s; return STAN_O; }

function paintStanchion(c, skin) {
  if (skin && skin !== 'velvet') { paintStanchionSkin(c, skin, TUNE.stanchion.w, TUNE.stanchion.foot, TUNE.stanchion.hook); return; }
  const cx = TUNE.stanchion.w / 2, foot = TUNE.stanchion.foot;
  stk(c, cc => draw.ellipse(cc, cx, foot - 2.5, 11, 4.2), C.brass, C.brassInk, 2.2, 0.35, 0.28);
  stk(c, cc => draw.roundRect(cc, cx - 2.6, 12, 5.2, foot - 14, 2.4), C.brass, C.brassInk, 2, 0.45, 0.2);
  stk(c, cc => draw.roundRect(cc, cx - 4.6, foot - 11, 9.2, 4.6, 2), '#c08a34', C.brassInk, 1.8, 0.3, 0.2);
  stk(c, cc => draw.roundRect(cc, cx - 4.4, TUNE.stanchion.hook - 2.5, 8.8, 4.4, 2), '#c08a34', C.brassInk, 1.8, 0.3, 0.2);
  stk(c, cc => draw.circle(cc, cx, 9.5, 5.6), C.brass, C.brassInk, 2, 0.55, 0.22);
  c.fillStyle = 'rgba(255,250,222,0.9)'; draw.circle(c, cx - 1.8, 7.6, 1.5); c.fill();
}

function paintLeaf(c, L) {   // door leaf, w x h design units, outline inset so slices never clip it
  const d = L.door, w = d.w, h = d.h;
  if (L.doorSkin !== 'brass') { paintDoorLeaf(c, L.doorSkin, w, h); return; }   // a door skin (cosmetics-art.js)
  stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), C.brass, C.brassInk, 3, 0.3, 0.24);
  const pw = w - 18, ph1 = h * 0.44, ph2 = h * 0.36;
  stk(c, cc => draw.roundRect(cc, 9, 11, pw, ph1, 4), '#c8923a', '#6a430c', 2, 0.12, 0.3);
  stk(c, cc => draw.roundRect(cc, 9, h * 0.52 + 3, pw, ph2, 4), '#c8923a', '#6a430c', 2, 0.12, 0.3);
  // porthole: brass ring, warm glass, glint
  const pr = Math.min(w * 0.24, ph1 * 0.34), px = w / 2, py = 11 + ph1 * 0.5;
  c.fillStyle = draw.radial(c, px, py, 1, pr, [[0, '#ffe7b0'], [0.55, '#ffb347'], [1, '#d0652e']]);
  draw.circle(c, px, py, pr); c.fill();
  c.lineWidth = 4.2; c.strokeStyle = '#8a5a14'; c.stroke();
  c.lineWidth = 1.4; c.strokeStyle = C.brassInk; draw.circle(c, px, py, pr + 2.4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.6;
  c.beginPath(); c.arc(px, py, pr * 0.62, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  // rivets along the edges
  c.fillStyle = '#8a5a14';
  for (let yy = 8; yy < h - 6; yy += 13) { draw.circle(c, 4.6, yy, 1.1); c.fill(); draw.circle(c, w - 4.6, yy, 1.1); c.fill(); }
  // ring handle on the latch side
  stk(c, cc => draw.roundRect(cc, 5, h * 0.5 - 7, 6, 14, 2.5), '#b37f2c', C.brassInk, 1.5, 0.3, 0.2);
  c.lineWidth = 2.2; c.strokeStyle = C.brassInk; draw.circle(c, 10.5, h * 0.5 + 4, 4.2); c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = '#ffe2a0'; c.beginPath(); c.arc(10.5, h * 0.5 + 4, 4.2, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
  // kick plate
  stk(c, cc => draw.roundRect(cc, 4, h - 15, w - 8, 12, 2), '#a8742a', C.brassInk, 1.8, 0.25, 0.2);
}
const NUM_TXT = { size: 8.6, weight: 800, font: 'Baloo 2', color: '#ffe3a8' };

// the house number: an indigo enamel plate with a brass bezel and cream numerals, screwed to the middle of the lintel
function paintNumber(c, w, h) {
  stk(c, cc => draw.roundRect(cc, 1.4, 1.4, w - 2.8, h - 2.8, 3.4), '#2b2470', C.brassInk, 1.5, 0.3, 0.22);
  c.strokeStyle = C.brass; c.lineWidth = 1.1;
  draw.roundRect(c, 3.1, 3.1, w - 6.2, h - 6.2, 2.2); c.stroke();
  c.fillStyle = '#ffd38a'; draw.circle(c, 4.9, h / 2, 0.7); c.fill(); draw.circle(c, w - 4.9, h / 2, 0.7); c.fill();
  draw.text(c, '13', w / 2, h / 2 + 0.7, NUM_TXT);
}
function paintBulb(c, w, B) {
  const r = w / 2;
  c.fillStyle = draw.radial(c, r, r, 0, r, [[0, 'rgba(' + B[0] + ',1)'], [0.18, 'rgba(' + B[1] + ',0.95)'], [0.4, 'rgba(' + B[2] + ',0.35)'], [1, 'rgba(' + B[2] + ',0)']]);
  c.fillRect(0, 0, w, w);
}
function paintSoft(c, w, col, a) {
  const r = w / 2;
  c.fillStyle = draw.radial(c, r, r, 0, r, [[0, rgba(col, a)], [0.5, rgba(col, a * 0.5)], [1, rgba(col, 0)]]);
  c.fillRect(0, 0, w, w);
}
// cool cone from the lantern to the ground (w x h, apex at L.lamp.x - box left)
function paintCone(c, L, w, h) {
  const ax = L.lamp.x - L.coneX0;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const spread = 0.55 + i * 0.22, a = 0.06 - i * 0.012;
    c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, rgba(L.th.lamp, a * 2.2)], [0.6, rgba(L.th.lamp, a)], [1, rgba(L.th.lamp, 0)]]);
    poly(c, [ax - 6, 0, ax + 6, 0, ax + h * spread * 0.85, h, ax - h * spread * 0.6, h]); c.fill();
  }
}
// amber spill on the street in front of the open door
function paintSpill(c, L, w, h) {
  const d = L.door, ox = L.spillX0, x0 = d.x - ox, x1 = d.x + d.w - ox;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const a = 0.24 - i * 0.06, wl = 46 + i * 34, wr = 26 + i * 22;
    c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, rgba(C.amber, a)], [0.45, rgba(C.amber, a * 0.45)], [1, rgba(C.amber, 0)]]);
    poly(c, [x0 + 2, 0, x1 - 2, 0, x1 + wr, h, x0 - wl, h]); c.fill();
  }
}
// warm rays out of the party window down over the street (front, additive), baked into the box L.rays [x, y, w, h]
function paintRays(c, L) {
  const w = L.win, H = L.H, y0 = w.y + w.h * 0.62;
  c.translate(-L.rays[0], -L.rays[1]);
  c.globalCompositeOperation = 'lighter';
  const r = rng(L.lobby ? 61 : 17);
  for (let i = 0; i < 6; i++) {
    const x = w.x + w.w * (0.12 + i * 0.152) + (r.next() - 0.5) * 12, wd = 9 + r.next() * 14, lean = (i - 2.5) * 22, len = Math.min(H - y0, 280 + r.next() * 120);
    c.fillStyle = draw.gradient(c, 0, y0, 0, y0 + len, [[0, 'rgba(' + L.th.rays + ',0.075)'], [1, 'rgba(' + L.th.rays + ',0)']]);
    poly(c, [x - wd * 0.5, y0, x + wd * 0.5, y0, x + lean + wd * 1.6, y0 + len, x + lean - wd * 1.6, y0 + len]); c.fill();
  }
}
// dark foreground foliage framing the corners, rim lit cool (lamp side) / warm (door side): three cropped sprites
const LEAF_DARK = '#070618', LEAF_DARK2 = '#0b0a24';
// ivy hanging from the cornice at the building corner (box L.ivy)
function paintIvy(c, L) {
  c.translate(-L.ivy[0], -L.ivy[1]);
  if (L.th.ivy !== 'ivy') { if (L.th.ivy !== 'none') paintCorner(c, L, L.th); return; }
  const r = rng(L.lobby ? 303 : 101), ix = L.corner + 3, iy = L.roof + 2, ilen = L.ivyLen;
  c.strokeStyle = LEAF_DARK; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let s = 0; s < 3; s++) {
    const sx = ix - 8 + s * 13, len = ilen * (0.55 + 0.45 * r.next());
    c.beginPath(); c.moveTo(sx, iy);
    c.quadraticCurveTo(sx + 10 - s * 6, iy + len * 0.5, sx - 4 + s * 3, iy + len); c.stroke();
    for (let j = 0; j < 8; j++) {
      const k = j / 7, lx = sx + Math.sin(k * 4 + s) * 6, ly = iy + 4 + len * k;
      leaf(c, lx, ly, 8 + r.next() * 5, 5 + r.next() * 2, (r.next() - 0.5) * 2.2 + Math.PI, j & 1 ? LEAF_DARK : LEAF_DARK2, 'rgba(140,170,255,0.32)', -1.1, -0.9);
    }
  }
}
// bottom-left (side 0, the lamp side) / bottom-right (side 1, the door side): a brass-rimmed indigo planter with a clipped
// topiary in it (TUNE.bush): overlapping leaf masses with jagged leaf-tip silhouettes, two-tone in a cool green indigo
// (lit toward the street lamp, deep on the far side), leaf texture, a crisp cool rim on the lamp side, a sticker outline;
// a string of fairy lights swagged across the front (the bulbs are baked, their glow twinkles live on the beat)
// a mass's leafy silhouette (bake time): soft scalloped bumps, each edged with three small pointed leaf tips (BUSH_PT:
// the outline's points x, y), so the clump reads as clipped foliage, not a balloon and not a gear
const BUSH_PT = new Float32Array(16 * 6 * 2);
// the light comes from the street lamp: from above for the left planter, from the upper left for the right one
function bushLight(side, out) { out[0] = side ? -0.78 : 0.18; out[1] = side ? -0.62 : -0.98; return out; }
const BUSH_L = [0, 0];
const BUMP_R = [0.88, 1.03, 0.975, 1.075, 0.975, 1.03];   // radius profile across one bump: notch, tip, dip, tip, dip, tip
const BUMP_W = new Float32Array(16);                      // bump widths (normalised to the full turn)
function bushPath(c, n, ox, oy) {
  c.moveTo(BUSH_PT[0] + ox, BUSH_PT[1] + oy);
  for (let i = 1; i < n; i++) c.lineTo(BUSH_PT[i * 2] + ox, BUSH_PT[i * 2 + 1] + oy);
  c.closePath();
}
function bushMass(c, x, y, rr, r, side) {
  const B = TUNE.bush, l = bushLight(side, BUSH_L), lx = l[0], ly = l[1], ink = 1.9, ry = 0.92;
  // the outline: 8-12 bumps of uneven width and height, every bump three small leaf points
  const nb = Math.min(16, Math.round(7 + rr * 0.24)), np = BUMP_R.length;
  let sum = 0, t = r.next() * TAU, n = 0;
  for (let i = 0; i < nb; i++) { BUMP_W[i] = 0.82 + r.next() * 0.36; sum += BUMP_W[i]; }
  for (let i = 0; i < nb; i++) {
    const bw = BUMP_W[i] / sum * TAU, bh = 1 + (r.next() - 0.5) * 0.08;
    for (let j = 0; j < np; j++) {
      const aa = t + (j / np) * bw, rad = rr * (j === 0 ? BUMP_R[0] + r.next() * 0.03 : BUMP_R[j] * bh + (r.next() - 0.5) * 0.025);
      BUSH_PT[n * 2] = x + Math.cos(aa) * rad; BUSH_PT[n * 2 + 1] = y + Math.sin(aa) * rad * ry; n++;
    }
    t += bw;
  }
  // cast shadow, then the ink silhouette (a thick stroke under the fill)
  c.save(); c.beginPath(); bushPath(c, n, 1.6, 2.8); c.fillStyle = 'rgba(4,6,14,0.45)'; c.fill(); c.restore();
  c.beginPath(); bushPath(c, n, 0, 0);
  c.lineJoin = 'round'; c.lineWidth = ink * 2; c.strokeStyle = B.ink; c.stroke();
  c.save(); c.clip();
  c.fillStyle = draw.gradient(c, x + lx * rr, y + ly * rr, x - lx * rr, y - ly * rr, [[0, B.hi], [0.5, B.lo], [1, B.deep]]);
  c.fillRect(x - rr * 2, y - rr * 2, rr * 4, rr * 4);
  // leaf texture: small pointed leaves fanning out from the clump's centre, lighter on the lit half, darker in the shade
  for (let i = 0; i < 34; i++) {
    const a = r.next() * TAU, d = Math.sqrt(r.next()) * rr * 0.95, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * ry;
    const lit = (Math.cos(a) * lx + Math.sin(a) * ly) * (d / rr);
    c.globalAlpha = 0.5 + 0.35 * r.next();
    leaf(c, px, py, 4 + r.next() * 3.5, 1.9 + r.next(), a + Math.PI / 2 + (r.next() - 0.5) * 0.9, lit > 0.05 ? B.leafHi : B.leafLo);
  }
  // the lamp-side rim: a crisp crescent on the lit edge (the clump minus a copy shifted away from the light)
  c.globalAlpha = 0.72; c.fillStyle = B.rim;
  c.beginPath(); bushPath(c, n, 0, 0); bushPath(c, n, -lx * 2.8, -ly * 2.8); c.fill('evenodd');
  c.globalAlpha = 1;
  // soft sticker highlight toward the light, a shade on the far side
  c.fillStyle = 'rgba(200,230,255,0.1)'; draw.ellipse(c, x + lx * rr * 0.4, y + ly * rr * 0.42, rr * 0.5, rr * 0.3); c.fill();
  c.fillStyle = 'rgba(2,8,16,0.24)'; draw.ellipse(c, x - lx * rr * 0.55, y - ly * rr * 0.55, rr * 0.75, rr * 0.5); c.fill();
  c.restore();
}
// the fairy lights on side `side`'s topiary (design units), written to L.fairy[side * 8 ..] (layout + bake)
const FAIRY = [-16, -27, 1, -36, 17, -27, 30, -12];   // [dx toward the centre, dy above the planter rim] per bulb
function fairyAt(L, side) {
  const dir = side ? -1 : 1, cx = side ? L.W - 18 : 16, pt = L.shrubY + 36;
  for (let i = 0; i < TUNE.bush.fairy; i++) { L.fairy[side * 8 + i * 2] = cx + dir * FAIRY[i * 2]; L.fairy[side * 8 + i * 2 + 1] = pt + FAIRY[i * 2 + 1]; }
}
function paintShrub(c, L, side) {
  const P = TUNE.pad, W = L.W, box = side ? L.shrubR : L.shrubL, B = TUNE.bush;
  c.translate(-box[0], -box[1]);
  if (L.th.planter !== 'topiary') { paintPlanter(c, L, side, L.th); return; }   // a club theme's corner props
  const r = rng((L.lobby ? 303 : 101) + side * 17);
  const dir = side ? -1 : 1, cx = side ? W - 18 : 16, by = L.shrubY, rim = side ? C.amber : C.cool;
  // the planter: a dark indigo tub with a brass rim + band, running off the screen edge, standing on the street
  const pt = by + 36, ph = 42, pl = side ? W - 52 : -P - 4, pw = 52 + P + 4;
  c.fillStyle = 'rgba(4,3,16,0.55)'; draw.ellipse(c, side ? W - 20 : 20, pt + ph + 3, 46, 7); c.fill();
  stk(c, cc => draw.roundRect(cc, pl, pt + 5, pw, ph, 5), '#262363', C.ink, 2.6, 0.2, 0.3);
  c.fillStyle = 'rgba(4,3,16,0.35)'; c.fillRect(pl + 2, pt + 9, pw - 4, 6);
  stk(c, cc => draw.roundRect(cc, pl - 3, pt, pw + 6, 8, 3), C.brass, C.brassInk, 2.2, 0.45, 0.22);
  stk(c, cc => draw.roundRect(cc, pl, pt + 27, pw, 4.4, 1.5), '#b3832f', C.brassInk, 1.4, 0.4, 0.15);
  c.fillStyle = 'rgba(255,240,200,0.5)'; c.fillRect(pl - 1, pt + 1.4, pw + 2, 1);
  c.fillStyle = rgba(rim, 0.3); c.fillRect(side ? pl + 2 : pl + pw - 4.5, pt + 9, 2, ph - 8);
  // the topiary: a dark soil line, then the clipped leaf masses back to front
  c.fillStyle = B.deep; draw.ellipse(c, cx + dir * 8, pt + 1, 30, 4); c.fill();
  const M = B.masses;
  for (let j = 0; j < M.length; j += 3) {
    bushMass(c, cx + dir * M[j] + (r.next() - 0.5) * 2, pt + M[j + 1] + (r.next() - 0.5) * 2, M[j + 2] + r.next() * 1.2, r, side);
  }
  // the fairy-light string: a dark wire swagged between the bulbs, each bulb a tiny socket + a warm glass drop (the glow
  // is live)
  const F = L.fairy, o = side * 8, nf = B.fairy;
  c.strokeStyle = 'rgba(8,10,20,0.85)'; c.lineWidth = 0.9; c.beginPath();
  for (let i = 0; i < nf - 1; i++) {
    const x0 = F[o + i * 2], y0 = F[o + i * 2 + 1], x1 = F[o + i * 2 + 2], y1 = F[o + i * 2 + 3];
    if (i === 0) c.moveTo(x0, y0 - 2);
    c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 4, x1, y1 - 2);
  }
  c.stroke();
  for (let i = 0; i < nf; i++) {
    const x = F[o + i * 2], y = F[o + i * 2 + 1];
    c.fillStyle = '#0b0a1c'; c.fillRect(x - 1, y - 3.2, 2, 1.8);
    stk(c, cc => draw.ellipse(cc, x, y, 1.7, 2.1), '#ffd79a', '#4a2c08', 0.8, 0.5, 0.1);
  }
}

// ---- the room (room units; the bake helper applies the k scale) ----
function paintRoomBack(c, L) {
  const R = L.room, RW = L.RW, RH = L.RH, A = L.archR, fb = R.fb, D = L.decor, TR = L.th.room;
  c.save(); arch(c, 0, 0, RW, RH, A); c.clip();
  c.fillStyle = draw.gradient(c, 0, 0, 0, fb, [[0, TR.wall[0]], [0.5, TR.wall[1]], [1, TR.wall[2]]]);
  c.fillRect(0, 0, RW, fb + 2);
  paintRoomMotif(c, L, L.th, fb - 22);   // the wall's motif (cosmetics-art.js: the house damask, a club theme's own)
  // chandelier light on the wall + the stage spot
  c.globalCompositeOperation = 'lighter';
  fillGlow(c, RW / 2, R.chandY + 22, 4, RW * 0.66, TR.light, 0.34);
  c.fillStyle = draw.gradient(c, 0, 0, 0, fb, [[0, 'rgba(255,200,120,0.02)'], [1, 'rgba(255,190,110,0.14)']]);
  poly(c, [RW / 2 - 12, 0, RW / 2 + 12, 0, R.stage1 - 26, fb, R.stage0 + 26, fb]); c.fill();
  c.globalCompositeOperation = 'source-over';
  // wainscot + brass chair rail
  const wt = fb - 22;
  c.fillStyle = draw.gradient(c, 0, wt, 0, fb, [[0, TR.wains[0]], [1, TR.wains[1]]]);
  c.fillRect(0, wt, RW, fb - wt + 1);
  c.strokeStyle = 'rgba(255,190,120,0.13)'; c.lineWidth = 1;
  for (let x = 4; x < RW; x += 30) { draw.roundRect(c, x, wt + 4, 24, fb - wt - 8, 2); c.stroke(); }
  c.fillStyle = TR.rail; c.fillRect(0, wt - 2, RW, 2.4);
  c.fillStyle = 'rgba(255,236,190,0.5)'; c.fillRect(0, wt - 2, RW, 0.7);
  // dance floor: dark tiles in perspective with brass grout (lit per beat)
  c.fillStyle = draw.gradient(c, 0, fb, 0, RH, [[0, TR.floor[0]], [1, TR.floor[1]]]);
  c.fillRect(0, fb, RW, RH - fb);
  const T = L.tiles;
  for (let i = 0; i < T.n; i++) {
    const o = i * 8, q = T.q;
    c.fillStyle = (T.parity[i]) ? TR.tile[0] : TR.tile[1];
    c.beginPath(); c.moveTo(q[o], q[o + 1]); c.lineTo(q[o + 2], q[o + 3]); c.lineTo(q[o + 4], q[o + 5]); c.lineTo(q[o + 6], q[o + 7]); c.closePath(); c.fill();
    c.lineWidth = 0.7; c.strokeStyle = TR.grout; c.stroke();
  }
  // stage: wood top, velvet skirt with brass trim and footlights
  const s0 = R.stage0, s1 = R.stage1, st = fb - 5, sf = fb + 1.5, sb = fb + 11;
  c.fillStyle = draw.gradient(c, 0, st, 0, sf, [[0, TR.stage[0]], [1, TR.stage[1]]]);
  poly(c, [s0 - 4, sf, s1 + 4, sf, s1, st, s0, st]); c.fill();
  c.strokeStyle = 'rgba(30,10,4,0.35)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(s0 + 2, st + 2.2); c.lineTo(s1 - 2, st + 2.2); c.moveTo(s0, st + 4.4); c.lineTo(s1, st + 4.4); c.stroke();
  c.fillStyle = draw.gradient(c, 0, sf, 0, sb, [[0, TR.skirt[0]], [1, TR.skirt[1]]]);
  c.fillRect(s0 - 4, sf, s1 - s0 + 8, sb - sf);
  c.fillStyle = 'rgba(40,0,12,0.3)';
  for (let x = s0; x < s1 + 4; x += 7) c.fillRect(x, sf, 2.2, sb - sf);
  c.lineWidth = 2; c.strokeStyle = C.ink; c.strokeRect(s0 - 4, sf, s1 - s0 + 8, sb - sf);
  c.fillStyle = TR.skirtTrim; c.fillRect(s0 - 4, sf - 0.6, s1 - s0 + 8, 1.8);
  for (let x = s0 + 10; x < s1; x += 28) {
    c.fillStyle = L.th.id === 'house' ? '#ffe2a8' : color.mix(TR.foot, '#ffffff', 0.6); draw.circle(c, x, sf + 5, 1.6); c.fill();
    draw.glow(c, x, sf + 2, 9, TR.foot, 0.5);
  }
  // the back risers (overflow dancers stand on them): wood tops + velvet fronts at the back of the stage
  for (let s = 0; s < 2; s++) {
    const x0 = s ? R.riser[2] : R.riser[0], x1 = s ? R.riser[3] : R.riser[1], rt = st - 7, rf = st - 3.5;
    const hs = L.th.id === 'house';
    c.fillStyle = draw.gradient(c, 0, rt, 0, rf, [[0, hs ? '#4a2818' : color.dark(TR.stage[0], 0.05)], [1, hs ? '#7a4a2c' : TR.stage[1]]]);
    poly(c, [x0 + 2, rt, x1 - 2, rt, x1, rf, x0, rf]); c.fill();
    c.fillStyle = hs ? '#4a0c1e' : TR.skirt[1]; c.fillRect(x0, rf, x1 - x0, st - rf + 0.5);
    c.fillStyle = TR.skirtTrim; c.fillRect(x0, rf - 0.4, x1 - x0, 1);
    c.lineWidth = 1.2; c.strokeStyle = C.ink; c.strokeRect(x0, rf, x1 - x0, st - rf + 0.5);
  }
  if (L.th.id !== 'house') paintRoomDeco(c, L, L.th);   // drapes, tent poles, string lights, searchlights
  // decor 4 in a short room: the MONSTER BOUNCER banner hangs from the stage lip (no height for it above the DJ)
  if (D >= 4 && R.banMode === 2) paintBanner(c, L, RW / 2, sf - 1, BANNER.ws, BANNER.h - 1);
  // decor 6: the neon backing board (a theme's lit plaque - Royal's crest, Desert's dallah shelf - brings its own)
  if (D >= 6 && signTube(L.th)) {
    const nx = R.neonX, ny = R.neonY;
    c.fillStyle = 'rgba(18,6,24,0.92)'; draw.roundRect(c, nx - 24, ny - 19, 48, 38, 5); c.fill();
    c.lineWidth = 1.4; c.strokeStyle = C.ink; c.stroke();
    c.fillStyle = 'rgba(200,200,220,0.5)';
    draw.circle(c, nx - 20, ny - 15, 1); c.fill(); draw.circle(c, nx + 20, ny - 15, 1); c.fill();
    draw.circle(c, nx - 20, ny + 15, 1); c.fill(); draw.circle(c, nx + 20, ny + 15, 1); c.fill();
  }
  c.restore();
}
const BANNER = { w: 92, h: 15, ws: 78 };   // ws = the stage-lip banner's width
const BANNER_TXT = { size: 10.5, weight: 800, font: 'Baloo 2', color: '#ffd77a', outline: '#3a0610', outlineWidth: 3, maxWidth: 80, letterSpacing: 0.5 };
// the MONSTER BOUNCER banner: a velvet swallowtail with a brass inner border, top edge at `top`, centred on cx (room units)
// (a club theme hangs its own cloth: cosmetics-art paintBannerTheme, which hands back the lettering's colours)
function paintBanner(c, L, cx, top, bw, bh) {
  const tc = paintBannerTheme(c, L.th, cx, top, bw, bh);
  if (!tc) {
    stk(c, cc => poly(cc, [cx - bw / 2 - 7, top, cx + bw / 2 + 7, top, cx + bw / 2, top + bh / 2, cx + bw / 2 + 7, top + bh, cx - bw / 2 - 7, top + bh, cx - bw / 2, top + bh / 2]),
      C.velvet, '#2a0410', 2, 0.28, 0.25, [cx - bw / 2 - 7, top, bw + 14, bh]);
    c.strokeStyle = C.brass; c.lineWidth = 0.9; c.strokeRect(cx - bw / 2 + 2, top + 2.2, bw - 4, bh - 4.4);
  }
  BANNER_TXT.color = tc ? tc[0] : '#ffd77a'; BANNER_TXT.outline = tc ? tc[1] : '#3a0610';
  BANNER_TXT.maxWidth = bw - 12; BANNER_TXT.size = (bh < 15 ? 9.6 : 10.5) * (i18n.isRTL ? 0.84 : 1);   // Cairo runs taller: keep it inside the brass rule
  draw.text(c, L.title, cx, top + bh / 2 + 0.8, BANNER_TXT);
}

function paintRoomFront(c, L) {
  const RW = L.RW, RH = L.RH;
  c.save(); arch(c, 0, 0, RW, RH, L.archR); c.clip();
  // a club theme's own front props (always on: they are bought); the house's potted palms arrive with decor 3
  if (L.th.id !== 'house' || L.decor >= 3) paintRoomFrontTheme(c, L, L.th);
  c.restore();
}
// glass, reveal shadow, fanlight, garland (screen units, origin = window top-left + margin 4)
function paintOverlay(c, L) {
  const w = L.win.w, h = L.win.h, a = L.arch, k = L.k;
  c.translate(4, 4);
  c.save(); arch(c, 0, 0, w, h, a); c.clip();
  arch(c, 0, 0, w, h, a);
  c.lineWidth = 18; c.strokeStyle = 'rgba(14,3,14,0.42)'; c.stroke();
  c.lineWidth = 8; c.strokeStyle = 'rgba(14,3,14,0.45)'; c.stroke();
  c.fillStyle = draw.gradient(c, 0, h - 14, 0, h, [[0, 'rgba(10,2,10,0)'], [1, 'rgba(10,2,10,0.5)']]);
  c.fillRect(0, h - 14, w, 14);
  // glass reflections
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = draw.gradient(c, 0, 0, w * 0.5, h * 0.6, [[0, 'rgba(255,255,255,0.09)'], [1, 'rgba(255,255,255,0)']]);
  poly(c, [w * 0.04, 0, w * 0.2, 0, w * 0.02, h * 0.62, -w * 0.02, h * 0.5]); c.fill();
  poly(c, [w * 0.26, 0, w * 0.31, 0, w * 0.08, h * 0.8, w * 0.04, h * 0.78]); c.fill();
  c.globalCompositeOperation = 'source-over';
  if (L.decor >= 1) { c.save(); c.scale(k, k); paintGarland(c, L); c.restore(); }
  c.restore();
  // fanlight: transom bar + spokes + hub
  c.lineCap = 'round';
  c.beginPath();
  const cx = w / 2;
  for (let i = 0; i < 4; i++) {
    const t = Math.PI + [0.2, 0.36, 0.64, 0.8][i] * Math.PI;
    c.moveTo(cx + Math.cos(t) * 8, a + Math.sin(t) * 8); c.lineTo(cx + Math.cos(t) * w / 2, a + Math.sin(t) * a);
  }
  const MT = L.th.room.metal, MI = L.th.id === 'house' ? C.brassInk : L.th.room.metalInk;
  c.lineWidth = 3.4; c.strokeStyle = MI; c.stroke();
  c.lineWidth = 1.7; c.strokeStyle = MT; c.stroke();
  stk(c, cc => draw.roundRect(cc, 0, a - 1.8, w, 3.6, 1.5), MT, MI, 1.6, 0.5, 0.15);
  stk(c, cc => { cc.beginPath(); cc.arc(cx, a, 8, Math.PI, TAU); cc.closePath(); }, L.th.id === 'house' ? C.brass : MT, MI, 1.8, 0.45, 0.2, [cx - 8, a - 8, 16, 8]);
  // inner brass bead
  arch(c, 0, 0, w, h, a);
  c.lineWidth = 2.6; c.strokeStyle = L.th.id === 'house' ? '#a77a2e' : color.dark(MT, 0.2); c.stroke();
  c.lineWidth = 1; c.strokeStyle = 'rgba(255,230,170,0.45)'; c.stroke();
  // decor 4: the MONSTER BOUNCER banner hangs in front of the transom bar, between the chandelier and the DJ's horns, on two
  // cords from the fanlight spokes
  if (L.decor >= 4 && L.room.banMode === 1) {
    const RW = L.RW, bw = BANNER.w, top = L.room.banY;
    c.save(); c.scale(k, k);
    c.strokeStyle = 'rgba(250,236,200,0.9)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(RW / 2 - bw / 2 + 6, top + 1); c.lineTo(RW / 2 - bw / 2 + 12, top - 9); c.moveTo(RW / 2 + bw / 2 - 6, top + 1); c.lineTo(RW / 2 + bw / 2 - 12, top - 9); c.stroke();
    paintBanner(c, L, RW / 2, top, bw, BANNER.h);
    c.restore();
  }
}
// decor 1: bunting strung from the transom bar; from decor 4 the MONSTER BOUNCER banner hangs in the middle of it (when it hangs
// up there); from decor 6 the swags stop short of the neon sign (and, mirrored, of the picture)
// In short rooms (L.gk -> 1, TUNE.room.garland) it hangs up in the fanlight above the transom bar with shallow swags and
// smaller flags, tacked to the glass, leaving a gap over the DJ's head and the chandelier, so it never crosses a face
function paintGarland(c, L) {
  const G = TUNE.room.garland, gk = L.gk, RW = L.RW, A = L.archR, y0 = A + 1.5 + G.dy * gk, ban = L.decor >= 4 && L.room.banMode === 1, bw = BANNER.w;
  const up = A - y0, edge = up > 0 ? RW / 2 - RW / 2 * Math.sqrt(Math.max(0, 1 - (up / A) * (up / A))) + 6 : 0;
  const xr = Math.min(L.decor >= 6 ? L.room.neonX - 30 : RW - 4, RW - edge), xl = RW - xr, gap = gk > 0.5 && !ban;
  const mid = ban ? RW / 2 - bw / 2 - 3 : gap ? RW / 2 - G.gap : RW / 2, mid2 = ban ? RW / 2 + bw / 2 + 3 : gap ? RW / 2 + G.gap : RW / 2;
  const ey = ban ? y0 + 3 : gap ? y0 : y0 + 2, dmax = lerp(14, G.dip, gk), fk = lerp(1, G.flag, gk);
  const dl = clamp((mid - xl) * 0.2, Math.min(5, dmax), dmax), dr = clamp((xr - mid2) * 0.2, Math.min(5, dmax), dmax);
  const pts = [[xl, y0], [(xl + mid) * 0.5, y0 + dl], [mid, ey], [mid2, ey], [(mid2 + xr) * 0.5, y0 + dr], [xr, y0]];
  for (let q = 0; q < 2; q++) {
    const s = q * 3;
    const p0 = pts[s], p1 = pts[s + 1], p2 = pts[s + 2];
    c.strokeStyle = 'rgba(250,236,200,0.85)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(p1[0] * 2 - (p0[0] + p2[0]) / 2, p1[1] * 2 - (p0[1] + p2[1]) / 2, p2[0], p2[1]); c.stroke();
    const n = Math.max(3, Math.round(Math.abs(p2[0] - p0[0]) / 14));
    for (let i = 1; i < n; i++) {
      const u = i / n, cxq = p1[0] * 2 - (p0[0] + p2[0]) / 2, cyq = p1[1] * 2 - (p0[1] + p2[1]) / 2;
      const x = (1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * cxq + u * u * p2[0];
      const y = (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * cyq + u * u * p2[1];
      const FL = L.th.room.flags, col = FL[(i + q * 4) % FL.length];
      stk(c, cc => poly(cc, [x - 4.2 * fk, y, x + 4.2 * fk, y, x, y + 9 * fk]), col, '#1a0716', 1.2, 0.3, 0.15);
    }
    if (gk > 0) {   // brass tacks on the glass at the swag ends
      for (let e = 0; e < 3; e += 2) stk(c, cc => draw.circle(cc, pts[s + e][0], pts[s + e][1], 1.6), C.brass, C.brassInk, 0.8, 0.5, 0.1);
    }
  }
}
function paintStandLamp(c) {   // 30 x 72, pivot (15, 70)
  stk(c, cc => draw.ellipse(cc, 15, 67, 9, 3), C.brass, C.brassInk, 1.6, 0.4, 0.25);
  stk(c, cc => draw.roundRect(cc, 13.9, 20, 2.2, 47, 1), C.brass, C.brassInk, 1.2, 0.5, 0.1);
  stk(c, cc => draw.circle(cc, 15, 44, 2), C.brass, C.brassInk, 1, 0.5, 0.1);
  stk(c, cc => poly(cc, [4, 22, 26, 22, 21.5, 6, 8.5, 6]), C.velvet, '#2a0410', 1.8, 0.35, 0.2);
  c.fillStyle = '#ffd38a'; draw.ellipse(c, 15, 22, 10.5, 1.5); c.fill();
  c.strokeStyle = C.brass; c.lineWidth = 0.8;
  c.beginPath(); for (let x = 5; x <= 25; x += 2) { c.moveTo(x, 22.5); c.lineTo(x, 25.2); } c.stroke();
  stk(c, cc => draw.circle(cc, 15, 4.6, 1.6), C.brass, C.brassInk, 1, 0.5, 0.1);
}
// (a club theme casts the headphone cups in its room metal; its hat is a separate sprite: cosmetics-art paintDJHat)
function paintDJ(c, TH) {   // 52 x 48, the furry DJ (eye pupil, lid, brow, mouth and arms are live)
  const cx = 26, cy = 30, r = 19, n = 34, pts = [], hs = TH.id === 'house', cup = hs ? C.brass : TH.room.metal, cupInk = hs ? C.brassInk : TH.room.metalInk;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, rr = r * ((i & 1) ? 0.9 : 1.04) * (1 + 0.04 * Math.sin(t * 3));
    pts.push(cx + Math.cos(t) * rr * 1.06, cy + Math.sin(t) * rr * 0.95);
  }
  stk(c, cc => poly(cc, [cx - 13, 14, cx - 17, 1, cx - 7, 11]), '#f2e2c4', '#5a3a2a', 1.6, 0.4, 0.2);
  stk(c, cc => poly(cc, [cx + 13, 14, cx + 18, 2, cx + 7, 11]), '#f2e2c4', '#5a3a2a', 1.6, 0.4, 0.2);
  stk(c, cc => poly(cc, pts), '#c74a8e', '#4a0f33', 2.4, 0.35, 0.22);
  c.fillStyle = 'rgba(255,170,200,0.35)'; draw.ellipse(c, cx - 11, cy + 4, 4, 2.4); c.fill(); draw.ellipse(c, cx + 11, cy + 4, 4, 2.4); c.fill();
  // headphones
  c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy - 2, r + 1.5, Math.PI * 1.06, Math.PI * 1.94);
  c.lineWidth = 5; c.strokeStyle = C.ink; c.stroke();
  c.lineWidth = 3; c.strokeStyle = '#2b2870'; c.stroke();
  stk(c, cc => draw.roundRect(cc, cx - r - 6, cy - 9, 9, 15, 4), cup, cupInk, 1.8, 0.45, 0.2);
  stk(c, cc => draw.roundRect(cc, cx + r - 3, cy - 9, 9, 15, 4), cup, cupInk, 1.8, 0.45, 0.2);
  // the big eye's white
  stk(c, cc => draw.circle(cc, cx, cy - 8, 8.5), '#ffffff', '#4a0f33', 1.8, 0.1, 0.18);
}
function paintBooth(c) {   // 62 x 28: turntables on top, panel with a speaker and an LED strip
  c.fillStyle = '#100e2c'; draw.roundRect(c, 3, 4, 56, 8, 3); c.fill();
  for (let s = 0; s < 2; s++) {
    const tx = s ? 45 : 17;
    stk(c, cc => draw.ellipse(cc, tx, 6.5, 10, 3.2), '#141230', '#000', 1.2, 0.2, 0.1);
    c.fillStyle = '#d9a441'; draw.ellipse(c, tx, 6.5, 3, 1); c.fill();
  }
  // record grooves + tone arms
  c.strokeStyle = 'rgba(160,150,220,0.35)'; c.lineWidth = 0.5;
  for (let s = 0; s < 2; s++) { const tx = s ? 45 : 17; draw.ellipse(c, tx, 6.5, 7, 2.2); c.stroke(); }
  c.strokeStyle = '#c9c4e8'; c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(27.5, 3.6); c.lineTo(22, 6.4); c.moveTo(55.5, 3.6); c.lineTo(50, 6.4); c.stroke();
  stk(c, cc => draw.roundRect(cc, 1.5, 8, 59, 19, 3), '#1b1a4d', C.ink, 2.2, 0.22, 0.28);
  c.fillStyle = C.brass; c.fillRect(1.5, 8.2, 59, 1.3);
  // the EQ well (its LEDs are live), the speaker, three knobs + a crossfader on the right
  c.fillStyle = '#0d0b26'; draw.roundRect(c, 4.8, 10.6, 19.8, 15, 1.6); c.fill();
  stk(c, cc => draw.circle(cc, 31, 18, 6.2), '#0e0c26', '#000', 1.2, 0.15, 0.1);
  c.strokeStyle = 'rgba(217,164,65,0.6)'; c.lineWidth = 0.8; draw.circle(c, 31, 18, 4); c.stroke();
  c.fillStyle = '#3a3684'; draw.circle(c, 31, 18, 1.6); c.fill();
  for (let i = 0; i < 3; i++) {
    stk(c, cc => draw.circle(cc, 41.5 + i * 6.2, 14.2, 1.9), C.brass, C.brassInk, 0.9, 0.5, 0.15);
    c.strokeStyle = C.brassInk; c.lineWidth = 0.6; c.beginPath(); c.moveTo(41.5 + i * 6.2, 14.2); c.lineTo(41.5 + i * 6.2 + (i - 1) * 1.2, 12.6); c.stroke();
  }
  c.fillStyle = '#0d0b26'; draw.roundRect(c, 39.5, 20.6, 17, 2.4, 1.2); c.fill();
  stk(c, cc => draw.roundRect(cc, 46.4, 19.2, 3.4, 5.2, 1), '#e8e4ff', C.ink, 0.8, 0.4, 0.1);
}
function paintDisco(c, frame) {   // 24 x 24
  const cx = 12, cy = 12, r = 10;
  c.save(); draw.circle(c, cx, cy, r); c.clip();
  c.fillStyle = draw.radial(c, cx - 3, cy - 3, 1, r * 1.4, [[0, '#f4f4ff'], [0.5, '#a6a8c8'], [1, '#3a3c5c']]);
  c.fillRect(0, 0, 24, 24);
  const r2 = rng(5 + frame * 13);
  for (let y = 2; y < 22; y += 3.2) {
    const rowW = Math.sqrt(Math.max(0, r * r - (y + 1.6 - cy) * (y + 1.6 - cy)));
    for (let x = cx - rowW + ((frame + (y | 0)) % 3) * 1.1; x < cx + rowW; x += 3.2) {
      const v = r2.next();
      c.fillStyle = v < 0.15 ? 'rgba(255,255,255,0.9)' : v < 0.45 ? 'rgba(255,255,255,0.25)' : 'rgba(20,20,60,0.25)';
      c.fillRect(x, y, 2.6, 2.6);
    }
  }
  c.restore();
  draw.circle(c, cx, cy, r); c.lineWidth = 1.4; c.strokeStyle = C.ink; c.stroke();
}
// spotlight beam, apex up: half width SPOT_TOP at the top, w / 2 at the bottom; rgb = its three 'r,g,b' stops (top, 70 %,
// floor), the unlock's amber by default (the encore's sweep beams are a hot pink-white)
const SPOT_AMBER = ['255,206,130', '255,180,90', '255,160,70'], SPOT_PINK = ['255,226,246', '255,120,200', '255,80,170'];
const SPOT_GOLD = ['255,246,220', '255,214,110', '255,184,60'];   // a gold night's encore beams
function paintSpot(c, w, h, rgb) {
  const R = rgb || SPOT_AMBER;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.2, a = 0.22 + i * 0.12, t2 = w * 0.5 * SPOT_TOP / SPOT_BOT * k, b2 = w * 0.5 * k;
    c.fillStyle = draw.gradient(c, 0, 0, 0, h, [[0, 'rgba(' + R[0] + ',' + a + ')'], [0.7, 'rgba(' + R[1] + ',' + a * 0.55 + ')'], [1, 'rgba(' + R[2] + ',' + a * 0.3 + ')']]);
    poly(c, [w / 2 - t2, 0, w / 2 + t2, 0, w / 2 + b2, h, w / 2 - b2, h]); c.fill();
  }
}
const SPOT_TOP = 4, SPOT_BOT = 26;   // beam half widths in room units at the arch and on the floor
// ---- the band's world-drawn instruments, in dancer units about the player's feet (x toward the way it faces), baked
// at KIT_S and drawn at the dancer's scale. Boxes [x, y, w, h].
const KIT_S = 0.6;
// the kick drum, front on, standing in front of the drummer (its foot R - y below theirs): splayed brass spurs; the
// lacquered shell's depth showing on the far side; a dark shell band with brass lugs top and bottom (+ claw hooks on the
// sides) round a cream head; a black port hole low on the head and the band's logo (a velvet horned one-eyed monster)
const KICK_BOX = [-38, -44, 78, 64];
const KIT_DEF = { shell: '#2d1438', shellDeep: '#4a1d3e', band: '#2d1438', head: '#f6e7c8', ribbon: C.velvet, ribbonInk: '#3a0610', lug: C.brass, lugInk: C.brassInk,
  slab: '#262043', slabInk: '#0b0920', trim: '#ff3f86', knob: C.brass };
const KIT_TR = { R: 0, cy: 0 };
function paintKick(c, KC, theme) {
  KC = KC || KIT_DEF;
  const K = TUNE.kick, R = K.R, cy = -K.y, fy = R - K.y, band = 5.6, ink = '#140818';
  c.lineCap = 'round';
  // spurs: brass legs from the shell's lower flanks to the floor
  c.beginPath(); c.moveTo(-R * 0.72, cy + R * 0.5); c.lineTo(-R * 1.18, fy + 1); c.moveTo(R * 0.72, cy + R * 0.5); c.lineTo(R * 1.18, fy + 1);
  c.lineWidth = 4; c.strokeStyle = C.brassInk; c.stroke(); c.lineWidth = 2.2; c.strokeStyle = C.brass; c.stroke();
  c.fillStyle = '#2a1a06'; draw.ellipse(c, -R * 1.18, fy + 1.2, 2.6, 1.3); c.fill(); draw.ellipse(c, R * 1.18, fy + 1.2, 2.6, 1.3); c.fill();
  // the shell's depth: the far rim, offset up-right, joined to the front circle (a lacquered cylinder seen 3/4 on)
  const dx = 4.2, dy = -2.6;
  stk(c, cc => { cc.beginPath(); cc.arc(dx, cy + dy, R, -Math.PI * 0.75, Math.PI * 0.25); cc.arc(0, cy, R, Math.PI * 0.25, Math.PI * 1.25); cc.closePath(); },
    KC.shellDeep, ink, 2.2, 0.25, 0.3, [-R, cy - R + dy, R * 2 + dx, R * 2 - dy]);
  c.strokeStyle = 'rgba(255,190,220,0.35)'; c.lineWidth = 1.2;
  c.beginPath(); c.arc(dx, cy + dy, R - 1.6, -Math.PI * 0.6, -Math.PI * 0.12); c.stroke();
  // the front shell band (dark lacquer, a sheen across its top) + the cream head inside it
  stk(c, cc => draw.circle(cc, 0, cy, R), KC.shell, ink, 2.4, 0.42, 0.25);
  c.fillStyle = draw.radial(c, -R * 0.3, cy - R * 0.36, 1, R * 1.05, [[0, '#fffbf2'], [0.6, KC.head], [1, color.dark(KC.head, 0.14)]]);
  draw.circle(c, 0, cy, R - band); c.fill();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(60,30,20,0.75)'; c.stroke();
  // brass lugs on the band, top and bottom, and a claw hook on each side
  for (let i = 0; i < 6; i++) {
    const a = (i < 3 ? -Math.PI * 0.5 : Math.PI * 0.5) + ((i % 3) - 1) * 0.62, ca = Math.cos(a), sa = Math.sin(a);
    c.save(); c.translate(ca * (R - band * 0.5), cy + sa * (R - band * 0.5)); c.rotate(a + Math.PI / 2);
    stk(c, cc => draw.roundRect(cc, -2.4, -2.2, 4.8, 4.4, 1.3), KC.lug, KC.lugInk, 1.1, 0.55, 0.15);
    c.restore();
  }
  for (let s = -1; s <= 1; s += 2) stk(c, cc => draw.roundRect(cc, s * (R - band * 0.5) - 1.6, cy - 3.2, 3.2, 6.4, 1.2), '#c99838', C.brassInk, 1, 0.5, 0.15);
  // the port hole, low on the far side: a black hole in a brass ring
  const px = R * 0.44, py = cy + R * 0.4;
  stk(c, cc => draw.circle(cc, px, py, 4.6), '#b98a34', C.brassInk, 1, 0.5, 0.1);
  c.fillStyle = '#0d0612'; draw.circle(c, px, py, 3.2); c.fill();
  // the logo: a velvet swallowtail ribbon slung across the head (a band-name banner: wide and flat, so the head never
  // reads as a target) with a brass star in its middle and lettering dashes either side
  const ly = cy - 1.4, rw = R - band - 1.5;
  stk(c, cc => { cc.beginPath(); cc.moveTo(-rw, ly - 6.2); cc.quadraticCurveTo(0, ly - 9, rw, ly - 6.2); cc.lineTo(rw - 4, ly - 0.6); cc.lineTo(rw, ly + 5);
    cc.quadraticCurveTo(0, ly + 2.2, -rw, ly + 5); cc.lineTo(-rw + 4, ly - 0.6); cc.closePath(); },
    KC.ribbon, KC.ribbonInk, 1.5, 0.32, 0.2, [-rw, ly - 9, rw * 2, 14]);
  c.strokeStyle = 'rgba(255,214,140,0.85)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-rw + 5, ly - 5.4); c.quadraticCurveTo(0, ly - 7.8, rw - 5, ly - 5.4); c.stroke();
  c.strokeStyle = '#ffe3a0'; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-rw + 6.5, ly - 1.6); c.lineTo(-7, ly - 2.4); c.moveTo(7, ly - 2.4); c.lineTo(rw - 6.5, ly - 1.6); c.stroke();
  stk(c, cc => draw.star(cc, 0, ly - 2, 5.2, 0.48, 5), '#ffd166', '#5a3606', 1.1, 0.5, 0.1, [-5.2, ly - 7.2, 10.4, 10]);
  // gloss on the head
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, cy, R - band - 2.8, Math.PI * 1.1, Math.PI * 1.4); c.stroke();
  if (theme) { KIT_TR.R = R; KIT_TR.cy = cy; kitTrim(c, 'kick', theme, KIT_TR); }   // the outfit's motif on the kick
}
// the hi-hat on a thin tripod stand (origin = its foot on the floor), the lower cymbal baked; the top one ticks live
const HAT_BOX = [-17, -64, 34, 67], HATTOP_BOX = [-16, -4, 32, 8];
function paintHat(c) {
  const K = TUNE.kick, hy = -K.hatY;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, hy + 2); c.lineTo(0, -3); c.moveTo(0, -5); c.lineTo(-7, 1); c.moveTo(0, -5); c.lineTo(7, 1); c.moveTo(0, -5); c.lineTo(0, 1.5);
  c.lineWidth = 3; c.strokeStyle = '#0d0b26'; c.stroke(); c.lineWidth = 1.5; c.strokeStyle = '#8f8ab8'; c.stroke();
  stk(c, cc => draw.roundRect(cc, -1.6, hy + 12, 3.2, 4, 1), '#8f8ab8', '#0d0b26', 0.9, 0.5, 0.1);
  paintCymbal(c, 0, hy + 1.6, K.hatR, true);
}
function paintCymbal(c, x, y, r, under) {   // a flat brass ellipse with lathe rings and a bell (under = seen from below)
  stk(c, cc => draw.ellipse(cc, x, y, r, 2.8), '#e6b34c', C.brassInk, 1.4, 0.55, 0.2);
  c.strokeStyle = 'rgba(120,70,10,0.55)'; c.lineWidth = 0.6;
  c.beginPath(); c.ellipse(x, y, r * 0.62, 1.6, 0, 0, TAU); c.stroke();
  stk(c, cc => draw.ellipse(cc, x, y - (under ? -0.6 : 1), 3.4, 1.6), '#f2c867', C.brassInk, 0.9, 0.5, 0.1);
  c.fillStyle = 'rgba(255,250,220,0.9)'; draw.ellipse(c, x - r * 0.42, y - 0.9, r * 0.22, 0.6); c.fill();
}
// the keyboard on an X stand, front on, set in front of the keys player's belly: the key bed seen from just above (white
// keys with black-key notches in 2 + 3 groups), a dark lacquered front with an LED trim + knobs, crossed iron legs
const KEYS_BOX = [-46, -36, 92, 39];
function paintKeyboard(c, KC) {
  KC = KC || KIT_DEF;
  const Kb = TUNE.keys, x0 = Kb.x - Kb.w / 2, x1 = Kb.x + Kb.w / 2, top = Kb.top, bot = top + Kb.h, mid = (x0 + x1) / 2;
  // the X stand: two crossed legs from under the slab to the floor, a brass pivot, rubber feet
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(mid - Kb.w * 0.26, bot - 1); c.lineTo(mid + Kb.w * 0.3, 0); c.moveTo(mid + Kb.w * 0.26, bot - 1); c.lineTo(mid - Kb.w * 0.3, 0);
  c.lineWidth = 5; c.strokeStyle = '#0d0b26'; c.stroke(); c.lineWidth = 2.8; c.strokeStyle = '#4a4478'; c.stroke();
  c.lineWidth = 1; c.strokeStyle = 'rgba(200,196,255,0.5)';
  c.beginPath(); c.moveTo(mid - Kb.w * 0.26 + 0.6, bot - 1.6); c.lineTo(mid - 2, (bot - 1) * 0.5 - 1); c.stroke();
  stk(c, cc => draw.circle(cc, mid, (bot - 1) * 0.5, 2.4), C.brass, C.brassInk, 1.1, 0.5, 0.1);
  c.fillStyle = '#0d0b26'; draw.roundRect(c, mid - Kb.w * 0.3 - 4, -1.6, 8, 3.2, 1.4); c.fill(); draw.roundRect(c, mid + Kb.w * 0.3 - 4, -1.6, 8, 3.2, 1.4); c.fill();
  // the slab: dark lacquer, rounded, a cool sheen along the top edge
  stk(c, cc => draw.roundRect(cc, x0, top, Kb.w, Kb.h, 3.4), KC.slab, KC.slabInk, 2.4, 0.3, 0.25);
  // the key bed: white keys seen from above, black-key notches in 2 + 3 groups, a shadow line under the lip
  const kx0 = x0 + 4.5, kx1 = x1 - 4.5, ky = top + 2.2, kh = 6.4, n = 14, kw = (kx1 - kx0) / n;
  c.fillStyle = '#fffaf0'; c.strokeStyle = '#0b0920'; c.lineWidth = 1.1;
  c.beginPath(); c.rect(kx0, ky, kx1 - kx0, kh); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(40,30,60,0.55)'; c.lineWidth = 0.7; c.beginPath();
  for (let i = 1; i < n; i++) { const x = kx0 + i * kw; c.moveTo(x, ky + kh * 0.55); c.lineTo(x, ky + kh); }
  c.stroke();
  c.fillStyle = '#120e24';
  for (let i = 0; i < n - 1; i++) {
    if (KEY_BLACK[i % 7]) { draw.roundRect(c, kx0 + (i + 1) * kw - kw * 0.32, ky - 0.2, kw * 0.64, kh * 0.58, 0.6); c.fill(); }
  }
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(kx0 + 0.6, ky + kh - 1.3, kx1 - kx0 - 1.2, 0.8);
  // the front lip: an LED trim, two knobs and a row of status LEDs
  const fy = ky + kh + 2.2;
  c.strokeStyle = KC.trim; c.lineWidth = 1.3; c.globalAlpha = 0.95;
  c.beginPath(); c.moveTo(x0 + 3.5, bot - 1.8); c.lineTo(x1 - 3.5, bot - 1.8); c.stroke(); c.globalAlpha = 1;
  stk(c, cc => draw.circle(cc, x0 + 8, fy + 0.6, 1.7), KC.knob, C.brassInk, 0.8, 0.5, 0.1);
  stk(c, cc => draw.circle(cc, x0 + 13, fy + 0.6, 1.7), KC.knob, C.brassInk, 0.8, 0.5, 0.1);
  c.fillStyle = '#3df0ff'; c.fillRect(x1 - 15, fy, 2, 1.4); c.fillRect(x1 - 11.5, fy, 2, 1.4);
  c.fillStyle = '#ffc233'; c.fillRect(x1 - 8, fy, 2, 1.4);
}
const KEY_BLACK = [1, 1, 0, 1, 1, 1, 0];
// a sticker star for the celebration bursts (20 x 20)
function paintStarSticker(c, col) {
  stk(c, cc => draw.star(cc, 10, 10.4, 8.2, 0.48, 5), col, '#2a1030', 1.8, 0.45, 0.18, [1.8, 2.2, 16.4, 16]);
  c.fillStyle = 'rgba(255,255,255,0.9)'; draw.circle(c, 8, 7.4, 1.2); c.fill();
}
const STAR_F = [];
for (let i = 0; i < STAR_COL.length; i++) { const col = STAR_COL[i]; STAR_F.push(c => paintStarSticker(c, col)); }
function paintCannon(c) {   // 22 x 24, pivot (11, 22), barrel points up-right
  stk(c, cc => draw.roundRect(cc, 3, 15, 16, 8, 2.5), C.velvet, '#2a0410', 1.6, 0.3, 0.25);
  c.save(); c.translate(11, 16); c.rotate(0.62);
  stk(c, cc => draw.roundRect(cc, -3.6, -16, 7.2, 17, 3), C.brass, C.brassInk, 1.6, 0.45, 0.2);
  stk(c, cc => draw.roundRect(cc, -4.4, -16, 8.8, 3, 1.4), '#b37f2c', C.brassInk, 1.2, 0.3, 0.1);
  c.fillStyle = '#2a1a06'; draw.ellipse(c, 0, -16, 2.6, 1.1); c.fill();
  c.restore();
  stk(c, cc => draw.circle(cc, 11, 17, 2.6), '#b37f2c', C.brassInk, 1.2, 0.4, 0.1);
}

// ------------------------------------------------------------------------------------------------ the world
export function createWorld(opts) {
  opts = opts || {};
  const L = {
    lobby: !!opts.lobby, decor: clamp(opts.decor | 0, 0, 6), W: 390, H: 0, gen: -1, fontGen: -1, lang: '', st: 0, sb: 0,
    roof: 0, corner: 0, base: 0, curb: 0, alley: 0, vpY: 0, cityTop: 0, tower: [0, 0], antenna: [0, 0],
    win: { x: 0, y: 0, w: 0, h: 0 }, arch: 0, k: 1, RW: TUNE.room.RW, RH: 178, archR: 50, gk: 0,
    header: { x: 0, y: 0, w: 0, h: 0 }, door: { x: 0, y: 0, w: 0, h: 0 }, transom: 0, sconce: [0, 0], sconceOn: true, hang: 16,
    lamp: { x: 0, y: 0, base: 0 }, moon: { x: 0, y: 0, r: 0 },
    rope: { x1: 0, x2: 0, feet: 0, s: 1, fx: 0, ffeet: 0, fs: 1 }, lane: [0, 0, 0, 0, 0, 0],
    bulbs: { n: 0, xy: new Float32Array(64) },
    tiles: { n: 0, q: new Float32Array(64 * 8), parity: new Uint8Array(64), cx: new Float32Array(64), cy: new Float32Array(64), w: new Float32Array(64) },
    room: { fb: 130, stage0: 24, stage1: 250, feet: [0, 0, 0, 0], chandY: 0, chandX: 137, chain: 14, discoX: 200, discoY: 6, cord: 16,
      boothTop: 0, djTop: 0, picX: 40, picY: 56, neonX: 236, neonY: 70, lampX: 250, lampY: 154,
      cannons: [26, 172, 248, 172], chandS: 1, banY: 0, banMode: 1, riser: [0, 0, 0, 0], cx: 137, cy: 160, cs: 0.4 },
    coneX0: 0, coneY0: 0, spillX0: 0, title: '', clip: null, sq: 0, side: 0, qs: null,
    poolL: [0, 0, 1, 1], poolD: [0, 0, 1, 1],
    // cropped front sprites: boxes [x, y, w, h] in design units
    rays: [0, 0, 1, 1], ivy: [0, 0, 1, 1], shrubL: [0, 0, 1, 1], shrubR: [0, 0, 1, 1], ivyLen: 92, shrubY: 0, fairy: new Float32Array(16),
    // the look in force (resolveLook): the club theme recipe, the rope + door skins, the per-species band outfits
    th: THEMES.house, ropeSkin: 'velvet', doorSkin: 'brass', lookGen: -1,
  };
  // this world's own look (setLook; on = it overrides the shared one) and a timed preview (previewLook)
  const OWN = { on: false, club: 'club.house', rope: 'rope.velvet', door: 'door.brass', plate: 'plate.classic', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
  const PV = { on: false, until: 0, club: 'club.house', rope: 'rope.velvet', door: 'door.brass', plate: 'plate.classic', outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
  const OUTF = { blob: '', tall: '', round: '', square: '', bean: '' };   // the outfit theme each species' dancers wear
  const MYKEYS = new Set();
  WSETS.push(MYKEYS);
  const SP = {};   // baked sprites for the current layout
  // bake functions are made once per world (the per-frame path never builds closures)
  const F = {
    bg: c => paintBg(c, L),
    roomBack: c => { c.scale(L.k, L.k); paintRoomBack(c, L); },
    roomFront: c => { c.scale(L.k, L.k); paintRoomFront(c, L); },
    overlay: c => paintOverlay(c, L),
    leaf: c => paintLeaf(c, L),
    rays: c => paintRays(c, L),
    ivy: c => paintIvy(c, L),
    shrubL: c => paintShrub(c, L, 0),
    shrubR: c => paintShrub(c, L, 1),
    cone: (c, w, h) => paintCone(c, L, w, h),
    spill: (c, w, h) => paintSpill(c, L, w, h),
    stanchion: c => paintStanchion(c, L.ropeSkin),
    fx: c => paintFxSprite(c, L, L.th),
    number: (c, w, h) => paintNumber(c, w, h),
    bulb: (c, w) => paintBulb(c, w, BULB_COL[L.th.bulb] || BULB_COL.amber),
    smoke: (c, w) => paintSoft(c, w, '#8a7f9e', 0.75),
    chand: c => { c.scale(L.k, L.k); paintChandelierTheme(c, L.th); },
    standLamp: c => { c.scale(L.k, L.k); paintStandLamp(c); },
    picture: c => { c.scale(L.k, L.k); paintRoomPicture(c, L.th); },
    dj: c => { c.scale(L.k, L.k); paintDJ(c, L.th); },
    djHat: c => { c.scale(L.k, L.k); c.translate(-DJ_HAT_BOX[0], -DJ_HAT_BOX[1]); paintDJHat(c, L.th); },
    booth: c => { c.scale(L.k, L.k); paintBooth(c); },
    disco0: c => { c.scale(L.k, L.k); paintDisco(c, 0); },
    disco1: c => { c.scale(L.k, L.k); paintDisco(c, 1); },
    disco2: c => { c.scale(L.k, L.k); paintDisco(c, 2); },
    neon: c => { c.scale(L.k, L.k); paintRoomSign(c, L.th, draw.res() * L.k); },
    cannon: c => { c.scale(L.k, L.k); paintCannon(c); },
    spot: (c, w, h) => paintSpot(c, w, h),
    sweep: (c, w, h) => paintSpot(c, w, h, SPOT_PINK),
    sweepGold: (c, w, h) => paintSpot(c, w, h, SPOT_GOLD),
    kick: c => { c.scale(KIT_S, KIT_S); c.translate(-KICK_BOX[0], -KICK_BOX[1]); paintKick(c, null, ''); },
    hat: c => { c.scale(KIT_S, KIT_S); c.translate(-HAT_BOX[0], -HAT_BOX[1]); paintHat(c); },
    hatTop: c => { c.scale(KIT_S, KIT_S); c.translate(-HATTOP_BOX[0], -HATTOP_BOX[1]); paintCymbal(c, 0, 0, TUNE.kick.hatR, false); },
    keys: c => { c.scale(KIT_S, KIT_S); c.translate(-KEYS_BOX[0], -KEYS_BOX[1]); paintKeyboard(c, null); },
    pool: (c, w, h) => paintPool(c, w, h, C.amber),
  };
  SP.stars = [];

  // ---- live state
  let t = 0, beatFn = typeof opts.beat === 'function' ? opts.beat : null, lastBeat = -1;
  let doorAng = 0, doorFlash = 0, lampFlick = 1, doorPopT = -1, rainT = -1;
  const DA = { on: false, t: 0, dur: 1, from: 0, to: 0, ease: easeIndex.outBack };
  const RP = { d: 0, v: 0, fd: 0, fv: 0 };                 // rope sag springs (back run, front segment)
  const CH = { a: 0, v: 0 };                               // chandelier pendulum
  const PT = { a: TUNE.picture.tilt[0], v: 0 };            // picture tilt spring
  const LF = { t: -1, a: 0, down: false, lit: 1, dx: 0, dy: 0, hit: false };   // standing lamp fall (dx / dy = its foot's skid)
  const GL = { v: 0 };                                     // DJ glare 0..1
  const LSH = { x: 0, y: 0 };                              // the fallen lamp's shade (reused)
  let level = 0, celebT = 9, roomDim = 1, smokeAcc = 0, cannonKick0 = 0, cannonKick1 = 0, discoSpin = 1, blinkT = 2.4, blink = 0, warmT = 0;
  // LAST CALL's encore: the beat it lands on (-1 = none due), a seconds fallback, s since it landed; the beat clock's
  // measured rate (beats / s) and last reading, so celebrate() can tell the scene when it lands
  let encBeat = -1, encWait = -1, encT = 9, beatRate = TUNE.bpm / 60, prevBt = -1;
  // LAST CALL's tier (celebrate(tier)): -1 none since the last reset, 0 rope (a fail: the muted ending), 1 silver /
  // bronze, 2 gold; goldShare = the share of confetti pieces dealt gold / cream (a gold night)
  let cm = -1, goldShare = 0;
  let shutT = -1, shutN = 0;                              // SHUT DOWN clock (-1 = open) + how many marquee bulbs have died
  let djPopped = false, djFlashT = 0;                     // SHUT DOWN: the DJ booth's light has popped + its flash clock
  let specPh = 0, discoPh = 0, midSeen = false;           // disco phases integrate dt * discoSpin (no jumps when it ramps)
  // wrong-admit beats: bulbs blackout clock, red glass pulse, disco spin-back hold, floor tile blackout; DJ platter phase
  let bulbOffT = 0, redT = 0, spinHold = 0, tileHold = 0, platPh = 0, platSpin = 1;
  const SPOT = { t: -1, hold: false, slot: -1, a: 0, d: null };   // unlock spotlight: t = ceremony clock (-1 idle), a = cone 0..1, d = the newcomer it follows
  const SG = { ax: 0, ay: 0, tx: 0, ty: 0, len: 1, th: 0, ct: 1, st: 0 };   // its geometry (reused)
  // the decor reveal (setDecor up; TUNE.decorReveal): lv = the level whose piece enters, from = lv - 1 (OLD = the room's
  // sprites baked at it, split against the new ones while the piece comes in), wait = s before it starts (held while an
  // unlock ceremony runs), t = s since it started (-1 while waiting), full = with the room dim (the lobby), a = the dim /
  // light pool envelope 0..1, fired = which spots have landed (bits), trail = the garland's sparkle trail clock
  const DR = { on: false, lv: 0, from: 0, wait: 0, t: -1, full: false, a: 0, fired: 0, trail: 0 };
  const OLD = { roomBack: null, roomFront: null, overlay: null };
  const FOC = { n: 1, x0: 0, y0: 0, x1: 0, y1: 0, rx: 1, ry: 1 };   // the piece's spot(s) (room units): revealFocus()
  const REV = { on: false, lv: 0, t: -1, land: 0, x: 0, y: 0 };      // world.reveal (design units)
  const tileV = new Float32Array(64), tileC = new Uint8Array(64);
  const glint = new Float32Array(6);
  const SPECK = new Float32Array(TUNE.specks * 5);         // x phase, y (0..1), speed, size, colour index
  for (let i = 0; i < TUNE.specks; i++) {
    SPECK[i * 5] = Math.random(); SPECK[i * 5 + 1] = Math.random(); SPECK[i * 5 + 2] = 0.05 + Math.random() * 0.06;
    SPECK[i * 5 + 3] = 1.6 + Math.random() * 1.8; SPECK[i * 5 + 4] = (Math.random() * 3) | 0;
  }
  const TW = new Float32Array(16 * 4);                    // twinkle stars x, y, phase, rate
  let twN = 0;
  const MOTH = new Float32Array(TUNE.lamp.moths * 3);
  for (let i = 0; i < TUNE.lamp.moths; i++) { MOTH[i * 3] = Math.random() * TAU; MOTH[i * 3 + 1] = 1.4 + Math.random() * 1.6; MOTH[i * 3 + 2] = Math.random() * 100; }

  // window particle pool (room units): 0 confetti, 1 sparkle, 2 smoke, 3 spark, 4 colour dash (a pop-in ring; col = hex),
  // 5 sticker star (c = STAR_COL index)
  const PP = [];
  for (let i = 0; i < TUNE.maxParticles; i++) PP.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, c: 0, ph: 0, col: '#fff' });
  let ppNext = 0, ppCount = 0;
  function spawn(k, x, y, vx, vy, life, s, ci) {
    const p = take(PP, ppNext);
    ppNext = takeNext;
    p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.life = life; p.s = s; p.c = ci;
    p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 12; p.ph = Math.random() * TAU;
    return p;
  }
  // street pool (design units, drawn by drawFront without the window clip): 0 confetti rectangle, 1 curled ribbon,
  // 2 sticker star, 3 sparkle — the LAST CALL burst out over the facade and the street, and the ADMIT door pop.
  // d0 = its drag at birth (ramps to celebrate.drag[1]); stick = may come to rest on the rope / a stanchion ball; rest =
  // seconds left resting there (-1 = falling), rw = what it rests on (0 the back rope run, 1 the front segment, 2.. the
  // stanchion balls), flat = its frozen flutter while it rests
  const SPP = [];
  for (let i = 0; i < TUNE.maxStreet; i++) {
    SPP.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, rot: 0, vr: 0, c: 0, ph: 0, col: '#fff', d0: 0.7, stick: false,
      rest: -1, rw: 0, flat: 1 });
  }
  let sppNext = 0, sppCount = 0, takeNext = 0;
  function take(pool, next) {   // the next free particle (or the oldest slot when full); sets takeNext
    const n = pool.length;
    for (let i = 0; i < n; i++) { const j = (next + i) % n; if (!pool[j].on) { takeNext = (j + 1) % n; return pool[j]; } }
    takeNext = (next + 1) % n;
    return pool[next];
  }
  function spawnStreet(k, x, y, vx, vy, life, s, ci) {
    const p = take(SPP, sppNext);
    sppNext = takeNext;
    p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.life = life; p.s = s; p.c = ci;
    p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * (k === 2 ? 9 : 14); p.ph = Math.random() * TAU;
    p.d0 = TUNE.celebrate.drag[0]; p.stick = false; p.rest = -1;
    return p;
  }
  // a LAST CALL confetti piece / ribbon (size from celebrate.size; a `stick` share may rest on the rope)
  function spawnConf(x, y, vx, vy, d0) {
    const CB = TUNE.celebrate, life = CB.life, sz = CB.size;
    const p = spawnStreet(Math.random() < CB.ribbon ? 1 : 0, x, y, vx, vy, life[0] + Math.random() * (life[1] - life[0]),
      sz[0] + Math.random() * (sz[1] - sz[0]), confCol());
    p.d0 = d0; p.stick = Math.random() < CB.stick;
    return p;
  }
  // a confetti colour (CONF index): a gold night deals goldShare of them gold (0) or cream (4)
  function confCol() {
    if (goldShare > 0 && Math.random() < goldShare) return Math.random() < 0.7 ? 0 : 4;
    return (Math.random() * CONF.length) | 0;
  }
  // what a resting piece lies on: the y of the rope's top at x (design units) on run 0 (back) / 1 (the front segment),
  // following its live sag, or the top of stanchion ball rw - 2; NaN when x is off it
  const ROPE_TH = 3.9;
  function restY(rw, x) {
    const R = L.rope, hk = TUNE.stanchion.foot - TUNE.stanchion.hook, ball = TUNE.stanchion.foot - 9.5;
    if (rw >= 2) {
      const i = rw - 2, bx = i === 0 ? R.x1 : i === 1 ? R.x2 : R.fx, s = i === 2 ? R.fs : R.s, f = i === 2 ? R.ffeet : R.feet;
      return Math.abs(x - bx) < 4.5 * s ? f - ball * s - 5.6 * s : NaN;
    }
    let x1, y1, x2, y2, sag, s;
    if (rw === 0) { s = R.s; x1 = R.x1 + 3 * s; x2 = R.x2 - 3 * s; y1 = y2 = R.feet - hk * s; sag = TUNE.rope.sag + RP.d; }
    else { s = (R.s + R.fs) * 0.5; x1 = R.x2 + 2 * R.s; y1 = R.feet - hk * R.s; x2 = R.fx - 3 * R.fs; y2 = R.ffeet - hk * R.fs; sag = TUNE.rope.fsag + RP.fd; }
    if (x < x1 || x > x2) return NaN;
    const u = (x - x1) / (x2 - x1), my = (y1 + y2) * 0.5 + sag * 2;
    return (1 - u) * (1 - u) * y1 + 2 * u * (1 - u) * my + u * u * y2 - ROPE_TH * s;
  }
  // a sticky falling piece that crossed the rope (or a stanchion ball) between py and its new y comes to rest on it; the
  // back run and its two stanchions stand behind the front guest, so nothing rests on them where that guest stands
  function tryRest(p, py) {
    const CB = TUNE.celebrate, s0 = slots[0], behind = Math.abs(p.x - s0.x) < 62 * s0.scale;
    for (let rw = 4; rw >= 0; rw--) {
      if (behind && rw !== 1 && rw !== 4) continue;
      const y = restY(rw, p.x);
      if (!(y === y) || py > y || p.y < y) continue;
      p.rest = CB.rest[0] + Math.random() * (CB.rest[1] - CB.rest[0]); p.rw = rw; p.y = y;
      p.vx = 0; p.vy = 0; p.vr = 0; p.rot = (Math.random() - 0.5) * 0.5;
      p.flat = p.k === 0 ? 0.55 + Math.random() * 0.35 : p.t * 10 + p.ph;
      p.life = Math.max(p.life, p.t + p.rest + 0.9);
      return;
    }
  }

  // dancers
  const dancers = [];
  const NS = Math.max(TUNE.room.slots.length, TUNE.room.lobbySlots.length);
  const slotUsed = new Int8Array(NS);
  const SX = new Float32Array(NS), SY = new Float32Array(NS), SS = new Float32Array(NS), SR = new Int8Array(NS);   // slot x, feet y, scale, row
  const AO = { alpha: 1, dim: 0, flip: false, light: { door: 0.3, lamp: 0 } };
  const TMP = { species: 'blob', color: 'coral', eyes: 2, hat: 'none', tail: false, pattern: 'none', fake: { eyes: 0, hat: false, tail: false }, outfit: '' };
  let seq = 0, nSlots = TUNE.room.slots.length;
  // does a member on slot si play its instrument? The lobby's House Band all do; in play only the stage row (row 1) is
  // the band, the floor + front rows are the hands-free crowd (TUNE.room.floorFree)
  function plays(si) { return L.lobby || !TUNE.room.floorFree || SR[si] === 1; }
  // a wrong admit startles the band: flinch (the instrument drops), then back to playing (it pops back in); once the room
  // is SHUT (level 3) they slump instead (sad: no instruments, no groove) until reset(). band: plays its instrument
  // (undefined: looked up from the actor's dancer record)
  function settle(a, band) {
    if (level >= 3) { a.setState('sad', SAD); return; }
    if (band === undefined) {
      band = true;
      for (let i = 0; i < dancers.length; i++) if (dancers[i].actor === a) { band = dancers[i].band; break; }
    }
    a.setState('dance', danceFor(a.spec.species, band));
  }
  function afterFlinch(a, cancelled) { if (!cancelled) settle(a); }
  const FLINCH = { onDone: afterFlinch };
  // a member whose slot changed rows (a tall's swap, a re-layout) picks up / puts down its instrument and kit; in play a
  // guest stepping onto the stage puts on the band's outfit and one stepping down into the crowd takes it off (a sparkle)
  function setRole(d) {
    const band = plays(d.slot), kit = band ? d.kit0 : 0;
    if (band === d.band && kit === d.kit) return;
    d.band = band; d.kit = kit;
    if (!L.lobby && d.fixed && d.uni !== band) {
      d.uni = band; dressDancer(d);
      if (L.gen === GEN) kitOf(d);
      if (d.wait <= 0) burstSparkle(d.x, d.y - 14, 6);
    }
    if (d.actor.state === 'dance') settle(d.actor, band);
  }
  // the crowd silhouette along the sill (play; TUNE.crowd): per place i its fill / rim colour, species shape, hat and
  // age (s since it rose in); crowdN places are filled, crowdNext = the oldest once all max are
  const CRW = { fill: [], rim: [], sp: new Uint8Array(16), hat: new Uint8Array(16), age: new Float32Array(16) };
  let crowdN = 0, crowdNext = 0;
  // the footprint of the rule poster at scale 1 the layout clears (read from icons.js in layout())
  const posterBox = { w: TUNE.poster.w, foot: TUNE.poster.foot };

  // public reused objects
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push({ x: 0, feetY: 0, scale: 1, dim: 0, light: { door: 0, lamp: 0 } });
  const rope = { x1: 0, x2: 0, y: 0, top: 0, on: true };
  const door = { x: 0, y: 0, w: 0, h: 0, open: 0 };
  const poster = { x: 0, y: 0, scale: 1 };
  const win = { x: 0, y: 0, w: 0, h: 0, arch: 0 };
  const LT = { door: 0, lamp: 0 };

  // ---------------------------------------------------------------- layout + bakes
  // the rule poster's footprint (icons.js): posterBox() when it exports one, and the widest card x the deepest foot of
  // posterMetrics over 1..3 clauses; the larger of the two (so no card the scene can nail ever reaches a guest)
  function readPosterBox() {
    let w = 0, f = 0;
    if (typeof ICONS.posterBox === 'function') {
      const b = ICONS.posterBox();
      if (b && b.w > 0 && b.foot > 0) { w = b.w; f = b.foot; }
    }
    let hang = 0;
    if (typeof ICONS.posterMetrics === 'function') {
      for (let i = 0; i < POSTER_RULES.length; i++) {
        const m = ICONS.posterMetrics(POSTER_RULES[i]);
        if (m && m.w > w) w = m.w;
        if (m && m.foot > f) f = m.foot;
        if (m && m.hang > hang) hang = m.hang;
      }
    }
    const RS = TUNE.poster.reserve;
    posterBox.w = Math.max(w > 0 ? w : TUNE.poster.w, RS[0]); posterBox.foot = Math.max(f > 0 ? f : TUNE.poster.foot, RS[1]);
    L.hang = hang > 0 ? hang : 16;   // the strings' drop from the nail to the card's top edge (scale 1)
  }
  function layout() {
    const W = stage.w, H = stage.h, lob = L.lobby;
    L.W = W; L.H = H; L.gen = GEN; L.fontGen = FONT_GEN; L.lang = i18n.lang; L.st = stage.safeTop; L.sb = stage.safeBottom;
    const T = lob ? TUNE.lobby : TUNE.play;
    // squeeze factor for short stages (0 at H >= squeezeH .. 1 at 700); lobby frames never squeeze
    const sq = lob ? 0 : clamp((T.squeezeH - H) / (T.squeezeH - 700), 0, 1);
    L.sq = sq;
    let doorW = T.door[1];
    if (!lob) {
      L.roof = T.roof; L.corner = T.corner; L.base = Math.round(H - lerp(T.base[0], T.base[1], sq));
      L.win.x = T.win[0]; L.win.y = T.winY; L.win.w = T.win[1]; L.win.h = Math.round(lerp(T.winH[0], T.winH[1], sq)); L.arch = lerp(T.arch[0], T.arch[1], sq);
      L.header.x = T.header[0]; L.header.y = L.win.y + L.win.h; L.header.w = T.header[1]; L.header.h = Math.round(lerp(T.headerH[0], T.headerH[1], sq));
      doorW = Math.round(lerp(T.door[1], T.door[2], sq));
    } else {
      // anchored from the bottom: the marquee header ends `foot` above the safe bottom (just over home's PLAY button),
      // the window (grown on tall phones) stands on it, the cornice winGap above its arch
      const gk = clamp((H - T.growH[0]) / (T.growH[1] - T.growH[0]), 0, 1);
      L.corner = T.corner; L.base = Math.round(H * T.base);
      L.header.h = T.headerH; L.header.y = Math.round(H - L.sb - T.foot - T.headerH);
      L.win.x = T.winX; L.win.w = T.winW; L.win.h = Math.round(H * T.winH * lerp(T.grow[0], T.grow[1], gk)); L.arch = T.arch;
      L.win.y = L.header.y - L.win.h; L.roof = L.win.y - T.winGap;
      L.header.x = T.headerX; L.header.w = W - T.headerX * 2;
    }
    L.curb = L.base + (lob ? 26 : 30); L.alley = L.base - 24; L.vpY = L.base - 260; L.cityTop = L.roof - (lob ? 70 : 34);
    L.tower[0] = W * 0.24; L.tower[1] = L.cityTop + 12; L.antenna[0] = W * 0.76; L.antenna[1] = L.cityTop - 16;
    const hb = L.header.y + L.header.h;
    // the door hangs from doorGap under the header (its brass frame top at y - 12 never touches the marquee) and is
    // never taller than its max; narrower when squeezed so a short door still reads as a door
    const dTop = Math.max(hb + T.doorGap, L.base - T.door[3]);
    L.door.x = T.door[0]; L.door.w = doorW; L.door.y = dTop; L.door.h = L.base - dTop;
    L.transom = dTop - 12 - hb;
    const SC = TUNE.sconce;   // on the left jamb (layoutSlots may move it to the right one or leave it out)
    L.sconce[0] = L.door.x + SC.dx; L.sconce[1] = L.door.y + SC.dy; L.sconceOn = !lob;
    const lan = lob ? T.lantern : lerp(T.lantern[0], T.lantern[1], sq);
    L.lamp.x = lob ? T.lampX : TUNE.lamp.x; L.lamp.base = L.base + 2; L.lamp.y = Math.max(L.roof + 40, L.base - lan);
    if (lob) {   // high in the right corner, its disc kept titleGap above the neon title's letters (smaller at 16:9)
      const top = L.st, ty = Math.max(top + 54, (top + L.win.y) * 0.5 + 2) - T.titleHalf, gk = clamp((H - T.growH[0]) / (T.growH[1] - T.growH[0]), 0, 1);
      L.moon.r = Math.round(lerp(T.moon[2] * 0.75, T.moon[2], gk)); L.moon.x = Math.round(W * T.moon[0]);
      L.moon.y = Math.round(Math.min(top + T.moon[1], ty - T.titleGap - L.moon.r));
    } else { L.moon.x = T.moon[0]; L.moon.y = T.moon[1]; L.moon.r = T.moon[2]; }
    // the rope + queue lane (play rows hang off the facade base)
    const RT = TUNE.rope, B = L.base;
    const P = TUNE.play, LN = TUNE.lane;
    L.rope.x2 = RT.x2; L.rope.feet = B + lerp(P.ropeFeet[0], P.ropeFeet[1], sq); L.rope.s = RT.s;
    L.rope.fx = RT.fx; L.rope.ffeet = B + lerp(P.ffeet[0], P.ffeet[1], sq); L.rope.fs = lerp(P.fs[0], P.fs[1], sq);
    L.lane[2] = LN.near; L.lane[3] = B + lerp(P.laneNear[0], P.laneNear[1], sq); L.lane[4] = LN.hwFar; L.lane[5] = LN.hwNear;
    // light pools on the cobbles: the lamp's (cool) and the door's (amber)
    box4(L.poolL, L.lamp.x + 56, L.curb + 36, 124, 36);
    if (lob) box4(L.poolD, -1e4, -1e4, 1, 1);   // the lobby has no door (and no amber pool)
    else box4(L.poolD, L.door.x + L.door.w * 0.42, L.curb + 18, 104, 36);
    // room geometry
    L.k = L.win.w / TUNE.room.RW; L.RW = TUNE.room.RW; L.RH = L.win.h / L.k; L.archR = L.arch / L.k;
    const R = L.room, RT2 = TUNE.room, RH = L.RH, extra = Math.max(0, RH - 178), short = clamp((178 - RH) / 50, 0, 1), GA = RT2.garland;
    L.gk = lob ? 0 : clamp((GA.RH[0] - RH) / (GA.RH[0] - GA.RH[1]), 0, 1);   // the short-room garland (up in the fanlight)
    R.fb = RH - lerp(RT2.floor, RT2.floorMin, short); R.stage0 = RT2.stage[0]; R.stage1 = RT2.stage[1];
    R.feet[0] = R.fb - RT2.riser; R.feet[1] = R.fb + 1; R.feet[2] = RH - RT2.lift; R.feet[3] = RH - RT2.front;
    R.chandX = L.RW / 2; R.chandY = 0; R.chain = Math.max(3, 12 + extra * 0.55 + Math.min(0, RH - 178) * 0.25);
    R.chandS = lerp(1, RT2.chandMin, short);
    R.discoX = 202; R.discoY = archTopR(202) + 1; R.cord = 14 + extra * 0.5 - 10 * L.gk;   // short rooms: the ball rides above the bunting
    R.boothTop = R.fb - 23; R.djTop = R.fb - 62;
    R.picX = 40; R.picY = Math.max(archTopR(40) + 4, R.fb - (lob ? 104 : 76)); R.neonX = 236; R.neonY = Math.max(archTopR(236) + 24, R.fb - 60);
    R.lampX = RT2.lamp.x; R.lampY = RH - RT2.lamp.base;
    R.cannons[0] = 28; R.cannons[1] = RH - 3; R.cannons[2] = L.RW - 28; R.cannons[3] = RH - 3;
    // the banner (decor 4) hangs raised under the arch when it fits between the chandelier's crystals and the DJ's horns,
    // else (short rooms) on the stage lip
    const chandBot = R.chain + 29.4 * R.chandS + 3, djClear = R.djTop + 1 - BANNER.h - 2;
    R.banY = clamp(L.archR - 4.5, chandBot, djClear); R.banMode = chandBot <= djClear ? 1 : 2;
    const RS = lob ? RT2.lobbySlots : RT2.slots, fk = lerp(1, RT2.shortK, short), sk = lerp(1, RT2.shortStage, short);
    // play caps the window (8 = 4 band + 4 crowd, the 16:9 letterbox room too) so every member keeps its face and
    // instrument in view; past the cap the oldest joins the crowd silhouette at the sill
    nSlots = lob ? RS.length : Math.min(RS.length, RH < RT2.shortRH ? RT2.capShort : RT2.cap);
    R.riser[0] = 1e4; R.riser[1] = -1e4; R.riser[2] = 1e4; R.riser[3] = -1e4;
    for (let i = 0; i < RS.length; i++) {
      const s = RS[i];
      SX[i] = s[0]; SY[i] = R.feet[s[1]] + s[2]; SS[i] = s[3] * (s[1] >= 2 ? fk : s[1] === 1 ? sk : 1); SR[i] = s[1];
      if (s[1] === 0) {   // the riser blocks span their dancers
        const j = s[0] < L.RW / 2 ? 0 : 2;
        R.riser[j] = Math.min(R.riser[j], s[0] - 22); R.riser[j + 1] = Math.max(R.riser[j + 1], s[0] + 22);
      }
    }
    // the unlock ceremony spot: centre stage, in front of the DJ, on the front row's line
    R.cx = L.RW / 2; R.cy = R.feet[3]; R.cs = SS[4] * TUNE.unlock.K;
    fitBand();
    buildTiles();
    buildTwinkles();
    // the clip path (screen units)
    const p = new Path2D(); archPath(p, L.win.x, L.win.y, L.win.w, L.win.h, L.arch); L.clip = p;
    // the room's banner: the club's name on the street; in the lobby (under the giant MONSTER BOUNCER lockup) it names the act
    const tk = lob ? 'band' : 'title';
    L.title = i18n.t(tk); if (L.title === tk) L.title = lob ? 'HOUSE BAND' : 'MONSTER BOUNCER';
    else if (!i18n.isRTL) L.title = L.title.toUpperCase();
    // public objects
    win.x = L.win.x; win.y = L.win.y; win.w = L.win.w; win.h = L.win.h; win.arch = L.arch;
    door.x = L.door.x; door.y = L.door.y; door.w = L.door.w; door.h = L.door.h;
    if (lob) { poster.x = L.header.x + L.header.w / 2; poster.y = L.header.y + L.header.h - 6; poster.scale = 1; }
    else { poster.y = L.header.y + P.nailDy; poster.scale = lerp(P.posterS[0], P.posterS[1], sq); readPosterBox(); }
    layoutSlots(B, sq, lob);
    if (!lob && L.side) {
      // side by side the card's corner reaches over the quoins: the lantern rides up so its wall plate ends `clear` above
      // the card's top edge (and the corner tape on it) and it lights the poster from beside it
      const LP = TUNE.lamp, top = poster.y + L.hang * poster.scale;
      L.lamp.y = Math.max(L.roof + 40, Math.min(L.lamp.y, top - LP.clear - (LP.plate - 9) + LP.arm));
    }
    buildBulbs();
    const ST = TUNE.stanchion, hk = (ST.foot - ST.hook);
    L.rope.x1 = P.ropeX1[L.side];
    rope.x1 = L.rope.x1; rope.x2 = L.rope.x2; rope.top = L.rope.feet - hk * RT.s; rope.y = rope.top + RT.sag; rope.on = !lob;
    bake();
  }
  // the 4 guest slots: the front guest as big as the tallest guest allows next to / under the widest poster (GAME-SPEC
  // §1 fairness: every guest decidable from what is on screen), the queue on §1's steps, shrunk to clear the poster too
  function layoutSlots(B, sq, lob) {
    const P = TUNE.play, PS = posterBox, pt = poster.y, ps0 = poster.scale;
    const fy = B + lerp(P.front[0], P.front[1], sq), hi = lerp(P.sMax[0], P.sMax[1], sq);
    // the free wall the card hangs on: from posterL off the building's left edge to posterGap short of the door's brass
    // frame (x - 13: its lintel's end; the sconce rides on the jamb)
    const wallR = L.door.x - 13 - P.posterGap;
    // stacked: the largest card <= posterS that fits the wall, as close to posterX[0] as the wall allows
    const psA = lob ? ps0 : Math.max(P.posterMin, Math.min(ps0, (wallR - P.posterL[0]) / PS.w)), hwA = PS.w * 0.5 * psA;
    const xA = lob ? poster.x : clamp(P.posterX[0], P.posterL[0] + hwA, Math.max(P.posterL[0] + hwA, wallR - hwA));
    const sA = fitScale(P.frontX[0], fy, P.sMin, hi, xA - hwA, xA + hwA, pt, pt + PS.foot * psA);
    // side by side: the largest card <= posterS (its left edge at posterL[1]) next to which the guest keeps sideS (or hi
    // when that is lower), the guest stepping right from frontX[1] up to gMax (its widest band clear of the big
    // foreground stanchion's post)
    let psB = ps0, xB = P.posterX[1], gB = P.frontX[1], sB = 0;
    if (!lob) {
      const want = Math.min(P.sideS, hi), gMax = Math.max(P.frontX[1], Math.floor(L.rope.fx - 6 * L.rope.fs - ENV_HALF * want - 2));
      for (psB = ps0; psB > P.posterMin; psB -= 0.01) {
        const hw = PS.w * 0.5 * psB;
        xB = Math.min(Math.max(P.posterX[1], P.posterL[1] + hw), Math.max(P.posterL[1] + hw, wallR - hw));
        gB = sideGuest(gMax, fy, want, xB - hw, xB + hw + P.sideGap, pt, pt + PS.foot * psB);
        if (gB > 0) break;
      }
      psB = Math.max(P.posterMin, psB);
      const hw = PS.w * 0.5 * psB;
      xB = Math.min(Math.max(P.posterX[1], P.posterL[1] + hw), Math.max(P.posterL[1] + hw, wallR - hw));
      if (!(gB > 0)) gB = gMax;
      sB = clearOf(gB, fy, want, xB - hw, xB + hw + P.sideGap, pt, pt + PS.foot * psB) ? want
        : Math.min(want, fitScale(gB, fy, P.sMin, hi, xB - hw, xB + hw + P.sideGap, pt, pt + PS.foot * psB));
    }
    // stacked when it keeps the guest at stackMin (or side by side does no better); the lobby keeps its header poster
    const side = !lob && sA < P.stackMin && sB > sA ? 1 : 0, s0 = side ? sB : sA;
    L.side = side;
    if (!lob) { poster.x = side ? xB : xA; poster.scale = side ? psB : psA; }
    const ps = poster.scale, hw = PS.w * 0.5 * ps, pb = pt + PS.foot * ps;
    const pl = poster.x - hw, pr = poster.x + hw;
    const o = slots[0];
    o.x = side ? gB : P.frontX[0]; o.feetY = fy; o.scale = s0; o.dim = TUNE.slots.dim[0];
    for (let i = 1; i < 4; i++) {
      const q = slots[i], x = TUNE.slots.x[i - 1], qy = B + lerp(P.queue[i - 1][0], P.queue[i - 1][1], sq), want = s0 * P.qStep[i - 1];
      q.x = x; q.feetY = qy; q.dim = TUNE.slots.dim[i];
      q.scale = fitScale(x, qy, want * P.qFloor, want, pl, pr, pt, pb);
    }
    // the door's sconce: on the left jamb unless the front guest's head could reach it there, then on the right jamb
    // when that is on stage, else left out (nothing ever pokes out from behind the rope guest's head)
    if (!lob) {
      const SC = TUNE.sconce, sy = L.sconce[1], top = sy - SC.top, bot = sy + SC.bot;
      let sx = L.sconce[0];
      if (!clearOf(o.x, o.feetY, o.scale, sx - SC.hw, sx + SC.hw, top, bot)) {
        sx = L.door.x + L.door.w - SC.dx;
        L.sconceOn = sx + SC.hw <= L.W - 1 && clearOf(o.x, o.feetY, o.scale, sx - SC.hw, sx + SC.hw, top, bot);
      }
      L.sconce[0] = sx;
    }
    // the lane carpet starts just behind the last queue row and runs along the line to the rope
    const q3 = slots[3], q2 = slots[2], ux = q3.x - q2.x, uy = q3.feetY - q2.feetY, ul = Math.sqrt(ux * ux + uy * uy) || 1;
    L.lane[0] = q3.x + ux / ul * TUNE.lane.back; L.lane[1] = q3.feetY + uy / ul * TUNE.lane.back + 1;
    L.qs = slots;
  }
  // side by side: the leftmost guest x in frontX[1] .. gMax (1-unit steps) at which a guest of scale s clears the poster
  // box, or -1
  function sideGuest(gMax, fy, s, pl, pr, pt, pb) {
    for (let gx = TUNE.play.frontX[1]; gx <= gMax; gx++) if (clearOf(gx, fy, s, pl, pr, pt, pb)) return gx;
    return -1;
  }
  // largest scale in [lo, hi] (0.01 steps, layout time only) at which no band of TUNE.guestEnv overlaps the poster box
  function fitScale(gx, fy, lo, hi, pl, pr, pt, pb) {
    for (let s = hi; s > lo; s -= 0.01) if (clearOf(gx, fy, s, pl, pr, pt, pb)) return Math.round(s * 100) / 100;
    return Math.round(lo * 100) / 100;
  }
  function clearOf(gx, fy, s, pl, pr, pt, pb) {
    const E = TUNE.guestEnv, g = TUNE.poster.gap;
    for (let i = 0; i < E.length; i += 2) {
      const y0 = fy - (i ? E[i - 2] : TUNE.guestTop) * s, y1 = fy - E[i] * s, half = E[i + 1] * s;
      if (y1 < pt - g || y0 > pb + g) continue;
      if (gx + half < pl - g || gx - half > pr + g) continue;
      return false;
    }
    return true;
  }
  function archTopR(x) {
    const u = (x - L.RW / 2) / (L.RW / 2);
    return L.archR * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
  }
  function buildTiles() {
    const T = L.tiles, R = L.room, RW = L.RW, RH = L.RH, vy = R.fb - 90;
    const rows = [R.fb + 11, R.fb + 19, R.fb + 29, R.fb + 41, RH + 2];
    let n = 0;
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r], yb = rows[r + 1], wa = 23 * (ya - vy) / (RH - vy), wb = 23 * (yb - vy) / (RH - vy);
      for (let col = -6; col < 6; col++) {
        const o = n * 8, q = T.q;
        q[o] = RW / 2 + col * wa; q[o + 1] = ya; q[o + 2] = RW / 2 + (col + 1) * wa; q[o + 3] = ya;
        q[o + 4] = RW / 2 + (col + 1) * wb; q[o + 5] = yb; q[o + 6] = RW / 2 + col * wb; q[o + 7] = yb;
        T.parity[n] = (r + col) & 1; T.cx[n] = RW / 2 + (col + 0.5) * (wa + wb) / 2; T.cy[n] = (ya + yb) / 2; T.w[n] = (wa + wb) / 2;
        n++;
      }
    }
    T.n = n;
  }
  // the marquee's bulb row; on the street it is phased so the poster's nail hangs exactly between two bulbs
  function buildBulbs() {
    const h = L.header, B = L.bulbs, st = TUNE.bulbs.step;
    let x = h.x + 10, n = 0;
    if (!L.lobby) { const m = poster.x - st / 2; x = m - st * Math.floor((m - (h.x + 8)) / st); }
    for (; x <= h.x + h.w - 8 && n < 32; x += st) { B.xy[n * 2] = x; B.xy[n * 2 + 1] = h.y + 6.5; n++; }
    B.n = n;
  }
  function buildTwinkles() {
    const r = rng(L.lobby ? 919 : 515);
    twN = 0;
    for (let i = 0; i < 60 && twN < 16; i++) {
      const x = 8 + r.next() * (L.W - 16), y = 6 + r.next() * Math.max(10, L.cityTop - 10);
      const dm = Math.hypot(x - L.moon.x, y - L.moon.y);
      if (dm < L.moon.r * 2.4) continue;
      TW[twN * 4] = x; TW[twN * 4 + 1] = y; TW[twN * 4 + 2] = r.next() * TAU; TW[twN * 4 + 3] = 1.2 + r.next() * 2.6; twN++;
    }
  }
  // a look-dependent bake through the shared, pruned WCACHE (see the header); keys this world uses are listed in MYKEYS
  function wc(key, w, h, fn) {
    MYKEYS.add(key);
    let e = WCACHE.get(key);
    const res = draw.res();
    if (e && e.res === res && e.cv.designW === w && e.cv.designH === h) return e.cv;
    const cv = draw.bake(w, h, fn);
    WCACHE.set(key, { cv: cv, res: res });
    return cv;
  }
  function bake() {
    // the lobby hangs from the safe bottom (and its moon from the safe top), so its bakes key on both
    const P = TUNE.pad, W = L.W, H = L.H, tag = (L.lobby ? 'L' + L.st + '.' + L.sb + '.' : 'P') + H, k = L.k, w = L.win;
    const th = '.' + L.th.id, dk = '.' + L.doorSkin;
    MYKEYS.clear();
    SP.stanchion = wc('world.stanchion.' + L.ropeSkin, TUNE.stanchion.w, TUNE.stanchion.h, F.stanchion);
    // the street's bake also carries what the poster's fit placed (the bulb row's phase, the lamp, the sconce)
    const fit = L.lobby ? '' : '.' + Math.round(poster.x * 4) + '.' + Math.round(L.lamp.y * 4) + '.' + (L.sconceOn ? Math.round(L.sconce[0]) : 'n');
    SP.bg = wc('world.bg.' + tag + fit + th + dk, W + P * 2, H + P * 2, F.bg);
    SP.fx = hasFxSprite(L.th) ? wc('world.fx.' + tag + th, W + P * 2, H + P * 2, F.fx) : null;
    roomSprites(SP, tag);
    if (DR.on) {   // a decor reveal splits the room's sprites at its previous level against these (the painters read L.decor)
      const lv = L.decor;
      L.decor = DR.from; roomSprites(OLD, tag); L.decor = lv;
    }
    SP.leaf = wc('world.leaf.' + tag + dk, L.door.w, L.door.h, F.leaf);
    // front sprites cropped to their bounding boxes (the rays wedge under the window, the ivy, the two corner shrubs)
    const ry = w.y + w.h * 0.62;
    box4(L.rays, -P, ry, W + P * 2, Math.ceil(Math.min(H - ry, 400)) + 2);
    L.ivyLen = L.lobby ? 120 : 92;
    box4(L.ivy, L.corner - 33, L.roof - 8, 84, L.ivyLen + 34);
    L.shrubY = H - (L.lobby ? 150 : 246);
    box4(L.shrubL, -P, L.shrubY - 24, 72 + P, H + P - L.shrubY + 24);
    box4(L.shrubR, W - 76, L.shrubY - 24, 80 + P, H + P - L.shrubY + 24);
    fairyAt(L, 0); fairyAt(L, 1);
    if (L.th.planter !== 'topiary') { planterLights(L, 0, L.th); planterLights(L, 1, L.th); }   // the props' light points
    SP.rays = wc('world.rays.' + tag + th, L.rays[2], L.rays[3], F.rays);
    SP.ivy = wc('world.ivy.' + tag + th, L.ivy[2], L.ivy[3], F.ivy);
    // the corner planters stand on the play street only (in the lobby the home buttons would cut them)
    SP.shrubL = L.lobby ? null : wc('world.shrubL.' + tag + th, L.shrubL[2], L.shrubL[3], F.shrubL);
    SP.shrubR = L.lobby ? null : wc('world.shrubR.' + tag + th, L.shrubR[2], L.shrubR[3], F.shrubR);
    L.coneX0 = -60; L.coneY0 = L.lamp.y + 12;
    SP.cone = wc('world.cone.' + tag + th, 300, Math.max(20, L.base + 40 - L.coneY0), F.cone);
    L.spillX0 = L.door.x - 150;
    SP.spill = draw.cached('world.spill.' + tag, 300, Math.max(40, H - L.base), F.spill);
    SP.number = draw.cached('world.plate.' + FONT_GEN, TUNE.sconce.num[0], TUNE.sconce.num[1], F.number);
    SP.bulb = wc('world.bulb.' + L.th.bulb, 14, 14, F.bulb);
    SP.smoke = draw.cached('world.smoke', 32, 32, F.smoke);
    const kt = '.' + k.toFixed(3);
    SP.chand = wc('world.chand' + kt + '.' + L.th.room.chand, 66 * k, 42 * k, F.chand);
    SP.standLamp = draw.cached('world.slamp' + kt, 30 * k, 72 * k, F.standLamp);
    SP.picture = wc('world.pic' + kt + th, 30 * k, 42 * k, F.picture);
    SP.dj = wc('world.dj' + kt + th, 52 * k, 48 * k, F.dj);
    SP.djHat = L.th.id === 'house' ? null : wc('world.djhat' + kt + th, DJ_HAT_BOX[2] * k, DJ_HAT_BOX[3] * k, F.djHat);
    SP.booth = draw.cached('world.booth' + kt, 62 * k, 28 * k, F.booth);
    SP.disco0 = draw.cached('world.disco0' + kt, 24 * k, 24 * k, F.disco0);
    SP.disco1 = draw.cached('world.disco1' + kt, 24 * k, 24 * k, F.disco1);
    SP.disco2 = draw.cached('world.disco2' + kt, 24 * k, 24 * k, F.disco2);
    SP.neon = L.decor >= 6 ? wc('world.neon' + kt + th, 48 * k, 40 * k, F.neon) : null;
    SP.cannon = L.decor >= 5 ? draw.cached('world.cannon' + kt, 22 * k, 24 * k, F.cannon) : null;
    SP.spot = draw.cached('world.spot', SPOT_BOT * 2, 160, F.spot);
    SP.sweep = draw.cached('world.sweep', SPOT_BOT * 2, 160, F.sweep);
    SP.sweepGold = draw.cached('world.sweepGold', SPOT_BOT * 2, 160, F.sweepGold);
    SP.kick = draw.cached('world.kick2', KICK_BOX[2] * KIT_S, KICK_BOX[3] * KIT_S, F.kick);
    SP.hat = draw.cached('world.hihat', HAT_BOX[2] * KIT_S, HAT_BOX[3] * KIT_S, F.hat);
    SP.hatTop = draw.cached('world.hattop', HATTOP_BOX[2] * KIT_S, HATTOP_BOX[3] * KIT_S, F.hatTop);
    SP.keys = draw.cached('world.keyboard', KEYS_BOX[2] * KIT_S, KEYS_BOX[3] * KIT_S, F.keys);
    SP.pool = draw.cached('world.pool', 192, 56, F.pool);
    for (let i = 0; i < STAR_COL.length; i++) SP.stars[i] = draw.cached('world.star' + i, 20, 20, STAR_F[i]);
    for (let i = 0; i < dancers.length; i++) kitOf(dancers[i]);   // the outfit kits (kick / keyboard) per dancer
    wcPrune();
  }
  // a dancer's kick drum / keyboard sprite in its outfit's colours (the house kit when it wears none)
  function kitOf(d) {
    const th = d.actor.outfit, KC = th ? outfitKit(th) : null;
    if (!th || !KC) { d.kickCv = SP.kick; d.keysCv = SP.keys; return; }
    if (d.kit0 === 1) d.kickCv = wc('world.kick.' + th, KICK_BOX[2] * KIT_S, KICK_BOX[3] * KIT_S, c => { c.scale(KIT_S, KIT_S); c.translate(-KICK_BOX[0], -KICK_BOX[1]); paintKick(c, KC, th); });
    else if (d.kit0 === 2) d.keysCv = wc('world.keys.' + th, KEYS_BOX[2] * KIT_S, KEYS_BOX[3] * KIT_S, c => { c.scale(KIT_S, KIT_S); c.translate(-KEYS_BOX[0], -KEYS_BOX[1]); paintKeyboard(c, KC); });
  }
  function roomSprites(out, tag) {
    const w = L.win, ban = L.decor >= 4 ? '.' + L.room.banMode + L.lang + FONT_GEN : '', th = '.' + L.th.id;
    out.roomBack = wc('world.room.' + tag + '.' + (L.decor >= 6 ? 1 : 0) + (L.room.banMode === 2 ? ban : '') + th, w.w, w.h, F.roomBack);
    out.roomFront = wc('world.roomf.' + tag + '.' + (L.decor >= 3 || L.th.id !== 'house' ? 1 : 0) + th, w.w, w.h, F.roomFront);
    out.overlay = wc('world.glass.' + tag + '.' + (L.decor >= 6 ? 6 : L.decor >= 1 ? 1 : 0) + ban + th, w.w + 8, w.h + 8, F.overlay);
  }
  // the look in force: a running preview, else this world's own look, else the shared one (setWorldLook). A changed theme /
  // skin re-bakes; changed outfits re-dress the dancers
  function resolveLook() {
    const src = PV.on ? PV : OWN.on ? OWN : LOOK, th = themeOf(src.club), rs = ropeKey(src.rope), ds = doorKey(src.door);
    L.lookGen = LOOK_GEN;
    let outChanged = false;
    for (const sp in OUTF) { const o = outfitTheme(src.outfit[sp]); if (o !== OUTF[sp]) { OUTF[sp] = o; outChanged = true; } }
    if (outChanged) for (let i = 0; i < dancers.length; i++) dressDancer(dancers[i]);
    if (th === L.th && rs === L.ropeSkin && ds === L.doorSkin) { if (outChanged && L.gen === GEN) for (let i = 0; i < dancers.length; i++) kitOf(dancers[i]); return false; }
    L.th = th; L.ropeSkin = rs; L.doorSkin = ds;
    return true;
  }
  // what a member wears: the band's outfit for its species (the look's) when it wears the band's (uni), else its own
  function dressDancer(d) { const o = d.uni ? (OUTF[d.species] || '') : d.own; if (d.actor.outfit !== o) d.actor.equip(o); }
  function checkLayout() {
    if (L.lookGen !== LOOK_GEN && resolveLook() && L.gen === GEN && L.H === stage.h) bake();
    if (L.H !== stage.h || L.gen !== GEN) {
      if (L.fontGen !== FONT_GEN || L.lang !== i18n.lang || L.H !== stage.h || L.st !== stage.safeTop || L.sb !== stage.safeBottom) layout();
      else { L.gen = GEN; bake(); }
    }
  }

  // ---------------------------------------------------------------- dancers
  function toSpec(src) {
    const f = src.fake || null;
    TMP.species = src.species || 'blob'; TMP.color = src.color || 'coral'; TMP.eyes = src.eyes || 2; TMP.hat = src.hat || 'none';
    TMP.tail = !!src.tail; TMP.pattern = src.pattern || 'none';
    TMP.fake.eyes = f && f.eyes ? 1 : 0; TMP.fake.hat = !!(f && f.hat); TMP.fake.tail = !!(f && f.tail); TMP.outfit = '';
    return TMP;
  }
  function freeSlot() {   // slots fill in TUNE order: the stage flanking the DJ first, the floor gaps, the front row
    for (let i = 0; i < nSlots; i++) if (!slotUsed[i]) return i;
    return -1;
  }
  // the newest shorter member standing in `row` that can change places (not mid-walk, not an unlock newcomer)
  function swapper(row) {
    let best = null;
    for (let i = 0; i < dancers.length; i++) {
      const o = dancers[i];
      if (o.species !== 'tall' && SR[o.slot] === row && !o.big && o.tr < 0 && (!best || o.id > best.id)) best = o;
    }
    return best;
  }
  // after a re-layout that lowered the cap (a resize into the short room): drop the oldest members and move anyone left
  // on a slot past the cap into a free one
  function fitBand() {
    while (dancers.length > nSlots) removeDancer(oldest(), false);
    let moved = false;
    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i];
      if (d.slot < nSlots) continue;
      slotUsed[d.slot] = 0; d.slot = freeSlot(); slotUsed[d.slot] = 1; moved = true;
    }
    for (let i = 0; i < dancers.length; i++) setRole(dancers[i]);
    if (moved) sortDancers();
  }
  // a member pushed out by the cap: it poofs out of its spot and, in play, joins the crowd silhouette along the sill
  function evict(i) {
    const d = dancers[i];
    if (d && !L.lobby) toCrowd(d.actor.spec);
    removeDancer(i, true);
  }
  function toCrowd(spec) {
    const CR = TUNE.crowd, max = Math.min(CR.max, CR.x.length, CRW.sp.length);
    let i;
    if (crowdN < max) i = crowdN++;
    else { i = crowdNext; crowdNext = (crowdNext + 1) % max; }
    const cn = spec.color, hex = GUEST_COL[cn] || '#ffc233';
    if (!CROWD_FILL[cn]) { CROWD_FILL[cn] = color.mix(hex, '#120a22', CR.ink); CROWD_RIM[cn] = color.alpha(hex, CR.rim); }
    CRW.fill[i] = CROWD_FILL[cn]; CRW.rim[i] = CROWD_RIM[cn];
    const si = CROWD_SP.indexOf(spec.species);
    CRW.sp[i] = si < 0 ? 0 : si; CRW.hat[i] = CROWD_HAT[spec.hat] || 0; CRW.age[i] = 0;
    burstSparkle(CR.x[i], L.RH - CR.up[1], 4);
  }
  const WARM_S = [0, 0], WARM_D = [0];
  function addDancer(src, show) {
    if (dancers.length >= nSlots) evict(oldest());
    let si = freeSlot();
    if (si < 0) { evict(oldest()); si = freeSlot(); }
    const spec = toSpec(src);
    // a tall belongs on the stage (the back row): in front, its long neck would cover the members behind it. When it
    // lands on the floor or the front row, the newest shorter stage member steps down into that slot (a hop-walk) and
    // the tall takes its place; failing that, never the front row while a shorter floor member can step forward
    if (spec.species === 'tall' && SR[si] !== 1) {
      const o = swapper(1) || (SR[si] === 3 ? swapper(2) : null);
      if (o) {
        const os = o.slot;
        o.slot = si; slotUsed[si] = 1; si = os;
        if (o.wait > 0) { o.x = SX[o.slot]; o.y = SY[o.slot]; o.s = SS[o.slot]; }   // not popped in yet: it just appears there
        else if (show) { o.tr = 0; o.fx = o.x; o.fy = o.y; o.fs = o.s; }
        setRole(o);   // stepping down into the crowd: the instrument goes
      }
    }
    // the outfit: a spec that names its own keeps it (an admitted guest names none: '') and one that names none wears the
    // look's for its species; in play, whoever takes a stage slot joins the House Band on its stage and wears the band's
    // outfit for its species (the crowd keeps its own clothes), so the outfits the player bought play every night
    const fixed = src.outfit !== undefined, band = plays(si), uni = !fixed || (!L.lobby && SR[si] === 1), own = fixed ? outfitTheme(src.outfit) : '';
    spec.outfit = uni ? (OUTF[spec.species] || '') : own;
    const a = createActor(spec, ACTOR_OPTS);
    settle(a, band);
    const sc = SS[si] * L.k;
    WARM_S[0] = sc; WARM_S[1] = L.room.cs * L.k;
    if (show) { prewarmLater(spec, WARM_S, WARM_D); warmT = 1; } else a.prewarm(sc, 0);
    slotUsed[si] = 1;
    // x / y / s = where the dancer is drawn (room units; the slot, or centre stage and the hop-walk during an unlock),
    // tr = that walk's clock (-1 idle), fl = flinch delay (-1 idle), col = its body colour (the pop-in sparks)
    // kit0: 1 = a drummer (the world draws its kick + hi-hat), 2 = keys (its keyboard); kit = the one drawn (0 off the
    // band: band = plays its instrument, the stage row in play); bw / bh = the body's size at scale 1 (the pop-in spark
    // ring starts at the silhouette edge)
    const inst = INSTRUMENT[spec.species] || 'drum', dim = BODY[spec.species] || BODY.blob, kit0 = inst === 'drum' ? 1 : inst === 'keys' ? 2 : 0;
    const d = { actor: a, species: spec.species, instrument: inst, slot: si, kit0, kit: band ? kit0 : 0, band, fixed, uni, own, kickCv: null, keysCv: null,
      wait: show ? TUNE.admit.delay : 0, age: show ? 0 : 9, hop: -9, hopH: 0, hopN: 0, hopDur: TUNE.celebrate.hopDur, big: false, id: ++seq,
      x: SX[si], y: SY[si], s: SS[si], tr: -1, fx: 0, fy: 0, fs: 0, fl: -1, col: GUEST_COL[spec.color] || '#ffc233', bw: dim[0], bh: dim[1] };
    dancers.push(d);
    kitOf(d);
    sortDancers();
    return d;
  }
  function oldest() {
    let bi = 0;
    for (let i = 1; i < dancers.length; i++) if (dancers[i].id < dancers[bi].id) bi = i;
    return bi;
  }
  function removeDancer(i, poof) {
    const d = dancers[i];
    if (!d) return;
    slotUsed[d.slot] = 0;
    if (poof) burstSparkle(d.x, d.y - 14, 8);
    if (SPOT.d === d) SPOT.d = null;
    dancers.splice(i, 1);
  }
  function sortDancers() {   // draw order: back rows first, then left to right (insertion sort, tiny list)
    for (let i = 1; i < dancers.length; i++) {
      const d = dancers[i];
      let j = i - 1;
      while (j >= 0 && (SY[dancers[j].slot] > SY[d.slot] || (SY[dancers[j].slot] === SY[d.slot] && SX[dancers[j].slot] > SX[d.slot]))) { dancers[j + 1] = dancers[j]; j--; }
      dancers[j + 1] = d;
    }
  }
  function burstSparkle(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 18 + Math.random() * 46;
      spawn(1, x + Math.cos(a) * 4, y + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 14, 0.5 + Math.random() * 0.5, 1.6 + Math.random() * 2.2, (Math.random() * 3) | 0);
    }
  }
  // a ring of n dashes in the dancer's own colour flying out from its silhouette edge (an ellipse round the body at its
  // scale s, room units): each dash's tail starts on the edge, so nothing ever streaks across the body
  function sparkRing(d, s, n, sp) {
    const rx = d.bw * 0.5 * s * TUNE.admit.ring, ry = d.bh * 0.5 * s * TUNE.admit.ring, cy = d.y - d.bh * 0.5 * s, len = 5.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.5, ca = Math.cos(a), sa = Math.sin(a), v = sp * (0.8 + Math.random() * 0.4);
      const p = spawn(4, d.x + ca * (rx + len), cy + sa * (ry + len), ca * v, sa * v, 0.38 + Math.random() * 0.12, len, 0);
      p.col = d.col; p.rot = a; p.vr = 0;
    }
  }
  // sticker stars fanning up out of (x, y); gold: gold + cream ones only
  function starBurst(x, y, n, sp, gold) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / Math.max(1, n - 1) - 0.5) * 2.6, v = sp * (0.7 + Math.random() * 0.5);
      spawn(5, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.8 + Math.random() * 0.4, 5 + Math.random() * 2, gold ? ((i & 1) ? 4 : 0) : i % STAR_COL.length);
    }
  }
  // SHUT DOWN's last beat: the DJ booth's EQ (the last light in the room) pops: sparks, black smoke, a white-hot flash
  function djPop() {
    const R = L.room, S = TUNE.shut, x = R.chandX - 16.3, y = R.boothTop + 15;   // the EQ well on the booth panel
    for (let i = 0; i < S.djSparks; i++) spawn(3, x + (Math.random() - 0.5) * 14, y - 4, (Math.random() - 0.5) * 130, -45 - Math.random() * 95, 0.45 + Math.random() * 0.45, 1, 0);
    puffSmoke(x, y - 6, 4, true);
    djFlashT = S.djFlash;
  }
  function puffSmoke(x, y, n, dark) {
    for (let i = 0; i < n; i++) spawn(2, x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * 10, -10 - Math.random() * 10, 1.8 + Math.random() * 1.4, 7 + Math.random() * 6, dark ? 1 : 0);
  }
  function fireCannon(side) {
    if (!SP.cannon) return;
    const R = L.room, x = R.cannons[side * 2], y = R.cannons[side * 2 + 1] - 18, dir = side ? -1 : 1;
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + dir * 0.6 + (Math.random() - 0.5) * 0.6, sp = 90 + Math.random() * 90;
      spawn(0, x + dir * 6, y, Math.cos(a) * sp, Math.sin(a) * sp, 1.5 + Math.random(), 4 + Math.random() * 2.5, (Math.random() * CONF.length) | 0);
    }
    puffSmoke(x + dir * 6, y, 3, false);
    if (side) cannonKick1 = 1; else cannonKick0 = 1;
  }

  // ---------------------------------------------------------------- beat
  function beatNow() {
    if (beatFn) { const v = beatFn(); if (typeof v === 'number' && v >= 0) return v; }
    return t * TUNE.bpm / 60;
  }
  function onBeat(bi) {
    const T = L.tiles, dimK = level >= 3 ? 0 : 1;   // a shut room's floor stays dark
    if (tileHold <= 0 && dimK > 0) for (let i = 0; i < TUNE.tiles.perBeat; i++) { const j = (Math.random() * T.n) | 0; tileV[j] = dimK; tileC[j] = (Math.random() * 5) | 0; }
    for (let i = 0; i < glint.length; i++) if (Math.random() < 0.35) glint[i] = 1;
    if (L.decor >= 5 && bi % 16 === 8 && !(DR.on && DR.lv === 5)) fireCannon((bi >> 4) & 1);   // (not before they pop up)
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    checkLayout();
    if (!(dt > 0)) return;
    t += dt;
    if (PV.on && t >= PV.until) { PV.on = false; L.lookGen = -1; }   // the "Try it" preview ends: back to the look
    const bt = beatNow(), bi = Math.floor(bt);
    if (bi !== lastBeat) { if (lastBeat >= 0 || bi === 0) onBeat(bi); lastBeat = bi; }
    if (prevBt >= 0) { const r = (bt - prevBt) / dt; if (r > 0.6 && r < 6) beatRate += (r - beatRate) * Math.min(1, dt * 2); }
    prevBt = bt;
    // LAST CALL's encore lands on its beat (the seconds fallback covers a clock that stopped or jumped)
    if (encBeat >= 0) {
      encWait -= dt;
      if ((bt >= encBeat && bt < encBeat + 2) || encWait < -0.12) { encBeat = -1; encore(); }
    }
    if (encT < 9) encT += dt;
    // door swing
    if (DA.on) {
      DA.t += dt;
      const u = clamp(DA.t / DA.dur, 0, 1);
      doorAng = DA.from + (DA.to - DA.from) * DA.ease(u);
      if (u >= 1) { DA.on = false; doorAng = DA.to; }
    }
    door.open = clamp(doorAng / TUNE.door.open, 0, 1);
    if (doorFlash > 0) doorFlash = Math.max(0, doorFlash - dt * TUNE.door.flashDecay);
    if (doorPopT >= 0) { doorPopT -= dt; if (doorPopT < 0) doorBurst(); }
    lampFlick = 1 - TUNE.lamp.flick * (0.5 + 0.5 * noise1(t * TUNE.lamp.flickHz)) - (noise1(t * 0.7 + 30) > 0.82 ? 0.25 : 0);
    // springs (sub-stepped so a hand-stepped test with a big dt stays stable)
    const n = Math.min(16, Math.ceil(dt / (1 / 120))), h = dt / n, RT = TUNE.rope, CHT = TUNE.chand, PTT = TUNE.picture;
    const drive = CHT.drive * Math.sin(bt * Math.PI) * (level >= 3 ? 0.4 : 1);
    const ptTo = TUNE.picture.tilt[level];
    for (let i = 0; i < n; i++) {
      RP.v += (-RT.k * RP.d - RT.c * RP.v) * h; RP.d += RP.v * h;
      RP.fv += (-RT.k * RP.fd - RT.c * RP.fv) * h; RP.fd += RP.fv * h;
      CH.v += (-CHT.k * CH.a - CHT.c * CH.v + drive * CHT.k) * h; CH.a += CH.v * h;
      PT.v += (-PTT.k * (PT.a - ptTo) - PTT.c * PT.v) * h; PT.a += PT.v * h;
    }
    // standing lamp fall
    if (LF.t >= 0) {   // it tips right (outBounce) while its foot skids left (outQuad, done by the first impact)
      LF.t += dt;
      const LFT = TUNE.lampFall, u = clamp(LF.t / LFT.dur, 0, 1), us = clamp(u / LFT.hit, 0, 1), sl = 1 - (1 - us) * (1 - us);
      LF.a = LFT.angle * easeIndex.outBounce(u);
      LF.dx = LFT.slide[0] * sl; LF.dy = LFT.slide[1] * sl;
      LF.lit = u < 0.5 ? (Math.sin(LF.t * 60) > 0 ? 1 : 0.2) : Math.max(0, LF.lit - dt * 4);
      if (!LF.hit && u >= LFT.hit) { LF.hit = true; lampImpact(); }
      if (u >= 1) LF.t = -1;
    }
    // DJ glare settles to a sulk while the room is damaged (a hard glare once it is shut: the platters stop dead)
    const rest = level >= 3 ? TUNE.shut.glare : level > 0 ? TUNE.glare.rest : 0;
    // SHUT DOWN: the marquee bulbs die left to right, each popping a spark
    if (shutT >= 0) {
      shutT += dt;
      const B = L.bulbs, S = TUNE.shut;
      while (shutN < B.n && shutT >= bulbDieAt(shutN)) {
        const bx = B.xy[shutN * 2], by = B.xy[shutN * 2 + 1];
        for (let j = 0; j < S.sparks; j++) spawnStreet(3, bx, by, (Math.random() - 0.5) * 70, 10 + Math.random() * 40, 0.3 + Math.random() * 0.2, 2 + Math.random() * 1.5, 1);
        shutN++;
      }
      if (!djPopped && shutT >= S.dj) { djPopped = true; djPop(); }
    }
    if (djFlashT > 0) djFlashT = Math.max(0, djFlashT - dt);
    if (GL.v > rest) GL.v = Math.max(rest, GL.v - dt * TUNE.glare.decay); else GL.v = rest;
    blinkT -= dt;
    if (blinkT <= 0) { blink = 0.16; blinkT = 2 + Math.random() * 3; }
    if (blink > 0) blink -= dt;
    // room light (a failed night's LAST CALL brings the lights down a little: closing time)
    const dimTo = 1 - level * 0.07 - (cm === 0 ? TUNE.celebrate.rope.dim : 0);
    roomDim += (dimTo - roomDim) * Math.min(1, dt * 4);
    if (celebT < 9) celebT += dt;
    cannonKick0 = Math.max(0, cannonKick0 - dt * 4); cannonKick1 = Math.max(0, cannonKick1 - dt * 4);
    // the disco ball: fast through LAST CALL; dead stop on a wrong admit, then it winds back up (slower when wrecked)
    if (spinHold > 0) spinHold -= dt;
    if (bulbOffT > 0) bulbOffT -= dt;
    if (redT > 0) redT = Math.max(0, redT - dt);
    if (tileHold > 0) tileHold -= dt;
    const CBS = TUNE.celebrate, celebSpin = cm > 0 && celebT < CBS.spin * (cm === 2 ? CBS.gold.spin : 1);   // (not on a fail)
    const spinTo = celebSpin || encT < CBS.encore.spin ? 3 : spinHold > TUNE.degrade.spinBack * 0.5 || level >= 3 ? 0 : 1;
    discoSpin += (spinTo - discoSpin) * Math.min(1, dt * (spinTo < discoSpin ? 9 : 2));
    specPh += dt * discoSpin; discoPh += dt * 7 * discoSpin;
    if (specPh > 1e4) specPh -= 1e4;
    if (discoPh > 3e4) discoPh -= 3e4;
    // DJ platters: 45 rpm, stopped dead by the glare (a record stop)
    platSpin += ((GL.v > 0.55 ? 0 : 1) - platSpin) * Math.min(1, dt * 6);
    platPh += dt * TUNE.booth.spin * TAU * platSpin;
    if (platPh > 1e4) platPh -= 1e4;
    // unlock spotlight: fade in, hold, fade out (or held by spotlight(true))
    const U = TUNE.unlock;
    if (SPOT.t >= 0) {
      SPOT.t += dt;
      if (SPOT.t >= U.dur) SPOT.t = -1;
    }
    const spotTo = SPOT.hold ? 1 : SPOT.t >= 0 ? (SPOT.t < U.dur - U.fadeOut ? 1 : 0) : 0;
    const spotK = spotTo > SPOT.a ? dt / U.fadeIn : dt / U.fadeOut;
    SPOT.a = spotTo > SPOT.a ? Math.min(spotTo, SPOT.a + spotK) : Math.max(spotTo, SPOT.a - spotK);
    if (DR.on) updateReveal(dt);
    for (let i = 0; i < 64; i++) if (tileV[i] > 0) tileV[i] = Math.max(0, tileV[i] - dt * TUNE.tiles.decay);
    for (let i = 0; i < glint.length; i++) if (glint[i] > 0) glint[i] = Math.max(0, glint[i] - dt * 3);
    // smoke wisps while damaged
    const rate = TUNE.smoke.rate[level];
    if (rate > 0) {
      smokeAcc += rate * dt;
      while (smokeAcc >= 1) {
        smokeAcc -= 1;
        const R = L.room, fromLamp = Math.random() < 0.55;
        if (fromLamp) lampShade(LSH);
        const sx = fromLamp ? LSH.x - 10 + Math.random() * 20 : R.chandX + (Math.random() - 0.5) * 50;
        const sy = fromLamp ? LSH.y : R.boothTop - 2;
        spawn(2, sx, sy, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 2.2 + Math.random() * 1.6, 6 + Math.random() * 6, level >= 3 ? 1 : 0);
      }
    }
    // particles
    ppCount = 0;
    for (let i = 0; i < PP.length; i++) {
      const p = PP[i];
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= p.life) { p.on = false; continue; }
      ppCount++;
      if (p.k === 0) { p.vy += 240 * dt; const dr = 1 / (1 + 2.2 * dt); p.vx *= dr; p.vy *= dr; p.vx += Math.sin(p.t * 7 + p.ph) * 30 * dt; }
      else if (p.k === 1) { const dr = 1 / (1 + 3 * dt); p.vx *= dr; p.vy *= dr; p.vy += 20 * dt; }
      else if (p.k === 2) { p.vx += Math.sin(p.t * 1.6 + p.ph) * 6 * dt; }
      else if (p.k === 4) { const dr = 1 / (1 + 7 * dt); p.vx *= dr; p.vy *= dr; }
      else if (p.k === 5) { p.vy += 200 * dt; const dr = 1 / (1 + 1.6 * dt); p.vx *= dr; p.vy *= dr; }
      else { p.vy += 300 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    // the street burst (LAST CALL): a ballistic blast (low drag) that turns into a flutter (drag ramps up, sideways sway),
    // ribbons curl, stars tumble, sparkles float; sticky pieces that land on the rope rest there, riding its sag
    const CB = TUNE.celebrate, SG2 = CB.g;
    if (rainT >= 0) { rainT -= dt; if (rainT < 0) rain(); }
    sppCount = 0;
    for (let i = 0; i < SPP.length; i++) {
      const p = SPP[i];
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= p.life || p.y > L.H + 30) { p.on = false; continue; }
      sppCount++;
      if (p.rest > 0) {
        p.rest -= dt;
        const y = restY(p.rw, p.x);
        if (y === y) p.y = y;
        if (p.rest <= 0 || !(y === y)) { p.rest = -1; p.stick = false; p.vx = (Math.random() - 0.5) * 50; p.vy = 25; p.vr = (Math.random() - 0.5) * 10; }
        continue;
      }
      if (p.k === 3) {
        const dr = 1 / (1 + 3 * dt); p.vx *= dr; p.vy *= dr; p.vy -= 18 * dt;
      } else {
        const fl = smoothstep(CB.dragT[0], CB.dragT[1], p.t), dr = 1 / (1 + (p.k === 2 ? 0.7 : lerp(p.d0, CB.drag[1], fl)) * dt);
        p.vy += SG2 * (p.k === 2 ? 1 : 0.75) * dt; p.vx *= dr; p.vy *= dr;
        if (p.k !== 2) p.vx += Math.sin(p.t * 6 + p.ph) * 46 * fl * dt;
      }
      const py = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.stick && p.vy > 0 && rope.on) tryRest(p, py);
    }
    // dancers
    const U2 = TUNE.unlock;
    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i];
      if (d.wait > 0) {
        d.wait -= dt;
        if (d.wait <= 0) {
          d.age = 0;
          if (d.big) {   // the unlock reveal at centre stage: sparks in its colour, sticker stars, then the triple hop
            sparkRing(d, d.s, U2.sparks, 120);
            starBurst(d.x, d.y - 20, U2.stars, 110);
            d.hop = 0; d.hopH = U2.hopH; d.hopN = U2.hopN; d.hopDur = U2.hopDur;
          } else sparkRing(d, d.s, TUNE.admit.sparks, 95);
        }
        continue;
      }
      d.age += dt;
      if (d.hop > -9) {
        d.hop += dt;
        if (d.hop >= d.hopN * d.hopDur) {
          d.hop = -9;
          if (d.big && d.tr < 0) { d.tr = 0; d.fx = d.x; d.fy = d.y; d.fs = d.s; }   // ceremony done: hop-walk to the slot
        }
      }
      if (d.tr >= 0) {
        d.tr += dt;
        const u = clamp(d.tr / U2.travel, 0, 1), e = easeIndex.inOutSine(u), si = d.slot;
        d.x = lerp(d.fx, SX[si], e); d.y = lerp(d.fy, SY[si], e) - U2.travelH * Math.abs(Math.sin(u * Math.PI * U2.travelHops));
        d.s = lerp(d.fs, SS[si], e);
        if (u >= 1) { d.tr = -1; d.big = false; d.x = SX[si]; d.y = SY[si]; d.s = SS[si]; sortDancers(); }
      } else if (!d.big) { d.x = SX[d.slot]; d.y = SY[d.slot]; d.s = SS[d.slot]; }   // follows a re-layout
      if (d.fl >= 0) { d.fl -= dt; if (d.fl < 0) d.actor.setState('flinch', FLINCH); }
      d.actor.update(dt);
    }
    for (let i = 0; i < crowdN; i++) if (CRW.age[i] < 9) CRW.age[i] += dt;
    if (warmT > 0) { warmT -= dt; prewarmPump(1); }   // finish an admitted dancer's bakes even if no actor draws this frame
    // queue slot light
    for (let i = 0; i < 4; i++) { const s = slots[i]; lightAt(s.x, s.feetY, s.light); }
  }

  function lightAt(x, y, out) {
    out = out || LT;
    const LI = TUNE.light, d = L.door;
    const dx = x - (d.x + d.w * 0.5), dy = (y - L.base) * 1.5, dd = Math.sqrt(dx * dx + dy * dy);
    const fd = clamp(1 - dd / LI.doorR, 0, 1);
    out.door = Math.min(1, fd * (LI.doorBase + (LI.doorOpen - LI.doorBase) * door.open + doorFlash * 0.3)) * (L.lobby ? LI.lobbyDoor : 1);
    const lx = x - (L.lamp.x + 36), ly = (y - (L.base + 24)) * 1.4, dl = Math.sqrt(lx * lx + ly * ly);
    const fl = clamp(1 - dl / LI.lampR, 0, 1);
    out.lamp = fl * LI.lampK * lampFlick;
    return out;
  }

  // SHUT DOWN: when marquee bulb i dies (s after level 3), in step with play.js's window columns (the same sweep across the
  // window's width), and the window's light 1 -> TUNE.shut.fade over that sweep
  function bulbDieAt(i) {
    const S = TUNE.shut, w = L.win;
    return clamp((L.bulbs.xy[i * 2] - w.x) / w.w, 0, 1) * S.cols * S.bulb;
  }
  function shutK() {
    if (shutT < 0) return 1;
    const S = TUNE.shut;
    return 1 - (1 - S.fade) * clamp(shutT / (S.cols * S.bulb), 0, 1);
  }

  // ---------------------------------------------------------------- the decor reveal (TUNE.decorReveal)
  // the spot(s) a decor level's piece stands in (room units, live from the layout): n = 1 or 2 (the plants and the
  // cannons stand in both corners), rx / ry = the spotlight's hole round each
  function revealFocus(lv) {
    const R = L.room, RW = L.RW, RH = L.RH, F = FOC;
    F.n = 1; F.x1 = 0; F.y1 = 0;
    if (lv === 1) { F.x0 = RW / 2; F.y0 = L.archR + 1.5 + TUNE.room.garland.dy * L.gk + 7; F.rx = RW * 0.56; F.ry = 22; }
    else if (lv === 2) { F.x0 = R.discoX; F.y0 = R.discoY + R.cord + 10; F.rx = 26; F.ry = 26; }
    else if (lv === 3) { F.n = 2; F.x0 = 13; F.x1 = RW - 13; F.y0 = F.y1 = RH - 20; F.rx = 28; F.ry = 32; }
    else if (lv === 4) { F.x0 = RW / 2; F.y0 = (R.banMode === 1 ? R.banY : R.fb + 0.5) + BANNER.h / 2; F.rx = BANNER.w / 2 + 22; F.ry = 22; }
    else if (lv === 5) { F.n = 2; F.x0 = R.cannons[0]; F.x1 = R.cannons[2]; F.y0 = F.y1 = R.cannons[1] - 12; F.rx = 22; F.ry = 24; }
    else { F.x0 = R.neonX; F.y0 = R.neonY; F.rx = 36; F.ry = 32; }
    return F;
  }
  // the piece's entrance 0..1 (over decorReveal.pop from `at`, lag s later for the second corner); 0 while waiting
  function revU(lag) {
    if (DR.t < 0) return 0;
    const RV = TUNE.decorReveal;
    return clamp((DR.t - RV.at - lag) / RV.pop, 0, 1);
  }
  // s from the reveal's start to the piece's landing (the neon lands once its tubes have stuttered on)
  function revLand() {
    const RV = TUNE.decorReveal;
    return RV.at + RV.pop * RV.land[DR.lv] + (DR.lv === 6 ? RV.neon : 0);
  }
  // how far the room's sprites have switched to the new level: 0 = all the old one, 1 = all the new one
  function revE() {
    if (!DR.on) return 1;
    const u = revU(0), lv = DR.lv;
    return lv === 1 ? easeIndex.inOutSine(u) : lv === 4 ? easeIndex.outBounce(u) : lv === 6 ? easeIndex.outCubic(u) : u;
  }
  // the new sprite's region at progress e (screen units): the garland is strung left to right, the banner unrolls down from
  // its cords, anything else opens in an iris round the piece
  function regionPath(ctx, e) {
    const w = L.win, k = L.k, lv = DR.lv, R = L.room;
    if (lv === 1) {
      const xf = w.x + lerp(-8, L.RW + 8, e) * k;
      ctx.rect(w.x - 12, w.y - 12, xf - w.x + 12, w.h + 24);
    } else if (lv === 4) {
      const top = R.banMode === 1 ? R.banY - 12 : R.fb - 1, hw = BANNER.w / 2 + 12;
      ctx.rect(w.x + (L.RW / 2 - hw) * k, w.y + top * k, hw * 2 * k, (BANNER.h + 16) * e * k);
    } else {
      const F = revealFocus(lv), r = TUNE.decorReveal.iris * e * k, cx = w.x + F.x0 * k, cy = w.y + F.y0 * k;
      ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU);
    }
  }
  // a room sprite, split between its previous decor level (outside the reveal's region) and the new one (inside)
  function drawLayer(ctx, oldCv, newCv, x, y, w, h) {
    const e = oldCv && oldCv !== newCv ? revE() : 1;
    if (e >= 1) { ctx.drawImage(newCv, x, y, w, h); return; }
    if (e <= 0) { ctx.drawImage(oldCv, x, y, w, h); return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x - 1, y - 1, w + 2, h + 2); regionPath(ctx, e); ctx.clip('evenodd');
    ctx.drawImage(oldCv, x, y, w, h); ctx.restore();
    ctx.save(); ctx.beginPath(); regionPath(ctx, e); ctx.clip();
    ctx.drawImage(newCv, x, y, w, h); ctx.restore();
  }
  // the plants / cannons pop-in scale for corner i (1 when no such reveal runs; 0 = not in yet)
  function popOf(lv, i) {
    if (!(DR.on && DR.lv === lv)) return 1;
    const u = revU(i * TUNE.decorReveal.stagger);
    return u <= 0 ? 0 : popK(u);
  }
  // the neon's tubes through its reveal: dark until the iris is mostly open, then a stutter to full
  function neonK() {
    if (!(DR.on && DR.lv === 6)) return 1;
    const RV = TUNE.decorReveal, v = (DR.t - RV.at - RV.pop * 0.7) / RV.neon;
    if (DR.t < 0 || v < 0) return 0;
    return v >= 1 ? 1 : NEON_ON[Math.min(NEON_ON.length - 1, (v * NEON_ON.length) | 0)];
  }
  // the disco ball's specks fade in once it has dropped in
  function specK() {
    if (!(DR.on && DR.lv === 2)) return 1;
    return DR.t < 0 ? 0 : clamp((DR.t - revLand()) / 0.5, 0, 1);
  }
  function updateReveal(dt) {
    const RV = TUNE.decorReveal;
    if (DR.t < 0) {
      if (SPOT.t < 0 && !SPOT.hold) DR.wait -= dt;   // an unlock ceremony owns the room first
      if (DR.wait <= 0) { DR.t = 0; DR.fired = 0; DR.trail = 0; }
    } else {
      DR.t += dt;
      const F = revealFocus(DR.lv), land = revLand();
      for (let i = 0; i < F.n; i++) if (!(DR.fired & (1 << i)) && DR.t >= land + i * RV.stagger) { DR.fired |= 1 << i; revealLand(i); }
      if (DR.lv === 1) {   // a sparkle trail runs along the garland's front as it is strung
        const u = revU(0);
        if (u > 0 && u < 1) {
          DR.trail -= dt;
          if (DR.trail <= 0) {
            DR.trail += RV.trail;
            const x = lerp(-8, L.RW + 8, easeIndex.inOutSine(u)), y = F.y0 - 6 + Math.random() * 12;
            spawn(1, x, y, (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.45 + Math.random() * 0.3, 1.8 + Math.random() * 1.6, (Math.random() * 3) | 0);
          }
        }
      }
      if (DR.t >= RV.dur) { endReveal(); return; }
    }
    DR.a = DR.t < 0 ? 0 : Math.min(1, DR.t / RV.in) * clamp((RV.dur - DR.t) / RV.out, 0, 1);
  }
  // the piece lands in spot i: sparkles + sticker stars (the garland's run along its length), the disco ball's glints
  // flash, the cannons fire
  function revealLand(i) {
    const RV = TUNE.decorReveal, F = revealFocus(DR.lv), q = DR.full ? 1 : RV.playK, x = i ? F.x1 : F.x0, y = i ? F.y1 : F.y0;
    if (DR.lv === 1) {
      for (let j = 0; j < 5; j++) burstSparkle(L.RW * (0.1 + j * 0.2), y, Math.max(2, Math.round(4 * q)));
      starBurst(x, y + 4, Math.round(RV.stars * q), 95);
      return;
    }
    burstSparkle(x, y, Math.round(RV.sparks * q));
    starBurst(x, y - 4, Math.round(RV.stars * q), 105);
    if (DR.lv === 2) for (let j = 0; j < glint.length; j++) glint[j] = 1;
    if (DR.lv === 5) fireCannon(i);
  }
  function endReveal() {
    DR.on = false; DR.t = -1; DR.a = 0; DR.lv = 0;
    OLD.roomBack = null; OLD.roomFront = null; OLD.overlay = null;
  }
  // room units, behind the dancers: a warm light pool on the piece's wall / corner (behind the band, so it never washes
  // a member out)
  function drawRevealPool(ctx) {
    const RV = TUNE.decorReveal, F = revealFocus(DR.lv), a = DR.a * (1 - SPOT.a);
    if (a <= 0.01) return;
    const pa = a * RV.pool * (DR.full ? 1 : RV.playK), r = Math.min(70, Math.max(F.rx, F.ry) * 1.25);
    for (let i = 0; i < F.n; i++) draw.glow(ctx, i ? F.x1 : F.x0, i ? F.y1 : F.y0, r, '#ffe2a8', pa);
  }
  // room units, after the dancers + particles: the lobby's room dims round a soft spotlight on the piece (`soft` stacked
  // dims, each hole `edge` wider, so its rim falls off in steps)
  function drawRevealDim(ctx) {
    const RV = TUNE.decorReveal, F = revealFocus(DR.lv), a = DR.a * (1 - SPOT.a);
    if (!DR.full || a <= 0.01) return;
    ctx.fillStyle = '#0a0210';
    for (let s = 0; s < RV.soft; s++) {
      const g = 1 + RV.edge * s;
      ctx.globalAlpha = a * RV.dim / RV.soft;
      ctx.beginPath(); ctx.rect(-2, -2, L.RW + 4, L.RH + 4);
      for (let i = 0; i < F.n; i++) {
        const x = i ? F.x1 : F.x0, y = i ? F.y1 : F.y0;
        ctx.moveTo(x + F.rx * g, y); ctx.ellipse(x, y, F.rx * g, F.ry * g, 0, 0, TAU);
      }
      ctx.fill('evenodd');
    }
    ctx.globalAlpha = 1;
  }
  // the plants pop up out of their pots (each half of the window scaled about its pot's foot: roomFront holds only them)
  function drawPlantsPop(ctx) {
    const w = L.win, k = L.k;
    for (let s = 0; s < 2; s++) {
      const p = popOf(3, s);
      if (p <= 0) continue;
      const px = w.x + (s ? L.RW - 9 : 9) * k, py = w.y + (L.RH + 1) * k;
      ctx.save(); ctx.beginPath(); ctx.rect(s ? w.x + w.w / 2 : w.x - 2, w.y, w.w / 2 + 2, w.h); ctx.clip();
      ctx.translate(px, py); ctx.scale(p, p); ctx.translate(-px, -py);
      ctx.drawImage(SP.roomFront, w.x, w.y, w.w, w.h);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- draw
  function blitAdd(ctx, cv, x, y, w, h, a) {
    if (a <= 0.003) return;
    const g = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = g * a;
    ctx.drawImage(cv, x, y, w, h);
    ctx.globalAlpha = g; ctx.globalCompositeOperation = op;
  }
  function drawBack(ctx) {
    checkLayout();
    const P = TUNE.pad, W = L.W, H = L.H, bt = beatNow(), ph = bt - Math.floor(bt), pulse = (1 - ph) * (1 - ph);
    ctx.drawImage(SP.bg, -P, -P, W + P * 2, H + P * 2);
    // twinkles + the antenna light
    for (let i = 0; i < twN; i++) {
      const o = i * 4, a = 0.5 + 0.5 * Math.sin(t * TW[o + 3] + TW[o + 2]);
      draw.glow(ctx, TW[o], TW[o + 1], 3 + a * 3, '#dfe6ff', a * 0.55);
    }
    if (L.th.antenna && L.th.skyline === 'city') draw.glow(ctx, L.antenna[0], L.antenna[1], 7, L.th.antenna, ((t % 1.6) < 0.5 ? 1 : 0.15) * 0.8);
    if (L.th.fx) drawSkyFx(ctx, L, L.th, t, bt);   // the theme's sky motion (bats, searchlights, shooting stars, fireworks)
    if (SP.fx) {   // the theme's tubes / glows pulse on the beat (neon flickers now and then); dark once the room is shut
      const fl = L.th.fx === 'neon' && noise1(t * 2.3 + 7) > 0.86 ? 0.45 : 1;
      blitAdd(ctx, SP.fx, -P, -P, W + P * 2, H + P * 2, (0.62 + 0.38 * pulse) * fl * shutK());
    }
    drawRoom(ctx, bt, ph, pulse);
    drawLayer(ctx, OLD.overlay, SP.overlay, L.win.x - 4, L.win.y - 4, L.win.w + 8, L.win.h + 8);
    const sk = shutK();
    const cg = celebT < 1 && cm !== 0 ? (1 - celebT) * 0.16 * (cm === 2 ? TUNE.celebrate.gold.glow : 1) : 0;   // LAST CALL (none on a fail)
    draw.glow(ctx, L.win.x + L.win.w / 2, L.win.y + L.win.h * 0.6, L.win.w * 0.62, C.amber, ((0.08 + 0.05 * pulse) * roomDim + cg) * sk);
    // marquee bulbs chase on the 8ths; a wrong admit blacks them out a few times; SHUT DOWN kills them left to right (each
    // flares just before it pops)
    const B = L.bulbs, step = Math.floor(bt * TUNE.bulbs.chase), BT = TUNE.bulbs;
    const off = bulbOffT > 0 && (Math.floor(bulbOffT / BT.blinkT) & 1) === 0;
    if (!off) {
      for (let i = 0; i < B.n; i++) {
        let lit = ((i + step) % 3) === 0 ? 1 : BT.dim;
        if (shutT >= 0) {
          const u = shutT - bulbDieAt(i);
          if (u >= 0) continue;
          if (u > -TUNE.shut.flare) { lit = 1; draw.glow(ctx, B.xy[i * 2], B.xy[i * 2 + 1], 11, '#fff4d6', 0.85); }
        }
        blitAdd(ctx, SP.bulb, B.xy[i * 2] - 7, B.xy[i * 2 + 1] - 7, 14, 14, lit);
      }
    }
    if (!L.lobby) {   // house number on the lintel + the sconce's glow + the door (the lobby is doorless)
      const SC = TUNE.sconce, N = SC.num, d = L.door;
      ctx.drawImage(SP.number, d.x + (d.w - N[0]) / 2, d.y + N[2] - N[1] / 2, N[0], N[1]);
      if (L.sconceOn) draw.glow(ctx, L.sconce[0], L.sconce[1], SC.glow, C.amber, 0.42 * lampFlick);
      drawDoor(ctx);
      if (L.doorSkin === 'neon') {   // the neon door frame breathes on the beat
        const d = L.door;
        draw.glow(ctx, d.x - 12, d.y + d.h * 0.5, 26, '#ff4fa3', 0.12 + 0.12 * pulse); draw.glow(ctx, d.x + d.w + 12, d.y + d.h * 0.5, 26, '#ff4fa3', 0.12 + 0.12 * pulse);
      }
    }
    // lamp: cone, lantern glow, moths
    blitAdd(ctx, SP.cone, L.coneX0, L.coneY0, 300, SP.cone.designH, TUNE.lamp.coneA * lampFlick);
    draw.glow(ctx, L.lamp.x, L.lamp.y, TUNE.lamp.glow, L.th.id === 'house' ? '#cfe0ff' : L.th.lamp, 0.75 * lampFlick);
    drawMoths(ctx);
    // the rope run, unless the scene draws it in depth order with drawMid
    if (!midSeen) drawRun(ctx);
  }
  // the back rope run + its two stanchions (their feet stand between the queue and the front guest)
  function drawRun(ctx) {
    if (L.lobby) return;
    const R = L.rope, hk = (TUNE.stanchion.foot - TUNE.stanchion.hook) * R.s;
    draw.shadowBlob(ctx, R.x1, R.feet + 1, 12, 3.6, 0.45);
    draw.shadowBlob(ctx, R.x2, R.feet + 1, 12, 3.6, 0.45);
    draw.sprite(ctx, SP.stanchion, R.x1, R.feet, STAN_OPTS(R.s));
    draw.sprite(ctx, SP.stanchion, R.x2, R.feet, STAN_OPTS(R.s));
    drawRope(ctx, R.x1 + 3 * R.s, R.feet - hk, R.x2 - 3 * R.s, R.feet - hk, TUNE.rope.sag + RP.d, R.s);
  }
  // the rope run in the rope skin (cosmetics-art.js strokeRope; the velvet house rope below)
  function drawRope(ctx, x1, y1, x2, y2, sag, s) {
    if (L.ropeSkin !== 'velvet') { strokeRope(ctx, L.ropeSkin, x1, y1, x2, y2, sag, s, beatNow()); return; }
    drawVelvet(ctx, x1, y1, x2, y2, sag, s);
  }
  // optional depth-correct pass: call between the queue guests and the front guest; from then on drawBack skips the run
  function drawMid(ctx) {
    checkLayout();
    midSeen = true;
    drawRun(ctx);
  }
  function drawDoor(ctx) {
    const d = L.door, open = door.open, PD = L.poolD, PO = TUNE.pool;
    // the amber pool on the cobbles: a leak under the shut door, a flood when it opens
    blitAdd(ctx, SP.pool, PD[0] - PD[2], PD[1] - PD[3], PD[2] * 2, PD[3] * 2, (PO.doorShut + (PO.doorOpen - PO.doorShut) * open + doorFlash * 0.2) * (0.94 + 0.06 * lampFlick));
    if (open > 0.01) {
      draw.glow(ctx, d.x + d.w / 2, d.y + d.h * 0.55, d.h * 0.75, C.amber, 0.55 * open + doorFlash * 0.4);
      blitAdd(ctx, SP.spill, L.spillX0, L.base - 2, 300, SP.spill.designH, Math.min(1, open * 1.1) * (0.92 + 0.08 * lampFlick));
    }
    drawLeaf(ctx);
  }
  // the leaf in perspective slices (hinge on the right, it swings out toward the street); shut = one blit
  function drawLeaf(ctx) {
    const d = L.door, a = doorAng;
    const cv = SP.leaf;
    if (a < 0.001) { ctx.drawImage(cv, d.x, d.y, d.w, d.h); return; }
    const N = TUNE.door.slices, pxW = cv.width / N, sw = d.w / N, hx = d.x + d.w;
    const ca = Math.cos(a), sa = Math.sin(a), eye = d.y + d.h * TUNE.door.eye, kp = TUNE.door.persp;
    for (let j = 0; j < N; j++) {
      const d0 = d.w - j * sw, d1 = d.w - (j + 1) * sw, dm = (d0 + d1) * 0.5, p = 1 + dm * sa * kp;
      const x0 = hx - d0 * ca, x1 = hx - d1 * ca, top = eye + (d.y - eye) * p;
      if (x1 - x0 < 0.05) continue;
      ctx.drawImage(cv, j * pxW, 0, pxW, cv.height, x0, top, x1 - x0 + 0.5, d.h * p);
    }
    if (a > 0.02) {
      // the leaf's edge + its shading as it turns away
      const p = 1 + d.w * sa * kp, x0 = hx - d.w * ca, top = eye + (d.y - eye) * p, th = Math.min(5, 6 * sa);
      ctx.fillStyle = '#6a430c'; ctx.fillRect(x0 - th, top, th, d.h * p);
      const g = ctx.globalAlpha;
      ctx.globalAlpha = g * 0.4 * sa; ctx.fillStyle = '#0a0618';
      ctx.fillRect(x0, top, hx - x0, d.h * p);
      ctx.globalAlpha = g;
    }
  }
  function drawMoths(ctx) {
    const lx = L.lamp.x, ly = L.lamp.y;
    ctx.fillStyle = 'rgba(240,236,220,0.85)';
    for (let i = 0; i < TUNE.lamp.moths; i++) {
      const o = i * 3, sp = MOTH[o + 1], ang = MOTH[o] + t * sp;
      const x = lx + Math.cos(ang) * (14 + 6 * Math.sin(t * 0.9 + i)) + noise1(t * 2.2 + MOTH[o + 2]) * 5;
      const y = ly - 2 + Math.sin(ang * 1.3) * 10 + noise1(t * 2 + MOTH[o + 2] + 9) * 4;
      const f = 0.4 + 0.6 * Math.abs(Math.sin(t * 34 + i * 1.7));
      draw.ellipse(ctx, x - 1.3, y, 1.5 * f, 1.1); ctx.fill();
      draw.ellipse(ctx, x + 1.3, y, 1.5 * f, 1.1); ctx.fill();
    }
  }
  function drawVelvet(ctx, x1, y1, x2, y2, sag, s) {
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5 + sag * 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2);
    const RT = TUNE.rope;
    ctx.strokeStyle = RT.ink; ctx.lineWidth = 7.8 * s; ctx.stroke();
    ctx.strokeStyle = RT.col; ctx.lineWidth = 4.8 * s; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1 - 1.3 * s); ctx.quadraticCurveTo(mx, my - 1.3 * s, x2, y2 - 1.3 * s);
    ctx.strokeStyle = RT.hi; ctx.lineWidth = 1.2 * s; ctx.stroke();
    // brass clips at both ends
    ctx.fillStyle = C.brass;
    draw.circle(ctx, x1, y1, 2.6 * s); ctx.fill(); draw.circle(ctx, x2, y2, 2.6 * s); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.brassInk;
    draw.circle(ctx, x1, y1, 2.6 * s); ctx.stroke(); draw.circle(ctx, x2, y2, 2.6 * s); ctx.stroke();
  }

  function drawRoom(ctx, bt, ph, pulse) {
    const w = L.win, k = L.k, R = L.room, sk = shutK();
    ctx.save();
    ctx.clip(L.clip);
    drawLayer(ctx, OLD.roomBack, SP.roomBack, w.x, w.y, w.w, w.h);
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(k, k);
    // disco specks on the wall + floor
    const spk = L.decor >= 2 ? specK() : 0;
    if (spk > 0) {
      for (let i = 0; i < TUNE.specks; i++) {
        const o = i * 5, x = ((SPECK[o] + specPh * SPECK[o + 2]) % 1) * (L.RW + 20) - 10;
        const y = 8 + SPECK[o + 1] * (L.RH - 14), a = 0.35 + 0.35 * Math.sin(t * 5 + i);
        draw.glow(ctx, x, y, SPECK[o + 3] * 1.6, SPECK[o + 4] === 0 ? '#ffffff' : SPECK[o + 4] === 1 ? '#ffd6f0' : '#d6f6ff', a * roomDim * sk * spk);
      }
    }
    // beat-lit floor tiles
    const T = L.tiles;
    for (let i = 0; i < T.n; i++) {
      const v = tileV[i];
      if (v <= 0.02) continue;
      draw.glow(ctx, T.cx[i], T.cy[i], T.w[i] * 0.9, L.th.room.tiles[tileC[i]], v * 0.55);
    }
    // the picture (tilts more with every wrong admit)
    drawPivot(ctx, SP.picture, R.picX, R.picY, 30, 42, 15, 2, PT.a);
    // neon (decor 6)
    if (SP.neon && neonK() > 0) {
      const tb = signTube(L.th), fl = (tb ? (noise1(t * 3.1) > 0.78 ? 0.25 : 0.85 + 0.15 * Math.sin(t * 50)) : 1) * neonK();
      ctx.globalAlpha = tb ? fl : Math.min(1, fl * 2);
      ctx.drawImage(SP.neon, R.neonX - 24, R.neonY - 20, 48, 40);
      ctx.globalAlpha = 1;
      draw.glow(ctx, R.neonX, R.neonY, 30, L.th.room.signCol, (tb ? 0.32 : 0.26) * fl);
    }
    // chandelier pendulum + candle glows
    drawChandelier(ctx, R);
    // disco ball (decor 2)
    if (L.decor >= 2) drawDisco(ctx, R);
    // DJ + booth
    drawDJ(ctx, R, bt, ph);
    // unlock spotlight beam (behind the dancers, so the newcomer pops against it); LAST CALL's encore sweep
    if (SPOT.a > 0.01) drawSpotBeam(ctx);
    if (encT < TUNE.celebrate.encore.sweep) drawSweep(ctx);
    if (DR.on) drawRevealPool(ctx);   // the decor reveal's light pool on the new piece
    // stage backlights: a soft glow behind each band member's instrument so it reads against the dark wall (the crowd on
    // the floor gets none)
    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i];
      if (d.wait > 0 || !d.band) continue;
      draw.glow(ctx, d.x, d.y - 30 * d.s / 0.36, 26 * d.s / 0.36, BACKLIGHT[d.instrument] || C.amber, 0.2 * roomDim * sk);
    }
    ctx.restore();
    // dancers back to front (the newcomer of an unlock on top of everyone), the plants, the cannons, then the standing
    // lamp, always in front, so a wrong admit's fall is never hidden by the band
    let hero = null;
    for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; if (d.big && !hero) hero = d; else drawDancer(ctx, d, bt); }
    if (hero) drawDancer(ctx, hero, bt);
    if (crowdN > 0) { ctx.save(); ctx.translate(w.x, w.y); ctx.scale(k, k); drawCrowd(ctx, bt); ctx.restore(); }
    if (DR.on && DR.lv === 3) drawPlantsPop(ctx);
    else drawLayer(ctx, OLD.roomFront, SP.roomFront, w.x, w.y, w.w, w.h);
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(k, k);
    if (SP.cannon) {   // (mirrored on the right; both pop up from their base through their decor reveal)
      for (let s = 0; s < 2; s++) {
        const p = popOf(5, s), kick = s ? cannonKick1 : cannonKick0;
        if (p <= 0) continue;
        ctx.save(); ctx.translate(R.cannons[s * 2], R.cannons[s * 2 + 1]); ctx.scale(s ? -p : p, p);
        drawPivot(ctx, SP.cannon, 0, 0, 22, 24, 11, 22, -0.1 * kick, 1 - 0.25 * kick);
        ctx.restore();
      }
    }
    drawStandLamp(ctx, R);
    drawParticles(ctx);
    if (DR.on) drawRevealDim(ctx);
    if (SPOT.a > 0.01) drawSpotDim(ctx);
    if (roomDim < 0.99) { ctx.globalAlpha = (1 - roomDim) * 2; ctx.fillStyle = '#0a0210'; ctx.fillRect(0, 0, L.RW, L.RH); ctx.globalAlpha = 1; }
    // LAST CALL: an additive amber wash + a pink bloom from the floor, peaking at flashA and decaying (outQuad); no white.
    // A gold night's is brighter with a gold bloom, a fail's a faint cream wash
    const CB = TUNE.celebrate;
    if (celebT < CB.flash || encT < CB.flash) {   // (the encore's is a smaller copy)
      const fk = cm === 2 ? CB.gold.flash : cm === 0 ? CB.rope.flash : 1, bloom = cm === 2 ? CB.gold.bloom : cm === 0 ? CB.rope.bloom : '#ff4fa3';
      const fa = fk * (celebT < CB.flash ? CB.flashA * (1 - easeIndex.outQuad(celebT / CB.flash)) : CB.flashA * CB.encore.flash * (1 - easeIndex.outQuad(encT / CB.flash)));
      const op = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fa * 0.6; ctx.fillStyle = cm === 0 ? CB.rope.bloom : C.amber; ctx.fillRect(0, 0, L.RW, L.RH);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = op;
      draw.glow(ctx, L.RW / 2, L.RH, L.RW * 0.75, bloom, fa * 1.2);
      draw.glow(ctx, L.RW / 2, L.RH * 0.3, L.RW * 0.6, cm === 2 ? CB.gold.bloom : '#ffb347', fa);
    }
    // wrong admit: the glass pulses red
    if (redT > 0) {
      ctx.globalAlpha = TUNE.degrade.redA * (redT / TUNE.degrade.red); ctx.fillStyle = '#e0102e'; ctx.fillRect(0, 0, L.RW, L.RH); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  }
  // the unlock spotlight (room units): a beam from the arch top onto the slot + a pool on the floor, drawn behind the
  // dancers; after them the room darkens everywhere but the beam
  function spotGeom() {
    const si = SPOT.slot, G = SG, D = SPOT.d;
    if (D) { G.tx = D.x; G.ty = D.y + 3; }
    else { G.tx = si >= 0 ? SX[si] : L.room.cx; G.ty = (si >= 0 ? SY[si] : L.room.cy) + 3; }
    G.ax = L.RW / 2 + (G.tx - L.RW / 2) * 0.25; G.ay = 0;
    const dx = G.tx - G.ax, dy = G.ty - G.ay;
    G.len = Math.sqrt(dx * dx + dy * dy); G.th = Math.atan2(-dx, dy); G.ct = Math.cos(G.th); G.st = Math.sin(G.th);
    return G;
  }
  function drawSpotBeam(ctx) {
    const G = spotGeom(), a = SPOT.a;
    ctx.save(); ctx.translate(G.ax, G.ay); ctx.rotate(G.th);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * TUNE.unlock.cone;
    ctx.drawImage(SP.spot, -SPOT_BOT, 0, SPOT_BOT * 2, G.len);
    ctx.restore();
    draw.glow(ctx, G.tx, G.ty, 32, C.amber, 0.42 * a);
  }
  // LAST CALL's encore sweep (room units, additive, behind the dancers): two hot pink-white beams hung either side of
  // the arch's crown swing from outward to across the room and cross, fading in and out over the sweep, each with a
  // pool where it lands on the floor
  function drawSweep(ctx) {
    const E = TUNE.celebrate.encore, u = clamp(encT / E.sweep, 0, 1), e = easeIndex.inOutSine(u), a = Math.sin(Math.PI * u) * E.beamA;
    if (a < 0.01) return;
    const floor = L.RH - 4, g = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    for (let s = -1; s <= 1; s += 2) {
      const ax = L.RW / 2 + s * E.beamX, ay = archTopR(ax), th = -s * lerp(E.swing[0], E.swing[1], e);
      const c = Math.cos(th), len = (floor - ay) / Math.max(0.3, c), lx = ax - Math.sin(th) * len;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(th);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = g * a;
      ctx.drawImage(cm === 2 ? SP.sweepGold : SP.sweep, -SPOT_BOT * 0.8, 0, SPOT_BOT * 1.6, len);   // gold-white on a gold night
      ctx.restore();
      ctx.globalAlpha = g;
      draw.glow(ctx, lx, floor, 30, cm === 2 ? '#ffd166' : '#ff7ac8', 0.5 * a);
    }
    ctx.globalCompositeOperation = op;
  }
  function drawSpotDim(ctx) {
    const G = spotGeom(), ax = G.ax, ay = G.ay, ct = G.ct, st = G.st, len = G.len;
    ctx.globalAlpha = SPOT.a * TUNE.unlock.dim * 1.6; ctx.fillStyle = '#0a0210';
    ctx.beginPath(); ctx.rect(-2, -2, L.RW + 4, L.RH + 4);
    ctx.moveTo(ax - SPOT_TOP * ct, ay - SPOT_TOP * st); ctx.lineTo(ax + SPOT_TOP * ct, ay + SPOT_TOP * st);
    ctx.lineTo(ax + SPOT_BOT * ct - len * st, ay + SPOT_BOT * st + len * ct); ctx.lineTo(ax - SPOT_BOT * ct - len * st, ay - SPOT_BOT * st + len * ct);
    ctx.closePath(); ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }
  // sprite of design size (w, h) whose pivot (px, py) sits at (x, y), rotated by rot, squashed along y by sy
  function drawPivot(ctx, cv, x, y, w, h, px, py, rot, sy) {
    ctx.save(); ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (sy !== undefined && sy !== 1) ctx.scale(2 - sy, sy);
    ctx.drawImage(cv, -px, -py, w, h);
    ctx.restore();
  }
  function drawChandelier(ctx, R) {
    const px = R.chandX, py = R.chandY, ch = R.chain, a = CH.a, ca = Math.cos(a), sa = Math.sin(a);
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 2.2; ctx.setLineDash(DASH); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ch); ctx.stroke(); ctx.setLineDash(NODASH);
    ctx.strokeStyle = L.th.id === 'house' ? C.brass : L.th.room.metal; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ch); ctx.stroke();
    const cs = R.chandS;
    ctx.drawImage(SP.chand, -33 * cs, ch - 8 * cs, 66 * cs, 42 * cs);
    ctx.restore();
    const flick = level >= 3 ? (noise1(t * 9) > 0.3 ? 0.35 : 1) : 1, G = TUNE.celebrate.gold;
    // a gold night's LAST CALL: the candles flare up and settle back over flareT
    const flare = cm === 2 && celebT < G.flareT ? G.flare * (1 - celebT / G.flareT) : 0;
    for (let i = 0; i < 4; i++) {
      const lx = CHAND_TIPS[i * 2] * R.chandS, ly = ch + CHAND_TIPS[i * 2 + 1] * R.chandS;
      const x = px + lx * ca - ly * sa, y = py + lx * sa + ly * ca;
      draw.glow(ctx, x, y, 9 * (1 + flare * 0.6), L.th.id === 'house' ? '#ffcf7a' : L.th.room.light, 0.8 * flick + flare * 0.3);
    }
    const bx = px - (ch + 14 * R.chandS) * sa, by = py + (ch + 14 * R.chandS) * ca;
    draw.glow(ctx, bx, by, 46 * (1 + flare * 0.5), L.th.id === 'house' ? C.amber : L.th.room.light, (0.3 + flare * 0.35) * flick * roomDim);
  }
  function drawDisco(ctx, R) {
    // its decor reveal: the ball drops in from above the arch on its cord and bounces (outBack); hidden until then
    let drop = 1;
    if (DR.on && DR.lv === 2) { const u = revU(0); if (u <= 0) return; drop = easeIndex.outBack(u); }
    const x = R.discoX, y0 = R.discoY, cy = y0 - 14 + (R.cord + 24) * drop;
    ctx.strokeStyle = 'rgba(30,20,40,0.9)'; ctx.lineWidth = 0.8;
    if (cy - 10 > y0) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, cy - 10); ctx.stroke(); }
    const f = Math.floor(discoPh) % 3;
    ctx.drawImage(f === 0 ? SP.disco0 : f === 1 ? SP.disco1 : SP.disco2, x - 12, cy - 12, 24, 24);
    for (let i = 0; i < glint.length; i++) {
      if (glint[i] <= 0.02) continue;
      const gx = x + Math.cos(i * 2.1) * 6, gy = cy + Math.sin(i * 1.7) * 6;
      draw.glow(ctx, gx, gy, 6, '#ffffff', glint[i]);
    }
    draw.glow(ctx, x, cy, 18, '#c8d8ff', 0.18);
  }
  function drawDJ(ctx, R, bt, ph) {
    // dj = s since the SHUT DOWN pop of the booth's light (< 0 before it; the EQ strobes over the last djFlick s)
    const S = TUNE.shut, dj = shutT >= 0 ? shutT - S.dj : -9, popped = djPopped, flick = !popped && dj > -S.djFlick;
    const x = R.chandX, g = popped ? 0.3 : GL.v, groove = popped ? 0 : 1 - Math.min(1, g * 1.4);
    const slump = popped ? S.slump * easeIndex.outBack(Math.min(1, dj / 0.35)) : 0;
    const nod = (1 - ph) * (1 - ph) * 2.4 * groove, top = R.djTop + nod + slump;
    // pumping back arm (behind the booth), drawn first
    const pump = groove * Math.max(0, Math.sin(bt * Math.PI));
    const shx = x - 14, shy = top + 32;
    const hx = lerp(x - 20, x - 24, pump), hy = lerp(top + 40, top + 10, pump) + g * 4;
    drawArm(ctx, shx, shy, hx, hy);
    ctx.drawImage(SP.dj, x - 26, top, 52, 48);
    // eye: pupil, lid, brow
    const ex = x, ey = top + 22;
    const lx = popped ? 0 : g > 0.3 ? 1.3 : Math.sin(t * 0.8) * 2, ly = popped || g > 0.3 ? 3 : 0.8 + Math.sin(t * 0.5) * 0.6;
    ctx.fillStyle = g > 0.3 ? '#3a0816' : '#1a0a1e';
    draw.circle(ctx, ex + lx, ey + ly, lerp(4, 2.8, g)); ctx.fill();
    ctx.fillStyle = '#ffffff'; draw.circle(ctx, ex + lx - 1.2, ey + ly - 1.4, 1.1); ctx.fill();
    // the lid: a thin cap at rest, a hard V (an angry squint) when glaring, shut on a blink, half shut and level once the
    // shut-down room has popped its last light (the DJ gives up)
    const ve = blink > 0 ? 10 : popped ? -0.5 : -7.5 + g * 3, vm = blink > 0 ? 10 : popped ? 0.5 : -7.5 + g * 8.5;
    ctx.save(); draw.circle(ctx, ex, ey, 8.4); ctx.clip();
    ctx.fillStyle = '#c74a8e';
    ctx.beginPath(); ctx.moveTo(ex - 10, ey - 10); ctx.lineTo(ex + 10, ey - 10); ctx.lineTo(ex + 10, ey + ve); ctx.lineTo(ex, ey + vm); ctx.lineTo(ex - 10, ey + ve); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a0f33'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ex - 10, ey + ve); ctx.lineTo(ex, ey + vm); ctx.lineTo(ex + 10, ey + ve); ctx.stroke();
    ctx.restore();
    if (g > 0.05 && !popped) {
      ctx.strokeStyle = '#3a0a26'; ctx.lineWidth = 1.2 + g * 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 11, ey + ve - 3.5); ctx.lineTo(ex, ey + vm - 2.5); ctx.lineTo(ex + 11, ey + ve - 3.5); ctx.stroke();
    }
    // mouth: grin while grooving, a flat scowl when glaring (and once it gave up)
    const my = top + 36;
    if (g < 0.35 && !popped) {
      ctx.fillStyle = '#3a0820';
      ctx.beginPath(); ctx.moveTo(x - 7, my - 1); ctx.quadraticCurveTo(x, my + 7 + nod * 0.6, x + 7, my - 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4.5, my - 1, 3, 2.2); ctx.fillRect(x + 1.5, my - 1, 3, 2.2);
    } else {
      ctx.strokeStyle = '#3a0820'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 6, my + 2); ctx.quadraticCurveTo(x, my - 1.5, x + 6, my + 2); ctx.stroke();
    }
    // the club theme's hat (cosmetics-art paintDJHat) sits over the brow, nodding with the head
    if (SP.djHat) ctx.drawImage(SP.djHat, x - 26 + DJ_HAT_BOX[0], top + DJ_HAT_BOX[1], DJ_HAT_BOX[2], DJ_HAT_BOX[3]);
    // scratching arm (front) on the right turntable
    const sx = x + 14, sy = top + 32, tx = x + 18 + Math.sin(t * 11) * 3.5 * groove, ty = R.boothTop + 2;
    const bx = x - 31, by = R.boothTop - 3;
    ctx.drawImage(SP.booth, bx, by, 62, 28);
    // the platters spin (a white label dot running round each record), the scratch hand rocks the right one
    for (let s = 0; s < 2; s++) {
      const a = platPh * (s ? 1 : 1.03) + s * 2.1 + (s ? Math.sin(t * 11) * 0.6 * groove : 0);
      const lx = bx + (s ? 45 : 17) + Math.cos(a) * 6.4, ly = by + 6.5 + Math.sin(a) * 2.05;
      ctx.fillStyle = '#ffffff'; draw.circle(ctx, lx, ly, 1.6); ctx.fill();
      ctx.lineWidth = 0.7; ctx.strokeStyle = '#0b0a22'; ctx.stroke();
    }
    drawArm(ctx, sx, sy, tx, ty);
    // the 5-bar LED equaliser on the panel: segments green -> amber -> red, jumping on the beat pulse (dead when glaring)
    const BO = TUNE.booth, pulse = (1 - ph) * (1 - ph), ex0 = bx + 6.2, ey0 = by + 24.2;
    for (let i = 0; i < BO.bars; i++) {
      const lv = groove * clamp(0.18 + 0.55 * pulse * EQ_SHAPE[i] + 0.3 * Math.abs(Math.sin(bt * Math.PI * (1.5 + i * 0.37) + i * 1.7)), 0, 1);
      const n = flick ? (Math.random() < 0.5 ? BO.segs : (Math.random() * 3) | 0) : Math.round(lv * BO.segs);   // the dying strobe
      for (let j = 0; j < BO.segs; j++) {
        ctx.fillStyle = j < n ? EQ_COL[j] : '#24204e';
        ctx.fillRect(ex0 + i * 3.4, ey0 - j * 2.6 - 1.9, 2.5, 1.9);
      }
    }
    if (flick) draw.glow(ctx, ex0 + 8, ey0 - 6, 14, '#ffd27a', 0.25 + 0.35 * Math.random());
    if (popped) {   // the popped EQ: a soot-black well, a white-hot flash as it goes
      ctx.fillStyle = 'rgba(6,3,12,0.62)'; draw.roundRect(ctx, bx + 4.8, by + 10.6, 19.8, 15, 1.6); ctx.fill();
      if (djFlashT > 0) draw.glow(ctx, ex0 + 8, ey0 - 6, 26, '#fff4d6', djFlashT / S.djFlash);
    }
    if (g > 0.5) draw.glow(ctx, ex, ey, 14, '#ff3355', (g - 0.5) * 0.6);
  }
  function drawArm(ctx, x1, y1, x2, y2) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#4a0f33'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#c74a8e'; ctx.lineWidth = 3.6; ctx.stroke();
    ctx.fillStyle = '#c74a8e'; draw.circle(ctx, x2, y2, 3.3); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#4a0f33'; ctx.stroke();
  }
  // the standing lamp in the free right corner: it topples right toward the jamb (its foot skidding left), so the shade
  // lands in the corner in front of everyone; the bulb glow follows the shade
  function drawStandLamp(ctx, R) {
    const a = LF.a, lit = LF.down ? LF.lit : 1, bx = R.lampX + LF.dx, by = R.lampY + LF.dy;
    draw.shadowBlob(ctx, bx + Math.sin(a) * 18, by + 1, 10 + Math.sin(a) * 18, 2.6, 0.45);
    drawPivot(ctx, SP.standLamp, bx, by, 30, 72, 15, 70, a);
    if (lit > 0.02) {
      const ly = TUNE.room.lamp.glowY;
      draw.glow(ctx, bx - ly * Math.sin(a), by + ly * Math.cos(a), 26, C.amber, 0.6 * lit * roomDim);
    }
  }
  // where the shade is (room units) once the lamp lies in the corner
  function lampShade(out) {
    const LFT = TUNE.lampFall, R = L.room, a = LFT.angle, ly = TUNE.room.lamp.glowY;
    out.x = R.lampX + LFT.slide[0] - ly * Math.sin(a); out.y = R.lampY + LFT.slide[1] + ly * Math.cos(a);
    return out;
  }
  // the shade hits the floor: sparks + a smoke puff where it lands, and the nearest dancer jerks away from it
  function lampImpact() {
    const LFT = TUNE.lampFall, P = lampShade(LSH);
    for (let i = 0; i < LFT.sparks; i++) spawn(3, P.x + (Math.random() - 0.5) * 14, P.y - 2, (Math.random() - 0.7) * 130, -40 - Math.random() * 90, 0.45 + Math.random() * 0.4, 1, 0);
    puffSmoke(P.x - 4, P.y, 5, false);
    let best = null, bd = 1e9;
    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i], dx = d.x - P.x, dy = d.y - P.y, dd = dx * dx + dy * dy;
      if (d.wait <= 0 && dd < bd) { bd = dd; best = d; }
    }
    if (best) best.actor.nudge(LFT.nudge, -LFT.nudge * 0.3);
  }
  // pop-in scale: 0 -> peak (outCubic over the first 60 %) -> 1 (a soft settle), u = 0..1 over TUNE.admit.pop
  function popK(u) {
    if (u >= 1) return 1;
    const pk = TUNE.admit.peak;
    if (u < 0.6) { const v = 1 - u / 0.6; return Math.max(0.04, pk * (1 - v * v * v)); }
    return pk - (pk - 1) * (0.5 - 0.5 * Math.cos(Math.PI * (u - 0.6) / 0.4));
  }
  // an admit's pop-in (t = s since it appeared): a damped spring from admit.from up to 1 (admit.k / c), settled by
  // admit.settle (the analytic underdamped step response, so it is dt-exact and stateless)
  function popSpring(t) {
    const A = TUNE.admit;
    if (t >= A.settle) return 1;
    const w0 = Math.sqrt(A.k), z = Math.min(0.99, A.c / (2 * w0)), wd = w0 * Math.sqrt(1 - z * z);
    return 1 - (1 - A.from) * Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  function drawDancer(ctx, d, bt) {
    if (d.wait > 0) return;
    const w = L.win, k = L.k, pk = d.big ? popK(d.age / TUNE.admit.pop) : popSpring(d.age), live = level < 3;
    const sc = d.s * k * pk;
    let y = d.y;
    if (d.hop > -9) {
      const u = d.hop / d.hopDur;
      if (u >= 0 && u < d.hopN) y -= d.hopH * Math.sin((u % 1) * Math.PI);
    }
    const sx = w.x + d.x * k, sy = w.y + y * k, spot = d.big && SPOT.d === d;
    AO.flip = d.x > L.RW / 2; AO.alpha = 1;
    if (spot) AO.light.door = TUNE.unlock.rim;   // the spotlit newcomer keeps its colour with a warm rim, no white wash
    const ks = d.s * k * pk, fy = w.y + d.y * k, f = AO.flip ? -1 : 1;
    const kickCv = d.kickCv || SP.kick, keysCv = d.keysCv || SP.keys;
    if (d.kit === 1) {   // the hi-hat stands beside the drummer on its back side (behind the body's edge)
      const KT = TUNE.kick, ph = bt - Math.floor(bt), o = ph - 0.5, open = live && o >= 0 && o < 0.3 ? 1 - o / 0.3 : 0;
      const hx = sx + KT.hatX * ks * f;
      draw.shadowBlob(ctx, hx, fy + ks, 8 * ks, 2 * ks, 0.4);
      ctx.drawImage(SP.hat, hx + HAT_BOX[0] * ks, fy + HAT_BOX[1] * ks, HAT_BOX[2] * ks, HAT_BOX[3] * ks);
      const ty = fy - (KT.hatY + 1.6 + KT.tick * open * open) * ks;
      ctx.drawImage(SP.hatTop, hx + HATTOP_BOX[0] * ks, ty + HATTOP_BOX[1] * ks, HATTOP_BOX[2] * ks, HATTOP_BOX[3] * ks);
    } else if (d.kit === 2) draw.shadowBlob(ctx, sx, fy + ks, 34 * ks, 3.2 * ks, 0.4);
    d.actor.draw(ctx, sx, sy, sc, AO);
    AO.light.door = 0.3;
    if (d.kit === 1) {   // the kick stands in front of the drummer on its own floor line (it never hops with the body)
      const KT = TUNE.kick, q = 1 - (bt - Math.floor(bt)), th = live ? q * q * q * q * KT.thump : 0, kf = fy + (KT.R - KT.y) * ks;
      draw.shadowBlob(ctx, sx, kf + ks, KT.R * 1.3 * ks, 3.6 * ks, 0.55);
      ctx.save(); ctx.translate(sx, kf); ctx.scale(f * (1 + th), 1 - th);
      ctx.drawImage(kickCv, KICK_BOX[0] * ks, (KICK_BOX[1] - KT.R + KT.y) * ks, KICK_BOX[2] * ks, KICK_BOX[3] * ks);
      ctx.restore();
      if (th > 0.01) draw.glow(ctx, sx, fy - KT.y * ks, KT.R * ks * 1.3, '#ffd27a', th * 3.5);
    } else if (d.kit === 2) {   // the keyboard on its X stand, in front of the keys player's belly
      ctx.save(); ctx.translate(sx, fy); if (f < 0) ctx.scale(-1, 1);
      ctx.drawImage(keysCv, KEYS_BOX[0] * ks, KEYS_BOX[1] * ks, KEYS_BOX[2] * ks, KEYS_BOX[3] * ks);
      ctx.restore();
    }
  }
  // the crowd silhouette along the sill (play; room units, the caller scales by k; TUNE.crowd): each place the back of a
  // head in its species' shape with its hat, a hand up on the off-bars for every other one; drawn twice, first in its
  // own colour shifted up (the stage light rimming it from behind), then in the deep fill. It bobs on the beat out of
  // step (still once the room is shut), jumps through LAST CALL, and a newcomer rises in from under the sill (outBack)
  function drawCrowd(ctx, bt) {
    const CR = TUNE.crowd, RH = L.RH, live = level < 3, b0 = Math.floor(bt), ph = bt - b0;
    const cj = celebT < 1.2 && cm !== 0 ? 1 - celebT / 1.2 : 0, EN = TUNE.celebrate.encore;   // (a fail's crowd stays put)
    // the encore: the whole crowd jumps at once (one arc over the band's hop time)
    const ej = encT < EN.hopDur ? Math.sin(encT / EN.hopDur * Math.PI) * EN.crowd : 0;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < crowdN; i++) {
      const si = CRW.sp[i], hd = CR.head[si], bw = hd[0], r = bw * hd[1], x = CR.x[i], age = CRW.age[i];
      const rise = age < CR.pop ? easeIndex.outBack(age / CR.pop) : 1;
      const up = lerp(CR.up[0], CR.up[1], ((i * 5) % 4) / 3) + (si === 1 ? CR.tall : 0);
      const bob = live ? (0.5 + 0.5 * Math.sin((bt + i * 0.37) * TAU)) * CR.bob : 0;
      const jump = (cj > 0 ? cj * Math.abs(Math.sin((celebT * 2.6 + i * 0.29) * Math.PI)) * 6 : 0) + ej;
      const y0 = RH - (up + bob + jump) * rise;
      const side = (i & 2) ? -1 : 1, arm = live && rise >= 1 && (((b0 >> 1) + i) & 1) === 1 && ph < CR.arm ? Math.sin(ph / CR.arm * Math.PI) : 0;
      for (let pass = 0; pass < 2; pass++) {
        const dy = pass ? 0 : -CR.rimW, y = y0 + dy, col = pass ? CRW.fill[i] : CRW.rim[i];
        ctx.fillStyle = col; ctx.strokeStyle = col;
        if (arm > 0.02) {   // a hand thrown up from the shoulder (a round mitten)
          const sx = x + side * bw * 0.36, ax = x + side * (bw * 0.5 + 3.5), ay = y - 3 - 9 * arm;
          ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(sx, y + up * 0.8); ctx.lineTo(ax, ay); ctx.stroke();
          ctx.beginPath(); ctx.arc(ax, ay - 0.8, 2.8, 0, TAU); ctx.fill();
        }
        draw.roundRect(ctx, x - bw / 2, y, bw, up + 34, r); ctx.fill();
        const hat = CRW.hat[i], hx = x + (si === 1 ? 0 : bw * 0.08);
        if (hat === 1) {          // party cone + pom
          ctx.beginPath(); ctx.moveTo(hx - 4.4, y + 2.4); ctx.lineTo(hx + 4.4, y + 2.4); ctx.lineTo(hx + 1.2, y - 9.5); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(hx + 1.2, y - 10, 1.8, 0, TAU); ctx.fill();
        } else if (hat === 2) {   // top hat: crown + brim
          draw.roundRect(ctx, hx - 3.7, y - 8.5, 7.4, 10, 1); ctx.fill();
          draw.roundRect(ctx, hx - 6.2, y - 0.4, 12.4, 2.2, 1); ctx.fill();
        } else if (hat === 3) {   // crown: three points with balls on their tips
          ctx.beginPath(); ctx.moveTo(hx - 5.4, y + 2.2); ctx.lineTo(hx - 5.8, y - 5); ctx.lineTo(hx - 2.6, y - 2.2); ctx.lineTo(hx, y - 6.4);
          ctx.lineTo(hx + 2.6, y - 2.2); ctx.lineTo(hx + 5.8, y - 5); ctx.lineTo(hx + 5.4, y + 2.2); ctx.closePath();
          ctx.moveTo(hx - 4.6, y - 5.4); ctx.arc(hx - 5.8, y - 5.4, 1.2, 0, TAU);
          ctx.moveTo(hx + 1.2, y - 6.9); ctx.arc(hx, y - 6.9, 1.2, 0, TAU);
          ctx.moveTo(hx + 7, y - 5.4); ctx.arc(hx + 5.8, y - 5.4, 1.2, 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  function drawParticles(ctx) {
    for (let i = 0; i < PP.length; i++) {
      const p = PP[i];
      if (!p.on) continue;
      const u = p.t / p.life;
      if (p.k === 0) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.t * 11 + p.ph));
        ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        ctx.fillStyle = CONF[p.c]; ctx.fillRect(-p.s * 0.5, -p.s * 0.32, p.s, p.s * 0.64);
        ctx.restore();
      } else if (p.k === 1) {
        const a = (1 - u) * (0.6 + 0.4 * Math.sin(p.t * 30 + p.ph)), r = p.s * (1 - u * 0.5);
        draw.glow(ctx, p.x, p.y, r * 2.4, p.c === 1 ? '#ffd6f0' : p.c === 2 ? '#d6f6ff' : '#fff3c0', a);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff'; draw.star(ctx, p.x, p.y, r, 0.35, 4); ctx.fill();
        ctx.restore();
      } else if (p.k === 2) {
        const s = p.s * (1 + u * 1.6), a = Math.sin(u * Math.PI) * (p.c ? 0.55 : 0.38);
        ctx.globalAlpha = a; ctx.drawImage(SP.smoke, p.x - s, p.y - s, s * 2, s * 2);
        if (p.c) { ctx.globalAlpha = a * 0.5; ctx.drawImage(SP.smoke, p.x - s * 0.7, p.y - s * 0.7, s * 1.4, s * 1.4); }
        ctx.globalAlpha = 1;
      } else if (p.k === 4) {   // a colour dash flying out of the pop-in, shrinking along its path
        const len = p.s * (1 - u), cx = Math.cos(p.rot), sy = Math.sin(p.rot), fi = p.t < TUNE.admit.fadeIn ? p.t / TUNE.admit.fadeIn : 1;
        ctx.lineCap = 'round'; ctx.globalAlpha = (1 - u * u) * fi;
        ctx.beginPath(); ctx.moveTo(p.x - cx * len, p.y - sy * len); ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = '#1a0716'; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.k === 5) {   // a sticker star tumbling out
        const s = p.s * (u < 0.15 ? u / 0.15 : 1);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
        ctx.drawImage(SP.stars[p.c], -s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        const a = 1 - u;
        draw.glow(ctx, p.x, p.y, 4, '#ffd27a', a);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFront(ctx) {
    checkLayout();
    if (!L.lobby) {
      // the front segment: from the right stanchion forward to the big foreground stanchion
      const R = L.rope, ST = TUNE.stanchion, hk = (ST.foot - ST.hook);
      drawRope(ctx, R.x2 + 2 * R.s, R.feet - hk * R.s, R.fx - 3 * R.fs, R.ffeet - hk * R.fs, TUNE.rope.fsag + RP.fd, (R.s + R.fs) * 0.5);
      draw.shadowBlob(ctx, R.fx, R.ffeet + 1, 17, 5, 0.5);
      draw.sprite(ctx, SP.stanchion, R.fx, R.ffeet, STAN_OPTS(R.fs));
    }
    const bt = beatNow(), ph = bt - Math.floor(bt);
    const RY = L.rays;
    blitAdd(ctx, SP.rays, RY[0], RY[1], RY[2], RY[3], (0.75 + 0.25 * (1 - ph) * (1 - ph)) * roomDim * shutK());
    draw.glow(ctx, L.lamp.x, L.lamp.y, TUNE.lamp.fg, C.cool, 0.16 * lampFlick);
    if (!L.lobby && (door.open > 0.01 || doorFlash > 0)) draw.glow(ctx, L.door.x + L.door.w * 0.4, L.base - 30, 120, C.amber, 0.16 * door.open + doorFlash * 0.22);
    const IV = L.ivy, SL = L.shrubL, SR = L.shrubR;
    ctx.drawImage(SP.ivy, IV[0], IV[1], IV[2], IV[3]);
    if (SP.shrubL) ctx.drawImage(SP.shrubL, SL[0], SL[1], SL[2], SL[3]);
    if (SP.shrubR) ctx.drawImage(SP.shrubR, SR[0], SR[1], SR[2], SR[3]);
    // the topiaries' fairy lights twinkle on the beat (alternate bulbs flare on alternate beats, then fade)
    const FA = L.fairy, nf = TUNE.bush.fairy, bi = Math.floor(bt), fl = (1 - ph) * (1 - ph), TH = L.th, fc = TH.id === 'house' ? TUNE.bush.fairyCol : TH.fairy;
    for (let s = 0; s < (SP.shrubL ? 2 : 0); s++) {
      for (let i = 0; i < nf; i++) {
        const x = FA[s * 8 + i * 2], y = FA[s * 8 + i * 2 + 1];
        if (x < -900) continue;
        if (TH.flick) {   // a flame / candle: a warm glow that flickers (light only: the prop itself never moves)
          const f2 = 0.72 + 0.28 * noise1(t * 7.3 + i * 3.1 + s * 9);
          draw.glow(ctx, x, y, 16 * f2, fc, 0.42 * f2);
          draw.glow(ctx, x, y, 4.2, '#fff4dc', 0.55 * f2);
          continue;
        }
        const on = ((i + bi + s) & 1) ? fl : 0;
        draw.glow(ctx, x, y, 7 + 5 * on, fc, 0.35 + 0.55 * on);
        draw.glow(ctx, x, y, 2.6, '#fff4dc', 0.5 + 0.5 * on);
      }
    }
    if (sppCount > 0) drawStreet(ctx);
  }
  // the LAST CALL burst over the facade and the street (design units, no clip): confetti rectangles flutter (their width
  // flips with a cosine), ribbons curl (a wave travelling along a short strip), sticker stars tumble; all fade out late
  function drawStreet(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < SPP.length; i++) {
      const p = SPP[i];
      if (!p.on) continue;
      const u = p.t / p.life, a = u > 0.75 ? (1 - u) / 0.25 : 1;
      if (p.k === 3) {   // a sparkle: an additive glow + a white 4-point star
        const tw = (1 - u) * (0.6 + 0.4 * Math.sin(p.t * 30 + p.ph)), r = p.s * (1 - u * 0.4), op = ctx.globalCompositeOperation;
        draw.glow(ctx, p.x, p.y, r * 2.6, p.c === 1 ? '#ffe6a8' : '#fff3c0', tw);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = tw; ctx.fillStyle = '#ffffff';
        draw.star(ctx, p.x, p.y, r, 0.33, 4); ctx.fill();
        ctx.globalCompositeOperation = op; ctx.globalAlpha = 1;
        continue;
      }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = a;
      if (p.k === 0) {
        ctx.scale(1, p.rest > 0 ? p.flat : Math.cos(p.t * 9 + p.ph));
        ctx.fillStyle = CONF_DK[p.c]; ctx.fillRect(-p.s * 0.5 - 0.7, -p.s * 0.3 - 0.7, p.s + 1.4, p.s * 0.6 + 1.4);
        ctx.fillStyle = CONF[p.c]; ctx.fillRect(-p.s * 0.5, -p.s * 0.3, p.s, p.s * 0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-p.s * 0.5, -p.s * 0.3, p.s, p.s * 0.16);
      } else if (p.k === 1) {
        const L2 = p.s * 1.9, w = p.s * 0.45, ph = p.rest > 0 ? p.flat : p.t * 10 + p.ph;
        ctx.beginPath(); ctx.moveTo(-L2 * 0.5, Math.sin(ph) * w);
        ctx.quadraticCurveTo(-L2 * 0.25, Math.sin(ph + 1.6) * w * 2, 0, Math.sin(ph + 3.1) * w);
        ctx.quadraticCurveTo(L2 * 0.25, Math.sin(ph + 4.7) * w * 2, L2 * 0.5, Math.sin(ph + 6.2) * w);
        ctx.strokeStyle = CONF_DK[p.c]; ctx.lineWidth = 4.2; ctx.stroke();
        ctx.strokeStyle = CONF[p.c]; ctx.lineWidth = 2.6; ctx.stroke();
      } else {
        const s = p.s * (p.t < 0.12 ? p.t / 0.12 : 1);
        ctx.drawImage(SP.stars[p.c], -s, -s, s * 2, s * 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- actions
  function setBand(list) {
    while (dancers.length) removeDancer(dancers.length - 1, false);
    crowdN = 0; crowdNext = 0;   // a new band (a new night) empties the crowd at the sill too
    if (!list) return;
    for (let i = 0; i < list.length && dancers.length < nSlots; i++) {
      const it = list[i], spec = typeof it === 'string' ? HOUSE[it] : it;
      if (spec) addDancer(spec, false);
    }
  }
  function admit(src) {
    if (!src) return null;
    const spec = src.spec && typeof src.draw === 'function' ? src.spec : src;
    const d = addDancer(spec, true);
    RP.v += TUNE.rope.kick; RP.fv += TUNE.rope.kick * 0.6;
    return d;
  }
  function degrade(lv) {
    lv = clamp(lv | 0, 0, 3);
    if (lv <= 0) { resetDamage(); return; }
    const R = L.room, DG = TUNE.degrade;
    for (let l = level + 1; l <= lv; l++) {
      if (!LF.down) { LF.down = true; LF.t = 0; LF.lit = 1; LF.hit = false; }   // sparks + smoke at its impact (lampImpact)
      PT.v += TUNE.picture.kick;
      CH.v += TUNE.chand.degrade * (CH.v >= 0 ? 1 : -1);
      if (l >= 2) puffSmoke(R.chandX, R.boothTop, 3, l >= 3);
    }
    if (lv > level) {
      // the whole room reacts: every dancer flinches (staggered) and drops the groove for a beat, the marquee blacks out,
      // the glass pulses red, the disco ball dies and winds back up, the floor goes dark for a beat
      // (level 3 = SHUT DOWN: instead of the blackout blinks the marquee dies bulb by bulb, the band slumps after the flinch)
      for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; if (d.wait <= 0) d.fl = Math.random() * DG.stagger; }
      bulbOffT = lv >= 3 ? 0 : TUNE.bulbs.blinks * 2 * TUNE.bulbs.blinkT; redT = DG.red; spinHold = DG.spinBack; tileHold = DG.tileHold;
      for (let i = 0; i < 64; i++) tileV[i] = 0;
      if (lv >= 3 && shutT < 0) { shutT = 0; shutN = 0; encBeat = -1; }
    }
    GL.v = 1;
    level = lv;
  }
  function resetDamage() {
    const wasShut = level >= 3;
    level = 0; LF.down = false; LF.t = -1; LF.a = 0; LF.lit = 1; LF.dx = 0; LF.dy = 0; LF.hit = false; GL.v = 0; smokeAcc = 0;
    bulbOffT = 0; redT = 0; spinHold = 0; tileHold = 0; shutT = -1; shutN = 0; djPopped = false; djFlashT = 0;
    for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; d.fl = -1; if (wasShut) settle(d.actor); }   // the band plays again
    PT.v -= 1;
  }
  function reset(clearBand) {
    resetDamage();
    celebT = 9; encBeat = -1; encWait = -1; encT = 9; doorAng = 0; DA.on = false; door.open = 0; doorFlash = 0; doorPopT = -1;
    cm = -1; goldShare = 0;
    if (DR.on) endReveal();   // a reveal still running shows its piece at once
    CH.a = 0; CH.v = 0; RP.d = RP.v = RP.fd = RP.fv = 0; SPOT.t = -1; SPOT.hold = false; SPOT.a = 0; SPOT.d = null;
    for (let i = 0; i < PP.length; i++) PP[i].on = false;
    for (let i = 0; i < SPP.length; i++) SPP[i].on = false;
    sppCount = 0; rainT = -1;
    if (clearBand) setBand(null);
  }
  // the tier celebrate() was handed -> cm: 2 gold, 0 rope (a fail; 'shut' too: a shut night never gets here, play runs
  // degrade(3)), 1 anything else (silver, bronze, none); a level number (play.js: 3 gold, 2 silver, 1 bronze, 0 rope):
  // >= 3 gold, <= 0 rope
  function tierMode(tier) {
    if (tier === 'gold') return 2;
    if (tier === 'rope' || tier === 'shut' || tier === false) return 0;
    if (typeof tier === 'number') return tier >= 3 ? 2 : tier <= 0 ? 0 : 1;
    return 1;
  }
  // GAME-SPEC §6 LAST CALL (800 ms): amber / pink flash, the chandelier swings, every dancer jumps, the disco ball spins
  // fast, confetti inside the window and a burst of confetti, ribbons and sticker stars OUT of the window over the facade
  // and the street (+ the cannons from decor 5). tier (data.tierFor's 'gold' | 'silver' | 'bronze' | 'rope', or play's
  // level 3 / 2 / 1 / 0; none = silver) scales it (TUNE.celebrate.gold / rope): gold doubles it in gold with a big chandelier swing, rope mutes it
  // to a polite hop with no confetti and no encore. Returns the seconds until the encore lands, -1 when none is due (rope)
  function celebrate(tier) {
    const R = L.room, CB = TUNE.celebrate, w = L.win, k = L.k, G = CB.gold;
    cm = tierMode(tier); celebT = 0;
    if (cm === 0) return quietEnd();
    const more = cm === 2 ? G.more : 1, gold = cm === 2;
    goldShare = gold ? G.share : 0;
    CH.v += TUNE.chand.celebrate * (gold ? G.chand : 1) * (CH.v >= 0 ? 1 : -1);
    for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; d.hop = -i * CB.stagger; d.hopH = CB.hop * (gold ? G.hop : 1); d.hopN = CB.hops; d.hopDur = CB.hopDur; }
    for (let i = 0; i < CB.confetti * (gold ? G.inside : 1); i++) {
      const x = Math.random() * L.RW, y = archTopR(x) + 2 + Math.random() * 10;
      spawn(0, x, y, (Math.random() - 0.5) * 50, 10 + Math.random() * 40, 1.6 + Math.random() * 1.2, 5 + Math.random() * 3, confCol());
    }
    // the street burst: blasted out of the lower window, mostly down and out (a quarter arcs up first), fast enough to
    // reach the rope line by ~0.8 s, then fluttering over the street; the rain wave follows from the top at rainAt
    const cx = w.x + w.w / 2, life = CB.life, sp = CB.speed;
    for (let i = 0; i < CB.street * more; i++) {
      const x = w.x + 14 + Math.random() * (w.w - 28), y = w.y + w.h * (0.5 + Math.random() * 0.45), side = (x - cx) / (w.w * 0.5);
      // (a gold night's extra pieces all pour down and out over the facade, never up across the band's faces)
      const up = i < CB.street && Math.random() < 0.25, out = (0.15 + Math.random() * 1.15) * (side < 0 ? -1 : 1) * (0.35 + 0.65 * Math.abs(side));
      const a = up ? -Math.PI / 2 + out * 0.8 : Math.PI / 2 - out, v = (sp[0] + Math.random() * (sp[1] - sp[0])) * (up ? 0.8 : 1);
      spawnConf(x, y, Math.cos(a) * v, Math.sin(a) * v, CB.drag[0]);
    }
    const ns = CB.stars * more;   // (a gold night's: gold + cream, every third one pink)
    for (let i = 0; i < ns; i++) {
      const a = -Math.PI / 2 + (i / (ns - 1) - 0.5) * 3.4, v = 230 + Math.random() * 140;
      spawnStreet(2, cx + Math.cos(a) * 30, w.y + w.h * 0.62, Math.cos(a) * v, Math.sin(a) * v, life[0] + Math.random() * 0.8, 10 + Math.random() * 4,
        gold ? (i % 3 === 2 ? 1 : (i & 1) ? 4 : 0) : i % 4);
    }
    rainT = CB.rainAt;
    if (SP.cannon) {
      for (let s = 0; s < 2; s++) {
        const px = w.x + R.cannons[s * 2] * k, py = w.y + (R.cannons[s * 2 + 1] - 18) * k, dir = s ? -1 : 1;
        for (let i = 0; i < CB.cannon; i++) {
          const a = -Math.PI / 2 - dir * (0.35 + Math.random() * 0.6), v = 260 + Math.random() * 160;
          spawnConf(px, py, Math.cos(a) * v, Math.sin(a) * v, CB.drag[0]);
        }
      }
      fireCannon(0); fireCannon(1);
    }
    for (let i = 0; i < L.tiles.n; i++) { tileV[i] = 0.4 + Math.random() * 0.6; tileC[i] = tileCol(); }
    for (let i = 0; i < glint.length; i++) glint[i] = 1;
    const cy = R.chandY + R.chain + 18;
    burstSparkle(R.chandX, cy, gold ? G.sparks : 10);
    if (gold) starBurst(R.chandX, cy, G.stars, 120, true);   // a shower of gold off the swinging chandelier
    // the hold's second beat: the first beat of the clock at least encore.after beats from now
    const bt = beatNow();
    encBeat = Math.ceil(bt + CB.encore.after); encWait = (encBeat - bt) / beatRate; encT = 9;
    return encWait;
  }
  // a floor tile's colour (TILE_COL): any on a normal night, gold / pale gold on a gold one
  function tileCol() { return cm === 2 ? (Math.random() < 0.65 ? 0 : 4) : (Math.random() * 5) | 0; }
  // a fail's LAST CALL (TUNE.celebrate.rope): no flash burst, confetti, street burst or encore: the band gives one polite
  // hop, the chandelier stirs, a few floor tiles light, the room's lights come down a little (update: roomDim)
  function quietEnd() {
    const CB = TUNE.celebrate, RO = CB.rope;
    goldShare = 0;
    CH.v += TUNE.chand.celebrate * RO.chand * (CH.v >= 0 ? 1 : -1);
    for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; if (d.wait > 0) continue; d.hop = -i * CB.stagger; d.hopH = RO.hop; d.hopN = RO.hops; d.hopDur = CB.hopDur; }
    for (let i = 0; i < RO.tiles; i++) { const j = (Math.random() * L.tiles.n) | 0; tileV[j] = RO.tileV; tileC[j] = (Math.random() * 5) | 0; }
    encBeat = -1; encWait = -1; encT = 9; rainT = -1;
    return -1;
  }
  // LAST CALL's encore (TUNE.celebrate.encore), on the beat: everyone jumps together, two beams sweep the room and cross,
  // a second smaller flash, the disco spins up, every floor tile lights, the chandelier swings, confetti from the arch
  // (a gold night's: the chandelier swings encChand x, gold-white beams, a gold floor, encMore x the confetti + a gold shower)
  function encore() {
    const E = TUNE.celebrate.encore, G = TUNE.celebrate.gold, gold = cm === 2, R = L.room;
    encT = 0;
    for (let i = 0; i < dancers.length; i++) { const d = dancers[i]; if (d.wait > 0) continue; d.hop = 0; d.hopH = E.hop; d.hopN = 1; d.hopDur = E.hopDur; }
    CH.v += E.chand * (gold ? G.encChand : 1) * (CH.v >= 0 ? -1 : 1);
    for (let i = 0; i < L.tiles.n; i++) { tileV[i] = 1; tileC[i] = tileCol(); }
    for (let i = 0; i < glint.length; i++) glint[i] = 1;
    for (let i = 0; i < E.confetti * (gold ? G.encMore : 1); i++) {
      const x = 10 + Math.random() * (L.RW - 20), y = archTopR(x) + 2 + Math.random() * 8;
      spawn(0, x, y, (Math.random() - 0.5) * 60, 20 + Math.random() * 50, 1.4 + Math.random() * 0.9, 5 + Math.random() * 3, confCol());
    }
    for (let s = -1; s <= 1; s += 2) burstSparkle(L.RW / 2 + s * E.beamX, archTopR(L.RW / 2 + s * E.beamX) + 4, 6);
    if (gold) starBurst(R.chandX, R.chandY + R.chain + 18, G.stars, 110, true);
    if (SP.cannon) { fireCannon(0); fireCannon(1); }
  }
  // the second wave: confetti dropping from the top of the screen across the whole width (already fluttering)
  function rain() {
    const CB = TUNE.celebrate, top = stage.safeTop - 8, n = Math.round(CB.rain * (cm === 2 ? CB.gold.rain : 1));
    for (let i = 0; i < n; i++) {
      const x = -10 + ((i + Math.random()) / n) * (L.W + 20), v = CB.rainV[0] + Math.random() * (CB.rainV[1] - CB.rainV[0]);
      spawnConf(x, top - Math.random() * 40, (Math.random() - 0.5) * 50, v, 1.1);
    }
  }
  // GAME-SPEC §6 'unlock band' (lobby): the room dims, an amber spotlight falls on centre stage in front of the DJ, the new
  // member pops in there (0 -> 1.25 -> 1) with sparks in its colour + sticker stars, hops three times, then hop-walks to
  // its slot with the cone following it. src = species name, guest spec or actor. Returns the dancer record.
  function unlock(src) {
    if (!src) return null;
    const spec = typeof src === 'string' ? HOUSE[src] : src.spec && typeof src.draw === 'function' ? src.spec : src;
    if (!spec) return null;
    const d = addDancer(spec, true), R = L.room;
    d.wait = TUNE.unlock.reveal; d.big = true; d.x = R.cx; d.y = R.cy; d.s = R.cs;
    SPOT.t = 0; SPOT.slot = d.slot; SPOT.d = d;
    return d;
  }
  // hold the spotlight on (a dancer slot index, default the stage centre) or let it fade
  function spotlight(on, slot) {
    SPOT.hold = !!on;
    if (on) { SPOT.slot = typeof slot === 'number' && slot >= 0 && slot < nSlots ? slot : -1; SPOT.d = null; }
  }
  // the doorway layer for an admitted guest going IN (GAME-SPEC §6 ADMIT): beginDoorway(ctx) clips to the door opening, so
  // whatever the scene draws next passes behind the jambs and the brass header; endDoorway(ctx) lifts the clip and redraws
  // the door leaf on top (an open leaf stays in front of the guest, a closing one shuts over it). Call the pair right after
  // drawBack (the hallway is the deepest thing on the street), before the queue and the front guest.
  function beginDoorway(ctx) {
    const d = L.door;
    ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y, d.w, d.h + 6); ctx.clip();
  }
  function endDoorway(ctx) { ctx.restore(); drawLeaf(ctx); }
  // GAME-SPEC §11 name: the home-scene lobby (switches the world to lobby framing on first use), back + front in one call
  function drawLobby(ctx) {
    if (!L.lobby) setLobby(true);
    drawBack(ctx);
    drawFront(ctx);
  }
  // the ADMIT starburst IN the door opening (design units, the street pool): white + gold sticker stars and sparkles
  // fanning up and out, and an amber flare from the hallway
  function doorBurst() {
    const DP = TUNE.doorPop, d = L.door, x = d.x + d.w * 0.5, y = d.y + d.h * DP.y;
    for (let i = 0; i < DP.stars; i++) {
      const a = -Math.PI / 2 + (i / (DP.stars - 1) - 0.5) * 2.7 + (Math.random() - 0.5) * 0.25, v = DP.speed[0] + Math.random() * (DP.speed[1] - DP.speed[0]);
      spawnStreet(2, x + Math.cos(a) * 6, y + Math.sin(a) * 6, Math.cos(a) * v, Math.sin(a) * v, 0.7 + Math.random() * 0.35, 8 + Math.random() * 3.5, i & 1 ? 0 : 4);
    }
    for (let i = 0; i < DP.sparks; i++) {
      const a = Math.random() * TAU, v = 30 + Math.random() * 110;
      spawnStreet(3, x + Math.cos(a) * 10, y + Math.sin(a) * 14, Math.cos(a) * v, Math.sin(a) * v - 30, 0.45 + Math.random() * 0.4, 3 + Math.random() * 2.5, i % 3);
    }
    doorFlash = Math.max(doorFlash, DP.flare);
  }
  // popAt (optional, s): the ADMIT starburst pops in the opening that long after the door starts to open (the scene passes
  // the guest's threshold landing: crouch + hop)
  function openDoor(popAt) {
    if (typeof popAt === 'number' && popAt >= 0) doorPopT = popAt;
    if (DA.on && DA.to > 0) return;
    if (!DA.on && doorAng >= TUNE.door.open * 0.98) return;
    DA.from = doorAng; DA.to = TUNE.door.open; DA.t = 0; DA.dur = TUNE.door.openMs / 1000; DA.ease = easeIndex.outBack; DA.on = true;
    doorFlash = 1;
  }
  function closeDoor() {
    if (DA.on && DA.to === 0) return;
    if (!DA.on && doorAng <= 0.001) return;
    DA.from = doorAng; DA.to = 0; DA.t = 0; DA.dur = TUNE.door.closeMs / 1000; DA.ease = easeIndex.outBounce; DA.on = true;
  }
  // setDecor(lv, reveal): a level up runs the new piece's reveal (TUNE.decorReveal: the lobby's spotlit one decorReveal.delay
  // s on, held while an unlock ceremony runs; play's lighter one playDelay s on, after the rule intro); reveal = a number
  // sets that delay instead, false swaps the piece in at once with a quick sparkle (and so does a level down, silently).
  // A jump of several levels shows the ones below the top at once and reveals the top one
  function setDecor(lv, reveal) {
    lv = clamp(lv | 0, 0, 6);
    if (lv === L.decor) return;
    const up = lv > L.decor, R = L.room;
    if (DR.on) endReveal();
    if (up && reveal !== false) {
      const RV = TUNE.decorReveal;
      DR.on = true; DR.lv = lv; DR.from = lv - 1; DR.t = -1; DR.a = 0; DR.fired = 0; DR.full = L.lobby;
      DR.wait = typeof reveal === 'number' && reveal >= 0 ? reveal : L.lobby ? RV.delay : RV.playDelay;
      L.decor = lv;
      bake();   // (fills OLD at lv - 1 too)
      return;
    }
    L.decor = lv;
    bake();
    if (up) {
      if (lv === 1) for (let i = 0; i < 5; i++) burstSparkle(20 + i * 58, L.archR + 8, 3);
      else if (lv === 2) burstSparkle(R.discoX, R.discoY + R.cord + 10, 10);
      else if (lv === 3) { burstSparkle(12, L.RH - 20, 6); burstSparkle(L.RW - 12, L.RH - 20, 6); }
      else if (lv === 4) burstSparkle(L.RW / 2, L.archR + 12, 12);
      else if (lv === 5) { fireCannon(0); fireCannon(1); }
      else if (lv === 6) burstSparkle(R.neonX, R.neonY, 10);
    }
  }
  function setLobby(on) {
    on = !!on;
    if (on === L.lobby) return;
    L.lobby = on;
    if (DR.on) endReveal();
    const keep = [];
    for (let i = 0; i < dancers.length; i++) keep.push(dancers[i].actor.spec);
    layout();
    setBand(keep);
  }

  // ---------------------------------------------------------------- look (cosmetics)
  function lookPart(o, src) {   // a partial look onto o (club / rope / door / plate / outfit map)
    copyLook(o, src);
    return o;
  }
  // this world's own look (null / undefined = follow the shared one again)
  function setLook(look) {
    if (!look) OWN.on = false;
    else { if (!OWN.on) copyLook(OWN, LOOK); lookPart(OWN, look); OWN.on = true; }
    L.lookGen = -1;
    return world;
  }
  function ownPart(field, v) {
    if (!OWN.on) { copyLook(OWN, LOOK); OWN.on = true; }
    OWN[field] = v; L.lookGen = -1;
    return world;
  }
  const world = {
    update, drawBack, drawMid, drawFront, drawLobby, setBand, admit, unlock, spotlight, degrade, reset, celebrate, openDoor, closeDoor,
    setDecor, setLobby, layout, lightAt, beginDoorway, endDoorway, setLook,
    // previewLook(look, s): show a look (any parts of it) for s seconds (default 3), then the look in force again
    previewLook(look, s) {
      copyLook(PV, OWN.on ? OWN : LOOK); lookPart(PV, look);
      PV.on = !!look; PV.until = t + (s > 0 ? s : 3); L.lookGen = -1;
      return world;
    },
    stopPreview() { if (PV.on) { PV.on = false; L.lookGen = -1; } return world; },
    setTheme(id) { return ownPart('club', id); },
    setRopeSkin(id) { return ownPart('rope', id); },
    setDoorSkin(id) { return ownPart('door', id); },
    // setOutfits({ species: 'outfit.<theme>.<species>' | '' }): the band's outfits (dancers whose spec names one keep it)
    setOutfits(map) { if (!OWN.on) { copyLook(OWN, LOOK); OWN.on = true; } if (map) for (const k in OWN.outfit) if (map[k] !== undefined) OWN.outfit[k] = map[k] || ''; L.lookGen = -1; return world; },
    // the look in force: { theme, rope, door, outfit: { species: theme key } } (reused object; read-only)
    get look() { LK.theme = L.th.id; LK.rope = L.ropeSkin; LK.door = L.doorSkin; LK.preview = PV.on; for (const k in OUTF) LK.outfit[k] = OUTF[k]; return LK; },
    setBeat(fn) { beatFn = typeof fn === 'function' ? fn : null; },
    slots, rope, door, poster, posterBox, window: win, dancers,
    get crowd() { return crowdN; },
    get decor() { return L.decor; },
    get level() { return level; },
    get lobby() { return L.lobby; },
    get time() { return t; },
    get beat() { return beatNow(); },
    // LAST CALL's encore: s until it lands (-1 when none is due) / s since it landed (-1 before)
    get encoreIn() { return encBeat >= 0 ? Math.max(0, (encBeat - beatNow()) / beatRate) : -1; },
    get encoreAge() { return encT < 9 ? encT : -1; },
    // the decor reveal (reused object): on (pending or running), lv, t = s since it started (-1 while it waits), land = s
    // from its start to the piece's landing, x / y = the piece's spot (design units), so a scene can hang a toast on it
    get reveal() {
      REV.on = DR.on; REV.lv = DR.on ? DR.lv : 0; REV.t = DR.on ? DR.t : -1; REV.land = DR.on ? revLand() : 0;
      if (DR.on) { const F = revealFocus(DR.lv); REV.x = L.win.x + F.x0 * L.k; REV.y = L.win.y + F.y0 * L.k; }
      return REV;
    },
    // LAST CALL's tier as celebrate() took it: -1 none since reset, 0 rope, 1 silver / bronze, 2 gold
    get tier() { return cm; },
    // test read-out (reused object)
    debug() {
      DBG.dancers = dancers.length; DBG.particles = ppCount; DBG.door = Math.round(door.open * 100) / 100; DBG.level = level;
      DBG.decor = L.decor; DBG.lamp = Math.round(LF.a * 100) / 100; DBG.picture = Math.round(PT.a * 100) / 100;
      DBG.glare = Math.round(GL.v * 100) / 100; DBG.chand = Math.round(CH.a * 100) / 100; DBG.k = Math.round(L.k * 1000) / 1000;
      DBG.lobby = L.lobby; DBG.H = L.H; DBG.specPh = specPh; DBG.discoPh = discoPh; DBG.spin = discoSpin; DBG.spot = SPOT.a; DBG.side = L.side;
      DBG.street = sppCount; DBG.banner = L.room.banMode; DBG.bulbsOff = bulbOffT > 0; DBG.red = redT; DBG.cap = nSlots;
      DBG.resting = 0; for (let i = 0; i < SPP.length; i++) if (SPP[i].on && SPP[i].rest > 0) DBG.resting++;
      DBG.shut = shutT >= 0; DBG.bulbsDead = shutN; DBG.bulbs = L.bulbs.n; DBG.title = L.title; DBG.crowd = crowdN;
      DBG.band = 0; for (let i = 0; i < dancers.length; i++) if (dancers[i].band) DBG.band++;
      DBG.sconce = L.sconceOn ? Math.round(L.sconce[0]) : -1; DBG.lampY = Math.round(L.lamp.y * 10) / 10; DBG.nail = Math.round(poster.x * 10) / 10;
      DBG.bulb0 = L.bulbs.n ? L.bulbs.xy[0] : 0;
      DBG.encore = encT < 9 ? Math.round(encT * 100) / 100 : -1;
      DBG.tier = cm; DBG.dim = Math.round(roomDim * 100) / 100; DBG.reveal = DR.on ? DR.lv : 0; DBG.revealT = DR.on ? Math.round(DR.t * 100) / 100 : -1;
      DBG.revealA = Math.round(DR.a * 100) / 100;
      return DBG;
    },
  };
  const LK = { theme: 'house', rope: 'velvet', door: 'brass', preview: false, outfit: { blob: '', tall: '', round: '', square: '', bean: '' } };
  const DBG = { dancers: 0, particles: 0, door: 0, level: 0, decor: 0, lamp: 0, picture: 0, glare: 0, chand: 0, k: 1, lobby: false, H: 0,
    specPh: 0, discoPh: 0, spin: 1, spot: 0, side: 0, street: 0, banner: 1, bulbsOff: false, red: 0, cap: 8, resting: 0, shut: false,
    bulbsDead: 0, bulbs: 0, title: '', crowd: 0, band: 0, sconce: 0, lampY: 0, nail: 0, bulb0: 0, encore: -1, tier: -1, dim: 1,
    reveal: 0, revealT: -1, revealA: 0 };
  if (opts.look) setLook(opts.look);
  resolveLook();
  layout();
  if (opts.band) setBand(opts.band);
  return world;
}
// live-tuning / test hook for dev pages (read-only for scenes)
export const WORLD_TUNE = TUNE;
const DASH = [1.6, 1.2], NODASH = [];
const CHAND_TIPS = [-26, 1.4, -14, -2.6, 14, -2.6, 26, 1.4];
// the neon's tubes stuttering on through its decor reveal (alpha per step of decorReveal.neon)
const NEON_ON = [0.85, 0, 0.12, 0.9, 0, 0.55, 0.15, 1];
