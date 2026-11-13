import { TILES, TILE_COUNT, paintTileMap } from '../world/tiles.js';
import { captureTileView } from '../world/tileview.js';

const thumbs = new Map();

function thumb(tile, game) {
  let c = thumbs.get(tile.id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 36;
  c.height = 36;
  const ctx = c.getContext('2d');
  const land = tile.built && game.world.tileCanvas?.[tile.id];
  if (land) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(land, 0, 0, 36, 36);
  } else paintTileMap(c, tile);
  thumbs.set(tile.id, c);
  return c;
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
    for (const tile of TILES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wm-cell' + (tile.built ? ' built' : '') + (tile.id === sel.id ? ' sel' : '');
      b.title = `${tile.name} — ${tile.biomeName}. Tile ${tile.n}`;
      const cv = document.createElement('canvas');
      cv.width = 36;
      cv.height = 36;
      cv.getContext('2d').drawImage(thumb(tile, game), 0, 0);
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
