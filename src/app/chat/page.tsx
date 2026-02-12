export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MessageSquare } from "lucide-react"
import { getChatContacts } from "@/lib/supabase/chat"
import { getActiveDrivers } from "@/lib/supabase/drivers"
import { ChatWindow } from "@/components/chat/chat-window"

export default async function ChatPage() {
  const [contacts, drivers] = await Promise.all([
    getChatContacts(),
    getActiveDrivers(),
  ])

  // ถ้าไม่มี contacts ให้แสดงรายชื่อคนขับแทน
  // Note: Drivers returned from getActiveDrivers() are Driver objects
  const displayContacts = contacts.length > 0 ? contacts : drivers.map(d => ({
    driver_id: d.Driver_ID,
    driver_name: d.Driver_Name || 'Unknown',
    last_message: 'เริ่มแชทเลย',
    unread: 0,
    updated_at: new Date().toISOString()
  }))

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <MessageSquare className="text-blue-400" />
          แชท
        </h1>
        <p className="text-slate-400">สื่อสารกับคนขับรถ</p>
      </div>

      <ChatWindow initialContacts={displayContacts} initialDrivers={drivers} />
    </DashboardLayout>
  )
}

