// Coordinates are in grip space. The handle points along +Z. Each head is
// drawn in X/Z so its profile reads both in the forge and at character scale.
import { hash3, jitter } from '../engine/voxel.js';

const SOCKET_Z = 35;

// Extrude a hand-drawn polygon with a bevel around its entire perimeter.
// Concave outlines leave real gaps between claws, horns and crown points.
function plate(c, outline, depth, color, edge, glow = false) {
  const xs = outline.map(([x]) => x);
  const zs = outline.map(([, z]) => z);
  const sides = outline.map(([ax, az], i) => {
    const [bx, bz] = outline[(i + 1) % outline.length];
    return { ax, az, bx, bz, dx: bx - ax, dz: bz - az };
  });
  const xmax = Math.max(...xs), zmax = Math.max(...zs);
  for (let z = Math.min(...zs); z < zmax; z++) {
    for (let x = Math.min(...xs); x < xmax; x++) {
      const px = x + 0.5, pz = z + 0.5;
      let inside = false, nearest = Infinity;
      for (const { ax, az, bz, dx, dz } of sides) {
        if ((az > pz) !== (bz > pz) && px < ax + (pz - az) * dx / dz) inside = !inside;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
        nearest = Math.min(nearest, (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2);
      }
      if (!inside) continue;
      const bevel = Math.min(2, depth - 1);
      const half = depth - bevel + Math.min(bevel, Math.floor(Math.sqrt(nearest)));
      for (let y = -half; y < half; y++) {
        const rim = half < depth && (y === -half || y === half - 1);
        c.set(x, y, SOCKET_Z + z, jitter(rim ? edge : color, 0.035, hash3(x, y, z, 41)), glow);
      }
    }
  }
}

function drawHammer(kit, theme, sculpt) {
  const c = kit.ctx();
  kit.haft(c, theme, -8, SOCKET_Z, 2.2);
  kit.wrapRod(c, theme, -6, 13, 2.65);
  for (const z of [-7, 14, 25, 27]) kit.ringAt(c, z, 2.9, theme.guardHi);
  kit.ball(c, 0, 0, -8, 3.3, theme.guard, false, 0.65);
  const form = (points, depth, color, edge = theme.edge, glow = false) =>
    plate(c, points, depth, color, edge, glow);
  const oval = (x, z, width, height, depth, color, glow = false) =>
    kit.ball(c, x, 0, SOCKET_Z + z, width, color, glow, height / width, depth / width);
  sculpt(form, oval, theme);
  return c.done();
}

// The poll, neck, downturned beak and octagonal socket are common across
// the metal tiers. Only the material changes.
export function metalHandHammer(kit, theme) {
  return drawHammer(kit, theme, (form, oval, t) => {
    form([[-18,-5],[-14,-6],[-11,-3],[-4,-3],[-3,-6],[3,-6],[5,-2],[11,-4],[21,-12],[18,-4],[11,3],[4,6],[-4,5],[-11,3],[-14,6],[-18,5]], 5, t.blade);
    form([[-20,-5],[-17,-7],[-14,-6],[-14,6],[-17,7],[-20,5]], 7, t.dark);
    form([[-4,-5],[0,-8],[4,-5],[4,4],[0,7],[-4,4]], 6, t.guard);
    oval(0, 0, 2.5, 2.5, 8, t.edge);
  });
}

const heads = {
  // Budge Dragon: a blunt scale crest backed by a single sweeping ivory horn.
  budgemaul(form, oval, t) {
    form([[-19,-6],[-15,-10],[-9,-7],[-5,-3],[3,-4],[8,0],[5,8],[-2,13],[-4,8],[-11,11],[-10,6],[-17,6]], 7, t.wrap, t.wrapHi);
    form([[2,-2],[9,-1],[17,3],[22,11],[20,3],[16,-4],[8,-8],[2,-7]], 4, t.horn, t.claw);
    oval(-7, 3, 3, 2, 8, t.glow, true);
  },
  // Darksycle: crescent peen with an open inner arc and a jewel at its heel.
  darkhammer(form, oval, t) {
    form([[-17,-5],[-12,-8],[-6,-5],[1,-4],[8,-8],[14,-6],[17,1],[16,10],[10,17],[5,19],[10,11],[11,5],[7,2],[0,4],[-7,3],[-13,7],[-17,5]], 5, t.dark);
    form([[7,-6],[13,-5],[16,1],[15,10],[10,15],[13,8],[13,2]], 6, t.blade, t.edge);
    oval(-4, 0, 3, 3, 7, t.glow, true);
  },
  // Snow Yeti: a sloping glacier face and three unequal crystal pinnacles.
  yetihammer(form, oval, t) {
    form([[-16,-5],[-20,2],[-14,12],[-5,16],[2,8],[7,1],[5,-5],[-4,-9]], 7, t.blade);
    form([[-15,10],[-5,16],[-3,7],[-9,-4]], 8, t.wrapHi, t.edge);
    form([[0,0],[3,20],[9,14],[8,2],[15,12],[16,5],[12,-4],[4,-6]], 4, t.glow, t.edge);
    form([[-6,-5],[5,-4],[7,-7],[3,-12],[1,-9],[-3,-13],[-7,-9]], 6, t.membraneHi, t.membrane);
  },
  // Volcanum: twin basalt chimney walls enclosing an exposed molten core.
  volchammer(form, oval, t) {
    form([[-17,-4],[-20,6],[-17,14],[-10,13],[-9,3],[-5,0],[3,1],[6,9],[5,16],[12,13],[15,7],[13,-4],[5,-9],[-7,-9]], 7, t.dark, t.blade);
    oval(-2, 5, 6, 7, 5, t.glow, true);
    form([[-15,-3],[-11,-5],[-4,-3],[0,-6],[7,-3],[4,-7],[-1,-9],[-6,-6]], 8, t.glow, t.glow2, true);
  },
  // Rex: deep snout, separated upper and lower jaws, and ivory teeth.
  rexhammer(form, oval) {
    form([[-22,0],[-21,7],[-15,10],[-6,11],[0,15],[8,12],[11,6],[7,-3],[1,-5],[-1,-2],[-7,1],[-10,-4],[-12,1],[-16,1],[-18,-4],[-19,0]], 6, 0xc4a67b, 0xf2d8a8);
    form([[4,-2],[0,-8],[-13,-9],[-17,-6],[-15,-11],[-7,-14],[2,-12],[8,-5]], 4, 0xb29874, 0xe9cf9b);
    oval(2, 7, 3, 3, 7, 0x392c23);
  },
  // Holy Knight: an open reliquary arch with a luminous cross inside.
  holyhammer(form, oval) {
    form([[-14,-6],[-14,7],[-10,13],[0,20],[10,13],[14,7],[14,-6],[8,-8],[8,4],[5,10],[0,14],[-5,10],[-8,4],[-8,-8]], 5, 0xf4ead2, 0xe3b855);
    form([[-14,-7],[-7,-10],[7,-10],[14,-7],[12,-3],[-12,-3]], 6, 0xc89a41, 0xffdf8e);
    form([[-2,-7],[2,-7],[2,2],[6,2],[6,5],[2,5],[2,10],[-2,10],[-2,5],[-6,5],[-6,2],[-2,2]], 3, 0x71ceff, 0xdaf8ff, true);
  },
  // Tiger: a striped paw with three claws projecting below the striking pad.
  tigerhammer(form, oval) {
    oval(-5, 2, 13, 9, 7, 0xc27536);
    for (const [x, length] of [[-15,12],[-8,15],[-1,10]]) {
      form([[x-2,3],[x+3,3],[x+3,-5],[x-1,-length],[x-1,-6],[x-3,-2]], 4, 0xf0d2a1, 0xffe9bf);
      form([[x-1,4],[x,9],[x+3,9],[x+2,5]], 7, 0x35241c);
    }
    oval(7, 3, 5, 6, 5, 0x97542c);
  },
  // Raptor: an angled heel and a long recurved sickle talon.
  raptorhammer(form, oval) {
    form([[-14,5],[-9,11],[-3,10],[6,4],[8,-2],[2,-6],[-4,-3],[-9,0]], 6, 0x6f8050, 0xb8c47e);
    form([[3,4],[10,5],[16,1],[20,-6],[19,-14],[12,-21],[15,-13],[14,-7],[9,-4],[3,-5]], 4, 0xc4b38a, 0xf5deb0);
    oval(-5, 5, 2.5, 2.5, 7, 0xe8b35a);
  },
  // Pirate: a brass ship's bell on its side, including its projecting clapper.
  piratehammer(form, oval) {
    form([[-19,-11],[-15,-9],[-11,-5],[-3,-4],[2,-2],[3,3],[-2,6],[-10,6],[-15,9],[-19,12]], 7, 0xbd9040, 0xffdc7d);
    form([[-20,-11],[-17,-12],[-17,12],[-20,11]], 8, 0xebbf61, 0xffe699);
    oval(-22, 0, 4, 3, 3, 0x765123);
    form([[0,-4],[9,-4],[14,-1],[14,3],[10,5],[0,4]], 4, 0x495059, 0xb9aa83);
  },
  // Cursed Pirate: a skull with dark sockets and a ragged hanging jaw.
  cursedhammer(form, oval) {
    oval(0, 4, 13, 14, 8, 0xcfbf9a);
    form([[-10,1],[10,1],[8,-10],[5,-12],[4,-8],[1,-14],[-2,-9],[-5,-13],[-8,-10]], 6, 0xac9a76, 0xdcca9e);
    for (const x of [-5,5]) {
      oval(x, 4, 4, 4, 8.5, 0x343733);
      oval(x, 4, 1.7, 2, 9, 0x84f7a4, true);
    }
    oval(0, -1, 2, 2.5, 8.5, 0x413c34);
  },
  // Sandworm: nested chitin segments tapering into a long sand spine.
  sandwormhammer(form, oval) {
    for (const [x, r] of [[11,5],[6,7],[0,9],[-7,11],[-14,12]]) {
      form([[x-4,-r+2],[x,-r],[x+5,-r+4],[x+6,1],[x+2,r],[x-3,r-2],[x,1]], Math.ceil(r/2), 0xb38a4f, 0xe3bf84);
    }
    form([[10,-2],[15,3],[26,4],[17,-2],[12,-5]], 3, 0xe4c992, 0xffe2a4);
  },
  // Scorpion: a broad pincer with a real fork and a recurved stinger.
  scorpionhammer(form, oval) {
    form([[-7,-5],[-15,-7],[-21,-2],[-24,6],[-21,12],[-19,5],[-15,2],[-12,3],[-11,9],[-13,14],[-7,10],[-5,4],[2,3],[3,-3]], 6, 0xae782e, 0xe5b462);
    form([[0,-3],[7,-6],[14,-4],[19,3],[19,10],[14,16],[9,15],[13,12],[14,7],[11,3],[6,1],[0,2]], 4, 0x684528, 0xcf9947);
    oval(0, 0, 3, 3, 7, 0xd5ad54);
  },
  // Orc: a broken anvil lashed sideways with mismatched rivets.
  orcwarhammer(form, oval) {
    form([[-19,1],[-21,9],[-13,9],[-11,6],[-8,9],[14,9],[17,6],[10,1],[3,-1],[2,-4],[8,-6],[8,-10],[-11,-10],[-12,-6],[-6,-3],[-7,0]], 7, 0x626364, 0xb2ac97);
    form([[-5,-7],[-2,-8],[3,8],[0,9]], 8, 0x905731, 0xbc8959);
    for (const x of [-13,7]) oval(x, 5, 2, 2, 8, 0xd1b188);
  },
  // Demon Knight: a split horned crown rising around a suspended ember.
  demonhammer(form, oval) {
    form([[-15,-4],[-20,3],[-21,14],[-15,9],[-11,1],[-6,-1],[-8,8],[-6,17],[-2,9],[0,1],[5,0],[11,4],[16,17],[18,10],[17,1],[11,-7],[0,-12]], 6, 0x392a36, 0xab5541);
    oval(2, 2, 5, 6, 7, 0xff5632, true);
    form([[-6,-5],[-1,-7],[4,-4],[7,-5],[5,-8],[-1,-10]], 7, 0xda472b, 0xff9945, true);
  },
  // Keep Warden: opposed day and night weights hung on a raised balance beam.
  wardenhammer(form, oval) {
    form([[-18,8],[-2,12],[0,15],[3,12],[18,8],[17,5],[3,8],[2,-7],[-2,-7],[-3,8],[-17,5]], 4, 0xb99855, 0xf6d891);
    form([[-18,7],[-14,7],[-12,-1],[-8,-4],[-9,-7],[-20,-7],[-22,-4],[-18,0]], 5, 0x333746, 0xbd6350);
    form([[14,7],[18,7],[18,0],[22,-4],[20,-7],[9,-7],[8,-4],[12,-1]], 5, 0xdce3e1, 0x9ad8ff);
    oval(0, 10, 2, 2, 5, 0x95d9ff, true);
  },
};

export function monsterHandHammers(kit) {
  const { budge, dark, frost, volcanum, iron, orc } = kit.THEMES;
  const grips = {
    budgemaul: budge, darkhammer: dark, yetihammer: frost, volchammer: volcanum,
    rexhammer: orc, holyhammer: iron, tigerhammer: budge, raptorhammer: orc,
    piratehammer: iron, cursedhammer: orc, sandwormhammer: orc,
    scorpionhammer: orc, orcwarhammer: orc, demonhammer: volcanum, wardenhammer: iron,
  };
  return Object.fromEntries(Object.entries(heads).map(([id, sculpt]) => [
    id, () => drawHammer(kit, grips[id], sculpt),
  ]));
}
