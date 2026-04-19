"use client"

import { useLanguage } from "@/components/providers/language-provider"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, ShieldAlert, BarChart3, Zap } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"
import { MonthFilter } from "@/components/analytics/month-filter"
import { Suspense } from "react"
import { cn } from "@/lib/utils"

interface AnalyticsClientProps {
  overdueCount: number
  isSuperAdmin: boolean
}

export function AnalyticsClient({ overdueCount, isSuperAdmin }: AnalyticsClientProps) {
  const { t } = useLanguage()
  const content = !isSuperAdmin ? (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center bg-background/50 backdrop-blur-3xl rounded-[4rem] border border-border/5 m-10">
      <div className="p-8 bg-rose-500/20 rounded-full text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
        <ShieldAlert size={64} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter">{t('analytics.access_unauthorized')}</h1>
        <p className="text-muted-foreground font-black uppercase tracking-widest text-lg font-bold">
          {t('analytics.insufficient_credentials')}
        </p>
      </div>
      <Link href="/dashboard">
        <PremiumButton variant="outline" className="border-border/10 text-white h-14 px-10 rounded-2xl">
          {t('analytics.return_terminal')}
        </PremiumButton>
      </Link>
    </div>
  ) : (
    <div className="space-y-12">
      {overdueCount > 0 && (
        <div className="bg-background border-2 border-rose-500/30 p-10 rounded-br-[6rem] rounded-tl-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(244,63,94,0.1)] relative overflow-hidden group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)]" />
          <div className="flex items-center gap-8 relative z-10">
            <div className="p-5 bg-rose-600 rounded-[2rem] text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle size={32} className="animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">{t('analytics.critical_divergence')}: {overdueCount} {t('common.units')}</p>
              <p className="text-rose-500 font-black text-base font-bold uppercase tracking-[0.4em] mt-3 italic">{t('analytics.structural_intervention')}</p>
            </div>
          </div>
          <Link href="/maintenance" className="relative z-10">
            <PremiumButton className="bg-rose-600 hover:bg-rose-700 text-foreground font-bold font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(244,63,94,0.3)]">
              {t('analytics.initiate_recovery')}
            </PremiumButton>
          </Link>
        </div>
      )}

      {/* Global Strategic Header */}
      <div className="bg-background p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div>
            <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:text-white transition-all mb-8 w-fit group/back">
              <div className="p-2 bg-primary/10 rounded-lg group-hover/back:bg-primary transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-base font-bold font-black uppercase tracking-[0.4em]">{t('common.back')}</span>
            </Link>
            <div className="flex items-center gap-6 mb-4">
              <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                <BarChart3 size={40} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none mb-2">{t('navigation.analytics')}</h1>
                <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] opacity-80 italic">{t('analytics.registry_subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Suspense fallback={
              <div className={cn("flex items-center gap-1 h-10 px-4 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-xl")}>
                <div className="w-32 h-3 bg-muted/40 rounded-full" />
              </div>
            }>
              <MonthFilter />
            </Suspense>
            <div className="px-8 py-5 bg-primary/10 rounded-3xl border-2 border-primary/20 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
              <span className="text-base font-bold font-black text-primary uppercase tracking-[0.4em]">{t('analytics.live_feed')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}

