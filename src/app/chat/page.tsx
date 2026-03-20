export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getChatContacts } from '@/lib/supabase/chat'
import { getActiveFleetStatus } from '@/lib/supabase/gps'
import { ChatWindow } from '@/components/chat/chat-window'
import { getCustomerId } from '@/lib/permissions'
import { MessageSquare, ShieldCheck } from 'lucide-react'

export default async function ChatPage() {
    const customerId = await getCustomerId()
    
    const [chatContacts, activeDrivers] = await Promise.all([
        getChatContacts(),
        getActiveFleetStatus(undefined, customerId)
    ])

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 h-[calc(100vh-140px)]">
                {/* Tactical Communication Header */}
                <div className="bg-[#0a0518] p-10 rounded-br-[5rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-blue-500/20 rounded-[2rem] border-2 border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)] text-blue-500 group-hover:scale-110 transition-all duration-500">
                                <MessageSquare size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-widest uppercase leading-none mb-2 italic">Comm Channel</h1>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.6em] opacity-80 italic italic">Secure Fleet Messaging & Data Packet Liaison // COMM_V4</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal: Active</span>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure_Link</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ChatWindow 
                        initialContacts={chatContacts as any[]} 
                        initialDrivers={activeDrivers as any[]} 
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
