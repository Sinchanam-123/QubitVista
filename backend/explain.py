"""Per-circuit teaching content.

Generated from the gate list plus the ACTUAL simulated result, so the numbers
quoted in the text can never drift from the numbers in the panels.

Every circuit gets:
  concept      which of the six Phase 1 concepts it demonstrates
  summary      one line, shown next to the circuit
  what_happens the physics, in plain English
  watch        what moves and what does NOT -- the teaching payload
  uses         where this matters in real quantum computing
  try_next     related circuits worth building afterwards
"""
from __future__ import annotations
import math

PI = math.pi

CONCEPT_LABEL = {
    "superposition": "Superposition",
    "phase": "Phase",
    "interference": "Interference",
    "measurement": "Measurement",
    "state_evolution": "State evolution",
    "reversibility": "Reversibility",
}

CONCEPT_INTRO = {
    "superposition": "A qubit holding 0 and 1 at the same time. On the sphere the vector leaves a pole and tilts toward the equator.",
    "phase": "The angle of a complex amplitude. Global phase is undetectable; relative phase is real, invisible in the bars, and only the sphere shows it.",
    "interference": "Amplitudes adding and cancelling. This is where a hidden phase turns into a measurable probability.",
    "measurement": "Turning a quantum state into a classical outcome. The probabilities come from the squared amplitudes.",
    "state_evolution": "Every gate is a rotation of the Bloch vector. Between measurements, evolution is completely deterministic.",
    "reversibility": "Every gate has an inverse. Run it and its inverse, and the state returns exactly where it began.",
}

PHASE_GATES = {"S", "SDG", "T", "TDG", "Z", "RZ", "P", "I"}
ROT = {"RX", "RY", "RZ", "P"}

# Everyday hooks for each concept: one analogy that makes it click, and places the
# physics already shows up in things that exist today. Deliberately real — every
# example below is a working technology, not a "someday quantum computers will".
CONCEPT_EXTRAS = {
    "superposition": {
        "icon": "🪙",
        "analogy": "A coin spinning in the air. It is not secretly heads already and hiding it "
                   "from you — while it spins it is genuinely both, and only landing forces a choice. "
                   "The Bloch vector leaving the pole is that spin.",
        "real_world": [
            "Atomic clocks — the ones that define the second and keep GPS accurate to a few "
            "nanoseconds — work by driving caesium atoms into a superposition of two energy "
            "levels and watching how it evolves.",
            "MRI scanners do the same trick with hydrogen nuclei in your body: a pulse tips them "
            "into superposition, and the signal they give off on the way back is your scan.",
        ],
    },
    "phase": {
        "icon": "🌊",
        "analogy": "Two identical waves, one shifted slightly later than the other. Listen to "
                   "either one alone and they sound the same — the shift is inaudible. Play them "
                   "together and it decides everything: perfectly aligned they double, perfectly "
                   "opposed they vanish.",
        "real_world": [
            "Noise-cancelling headphones work purely on phase: a microphone hears the noise, the "
            "speaker plays it back inverted, and the two cancel before reaching your ear.",
            "The anti-reflective coating on glasses and camera lenses is a layer cut to a "
            "thickness that puts reflections exactly out of phase, so they cancel themselves out.",
        ],
    },
    "interference": {
        "icon": "🎯",
        "analogy": "Ripples from two stones dropped in a pond. Where crests meet, the water "
                   "doubles; where a crest meets a trough, the surface goes flat. Nothing was "
                   "removed — the paths simply cancelled.",
        "real_world": [
            "LIGO detected gravitational waves this way: laser beams down two 4 km arms, "
            "recombined so they normally cancel. A passing wave stretched one arm by a fraction "
            "of a proton's width, and the cancellation broke.",
            "This is the actual source of quantum speedup — algorithms are built so the wrong "
            "answers cancel and the right one reinforces. Without interference a quantum "
            "computer would just be an expensive random number generator.",
        ],
    },
    "measurement": {
        "icon": "🎲",
        "analogy": "Rolling a loaded die. The odds are fixed before the throw, but the throw "
                   "itself is genuinely unpredictable — and once it lands, the roll is over. You "
                   "cannot un-see the result.",
        "real_world": [
            "Quantum random number generators sample exactly this and are sold commercially — "
            "unlike a software PRNG, the unpredictability is physical, not just hard to guess.",
            "Quantum key distribution (BB84) turns it into security: measuring in the wrong basis "
            "destroys the state, so an eavesdropper cannot listen without leaving evidence.",
        ],
    },
    "state_evolution": {
        "icon": "🧭",
        "analogy": "Turning a globe. Each gate spins it a set amount about a set axis — no "
                   "guesswork, no drift. Do the same turns in the same order and you land in "
                   "exactly the same place, every time.",
        "real_world": [
            "This is literally how the hardware is driven: on a superconducting quantum computer "
            "an RX is a microwave pulse of a measured duration, and an RZ is often just a "
            "bookkeeping shift that costs no time at all.",
            "Rotation angles are the trainable parameters of quantum machine learning — training "
            "a model means searching for the right angles, the same way a neural net searches "
            "for weights.",
        ],
    },
    "reversibility": {
        "icon": "⏪",
        "analogy": "Rewinding a video frame for frame and arriving at exactly the opening shot — "
                   "not a re-recording, not nearly right, the identical frame. Between "
                   "measurements, quantum evolution loses nothing at all.",
        "real_world": [
            "Compilers exploit it constantly: spotting a gate next to its inverse and deleting "
            "both is one of the first optimisations run on any real circuit.",
            "Landauer's principle ties it to physics — erasing a bit must dissipate heat, but a "
            "reversible operation need not. It sets a floor on how little energy computing can "
            "possibly use.",
        ],
    },
}


