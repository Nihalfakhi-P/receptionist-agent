import { NextRequest, NextResponse } from "next/server";
import { getBusinessData } from "@/lib/store";
import { buildAssistantConfig } from "@/lib/assistant";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Returns the same assistant config the phone webhook builds, for the
 * browser web-call test page at /test. Protected by ADMIN_TOKEN because
 * the config embeds the webhook secret (in the tool server block).
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getBusinessData();
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const serverUrl = `${proto}://${host}/api/vapi/webhook`;

  const assistant = buildAssistantConfig(
    data,
    serverUrl,
    process.env.VAPI_WEBHOOK_SECRET
  );

  return NextResponse.json({
    assistant,
    // Vapi's cloud can't reach a localhost tool URL — warn the test page.
    toolsReachable: !host.startsWith("localhost"),
  });
}
