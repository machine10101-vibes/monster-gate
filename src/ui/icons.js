const PAL = {
  k: '#15120f', w: '#ffffff', l: '#e4e8ef', g: '#a4a9b4', G: '#646973', d: '#3a3e48',
  b: '#9a6334', B: '#5f3b1e', y: '#f4c542', Y: '#b88a1e', r: '#ff4d6a', R: '#b8203a',
  o: '#ff8f1f', O: '#c9570a', e: '#52d06a', E: '#2a8f48', c: '#6fd6ff', C: '#2f8fc0',
  p: '#c27bff', P: '#7a45c8', s: '#9aa0a8', S: '#6c727c', t: '#f2dfb0', h: '#ffe9a0',
  v: '#8a7ad0', V: '#4b3f8c', m: '#b25cff', n: '#2b2450', q: '#f0c8ff',
  i: '#dff4ff', I: '#8fd0ff', j: '#4f8fc8', J: '#2d5a8c', u: '#f6fbff', f: '#b4d0e6', F: '#7fa6c8',
  U: '#f08a22', a: '#c9b27a', A: '#7d8438', x: '#555c26', X: '#efe4c8', z: '#2c3a66', Z: '#1b2444',
  D: '#4cf08a', K: '#a82424', M: '#6a1616', Q: '#8c6c52', W: '#5a3d28', N: '#d2a22c', H: '#ffd95a', L: '#c6ccd6', T: '#8d939c',
};

function make(rows) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  const grid = Array.from({ length: 16 }, () => Array(16).fill(null));
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch && ch !== '.') grid[y][x] = PAL[ch];
    }
  });
  const colored = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && grid[y][x];
  const out = grid.map((r) => r.slice());
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (!grid[y][x] && (colored(x - 1, y) || colored(x + 1, y) || colored(x, y - 1) || colored(x, y + 1))) out[y][x] = PAL.k;
    }
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (out[y][x]) {
        ctx.fillStyle = out[y][x];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  return c;
}

