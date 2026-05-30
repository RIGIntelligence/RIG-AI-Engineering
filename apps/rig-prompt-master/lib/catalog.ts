import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { CatalogGate, CatalogPersona, CatalogQuestion, CatalogResource, TargetSurface, V15Catalog } from "./types";
import { utcNow } from "./ids";

const catalogDirCandidates = [
  process.env.RIG_CATALOG_DIR,
  path.join(process.cwd(), "catalogs"),
  path.join(path.resolve(process.cwd(), "../.."), "catalogs"),
].filter(Boolean) as string[];

export const V15_GATES: CatalogGate[] = [
  { id: "00", description: "Source and license reviewed" },
  { id: "01", description: "Secret and private-data exposure blocked" },
  { id: "02", description: "Task envelope and acceptance checks written" },
  { id: "03", description: "A1 deterministic path attempted first" },
  { id: "04", description: "Sandbox or dry-run boundary selected" },
  { id: "05", description: "Tests, evals, or command checks defined" },
  { id: "06", description: "Observability and debug fields identified" },
  { id: "07", description: "Human approval boundary explicit" },
  { id: "08", description: "ProofPacket path selected" },
  { id: "09", description: "Rollback or undo path defined" },
  { id: "10", description: "Docs or operator notes updated" },
  { id: "11", description: "Agent bridge instructions updated when needed" },
  { id: "12", description: "Integration verified without hidden external side effects" },
];

let cachedCatalog: V15Catalog | undefined;

async function loadYaml<T>(fileName: string): Promise<T> {
  const errors: string[] = [];
  for (const catalogDir of catalogDirCandidates) {
    try {
      const raw = await readFile(path.join(catalogDir, fileName), "utf8");
      return YAML.parse(raw) as T;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Unable to load v15 catalog file ${fileName}: ${errors.join("; ")}`);
}

export async function getV15Catalog(): Promise<V15Catalog> {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const [resourcePayload, personaPayload, questionPayload] = await Promise.all([
    loadYaml<{ expected_resource_count?: number; resources?: CatalogResource[] }>("open-source-agent-harnesses.yaml"),
    loadYaml<{ agents?: CatalogPersona[] }>("rig-methodology-persona-agents.yaml"),
    loadYaml<{ questions?: CatalogQuestion[] }>("rig-methodology-question-bank.yaml"),
  ]);

  const resources = resourcePayload.resources ?? [];
  const personas = personaPayload.agents ?? [];
  const questions = questionPayload.questions ?? [];
  const expected = {
    resources: resourcePayload.expected_resource_count ?? 50,
    personas: 10,
    questions: 100,
  };
  const status =
    resources.length === expected.resources && personas.length === expected.personas && questions.length === expected.questions
      ? "PASS"
      : "FAIL";

  cachedCatalog = {
    status,
    generatedUtc: utcNow(),
    resources,
    personas,
    questions,
    gates: V15_GATES,
    counts: {
      resources: resources.length,
      personas: personas.length,
      questions: questions.length,
      gates: V15_GATES.length,
    },
    expected,
  };
  return cachedCatalog;
}

const surfacePersonas: Record<TargetSurface, string[]> = {
  "claude-design": ["sarah-drasner-method", "simon-willison-method", "kent-beck-method", "tanya-reilly-method"],
  "coding-agent": ["kent-beck-method", "martin-fowler-method", "charity-majors-method", "kelsey-hightower-method"],
  "browser-agent": ["simon-willison-method", "leslie-lamport-method", "charity-majors-method", "gene-kim-method"],
  "research-api": ["simon-willison-method", "charity-majors-method", "camille-fournier-method", "tanya-reilly-method"],
  "general-prompt": ["kent-beck-method", "simon-willison-method", "tanya-reilly-method", "camille-fournier-method"],
};

export async function selectV15Questions(surface: TargetSurface, coverage: "focused" | "full"): Promise<CatalogQuestion[]> {
  const catalog = await getV15Catalog();
  if (coverage === "full") {
    return catalog.questions;
  }
  return surfacePersonas[surface].flatMap((personaId) =>
    catalog.questions.filter((question) => question.persona_id === personaId).slice(0, 3),
  );
}

export async function selectRelevantResources(query: string, limit = 8): Promise<CatalogResource[]> {
  const catalog = await getV15Catalog();
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const scored = catalog.resources.map((resource) => {
    const blob = [
      resource.id,
      resource.name,
      resource.class,
      resource.role_in_rig,
      resource.first_experiment,
      ...(resource.load_when ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return {
      resource,
      score: tokens.reduce((total, token) => total + (blob.includes(token) ? 1 : 0), 0),
    };
  });
  return scored
    .sort((left, right) => right.score - left.score || left.resource.name.localeCompare(right.resource.name))
    .slice(0, limit)
    .map((item) => item.resource);
}
