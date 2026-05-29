import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createAgentRun, decideApproval } from "../lib/agent-runs";
import { syncContextSource } from "../lib/context";
import { createPromptRun } from "../lib/prompt-master";
import { resetStoreForTests } from "../lib/store";

describe("prompt and agent flow", () => {
  beforeEach(async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "rig-prompt-master-"));
    process.env.RIG_PROMPT_MASTER_STORE = path.join(dir, "store.json");
    await resetStoreForTests();
  });

  it("creates a prompt run with redacted context citations", async () => {
    await syncContextSource("ctx_uploads", {
      text: "Use this design note. API_KEY=supersecretvalue mike@example.com",
      query: "claude design prompt",
    });

    const run = await createPromptRun({
      prompt: "Improve this prompt for Claude Design with password=hunter2",
      targetSurface: "claude-design",
      enhancements: ["clarity", "context-grounding", "v15-gates", "proofpacket"],
      contextSourceIds: ["ctx_uploads"],
      audiencePersonaId: "claude-design-designer",
      coverage: "focused",
      project: "RIG Master Prompter",
    });

    expect(run.fixedPrompt).toContain("RIG Master Prompter Fixed Prompt");
    expect(run.doneContract?.coordinate).toBe("L6-D3-A3-S");
    expect(run.doneContract?.audience?.personaId).toBe("claude-design-designer");
    expect(run.doneContract?.verifier.independent).toBe(true);
    expect(run.contract).toContain("DoneContract: v10.0");
    expect(run.fixedPrompt).toContain("Audience Done Model");
    expect(run.prompt).not.toContain("hunter2");
    expect(run.citations).toHaveLength(1);
    expect(run.citations[0]?.content).toContain("[REDACTED_SECRET]");
  });

  it("requires approval before browser or repo agent work advances", async () => {
    const promptRun = await createPromptRun({
      prompt: "Build a browser-agent harness.",
      targetSurface: "browser-agent",
      enhancements: ["clarity", "browser-safety", "proofpacket"],
      contextSourceIds: [],
      coverage: "focused",
      project: "RIG Master Prompter",
    });

    const agentRun = await createAgentRun({
      promptRunId: promptRun.id,
      adapter: "browser",
      requestedActions: ["browser submits"],
    });

    expect(agentRun.state).toBe("waiting_approval");
    expect(agentRun.requiredApprovalIds).toHaveLength(1);

    const advanced = await decideApproval(agentRun.requiredApprovalIds[0]!, "approved", "bounded approval");
    expect(advanced.state).toBe("proof_ready");
    expect(advanced.proofPacketId).toBeTruthy();
  });

  it("keeps no-write prompt repair runs proof-ready without approval", async () => {
    const promptRun = await createPromptRun({
      prompt: "Repair this prompt without touching files.",
      targetSurface: "general-prompt",
      enhancements: ["clarity", "proofpacket"],
      contextSourceIds: [],
      coverage: "focused",
      project: "RIG Master Prompter",
    });

    const agentRun = await createAgentRun({
      promptRunId: promptRun.id,
      adapter: "prompt-repair",
      requestedActions: [],
    });

    expect(agentRun.state).toBe("proof_ready");
    expect(agentRun.requiredApprovalIds).toHaveLength(0);
    expect(agentRun.proofPacketId).toBeTruthy();
  });

  it("records rejected approvals and blocks duplicate approval decisions", async () => {
    const promptRun = await createPromptRun({
      prompt: "Run a repo agent but do not write without approval.",
      targetSurface: "coding-agent",
      enhancements: ["clarity", "coding-contract", "proofpacket"],
      contextSourceIds: [],
      coverage: "focused",
      project: "RIG Master Prompter",
    });
    const agentRun = await createAgentRun({
      promptRunId: promptRun.id,
      adapter: "repo",
      requestedActions: ["repository writes"],
    });

    const rejected = await decideApproval(agentRun.requiredApprovalIds[0]!, "rejected", "not safe yet");

    expect(rejected.state).toBe("failed");
    expect(rejected.error).toBe("not safe yet");
    await expect(decideApproval(agentRun.requiredApprovalIds[0]!, "approved", "try again")).rejects.toMatchObject({
      code: "approval_already_decided",
      status: 409,
    });
  });
});
