"""Teaching content for two-qubit circuits.

Mirrors explain.py (Phase 1) but reads the 2-qubit snapshot shape:
bloch is a LIST, and an entanglement block is present.
"""
from __future__ import annotations
import math

CONCEPT_LABEL={"superposition":"Superposition","phase":"Phase","interference":"Interference",
 "measurement":"Measurement","entanglement":"Entanglement","separability":"Separability",
 "state_evolution":"State evolution","reversibility":"Reversibility"}
CONCEPT_INTRO={
 "superposition":"With two wires a superposition spreads over 2^n outcomes, and each qubit can hold its own independently.",
 "phase":"Global phase stays invisible. Relative phase now has a two-qubit form: CZ flips the sign of one basis state and nothing else.",
 "interference":"A phase you cannot measure becomes a probability you can, once a second layer of H gates folds it back into amplitude.",
 "measurement":"Four outcomes instead of two. Bit order is q1q0 — the left character is the higher qubit index.",
 "entanglement":"The pair has a state but neither qubit does. Both Bloch vectors shrink toward the origin.",
 "separability":"Not every two-qubit gate entangles. These circuits use CX, CZ or SWAP and stay completely separable.",
 "state_evolution":"Step through one gate at a time. Entangling gates return a null rotation because they are not Bloch rotations.",
 "reversibility":"CX, CZ and SWAP are each their own inverse. Applying one twice returns the state exactly."}

USES={
 "entanglement":["Entanglement is the resource behind quantum teleportation, superdense coding and device-independent cryptography.",
   "Bell pairs are the standard test of whether real hardware is working: measured correlations that beat the classical limit prove the qubits are genuinely quantum."],
 "separability":["Circuit compilers rely on knowing which gates entangle. A separable circuit can be simulated one qubit at a time, which is exponentially cheaper.",
   "SWAP is used constantly in real hardware to move a qubit next to the one it needs to interact with, without disturbing the computation."],
 "superposition":["Every algorithm starts by putting the whole register into superposition, so that one pass explores all 2^n inputs at once.",
   "Weighted superpositions built from RY rotations are how classical data is loaded into a quantum state."],
 "phase":["CZ marking a single basis state by sign is exactly how a search oracle flags the answer without changing any probability.",
   "Controlled phase rotations are the main ingredient of the Quantum Fourier Transform."],
 "interference":["Interference is the source of quantum speedup: circuits are arranged so wrong answers cancel and the right one reinforces.",
   "The H-phase-H pattern here is the two-qubit version of an interferometer."],
 "measurement":["Measurement statistics are all a real machine ever returns; every result is a histogram like this one.",
   "Correlated outcomes are the signature that distinguishes an entangled pair from two independent random bits."],
 "state_evolution":["Two-qubit gates are the expensive operations on real hardware, so counting them is how circuit cost is measured.",
   "Stepping through the state is how developers debug a circuit that produces the wrong distribution."],
 "reversibility":["Uncomputation lets an algorithm free its scratch qubits without collapsing the superposition it is carrying.",
   "Compilers cancel adjacent inverse pairs to shorten circuits before they run."]}

def _f(x): return f"{x:.4f}"

