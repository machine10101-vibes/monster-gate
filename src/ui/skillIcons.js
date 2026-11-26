/**
 * Painted skill icons. Every skill gets its own composition, drawn at 48x48
 * with shaded glyphs, glows and a path-coloured stone backdrop, so the hot
 * buttons, the skill tree and the spellbook all show the same art.
 */

export const ICON_SIZE = 48;
const C = 24;
const INK = '#120a0e';

/* --------------------------------- helpers -------------------------------- */

const lin = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
};
const rad = (ctx, x, y, r, stops) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
};

function shape(ctx, build, fill, line = INK, lw = 2) {
  ctx.beginPath();
  build(ctx);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = line;
    ctx.stroke();
  }
}

function glow(ctx, x, y, r, color, a = 0.85) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.fillStyle = rad(ctx, x, y, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function star(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.28, y - r * 0.28);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.28, y + r * 0.28);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.28, y + r * 0.28);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.28, y - r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function stroke(ctx, pts, color, w, cap = 'round') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

function arc(ctx, x, y, r, a0, a1, color, w) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
  ctx.restore();
}

function withXf(ctx, x, y, rot, s, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  fn();
  ctx.restore();
}

/* --------------------------------- glyphs --------------------------------- */

const STEEL = [[0, '#ffffff'], [0.45, '#c9d2dc'], [1, '#6f7a88']];
const GOLD = [[0, '#fff4c2'], [0.5, '#e8b84a'], [1, '#8a5a1a']];

/** A sword in local space: hilt at (0, 14), tip at (0, -18). */
function sword(ctx, x, y, rot, s = 1, blade = STEEL) {
  withXf(ctx, x, y, rot, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-2.6, 8);
      c.lineTo(-2.6, -12);
      c.lineTo(0, -18);
      c.lineTo(2.6, -12);
      c.lineTo(2.6, 8);
    }, lin(ctx, -3, 0, 3, 0, blade), INK, 1.6);
    stroke(ctx, [[0, 6], [0, -14]], 'rgba(255,255,255,0.55)', 0.9);
    shape(ctx, (c) => c.rect(-7, 7.5, 14, 3), lin(ctx, 0, 7, 0, 11, GOLD), INK, 1.4);
    shape(ctx, (c) => c.rect(-1.6, 10.5, 3.2, 6), '#5a3a22', INK, 1.2);
    shape(ctx, (c) => c.arc(0, 18, 2.2, 0, Math.PI * 2), lin(ctx, 0, 16, 0, 20, GOLD), INK, 1.2);
  });
}

function axe(ctx, x, y, rot, s = 1, head = STEEL) {
  withXf(ctx, x, y, rot, s, () => {
    shape(ctx, (c) => c.rect(-1.8, -16, 3.6, 32), lin(ctx, -2, 0, 2, 0, [[0, '#8a5a32'], [1, '#4a2e18']]), INK, 1.4);
    shape(ctx, (c) => {
      c.moveTo(1, -14);
      c.quadraticCurveTo(16, -18, 15, -2);
      c.quadraticCurveTo(9, -4, 1, -1);
    }, lin(ctx, 0, -16, 14, -2, head), INK, 1.6);
    stroke(ctx, [[14, -14], [15, -3]], 'rgba(255,255,255,0.7)', 1.2);
  });
}

function hammer(ctx, x, y, rot, s = 1, head = STEEL) {
  withXf(ctx, x, y, rot, s, () => {
    shape(ctx, (c) => c.rect(-1.8, -8, 3.6, 26), lin(ctx, -2, 0, 2, 0, [[0, '#8a5a32'], [1, '#4a2e18']]), INK, 1.4);
    shape(ctx, (c) => c.rect(-10, -16, 20, 10), lin(ctx, 0, -16, 0, -6, head), INK, 1.8);
    shape(ctx, (c) => c.rect(-11, -14, 2, 6), '#3a3c44', null);
    shape(ctx, (c) => c.rect(9, -14, 2, 6), '#3a3c44', null);
    stroke(ctx, [[-8, -14], [8, -14]], 'rgba(255,255,255,0.6)', 1);
  });
}

function shield(ctx, x, y, s, face = ['#7fb0e0', '#2a4a7a'], rim = GOLD, emblem = null) {
  withXf(ctx, x, y, 0, s, () => {
    const outline = (c) => {
      c.moveTo(-13, -14);
      c.lineTo(13, -14);
      c.lineTo(13, -2);
      c.quadraticCurveTo(12, 10, 0, 17);
      c.quadraticCurveTo(-12, 10, -13, -2);
    };
    shape(ctx, outline, lin(ctx, 0, -14, 0, 17, rim), INK, 2);
    withXf(ctx, 0, 0.5, 0, 0.78, () => shape(ctx, outline, lin(ctx, -10, -14, 10, 16, [[0, face[0]], [1, face[1]]]), null));
    stroke(ctx, [[-9, -10], [-9, 2]], 'rgba(255,255,255,0.45)', 1.4);
    if (emblem) emblem();
  });
}

