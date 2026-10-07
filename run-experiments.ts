// From app root: bun run run-experiments.ts
import { Gas, DT, KB, MASS, COUNT, BOX } from "./packages/web/src/web/lib/physics";
import { mkdirSync, writeFileSync } from "node:fs";
const out = process.env.RESULTS_DIR || "./data";
mkdirSync(out, { recursive: true });
const rows: Record<string, number | string | boolean>[] = [];
const summary: Record<string, number | string | boolean>[] = [];
const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sd = (x: number[]) => Math.sqrt(mean(x.map((v) => (v - mean(x)) ** 2)));
const tests = [];
for (const t of [150, 300, 600])
  for (const e of [1, 0.95])
    for (const seed of [42, 137, 271]) tests.push({ t, e, seed, th: false, dt: DT, kind: "main" });
for (const e of [1, 0.95])
  for (const seed of [42, 137, 271])
    tests.push({ t: 300, e, seed, th: true, dt: DT, kind: "thermostat" });
for (const dt of [0.025, 0.1])
  for (const e of [1, 0.95]) tests.push({ t: 300, e, seed: 42, th: false, dt, kind: "timestep" });
for (const { t, e, seed, th, dt, kind } of tests) {
  const g = new Gas(t, e, th, seed),
    initialEnergy = g.energy();
  const initialMean = g.snapshot().meanSpeed;
  g.advance(1000, dt);
  const early = g.history.filter((s) => s.time <= 200 + 1e-6),
    late = g.history.filter((s) => s.time >= 800 - 1e-6);
  const p = g.history.map((s) => s.pressure);
  const id = `${kind}_T${t}_e${e}_seed${seed}_dt${dt}`;
  for (const s of g.history)
    rows.push({ id, kind, initialTemperature: t, restitution: e, seed, thermostat: th, dt, ...s });
  const balance = (g.energy() + g.lostEnergy - g.addedEnergy - initialEnergy) / initialEnergy;
  if (Math.abs(balance) > 1e-9) throw new Error(`Energy balance failed ${id}: ${balance}`);
  if (e === 1 && Math.abs(g.temperature() / t - 1) > 1e-9)
    throw new Error("Elastic kinetic energy drift");
  summary.push({
    id,
    kind,
    t,
    e,
    seed,
    thermostat: th,
    dt,
    initialMeanSpeed: initialMean,
    finalTemperature: g.temperature(),
    earlyPressure: mean(early.map((s) => s.pressure)),
    latePressure: mean(late.map((s) => s.pressure)),
    meanPressure: mean(p),
    pressureCV: sd(p) / mean(p),
    earlyWallRate: mean(early.map((s) => s.wallRate)),
    lateWallRate: mean(late.map((s) => s.wallRate)),
    earlyImpulse: mean(early.map((s) => s.impulse)),
    lateImpulse: mean(late.map((s) => s.impulse)),
    meanIdealPressure: mean(g.history.map((s) => s.idealPressure)),
    finalMeanSpeed: g.snapshot().meanSpeed,
    wallCount: g.wallCount,
    pairCount: g.pairCount,
    initialEnergy,
    finalEnergy: g.energy(),
    lostEnergy: g.lostEnergy,
    addedEnergy: g.addedEnergy,
    energyBalanceRelative: balance,
  });
  console.log(
    id,
    "Tfinal",
    g.temperature().toFixed(1),
    "Pearly",
    mean(early.map((s) => s.pressure)).toFixed(2),
    "Plate",
    mean(late.map((s) => s.pressure)).toFixed(2),
  );
}
function csv(data: Record<string, number | string | boolean>[]) {
  const cols = Object.keys(data[0]);
  return cols.join(",") + "\n" + data.map((r) => cols.map((c) => r[c]).join(",")).join("\n") + "\n";
}
writeFileSync(`${out}/recorded-measurements.csv`, csv(rows));
writeFileSync(`${out}/summary.csv`, csv(summary));
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2));
// Statistical check: large independent initial velocity samples approximate Maxwell moments.
const speeds = [];
for (let seed = 1; seed <= 200; seed++) speeds.push(...new Gas(300, 1, false, seed).speeds());
const observed = mean(speeds),
  expected = Math.sqrt((8 * KB * 300) / (Math.PI * MASS));
if (Math.abs(observed / expected - 1) > 0.02) throw new Error("Maxwell mean speed check failed");
writeFileSync(
  `${out}/checks.json`,
  JSON.stringify(
    {
      maxwellSampleCount: speeds.length,
      observedMean: observed,
      theoreticalMean: expected,
      relativeMeanError: observed / expected - 1,
      runs: tests.length,
      samples: rows.length,
      durationPs: 1000,
      count: COUNT,
      boxNm: BOX,
      energyBalanceMax: Math.max(...summary.map((s) => Math.abs(+s.energyBalanceRelative))),
    },
    null,
    2,
  ),
);
