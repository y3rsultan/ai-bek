"use client";

import { useEffect, useState, useCallback } from "react";
import type { Task } from "@/lib/tasks/actions";
import TaskCard from "./TaskCard";
import StatsBar from "./StatsBar";

export default function RealtimeTasks({
  initialTasks,
  projectId,
  locale,
}: {
  initialTasks: Task[];
  projectId: string;
  locale: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => t.status !== "cancelled");

  return (
    <>
      <StatsBar tasks={filtered} />

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-20">
          <p className="text-lg">Задач пока нет</p>
          <p className="text-sm mt-1">
            Создайте первую задачу или используйте голосовой ввод
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div key={task.id} className="animate-fade-in">
              <TaskCard task={task} locale={locale} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
