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
            setMessages([{ role: 'bot', content: "สวัสดีครับ! ผมผู้ช่วย AI ยินดีดูแลคุณ สามารถสอบถามข้อมูล รายได้ งาน หรือสถานะรถได้ทันทีครับ" }])
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
            setMessages(prev => [...prev, { role: 'bot', content: "การเชื่อมต่อขัดข้อง กรุณาลองใหม่ครู่เดียวครับ" }])
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
                                "mb-4 lg:mb-6 bg-background/98 backdrop-blur-3xl border border-border/20 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden",
                                isMinimized && "rounded-full"
                            )}
                        >
                            {/* Header */}
                            <div className="p-5 lg:p-6 bg-muted/20 border-b border-border/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                                            <Bot size={20} strokeWidth={2} />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                                    </div>
                                    <div>
                                        <h3 className="text-base lg:text-lg font-bold text-foreground leading-tight">ผู้ช่วย AI อัจฉริยะ</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                    >
                                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-full"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>

                            {!isMinimized && (
                                <>
                                    {/* Messages Area */}
                                    <div 
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5 custom-scrollbar bg-slate-50/20"
                                    >
                                        {messages.map((msg, i) => (
                                            <div key={i} className={cn(
                                                "flex items-start gap-3",
                                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                            )}>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                                                    msg.role === 'user' ? 'bg-primary border-primary/20 text-white' : 'bg-white border-border/10 text-primary'
                                                )}>
                                                    {msg.role === 'user' ? 'U' : <Bot size={16} />}
                                                </div>
                                                <div className={cn(
                                                    "max-w-[85%] lg:max-w-[80%] p-4 lg:p-5 rounded-2xl text-[15px] lg:text-base font-medium leading-relaxed tracking-wide",
                                                    msg.role === 'user' 
                                                        ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-tr-none shadow-md' 
                                                        : 'bg-white border border-border/20 text-foreground rounded-tl-none shadow-sm'
                                                )}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {loading && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-border/10 flex items-center justify-center text-primary">
                                                    <Bot size={16} />
                                                </div>
                                                <div className="bg-white border border-border/20 p-4 lg:p-5 rounded-2xl rounded-tl-none flex gap-3 items-center shadow-sm">
                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    <span className="text-sm font-bold text-muted-foreground italic">กำลังค้นหาข้อมูลพรีเมียมให้คุณ...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-5 lg:p-6 border-t border-border/10 bg-background">
                                        <div className="flex gap-3 relative">
                                            <Input 
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder="พิมพ์คำสั่งหรือถามคำถามกับ AI..." 
                                                className="flex-1 bg-muted/30 border-border/20 text-foreground placeholder:text-muted-foreground h-12 lg:h-14 rounded-xl text-base font-medium focus:ring-primary/10 transition-all shadow-inner"
                                            />
                                            <Button 
                                                onClick={handleSend}
                                                disabled={loading || !input.trim()}
                                                className="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white shrink-0 shadow-md active:scale-95 transition-all"
                                            >
                                                <Send size={18} />
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
                        className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-[2rem] bg-primary text-foreground shadow-[0_20px_40px_rgba(255,30,133,0.4)] flex items-center justify-center relative group overflow-hidden border-2 border-border/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        <Bot size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-500 lg:w-8 lg:h-8" />
                        
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-muted/80 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                )}
            </div>
        </div>
    )
}