# Long-form material for the Learn page. Kept separate from CONCEPT_EXTRAS so the
# simulator's side panel stays short — it merges both, the panel renders only what
# it needs, and the Learn page renders the lot.
CONCEPT_DEEP = {
    "superposition": {
        "headline": "A qubit is not a bit that hasn't made up its mind.",
        "sections": [
            {"h": "What the state actually is",
             "p": "A qubit's state is written α|0⟩ + β|1⟩, where α and β are complex numbers called "
                  "amplitudes. The only rule is |α|² + |β|² = 1. A classical bit has two possible "
                  "states; a qubit has a continuum of them, one for every pair of amplitudes "
                  "satisfying that constraint. Those are exactly the points on the Bloch sphere."},
            {"h": "It is not hidden information",
             "p": "The tempting reading is that the qubit is secretly 0 or 1 and we simply do not "
                  "know which. That reading is wrong, and experiment rules it out. The state "
                  "α|0⟩ + β|1⟩ is completely specified — there is nothing further to know about it. "
                  "The 50/50 outcome of measuring |+⟩ is a property of the state itself, not of our "
                  "ignorance about it. This is the difference between a qubit and a coin under a cup."},
            {"h": "How you create it",
             "p": "H is the standard way in: it takes a pole to the equator, giving an exact 50/50 "
                  "split. RY(θ) is the tunable version, letting you dial any split you like via "
                  "P(1) = sin²(θ/2). Watch bloch.length while you do it — it stays at exactly 1.0, "
                  "which says the state is pure. A length below 1 would mean genuine uncertainty "
                  "about which state you hold, and that is a different thing entirely."},
            {"h": "The common misconception",
             "p": "Superposition is often sold as 'trying every answer at once'. That is misleading. "
                  "A measurement returns a single outcome, so raw parallelism buys you nothing on "
                  "its own. The advantage only appears when interference is arranged so the wrong "
                  "answers cancel before you measure. Superposition is the setup; interference is "
                  "the payoff."},
        ],
    },
    "phase": {
        "headline": "The information the probability bars physically cannot show you.",
        "sections": [
            {"h": "Amplitudes are complex, and that matters",
             "p": "Each amplitude has a magnitude and an angle. Squaring the magnitude gives you a "
                  "probability and throws the angle away — which is why the bars can sit perfectly "
                  "still while the state changes underneath them. QubitVista shows the phase dial "
                  "beside every amplitude precisely so that change stays visible."},
            {"h": "Global phase is not real; relative phase is",
             "p": "Multiplying the whole state by e^(iφ) changes no measurable quantity whatsoever, "
                  "in any basis, ever. That is why RX(π) and X are interchangeable in practice even "
                  "though their amplitudes differ. But the phase *between* the two amplitudes is "
                  "entirely physical. |0⟩ + |1⟩ and |0⟩ − |1⟩ are different states, and one H gate "
                  "tells them apart with certainty."},
            {"h": "Why a phase gate on a pole does nothing",
             "p": "S, T, Z and RZ all rotate the Bloch vector about the z-axis. A state sitting at "
                  "|0⟩ or |1⟩ lies on that axis, so the rotation has nothing to turn. The circuit is "
                  "not broken — the gate genuinely has no observable effect there. Put an H in front "
                  "and the same gate suddenly moves the state right around the equator."},
            {"h": "Turning phase into something you can measure",
             "p": "Phase alone never shows up in a measurement. To read it you must convert it back "
                  "into amplitude, and a second H does exactly that. The circuit H → RZ(θ) → H is "
                  "the whole story in three gates: invisible in the middle, decisive at the end."},
        ],
    },
    "interference": {
        "headline": "Where quantum computing actually gets its advantage.",
        "sections": [
            {"h": "Amplitudes add before they are squared",
             "p": "If a computational path can reach the same outcome two ways, you add the "
                  "amplitudes and square the total — you do not add the probabilities. Because "
                  "amplitudes are complex, they can cancel. Two routes each 50% likely on their own "
                  "can combine to give an outcome that never happens at all. Nothing was removed; "
                  "the contributions simply summed to zero."},
            {"h": "The three-gate interferometer",
             "p": "H → RZ(θ) → H is a complete Mach–Zehnder interferometer on one qubit. The first H "
                  "splits the path, RZ(θ) delays one arm, the second H recombines them. The result "
                  "follows P(1) = sin²(θ/2) exactly — sweep θ on the slider and the bars trace that "
                  "curve continuously, from fully constructive to fully destructive."},
            {"h": "This is the whole trick",
             "p": "Grover's algorithm marks the right answer with a phase flip that changes no "
                  "probability at all, then uses interference to amplify it. Shor's algorithm runs "
                  "the Quantum Fourier Transform so that periodic structure reinforces and "
                  "everything else cancels. Strip interference out of either and you are left with "
                  "an expensive random number generator."},
        ],
    },
    "measurement": {
        "headline": "The one step you cannot undo.",
        "sections": [
            {"h": "The Born rule",
             "p": "The probability of outcome k is |amplitude of k|². That single rule connects the "
                  "smooth, deterministic evolution of the state to the discrete, random thing you "
                  "actually observe. QubitVista computes these analytically from the statevector, so "
                  "the numbers you see are exact — a real machine would need thousands of repeated "
                  "shots to estimate them this precisely."},
            {"h": "The basis is a choice you make",
             "p": "Measuring 'the qubit' is never basis-free. The computational basis reads along z, "
                  "but applying H before measuring reads along x instead, and the same state can be "
                  "certain in one basis and a coin flip in the other. |+⟩ is a guaranteed outcome "
                  "measured along x and completely random measured along z."},
            {"h": "Why it breaks everything else",
             "p": "Every gate is reversible; measurement is not. It is the one operation that "
                  "destroys information, collapsing a continuum of possible states onto one classical "
                  "result. That is why measurement is pushed to the very end of a circuit, and why "
                  "an algorithm's entire job is to arrange the amplitudes before that moment arrives."},
        ],
    },
    "state_evolution": {
        "headline": "Every gate is a rotation. Nothing is random until you measure.",
        "sections": [
            {"h": "Unitary evolution",
             "p": "Between measurements a quantum state evolves by unitary operations — the "
                  "mathematical statement that total probability is conserved. Whatever circuit you "
                  "build, the probabilities sum to exactly 1 at every single step. If they ever did "
                  "not, something would be wrong with the simulator, not with physics."},
            {"h": "Rotations, not teleports",
             "p": "Every single-qubit gate is, up to global phase, a rotation of the Bloch vector by "
                  "some angle about some axis. X is a half turn about x; S is a quarter turn about z; "
                  "H is a half turn about the diagonal between x and z. The state travels a "
                  "continuous arc across the surface — it never jumps, and it never cuts through the "
                  "middle."},
            {"h": "Why QubitVista reports the axis and angle",
             "p": "Knowing only where the vector started and ended, an animation has to guess the "
                  "path, and the obvious guess — a straight line — passes through the inside of the "
                  "sphere, which is not where the state ever goes. Each step therefore carries its "
                  "own rotation axis and angle, checked against Rodrigues' formula, so the motion "
                  "you watch is the motion that actually happened."},
            {"h": "Deterministic, and worth stepping through",
             "p": "Run the same gates in the same order and you land in exactly the same place, every "
                  "time. That is what makes the step scrubber worth using: the final state hides the "
                  "route taken to reach it, and the route is usually where the lesson is."},
        ],
    },
    "reversibility": {
        "headline": "Quantum evolution destroys no information at all.",
        "sections": [
            {"h": "Every gate has an exact inverse",
             "p": "Unitary means U†U = I, so every gate can be undone precisely. S is undone by S†, "
                  "T by T†, and H, X, Y and Z are each their own inverse. Run a gate and its inverse "
                  "and the state returns to where it began — not approximately, not to within "
                  "rounding, but to every digit the simulator prints."},
            {"h": "Reversible does not mean visible",
             "p": "S followed by S† on |0⟩ is the cleanest reversibility demo there is, and it moves "
                  "nothing on screen — because S on |0⟩ sits on its own rotation axis and has no "
                  "observable effect to begin with. If you want to watch the round trip actually "
                  "travel, try H,H or X,X instead: those leave home and come back."},
            {"h": "Why it matters in practice",
             "p": "Compilers cancel adjacent inverse pairs as one of the first optimisations they "
                  "run. Algorithms use uncomputation to undo scratch work and free qubits without "
                  "disturbing the superposition they carry. And Landauer's principle ties it to "
                  "thermodynamics: erasing a bit must dissipate heat, while a reversible operation "
                  "need not — a hard floor on the energy cost of computing."},
        ],
    },
}


