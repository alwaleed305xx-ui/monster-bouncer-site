// cosmetics-art.js: the art of every cosmetic in docs/MONETIZATION.md §3 (62 items), drawn in code in the ONE sticker
// style of GAME-SPEC §5. world.js paints the street + party window from a THEME recipe (club.*: sky, skyline, facade
// texture, window trim, marquee, bulbs, lamp light, planters, ivy, the room's wall / floor / stage / chandelier / bunting /
// front props, the live sky FX) and draws the rope / door skins with the painters here; every piece of the party room a
// theme re-dresses is painted here too, the house's included (paintRoomMotif, paintChandelierTheme, paintRoomFrontTheme,
// the decor-6 wall sign paintRoomSign, the owner's portrait paintRoomPicture, the banner's cloth paintBannerTheme, the
// DJ's hat paintDJHat), so no theme repeats the house's heart sign, portrait, banner or bare-headed DJ. icons.js owns the
// plate skins and actor.js the band outfits (paintOutfitHead lends their headwear to the DJ and the portrait).
// drawItemThumb(ctx, itemId, x, y, size) draws the shop thumbnail of any item (cached per item + size, so it allocates
// nothing per frame after the first draw); a party theme's is a crop of its party room (paintClubThumb).
// Legibility contract (MONETIZATION §3.1): the facade behind the queue lane, the rope guest and the poster stays dark and
// greyed (every recipe's facade sits at CIE L* <= ~22 with less chroma than the house indigo, checked by dev/world.html
// themeCheck()); nothing in the street moves on a spring near the queue: theme motion is light only (bulbs, flicker, the
// neon tubes' pulse) and sky FX (bats, searchlights, shooting stars, fireworks) above the roof; lamp light changes hue at
// low alpha; every street prop is static (its flame / candle / LED glow is drawn live by world.js at the light points the
// painter reports in L.fairy). Never skinned: the poster, the guests, the IN / OUT hues, the HUD, the amber door spill.
// Ids: club.<house|neon|royal|desert|space|beach|spooky|vip>, rope.<velvet|silver|candy|neon|royal|crystal|vip>,
// door.<brass|oak|najdi|neon|royal|crystal>, plate.<classic|studs|candy|neon|gold|crystal>,
// outfit.<neon|royal|desert|beach|space|spooky|rock>.<blob|tall|round|square|bean> (+ set.<theme> for a set thumb).
// Cultural rules (§6.4): Desert Night is a camping night in the «بر»: dunes, the Milky Way, Sadu weave, brass lanterns, a
// campfire, a Najdi mud facade with triangle crenellations; no crescent, no minaret, no script, no flags. Spooky Night has no
// skulls or occult signs: cute bats, cobwebs, carved pumpkins, candles.
import { draw, color } from '../core/draw.js';
import { TAU, clamp, lerp, rng } from '../core/math.js';
import { drawMini, outfitTheme, OUTFIT_THEMES, COLORS as GUEST_COLORS, paintOutfitHead } from './actor.js';
import { drawPlate } from './icons.js';

export const CLUB_THEMES = ['house', 'neon', 'royal', 'desert', 'space', 'beach', 'spooky', 'vip'];
export const ROPE_SKINS = ['velvet', 'silver', 'candy', 'neon', 'royal', 'crystal', 'vip'];
export const DOOR_SKINS = ['brass', 'oak', 'najdi', 'neon', 'royal', 'crystal'];
export const PLATE_SKINS = ['classic', 'studs', 'candy', 'neon', 'gold', 'crystal'];
const BAND = ['blob', 'tall', 'round', 'square', 'bean'];
export const COSMETIC_IDS = (() => {
  const a = [];
  for (let i = 0; i < CLUB_THEMES.length; i++) a.push('club.' + CLUB_THEMES[i]);
  for (let i = 0; i < OUTFIT_THEMES.length; i++) for (let j = 0; j < BAND.length; j++) a.push('outfit.' + OUTFIT_THEMES[i] + '.' + BAND[j]);
  for (let i = 0; i < ROPE_SKINS.length; i++) a.push('rope.' + ROPE_SKINS[i]);
  for (let i = 0; i < DOOR_SKINS.length; i++) a.push('door.' + DOOR_SKINS[i]);
  for (let i = 0; i < PLATE_SKINS.length; i++) a.push('plate.' + PLATE_SKINS[i]);
  return Object.freeze(a);
})();
function keyIn(id, slot, list, def) {
  if (typeof id !== 'string' || !id) return def;
  const k = id.indexOf(slot + '.') === 0 ? id.slice(slot.length + 1) : id;
  return list.indexOf(k) >= 0 ? k : def;
}
export function clubKey(id) { return keyIn(id, 'club', CLUB_THEMES, 'house'); }
export function ropeKey(id) { return keyIn(id, 'rope', ROPE_SKINS, 'velvet'); }
export function doorKey(id) { return keyIn(id, 'door', DOOR_SKINS, 'brass'); }
export function plateKey(id) { return keyIn(id, 'plate', PLATE_SKINS, 'classic'); }

// ------------------------------------------------------------------------------------------------ theme recipes
// sky = 4 stops top -> horizon, haze = the horizon glow, stars = count, starCol = [white share, tint]; moon: 'moon' (the
// house disc) | 'green' | 'planet' | 'big' | 'none' (the Milky Way instead); skyline: 'city' | 'towers' | 'dunes' | 'sea' |
// 'planets' | 'manor'; city = [far fill, near fill, rim, lit window A, B]; facade = 3 stops, wall = texture kind, cornice /
// dentil / quoin / plinth / trim / trimHi / ink; header + rim = the marquee; bulb = its glow colour; glow = the party
// window's wash on the wall; lamp = the street lamp's light (cone / pool / glow); cobble = 6 stones; walk = sidewalk
// stops; carpet = the queue lane [deep, mid, near, edge]; planter = the corner props; fairy = their light colour, flick =
// flicker (else they twinkle on the beat); ivy = the corner hanging; rays = the window's light rays on the street;
// room = the party window (wall stops, motif, wainscot, rail, floor stops, tile pair, grout, stage top / skirt / trim,
// footlights, beat tiles, bunting flags, chandelier kind, front props, metal = fanlight / bead colour; sign = the decor-6
// wall sign (paintRoomSign: a neon tube sign, or a lit plaque for 'crest' / 'dallah') + signCol its glow; ban = the
// banner's cloth (paintBannerTheme); the owner's portrait (paintRoomPicture) and the DJ's hat (paintDJHat) go by the id)
const HOUSE = {
  id: 'house', sky: ['#07061a', '#100e34', '#1e1a52', '#2c2464'], haze: 'rgba(160,86,160,0.24)', stars: 130, moon: 'moon', skyline: 'city',
  city: ['#1a1747', '#110f30', 'rgba(170,150,255,0.1)', 'rgba(255,196,120,0.55)', 'rgba(170,200,255,0.4)'], antenna: '#ff4a4a',
  facade: ['#2d2a69', '#25225c', '#1b1948'], wall: 'brick', cornice: '#3c3886', dentil: '#2b2870', quoin: '#34307a', plinth: '#1f1c52',
  trim: '#37337c', trimHi: '#4a4598', ink: '#0b0a22', header: '#2a1c4c', rim: '#d9a441', bulb: 'amber', glow: '#ffb347', lamp: '#9fbcff',
  cobble: ['#1c1a4f', '#201e57', '#191749', '#23215c', '#1a1851', '#1e1c53'], walk: ['#211e58', '#2a2766'], curb: '#3a3684',
  carpet: ['rgba(96,14,36,0.85)', '#7c1530', '#9c2038', 'rgba(240,196,98,0.95)'], planter: 'topiary', pot: '#262363', fairy: '#ffc46b', flick: false,
  ivy: 'ivy', rays: '255,190,110', fx: '',
  room: { wall: ['#200820', '#481737', '#5e2140'], motif: 'damask', wains: ['#2d0d25', '#220a1c'], rail: '#b3832f', floor: ['#1d0818', '#34112a'],
    tile: ['#3f1538', '#280b26'], grout: 'rgba(217,164,65,0.35)', stage: ['#4e2a1c', '#8e5634'], skirt: ['#a3203a', '#5e0c20'], skirtTrim: '#d9a441',
    foot: '#ffb347', tiles: ['#ffb347', '#ff4fa3', '#53e0ff', '#a77bff', '#ffe08a'], flags: ['#ffc233', '#ec4450', '#19b18b', '#40bdeb', '#8a48d6', '#f6efd6'],
    chand: 'brass', front: 'plants', metal: '#c99838', metalInk: '#3f2707', light: '#ffb347', sign: 'heart', signCol: '#ff4fa3', ban: 'velvet' },
};
function theme(o) {   // a recipe = the house recipe + its own fields (room merged one level deep)
  const t = {};
  for (const k in HOUSE) t[k] = HOUSE[k];
  for (const k in o) if (k !== 'room') t[k] = o[k];
  t.room = {};
  for (const k in HOUSE.room) t.room[k] = HOUSE.room[k];
  if (o.room) for (const k in o.room) t.room[k] = o.room[k];
  return Object.freeze(t);
}
export const THEMES = Object.freeze({
  house: theme(HOUSE),
  neon: theme({ id: 'neon', sky: ['#05030d', '#0d0620', '#1f0b33', '#3a0f45'], haze: 'rgba(255,60,190,0.26)', stars: 60, moon: 'moon',
    city: ['#160b26', '#0c0716', 'rgba(255,90,210,0.16)', 'rgba(255,80,200,0.6)', 'rgba(80,240,255,0.55)'], antenna: '#3df0ff',
    facade: ['#19141f', '#141019', '#0e0b12'], wall: 'tile', cornice: '#221c2c', dentil: '#17131f', quoin: '#211b2b', plinth: '#120f18',
    trim: '#201a2a', trimHi: '#2c2539', ink: '#05040a', header: '#120e1c', rim: '#3df0ff', bulb: 'pink', glow: '#ff4fa3', lamp: '#8af4ff',
    cobble: ['#16121f', '#1a1524', '#13101b', '#1d1828', '#15111d', '#181421'], walk: ['#1a1524', '#221c2e'], curb: '#2c2438',
    planter: 'neonbox', pot: '#14101c', fairy: '#ff4fd0', fx: 'neon', ivy: 'none', rays: '255,110,215',
    room: { wall: ['#07051a', '#140a2e', '#2a0f3e'], motif: 'synth', wains: ['#140b26', '#0c0618'], rail: '#3df0ff', floor: ['#0c0618', '#1c0a30'],
      tile: ['#22093a', '#12061f'], grout: 'rgba(255,79,163,0.7)', stage: ['#1c1532', '#2c2250'], skirt: ['#2e1046', '#140820'], skirtTrim: '#ff4fa3',
      foot: '#3df0ff', tiles: ['#ff4fa3', '#3df0ff', '#a77bff', '#ff4fd0', '#7af0ff'], flags: ['#ff4fa3', '#3df0ff', '#a77bff', '#ffe08a', '#ff4fd0', '#7af0ff'],
      chand: 'ring', front: 'speakers', metal: '#3df0ff', metalInk: '#06303a', light: '#ff4fa3', sign: 'cassette', signCol: '#ff4fa3', ban: 'neon' } }),
  royal: theme({ id: 'royal', sky: ['#05061a', '#0c1236', '#1b1f52', '#302a64'], haze: 'rgba(130,100,210,0.2)', stars: 110, moon: 'moon', skyline: 'towers',
    city: ['#1a1846', '#120f32', 'rgba(200,170,255,0.1)', 'rgba(255,214,140,0.6)', 'rgba(255,190,120,0.45)'], antenna: '',
    facade: ['#2e1d37', '#26172e', '#1b1022'], wall: 'stone', cornice: '#40284c', dentil: '#2e1c38', quoin: '#3c2948', plinth: '#22142a',
    trim: '#3e2a4a', trimHi: '#54386a', ink: '#0c0612', header: '#2c0f2c', rim: '#ffc94a', bulb: 'cream', glow: '#ffb347', lamp: '#ffd9a8',
    cobble: ['#201628', '#24192c', '#1c1324', '#271c30', '#1e1526', '#22182a'], walk: ['#251a2c', '#2e2236'], curb: '#3e2c48',
    planter: 'urn', fairy: '#ffd166', fx: 'royal', ivy: 'ivy', rays: '255,200,130',
    room: { wall: ['#2a0612', '#5a1022', '#701c2e'], motif: 'drapes', wains: ['#3a0a18', '#26060f'], rail: '#ffc94a', floor: ['#1a1418', '#2e2228'],
      tile: ['#8f8577', '#2a2026'], grout: 'rgba(255,201,74,0.45)', stage: ['#3a1a10', '#6a3418'], skirt: ['#6b1d5e', '#3a0c32'], skirtTrim: '#ffc94a',
      foot: '#fff0c0', tiles: ['#ffc94a', '#ff7fbf', '#fff0c0', '#e8b84a', '#ffd166'], flags: ['#ffc94a', '#6b1d5e', '#fff0c0', '#ff7fbf', '#e8b84a', '#9a3485'],
      chand: 'crystal', front: 'urns', metal: '#e8b84a', metalInk: '#5a3606', light: '#ffd27a', sign: 'crest', signCol: '#ffd27a', ban: 'royal' } }),
  desert: theme({ id: 'desert', sky: ['#03040e', '#0a0f2a', '#1d1d44', '#3e2c48'], haze: 'rgba(255,150,90,0.18)', stars: 280, moon: 'none', skyline: 'dunes',
    antenna: '', facade: ['#3b2b27', '#31241f', '#231a16'], wall: 'mud', cornice: '#47342c', dentil: '#2a1e19', quoin: '#3e2e27', plinth: '#2a1f1a',
    trim: '#4a372d', trimHi: '#5c4436', ink: '#120a07', header: '#3a2418', rim: '#d9a441', bulb: 'amber', glow: '#ffb347', lamp: '#ffc98a',
    cobble: ['#2a211e', '#2e2420', '#261d1a', '#322722', '#28201c', '#2c221e'], walk: ['#2e231e', '#382b24'], curb: '#4a382e',
    planter: 'camp', fairy: '#ffb347', flick: true, fx: 'desert', ivy: 'banner', rays: '255,180,100',
    room: { wall: ['#120b09', '#24160f', '#2e1c12'], motif: 'tent', wains: ['#4a1214', '#300a0c'], rail: '#d9a441', floor: ['#3a0e10', '#5a1418'],
      tile: ['#6e1a1e', '#4a1014'], grout: 'rgba(224,160,48,0.45)', stage: ['#4a2814', '#7a4424'], skirt: ['#b3203a', '#5a0c18'], skirtTrim: '#e0a030',
      foot: '#ffb347', tiles: ['#ffb347', '#ffd166', '#ff7a5c', '#e0a030', '#fff0c0'], flags: ['#b3203a', '#f5ecda', '#e0a030', '#231616', '#d9a441', '#7a1e22'],
      chand: 'lanterns', front: 'cushions', metal: '#d9a441', metalInk: '#4a2c06', light: '#ffb347', sign: 'dallah', signCol: '#ffb347', ban: 'sadu' } }),
  space: theme({ id: 'space', sky: ['#02030c', '#070b24', '#131944', '#22164a'], haze: 'rgba(90,120,255,0.2)', stars: 200, moon: 'planet', skyline: 'planets',
    antenna: '#3df0ff', facade: ['#232a3a', '#1d2231', '#161a26'], wall: 'panel', cornice: '#2e3548', dentil: '#1c2130', quoin: '#2b3244', plinth: '#181c28',
    trim: '#3a4256', trimHi: '#4e586f', ink: '#05070e', header: '#141a28', rim: '#3df0ff', bulb: 'cyan', glow: '#53e0ff', lamp: '#bff4ff',
    cobble: ['#1c2130', '#202536', '#191d2b', '#232839', '#1b1f2e', '#1e2233'], walk: ['#20263a', '#283048'], curb: '#384058',
    planter: 'crates', fairy: '#3df0ff', fx: 'space', ivy: 'cables', rays: '120,220,255',
    room: { wall: ['#02030c', '#070b22', '#0e1238'], motif: 'starfield', wains: ['#2a3142', '#1c2130'], rail: '#3df0ff', floor: ['#1c2130', '#3a4256'],
      tile: ['#4c556c', '#2c3346'], grout: 'rgba(61,240,255,0.5)', stage: ['#3a4256', '#5c6680'], skirt: ['#2c3346', '#161a26'], skirtTrim: '#3df0ff',
      foot: '#3df0ff', tiles: ['#3df0ff', '#ff3fb4', '#9dff6a', '#7af0ff', '#a77bff'], flags: ['#3df0ff', '#ff3fb4', '#9dff6a', '#cdd6e6', '#a77bff', '#7af0ff'],
      chand: 'orb', front: 'crystals', metal: '#b9c4d8', metalInk: '#2a3142', light: '#8ae8ff', sign: 'ufo', signCol: '#3df0ff', ban: 'panel' } }),
  beach: theme({ id: 'beach', sky: ['#020814', '#071634', '#11305c', '#1f4a74'], haze: 'rgba(120,200,255,0.2)', stars: 90, moon: 'big', skyline: 'sea',
    antenna: '', facade: ['#2b2427', '#241e21', '#1b1619'], wall: 'plank', cornice: '#4a3a22', dentil: '#2e2414', quoin: '#3a2e1e', plinth: '#221a14',
    trim: '#5c4a2c', trimHi: '#7a6438', ink: '#120c06', header: '#3a2a1a', rim: '#e9c46a', bulb: 'amber', glow: '#ffb347', lamp: '#ffe2b0',
    cobble: ['#24201f', '#282322', '#211d1c', '#2b2625', '#231f1e', '#262120'], walk: ['#3a3226', '#463c2e'], curb: '#54483a',
    planter: 'tiki', fairy: '#ffa54a', flick: true, fx: 'beach', ivy: 'palm', rays: '255,200,120',
    room: { wall: ['#1e140c', '#3a2614', '#4a301a'], motif: 'bamboo', wains: ['#3a2414', '#2a1a0e'], rail: '#e9c46a', floor: ['#3a2414', '#5a3a20'],
      tile: ['#6a4426', '#4e321c'], grout: 'rgba(30,15,5,0.55)', stage: ['#c8a46a', '#e9c88a'], skirt: ['#1fa9a1', '#0b5a56'], skirtTrim: '#ffd166',
      foot: '#ffd166', tiles: ['#ffd166', '#ff6f91', '#2ec4b6', '#ffb347', '#fff4dc'], flags: ['#ff6f91', '#ffd166', '#2ec4b6', '#e76f51', '#fff4dc', '#7fdcd5'],
      chand: 'paper', front: 'palms', metal: '#c9a35a', metalInk: '#4a3410', light: '#ffc46b', sign: 'palm', signCol: '#ff9f4a', ban: 'plank' } }),
  spooky: theme({ id: 'spooky', sky: ['#04030c', '#0e0a1e', '#1c1430', '#2a1a3c'], haze: 'rgba(120,230,120,0.16)', stars: 70, moon: 'green', skyline: 'manor',
    antenna: '', facade: ['#25212e', '#1f1b27', '#17141d'], wall: 'board', cornice: '#2e2838', dentil: '#1c1824', quoin: '#2a2434', plinth: '#18141e',
    trim: '#342d40', trimHi: '#433a50', ink: '#06040a', header: '#1c1420', rim: '#ff8c1a', bulb: 'orange', glow: '#ff9a3a', lamp: '#c4ff9e',
    cobble: ['#1c1922', '#201c26', '#19161f', '#231f29', '#1b1821', '#1e1b24'], walk: ['#221e28', '#2a2532'], curb: '#38323f',
    planter: 'pumpkins', fairy: '#ffa040', flick: true, fx: 'spooky', ivy: 'cobweb', rays: '255,170,80',
    room: { wall: ['#120a1a', '#24142e', '#301a3a'], motif: 'cobweb', wains: ['#1c1024', '#140a1a'], rail: '#ff8c1a', floor: ['#120a18', '#24142c'],
      tile: ['#30193a', '#170c1f'], grout: 'rgba(182,255,122,0.32)', stage: ['#2a1c18', '#4a3022'], skirt: ['#3a2450', '#1c1028'], skirtTrim: '#ff8c1a',
      foot: '#ffa040', tiles: ['#ff8c1a', '#b6ff7a', '#a77bff', '#ffb347', '#e9e2f5'], flags: ['#ff8c1a', '#2c1f3d', '#b6ff7a', '#a77bff', '#ffb347', '#46315f'],
      chand: 'candles', front: 'candelabra', metal: '#8a8070', metalInk: '#1c1820', light: '#ffa040', sign: 'bat', signCol: '#b98bff', ban: 'tatter' } }),
  vip: theme({ id: 'vip', sky: ['#020206', '#07070f', '#13101c', '#1e1826'], haze: 'rgba(255,200,110,0.13)', stars: 80, moon: 'moon',
    city: ['#0f0d14', '#09080c', 'rgba(255,214,140,0.1)', 'rgba(255,214,120,0.62)', 'rgba(255,240,200,0.4)'], antenna: '#ffc94a',
    facade: ['#17151b', '#121016', '#0d0c10'], wall: 'lacquer', cornice: '#1e1b22', dentil: '#2a2418', quoin: '#1c1a21', plinth: '#100e13',
    trim: '#1c1a21', trimHi: '#28252e', ink: '#030205', header: '#0e0c10', rim: '#ffc94a', bulb: 'gold', glow: '#ffc94a', lamp: '#ffe6b0',
    cobble: ['#141218', '#17151b', '#121016', '#1a171e', '#131116', '#16141a'], walk: ['#16141a', '#1e1b22'], curb: '#2a2630',
    carpet: ['rgba(14,12,16,0.85)', '#141217', '#1a171e', 'rgba(255,201,74,0.98)'], planter: 'goldurn', pot: '#121015', fairy: '#ffd166', fx: 'vip', ivy: 'none',
    rays: '255,210,130',
    room: { wall: ['#1e160a', '#3a2a12', '#4a3618'], motif: 'goldleaf', wains: ['#141016', '#0c0a0e'], rail: '#ffc94a', floor: ['#0c0a0e', '#1a161e'],
      tile: ['#1c1820', '#0c0a0e'], grout: 'rgba(255,201,74,0.6)', stage: ['#141016', '#26202c'], skirt: ['#1a161e', '#08060a'], skirtTrim: '#ffc94a',
      foot: '#fff0c0', tiles: ['#ffc94a', '#fff0c0', '#ffd166', '#e8b84a', '#ffffff'], flags: ['#ffc94a', '#141016', '#fff0c0', '#e8b84a', '#2a2418', '#ffd166'],
      chand: 'gold', front: 'booth', metal: '#ffc94a', metalInk: '#5a3a06', light: '#ffd27a', sign: 'diamond', signCol: '#ffd27a', ban: 'lacquer' } }),
});
export function themeOf(id) { return THEMES[clubKey(id)] || THEMES.house; }
// the marquee bulb glow colours (centre, mid, edge rgb)
export const BULB_COL = { amber: ['255,250,225', '255,225,150', '255,180,80'], pink: ['255,235,250', '255,120,215', '255,60,190'],
  cream: ['255,252,240', '255,240,200', '255,214,140'], cyan: ['235,255,255', '140,240,255', '60,200,255'], orange: ['255,240,210', '255,170,80', '255,110,30'],
  gold: ['255,252,230', '255,226,140', '255,190,60'] };