const ART = {
  blade: [
    '................',
    '..............ll',
    '.............lgl',
    '............lggd',
    '...........lggd.',
    '..........lggd..',
    '.........lggd...',
    '........lggd....',
    '..y.....ggd.....',
    '..yy...lgd......',
    '...yyylgd.......',
    '....yyyd........',
    '...bbyy.........',
    '..bbb.yy........',
    '.yb.............',
    '.y..............',
  ],
  axe: [
    '................',
    '.........lll....',
    '........lgggl...',
    '.......lggggg...',
    '......bglggggd..',
    '.....bbglgggd...',
    '....bb.gggdd....',
    '...bb...ddd.....',
    '..bb............',
    '.bb.............',
    '.bb.............',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  pick: [
    '................',
    '..sssllllss.....',
    '.slgggggggls....',
    'sg.....bbggls...',
    's.....bb..sgs...',
    '.....bb....ss...',
    '....bb..........',
    '...bb...........',
    '..bb............',
    '.bb.............',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  hammer: [
    '................',
    '....sssssss.....',
    '....slllllgS....',
    '....slgggggS....',
    '....sggggddS....',
    '.....SSSSSS.....',
    '......bb........',
    '.....bb.........',
    '....bb..........',
    '...bb...........',
    '..bb............',
    '.bb.............',
    '................',
    '................',
    '................',
    '................',
  ],
  bow: [
    '................',
    '.......bb.......',
    '.......bbb......',
    '......b..bt.....',
    '.....b....bt....',
    '.....b.....bt...',
    '.....b.....bt...',
    '.....b.....t....',
    '.....b.....bt...',
    '.....b....bt....',
    '......b..bt.....',
    '.......bbb......',
    '.......bb.......',
    '................',
    '................',
    '................',
  ],
  stone: [
    '................',
    '................',
    '..sssssssssss...',
    '.slllllllllgsS..',
    '.slggggggggggS..',
    '.slgdgggggdggS..',
    '.sgggggggggggS..',
    '.sggggdgggggdS..',
    '.sgdgggggggggS..',
    '.sgggggggdgggS..',
    '.sggggggggggdS..',
    '..SSSSSSSSSSS...',
    '................',
    '................',
    '................',
    '................',
  ],
  potion: [
    '................',
    '.......bb.......',
    '.......bb.......',
    '......lggl......',
    '.......gg.......',
    '......rrrr......',
    '.....rrwrrr.....',
    '....rrwrrrrR....',
    '....rrrrrrrR....',
    '....rrrrrrRR....',
    '.....rrrrRR.....',
    '......RRRR......',
    '................',
    '................',
    '................',
    '................',
  ],
  manapotion: [
    '................',
    '.......bb.......',
    '.......bb.......',
    '......lggl......',
    '.......gg.......',
    '......cccc......',
    '.....ccwccc.....',
    '....ccwccccC....',
    '....cccccccC....',
    '....ccccccCC....',
    '.....ccccCC.....',
    '......CCCC......',
    '................',
    '................',
    '................',
    '................',
  ],
  torch: [
    '................',
    '.......y........',
    '......yoy.......',
    '.....yohoy......',
    '.....yoooy......',
    '......ooo.......',
    '......ddd.......',
    '......bBb.......',
    '......bBb.......',
    '......bBb.......',
    '......bBb.......',
    '......bBb.......',
    '......bBb.......',
    '................',
    '................',
    '................',
  ],
  empty: Array(16).fill('................'),

  map: [
    '................',
    '..tttttttttttt..',
    '.tGtGGtggtgeett.',
    '.tGGtgggtgeeett.',
    '.tgGggtgggeeett.',
    '.ttgggggtgeeett.',
    '.tgggcctggeeett.',
    '.tggccccggeeett.',
    '.tgggcctgggeett.',
    '.ttgggggggggett.',
    '.tggggtggggett..',
    '..tttttttttttt..',
    '................',
    '................',
    '................',
    '................',
  ],
  rot: [
    '................',
    '....gggggg......',
    '...gl....lg.....',
    '..gl......lg....',
    '..g........g..w.',
    '..g.......wwww..',
    '..gl.......ww...',
    '...gl...........',
    '....gl......lg..',
    '.....gl....lg...',
    '......ggllgg....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  dots: [
    '................',
    '................',
    '................',
    '...ll.ll.ll.....',
    '...ll.ll.ll.....',
    '................',
    '...ll.ll.ll.....',
    '...ll.ll.ll.....',
    '................',
    '...ll.ll.ll.....',
    '...ll.ll.ll.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  gear: [
    '................',
    '......ll........',
    '....lllllll.....',
    '...llgggggll....',
    '..lggg..gggl....',
    '..lggg..gggl....',
    '..lggg..gggl....',
    '..llgggggggl....',
    '...lllgggll.....',
    '....ll.GG.ll....',
    '....l..GG..l....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  bag: [
    '................',
    '......bbbb......',
    '.....bB..Bb.....',
    '....bbbbbbbb....',
    '...bbbbbbbbbb...',
    '..bbbbbyybbbbb..',
    '..bbbbbyybbbbb..',
    '..bbbbbbbbbbbb..',
    '..bbbbbbbbbbbb..',
    '..BBbbbbbbbbBB..',
    '...BBBBBBBBBB...',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  quest: [
    '................',
    '..ttttttttt.....',
    '.tt.......tt....',
    '.t.bbbbbb..t....',
    '.t.........t....',
    '.t.bbbbbbb.t....',
    '.t.........t....',
    '.t.bbbbb...t....',
    '.t.........t....',
    '.tt.......tt....',
    '..tttttttt......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  friends: [
    '................',
    '....ll..........',
    '...lttl.........',
    '...lttl....ll...',
    '...lbbl...lttl..',
    '....bb....lttl..',
    '...bbbb...lbbl..',
    '..bbbbbb...bb...',
    '..bbbbbb..bbbb..',
    '..b....b.bbbbbb.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  cog: [
    '................',
    '.......ll.......',
    '...l..llll..l...',
    '..lllllllllll...',
    '...llggggggll...',
    '..llgg....ggll..',
    '.llggg....gggll.',
    '..llgg....ggll..',
    '...llggggggll...',
    '..lllllllllll...',
    '...l..llll..l...',
    '.......ll.......',
    '................',
    '................',
    '................',
    '................',
  ],
  sun: [
    '................',
    '.......y........',
    '..y....y....y...',
    '...y..yyy..y....',
    '....yyyyyyy.....',
    '.yy.yyhyyyy.yy..',
    '....yyyyyyy.....',
    '...y..yyy..y....',
    '..y....y....y...',
    '.......y........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  moon: [
    '................',
    '.....lll........',
    '....ll..........',
    '...ll...........',
    '...l............',
    '...l............',
    '...ll.......l...',
    '....ll....ll....',
    '.....llllll.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  fs: [
    '................',
    '..ll.......ll...',
    '..l.........l...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..l.........l...',
    '..ll.......ll...',
    '................',
    '................',
    '................',
    '................',
  ],
  snd: [
    '................',
    '.....l..........',
    '....ll....l.....',
    '..llll.....l....',
    '..llll..l..l....',
    '..llll..l..l....',
    '..llll..l..l....',
    '..llll.....l....',
    '....ll....l.....',
    '.....l..........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  shield: [
    '................',
    '...llllllllll...',
    '...lggggggggl...',
    '...lgggyygggl...',
    '...lgggyygggl...',
    '...lgyyyyyygl...',
    '...lgggyygggl...',
    '....lgggyggl....',
    '.....lggggl.....',
    '......lggl......',
    '.......ll.......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  dash: [
    '................',
    '................',
    '.....ll...ll....',
    '......ll...ll...',
    '.......ll...ll..',
    '..llllllll...ll.',
    '..llllllll...ll.',
    '.......ll...ll..',
    '......ll...ll...',
    '.....ll...ll....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  bolt: [
    '................',
    '.....cc.........',
    '...cccwcc.......',
    '..ccwwwwcc......',
    '.cccwwwwwcc.....',
    '..ccwwwwcc......',
    '...cccwcc.......',
    '.....cc.........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  fury: [
    '................',
    '......o.........',
    '.....oo.........',
    '....ooyo........',
    '...ooyyoo.o.....',
    '...ooyyyoo......',
    '..ooyyhyyoo.....',
    '..ooyhhhyoo.....',
    '..ooyyhyyoo.....',
    '...ooyyyoo......',
    '....oooooo......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  tome: [
    '................',
    '................',
    '..kkkkkkkkkk....',
    '..kyyyyyyyyyk...',
    '..kywwwwwwyyk...',
    '..kywwwwwwyyk...',
    '..kywwwwwwyyk...',
    '..kywwwmwwwyk...',
    '..kywwwwwwyyk...',
    '..kywwwwwwyyk...',
    '..kyyyyyyyyyk...',
    '..kkkkkkkkkkk...',
    '....bbbbbbb.....',
    '................',
    '................',
    '................',
  ],
  talk: [
    '................',
    '..wwwwwwwwwwww..',
    '.wwllllllllllww.',
    '.wll.l.l.l.llww.',
    '.wllllllllllllw.',
    '.wwllllllllllww.',
    '..wwwwwwlwwwww..',
    '.......wl.......',
    '........w.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

const recolor = (rows, map) => rows.map((r) => [...r].map((ch) => map[ch] || ch).join(''));

ART.book = [
  '................',
  '..EEEEEEEEEEE...',
  '.EeeeeeeeeeeEk..',
  '.EeyyeeeeeeeEk..',
  '.EeyyyeeeeeeEk..',
  '.EeeyyyeeeeeEk..',
  '.EeeeyeeeeeeEk..',
  '.EeeeeeeeeeeEk..',
  '.EttttttttteEk..',
  '.EtttttttttEEk..',
  '.EttttttttEEk...',
  '..EEEEEEEEE.....',
  '................',
  '................',
  '................',
  '................',
];
ART.budgeblade = recolor(ART.blade, { l: 'h', g: 't', d: 'Y', y: 'e', b: 'E' });
ART.orcblade = recolor(ART.blade, { l: 's', g: 'S', d: 'k', y: 't', b: 'B' });
ART.demonsword = recolor(ART.blade, { l: 'G', g: 'd', d: 'k', y: 'R', b: 'B' });
ART.holyhammer = recolor(ART.hammer, { s: 'y', S: 'Y', l: 'g', g: 'G', d: 'c' });
ART.budgebow = recolor(ART.bow, { b: 't', t: 'h' });
ART.budgemaul = [
  '................',
  '..t.........t...',
  '..tt.eeeee.tt...',
  '...teeEeeEet....',
  '....eEeeEeEe....',
  '....eeEeeEee....',
  '.....EEEEEE.....',
  '......bb........',
  '.....bb..h......',
  '....bb..........',
  '...bb...........',
  '..bb............',
  '.bb.............',
  '................',
  '................',
  '................',
];
ART.darkbow = recolor(ART.bow, { b: 'V', t: 'l', h: 'q' });
ART.darkscythe = [
  '................',
  '....lllll.......',
  '..llgGGGGgl.....',
  '.lgG....GGgl....',
  '.lG.......lgl...',
  '.l.........Vl...',
  '.....m...V.l....',
  '..........Vn....',
  '.........Vn.....',
  '........Vn......',
  '.......Vn.......',
  '......Vn........',
  '.....Vn.........',
  '....vn..........',
  '...nn...........',
  '................',
];
ART.darkstaff = [
  '..l..........l..',
  '..lg........gl..',
  '..lgg..qq..ggl..',
  '...lgqmmmmqgl...',
  '....gmmqqmmg....',
  '....gmmqqmmg....',
  '.....qmmmmq.....',
  '......vVVv......',
  '.......Vn.......',
  '......Vn........',
  '.....Vn.........',
  '....Vn..........',
  '...Vn...........',
  '..vn............',
  '.nn.............',
  '................',
];

ART.dual = [
  '................',
  '...........ll...',
  '..........lgl...',
  '.........lggd...',
  '........lggd....',
  '...ll..lggd.....',
  '..lgl.lggd......',
  '.lggdlggd.......',
  'lggd.ggd........',
  'ggd.lgd.........',
  'gd.lgd..........',
  'd.yy............',
  '..yy............',
  '.bb.............',
  'bb..............',
  '................',
];
ART.crossbow = [
  '................',
  '......ll........',
  '.....l..l.......',
  '....l....l......',
  '...l..bb..l.....',
  '..l...bb...l....',
  '.l....bb....l...',
  'llllllbbllllll..',
  '......bb........',
  '......bb........',
  '......bb........',
  '......yy........',
  '......yy........',
  '................',
  '................',
  '................',
];
ART.wand = [
  '................',
  '.............cc.',
  '............chc.',
  '...........ccc..',
  '..........b.....',
  '.........b......',
  '........b.......',
  '.......b........',
  '......b.........',
  '.....b..........',
  '....b...........',
  '...y............',
  '..y.............',
  '................',
  '................',
  '................',
];
ART.warp = [
  '................',
  '..bbbbbbbbbb....',
  '.bwwwwwwwwwwb...',
  '.bwcccwwcccwb...',
  '.bwccwwwwccwb...',
  '.bwcwwwwwwcwb...',
  '.bwwcccwwwcwb...',
  '.bwwwwcccwcwb...',
  '.bwwwwwwcccwb...',
  '.bbbbbbbbbbbb...',
  '..iiiiiiiiii....',
  '................',
  '................',
  '................',
  '................',
  '................',
];
ART.tome = [
  '................',
  '..bbbbbbbbbb....',
  '.bttttttttttb...',
  '.btbbbbbbbbtb...',
  '.bttttttttttb...',
  '.btbbbbbbbbtb...',
  '.bttttttttttb...',
  '.btbbbbbbbbtb...',
  '.bttttttttttb...',
  '.bbbbbbbbbbbb...',
  '..yyyyyyyyyy....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const cache = {};

function draw(fn) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const p = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y][x] = c;
  };
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) p(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  };
  fn(p, line);
  return g.map((r) => r.join(''));
}

const greatsword = (body, edge, guard, wood) =>
  draw((p, line) => {
    line(5, 10, 14, 1, body);
    line(6, 10, 15, 1, edge);
    line(5, 9, 13, 1, body);
    line(2, 9, 6, 13, guard);
    line(3, 9, 7, 13, guard);
    line(3, 12, 1, 14, wood);
    p(0, 15, guard);
  });

const spear = (body, edge, guard, wood, barb) =>
  draw((p, line) => {
    line(1, 14, 10, 5, wood);
    line(2, 14, 11, 5, wood);
    line(9, 6, 11, 4, guard);
    line(10, 6, 12, 4, guard);
    line(11, 4, 14, 1, body);
    line(12, 4, 15, 1, edge);
    line(11, 3, 13, 1, body);
    if (barb) {
      p(9, 3, barb);
      p(8, 4, barb);
      p(13, 7, barb);
      p(12, 8, barb);
    }
  });

const shortbow = (limb, grip, string, shaft, tip) =>
  draw((p, line) => {
    for (let y = 2; y <= 13; y++) {
      const u = (y - 7.5) / 5.5;
      const x = Math.round(3 + u * u * 4.5);
      p(x, y, Math.abs(y - 7.5) < 1.6 ? grip : limb);
    }
    line(7, 2, 7, 13, string);
    line(3, 8, 14, 8, shaft);
    p(15, 8, tip);
    p(14, 7, tip);
    p(14, 9, tip);
  });

ART.budgegreatsword = greatsword('t', 'h', 'y', 'e');
ART.darkgreatsword = greatsword('g', 'q', 'v', 'V');
ART.darksword = recolor(ART.blade, { l: 'q', g: 'v', d: 'V', y: 'm', b: 'n' });
ART.budgedual = recolor(ART.dual, { l: 'h', g: 't', d: 'Y', y: 'e', b: 'E' });
ART.darkdual = recolor(ART.dual, { l: 'q', g: 'v', d: 'V', y: 'm', b: 'n' });
ART.darkhammer = recolor(ART.budgemaul, { t: 'm', e: 'v', E: 'V', b: 'n', h: 'q' });
ART.budgespear = spear('t', 'h', 'y', 'B', 'h');
ART.darkspear = spear('l', 'q', 'v', 'n', 'm');
ART.budgestaff = recolor(ART.darkstaff, { l: 'h', g: 't', q: 'y', m: 'o', v: 'e', V: 'E', n: 'B' });
ART.budgewand = recolor(ART.wand, { c: 'o', h: 'y', b: 'e', y: 'Y' });
ART.darkwand = recolor(ART.wand, { c: 'm', h: 'q', b: 'V', y: 'v' });
ART.budgeshortbow = shortbow('t', 'e', 'w', 'B', 'h');
ART.darkshortbow = shortbow('v', 'n', 'm', 'V', 'q');
ART.budgecrossbow = recolor(ART.crossbow, { l: 'h', b: 'E', y: 'y' });
ART.darkcrossbow = recolor(ART.crossbow, { l: 'q', b: 'V', y: 'm' });
const LAVA_ICON = { q: 'h', v: 'o', V: 'O', m: 'U', n: 'd', l: 'h', g: 'o', G: 'O', y: 'U', b: 'd', e: 'o', E: 'O', t: 'h' };
ART.volcsword = recolor(ART.darksword, LAVA_ICON);
ART.volcgreatsword = recolor(ART.darkgreatsword, LAVA_ICON);
ART.volcdual = recolor(ART.darkdual, LAVA_ICON);
ART.volchammer = recolor(ART.darkhammer, LAVA_ICON);
ART.volcspear = recolor(ART.darkspear, LAVA_ICON);
ART.volcscythe = recolor(ART.darkscythe, LAVA_ICON);
ART.volcstaff = recolor(ART.darkstaff, LAVA_ICON);
ART.volcwand = recolor(ART.darkwand, LAVA_ICON);
ART.volcshortbow = recolor(ART.darkshortbow, LAVA_ICON);
ART.volcbow = recolor(ART.darkbow, LAVA_ICON);
ART.volccrossbow = recolor(ART.darkcrossbow, LAVA_ICON);
ART.yetisword = recolor(ART.blade, { l: 'u', g: 'i', d: 'j', y: 'I', b: 'F' });
ART.yetigreatsword = greatsword('i', 'u', 'j', 'F');
ART.yetidual = recolor(ART.dual, { l: 'u', g: 'i', d: 'j', y: 'I', b: 'F' });
ART.yetihammer = recolor(ART.budgemaul, { t: 'u', e: 'i', E: 'I', b: 'F', h: 'j' });
ART.yetispear = spear('i', 'u', 'j', 'F', 'I');
ART.yetistaff = recolor(ART.darkstaff, { l: 'i', g: 'I', q: 'u', m: 'i', v: 'f', V: 'F', n: 'j' });
ART.yetiwand = recolor(ART.wand, { c: 'I', h: 'u', b: 'F', y: 'j' });
ART.yetishortbow = shortbow('i', 'F', 'I', 'F', 'u');
ART.yetilongbow = recolor(ART.bow, { b: 'F', t: 'u', h: 'I' });
ART.yeticrossbow = recolor(ART.crossbow, { l: 'i', b: 'F', y: 'I' });
ART.yetiscythe = recolor(ART.darkscythe, { l: 'u', g: 'i', G: 'I', V: 'j', n: 'J', m: 'I', v: 'F' });

const arc = (p, x0, y0, cx, cy, x1, y1, fn, steps = 24) => {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    p(Math.round(x), Math.round(y), fn(i, t));
  }
};

/** Curved blade of tapering width, with a bright edge, a guard bar and a short grip. */
const sabre = (p, line, x0, y0, cx, cy, x1, y1, o) => {
  const { body, edge, back, guard, grip, pommel, band = null, w0 = 3, w1 = 1, wcut = 0 } = o;
  const dl = Math.hypot(cx - x0, cy - y0) || 1;
  const dx = (cx - x0) / dl;
  const dy = (cy - y0) / dl;
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const ax = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const ay = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const al = Math.hypot(ax, ay) || 1;
    const nx = -ay / al;
    const ny = ax / al;
    const w = Math.max(w1, w0 * (1 - t ** 1.4) + w1 * t);
    const n = Math.max(1, Math.round(w));
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1);
      const off = (u - 0.5) * (n - 1) + wcut * t;
      const col = band ? band(i, t, k, n) : k === 0 ? edge : k === n - 1 ? back : body;
      p(Math.round(x + nx * off), Math.round(y + ny * off), col);
    }
  }
  const nx = -dy;
  const ny = dx;
  for (let k = -2; k <= 2; k++) p(Math.round(x0 + nx * k), Math.round(y0 + ny * k), Math.abs(k) === 2 ? pommel : guard);
  for (let k = 1; k <= 3; k++) p(Math.round(x0 - dx * (k + 1)), Math.round(y0 - dy * (k + 1)), grip);
  p(Math.round(x0 - dx * 5), Math.round(y0 - dy * 5), pommel);
};

