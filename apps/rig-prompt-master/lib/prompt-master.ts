import { z } from "zod";
import { getV15Catalog, selectRelevantResources, selectV15Questions } from "./catalog";
import { getAudiencePersona, type AudiencePersona } from "./audience-done-model";
import { getContextForSources } from "./context";
import { hashText, makeId, utcNow } from "./ids";
import { redactSecrets } from "./redaction";
import { mutateStore } from "./store";
import { ENHANCEMENT_PACKS, TARGET_SURFACES, type DoneContract, type PromptRun, type PromptRunInput } from "./types";

export const promptRunSchema = z.object({
  prompt: z.string().min(1).max(100_000),
  targetSurface: z.enum(TARGET_SURFACES),
  enhancements: z.array(z.enum(ENHANCEMENT_PACKS)).default(["clarity", "context-grounding", "v15-gates", "proofpacket"]),
  project: z.string().max(200).optional(),
  audiencePersonaId: z.string().max(80).optional(),
  contextSourceIds: z.array(z.string()).default([]),
  coverage: z.enum(["focused", "full"]).default("focused"),
});

function formatBullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function surfaceLabel(surface: PromptRunInput["targetSurface"]): string {
  return {
    "claude-design": "Claude Design prompt",
    "coding-agent": "coding-agent task",
    "browser-agent": "browser-agent harness task",
    "research-api": "research/API task",
    "general-prompt": "general high-context prompt",
  }[surface];
}

function buildDoneContract(
  input: PromptRunInput,
  safePrompt: string,
  questions: { id: string }[],
  contextChunks: { id: string }[],
  audience: AudiencePersona | undefined,
): DoneContract {
  return {
    version: "v10.0",
    coordinate: "L6-D3-A3-S",
    project: input.project || "RIG Master Prompter",
    targetSurface: input.targetSurface,
    objective: safePrompt,
    doctrine: {
      altitude: "L0-L7",
      archetype: "A1 deterministic first, A2 assisted synthesis, A3 bounded agents, A4 approved autonomy only",
      diamond: "Double Double Diamond",
      iqrsqpi: "Intent, Questions, Research, Synthesis, Qualification, Proof, Iteration",
      confidence: "BMS/BMX evidence-backed confidence",
    },
    acceptanceChecks: [
      "The improved prompt is returned first and is directly usable on the selected target surface.",
      "Assumptions, missing context, acceptance checks, and proof requirements are explicit.",
      "Every factual claim is grounded in selected citations or marked as unavailable.",
      "The output respects v15 gates and the selected RIG questions.",
    ],
    approvalBoundaries: [
      "Repository writes require approval.",
      "Browser submits require approval.",
      "External sends require approval.",
      "Private exports require approval.",
      "Destructive actions and account changes require approval.",
    ],
    forbiddenActions: [
      "Do not invent missing context.",
      "Do not expose secrets, cookies, tokens, or private documents.",
      "Do not bypass the approval rail for A3 or A4 work.",
      "Do not claim PASS without inspectable proof.",
    ],
    contextSourceIds: input.contextSourceIds,
    selectedQuestionIds: questions.map((question) => question.id),
    citationIds: contextChunks.map((chunk) => chunk.id),
    audience: audience
      ? {
          personaId: audience.id,
          role: audience.role,
          doneLooksLike: audience.doneLooksLike,
          goodLooksLike: audience.goodLooksLike,
        }
      : undefined,
    proofRequirements: [
      "Record source links or local source identifiers.",
      "Record commands, tests, screenshots, model outputs, and files touched when applicable.",
      "Record approval decisions and verifier results.",
      "Record rollback or undo notes before marking complete.",
    ],
    verifier: {
      independent: true,
      mustRecordCommands: true,
      mustRecordChangedFiles: true,
      mustRecordRollback: true,
    },
  };
}