def explain2(case, result):
    g=case["gates"]; names=[x["gate"].upper() for x in g]
    steps=result["steps"]; fin=result["final"]
    b=fin["bloch"]; p=fin["probabilities"]
    c=fin["entanglement"]["concurrence"] or 0.0
    concept=case["concept"]
    L0,L1=b[0]["length"],b[1]["length"]
    live={k:v for k,v in p.items() if v>1e-9}
    watch=[]; nxt=[]

    if not g:
        return {"concept":"measurement","concept_label":"Measurement",
          "concept_intro":CONCEPT_INTRO["measurement"],
          "summary":"Both qubits start at |00>.",
          "what_happens":"No gate has been applied. Both qubits sit at the north pole and a measurement returns 00 every time.",
          "watch":["Both Bloch lengths are 1.0000 — two independent pure states.",
                   "P(00) is 1 and every other outcome is 0."],
          "uses":USES["measurement"],"try_next":["Drop an H on q0 to create a superposition."]}

    ent_step=next((k for k in range(1,len(steps))
        if (steps[k]["entanglement"]["concurrence"] or 0)>(steps[k-1]["entanglement"]["concurrence"] or 0)+1e-9),None)
    un_step=next((k for k in range(1,len(steps))
        if (steps[k]["entanglement"]["concurrence"] or 0)<(steps[k-1]["entanglement"]["concurrence"] or 0)-1e-9),None)

    if concept=="entanglement":
        if c>0.999:
            summary=f"Maximally entangled — both Bloch lengths fall to {_f(L0)}."
            what=("The pair now has a single joint state and neither qubit has one of its own. "
                  "Both Bloch vectors sit at the origin, yet the joint panels are perfectly well defined — "
                  "the information moved out of the individual qubits and into the correlation between them.")
            watch.append(f"Only {' and '.join(sorted(live))} ever appear; the other outcomes are exactly 0.")
            watch.append("Both Bloch lengths read 0.0000 while purity drops to 0.5000.")
        else:
            summary=f"Partially entangled — concurrence {_f(c)}, Bloch length {_f(L0)}."
            what=("Entanglement is a dial, not a switch. The Bloch vector has retracted part of the way "
                  "into the ball: the further in it sits, the less of its own identity the qubit retains.")
            watch.append(f"Bloch length {_f(L0)} sits between 1 (independent) and 0 (maximally entangled).")
            watch.append(f"Concurrence {_f(c)} rises as the length falls — they are two views of the same thing.")
        if ent_step: watch.append(f"Step {ent_step} is where the entanglement appears.")
        nxt=["Compare with H q0 · SWAP, which uses a two-qubit gate but never entangles.",
             "Sweep the RY angle to move continuously between separable and maximal."]

    elif concept=="separability":
        summary="A two-qubit gate that leaves the pair completely separable."
        what=("Concurrence stays at 0. Both qubits keep their own full description, so two Bloch spheres "
              "still tell the whole story. Being a two-qubit gate is not the same as being an entangling gate.")
        watch.append(f"Both Bloch lengths stay at {_f(L0)} and {_f(L1)} — nothing was lost.")
        watch.append("Concurrence is exactly 0.0000 at every step.")
        if un_step: watch.append(f"Step {un_step} destroys the entanglement built earlier.")
        nxt=["Compare with H q0 · CX, which entangles from a very similar starting point."]

    elif concept=="phase":
        moved=any(abs(steps[-1]["probabilities"][k]-steps[0]["probabilities"][k])>1e-9 for k in p)
        summary="A phase change that the probability panel cannot show."
        what=("Phase gates rotate amplitudes without changing their magnitudes. CZ is the two-qubit form: "
              "it flips the sign of the |11> amplitude and leaves every probability untouched.")
        watch.append("The probability bars are unchanged by the phase gate — only the amplitude signs move.")
        watch.append("The state vector panel is the only place this is visible.")
        nxt=["Add a second layer of H gates to turn this invisible phase into a visible probability."]

    elif concept=="interference":
        summary=f"Phase converted into probability: {', '.join(f'{k} {_f(v)}' for k,v in sorted(live.items()))}."
        what=("The first layer of H gates spreads the state, the middle gate adds a phase nothing can measure, "
              "and the final layer folds that phase back into amplitude — where it finally shows up in the bars.")
        watch.append("The middle gate leaves the probabilities completely unchanged.")
        watch.append("Only after the final H layer do the bars move.")
        nxt=["Remove the middle gate and compare — everything returns to |00>."]

    elif concept=="superposition":
        summary=f"{len(live)} outcomes, each at {_f(list(live.values())[0])}." if len(set(round(v,6) for v in live.values()))==1 else f"{len(live)} possible outcomes."
        what=("Each wire can carry its own superposition. With both qubits in superposition the state spreads "
              "over all four basis states at once, which is why the outcome count doubles with every qubit added.")
        watch.append(f"Both Bloch lengths stay at 1.0000 — a superposition is not entanglement.")
        watch.append("Concurrence is 0.0000 throughout.")
        nxt=["Add a CX to turn this superposition into entanglement."]

    elif concept=="measurement":
        summary=f"Outcomes: {', '.join(f'{k} at {_f(v)}' for k,v in sorted(live.items()))}."
        what=("Probabilities come from squared amplitudes. Labels read q1q0, so the left character is the "
              "higher qubit index — an X on q0 alone produces the outcome 01, not 10.")
        watch.append(f"{len(live)} of the 4 outcomes have non-zero probability.")
        if c>0.999: watch.append("The outcomes are correlated: measuring one qubit fixes the other immediately.")
        nxt=["Compare an entangled pair with two independent superpositions — same 50/50 per qubit, different correlations."]

    elif concept=="reversibility":
        back=all(abs(fin["statevector"][i]["re"]-steps[0]["statevector"][i]["re"])<1e-9 and
                 abs(fin["statevector"][i]["im"]-steps[0]["statevector"][i]["im"])<1e-9 for i in range(4))
        summary="The circuit undoes itself exactly." if back else "An inverse pair cancels inside the circuit."
        what=("Every quantum gate is unitary and therefore has an exact inverse. CX, CZ and SWAP are each "
              "their own inverse, so applying one twice is the same as doing nothing at all.")
        watch.append("The final state matches an earlier step digit for digit — nothing was lost.")
        if un_step: watch.append(f"Step {un_step} removes the entanglement that an earlier step created.")
        nxt=["Try H q0 · CX · CX · H q0 — a Bell state built and then completely undone."]

    else:  # state_evolution
        summary=f"A {len(g)}-gate circuit ending with concurrence {_f(c)}."
        what=("Step through one gate at a time. Single-qubit gates carry a rotation axis and angle; "
              "entangling gates return a null rotation, because they are not a rotation of any single Bloch sphere.")
        watch.append("Probabilities sum to exactly 1 at every step.")
        if ent_step: watch.append(f"Step {ent_step} is the entangling step — its rotation field is null.")
        nxt=["Scrub back and forth through the steps and watch the two Bloch lengths move together."]

    watch.append(f"Final Bloch lengths: q0 {_f(L0)}, q1 {_f(L1)}.")
    return {"concept":concept,"concept_label":CONCEPT_LABEL[concept],
            "concept_intro":CONCEPT_INTRO[concept],"summary":summary,
            "what_happens":what,"watch":watch[:4],
            "uses":USES.get(concept,USES["state_evolution"])[:3],"try_next":nxt[:3]}


