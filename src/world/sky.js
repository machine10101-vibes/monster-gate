import * as THREE from 'three';
import { buildCloud } from './models.js';
import { GeometryBatch, RNG, clamp, smoothstep, lerp } from '../engine/voxel.js';

const KEYS = [
  { h: 0, top: 0x070b24, hor: 0x16204a, fog: 0x121a3a, sun: 0x7f95ff, si: 0.55, hs: 0x2c3c86, hg: 0x161a38, hi: 0.95, exp: 1.0 },
  { h: 5, top: 0x1c2552, hor: 0x5a4a7e, fog: 0x4a4670, sun: 0xb090c0, si: 0.6, hs: 0x4a4a8a, hg: 0x2a2640, hi: 0.9, exp: 1.0 },
  { h: 6.5, top: 0x4a64a8, hor: 0xffa87a, fog: 0xe0a898, sun: 0xffb078, si: 1.7, hs: 0x9ab0e0, hg: 0x6a5a58, hi: 1.0, exp: 1.0 },
  { h: 8.5, top: 0x3f9cf0, hor: 0xbfe4ff, fog: 0xc6e2f4, sun: 0xfff0d2, si: 3.0, hs: 0xa6d2ff, hg: 0x6c7a58, hi: 1.25, exp: 1.0 },
  { h: 12, top: 0x2f8ef0, hor: 0xb4e2ff, fog: 0xbfe0f4, sun: 0xfff7e6, si: 3.3, hs: 0xa6d6ff, hg: 0x6f8058, hi: 1.35, exp: 1.0 },
  { h: 16.5, top: 0x3c8ee6, hor: 0xffe8c0, fog: 0xe6dcc4, sun: 0xffe0aa, si: 3.0, hs: 0xa2c8f4, hg: 0x7a7050, hi: 1.25, exp: 1.0 },
  { h: 18.7, top: 0x4a4f9a, hor: 0xff8a58, fog: 0xd89080, sun: 0xff8a50, si: 1.7, hs: 0x9a90d0, hg: 0x5a4a50, hi: 1.0, exp: 1.0 },
  { h: 20.3, top: 0x1c2458, hor: 0x5a4a88, fog: 0x3a3a70, sun: 0x8090ff, si: 0.7, hs: 0x4a54a8, hg: 0x2a2848, hi: 0.95, exp: 1.0 },
  { h: 22, top: 0x0a1030, hor: 0x1a2250, fog: 0x151d40, sun: 0x7f95ff, si: 0.55, hs: 0x2c3c86, hg: 0x161a38, hi: 0.95, exp: 1.0 },
  { h: 24, top: 0x070b24, hor: 0x16204a, fog: 0x121a3a, sun: 0x7f95ff, si: 0.55, hs: 0x2c3c86, hg: 0x161a38, hi: 0.95, exp: 1.0 },
];
KEYS.forEach((k) => {
  for (const f of ['top', 'hor', 'fog', 'sun', 'hs', 'hg']) k[f] = new THREE.Color(k[f]);
});

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;
    this.hour = 10.2;
    this.quality = quality;
    this.night = 0;

    this.fog = new THREE.Fog(0xbfe0f4, 34, 150);
    scene.fog = this.fog;
    scene.background = new THREE.Color(0xbfe0f4);

    this.hemi = new THREE.HemisphereLight(0xa6d6ff, 0x6f8058, 1.3);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff0d2, 3);
    this.sun.castShadow = true;
    const s = quality.shadowSize;
    this.sun.shadow.mapSize.set(s, s);
    const ext = quality.shadowExtent;
    const cam = this.sun.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 1;
    cam.far = 140;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.shadowExtent = ext;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.torchLights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffa850, 0, 9, 1.6);
      scene.add(l);
      this.torchLights.push(l);
    }

    const geo = new THREE.SphereGeometry(300, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uHor: { value: new THREE.Color() },
        uSun: { value: new THREE.Vector3(0, 1, 0) },
        uMoon: { value: new THREE.Vector3(0, -1, 0) },
        uSunCol: { value: new THREE.Color() },
        uNight: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uMoon; uniform vec3 uSunCol; uniform float uNight; uniform float uTime;
        varying vec3 vDir;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float square(vec3 d, vec3 c, float size){
          if (dot(d, c) < 0.0) return 0.0;
          vec3 r = normalize(cross(vec3(0.0,1.0,0.0), c));
          vec3 u = cross(c, r);
          vec2 p = vec2(dot(d, r), dot(d, u));
          p = floor(p * 90.0) / 90.0;
          return step(abs(p.x), size) * step(abs(p.y), size);
        }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHor, uTop, pow(h, 0.55));
          float glow = pow(max(dot(d, uSun), 0.0), 18.0);
          col += uSunCol * glow * 0.32 * (1.0 - uNight);
          float below = smoothstep(0.0, -0.25, d.y);
          col = mix(col, uHor * 0.9, below);
          vec3 sd = floor(d * 120.0);
          float star = step(0.9965, h31(sd)) * smoothstep(0.1, 0.5, d.y) * uNight;
          star *= 0.6 + 0.4 * sin(uTime * 2.0 + h31(sd + 3.0) * 20.0);
          col += vec3(star);
          float sunD = square(d, uSun, 0.035) * (1.0 - uNight * 0.9);
          col = mix(col, vec3(1.0, 0.97, 0.82), sunD);
          float moonD = square(d, uMoon, 0.03) * uNight;
          col = mix(col, vec3(0.88, 0.92, 1.0), moonD);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.skyMesh = new THREE.Mesh(geo, this.skyMat);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -10;
    scene.add(this.skyMesh);

    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.clouds = new THREE.Group();
    const rng = new RNG(77);
    for (let i = 0; i < 14; i++) {
      const parts = buildCloud(i + 1);
      const mesh = new THREE.Mesh(parts[0].geo, this.cloudMat);
      mesh.scale.setScalar(rng.range(0.55, 1.0));
      mesh.position.set(rng.range(-30, 190), rng.range(46, 62), rng.range(-30, 190));
      mesh.userData.speed = rng.range(0.4, 0.9);
      this.clouds.add(mesh);
    }
    scene.add(this.clouds);

    this.tmpA = new THREE.Color();
    this.tmpB = new THREE.Color();
    this.state = {};
  }

  setHour(h) {
    this.hour = ((h % 24) + 24) % 24;
  }

  sample() {
    const h = this.hour;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = clamp((h - a.h) / (b.h - a.h), 0, 1);
    const mixc = (k) => new THREE.Color().copy(a[k]).lerp(b[k], t);
    return {
      top: mixc('top'), hor: mixc('hor'), fog: mixc('fog'), sun: mixc('sun'), hs: mixc('hs'), hg: mixc('hg'),
      si: lerp(a.si, b.si, t), hi: lerp(a.hi, b.hi, t),
    };
  }

  update(dt, time, focus, camera) {
    const s = this.sample();
    const h = this.hour;
    const night = clamp(smoothstep(18.6, 20.6, h) + 1 - smoothstep(4.6, 6.6, h), 0, 1);
    this.night = night;

    const ang = ((h - 6) / 12) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.9, Math.sin(ang), 0.42).normalize();
    const moonDir = sunDir.clone().multiplyScalar(-1);
    const lightDir = sunDir.y > -0.05 ? sunDir.clone() : moonDir.clone();
    if (lightDir.y < 0.2) {
      lightDir.y = 0.2 + (0.2 - lightDir.y) * 0.0;
      lightDir.normalize();
    }

    this.sun.color.copy(s.sun);
    this.sun.intensity = s.si;
    const snap = (2 * this.shadowExtent) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / snap) * snap;
    const fy = Math.round(focus.y / snap) * snap;
    const fz = Math.round(focus.z / snap) * snap;
    this.sun.target.position.set(fx, fy, fz);
    this.sun.position.set(fx + lightDir.x * 60, fy + lightDir.y * 60, fz + lightDir.z * 60);

    this.hemi.color.copy(s.hs);
    this.hemi.groundColor.copy(s.hg);
    this.hemi.intensity = s.hi;

    this.fog.color.copy(s.fog);
    this.scene.background.copy(s.fog);
    if (this.indoors) {
      this.fog.color.setHex(0x16101f);
      this.scene.background.setHex(0x100c16);
      this.fog.near = 6;
      this.fog.far = 26;
      this.sun.intensity *= 0.08;
      this.hemi.intensity *= 0.28;
      this.skyMesh.visible = false;
      this.clouds.visible = false;
    } else {
      this.fog.near = 34;
      this.fog.far = 150;
      this.skyMesh.visible = true;
      this.clouds.visible = true;
    }

    const u = this.skyMat.uniforms;
    u.uTop.value.copy(s.top);
    u.uHor.value.copy(s.hor);
    u.uSun.value.copy(sunDir);
    u.uMoon.value.copy(moonDir);
    u.uSunCol.value.copy(s.sun);
    u.uNight.value = night;
    u.uTime.value = time;
    this.skyMesh.position.copy(camera.position);

    const cloudBright = clamp(0.25 + s.hi * 0.55, 0.3, 1);
    this.cloudMat.color.setRGB(cloudBright * (0.9 + (1 - night) * 0.1), cloudBright, cloudBright * (1 + night * 0.25));
    for (const c of this.clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 200) c.position.x = -50;
    }
    this.state = { night, sunDir, lightDir, ...s };
  }

  assignTorchLights(spots, px, pz) {
    const near = [];
    for (const sp of spots) {
      const d = (sp.x - px) ** 2 + (sp.z - pz) ** 2;
      if (d < 20 * 20) near.push({ sp, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.torchLights.length; i++) {
      const l = this.torchLights[i];
      const n = near[i];
      if (!n) {
        l.intensity = 0;
        continue;
      }
      l.position.set(n.sp.x, n.sp.y + 0.2, n.sp.z);
      l.color.set(n.sp.color);
      const base = this.indoors ? 4.4 : 0.35 + this.night * 5.0;
      l.intensity = base * (0.92 + Math.sin(performance.now() * 0.013 + i * 3) * 0.08);
    }
  }
}

export { GeometryBatch };
