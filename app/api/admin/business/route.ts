import { NextRequest, NextResponse } from "next/server";
import { getBusinessData, saveBusinessData, validateBusinessData } from "@/lib/store";
import { BusinessData } from "@/lib/business";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false; // refuse everything until a token is configured
  return req.headers.get("authorization") === `Bearer ${token}`;
}

/** GET: current business data (drives the /admin form). */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getBusinessData());
}

/** PUT: replace business data. The agent picks it up on the very next call. */
export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const error = validateBusinessData(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  await saveBusinessData(body as BusinessData);
  return NextResponse.json({ ok: true });
}
