import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LOGIS-PRO 360",
  description: "Enterprise Transport Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOGIS Driver",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
}

import { BranchProvider } from "@/components/providers/branch-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Suspense } from "react";
import { PWAInstallHint } from "@/components/mobile/pwa-install-hint";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${sarabun.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <BranchProvider>
              {children}
              <PWAInstallHint />
              <Toaster />
            </BranchProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