const restripe = (rows, from, to, fn) => rows.map((r, y) => [...r].map((ch, x) => (ch === from && fn(x, y) ? to : ch)).join(''));

ART.tigerclaws = draw((p, line) => {
  const band = (i, t, k, n) => (i % 8 < 4 ? (k === 0 ? 'X' : 'U') : k === 0 ? 'X' : 'k');
  sabre(p, line, 2, 14, 3, 7, 9, 1, { band, guard: 'k', grip: 'U', pommel: 'k', w0: 4, w1: 1 });
  sabre(p, line, 8, 15, 10, 9, 15, 4, { band, guard: 'k', grip: 'U', pommel: 'k', w0: 4, w1: 1 });
});
ART.tigershortbow = restripe(shortbow('U', 'k', 'X', 'B', 'X'), 'U', 'k', (x, y) => y % 3 === 0);
ART.tigerspear = restripe(spear('X', 'w', 'k', 'U', 'w'), 'U', 'k', (x, y) => (x + y) % 3 === 0);

ART.raptorsaber = draw((p, line) => {
  const band = (i, t, k, n) => (t < 0.22 ? (k === 0 ? 'a' : 'x') : k === 0 ? 'w' : k === n - 1 ? 'a' : 'X');
  sabre(p, line, 3, 13, 9, 12, 14, 1, { band, guard: 'G', grip: 'A', pommel: 'x', w0: 5, w1: 1 });
});
ART.raptorcrossbow = recolor(ART.crossbow, { l: 'X', b: 'A', y: 'a' });
ART.raptorscythe = recolor(ART.darkscythe, { l: 'w', g: 'X', G: 'a', V: 'x', n: 'x', m: 'U', v: 'A' });

