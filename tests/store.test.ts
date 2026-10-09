import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/lib/business";
import { validateBusinessData } from "@/lib/store";

describe("validateBusinessData", () => {
  it("accepts the seed data", () => {
    expect(validateBusinessData(DEFAULT_BUSINESS)).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(validateBusinessData(null)).toMatch(/JSON object/);
    expect(validateBusinessData("hi")).toMatch(/JSON object/);
  });

  it("requires a name", () => {
    expect(validateBusinessData({ ...DEFAULT_BUSINESS, name: "" })).toMatch(/name/);
  });

  it("requires numeric capacity and availability", () => {
    const bad = {
      ...DEFAULT_BUSINESS,
      resources: [{ id: "x", label: "X", capacity: "10", available: 5 }],
    };
    expect(validateBusinessData(bad)).toMatch(/numeric/);
  });
});
