import type { NextRequest } from "next/server";
import { getAudienceDoneModel } from "@/lib/audience-done-model";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk(getAudienceDoneModel());
  } catch (error) {
    return jsonError(error);
  }
}
