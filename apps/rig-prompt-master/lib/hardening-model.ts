import { getAudienceDoneModel } from "./audience-done-model";

export type HardeningStatus = "pass" | "watch" | "gap";

export interface HardeningKpi {
  id: string;
  name: string;
  target: string;
  measurement: string;
  current: string;
  status: HardeningStatus;
}

export interface HardeningDoneCriterion {
  id: string;
  audience: string;
  criterion: string;
  proof: string;
  status: HardeningStatus;
}

export interface PersonaTestQuestion {
  id: string;
  personaId: string;
  personaRole: string;
  question: string;
  finding: string;
  solution: string;
  status: HardeningStatus;
}

export interface CapabilityTruth {
  id: string;
  capability: string;
  worksNow: string;
  notDoneYet: string;
  nextProof: string;
  status: HardeningStatus;
}

export interface HardeningModel {
  product: "RIG Master Prompter";
  version: "v15.6-hardening";
  generatedFor: "MacBook Pro operational hardening";
  goal: string;
  doctrine: {
    coordinate: "L6-D3-A3-S";
    iqrsqpi: "Intent, Questions, Research, Synthesis, Qualification, Proof, Iteration";
    deterministicMode: "A1 first, A3 bounded agents behind approval";
    confidence: "BMX evidence-backed";
  };
  kpis: HardeningKpi[];
  doneCriteria: HardeningDoneCriterion[];
  personaQuestions: PersonaTestQuestion[];
  capabilities: CapabilityTruth[];
  verificationCommands: string[];
}

const kpis: HardeningKpi[] = [
  {
    id: "kpi_launch",
    name: "Mac app launch reliability",
    target: "RIG Master Prompter.app opens and returns /api/health in under 20 seconds",
    measurement: "script/build_and_run.sh --verify plus curl health check",
    current: "Desktop wrapper and local backend exist; launch is now part of the verifier loop.",
    status: "pass",
  },
  {
    id: "kpi_icon",
    name: "Desktop identity",
    target: "Bundle includes a non-empty .icns icon and stable app name",
    measurement: "Check Contents/Resources/RIGMasterPrompter.icns and Info.plist",
    current: "Icon asset is generated during desktop build.",
    status: "pass",
  },
  {
    id: "kpi_prompt_flow",
    name: "Prompt repair flow",
    target: "Paste prompt -> select context/audience -> Fix Prompt -> receive fixed prompt and DoneContract",
    measurement: "API verifier posts to /api/v1/prompt-runs and checks proof_ready",
    current: "Prompt run API and UI flow are wired.",
    status: "pass",
  },
  {
    id: "kpi_context",
    name: "Context grounding",
    target: "GitHub, Gitea, QNAP, Recall.it, uploads, repos, and web context can be represented with citations",
    measurement: "Context-source sync API returns redacted chunks and citations",
    current: "Source registry and local chunk sync work; deep real connector adapters remain future work.",
    status: "watch",
  },
  {
    id: "kpi_safety",
    name: "Unsafe action escape rate",
    target: "0 repo writes, browser submits, external sends, private exports, or destructive actions without approval",
    measurement: "Agent API verifier creates risky run and confirms waiting_approval",
    current: "Approval-gated state machine exists and is covered by tests.",
    status: "pass",
  },
  {
    id: "kpi_proof",
    name: "ProofPacket recall",
    target: "Every prompt or agent run returns a retrievable ProofPacket id",
    measurement: "GET /api/v1/proof-packets/:id after smoke prompt run",
    current: "Prompt and no-write agent runs create ready proof packets.",
    status: "pass",
  },
  {
    id: "kpi_test_gate",
    name: "Release test gate",
    target: "Unit, typecheck, build, desktop build, API smoke, and UI smoke all pass",
    measurement: "npm test/typecheck/build/desktop:build/verify:local plus browser screenshot proof",
    current: "This hardening pass adds a verifier; Playwright suite is still a v10 gap.",
    status: "watch",
  },
  {
    id: "kpi_ux_success",
    name: "First-run UX success",
    target: "A new operator fixes a prompt in under 5 minutes without CLI help",
    measurement: "Five-task usability script and persona question findings",
    current: "The workbench is usable but dense; hardening panel makes status clearer.",
    status: "watch",
  },
  {
    id: "kpi_accessibility",
    name: "Accessible workflow",
    target: "Keyboard path works for prompt, audience, context, run, approval, and proof; Lighthouse a11y >=95",
    measurement: "Manual keyboard checklist and future Lighthouse/axe report",
    current: "Core form labels exist; automated a11y reporting is not committed yet.",
    status: "gap",
  },
  {
    id: "kpi_auth",
    name: "Production auth readiness",
    target: "SSO or scoped API key required outside local dev",
    measurement: "Production-mode auth tests for every API route",
    current: "Shared API key/dev guard exists; OIDC workspace auth remains a production gap.",
    status: "watch",
  },
  {
    id: "kpi_retrieval",
    name: "Retrieval quality",
    target: ">=90% cited chunks judged relevant across a 30-run eval set",
    measurement: "Golden prompt corpus with source hashes, freshness, and human relevance rating",
    current: "Not measurable until production embeddings and retrieval ranking are implemented.",
    status: "gap",
  },
  {
    id: "kpi_worker",
    name: "Agent worker boundary",
    target: "Long-running browser/repo agents run outside Vercel and log steps/screenshots/commands",
    measurement: "Worker health check, queued job proof, approval decision proof",
    current: "State machine is local and simulated; real worker service is a v10 build item.",
    status: "gap",
  },
];

