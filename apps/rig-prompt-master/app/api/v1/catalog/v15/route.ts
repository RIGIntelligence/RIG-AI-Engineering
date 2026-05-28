import type { NextRequest } from "next/server";
import { getV15Catalog } from "@/lib/catalog";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk(await getV15Catalog());
  } catch (error) {
    return jsonError(error);
  }
}
