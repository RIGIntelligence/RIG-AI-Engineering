# 10x Plan — RIG-AI-Engineering

- maturity overall: 66.84/100
- gaps (worst-first): deviation, cognition, determinism
- expected lift: 19.3
- sigma: 9.188289

10x improvement plan for the RIG-AI-Engineering repository (targeting the 3 lowest-scoring maturity domains).
Gap: deviation scores 0.00; lift it to 0.40 (a 10.0x gain at leverage 8.0) by the move 'Enforce the anti-median deviation gate on every promoted artifact' using the robust MAD-z sigma scorer. Why it compounds: blocking median output at the source raises the floor of every shipped cell so quality compounds instead of regressing.
Gap: cognition scores 0.30; lift it to 0.70 (a 2.3x gain at leverage 9.0) by the move 'Retrofit agents with the CoALA cognitive-memory loop' using the cognitive-retrofit engine plus Human-3.0 scraping. Why it compounds: agents that reflect-and-revise outperform single-shot prompting on multi-step tasks by a compounding margin each cycle.
Gap: determinism scores 0.50; lift it to 0.90 (a 1.8x gain at leverage 10.0) by the move 'Pin the hermetic seed-lattice across every adapter' using the deterministic-replay harness. Why it compounds: byte-identical re-runs collapse flaky-test triage to zero and make every downstream proof reproducible.
