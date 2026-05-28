import type { NextRequest } from "next/server";
import { jsonCreated, jsonError, readJson, requireRigAuth } from "@/lib/http";
import { createPromptRun, promptRunSchema } from "@/lib/prompt-master";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireRigAuth(request);
    const body = promptRunSchema.parse(await readJson(request));
    return jsonCreated(await createPromptRun(body));
  } catch (error) {
    return jsonError(error);
  }
}
