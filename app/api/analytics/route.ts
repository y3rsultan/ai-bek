import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  const days = parseInt(req.nextUrl.searchParams.get("days") || "7");

  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split("T")[0];

  // Daily completion stats
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, created_at, completed_at, time_estimate_hours, assigned_to, category, priority")
    .eq("project_id", projectId)
    .gte("due_date", sinceDate)
    .neq("status", "cancelled");

  // Get worker names
  const { data: workers } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Problems
  const { data: problems } = await supabase
    .from("problems")
    .select("id, description, category, created_at, reported_by")
    .eq("project_id", projectId)
    .gte("created_at", `${sinceDate}T00:00:00`);

  const allTasks = tasks || [];
  const workerMap = new Map((workers || []).map((w) => [w.id, w]));

  // Daily stats
  const dailyMap = new Map<string, { total: number; completed: number }>();
  for (const t of allTasks) {
    const day = t.due_date;
    if (!dailyMap.has(day)) dailyMap.set(day, { total: 0, completed: 0 });
    const d = dailyMap.get(day)!;
    d.total++;
    if (t.status === "completed") d.completed++;
  }

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      total: stats.total,
      completed: stats.completed,
      percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Worker productivity
  const workerStats = new Map<string, { name: string; total: number; completed: number; avgHours: number; totalEstimated: number; totalActual: number }>();
  for (const t of allTasks) {
    if (!t.assigned_to) continue;
    const w = workerMap.get(t.assigned_to);
    if (!w) continue;

    if (!workerStats.has(t.assigned_to)) {
      workerStats.set(t.assigned_to, { name: w.name, total: 0, completed: 0, avgHours: 0, totalEstimated: 0, totalActual: 0 });
    }
    const ws = workerStats.get(t.assigned_to)!;
    ws.total++;
    if (t.status === "completed") {
      ws.completed++;
      if (t.time_estimate_hours) ws.totalEstimated += t.time_estimate_hours;
      if (t.completed_at && t.created_at) {
        const actual = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        ws.totalActual += Math.round(actual * 10) / 10;
      }
    }
  }

  const productivity = Array.from(workerStats.values())
    .map((w) => ({
      ...w,
      percent: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const t of allTasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  // Priority breakdown
  const priorityCounts: Record<string, number> = {};
  for (const t of allTasks) {
    priorityCounts[t.priority || "normal"] = (priorityCounts[t.priority || "normal"] || 0) + 1;
  }

  // Estimated vs actual
  const timeComparison = allTasks
    .filter((t) => t.status === "completed" && t.time_estimate_hours && t.completed_at)
    .map((t) => {
      const actual = (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 3600000;
      return {
        title: t.title,
        estimated: t.time_estimate_hours!,
        actual: Math.round(actual * 10) / 10,
      };
    });

  return NextResponse.json({
    dailyStats,
    productivity,
    statusCounts,
    priorityCounts,
    timeComparison,
    problemCount: (problems || []).length,
    totalTasks: allTasks.length,
    totalCompleted: allTasks.filter((t) => t.status === "completed").length,
  });
}
