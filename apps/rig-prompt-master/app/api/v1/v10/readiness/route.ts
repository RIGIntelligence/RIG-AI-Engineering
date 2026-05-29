import type { NextRequest } from "next/server";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";
import { getV10Readiness } from "@/lib/v10-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk(getV10Readiness());
  } catch (error) {
    return jsonError(error);
  }
}
