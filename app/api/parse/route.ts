import { NextResponse } from "next/server";

export async function POST() {
  // Text → Llama → structured tasks — Step 6
  return NextResponse.json({ ok: true });
}
