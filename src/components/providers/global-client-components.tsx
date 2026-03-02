"use client"

import dynamic from "next/dynamic"

const PWAInstallHint = dynamic(() => import("@/components/mobile/pwa-install-hint").then(mod => mod.PWAInstallHint), { ssr: false })
const CommandPalette = dynamic(() => import("@/components/command-palette").then(mod => mod.CommandPalette), { ssr: false })
const Toaster = dynamic(() => import("sonner").then(mod => mod.Toaster), { ssr: false })

export function GlobalClientComponents() {
  return (
    <>
      <CommandPalette />
      <PWAInstallHint />
      <Toaster />
    </>
  )
}
