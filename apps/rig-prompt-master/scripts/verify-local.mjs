import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const appDir = path.resolve(new URL("..", import.meta.url).pathname);
const baseUrl =
  process.env.RIG_MASTER_PROMPTER_URL ||
  `http://${process.env.RIG_MASTER_PROMPTER_HOST || "127.0.0.1"}:${process.env.RIG_MASTER_PROMPTER_PORT || "8767"}`;
const reportPath = path.join(appDir, ".data", "hardening-proof.json");
const appBundle = path.join(appDir, "RIG Master Prompter.app");
const iconPath = path.join(appBundle, "Contents", "Resources", "RIGMasterPrompter.icns");

const report = {
  product: "RIG Master Prompter",
  verifier: "scripts/verify-local.mjs",
  generatedUtc: new Date().toISOString(),
  baseUrl,
  checks: [],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function check(name, fn) {
  const startedAt = Date.now();
  try {
    const evidence = await fn();
    report.checks.push({ name, status: "pass", durationMs: Date.now() - startedAt, evidence });
  } catch (error) {
    report.checks.push({
      name,
      status: "fail",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function api(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}: ${text.slice(0, 240)}`);
  }
  return payload;
}

await check("desktop bundle and icon exist", async () => {
  const [bundle, icon] = await Promise.all([stat(appBundle), stat(iconPath)]);
  assert(bundle.isDirectory(), "app bundle is not a directory");
  assert(icon.size > 1000, "icon file is unexpectedly small");
  return { appBundle, iconPath, iconBytes: icon.size };
});

await check("health endpoint", async () => {
  const health = await api("/api/health");
  assert(health.status === "ok", "health status was not ok");
  assert(health.product === "RIG Master Prompter", "unexpected product");
  return health;
});

await check("catalog, audience, and hardening APIs", async () => {
  const [catalog, audience, hardening] = await Promise.all([
    api("/api/v1/catalog/v15"),
    api("/api/v1/audience-done-model"),
    api("/api/v1/hardening"),
  ]);
  assert(catalog.status === "PASS", "v15 catalog is not PASS");
  assert(catalog.counts.resources >= 50, "expected at least 50 v15 resources");
  assert(audience.personas.length === 10, "expected 10 audience personas");
  assert(hardening.doneCriteria.length >= 20, "expected at least 20 done criteria");
  assert(hardening.personaQuestions.length === 100, "expected 100 persona questions");
  return {
    resources: catalog.counts.resources,
    personas: audience.personas.length,
    doneCriteria: hardening.doneCriteria.length,
    personaQuestions: hardening.personaQuestions.length,
  };
});

let promptRun;
let agentRun;
let advancedAgentRun;

await check("connector status API truth-labels configured and blocked sources", async () => {
  const payload = await api("/api/v1/connectors/status");
  assert(Array.isArray(payload.connectors), "connectors payload was not an array");
  assert(payload.connectors.length >= 7, "expected at least seven connector statuses");
  assert(payload.connectors.some((connector) => connector.id === "ctx_uploads" && connector.configured), "uploads connector was not ready");
  assert(JSON.stringify(payload).includes("do-not-print") === false, "connector status leaked a placeholder secret");
  return {
    total: payload.connectors.length,
    ready: payload.connectors.filter((connector) => connector.configured).length,
    blocked: payload.connectors.filter((connector) => !connector.configured).length,
  };
});

await check("context sync redacts secrets", async () => {
  const payload = await api("/api/v1/context-sources/ctx_uploads/sync", {
    method: "POST",
    body: JSON.stringify({
      query: "Mac hardening verifier",
      text: "Use this source for verifier proof. API_KEY=supersecretvalue password=hunter2.",
    }),
  });
  const content = payload.chunks?.[0]?.content || "";
  assert(content.includes("[REDACTED_SECRET]"), "secret-shaped input was not redacted");
  assert(!content.includes("supersecretvalue"), "raw API key remained in chunk content");
  return { sourceId: payload.source.id, chunkCount: payload.chunks.length };
});

await check("prompt run creates fixed prompt, DoneContract, citations, and proof id", async () => {
  promptRun = await api("/api/v1/prompt-runs", {
    method: "POST",
    body: JSON.stringify({
      prompt: "Build a Claude Design prompt for the RIG Master Prompter hardening cockpit.",
      targetSurface: "claude-design",
      enhancements: ["clarity", "context-grounding", "v15-gates", "claude-design", "proofpacket"],
      contextSourceIds: ["ctx_uploads"],
      audiencePersonaId: "qa-engineer",
      coverage: "focused",
      project: "RIG Master Prompter",
    }),
  });
  assert(promptRun.status === "proof_ready", "prompt run was not proof_ready");
  assert(promptRun.fixedPrompt.includes("Audience Done Model"), "fixed prompt missed audience model");
  assert(promptRun.doneContract?.audience?.personaId === "qa-engineer", "DoneContract missed selected audience");
  assert(promptRun.citations.length >= 1, "prompt run did not cite synced context");
  assert(promptRun.proofPacketId, "prompt run missed proofPacketId");
  return { id: promptRun.id, proofPacketId: promptRun.proofPacketId, score: promptRun.score };
});

await check("proof packet recall works by API", async () => {
  assert(promptRun?.proofPacketId, "prompt run missing proof id");
  const proofPacket = await api(`/api/v1/proof-packets/${promptRun.proofPacketId}`);
  assert(proofPacket.status === "ready", "proof packet is not ready");
  assert(proofPacket.promptRunId === promptRun.id, "proof packet did not point to prompt run");
  return { id: proofPacket.id, evidenceCount: proofPacket.evidence.length };
});

await check("risky agent run waits for approval", async () => {
  assert(promptRun?.id, "prompt run missing");
  agentRun = await api("/api/v1/agent-runs", {
    method: "POST",
    body: JSON.stringify({
      promptRunId: promptRun.id,
      adapter: "browser",
      requestedActions: ["browser submits"],
    }),
  });
  assert(agentRun.state === "waiting_approval", "risky run did not wait for approval");
  assert(agentRun.requiredApprovalIds.length === 1, "risky run missed approval id");
  return { id: agentRun.id, approvalId: agentRun.requiredApprovalIds[0], state: agentRun.state };
});

await check("approval decision advances to proof_ready without hidden side effects", async () => {
  assert(agentRun?.requiredApprovalIds?.[0], "agent run missing approval id");
  advancedAgentRun = await api(`/api/v1/approvals/${agentRun.requiredApprovalIds[0]}/decision`, {
    method: "POST",
    body: JSON.stringify({
      decision: "approved",
      note: "Verifier approval for bounded local hardening smoke. No external side effects allowed.",
    }),
  });
  assert(advancedAgentRun.state === "proof_ready", "approved run did not advance to proof_ready");
  return { id: advancedAgentRun.id, proofPacketId: advancedAgentRun.proofPacketId, state: advancedAgentRun.state };
});

await check("worker job evidence is recallable", async () => {
  assert(advancedAgentRun?.id, "advanced agent run missing");
  const payload = await api("/api/v1/worker/jobs");
  const job = payload.workerJobs?.find((item) => item.agentRunId === advancedAgentRun.id);
  assert(job, "approved agent run did not create a worker job");
  assert(job.state === "complete", "worker job was not complete");
  assert(job.proofPacketId === advancedAgentRun.proofPacketId, "worker job proof id did not match agent run");
  return { id: job.id, state: job.state, proofPacketId: job.proofPacketId };
});

const failed = report.checks.filter((item) => item.status === "fail");
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));

if (failed.length) {
  console.error(`RIG local verifier failed ${failed.length} check(s). Report: ${reportPath}`);
  for (const item of failed) {
    console.error(`- ${item.name}: ${item.error}`);
  }
  process.exit(1);
}

console.log(`RIG local verifier passed ${report.checks.length} checks. Report: ${reportPath}`);
