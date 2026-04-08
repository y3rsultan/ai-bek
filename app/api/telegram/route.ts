import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram/bot";
import "@/lib/telegram/handlers";
import { webhookCallback } from "grammy";

const processedUpdates = new Set<number>();
const handleUpdate = webhookCallback(bot, "std/http");

// Auto-setup webhook on first request
let webhookSet = false;
async function ensureWebhook() {
  if (webhookSet) return;
  webhookSet = true;
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return;
  try {
    const info = await bot.api.getWebhookInfo();
    if (!info.url || !info.url.includes(url)) {
      await bot.api.setWebhook(`${url}/api/telegram`);
      console.log("Webhook auto-set to", `${url}/api/telegram`);
    }
  } catch (e) {
    console.error("Failed to auto-set webhook:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.update_id && processedUpdates.has(body.update_id)) {
      return NextResponse.json({ ok: true });
    }
    if (body.update_id) {
      processedUpdates.add(body.update_id);
      if (processedUpdates.size > 1000) {
        const arr = Array.from(processedUpdates);
        arr.splice(0, 500).forEach((id) => processedUpdates.delete(id));
      }
    }

    const newReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(body),
    });

    return await handleUpdate(newReq);
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}

// GET endpoint to check/set webhook
export async function GET() {
  await ensureWebhook();
  const info = await bot.api.getWebhookInfo();
  return NextResponse.json({ webhook: info.url, pending: info.pending_update_count });
}
