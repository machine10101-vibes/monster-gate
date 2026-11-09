import { fbm } from '../engine/voxel.js';

/** One tile is the whole current land (144 by 144). The world is a 10 by 10 grid. */
export const GRID = 10;
export const TILE_COUNT = GRID * GRID;
export const TILE_SIZE = 144;

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
  D: { id: 'ruins', name: 'Ruins', color: '#8d6e9c', blurb: 'Something old broke here.' },
};

const CODES = [
  'PPPPPPPPPP',
  'PFFFFFFPPP',
  'PFFFGGFFWP',
  'PRFFFMFWWP',
  'RRMMMFMWWA',
  'MRLMOMAHMM',
  'CRMMRMAHDD',
  'SCCRRRHDDS',
  'SSCRHHDDSS',
  'SSSCSCSSSS',
];

const NAMES = [
  ['Frostwall', 'High Ice', 'Snowgate', 'White Pass', 'North Peak', 'Stormhorn', 'Glasscrag', 'Pale Spire', 'Frostspire', 'Last Snow'],
  ['Greymarch', 'Pinehollow', 'Deerwood', 'Mossdeep', 'Northwood', 'Hartwood', 'Ashgrove', 'Elmshade', 'Coldridge', 'Windcrag'],
  ['Fellwatch', 'Bramblewood', 'Thornveil', 'Gloomwood', 'Gatewood', 'Wyrmwood', 'Darkbough', 'Emberwood', 'Cinderhill', 'Ashfall'],
  ['Riverwatch', 'Silverbend', 'Fernwood', 'Owlhollow', 'Goldglade', 'Meadowrise', 'Birchline', 'Dryridge', 'Dusthill', 'Redcrag'],
  ['Westwater', 'Millrace', 'Buttermead', 'Harefield', 'Northleas', 'Goldmead', 'Quarry Hill', 'Scorch', 'Saltpan', 'Far Leas'],
  ['Westmead', 'Silverrun', 'Mirrormere', 'Brookside', 'Oakhollow', 'Eastleas', 'Old Acre', 'Harrowfen', 'Reedbank', 'Frogmarsh'],
  ['Sandcliff', 'Runmouth', 'Southmead', 'Longacre', 'Southford', 'Hayfield', 'Greenrows', 'Blackfen', 'Broken Arch', 'Old Stones'],
  ['Seagate', 'Shellbeach', 'Dunes', 'Rivermouth', 'Lowford', 'Reedford', 'Saltfen', 'Drowned Hall', 'Sunken Yard', 'Grey Sea'],
  ['Open Water', 'West Deep', 'Pale Shore', 'Harbor', 'Brine', 'Sedge', 'Ruinwater', 'Black Reef', 'South Deep', 'East Deep'],
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
      const built = code === 'O';
      tiles.push({
        id: `t${tx}-${tz}`,
        tx,
        tz,
        n: tz * GRID + tx + 1,
        code,
        biome: biome.id,
        biomeName: biome.name,
        color: biome.color,
        name: NAMES[tz][tx],
        blurb: built
          ? 'The starter tile. Oakhollow, the fairy forest, Greyrock Pit, Mirrormere and the farm all sit on this one tile.'
          : `${biome.blurb} Mapped, not built yet.`,
        built,
        kind: built ? 'oakhollow' : 'planned',
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

/** Height and color of a planned tile at u, v in 0..1. North is v = 0. */
export function sampleTile(tile, u, v) {
  const s = tile.seed;
  const n = fbm(u * 3.2 + s * 0.01, v * 3.2, s, 4);
  const n2 = fbm(u * 8 + 2, v * 8, s + 9, 3);
  const edge = Math.min(u, v, 1 - u, 1 - v);
  let h = 1.4;
  let r = 0.42;
  let g = 0.62;
  let b = 0.28;
  switch (tile.biome) {
    case 'peaks': {
      h = 3.5 + n * 7;
      const snow = h > 8.2 ? clamp01((h - 8.2) / 2.2) : 0;
      r = lerp(0.22 + n2 * 0.08, 0.9, snow);
      g = lerp(0.24 + n2 * 0.05, 0.92, snow);
      b = lerp(0.3, 0.96, snow);
      break;
    }
    case 'forest':
    case 'gate': {
      h = 2.2 + n * 2.4;
      r = tile.biome === 'gate' ? 0.16 : 0.1;
      g = 0.28 + n * 0.22;
      b = tile.biome === 'gate' ? 0.2 : 0.12;
      if (n2 > 0.62) {
        g *= 0.72;
        r *= 0.8;
      }
      if (tile.biome === 'gate' && Math.hypot(u - 0.5, v - 0.62) < 0.12) {
        r = 0.35;
        g = 0.22;
        b = 0.48;
        h = 2.4;
      }
      break;
    }
    case 'meadow':
      h = 1.3 + n * 0.8;
      r = 0.62 + n2 * 0.15;
      g = 0.68;
      b = 0.28;
      if (n2 > 0.78) {
        r = 0.85;
        g = 0.45;
        b = 0.55;
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
      r = 0.62 + n2 * 0.15;
      g = 0.42;
      b = 0.24;
      break;
    case 'farm':
      h = 1.15 + (Math.floor(v * 14) % 2) * 0.08;
      r = 0.55 + (Math.floor(v * 14) % 2) * 0.12;
      g = 0.5;
      b = 0.2;
      break;
    case 'marsh': {
      const pond = n2 > 0.58;
      h = pond ? -0.1 : 0.7 + n * 0.3;
      r = pond ? 0.16 : 0.32;
      g = pond ? 0.4 : 0.48;
      b = pond ? 0.42 : 0.24;
      break;
    }
    case 'coast': {
      const shore = v > 0.45 + (n - 0.5) * 0.1;
      h = shore ? 0.15 : 1 + n * 0.5;
      r = shore ? 0.15 : 0.78;
      g = shore ? 0.45 : 0.7;
      b = shore ? 0.62 : 0.45;
      break;
    }
    case 'sea':
      h = 0.12 + n2 * 0.08;
      r = 0.08 + n * 0.06;
      g = 0.28 + n2 * 0.12;
      b = 0.52 + n * 0.15;
      break;
    case 'ruins': {
      const pad = u > 0.32 && u < 0.68 && v > 0.3 && v < 0.7;
      h = pad ? 1.6 : 1.1 + n * 0.4;
      r = pad ? 0.45 : 0.4;
      g = pad ? 0.42 : 0.5;
      b = pad ? 0.4 : 0.28;
      break;
    }
    default:
      break;
  }
  if (edge < 0.02) {
    h = Math.min(h, 0.2);
    r *= 0.35;
    g *= 0.35;
    b *= 0.35;
  }
  const shade = 0.86 + clamp01(h / 18) * 0.14;
  return { h: Math.max(0.05, h), r: r * shade, g: g * shade, b: b * shade };
}

/** Flat overhead painting of a planned tile. North is up. */
export function paintTileMap(canvas, tile) {
  const s = canvas.width;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(s, s);
  const d = img.data;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const c = sampleTile(tile, (x + 0.5) / s, (y + 0.5) / s);
      const snap = (v) => Math.round(Math.max(0, Math.min(1, (v - 0.4) * 1.45 + 0.4)) * 6) / 6;
      const i = (y * s + x) * 4;
      d[i] = snap(c.r) * 255;
      d[i + 1] = snap(c.g) * 255;
      d[i + 2] = snap(c.b) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
