import * as THREE from 'three';

/** Drifting ash flakes and rising embers that follow the camera inside the volcanic wasteland. */
export class Ashfall {
  constructor(scene, count = 460) {
    this.count = count;
    this.box = { x: 40, y: 20, z: 40 };
    this.pos = new Float32Array(count * 3);
    this.seed = new Float32Array(count);
    this.kind = new Uint8Array(count);
    this.world = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * this.box.x * 2;
      this.pos[i * 3 + 1] = Math.random() * this.box.y * 2 - this.box.y;
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * this.box.z * 2;
      this.seed[i] = Math.random() * 10;
      const ember = i % 4 === 0;
      this.kind[i] = ember ? 1 : 0;
      const c = ember ? new THREE.Color(0xff8a2a) : new THREE.Color(0x9a9aa2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.world, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mat = new THREE.PointsMaterial({ size: 0.16, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 9;
    this.points.visible = false;
    scene.add(this.points);
  }

  update(dt, t, cam, amount) {
    const on = amount > 0.02;
    this.points.visible = on;
    if (!on) return;
    this.mat.opacity = Math.min(0.85, amount);
    const bx = this.box.x;
    const by = this.box.y;
    const bz = this.box.z;
    const n = Math.floor(this.count * Math.min(1, 0.25 + amount * 0.75));
    this.geo.setDrawRange(0, n);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const s = this.seed[i];
      const ember = this.kind[i] === 1;
      this.pos[o + 1] += dt * (ember ? 0.9 + (s % 1) * 1.4 : -(0.55 + (s % 1) * 0.7));
      this.pos[o] += dt * (0.8 + Math.sin(t * 0.7 + s) * 0.5);
      this.pos[o + 2] += dt * (0.25 + Math.cos(t * 0.6 + s) * 0.4);
      if (this.pos[o + 1] < -by) this.pos[o + 1] += by * 2;
      else if (this.pos[o + 1] > by) this.pos[o + 1] -= by * 2;
      if (this.pos[o] > bx) this.pos[o] -= bx * 2;
      else if (this.pos[o] < -bx) this.pos[o] += bx * 2;
      if (this.pos[o + 2] > bz) this.pos[o + 2] -= bz * 2;
      else if (this.pos[o + 2] < -bz) this.pos[o + 2] += bz * 2;
      this.world[o] = this.pos[o] + cam.x;
      this.world[o + 1] = this.pos[o + 1] + cam.y;
      this.world[o + 2] = this.pos[o + 2] + cam.z;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
