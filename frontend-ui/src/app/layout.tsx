import type { Metadata } from "next";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { AuthProvider } from "@/context/AuthContext";
import { AchievementToastProvider } from "@/components/AchievementToast";
import { XpToastProvider } from "@/components/XpToast";
import { APP_CONFIG } from "@/config/app";
import "./globals.css";

export const metadata: Metadata = {
  title: `Open Papertrade - Trading Dashboard`,
  description: APP_CONFIG.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full font-primary antialiased">
        <AuthProvider>
          <AchievementToastProvider>
            <XpToastProvider>
              <PortfolioProvider>{children}</PortfolioProvider>
            </XpToastProvider>
          </AchievementToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
