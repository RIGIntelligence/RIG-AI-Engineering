"use client";

import { useMemo, useState } from "react";
import type {
  AgentRun,
  ApprovalRequest,
  ContextChunk,
  ContextSource,
  EnhancementPack,
  PromptRun,
  TargetSurface,
  V15Catalog,
} from "@/lib/types";
import type { V10Readiness } from "@/lib/v10-readiness";

interface StoreSnapshot {
  promptRuns: PromptRun[];
  contextSources: ContextSource[];
  contextChunks: ContextChunk[];
  agentRuns: AgentRun[];
  approvals: ApprovalRequest[];
}

interface Props {
  catalog: V15Catalog;
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

export default function PromptMasterApp({ catalog, initialStore, readiness }: Props) {
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
  const [promptRuns, setPromptRuns] = useState(initialStore.promptRuns);
  const [agentRuns, setAgentRuns] = useState(initialStore.agentRuns);
  const [approvals, setApprovals] = useState(initialStore.approvals);
  const [activeRun, setActiveRun] = useState<PromptRun | undefined>(initialStore.promptRuns.at(-1));
  const [activeTab, setActiveTab] = useState<"prompt" | "contract" | "proof">("prompt");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedSourceObjects = useMemo(
    () => contextSources.filter((source) => selectedSources.includes(source.id)),
    [contextSources, selectedSources],
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
  const activeContractJson = activeRun?.doneContract
    ? JSON.stringify(activeRun.doneContract, null, 2)
    : activeRun?.contract || "No structured DoneContract has been generated for this legacy run.";

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
          coverage,
          project: "RIG Master Prompter",
        }),
      });
      setPromptRuns((current) => [...current, run]);
      setActiveRun(run);
      setActiveTab("prompt");
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

  return (
    <main className="studio-shell">
      <aside className="sidebar">
        <div className="brandline">
          <span>Mike Rodgers</span>
          <span>RIG</span>
          <span>Master Prompter</span>
        </div>
        <h1>Every prompt. Every context. Evidence ready.</h1>
        <p className="lede">
          Upload or paste the rough ask, attach context, select a target surface, and produce a fixed prompt with v15 gates,
          approvals, citations, and ProofPacket recall.
        </p>

        <div className="status-row" aria-label="catalog status">
          <span className="chip live">Catalog {catalog.status}</span>
          <span className="chip">{catalog.counts.resources} resources</span>
          <span className="chip">{catalog.counts.questions} questions</span>
        </div>

        <div className="mission-card">
          <div>
            <span className="score">{readiness.currentMaturity.score}</span>
            <span className="score-label">/100 now</span>
          </div>
          <p>{readiness.currentMaturity.label}</p>
          <strong>{readiness.v10Target.label}</strong>
        </div>

        <label className="field-label" htmlFor="prompt-input">
          Prompt Intake
        </label>
        <textarea id="prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} />

        <div className="control-grid">
          {surfaceOptions.map((surface) => (
            <button
              key={surface.id}
              className={targetSurface === surface.id ? "seg active" : "seg"}
              onClick={() => setTargetSurface(surface.id)}
              type="button"
            >
              {surface.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <button className="primary" disabled={busy === "prompt-run"} onClick={createRun} type="button">
            {busy === "prompt-run" ? "Forging..." : "Fix Prompt"}
          </button>
          <button disabled={!activeRun || busy === "agent-run"} onClick={startAgentRun} type="button">
            Start Agent
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </aside>

      <section className="canvas">
        <div className="topbar">
          <span>/rig-prompt-master</span>
          <span>{readiness.doctrine.coordinate}</span>
          <button type="button" onClick={() => setCoverage(coverage === "focused" ? "full" : "focused")}>
            {coverage === "focused" ? "focused review" : "full 100"}
          </button>
        </div>

        <div className="workbench">
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
        </div>
      </section>

      <aside className="rail">
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
                <p>{source.summary}</p>
              </div>
              <button disabled={busy === source.id} onClick={() => syncSource(source.id)} type="button">
                {busy === source.id ? "syncing" : source.status}
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
    </main>
  );
}
