import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, CheckCircle, Clock, Trophy, Medal, Crown, MapPin, FileText } from "lucide-react"
import { getDriverDashboardStats } from "@/lib/supabase/jobs"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

export const dynamic = 'force-dynamic'

export default async function MobileDashboard() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

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
    <div className="min-h-screen bg-background pb-24 pt-16 px-4 transition-colors duration-300">
      <MobileHeader title="หน้าแรก" />
      
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h2 className="text-xl font-bold text-foreground">สวัสดี, {session.driverName}</h2>
            <p className="text-muted-foreground text-sm">พร้อมสำหรับการทำงานวันนี้ไหม?</p>
        </div>
        <div className="text-right">
             <div className="text-2xl font-bold text-emerald-500">฿?</div>
             <div className="text-xs text-muted-foreground">รายได้วันนี้</div>
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
                          <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-semibold">ระดับปัจจุบัน</div>
                          <div className="text-lg font-bold text-foreground">{gamification.rank} Driver</div>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-2xl font-black text-foreground">{gamification.points}</div>
                      <div className="text-[10px] text-muted-foreground">คะแนน</div>
                  </div>
              </div>
              
              <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                      <span>ความคืบหน้าประจำเดือน</span>
                      {gamification.nextRankPoints > 0 ? (
                          <span>เลเวลถัดไป: {gamification.nextRankPoints} pts</span>
                      ) : (
                          <span className="text-purple-400 font-bold">เลเวลสูงสุดแล้ว!</span>
                      )}
                  </div>
                  <Progress value={progressPercent} className="h-2 bg-slate-900/50" indicatorClassName={ // Custom color based on rank?
                       gamification.rank === 'Gold' ? 'bg-yellow-500' : 
                       gamification.rank === 'Platinum' ? 'bg-purple-500' : 'bg-emerald-500'
                  } />
                  <p className="text-[10px] text-muted-foreground text-right">
                       เสร็จสิ้น {gamification.monthlyCompleted} งานในเดือนนี้
                  </p>
              </div>
          </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
            <span className="text-xs text-muted-foreground">งานที่ต้องทำวันนี้</span>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-success mb-2" />
            <span className="text-2xl font-bold text-foreground">{stats.completed}</span>
            <span className="text-xs text-muted-foreground">งานเสร็จแล้ว</span>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-foreground font-semibold">งานปัจจุบัน / ถัดไป</h3>
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
                <Card className="bg-card border-border active:scale-95 transition-transform shadow-sm">
                  <CardContent className="p-4 space-y-3">
                     <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <Truck className="text-orange-500" size={20} />
                        </div>
                        <div>
                            <h4 className="text-foreground font-medium">{currentJob.Job_ID}</h4>
                            <p className="text-muted-foreground text-sm">{currentJob.Customer_Name}</p>
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
            <Card className="bg-muted/10 border-border border-dashed">
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">ไม่มีงานค้างอยู่ในขณะนี้</p>
                </CardContent>
            </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/mobile/jobs">
            <Button variant="outline" className="w-full border-border bg-card text-foreground hover:bg-muted py-8 flex-col gap-2">
                <FileText className="w-6 h-6 text-primary" />
                <span>งานของฉัน</span>
            </Button>
        </Link>
        <Link href="/mobile/map">
             <Button variant="outline" className="w-full border-border bg-card text-foreground hover:bg-muted py-8 flex-col gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                <span>แผนที่งาน</span>
            </Button>
        </Link>
        <Link href="/mobile/vehicle-check" className="col-span-2">
             <Button className="w-full bg-primary text-primary-foreground hover:opacity-90 py-10 flex-col gap-2 rounded-2xl shadow-lg shadow-primary/20">
                <Truck className="w-8 h-8" />
                <div className="text-lg font-bold">เช็คสภาพรถประจำวัน</div>
            </Button>
        </Link>
      </div>

    </div>
  )
}
