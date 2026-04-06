import type { Task } from "@/lib/tasks/actions";
import StatusBadge from "./StatusBadge";

const PRIORITY_LABEL: Record<string, string> = {
  high: "Высокий",
  normal: "",
  low: "Низкий",
};

const BORDER_COLOR: Record<string, string> = {
  draft: "border-l-slate-400",
  pending: "border-l-blue-400",
  sent: "border-l-blue-500",
  confirmed: "border-l-yellow-400",
  completed: "border-l-green-500",
  incomplete: "border-l-red-500",
  blocked: "border-l-orange-400",
  problem: "border-l-red-600",
};

export default function TaskCard({ task, locale = "ru" }: { task: Task; locale?: string }) {
  const border = BORDER_COLOR[task.status] || "border-l-slate-300";

  return (
    <a
      href={`/${locale}/tasks/${task.id}`}
      className={`block bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 ${border} p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {PRIORITY_LABEL[task.priority] && (
              <span className="text-xs text-red-600 font-medium">{PRIORITY_LABEL[task.priority]}</span>
            )}
            <h3 className="font-medium text-sm truncate">{task.title}</h3>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {task.assignee_name && (
              <span>{task.assignee_name}</span>
            )}
            {task.location && <span>{task.location}</span>}
            {task.time_estimate_hours && (
              <span>~{task.time_estimate_hours}ч</span>
            )}
            {task.dependency_title && (
              <span className="text-orange-600">
                Ждёт: {task.dependency_title}
              </span>
            )}
          </div>

          {task.materials && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {task.materials}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={task.status} />
          {task.photo_required && (
            <span className="text-xs text-slate-400">Фото</span>
          )}
        </div>
      </div>
    </a>
  );
}
