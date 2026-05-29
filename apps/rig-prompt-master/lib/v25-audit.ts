export type V25CapabilityStatus = "implemented" | "partial" | "simulated" | "missing";
export type V25RiskLevel = "low" | "medium" | "high" | "critical";
export type V25KpiStatus = "ready" | "watch" | "gap";

export interface V25Capability {
  id: string;
  area: string;
  label: string;
  status: V25CapabilityStatus;
  claim: string;
  evidence: string;
  nextAction: string;
  rigImpact: string;
  risk: V25RiskLevel;
}

export interface V25Kpi {
  id: string;
  group: "testing" | "capability" | "ux";
  label: string;
  target: string;
  current: string;
  measurement: string;
  status: V25KpiStatus;
}

export interface V25TestingRole {
  role: string;
  passEvidence: string[];
}

export interface V25DoneCriterion {
  id: string;
  label: string;
  owner: string;
  proof: string;
  gate: string;
}

export interface V25Audit {
  generatedUtc: string;
  product: string;
  coordinate: {
    altitude: "L6";
    diamond: "D3";
    archetype: "A3";
    iqrsqpi: "I/Q/R/S/Q/P/I";
    confidence: "BMX evidence-backed";
  };
  maturity: {
    baselineScore: number;
    currentScore: number;
    targetScore: number;
    multiplier: string;
    summary: string;
  };
  statusCounts: Record<V25CapabilityStatus, number>;
  capabilities: V25Capability[];
  kpis: V25Kpi[];
  testingRoles: V25TestingRole[];
  doneCriteria: V25DoneCriterion[];
  evidenceCommands: string[];
  claimLanguageRules: string[];
}

