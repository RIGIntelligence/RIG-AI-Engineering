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
      coverage: "focused",
      project: "RIG Master Prompter",
    });

    expect(run.fixedPrompt).toContain("RIG Master Prompter Fixed Prompt");
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
});
