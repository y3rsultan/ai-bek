import { createClient } from "@supabase/supabase-js";
import { bot } from "./bot";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Notify foreman when a task status changes
export async function notifyForeman(
  projectId: string,
  workerName: string,
  taskTitle: string,
  action: "confirmed" | "completed" | "problem",
  photoUrl?: string | null
) {
  const { data: foreman } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("project_id", projectId)
    .eq("role", "foreman")
    .not("telegram_chat_id", "is", null)
    .limit(1)
    .single();

  if (!foreman?.telegram_chat_id) return;

  const messages: Record<string, string> = {
    confirmed: `${workerName} принял: ${taskTitle}`,
    completed: `${workerName} завершил: ${taskTitle}`,
    problem: `${workerName} сообщил о проблеме: ${taskTitle}`,
  };

  try {
    await bot.api.sendMessage(foreman.telegram_chat_id, messages[action]);
  } catch (e) {
    console.error("Failed to notify foreman:", e);
  }
}

// Send morning digest to each worker with their tasks
export async function sendMorningDigests(projectId: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, assigned_to")
    .eq("project_id", projectId)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .neq("status", "draft");

  if (!tasks || tasks.length === 0) return 0;

  // Group by worker
  const byWorker = new Map<string, string[]>();
  for (const t of tasks) {
    if (!t.assigned_to) continue;
    if (!byWorker.has(t.assigned_to)) byWorker.set(t.assigned_to, []);
    byWorker.get(t.assigned_to)!.push(t.title);
  }

  let sent = 0;

  for (const [workerId, workerTasks] of byWorker) {
    const { data: worker } = await supabase
      .from("users")
      .select("telegram_chat_id, name")
      .eq("id", workerId)
      .single();

    if (!worker?.telegram_chat_id) continue;

    const list = workerTasks.map((t, i) => `${i + 1}. ${t}`).join("\n");
    const text = `Доброе утро, ${worker.name}!\n\nЗадачи на сегодня (${workerTasks.length}):\n${list}`;

    try {
      await bot.api.sendMessage(worker.telegram_chat_id, text);
      sent++;
    } catch (e) {
      console.error("Morning digest failed:", e);
    }
  }

  return sent;
}

// Send evening summary to director/foreman
export async function sendEveningSummary(projectId: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status")
    .eq("project_id", projectId)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .neq("status", "draft");

  if (!tasks) return;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const problems = tasks.filter((t) => t.status === "problem" || t.status === "incomplete").length;
  const notDone = tasks.filter((t) => t.status !== "completed");

  let text = `${project?.name || "Проект"}\n\n`;
  text += `${completed}/${total} выполнено (${percent}%)`;
  if (problems > 0) text += `\nПроблемы: ${problems}`;
  if (notDone.length > 0) {
    text += `\n\nНе завершено:`;
    for (const t of notDone) {
      text += `\n  ${t.title}`;
    }
  }

  // Send to all directors and foremen
  const { data: recipients } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("project_id", projectId)
    .in("role", ["director", "foreman"])
    .not("telegram_chat_id", "is", null);

  for (const r of recipients || []) {
    try {
      await bot.api.sendMessage(r.telegram_chat_id, text);
    } catch (e) {
      console.error("Evening summary failed:", e);
    }
  }
}