ART.piratecutlass = draw((p, line) => {
  sabre(p, line, 4, 12, 9, 11, 14, 1, { body: 'L', edge: 'w', back: 'T', guard: 'H', grip: 'B', pommel: 'y', w0: 3, w1: 1 });
  line(3, 10, 3, 14, 'H');
});
ART.piratedual = draw((p, line) => {
  sabre(p, line, 2, 13, 5, 10, 8, 1, { body: 'L', edge: 'w', back: 'T', guard: 'H', grip: 'B', pommel: 'y', w0: 3, w1: 1 });
  sabre(p, line, 13, 13, 11, 10, 6, 1, { body: 'L', edge: 'T', back: 'w', guard: 'H', grip: 'B', pommel: 'y', w0: 3, w1: 1 });
});
ART.piratecleaver = draw((p, line) => {
  sabre(p, line, 4, 12, 10, 12, 14, 0, { body: 'L', edge: 'w', back: 'T', guard: 'H', grip: 'R', pommel: 'y', w0: 5, w1: 1 });
  line(3, 9, 3, 15, 'H');
  line(4, 9, 4, 15, 'y');
});
ART.buccaneergun = draw((p, line) => {
  line(2, 6, 13, 6, 'L');
  line(7, 4, 7, 9, 'H');
  line(1, 7, 9, 7, 'b');
  line(1, 8, 9, 8, 'B');
  line(8, 7, 8, 12, 'b');
  line(3, 7, 3, 8, 'H');
  line(5, 7, 5, 8, 'H');
  line(10, 7, 14, 4, 'L');
  line(11, 8, 15, 5, 'w');
  line(10, 5, 10, 8, 'H');
  line(3, 3, 3, 10, 'g');
  line(12, 3, 12, 6, 'g');
});
ART.cursedblade = draw((p, line) => {
  const band = (i, t, k, n) => (k === 1 && i % 5 === 2 ? 'D' : k === 0 ? 'Q' : k === n - 1 ? 'W' : i % 7 === 3 ? 'M' : 'Q');
  sabre(p, line, 4, 12, 9, 11, 14, 1, { band, guard: 'X', grip: 'X', pommel: 'X', w0: 4, w1: 1 });
});
ART.bonestaff = [
  '.....D..........',
  '....DD.D........',
  '..X.XXXXX.X.....',
  '...XXXXXXXX.....',
  '....XkXXkX......',
  '....XDXXDX......',
  '.....XXXX.......',
  '......HH........',
  '.....HH.........',
  '....Xa..........',
  '...Xa...........',
  '..Xa............',
  '.Xa.............',
  '.MM.............',
  'MM..............',
  '................',
];

