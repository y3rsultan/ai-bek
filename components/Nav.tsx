"use client";

export default function Nav({ locale }: { locale: string }) {
  function go(path: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      window.location.href = path;
    };
  }

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-2 flex gap-4 text-sm overflow-x-auto">
      <a href={`/${locale}`} onClick={go(`/${locale}`)} className="text-blue-600 font-medium whitespace-nowrap">
        Дашборд
      </a>
      <a href={`/${locale}/tasks/new`} onClick={go(`/${locale}/tasks/new`)} className="text-slate-600 hover:text-blue-600 whitespace-nowrap">
        Новая задача
      </a>
      <a href={`/${locale}/voice`} onClick={go(`/${locale}/voice`)} className="text-slate-600 hover:text-blue-600 whitespace-nowrap">
        Голос
      </a>
      <a href={`/${locale}/team`} onClick={go(`/${locale}/team`)} className="text-slate-600 hover:text-blue-600 whitespace-nowrap">
        Команда
      </a>
      <a href={`/${locale}/reports`} onClick={go(`/${locale}/reports`)} className="text-slate-600 hover:text-blue-600 whitespace-nowrap">
        Отчёты
      </a>
      <a href={`/${locale}/settings`} onClick={go(`/${locale}/settings`)} className="text-slate-600 hover:text-blue-600 whitespace-nowrap">
        Настройки
      </a>
    </nav>
  );
}
