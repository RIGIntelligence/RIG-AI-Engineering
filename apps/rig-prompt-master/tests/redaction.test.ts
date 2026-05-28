import { describe, expect, it } from "vitest";
import { hasCredentialShape, redactSecrets } from "../lib/redaction";

describe("redactSecrets", () => {
  it("redacts token, password, email, and bearer shapes", () => {
    const input = "email mike@example.com token=ghp_1234567890abcdefghijklmnop Bearer abcdefghijklmnopqrstuvwxyz password=hunter2";
    const redacted = redactSecrets(input);
    expect(redacted).not.toContain("mike@example.com");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).toContain("[REDACTED_EMAIL]");
    expect(redacted).toContain("[REDACTED_SECRET]");
    expect(hasCredentialShape(input)).toBe(true);
  });
});