// ------------------------------------------------------------------------------------------------ helpers (bake time)
const SO = { fill: '#fff', outline: '#000', lineWidth: 3, highlight: 0.28, shadow: 0.14, bounds: null };
function stk(c, path, fill, outline, lw, hi, sh, bounds) {
  SO.fill = fill; SO.outline = outline; SO.lineWidth = lw === undefined ? 3 : lw;
  SO.highlight = hi === undefined ? 0.28 : hi; SO.shadow = sh === undefined ? 0.14 : sh; SO.bounds = bounds || null;
  draw.sticker(c, path, SO);
  SO.bounds = null;
}
const RGB = {};
function rgba(hex, a) {
  let v = RGB[hex];
  if (!v) { const n = parseInt(hex.slice(1), 16); v = RGB[hex] = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
  return 'rgba(' + v + ',' + a + ')';
}
function glowFill(c, x, y, r0, r1, col, a) {
  c.fillStyle = draw.radial(c, x, y, r0, r1, [[0, rgba(col, a)], [0.45, rgba(col, a * 0.4)], [1, rgba(col, 0)]]);
  c.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
}
function poly(c, pts) { draw.polygon(c, pts); }
// a neon tube (bake time) along the current path: glow halo, the coloured tube, a hot white core
function tube(c, col, w) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = rgba(col, 0.18); c.lineWidth = w * 5; c.stroke();
  c.strokeStyle = rgba(col, 0.35); c.lineWidth = w * 2.6; c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = w * 0.38; c.stroke();
  c.restore();
}
function leaf(c, x, y, len, wid, rot, fill, line, lw) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * 0.35, 0, -len); c.quadraticCurveTo(-wid, -len * 0.35, 0, 0); c.closePath();
  c.fillStyle = fill; c.fill();
  if (line) { c.lineWidth = lw || 1.1; c.strokeStyle = line; c.stroke(); }
  c.restore();
}
// Sadu weave (bake time): a strip [x, y, w, h] of red ground, black + white triangle rows and ochre edge stripes
export function saduStrip(c, x, y, w, h, alpha) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  if (alpha !== undefined) c.globalAlpha *= alpha;
  c.fillStyle = '#a81c33'; c.fillRect(x, y, w, h);
  const s = h * 0.6;
  c.fillStyle = '#1e1414';
  for (let u = x - s; u < x + w + s; u += s) { c.beginPath(); c.moveTo(u, y + h * 0.8); c.lineTo(u + s * 0.5, y + h * 0.22); c.lineTo(u + s, y + h * 0.8); c.closePath(); c.fill(); }
  c.fillStyle = '#f3e8d4';
  for (let u = x - s; u < x + w + s; u += s) { c.beginPath(); c.moveTo(u + s * 0.3, y + h * 0.66); c.lineTo(u + s * 0.5, y + h * 0.38); c.lineTo(u + s * 0.7, y + h * 0.66); c.closePath(); c.fill(); }
  c.fillStyle = '#dfa032'; c.fillRect(x, y, w, h * 0.13); c.fillRect(x, y + h * 0.87, w, h * 0.13);
  c.restore();
}
// a cute bat silhouette (wings by `flap` 0..1), centred on (x, y), span ~ s
export function batPath(c, x, y, s, flap) {
  const k = s / 20, f = flap === undefined ? 0.5 : flap, wy = (f - 0.5) * 6 * k;
  c.beginPath();
  c.moveTo(x, y - 2 * k);
  c.quadraticCurveTo(x - 4 * k, y - 5 * k + wy, x - 10 * k, y - 4 * k + wy * 1.6);
  c.quadraticCurveTo(x - 8 * k, y - 1 * k + wy, x - 9 * k, y + 1.5 * k + wy);
  c.quadraticCurveTo(x - 6.5 * k, y - 0.5 * k + wy * 0.6, x - 5 * k, y + 2 * k + wy * 0.4);
  c.quadraticCurveTo(x - 3.5 * k, y + 0.5 * k, x - 2.2 * k, y + 3 * k);
  c.lineTo(x, y + 2 * k); c.lineTo(x + 2.2 * k, y + 3 * k);
  c.quadraticCurveTo(x + 3.5 * k, y + 0.5 * k, x + 5 * k, y + 2 * k + wy * 0.4);
  c.quadraticCurveTo(x + 6.5 * k, y - 0.5 * k + wy * 0.6, x + 9 * k, y + 1.5 * k + wy);
  c.quadraticCurveTo(x + 8 * k, y - 1 * k + wy, x + 10 * k, y - 4 * k + wy * 1.6);
  c.quadraticCurveTo(x + 4 * k, y - 5 * k + wy, x, y - 2 * k);
  c.moveTo(x - 1.6 * k, y - 2.4 * k); c.lineTo(x - 1.2 * k, y - 4.4 * k); c.lineTo(x - 0.3 * k, y - 2.8 * k);
  c.moveTo(x + 1.6 * k, y - 2.4 * k); c.lineTo(x + 1.2 * k, y - 4.4 * k); c.lineTo(x + 0.3 * k, y - 2.8 * k);
  c.closePath();
}
// a cobweb in a corner at (x, y) spanning r, opening toward angle a0 .. a0 + span (bake time)
function cobweb(c, x, y, r, a0, span, col, a) {
  c.save(); c.strokeStyle = rgba(col, a); c.lineWidth = 0.8; c.lineCap = 'round';
  const n = 5;
  c.beginPath();
  for (let i = 0; i <= n; i++) { const t = a0 + span * i / n; c.moveTo(x, y); c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
  c.stroke();
  for (let ring = 1; ring <= 4; ring++) {
    const rr = r * ring / 4.4;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = a0 + span * i / n, px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr;
      if (i === 0) c.moveTo(px, py);
      else { const tm = a0 + span * (i - 0.5) / n, sag = rr * 0.86; c.quadraticCurveTo(x + Math.cos(tm) * sag, y + Math.sin(tm) * sag, px, py); }
    }
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------------------------------------ sky + skyline
// world.js paintSky: after the gradient + stars, the theme's own sky piece (the house moon is drawn by world.js)
export function paintSkyTheme(c, L, TH) {
  const P = 24, W = L.W, m = L.moon;
  if (TH.moon === 'none') {          // the Milky Way: a soft band of glow + a dense dust of tiny stars across the sky
    const r = rng(L.lobby ? 77 : 41), x0 = -P, y0 = Math.max(-P, L.cityTop - 70), x1 = W + P, y1 = -P + 8;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + Math.sin(u * 5.2) * 8;
      glowFill(c, x, y, 2, 46, i & 1 ? '#c9b8ff' : '#ffd9b0', 0.075);
    }
    for (let i = 0; i < 420; i++) {
      const u = r.next(), off = (r.next() + r.next() + r.next() - 1.5) * 26, x = lerp(x0, x1, u) + off * 0.4, y = lerp(y0, y1, u) + Math.sin(u * 5.2) * 8 + off;
      if (y > L.cityTop + 6) continue;
      c.globalAlpha = 0.25 + r.next() * 0.55; c.fillStyle = r.next() < 0.8 ? '#ffffff' : '#ffe2bd';
      c.fillRect(x, y, 0.7 + r.next() * 0.6, 0.7 + r.next() * 0.6);
    }
    c.restore();
    return;
  }
  if (TH.moon === 'green') {          // a big green full moon behind a wisp of cloud
    const R = m.r * 1.5;
    c.save(); c.globalCompositeOperation = 'lighter';
    glowFill(c, m.x, m.y, R * 0.8, R * 6, '#7cff9a', 0.16); glowFill(c, m.x, m.y, R, R * 2.4, '#d8ffc0', 0.22);
    c.restore();
    stk(c, cc => draw.circle(cc, m.x, m.y, R), '#d7f7b4', '#5a8a4a', 2, 0.35, 0.2);
    c.fillStyle = 'rgba(110,170,90,0.35)';
    draw.circle(c, m.x - R * 0.3, m.y - R * 0.2, R * 0.22); c.fill(); draw.circle(c, m.x + R * 0.28, m.y + R * 0.3, R * 0.16); c.fill();
    draw.circle(c, m.x + R * 0.12, m.y - R * 0.46, R * 0.1); c.fill();
    c.fillStyle = 'rgba(40,30,60,0.55)';   // a thin wisp of cloud across the lower disc
    c.beginPath(); c.ellipse(m.x - R * 0.2, m.y + R * 0.55, R * 1.1, R * 0.12, -0.06, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(m.x + R * 0.5, m.y + R * 0.72, R * 0.7, R * 0.09, -0.04, 0, TAU); c.fill();
    return;
  }
  if (TH.moon === 'planet') {         // nebula clouds + a ringed planet (+ a small moon)
    const r = rng(L.lobby ? 913 : 517);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = r.next() * W, y = -P + r.next() * Math.max(30, L.cityTop + P), rr = 30 + r.next() * 50;
      glowFill(c, x, y, 2, rr, i % 3 === 0 ? '#ff4fd0' : i % 3 === 1 ? '#53e0ff' : '#8a6bff', 0.08);
    }
    c.restore();
    const R = m.r * 1.35, x = m.x, y = m.y;
    c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, x, y, R, R * 3.2, '#ffb07a', 0.14); c.restore();
    const ring = (front) => {
      c.save(); c.translate(x, y); c.rotate(-0.36);
      c.beginPath(); c.ellipse(0, 0, R * 1.9, R * 0.5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      c.lineWidth = 4.2; c.strokeStyle = '#2a1430'; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#ffd9a0'; c.stroke();
      c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,255,255,0.65)'; c.stroke();
      c.restore();
    };
    ring(false);
    c.save(); draw.circle(c, x, y, R); c.clip();
    c.fillStyle = draw.gradient(c, x, y - R, x, y + R, [[0, '#ffb070'], [0.5, '#e8685a'], [1, '#7a2c6a']]); c.fillRect(x - R, y - R, R * 2, R * 2);
    c.fillStyle = 'rgba(255,230,190,0.35)';
    for (let i = -2; i <= 2; i++) { c.save(); c.translate(x, y + i * R * 0.36); c.rotate(-0.12); c.fillRect(-R, -R * 0.06, R * 2, R * 0.1); c.restore(); }
    c.fillStyle = draw.radial(c, x + R * 0.45, y + R * 0.4, 0, R * 1.3, [[0, 'rgba(20,6,40,0)'], [1, 'rgba(20,6,40,0.55)']]); c.fillRect(x - R, y - R, R * 2, R * 2);
    c.restore();
    draw.circle(c, x, y, R); c.lineWidth = 1.8; c.strokeStyle = '#2a1430'; c.stroke();
    ring(true);
    stk(c, cc => draw.circle(cc, x - R * 2.6, y + R * 0.9, R * 0.32), '#cfd8ff', '#3a4280', 1.4, 0.4, 0.25);
    return;
  }
  if (TH.moon === 'big') {            // a big warm moon (its glitter on the sea is the skyline's)
    const R = m.r * 1.3;
    c.save(); c.globalCompositeOperation = 'lighter';
    glowFill(c, m.x, m.y, R * 0.8, R * 7, '#9ad0ff', 0.2); glowFill(c, m.x, m.y, R, R * 2.6, '#fff4dc', 0.28);
    c.restore();
    stk(c, cc => draw.circle(cc, m.x, m.y, R), '#fff3d6', '#9a8a6a', 2, 0.35, 0.16);
    c.fillStyle = 'rgba(190,170,140,0.3)';
    draw.circle(c, m.x - R * 0.3, m.y - R * 0.18, R * 0.22); c.fill(); draw.circle(c, m.x + R * 0.32, m.y + R * 0.26, R * 0.15); c.fill();
  }
}
// world.js paintCity for any skyline but the house city (the city recolour is world.js's own)
export function paintSkyline(c, L, TH) {
  const P = 24, W = L.W, top = L.cityTop, base = L.base, k = TH.skyline;
  if (k === 'dunes') {                // three dune ridges, a starlit rim on each crest, palms + a tent far away
    const r = rng(L.lobby ? 61 : 23);
    const ridge = (y, amp, ph, fill, rim) => {
      c.beginPath(); c.moveTo(-P, base);
      for (let x = -P; x <= W + P; x += 6) c.lineTo(x, y + Math.sin(x * 0.011 + ph) * amp + Math.sin(x * 0.027 + ph * 2) * amp * 0.35);
      c.lineTo(W + P, base); c.closePath(); c.fillStyle = fill; c.fill();
      c.beginPath();
      for (let x = -P; x <= W + P; x += 6) { const yy = y + Math.sin(x * 0.011 + ph) * amp + Math.sin(x * 0.027 + ph * 2) * amp * 0.35; if (x === -P) c.moveTo(x, yy); else c.lineTo(x, yy); }
      c.lineWidth = 1.2; c.strokeStyle = rim; c.stroke();
    };
    ridge(top + 10, 9, 0.6, '#2e1f30', 'rgba(255,200,170,0.22)');
    // a far Bedouin tent + palms on the middle ridge
    const tx = W * 0.62, ty = top + 22;
    c.fillStyle = '#20152a';
    c.beginPath(); c.moveTo(tx - 22, ty + 8); c.lineTo(tx - 16, ty - 1); c.quadraticCurveTo(tx - 8, ty - 4, tx, ty - 1); c.quadraticCurveTo(tx + 8, ty - 4, tx + 16, ty - 1); c.lineTo(tx + 22, ty + 8); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,190,110,0.5)'; c.fillRect(tx - 3, ty + 2, 6, 5);
    for (let i = 0; i < 3; i++) {
      const px = W * (0.12 + i * 0.09) + r.next() * 8, py = top + 24 + r.next() * 4, h = 16 + r.next() * 8;
      c.strokeStyle = '#1a1122'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 2, py - h * 0.5, px + 1, py - h); c.stroke();
      c.fillStyle = '#1a1122';
      for (let f = 0; f < 6; f++) leaf(c, px + 1, py - h, 9 + r.next() * 3, 2.6, -1.9 + f * 0.75, '#1a1122');
    }
    ridge(top + 24, 7, 2.3, '#24172a', 'rgba(255,190,160,0.18)');
    ridge(top + 36, 6, 4.1, '#1b1120', 'rgba(255,180,150,0.14)');
    return;
  }
  if (k === 'sea') {                  // a moonlit horizon: the sea with the moon's glitter road, palm islands far away
    const hy = top + 18;
    c.fillStyle = draw.gradient(c, 0, hy, 0, base, [[0, '#1b3a66'], [0.3, '#10264a'], [1, '#081830']]); c.fillRect(-P, hy, W + P * 2, base - hy);
    c.fillStyle = 'rgba(200,230,255,0.35)'; c.fillRect(-P, hy, W + P * 2, 1);
    const mx = L.moon.x, r = rng(L.lobby ? 19 : 7);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let y = hy + 2; y < Math.min(base, hy + 120); y += 2.2) {
      const kk = (y - hy) / 120, w = 6 + kk * 46, n = 2 + (r.next() * 3 | 0);
      for (let i = 0; i < n; i++) { c.fillStyle = 'rgba(255,240,210,' + (0.42 * (1 - kk)).toFixed(3) + ')'; c.fillRect(mx - w * 0.5 + r.next() * w, y, 3 + r.next() * 7, 1); }
    }
    c.restore();
    c.strokeStyle = 'rgba(160,210,255,0.1)'; c.lineWidth = 1;
    for (let y = hy + 6; y < base; y += 5) { c.beginPath(); for (let x = -P; x < W + P; x += 14) { c.moveTo(x + (y * 3 % 14), y); c.lineTo(x + (y * 3 % 14) + 6, y); } c.stroke(); }
    const island = (x, w, n) => {
      c.fillStyle = '#071226'; c.beginPath(); c.ellipse(x, hy + 1, w, 4, 0, Math.PI, TAU); c.fill();
      for (let i = 0; i < n; i++) {
        const px = x - w * 0.4 + i * w * 0.4, h = 18 + i * 5;
        c.strokeStyle = '#071226'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(px, hy - 1); c.quadraticCurveTo(px + 4, hy - h * 0.6, px + 2, hy - h); c.stroke();
        for (let f = 0; f < 6; f++) leaf(c, px + 2, hy - h, 10, 2.6, -1.9 + f * 0.75, '#071226');
      }
    };
    island(W * 0.14, 30, 2); island(W * 0.9, 22, 1);
    return;
  }
  if (k === 'planets') {              // the moon's surface: craters, two glowing domes, a dish, a launch tower
    const gy = top + 22;
    c.fillStyle = draw.gradient(c, 0, gy - 10, 0, base, [[0, '#2a3048'], [0.4, '#1c2236'], [1, '#121626']]);
    c.beginPath(); c.moveTo(-P, base); c.lineTo(-P, gy);
    for (let x = -P; x <= W + P; x += 10) c.lineTo(x, gy + Math.sin(x * 0.03) * 3 + Math.sin(x * 0.091) * 2);
    c.lineTo(W + P, base); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(190,220,255,0.25)'; c.lineWidth = 1; c.stroke();
    const r = rng(L.lobby ? 33 : 13);
    for (let i = 0; i < 9; i++) {
      const x = r.next() * W, y = gy + 6 + r.next() * 22, w = 6 + r.next() * 12;
      c.fillStyle = 'rgba(8,10,20,0.45)'; draw.ellipse(c, x, y, w, w * 0.28); c.fill();
      c.strokeStyle = 'rgba(190,210,255,0.18)'; c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, y + 0.6, w, w * 0.28, 0, 0.1, Math.PI - 0.1); c.stroke();
    }
    const dome = (x, R) => {
      c.save(); c.beginPath(); c.arc(x, gy + 2, R, Math.PI, TAU); c.closePath();
      c.fillStyle = draw.radial(c, x - R * 0.3, gy - R * 0.4, 1, R * 1.2, [[0, 'rgba(160,240,255,0.55)'], [1, 'rgba(60,120,180,0.35)']]); c.fill();
      c.lineWidth = 1.3; c.strokeStyle = '#8aa0c8'; c.stroke();
      c.strokeStyle = 'rgba(160,190,230,0.5)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x, gy + 2 - R); c.lineTo(x, gy + 2); c.moveTo(x - R, gy + 2); c.quadraticCurveTo(x, gy - R * 0.3, x + R, gy + 2); c.stroke();
      c.restore();
    };
    dome(W * 0.3, 14); dome(W * 0.42, 9);
    const dx = W * 0.7, dy = gy - 2;
    c.strokeStyle = '#0e1220'; c.lineWidth = 2; c.beginPath(); c.moveTo(dx, dy + 4); c.lineTo(dx + 3, dy - 8); c.stroke();
    c.fillStyle = '#0e1220'; c.beginPath(); c.ellipse(dx + 4, dy - 12, 9, 4, -0.6, 0, TAU); c.fill();
    c.strokeStyle = '#0e1220'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(dx + 4, dy - 12); c.lineTo(dx + 10, dy - 20); c.stroke();
    const lx = W * 0.86;
    c.strokeStyle = '#0e1220'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(lx - 5, gy + 2); c.lineTo(lx - 3, gy - 34); c.moveTo(lx + 5, gy + 2); c.lineTo(lx + 3, gy - 34);
    for (let y = gy - 2; y > gy - 34; y -= 6) { c.moveTo(lx - 4.5, y); c.lineTo(lx + 4.5, y - 6); c.moveTo(lx + 4.5, y); c.lineTo(lx - 4.5, y - 6); }
    c.stroke();
    c.fillStyle = '#0e1220'; c.beginPath(); c.moveTo(lx - 3, gy - 34); c.lineTo(lx + 3, gy - 34); c.lineTo(lx, gy - 42); c.closePath(); c.fill();
    return;
  }
  if (k === 'manor') {                // crooked rooftops, spires, dead trees, lit attic windows
    const r = rng(L.lobby ? 71 : 29);
    for (let layer = 0; layer < 2; layer++) {
      const fill = layer ? '#0d0a16' : '#18122a';
      let x = -P - r.next() * 20;
      while (x < W + P) {
        const bw = 26 + r.next() * 34, h0 = top + (layer ? 18 : 6) + r.next() * 18, lean = (r.next() - 0.5) * 6;
        c.fillStyle = fill; c.beginPath();
        c.moveTo(x, base); c.lineTo(x + lean * 0.3, h0); c.lineTo(x + bw * 0.5 + lean, h0 - 12 - r.next() * 12); c.lineTo(x + bw + lean * 0.3, h0); c.lineTo(x + bw, base); c.closePath(); c.fill();
        if (r.next() < 0.4) { c.fillRect(x + bw * 0.72, h0 - 12, 5, 12); }
        if (r.next() < 0.5) { c.fillStyle = 'rgba(255,170,70,0.55)'; c.fillRect(x + bw * 0.42, h0 + 6, 4, 5); }
        x += bw + r.next() * 6;
      }
    }
    const gy = Math.min(base, top + 46);
    const tree = (x, h, s) => {
      c.strokeStyle = '#0a0812'; c.lineCap = 'round';
      c.lineWidth = 3 * s; c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x + 4 * s, gy - h * 0.5, x - 2 * s, gy - h); c.stroke();
      c.lineWidth = 1.6 * s; c.beginPath();
      c.moveTo(x + 1, gy - h * 0.55); c.quadraticCurveTo(x + 10 * s, gy - h * 0.7, x + 16 * s, gy - h * 0.95);
      c.moveTo(x, gy - h * 0.75); c.quadraticCurveTo(x - 9 * s, gy - h * 0.9, x - 13 * s, gy - h * 1.1);
      c.moveTo(x - 1, gy - h * 0.9); c.lineTo(x + 6 * s, gy - h * 1.15); c.stroke();
      c.lineWidth = 1 * s; c.beginPath(); c.moveTo(x + 10 * s, gy - h * 0.68); c.lineTo(x + 13 * s, gy - h * 0.6); c.moveTo(x - 7 * s, gy - h * 0.86); c.lineTo(x - 9 * s, gy - h * 0.78); c.stroke();
    };
    tree(W * 0.08, Math.min(54, gy - top + 10), 1); tree(W * 0.93, Math.min(46, gy - top + 6), 0.9);
    return;
  }
  if (k === 'towers') {               // a far city + palace towers with pointed turret roofs and lit arched windows
    const r = rng(L.lobby ? 77 : 31);
    let x = -P - r.next() * 20;
    while (x < W + P) { const bw = 18 + r.next() * 30, h0 = top + 14 + r.next() * 26; c.fillStyle = TH.city[0]; c.fillRect(x, h0, bw, base - h0); x += bw + r.next() * 4; }
    const tower = (cx, w, h, roofH) => {
      const y = top + 30 - h * (L.lobby ? 1.5 : 1);
      roofH *= L.lobby ? 1.4 : 1;
      c.fillStyle = TH.city[1]; c.fillRect(cx - w / 2, y, w, base - y);
      c.fillStyle = 'rgba(200,170,255,0.08)'; c.fillRect(cx - w / 2, y, w * 0.3, base - y);
      c.fillStyle = TH.city[1];
      c.beginPath(); c.moveTo(cx - w / 2 - 3, y); c.lineTo(cx, y - roofH); c.lineTo(cx + w / 2 + 3, y); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,214,140,0.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - w / 2 - 3, y); c.lineTo(cx, y - roofH); c.stroke();
      c.fillStyle = 'rgba(255,214,140,0.7)'; c.beginPath(); c.arc(cx, y - roofH - 1.5, 1.6, 0, TAU); c.fill();
      for (let k2 = cx - w / 2; k2 < cx + w / 2 - 1; k2 += 5) c.fillRect(k2, y - 2.5, 3, 2.5);
      c.fillStyle = 'rgba(255,214,140,0.65)';
      for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(cx - 2, y + 8 + i * 12); c.lineTo(cx - 2, y + 4 + i * 12); c.arc(cx, y + 4 + i * 12, 2, Math.PI, TAU); c.lineTo(cx + 2, y + 8 + i * 12); c.closePath(); c.fill(); }
    };
    c.fillStyle = TH.city[1];
    const wy = top + 22;
    c.fillRect(W * 0.08, wy, W * 0.84, base - wy);
    for (let x2 = W * 0.08; x2 < W * 0.92; x2 += 8) c.fillRect(x2, wy - 4, 4.5, 4);
    tower(W * 0.12, 16, 18, 16); tower(W * 0.3, 20, 30, 22); tower(W * 0.5, 26, 40, 28); tower(W * 0.7, 20, 26, 20); tower(W * 0.88, 14, 14, 14);
    c.fillStyle = 'rgba(255,200,120,0.5)';
    for (let i = 0; i < 12; i++) { const x3 = W * 0.12 + r.next() * W * 0.76, y3 = wy + 4 + r.next() * 14; c.fillRect(x3, y3, 2.2, 3); }
  }
}
// world.js paintCity, for the 'city' skyline: neon signs on the roofs (neon) / searchlight towers (vip)
export function paintCityDeco(c, L, TH) {
  if (TH.id === 'neon') {   // rooftop signs: a heart, a star, bars; each a lit tube on a black board
    const r = rng(L.lobby ? 5 : 3), top = L.cityTop;
    for (let i = 0; i < 6; i++) {
      const x = 14 + i * (L.W - 40) / 5 + (r.next() - 0.5) * 20, y = top + 2 + r.next() * 16, w = 14 + r.next() * 12, h = 8 + r.next() * 4, col = i & 1 ? '#ff4fd0' : '#3df0ff';
      c.fillStyle = '#0a0612'; c.fillRect(x, y, w, h); c.fillRect(x + w * 0.2, y + h, 1.2, 6); c.fillRect(x + w * 0.8, y + h, 1.2, 6);
      draw.roundRect(c, x + 1, y + 1, w - 2, h - 2, 1.5); tube(c, col, 0.6);
      const k = i % 3;
      if (k === 0) { draw.heart(c, x + w / 2, y + h / 2 + 0.4, h * 0.62); tube(c, '#ff4fa3', 0.55); }
      else if (k === 1) { draw.star(c, x + w / 2, y + h / 2, h * 0.34, 0.45, 5); tube(c, '#ffe08a', 0.5); }
      else { c.beginPath(); for (let b = 0; b < 3; b++) { c.moveTo(x + 4 + b * (w - 8) / 2, y + h - 2); c.lineTo(x + 4 + b * (w - 8) / 2, y + 2.5 + (b & 1) * 2); } tube(c, '#a77bff', 0.55); }
    }
  }
}

