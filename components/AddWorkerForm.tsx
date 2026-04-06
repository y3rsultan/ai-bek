"use client";

import { useState } from "react";
import { addWorker } from "@/lib/tasks/team";

export default function AddWorkerForm({ projectId }: { projectId: string }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await addWorker(formData);
      window.location.reload();
    } catch {
      alert("Ошибка при добавлении");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-medium mb-3">Добавить рабочего</h3>
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Имя Фамилия"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          name="role"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="worker">Рабочий</option>
          <option value="brigadier">Бригадир</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "..." : "Добавить"}
        </button>
      </div>
    </form>
  );
}
