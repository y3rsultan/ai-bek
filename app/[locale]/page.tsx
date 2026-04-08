export const dynamic = "force-dynamic";

import { getProjectAndUser, getTodayTasks } from "@/lib/tasks/actions";
import RealtimeTasks from "@/components/RealtimeTasks";
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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">Сегодня</h2>
            <p className="text-sm text-slate-500">{project.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/${locale}/tasks/new`}
            className="flex-1 text-center bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
          >
            Новая задача
          </a>
          <SendTasksButton projectId={project.id} draftCount={draftCount} />
        </div>
      </div>

      <RealtimeTasks
        initialTasks={tasks}
        projectId={project.id}
        locale={locale}
      />
    </div>
  );
}