// ------------------------------------------------------------------------------------------------ facade
// world.js paintFacade: the wall texture (after the base gradient, clipped to the wall) for every wall kind but 'brick'
export function paintWallTexture(c, L, TH, x0, top, R, base) {
  const k = TH.wall, r = rng(L.lobby ? 913 : 91);
  if (k === 'tile') {                 // glossy black tiles: grout lines + a diagonal sheen per tile
    const s = 15;
    for (let y = top + 6; y < base; y += s) for (let x = x0; x < R; x += s) {
      const v = r.next();
      c.fillStyle = v < 0.3 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)'; c.fillRect(x + 1, y + 1, s - 2, s - 2);
      c.fillStyle = 'rgba(255,120,220,0.05)'; c.beginPath(); c.moveTo(x + 2, y + s - 3); c.lineTo(x + s - 3, y + 2); c.lineTo(x + s - 1, y + 2); c.lineTo(x + 2, y + s - 1); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(2,1,6,0.55)';
    for (let y = top + 6; y < base; y += s) c.fillRect(x0, y, R - x0, 1);
    for (let x = x0; x < R; x += s) c.fillRect(x, top + 6, 1, base - top);
  } else if (k === 'stone') {         // big ashlar blocks with a lit top edge and dark joints
    for (let y = top + 6, row = 0; y < base; y += 18, row++) {
      const off = (row & 1) ? 17 : 0;
      for (let x = x0 - 34 + off; x < R; x += 34) {
        const v = r.next();
        c.fillStyle = v < 0.4 ? 'rgba(255,230,255,0.035)' : 'rgba(0,0,10,0.1)'; c.fillRect(x + 1.5, y + 1.5, 31, 15);
        c.fillStyle = 'rgba(255,220,255,0.06)'; c.fillRect(x + 1.5, y + 1.5, 31, 1.2);
        if (v > 0.9) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(x + 32, y + 2); c.lineTo(x + 27, y + 2); c.lineTo(x + 32, y + 7); c.closePath(); c.fill(); }
      }
      c.fillStyle = 'rgba(6,2,10,0.45)'; c.fillRect(x0, y, R - x0, 1.5);
      for (let x = x0 - 34 + off; x < R; x += 34) c.fillRect(x, y, 1.5, 18);
    }
  } else if (k === 'mud') {           // hand-smoothed mud plaster: soft blotches, a faint course line, straw flecks
    for (let i = 0; i < 160; i++) {
      const x = x0 + r.next() * (R - x0), y = top + r.next() * (base - top), w = 8 + r.next() * 26;
      c.fillStyle = r.next() < 0.5 ? 'rgba(255,220,180,0.035)' : 'rgba(10,4,0,0.07)'; draw.ellipse(c, x, y, w, w * 0.45); c.fill();
    }
    c.strokeStyle = 'rgba(10,4,0,0.18)'; c.lineWidth = 1;
    for (let y = top + 40; y < base; y += 44) { c.beginPath(); c.moveTo(x0, y); for (let x = x0; x < R; x += 20) c.lineTo(x + 20, y + Math.sin(x * 0.1) * 1.2); c.stroke(); }
    c.fillStyle = 'rgba(255,214,150,0.12)';
    for (let i = 0; i < 120; i++) { const x = x0 + r.next() * (R - x0), y = top + r.next() * (base - top); c.save(); c.translate(x, y); c.rotate(r.next() * 3); c.fillRect(-2, 0, 4, 0.6); c.restore(); }
  } else if (k === 'panel') {         // riveted hull plates, seams, a vent here and there
    for (let y = top + 6, row = 0; y < base; y += 30, row++) {
      const off = (row & 1) ? 24 : 0;
      for (let x = x0 - 48 + off; x < R; x += 48) {
        const v = r.next();
        c.fillStyle = v < 0.4 ? 'rgba(200,220,255,0.035)' : 'rgba(0,4,12,0.1)'; c.fillRect(x + 1.5, y + 1.5, 45, 27);
        c.fillStyle = 'rgba(200,220,255,0.07)'; c.fillRect(x + 1.5, y + 1.5, 45, 1);
        c.fillStyle = 'rgba(160,180,220,0.22)';
        draw.circle(c, x + 5, y + 5, 1); c.fill(); draw.circle(c, x + 43, y + 5, 1); c.fill(); draw.circle(c, x + 5, y + 25, 1); c.fill(); draw.circle(c, x + 43, y + 25, 1); c.fill();
        if (v > 0.86) { c.fillStyle = 'rgba(0,2,8,0.45)'; for (let s = 0; s < 4; s++) c.fillRect(x + 14, y + 9 + s * 3.4, 20, 1.6); }
      }
      c.fillStyle = 'rgba(0,2,10,0.5)'; c.fillRect(x0, y, R - x0, 1.5);
      for (let x = x0 - 48 + off; x < R; x += 48) c.fillRect(x, y, 1.5, 30);
    }
  } else if (k === 'plank') {         // weathered horizontal boards: grain, knots, nail heads
    for (let y = top + 6, row = 0; y < base; y += 10, row++) {
      c.fillStyle = (row % 3 === 0) ? 'rgba(255,230,200,0.03)' : (row % 3 === 1) ? 'rgba(0,0,0,0.07)' : 'rgba(40,20,10,0.05)'; c.fillRect(x0, y, R - x0, 10);
      c.strokeStyle = 'rgba(255,220,190,0.05)'; c.lineWidth = 0.7; c.beginPath();
      for (let x = x0; x < R; x += 30 + r.next() * 30) { c.moveTo(x, y + 3 + r.next() * 4); c.quadraticCurveTo(x + 14, y + 2 + r.next() * 6, x + 30, y + 3 + r.next() * 4); }
      c.stroke();
      c.fillStyle = 'rgba(4,2,0,0.5)'; c.fillRect(x0, y, R - x0, 1.2);
      for (let x = x0 + 8 + (row & 1) * 40; x < R; x += 80) { c.fillStyle = 'rgba(200,190,170,0.18)'; draw.circle(c, x, y + 5, 0.9); c.fill(); }
    }
  } else if (k === 'board') {         // crooked vertical manor boards with gaps + nails
    for (let x = x0, i = 0; x < R; x += 13, i++) {
      const lean = (r.next() - 0.5) * 1.6;
      c.fillStyle = i % 3 === 0 ? 'rgba(255,240,255,0.03)' : 'rgba(0,0,0,0.08)';
      c.beginPath(); c.moveTo(x + 1, top + 6); c.lineTo(x + 12, top + 6); c.lineTo(x + 12 + lean, base); c.lineTo(x + 1 + lean, base); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(2,0,6,0.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x, top + 6); c.lineTo(x + lean, base); c.stroke();
      c.fillStyle = 'rgba(180,170,190,0.16)';
      for (let y = top + 18 + (i & 1) * 14; y < base; y += 46) { draw.circle(c, x + 6.5 + lean * (y - top) / (base - top), y, 0.9); c.fill(); }
    }
  } else if (k === 'lacquer') {       // black lacquer panels with thin gold pinstripes
    c.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = x0 + 20; x < R; x += 52) c.fillRect(x, top + 6, 18, base - top);
    c.strokeStyle = 'rgba(255,201,74,0.17)'; c.lineWidth = 0.8;
    for (let x = x0 + 13; x < R; x += 26) { c.beginPath(); c.moveTo(x, top + 8); c.lineTo(x, base - 18); c.stroke(); }
    c.strokeStyle = 'rgba(255,201,74,0.3)'; c.lineWidth = 1;
    for (let y = top + 30; y < base - 30; y += 120) { c.beginPath(); c.moveTo(x0, y); c.lineTo(R, y); c.stroke(); }
  }
}
// world.js paintFacade, last: the theme's facade pieces (all far above the queue: the roof line, the window, the corner)
export function paintFacadeDeco(c, L, TH) {
  const P = 24, W = L.W, x0 = L.corner, top = L.roof, R = W + P, id = TH.id;
  if (id === 'desert') {              // Najdi crenellations on the roof line, palm-trunk beam ends + triangle vents under it
    for (let x = x0 - 4, i = 0; x < R; x += 16, i++) {
      stk(c, cc => poly(cc, [x, top - 2, x + 6, top - 13, x + 7.5, top - 13, x + 13.5, top - 2]), '#4a372d', TH.ink, 1.8, 0.25, 0.25, [x, top - 13, 13.5, 11]);
      c.fillStyle = 'rgba(10,4,0,0.5)'; poly(c, [x + 5.2, top - 4, x + 6.75, top - 8.5, x + 8.3, top - 4]); c.fill();
    }
    for (let x = x0 + 14; x < R; x += 34) {
      stk(c, cc => draw.ellipse(cc, x, top + 16, 3.6, 3), '#6a4a30', TH.ink, 1.2, 0.35, 0.2);
      c.strokeStyle = 'rgba(30,14,4,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.arc(x, top + 16, 1.6, 0, TAU); c.stroke();
    }
    c.fillStyle = 'rgba(8,3,0,0.55)';
    for (let x = x0 + 31; x < R; x += 34) { poly(c, [x - 3.5, top + 30, x + 3.5, top + 30, x, top + 24]); c.fill(); poly(c, [x - 3.5, top + 32, x + 3.5, top + 32, x, top + 38]); c.fill(); }
  } else if (id === 'space') {        // a row of portholes under the cornice + an LED strip along it
    for (let x = x0 + 22; x < R - 10; x += 44) {
      stk(c, cc => draw.circle(cc, x, top + 20, 7.5), '#5c6680', TH.ink, 1.8, 0.4, 0.2);
      c.fillStyle = draw.radial(c, x - 1.5, top + 18.5, 0.5, 6, [[0, '#d8fbff'], [0.5, '#53b8e0'], [1, '#1a3a5a']]); draw.circle(c, x, top + 20, 5.4); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; draw.circle(c, x - 2, top + 18, 1.2); c.fill();
      c.fillStyle = 'rgba(160,180,220,0.6)'; for (let k = 0; k < 6; k++) { const a = k * TAU / 6; draw.circle(c, x + Math.cos(a) * 6.5, top + 20 + Math.sin(a) * 6.5, 0.5); c.fill(); }
    }
  } else if (id === 'beach') {        // a thatch eave along the roof
    const r = rng(L.lobby ? 3 : 2);
    c.fillStyle = '#4a3a22'; c.fillRect(x0 - 8, top - 10, R - x0 + 16, 14);
    for (let x = x0 - 8; x < R + 8; x += 3) {
      const len = 12 + r.next() * 7;
      c.strokeStyle = r.next() < 0.5 ? '#6e5832' : '#56442a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, top - 10); c.lineTo(x + (r.next() - 0.5) * 3, top - 10 + len); c.stroke();
    }
    c.strokeStyle = '#2a1e10'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - 8, top - 10); c.lineTo(R + 8, top - 10); c.stroke();
    c.strokeStyle = 'rgba(255,230,170,0.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 - 8, top - 8); c.lineTo(R + 8, top - 8); c.stroke();
  } else if (id === 'spooky') {       // cobwebs in the wall's top corners
    cobweb(c, x0 + 6, top + 10, 34, 0, Math.PI * 0.5, '#e9e2f5', 0.32);
    cobweb(c, W - 2, top + 10, 30, Math.PI * 0.5, Math.PI * 0.5, '#e9e2f5', 0.28);
  } else if (id === 'royal') {        // a gold-leaf frieze under the cornice
    c.strokeStyle = 'rgba(255,201,74,0.55)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0, top + 14); c.lineTo(R, top + 14); c.moveTo(x0, top + 22); c.lineTo(R, top + 22); c.stroke();
    c.fillStyle = 'rgba(255,201,74,0.45)';
    for (let x = x0 + 8; x < R; x += 14) { poly(c, [x, top + 18, x + 3.5, top + 15.5, x + 7, top + 18, x + 3.5, top + 20.5]); c.fill(); }
  } else if (id === 'vip') {          // a gold frieze + gold corner edge
    c.fillStyle = 'rgba(255,201,74,0.55)'; c.fillRect(x0, top + 12, R - x0, 1.6); c.fillRect(x0, top + 17, R - x0, 0.8);
    c.fillStyle = 'rgba(255,201,74,0.35)'; c.fillRect(x0 - 2.5, top, 1.4, L.base - top);
  }
}
// world.js paintWindowTrim, last: the theme's window frame (over the stone trim)
export function paintTrimDeco(c, L, TH) {
  const w = L.win, a = L.arch, T = 10, id = TH.id;
  const ox = w.x - T, oy = w.y - T, ow = w.w + T * 2, oh = w.h + T;
  const archP = (cc, x, y, ww, h, aa) => { cc.beginPath(); cc.moveTo(x, y + h); cc.lineTo(x, y + aa); cc.ellipse(x + ww / 2, y + aa, ww / 2, aa, 0, Math.PI, TAU); cc.lineTo(x + ww, y + h); };
  if (id === 'royal' || id === 'vip') {   // gold leaf: a broad gold band + a fine inner line, scrolls at the springing points
    archP(c, ox + 1.5, oy + 1.5, ow - 3, oh - 1.5, a + T - 1.5);
    c.lineWidth = 3.4; c.strokeStyle = '#7a4a08'; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#ffc94a'; c.stroke();
    archP(c, ox + 5.5, oy + 5.5, ow - 11, oh - 5.5, a + T - 5.5);
    c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,214,120,0.75)'; c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      const sx = w.x + w.w / 2 + s * (w.w / 2 + T / 2), sy = w.y + a;
      c.strokeStyle = '#ffc94a'; c.lineWidth = 1.4; c.beginPath(); c.arc(sx, sy, 3.4, 0, TAU * 0.8); c.stroke();
    }
  } else if (id === 'desert') {       // a carved gypsum frieze of triangles round the arch
    c.save(); archP(c, ox, oy, ow, oh, a + T); c.closePath(); archP(c, w.x, w.y, w.w, w.h + 2, a); c.closePath(); c.clip('evenodd');
    c.fillStyle = 'rgba(245,232,210,0.55)';
    const cx = w.x + w.w / 2;
    for (let i = 0; i < 26; i++) {
      const t = Math.PI + (i + 0.5) / 26 * Math.PI, ct = Math.cos(t), st = Math.sin(t), rx = w.w / 2 + T * 0.5, ry = a + T * 0.5, px = cx + ct * rx, py = w.y + a + st * ry;
      c.save(); c.translate(px, py); c.rotate(t + Math.PI / 2); poly(c, [-2.6, 2, 2.6, 2, 0, -2.4]); c.fill(); c.restore();
    }
    for (let y = w.y + a + 6; y < w.y + w.h - 4; y += 7) { poly(c, [ox + 2.5, y + 2, ox + 7.5, y + 2, ox + 5, y - 2.4]); c.fill(); poly(c, [w.x + w.w + 2.5, y + 2, w.x + w.w + 7.5, y + 2, w.x + w.w + 5, y - 2.4]); c.fill(); }
    c.restore();
  } else if (id === 'beach') {        // bamboo poles framing the arch
    archP(c, ox + 4, oy + 4, ow - 8, oh - 4, a + T - 4);
    c.lineWidth = 7; c.strokeStyle = '#3a2a10'; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#c9a35a'; c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,240,190,0.5)'; c.stroke();
    c.save(); c.setLineDash([1.4, 13]); c.lineWidth = 7; c.strokeStyle = '#5a4018'; archP(c, ox + 4, oy + 4, ow - 8, oh - 4, a + T - 4); c.stroke(); c.restore();
  } else if (id === 'space') {        // a chrome frame with bolts
    archP(c, ox + 2, oy + 2, ow - 4, oh - 2, a + T - 2);
    c.lineWidth = 4; c.strokeStyle = '#2a3142'; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = '#b9c4d8'; c.stroke();
    c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.stroke();
    const cx = w.x + w.w / 2;
    c.fillStyle = '#dfe7f5';
    for (let i = 1; i < 12; i++) { const t = Math.PI + i / 12 * Math.PI; draw.circle(c, cx + Math.cos(t) * (w.w / 2 + 5), w.y + a + Math.sin(t) * (a + 5), 1.1); c.fill(); }
  } else if (id === 'spooky') {       // a cobweb in the arch's corner
    cobweb(c, w.x + 4, w.y + a * 0.5 + 6, 26, -Math.PI * 0.45, Math.PI * 0.5, '#f1ecff', 0.45);
  }
}
// world.js paintHeader, last: neon has its tubes live; desert hangs a woven band along the marquee
export function paintHeaderDeco(c, L, TH) {
  const h = L.header;
  if (TH.id === 'desert') saduStrip(c, h.x + 6, h.y + h.h - 6.5, h.w - 12, 4, 0.9);
}

// ------------------------------------------------------------------------------------------------ live FX sprites
// the additive tubes / glows a theme pulses every frame (world.js blits it with the beat): neon tubes framing the window,
// the marquee and the cornice; space porthole glows. Baked per layout into a full-street sprite (null: none)
export function hasFxSprite(TH) { return TH.fx === 'neon' || TH.fx === 'space'; }
export function paintFxSprite(c, L, TH) {
  const P = 24;
  c.translate(P, P);
  if (TH.fx === 'neon') {
    const w = L.win, a = L.arch, h = L.header;
    c.beginPath(); c.moveTo(w.x - 16, w.y + w.h); c.lineTo(w.x - 16, w.y + a); c.ellipse(w.x + w.w / 2, w.y + a, w.w / 2 + 16, a + 16, 0, Math.PI, TAU); c.lineTo(w.x + w.w + 16, w.y + w.h);
    tube(c, '#ff4fa3', 2.2);
    c.beginPath(); c.moveTo(w.x - 21, w.y + w.h); c.lineTo(w.x - 21, w.y + a); c.ellipse(w.x + w.w / 2, w.y + a, w.w / 2 + 21, a + 21, 0, Math.PI, TAU); c.lineTo(w.x + w.w + 21, w.y + w.h);
    tube(c, '#3df0ff', 1.4);
    draw.roundRect(c, h.x + 2, h.y + 2, h.w - 4, h.h - 4, 4); tube(c, '#3df0ff', 1.6);
    c.beginPath(); c.moveTo(L.corner, L.roof + 7); c.lineTo(L.W + P, L.roof + 7); tube(c, '#ff4fa3', 1.6);
  } else if (TH.fx === 'space') {
    const top = L.roof;
    c.globalCompositeOperation = 'lighter';
    for (let x = L.corner + 22; x < L.W + P - 10; x += 44) glowFill(c, x, top + 20, 2, 16, '#53e0ff', 0.4);
    c.beginPath(); c.moveTo(L.corner, top + 7); c.lineTo(L.W + P, top + 7); tube(c, '#3df0ff', 1);
  }
}

// ------------------------------------------------------------------------------------------------ corner props
// world.js paintShrub for every planter but the house topiary (the neon / vip ones recolour the topiary there). In the
// shrub box's design units; writes the light points of the side into L.fairy[side * 8 ..] (4 points: x, y)
// each prop kind's scale about its ground point (cx, pt + 46), so it carries the house planter's visual weight
const PROP_K = { camp: 1.42, crates: 1.3, tiki: 1.12, pumpkins: 1.4 };
const NOLIGHT = () => {};
export function paintPlanter(c, L, side, TH) {
  const W = L.W, dir = side ? -1 : 1, by = L.shrubY, pt = by + 36, k = TH.planter, P = 24;
  const cx = side ? W - 26 : 26, pk = PROP_K[k] || 1, setLight = NOLIGHT;
  c.fillStyle = 'rgba(4,3,16,0.55)'; draw.ellipse(c, side ? W - 22 : 22, pt + 45, 50 * Math.min(1.25, pk), 8); c.fill();
  if (pk !== 1) { c.translate(cx, pt + 46); c.scale(pk, pk); c.translate(-cx, -pt - 46); }
  if (k === 'urn') {                  // a white marble urn on a plinth, gold rims, a cascade of roses + ivy
    const ux = cx + dir * 2, top = pt - 2;
    stk(c, cc => draw.roundRect(cc, ux - 22, pt + 32, 44, 14, 3), '#d9d2c8', '#4a4248', 2.2, 0.3, 0.3);
    stk(c, cc => { cc.beginPath(); cc.moveTo(ux - 9, pt + 33); cc.lineTo(ux - 6, pt + 20); cc.lineTo(ux + 6, pt + 20); cc.lineTo(ux + 9, pt + 33); cc.closePath(); }, '#e8e2d8', '#4a4248', 2, 0.35, 0.25, [ux - 9, pt + 20, 18, 13]);
    const bowl = cc => { cc.beginPath(); cc.moveTo(ux - 24, top); cc.quadraticCurveTo(ux - 22, top + 22, ux, top + 23); cc.quadraticCurveTo(ux + 22, top + 22, ux + 24, top); cc.closePath(); };
    stk(c, bowl, '#efe9df', '#4a4248', 2.4, 0.4, 0.3, [ux - 24, top, 48, 23]);
    c.save(); bowl(c); c.clip(); c.strokeStyle = 'rgba(120,110,130,0.35)'; c.lineWidth = 0.9;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(ux + i * 6.5, top); c.quadraticCurveTo(ux + i * 5, top + 12, ux + i * 3, top + 23); c.stroke(); }
    c.strokeStyle = 'rgba(150,130,160,0.3)'; c.beginPath(); c.moveTo(ux - 18, top + 6); c.quadraticCurveTo(ux - 4, top + 13, ux + 12, top + 10); c.stroke();
    c.restore();
    stk(c, cc => draw.roundRect(cc, ux - 26, top - 3, 52, 5, 2.2), '#ffc94a', '#7a4a08', 1.6, 0.55, 0.15);
    stk(c, cc => draw.roundRect(cc, ux - 10, pt + 18.5, 20, 3, 1.4), '#ffc94a', '#7a4a08', 1.2, 0.55, 0.15);
    const r = rng(side ? 9 : 4);
    for (let i = 0; i < 14; i++) leaf(c, ux - 20 + r.next() * 40, top - 2 + r.next() * 4, 9 + r.next() * 5, 4, -1.4 + r.next() * 2.8, i & 1 ? '#1e4a36' : '#163a2a', '#0a1c14');
    for (let i = 0; i < 6; i++) {
      const rx2 = ux - 17 + i * 7 + (r.next() - 0.5) * 3, ry2 = top - 8 - (i & 1) * 6 - r.next() * 4, rr = 4.2 + r.next() * 1.4;
      stk(c, cc => draw.circle(cc, rx2, ry2, rr), i % 3 === 0 ? '#c2185b' : i % 3 === 1 ? '#e8508a' : '#9a3485', '#3a0820', 1.2, 0.35, 0.2);
      c.strokeStyle = 'rgba(60,0,24,0.65)'; c.lineWidth = 0.8; c.beginPath(); c.arc(rx2, ry2, rr * 0.55, 0.4, 4.6); c.stroke();
    }
    c.strokeStyle = '#163a2a'; c.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) { const sx = ux + (i ? 18 : -18); c.beginPath(); c.moveTo(sx, top); c.quadraticCurveTo(sx + (i ? 8 : -8), top + 12, sx + (i ? 4 : -4), top + 24); c.stroke();
      for (let j = 0; j < 4; j++) leaf(c, sx + (i ? 6 : -6) + (i ? -1 : 1) * j, top + 5 + j * 5, 5, 2.4, i ? 0.9 : -0.9, '#1e4a36'); }
  } else if (k === 'camp') {          // desert: left a Sadu rug with two brass lanterns; right a campfire ringed with stones + a lantern
    const lantern = (x, y, s, li) => {
      c.save(); c.translate(x, y); c.scale(s, s);
      c.strokeStyle = '#4a2c06'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, -27, 4, Math.PI, TAU); c.stroke();
      stk(c, cc => poly(cc, [-7, -21, 7, -21, 4, -26, -4, -26]), '#d9a441', '#4a2c06', 1.4, 0.5, 0.15);
      c.fillStyle = draw.radial(c, 0, -12, 0.5, 9, [[0, '#fff3c8'], [0.5, '#ffb347'], [1, '#c2562e']]);
      draw.roundRect(c, -6, -21, 12, 15, 2); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#4a2c06'; c.stroke();
      c.strokeStyle = '#8a5a14'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -21); c.lineTo(-2, -6); c.moveTo(2, -21); c.lineTo(2, -6); c.moveTo(-6, -13.5); c.lineTo(6, -13.5); c.stroke();
      stk(c, cc => poly(cc, [-8, -6, 8, -6, 6, 0, -6, 0]), '#d9a441', '#4a2c06', 1.4, 0.5, 0.2);
      c.restore();
      setLight(li, x, y - 13 * s);
    };
    if (!side) {
      c.save(); c.translate(cx + 4, pt + 38); c.scale(1, 0.42);
      c.beginPath(); c.rect(-40, -26, 80, 52); c.fillStyle = '#7a1a26'; c.fill();
      saduStrip(c, -40, -26, 80, 13); saduStrip(c, -40, 13, 80, 13);
      c.fillStyle = '#e8d8b8'; for (let x = -40; x < 40; x += 4) { c.fillRect(x, 26, 1.6, 5); c.fillRect(x, -31, 1.6, 5); }
      c.lineWidth = 2.6; c.strokeStyle = '#2a0c10'; c.strokeRect(-40, -26, 80, 52);
      c.restore();
      lantern(cx - 6, pt + 38, 1, 0); lantern(cx + 18, pt + 40, 0.72, 1);
    } else {
      const fx = cx + 2, fy = pt + 40;
      c.fillStyle = 'rgba(20,10,4,0.6)'; draw.ellipse(c, fx, fy + 2, 24, 5); c.fill();
      for (let i = 0; i < 2; i++) { c.save(); c.translate(fx, fy - 2); c.rotate(i ? 0.5 : -0.5); stk(c, cc => draw.roundRect(cc, -15, -2.6, 30, 5.2, 2.6), '#5a3418', '#1a0c04', 1.4, 0.3, 0.2); c.restore(); }
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.05 + i / 6 * 0.9), sx = fx + Math.cos(a) * 21, sy = fy + Math.sin(a) * 4;
        stk(c, cc => draw.ellipse(cc, sx, sy, 5, 3.6), i & 1 ? '#5a5048' : '#4a423c', '#16120e', 1.2, 0.35, 0.25);
      }
      const flame = (sc, col, col2) => {
        c.beginPath(); c.moveTo(fx - 9 * sc, fy - 3); c.quadraticCurveTo(fx - 11 * sc, fy - 14 * sc, fx - 3 * sc, fy - 22 * sc); c.quadraticCurveTo(fx - 4 * sc, fy - 12 * sc, fx, fy - 16 * sc);
        c.quadraticCurveTo(fx + 1 * sc, fy - 26 * sc, fx + 6 * sc, fy - 30 * sc); c.quadraticCurveTo(fx + 5 * sc, fy - 18 * sc, fx + 10 * sc, fy - 12 * sc); c.quadraticCurveTo(fx + 11 * sc, fy - 5 * sc, fx + 8 * sc, fy - 3); c.closePath();
        c.fillStyle = draw.gradient(c, 0, fy - 30 * sc, 0, fy, [[0, col2], [1, col]]); c.fill();
      };
      flame(1, '#ff7a1a', '#ffd23f'); c.lineWidth = 1.4; c.strokeStyle = '#7a2a04'; c.stroke();
      flame(0.55, '#ffd23f', '#fff6c0');
      setLight(0, fx, fy - 12); setLight(1, fx, fy - 4);
      lantern(cx - 26, pt + 41, 0.8, 2);
    }
  } else if (k === 'crates') {        // space: cargo crates with stencil stripes + LED, a satellite dish on the right one
    const crate = (x, y, w, h) => {
      stk(c, cc => draw.roundRect(cc, x, y, w, h, 2.5), '#3a4256', '#0a0d16', 2.2, 0.3, 0.3);
      c.fillStyle = '#ffc233'; c.save(); draw.roundRect(c, x, y, w, h, 2.5); c.clip();
      for (let u = -h; u < w; u += 7) { c.beginPath(); c.moveTo(x + u, y + h); c.lineTo(x + u + 3.5, y + h); c.lineTo(x + u + 3.5 + 7, y + h - 7); c.lineTo(x + u + 7, y + h - 7); c.closePath(); c.fill(); }
      c.restore();
      c.strokeStyle = 'rgba(200,220,255,0.3)'; c.lineWidth = 1; c.strokeRect(x + 3, y + 3, w - 6, h - 12);
      c.fillStyle = '#0a0d16'; c.fillRect(x + w * 0.5 - 6, y + h * 0.35, 12, 3);
    };
    if (!side) {
      crate(cx - 26, pt + 14, 34, 32); crate(cx + 4, pt + 22, 26, 24); crate(cx - 18, pt - 8, 26, 22);
      setLight(0, cx - 22, pt + 18); setLight(1, cx + 25, pt + 26); setLight(2, cx - 1, pt - 4);
    } else {
      crate(cx - 18, pt + 14, 40, 32);
      const dx = cx, dy = pt + 2;
      c.strokeStyle = '#0a0d16'; c.lineWidth = 4; c.beginPath(); c.moveTo(dx, pt + 14); c.lineTo(dx - 2, dy - 4); c.stroke();
      c.strokeStyle = '#8a96b0'; c.lineWidth = 2.2; c.stroke();
      c.save(); c.translate(dx - 3, dy - 10); c.rotate(-0.55);
      stk(c, cc => { cc.beginPath(); cc.ellipse(0, 0, 18, 7, 0, 0, Math.PI); cc.quadraticCurveTo(0, -3, 18, 0); cc.closePath(); }, '#cfd8e8', '#2a3142', 2, 0.45, 0.3, [-18, -3, 36, 10]);
      c.strokeStyle = '#2a3142'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 3); c.lineTo(0, -12); c.stroke();
      c.restore();
      setLight(0, dx - 3 + Math.sin(0.55) * 12, dy - 10 - Math.cos(0.55) * 12); setLight(1, cx + 14, pt + 24);
    }
  } else if (k === 'tiki') {          // beach: a tiki torch on a sand mound with shells (+ a surfboard on the right)
    c.fillStyle = '#5a4a32'; c.beginPath(); c.ellipse(cx + 2, pt + 44, 38, 9, 0, Math.PI, TAU); c.fill();
    c.fillStyle = 'rgba(255,230,180,0.18)'; c.beginPath(); c.ellipse(cx - 4, pt + 40, 24, 3, 0, Math.PI, TAU); c.fill();
    if (side) {
      c.save(); c.translate(cx + 10, pt + 42); c.rotate(-0.22);
      stk(c, cc => { cc.beginPath(); cc.moveTo(0, 0); cc.quadraticCurveTo(-11, -30, 0, -66); cc.quadraticCurveTo(11, -30, 0, 0); cc.closePath(); }, '#2ec4b6', '#06403c', 2, 0.4, 0.3, [-11, -66, 22, 66]);
      c.strokeStyle = '#ffd166'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -62); c.stroke();
      c.strokeStyle = '#ff6f91'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5, -22); c.lineTo(5, -22); c.moveTo(-5, -26); c.lineTo(5, -26); c.stroke();
      c.restore();
    }
    const tx = cx + (side ? -16 : 6), ty = pt + 42;
    c.strokeStyle = '#2a1a08'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, ty - 58); c.stroke();
    c.strokeStyle = '#b08848'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = '#6a4a20'; c.lineWidth = 4.4; c.setLineDash([1.2, 9]); c.beginPath(); c.moveTo(tx, ty - 4); c.lineTo(tx, ty - 56); c.stroke(); c.setLineDash([]);
    stk(c, cc => poly(cc, [tx - 7, ty - 66, tx + 7, ty - 66, tx + 4.5, ty - 56, tx - 4.5, ty - 56]), '#8a6430', '#2a1a08', 1.6, 0.35, 0.2);
    c.strokeStyle = '#5a3a14'; c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(tx - 6 + i * 4, ty - 66); c.lineTo(tx - 4 + i * 3, ty - 56); } c.stroke();
    const fl = cc => { cc.beginPath(); cc.moveTo(tx - 6, ty - 66); cc.quadraticCurveTo(tx - 8, ty - 76, tx - 2, ty - 84); cc.quadraticCurveTo(tx - 1, ty - 78, tx + 1, ty - 80); cc.quadraticCurveTo(tx + 3, ty - 88, tx + 6, ty - 90); cc.quadraticCurveTo(tx + 5, ty - 78, tx + 7, ty - 73); cc.quadraticCurveTo(tx + 8, ty - 69, tx + 6, ty - 66); cc.closePath(); };
    fl(c); c.fillStyle = draw.gradient(c, 0, ty - 90, 0, ty - 66, [[0, '#ffe066'], [1, '#ff7a1a']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#7a2a04'; c.stroke();
    setLight(0, tx, ty - 74);
    const r = rng(side ? 12 : 8);
    for (let i = 0; i < 3; i++) {
      const sx = cx - 22 + i * 16 + r.next() * 6, sy = pt + 41 + r.next() * 2;
      if (i === 1) { draw.star(c, sx, sy, 4, 0.45, 5); c.fillStyle = '#ff7a5c'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = '#6a1a10'; c.stroke(); }
      else { c.beginPath(); c.moveTo(sx, sy + 2); c.lineTo(sx - 3.4, sy - 1); c.quadraticCurveTo(sx, sy - 5, sx + 3.4, sy - 1); c.closePath(); c.fillStyle = '#fff4dc'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = '#8a6a3a'; c.stroke(); }
    }
  } else if (k === 'pumpkins') {      // spooky: a hay bale with a stack of cute carved pumpkins + a dripping candle
    stk(c, cc => draw.roundRect(cc, cx - 30, pt + 26, 60, 20, 5), '#b8913a', '#4a3410', 2.2, 0.3, 0.3);
    c.strokeStyle = 'rgba(80,56,16,0.6)'; c.lineWidth = 0.8;
    for (let x = cx - 28; x < cx + 28; x += 3) { c.beginPath(); c.moveTo(x, pt + 28); c.lineTo(x + 1.5, pt + 44); c.stroke(); }
    c.strokeStyle = '#6a4a14'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 12, pt + 26); c.lineTo(cx - 12, pt + 46); c.moveTo(cx + 12, pt + 26); c.lineTo(cx + 12, pt + 46); c.stroke();
    const pumpkin = (x, y, s, li, face) => {
      c.save(); c.translate(x, y); c.scale(s, s);
      const lob = [[-9, 0, 10, 12], [9, 0, 10, 12], [0, -1, 11, 13]];
      for (let i = 0; i < 3; i++) { const l = lob[i]; stk(c, cc => draw.ellipse(cc, l[0], l[1], l[2], l[3]), i === 2 ? '#ffa040' : '#ff8c1a', '#6a2c04', 2, 0.35, 0.25); }
      c.fillStyle = '#ffe08a';
      if (face) {
        poly(c, [-8, -3, -3, -3, -5.5, -8]); c.fill(); poly(c, [3, -3, 8, -3, 5.5, -8]); c.fill();
        c.beginPath(); c.moveTo(-7, 2); c.quadraticCurveTo(0, 9, 7, 2); c.lineTo(4, 3.5); c.lineTo(2.5, 2); c.lineTo(0, 4); c.lineTo(-2.5, 2); c.lineTo(-4, 3.5); c.closePath(); c.fill();
      }
      c.strokeStyle = '#2e4a14'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(1, -17, 4, -18); c.stroke();
      c.strokeStyle = '#5a8a2a'; c.lineWidth = 1.6; c.stroke();
      c.restore();
      if (face) setLight(li, x, y + 1 * s);
    };
    pumpkin(cx - 12, pt + 14, 1, 0, true); pumpkin(cx + 15, pt + 17, 0.8, 1, !side); pumpkin(cx + 1, pt - 4, 0.72, 2, true);
    const kx = cx + dir * -26, ky = pt + 26;
    stk(c, cc => draw.roundRect(cc, kx - 3.5, ky - 18, 7, 18, 2), '#f2eadc', '#5a5048', 1.4, 0.35, 0.2);
    c.fillStyle = '#f2eadc'; c.beginPath(); c.moveTo(kx + 3.5, ky - 16); c.quadraticCurveTo(kx + 5.5, ky - 11, kx + 4, ky - 8); c.quadraticCurveTo(kx + 2.6, ky - 11, kx + 3.5, ky - 16); c.fill();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(kx, ky - 26); c.quadraticCurveTo(kx + 3, ky - 21, kx, ky - 18.5); c.quadraticCurveTo(kx - 3, ky - 21, kx, ky - 26); c.fill();
    setLight(3, kx, ky - 22);
  } else if (k === 'goldurn' || k === 'neonbox') {   // a recoloured planter tub + a clipped ball topiary (vip: gold, neon: pink rim)
    const gold = k === 'goldurn', pl = side ? W - 52 : -P - 4, pw = 52 + P + 4;
    stk(c, cc => draw.roundRect(cc, pl, pt + 5, pw, 42, 5), gold ? '#141217' : '#130f1a', '#030205', 2.6, 0.2, 0.3);
    if (gold) { c.fillStyle = 'rgba(255,201,74,0.5)'; c.fillRect(pl, pt + 16, pw, 1); c.fillRect(pl, pt + 36, pw, 1); }
    stk(c, cc => draw.roundRect(cc, pl - 3, pt, pw + 6, 8, 3), gold ? '#ffc94a' : '#1d1828', gold ? '#5a3a06' : '#030205', 2.2, 0.5, 0.2);
    if (!gold) { c.beginPath(); c.moveTo(pl - 2, pt + 4); c.lineTo(pl + pw + 2, pt + 4); tube(c, '#ff4fa3', 1.3); c.beginPath(); c.moveTo(pl, pt + 30); c.lineTo(pl + pw, pt + 30); tube(c, '#3df0ff', 1); }
    const bx = cx + dir * 4, byy = pt - 16;
    c.fillStyle = '#05140e'; draw.ellipse(c, bx, pt + 1, 18, 3.5); c.fill();
    c.strokeStyle = '#3a2a16'; c.lineWidth = 3; c.beginPath(); c.moveTo(bx, pt); c.lineTo(bx, byy + 10); c.stroke();
    const r = rng(side ? 15 : 5);
    for (let pass = 0; pass < 2; pass++) {
      const R = pass ? 14 : 17, yy = byy - (pass ? 2 : 0);
      stk(c, cc => draw.circle(cc, bx, yy, R), pass ? '#1f4a3a' : '#163a2c', '#06140e', 2, 0.25, 0.35);
      c.save(); draw.circle(c, bx, yy, R); c.clip();
      for (let i = 0; i < 26; i++) { const a = r.next() * TAU, d = Math.sqrt(r.next()) * R; leaf(c, bx + Math.cos(a) * d, yy + Math.sin(a) * d, 4 + r.next() * 2, 1.8, a + 1.6, r.next() < 0.5 ? '#2e6a52' : '#123426'); }
      c.restore();
    }
    for (let i = 0; i < 4; i++) { const a = -2.6 + i * 0.75; setLight(i, bx + Math.cos(a) * 16, byy - 1 + Math.sin(a) * 16); }
  }
}
// the light points of a theme's corner props (L.fairy[side * 8 ..], 4 x [x, y]; -999 = none): lantern glass, flames,
// LEDs, candles, the clipped topiary's fairy lights, as painted by paintPlanter (its PROP_K scale applied)
export function planterLights(L, side, TH) {
  const F = L.fairy, o = side * 8, W = L.W, pt = L.shrubY + 36, cx = side ? W - 26 : 26, k = TH.planter, dir = side ? -1 : 1;
  const pk = PROP_K[k] || 1, gy = pt + 46;
  for (let i = 0; i < 4; i++) { F[o + i * 2] = -999; F[o + i * 2 + 1] = -999; }
  const set = (i, x, y) => { F[o + i * 2] = cx + (x - cx) * pk; F[o + i * 2 + 1] = gy + (y - gy) * pk; };
  if (k === 'camp') {
    if (!side) { set(0, cx - 6, pt + 25); set(1, cx + 18, pt + 30.6); }
    else { set(0, cx + 2, pt + 28); set(1, cx + 2, pt + 36); set(2, cx - 26, pt + 30.6); }
  } else if (k === 'crates') {
    if (!side) { set(0, cx - 22, pt + 18); set(1, cx + 25, pt + 26); set(2, cx - 1, pt - 4); }
    else { set(0, cx - 3 + Math.sin(0.55) * 12, pt - 8 - Math.cos(0.55) * 12); set(1, cx + 14, pt + 24); }
  } else if (k === 'tiki') set(0, cx + (side ? -16 : 6), pt - 32);
  else if (k === 'pumpkins') { set(0, cx - 12, pt + 15); if (!side) set(1, cx + 15, pt + 17.8); set(2, cx + 1, pt - 3.3); set(3, cx + dir * -26, pt + 4); }
  else if (k === 'goldurn' || k === 'neonbox') { const bx = cx + dir * 4, by = pt - 16; for (let i = 0; i < 4; i++) { const a = -2.6 + i * 0.75; set(i, bx + Math.cos(a) * 16, by - 1 + Math.sin(a) * 16); } }
}
// world.js paintIvy for every corner hanging but the house ivy, in its box's design units
export function paintCorner(c, L, TH) {
  const ix = L.corner + 3, iy = L.roof + 2, len = L.ivyLen, k = TH.ivy;
  if (k === 'banner') {               // a Sadu weave hung down the corner from a brass rod
    const x = ix + 2, w = 16;
    stk(c, cc => draw.roundRect(cc, x - 4, iy - 2, w + 8, 4, 2), '#d9a441', '#4a2c06', 1.4, 0.5, 0.2);
    c.save(); c.translate(x, iy + 1);
    const h = len * 0.9;
    c.beginPath(); c.rect(0, 0, w, h); c.fillStyle = '#7a1a26'; c.fill();
    for (let y = 0; y < h; y += 12) saduStrip(c, 0, y + 1, w, 9);
    c.fillStyle = '#e8d8b8'; for (let xx = 0; xx < w; xx += 3) c.fillRect(xx + 0.5, h, 1.2, 6);
    c.lineWidth = 1.8; c.strokeStyle = '#2a0c10'; c.strokeRect(0, 0, w, h);
    c.restore();
  } else if (k === 'cobweb') {        // a dead vine with a big corner cobweb and a cute dangling spider
    cobweb(c, ix - 2, iy, 40, 0, Math.PI * 0.5, '#f1ecff', 0.5);
    c.strokeStyle = '#08060c'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ix + 6, iy); c.quadraticCurveTo(ix + 14, iy + len * 0.4, ix + 4, iy + len * 0.75); c.stroke();
    c.strokeStyle = 'rgba(241,236,255,0.6)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(ix + 26, iy + 4); c.lineTo(ix + 26, iy + 36); c.stroke();
    stk(c, cc => draw.circle(cc, ix + 26, iy + 39, 3.2), '#1c1428', '#000', 1, 0.3, 0.1);
    c.strokeStyle = '#1c1428'; c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { const yy = iy + 37 + i * 1.5; c.beginPath(); c.moveTo(ix + 23, yy); c.lineTo(ix + 19, yy - 2 + i); c.moveTo(ix + 29, yy); c.lineTo(ix + 33, yy - 2 + i); c.stroke(); }
    c.fillStyle = '#ffffff'; draw.circle(c, ix + 25, iy + 38.5, 0.9); c.fill(); draw.circle(c, ix + 27.4, iy + 38.5, 0.9); c.fill();
  } else if (k === 'palm') {          // a palm frond hanging over the corner (a dark silhouette rimmed by the moon)
    const r = rng(17);
    for (let f = 0; f < 3; f++) {
      const sx = ix - 6 + f * 10, ang = 1.2 + f * 0.35, L2 = len * (0.7 + f * 0.12);
      c.strokeStyle = '#06100c'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, iy - 6);
      const ex = sx + Math.cos(ang) * L2 * 0.5, ey = iy + Math.sin(ang) * L2;
      c.quadraticCurveTo(sx + 18, iy + L2 * 0.2, ex, ey); c.stroke();
      for (let j = 1; j < 12; j++) {
        const u = j / 12, px = lerp(sx, ex, u) + Math.sin(u * 3) * 8, py = lerp(iy - 6, ey, u);
        leaf(c, px, py, 14 * (1 - u * 0.5), 2.6, 2.4 + r.next() * 0.3, '#0a1a12', 'rgba(150,200,255,0.25)');
        leaf(c, px, py, 14 * (1 - u * 0.5), 2.6, 3.9 + r.next() * 0.3, '#08160f', null);
      }
    }
  } else if (k === 'cables') {        // space: hanging cables + a pipe with a blinking light housing
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const sx = ix - 4 + i * 8, d = len * (0.5 + i * 0.18);
      c.strokeStyle = '#05070e'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(sx, iy); c.quadraticCurveTo(sx + 18 + i * 4, iy + d * 0.7, sx + 30 + i * 6, iy + 2); c.stroke();
      c.strokeStyle = i === 1 ? '#3a1a4a' : '#2a3142'; c.lineWidth = 2; c.stroke();
    }
    stk(c, cc => draw.roundRect(cc, ix - 6, iy - 2, 8, len * 0.85, 3), '#3a4256', '#05070e', 1.8, 0.3, 0.2);
    for (let y = iy + 10; y < iy + len * 0.85; y += 18) { c.fillStyle = '#5c6680'; c.fillRect(ix - 7, y, 10, 2.4); }
  }
}