const capabilities: V25Capability[] = [
  {
    id: "cap_app_shell",
    area: "product",
    label: "Canonical web workbench",
    status: "implemented",
    claim: "The Next.js app is the primary RIG Master Prompter surface.",
    evidence: "apps/rig-prompt-master/app/page.tsx and components/prompt-master-app.tsx render the workbench.",
    nextAction: "Keep the old Python bridge as compatibility only until parity is retired.",
    rigImpact: "Gives RIG one canonical control plane for prompt, context, proof, and approval work.",
    risk: "low",
  },
  {
    id: "cap_desktop_wrapper",
    area: "desktop",
    label: "Desktop launcher",
    status: "implemented",
    claim: "The macOS wrapper opens the same product instead of a separate app.",
    evidence: "apps/rig-prompt-master/desktop/RIGMasterPrompter.swift and desktop/build-desktop-app.sh.",
    nextAction: "Add signed/notarized release packaging when distribution leaves Mike's machine.",
    rigImpact: "Keeps desktop usage connected to the same backend and API contract.",
    risk: "medium",
  },
  {
    id: "cap_v15_catalog",
    area: "doctrine",
    label: "v15 doctrine catalog",
    status: "implemented",
    claim: "The app exposes the 50 resources, 10 personas, 100 questions, gates, and catalog audit status.",
    evidence: "GET /api/v1/catalog/v15 and apps/rig-prompt-master/lib/catalog.ts.",
    nextAction: "Add catalog provenance snapshots for every production release.",
    rigImpact: "Preserves RIG AI Engineering doctrine as executable product data.",
    risk: "low",
  },
  {
    id: "cap_prompt_intake",
    area: "prompt",
    label: "Prompt intake and repair",
    status: "implemented",
    claim: "Users can paste a prompt, select a target surface, and generate a fixed prompt with gates and citations.",
    evidence: "POST /api/v1/prompt-runs and apps/rig-prompt-master/lib/prompt-master.ts.",
    nextAction: "Add version diffing and user-editable enhancement packs.",
    rigImpact: "Turns rough asks into bounded RIG contracts instead of freeform agent instructions.",
    risk: "medium",
  },
  {
    id: "cap_done_contract",
    area: "proof",
    label: "Structured DoneContract",
    status: "implemented",
    claim: "Prompt runs emit a structured v10 DoneContract and proof requirements.",
    evidence: "DoneContract in apps/rig-prompt-master/lib/types.ts and tests/prompt-agent-flow.test.ts.",
    nextAction: "Add schema version migration tests before v10 hardening.",
    rigImpact: "Defines what done means before an agent or human starts work.",
    risk: "medium",
  },
  {
    id: "cap_context_registry",
    area: "context",
    label: "Context-source registry",
    status: "partial",
    claim: "GitHub, Gitea, QNAP, Recall.it, uploads, URLs, and repo folders are visible as context sources.",
    evidence: "apps/rig-prompt-master/lib/store.ts initializes the source registry.",
    nextAction: "Replace placeholder sync with real connector adapters, permission checks, and freshness policies.",
    rigImpact: "Creates the map for hybrid local/cloud memory, but not the real retrieval engine yet.",
    risk: "high",
  },
  {
    id: "cap_connector_sync",
    area: "context",
    label: "Deep connector sync",
    status: "missing",
    claim: "Real GitHub/Gitea/QNAP/Recall.it sync is not yet implemented.",
    evidence: "apps/rig-prompt-master/lib/context.ts currently produces single local chunks and placeholder summaries.",
    nextAction: "Build connector workers with pinned credentials, path allowlists, rate limits, hashes, and citations.",
    rigImpact: "This is the difference between a useful cockpit and a real RIG memory plane.",
    risk: "critical",
  },
  {
    id: "cap_embeddings",
    area: "memory",
    label: "Embeddings and retrieval",
    status: "missing",
    claim: "The app has no production pgvector retrieval loop yet.",
    evidence: "migrations/001_initial.sql defines pgvector storage, but runtime code still uses local JSON chunks.",
    nextAction: "Add embedding jobs, vector search, citation scoring, and stale-context indicators.",
    rigImpact: "Enables prompt repair to use the right context instead of whatever was recently synced.",
    risk: "critical",
  },
  {
    id: "cap_local_store",
    area: "data",
    label: "Local development store",
    status: "partial",
    claim: "Local JSON persistence is useful for development but is not production authority.",
    evidence: "apps/rig-prompt-master/lib/store.ts writes .data/rig-prompt-master-store.json or RIG_PROMPT_MASTER_STORE.",
    nextAction: "Make Postgres the production source of truth and keep local SQLite/JSON only for bridge cache.",
    rigImpact: "Supports fast local iteration while making the remaining data-plane gap explicit.",
    risk: "high",
  },
  {
    id: "cap_api_auth",
    area: "security",
    label: "API-key/dev auth guard",
    status: "partial",
    claim: "The API has a shared auth guard, but SSO and scoped keys are not complete.",
    evidence: "apps/rig-prompt-master/lib/http.ts requireRigAuth supports RIG_API_KEY and dev anon mode.",
    nextAction: "Add OIDC workspace roles, scoped API keys, and production auth tests for every v1 route.",
    rigImpact: "Prevents accidental public access once hardened, but cannot yet carry enterprise identity.",
    risk: "critical",
  },
  {
    id: "cap_redaction",
    area: "security",
    label: "Secret redaction",
    status: "partial",
    claim: "Credential-shaped text is redacted before prompt/context storage in covered paths.",
    evidence: "apps/rig-prompt-master/lib/redaction.ts and tests/redaction.test.ts.",
    nextAction: "Add streaming redaction, attachment scanning, entropy detection, and regression fixtures.",
    rigImpact: "Reduces private-data exposure risk before broader connector ingestion.",
    risk: "high",
  },
  {
    id: "cap_agent_state",
    area: "agents",
    label: "Approval-gated agent state machine",
    status: "partial",
    claim: "Risky agent actions enter waiting_approval before advancing.",
    evidence: "apps/rig-prompt-master/lib/agent-runs.ts and tests/prompt-agent-flow.test.ts.",
    nextAction: "Persist approval scopes, actor identity, and irreversible-action denial tests per adapter.",
    rigImpact: "Keeps A3 bounded-agent posture visible and testable.",
    risk: "high",
  },
  {
    id: "cap_real_agents",
    area: "agents",
    label: "Real browser/repo workers",
    status: "simulated",
    claim: "Browser and repo runs do not execute real external actions yet.",
    evidence: "decideApproval in apps/rig-prompt-master/lib/agent-runs.ts records a simulated verifier step.",
    nextAction: "Add a Docker worker with dry-run first, queued jobs, tool logs, screenshots, and rollback plans.",
    rigImpact: "Required for full agent harness value, but correctly blocked from pretending to be live.",
    risk: "critical",
  },
  {
    id: "cap_independent_verifier",
    area: "proof",
    label: "Independent verifier",
    status: "simulated",
    claim: "Verifier evidence is currently generated in-process, not by a separate verifier.",
    evidence: "Agent proof packets are created by the same runtime that advances the agent run.",
    nextAction: "Split generator/evaluator/verifier roles and require verifier-only proof before complete state.",
    rigImpact: "Moves ProofPackets from useful logs to trustworthy release evidence.",
    risk: "critical",
  },
  {
    id: "cap_proof_packets",
    area: "proof",
    label: "ProofPacket recall",
    status: "partial",
    claim: "ProofPackets can be created and recalled by API, but integrity signing is absent.",
    evidence: "GET /api/v1/proof-packets/:id and app/api/v1/proof-packets routes.",
    nextAction: "Add hash chains or signatures, evidence file manifests, and exportable proof bundles.",
    rigImpact: "Lets RIG recall why a prompt or run was considered safe.",
    risk: "high",
  },
  {
    id: "cap_enterprise_sso",
    area: "identity",
    label: "SSO/OIDC",
    status: "missing",
    claim: "Enterprise SSO is planned but not implemented.",
    evidence: "No OIDC route, session provider, workspace role model, or OAuth callback exists in the app.",
    nextAction: "Add OIDC-first auth with workspace membership, API-key scopes, and audit events.",
    rigImpact: "Required before multi-user or enterprise deployment.",
    risk: "critical",
  },
  {
    id: "cap_playwright",
    area: "testing",
    label: "End-to-end browser tests",
    status: "missing",
    claim: "There is no committed Playwright suite for the primary user journey yet.",
    evidence: "apps/rig-prompt-master/tests currently contains unit/flow Vitest tests only.",
    nextAction: "Add upload/paste prompt to context sync to proof recall E2E coverage on desktop and mobile viewports.",
    rigImpact: "Turns the UI from manually checked to release-gated.",
    risk: "high",
  },
  {
    id: "cap_accessibility",
    area: "ux",
    label: "Accessibility and usability evidence",
    status: "missing",
    claim: "No accessibility or usability test evidence is committed yet.",
    evidence: "No axe/Lighthouse report or usability script artifact exists in the app folder.",
    nextAction: "Add Lighthouse/axe checks and five-task usability script with pass/fail evidence.",
    rigImpact: "Prevents a powerful cockpit from becoming too dense to operate.",
    risk: "high",
  },
];

