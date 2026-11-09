import * as THREE from 'three';

/** Drifting snow that follows the camera. Opacity and density follow how deep into the Arctic the hunter is. */
export class Snowfall {
  constructor(scene, count = 520) {
    this.count = count;
    this.box = { x: 46, y: 22, z: 46 };
    this.pos = new Float32Array(count * 3);
    this.seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * this.box.x * 2;
      this.pos[i * 3 + 1] = Math.random() * this.box.y * 2 - this.box.y;
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * this.box.z * 2;
      this.seed[i] = Math.random() * 10;
    }
    this.world = new Float32Array(count * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.world, 3));
    this.mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 9;
    this.points.visible = false;
    scene.add(this.points);
    this.wind = 0;
  }

  update(dt, t, cam, amount) {
    const on = amount > 0.02;
    this.points.visible = on;
    if (!on) return;
    this.mat.opacity = Math.min(0.9, amount);
    const bx = this.box.x;
    const by = this.box.y;
    const bz = this.box.z;
    const gust = 0.6 + Math.sin(t * 0.23) * 0.4 + Math.sin(t * 0.61) * 0.2;
    const n = Math.floor(this.count * Math.min(1, 0.25 + amount * 0.75));
    this.geo.setDrawRange(0, n);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const s = this.seed[i];
      this.pos[o + 1] -= dt * (1.5 + (s % 1) * 1.6);
      this.pos[o] += dt * (gust * 1.8 + Math.sin(t * 0.9 + s) * 0.5);
      this.pos[o + 2] += dt * (0.4 + Math.cos(t * 0.7 + s) * 0.45);
      let wx = this.pos[o] + cam.x;
      let wy = this.pos[o + 1] + cam.y;
      let wz = this.pos[o + 2] + cam.z;
      if (this.pos[o + 1] < -by) this.pos[o + 1] += by * 2;
      if (this.pos[o] > bx) this.pos[o] -= bx * 2;
      else if (this.pos[o] < -bx) this.pos[o] += bx * 2;
      if (this.pos[o + 2] > bz) this.pos[o + 2] -= bz * 2;
      else if (this.pos[o + 2] < -bz) this.pos[o + 2] += bz * 2;
      wx = this.pos[o] + cam.x;
      wy = this.pos[o + 1] + cam.y;
      wz = this.pos[o + 2] + cam.z;
      this.world[o] = wx;
      this.world[o + 1] = wy;
      this.world[o + 2] = wz;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
