export type AudienceCategory =
  | "operator"
  | "design"
  | "engineering"
  | "qa"
  | "security"
  | "research"
  | "platform"
  | "executive"
  | "growth"
  | "client";

export interface AudiencePersona {
  id: string;
  name: string;
  role: string;
  category: AudienceCategory;
  primaryJob: string;
  wants: string[];
  doneLooksLike: string[];
  goodLooksLike: string[];
  productRequirements: string[];
  proofSignals: string[];
}

export interface AudienceDoneModel {
  product: "RIG Master Prompter";
  generatedFor: "operational product build";
  version: "v15.5";
  summary: string;
  personas: AudiencePersona[];
}

const personas: AudiencePersona[] = [
  {
    id: "founder-ceo",
    name: "Mike",
    role: "Founder / CEO",
    category: "executive",
    primaryJob: "Turn rough strategic intent into a usable prompt, plan, or agent task with evidence.",
    wants: ["One canonical app", "fast context recall", "clear proof", "no duplicate tools"],
    doneLooksLike: [
      "The Mac app opens the same full-stack control plane every time.",
      "A prompt can be pasted, improved, and recalled by API with proof.",
      "The app shows what is real, gated, or still pending without burying the answer.",
    ],
    goodLooksLike: [
      "Mike can move from idea to high-quality execution prompt in under five minutes.",
      "The app makes the next best action obvious without CLI instructions.",
      "ProofPackets make it easy to trust what changed and why.",
    ],
    productRequirements: ["desktop-launcher", "prompt-workbench", "proofpacket-api", "audience-done-model"],
    proofSignals: ["desktop bundle exists", "prompt run API returns 201", "ProofPacket is retrievable"],
  },
  {
    id: "prompt-operator",
    name: "Avery",
    role: "Prompt Operator",
    category: "operator",
    primaryJob: "Upload or paste messy prompts and produce polished target-specific prompts.",
    wants: ["prompt versions", "target modes", "enhancement packs", "copy-ready output"],
    doneLooksLike: [
      "The first screen has a visible prompt intake and Fix Prompt action.",
      "The fixed prompt appears with assumptions, acceptance checks, and proof requirements.",
      "The selected audience changes the output contract instead of being decorative.",
    ],
    goodLooksLike: [
      "The operator can compare prompt versions and know which one is ready.",
      "Mode-specific guidance appears for Claude Design, coding, browser, and research prompts.",
      "Missing context is called out instead of invented.",
    ],
    productRequirements: ["prompt-intake", "target-surface-routing", "audience-aware-contract"],
    proofSignals: ["fixedPrompt contains target surface", "DoneContract includes selected audience"],
  },
  {
    id: "claude-design-designer",
    name: "Clara",
    role: "Claude Design Designer",
    category: "design",
    primaryJob: "Generate better Claude Design prompts that produce usable app screens.",
    wants: ["design mode", "brand direction", "screen anatomy", "interaction states"],
    doneLooksLike: [
      "Claude Design mode is selectable from the cockpit.",
      "The prompt includes layout, typography, states, and source context.",
      "The output avoids generic marketing pages when the ask is an app.",
    ],
    goodLooksLike: [
      "The generated prompt names the exact product surface to design.",
      "Visual constraints are specific enough to reduce design drift.",
      "Acceptance checks include responsive and state coverage.",
    ],
    productRequirements: ["claude-design-mode", "brand-instructions", "state-inventory"],
    proofSignals: ["targetSurface equals claude-design", "fixedPrompt includes design output contract"],
  },
  {
    id: "senior-full-stack-engineer",
    name: "Sam",
    role: "Senior Full-Stack Engineer",
    category: "engineering",
    primaryJob: "Turn prompts into bounded implementation tasks with APIs, state, and rollback.",
    wants: ["contracts", "API shape", "approval gates", "rollback notes"],
    doneLooksLike: [
      "Coding-agent mode produces a DoneContract before implementation.",
      "Repo writes are gated by approval and audit evidence.",
      "API routes return structured errors and proof identifiers.",
    ],
    goodLooksLike: [
      "The app separates deterministic work from agent-bounded work.",
      "The contract is small enough to execute but explicit enough to verify.",
      "A senior reviewer can see blast radius and rollback without asking follow-up questions.",
    ],
    productRequirements: ["done-contract", "agent-state-machine", "structured-api-errors"],
    proofSignals: ["approval route blocks duplicate decisions", "agent run states are persisted"],
  },
  {
    id: "qa-engineer",
    name: "Quinn",
    role: "QA Engineer",
    category: "qa",
    primaryJob: "Verify the user workflow, safety gates, and regression surface.",
    wants: ["testable states", "clear expected results", "negative paths", "screenshots"],
    doneLooksLike: [
      "The product has unit and API tests for core flows.",
      "The UI shows empty, success, approval, and proof states.",
      "The Mac app can be launched and checked against the local backend.",
    ],
    goodLooksLike: [
      "QA can reproduce a prompt run without reading source code.",
      "Failure states explain recovery instead of dead-ending.",
      "Screenshots prove desktop and mobile layouts are readable.",
    ],
    productRequirements: ["test-suite", "stateful-ui", "desktop-smoke-path"],
    proofSignals: ["npm run test passes", "Playwright smoke screenshots saved"],
  },
  {
    id: "security-reviewer",
    name: "Sofia",
    role: "Security / Privacy Reviewer",
    category: "security",
    primaryJob: "Stop secrets, private context, and unsafe actions from leaking or executing.",
    wants: ["redaction", "scoped approvals", "audit trail", "no silent external sends"],
    doneLooksLike: [
      "Secret-like text is redacted before storage and output.",
      "External sends, browser submits, repo writes, exports, and destructive actions require approval.",
      "ProofPackets record approval decisions and evidence.",
    ],
    goodLooksLike: [
      "The product defaults to read-only context ingestion.",
      "Every unsafe action has a human-readable reason before approval.",
      "API auth behavior is tested for dev and production modes.",
    ],
    productRequirements: ["redaction", "approval-rail", "audit-log", "api-auth"],
    proofSignals: ["redaction tests pass", "approval safety tests pass"],
  },
  {
    id: "research-analyst",
    name: "Reese",
    role: "Research Analyst",
    category: "research",
    primaryJob: "Ground prompts in cited sources from repos, uploads, web pages, and memory.",
    wants: ["citations", "source freshness", "context selection", "web scrape boundaries"],
    doneLooksLike: [
      "Context source cards are visible and selectable.",
      "Synced uploads become citations in prompt runs.",
      "The fixed prompt says when source context is unavailable.",
    ],
    goodLooksLike: [
      "Every claim can be traced to a source chunk or marked unknown.",
      "Freshness and permissions are visible before use.",
      "Context sources can be synced independently.",
    ],
    productRequirements: ["context-sources", "citations", "freshness", "source-permission-display"],
    proofSignals: ["context sync route returns chunks", "prompt run includes citation ids"],
  },
  {
    id: "platform-admin",
    name: "Parker",
    role: "Platform Admin",
    category: "platform",
    primaryJob: "Connect GitHub, Gitea, QNAP, Recall.it, local repos, uploads, and approved web context.",
    wants: ["connector status", "local bridge", "configuration visibility", "API recall"],
    doneLooksLike: [
      "Connector cards show ready, needs config, synced, or failed.",
      "QNAP and Recall.it appear as first-class context sources.",
      "The desktop app starts or connects to the local full-stack backend.",
    ],
    goodLooksLike: [
      "A missing connector explains the exact environment variable or bridge state.",
      "Local/private context stays local unless safe summaries are synced.",
      "API endpoints are documented and smoke-tested.",
    ],
    productRequirements: ["connector-status", "local-bridge-cache", "health-api", "desktop-launcher"],
    proofSignals: ["health API returns ok", "context source API lists QNAP and Recall.it"],
  },
  {
    id: "growth-lead",
    name: "Gia",
    role: "Growth / Marketing Lead",
    category: "growth",
    primaryJob: "Create high-context prompts for messaging, campaigns, landing pages, and client assets.",
    wants: ["brand consistency", "persona targeting", "approval-safe outputs", "reuse"],
    doneLooksLike: [
      "General prompt and research modes support non-code work.",
      "The selected audience makes outputs sharper for a business use case.",
      "ProofPacket evidence can be shared without exposing private context.",
    ],
    goodLooksLike: [
      "The prompt improves positioning without drifting from RIG voice.",
      "Context citations prevent vague or generic marketing language.",
      "Reusable prompt versions speed up future campaign work.",
    ],
    productRequirements: ["general-prompt-mode", "audience-targeting", "proof-sanitization"],
    proofSignals: ["targetSurface can be general-prompt", "fixedPrompt includes audience requirements"],
  },
  {
    id: "client-stakeholder",
    name: "Casey",
    role: "Client / External Stakeholder",
    category: "client",
    primaryJob: "Understand what RIG changed, what evidence supports it, and what decision is needed.",
    wants: ["plain-English summary", "decision points", "confidence", "next action"],
    doneLooksLike: [
      "The proof drawer shows status, hash, and ProofPacket ID.",
      "The output explains approvals and constraints in non-technical language.",
      "The API can recall the evidence bundle later.",
    ],
    goodLooksLike: [
      "A client can trust the result without seeing private implementation detail.",
      "The next decision is visible and bounded.",
      "Evidence is concise, durable, and shareable.",
    ],
    productRequirements: ["proof-drawer", "plain-language-contract", "api-recall"],
    proofSignals: ["ProofPacket endpoint returns ready status", "UI displays proof ID"],
  },
];

export function getAudienceDoneModel(): AudienceDoneModel {
  return {
    product: "RIG Master Prompter",
    generatedFor: "operational product build",
    version: "v15.5",
    summary:
      "Ten product audiences define what done and good mean for the operational RIG Master Prompter app.",
    personas,
  };
}

export function getAudiencePersona(id: string): AudiencePersona | undefined {
  return personas.find((persona) => persona.id === id);
}
