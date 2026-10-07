# Complete AI simulation prompt

## Prompt to give a coding/simulation AI

Build an interactive educational web simulation investigating two questions: (1) how a Maxwell–Boltzmann speed distribution changes with temperature and produces macroscopic pressure, and (2) how elastic versus slightly inelastic intermolecular collisions affect pressure stability. Use a React web interface with a deterministic, reusable physics engine; run that same engine offline to collect genuine measurements. Do not invent observations or compute the displayed measured pressure directly from the ideal-gas equation.

### Physical model

Use 96 identical, nonrotating hard-sphere particles in a fixed cubic container of side L = 20 nm. Each particle has mass m = 6.6335209 × 10⁻²⁶ kg and surrogate radius r = 0.35 nm. Use k_B = 1.380649 × 10⁻²³ J/K. These are argon-mass teaching surrogates, not a fitted real-argon interaction model. Dynamics must be genuinely three-dimensional even if rendered as a two-dimensional projection. No gravity, attractions, chemical reactions or external forces. Use a default timestep of 0.05 ps, nm for positions, nm/ps for velocity, and convert observables into SI units.

Sample nonoverlapping uniform positions using a seeded random generator. Independently sample each velocity component from a zero-mean Gaussian with standard deviation √(k_B T/m); the resulting speed magnitudes have the 3D Maxwell distribution:

f(v) = 4π [m/(2πk_B T)]³ᐟ² v² exp[−mv²/(2k_B T)].

Remove finite-sample center-of-mass drift and rescale all components uniformly to make the kinetic temperature exactly equal to the requested initial T. State that this conditioning slightly correlates the finite sample; it is not an exact independent canonical sample afterward. Never assign every particle the same speed. Initialize both cases with exactly the same positions and velocities for a fair comparison.

Case A: all particle collisions are fully elastic, coefficient of normal restitution e = 1. Case B: particle collisions have e = 0.95 by default, adjustable from 0.85 to 1. Resolve approaching equal-mass pairs with a normal impulse conserving total pair momentum; tangential relative velocity is unchanged. Relative normal velocity reverses and becomes e times its original magnitude. The pair loses ΔE = m(1−e²)g_n²/4, where g_n is pre-impact relative normal speed in m/s. Explain that 1−e² is a fraction of the pair's relative NORMAL kinetic energy, not of its entire energy. Separate overlapped particles and only apply impulses to approaching pairs. Use elastic, fixed walls in BOTH cases, reversing normal velocity and recording wall impulse 2m|v_n|. Document timestep/collision-detection limitations.

Default to isolated translational systems: no energy is added. Let the inelastic gas cool naturally; do not keep its initial temperature fixed silently. Add an optional explicitly labelled thermostat that rescales velocities each step to hold kinetic temperature at the target and records its cumulative supplied energy. Label this as artificial feedback, not canonical equilibrium sampling.

### Observables

Compute kinetic temperature T_kin = 2E_kin/(3Nk_B), mean speed, RMS speed, total pair-collision count, wall-collision frequency, mean wall impulse, lost kinetic energy, and thermostat-supplied energy. Over consecutive, nonoverlapping 20 ps windows compute measured pressure P_wall = ΣΔp_wall/(6L²Δt). Show kPa. Record the separate ideal benchmark Nk_B T_kin/L³ but do not use it as the measured value. Show pressure as unavailable before the first complete window. Keep all axes, normalization, units and averaging intervals explicit.

### Visual outputs and controls

Use the supplied image only as editorial style inspiration: warm ivory introduction, deep-teal lab, restrained mint for elastic and amber for inelastic, thin rules, light Poppins headings, generous margins. Copy no text from the image. Show paired animated molecular chambers with perspective projection and speed trails; include a pause button. Show live speed probability-density histograms/curves for both samples, a dashed INITIAL Maxwell reference at the requested T, and measured pressure versus physical time in ps. Depth and trail length may aid interpretation, but marker size is not a physical speed encoding. Include temperature slider 100–600 K, e slider, thermostat toggle, trails toggle, reset, pause/resume, 1 ps step, 150/300/600 K presets and downloadable raw CSV. Changing physical parameters resets both cases identically. Stop the live trace at 2000 ps so history remains bounded. Make the UI keyboard-accessible and usable on phones.

### Required measured experiments

Run both isolated cases for 1000 ps at T₀ = 150, 300 and 600 K with seeds 42, 137 and 271. Run both thermostatted cases at 300 K with the same three seeds. Add seed-42 timestep comparisons at dt = 0.025 and 0.1 ps for both isolated 300 K cases. This is 28 runs and 1400 completed pressure windows. Save every sample and per-run summaries. Compare first-ten-window pressure means (20–200 ps) to last-eleven-window means (800–1000 ps), plus final kinetic temperature, wall frequency and mean impulse. Report replicate ranges, not just a selected seed.

Verify elastic kinetic-energy conservation and the balance E_final + E_lost − E_added = E_initial. Check Maxwell mean speed statistically across many independent initial seeds and compare timestep sensitivity. Do not treat energy conservation alone as proof of trajectory accuracy.

### Analysis report

Submit a student-focused Markdown report, approximately 4–6 pages, containing this complete prompt or a link to it, goals, methods, parameter table, measured results, pressure and temperature charts, and physical reasoning. Explain v_characteristic ∝ √T, wall impulse ∝ √T, collision frequency ∝ √T, and hence P ∝ T at fixed number density. Discuss stationary fluctuations versus systematic drift; do not assume inelastic systems always have greater instantaneous noise. Explain how thermostat energy injection changes the interpretation.

Distinguish the ideal-gas approximation from real molecular gases. Inelastic energy removal is a granular-gas analogue, not a universal real-gas law. Real-gas deviations involve finite molecular volume and attractive interactions; internal degrees of freedom can redistribute energy without destroying total energy. Use the van der Waals expression qualitatively only, not as if this simulation implemented it. Acknowledge finite N, hard-sphere size, wall geometry, solver approximation, limited replication and lack of attraction/phase-transition modeling. Cite authoritative textbooks and granular-gas research, and identify which statements are measured versus theoretical. Deliver the working simulation, full prompt, report, raw data and a reproducibility kit.