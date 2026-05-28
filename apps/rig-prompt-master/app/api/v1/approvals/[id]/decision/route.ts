import type { NextRequest } from "next/server";
import { approvalDecisionSchema, decideApproval } from "@/lib/agent-runs";
import { jsonError, jsonOk, readJson, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireRigAuth(request);
    const { id } = await context.params;
    const body = approvalDecisionSchema.parse(await readJson(request));
    return jsonOk(await decideApproval(id, body.decision, body.note));
  } catch (error) {
    return jsonError(error);
  }
}
