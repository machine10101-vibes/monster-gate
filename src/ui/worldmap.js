import { GRID, TILES, TILE_COUNT, paintTileMap } from '../world/tiles.js';
import { captureTileView } from '../world/tileview.js';

const thumbs = new Map();
const CELL = 36;

function hash21(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function thumb(tile, game) {
  let c = thumbs.get(tile.id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = CELL;
  c.height = CELL;
  paintTileMap(c, tile);
  const land = tile.built && game.world.tileCanvas?.[tile.id];
  if (land) {
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.84;
    ctx.drawImage(land, 0, 0, CELL, CELL);
    ctx.globalAlpha = 1;
  }
  thumbs.set(tile.id, c);
  return c;
}

/** Soften biome seams so the 10×10 map is not a grid of hard rectangles. */
function blendThumbs() {
  const w = GRID * CELL;
  const atlas = document.createElement('canvas');
  atlas.width = w;
  atlas.height = w;
  const actx = atlas.getContext('2d');
  for (const tile of TILES) {
    const c = thumbs.get(tile.id);
    if (c) actx.drawImage(c, tile.tx * CELL, tile.tz * CELL);
  }
  const src = actx.getImageData(0, 0, w, w);
  const out = actx.createImageData(w, w);
  out.data.set(src.data);
  const band = 16;
  const mix = (x, y, nx, ny, t) => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= w || t <= 0) return;
    const i = (y * w + x) * 4;
    const j = (ny * w + nx) * 4;
    const k = Math.max(0, Math.min(1, t));
    out.data[i] += (src.data[j] - out.data[i]) * k;
    out.data[i + 1] += (src.data[j + 1] - out.data[i + 1]) * k;
    out.data[i + 2] += (src.data[j + 2] - out.data[i + 2]) * k;
  };
  for (let tz = 0; tz < GRID; tz++) {
    for (let tx = 0; tx < GRID; tx++) {
      for (let ly = 0; ly < CELL; ly++) {
        for (let lx = 0; lx < CELL; lx++) {
          const x = tx * CELL + lx;
          const y = tz * CELL + ly;
          const jagged = (hash21(x * 0.35, y * 0.35) - 0.5) * 8;
          const jx = jagged;
          const jy = (hash21(y * 0.31, x * 0.29) - 0.5) * 8;
          if (lx + jx < band && tx > 0) mix(x, y, x - (band - lx), y, 1 - (lx + jx) / band);
          if (lx - jx >= CELL - band && tx < GRID - 1) mix(x, y, x + (lx - (CELL - band) + 1), y, (lx - jx - (CELL - band) + 1) / band);
          if (ly + jy < band && tz > 0) mix(x, y, x, y - (band - ly), 1 - (ly + jy) / band);
          if (ly - jy >= CELL - band && tz < GRID - 1) mix(x, y, x, y + (ly - (CELL - band) + 1), (ly - jy - (CELL - band) + 1) / band);
        }
      }
    }
  }
  actx.putImageData(out, 0, 0);
  for (const tile of TILES) {
    const c = thumbs.get(tile.id);
    if (!c) continue;
    c.getContext('2d').drawImage(atlas, tile.tx * CELL, tile.tz * CELL, CELL, CELL, 0, 0, CELL, CELL);
  }
}

function ensureThumbs(game) {
  if (thumbs.size >= TILES.length) return;
  for (const tile of TILES) thumb(tile, game);
  blendThumbs();
}

export function resetWorldMapThumbs() {
  thumbs.clear();
}

/** The 100-tile world map. Selecting a tile shows that plot from above. */
export function mountWorldMap(body, game) {
  let sel = game.world.activeTile || TILES.find((t) => t.built);
  let token = 0;
  let alive = true;

  const paint = () => {
    if (!alive) return;
    body.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'wm';

    const left = document.createElement('div');
    left.className = 'wm-left';
    const note = document.createElement('p');
    note.className = 'wm-note';
    note.textContent = `${TILE_COUNT} lands. North is up. Gold names are the areas and cities that are built.`;
    left.appendChild(note);
    const grid = document.createElement('div');
    grid.className = 'wm-grid';
    ensureThumbs(game);
    for (const tile of TILES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wm-cell' + (tile.built ? ' built' : '') + (tile.id === sel.id ? ' sel' : '');
      b.title = `${tile.name} — ${tile.biomeName}. Tile ${tile.n}`;
      const cv = document.createElement('canvas');
      cv.width = 36;
      cv.height = 36;
      cv.getContext('2d').drawImage(thumbs.get(tile.id), 0, 0);
      b.appendChild(cv);
      const num = document.createElement('span');
      num.className = 'wm-num';
      num.textContent = String(tile.n);
      b.appendChild(num);
      const name = document.createElement('b');
      name.className = 'wm-name';
      name.textContent = tile.name;
      b.appendChild(name);
      b.onclick = () => {
        sel = tile;
        game.audio.select();
        paint();
      };
      grid.appendChild(b);
    }
    left.appendChild(grid);
    root.appendChild(left);

    const right = document.createElement('div');
    right.className = 'wm-detail';
    const head = document.createElement('div');
    head.className = 'wm-head';
    head.innerHTML = `<b>${sel.name}</b><span>Tile ${sel.n} of ${TILE_COUNT}</span>`;
    right.appendChild(head);
    const meta = document.createElement('p');
    meta.className = 'wm-meta';
    meta.textContent = `Column ${sel.tx + 1}, row ${sel.tz + 1} · ${sel.biomeName} · ${sel.built ? 'Built' : 'Planned'}`;
    right.appendChild(meta);
    const blurb = document.createElement('p');
    blurb.className = 'wm-blurb';
    blurb.textContent = sel.blurb;
    right.appendChild(blurb);
    const shot = document.createElement('canvas');
    shot.className = 'wm-shot';
    shot.width = 384;
    shot.height = 384;
    const sctx = shot.getContext('2d');
    const land = sel.built && game.world.tileCanvas?.[sel.id];
    if (land) {
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(land, 0, 0, 384, 384);
    } else paintTileMap(shot, sel);
    right.appendChild(shot);
    const cap = document.createElement('p');
    cap.className = 'wm-cap';
    cap.textContent = 'From above · north is up';
    right.appendChild(cap);
    root.appendChild(right);
    body.appendChild(root);

    if (sel.built) {
      const mine = ++token;
      requestAnimationFrame(() => {
        if (!alive || mine !== token) return;
        try {
          captureTileView(game, sel, shot);
        } catch (err) {
          console.warn('overhead view failed', err);
        }
      });
    }
  };

  paint();
  return () => {
    alive = false;
  };
}