# ------------------------------------------------------------------ framing
# The six shared concepts already have an analogy and real-world hooks in
# explain.CONCEPT_EXTRAS. Entanglement and separability are new at two qubits,
# so their framing lives here. Same keys, so the panel renders them identically.

CONCEPT_EXTRAS_2Q = {
    "entanglement": {
        "icon": "🔗",
        "headline": "The pair has a state. Neither qubit does.",
        "analogy": "Two coins sealed in one box, guaranteed to land the same way up. Not 'both were "
                   "secretly heads all along' — until the box is opened neither coin has a face, and "
                   "yet they are certain to agree. The Bloch vector collapsing to the centre is a "
                   "qubit that has genuinely stopped having a state of its own.",
        "real_world": [
            "Quantum key distribution, in commercial use today, sends entangled photon pairs down "
            "fibre — an eavesdropper necessarily breaks the correlation and is detected by it.",
            "Bell tests measured correlations no classical model can reproduce, and won the 2022 "
            "Nobel Prize in Physics for proving the effect is real rather than a bookkeeping artefact.",
        ],
    },
    "separability": {
        "icon": "🧩",
        "headline": "A two-qubit gate is not automatically an entangling gate.",
        "analogy": "Two dancers can share a stage, mirror each other, even swap places, and still be "
                   "two dancers. Entanglement is the moment you can no longer describe either one "
                   "without describing the other.",
        "real_world": [
            "Circuit compilers check separability constantly: a circuit that never entangles can be "
            "simulated one qubit at a time, which is exponentially cheaper than the general case.",
            "SWAP networks shuttle qubits across real hardware to bring distant pairs together, "
            "without disturbing the computation in flight.",
        ],
    },
}


def concept_extras2(name):
    """Framing for the two concepts that only exist at two qubits. Empty
    otherwise, so the caller can merge this over explain.concept_extras."""
    return CONCEPT_EXTRAS_2Q.get(name, {})


# ------------------------------------------------------------------ hand-built
# The catalogue's 77 circuits carry a concept from the golden spec. A circuit the
# user drags together on the two-qubit page does not, so explain2() needs one
# supplied — and the palette needs a reference card for the three new gates.

TWOQ = {"CX", "CZ", "SWAP"}
PHASE_GATES = {"Z", "S", "SDG", "T", "TDG", "P", "RZ", "CZ"}

