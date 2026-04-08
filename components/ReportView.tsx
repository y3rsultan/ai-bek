"use client";

import { useState } from "react";

type Report = {
  id: string;
  report_date: string;
  content: any;
  sent_to_telegram: boolean;
};

export default function ReportView({
  projectId,
  projectName,
  reports,
  foremanChatId,
}: {
  projectId: string;
  projectName: string;
  reports: Report[];
  foremanChatId: number | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportText, setReportText] = useState("");
  const [error, setError] = useState("");

  async function generateReport(sendTelegram: boolean) {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          send_telegram: sendTelegram,
          chat_id: foremanChatId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentReport(data.report);
      setReportText(data.text);

      if (sendTelegram) {
        window.location.reload();
      }
    } catch (e: any) {
      setError(e.message || "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => generateReport(false)}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Генерация..." : "Сформировать отчёт"}
        </button>
        {foremanChatId && (
          <button
            onClick={() => generateReport(true)}
            disabled={generating}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
          >
            Отправить в Telegram
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Current report */}
      {currentReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">
              {projectName} / {currentReport.date}
            </h3>
            <span className="text-sm text-slate-500">
              {currentReport.completed}/{currentReport.total} ({currentReport.percent}%)
            </span>
          </div>

          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
            {reportText}
          </pre>
        </div>
      )}

      {/* Past reports */}
      {reports.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">Предыдущие отчёты</h3>
          <div className="space-y-2">
            {reports.map((r) => {
              const c = r.content;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setCurrentReport(c);
                    setReportText("");
                  }}
                  className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{r.report_date}</span>
                    <span className="text-xs text-slate-500">
                      {c.completed}/{c.total} ({c.percent}%)
                      {r.sent_to_telegram && " / отправлен"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded past report */}
      {currentReport && !reportText && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">
            {currentReport.projectName} / {currentReport.date}
          </h3>

          {currentReport.completedList?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Выполнено</div>
              {currentReport.completedList.map((t: any, i: number) => (
                <div key={i} className="text-sm text-green-700">
                  {t.title} ({t.assignee}, {t.time})
                </div>
              ))}
            </div>
          )}

          {currentReport.incompleteList?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Не выполнено</div>
              {currentReport.incompleteList.map((t: any, i: number) => (
                <div key={i} className="text-sm text-red-700">
                  {t.title} ({t.assignee}, {t.status})
                </div>
              ))}
            </div>
          )}

          {currentReport.problemsList?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Проблемы</div>
              {currentReport.problemsList.map((p: any, i: number) => (
                <div key={i} className="text-sm text-orange-700">
                  {p.time} {p.reporter}: {p.description}
                </div>
              ))}
            </div>
          )}

          {currentReport.carriedCount > 0 && (
            <div className="text-sm text-slate-500">
              Перенесено на завтра: {currentReport.carriedCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
