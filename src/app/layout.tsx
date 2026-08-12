import type { Metadata } from "next";
import { Outfit, Prompt } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  display: "swap",
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  // Load the real heavy weights too. The UI uses font-black / font-weight:900
  // everywhere; without 500/800/900 faces the browser fakes bold for Thai
  // glyphs (faux-bold), which renders blurry/smeared — most visible on dark bg.
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DRouteMind | Command Centre",
  description: "DRouteMind — ระบบบริหารงานขนส่งอัจฉริยะ (DD Transport)",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DRouteMind",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050110',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning tabIndex={-1}>
      <body
        className={`${outfit.variable} ${prompt.variable} font-sans`}
        suppressHydrationWarning
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