// ------------------------------------------------------------------------------------------------ live sky FX
// drawn by world.js every frame (after the sky sprite, before the room), design units; t = seconds, beat = beats.
// No allocation: fixed loops over hashed positions.
export function drawSkyFx(ctx, L, TH, t, beat) {
  const fx = TH.fx, top = L.cityTop;
  if (fx === 'spooky') {              // a few bats flapping across the sky above the roof (never near the street)
    ctx.fillStyle = '#0a0612';
    for (let i = 0; i < 4; i++) {
      const sp = 14 + i * 5, span = L.W + 80, x = ((t * sp + i * 137) % span) - 40, y = 10 + ((i * 53) % Math.max(20, top + 10)) + Math.sin(t * 1.3 + i) * 5;
      if (y > L.roof - 6) continue;
      batPath(ctx, x, y, 9 + (i & 1) * 3, 0.5 + 0.5 * Math.sin(t * 14 + i * 2));
      ctx.fill();
    }
  } else if (fx === 'vip') {          // two gold searchlight beams sweeping from behind the roof line
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const bx = i ? L.W * 0.78 : L.W * 0.2, by = L.roof - 2, a = -Math.PI / 2 + Math.sin(t * 0.35 + i * 2.1) * 0.55, len = by + 40;
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      ctx.beginPath(); ctx.moveTo(bx - nx * 3, by - ny * 3); ctx.lineTo(bx + nx * 3, by + ny * 3);
      ctx.lineTo(bx + ca * len + nx * 34, by + sa * len + ny * 34); ctx.lineTo(bx + ca * len - nx * 34, by + sa * len - ny * 34); ctx.closePath();
      ctx.fillStyle = 'rgba(255,214,130,0.07)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - nx * 1.5, by - ny * 1.5); ctx.lineTo(bx + nx * 1.5, by + ny * 1.5);
      ctx.lineTo(bx + ca * len + nx * 16, by + sa * len + ny * 16); ctx.lineTo(bx + ca * len - nx * 16, by + sa * len - ny * 16); ctx.closePath();
      ctx.fillStyle = 'rgba(255,230,170,0.07)'; ctx.fill();
    }
    ctx.globalCompositeOperation = op;
  } else if (fx === 'desert' || fx === 'space') {   // a shooting star every few seconds
    const per = fx === 'space' ? 3.1 : 4.3, k = (t % per) / 0.6, i = Math.floor(t / per);
    if (k < 1) {
      const sx = ((i * 97) % 100) / 100 * L.W * 0.7 + L.W * 0.2, sy = 8 + ((i * 41) % 30), dx = -60 * k, dy = 22 * k, a = Math.sin(k * Math.PI);
      const g0 = ctx.globalAlpha;
      ctx.globalAlpha = g0 * 0.85 * a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + dx, sy + dy); ctx.lineTo(sx + dx + 18, sy + dy - 6.6); ctx.stroke();
      ctx.globalAlpha = g0;
      draw.glow(ctx, sx + dx, sy + dy, 5, '#ffffff', 0.7 * a);
    }
  } else if (fx === 'royal') {        // a firework burst over the roofs now and then (sky only)
    const per = 5.2, u = (t % per) / 1.6, i = Math.floor(t / per);
    if (u < 1) {
      const cx = L.W * (0.25 + ((i * 37) % 50) / 100), cy = 12 + ((i * 23) % Math.max(10, top - 6)), rr = 8 + u * 22, a = (1 - u) * (1 - u);
      const col = (i & 1) ? '#ffd166' : '#ff7fbf';
      for (let k = 0; k < 12; k++) {
        const ang = k * TAU / 12, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr + u * u * 6;
        draw.glow(ctx, x, y, 3.4, col, a);
      }
      draw.glow(ctx, cx, cy, 14 * (1 - u), '#fff4dc', a * 0.6);
    }
  } else if (fx === 'beach') {        // the moon road shimmers on the sea
    if (top + 18 < L.roof) {
      const hy = top + 18, mx = L.moon.x;
      for (let i = 0; i < 6; i++) {
        const y = hy + 3 + i * 2.6, w = 4 + i * 4, x = mx + Math.sin(t * 2.3 + i * 1.7) * w * 0.4;
        if (y > L.roof - 2) break;
        draw.glow(ctx, x, y, 3 + i * 0.5, '#fff1d0', 0.35 + 0.25 * Math.sin(t * 5 + i));
      }
    }
  } else if (fx === 'neon') {         // the skyline's neon signs flicker (sky only)
    const k = Math.sin(t * 9) > 0.92 ? 0.3 : 0.7 + 0.3 * Math.sin(beat * Math.PI * 2);
    draw.glow(ctx, L.W * 0.3, top + 12, 30, '#ff4fd0', 0.12 * k);
    draw.glow(ctx, L.W * 0.72, top + 16, 34, '#3df0ff', 0.1 * k);
  }
}