def concept_extras(name):
    """Analogy, real-world hooks and long-form material. Empty dict if unknown."""
    return {**CONCEPT_EXTRAS.get(name, {}), **CONCEPT_DEEP.get(name, {})}

# ---------------------------------------------------------------- helpers
def _names(gates):
    return [g["gate"].upper() for g in gates]


def _fmt_angle(v):
    r = v / PI
    for num, den, txt in [(0, 1, "0"), (1, 6, "π/6"), (1, 4, "π/4"), (1, 3, "π/3"),
                          (1, 2, "π/2"), (2, 3, "2π/3"), (3, 4, "3π/4"),
                          (5, 6, "5π/6"), (1, 1, "π"), (2, 1, "2π")]:
        if abs(abs(r) - num / den) < 1e-6:
            return ("−" if r < 0 else "") + txt
    return f"{v:.4f} rad"


def _pole_name(b, tol=1e-4):
    x, y, z = b["x"], b["y"], b["z"]
    for vec, name in [((0, 0, 1), "|0⟩"), ((0, 0, -1), "|1⟩"), ((1, 0, 0), "|+⟩"),
                      ((-1, 0, 0), "|−⟩"), ((0, 1, 0), "|+i⟩"), ((0, -1, 0), "|−i⟩")]:
        if abs(x - vec[0]) < tol and abs(y - vec[1]) < tol and abs(z - vec[2]) < tol:
            return name
    return None


def _relative_phase_deg(sv):
    a, b = sv[0], sv[1]
    if a["magnitude"] < 1e-9 or b["magnitude"] < 1e-9:
        return None
    d = math.degrees(b["phase"] - a["phase"])
    return (d + 180) % 360 - 180


def _probs_moved(steps, k):
    """Did probabilities change at step k?"""
    if k == 0:
        return False
    prev, cur = steps[k - 1]["probabilities"], steps[k]["probabilities"]
    return any(abs(prev[b] - cur[b]) > 1e-9 for b in cur)


def _bloch_moved(steps, k):
    if k == 0:
        return False
    p, c = steps[k - 1]["bloch"], steps[k]["bloch"]
    return any(abs(p[a] - c[a]) > 1e-9 for a in "xyz")