function flame(ctx, x, y, s = 1, hot = false) {
  withXf(ctx, x, y, 0, s, () => {
    const lick = (sc, col) =>
      withXf(ctx, 0, 0, 0, sc, () =>
        shape(ctx, (c) => {
          c.moveTo(0, 14);
          c.bezierCurveTo(-13, 12, -12, -2, -4, -8);
          c.bezierCurveTo(-4, -2, -1, -2, -1, -2);
          c.bezierCurveTo(-2, -10, 2, -14, 3, -18);
          c.bezierCurveTo(6, -10, 13, -4, 11, 5);
          c.bezierCurveTo(10, 11, 5, 14, 0, 14);
        }, col, sc === 1 ? INK : null, 1.6),
      );
    lick(1, lin(ctx, 0, -18, 0, 14, [[0, '#ffb040'], [1, '#c8261a']]));
    lick(0.68, lin(ctx, 0, -12, 0, 10, [[0, '#ffe070'], [1, '#ff7a1a']]));
    lick(0.38, hot ? '#ffffff' : '#fff4c0');
  });
}

function snowflake(ctx, x, y, r, color = '#e8f8ff') {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r;
    stroke(ctx, [[x, y], [ex, ey]], INK, 4.4);
    stroke(ctx, [[x, y], [ex, ey]], color, 2.4);
    for (const k of [0.45, 0.72]) {
      const bx = x + Math.cos(a) * r * k;
      const by = y + Math.sin(a) * r * k;
      for (const d of [-0.7, 0.7]) stroke(ctx, [[bx, by], [bx + Math.cos(a + d) * r * 0.28, by + Math.sin(a + d) * r * 0.28]], color, 1.8);
    }
  }
  shape(ctx, (c) => c.arc(x, y, r * 0.18, 0, Math.PI * 2), '#ffffff', INK, 1.2);
}

function shard(ctx, x, y, w, h, rot, cols = ['#ffffff', '#9fe0ff', '#2f7ab8']) {
  withXf(ctx, x, y, rot, 1, () => {
    shape(ctx, (c) => {
      c.moveTo(0, -h);
      c.lineTo(w, -h * 0.35);
      c.lineTo(w * 0.7, h);
      c.lineTo(-w * 0.7, h);
      c.lineTo(-w, -h * 0.35);
    }, lin(ctx, -w, -h, w, h, [[0, cols[0]], [0.45, cols[1]], [1, cols[2]]]), INK, 1.6);
    stroke(ctx, [[0, -h], [0, h * 0.95]], 'rgba(255,255,255,0.6)', 1);
  });
}

function bolt(ctx, pts, color = '#8fe8ff') {
  glowLine(ctx, pts, color);
  stroke(ctx, pts, INK, 5);
  stroke(ctx, pts, color, 3.2);
  stroke(ctx, pts, '#ffffff', 1.3);
}
function glowLine(ctx, pts, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  stroke(ctx, pts, color, 9);
  ctx.restore();
}

function arrow(ctx, x0, y0, x1, y1, tip = '#d9dde4', fletch = '#d8402e', s = 1) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  stroke(ctx, [[x0, y0], [x1, y1]], INK, 4 * s);
  stroke(ctx, [[x0, y0], [x1, y1]], '#b98a4e', 2.2 * s);
  withXf(ctx, x1, y1, a, s, () => shape(ctx, (c) => {
    c.moveTo(6, 0);
    c.lineTo(-3, -4);
    c.lineTo(-1, 0);
    c.lineTo(-3, 4);
  }, tip, INK, 1.4));
  withXf(ctx, x0, y0, a, s, () => {
    shape(ctx, (c) => {
      c.moveTo(6, 0);
      c.lineTo(-1, -5);
      c.lineTo(2, 0);
    }, fletch, INK, 1);
    shape(ctx, (c) => {
      c.moveTo(6, 0);
      c.lineTo(-1, 5);
      c.lineTo(2, 0);
    }, fletch, INK, 1);
  });
}

function bow(ctx, x, y, s = 1) {
  withXf(ctx, x, y, 0, s, () => {
    stroke(ctx, [[-2, -17], [-2, 17]], '#e8dcc0', 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-2, -17);
    ctx.quadraticCurveTo(14, 0, -2, 17);
    ctx.stroke();
    ctx.strokeStyle = lin(ctx, 0, -17, 0, 17, [[0, '#c8935a'], [0.5, '#8a5a32'], [1, '#c8935a']]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  });
}

function wolf(ctx, x, y, s = 1, howl = false) {
  withXf(ctx, x, y, howl ? -0.45 : 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-12, 12);
      c.lineTo(-11, -2);
      c.lineTo(-9, -14);
      c.lineTo(-4, -6);
      c.lineTo(1, -6);
      c.lineTo(4, -14);
      c.lineTo(7, -3);
      c.lineTo(15, 2);
      c.lineTo(15, 6);
      c.lineTo(6, 8);
      c.lineTo(2, 14);
    }, lin(ctx, -10, -14, 12, 14, [[0, '#d8dde4'], [0.6, '#8a93a0'], [1, '#4a525e']]), INK, 2);
    shape(ctx, (c) => {
      c.moveTo(6, 7);
      c.lineTo(15, 5.5);
      c.lineTo(14, 8);
      c.lineTo(7, 9);
    }, howl ? '#3a1414' : '#e8e8ec', null);
    shape(ctx, (c) => c.arc(3, 0, 1.8, 0, Math.PI * 2), '#ffc040', INK, 1);
    shape(ctx, (c) => c.arc(15, 3, 1.3, 0, Math.PI * 2), INK, null);
  });
}