// ------------------------------------------------------------------------------------------------ the party room
// world.js paintRoomBack (room units, clipped to the arch): the wall's motif over the wall gradient; wt = the wainscot's top
export function paintRoomMotif(c, L, TH, wt) {
  const RW = L.RW, R = L.room, m = TH.room.motif, cx = RW / 2;
  if (m === 'damask') {               // the house: faint damask diamonds + soft stripes
    c.fillStyle = 'rgba(255,196,130,0.075)';
    for (let y = 7, row = 0; y < wt - 2; y += 14, row++) {
      for (let x = (row & 1) ? 9 : 1; x < RW + 8; x += 16) { poly(c, [x, y - 4.5, x + 3, y, x, y + 4.5, x - 3, y]); c.fill(); }
    }
    c.fillStyle = 'rgba(0,0,0,0.09)';
    for (let x = 0; x < RW; x += 32) c.fillRect(x, 0, 14, wt - 2);
  } else if (m === 'synth') {                // synthwave: a striped sunset sun behind the DJ, neon lines + a faint grid on the wall
    c.strokeStyle = 'rgba(167,123,255,0.14)'; c.lineWidth = 0.7;
    for (let x = 0; x < RW; x += 14) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, wt); c.stroke(); }
    for (let y = 10; y < wt; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(RW, y); c.stroke(); }
    const sr = Math.min(46, wt * 0.62), sy = wt - 2;
    c.save(); c.beginPath(); c.arc(cx, sy, sr, Math.PI, TAU); c.closePath(); c.clip();
    c.fillStyle = draw.gradient(c, 0, sy - sr, 0, sy, [[0, '#ffe066'], [0.45, '#ff7a6a'], [1, '#ff2fa0']]); c.fillRect(cx - sr, sy - sr, sr * 2, sr);
    c.fillStyle = '#140a2e';
    for (let i = 0; i < 6; i++) { const y = sy - sr * (0.08 + i * 0.12), h = 1 + i * 0.7; c.fillRect(cx - sr, y - h, sr * 2, h); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, cx, sy - sr * 0.4, sr * 0.5, sr * 1.9, '#ff4fa3', 0.22); c.restore();
    for (let i = 0; i < 2; i++) { const y = wt * (0.3 + i * 0.22); c.beginPath(); c.moveTo(0, y); c.lineTo(cx - sr - 10, y); c.moveTo(cx + sr + 10, y); c.lineTo(RW, y); tube(c, i ? '#ff4fa3' : '#3df0ff', 0.9); }
    for (let s = 0; s < 2; s++) { const x = s ? RW - 18 : 18; c.beginPath(); c.moveTo(x, L.archR * 0.6 + 4); c.lineTo(x, wt - 4); tube(c, '#ff4fa3', 1.1); }
  } else if (m === 'drapes') {        // gold damask on deep red + a scalloped velvet valance with a gold fringe under the arch
    c.fillStyle = 'rgba(255,201,74,0.13)';
    for (let y = 9, row = 0; y < wt - 6; y += 13, row++) for (let x = (row & 1) ? 8 : 0; x < RW + 8; x += 16) {
      poly(c, [x, y - 4.6, x + 3.2, y, x, y + 4.6, x - 3.2, y]); c.fill();
      c.beginPath(); c.arc(x, y - 6.2, 1, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < RW; x += 36) c.fillRect(x, 0, 2, wt);
  } else if (m === 'tent') {          // a goat-hair tent: dark and darker stripes, two woven Sadu bands, the roof's sag lines
    for (let x = 0, i = 0; x < RW; x += 11, i++) { c.fillStyle = i & 1 ? 'rgba(0,0,0,0.22)' : 'rgba(255,220,180,0.035)'; c.fillRect(x, 0, 11, wt); }
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
    for (let x = 0; x < RW; x += 44) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 22, 10, x + 44, 0); c.stroke(); }
    const b1 = Math.max(L.archR * 0.55, wt * 0.3);
    saduStrip(c, 0, b1, RW, 9); saduStrip(c, 0, wt - 16, RW, 9);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, b1 + 9, RW, 1.5); c.fillRect(0, wt - 7, RW, 1.5);
  } else if (m === 'starfield') {     // the back wall is one big window onto space: stars, a nebula, a planet's limb, struts
    const r = rng(L.lobby ? 72 : 27);
    c.save(); c.globalCompositeOperation = 'lighter';
    glowFill(c, RW * 0.28, wt * 0.35, 4, 60, '#8a6bff', 0.2); glowFill(c, RW * 0.72, wt * 0.5, 4, 50, '#53e0ff', 0.14);
    c.restore();
    for (let i = 0; i < 70; i++) { c.globalAlpha = 0.35 + r.next() * 0.65; c.fillStyle = r.next() < 0.85 ? '#ffffff' : '#bfe9ff'; c.fillRect(r.next() * RW, r.next() * wt, 0.8 + r.next() * 0.6, 0.8 + r.next() * 0.6); }
    c.globalAlpha = 1;
    c.save(); c.beginPath(); c.arc(RW * 0.86, wt + 40, 64, 0, TAU); c.clip();
    c.fillStyle = draw.gradient(c, RW * 0.86 - 64, wt - 24, RW * 0.86 + 20, wt + 30, [[0, '#53b8e0'], [0.6, '#2a4a9a'], [1, '#0e1438']]); c.fillRect(RW * 0.86 - 70, wt - 30, 140, 140);
    c.restore();
    c.strokeStyle = 'rgba(191,233,255,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.arc(RW * 0.86, wt + 40, 64, Math.PI * 1.05, Math.PI * 1.62); c.stroke();
    for (let i = 1; i < 4; i++) {
      const x = RW * i / 4;
      c.fillStyle = '#2a3142'; c.fillRect(x - 3, 0, 6, wt); c.fillStyle = 'rgba(200,220,255,0.35)'; c.fillRect(x - 3, 0, 1.2, wt);
      c.fillStyle = '#b9c4d8'; for (let y = 10; y < wt; y += 18) { c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fill(); }
    }
  } else if (m === 'bamboo') {        // bamboo poles with nodes, a woven mat band, a strung starfish
    for (let x = 0, i = 0; x < RW + 10; x += 10, i++) {
      c.fillStyle = i & 1 ? '#6a4a24' : '#7a5a2c'; c.fillRect(x, 0, 9, wt);
      c.fillStyle = 'rgba(255,230,170,0.16)'; c.fillRect(x + 1.5, 0, 1.6, wt);
      c.fillStyle = 'rgba(30,15,0,0.55)'; c.fillRect(x + 9, 0, 1, wt);
      for (let y = 8 + (i % 3) * 6; y < wt; y += 22) { c.fillStyle = '#3a2410'; c.fillRect(x, y, 9, 1.6); c.fillStyle = 'rgba(255,230,170,0.25)'; c.fillRect(x, y + 1.6, 9, 0.8); }
    }
    const by = wt - 22;
    c.fillStyle = '#c8a46a'; c.fillRect(0, by, RW, 10);
    c.strokeStyle = 'rgba(80,50,10,0.55)'; c.lineWidth = 0.8;
    for (let x = 0; x < RW; x += 5) { c.beginPath(); c.moveTo(x, by); c.lineTo(x + 5, by + 10); c.moveTo(x + 5, by); c.lineTo(x, by + 10); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, by + 10, RW, 1.4);
    const sx = RW * 0.16, sy = Math.max(L.archR * 0.7, wt * 0.38);
    draw.star(c, sx, sy, 8, 0.42, 5); c.fillStyle = '#ff7a5c'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#5a1a10'; c.stroke();
    c.fillStyle = 'rgba(255,240,200,0.6)'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; c.beginPath(); c.arc(sx + Math.cos(a) * 4, sy + Math.sin(a) * 4, 0.7, 0, TAU); c.fill(); }
  } else if (m === 'cobweb') {        // purple wallpaper with little bat sprigs + cobwebs in both arch corners
    c.fillStyle = 'rgba(180,140,255,0.08)';
    for (let y = 12, row = 0; y < wt - 8; y += 18, row++) for (let x = (row & 1) ? 12 : 2; x < RW + 10; x += 22) { batPath(c, x, y, 9, 0.5); c.fill(); }
    cobweb(c, 2, L.archR * 0.55, 40, -Math.PI * 0.45, Math.PI * 0.5, '#f1ecff', 0.4);
    cobweb(c, RW - 2, L.archR * 0.55, 40, Math.PI * 0.95, Math.PI * 0.5, '#f1ecff', 0.4);
  } else if (m === 'goldleaf') {      // gold-leaf squares with a soft variation, black lacquer pilasters, a gold VIP sign
    const r = rng(9);
    for (let y = 0; y < wt; y += 12) for (let x = 0; x < RW; x += 12) { c.fillStyle = 'rgba(255,214,120,' + (0.04 + r.next() * 0.08).toFixed(3) + ')'; c.fillRect(x + 0.5, y + 0.5, 11, 11); }
    c.strokeStyle = 'rgba(80,50,0,0.35)'; c.lineWidth = 0.6;
    for (let y = 0; y < wt; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(RW, y); c.stroke(); }
    for (let i = 0; i < 2; i++) {
      const x = i ? RW - 30 : 18;
      c.fillStyle = '#0e0c10'; c.fillRect(x, 0, 12, wt); c.fillStyle = 'rgba(255,201,74,0.6)'; c.fillRect(x, 0, 1, wt); c.fillRect(x + 11, 0, 1, wt);
    }
    const vy = Math.max(L.archR * 0.5 + 6, wt * 0.3), vx = RW * 0.22;
    stk(c, cc => draw.roundRect(cc, vx - 17, vy - 8, 34, 16, 4), '#0e0c10', '#ffc94a', 1.6, 0.2, 0.2);
    draw.text(c, 'VIP', vx, vy + 0.6, VIP_TXT);
  }
}
const VIP_TXT = { size: 11, weight: 800, font: 'Baloo 2', color: '#ffd77a', letterSpacing: 1 };
// world.js paintRoomBack, after the stage: the theme's pieces between the wall and the band (drapes, tent poles, columns)
export function paintRoomDeco(c, L, TH) {
  const RW = L.RW, RH = L.RH, R = L.room, m = TH.room.motif, A = L.archR;
  if (m === 'drapes') {               // velvet drapes swagged back at both sides with gold tie-backs + tassels, a valance
    for (let s = 0; s < 2; s++) {
      const dir = s ? -1 : 1, x0 = s ? RW : 0, w = 34, by = R.fb + 4;
      const drape = cc => { cc.beginPath(); cc.moveTo(x0, 0); cc.lineTo(x0 + dir * w, 0); cc.quadraticCurveTo(x0 + dir * (w * 0.55), by * 0.45, x0 + dir * 10, by * 0.62);
        cc.quadraticCurveTo(x0 + dir * 18, by * 0.85, x0 + dir * 24, by); cc.lineTo(x0, by); cc.closePath(); };
      stk(c, drape, '#7a1430', '#2a0410', 2, 0.3, 0.3, [s ? RW - w : 0, 0, w, by]);
      c.save(); drape(c); c.clip(); c.strokeStyle = 'rgba(30,0,10,0.45)'; c.lineWidth = 1.4;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x0 + dir * i * 7, 0); c.quadraticCurveTo(x0 + dir * i * 4, by * 0.4, x0 + dir * 8, by * 0.62); c.lineTo(x0 + dir * (8 + i * 4), by); c.stroke(); }
      c.strokeStyle = 'rgba(255,140,170,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + dir * 4, 0); c.quadraticCurveTo(x0 + dir * 3, by * 0.3, x0 + dir * 6, by * 0.6); c.stroke();
      c.restore();
      const tx = x0 + dir * 11, ty = by * 0.62;
      stk(c, cc => draw.ellipse(cc, tx, ty, 4.5, 3), '#ffc94a', '#7a4a08', 1.2, 0.55, 0.2);
      c.strokeStyle = '#7a4a08'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty + 2.6); c.lineTo(tx, ty + 8); c.stroke();
      stk(c, cc => poly(cc, [tx - 3, ty + 8, tx + 3, ty + 8, tx + 4, ty + 15, tx - 4, ty + 15]), '#ffc94a', '#7a4a08', 1, 0.5, 0.2);
    }
    const vy = A * 0.32;
    c.save(); c.beginPath(); c.moveTo(0, 0); c.lineTo(RW, 0); c.lineTo(RW, vy);
    for (let x = RW; x > 0; x -= 22) c.quadraticCurveTo(x - 11, vy + 9, x - 22, vy);
    c.closePath(); c.fillStyle = '#6b1d5e'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#2a0724'; c.stroke();
    c.strokeStyle = '#ffc94a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, vy - 2);
    for (let x = 0; x < RW; x += 22) c.quadraticCurveTo(x + 11, vy + 7, x + 22, vy - 2);
    c.stroke();
    c.fillStyle = '#ffc94a'; for (let x = 11; x < RW; x += 22) { c.beginPath(); c.moveTo(x - 2, vy + 5); c.lineTo(x + 2, vy + 5); c.lineTo(x, vy + 10); c.closePath(); c.fill(); }
    c.restore();
  } else if (m === 'tent') {          // two wooden tent poles + guy ropes
    for (let s = 0; s < 2; s++) {
      const x = s ? RW - 14 : 14;
      stk(c, cc => draw.roundRect(cc, x - 3, 0, 6, R.fb + 4, 2), '#7a4a24', '#2a1208', 1.6, 0.35, 0.2);
      c.strokeStyle = 'rgba(232,216,184,0.55)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, 12); c.lineTo(s ? RW : 0, R.fb * 0.5); c.stroke();
    }
  } else if (m === 'bamboo') {        // a string of warm bulbs swagged across the room (the bulbs' glow is the light)
    c.strokeStyle = 'rgba(20,10,4,0.85)'; c.lineWidth = 0.9;
    const y0 = A * 0.75 + 6;
    c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(RW * 0.25, y0 + 14, RW * 0.5, y0); c.quadraticCurveTo(RW * 0.75, y0 + 14, RW, y0); c.stroke();
    for (let i = 1; i < 12; i++) {
      const u = i / 12, half = u < 0.5, v = half ? u * 2 : u * 2 - 1, x = u * RW, y = y0 + 4 * 14 * v * (1 - v) * 0.5 + 2;
      c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, x, y + 2, 0.5, 7, '#ffc46b', 0.45); c.restore();
      stk(c, cc => draw.ellipse(cc, x, y + 2, 1.8, 2.3), i % 3 === 0 ? '#ff9f6b' : '#ffe2a0', '#4a2c08', 0.7, 0.5, 0.1);
    }
  } else if (m === 'goldleaf') {      // gold searchlight cones on the back wall
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 2; s++) {
      const x = s ? RW * 0.82 : RW * 0.18;
      c.fillStyle = draw.gradient(c, 0, R.fb, 0, 0, [[0, 'rgba(255,214,120,0.16)'], [1, 'rgba(255,214,120,0)']]);
      poly(c, [x - 4, R.fb - 22, x + 4, R.fb - 22, x + 30 * (s ? -1 : 1) + 18, 0, x + 30 * (s ? -1 : 1) - 18, 0]); c.fill();
    }
    c.restore();
  }
}
// ---- chandeliers (66 x 42 sprite, the stem top at (33, 8); the four lights sit on world.js's CHAND_TIPS)
export function paintChandelierTheme(c, TH) {
  const k = TH.room.chand, cx = 33, oy = 8, tips = [7, 19, 47, 59], ty = [9.4, 5.4, 5.4, 9.4];
  const M = TH.room.metal, MI = TH.room.metalInk;
  c.lineCap = 'round';
  if (k === 'brass') {                // the house: four brass arms with candles, crystal drops, a brass bowl + finial
    const BR = '#d9a441', BI = '#3f2707';
    for (let i = 0; i < 4; i++) {
      const tx = tips[i], tyy = oy + (i === 1 || i === 2 ? 3 : 7);
      c.beginPath(); c.moveTo(cx, oy + 14); c.bezierCurveTo(cx + (tx - cx) * 0.4, oy + 26, tx, oy + 22, tx, tyy + 3);
      c.lineWidth = 4; c.strokeStyle = BI; c.stroke(); c.lineWidth = 2.2; c.strokeStyle = BR; c.stroke();
      c.fillStyle = '#efe6ff'; c.strokeStyle = 'rgba(40,20,60,0.8)'; c.lineWidth = 0.7;    // a crystal drop under the arm
      const dx = cx + (tx - cx) * 0.62, dy = oy + 22;
      c.beginPath(); c.moveTo(dx, dy); c.quadraticCurveTo(dx + 2, dy + 4, dx, dy + 6); c.quadraticCurveTo(dx - 2, dy + 4, dx, dy); c.fill(); c.stroke();
      stk(c, cc => draw.ellipse(cc, tx, tyy + 3, 3.6, 1.6), BR, BI, 1.2, 0.4, 0.2);
      stk(c, cc => draw.roundRect(cc, tx - 1.6, tyy - 4, 3.2, 7, 1), '#f6ead0', '#6a5a40', 1, 0.3, 0.1);
      c.fillStyle = '#fff1c6'; draw.circle(c, tx, tyy - 5.6, 1.9); c.fill();
    }
    stk(c, cc => draw.roundRect(cc, cx - 2, oy - 1, 4, 18, 1.5), BR, BI, 1.5, 0.5, 0.2);
    stk(c, cc => { cc.beginPath(); cc.ellipse(cx, oy + 15, 11, 9, 0, 0, Math.PI); cc.closePath(); }, BR, BI, 1.8, 0.45, 0.25, [cx - 11, oy + 15, 22, 9]);
    stk(c, cc => draw.ellipse(cc, cx, oy + 15, 11, 2.2), '#f0c060', BI, 1.2, 0.4, 0.1);
    c.fillStyle = '#efe6ff';
    for (let i = -2; i <= 2; i++) { draw.circle(c, cx + i * 4.2, oy + 24 - Math.abs(i) * 1.6, 1.3); c.fill(); }
    stk(c, cc => draw.circle(cc, cx, oy + 27, 2.4), '#f0c060', BI, 1, 0.5, 0.1);
  } else if (k === 'crystal') {              // a grander crystal chandelier: gold arms, crystal strands, a crystal ball drop
    for (let i = 0; i < 4; i++) {
      const tx = tips[i], tyy = oy + (i === 1 || i === 2 ? 3 : 7);
      c.beginPath(); c.moveTo(cx, oy + 14); c.bezierCurveTo(cx + (tx - cx) * 0.4, oy + 28, tx, oy + 24, tx, tyy + 3);
      c.lineWidth = 4; c.strokeStyle = MI; c.stroke(); c.lineWidth = 2.2; c.strokeStyle = M; c.stroke();
      stk(c, cc => draw.ellipse(cc, tx, tyy + 3, 3.8, 1.7), M, MI, 1.2, 0.5, 0.2);
      stk(c, cc => draw.roundRect(cc, tx - 1.6, tyy - 4, 3.2, 7, 1), '#fbf6ec', '#6a5a40', 1, 0.3, 0.1);
      c.fillStyle = '#fff1c6'; draw.circle(c, tx, tyy - 5.6, 1.9); c.fill();
    }
    c.strokeStyle = 'rgba(230,240,255,0.85)'; c.lineWidth = 0.7;
    for (let i = 0; i < 9; i++) {
      const x0 = 10 + i * 5.8, sag = 6 + Math.abs(i - 4) * -0.8 + 6;
      c.beginPath(); c.moveTo(x0, oy + 18); c.quadraticCurveTo((x0 + cx) / 2, oy + 18 + sag, cx + (x0 - cx) * 0.2, oy + 24); c.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * 6, y = oy + 26 - Math.abs(i) * 1.4;
      c.fillStyle = '#eef4ff'; c.strokeStyle = 'rgba(40,40,90,0.75)'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2.2, y + 4, x, y + 7); c.quadraticCurveTo(x - 2.2, y + 4, x, y); c.fill(); c.stroke();
    }
    stk(c, cc => draw.roundRect(cc, cx - 2, oy - 1, 4, 18, 1.5), M, MI, 1.5, 0.5, 0.2);
    stk(c, cc => { cc.beginPath(); cc.ellipse(cx, oy + 15, 12, 9, 0, 0, Math.PI); cc.closePath(); }, M, MI, 1.8, 0.45, 0.25, [cx - 12, oy + 15, 24, 9]);
    stk(c, cc => draw.circle(cc, cx, oy + 31, 3.2), '#dff0ff', '#3a3a7a', 1, 0.7, 0.1);
  } else if (k === 'ring') {          // a neon ring light: a pink tube ellipse on cables, four cyan bulbs on it
    c.strokeStyle = '#06303a'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(cx, oy); c.lineTo(tips[0], ty[0] + 2); c.moveTo(cx, oy); c.lineTo(tips[3], ty[3] + 2); c.stroke();
    c.beginPath(); c.ellipse(cx, oy + 6, 26, 5, 0, 0, TAU); c.lineWidth = 3.4; c.strokeStyle = '#120a1e'; c.stroke();
    c.beginPath(); c.ellipse(cx, oy + 6, 26, 5, 0, 0, TAU); tube(c, '#ff4fa3', 1.6);
    for (let i = 0; i < 4; i++) stk(c, cc => draw.circle(cc, tips[i], ty[i], 2.2), '#d8fbff', '#06303a', 0.9, 0.6, 0.1);
    stk(c, cc => draw.circle(cc, cx, oy, 2.4), '#2b2550', '#06303a', 1, 0.4, 0.1);
  } else if (k === 'lanterns') {      // three brass lanterns on chains at different heights (the lights sit inside them)
    const lan = (x, y, s) => {
      c.strokeStyle = MI; c.lineWidth = 0.9; c.setLineDash([1.4, 0.9]); c.beginPath(); c.moveTo(cx, oy - 2); c.lineTo(x, y - 6 * s); c.stroke(); c.setLineDash([]);
      stk(c, cc => poly(cc, [x - 4.5 * s, y - 3.5 * s, x + 4.5 * s, y - 3.5 * s, x + 2.4 * s, y - 6.5 * s, x - 2.4 * s, y - 6.5 * s]), M, MI, 1, 0.5, 0.15);
      c.fillStyle = draw.radial(c, x, y + 1, 0.4, 5 * s, [[0, '#fff3c8'], [0.6, '#ffb347'], [1, '#c2562e']]);
      draw.roundRect(c, x - 3.8 * s, y - 3.5 * s, 7.6 * s, 9 * s, 1.4); c.fill(); c.lineWidth = 1; c.strokeStyle = MI; c.stroke();
      c.strokeStyle = MI; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - 1.3 * s, y - 3.5 * s); c.lineTo(x - 1.3 * s, y + 5.5 * s); c.moveTo(x + 1.3 * s, y - 3.5 * s); c.lineTo(x + 1.3 * s, y + 5.5 * s); c.stroke();
      stk(c, cc => poly(cc, [x - 4.5 * s, y + 5.5 * s, x + 4.5 * s, y + 5.5 * s, x + 2.8 * s, y + 8.5 * s, x - 2.8 * s, y + 8.5 * s]), M, MI, 1, 0.5, 0.15);
    };
    lan(tips[0], ty[0], 0.9); lan(tips[3], ty[3], 0.9); lan(tips[1], ty[1] + 12, 1.15); lan(tips[2], ty[2] + 6, 1);
    stk(c, cc => draw.circle(cc, cx, oy - 2, 2.4), M, MI, 1, 0.5, 0.1);
  } else if (k === 'orb') {           // a glowing orb lamp with a chrome ring + four LEDs on the ring
    c.strokeStyle = MI; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx, oy - 2); c.lineTo(cx, oy + 6); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, cx, oy + 16, 2, 22, '#8ae8ff', 0.4); c.restore();
    const ring = front => { c.beginPath(); c.ellipse(cx, oy + 14, 27, 6, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); c.lineWidth = 3.4; c.strokeStyle = MI; c.stroke(); c.lineWidth = 2; c.strokeStyle = M; c.stroke(); };
    ring(false);
    c.beginPath(); c.arc(cx, oy + 16, 10, 0, TAU);
    c.fillStyle = draw.radial(c, cx - 3, oy + 13, 0.5, 11, [[0, '#ffffff'], [0.5, '#bff4ff'], [1, '#53a0e0']]); c.fill(); c.lineWidth = 1.4; c.strokeStyle = MI; c.stroke();
    ring(true);
    for (let i = 0; i < 4; i++) stk(c, cc => draw.circle(cc, tips[i], ty[i] + 6, 1.8), i & 1 ? '#ff3fb4' : '#3df0ff', MI, 0.7, 0.6, 0.1);
  } else if (k === 'paper') {         // three round paper lanterns (pink, yellow, teal) on a cord
    c.strokeStyle = 'rgba(40,20,10,0.9)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(0, oy - 4); c.quadraticCurveTo(cx, oy + 8, 66, oy - 4); c.stroke();
    const pl = (x, y, r, col) => {
      c.beginPath(); c.moveTo(x, y - r - 3); c.lineTo(x, y - r); c.stroke();
      stk(c, cc => draw.ellipse(cc, x, y, r, r * 0.92), col, color.dark(col, 0.5), 1.1, 0.4, 0.2);
      c.strokeStyle = color.alpha(color.dark(col, 0.45), 0.55); c.lineWidth = 0.6;
      for (let k2 = -2; k2 <= 2; k2++) { c.beginPath(); c.ellipse(x, y, r * Math.abs(k2) / 2.6 + 0.4, r * 0.92, 0, -Math.PI / 2, Math.PI / 2, k2 < 0); c.stroke(); }
      c.fillStyle = '#2a1a10'; c.fillRect(x - r * 0.4, y - r * 0.92 - 1, r * 0.8, 1.6); c.fillRect(x - r * 0.4, y + r * 0.92 - 0.6, r * 0.8, 1.6);
      c.strokeStyle = 'rgba(40,20,10,0.9)'; c.lineWidth = 0.8;
    };
    pl(tips[0], ty[0] + 1, 5.6, '#ff6f91'); pl(tips[3], ty[3] + 1, 5.6, '#2ec4b6'); pl(tips[1], ty[1] + 9, 7.4, '#ffd166'); pl(tips[2], ty[2] + 7, 6.6, '#ff9f6b');
  } else if (k === 'candles') {       // an iron ring of dripping candles hung with cobweb strands
    c.strokeStyle = '#0d0716'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx, oy - 2); c.lineTo(tips[0], ty[0] + 4); c.moveTo(cx, oy - 2); c.lineTo(tips[3], ty[3] + 4); c.moveTo(cx, oy - 2); c.lineTo(tips[1], ty[1] + 4); c.moveTo(cx, oy - 2); c.lineTo(tips[2], ty[2] + 4); c.stroke();
    c.beginPath(); c.ellipse(cx, oy + 11, 27, 4.4, 0, 0, TAU); c.lineWidth = 3.6; c.strokeStyle = '#0d0716'; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = '#4a4058'; c.stroke();
    for (let i = 0; i < 4; i++) {
      const tx = tips[i], h = 8 + (i & 1) * 2.5;
      stk(c, cc => draw.roundRect(cc, tx - 1.8, ty[i], 3.6, h, 1), '#f2eadc', '#5a5048', 0.9, 0.35, 0.15);
      c.fillStyle = '#f2eadc'; c.beginPath(); c.moveTo(tx + 1.8, ty[i] + 1); c.quadraticCurveTo(tx + 3, ty[i] + 4, tx + 2.2, ty[i] + 6); c.quadraticCurveTo(tx + 1.4, ty[i] + 4, tx + 1.8, ty[i] + 1); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(tx, ty[i] - 5); c.quadraticCurveTo(tx + 2, ty[i] - 1.5, tx, ty[i] + 0.4); c.quadraticCurveTo(tx - 2, ty[i] - 1.5, tx, ty[i] - 5); c.fill();
    }
    c.strokeStyle = 'rgba(241,236,255,0.55)'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(tips[0], ty[0] + 6); c.quadraticCurveTo(tips[0] + 4, ty[0] + 18, tips[0] + 2, ty[0] + 24); c.moveTo(tips[2] + 2, ty[2] + 8); c.quadraticCurveTo(tips[2] + 8, ty[2] + 16, tips[3] - 1, ty[3] + 20); c.stroke();
  } else if (k === 'gold') {          // modern gold rings with tiny warm bulbs
    c.strokeStyle = MI; c.lineWidth = 0.9; c.beginPath(); c.moveTo(cx, oy - 2); c.lineTo(cx, oy + 4); c.moveTo(cx - 20, oy + 6); c.lineTo(cx, oy - 2); c.lineTo(cx + 20, oy + 6); c.stroke();
    for (let r2 = 0; r2 < 3; r2++) {
      c.beginPath(); c.ellipse(cx, oy + 6 + r2 * 7, 27 - r2 * 6, 4.6 - r2 * 0.8, 0, 0, TAU);
      c.lineWidth = 3; c.strokeStyle = MI; c.stroke(); c.lineWidth = 1.6; c.strokeStyle = M; c.stroke();
    }
    for (let i = 0; i < 4; i++) stk(c, cc => draw.circle(cc, tips[i], ty[i] + 1, 1.8), '#fff4d0', MI, 0.7, 0.6, 0.1);
    c.fillStyle = '#fff4d0'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.arc(cx + Math.cos(a) * 15, oy + 13 + Math.sin(a) * 3.4, 0.9, 0, TAU); c.fill(); }
  }
}
// ---- front corner props (room units, the arch clip on; at the sill y = RH); 'plants' = the house's potted palms (world.js
// shows them from decor 3)
export function paintRoomFrontTheme(c, L, TH) {
  const RW = L.RW, RH = L.RH, k = TH.room.front, rp = k === 'plants' ? rng(55) : null;
  for (let s = 0; s < 2; s++) {
    const x = s ? RW - 12 : 12, dir = s ? -1 : 1, y = RH + 1;
    if (k === 'plants') {             // a leafy palm in a brass pot
      const px = s ? RW - 9 : 9;
      for (let j = 0; j < 9; j++) {
        const a = dir * (-0.2 + j * 0.16) + (rp.next() - 0.5) * 0.3, len = 16 + rp.next() * 12;
        leaf(c, px + dir * (j - 4) * 0.8, y - 15, len, 6.5 + rp.next() * 2.5, a, j & 1 ? '#1f6e4e' : '#16553b', '#08281b', 1.4);
      }
      stk(c, cc => poly(cc, [px - 10, y - 17, px + 10, y - 17, px + 7.5, y, px - 7.5, y]), '#b3832f', '#3f2707', 2, 0.4, 0.25);
      c.fillStyle = 'rgba(255,240,200,0.4)'; c.fillRect(px - 9, y - 15, 18, 1);
    } else if (k === 'speakers') {           // tall speaker cabinets with cyan cone rings
      stk(c, cc => draw.roundRect(cc, x - 11, y - 46, 22, 46, 2.5), '#141028', '#05040e', 1.8, 0.25, 0.3);
      for (let i = 0; i < 2; i++) {
        const cy = y - 34 + i * 18, r = i ? 8 : 6;
        c.beginPath(); c.arc(x, cy, r, 0, TAU); c.fillStyle = '#05040e'; c.fill();
        c.beginPath(); c.arc(x, cy, r, 0, TAU); tube(c, i ? '#3df0ff' : '#ff4fa3', 0.8);
        c.fillStyle = '#2b2550'; c.beginPath(); c.arc(x, cy, r * 0.4, 0, TAU); c.fill();
      }
    } else if (k === 'urns') {        // gold urns with dark palms
      const r = rng(55 + s);
      for (let j = 0; j < 9; j++) leaf(c, x + dir * (j - 4) * 0.8, y - 15, 16 + r.next() * 12, 6.5 + r.next() * 2.5, dir * (-0.2 + j * 0.16) + (r.next() - 0.5) * 0.3, j & 1 ? '#1f5a3e' : '#16452f', '#08281b');
      stk(c, cc => { cc.beginPath(); cc.moveTo(x - 10, y - 17); cc.quadraticCurveTo(x - 12, y - 6, x - 5, y); cc.lineTo(x + 5, y); cc.quadraticCurveTo(x + 12, y - 6, x + 10, y - 17); cc.closePath(); }, '#ffc94a', '#5a3606', 1.8, 0.5, 0.25, [x - 11, y - 17, 22, 17]);
      c.strokeStyle = 'rgba(122,74,8,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 9, y - 11); c.lineTo(x + 9, y - 11); c.stroke();
    } else if (k === 'cushions') {    // majlis floor cushions with Sadu bands + an arm bolster
      for (let i = 0; i < 2; i++) {
        const cy = y - 6 - i * 9, w = 26 - i * 4, cx2 = x + dir * (2 + i * 2);
        const cu = cc => draw.roundRect(cc, cx2 - w / 2, cy - 5, w, 10, 4);
        stk(c, cu, i ? '#7a1e22' : '#5a1418', '#1a0406', 1.6, 0.3, 0.3);
        c.save(); cu(c); c.clip(); saduStrip(c, cx2 - w / 2, cy - 1.6, w, 3.6); c.restore();
      }
      stk(c, cc => draw.roundRect(cc, x + dir * 6 - 4, y - 30, 8, 13, 4), '#b3203a', '#3a0610', 1.4, 0.35, 0.25);
      c.fillStyle = '#e0a030'; c.fillRect(x + dir * 6 - 4, y - 25, 8, 1.6);
    } else if (k === 'crystals') {    // glowing alien crystal clusters
      const col = s ? '#ff3fb4' : '#3df0ff';
      c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, x, y - 12, 1, 22, col, 0.25); c.restore();
      const sh = [[-6, 18, -0.3, 5], [0, 26, 0, 6.5], [6, 15, 0.35, 4.5], [-2, 12, -0.6, 3.6]];
      for (let i = 0; i < sh.length; i++) {
        const q = sh[i];
        c.save(); c.translate(x + q[0] * dir, y); c.rotate(q[2] * dir);
        stk(c, cc => poly(cc, [-q[3], 0, -q[3], -q[1] * 0.7, 0, -q[1], q[3], -q[1] * 0.7, q[3], 0]), color.mix(col, '#ffffff', 0.35), color.dark(col, 0.6), 1.2, 0.5, 0.2, [-q[3], -q[1], q[3] * 2, q[1]]);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, -q[1]); c.lineTo(0, -2); c.stroke();
        c.restore();
      }
    } else if (k === 'palms') {       // potted palms in woven baskets
      const r = rng(66 + s);
      for (let j = 0; j < 7; j++) leaf(c, x, y - 16, 22 + r.next() * 10, 4.4, dir * (-0.9 + j * 0.3) + (r.next() - 0.5) * 0.2, j & 1 ? '#2e7d4f' : '#1e5a38', '#0a2414');
      stk(c, cc => poly(cc, [x - 9, y - 17, x + 9, y - 17, x + 7, y, x - 7, y]), '#c8a46a', '#4a3410', 1.6, 0.35, 0.25);
      c.strokeStyle = 'rgba(80,52,16,0.65)'; c.lineWidth = 0.7;
      for (let yy = y - 14; yy < y; yy += 3.5) { c.beginPath(); c.moveTo(x - 8.5, yy); c.lineTo(x + 8.5, yy); c.stroke(); }
    } else if (k === 'candelabra') {  // a three-branch candelabra + a little pumpkin at its foot
      c.strokeStyle = '#0d0716'; c.lineWidth = 3.2; c.lineCap = 'round';
      const cb = () => { c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x, y - 30); c.moveTo(x - 9, y - 30); c.quadraticCurveTo(x - 9, y - 22, x, y - 22); c.quadraticCurveTo(x + 9, y - 22, x + 9, y - 30); c.stroke(); };
      cb(); c.strokeStyle = '#6a6070'; c.lineWidth = 1.6; cb();
      stk(c, cc => draw.ellipse(cc, x, y - 1.5, 7, 2.4), '#4a4058', '#0d0716', 1.2, 0.3, 0.2);
      for (let i = -1; i <= 1; i++) {
        const cxx = x + i * 9, top = y - 30 - 8 - (i ? 0 : 3);
        stk(c, cc => draw.roundRect(cc, cxx - 1.8, top, 3.6, 8 + (i ? 0 : 3), 1), '#f2eadc', '#5a5048', 0.9, 0.35, 0.15);
        c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(cxx, top - 5.5); c.quadraticCurveTo(cxx + 2, top - 2, cxx, top); c.quadraticCurveTo(cxx - 2, top - 2, cxx, top - 5.5); c.fill();
      }
      stk(c, cc => draw.ellipse(cc, x + dir * 12, y - 5, 6, 5), '#ff8c1a', '#6a2c04', 1.2, 0.35, 0.2);
    } else if (k === 'booth') {       // a curved black leather VIP booth with gold piping (left) / a gold urn (right)
      if (!s) {
        const bk = cc => { cc.beginPath(); cc.moveTo(-2, y - 34); cc.quadraticCurveTo(26, y - 36, 30, y - 14); cc.lineTo(30, y); cc.lineTo(-2, y); cc.closePath(); };
        stk(c, bk, '#141016', '#000000', 1.8, 0.25, 0.3, [-2, y - 36, 32, 36]);
        c.save(); bk(c); c.clip(); c.strokeStyle = 'rgba(255,201,74,0.7)'; c.lineWidth = 0.8;
        for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-2, y - 34 + i * 6); c.quadraticCurveTo(22, y - 34 + i * 6, 27, y - 12 + i); c.stroke(); }
        c.restore();
        stk(c, cc => draw.roundRect(cc, -2, y - 13, 34, 13, 4), '#1c1820', '#000000', 1.6, 0.3, 0.3);
        c.strokeStyle = '#ffc94a'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y - 12); c.lineTo(30, y - 12); c.stroke();
      } else {
        stk(c, cc => { cc.beginPath(); cc.moveTo(x - 9, y - 22); cc.quadraticCurveTo(x - 11, y - 6, x - 5, y); cc.lineTo(x + 5, y); cc.quadraticCurveTo(x + 11, y - 6, x + 9, y - 22); cc.closePath(); }, '#141016', '#000', 1.6, 0.3, 0.3, [x - 11, y - 22, 22, 22]);
        c.strokeStyle = '#ffc94a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 9.5, y - 20); c.lineTo(x + 9.5, y - 20); c.moveTo(x - 9, y - 8); c.lineTo(x + 9, y - 8); c.stroke();
        c.strokeStyle = '#e8c36a'; c.lineWidth = 1;
        for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.2; c.beginPath(); c.moveTo(x, y - 22); c.quadraticCurveTo(x + Math.cos(a) * 8, y - 34, x + Math.cos(a) * 14, y - 46 + Math.abs(j - 3) * 3); c.stroke(); }
      }
    }
  }
}
// ---- the decor-6 wall sign (48 x 40, centre (24, 20); world.js draws it at R.neonX / neonY): TH.room.sign. A neon tube
// sign hangs on world.js's dark backing board and flickers (signTube): the house heart + note, Neon's mixtape, Space's UFO,
// Beach's sunset palm, Spooky's bat over a full moon, VIP's cut gem. 'crest' (Royal: a gilt crown cartouche) and 'dallah'
// (Desert: a brass coffee pot and two finjan cups on a Sadu-trimmed shelf) are lit plaques with their own backing that
// glow steadily (never a neon heart in a palace or a desert camp). res = the bake's device scale (the house heart's blur)
export function signTube(TH) { const k = TH.room.sign; return k !== 'crest' && k !== 'dallah'; }
function twinkle(c, x, y, r, col) {
  c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); tube(c, col, 0.7);
}
export function paintRoomSign(c, TH, res) {
  const k = TH.room.sign;
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (k === 'cassette') {             // a neon mixtape: the shell, its label window, two reels + the tape, the head slot
    draw.roundRect(c, 7.5, 8.5, 33, 23, 3.5); tube(c, '#ff4fa3', 1.5);
    draw.roundRect(c, 11, 11.8, 26, 10.8, 2); tube(c, '#ff4fa3', 0.8);
    for (let s = 0; s < 2; s++) {
      const x = s ? 30.4 : 17.6;
      draw.circle(c, x, 17.2, 3.1); tube(c, '#3df0ff', 1.1);
      c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + s; c.moveTo(x, 17.2); c.lineTo(x + Math.cos(a) * 1.9, 17.2 + Math.sin(a) * 1.9); } tube(c, '#3df0ff', 0.5);
    }
    c.beginPath(); c.moveTo(20.8, 19.6); c.lineTo(27.2, 19.6); tube(c, '#3df0ff', 0.8);
    c.beginPath(); c.moveTo(13.5, 31); c.lineTo(15.6, 26.2); c.lineTo(32.4, 26.2); c.lineTo(34.5, 31); tube(c, '#ff4fa3', 1.1);
    twinkle(c, 42.5, 6.5, 2.2, '#ffe08a');
  } else if (k === 'ufo') {           // a flying saucer: a glass dome, the hull ring with three lights, a tractor beam
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = draw.gradient(c, 0, 23, 0, 37, [[0, 'rgba(157,255,106,0.32)'], [1, 'rgba(157,255,106,0.04)']]);
    poly(c, [19, 23.5, 29, 23.5, 36, 36.5, 12, 36.5]); c.fill(); c.restore();
    c.beginPath(); c.moveTo(19, 24.5); c.lineTo(12.5, 36); c.moveTo(29, 24.5); c.lineTo(35.5, 36); tube(c, '#9dff6a', 0.8);
    c.beginPath(); c.arc(24, 18.6, 7.6, Math.PI * 1.02, Math.PI * 1.98); tube(c, '#3df0ff', 1.2);
    c.beginPath(); c.ellipse(24, 20.4, 17, 4.4, 0, 0, TAU); tube(c, '#3df0ff', 1.5);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(16 + i * 8, 21.3, 1.1, 0, TAU); tube(c, '#ff3fb4', 0.9); }
    twinkle(c, 8, 8, 2.2, '#ffffff'); twinkle(c, 40.5, 9, 1.6, '#bfe9ff');
  } else if (k === 'palm') {          // a sunset palm: the sun on the horizon (two bands), the waves, a leaning palm
    c.beginPath(); c.arc(29, 28, 9.5, Math.PI, TAU); c.closePath(); tube(c, '#ff9f4a', 1.3);
    c.beginPath(); c.moveTo(21.4, 24.6); c.lineTo(36.6, 24.6); c.moveTo(23.4, 21.2); c.lineTo(34.6, 21.2); tube(c, '#ffd166', 0.7);
    for (let i = 0; i < 2; i++) {
      const y = 31.5 + i * 3.8, x0 = 9 + i * 4, x1 = 40 - i * 3;
      c.beginPath(); c.moveTo(x0, y);
      for (let x = x0; x < x1; x += 6) { c.quadraticCurveTo(x + 1.5, y - 1.6, x + 3, y); c.quadraticCurveTo(x + 4.5, y + 1.6, Math.min(x1, x + 6), y); }
      tube(c, '#2ee6d6', 0.8);
    }
    c.beginPath(); c.moveTo(13.5, 33); c.quadraticCurveTo(12, 21, 16.5, 10.5); tube(c, '#ffd166', 1.3);
    const FR = [[-9, 4, -6, -1], [-8, -2, -3, -5], [1, -6, 2, -6], [8, -2, 4, -5], [9, 4, 6, -1]];
    c.beginPath();
    for (let i = 0; i < FR.length; i++) { const f = FR[i]; c.moveTo(16.5, 10.5); c.quadraticCurveTo(16.5 + f[2], 10.5 + f[3], 16.5 + f[0], 10.5 + f[1]); }
    tube(c, '#7dff9a', 1.1);
  } else if (k === 'bat') {           // a cute bat across a green full moon (no skulls, no occult signs)
    c.beginPath(); c.arc(24, 20, 13.5, 0, TAU); tube(c, '#b6ff7a', 1.3);
    batPath(c, 24, 21.5, 31, 0.6); tube(c, '#b98bff', 1.2);
    twinkle(c, 6, 6.5, 1.8, '#ffe08a'); twinkle(c, 42, 33, 1.6, '#ffe08a');
  } else if (k === 'diamond') {       // a cut gem: the girdle, the table, its facets, two twinkles
    poly(c, [15, 10, 33, 10, 40.5, 17.4, 24, 34, 7.5, 17.4]); tube(c, '#ffc94a', 1.5);
    c.beginPath(); c.moveTo(7.5, 17.4); c.lineTo(40.5, 17.4);
    c.moveTo(15, 10); c.lineTo(19.4, 17.4); c.lineTo(24, 10); c.lineTo(28.6, 17.4); c.lineTo(33, 10);
    c.moveTo(19.4, 17.4); c.lineTo(24, 34); c.lineTo(28.6, 17.4); tube(c, '#fff0c0', 0.75);
    twinkle(c, 41.5, 6.5, 2.4, '#ffffff'); twinkle(c, 7, 31, 1.8, '#fff0c0');
  } else if (k === 'crest') {         // a gilt cartouche: plum velvet in a beaded gold oval, a crown over two laurel sprigs
    const G = '#ffc94a', GI = '#5a3606';
    stk(c, cc => draw.ellipse(cc, 24, 20, 15.5, 18.5), G, GI, 1.8, 0.5, 0.25);
    c.fillStyle = draw.radial(c, 24, 17, 1, 15, [[0, '#9a3485'], [1, '#4a1440']]); draw.ellipse(c, 24, 20, 11.6, 14.6); c.fill();
    c.lineWidth = 1; c.strokeStyle = GI; c.stroke();
    c.fillStyle = '#fff0b0';
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24; c.beginPath(); c.arc(24 + Math.cos(a) * 13.6, 20 + Math.sin(a) * 16.6, 0.65, 0, TAU); c.fill(); }
    stk(c, cc => poly(cc, [15.5, 21.5, 32.5, 21.5, 34, 11.5, 28.6, 16, 24, 9, 19.4, 16, 14, 11.5]), G, GI, 1.2, 0.5, 0.2);
    stk(c, cc => draw.roundRect(cc, 15.5, 19.4, 17, 3.6, 1), '#e8b84a', GI, 1, 0.4, 0.15);
    const tp = [14, 11.5, 24, 9, 34, 11.5];
    for (let i = 0; i < 6; i += 2) stk(c, cc => draw.circle(cc, tp[i], tp[i + 1] - 0.8, 1.3), '#fffaf2', '#7d7598', 0.7, 0.6, 0.1);
    stk(c, cc => draw.circle(cc, 24, 21.2, 1.2), '#ff3d6e', GI, 0.6, 0.6, 0.1);
    for (let s = 0; s < 2; s++) {
      const dir = s ? -1 : 1;
      for (let i = 0; i < 4; i++) leaf(c, 24 - dir * (3 + i * 2.6), 31.5 - i * 1.6, 4.2, 1.6, dir * (0.9 + i * 0.25), '#e8b84a', GI, 0.6);
    }
  } else if (k === 'dallah') {        // a brass dallah + two finjan cups on a shelf trimmed with Sadu (coffee by the fire)
    const B = '#e0a83a', BI = '#4a2c06';
    stk(c, cc => draw.roundRect(cc, 4.5, 30, 39, 4.6, 1.5), '#7a4a24', '#2a1208', 1.4, 0.35, 0.25);
    saduStrip(c, 5.6, 31.1, 36.8, 2.6);
    for (let s = 0; s < 2; s++) { const x = s ? 37 : 11; stk(c, cc => poly(cc, [x - 2, 34.6, x + 2, 34.6, x, 39]), '#5a3418', '#2a1208', 1, 0.3, 0.2); }
    c.beginPath(); c.moveTo(15.2, 24.6); c.quadraticCurveTo(9.6, 22.6, 7.8, 13.6);       // the long beaked spout
    c.lineWidth = 3.4; c.strokeStyle = BI; c.stroke(); c.lineWidth = 1.9; c.strokeStyle = B; c.stroke();
    stk(c, cc => poly(cc, [5.6, 11.4, 9.8, 12.4, 8, 15]), B, BI, 1, 0.5, 0.15);
    c.beginPath(); c.moveTo(22.4, 17.6); c.bezierCurveTo(28.2, 16.4, 28.6, 25.4, 24.2, 27);  // the handle
    c.lineWidth = 2.8; c.strokeStyle = BI; c.stroke(); c.lineWidth = 1.3; c.strokeStyle = B; c.stroke();
    stk(c, cc => { cc.beginPath(); cc.moveTo(13.6, 29.6); cc.quadraticCurveTo(11.4, 22.4, 16.2, 19.6); cc.lineTo(17.2, 16.6); cc.lineTo(20.8, 16.6);
      cc.lineTo(21.8, 19.6); cc.quadraticCurveTo(26.6, 22.4, 24.4, 29.6); cc.closePath(); }, B, BI, 1.3, 0.55, 0.25, [11.4, 16.6, 15.2, 13]);
    stk(c, cc => draw.ellipse(cc, 19, 29.6, 6.2, 1.4), '#c8902c', BI, 1, 0.4, 0.15);
    stk(c, cc => draw.roundRect(cc, 15.9, 15.4, 6.2, 1.9, 0.8), B, BI, 0.9, 0.5, 0.1);
    stk(c, cc => poly(cc, [15.6, 15.6, 22.4, 15.6, 20.3, 11.6, 17.7, 11.6]), B, BI, 1, 0.5, 0.2);
    stk(c, cc => draw.circle(cc, 19, 10.3, 1.5), '#ffd27a', BI, 0.8, 0.6, 0.1);
    c.strokeStyle = BI; c.lineWidth = 0.9; c.beginPath(); c.moveTo(19, 8.8); c.lineTo(19, 7); c.stroke();
    c.strokeStyle = 'rgba(255,244,210,0.8)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(14.6, 26.4); c.quadraticCurveTo(14, 23, 16, 21.4); c.stroke();
    for (let s = 0; s < 2; s++) {
      const x = s ? 37.5 : 31.4;
      stk(c, cc => poly(cc, [x - 2.7, 25.8, x + 2.7, 25.8, x + 1.8, 30, x - 1.8, 30]), '#f5ecda', BI, 0.9, 0.45, 0.15);
      c.fillStyle = '#e0a030'; c.fillRect(x - 2.4, 26.5, 4.8, 1);
    }
    c.strokeStyle = 'rgba(255,240,220,0.42)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(31.4, 24.4); c.quadraticCurveTo(30.2, 22, 31.6, 20); c.quadraticCurveTo(33, 18, 31.8, 16); c.stroke();
  } else {                            // the house: a heart + a note, glowing tubes
    for (let pass = 0; pass < 2; pass++) {
      c.shadowBlur = pass ? 0 : 6 * res; c.shadowColor = '#ff4fa3';
      draw.heart(c, 24, 21, 30);
      c.lineWidth = pass ? 1.1 : 2.6; c.strokeStyle = pass ? '#ffd6ec' : '#ff4fa3'; c.stroke();
      c.shadowColor = '#53e0ff';
      c.beginPath(); c.moveTo(22, 27); c.lineTo(22, 13); c.lineTo(29, 11); c.lineTo(29, 24);
      c.lineWidth = pass ? 1 : 2.2; c.strokeStyle = pass ? '#dffaff' : '#53e0ff'; c.stroke();
      c.beginPath(); c.ellipse(20, 27, 2.6, 2, -0.4, 0, TAU); c.stroke();
      c.beginPath(); c.ellipse(27, 24, 2.6, 2, -0.4, 0, TAU); c.stroke();
    }
    c.shadowBlur = 0;
  }
}
// ---- the owner's portrait on the party-room wall (30 x 42, the nail at (15, 2); world.js tilts it about the nail): the
// house hangs the grumpy green top-hat monster with a monocle in a brass frame; a theme re-frames the owner and dresses him
// in its band headwear (actor.js paintOutfitHead), smiling: Neon a neon-tube frame on a synthwave ground + the LED visor
// cap, Royal an oval gilt frame + the crown, Desert a carved frame over the dunes + the Sadu beanie, Space a porthole + the
// bubble helmet, Beach a life ring at sunset + the straw hat, Spooky a crooked frame with a cobweb + the pumpkin cap;
// VIP hangs a framed gold record instead
function portraitOwner(c, x, y, r, hat, hs, hy) {
  stk(c, cc => draw.ellipse(cc, x, y, r, r), '#9be15d', '#2e5a14', 1.1, 0.35, 0.2);
  const e = r / 7.5;
  c.fillStyle = '#ffffff'; draw.circle(c, x - 2.5 * e, y - 2.3 * e, 2 * e); c.fill(); draw.circle(c, x + 2.5 * e, y - 2.3 * e, 2.1 * e); c.fill();
  c.fillStyle = '#14101e'; draw.circle(c, x - 2.2 * e, y - 2 * e, 1.05 * e); c.fill(); draw.circle(c, x + 2.8 * e, y - 2 * e, 1.1 * e); c.fill();
  c.fillStyle = '#3a1a10'; c.beginPath(); c.moveTo(x - 3.6 * e, y + 1.6 * e); c.quadraticCurveTo(x, y + 6.4 * e, x + 3.6 * e, y + 1.6 * e); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,140,160,0.45)'; draw.ellipse(c, x - 5 * e, y + 1.4 * e, 1.5 * e, 0.9 * e); c.fill(); draw.ellipse(c, x + 5 * e, y + 1.4 * e, 1.5 * e, 0.9 * e); c.fill();
  if (hat) { c.save(); c.translate(x, hy === undefined ? y - r + 0.8 : hy); c.scale(hs, hs); paintOutfitHead(c, hat); c.restore(); }
}
function picCords(c, ax, ay) {
  c.strokeStyle = 'rgba(30,10,20,0.9)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(15, 2); c.lineTo(ax, ay); c.moveTo(15, 2); c.lineTo(30 - ax, ay); c.stroke();
}
export function paintRoomPicture(c, TH) {
  const k = TH.id;
  if (k === 'neon') {
    picCords(c, 6, 10);
    stk(c, cc => draw.roundRect(cc, 2, 9, 26, 31, 2), '#120a1e', '#000000', 1.6, 0.25, 0.25);
    c.save(); draw.roundRect(c, 5.5, 12.5, 19, 24, 1); c.clip();
    c.fillStyle = draw.gradient(c, 0, 12.5, 0, 36.5, [[0, '#1c0a30'], [0.55, '#6a1a6a'], [1, '#ff4f9a']]); c.fillRect(5, 12, 20, 25);
    c.strokeStyle = 'rgba(61,240,255,0.55)'; c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(5, 33 + i * 1.6); c.lineTo(25, 33 + i * 1.6); c.stroke(); }
    portraitOwner(c, 15, 30, 6.3, 'neon', 0.4);
    c.restore();
    draw.roundRect(c, 3.4, 10.4, 23.2, 28.2, 1.6); tube(c, '#ff4fa3', 0.8);
  } else if (k === 'royal') {
    picCords(c, 8, 12);
    stk(c, cc => draw.ellipse(cc, 15, 25, 12.6, 15.4), '#e8b84a', '#5a3606', 1.8, 0.5, 0.25);
    c.fillStyle = '#fff0b0';
    for (let i = 0; i < 20; i++) { const a = i * TAU / 20; c.beginPath(); c.arc(15 + Math.cos(a) * 10.9, 25 + Math.sin(a) * 13.7, 0.55, 0, TAU); c.fill(); }
    c.save(); draw.ellipse(c, 15, 25, 9.2, 12); c.clip();
    c.fillStyle = draw.radial(c, 15, 22, 1, 14, [[0, '#8a1a32'], [1, '#3a0614']]); c.fillRect(5, 12, 20, 26);
    portraitOwner(c, 15, 30.5, 6, 'royal', 0.27);
    c.restore();
    draw.ellipse(c, 15, 25, 9.2, 12); c.lineWidth = 1; c.strokeStyle = '#5a3606'; c.stroke();
    stk(c, cc => draw.circle(cc, 15, 9.8, 2), '#ffc94a', '#5a3606', 0.9, 0.6, 0.1);
  } else if (k === 'desert') {
    picCords(c, 6, 10);
    stk(c, cc => draw.roundRect(cc, 2, 9, 26, 31, 1.5), '#7a4a24', '#2a1208', 1.8, 0.4, 0.25);
    c.strokeStyle = 'rgba(255,214,160,0.35)'; c.lineWidth = 0.6;
    for (let x = 4; x < 26; x += 3) { c.beginPath(); c.moveTo(x, 10.4); c.lineTo(x + 1.5, 11.6); c.lineTo(x + 3, 10.4); c.stroke(); }
    c.save(); draw.roundRect(c, 5.5, 12.5, 19, 21.6, 1); c.clip();
    c.fillStyle = draw.gradient(c, 0, 12.5, 0, 34, [[0, '#0a0f2a'], [0.7, '#2c2448'], [1, '#5a3a44']]); c.fillRect(5, 12, 20, 23);
    c.fillStyle = '#fff4dc';
    const r = rng(31);
    for (let i = 0; i < 9; i++) { c.globalAlpha = 0.5 + r.next() * 0.5; c.fillRect(6 + r.next() * 18, 13 + r.next() * 8, 0.7, 0.7); }
    c.globalAlpha = 1;
    c.fillStyle = '#4a2e22'; c.beginPath(); c.moveTo(5, 31); c.quadraticCurveTo(11, 27, 16, 30); c.quadraticCurveTo(21, 26.5, 25, 29); c.lineTo(25, 35); c.lineTo(5, 35); c.closePath(); c.fill();
    portraitOwner(c, 15, 29.6, 6.2, 'desert', 0.33);
    c.restore();
    saduStrip(c, 4, 35.2, 22, 3.4);
  } else if (k === 'space') {
    picCords(c, 9, 14);
    stk(c, cc => draw.circle(cc, 15, 25, 13.2), '#b9c4d8', '#2a3142', 1.8, 0.55, 0.25);
    c.fillStyle = '#2a3142';
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.39; c.beginPath(); c.arc(15 + Math.cos(a) * 11.4, 25 + Math.sin(a) * 11.4, 0.8, 0, TAU); c.fill(); }
    c.save(); draw.circle(c, 15, 25, 9.6); c.clip();
    c.fillStyle = draw.radial(c, 12, 20, 1, 13, [[0, '#1a2050'], [1, '#03040e']]); c.fillRect(5, 15, 20, 20);
    c.fillStyle = '#ffffff';
    const r = rng(44);
    for (let i = 0; i < 12; i++) { c.globalAlpha = 0.4 + r.next() * 0.6; c.fillRect(6 + r.next() * 18, 16 + r.next() * 18, 0.7, 0.7); }
    c.globalAlpha = 1;
    portraitOwner(c, 15, 26.4, 5.4, 'space', 0.37, 26.4 + 16 * 0.37);
    c.restore();
    draw.circle(c, 15, 25, 9.6); c.lineWidth = 1.2; c.strokeStyle = '#2a3142'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.arc(15, 25, 8, Math.PI * 1.1, Math.PI * 1.4); c.stroke();
  } else if (k === 'beach') {
    picCords(c, 9, 14);
    stk(c, cc => draw.circle(cc, 15, 25, 13.2), '#fff6e6', '#7a1a36', 1.6, 0.45, 0.25);
    c.fillStyle = '#ff5d6e';
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; c.beginPath(); c.arc(15, 25, 12.4, a, a + 0.62); c.arc(15, 25, 8.9, a + 0.62, a, true); c.closePath(); c.fill(); }
    c.strokeStyle = '#c8a46a'; c.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 1.22; c.beginPath(); c.moveTo(15 + Math.cos(a) * 8.4, 25 + Math.sin(a) * 8.4); c.lineTo(15 + Math.cos(a) * 13, 25 + Math.sin(a) * 13); c.stroke(); }
    c.save(); draw.circle(c, 15, 25, 8.6); c.clip();
    c.fillStyle = draw.gradient(c, 0, 16, 0, 29, [[0, '#ff9f6b'], [1, '#ff6f91']]); c.fillRect(6, 16, 18, 13);
    c.fillStyle = '#ffd166'; c.beginPath(); c.arc(15, 29, 5, Math.PI, TAU); c.fill();
    c.fillStyle = '#1f4a74'; c.fillRect(6, 29, 18, 6);
    c.fillStyle = 'rgba(255,240,210,0.55)'; c.fillRect(11, 30.4, 8, 0.6); c.fillRect(12.5, 32, 5, 0.6);
    portraitOwner(c, 15, 28.4, 5.2, 'beach', 0.3);
    c.restore();
    draw.circle(c, 15, 25, 8.6); c.lineWidth = 1.1; c.strokeStyle = '#7a1a36'; c.stroke();
  } else if (k === 'spooky') {
    picCords(c, 6.5, 9.4);
    c.save(); c.translate(15, 25); c.rotate(-0.08); c.translate(-15, -25);
    stk(c, cc => draw.roundRect(cc, 2, 9, 26, 31, 1.5), '#2a2036', '#06040a', 1.8, 0.3, 0.25);
    c.fillStyle = '#8a8070';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(i & 1 ? 26.3 : 3.7, i & 2 ? 38.3 : 10.7, 1.1, 0, TAU); c.fill(); }
    c.save(); draw.roundRect(c, 5.5, 12.5, 19, 24, 1); c.clip();
    c.fillStyle = draw.gradient(c, 0, 12.5, 0, 36.5, [[0, '#4a2a62'], [1, '#1c1028']]); c.fillRect(5, 12, 20, 25);
    portraitOwner(c, 15, 30.2, 6.2, 'spooky', 0.35);
    cobweb(c, 5.5, 12.5, 9, 0, Math.PI / 2, '#e9e2f5', 0.6);
    c.restore();
    c.restore();
  } else if (k === 'vip') {
    picCords(c, 6, 10);
    stk(c, cc => draw.roundRect(cc, 2, 9, 26, 31, 1.5), '#141016', '#000000', 1.8, 0.3, 0.25);
    c.fillStyle = '#221c26'; c.fillRect(5, 12, 20, 25);
    c.strokeStyle = '#ffc94a'; c.lineWidth = 0.9; c.strokeRect(4.2, 11.2, 21.6, 26.6);
    c.fillStyle = draw.radial(c, 13, 20, 1, 10, [[0, '#fff3c0'], [0.45, '#ffc94a'], [1, '#a8781e']]); draw.circle(c, 15, 22.5, 8); c.fill();
    c.lineWidth = 1; c.strokeStyle = '#5a3a06'; c.stroke();
    c.strokeStyle = 'rgba(110,70,8,0.45)'; c.lineWidth = 0.45;
    for (let i = 0; i < 4; i++) { draw.circle(c, 15, 22.5, 3.6 + i * 1.1); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.arc(15, 22.5, 6.4, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    stk(c, cc => draw.circle(cc, 15, 22.5, 2.4), '#141016', '#000000', 0.6, 0.3, 0.1);
    c.fillStyle = '#ffc94a'; draw.circle(c, 15, 22.5, 0.6); c.fill();
    stk(c, cc => draw.roundRect(cc, 9.5, 32.2, 11, 3.2, 0.8), '#ffc94a', '#5a3a06', 0.8, 0.5, 0.15);
  } else {                            // the house: the grumpy owner in a top hat, a monocle on a chain
    picCords(c, 6, 10);
    stk(c, cc => draw.roundRect(cc, 2, 9, 26, 31, 2), '#d9a441', '#3f2707', 1.8, 0.45, 0.25);
    c.fillStyle = '#1b4a58'; draw.roundRect(c, 6, 13, 18, 23, 1.5); c.fill();
    c.fillStyle = draw.radial(c, 15, 22, 1, 14, [[0, 'rgba(120,200,210,0.5)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(6, 13, 18, 23);
    stk(c, cc => draw.ellipse(cc, 15, 29, 7.5, 7.5), '#9be15d', '#2e5a14', 1.2, 0.35, 0.2);
    c.fillStyle = '#ffffff'; draw.circle(c, 12.5, 26.5, 2); c.fill(); draw.circle(c, 17.5, 26.5, 2.3); c.fill();
    c.fillStyle = '#14101e'; draw.circle(c, 12.9, 26.8, 1); c.fill(); draw.circle(c, 17.9, 26.8, 1.1); c.fill();
    c.strokeStyle = '#d9a441'; c.lineWidth = 0.8; draw.circle(c, 17.5, 26.5, 3); c.stroke();
    c.beginPath(); c.moveTo(20.4, 27.4); c.quadraticCurveTo(22, 31, 20, 34); c.stroke();
    c.strokeStyle = '#3a1a10'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(11, 31.5); c.quadraticCurveTo(15, 29.6, 19, 31.5); c.stroke();
    stk(c, cc => poly(cc, [11, 22, 19, 22, 17.5, 15.5, 12.5, 15.5]), '#14101e', '#000', 0.8, 0.3, 0.1);
  }
}
// ---- the room's banner (world.js paintBanner: BANNER w x h, top edge at `top`, centred on cx, room units) in the theme's
// cloth: Neon a dark board ringed by a pink tube, Royal plum velvet with a gold fringe, Desert a Sadu-woven band with
// tassels, Space a riveted chrome panel with an LED screen, Beach a driftwood plank on rope knots, Spooky a tattered
// purple banner, VIP black lacquer with a double gold rule. -> [text colour, outline] for the act's name, or null for the
// house (world.js keeps its velvet swallowtail)
const BAN_TXT = { neon: ['#bff8ff', '#06303a'], royal: ['#ffd77a', '#2a0724'], sadu: ['#f5ecda', '#2a0608'], panel: ['#8af4ff', '#04121c'],
  plank: ['#fffaf0', '#0b5a56'], tatter: ['#ffb04d', '#140a1c'], lacquer: ['#ffd77a', '#000000'] };
export function paintBannerTheme(c, TH, cx, top, bw, bh) {
  const k = TH.room.ban, x0 = cx - bw / 2, x1 = cx + bw / 2, y1 = top + bh, W = bw + 12, X = x0 - 6;
  if (!BAN_TXT[k]) return null;
  if (k === 'neon') {
    stk(c, cc => draw.roundRect(cc, X, top, W, bh, 3), '#120a1e', '#05040a', 1.8, 0.2, 0.25);
    draw.roundRect(c, X + 2.4, top + 2.2, W - 4.8, bh - 4.4, 2); tube(c, '#ff4fa3', 0.8);
  } else if (k === 'royal') {
    const sw = cc => poly(cc, [x0 - 7, top, x1 + 7, top, x1, top + bh / 2, x1 + 7, y1, x0 - 7, y1, x0, top + bh / 2]);
    c.fillStyle = '#ffc94a';
    for (let x = x0 + 1; x < x1 - 1; x += 3.4) { c.beginPath(); c.moveTo(x - 1.3, y1 - 0.5); c.lineTo(x + 1.3, y1 - 0.5); c.lineTo(x, y1 + 2.6); c.closePath(); c.fill(); }
    stk(c, sw, '#6b1d5e', '#2a0724', 2, 0.3, 0.25, [x0 - 7, top, bw + 14, bh]);
    c.strokeStyle = '#ffc94a'; c.lineWidth = 0.9; c.strokeRect(x0 + 2, top + 2.2, bw - 4, bh - 4.4);
  } else if (k === 'sadu') {
    for (let s = 0; s < 2; s++) {
      const tx = s ? X + W - 2.5 : X + 2.5;
      c.strokeStyle = '#2a1208'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tx, y1); c.lineTo(tx, y1 + 3); c.stroke();
      stk(c, cc => poly(cc, [tx - 1.6, y1 + 2.6, tx + 1.6, y1 + 2.6, tx + 2, y1 + 6.2, tx - 2, y1 + 6.2]), '#e0a030', '#4a2c06', 0.7, 0.4, 0.1);
    }
    stk(c, cc => draw.roundRect(cc, X, top, W, bh, 1.2), '#231616', '#1a0406', 1.8, 0.2, 0.25);
    saduStrip(c, X + 1, top + 1, W - 2, 3.4); saduStrip(c, X + 1, y1 - 4.4, W - 2, 3.4);
  } else if (k === 'panel') {
    stk(c, cc => draw.roundRect(cc, X, top, W, bh, 2.5), '#5c6680', '#141a28', 1.8, 0.45, 0.25);
    c.fillStyle = '#06101c'; draw.roundRect(c, X + 4, top + 2.2, W - 8, bh - 4.4, 1.4); c.fill();
    c.strokeStyle = 'rgba(61,240,255,0.5)'; c.lineWidth = 0.6; c.stroke();
    c.fillStyle = '#cdd6e6';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(i & 1 ? X + W - 2 : X + 2, i & 2 ? y1 - 2.4 : top + 2.4, 0.8, 0, TAU); c.fill(); }
  } else if (k === 'plank') {
    stk(c, cc => draw.roundRect(cc, X, top, W, bh, bh * 0.42), '#c8a46a', '#4a3410', 1.8, 0.4, 0.25);
    c.strokeStyle = 'rgba(90,60,20,0.32)'; c.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) { const y = top + 3.4 + i * 4; c.beginPath(); c.moveTo(X + 6, y); c.quadraticCurveTo(cx, y + (i - 1) * 1.6, X + W - 6, y); c.stroke(); }
    for (let s = 0; s < 2; s++) stk(c, cc => draw.circle(cc, s ? X + W - 3.6 : X + 3.6, top + bh / 2, 2), '#efe0bc', '#6a5020', 0.8, 0.5, 0.15);
  } else if (k === 'tatter') {
    const rag = cc => {
      cc.beginPath(); cc.moveTo(X, top); cc.lineTo(X + W, top); cc.lineTo(X + W, y1 - 1);
      for (let x = X + W, i = 0; x > X; x -= 6, i++) { cc.lineTo(x - 3, y1 + ((i % 3) ? 1.6 : 3.4)); cc.lineTo(x - 6, y1 - ((i & 1) ? 1.2 : 0)); }
      cc.closePath();
    };
    stk(c, rag, '#3a2450', '#0d0716', 1.8, 0.25, 0.25, [X, top, W, bh + 3]);
    c.strokeStyle = 'rgba(13,7,22,0.55)'; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(X + W * 0.72, y1 + 1); c.lineTo(X + W * 0.7, y1 - 4); c.moveTo(X + W * 0.18, y1 + 1); c.lineTo(X + W * 0.2, y1 - 3); c.stroke();
    cobweb(c, X + W, top, 7, Math.PI * 0.5, Math.PI * 0.5, '#e9e2f5', 0.55);
  } else {
    stk(c, cc => draw.roundRect(cc, X, top, W, bh, 2), '#0e0c10', '#000000', 1.8, 0.2, 0.25);
    c.strokeStyle = '#ffc94a'; c.lineWidth = 0.9; c.strokeRect(X + 2.2, top + 1.8, W - 4.4, bh - 3.6);
    c.lineWidth = 0.4; c.strokeRect(X + 3.6, top + 3, W - 7.2, bh - 6);
  }
  return BAN_TXT[k];
}
// ---- the DJ's hat in a party theme (world.js paintDJ's units: the 52 x 48 furry DJ, its head's top at (26, ~11), the
// horns' tips at y 1), baked over DJ_HAT_BOX and drawn after the live eye + mouth, so it nods and slumps with the DJ. The
// themes with a band outfit lend its headwear (Neon the LED visor cap, Royal the crown, Desert the Sadu beanie, Beach the
// straw hat, Spooky the pumpkin cap); a bubble helmet would not close round the horns, so Space wears alien antennae on a
// chrome band, and VIP a black fedora with a gold band. The house DJ wears none (-> false). Everything stays above y -7,
// under the raised banner's hem (world.js keeps the banner's bottom at least ~7 over the DJ sprite's top)
export const DJ_HAT_BOX = [0, -12, 52, 28];
const DJ_HAT = { neon: [0.58, 12.2, -0.12], royal: [0.46, 12.6, 0.08], desert: [0.5, 12.4, -0.08], beach: [0.56, 11.8, 0.1], spooky: [0.5, 12.6, 0.1] };
export function paintDJHat(c, TH) {
  const k = TH.id, h = DJ_HAT[k];
  if (h) { c.save(); c.translate(26, h[1]); c.rotate(h[2]); c.scale(h[0], h[0]); paintOutfitHead(c, k); c.restore(); return true; }
  if (k === 'space') {                // alien antennae on a chrome headband
    for (let s = 0; s < 2; s++) {
      const bx = s ? 30 : 22, tx = s ? 35.5 : 16.5, ty = -2.4, col = s ? '#ff3fb4' : '#3df0ff';
      c.beginPath(); c.moveTo(bx, 10); c.quadraticCurveTo(bx + (s ? 1.5 : -1.5), 3, tx, ty + 2.4);
      c.lineWidth = 2.6; c.strokeStyle = '#2a3142'; c.stroke(); c.lineWidth = 1.2; c.strokeStyle = '#d6deec'; c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, tx, ty, 0.5, 6, col, 0.55); c.restore();
      stk(c, cc => draw.circle(cc, tx, ty, 2.6), col, '#2a3142', 1, 0.6, 0.1);
    }
    stk(c, cc => draw.roundRect(cc, 18.5, 8.2, 15, 3.6, 1.6), '#b9c4d8', '#2a3142', 1.1, 0.55, 0.15);
    c.fillStyle = '#3df0ff'; c.fillRect(24.6, 9.4, 2.8, 1.2);
    return true;
  }
  if (k === 'vip') {                  // a black fedora with a gold band, tipped
    c.save(); c.translate(26, 11.4); c.rotate(-0.1);
    stk(c, cc => draw.ellipse(cc, 0, 0, 15.5, 3.6), '#1c1820', '#000000', 1.6, 0.3, 0.2);
    stk(c, cc => { cc.beginPath(); cc.moveTo(-9, -0.6); cc.lineTo(-8.2, -9); cc.quadraticCurveTo(-4, -12.6, 0, -10.4); cc.quadraticCurveTo(4, -12.6, 8.2, -9);
      cc.lineTo(9, -0.6); cc.quadraticCurveTo(0, 1.4, -9, -0.6); cc.closePath(); }, '#221d26', '#000000', 1.6, 0.35, 0.2, [-9, -12, 18, 13]);
    c.beginPath(); c.moveTo(-8.8, -4); c.quadraticCurveTo(0, -2.2, 8.8, -4); c.lineTo(8.7, -1.4); c.quadraticCurveTo(0, 0.4, -8.7, -1.4); c.closePath();
    c.fillStyle = '#ffc94a'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = '#5a3a06'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-5, -9.6); c.quadraticCurveTo(-6, -6, -5.6, -4.6); c.stroke();
    c.restore();
    return true;
  }
  return false;
}
// ---- the band's kick drum + keyboard in an outfit's colours (world.js calls these with actor.outfitKit(theme))
export function kitTrim(c, kind, theme, K) {
  // kind 'kick' (dancer units about the kick's centre (0, cy), radius R) | 'keys' (the slab box)
  if (kind === 'kick') {
    const R = K.R, cy = K.cy;
    if (theme === 'neon') { c.beginPath(); c.arc(0, cy, R - 2.8, 0, TAU); tube(c, '#3df0ff', 1); }
    else if (theme === 'rock') {
      c.save(); c.beginPath(); c.arc(0, cy, R, 0, TAU); c.clip();
      for (let i = 0; i < 5; i++) {
        const x = -R + i * R * 0.5;
        c.beginPath(); c.moveTo(x - 4, cy + R); c.quadraticCurveTo(x - 6, cy + R * 0.5, x, cy + R * 0.2 - (i & 1) * 5); c.quadraticCurveTo(x + 2, cy + R * 0.6, x + 6, cy + R);
        c.fillStyle = '#ff8a1a'; c.fill(); c.strokeStyle = '#4a0608'; c.lineWidth = 0.8; c.stroke();
      }
      c.restore();
    } else if (theme === 'space') { c.fillStyle = '#3df0ff'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.arc(Math.cos(a) * (R - 2.8), cy + Math.sin(a) * (R - 2.8), 0.9, 0, TAU); c.fill(); } }
    else if (theme === 'spooky') { cobweb(c, -R * 0.6, cy - R * 0.6, R * 0.8, 0, Math.PI * 0.5, '#f1ecff', 0.6); }
    else if (theme === 'beach') { draw.star(c, R * 0.45, cy + R * 0.42, 4, 0.45, 5); c.fillStyle = '#ff6f91'; c.fill(); c.lineWidth = 0.6; c.strokeStyle = '#7a1a36'; c.stroke(); }
    else if (theme === 'desert') { saduStrip(c, -R * 0.82, cy + R * 0.42, R * 1.64, 4); }
    else if (theme === 'royal') { c.beginPath(); c.arc(0, cy, R - 3.2, 0, TAU); c.lineWidth = 0.9; c.strokeStyle = '#ffc94a'; c.stroke(); }
  }
}

