"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

type Analytics = {
  dailyStats: { date: string; total: number; completed: number; percent: number }[];
  productivity: { name: string; total: number; completed: number; percent: number; totalEstimated: number; totalActual: number }[];
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  timeComparison: { title: string; estimated: number; actual: number }[];
  problemCount: number;
  totalTasks: number;
  totalCompleted: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  sent: "Отправлено",
  confirmed: "В работе",
  completed: "Выполнено",
  blocked: "Заблокировано",
  incomplete: "Не выполнено",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#3b82f6",
  confirmed: "#eab308",
  completed: "#22c55e",
  blocked: "#f97316",
  incomplete: "#ef4444",
};

export default function AnalyticsDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?project_id=${projectId}&days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [projectId, days]);

  if (loading || !data) {
    return <div className="text-center text-slate-400 py-10">Загрузка...</div>;
  }

  const overallPercent =
    data.totalTasks > 0
      ? Math.round((data.totalCompleted / data.totalTasks) * 100)
      : 0;

  const statusPieData = Object.entries(data.statusCounts).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    color: STATUS_COLORS[key] || "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              days === d
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {d} дней
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold">{data.totalTasks}</div>
          <div className="text-xs text-slate-500">Всего задач</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{data.totalCompleted}</div>
          <div className="text-xs text-slate-500">Выполнено</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{overallPercent}%</div>
          <div className="text-xs text-slate-500">Процент</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{data.problemCount}</div>
          <div className="text-xs text-slate-500">Проблемы</div>
        </div>
      </div>

      {/* Completion trend */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-medium mb-4">Выполнение по дням</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.dailyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(5)}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: any) => [
                value,
                name === "completed" ? "Выполнено" : "Всего",
              ]}
              labelFormatter={(l) => `Дата: ${l}`}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#94a3b8"
              fill="#f1f5f9"
              name="total"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#2563eb"
              fill="#dbeafe"
              name="completed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status pie + Worker productivity side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium mb-4">По статусам</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {statusPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Worker productivity */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium mb-4">Продуктивность</h3>
          {data.productivity.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.productivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, "Выполнение"]}
                />
                <Bar dataKey="percent" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Estimated vs Actual */}
      {data.timeComparison.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium mb-4">Оценка vs Факт (часы)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.timeComparison.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="title"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="estimated" fill="#94a3b8" name="Оценка" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#2563eb" name="Факт" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
