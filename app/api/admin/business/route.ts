import { NextRequest, NextResponse } from "next/server";
import { getBusinessData, saveBusinessData, validateBusinessData } from "@/lib/store";
import { BusinessData } from "@/lib/business";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET: current business data (drives the /admin form). */
export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getBusinessData());
}

/** PUT: replace business data. The agent picks it up on the very next call. */
export async function PUT(req: NextRequest) {
  if (!isAdmin(req.headers.get("authorization"))) {
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
