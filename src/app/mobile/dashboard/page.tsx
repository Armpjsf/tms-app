import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, CheckCircle, Clock, Trophy, Medal, Crown } from "lucide-react"
import { getDriverDashboardStats } from "@/lib/supabase/jobs"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

export const dynamic = 'force-dynamic'

export default async function MobileDashboard() {
  const session = await getDriverSession()
  if (!session) redirect("/login")

  const { stats, currentJob, gamification } = await getDriverDashboardStats(session.driverId) || { 
      stats: { total: 0, completed: 0 }, 
      gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
      currentJob: null 
  }

  const getRankIcon = (rank: string) => {
      switch(rank) {
          case 'Platinum': return <Crown className="w-6 h-6 text-purple-400" />
          case 'Gold': return <Trophy className="w-6 h-6 text-yellow-400" />
          case 'Silver': return <Medal className="w-6 h-6 text-slate-300" />
          default: return <Medal className="w-6 h-6 text-orange-700" />
      }
  }

  const getRankColor = (rank: string) => {
      switch(rank) {
          case 'Platinum': return 'from-purple-500/20 to-indigo-500/20 border-purple-500/30'
          case 'Gold': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
          case 'Silver': return 'from-slate-400/20 to-slate-600/20 border-slate-400/30'
          default: return 'from-orange-700/20 to-orange-900/20 border-orange-700/30'
      }
  }

  const progressPercent = gamification.nextRankPoints > 0 
      ? (gamification.points / gamification.nextRankPoints) * 100 
      : 100

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="Dashboard" />
      
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h2 className="text-xl font-bold text-white">สวัสดี, {session.driverName}</h2>
            <p className="text-slate-400 text-sm">พร้อมสำหรับการทำงานวันนี้ไหม?</p>
        </div>
        <div className="text-right">
             <div className="text-2xl font-bold text-emerald-400">฿?</div>
             <div className="text-xs text-slate-500">รายได้วันนี้</div>
        </div>
      </div>

      {/* Gamification Card */}
      <Card className={`mb-6 border bg-gradient-to-r ${getRankColor(gamification.rank)}`}>
          <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-950/50 rounded-lg">
                          {getRankIcon(gamification.rank)}
                      </div>
                      <div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Rank</div>
                          <div className="text-lg font-bold text-white">{gamification.rank} Driver</div>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-2xl font-black text-white">{gamification.points}</div>
                      <div className="text-[10px] text-slate-400">POINTS</div>
                  </div>
              </div>
              
              <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                      <span>Monthly Progress</span>
                      {gamification.nextRankPoints > 0 ? (
                          <span>Next Level: {gamification.nextRankPoints} pts</span>
                      ) : (
                          <span className="text-purple-400 font-bold">Max Level Reached!</span>
                      )}
                  </div>
                  <Progress value={progressPercent} className="h-2 bg-slate-900/50" indicatorClassName={ // Custom color based on rank?
                       gamification.rank === 'Gold' ? 'bg-yellow-500' : 
                       gamification.rank === 'Platinum' ? 'bg-purple-500' : 'bg-emerald-500'
                  } />
                  <p className="text-[10px] text-slate-500 text-right">
                       Completed {gamification.monthlyCompleted} jobs this month
                  </p>
              </div>
          </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-blue-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-slate-400">งานที่ต้องทำวันนี้</span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.completed}</span>
            <span className="text-xs text-slate-400">งานเสร็จแล้ว</span>
          </CardContent>
        </Card>
      </div>

      {/* Current/Next Job Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">งานปัจจุบัน / ถัดไป</h3>
            {currentJob && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                    ['In Progress', 'In Transit'].includes(currentJob.Job_Status) 
                        ? 'text-blue-400 bg-blue-500/10' 
                        : 'text-amber-400 bg-amber-500/10'
                }`}>
                    {currentJob.Job_Status}
                </span>
            )}
        </div>
        
        {currentJob ? (
            <Link href={`/mobile/jobs/${currentJob.Job_ID}`}>
                <Card className="bg-slate-900 border-white/10 active:scale-95 transition-transform">
                  <CardContent className="p-4 space-y-3">
                     <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <Truck className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">{currentJob.Job_ID}</h4>
                            <p className="text-slate-400 text-sm">{currentJob.Customer_Name}</p>
                        </div>
                     </div>
                     
                     <div className="pl-13 space-y-2 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-slate-800" />
                        
                        <div className="flex items-start gap-3 relative">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 relative z-10" />
                            <div>
                                <p className="text-slate-300 text-xs text-ellipsis line-clamp-1">รับ: {currentJob.Origin_Location || 'ไม่ระบุ'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 relative">
                             <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-slate-900 mt-1 relative z-10" />
                            <div>
                                <p className="text-slate-300 text-xs text-ellipsis line-clamp-1">ส่ง: {currentJob.Dest_Location || currentJob.Route_Name || 'ไม่ระบุ'}</p>
                            </div>
                        </div>
                     </div>
                  </CardContent>
                </Card>
            </Link>
        ) : (
            <Card className="bg-slate-900/50 border-white/5 border-dashed">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-500">ไม่มีงานค้างอยู่ในขณะนี้</p>
                </CardContent>
            </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/mobile/jobs">
            <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:text-white">
                ดูงานทั้งหมด
            </Button>
        </Link>
        <Link href="/mobile/profile">
             <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:text-white">
                โปรไฟล์
            </Button>
        </Link>
      </div>

    </div>
  )
}
