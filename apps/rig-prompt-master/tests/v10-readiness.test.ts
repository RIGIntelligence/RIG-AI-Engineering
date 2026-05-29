import { describe, expect, it } from "vitest";
import { getV10Readiness } from "../lib/v10-readiness";

describe("v10 readiness", () => {
  it("exposes the current maturity, target, KPIs, done criteria, and L0-L7 phases", () => {
    const readiness = getV10Readiness();

    expect(readiness.product).toBe("RIG Master Prompter");
    expect(readiness.currentMaturity.score).toBeGreaterThan(0);
    expect(readiness.currentMaturity.score).toBeLessThan(readiness.v10Target.score);
    expect(readiness.kpis).toHaveLength(12);
    expect(readiness.doneCriteria).toHaveLength(10);
    expect(readiness.phases.map((phase) => phase.id)).toEqual(["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7"]);
    expect(readiness.doctrine.archetype).toContain("A1 deterministic first");
  });
});
