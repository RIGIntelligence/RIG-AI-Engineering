import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./http";
import { utcNow } from "./ids";
import type { ConnectorStatus, ContextSource, ContextSourceType } from "./types";

const repoRoot = path.resolve(process.cwd());
const MAX_LOCAL_FILES = 8;
const MAX_FILE_BYTES = 80_000;

interface SyncInput {
  query?: string;
  url?: string;
  text?: string;
  path?: string;
}

interface ConnectorSyncResult {
  status: ContextSource["status"];
  text: string;
  citation: string;
  metadata: Record<string, string>;
  error?: string;
}

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".py",
  ".sql",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function gitValue(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", timeout: 2_000 }).trim();
  } catch {
    return "";
  }
}

function gitRemoteRepo(): string {
  const remote = gitValue(["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match?.[1] || "";
}

async function existsDirectory(location: string): Promise<boolean> {
  try {
    return (await stat(location)).isDirectory();
  } catch {
    return false;
  }
}

async function walkTextFiles(root: string, files: string[] = []): Promise<string[]> {
  if (files.length >= MAX_LOCAL_FILES) {
    return files;
  }

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= MAX_LOCAL_FILES || entry.name === ".git" || entry.name === "node_modules" || entry.name === ".next") {
      continue;
    }

    const location = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await walkTextFiles(location, files);
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(location);
    }
  }
  return files;
}

async function readLocalTextFiles(root: string, query = ""): Promise<string> {
  const safeRoot = path.resolve(root);
  const files = await walkTextFiles(safeRoot);

  const sections: string[] = [];
  for (const file of files) {
    const info = await stat(file);
    if (info.size > MAX_FILE_BYTES) {
      continue;
    }
    const content = await readFile(file, "utf8");
    sections.push(`FILE ${path.relative(safeRoot, file)}\n${content.slice(0, 6_000)}`);
  }

  return [
    `Local folder: ${safeRoot}`,
    `Query: ${query || "RIG context sync"}`,
    `Files indexed: ${sections.length}`,
    sections.join("\n\n---\n\n"),
  ].join("\n");
}

async function fetchJsonOrText(url: string, headers: HeadersInit = {}): Promise<string> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, "connector_fetch_failed", `Connector fetch failed for ${url}.`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json(), null, 2);
  }
  return response.text();
}

function requiredConfigStatus(
  source: ContextSource,
  status: ConnectorStatus["status"],
  error: string,
): ConnectorSyncResult {
  return {
    status: "needs_config",
    text: "",
    citation: source.location,
    metadata: { sourceType: source.type, blocked: status, blockedReason: error },
    error,
  };
}

export async function getConnectorStatuses(): Promise<ConnectorStatus[]> {
  const githubRepo = env("RIG_GITHUB_REPOS") || gitRemoteRepo();
  const qnapMount = env("RIG_QNAP_MOUNT");
  const qnapReady = qnapMount ? await existsDirectory(qnapMount) : false;
  const now = utcNow();
  return [
    {
      id: "ctx_github",
      name: "GitHub",
      type: "github",
      status: githubRepo ? "configured" : "needs_secret",
      configured: Boolean(githubRepo),
      safeDefault: "approval-required",
      requiredEnv: ["RIG_GITHUB_REPOS or git remote", "GITHUB_TOKEN optional for private repos"],
      location: githubRepo || "Set RIG_GITHUB_REPOS or run inside a GitHub-backed repo",
      summary: "Indexes repository metadata through git or GitHub API when token/repo env is present.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_gitea",
      name: "Gitea",
      type: "gitea",
      status: env("RIG_GITEA_URL") ? "configured" : "needs_secret",
      configured: Boolean(env("RIG_GITEA_URL")),
      safeDefault: "approval-required",
      requiredEnv: ["RIG_GITEA_URL", "RIG_GITEA_TOKEN optional for private repos"],
      location: env("RIG_GITEA_URL") || "Set RIG_GITEA_URL",
      summary: "Uses the Gitea REST API for repo search/read context. Writes remain approval-gated.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_qnap",
      name: "QNAP",
      type: "qnap",
      status: qnapReady ? "local_ready" : "needs_path",
      configured: qnapReady,
      safeDefault: "read-only",
      requiredEnv: ["RIG_QNAP_MOUNT"],
      location: qnapMount || "Set RIG_QNAP_MOUNT to a mounted LAN path",
      summary: "Reads local mounted QNAP text files through the local bridge path.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_recall",
      name: "Recall.it",
      type: "recall",
      status: env("RIG_RECALL_API_URL") ? "configured" : "needs_secret",
      configured: Boolean(env("RIG_RECALL_API_URL")),
      safeDefault: "read-only",
      requiredEnv: ["RIG_RECALL_API_URL", "RIG_RECALL_API_KEY optional if the endpoint requires auth"],
      location: env("RIG_RECALL_API_URL") || "Set RIG_RECALL_API_URL",
      summary: "Calls Recall.it search/read endpoint and stores safe redacted summaries with citations.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_uploads",
      name: "Uploads",
      type: "upload",
      status: "local_ready",
      configured: true,
      safeDefault: "read-only",
      requiredEnv: [],
      location: "Prompt upload or pasted text",
      summary: "Indexes user-provided prompt/file text after redaction.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_web",
      name: "Web Scrape",
      type: "web",
      status: "local_ready",
      configured: true,
      safeDefault: "approval-required",
      requiredEnv: [],
      location: "Approved URL in sync payload",
      summary: "Fetches approved public URLs only; account actions and submissions remain gated.",
      lastCheckedAt: now,
    },
    {
      id: "ctx_repo_folder",
      name: "Local Repo Folder",
      type: "repo-folder",
      status: "local_ready",
      configured: true,
      safeDefault: "read-only",
      requiredEnv: [],
      location: repoRoot,
      summary: "Indexes the current local repository folder in read-only mode.",
      lastCheckedAt: now,
    },
  ];
}

