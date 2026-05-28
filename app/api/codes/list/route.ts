import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");

    if (!process.env.ATLAS_ADMIN_PIN || pin !== process.env.ATLAS_ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ids = (await kv.smembers<string[]>("all_codes")) ?? [];

    const records = await Promise.all(
      ids.map(async (code) => {
        const r = await kv.get<{ created: number; used: boolean; usedAt?: number }>(`code:${code}`);
        return { code, created: r?.created ?? 0, used: r?.used ?? false, usedAt: r?.usedAt };
      })
    );

    return NextResponse.json({
      codes: records.sort((a, b) => b.created - a.created),
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
