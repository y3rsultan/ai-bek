export const dynamic = "force-dynamic";

import { getProjectAndUser, getTodayTasks } from "@/lib/tasks/actions";
import StatsBar from "@/components/StatsBar";
import TaskCard from "@/components/TaskCard";
import SendTasksButton from "@/components/SendTasksButton";

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const { project } = await getProjectAndUser();
  const tasks = await getTodayTasks(project.id);
  const draftCount = tasks.filter((t) => t.status === "draft").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Сегодня</h2>
          <p className="text-sm text-slate-500">{project.name}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/${locale}/tasks/new`}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
          >
            Новая задача
          </a>
          <SendTasksButton projectId={project.id} draftCount={draftCount} />
        </div>
      </div>

      <StatsBar tasks={tasks} />

      {tasks.length === 0 ? (
        <div className="text-center text-slate-400 py-20">
          <p className="text-lg">Задач пока нет</p>
          <p className="text-sm mt-1">
            Создайте первую задачу или используйте голосовой ввод
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
