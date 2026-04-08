"use client";

import { useState } from "react";

export default function SettingsForm({ project }: { project: any }) {
  const settings = project.settings || {};
  const [name, setName] = useState(project.name);
  const [address, setAddress] = useState(project.address || "");
  const [reminderFreq, setReminderFreq] = useState(
    settings.reminder_frequency_min ?? 120
  );
  const [eodTime, setEodTime] = useState(settings.eod_prompt_time || "16:30");
  const [defaultPhoto, setDefaultPhoto] = useState(
    settings.default_photo_required !== false
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          name,
          address,
          settings: {
            reminder_frequency_min: reminderFreq,
            eod_prompt_time: eodTime,
            default_photo_required: defaultPhoto,
            timezone: "Asia/Almaty",
          },
        }),
      });

      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium">Проект</h3>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Адрес</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium">Напоминания</h3>

        <div>
          <label className="block text-sm text-slate-600 mb-1">
            Частота напоминаний (минуты, 0 = выключены)
          </label>
          <select
            value={reminderFreq}
            onChange={(e) => setReminderFreq(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={0}>Выключены</option>
            <option value={30}>Каждые 30 минут</option>
            <option value={60}>Каждый час</option>
            <option value={120}>Каждые 2 часа</option>
            <option value={240}>Каждые 4 часа</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">
            Вечерний опрос (время)
          </label>
          <input
            type="time"
            value={eodTime}
            onChange={(e) => setEodTime(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium">Задачи</h3>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={defaultPhoto}
              onChange={(e) => setDefaultPhoto(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm text-slate-700">Фото обязательно по умолчанию</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Сохранение..." : saved ? "Сохранено" : "Сохранить настройки"}
      </button>
    </div>
  );
}
