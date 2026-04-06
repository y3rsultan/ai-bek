"use client";

import {
  updateTask,
  deleteTask,
  type Task,
  type TeamMember,
} from "@/lib/tasks/actions";
import { useState } from "react";

export default function TaskEditForm({
  task,
  teamMembers,
  otherTasks,
  locale,
}: {
  task: Task;
  teamMembers: TeamMember[];
  otherTasks: Task[];
  locale: string;
}) {
  const [photoRequired, setPhotoRequired] = useState(task.photo_required);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await updateTask(formData);
      window.location.href = `/${locale}`;
    } catch {
      alert("Ошибка при сохранении");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить задачу?")) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      window.location.href = `/${locale}`;
    } catch {
      alert("Ошибка при удалении");
      setDeleting(false);
    }
  }

  const editable = task.status === "draft";

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="task_id" value={task.id} />

      {!editable && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3">
          Задача уже отправлена — редактирование ограничено.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Название задачи *
        </label>
        <input
          name="title"
          required
          defaultValue={task.title}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Исполнитель
        </label>
        <select
          name="assigned_to"
          defaultValue={task.assigned_to || ""}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        >
          <option value="">Не назначен</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role === "brigadier" ? "бригадир" : "рабочий"})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Локация
        </label>
        <input
          name="location"
          defaultValue={task.location || ""}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Материалы
        </label>
        <input
          name="materials"
          defaultValue={task.materials || ""}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Техника безопасности
        </label>
        <input
          name="safety_notes"
          defaultValue={task.safety_notes || ""}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Приоритет
          </label>
          <select
            name="priority"
            defaultValue={task.priority}
            disabled={!editable}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
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
            defaultValue={task.time_estimate_hours || ""}
            disabled={!editable}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Категория
        </label>
        <input
          name="category"
          defaultValue={task.category || ""}
          disabled={!editable}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
        />
      </div>

      {otherTasks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Зависит от
          </label>
          <select
            name="depends_on"
            defaultValue={task.depends_on || ""}
            disabled={!editable}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
          >
            <option value="">Нет зависимости</option>
            {otherTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="photo_required"
            checked={photoRequired}
            onChange={(e) => setPhotoRequired(e.target.checked)}
            disabled={!editable}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        <span className="text-sm text-slate-700">Фото обязательно</span>
      </div>

      {editable && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-3 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : "Удалить"}
          </button>
        </div>
      )}
    </form>
  );
}
