import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram/bot";
import "@/lib/telegram/handlers"; // registers all handlers
import { webhookCallback } from "grammy";

// Track processed update IDs to prevent double-processing
const processedUpdates = new Set<number>();

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Deduplicate webhooks
    if (body.update_id && processedUpdates.has(body.update_id)) {
      return NextResponse.json({ ok: true });
    }
    if (body.update_id) {
      processedUpdates.add(body.update_id);
      // Keep set from growing indefinitely
      if (processedUpdates.size > 1000) {
        const arr = Array.from(processedUpdates);
        arr.splice(0, 500).forEach((id) => processedUpdates.delete(id));
      }
    }

    // Re-create request with the body for grammy
    const newReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(body),
    });

    return await handleUpdate(newReq);
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
