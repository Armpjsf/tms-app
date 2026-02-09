import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MessageSquare, 
  Search,
  Send,
  Phone,
  MoreVertical,
} from "lucide-react"
import { getChatContacts } from "@/lib/supabase/chat"
import { getActiveDrivers } from "@/lib/supabase/drivers"

export default async function ChatPage() {
  const [contacts, drivers] = await Promise.all([
    getChatContacts(),
    getActiveDrivers(),
  ])

  // ถ้าไม่มี contacts ให้แสดงรายชื่อคนขับแทน
  const displayContacts = contacts.length > 0 ? contacts : drivers.map(d => ({
    driver_id: d.Driver_ID,
    driver_name: d.Driver_Name,
    last_message: 'ยังไม่มีข้อความ',
    unread: 0,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Contacts List */}
        <Card variant="glass" className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input placeholder="ค้นหาคนขับ..." className="pl-10" />
              </div>
            </div>

            {/* Contacts */}
            <div className="flex-1 overflow-y-auto">
              {displayContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  ไม่พบข้อมูลคนขับ
                </div>
              ) : displayContacts.map((contact) => (
                <div
                  key={contact.driver_id}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {contact.driver_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white truncate">{contact.driver_name}</h3>
                      {contact.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{contact.last_message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card variant="glass" className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  ?
                </div>
                <div>
                  <h3 className="font-medium text-white">เลือกคนขับเพื่อเริ่มแชท</h3>
                  <p className="text-xs text-slate-500">คลิกที่รายชื่อด้านซ้าย</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Phone size={18} />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical size={18} />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>เลือกคนขับเพื่อดูข้อความ</p>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input placeholder="พิมพ์ข้อความ..." className="flex-1" />
                <Button size="lg" className="gap-2">
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
