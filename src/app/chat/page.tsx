
export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getChatContacts } from '@/lib/supabase/chat'
import { getFleetGPSStatus } from '@/lib/supabase/gps'
import { ChatWindow } from '@/components/chat/chat-window'
import { getCustomerId } from '@/lib/permissions'
import { MessageSquare } from 'lucide-react'

export default async function ChatPage() {
    const customerId = await getCustomerId()
    
    const [chatContacts, activeDrivers] = await Promise.all([
        getChatContacts(),
        getFleetGPSStatus(customerId)
    ])

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto h-[calc(100vh-100px)]">
                {/* Enterprise Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <MessageSquare className="text-blue-500" size={28} />
                            Communication Command Center
                        </h1>
                        <p className="text-blue-400 font-black mt-1 uppercase tracking-widest text-[10px]">Real-time Driver & Fleet Messaging</p>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl">
                    <ChatWindow 
                        initialContacts={chatContacts as any} 
                        initialDrivers={activeDrivers as any} 
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
