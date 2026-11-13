import * as THREE from 'three';

const TAU = Math.PI * 2;
const R = (a = 0, b = 1) => a + Math.random() * (b - a);
const MAX_GLOW = 300;
const MAX_HOT = 620;
const MAX_RINGS = 18;

export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeOutBack = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function pixelGlowTexture() {
  const n = 32;
  const cv = document.createElement('canvas');
  cv.width = n;
  cv.height = n;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      let v = Math.max(0, 1 - d);
      v = v * v * (3 - 2 * v);
      v = Math.round(v * 6) / 6;
      const i = (y * n + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

const STRIP_VERT = `
  attribute float aSide; attribute float aA;
  varying float vS; varying float vA;
  void main(){ vS = aSide; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STRIP_FRAG = `
  uniform vec3 uCol; uniform float uWhite; uniform float uPow; uniform float uGain;
  varying float vS; varying float vA;
  void main(){
    float c = 1.0 - abs(vS);
    float body = pow(c, uPow);
    float core = pow(c, 4.0) * uWhite;
    vec3 col = mix(uCol, vec3(1.0), core);
    float a = body * vA * uGain;
    a = floor(a * 6.0 + 0.5) / 6.0;
    gl_FragColor = vec4(col * a, 1.0);
  }`;

/** Camera facing (or ground flat) ribbon with soft edges. */
class Strip {
  constructor(maxPts, color, o = {}) {
    this.max = maxPts;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxPts * 2 * 3);
    this.side = new Float32Array(maxPts * 2);
    this.alpha = new Float32Array(maxPts * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    geo.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < maxPts - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCol: { value: new THREE.Color(color) },
        uWhite: { value: o.white ?? 0.6 },
        uPow: { value: o.pow ?? 1.4 },
        uGain: { value: o.gain ?? 1 },
      },
      vertexShader: STRIP_VERT,
      fragmentShader: STRIP_FRAG,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.order ?? 8;
    this.flat = !!o.flat;
    this.mesh.visible = false;
  }

  build(pts, widths, alphas, cam) {
    const n = Math.min(pts.length, this.max);
    if (n < 2) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      let tz = b.z - a.z;
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      let sx;
      let sy;
      let sz;
      if (this.flat) {
        sx = -tz;
        sy = 0;
        sz = tx;
      } else {
        const vx = cam.x - p.x;
        const vy = cam.y - p.y;
        const vz = cam.z - p.z;
        sx = ty * vz - tz * vy;
        sy = tz * vx - tx * vz;
        sz = tx * vy - ty * vx;
      }
      const sl = Math.hypot(sx, sy, sz) || 1;
      const w = widths[i] / sl;
      this.pos[i * 6] = p.x - sx * w;
      this.pos[i * 6 + 1] = p.y - sy * w;
      this.pos[i * 6 + 2] = p.z - sz * w;
      this.pos[i * 6 + 3] = p.x + sx * w;
      this.pos[i * 6 + 4] = p.y + sy * w;
      this.pos[i * 6 + 5] = p.z + sz * w;
      this.side[i * 2] = -1;
      this.side[i * 2 + 1] = 1;
      this.alpha[i * 2] = alphas[i];
      this.alpha[i * 2 + 1] = alphas[i];
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSide.needsUpdate = true;
    g.attributes.aA.needsUpdate = true;
    g.setDrawRange(0, (n - 1) * 6);
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

/** Fading ribbon behind a moving object. */
class Trail {
  constructor(vfx, color, o = {}) {
    this.vfx = vfx;
    this.life = o.life ?? 0.35;
    this.width = o.width ?? 0.3;
    this.taper = o.taper ?? 1;
    this.pts = [];
    this.ending = false;
    this.dead = false;
    this.strip = new Strip(o.pts ?? 20, color, { white: o.white ?? 0.5, pow: o.pow ?? 1.3, gain: o.gain ?? 1, flat: o.flat, order: 8 });
    vfx.scene.add(this.strip.mesh);
    this.minStep = o.step ?? 0.04;
  }

  add(x, y, z) {
    const f = this.pts[0];
    if (f && Math.hypot(f.x - x, f.y - y, f.z - z) < this.minStep) {
      f.x = x;
      f.y = y;
      f.z = z;
      return;
    }
    this.pts.unshift({ x, y, z, age: 0 });
    if (this.pts.length > this.strip.max) this.pts.pop();
  }

  end() {
    this.ending = true;
  }

  update(dt, cam) {
    const pts = this.pts;
    for (const p of pts) p.age += dt;
    while (pts.length && pts[pts.length - 1].age > this.life) pts.pop();
    if (this.ending && !pts.length) {
      this.dead = true;
      return;
    }
    const w = [];
    const a = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const k = 1 - pts[i].age / this.life;
      w.push(this.width * Math.pow(Math.max(0, k), this.taper) * (0.25 + 0.75 * k));
      a.push(k);
    }
    this.strip.build(pts, w, a, cam);
  }

  dispose() {
    this.strip.dispose(this.vfx.scene);
  }
}

const RING_FRAG = `
  uniform vec3 uCol; uniform float uA; uniform float uThick; uniform float uFill;
  varying vec2 vUv;
  void main(){
    float r = length(vUv - 0.5) * 2.0;
    float outer = 1.0 - smoothstep(0.94, 1.0, r);
    float inner = smoothstep(1.0 - uThick - 0.06, 1.0 - uThick, r);
    float band = inner * outer;
    float fill = uFill * (1.0 - r) * outer;
    float a = (band + fill) * uA;
    a = floor(a * 5.0 + 0.5) / 5.0;
    gl_FragColor = vec4(uCol * a, 1.0);
  }`;

/**
 * Layered effects for skills and spells: pixel glows, additive embers, ground rings,
 * ribbons, bolts, pillars, domes and slash arcs. Everything is drawn additively over
 * the toon world so it reads as bright, chunky light.
 */
export class VFX {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.density = game.quality?.density ?? 1;
    this.tex = pixelGlowTexture();
    this.time = 0;
    this.glows = [];
    this.frameGlows = [];
    this.hots = [];
    this.actors = [];
    this.trails = [];
    this.decals = [];
    this.rings = [];
    this.cam = new THREE.Vector3();
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.c = new THREE.Color();
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.planeGeo = new THREE.PlaneGeometry(1, 1);
    this.circleGeo = new THREE.CircleGeometry(1, 10);
    this.initGlowMesh();
    this.initHotMesh();
    this.initRings();
    this.light = new THREE.PointLight(0xffffff, 0, 14, 1.4);
    this.scene.add(this.light);
    this.lightT = 0;
    this.lightMax = 0.2;
    this.lightPeak = 0;
  }

  n(count) {
    return Math.max(1, Math.round(count * this.density));
  }

  /* ----------------------------- glow sprites ----------------------------- */
  initGlowMesh() {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uMap: { value: this.tex } },
      vertexShader: `varying vec2 vUv; varying vec3 vCol;
        void main(){
          vUv = uv;
          vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float s = length(instanceMatrix[0].xyz);
          vec4 mv = viewMatrix * wp;
          mv.xy += position.xy * s;
          gl_Position = projectionMatrix * mv;
          vCol = instanceColor;
        }`,
      fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; varying vec3 vCol;
        void main(){ float a = texture2D(uMap, vUv).a; gl_FragColor = vec4(vCol * a * 0.8, 1.0); }`,
    });
    this.glowMesh = new THREE.InstancedMesh(this.planeGeo, mat, MAX_GLOW);
    this.glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glowMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOW * 3), 3);
    this.glowMesh.frustumCulled = false;
    this.glowMesh.renderOrder = 9;
    this.glowMesh.count = 0;
    this.scene.add(this.glowMesh);
  }

  glow(x, y, z, color, size, life = 0.3, o = {}) {
    if (this.glows.length >= MAX_GLOW - 40) this.glows.shift();
    this.c.set(color);
    this.glows.push({
      x, y, z, r: this.c.r, g: this.c.g, b: this.c.b, size, life, max: life,
      grow: o.grow ?? 0.5, pow: o.pow ?? 1.5, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      gain: o.gain ?? 1, age: -(o.delay || 0), pop: o.pop ?? 0,
    });
  }

  /** A glow drawn for one frame only (projectile heads, auras). */
  glowNow(x, y, z, color, size, gain = 1) {
    this.c.set(color);
    this.frameGlows.push({ x, y, z, r: this.c.r * gain, g: this.c.g * gain, b: this.c.b * gain, size });
  }

  /* ----------------------------- hot embers ----------------------------- */
  initHotMesh() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.hotMesh = new THREE.InstancedMesh(this.boxGeo, mat, MAX_HOT);
    this.hotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hotMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_HOT * 3), 3);
    this.hotMesh.frustumCulled = false;
    this.hotMesh.renderOrder = 8;
    this.hotMesh.count = 0;
    this.scene.add(this.hotMesh);
  }

  spark(x, y, z, vx, vy, vz, color, size = 0.08, life = 0.5, g = 6, drag = 0) {
    if (this.hots.length >= MAX_HOT) this.hots.shift();
    this.c.set(color);
    this.hots.push({ x, y, z, vx, vy, vz, r: this.c.r, g: this.c.g, b: this.c.b, size, life, max: life, grav: g, drag, rx: R(0, 6), rv: R(-12, 12) });
  }

  sparks(x, y, z, colors, count, speed = 3, size = 0.08, life = 0.5, g = 6, up = 0.5, drag = 0.5) {
    const cols = Array.isArray(colors) ? colors : [colors];
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const el = R(-0.3, 1);
      const sp = speed * R(0.35, 1);
      const ce = Math.sqrt(1 - Math.min(1, el * el));
      this.spark(x, y, z, Math.cos(a) * ce * sp, el * sp * 0.9 + up, Math.sin(a) * ce * sp, cols[(Math.random() * cols.length) | 0], size * R(0.6, 1.4), life * R(0.7, 1.2), g, drag);
    }
  }

  /* ----------------------------- rings ----------------------------- */
  initRings() {
    for (let i = 0; i < MAX_RINGS; i++) {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uCol: { value: new THREE.Color() }, uA: { value: 0 }, uThick: { value: 0.18 }, uFill: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: RING_FRAG,
      });
      const mesh = new THREE.Mesh(this.planeGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      this.scene.add(mesh);
      this.rings.push({ mesh, active: false, t: 0, life: 1, r0: 0, r1: 1 });
    }
  }

  /** Expanding ring. axis omitted lies flat on the ground; axis 'cam' faces the camera. */
  ring(x, y, z, o = {}) {
    let slot = this.rings.find((r) => !r.active);
    if (!slot) slot = this.rings.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    const m = slot.mesh;
    slot.active = true;
    slot.t = -(o.delay || 0);
    slot.life = o.life ?? 0.5;
    slot.r0 = o.r0 ?? 0.2;
    slot.r1 = o.r1 ?? 3;
    slot.ease = o.ease ?? 'out';
    slot.fadePow = o.fadePow ?? 1.2;
    slot.gain = o.gain ?? 1;
    slot.follow = o.follow || null;
    slot.spin = o.spin || 0;
    const u = m.material.uniforms;
    u.uCol.value.set(o.color ?? 0xffffff);
    u.uThick.value = o.thick ?? 0.16;
    u.uFill.value = o.fill ?? 0;
    u.uA.value = 0;
    m.position.set(x, y, z);
    m.rotation.set(0, 0, 0);
    if (!o.axis) m.rotation.x = -Math.PI / 2;
    else if (o.axis === 'cam') m.lookAt(this.cam);
    else m.lookAt(x + o.axis.x, y + o.axis.y, z + o.axis.z);
    m.scale.setScalar(slot.r0 * 2);
    m.visible = o.delay ? false : true;
    return slot;
  }

  /* ----------------------------- decals ----------------------------- */
  scorch(x, z, radius, color = 0x000000, opacity = 0.4, life = 4) {
    const w = this.game.world;
    const y = w.heightAt(x, z) + 0.04;
    if (this.decals.length >= 14) this.dropDecal(this.decals.shift());
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(this.circleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = R(0, TAU);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(radius);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.decals.push({ mesh, t: 0, life, base: opacity, grow: radius });
  }

  dropDecal(d) {
    this.scene.remove(d.mesh);
    d.mesh.material.dispose();
  }

  /* ----------------------------- light ----------------------------- */
  flash(x, y, z, color, intensity = 3, life = 0.25) {
    this.light.position.set(x, y, z);
    this.light.color.set(color);
    if (intensity >= this.lightPeak * (this.lightT / this.lightMax)) {
      this.lightPeak = intensity;
      this.lightT = life;
      this.lightMax = life;
    }
  }

  /* ----------------------------- trails and strips ----------------------------- */
  trail(color, o = {}) {
    const t = new Trail(this, color, o);
    this.trails.push(t);
    return t;
  }

  makeStrip(maxPts, color, o) {
    const s = new Strip(maxPts, color, o);
    this.scene.add(s.mesh);
    return s;
  }

  /* ----------------------------- actors ----------------------------- */
  add(actor) {
    actor.t = actor.t ?? 0;
    this.actors.push(actor);
    return actor;
  }

  /** Jagged lightning between two points. */
  bolt(a, b, o = {}) {
    const seg = o.seg ?? 9;
    const main = this.makeStrip(seg + 1, o.color ?? 0xb5e3ff, { white: 1, pow: 1.2, order: 10, gain: 1.15 });
    const branches = [];
    const nb = o.branches ?? 1;
    for (let i = 0; i < nb; i++) branches.push(this.makeStrip(5, o.color ?? 0xb5e3ff, { white: 0.8, pow: 1.3, order: 10 }));
    const width = o.width ?? 0.18;
    const jag = o.jag ?? 0.38;
    const life = o.life ?? 0.24;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    let px = uy === 0 && ux === 0 ? 1 : -uz;
    let pz = uy === 0 && ux === 0 ? 0 : ux;
    const pl = Math.hypot(px, pz) || 1;
    px /= pl;
    pz /= pl;
    const p2x = uy * pz;
    const p2y = uz * px - ux * pz;
    const p2z = -uy * px;
    let acc = 0;
    const self = {
      life,
      update: (dt) => {
        const k = self.t / life;
        if (k >= 1) return false;
        acc += dt;
        if (acc >= 0.04 || !self.pts) {
          acc = 0;
          const pts = [];
          for (let i = 0; i <= seg; i++) {
            const u = i / seg;
            const e = Math.sin(Math.PI * u);
            const j1 = R(-1, 1) * jag * e * Math.min(1.4, len * 0.18 + 0.4);
            const j2 = R(-1, 1) * jag * e * Math.min(1.4, len * 0.18 + 0.4);
            pts.push({ x: a.x + dx * u + px * j1 + p2x * j2, y: a.y + dy * u + p2y * j2 + R(-0.03, 0.03), z: a.z + dz * u + pz * j1 + p2z * j2 });
          }
          self.pts = pts;
          branches.forEach((br) => {
            const s = pts[1 + ((Math.random() * (seg - 2)) | 0)];
            const bp = [];
            const dir = R(0, TAU);
            const bl = R(0.5, 1.4) * Math.min(1.6, len * 0.35);
            for (let i = 0; i < 5; i++) {
              const u = i / 4;
              bp.push({ x: s.x + Math.cos(dir) * bl * u + R(-0.1, 0.1), y: s.y + R(-0.5, 0.5) * u * bl - 0.2 * u * bl, z: s.z + Math.sin(dir) * bl * u + R(-0.1, 0.1) });
            }
            self.bpts = self.bpts || [];
            self.bpts[branches.indexOf(br)] = bp;
          });
        }
        const fl = 0.65 + 0.35 * Math.sin(self.t * 90);
        const fade = Math.pow(1 - k, 0.8) * fl;
        const w = [];
        const al = [];
        self.pts.forEach((_, i) => {
          const e = Math.sin(Math.PI * (i / seg)) * 0.5 + 0.5;
          w.push(width * (0.5 + e * 0.7) * (1 - k * 0.5));
          al.push(fade);
        });
        main.build(self.pts, w, al, this.cam);
        branches.forEach((br, bi) => {
          const bp = self.bpts?.[bi];
          if (!bp) return;
          br.build(bp, [width * 0.55, width * 0.45, width * 0.35, width * 0.25, width * 0.1], [fade, fade * 0.9, fade * 0.7, fade * 0.45, 0], this.cam);
        });
        return true;
      },
      dispose: () => {
        main.dispose(this.scene);
        branches.forEach((br) => br.dispose(this.scene));
      },
    };
    this.add(self);
    return self;
  }

  /** Straight bright streak that fades (rail shots, tracers). */
  streak(a, b, o = {}) {
    const strip = this.makeStrip(2, o.color ?? 0xffffff, { white: 1, pow: 1.1, order: 10, flat: o.flat });
    const width = o.width ?? 0.14;
    const life = o.life ?? 0.2;
    const pts = [a, b];
    return this.add({
      update: function (dt) {
        const k = this.t / life;
        if (k >= 1) return false;
        const f = 1 - k;
        strip.build(pts, [width * f, width * f * 0.6], [f, f * 0.7], this.vfx.cam);
        return true;
      },
      vfx: this,
      dispose: () => strip.dispose(this.scene),
    });
  }

  /**
   * Stacked prism that erupts out of the ground: flame pillars, ice spikes, light shafts.
   * solid draws opaque lit voxels, otherwise additive light.
   */
  prism(x, y, z, o = {}) {
    const segs = o.segs ?? 4;
    const w0 = o.w ?? 0.5;
    const h = o.h ?? 2;
    const taper = o.taper ?? 0.6;
    const solid = !!o.solid;
    const grp = new THREE.Group();
    const mats = [];
    const meshes = [];
    const base = new THREE.Color(o.color ?? 0xff8a1e);
    const core = new THREE.Color(o.core ?? 0xfff2b0);
    for (let i = 0; i < segs; i++) {
      const u = i / segs;
      const w = w0 * (1 - u * (1 - taper) - u * u * (1 - taper) * 0.6);
      const sh = h / segs;
      const col = base.clone().lerp(core, u * 0.85);
      const mat = solid
        ? new THREE.MeshBasicMaterial({ color: col })
        : new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o.alpha ?? 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.scale.set(w, sh * 1.04, w);
      mesh.position.y = sh * (i + 0.5);
      mesh.rotation.y = R(0, TAU) * (solid ? 0.2 : 1);
      grp.add(mesh);
      mats.push(mat);
      meshes.push({ mesh, w, sh, u });
    }
    if (solid) {
      const inner = new THREE.Mesh(this.boxGeo, new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      inner.scale.set(w0 * 0.35, h * 0.9, w0 * 0.35);
      inner.position.y = h * 0.47;
      grp.add(inner);
      mats.push(inner.material);
    }
    grp.position.set(x, y, z);
    const tilt = o.tilt ?? 0;
    grp.rotation.set(R(-tilt, tilt), R(0, TAU), R(-tilt, tilt));
    grp.visible = false;
    this.scene.add(grp);
    const delay = o.delay ?? 0;
    const rise = o.rise ?? 0.14;
    const hold = o.hold ?? 0.25;
    const fall = o.fall ?? 0.3;
    const total = delay + rise + hold + fall;
    let ended = false;
    return this.add({
      update: (dt, self) => {
        const t = self.t - delay;
        if (t < 0) return true;
        grp.visible = true;
        let s;
        let fade = 1;
        if (t < rise) s = easeOutBack(t / rise);
        else if (t < rise + hold) s = 1;
        else {
          const k = (t - rise - hold) / fall;
          s = solid ? 1 - k * k * 0.5 : 1 - k * 0.6;
          fade = 1 - k;
          if (solid && !ended && k > 0.55) {
            ended = true;
            o.onShatter?.(x, y + h * 0.4, z);
          }
        }
        const fl = o.flicker ? 1 + Math.sin(self.t * 38 + x * 5) * 0.12 : 1;
        for (const m of meshes) {
          m.mesh.scale.set(m.w * fl * (solid ? 1 : 1 + Math.sin(self.t * 26 + m.u * 6) * 0.1), m.sh * 1.04 * Math.max(0.01, s) * (o.flicker ? 1 + Math.sin(self.t * 31 + m.u * 4) * 0.08 : 1), m.w * fl);
          m.mesh.position.y = m.sh * (meshes.indexOf(m) + 0.5) * Math.max(0.01, s);
        }
        if (o.flicker) grp.rotation.y += dt * 2;
        const alpha = solid ? 1 : (o.alpha ?? 0.7) * fade;
        for (const mat of mats) {
          if (!solid) mat.opacity = Math.max(0, alpha);
          else if (mat.transparent) mat.opacity = 0.55 * fade;
          else if (fade < 1) {
            mat.transparent = true;
            mat.opacity = Math.max(0, fade);
          }
        }
        return self.t < total;
      },
      dispose: () => {
        this.scene.remove(grp);
        mats.forEach((m) => m.dispose());
      },
    });
  }

  /** Faceted energy bubble that follows a position getter. */
  dome(follow, o = {}) {
    const radius = o.radius ?? 1.5;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: new THREE.Color(o.color ?? 0x9fd8ff) }, uA: { value: 0 }, uTime: { value: 0 }, uHit: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uA; uniform float uTime; uniform float uHit; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          float band = step(0.82, fract(vW.y * 2.4 - uTime * 0.9)) * 0.35;
          float a = (f * 0.9 + 0.1 + band * f + uHit * 0.5) * uA;
          a = floor(a * 6.0 + 0.5) / 6.0;
          gl_FragColor = vec4(mix(uCol, vec3(1.0), f * 0.4 + uHit * 0.5) * a, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
    mesh.renderOrder = 7;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const life = o.life ?? 5;
    const self = {
      mat,
      t: 0,
      hit: () => (mat.uniforms.uHit.value = 1),
      stop: () => (self.t = Math.max(self.t, life - 0.3)),
      update: (dt) => {
        const pos = follow();
        if (!pos) return false;
        const k = self.t / life;
        if (k >= 1) return false;
        const grow = easeOutBack(Math.min(1, self.t / 0.22));
        const out = k > 0.9 ? 1 - (k - 0.9) / 0.1 : 1;
        mesh.position.set(pos.x, pos.y + (o.lift ?? 1), pos.z);
        const pulse = 1 + Math.sin(self.t * 5) * 0.025;
        mesh.scale.set(radius * grow * pulse, radius * grow * pulse * (o.squash ?? 1.18), radius * grow * pulse);
        mesh.rotation.y += dt * 0.6;
        mat.uniforms.uA.value = Math.max(0, out) * (0.8 + Math.sin(self.t * 7) * 0.08);
        mat.uniforms.uTime.value = self.t;
        mat.uniforms.uHit.value = Math.max(0, mat.uniforms.uHit.value - dt * 5);
        if (Math.random() < dt * 14 * this.density) {
          const a = R(0, TAU);
          this.spark(pos.x + Math.cos(a) * radius * 0.9, pos.y + R(0.2, 1.8), pos.z + Math.sin(a) * radius * 0.9, 0, R(0.4, 1.2), 0, o.color ?? 0x9fd8ff, 0.06, 0.6, -0.5);
        }
        return true;
      },
      dispose: () => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mat.dispose();
      },
    };
    this.add(self);
    return self;
  }

  /**
   * Crescent slash. sweep is the arc length in radians, tilt rolls the plane around the
   * facing axis so a swing can run flat, diagonal or overhead. spin keeps the arc turning.
   */
  slashArc(x, y, z, yaw, o = {}) {
    const radius = o.radius ?? 1.8;
    const thick = o.thick ?? 0.7;
    const sweep = o.sweep ?? 2.2;
    const steps = 22;
    const pos = [];
    const uvs = [];
    const idx = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = (u - 0.5) * sweep;
      const w = Math.pow(Math.sin(Math.PI * u), 0.7) * thick;
      const ro = radius;
      const ri = radius - w;
      pos.push(Math.sin(a) * ri, 0, Math.cos(a) * ri, Math.sin(a) * ro, 0, Math.cos(a) * ro);
      uvs.push(u, 0, u, 1);
      if (i < steps) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: new THREE.Color(o.color ?? 0xfff2c0) }, uHot: { value: new THREE.Color(o.hot ?? 0xffffff) }, uHead: { value: 0 }, uA: { value: 1 }, uTail: { value: o.tail ?? 0.7 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; uniform vec3 uHot; uniform float uHead; uniform float uA; uniform float uTail; varying vec2 vUv;
        void main(){
          float behind = uHead - vUv.x;
          float tail = clamp(1.0 - behind / uTail, 0.0, 1.0) * step(0.0, behind);
          float edge = pow(vUv.y, 1.6);
          float a = tail * (0.25 + edge * 0.9) * uA;
          a = floor(a * 6.0 + 0.5) / 6.0;
          vec3 col = mix(uCol, uHot, edge * tail * 0.9);
          gl_FragColor = vec4(col * a * 1.25, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 8;
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    mesh.rotation.z = o.tilt ?? 0;
    mesh.rotation.y = o.flip === -1 ? 0 : 0;
    mesh.scale.x = o.flip === -1 ? -1 : 1;
    mesh.position.z = o.forward ?? 0;
    root.add(mesh);
    this.scene.add(root);
    const life = o.life ?? 0.26;
    const sweepT = o.sweepT ?? life * 0.62;
    return this.add({
      update: (dt, self) => {
        const k = self.t / life;
        if (k >= 1) return false;
        const head = Math.min(1.35, (self.t / sweepT) * 1.35);
        mat.uniforms.uHead.value = head;
        mat.uniforms.uA.value = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
        if (o.spin) root.rotation.y += o.spin * dt;
        if (o.follow) {
          const p = o.follow();
          if (p) root.position.set(p.x, p.y + (o.lift ?? 0), p.z);
        }
        root.scale.setScalar(1 + k * (o.grow ?? 0.12));
        return true;
      },
      dispose: () => {
        this.scene.remove(root);
        geo.dispose();
        mat.dispose();
      },
    });
  }

  /** Hit flare on the struck target. White is small so it does not wash out the hunter. */
  hit(x, y, z, dx, dz, color = 0xffe27a, power = 1) {
    const col = Array.isArray(color) ? color[0] : color;
    this.glow(x, y, z, 0xffffff, 0.28 + power * 0.1, 0.07, { grow: 0.2, pow: 1.1, gain: 0.4 });
    this.glow(x, y, z, col, 0.7 + power * 0.22, 0.16, { grow: 0.35, gain: 0.65 });
    this.ring(x, y, z, { axis: 'cam', color: col, r0: 0.1, r1: 0.38 + power * 0.18, life: 0.16, thick: 0.16, fill: 0.18 });
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l;
    const uz = dz / l;
    const n = this.n(5 + power * 4);
    for (let i = 0; i < n; i++) {
      const a = R(-0.8, 0.8);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const sp = R(5, 11) * (0.7 + power * 0.3);
      this.spark(x, y, z, (ux * ca - uz * sa) * sp, R(0, 3), (ux * sa + uz * ca) * sp, i % 3 === 0 ? 0xffffff : col, R(0.04, 0.08), R(0.16, 0.32), 9, 1.2);
    }
  }

  /* ----------------------------- update ----------------------------- */
  update(dt, camera) {
    this.time += dt;
    this.cam.copy(camera.position);

    if (this.lightT > 0) {
      this.lightT -= dt;
      const k = Math.max(0, this.lightT / this.lightMax);
      this.light.intensity = this.lightPeak * k * k;
      if (this.lightT <= 0) this.lightPeak = 0;
    } else this.light.intensity = 0;

    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      if (r.t < 0) continue;
      const k = r.t / r.life;
      if (k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.visible = true;
      const e = r.ease === 'out' ? easeOut(k) : r.ease === 'lin' ? k : k * k;
      r.mesh.scale.setScalar((r.r0 + (r.r1 - r.r0) * e) * 2);
      r.mesh.material.uniforms.uA.value = Math.pow(1 - k, r.fadePow) * Math.min(1, k * 14) * r.gain;
      if (r.follow) {
        const p = r.follow();
        if (p) r.mesh.position.set(p.x, p.y, p.z);
      }
      if (r.spin) r.mesh.rotation.z += r.spin * dt;
    }

    for (let i = this.actors.length - 1; i >= 0; i--) {
      const a = this.actors[i];
      a.t += dt;
      if (!a.update(dt, a)) {
        a.dispose?.();
        this.actors.splice(i, 1);
      }
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.update(dt, this.cam);
      if (t.dead) {
        t.dispose();
        this.trails.splice(i, 1);
      }
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.t += dt;
      const k = d.t / d.life;
      if (k >= 1) {
        this.dropDecal(d);
        this.decals.splice(i, 1);
        continue;
      }
      d.mesh.material.opacity = d.base * (k < 0.08 ? k / 0.08 : 1 - Math.max(0, (k - 0.5) / 0.5));
      d.mesh.scale.setScalar(d.grow * (0.7 + 0.3 * Math.min(1, d.t * 6)));
    }

    // glow sprites
    const gl = this.glows;
    let n = 0;
    for (let i = gl.length - 1; i >= 0; i--) {
      const g = gl[i];
      g.age += dt;
      if (g.age >= g.max) {
        gl[i] = gl[gl.length - 1];
        gl.pop();
      }
    }
    const gm = this.glowMesh;
    const gcol = gm.instanceColor.array;
    for (const g of gl) {
      if (g.age < 0) continue;
      const k = g.age / g.max;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.z += g.vz * dt;
      const a = Math.pow(1 - k, g.pow) * Math.min(1, 1 + g.pop - (1 - k) * 0 + k * 12) * g.gain;
      const sz = g.size * (1 + g.grow * k) * (g.pop ? 0.6 + 0.4 * Math.min(1, k * 8) : 1);
      this.v.set(g.x, g.y, g.z);
      this.s.set(sz, sz, sz);
      this.m4.compose(this.v, this.q.identity(), this.s);
      gm.setMatrixAt(n, this.m4);
      gcol[n * 3] = g.r * a;
      gcol[n * 3 + 1] = g.g * a;
      gcol[n * 3 + 2] = g.b * a;
      n++;
    }
    for (const g of this.frameGlows) {
      if (n >= MAX_GLOW) break;
      this.v.set(g.x, g.y, g.z);
      this.s.set(g.size, g.size, g.size);
      this.m4.compose(this.v, this.q.identity(), this.s);
      gm.setMatrixAt(n, this.m4);
      gcol[n * 3] = g.r;
      gcol[n * 3 + 1] = g.g;
      gcol[n * 3 + 2] = g.b;
      n++;
    }
    this.frameGlows.length = 0;
    gm.count = n;
    gm.instanceMatrix.needsUpdate = true;
    gm.instanceColor.needsUpdate = true;

    // hot embers
    const hs = this.hots;
    for (let i = hs.length - 1; i >= 0; i--) {
      const p = hs[i];
      p.life -= dt;
      if (p.life <= 0) {
        hs[i] = hs[hs.length - 1];
        hs.pop();
      }
    }
    const hm = this.hotMesh;
    const hcol = hm.instanceColor.array;
    let h = 0;
    for (const p of hs) {
      p.vy -= p.grav * dt;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
        p.vz *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += p.rv * dt;
      const k = p.life / p.max;
      const sc = p.size * (0.35 + k * 0.65);
      this.e.set(p.rx, p.rx * 0.7, 0);
      this.q.setFromEuler(this.e);
      this.v.set(p.x, p.y, p.z);
      this.s.set(sc, sc, sc);
      this.m4.compose(this.v, this.q, this.s);
      hm.setMatrixAt(h, this.m4);
      const a = Math.pow(k, 0.7);
      hcol[h * 3] = p.r * a;
      hcol[h * 3 + 1] = p.g * a;
      hcol[h * 3 + 2] = p.b * a;
      h++;
    }
    hm.count = h;
    hm.instanceMatrix.needsUpdate = true;
    hm.instanceColor.needsUpdate = true;
  }

  clear() {
    for (const a of this.actors) a.dispose?.();
    this.actors.length = 0;
    for (const t of this.trails) t.dispose();
    this.trails.length = 0;
    for (const d of this.decals) this.dropDecal(d);
    this.decals.length = 0;
    this.glows.length = 0;
    this.hots.length = 0;
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
  }
}
