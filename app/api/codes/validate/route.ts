import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const clean = String(code).toUpperCase().trim();

    if (clean === "ATLAS") {
      return NextResponse.json({ valid: true });
    }

    const record = await kv.get<{ created: number; used: boolean; usedAt?: number }>(
      `code:${clean}`
    );

    if (!record || record.used) {
      return NextResponse.json({ valid: false });
    }

    await kv.set(`code:${clean}`, { ...record, used: true, usedAt: Date.now() });

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: "Service unavailable" }, { status: 503 });
  }
}
