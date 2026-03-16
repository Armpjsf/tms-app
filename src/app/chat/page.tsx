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

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg = input.trim()
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
        } catch (e) {
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
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Support</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Real-time Data Assistant</p>
                    </div>
                </div>

                <PremiumCard className="flex-1 p-6 overflow-hidden flex flex-col bg-white/50 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
                                    msg.role === 'user' 
                                    ? 'bg-slate-900 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-100 shadow-sm rounded-tl-none'
                                }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        msg.role === 'user' ? 'bg-white/10' : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-400">กำลังประมวลผลข้อมูล...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex gap-2">
                        <Input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="พิมพ์คำถามที่นี่ เช่น 'ขอดูยอดขายเดือนนี้หน่อย'..."
                            className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-emerald-500"
                        />
                        <Button 
                            onClick={handleSend}
                            disabled={loading}
                            className="h-14 w-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                            <Send size={20} />
                        </Button>
                    </div>
                </PremiumCard>
            </div>
        </DashboardLayout>
    )
}
