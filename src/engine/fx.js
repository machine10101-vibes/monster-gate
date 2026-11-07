import * as THREE from 'three';
import { GATE } from '../world/terrain.js';

const MAX_P = 320;

export class FX {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.time = 0;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.inst = new THREE.InstancedMesh(geo, this.mat, MAX_P);
    this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.inst.frustumCulled = false;
    this.inst.count = 0;
    const col = new Float32Array(MAX_P * 3);
    this.inst.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
    scene.add(this.inst);
    this.particles = [];
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.c = new THREE.Color();

    this.makeMotes();
    this.makeSlash();
    this.makeGateMotes();
    this.makeTelegraphs();
  }

  emit(x, y, z, vx, vy, vz, c, size, life, g = 9) {
    if (this.particles.length >= MAX_P) this.particles.shift();
    this.particles.push({ x, y, z, vx, vy, vz, life, max: life, size, c, g, rx: Math.random() * 6, rv: (Math.random() - 0.5) * 14 });
  }

  /** Directional hit sparks plus a short white flash at the contact point. */
  impact(x, y, z, dx, dz, color, power = 1) {
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l;
    const uz = dz / l;
    const n = Math.round(6 + power * 7);
    for (let i = 0; i < n; i++) {
      const a = (Math.random() - 0.5) * 1.5;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const dxr = ux * ca - uz * sa;
      const dzr = ux * sa + uz * ca;
      const sp = (4 + Math.random() * 6) * (0.7 + power * 0.4);
      const c = Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color;
      this.emit(x, y, z, dxr * sp, Math.random() * 3 + 0.5, dzr * sp, c, 0.05 + Math.random() * 0.05, 0.22 + Math.random() * 0.18, 7);
    }
    this.emit(x, y, z, 0, 0, 0, 0xffffff, 0.2 + power * 0.1, 0.08, 0);
    this.emit(x, y, z, 0, 0, 0, 0xfff2c0, 0.32 + power * 0.14, 0.04, 0);
  }

  dust(x, y, z, count = 3, spread = 1, color = 0xd9c9a0) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random() * 0.8) * spread;
      this.emit(x + Math.cos(a) * 0.12, y + 0.06, z + Math.sin(a) * 0.12, Math.cos(a) * sp, 0.5 + Math.random() * 0.9, Math.sin(a) * sp, color, 0.1 + Math.random() * 0.1, 0.35 + Math.random() * 0.25, -0.5);
    }
  }

  shockwave(x, y, z, color = 0xd9c9a0, radius = 2.2) {
    this.ring(x, y + 0.08, z, color, 18, radius * 2.2, 0.12, 0.42);
    this.dust(x, y, z, 8, radius * 1.4, color);
  }

  makeTelegraphs() {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.tele = [];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: { uProg: { value: 0 }, uA: { value: 0 }, uCol: { value: new THREE.Color(0xff4a3a) }, uShape: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uProg; uniform float uA; uniform vec3 uCol; uniform float uShape; varying vec2 vUv;
          void main(){
            float a;
            if (uShape < 0.5) {
              float r = length(vUv - 0.5) * 2.0;
              float edge = smoothstep(0.86, 0.94, r) * smoothstep(1.0, 0.95, r);
              float fill = step(r, uProg) * 0.32 * step(r, 0.94);
              a = max(edge * 0.95, fill);
            } else {
              float along = 1.0 - vUv.y;
              float side = abs(vUv.x - 0.5) * 2.0;
              float edge = smoothstep(0.84, 0.92, side) * step(along, 1.0);
              float tip = smoothstep(0.94, 0.98, along);
              float fill = step(along, uProg) * 0.3 * step(side, 0.92);
              a = max(max(edge * 0.9, tip * 0.9 * step(side, 0.95)), fill);
            }
            gl_FragColor = vec4(uCol, a * uA);
          }`,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.scene.add(mesh);
      this.tele.push({ mesh, t: 0, dur: 1, active: false });
    }
  }

  /** Ground warning decal. shape 'circle' (radius w) or 'line' (width w, length l, starts at x,z along yaw). */
  telegraph(x, y, z, yaw, shape, w, l, color, dur) {
    let slot = this.tele.find((s) => !s.active);
    if (!slot) slot = this.tele[0];
    const m = slot.mesh;
    slot.active = true;
    slot.t = 0;
    slot.dur = dur;
    m.visible = true;
    m.material.uniforms.uCol.value.set(color);
    m.material.uniforms.uShape.value = shape === 'line' ? 1 : 0;
    m.material.uniforms.uProg.value = 0;
    m.material.uniforms.uA.value = 0;
    if (shape === 'line') {
      m.scale.set(w, 1, l);
      m.position.set(x + Math.sin(yaw) * l * 0.5, y + 0.1, z + Math.cos(yaw) * l * 0.5);
      m.rotation.set(0, yaw, 0);
    } else {
      m.scale.set(w * 2, 1, w * 2);
      m.position.set(x, y + 0.1, z);
      m.rotation.set(0, 0, 0);
    }
    return slot;
  }

  cancelTelegraph(slot) {
    if (slot && slot.active) {
      slot.t = Math.max(slot.t, slot.dur);
    }
  }

  burst(x, y, z, color, count = 10, speed = 3, size = 0.1, life = 0.6, gravity = 9, up = 1.5) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_P) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.65);
      const c = Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color;
      this.particles.push({
        x, y, z,
        vx: Math.cos(a) * sp,
        vy: Math.random() * speed * 0.8 + up,
        vz: Math.sin(a) * sp,
        life,
        max: life,
        size: size * (0.6 + Math.random() * 0.8),
        c,
        g: gravity,
        rx: Math.random() * 6,
        rv: (Math.random() - 0.5) * 12,
      });
    }
  }

  ring(x, y, z, color, count = 14, speed = 3, size = 0.08, life = 0.5) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_P) this.particles.shift();
      const a = (i / count) * Math.PI * 2;
      this.particles.push({
        x, y, z,
        vx: Math.cos(a) * speed,
        vy: 0.6,
        vz: Math.sin(a) * speed,
        life, max: life, size, c: color, g: 2, rx: 0, rv: 4,
      });
    }
  }

  makeMotes() {
    const n = this.quality.motes;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos.set([Math.random() * 56, Math.random() * 11, Math.random() * 56], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    this.moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFocus: { value: new THREE.Vector3() },
        uScale: { value: 600 },
        uNight: { value: 0 },
        uForest: { value: 0 },
      },
      vertexShader: `
        attribute vec4 seed; uniform float uTime; uniform vec3 uFocus; uniform float uScale; uniform float uNight; uniform float uForest;
        varying vec3 vCol; varying float vA;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * 0.4 * (0.5 + seed.x) + seed.y * 20.0) * 1.6;
          p.y += sin(uTime * 0.5 * (0.5 + seed.z) + seed.w * 20.0) * 0.9;
          p.z += cos(uTime * 0.35 * (0.5 + seed.y) + seed.x * 20.0) * 1.6;
          p.y += uTime * 0.04 * seed.z;
          vec3 base = uFocus - vec3(28.0, 0.0, 28.0);
          vec3 w = vec3(mod(p.x - base.x, 56.0), mod(p.y, 11.0), mod(p.z - base.z, 56.0));
          vec3 wp = base + w;
          wp.y += 0.3 + max(0.0, uFocus.y - 2.0);
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          float tw = 0.5 + 0.5 * sin(uTime * (1.0 + seed.x * 2.0) + seed.w * 30.0);
          gl_PointSize = (1.4 + seed.z * 1.6) * (0.8 + 0.8 * uNight) * uScale / -mv.z;
          float keep = step(seed.x, 0.45 + uForest * 0.55 + uNight * 0.5);
          vA = tw * keep * (0.35 + 0.65 * uNight + 0.35 * uForest);
          vCol = mix(vec3(1.0, 0.95, 0.6), vec3(0.55, 1.0, 0.7), step(0.5, seed.y));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = max(abs(c.x), abs(c.y)) * 2.0;
          float a = smoothstep(1.0, 0.2, d) * vA;
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    this.motes = new THREE.Points(g, this.moteMat);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 5;
    this.scene.add(this.motes);
  }

  makeGateMotes() {
    const n = this.quality.gateMotes;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([0, 0, 0], i * 3);
      seed.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
    this.gateMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uOrigin: { value: new THREE.Vector3(GATE.x, 3, GATE.z) } },
      vertexShader: `
        attribute vec3 seed; uniform float uTime; uniform float uScale; uniform vec3 uOrigin;
        varying float vA; varying vec3 vCol;
        void main(){
          float t = fract(uTime * (0.08 + seed.x * 0.12) + seed.y);
          float a = seed.z * 6.2831 + uTime * (0.4 + seed.x);
          float r = 0.4 + t * 2.2 * seed.x + seed.y * 0.8;
          vec3 wp = uOrigin + vec3(cos(a) * r * 1.25, 0.4 + t * 6.0, sin(a) * r * 0.55 + 0.4);
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          gl_PointSize = (2.0 + seed.y * 2.5) * uScale / -mv.z;
          vA = sin(t * 3.14159);
          vCol = mix(vec3(0.75, 0.35, 1.0), vec3(0.6, 0.95, 1.0), seed.y);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA; varying vec3 vCol;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = max(abs(c.x), abs(c.y)) * 2.0;
          float a = smoothstep(1.0, 0.3, d) * vA;
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    this.gateMotes = new THREE.Points(g, this.gateMat);
    this.gateMotes.frustumCulled = false;
    this.gateMotes.renderOrder = 6;
    this.scene.add(this.gateMotes);
  }

  makeSlash() {
    const geo = new THREE.RingGeometry(0.6, 2.5, 20, 1, -Math.PI * 0.42, Math.PI * 0.84);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uA: { value: 0 }, uCol: { value: new THREE.Color(0xfff2c0) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uA; uniform vec3 uCol; varying vec2 vP;
        void main(){
          float r = length(vP); float ang = atan(vP.y, vP.x);
          float edge = smoothstep(0.6, 1.4, r) * smoothstep(2.5, 2.1, r);
          float tail = smoothstep(-0.8, 0.8, ang);
          float a = edge * mix(0.25, 1.0, tail) * uA;
          gl_FragColor = vec4(uCol * (0.8 + 0.4 * edge), a);
        }`,
    });
    this.slash = new THREE.Mesh(geo, mat);
    this.slash.visible = false;
    this.slash.renderOrder = 7;
    this.slashT = 0;
    this.scene.add(this.slash);
  }

  doSlash(x, y, z, yaw, scale = 1, color = 0xfff2c0, flip = 1) {
    this.slash.position.set(x, y, z);
    this.slash.rotation.set(0, yaw, 0);
    this.slash.scale.set(scale, 1, scale * flip);
    this.slash.material.uniforms.uCol.value.set(color);
    this.slashT = 0.22;
    this.slashMax = 0.22;
    this.slash.visible = true;
  }

  update(dt, time, focus, scaleFactor, night, forestAmt) {
    this.time = time;
    this.moteMat.uniforms.uTime.value = time;
    this.moteMat.uniforms.uFocus.value.copy(focus);
    this.moteMat.uniforms.uScale.value = scaleFactor;
    this.moteMat.uniforms.uNight.value = night;
    this.moteMat.uniforms.uForest.value = forestAmt;
    this.gateMat.uniforms.uTime.value = time;
    this.gateMat.uniforms.uScale.value = scaleFactor;

    if (this.slashT > 0) {
      this.slashT -= dt;
      const k = Math.max(0, this.slashT / this.slashMax);
      this.slash.material.uniforms.uA.value = k;
      this.slash.scale.x *= 1 + dt * 1.2;
      if (this.slashT <= 0) this.slash.visible = false;
    }

    for (const s of this.tele) {
      if (!s.active) continue;
      s.t += dt;
      const u = s.mesh.material.uniforms;
      if (s.t >= s.dur + 0.12) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      const p = Math.min(1, s.t / s.dur);
      u.uProg.value = p * p * (3 - 2 * p);
      const pulse = 0.75 + Math.sin(s.t * 26) * 0.25 * p;
      u.uA.value = s.t > s.dur ? Math.max(0, 1 - (s.t - s.dur) / 0.12) : Math.min(1, s.t * 8) * pulse;
    }

    let n = 0;
    const list = this.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
      }
    }
    for (const p of list) {
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += p.rv * dt;
      const k = p.life / p.max;
      const sc = p.size * (0.3 + k * 0.7);
      this.e.set(p.rx, p.rx * 0.7, 0);
      this.q.setFromEuler(this.e);
      this.v.set(p.x, p.y, p.z);
      this.s.set(sc, sc, sc);
      this.m4.compose(this.v, this.q, this.s);
      this.inst.setMatrixAt(n, this.m4);
      this.c.set(p.c);
      this.inst.setColorAt(n, this.c);
      n++;
    }
    this.inst.count = n;
    this.inst.instanceMatrix.needsUpdate = true;
    if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;
  }
}
