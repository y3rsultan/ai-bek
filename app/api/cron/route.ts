import { NextResponse } from "next/server";

export async function GET() {
  // Reminders, EOD prompts, keep-alive — Step 8
  return NextResponse.json({ ok: true });
}
