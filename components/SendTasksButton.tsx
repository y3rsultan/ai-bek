"use client";

import { sendTasks } from "@/lib/tasks/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SendTasksButton({
  projectId,
  draftCount,
}: {
  projectId: string;
  draftCount: number;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (draftCount === 0) return;
    setSending(true);
    try {
      const result = await sendTasks(projectId);
      alert(
        `Отправлено: ${result.sent}, Заблокировано: ${result.blocked}`
      );
      window.location.reload();
    } catch {
      alert("Ошибка при отправке");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending || draftCount === 0}
      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
    >
      {sending
        ? "Отправка..."
        : `Отправить задачи${draftCount > 0 ? ` (${draftCount})` : ""}`}
    </button>
  );
}
