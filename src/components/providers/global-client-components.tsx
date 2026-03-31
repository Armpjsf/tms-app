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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const controller = new AbortController()

    const fetchAdminContext = async () => {
        try {
          const res = await fetch('/api/notifications', { signal: controller.signal })
          if (!res.ok) return
          const data = await res.json()
          
          if (data.userId) {
            setAdminUserId(data.userId)
            setAdminBranchId(data.branchId)
            setIsAdmin(data.isAdmin)
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            // Silently fail if not logged in or endpoint not ready
          }
        }
    }
    fetchAdminContext()

    return () => controller.abort()
  }, []) // Fix: Execute only once on mount

  if (!isMounted) return null

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
