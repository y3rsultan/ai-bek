"use client";

import { useState } from "react";
import { updateMember, deleteMember } from "@/lib/tasks/team";

export default function TeamMemberCard({
  member,
  botUsername,
}: {
  member: any;
  botUsername: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMember(member.id, name, role);
      setEditing(false);
      window.location.reload();
    } catch {
      alert("Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Удалить ${member.name}?`)) return;
    try {
      await deleteMember(member.id);
      window.location.reload();
    } catch {
      alert("Ошибка при удалении");
    }
  }

  const roleLabel =
    role === "foreman"
      ? "Прораб"
      : role === "brigadier"
      ? "Бригадир"
      : role === "worker"
      ? "Рабочий"
      : role;

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-blue-300 p-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="worker">Рабочий</option>
          <option value="brigadier">Бригадир</option>
          <option value="foreman">Прораб</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "..." : "Сохранить"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(member.name);
              setRole(member.role);
            }}
            className="px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{member.name}</div>
          <div className="text-xs text-slate-500">
            {roleLabel}
            {member.telegram_chat_id && " / Telegram подключён"}
            {member.telegram_blocked && " / Заблокирован"}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {!member.telegram_chat_id && member.invite_code && (
          <a
            href={`https://t.me/${botUsername}?start=${member.invite_code}`}
            target="_blank"
            className="text-xs text-blue-600 underline py-1"
          >
            Пригласить
          </a>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-slate-500 hover:text-blue-600 py-1"
        >
          Изменить
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-slate-400 hover:text-red-600 py-1"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
