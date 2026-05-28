import type { NextRequest } from "next/server";
import { agentRunSchema, createAgentRun, getAgentRuns } from "@/lib/agent-runs";
import { jsonCreated, jsonError, jsonOk, readJson, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk({ agentRuns: await getAgentRuns() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRigAuth(request);
    const body = agentRunSchema.parse(await readJson(request));
    return jsonCreated(await createAgentRun(body));
  } catch (error) {
    return jsonError(error);
  }
}
