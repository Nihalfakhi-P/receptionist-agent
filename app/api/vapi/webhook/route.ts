import { NextRequest, NextResponse } from "next/server";
import { getBusinessData } from "@/lib/store";
import { buildAssistantConfig } from "@/lib/assistant";

export const dynamic = "force-dynamic";

/**
 * Single Vapi Server URL endpoint. Vapi POSTs every server event here:
 *
 *  - "assistant-request": an inbound call just hit our phone number.
 *    We fetch the LATEST business data and return a transient assistant
 *    whose system prompt embeds it. This is how the agent is always
 *    up to date without redeploying: the prompt is rebuilt per call.
 *
 *  - "tool-calls": the assistant invoked check_availability mid-call.
 *    We read live availability from the store and return it.
 *
 *  - "end-of-call-report": transcript + summary after hangup (logged).
 *
 * Must respond to assistant-request within 7.5s (Vapi hard limit).
 */
export async function POST(req: NextRequest) {
  // Reject anything that doesn't carry the shared secret we configured
  // on the Vapi phone number (sent as the x-vapi-secret header).
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-vapi-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = body?.message;
  if (!message?.type) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  switch (message.type) {
    case "assistant-request":
      return handleAssistantRequest(req);
    case "tool-calls":
      return handleToolCalls(message);
    case "end-of-call-report":
      console.log(
        "Call ended.",
        JSON.stringify({
          endedReason: message.endedReason,
          durationSeconds: message.durationSeconds,
          summary: message.analysis?.summary,
        })
      );
      return NextResponse.json({});
    default:
      // status-update, transcript, etc. — acknowledge and ignore.
      return NextResponse.json({});
  }
}

async function handleAssistantRequest(req: NextRequest) {
  const data = await getBusinessData();

  // Point the tool back at this same endpoint, on this same deployment.
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const serverUrl = `${proto}://${host}/api/vapi/webhook`;

  return NextResponse.json({
    assistant: buildAssistantConfig(
      data,
      serverUrl,
      process.env.VAPI_WEBHOOK_SECRET
    ),
  });
}

async function handleToolCalls(message: any) {
  const data = await getBusinessData();
  const toolCalls: any[] = message.toolCallList ?? [];

  const results = toolCalls.map((tc) => {
    // Vapi sends {id, name, arguments} — but tolerate the raw OpenAI
    // shape {id, function: {name, arguments}} that some payloads use.
    const name = tc.name ?? tc.function?.name;
    let args = tc.arguments ?? tc.function?.arguments ?? {};
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

    const matching = args.resourceId
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

  // Vapi requires HTTP 200 with { results: [...] } — even for errors.
  return NextResponse.json({ results });
}
