"use client"

"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

const PWAInstallHint = dynamic(() => import("@/components/mobile/pwa-install-hint").then(mod => mod.PWAInstallHint), { ssr: false })
const CommandPalette = dynamic(() => import("@/components/command-palette").then(mod => mod.CommandPalette), { ssr: false })
const Toaster = dynamic(() => import("sonner").then(mod => mod.Toaster), { ssr: false })
const AdminPushRequesterDynamic = dynamic(() => import("@/components/layout/admin-push-requester").then(mod => mod.AdminPushRequester), { ssr: false })
const AdminGlobalNotifier = dynamic(() => import("@/components/notifications/admin-global-notifier").then(mod => mod.AdminGlobalNotifier), { ssr: false })

export function GlobalClientComponents() {
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [adminBranchId, setAdminBranchId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

  useEffect(() => {
    // Only run when in admin context or has session
    const fetchAdminContext = async () => {
        try {
          const res = await fetch('/api/notifications')
          const data = await res.json()
          if (data.userId) {
            setAdminUserId(data.userId)
            setAdminBranchId(data.branchId)
            setIsAdmin(data.isAdmin)
          }
        } catch (e) {
          console.error("Failed to fetch admin context", e)
        }
    }
    fetchAdminContext()
  }, [])

  return (
    <>
      <CommandPalette />
      <PWAInstallHint />
      <Toaster />
      <AdminPushRequesterDynamic userId={adminUserId} />
      <AdminGlobalNotifier branchId={adminBranchId} isAdmin={isAdmin} />
    </>
  )
}
