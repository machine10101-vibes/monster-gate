import { fbm } from '../engine/voxel.js';

/** One tile is the whole current land (144 by 144). The world is a 10 by 10 grid. */
export const GRID = 10;
export const TILE_COUNT = GRID * GRID;
export const TILE_SIZE = 144;
/** World-space blend at biome borders. Interiors stay crisp. */
export const MAP_BORDER_PX = 24;
export const MAP_WARP_PX = 16;

const BIOMES = {
  P: { id: 'peaks', name: 'Peaks', color: '#c5d4e2', blurb: 'High stone and snow.' },
  F: { id: 'forest', name: 'Forest', color: '#2f7a45', blurb: 'Old trees and thick shade.' },
  G: { id: 'gate', name: 'Gate wilds', color: '#6d4f86', blurb: 'The forest grows wrong this far north.' },
  M: { id: 'meadow', name: 'Meadow', color: '#d2b15a', blurb: 'Open grass and wildflowers.' },
  R: { id: 'river', name: 'River', color: '#3a8ec4', blurb: 'Silverrun and its banks.' },
  L: { id: 'lake', name: 'Lake', color: '#4aa4d8', blurb: 'Still water off Mirrormere.' },
  W: { id: 'waste', name: 'Waste', color: '#c48a52', blurb: 'Dry hills and ash.' },
  O: { id: 'town', name: 'Town', color: '#e6c36a', blurb: 'Lived in.' },
  A: { id: 'farm', name: 'Farmland', color: '#d2a04a', blurb: 'Fences, fields and barns.' },
  H: { id: 'marsh', name: 'Marsh', color: '#6f8a48', blurb: 'Reeds and slow water.' },
  C: { id: 'coast', name: 'Coast', color: '#e4d2a0', blurb: 'Sand, rock and the tide.' },
  S: { id: 'sea', name: 'Sea', color: '#1d4e86', blurb: 'Open water.' },
  I: { id: 'arctic', name: 'Arctic', color: '#d6ebf8', blurb: 'Snowfields, glass-blue ice and long white winds.' },
  V: { id: 'volcanic', name: 'Volcanic wasteland', color: '#5a2c28', blurb: 'Black stone, drifting ash and rivers of fire.' },
  D: { id: 'ruins', name: 'Ruins', color: '#8d6e9c', blurb: 'Something old broke here.' },
  Q: { id: 'oasis', name: 'Desert oasis', color: '#e6c56a', blurb: 'Dry dunes around a living pool.' },
  J: { id: 'jungle', name: 'Northern Jungle', color: '#3f8f3c', blurb: 'Light jungle, open glades and tribe villages.' },
};

const CODES = [
  'PPPPPPPPPP',
  'PFVVFFFPPP',
  'PFVVJJFFWP',
  'PRFVJJIIIS',
  'RRMMMFIIIS',
  'MRLMOMAHMS',
  'CRMMRMAHDD',
  'SCCQQRFFDS',
  'SSCQQHFFSS',
  'SSSCSCSSSS',
];

