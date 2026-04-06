export const dynamic = "force-dynamic";

import {
  getProjectAndUser,
  getTeamMembers,
  getTodayTasks,
} from "@/lib/tasks/actions";
import TaskForm from "@/components/TaskForm";

export default async function NewTaskPage() {
  const { project, user } = await getProjectAndUser();
  const teamMembers = await getTeamMembers(project.id);
  const todayTasks = await getTodayTasks(project.id);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Новая задача</h2>
      <TaskForm
        projectId={project.id}
        userId={user.id}
        teamMembers={teamMembers}
        todayTasks={todayTasks}
      />
    </div>
  );
}