# ---------------------------------------------------------------- uses
USES = {
    "H": [
        "Every major quantum algorithm opens with H on all qubits — Grover, Shor and the Quantum Fourier Transform all begin by putting the register into equal superposition.",
        "It is also the X-basis measurement gate: apply H before measuring and you read the qubit along x instead of z.",
    ],
    "superposition_partial": [
        "Loading classical data into a quantum state (amplitude encoding) is done with RY rotations — the angle sets how much weight each outcome carries.",
        "Variational algorithms such as VQE and QAOA use tunable RY layers as their trainable parameters.",
    ],
    "phase_relative": [
        "Phase is where quantum computers store information that classical bits cannot hold. Grover's oracle does not change any probability — it marks the correct answer by flipping its phase alone.",
        "The Quantum Fourier Transform, the engine inside Shor's factoring algorithm, is built almost entirely from controlled phase rotations.",
    ],
    "phase_global": [
        "Knowing global phase is undetectable is what lets compilers rewrite circuits freely — a transpiler may swap your gate for a cheaper one that differs only by global phase.",
        "It is also why RX(π) and X are interchangeable in practice, even though their amplitudes are not identical.",
    ],
    "interference": [
        "Interference is the actual source of quantum speedup. Algorithms are built so that wrong answers cancel and the right answer reinforces.",
        "This three-gate pattern is a one-qubit Mach–Zehnder interferometer — the same structure used in optical experiments and in phase-estimation routines.",
    ],
    "measurement": [
        "Measurement statistics are all a real quantum computer ever returns. Every algorithm's output is a histogram like this one, sampled over many shots.",
        "Choosing the measurement basis is central to quantum key distribution: BB84 keeps a secret by measuring in randomly chosen X or Z bases.",
    ],
    "reversibility": [
        "Reversibility is what allows uncomputation — algorithms undo their scratch work to free qubits without destroying the superposition they are carrying.",
        "It is also the practical basis of circuit optimisation: a compiler cancels adjacent inverse pairs to shorten a circuit before it runs.",
    ],
    "evolution": [
        "Rotation gates are the tunable parameters of every variational algorithm. Training a quantum model means searching for the right angles.",
        "Hardware executes rotations directly: on superconducting machines an RZ is a phase adjustment and an RX is a microwave pulse of a set duration.",
    ],
    "T": [
        "T is the gate that makes a quantum computer universal — Clifford gates alone can be simulated efficiently on a classical machine, and T is what breaks that.",
        "In fault-tolerant designs T is also by far the most expensive gate, so minimising T-count is a major goal of circuit compilation.",
    ],
    "clifford": [
        "Clifford circuits are efficiently simulable on classical hardware (the Gottesman–Knill theorem), which makes them the standard testbed for benchmarking and for quantum error correction.",
        "They can only ever produce probabilities of 0, 0.5 or 1 — a partial split needs a non-Clifford gate such as T.",
    ],
    "identity": [
        "The identity gate is used as an explicit idle instruction: on real hardware a qubit waiting its turn is decaying, so scheduling that wait matters.",
    ],
}


# ---------------------------------------------------------------- per-gate reference
#
# What a single gate *is*, independent of the circuit around it. The circuit-level
# story is explain() below; this is the "you just placed an H, here is what an H is"
# half. Kept here rather than in the frontend so adding a gate means editing one
# file, per the checklist in PROJECT_GUIDE.md.
_R2 = "1/√2"

