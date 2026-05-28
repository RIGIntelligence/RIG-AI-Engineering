import type { NextRequest } from "next/server";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";
import { getStoreSnapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    const data = await getStoreSnapshot();
    return jsonOk({ approvals: data.approvals });
  } catch (error) {
    return jsonError(error);
  }
}
