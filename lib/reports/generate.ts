import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

export type DailyReport = {
  date: string;
  projectName: string;
  total: number;
  completed: number;
  percent: number;
  completedList: { title: string; assignee: string; time: string }[];
  incompleteList: { title: string; assignee: string; status: string }[];
  problemsList: { time: string; reporter: string; description: string }[];
  carriedCount: number;
};

export async function generateDailyReport(projectId: string): Promise<DailyReport> {
  const today = getTodayDate();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:users!tasks_assigned_to_fkey(name)")
    .eq("project_id", projectId)
    .eq("due_date", today)
    .neq("status", "cancelled");

  const { data: problems } = await supabase
    .from("problems")
    .select("*, reporter:users!problems_reported_by_fkey(name)")
    .eq("project_id", projectId)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  const allTasks = tasks || [];
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.status === "completed");
  const incomplete = allTasks.filter((t) => t.status !== "completed" && t.status !== "draft");
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const completedList = completed.map((t: any) => {
    const created = new Date(t.created_at);
    const done = t.completed_at ? new Date(t.completed_at) : new Date();
    const hours = Math.round((done.getTime() - created.getTime()) / 3600000 * 10) / 10;
    return {
      title: t.title,
      assignee: t.assignee?.name || "Не назначен",
      time: `${hours}ч`,
    };
  });

  const incompleteList = incomplete.map((t: any) => ({
    title: t.title,
    assignee: t.assignee?.name || "Не назначен",
    status: t.status === "blocked" ? "Заблокировано" :
            t.status === "sent" ? "Отправлено" :
            t.status === "confirmed" ? "В работе" :
            t.status === "incomplete" ? "Не выполнено" : t.status,
  }));

  const problemsList = (problems || []).map((p: any) => ({
    time: new Date(p.created_at).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Almaty",
    }),
    reporter: p.reporter?.name || "Неизвестно",
    description: p.description || "Без описания",
  }));

  const carriedCount = incomplete.length;

  return {
    date: today,
    projectName: project?.name || "Проект",
    total,
    completed: completed.length,
    percent,
    completedList,
    incompleteList,
    problemsList,
    carriedCount,
  };
}

export function formatReportText(report: DailyReport): string {
  let text = `AI Bek — ${report.projectName}\n`;
  text += `${report.date}\n\n`;
  text += `${report.total} задач — ${report.completed} выполнено (${report.percent}%)\n\n`;

  if (report.completedList.length > 0) {
    text += `Выполнено:\n`;
    for (const t of report.completedList) {
      text += `  ${t.title} (${t.assignee}, ${t.time})\n`;
    }
    text += `\n`;
  }

  if (report.incompleteList.length > 0) {
    text += `Не выполнено:\n`;
    for (const t of report.incompleteList) {
      text += `  ${t.title} (${t.assignee}, ${t.status})\n`;
    }
    text += `\n`;
  }

  if (report.problemsList.length > 0) {
    text += `Проблемы:\n`;
    for (const p of report.problemsList) {
      text += `  ${p.time} ${p.reporter}: ${p.description}\n`;
    }
    text += `\n`;
  }

  if (report.carriedCount > 0) {
    text += `Перенесено на завтра: ${report.carriedCount}\n`;
  }

  return text;
}
