export interface V10Kpi {
  id: string;
  label: string;
  target: string;
  current: string;
  status: "met" | "partial" | "gap";
}

export interface V10DoneCriterion {
  id: string;
  label: string;
  owner: string;
  evidence: string;
  status: "met" | "partial" | "gap";
}

export interface V10DoctrinePhase {
  id: string;
  name: string;
  purpose: string;
  currentEvidence: string;
}

export interface V10Readiness {
  generatedUtc: string;
  product: string;
  currentMaturity: {
    label: string;
    score: number;
    summary: string;
  };
  v10Target: {
    label: string;
    score: number;
    summary: string;
  };
  doctrine: {
    coordinate: string;
    altitude: string;
    archetype: string;
    diamond: string;
    iqrsqpi: string;
    confidence: string;
  };
  kpis: V10Kpi[];
  doneCriteria: V10DoneCriterion[];
  phases: V10DoctrinePhase[];
}

export function getV10Readiness(): V10Readiness {
  return {
    generatedUtc: new Date().toISOString(),
    product: "RIG Master Prompter",
    currentMaturity: {
      label: "Current: v3 foundation, not v0.1",
      score: 43,
      summary:
        "The app already has a full-stack shell, v15 catalogs, local context sync, approval-gated agent runs, ProofPackets, and a macOS wrapper. It is not yet v10 because connectors, enterprise auth, worker execution, QA breadth, and observability are still shallow.",
    },
    v10Target: {
      label: "v10: enterprise prompt operating system",
      score: 100,
      summary:
        "A canonical web and desktop product where every prompt can ingest authorized context, produce a contract, run bounded agents, prove safety gates, and recall evidence by API.",
    },
    doctrine: {
      coordinate: "L6-D3-A3-S",
      altitude: "L0-L7 mapped from intake through cockpit and recall",
      archetype: "A1 deterministic first, A2 assisted synthesis, A3 bounded agents, A4 reserved for approved autonomy",
      diamond: "Double Double Diamond: product discovery/definition plus engineering design/delivery",
      iqrsqpi: "Intent, Questions, Research, Synthesis, Qualification, Proof, Iteration",
      confidence: "BMS/BMX: confidence only rises with source, test, proof, and operator evidence",
    },
    kpis: [
      { id: "kpi_context", label: "Context retrieval precision", target: "90% cited chunks useful", current: "Local simulated chunks", status: "gap" },
      { id: "kpi_redaction", label: "Secret redaction", target: "0 raw credential leaks", current: "Unit covered", status: "partial" },
      { id: "kpi_approval", label: "Approval gate escape rate", target: "0 unsafe actions without approval", current: "Core unit covered", status: "partial" },
      { id: "kpi_prompt_score", label: "Prompt readiness", target: ">=85 median after repair", current: "Scored per run", status: "partial" },
      { id: "kpi_time_to_prompt", label: "Time to fixed prompt", target: "<30 seconds for normal intake", current: "Local instant path", status: "met" },
      { id: "kpi_proof", label: "ProofPacket completeness", target: "100% runs have hash, gates, citations, verifier result", current: "Prompt and simulated agent proof", status: "partial" },
      { id: "kpi_api", label: "API contract coverage", target: "100% v1 routes tested", current: "Flow-level tests only", status: "gap" },
      { id: "kpi_desktop", label: "Desktop launch reliability", target: "99% cold launches", current: "Manual smoke passed", status: "partial" },
      { id: "kpi_auth", label: "SSO/API-key enforcement", target: "Prod routes reject unauthenticated access", current: "API-key ready", status: "partial" },
      { id: "kpi_observe", label: "Operator observability", target: "Every run has trace and debug fields", current: "Audit events started", status: "gap" },
      { id: "kpi_design", label: "Workbench usability", target: "First-run user succeeds without CLI help", current: "Improved but dense", status: "partial" },
      { id: "kpi_recall", label: "Proof recall by API", target: "100% ProofPackets retrievable", current: "Route exists", status: "partial" },
    ],
    doneCriteria: [
      { id: "done_01", label: "Canonical product name and desktop wrapper are unified", owner: "Full-stack", evidence: "README, app title, desktop bundle", status: "met" },
      { id: "done_02", label: "Prompt intake produces fixed prompt, contract, gates, citations, and proof", owner: "Backend", evidence: "prompt-run API and tests", status: "partial" },
      { id: "done_03", label: "GitHub, Gitea, QNAP, Recall.it, upload, local repo, and web sources sync with redaction", owner: "Backend", evidence: "connector contract tests", status: "gap" },
      { id: "done_04", label: "Every write, submit, send, export, or destructive action blocks on approval", owner: "Security", evidence: "approval tests and audit log", status: "partial" },
      { id: "done_05", label: "Worker service can run long browser/repo tasks outside Vercel functions", owner: "Platform", evidence: "worker health and queue smoke", status: "gap" },
      { id: "done_06", label: "SSO/API key scope model protects all v1 APIs", owner: "Platform", evidence: "prod-like auth tests", status: "partial" },
      { id: "done_07", label: "QA suite covers user, API, security, desktop, and E2E paths", owner: "QA", evidence: "test report and release gates", status: "gap" },
      { id: "done_08", label: "ProofPackets are complete, recallable, and integrity checked", owner: "Verifier", evidence: "hash/signature or ledger proof", status: "gap" },
      { id: "done_09", label: "Design workbench is accessible, responsive, and task-first", owner: "Frontend", evidence: "browser screenshots and a11y smoke", status: "partial" },
      { id: "done_10", label: "v10 release can be deployed, rolled back, and operated from docs", owner: "Operator", evidence: "runbook, smoke, rollback note", status: "gap" },
    ],
    phases: [
      { id: "L0", name: "Signal", purpose: "Capture the rough prompt, source, and intent.", currentEvidence: "Prompt textarea and API intake." },
      { id: "L1", name: "Context", purpose: "Attach authorized context sources with redaction.", currentEvidence: "Local source adapters and chunk store." },
      { id: "L2", name: "Contract", purpose: "Turn the ask into a DoneContract and acceptance checks.", currentEvidence: "Prompt contract string and v15 gates." },
      { id: "L3", name: "Design", purpose: "Shape target-specific output and UI/workflow expectations.", currentEvidence: "Enhancement packs and Claude Design mode." },
      { id: "L4", name: "Agent", purpose: "Run bounded adapters for prompt, repo, browser, and research work.", currentEvidence: "Agent run state machine stub with approvals." },
      { id: "L5", name: "Verify", purpose: "Separate generator/evaluator/verifier evidence.", currentEvidence: "Simulated verifier step in agent proof." },
      { id: "L6", name: "Operate", purpose: "Expose status, traces, approvals, and rollback.", currentEvidence: "Audit events and readiness API started." },
      { id: "L7", name: "Recall", purpose: "Recall proofs, decisions, and patterns by API.", currentEvidence: "ProofPacket retrieval routes." },
    ],
  };
}