// ------------------------------------------------------------------------------------------------ rope skins
// stanchion palettes: post / base fill, ink, ball, ball highlight, ring (+ a motif)
const POSTS = {
  velvet: { post: '#d9a441', ink: '#3f2707', ring: '#c08a34', ball: '#d9a441', hi: 'rgba(255,250,222,0.9)' },
  silver: { post: '#c9d0dc', ink: '#2a3040', ring: '#8f98aa', ball: '#e6ebf3', hi: 'rgba(255,255,255,0.95)' },
  candy: { post: '#8ae8c8', ink: '#13503c', ring: '#ffffff', ball: '#ff5c7a', hi: 'rgba(255,255,255,0.95)' },
  neon: { post: '#1d1828', ink: '#05040a', ring: '#2c2539', ball: '#2c2539', hi: 'rgba(255,140,220,0.9)' },
  royal: { post: '#ffc94a', ink: '#5a3606', ring: '#6b1d5e', ball: '#ffd36a', hi: 'rgba(255,250,222,0.95)' },
  crystal: { post: 'rgba(200,230,255,0.55)', ink: '#3a5a8a', ring: '#dff4ff', ball: 'rgba(220,240,255,0.7)', hi: 'rgba(255,255,255,1)' },
  vip: { post: '#ffc94a', ink: '#3a2404', ring: '#141016', ball: '#ffd36a', hi: 'rgba(255,250,222,0.95)' },
};
// the stanchion sprite (w x h, foot at `foot`, hook at `hook`), in the rope skin's metal (world.js bakes it per skin)
export function paintStanchionSkin(c, skin, w, foot, hook) {
  const S = POSTS[skin] || POSTS.velvet, cx = w / 2;
  stk(c, cc => draw.ellipse(cc, cx, foot - 2.5, 11, 4.2), S.post, S.ink, 2.2, 0.35, 0.28);
  stk(c, cc => draw.roundRect(cc, cx - 2.6, 12, 5.2, foot - 14, 2.4), S.post, S.ink, 2, 0.45, 0.2);
  if (skin === 'candy') {             // red stripes spiralling up the mint post
    c.save(); draw.roundRect(c, cx - 2.6, 12, 5.2, foot - 14, 2.4); c.clip(); c.fillStyle = '#ff5c7a';
    for (let y = 8; y < foot; y += 6) { poly(c, [cx - 4, y, cx + 4, y - 4, cx + 4, y - 1.6, cx - 4, y + 2.4]); c.fill(); }
    c.restore();
  } else if (skin === 'crystal') {    // a glass post: a bright refraction line + sparkle facets
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(cx - 1, 14); c.lineTo(cx - 1, foot - 4); c.stroke();
  } else if (skin === 'neon') {       // a pink tube running up the black post
    c.beginPath(); c.moveTo(cx, 14); c.lineTo(cx, foot - 6); tube(c, '#ff4fa3', 0.9);
  } else if (skin === 'vip') {        // black bands on the gold post
    c.fillStyle = '#141016'; c.fillRect(cx - 2.6, 22, 5.2, 2.4); c.fillRect(cx - 2.6, foot - 20, 5.2, 2.4);
  }
  stk(c, cc => draw.roundRect(cc, cx - 4.6, foot - 11, 9.2, 4.6, 2), S.ring, S.ink, 1.8, 0.3, 0.2);
  stk(c, cc => draw.roundRect(cc, cx - 4.4, hook - 2.5, 8.8, 4.4, 2), S.ring, S.ink, 1.8, 0.3, 0.2);
  if (skin === 'crystal') {           // a faceted glass ball
    stk(c, cc => draw.circle(cc, cx, 9.5, 5.6), S.ball, S.ink, 1.6, 0.6, 0.2);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(cx - 5, 9.5); c.lineTo(cx, 4.2); c.lineTo(cx + 5, 9.5); c.lineTo(cx, 15); c.closePath(); c.moveTo(cx - 5, 9.5); c.lineTo(cx + 5, 9.5); c.stroke();
  } else stk(c, cc => draw.circle(cc, cx, 9.5, 5.6), S.ball, S.ink, 2, 0.55, 0.22);
  c.fillStyle = S.hi; draw.circle(c, cx - 1.8, 7.6, 1.5); c.fill();
  if (skin === 'royal') { c.strokeStyle = '#6b1d5e'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, 9.5, 5.6, 0.2, Math.PI - 0.2); c.stroke(); }
}
// the rope between two hooks (per frame, no allocation): a quadratic (x1, y1) -> (x2, y2) through the sag point (mx, my)
// at scale s; beat = the party beat (the neon tube pulses on it, never wobbles more than the velvet does); clip = the end
// clips' metal
const ROPE = {
  velvet: { ink: '#1c020a', col: '#8f1830', hi: 'rgba(255,120,150,0.55)', clip: '#d9a441', clipInk: '#3f2707' },
  silver: { ink: '#1a1e28', col: '#aeb6c6', hi: 'rgba(255,255,255,0.9)', clip: '#e6ebf3', clipInk: '#2a3040' },
  candy: { ink: '#3a0410', col: '#fff4f4', hi: 'rgba(255,255,255,0.9)', clip: '#8ae8c8', clipInk: '#13503c' },
  neon: { ink: '#14020e', col: '#ff4fa3', hi: 'rgba(255,230,245,0.95)', clip: '#2c2539', clipInk: '#05040a' },
  royal: { ink: '#1a0418', col: '#6b1d5e', hi: 'rgba(255,170,230,0.45)', clip: '#ffc94a', clipInk: '#5a3606' },
  crystal: { ink: '#1a3050', col: '#dff4ff', hi: 'rgba(255,255,255,1)', clip: '#dff4ff', clipInk: '#3a5a8a' },
  vip: { ink: '#000000', col: '#141016', hi: 'rgba(255,214,120,0.55)', clip: '#ffc94a', clipInk: '#3a2404' },
};
function qpt(x1, y1, cx, cy, x2, y2, u, o) { const v = 1 - u; o[0] = v * v * x1 + 2 * v * u * cx + u * u * x2; o[1] = v * v * y1 + 2 * v * u * cy + u * u * y2; return o; }
const QP = [0, 0], QP2 = [0, 0];
export function strokeRope(ctx, skin, x1, y1, x2, y2, sag, s, beat) {
  const R = ROPE[skin] || ROPE.velvet, mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5 + sag * 2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (skin === 'silver') {            // chain links: alternating flat ovals and edge-on bars along the curve
    const n = Math.max(8, Math.round(Math.abs(x2 - x1) / (6 * s)));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      qpt(x1, y1, mx, my, x2, y2, u0, QP); qpt(x1, y1, mx, my, x2, y2, u1, QP2);
      const cx = (QP[0] + QP2[0]) * 0.5, cy = (QP[1] + QP2[1]) * 0.5, a = Math.atan2(QP2[1] - QP[1], QP2[0] - QP[0]), L2 = Math.hypot(QP2[0] - QP[0], QP2[1] - QP[1]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      if (i & 1) { ctx.beginPath(); ctx.moveTo(-L2 * 0.62, 0); ctx.lineTo(L2 * 0.62, 0); ctx.lineWidth = 3.2 * s; ctx.strokeStyle = R.ink; ctx.stroke(); ctx.lineWidth = 1.6 * s; ctx.strokeStyle = R.col; ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.ellipse(0, 0, L2 * 0.62, 2.4 * s, 0, 0, TAU); ctx.lineWidth = 2.6 * s; ctx.strokeStyle = R.ink; ctx.stroke(); ctx.lineWidth = 1.3 * s; ctx.strokeStyle = R.col; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -0.5 * s, L2 * 0.5, 1.4 * s, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.lineWidth = 0.7 * s; ctx.strokeStyle = R.hi; ctx.stroke();
      }
      ctx.restore();
    }
  } else if (skin === 'crystal') {    // a string of faceted beads that catch the light
    const n = Math.max(10, Math.round(Math.abs(x2 - x1) / (5 * s)));
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.lineWidth = 0.8 * s; ctx.strokeStyle = 'rgba(220,240,255,0.7)'; ctx.stroke();
    for (let i = 0; i <= n; i++) {
      qpt(x1, y1, mx, my, x2, y2, i / n, QP);
      const r = (i & 1 ? 2.1 : 2.7) * s;
      ctx.beginPath(); ctx.moveTo(QP[0], QP[1] - r); ctx.lineTo(QP[0] + r, QP[1]); ctx.lineTo(QP[0], QP[1] + r); ctx.lineTo(QP[0] - r, QP[1]); ctx.closePath();
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#cfefff' : '#e8dcff'; ctx.fill(); ctx.lineWidth = 0.8 * s; ctx.strokeStyle = R.ink; ctx.stroke();
      if (i % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(QP[0] - 0.6 * s, QP[1] - r * 0.7, 1.2 * s, 1.2 * s); }
    }
  } else {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2);
    if (skin === 'neon') {            // a glowing tube that pulses on the beat
      const ph = beat - Math.floor(beat), k = 1 - ph;
      const g0 = ctx.globalAlpha;
      ctx.globalAlpha = g0 * (0.16 + 0.22 * k * k); ctx.strokeStyle = '#ff4fa3'; ctx.lineWidth = 14 * s; ctx.stroke(); ctx.globalAlpha = g0;
      ctx.strokeStyle = R.ink; ctx.lineWidth = 6.4 * s; ctx.stroke();
      ctx.strokeStyle = R.col; ctx.lineWidth = 4 * s; ctx.stroke();
      ctx.strokeStyle = R.hi; ctx.lineWidth = 1.4 * s; ctx.stroke();
    } else {
      ctx.strokeStyle = R.ink; ctx.lineWidth = 7.8 * s; ctx.stroke();
      ctx.strokeStyle = R.col; ctx.lineWidth = 4.8 * s; ctx.stroke();
      if (skin === 'candy' || skin === 'royal' || skin === 'vip') {   // the twist: dashes along the rope
        ctx.setLineDash(skin === 'candy' ? CANDY_DASH : BRAID_DASH);
        ctx.strokeStyle = skin === 'candy' ? '#e8203c' : skin === 'royal' ? '#9a3485' : '#ffc94a'; ctx.lineWidth = (skin === 'vip' ? 1.6 : 4.8) * s; ctx.stroke();
        ctx.setLineDash(NO_DASH);
      }
      ctx.beginPath(); ctx.moveTo(x1, y1 - 1.3 * s); ctx.quadraticCurveTo(mx, my - 1.3 * s, x2, y2 - 1.3 * s);
      ctx.strokeStyle = R.hi; ctx.lineWidth = 1.2 * s; ctx.stroke();
    }
  }
  ctx.fillStyle = R.clip; ctx.lineWidth = 1.2; ctx.strokeStyle = R.clipInk;
  draw.circle(ctx, x1, y1, 2.6 * s); ctx.fill(); ctx.stroke(); draw.circle(ctx, x2, y2, 2.6 * s); ctx.fill(); ctx.stroke();
  if (skin === 'royal') {             // gold tassels hanging from the clips
    for (let e = 0; e < 2; e++) {
      const x = e ? x2 : x1, y = e ? y2 : y1;
      ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.moveTo(x - 1.6 * s, y + 2 * s); ctx.lineTo(x + 1.6 * s, y + 2 * s); ctx.lineTo(x + 2.4 * s, y + 8 * s); ctx.lineTo(x - 2.4 * s, y + 8 * s); ctx.closePath();
      ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = '#5a3606'; ctx.stroke();
    }
  }
}
const CANDY_DASH = [3.4, 3.4], BRAID_DASH = [2.4, 2.2], NO_DASH = [];