const doneCriteria: HardeningDoneCriterion[] = [
  {
    id: "done_001",
    audience: "Founder / CEO",
    criterion: "The app exists as one Mac application named RIG Master Prompter, not separate competing apps.",
    proof: "Desktop bundle and symlink at ~/Desktop/RIG Master Prompter.app.",
    status: "pass",
  },
  {
    id: "done_002",
    audience: "Founder / CEO",
    criterion: "The Mac app opens the canonical full-stack local product and health endpoint.",
    proof: "script/build_and_run.sh --verify and /api/health.",
    status: "pass",
  },
  {
    id: "done_003",
    audience: "Prompt Operator",
    criterion: "A rough prompt can be pasted and repaired without using the CLI.",
    proof: "UI Fix Prompt action and POST /api/v1/prompt-runs.",
    status: "pass",
  },
  {
    id: "done_004",
    audience: "Prompt Operator",
    criterion: "The output contains the fixed prompt, acceptance checks, approval boundaries, and proof requirements.",
    proof: "PromptRun.fixedPrompt and DoneContract fields.",
    status: "pass",
  },
  {
    id: "done_005",
    audience: "Claude Design Designer",
    criterion: "Claude Design mode is selectable and changes the output contract.",
    proof: "targetSurface claude-design path in prompt-master.ts.",
    status: "pass",
  },
  {
    id: "done_006",
    audience: "Senior Full-Stack Engineer",
    criterion: "API routes return structured JSON and proof identifiers for core flows.",
    proof: "/api/v1/prompt-runs, /api/v1/agent-runs, /api/v1/proof-packets.",
    status: "pass",
  },
  {
    id: "done_007",
    audience: "QA Engineer",
    criterion: "Core deterministic behavior has automated tests.",
    proof: "Vitest suite covers catalog, redaction, prompt flow, approvals, readiness, and hardening model.",
    status: "pass",
  },
  {
    id: "done_008",
    audience: "QA Engineer",
    criterion: "A deterministic local verifier exercises the running app, APIs, proof recall, desktop bundle, and icon.",
    proof: "npm run verify:local writes .data/hardening-proof.json.",
    status: "pass",
  },
  {
    id: "done_009",
    audience: "Security / Privacy Reviewer",
    criterion: "Credential-shaped text is redacted before prompt/context storage.",
    proof: "redaction tests and context sync verifier payload.",
    status: "pass",
  },
  {
    id: "done_010",
    audience: "Security / Privacy Reviewer",
    criterion: "Unsafe repo/browser/send/export/destructive actions wait for approval.",
    proof: "Agent run verifier checks waiting_approval for browser submits.",
    status: "pass",
  },
  {
    id: "done_011",
    audience: "Research Analyst",
    criterion: "Context sources can be selected and synced into cited chunks.",
    proof: "GET/POST /api/v1/context-sources and prompt run citations.",
    status: "pass",
  },
  {
    id: "done_012",
    audience: "Research Analyst",
    criterion: "Deep connector claims are truth-labeled until real adapters exist.",
    proof: "Hardening capabilities mark real GitHub/Gitea/QNAP/Recall.it depth as watch/gap.",
    status: "pass",
  },
  {
    id: "done_013",
    audience: "Platform Admin",
    criterion: "The product exposes health, v15 catalog, audience model, hardening, and proof APIs.",
    proof: "API verifier checks /api/health, /api/v1/catalog/v15, /api/v1/audience-done-model, /api/v1/hardening.",
    status: "pass",
  },
  {
    id: "done_014",
    audience: "Platform Admin",
    criterion: "One command can build, run, and verify the app from the repo.",
    proof: "script/build_and_run.sh supports run, verify, logs, debug, and telemetry modes.",
    status: "pass",
  },
  {
    id: "done_015",
    audience: "Growth / Marketing Lead",
    criterion: "General prompt mode supports business prompts, not only engineering prompts.",
    proof: "targetSurface general-prompt and audience-specific output contracts.",
    status: "pass",
  },
  {
    id: "done_016",
    audience: "Client / External Stakeholder",
    criterion: "ProofPacket status and id are visible and recallable.",
    proof: "Proof tab and GET /api/v1/proof-packets/:id.",
    status: "pass",
  },
  {
    id: "done_017",
    audience: "Frontend Engineer",
    criterion: "The UI clearly shows current state, KPIs, source cards, approvals, and proof.",
    proof: "Workbench, side rail, and hardening panel in PromptMasterApp.",
    status: "pass",
  },
  {
    id: "done_018",
    audience: "Frontend Engineer",
    criterion: "Desktop and mobile screenshots are captured for smoke review.",
    proof: "Browser/Chrome smoke screenshots saved under /tmp.",
    status: "watch",
  },
  {
    id: "done_019",
    audience: "Backend Engineer",
    criterion: "Route-level auth and validation are part of the release plan.",
    proof: "Shared requireRigAuth exists; route matrix remains a v10 expansion.",
    status: "watch",
  },
  {
    id: "done_020",
    audience: "Backend Engineer",
    criterion: "Production data authority is explicitly separated from local dev storage.",
    proof: "V25 audit and hardening capability map label local JSON as partial.",
    status: "watch",
  },
  {
    id: "done_021",
    audience: "AI Agent Operator",
    criterion: "A3 bounded-agent doctrine is represented in the app and verifier.",
    proof: "DoneContract coordinate L6-D3-A3-S and approval gate checks.",
    status: "pass",
  },
  {
    id: "done_022",
    audience: "Release Manager",
    criterion: "Build artifacts, tests, and verifier output are repeatable before shipping.",
    proof: "npm run build, npm run desktop:build, npm run verify:local.",
    status: "pass",
  },
  {
    id: "done_023",
    audience: "Support Operator",
    criterion: "Known gaps are not hidden behind optimistic copy.",
    proof: "Capabilities table includes works now, not done yet, and next proof.",
    status: "pass",
  },
  {
    id: "done_024",
    audience: "Accessibility Reviewer",
    criterion: "Accessibility is named as a KPI and not silently treated as done.",
    proof: "Hardening KPI kpi_accessibility remains gap until Lighthouse/keyboard reports exist.",
    status: "gap",
  },
];