export async function createPromptRun(input: PromptRunInput): Promise<PromptRun> {
  const safePrompt = redactSecrets(input.prompt);
  const contextChunks = await getContextForSources(input.contextSourceIds);
  const questions = await selectV15Questions(input.targetSurface, input.coverage);
  const catalog = await getV15Catalog();
  const resources = await selectRelevantResources(`${input.targetSurface} ${input.enhancements.join(" ")} ${safePrompt}`, 6);
  const audience = input.audiencePersonaId ? getAudiencePersona(input.audiencePersonaId) : undefined;
  const createdAt = utcNow();
  const proofPacketId = makeId("proof");
  const doneContract = buildDoneContract(input, safePrompt, questions, contextChunks, audience);
  const contextSummary =
    contextChunks.length > 0
      ? contextChunks.map((chunk) => `${chunk.title}: ${chunk.content.slice(0, 360)}`).join("\n")
      : "No synced context selected. Ask for missing context explicitly before making factual claims.";
  const audienceSummary = audience
    ? [
        `${audience.role} (${audience.name})`,
        `Primary job: ${audience.primaryJob}`,
        `Wants: ${audience.wants.join(", ")}`,
        `Done looks like: ${audience.doneLooksLike.join(" ")}`,
        `Good looks like: ${audience.goodLooksLike.join(" ")}`,
      ].join("\n")
    : "No explicit audience selected. Ask who will use the output before optimizing tradeoffs.";

  const fixedPrompt = [
    `# RIG Master Prompter Fixed Prompt`,
    ``,
    `You are creating a ${surfaceLabel(input.targetSurface)} for project: ${input.project || "RIG Master Prompter"}.`,
    ``,
    `## Objective`,
    safePrompt,
    ``,
    `## Context To Use`,
    contextSummary,
    ``,
    `## Audience Done Model`,
    audienceSummary,
    ``,
    `## Enhancements`,
    formatBullets(input.enhancements),
    ``,
    `## V15 Review Coverage`,
    formatBullets(questions.map((question) => `${question.id}: ${question.question} Evidence: ${question.evidence}`)),
    ``,
    `## Approval Boundaries`,
    formatBullets([
      "Do not write to repositories, submit browser forms, send external messages, expose private data, or run destructive actions without explicit approval.",
      "Record commands, files touched, citations, screenshots, and verifier results into a ProofPacket.",
      "Mark missing context as an open question instead of inventing details.",
    ]),
    ``,
    `## Output Contract`,
    formatBullets([
      "Return the improved prompt first.",
      "Then tune the output to the selected audience's done and good criteria.",
      "Then return the assumptions, required context, acceptance checks, and ProofPacket evidence plan.",
      "Cite source chunks or say no source was available.",
    ]),
  ].join("\n");

  const contract = [
    `RIG Coordinate: ${doneContract.coordinate}`,
    `DoneContract: ${doneContract.version}`,
    `Surface: ${input.targetSurface}`,
    `Catalog: ${catalog.status} with ${catalog.counts.resources} resources, ${catalog.counts.personas} personas, ${catalog.counts.questions} questions`,
    `Selected questions: ${questions.length}`,
    `Selected context chunks: ${contextChunks.length}`,
    `Approval gate: required for writes, sends, exports, destructive actions, and account changes`,
    `Relevant open-source references: ${resources.map((resource) => resource.name).join(", ")}`,
    `Acceptance checks: ${doneContract.acceptanceChecks.length}`,
    `Verifier independent: ${doneContract.verifier.independent ? "yes" : "no"}`,
  ].join("\n");

  const run: PromptRun = {
    id: makeId("prun"),
    createdAt,
    updatedAt: createdAt,
    version: 1,
    project: input.project || "RIG Master Prompter",
    audiencePersonaId: audience?.id,
    targetSurface: input.targetSurface,
    enhancements: input.enhancements,
    prompt: safePrompt,
    promptHash: hashText(safePrompt),
    fixedPrompt,
    contract,
    doneContract,
    score: Math.min(100, 62 + questions.length + contextChunks.length * 4 + input.enhancements.length * 2),
    selectedQuestions: questions,
    gates: catalog.gates,
    citations: contextChunks,
    proofPacketId,
    status: "proof_ready",
  };

  await mutateStore((data) => {
    data.promptRuns.push(run);
    data.proofPackets.push({
      id: proofPacketId,
      createdAt,
      title: `Prompt run ${run.id}`,
      promptRunId: run.id,
      status: "ready",
      summary: `Fixed ${surfaceLabel(input.targetSurface)} for ${audience?.role || "general audience"} with ${questions.length} v15 questions and ${contextChunks.length} context citations.`,
      evidence: [
        `Prompt hash: ${run.promptHash}`,
        `DoneContract: ${run.doneContract?.version} ${run.doneContract?.coordinate}`,
        `Catalog status: ${catalog.status}`,
        `Question coverage: ${questions.map((question) => question.id).join(", ")}`,
        `Context citations: ${contextChunks.map((chunk) => chunk.citation).join(", ") || "none"}`,
        `Audience: ${audience?.role || "not selected"}`,
      ],
      auditEvents: [],
    });
    data.auditEvents.push({
      id: makeId("evt"),
      timestamp: createdAt,
      actor: "local-dev",
      action: "prompt_run.created",
      target: run.id,
      metadata: { targetSurface: run.targetSurface, proofPacketId },
    });
  });

  return run;
}

export async function getPromptRun(id: string): Promise<PromptRun | undefined> {
  const { getStoreSnapshot } = await import("./store");
  const data = await getStoreSnapshot();
  return data.promptRuns.find((run) => run.id === id);
}
