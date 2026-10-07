import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Atom,
  Check,
  Download,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Gas, COUNT, BOX, RADIUS, type Sample } from "../lib/physics";
import { Chamber, PressureChart, SpeedChart } from "../components/lab-visuals";

const fmt = (v: number, d = 1) =>
  v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export default function MolecularLab() {
  const [temp, setTemp] = useState(300),
    [e, setE] = useState(0.95),
    [thermostat, setThermostat] = useState(false);
  const [running, setRunning] = useState(true),
    [trails, setTrails] = useState(true),
    [tick, setTick] = useState(0),
    [tab, setTab] = useState("findings"),
    [copied, setCopied] = useState(false);
  const [initialPair] = useState(() => [new Gas(), new Gas(300, 0.95)]);
  const pair = useRef(initialPair);
  const reset = (t = temp, r = e, th = thermostat) => {
    pair.current = [new Gas(t, 1, th), new Gas(t, r, th)];
    setTick((v) => v + 1);
  };
  useEffect(() => {
    if (!running) return;
    let handle: number;
    let last = 0;
    const frame = (now: number) => {
      if (now - last > 32) {
        pair.current.forEach((g) => g.advance(1));
        setTick((v) => v + 1);
        last = now;
        if (pair.current[0].time >= 2000) {
          setRunning(false);
          return;
        }
      }
      handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [running]);
  const [a, b] = pair.current;
  const as = a.history.at(-1) || { ...a.snapshot(), pressure: 0, wallRate: 0, impulse: 0 };
  const bs = b.history.at(-1) || { ...b.snapshot(), pressure: 0, wallRate: 0, impulse: 0 };
  const csv = () => {
    const keys = Object.keys(as) as (keyof Sample)[];
    const rows = ["case," + keys.join(",")];
    [a, b].forEach((g, i) =>
      g.history.forEach((s) =>
        rows.push((i ? "inelastic" : "elastic") + "," + keys.map((k) => s[k]).join(",")),
      ),
    );
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "live-gas-measurements.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const preset = (t: number) => {
    setTemp(t);
    reset(t);
    setRunning(true);
  };
  return (
    <div id="top">
      <header className="nav">
        <a className="brand" href="#top">
          <Atom size={22} />
          <span>
            molecular<span className="brand-light"> / lab</span>
          </span>
        </a>
        <nav>
          <a href="#experiment">Experiment</a>
          <a href="#analysis">Observations</a>
          <a href="#methods">Methods</a>
        </nav>
        <a className="nav-report" href="/downloads/analysis-report.md" download>
          Get the report <ArrowUpRight size={15} />
        </a>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" /> KINETIC THEORY · INTERACTIVE STUDY 01
          </div>
          <h1>
            Small collisions.
            <br />
            <span>Macroscopic consequences.</span>
          </h1>
          <p>
            Explore how a distribution of molecular speeds becomes pressure.
            <br className="desktop-break" /> Then change one assumption: let collisions lose energy.
          </p>
          <a href="#experiment" className="text-link">
            Enter the experiment <ArrowDown size={15} />
          </a>
        </div>
        <div className="intro-note">
          <span className="number">01 — 02</span>
          <p>
            Maxwell speed distribution
            <br />
            Elastic vs. inelastic collisions
          </p>
          <div className="equation">P = ⅓ n m ⟨v²⟩</div>
          <span className="small-label">FROM MOLECULAR MOTION TO PRESSURE</span>
        </div>
      </section>
      <main id="experiment" className="lab">
        <div className="lab-heading">
          <div>
            <div className="eyebrow">THE EXPERIMENT</div>
            <h2>One starting state. Two outcomes.</h2>
          </div>
          <div className="status">
            <span className={running ? "live-dot" : "paused-dot"} />
            {running ? "Simulation running" : "Simulation paused"}
            <span className="time">{fmt(a.time, 0)} ps</span>
          </div>
        </div>
        <div className="control-bar">
          <label className="slider-label">
            Initial temperature <strong>{temp} K</strong>
            <input
              aria-label="Initial temperature"
              type="range"
              min="100"
              max="600"
              step="10"
              value={temp}
              onChange={(ev) => {
                const t = +ev.target.value;
                setTemp(t);
                reset(t);
              }}
            />
            <span>
              100 K <span>600 K</span>
            </span>
          </label>
          <label className="slider-label">
            Inelastic restitution <strong>e = {e.toFixed(2)}</strong>
            <input
              aria-label="Inelastic restitution"
              type="range"
              min=".85"
              max="1"
              step=".01"
              value={e}
              onChange={(ev) => {
                const r = +ev.target.value;
                setE(r);
                reset(temp, r);
              }}
            />
            <span>
              More energy loss <span>Elastic</span>
            </span>
          </label>
          <div className="energy-control">
            <span className="small-label">ENERGY CONDITIONS</span>
            <label className="switch-label">
              <input
                    aria-label="Hold temperature"
                type="checkbox"
                checked={thermostat}
                onChange={(ev) => {
                  setThermostat(ev.target.checked);
                  reset(temp, e, ev.target.checked);
                }}
              />
              <span className="switch" />
              Hold temperature
            </label>
            <small>
              {thermostat ? "Thermostat adds lost energy" : "Isolated · no energy supplied"}
            </small>
          </div>
          <div className="play-controls">
            <button
              className="primary-btn"
              onClick={() => {
                if (a.time >= 2000) reset();
                setRunning(!running);
              }}
            >
              {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Pause" : "Run"}
            </button>
            <button
              className="icon-btn"
              title="Advance 1 ps"
              aria-label="Advance 1 ps"
              onClick={() => {
                setRunning(false);
                pair.current.forEach((g) => g.advance(1));
                setTick((v) => v + 1);
              }}
            >
              <SkipForward size={17} />
            </button>
            <button
              className="icon-btn"
              title="Reset both cases"
              aria-label="Reset both cases"
              onClick={() => reset()}
            >
              <RotateCcw size={17} />
            </button>
          </div>
        </div>
        <div className="cases">
          {[
            {
              gas: a,
              s: as,
              amber: false,
              title: "Elastic collisions",
              sub: "Energy conserved",
              label: "IDEAL-GAS APPROXIMATION",
            },
            {
              gas: b,
              s: bs,
              amber: true,
              title: "Inelastic collisions",
              sub: "Energy dissipates",
              label: "DISSIPATIVE COMPARISON",
            },
          ].map(({ gas, s, amber, title, sub, label }) => (
            <section className={"case " + (amber ? "amber" : "")} key={title}>
              <div className="case-header">
                <div>
                  <div className="small-label">{label}</div>
                  <h3>
                    <span className="case-dot" />
                    {title}
                  </h3>
                </div>
                <span className="case-tag">e = {gas.restitution.toFixed(2)}</span>
              </div>
              <div className="chamber-wrap">
                <Chamber gas={gas} amber={amber} trails={trails} tick={tick} />
                <span className="chamber-caption">{COUNT} molecules · 3D projection</span>
                <span className="chamber-side">{sub}</span>
              </div>
              <div className="metrics">
                <div>
                  <span>Measured pressure</span>
                  <strong>
                    {gas.history.length ? fmt(s.pressure) : "—"} <small>kPa</small>
                  </strong>
                </div>
                <div>
                  <span>Kinetic temperature</span>
                  <strong>
                    {fmt(gas.temperature(), 0)} <small>K</small>
                  </strong>
                </div>
                <div>
                  <span>Mean speed</span>
                  <strong>
                    {fmt(gas.snapshot().meanSpeed, 0)} <small>m/s</small>
                  </strong>
                </div>
              </div>
              <div className="secondary-metrics">
                <span>
                  Wall hits <b>{fmt(s.wallRate, 2)} /ps</b>
                </span>
                <span>
                  Mean impulse{" "}
                  <b>{gas.history.length ? (s.impulse / 1e-23).toFixed(2) : "—"} ×10⁻²³ N·s</b>
                </span>
              </div>
            </section>
          ))}
        </div>
        <div className="under-cases">
          <label>
            <input
                aria-label="Show velocity trails"
              type="checkbox"
              checked={trails}
              onChange={(ev) => setTrails(ev.target.checked)}
            />{" "}
            Show velocity trails
          </label>
          <span>
            Pressure is measured from wall impulses over 20 ps, not assigned from PV = NkT.
          </span>
          <button onClick={csv} disabled={!a.history.length}>
            <Download size={13} /> Export live CSV
          </button>
        </div>
        <div className="chart-grid">
          <section>
            <div className="chart-heading">
              <h3>Speed distribution</h3>
              <span>PROBABILITY DENSITY</span>
            </div>
            <SpeedChart a={a} b={b} target={temp} />
            <div className="legend">
              <span className="elastic-key">Elastic sample</span>
              <span className="amber-key">Inelastic sample</span>
              <span className="dashed-key">Initial Maxwell curve</span>
            </div>
          </section>
          <section>
            <div className="chart-heading">
              <h3>Pressure over time</h3>
              <span>20 ps WINDOWS</span>
            </div>
            <PressureChart a={a.history} b={b.history} />
            <div className="legend">
              <span className="elastic-key">Elastic</span>
              <span className="amber-key">Inelastic</span>
              <span className="chart-hint">Finite samples fluctuate. Look for the trend.</span>
            </div>
          </section>
        </div>
        <div className="preset-row">
          <span>TRY A TEMPERATURE</span>
          {[150, 300, 600].map((t) => (
            <button className={t === temp ? "active" : ""} key={t} onClick={() => preset(t)}>
              {t} K
            </button>
          ))}
          <p>
            {thermostat
              ? "External energy replenishes collisional losses."
              : "With no thermostat, only the dissipative gas progressively cools."}
          </p>
        </div>
      </main>
      <section className="analysis-section" id="analysis">
        <div className="analysis-intro">
          <div className="eyebrow">BEYOND THE ANIMATION</div>
          <h2>
            What the molecules
            <br />
            are telling us.
          </h2>
          <p>
            These explanations connect the live experiment to reproducible parameter runs—not just a
            visual impression.
          </p>
          <a href="/downloads/analysis-report.md" download className="text-link">
            Read the full analysis <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="analysis-body">
          <div className="tabs">
            <button
              className={tab === "findings" ? "selected" : ""}
              onClick={() => setTab("findings")}
            >
              Key observations
            </button>
            <button
              className={tab === "physics" ? "selected" : ""}
              onClick={() => setTab("physics")}
            >
              Physical mechanisms
            </button>
            <button className={tab === "limits" ? "selected" : ""} onClick={() => setTab("limits")}>
              Model limitations
            </button>
          </div>
          {tab === "findings" ? (
            <>
              <article>
                <span>01</span>
                <div>
                  <h3>Hotter means faster—not equally fast.</h3>
                  <p>
                    Heating broadens the Maxwell distribution and moves its peak to higher speeds.
                    Doubling temperature multiplies characteristic speed by √2, not 2.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Pressure comes from both impulse and frequency.</h3>
                  <p>
                    Faster molecules transfer more momentum per wall impact and hit the walls more
                    often. Together, these effects make pressure proportional to temperature at
                    fixed density.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Energy loss makes pressure drift.</h3>
                  <p>
                    Elastic pressure fluctuates about a stable mean. Inelastic collisions cool an
                    isolated gas, lowering both wall-hit frequency and mean impulse. A thermostat
                    can sustain its pressure by supplying energy.
                  </p>
                </div>
              </article>
            </>
          ) : tab === "physics" ? (
            <>
              <article>
                <span>f(v)</span>
                <div>
                  <h3>A three-dimensional distribution.</h3>
                  <p>
                    Each velocity component begins as a Gaussian with variance kT/m. Speed is the
                    magnitude of three components, giving f(v) = 4π(m/2πkT)³ᐟ²v² exp(−mv²/2kT).
                  </p>
                </div>
              </article>
              <article>
                <span>Δp</span>
                <div>
                  <h3>The walls register momentum.</h3>
                  <p>
                    Elastic walls receive Δp = 2m|vₙ|. Measured pressure is the sum of impulses
                    divided by total wall area and the measurement interval.
                  </p>
                </div>
              </article>
              <article>
                <span>ΔE</span>
                <div>
                  <h3>Only the normal relative motion loses energy.</h3>
                  <p>
                    For equal masses, a pair collision loses m(1−e²)gₙ²/4. At e = 0.95, this is
                    9.75% of the relative normal energy—not of all kinetic energy.
                  </p>
                </div>
              </article>
            </>
          ) : (
            <>
              <article>
                <span>!</span>
                <div>
                  <h3>Dissipative is not synonymous with real gas.</h3>
                  <p>
                    This comparison is a granular-gas analogue. Real molecular gases deviate mainly
                    through attractions and finite molecular size; their total energy does not
                    simply disappear at each collision.
                  </p>
                </div>
              </article>
              <article>
                <span>96</span>
                <div>
                  <h3>Small system, visible fluctuations.</h3>
                  <p>
                    Hard spheres have finite size, and the solver has a finite timestep. The report
                    uses multiple seeds and a timestep check. This is a teaching model, not a
                    quantitative argon equation of state.
                  </p>
                </div>
              </article>
            </>
          )}
        </div>
      </section>
      <section className="recorded-results">
        <div className="eyebrow">RECORDED PARAMETER RUNS · THREE-SEED MEANS</div>
        <div className="results-heading">
          <h2>Measured, not assumed.</h2>
          <p>Isolated systems · e = 1 versus 0.95 · 1000 ps per run</p>
        </div>
        <div className="results-scroll">
          <table>
            <thead><tr><th>Initial temperature</th><th>Elastic late pressure</th><th>Inelastic late pressure</th><th>Inelastic final temperature</th><th>Inelastic pressure change</th></tr></thead>
            <tbody>
              <tr><th>150 K</th><td>25.7 kPa</td><td>21.0 kPa</td><td>121 K</td><td>−15.6%</td></tr>
              <tr><th>300 K</th><td>52.1 kPa</td><td>39.5 kPa</td><td>219 K</td><td>−20.6%</td></tr>
              <tr><th>600 K</th><td>104.1 kPa</td><td>72.3 kPa</td><td>397 K</td><td>−27.1%</td></tr>
            </tbody>
          </table>
        </div>
        <p className="results-note">Late pressure: windows ending at 800–1000 ps. Change compares early (20–200 ps) and late means. With the 300 K thermostat, inelastic early/late means were 51.9/51.7 kPa. Replicate ranges and timestep checks are in the report.</p>
      </section>
      <section className="methods" id="methods">
        <div>
          <div className="eyebrow">REPRODUCIBLE BY DESIGN</div>
          <h2>
            Inspect the method.
            <br />
            Repeat the experiment.
          </h2>
        </div>
        <div className="method-details">
          <p>
            {COUNT} equal-mass argon surrogates in a {BOX} nm cube, radius {RADIUS} nm.
            Three-dimensional hard-sphere dynamics with elastic walls. Timestep: 0.05 ps. Initial
            seed: 42. Both cases use identical initial states. Visual time is slowed; physical time
            is shown in ps.
          </p>
          <div className="download-links">
            <a href="/downloads/simulation-prompt.md" download>
              Complete AI prompt <ArrowUpRight size={16} />
            </a>
            <a href="/downloads/recorded-measurements.csv" download>
              Recorded measurements <Download size={15} />
            </a>
            <a href="/downloads/reproducibility-kit.zip" download>
              Reproducibility kit <ArrowUpRight size={16} />
            </a>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  "N=96; L=20 nm; r=0.35 nm; dt=0.05 ps; T=150/300/600 K; e=1/0.95; seeds=42,137,271; run=1000 ps",
                );
                setCopied(true);
              }}
            >
              {copied ? <Check size={15} /> : <Atom size={15} />}{" "}
              {copied ? "Parameters copied" : "Copy parameters"}
            </button>
          </div>
        </div>
      </section>
      <footer>
        <span>molecular / lab</span>
        <span>A study in kinetic theory · October 2026</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}
