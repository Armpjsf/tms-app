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
  // Load the real heavy weights AND real italics. The UI leans on font-black
  // (900) and `italic` everywhere; without these faces the browser synthesises
  // fake bold/italic for Thai glyphs, which renders blurry/smeared.
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
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
        className={`${outfit.variable} ${prompt.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
