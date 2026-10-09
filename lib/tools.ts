import { BusinessData } from "./business";

export interface ToolCall {
  id: string;
  name?: string;
  arguments?: unknown;
  function?: { name?: string; arguments?: unknown };
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

/**
 * Resolves the tool calls Vapi sends mid-call against live business data.
 * Pure function (no I/O) so it can be unit-tested without Vapi or Redis.
 */
export function runToolCalls(toolCalls: ToolCall[], data: BusinessData): ToolResult[] {
  return toolCalls.map((tc) => {
    // Vapi sends {id, name, arguments} — but tolerate the raw OpenAI
    // shape {id, function: {name, arguments}} that some payloads use.
    const name = tc.name ?? tc.function?.name;
    let args: any = tc.arguments ?? tc.function?.arguments ?? {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }

    if (name !== "check_availability") {
      return { toolCallId: tc.id, result: `Unknown tool: ${name}` };
    }

    const matching = args?.resourceId
      ? data.resources.filter((r) => r.id === args.resourceId)
      : data.resources;

    if (matching.length === 0) {
      return {
        toolCallId: tc.id,
        result: `No resource with id "${args.resourceId}". Available ids: ${data.resources
          .map((r) => r.id)
          .join(", ")}`,
      };
    }

    const report = matching
      .map(
        (r) =>
          `${r.label}: ${r.available} of ${r.capacity} available right now.${r.notes ? ` (${r.notes})` : ""}`
      )
      .join(" ");

    return { toolCallId: tc.id, result: report };
  });
}
