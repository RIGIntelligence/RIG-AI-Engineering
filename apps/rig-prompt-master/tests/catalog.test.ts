import { describe, expect, it } from "vitest";
import { getV15Catalog, selectV15Questions } from "../lib/catalog";

describe("v15 catalog", () => {
  it("loads the expected v15 counts", async () => {
    const catalog = await getV15Catalog();
    expect(catalog.status).toBe("PASS");
    expect(catalog.counts.resources).toBe(50);
    expect(catalog.counts.personas).toBe(10);
    expect(catalog.counts.questions).toBe(100);
    expect(catalog.counts.gates).toBe(13);
  });

  it("selects focused questions without forcing the full wall", async () => {
    const questions = await selectV15Questions("claude-design", "focused");
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThan(100);
    expect(questions.some((question) => question.persona_id === "sarah-drasner-method")).toBe(true);
  });
});
