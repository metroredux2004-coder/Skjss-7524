import { useEffect, useRef } from "react";
import { BOX, KB, MASS, Gas, maxwell, type Sample } from "../lib/physics";

export function Chamber({
  gas,
  amber,
  trails,
  tick,
}: {
  gas: Gas;
  amber: boolean;
  trails: boolean;
  tick: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.clientWidth,
      h = c.clientHeight,
      dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const pad = 32,
      depth = 30,
      bw = w - pad * 2 - depth,
      bh = h - pad * 2 - depth;
    const project = (x: number, y: number, z: number) => [
      pad + (x / BOX) * bw + (z / BOX) * depth,
      pad + (y / BOX) * bh + (1 - z / BOX) * depth,
    ];
    ctx.strokeStyle = "rgba(184,213,197,.15)";
    ctx.lineWidth = 1;
    const corners = [
      [0, 0, 0],
      [BOX, 0, 0],
      [BOX, BOX, 0],
      [0, BOX, 0],
      [0, 0, BOX],
      [BOX, 0, BOX],
      [BOX, BOX, BOX],
      [0, BOX, BOX],
    ];
    for (const [i, j] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ]) {
      const a = project(...(corners[i] as [number, number, number])),
        b = project(...(corners[j] as [number, number, number]));
      ctx.beginPath();
      ctx.moveTo(...(a as [number, number]));
      ctx.lineTo(...(b as [number, number]));
      ctx.stroke();
    }
    const color = amber ? "232,180,117" : "184,222,204";
    for (const p of [...gas.particles].sort((a, b) => a.z - b.z)) {
      const [x, y] = project(p.x, p.y, p.z);
      const opacity = 0.45 + (0.55 * p.z) / BOX;
      if (trails) {
        const [tx, ty] = project(p.x - p.vx * 2.5, p.y - p.vy * 2.5, p.z - p.vz * 2.5);
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, `rgba(${color},0)`);
        g.addColorStop(1, `rgba(${color},${opacity * 0.5})`);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${color},${opacity})`;
      ctx.shadowColor = `rgba(${color},.35)`;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + (1.3 * p.z) / BOX, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [gas, amber, trails, tick]);
  return (
    <canvas
      ref={canvas}
      className="chamber-canvas"
      aria-label={`${amber ? "Inelastic" : "Elastic"} molecular animation, 3D positions projected in two dimensions`}
    />
  );
}

function path(values: number[], max: number, width = 460, height = 155) {
  return values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${40 + (i / Math.max(values.length - 1, 1)) * (width - 56)},${height - 22 - (v / max) * (height - 38)}`,
    )
    .join(" ");
}
export function PressureChart({ a, b }: { a: Sample[]; b: Sample[] }) {
  const max = Math.max(65, ...a.map((s) => s.pressure), ...b.map((s) => s.pressure)) * 1.12;
  const total = Math.max(200, a.at(-1)?.time || 0);
  const curve = (data: Sample[]) =>
    data
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${40 + (s.time / total) * 404},${133 - (s.pressure / max) * 117}`,
      )
      .join(" ");
  return (
    <svg
      className="chart"
      viewBox="0 0 460 173"
      aria-label="Measured wall-impulse pressure in kilopascals versus time in picoseconds"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1="40" x2="444" y1={133 - f * 117} y2={133 - f * 117} className="grid-line" />
          <text x="30" y={137 - f * 117} textAnchor="end">
            {(max * f).toFixed(0)}
          </text>
        </g>
      ))}
      <path d={curve(a)} className="elastic-line" />
      <path d={curve(b)} className="inelastic-line" />
      <text x="40" y="157">
        0
      </text>
      <text x="444" y="157" textAnchor="end">
        {total.toFixed(0)} ps
      </text>
      <text x="10" y="10">
        kPa
      </text>
    </svg>
  );
}
export function SpeedChart({ a, b, target }: { a: Gas; b: Gas; target: number }) {
  const xmax = Math.max(1200, 5 * Math.sqrt((KB * target) / MASS)),
    bins = 24,
    binwidth = xmax / bins;
  const hist = (gas: Gas) => {
    const vals = Array.from({ length: bins }, () => 0);
    for (const speed of gas.speeds()) {
      const i = Math.floor(speed / binwidth);
      if (i < bins) vals[i] += 1 / (96 * binwidth);
    }
    return vals;
  };
  const ha = hist(a),
    hb = hist(b),
    theory = Array.from({ length: 100 }, (_, i) => maxwell((i / 99) * xmax, target));
  const ymax = Math.max(...ha, ...hb, ...theory) * 1.12;
  return (
    <svg
      className="chart"
      viewBox="0 0 460 173"
      aria-label="Speed probability density and initial Maxwell speed distribution"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1="40" x2="444" y1={133 - f * 117} y2={133 - f * 117} className="grid-line" />
          <text x="31" y={137 - f * 117} textAnchor="end">
            {(ymax * f * 1000).toFixed(1)}
          </text>
        </g>
      ))}
      {ha.map((v, i) => (
        <rect
          key={i}
          x={40 + (i * 404) / bins}
          y={133 - (v / ymax) * 117}
          width={404 / bins - 2}
          height={(v / ymax) * 117}
          fill="#b8d5c5"
          opacity=".32"
        />
      ))}
      <path d={path(hb, ymax)} className="inelastic-line" />
      <path
        d={path(theory, ymax)}
        stroke="#edf0e8"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
      />
      <text x="40" y="157">
        0
      </text>
      <text x="240" y="157" textAnchor="middle">
        {(xmax / 2).toFixed(0)}
      </text>
      <text x="444" y="157" textAnchor="end">
        {xmax.toFixed(0)} m/s
      </text>
      <text x="6" y="10">
        10⁻³ s/m
      </text>
    </svg>
  );
}