function paw(ctx, x, y, s = 1, col = '#e8d8b8') {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => c.ellipse(0, 4, 6, 5, 0, 0, Math.PI * 2), col, INK, 1.6);
    for (const [px, py] of [[-6, -3], [-2, -6.5], [2, -6.5], [6, -3]]) shape(ctx, (c) => c.ellipse(px, py, 2.2, 2.8, 0, 0, Math.PI * 2), col, INK, 1.4);
  });
}

function skull(ctx, x, y, s = 1, col = '#e8e4d0') {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.arc(0, -2, 10, Math.PI, 0);
      c.lineTo(10, 3);
      c.lineTo(6, 6);
      c.lineTo(6, 11);
      c.lineTo(-6, 11);
      c.lineTo(-6, 6);
      c.lineTo(-10, 3);
    }, lin(ctx, 0, -12, 0, 11, [[0, '#ffffff'], [1, col]]), INK, 1.8);
    shape(ctx, (c) => c.ellipse(-4, 0, 3, 3.4, 0, 0, Math.PI * 2), INK, null);
    shape(ctx, (c) => c.ellipse(4, 0, 3, 3.4, 0, 0, Math.PI * 2), INK, null);
    shape(ctx, (c) => {
      c.moveTo(0, 3);
      c.lineTo(-1.5, 6);
      c.lineTo(1.5, 6);
    }, INK, null);
    for (const tx of [-3.5, 0, 3.5]) stroke(ctx, [[tx, 8], [tx, 11]], INK, 1);
  });
}

function drop(ctx, x, y, s, top, bottom) {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(0, -14);
      c.bezierCurveTo(4, -6, 10, 0, 10, 5);
      c.arc(0, 5, 10, 0, Math.PI);
      c.bezierCurveTo(-10, 0, -4, -6, 0, -14);
    }, lin(ctx, 0, -14, 0, 15, [[0, top], [1, bottom]]), INK, 2);
    shape(ctx, (c) => c.ellipse(-4, 4, 2, 4, 0.3, 0, Math.PI * 2), 'rgba(255,255,255,0.6)', null);
  });
}

function cloud(ctx, x, y, s, a = '#b8f07a', b = '#3a7a2a') {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-14, 8);
      c.arc(-9, 2, 6, Math.PI * 0.6, Math.PI * 1.6);
      c.arc(-1, -4, 8, Math.PI * 1.1, Math.PI * 1.95);
      c.arc(9, 1, 7, Math.PI * 1.4, Math.PI * 0.45);
      c.lineTo(-14, 8);
    }, lin(ctx, 0, -12, 0, 9, [[0, a], [1, b]]), INK, 2);
  });
}

function eye(ctx, x, y, s, iris = '#ffc040') {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-15, 0);
      c.quadraticCurveTo(0, -12, 15, 0);
      c.quadraticCurveTo(0, 12, -15, 0);
    }, '#f4efe2', INK, 2);
    shape(ctx, (c) => c.arc(0, 0, 6, 0, Math.PI * 2), rad(ctx, 0, 0, 6, [[0, '#fff0a0'], [1, iris]]), INK, 1.4);
    shape(ctx, (c) => c.ellipse(0, 0, 1.6, 4.6, 0, 0, Math.PI * 2), INK, null);
    shape(ctx, (c) => c.arc(-2, -2, 1.3, 0, Math.PI * 2), '#ffffff', null);
  });
}

function crosshair(ctx, x, y, r, col = '#ff4a3a') {
  arc(ctx, x, y, r, 0, Math.PI * 2, INK, 4.2);
  arc(ctx, x, y, r, 0, Math.PI * 2, col, 2.2);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    stroke(ctx, [[x + dx * r * 0.45, y + dy * r * 0.45], [x + dx * r * 1.35, y + dy * r * 1.35]], INK, 4);
    stroke(ctx, [[x + dx * r * 0.45, y + dy * r * 0.45], [x + dx * r * 1.35, y + dy * r * 1.35]], col, 2);
  }
  shape(ctx, (c) => c.arc(x, y, 1.8, 0, Math.PI * 2), col, null);
}

function heart(ctx, x, y, s, top = '#ff8a8a', bottom = '#b01a2a') {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(0, 12);
      c.bezierCurveTo(-16, 2, -12, -12, 0, -5);
      c.bezierCurveTo(12, -12, 16, 2, 0, 12);
    }, lin(ctx, 0, -12, 0, 12, [[0, top], [1, bottom]]), INK, 2);
    shape(ctx, (c) => c.ellipse(-5, -4, 2.4, 3.2, -0.6, 0, Math.PI * 2), 'rgba(255,255,255,0.55)', null);
  });
}

function cross(ctx, x, y, s, fill = lin(ctx, 0, -16, 0, 16, GOLD)) {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-3, -16);
      c.lineTo(3, -16);
      c.lineTo(3, -7);
      c.lineTo(11, -7);
      c.lineTo(11, -1);
      c.lineTo(3, -1);
      c.lineTo(3, 16);
      c.lineTo(-3, 16);
      c.lineTo(-3, -1);
      c.lineTo(-11, -1);
      c.lineTo(-11, -7);
      c.lineTo(-3, -7);
    }, fill, INK, 1.8);
  });
}

