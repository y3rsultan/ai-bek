"use client";

import { createTask, type Task, type TeamMember } from "@/lib/tasks/actions";
import { useState } from "react";

export default function TaskForm({
  projectId,
  userId,
  teamMembers,
  todayTasks,
}: {
  projectId: string;
  userId: string;
  teamMembers: TeamMember[];
  todayTasks: Task[];
}) {
  const [photoRequired, setPhotoRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await createTask(formData);
      window.location.href = "/ru";
    } catch {
      alert("Ошибка при создании задачи");
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="created_by" value={userId} />

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Название задачи *
        </label>
        <input
          name="title"
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Залить бетон на 2 этаже"
        />
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Исполнитель
        </label>
        <select
          name="assigned_to"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Не назначен</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role === "brigadier" ? "бригадир" : "рабочий"})
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Локация
        </label>
        <input
          name="location"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="2 этаж, секция А"
        />
      </div>

      {/* Materials */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Материалы
        </label>
        <input
          name="materials"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Бетон М300, арматура"
        />
      </div>

      {/* Safety notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Техника безопасности
        </label>
        <input
          name="safety_notes"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Каска, страховка"
        />
      </div>

      {/* Priority + Time estimate row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Приоритет
          </label>
          <select
            name="priority"
            defaultValue="normal"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="high">Высокий</option>
            <option value="normal">Обычный</option>
            <option value="low">Низкий</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Оценка (часов)
          </label>
          <input
            name="time_estimate_hours"
            type="number"
            step="0.5"
            min="0"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="2"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Категория
        </label>
        <input
          name="category"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Бетонные работы"
        />
      </div>

      {/* Depends on */}
      {todayTasks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Зависит от
          </label>
          <select
            name="depends_on"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Нет зависимости</option>
            {todayTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Photo required toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="photo_required"
            checked={photoRequired}
            onChange={(e) => setPhotoRequired(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        <span className="text-sm text-slate-700">Фото обязательно</span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {submitting ? "Создание..." : "Создать задачу"}
      </button>
    </form>
  );
}
