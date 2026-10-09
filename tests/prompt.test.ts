import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/lib/business";
import { buildSystemPrompt } from "@/lib/prompt";
import { buildAssistantConfig } from "@/lib/assistant";

const now = new Date("2026-08-15T06:30:00Z"); // 12:00 PM IST

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt(DEFAULT_BUSINESS, now);

  it("injects live business facts", () => {
    expect(prompt).toContain("City Central Library");
    expect(prompt).toContain("Annual membership (adult): 500 rupees per year");
    expect(prompt).toContain('"reading room seats" (id: reading-room)');
  });

  it("states the current time in the business timezone", () => {
    expect(prompt).toMatch(/Saturday.*15 August 2026/);
    expect(prompt).toMatch(/12:00\s?pm/i);
  });

  it("keeps the anti-hallucination guardrails", () => {
    expect(prompt).toContain("ONLY factual information you may state");
    expect(prompt).toContain("NEVER invent hours, prices, or policies");
    expect(prompt).toContain("call the check_availability tool");
  });

  it("uses the human fallback number when configured", () => {
    const p = buildSystemPrompt({ ...DEFAULT_BUSINESS, phoneHumanFallback: "the front desk line" }, now);
    expect(p).toContain("suggest they call the front desk line");
  });

  it("only includes announcements when there are some", () => {
    expect(prompt).not.toContain("[Current Announcements");
    const p = buildSystemPrompt({ ...DEFAULT_BUSINESS, announcements: ["Closed on Monday."] }, now);
    expect(p).toContain("[Current Announcements");
    expect(p).toContain("- Closed on Monday.");
  });
});

describe("buildAssistantConfig", () => {
  it("wires the tool back to the webhook with the shared secret", () => {
    const cfg = buildAssistantConfig(DEFAULT_BUSINESS, "https://x.test/api/vapi/webhook", "sh");
    const tool = cfg.model.tools[0] as any;
    expect(tool.function.name).toBe("check_availability");
    expect(tool.server).toEqual({ url: "https://x.test/api/vapi/webhook", secret: "sh" });
    expect(cfg.firstMessage).toBe(DEFAULT_BUSINESS.greeting);
  });
});
