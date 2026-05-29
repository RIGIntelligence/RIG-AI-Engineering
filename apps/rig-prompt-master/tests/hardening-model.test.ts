import { describe, expect, it } from "vitest";
import { getHardeningModel } from "../lib/hardening-model";

describe("hardening model", () => {
  it("defines KPIs, 20+ done criteria, and exactly 100 persona questions", () => {
    const model = getHardeningModel();

    expect(model.product).toBe("RIG Master Prompter");
    expect(model.kpis.length).toBeGreaterThanOrEqual(10);
    expect(model.doneCriteria.length).toBeGreaterThanOrEqual(20);
    expect(model.personaQuestions).toHaveLength(100);
    expect(new Set(model.personaQuestions.map((question) => question.id)).size).toBe(100);
  });

  it("covers ten personas with ten questions each and records findings plus solutions", () => {
    const model = getHardeningModel();
    const byPersona = new Map<string, number>();

    for (const question of model.personaQuestions) {
      byPersona.set(question.personaId, (byPersona.get(question.personaId) || 0) + 1);
      expect(question.finding.length).toBeGreaterThan(20);
      expect(question.solution.length).toBeGreaterThan(20);
    }

    expect(byPersona.size).toBe(10);
    expect([...byPersona.values()].every((count) => count === 10)).toBe(true);
    expect(model.capabilities.some((capability) => capability.status === "watch")).toBe(true);
    expect(model.kpis.some((kpi) => kpi.status === "gap")).toBe(true);
  });
});
