import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdmin, isVapi, safeEqual } from "@/lib/auth";

afterEach(() => vi.unstubAllEnvs());

describe("safeEqual", () => {
  it("matches identical strings", () => expect(safeEqual("abc", "abc")).toBe(true));
  it("rejects different strings of equal length", () => expect(safeEqual("abc", "abd")).toBe(false));
  it("rejects different lengths", () => expect(safeEqual("abc", "abcd")).toBe(false));
  it("rejects null/undefined", () => {
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("abc", undefined)).toBe(false);
  });
});

describe("isAdmin", () => {
  it("fails closed when ADMIN_TOKEN is unset", () => {
    vi.stubEnv("ADMIN_TOKEN", "");
    expect(isAdmin("Bearer ")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("accepts the correct bearer token only", () => {
    vi.stubEnv("ADMIN_TOKEN", "s3cret");
    expect(isAdmin("Bearer s3cret")).toBe(true);
    expect(isAdmin("Bearer wrong!")).toBe(false);
    expect(isAdmin("s3cret")).toBe(false);
  });
});

describe("isVapi", () => {
  it("fails closed when VAPI_WEBHOOK_SECRET is unset", () => {
    vi.stubEnv("VAPI_WEBHOOK_SECRET", "");
    expect(isVapi(null)).toBe(false);
    expect(isVapi("")).toBe(false);
  });

  it("accepts the shared secret only", () => {
    vi.stubEnv("VAPI_WEBHOOK_SECRET", "hook-secret");
    expect(isVapi("hook-secret")).toBe(true);
    expect(isVapi("hook-secreT")).toBe(false);
  });
});