/** Tiles that share an edge or a corner with Oakhollow and are built in the world. */
const RING = {
  '3,4': ['harefield', 'Northwest of Oakhollow. Harefield is open meadow, knolls and wildflowers, meeting Brookside and Northleas.'],
  '4,4': ['northleas', 'North of Oakhollow. A pass through the peaks opens into Northleas, with pasture, knolls and a pond.'],
  '5,4': ['goldmead', 'Northeast of Oakhollow. Goldmead is a bright wood of oaks and pines around a sunny clearing.'],
  '3,5': ['brookside', 'West of Oakhollow. A ford crosses the river and a brook runs out through the mountains.'],
  '5,5': ['eastleas', 'East of Oakhollow. The road past the farm opens into meadows and wildflowers.'],
  '6,4': ['snowfall', 'East of Goldmead. Snowfall is a frozen meadow where the green wood fades into drifts, pine groves, frozen ponds and an igloo camp.'],
  '7,4': ['icewind', 'East of Snowfall. Icewind Reach is a wind-scoured barren of ice spires, frozen lakes and the bones of something enormous.'],
  '6,3': ['rimefang', 'North of Snowfall. The land climbs a long ramp to the flat summit of Rimefang Mesa, where the Ravenous Snow Yetis make their nests.'],
  '7,3': ['glimmerfrost', 'North of Icewind Reach. Glimmerfrost is a glacier of blue crystal, frozen lakes and glittering spires.'],
  '3,3': ['ashroad', 'North of Harefield. A pass through the northern peaks opens onto Ashen Road, where the green meadow gives way to scorched earth, dead trees and the first pools of lava.'],
  '3,2': ['warfield', 'North of Ashen Road. The Endless Field is the battleground of the Holy Knight and the Demon Knight, strewn with broken swords, shields, siege engines and the banners of both armies.'],
  '2,2': ['dawnspire', 'West of the Endless Field. Dawnspire is the Holy Knight\'s white marble castle, with gold-trimmed towers, a cathedral keep and a courtyard of blue fire.'],
  '3,1': ['hellspire', 'North of the Endless Field. Hellspire is the Demon Knight\'s black fortress, ringed in iron spikes, with lava in every crack and a gate shaped like a mouth.'],
  '2,1': ['cinderfall', 'West of Hellspire. Cinderfall is a smoking volcano of black basalt. Volcanum rests on the south shoulder of the cone, above the climb.'],
  '4,3': ['fernreach', 'North of Northleas. A pass through the ridge climbs into Fernreach, the first of the Northern Jungle: open glades, broadleaf stands and Leafmask Village behind its stake fence.'],
  '5,3': ['mistvale', 'North of Goldmead. Mistvale is light jungle around a reed-fringed pond, with bamboo, palms and a dugout canoe pulled up on the bank, under the cliffs of Rimefang Mesa.'],
  '4,2': ['vinecrest', 'North of Fernreach. Vinecrest is hillier jungle of mossy rocks and old trees, with a pass west down to the Endless Field.'],
  '5,2': ['sunfeather', 'North of Mistvale. Sunfeather Village stands in a wide clearing among flowering jungle, its huts painted in ochre and its fire never out.'],
  '8,3': ['glacierbay', 'East of Glimmerfrost. Glacier Bay is a frozen shore of snowfields, ice spires and grey shingle, where floes and small bergs drift on the open sea.'],
  '8,4': ['frostshore', 'East of Icewind Reach. Frostshore runs down to the sea through snowy pine woods; to the south the snow thins and the grass of Seawind Leas comes through.'],
  '8,5': ['seawind', 'East of Gilantre. Seawind Leas is open grass and groves of oak and blossom running down to a long sand beach on the eastern sea.'],
  '2,5': ['lagoon', 'West of Brookside. A pass through the western peaks opens onto Mirrormere Oasis, a turquoise lagoon ringed by palms, ferns and flowering jungle.'],
  '1,5': ['canopy', 'West of the oasis. Silverrun Canopy is thick jungle under giant trees, with an overgrown stone temple, carved idols and roaming Bengal Tigers.'],
  '2,6': ['sunken', 'South of the oasis, west of Longacre. Southmead is dense jungle with bamboo groves, pools and tall grass, where Battle Raptors hunt in packs.'],
  '1,6': ['tigerwood', 'Southwest of the oasis. Runmouth is a steaming jungle hollow with a wrecked pirate ship half swallowed by roots, haunted by Cursed Pirates.'],
  '2,7': ['pirateshore', 'South of Southmead. The jungle thins to a palm beach at Pirate Shore, where two pirate ships are moored and a long fishing pier runs out over deep water.'],
  '1,7': ['shellbeach', 'West of Pirate Shore. Shellbeach is a sweep of white sand, shells and driftwood between the jungle and the sea, with a pirate ship dock on the shore.'],
  '3,7': ['sunspill', 'South of Longacre, where the fields dry out. Sunspill is open dune, sandstone and scrub, with the west shore of the oasis pool in its southeast corner.'],
  '4,7': ['glassroad', 'South of Southford. The vale road comes down through the rim into Glassroad, a dry dune land whose southwest corner holds the oasis pool.'],
  '3,8': ['deepwell', 'South of Sunspill. Deepwell is desert dune and a south beach, with a mining pit three times the span of Greyrock cut into the sand.'],
  '4,8': ['greenbowl', 'South of Glassroad. The Oasis is the living heart of this desert bowl: palms, reeds and still water, drying to dune and then to the southern sea.'],
  '3,6': ['longacre', 'Southwest of Oakhollow, west of Southford. Mara\'s Acre and Wend Farm sit on the long fields, with a lane from the vale.'],
  '5,6': ['hayfield', 'Southeast of Oakhollow, east of Southford. Hay meadows and a lane from the vale.'],
  '5,7': ['silverrunWest', 'Reedford Reach. A wooded river bend with mossy banks, old-growth trees and a narrow trail beside the water.'],
  '6,7': ['silverrunNorth', 'The upper Silverrun forest. Ancient trees, thick fern beds and a river that bends west through the woodland.'],
  '7,7': ['silverrunEast', 'The Elderwood. A deep, lush forest with towering old-growth trees, mossy clearings and winding woodland paths.'],
  '6,8': ['silverrunRiver', 'Silverrun Crossing. The river pours in from the southern sea beneath a timber bridge, while a forest trail climbs toward the mountain ridge.'],
  '7,8': ['silverrunPeak', 'Greystone Summit. A great mountain rises on the western border, with a winding climb to a broad, flat summit above the forest canopy.'],
  '6,5': ['gilantreNw', 'Northwest quarter of Gilantre. Forest and prairie outside the brick wall, and the west drawbridge where the Eastleas road comes in.'],
  '7,5': ['gilantreNe', 'Northeast quarter of Gilantre. The Roman arena stands inside the wall, with prairie beyond the moat.'],
  '6,6': ['gilantreSw', 'Southwest quarter of Gilantre. Ironhaven Forge and the smiths sit inside the wall, with forest outside.'],
  '7,6': ['gilantreSe', 'Southeast quarter of Gilantre. The east drawbridge, the potion stall, and prairie outside the moat.'],
};

