"use client";

import { useState, useRef, useEffect } from "react";

type ParsedTask = {
  title: string;
  assignee: string;
  location: string | null;
  materials: string | null;
  safety_notes: string | null;
  time_estimate_hours: number | null;
  photo_required: boolean;
  priority: string;
  depends_on_index: number | null;
};

export default function VoiceRecorder({
  projectId,
  userId,
  teamMembers,
}: {
  projectId: string;
  userId: string;
  teamMembers: { id: string; name: string }[];
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setError("");
      setTranscript("");
      setParsedTasks([]);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 180) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function processAudio(blob: Blob) {
    setProcessing(true);
    setError("");

    try {
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const voiceRes = await fetch("/api/voice", { method: "POST", body: formData });
      const voiceData = await voiceRes.json();

      if (!voiceRes.ok) {
        setError(voiceData.error || "Ошибка распознавания");
        setProcessing(false);
        return;
      }

      setTranscript(voiceData.text);

      // Step 2: Parse tasks
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceData.text }),
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        setError(parseData.error || "Ошибка разбора задач");
        setProcessing(false);
        return;
      }

      // Auto-match assignee names to team members
      const matched = (parseData.tasks || []).map((t: ParsedTask) => {
        if (t.assignee && t.assignee !== "НЕ НАЗНАЧЕН") {
          const lower = t.assignee.toLowerCase();
          const match = teamMembers.find(
            (m) =>
              m.name.toLowerCase().includes(lower) ||
              lower.includes(m.name.toLowerCase()) ||
              m.name.toLowerCase().split(" ").some((part) => lower.includes(part))
          );
          if (match) {
            return { ...t, assignee: match.id };
          }
        }
        return t;
      });
      setParsedTasks(matched);
    } catch (e: any) {
      setError("Ошибка обработки: " + (e.message || ""));
    } finally {
      setProcessing(false);
    }
  }

  function updateTask(index: number, field: string, value: any) {
    setParsedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function removeTask(index: number) {
    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveTasks() {
    setSaving(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          created_by: userId,
          tasks: parsedTasks,
        }),
      });

      if (!res.ok) throw new Error();

      window.location.href = "/ru";
    } catch {
      setError("Ошибка сохранения задач");
    } finally {
      setSaving(false);
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Record button */}
      <div className="flex flex-col items-center gap-4">
        {!recording && !processing && (
          <button
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            className="w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg animate-pulse"
          >
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTime(seconds)}</div>
              <div className="text-xs">Стоп</div>
            </div>
          </button>
        )}

        {processing && (
          <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <div className="text-sm">Обработка...</div>
            </div>
          </div>
        )}

        {!recording && !processing && (
          <p className="text-sm text-slate-500">Нажмите для записи (до 3 минут)</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="bg-slate-100 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Распознанный текст</div>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {/* Parsed tasks */}
      {parsedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Распознано задач: {parsedTasks.length}
          </h3>
          <div className="space-y-4">
            {parsedTasks.map((task, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">Задача {i + 1}</span>
                  <button
                    onClick={() => removeTask(i)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Удалить
                  </button>
                </div>

                <input
                  value={task.title}
                  onChange={(e) => updateTask(i, "title", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Название"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={task.assignee || ""}
                    onChange={(e) => updateTask(i, "assignee", e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Не назначен</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={task.priority}
                    onChange={(e) => updateTask(i, "priority", e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="high">Высокий</option>
                    <option value="normal">Обычный</option>
                    <option value="low">Низкий</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={task.location || ""}
                    onChange={(e) => updateTask(i, "location", e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Локация"
                  />
                  <input
                    value={task.materials || ""}
                    onChange={(e) => updateTask(i, "materials", e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Материалы"
                  />
                </div>

                {task.depends_on_index !== null && (
                  <div className="text-xs text-orange-600">
                    Зависит от: Задача {task.depends_on_index + 1}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={saveTasks}
            disabled={saving}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Сохранение..." : `Создать ${parsedTasks.length} задач`}
          </button>
        </div>
      )}
    </div>
  );
}
