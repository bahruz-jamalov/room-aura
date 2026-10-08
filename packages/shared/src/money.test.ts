import { describe, expect, it } from "vitest";
import { formatMoney, fromMinorUnits, toMinorUnits } from "./money";

describe("toMinorUnits / fromMinorUnits", () => {
  it("round-trips a typical price", () => {
    expect(toMinorUnits(12.5)).toBe(1250);
    expect(fromMinorUnits(1250)).toBe(12.5);
  });

  it("rounds to the nearest minor unit instead of truncating", () => {
    // Floating point: 0.1 + 0.2 style drift must not leak into the stored integer.
    expect(toMinorUnits(19.999)).toBe(2000);
    expect(toMinorUnits(19.991)).toBe(1999);
  });

  it("handles zero", () => {
    expect(toMinorUnits(0)).toBe(0);
    expect(fromMinorUnits(0)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats minor units as a localized currency string", () => {
    expect(formatMoney(1250, "USD", "en")).toBe("$12.50");
  });

  it("defaults to the en locale", () => {
    expect(formatMoney(500, "USD")).toBe("$5.00");
  });
});
