import { z } from "zod";
import { ApiError } from "./http";
import { makeId, utcNow } from "./ids";
import { mutateStore } from "./store";
import type { AgentRun, ApprovalDecision } from "./types";

export const agentRunSchema = z.object({
  promptRunId: z.string().min(1),
  adapter: z.enum(["prompt-repair", "design-prompt", "browser", "repo", "research"]).default("prompt-repair"),
  requestedActions: z.array(z.string()).default([]),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2_000).optional(),
});

const approvalRequired = [
  "repository writes",
  "browser submits",
  "account changes",
  "external sends",
  "private exports",
  "destructive actions",
];

export async function createAgentRun(input: z.infer<typeof agentRunSchema>): Promise<AgentRun> {
  return mutateStore((data) => {
    const promptRun = data.promptRuns.find((run) => run.id === input.promptRunId);
    if (!promptRun) {
      throw new ApiError(404, "prompt_run_not_found", `Prompt run ${input.promptRunId} was not found.`);
    }

    const now = utcNow();
    const riskyAdapter = input.adapter === "browser" || input.adapter === "repo";
    const riskyRequestedAction = input.requestedActions.some((action) =>
      approvalRequired.some((required) => action.toLowerCase().includes(required.replace(" ", "")) || action.toLowerCase().includes(required)),
    );
    const needsApproval = riskyAdapter || riskyRequestedAction;
    const approvalId = needsApproval ? makeId("appr") : undefined;
    const run: AgentRun = {
      id: makeId("arun"),
      promptRunId: promptRun.id,
      createdAt: now,
      updatedAt: now,
      adapter: input.adapter,
      state: needsApproval ? "waiting_approval" : "proof_ready",
      requiredApprovalIds: approvalId ? [approvalId] : [],
      proofPacketId: needsApproval ? undefined : makeId("proof"),
      steps: [
        {
          id: makeId("step"),
          timestamp: now,
          label: "Build deterministic task envelope",
          status: "complete",
          evidence: `Prompt run ${promptRun.id}`,
        },
        {
          id: makeId("step"),
          timestamp: now,
          label: needsApproval ? "Wait for human approval" : "Verify no gated action is requested",
          status: needsApproval ? "pending" : "complete",
          evidence: needsApproval ? "Approval required before adapter execution." : "No write/send/export/destructive action requested.",
        },
      ],
    };

    data.agentRuns.push(run);
    if (approvalId) {
      data.approvals.push({
        id: approvalId,
        agentRunId: run.id,
        createdAt: now,
        status: "pending",
        requiredFor: approvalRequired,
        reason: `${input.adapter} agent requested gated capabilities. RIG v15 requires approval before execution.`,
      });
    } else if (run.proofPacketId) {
      data.proofPackets.push({
        id: run.proofPacketId,
        createdAt: now,
        title: `Agent run ${run.id}`,
        promptRunId: promptRun.id,
        agentRunId: run.id,
        status: "ready",
        summary: "Agent run completed in deterministic no-write mode.",
        evidence: ["No gated actions requested.", `Prompt run: ${promptRun.id}`],
        auditEvents: [],
      });
    }
    data.auditEvents.push({
      id: makeId("evt"),
      timestamp: now,
      actor: "local-dev",
      action: "agent_run.created",
      target: run.id,
      metadata: { adapter: input.adapter, state: run.state },
    });
    return run;
  });
}

export async function decideApproval(approvalId: string, decision: ApprovalDecision, note = ""): Promise<AgentRun> {
  return mutateStore((data) => {
    const approval = data.approvals.find((item) => item.id === approvalId);
    if (!approval) {
      throw new ApiError(404, "approval_not_found", `Approval ${approvalId} was not found.`);
    }
    if (approval.status !== "pending") {
      throw new ApiError(409, "approval_already_decided", `Approval ${approvalId} has already been decided.`);
    }

    const run = data.agentRuns.find((item) => item.id === approval.agentRunId);
    if (!run) {
      throw new ApiError(404, "agent_run_not_found", `Agent run ${approval.agentRunId} was not found.`);
    }

    const now = utcNow();
    approval.status = decision;
    approval.decidedAt = now;
    approval.decisionNote = note;
    run.updatedAt = now;

    if (decision === "rejected") {
      run.state = "failed";
      run.error = note || "Approval rejected.";
      run.steps.push({
        id: makeId("step"),
        timestamp: now,
        label: "Approval rejected",
        status: "failed",
        evidence: note || "No approval note provided.",
      });
    } else {
      const proofPacketId = makeId("proof");
      run.state = "proof_ready";
      run.proofPacketId = proofPacketId;
      run.steps.push(
        {
          id: makeId("step"),
          timestamp: now,
          label: "Approval recorded",
          status: "complete",
          evidence: note || "Approved by local operator.",
        },
        {
          id: makeId("step"),
          timestamp: now,
          label: "Verifier confirms gated work remains simulated",
          status: "complete",
          evidence: "No repository write, browser submit, external send, private export, or destructive action executed in this slice.",
        },
      );
      data.proofPackets.push({
        id: proofPacketId,
        createdAt: now,
        promptRunId: run.promptRunId,
        agentRunId: run.id,
        title: `Agent run ${run.id}`,
        status: "ready",
        summary: "Approval captured and agent run advanced to proof-ready state without hidden external side effects.",
        evidence: [
          `Approval ${approval.id}: approved`,
          "Gated actions remain bounded by adapter implementation.",
          `Agent state: ${run.state}`,
        ],
        auditEvents: [],
      });
    }

    data.auditEvents.push({
      id: makeId("evt"),
      timestamp: now,
      actor: "local-dev",
      action: "approval.decided",
      target: approval.id,
      metadata: { decision, agentRunId: run.id },
    });
    return run;
  });
}

export async function getAgentRuns(): Promise<AgentRun[]> {
  const { getStoreSnapshot } = await import("./store");
  const data = await getStoreSnapshot();
  return data.agentRuns;
}
