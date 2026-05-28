import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  return "ATL-" + Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const { count = 1, pin } = await request.json();

    if (!process.env.ATLAS_ADMIN_PIN || pin !== process.env.ATLAS_ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const codes: string[] = [];
    for (let i = 0; i < Math.min(Number(count), 50); i++) {
      const code = makeCode();
      await kv.set(`code:${code}`, { created: Date.now(), used: false });
      await kv.sadd("all_codes", code);
      codes.push(code);
    }

    return NextResponse.json({ codes });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
