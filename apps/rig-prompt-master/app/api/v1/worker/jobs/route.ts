import type { NextRequest } from "next/server";
import { getWorkerJobs } from "@/lib/agent-runs";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk({ workerJobs: await getWorkerJobs() });
  } catch (error) {
    return jsonError(error);
  }
}
