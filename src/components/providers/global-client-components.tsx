"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

const PWAInstallHint = dynamic(() => import("@/components/mobile/pwa-install-hint").then(mod => mod.PWAInstallHint), { ssr: false })
const CommandPalette = dynamic(() => import("@/components/command-palette").then(mod => mod.CommandPalette), { ssr: false })
const Toaster = dynamic(() => import("sonner").then(mod => mod.Toaster), { ssr: false })
const AdminPushRequesterDynamic = dynamic(() => import("@/components/layout/admin-push-requester").then(mod => mod.AdminPushRequester), { ssr: false })

export function GlobalClientComponents() {
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch current admin user ID from a lightweight API call
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        if (data?.userId) setAdminUserId(data.userId)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <CommandPalette />
      <PWAInstallHint />
      <Toaster />
      <AdminPushRequesterDynamic userId={adminUserId} />
    </>
  )
}
