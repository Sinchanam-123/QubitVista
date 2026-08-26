# Quantum Concepts and Gates — Complete Reference

**Part A — 8 concepts** · superposition · phase · interference · measurement · state evolution · reversibility · entanglement · separability
**Part B — 16 gates** · 9 fixed · 4 rotation · 3 two-qubit

*Every matrix, identity, probability and Bloch coordinate in this document was verified by direct numerical computation rather than recalled from memory.*

---

# PART A — THE EIGHT CONCEPTS

## 0. How the eight fit together (read this first)

The first six describe what a **single qubit** can do. The last two describe what happens the moment there are **two or more**.

```
SINGLE-QUBIT CATALOGUE (6)

Superposition    creates the possibility of two amplitudes existing at once
      ↓
Phase            gives each amplitude a direction (a complex angle)
      ↓
State evolution  rotates those amplitudes deterministically (unitary, reversible)
      ↓
Interference     makes amplitudes add or cancel — hidden phase becomes real probability
      ↓
Measurement      collapses the result into a classical bit (Born rule) — the only irreversible step

TWO-QUBIT CATALOGUE (the same 6, plus 2)

Separability     the question: does this joint state factorise into independent parts?
      ↓
Entanglement     the answer "no" — the pair has a definite state while neither member does
```

**One-line summary of the whole subject:** superposition supplies the raw material, phase supplies the hidden information, evolution manipulates it reversibly, interference converts it into probability, measurement destroys it while extracting a classical answer — and entanglement is what makes the whole thing exponentially bigger than the sum of its parts.

The single most important idea for a beginner: **quantum advantage does not come from "trying all answers at once."** It comes from arranging phases so that wrong answers interfere destructively and cancel, while the right answer interferes constructively. Superposition without interference is just noise.

