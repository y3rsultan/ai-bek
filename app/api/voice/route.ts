import { NextResponse } from "next/server";

export async function POST() {
  // Voice → Whisper → text — Step 6
  return NextResponse.json({ ok: true });
}
