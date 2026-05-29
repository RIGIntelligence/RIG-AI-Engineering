import { describe, expect, it } from "vitest";
import { getAudienceDoneModel, getAudiencePersona } from "../lib/audience-done-model";

describe("audience done model", () => {
  it("defines ten operational product audiences with done and good criteria", () => {
    const model = getAudienceDoneModel();

    expect(model.product).toBe("RIG Master Prompter");
    expect(model.personas).toHaveLength(10);
    expect(new Set(model.personas.map((persona) => persona.id)).size).toBe(10);
    expect(
      model.personas.every(
        (persona) =>
          persona.wants.length >= 3 &&
          persona.doneLooksLike.length >= 3 &&
          persona.goodLooksLike.length >= 3 &&
          persona.productRequirements.length >= 3 &&
          persona.proofSignals.length >= 2,
      ),
    ).toBe(true);
  });

  it("supports lookup for persona-specific prompt runs", () => {
    const designer = getAudiencePersona("claude-design-designer");

    expect(designer?.role).toBe("Claude Design Designer");
    expect(designer?.productRequirements).toContain("claude-design-mode");
  });
});