ART.stats = draw((p, line) => {
  for (let y = 11; y <= 13; y++) for (let x = 2; x <= 4; x++) p(x, y, y === 11 ? 'h' : 'y');
  for (let y = 7; y <= 13; y++) for (let x = 6; x <= 8; x++) p(x, y, y === 7 ? 'q' : 'p');
  for (let y = 3; y <= 13; y++) for (let x = 10; x <= 12; x++) p(x, y, y === 3 ? 'h' : 'e');
  line(1, 14, 14, 14, 'g');
});

ART.strength = draw((p, line) => {
  line(3, 12, 12, 3, 'B');
  line(4, 12, 12, 4, 'b');
  for (const [x, y] of [[2, 10], [3, 10], [2, 11], [3, 11], [4, 13], [5, 13], [4, 14], [5, 14]]) p(x, y, 'r');
  for (const [x, y] of [[10, 2], [11, 2], [10, 3], [11, 3], [12, 4], [13, 4], [12, 5], [13, 5]]) p(x, y, 'r');
  p(2, 10, 'R');
  p(12, 5, 'R');
  p(10, 2, 'o');
  p(4, 13, 'o');
});

ART.agility = draw((p, line) => {
  for (let y = 4; y <= 10; y++) for (let x = 7; x <= 11; x++) p(x, y, x === 7 ? 'E' : 'e');
  for (let y = 10; y <= 12; y++) for (let x = 7; x <= 14; x++) p(x, y, y === 12 ? 'B' : 'e');
  line(7, 4, 11, 4, 'E');
  line(7, 5, 11, 5, 'h');
  line(7, 13, 14, 13, 'B');
  line(13, 10, 14, 11, 'E');
  line(1, 3, 6, 6, 'w');
  line(2, 5, 6, 7, 'l');
  line(3, 7, 6, 8, 'g');
  line(0, 1, 5, 4, 'l');
});

