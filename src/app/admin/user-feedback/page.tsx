export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MessageSquare } from "lucide-react"

export default function UserFeedbackPage() {
  return (
    <DashboardLayout>
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                      <MessageSquare size={32} />
                  </div>
                  User FEEDBACK
              </h1>
              <p className="text-purple-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Human intelligence & operator satisfaction metrics</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 relative z-10">
              <div className="flex items-center gap-3 px-6 py-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest italic">Sentiment Analysis: ACTIVE</span>
              </div>
          </div>
      </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-black text-gray-900">ยังไม่มีข้อเสนอแนะใหม่</h2>
          <p className="text-gray-500 mt-2">ประวัติข้อเสนอแนะจากคนขับจะแสดงที่นี่</p>
        </div>
    </DashboardLayout>
  )
}
