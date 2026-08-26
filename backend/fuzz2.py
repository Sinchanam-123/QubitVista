"""Fuzz the 2-qubit engine. Proves the invariants hold for ARBITRARY circuits,
which is what actually protects a prototype from user-built inputs.

    python fuzz2.py 30000                            # reference engine (engine2)
    python fuzz2.py 30000 --engine quantum_engine    # the engine that ships

The golden spec pins 77 known circuits; this covers the ones nobody wrote down,
so point it at the production engine too — the same invariants have to hold
there, and that is the code a user's circuit actually runs on."""
import importlib, math, random, sys
import numpy as np
from engine2 import simulate as _reference, FIXED, ROTS, TWOQ

# Swapped by --engine. The gate-name sets stay engine2's: both engines support
# the same 16 gates, and fuzzing is about the values, not the tables.
simulate = _reference

FIXED_L=sorted(FIXED); ROT_L=sorted(ROTS); TWO_L=sorted(TWOQ)
ANGLES=[0.0,1e-9,-1e-9,math.pi,-math.pi,2*math.pi,-2*math.pi,math.pi/7,
        1e-6,1e6,-1e6,123.456,-0.0,math.pi*1e3,0.5,-3.7]

def rand_gate(rng, allow_two=True):
    r=rng.random()
    if allow_two and r<0.30:
        g=rng.choice(TWO_L); c=rng.randint(0,1); t=1-c
        return {"gate":g,"control":c,"target":t}
    if r<0.60:
        g=rng.choice(ROT_L)
        a=rng.choice(ANGLES) if rng.random()<0.4 else rng.uniform(-4*math.pi,4*math.pi)
        return {"gate":g,"target":rng.randint(0,1),"params":[a]}
    return {"gate":rng.choice(FIXED_L),"target":rng.randint(0,1)}

def check(cid, gates, res, fails):
    n=res["num_qubits"]; steps=res["steps"]
    if len(steps)!=len(gates)+1:
        fails.append((cid,"step count",f"{len(steps)} vs {len(gates)+1}")); return
    for k,st in enumerate(steps):
        # ---- no NaN / Inf anywhere
        nums=[a[f] for a in st["statevector"] for f in ("re","im","magnitude","phase")]
        nums+=list(st["probabilities"].values())
        nums+=[b[f] for b in st["bloch"] for f in ("x","y","z","length","purity")]
        c=st["entanglement"]["concurrence"]
        if c is not None: nums.append(c)
        for v in nums:
            if v!=v or abs(v)==float("inf"):
                fails.append((cid,f"step{k} NaN/Inf",v)); return
        # ---- normalisation
        tot=sum(st["probabilities"].values())
        if abs(tot-1)>2e-5: fails.append((cid,f"step{k} norm",tot))
        if len(st["probabilities"])!=2**n: fails.append((cid,f"step{k} basis count",len(st["probabilities"])))
        for kk,p in st["probabilities"].items():
            if p<-1e-9 or p>1+1e-9: fails.append((cid,f"step{k} P({kk}) range",p))
        # ---- |amp|^2 == P
        for i,(a,kk) in enumerate(zip(st["statevector"],sorted(st["probabilities"]))):
            if abs(a["magnitude"]**2-st["probabilities"][kk])>2e-5:
                fails.append((cid,f"step{k} |a|^2 != P",kk))
            if abs(math.hypot(a["re"],a["im"])-a["magnitude"])>2e-5:
                fails.append((cid,f"step{k} magnitude",i))
            if a["magnitude"]<=1e-9 and a["phase"]!=0.0:
                fails.append((cid,f"step{k} zero-amp phase",a["phase"]))
            if not (-math.pi-1e-6 <= a["phase"] <= math.pi+1e-6):
                fails.append((cid,f"step{k} phase range",a["phase"]))
        # ---- bloch
        for q,b in enumerate(st["bloch"]):
            L=math.sqrt(b["x"]**2+b["y"]**2+b["z"]**2)
            if abs(L-b["length"])>2e-5: fails.append((cid,f"step{k} q{q} length",L,b["length"]))
            if b["length"]>1+2e-5: fails.append((cid,f"step{k} q{q} length>1",b["length"]))
            if b["length"]<-1e-9: fails.append((cid,f"step{k} q{q} length<0",b["length"]))
            # purity = (1 + |r|^2)/2  for a single qubit
            want=(1+b["length"]**2)/2
            if abs(b["purity"]-want)>2e-4: fails.append((cid,f"step{k} q{q} purity",b["purity"],want))
            if b["purity"]<0.5-1e-4 or b["purity"]>1+1e-4: fails.append((cid,f"step{k} q{q} purity range",b["purity"]))
        # ---- concurrence
        if c is not None and (c<-1e-9 or c>1+2e-5):
            fails.append((cid,f"step{k} concurrence range",c))
        # ---- rotation contract
        if k==0:
            if st["rotation"] is not None or st["gate"] is not None:
                fails.append((cid,"step0 must be null",st["gate"]))
        else:
            g=gates[k-1]["gate"].upper()
            if g in TWOQ:
                if st["rotation"] is not None: fails.append((cid,f"step{k} rotation must be null for {g}",st["rotation"]))
            else:
                r=st["rotation"]
                if r is None: fails.append((cid,f"step{k} rotation missing for {g}"))
                else:
                    nn=math.sqrt(sum(v*v for v in r["axis"]))
                    if abs(r["angle"])>1e-12 and abs(nn-1)>1e-4:
                        fails.append((cid,f"step{k} axis not unit",nn))
    if res["final"]!=steps[-1]: fails.append((cid,"final != steps[-1]",""))

