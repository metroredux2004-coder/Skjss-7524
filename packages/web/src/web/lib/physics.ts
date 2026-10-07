export const KB = 1.380649e-23;
export const MASS = 6.6335209e-26; // argon mass, kg
export const BOX = 20; // nm
export const RADIUS = 0.35; // nm; dilute surrogate spheres
export const COUNT = 96;
export const DT = 0.05; // ps
export const WINDOW = 20; // ps
export type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number };
export type Sample = {
  time: number;
  temperature: number;
  pressure: number;
  idealPressure: number;
  meanSpeed: number;
  rmsSpeed: number;
  wallRate: number;
  pairRate: number;
  impulse: number;
  energy: number;
  lostEnergy: number;
  addedEnergy: number;
};
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function maxwell(v: number, t: number) {
  const a = MASS / (2 * KB * t);
  return (4 / Math.sqrt(Math.PI)) * a ** 1.5 * v * v * Math.exp(-a * v * v);
}
export class Gas {
  particles: Particle[] = [];
  time = 0;
  restitution: number;
  target: number;
  thermostat: boolean;
  history: Sample[] = [];
  lostEnergy = 0;
  addedEnergy = 0;
  wallCount = 0;
  pairCount = 0;
  totalImpulse = 0;
  private windowWall = 0;
  private windowPair = 0;
  private windowImpulse = 0;
  private lastSample = 0;
  constructor(t = 300, e = 1, thermostat = false, seed = 42) {
    this.target = t;
    this.restitution = e;
    this.thermostat = thermostat;
    const rng = seeded(seed);
    const normal = () =>
      Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
    const sigma = Math.sqrt((KB * t) / MASS) * 0.001;
    for (let i = 0; i < COUNT; i++) {
      let x: number, y: number, z: number;
      do {
        x = RADIUS + rng() * (BOX - 2 * RADIUS);
        y = RADIUS + rng() * (BOX - 2 * RADIUS);
        z = RADIUS + rng() * (BOX - 2 * RADIUS);
      } while (
        this.particles.some(
          (p) => (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2 < (2 * RADIUS) ** 2,
        )
      );
      this.particles.push({
        x,
        y,
        z,
        vx: normal() * sigma,
        vy: normal() * sigma,
        vz: normal() * sigma,
      });
    }
    // Remove finite-sample drift, then condition the sample on the requested kinetic temperature.
    for (const axis of ["vx", "vy", "vz"] as const) {
      const mean = this.particles.reduce((a, p) => a + p[axis], 0) / COUNT;
      this.particles.forEach((p) => (p[axis] -= mean));
    }
    this.rescale(t);
  }
  energy() {
    return this.particles.reduce(
      (a, p) => a + ((p.vx * p.vx + p.vy * p.vy + p.vz * p.vz) * 1e6 * MASS) / 2,
      0,
    );
  }
  temperature() {
    return (this.energy() * 2) / (3 * COUNT * KB);
  }
  rescale(t: number) {
    const old = this.energy();
    const s = Math.sqrt((3 * COUNT * KB * t) / (2 * old));
    this.particles.forEach((p) => {
      p.vx *= s;
      p.vy *= s;
      p.vz *= s;
    });
    return this.energy() - old;
  }
  advance(duration: number, dt = DT) {
    const steps = Math.round(duration / dt);
    for (let i = 0; i < steps; i++) this.step(dt);
  }
  step(dt = DT) {
    const ps = this.particles;
    for (const p of ps) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      for (const [pos, vel] of [
        ["x", "vx"],
        ["y", "vy"],
        ["z", "vz"],
      ] as const) {
        if ((p[pos] < RADIUS && p[vel] < 0) || (p[pos] > BOX - RADIUS && p[vel] > 0)) {
          const impulse = 2 * MASS * Math.abs(p[vel]) * 1000;
          this.windowImpulse += impulse;
          this.totalImpulse += impulse;
          this.windowWall++;
          this.wallCount++;
          p[pos] = p[pos] < RADIUS ? 2 * RADIUS - p[pos] : 2 * (BOX - RADIUS) - p[pos];
          p[vel] *= -1;
        }
      }
    }
    const diameter = 2 * RADIUS,
      d2 = diameter * diameter;
    for (let i = 0; i < COUNT; i++)
      for (let j = i + 1; j < COUNT; j++) {
        const a = ps[i],
          b = ps[j];
        const dx = a.x - b.x;
        if (Math.abs(dx) >= diameter) continue;
        const dy = a.y - b.y;
        if (Math.abs(dy) >= diameter) continue;
        const dz = a.z - b.z;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 >= d2 || r2 === 0) continue;
        const d = Math.sqrt(r2),
          nx = dx / d,
          ny = dy / d,
          nz = dz / d;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
        const shift = (diameter - d) / 2 + 1e-10;
        a.x += nx * shift;
        a.y += ny * shift;
        a.z += nz * shift;
        b.x -= nx * shift;
        b.y -= ny * shift;
        b.z -= nz * shift;
        if (rel >= 0) continue;
        const impulse = ((1 + this.restitution) * rel) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        a.vz -= impulse * nz;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        b.vz += impulse * nz;
        this.lostEnergy += (MASS / 4) * (1 - this.restitution ** 2) * rel * rel * 1e6;
        this.windowPair++;
        this.pairCount++;
      }
    if (this.thermostat) this.addedEnergy += this.rescale(this.target);
    this.time += dt;
    if (this.time - this.lastSample >= WINDOW - 1e-8) {
      this.history.push(this.snapshot(this.time - this.lastSample));
      this.lastSample = this.time;
      this.windowImpulse = 0;
      this.windowWall = 0;
      this.windowPair = 0;
    }
  }
  snapshot(window = WINDOW): Sample {
    const energy = this.energy(),
      temperature = (energy * 2) / (3 * COUNT * KB);
    return {
      time: this.time,
      temperature,
      energy,
      pressure: this.windowImpulse / (6 * (BOX * 1e-9) ** 2 * window * 1e-12) / 1000,
      idealPressure: (COUNT * KB * temperature) / (BOX * 1e-9) ** 3 / 1000,
      meanSpeed:
        this.particles.reduce((a, p) => a + Math.hypot(p.vx, p.vy, p.vz) * 1000, 0) / COUNT,
      rmsSpeed: Math.sqrt((2 * energy) / (COUNT * MASS)),
      wallRate: this.windowWall / window,
      pairRate: this.windowPair / window,
      impulse: this.windowWall ? this.windowImpulse / this.windowWall : 0,
      lostEnergy: this.lostEnergy,
      addedEnergy: this.addedEnergy,
    };
  }
  speeds() {
    return this.particles.map((p) => Math.hypot(p.vx, p.vy, p.vz) * 1000);
  }
}
