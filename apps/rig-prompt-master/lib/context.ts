import { execFileSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { ApiError } from "./http";
import { hashText, makeId, shortHash, utcNow } from "./ids";
import { redactSecrets } from "./redaction";
import { mutateStore } from "./store";
import type { ContextChunk, ContextSource } from "./types";

const repoRoot = path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");

export const contextSyncSchema = z.object({
  query: z.string().optional(),
  url: z.string().url().optional(),
  text: z.string().max(200_000).optional(),
  path: z.string().max(2_000).optional(),
});

function gitValue(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", timeout: 2_000 }).trim();
  } catch {
    return "unavailable";
  }
}

function sourceText(source: ContextSource, input: z.infer<typeof contextSyncSchema>): string {
  const provided = input.text?.trim();
  if (provided) {
    return provided;
  }

  if (source.type === "github" || source.type === "repo-folder") {
    return [
      `Repo root: ${repoRoot}`,
      `Current branch: ${gitValue(["branch", "--show-current"])}`,
      `Remote: ${gitValue(["remote", "get-url", "origin"])}`,
      `Query: ${input.query || "RIG Master Prompter context"}`,
    ].join("\n");
  }

  if (source.type === "gitea") {
    return `Gitea context endpoint: ${process.env.RIG_GITEA_URL || "not configured"}. Query: ${input.query || "none"}.`;
  }

  if (source.type === "qnap") {
    return `QNAP LAN path: ${process.env.RIG_QNAP_MOUNT || "not configured"}. Query: ${input.query || "none"}.`;
  }

  if (source.type === "recall") {
    return `Recall.it adapter: ${process.env.RIG_RECALL_API_URL || "not configured"}. Query: ${input.query || "none"}.`;
  }

  if (source.type === "web") {
    return `Approved scrape target: ${input.url || "not provided"}. Query: ${input.query || "none"}.`;
  }

  return `Uploaded or pasted context. Query: ${input.query || "none"}.`;
}

function buildChunk(source: ContextSource, input: z.infer<typeof contextSyncSchema>): ContextChunk {
  const redacted = redactSecrets(sourceText(source, input));
  const hash = hashText(`${source.id}:${redacted}`);
  return {
    id: makeId("chk"),
    sourceId: source.id,
    title: `${source.name} context ${shortHash(hash)}`,
    content: redacted.slice(0, 8_000),
    hash,
    citation: input.url || input.path || source.location,
    metadata: {
      sourceType: source.type,
      redacted: redacted === sourceText(source, input) ? "false" : "true",
    },
  };
}

export async function syncContextSource(sourceId: string, input: z.infer<typeof contextSyncSchema>): Promise<{
  source: ContextSource;
  chunks: ContextChunk[];
}> {
  return mutateStore((data) => {
    const source = data.contextSources.find((item) => item.id === sourceId);
    if (!source) {
      throw new ApiError(404, "context_source_not_found", `Context source ${sourceId} was not found.`);
    }

    const chunk = buildChunk(source, input);
    data.contextChunks = data.contextChunks.filter((item) => item.sourceId !== source.id);
    data.contextChunks.push(chunk);
    source.status = "synced";
    source.lastSyncedAt = utcNow();
    source.freshness = "fresh";
    source.chunkCount = 1;
    source.error = undefined;
    source.summary = `Synced ${source.name} as read-only context. Credential-shaped text was redacted before indexing.`;
    return { source, chunks: [chunk] };
  });
}

export async function getContextForSources(sourceIds: string[]): Promise<ContextChunk[]> {
  const ids = new Set(sourceIds);
  const { contextChunks } = await import("./store").then((module) => module.getStoreSnapshot());
  return contextChunks.filter((chunk) => ids.has(chunk.sourceId));
}
