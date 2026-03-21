"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader2, Zap, ShieldCheck, Activity, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export default function ChatPage() {
    const { t } = useLanguage()
    const [messages, setMessages] = useState<{role: 'bot'|'user', content: string}[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setMessages([{ role: 'bot', content: t('intelligence.initial_message') }])
    }, [t])

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
            setMessages(prev => [...prev, { role: 'bot', content: data.response || t('intelligence.error_protocol') }])
        } catch {
            setMessages(prev => [...prev, { role: 'bot', content: t('intelligence.system_offline') }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-8 pb-8">
                {/* Tactical Intelligence Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                                <Bot className="text-primary" size={20} />
                            </div>
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">{t('intelligence.neural_core')}</h2>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                            {t('intelligence.title')}
                        </h1>
                        <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest italic">{t('intelligence.subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(255,30,133,1)]" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{t('intelligence.core_active')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    <PremiumCard className="flex-1 flex flex-col bg-[#0a0518]/40 backdrop-blur-3xl border border-white/5 shadow-3xl rounded-[3.5rem] overflow-hidden relative group/chat">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
                        
                        {/* Status Bar */}
                        <div className="px-10 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Activity size={12} className="text-primary animate-pulse" />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">{t('intelligence.uplink_stable')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">{t('intelligence.secure_grid')}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-8 p-10 custom-scrollbar pr-4">
                            {messages.length === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                                    {[
                                        { label: t('intelligence.chips.financial'), query: t('intelligence.queries.financial'), icon: Activity },
                                        { label: t('intelligence.chips.integrity'), query: t('intelligence.queries.integrity'), icon: ShieldCheck },
                                        { label: t('intelligence.chips.alerts'), query: t('intelligence.queries.alerts'), icon: Zap },
                                        { label: t('intelligence.chips.esg'), query: t('intelligence.queries.esg'), icon: Target },
                                        { label: t('intelligence.chips.performance'), query: t('intelligence.queries.performance'), icon: Bot },
                                        { label: t('intelligence.chips.mission'), query: t('intelligence.queries.mission'), icon: User },
                                    ].map((chip, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleSend(chip.query)}
                                            className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] text-left hover:bg-primary/10 hover:border-primary/30 transition-all group/chip flex items-center gap-4 shadow-xl"
                                        >
                                            <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover/chip:text-primary transition-colors border border-white/5 group-hover/chip:scale-110 duration-500">
                                                <chip.icon size={18} strokeWidth={2.5} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 group-hover/chip:text-white uppercase tracking-widest transition-colors leading-tight italic">{chip.label}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={cn(
                                    "flex items-end gap-5",
                                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}>
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xl shadow-black/40",
                                        msg.role === 'user' 
                                            ? 'bg-primary border-primary/20 text-white' 
                                            : 'bg-white/5 border-white/10 text-primary'
                                    )}>
                                        {msg.role === 'user' ? <User size={20} strokeWidth={2.5} /> : <Bot size={20} strokeWidth={2.5} />}
                                    </div>
                                    <div className={cn(
                                        "max-w-[75%] p-8 rounded-[2.5rem] relative group/msg transition-all duration-300 shadow-3xl",
                                        msg.role === 'user' 
                                        ? 'bg-primary text-white rounded-br-none shadow-primary/10' 
                                        : 'bg-white/[0.03] text-slate-300 border border-white/5 rounded-bl-none'
                                    )}>
                                        <div className="text-[13px] font-black leading-relaxed whitespace-pre-wrap uppercase tracking-tight italic">
                                            {msg.content}
                                        </div>
                                        <div className={cn(
                                            "absolute bottom-[-20px] text-[8px] font-black opacity-20 uppercase tracking-[0.2em] italic",
                                            msg.role === 'user' ? 'right-0' : 'left-0'
                                        )}>
                                            {msg.role === 'user' ? t('common.elite_force') : t('common.intel_engine')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start items-end gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary animate-pulse">
                                        <Bot size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] rounded-bl-none flex gap-4 items-center shadow-2xl relative">
                                        <div className="relative">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" strokeWidth={3} />
                                            <div className="absolute inset-0 blur-md bg-primary/20 animate-pulse" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary italic">{t('intelligence.processing')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tactical Input Area */}
                        <div className="p-10 bg-white/[0.02] border-t border-white/5">
                            <div className="flex gap-6 relative max-w-4xl mx-auto">
                                <div className="flex-1 relative group h-20">
                                    <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    <Input 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder={t('intelligence.placeholder')}
                                        className="h-full rounded-2xl bg-[#0a0518] border-white/5 text-white placeholder:text-slate-700 pl-10 pr-20 focus-visible:ring-primary/40 focus:border-primary/50 transition-all text-sm font-black uppercase tracking-widest shadow-inner italic"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-20">
                                        <span className="text-[9px] font-black">ENT</span>
                                        <div className="w-1 h-3 bg-white/50" />
                                    </div>
                                </div>
                                <PremiumButton 
                                    onClick={() => handleSend()}
                                    disabled={loading || !input.trim()}
                                    className="h-20 w-20 rounded-2xl bg-primary hover:bg-primary/80 text-white shadow-xl shadow-primary/20 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={24} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </PremiumButton>
                            </div>
                        </div>
                    </PremiumCard>
                </div>

                <div className="text-center opacity-40">
                    <p className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">
                        <Zap size={14} className="text-primary" /> {t('intelligence.unit_stable')}
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
