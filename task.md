# Molecular Lab task

- [x] Scope and report plan approved; reference selected.
- [x] Managed app provisioned; design direction recorded.
- [x] Shared 3D hard-sphere engine, Maxwell initialization, wall-impulse pressure.
- [x] Editorial responsive UI and charts, recorded results table.
- [x] Run 150/300/600 K, e=1/.95, thermostatted comparisons; three replicate seeds; timestep sensitivity. 28 runs, 1400 samples.
- [x] Full prompt, raw measurements, report with sources and two figures.
- [x] Build, lint, energy/Maxwell checks and browser interactions passed; portable kit reproduced all reference outputs byte-for-byte.
- [ ] Final delivery.

Decisions: student audience; Markdown report; dilute argon-mass surrogate, not a calibrated real-gas model. SI observables with nm/ps integration. Both cases start from identical sampled positions/velocities. Elastic walls in every case. Isolated means no energy injection; thermostat explicitly injects energy. No database/auth.

Measured: 300 K isolated e=.95 ends at 218.5 K mean; early/late pressure 49.8/39.5 kPa. Thermostatted pressure 51.9/51.7 kPa. Caveats: 4% wall/finite-size offset above point-particle benchmark; ~2–3% timestep sensitivity in dissipative temperature; no real-gas attraction model. Source retrieval: Khan full page timed out, only corroborating search summary cited transparently. Report drafting and deliverables verified against saved outputs.