ART.stamina = draw((p, line) => {
  line(9, 1, 4, 8, 'y');
  line(10, 1, 5, 8, 'h');
  line(4, 8, 10, 8, 'y');
  line(5, 9, 10, 9, 'Y');
  line(10, 8, 6, 15, 'y');
  line(11, 9, 7, 14, 'h');
  line(9, 1, 11, 1, 'h');
});

ART.smithing = draw((p, line) => {
  for (let y = 10; y <= 14; y++) for (let x = 2; x <= 13; x++) p(x, y, y === 10 ? 's' : 'S');
  line(6, 4, 6, 10, 's');
  line(9, 4, 9, 10, 'S');
  line(4, 3, 11, 3, 'l');
  line(3, 4, 12, 4, 's');
  p(5, 2, 'h');
  p(10, 2, 'y');
  p(7, 1, 'w');
  p(8, 5, 'L');
  p(7, 6, 'T');
});

ART.mining = draw((p, line) => {
  line(3, 13, 11, 5, 'B');
  line(4, 13, 12, 5, 'b');
  line(2, 5, 6, 2, 's');
  line(6, 2, 11, 2, 's');
  line(11, 2, 14, 5, 's');
  line(2, 6, 5, 3, 'l');
  line(7, 3, 10, 3, 'l');
  line(10, 3, 13, 5, 'g');
  line(12, 4, 14, 6, 'S');
  line(2, 5, 3, 7, 'S');
  p(7, 4, 'S');
  p(8, 4, 'S');
  p(9, 4, 'S');
});

