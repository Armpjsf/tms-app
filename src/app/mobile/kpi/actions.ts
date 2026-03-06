"use server"

import { createClient } from '@/utils/supabase/server'

export interface DriverKPIData {
  points: number
  rank: string
  nextRankPoints: number
  monthlyCompleted: number
  totalCompleted: number
  onTimeRate: number
  achievements: { id: string; title: string; desc: string; icon: string; earned: boolean }[]
  monthlyGoal: number
  streakDays: number
}

export async function getDriverKPI(driverId: string): Promise<DriverKPIData> {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Monthly completed
  const { count: monthlyCount } = await supabase
    .from('Jobs_Main')
    .select('*', { count: 'exact', head: true })
    .eq('Driver_ID', driverId)
    .gte('Plan_Date', startOfMonth)
    .in('Job_Status', ['Completed', 'Delivered'])

  // Total completed all time
  const { count: totalCount } = await supabase
    .from('Jobs_Main')
    .select('*', { count: 'exact', head: true })
    .eq('Driver_ID', driverId)
    .in('Job_Status', ['Completed', 'Delivered'])

  // On-time rate (jobs delivered on the same day as Plan_Date)
  const { data: recentJobs } = await supabase
    .from('Jobs_Main')
    .select('Plan_Date, Delivery_Date, Job_Status')
    .eq('Driver_ID', driverId)
    .in('Job_Status', ['Completed', 'Delivered'])
    .order('Plan_Date', { ascending: false })
    .limit(100)

  let onTimeCount = 0
  recentJobs?.forEach(j => {
    if (j.Plan_Date && j.Delivery_Date) {
      const planDate = j.Plan_Date.split('T')[0]
      const deliveryDate = j.Delivery_Date.split('T')[0]
      if (deliveryDate <= planDate) onTimeCount++
    } else {
      // If no delivery date, count as on time
      onTimeCount++
    }
  })
  const onTimeRate = recentJobs && recentJobs.length > 0 ? Math.round((onTimeCount / recentJobs.length) * 100) : 100

  const monthly = monthlyCount || 0
  const total = totalCount || 0
  const points = monthly * 10

  // Rank
  let rank = 'Bronze'
  let nextRankPoints = 300
  if (points >= 1200) { rank = 'Platinum'; nextRankPoints = 0 }
  else if (points >= 700) { rank = 'Gold'; nextRankPoints = 1200 }
  else if (points >= 300) { rank = 'Silver'; nextRankPoints = 700 }

  // Streak (consecutive days with completed jobs — last 30 days)
  let streakDays = 0
  if (recentJobs) {
    const dates = new Set(recentJobs.map(j => j.Plan_Date?.split('T')[0]).filter(Boolean))
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      if (dates.has(key)) {
        streakDays++
      } else if (i > 0) break
    }
  }

  // Achievements
  const achievements = [
    { id: 'first10', title: '🚀 เริ่มต้น', desc: 'วิ่งงานครบ 10 เที่ยว', icon: '🚀', earned: total >= 10 },
    { id: 'first50', title: '💪 มือโปร', desc: 'วิ่งงานครบ 50 เที่ยว', icon: '💪', earned: total >= 50 },
    { id: 'first100', title: '👑 ชำนาญ', desc: 'วิ่งงานครบ 100 เที่ยว', icon: '👑', earned: total >= 100 },
    { id: 'ontime90', title: '⏰ ตรงเวลา', desc: 'ส่งตรงเวลา 90%+', icon: '⏰', earned: onTimeRate >= 90 },
    { id: 'streak7', title: '🔥 ไม่หยุด 7 วัน', desc: 'วิ่งงานต่อเนื่อง 7 วันติด', icon: '🔥', earned: streakDays >= 7 },
    { id: 'month20', title: '🏆 Top ประจำเดือน', desc: 'วิ่ง 20+ เที่ยวเดือนนี้', icon: '🏆', earned: monthly >= 20 },
  ]

  return {
    points,
    rank,
    nextRankPoints,
    monthlyCompleted: monthly,
    totalCompleted: total,
    onTimeRate,
    achievements,
    monthlyGoal: 30,
    streakDays,
  }
}
