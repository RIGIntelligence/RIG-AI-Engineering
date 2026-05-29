import { describe, expect, it } from "vitest";
import { getV25Audit, type V25CapabilityStatus } from "../lib/v25-audit";

describe("v25 audit", () => {
  it("separates implemented, partial, simulated, and missing capability claims", () => {
    const audit = getV25Audit();
    const statuses = new Set(audit.capabilities.map((capability) => capability.status));

    expect(audit.product).toBe("RIG Master Prompter");
    expect(statuses).toEqual(new Set<V25CapabilityStatus>(["implemented", "partial", "simulated", "missing"]));
    expect(audit.statusCounts.implemented).toBeGreaterThan(0);
    expect(audit.statusCounts.partial).toBeGreaterThan(0);
    expect(audit.statusCounts.simulated).toBeGreaterThan(0);
    expect(audit.statusCounts.missing).toBeGreaterThan(0);
  });

  it("does not count simulated or missing agent, connector, auth, or verifier work as complete", () => {
    const audit = getV25Audit();
    const byId = new Map(audit.capabilities.map((capability) => [capability.id, capability]));

    expect(byId.get("cap_real_agents")?.status).toBe("simulated");
    expect(byId.get("cap_independent_verifier")?.status).toBe("simulated");
    expect(byId.get("cap_connector_sync")?.status).toBe("missing");
    expect(byId.get("cap_enterprise_sso")?.status).toBe("missing");
    expect(byId.get("cap_api_auth")?.status).toBe("partial");
  });

  it("defines testing, capability, and UX KPIs with measurable targets", () => {
    const audit = getV25Audit();

    expect(audit.kpis.some((kpi) => kpi.group === "testing" && kpi.id === "test_api")).toBe(true);
    expect(audit.kpis.some((kpi) => kpi.group === "capability" && kpi.id === "cap_prompt_lift")).toBe(true);
    expect(audit.kpis.some((kpi) => kpi.group === "ux" && kpi.id === "ux_first_success")).toBe(true);
    expect(audit.kpis.every((kpi) => kpi.target.length > 10 && kpi.measurement.length > 10)).toBe(true);
  });

  it("names user, QA, senior engineering, frontend, and backend proof expectations", () => {
    const audit = getV25Audit();
    const roles = audit.testingRoles.map((role) => role.role);

    expect(roles).toEqual([
      "User acceptance tester",
      "QA engineer",
      "Senior full-stack engineer",
      "Frontend engineer",
      "Backend engineer",
    ]);
    expect(audit.doneCriteria.map((criterion) => criterion.id)).toContain("done_truth");
    expect(audit.claimLanguageRules.join(" ")).toContain("Simulated means");
  });
});
