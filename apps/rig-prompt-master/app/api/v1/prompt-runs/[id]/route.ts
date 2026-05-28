import type { NextRequest } from "next/server";
import { ApiError, jsonError, jsonOk, requireRigAuth } from "@/lib/http";
import { getPromptRun } from "@/lib/prompt-master";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireRigAuth(request);
    const { id } = await context.params;
    const run = await getPromptRun(id);
    if (!run) {
      throw new ApiError(404, "prompt_run_not_found", `Prompt run ${id} was not found.`);
    }
    return jsonOk(run);
  } catch (error) {
    return jsonError(error);
  }
}
