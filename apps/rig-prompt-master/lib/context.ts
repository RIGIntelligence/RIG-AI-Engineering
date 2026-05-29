import { z } from "zod";
import { syncConnector } from "./connectors";
import { ApiError } from "./http";
import { hashText, makeId, shortHash, utcNow } from "./ids";
import { redactSecrets } from "./redaction";
import { getStoreSnapshot, mutateStore } from "./store";
import type { ContextChunk, ContextSource } from "./types";

export const contextSyncSchema = z.object({
  query: z.string().optional(),
  url: z.string().url().optional(),
  text: z.string().max(200_000).optional(),
  path: z.string().max(2_000).optional(),
});

function buildChunk(
  source: ContextSource,
  input: z.infer<typeof contextSyncSchema>,
  text: string,
  citation: string,
  metadata: Record<string, string>,
): ContextChunk {
  const redacted = redactSecrets(text);
  const hash = hashText(`${source.id}:${redacted}`);
  return {
    id: makeId("chk"),
    sourceId: source.id,
    title: `${source.name} context ${shortHash(hash)}`,
    content: redacted.slice(0, 8_000),
    hash,
    citation: citation || input.url || input.path || source.location,
    metadata: {
      sourceType: source.type,
      ...metadata,
      redacted: redacted === text ? "false" : "true",
    },
  };
}

export async function syncContextSource(sourceId: string, input: z.infer<typeof contextSyncSchema>): Promise<{
  source: ContextSource;
  chunks: ContextChunk[];
}> {
  const snapshot = await getStoreSnapshot();
  const source = snapshot.contextSources.find((item) => item.id === sourceId);
  if (!source) {
    throw new ApiError(404, "context_source_not_found", `Context source ${sourceId} was not found.`);
  }
  const sync = await syncConnector(source, input);
  return mutateStore((latest) => {
      const latestSource = latest.contextSources.find((item) => item.id === sourceId);
      if (!latestSource) {
        throw new ApiError(404, "context_source_not_found", `Context source ${sourceId} was not found.`);
      }
      latest.contextChunks = latest.contextChunks.filter((item) => item.sourceId !== latestSource.id);
      if (sync.status !== "synced") {
        latestSource.status = sync.status;
        latestSource.freshness = "blocked";
        latestSource.chunkCount = 0;
        latestSource.error = sync.error;
        latestSource.summary = sync.error || `${latestSource.name} needs configuration before context can be indexed.`;
        return { source: latestSource, chunks: [] };
      }

      const chunk = buildChunk(latestSource, input, sync.text, sync.citation, sync.metadata);
      latest.contextChunks.push(chunk);
      latestSource.status = "synced";
      latestSource.lastSyncedAt = utcNow();
      latestSource.freshness = "fresh";
      latestSource.chunkCount = 1;
      latestSource.error = undefined;
      latestSource.summary = `Synced ${latestSource.name} through the ${latestSource.type} adapter. Credential-shaped text was redacted before indexing.`;
      return { source: latestSource, chunks: [chunk] };
  });
}

export async function getContextForSources(sourceIds: string[]): Promise<ContextChunk[]> {
  const ids = new Set(sourceIds);
  const { contextChunks } = await import("./store").then((module) => module.getStoreSnapshot());
  return contextChunks.filter((chunk) => ids.has(chunk.sourceId));
}