ART.fishing = draw((p, line) => {
  for (let y = 5; y <= 11; y++) {
    const half = 3 - Math.abs(y - 8) * 0.9;
    for (let x = 3; x <= 11; x++) {
      const u = (x - 7) / 5;
      const r = 3.4 * Math.sqrt(Math.max(0, 1 - u * u));
      if (Math.abs(y - 8) <= r) p(x, y, y >= 9 ? 'C' : 'c');
    }
    void half;
  }
  line(12, 8, 14, 5, 'c');
  line(12, 8, 14, 11, 'C');
  line(13, 6, 13, 10, 'c');
  p(5, 7, 'k');
  p(4, 7, 'w');
  line(5, 9, 10, 9, 'w');
  line(7, 5, 9, 4, 'C');
});

ART.woodcutting = draw((p, line) => {
  line(2, 14, 8, 8, 'B');
  line(3, 14, 9, 8, 'b');
  line(8, 8, 13, 3, 'l');
  line(9, 8, 14, 3, 'g');
  p(12, 2, 'w');
  p(13, 2, 'w');
  p(14, 3, 's');
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) if ((x - 3) * (x - 3) + (y - 3) * (y - 3) < 8) p(x, y, y < 3 ? 'e' : 'E');
  p(3, 2, 'y');
  line(4, 6, 4, 14, 'B');
  line(5, 7, 5, 14, 'b');
});