export async function syncConnector(source: ContextSource, input: SyncInput): Promise<ConnectorSyncResult> {
  const provided = input.text?.trim();
  if (provided) {
    return {
      status: "synced",
      text: provided,
      citation: input.url || input.path || source.location,
      metadata: { sourceType: source.type, ingestion: "provided_text" },
    };
  }

  if (source.type === "github") {
    const repo = env("RIG_GITHUB_REPOS") || gitRemoteRepo();
    if (!repo) {
      return requiredConfigStatus(source, "needs_secret", "GitHub needs RIG_GITHUB_REPOS, a GitHub remote, or GITHUB_TOKEN for private repo reads.");
    }
    const token = env("GITHUB_TOKEN") || env("RIG_GITHUB_TOKEN");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } : {};
    const apiText = token
      ? await fetchJsonOrText(`https://api.github.com/repos/${repo}`, headers)
      : "";
    return {
      status: "synced",
      text: [
        `GitHub repo: ${repo}`,
        `Current branch: ${gitValue(["branch", "--show-current"]) || "unavailable"}`,
        `Remote: ${gitValue(["remote", "get-url", "origin"]) || "unavailable"}`,
        `Query: ${input.query || "RIG GitHub context"}`,
        apiText,
      ].join("\n"),
      citation: `https://github.com/${repo}`,
      metadata: { sourceType: "github", repo, api: token ? "github_rest" : "git_remote" },
    };
  }

  if (source.type === "gitea") {
    const baseUrl = env("RIG_GITEA_URL");
    if (!baseUrl) {
      return requiredConfigStatus(source, "needs_secret", "Gitea needs RIG_GITEA_URL and optionally RIG_GITEA_TOKEN.");
    }
    const token = env("RIG_GITEA_TOKEN");
    const url = new URL("/api/v1/repos/search", baseUrl);
    url.searchParams.set("q", input.query || "rig");
    const text = await fetchJsonOrText(url.toString(), token ? { Authorization: `token ${token}` } : {});
    return { status: "synced", text, citation: url.toString(), metadata: { sourceType: "gitea", api: "gitea_rest" } };
  }

  if (source.type === "qnap") {
    const mount = env("RIG_QNAP_MOUNT");
    if (!mount || !(await existsDirectory(mount))) {
      return requiredConfigStatus(source, "needs_path", "QNAP needs RIG_QNAP_MOUNT pointed at a mounted LAN directory.");
    }
    const requestedPath = path.resolve(input.path || mount);
    const safeMount = path.resolve(mount);
    if (!requestedPath.startsWith(safeMount)) {
      return requiredConfigStatus(source, "unavailable", "QNAP sync path must stay inside RIG_QNAP_MOUNT.");
    }
    return {
      status: "synced",
      text: await readLocalTextFiles(requestedPath, input.query),
      citation: requestedPath,
      metadata: { sourceType: "qnap", ingestion: "local_files" },
    };
  }

  if (source.type === "recall") {
    const baseUrl = env("RIG_RECALL_API_URL");
    if (!baseUrl) {
      return requiredConfigStatus(source, "needs_secret", "Recall.it needs RIG_RECALL_API_URL and optionally RIG_RECALL_API_KEY.");
    }
    const url = new URL(baseUrl);
    url.searchParams.set("q", input.query || "rig");
    const key = env("RIG_RECALL_API_KEY");
    const text = await fetchJsonOrText(url.toString(), key ? { Authorization: `Bearer ${key}` } : {});
    return { status: "synced", text, citation: url.toString(), metadata: { sourceType: "recall", api: "recall_search" } };
  }

  if (source.type === "web") {
    if (!input.url) {
      return requiredConfigStatus(source, "unavailable", "Web scrape sync needs an approved URL in the request body.");
    }
    return {
      status: "synced",
      text: await fetchJsonOrText(input.url),
      citation: input.url,
      metadata: { sourceType: "web", ingestion: "approved_fetch" },
    };
  }

  if (source.type === "repo-folder") {
    const requestedPath = path.resolve(input.path || repoRoot);
    if (!requestedPath.startsWith(repoRoot)) {
      return requiredConfigStatus(source, "unavailable", "Local repo sync path must stay inside the RIG repository root.");
    }
    return {
      status: "synced",
      text: await readLocalTextFiles(requestedPath, input.query),
      citation: requestedPath,
      metadata: { sourceType: "repo-folder", ingestion: "local_files" },
    };
  }

  return requiredConfigStatus(source, "unavailable", `No connector adapter exists for ${source.type as ContextSourceType}.`);
}