def run(trials=20000, maxlen=14, seed=1):
    rng=random.Random(seed); fails=[]; crashes=0
    for i in range(trials):
        L=rng.randint(0,maxlen)
        gates=[rand_gate(rng) for _ in range(L)]
        try:
            res=simulate(gates,2)
        except Exception as e:
            crashes+=1; fails.append((f"F{i}","CRASH",repr(e)[:110],gates)); continue
        check(f"F{i}",gates,res,fails)
    return fails,crashes

if __name__=="__main__":
    import warnings; warnings.filterwarnings("ignore")
    argv=sys.argv[1:]; target="engine2 (reference)"
    if "--engine" in argv:
        i=argv.index("--engine"); target=argv[i+1]
        simulate=getattr(importlib.import_module(target),"simulate")
        argv=argv[:i]+argv[i+2:]
    n=int(argv[0]) if argv else 20000
    f,c=run(n)
    print(f"engine                 : {target}")
    print(f"random circuits fuzzed : {n}")
    print(f"crashes                : {c}")
    print(f"invariant violations   : {len(f)}")
    for x in f[:12]: print("   x",x[:3])

# ---------------------------------------------------------------- edge cases
EDGE=[
 ("empty circuit",[]),
 ("single I",[{"gate":"I","target":0}]),
 ("100 H on q0",[{"gate":"H","target":0}]*100),
 ("100 CX",[{"gate":"CX","control":0,"target":1}]*100),
 ("CX both directions",[{"gate":"CX","control":0,"target":1},{"gate":"CX","control":1,"target":0}]),
 ("angle 0",[{"gate":"RX","target":0,"params":[0.0]}]),
 ("angle 2pi",[{"gate":"RY","target":0,"params":[2*math.pi]}]),
 ("angle -2pi",[{"gate":"RZ","target":1,"params":[-2*math.pi]}]),
 ("angle 1e-9",[{"gate":"RY","target":0,"params":[1e-9]}]),
 ("angle 1e6",[{"gate":"RZ","target":0,"params":[1e6]}]),
 ("angle -1e6",[{"gate":"RX","target":1,"params":[-1e6]}]),
 ("P(0)",[{"gate":"P","target":0,"params":[0.0]}]),
 ("SWAP twice",[{"gate":"SWAP","control":0,"target":1}]*2),
 ("CZ on |00>",[{"gate":"CZ","control":0,"target":1}]),
 ("deep 200 mixed",[{"gate":"H","target":0},{"gate":"CX","control":0,"target":1},
                    {"gate":"T","target":1},{"gate":"CZ","control":1,"target":0}]*50),
 ("all gates once",[{"gate":g,"target":0} for g in sorted(FIXED)]+
                   [{"gate":g,"target":1,"params":[0.7]} for g in sorted(ROTS)]+
                   [{"gate":g,"control":0,"target":1} for g in sorted(TWOQ)]),
]
BAD=[
 ("unknown gate",[{"gate":"ZORP","target":0}]),
 ("CX same wire",[{"gate":"CX","control":0,"target":0}]),
 ("CX no control",[{"gate":"CX","target":1}]),
 ("RX no angle",[{"gate":"RX","target":0}]),
 ("lowercase gate",[{"gate":"h","target":0}]),
]

def edges():
    f=[]
    print("\n--- edge cases (must all succeed) ---")
    for name,g in EDGE:
        try:
            r=simulate(g,2); check(name,g,r,f)
            print(f"  ok    {name:22s} steps={len(r['steps']):4d}")
        except Exception as e:
            f.append((name,"CRASH",repr(e))); print(f"  CRASH {name:22s} {e}")
    print("\n--- malformed input (must RAISE, not silently pass) ---")
    for name,g in BAD:
        try:
            simulate(g,2); print(f"  LEAK  {name:22s} accepted silently"); f.append((name,"not rejected",""))
        except ValueError as e:
            print(f"  ok    {name:22s} rejected: {str(e)[:58]}")
        except Exception as e:
            print(f"  ok?   {name:22s} raised {type(e).__name__}: {str(e)[:44]}")
    return f