const kpis: V25Kpi[] = [
  {
    id: "test_unit",
    group: "testing",
    label: "Unit and domain tests",
    target: ">=95% of deterministic domain rules covered",
    current: "Vitest covers catalog, redaction, prompt flow, v10 readiness, and v25 audit.",
    measurement: "npm run test must pass and include no skipped critical safety tests.",
    status: "watch",
  },
  {
    id: "test_api",
    group: "testing",
    label: "API contract coverage",
    target: "100% /api/v1 routes covered for success, auth failure, and validation failure",
    current: "Flow tests cover core library behavior; route-level tests are still incomplete.",
    measurement: "Route contract tests with canonical JSON errors and scoped auth cases.",
    status: "gap",
  },
  {
    id: "test_e2e",
    group: "testing",
    label: "Primary user journey E2E",
    target: "Paste prompt -> sync context -> fix prompt -> approve agent -> recall proof passes on desktop and mobile",
    current: "Manual/UI smoke only after this pass unless Playwright is added.",
    measurement: "Committed Playwright report and screenshots for desktop and mobile.",
    status: "gap",
  },
  {
    id: "test_security",
    group: "testing",
    label: "Safety gate escape rate",
    target: "0 write/send/export/destructive actions execute without explicit approval",
    current: "Core browser/repo approval gate covered at library level.",
    measurement: "Negative tests for every adapter and approval-required action class.",
    status: "watch",
  },
  {
    id: "cap_context_precision",
    group: "capability",
    label: "Context citation usefulness",
    target: ">=90% of cited chunks are relevant in a 30-run evaluation",
    current: "Not measurable until real retrieval is implemented.",
    measurement: "Human-rated retrieval eval with source hashes and freshness dates.",
    status: "gap",
  },
  {
    id: "cap_prompt_lift",
    group: "capability",
    label: "Prompt quality lift",
    target: ">=25% median improvement over raw prompt score",
    current: "Prompt readiness score is generated, but no before/after eval corpus exists.",
    measurement: "Golden prompt set scored before and after enhancement.",
    status: "gap",
  },
  {
    id: "cap_rig_adoption",
    group: "capability",
    label: "RIG operating adoption",
    target: "80% of real RIG work starts with a DoneContract and ProofPacket",
    current: "Product path exists; operating cadence is not measured.",
    measurement: "Weekly audit of prompt runs, ProofPackets, and downstream completed work.",
    status: "gap",
  },
  {
    id: "ux_first_success",
    group: "ux",
    label: "First-run success",
    target: "A new user fixes a prompt with cited context in under 5 minutes without CLI help",
    current: "Workbench is visible but dense and unvalidated with users.",
    measurement: "Usability test: 5 users, task completion, time, confusion points.",
    status: "gap",
  },
  {
    id: "ux_truth_clarity",
    group: "ux",
    label: "Truth clarity",
    target: "100% of users can tell implemented vs partial vs simulated vs missing capabilities",
    current: "This v25 audit cockpit adds explicit status counts and capability rows.",
    measurement: "Post-task comprehension check and UI screenshot review.",
    status: "watch",
  },
  {
    id: "ux_accessibility",
    group: "ux",
    label: "Accessible cockpit",
    target: "Lighthouse accessibility >=95 and keyboard path covers prompt, source, run, approval, proof",
    current: "Semantic labels exist for core controls; no committed a11y report yet.",
    measurement: "Lighthouse/axe report plus manual keyboard checklist.",
    status: "gap",
  },
];

