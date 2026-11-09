import * as THREE from 'three';
import { hideUniforms } from '../engine/materials.js';
import { TILE_SIZE, originOf, sampleTile } from './tiles.js';

const SEG = 48;

/** Relief mesh for a tile that has not been built yet. */
export function buildTilePreview(tile) {
  const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + TILE_SIZE / 2) / TILE_SIZE;
    const v = (pos.getZ(i) + TILE_SIZE / 2) / TILE_SIZE;
    const s = sampleTile(tile, u, v);
    pos.setY(i, s.h);
    col[i * 3] = s.r;
    col[i * 3 + 1] = s.g;
    col[i * 3 + 2] = s.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Render one tile from straight above into a canvas, then put the play camera back.
 * The built tile is the live world. Planned tiles are a relief preview.
 */
export function captureTileView(game, tile, outCanvas) {
  const o = originOf(tile);
  const cx = o.x + TILE_SIZE / 2;
  const cz = o.z + TILE_SIZE / 2;
  let mesh = null;
  if (!tile.built) {
    mesh = buildTilePreview(tile);
    mesh.position.set(cx, 0, cz);
    game.scene.add(mesh);
  }
  const clouds = game.sky?.clouds;
  const cloudVis = clouds?.visible;
  if (clouds) clouds.visible = false;
  const cam = game.camera;
  const saved = {
    px: cam.position.x,
    py: cam.position.y,
    pz: cam.position.z,
    qx: cam.quaternion.x,
    qy: cam.quaternion.y,
    qz: cam.quaternion.z,
    qw: cam.quaternion.w,
    upx: cam.up.x,
    upy: cam.up.y,
    upz: cam.up.z,
    fov: cam.fov,
    near: game.scene.fog.near,
    far: game.scene.fog.far,
    hx: hideUniforms.uPlayerScreen.value.x,
    hy: hideUniforms.uPlayerScreen.value.y,
  };
  try {
    const dist = 230;
    const aspect = cam.aspect || 1;
    cam.fov = aspect >= 1 ? (2 * Math.atan(TILE_SIZE / 2 / dist) * 180) / Math.PI : (2 * Math.atan(TILE_SIZE / 2 / aspect / dist) * 180) / Math.PI;
    cam.up.set(0, 0, -1);
    cam.position.set(cx, dist, cz);
    cam.lookAt(cx, 0, cz);
    cam.updateProjectionMatrix();
    game.scene.fog.near = 500;
    game.scene.fog.far = 1100;
    hideUniforms.uPlayerScreen.value.set(-9999, -9999);
    game.renderer.render(game.scene, cam);

    const gl = game.renderer.domElement;
    const side = Math.min(gl.width, gl.height);
    const sx = (gl.width - side) / 2;
    const sy = (gl.height - side) / 2;
    const ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gl, sx, sy, side, side, 0, 0, outCanvas.width, outCanvas.height);
    return true;
  } finally {
    cam.up.set(saved.upx, saved.upy, saved.upz);
    cam.fov = saved.fov;
    cam.position.set(saved.px, saved.py, saved.pz);
    cam.quaternion.set(saved.qx, saved.qy, saved.qz, saved.qw);
    cam.updateProjectionMatrix();
    game.scene.fog.near = saved.near;
    game.scene.fog.far = saved.far;
    hideUniforms.uPlayerScreen.value.set(saved.hx, saved.hy);
    if (mesh) {
      game.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    if (clouds) clouds.visible = cloudVis;
    game.renderer.render(game.scene, cam);
  }
}
