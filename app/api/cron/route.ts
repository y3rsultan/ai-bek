import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { bot } from "@/lib/telegram/bot";
import { reminderMessage, eodMessage } from "@/lib/telegram/messages";
import { generateDailyReport, formatReportText } from "@/lib/reports/generate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
}

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = getNow();
    const today = getTodayDate();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Get all active projects with settings
    const { data: projects } = await supabase
      .from("projects")
      .select("*");

    if (!projects || projects.length === 0) {
      return NextResponse.json({ ok: true, message: "Нет проектов" });
    }

    let reminders = 0;
    let eodSent = 0;
    let reports = 0;

    for (const project of projects) {
      const settings = project.settings || {};
      const reminderFreq = settings.reminder_frequency_min || 120;
      const eodTime = settings.eod_prompt_time || "16:30";

      // --- Reminders ---
      if (reminderFreq > 0) {
        // Get tasks that are sent/confirmed but not completed
        const { data: activeTasks } = await supabase
          .from("tasks")
          .select("*, assignee:users!tasks_assigned_to_fkey(telegram_chat_id)")
          .eq("project_id", project.id)
          .eq("due_date", today)
          .in("status", ["sent", "confirmed"]);

        for (const task of activeTasks || []) {
          const chatId = (task as any).assignee?.telegram_chat_id;
          if (!chatId) continue;

          // Check if reminder already sent recently
          const { data: lastReminder } = await supabase
            .from("task_updates")
            .select("created_at")
            .eq("task_id", task.id)
            .eq("update_type", "reminder")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const lastReminderTime = lastReminder
            ? new Date(lastReminder.created_at).getTime()
            : 0;
          const minutesSince = (Date.now() - lastReminderTime) / 60000;

          if (minutesSince >= reminderFreq) {
            try {
              const { text, keyboard } = reminderMessage(task.title);
              const sent = await bot.api.sendMessage(chatId, text, {
                reply_markup: keyboard,
              });

              await supabase.from("task_updates").insert({
                task_id: task.id,
                update_type: "reminder",
                metadata: { message_id: sent.message_id },
              });

              // Update telegram_message_id for callback handling
              await supabase
                .from("tasks")
                .update({ telegram_message_id: sent.message_id })
                .eq("id", task.id);

              // Check for escalation (2+ reminders without response)
              const { count } = await supabase
                .from("task_updates")
                .select("*", { count: "exact", head: true })
                .eq("task_id", task.id)
                .eq("update_type", "reminder");

              if ((count || 0) >= 2) {
                await supabase.from("task_updates").insert({
                  task_id: task.id,
                  update_type: "escalation",
                });
              }

              reminders++;
            } catch (e: any) {
              if (e?.error_code === 403) {
                await supabase
                  .from("users")
                  .update({ telegram_blocked: true })
                  .eq("telegram_chat_id", chatId);
              }
              console.error("Reminder send failed:", e);
            }
          }
        }
      }

      // --- EOD prompt ---
      if (currentTime === eodTime) {
        const { data: incompleteTasks } = await supabase
          .from("tasks")
          .select("*, assignee:users!tasks_assigned_to_fkey(telegram_chat_id, id)")
          .eq("project_id", project.id)
          .eq("due_date", today)
          .in("status", ["sent", "confirmed"]);

        // Group by worker
        const byWorker = new Map<number, any[]>();
        for (const task of incompleteTasks || []) {
          const chatId = (task as any).assignee?.telegram_chat_id;
          if (!chatId) continue;
          if (!byWorker.has(chatId)) byWorker.set(chatId, []);
          byWorker.get(chatId)!.push(task);
        }

        for (const [chatId, workerTasks] of byWorker) {
          const list = workerTasks.map((t) => `  ${t.title}`).join("\n");
          const { text, keyboard } = eodMessage(workerTasks.length, list);

          try {
            await bot.api.sendMessage(chatId, text, { reply_markup: keyboard });
            eodSent++;
          } catch (e) {
            console.error("EOD send failed:", e);
          }
        }
      }

      // --- Auto-report at EOD ---
      if (currentTime === eodTime) {
        const { data: director } = await supabase
          .from("users")
          .select("telegram_chat_id")
          .eq("project_id", project.id)
          .in("role", ["director", "foreman"])
          .not("telegram_chat_id", "is", null)
          .limit(1)
          .single();

        if (director?.telegram_chat_id) {
          try {
            const report = await generateDailyReport(project.id);
            const text = formatReportText(report);

            await bot.api.sendMessage(director.telegram_chat_id, text);

            await supabase.from("daily_reports").upsert(
              {
                project_id: project.id,
                report_date: today,
                content: report,
                sent_to_telegram: true,
              },
              { onConflict: "project_id,report_date" }
            );

            reports++;
          } catch (e) {
            console.error("Auto-report failed:", e);
          }
        }
      }
    }

    // Keep-alive ping (prevents Supabase from pausing)
    await supabase.from("projects").select("id").limit(1);

    return NextResponse.json({
      ok: true,
      time: currentTime,
      reminders,
      eodSent,
      reports,
    });
  } catch (e: any) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