ART.cooking = draw((p, line) => {
  line(1, 8, 5, 8, 'B');
  line(1, 9, 5, 9, 'b');
  line(5, 6, 14, 6, 's');
  line(5, 11, 14, 11, 'S');
  line(5, 6, 5, 11, 's');
  line(14, 6, 14, 11, 'S');
  for (let y = 7; y <= 10; y++) for (let x = 6; x <= 13; x++) p(x, y, 'G');
  line(7, 8, 12, 8, 'o');
  line(7, 9, 12, 9, 'O');
  p(12, 8, 'y');
  p(8, 2, 'h');
  p(9, 2, 'w');
  p(10, 2, 'h');
  p(7, 3, 'y');
  p(8, 3, 'o');
  p(9, 3, 'h');
  p(10, 3, 'y');
  p(11, 3, 'o');
  p(8, 4, 'O');
  p(9, 4, 'y');
  p(10, 4, 'O');
});

ART.firemaking = draw((p, line) => {
  line(2, 13, 13, 10, 'B');
  line(2, 14, 13, 11, 'b');
  line(3, 11, 12, 14, 'b');
  line(3, 12, 12, 15, 'B');
  for (let y = 2; y <= 10; y++) {
    const half = y < 6 ? 2 + (y - 2) : 5 - (y - 6);
    for (let x = 8 - half; x <= 8 + half; x++) p(x, y, y < 5 ? 'h' : y < 8 ? 'y' : 'o');
  }
  p(8, 3, 'w');
  p(8, 4, 'h');
  p(7, 6, 'Y');
  p(9, 7, 'O');
});

export function iconCanvas(name) {
  if (!cache[name]) cache[name] = make(ART[name] || ART.empty);
  return cache[name];
}
export function iconURL(name) {
  return iconCanvas(name).toDataURL();
}

export function heartCanvas(kind) {
  const c = document.createElement('canvas');
  c.width = 13;
  c.height = 10;
  const ctx = c.getContext('2d');
  const shape = [
    '..kkk...kkk..',
    '.kRRRk.kRRRk.',
    'kRrrrrkrrrRRk',
    'kRrwrrrrrrrRk',
    'kRrrrrrrrrrRk',
    '.kRrrrrrrrRk.',
    '..kRrrrrrRk..',
    '...kRrrrRk...',
    '....kRrRk....',
    '.....kRk.....',
  ];
  const empty = {
    k: '#15120f', R: '#2a1b1f', r: '#3a2429', w: '#4a2e34',
  };
  const full = { k: '#15120f', R: '#a8182e', r: '#ff3e5c', w: '#ffc2cc' };
  shape.forEach((row, y) => {
    for (let x = 0; x < 13; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      let col;
      if (kind === 'full') col = full[ch];
      else if (kind === 'empty') col = empty[ch];
      else col = x < 6.5 ? full[ch] : empty[ch];
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}