const capabilityTruth: CapabilityTruth[] = [
  {
    id: "cap_mac_app",
    capability: "MacBook Pro desktop app",
    worksNow: "Local .app bundle opens the same Next.js app on 127.0.0.1:8767.",
    notDoneYet: "Not signed, notarized, auto-updated, or packaged for external distribution.",
    nextProof: "Run desktop build plus icon and health checks.",
    status: "pass",
  },
  {
    id: "cap_prompt_mastering",
    capability: "Prompt mastering",
    worksNow: "Paste prompt, select audience/surface/enhancements, receive fixed prompt and DoneContract.",
    notDoneYet: "No prompt version diff UI yet.",
    nextProof: "Prompt-run API smoke with audiencePersonaId and citations.",
    status: "pass",
  },
  {
    id: "cap_context",
    capability: "Hybrid context surface",
    worksNow: "GitHub, Gitea, QNAP, Recall.it, uploads, web, and repo folder are modeled and can create local chunks.",
    notDoneYet: "Real authenticated deep sync and vector retrieval are not implemented.",
    nextProof: "Connector adapter tests with source hashes, freshness, permissions, and citations.",
    status: "watch",
  },
  {
    id: "cap_agents",
    capability: "Agent harness",
    worksNow: "Prompt repair runs can be proof-ready; risky browser/repo runs wait for approval.",
    notDoneYet: "Real Docker worker execution is simulated in this local product slice.",
    nextProof: "Worker health, queued job, screenshots, commands, rollback evidence.",
    status: "watch",
  },
  {
    id: "cap_api",
    capability: "API recall",
    worksNow: "Catalog, context, prompt runs, agents, approvals, proof packets, audience model, and hardening model are API-accessible.",
    notDoneYet: "SSO/OIDC and scoped workspace API keys are not complete.",
    nextProof: "Production auth contract tests for every route.",
    status: "watch",
  },
  {
    id: "cap_testing",
    capability: "Deterministic verification",
    worksNow: "Unit, build, desktop build, local API verifier, and UI smoke can run.",
    notDoneYet: "Committed Playwright and accessibility reports are still needed for v10.",
    nextProof: "Playwright desktop/mobile journey and Lighthouse/axe reports.",
    status: "watch",
  },
];

