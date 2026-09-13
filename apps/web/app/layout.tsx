import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Doto } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { htmlLang } from "@/lib/shared/i18n/locales";
import { I18nProvider } from "@/lib/shared/i18n/provider";
import { getTranslations } from "@/lib/shared/i18n/server";

const doto = Doto({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-doto",
  weight: "variable",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { locale, messages } = await getTranslations();
  return (
    <html lang={htmlLang(locale)}>
      <body className={doto.variable}>
        {/* Above the wallet providers: a language change re-renders strings
            without remounting wagmi, RainbowKit or the SIWE session. */}
        <I18nProvider locale={locale} messages={messages}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