const NAMES = [
  ['Frostwall', 'High Ice', 'Snowgate', 'White Pass', 'North Peak', 'Stormhorn', 'Glasscrag', 'Pale Spire', 'Frostspire', 'Last Snow'],
  ['Greymarch', 'Pinehollow', 'Cinderfall', 'Hellspire', 'Northwood', 'Hartwood', 'Ashgrove', 'Elmshade', 'Coldridge', 'Windcrag'],
  ['Fellwatch', 'Bramblewood', 'Dawnspire', 'The Endless Field', 'Vinecrest', 'Sunfeather', 'Darkbough', 'Emberwood', 'Cinderhill', 'Ashfall'],
  ['Riverwatch', 'Silverbend', 'Fernwood', 'Ashen Road', 'Fernreach', 'Mistvale', 'Rimefang Mesa', 'Glimmerfrost', 'Glacier Bay', 'Northern Sea'],
  ['Westwater', 'Millrace', 'Buttermead', 'Harefield', 'Northleas', 'Goldmead', 'Snowfall', 'Icewind Reach', 'Frostshore', 'Grey Swell'],
  ['Westmead', 'Silverrun', 'Mirrormere', 'Brookside', 'Oakhollow', 'Eastleas', 'Gilantre', 'Gilantre', 'Seawind Leas', 'Eastern Sea'],
  ['Sandcliff', 'Runmouth', 'Southmead', 'Longacre', 'Southford', 'Hayfield', 'Gilantre', 'Gilantre', 'Broken Arch', 'Old Stones'],
  ['Seagate', 'Shellbeach', 'Pirate Shore', 'Sunspill', 'Glassroad', 'Reedford', 'Silverrun Reach', 'Elderwood', 'Sunken Yard', 'Grey Sea'],
  ['Open Water', 'West Deep', 'Pale Shore', 'Deepwell', 'Oasis', 'Sedge', 'Silverrun Crossing', 'Greystone Summit', 'South Deep', 'East Deep'],
  ['Far West', 'Whale Road', 'Glass Sea', 'South Strand', 'Midsea', 'East Strand', 'Kelp', 'Quiet Deep', 'Last Water', 'Far East'],
];

function buildTiles() {
  if (CODES.length !== GRID || NAMES.length !== GRID) throw new Error('World map must be 10 by 10');
  const tiles = [];
  for (let tz = 0; tz < GRID; tz++) {
    if (CODES[tz].length !== GRID || NAMES[tz].length !== GRID) throw new Error('World map row ' + tz + ' is not 10 tiles');
    for (let tx = 0; tx < GRID; tx++) {
      const code = CODES[tz][tx];
      const biome = BIOMES[code];
      if (!biome) throw new Error('Unknown biome ' + code);
      const southford = tz === 6 && tx === 4;
      const ring = RING[tx + ',' + tz];
      const gilantre = ring && String(ring[0]).startsWith('gilantre');
      const silverrunWest = ring && ring[0] === 'silverrunWest';
      const built = code === 'O' || southford || !!ring;
      tiles.push({
        id: `t${tx}-${tz}`,
        tx,
        tz,
        n: tz * GRID + tx + 1,
        code,
        biome: gilantre ? 'town' : silverrunWest ? 'forest' : biome.id,
        biomeName: gilantre ? 'Town' : silverrunWest ? 'Forest' : biome.name,
        color: gilantre ? '#e6c36a' : silverrunWest ? BIOMES.F.color : biome.color,
        name: NAMES[tz][tx],
        blurb: code === 'O'
          ? 'The starter tile. Oakhollow, the fairy forest, Greyrock Pit, Mirrormere and the farm all sit on this one tile. Passes leave north, west, east and south into the neighboring tiles.'
          : southford
            ? 'South of Oakhollow. The south road drops through a pass beside the river and opens into Southford. A cave in the eastern bluff is the Darksycle Dragon\'s den. Lanes leave west into Longacre and east into Hayfield.'
            : ring
              ? ring[1]
              : `${biome.blurb} Mapped, not built yet.`,
        built,
        kind: code === 'O' ? 'oakhollow' : southford ? 'southford' : ring ? ring[0] : 'planned',
        seed: 400 + tz * 17 + tx * 13,
      });
    }
  }
  return tiles;
}