// ------------------------------------------------------------------------------------------------ door skins
// frame = jambs + lintel + threshold strip colours, edge = the leaf's edge seen while it swings
export const DOOR = {
  brass: { frame: '#d9a441', ink: '#3f2707', dot: 'rgba(80,46,6,0.6)', edge: '#6a430c', fan: ['#ffe2a2', '#ffaa48', '#c2562e'], spoke: 'rgba(70,40,6,0.85)' },
  oak: { frame: '#6a4426', ink: '#1e1208', dot: 'rgba(20,14,10,0.8)', edge: '#3a2410', fan: ['#ffe2a2', '#ffaa48', '#a2462e'], spoke: 'rgba(30,20,10,0.9)' },
  najdi: { frame: '#9a6a36', ink: '#2a1606', dot: 'rgba(245,232,210,0.7)', edge: '#5a3a1a', fan: ['#ffe2a2', '#ffaa48', '#b04a2e'], spoke: 'rgba(42,22,6,0.9)' },
  neon: { frame: '#16121e', ink: '#030205', dot: 'rgba(61,240,255,0.6)', edge: '#05040a', fan: ['#ffd6f2', '#ff6ad5', '#6a1a6a'], spoke: 'rgba(5,4,10,0.95)' },
  royal: { frame: '#f2ece0', ink: '#5a3606', dot: 'rgba(214,160,40,0.85)', edge: '#c9b89a', fan: ['#fff6dc', '#ffd27a', '#c8963c'], spoke: 'rgba(150,100,20,0.9)' },
  crystal: { frame: '#c9d0dc', ink: '#2a3a5a', dot: 'rgba(255,255,255,0.8)', edge: '#8a98b4', fan: ['#f4fbff', '#bfe4ff', '#6a9ad0'], spoke: 'rgba(60,80,120,0.85)' },
};
export function doorSkin(id) { return DOOR[doorKey(id)]; }
// the door leaf (w x h design units, outline inset so slices never clip it) for every skin but brass (world.js's own)
export function paintDoorLeaf(c, skin, w, h) {
  if (skin === 'oak') {               // vertical oak planks, two iron straps with nail heads, an iron ring pull + a barred peephole
    stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#7a4e2c', '#1e1208', 3, 0.22, 0.24);
    c.save(); draw.roundRect(c, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]); c.clip();
    const r = rng(43);
    for (let x = 1.6, i = 0; x < w; x += w / 5, i++) {
      c.fillStyle = i & 1 ? 'rgba(255,220,180,0.05)' : 'rgba(0,0,0,0.08)'; c.fillRect(x, 0, w / 5, h);
      c.fillStyle = 'rgba(20,10,4,0.6)'; c.fillRect(x, 0, 1.2, h);
      c.strokeStyle = 'rgba(40,20,8,0.35)'; c.lineWidth = 0.7;
      for (let g = 0; g < 3; g++) { const gx = x + 3 + r.next() * (w / 5 - 6); c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 2, h * 0.3, gx - 2, h * 0.6, gx + 1, h); c.stroke(); }
      const ky = h * (0.2 + r.next() * 0.6); c.beginPath(); c.ellipse(x + w / 10, ky, 2, 3.4, 0, 0, TAU); c.stroke();
    }
    c.restore();
    for (let s = 0; s < 2; s++) {
      const y = s ? h * 0.78 : h * 0.2;
      stk(c, cc => draw.roundRect(cc, 3, y - 4, w - 6, 8, 1.5), '#3a3a44', '#0e0e14', 1.6, 0.3, 0.2);
      c.fillStyle = '#7a7a88'; for (let x = 8; x < w - 4; x += 10) { draw.circle(c, x, y, 1.2); c.fill(); }
    }
    const px = w / 2, py = h * 0.36;
    stk(c, cc => draw.roundRect(cc, px - 9, py - 7, 18, 14, 3), '#1a0e06', '#0e0e14', 1.8, 0.1, 0.2);
    c.fillStyle = draw.radial(c, px, py, 1, 10, [[0, '#ffe3a8'], [1, '#d0652e']]); draw.roundRect(c, px - 7, py - 5, 14, 10, 2); c.fill();
    c.strokeStyle = '#2a2a34'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px - 2.5, py - 5); c.lineTo(px - 2.5, py + 5); c.moveTo(px + 2.5, py - 5); c.lineTo(px + 2.5, py + 5); c.stroke();
    c.lineWidth = 2.4; c.strokeStyle = '#1a1a22'; draw.circle(c, 10.5, h * 0.5 + 4, 4.6); c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = '#8a8a98'; c.beginPath(); c.arc(10.5, h * 0.5 + 4, 4.6, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    stk(c, cc => draw.circle(cc, 10.5, h * 0.5 - 1, 2.2), '#4a4a56', '#0e0e14', 1, 0.4, 0.1);
  } else if (skin === 'najdi') {      // a painted Najdi wooden door: geometric triangle bands in ochre, teal and white, studs
    stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#2e7a74', '#2a1606', 3, 0.2, 0.24);
    c.save(); draw.roundRect(c, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]); c.clip();
    const band = (y, bh, col, tri, triCol) => {
      c.fillStyle = col; c.fillRect(0, y, w, bh);
      c.fillStyle = triCol; const s = bh * 0.9;
      for (let x = -s * 0.5; x < w + s; x += s) { poly(c, tri ? [x, y + bh, x + s / 2, y, x + s, y + bh] : [x, y, x + s / 2, y + bh, x + s, y]); c.fill(); }
      c.fillStyle = 'rgba(42,22,6,0.55)'; c.fillRect(0, y, w, 0.9); c.fillRect(0, y + bh - 0.9, w, 0.9);
    };
    const rows = [[0.06, '#e0a030', 1, '#f5ecda'], [0.17, '#b3203a', 0, '#e0a030'], [0.28, '#f5ecda', 1, '#2e7a74'], [0.62, '#f5ecda', 0, '#2e7a74'], [0.73, '#b3203a', 1, '#e0a030'], [0.84, '#e0a030', 0, '#f5ecda']];
    for (let i = 0; i < rows.length; i++) band(h * rows[i][0], h * 0.1, rows[i][1], rows[i][2], rows[i][3]);
    c.fillStyle = 'rgba(255,240,210,0.08)'; c.fillRect(0, 0, w * 0.4, h);
    c.restore();
    c.strokeStyle = '#f5ecda'; c.lineWidth = 1.4;
    const cy = h * 0.5, cx = w / 2;
    c.beginPath(); c.moveTo(cx, cy - 13); c.lineTo(cx + 11, cy); c.lineTo(cx, cy + 13); c.lineTo(cx - 11, cy); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(cx, cy - 7); c.lineTo(cx + 6, cy); c.lineTo(cx, cy + 7); c.lineTo(cx - 6, cy); c.closePath(); c.fillStyle = '#e0a030'; c.fill(); c.stroke();
    c.fillStyle = '#d9a441'; for (let y = 10; y < h - 6; y += 16) { draw.circle(c, 5, y, 1.4); c.fill(); draw.circle(c, w - 5, y, 1.4); c.fill(); }
    stk(c, cc => draw.roundRect(cc, 6, h * 0.5 - 3, 14, 6, 2), '#8a5a2a', '#2a1606', 1.4, 0.35, 0.2);
  } else if (skin === 'neon') {       // a black leaf with a neon outline frame and a pink porthole
    stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#141018', '#030205', 3, 0.16, 0.24);
    draw.roundRect(c, 7, 7, w - 14, h - 13, 4); tube(c, '#3df0ff', 1.3);
    draw.roundRect(c, 12, h * 0.56, w - 24, h * 0.32, 3); tube(c, '#ff4fa3', 0.9);
    const px = w / 2, py = h * 0.3, pr = Math.min(w * 0.22, 15);
    c.fillStyle = draw.radial(c, px, py, 1, pr, [[0, '#ffd6f2'], [0.55, '#ff6ad5'], [1, '#6a1a6a']]); draw.circle(c, px, py, pr); c.fill();
    c.beginPath(); c.arc(px, py, pr + 1.2, 0, TAU); tube(c, '#ff4fa3', 1);
    stk(c, cc => draw.roundRect(cc, 5, h * 0.5 - 7, 6, 14, 2.5), '#2c2539', '#030205', 1.4, 0.3, 0.2);
  } else if (skin === 'royal') {      // white lacquer with gilded mouldings, a gold lion-free knob, a gold kick plate
    stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#f4efe4', '#5a3606', 3, 0.3, 0.2);
    const pw = w - 18;
    const panel = (y, ph) => {
      draw.roundRect(c, 9, y, pw, ph, 3); c.lineWidth = 3; c.strokeStyle = '#7a4a08'; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = '#ffc94a'; c.stroke();
      draw.roundRect(c, 12.5, y + 3.5, pw - 7, ph - 7, 2); c.lineWidth = 0.8; c.strokeStyle = 'rgba(214,160,40,0.8)'; c.stroke();
      c.fillStyle = '#ffc94a'; for (let s = 0; s < 4; s++) { const x = s & 1 ? 9 + pw : 9, yy = s & 2 ? y + ph : y; draw.circle(c, x, yy, 1.7); c.fill(); }
    };
    panel(11, h * 0.4); panel(h * 0.52 + 3, h * 0.33);
    const cx = w / 2, cy = 11 + h * 0.2;
    c.strokeStyle = '#ffc94a'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, 5, 0, TAU); c.moveTo(cx - 9, cy); c.quadraticCurveTo(cx - 6, cy - 6, cx - 2, cy - 5); c.moveTo(cx + 9, cy); c.quadraticCurveTo(cx + 6, cy - 6, cx + 2, cy - 5); c.stroke();
    stk(c, cc => draw.circle(cc, 10, h * 0.5 + 2, 3.2), '#ffd36a', '#5a3606', 1.2, 0.6, 0.15);
    stk(c, cc => draw.roundRect(cc, 4, h - 14, w - 8, 11, 2), '#ffc94a', '#5a3606', 1.6, 0.45, 0.2);
  } else if (skin === 'crystal') {    // frosted glass panels in a silver frame with a facet sheen
    stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#b9c2d2', '#2a3a5a', 3, 0.4, 0.2);
    const pane = (x, y, pw, ph) => {
      c.save(); draw.roundRect(c, x, y, pw, ph, 3); c.clip();
      c.fillStyle = draw.gradient(c, x, y, x + pw, y + ph, [[0, '#f4fbff'], [0.5, '#cfe6ff'], [1, '#a9c8ef']]); c.fillRect(x, y, pw, ph);
      c.fillStyle = 'rgba(255,214,150,0.25)'; c.fillRect(x, y + ph * 0.55, pw, ph * 0.45);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x, y + ph * 0.3); c.lineTo(x + pw * 0.5, y); c.moveTo(x + pw * 0.2, y + ph); c.lineTo(x + pw, y + ph * 0.25); c.moveTo(x, y + ph * 0.75); c.lineTo(x + pw * 0.6, y + ph * 0.45); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)'; poly(c, [x + pw * 0.1, y, x + pw * 0.35, y, x, y + ph * 0.5, x, y + ph * 0.2]); c.fill();
      c.restore();
      draw.roundRect(c, x, y, pw, ph, 3); c.lineWidth = 1.6; c.strokeStyle = '#2a3a5a'; c.stroke();
    };
    pane(8, 9, w - 16, h * 0.44); pane(8, h * 0.52 + 2, w - 16, h * 0.4);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const x = 14 + i * (w - 28) / 3, y = 16 + (i & 1) * h * 0.5; draw.star(c, x, y, 2.6, 0.3, 4); c.fill(); }
    stk(c, cc => draw.roundRect(cc, 5, h * 0.5 - 8, 5, 16, 2.4), '#e6ebf3', '#2a3a5a', 1.2, 0.6, 0.2);
  }
}
// the door's frame (jambs + lintel + rivet dots) in its skin, for every skin but brass; x, y, w, h = the door opening
export function paintDoorFrame(c, skin, x, y, w, h) {
  const D = DOOR[skin] || DOOR.brass;
  stk(c, cc => draw.roundRect(cc, x - 10, y - 4, 8, h + 4, 2), D.frame, D.ink, 2.4, 0.4, 0.2);
  stk(c, cc => draw.roundRect(cc, x + w + 2, y - 4, 8, h + 4, 2), D.frame, D.ink, 2.4, 0.4, 0.2);
  stk(c, cc => draw.roundRect(cc, x - 13, y - 12, w + 26, 10, 3), D.frame, D.ink, 2.6, 0.4, 0.22);
  if (skin === 'najdi') {             // a carved triangle frieze on the lintel + the jambs
    c.fillStyle = D.dot;
    for (let i = 0; i < 9; i++) { const xx = x - 9 + i * (w + 18) / 8; poly(c, [xx - 2.6, y - 4.5, xx + 2.6, y - 4.5, xx, y - 9.5]); c.fill(); }
    for (let yy = y + 6; yy < y + h - 4; yy += 9) { poly(c, [x - 8, yy + 2, x - 4, yy + 2, x - 6, yy - 2]); c.fill(); poly(c, [x + w + 4, yy + 2, x + w + 8, yy + 2, x + w + 6, yy - 2]); c.fill(); }
  } else if (skin === 'neon') {       // a neon outline round the whole frame
    c.beginPath(); c.moveTo(x - 12, y + h); c.lineTo(x - 12, y - 13); c.lineTo(x + w + 12, y - 13); c.lineTo(x + w + 12, y + h); tube(c, '#ff4fa3', 1.4);
  } else if (skin === 'royal') {      // gilded edges on the white frame
    c.strokeStyle = '#ffc94a'; c.lineWidth = 1.1;
    c.strokeRect(x - 8.5, y - 2, 5, h); c.strokeRect(x + w + 3.5, y - 2, 5, h); c.strokeRect(x - 11, y - 10, w + 22, 6);
  } else if (skin === 'crystal') {    // sparkles on the silver frame
    c.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { draw.star(c, x - 6 + (i & 1) * (w + 12), y + 12 + i * h * 0.18, 2.2, 0.3, 4); c.fill(); }
  } else {
    c.fillStyle = D.dot;
    for (let i = 0; i < 6; i++) { draw.circle(c, x - 8 + i * (w + 16) / 5, y - 7, 1.1); c.fill(); }
  }
}