GATE_INFO = {
    "I": {
        "label": "Identity", "concept": "state_evolution",
        "summary": "Does nothing, on purpose.",
        "detail": "The identity leaves the state exactly as it found it. It exists so a circuit can "
                  "say 'this qubit deliberately waits here' — on real hardware an idle qubit is still "
                  "decohering, so scheduling that wait is a real instruction, not a no-op.",
        "matrix": [["1", "0"], ["0", "1"]],
        "rotation": "angle 0 — the axis is arbitrary",
        "inverse": "I",
        "facts": ["The only gate that changes nothing at all.",
                  "Its rotation angle is 0, so QubitVista reports a dummy z-axis rather than null."],
    },
    "X": {
        "label": "Pauli-X (NOT)", "concept": "state_evolution",
        "summary": "The quantum NOT — flips |0⟩ and |1⟩.",
        "detail": "A half turn of the Bloch sphere about the x-axis. Acting on |0⟩ it behaves exactly "
                  "like a classical NOT gate, sending the vector from the north pole to the south. On a "
                  "superposition it swaps the two amplitudes instead.",
        "matrix": [["0", "1"], ["1", "0"]],
        "rotation": "π about the x-axis",
        "inverse": "X",
        "facts": ["X·X = I, so applying it twice returns you home.",
                  "X is its own inverse — that makes it a one-gate reversibility demo."],
    },
    "Y": {
        "label": "Pauli-Y", "concept": "state_evolution",
        "summary": "A half turn about y — a flip with a phase attached.",
        "detail": "Y rotates π about the y-axis. From |0⟩ the sphere ends up exactly where X would put "
                  "it, but the amplitude picks up a factor of i. That factor is a global phase here, so "
                  "no measurement can tell X and Y apart from |0⟩ — the amplitudes differ, the physics "
                  "does not.",
        "matrix": [["0", "−i"], ["i", "0"]],
        "rotation": "π about the y-axis",
        "inverse": "Y",
        "facts": ["Y = i·X·Z, up to global phase.",
                  "The clearest demo that the amplitude panel can differ while the sphere agrees."],
    },
    "Z": {
        "label": "Pauli-Z", "concept": "phase",
        "summary": "Flips the sign of |1⟩. Invisible on a pole.",
        "detail": "Z is a half turn about the z-axis. It leaves |0⟩ untouched and negates |1⟩. On a pole "
                  "that does nothing observable at all; on the equator it spins the vector half way "
                  "around, which is a real, physical change you can later convert into a probability.",
        "matrix": [["1", "0"], ["0", "−1"]],
        "rotation": "π about the z-axis",
        "inverse": "Z",
        "facts": ["Z·Z = I.", "H·Z·H = X — a phase flip becomes a bit flip in the other basis."],
    },
    "H": {
        "label": "Hadamard", "concept": "superposition",
        "summary": "Creates equal superposition — the gate that starts almost every algorithm.",
        "detail": "H maps |0⟩ to |+⟩ and |1⟩ to |−⟩, moving the Bloch vector from a pole onto the "
                  "equator. Probabilities become an exact 50/50 split. It is a half turn about the "
                  "diagonal axis halfway between x and z, which is why it swaps the roles of those two.",
        "matrix": [[_R2, _R2], [_R2, "−" + _R2]],
        "rotation": "π about (x + z)/√2",
        "inverse": "H",
        "facts": ["H·H = I — a second H undoes the first, which is interference, not erasure.",
                  "Apply H before measuring to read the qubit in the X basis instead of Z."],
    },
    "S": {
        "label": "S — phase gate", "concept": "phase",
        "summary": "Quarter turn about z. Moves phase, never probability.",
        "detail": "S multiplies the |1⟩ amplitude by i, a quarter turn around the equator. The magnitudes "
                  "of both amplitudes are untouched, so the probability bars do not move at all — the "
                  "entire effect lives in the phase. This is the cleanest demonstration that the sphere "
                  "carries information the bars cannot show.",
        "matrix": [["1", "0"], ["0", "i"]],
        "rotation": "π/2 about the z-axis",
        "inverse": "SDG",
        "facts": ["S·S = Z.", "S is Clifford, so on its own it can only ever give probabilities of 0, 0.5 or 1."],
    },
    "SDG": {
        "label": "S† — inverse phase gate", "concept": "reversibility",
        "summary": "Undoes S exactly. A quarter turn the other way.",
        "detail": "S† rotates −π/2 about z, precisely cancelling an S. Place the two together and the "
                  "state returns to where it started — not approximately, exactly, to every digit. That "
                  "is unitarity made visible, and it is why quantum evolution destroys no information.",
        "matrix": [["1", "0"], ["0", "−i"]],
        "rotation": "−π/2 about the z-axis",
        "inverse": "S",
        "facts": ["S then S† is the canonical reversibility circuit (spec case V24).",
                  "S†·S† = Z as well, since Z is its own inverse."],
    },
    "T": {
        "label": "T — π/8 gate", "concept": "phase",
        "summary": "An eighth turn about z. The gate that makes quantum computing universal.",
        "detail": "T is a smaller phase rotation than S — π/4 about z. Like S it moves no probability on "
                  "its own. Its importance is theoretical: Clifford gates alone can be simulated "
                  "efficiently on a classical computer, and T is exactly what breaks that, which is what "
                  "makes a universal quantum computer more powerful than a classical one.",
        "matrix": [["1", "0"], ["0", "e^(iπ/4)"]],
        "rotation": "π/4 about the z-axis",
        "inverse": "TDG",
        "facts": ["T·T = S, and T·T·T·T = Z.",
                  "In fault-tolerant hardware T is by far the most expensive gate — minimising T-count is a major compiler goal."],
    },
    "TDG": {
        "label": "T† — inverse π/8 gate", "concept": "reversibility",
        "summary": "Undoes T exactly.",
        "detail": "T† rotates −π/4 about z, cancelling a T precisely. Pairing a gate with its inverse is "
                  "the most direct way to show that every quantum operation is reversible — run it "
                  "forward, run it back, and nothing at all has been lost.",
        "matrix": [["1", "0"], ["0", "e^(−iπ/4)"]],
        "rotation": "−π/4 about the z-axis",
        "inverse": "T",
        "facts": ["T then T† returns to the exact starting state.",
                  "T†·T† = S†."],
    },
    "RX": {
        "label": "RX(θ) — rotation about x", "concept": "state_evolution",
        "summary": "Tunable rotation about the x-axis.",
        "detail": "RX turns the Bloch vector θ radians about x. Unlike the fixed gates, θ is continuous, "
                  "so the probabilities move smoothly rather than jumping between 0, 0.5 and 1. On real "
                  "superconducting hardware this is a microwave pulse of a chosen duration.",
        "matrix": [["cos(θ/2)", "−i·sin(θ/2)"], ["−i·sin(θ/2)", "cos(θ/2)"]],
        "rotation": "θ about the x-axis",
        "inverse": "RX(−θ)",
        "facts": ["RX(π) equals X up to a global phase — the sphere matches, the amplitudes differ.",
                  "From |0⟩, P(1) = sin²(θ/2)."],
    },
    "RY": {
        "label": "RY(θ) — rotation about y", "concept": "measurement",
        "summary": "Tunable rotation about y. The natural way to set measurement odds.",
        "detail": "RY tilts the vector θ about the y-axis, keeping every amplitude real. That makes it "
                  "the cleanest way to dial in any probability split you like: P(1) = sin²(θ/2) exactly. "
                  "Variational algorithms such as VQE and QAOA use layers of RY as their trainable "
                  "parameters.",
        "matrix": [["cos(θ/2)", "−sin(θ/2)"], ["sin(θ/2)", "cos(θ/2)"]],
        "rotation": "θ about the y-axis",
        "inverse": "RY(−θ)",
        "facts": ["Introduces no phase — the state stays in the x–z plane.",
                  "RY(π/2) gives the same probabilities as H, but a different phase."],
    },
    "RZ": {
        "label": "RZ(θ) — rotation about z", "concept": "phase",
        "summary": "Tunable phase rotation. Invisible alone, decisive between two H gates.",
        "detail": "RZ spins the vector θ about the z-axis. On a pole it does nothing observable; on the "
                  "equator it changes the relative phase without touching a single probability. Put one "
                  "between two Hadamards and that hidden phase becomes measurable: P(1) = sin²(θ/2).",
        "matrix": [["e^(−iθ/2)", "0"], ["0", "e^(iθ/2)"]],
        "rotation": "θ about the z-axis",
        "inverse": "RZ(−θ)",
        "facts": ["RZ(π) equals Z up to a global phase.",
                  "On superconducting hardware an RZ is often free — just a bookkeeping phase shift."],
    },
    "P": {
        "label": "P(λ) — phase shift", "concept": "phase",
        "summary": "Adds λ to the phase of |1⟩ only.",
        "detail": "P leaves |0⟩ completely alone and multiplies |1⟩ by e^(iλ). On the sphere it looks "
                  "just like RZ, because the two differ only by a global phase. It is the building block "
                  "of the controlled-phase rotations that make up the Quantum Fourier Transform.",
        "matrix": [["1", "0"], ["0", "e^(iλ)"]],
        "rotation": "λ about the z-axis",
        "inverse": "P(−λ)",
        "facts": ["P(π) = Z, P(π/2) = S, P(π/4) = T.",
                  "Differs from RZ only by a global phase, so the spheres are identical."],
    },
}