# Basis order is q1q0 throughout: |00>, |01>, |10>, |11>, with q0 the RIGHT
# character. The CX matrix below is written for control q0 -> target q1; swap
# the wires and the permutation changes, which is exactly why the circuit
# diagram, not the matrix, is the honest picture of a two-qubit gate.
GATE_INFO_2Q = {
    "CX": {
        "label": "Controlled-NOT", "concept": "entanglement",
        "summary": "Flips the target, but only when the control is |1⟩.",
        "detail": "CX is the gate that makes two qubits into one system. On a control already in "
                  "superposition it cannot 'decide' whether to fire, so it does both at once — and the "
                  "result is a state that belongs to the pair rather than to either qubit. This is the "
                  "smallest circuit that no amount of single-qubit gates can reproduce.",
        "matrix": [["1", "0", "0", "0"], ["0", "0", "0", "1"],
                   ["0", "0", "1", "0"], ["0", "1", "0", "0"]],
        "rotation": "none — not a rotation of either Bloch sphere",
        "inverse": "CX (its own inverse)",
        "facts": ["H on the control followed by CX is the standard Bell-pair recipe.",
                  "Both Bloch vectors shrink as it fires — that shrinking is the entanglement.",
                  "Its rotation field is null, because no single axis describes what it does."],
    },
    "CZ": {
        "label": "Controlled-Z", "concept": "phase",
        "summary": "Flips the sign of |11⟩ and nothing else.",
        "detail": "CZ leaves every probability exactly where it was and changes one amplitude's sign. "
                  "Nothing in the probability panel moves; the state vector panel is the only place it "
                  "is visible. That invisibility is the point — a search oracle marks the right answer "
                  "this way, and a later layer of H gates turns the mark into a measurable outcome.",
        "matrix": [["1", "0", "0", "0"], ["0", "1", "0", "0"],
                   ["0", "0", "1", "0"], ["0", "0", "0", "−1"]],
        "rotation": "none — not a rotation of either Bloch sphere",
        "inverse": "CZ (its own inverse)",
        "facts": ["Symmetric: it does not matter which wire you call the control.",
                  "H · CZ · H on the target is the same circuit as CX.",
                  "On |00⟩ it does nothing at all — there is no |11⟩ amplitude to mark."],
    },
    "SWAP": {
        "label": "SWAP", "concept": "separability",
        "summary": "Exchanges the two qubits' states.",
        "detail": "SWAP moves whatever q0 was carrying onto q1 and vice versa. It is a two-qubit gate "
                  "that never entangles: each qubit keeps its full description, it just changes wire. "
                  "Real hardware uses it constantly, to walk a qubit across the chip until it sits next "
                  "to the one it needs to interact with.",
        "matrix": [["1", "0", "0", "0"], ["0", "0", "1", "0"],
                   ["0", "1", "0", "0"], ["0", "0", "0", "1"]],
        "rotation": "none — not a rotation of either Bloch sphere",
        "inverse": "SWAP (its own inverse)",
        "facts": ["The counterexample to 'two-qubit gate means entangling gate'.",
                  "Three CX gates in alternating directions build one SWAP.",
                  "Both Bloch lengths stay at 1 — nothing is ever lost."],
    },
}


def gate_info2(name):
    """Reference card for a two-qubit gate, or None. Single-qubit gates are still
    explain.gate_info's job — the caller falls through to it."""
    info = GATE_INFO_2Q.get(str(name).upper())
    if info is None:
        return None
    out = dict(info)
    out["gate"] = str(name).upper()
    out["concept_label"] = CONCEPT_LABEL[info["concept"]]
    return out


def _returns_home(steps):
    """Does the circuit end on the exact state it started from?"""
    a, b = steps[0]["statevector"], steps[-1]["statevector"]
    return all(abs(x["re"] - y["re"]) < 1e-9 and abs(x["im"] - y["im"]) < 1e-9
               for x, y in zip(a, b))


def infer_concept2(gates, result):
    """Pick the concept a hand-built two-qubit circuit demonstrates.

    Ordered by how specific the claim is. Entanglement first because it is the
    one thing single-qubit circuits provably cannot do; separability second
    because 'used a two-qubit gate and stayed separable' is only interesting
    once entanglement has been ruled out.
    """
    if not gates:
        return "measurement"

    names = [str(g["gate"]).upper() for g in gates]
    steps, fin = result["steps"], result["final"]
    conc = fin["entanglement"]["concurrence"] or 0.0

    if conc > 1e-6:
        return "entanglement"
    if len(names) >= 2 and _returns_home(steps):
        return "reversibility"
    if any(n in TWOQ for n in names):
        return "separability"
    # A phase sandwiched between two layers of H: invisible phase made visible.
    if names.count("H") >= 2 and any(n in PHASE_GATES for n in names):
        return "interference"
    if all(n in PHASE_GATES or n == "I" for n in names):
        return "phase"
    if sum(1 for v in fin["probabilities"].values() if v > 1e-9) > 1:
        return "superposition"
    return "state_evolution"
