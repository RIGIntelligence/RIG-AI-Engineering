"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  ConnectorStatus,
  ContextChunk,
  ContextSource,
  EnhancementPack,
  PromptRun,
  TargetSurface,
  V15Catalog,
} from "@/lib/types";
import type { AudienceDoneModel } from "@/lib/audience-done-model";
import type { HardeningModel } from "@/lib/hardening-model";
import type { V10Readiness } from "@/lib/v10-readiness";
import type { V25Audit, V25CapabilityStatus, V25Kpi } from "@/lib/v25-audit";

interface StoreSnapshot {
  promptRuns: PromptRun[];
  contextSources: ContextSource[];
  contextChunks: ContextChunk[];
  agentRuns: AgentRun[];
  approvals: ApprovalRequest[];
  auditEvents: AuditEvent[];
}

interface Props {
  audienceDoneModel: AudienceDoneModel;
  audit: V25Audit;
  catalog: V15Catalog;
  connectorStatuses: ConnectorStatus[];
  hardening: HardeningModel;
  initialStore: StoreSnapshot;
  readiness: V10Readiness;
}

const enhancementOptions: Array<{ id: EnhancementPack; label: string }> = [
  { id: "clarity", label: "Clarity" },
  { id: "context-grounding", label: "Context" },
  { id: "v15-gates", label: "V15 Gates" },
  { id: "claude-design", label: "Claude Design" },
  { id: "coding-contract", label: "Coding Contract" },
  { id: "browser-safety", label: "Browser Safety" },
  { id: "research-citations", label: "Citations" },
  { id: "proofpacket", label: "ProofPacket" },
];

const surfaceOptions: Array<{ id: TargetSurface; label: string }> = [
  { id: "claude-design", label: "Claude Design" },
  { id: "coding-agent", label: "Coding Agent" },
  { id: "browser-agent", label: "Browser Agent" },
  { id: "research-api", label: "Research/API" },
  { id: "general-prompt", label: "General" },
];

type SectionId =
  | "workbench"
  | "context"
  | "personas"
  | "runs"
  | "proof"
  | "agents"
  | "approvals"
  | "gate-checklist"
  | "audit-log"
  | "catalog"
  | "connectors"
  | "integrations"
  | "settings";

interface NavigationItem {
  id: SectionId;
  label: string;
  glyph: string;
}

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Primary",
    items: [
      { id: "workbench", label: "Workbench", glyph: "1" },
      { id: "context", label: "Context", glyph: "2" },
      { id: "personas", label: "Personas", glyph: "3" },
      { id: "runs", label: "Runs", glyph: "4" },
      { id: "proof", label: "Proof", glyph: "5" },
    ],
  },
  {
    label: "Operate",
    items: [
      { id: "agents", label: "Agents", glyph: ">" },
      { id: "approvals", label: "Approvals", glyph: "0" },
      { id: "gate-checklist", label: "Gate Checklist", glyph: "G" },
      { id: "audit-log", label: "Audit Log", glyph: "A" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "catalog", label: "Catalog v15", glyph: "#" },
      { id: "connectors", label: "Connectors", glyph: "C" },
      { id: "integrations", label: "Integrations", glyph: "I" },
      { id: "settings", label: "Settings", glyph: "S" },
    ],
  },
];

const sectionCopy: Record<SectionId, { label: string; subtitle: string }> = {
  workbench: { label: "Workbench", subtitle: "Intake -> Improve -> Approve -> Run -> Proof" },
  context: { label: "Context", subtitle: "Source health, selected grounding, chunks, and sync actions" },
  personas: { label: "Personas", subtitle: "Audience done models that shape every fixed prompt" },
  runs: { label: "Runs", subtitle: "Prompt runs, versions, scores, citations, and output state" },
  proof: { label: "Proof", subtitle: "ProofPacket recall, evidence bundle, and API retrieval" },
  agents: { label: "Agents", subtitle: "Bounded agent adapters, states, and approval boundaries" },
  approvals: { label: "Approvals", subtitle: "Human gates for writes, sends, exports, and destructive actions" },
  "gate-checklist": { label: "Gate Checklist", subtitle: "RIG v15 Gate 00-12 readiness controls" },
  "audit-log": { label: "Audit Log", subtitle: "Inspectable local actions and ProofPacket events" },
  catalog: { label: "Catalog v15", subtitle: "Resources, personas, questions, gates, and catalog health" },
  connectors: { label: "Connectors", subtitle: "GitHub, Gitea, QNAP, Recall.it, uploads, web, and repo adapters" },
  integrations: { label: "Integrations", subtitle: "Deployment, desktop wrapper, API, and external service readiness" },
  settings: { label: "Settings", subtitle: "Runtime configuration, credential gaps, and operator setup" },
};

const statusLabels: Record<V25CapabilityStatus, string> = {
  implemented: "Implemented",
  partial: "Partial",
  simulated: "Simulated",
  missing: "Missing",
};

const sourceGlyphs: Record<string, string> = {
  github: "GH",
  gitea: "GT",
  qnap: "QN",
  recall: "RI",
  upload: "UP",
  web: "WEB",
  "repo-folder": "RF",
};

const modeGlyphs: Record<TargetSurface, string> = {
  "claude-design": "*",
  "coding-agent": "</>",
  "browser-agent": "WWW",
  "research-api": "[]",
  "general-prompt": "T",
};

