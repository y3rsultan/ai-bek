const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-slate-200 text-slate-700" },
  pending: { label: "Ожидает", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Отправлено", color: "bg-blue-200 text-blue-800" },
  confirmed: { label: "Принято", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Выполнено", color: "bg-green-100 text-green-800" },
  incomplete: { label: "Не выполнено", color: "bg-red-100 text-red-800" },
  blocked: { label: "Заблокировано", color: "bg-orange-100 text-orange-800" },
  cancelled: { label: "Отменено", color: "bg-slate-100 text-slate-500" },
  problem: { label: "Проблема", color: "bg-red-200 text-red-900" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
