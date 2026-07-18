import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyHmacSha256Signature } from "./webhook-security.server";

const SECRET = "test-app-secret";

function signBody(body: string, secret: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyHmacSha256Signature", () => {
  it("accepts a correctly signed body", () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = signBody(body, SECRET);
    expect(verifyHmacSha256Signature(body, signature, SECRET)).toBe(true);
  });

  it("rejects a tampered body signed with the right secret", () => {
    const originalBody = JSON.stringify({ amount: 100 });
    const signature = signBody(originalBody, SECRET);
    const tamperedBody = JSON.stringify({ amount: 100000 });
    expect(verifyHmacSha256Signature(tamperedBody, signature, SECRET)).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = signBody(body, "wrong-secret");
    expect(verifyHmacSha256Signature(body, signature, SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(verifyHmacSha256Signature(body, null, SECRET)).toBe(false);
  });

  it("rejects an empty secret instead of throwing (misconfiguration should fail closed)", () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = signBody(body, SECRET);
    expect(verifyHmacSha256Signature(body, signature, "")).toBe(false);
  });

  it("does not throw on a garbage/short signature header (length mismatch path)", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(() => verifyHmacSha256Signature(body, "sha256=notreal", SECRET)).not.toThrow();
    expect(verifyHmacSha256Signature(body, "sha256=notreal", SECRET)).toBe(false);
  });

  it("rejects a signature missing the 'sha256=' prefix even if the hex matches", () => {
    const body = JSON.stringify({ hello: "world" });
    const fullSignature = signBody(body, SECRET);
    const hexOnly = fullSignature.replace("sha256=", "");
    expect(verifyHmacSha256Signature(body, hexOnly, SECRET)).toBe(false);
  });
});