function personaInitials(role: string) {
  return role
    .split(/[ /-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Request failed: ${response.status}`);
  }
  return payload as T;
}

export default function PromptMasterApp({
  audienceDoneModel,
  audit,
  catalog,
  connectorStatuses,
  hardening,
  initialStore,
  readiness,
}: Props) {
  const [prompt, setPrompt] = useState(
    "Create a Claude Design prompt for RIG Master Prompter that uses GitHub, QNAP, Recall.it, and v15 ProofPackets without unsafe external side effects.",
  );
  const [targetSurface, setTargetSurface] = useState<TargetSurface>("claude-design");
  const [enhancements, setEnhancements] = useState<EnhancementPack[]>([
    "clarity",
    "context-grounding",
    "v15-gates",
    "claude-design",
    "proofpacket",
  ]);
  const [coverage, setCoverage] = useState<"focused" | "full">("focused");
  const [contextSources, setContextSources] = useState(initialStore.contextSources);
  const [contextChunks, setContextChunks] = useState(initialStore.contextChunks);
  const [selectedSources, setSelectedSources] = useState<string[]>(["ctx_github", "ctx_qnap", "ctx_recall"]);
  const [selectedAudienceId, setSelectedAudienceId] = useState(audienceDoneModel.personas[0]?.id || "");
  const [promptRuns, setPromptRuns] = useState(initialStore.promptRuns);
  const [agentRuns, setAgentRuns] = useState(initialStore.agentRuns);
  const [approvals, setApprovals] = useState(initialStore.approvals);
  const [auditEvents] = useState(initialStore.auditEvents || []);
  const [activeRun, setActiveRun] = useState<PromptRun | undefined>(initialStore.promptRuns.at(-1));
  const [activeTab, setActiveTab] = useState<"prompt" | "contract" | "proof">("prompt");
  const [activeSection, setActiveSection] = useState<SectionId>("workbench");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [proofTab, setProofTab] = useState("Overview");
  const [apiOrigin, setApiOrigin] = useState("http://127.0.0.1:8767");
  const [copyStatus, setCopyStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedSourceObjects = useMemo(
    () => contextSources.filter((source) => selectedSources.includes(source.id)),
    [contextSources, selectedSources],
  );
  const activeAudience = useMemo(
    () => audienceDoneModel.personas.find((persona) => persona.id === selectedAudienceId) || audienceDoneModel.personas[0],
    [audienceDoneModel.personas, selectedAudienceId],
  );
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const kpiCounts = useMemo(
    () => ({
      met: readiness.kpis.filter((kpi) => kpi.status === "met").length,
      partial: readiness.kpis.filter((kpi) => kpi.status === "partial").length,
      gap: readiness.kpis.filter((kpi) => kpi.status === "gap").length,
    }),
    [readiness.kpis],
  );
  const highRiskGaps = useMemo(
    () =>
      audit.capabilities.filter(
        (capability) =>
          (capability.risk === "critical" || capability.risk === "high") &&
          (capability.status === "missing" || capability.status === "simulated"),
      ),
    [audit.capabilities],
  );
  const testingKpis = useMemo(() => audit.kpis.filter((kpi) => kpi.group === "testing"), [audit.kpis]);
  const uxKpis = useMemo(() => audit.kpis.filter((kpi) => kpi.group === "ux"), [audit.kpis]);
  const hardeningCounts = useMemo(
    () => ({
      pass: hardening.doneCriteria.filter((item) => item.status === "pass").length,
      watch: hardening.doneCriteria.filter((item) => item.status === "watch").length,
      gap: hardening.doneCriteria.filter((item) => item.status === "gap").length,
    }),
    [hardening.doneCriteria],
  );
  const connectorCounts = useMemo(
    () => ({
      ready: connectorStatuses.filter((connector) => connector.configured).length,
      blocked: connectorStatuses.filter((connector) => !connector.configured).length,
    }),
    [connectorStatuses],
  );
  const connectorStatusById = useMemo(
    () => new Map(connectorStatuses.map((connector) => [connector.id, connector])),
    [connectorStatuses],
  );
  const activeContractJson = activeRun?.doneContract
    ? JSON.stringify(activeRun.doneContract, null, 2)
    : activeRun?.contract || "No structured DoneContract has been generated for this legacy run.";
  const promptWordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const visibleSources = contextSources.slice(0, 6);
  const activeAgentRun = agentRuns.at(-1);
  const activeProofPacketId = activeRun?.proofPacketId || "RIG-2026-05-29-0942";
  const activeSectionMeta = sectionCopy[activeSection];
  const apiRecallSnippet = useMemo(
    () =>
      `curl -X GET "${apiOrigin}/api/v1/proof-packets/${activeProofPacketId}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: application/json"`,
    [activeProofPacketId, apiOrigin],
  );
  const runSteps = [
    { label: "Intake", status: prompt.trim() ? "Complete" : "Waiting" },
    { label: "Context", status: selectedSources.length ? "Complete" : "Waiting" },
    { label: "Improve", status: activeRun ? "Complete" : busy === "prompt-run" ? "In Progress" : "Ready" },
    { label: "Approval", status: pendingApprovals.length ? "Pending" : activeAgentRun ? "Complete" : "Waiting" },
    { label: "Proof", status: activeRun ? "Draft" : "Waiting" },
  ];

  useEffect(() => {
    setApiOrigin(window.location.origin);
  }, []);

  function toggleEnhancement(id: EnhancementPack) {
    setEnhancements((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleSource(id: string) {
    setSelectedSources((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function refreshStore() {
    const [sourcePayload, agentPayload, approvalPayload] = await Promise.all([
      apiFetch<{ contextSources: ContextSource[]; contextChunks: ContextChunk[] }>("/api/v1/context-sources"),
      apiFetch<{ agentRuns: AgentRun[] }>("/api/v1/agent-runs"),
      apiFetch<{ approvals: ApprovalRequest[] }>("/api/v1/approvals"),
    ]);
    setContextSources(sourcePayload.contextSources);
    setContextChunks(sourcePayload.contextChunks);
    setAgentRuns(agentPayload.agentRuns);
    setApprovals(approvalPayload.approvals);
  }

  async function syncSource(sourceId: string) {
    setBusy(sourceId);
    setError("");
    try {
      await apiFetch(`/api/v1/context-sources/${sourceId}/sync`, {
        method: "POST",
        body: JSON.stringify({ query: prompt, text: sourceId === "ctx_uploads" ? prompt : undefined }),
      });
      await refreshStore();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync failed.");
    } finally {
      setBusy("");
    }
  }

  async function syncVisibleSources() {
    setBusy("sync-all");
    setError("");
    try {
      for (const source of visibleSources) {
        await apiFetch(`/api/v1/context-sources/${source.id}/sync`, {
          method: "POST",
          body: JSON.stringify({ query: prompt, text: source.id === "ctx_uploads" ? prompt : undefined }),
        });
      }
      await refreshStore();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync all failed.");
    } finally {
      setBusy("");
    }
  }

  async function uploadPromptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPrompt(await file.text());
    event.target.value = "";
  }

  async function createRun() {
    setBusy("prompt-run");
    setError("");
    try {
      const run = await apiFetch<PromptRun>("/api/v1/prompt-runs", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          targetSurface,
          enhancements,
          contextSourceIds: selectedSources,
          audiencePersonaId: selectedAudienceId,
          coverage,
          project: "RIG Master Prompter",
        }),
      });
      setPromptRuns((current) => [...current, run]);
      setActiveRun(run);
      setActiveTab("prompt");
      setActiveSection("runs");
      await refreshStore();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Prompt run failed.");
    } finally {
      setBusy("");
    }
  }

  async function startAgentRun() {
    if (!activeRun) {
      return;
    }
    setBusy("agent-run");
    setError("");
    try {
      const adapter = targetSurface === "browser-agent" ? "browser" : targetSurface === "coding-agent" ? "repo" : "prompt-repair";
      const run = await apiFetch<AgentRun>("/api/v1/agent-runs", {
        method: "POST",
        body: JSON.stringify({
          promptRunId: activeRun.id,
          adapter,
          requestedActions: adapter === "prompt-repair" ? [] : ["repository writes", "browser submits", "private exports"],
        }),
      });
      setAgentRuns((current) => [...current, run]);
      setActiveSection("agents");
      await refreshStore();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent run failed.");
    } finally {
      setBusy("");
    }
  }

  async function decide(approval: ApprovalRequest, decision: "approved" | "rejected") {
    setBusy(approval.id);
    setError("");
    try {
      await apiFetch(`/api/v1/approvals/${approval.id}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          note:
            decision === "approved"
              ? "Approved by operator for this bounded RIG run."
              : "Rejected by operator from the RIG Master Prompter approval rail.",
        }),
      });
      await refreshStore();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval decision failed.");
    } finally {
      setBusy("");
    }
  }

  async function copyApiRecall() {
    setCopyStatus("");
    try {
      await navigator.clipboard.writeText(apiRecallSnippet);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  function showAddSourceMessage() {
    setActiveSection("settings");
    setError("Add Source needs a configured connector form. Current sources can be synced and selected from Context.");
  }

  function renderSectionView() {
    switch (activeSection) {
      case "context":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Grounding" title="Context sources are selectable, syncable, and truth-labeled." />
            <div className="section-grid cards-3">
              {contextSources.map((source) => (
                <article className="section-card" key={source.id}>
                  <span className={`source-glyph ${source.type}`}>{sourceGlyphs[source.type]}</span>
                  <h2>{source.name}</h2>
                  <p>{connectorStatusById.get(source.id)?.summary || source.summary}</p>
                  <dl className="mini-facts">
                    <div>
                      <dt>Status</dt>
                      <dd>{connectorStatusById.get(source.id)?.status || source.status}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{source.location}</dd>
                    </div>
                    <div>
                      <dt>Chunks</dt>
                      <dd>{source.chunkCount.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <div className="toolbar">
                    <button onClick={() => toggleSource(source.id)} type="button">
                      {selectedSources.includes(source.id) ? "Selected" : "Select"}
                    </button>
                    <button disabled={busy === source.id} onClick={() => syncSource(source.id)} type="button">
                      {busy === source.id ? "Syncing" : "Sync"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      case "personas":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Audience" title="Ten personas define what done and good mean." />
            <div className="section-grid cards-2">
              {audienceDoneModel.personas.map((persona) => (
                <button
                  className={persona.id === selectedAudienceId ? "section-card persona-section-card active" : "section-card persona-section-card"}
                  key={persona.id}
                  onClick={() => setSelectedAudienceId(persona.id)}
                  type="button"
                >
                  <span className={`persona-avatar ${persona.category}`}>{personaInitials(persona.role)}</span>
                  <h2>{persona.role}</h2>
                  <p>{persona.primaryJob}</p>
                  <strong>Done</strong>
                  <p>{persona.doneLooksLike.slice(0, 2).join(" / ")}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case "runs":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Prompt runs" title="Prompt output is created through the API, scored, and tied to ProofPackets." />
            <div className="section-grid cards-2">
              {promptRuns
                .slice()
                .reverse()
                .map((run) => (
                  <button
                    className={run.id === activeRun?.id ? "section-card run-section-card active" : "section-card run-section-card"}
                    key={run.id}
                    onClick={() => {
                      setActiveRun(run);
                      setActiveTab("prompt");
                    }}
                    type="button"
                  >
                    <h2>{run.id}</h2>
                    <p>{run.prompt.slice(0, 160)}</p>
                    <dl className="mini-facts">
                      <div>
                        <dt>Score</dt>
                        <dd>{run.score}/100</dd>
                      </div>
                      <div>
                        <dt>Citations</dt>
                        <dd>{run.citations.length}</dd>
                      </div>
                      <div>
                        <dt>Questions</dt>
                        <dd>{run.selectedQuestions.length}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              {!promptRuns.length ? <p className="muted">No prompt runs yet. Return to Workbench and click Fix Prompt.</p> : null}
            </div>
          </div>
        );
      case "proof":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Proof" title="The current ProofPacket can be recalled through this app's live API origin." />
            <div className="section-card wide-card">
              <h2>{activeProofPacketId}</h2>
              <p>
                Status: {activeRun?.status || "draft"} / Prompt hash: {activeRun?.promptHash || "pending first prompt run"} / Score:{" "}
                {activeRun?.score || 0}/100
              </p>
              <pre className="output compact-output">{apiRecallSnippet}</pre>
              <button className="primary" onClick={copyApiRecall} type="button">
                {copyStatus || "Copy API Recall"}
              </button>
            </div>
          </div>
        );
      case "agents":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Agents" title="Agent runs are bounded by state, adapter, approvals, and ProofPacket evidence." />
            <div className="section-grid cards-2">
              {agentRuns.map((run) => (
                <article className="section-card" key={run.id}>
                  <h2>{run.adapter}</h2>
                  <p>{run.state}</p>
                  <p>{run.steps.map((step) => `${step.label}: ${step.status}`).join(" / ")}</p>
                </article>
              ))}
              {!agentRuns.length ? <p className="muted">No agent runs yet. Create a prompt run, then click Start Agent.</p> : null}
            </div>
          </div>
        );
      case "approvals":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Approvals" title="Pending approval requests must be decided before gated actions run." />
            <div className="section-grid cards-2">
              {approvals.map((approval) => (
                <article className="section-card" key={approval.id}>
                  <span className={`chip ${approval.status}`}>{approval.status}</span>
                  <h2>{approval.reason}</h2>
                  <p>{approval.requiredFor.join(" / ")}</p>
                  {approval.status === "pending" ? (
                    <div className="toolbar">
                      <button disabled={busy === approval.id} onClick={() => decide(approval, "approved")} type="button">
                        approve
                      </button>
                      <button disabled={busy === approval.id} onClick={() => decide(approval, "rejected")} type="button">
                        reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!approvals.length ? <p className="muted">No approval requests have been created.</p> : null}
            </div>
          </div>
        );
      case "gate-checklist":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="V15 gates" title="Gate 00-12 checklist is visible and tied to prompt-run readiness." />
            <div className="section-grid cards-3">
              {catalog.gates.map((gate) => (
                <article className="section-card" key={gate.id}>
                  <span className="chip partial">{activeRun ? "ready" : "pending"}</span>
                  <h2>{gate.id}</h2>
                  <p>{gate.description}</p>
                </article>
              ))}
            </div>
          </div>
        );
      case "audit-log":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Audit events" title="Local store events are shown here when prompt, agent, or approval actions occur." />
            <div className="section-card wide-card">
              {(auditEvents.length ? auditEvents : []).slice(-12).map((event) => (
                <div className="log-row" key={event.id}>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                  <strong>{event.action}</strong>
                  <p>{event.target}</p>
                </div>
              ))}
              {!auditEvents.length ? <p className="muted">No audit events were present in the initial local store snapshot.</p> : null}
            </div>
          </div>
        );
      case "catalog":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Catalog" title="The v15 doctrine catalog loads from the repository catalogs." />
            <div className="section-grid cards-4">
              <MetricCard label="Resources" value={`${catalog.counts.resources}/${catalog.expected.resources}`} />
              <MetricCard label="Personas" value={`${catalog.counts.personas}/${catalog.expected.personas}`} />
              <MetricCard label="Questions" value={`${catalog.counts.questions}/${catalog.expected.questions}`} />
              <MetricCard label="Gates" value={`${catalog.counts.gates}`} />
            </div>
            <div className="section-card wide-card">
              <h2>Status: {catalog.status}</h2>
              <p>Generated UTC: {catalog.generatedUtc}</p>
            </div>
          </div>
        );
      case "connectors":
        return (
          <div className="section-view">
            <SectionHeader eyebrow="Connectors" title="Connector readiness is explicit; missing credentials remain visible." />
            <div className="section-grid cards-2">
              {connectorStatuses.map((connector) => (
                <article className="section-card" key={connector.id}>
                  <span className={`chip ${connector.configured ? "implemented" : "missing"}`}>
                    {connector.configured ? "configured" : "needs setup"}
                  </span>
                  <h2>{connector.name}</h2>
                  <p>{connector.summary}</p>
                  <p>{connector.status}</p>
                </article>
              ))}
            </div>
          </div>
        );
      case "integrations":
      case "settings":
        return (
          <div className="section-view">
            <SectionHeader
              eyebrow={activeSection === "settings" ? "Settings" : "Integrations"}
              title="Runtime configuration is now called out instead of hidden behind decorative buttons."
            />
            <div className="section-grid cards-2">
              {connectorStatuses
                .filter((connector) => !connector.configured)
                .map((connector) => (
                  <article className="section-card" key={connector.id}>
                    <span className="chip missing">required</span>
                    <h2>{connector.name}</h2>
                    <p>{connector.summary}</p>
                    <p>{connector.status}</p>
                  </article>
                ))}
              <article className="section-card">
                <span className="chip partial">local</span>
                <h2>Desktop wrapper</h2>
                <p>Native macOS WebView launcher opens this same web app and backend. Notarization is still credential-dependent.</p>
              </article>
              <article className="section-card">
                <span className="chip partial">local</span>
                <h2>API origin</h2>
                <p>{apiOrigin}</p>
              </article>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <main className={sidebarCollapsed ? "studio-shell sidebar-collapsed" : "studio-shell"}>
      <aside className="sidebar">
        <div className="app-brand">
          <span className="brand-mark" aria-hidden="true">
            *
          </span>
          <div>
            <strong>RIG</strong>
            <p>RIG Master Prompter <span>v15</span></p>
          </div>
        </div>

        <nav className="nav-stack" aria-label="RIG Master Prompter navigation">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  aria-current={activeSection === item.id ? "page" : undefined}
                  className={activeSection === item.id ? "nav-item active" : "nav-item"}
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  type="button"
                >
                  <span>{item.id === "approvals" ? pendingApprovals.length || item.glyph : item.glyph}</span>
                  <b>{item.label}</b>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="bridge-card">
          <div>
            <strong>RIG Bridge</strong>
            <span>Connected</span>
          </div>
          <i aria-hidden="true" />
          <p>Local Cache</p>
          <strong>{contextChunks.length.toLocaleString()} items</strong>
        </div>

        <button className="collapse-button" onClick={() => setSidebarCollapsed((current) => !current)} type="button">
          {sidebarCollapsed ? ">> Expand" : "<< Collapse"}
        </button>

        <footer className="sidebar-footer">
          <span>RIG Master Prompter v15.6.0</span>
          <span>(c) 2026 RIG Systems</span>
        </footer>
      </aside>

      <section className="canvas">
        <div className="topbar">
          <div>
            <h1>{activeSectionMeta.label}</h1>
            <p>{activeSectionMeta.subtitle}</p>
          </div>
          <div className="topbar-actions">
            <label>
              <span>Workspace</span>
              <select aria-label="Workspace">
                <option>Mike's OS</option>
              </select>
            </label>
            <label>
              <span>Project</span>
              <select aria-label="Project">
                <option>RIG Forge</option>
              </select>
            </label>
            <span className="online-pill">Online</span>
            <span className="notification-pill" aria-label={`${pendingApprovals.length} pending approvals`}>
              {pendingApprovals.length}
            </span>
            <button className="user-menu" type="button">
              <span>MR</span>
              Mike Rodgers
            </button>
          </div>
        </div>

        {activeSection === "workbench" ? (
          <div className="workbench">
          <section className="flow-card prompt-intake-card">
            <div className="card-heading">
              <div>
                <h2>1. Prompt Intake</h2>
                <p>Paste, type, or upload a prompt. RIG detects intent, target surface, and enhancements.</p>
              </div>
              <div className="quiet-actions">
                <button onClick={() => setPrompt("")} type="button">
                  Clear
                </button>
                <label className="upload-button">
                  Upload
                  <input accept=".md,.txt,.json" onChange={uploadPromptFile} type="file" />
                </label>
              </div>
            </div>
            <textarea id="prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <div className="prompt-meta">
              <span>{promptWordCount} words</span>
              <span>{prompt.length} chars</span>
            </div>
          </section>

          <section className="flow-card target-card">
            <div className="card-heading">
              <div>
                <h2>2. Target Mode</h2>
                <p>Choose the primary surface for improvement and execution.</p>
              </div>
              <label className="enhancement-select">
                <span>Enhancements</span>
                <select
                  aria-label="Question coverage"
                  value={coverage}
                  onChange={(event) => setCoverage(event.target.value === "full" ? "full" : "focused")}
                >
                  <option value="focused">RIG v15 Standard</option>
                  <option value="full">Full 100 Question Review</option>
                </select>
              </label>
            </div>
            <div className="mode-grid">
              {surfaceOptions.slice(0, 4).map((surface) => (
                <button
                  key={surface.id}
                  className={targetSurface === surface.id ? "mode-button active" : "mode-button"}
                  onClick={() => setTargetSurface(surface.id)}
                  type="button"
                >
                  <span>{modeGlyphs[surface.id]}</span>
                  {surface.label}
                </button>
              ))}
            </div>
            <div className="enhancement-list compact">
              {enhancementOptions.map((option) => (
                <label key={option.id}>
                  <input checked={enhancements.includes(option.id)} onChange={() => toggleEnhancement(option.id)} type="checkbox" />
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <section className="flow-card sources-card">
            <div className="card-heading">
              <div>
                <h2>3. Context Sources</h2>
                <p>Select sources to ground this prompt. Last synced times shown when available.</p>
              </div>
              <div className="quiet-actions">
                <button disabled={busy === "sync-all"} onClick={syncVisibleSources} type="button">
                  {busy === "sync-all" ? "Syncing" : "Sync All"}
                </button>
                <button onClick={showAddSourceMessage} type="button">
                  + Add Source
                </button>
              </div>
            </div>
            <div className="source-grid">
              {visibleSources.map((source) => (
                <button
                  className={selectedSources.includes(source.id) ? "source-tile selected" : "source-tile"}
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  type="button"
                >
                  <span className={`source-glyph ${source.type}`}>{sourceGlyphs[source.type]}</span>
                  <strong>{source.name}</strong>
                  <small>{source.location}</small>
                  <span className={`sync-state ${source.status}`}>{connectorStatusById.get(source.id)?.status || source.status}</span>
                  <em>{source.chunkCount.toLocaleString()} files</em>
                </button>
              ))}
            </div>
          </section>

          <section className="flow-card run-card">
            <div className="card-heading">
              <div>
                <h2>4. Build Run</h2>
                <p>Track the lifecycle of this prompt improvement and execution.</p>
              </div>
              <div className="quiet-actions">
                <button onClick={() => setActiveSection("runs")} type="button">
                  View Run Details
                </button>
                <button className="primary" disabled={busy === "prompt-run"} onClick={createRun} type="button">
                  {busy === "prompt-run" ? "Improving..." : "Continue"}
                </button>
              </div>
            </div>
            <div className="run-lifecycle">
              {runSteps.map((step, index) => (
                <div className="run-step" key={step.label}>
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                  <em>{step.status}</em>
                </div>
              ))}
            </div>
            <div className="toolbar flow-toolbar">
              <button className="primary" disabled={busy === "prompt-run"} onClick={createRun} type="button">
                {busy === "prompt-run" ? "Forging..." : "Fix Prompt"}
              </button>
              <button disabled={!activeRun || busy === "agent-run"} onClick={startAgentRun} type="button">
                Start Agent
              </button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </section>

          <div className="v10-board" aria-label="v10 readiness dashboard">
            <div>
              <p className="eyebrow">Current state</p>
              <strong>{readiness.currentMaturity.label}</strong>
              <p>{readiness.currentMaturity.summary}</p>
            </div>
            <div>
              <p className="eyebrow">v10 target</p>
              <strong>{readiness.v10Target.label}</strong>
              <p>{readiness.v10Target.summary}</p>
            </div>
            <div>
              <p className="eyebrow">KPIs</p>
              <strong>
                {kpiCounts.met} met / {kpiCounts.partial} partial / {kpiCounts.gap} gaps
              </strong>
              <p>{readiness.doctrine.iqrsqpi}</p>
            </div>
          </div>

          <div className="audit-board" aria-label="25x audit cockpit">
            <div className="audit-hero">
              <p className="eyebrow">25x target</p>
              <strong>{audit.maturity.currentScore}/100 audited today</strong>
              <p>{audit.maturity.multiplier}</p>
            </div>
            <div className="audit-status-grid">
              {(Object.keys(audit.statusCounts) as V25CapabilityStatus[]).map((status) => (
                <div className={`audit-status ${status}`} key={status}>
                  <span>{audit.statusCounts[status]}</span>
                  <p>{statusLabels[status]}</p>
                </div>
              ))}
            </div>
            <div className="risk-list">
              <p className="eyebrow">Highest-risk gaps</p>
              {highRiskGaps.slice(0, 4).map((capability) => (
                <div className="risk-item" key={capability.id}>
                  <span className={`truth-dot ${capability.status}`} />
                  <div>
                    <strong>{capability.label}</strong>
                    <p>{capability.nextAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="product-board" aria-label="operational product cockpit">
            <div className="product-cell lead">
              <p className="eyebrow">Operational build</p>
              <strong>RIG Master Prompter is an app, API, and desktop launcher.</strong>
              <p>
                This surface connects prompt intake, context sources, audience-specific done criteria, approval gates, and
                ProofPacket recall into one product flow.
              </p>
            </div>
            <div className="product-cell">
              <p className="eyebrow">Active audience</p>
              <strong>{activeAudience?.role}</strong>
              <p>{activeAudience?.primaryJob}</p>
            </div>
            <div className="product-cell">
              <p className="eyebrow">Connectors</p>
              <strong>
                {connectorCounts.ready} ready / {connectorCounts.blocked} needs setup
              </strong>
              <p>GitHub, Gitea, QNAP, Recall.it, uploads, web, and local repo status is checked by the app at load.</p>
            </div>
            <div className="product-cell">
              <p className="eyebrow">API recall</p>
              <strong>/api/v1</strong>
              <p>Prompt runs, context sources, agent runs, approvals, ProofPackets, catalog, and audience model.</p>
            </div>
            <div className="product-cell">
              <p className="eyebrow">Hardening</p>
              <strong>{hardening.personaQuestions.length} persona questions</strong>
              <p>
                {hardeningCounts.pass} pass / {hardeningCounts.watch} watch / {hardeningCounts.gap} gaps across{" "}
                {hardening.doneCriteria.length} done criteria.
              </p>
            </div>
          </div>

          <div className="hardening-board" aria-label="Mac hardening and deterministic verification">
            <div className="hardening-summary">
              <p className="eyebrow">Mac hardening goal</p>
              <strong>{hardening.version}</strong>
              <p>{hardening.goal}</p>
            </div>
            <div className="hardening-grid">
              {hardening.kpis.slice(0, 6).map((kpi) => (
                <div className={`hardening-kpi ${kpi.status}`} key={kpi.id}>
                  <span>{kpi.status}</span>
                  <strong>{kpi.name}</strong>
                  <p>{kpi.target}</p>
                </div>
              ))}
            </div>
            <div className="hardening-list">
              <p className="eyebrow">What is left</p>
              {hardening.capabilities
                .filter((capability) => capability.status !== "pass")
                .slice(0, 4)
                .map((capability) => (
                  <div className="risk-item" key={capability.id}>
                    <span className={`truth-dot ${capability.status === "gap" ? "missing" : "partial"}`} />
                    <div>
                      <strong>{capability.capability}</strong>
                      <p>{capability.notDoneYet}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="document-card">
            <p className="eyebrow">Prompt output</p>
            <h2>{activeRun ? "The fixed prompt is ready." : "The workbench is armed."}</h2>
            <p className="subcopy">
              {activeRun
                ? `${activeRun.score}/100 prompt readiness with ${activeRun.citations.length} citations and ${activeRun.selectedQuestions.length} v15 questions.`
                : "Sync context sources, tune enhancements, then forge the first production prompt run."}
            </p>

            <div className="tabs">
              {(["prompt", "contract", "proof"] as const).map((tab) => (
                <button key={tab} className={activeTab === tab ? "tab active" : "tab"} onClick={() => setActiveTab(tab)} type="button">
                  {tab}
                </button>
              ))}
            </div>

            <pre className="output">
              {activeRun
                ? activeTab === "prompt"
                  ? activeRun.fixedPrompt
                  : activeTab === "contract"
                    ? activeContractJson
                    : [`ProofPacket: ${activeRun.proofPacketId}`, `Status: ${activeRun.status}`, `Hash: ${activeRun.promptHash}`].join("\n")
                : "No prompt run yet."}
            </pre>
          </div>

          <div className="timeline">
            <p className="eyebrow">Run timeline</p>
            {(agentRuns.length ? agentRuns : []).slice(-4).map((run) => (
              <div className="timeline-item" key={run.id}>
                <span className={`dot ${run.state}`} />
                <div>
                  <strong>{run.adapter}</strong>
                  <p>{run.state}</p>
                </div>
              </div>
            ))}
            {!agentRuns.length ? <p className="muted">Agent runs appear here after you create a prompt run.</p> : null}
          </div>

          <div className="truth-table" aria-label="implemented partial simulated missing capability audit">
            <div className="truth-table-head">
              <p className="eyebrow">Capability truth table</p>
              <span>{audit.capabilities.length} audited capabilities</span>
            </div>
            {audit.capabilities.slice(0, 9).map((capability) => (
              <div className="truth-row" key={capability.id}>
                <span className={`chip ${capability.status}`}>{capability.status}</span>
                <div>
                  <strong>{capability.label}</strong>
                  <p>{capability.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : (
          renderSectionView()
        )}
      </section>

      <aside className="rail">
        <div className="panel audience-panel">
          <div className="audience-header">
            <p className="eyebrow">Audience Done Model</p>
            <button onClick={() => setActiveSection("personas")} type="button">
              All Personas
            </button>
          </div>
          <div className="persona-list" aria-label="10 product audiences">
            {audienceDoneModel.personas.map((persona) => (
              <button
                className={persona.id === selectedAudienceId ? "persona-button active" : "persona-button"}
                key={persona.id}
                onClick={() => setSelectedAudienceId(persona.id)}
                type="button"
              >
                <span className={`persona-avatar ${persona.category}`}>{personaInitials(persona.role)}</span>
                <span className="persona-copy">
                  <strong>{persona.role}</strong>
                  <small>{persona.primaryJob}</small>
                </span>
              </button>
            ))}
          </div>
          {activeAudience ? (
            <div className="persona-detail">
              <div className="persona-detail-top">
                <div>
                  <h2>{activeAudience.role}</h2>
                  <p>{activeAudience.primaryJob}</p>
                </div>
                <button aria-label={`Edit ${activeAudience.role} persona`} type="button">
                  Edit
                </button>
              </div>
              <p className="detail-heading">Wants</p>
              <p>{activeAudience.wants.join(" / ")}</p>
              <p className="detail-heading">Done Looks Like</p>
              <ul>
                {activeAudience.doneLooksLike.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="detail-heading">Good Looks Like</p>
              <ul>
                {activeAudience.goodLooksLike.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <p className="eyebrow">25x testing KPIs</p>
          <div className="kpi-list">
            {testingKpis.map((kpi) => (
              <KpiRow kpi={kpi} key={kpi.id} />
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">UX done KPIs</p>
          <div className="kpi-list">
            {uxKpis.map((kpi) => (
              <KpiRow kpi={kpi} key={kpi.id} />
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">Mac hardening</p>
          <div className="done-row">
            <span className="chip met">{hardeningCounts.pass}</span>
            <div>
              <strong>done criteria passing</strong>
              <p>{hardening.doneCriteria.length} total criteria and {hardening.personaQuestions.length} persona questions.</p>
            </div>
          </div>
          <div className="kpi-list">
            {hardening.kpis.slice(0, 4).map((kpi) => (
              <div className="kpi-row" key={kpi.id}>
                <span className={`status-dot ${kpi.status === "pass" ? "met" : kpi.status === "watch" ? "partial" : "gap"}`} />
                <div>
                  <strong>{kpi.name}</strong>
                  <p>{kpi.measurement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">v10 KPIs</p>
          <div className="kpi-list">
            {readiness.kpis.slice(0, 6).map((kpi) => (
              <div className="kpi-row" key={kpi.id}>
                <span className={`status-dot ${kpi.status}`} />
                <div>
                  <strong>{kpi.label}</strong>
                  <p>
                    {kpi.current} to {kpi.target}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">Done contract</p>
          {readiness.doneCriteria.slice(0, 5).map((item) => (
            <div className="done-row" key={item.id}>
              <span className={`chip ${item.status}`}>{item.status}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.evidence}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <p className="eyebrow">RIG lattice</p>
          <div className="lattice">
            {readiness.phases.map((phase) => (
              <span key={phase.id} title={`${phase.name}: ${phase.purpose}`}>
                {phase.id}
              </span>
            ))}
          </div>
          <p className="muted">{readiness.doctrine.archetype}</p>
        </div>

        <div className="panel">
          <p className="eyebrow">Context sources</p>
          {contextSources.map((source) => (
            <div className="source-card" key={source.id}>
              <div>
                <label>
                  <input checked={selectedSources.includes(source.id)} onChange={() => toggleSource(source.id)} type="checkbox" />
                  <strong>{source.name}</strong>
                </label>
                <p>{connectorStatusById.get(source.id)?.summary || source.summary}</p>
              </div>
              <button disabled={busy === source.id} onClick={() => syncSource(source.id)} type="button">
                {busy === source.id ? "syncing" : connectorStatusById.get(source.id)?.status || source.status}
              </button>
            </div>
          ))}
        </div>

        <div className="panel">
          <p className="eyebrow">Enhancements</p>
          <div className="enhancement-list">
            {enhancementOptions.map((option) => (
              <label key={option.id}>
                <input checked={enhancements.includes(option.id)} onChange={() => toggleEnhancement(option.id)} type="checkbox" />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="panel approvals">
          <p className="eyebrow">Approvals</p>
          {pendingApprovals.map((approval) => (
            <div className="approval-card" key={approval.id}>
              <strong>{approval.reason}</strong>
              <p>{approval.requiredFor.join(" / ")}</p>
              <div className="toolbar">
                <button disabled={busy === approval.id} onClick={() => decide(approval, "approved")} type="button">
                  approve
                </button>
                <button disabled={busy === approval.id} onClick={() => decide(approval, "rejected")} type="button">
                  reject
                </button>
              </div>
            </div>
          ))}
          {!pendingApprovals.length ? <p className="muted">No pending gated actions.</p> : null}
        </div>

        <div className="panel">
          <p className="eyebrow">Selected context</p>
          {selectedSourceObjects.map((source) => (
            <span className="source-pill" key={source.id}>
              {source.name}
            </span>
          ))}
          <p className="muted">{contextChunks.length} indexed chunks in the local bridge cache.</p>
        </div>
      </aside>

      <section className="proof-dock" aria-label="ProofPacket and API recall">
        <div className="proof-panel">
          <div className="proof-title">
            <strong>ProofPacket</strong>
            <span>Run #{activeProofPacketId}</span>
            <em>{activeRun ? activeRun.status : "Draft"}</em>
          </div>
          <div className="proof-tabs">
            {["Overview", "Artifacts", "Context", "Actions", "Logs", "Screenshots"].map((tab) => (
              <button className={proofTab === tab ? "active" : ""} key={tab} onClick={() => setProofTab(tab)} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="proof-grid">
            <dl>
              <div>
                <dt>Run ID</dt>
                <dd>{activeRun?.id || "RIG-2026-05-29-0942"}</dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>RIG Forge</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{surfaceOptions.find((surface) => surface.id === targetSurface)?.label}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{activeRun?.status || "In Progress"}</dd>
              </div>
            </dl>
            <div className="proof-summary">
              <strong>Summary</strong>
              <p>
                Prompt improvement is grounded in selected context with {coverage === "full" ? "100" : activeRun?.selectedQuestions.length || 24}
                -question coverage and approval gates for bounded agents.
              </p>
              <span>Coverage {activeRun?.score || 82}/100</span>
              <meter min="0" max="100" value={activeRun?.score || 82} />
            </div>
          </div>
        </div>
        <div className="api-recall-panel">
          <div className="proof-title">
            <strong>API Recall</strong>
            <button onClick={copyApiRecall} type="button">
              {copyStatus || "Copy"}
            </button>
          </div>
          <pre>{apiRecallSnippet}</pre>
          <div className="api-meta">
            <span>Response 200 OK</span>
            <span>Size 45.2 KB</span>
            <span>Retrieved 2s ago</span>
          </div>
        </div>
      </section>

      <div className="system-status-bar" aria-label="system status">
        <span>API: {apiOrigin}</span>
        <span>Healthy</span>
        <span>Postgres Schema Ready</span>
        <span>Connectors {connectorCounts.ready}/{connectorStatuses.length} Ready</span>
        <span>QNAP {connectorStatusById.get("ctx_qnap")?.status || "needs_path"}</span>
        <span>Recall.it {connectorStatusById.get("ctx_recall")?.status || "needs_secret"}</span>
        <span>Queue Idle</span>
      </div>
    </main>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="section-card metric-card">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function KpiRow({ kpi }: { kpi: V25Kpi }) {
  return (
    <div className="kpi-row">
      <span className={`status-dot ${kpi.status}`} />
      <div>
        <strong>{kpi.label}</strong>
        <p>
          {kpi.current} Target: {kpi.target}
        </p>
      </div>
    </div>
  );
}