function rays(ctx, x, y, r0, r1, n, color, w = 2.4, off = 0) {
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    stroke(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], color, w);
  }
}

function waves(ctx, x, y, r0, n, color, spread = 0.9, dir = 0) {
  for (let i = 0; i < n; i++) {
    arc(ctx, x, y, r0 + i * 5, dir - spread, dir + spread, INK, 3.6);
    arc(ctx, x, y, r0 + i * 5, dir - spread, dir + spread, color, 1.8);
  }
}

function cracks(ctx, x, y, color = '#ffb040') {
  const legs = [[[0, 0], [-6, -3], [-11, -1], [-17, -5]], [[0, 0], [5, -4], [9, -2], [16, -6]], [[0, 0], [-3, 5], [-8, 8]], [[0, 0], [4, 5], [10, 7]]];
  for (const l of legs) {
    const pts = l.map(([px, py]) => [x + px, y + py]);
    stroke(ctx, pts, INK, 4);
    stroke(ctx, pts, color, 1.8);
  }
}

function whirl(ctx, x, y, r, color, hot = '#ffffff') {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    arc(ctx, x, y, r, a, a + 1.5, INK, 5);
    arc(ctx, x, y, r, a, a + 1.5, color, 3);
    arc(ctx, x, y, r, a + 0.9, a + 1.5, hot, 1.4);
    arc(ctx, x, y, r * 0.62, a + 0.6, a + 1.8, color, 1.8);
  }
}

function tower(ctx, x, y, s = 1) {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-10, 16);
      c.lineTo(-10, -10);
      c.lineTo(-12, -10);
      c.lineTo(-12, -16);
      c.lineTo(-7, -16);
      c.lineTo(-7, -13);
      c.lineTo(-2, -13);
      c.lineTo(-2, -16);
      c.lineTo(2, -16);
      c.lineTo(2, -13);
      c.lineTo(7, -13);
      c.lineTo(7, -16);
      c.lineTo(12, -16);
      c.lineTo(12, -10);
      c.lineTo(10, -10);
      c.lineTo(10, 16);
    }, lin(ctx, -10, 0, 10, 0, [[0, '#d8dce4'], [0.5, '#9aa2ae'], [1, '#5a626e']]), INK, 2);
    for (let yy = -6; yy < 16; yy += 5) stroke(ctx, [[-10, yy], [10, yy]], 'rgba(18,10,14,0.45)', 1);
    shape(ctx, (c) => {
      c.moveTo(-4, 16);
      c.lineTo(-4, 8);
      c.arc(0, 8, 4, Math.PI, 0);
      c.lineTo(4, 16);
    }, '#2a1e14', null);
  });
}

function vial(ctx, x, y, s, liquid = ['#c8ff8a', '#3a9a2a']) {
  withXf(ctx, x, y, 0, s, () => {
    shape(ctx, (c) => {
      c.moveTo(-3, -14);
      c.lineTo(3, -14);
      c.lineTo(3, -6);
      c.arc(0, 4, 10, -Math.PI * 0.35, Math.PI * 1.35);
      c.lineTo(-3, -6);
    }, 'rgba(220,240,255,0.35)', INK, 2);
    shape(ctx, (c) => {
      c.moveTo(-9, 2);
      c.lineTo(9, 2);
      c.arc(0, 4, 9, 0.2, Math.PI - 0.2);
    }, lin(ctx, 0, 2, 0, 13, [[0, liquid[0]], [1, liquid[1]]]), null);
    shape(ctx, (c) => c.rect(-4, -17, 8, 4), '#8a5a32', INK, 1.4);
    shape(ctx, (c) => c.ellipse(-4, 6, 1.6, 3, 0.3, 0, Math.PI * 2), 'rgba(255,255,255,0.6)', null);
  });
}

function wing(ctx, x, y, s, flip = 1) {
  withXf(ctx, x, y, 0, s, () => {
    ctx.scale(flip, 1);
    for (let i = 0; i < 4; i++) {
      shape(ctx, (c) => {
        c.moveTo(0, -4 + i * 3);
        c.quadraticCurveTo(10 + i * 2, -14 + i * 5, 18 - i * 2, -10 + i * 7);
        c.quadraticCurveTo(10, -2 + i * 4, 0, 2 + i * 3);
      }, lin(ctx, 0, -10, 18, 10, [[0, '#ffffff'], [1, '#e8d08a']]), INK, 1.2);
    }
  });
}

function rock(ctx, x, y, r) {
  shape(ctx, (c) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr = r * (0.8 + ((i * 37) % 5) * 0.06);
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
  }, rad(ctx, x - r * 0.3, y - r * 0.3, r * 1.6, [[0, '#8a6a5a'], [1, '#2a1a16']]), INK, 2);
  // Glowing seams across the rock, sized to it.
  withXf(ctx, x, y, 0, r / 20, () => cracks(ctx, 0, 0, '#ffb040'));
}

function sparks(ctx, pts, color) {
  for (const [x, y, r] of pts) star(ctx, x, y, r, color);
}

/* ------------------------------- backdrops -------------------------------- */