**Separability and entanglement are two names for one question.** A two-qubit state is either separable (factorises, each qubit has its own state) or entangled (doesn't, and neither qubit does). There is no third option for pure states. That is why the two-qubit catalogue has eight entries rather than seven — the concept and its negation are both worth teaching explicitly, because learners consistently assume "two qubits" means "two independent qubits," and it usually doesn't.

| Concept | Where randomness lives | Reversible? | Visible in probability bars? |
|---|---|---|---|
| Superposition | none (state is definite) | yes | yes (as split bars) |
| Phase | none | yes | **no** (relative phase hidden) |
| State evolution | none (fully deterministic) | yes | depends |
| Interference | none | yes | yes (bars grow/vanish) |
| Reversibility | n/a | by definition | n/a |
| Measurement | **all of it** | **no** | it *is* the bars |
| Entanglement | none (the pair is definite) | yes | **no** — needs correlations, not bars |
| Separability | none | n/a (a property, not an operation) | **no** |

---

## 1. SUPERPOSITION

### What it is
A qubit can be in any normalised complex combination of the basis states:

```
|ψ⟩ = α|0⟩ + β|1⟩ ,     with   |α|² + |β|² = 1
```

α and β are **complex probability amplitudes**, not probabilities. This is a direct consequence of the Schrödinger equation being **linear**: if two states are valid solutions, so is any combination of them.

On the Bloch sphere: |0⟩ is the north pole, |1⟩ the south pole, and superposition tilts the vector away from a pole toward the equator. Maximum superposition = on the equator.

### The correction almost everyone needs
"A qubit is 0 and 1 at the same time" is a useful slogan and a bad description. A superposition is a **perfectly definite state — just in a different basis**. The state |+⟩ = (|0⟩+|1⟩)/√2 is not uncertain; it is the exact +1 eigenstate of the X operator. Measure it along X and you get "+" with 100% certainty every time. It only *looks* random because you insisted on measuring along Z. Superposition is basis-relative, not a description of ignorance or of two simultaneous realities.

### History
| Year | Event |
|---|---|
| 1801–1803 | Thomas Young's double-slit experiment establishes wave superposition for light |
| 1924 | de Broglie proposes matter waves |
| 1926 | Schrödinger's wave equation — its linearity *is* the superposition principle |
| 1927 | Davisson–Germer diffract electrons off nickel; matter waves confirmed |
| 1930 | Dirac formalises "the principle of superposition" in *The Principles of Quantum Mechanics* |
| 1935 | Schrödinger's cat — written as a *reductio ad absurdum*, an attack on taking superposition macroscopically, not a celebration of it |
| 1961 | Jönsson performs the electron double-slit directly |
| 1989 | Tonomura films single electrons arriving one at a time and building an interference pattern |
| 1999 | Arndt & Zeilinger show C₆₀ fullerene (60 atoms) interference |
| 2000 | Friedman et al. and van der Wal et al. demonstrate superposition of *macroscopic* persistent currents in SQUIDs — billions of electrons |
| 2019 | Fein et al. push matter interference past 25,000 amu (2,000+ atoms) |

### Real-world examples
- **Chemistry itself.** Benzene's ring, and every molecular orbital you ever drew as a "hybrid," is a superposition of electron configurations. Chemical bonding is superposition doing structural engineering.
- **MRI scanners.** Nuclear spins are placed in superposition by an RF pulse, then precess; the induced signal is what builds the image.
- **Atomic clocks.** Ramsey interferometry puts a caesium or ytterbium atom in an equal superposition of two hyperfine levels and reads the phase it accumulates. This defines the SI second.
- **Photosynthesis (contested but active research).** Evidence for coherent superposition of excitation pathways in light-harvesting complexes; whether it's functionally important is still argued.
- **Every quantum algorithm.** Shor's and Grover's both open by applying H to every qubit, creating an equal superposition of all 2ⁿ inputs.

### Gates that produce it
`H` (equal superposition), `RY(θ)` / `RX(θ)` (tunable, partial superposition), `U`/`U3` (arbitrary).

### Where it breaks
**Decoherence.** Contact with the environment leaks "which state am I in" information outward, and the superposition degrades into a classical probabilistic mixture. This is the entire engineering problem of quantum computing — and the reason your coffee cup isn't in superposition.

---

## 2. INTERFERENCE

### What it is
Amplitudes are complex numbers, and **complex numbers can cancel**. When several computational paths lead to the same final outcome, you add the amplitudes *first*, then square:

```
P(x) = | A₁ + A₂ + … |²        — sum the amplitudes of every path leading to x,
                                then square the total
```

If two paths arrive with opposite phase, they annihilate — an outcome that was reachable becomes impossible. Classical probability can never do this; probabilities only ever add up.

### Worked example: `H · T · H` on |0⟩
| Step | State |
|---|---|
| Start | \|0⟩ |
| After H | (\|0⟩ + \|1⟩)/√2 |
| After T | (\|0⟩ + e^{iπ/4}\|1⟩)/√2 |
| After H | ½[(1+e^{iπ/4})\|0⟩ + (1−e^{iπ/4})\|1⟩] |

Final probabilities: **P(0) = cos²(π/8) ≈ 0.8536**, **P(1) = sin²(π/8) ≈ 0.1464**.

Notice what happened. After the T gate the measurement probabilities were still exactly 50/50 — the phase was completely invisible. The second H **converted that hidden phase into visible probability**. That conversion is what interference *is*, and it's the whole engine of quantum computing.

Contrast: `H · H` on |0⟩ returns |0⟩ with probability 1. The two paths to |1⟩ (via |0⟩ and via |1⟩) arrive with opposite sign and cancel perfectly.

### History
| Year | Event |
|---|---|
| 1801 | Young — light interference, fringes |
| 1816+ | Fresnel — mathematical wave theory |
| 1927 | Davisson–Germer — interference for matter |
| 1948 | Feynman's path-integral formulation — reality as a sum over *all* histories, weighted by phase |
| 1965 | Feynman calls the double slit "the only mystery" of quantum mechanics |
| 1978 | Wheeler's delayed-choice thought experiment |
| 1992 | Deutsch–Jozsa: first algorithm whose advantage is explicitly interference-driven |
| 1993 | Elitzur–Vaidman "bomb tester" — interference detects an object without interacting with it |
| 1994 / 1996 | Shor's and Grover's algorithms — interference engineered at scale |

### Real-world examples
- **Anti-reflective coatings** on glasses and camera lenses: a film sized so reflections destructively interfere. (Classical, but the same mathematics.)
- **LIGO gravitational-wave detectors:** a 4 km Michelson interferometer detecting length changes ~10⁻¹⁸ m. Since 2019 it injects *squeezed light* — a genuinely quantum resource — to push below the shot-noise limit.
- **SQUID magnetometers:** the most sensitive magnetic detectors made, used in magnetoencephalography (brain imaging) and geological surveying. They work by interfering two superconducting paths.
- **Grover's algorithm:** each iteration rotates amplitude toward the marked item and away from the rest — the diffusion operator is literally a controlled interference step. √N speedup.
- **Shor's algorithm:** the Quantum Fourier Transform makes all periods except the true one cancel out.
- **Noise-cancelling headphones** — classical, but the correct intuition for destructive cancellation.

### The rule that ties it to error
Interference requires **coherence**. If anything in the environment — a stray photon, a leftover "garbage" qubit, a measurement — records *which path* was taken, the paths become distinguishable and the interference vanishes. Which-path information and interference are mutually exclusive. This is why uncomputation (see §5) is mandatory, not optional.

---

## 3. PHASE

### What it is
Every amplitude is complex: α = |α|·e^{iφ}. The modulus |α| sets the probability; **φ is a direction, an angle in the complex plane.** There are two kinds, and the distinction is critical:

**Global phase — physically meaningless.** e^{iγ}|ψ⟩ and |ψ⟩ are the *same physical state*, indistinguishable by any experiment. (Formally, states are rays in projective Hilbert space, not vectors.) This is why the Bloch sphere works at all: one degree of freedom is discarded as unobservable, leaving exactly two — θ and φ.

**Relative phase — completely real.** In (|0⟩ + e^{iφ}|1⟩)/√2, φ is the azimuthal angle on the Bloch sphere. It does not appear in the measurement histogram. It is nevertheless a physical fact about the state, and any subsequent gate that mixes the two components converts it into observable probability.

### The "invisible until it isn't" property
Apply `Z` to |+⟩ and you get |−⟩. Measure in the Z basis: **50/50 both times, identical histograms.** Nothing appears to have happened. Now apply H first: |+⟩ → |0⟩ (100%), |−⟩ → |1⟩ (100%). Total opposites.

This is the single most common beginner misconception: *"the T gate did nothing, the bars didn't move."* The bars are the wrong instrument. Phase lives in the Bloch sphere's equator and in the state vector — never in the probability histogram until you interfere it.

### History
| Year | Event |
|---|---|
| 1926–30 | Complex amplitudes formalised (Schrödinger, Dirac); global-phase invariance recognised |
| 1956 | Pancharatnam finds a geometric phase in polarised light — largely overlooked at the time |
| 1959 | **Aharonov–Bohm effect** proposed: a charged particle picks up measurable phase from a vector potential in a region where the magnetic *field* is zero. Phase becomes indisputably physical, not bookkeeping |
| 1960 | Chambers observes the AB effect |
| 1962 | Brian Josephson predicts supercurrent across a barrier depends on the *phase difference* between superconductors (Nobel 1973) |
| 1984 | Michael Berry discovers the **geometric (Berry) phase** — phase acquired purely from the path traced in parameter space, independent of speed |
| 1986 | Tonomura's definitive AB confirmation with fully shielded superconducting toroids |

### Real-world examples
- **The volt.** The Josephson effect gives an exact frequency-to-voltage relation via phase, and is the international voltage standard. Since the 2019 SI redefinition, the Josephson constant K_J = 2e/h is exact by definition.
- **SQUIDs** measure magnetic flux by reading a phase difference — sensitivity down to ~10⁻¹⁵ tesla.
- **Aharonov–Bohm rings** in mesoscopic electronics: conductance oscillates with enclosed flux.
- **Geometric/holonomic quantum computing:** gates built from Berry phase are intrinsically robust to certain timing errors, because geometric phase depends on the *path*, not how fast you traverse it.
- **Phase kickback**, the workhorse trick: a controlled operation on an eigenstate deposits the eigenvalue's phase onto the *control* qubit. This is the mechanism inside Deutsch–Jozsa, quantum phase estimation, and therefore inside Shor's algorithm.

### Gates that act on phase
`Z` (φ += π), `S` (π/2), `T` (π/4), `S†`/`SDG`, `T†`/`TDG`, `P(λ)` / `RZ(θ)` (arbitrary), `CZ`/`CPhase` (conditional). Note `S² = Z`, `T² = S`, `T⁴ = Z`.

---

## 4. STATE EVOLUTION

### What it is
Between measurements, a closed quantum system evolves **deterministically**. No randomness whatsoever. The Schrödinger equation:

```
iħ · d|ψ(t)⟩/dt = H|ψ(t)⟩

   ⟹   |ψ(t)⟩ = e^{−iHt/ħ} |ψ(0)⟩ = U(t) |ψ(0)⟩
```

U is **unitary**: U†U = I. Unitarity preserves the norm, which is exactly the statement that total probability stays 1, and it preserves inner products, which means distinct states never merge.

### Every gate is a rotation
For a single qubit, every unitary is a rotation of the Bloch vector about some axis by some angle:

| Gate | Rotation |
|---|---|
| X | 180° about x̂ |
| Y | 180° about ŷ |
| Z | 180° about ẑ |
| H | 180° about the diagonal axis (x̂+ẑ)/√2 |
| S | 90° about ẑ |
| T | 45° about ẑ |
| RX/RY/RZ(θ) | θ about the named axis |

A subtlety worth knowing: rotating a qubit by a full 360° returns it to the *same physical state* but multiplies the vector by −1. Two full turns are needed to get back to the identical vector. This is the SU(2) → SO(3) double cover, and it is the same mathematics that makes electrons spin-½ fermions.

### What a "gate" physically is
A gate is not an abstraction — it is a **Hamiltonian switched on for a precisely timed duration.**
- **Superconducting qubits:** a shaped microwave pulse, typically 10–50 ns, driving Rabi oscillations. Gate angle = pulse area.
- **Trapped ions:** laser or microwave pulses coupling internal states, often via a shared vibrational mode. Slower (μs–ms) but higher fidelity.
- **Neutral atoms:** optical pulses plus Rydberg blockade for entangling gates.
- **NMR/spins:** RF pulses, the original technology — this is where the pulse-sequence language came from.

### History
| Year | Event |
|---|---|
| 1926 | Schrödinger equation |
| 1932 | von Neumann's mathematical formulation; the unitary/measurement split ("process 1 and 2") is made explicit |
| 1937–38 | I. I. Rabi — molecular beam magnetic resonance, driven state evolution measured directly (Nobel 1944) |
| 1949–50 | Norman Ramsey — separated oscillatory fields, the method behind atomic clocks (Nobel 1989) |
| 1976 | Lindblad (and Gorini–Kossakowski–Sudarshan) — master equation for **open**, non-unitary evolution |
| 1982 | Feynman: *Simulating Physics with Computers* — proposes using quantum evolution to simulate quantum evolution |
| ~1995 | Solovay–Kitaev theorem — any unitary can be efficiently approximated from a finite universal gate set (e.g. {H, T, CNOT}) |

### Real-world examples
- **Atomic clocks / GPS.** Every GPS fix depends on precisely controlled unitary evolution of atomic states.
- **MRI pulse sequences.** Spin-echo, inversion recovery, etc. are engineered unitary evolutions of nuclear spins.
- **Quantum chemistry simulation.** Trotterisation slices e^{−iHt} into implementable pieces to model molecular ground states — currently the most credible near-term application.
- **Quantum control / optimal pulse shaping** (GRAPE, DRAG, CRAB): industrial-grade optimisation of the pulse to hit a target unitary despite hardware imperfection.

### Where the ideal breaks
Real hardware is an **open** system, so evolution is only approximately unitary. Two clocks are always running:
- **T₁ (relaxation / amplitude damping)** — the qubit decays |1⟩ → |0⟩, leaking energy.
- **T₂ (dephasing / coherence time)** — the relative phase randomises. Always T₂ ≤ 2T₁.

Circuit depth is bounded by these. This is why "how many gates before the answer is noise" is the real hardware spec, not qubit count.

---

## 5. REVERSIBILITY

### What it is
Because every gate is unitary, every gate has an inverse: **U⁻¹ = U†**. Run a circuit, then run the inverse gates in reverse order, and you return exactly to the start:

```
(ABC)† = C† B† A†        — invert every gate, and reverse their order
```

A quantum circuit with no measurement is a *permutation of the state space*. Nothing is ever deleted. This is a much stronger constraint than classical computing lives under.

| Self-inverse (G² = I) | Inverse pairs |
|---|---|
| X, Y, Z, H, CNOT, SWAP, CZ | S ↔ S† (SDG), T ↔ T† (TDG), RZ(θ) ↔ RZ(−θ), any Rθ ↔ R(−θ) |

The demo `S, SDG` is the minimal illustration: rotate 90° about ẑ, rotate −90°, exactly home.

### Why classical computing isn't reversible
A classical `AND` gate takes 2 bits to 1 bit. Given output 0 you cannot recover the input. **Information was destroyed** — and that has a thermodynamic price.

### History — this is one of the great results in physics
| Year | Event |
|---|---|
| 1961 | **Rolf Landauer (IBM):** erasing one bit of information *must* dissipate at least **kT ln 2** of energy as heat (≈ 2.87 × 10⁻²¹ J, or 0.018 eV, at 300 K). Computation costs nothing in principle; *forgetting* costs. |
| 1973 | **Charles Bennett:** any computation can be restructured to be logically reversible, dodging the Landauer cost — and introduces **uncomputation** to clean up intermediate garbage |
| 1980–82 | Toffoli, and Fredkin & Toffoli, construct universal reversible classical gates (CCNOT, the Fredkin gate) |
| 1982 | Feynman connects reversible computing to quantum mechanics |
| 1985 | Deutsch defines the universal quantum computer — reversible by construction |
| 2012 | **Bérut et al. (Nature)** experimentally measure the Landauer limit with a single colloidal particle, confirming a 51-year-old prediction |

Landauer's principle is also the standard resolution of **Maxwell's demon**: the demon can sort molecules for free, but must eventually erase its memory, and *that* is what pays the entropy bill.

### Real-world examples and uses
- **Uncomputation** — mandatory, not stylistic. Quantum algorithms compute f(x) into ancilla qubits as |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩, copy the answer, then *run the computation backwards* to reset the ancillas. If you skip this, the garbage qubits remain entangled with the data, act as which-path records, and **kill the interference your algorithm depends on**. Reversibility is what makes cleanup possible at all.
- **Mirror circuits / randomised benchmarking.** The standard way to measure a real quantum computer's quality: apply a random circuit, then its exact inverse, and check how often you get |0…0⟩ back. Any shortfall is pure hardware error. Google, IBM, and Quantinuum all report fidelity this way; it underpins the "quantum volume" metric.
- **Spin echo (Erwin Hahn, 1950).** A π pulse time-reverses dephasing, refocusing spins that had fanned out. Directly used in every MRI machine, and as dynamical decoupling to extend qubit T₂.
- **Loschmidt echo** in many-body physics: how well can you actually run a system backwards? A sensitive probe of chaos.
- **Adiabatic and reversible CMOS** research: reclaiming charge instead of dumping it to ground, motivated by Landauer.

### The one exception
**Measurement is irreversible.** It is the only non-unitary step in the whole framework — which is precisely what makes it the hard philosophical problem (next section).

---

## 6. MEASUREMENT

### What it is
Measurement converts a quantum state into one classical outcome. The **Born rule** (Max Born, 1926) gives the probability:

```
P(x) = |⟨x|ψ⟩|²
```

For |ψ⟩ = α|0⟩ + β|1⟩: P(0) = |α|², P(1) = |β|². Afterwards the state **collapses** onto the observed outcome — measure again immediately and you get the same answer with certainty.

The demo `RY(θ)` is the cleanest possible Born-rule laboratory: RY(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩, so **P(1) = sin²(θ/2)**. Sweep θ from 0 to π and watch probability slide continuously from 0 to 1 — the squared amplitude, made visible.

### The four properties that make it strange
1. **Probabilistic** — the only randomness in quantum mechanics. Everything else is deterministic.
2. **Irreversible** — no U† undoes it.
3. **Basis-dependent** — |+⟩ measured in Z gives 50/50 noise; measured in X gives a certain answer. What you measure determines what is definite.
4. **Destructive of superposition** — the amplitudes you spent the whole circuit sculpting are collapsed into a single bit.

### Practical consequences for anyone running circuits
- **You get samples, not the state.** One run = one bitstring. Recovering a distribution requires many **shots**; statistical error falls as ~1/√N. Wanting 1% precision means ~10,000 shots.
- **The state vector is not readable.** A simulator shows it to you as a convenience; hardware never can.
- **No-cloning theorem** (Wootters & Zurek; Dieks, both 1982): an unknown quantum state cannot be copied. You cannot make backups and measure those instead. This closes the obvious escape route — and simultaneously makes quantum cryptography possible.

### History
| Year | Event |
|---|---|
| 1922 | **Stern–Gerlach**: silver atoms split into two discrete beams. Measurement quantisation, seen directly |
| 1926 | **Born rule** introduced — famously, in a *footnote* correcting the main text of his paper on collision processes (Nobel 1954) |
| 1927 | Copenhagen interpretation takes shape (Bohr, Heisenberg) |
| 1932 | von Neumann formalises collapse as a separate postulate |
| 1935 | **EPR paper** argues quantum mechanics must be incomplete |
| 1957 | **Everett's** relative-state / many-worlds interpretation — no collapse at all |
| 1964 | **Bell's theorem**: local hidden variables make testably different predictions |
| 1972–82 | Freedman & Clauser, then **Aspect** — experiments violate Bell inequalities |
| 1970s–90s | **Decoherence theory** (Zeh, Zurek): the environment explains the *appearance* of collapse |
| 1982 | No-cloning theorem |
| 1984 | **BB84** — Bennett & Brassard turn measurement disturbance into a security guarantee |
| 2001 | Raussendorf & Briegel: **measurement-based (one-way) quantum computing** — measurement as the *computational primitive* |
| 2015 | Loophole-free Bell tests (Delft, NIST, Vienna) |
| 2022 | **Nobel Prize** to Aspect, Clauser, Zeilinger for entanglement experiments |

### The measurement problem (still unresolved)
Unitary evolution is linear, continuous and deterministic. Collapse is nonlinear, discontinuous and random. Nothing in the theory says where one stops and the other begins. Live positions:

| Interpretation | Claim about collapse |
|---|---|
| Copenhagen | It happens; don't ask how. Instrumentalist |
| Many-worlds (Everett) | It never happens; all branches persist, you're in one |
| Decoherence | Explains *why* interference vanishes and pointer states emerge, but is not by itself a collapse mechanism |
| de Broglie–Bohm | Particles always have definite positions; a pilot wave guides them |
| Objective collapse (GRW, Penrose) | Collapse is a real, spontaneous physical process — and in principle experimentally testable |

This is not a settled matter dressed up as an open one. It is genuinely open.

### Real-world examples
- **Superconducting qubit readout:** dispersive measurement — the qubit state shifts a coupled resonator's frequency, and a microwave probe tone reads the shift. Non-demolition in principle, ~100 ns–1 μs in practice.
- **Trapped-ion readout:** state-dependent fluorescence. The ion literally lights up ("bright") or stays dark. Fidelities above 99.9%.
- **Quantum key distribution (BB84, and deployed commercial QKD links):** an eavesdropper must measure, measuring disturbs, disturbance shows up as an error rate. Security from physics, not from computational hardness.
- **Quantum error correction:** *syndrome* measurements extract information about which error occurred **without measuring the encoded data itself** — collapsing the error, not the logical qubit. This is the trick that makes fault tolerance possible.
- **Mid-circuit measurement + feed-forward:** now available on real hardware; required for teleportation, error correction, and adaptive algorithms.
- **Measurement-based quantum computing:** prepare a large entangled cluster state, then compute purely by choosing measurement bases. Computation *as* measurement.

### Beyond the textbook version
- **POVMs** — the general measurement formalism; projective measurement is a special case.
- **Weak measurement** — extract partial information with partial collapse; enables tracking of quantum trajectories in real time.
- **QND (quantum non-demolition)** measurement — measure an observable without disturbing it, so it can be measured repeatedly.

---

## 7. ENTANGLEMENT

### What it is
Two qubits are entangled when the pair has a **completely definite joint state** while **neither qubit individually has a state at all**. This is not a figure of speech — it is a precise mathematical fact, and it has no classical counterpart whatsoever.

The canonical example, the Bell state:
```
|Φ⁺⟩ = (|00⟩ + |11⟩)/√2
```
Measure both qubits: you get "00" half the time and "11" half the time, **never** "01" or "10". Each qubit alone looks like a perfectly fair coin. Together they agree every single time — no matter how far apart they are, and no matter which of the two was measured first.

Produced by two gates: `H` on qubit 0, then `CNOT` from qubit 0 to qubit 1. *(Verified: the resulting statevector is [0.7071, 0, 0, 0.7071].)*

### Why "neither qubit has a state"
Take the Bell state and mathematically discard qubit 1 — the formal operation is the **partial trace**. What remains for qubit 0 is:
```
ρ_A = [ 0.5   0  ]  = I/2 ,   purity Tr(ρ_A²) = 0.5
      [  0   0.5 ]
```
*(Computed, not asserted.)* That is the **maximally mixed state** — a completely random bit, carrying zero information. Its Bloch vector has **length zero**: it sits at the dead centre of the sphere, not on the surface.

**Consequence for any visualiser: an entangled qubit cannot be drawn as an arrow on the Bloch sphere.** Both arrows collapse to the origin. This isn't a rendering bug — it's the physics. The information hasn't vanished; it lives entirely in the *correlation between* the qubits, which no single-qubit picture can hold. Alternative views: a Q-sphere, a density-matrix city plot, or simply a correlation table.

### The four Bell states
All maximally entangled, all produced by `H` + `CNOT` from the four basis inputs:
```
|Φ⁺⟩ = (|00⟩ + |11⟩)/√2      ← from |00⟩
|Φ⁻⟩ = (|00⟩ − |11⟩)/√2      ← from |10⟩
|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2      ← from |01⟩
|Ψ⁻⟩ = (|01⟩ − |10⟩)/√2      ← from |11⟩   (the "singlet")
```
Note that |Φ⁺⟩ and |Φ⁻⟩ differ only by the **sign of the |11⟩ term** — a relative phase, not a global one. They are perfectly distinguishable, because that relative phase can be converted into a probability by running the circuit backwards. Phase and entanglement are not separate topics.

### How much entanglement? (three standard measures)
| Measure | Formula | Product state | Bell state |
|---|---|---|---|
| **Purity of one half** | Tr(ρ_A²) | 1.0 | 0.5 |
| **Entanglement entropy** | S(ρ_A) = −Tr(ρ_A log₂ ρ_A) | 0 | **1.0** (one "ebit") |
| **Concurrence** | 2\|ad − bc\| for a\|00⟩+b\|01⟩+c\|10⟩+d\|11⟩ | 0 | **1.0** |

*All three verified numerically.* Entanglement is **continuous**, not binary — a partially entangled state such as cos(π/6)|00⟩ + sin(π/6)|11⟩ has concurrence 0.866 and entropy 0.811, sitting genuinely between the two extremes.

### Beyond two qubits
- **GHZ state** (|000⟩ + |111⟩)/√2 — maximally entangled, maximally fragile. Lose or measure any one qubit and the entanglement of the whole thing is destroyed. This is why decoherence gets rapidly worse as circuits grow.
- **W state** (|001⟩ + |010⟩ + |100⟩)/√3 — a different, inequivalent kind of three-party entanglement that *survives* the loss of one qubit. There is no single "amount of entanglement" for three or more parties; the classification is genuinely richer.
- **Monogamy of entanglement.** If A is maximally entangled with B, it can be entangled with *nothing else*. Entanglement cannot be freely shared — a constraint with no classical analogue, and one of the structural reasons quantum cryptography is secure.

### History
| Year | Event |
|---|---|
| 1935 | **Einstein, Podolsky & Rosen** publish the EPR paradox, arguing quantum mechanics must be incomplete because it implies "spooky" correlations at a distance. Intended as a refutation; became the founding paper of the field. |
| 1935 | **Schrödinger** replies, coins the term *Verschränkung* (entanglement), and calls it not *one* but *the* characteristic trait of quantum mechanics. Same year as his cat. |
| 1951–57 | **Bohm** reformulates EPR using spin-½ particles — the version everyone uses today. |
| 1964 | **John Bell** does what everyone thought impossible: turns a philosophical dispute into a **testable inequality**. Any local hidden-variable theory must satisfy it; quantum mechanics predicts violation. |
| 1969 | **CHSH** (Clauser, Horne, Shimony, Holt) produce the experimentally practical form of the inequality. Classical bound: 2. Quantum bound: 2√2 ≈ **2.828** (Tsirelson). |
| 1972 | **Freedman & Clauser** report the first experimental violation. |
| 1981–82 | **Alain Aspect**'s experiments with time-varying analysers close a major loophole and convince the physics community. |
| 1991 | **Ekert**: entanglement-based quantum key distribution (E91) — security derived directly from Bell violation. |
| 1992 | **Bennett & Wiesner**: superdense coding — 2 classical bits sent in 1 qubit, using a shared entangled pair. |
| 1993 | **Bennett et al.**: quantum teleportation protocol. |
| 1997 | **Bouwmeester et al.** (Zeilinger group) demonstrate teleportation experimentally. |
| 2015 | **Loophole-free Bell tests** — Delft, NIST and Vienna independently close the detection and locality loopholes simultaneously. The debate ends. |
| 2017 | China's **Micius satellite** distributes entangled photon pairs over **1,200 km**. |
| 2022 | **Nobel Prize in Physics** to Aspect, Clauser and Zeilinger, for entanglement experiments and Bell-inequality violation. |

### Real-world examples and uses
- **Quantum teleportation.** Transfers a qubit's *state* using one shared entangled pair plus two classical bits. The original is destroyed in the process (no-cloning is safe). Not faster-than-light: without the classical message the receiver has nothing but noise. Now routine in labs and the basis of quantum-network repeater designs.
- **Superdense coding.** The mirror image: one qubit carries two classical bits, given a pre-shared entangled pair.
- **Quantum key distribution (E91, and satellite links).** Any eavesdropper measuring the entangled pair degrades the Bell violation, exposing themselves. Deployed commercially and demonstrated between continents via Micius.
- **Quantum error correction.** Logical qubits *are* entangled states of many physical qubits; the entanglement is what spreads information so no single error can destroy it.
- **Every serious quantum algorithm.** Shor's period-finding, Grover's diffusion and variational chemistry circuits all generate entanglement. Without it, a quantum computer is efficiently simulable classically.
- **Quantum sensing.** Entangled probe states beat the classical shot-noise limit (1/√N) and approach the Heisenberg limit (1/N), improving atomic clocks and magnetometers.
- **Nature's own.** Chemical bonds are entangled electron states. The difficulty of classically simulating chemistry is exactly the difficulty of representing that entanglement.

### The three things entanglement is *not*
1. **Not faster-than-light communication.** The **no-communication theorem** proves that nothing Bob does to his half changes the statistics Alice sees. She observes uniform randomness regardless. The correlation only becomes visible when both records are compared — over an ordinary classical channel, at ordinary speed.
2. **Not just classical correlation.** Two socks in two boxes are correlated. Entangled qubits violate CHSH — reaching 2.828 where any classical scheme is capped at 2. Experiment sides with quantum, loophole-free since 2015. **This is not a story about hidden information; it is a measured number.**
3. **Not "the same state, copied."** No-cloning forbids copying, and copies would be uncorrelated anyway. Entanglement is a property of the pair, not a property duplicated in each.

### Where it breaks
Entanglement is the most fragile thing in the lab. Any interaction with the environment entangles the qubits with *it* instead, which — from the perspective of the pair — destroys their entanglement. This is decoherence, and it is why maintaining entanglement across many qubits for many gate cycles is the central engineering problem in quantum computing.

---

## 8. SEPARABILITY

### What it is
The **complement of entanglement**, and worth stating as its own concept because it is what learners wrongly assume by default.

A two-qubit state is **separable** (a *product state*) if it can be factorised into one state per qubit:
```
|ψ⟩ = |a⟩ ⊗ |b⟩
```
If it can, each qubit genuinely has its own independent state, each draws its own arrow on its own Bloch sphere, and measuring one tells you **nothing** about the other. If no such factorisation exists, the state is entangled.

For pure states there is no middle ground: **separable or entangled, nothing else.**

### The test (for two qubits)
Write the state as a|00⟩ + b|01⟩ + c|10⟩ + d|11⟩. Then:
```
separable  ⟺  ad − bc = 0
```
*Verified:* |00⟩ → 0 ✓ separable · |+⟩⊗|0⟩ → 0 ✓ separable · Bell state → 0.5 ≠ 0 ✓ entangled.

The quantity **2|ad − bc|** is the **concurrence** — it doesn't just answer yes/no, it measures *how* entangled, from 0 (product) to 1 (maximally entangled).

### Three equivalent ways to check
| Method | Separable | Entangled |
|---|---|---|
| Determinant test | ad − bc = 0 | ad − bc ≠ 0 |
| Purity of one half | Tr(ρ_A²) = 1 | Tr(ρ_A²) < 1 |
| Schmidt rank | 1 | 2 (for two qubits) |

The **Schmidt decomposition** is the deepest of these: any pure two-party state can be written as Σᵢ λᵢ|aᵢ⟩|bᵢ⟩ with non-negative λᵢ. The number of non-zero terms is the **Schmidt rank**. Rank 1 means separable — one term means it factorises. Rank greater than 1 means entangled, and the spread of the λᵢ measures how much.

### Why separability matters more than it sounds
Because the default assumption is wrong in an interesting way. Learners naturally think "two qubits = two things, each with a state." That is true only for the separable case — and separable states are a **vanishingly small subset** of all possible states. Almost every state you reach by applying a random circuit is entangled.

Concretely: a product state of n qubits is specified by n independent 2-vectors — about 2n numbers. A general n-qubit state needs 2ⁿ amplitudes. Product states are a thin sliver of the space. **The exponential that makes quantum computing powerful lives almost entirely in the non-separable part.**

### What this means when you look at two Bloch spheres
```
Separable  → each qubit gets its own Bloch arrow. Both are valid and informative.
Entangled  → both arrows collapse to the origin. The picture is empty and correct.
```
Two arrows shrunk to nothing is not a broken display — it is the correct picture of a maximally entangled pair, and the determinant test above tells you which case you are looking at.

### Separability for mixed states — much harder
For **mixed** states (with classical noise present) the definition generalises: ρ is separable if it can be written as a probability mixture of product states, Σ pᵢ ρ_Aⁱ ⊗ ρ_Bⁱ. Deciding whether an arbitrary mixed state admits such a decomposition is **NP-hard in general**.

The standard partial tool is the **Peres–Horodecki (PPT) criterion** (Asher Peres, 1996; the Horodecki family, 1996): take the partial transpose of ρ; if any eigenvalue is negative, the state is definitely entangled. For 2×2 and 2×3 systems the test is exact — negative eigenvalue ⟺ entangled. For larger systems it is only one-directional: there exist **bound entangled** states that are PPT yet still entangled.

So "is this entangled?" goes from a one-line determinant for pure two-qubit states to a genuinely open research problem in the general case.

### History
| Year | Event |
|---|---|
| 1907 | **Erhard Schmidt** publishes the decomposition (in an analysis context, decades before quantum information adopted it). |
| 1935 | Separability is implicitly the thing EPR assume must hold, and Schrödinger points out does not. |
| 1989 | **Werner** gives the modern definition of separability for mixed states and constructs states that are correlated but not entangled — showing the two ideas are genuinely distinct. |
| 1996 | **Peres**, then the **Horodecki family**, establish the partial-transpose criterion and prove it is exact for the smallest systems. |
| 1998 | **Horodecki et al.** discover **bound entanglement** — entangled states from which no pure entanglement can be distilled. |
| 1998 | **Wootters** derives the closed formula for concurrence, making "how entangled is it" computable for any two-qubit state. |

### Misconceptions
1. **"Two qubits always have two states."** Only if separable. In the general case the pair has a state and the members do not.
2. **"Separable means unentangled means uncorrelated."** Separable *pure* states are indeed uncorrelated. Separable *mixed* states can be strongly correlated — just classically so (Werner's point, 1989).
3. **"SWAP entangles two qubits because it acts on both."** It does not. SWAP is a two-qubit gate that maps product states to product states — it never creates entanglement (§17). Acting on two qubits and entangling them are different things.

---

## Quick-reference summary — all eight concepts

| Concept | Core equation | Bloch / visual picture | Demo | Killer real-world example |
|---|---|---|---|---|
| **Superposition** | \|ψ⟩ = α\|0⟩+β\|1⟩ | vector leaves a pole | `H` | Atomic clocks — defines the SI second |
| **Phase** | e^{iφ} on \|1⟩ | longitude φ on the equator | `H, S` | MRI phase encoding |
| **Interference** | P = \|α+β\|² | branches recombining | `H, T, H` | Grover's search; Mach–Zehnder |
| **State evolution** | U = e^{−iHt/ħ} | rotation about an axis | `H, T, S, H` | Rabi π-pulses on real qubits |
| **Reversibility** | U†U = I | out and exactly back | `S, SDG` | NMR spin echo; circuit optimisation |
| **Measurement** | P(m) = \|⟨m\|ψ⟩\|² | projection onto an axis | `RY(θ)` | BB84 quantum key distribution |
| **Entanglement** | \|Φ⁺⟩ = (\|00⟩+\|11⟩)/√2 | **both arrows at the origin** | `H, CX` | Teleportation; satellite QKD |
| **Separability** | ad − bc = 0 | two independent arrows | `H` on q0 only | Tensor-network methods — low-entanglement states are cheap to simulate |

---

## The misconceptions worth pre-empting

1. **"Superposition means the qubit is secretly 0 or 1 and we don't know which."** It is a definite state. |+⟩ measured along X gives the same answer every time. Superposition is basis-relative, not ignorance.
2. **"Phase doesn't matter because you can't measure it."** You cannot measure it *directly*. Interference converts it into probability. Phase is where an algorithm stores its work.
3. **"A quantum computer tries all answers at once."** It holds 2ⁿ amplitudes and returns n bits. The advantage comes from interference cancelling the wrong answers, not from parallel trials.
4. **"Quantum mechanics is random."** Only measurement is. Evolution between measurements is as deterministic as Newtonian mechanics.
5. **"Measurement collapse is a physical mechanism we understand."** We have a rule that works perfectly and no consensus on what it *is*.
6. **"Reversibility is a mathematical curiosity."** It is a thermodynamic law (Landauer), the reason uncomputation is mandatory, and the basis of how real hardware is benchmarked.
7. **"Entanglement lets you send information faster than light."** The no-communication theorem forbids it. Correlations only appear once both records are compared classically.
8. **"Two qubits means two independent states."** Only when the joint state is separable — which is the exception, not the rule, for states produced by real circuits.

---

# PART B — THE SIXTEEN GATES

## 0. What a gate actually is (read this first)

A quantum gate is a **unitary matrix**: U†U = I. That single condition carries three consequences that describe every gate below.

1. **It preserves total probability.** The amplitudes always still square-sum to 1, so the Bloch vector never leaves the surface of the sphere. A gate can only *rotate* the state — never stretch, shrink, or destroy it.
2. **It is reversible.** Every unitary has an inverse U† = U⁻¹. There is no quantum equivalent of the classical `AND` gate, which throws information away.
3. **It is deterministic.** Given the input state, the output is fixed exactly. Randomness in quantum computing enters *only* at measurement, never at a gate.

**Every single-qubit gate is a rotation.** Formally, any 2×2 unitary can be written (up to a global phase) as

```
R_n̂(θ) = exp(−i θ (n̂·σ⃗)/2) = cos(θ/2)·I − i sin(θ/2)·(n_x X + n_y Y + n_z Z)
```

a rotation by angle **θ** about the axis **n̂**. The nine fixed gates that follow are just nine specific choices of (n̂, θ).

Physically, a gate is not an abstract symbol — it is **a Hamiltonian switched on for a precisely timed duration**. On a superconducting chip it's a shaped microwave pulse of 10–50 ns; on a trapped ion it's a laser pulse of microseconds. The rotation angle is set by the pulse area.

### The reference frame used throughout
```
|0⟩ = north pole (+z)     |1⟩ = south pole (−z)
|+⟩ = +x                  |−⟩ = −x
|+i⟩ = +y                 |−i⟩ = −y
```
Rotations follow the right-hand rule about the stated axis.

### A note on "angle π" for X, Y, Z
The table lists X, Y and Z as π rotations, which is correct as a *Bloch-sphere* statement. As matrices they carry an extra constant: **X = e^{iπ/2}·RX(π)**, and likewise for Y and Z (verified). That factor is a global phase and is physically undetectable, so both descriptions are right. It matters only in one place — inside a **controlled** version of the gate, where a global phase becomes a relative one. See §18.3.

---

## 1. I — IDENTITY

```
I = [ 1  0 ]        Axis: none        Angle: 0
    [ 0  1 ]
```

### What it does
Nothing. The state passes through unchanged: I|ψ⟩ = |ψ⟩ for every |ψ⟩.

### Why it exists at all
It looks pointless and is not. Four real uses:

- **Idle / timing padding.** In a multi-qubit circuit, one qubit often must *wait* while others are operated on. The identity is that instruction — and it is not free, because a waiting qubit is still decohering. On real hardware an "identity" of duration τ is where T₁ and T₂ decay happen.
- **T₁ and T₂ measurement.** The standard experiment is: excite the qubit, apply a chain of identity/delay instructions of increasing length, then measure. Fitting the decay curve *is* how coherence times are measured. The identity gate is the measuring instrument.
- **Algebraic completeness.** {I, X, Y, Z} form the **Pauli group** basis. Every 2×2 matrix — including every noise process — can be written as a combination of these four. Without I the algebra doesn't close.
- **Circuit alignment and benchmarking.** Padding layers so gates line up in time; and in randomised benchmarking, the ideal result of a sequence-plus-its-inverse *is* the identity.

### Properties
| Property | Value |
|---|---|
| Inverse | I (itself) |
| Order | 1 |
| Eigenvalues | +1, +1 (every state is an eigenstate) |
| Clifford? | Yes |
| Bloch effect | none |

### Misconception
**"The identity gate is a no-op, so it can be deleted."** Logically yes, physically no. Deleting an idle period changes the circuit's *duration*, and duration is exactly what decoherence charges you for. Compilers that remove identity gates can silently change how much noise a circuit picks up.

---

## 2. X — PAULI-X (the quantum NOT)

```
X = [ 0  1 ]        Axis: (1, 0, 0) — the x̂ axis        Angle: π
    [ 1  0 ]
```

### What it does
Swaps the amplitudes of |0⟩ and |1⟩. It is the closest thing quantum computing has to the classical NOT gate.

| Input | Output |
|---|---|
| \|0⟩ | \|1⟩ |
| \|1⟩ | \|0⟩ |
| \|+⟩ | \|+⟩ (unchanged — it's an eigenstate) |
| \|−⟩ | −\|−⟩ (eigenstate, eigenvalue −1) |
| α\|0⟩ + β\|1⟩ | β\|0⟩ + α\|1⟩ |

**Bloch picture:** 180° rotation about the x-axis. The north and south poles swap; the ±x points stay put; +y and −y swap.

### The important subtlety
X is **not** simply "the NOT gate." It is a NOT gate *only when the input is |0⟩ or |1⟩*. Applied to a superposition it is a rotation, and applied to |+⟩ it does nothing at all. Calling it "bit flip" is accurate for basis states and misleading for everything else.

### Properties
| Property | Value |
|---|---|
| Inverse | X (self-inverse: X² = I) |
| Order | 2 |
| Eigenvalues | +1 (\|+⟩), −1 (\|−⟩) |
| Clifford? | Yes |
| Also written | NOT, σ_x, σ₁ |

### History
Introduced by **Wolfgang Pauli in 1927** ("Zur Quantenmechanik des magnetischen Elektrons") as one of three 2×2 matrices describing the spin of an electron in a magnetic field. They were built to model *physics*, decades before anyone thought of computing with them. Pauli received the Nobel Prize in 1945 (for the exclusion principle).

### Real-world role
- **Classical logic inside quantum circuits.** Oracles that implement classical functions are built from X and controlled-X (CNOT) gates.
- **Bit-flip errors.** The most common hardware error *is* an unintended X. The 3-qubit repetition code and the surface code exist largely to catch it.
- **State preparation.** Initialising a register to some bitstring means applying X wherever a 1 is needed.
- **On hardware:** a resonant microwave π-pulse (superconducting) or a laser π-pulse (ions). Typical duration 20–50 ns, fidelity ~99.9%. IBM devices often build X from two √X pulses.

---

## 3. Y — PAULI-Y

```
Y = [ 0  −i ]        Axis: (0, 1, 0) — the ŷ axis        Angle: π
    [ i   0 ]
```

### What it does
A bit flip **and** a phase flip at once. Formally **Y = iXZ** (verified numerically).

| Input | Output |
|---|---|
| \|0⟩ | i\|1⟩ |
| \|1⟩ | −i\|0⟩ |
| \|+i⟩ | \|+i⟩ (eigenstate, +1) |
| \|−i⟩ | −\|−i⟩ (eigenstate, −1) |

**Bloch picture:** 180° rotation about the y-axis. Poles swap, ±y stay put, ±x swap.

### The subtlety that trips people up
Y|0⟩ = **i**|1⟩, while X|0⟩ = |1⟩. Those two results differ only by a global phase, so **on the input |0⟩, X and Y are experimentally indistinguishable.** They diverge immediately on superposition inputs, and inside controlled gates. This is the cleanest small demonstration that "global phase is unobservable" is a real rule and not a technicality.

### Properties
| Property | Value |
|---|---|
| Inverse | Y (self-inverse: Y² = I) |
| Order | 2 |
| Eigenvalues | +1 (\|+i⟩), −1 (\|−i⟩) |
| Clifford? | Yes |
| Also written | σ_y, σ₂ |

### Why it's the least-used of the three Paulis
Y is the only Pauli with **imaginary entries**, so it appears less in hand-built circuits and more in the algebra. Its real importance is structural:
- **Y errors** are the third of the three Pauli error types. Any single-qubit error whatsoever decomposes into I, X, Y, Z — which is why correcting just those three is enough to correct *everything*. This is the discrete-error theorem underpinning all of quantum error correction.
- **Pauli measurements** ⟨Y⟩ give the y-component of the Bloch vector, needed for full state tomography.
- In **variational algorithms** (VQE, QAOA), Hamiltonians are expressed as sums of Pauli strings; Y terms appear constantly.

### History
Same origin as X — Pauli, 1927. Together with X and Z, the three matrices satisfy `XY = iZ`, `YZ = iX`, `ZX = iY` and `XYZ = iI` (all verified), the same algebra as the quaternions. They **anticommute**: XY = −YX. That anticommutation is the mathematical seed of the uncertainty principle for spin.

---

## 4. Z — PAULI-Z (the phase flip)

```
Z = [ 1   0 ]        Axis: (0, 0, 1) — the ẑ axis        Angle: π
    [ 0  −1 ]
```

### What it does
Leaves |0⟩ alone and multiplies |1⟩ by −1 — a relative phase of π.

| Input | Output |
|---|---|
| \|0⟩ | \|0⟩ (unchanged) |
| \|1⟩ | −\|1⟩ |
| \|+⟩ | \|−⟩ |
| \|−⟩ | \|+⟩ |

**Bloch picture:** 180° rotation about the z-axis. Poles stay put; ±x swap; ±y swap.

### The lesson Z teaches better than any other gate
Apply Z to |0⟩: **nothing observable happens** — the state is untouched. Apply Z to |+⟩: the state becomes |−⟩, its exact opposite in the X basis — yet the measurement histogram is **50/50 before and after, identical**.

This is the single clearest demonstration that the probability histogram is an *incomplete* view of a quantum state. The information Z wrote is real, and it lives in the phase. To see it, apply H first: |+⟩ → |0⟩ (100% zero), |−⟩ → |1⟩ (100% one). Total opposites, revealed only by interference.

### Properties
| Property | Value |
|---|---|
| Inverse | Z (self-inverse: Z² = I) |
| Order | 2 |
| Eigenvalues | +1 (\|0⟩), −1 (\|1⟩) |
| Clifford? | Yes |
| Also written | σ_z, σ₃, phase flip |
| Relations | Z = S² = T⁴ |

### Real-world role
- **Phase-flip errors** — the error type that has no classical counterpart at all, and the reason quantum error correction needed genuinely new ideas rather than borrowed classical ones.
- **Grover's oracle.** Marking the target item is a Z applied conditionally — it flips the sign of the marked amplitude, which then interferes.
- **Measurement basis.** "Measuring a qubit" means measuring the observable Z. Its eigenvalues ±1 correspond to outcomes 0 and 1.
- **Virtually free on hardware** — see §18.2.

### Misconception
**"Z does nothing because the probabilities don't change."** Z never changes probabilities in the computational basis, by construction. It changes them completely in the X basis. The gate that does nothing is I.

---

## 5. H — HADAMARD

```
H = (1/√2) [ 1   1 ]     Axis: (1, 0, 1)/√2 — the diagonal between x̂ and ẑ     Angle: π
           [ 1  −1 ]
```

### What it does
Creates and destroys superposition. It is the most-used gate in quantum computing, and the reason is that it is the bridge between the Z basis and the X basis.

| Input | Output |
|---|---|
| \|0⟩ | \|+⟩ = (\|0⟩+\|1⟩)/√2 |
| \|1⟩ | \|−⟩ = (\|0⟩−\|1⟩)/√2 |
| \|+⟩ | \|0⟩ |
| \|−⟩ | \|1⟩ |

**Bloch picture:** 180° rotation about the diagonal axis (x̂+ẑ)/√2. This **swaps the x and z axes** and inverts y:
```
H X H = Z        H Z H = X        H Y H = −Y       (all verified)
```

### Why it is everywhere
1. **It creates superposition.** H on |0⟩ gives an equal superposition. Applied to n qubits it produces an equal superposition of all 2ⁿ basis states in a single layer — the opening move of Deutsch–Jozsa, Grover, Shor and almost every other algorithm.
2. **It converts phase into probability.** This is the deeper role. A relative phase is invisible in the Z-basis histogram; H rotates the X axis onto the Z axis, so phase differences become *population* differences you can actually measure. The circuit `H → phase → H` is the fundamental interference unit of quantum computing.
3. **It changes the measurement basis.** Hardware only measures in Z. Applying H before measurement measures X instead.

### The interference demo
`H, T, H` on |0⟩ (verified numerically):

| Step | P(0) | P(1) |
|---|---|---|
| after H | 0.5000 | 0.5000 |
| after T | **0.5000** | **0.5000** ← nothing visible changed |
| after H | 0.8536 | 0.1464 |

Exactly: P(0) = cos²(π/8) = 0.853553…. The T gate wrote a phase that the histogram could not show; the second H cashed it out. Limiting cases: `H,H` → P(0) = 1 exactly, and `H,Z,H` → P(1) = 1 exactly (both verified). The whole range in between is driven **purely by phase**.

### Properties
| Property | Value |
|---|---|
| Inverse | H (self-inverse: H² = I) |
| Order | 2 |
| Eigenvalues | +1, −1 |
| Clifford? | Yes |
| Relations | H = (X + Z)/√2 ; HXH = Z ; HZH = X |

### History
The matrix predates quantum computing by a century. **James Joseph Sylvester** constructed such matrices in **1867**; **Jacques Hadamard** studied them in **1893** in the context of maximal-determinant matrices. The n-qubit version is the **Walsh–Hadamard transform** (Joseph Walsh, 1923), long used in classical signal processing and coding theory. The quantum gate simply borrowed a well-known object — a nice illustration that quantum computing's mathematics is largely inherited rather than invented.

### On hardware
H is usually **not** a native gate. IBM devices, for instance, use a basis set along the lines of {RZ, √X, X, CNOT/ECR}, and H is compiled into a short sequence such as RZ(π/2)·RX(π/2)·RZ(π/2) — verified to equal H up to a global phase. So the most conceptually fundamental gate is, in the hardware layer, a compiled composite.

### Misconception
**"H makes the qubit random."** It makes it |+⟩ — a completely definite state. It looks random only because you then measured along Z. Measure along X and H|0⟩ gives the same answer with certainty every time.

---

## 6. S — PHASE GATE (√Z)

```
S = [ 1  0 ]        Axis: (0, 0, 1)        Angle: +π/2
    [ 0  i ]
```

### What it does
Adds a **quarter turn** (π/2) of relative phase to the |1⟩ component. It is the square root of Z: **S² = Z** (verified) — apply it twice and you get a full phase flip.

| Input | Output | Note |
|---|---|---|
| \|0⟩ | \|0⟩ | unchanged |
| \|1⟩ | i\|1⟩ | phase only |
| \|+⟩ | \|+i⟩ | +x → +y on the Bloch equator |

**Bloch picture:** +90° rotation about z. The vector slides a quarter-turn round the equator. **Probabilities never change** — S is invisible in the histogram, always.

### The `H, S` demo
`H` then `S` on |0⟩ takes the Bloch vector from the north pole to **+x** and then to **+y** — verified: final Bloch vector (0, 1, 0). Throughout, the histogram reads 50/50, unchanged.

Two gates, a visibly moved state, and a completely static bar chart. This is the single clearest reason to watch the Bloch sphere rather than the histogram.

### Properties
| Property | Value |
|---|---|
| Inverse | **SDG** (S†) — not self-inverse |
| Order | 4 (S⁴ = I) |
| Eigenvalues | 1 (\|0⟩), i (\|1⟩) |
| Clifford? | **Yes** |
| Relations | S² = Z ; S = T² ; S = e^{iπ/4}·RZ(π/2) |
| Also written | P(π/2), √Z |

### Why "Clifford" matters here
S, H and CNOT generate the **Clifford group**. The **Gottesman–Knill theorem** says circuits built only from Clifford gates can be simulated efficiently on a classical computer — even though they create entanglement freely and look thoroughly quantum. So S is powerful enough to build Bell states and run error correction, but not powerful enough to give a quantum speedup on its own. That is what T is for (§8).

### Real-world role
- **Basis change to Y.** To measure ⟨Y⟩, apply S† then H then measure — required for state tomography and for VQE energy estimation.
- **Stabiliser circuits and error correction**, which are almost entirely Clifford.
- **On hardware: essentially free.** See §18.2.

---

## 7. SDG — S-DAGGER (S†)

```
S† = [ 1   0 ]        Axis: (0, 0, 1)        Angle: −π/2
     [ 0  −i ]
```

### What it does
The exact inverse of S: a **−90° rotation** about z. S† = S³ (verified), since S has order 4.

`S` then `SDG` returns the state **exactly** to where it started — verified: S†S|0⟩ = |0⟩, and the same holds for any input.

### Why the dagger gates exist as named gates
They are not decoration. Three concrete needs:

1. **Uncomputation.** Quantum algorithms compute intermediate values into ancilla qubits, use them, then **run the computation backwards** to reset those ancillas. If you skip this, the leftover qubits stay entangled with your data, act as a which-path record, and **destroy the interference the algorithm depends on**. Reversing a circuit means replacing every gate with its dagger *and* reversing the order: (ABC)† = C†B†A†.
2. **Basis changes.** Measuring in the Y basis is `S† → H → measure`. The dagger, not S, is what's needed.
3. **Randomised benchmarking.** Apply a random Clifford sequence then its exact inverse; anything other than |0⟩ at the end is pure hardware error. This is how gate fidelities are quoted industry-wide, and it is built entirely on daggers.

### Properties
| Property | Value |
|---|---|
| Inverse | S |
| Order | 4 |
| Eigenvalues | 1, −i |
| Clifford? | Yes |
| Relations | S†= S³ ; (S†)² = Z ; S†S = I |

### Misconception
**"S† just undoes S, so it's redundant."** Only if it immediately follows an S. Used on its own it is a distinct, useful operation — a −90° phase rotation — and it is the standard first step of a Y-basis measurement.

---

## 8. T — π/8 GATE (√S)

```
T = [ 1      0     ]        Axis: (0, 0, 1)        Angle: +π/4
    [ 0  e^{iπ/4} ]
```

### What it does
Adds an **eighth turn** (π/4) of relative phase. It is the square root of S and the fourth root of Z:
```
T² = S      T⁴ = Z      T⁸ = I      (all verified)
```

**Bloch picture:** +45° about z. Probabilities unchanged, as with every z-rotation.

### Why on earth is it called the "π/8 gate" when it rotates by π/4?
A genuinely confusing name with a real explanation. Written in the symmetric form that removes the global phase:
```
T = e^{iπ/8} · RZ(π/4) = e^{iπ/8} · diag(e^{−iπ/8}, e^{+iπ/8})
```
The **±π/8 appears in the exponents** of the symmetric version, and the name stuck from that convention. The Bloch rotation really is π/4. Both facts are correct; they describe different ways of writing the same matrix. (Verified numerically.)

### Why T is the most important gate on this list
**T is the only non-Clifford gate among the nine fixed gates** — and that changes everything. (The rotation gates at generic angles are non-Clifford too; among the fixed set, T and T† stand alone.)

- **{H, S, CNOT}** (all Clifford) → classically simulable, no quantum advantage (Gottesman–Knill).
- **{H, T, CNOT}** → **universal**. Any quantum computation, to arbitrary accuracy. The **Solovay–Kitaev theorem** guarantees the approximation is efficient.

Adding T to the Clifford set is precisely the step from "efficiently simulable" to "believed classically intractable."

### And it is the most expensive gate to make fault-tolerant
In error-corrected architectures, Clifford gates are comparatively cheap, while T gates **cannot** be implemented directly by the usual transversal methods. They require **magic-state distillation** — consuming many noisy ancilla states to purify one good one, at large qubit and time overhead.

Consequence: resource estimates for real algorithms are quoted in **T-count** and **T-depth**, not total gate count. In many fault-tolerant designs, T-state factories dominate the chip area. Circuit optimisation research is largely T-count reduction.

**So the smallest-looking gate in the table — a 45° twist that never changes a single probability — is simultaneously the source of quantum advantage and the dominant cost of building a real quantum computer.** That is the most surprising fact in the whole gate set.

### Properties
| Property | Value |
|---|---|
| Inverse | **TDG** (T†) |
| Order | 8 (T⁸ = I) |
| Eigenvalues | 1, e^{iπ/4} |
| Clifford? | **No** — this is the point |
| Relations | T² = S ; T⁴ = Z ; T = e^{iπ/8}·RZ(π/4) |
| Also written | P(π/4), ⁴√Z |

### Real-world role
- **Universality**, as above.
- **The Toffoli gate** (reversible AND, essential for classical logic inside quantum circuits) decomposes into CNOTs plus **7 T gates** in the standard construction.
- **Interference demos:** in `H, T, H`, the T is the gate doing the hidden work (see §5, Hadamard).

---

## 9. TDG — T-DAGGER (T†)

```
T† = [ 1       0      ]        Axis: (0, 0, 1)        Angle: −π/4
     [ 0  e^{−iπ/4} ]
```

### What it does
The inverse of T: a −45° rotation about z. **T† = T⁷** (verified), since T has order 8.

### Where it actually shows up
- **Toffoli decomposition.** The standard Clifford+T circuit for a Toffoli uses a mix of T and T† gates alongside CNOTs — TDG is not optional there, it is structural.
- **Uncomputation** of any circuit containing T gates.
- **Phase-correction** steps in compiled circuits, where a transpiler has over-rotated and needs to come back.

### Properties
| Property | Value |
|---|---|
| Inverse | T |
| Order | 8 |
| Eigenvalues | 1, e^{−iπ/4} |
| Clifford? | No |
| Relations | T† = T⁷ ; (T†)² = S† ; T†T = I |

---

## 10. The z-rotation family at a glance

T, S, Z (and their daggers) are **the same gate at different angles**. Seeing them as one family removes most of the confusion:

| Gate | Angle | Fraction of a full turn | Root of Z | Clifford? |
|---|---|---|---|---|
| **T** | +π/4 (45°) | 1/8 | ⁴√Z | No |
| **S** | +π/2 (90°) | 1/4 | √Z | Yes |
| **Z** | +π (180°) | 1/2 | Z | Yes |
| **S†** | −π/2 | −1/4 | — | Yes |
| **T†** | −π/4 | −1/8 | — | No |

```
T → T² = S → S² = Z → Z² = I
```
Eight T gates in a row return you to the identity (verified). **Not one of them ever changes a measurement probability** — they only move the state around the equator. Their entire effect becomes visible when an H (or any gate that mixes |0⟩ and |1⟩) comes along and turns that phase into interference.

---

## The four ROTATION gates (one angle, in radians)

**RX · RY · RZ · P**

The nine gates above are rotations by *fixed* angles. These four leave the angle open: you supply θ (or λ) in radians and get any rotation you like about a chosen axis. Everything in the fixed set is a special case of one of these.

They matter for two reasons. First, **continuous control** — real algorithms (variational chemistry, QAOA, machine learning) need arbitrary angles, not multiples of 45°. Second, **hardware reality** — the fixed gates are what a *learner* uses, but rotation gates are what a *machine* actually executes.

---

## 11. RX(θ) — rotation about x̂

```
RX(θ) = [  cos(θ/2)   −i sin(θ/2) ]        Axis: (1, 0, 0)        Angle: θ
        [ −i sin(θ/2)   cos(θ/2)  ]
```

### What it does
Rotates the Bloch vector by θ about the x-axis. Starting from |0⟩:
```
RX(θ)|0⟩ = cos(θ/2)|0⟩ − i·sin(θ/2)|1⟩       →    P(1) = sin²(θ/2)
```
The vector tips from the north pole down through the **−y** axis toward the south pole.

| θ | Result on \|0⟩ | P(1) |
|---|---|---|
| 0 | \|0⟩ | 0.0000 |
| π/2 | (\|0⟩ − i\|1⟩)/√2 = \|−i⟩ | 0.5000 |
| π | −i\|1⟩ | 1.0000 |
| 2π | −\|0⟩ | 0.0000 |

*Verified.* Note the last row: **a full 2π turn returns the state with a minus sign**, not unchanged. You need 4π to truly return. This is the SU(2) double cover — physically real, confirmed by neutron interferometry in 1975, and undetectable except inside interference or a controlled gate.

### Key relations
```
RX(π) = −i·X            (X up to global phase)
RX(a)·RX(b) = RX(a+b)   (rotations about the same axis simply add — verified)
SX ("√X") = e^{iπ/4}·RX(π/2) = ½[[1+i, 1−i], [1−i, 1+i]] ,   SX² = X   (verified)
```

### Properties
| Property | Value |
|---|---|
| Inverse | RX(−θ) |
| Clifford? | Only at θ = multiples of π/2 |
| Changes probabilities? | **Yes** |
| Parameter | θ in radians |

### Real-world role
- **The native pulse.** On superconducting hardware an X-axis rotation is what a resonant microwave pulse physically *does*; the angle is set by the pulse amplitude × duration. **√X (SX) is a native basis gate on IBM devices** — X itself is often built from two of them.
- **Rabi oscillations.** Sweep θ continuously and the excited-state population traces sin²(θ/2). Plotting that curve is the standard first calibration experiment on any new qubit.
- **Ansatz layers** in VQE and QAOA, where the angles are the trainable parameters.

---

## 12. RY(θ) — rotation about ŷ

```
RY(θ) = [ cos(θ/2)  −sin(θ/2) ]        Axis: (0, 1, 0)        Angle: θ
        [ sin(θ/2)   cos(θ/2) ]
```

### What it does — and why it's the best teaching gate on the whole list
```
RY(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩       →    P(1) = sin²(θ/2)
```

**RY is the only rotation gate with entirely real entries.** Starting from |0⟩ it produces a state with **no imaginary part and no phase at all** — just two real amplitudes. The Bloch vector stays in the x–z plane the whole time.

That makes it the perfect instrument for demonstrating the **Born rule in isolation**: one continuous knob that dials probability smoothly from 0 to 1, with nothing else moving. Every other gate mixes phase into the picture; RY does not.

| θ | Amplitudes [α, β] | P(1) | sin²(θ/2) |
|---|---|---|---|
| 0 | [1.0000, 0.0000] | 0.0000 | 0.0000 |
| π/6 | [0.9659, 0.2588] | 0.0670 | 0.0670 |
| π/2 | [0.7071, 0.7071] | 0.5000 | 0.5000 |
| π | [0.0000, 1.0000] | 1.0000 | 1.0000 |

*All verified numerically.* At θ = π/2, RY produces exactly |+⟩ — the same state as `H`, by a different route.

### Key relations
```
RY(π) = −i·Y
RY(a)·RY(b) = RY(a+b)                   (verified)
H = RY(π/2)·Z            (exactly equal — no phase factor — verified)
H = X·RY(π/2)            (also exact — verified)
```

### Properties
| Property | Value |
|---|---|
| Inverse | RY(−θ) |
| Clifford? | Only at multiples of π/2 |
| Changes probabilities? | **Yes** |
| Special feature | real-valued: no phase introduced |

### Real-world role
- **Amplitude encoding.** Loading a classical number into a qubit's amplitude is an RY with θ = 2·arcsin(√p). This is the standard front door for quantum machine learning.
- **Biased coins / arbitrary distributions** in probabilistic circuits.
- **Variational ansätze**, where real-valued rotations keep the parameter landscape simpler.

---

## 13. RZ(θ) — rotation about ẑ

```
RZ(θ) = [ e^{−iθ/2}      0     ]        Axis: (0, 0, 1)        Angle: θ
        [     0      e^{+iθ/2} ]
```

### What it does
Rotates the Bloch vector by θ around the equator. Like Z, S and T, it **never changes a measurement probability** — it only moves phase. `RZ` is the continuous version of that entire family:
```
RZ(π/4) ≅ T        RZ(π/2) ≅ S        RZ(π) ≅ Z        (each up to global phase — verified)
```

### The symmetric form, and the RZ-vs-P trap
RZ splits the phase symmetrically: −θ/2 on |0⟩ and +θ/2 on |1⟩. `P(λ)` (next section) puts all of it on |1⟩. They produce the **identical Bloch rotation** and differ only by the global phase e^{−iθ/2}.

On a single qubit that difference is undetectable. **Inside a controlled gate it is not** — controlled-RZ and controlled-P are genuinely different operations, because a control turns a global phase into a relative one. This catches people out constantly: `rz(π)` applied to |0⟩ returns `−i|0⟩`, and a statevector display will show that, looking like a bug when it isn't.

### Properties
| Property | Value |
|---|---|
| Inverse | RZ(−θ) |
| Clifford? | Only at multiples of π/2 |
| Changes probabilities? | **No, ever** |
| Relations | RZ(θ) = e^{−iθ/2}·P(θ) (verified) |

### Real-world role — the free gate
On superconducting hardware **RZ costs nothing**. It is implemented as a **frame change**: instead of emitting a pulse, the control system simply shifts the phase of every *subsequent* pulse. Zero duration, essentially zero error.

This is why **RZ is a native basis gate on IBM hardware** while H is not — and why compilers aggressively rewrite circuits into long chains of RZ separated by a few √X pulses. The gate that does nothing visible is the one hardware likes best.

---

## 14. P(λ) — phase gate (also written U1)

```
P(λ) = [ 1     0    ]        Axis: (0, 0, 1)        Angle: λ
       [ 0  e^{iλ} ]
```

### What it does
Adds a relative phase λ to the |1⟩ component and leaves |0⟩ untouched. It is the **direct generalisation of Z, S and T** — those three are literally P at three angles:
```
P(π) = Z        P(π/2) = S        P(π/4) = T        (all verified exactly)
```

### P versus RZ
| | P(λ) | RZ(θ) |
|---|---|---|
| Phase placement | all λ on \|1⟩ | split: −θ/2 and +θ/2 |
| Effect on \|0⟩ | none at all | multiplies by e^{−iθ/2} |
| Bloch rotation | identical | identical |
| Inside a controlled gate | **different operations** | **different operations** |

Use **P** when you are thinking in terms of "add phase to |1⟩" — which is how phase kickback, the QFT and Shor's algorithm are all naturally expressed. Use **RZ** when you want the symmetric rotation, or when you are targeting hardware.

### Properties
| Property | Value |
|---|---|
| Inverse | P(−λ) |
| Clifford? | Only at multiples of π/2 |
| Changes probabilities? | **No, ever** |
| Generalises | Z, S, S†, T, T† |

### Real-world role
- **The Quantum Fourier Transform** is built almost entirely from H and **controlled-P** gates with angles π/2, π/4, π/8, … — halving at each step. The QFT is the engine of Shor's algorithm and of quantum phase estimation.
- **Phase kickback**, expressed most naturally in P form.
- **The `H → P(λ) → H` circuit** gives P(0) = cos²(λ/2) — a continuous dial from certain-0 to certain-1, driven **purely by phase**. It is the cleanest single demonstration that relative phase is physically real.

---

## The three TWO-QUBIT gates

**CX · CZ · SWAP**

Everything so far rotates a single Bloch vector. These three act on **two qubits at once**, and that changes the game entirely: they are the gates that can create **entanglement**, and without entanglement a quantum computer is efficiently simulable on a laptop.

Two-qubit gates are also, on every hardware platform ever built, **the hard part** — typically 5–10× slower and 10× less accurate than single-qubit gates. Two-qubit gate count is the number that decides whether a circuit will run.

All matrices below use the textbook ordering |q_control q_target⟩ with basis order |00⟩, |01⟩, |10⟩, |11⟩. (Qiskit prints matrices in little-endian order, which permutes the rows — see §18.4.)

---

## 15. CX — CONTROLLED-NOT (CNOT)

```
        [ 1  0  0  0 ]
CX =    [ 0  1  0  0 ]        "if the control is |1⟩, flip the target"
        [ 0  0  0  1 ]
        [ 0  0  1  0 ]
```

### What it does
| Input | Output |
|---|---|
| \|00⟩ | \|00⟩ |
| \|01⟩ | \|01⟩ |
| \|10⟩ | \|**11**⟩ |
| \|11⟩ | \|**10**⟩ |

On basis states it is exactly the classical XOR: target ← target ⊕ control. That's the boring half.

### The interesting half — it creates entanglement
Feed it a **superposition** on the control and it stops behaving like a classical gate entirely:
```
CX · (H ⊗ I) |00⟩ = (|00⟩ + |11⟩)/√2 = |Φ⁺⟩
```
*(Verified: [0.7071, 0, 0, 0.7071].)* Two gates, and you have a Bell state — a joint state that cannot be factorised into two individual qubit states. This two-gate circuit is the "hello world" of quantum computing, and the natural next step after the single-qubit gates.

### The control/target illusion
CNOT looks asymmetric — one qubit is clearly in charge. It isn't. **In the X basis the roles reverse completely:**
```
(H ⊗ H) · CX(0→1) · (H ⊗ H) = CX(1→0)        (verified)
```
Surround a CNOT with Hadamards on both qubits and the control becomes the target. The asymmetry is an artefact of which basis you happen to be looking in — a genuinely surprising fact, and the cleanest demonstration that "control" is not a physical role.

Related: CNOT with the control in |+⟩ and target in |1⟩ **kicks a phase back onto the control**. This is *phase kickback*, the mechanism inside Deutsch–Jozsa, phase estimation and Shor's algorithm.

### Properties
| Property | Value |
|---|---|
| Inverse | CX (self-inverse: CX² = I — verified) |
| Clifford? | Yes |
| Entangling? | **Yes** |
| Universality | {H, T, CX} is universal |
| Also written | CNOT, controlled-X |

### Real-world role
- **The standard entangling gate**, and the unit in which circuit cost is quoted. Resource estimates say "this algorithm needs 10⁵ CNOTs," not "10⁵ gates."
- **Classical logic in quantum circuits.** Together with the Toffoli (CCX), CNOTs build the reversible arithmetic inside oracles.
- **Error correction.** Syndrome extraction is CNOTs from data qubits onto ancillas, over and over. The surface code is essentially a CNOT schedule.
- **Hardware:** on superconducting chips it's built from a cross-resonance or tunable-coupler interaction, typically 100–500 ns with fidelity around 99–99.9% — an order of magnitude worse than single-qubit gates, and the dominant error source in any real circuit.

---

## 16. CZ — CONTROLLED-Z

```
CZ = diag(1, 1, 1, −1)        "if both qubits are |1⟩, apply a phase of −1"
```

### What it does
Flips the sign of the |11⟩ amplitude and touches nothing else. On basis states it does **nothing observable at all** — no bit changes anywhere. Its entire effect is phase, which makes it the two-qubit analogue of Z.

### It is completely symmetric
```
CZ = CZᵀ         control and target are interchangeable (verified)
```
There is no "control" qubit. Swapping which qubit you call the control gives literally the same matrix. Circuit diagrams reflect this by drawing CZ with a dot at **both** ends rather than a dot and a ⊕.

### It is CNOT in disguise
```
CZ = (I ⊗ H) · CX · (I ⊗ H)        (verified exactly)
```
Sandwich a CNOT between Hadamards on the target and you get CZ. They are the same gate viewed in different bases, and both are equally entangling:
```
CZ|+⟩|+⟩ = ½(|00⟩ + |01⟩ + |10⟩ − |11⟩)     — entangled (verified)
```

### Phase kickback, in one line
```
CZ |+⟩|1⟩ = |−⟩|1⟩        (verified)
```
The target was already in an eigenstate of Z, so it doesn't change — but its eigenvalue (−1) has been **kicked back** onto the control, flipping |+⟩ to |−⟩. This one identity is the seed of Deutsch–Jozsa, Grover's oracle and quantum phase estimation. If a learner understands this line, they understand why quantum algorithms work.

### Properties
| Property | Value |
|---|---|
| Inverse | CZ (self-inverse — verified) |
| Clifford? | Yes |
| Entangling? | **Yes** |
| Symmetric? | **Yes** — unique among these three in having no control/target distinction |

### Real-world role
- **The native two-qubit gate** on many platforms — neutral-atom arrays (via Rydberg blockade) and several superconducting architectures implement CZ directly and compile CNOT *into* it, rather than the other way round.
- **Grover's oracle** is typically a multi-controlled Z: mark the target state by flipping its sign, then let the diffusion operator turn that sign into amplitude.
- **Cluster states** for measurement-based quantum computing are built by applying CZ across a lattice of |+⟩ states.
- **Controlled-phase generally.** CZ is the λ = π case of controlled-P; the QFT uses the whole continuous family.

---

## 17. SWAP — exchange two qubits

```
         [ 1  0  0  0 ]
SWAP =   [ 0  0  1  0 ]        |ab⟩ → |ba⟩
         [ 0  1  0  0 ]
         [ 0  0  0  1 ]
```

### What it does
Exchanges the two qubits' states entirely. |01⟩ ↔ |10⟩; |00⟩ and |11⟩ are unchanged.

### The thing everyone gets wrong
**SWAP cannot create entanglement.** It acts on two qubits, it is not a product of single-qubit gates, and it still maps every product state to a product state — it just relabels which qubit holds which state. Acting on two qubits and *entangling* them are different things, and SWAP is the counterexample that proves it.

(Its square root, √SWAP, **is** entangling and is universal with single-qubit gates. Halfway through the exchange, the qubits are maximally entangled — the entanglement appears in the middle of the operation and disappears again at the end. A nice demo if you ever add parameterised two-qubit gates.)

### It costs three CNOTs
```
SWAP = CX(0→1) · CX(1→0) · CX(0→1)        (verified)
```
This is the single most expensive fact in near-term quantum computing. Real chips are **not** fully connected — a qubit can only interact with its physical neighbours. To apply a two-qubit gate between distant qubits, the compiler inserts **SWAP chains** to walk them together, and each SWAP costs three of the noisiest gates on the device.

On a heavy-hex or grid layout, routing overhead routinely **doubles or triples** the two-qubit gate count of a naïve circuit. Qubit-mapping and routing is an entire research field for this reason, and it's why "how many qubits" is a far less useful spec than "how are they connected."

### Properties
| Property | Value |
|---|---|
| Inverse | SWAP (self-inverse — verified) |
| Clifford? | Yes |
| Entangling? | **No** |
| Cost | 3 CNOTs |
| Symmetric? | Yes |

### Real-world role
- **Routing on limited-connectivity hardware** — by far its main use, and mostly inserted by the compiler rather than written by a human.
- **Reordering** qubits before measurement, or to match an algorithm's expected register layout (the QFT ends with a bit-reversal that is a chain of SWAPs).
- **SWAP test** — a small circuit using a controlled-SWAP (Fredkin gate) to estimate the overlap |⟨ψ|φ⟩|² between two states. Widely used in quantum machine learning for computing kernels.

---

## 18. Cross-cutting facts about all 16 gates

### 18.1 Complete identity list (every line verified numerically)
```
SELF-INVERSE
X² = Y² = Z² = H² = I         CX² = CZ² = SWAP² = I

ROOTS AND POWERS
S² = Z      S⁴ = I      S† = S³
T² = S      T⁴ = Z      T⁸ = I      T† = T⁷
SX² = X     (SX = √X, a native IBM gate)

DECOMPOSITIONS
H = (X + Z)/√2
CZ   = (I ⊗ H) · CX · (I ⊗ H)
SWAP = CX(0→1) · CX(1→0) · CX(0→1)
CX(1→0) = (H ⊗ H) · CX(0→1) · (H ⊗ H)

CONJUGATIONS
H X H = Z     H Z H = X     H Y H = −Y
S X S† = Y    S Y S† = −X   S Z S† = Z

PAULI ALGEBRA
XY = iZ       YZ = iX       ZX = iY       XYZ = iI       XY = −YX

FIXED GATES AS ROTATIONS (each up to a global phase)
X = e^{iπ/2}RX(π)    Y = e^{iπ/2}RY(π)    Z = e^{iπ/2}RZ(π)
S = e^{iπ/4}RZ(π/2)  T = e^{iπ/8}RZ(π/4)
P(π) = Z             P(π/2) = S           P(π/4) = T        (exact, not up to phase)
RZ(θ) = e^{−iθ/2}·P(θ)

ANGLE ADDITION
RX(a)·RX(b) = RX(a+b)     and likewise for RY, RZ, P
```

### 18.2 Cost on real hardware — the ordering that surprises people
| Class | Gates | Duration | Error |
|---|---|---|---|
| **z-rotations** | Z, S, S†, T, T†, RZ, P | **0 ns** | **~0** |
| Single-qubit pulses | X, Y, H, RX, RY, SX | ~20–50 ns | ~10⁻³–10⁻⁴ |
| **Two-qubit** | CX, CZ | ~100–500 ns | **~10⁻²–10⁻³** |
| SWAP | (3 × CX) | ~3× a CNOT | ~3× a CNOT |

**Every z-rotation is free.** Because they all rotate about the same axis, hardware implements them as a **frame change** — shifting the phase of every subsequent pulse rather than emitting one. Zero duration, essentially zero error.

But note §18.3: under **error correction** this ordering inverts completely.

### 18.3 Clifford vs non-Clifford — the line that matters most
| Clifford (efficiently simulable classically) | Non-Clifford (the source of advantage) |
|---|---|
| I, X, Y, Z, H, S, S†, CX, CZ, SWAP | **T, T†**, and RX/RY/RZ/P at generic angles |

The **Gottesman–Knill theorem**: a circuit built *only* from Clifford gates can be simulated efficiently on a classical computer — even though it entangles freely, creates Bell states and runs error correction. Entanglement alone is **not** sufficient for quantum advantage.

Adding **T** is precisely the step from "simulable on a laptop" to "believed classically intractable." And T is exactly the gate that error correction struggles with: it cannot be implemented transversally and requires **magic-state distillation**, consuming many noisy states to purify one good one.

**So the free gate today becomes the dominant cost tomorrow.** Resource estimates for fault-tolerant algorithms are quoted in **T-count**, and T-factories often dominate the chip area. This inversion is the single most counter-intuitive fact in the table.

### 18.4 Qubit ordering — a real source of bugs
Qiskit is **little-endian**: in a printed bitstring, qubit 0 is the **rightmost** character. Consequently `cx(0,1)` has this matrix in Qiskit's basis ordering:
```
[[1,0,0,0], [0,0,0,1], [0,0,1,0], [0,1,0,0]]
```
— **not** the textbook `[[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]]` used throughout §15–17, which assumes |q₀ q₁⟩. Both are correct; they describe the same gate under different conventions. Pick one, state it plainly, and be consistent — this catches almost every beginner exactly once.

### 18.5 Master table — all 16 gates
| # | Gate | Family | Matrix / action | Axis | Angle | Inverse | Clifford | Changes P? | Entangles? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **I** | fixed | diag(1, 1) | — | 0 | I | Yes | No | — |
| 2 | **X** | fixed | [[0,1],[1,0]] | x̂ | π | X | Yes | Yes | — |
| 3 | **Y** | fixed | [[0,−i],[i,0]] | ŷ | π | Y | Yes | Yes | — |
| 4 | **Z** | fixed | diag(1, −1) | ẑ | π | Z | Yes | **No** | — |
| 5 | **H** | fixed | (1/√2)[[1,1],[1,−1]] | (x̂+ẑ)/√2 | π | H | Yes | Yes | — |
| 6 | **S** | fixed | diag(1, i) | ẑ | +π/2 | S† | Yes | **No** | — |
| 7 | **S†** | fixed | diag(1, −i) | ẑ | −π/2 | S | Yes | **No** | — |
| 8 | **T** | fixed | diag(1, e^{iπ/4}) | ẑ | +π/4 | T† | **No** | **No** | — |
| 9 | **T†** | fixed | diag(1, e^{−iπ/4}) | ẑ | −π/4 | T | **No** | **No** | — |
| 10 | **RX(θ)** | rotation | [[cos θ/2, −i sin θ/2],[−i sin θ/2, cos θ/2]] | x̂ | θ | RX(−θ) | at π/2 multiples | Yes | — |
| 11 | **RY(θ)** | rotation | [[cos θ/2, −sin θ/2],[sin θ/2, cos θ/2]] | ŷ | θ | RY(−θ) | at π/2 multiples | Yes | — |
| 12 | **RZ(θ)** | rotation | diag(e^{−iθ/2}, e^{iθ/2}) | ẑ | θ | RZ(−θ) | at π/2 multiples | **No** | — |
| 13 | **P(λ)** | rotation | diag(1, e^{iλ}) | ẑ | λ | P(−λ) | at π/2 multiples | **No** | — |
| 14 | **CX** | two-qubit | flip target if control = \|1⟩ | — | — | CX | Yes | Yes | **Yes** |
| 15 | **CZ** | two-qubit | diag(1,1,1,−1) | — | — | CZ | Yes | **No** | **Yes** |
| 16 | **SWAP** | two-qubit | \|ab⟩ → \|ba⟩ | — | — | SWAP | Yes | Yes | **No** |

**Nine of the sixteen never change a measurement probability** — I, Z, S, S†, T, T†, RZ, P and CZ. Every one of them is a **diagonal matrix**, and a diagonal matrix cannot move amplitude between basis states; it can only re-label each amplitude's phase.

Only one of those nine (the identity) is genuinely doing nothing. The other eight are doing real work that the probability histogram is simply the wrong instrument to detect — they write phase, and phase is where an algorithm stores its work until interference converts it into an answer.

---

## 19. The misconceptions worth pre-empting

1. **"X is the quantum NOT gate."** True only for |0⟩ and |1⟩. On |+⟩ it does nothing at all. It is a rotation, not a flip.
2. **"Z / S / T / RZ do nothing — the bars don't move."** They never move the bars in the computational basis, by construction. Follow any of them with an H and the effect is dramatic. This is the number-one confusion in every quantum simulator.
3. **"H makes the qubit random."** It produces |+⟩, a fully determined state. It looks random only because you then measured along Z.
4. **"The dagger gates are redundant."** They are what makes uncomputation, Y-basis measurement and randomised benchmarking possible.
5. **"T is a minor gate — it's the smallest rotation."** T is the only non-Clifford gate in the fixed set, hence the sole source of quantum advantage there, and the dominant cost in fault-tolerant designs.
6. **"All gates cost the same."** Z-rotations are free and instantaneous; two-qubit gates are ~10× less accurate than single-qubit ones. Under error correction the ordering inverts and T becomes the most expensive thing on the chip.
7. **"X and Y do the same thing to |0⟩."** They give |1⟩ and i|1⟩ — indistinguishable, because global phase is unobservable. They differ completely on superpositions and inside controlled gates.
8. **"RZ and P are the same gate."** Identical Bloch rotation, different global phase. Inside a controlled gate they are genuinely different operations.
9. **"A 2π rotation returns the state unchanged."** RX(2π)|0⟩ = −|0⟩. You need 4π. Undetectable in isolation, real inside interference.
10. **"SWAP entangles two qubits."** It does not — it maps every product state to a product state. It also costs three CNOTs, making it one of the most expensive operations on real hardware.
11. **"CNOT has a control and a target."** In the X basis those roles swap exactly. The asymmetry is a basis artefact, not a physical fact.
12. **"Any two-qubit gate gives quantum advantage."** CX, CZ and SWAP are all Clifford. A circuit of nothing but Clifford gates — entanglement included — is efficiently simulable classically (Gottesman–Knill).

---

# PART C — WHERE ALL OF THIS STANDS IN THE REAL WORLD

*A snapshot as of mid-2026. This is the fastest-moving part of the document — every figure below should be read as a dated snapshot, not a permanent fact.*

Parts A and B describe the physics and the mathematics, both of which are settled. This part describes the engineering, which is not. It exists because the most common question after "what is superposition?" is "so does any of this actually work yet?" — and the honest answer is more interesting than either the hype or the dismissal.

---

## C.1 The short version

**Quantum sensing works today and is sold commercially.** **Quantum communication works today and is deployed in national networks.** **Quantum computing works in the lab, has just crossed its most important engineering threshold, and is still several years from doing anything a classical computer cannot.**

Those three technologies use the same physics — superposition, phase, interference, measurement, entanglement — at wildly different levels of maturity. Conflating them is the source of most public confusion about the field.

---

## C.2 Quantum computing hardware — the four platforms

| Platform | How the qubit is made | Strength | Weakness | Typical gate speed |
|---|---|---|---|---|
| **Superconducting** | Microwave circuits on a chip, cooled to ~15 mK | Fast gates, mature chip fabrication | Needs a dilution refrigerator; shorter coherence | 20–100 ns |
| **Trapped ion** | Individual ions held by electromagnetic fields, controlled by lasers | Highest gate fidelities; all-to-all connectivity | Slow gates; harder to scale in one trap | 1–100 µs |
| **Neutral atom** | Atoms held in optical tweezers (focused laser beams) | Scales to thousands cheaply; atoms can be physically moved | Slower reconfiguration; gate fidelity still improving | µs range |
| **Photonic** | Individual photons | Room temperature; standard fabrication | Photons are hard to store and to make interact | — |

There is no consensus winner. Superconducting has the head start and the largest installed base; trapped ions have the best accuracy; neutral atoms have the best scaling story; photonics has the most attractive long-term physics and the hardest near-term engineering.

### Scale
The largest array of individually controlled qubits assembled to date is a **6,100-atom neutral-atom array** built at Caltech and published in *Nature* in September 2025 — roughly a five-fold jump over the previous record of about 1,180. Crucially, the scale-up did not cost quality: the atoms held superposition for around **13 seconds** (about ten times longer than earlier tweezer arrays), individual operations were performed with roughly **99.98%** accuracy, and atoms were physically **shuttled hundreds of micrometres across the array while remaining in superposition** — a striking demonstration that a quantum state can be carried from place to place.

Note carefully: *trapping and controlling* 6,100 qubits is not the same as *entangling and computing with* 6,100 qubits. It is a components milestone, not a computer.

### Accuracy
Two-qubit gate fidelities on the best trapped-ion and silicon-spin systems are now quoted around **99.9–99.99%**; leading superconducting systems sit somewhat below that. That gap sounds small and is not: error-correction overhead depends steeply on physical fidelity, which is why the platforms with the best fidelity currently lead the logical-qubit tables despite having far fewer physical qubits.

### The threshold moment
In December 2024 Google's **Willow** processor (105 qubits) demonstrated **below-threshold** error correction: increasing the size of the error-correcting code made the logical error rate go *down* rather than up. This is the result the entire field had been waiting decades for, because it converts error correction from a theoretical hope into an engineering scaling law. Through 2025 and into 2026 several groups have reported **tens of logical qubits** encoded from hundreds of physical ones, across neutral-atom and trapped-ion platforms.

Treat any specific logical-qubit number you read with care. Vendors count differently, "logical qubit" is not a standardised term, and the figures change every few months.

### Coherence times — the number that actually limits circuits
| Platform | Typical T₁ / T₂ |
|---|---|
| Superconducting | ~100–500 µs |
| Neutral atom (hyperfine) | seconds — up to ~13 s in the best arrays |
| Trapped ion | seconds to minutes |

Divide coherence time by gate time and you get the rough ceiling on circuit depth. This ratio, not qubit count, is what decides whether an algorithm finishes before the answer dissolves into noise.

### The honest limit
Current machines are **NISQ** — noisy, intermediate-scale, uncorrected. Breaking RSA-2048 is currently estimated to need on the order of **hundreds of thousands to millions** of physical qubits running for hours — the estimates have been falling as algorithms improve, but remain orders of magnitude beyond any existing machine. Useful commercial advantage on chemistry and materials problems is generally projected for the late 2020s, not now. The field's own roadmaps say this openly; the hype does not.

---

## C.3 What already works commercially

This is the part usually left out, and it's the part that makes the concepts feel real.

### Quantum random number generation — shipping in volume
The circuit is `H` followed by a measurement: create a superposition, measure it, get a bit whose value did not exist before you asked. QRNG chips are certified to national entropy standards and sold into data centres, smart devices, financial systems and government networks. This is the Born rule as a product — and it is the only known source of numbers that are *fundamentally* rather than *computationally* unpredictable.

Related: a quantum computer has been used to generate **certified randomness** — randomness that can be *proven* to be genuine to a remote party, not merely asserted — with a financial institution as the first customer.

### Quantum key distribution — deployed nationally
BB84 and its descendants turn measurement disturbance into a security guarantee: an eavesdropper must measure, measuring disturbs, and the disturbance shows up as a rise in the error rate. QKD systems are commercially mature — one vendor's fourth-generation product received a national security certification in South Korea in 2025, and large national QKD backbones operate in China across government and financial networks. Standards work is active at ETSI, ITU, ISO and IEEE.

### Quantum sensing — the nearest-term technology of all
Sensing needs coherence but not error correction, so it arrived first.

- **Atomic clocks** are the most mature quantum technology in existence, with field-deployed and chip-scale products. They define the SI second, and they underpin GPS.
- **Cold-atom gravimeters** use atom interferometry — a superposition of two paths at different heights, recombined to read the phase gravity imprinted. They are in the field for volcano monitoring (including on Mount Etna), groundwater and aquifer surveying, mineral exploration and civil engineering, with portable units operating from vehicles and drones.
- **Magnetometers** — SQUIDs reaching femtotesla sensitivity for clinical brain imaging (magnetoencephalography), and nitrogen-vacancy centres in diamond doing similar work at room temperature and chip scale.

The contrast worth noticing: **quantum sensors with a few hundred atoms already beat the best classical instruments**, while quantum computers with a few hundred qubits do not yet beat classical computers. Sensing needs only superposition and interference. Computing needs those *plus* entanglement, *plus* error correction, *plus* scale.

---

## C.4 Entanglement as infrastructure

Entanglement has moved from a laboratory curiosity to something transmitted through city fibre.

- **Satellite links.** Entangled photon pairs have been distributed from orbit over roughly **1,200 km**, and satellite-mediated quantum-secured links have connected ground stations nearly **13,000 km** apart.
- **Metropolitan fibre.** In January 2026 a quantum teleportation experiment ran across roughly 30 km of live Berlin metro fibre **alongside ordinary internet traffic on the same cables** — a strong signal that quantum links may not require dedicated infrastructure.
- **Between different hardware.** Teleportation has been demonstrated between two *dissimilar* quantum dots over a free-space link, a prerequisite for networks built from components that were not manufactured to be identical.
- **Distributed quantum computing.** Linking separate processors through entanglement is now an explicit part of several vendors' roadmaps — a plausible route around the difficulty of putting a million qubits on one chip.

A reminder that belongs next to every one of these results: **none of it transmits information faster than light.** Teleportation consumes a shared entangled pair *and* requires two ordinary classical bits to be sent over a normal channel. Without that classical message, the receiving end holds nothing but noise.

---

## C.5 What to tell a beginner who asks "is it real?"

A fair answer in four sentences:

1. The physics is not in doubt — it has been tested to extraordinary precision for a century, and the experiments that closed the last loopholes in Bell's theorem won the 2022 Nobel Prize.
2. Quantum sensing and quantum communication are working products you can buy today.
3. Quantum computing has just crossed the error-correction threshold, which is the hard part, but is still small, noisy, and not yet better than a classical computer at anything commercially useful.
4. The gap between "the threshold is crossed" and "a useful machine exists" is several orders of magnitude in scale, and probably several years — and anyone who gives you a confident date is guessing.

---

*Note on accuracy: every matrix, identity, eigenvalue, rotation angle, probability and Bloch coordinate in this document was verified by direct numerical computation. Dates and names in the history tables reflect standard, widely agreed accounts of when each idea appeared. Hardware figures — gate durations, fidelities, qubit counts and native gate sets — are a snapshot of a fast-moving field and vary by vendor and generation; treat them as indicative and re-check before quoting them anywhere with an "as of" date attached. Two items are deliberately flagged in the text as contested rather than settled: quantum coherence in photosynthesis, and the interpretation of measurement collapse.*
