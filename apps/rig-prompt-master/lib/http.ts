import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
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
          message: "The request body did not match the RIG Master Prompter API contract.",
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

type ApiKeyRecord = {
  key?: string;
  keyHash?: string;
  label?: string;
  scopes?: string[];
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function bearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization")?.trim() || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function configuredApiKeys(): ApiKeyRecord[] {
  const keys: ApiKeyRecord[] = [];
  const singleKey = process.env.RIG_API_KEY?.trim();
  if (singleKey) {
    keys.push({ key: singleKey, label: "api-key", scopes: ["*"] });
  }

  const rawJson = process.env.RIG_API_KEYS_JSON?.trim();
  if (!rawJson) {
    return keys;
  }

  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object") {
          const record = item as ApiKeyRecord;
          if (record.key || record.keyHash) {
            keys.push({
              key: record.key,
              keyHash: record.keyHash,
              label: record.label || "scoped-api-key",
              scopes: Array.isArray(record.scopes) ? record.scopes : ["*"],
            });
          }
        }
      }
    }
  } catch {
    throw new ApiError(500, "api_key_config_invalid", "RIG_API_KEYS_JSON must be valid JSON.");
  }
  return keys;
}

function matchesApiKey(record: ApiKeyRecord, providedKey: string): boolean {
  if (!providedKey) {
    return false;
  }
  return record.key === providedKey || record.keyHash === sha256(providedKey);
}

export function requireRigAuth(request: NextRequest): { actor: string; mode: "api-key" | "dev"; scopes: string[] } {
  const providedKey = request.headers.get("x-rig-api-key")?.trim() || bearerToken(request);
  const matchedKey = configuredApiKeys().find((record) => matchesApiKey(record, providedKey));
  if (matchedKey) {
    return { actor: matchedKey.label || "api-key", mode: "api-key", scopes: matchedKey.scopes || ["*"] };
  }

  const allowDev = process.env.RIG_DEV_ALLOW_ANON === "1" || process.env.NODE_ENV !== "production";
  if (allowDev) {
    return { actor: "local-dev", mode: "dev", scopes: ["dev:*"] };
  }

  throw new ApiError(401, "unauthorized", "RIG Master Prompter requires SSO or a scoped API key.");
}
