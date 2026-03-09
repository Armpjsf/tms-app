import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";


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
  viewportFit: 'cover',
  themeColor: '#f0fdf4',
}

import { BranchProvider } from "@/components/providers/branch-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { GlobalClientComponents } from "@/components/providers/global-client-components";

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
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <BranchProvider>
            {children}
            <GlobalClientComponents />
          </BranchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