const testingRoles: V25TestingRole[] = [
  {
    role: "User acceptance tester",
    passEvidence: [
      "Can paste or upload a rough prompt and select Claude Design, coding-agent, browser-agent, research/API, or general target.",
      "Can add at least one context source and see the fixed prompt cite what it used.",
      "Can identify what is real, partial, simulated, and missing before trusting the run.",
      "Can retrieve the ProofPacket by API id after the run.",
    ],
  },
  {
    role: "QA engineer",
    passEvidence: [
      "Runs unit, route, E2E, accessibility, responsive, and visual smoke suites with stored reports.",
      "Confirms auth failures, validation errors, redaction, approval denials, and missing connector states.",
      "Confirms desktop launcher opens the canonical web app and does not fork separate behavior.",
      "Files defects with reproduction, expected result, actual result, severity, and proof path.",
    ],
  },
  {
    role: "Senior full-stack engineer",
    passEvidence: [
      "Reviews API contracts, state transitions, data ownership, migrations, and rollback paths.",
      "Confirms Postgres/pgvector authority is separated from local bridge cache.",
      "Confirms all public capability claims match executable code and tests.",
      "Approves the worker boundary for browser/repo agents before real external actions are enabled.",
    ],
  },
  {
    role: "Frontend engineer",
    passEvidence: [
      "Checks responsive layout, keyboard focus, text fit, contrast, density, empty/loading/error states, and approval affordances.",
      "Runs desktop and mobile screenshots for the prompt workbench, v25 audit cockpit, approval rail, and proof drawer.",
    ],
  },
  {
    role: "Backend engineer",
    passEvidence: [
      "Checks route auth, idempotency where needed, canonical error shapes, audit events, redaction order, connector permissions, and ProofPacket creation.",
      "Runs smoke tests against health, v15 catalog, v10 readiness, v25 audit, prompt runs, agent runs, approvals, and proof recall.",
    ],
  },
];

