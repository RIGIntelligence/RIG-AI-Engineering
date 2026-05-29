import type { NextRequest } from "next/server";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";
import { getV25Audit } from "@/lib/v25-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk(getV25Audit());
  } catch (error) {
    return jsonError(error);
  }
}
