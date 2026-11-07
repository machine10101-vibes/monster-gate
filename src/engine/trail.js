import * as THREE from 'three';

const MAX = 18;

/** Additive ribbon that follows a weapon edge while a swing is active. */
export class WeaponTrail {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 2 * 3);
    this.alpha = new Float32Array(MAX * 2);
    this.uvx = new Float32Array(MAX * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('aEdge', new THREE.BufferAttribute(this.uvx, 1));
    const idx = [];
    for (let i = 0; i < MAX - 1; i++) {
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
      uniforms: { uCol: { value: new THREE.Color(0xfff2c0) } },
      vertexShader: `attribute float aAlpha; attribute float aEdge; varying float vA; varying float vE;
        void main(){ vA = aAlpha; vE = aEdge; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; varying float vA; varying float vE;
        void main(){ float a = vA * mix(0.15, 1.0, vE); gl_FragColor = vec4(uCol * (0.7 + 0.5 * vE), a); }`,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.samples = [];
    this.life = 0.2;
  }

  setStyle(color, life = 0.2) {
    this.mat.uniforms.uCol.value.set(color);
    this.life = life;
  }

  add(base, tip) {
    const s = this.samples;
    if (s.length >= MAX) s.pop();
    s.unshift({ b: base.clone(), t: tip.clone(), age: 0 });
  }

  update(dt) {
    const s = this.samples;
    for (const k of s) k.age += dt;
    while (s.length && s[s.length - 1].age > this.life) s.pop();
    if (s.length < 2) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    for (let i = 0; i < s.length; i++) {
      const k = s[i];
      const a = Math.max(0, 1 - k.age / this.life);
      this.pos.set([k.b.x, k.b.y, k.b.z, k.t.x, k.t.y, k.t.z], i * 6);
      this.alpha[i * 2] = a * 0.2;
      this.alpha[i * 2 + 1] = a;
      this.uvx[i * 2] = 0;
      this.uvx[i * 2 + 1] = 1;
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aEdge.needsUpdate = true;
    g.setDrawRange(0, (s.length - 1) * 6);
  }

  clear() {
    this.samples.length = 0;
    this.mesh.visible = false;
  }
}
