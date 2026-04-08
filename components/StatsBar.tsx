import type { Task } from "@/lib/tasks/actions";

export default function StatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) =>
    ["sent", "confirmed"].includes(t.status)
  ).length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const incomplete = tasks.filter((t) =>
    ["incomplete", "problem"].includes(t.status)
  ).length;

  const stats = [
    { label: "Всего", value: total, color: "bg-slate-100 text-slate-800" },
    { label: "Выполнено", value: completed, color: "bg-green-100 text-green-800" },
    { label: "В работе", value: inProgress, color: "bg-yellow-100 text-yellow-800" },
    { label: "Блокировано", value: blocked, color: "bg-orange-100 text-orange-800" },
    { label: "Проблемы", value: incomplete, color: "bg-red-100 text-red-800" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
      {stats.map((s) => (
        <div key={s.label} className={`${s.color} rounded-lg p-2 sm:p-3 text-center`}>
          <div className="text-xl sm:text-2xl font-bold">{s.value}</div>
          <div className="text-xs truncate">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