const BG = {
  tank: ['#3e6a9a', '#0d1724'],
  fury: ['#a32424', '#1c0708'],
  barbarian: ['#9a6a2a', '#1e1208'],
  companion: ['#7a6a3a', '#141208'],
  poison: ['#4a8a2e', '#0a1606'],
  sniper: ['#8a7a4a', '#14110a'],
  fire: ['#c8501a', '#200a04'],
  ice: ['#3a8ac0', '#06121e'],
  lightning: ['#4a5ac8', '#080a1e'],
  holy: ['#c8a040', '#1c1406'],
  juggernaut: ['#b07a2a', '#1e0e06'],
  defender: ['#3a6aa8', '#0a1222'],
};

function backdrop(ctx, [mid, edge]) {
  ctx.fillStyle = rad(ctx, C, C - 4, 34, [[0, mid], [1, edge]]);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(1, 1, 46, 46, 6) : ctx.rect(1, 1, 46, 46);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,240,200,0.22)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(3.5, 3.5, 41, 41);
}

/* ------------------------------ compositions ------------------------------ */

const HOLY = '#fff0b0';
const crossEmblem = (ctx) => () => cross(ctx, 0, -1, 0.42);

const ICONS = {
  /* warrior · tank */
  fortify: (x) => {
    shield(x, C, C + 1, 1.05);
    for (const yy of [16, 22]) stroke(x, [[C - 6, yy + 4], [C, yy], [C + 6, yy + 4]], '#ffffff', 2.4);
  },
  shieldbash: (x) => {
    for (const [a, l] of [[-0.5, 12], [0, 15], [0.5, 12]]) stroke(x, [[C + 10, C], [C + 10 + Math.cos(a) * l, C + Math.sin(a) * l]], '#bfe6ff', 2.2);
    glow(x, C + 14, C, 12, '#9fd8ff', 0.7);
    shield(x, C - 4, C + 1, 1.0);
  },
  bulwark: (x) => {
    arc(x, C, C + 8, 19, Math.PI * 1.05, Math.PI * 1.95, 'rgba(159,216,255,0.85)', 3);
    glow(x, C, C, 18, '#7fc8ff', 0.5);
    shield(x, C, C + 3, 1.0, ['#9fd0ff', '#2a5a9a']);
  },
  brace: (x) => {
    shield(x, C - 5, C + 1, 0.85, ['#6f9ac8', '#22406a']);
    shield(x, C + 6, C + 3, 0.85);
    stroke(x, [[8, 41], [40, 41]], '#c8a870', 2.5);
  },
  ironcitadel: (x) => {
    glow(x, C, C - 4, 22, '#ffd98a', 0.75);
    tower(x, C, C + 3, 1.05);
    sparks(x, [[11, 12, 3], [37, 14, 2.5]], '#fff0c0');
  },

  /* warrior · fury */
  bloodlust: (x) => {
    drop(x, C, C + 2, 1.05, '#ff6a5a', '#7a0a12');
    for (const dx of [-8, -2, 4]) stroke(x, [[C + dx + 10, 9], [C + dx, 22]], '#ffd0c0', 1.6);
  },
  whirlwind: (x) => {
    whirl(x, C, C, 17, '#ffb347', '#fff0b0');
    sword(x, C, C, 0.6, 0.62);
  },
  execute: (x) => {
    glow(x, C, C + 12, 14, '#ff3a2a', 0.8);
    cracks(x, C, C + 15, '#ff5a3a');
    sword(x, C, C - 1, Math.PI, 0.95);
  },
  rampage: (x) => {
    sword(x, C, C, 0.75, 0.82);
    sword(x, C, C, -0.75, 0.82);
    drop(x, 12, 36, 0.32, '#ff6a5a', '#7a0a12');
    drop(x, 36, 37, 0.28, '#ff6a5a', '#7a0a12');
  },
  bloodstorm: (x) => {
    glow(x, C, C, 20, '#ff2a2a', 0.6);
    whirl(x, C, C, 17, '#ff3a3a', '#ffd0a0');
    drop(x, C, C + 1, 0.52, '#ff6a5a', '#7a0a12');
  },

  /* warrior · barbarian */
  savage: (x) => {
    axe(x, C - 2, C + 1, 0.35, 1.0);
    for (const dx of [0, 5, 10]) stroke(x, [[C + dx + 2, 32], [C + dx + 9, 40]], '#ff6a4a', 1.8);
  },
  leap: (x) => {
    ctx2(x, () => {
      x.setLineDash([3, 3]);
      arc(x, C, C + 14, 15, Math.PI * 1.1, Math.PI * 1.9, '#ffe0a0', 2);
      x.setLineDash([]);
    });
    cracks(x, C + 12, C + 16, '#ffb040');
    axe(x, C + 10, C - 2, 0.9, 0.62);
  },
  warcry: (x) => {
    waves(x, C - 4, C, 9, 3, '#ffd27a', 0.8, 0);
    waves(x, C + 4, C, 9, 3, '#ffd27a', 0.8, Math.PI);
    shape(x, (c) => {
      c.arc(C, C, 8, 0, Math.PI * 2);
    }, rad(x, C, C, 8, [[0, '#3a0a0a'], [1, '#c83a2a']]), INK, 2);
    for (const tx of [-4, 0, 4]) shape(x, (c) => { c.moveTo(C + tx - 1.5, C - 6); c.lineTo(C + tx + 1.5, C - 6); c.lineTo(C + tx, C - 2); }, '#f4efe2', null);
  },
  thickhide: (x) => {
    shield(x, C, C + 1, 1.05, ['#a8805a', '#4a2e18'], [[0, '#d8c8a8'], [1, '#6a5a40']], () => {
      for (let i = -8; i <= 8; i += 4) stroke(x, [[i, -8], [i + 2, 6]], 'rgba(40,24,12,0.6)', 1.4);
    });
  },
  earthquake: (x) => {
    glow(x, C, C + 8, 18, '#ffb040', 0.7);
    cracks(x, C, C + 8, '#ffc060');
    rock(x, 13, 16, 5);
    rock(x, 35, 13, 4);
    rock(x, C, 9, 3.5);
  },

  /* ranger · companion */
  bond: (x) => {
    heart(x, C, C - 2, 0.95, '#ffb08a', '#b04a2a');
    paw(x, C + 1, C + 9, 0.62);
  },
  callwolf: (x) => {
    glow(x, C, C, 16, '#ffd27a', 0.5);
    wolf(x, C - 2, C + 1, 1.05);
  },
  packtactics: (x) => {
    paw(x, 14, 17, 0.62);
    paw(x, 34, 17, 0.62);
    paw(x, C, 33, 0.72);
  },
  alpha: (x) => {
    wolf(x, C - 2, C + 4, 0.95);
    shape(x, (c) => {
      c.moveTo(C - 8, 13);
      c.lineTo(C - 8, 6);
      c.lineTo(C - 4, 10);
      c.lineTo(C, 4);
      c.lineTo(C + 4, 10);
      c.lineTo(C + 8, 6);
      c.lineTo(C + 8, 13);
    }, lin(x, 0, 4, 0, 13, GOLD), INK, 1.6);
  },
  howl: (x) => {
    shape(x, (c) => c.arc(36, 11, 6, 0, Math.PI * 2), '#fff6d0', INK, 1.4);
    waves(x, C + 2, C - 2, 12, 2, '#ffe0a0', 0.5, -0.9);
    wolf(x, C - 4, C + 6, 0.9, true);
  },

  /* ranger · poison */
  venom: (x) => {
    drop(x, C, C + 1, 1.05, '#c8ff8a', '#2a6a1a');
    skull(x, C, C + 5, 0.42, '#d8f0c0');
  },
  poisonvolley: (x) => {
    for (const a of [-0.35, 0, 0.35]) {
      const ex = C + Math.sin(a) * 18;
      const ey = C - Math.cos(a) * 18;
      arrow(x, C - Math.sin(a) * 15, C + Math.cos(a) * 15, ex, ey, '#8fe35a', '#3a7a2a', 0.85);
    }
    glow(x, C, 8, 10, '#8fe35a', 0.6);
  },
  toxiccloud: (x) => {
    cloud(x, C, C + 2, 1.05);
    skull(x, C, C + 3, 0.38, '#e8ffd0');
    sparks(x, [[12, 38, 2], [36, 38, 2.4], [C, 41, 1.8]], '#c8ff8a');
  },
  concentrated: (x) => {
    glow(x, C, C + 4, 14, '#8fe35a', 0.5);
    vial(x, C, C + 3, 1.05);
  },
  plaguearrow: (x) => {
    cloud(x, 30, 16, 0.6, '#c8a0f0', '#5a2a8a');
    arrow(x, 9, 39, 36, 12, '#b07ae0', '#5a2a8a', 1.05);
  },

  /* ranger · sniper */
  deadeye: (x) => {
    eye(x, C, C, 1.05);
    crosshair(x, C, C, 5, '#ff4a3a');
  },
  aimedshot: (x) => {
    for (const yy of [16, 32]) stroke(x, [[6, yy], [20, yy]], 'rgba(255,240,200,0.5)', 1.4);
    arrow(x, 6, C, 42, C, '#ffffff', '#d8402e', 1.1);
  },
  markedprey: (x) => {
    glow(x, C, C, 16, '#ff3a2a', 0.5);
    crosshair(x, C, C, 11, '#ff4a3a');
  },
  killshot: (x) => {
    skull(x, C, C + 2, 0.95);
    crosshair(x, C, C + 1, 13, '#ff4a3a');
  },
  snipe: (x) => {
    bow(x, 14, C, 1.0);
    arrow(x, 12, C, 43, C, '#ffffff', '#d8402e', 1.0);
    glow(x, 43, C, 8, '#fff2c0', 0.9);
    star(x, 43, C, 5, '#ffffff');
  },

  /* mage · fire */
  kindle: (x) => {
    glow(x, C, C + 2, 14, '#ff8a1e', 0.6);
    flame(x, C, C + 4, 0.72);
    sparks(x, [[13, 14, 2], [35, 12, 2.4], [32, 36, 1.6]], '#ffd27a');
  },
  fireball: (x) => {
    for (const k of [0, 1, 2]) stroke(x, [[8 + k * 3, 38 - k * 5], [18 + k * 2, 30 - k * 5]], 'rgba(255,160,60,0.7)', 3 - k * 0.6);
    glow(x, 30, 18, 16, '#ff8a1e', 0.9);
    shape(x, (c) => c.arc(30, 18, 9, 0, Math.PI * 2), rad(x, 27, 15, 11, [[0, '#ffffff'], [0.35, '#ffe070'], [0.8, '#ff6a1a'], [1, '#a81a10']]), INK, 2);
  },
  flamewave: (x) => {
    for (const [fx, s] of [[10, 0.5], [19, 0.66], [29, 0.66], [38, 0.5]]) flame(x, fx, 31, s);
    stroke(x, [[4, 40], [44, 40]], '#ff8a1e', 2);
  },
  immolate: (x) => {
    arc(x, C, C + 2, 14, 0, Math.PI * 2, 'rgba(255,120,40,0.7)', 3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      flame(x, C + Math.cos(a) * 14, C + 2 + Math.sin(a) * 14, 0.32);
    }
    flame(x, C, C + 3, 0.6, true);
  },
  meteor: (x) => {
    for (let k = 0; k < 4; k++) stroke(x, [[38 - k * 2, 6 + k * 2], [22 - k, 24 + k]], k % 2 ? 'rgba(255,200,80,0.8)' : 'rgba(255,90,30,0.85)', 5 - k);
    glow(x, 18, 30, 14, '#ff6a1a', 0.9);
    rock(x, 17, 31, 9);
  },

  /* mage · ice */
  hoarfrost: (x) => {
    glow(x, C, C, 16, '#9fe0ff', 0.5);
    snowflake(x, C, C, 15);
  },
  frostbolt: (x) => {
    for (const k of [0, 1]) stroke(x, [[6 + k * 4, 40 - k * 2], [18 + k * 2, 30 - k * 2]], 'rgba(200,240,255,0.7)', 2.5);
    glow(x, 30, 18, 12, '#9fe0ff', 0.8);
    shard(x, 30, 18, 6, 13, Math.PI * 0.25);
  },
  icenova: (x) => {
    glow(x, C, C, 20, '#bfeaff', 0.6);
    arc(x, C, C, 19, 0, Math.PI * 2, 'rgba(191,234,255,0.8)', 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      shard(x, C + Math.cos(a) * 13, C + Math.sin(a) * 13, 3, 6, a + Math.PI / 2);
    }
    snowflake(x, C, C, 8);
  },
  deepfreeze: (x) => {
    shape(x, (c) => c.rect(11, 11, 26, 26), lin(x, 11, 11, 37, 37, [[0, '#ffffff'], [0.4, '#a8e4ff'], [1, '#2f6aa8']]), INK, 2);
    stroke(x, [[13, 14], [22, 13]], 'rgba(255,255,255,0.8)', 1.6);
    snowflake(x, C, C, 7, '#ffffff');
  },
  glacier: (x) => {
    stroke(x, [[4, 40], [44, 40]], '#9fe0ff', 2);
    for (const [sx, h, w] of [[11, 9, 4], [20, 13, 5], [30, 16, 6], [39, 11, 4]]) shard(x, sx, 40 - h, w, h, 0);
  },

  /* mage · lightning */
  static: (x) => {
    shape(x, (c) => c.arc(C, C, 8, 0, Math.PI * 2), rad(x, C - 2, C - 2, 10, [[0, '#ffffff'], [0.5, '#8fe8ff'], [1, '#2a4ab0']]), INK, 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      bolt(x, [[C + Math.cos(a) * 10, C + Math.sin(a) * 10], [C + Math.cos(a + 0.3) * 15, C + Math.sin(a + 0.3) * 15], [C + Math.cos(a) * 19, C + Math.sin(a) * 19]]);
    }
  },
  spark: (x) => {
    glow(x, C, C, 16, '#4ad0ff', 0.6);
    bolt(x, [[30, 6], [20, 22], [28, 24], [16, 42]]);
  },
  chainlightning: (x) => {
    const nodes = [[9, 34], [C, 13], [39, 30]];
    bolt(x, [nodes[0], [14, 24], [18, 20], nodes[1], [30, 18], [33, 25], nodes[2]]);
    for (const [nx, ny] of nodes) {
      glow(x, nx, ny, 7, '#8fe8ff', 0.9);
      shape(x, (c) => c.arc(nx, ny, 3, 0, Math.PI * 2), '#ffffff', INK, 1.2);
    }
  },
  overcharge: (x) => {
    glow(x, C, C, 20, '#6a7aff', 0.8);
    shape(x, (c) => c.arc(C, C, 10, 0, Math.PI * 2), rad(x, C - 3, C - 3, 12, [[0, '#ffffff'], [0.45, '#b0c0ff'], [1, '#3a2ab0']]), INK, 2);
    bolt(x, [[C - 3, C - 7], [C + 2, C - 1], [C - 2, C + 1], [C + 3, C + 7]], '#d8e0ff');
  },
  thunderclap: (x) => {
    cloud(x, C, 14, 0.95, '#c8d0e8', '#4a5070');
    bolt(x, [[C, 18], [C - 5, 28], [C + 2, 29], [C - 3, 40]]);
    arc(x, C, 41, 14, Math.PI * 1.05, Math.PI * 1.95, '#8fe8ff', 2);
  },

  /* paladin · holy */
  devotion: (x) => {
    glow(x, C, C, 20, '#ffe08a', 0.6);
    rays(x, C, C, 12, 20, 8, 'rgba(255,240,176,0.8)', 2, Math.PI / 8);
    cross(x, C, C, 0.95);
  },
  layhands: (x) => {
    glow(x, C, C, 18, '#ffe08a', 0.7);
    heart(x, C, C + 2, 0.95, '#fff0b0', '#d89a2a');
    stroke(x, [[C, C - 4], [C, C + 6]], '#ffffff', 2.6);
    stroke(x, [[C - 5, C + 1], [C + 5, C + 1]], '#ffffff', 2.6);
  },
  smite: (x) => {
    glow(x, C, C + 10, 14, '#fff2c0', 0.8);
    rays(x, C, C + 14, 4, 12, 7, HOLY, 2, Math.PI);
    hammer(x, C, C - 2, 0.4, 0.95, GOLD);
  },
  beacon: (x) => {
    glow(x, C, C, 22, '#fff0b0', 0.9);
    rays(x, C, C, 7, 20, 12, HOLY, 2.2);
    shape(x, (c) => c.arc(C, C, 6.5, 0, Math.PI * 2), rad(x, C, C, 7, [[0, '#ffffff'], [1, '#ffd060']]), INK, 1.6);
  },
  consecration: (x) => {
    shape(x, (c) => c.ellipse(C, C + 8, 19, 8, 0, 0, Math.PI * 2), rad(x, C, C + 8, 19, [[0, 'rgba(255,240,176,0.9)'], [1, 'rgba(200,150,40,0.4)']]), INK, 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      star(x, C + Math.cos(a) * 13, C + 8 + Math.sin(a) * 5, 2, '#ffffff');
    }
    sword(x, C, C - 4, Math.PI, 0.72, GOLD);
  },

  /* paladin · juggernaut */
  zeal: (x) => {
    flame(x, C, C - 4, 0.62, true);
    sword(x, C, C + 2, 0, 0.9, GOLD);
  },
  crusader: (x) => {
    arc(x, C + 4, C + 6, 16, Math.PI * 1.1, Math.PI * 1.75, 'rgba(255,220,140,0.85)', 4);
    hammer(x, C - 2, C + 1, -0.5, 1.0, GOLD);
  },
  judgment: (x) => {
    glow(x, C, C - 2, 18, '#fff2c0', 0.8);
    rays(x, C, 8, 2, 9, 5, HOLY, 1.6, Math.PI * 0.1);
    sword(x, C, C + 3, Math.PI, 1.05, [[0, '#ffffff'], [0.5, '#fff2c0'], [1, '#e8b84a']]);
  },
  reckoning: (x) => {
    cracks(x, C, C + 14, '#ffd27a');
    hammer(x, C, C - 1, Math.PI * 0.08, 0.95, GOLD);
    sparks(x, [[11, 34, 2.4], [37, 33, 2.6]], '#fff2c0');
  },
  divinestorm: (x) => {
    glow(x, C, C, 20, '#ffe08a', 0.6);
    whirl(x, C, C, 17, '#ffd27a', '#ffffff');
    hammer(x, C, C + 2, 0.3, 0.6, GOLD);
  },

  /* paladin · defender */
  aegis: (x) => shield(x, C, C + 1, 1.05, ['#8ab8ff', '#1e3a6e'], GOLD, crossEmblem(x)),
  faithshield: (x) => {
    glow(x, C, C, 20, '#fff0b0', 0.7);
    arc(x, C, 8, 9, Math.PI, Math.PI * 2, '#fff2c0', 2.4);
    shield(x, C, C + 3, 0.95, ['#9fd8ff', '#2a5a9a'], GOLD, crossEmblem(x));
  },
  avengershield: (x) => {
    for (const r of [17, 13]) arc(x, C, C, r, Math.PI * 0.15, Math.PI * 0.85, 'rgba(255,224,138,0.75)', 2.2);
    withXf(x, C, C - 1, -0.35, 1, () => shield(x, 0, 0, 0.9, ['#8ab8ff', '#1e3a6e'], GOLD, crossEmblem(x)));
  },
  sanctuary: (x) => {
    arc(x, C, C + 12, 18, Math.PI, Math.PI * 2, 'rgba(255,240,176,0.9)', 3);
    glow(x, C, C + 4, 18, '#fff0b0', 0.55);
    cross(x, C, C + 5, 0.7);
    stroke(x, [[5, 41], [43, 41]], '#e8d08a', 2);
  },
  divineprotection: (x) => {
    glow(x, C, C, 20, '#fff6c4', 0.7);
    wing(x, C - 3, C - 1, 0.95, -1);
    wing(x, C + 3, C - 1, 0.95, 1);
    shield(x, C, C + 3, 0.72, ['#9fd8ff', '#2a5a9a'], GOLD, crossEmblem(x));
  },
};

function ctx2(ctx, fn) {
  ctx.save();
  fn();
  ctx.restore();
}

/** Paint a skill's icon. Returns false when the skill has no painted art. */
export function paintSkillArt(canvas, skill) {
  const draw = skill && ICONS[skill.id];
  if (!draw) return false;
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  canvas.style.imageRendering = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.imageSmoothingEnabled = true;
  backdrop(ctx, BG[skill.pathId] || ['#5a5a6a', '#0c0c12']);
  draw(ctx);
  // A soft inner vignette so every icon sits in the same frame.
  ctx.fillStyle = rad(ctx, C, C, 34, [[0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
  return true;
}

export const ICON_IDS = Object.keys(ICONS);
