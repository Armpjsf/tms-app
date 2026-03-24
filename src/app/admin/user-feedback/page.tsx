export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MessageSquare, ArrowLeft, Heart, ShieldCheck, Activity, Brain, Target, Zap } from "lucide-react"
import Link from "next/link"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"

export default function UserFeedbackPage() {
  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-purple-500/20 shadow-[0_30px_60px_rgba(168,85,247,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-500 transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </Link>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-purple-500/20 rounded-[2.5rem] border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.3)] text-purple-500 group-hover:scale-110 transition-all duration-500">
                        <MessageSquare size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            Ops Feedback
                        </h1>
                        <p className="text-base font-bold font-black text-purple-500 uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Operator Sentiment & Human Intelligence Matrix</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-4 relative z-10">
                <div className="bg-purple-500/10 border border-purple-500/20 px-8 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,1)]" />
                    <span className="text-base font-bold font-black text-purple-400 uppercase tracking-widest italic">SENTIMENT_ANALYSIS: ACTIVE</span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                   <Brain className="text-purple-500" size={18} />
                   <span className="text-base font-bold font-black text-slate-400 uppercase tracking-[0.3em]">Synaptic Feedback Protocol</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PremiumCard className="p-8 group hover:border-purple-500/40 transition-all duration-500 border-white/5 bg-[#0a0518]/40 backdrop-blur-xl">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Global Satisfaction</span>
                  <Heart className="text-purple-500 opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
               </div>
               <p className="text-5xl font-black text-white italic tracking-tighter mb-2">94%</p>
               <div className="h-1.5 w-16 bg-purple-500 rounded-full shadow-lg shadow-purple-500/20" />
            </PremiumCard>

            <PremiumCard className="p-8 group hover:border-emerald-500/40 transition-all duration-500 border-white/5 bg-[#0a0518]/40 backdrop-blur-xl">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Verified Nodes</span>
                  <ShieldCheck className="text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
               </div>
               <p className="text-5xl font-black text-white italic tracking-tighter mb-2">152</p>
               <div className="h-1.5 w-16 bg-emerald-500/50 rounded-full shadow-lg shadow-emerald-500/10" />
            </PremiumCard>

            <PremiumCard className="p-8 group hover:border-primary/40 transition-all duration-500 border-white/5 bg-[#0a0518]/40 backdrop-blur-xl">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Optimization Vector</span>
                  <Activity className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
               </div>
               <p className="text-5xl font-black text-white italic tracking-tighter mb-2">+12.4%</p>
               <div className="h-1.5 w-16 bg-primary/50 rounded-full shadow-lg shadow-primary/10" />
            </PremiumCard>
        </div>

        {/* Feedback Matrix */}
        <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden p-20 text-center relative group/matrix">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.02] to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-10">
              <div className="relative">
                  <div className="w-32 h-32 bg-purple-500/10 rounded-[2.5rem] flex items-center justify-center text-purple-500 border border-purple-500/20 group-hover/matrix:rotate-12 transition-transform duration-700">
                      <MessageSquare size={56} strokeWidth={1} className="opacity-40" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#0a0518] border-2 border-primary rounded-2xl flex items-center justify-center text-primary animate-pulse shadow-2xl">
                      <Zap size={20} />
                  </div>
              </div>

              <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-[0.2em] mb-4">Registry Quiescent</h2>
                  <p className="text-base font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      No high-priority operator feedback intercepted in the current cycle. <br />
                      The synaptic communication node is standing by for field transmissions.
                  </p>
              </div>

              <PremiumButton variant="outline" className="h-16 px-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] gap-4">
                  <Target size={20} /> SYNC_NODES
              </PremiumButton>

              <div className="pt-10 opacity-20 flex items-center gap-4">
                  <div className="w-12 h-1 bg-gradient-to-r from-transparent to-slate-700 rounded-full" />
                  <span className="text-base font-bold font-black text-slate-700 uppercase tracking-[0.6em]">Zero Interference State</span>
                  <div className="w-12 h-1 bg-gradient-to-l from-transparent to-slate-700 rounded-full" />
              </div>
          </div>
        </PremiumCard>
      </div>
    </DashboardLayout>
  )
}