export const TILES = buildTiles();
export const STARTER = TILES.find((t) => t.kind === 'oakhollow');

export function tileAt(tx, tz) {
  if (tx < 0 || tz < 0 || tx >= GRID || tz >= GRID) return null;
  return TILES[tz * GRID + tx];
}

/** World origin of a tile, with Oakhollow kept at (0, 0) so the current land does not move. */
export function originOf(tile) {
  return {
    x: (tile.tx - STARTER.tx) * TILE_SIZE,
    z: (tile.tz - STARTER.tz) * TILE_SIZE,
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1));
  return t * t * (3 - 2 * t);
};

/** Height and color of a planned tile at u, v in 0..1. North is v = 0. */
export function sampleTile(tile, u, v) {
  const wx = tile.tx + u;
  const wz = tile.tz + v;
  const n = fbm(wx * 1.85, wz * 1.85, 11, 3);
  const n2 = fbm(wx * 4.2 + 2.1, wz * 4.2, 20, 2);
  const edge = Math.min(u, v, 1 - u, 1 - v);
  let h = 1.4;
  let r = 0.42;
  let g = 0.62;
  let b = 0.28;
  switch (tile.biome) {
    case 'peaks': {
      h = 3.5 + n * 7;
      const snow = h > 8.2 ? clamp01((h - 8.2) / 2.2) : 0;
      r = lerp(0.24 + n * 0.04, 0.70, snow);
      g = lerp(0.26 + n * 0.03, 0.74, snow);
      b = lerp(0.32, 0.80, snow);
      break;
    }
    case 'jungle': {
      h = 2.4 + n * 2.2;
      r = 0.16 + n2 * 0.06;
      g = 0.42 + n * 0.16;
      b = 0.16;
      if (n2 > 0.8) {
        r = 0.5;
        g = 0.6;
        b = 0.3;
      }
      break;
    }
    case 'forest':
    case 'gate': {
      h = 2.2 + n * 2.4;
      r = tile.biome === 'gate' ? 0.14 : 0.1;
      g = 0.28 + n * 0.18;
      b = tile.biome === 'gate' ? 0.16 : 0.12;
      if (n2 > 0.78) {
        g *= 0.86;
        r *= 0.9;
      }
      break;
    }
    case 'meadow':
      h = 1.3 + n * 0.8;
      r = 0.62 + n2 * 0.1;
      g = 0.68;
      b = 0.28;
      if (n2 > 0.84) {
        r = 0.82;
        g = 0.5;
        b = 0.52;
      }
      break;
    case 'river': {
      const chan = Math.abs(u - (0.35 + (n - 0.5) * 0.16));
      h = chan < 0.06 ? -0.3 : 1.2 + n * 0.5;
      if (h < 0.3) {
        r = 0.2;
        g = 0.55;
        b = 0.78;
      } else {
        r = 0.45;
        g = 0.62;
        b = 0.32;
      }
      break;
    }
    case 'lake': {
      const bowl = Math.hypot((u - 0.48) / 0.34, (v - 0.5) / 0.28);
      h = bowl < 1 ? -0.2 : 1.1 + n * 0.4;
      if (h < 0.3) {
        r = 0.18;
        g = 0.52;
        b = 0.78;
      } else {
        r = 0.55;
        g = 0.66;
        b = 0.34;
      }
      break;
    }
    case 'waste':
      h = 2 + n * 4;
      r = 0.62 + n2 * 0.12;
      g = 0.42;
      b = 0.24;
      break;
    case 'farm':
      h = 1.2 + n * 0.3;
      r = 0.58 + n2 * 0.08;
      g = 0.52 + n * 0.06;
      b = 0.24;
      break;
    case 'marsh': {
      const pond = n2 > 0.62;
      h = pond ? -0.1 : 0.7 + n * 0.3;
      r = pond ? 0.16 : 0.32;
      g = pond ? 0.4 : 0.48;
      b = pond ? 0.42 : 0.24;
      break;
    }
    case 'coast': {
      const t = smoothstep(0.36, 0.62, v + (n - 0.5) * 0.14);
      h = lerp(1 + n * 0.45, 0.14, t);
      r = lerp(0.78, 0.13, t);
      g = lerp(0.70, 0.42, t);
      b = lerp(0.45, 0.58, t);
      break;
    }
    case 'sea':
      h = 0.12;
      r = 0.11 + n * 0.018;
      g = 0.31 + n * 0.025;
      b = 0.54 + n * 0.03;
      break;
    case 'volcanic': {
      h = 2.4 + n * 3.4;
      const lava = n2 > 0.84;
      r = lava ? 0.95 : 0.2 + n2 * 0.1;
      g = lava ? 0.42 : 0.19 + n2 * 0.05;
      b = lava ? 0.1 : 0.2 + n2 * 0.05;
      break;
    }
    case 'ruins': {
      h = 1.2 + n * 0.5;
      r = 0.28 + n2 * 0.06;
      g = 0.42 + n * 0.1;
      b = 0.24 + n2 * 0.03;
      break;
    }
    case 'arctic': {
      h = 1.6 + n * 1.8;
      const drift = n * 0.55 + n2 * 0.45;
      const ice = drift > 0.62;
      r = ice ? 0.52 + n * 0.05 : 0.64 + n * 0.06;
      g = ice ? 0.68 + n * 0.04 : 0.76 + n * 0.04;
      b = ice ? 0.80 : 0.84;
      break;
    }
    case 'oasis': {
      const bowl = Math.hypot((wx - 3.55) / 0.92, (wz - 7.48) / 0.78);
      h = bowl < 1 ? -0.15 : 1.1 + n * 0.55;
      if (h < 0.3) {
        r = 0.18;
        g = 0.58;
        b = 0.72;
      } else {
        r = 0.86 + n * 0.05;
        g = 0.72 + n * 0.06;
        b = 0.42;
      }
      break;
    }
    case 'town':
      h = 1.3 + n * 0.4;
      r = 0.38 + n2 * 0.08;
      g = 0.56 + n * 0.08;
      b = 0.26;
      break;
    default:
      break;
  }
  void edge;
  const shade = 0.86 + clamp01(h / 18) * 0.14;
  return { h: Math.max(0.05, h), r: r * shade, g: g * shade, b: b * shade };
}

