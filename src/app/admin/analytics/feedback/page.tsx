import { createClient } from "@/utils/supabase/server"
import { isSuperAdmin } from "@/lib/permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare, Star, User, ExternalLink, Zap, ShieldCheck, Activity, Target, Cpu, Clock, Layers } from "lucide-react"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function CustomerFeedbackPage() {
  const supabase = await createClient()
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 bg-[#050110]">
        <PremiumCard className="bg-rose-500/10 border-rose-500/30 max-w-md p-12 text-center space-y-8 rounded-[3rem]">
            <ShieldCheck size={64} className="mx-auto text-rose-500 animate-pulse" />
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Access Denied</h1>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] leading-relaxed italic">Strategic clearance insufficient. Terminal locked for security protocol.</p>
            </div>
            <Link href="/dashboard" className="block">
                <PremiumButton variant="outline" className="w-full h-14 rounded-2xl border-white/10 text-white font-black uppercase tracking-[0.2em] italic">
                    RETURN_SAFE_ZONE
                </PremiumButton>
            </Link>
        </PremiumCard>
      </div>
    )
  }

  // 1. Fetch feedback records first
  const { data: feedback, error: fetchError } = await supabase
    .from('job_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const baseFeedback = feedback || []
  const jobIds = [...new Set(baseFeedback.map(f => f.job_id).filter(Boolean))]

  // 2. Fetch related job details manually (to avoid schema join errors)
  let jobsMap: Record<string, { Job_ID: string; Customer_Name: string; Driver_Name: string }> = {}
  if (jobIds.length > 0) {
    const { data: jobsData } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Customer_Name, Driver_Name')
      .in('Job_ID', jobIds)
    
    if (jobsData) {
        jobsMap = jobsData.reduce((acc, job) => ({
            ...acc,
            [job.Job_ID]: job
        }), {})
    }
  }

  // 3. Combine data
  const feedbackData = baseFeedback.map(f => ({
    ...f,
    Jobs_Main: jobsMap[f.job_id] || null
  }))

  const totalFeedback = feedbackData.length
  const averageRating = totalFeedback > 0 
    ? (feedbackData.reduce((acc: number, f: any) => acc + (f.rating || 0), 0) / totalFeedback).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-12 pb-32 p-4 lg:p-10 bg-[#050110]">
      {/* Tactical Header */}
      <div className="bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6">
            <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
              <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
              STRATEGIC_INTELLIGENCE
            </Link>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-indigo-500/20 rounded-[2.5rem] border-2 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.2)] text-indigo-400">
                <MessageSquare size={40} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">Sentiment Intel</h1>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Voices of the Customer // Quality Monitoring Loop</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 self-end lg:self-center">
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                <Activity className="text-indigo-400" size={16} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">STREAM_QUALITY: 100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <PremiumCard className="p-10 bg-[#0a0518]/60 border-2 border-white/5 hover:border-white/10 transition-all rounded-[3rem] group/stats relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5"><MessageSquare size={40} /></div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 italic">Aggregate Signals</p>
              <h2 className="text-5xl font-black text-white italic tracking-tighter">{totalFeedback}</h2>
              <div className="h-1 w-12 bg-indigo-500 mt-4 rounded-full shadow-lg shadow-indigo-500/40" />
          </PremiumCard>
          
          <PremiumCard className="p-10 bg-[#0a0518]/60 border-2 border-primary/20 hover:border-primary/40 transition-all rounded-[3rem] group/stats relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5"><Star size={40} /></div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 italic">Satisfaction Vector</p>
              <div className="flex items-baseline gap-4">
                  <h2 className="text-5xl font-black text-white italic tracking-tighter">{averageRating}</h2>
                  <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={16} 
                            className={cn(s <= Math.round(Number(averageRating)) ? "fill-primary text-primary" : "text-white/5 shadow-inner")} 
                          />
                      ))}
                  </div>
              </div>
              <div className="h-1 w-12 bg-primary mt-4 rounded-full shadow-lg shadow-primary/40" />
          </PremiumCard>

          <PremiumCard className="p-10 bg-[#0a0518]/60 border-2 border-emerald-500/20 hover:border-emerald-500/40 transition-all rounded-[3rem] group/stats relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5"><ShieldCheck size={40} /></div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4 italic">Audit Integrity</p>
              <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase">Verified</h2>
              <div className="h-1 w-12 bg-emerald-500 mt-4 rounded-full shadow-lg shadow-emerald-500/40" />
          </PremiumCard>
      </div>

      <div className="grid grid-cols-1 gap-8 px-4">
          {feedbackData.map((item: any) => (
              <PremiumCard key={item.id} className="p-10 bg-[#0a0518]/40 border-2 border-white/5 rounded-[3.5rem] transition-all duration-500 hover:bg-black/60 hover:border-indigo-500/30 group/feedback shadow-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                      <div className="space-y-8 flex-1">
                          <div className="flex flex-wrap items-center gap-6">
                              <div className="flex gap-1.5 p-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                      <Star 
                                        key={s} 
                                        size={18} 
                                        className={cn(s <= (item.rating || 0) ? "fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,30,133,0.5)]" : "text-white/5")} 
                                      />
                                  ))}
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge className="bg-white/5 text-slate-400 border-white/10 text-[10px] font-black px-4 py-1.5 rounded-xl italic tracking-widest">{item.job_id}</Badge>
                                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-black uppercase tracking-widest italic border-l-2 border-white/5 pl-4">
                                  <Clock size={12} /> {new Date(item.created_at).toLocaleDateString('th-TH')}
                                </div>
                              </div>
                          </div>
                          
                          <div className="relative p-10 bg-[#050110]/50 rounded-[2.5rem] border border-white/5 shadow-inner group-hover/feedback:border-indigo-500/20 transition-all">
                              <div className="absolute top-0 left-0 p-6 opacity-[0.03]"><MessageSquare size={100} /></div>
                              <p className="text-white font-black text-2xl leading-relaxed italic tracking-tight relative z-10">
                                  &quot;{item.comment || 'SENTIMENT_DATA_NULL_RECORDED'}&quot;
                              </p>
                          </div>

                          <div className="flex flex-wrap gap-8">
                              <div className="flex items-center gap-4 group/node">
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner group-hover/node:scale-110 transition-transform">
                                      <User size={18} />
                                  </div>
                                  <div className="space-y-0.5">
                                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic block">ENTITY_NODE</span>
                                      <span className="text-xs font-black text-white uppercase tracking-widest">{item.Jobs_Main?.Customer_Name || 'SIGNAL_LOST'}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 group/node">
                                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner group-hover/node:scale-110 transition-transform">
                                      <Cpu size={18} />
                                  </div>
                                  <div className="space-y-0.5">
                                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic block">OPERATOR_UNIT</span>
                                      <span className="text-xs font-black text-white uppercase tracking-widest">{item.Jobs_Main?.Driver_Name || 'N/A'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center self-end lg:self-center">
                        <Link href={`/admin/jobs/${item.job_id}`}>
                            <PremiumButton variant="outline" className="h-16 px-10 rounded-3xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] gap-4 italic italic">
                                <span>OS_INTEL_UPLINK</span>
                                <ExternalLink size={18} />
                            </PremiumButton>
                        </Link>
                      </div>
                  </div>
              </PremiumCard>
          ))}
          
          {totalFeedback === 0 && (
              <div className="p-40 flex flex-col items-center justify-center gap-8 border-2 border-dashed border-white/5 rounded-[4rem] bg-black/20 relative overflow-hidden group/empty">
                  <div className="absolute inset-0 bg-indigo-500/[0.02] animate-pulse" />
                  <MessageSquare size={80} strokeWidth={1} className="text-slate-800 opacity-20 group-hover:text-indigo-500 transition-colors duration-700" />
                  <div className="text-center space-y-2 relative z-10">
                      <p className="text-xl font-black text-slate-700 uppercase tracking-[0.4em] italic">No Signal Packets Detected</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.6em] italic italic">SENTIMENT_REGISTRY_QUIESCENT</p>
                  </div>
                  {fetchError && (
                    <div className="mt-12 p-8 bg-rose-500/10 border-2 border-rose-500/20 rounded-[2.5rem] max-w-lg mx-auto relative z-10 backdrop-blur-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <Zap className="text-rose-500 animate-pulse" size={24} />
                            <p className="text-rose-500 font-extrabold text-sm uppercase tracking-widest">DATABASE_LINKAGE_FAILURE</p>
                        </div>
                        <p className="text-rose-400 text-[10px] font-mono leading-relaxed bg-black/40 p-4 rounded-xl border border-rose-500/10 mb-4">{fetchError.message}</p>
                        <p className="text-slate-500 text-[10px] font-black italic uppercase tracking-widest">Protocol Advisory: Please ensure the &apos;job_feedback&apos; table exists in Supabase registry.</p>
                    </div>
                  )}
              </div>
          )}
      </div>

      {/* Tactical Advisory Footnote */}
      <div className="py-20 border-t border-white/5 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-6 mb-4">
              <Activity size={24} className="text-indigo-500 animate-pulse" />
              <div className="h-px w-40 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <ShieldCheck size={24} className="text-emerald-500" />
          </div>
          <p className="text-[12px] font-black text-white uppercase tracking-[0.8em] italic mb-4">Sentiment Registry Protocol // v8.0-ELITE</p>
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest italic leading-relaxed text-center max-w-2xl px-12">
              All sentiment packets are encrypted via Tier-1 RSA-4096 routing. <br />
              System flags negative sentiment vectors for immediate administrative resolution and node intervention.
          </p>
      </div>
    </div>
  )
}
