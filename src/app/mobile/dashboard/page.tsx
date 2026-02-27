import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { getDriverDashboardStats } from "@/lib/supabase/jobs"
import { DashboardClient } from "@/components/mobile/dashboard-client"

export const dynamic = 'force-dynamic'

export default async function MobileDashboard() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const { stats, currentJob, gamification, todayIncome } = await getDriverDashboardStats(session.driverId) || { 
      stats: { total: 0, completed: 0 }, 
      todayIncome: 0,
      gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
      currentJob: null 
  }


  return (
    <div className="relative min-h-screen bg-slate-950 pb-24 pt-16 px-4 overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-500" />
      </div>

      <MobileHeader title="TMS Elite" />
      
      <div className="relative z-10">
          <DashboardClient 
            session={session}
            stats={stats}
            currentJob={currentJob}
            gamification={gamification}
            todayIncome={todayIncome}
          />
      </div>
    </div>
  )
}
