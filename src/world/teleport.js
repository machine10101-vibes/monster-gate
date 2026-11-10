import * as THREE from 'three';
import { toonMaterial } from '../engine/materials.js';
import { buildWaygate } from './models.js';
import { PORTALS } from '../data/portals.js';

const curtainFrag = `
uniform float uTime;
varying vec2 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  vec2 c = vec2(vP.x, vP.y - 1.7);
  float r = length(c);
  vec2 q = floor(c * 22.0) / 22.0;
  float rq = length(q);
  float n = vn(q * 3.0 + vec2(0.0, uTime * 0.55)) * 0.65 + vn(q * 8.0 - uTime * 0.8) * 0.35;
  float pulse = 0.0;
  for (int i = 0; i < 3; i++) {
    float t = fract(uTime * 0.42 + float(i) * 0.333);
    float band = abs(rq - t * 1.25);
    pulse += smoothstep(0.09, 0.0, band) * (1.0 - t);
  }
  float fil = step(0.78, h21(vec2(floor(atan(c.y, c.x) * 7.0), 3.0))) * (0.35 + pulse);
  float core = smoothstep(0.28, 0.0, rq);
  vec3 blue = vec3(0.45, 0.78, 1.0);
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 col = mix(blue, white, clamp(pulse * 0.85 + core, 0.0, 1.0));
  col += white * (core * 0.55 + n * 0.18 + fil * 0.35);
  float edge = smoothstep(1.15, 0.55, r);
  float alpha = (0.28 + n * 0.22 + pulse * 0.7 + core * 0.5) * edge;
  gl_FragColor = vec4(col, alpha);
}
`;

const ringFrag = `
uniform float uTime;
uniform float uPhase;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  p = floor(p * 18.0) / 18.0;
  float r = length(p);
  float t = fract(uTime * 0.42 + uPhase);
  float band = abs(r - mix(0.15, 1.05, t));
  float a = smoothstep(0.1, 0.0, band) * (1.0 - t);
  a *= smoothstep(1.05, 0.82, r);
  vec3 col = mix(vec3(0.62, 0.86, 1.0), vec3(1.0, 1.0, 1.0), t);
  gl_FragColor = vec4(col * (0.75 + a), a);
}
`;

function archShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.95, 0.28);
  shape.lineTo(0.95, 0.28);
  shape.lineTo(0.95, 2.05);
  shape.absarc(0, 2.05, 0.95, 0, Math.PI, false);
  shape.lineTo(-0.95, 0.28);
  return new THREE.ShapeGeometry(shape, 12);
}

/** Light-blue and white waystones. Same arch as the hunter waygate, with a pale plasma curtain. */
export function placeTeleportPortals(world) {
  const built = buildWaygate();
  const solidMat = toonMaterial({ vertexColors: true });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const curtainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: curtainFrag,
  });
  const curtainGeo = archShape();
  const ringGeo = new THREE.PlaneGeometry(2.5, 2.5);
  const ringMats = [0, 1, 2].map((i) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPhase: { value: i / 3 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: ringFrag,
  }));

  const sites = [];
  for (const spec of PORTALS) {
    let y = 0;
    for (let dz = -1.6; dz <= 1.6; dz += 0.4) {
      for (let dx = -1.2; dx <= 1.2; dx += 0.4) y = Math.max(y, world.heightAt(spec.x + dx, spec.z + dz));
    }
    const group = new THREE.Group();
    group.position.set(spec.x, y, spec.z);
    group.rotation.y = spec.yaw || 0;
    if (built.solid) {
      const mesh = new THREE.Mesh(built.solid, solidMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (built.glow) group.add(new THREE.Mesh(built.glow, glowMat));

    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(0, 0, 0.06);
    curtain.renderOrder = 3;
    group.add(curtain);
    ringMats.forEach((mat, i) => {
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.set(0, 1.65, 0.12 + i * 0.04);
      ring.renderOrder = 4;
      group.add(ring);
    });
    const light = new THREE.PointLight(0xd6f3ff, 2.2, 11, 1.5);
    light.position.set(0, 1.7, 0.3);
    group.add(light);
    world.group.add(group);

    const yaw = spec.yaw || 0;
    for (const lx of [-1.3, 1.3]) {
      world.circle(spec.x + Math.cos(yaw) * lx, spec.z - Math.sin(yaw) * lx, 0.48);
    }
    sites.push({ ...spec, y, group, light });
  }

  world.teleports = sites;
  world.teleportFx = { curtainMat, ringMats };
}
