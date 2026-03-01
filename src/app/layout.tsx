import "./globals.css";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n";

export const metadata = {
  title: "Goal Tracker",
  description: "Goal management and daily check-ins",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
