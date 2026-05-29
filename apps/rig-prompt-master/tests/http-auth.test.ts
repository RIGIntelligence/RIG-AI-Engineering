import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireRigAuth } from "../lib/http";

function requestWithKey(key?: string) {
  return {
    headers: new Headers(key ? { "x-rig-api-key": key } : {}),
  } as Parameters<typeof requireRigAuth>[0];
}

describe("RIG API auth guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the configured API key", () => {
    vi.stubEnv("RIG_API_KEY", "rig-test-key");
    vi.stubEnv("RIG_DEV_ALLOW_ANON", "0");
    vi.stubEnv("NODE_ENV", "production");

    expect(requireRigAuth(requestWithKey("rig-test-key"))).toEqual({ actor: "api-key", mode: "api-key", scopes: ["*"] });
  });

  it("accepts bearer tokens from scoped API key records", () => {
    vi.stubEnv("RIG_API_KEY", "");
    vi.stubEnv("RIG_API_KEYS_JSON", JSON.stringify([{ label: "qa-key", key: "rig-scoped-key", scopes: ["proof:read"] }]));
    vi.stubEnv("RIG_DEV_ALLOW_ANON", "0");
    vi.stubEnv("NODE_ENV", "production");

    const request = { headers: new Headers({ authorization: "Bearer rig-scoped-key" }) } as Parameters<typeof requireRigAuth>[0];
    expect(requireRigAuth(request)).toEqual({ actor: "qa-key", mode: "api-key", scopes: ["proof:read"] });
  });

  it("accepts sha256 hashed API key records", () => {
    vi.stubEnv("RIG_API_KEY", "");
    vi.stubEnv(
      "RIG_API_KEYS_JSON",
      JSON.stringify([{ label: "hashed-key", keyHash: createHash("sha256").update("rig-hashed-key").digest("hex") }]),
    );
    vi.stubEnv("RIG_DEV_ALLOW_ANON", "0");
    vi.stubEnv("NODE_ENV", "production");

    expect(requireRigAuth(requestWithKey("rig-hashed-key"))).toMatchObject({ actor: "hashed-key", mode: "api-key" });
  });

  it("rejects anonymous production calls when no valid key is present", () => {
    vi.stubEnv("RIG_API_KEY", "rig-test-key");
    vi.stubEnv("RIG_DEV_ALLOW_ANON", "0");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => requireRigAuth(requestWithKey("wrong-key"))).toThrow("requires SSO or a scoped API key");
  });

  it("allows explicit local development anonymous mode", () => {
    vi.stubEnv("RIG_API_KEY", "");
    vi.stubEnv("RIG_DEV_ALLOW_ANON", "1");
    vi.stubEnv("NODE_ENV", "production");

    expect(requireRigAuth(requestWithKey())).toEqual({ actor: "local-dev", mode: "dev", scopes: ["dev:*"] });
  });
});
