/**
 * Second-order spring. Joints chase their pose targets with a little weight and
 * follow-through instead of snapping, which is what makes limbs read as muscle.
 */
export class Spring {
  constructor(value = 0) {
    this.x = value;
    this.v = 0;
  }

  step(target, dt, omega = 22, zeta = 0.8) {
    const n = Math.max(1, Math.ceil(dt * omega * 0.5));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = omega * omega * (target - this.x) - 2 * zeta * omega * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  snap(value) {
    this.x = value;
    this.v = 0;
  }
}

export class SpringSet {
  constructor() {
    this.s = {};
  }

  get(key) {
    return this.s[key] || (this.s[key] = new Spring());
  }

  step(key, target, dt, omega, zeta) {
    return this.get(key).step(target, dt, omega, zeta);
  }
}

export const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
