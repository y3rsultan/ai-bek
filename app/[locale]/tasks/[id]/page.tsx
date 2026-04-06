import {
  getTask,
  getProjectAndUser,
  getTeamMembers,
  getTodayTasks,
} from "@/lib/tasks/actions";
import TaskEditForm from "@/components/TaskEditForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params: { id, locale },
}: {
  params: { id: string; locale: string };
}) {
  let task;
  try {
    task = await getTask(id);
  } catch {
    notFound();
  }

  const { project, user } = await getProjectAndUser();
  const teamMembers = await getTeamMembers(project.id);
  const todayTasks = await getTodayTasks(project.id);
  // Exclude this task from dependency options
  const otherTasks = todayTasks.filter((t) => t.id !== id);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Редактировать задачу</h2>
      <TaskEditForm
        task={task}
        teamMembers={teamMembers}
        otherTasks={otherTasks}
        locale={locale}
      />
    </div>
  );
}
