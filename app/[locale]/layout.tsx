import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import ServiceWorker from "@/components/ServiceWorker";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AI Bek",
  description: "Управление задачами стройплощадки",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Bek",
  },
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
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
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen select-none">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
            <h1 className="text-lg font-bold">AI Bek</h1>
            <span className="text-sm text-blue-100">Стройплощадка</span>
          </header>
          <Nav locale={locale} />
          <main className="p-4 pb-20 sm:pb-4 max-w-4xl mx-auto">{children}</main>
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
