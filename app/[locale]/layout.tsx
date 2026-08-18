import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Poppins } from "next/font/google";
import { routing } from "@/src/i18n/routing";
import { THEME_INIT_SCRIPT } from "@/src/components/app-shell/theme";
import "../globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "STRATON — Time Well Managed",
    template: "%s — STRATON",
  },
  description: "Plataforma SaaS para controle de horas, equipes e projetos.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/*
          First child of <body>, and not in a <head> of our own: Next drops a
          hand-written <head> in the App Router, and `next/script` with
          `beforeInteractive` emitted nothing from a `[locale]` root — both were
          tried against the served HTML and both were absent. A plain inline
          script blocks the parser where it sits, so it runs before any of the
          markup below it is painted, which is what prevents the flash.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
