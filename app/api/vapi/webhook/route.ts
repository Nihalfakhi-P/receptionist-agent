import { NextRequest, NextResponse } from "next/server";
import { getBusinessData } from "@/lib/store";
import { buildAssistantConfig } from "@/lib/assistant";
import { isVapi } from "@/lib/auth";
import { runToolCalls } from "@/lib/tools";

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
  // Fails closed when VAPI_WEBHOOK_SECRET isn't set.
  if (!isVapi(req.headers.get("x-vapi-secret"))) {
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
    case "tool-calls": {
      const data = await getBusinessData();
      // Vapi requires HTTP 200 with { results: [...] } — even for errors.
      return NextResponse.json({ results: runToolCalls(message.toolCallList ?? [], data) });
    }
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
