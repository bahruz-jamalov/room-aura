import { describe, expect, it } from "vitest";
import { randomAccessCode, randomUrlToken, sha256Hex } from "./accessTokens";

describe("sha256Hex", () => {
  it("matches known SHA-256 test vectors", async () => {
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is deterministic for the same input", async () => {
    expect(await sha256Hex("room-aura")).toBe(await sha256Hex("room-aura"));
  });
});

describe("randomAccessCode", () => {
  it("defaults to 8 characters", () => {
    expect(randomAccessCode()).toHaveLength(8);
  });

  it("honors a custom length", () => {
    expect(randomAccessCode(12)).toHaveLength(12);
  });

  it("excludes visually ambiguous characters (0/O, 1/I)", () => {
    // Generate plenty of codes so an excluded character reliably would have
    // shown up if the exclusion were broken.
    const combined = Array.from({ length: 200 }, () => randomAccessCode(16)).join("");
    expect(combined).not.toMatch(/[01OI]/);
  });

  it("only uses uppercase alphanumerics", () => {
    expect(randomAccessCode(32)).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("randomUrlToken", () => {
  it("returns a 48-character lowercase hex string (24 random bytes)", () => {
    const token = randomUrlToken();
    expect(token).toHaveLength(48);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("is different on every call", () => {
    expect(randomUrlToken()).not.toBe(randomUrlToken());
  });
});