const questionTemplates = [
  {
    topic: "first-run clarity",
    question: "Could you understand the first action to take without reading documentation?",
    finding: "The prompt intake and Fix Prompt button are visible, but the cockpit is dense for first-time users.",
    solution: "Keep the intake/action pair prominent and add a compact first-run checklist only when no runs exist.",
    status: "watch" as const,
  },
  {
    topic: "context trust",
    question: "Could you tell which context sources were selected and whether they were fresh?",
    finding: "Selected source pills and source cards work; freshness is basic and connector depth is placeholder-level.",
    solution: "Add real connector freshness, hash, permission, and last-sync details per source.",
    status: "watch" as const,
  },
  {
    topic: "prompt quality",
    question: "Did the fixed prompt become more actionable than the raw prompt?",
    finding: "The output adds target surface, audience criteria, v15 questions, approval boundaries, and output contract.",
    solution: "Add before/after scoring corpus and version diffs to measure prompt lift.",
    status: "pass" as const,
  },
  {
    topic: "audience fit",
    question: "Did the selected audience change what done and good look like?",
    finding: "DoneContract and fixed prompt include the selected audience's wants, done criteria, and quality bar.",
    solution: "Expose a side-by-side audience impact diff in a later version.",
    status: "pass" as const,
  },
  {
    topic: "safety",
    question: "Could the app perform an unsafe action without your approval?",
    finding: "Risky browser/repo requested actions move to waiting_approval and create approval records.",
    solution: "Extend negative adapter tests to every action class before real workers ship.",
    status: "pass" as const,
  },
  {
    topic: "proof recall",
    question: "Could you recall why a result was considered ready?",
    finding: "Prompt runs and no-write agent runs create ProofPackets that are retrievable by API.",
    solution: "Add signed evidence manifests and exportable proof bundles.",
    status: "pass" as const,
  },
  {
    topic: "desktop confidence",
    question: "Does the Mac app feel like the real product instead of a launcher shortcut?",
    finding: "The wrapper opens the canonical local app and bundle identity exists, but release packaging is unsigned.",
    solution: "Add signing, notarization, auto-update, and crash reporting before wider distribution.",
    status: "watch" as const,
  },
  {
    topic: "error recovery",
    question: "When something is missing or not configured, is the recovery path clear?",
    finding: "Errors are visible and connector status exists, but environment-specific recovery instructions are thin.",
    solution: "Add per-connector setup hints and runbook links in each failed source card.",
    status: "watch" as const,
  },
  {
    topic: "accessibility",
    question: "Can you complete the primary flow with keyboard and readable text at smaller widths?",
    finding: "Labels and responsive CSS exist, but no committed keyboard/a11y report proves the full flow yet.",
    solution: "Add Lighthouse/axe and manual keyboard checklist to the release gate.",
    status: "gap" as const,
  },
  {
    topic: "API confidence",
    question: "Could another agent recall this run through the API and continue safely?",
    finding: "The core recall APIs exist and return structured records; scoped production auth is not complete.",
    solution: "Add OIDC/scoped keys and route-level API contract tests.",
    status: "watch" as const,
  },
];

export function getHardeningModel(): HardeningModel {
  const personas = getAudienceDoneModel().personas;
  const personaQuestions = personas.flatMap((persona, personaIndex) =>
    questionTemplates.map((template, templateIndex) => {
      const idNumber = personaIndex * questionTemplates.length + templateIndex + 1;
      return {
        id: `UQ${String(idNumber).padStart(3, "0")}`,
        personaId: persona.id,
        personaRole: persona.role,
        question: `${persona.role}: ${template.question}`,
        finding: template.finding,
        solution: template.solution,
        status: template.status,
      };
    }),
  );

  return {
    product: "RIG Master Prompter",
    version: "v15.6-hardening",
    generatedFor: "MacBook Pro operational hardening",
    goal:
      "Make the MacBook Pro app usable as the canonical RIG Prompt Master surface with deterministic proof, visible gaps, and repeatable verification.",
    doctrine: {
      coordinate: "L6-D3-A3-S",
      iqrsqpi: "Intent, Questions, Research, Synthesis, Qualification, Proof, Iteration",
      deterministicMode: "A1 first, A3 bounded agents behind approval",
      confidence: "BMX evidence-backed",
    },
    kpis,
    doneCriteria,
    personaQuestions,
    capabilities: capabilityTruth,
    verificationCommands: [
      "npm run test",
      "npm run typecheck",
      "npm run build",
      "npm run desktop:build",
      "npm run verify:local",
      "./script/build_and_run.sh --verify",
    ],
  };
}
