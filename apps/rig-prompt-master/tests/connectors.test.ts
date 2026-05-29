import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConnectorStatuses } from "../lib/connectors";
import { syncContextSource } from "../lib/context";
import { resetStoreForTests } from "../lib/store";

describe("connector adapters", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rig-connectors-"));
    process.env.RIG_PROMPT_MASTER_STORE = path.join(tempDir, "store.json");
    await resetStoreForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("syncs QNAP context from a configured local mount", async () => {
    const qnapMount = path.join(tempDir, "qnap");
    await mkdir(qnapMount);
    await writeFile(path.join(qnapMount, "brief.md"), "QNAP context: price page needs private deployment proof.");
    vi.stubEnv("RIG_QNAP_MOUNT", qnapMount);

    const result = await syncContextSource("ctx_qnap", { query: "pricing page" });

    expect(result.source.status).toBe("synced");
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.content).toContain("private deployment proof");
    expect(result.chunks[0]?.citation).toBe(qnapMount);
  });

  it("marks Recall.it as needs_config when the endpoint is missing", async () => {
    vi.stubEnv("RIG_RECALL_API_URL", "");

    const result = await syncContextSource("ctx_recall", { query: "rig memory" });

    expect(result.source.status).toBe("needs_config");
    expect(result.source.freshness).toBe("blocked");
    expect(result.chunks).toHaveLength(0);
    expect(result.source.error).toContain("Recall.it needs RIG_RECALL_API_URL");
  });

  it("reports connector configuration without exposing secrets", async () => {
    vi.stubEnv("RIG_GITEA_URL", "https://gitea.example.test");
    vi.stubEnv("RIG_GITEA_TOKEN", "do-not-print");

    const statuses = await getConnectorStatuses();
    const uploads = statuses.find((connector) => connector.id === "ctx_uploads");
    const gitea = statuses.find((connector) => connector.id === "ctx_gitea");

    expect(uploads?.status).toBe("local_ready");
    expect(gitea?.status).toBe("configured");
    expect(JSON.stringify(statuses)).not.toContain("do-not-print");
  });
});
