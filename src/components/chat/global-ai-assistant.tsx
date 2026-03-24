"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function GlobalAIAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [messages, setMessages] = useState<{role: 'bot'|'user', content: string}[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{ role: 'bot', content: "สวัสดีครับ! ผม Tactical AI Assistant ยินดีช่วยดูแลระบบให้คุณ สามารถสอบถามข้อมูล รายได้ งาน หรือสถานะรถได้ทุกเวลาครับ" }])
        }
    }, [messages.length])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, loading])

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
            setMessages(prev => [...prev, { role: 'bot', content: data.response || "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล" }])
        } catch {
            setMessages(prev => [...prev, { role: 'bot', content: "ระบบเชื่อมต่อกับ Neural Core ขัดข้อง กรุณาลองใหม่ครู่เดียวครับ" }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed bottom-4 right-4 lg:bottom-10 lg:right-10 z-[1001] pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-end">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                y: 0,
                                height: isMinimized ? '80px' : (typeof window !== 'undefined' && window.innerWidth < 1024 ? '500px' : '600px'),
                                width: isMinimized ? (typeof window !== 'undefined' && window.innerWidth < 640 ? '240px' : '300px') : (typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 32px)' : '450px')
                            }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={cn(
                                "mb-4 lg:mb-6 bg-[#0a0518]/95 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden ring-1 ring-white/5",
                                isMinimized && "rounded-full"
                            )}
                        >
                            {/* Header */}
                            <div className="p-4 lg:p-6 bg-white/[0.03] border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <div className="relative">
                                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary animate-pulse">
                                            <Bot size={16} strokeWidth={2.5} className="lg:w-5 lg:h-5" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-emerald-500 rounded-full border-2 border-[#0a0518]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold lg:text-xl font-black text-white italic tracking-widest uppercase">Tactical AI</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-emerald-500/60" />
                                            <span className="text-[7px] lg:text-base font-bold font-black text-slate-500 uppercase tracking-widest">Neural Link Est.</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 lg:h-8 lg:w-8 text-slate-500 hover:text-white"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                    >
                                        {isMinimized ? <Maximize2 size={12} className="lg:w-[14px] lg:h-[14px]" /> : <Minimize2 size={12} className="lg:w-[14px] lg:h-[14px]" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 lg:h-8 lg:w-8 text-slate-500 hover:text-rose-500"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X size={14} className="lg:w-4 lg:h-4" />
                                    </Button>
                                </div>
                            </div>

                            {!isMinimized && (
                                <>
                                    {/* Messages Area */}
                                    <div 
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-primary/[0.02]"
                                    >
                                        {messages.map((msg, i) => (
                                            <div key={i} className={cn(
                                                "flex items-end gap-2 lg:gap-3",
                                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                            )}>
                                                <div className={cn(
                                                    "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0 text-base font-bold lg:text-base font-bold border shadow-lg",
                                                    msg.role === 'user' ? 'bg-primary border-primary/20 text-white' : 'bg-white/5 border-white/10 text-primary'
                                                )}>
                                                    {msg.role === 'user' ? 'U' : <Bot size={12} className="lg:w-[14px] lg:h-[14px]" />}
                                                </div>
                                                <div className={cn(
                                                    "max-w-[85%] lg:max-w-[80%] p-3 lg:p-4 rounded-xl lg:rounded-2xl text-base font-bold lg:text-[12px] font-bold leading-relaxed whitespace-pre-wrap uppercase tracking-tight italic",
                                                    msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white/5 text-slate-300 border border-white/5 rounded-bl-none'
                                                )}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {loading && (
                                            <div className="flex items-end gap-2 lg:gap-3">
                                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary animate-pulse">
                                                    <Bot size={12} className="lg:w-[14px] lg:h-[14px]" />
                                                </div>
                                                <div className="bg-white/[0.02] border border-white/5 p-3 lg:p-4 rounded-xl lg:rounded-2xl rounded-bl-none flex gap-2 lg:gap-3 items-center">
                                                    <Loader2 className="w-2.5 h-2.5 lg:w-3 lg:h-3 animate-spin text-primary" />
                                                    <span className="text-base font-bold lg:text-base font-bold font-black uppercase tracking-[0.3em] text-primary italic">Syncing Neural Core...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 lg:p-6 bg-white/[0.02] border-t border-white/5">
                                        <div className="flex gap-2 lg:gap-3 relative">
                                            <Input 
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder="Ask Commander..." 
                                                className="flex-1 bg-[#050110] border-white/5 text-white placeholder:text-slate-700 h-10 lg:h-12 rounded-lg lg:rounded-xl text-base font-bold lg:text-base font-bold font-black uppercase tracking-widest italic pl-3 lg:pl-4"
                                            />
                                            <Button 
                                                onClick={handleSend}
                                                disabled={loading || !input.trim()}
                                                className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-primary hover:bg-primary/80 text-white shrink-0"
                                            >
                                                <Send size={14} className="lg:w-4 lg:h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FAB Bubble */}
                {!isOpen && (
                    <motion.button
                        layoutId="ai-bubble"
                        onClick={() => setIsOpen(true)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-[2rem] bg-primary text-white shadow-[0_20px_40px_rgba(255,30,133,0.4)] flex items-center justify-center relative group overflow-hidden border-2 border-white/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        <Bot size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-500 lg:w-8 lg:h-8" />
                        
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                )}
            </div>
        </div>
    )
}

