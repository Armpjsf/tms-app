"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader2 } from "lucide-react"

export default function ChatPage() {
    const [messages, setMessages] = useState<{role: 'bot'|'user', content: string}[]>([
        { role: 'bot', content: 'สวัสดีครับ! ผมคือผู้ช่วยอัจฉริยะของ LOGIS-PRO มีอะไรให้ผมช่วยตรวจสอบข้อมูลวันนี้ไหมครับ?' }
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSend = async (overrideMsg?: string) => {
        const messageToSend = overrideMsg || input
        if (!messageToSend.trim() || loading) return
 
        const userMsg = messageToSend.trim()
        setInput("")
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)
 
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ message: userMsg }),
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: 'bot', content: data.response || "ขออภัยครับ ผมไม่เข้าใจคำถามนี้" }])
        } catch {
            setMessages(prev => [...prev, { role: 'bot', content: "เกิดข้อผิดพลาดในการเชื่อมต่อครับ" }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Bot className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            Intelligence Support
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </h1>
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">Real-time Data Assistant</p>
                    </div>
                </div>

                <PremiumCard className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-950/40 backdrop-blur-3xl border border-slate-800/50 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {messages.length === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                {[
                                    { label: '💰 ยอดขาย/กำไร', query: 'ขอดูสรุปรายได้และกำไรของสาขาหน่อย' },
                                    { label: '🛠️ รายงานซ่อมบำรุง', query: 'มีรถคันไหนต้องซ่อมหรือเช็คระยะบ้างไหม' },
                                    { label: '🚨 SOS & ความปลอดภัย', query: 'วันนี้มีรายงาน SOS หรืออุบัติเหตุไหม' },
                                    { label: '🍃 สิ่งแวดล้อม (ESG)', query: 'เราลด CO2 ไปได้เท่าไหร่แล้ว' },
                                    { label: '🏆 ผลงานคนขับ', query: 'ใครคือพนักงานขับรถที่ดีที่สุด 3 อันดับแรก' },
                                    { label: '🚛 สถานะงานวันนี้', query: 'สรุปการส่งงานวันนี้เป็นยังไงบ้าง' },
                                ].map((chip, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleSend(chip.query)}
                                        className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl text-left hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group"
                                    >
                                        <p className="text-xs font-black text-emerald-300 group-hover:text-white uppercase tracking-widest transition-colors">{chip.label}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-5 rounded-3xl flex gap-4 transition-all duration-300 ${
                                    msg.role === 'user' 
                                    ? 'bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-500/10' 
                                    : 'bg-slate-800 text-white border border-slate-700/80 shadow-2xl rounded-tl-none'
                                }`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                                        msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}>
                                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/90 border border-slate-700/50 p-4 rounded-2xl rounded-tl-none flex gap-3 items-center shadow-xl">
                                    <div className="relative">
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                        <div className="absolute inset-0 blur-sm bg-emerald-500/20 animate-pulse" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.2)]">กำลังประมวลผลข้อมูล...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-3 relative z-10">
                        <div className="flex-1 relative group">
                            <Input 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="พิมพ์คำถามที่นี่ เช่น 'ขอดูยอดขายเดือนนี้หน่อย'..."
                                className="h-16 rounded-[1.25rem] bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 pl-6 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-base"
                            />
                            <div className="absolute inset-0 rounded-[1.25rem] bg-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        <Button 
                            onClick={() => handleSend()}
                            disabled={loading}
                            className="h-16 px-8 rounded-[1.25rem] bg-emerald-500 hover:bg-emerald-400 text-white font-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 group"
                        >
                            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            <span className="ml-2">ส่งคำถาม</span>
                        </Button>
                    </div>
                </PremiumCard>
            </div>
        </DashboardLayout>
    )
}
