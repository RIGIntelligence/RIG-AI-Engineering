import type { NextRequest } from "next/server";
import { getHardeningModel } from "@/lib/hardening-model";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk(getHardeningModel());
  } catch (error) {
    return jsonError(error);
  }
}
