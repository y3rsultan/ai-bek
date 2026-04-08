import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

export async function POST(req: NextRequest) {
  try {
    const { project_id, created_by, tasks } = await req.json();

    if (!project_id || !created_by || !tasks?.length) {
      return NextResponse.json({ error: "Нет данных" }, { status: 400 });
    }

    const today = getTodayDate();
    const createdIds: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];

      // Resolve assignee: if it's a UUID use directly, otherwise null
      const assignedTo =
        t.assignee && t.assignee.match(/^[0-9a-f-]{36}$/)
          ? t.assignee
          : null;

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id,
          created_by,
          title: t.title,
          location: t.location || null,
          materials: t.materials || null,
          safety_notes: t.safety_notes || null,
          priority: t.priority || "normal",
          photo_required: t.photo_required !== false,
          assigned_to: assignedTo,
          time_estimate_hours: t.time_estimate_hours || null,
          depends_on:
            t.depends_on_index !== null && t.depends_on_index >= 0
              ? createdIds[t.depends_on_index] || null
              : null,
          status: "draft",
          due_date: today,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Bulk create error:", error);
        continue;
      }

      createdIds.push(data.id);
    }

    return NextResponse.json({ created: createdIds.length });
  } catch (e: any) {
    console.error("Bulk create error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