function mixSample(a, b, t) {
  if (!b || t <= 0) return a;
  if (t >= 1) return b;
  return {
    h: lerp(a.h, b.h, t),
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

/** Sample a tile blended with its neighbours so biome borders are not hard rectangles. */
export function sampleBlended(tile, u, v) {
  const band = MAP_BORDER_PX / TILE_SIZE;
  const warpAmp = MAP_WARP_PX / TILE_SIZE;
  const wx = tile.tx + u;
  const wz = tile.tz + v;
  const warp = (fbm(wx * 3.4, wz * 3.4, 5, 3) - 0.5) * warpAmp;
  let s = sampleTile(tile, u, v);
  const wu = u + warp;
  const wv = v + warp * 0.9;
  const west = tileAt(tile.tx - 1, tile.tz);
  const east = tileAt(tile.tx + 1, tile.tz);
  const north = tileAt(tile.tx, tile.tz - 1);
  const south = tileAt(tile.tx, tile.tz + 1);
  if (west && wu < band) s = mixSample(s, sampleTile(west, u + 1, v), smoothstep(band, 0, wu));
  if (east && wu > 1 - band) s = mixSample(s, sampleTile(east, u - 1, v), smoothstep(band, 0, 1 - wu));
  if (north && wv < band) s = mixSample(s, sampleTile(north, u, v + 1), smoothstep(band, 0, wv));
  if (south && wv > 1 - band) s = mixSample(s, sampleTile(south, u, v - 1), smoothstep(band, 0, 1 - wv));
  return s;
}

/** Flat overhead painting of a planned tile. North is up. */
export function paintTileMap(canvas, tile) {
  const s = canvas.width;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(s, s);
  const d = img.data;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const c = sampleBlended(tile, (x + 0.5) / s, (y + 0.5) / s);
      const i = (y * s + x) * 4;
      d[i] = Math.max(0, Math.min(255, c.r * 255));
      d[i + 1] = Math.max(0, Math.min(255, c.g * 255));
      d[i + 2] = Math.max(0, Math.min(255, c.b * 255));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
