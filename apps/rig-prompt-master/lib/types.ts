export const TARGET_SURFACES = [
  "claude-design",
  "coding-agent",
  "browser-agent",
  "research-api",
  "general-prompt",
] as const;

export type TargetSurface = (typeof TARGET_SURFACES)[number];

export const ENHANCEMENT_PACKS = [
  "clarity",
  "context-grounding",
  "v15-gates",
  "claude-design",
  "coding-contract",
  "browser-safety",
  "research-citations",
  "proofpacket",
] as const;

export type EnhancementPack = (typeof ENHANCEMENT_PACKS)[number];

export type ContextSourceType =
  | "github"
  | "gitea"
  | "qnap"
  | "recall"
  | "upload"
  | "web"
  | "repo-folder";

export type ContextSourceStatus = "ready" | "needs_config" | "syncing" | "synced" | "failed";

export type AgentRunState =
  | "draft"
  | "waiting_approval"
  | "running"
  | "verifying"
  | "proof_ready"
  | "complete"
  | "failed";

export type ApprovalDecision = "approved" | "rejected";

export interface CatalogResource {
  id: string;
  name: string;
  repo?: string;
  license?: string;
  class?: string;
  role_in_rig?: string;
  first_experiment?: string;
  load_when?: string[];
}

export interface CatalogPersona {
  id: string;
  display_name: string;
  name_reference: string;
  methodology_focus: string[];
  roles: string[];
  use_when: string[];
  must_ask_question_ids: string[];
}

export interface CatalogQuestion {
  id: string;
  persona_id: string;
  question: string;
  evidence: string;
}

export interface CatalogGate {
  id: string;
  description: string;
}

export interface V15Catalog {
  status: "PASS" | "FAIL";
  generatedUtc: string;
  resources: CatalogResource[];
  personas: CatalogPersona[];
  questions: CatalogQuestion[];
  gates: CatalogGate[];
  counts: {
    resources: number;
    personas: number;
    questions: number;
    gates: number;
  };
  expected: {
    resources: number;
    personas: number;
    questions: number;
  };
}

export interface ContextChunk {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  hash: string;
  citation: string;
  metadata: Record<string, string>;
}

export interface ContextSource {
  id: string;
  type: ContextSourceType;
  name: string;
  status: ContextSourceStatus;
  location: string;
  summary: string;
  permissions: "read-only" | "approval-required";
  lastSyncedAt?: string;
  freshness?: string;
  chunkCount: number;
  error?: string;
}

export interface PromptRunInput {
  prompt: string;
  targetSurface: TargetSurface;
  enhancements: EnhancementPack[];
  project?: string;
  contextSourceIds: string[];
  coverage: "focused" | "full";
}

export interface PromptRun {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  project: string;
  targetSurface: TargetSurface;
  enhancements: EnhancementPack[];
  prompt: string;
  promptHash: string;
  fixedPrompt: string;
  contract: string;
  score: number;
  selectedQuestions: CatalogQuestion[];
  gates: CatalogGate[];
  citations: ContextChunk[];
  proofPacketId: string;
  status: "draft" | "ready" | "proof_ready";
}

export interface AgentRun {
  id: string;
  promptRunId: string;
  createdAt: string;
  updatedAt: string;
  adapter: "prompt-repair" | "design-prompt" | "browser" | "repo" | "research";
  state: AgentRunState;
  requiredApprovalIds: string[];
  steps: AgentStep[];
  proofPacketId?: string;
  error?: string;
}

export interface AgentStep {
  id: string;
  timestamp: string;
  label: string;
  status: "pending" | "running" | "complete" | "failed";
  evidence: string;
}

export interface ApprovalRequest {
  id: string;
  agentRunId: string;
  createdAt: string;
  decidedAt?: string;
  status: "pending" | "approved" | "rejected";
  requiredFor: string[];
  reason: string;
  decisionNote?: string;
}

export interface ProofPacket {
  id: string;
  createdAt: string;
  title: string;
  promptRunId?: string;
  agentRunId?: string;
  status: "draft" | "ready";
  summary: string;
  evidence: string[];
  auditEvents: AuditEvent[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  metadata: Record<string, string>;
}