// ------------------------------------------------------------------------------------------------ shop thumbnails
// drawItemThumb(ctx, itemId, x, y, size): the item as a sticker illustration centred on (x, y) in a size x size box,
// baked once per item + size + resolution (an LRU of TUNE.thumbCap). Ids: every COSMETIC_IDS entry, 'set.<outfit theme>'
// (a set of the theme's looks), 'mb_bundle_<neon|desert|royal>', 'mb_starter_pack', 'mb_vip_rope'. Unknown ids draw nothing
// and return false.
const TUNE = { thumbCap: 160 };
const THUMB = new Map();
const HOUSE_BAND = {
  blob: { species: 'blob', color: 'mint', eyes: 2, hat: 'party', tail: false, pattern: 'none' },
  tall: { species: 'tall', color: 'coral', eyes: 2, hat: 'top', tail: false, pattern: 'none' },
  round: { species: 'round', color: 'sky', eyes: 2, hat: 'none', tail: false, pattern: 'dots' },
  square: { species: 'square', color: 'mustard', eyes: 2, hat: 'crown', tail: false, pattern: 'none' },
  bean: { species: 'bean', color: 'grape', eyes: 2, hat: 'none', tail: true, pattern: 'stripes' },
};
const OUT_SPECS = {};
function outSpec(theme, sp) {
  const k = theme + '.' + sp;
  let s = OUT_SPECS[k];
  if (!s) { s = {}; const b = HOUSE_BAND[sp]; for (const q in b) s[q] = b[q]; s.outfit = theme; OUT_SPECS[k] = s; }
  return s;
}
// the accent of an outfit theme (thumb backdrops)
export const OUTFIT_ACCENT = { neon: ['#3df0ff', '#1d1838'], royal: ['#ffc94a', '#4a1440'], desert: ['#e0a030', '#3a2418'], beach: ['#2ec4b6', '#123a5a'],
  space: ['#9fdcff', '#141a3a'], spooky: ['#ff8c1a', '#2a1a3e'], rock: ['#e8322f', '#1c1820'] };
function backdrop(c, S, inner, outer) {
  c.fillStyle = draw.radial(c, S / 2, S * 0.46, 0, S * 0.5, [[0, color.alpha(inner, 0.5)], [0.55, color.alpha(inner, 0.18)], [1, color.alpha(inner, 0)]]);
  c.fillRect(0, 0, S, S);
  if (outer) { c.fillStyle = color.alpha(outer, 0.0); }
}
export function drawItemThumb(ctx, itemId, x, y, size) {
  if (!(size > 0) || typeof itemId !== 'string') return false;
  const res = draw.res(), key = itemId + '@' + Math.round(size);
  let e = THUMB.get(key);
  if (!e || e.res !== res) {
    const fn = thumbPainter(itemId);
    if (!fn) return false;
    const cv = draw.bake(size, size, c => fn(c, size));
    e = { cv: cv, res: res };
    THUMB.delete(key); THUMB.set(key, e);
    if (THUMB.size > TUNE.thumbCap) THUMB.delete(THUMB.keys().next().value);
  } else { THUMB.delete(key); THUMB.set(key, e); }
  ctx.drawImage(e.cv, x - size / 2, y - size / 2, size, size);
  return true;
}
export function clearThumbs() { THUMB.clear(); }
function thumbPainter(id) {
  const dot = id.indexOf('.'), slot = dot > 0 ? id.slice(0, dot) : id;
  if (slot === 'club') { const t = THEMES[id.slice(5)]; return t ? (c, S) => paintClubThumb(c, S, t) : null; }
  if (slot === 'outfit') {
    const th = outfitTheme(id), sp = id.slice(id.lastIndexOf('.') + 1);
    if (!th || !HOUSE_BAND[sp]) return null;
    return (c, S) => { backdrop(c, S, OUTFIT_ACCENT[th][0]); drawMini(c, outSpec(th, sp), S / 2, S / 2 + S * 0.02, S * 0.96); };
  }
  if (slot === 'set') {
    const th = outfitTheme('outfit.' + id.slice(4) + '.blob');
    return th ? (c, S) => paintSetThumb(c, S, th) : null;
  }
  if (slot === 'rope') { const k = id.slice(5); return ROPE[k] ? (c, S) => paintRopeThumb(c, S, k) : null; }
  if (slot === 'door') { const k = id.slice(5); return DOOR[k] ? (c, S) => paintDoorThumb(c, S, k) : null; }
  if (slot === 'plate') {
    const k = id.slice(6);
    return PLATE_SKINS.indexOf(k) >= 0 ? (c, S) => { backdrop(c, S, '#ffd27a'); drawPlate(c, 'in', S / 2, S * 0.47, S * 0.8, S * 0.58, 0, 0, '', false, k); } : null;
  }
  if (id === 'mb_bundle_neon' || id === 'mb_bundle_desert' || id === 'mb_bundle_royal') {
    const th = id.slice(10);
    return (c, S) => { paintClubThumb(c, S, THEMES[th]); drawMini(c, outSpec(th, 'blob'), S * 0.27, S * 0.74, S * 0.46); drawMini(c, outSpec(th, 'bean'), S * 0.73, S * 0.72, S * 0.48); };
  }
  if (id === 'mb_starter_pack') return (c, S) => paintSetThumb(c, S, 'rock');
  if (id === 'mb_vip_rope') return (c, S) => { paintClubThumb(c, S, THEMES.vip); c.save(); c.translate(0, S * 0.18); paintRopeThumb(c, S, 'vip', true); c.restore(); };
  return null;
}
// a set: three of the theme's band looks grouped on the theme's backdrop
function paintSetThumb(c, S, th) {
  backdrop(c, S, OUTFIT_ACCENT[th][0]);
  drawMini(c, outSpec(th, 'tall'), S * 0.3, S * 0.42, S * 0.62);
  drawMini(c, outSpec(th, 'square'), S * 0.7, S * 0.44, S * 0.6);
  drawMini(c, outSpec(th, 'blob'), S * 0.5, S * 0.66, S * 0.62);
}
function paintRopeThumb(c, S, k, bare) {
  if (!bare) backdrop(c, S, k === 'neon' ? '#ff4fa3' : k === 'crystal' ? '#bfe9ff' : k === 'silver' ? '#dfe6f3' : '#ffd27a');
  const ST = { w: 26, h: 64, foot: 60, hook: 21 }, sc = S / 110, f = S * 0.8, hk = (ST.foot - ST.hook) * sc;
  const post = draw.bake(ST.w, ST.h, cc => paintStanchionSkin(cc, k, ST.w, ST.foot, ST.hook));
  for (let i = 0; i < 2; i++) {
    const px = i ? S * 0.8 : S * 0.2;
    draw.shadowBlob(c, px, f + 1, 12 * sc, 3.6 * sc, 0.45);
    c.drawImage(post, px - ST.w * sc / 2, f - ST.foot * sc, ST.w * sc, ST.h * sc);
  }
  strokeRope(c, k, S * 0.2 + 3 * sc, f - hk, S * 0.8 - 3 * sc, f - hk, 12 * sc, sc, 0.2);
}
function paintDoorThumb(c, S, k) {
  backdrop(c, S, '#ffb347');
  const w = S * 0.42, h = S * 0.66, x = (S - w) / 2, y = S * 0.2;
  c.fillStyle = '#0a0820'; c.fillRect(x - 5, y - 5, w + 10, h + 5);
  c.fillStyle = draw.radial(c, S / 2, y + h * 0.5, 2, h * 0.8, [[0, '#ffe3a8'], [0.4, '#ffb347'], [1, '#4a1426']]); c.fillRect(x, y, w, h);
  const sk = w / 80;
  c.save(); c.translate(x, y); c.scale(sk, sk);
  paintDoorFrame(c, k, 0, 0, 80, h / sk);
  if (k === 'brass') paintBrassLeaf(c, 80, h / sk); else paintDoorLeaf(c, k, 80, h / sk);
  c.restore();
  stk(c, cc => draw.roundRect(cc, x - 8, y + h - 2, w + 16, 6, 2), '#3a3684', '#0b0a22', 1.6, 0.3, 0.25);
}
// the house brass leaf, for the thumbnail (world.js paints the live one)
function paintBrassLeaf(c, w, h) {
  stk(c, cc => draw.roundRect(cc, 1.6, 1.6, w - 3.2, h - 1.6, [5, 5, 0, 0]), '#d9a441', '#3f2707', 3, 0.3, 0.24);
  const pw = w - 18, ph1 = h * 0.44, ph2 = h * 0.36;
  stk(c, cc => draw.roundRect(cc, 9, 11, pw, ph1, 4), '#c8923a', '#6a430c', 2, 0.12, 0.3);
  stk(c, cc => draw.roundRect(cc, 9, h * 0.52 + 3, pw, ph2, 4), '#c8923a', '#6a430c', 2, 0.12, 0.3);
  const pr = Math.min(w * 0.24, ph1 * 0.34), px = w / 2, py = 11 + ph1 * 0.5;
  c.fillStyle = draw.radial(c, px, py, 1, pr, [[0, '#ffe7b0'], [0.55, '#ffb347'], [1, '#d0652e']]); draw.circle(c, px, py, pr); c.fill();
  c.lineWidth = 4.2; c.strokeStyle = '#8a5a14'; c.stroke();
}
// a party theme as a full-bleed crop of its party room (the shop's Party tiles; the backdrop of the theme bundles and the
// VIP Rope): what the player buys, from the same THEMES[id].room recipe world.js paints the party window from, in room
// units on a 120 x 120 crop: the wall gradient + the theme's motif (damask, the synthwave sun + tubes, gold damask under
// the drapes, the tent's Sadu bands, the starfield + planet, bamboo + a starfish, cobwebs + bats, gold leaf + VIP), the
// chandelier's light, the wainscot + rail, the theme's deco (drapes, tent poles, string lights, searchlights) and its
// chandelier with lit candles, its wall sign on the right wall (the heart, the mixtape, the crest, the dallah, the UFO, the
// sunset palm, the bat over the moon, the gem), a stage in the theme's wood / skirt / trim with footlights, the dance floor
// in perspective with a few beat-lit tiles, and the theme's front props in both corners (the house's potted palms)
const TROOM = { RW: 120, RH: 120, archR: 30, lobby: false, room: { fb: 74 } };
const TCHAND = [7, 9.4, 19, 5.4, 47, 5.4, 59, 9.4];   // the chandelier sprite's four light points
const TLIT = [[1, 2, 0], [2, 6, 1], [3, 3, 2], [0, 4, 3], [2, 8, 4], [3, 7, 0]];   // beat-lit floor cells [row, col, colour]
function paintClubThumb(c, S, TH) {
  const k = S / 100, R = TH.room, L = TROOM, RW = L.RW, RH = L.RH, wt = 50, st = 64, sf = 69, sb = 77, u = S / RW;
  c.save();
  draw.roundRect(c, 2 * k, 2 * k, 96 * k, 96 * k, 18 * k); c.clip();
  c.scale(u, u);
  // the wall: its gradient + motif, the chandelier's light, the wainscot + rail
  c.fillStyle = draw.gradient(c, 0, 0, 0, st, [[0, R.wall[0]], [0.5, R.wall[1]], [1, R.wall[2]]]); c.fillRect(0, 0, RW, st + 1);
  L.room.fb = st + 6;
  paintRoomMotif(c, L, TH, wt);
  c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, RW / 2, 24, 4, RW * 0.6, R.light, 0.32); c.restore();
  c.fillStyle = draw.gradient(c, 0, wt, 0, st, [[0, R.wains[0]], [1, R.wains[1]]]); c.fillRect(0, wt, RW, st - wt + 1);
  c.strokeStyle = 'rgba(255,190,120,0.13)'; c.lineWidth = 1;
  for (let x = 4; x < RW; x += 30) { draw.roundRect(c, x, wt + 3, 24, st - wt - 5, 2); c.stroke(); }
  c.fillStyle = R.rail; c.fillRect(0, wt - 2, RW, 2.4); c.fillStyle = 'rgba(255,236,190,0.5)'; c.fillRect(0, wt - 2, RW, 0.7);
  // the theme's deco + its chandelier, candles lit
  paintRoomDeco(c, L, TH);
  const cs = 0.9, cx0 = RW / 2 - 33 * cs, cy0 = -2;
  c.save(); c.translate(cx0, cy0); c.scale(cs, cs); paintChandelierTheme(c, TH); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i += 2) glowFill(c, cx0 + TCHAND[i] * cs, cy0 + TCHAND[i + 1] * cs - 3, 0.5, 9, R.light, 0.5);
  c.restore();
  // the theme's wall sign on the right wall, where the room hangs it (a tube sign on its dark board)
  const ss = 0.6, sx = 97, sy = 30;
  c.save(); c.globalCompositeOperation = 'lighter'; glowFill(c, sx, sy, 2, 22, R.signCol, 0.32); c.restore();
  c.save(); c.translate(sx - 24 * ss, sy - 20 * ss); c.scale(ss, ss);
  if (signTube(TH)) { c.fillStyle = 'rgba(18,6,24,0.92)'; draw.roundRect(c, 0, 1, 48, 38, 5); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#0b0a22'; c.stroke(); }
  paintRoomSign(c, TH, draw.res() * u * ss);
  c.restore();
  // the stage: the top in the theme's wood, the skirt + its trim, footlights
  c.fillStyle = draw.gradient(c, 0, st, 0, sf, [[0, R.stage[0]], [1, R.stage[1]]]); c.fillRect(0, st, RW, sf - st);
  c.fillStyle = 'rgba(30,10,4,0.35)'; c.fillRect(0, st + 2.2, RW, 0.6);
  c.fillStyle = draw.gradient(c, 0, sf, 0, sb, [[0, R.skirt[0]], [1, R.skirt[1]]]); c.fillRect(0, sf, RW, sb - sf);
  c.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 2; x < RW; x += 7) c.fillRect(x, sf, 2.2, sb - sf);
  c.fillStyle = R.skirtTrim; c.fillRect(0, sf - 0.6, RW, 1.8);
  c.fillStyle = '#0b0a22'; c.fillRect(0, sb, RW, 1.2);
  for (let x = 12; x < RW; x += 24) {
    draw.glow(c, x, sf + 2, 9, R.foot, 0.5);
    c.fillStyle = color.mix(R.foot, '#ffffff', 0.6); draw.circle(c, x, sf + 4, 1.5); c.fill();
  }
  // the dance floor in perspective (rows deepen toward the viewer, columns converge on the stage), a few lit tiles
  const fy = sb + 1.2, vy = 24, cx = RW / 2, ROWS = [0, 0.16, 0.37, 0.64, 1];
  c.fillStyle = draw.gradient(c, 0, fy, 0, RH, [[0, R.floor[0]], [1, R.floor[1]]]); c.fillRect(0, fy, RW, RH - fy);
  const ry = i => fy + (RH + 6 - fy) * ROWS[i], rx = (j, y) => cx + (j - 5) * 17 * (y - vy) / (RH - vy);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) {
    const y0 = ry(i), y1 = ry(i + 1);
    c.beginPath(); c.moveTo(rx(j, y0), y0); c.lineTo(rx(j + 1, y0), y0); c.lineTo(rx(j + 1, y1), y1); c.lineTo(rx(j, y1), y1); c.closePath();
    c.fillStyle = (i + j) & 1 ? R.tile[0] : R.tile[1]; c.fill();
    c.lineWidth = 0.7; c.strokeStyle = R.grout; c.stroke();
  }
  for (let n = 0; n < TLIT.length; n++) {
    const q = TLIT[n], y0 = ry(q[0]), y1 = ry(q[0] + 1), ym = (y0 + y1) / 2;
    draw.glow(c, (rx(q[1], ym) + rx(q[1] + 1, ym)) / 2, ym, (rx(q[1] + 1, ym) - rx(q[1], ym)) * 0.75, R.tiles[q[2] % R.tiles.length], 0.55);
  }
  // the theme's front props in both corners, standing clear of the tile's rounded corners
  L.RH = RH - 7; paintRoomFrontTheme(c, L, TH); L.RH = RH;
  // a soft vignette keeps the middle of the room the brightest
  c.fillStyle = draw.gradient(c, 0, 0, RW, 0, [[0, 'rgba(6,4,22,0.32)'], [0.16, 'rgba(6,4,22,0)'], [0.84, 'rgba(6,4,22,0)'], [1, 'rgba(6,4,22,0.32)']]);
  c.fillRect(0, 0, RW, RH);
  c.restore();
  draw.roundRect(c, 2 * k, 2 * k, 96 * k, 96 * k, 18 * k); c.lineWidth = 2.4 * k; c.strokeStyle = TH.ink; c.stroke();
  draw.roundRect(c, 4.5 * k, 4.5 * k, 91 * k, 91 * k, 16 * k); c.lineWidth = 1 * k; c.strokeStyle = 'rgba(255,255,255,0.12)'; c.stroke();
}
