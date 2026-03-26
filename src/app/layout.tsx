import type { Metadata } from "next";
import { Outfit, Prompt } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LOGIS-PRO 360 | COMMAND CENTRE",
  description: "Enterprise Transport Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LOGIS-PRO",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050110',
}

import { BranchProvider } from "@/components/providers/branch-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { GlobalClientComponents } from "@/components/providers/global-client-components";
import ErrorBoundary from "@/components/error-boundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning tabIndex={-1}>
      <body
        className={`${outfit.variable} ${prompt.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <LanguageProvider>
              <BranchProvider>
                {children}
                <GlobalClientComponents />
              </BranchProvider>
            </LanguageProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
