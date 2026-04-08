"use client";

import { usePathname } from "next/navigation";

export default function Nav({ locale }: { locale: string }) {
  const pathname = usePathname();

  function go(path: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      window.location.href = path;
    };
  }

  const links = [
    { href: `/${locale}`, label: "Дашборд" },
    { href: `/${locale}/tasks/new`, label: "Задача" },
    { href: `/${locale}/voice`, label: "Голос" },
    { href: `/${locale}/team`, label: "Команда" },
    { href: `/${locale}/reports`, label: "Отчёты" },
    { href: `/${locale}/settings`, label: "Настройки" },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === `/${locale}`;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop */}
      <nav className="hidden sm:flex bg-white border-b border-slate-200 px-4 py-2 gap-4 text-sm">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={go(l.href)}
            className={`whitespace-nowrap ${
              isActive(l.href)
                ? "text-blue-600 font-medium"
                : "text-slate-600 hover:text-blue-600"
            }`}
          >
            {l.label}
          </a>
        ))}
      </nav>

      {/* Mobile bottom */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex justify-around">
          {links.slice(0, 5).map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={go(l.href)}
              className={`flex-1 flex flex-col items-center justify-center py-3 text-xs ${
                isActive(l.href)
                  ? "text-blue-600 font-semibold"
                  : "text-slate-400"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
