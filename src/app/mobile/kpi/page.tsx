import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { getDriverKPI } from "./actions"

export const dynamic = 'force-dynamic'

const RANK_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  Bronze: { color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-100 to-orange-100', emoji: '🥉' },
  Silver: { color: 'text-gray-600', bg: 'bg-gradient-to-br from-gray-100 to-slate-200', emoji: '🥈' },
  Gold: { color: 'text-yellow-600', bg: 'bg-gradient-to-br from-yellow-100 to-amber-200', emoji: '🥇' },
  Platinum: { color: 'text-indigo-700', bg: 'bg-gradient-to-br from-indigo-100 to-purple-200', emoji: '💎' },
}

export default async function MobileKPIPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const kpi = await getDriverKPI(session.driverId)
  const rankConf = RANK_CONFIG[kpi.rank] || RANK_CONFIG.Bronze
  
  const progressToNext = kpi.nextRankPoints > 0 
    ? Math.min((kpi.points / kpi.nextRankPoints) * 100, 100) 
    : 100
  
  const monthlyProgress = Math.min((kpi.monthlyCompleted / kpi.monthlyGoal) * 100, 100)
  const earnedCount = kpi.achievements.filter(a => a.earned).length

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-16 px-4">
      <MobileHeader title="ผลงานของฉัน" showBack />

      <div className="space-y-5 mt-2">

        {/* Rank Card — EXTRA LARGE */}
        <div className={`${rankConf.bg} rounded-3xl p-6 text-center shadow-sm`}>
          <p className="text-6xl mb-2">{rankConf.emoji}</p>
          <h2 className={`text-3xl font-black ${rankConf.color}`}>{kpi.rank}</h2>
          <p className="text-5xl font-black text-gray-900 mt-2">{kpi.points} <span className="text-lg font-bold text-muted-foreground">แต้ม</span></p>
          
          {kpi.nextRankPoints > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-base font-black text-gray-700 mb-1">
                <span>{kpi.rank}</span>
                <span>{kpi.nextRankPoints} แต้ม</span>
              </div>
              <div className="h-4 bg-white/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full transition-all duration-1000"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="text-xl text-gray-700 mt-2 font-black">อีก {kpi.nextRankPoints - kpi.points} แต้ม ถึงระดับถัดไป</p>
            </div>
          )}
        </div>

        {/* Stats Grid — BIG NUMBERS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-4xl font-black text-emerald-700">{kpi.monthlyCompleted}</p>
            <p className="text-base font-black text-gray-700 mt-1">เที่ยวเดือนนี้</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-4xl font-black text-blue-700">{kpi.totalCompleted}</p>
            <p className="text-base font-black text-gray-700 mt-1">เที่ยวทั้งหมด</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-4xl font-black text-indigo-700">{kpi.onTimeRate}%</p>
            <p className="text-base font-black text-gray-700 mt-1">ตรงเวลา</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-4xl font-black text-amber-700">🔥 {kpi.streakDays}</p>
            <p className="text-base font-black text-gray-700 mt-1">วันติดต่อกัน</p>
          </div>
        </div>

        {/* Monthly Goal Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <p className="text-lg font-black text-gray-900">🎯 เป้าหมายเดือนนี้</p>
            <p className="text-lg font-black text-emerald-700">{kpi.monthlyCompleted}/{kpi.monthlyGoal}</p>
          </div>
          <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full transition-all duration-1000"
              style={{ width: `${monthlyProgress}%` }}
            />
          </div>
          <p className="text-base text-gray-700 font-black mt-3 text-center">
            {kpi.monthlyCompleted >= kpi.monthlyGoal 
              ? '🎉 ยอดเยี่ยม! ถึงเป้าหมายแล้ว' 
              : `อีก ${kpi.monthlyGoal - kpi.monthlyCompleted} เที่ยวถึงเป้าหมาย`}
          </p>
        </div>

        {/* Achievements — LARGE ICONS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-lg font-black text-gray-900 mb-4">🏅 ความสำเร็จ ({earnedCount}/{kpi.achievements.length})</p>
          <div className="grid grid-cols-3 gap-3">
            {kpi.achievements.map(ach => (
              <div 
                key={ach.id} 
                className={`text-center rounded-2xl p-3 ${ach.earned ? 'bg-emerald-50 border border-emerald-300 shadow-sm' : 'bg-gray-100 border border-gray-200 opacity-60'}`}
              >
                <p className="text-3xl mb-1">{ach.icon}</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{ach.title}</p>
                <p className="text-lg font-bold font-bold text-gray-600 mt-1">{ach.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