def gate_info(name):
    """Reference card for one gate, or None if it isn't a Phase 1 gate."""
    info = GATE_INFO.get(str(name).upper())
    if info is None:
        return None
    out = dict(info)
    out["gate"] = str(name).upper()
    out["concept_label"] = CONCEPT_LABEL[info["concept"]]
    return out


def _has_inverse_structure(names):
    """Does the circuit contain an explicit undo — a gate paired with its inverse?

    Needed because returning to the start is not on its own enough: any z-rotation
    applied to |0⟩ lands back where it began simply because the state sits on the
    rotation axis. S,S does that and is a composition demo (S·S = Z), not an undo.
    """
    for a, b in (("S", "SDG"), ("T", "TDG")):
        if a in names and b in names:
            return True
    # A self-inverse gate applied an even number of times cancels itself: H,H · X,X.
    return any(g in ("H", "X", "Y", "Z") and names.count(g) % 2 == 0 for g in set(names))


def infer_concept(gates, result):
    """Pick the concept a hand-built circuit demonstrates.

    Catalogue circuits carry a concept from the golden spec; a circuit the user
    dragged together does not, so explain() needs one supplied. Only the cases
    explain() will not re-derive for itself matter here — it overrides this for
    interference, phase and superposition on its own.
    """
    names = _names(gates)
    if not names:
        return "state_evolution"

    steps = result["steps"]

    # Reversibility: ends on the exact starting state, having actually undone
    # something. S,SDG never moves the sphere at all — it is still the cleanest
    # reversibility demo there is, so the test is state equality plus structure,
    # never "did the Bloch vector move".
    if len(names) >= 2 and set(names) != {"I"}:
        first, last = steps[0], steps[-1]
        home = (all(abs(first["bloch"][c] - last["bloch"][c]) < 1e-9 for c in "xyz")
                and all(abs(first["probabilities"][b] - last["probabilities"][b]) < 1e-9
                        for b in last["probabilities"])
                and all(abs(f["re"] - l["re"]) < 1e-9 and abs(f["im"] - l["im"]) < 1e-9
                        for f, l in zip(first["statevector"], last["statevector"])))
        moved = any(_bloch_moved(steps, k) for k in range(1, len(steps)))
        if home and (moved or _has_inverse_structure(names)):
            return "reversibility"

    if len(names) == 1 and names[0] == "RY":
        return "measurement"

    return "state_evolution"


