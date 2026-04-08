import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json([], { status: 400 });
  }

  const today = getTodayDate();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:users!tasks_assigned_to_fkey(name)")
    .eq("project_id", projectId)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  const tasks = (data || []).map((t: any) => ({
    ...t,
    assignee_name: t.assignee?.name || null,
    dependency_title: null as string | null,
  }));

  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    if (t.depends_on && tasksById.has(t.depends_on)) {
      t.dependency_title = tasksById.get(t.depends_on)!.title;
    }
  }

  return NextResponse.json(tasks);
}
