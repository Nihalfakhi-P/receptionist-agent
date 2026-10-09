import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/lib/business";
import { runToolCalls } from "@/lib/tools";

describe("runToolCalls", () => {
  it("reports one resource by id", () => {
    const [r] = runToolCalls(
      [{ id: "t1", name: "check_availability", arguments: { resourceId: "study-cabin" } }],
      DEFAULT_BUSINESS
    );
    expect(r.toolCallId).toBe("t1");
    expect(r.result).toContain("private study cabins: 12 of 12 available");
    expect(r.result).not.toContain("reading room");
  });

  it("reports all resources when no id is given", () => {
    const [r] = runToolCalls([{ id: "t2", name: "check_availability" }], DEFAULT_BUSINESS);
    expect(r.result).toContain("reading room seats");
    expect(r.result).toContain("private study cabins");
  });

  it("accepts the OpenAI shape with JSON-string arguments", () => {
    const [r] = runToolCalls(
      [{ id: "t3", function: { name: "check_availability", arguments: '{"resourceId":"reading-room"}' } }],
      DEFAULT_BUSINESS
    );
    expect(r.result).toContain("reading room seats: 60 of 60");
  });

  it("tolerates malformed JSON arguments", () => {
    const [r] = runToolCalls(
      [{ id: "t4", name: "check_availability", arguments: "{not json" }],
      DEFAULT_BUSINESS
    );
    expect(r.result).toContain("reading room seats");
  });

  it("lists valid ids for an unknown resource", () => {
    const [r] = runToolCalls(
      [{ id: "t5", name: "check_availability", arguments: { resourceId: "pool" } }],
      DEFAULT_BUSINESS
    );
    expect(r.result).toBe('No resource with id "pool". Available ids: reading-room, study-cabin');
  });

  it("rejects unknown tools", () => {
    const [r] = runToolCalls([{ id: "t6", name: "delete_everything" }], DEFAULT_BUSINESS);
    expect(r.result).toBe("Unknown tool: delete_everything");
  });
});
