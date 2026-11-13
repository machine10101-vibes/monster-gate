import { buildDemonWall, buildDemonTower, buildDemonGate, buildDemonKeep, buildDemonFountain, buildDemonStatue } from './demonFortress.js';
import { buildHolyWall, buildHolyTower, buildHolyGate, buildHolyKeep, buildHolyFountain, buildHolyStatue } from './holyCastle.js';

/** The two great keeps, assembled from pieces that all face +z and are turned into place by `raiseKeep`. */

export const KEEP_HALF = 34;

export function buildKeepModels() {
  return {
    demon: {
      wallLong: buildDemonWall(300, 1),
      wallHalf: buildDemonWall(100, 2),
      tower: buildDemonTower(1),
      gate: buildDemonGate(3),
      keep: buildDemonKeep(5),
      fountain: buildDemonFountain(7),
      statue: buildDemonStatue(9),
    },
    holy: {
      wallLong: buildHolyWall(300, 1),
      wallHalf: buildHolyWall(100, 2),
      tower: buildHolyTower(1),
      gate: buildHolyGate(3),
      keep: buildHolyKeep(5),
      fountain: buildHolyFountain(7),
      statue: buildHolyStatue(9),
    },
  };
}

/** Courtyard frame: converts between world and keep-local coordinates (+z is the gate side). */
export function keepFrame(cx, cz, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    at: (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c],
    local: (x, z) => [(x - cx) * c - (z - cz) * s, (x - cx) * s + (z - cz) * c],
  };
}

export function raiseKeep(world, land, keep) {
  const kit = world.models.keeps[keep.kind];
  const demon = keep.kind === 'demon';
  const cx = land.x0 + keep.cx + 0.5;
  const cz = land.z0 + keep.cz + 0.5;
  const theta = keep.theta || 0;
  const F = keepFrame(cx, cz, theta);
  const s = Math.sin(theta);
  const turned = Math.abs(s) > 0.5;
  const H = KEEP_HALF;

  const piece = (model, lx, lz, rot, hw, hd, off = [0, 0]) => {
    const [x, z] = F.at(lx, lz);
    const y = world.heightAt(x, z);
    world.putAt(model.parts, x, z, rot + theta, 1, { y });
    if (hw) {
      const sw = Math.abs(Math.sin(rot)) > 0.5;
      const bx = sw ? hd : hw;
      const bz = sw ? hw : hd;
      const [ox, oz] = F.at(lx + off[0], lz + off[1]);
      world.box(ox, oz, turned ? bz : bx, turned ? bx : bz);
    }
  };

  const wl = kit.wallLong;
  const wh = kit.wallHalf;
  piece(wl, 0, -H, Math.PI, wl.w * 0.5, 1.9);
  piece(wl, H, 0, Math.PI / 2, wl.w * 0.5, 1.9);
  piece(wl, -H, 0, -Math.PI / 2, wl.w * 0.5, 1.9);
  piece(wh, -(H - 14), H, 0, wh.w * 0.5, 1.9);
  piece(wh, H - 14, H, 0, wh.w * 0.5, 1.9);

  for (const [lx, lz] of [[-H, -H], [H, -H], [-H, H], [H, H]]) {
    const [x, z] = F.at(lx, lz);
    piece(kit.tower, lx, lz, (lx > 0 ? 1 : -1) * 0.4 + (lz > 0 ? 0 : 3), 0, 0);
    world.circle(x, z, kit.tower.r - 0.15);
    world.circle(x, z, kit.tower.r * 0.62);
    world.occupy(x, z, kit.tower.r + 1);
  }

  const gate = kit.gate;
  piece(gate, 0, H, 0, 0, 0);
  const side = 6.7;
  for (const sg of [-1, 1]) {
    const [bx, bz] = F.at(sg * side, H - 0.2);
    world.box(bx, bz, turned ? 5.0 : 3.4, turned ? 3.4 : 5.0);
  }
  world.occupy(...F.at(0, H), 10);

  const kp = kit.keep;
  piece(kp, 0, -12, 0, 0, 0);
  const [kx, kzw] = F.at(0, -12);
  const bw = (kp.bodyW || kp.w) * 0.5;
  world.box(kx, kzw, turned ? 9.2 : bw, turned ? bw : 9.2);
  world.occupy(kx, kzw, 16);
  if (!demon) {
    for (const sg of [-1, 1]) {
      const [tx, tz] = F.at(sg * 11.6, -17.2);
      world.box(tx, tz, turned ? 3.6 : 3, turned ? 3 : 3.6);
    }
  }

  const fountain = kit.fountain;
  piece(fountain, 0, 12, 0, 0, 0);
  const [fx, fz] = F.at(0, 12);
  world.circle(fx, fz, fountain.r * 0.92);
  world.occupy(fx, fz, fountain.r + 1);
  world.lightSpots.push({ x: fx, y: world.heightAt(fx, fz) + 3.4, z: fz, color: demon ? 0xff6a1a : 0x7fc4ff });

  for (const [lx, lz, rot] of [[-14, 4, 0.3], [14, 4, -0.3], [-20, 20, 0.5], [20, 20, -0.5]]) {
    piece(kit.statue, lx, lz, rot, 0, 0);
    const [x, z] = F.at(lx, lz);
    world.circle(x, z, kit.statue.r);
    world.occupy(x, z, 2);
  }

  const bm = world.models.volcanic;
  const braz = demon ? bm.brazierDemon[0] : bm.brazierHoly[0];
  const flame = demon ? 0xff6a1a : 0x7fc4ff;
  const lightAt = (lx, lz) => {
    const [x, z] = F.at(lx, lz);
    world.putAt(braz, x, z, lx, 1.0);
    world.circle(x, z, 0.5);
    world.occupy(x, z, 1.2);
    world.lightSpots.push({ x, y: world.heightAt(x, z) + 4.2, z, color: flame });
  };
  for (const lz of [14, 26]) {
    lightAt(-6, lz);
    lightAt(6, lz);
  }
  for (const lx of [-26, 26]) lightAt(lx, -6);
  for (const lz of [H + 8, H + 20]) {
    lightAt(-5.4, lz);
    lightAt(5.4, lz);
  }

  const banners = demon ? bm.bannersDemon : bm.bannersHoly;
  for (const lx of [-24, -12, 12, 24]) {
    const [x, z] = F.at(lx, H - 5.4);
    world.putAt(banners[Math.abs(lx) % 2], x, z, theta + Math.PI, 0.9);
    world.circle(x, z, 0.3);
  }
  // Three posts on the ground in front of the gate. The wall sits at +H, so these stand outside it.
  const posts = [[-16, H + 8], [16, H + 8], [0, H + 16]].map(([lx, lz]) => {
    const [x, z] = F.at(lx, lz);
    return [x - cx, z - cz];
  });
  return { x: cx, z: cz, posts };
}
