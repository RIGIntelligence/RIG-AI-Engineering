import type { NextRequest } from "next/server";
import { contextSyncSchema, syncContextSource } from "@/lib/context";
import { jsonCreated, jsonError, readJson, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireRigAuth(request);
    const { id } = await context.params;
    const body = contextSyncSchema.parse(await readJson(request));
    return jsonCreated(await syncContextSource(id, body));
  } catch (error) {
    return jsonError(error);
  }
}
