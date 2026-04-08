import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDailyReport, formatReportText } from "@/lib/reports/generate";
import { bot } from "@/lib/telegram/bot";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { project_id, send_telegram, chat_id } = await req.json();

    if (!project_id) {
      return NextResponse.json({ error: "project_id обязателен" }, { status: 400 });
    }

    const report = await generateDailyReport(project_id);
    const text = formatReportText(report);

    // Save to DB
    await supabase.from("daily_reports").upsert(
      {
        project_id,
        report_date: report.date,
        content: report,
        sent_to_telegram: !!send_telegram,
      },
      { onConflict: "project_id,report_date" }
    );

    // Send to Telegram if requested
    if (send_telegram && chat_id) {
      try {
        await bot.api.sendMessage(chat_id, text);
      } catch (e) {
        console.error("Failed to send report to Telegram:", e);
      }
    }

    return NextResponse.json({ report, text });
  } catch (e: any) {
    console.error("Report error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
