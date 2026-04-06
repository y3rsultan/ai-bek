import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AI Bek",
  description: "Управление задачами стройплощадки",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

const locales = ["ru", "kk", "en"];

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = useMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
            <h1 className="text-lg font-bold">AI Bek</h1>
            <span className="text-sm text-blue-100">Стройплощадка</span>
          </header>
          <Nav locale={locale} />
          <main className="p-4 max-w-4xl mx-auto">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
