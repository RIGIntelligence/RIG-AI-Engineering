import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  ContextChunk,
  ContextSource,
  ProofPacket,
  PromptRun,
  WorkerJob,
} from "./types";

export interface StoreData {
  promptRuns: PromptRun[];
  contextSources: ContextSource[];
  contextChunks: ContextChunk[];
  agentRuns: AgentRun[];
  approvals: ApprovalRequest[];
  proofPackets: ProofPacket[];
  auditEvents: AuditEvent[];
  workerJobs: WorkerJob[];
}

function storePath(): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.RIG_PROMPT_MASTER_STORE || ".data/rig-prompt-master-store.json",
  );
}

function emptyStore(): StoreData {
  return {
    promptRuns: [],
    contextSources: defaultContextSources(),
    contextChunks: [],
    agentRuns: [],
    approvals: [],
    proofPackets: [],
    auditEvents: [],
    workerJobs: [],
  };
}

function defaultContextSources(): ContextSource[] {
  return [
    {
      id: "ctx_github",
      type: "github",
      name: "GitHub",
      status: "ready",
      location: "repo remotes and configured GitHub repositories",
      summary: "Read-only GitHub context. Writes require approval and a ProofPacket.",
      permissions: "approval-required",
      chunkCount: 0,
    },
    {
      id: "ctx_gitea",
      type: "gitea",
      name: "Gitea",
      status: process.env.RIG_GITEA_URL ? "ready" : "needs_config",
      location: process.env.RIG_GITEA_URL || "Set RIG_GITEA_URL",
      summary: "Self-hosted Git repository context for private code and issues.",
      permissions: "approval-required",
      chunkCount: 0,
    },
    {
      id: "ctx_qnap",
      type: "qnap",
      name: "QNAP",
      status: process.env.RIG_QNAP_MOUNT ? "ready" : "needs_config",
      location: process.env.RIG_QNAP_MOUNT || "Set RIG_QNAP_MOUNT",
      summary: "LAN-first QNAP files and knowledge packs through the local bridge.",
      permissions: "read-only",
      chunkCount: 0,
    },
    {
      id: "ctx_recall",
      type: "recall",
      name: "Recall.it",
      status: process.env.RIG_RECALL_API_URL ? "ready" : "needs_config",
      location: process.env.RIG_RECALL_API_URL || "Set RIG_RECALL_API_URL",
      summary: "Recall.it memory adapter. Syncs safe summaries and citations only.",
      permissions: "read-only",
      chunkCount: 0,
    },
    {
      id: "ctx_uploads",
      type: "upload",
      name: "Uploads",
      status: "ready",
      location: "prompt-run uploads",
      summary: "User-provided files, pasted notes, and prompt attachments.",
      permissions: "read-only",
      chunkCount: 0,
    },
    {
      id: "ctx_web",
      type: "web",
      name: "Web Scrape",
      status: "ready",
      location: "approved URLs only",
      summary: "Scraped page context with citations and no account actions.",
      permissions: "approval-required",
      chunkCount: 0,
    },
    {
      id: "ctx_repo_folder",
      type: "repo-folder",
      name: "Local Repo Folder",
      status: "ready",
      location: "local RIG Bridge",
      summary: "Local repository folder context through the bridge or desktop launcher.",
      permissions: "read-only",
      chunkCount: 0,
    },
  ];
}

async function readStore(): Promise<StoreData> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!Array.isArray(parsed.contextSources) || parsed.contextSources.length === 0) {
      parsed.contextSources = defaultContextSources();
    }
    parsed.workerJobs ||= [];
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyStore();
    }
    throw error;
  }
}

async function writeStore(data: StoreData): Promise<void> {
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getStoreSnapshot(): Promise<StoreData> {
  return readStore();
}

export async function mutateStore<T>(mutator: (data: StoreData) => T | Promise<T>): Promise<T> {
  const data = await readStore();
  const result = await mutator(data);
  await writeStore(data);
  return result;
}

export async function resetStoreForTests(): Promise<void> {
  await rm(storePath(), { force: true });
}
