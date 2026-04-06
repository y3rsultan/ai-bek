import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram/bot";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL not set" }, { status: 500 });
  }

  const webhookUrl = `${appUrl}/api/telegram`;

  try {
    await bot.api.setWebhook(webhookUrl);
    return NextResponse.json({ ok: true, webhook: webhookUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
