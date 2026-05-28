import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const { code, pin } = await request.json();

    if (!process.env.ATLAS_ADMIN_PIN || pin !== process.env.ATLAS_ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clean = String(code).toUpperCase().trim();
    await kv.del(`code:${clean}`);
    await kv.srem("all_codes", clean);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
