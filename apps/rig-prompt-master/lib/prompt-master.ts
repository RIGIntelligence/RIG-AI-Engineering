import { z } from "zod";
import { getV15Catalog, selectRelevantResources, selectV15Questions } from "./catalog";
import { getContextForSources } from "./context";
import { hashText, makeId, utcNow } from "./ids";
import { redactSecrets } from "./redaction";
import { mutateStore } from "./store";
import { ENHANCEMENT_PACKS, TARGET_SURFACES, type PromptRun, type PromptRunInput } from "./types";

export const promptRunSchema = z.object({
  prompt: z.string().min(1).max(100_000),
  targetSurface: z.enum(TARGET_SURFACES),
  enhancements: z.array(z.enum(ENHANCEMENT_PACKS)).default(["clarity", "context-grounding", "v15-gates", "proofpacket"]),
  project: z.string().max(200).optional(),
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

export async function createPromptRun(input: PromptRunInput): Promise<PromptRun> {
  const safePrompt = redactSecrets(input.prompt);
  const contextChunks = await getContextForSources(input.contextSourceIds);
  const questions = await selectV15Questions(input.targetSurface, input.coverage);
  const catalog = await getV15Catalog();
  const resources = await selectRelevantResources(`${input.targetSurface} ${input.enhancements.join(" ")} ${safePrompt}`, 6);
  const createdAt = utcNow();
  const proofPacketId = makeId("proof");
  const contextSummary =
    contextChunks.length > 0
      ? contextChunks.map((chunk) => `${chunk.title}: ${chunk.content.slice(0, 360)}`).join("\n")
      : "No synced context selected. Ask for missing context explicitly before making factual claims.";

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
      "Then return the assumptions, required context, acceptance checks, and ProofPacket evidence plan.",
      "Cite source chunks or say no source was available.",
    ]),
  ].join("\n");

  const contract = [
    `RIG Coordinate: L4-D2-A3-S`,
    `Surface: ${input.targetSurface}`,
    `Catalog: ${catalog.status} with ${catalog.counts.resources} resources, ${catalog.counts.personas} personas, ${catalog.counts.questions} questions`,
    `Selected questions: ${questions.length}`,
    `Selected context chunks: ${contextChunks.length}`,
    `Approval gate: required for writes, sends, exports, destructive actions, and account changes`,
    `Relevant open-source references: ${resources.map((resource) => resource.name).join(", ")}`,
  ].join("\n");

  const run: PromptRun = {
    id: makeId("prun"),
    createdAt,
    updatedAt: createdAt,
    version: 1,
    project: input.project || "RIG Master Prompter",
    targetSurface: input.targetSurface,
    enhancements: input.enhancements,
    prompt: safePrompt,
    promptHash: hashText(safePrompt),
    fixedPrompt,
    contract,
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
      summary: `Fixed ${surfaceLabel(input.targetSurface)} with ${questions.length} v15 questions and ${contextChunks.length} context citations.`,
      evidence: [
        `Prompt hash: ${run.promptHash}`,
        `Catalog status: ${catalog.status}`,
        `Question coverage: ${questions.map((question) => question.id).join(", ")}`,
        `Context citations: ${contextChunks.map((chunk) => chunk.citation).join(", ") || "none"}`,
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