const doneCriteria: V25DoneCriterion[] = [
  {
    id: "done_truth",
    label: "Truth-labeled capability map is visible in product and API",
    owner: "Product/engineering",
    proof: "GET /api/v1/v25/audit plus the 25x cockpit in the workbench.",
    gate: "No capability marked implemented unless code and tests prove it.",
  },
  {
    id: "done_tests",
    label: "Testing KPIs are executable and release-gated",
    owner: "QA",
    proof: "npm run test, npm run typecheck, npm run build, API smoke, UI smoke, desktop build.",
    gate: "No release when a safety, auth, redaction, or approval-gate test fails.",
  },
  {
    id: "done_context",
    label: "Context connectors have real retrieval or are labeled partial/missing",
    owner: "Backend",
    proof: "Connector status, sync evidence, source hashes, citation freshness, and redaction logs.",
    gate: "No connector claims deep sync until it indexes real authorized data.",
  },
  {
    id: "done_agents",
    label: "Agent harness cannot perform unsafe actions without approval",
    owner: "Security/platform",
    proof: "Negative adapter tests and ProofPacket audit events for approvals and rejections.",
    gate: "No repo writes, browser submits, public sends, private exports, or destructive operations outside approval.",
  },
  {
    id: "done_ux",
    label: "UX can be used without CLI coaching",
    owner: "Frontend/design",
    proof: "Five-task usability evidence, desktop/mobile screenshots, Lighthouse/axe report.",
    gate: "First-run task success under 5 minutes and accessibility >=95 before v10 release.",
  },
  {
    id: "done_operate",
    label: "Production operations are deployable, observable, and reversible",
    owner: "Platform",
    proof: "Vercel preview smoke, migration smoke, worker health, runbook, rollback evidence.",
    gate: "No production cutover without rollback and proof recall verified.",
  },
];

function countCapabilities(): Record<V25CapabilityStatus, number> {
  return capabilities.reduce<Record<V25CapabilityStatus, number>>(
    (counts, capability) => {
      counts[capability.status] += 1;
      return counts;
    },
    { implemented: 0, partial: 0, simulated: 0, missing: 0 },
  );
}

export function getV25Audit(): V25Audit {
  return {
    generatedUtc: new Date().toISOString(),
    product: "RIG Master Prompter",
    coordinate: {
      altitude: "L6",
      diamond: "D3",
      archetype: "A3",
      iqrsqpi: "I/Q/R/S/Q/P/I",
      confidence: "BMX evidence-backed",
    },
    maturity: {
      baselineScore: 43,
      currentScore: 52,
      targetScore: 100,
      multiplier: "25x target means 25x more trustworthy, useful, and operable than the current cockpit, not 25x more screens.",
      summary:
        "RIG Master Prompter is a strong v3 foundation: prompt intake, doctrine, local context, approvals, proof recall, desktop wrapper, and readiness UI exist. v10 requires real connectors, retrieval, SSO, worker execution, verifier separation, and release-grade QA.",
    },
    statusCounts: countCapabilities(),
    capabilities,
    kpis,
    testingRoles,
    doneCriteria,
    evidenceCommands: [
      "npm run test",
      "npm run typecheck",
      "npm run build",
      "npm run desktop:build",
      "curl -s http://127.0.0.1:8767/api/health",
      "curl -s http://127.0.0.1:8767/api/v1/v25/audit",
      "curl -s -X POST http://127.0.0.1:8767/api/v1/prompt-runs -H 'content-type: application/json' --data @smoke-prompt.json",
    ],
    claimLanguageRules: [
      "Implemented means code exists, route or UI is wired, and at least one automated or smoke test can prove it.",
      "Partial means the product path exists but lacks production-grade depth, coverage, or data authority.",
      "Simulated means the UX/API demonstrates the workflow without executing the real external action.",
      "Missing means planned capability with no production implementation yet.",
      "ProofPacket PASS claims require commands, changed files, source links or citations, verifier result, and rollback path.",
    ],
  };
}
