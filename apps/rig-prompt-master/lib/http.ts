import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { makeId } from "./ids";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function jsonCreated<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(error: unknown): NextResponse {
  const requestId = makeId("req");
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "The request body did not match the RIG Prompt Master API contract.",
          details: { issues: error.issues },
          requestId,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected error",
        details: {},
        requestId,
      },
    },
    { status: 500 },
  );
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export function requireRigAuth(request: NextRequest): { actor: string; mode: "api-key" | "dev" } {
  const configuredKey = process.env.RIG_API_KEY?.trim();
  const providedKey = request.headers.get("x-rig-api-key")?.trim();
  if (configuredKey && providedKey === configuredKey) {
    return { actor: "api-key", mode: "api-key" };
  }

  const allowDev = process.env.RIG_DEV_ALLOW_ANON === "1" || process.env.NODE_ENV !== "production";
  if (allowDev) {
    return { actor: "local-dev", mode: "dev" };
  }

  throw new ApiError(401, "unauthorized", "RIG Prompt Master requires SSO or a scoped API key.");
}
