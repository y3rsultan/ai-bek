"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  location: string | null;
  materials: string | null;
  safety_notes: string | null;
  category: string | null;
  priority: "high" | "normal" | "low";
  photo_required: boolean;
  assigned_to: string | null;
  created_by: string;
  depends_on: string | null;
  status: string;
  due_date: string;
  time_estimate_hours: number | null;
  completed_at: string | null;
  completion_photo_url: string | null;
  completion_note: string | null;
  telegram_message_id: number | null;
  created_at: string;
  updated_at: string;
  // joined
  assignee_name?: string;
  dependency_title?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  telegram_chat_id: number | null;
};

export async function getProjectAndUser() {
  const supabase = createServiceClient();

  // Get or create a default project + foreman for MVP testing
  let { data: project } = await supabase
    .from("projects")
    .select("*")
    .limit(1)
    .single();

  if (!project) {
    const { data: newProject } = await supabase
      .from("projects")
      .insert({ name: "Тестовая стройка", address: "г. Алматы" })
      .select()
      .single();
    project = newProject;
  }

  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("role", "foreman")
    .eq("project_id", project!.id)
    .limit(1)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        name: "Прораб",
        role: "foreman",
        project_id: project!.id,
      })
      .select()
      .single();
    user = newUser;
  }

  return { project: project!, user: user! };
}

export async function getTodayTasks(projectId: string) {
  const supabase = createServiceClient();
  const today = getTodayDate();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      assignee:users!tasks_assigned_to_fkey(name)
    `
    )
    .eq("project_id", projectId)
    .eq("due_date", today)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const tasks = (data || []).map((t: any) => ({
    ...t,
    assignee_name: t.assignee?.name || null,
    dependency_title: null as string | null,
  }));

  // Resolve dependency titles (self-join not supported by PostgREST)
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    if (t.depends_on && tasksById.has(t.depends_on)) {
      t.dependency_title = tasksById.get(t.depends_on)!.title;
    }
  }

  return tasks as Task[];
}

export async function getTeamMembers(projectId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, role, telegram_chat_id")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .in("role", ["worker", "brigadier"])
    .order("name");

  if (error) throw error;
  return (data || []) as TeamMember[];
}

export async function createTask(formData: FormData) {
  const supabase = createServiceClient();

  const projectId = formData.get("project_id") as string;
  const createdBy = formData.get("created_by") as string;

  const task = {
    project_id: projectId,
    created_by: createdBy,
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    materials: (formData.get("materials") as string) || null,
    safety_notes: (formData.get("safety_notes") as string) || null,
    category: (formData.get("category") as string) || null,
    priority: (formData.get("priority") as string) || "normal",
    photo_required: formData.get("photo_required") === "on",
    assigned_to: (formData.get("assigned_to") as string) || null,
    depends_on: (formData.get("depends_on") as string) || null,
    time_estimate_hours: formData.get("time_estimate_hours")
      ? Number(formData.get("time_estimate_hours"))
      : null,
    status: "draft",
    due_date: getTodayDate(),
  };

  const { error } = await supabase.from("tasks").insert(task);
  if (error) throw error;
}

export async function getTask(taskId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(formData: FormData) {
  const supabase = createServiceClient();
  const taskId = formData.get("task_id") as string;

  const updates: Record<string, any> = {
    title: formData.get("title") as string,
    location: (formData.get("location") as string) || null,
    materials: (formData.get("materials") as string) || null,
    safety_notes: (formData.get("safety_notes") as string) || null,
    category: (formData.get("category") as string) || null,
    priority: (formData.get("priority") as string) || "normal",
    photo_required: formData.get("photo_required") === "on",
    assigned_to: (formData.get("assigned_to") as string) || null,
    depends_on: (formData.get("depends_on") as string) || null,
    time_estimate_hours: formData.get("time_estimate_hours")
      ? Number(formData.get("time_estimate_hours"))
      : null,
  };

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const supabase = createServiceClient();
  await supabase.from("task_updates").delete().eq("task_id", taskId);
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  revalidatePath("/[locale]", "page");
}

export async function sendTasks(projectId: string) {
  const supabase = createServiceClient();
  const today = getTodayDate();

  // Get all draft tasks for today
  const { data: drafts } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("due_date", today)
    .eq("status", "draft");

  if (!drafts || drafts.length === 0) return { sent: 0, blocked: 0 };

  // Fetch dependency statuses
  const depIds = drafts.map((t) => t.depends_on).filter(Boolean) as string[];
  let depStatuses = new Map<string, string>();
  if (depIds.length > 0) {
    const { data: deps } = await supabase
      .from("tasks")
      .select("id, status")
      .in("id", depIds);
    for (const d of deps || []) {
      depStatuses.set(d.id, d.status);
    }
  }

  let sent = 0;
  let blocked = 0;

  for (const task of drafts) {
    const depStatus = task.depends_on ? depStatuses.get(task.depends_on) : null;
    const isBlocked = task.depends_on && depStatus !== "completed";

    const newStatus = isBlocked ? "blocked" : "sent";

    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    await supabase.from("task_updates").insert({
      task_id: task.id,
      update_type: isBlocked ? "blocked" : "sent",
    });

    // Send via Telegram if worker has chat_id
    if (task.assigned_to) {
      try {
        const { sendTaskToWorker } = await import("@/lib/telegram/handlers");
        await sendTaskToWorker(task.id);
      } catch (e) {
        console.error("Telegram send failed for task", task.id, e);
      }
    }

    if (isBlocked) blocked++;
    else sent++;
  }

  return { sent, blocked };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = createServiceClient();

  const update: any = { status };
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId);

  if (error) throw error;

  await supabase.from("task_updates").insert({
    task_id: taskId,
    update_type: status === "completed" ? "completed" : status,
  });

  revalidatePath("/[locale]", "page");
}
