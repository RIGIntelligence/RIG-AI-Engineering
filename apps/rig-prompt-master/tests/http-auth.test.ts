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

    expect(requireRigAuth(requestWithKey("rig-test-key"))).toEqual({ actor: "api-key", mode: "api-key" });
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

    expect(requireRigAuth(requestWithKey())).toEqual({ actor: "local-dev", mode: "dev" });
  });
});
