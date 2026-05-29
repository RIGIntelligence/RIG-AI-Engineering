import type { NextRequest } from "next/server";
import { getConnectorStatuses } from "@/lib/connectors";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireRigAuth(request);
    return jsonOk({ connectors: await getConnectorStatuses() });
  } catch (error) {
    return jsonError(error);
  }
}