# ---------------------------------------------------------------- main
def explain(case, result):
    gates = case["gates"]
    names = _names(gates)
    steps = result["steps"]
    final = result["final"]
    b = final["bloch"]
    p0 = final["probabilities"].get("0", 0.0)
    p1 = final["probabilities"].get("1", 0.0)
    pole = _pole_name(b)
    rel = _relative_phase_deg(final["statevector"])
    concept = case["concept"]

    watch, uses, try_next = [], [], []

    # ---------------- empty
    if not gates:
        return {
            "concept": "state_evolution",
            "concept_label": "State evolution",
            "concept_intro": CONCEPT_INTRO["state_evolution"],
            "summary": "The starting point. Every circuit begins here.",
            "what_happens": "No gate has been applied. The qubit sits in |0⟩ at the north pole of the "
                            "Bloch sphere, and a measurement would return 0 every single time.",
            "watch": ["The Bloch vector points straight up at (0, 0, 1).",
                      "P(0) is 1 and P(1) is 0 — there is nothing random about this state yet.",
                      "This is what the sphere shows on page load, before anything is dragged in."],
            "uses": ["Every quantum computer initialises its qubits to |0⟩ before a circuit runs. "
                     "Preparing this state reliably is one of the DiVincenzo criteria for building quantum hardware."],
            "try_next": ["Drop an H here to create superposition."],
        }

    # ---------------- what happened, step by step
    silent_steps = [k for k in range(1, len(steps))
                    if _bloch_moved(steps, k) and not _probs_moved(steps, k)]
    frozen_steps = [k for k in range(1, len(steps))
                    if not _bloch_moved(steps, k)]

    # ---------------- classify
    single = len(names) == 1
    g0 = names[0] if names else None
    ang = (gates[0].get("params") or [None])[0] if gates else None

    # --- interference sandwich H ... H
    if len(names) >= 3 and names[0] == "H" and names[-1] == "H":
        mid = names[1:-1]
        summary = f"Phase inserted between two H gates becomes a measurable probability."
        what = ("The first H creates an equal superposition. The middle gate adds a relative phase, "
                "which changes nothing you can measure. The second H folds that phase back into "
                "amplitude, and only then does it appear in the probabilities.")
        watch.append(f"After the first H the bars sit at 50 / 50. They stay there through the middle "
                     f"gate — that gate looks like it does nothing.")
        watch.append(f"After the final H the bars read {p0:.4f} / {p1:.4f}. That change came entirely "
                     f"from the phase you could not see.")
        if abs(p1) < 1e-9:
            watch.append("Fully constructive: every path reinforces on |0⟩.")
        elif abs(p1 - 1) < 1e-9:
            watch.append("Fully destructive on |0⟩: the two paths cancel exactly, and the qubit lands on |1⟩.")
        uses = USES["interference"]
        try_next = ["Change the middle gate to T, S, then S·S and watch the bars sweep from 100/0 to 0/100.",
                    "Replace it with RZ(θ) and sweep θ — P(1) traces sin²(θ/2)."]
        concept = "interference"

    # --- reversibility pair
    elif concept == "reversibility":
        summary = "The circuit runs and then undoes itself, landing exactly back on the start."
        what = ("Every quantum gate is unitary, which means it has an exact inverse. Applying a gate "
                "and then its inverse returns the state precisely to where it began — not approximately, exactly.")
        watch.append("The final state is identical to step 0, digit for digit.")
        watch.append("Step through it: the Bloch vector travels away and comes back along the same path.")
        watch.append("Nothing was lost. Quantum evolution destroys no information — only measurement does.")
        uses = USES["reversibility"]
        try_next = ["Try S then SDG, T then TDG, and H then H — all three come home.",
                    "Add a measurement in the middle and watch reversibility break."]

    # --- phase gate alone on a pole
    elif single and g0 in PHASE_GATES and pole in ("|0⟩", "|1⟩"):
        label = f"{g0}({_fmt_angle(ang)})" if ang is not None else g0
        summary = f"{label} cannot move a state that sits on its own rotation axis."
        what = (f"{g0} rotates the Bloch vector around the z-axis. The qubit is at {pole}, which lies "
                f"on that axis, so the rotation has nothing to turn. The amplitudes may pick up a "
                f"global phase, but global phase is physically undetectable — no measurement can reveal it.")
        watch.append("The Bloch vector does not move at all.")
        watch.append("The probabilities do not change.")
        watch.append("This is correct physics, not a broken gate. Put an H in front and the same gate "
                     "suddenly has a visible effect.")
        uses = USES["phase_global"]
        try_next = [f"Build H then {g0} — now the rotation is visible on the equator.",
                    f"Build H, {g0}, H — now it changes the probabilities too."]
        concept = "phase"

    # --- H then a phase gate: relative phase
    elif len(names) == 2 and names[0] == "H" and names[1] in PHASE_GATES and rel is not None:
        p2 = (gates[1].get("params") or [None])[0]
        label = f"{names[1]}({_fmt_angle(p2)})" if p2 is not None else names[1]
        summary = f"A relative phase of {rel:+.0f}° — visible on the sphere, invisible in the bars."
        what = ("H puts the qubit on the equator. The phase gate then rotates it around the equator. "
                "The two amplitudes keep the same magnitude, so the probabilities are untouched, but "
                "the angle between them changes — and that angle is real, physical information.")
        watch.append(f"P(0) and P(1) are both {p0:.4f} — exactly as they were before the phase gate.")
        watch.append(f"The Bloch vector has swung {rel:+.0f}° around the equator" +
                     (f" to {pole}." if pole else "."))
        watch.append("The phase dial on the |1⟩ amplitude is the only numeric readout that moved.")
        uses = USES["phase_relative"]
        try_next = ["Build the same circuit with T, S and Z and compare — the bars never move.",
                    "Add a final H to convert this invisible phase into a visible probability."]
        concept = "phase"

    # --- single H or equivalent: superposition
    elif pole in ("|+⟩", "|−⟩", "|+i⟩", "|−i⟩") and abs(p0 - 0.5) < 1e-9:
        summary = f"Equal superposition — the qubit lands on {pole}."
        what = ("The qubit is now genuinely both 0 and 1 at once. This is not uncertainty about a "
                "hidden value: the state is fully known, and the 50/50 split is a property of the "
                "state itself, not of our ignorance.")
        watch.append("The Bloch vector has moved from the pole to the equator.")
        watch.append("P(0) = P(1) = 0.5 — a measurement is a genuine coin flip.")
        watch.append("bloch.length is still exactly 1. The state is pure, not mixed or uncertain.")
        uses = USES["H"] if "H" in names else USES["superposition_partial"]
        try_next = ["Add a second H — the superposition collapses back to |0⟩, which is interference.",
                    "Add S or T and watch the phase move while the bars stay still."]
        concept = "superposition"

    # --- RY partial
    elif single and g0 == "RY" and concept == "measurement":
        summary = f"A measurement with outcome odds {p0*100:.2f}% / {p1*100:.2f}%."
        what = (f"RY tilts the Bloch vector {_fmt_angle(ang)} about the y-axis, and the probability of "
                f"each outcome follows directly from the squared amplitudes — the Born rule. "
                f"P(1) = sin²(θ/2) exactly.")
        watch.append(f"P(1) = {p1:.4f}, which is sin²({_fmt_angle(ang)}/2) to the last digit.")
        watch.append("These probabilities are analytic, computed from the statevector — not sampled. "
                     "A real machine would need many shots to estimate them this precisely.")
        watch.append("Measurement is the only step that is not reversible. Everything before it can be undone.")
        uses = USES["measurement"]
        try_next = ["Sweep θ and watch the odds move continuously.",
                    "Compare with H, which can only ever give 50/50."]

    elif single and g0 == "RY":
        summary = f"A weighted superposition — {p0*100:.2f}% / {p1*100:.2f}%."
        what = (f"RY tilts the Bloch vector by {_fmt_angle(ang)} about the y-axis. The further it "
                f"tilts toward the south pole, the more likely a measurement returns 1. The "
                f"relationship is exact: P(1) = sin²(θ/2).")
        watch.append(f"P(1) = {p1:.4f}, which is sin²({_fmt_angle(ang)}/2) to the last digit.")
        watch.append("All amplitudes are real — RY introduces no phase, so the vector stays in the x–z plane.")
        watch.append("This is the only gate family that moves the bars smoothly. Clifford gates can "
                     "only ever give 0, 0.5 or 1.")
        uses = USES["superposition_partial"]
        try_next = ["Sweep the angle from 0 to π and watch the bars travel continuously.",
                    "Compare RY(π/2) against H — same probabilities, different phase."]
        concept = "superposition"

    # --- single rotation
    elif single and g0 in ROT:
        axis = {"RX": "x", "RY": "y", "RZ": "z", "P": "z"}[g0]
        summary = f"A rotation of {_fmt_angle(ang)} about the {axis}-axis."
        what = (f"Every single-qubit gate is a rotation of the Bloch vector. This one turns the state "
                f"{_fmt_angle(ang)} around the {axis}-axis. The rotation field in the API carries this "
                f"axis and angle so the animation can follow the true arc rather than cutting through "
                f"the inside of the sphere.")
        watch.append(f"The rotation axis is {axis} and the angle is {_fmt_angle(ang)}.")
        watch.append(f"Final probabilities {p0:.4f} / {p1:.4f}.")
        if not _bloch_moved(steps, 1):
            watch.append("The vector did not move — it was already sitting on this rotation axis.")
        uses = USES["evolution"]
        try_next = ["Try the same angle about a different axis and compare.",
                    "Chain two rotations about different axes to reach an arbitrary point."]
        concept = "state_evolution"

    # --- Pauli / bit flip
    elif single and g0 in ("X", "Y"):
        summary = f"{g0} flips the qubit from |0⟩ to |1⟩."
        what = (f"{g0} is a half turn of the Bloch sphere about the {'x' if g0=='X' else 'y'}-axis. "
                f"On |0⟩ it acts like a classical NOT gate. " +
                ("Y also introduces a factor of i, which is a global phase here and therefore "
                 "undetectable — X and Y give identical spheres and identical measurements from |0⟩."
                 if g0 == "Y" else
                 "Compare it with Y: the amplitudes differ, everything measurable does not."))
        watch.append("The Bloch vector has flipped to the south pole.")
        watch.append("P(1) = 1 — the outcome is certain.")
        if g0 == "Y":
            watch.append("The |1⟩ amplitude is i, not 1. The phase dial shows +90°, and no measurement can see it.")
        uses = USES["phase_global"]
        try_next = ["Compare X against Y and against RX(π) — three circuits, one physical state.",
                    "Apply it twice to see that X·X returns to |0⟩."]
        concept = "state_evolution"

    # --- identity only
    elif set(names) == {"I"}:
        summary = "The identity gate does nothing, deliberately."
        what = ("I is a placeholder that leaves the state untouched. It exists so a circuit can "
                "represent a qubit deliberately idling while other qubits are busy.")
        watch.append("Nothing moves. The final state equals step 0.")
        watch.append("Its rotation angle is 0, so the axis is arbitrary.")
        uses = USES["identity"]
        try_next = ["Swap it for an H to make something happen."]
        concept = "state_evolution"

    # --- general multi-gate
    else:
        summary = f"A {len(names)}-gate circuit ending at {pole or 'a point off the poles'}."
        what = ("Each gate rotates the Bloch vector in turn. Step through the circuit one gate at a "
                "time to see how the state arrives at its final position — the end result alone hides "
                "the path taken to get there.")
        watch.append(f"Final probabilities {p0:.4f} / {p1:.4f}.")
        if silent_steps:
            watch.append(f"Step {silent_steps[0]} moves the sphere but leaves the bars completely "
                         f"unchanged — that gate is doing phase work.")
        if frozen_steps:
            watch.append(f"Step {frozen_steps[0]} does not move the sphere at all; the state was "
                         f"already on that gate's rotation axis.")
        watch.append("Probabilities sum to exactly 1 at every step. That is unitarity, and it never breaks.")
        uses = USES["evolution"]
        try_next = ["Scrub back and forth through the steps and watch the vector trace its path."]

    # ---------- extras that apply on top
    if "T" in names or "TDG" in names:
        uses = uses + USES["T"][:1]
    if names and set(names) <= {"H", "S", "SDG", "X", "Y", "Z", "I"} and len(names) > 1:
        uses = uses + USES["clifford"][:1]
        watch.append("Every gate here is a Clifford gate, so the probabilities can only be 0, 0.5 or 1.")

    return {
        "concept": concept,
        "concept_label": CONCEPT_LABEL[concept],
        "concept_intro": CONCEPT_INTRO[concept],
        "summary": summary,
        "what_happens": what,
        "watch": watch[:4],
        "uses": uses[:3],
        "try_next": try_next[:3],
    }
